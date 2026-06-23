/** boot_screen — orijinal PNG uzerinde SHADER metinlerini PIXELA ile degistir (piksel stili korunur) */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

const ROOT = __dirname;
const FONT = path.join(ROOT, 'stix.woff');
const BRAND = 'PIXELA';
const SRC_DESKTOP = path.join(ROOT, '_boot_screen.png');
const SRC_MOBILE = path.join(ROOT, '_boot_screen_mobile.png');
const OUT_DESKTOP = path.join(ROOT, 'pixela-boot-screen.png');
const OUT_MOBILE = path.join(ROOT, 'pixela-boot-screen-mobile.png');

/** Renkli yuvarlak ikon — CRT shader bunu gokkusagi cizgilerle boyar */
const ICON_COLORS = {
  stripe1: '#66C5F1',
  stripe2: '#D772EC',
  stripe3: '#F64F39',
  stripe4: '#FA9D2E',
  stripe5: '#FFCE43',
  stripe6: '#1DCDA1',
  stripe7: '#398AC7',
};

const DESKTOP_ICON_SRC = { left: 40, top: 40, width: 150, height: 85 };
const DESKTOP_ICON_POS = { left: 68, top: 40 };
const MOBILE_ICON_SRC = { left: 28, top: 24, width: 175, height: 65 };
const MOBILE_ICON_POS = { left: 42, top: 24 };

async function whiteMask(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const on = lum > 128 && data[i + 3] > 128;
    data[i] = data[i + 1] = data[i + 2] = on ? 255 : 0;
    data[i + 3] = on ? 255 : 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function eraseRect(baseBuf, x, y, w, h) {
  const black = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toBuffer();
  return sharp(baseBuf).composite([{ input: black, left: x, top: y }]).png().toBuffer();
}

async function placeIcon(baseBuf, srcBuf, srcBox, destLeft, destTop) {
  const icon = await sharp(srcBuf).extract(srcBox).png().toBuffer();
  return sharp(baseBuf).composite([{ input: icon, left: destLeft, top: destTop }]).png().toBuffer();
}

function fitTitlePath(font, label, maxW, maxH) {
  for (let size = 110; size >= 20; size -= 0.5) {
    const p = font.getPath(label, 0, 0, size);
    const b = p.getBoundingBox();
    const w = b.x2 - b.x1;
    const h = b.y2 - b.y1;
    if (w <= maxW && h <= maxH) return { d: p.toPathData(3), w, h, b, size };
  }
  const p = font.getPath(label, 0, 0, 20);
  const b = p.getBoundingBox();
  return { d: p.toPathData(3), w: b.x2 - b.x1, h: b.y2 - b.y1, b, size: 20 };
}

async function renderTitleLayer(font, label, canvasW, canvasH, cx, cy, maxW, maxH) {
  const title = fitTitlePath(font, label, maxW, maxH);
  const tx = cx - title.w / 2 - title.b.x1;
  const ty = cy - title.h / 2 - title.b.y1;
  const svg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)})"><path d="${title.d}" fill="#FFFFFF"/></g>
</svg>`;
  return whiteMask(await sharp(Buffer.from(svg)).png().toBuffer());
}

async function renderMonoLayer(text, canvasW, canvasH, x, y, size, anchor = 'middle') {
  const svg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
<text x="${x}" y="${y}" fill="#FFFFFF" font-family="'Courier New', Courier, monospace" font-size="${size}" font-weight="700" text-anchor="${anchor}">${text}</text>
</svg>`;
  return whiteMask(await sharp(Buffer.from(svg)).png().toBuffer());
}

