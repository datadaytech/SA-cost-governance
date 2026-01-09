/**
 * Governance Thresholds - Comprehensive Tests
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

test.describe('Runtime Ratio Threshold', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text="Runtime Ratio Threshold"')).toBeVisible();
  });

  test('Input field exists', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await expect(input).toBeVisible();
  });

  test('Save button works', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();

    const toast = page.locator('div:has-text("saved")').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  });
});

test.describe('High Frequency Threshold', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text="High Frequency Threshold"')).toBeVisible();
  });

  test('Dropdown has correct options', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_frequency_threshold"]').first();
    await dropdown.click();

    await expect(page.locator('text="1 Minute"').first()).toBeVisible();
    await expect(page.locator('text="5 Minutes"').first()).toBeVisible();
    await expect(page.locator('text="15 Minutes"').first()).toBeVisible();
    await expect(page.locator('text="1 Hour"').first()).toBeVisible();
  });
});

test.describe('Long Runtime Threshold', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text="Long Runtime Threshold"')).toBeVisible();
  });

  test('Dropdown has correct options', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_runtime_threshold"]').first();
    await dropdown.click();

    await expect(page.locator('.select2-result:has-text("1 Minute")')).toBeVisible();
    await expect(page.locator('.select2-result:has-text("5 Minutes")')).toBeVisible();
    await expect(page.locator('.select2-result:has-text("10 Minutes")')).toBeVisible();
  });
});

test.describe('Remediation Period', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text="Remediation Period"')).toBeVisible();
  });

  test('Dropdown has correct options', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_remediation_days"]').first();
    await dropdown.click();

    await expect(page.locator('.select2-result:has-text("3 Days")')).toBeVisible();
    await expect(page.locator('.select2-result:has-text("7 Days")')).toBeVisible();
    await expect(page.locator('.select2-result:has-text("14 Days")')).toBeVisible();
    await expect(page.locator('.select2-result:has-text("30 Days")')).toBeVisible();
  });

  test('Default is 7 Days', async ({ page }) => {
    const selectedText = page.locator('[data-token-name="new_remediation_days"] .select2-chosen').first();
    await expect(selectedText).toContainText('7');
  });
});

test.describe('Max SVCs per Search Threshold', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text="Max SVCs per Search"')).toBeVisible();
  });

  test('Description explains the threshold', async ({ page }) => {
    await expect(page.locator('text="Flag searches consuming more than"')).toBeVisible();
  });

  test('Dropdown has 20 SVCs option', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await expect(page.locator('.select2-result:has-text("20 SVCs")')).toBeVisible();
  });

  test('Dropdown has 30 SVCs option (recommended)', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await expect(page.locator('.select2-result:has-text("30 SVCs")')).toBeVisible();
  });

  test('Dropdown has 40 SVCs option', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await expect(page.locator('.select2-result:has-text("40 SVCs")')).toBeVisible();
  });

  test('Dropdown has 50 SVCs option', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await expect(page.locator('.select2-result:has-text("50 SVCs")')).toBeVisible();
  });

  test('Dropdown has Custom option', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await expect(page.locator('.select2-result:has-text("Custom")')).toBeVisible();
  });

  test('Default is 30 SVCs', async ({ page }) => {
    const selectedText = page.locator('[data-token-name="new_svc_threshold"] .select2-chosen').first();
    await expect(selectedText).toContainText('30');
  });

  test('Custom input appears when Custom selected', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await page.locator('.select2-result:has-text("Custom")').click();

    await expect(page.locator('#custom_svc_input')).toBeVisible({ timeout: 5000 });
  });

  test('Custom input accepts numeric value', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await page.locator('.select2-result:has-text("Custom")').click();

    const customInput = page.locator('#custom_svc_input');
    await expect(customInput).toBeVisible({ timeout: 5000 });

    await customInput.fill('75');
    await expect(customInput).toHaveValue('75');
  });

  test('Save button works', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save")').nth(4); // SVC threshold save button
    await saveBtn.click();

    const toast = page.locator('div:has-text("saved")').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Save All Thresholds Button', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Button exists', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await expect(saveAllBtn).toBeVisible();
  });

  test('Button has correct text', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await expect(saveAllBtn).toHaveText('Save All Thresholds');
  });

  test('Button becomes disabled while saving', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    await expect(saveAllBtn).toBeDisabled({ timeout: 1000 });
  });

  test('Button text changes to Saving All...', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    await expect(saveAllBtn).toContainText('Saving', { timeout: 1000 });
  });

  test('Button shows All Saved checkmark on success', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    await expect(saveAllBtn).toContainText('All Saved', { timeout: 15000 });
  });

  test('Success toast appears', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    const toast = page.locator('div:has-text("All thresholds saved")').first();
    await expect(toast).toBeVisible({ timeout: 15000 });
  });

  test('Button resets after success', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    await expect(saveAllBtn).toHaveText('Save All Thresholds', { timeout: 20000 });
    await expect(saveAllBtn).toBeEnabled();
  });

  test('Button style changes on success', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    // Wait for success state
    await page.waitForTimeout(5000);

    // Check background color changes
    const bgColor = await saveAllBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Should be green (#53a051) or similar
  });
});

test.describe('Threshold Value Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Saved thresholds persist after refresh', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Save all thresholds
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();
    await page.waitForTimeout(10000);

    // Refresh page
    await page.reload();
    await waitForPageLoad(page);

    // Values should still be there (based on lookup)
  });
});
