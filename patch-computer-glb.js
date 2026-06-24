/** computer.glb — klavye ustundeki SHADER logosunu PIXELA yap */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'computer.glb');
const OUT = path.join(ROOT, 'computer-pixela.glb');
const SVG = path.join(ROOT, 'pixela-logo-glb.svg');

/** Klavye rozeti logo olcegi (1 = tam genislik) */
const LOGO_SCALE = 0.72;
const LOGO_ROW = { left: 0, top: 168, width: 1024, height: 130 };
const LOGO_TEX = 2;

async function makeLogoTexture(glbBuf) {
  const jsonLen = glbBuf.readUInt32LE(12);
  const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const bv = json.bufferViews[json.images[LOGO_TEX].bufferView];
  const oldWebp = glbBuf.slice(binStart + bv.byteOffset, binStart + bv.byteOffset + bv.byteLength);

  const meta = await sharp(oldWebp).metadata();
  const W = meta.width || 1024;
  const H = meta.height || 415;
  const splitY = LOGO_ROW.top;

  const top = await sharp(oldWebp).extract({ left: 0, top: 0, width: W, height: splitY }).png().toBuffer();

  const logoW = Math.round(W * LOGO_SCALE);
  const logoH = Math.round(logoW * (41 / 306));
  const logoBuf = await sharp(SVG).resize(logoW, logoH).png().toBuffer();
  const bottomH = H - splitY;
  const logoY = Math.round((bottomH - logoH) / 2);

  const bottom = await sharp({
    create: { width: W, height: bottomH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([{ input: logoBuf, top: logoY, left: 0 }])
    .png()
    .toBuffer();

  return sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([
      { input: top, top: 0, left: 0 },
      { input: bottom, top: splitY, left: 0 },
    ])
    .webp({ quality: 95 })
    .toBuffer();
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
  const jsonLen = glbBuf.readUInt32LE(12);
  const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOff = 20 + jsonLen;
  const binStart = binOff + 8;
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
    console.error('computer.glb yok — shader.se indir');
    process.exit(1);
  }
  if (!fs.existsSync(SVG)) {
    console.error('Once generate-logos.js calistir');
    process.exit(1);
  }

  const glb = fs.readFileSync(SRC);
  const tex = await makeLogoTexture(glb);
  const out = patchGlb(glb, tex, LOGO_TEX);
  fs.writeFileSync(OUT, out);
  console.log('Yazildi:', OUT, `(${out.length} byte)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
