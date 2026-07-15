const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const {
  applyTranslations,
  applyTranslationsBuffer,
  getChunkPatchJs,
  getBrowserTrJs,
} = require('./translations-tr');
const { applyProjectOverrides } = require('./patch-projects');
const {
  patchVideoLoader,
  patchHeipHtml,
  patchHeipFlight,
  fixRscFlightLengths,
  isHeipMuxImage,
} = require('./patch-videos');
const { getBrand, getSeoTitle, getPublicConfig } = require('./site-config');
const { scrubBrandReferences } = require('./brand-scrub');
const { translateFlightBody, translateHtmlSafe } = require('./flight-translate');

const ROOT = __dirname;
const CACHE = path.join(ROOT, 'cache');
const STATIC = path.join(ROOT, 'static');
const PORTS = [8888, 9000, 7777, 8080];
const BRAND = getBrand();

let PORT = PORTS[0];
let SITE_URL = `http://127.0.0.1:${PORT}/`;

const LOCAL = {
  'style.css': 'text/css; charset=utf-8',
  'script.js': 'application/javascript; charset=utf-8',
  'pixela-logo-dark.svg': 'image/svg+xml; charset=utf-8',
  'pixela-logo-hover.svg': 'image/svg+xml; charset=utf-8',
  'pixela-logo-glb.svg': 'image/svg+xml; charset=utf-8',
  'pixela-copyright.svg': 'image/svg+xml; charset=utf-8',
  'pixela-boot-screen.png': 'image/png',
  'pixela-boot-screen-mobile.png': 'image/png',
  'shredder-pixela.glb': 'model/gltf-binary',
  'computer-pixela.glb': 'model/gltf-binary',
  'phones-pixela.glb': 'model/gltf-binary',
};

const LOGO_PROXY = {
  'logo_dark.0a~p9g3zi7_h6.svg': 'pixela-logo-dark.svg',
  'logo.0ctv.ko5~mr~7.svg': 'pixela-logo-hover.svg',
};

if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

function getCloudBaseUrl() {
  const fromEnv =
    process.env.PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : '');
  return fromEnv ? fromEnv.replace(/\/$/, '') : null;
}

function setPort(p) {
  PORT = p;
  const cloud = getCloudBaseUrl();
  SITE_URL = cloud ? `${cloud}/` : `http://127.0.0.1:${p}/`;
  try {
    fs.writeFileSync(path.join(ROOT, 'port.txt'), String(p));
  } catch (_) {}
}

function staticFilePath(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0]).replace(/^\//, '');
  return path.join(STATIC, clean);
}

function guessMime(pathname) {
  const ext = path.extname(pathname.split('?')[0]).toLowerCase();
  const types = {
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.glb': 'model/gltf-binary',
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  };
  return types[ext] || 'application/octet-stream';
}

function serveStaticFile(pathname, res, extraHeaders = {}) {
  const local = staticFilePath(pathname);
  if (!fs.existsSync(local) || fs.statSync(local).isDirectory()) return false;
  const body = fs.readFileSync(local);
  res.writeHead(200, {
    'Content-Type': guessMime(pathname),
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    'X-Pixela-Source': 'static',
    'X-Pixela-Ver': SCRIPT_VER,
    ...extraHeaders,
  });
  res.end(body);
  return true;
}

function rscResponseHeaders(source) {
  return {
    'Content-Type': 'text/x-component',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Vary: 'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch',
    // Next 16 compares this response header with <html data-dpl-id>.
    // Without it, a valid router.push is deliberately converted to a full page load.
    'X-Nextjs-Deployment-Id': DEPLOYMENT_ID,
    'X-Pixela-Source': source,
    'X-Pixela-Ver': SCRIPT_VER,
  };
}

function prepareHomeRscBody(raw) {
  // CRLF temizle, sonra Flight-guvenli ceviri (T uzunluklari yeniden hesaplanir)
  const body = typeof raw === 'string' ? raw : raw.toString('utf8');
  const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (rscBodyCache.has('home')) return rscBodyCache.get('home');
  const out = translateFlightBody(normalized);
  rscBodyCache.set('home', out);
  return out;
}

function prepareWorkRscBody(raw, slug) {
  const body = typeof raw === 'string' ? raw : raw.toString('utf8');
  const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const key = 'work:' + slug;
  if (rscBodyCache.has(key)) return rscBodyCache.get(key);
  const out = translateFlightBody(normalized);
  rscBodyCache.set(key, out);
  return out;
}

