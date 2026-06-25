const fs = require('fs');
const { injectHead } = require('./test-inject');

// minimal test - compare patched chunks vs static
const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:8888' + path, (r) => {
      const c = [];
      r.on('data', (d) => c.push(d));
      r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c), headers: r.headers }));
    }).on('error', reject);
  });
}

(async () => {
  const home = await get('/');
  const html = home.body.toString('utf8');
  fs.writeFileSync('debug-home2.html', html);
  console.log('home', home.status, 'ver', home.headers['x-pixela-ver']);

  // compare cache chunk vs static chunk for main bundle
  const name = '0nr6lqdt2xw72.js';
  const cached = fs.readFileSync('cache/chunks/' + name);
  const statik = fs.readFileSync('static/_next/static/chunks/' + name);
  console.log('chunk sizes cached/static', cached.length, statik.length, 'same', cached.equals(statik));

  const served = await get('/_next/static/chunks/' + name);
  console.log('served chunk', served.status, served.body.length, 'header', served.headers['x-pixela-chunk']);
  console.log('served equals cache', served.body.equals(cached));
})();
