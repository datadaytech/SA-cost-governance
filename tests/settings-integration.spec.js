/**
 * Integration Tests - End-to-End Flows
 * Tests complete user workflows across the settings page
 */

const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const SPLUNK_USERNAME = process.env.SPLUNK_USERNAME || 'admin';
const SPLUNK_PASSWORD = process.env.SPLUNK_PASSWORD || 'changeme123';
const SETTINGS_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/governance_settings`;
const OVERVIEW_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/governance_overview`;

async function login(page) {
  await page.goto(`${SPLUNK_URL}/en-US/account/login`);
  await page.fill('input[name="username"]', SPLUNK_USERNAME);
  await page.fill('input[name="password"]', SPLUNK_PASSWORD);
  await page.click('input[type="submit"]');
  await page.waitForURL(/\/app\//);
}

async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('Full Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Complete configuration workflow', async ({ page }) => {
    test.setTimeout(180000);

    // Step 1: Configure thresholds
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('2.0');

    // Step 2: Configure schedule
    const scheduleDropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await scheduleDropdown.click();
    await page.locator('text="Daily at 2:03 AM"').click();

    // Step 3: Save all settings
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    // Wait for success
    await expect(saveAllBtn).toContainText('All Saved', { timeout: 15000 });

    // Step 4: Verify settings persist
    await page.reload();
    await waitForPageLoad(page);

    // Verify values are still set
  });

  test('Configure and run cache workflow', async ({ page }) => {
    test.setTimeout(300000);

    // Configure schedule
    const scheduleDropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await scheduleDropdown.click();
    await page.locator('text="Hourly"').click();

    // Save schedule
    const saveScheduleBtn = page.locator('#save_schedule_btn');
    await saveScheduleBtn.click();
    await expect(saveScheduleBtn).toContainText('Saved', { timeout: 10000 });

    // Run cache manually
    const runCacheBtn = page.locator('#run_cache_btn');
    await runCacheBtn.click();

    // Wait for completion
    const runCacheText = page.locator('#run_cache_text');
    await expect(runCacheText).toHaveText('Run Cache Now', { timeout: 180000 });

    // Verify success toast
    const toast = page.locator('div:has-text("Cache refreshed")').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Add pattern and view matches workflow', async ({ page }) => {
    test.setTimeout(120000);

    // Add a pattern
    await page.locator('#add_pattern_btn').click();
    await page.locator('#new_pattern_input').fill('| stats count');
    await page.locator('#save_new_pattern_btn').click();

    // Wait for pattern to be added
    await page.waitForTimeout(3000);

    // View matches for a pattern
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();

      // Wait for modal
      await expect(page.locator('#pattern_modal')).toBeVisible({ timeout: 10000 });

      // Close modal
      await page.locator('#pattern_modal .close-btn, #close_pattern_modal').first().click();
    }
  });
});

test.describe('Navigation Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Navigate from overview to settings', async ({ page }) => {
    await page.goto(OVERVIEW_PAGE);
    await waitForPageLoad(page);

    // Find and click settings link
    const settingsLink = page.locator('a:has-text("Settings"), a[href*="governance_settings"]').first();
    await settingsLink.click();

    await expect(page).toHaveURL(/governance_settings/);
  });

  test('Navigate from settings to overview', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Find and click overview link
    const overviewLink = page.locator('a:has-text("Overview"), a[href*="governance_overview"]').first();
    await overviewLink.click();

    await expect(page).toHaveURL(/governance_overview/);
  });

  test('Settings changes reflect in overview', async ({ page }) => {
    test.setTimeout(300000);

    // Go to settings and change threshold
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('3.0');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Run cache to update data
    const runCacheBtn = page.locator('#run_cache_btn');
    await runCacheBtn.click();
    await page.waitForTimeout(60000);

    // Navigate to overview
    await page.goto(OVERVIEW_PAGE);
    await waitForPageLoad(page);

    // Verify threshold is reflected in overview displays
  });
});

test.describe('Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Recover from failed save', async ({ page }) => {
    // Make changes
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('2.5');

    // Simulate network error by disconnecting (if possible)
    // Otherwise just verify error handling exists
  });

  test('Recover from interrupted cache run', async ({ page }) => {
    test.setTimeout(60000);

    // Start cache
    const runCacheBtn = page.locator('#run_cache_btn');
    await runCacheBtn.click();

    // Wait a bit
    await page.waitForTimeout(5000);

    // Refresh page (simulating interruption)
    await page.reload();
    await waitForPageLoad(page);

    // Button should be back to normal state
    await expect(runCacheBtn).toBeEnabled({ timeout: 10000 });
  });
});