function writeRawWorkRsc(slug, raw) {
  const destDir = path.join(STATIC, 'rsc', 'work');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, `${slug}.txt`), raw);
}

async function fetchRemoteRsc(urlPath) {
  const remote = await fetchRemoteAsset(
    `${REMOTE_ORIGIN}${urlPath}`,
    'text/x-component,*/*',
    { RSC: '1', Accept: 'text/x-component' }
  );
  if (remote.status !== 200 || !remote.body?.length) return null;
  const raw = remote.body.toString('utf8');
  if (!raw.includes('react.fragment')) return null;
  return raw;
}

async function serveHomeRsc(res) {
  // Once yerel ham RSC (scrub yok) — 404/plain text enqueueModel yapar
  const candidates = [
    path.join(STATIC, 'rsc', 'home.txt'),
    path.join(CACHE, 'rsc-home.txt'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    res.writeHead(200, rscResponseHeaders('local-home-rsc'));
    res.end(prepareHomeRscBody(fs.readFileSync(p, 'utf8')));
    return true;
  }
  try {
    const raw = await fetchRemoteRsc('/');
    if (raw) {
      res.writeHead(200, rscResponseHeaders('remote-home-rsc'));
      res.end(prepareHomeRscBody(raw));
      return true;
    }
  } catch (err) {
    console.warn('  Home RSC remote:', err.message);
  }
  return false;
}

function sendLocal(name, res) {
  fs.readFile(path.join(ROOT, name), (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Dosya yok: ' + name);
    }
    res.writeHead(200, {
      'Content-Type': LOCAL[name] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

function logoReplacement(pathname) {
  const base = path.basename(pathname.split('?')[0]);
  const lower = base.toLowerCase();
  if (LOGO_PROXY[base]) return LOGO_PROXY[base];
  if (lower.startsWith('logo_dark.') && lower.endsWith('.svg')) return 'pixela-logo-dark.svg';
  if (lower.startsWith('logo.') && lower.endsWith('.svg')) return 'pixela-logo-hover.svg';
  if (lower.includes('logo') && lower.endsWith('.svg')) return 'pixela-logo-hover.svg';
  return null;
}

const SCRIPT_VER = '161';
const REMOTE_ORIGIN = 'https://www.shader.se';
const DEPLOYMENT_ID = 'dpl_7zBfSoUTJP474MZeo1QBxkHKryUu';

/** false = orijinal Shader proje karuseli (site-config.projects kullanilmaz). */
const ENABLE_CUSTOM_PROJECTS = false;
/** false = HEIP / mux medyalari orijinal kalsin (Lider Teknik yamasi yok). */
const REPLACE_HEIP_WITH_LIDER = false;

const PROJECTS_INIT_PATCH = {
  from:
    'if(e?.type==="project"&&e.project){let t=e.project,r=eC.useProjectsStore.getState().prismicProjects.get(),i=eC.useProjectsStore.getState().selectedProjectIndex.get(),n=r.findIndex(e=>e?.uid===t.uid);i%r.length!==n&&eC.useProjectsStore.getState().selectedProjectIndex.set(n),ei.set(!0)}',
  to: '{let r=eC.useProjectsStore.getState().prismicProjects.get();if(r.length>0){if(e?.type==="project"&&e.project){let t=e.project,i=eC.useProjectsStore.getState().selectedProjectIndex.get(),n=r.findIndex(e=>e?.uid===t.uid);i%r.length!==n&&eC.useProjectsStore.getState().selectedProjectIndex.set(n)}ei.set(!0)}}',
};
const CHUNK_CACHE = path.join(CACHE, 'chunks');
const TR_CHUNK_DIR = path.join(CACHE, `chunks-tr-v${SCRIPT_VER}`);
const CACHE_BUST = `px=${SCRIPT_VER}`;
const htmlPageCache = new Map(); // pathname -> prepared html string
const rscBodyCache = new Map(); // key -> translated rsc string

/** Next.js client navigation — RSC flight; HTML patch bunlara uygulanmamali */
function isRscRequest(req) {
  const h = req.headers || {};
  if (String(h.rsc || h['RSC'] || '') === '1') return true;
  if (h['next-router-state-tree'] || h['Next-Router-State-Tree']) return true;
  if (h['next-router-prefetch'] || h['Next-Router-Prefetch']) return true;
  return /[?&]_rsc=/.test(req.url || '');
}

const LOADING_BLEND_PATCH = {
  from: 'return TW(xd(e,1),r,r.a)',
  to: 'return xd(e,1)',
};

function patchBootScreenUrls(text) {
  if (!text.includes('/textures/boot_screen') && !text.includes('pixela-boot-screen')) return text;
  return text
    .replace(/\/textures\/boot_screen_mobile\.png/g, `/pixela-boot-screen-mobile.png?v=${SCRIPT_VER}`)
    .replace(/\/textures\/boot_screen\.png/g, `/pixela-boot-screen.png?v=${SCRIPT_VER}`);
}

function patchContent(body) {
  // Chunk'lara runtime yama uygulama — LOADING_BLEND / JS TR Flight'i bozuyor ("This page couldn't load")
  return Buffer.isBuffer(body) ? body : Buffer.from(body);
}

function htmlNoStoreHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    // Clear-Site-Data yok — chunk yuklemesi sirasinda cache temizligi Flight'i kirar
    'X-Pixela-Ver': SCRIPT_VER,
  };
}

function buildConfigScript() {
  const cfg = getPublicConfig();
  return `<script id="pixela-config">window.__PIXELA_CONFIG=${JSON.stringify(cfg)}</script>`;
}

function buildEarlyHook() {
  const patch = getChunkPatchJs().replace(/<\//g, '<\\/');
  return `<script id="pixela-early">${patch}</script>`;
}

function getPublicUrl() {
  const cloud = getCloudBaseUrl();
  if (cloud) return cloud;
  try {
    const p = path.join(ROOT, 'public-url.txt');
    if (fs.existsSync(p)) {
      const url = fs.readFileSync(p, 'utf8').trim();
      if (url) return url.replace(/\/$/, '');
    }
  } catch (_) {}
  return SITE_URL.replace(/\/$/, '');
}

function patchSeo(html) {
  const base = getPublicUrl();
  let out = html;

  out = out.replace(/<link rel="canonical" href="[^"]*"/g, `<link rel="canonical" href="${base}/"`);
  out = out.replace(/property="og:url" content="[^"]*"/g, `property="og:url" content="${base}/"`);
  out = out.replace(/name="twitter:url" content="[^"]*"/g, `name="twitter:url" content="${base}/"`);

  if (!out.includes('hreflang="tr"')) {
    out = out.replace(
      '</head>',
      `<link rel="alternate" hreflang="tr" href="${base}/" />\n<meta http-equiv="content-language" content="tr" />\n</head>`
    );
  }
  return out;
}

function bustOneUrl(url) {
  if (!url || url.includes(CACHE_BUST)) return url;
  return url.includes('?') ? `${url}&${CACHE_BUST}` : `${url}?${CACHE_BUST}`;
}

/**
 * Edge/Chromium eski yamali chunk'lari ayni URL'den cache'ler.
 * Sadece HTML attribute src/href'e px= ekle — inline __next_f script govdesine DOKUNMA.
 */
function bustAssetUrls(html) {
  const attrRe = /(\s(?:src|href)=")(\/_next\/static\/[^"]+)(")/gi;
  const blocks = html.split(/(<script\b[\s\S]*?<\/script>)/gi);
  return blocks
    .map((block) => {
      if (/^<script\b/i.test(block)) {
        if (/\bsrc\s*=/i.test(block)) {
          return block.replace(
            /(<script\b[^>]*?\bsrc=")(\/_next\/static\/[^"]+)(")/i,
            (_, open, url, close) => open + bustOneUrl(url) + close
          );
        }
        return block;
      }
      return block.replace(attrRe, (_, open, url, close) => open + bustOneUrl(url) + close);
    })
    .join('');
}

function stripBrokenPreloads(html) {
  return html
    .replace(/<link\b[^>]*\brel=["']preload["'][^>]*\bhref=["']\s*["'][^>]*\/?>/gi, '')
    .replace(/<link\b[^>]*\bhref=["']\s*["'][^>]*\brel=["']preload["'][^>]*\/?>/gi, '');
}

function injectHead(html) {
  // Flight govdesine dokunma; sadece attribute cache-bust + bos preload temizligi
  let out = stripBrokenPreloads(html);
  // Vercel data-dpl-id SSR HTML'de var, React tree'de yok → hydration #418 (HTML)
  out = out.replace(/<html([^>]*)>/i, (_, attrs) => {
    return '<html' + attrs.replace(/\s*data-dpl-id="[^"]*"/i, '') + '>';
  });
  out = bustAssetUrls(out);
  return out;
}

/** PIXELA config + erken hook'u <head>'e, script.js'i </body> onune ekler */
function injectPixelaScripts(html) {
  let out = html;
  if (!out.includes('id="pixela-config"')) {
    out = out.replace(/<head([^>]*)>/i, (m) => m + buildConfigScript() + buildEarlyHook());
  }
  if (!/src="\/script\.js/.test(out)) {
    out = out.replace(/<\/body>/i, `<script src="/script.js?${CACHE_BUST}" defer></script></body>`);
  }
  return out;
}

/** HTML sayfa govdesi: Flight-guvenli Turkce ceviri + cache-bust + PIXELA scriptleri */
function preparePageHtml(raw, cacheKey) {
  if (cacheKey && htmlPageCache.has(cacheKey)) return htmlPageCache.get(cacheKey);
  const out = injectPixelaScripts(injectHead(translateHtmlSafe(raw)));
  if (cacheKey) htmlPageCache.set(cacheKey, out);
  return out;
}

/** scrubBrandReferences'i Flight push script'lerine uygulamadan calistir */
function scrubHtmlOutsideFlight(html, baseUrl) {
  const parts = html.split(/(<script\b[\s\S]*?<\/script>)/gi);
  return parts
    .map((part) => {
      if (/^<script\b/i.test(part) && /self\.__next_f\.push/.test(part)) return part;
      return scrubBrandReferences(part, baseUrl);
    })
    .join('');
}

function workSlug(pathname) {
  const m = pathname.match(/^\/work\/([^/?#]+)\/?$/);
  return m ? m[1] : null;
}

function sendWorkRsc(res, body, source) {
  res.writeHead(200, rscResponseHeaders(source));
  res.end(body);
}

function serveWorkRscFallback(slug, res) {
  const candidates = [
    path.join(STATIC, 'rsc', 'work', `${slug}.txt`),
    path.join(CACHE, `rsc-work-${slug}.txt`),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    sendWorkRsc(res, prepareWorkRscBody(fs.readFileSync(file, 'utf8'), slug), 'local-work-rsc');
    return true;
  }
  return false;
}

async function serveWorkRscLive(slug, res) {
  // Yerel RSC varsa onu kullan — remote ile karisinca enqueueModel olusur
  if (serveWorkRscFallback(slug, res)) return true;
  try {
    const raw = await fetchRemoteRsc(`/work/${encodeURIComponent(slug)}`);
    if (raw) {
      writeRawWorkRsc(slug, raw);
      sendWorkRsc(res, prepareWorkRscBody(raw, slug), 'remote-work-rsc');
      return true;
    }
  } catch (err) {
    console.warn('  Work RSC remote:', slug, err.message);
  }
  return false;
}

async function serveWork(pathname, query, req, res) {
  const slug = workSlug(pathname);
  if (!slug) return false;

  if (isRscRequest(req)) {
    if (await serveWorkRscLive(slug, res)) return true;
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Proje verisi yerelde yok.');
    return true;
  }

  const localWork = path.join(STATIC, 'work', `${slug}.html`);
  if (fs.existsSync(localWork)) {
    // Ceviri translateHtmlSafe ile — Flight T uzunluklari yeniden hesaplanir
    const html = preparePageHtml(fs.readFileSync(localWork, 'utf8'), `work:${slug}`);
    res.writeHead(200, htmlNoStoreHeaders());
    res.end(html);
    return true;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(errorPage(`Proje sayfasi yerelde yok (${slug}).`));
  return true;
}

function serveHome(res) {
  const cached = loadCache();
  if (cached) {
    const html = preparePageHtml(cached, 'home');
    res.writeHead(200, htmlNoStoreHeaders());
    res.end(html);
    return true;
  }
  return false;
}

async function refreshCss(html) {
  const cssMatch = html.match(/\/_next\/static\/chunks\/[^"]+\.css[^"]*/);
  if (!cssMatch) return;
  const cssPath = cssMatch[0].split('?')[0];
  const localCss = staticFilePath(cssPath);
  try {
    if (!fs.existsSync(localCss)) return;
    let text = fs.readFileSync(localCss, 'utf8');
    text = text.replace(/url\(\.\.\/media\//g, 'url(/_next/static/media/');
    text +=
      '\n.font-stix,[class*="stix_two_text"]{font-family:"STIX Two Text","Segoe UI",Georgia,"Times New Roman",serif!important}\n';
    fs.writeFileSync(path.join(ROOT, 'style.css'), text.trimEnd() + '\n');
  } catch (_) {}
}

function chunkCacheFile(pathname) {
  const name = path.basename(pathname.split('?')[0]);
  return path.join(CHUNK_CACHE, name);
}

function servePatchedChunk(pathname, res) {
  const local = chunkCacheFile(pathname);
  if (fs.existsSync(local)) {
    const body = patchContent(fs.readFileSync(local));
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      'X-Pixela-Chunk': 'cached',
      'X-Pixela-Ver': SCRIPT_VER,
    });
    res.end(body);
    return true;
  }
  return false;
}

function writePatchedChunk(pathname, patched, res, source) {
  if (!fs.existsSync(CHUNK_CACHE)) fs.mkdirSync(CHUNK_CACHE, { recursive: true });
  fs.writeFileSync(chunkCacheFile(pathname), patched);
  res.writeHead(200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    'X-Pixela-Chunk': source,
    'X-Pixela-Ver': SCRIPT_VER,
  });
  res.end(patched);
}

async function fetchAndServePatchedChunk(pathname, res) {
  if (servePatchedChunk(pathname, res)) return true;
  const local = staticFilePath(pathname);
  if (fs.existsSync(local)) {
    writePatchedChunk(pathname, patchBrandJs(fs.readFileSync(local)), res, 'static-patched');
    return true;
  }
  try {
    const remote = await fetchRemoteAsset(
      REMOTE_ORIGIN + pathname.split('?')[0],
      '*/*'
    );
    if (remote.status !== 200 || !remote.body?.length) return false;
    // Kalici static'e de yaz — sonraki isteklerde 404 olmasin
    try {
      const dest = staticFilePath(pathname.split('?')[0]);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, remote.body);
    } catch (_) {}
    writePatchedChunk(pathname, patchBrandJs(remote.body), res, 'remote-patched');
    return true;
  } catch (err) {
    console.warn('  Chunk uzaktan alinamadi:', pathname, err.message);
    return false;
  }
}

function loadCache() {
  // static/ kaynak; cache/ eski yamalari tutabiliyor
  const candidates = [path.join(STATIC, 'page.html'), path.join(CACHE, 'page.html')];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch (_) {}
  }
  return null;
}

function errorPage(msg) {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${BRAND}</title>
<meta http-equiv="refresh" content="3"><style>body{font-family:Segoe UI,sans-serif;background:#0a0a0a;color:#fcf9f3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}h1{font-weight:400}p{color:#aaa}</style></head>
<body><div><h1>${BRAND} yukleniyor...</h1><p>${msg}</p><p>3 saniye sonra tekrar denenecek.<br>Adres: <a href="${SITE_URL}" style="color:#66C5F1">${SITE_URL}</a></p></div></body></html>`;
}

function patchBrandJs(body) {
  return patchContent(body);
}

function localErrorBody(pathname, msg) {
  if (pathname && /\/_next\/static\/chunks\/.*\.js/i.test(pathname)) {
    return Buffer.from('/* PIXELA: ' + msg.replace(/\*/g, '') + ' */', 'utf8');
  }
  return Buffer.from(errorPage(msg), 'utf8');
}

function serveLocalOr404(pathname, res) {
  if (serveStaticFile(pathname, res)) return;
  const body = localErrorBody(pathname, 'Yerel dosya bulunamadi: ' + pathname);
  res.writeHead(404, {
    'Content-Type': /\/_next\/static\/chunks\/.*\.js/i.test(pathname || '')
      ? 'application/javascript; charset=utf-8'
      : 'text/plain; charset=utf-8',
    'Content-Length': body.length,
  });
  res.end(body);
}

function parseMuxImagePath(pathname) {
  const m = pathname.match(/^\/api\/mux-image\/([^/]+)\/(.+)$/);
  if (!m) return null;
  const nums = m[2].split('-').map(Number).filter((n) => !Number.isNaN(n));
  const time = nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0] || 0;
  return { playbackId: m[1], range: m[2], time };
}

function muxCacheFile(pathname) {
  const parsed = parseMuxImagePath(pathname);
  if (!parsed) return null;
  return path.join(STATIC, 'mux-cache', parsed.playbackId, `${parsed.range}.jpg`);
}

function muxCdnUrl(playbackId, time) {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1280&time=${time}`;
}

function fetchRemoteAsset(url, accept = '*/*', extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client
      .get(
        url,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: accept, ...extraHeaders },
          timeout: 30000,
        },
        (pres) => {
        if ([301, 302, 307, 308].includes(pres.statusCode) && pres.headers.location) {
          pres.resume();
          return resolve(fetchRemoteAsset(pres.headers.location, accept, extraHeaders));
        }
        const chunks = [];
        pres.on('data', (c) => chunks.push(c));
        pres.on('end', () =>
          resolve({
            status: pres.statusCode || 502,
            headers: pres.headers,
            body: Buffer.concat(chunks),
          })
        );
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error('Uzak varlik zaman asimi'));
      });
  });
}

function fetchMuxCdn(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*,*/*' }, timeout: 20000 }, (pres) => {
        if ([301, 302, 307, 308].includes(pres.statusCode) && pres.headers.location) {
          pres.resume();
          return resolve(fetchMuxCdn(pres.headers.location));
        }
        const chunks = [];
        pres.on('data', (c) => chunks.push(c));
        pres.on('end', () =>
          resolve({
            status: pres.statusCode || 502,
            headers: pres.headers,
            body: Buffer.concat(chunks),
          })
        );
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error('Mux CDN zaman asimi'));
      });
  });
}

function serveLocalMuxFile(file, res, tag) {
  if (!fs.existsSync(file)) return false;
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    'X-Pixela-Mux': tag,
  });
  fs.createReadStream(file).pipe(res);
  return true;
}

async function serveMuxImage(pathname, res) {
  if (!pathname.startsWith('/api/mux-image/')) return false;

  if (isHeipMuxImage(pathname)) {
    const heipPoster = path.join(ROOT, 'videos', 'heip-poster.jpg');
    if (serveLocalMuxFile(heipPoster, res, 'heip-local')) return true;
  }

  const cached = muxCacheFile(pathname);
  if (cached && serveLocalMuxFile(cached, res, 'cache')) return true;

  const parsed = parseMuxImagePath(pathname);
  if (parsed) {
    try {
      const remote = await fetchMuxCdn(muxCdnUrl(parsed.playbackId, parsed.time));
      if (remote.status === 200 && remote.body?.length) {
        if (cached) {
          try {
            fs.mkdirSync(path.dirname(cached), { recursive: true });
            fs.writeFileSync(cached, remote.body);
          } catch (_) {}
        }
        res.writeHead(200, {
          'Content-Type': remote.headers['content-type'] || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'X-Pixela-Mux': 'mux-cdn',
          'X-Pixela-Ver': SCRIPT_VER,
        });
        res.end(remote.body);
        return true;
      }
    } catch (err) {
      console.warn('  Mux CDN:', pathname, err.message);
    }
  }

  const fallback = path.join(STATIC, 'textures', 'thumb_fallback.png');
  return serveLocalMuxFile(fallback, res, 'fallback');
}

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const base = path.basename(pathname);

  if (pathname === '/site-config.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    return res.end(JSON.stringify(getPublicConfig(), null, 2));
  }

  if (pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'X-Pixela-Ver': SCRIPT_VER });
    return res.end('ok v' + SCRIPT_VER);
  }

  // Site ikonlari — 404 onlenir, PIXELA logosu kullanilir
  if (pathname === '/favicon.ico' || pathname === '/apple-icon.png') {
    const icon = path.join(ROOT, '_icon-crop-110.png');
    if (fs.existsSync(icon)) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      });
      return fs.createReadStream(icon).pipe(res);
    }
  }
  if (pathname === '/icon.svg') {
    return sendLocal('pixela-logo-dark.svg', res);
  }

  if (pathname === '/pixela-chunks-tr.js') {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      'X-Pixela-Ver': SCRIPT_VER,
    });
    return res.end(getChunkPatchJs());
  }

  if (pathname === '/pixela-tr.js') {
    const js = getBrowserTrJs();
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    return res.end(js);
  }

  if (pathname.startsWith('/fonts/')) {
    const name = path.basename(pathname.split('?')[0]);
    const local = path.join(ROOT, 'fonts', name);
    if (fs.existsSync(local)) {
      const ext = path.extname(name).toLowerCase();
      const types = {
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
      };
      res.writeHead(200, {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      });
      return fs.createReadStream(local).pipe(res);
    }
  }

  if (pathname.startsWith('/api/mux-image/')) {
    if (await serveMuxImage(pathname, res)) return;
  }

  if (pathname === '/textures/copyright_footer.png') {
    return sendLocal('pixela-logo-hover.svg', res);
  }

  if (pathname === '/textures/boot_screen.png') {
    return sendLocal('pixela-boot-screen.png', res);
  }

  if (pathname === '/textures/boot_screen_mobile.png') {
    return sendLocal('pixela-boot-screen-mobile.png', res);
  }

  if (pathname.startsWith('/textures/')) {
    if (serveStaticFile(pathname, res)) return;
  }

  if (LOCAL[base]) return sendLocal(base, res);
  if (base === 'script.js') return sendLocal('script.js', res);

  if (pathname === '/models/computer.glb' || pathname.startsWith('/models/computer.glb')) {
    res.writeHead(200, {
      'Content-Type': 'model/gltf-binary',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    return fs.readFile(path.join(ROOT, 'computer-pixela.glb'), (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('computer GLB yok');
      }
      res.end(data);
    });
  }

  if (pathname === '/models/shredder.glb' || pathname.startsWith('/models/shredder.glb')) {
    res.writeHead(200, {
      'Content-Type': 'model/gltf-binary',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    return fs.readFile(path.join(ROOT, 'shredder-pixela.glb'), (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('GLB yok');
      }
      res.end(data);
    });
  }

  if (pathname === '/models/phones.glb' || pathname.startsWith('/models/phones.glb')) {
    res.writeHead(200, {
      'Content-Type': 'model/gltf-binary',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      'X-Pixela-Ver': SCRIPT_VER,
    });
    return fs.readFile(path.join(ROOT, 'phones-pixela.glb'), (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('phones GLB yok');
      }
      res.end(data);
    });
  }

  const logoFile = logoReplacement(pathname);
  if (logoFile) return sendLocal(logoFile, res);

  if (pathname.startsWith('/videos/')) {
    const rel = pathname.replace(/^\//, '').split('?')[0];
    const local = path.join(ROOT, rel);
    const ext = path.extname(rel).toLowerCase();
    const types = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.m3u8': 'application/vnd.apple.mpegurl',
      '.ts': 'video/mp2t',
      '.avif': 'image/avif',
      '.json': 'application/json; charset=utf-8',
    };

    if (fs.existsSync(local) && fs.statSync(local).isFile()) {
      res.writeHead(200, {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Accept-Ranges': 'bytes',
        Pragma: 'no-cache',
      });
      return fs.createReadStream(local).pipe(res);
    }

    if (rel.startsWith('videos/prebaked/')) {
      try {
        const remote = await fetchRemoteAsset(`https://www.shader.se/${rel}`, '*/*');
        if (remote.status === 200 && remote.body?.length) {
          try {
            fs.mkdirSync(path.dirname(local), { recursive: true });
            fs.writeFileSync(local, remote.body);
          } catch (_) {}
          res.writeHead(200, {
            'Content-Type': remote.headers['content-type'] || types[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=86400',
            'X-Pixela-Source': 'shader-proxy',
            'X-Pixela-Ver': SCRIPT_VER,
          });
          return res.end(remote.body);
        }
      } catch (err) {
        console.warn('  Handshake video:', rel, err.message);
      }
    }
  }

  if (pathname.startsWith('/projects/')) {
    const name = path.basename(pathname.split('?')[0]);
    const local = path.join(ROOT, 'projects', name);
    if (fs.existsSync(local)) {
      const ext = path.extname(name).toLowerCase();
      const types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };
      res.writeHead(200, {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      });
      return fs.createReadStream(local).pipe(res);
    }
  }

  if (pathname.startsWith('/work/')) {
    if (await serveWork(pathname, query, req, res)) return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    // ?v= / ?px= gibi cache-bust query Flight q ile uyusmaz -> enqueueModel
    if (
      !isRscRequest(req) &&
      query &&
      /[?&](v|px|fixed|sync|t|check|e|min|zero|nocache|err)=/i.test(query)
    ) {
      res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (isRscRequest(req)) {
      if (await serveHomeRsc(res)) return;
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('RSC verisi yerelde yok.');
    }
    if (serveHome(res)) return;
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(errorPage('Yerel site dosyalari eksik. static/ klasorunu kontrol edin.'));
  }

  if (isHeipMuxImage(pathname)) {
    if (serveMuxImage(pathname, res)) return;
  }

  if (/\/_next\/static\/chunks\/.*\.js$/i.test(pathname)) {
    // Onceden cevirilmis chunk varsa onu sun (hot-path ceviri sunucuyu kilitler)
    const name = path.basename(pathname.split('?')[0]);
    const trFile = path.join(TR_CHUNK_DIR, name);
    if (fs.existsSync(trFile)) {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Pixela-Chunk': 'tr-cache',
        'X-Pixela-Ver': SCRIPT_VER,
      });
      return fs.createReadStream(trFile).pipe(res);
    }
    if (serveStaticFile(pathname, res, {
      'X-Pixela-Chunk': 'static-raw',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    })) return;
    if (servePatchedChunk(pathname, res)) return;
    if (await fetchAndServePatchedChunk(pathname, res)) return;
  }

  if (pathname.startsWith('/_next/')) {
    if (serveStaticFile(pathname, res)) return;
  }

  return serveLocalOr404(pathname, res);
});

