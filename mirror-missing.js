/** Eksik proje sayfalari, RSC ve mux onizlemelerini indirir (chunks yeniden indirilmez). */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const STATIC = path.join(ROOT, 'static');
const CACHE = path.join(ROOT, 'cache');
const REMOTE = 'https://www.shader.se';

function fetchRemote(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' }, timeout: 30000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

function fetchWithHeaders(urlPath, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(REMOTE + urlPath);
    const req = https.request(
      { hostname: url.hostname, path: url.pathname + url.search, headers: { 'User-Agent': 'Mozilla/5.0', ...headers }, timeout: 30000 },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function extractProjectUids(html) {
  const key = '\\"projects\\":[';
  const i = html.indexOf(key);
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
  const projects = JSON.parse(html.slice(s, end).replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  return projects.map((p) => p.uid);
}

function extractMuxIds(html) {
  const ids = new Set();
  const re = /\\"mux_playback_id\\":\\"([^\\"]+)\\"/g;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  return [...ids];
}

async function main() {
  const homeHtml = fs.readFileSync(path.join(CACHE, 'page.html'), 'utf8');
  const uids = extractProjectUids(homeHtml);
  const muxIds = extractMuxIds(homeHtml);
  const workDir = path.join(STATIC, 'work');
  const rscDir = path.join(STATIC, 'rsc', 'work');
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(rscDir, { recursive: true });

  console.log('Proje sayfalari...');
  for (const uid of uids) {
    const htmlPath = path.join(workDir, `${uid}.html`);
    const rscPath = path.join(rscDir, `${uid}.txt`);
    if (!fs.existsSync(htmlPath)) {
      const res = await fetchRemote(REMOTE + `/work/${uid}`);
      if (res.status === 200) {
        fs.writeFileSync(htmlPath, res.body);
        console.log('  html', uid, res.body.length);
      }
    }
    if (!fs.existsSync(rscPath)) {
      const rsc = await fetchWithHeaders(`/work/${uid}`, { RSC: '1', Accept: 'text/x-component' });
      if (rsc.status === 200) {
        fs.writeFileSync(rscPath, rsc.body);
        fs.writeFileSync(path.join(CACHE, `rsc-work-${uid}.txt`), rsc.body);
        console.log('  rsc', uid, rsc.body.length);
      }
    }
  }

  console.log('\nMux onizleme (image.mux.com)...');
  let muxOk = 0;
  for (const id of muxIds) {
    const dest = path.join(STATIC, 'mux-cache', id, '0-1.jpg');
    if (fs.existsSync(dest)) {
      muxOk++;
      continue;
    }
    const url = `https://image.mux.com/${id}/thumbnail.jpg?width=1280&time=0`;
    const res = await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        const c = [];
        r.on('data', (d) => c.push(d));
        r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c) }));
      }).on('error', reject);
    });
    if (res.status === 200) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, res.body);
      muxOk++;
    }
  }
  console.log('Mux cache:', muxOk, '/', muxIds.length);
  console.log('Tamam.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
