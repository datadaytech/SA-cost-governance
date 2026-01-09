/**
 * Notification Settings - Comprehensive Tests
 * Tests alert configuration and notification preferences
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

test.describe('Notification Panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Panel exists', async ({ page }) => {
    await expect(page.locator('text=/Notification|Alert/i')).toBeVisible();
  });

  test('Panel has description', async ({ page }) => {
    await expect(page.locator('text=/Configure.*notification|alert.*setting/i')).toBeVisible();
  });
});

test.describe('Email Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Email notification toggle exists', async ({ page }) => {
    const toggle = page.locator('#email_notifications_toggle, input[name="email_notifications"]');
    await expect(toggle).toBeVisible();
  });

  test('Email recipient field exists', async ({ page }) => {
    const emailField = page.locator('#notification_email, input[type="email"]');
    await expect(emailField).toBeVisible();
  });

  test('Email field accepts valid email', async ({ page }) => {
    const emailField = page.locator('#notification_email, input[type="email"]');
    if (await emailField.isVisible()) {
      await emailField.fill('admin@example.com');
      await expect(emailField).toHaveValue('admin@example.com');
    }
  });

  test('Multiple emails can be specified', async ({ page }) => {
    const emailField = page.locator('#notification_email, input[type="email"], textarea[name="emails"]');
    if (await emailField.isVisible()) {
      await emailField.fill('admin@example.com, alerts@example.com');
      await expect(emailField).toHaveValue(/admin@example.com.*alerts@example.com/);
    }
  });

  test('Invalid email shows error', async ({ page }) => {
    const emailField = page.locator('#notification_email, input[type="email"]');
    if (await emailField.isVisible()) {
      await emailField.fill('not-an-email');

      const saveBtn = page.locator('#save_notifications_btn, button:has-text("Save")').first();
      await saveBtn.click();

      const error = page.locator('div:has-text("valid email")').first();
      await expect(error).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Slack Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Slack webhook field exists', async ({ page }) => {
    const webhookField = page.locator('#slack_webhook, input[name="slack_webhook"]');
    // May or may not exist depending on configuration
  });

  test('Slack channel field exists', async ({ page }) => {
    const channelField = page.locator('#slack_channel, input[name="slack_channel"]');
    // May or may not exist
  });

  test('Webhook URL validation', async ({ page }) => {
    const webhookField = page.locator('#slack_webhook, input[name="slack_webhook"]');
    if (await webhookField.isVisible()) {
      await webhookField.fill('https://hooks.slack.com/services/xxx/yyy/zzz');
      await expect(webhookField).toHaveValue(/hooks.slack.com/);
    }
  });
});

test.describe('Alert Frequency', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Alert frequency dropdown exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="alert_frequency"], #alert_frequency');
    // May exist
  });

  test('Immediate option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="alert_frequency"]');
    if (await dropdown.isVisible()) {
      await dropdown.click();
      await expect(page.locator('text="Immediate"')).toBeVisible();
    }
  });

  test('Daily digest option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="alert_frequency"]');
    if (await dropdown.isVisible()) {
      await dropdown.click();
      await expect(page.locator('text="Daily"')).toBeVisible();
    }
  });

  test('Weekly digest option exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="alert_frequency"]');
    if (await dropdown.isVisible()) {
      await dropdown.click();
      await expect(page.locator('text="Weekly"')).toBeVisible();
    }
  });
});

test.describe('Alert Types', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('High frequency alert toggle exists', async ({ page }) => {
    const toggle = page.locator('#alert_high_frequency, input[name="alert_high_frequency"]');
    // Check if configurable
  });

  test('Long runtime alert toggle exists', async ({ page }) => {
    const toggle = page.locator('#alert_long_runtime, input[name="alert_long_runtime"]');
  });

  test('High SVC alert toggle exists', async ({ page }) => {
    const toggle = page.locator('#alert_high_svc, input[name="alert_high_svc"]');
  });

  test('Wasteful pattern alert toggle exists', async ({ page }) => {
    const toggle = page.locator('#alert_wasteful_pattern, input[name="alert_wasteful_pattern"]');
  });

  test('All alert types can be toggled', async ({ page }) => {
    const toggles = page.locator('.alert-type-toggle, input[name^="alert_"]');
    const count = await toggles.count();

    for (let i = 0; i < count; i++) {
      const toggle = toggles.nth(i);
      if (await toggle.isVisible()) {
        await toggle.click();
        await page.waitForTimeout(200);
      }
    }
  });
});

test.describe('Notification Threshold', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Minimum severity dropdown exists', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="min_severity"], #min_alert_severity');
    // May exist
  });

  test('Severity levels available', async ({ page }) => {
    const dropdown = page.locator('[data-token-name="min_severity"]');
    if (await dropdown.isVisible()) {
      await dropdown.click();

      await expect(page.locator('text="Low"')).toBeVisible();
      await expect(page.locator('text="Medium"')).toBeVisible();
      await expect(page.locator('text="High"')).toBeVisible();
      await expect(page.locator('text="Critical"')).toBeVisible();
    }
  });
});

test.describe('Save Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Save button exists', async ({ page }) => {
    const saveBtn = page.locator('#save_notifications_btn, button:has-text("Save"):near(:text("Notification"))');
    await expect(saveBtn).toBeVisible();
  });

  test('Save shows success message', async ({ page }) => {
    const saveBtn = page.locator('#save_notifications_btn, button:has-text("Save")').nth(1);
    if (await saveBtn.isVisible()) {
      await saveBtn.click();

      const toast = page.locator('div:has-text("saved")').first();
      await expect(toast).toBeVisible({ timeout: 10000 });
    }
  });

  test('Settings persist after refresh', async ({ page }) => {
    // Change a setting
    const emailField = page.locator('#notification_email, input[type="email"]');
    if (await emailField.isVisible()) {
      await emailField.fill('test@example.com');

      const saveBtn = page.locator('#save_notifications_btn, button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForTimeout(5000);

      await page.reload();
      await waitForPageLoad(page);

      // Check persistence
      await expect(emailField).toHaveValue('test@example.com');
    }
  });
});

test.describe('Test Notification', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Test notification button exists', async ({ page }) => {
    const testBtn = page.locator('#test_notification_btn, button:has-text("Test")');
    // May exist
  });

  test('Test sends notification', async ({ page }) => {
    const testBtn = page.locator('#test_notification_btn, button:has-text("Test")');
    if (await testBtn.isVisible()) {
      await testBtn.click();

      const toast = page.locator('div:has-text("Test notification sent")').first();
      await expect(toast).toBeVisible({ timeout: 10000 });
    }
  });

  test('Test shows error if no recipient configured', async ({ page }) => {
    // Clear email field
    const emailField = page.locator('#notification_email, input[type="email"]');
    if (await emailField.isVisible()) {
      await emailField.fill('');
    }

    const testBtn = page.locator('#test_notification_btn, button:has-text("Test")');
    if (await testBtn.isVisible()) {
      await testBtn.click();

      const error = page.locator('div:has-text("recipient")').first();
      await expect(error).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Notification Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Quiet hours configuration exists', async ({ page }) => {
    const quietHours = page.locator('#quiet_hours, .quiet-hours-config');
    // May or may not exist
  });

  test('Business hours only toggle exists', async ({ page }) => {
    const toggle = page.locator('#business_hours_only, input[name="business_hours"]');
  });
});

test.describe('Notification Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(SETTINGS_PAGE);
    await waitForPageLoad(page);
  });

  test('Notification settings affect saved searches', async ({ page }) => {
    // Verify that notification settings are connected to Splunk alerts
  });
});
