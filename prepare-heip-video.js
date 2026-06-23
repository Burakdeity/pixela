/**
 * HEIP onizleme videosu — ustten tarayici chrome kirp, yerel MP4 uret.
 * Kaynak: Pictures klasorundeki Trim.mp4
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static');

const ROOT = path.join(__dirname);
const SOURCE = path.join(
  process.env.USERPROFILE,
  'Pictures',
  'Sakarya Klima _ Montaj, Bakım, Tamir _ Lider Teknik Sakarya - Google Chrome 2026-06-23 17-28-16 - Trim.mp4'
);
const OUT = path.join(ROOT, 'videos', 'heip-lider-teknik.mp4');
const OUT_TMP = path.join(ROOT, 'videos', 'heip-lider-teknik.tmp.mp4');

/** Tarayici sekmeleri + adres cubugunu kirp; site basligi (beyaz nav) ustten baslar */
const CROP_TOP = 122;

function probe(file) {
  const json = execFileSync(
    ffprobe.path,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,duration',
      '-of',
      'json',
      file,
    ],
    { encoding: 'utf8' }
  );
  const stream = JSON.parse(json).streams[0];
  return { width: stream.width, height: stream.height, duration: stream.duration };
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Kaynak video bulunamadi:', SOURCE);
    process.exit(1);
  }
  if (!ffmpeg) {
    console.error('ffmpeg-static yok');
    process.exit(1);
  }

  const { width, height } = probe(SOURCE);
  const cropH = height - CROP_TOP;
  if (cropH < 200) {
    console.error('Kirpma sonrasi yukseklik cok kucuk:', cropH);
    process.exit(1);
  }

  const evenW = width % 2 === 0 ? width : width - 1;
  const evenH = cropH % 2 === 0 ? cropH : cropH - 1;

  console.log(`Kaynak: ${width}x${height}, kirp: ust ${CROP_TOP}px -> ${evenW}x${evenH}`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i',
      SOURCE,
      '-vf',
      `crop=${evenW}:${evenH}:0:${CROP_TOP}`,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      OUT_TMP,
    ],
    { stdio: 'inherit' }
  );

  fs.copyFileSync(OUT_TMP, OUT);
  try {
    fs.unlinkSync(OUT_TMP);
  } catch (_) {}
  const outInfo = probe(OUT);
  console.log('Tamam:', OUT, `${outInfo.width}x${outInfo.height}`, `${Number(outInfo.duration).toFixed(1)}s`);

  const POSTER = path.join(ROOT, 'videos', 'heip-poster.jpg');
  execFileSync(
    ffmpeg,
    ['-y', '-ss', '2', '-i', OUT, '-frames:v', '1', '-q:v', '2', POSTER],
    { stdio: 'inherit' }
  );
  console.log('Poster:', POSTER);
}

main();
