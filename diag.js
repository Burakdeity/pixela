const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function getHttp(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (r) => {
      const c = [];
      r.on('data', (d) => c.push(d));
      r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c), headers: r.headers }));
    }).on('error', reject);
  });
}

(async () => {
  console.log('=== DIAG ===');
  try {
    const ping = await getHttp('http://127.0.0.1:8888/ping');
    console.log('ping', ping.status, ping.body.toString());
  } catch (e) {
    console.log('SERVER DOWN', e.message);
    process.exit(1);
  }

  const home = await getHttp('http://127.0.0.1:8888/');
  const html = home.body.toString('utf8');
  console.log('home', home.status, html.length, 'v=' + (html.match(/script\.js\?v=(\d+)/) || [])[1]);

  const assets = [
    '/style.css',
    '/script.js',
    '/models/shredder.glb',
    '/models/computer.glb',
    '/pixela-logo-dark.svg',
  ];
  for (const a of assets) {
    const r = await getHttp('http://127.0.0.1:8888' + a);
    console.log(a, r.status, r.body.length);
  }

  const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
  let fail = 0;
  for (const c of chunks) {
    const r = await getHttp('http://127.0.0.1:8888' + c);
    const b = r.body.toString('utf8');
    if (r.status !== 200) {
      console.log('CHUNK FAIL', c, r.status);
      fail++;
      continue;
    }
    try {
      new Function(b);
    } catch (e) {
      console.log('CHUNK SYNTAX', c.split('/').pop(), e.message.slice(0, 80));
      fail++;
    }
  }
  console.log('chunks', chunks.length, 'fail', fail);

  const media = [...new Set([...html.matchAll(/\/_next\/static\/media\/[^"']+/g)].map((m) => m[0]))].slice(0, 8);
  for (const m of media) {
    const r = await getHttp('http://127.0.0.1:8888' + m);
    if (r.status !== 200) console.log('MEDIA FAIL', m, r.status);
  }

  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  console.log('style.css', css.length, 'exists');

  // RSC script integrity
  const patched = html;
  for (const m of patched.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const body = m[1].trim();
    if (body.startsWith('self.__next_f')) {
      if (body.includes('PIXELA') && body.includes('undefined')) {
        console.log('WARN rsc contains undefined');
      }
    }
  }
})();
