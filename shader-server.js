const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { URL } = require('url');
const { applyTranslations, applyTranslationsBuffer, getChunkPatchJs } = require('./translations-tr');
const { applyProjectOverrides, loadProjects } = require('./patch-projects');
const { patchVideoLoader, patchHeipHtml, patchHeipRsc, isHeipMuxImage, HEIP_POSTER } = require('./patch-videos');

const ROOT = __dirname;
const CACHE = path.join(ROOT, 'cache');
const REMOTE = 'https://www.shader.se';
const PORTS = [8888, 9000, 7777, 8080];
const BRAND = 'PIXELA';

let PORT = PORTS[0];
let SITE_URL = `http://127.0.0.1:${PORT}/`;

const LOCAL = {
  'style.css': 'text/css; charset=utf-8',
  'script.js': 'application/javascript; charset=utf-8',
  'pixela-logo-dark.svg': 'image/svg+xml; charset=utf-8',
  'pixela-logo-hover.svg': 'image/svg+xml; charset=utf-8',
  'pixela-logo-glb.svg': 'image/svg+xml; charset=utf-8',
  'pixela-boot-screen.png': 'image/png',
  'pixela-boot-screen-mobile.png': 'image/png',
  'shredder-pixela.glb': 'model/gltf-binary',
  'computer-pixela.glb': 'model/gltf-binary',
};

const LOGO_PROXY = {
  'logo_dark.0a~p9g3zi7_h6.svg': 'pixela-logo-dark.svg',
  'logo.0ctv.ko5~mr~7.svg': 'pixela-logo-hover.svg',
};

if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

function setPort(p) {
  PORT = p;
  SITE_URL = `http://127.0.0.1:${p}/`;
  try {
    fs.writeFileSync(path.join(ROOT, 'port.txt'), String(p));
  } catch (_) {}
}

function fetchRemote(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' }, timeout: 20000 }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : REMOTE + res.headers.location;
          return resolve(fetchRemote(next));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode || 502, headers: res.headers, body: Buffer.concat(chunks) })
        );
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error('Baglanti zaman asimi'));
      });
  });
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

const SCRIPT_VER = '94';

/** false = orijinal Shader projeleri (carousel calisir). true = PIXELA ozel projeleri ekler. */
const ENABLE_CUSTOM_PROJECTS = false;

const PROJECTS_INIT_PATCH = {
  from:
    'if(e?.type==="project"&&e.project){let t=e.project,r=eC.useProjectsStore.getState().prismicProjects.get(),i=eC.useProjectsStore.getState().selectedProjectIndex.get(),n=r.findIndex(e=>e?.uid===t.uid);i%r.length!==n&&eC.useProjectsStore.getState().selectedProjectIndex.set(n),ei.set(!0)}',
  to: '{let r=eC.useProjectsStore.getState().prismicProjects.get();if(r.length>0){if(e?.type==="project"&&e.project){let t=e.project,i=eC.useProjectsStore.getState().selectedProjectIndex.get(),n=r.findIndex(e=>e?.uid===t.uid);i%r.length!==n&&eC.useProjectsStore.getState().selectedProjectIndex.set(n)}ei.set(!0)}}',
};
const CHUNK_CACHE = path.join(CACHE, 'chunks');
const CACHE_BUST = `px=${SCRIPT_VER}`;

/** Next.js client navigation — RSC flight; HTML patch bunlara uygulanmamali */
function isRscRequest(req) {
  const h = req.headers || {};
  if (String(h.rsc || h['RSC'] || '') === '1') return true;
  if (h['next-router-state-tree'] || h['Next-Router-State-Tree']) return true;
  if (h['next-router-prefetch'] || h['Next-Router-Prefetch']) return true;
  return /[?&]_rsc=/.test(req.url || '');
}

function patchContent(body) {
  let text = body.toString('utf8');
  if (text.includes(PROJECTS_INIT_PATCH.from)) {
    text = text.split(PROJECTS_INIT_PATCH.from).join(PROJECTS_INIT_PATCH.to);
  }
  let out = patchVideoLoader(Buffer.from(text, 'utf8'));
  return applyTranslationsBuffer(out, 'js');
}

