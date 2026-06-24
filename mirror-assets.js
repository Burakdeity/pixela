/**
 * shader.se'den tek seferlik varlık indirme — sonrasında site tamamen yerel çalışır.
 * Kullanım: node mirror-assets.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { applyTranslationsBuffer } = require('./translations-tr');
const { patchVideoLoader } = require('./patch-videos');

const ROOT = __dirname;
const STATIC = path.join(ROOT, 'static');
const CACHE = path.join(ROOT, 'cache');
const CHUNK_CACHE = path.join(CACHE, 'chunks');
const REMOTE = 'https://www.shader.se';

const PROJECTS_INIT_PATCH = {
  from:
    'if(e?.type==="project"&&e.project){let t=e.project,r=eC.useProjectsStore.getState().prismicProjects.get(),i=eC.useProjectsStore.getState().selectedProjectIndex.get(),n=r.findIndex(e=>e?.uid===t.uid);i%r.length!==n&&eC.useProjectsStore.getState().selectedProjectIndex.set(n),ei.set(!0)}',
  to: '{let r=eC.useProjectsStore.getState().prismicProjects.get();if(r.length>0){if(e?.type==="project"&&e.project){let t=e.project,i=eC.useProjectsStore.getState().selectedProjectIndex.get(),n=r.findIndex(e=>e?.uid===t.uid);i%r.length!==n&&eC.useProjectsStore.getState().selectedProjectIndex.set(n)}ei.set(!0)}}',
};

function fetchRemote(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' }, timeout: 30000 }, (res) => {
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
        reject(new Error('timeout'));
      });
  });
}

function patchJs(body) {
  let text = body.toString('utf8');
  if (text.includes(PROJECTS_INIT_PATCH.from)) {
    text = text.split(PROJECTS_INIT_PATCH.from).join(PROJECTS_INIT_PATCH.to);
  }
  return applyTranslationsBuffer(patchVideoLoader(Buffer.from(text, 'utf8')), 'js');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function saveStatic(urlPath, body) {
  const clean = urlPath.split('?')[0];
  const dest = path.join(STATIC, clean.replace(/^\//, ''));
  ensureDir(dest);
  fs.writeFileSync(dest, body);
  return dest;
}

function extractUrls(html) {
  const js = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"'\s)]+\.js/g)].map((m) => m[0].split('?')[0]))];
  const css = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"'\s)]+\.css/g)].map((m) => m[0].split('?')[0]))];
  const media = [...new Set([...html.matchAll(/\/_next\/static\/media\/[^"'\s)]+/g)].map((m) => m[0].split('?')[0]))];
  return { js, css, media };
}

function extractCssUrls(cssText) {
  return [...new Set([...cssText.matchAll(/url\((\/_next\/static\/media\/[^)]+)\)/g)].map((m) => m[1].split('?')[0]))];
}

async function download(urlPath, { patch = false } = {}) {
  const clean = urlPath.split('?')[0];
  try {
    const res = await fetchRemote(REMOTE + clean);
    if (res.status !== 200) {
      console.log('  SKIP', clean, res.status);
      return null;
    }
    let body = res.body;
    if (patch && /\.js$/i.test(clean)) {
      body = patchJs(body);
      ensureDir(path.join(CHUNK_CACHE, path.basename(clean)));
      fs.writeFileSync(path.join(CHUNK_CACHE, path.basename(clean)), body);
    }
    saveStatic(clean, body);
    console.log('  OK', clean, body.length);
    return body;
  } catch (e) {
    console.log('  FAIL', clean, e.message);
    return null;
  }
}

async function mirrorPage(urlPath, saveAs) {
  const res = await fetchRemote(REMOTE + urlPath);
  if (res.status !== 200) throw new Error(`${urlPath} => ${res.status}`);
  const html = res.body.toString('utf8');
  ensureDir(saveAs);
  fs.writeFileSync(saveAs, html);
  console.log('  page', urlPath, html.length);
  return html;
}

async function fetchWithHeaders(urlPath, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(REMOTE + urlPath);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*', ...headers },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

async function mirrorRsc() {
  const rscDir = path.join(STATIC, 'rsc');
  fs.mkdirSync(rscDir, { recursive: true });
  try {
    const res = await fetchWithHeaders('/', { RSC: '1', Accept: 'text/x-component' });
    if (res.status === 200) {
      fs.writeFileSync(path.join(rscDir, 'home.txt'), res.body);
      fs.writeFileSync(path.join(CACHE, 'rsc-home.txt'), res.body);
      console.log('  RSC home', res.body.length);
    }
  } catch (e) {
    console.log('  RSC SKIP', e.message);
  }
}

function extractProjectUids(html) {
  const key = '\\"projects\\":[';
  const i = html.indexOf(key);
  if (i < 0) return [];
  const s = html.indexOf('[', i);
  let depth = 0;
  let end = s;
  for (let j = s; j < html.length; j++) {
    if (html[j] === '[') depth++;
    if (html[j] === ']') {
      depth--;
      if (depth === 0) {
        end = j + 1;
        break;
      }
    }
  }
  try {
    const projects = JSON.parse(html.slice(s, end).replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    return projects.map((p) => p.uid);
  } catch (_) {
    return [];
  }
}

function extractMuxIds(html) {
  const ids = new Set();
  const re = /\\"mux_playback_id\\":\\"([^\\"]+)\\"/g;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  return [...ids];
}

async function mirrorWorkPages(uids) {
  const workDir = path.join(STATIC, 'work');
  const rscDir = path.join(STATIC, 'rsc', 'work');
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(rscDir, { recursive: true });

  console.log(`\nProje sayfalari (${uids.length})...\n`);
  for (const uid of uids) {
    try {
      await mirrorPage(`/work/${uid}`, path.join(workDir, `${uid}.html`));
      const rsc = await fetchWithHeaders(`/work/${uid}`, { RSC: '1', Accept: 'text/x-component' });
      if (rsc.status === 200) {
        fs.writeFileSync(path.join(rscDir, `${uid}.txt`), rsc.body);
        fs.writeFileSync(path.join(CACHE, `rsc-work-${uid}.txt`), rsc.body);
        console.log('  RSC work', uid, rsc.body.length);
      } else {
        console.log('  RSC SKIP', uid, rsc.status);
      }
    } catch (e) {
      console.log('  work SKIP', uid, e.message);
    }
  }
}

async function fetchMuxCdn(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*,*/*' }, timeout: 20000 }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          return resolve(fetchMuxCdn(res.headers.location));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

