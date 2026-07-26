const sharp = require('sharp');

async function makeCert() {
  const srcPath = 'static/textures/footer_certificate.png';
  const { width, height } = await sharp(srcPath).metadata();
  const globeH = Math.round(height * 0.58);
  const globe = await sharp(srcPath)
    .extract({ left: 0, top: 0, width, height: globeH })
    .png()
    .toBuffer();

  const textH = height - globeH + 8;
  const textSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${textH}" viewBox="0 0 ${width} ${textH}">
  <rect width="100%" height="100%" fill="#000"/>
  <text x="50%" y="38%" text-anchor="middle" fill="#fff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="1.5">DÜNYA ÇAPINDA</text>
  <text x="50%" y="78%" text-anchor="middle" fill="#fff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="26" font-weight="700" letter-spacing="1.2">SERTİFİKALI İŞLETME</text>
</svg>`);

  const textPng = await sharp(textSvg).png().toBuffer();
  await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([
      { input: globe, top: 0, left: 0 },
      { input: textPng, top: globeH - 8, left: 0 },
    ])
    .png()
    .toFile('pixela-footer-certificate.png');
  console.log('cert ok', width, height);
}

async function makeA11y() {
  const srcPath = 'static/textures/a11y-statement.png';
  const { width, height } = await sharp(srcPath).metadata();
  const leftW = Math.round(width * 0.22);
  const rightW = Math.round(width * 0.22);
  const left = await sharp(srcPath)
    .extract({ left: 0, top: 0, width: leftW, height })
    .png()
    .toBuffer();
  const right = await sharp(srcPath)
    .extract({ left: width - rightW, top: 0, width: rightW, height })
    .png()
    .toBuffer();

  const midW = width - leftW - rightW;
  const textSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${midW}" height="${height}" viewBox="0 0 ${midW} ${height}">
  <rect width="100%" height="100%" fill="#000"/>
  <text x="50%" y="28%" text-anchor="middle" fill="#fff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1">ERİŞİLEBİLİRLİK</text>
  <text x="50%" y="52%" text-anchor="middle" fill="#fff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1">BİLDİRİMİMİZİ</text>
  <text x="50%" y="76%" text-anchor="middle" fill="#fff" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1">OKUYUN</text>
  <line x1="8%" y1="88%" x2="92%" y2="88%" stroke="#fff" stroke-width="2"/>
</svg>`);
  const textPng = await sharp(textSvg).png().toBuffer();

  await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([
      { input: left, top: 0, left: 0 },
      { input: textPng, top: 0, left: leftW },
      { input: right, top: 0, left: width - rightW },
    ])
    .png()
    .toFile('pixela-a11y-statement.png');
  console.log('a11y ok', width, height);
}

(async () => {
  await makeCert();
  await makeA11y();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
