/** Yerel static/cache dosyalarindan shader marka referanslarini temizler. */
const fs = require('fs');
const path = require('path');
const { scrubBrandReferences, scrubBrandInJs } = require('./brand-scrub');

const ROOT = __dirname;
const BASE = 'http://127.0.0.1:8888';
const HTML_EXT = new Set(['.html', '.txt', '.json']);
const BRAND_JS = new Set(['09d2g3rtnbzgs.js', '003qcun9_z40b.js']);
const SKIP_JS = new Set(['0nr6lqdt2xw72.js']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function scrubFile(file) {
  const base = path.basename(file);
  const ext = path.extname(file).toLowerCase();
  const before = fs.readFileSync(file, 'utf8');

  let after = before;
  if (ext === '.js') {
    if (SKIP_JS.has(base)) return false;
    if (BRAND_JS.has(base) || /Shader Development Studio|hello@shader\.se/i.test(before)) {
      after = scrubBrandInJs(before);
    }
  } else if (HTML_EXT.has(ext)) {
    after = scrubBrandReferences(before, BASE);
  } else {
    return false;
  }

  if (after === before) return false;
  fs.writeFileSync(file, after);
  return true;
}

let changed = 0;
for (const dir of ['static', 'cache']) {
  for (const file of walk(path.join(ROOT, dir))) {
    if (scrubFile(file)) {
      changed++;
      console.log('temizlendi:', path.relative(ROOT, file));
    }
  }
}
console.log(`\nToplam ${changed} dosya guncellendi.`);
