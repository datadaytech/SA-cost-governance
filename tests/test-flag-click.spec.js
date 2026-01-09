/**
 * Test clicking to flag a search and verify lookup update
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Click to flag a search and verify lookup', async ({ page }) => {
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
  await page.screenshot({ path: '/tmp/test-flag-1-initial.png', fullPage: true });

  // Find first OK cell and click it
  const okCell = page.locator('td:has-text("OK")').first();
  if (await okCell.isVisible({ timeout: 5000 })) {
    const row = okCell.locator('xpath=ancestor::tr');
    const searchName = await row.locator('td').nth(0).textContent();
    console.log('Found OK search:', searchName);

    await okCell.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/test-flag-2-clicked.png', fullPage: true });

    // Look for any modal or button
    const allButtons = await page.locator('button').allTextContents();
    console.log('Available buttons:', allButtons.filter(b => b.trim()).join(', '));

    // Click Flag button
    const flagBtn = page.locator('button:has-text("Flag")').first();
    if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking Flag button...');
      await flagBtn.click();
      await page.waitForTimeout(5000);

      await page.screenshot({ path: '/tmp/test-flag-3-after-flag.png', fullPage: true });
    } else {
      console.log('No Flag button found');
    }
  }

  // Check lookup via search API
  const lookupData = await page.evaluate(async () => {
    const res = await fetch('/en-US/splunkd/__raw/services/search/jobs?output_mode=json', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'search=' + encodeURIComponent('| inputlookup flagged_searches_lookup | table search_name status | head 20') +
            '&earliest_time=-1h&latest_time=now&exec_mode=oneshot&output_mode=json'
    });
    return await res.json();
  });
  console.log('Lookup data:', JSON.stringify(lookupData, null, 2).substring(0, 1000));

  // Reload and check
  console.log('Reloading page...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/test-flag-4-after-reload.png', fullPage: true });

  // Check counts
  const okCount = await page.locator('td:has-text("OK")').count();
  const flaggedCount = await page.locator('text="Flagged"').count();
  console.log(`After reload - OK: ${okCount}, Flagged: ${flaggedCount}`);
});
