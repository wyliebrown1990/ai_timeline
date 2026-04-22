import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

console.log('=== PRODUCTION FEED TEST ===\n');

console.log('1. Navigating to https://letaiexplainai.com/feed ...');
await page.goto('https://letaiexplainai.com/feed', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

// Take initial screenshot
await page.screenshot({ path: '/tmp/prod-feed-1.png', fullPage: false });
console.log('   Screenshot: /tmp/prod-feed-1.png');

console.log('\n2. Checking core elements...');
const exitButton = await page.$('button[aria-label="Exit feed"]');
console.log('   ✓ Exit button:', !!exitButton);

const posText = await page.locator('div.absolute.top-4.right-4').first().textContent().catch(() => 'Not found');
console.log('   ✓ Position:', posText);

const headline = await page.$eval('h1', el => el.textContent).catch(() => null);
console.log('   ✓ Headline:', headline ? headline.substring(0, 50) + '...' : 'Not found');

// Check for progress tracker
const progressText = await page.$eval('.z-40', el => el.textContent).catch(() => null);
console.log('   ✓ Progress tracker:', progressText ? progressText.substring(0, 30) : 'Not found');

// Dismiss swipe hint
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(500);

console.log('\n3. Testing navigation...');
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(800);
  const pos = await page.locator('div.absolute.top-4.right-4').first().textContent().catch(() => '');
  console.log('   Arrow Down -> Position:', pos);
}

await page.screenshot({ path: '/tmp/prod-feed-2.png', fullPage: false });
console.log('   Screenshot: /tmp/prod-feed-2.png');

console.log('\n4. Testing horizontal swipe (save)...');
const viewport = page.viewportSize();
const centerX = viewport.width / 2;
const centerY = viewport.height / 2;

await page.mouse.move(centerX, centerY);
await page.mouse.down();
await page.mouse.move(centerX + 120, centerY, { steps: 10 });
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/prod-swipe-right.png' });
console.log('   Screenshot during swipe: /tmp/prod-swipe-right.png');
await page.mouse.up();
await page.waitForTimeout(500);

console.log('\n5. Checking for errors...');
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
await page.waitForTimeout(1000);
console.log('   Console errors:', consoleErrors.length === 0 ? 'None' : consoleErrors.slice(0,3).join('; '));

await browser.close();
console.log('\n=== TEST COMPLETE ===');