function openBrowser() {
  if (getCloudBaseUrl() || process.platform !== 'win32') return;
  exec(`cmd /c start "" "${SITE_URL}"`);
}

function prewarmTranslatedPages() {
  const t0 = Date.now();
  try {
    const home = loadCache();
    if (home) preparePageHtml(home, 'home');
    const homeRsc = path.join(STATIC, 'rsc', 'home.txt');
    if (fs.existsSync(homeRsc)) prepareHomeRscBody(fs.readFileSync(homeRsc, 'utf8'));
    const workDir = path.join(STATIC, 'work');
    const workRscDir = path.join(STATIC, 'rsc', 'work');
    if (fs.existsSync(workDir)) {
      for (const f of fs.readdirSync(workDir)) {
        if (!f.endsWith('.html')) continue;
        const slug = f.replace(/\.html$/, '');
        preparePageHtml(fs.readFileSync(path.join(workDir, f), 'utf8'), `work:${slug}`);
        const rscFile = path.join(workRscDir, `${slug}.txt`);
        if (fs.existsSync(rscFile)) prepareWorkRscBody(fs.readFileSync(rscFile, 'utf8'), slug);
      }
    }
    console.log(`  Ceviri on-isitma: ${Date.now() - t0}ms (${htmlPageCache.size} html, ${rscBodyCache.size} rsc)`);
  } catch (err) {
    console.warn('  On-isitma hatasi:', err.message);
  }
}

