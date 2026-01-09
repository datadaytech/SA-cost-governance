/**
 * Final test for flag persistence
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Complete flag workflow: Flag a search and verify persistence', async ({ page }) => {
  test.setTimeout(90000);

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

  // Take initial screenshot
  await page.screenshot({ path: '/tmp/final-flag-1-initial.png', fullPage: true });

  // Count initial statuses
  let okCount = await page.locator('td').filter({ hasText: /^OK$/ }).count();
  let flaggedCount = await page.locator('td').filter({ hasText: /^Flagged$/ }).count();
  console.log(`STEP 1 - INITIAL: OK=${okCount}, Flagged=${flaggedCount}`);

  // Get the "Currently Flagged" metric panel value
  const flaggedMetric = page.locator('.single-result').filter({ hasText: /Currently Flagged/ });
  if (await flaggedMetric.isVisible({ timeout: 5000 }).catch(() => false)) {
    const metricText = await flaggedMetric.textContent();
    console.log(`Currently Flagged metric panel: ${metricText}`);
  }

  // Click on first OK cell
  const okCell = page.locator('td').filter({ hasText: /^OK$/ }).first();
  if (await okCell.isVisible({ timeout: 5000 })) {
    const row = okCell.locator('xpath=ancestor::tr');
    const rowText = await row.textContent();
    console.log(`STEP 2 - Clicking row: ${rowText.substring(0, 100)}...`);

    await okCell.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/final-flag-2-clicked.png', fullPage: true });

    // Click Flag button
    const flagBtn = page.locator('button:has-text("Flag")').first();
    if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('STEP 3 - Clicking Flag button...');
      await flagBtn.click();
      await page.waitForTimeout(5000);
      console.log('STEP 3 - Flag button clicked, waiting for update...');
    }
  }

  await page.screenshot({ path: '/tmp/final-flag-3-after-flag.png', fullPage: true });

  // Check counts after flagging (same session)
  okCount = await page.locator('td').filter({ hasText: /^OK$/ }).count();
  flaggedCount = await page.locator('td').filter({ hasText: /^Flagged$/ }).count();
  console.log(`STEP 4 - SAME SESSION: OK=${okCount}, Flagged=${flaggedCount}`);

  // Refresh page
  console.log('STEP 5 - Refreshing page...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/final-flag-4-after-refresh.png', fullPage: true });

  // Check counts after refresh
  okCount = await page.locator('td').filter({ hasText: /^OK$/ }).count();
  flaggedCount = await page.locator('td').filter({ hasText: /^Flagged$/ }).count();
  console.log(`STEP 6 - AFTER REFRESH: OK=${okCount}, Flagged=${flaggedCount}`);

  // Verify persistence - there should be at least 1 flagged
  expect(flaggedCount).toBeGreaterThan(0);
  console.log('✓ Flag persistence verified!');
});
