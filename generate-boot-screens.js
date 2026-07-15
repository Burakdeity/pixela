/** boot_screen — PIXELA marka duzeni */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');
const { getBrand, getTagline } = require('./site-config');

const ROOT = __dirname;
const FONT = path.join(ROOT, 'stix.woff');
const BRAND = getBrand();
const TAGLINE = getTagline();
const SRC_DESKTOP = path.join(ROOT, '_boot_screen.png');
const SRC_MOBILE = path.join(ROOT, '_boot_screen_mobile.png');
const OUT_DESKTOP = path.join(ROOT, 'pixela-boot-screen.png');
const OUT_MOBILE = path.join(ROOT, 'pixela-boot-screen-mobile.png');
const STATIC_TEX = path.join(ROOT, 'static', 'textures');
/** Siyah zemin — loading shader koyu piksellere A=xu(0,0,1) mavi uygular */
const BOOT_BG = { r: 0, g: 0, b: 0, alpha: 1 };

function bootBg() {
  return { ...BOOT_BG };
}

const DESKTOP_ICON_TOP = 40;
const MOBILE_ICON_POS = { left: 36, top: 24 };
const DESKTOP_TITLE_GAP = 10;
const MOBILE_TITLE_GAP = 4;
/** Kaynak PNG'deki SHADER basligi ikon kutusuna tasmamasi icin sag sinir */
const MOBILE_ICON_MAX_X = 102;
const DESKTOP_ICON_MAX_X = 210;
const MOBILE_ICON_MAX_H = 58;
const DESKTOP_ICON_MAX_H = 95;

async function detectIconBox(srcPath, maxRight, maxHeight) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const scanH = Math.min(maxHeight, Math.round(height * 0.28));
  const y0 = Math.max(0, Math.round(height * 0.08));
  const y1 = Math.min(height, y0 + scanH);
  let minX = width;
  let minY = y1;
  let maxX = 0;
  let maxY = 0;
  const limit = Math.min(maxRight, width);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < limit; x++) {
      const i = (y * width + x) * channels;
      const a = data[i + 3];
      const on =
        a > 24 &&
        (data[i] > 24 || data[i + 1] > 24 || data[i + 2] > 24);
      if (on) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX) {
    return { left: 28, top: 24, width: 90, height: 60 };
  }
  const pad = 2;
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.max(1, maxX - minX + 1 + pad * 2),
    height: Math.max(1, maxY - minY + 1 + pad * 2),
  };
}

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
  const patch = await sharp({
    create: { width: w, height: h, channels: 4, background: bootBg() },
  })
    .png()
    .toBuffer();
  return sharp(baseBuf).composite([{ input: patch, left: x, top: y }]).png().toBuffer();
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

async function softWhite(buf) {
  // Antialias alpha koru; sadece RGB'yi beyaza cek
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.min(255, Math.round(a * Math.max(lum, 0.15)));
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Boot shader koyu/seffaf pikselleri yutuyor — alt yazi tam opak beyaz olsun */
async function solidWhite(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    if (a < 20 || lum < 0.12) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = 255;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function renderTitleLayer(font, label, canvasW, canvasH, x, y, maxW, maxH, anchor = 'center') {
  const title = fitTitlePath(font, label, maxW, maxH);
  const tx = anchor === 'left' ? x - title.b.x1 : x - title.w / 2 - title.b.x1;
  const ty = y - title.h / 2 - title.b.y1;
  const svg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)})"><path d="${title.d}" fill="#FFFFFF"/></g>
</svg>`;
  return solidWhite(await sharp(Buffer.from(svg)).png().toBuffer());
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

async function renderTextLayer(font, text, canvasW, canvasH, x, y, size, anchor = 'middle') {
  // Vektor path + 3x supersample — tam opak beyaz (boot shader'da kaybolmasin)
  const scale = 3;
  const p = font.getPath(text, 0, 0, size * scale);
  const b = p.getBoundingBox();
  const w = b.x2 - b.x1;
  const h = b.y2 - b.y1;
  const sx = x * scale;
  const sy = y * scale;
  const tx = anchor === 'middle' || anchor === 'center' ? sx - w / 2 - b.x1 : sx - b.x1;
  const ty = sy - b.y2 + h * 0.2;
  const svg = `<svg width="${canvasW * scale}" height="${canvasH * scale}" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})"><path d="${p.toPathData(2)}" fill="#FFFFFF"/></g>
