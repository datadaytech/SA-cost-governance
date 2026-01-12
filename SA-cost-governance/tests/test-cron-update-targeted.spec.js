// Targeted cron update test with proper modal handling
const { test, expect, chromium } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

test.describe('Cron Update Targeted Tests', () => {
    test('Complete cron update and frequency verification', async () => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        page.on('console', msg => {
            if (msg.text().includes('cron') || msg.text().includes('Cron') || msg.text().includes('schedule')) {
                console.log('>>> Console:', msg.text());
            }
        });

        try {
            // Login
            console.log('Logging in...');
            await page.goto(`${SPLUNK_URL}/en-US/account/login`);
            await page.fill('input[name="username"]', CREDENTIALS.username);
            await page.fill('input[name="password"]', CREDENTIALS.password);
            await page.click('input[type="submit"]');
            await page.waitForURL('**/en-US/app/**', { timeout: 30000 });
            console.log('Logged in\n');

            // Go to scheduled search governance
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
            await page.waitForSelector('#all_searches_table', { timeout: 30000 });
            await page.waitForTimeout(5000);

            // Get initial state
            console.log('=== Initial State ===');
            const initialRows = await getTableData(page);
            console.log('First 5 rows:');
            initialRows.slice(0, 5).forEach((row, i) => {
                console.log(`  ${i + 1}. ${row.name.substring(0, 40)} | ${row.schedule} | ${row.frequency}`);
            });

            // Find a search to test with
            const testSearch = initialRows[0];
            console.log(`\nTest search: ${testSearch.name}`);
            console.log(`Current schedule: ${testSearch.schedule}`);
            console.log(`Current frequency: ${testSearch.frequency}`);

            // Click on the schedule cell to open modal
            console.log('\n=== Opening Cron Modal ===');

            // Find the schedule cell with the cron-link class or clickable element
            const scheduleSelector = '#all_searches_table table tbody tr:first-child td:nth-child(6)';
            await page.waitForSelector(scheduleSelector);

            // Try clicking on the actual clickable element inside
            const clickableElement = await page.$(`${scheduleSelector} .cron-link, ${scheduleSelector} a, ${scheduleSelector} span[style*="cursor"], ${scheduleSelector}`);

            if (clickableElement) {
                await clickableElement.click();
                console.log('Clicked on schedule cell');
            }

            // Wait for modal to appear
            await page.waitForTimeout(2000);

            // Check if modal is open
            let modalVisible = await page.$('#cronModalOverlay.active');
            if (!modalVisible) {
                console.log('Modal not visible, trying double-click...');
                await page.dblclick(scheduleSelector);
                await page.waitForTimeout(2000);
                modalVisible = await page.$('#cronModalOverlay.active');
            }

            if (!modalVisible) {
                console.log('Modal still not visible, trying to find cron-link specifically...');
                const cronLinks = await page.$$('.cron-link');
                if (cronLinks.length > 0) {
                    await cronLinks[0].click();
                    await page.waitForTimeout(2000);
                    modalVisible = await page.$('#cronModalOverlay.active');
                }
            }

            await page.screenshot({ path: 'tests/screenshots/cron-modal-state.png' });

            if (modalVisible) {
                console.log('Modal is now open');

                // Get current cron value
                const cronInput = await page.$('#cronExpression');
                const currentCron = await cronInput.inputValue();
                console.log(`Current cron in modal: ${currentCron}`);

                // Change to a new value
                const newCron = '*/5 * * * *';
                console.log(`Changing to: ${newCron}`);

                await cronInput.fill('');
                await cronInput.fill(newCron);
                await page.waitForTimeout(500);

                // Click save button
                const saveBtn = await page.$('#saveCronBtn');
                if (saveBtn) {
                    console.log('Clicking save button...');
                    await saveBtn.click();
                    await page.waitForTimeout(5000); // Wait for REST API call
                }

                // Check if modal closed
                const modalStillOpen = await page.$('#cronModalOverlay.active');
                if (modalStillOpen) {
                    console.log('Modal still open, clicking close...');
                    const closeBtn = await page.$('#cronModalClose, .cron-modal-close');
                    if (closeBtn) await closeBtn.click();
                    await page.waitForTimeout(1000);
                }

                // Get updated state
                console.log('\n=== After Update (Before Refresh) ===');
                const updatedRows = await getTableData(page);
                const updatedSearch = updatedRows[0];
                console.log(`Schedule: ${updatedSearch.schedule}`);
                console.log(`Frequency: ${updatedSearch.frequency}`);

                // Refresh page
                console.log('\n=== After Page Refresh ===');
                await page.reload();
                await page.waitForSelector('#all_searches_table', { timeout: 30000 });
                await page.waitForTimeout(5000);

                const refreshedRows = await getTableData(page);
                const refreshedSearch = refreshedRows[0];
                console.log(`Schedule: ${refreshedSearch.schedule}`);
                console.log(`Frequency: ${refreshedSearch.frequency}`);

                await page.screenshot({ path: 'tests/screenshots/cron-after-refresh.png' });

                // Verify via REST API
                console.log('\n=== REST API Verification ===');
                const restQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local | search title="${testSearch.name}" | table title, cron_schedule`;
                await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(restQuery)}`);
                await page.waitForTimeout(8000);

                const restResult = await page.$eval('.results-table', el => el.textContent).catch(() => 'No result');
                console.log(`REST result: ${restResult.substring(0, 200)}`);

                await page.screenshot({ path: 'tests/screenshots/cron-rest-verify.png' });

            } else {
                console.log('ERROR: Could not open cron modal');
                await page.screenshot({ path: 'tests/screenshots/cron-modal-failed.png' });
            }

        } finally {
            await context.close();
            await browser.close();
        }
    });
});

async function getTableData(page) {
    const rows = await page.$$('#all_searches_table table tbody tr');
    const data = [];

    for (const row of rows) {
        const cells = await row.$$('td');
        if (cells.length >= 7) {
            data.push({
                name: (await cells[1].textContent()).trim(),
                status: (await cells[2].textContent()).trim(),
                schedule: (await cells[5].textContent()).trim(),
                frequency: (await cells[6].textContent()).trim(),
            });
        }
    }

    return data;
}
