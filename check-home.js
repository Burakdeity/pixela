const http = require('http');
const fs = require('fs');

http.get('http://127.0.0.1:8888/', (r) => {
  const chunks = [];
  r.on('data', (c) => chunks.push(c));
  r.on('end', () => {
    const d = Buffer.concat(chunks).toString('utf8');
    console.log('status', r.statusCode, 'len', d.length);
    const cfg = d.match(/id="pixela-config"[^>]*>([\s\S]*?)<\/script>/);
    if (cfg) {
      try {
        JSON.parse(cfg[1]);
        console.log('config JSON: ok');
      } catch (e) {
        console.log('config JSON: FAIL', e.message);
      }
    } else {
      console.log('config script: missing');
    }
    const flights = (d.match(/self\.__next_f\.push/g) || []).length;
    console.log('flight pushes:', flights);
    const jsUrls = [...new Set([...d.matchAll(/\/_next\/static\/chunks\/([^"']+\.js)/g)].map((m) => m[1]))];
    console.log('chunks in html:', jsUrls.length);
    let fail = 0;
    (async () => {
      for (const c of jsUrls) {
        const url = 'http://127.0.0.1:8888/_next/static/chunks/' + c;
        const body = await new Promise((res) => {
          http.get(url, (rr) => {
            const cc = [];
            rr.on('data', (x) => cc.push(x));
            rr.on('end', () => res({ status: rr.statusCode, body: Buffer.concat(cc) }));
          });
        });
        if (body.status !== 200) {
          console.log('CHUNK 404', c);
          fail++;
          continue;
        }
        try {
          new Function(body.body.toString('utf8'));
        } catch (e) {
          console.log('CHUNK SYNTAX', c.split('/').pop(), e.message.slice(0, 60));
          fail++;
        }
      }
      console.log('chunk check fail:', fail);
      const proj = d.includes('dila-lazer') || d.includes('Dila Lazer');
      console.log('custom projects in html:', proj);
      fs.writeFileSync('debug-home.html', d);
      console.log('saved debug-home.html');
    })();
  });
});
