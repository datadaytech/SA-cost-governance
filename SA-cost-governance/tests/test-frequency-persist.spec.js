const { test, expect } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const SPLUNK_USERNAME = 'admin';
const SPLUNK_PASSWORD = 'changeme123';

test('Frequency column should persist after cron change and reload', async ({ page }) => {
    // Login
    console.log('Logging in...');
    await page.goto(`${SPLUNK_URL}/en-US/account/login`);
    await page.fill('input[name="username"]', SPLUNK_USERNAME);
    await page.fill('input[name="password"]', SPLUNK_PASSWORD);
    await page.click('input[type="submit"]');
    await page.waitForURL('**/en-US/**');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Go to governance dashboard
    console.log('Going to governance dashboard...');
    await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);
    
    // Enable console logging
    page.on('console', msg => console.log('[Browser]', msg.text()));
    
    // Find the table headers to identify column indices
    const headers = await page.locator('table thead th').allTextContents();
    const freqColIndex = headers.findIndex(h => h.includes('Frequency'));
    console.log('Frequency column index:', freqColIndex);
    
    // Find a cron clickable element
    const cronClickable = page.locator('.cron-clickable').first();
    await expect(cronClickable).toBeVisible({ timeout: 30000 });
    
    // Get the original cron value
    const originalCron = await cronClickable.textContent();
    console.log('Original cron:', originalCron);
    
    // Get the row and find the frequency cell by column index
    const row = cronClickable.locator('xpath=ancestor::tr');
    const cells = await row.locator('td').allTextContents();
    const originalFrequency = freqColIndex >= 0 ? cells[freqColIndex] : 'N/A';
    console.log('Original frequency:', originalFrequency);
    
    // Click to open modal
    console.log('Opening cron modal...');
    await cronClickable.click();
    await page.waitForTimeout(500);
    
    // Wait for modal to be visible
    const modal = page.locator('#cronModalOverlay');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Click "Daily ~6 AM" preset (using specific selector)
    const presetDaily = page.locator('.cron-preset-btn:has-text("Daily ~6 AM")').first();
    if (await presetDaily.isVisible()) {
        console.log('Clicking Daily ~6 AM preset...');
        await presetDaily.click();
        await page.waitForTimeout(300);
    }
    
    // Get the new cron value from preview
    const previewValue = await page.locator('#cronPreviewValue').textContent();
    console.log('New cron preview:', previewValue);
    
    // Click Save
    console.log('Clicking Save...');
    const saveBtn = page.locator('#cronModalSave');
    await saveBtn.click();
    
    // Wait for the save to complete and cache to refresh
    console.log('Waiting 20 seconds for cache refresh...');
    await page.waitForTimeout(20000);
    
    // Check UI before reload
    const cellsBeforeReload = await row.locator('td').allTextContents();
    const freqBeforeReload = freqColIndex >= 0 ? cellsBeforeReload[freqColIndex] : 'N/A';
    console.log('Frequency in UI before reload:', freqBeforeReload);
    
    // Now reload the page
    console.log('Reloading page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);
    
    // Find the same cron element again
    const cronAfterReload = page.locator('.cron-clickable').first();
    await expect(cronAfterReload).toBeVisible({ timeout: 30000 });
    
    // Get cron value after reload
    const cronValueAfterReload = await cronAfterReload.textContent();
    
    // Get frequency after reload
    const rowAfterReload = cronAfterReload.locator('xpath=ancestor::tr');
    const cellsAfterReload = await rowAfterReload.locator('td').allTextContents();
    const frequencyAfterReload = freqColIndex >= 0 ? cellsAfterReload[freqColIndex] : 'N/A';
    
    console.log('');
    console.log('=== RESULTS ===');
    console.log('Original cron:', originalCron);
    console.log('New cron (preview):', previewValue);
    console.log('Cron after reload:', cronValueAfterReload);
    console.log('');
    console.log('Original frequency:', originalFrequency);
    console.log('Frequency in UI before reload:', freqBeforeReload);
    console.log('Frequency after reload:', frequencyAfterReload);
    
    // Check results
    if (cronValueAfterReload === previewValue) {
        console.log('✓ Cron PERSISTED correctly');
    } else {
        console.log('✗ Cron DID NOT persist - expected:', previewValue, 'got:', cronValueAfterReload);
    }
    
    // Frequency for daily cron should be "Daily"
    if (frequencyAfterReload === 'Daily') {
        console.log('✓ Frequency PERSISTED correctly as "Daily"');
    } else {
        console.log('✗ Frequency DID NOT persist - expected: Daily, got:', frequencyAfterReload);
    }
    
    expect(cronValueAfterReload).toBe(previewValue);
    expect(frequencyAfterReload).toBe('Daily');
});
