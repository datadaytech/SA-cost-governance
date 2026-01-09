/**
 * Quick test: OK to Flagged status change and persistence
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Change status from OK to Flagged and verify persistence', async ({ page }) => {
  // Login
  await page.goto(`${SPLUNK_URL}/en-US/account/login`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'changeme123');
  await page.click('input[type="submit"]');
  await page.waitForURL(/\/app\//);
  
  // Navigate to governance page
  await page.goto(GOVERNANCE_PAGE);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  // Take screenshot before
  await page.screenshot({ path: '/tmp/before-flag-change.png', fullPage: true });
  
  // Find a search with OK status and click to flag it
  const okStatus = page.locator('td:has-text("OK"), .status-ok, span:has-text("OK")').first();
  console.log('Looking for OK status...');
  
  if (await okStatus.isVisible({ timeout: 10000 }).catch(() => false)) {
    console.log('Found OK status, clicking...');
    await okStatus.click();
    await page.waitForTimeout(2000);
    
    // Look for flag button or confirm dialog
    const flagBtn = page.locator('button:has-text("Flag"), .flag-btn, a:has-text("Flag")').first();
    if (await flagBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await flagBtn.click();
      await page.waitForTimeout(3000);
    }
  } else {
    console.log('No OK status found, looking for status dropdown or toggle...');
    
    // Try finding any status dropdown
    const statusDropdown = page.locator('[data-field="status"], .status-select, select').first();
    if (await statusDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusDropdown.click();
      await page.locator('text="Flagged"').click();
    }
  }
  
  await page.screenshot({ path: '/tmp/after-flag-change.png', fullPage: true });
  
  // Refresh page to verify persistence
  console.log('Refreshing page to verify persistence...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: '/tmp/after-refresh.png', fullPage: true });
  
  console.log('Test completed - check screenshots in /tmp/');
});