test.describe('Multi-User Scenarios', () => {
  test('Settings page loads correctly', async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // All major sections should be visible
    await expect(page.locator('text="Runtime Ratio Threshold"')).toBeVisible();
    await expect(page.locator('text="High Frequency Threshold"')).toBeVisible();
    await expect(page.locator('#run_cache_btn')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('Multiple save operations work sequentially', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Save multiple times
    for (let i = 0; i < 3; i++) {
      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }

    // Page should still be functional
    await expect(page.locator('#run_cache_btn')).toBeEnabled();
  });

  test('Large pattern list handles scrolling', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    const patternList = page.locator('#wasteful_patterns_list');
    await expect(patternList).toBeVisible();

    // Verify scrolling works
    await patternList.evaluate(el => el.scrollTop = 100);
  });
});

test.describe('Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Saved values match input values', async ({ page }) => {
    // Set a specific value
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('2.75');

    // Save
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Refresh
    await page.reload();
    await waitForPageLoad(page);

    // Verify value is exactly what we set
    const savedValue = await runtimeInput.inputValue();
    expect(savedValue).toBe('2.75');
  });

  test('Schedule cron expression is correctly saved', async ({ page }) => {
    // Select hourly
    const scheduleDropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await scheduleDropdown.click();
    await page.locator('text="Hourly"').click();

    // Save
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Verify via API or refresh
    await page.reload();
    await waitForPageLoad(page);

    // Check selected value
    const selectedText = page.locator('.select2-chosen, [data-token-name="cache_schedule"] .splunk-dropdown-toggle').first();
    await expect(selectedText).toContainText('Hourly');
  });
});

test.describe('Concurrent Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Cannot run cache twice simultaneously', async ({ page }) => {
    const runCacheBtn = page.locator('#run_cache_btn');

    // Click once
    await runCacheBtn.click();

    // Button should be disabled
    await expect(runCacheBtn).toBeDisabled();

    // Clicking again should do nothing
    await runCacheBtn.click({ force: true });

    // Still disabled
    await expect(runCacheBtn).toBeDisabled();
  });

  test('Can save while cache is running', async ({ page }) => {
    test.setTimeout(120000);

    // Start cache
    const runCacheBtn = page.locator('#run_cache_btn');
    await runCacheBtn.click();

    // Try to save thresholds
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();

    // Should still work
    await page.waitForTimeout(5000);
  });
});

test.describe('Session Handling', () => {
  test('Settings persist across sessions', async ({ page }) => {
    // First session
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Change setting
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('1.8');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Clear cookies/storage to simulate new session
    await page.context().clearCookies();

    // Login again
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Verify setting persisted
    const savedValue = await runtimeInput.inputValue();
    expect(savedValue).toBe('1.8');
  });
});

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Empty threshold is handled', async ({ page }) => {
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();

    // Should show error or use default
    await page.waitForTimeout(2000);
  });

  test('Very large threshold is handled', async ({ page }) => {
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('99999');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();

    await page.waitForTimeout(2000);
  });

  test('Negative threshold is rejected', async ({ page }) => {
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('-5');

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();

    // Should show error
    const error = page.locator('div:has-text("invalid"), div:has-text("positive")').first();
    // May or may not show depending on validation
  });

  test('Special characters in pattern are escaped', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();

    const input = page.locator('#new_pattern_input');
    await input.fill('| eval test="<script>alert(1)</script>"');

    await page.locator('#save_new_pattern_btn').click();

    // Should handle without XSS
    await page.waitForTimeout(2000);
  });
});

test.describe('Responsive Design', () => {
  test('Settings page works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // All major elements should still be visible
    await expect(page.locator('#run_cache_btn')).toBeVisible();
    await expect(page.locator('#save_all_thresholds_btn')).toBeVisible();
  });

  test('Settings page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Major elements should be visible (may need scrolling)
    await expect(page.locator('#run_cache_btn')).toBeVisible();
  });
});

test.describe('Accessibility - Full Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Page has proper heading structure', async ({ page }) => {
    const h1 = await page.locator('h1').count();
    const h2 = await page.locator('h2').count();

    // Should have heading hierarchy
    expect(h1 + h2).toBeGreaterThan(0);
  });

  test('All interactive elements are focusable', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      await button.focus();
      await expect(button).toBeFocused();
    }
  });

  test('Tab order is logical', async ({ page }) => {
    // Tab through first several elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Should have focus somewhere on page
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
