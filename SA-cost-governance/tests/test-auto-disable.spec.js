// Test auto-disable functionality
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changed!' };

test.describe('Auto-Disable Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        // Login to Splunk
        await page.goto(`${SPLUNK_URL}/en-US/account/login`);
        await page.fill('input[name="username"]', CREDENTIALS.username);
        await page.fill('input[name="password"]', CREDENTIALS.password);
        await page.click('input[type="submit"]');
        await page.waitForURL('**/en-US/app/**', { timeout: 30000 });
        console.log('Logged in successfully');
    });

    test.afterAll(async () => {
        if (page) await page.close();
    });

    test('Auto-disable should disable search when deadline expires', async () => {
        // Step 1: Find a search to test with
        console.log('Step 1: Getting list of scheduled searches...');

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(3000);

        // Find a search that's currently enabled and get its name
        const searchRow = await page.$('table.table-chrome tbody tr:first-child');
        if (!searchRow) {
            throw new Error('No searches found in table');
        }

        const searchNameCell = await searchRow.$('td:nth-child(2)');
        const searchName = await searchNameCell.textContent();
        console.log(`Testing with search: ${searchName.trim()}`);

        // Step 2: Flag the search with a 30-second deadline
        console.log('Step 2: Flagging search with 30-second deadline...');

        const now = Math.floor(Date.now() / 1000);
        const deadline = now + 30; // 30 seconds from now

        // Use Splunk search to add to flagged lookup
        const flagQuery = `| makeresults
            | eval search_name="${searchName.trim()}",
                   owner="admin",
                   app="SA-cost-governance",
                   status="notified",
                   flagged_time=${now},
                   flagged_by="test_user",
                   remediation_deadline=${deadline},
                   reason="Auto-disable test"
            | table search_name, owner, app, status, flagged_time, flagged_by, remediation_deadline, reason
            | append [| inputlookup flagged_searches_lookup | where search_name!="${searchName.trim()}"]
            | outputlookup flagged_searches_lookup`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(flagQuery)}`);
        await page.waitForTimeout(5000);

        // Verify the search was flagged
        console.log('Verifying search was flagged...');
        const verifyQuery = `| inputlookup flagged_searches_lookup | search search_name="${searchName.trim()}"`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(verifyQuery)}`);
        await page.waitForTimeout(3000);

        // Step 3: Go to dashboard and wait for auto-disable
        console.log('Step 3: Going to dashboard and waiting for auto-disable check (30-60 seconds)...');
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });

        // Wait for deadline to pass plus time for check to run
        console.log('Waiting 45 seconds for deadline to pass and check to run...');
        await page.waitForTimeout(45000);

        // Check console for auto-disable messages
        page.on('console', msg => {
            if (msg.text().includes('Auto-disable')) {
                console.log('Console:', msg.text());
            }
        });

        // Wait another 30 seconds for the next check cycle
        console.log('Waiting another 30 seconds for check cycle...');
        await page.waitForTimeout(30000);

        // Step 4: Verify the search status changed to disabled in lookup
        console.log('Step 4: Verifying search status in lookup...');
        const checkStatusQuery = `| inputlookup flagged_searches_lookup | search search_name="${searchName.trim()}" | table search_name, status, notes`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(checkStatusQuery)}`);
        await page.waitForTimeout(5000);

        // Take screenshot
        await page.screenshot({ path: 'tests/screenshots/auto-disable-status.png' });

        // Check if status is disabled
        const resultsTable = await page.$('.results-table');
        if (resultsTable) {
            const statusCell = await resultsTable.$('td:nth-child(2)');
            if (statusCell) {
                const statusText = await statusCell.textContent();
                console.log(`Final status: ${statusText}`);
                expect(statusText.trim()).toBe('disabled');
            }
        }

        // Step 5: Verify the saved search is actually disabled via REST
        console.log('Step 5: Checking if saved search is actually disabled...');
        const restQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local
            | search title="${searchName.trim()}"
            | table title, disabled, is_scheduled`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(restQuery)}`);
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'tests/screenshots/auto-disable-rest-check.png' });

        // Check the disabled field
        const restTable = await page.$('.results-table');
        if (restTable) {
            const disabledCell = await restTable.$('td:nth-child(2)');
            if (disabledCell) {
                const disabledText = await disabledCell.textContent();
                console.log(`Saved search disabled value: ${disabledText}`);
                expect(disabledText.trim()).toBe('1');
            }
        }

        // Step 6: Check audit log for auto-disable action
        console.log('Step 6: Checking audit log...');
        const auditQuery = `| inputlookup governance_audit_log_lookup | search action="auto-disabled" search_name="${searchName.trim()}" | head 1`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(auditQuery)}`);
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'tests/screenshots/auto-disable-audit.png' });

        console.log('Auto-disable test completed!');
    });
});
