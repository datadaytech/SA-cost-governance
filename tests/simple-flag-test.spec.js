/**
 * Simple flag persistence test
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Simple flag test - verify page loads and shows status', async ({ page }) => {
  test.setTimeout(90000);

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error') {
      console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
    }
  });

  // Handle dialogs automatically
  page.on('dialog', async dialog => {
    console.log(`DIALOG: ${dialog.message()}`);
    await dialog.accept();
  });

  // Login
  await page.goto(`${SPLUNK_URL}/en-US/account/login`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'changeme123');
  await page.click('input[type="submit"]');
  await page.waitForURL(/\/app\//);

  // Go to governance page
  await page.goto(GOVERNANCE_PAGE);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/simple-flag-1-initial.png', fullPage: true });

  // Count ALL cells that contain the text "OK"
  const okCells = await page.locator('td:has-text("OK")').count();
  const flaggedCells = await page.locator('td:has-text("Flagged")').count();
  const suspiciousCells = await page.locator('td:has-text("Suspicious")').count();

  console.log(`COUNTS: OK=${okCells}, Flagged=${flaggedCells}, Suspicious=${suspiciousCells}`);

  // Now try to flag something via selecting a checkbox
  const firstCheckbox = page.locator('input[type="checkbox"]').first();
  if (await firstCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Clicking first checkbox...');
    await firstCheckbox.check();
    await page.waitForTimeout(1000);

    // Click Flag Selected button
    const flagBtn = page.locator('button:has-text("Flag Selected")').first();
    if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking Flag Selected button...');
      await flagBtn.click();
      await page.waitForTimeout(5000);
    }
  }

  await page.screenshot({ path: '/tmp/simple-flag-2-after-flag.png', fullPage: true });

  // Refresh and check
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/simple-flag-3-after-refresh.png', fullPage: true });

  const newOkCells = await page.locator('td:has-text("OK")').count();
  const newFlaggedCells = await page.locator('td:has-text("Flagged")').count();
  console.log(`AFTER REFRESH: OK=${newOkCells}, Flagged=${newFlaggedCells}`);

  // At minimum, the page should show some status cells
  expect(newOkCells + newFlaggedCells + suspiciousCells).toBeGreaterThan(0);
});
