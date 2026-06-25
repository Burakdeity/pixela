const sharp = require('sharp');
const path = require('path');

async function sample(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const pts = [
    [5, 5],
    [10, 130],
    [180, 200],
    [350, 250],
  ];
  console.log('\n' + path.basename(file));
  for (const [x, y] of pts) {
    const i = (y * info.width + x) * info.channels;
    console.log(`  (${x},${y})`, data[i], data[i + 1], data[i + 2]);
  }
}

(async () => {
  await sample(path.join(__dirname, '_boot_screen_mobile.png'));
  await sample(path.join(__dirname, 'pixela-boot-screen-mobile.png'));
})();