async function mirrorMuxThumbnails(muxIds) {
  const cacheDir = path.join(STATIC, 'mux-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log(`\nMux onizleme (${muxIds.length}) — image.mux.com...\n`);
  let ok = 0;
  for (const id of muxIds) {
    const dest = path.join(cacheDir, id, '0-1.jpg');
    if (fs.existsSync(dest)) {
      ok++;
      continue;
    }
    try {
      const url = `https://image.mux.com/${id}/thumbnail.jpg?width=1280&time=0`;
      const res = await fetchMuxCdn(url);
      if (res.status === 200 && res.body?.length) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, res.body);
        ok++;
        console.log('  mux OK', id.slice(0, 12) + '...', res.body.length);
      } else {
        console.log('  mux SKIP', id.slice(0, 12), res.status);
      }
    } catch (e) {
      console.log('  mux FAIL', id.slice(0, 12), e.message);
    }
  }
  return ok;
}

async function mirrorTexturesFromChunks() {
  const { execSync } = require('child_process');
  try {
    execSync('node mirror-textures.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.log('  textures mirror warning');
  }
}

async function main() {
  console.log('PIXELA mirror — shader.se varlıkları indiriliyor...\n');

  if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });
  if (!fs.existsSync(CHUNK_CACHE)) fs.mkdirSync(CHUNK_CACHE, { recursive: true });
  if (!fs.existsSync(STATIC)) fs.mkdirSync(STATIC, { recursive: true });

  const homeHtml = await mirrorPage('/', path.join(CACHE, 'page.html'));
  fs.writeFileSync(path.join(STATIC, 'page.html'), homeHtml);
  const { js, css, media } = extractUrls(homeHtml);
  const allMedia = new Set(media);

  console.log(`\nChunks: ${js.length}, CSS: ${css.length}, Media: ${media.length}\n`);

  for (const u of js) await download(u, { patch: true });
  for (const u of css) {
    const body = await download(u);
    if (body) {
      for (const m of extractCssUrls(body.toString('utf8'))) allMedia.add(m);
    }
  }
  // style.css kaydedildikten sonra tum font/media URL'lerini de indir
  const stylePath = path.join(ROOT, 'style.css');
  if (fs.existsSync(stylePath)) {
    const styleText = fs.readFileSync(stylePath, 'utf8');
    for (const m of [...styleText.matchAll(/\/_next\/static\/media\/[^)"'\s]+/g)].map((x) => x[0].split('?')[0])) {
      allMedia.add(m);
    }
  }
  for (const u of allMedia) await download(u);

  const projectUids = extractProjectUids(homeHtml);
  const muxIds = extractMuxIds(homeHtml);

  await mirrorWorkPages(projectUids.length ? projectUids : ['ehealth-arena', 'select-concept', 'gamily']);
  await mirrorMuxThumbnails(muxIds);
  await mirrorRsc();
  await mirrorTexturesFromChunks();

  const manifest = {
    mirroredAt: new Date().toISOString(),
    source: REMOTE,
    chunks: js.length,
    css: css.length,
    media: allMedia.size,
    workPages: projectUids,
    muxThumbnails: muxIds.length,
  };
  fs.writeFileSync(path.join(STATIC, 'mirror-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('\nTamamlandi. Sunucu calisirken shader.se\'ye baglanmaz.');
  console.log('Sunucuyu yeniden başlatın: npm start');
}

main().catch((e) => {
  console.error('HATA:', e.message);
  process.exit(1);
});
