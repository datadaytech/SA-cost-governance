// Debug auto-disable functionality
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changed!' };

test.describe('Auto-Disable Debug', () => {
    test('Debug auto-disable check', async ({ page }) => {
        const consoleLogs = [];

        // Capture all console messages
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
            if (msg.text().includes('Auto-disable') || msg.text().includes('checkAutoDisable')) {
                console.log('>>> Console:', msg.text());
            }
        });

        // Login
        await page.goto(`${SPLUNK_URL}/en-US/account/login`);
        await page.fill('input[name="username"]', CREDENTIALS.username);
        await page.fill('input[name="password"]', CREDENTIALS.password);
        await page.click('input[type="submit"]');
        await page.waitForURL('**/en-US/app/**', { timeout: 30000 });
        console.log('Logged in');

        // First, let's manually set up a test case with a past deadline
        console.log('Setting up test data with past deadline...');
        const pastTime = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

        const setupQuery = `| makeresults
            | eval search_name="TEST_AUTO_DISABLE_SEARCH",
                   owner="admin",
                   app="SA-cost-governance",
                   status="notified",
                   flagged_time=${pastTime - 300},
                   flagged_by="test",
                   remediation_deadline=${pastTime},
                   reason="Test auto-disable"
            | table search_name, owner, app, status, flagged_time, flagged_by, remediation_deadline, reason
            | append [| inputlookup flagged_searches_lookup | where search_name!="TEST_AUTO_DISABLE_SEARCH"]
            | outputlookup flagged_searches_lookup`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(setupQuery)}`);
        await page.waitForTimeout(5000);

        // Verify the setup
        console.log('Verifying test data...');
        const verifyQuery = `| inputlookup flagged_searches_lookup | search search_name="TEST_AUTO_DISABLE_SEARCH" | table search_name, status, remediation_deadline | eval deadline_passed = if(remediation_deadline < now(), "YES", "NO")`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(verifyQuery)}`);
        await page.waitForTimeout(5000);

        // Go to the governance dashboard
        console.log('Going to governance dashboard...');
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);

        // Wait for initial load
        await page.waitForTimeout(10000);
        console.log('Dashboard loaded, waiting for auto-disable check to run (5 sec initial, then 30 sec interval)...');

        // Wait for auto-disable check - should run at 5 seconds after load
        await page.waitForTimeout(10000);

        // Check what console logs we got
        console.log('\n=== Console logs containing "auto" or "disable": ===');
        consoleLogs.forEach(log => {
            if (log.toLowerCase().includes('auto') || log.toLowerCase().includes('disable')) {
                console.log(log);
            }
        });

        // Now check the lookup status
        console.log('\nChecking final status in lookup...');
        const checkQuery = `| inputlookup flagged_searches_lookup | search search_name="TEST_AUTO_DISABLE_SEARCH" | table search_name, status, notes`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(checkQuery)}`);
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'tests/screenshots/auto-disable-debug-result.png' });

        // Get the result text
        const resultArea = await page.$('.results-table');
        if (resultArea) {
            const text = await resultArea.textContent();
            console.log('Result:', text);
        }

        // Print all auto-disable related logs
        console.log('\n=== All console logs ===');
        console.log(consoleLogs.slice(-50).join('\n')); // Last 50 logs
    });
});
