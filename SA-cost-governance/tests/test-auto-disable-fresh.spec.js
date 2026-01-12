// Auto-disable test with fresh browser context (no cache)
const { test, expect, chromium } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

test.describe('Auto-Disable Fresh Context', () => {
    test('Auto-disable with fresh browser (no cache)', async () => {
        // Create fresh browser with no cache
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            bypassCSP: true
        });

        // Clear all storage
        await context.clearCookies();

        const page = await context.newPage();

        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
            if (msg.text().includes('Auto-disable') || msg.text().includes('Data event')) {
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
            console.log('Logged in');

            // Step 1: Set up a test entry with past deadline
            console.log('\n=== Step 1: Setting up test data ===');
            const pastTime = Math.floor(Date.now() / 1000) - 120;
            const testSearchName = 'AUTO_DISABLE_TEST_' + Date.now();

            const addQuery = `| makeresults
                | eval search_name="${testSearchName}",
                       owner="admin",
                       app="SA-cost-governance",
                       status="notified",
                       flagged_time=${pastTime - 300},
                       flagged_by="test",
                       remediation_deadline=${pastTime},
                       reason="Test"
                | table search_name, owner, app, status, flagged_time, flagged_by, remediation_deadline, reason
                | append [| inputlookup flagged_searches_lookup]
                | outputlookup flagged_searches_lookup`;

            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(addQuery)}`);
            await page.waitForTimeout(5000);

            // Verify
            console.log('Verifying...');
            const verifyQuery = `| inputlookup flagged_searches_lookup | search search_name="${testSearchName}"`;
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(verifyQuery)}`);
            await page.waitForTimeout(5000);

            const resultArea = await page.$('.results-table');
            if (resultArea) {
                const text = await resultArea.textContent();
                console.log('Verify result contains test search:', text.includes(testSearchName));
            }

            // Step 2: Go to dashboard
            console.log('\n=== Step 2: Going to dashboard ===');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
            await page.waitForSelector('#all_searches_table', { timeout: 30000 });
            console.log('Dashboard loaded');

            // Wait for auto-disable check (5 sec initial + 10 sec buffer)
            console.log('Waiting 20 seconds for auto-disable...');
            await page.waitForTimeout(20000);

            // Step 3: Check status
            console.log('\n=== Step 3: Checking status ===');
            const checkQuery = `| inputlookup flagged_searches_lookup | search search_name="${testSearchName}" | table search_name, status, notes`;
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(checkQuery)}`);
            await page.waitForTimeout(5000);

            await page.screenshot({ path: 'tests/screenshots/auto-disable-fresh.png' });

            let status = '';
            const statusTable = await page.$('.results-table');
            if (statusTable) {
                const cells = await statusTable.$$('td');
                if (cells.length >= 2) {
                    status = (await cells[1].textContent()).trim();
                }
            }
            console.log('Final status:', status);

            // Print all auto-disable related logs
            console.log('\n=== Console logs ===');
            consoleLogs.filter(l => l.toLowerCase().includes('auto') || l.toLowerCase().includes('disable')).forEach(l => console.log(l));

            // Cleanup
            const cleanupQuery = `| inputlookup flagged_searches_lookup | where search_name!="${testSearchName}" | outputlookup flagged_searches_lookup`;
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(cleanupQuery)}`);
            await page.waitForTimeout(2000);

            console.log('\n=== RESULT ===');
            console.log('Status:', status);
            console.log('Expected: disabled');

        } finally {
            await context.close();
            await browser.close();
        }
    });
});