function onListen() {
  console.log('');
  console.log('  ====================================');
  console.log('    PIXELA SITESI ACILDI');
  console.log('    Port: ' + PORT);
  console.log('    ' + SITE_URL);
  console.log('    Mod: YEREL');
  console.log('  ====================================');
  console.log('');
  console.log('  BU PENCEREYI KAPATMAYIN!');
  console.log('');
  openBrowser();
  const cached = loadCache();
  if (cached) refreshCss(cached).catch(() => {});
  const hasStatic = fs.existsSync(STATIC);
  console.log(hasStatic ? '  Yerel varliklar hazir.' : '  UYARI: static/ klasoru bulunamadi.');
  setImmediate(prewarmTranslatedPages);
}

function tryListen(index) {
  const envPort = parseInt(process.env.PORT, 10);
  if (envPort > 0) {
    setPort(envPort);
    server.listen({ port: envPort, host: '0.0.0.0' }, () => onListen());
    return;
  }

  if (index >= PORTS.length) {
    console.error('HATA: Hicbir port acilamadi:', PORTS.join(', '));
    process.exit(1);
    return;
  }
  const p = PORTS[index];
  setPort(p);

  const onErr = (err) => {
    server.removeListener('error', onErr);
    if (err.code === 'EADDRINUSE') {
      console.log('Port ' + p + ' dolu, siradaki deneniyor...');
      tryListen(index + 1);
      return;
    }
    console.error('HATA:', err.message);
    process.exit(1);
  };

  server.once('error', onErr);
  server.listen({ port: p, host: '::', ipv6Only: false }, () => {
    server.removeListener('error', onErr);
    onListen();
  });
}

function killOtherServers() {
  // Dev reboot: netstat/taskkill Windows'ta takilabiliyor; manuel port kontrolu yeterli
  return;
}

killOtherServers();
tryListen(0);
