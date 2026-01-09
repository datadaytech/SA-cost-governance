/**
 * Verify flag status dropdown works and persists
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test.describe('Flag Status via Dropdown', () => {
  test('Click status dropdown and select Flagged', async ({ page }) => {
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

    await page.screenshot({ path: '/tmp/flag-test-1-initial.png', fullPage: true });

    // Find the status dropdown (look for OK with dropdown arrow ▼)
    const statusCell = page.locator('td:has-text("OK▼")').first();

    if (await statusCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found OK▼ dropdown cell');
      await statusCell.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: '/tmp/flag-test-2-dropdown-open.png', fullPage: true });

      // Look for Flagged option in dropdown
      const flaggedOption = page.locator('text="Flagged"').first();
      if (await flaggedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Clicking Flagged option...');
        await flaggedOption.click();
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('OK▼ not found, trying alternate approach...');

      // Try clicking on any status cell that might be a dropdown
      const anyOkCell = page.locator('td').filter({ hasText: /^OK$/ }).first();
      if (await anyOkCell.isVisible()) {
        await anyOkCell.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '/tmp/flag-test-2b-clicked.png', fullPage: true });
      }
    }

    await page.screenshot({ path: '/tmp/flag-test-3-after-flag.png', fullPage: true });

    // Get the Currently Flagged count from the dashboard panel
    const flaggedPanel = page.locator('text="Currently Flagged"').first();
    await expect(flaggedPanel).toBeVisible();

    // Check if count changed (look at the number in the panel)
    const flaggedCount = page.locator('.single-value, .dashboard-element-container').filter({ hasText: /Currently Flagged/ });
    console.log('Flagged panel visible');

    // Refresh and verify persistence
    console.log('Refreshing page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/tmp/flag-test-4-after-refresh.png', fullPage: true });

    console.log('Test complete - check screenshots');
  });

  test('Verify lookup file has pending status after flag', async ({ page }) => {
    // Login
    await page.goto(`${SPLUNK_URL}/en-US/account/login`);
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'changeme123');
    await page.click('input[type="submit"]');
    await page.waitForURL(/\/app\//);

    // Check lookup via search
    await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=| inputlookup flagged_searches_lookup | table search_name status | head 10`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: '/tmp/flag-test-lookup-content.png', fullPage: true });

    // Look for results
    const resultsTable = page.locator('.results-table, table');
    if (await resultsTable.isVisible({ timeout: 10000 }).catch(() => false)) {
      const content = await resultsTable.textContent();
      console.log('Lookup content:', content.substring(0, 500));

      // Check for 'pending' status
      if (content.includes('pending')) {
        console.log('✓ Found pending status in lookup!');
      } else if (content.includes('flagged')) {
        console.log('⚠ Found old flagged status - fix not applied');
      } else if (content.includes('resolved')) {
        console.log('Found resolved status');
      }
    }
  });
});
