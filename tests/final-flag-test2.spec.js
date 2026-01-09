/**
 * Final test for flag persistence - using Flag This Search button
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Complete flag workflow: Flag a search using Flag This Search', async ({ page }) => {
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
  await page.screenshot({ path: '/tmp/final2-flag-1-initial.png', fullPage: true });

  // Count initial statuses
  let okCount = await page.locator('td').filter({ hasText: /^OK$/ }).count();
  let flaggedCount = await page.locator('td').filter({ hasText: /^Flagged$/ }).count();
  console.log(`STEP 1 - INITIAL: OK=${okCount}, Flagged=${flaggedCount}`);

  // Click on a row in the "All Scheduled Searches" table to select it
  const allSearchesTable = page.locator('table').last();
  const okRow = allSearchesTable.locator('tr:has(td:has-text("OK"))').first();

  if (await okRow.isVisible({ timeout: 5000 })) {
    console.log('STEP 2 - Found row with OK status, clicking...');
    await okRow.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/final2-flag-2-selected.png', fullPage: true });

    // Look for "Flag This Search" button specifically
    const flagThisBtn = page.locator('button:has-text("Flag This Search"), #flag-this-btn');
    if (await flagThisBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('STEP 3 - Clicking "Flag This Search" button...');
      await flagThisBtn.click();
      await page.waitForTimeout(2000);

      // Check for confirm dialog
      page.on('dialog', dialog => {
        console.log('Dialog: ' + dialog.message());
        dialog.accept();
      });

      await page.waitForTimeout(5000);
      console.log('STEP 3 - Flag This Search clicked');
    } else {
      // Try clicking checkbox and then Flag Selected
      console.log('STEP 3 - Flag This Search not found, trying checkbox approach...');

      const checkbox = okRow.locator('input[type="checkbox"]');
      if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await checkbox.click();
        await page.waitForTimeout(1000);
        console.log('Clicked checkbox');

        const flagSelectedBtn = page.locator('button:has-text("Flag Selected")').first();
        if (await flagSelectedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('Clicking Flag Selected button...');
          await flagSelectedBtn.click();
          await page.waitForTimeout(5000);
        }
      }
    }
  }

  await page.screenshot({ path: '/tmp/final2-flag-3-after-flag.png', fullPage: true });

  // Check counts after flagging (same session)
  okCount = await page.locator('td').filter({ hasText: /^OK$/ }).count();
  flaggedCount = await page.locator('td').filter({ hasText: /^Flagged$/ }).count();
  console.log(`STEP 4 - SAME SESSION: OK=${okCount}, Flagged=${flaggedCount}`);

  // Refresh page
  console.log('STEP 5 - Refreshing page...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/final2-flag-4-after-refresh.png', fullPage: true });

  // Check counts after refresh
  okCount = await page.locator('td').filter({ hasText: /^OK$/ }).count();
  flaggedCount = await page.locator('td').filter({ hasText: /^Flagged$/ }).count();
  console.log(`STEP 6 - AFTER REFRESH: OK=${okCount}, Flagged=${flaggedCount}`);

  // Verify persistence - there should be at least 1 flagged
  expect(flaggedCount).toBeGreaterThan(0);
  console.log('✓ Flag persistence verified!');
});
