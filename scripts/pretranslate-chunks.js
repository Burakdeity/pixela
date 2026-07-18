/** Pretranslate JS chunks into cache/chunks-tr-v* once */
const fs = require('fs');
const path = require('path');
const { applyTranslations } = require('../translations-tr');

const ROOT = path.join(__dirname, '..');
const SCRIPT_VER = '168';
const SRC = path.join(ROOT, 'static', '_next', 'static', 'chunks');
const DEST = path.join(ROOT, 'cache', `chunks-tr-v${SCRIPT_VER}`);

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js'));
console.log('Kaynak:', files.length, 'dosya');
console.time('translate');

for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
  const t0 = Date.now();
  const out = applyTranslations(raw, 'js');
  if (out !== raw) {
    fs.writeFileSync(path.join(DEST, f), out);
    console.log('TR ', f, (out.length / 1024).toFixed(0) + 'KB', Date.now() - t0 + 'ms');
  } else {
    console.log('skip', f);
  }
}

console.timeEnd('translate');
console.log('Cikti:', DEST);

const nav = path.join(DEST, '0nr6lqdt2xw72.js');
if (fs.existsSync(nav)) {
  let t = fs.readFileSync(nav, 'utf8');
  const from = 'function iV(e,t){var r,i;let n=e.__r3f';
  const to = 'function iV(e,t){if(!e)return;var r,i;let n=e.__r3f';
  if (t.includes(from) && !t.includes(to)) {
    t = t.split(from).join(to);
    console.log('iV undefined guard: applied');
  } else {
    console.log('iV undefined guard:', t.includes('if(!e)return;var r,i;let n=e.__r3f'));
  }

  // Bilgisayar reel isiklari — onceki seviye; video sync sikilasmis kalsin
  const lightPatches = [
    ['.div(4.5).mul(p).mul(.1)', '.div(4.5).mul(p).mul(.55)'],
    ['xr(t.reelLightTexture,f).rgb.mul(.5)', 'xr(t.reelLightTexture,f).rgb.mul(1.0)'],
    ['t.emissiveNode=xr(n["commodore-logo"].map).mul(.4)', 't.emissiveNode=xr(n["commodore-logo"].map).mul(1.15)'],
    ['Math.abs(e.currentTime-t.currentTime)>.15', 'Math.abs(e.currentTime-t.currentTime)>.04'],
  ];
  for (const [a, b] of lightPatches) {
    if (t.includes(a)) {
      t = t.split(a).join(b);
      console.log('light patch:', a.slice(0, 48), '-> ok');
    } else if (t.includes(b)) {
      console.log('light patch already:', b.slice(0, 48));
    } else {
      console.log('light patch MISS:', a.slice(0, 60));
    }
  }

  fs.writeFileSync(nav, t);
  console.log('project transition: original Shader flow preserved');
  console.log('natural blend:', t.includes('return TW(xd(e,1),r,r.a)'));
}
