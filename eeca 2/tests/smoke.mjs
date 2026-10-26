import { chromium } from 'playwright';

const baseURL = process.env.EECA_BASE_URL || 'http://127.0.0.1:49321';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const page = await browser.newPage({ viewportSize: viewport });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').waitFor();
    await page.locator('[data-open="ouvidoriaDialog"]').first().click();
    await page.locator('#ouvidoriaDialog[open]').waitFor();
    await page.locator('#ouvidoriaDialog [data-close]').click();
    await page.locator('#themeToggle').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflow) throw new Error(`Overflow horizontal em ${viewport.width}px.`);
    await page.close();
  }
  if (errors.length) throw new Error(`Erros de página: ${errors.join(' | ')}`);
  console.log('Smoke test concluído em viewport móvel e desktop.');
} finally {
  await browser.close();
}
