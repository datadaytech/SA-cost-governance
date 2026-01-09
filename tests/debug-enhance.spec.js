/**
 * Debug table enhancement
 */
const { test } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const GOVERNANCE_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`;

test('Debug table enhancement', async ({ page }) => {
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

  // Debug the enhancement
  const debugInfo = await page.evaluate(() => {
    const result = {
      tables: [],
      escapeHtml: typeof escapeHtml === 'function' ? 'exists' : 'MISSING'
    };

    $('table').each(function(i) {
      const $table = $(this);
      const $panel = $table.closest('.dashboard-panel');
      const panelTitle = $panel.find('.panel-title, .panel-head h3, h3').first().text().trim();

      let scheduleColIndex = -1;
      let searchNameColIndex = -1;

      $table.find('thead th').each(function(index) {
        const text = $(this).text().trim();
        if (text === 'Schedule') scheduleColIndex = index;
        if (text === 'Search Name') searchNameColIndex = index;
      });

      const firstRowCells = [];
      $table.find('tbody tr').first().find('td').each(function() {
        firstRowCells.push($(this).text().trim().substring(0, 30));
      });

      // Check if schedule cell has cron-clickable
      let scheduleHtml = '';
      if (scheduleColIndex >= 0) {
        scheduleHtml = $table.find('tbody tr').first().find('td').eq(scheduleColIndex).html();
      }

      result.tables.push({
        panel: panelTitle.substring(0, 50),
        scheduleColIndex,
        searchNameColIndex,
        rowCount: $table.find('tbody tr').length,
        firstRowCells: firstRowCells.slice(0, 6),
        scheduleHtml: scheduleHtml ? scheduleHtml.substring(0, 100) : 'N/A'
      });
    });

    return result;
  });

  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
});
