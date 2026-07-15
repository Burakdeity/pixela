/** Pretranslate JS chunks into cache/chunks-tr-v* once */
const fs = require('fs');
const path = require('path');
const { applyTranslations } = require('../translations-tr');

const ROOT = path.join(__dirname, '..');
const SCRIPT_VER = '166';
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

  // Proje gecisinde boot atla
  const bootFrom =
    'l.current.loadingProgress.value=(typeof window!=="undefined"&&(window.__pixelaSkipBoot||/^\\/work\\//.test(location.pathname)))?100:f.current';
  const bootFromMid =
    'l.current.loadingProgress.value=(typeof window!=="undefined"&&window.__pixelaSkipBoot)?100:f.current';
  const bootFromOrig = 'l.current.loadingProgress.value=f.current';
  const bootTo =
    'l.current.loadingProgress.value=(typeof window!=="undefined"&&(window.__pixelaSkipBoot||/^\\/work\\//.test(location.pathname)))?100:f.current';
  if (t.includes(bootTo) && !t.includes(bootFromOrig) && t.includes('__pixelaSkipBoot||')) {
    console.log('boot skip progress: already');
  } else if (t.includes(bootFrom)) {
    console.log('boot skip progress: already v163');
  } else if (t.includes(bootFromMid)) {
    t = t.split(bootFromMid).join(bootTo);
    console.log('boot skip progress: upgraded');
  } else if (t.includes(bootFromOrig)) {
    t = t.split(bootFromOrig).join(bootTo);
    console.log('boot skip progress: applied');
  } else {
    console.log('boot skip progress: MISS');
  }

  // Projeyi sayfa yenilemeden ac; boot bayragini router.push'tan once set et
  const navPatches = [
    [
      'i.set(!0),n.set(!0),window.umami.track("navigate_to_project",{project:e}),r.push(`/work/${e}`)',
      'window.__pixelaSkipBoot=1,window.umami&&window.umami.track("navigate_to_project",{project:e}),r.push(`/work/${e}`)',
    ],
    [
      'window.umami.track("next_project_click",{project:e}),y.push(`/work/${e}`)',
      'window.__pixelaSkipBoot=1,window.umami&&window.umami.track("next_project_click",{project:e}),y.push(`/work/${e}`)',
    ],
  ];
  for (const [a, b] of navPatches) {
    if (t.includes(a)) {
      t = t.split(a).join(b);
      console.log('soft work nav:', a.slice(0, 40), '-> ok');
    } else if (t.includes(b)) {
      console.log('soft work nav already');
    } else {
      console.log('soft work nav MISS:', a.slice(0, 50));
    }
  }

  // Skip iken boot texture blend etme — sahneyi goster
  const blendFrom = 'return TW(xd(e,1),r,r.a)';
  const blendTo =
    'return (typeof window!=="undefined"&&(window.__pixelaSkipBoot||/^\\/work\\//.test(location.pathname)))?r:TW(xd(e,1),r,r.a)';
  if (t.includes(blendFrom)) {
    t = t.split(blendFrom).join(blendTo);
    console.log('boot blend skip: applied');
  } else if (t.includes(blendTo)) {
    console.log('boot blend skip: already');
  } else {
    console.log('boot blend skip: MISS');
  }

  fs.writeFileSync(nav, t);
  console.log('boot skip flag in early script expected via getChunkPatchJs');
  console.log('natural blend:', t.includes('return TW(xd(e,1),r,r.a)'));
}