</svg>`;
  const hi = await solidWhite(await sharp(Buffer.from(svg)).png().toBuffer());
  return sharp(hi).resize(canvasW, canvasH, { kernel: sharp.kernel.nearest }).png().toBuffer();
}

async function buildDesktop(font) {
  const meta = await sharp(SRC_DESKTOP).metadata();
  const W = meta.width;
  const H = meta.height;

  let base = await sharp({
    create: { width: W, height: H, channels: 4, background: bootBg() },
  })
    .png()
    .toBuffer();

  const iconBox = await detectIconBox(SRC_DESKTOP, DESKTOP_ICON_MAX_X, DESKTOP_ICON_MAX_H);
  const titleFit = fitTitlePath(font, BRAND, 400, 72);
  const groupW = iconBox.width + DESKTOP_TITLE_GAP + titleFit.w;
  // Italik yazi optik olarak saga kayar — grubu biraz sola cek
  const opticalNudge = 22;
  const groupLeft = Math.round((W - groupW) / 2) - opticalNudge;
  const iconLeft = groupLeft;
  const titleCenterX = groupLeft + iconBox.width + DESKTOP_TITLE_GAP + titleFit.w / 2;
  const titleY = DESKTOP_ICON_TOP + Math.round(iconBox.height / 2);

  base = await placeIcon(base, SRC_DESKTOP, iconBox, iconLeft, DESKTOP_ICON_TOP);

  const title = await renderTitleLayer(font, BRAND, W, H, titleCenterX, titleY, 400, 72);
  const sub = await renderTextLayer(font, `${BRAND} — ${TAGLINE}`, W, H, W / 2, 168, 20, 'middle');
  const ver = await renderTextLayer(font, 'Sürüm 1.02', W, H, W / 2, 194, 19, 'middle');
  const copy = await renderTextLayer(
    font,
    `Telif Hakkı (c) ${BRAND}, 2026. Tüm Hakları Saklıdır.`,
    W,
    H,
    W / 2,
    372,
    16,
    'middle'
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

  await sharp(base).png().toFile(OUT_DESKTOP);
}

async function buildMobile(font) {
  const meta = await sharp(SRC_MOBILE).metadata();
  const W = meta.width;
  const H = meta.height;

  // Siyah zemin — eski SHADER metni kalintisi birakmamak icin kaynak uzerine boyama yok
  let base = await sharp({
    create: { width: W, height: H, channels: 4, background: bootBg() },
  })
    .png()
    .toBuffer();

  const iconBox = await detectIconBox(SRC_MOBILE, MOBILE_ICON_MAX_X, MOBILE_ICON_MAX_H);

  base = await placeIcon(
    base,
    SRC_MOBILE,
    iconBox,
    MOBILE_ICON_POS.left,
    MOBILE_ICON_POS.top
  );

  const iconRight = MOBILE_ICON_POS.left + iconBox.width;
  const titleLeft = iconRight + MOBILE_TITLE_GAP;
  const titleY = MOBILE_ICON_POS.top + Math.round(iconBox.height / 2);
  const titleMaxW = W - titleLeft - 10;

  const title = await renderTitleLayer(font, BRAND, W, H, titleLeft, titleY, titleMaxW, 50, 'left');
  const sub = await renderTextLayer(font, `${BRAND} — ${TAGLINE}`, W, H, W / 2, 120, 17, 'middle');
  const ver = await renderTextLayer(font, 'Sürüm 1.02', W, H, W / 2, 142, 16, 'middle');
  const copy1 = await renderTextLayer(font, `Telif Hakkı (c) ${BRAND}, 2026.`, W, H, W / 2, 224, 14, 'middle');
  const copy2 = await renderTextLayer(font, 'Tüm Hakları Saklıdır.', W, H, W / 2, 244, 14, 'middle');

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

  await sharp(base).png().toFile(OUT_MOBILE);
}

async function syncStatic() {
  if (!fs.existsSync(STATIC_TEX)) fs.mkdirSync(STATIC_TEX, { recursive: true });
  fs.copyFileSync(OUT_DESKTOP, path.join(STATIC_TEX, 'boot_screen.png'));
  fs.copyFileSync(OUT_MOBILE, path.join(STATIC_TEX, 'boot_screen_mobile.png'));
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
  await syncStatic();
  console.log('Yazildi:', OUT_DESKTOP, OUT_MOBILE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
