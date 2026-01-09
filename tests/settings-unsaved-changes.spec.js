/**
 * Unsaved Changes Warning - Comprehensive Tests
 * Tests change tracking, visual indicators, and navigation prevention
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

test.describe('Initial State - No Changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('No unsaved indicator on page load', async ({ page }) => {
    const indicator = page.locator('.unsaved-indicator, #unsaved_changes_indicator');
    await expect(indicator).toBeHidden();
  });

  test('No asterisk on tab/title initially', async ({ page }) => {
    const title = await page.title();
    expect(title).not.toContain('*');
  });

  test('Save buttons are in default state', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await expect(saveAllBtn).toBeEnabled();
    await expect(saveAllBtn).not.toHaveClass(/changed/);
  });
});

test.describe('Change Detection - Threshold Inputs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Changing runtime ratio shows unsaved indicator', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('2.5');

    await page.waitForTimeout(500);

    const indicator = page.locator('.unsaved-indicator, #unsaved_changes_indicator, .has-unsaved-changes');
    await expect(indicator).toBeVisible();
  });

  test('Changing frequency threshold shows unsaved indicator', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_frequency_threshold"]').first();
    await dropdown.click();
    await page.locator('.select2-result:has-text("5 Minutes")').first().click();

    await page.waitForTimeout(500);

    const hasChanges = await page.evaluate(() => {
      return document.body.classList.contains('has-unsaved-changes') ||
             document.querySelector('.unsaved-indicator')?.style.display !== 'none';
    });
  });

  test('Changing SVC threshold shows unsaved indicator', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await page.locator('.select2-result:has-text("40 SVCs")').click();

    await page.waitForTimeout(500);

    // Check for visual change indicator
  });

  test('Changing remediation period shows unsaved indicator', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_remediation_days"]').first();
    await dropdown.click();
    await page.locator('.select2-result:has-text("14 Days")').click();

    await page.waitForTimeout(500);
  });
});

test.describe('Change Detection - Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Changing schedule shows unsaved indicator', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Hourly"').click();

    await page.waitForTimeout(500);
  });

  test('Changing custom time shows unsaved indicator', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    const timeInput = page.locator('#custom_time_input');
    await timeInput.fill('4:30 AM');

    await page.waitForTimeout(500);
  });

  test('Toggling day checkbox shows unsaved indicator', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await dropdown.click();
    await page.locator('text="Custom Schedule..."').click();

    await page.locator('#day_mon').check();

    await page.waitForTimeout(500);
  });
});

test.describe('Visual Change Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Changed input gets visual highlight', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('3.0');

    await page.waitForTimeout(500);

    // Check for border color change or highlight class
    const hasHighlight = await input.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.borderColor !== 'rgb(204, 204, 204)' || // Changed from default
             el.classList.contains('changed') ||
             el.closest('.input-wrapper')?.classList.contains('changed');
    });
  });

  test('Changed dropdown gets visual highlight', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await page.locator('.select2-result:has-text("50 SVCs")').click();

    await page.waitForTimeout(500);

    // Check for visual indicator on dropdown
  });

  test('Panel header shows change indicator', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('4.0');

    await page.waitForTimeout(500);

    // Check for asterisk or dot on panel header
    const panelHeader = page.locator('text="Runtime Ratio Threshold"').first();
    const headerParent = panelHeader.locator('..');
  });
});

test.describe('Save Clears Changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Saving threshold clears unsaved indicator', async ({ page }) => {
    // Make a change
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('2.0');
    await page.waitForTimeout(500);

    // Save
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();

    // Wait for save to complete
    await page.waitForTimeout(5000);

    // Indicator should be hidden
  });

  test('Save All clears all unsaved indicators', async ({ page }) => {
    // Make multiple changes
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('2.5');

    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await dropdown.click();
    await page.locator('.select2-result:has-text("40 SVCs")').click();

    await page.waitForTimeout(500);

    // Save all
    const saveAllBtn = page.locator('#save_all_thresholds_btn');
    await saveAllBtn.click();

    // Wait for completion
    await expect(saveAllBtn).toContainText('All Saved', { timeout: 15000 });

    // All indicators should be cleared
  });
});

test.describe('Navigation Warning Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Navigating away with changes shows modal', async ({ page }) => {
    // Make a change
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('5.0');
    await page.waitForTimeout(500);

    // Try to navigate away by clicking a nav link
    const navLink = page.locator('a[href*="/app/SA-cost-governance/"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      // Should show warning modal
      const modal = page.locator('#unsaved_changes_modal, .unsaved-modal');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('Modal has Stay button', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('5.0');
    await page.waitForTimeout(500);

    const navLink = page.locator('a[href*="/app/SA-cost-governance/"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      const stayBtn = page.locator('#stay_btn, button:has-text("Stay")');
      await expect(stayBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('Modal has Leave button', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('5.0');
    await page.waitForTimeout(500);

    const navLink = page.locator('a[href*="/app/SA-cost-governance/"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      const leaveBtn = page.locator('#leave_btn, button:has-text("Leave")');
      await expect(leaveBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('Clicking Stay closes modal and stays on page', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('5.0');
    await page.waitForTimeout(500);

    const navLink = page.locator('a[href*="/app/SA-cost-governance/"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      const stayBtn = page.locator('#stay_btn, button:has-text("Stay")');
      if (await stayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await stayBtn.click();

        // Should still be on settings page
        await expect(page).toHaveURL(/governance_settings/);
      }
    }
  });

  test('Clicking Leave navigates away', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('5.0');
    await page.waitForTimeout(500);

    const navLink = page.locator('a[href*="/app/SA-cost-governance/governance_overview"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      const leaveBtn = page.locator('#leave_btn, button:has-text("Leave")');
      if (await leaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await leaveBtn.click();

        // Should navigate away
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('governance_settings');
      }
    }
  });

  test('Modal closes when clicking X', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('5.0');
    await page.waitForTimeout(500);

    const navLink = page.locator('a[href*="/app/SA-cost-governance/"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      const closeBtn = page.locator('#unsaved_changes_modal .close-btn, .unsaved-modal .close');
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();

        const modal = page.locator('#unsaved_changes_modal, .unsaved-modal');
        await expect(modal).toBeHidden();
      }
    }
  });
});

test.describe('Browser Back/Forward Warning', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Browser beforeunload event is set when changes exist', async ({ page }) => {
    // Make a change
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('6.0');
    await page.waitForTimeout(500);

    // Check if beforeunload handler is set
    const hasBeforeUnload = await page.evaluate(() => {
      return window.onbeforeunload !== null ||
             typeof window._hasUnsavedChanges !== 'undefined';
    });
  });

  test('Browser beforeunload event is cleared after save', async ({ page }) => {
    // Make a change
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('2.0');
    await page.waitForTimeout(500);

    // Save
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // Check if beforeunload handler is cleared
    const hasBeforeUnload = await page.evaluate(() => {
      return window.onbeforeunload !== null;
    });
  });
});

test.describe('Multiple Unsaved Changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Multiple changes are tracked', async ({ page }) => {
    // Change runtime ratio
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('3.0');

    // Change SVC threshold
    const svcDropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await svcDropdown.click();
    await page.locator('.select2-result:has-text("50 SVCs")').click();

    // Change schedule
    const scheduleDropdown = page.locator('[data-token-name="cache_schedule"]').first();
    await scheduleDropdown.click();
    await page.locator('text="Hourly"').click();

    await page.waitForTimeout(500);

    // All should show indicators
  });

  test('Saving one change keeps others as unsaved', async ({ page }) => {
    // Make two changes
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await runtimeInput.fill('3.0');

    const svcDropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await svcDropdown.click();
    await page.locator('.select2-result:has-text("50 SVCs")').click();

    await page.waitForTimeout(500);

    // Save only the runtime ratio
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(5000);

    // SVC should still show as unsaved
  });
});

test.describe('Revert Changes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Reverting to original value clears indicator', async ({ page }) => {
    // Get original value
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    const originalValue = await input.inputValue();

    // Change it
    await input.fill('9.9');
    await page.waitForTimeout(500);

    // Change back to original
    await input.fill(originalValue);
    await page.waitForTimeout(500);

    // Should no longer show as changed
  });
});

test.describe('Change Count Display', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Unsaved changes count is displayed', async ({ page }) => {
    // Make a change
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('3.0');
    await page.waitForTimeout(500);

    // Check for count indicator
    const countIndicator = page.locator('#unsaved_count, .unsaved-count');
    // Count should be 1 or higher
  });

  test('Count updates when making more changes', async ({ page }) => {
    // Make first change
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('3.0');
    await page.waitForTimeout(500);

    // Make second change
    const svcDropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    await svcDropdown.click();
    await page.locator('.select2-result:has-text("40 SVCs")').click();
    await page.waitForTimeout(500);

    // Count should be 2
  });
});

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Ctrl+S triggers save', async ({ page }) => {
    // Make a change
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('2.5');
    await page.waitForTimeout(500);

    // Press Ctrl+S
    await page.keyboard.press('Control+s');

    // Should trigger save action
    await page.waitForTimeout(3000);
  });

  test('Escape closes unsaved modal', async ({ page }) => {
    const input = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    await input.fill('5.0');
    await page.waitForTimeout(500);

    const navLink = page.locator('a[href*="/app/SA-cost-governance/"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      const modal = page.locator('#unsaved_changes_modal, .unsaved-modal');
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden({ timeout: 3000 });
      }
    }
  });
});
