const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const STATIC = path.join(ROOT, 'static');
const REMOTE = 'https://www.shader.se';

function fetch(urlPath) {
  return new Promise((resolve, reject) => {
    https
      .get(REMOTE + urlPath.split('?')[0], { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

function save(urlPath, body) {
  const clean = urlPath.split('?')[0].replace(/^\//, '');
  const dest = path.join(STATIC, clean);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
  return dest;
}

(async () => {
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'cache', 'page.html'), 'utf8');
  const urls = new Set([
    ...css.matchAll(/\/_next\/static\/media\/[^)"'\s]+/g),
    ...html.matchAll(/\/_next\/static\/media\/[^"'\s)]+/g),
  ].map((m) => m[0].split('?')[0]));

  console.log('media files to check:', urls.size);
  let ok = 0;
  let dl = 0;
  for (const u of urls) {
    const local = path.join(STATIC, u.replace(/^\//, ''));
    if (fs.existsSync(local)) {
      ok++;
      continue;
    }
    try {
      const res = await fetch(u);
      if (res.status === 200) {
        save(u, res.body);
        console.log('DOWNLOADED', path.basename(u), res.body.length);
        dl++;
      } else {
        console.log('FAIL', u, res.status);
      }
    } catch (e) {
      console.log('ERR', u, e.message);
    }
  }
  console.log('existing', ok, 'downloaded', dl);
})();
