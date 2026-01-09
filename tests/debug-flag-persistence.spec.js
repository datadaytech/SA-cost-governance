/**
 * Debug Flag Persistence - Detailed investigation
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Debug: Detailed flag persistence check', async ({ page }) => {
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

  // Count initial statuses
  let okCount = await page.locator('td:has-text("OK")').count();
  let flaggedCount = await page.locator('td:has-text("Flagged")').count();
  console.log(`BEFORE FLAG - OK: ${okCount}, Flagged: ${flaggedCount}`);

  // Find and record the search name we're flagging
  const firstOkCell = page.locator('td:has-text("OK")').first();
  const row = firstOkCell.locator('xpath=ancestor::tr');
  const cells = await row.locator('td').allTextContents();
  console.log(`Row to flag: ${cells.join(' | ')}`);

  // Click to flag
  await firstOkCell.click();
  await page.waitForTimeout(2000);

  // Screenshot the modal/popup
  await page.screenshot({ path: '/tmp/debug-flag-modal.png', fullPage: true });

  // Look for flag button and click it
  const flagBtn = page.locator('button:has-text("Flag")').first();
  if (await flagBtn.isVisible({ timeout: 3000 })) {
    console.log('Clicking Flag button...');
    await flagBtn.click();
    await page.waitForTimeout(3000);
  }

  // Check for toast/success message
  const toast = page.locator('.toast, .message, [class*="success"], div:has-text("flagged")').first();
  if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log(`Toast message: ${await toast.textContent()}`);
  }

  // Count after flagging (same session)
  okCount = await page.locator('td:has-text("OK")').count();
  flaggedCount = await page.locator('td:has-text("Flagged")').count();
  console.log(`AFTER FLAG (same session) - OK: ${okCount}, Flagged: ${flaggedCount}`);

  await page.screenshot({ path: '/tmp/debug-after-flag.png', fullPage: true });

  // Check the lookup file via REST API
  console.log('Checking lookup file via API...');
  const response = await page.evaluate(async () => {
    const res = await fetch('/en-US/splunkd/__raw/servicesNS/nobody/SA-cost-governance/data/lookup-table-files/flagged_searches.csv?output_mode=json', {
      credentials: 'include'
    });
    return { status: res.status, text: await res.text() };
  });
  console.log(`Lookup API response: ${response.status}`);
  console.log(`Lookup content: ${response.text.substring(0, 500)}...`);

  // Wait a bit more then refresh
  console.log('Waiting 5 seconds then refreshing...');
  await page.waitForTimeout(5000);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Count after refresh
  okCount = await page.locator('td:has-text("OK")').count();
  flaggedCount = await page.locator('td:has-text("Flagged")').count();
  console.log(`AFTER REFRESH - OK: ${okCount}, Flagged: ${flaggedCount}`);

  await page.screenshot({ path: '/tmp/debug-after-refresh.png', fullPage: true });

  // Check if we see the same row
  const allRows = await page.locator('table tbody tr').allTextContents();
  console.log(`Total rows: ${allRows.length}`);
});
