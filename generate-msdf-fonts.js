/** STIX MSDF fontlari — Turkce karakter destekli (3D metin) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PAIRS } = require('./translations-tr');

const ROOT = __dirname;
const FONTS = path.join(ROOT, 'fonts');
const CLI = path.join(ROOT, 'node_modules', 'msdf-bmfont-xml', 'cli.js');

const WEIGHTS = [
  { ttf: 'STIXTwoText-Regular.ttf', out: 'stix_regular', bold: 0 },
  { ttf: 'STIXTwoText-Medium.ttf', out: 'stix_medium', bold: 0 },
  { ttf: 'STIXTwoText-Bold.ttf', out: 'stix_bold', bold: 1 },
];

const BASE_CHARSET =
  ' !"\'(),-./0123456789:;?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]abcdefghijklmnopqrstuvwxyz{}' +
  'ÄÅÖäåö—“”—' +
  'ıİşŞçÇğĞüÜ' +
  '&';

function collectCharset() {
  const set = new Set(BASE_CHARSET.split(''));
  for (const [, to] of PAIRS) {
    for (const ch of to) set.add(ch);
  }
  return [...set].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}

function patchJson(outName) {
  const jsonPath = path.join(FONTS, `${outName}.json`);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.pages = [`/fonts/${outName}.png`];
  data.distanceField = { fieldType: 'msdf', distanceRange: 4 };
  const weight = WEIGHTS.find((w) => w.out === outName);
  if (weight) data.info.bold = weight.bold;
  data.info.face = 'STIX Two Text';
  data.info.size = 48;
  fs.writeFileSync(jsonPath, JSON.stringify(data));
}

function generateOne({ ttf, out }) {
  const ttfPath = path.join(FONTS, ttf);
  if (!fs.existsSync(ttfPath)) {
    console.error('Font yok:', ttfPath);
    process.exit(1);
  }

  const charsetPath = path.join(FONTS, 'charset.txt');
  const charset = collectCharset();
  fs.writeFileSync(charsetPath, charset, 'utf8');

  const tmpBase = path.join(FONTS, `_tmp_${out}`);
  if (fs.existsSync(`${tmpBase}.json`)) fs.unlinkSync(`${tmpBase}.json`);
  if (fs.existsSync(`${tmpBase}.png`)) fs.unlinkSync(`${tmpBase}.png`);

  const cmd = [
    `"${process.execPath}"`,
    `"${CLI}"`,
    '-f json',
    `-o "${tmpBase}"`,
    '-s 48',
    '-r 4',
    '-m 1024,1024',
    '-p 2',
    '-b 2',
    '--smart-size',
    `--charset-file "${charsetPath}"`,
    `"${ttfPath}"`,
  ].join(' ');

  console.log('Uretiliyor:', out, `(${charset.length} karakter)`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

  const fontface = path.basename(ttfPath, path.extname(ttfPath));
  const producedJson = path.join(FONTS, `${fontface}.json`);
  const producedPng = `${tmpBase}.png`;
  if (!fs.existsSync(producedJson) || !fs.existsSync(producedPng)) {
    console.error('Cikti bulunamadi:', producedJson, producedPng);
    process.exit(1);
  }

  const finalJson = path.join(FONTS, `${out}.json`);
  const finalPng = path.join(FONTS, `${out}.png`);
  fs.renameSync(producedJson, finalJson);
  fs.renameSync(producedPng, finalPng);
  patchJson(out);
  console.log('Tamam:', out);
}

if (!fs.existsSync(FONTS)) fs.mkdirSync(FONTS, { recursive: true });

for (const w of WEIGHTS) generateOne(w);
console.log('\nMSDF fontlar hazir:', FONTS);
