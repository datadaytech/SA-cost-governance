/**
 * Debug UI - check for cron modal and visual badges
 */
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Debug UI elements', async ({ page }) => {
  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
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

  // Take screenshot
  await page.screenshot({ path: '/tmp/debug-ui-1.png', fullPage: true });

  // Check for cron-clickable elements
  const cronClickable = await page.locator('.cron-clickable').count();
  console.log('Cron clickable elements:', cronClickable);

  // Check for status badges
  const statusBadges = await page.locator('.status-badge').count();
  console.log('Status badges:', statusBadges);

  // Check for flag indicators
  const flagIndicators = await page.locator('.flag-indicator').count();
  console.log('Flag indicators:', flagIndicators);

  // Check if CSS loaded - look for styled elements
  const cronModalOverlay = await page.locator('#cronModalOverlay').count();
  console.log('Cron modal overlay exists:', cronModalOverlay);

  // Try clicking on a cron schedule
  const firstCron = page.locator('.cron-clickable').first();
  if (await firstCron.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Clicking cron element...');
    await firstCron.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/debug-ui-2-after-cron-click.png', fullPage: true });

    // Check if modal opened
    const modalActive = await page.locator('#cronModalOverlay.active').count();
    console.log('Cron modal active:', modalActive);
  } else {
    console.log('No cron-clickable elements visible');
  }

  // Check for any table rows
  const tableRows = await page.locator('table tbody tr').count();
  console.log('Table rows:', tableRows);

  // Check for checkboxes
  const checkboxes = await page.locator('input[type="checkbox"]').count();
  console.log('Checkboxes:', checkboxes);

  // Print console errors
  if (consoleErrors.length > 0) {
    console.log('Console errors:');
    consoleErrors.forEach(e => console.log('  -', e));
  } else {
    console.log('No console errors');
  }
});
