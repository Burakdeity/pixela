/** phones.glb — iletisim bolumu 3 telefon splash logosu (shader-logo) → PIXELA */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'static', 'models', 'phones.glb');
const OUT = path.join(ROOT, 'phones-pixela.glb');
const SVG = path.join(ROOT, 'pixela-logo-glb.svg');

const SPLASH_W = 1024;
const SPLASH_H = 290;
const SPLASH_TEX = 2; // image index of "shader-logo"

async function makeSplashTexture() {
  const logoH = Math.round(SPLASH_W * (41 / 306));
  const logoY = Math.round((SPLASH_H - logoH) / 2);
  const logoBuf = await sharp(SVG).resize(SPLASH_W, logoH).png().toBuffer();
  return sharp({
    create: {
      width: SPLASH_W,
      height: SPLASH_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: logoBuf, top: logoY, left: 0 }])
    .webp({ quality: 92 })
    .toBuffer();
}

function parseGlb(glbBuf) {
  const jsonLen = glbBuf.readUInt32LE(12);
  const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOff = 20 + jsonLen;
  const binStart = binOff + 8;
  return { json, binStart, binOff };
}

function rebuildGlb(glbBuf, json, binData) {
  const jsonStr = JSON.stringify(json);
  const jsonBuf = Buffer.from(jsonStr);
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

  const binPad = (4 - (binData.length % 4)) % 4;
  const binChunk = Buffer.concat([binData, Buffer.alloc(binPad, 0)]);

  const totalLen = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const out = Buffer.alloc(totalLen);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(totalLen, 8);
  out.writeUInt32LE(jsonChunk.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(out, 20);
  const binOff = 20 + jsonChunk.length;
  out.writeUInt32LE(binChunk.length, binOff);
  out.writeUInt32LE(0x004e4942, binOff + 4);
  binChunk.copy(out, binOff + 8);
  return out;
}

function patchGlb(glbBuf, newTex, texIndex) {
  const { json, binStart, binOff } = parseGlb(glbBuf);
  const binLen = glbBuf.readUInt32LE(binOff);
  const binData = Buffer.from(glbBuf.slice(binStart, binStart + binLen));

  const img = json.images[texIndex];
  const bv = json.bufferViews[img.bufferView];
  const start = bv.byteOffset;
  const oldLen = bv.byteLength;

  if (newTex.length <= oldLen) {
    newTex.copy(binData, start);
    if (newTex.length < oldLen) binData.fill(0, start + newTex.length, start + oldLen);
    bv.byteLength = newTex.length;
  } else {
    const before = binData.slice(0, start);
    const after = binData.slice(start + oldLen);
    const delta = newTex.length - oldLen;
    const newBin = Buffer.concat([before, newTex, after]);
    bv.byteLength = newTex.length;
    for (const view of json.bufferViews) {
      if (view.byteOffset > start) view.byteOffset += delta;
    }
    return rebuildGlb(glbBuf, json, newBin);
  }

  return rebuildGlb(glbBuf, json, binData);
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('phones.glb yok:', SRC);
    process.exit(1);
  }
  if (!fs.existsSync(SVG)) {
    console.error('Once generate-logos.js calistir (pixela-logo-glb.svg)');
    process.exit(1);
  }

  const glb = fs.readFileSync(SRC);
  const splashTex = await makeSplashTexture();
  const out = patchGlb(glb, splashTex, SPLASH_TEX);

  // Materyal / doku adlarini da guncelle
  const { json } = parseGlb(out);
  for (const mat of json.materials || []) {
    if (mat.name === 'shader-logo') mat.name = 'pixela-logo';
  }
  for (const img of json.images || []) {
    if (img.name === 'shader-logo') img.name = 'pixela-logo';
  }
  const final = rebuildGlb(out, json, (() => {
    const binOff = 20 + Buffer.from(JSON.stringify(json)).length;
    // rebuildGlb needs bin from out - re-parse
    const parsed = parseGlb(out);
    const binLen = out.readUInt32LE(parsed.binOff);
    return out.slice(parsed.binStart, parsed.binStart + binLen);
  })());

  fs.writeFileSync(OUT, final);
  fs.copyFileSync(OUT, path.join(ROOT, 'static', 'models', 'phones.glb'));
  console.log('Yazildi:', OUT, `(${final.length} byte)`);
  console.log('  shader-logo (splash):', splashTex.length, 'byte');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
