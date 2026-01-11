// @ts-check
const { test, expect } = require('@playwright/test');

const SPLUNK_USER = process.env.SPLUNK_USER || 'admin';
const SPLUNK_PASS = process.env.SPLUNK_PASS || 'changeme123';

test.describe('SA Topology Settings Page', () => {

  test.beforeEach(async ({ page }) => {
    // Login to Splunk
    await page.goto('/en-US/account/login');
    await page.waitForLoadState('networkidle');

    const usernameField = await page.locator('input[name="username"]');
    if (await usernameField.isVisible()) {
      await usernameField.fill(SPLUNK_USER);
      await page.locator('input[name="password"]').fill(SPLUNK_PASS);
      await page.locator('button[type="submit"], input[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }
  });

  test('Settings page is accessible from navigation', async ({ page }) => {
    // Go to main app page
    await page.goto('/en-US/app/sa-topology/topology');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of nav
    await page.screenshot({ path: 'tests/screenshots/nav-before-settings.png', fullPage: true });

    // Check if Settings link exists in nav
    const settingsLink = page.locator('a[href*="settings"], nav a:has-text("Settings")');
    const settingsCount = await settingsLink.count();
    console.log('Settings links found in nav:', settingsCount);

    // Try to find nav items
    const navItems = await page.locator('.nav a, [data-view]').allTextContents();
    console.log('Nav items:', navItems);
  });

  test('Settings page loads directly', async ({ page }) => {
    // Navigate directly to settings page
    const response = await page.goto('/en-US/app/sa-topology/settings');

    console.log('Settings page response status:', response?.status());

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/settings-page.png', fullPage: true });

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check for settings content
    const pageContent = await page.content();
    console.log('Page contains "Settings":', pageContent.includes('Settings'));
    console.log('Page contains "Schedule":', pageContent.includes('Schedule'));
    console.log('Page contains "error":', pageContent.toLowerCase().includes('error'));
    console.log('Page contains "not found":', pageContent.toLowerCase().includes('not found'));

    // Check if we got a 200 response
    expect(response?.status()).toBe(200);
  });

  test('Check app views list', async ({ page }) => {
    // Check what views are available in the app
    const response = await page.goto('/en-US/app/sa-topology/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('App home response:', response?.status());

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/app-home.png', fullPage: true });

    // Get all links on the page
    const links = await page.locator('a').allTextContents();
    console.log('Links on page:', links.filter(l => l.trim()));
  });

  test('Check static files for settings', async ({ page }) => {
    // Check if settings.js is accessible
    const jsResponse = await page.goto('/static/app/sa-topology/settings.js');
    console.log('settings.js status:', jsResponse?.status());

    // Check if settings.css is accessible
    const cssResponse = await page.goto('/static/app/sa-topology/settings.css');
    console.log('settings.css status:', cssResponse?.status());
  });

});
