/** shredder.glb — shader-logo (splash) + beige-logo (klavye rozeti) → PIXELA */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'shredder.glb');
const OUT = path.join(ROOT, 'shredder-pixela.glb');
const SVG = path.join(ROOT, 'pixela-logo-glb.svg');

const SPLASH_W = 1024;
const SPLASH_H = 290;
const SPLASH_TEX = 1;

/** Klavye rozeti — dikey SHADER harfleri tamamen sil (y≈242-682) */
const BEIGE_TEXT = { left: 88, top: 242, width: 150, height: 440 };
const BEIGE_TEX = 0;

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

async function makeBeigeTexture(glbBuf) {
  const { binStart, json } = parseGlb(glbBuf);
  const bv = json.bufferViews[json.images[BEIGE_TEX].bufferView];
  const oldWebp = glbBuf.slice(binStart + bv.byteOffset, binStart + bv.byteOffset + bv.byteLength);

  const black = await sharp({
    create: {
      width: BEIGE_TEXT.width,
      height: BEIGE_TEXT.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const logo = await sharp(SVG).resize(420, 54).png().toBuffer();
  const vertLogo = await sharp(logo)
    .rotate(90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(BEIGE_TEXT.width, BEIGE_TEXT.height, {
      fit: 'contain',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp(oldWebp)
    .composite([
      { input: black, left: BEIGE_TEXT.left, top: BEIGE_TEXT.top },
      { input: vertLogo, left: BEIGE_TEXT.left, top: BEIGE_TEXT.top, blend: 'over' },
    ])
    .webp({ quality: 92 })
    .toBuffer();
}

function parseGlb(glbBuf) {
  const jsonLen = glbBuf.readUInt32LE(12);
  const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOff = 20 + jsonLen;
  const binStart = binOff + 8;
  return { json, binStart };
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
  const { json, binStart } = parseGlb(glbBuf);
  const binLen = glbBuf.readUInt32LE(20 + glbBuf.readUInt32LE(12));
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
    console.error('shredder.glb yok:', SRC);
    process.exit(1);
  }
  if (!fs.existsSync(SVG)) {
    console.error('Once generate-logos.js calistir (pixela-logo-glb.svg)');
    process.exit(1);
  }

  const glb = fs.readFileSync(SRC);
  const beigeTex = await makeBeigeTexture(glb);
  const splashTex = await makeSplashTexture();

  let out = patchGlb(glb, beigeTex, BEIGE_TEX);
  out = patchGlb(out, splashTex, SPLASH_TEX);

  fs.writeFileSync(OUT, out);
  console.log('Yazildi:', OUT);
  console.log('  beige-logo (klavye):', beigeTex.length, 'byte');
  console.log('  shader-logo (splash):', splashTex.length, 'byte');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
