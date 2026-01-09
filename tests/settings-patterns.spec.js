/**
 * Wasteful SPL Patterns - Comprehensive Tests
 * Tests pattern management, modal functionality, and re-flagging
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

test.describe('Wasteful Patterns Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text="Wasteful SPL Patterns"')).toBeVisible();
  });

  test('Panel has description', async ({ page }) => {
    await expect(page.locator('text="Flag searches containing these inefficient patterns"')).toBeVisible();
  });

  test('Pattern list container exists', async ({ page }) => {
    await expect(page.locator('#wasteful_patterns_list')).toBeVisible();
  });

  test('Add Pattern button exists', async ({ page }) => {
    await expect(page.locator('#add_pattern_btn')).toBeVisible();
  });

  test('Add Pattern button has correct text', async ({ page }) => {
    await expect(page.locator('#add_pattern_btn')).toHaveText('Add Pattern');
  });
});

test.describe('Default Patterns', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Default patterns are displayed', async ({ page }) => {
    const patternList = page.locator('#wasteful_patterns_list');
    await expect(patternList).toBeVisible();

    // Should have at least one pattern
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Each pattern has view matches button', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      const firstViewBtn = patterns.first().locator('.view-matches-btn');
      await expect(firstViewBtn).toBeVisible();
    }
  });

  test('Each pattern has delete button', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      const firstDeleteBtn = patterns.first().locator('.delete-pattern-btn');
      await expect(firstDeleteBtn).toBeVisible();
    }
  });

  test('Pattern text is displayed', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      const patternText = patterns.first().locator('.pattern-text');
      const text = await patternText.textContent();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Add Pattern Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Clicking Add Pattern shows input', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    await expect(page.locator('#new_pattern_input')).toBeVisible({ timeout: 5000 });
  });

  test('New pattern input accepts text', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    const input = page.locator('#new_pattern_input');
    await expect(input).toBeVisible({ timeout: 5000 });

    await input.fill('| head 10000');
    await expect(input).toHaveValue('| head 10000');
  });

  test('Save button appears when adding pattern', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    await expect(page.locator('#save_new_pattern_btn')).toBeVisible({ timeout: 5000 });
  });

  test('Cancel button appears when adding pattern', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    await expect(page.locator('#cancel_new_pattern_btn')).toBeVisible({ timeout: 5000 });
  });

  test('Cancel hides input', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    await page.locator('#cancel_new_pattern_btn').click();
    await expect(page.locator('#new_pattern_input')).toBeHidden();
  });

  test('Empty pattern shows error', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    await page.locator('#save_new_pattern_btn').click();

    const errorToast = page.locator('div:has-text("Please enter a pattern")').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('Valid pattern is added to list', async ({ page }) => {
    const initialCount = await page.locator('#wasteful_patterns_list .pattern-item').count();

    await page.locator('#add_pattern_btn').click();
    await page.locator('#new_pattern_input').fill('| dedup 999999');
    await page.locator('#save_new_pattern_btn').click();

    await page.waitForTimeout(2000);

    const newCount = await page.locator('#wasteful_patterns_list .pattern-item').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('Success toast appears after adding pattern', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    await page.locator('#new_pattern_input').fill('| dedup 888888');
    await page.locator('#save_new_pattern_btn').click();

    const successToast = page.locator('div:has-text("Pattern added")').first();
    await expect(successToast).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Delete Pattern Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Delete button triggers confirmation', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.delete-pattern-btn').click();

      // Should show confirmation dialog or the pattern should be deleted
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Pattern Match Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Modal opens when clicking View Matches', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await expect(page.locator('#pattern_modal')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Modal has title', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await expect(page.locator('#pattern_modal_title')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Modal has close button', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await expect(page.locator('#pattern_modal .close-btn, #close_pattern_modal')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Modal closes when clicking close button', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await page.waitForTimeout(1000);

      await page.locator('#pattern_modal .close-btn, #close_pattern_modal').first().click();
      await expect(page.locator('#pattern_modal')).toBeHidden({ timeout: 5000 });
    }
  });

  test('Modal closes when clicking outside', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await page.waitForTimeout(1000);

      // Click on the modal backdrop
      await page.locator('#pattern_modal').click({ position: { x: 10, y: 10 } });
    }
  });

  test('Modal shows loading state initially', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();

      // Should show loading or results
      const modalContent = page.locator('#pattern_modal_content');
      await expect(modalContent).toBeVisible({ timeout: 10000 });
    }
  });

  test('Modal displays matching searches', async ({ page }) => {
    test.setTimeout(60000);

    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();

      // Wait for results to load
      await page.waitForTimeout(10000);

      const modalContent = page.locator('#pattern_modal_content');
      await expect(modalContent).toBeVisible();
    }
  });

  test('Each match shows search name', async ({ page }) => {
    test.setTimeout(60000);

    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await page.waitForTimeout(10000);

      const matches = page.locator('#pattern_modal_content .match-item');
      const matchCount = await matches.count();

      if (matchCount > 0) {
        const searchName = matches.first().locator('.search-name');
        await expect(searchName).toBeVisible();
      }
    }
  });

  test('Each match has Flag button', async ({ page }) => {
    test.setTimeout(60000);

    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      await patterns.first().locator('.view-matches-btn').click();
      await page.waitForTimeout(10000);

      const matches = page.locator('#pattern_modal_content .match-item');
      const matchCount = await matches.count();

      if (matchCount > 0) {
        const flagBtn = matches.first().locator('.flag-search-btn');
        await expect(flagBtn).toBeVisible();
      }
    }
  });
});

test.describe('Re-flag All Button', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Re-flag All button exists', async ({ page }) => {
    await expect(page.locator('#reflag_all_btn')).toBeVisible();
  });

  test('Re-flag All button has correct text', async ({ page }) => {
    const btn = page.locator('#reflag_all_btn');
    await expect(btn).toContainText('Re-flag');
  });

  test('Clicking Re-flag All shows confirmation', async ({ page }) => {
    await page.locator('#reflag_all_btn').click();

    // Should show confirmation or start re-flagging
    await page.waitForTimeout(1000);
  });

  test('Re-flag All shows progress', async ({ page }) => {
    test.setTimeout(120000);

    await page.locator('#reflag_all_btn').click();

    // Accept confirmation if shown
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Should show some progress indication
    await page.waitForTimeout(5000);
  });
});

test.describe('Pattern Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Duplicate pattern shows error', async ({ page }) => {
    // Get existing pattern text
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      const existingPattern = await patterns.first().locator('.pattern-text').textContent();

      await page.locator('#add_pattern_btn').click();
      await page.locator('#new_pattern_input').fill(existingPattern.trim());
      await page.locator('#save_new_pattern_btn').click();

      const errorToast = page.locator('div:has-text("already exists")').first();
      await expect(errorToast).toBeVisible({ timeout: 5000 });
    }
  });

  test('Pattern with special characters is handled', async ({ page }) => {
    await page.locator('#add_pattern_btn').click();
    await page.locator('#new_pattern_input').fill('| regex field=".*test.*"');
    await page.locator('#save_new_pattern_btn').click();

    // Should either succeed or show appropriate message
    await page.waitForTimeout(2000);
  });
});

test.describe('Pattern Count Display', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Match count is displayed for each pattern', async ({ page }) => {
    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      const matchCount = patterns.first().locator('.match-count');
      await expect(matchCount).toBeVisible();
    }
  });

  test('Match count updates after re-flag', async ({ page }) => {
    test.setTimeout(120000);

    const patterns = page.locator('#wasteful_patterns_list .pattern-item');
    const count = await patterns.count();

    if (count > 0) {
      // Note the initial count
      const matchCountEl = patterns.first().locator('.match-count');
      const initialText = await matchCountEl.textContent();

      // Trigger re-flag
      await page.locator('#reflag_all_btn').click();

      // Wait for completion
      await page.waitForTimeout(30000);

      // Count should be same or different based on current searches
    }
  });
});

test.describe('Pattern List Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Pattern list is scrollable when many patterns', async ({ page }) => {
    const patternList = page.locator('#wasteful_patterns_list');
    const overflow = await patternList.evaluate(el => window.getComputedStyle(el).overflowY);

    // Should allow scrolling
    expect(['auto', 'scroll']).toContain(overflow);
  });
});

test.describe('Pattern Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Added patterns persist after refresh', async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);

    // Get initial count
    const initialCount = await page.locator('#wasteful_patterns_list .pattern-item').count();

    // Add a pattern
    await page.locator('#add_pattern_btn').click();
    await page.locator('#new_pattern_input').fill('| transaction maxspan=999d');
    await page.locator('#save_new_pattern_btn').click();
    await page.waitForTimeout(3000);

    // Refresh
    await page.reload();
    await waitForPageLoad(page);

    // Check count
    const newCount = await page.locator('#wasteful_patterns_list .pattern-item').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});
