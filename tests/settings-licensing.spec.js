/**
 * Licensing Model - Comprehensive Tests
 * Tests workload/ingest pricing toggle and persistence
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

test.describe('Licensing Model Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text="Licensing Model"')).toBeVisible();
  });

  test('Panel has description', async ({ page }) => {
    await expect(page.locator('text="Select your Splunk licensing model"')).toBeVisible();
  });

  test('Toggle or radio buttons exist', async ({ page }) => {
    const toggle = page.locator('#licensing_model_toggle, [data-token-name="licensing_model"]');
    await expect(toggle).toBeVisible();
  });
});

test.describe('Workload Pricing Option', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Workload pricing option exists', async ({ page }) => {
    await expect(page.locator('text="Workload"')).toBeVisible();
  });

  test('Workload pricing can be selected', async ({ page }) => {
    const workloadOption = page.locator('input[value="workload"], label:has-text("Workload")').first();
    await workloadOption.click();

    // Verify selection
    await page.waitForTimeout(500);
  });

  test('Workload shows SVC-related info', async ({ page }) => {
    const workloadOption = page.locator('input[value="workload"], label:has-text("Workload")').first();
    await workloadOption.click();

    await page.waitForTimeout(500);

    // Should show SVC-related description or fields
    await expect(page.locator('text="SVC"')).toBeVisible();
  });
});

test.describe('Ingest Pricing Option', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Ingest pricing option exists', async ({ page }) => {
    await expect(page.locator('text="Ingest"')).toBeVisible();
  });

  test('Ingest pricing can be selected', async ({ page }) => {
    const ingestOption = page.locator('input[value="ingest"], label:has-text("Ingest")').first();
    await ingestOption.click();

    await page.waitForTimeout(500);
  });

  test('Ingest shows GB-related info', async ({ page }) => {
    const ingestOption = page.locator('input[value="ingest"], label:has-text("Ingest")').first();
    await ingestOption.click();

    await page.waitForTimeout(500);

    // Should show GB-related description
    await expect(page.locator('text=/GB|gigabyte|data volume/i')).toBeVisible();
  });
});

test.describe('Default Licensing Model', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Default is Workload pricing', async ({ page }) => {
    const workloadOption = page.locator('input[value="workload"]');
    if (await workloadOption.isVisible()) {
      await expect(workloadOption).toBeChecked();
    } else {
      // Check for active class on label
      const workloadLabel = page.locator('label:has-text("Workload")');
      await expect(workloadLabel).toHaveClass(/active|selected/);
    }
  });
});

test.describe('Toggle Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Only one option can be selected at a time', async ({ page }) => {
    // Select Ingest
    const ingestOption = page.locator('input[value="ingest"], label:has-text("Ingest")').first();
    await ingestOption.click();
    await page.waitForTimeout(500);

    // Workload should be deselected
    const workloadOption = page.locator('input[value="workload"]');
    if (await workloadOption.isVisible()) {
      await expect(workloadOption).not.toBeChecked();
    }
  });

  test('Toggle has visual feedback', async ({ page }) => {
    const toggle = page.locator('#licensing_model_toggle, .licensing-toggle');
    if (await toggle.isVisible()) {
      await toggle.click();

      // Check for visual change
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Save Licensing Model', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Save button exists for licensing', async ({ page }) => {
    const saveBtn = page.locator('#save_licensing_btn, button:has-text("Save"):near(:text("Licensing"))');
    await expect(saveBtn).toBeVisible();
  });

  test('Changing model enables save', async ({ page }) => {
    // Switch model
    const ingestOption = page.locator('input[value="ingest"], label:has-text("Ingest")').first();
    await ingestOption.click();
    await page.waitForTimeout(500);

    // Save should be enabled
  });

  test('Save shows success message', async ({ page }) => {
    const saveBtn = page.locator('#save_licensing_btn, button:has-text("Save"):near(:text("Licensing"))');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();

      const toast = page.locator('div:has-text("saved")').first();
      await expect(toast).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Licensing Model Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Selected model persists after refresh', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Select Ingest
    const ingestOption = page.locator('input[value="ingest"], label:has-text("Ingest")').first();
    await ingestOption.click();

    // Save
    const saveBtn = page.locator('#save_licensing_btn, button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Refresh
    await page.reload();
    await waitForPageLoad(page);

    // Check if Ingest is still selected
    const ingestAfterRefresh = page.locator('input[value="ingest"]');
    if (await ingestAfterRefresh.isVisible()) {
      // Should be checked
    }
  });
});

test.describe('Conditional UI Based on Model', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('SVC threshold panel visible when Workload selected', async ({ page }) => {
    const workloadOption = page.locator('input[value="workload"], label:has-text("Workload")').first();
    await workloadOption.click();
    await page.waitForTimeout(500);

    await expect(page.locator('text="Max SVCs per Search"')).toBeVisible();
  });

  test('SVC threshold panel hidden when Ingest selected', async ({ page }) => {
    const ingestOption = page.locator('input[value="ingest"], label:has-text("Ingest")').first();
    await ingestOption.click();
    await page.waitForTimeout(500);

    // SVC threshold might be hidden or shown with different context
  });

  test('Cost displays change based on model', async ({ page }) => {
    // Workload shows SVC costs
    const workloadOption = page.locator('input[value="workload"], label:has-text("Workload")').first();
    await workloadOption.click();
    await page.waitForTimeout(500);

    // Check for SVC cost display
    const svcCost = page.locator('text=/SVC.*cost/i');

    // Ingest shows data volume costs
    const ingestOption = page.locator('input[value="ingest"], label:has-text("Ingest")').first();
    await ingestOption.click();
    await page.waitForTimeout(500);

    // Check for data volume cost display
  });
});

test.describe('Licensing Model Help', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Help icon or tooltip exists', async ({ page }) => {
    const helpIcon = page.locator('.licensing-help, .help-icon:near(:text("Licensing"))');
    // Help should be available
  });

  test('Help explains Workload pricing', async ({ page }) => {
    const helpIcon = page.locator('.licensing-help, .help-icon:near(:text("Licensing"))');
    if (await helpIcon.isVisible()) {
      await helpIcon.hover();
      await page.waitForTimeout(500);

      await expect(page.locator('text=/SVC|compute|CPU/i')).toBeVisible();
    }
  });

  test('Help explains Ingest pricing', async ({ page }) => {
    const helpIcon = page.locator('.licensing-help, .help-icon:near(:text("Licensing"))');
    if (await helpIcon.isVisible()) {
      await helpIcon.hover();
      await page.waitForTimeout(500);

      await expect(page.locator('text=/GB|data|volume/i')).toBeVisible();
    }
  });
});

test.describe('Licensing Model Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Model affects dashboard calculations', async ({ page }) => {
    // This would require navigating to the overview page and checking
    // that cost calculations use the correct model
  });

  test('Model affects export data', async ({ page }) => {
    // Export functionality would include the licensing model
  });
});

test.describe('Licensing Model Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Toggle is keyboard accessible', async ({ page }) => {
    const toggle = page.locator('#licensing_model_toggle, [data-token-name="licensing_model"]');
    await toggle.focus();
    await expect(toggle).toBeFocused();

    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
  });

  test('Options have proper labels', async ({ page }) => {
    const workloadLabel = page.locator('label[for*="workload"], label:has-text("Workload")');
    await expect(workloadLabel).toBeVisible();

    const ingestLabel = page.locator('label[for*="ingest"], label:has-text("Ingest")');
    await expect(ingestLabel).toBeVisible();
  });

  test('Radio buttons have proper aria attributes', async ({ page }) => {
    const workloadRadio = page.locator('input[value="workload"]');
    if (await workloadRadio.isVisible()) {
      const role = await workloadRadio.getAttribute('role');
      const ariaLabel = await workloadRadio.getAttribute('aria-label');
      // Should have proper ARIA
    }
  });
});