async function buildDesktop(font) {
  const meta = await sharp(SRC_DESKTOP).metadata();
  let base = await sharp(SRC_DESKTOP).png().toBuffer();

  // SHADER basligi (ikonun sagindaki metin) + alt metin + telif — ikon bolgesine dokunma
  base = await eraseRect(base, 200, 44, 430, 76);
  base = await eraseRect(base, 180, 155, 360, 16);
  base = await eraseRect(base, 280, 174, 160, 12);
  base = await eraseRect(base, 0, 358, meta.width, 16);

  const title = await renderTitleLayer(font, BRAND, meta.width, meta.height, 408, 82, 400, 72);
  const sub = await renderMonoLayer(
    `${BRAND} Geliştirme Stüdyosu, Web Sitesi`,
    meta.width,
    meta.height,
    360,
    166,
    13
  );
  const ver = await renderMonoLayer('Sürüm 1.02', meta.width, meta.height, 360, 182, 13);
  const copy = await renderMonoLayer(
    `Telif Hakkı (c) ${BRAND} Geliştirme Stüdyosu AB, 2026. Tüm Hakları Saklıdır.`,
    meta.width,
    meta.height,
    360,
    370,
    10
  );

  base = await sharp(base)
    .composite([
      { input: title, blend: 'over' },
      { input: sub, blend: 'over' },
      { input: ver, blend: 'over' },
      { input: copy, blend: 'over' },
    ])
    .png()
    .toBuffer();

  base = await eraseRect(base, DESKTOP_ICON_SRC.left, DESKTOP_ICON_SRC.top, DESKTOP_ICON_SRC.width, DESKTOP_ICON_SRC.height);
  base = await placeIcon(base, SRC_DESKTOP, DESKTOP_ICON_SRC, DESKTOP_ICON_POS.left, DESKTOP_ICON_POS.top);
  await sharp(base).png().toFile(OUT_DESKTOP);
}

async function buildMobile(font) {
  const meta = await sharp(SRC_MOBILE).metadata();
  let base = await sharp(SRC_MOBILE).png().toBuffer();

  base = await eraseRect(base, 198, 30, 130, 55);
  base = await eraseRect(base, 60, 108, 240, 12);
  base = await eraseRect(base, 110, 122, 140, 10);
  base = await eraseRect(base, 0, 218, meta.width, 28);

  const title = await renderTitleLayer(font, BRAND, meta.width, meta.height, 248, 57, 120, 44);
  const sub = await renderMonoLayer(`${BRAND} Geliştirme Stüdyosu`, meta.width, meta.height, 180, 116, 10);
  const ver = await renderMonoLayer('Sürüm 1.02', meta.width, meta.height, 180, 130, 10);
  const copy1 = await renderMonoLayer(`Telif Hakkı (c) ${BRAND} AB, 2026.`, meta.width, meta.height, 180, 228, 9);
  const copy2 = await renderMonoLayer('Tüm Hakları Saklıdır.', meta.width, meta.height, 180, 240, 9);

  base = await sharp(base)
    .composite([
      { input: title, blend: 'over' },
      { input: sub, blend: 'over' },
      { input: ver, blend: 'over' },
      { input: copy1, blend: 'over' },
      { input: copy2, blend: 'over' },
    ])
    .png()
    .toBuffer();

  base = await eraseRect(base, MOBILE_ICON_SRC.left, MOBILE_ICON_SRC.top, MOBILE_ICON_SRC.width, MOBILE_ICON_SRC.height);
  base = await placeIcon(base, SRC_MOBILE, MOBILE_ICON_SRC, MOBILE_ICON_POS.left, MOBILE_ICON_POS.top);
  await sharp(base).png().toFile(OUT_MOBILE);
}

async function main() {
  if (!fs.existsSync(FONT) || !fs.existsSync(SRC_DESKTOP) || !fs.existsSync(SRC_MOBILE)) {
    console.error('stix.woff ve _boot_screen*.png gerekli');
    process.exit(1);
  }
  const fontBuf = fs.readFileSync(FONT);
  const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength));
  await buildDesktop(font);
  await buildMobile(font);
  console.log('Yazildi:', OUT_DESKTOP, OUT_MOBILE);
  console.log('Ikon renkleri (nav logo ile ayni):', ICON_COLORS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
