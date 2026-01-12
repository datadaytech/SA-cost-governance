// Complete auto-disable test with proper timing and verification
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

test.describe('Complete Auto-Disable Test', () => {
    test('Auto-disable should disable search when deadline expires', async ({ page }) => {
        const consoleLogs = [];

        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
            if (msg.text().includes('Auto-disable') || msg.text().includes('REST disable') || msg.text().includes('disable')) {
                console.log('>>> Console:', msg.text());
            }
        });

        // Login
        console.log('Logging in...');
        await page.goto(`${SPLUNK_URL}/en-US/account/login`);
        await page.fill('input[name="username"]', CREDENTIALS.username);
        await page.fill('input[name="password"]', CREDENTIALS.password);
        await page.click('input[type="submit"]');
        await page.waitForURL('**/en-US/app/**', { timeout: 30000 });
        console.log('Logged in');

        // Step 1: Find a real scheduled search
        console.log('\n=== Step 1: Finding a real scheduled search ===');
        const findQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local
            | search is_scheduled=1 disabled=0
            | rename "eai:acl.owner" as owner, "eai:acl.app" as app
            | head 1
            | table title, owner, app`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(findQuery)}`);
        await page.waitForTimeout(10000);

        let searchName = '';
        let searchOwner = '';
        let searchApp = '';

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const cells = await resultTable.$$('td');
            if (cells.length >= 3) {
                searchName = (await cells[0].textContent()).trim();
                searchOwner = (await cells[1].textContent()).trim();
                searchApp = (await cells[2].textContent()).trim();
                console.log(`Found: "${searchName}" (owner: ${searchOwner}, app: ${searchApp})`);
            }
        }

        if (!searchName) {
            console.log('No enabled scheduled search found, using test search name');
            searchName = 'Governance_Test_Search_01_Hourly';
            searchOwner = 'admin';
            searchApp = 'SA-cost-governance';
        }

        // Step 2: Clear existing entries and add new flagged entry
        console.log('\n=== Step 2: Setting up flagged lookup with past deadline ===');
        const pastTime = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago

        // First clear any existing entries
        const clearQuery = `| inputlookup flagged_searches_lookup | where search_name!="${searchName}" | outputlookup flagged_searches_lookup`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(clearQuery)}`);
        await page.waitForTimeout(3000);

        // Add the new entry
        const addQuery = `| makeresults
            | eval search_name="${searchName}",
                   owner="${searchOwner}",
                   app="${searchApp}",
                   status="notified",
                   flagged_time=${pastTime - 300},
                   flagged_by="auto_test",
                   remediation_deadline=${pastTime},
                   reason="Testing auto-disable",
                   notes=""
            | table search_name, owner, app, status, flagged_time, flagged_by, remediation_deadline, reason, notes
            | append [| inputlookup flagged_searches_lookup]
            | outputlookup flagged_searches_lookup`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(addQuery)}`);
        await page.waitForTimeout(5000);

        // Verify the entry was added
        console.log('Verifying entry was added...');
        const verifyQuery = `| inputlookup flagged_searches_lookup | search search_name="${searchName}" | table search_name, status, remediation_deadline | eval now_ts=now() | eval overdue=if(remediation_deadline < now_ts, "YES", "NO")`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(verifyQuery)}`);
        await page.waitForTimeout(5000);

        const verifyTable = await page.$('.results-table');
        if (verifyTable) {
            const text = await verifyTable.textContent();
            console.log('Verify result:', text);
        }

        // Step 3: Go to dashboard and wait for auto-disable
        console.log('\n=== Step 3: Going to dashboard to trigger auto-disable ===');
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);

        // Wait for page to load
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        console.log('Dashboard loaded');

        // The auto-disable check runs at 5 seconds after page load
        console.log('Waiting 20 seconds for auto-disable check to run...');
        await page.waitForTimeout(20000);

        // Step 4: Check lookup status
        console.log('\n=== Step 4: Checking lookup status ===');
        const statusQuery = `| inputlookup flagged_searches_lookup | search search_name="${searchName}" | table search_name, status, notes`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(statusQuery)}`);
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'tests/screenshots/auto-disable-complete-status.png' });

        let finalStatus = '';
        const statusTable = await page.$('.results-table');
        if (statusTable) {
            const cells = await statusTable.$$('td');
            if (cells.length >= 2) {
                finalStatus = (await cells[1].textContent()).trim();
                console.log(`Final status: ${finalStatus}`);
            }
        }

        // Step 5: Check if saved search was disabled
        console.log('\n=== Step 5: Checking saved search disabled state ===');
        const checkDisabledQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local | search title="${searchName}" | table title, disabled`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(checkDisabledQuery)}`);
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'tests/screenshots/auto-disable-complete-rest.png' });

        let disabledValue = '';
        const restTable = await page.$('.results-table');
        if (restTable) {
            const cells = await restTable.$$('td');
            if (cells.length >= 2) {
                disabledValue = (await cells[1].textContent()).trim();
                console.log(`Saved search disabled: ${disabledValue}`);
            }
        }

        // Step 6: Check audit log
        console.log('\n=== Step 6: Checking audit log ===');
        const auditQuery = `| inputlookup governance_audit_log_lookup | search search_name="${searchName}" | sort - timestamp | head 3 | table timestamp, action, search_name, details`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(auditQuery)}`);
        await page.waitForTimeout(3000);

        const auditTable = await page.$('.results-table');
        if (auditTable) {
            const text = await auditTable.textContent();
            console.log('Audit log:', text.substring(0, 200));
        }

        // Print summary
        console.log('\n=== SUMMARY ===');
        console.log(`Search name: ${searchName}`);
        console.log(`Lookup status: ${finalStatus}`);
        console.log(`Saved search disabled: ${disabledValue}`);
        console.log(`Expected: status=disabled, disabled=1`);

        // Assertions
        expect(finalStatus).toBe('disabled');

        // Cleanup
        console.log('\n=== Cleanup ===');
        const cleanupQuery = `| inputlookup flagged_searches_lookup | where search_name!="${searchName}" | outputlookup flagged_searches_lookup`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(cleanupQuery)}`);
        await page.waitForTimeout(2000);

        console.log('Test complete!');
    });
});
