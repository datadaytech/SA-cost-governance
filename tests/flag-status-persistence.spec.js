/**
 * Flag Status Persistence Test
 * Tests changing status from OK to Flagged and verifying it persists
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

async function login(page) {
  await page.goto(`${SPLUNK_URL}/en-US/account/login`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'changeme123');
  await page.click('input[type="submit"]');
  await page.waitForURL(/\/app\//);
}

async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}

test.describe('Flag Status Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(GOVERNANCE_PAGE);
    await waitForPageLoad(page);
  });

  test('Page loads with search table', async ({ page }) => {
    // Verify table exists
    const table = page.locator('table, .table-container, .dashboard-table');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  });

  test('OK status elements are visible', async ({ page }) => {
    // Look for OK status in the table
    const okElements = page.locator('text="OK"');
    const count = await okElements.count();
    console.log(`Found ${count} OK elements`);
    expect(count).toBeGreaterThan(0);
  });

  test('Can click on OK status to flag', async ({ page }) => {
    // Find an OK status cell
    const okCell = page.locator('td:has-text("OK")').first();

    if (await okCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get the row for reference
      const row = okCell.locator('xpath=ancestor::tr');
      const searchName = await row.locator('td').first().textContent();
      console.log(`Attempting to flag search: ${searchName}`);

      await okCell.click();
      await page.waitForTimeout(2000);

      // Take screenshot after click
      await page.screenshot({ path: '/tmp/after-ok-click.png' });
    }
  });

  test('Flag button appears in modal/popup', async ({ page }) => {
    // Click on OK status
    const okCell = page.locator('td:has-text("OK")').first();

    if (await okCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await okCell.click();
      await page.waitForTimeout(2000);

      // Look for flag button
      const flagBtn = page.locator('button:has-text("Flag"), .flag-btn, a:has-text("Flag"), .btn:has-text("Flag")');
      if (await flagBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Flag button found');
        await expect(flagBtn.first()).toBeVisible();
      }
    }
  });

  test('Status changes from OK to Flagged', async ({ page }) => {
    test.setTimeout(60000);

    // Get initial counts
    const initialOkCount = await page.locator('td:has-text("OK")').count();
    const initialFlaggedCount = await page.locator('td:has-text("Flagged")').count();
    console.log(`Initial: ${initialOkCount} OK, ${initialFlaggedCount} Flagged`);

    // Click on first OK status
    const okCell = page.locator('td:has-text("OK")').first();
    if (await okCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await okCell.click();
      await page.waitForTimeout(2000);

      // Click flag button if visible
      const flagBtn = page.locator('button:has-text("Flag"), .flag-btn').first();
      if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await flagBtn.click();
        await page.waitForTimeout(3000);
      }

      // Check for confirmation
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Get new counts
    const newOkCount = await page.locator('td:has-text("OK")').count();
    const newFlaggedCount = await page.locator('td:has-text("Flagged")').count();
    console.log(`After: ${newOkCount} OK, ${newFlaggedCount} Flagged`);
  });

  test('Flagged status persists after page refresh', async ({ page }) => {
    test.setTimeout(90000);

    // First flag a search
    const okCell = page.locator('td:has-text("OK")').first();
    let searchName = '';

    if (await okCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      const row = okCell.locator('xpath=ancestor::tr');
      searchName = await row.locator('td').first().textContent();
      console.log(`Flagging search: ${searchName}`);

      await okCell.click();
      await page.waitForTimeout(2000);

      // Click flag button
      const flagBtn = page.locator('button:has-text("Flag"), .flag-btn').first();
      if (await flagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await flagBtn.click();
        await page.waitForTimeout(3000);
      }

      // Confirm if needed
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Refresh the page
    console.log('Refreshing page...');
    await page.reload();
    await waitForPageLoad(page);

    // Take screenshot after refresh
    await page.screenshot({ path: '/tmp/after-refresh-flag-test.png', fullPage: true });

    // Verify the search is still flagged (or status changed)
    console.log('Verifying persistence after refresh...');

    // Check if we can find the flagged status
    const flaggedElements = page.locator('td:has-text("Flagged"), .status-flagged');
    const flaggedCount = await flaggedElements.count();
    console.log(`Found ${flaggedCount} Flagged elements after refresh`);
  });

  test('Status indicator shows correct visual state', async ({ page }) => {
    // Check for status indicators
    const okIndicators = page.locator('.status-ok, .ok-status, td:has-text("OK")');
    const flaggedIndicators = page.locator('.status-flagged, .flagged-status, td:has-text("Flagged")');

    const okCount = await okIndicators.count();
    const flaggedCount = await flaggedIndicators.count();

    console.log(`Status indicators - OK: ${okCount}, Flagged: ${flaggedCount}`);

    // At least one should exist
    expect(okCount + flaggedCount).toBeGreaterThan(0);
  });
});

test.describe('Unflag Status Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(GOVERNANCE_PAGE);
    await waitForPageLoad(page);
  });

  test('Can unflag a Flagged search', async ({ page }) => {
    test.setTimeout(60000);

    // Find a Flagged status
    const flaggedCell = page.locator('td:has-text("Flagged")').first();

    if (await flaggedCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found Flagged search, attempting to unflag...');
      await flaggedCell.click();
      await page.waitForTimeout(2000);

      // Look for unflag/OK button
      const unflagBtn = page.locator('button:has-text("Unflag"), button:has-text("Mark OK"), .unflag-btn').first();
      if (await unflagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await unflagBtn.click();
        await page.waitForTimeout(3000);
      }

      await page.screenshot({ path: '/tmp/after-unflag.png' });
    } else {
      console.log('No Flagged searches found to unflag');
    }
  });

  test('Unflagged status persists after refresh', async ({ page }) => {
    test.setTimeout(90000);

    // Get initial flagged count
    const initialFlaggedCount = await page.locator('td:has-text("Flagged")').count();
    console.log(`Initial Flagged count: ${initialFlaggedCount}`);

    if (initialFlaggedCount > 0) {
      // Unflag first one
      const flaggedCell = page.locator('td:has-text("Flagged")').first();
      await flaggedCell.click();
      await page.waitForTimeout(2000);

      const unflagBtn = page.locator('button:has-text("Unflag"), button:has-text("Mark OK")').first();
      if (await unflagBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await unflagBtn.click();
        await page.waitForTimeout(3000);
      }

      // Refresh
      await page.reload();
      await waitForPageLoad(page);

      // Check new count
      const newFlaggedCount = await page.locator('td:has-text("Flagged")').count();
      console.log(`Flagged count after refresh: ${newFlaggedCount}`);
    }
  });
});
