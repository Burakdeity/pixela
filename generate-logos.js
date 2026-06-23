/** PIXELA logos — SHADER ile ayni kutu (306x41), STIX italic path */
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const ROOT = __dirname;
const FONT = path.join(ROOT, 'stix.woff');
const LABEL = 'PIXELA';
const BOX_W = 306;
const BOX_H = 41;
const TEXT_X = 88;
const TEXT_W = 305 - TEXT_X;
const BOTTOM = 40;
const HOVER_W = 1285;
const HOVER_H = 173;
const HOVER_SX = HOVER_W / BOX_W;
const HOVER_SY = HOVER_H / BOX_H;

const ICON = `<path d="M45.4013 0C45.0006 0.177515 44.6068 0.369521 44.2205 0.575396C43.961 0.713726 43.7049 0.858323 43.4523 1.009H26.5609C25.8041 1.46054 25.0793 1.96669 24.3913 2.5225H7.49987C6.91806 2.99249 6.36248 3.49799 5.83594 4.036H65.4723C64.3231 2.86172 63.0356 1.84235 61.6389 1.009C61.0104 0.634066 60.3599 0.296788 59.6899 0H45.4013Z" fill="#66C5F1"/>
<path d="M2.78542 8.07246C2.50322 8.56337 2.24009 9.06827 1.99707 9.58596H69.3104C68.6037 8.0807 67.7268 6.68358 66.707 5.42383H38.3833C38.0862 5.79079 37.8013 6.1694 37.5292 6.55895H20.6377C20.2969 7.04678 19.9762 7.55175 19.6769 8.07246H2.78542Z" fill="#D772EC"/>
<path d="M17.8988 12.1078H34.7903C34.9128 11.724 35.0459 11.3455 35.189 10.9727H69.9012C70.4089 12.2952 70.7896 13.6884 71.027 15.1348H0.280273C0.36424 14.6234 0.466078 14.1186 0.585155 13.6213H17.4766C17.5994 13.1086 17.7403 12.6038 17.8988 12.1078Z" fill="#F64F39"/>
<path d="M33.8002 17.6576H16.9088C16.8935 17.9918 16.8857 18.3282 16.8857 18.6666C16.8857 18.8352 16.8876 19.0034 16.8915 19.1711H0C0.0116271 19.6805 0.0407807 20.1852 0.0869454 20.6846H71.2211C71.2824 20.0209 71.3138 19.3477 71.3138 18.6666C71.3138 17.9423 71.2783 17.227 71.2091 16.5225H33.8819C33.845 16.8979 33.8177 17.2763 33.8002 17.6576Z" fill="#FA9D2E"/>
<path d="M0.853516 24.7199C1.00358 25.2336 1.1722 25.7384 1.35858 26.2334H69.9496C70.4478 24.91 70.8193 23.5168 71.0478 22.0713H34.0434C34.1038 22.4534 34.1742 22.8319 34.2543 23.2064H17.3627C17.4722 23.7186 17.6 24.2234 17.745 24.7199H0.853516Z" fill="#FFCE43"/>
<path d="M4.49942 31.7832C4.11321 31.2981 3.74796 30.7931 3.40527 30.2697H20.2968C19.9766 29.7808 19.6762 29.2758 19.3966 28.7562H36.2881C36.0884 28.3852 35.8995 28.0066 35.7217 27.6211H69.3694C68.676 29.1242 67.8135 30.5212 66.8086 31.7832H4.49942Z" fill="#1DCDA1"/>
<path d="M8.87012 35.8195C9.74095 36.4013 10.6593 36.9086 11.6175 37.333H59.6891C61.9013 36.3531 63.9012 34.9317 65.5938 33.1709H39.4957C39.8764 33.5668 40.2725 33.9456 40.683 34.306H23.7916C24.416 34.8543 25.074 35.3601 25.7616 35.8195H8.87012Z" fill="#398AC7"/>`;

function fitText(font, label) {
  for (let size = 42; size >= 14; size -= 0.25) {
    const path = font.getPath(label, 0, 0, size);
    const box = path.getBoundingBox();
    const w = box.x2 - box.x1;
    const sx = TEXT_W / w;
    const ty = BOTTOM - box.y2;
    const top = ty + box.y1;
    if (top >= 0.5 && ty + box.y2 <= 40.5) {
      return { path, box, sx, ty, tx: TEXT_X - box.x1 * sx };
    }
  }
  const path = font.getPath(label, 0, 0, 18);
  const box = path.getBoundingBox();
  const w = box.x2 - box.x1;
  const sx = TEXT_W / w;
  return { path, box, sx, ty: BOTTOM - box.y2, tx: TEXT_X - box.x1 * sx };
}

function textGroup(font, mainFill, shadowFill, shadowOpacity, label) {
  const { path, sx, ty, tx } = fitText(font, label);
  const d = path.toPathData(3);
  const base = `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${sx.toFixed(6)} 1)`;
  return (
    `<g transform="${base}">\n` +
    `<path d="${d}" fill="${shadowFill}" fill-opacity="${shadowOpacity}" transform="translate(0 1)"/>\n` +
    `<path d="${d}" fill="${mainFill}"/>\n` +
    `</g>`
  );
}

function buildSvg(inner, w, h, viewW, viewH) {
  const vw = viewW ?? w;
  const vh = viewH ?? h;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${inner}\n${ICON}\n</svg>`;
}

function buildHoverSvg(inner) {
  return `<svg width="${HOVER_W}" height="${HOVER_H}" viewBox="0 0 ${HOVER_W} ${HOVER_H}" fill="none" xmlns="http://www.w3.org/2000/svg">\n<g transform="scale(${HOVER_SX.toFixed(6)} ${HOVER_SY.toFixed(6)})">\n${inner}\n${ICON}\n</g>\n</svg>`;
}

if (!fs.existsSync(FONT)) {
  console.error('Font yok. Once stix.woff indir.');
  process.exit(1);
}

const fontBuf = fs.readFileSync(FONT);
const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength));

const darkInner = textGroup(font, '#312F2B', '#000000', 0.3, LABEL);
const hoverInner = textGroup(font, '#FCF9F3', '#FFFFFF', 0.3, LABEL);
const glbInner = textGroup(font, '#FCF9F3', '#FFFFFF', 0.3, LABEL);

fs.writeFileSync(path.join(ROOT, 'pixela-logo-dark.svg'), buildSvg(darkInner, BOX_W, BOX_H));
fs.writeFileSync(path.join(ROOT, 'pixela-logo-hover.svg'), buildHoverSvg(hoverInner));
fs.writeFileSync(path.join(ROOT, 'pixela-logo-glb.svg'), buildSvg(glbInner, BOX_W, BOX_H));

const sample = fs.readFileSync(path.join(ROOT, 'pixela-logo-dark.svg'), 'utf8');
if (sample.includes('<text')) {
  console.error('HATA: SVG hala text iceriyor!');
  process.exit(1);
}
console.log('Logolar yenilendi:', ROOT);
