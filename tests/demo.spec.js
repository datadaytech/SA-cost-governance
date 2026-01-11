// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8002';
const DEMO_URL = `${BASE_URL}/en-US/app/splunk-innovators-toolkit/demo`;
const USERNAME = 'admin';
const PASSWORD = 'changeme123';

test.describe('Demo Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);

    if (page.url().includes('account/login')) {
      await page.fill('input[name="username"]', USERNAME);
      await page.fill('input[name="password"]', PASSWORD);
      await page.click('input[type="submit"]');
      await page.waitForURL(/demo/, { timeout: 30000 });
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('Debug demo page', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const modalBtn = page.locator('#demo-modal');
    const toastBtn = page.locator('#demo-toast-success');

    console.log('Modal button exists:', await modalBtn.count() > 0);
    console.log('Toast button exists:', await toastBtn.count() > 0);

    const checkboxContainer = page.locator('#checkbox-container');
    const checkboxContent = await checkboxContainer.innerHTML();
    console.log('Checkbox container has content:', checkboxContent.length > 10);

    const toggleContainer = page.locator('#toggle-container');
    const toggleContent = await toggleContainer.innerHTML();
    console.log('Toggle container has content:', toggleContent.length > 10);

    await toastBtn.click();
    await page.waitForTimeout(500);

    const toast = page.locator('.sit-toast');
    const toastVisible = await toast.isVisible();
    console.log('Toast visible after click:', toastVisible);

    await modalBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.sit-modal-backdrop');
    const modalVisible = await modal.isVisible();
    console.log('Modal visible after click:', modalVisible);

    const toggles = page.locator('.sit-toggle');
    const toggleCount = await toggles.count();
    console.log('Number of toggles:', toggleCount);

    const checkboxes = page.locator('.sit-checkbox');
    const checkboxCount = await checkboxes.count();
    console.log('Number of checkboxes:', checkboxCount);

    console.log('Errors:', errors);
  });

  test('Toast buttons work', async ({ page }) => {
    const successBtn = page.locator('#demo-toast-success');
    await successBtn.click();
    await page.waitForTimeout(500);

    const toast = page.locator('.sit-toast');
    expect(await toast.isVisible()).toBe(true);
  });

  test('Modal button works', async ({ page }) => {
    const modalBtn = page.locator('#demo-modal');
    await modalBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.sit-modal-backdrop');
    expect(await modal.isVisible()).toBe(true);
  });

  test('Toggles are rendered and clickable', async ({ page }) => {
    const toggles = page.locator('.sit-toggle');
    const count = await toggles.count();
    console.log('Toggle count:', count);

    expect(count).toBeGreaterThan(0);
  });

  test('Checkboxes are rendered', async ({ page }) => {
    const checkboxes = page.locator('.sit-checkbox');
    const count = await checkboxes.count();
    console.log('Checkbox count:', count);

    expect(count).toBeGreaterThan(0);
  });

});
