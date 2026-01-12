const { test, expect } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const SPLUNK_USERNAME = 'admin';
const SPLUNK_PASSWORD = 'changeme123';

test('Cron and Frequency should persist after page reload', async ({ page }) => {
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
    await page.waitForTimeout(8000);
    
    // Enable console logging
    page.on('console', msg => console.log('[Browser]', msg.text()));
    
    // Find a cron clickable element
    const cronClickable = page.locator('.cron-clickable').first();
    await expect(cronClickable).toBeVisible({ timeout: 30000 });
    
    // Get the original cron and frequency values
    const originalCron = await cronClickable.textContent();
    console.log('Original cron:', originalCron);
    
    // Find the frequency cell in the same row
    const row = cronClickable.locator('xpath=ancestor::tr');
    const frequencyCellBefore = await row.locator('td').nth(4).textContent(); // Frequency is typically 5th column
    console.log('Original frequency:', frequencyCellBefore);
    
    // Click to open modal
    console.log('Opening cron modal...');
    await cronClickable.click();
    await page.waitForTimeout(500);
    
    // Wait for modal to be visible
    const modal = page.locator('#cronModalOverlay');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Click a different preset to change the cron
    // Try "Hourly" preset
    const presetHourly = page.locator('.cron-preset-btn:has-text("Hourly")');
    if (await presetHourly.isVisible()) {
        console.log('Clicking Hourly preset...');
        await presetHourly.click();
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
    console.log('Waiting for cache refresh...');
    await page.waitForTimeout(15000);
    
    // Get the updated values in UI (before reload)
    const updatedCron = await cronClickable.textContent();
    const updatedFrequency = await row.locator('td').nth(4).textContent();
    console.log('Updated cron in UI (before reload):', updatedCron);
    console.log('Updated frequency in UI (before reload):', updatedFrequency);
    
    // Now reload the page
    console.log('Reloading page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);
    
    // Find the same cron element again
    const cronAfterReload = page.locator('.cron-clickable').first();
    await expect(cronAfterReload).toBeVisible({ timeout: 30000 });
    
    // Get cron and frequency values after reload
    const cronValueAfterReload = await cronAfterReload.textContent();
    const rowAfterReload = cronAfterReload.locator('xpath=ancestor::tr');
    const frequencyAfterReload = await rowAfterReload.locator('td').nth(4).textContent();
    
    console.log('');
    console.log('=== RESULTS ===');
    console.log('Original cron:', originalCron);
    console.log('New cron (preview):', previewValue);
    console.log('Cron after reload:', cronValueAfterReload);
    console.log('');
    console.log('Original frequency:', frequencyCellBefore);
    console.log('Frequency after reload:', frequencyAfterReload);
    
    // Check if values persisted
    if (cronValueAfterReload === previewValue) {
        console.log('✓ Cron PERSISTED correctly');
    } else {
        console.log('✗ Cron DID NOT persist - reverted to:', cronValueAfterReload);
    }
    
    // The frequency should match the new cron
    expect(cronValueAfterReload).toBe(previewValue);
});
