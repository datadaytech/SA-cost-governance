/**
 * Test flag fix with cache busting
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Test flag status persistence with fix', async ({ browser }) => {
  // Create fresh context with no cache
  const context = await browser.newContext({
    bypassCSP: true,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Login
  await page.goto(`${SPLUNK_URL}/en-US/account/login`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'changeme123');
  await page.click('input[type="submit"]');
  await page.waitForURL(/\/app\//);

  // Go to governance page with cache busting
  await page.goto(GOVERNANCE_PAGE + '?_=' + Date.now());
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Check initial counts
  let okCount = await page.locator('td:has-text("OK")').count();
  let flaggedCount = await page.locator('text=/Flagged|Pending/').count();
  console.log(`BEFORE: OK=${okCount}, Flagged=${flaggedCount}`);

  // Click on a dropdown to flag
  const statusDropdown = page.locator('td:has-text("OK")').first();
  await statusDropdown.click();
  await page.waitForTimeout(1000);

  // Screenshot after click
  await page.screenshot({ path: '/tmp/after-click-dropdown.png' });

  // Look for Flagged option in dropdown
  const flaggedOption = page.locator('text="Flagged"').first();
  if (await flaggedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found Flagged option, clicking...');
    await flaggedOption.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('Looking for Flag button instead...');
    const flagBtn = page.locator('button:has-text("Flag")').first();
    if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await flagBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  // Check counts after flagging (same session)
  okCount = await page.locator('td:has-text("OK")').count();
  flaggedCount = await page.locator('text="Flagged"').count();
  console.log(`AFTER FLAG (same session): OK=${okCount}, Flagged=${flaggedCount}`);

  await page.screenshot({ path: '/tmp/after-flag-fix.png' });

  // Refresh page
  console.log('Refreshing page...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Check counts after refresh
  okCount = await page.locator('td:has-text("OK")').count();
  flaggedCount = await page.locator('text="Flagged"').count();
  console.log(`AFTER REFRESH: OK=${okCount}, Flagged=${flaggedCount}`);

  await page.screenshot({ path: '/tmp/after-refresh-fix.png' });

  // Check lookup file content
  const lookupContent = await page.evaluate(async () => {
    const res = await fetch('/en-US/splunkd/__raw/services/data/lookup-table-files/flagged_searches.csv/governance_flagged_searches?output_mode=raw&ns=SA-cost-governance', {
      credentials: 'include'
    });
    return await res.text();
  });
  console.log('Lookup file excerpt:', lookupContent.substring(0, 500));

  await context.close();
});
