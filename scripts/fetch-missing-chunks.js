const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/User/Desktop/pixela';
const CHUNK_DIR = path.join(ROOT, 'static', '_next', 'static', 'chunks');
const REMOTE = 'https://www.shader.se';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuf(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks) })
        );
      })
      .on('error', reject);
  });
}

function localGet(pathName) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: 8888, path: pathName }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

(async () => {
  const workFiles = fs.readdirSync(path.join(ROOT, 'static', 'work')).filter((f) => f.endsWith('.html'));
  const needed = new Set();
  for (const f of workFiles) {
    const html = fs.readFileSync(path.join(ROOT, 'static', 'work', f), 'utf8');
    for (const m of html.matchAll(/\/_next\/static\/chunks\/([^"'?\s]+)/g)) {
      needed.add(m[1]);
    }
  }
  // also from home
  const home = fs.readFileSync(path.join(ROOT, 'static', 'page.html'), 'utf8');
  for (const m of home.matchAll(/\/_next\/static\/chunks\/([^"'?\s]+)/g)) {
    needed.add(m[1]);
  }

  const missing = [...needed].filter((n) => !fs.existsSync(path.join(CHUNK_DIR, n)));
  console.log('needed', needed.size, 'missing', missing.length);
  missing.forEach((n) => console.log(' MISSING', n));

  for (const name of missing) {
    const url = `${REMOTE}/_next/static/chunks/${name}`;
    console.log('fetch', url);
    const res = await fetchBuf(url);
    console.log(' ', res.status, res.body.length);
    if (res.status === 200 && res.body.length > 100) {
      fs.writeFileSync(path.join(CHUNK_DIR, name), res.body);
      console.log('  saved', name);
    }
  }

  // Also check RSC work files for chunk refs
  const rscDir = path.join(ROOT, 'static', 'rsc', 'work');
  const rscMissing = new Set();
  if (fs.existsSync(rscDir)) {
    for (const f of fs.readdirSync(rscDir)) {
      const t = fs.readFileSync(path.join(rscDir, f), 'utf8');
      for (const m of t.matchAll(/\/_next\/static\/chunks\/([^"'\\\s]+)/g)) {
        if (!fs.existsSync(path.join(CHUNK_DIR, m[1]))) rscMissing.add(m[1]);
      }
    }
  }
  console.log('rsc missing', [...rscMissing]);
  for (const name of rscMissing) {
    const res = await fetchBuf(`${REMOTE}/_next/static/chunks/${name}`);
    console.log('rsc fetch', name, res.status, res.body.length);
    if (res.status === 200 && res.body.length > 100) {
      fs.writeFileSync(path.join(CHUNK_DIR, name), res.body);
    }
  }
})();
