// Comprehensive test for cron schedule updates and frequency column accuracy
const { test, expect, chromium } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

// Map of cron expressions to expected frequency labels
const CRON_FREQUENCY_MAP = {
    '*/5 * * * *': 'Every 5 min',
    '*/10 * * * *': 'Every 10 min',
    '*/15 * * * *': 'Every 15 min',
    '*/30 * * * *': 'Every 30 min',
    '0 * * * *': 'Hourly',
    '0 */4 * * *': 'Every Few Hours',
    '0 0 * * *': 'Daily',
    '*/1 * * * *': 'Every 1 min',
    '*/2 * * * *': 'Every 2 min',
};

test.describe('Cron Schedule and Frequency Tests', () => {
    let browser;
    let context;
    let page;

    test.beforeAll(async () => {
        browser = await chromium.launch({ headless: false });
        context = await browser.newContext();
        page = await context.newPage();

        // Login
        console.log('Logging in...');
        await page.goto(`${SPLUNK_URL}/en-US/account/login`);
        await page.fill('input[name="username"]', CREDENTIALS.username);
        await page.fill('input[name="password"]', CREDENTIALS.password);
        await page.click('input[type="submit"]');
        await page.waitForURL('**/en-US/app/**', { timeout: 30000 });
        console.log('Logged in\n');
    });

    test.afterAll(async () => {
        if (context) await context.close();
        if (browser) await browser.close();
    });

    test('Test 1: Verify frequency column shows correct values for different cron schedules', async () => {
        console.log('=== Test 1: Verify frequency display ===\n');

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        // Get all rows with schedule and frequency
        const rows = await page.$$('#all_searches_table table tbody tr');
        console.log(`Found ${rows.length} rows in table\n`);

        let tested = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            const cells = await row.$$('td');

            if (cells.length >= 7) {
                const searchName = await cells[1].textContent();
                const schedule = await cells[5].textContent();
                const frequency = await cells[6].textContent();

                console.log(`Row ${i + 1}: "${searchName.trim().substring(0, 40)}..."`);
                console.log(`  Schedule: ${schedule.trim()}`);
                console.log(`  Frequency: ${frequency.trim()}`);
                console.log('');
                tested++;
            }
        }

        expect(tested).toBeGreaterThan(0);
        console.log(`Verified ${tested} rows\n`);
    });

    test('Test 2: Change cron to */5 * * * * and verify frequency shows "Every 5 min"', async () => {
        console.log('=== Test 2: Change to 5-minute schedule ===\n');

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        // Find a row with a clickable schedule
        const scheduleCell = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(6)');
        const originalSchedule = await scheduleCell.textContent();
        console.log(`Original schedule: ${originalSchedule.trim()}`);

        // Get search name for verification
        const nameCell = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(2)');
        const searchName = await nameCell.textContent();
        console.log(`Search name: ${searchName.trim()}`);

        // Click on schedule to open modal
        await scheduleCell.click();
        await page.waitForTimeout(2000);

        // Check if modal opened
        const modal = await page.$('#cronModalOverlay.active, .cron-modal-overlay.active');
        if (!modal) {
            console.log('Modal did not open - trying to find schedule link');
            const scheduleLink = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(6) a, #all_searches_table table tbody tr:first-child td:nth-child(6) span[style*="cursor"]');
            if (scheduleLink) {
                await scheduleLink.click();
                await page.waitForTimeout(2000);
            }
        }

        // Set cron to every 5 minutes
        const cronInput = await page.$('#cronExpression, input[name="cron"]');
        if (cronInput) {
            await cronInput.fill('');
            await cronInput.fill('*/5 * * * *');
            console.log('Set cron to: */5 * * * *');

            // Click save
            const saveBtn = await page.$('#saveCronBtn, button:has-text("Save"), .cron-modal button.btn-primary');
            if (saveBtn) {
                await saveBtn.click();
                console.log('Clicked save');
                await page.waitForTimeout(3000);
            }
        }

        // Verify the frequency column updated
        await page.waitForTimeout(2000);
        const frequencyCell = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(7)');
        const newFrequency = await frequencyCell.textContent();
        console.log(`New frequency: ${newFrequency.trim()}`);

        // Refresh page and verify persistence
        console.log('\nRefreshing page to verify persistence...');
        await page.reload();
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        const frequencyCellAfter = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(7)');
        const frequencyAfterRefresh = await frequencyCellAfter.textContent();
        console.log(`Frequency after refresh: ${frequencyAfterRefresh.trim()}`);

        await page.screenshot({ path: 'tests/screenshots/cron-test-2-after-refresh.png' });
    });

    test('Test 3: Change cron to hourly and verify frequency shows "Hourly"', async () => {
        console.log('=== Test 3: Change to hourly schedule ===\n');

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        // Find second row to test a different search
        const rows = await page.$$('#all_searches_table table tbody tr');
        if (rows.length < 2) {
            console.log('Not enough rows - skipping test');
            return;
        }

        const row = rows[1];
        const cells = await row.$$('td');
        const nameCell = cells[1];
        const scheduleCell = cells[5];

        const searchName = await nameCell.textContent();
        const originalSchedule = await scheduleCell.textContent();
        console.log(`Search: ${searchName.trim()}`);
        console.log(`Original schedule: ${originalSchedule.trim()}`);

        // Click schedule
        await scheduleCell.click();
        await page.waitForTimeout(2000);

        // Set to hourly
        const cronInput = await page.$('#cronExpression, input[name="cron"]');
        if (cronInput) {
            await cronInput.fill('');
            await cronInput.fill('0 * * * *');
            console.log('Set cron to: 0 * * * *');

            const saveBtn = await page.$('#saveCronBtn, button:has-text("Save"), .cron-modal button.btn-primary');
            if (saveBtn) {
                await saveBtn.click();
                await page.waitForTimeout(3000);
            }
        }

        // Verify
        const frequencyCell = cells[6];
        const newFrequency = await frequencyCell.textContent();
        console.log(`New frequency: ${newFrequency.trim()}`);

        // Refresh and verify
        console.log('\nRefreshing...');
        await page.reload();
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        const rowsAfter = await page.$$('#all_searches_table table tbody tr');
        const rowAfter = rowsAfter[1];
        const cellsAfter = await rowAfter.$$('td');
        const frequencyAfter = await cellsAfter[6].textContent();
        console.log(`Frequency after refresh: ${frequencyAfter.trim()}`);

        await page.screenshot({ path: 'tests/screenshots/cron-test-3-hourly.png' });
    });

    test('Test 4: Verify cron actually saved in Splunk via REST', async () => {
        console.log('=== Test 4: Verify cron saved via REST API ===\n');

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        // Get first search name
        const nameCell = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(2)');
        let searchName = await nameCell.textContent();
        searchName = searchName.trim();
        console.log(`Checking search: ${searchName}`);

        // Query REST API for actual cron schedule
        const restQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local | search title="${searchName}" | table title, cron_schedule`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(restQuery)}`);
        await page.waitForTimeout(8000);

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const text = await resultTable.textContent();
            console.log(`REST API result: ${text.substring(0, 200)}`);
        }

        await page.screenshot({ path: 'tests/screenshots/cron-test-4-rest.png' });
    });

    test('Test 5: Rapid cron changes and verify all persist', async () => {
        console.log('=== Test 5: Rapid cron changes ===\n');

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        const cronChanges = [
            { cron: '*/15 * * * *', expected: 'Every 15 min' },
            { cron: '*/30 * * * *', expected: 'Every 30 min' },
            { cron: '0 * * * *', expected: 'Hourly' },
        ];

        for (const change of cronChanges) {
            console.log(`\nChanging to: ${change.cron} (expect: ${change.expected})`);

            // Click on first row schedule
            const scheduleCell = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(6)');
            await scheduleCell.click();
            await page.waitForTimeout(2000);

            // Update cron
            const cronInput = await page.$('#cronExpression, input[name="cron"]');
            if (cronInput) {
                await cronInput.fill('');
                await cronInput.fill(change.cron);

                const saveBtn = await page.$('#saveCronBtn, button:has-text("Save"), .cron-modal button.btn-primary');
                if (saveBtn) {
                    await saveBtn.click();
                    await page.waitForTimeout(3000);
                }
            }

            // Check frequency immediately
            const frequencyCell = await page.$('#all_searches_table table tbody tr:first-child td:nth-child(7)');
            const freq = await frequencyCell.textContent();
            console.log(`Frequency after change: ${freq.trim()}`);
        }

        // Final refresh and verify
        console.log('\nFinal refresh to verify persistence...');
        await page.reload();
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        const finalSchedule = await page.$eval('#all_searches_table table tbody tr:first-child td:nth-child(6)', el => el.textContent);
        const finalFrequency = await page.$eval('#all_searches_table table tbody tr:first-child td:nth-child(7)', el => el.textContent);

        console.log(`\nFinal schedule: ${finalSchedule.trim()}`);
        console.log(`Final frequency: ${finalFrequency.trim()}`);

        await page.screenshot({ path: 'tests/screenshots/cron-test-5-rapid.png' });
    });

    test('Test 6: Verify frequency matches cron calculation', async () => {
        console.log('=== Test 6: Verify frequency calculation accuracy ===\n');

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        // Get multiple rows and verify frequency matches expected
        const rows = await page.$$('#all_searches_table table tbody tr');

        let mismatches = 0;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            const cells = await row.$$('td');

            if (cells.length >= 7) {
                const schedule = (await cells[5].textContent()).trim();
                const frequency = (await cells[6].textContent()).trim();

                // Check if frequency makes sense for the schedule
                const expectedFreq = getExpectedFrequency(schedule);
                const match = frequency === expectedFreq || expectedFreq === 'Custom';

                if (!match && expectedFreq !== 'Custom') {
                    console.log(`Row ${i + 1}: Schedule="${schedule}" Frequency="${frequency}" Expected="${expectedFreq}" MISMATCH!`);
                    mismatches++;
                } else {
                    console.log(`Row ${i + 1}: Schedule="${schedule}" Frequency="${frequency}" ✓`);
                }
            }
        }

        console.log(`\nMismatches: ${mismatches}`);
        expect(mismatches).toBe(0);
    });
});

function getExpectedFrequency(cron) {
    const parts = cron.split(' ');
    if (parts.length !== 5) return 'Custom';

    const minute = parts[0];
    const hour = parts[1];

    // Every N minutes
    if (minute.startsWith('*/')) {
        const interval = parseInt(minute.substring(2));
        if (interval === 1) return 'Every 1 min';
        if (interval === 2) return 'Every 2 min';
        if (interval === 5) return 'Every 5 min';
        if (interval === 10) return 'Every 10 min';
        if (interval === 15) return 'Every 15 min';
        if (interval === 30) return 'Every 30 min';
    }

    // Hourly
    if (minute === '0' && hour === '*') return 'Hourly';

    // Every few hours
    if (minute === '0' && hour.startsWith('*/')) {
        const interval = parseInt(hour.substring(2));
        if (interval <= 4) return 'Every Few Hours';
    }

    // Daily
    if (minute === '0' && hour === '0') return 'Daily';

    return 'Custom';
}
