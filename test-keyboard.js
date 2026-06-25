const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://127.0.0.1:8888/', { waitUntil: 'networkidle', timeout: 90000 });
  for (let i = 0; i < 15; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-hero-scroll.png' });
  await browser.close();
})();
