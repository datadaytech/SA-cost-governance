// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8002';
const EXERCISES_URL = `${BASE_URL}/en-US/app/splunk-innovators-toolkit/hands_on_exercises`;
const USERNAME = 'admin';
const PASSWORD = 'changeme123';

test.describe('Hands-On Exercises Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(EXERCISES_URL);

    if (page.url().includes('account/login')) {
      await page.fill('input[name="username"]', USERNAME);
      await page.fill('input[name="password"]', PASSWORD);
      await page.click('input[type="submit"]');
      await page.waitForURL(/hands_on_exercises/, { timeout: 30000 });
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('Exercise 1 - Hint button works', async ({ page }) => {
    // Check initial hint counter
    const hintBtn = page.locator('#ex1-hint');
    const hintCounter = page.locator('#ex1-hint-count');
    
    console.log('Initial hint counter:', await hintCounter.textContent());
    expect(await hintCounter.textContent()).toBe('0/2');
    
    // Click hint button first time
    await hintBtn.click();
    await page.waitForTimeout(500);
    
    const codeAfterHint1 = await page.locator('#ex1-code').inputValue();
    console.log('Code after hint 1:', codeAfterHint1);
    console.log('Hint counter after 1st click:', await hintCounter.textContent());
    
    expect(await hintCounter.textContent()).toBe('1/2');
    expect(codeAfterHint1).toContain('success');
    
    // Click hint button second time
    await hintBtn.click();
    await page.waitForTimeout(1000);
    
    const codeAfterHint2 = await page.locator('#ex1-code').inputValue();
    console.log('Code after hint 2:', codeAfterHint2);
    console.log('Hint counter after 2nd click:', await hintCounter.textContent());
    
    expect(await hintCounter.textContent()).toBe('2/2');
    expect(codeAfterHint2).toContain('Well Done!');
    
    // Check if output appeared (auto-executed)
    await page.waitForTimeout(1000);
    const output = page.locator('#ex1-output');
    const outputVisible = await output.isVisible();
    console.log('Output visible after auto-execute:', outputVisible);
  });

  test('Exercise 1 - Run button works', async ({ page }) => {
    const codeEditor = page.locator('#ex1-code');
    const runBtn = page.locator('#ex1-run');

    // Enter correct code using the proper toast API
    await codeEditor.fill(`toast.success('You completed your first exercise!', {
  title: 'Well Done!'
});`);
    
    await runBtn.click();
    await page.waitForTimeout(1000);
    
    // Check if toast appeared
    const toast = page.locator('.sit-toast');
    const toastVisible = await toast.isVisible();
    console.log('Toast visible:', toastVisible);
    
    // Check if output appeared
    const output = page.locator('#ex1-output');
    const outputVisible = await output.isVisible();
    console.log('Output visible:', outputVisible);
    
    expect(outputVisible).toBe(true);
  });

  test('Exercise 2 - Hint and Run work', async ({ page }) => {
    const hintBtn = page.locator('#ex2-hint');
    const runBtn = page.locator('#ex2-run');
    
    // Click hint twice to get full solution
    await hintBtn.click();
    await page.waitForTimeout(300);
    await hintBtn.click();
    await page.waitForTimeout(1500);
    
    // Check if modal appeared
    const modal = page.locator('.sit-modal-backdrop');
    const modalVisible = await modal.isVisible();
    console.log('Modal visible:', modalVisible);
    
    // Check if output appeared
    const output = page.locator('#ex2-output');
    const outputVisible = await output.isVisible();
    console.log('Output visible:', outputVisible);
    
    expect(modalVisible).toBe(true);
  });

  test('Exercise 3 - Hint and Run work', async ({ page }) => {
    const hintBtn = page.locator('#ex3-hint');
    
    // Click hint twice
    await hintBtn.click();
    await page.waitForTimeout(300);
    await hintBtn.click();
    await page.waitForTimeout(1500);
    
    // Check if confirm dialog appeared
    const modal = page.locator('.sit-modal-backdrop');
    const modalVisible = await modal.isVisible();
    console.log('Confirm dialog visible:', modalVisible);
    
    expect(modalVisible).toBe(true);
    
    // Click OK button
    if (modalVisible) {
      const okBtn = page.locator('.sit-modal-footer .sit-btn-primary');
      await okBtn.click();
      await page.waitForTimeout(1000);
      
      // Check if output appeared
      const output = page.locator('#ex3-output');
      const outputVisible = await output.isVisible();
      console.log('Output visible after confirm:', outputVisible);
    }
  });

  test('Reset button works', async ({ page }) => {
    const hintBtn = page.locator('#ex1-hint');
    const resetBtn = page.locator('#ex1-reset');
    const codeEditor = page.locator('#ex1-code');
    const hintCounter = page.locator('#ex1-hint-count');
    
    // Click hint to change code
    await hintBtn.click();
    await page.waitForTimeout(300);
    
    const codeAfterHint = await codeEditor.inputValue();
    console.log('Code after hint:', codeAfterHint);
    
    // Click reset
    await resetBtn.click();
    await page.waitForTimeout(300);
    
    const codeAfterReset = await codeEditor.inputValue();
    console.log('Code after reset:', codeAfterReset);
    console.log('Hint counter after reset:', await hintCounter.textContent());
    
    expect(await hintCounter.textContent()).toBe('0/2');
  });

});
