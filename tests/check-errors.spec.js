/**
 * Check for JavaScript errors
 */
const { test } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Check for JS errors', async ({ page }) => {
  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
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
  await page.waitForTimeout(6000);

  console.log('\n=== ERRORS ===');
  if (errors.length === 0) {
    console.log('No errors');
  } else {
    errors.forEach(e => console.log('ERROR:', e));
  }

  console.log('\n=== WARNINGS ===');
  if (warnings.length === 0) {
    console.log('No warnings');
  } else {
    warnings.slice(0, 10).forEach(w => console.log('WARNING:', w));
  }

  // Check what CSS classes are applied to schedule cells
  const scheduleInfo = await page.evaluate(() => {
    const cells = [];
    $('table tbody tr').each(function(i) {
      if (i >= 3) return false;
      const $row = $(this);
      const $scheduleCell = $row.find('td').eq(5);
      cells.push({
        text: $scheduleCell.text().trim(),
        html: $scheduleCell.html(),
        hasClickable: $scheduleCell.find('.cron-clickable').length > 0
      });
    });
    return cells;
  });

  console.log('\n=== SCHEDULE CELLS ===');
  scheduleInfo.forEach((cell, i) => {
    console.log(`Row ${i}: "${cell.text}" | hasClickable: ${cell.hasClickable} | HTML: ${cell.html?.substring(0, 80)}`);
  });
});
