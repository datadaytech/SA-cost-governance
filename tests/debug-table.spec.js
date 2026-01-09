/**
 * Debug table structure
 */
const { test } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Debug table structure', async ({ page }) => {
  // Listen for JS console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Enhancing') || text.includes('governance') || text.includes('error') || text.includes('Error')) {
      console.log('BROWSER:', text);
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

  // Get table headers
  const headers = await page.locator('table thead th').allTextContents();
  console.log('Table headers:', headers.join(' | '));

  // Get first row cells
  const firstRowCells = await page.locator('table tbody tr').first().locator('td').allTextContents();
  console.log('First row cells:', firstRowCells.slice(0, 5).join(' | '));

  // Check if Schedule column exists
  const scheduleHeader = await page.locator('th:has-text("Schedule")').count();
  console.log('Schedule header count:', scheduleHeader);

  // Get schedule cells content
  const scheduleCells = await page.locator('table tbody tr td:nth-child(6)').allTextContents();
  console.log('Schedule cells (first 5):', scheduleCells.slice(0, 5).join(', '));

  // Check the HTML of first schedule cell
  const firstScheduleCell = await page.locator('table tbody tr').first().locator('td').nth(5).innerHTML();
  console.log('First schedule cell HTML:', firstScheduleCell.substring(0, 200));

  // Check if enhanceScheduleColumns is being called
  const enhancing = await page.evaluate(() => {
    return window.enhanceScheduleColumns ? 'function exists' : 'function NOT found';
  });
  console.log('enhanceScheduleColumns:', enhancing);
});