function noStoreHeaders(headers) {
  const out = { ...headers };
  out['cache-control'] = 'no-store, no-cache, must-revalidate, max-age=0';
  out['pragma'] = 'no-cache';
  out['expires'] = '0';
  return out;
}

function htmlNoStoreHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Pixela-Ver': SCRIPT_VER,
  };
}

function buildEarlyHook() {
  const patch = getChunkPatchJs().replace(/<\//g, '<\\/');
  return `<script id="pixela-early">${patch}</script>`;
}

function getPublicUrl() {
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

  out = out.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/gi,
    (_, open, body, close) => open + body.replace(/https:\/\/www\.shader\.se/g, base) + close
  );

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

/** Sadece HTML attribute'larindaki chunk URL'lerine cache-bust ekle (RSC inline script'lere dokunma). */
function bustAssetUrls(html) {
  const attrRe = /(\s(?:src|href)=")(\/_next\/static\/chunks\/[^"]+\.(?:js|css)[^"]*)(")/gi;
  return html.replace(attrRe, (_, open, url, close) => open + bustOneUrl(url) + close);
}

function injectHead(html) {
  let out = ENABLE_CUSTOM_PROJECTS ? applyProjectOverrides(html) : html;
  out = patchHeipHtml(out);
  out = applyTranslations(out);
  out = patchSeo(out);
  out = bustAssetUrls(out);
  out = out.replace(/lang="en"/, 'lang="tr"');
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${BRAND} — Yazılım & Web</title>`);
  out = out.replace(
    /<link rel="stylesheet" href="\/_next\/static\/chunks\/[^"]+\.css[^"]*"/,
    `<link rel="stylesheet" href="/style.css?v=${SCRIPT_VER}"`
  );
  if (!out.includes('href="/style.css"') && !out.includes('href="style.css"')) {
    out = out.replace(
      '</head>',
      `<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />\n<meta http-equiv="Pragma" content="no-cache" />\n<link rel="stylesheet" href="/style.css?v=${SCRIPT_VER}"></head>`
    );
  }
  const earlyHook = buildEarlyHook();
  if (!out.includes('id="pixela-early"')) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${earlyHook}`);
  }
  out = out.replace(/<script id="bd-splash-boot"[\s\S]*?<\/script>\s*/g, '');
  out = out.replace(/<script id="pixela-script"[^>]*>\s*<\/script>\s*/g, '');
  out = out.replace(/<script id="ship-script"[^>]*>\s*<\/script>\s*/g, '');
  out = out.replace(/<script id="burakdeity-script"[^>]*>\s*<\/script>\s*/g, '');
  out = out.replace(/<div id="bd-splash-layer"[\s\S]*?<\/div>\s*/g, '');
  out = out.replace(
    '</body>',
    `<script id="pixela-script" src="/script.js?v=${SCRIPT_VER}" defer></script></body>`
  );
  return out;
}

