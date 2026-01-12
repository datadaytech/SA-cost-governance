const { test, expect } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';

test('Debug frequency persistence', async ({ page }) => {
    // Login
    await page.goto(`${SPLUNK_URL}/en-US/account/login`);
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'changeme123');
    await page.click('input[type="submit"]');
    await page.waitForURL('**/en-US/**');
    await page.waitForTimeout(2000);

    // Go to dashboard
    await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);
    
    // Capture ALL console messages
    const logs = [];
    page.on('console', msg => {
        logs.push(msg.text());
        console.log('[Browser]', msg.text());
    });
    
    // Also capture network requests
    page.on('response', async response => {
        if (response.url().includes('dispatch')) {
            console.log('[Network] Dispatch response:', response.status(), response.url());
        }
    });
    
    // Get headers
    const headers = await page.locator('table thead th').allTextContents();
    const freqColIndex = headers.findIndex(h => h.includes('Frequency'));
    
    // Find cron element
    const cronClickable = page.locator('.cron-clickable').first();
    await expect(cronClickable).toBeVisible({ timeout: 30000 });
    
    const originalCron = await cronClickable.textContent();
    const row = cronClickable.locator('xpath=ancestor::tr');
    const cells = await row.locator('td').allTextContents();
    const originalFreq = cells[freqColIndex];
    
    console.log('');
    console.log('=== BEFORE CHANGE ===');
    console.log('Cron:', originalCron);
    console.log('Frequency:', originalFreq);
    
    // Open modal
    await cronClickable.click();
    await page.waitForTimeout(500);
    
    // Click 15 min preset
    const preset = page.locator('.cron-preset-btn:has-text("15 min")').first();
    await preset.click();
    await page.waitForTimeout(300);
    
    const previewValue = await page.locator('#cronPreviewValue').textContent();
    console.log('New cron preview:', previewValue);
    
    // Save
    console.log('Clicking Save...');
    await page.locator('#cronModalSave').click();
    
    // Wait and watch for dispatch
    console.log('Waiting 25 seconds for dispatch and cache update...');
    await page.waitForTimeout(25000);
    
    // Check UI after save
    const cellsAfterSave = await row.locator('td').allTextContents();
    const freqAfterSave = cellsAfterSave[freqColIndex];
    const cronAfterSave = await cronClickable.textContent();
    
    console.log('');
    console.log('=== AFTER SAVE (before reload) ===');
    console.log('Cron:', cronAfterSave);
    console.log('Frequency:', freqAfterSave);
    
    // Reload
    console.log('');
    console.log('Reloading page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);
    
    // Check after reload
    const cronAfterReload = page.locator('.cron-clickable').first();
    await expect(cronAfterReload).toBeVisible({ timeout: 30000 });
    
    const cronValueAfterReload = await cronAfterReload.textContent();
    const rowAfterReload = cronAfterReload.locator('xpath=ancestor::tr');
    const cellsAfterReload = await rowAfterReload.locator('td').allTextContents();
    const freqAfterReload = cellsAfterReload[freqColIndex];
    
    console.log('');
    console.log('=== AFTER RELOAD ===');
    console.log('Cron:', cronValueAfterReload);
    console.log('Frequency:', freqAfterReload);
    
    console.log('');
    console.log('=== SUMMARY ===');
    console.log('Original frequency:', originalFreq);
    console.log('After save frequency:', freqAfterSave);
    console.log('After reload frequency:', freqAfterReload);
    
    if (freqAfterReload === freqAfterSave) {
        console.log('✓ Frequency PERSISTED');
    } else {
        console.log('✗ Frequency REVERTED from', freqAfterSave, 'to', freqAfterReload);
    }
    
    // Check dispatch logs
    const dispatchLogs = logs.filter(l => l.includes('dispatch') || l.includes('Cache'));
    console.log('');
    console.log('=== DISPATCH LOGS ===');
    dispatchLogs.forEach(l => console.log(l));
});
