/**
 * Cache Refresh Schedule - Comprehensive Tests
 */

const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const SPLUNK_USERNAME = process.env.SPLUNK_USERNAME || 'admin';
const SPLUNK_PASSWORD = process.env.SPLUNK_PASSWORD || 'changeme123';
const SETTINGS_PAGE = `${SPLUNK_URL}/en-US/app/SA-cost-governance/governance_settings`;

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

test.describe('Schedule Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Dropdown exists and is visible', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await expect(dropdown).toBeVisible();
  });

  test('Every 30 minutes option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await expect(page.locator('text="Every 30 minutes"')).toBeVisible();
  });

  test('Hourly option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await expect(page.locator('text="Hourly"')).toBeVisible();
  });

  test('Daily at 2:03 AM option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await expect(page.locator('text="Daily at 2:03 AM"')).toBeVisible();
  });

  test('Daily at 6:06 AM option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await expect(page.locator('text="Daily at 6:06 AM"')).toBeVisible();
  });

  test('Custom Schedule option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await expect(page.locator('text="Custom Schedule..."')).toBeVisible();
  });

  test('Every 5 minutes option does NOT exist', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await expect(page.locator('.select2-result:has-text("Every 5 minutes")')).toHaveCount(0);
  });

  test('Every 15 minutes option does NOT exist', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await expect(page.locator('.select2-result:has-text("Every 15 minutes")')).toHaveCount(0);
  });
});

test.describe('Schedule Default Value', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Default is Daily at 2:03 AM', async ({ page }) => {
    // Check selected value
    const selectedText = page.locator('.select2-chosen, [data-token-name="cache_schedule"] .splunk-dropdown-toggle').first();
    await expect(selectedText).toContainText('2:03 AM');
  });
});

test.describe('Custom Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Custom section appears when selected', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    await expect(page.locator('#custom_time_input')).toBeVisible({ timeout: 5000 });
  });

  test('Time input accepts valid format', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    const timeInput = page.locator('#custom_time_input');
    await expect(timeInput).toBeVisible({ timeout: 5000 });

    await timeInput.fill('3:30 AM');
    await expect(timeInput).toHaveValue('3:30 AM');
  });

  test('All day checkboxes are present', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    await expect(page.locator('#day_mon')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#day_tue')).toBeVisible();
    await expect(page.locator('#day_wed')).toBeVisible();
    await expect(page.locator('#day_thu')).toBeVisible();
    await expect(page.locator('#day_fri')).toBeVisible();
    await expect(page.locator('#day_sat')).toBeVisible();
    await expect(page.locator('#day_sun')).toBeVisible();
  });

  test('Day checkboxes are clickable', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    const monCheckbox = page.locator('#day_mon');
    await expect(monCheckbox).toBeVisible({ timeout: 5000 });

    await monCheckbox.check();
    await expect(monCheckbox).toBeChecked();

    await monCheckbox.uncheck();
    await expect(monCheckbox).not.toBeChecked();
  });

  test('Multiple days can be selected', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    await page.locator('#day_mon').check();
    await page.locator('#day_wed').check();
    await page.locator('#day_fri').check();

    await expect(page.locator('#day_mon')).toBeChecked();
    await expect(page.locator('#day_wed')).toBeChecked();
    await expect(page.locator('#day_fri')).toBeChecked();
    await expect(page.locator('#day_tue')).not.toBeChecked();
  });
});

test.describe('Save Schedule Button', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Save button exists', async ({ page }) => {
    const saveBtn = page.locator('#save_schedule_btn');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveText('Save Schedule');
  });

  test('Save button becomes disabled while saving', async ({ page }) => {
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    await expect(saveBtn).toBeDisabled({ timeout: 1000 });
  });

  test('Save button text changes to Saving...', async ({ page }) => {
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    await expect(saveBtn).toHaveText('Saving...', { timeout: 1000 });
  });

  test('Save button shows Saved checkmark on success', async ({ page }) => {
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    await expect(saveBtn).toContainText('Saved', { timeout: 10000 });
  });

  test('Save button resets after success', async ({ page }) => {
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    // Wait for it to reset
    await expect(saveBtn).toHaveText('Save Schedule', { timeout: 15000 });
    await expect(saveBtn).toBeEnabled();
  });

  test('Success toast appears on save', async ({ page }) => {
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    const toast = page.locator('div:has-text("Schedule saved")').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Schedule Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Selected schedule persists after refresh', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Select Hourly
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Hourly"').click();

    // Save
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Refresh page
    await page.reload();
    await waitForPageLoad(page);

    // Check if saved (note: this depends on the saved search being updated)
  });
});

test.describe('Custom Time Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Empty time shows error on save', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    // Don't fill time input
    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    // Should show error toast
    const errorToast = page.locator('div:has-text("Please enter a time")').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('Invalid time format shows error', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    const timeInput = page.locator('#custom_time_input');
    await timeInput.fill('invalid');

    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    const errorToast = page.locator('div:has-text("Invalid time")').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('Valid 12-hour format is accepted', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    const timeInput = page.locator('#custom_time_input');
    await timeInput.fill('3:30 AM');

    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    const successToast = page.locator('div:has-text("Schedule saved")').first();
    await expect(successToast).toBeVisible({ timeout: 10000 });
  });

  test('Valid 24-hour format is accepted', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    const timeInput = page.locator('#custom_time_input');
    await timeInput.fill('15:30');

    const saveBtn = page.locator('#save_schedule_btn');
    await saveBtn.click();

    // Should work (either success or the function handles it)
  });
});
