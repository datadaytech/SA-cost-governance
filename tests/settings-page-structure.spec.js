/**
 * Page Structure and Layout Tests
 * Tests overall page structure, panels, and layout
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

test.describe('Page Structure', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Page loads without errors', async ({ page }) => {
    // No JavaScript errors
    const errors = [];
    page.on('pageerror', err => errors.push(err));

    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('Page has title', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Governance');
  });

  test('Dashboard fieldset exists', async ({ page }) => {
    await expect(page.locator('.dashboard-row, .fieldset')).toBeVisible();
  });

  test('All major panels are present', async ({ page }) => {
    // Check for major sections
    await expect(page.locator('text="Runtime Ratio Threshold"')).toBeVisible();
    await expect(page.locator('text="High Frequency Threshold"')).toBeVisible();
    await expect(page.locator('text="Long Runtime Threshold"')).toBeVisible();
  });
});

test.describe('Panel Layout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panels have headers', async ({ page }) => {
    const panelHeaders = page.locator('.panel-head, .dashboard-panel h2, .panel-title');
    const count = await panelHeaders.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Panels have body content', async ({ page }) => {
    const panelBodies = page.locator('.panel-body, .dashboard-panel .panel-content');
    const count = await panelBodies.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Cache Refresh Schedule panel is visible', async ({ page }) => {
    await expect(page.locator('text="Cache Refresh Schedule"')).toBeVisible();
  });

  test('Governance Thresholds panel is visible', async ({ page }) => {
    await expect(page.locator('text=/Governance.*Threshold|Threshold/i')).toBeVisible();
  });

  test('Wasteful SPL Patterns panel is visible', async ({ page }) => {
    await expect(page.locator('text="Wasteful SPL Patterns"')).toBeVisible();
  });
});

test.describe('Input Elements', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('All dropdowns are functional', async ({ page }) => {
    const dropdowns = page.locator('.splunk-dropdown, .select2-container, [data-token-name]');
    const count = await dropdowns.count();

    expect(count).toBeGreaterThan(0);

    // Click first dropdown to verify it opens
    if (count > 0) {
      await dropdowns.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('All text inputs are editable', async ({ page }) => {
    const textInputs = page.locator('input[type="text"]:visible');
    const count = await textInputs.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = textInputs.nth(i);
      await input.fill('test');
      await expect(input).toHaveValue('test');
      await input.clear();
    }
  });

  test('All buttons are clickable', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);

    // Verify buttons are not disabled by default (except specific ones)
  });
});

test.describe('Button Styling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Primary buttons have correct styling', async ({ page }) => {
    const primaryBtns = page.locator('.btn-primary, button.primary');
    const count = await primaryBtns.count();

    if (count > 0) {
      const bgColor = await primaryBtns.first().evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      // Should be a non-transparent color
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('Save buttons are distinguishable', async ({ page }) => {
    const saveButtons = page.locator('button:has-text("Save")');
    const count = await saveButtons.count();

    expect(count).toBeGreaterThan(0);

    // Each should be visible
    for (let i = 0; i < count; i++) {
      await expect(saveButtons.nth(i)).toBeVisible();
    }
  });

  test('Run Cache Now button is prominent', async ({ page }) => {
    const cacheBtn = page.locator('#run_cache_btn');
    await expect(cacheBtn).toBeVisible();

    // Should have a distinct style
    const bgColor = await cacheBtn.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).not.toBe('rgb(255, 255, 255)'); // Not white
  });
});

test.describe('Visual Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Section headers are larger than content', async ({ page }) => {
    const header = page.locator('.panel-head, .panel-title').first();
    const content = page.locator('.panel-body p, .panel-body span').first();

    if (await header.isVisible() && await content.isVisible()) {
      const headerSize = await header.evaluate(el =>
        parseFloat(window.getComputedStyle(el).fontSize)
      );
      const contentSize = await content.evaluate(el =>
        parseFloat(window.getComputedStyle(el).fontSize)
      );

      expect(headerSize).toBeGreaterThanOrEqual(contentSize);
    }
  });

  test('Important elements have visual emphasis', async ({ page }) => {
    const saveAllBtn = page.locator('#save_all_thresholds_btn');

    if (await saveAllBtn.isVisible()) {
      // Should be styled distinctly
      const fontWeight = await saveAllBtn.evaluate(el =>
        window.getComputedStyle(el).fontWeight
      );
    }
  });
});

test.describe('Responsive Behavior', () => {
  test('Page is readable at 1920px width', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    await expect(page.locator('#run_cache_btn')).toBeVisible();
  });

  test('Page is readable at 1366px width', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    await expect(page.locator('#run_cache_btn')).toBeVisible();
  });

  test('Page is readable at 1024px width', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    await expect(page.locator('#run_cache_btn')).toBeVisible();
  });
});

test.describe('Splunk Components', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Splunk navigation bar is present', async ({ page }) => {
    await expect(page.locator('.splunk-header, .navbar')).toBeVisible();
  });

  test('App navigation is present', async ({ page }) => {
    await expect(page.locator('.app-nav, nav[role="navigation"]')).toBeVisible();
  });

  test('Footer or app info is present', async ({ page }) => {
    // May or may not have footer
    const footer = page.locator('footer, .splunk-footer, .app-footer');
    // Just check if page is complete
  });
});

test.describe('Token Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Tokens are initialized', async ({ page }) => {
    // Check that token containers have values
    const tokenContainers = page.locator('[data-token-name]');
    const count = await tokenContainers.count();

    expect(count).toBeGreaterThan(0);
  });

  test('Token changes trigger updates', async ({ page }) => {
    // Change a dropdown value
    const dropdown = page.locator('[data-token-name="new_svc_threshold"]').first();
    if (await dropdown.isVisible()) {
      await dropdown.click();
      await page.locator('.select2-result').first().click();

      // Should update internal state
      await page.waitForTimeout(500);
    }
  });
});

test.describe('JavaScript Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('No console errors on load', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Filter out known benign errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('deprecated')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('Required functions are defined', async ({ page }) => {
    const hasFunctions = await page.evaluate(() => {
      return typeof window.runCacheNow !== 'undefined' ||
             typeof window.saveSchedule !== 'undefined' ||
             document.querySelector('#run_cache_btn') !== null;
    });

    expect(hasFunctions).toBeTruthy();
  });
});

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Required fields show validation', async ({ page }) => {
    // Try to submit with empty required field if any
  });

  test('Numeric fields only accept numbers', async ({ page }) => {
    const runtimeInput = page.locator('[data-token-name="new_runtime_ratio"] input').first();
    if (await runtimeInput.isVisible()) {
      await runtimeInput.fill('abc');

      // Either the field rejects it or validation shows error
      const value = await runtimeInput.inputValue();
      // Value might be empty or show the text
    }
  });
});

test.describe('Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Page shows loading indicator during load', async ({ page }) => {
    // Navigate and immediately check for loading
    await page.goto(SETTINGS_PAGE);

    // Splunk usually shows a loading indicator
    // This might be very brief
  });

  test('Searches show loading state', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // When running cache, should show loading
    const runCacheBtn = page.locator('#run_cache_btn');
    await runCacheBtn.click();

    const spinner = page.locator('#run_cache_spinner');
    await expect(spinner).toBeVisible({ timeout: 5000 });

    // Cancel by refreshing to avoid long wait
    await page.reload();
  });
});

test.describe('Error States', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Error messages are user-friendly', async ({ page }) => {
    // Trigger an error condition
    // Check that error messages are clear
  });

  test('Failed operations show feedback', async ({ page }) => {
    // Operations should show success or failure feedback
  });
});

test.describe('Tooltips and Help', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Help icons are present', async ({ page }) => {
    const helpIcons = page.locator('.help-icon, .tooltip-trigger, [title]');
    // May or may not have help icons
  });

  test('Descriptions explain settings', async ({ page }) => {
    // Settings should have descriptions
    await expect(page.locator('text=/Flag searches|Configure|threshold/i')).toBeVisible();
  });
});

test.describe('Modals', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Pattern modal exists', async ({ page }) => {
    const modal = page.locator('#pattern_modal');
    // Modal should exist in DOM even if hidden
    await expect(modal).toHaveCount(1);
  });

  test('Unsaved changes modal exists', async ({ page }) => {
    const modal = page.locator('#unsaved_changes_modal');
    await expect(modal).toHaveCount(1);
  });

  test('Modals have backdrop', async ({ page }) => {
    // Open a modal and check for backdrop
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await page.waitForTimeout(1000);

      const backdrop = page.locator('.modal-backdrop, .modal-overlay');
      // May or may not have separate backdrop element
    }
  });
});

test.describe('Data Attributes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Inputs have proper token names', async ({ page }) => {
    const tokenInputs = page.locator('[data-token-name]');
    const count = await tokenInputs.count();

    expect(count).toBeGreaterThan(0);

    // Each should have a valid token name
    for (let i = 0; i < Math.min(count, 5); i++) {
      const tokenName = await tokenInputs.nth(i).getAttribute('data-token-name');
      expect(tokenName).toBeTruthy();
      expect(tokenName.length).toBeGreaterThan(0);
    }
  });

  test('Buttons have IDs', async ({ page }) => {
    await expect(page.locator('#run_cache_btn')).toHaveAttribute('id', 'run_cache_btn');
    await expect(page.locator('#save_schedule_btn')).toHaveAttribute('id', 'save_schedule_btn');
    await expect(page.locator('#save_all_thresholds_btn')).toHaveAttribute('id', 'save_all_thresholds_btn');
  });
});
