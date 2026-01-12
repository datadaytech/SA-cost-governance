// Manual step-by-step auto-disable test
const { test, expect, chromium } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

test.describe('Manual Auto-Disable Test', () => {
    test('Step by step verification', async () => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(`[${msg.type()}] ${text}`);
            if (text.includes('Auto-disable') || text.includes('Data event') || text.includes('rows:')) {
                console.log('>>> Console:', text);
            }
        });

        try {
            // Login
            console.log('Step 0: Logging in...');
            await page.goto(`${SPLUNK_URL}/en-US/account/login`);
            await page.fill('input[name="username"]', CREDENTIALS.username);
            await page.fill('input[name="password"]', CREDENTIALS.password);
            await page.click('input[type="submit"]');
            await page.waitForURL('**/en-US/app/**', { timeout: 30000 });
            console.log('Logged in\n');

            // Step 1: Check current lookup contents
            console.log('Step 1: Checking current lookup contents...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent('| inputlookup flagged_searches_lookup | head 5')}`);
            await page.waitForTimeout(8000);

            let tableText = await page.$eval('.results-table', el => el.textContent).catch(() => 'No results');
            console.log('Current lookup:', tableText.substring(0, 300));
            console.log('');

            // Step 2: Add a test entry
            console.log('Step 2: Adding test entry with past deadline...');
            const pastTime = Math.floor(Date.now() / 1000) - 120;
            const testName = 'TEST_SEARCH_' + Date.now();

            const addQuery = `| makeresults
                | eval search_name="${testName}", owner="admin", app="SA-cost-governance", status="notified", flagged_time=${pastTime - 300}, flagged_by="test", remediation_deadline=${pastTime}, reason="Test entry"
                | table search_name, owner, app, status, flagged_time, flagged_by, remediation_deadline, reason
                | outputlookup append=true flagged_searches_lookup`;

            console.log('Query:', addQuery.substring(0, 100) + '...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(addQuery)}`);
            await page.waitForTimeout(8000);
            console.log('Entry added\n');

            // Step 3: Verify entry was added
            console.log('Step 3: Verifying entry was added...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| inputlookup flagged_searches_lookup | search search_name="${testName}"`)}`);
            await page.waitForTimeout(8000);

            tableText = await page.$eval('.results-table', el => el.textContent).catch(() => 'No results found');
            console.log('Verify result:', tableText.includes(testName) ? 'FOUND' : 'NOT FOUND');
            console.log('Table content:', tableText.substring(0, 200));
            console.log('');

            // Step 4: Go to dashboard
            console.log('Step 4: Going to dashboard to trigger auto-disable...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
            await page.waitForSelector('#all_searches_table', { timeout: 30000 });
            console.log('Dashboard loaded');
            console.log('Waiting 25 seconds...');
            await page.waitForTimeout(25000);
            console.log('');

            // Step 5: Check final status
            console.log('Step 5: Checking final status...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| inputlookup flagged_searches_lookup | search search_name="${testName}" | table search_name, status, notes`)}`);
            await page.waitForTimeout(8000);

            tableText = await page.$eval('.results-table', el => el.textContent).catch(() => 'No results');
            console.log('Final result:', tableText);
            console.log('');

            // Print relevant console logs
            console.log('=== All auto-disable related console logs ===');
            consoleLogs.filter(l => l.toLowerCase().includes('auto') || l.toLowerCase().includes('disable') || l.toLowerCase().includes('data event') || l.toLowerCase().includes('rows')).forEach(l => console.log(l));

            // Cleanup
            console.log('\nCleaning up...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| inputlookup flagged_searches_lookup | where search_name!="${testName}" | outputlookup flagged_searches_lookup`)}`);
            await page.waitForTimeout(3000);

        } finally {
            await context.close();
            await browser.close();
        }
    });
});