function pixelaWorkUid(pathname) {
  const m = pathname.match(/^\/work\/([^/?#]+)\/?$/);
  if (!m) return null;
  const projects = loadProjects();
  if (!projects?.some((p) => p.uid === m[1])) return null;
  return m[1];
}

function workTemplateUid(uid) {
  const projects = loadProjects();
  const hit = projects?.find((p) => p.uid === uid);
  return hit?.routeUid || hit?.fallbackUid || 'ehealth-arena';
}

async function servePixelaWork(pathname, query, res) {
  const uid = pixelaWorkUid(pathname);
  if (!uid) return false;

  const template = workTemplateUid(uid);
  try {
    let page = await fetchRemote(`${REMOTE}/work/${template}${query}`);
    if (page.status !== 200) {
      page = await fetchRemote(`${REMOTE}/${query}`);
    }
    if (page.status !== 200) {
      const cached = loadCache();
      if (!cached) return false;
      const html = injectHead(cached);
      res.writeHead(200, htmlNoStoreHeaders());
      res.end(html);
      return true;
    }
    const html = injectHead(page.body.toString('utf8'));
    res.writeHead(200, htmlNoStoreHeaders());
    res.end(html);
    return true;
  } catch (_) {
    return false;
  }
}

function serveHome(res) {
  const cached = loadCache();
  fetchRemote(REMOTE + '/')
    .then((page) => {
      if (page.status === 200) {
        saveCache(page.body.toString('utf8'));
        refreshCss(page.body.toString('utf8')).catch(() => {});
      }
    })
    .catch(() => {});
  if (cached) {
    const html = injectHead(cached);
    res.writeHead(200, htmlNoStoreHeaders());
    res.end(html);
    return true;
  }
  return false;
}

async function refreshCss(html) {
  const cssMatch = html.match(/\/_next\/static\/chunks\/[^"]+\.css[^"]*/);
  if (!cssMatch) return;
  try {
    const css = await fetchRemote(REMOTE + cssMatch[0]);
    if (css.status !== 200) return;
    let text = css.body.toString('utf8').replace(/url\(\.\.\/media\//g, 'url(/_next/static/media/');
    text +=
      '\n.font-stix,[class*="stix_two_text"]{font-family:"STIX Two Text","Segoe UI",Georgia,"Times New Roman",serif!important}\n';
    fs.writeFileSync(path.join(ROOT, 'style.css'), text.trimEnd() + '\n');
  } catch (_) {}
}

function saveCache(html) {
  try {
    fs.writeFileSync(path.join(CACHE, 'page.html'), html);
    refreshChunkCache(html).catch(() => {});
  } catch (_) {}
}

function chunkCacheFile(pathname) {
  const name = path.basename(pathname.split('?')[0]);
  return path.join(CHUNK_CACHE, name);
}

async function refreshChunkCache(html) {
  if (!html) return;
  const urls = [...html.matchAll(/\/_next\/static\/chunks\/[^"'\s]+\.js/g)].map((m) => m[0].split('?')[0]);
  const uniq = [...new Set(urls)];
  if (!uniq.length) return;
  if (!fs.existsSync(CHUNK_CACHE)) fs.mkdirSync(CHUNK_CACHE, { recursive: true });
  for (const u of uniq) {
    try {
      const remote = await fetchRemote(REMOTE + u);
      if (remote.status !== 200) continue;
      const patched = patchBrandJs(remote.body);
      fs.writeFileSync(chunkCacheFile(u), patched);
    } catch (_) {}
  }
}

function servePatchedChunk(pathname, res) {
  const local = chunkCacheFile(pathname);
  if (fs.existsSync(local)) {
    const body = fs.readFileSync(local);
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

async function fetchAndServePatchedChunk(pathname, query, res) {
  try {
    const remote = await fetchRemote(REMOTE + pathname.split('?')[0] + (query || ''));
    if (remote.status !== 200) {
      res.writeHead(remote.status);
      res.end(remote.body);
      return true;
    }
    const patched = patchBrandJs(remote.body);
    if (!fs.existsSync(CHUNK_CACHE)) fs.mkdirSync(CHUNK_CACHE, { recursive: true });
    fs.writeFileSync(chunkCacheFile(pathname), patched);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      'X-Pixela-Chunk': 'fetched',
      'X-Pixela-Ver': SCRIPT_VER,
    });
    res.end(patched);
    return true;
  } catch (_) {
    return false;
  }
}

function loadCache() {
  try {
    const p = path.join(CACHE, 'page.html');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  } catch (_) {}
  return null;
}

function errorPage(msg) {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>PIXELA</title>
<meta http-equiv="refresh" content="3"><style>body{font-family:Segoe UI,sans-serif;background:#0a0a0a;color:#fcf9f3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}h1{font-weight:400}p{color:#aaa}</style></head>
<body><div><h1>PIXELA yukleniyor...</h1><p>${msg}</p><p>3 saniye sonra tekrar denenecek.<br>Adres: <a href="${SITE_URL}" style="color:#66C5F1">${SITE_URL}</a></p></div></body></html>`;
}

function patchBrandJs(body) {
  return patchContent(body);
}

function proxyErrorBody(pathname, msg) {
  if (pathname && /\/_next\/static\/chunks\/.*\.js/i.test(pathname)) {
    return Buffer.from('/* PIXELA proxy error: ' + msg.replace(/\*/g, '') + ' */', 'utf8');
  }
  return Buffer.from(errorPage(msg), 'utf8');
}

function streamProxy(targetUrl, req, res, pathname) {
  const target = new URL(targetUrl);
  const headers = { ...req.headers, host: target.host, origin: REMOTE, referer: REMOTE + '/' };
  delete headers['accept-encoding'];
  const patchJs = pathname && /\/_next\/static\/chunks\/.*\.js$/i.test(pathname);
  const preq = https.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method: req.method,
      headers,
      timeout: 30000,
    },
    (pres) => {
      let outHeaders = { ...pres.headers };
      delete outHeaders['content-security-policy'];
      delete outHeaders['content-security-policy-report-only'];
      delete outHeaders['content-length'];

      const patchHtml =
        !isRscRequest(req) && /text\/html/i.test(String(pres.headers['content-type'] || ''));
      const shouldPatch = patchJs || patchHtml;

      if (!shouldPatch) {
        const isRsc = /text\/x-component/i.test(String(pres.headers['content-type'] || ''));
        if (isRsc) {
          const rscChunks = [];
          pres.on('data', (c) => rscChunks.push(c));
          pres.on('end', () => {
            if (res.headersSent) return;
            let body = Buffer.from(
              patchHeipRsc(Buffer.concat(rscChunks).toString('utf8')),
              'utf8'
            );
            outHeaders = noStoreHeaders(outHeaders);
            delete outHeaders['transfer-encoding'];
            outHeaders['content-length'] = body.length;
            outHeaders['x-pixela-ver'] = SCRIPT_VER;
            res.writeHead(pres.statusCode || 502, outHeaders);
            res.end(body);
          });
          return;
        }
        res.writeHead(pres.statusCode || 502, outHeaders);
        pres.pipe(res);
        return;
      }

      const chunks = [];
      pres.on('data', (c) => chunks.push(c));
      pres.on('error', (err) => {
        if (!res.headersSent) {
          const body = proxyErrorBody(pathname, err.message);
          res.writeHead(502, {
            'Content-Type': /\/_next\/static\/chunks\/.*\.js/i.test(pathname || '')
              ? 'application/javascript; charset=utf-8'
              : 'text/html; charset=utf-8',
            'Content-Length': body.length,
          });
          res.end(body);
        }
      });
      pres.on('end', () => {
        if (res.headersSent) return;
        let body = Buffer.concat(chunks);
        if (patchJs) {
          body = patchBrandJs(body);
        } else if (patchHtml) {
          body = Buffer.from(injectHead(body.toString('utf8')), 'utf8');
        }
        outHeaders = noStoreHeaders(outHeaders);
        outHeaders['content-length'] = body.length;
        outHeaders['x-pixela-ver'] = SCRIPT_VER;
        if (patchJs) outHeaders['x-pixela-chunk'] = 'live';
        res.writeHead(pres.statusCode || 502, outHeaders);
        res.end(body);
      });
    }
  );
  preq.on('error', (err) => {
    if (res.headersSent) return;
    const body = proxyErrorBody(pathname, err.message);
    res.writeHead(502, {
      'Content-Type': /\/_next\/static\/chunks\/.*\.js/i.test(pathname || '')
        ? 'application/javascript; charset=utf-8'
        : 'text/html; charset=utf-8',
      'Content-Length': body.length,
    });
    res.end(body);
  });
  preq.on('timeout', () => {
    preq.destroy();
    if (res.headersSent) return;
    const body = proxyErrorBody(pathname, 'Sunucu yanit vermedi.');
    res.writeHead(504, {
      'Content-Type': /\/_next\/static\/chunks\/.*\.js/i.test(pathname || '')
        ? 'application/javascript; charset=utf-8'
        : 'text/html; charset=utf-8',
      'Content-Length': body.length,
    });
    res.end(body);
  });
  if (req.method !== 'GET' && req.method !== 'HEAD') req.pipe(preq);
  else preq.end();
}

async function getHomePage() {
  try {
    const page = await fetchRemote(REMOTE + '/');
    if (page.status === 200) {
      saveCache(page.body.toString('utf8'));
      refreshCss(page.body.toString('utf8')).catch(() => {});
      return injectHead(page.body.toString('utf8'));
    }
  } catch (_) {}
  const cached = loadCache();
  if (cached) return injectHead(cached);
  return null;
}

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const base = path.basename(pathname);

  if (pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'X-Pixela-Ver': SCRIPT_VER });
    return res.end('ok v' + SCRIPT_VER);
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

  if (LOCAL[base]) return sendLocal(base, res);
  if (base === 'script.js') return sendLocal('script.js', res);

  if (pathname === '/textures/copyright_footer.png') {
    return sendLocal('pixela-logo-dark.svg', res);
  }

  if (pathname === '/textures/boot_screen.png') {
    return sendLocal('pixela-boot-screen.png', res);
  }

  if (pathname === '/textures/boot_screen_mobile.png') {
    return sendLocal('pixela-boot-screen-mobile.png', res);
  }

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

  const logoFile = logoReplacement(pathname);
  if (logoFile) return sendLocal(logoFile, res);

  if (pathname.startsWith('/videos/')) {
    const name = path.basename(pathname.split('?')[0]);
    const local = path.join(ROOT, 'videos', name);
    if (fs.existsSync(local)) {
      const ext = path.extname(name).toLowerCase();
      const types = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.m3u8': 'application/vnd.apple.mpegurl',
        '.ts': 'video/mp2t',
      };
      res.writeHead(200, {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Accept-Ranges': 'bytes',
        Pragma: 'no-cache',
      });
      return fs.createReadStream(local).pipe(res);
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
    if (!isRscRequest(req) && (await servePixelaWork(pathname, query, res))) return;
    return streamProxy(REMOTE + pathname + query, req, res, pathname);
  }

  if (pathname === '/' || pathname === '/index.html') {
    if (isRscRequest(req)) {
      return streamProxy(REMOTE + pathname + query, req, res, pathname);
    }
    try {
      const page = await fetchRemote(REMOTE + '/' + query);
      if (page.status === 200) {
        saveCache(page.body.toString('utf8'));
        refreshCss(page.body.toString('utf8')).catch(() => {});
        const html = injectHead(page.body.toString('utf8'));
        res.writeHead(200, htmlNoStoreHeaders());
        return res.end(html);
      }
    } catch (_) {}
    if (serveHome(res)) return;
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(errorPage('Internet baglantisi gerekli. Wi-Fi acik mi kontrol edin.'));
  }

  if (isHeipMuxImage(pathname)) {
    const poster = path.join(ROOT, 'videos', 'heip-poster.jpg');
    if (fs.existsSync(poster)) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      });
      return fs.createReadStream(poster).pipe(res);
    }
  }

  if (/\/_next\/static\/chunks\/.*\.js$/i.test(pathname)) {
    if (servePatchedChunk(pathname, res)) return;
    if (await fetchAndServePatchedChunk(pathname, query, res)) return;
  }

  return streamProxy(REMOTE + pathname + query, req, res, pathname);
});

function openBrowser() {
  exec(`cmd /c start "" "${SITE_URL}"`);
}

function onListen() {
  console.log('');
  console.log('  ====================================');
  console.log('    PIXELA SITESI ACILDI');
  console.log('    Port: ' + PORT);
  console.log('    ' + SITE_URL);
  console.log('  ====================================');
  console.log('');
  console.log('  BU PENCEREYI KAPATMAYIN!');
  console.log('');
  openBrowser();
  fetchRemote(REMOTE + '/')
    .then((page) => {
      if (page.status === 200) {
        saveCache(page.body.toString('utf8'));
        refreshCss(page.body.toString('utf8')).catch(() => {});
        console.log('  Cache yenilendi.');
      }
    })
    .catch(() => console.log('  Cache yenilenemedi (offline?).'));
}

function tryListen(index) {
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
  const { execSync } = require('child_process');
  for (const port of PORTS) {
    try {
      const out = execSync(`netstat -ano | findstr ":${port} " | findstr LISTENING`, { encoding: 'utf8' });
      for (const line of out.split('\n')) {
        const pid = parseInt(String(line).trim().split(/\s+/).pop(), 10);
        if (pid && pid !== process.pid) {
          try {
            execSync(`taskkill /PID ${pid} /F`);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
}

killOtherServers();
tryListen(0);
