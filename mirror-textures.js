const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const STATIC = path.join(ROOT, 'static');
const CHUNK_CACHE = path.join(ROOT, 'cache', 'chunks');
const REMOTE = 'https://www.shader.se';

function fetch(urlPath) {
  return new Promise((resolve, reject) => {
    https
      .get(REMOTE + urlPath.split('?')[0], { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

function collectUrls() {
  const urls = new Set();
  const dirs = [CHUNK_CACHE, path.join(STATIC, '_next', 'static', 'chunks')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.js')) continue;
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const m of text.matchAll(/\/textures\/[a-zA-Z0-9_./-]+/g)) urls.add(m[0].split('?')[0]);
      for (const m of text.matchAll(/\/models\/[a-zA-Z0-9_./-]+/g)) urls.add(m[0].split('?')[0]);
    }
  }
  return [...urls];
}

(async () => {
  const urls = collectUrls();
  console.log('texture/model urls:', urls.length);
  let ok = 0;
  let dl = 0;
  let fail = 0;
  for (const u of urls) {
    const dest = path.join(STATIC, u.replace(/^\//, ''));
    if (fs.existsSync(dest)) {
      ok++;
      continue;
    }
    try {
      const res = await fetch(u);
      if (res.status === 200) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, res.body);
        console.log('OK', u, res.body.length);
        dl++;
      } else {
        console.log('SKIP', u, res.status);
        fail++;
      }
    } catch (e) {
      console.log('ERR', u, e.message);
      fail++;
    }
  }
  console.log('done existing', ok, 'downloaded', dl, 'failed', fail);
})();
