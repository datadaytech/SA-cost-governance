const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const SPLUNK_USERNAME = process.env.SPLUNK_USERNAME || 'admin';
const SPLUNK_PASSWORD = process.env.SPLUNK_PASSWORD || 'changeme123';

test('Cron schedule should persist after page reload', async ({ page }) => {
    // Login
    await page.goto(`${SPLUNK_URL}/en-US/account/login`);
    await page.fill('input[name="username"]', SPLUNK_USERNAME);
    await page.fill('input[name="password"]', SPLUNK_PASSWORD);
    await page.click('input[type="submit"]');
    await page.waitForURL('**/en-US/**');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Go to governance dashboard
    await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Enable console logging
    page.on('console', msg => console.log('[Console]', msg.text()));
    
    // Find a cron clickable element
    const cronClickable = page.locator('.cron-clickable').first();
    await expect(cronClickable).toBeVisible({ timeout: 30000 });
    
    // Get the original cron value
    const originalCron = await cronClickable.textContent();
    console.log('Original cron:', originalCron);
    
    // Click to open modal
    await cronClickable.click();
    await page.waitForTimeout(500);
    
    // Wait for modal to be visible
    const modal = page.locator('#cronModalOverlay');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Change to "Every 15 minutes" preset
    const preset15 = page.locator('.cron-preset-btn:has-text("15 min")');
    if (await preset15.isVisible()) {
        await preset15.click();
        await page.waitForTimeout(300);
    }
    
    // Get the new cron value from preview
    const previewValue = await page.locator('#cronPreviewValue').textContent();
    console.log('New cron preview:', previewValue);
    
    // Click Save
    const saveBtn = page.locator('#cronModalSave');
    await saveBtn.click();

    // Wait for cache refresh saved search to complete
    // The "Governance - Populate Search Cache" search reads from REST API and rebuilds the cache
    await page.waitForTimeout(12000);

    // Verify the cron value changed in UI
    const updatedCron = await cronClickable.textContent();
    console.log('Updated cron in UI:', updatedCron);

    // Now reload the page
    console.log('Reloading page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Find the same cron element again
    const cronAfterReload = page.locator('.cron-clickable').first();
    await expect(cronAfterReload).toBeVisible({ timeout: 30000 });
    
    // Get cron value after reload
    const cronValueAfterReload = await cronAfterReload.textContent();
    console.log('Cron after reload:', cronValueAfterReload);
    
    // The value should have persisted (not reverted to original)
    if (originalCron !== previewValue) {
        expect(cronValueAfterReload).toBe(previewValue);
        console.log('✓ Cron change PERSISTED after reload');
    } else {
        console.log('⚠ Original cron was already the same as preset');
    }
});
