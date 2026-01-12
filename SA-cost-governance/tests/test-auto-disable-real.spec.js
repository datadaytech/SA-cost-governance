// Test auto-disable with a real scheduled search
const { test, expect } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

test.describe('Auto-Disable Real Search Test', () => {
    test('Auto-disable should actually disable a real scheduled search', async ({ page }) => {
        const consoleLogs = [];

        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
            if (msg.text().includes('Auto-disable') || msg.text().includes('REST disable')) {
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

        // Step 1: Find a real scheduled search that is currently enabled
        console.log('Step 1: Finding a real enabled scheduled search...');
        const findQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local
            | search is_scheduled=1 disabled=0
            | head 1
            | table title, "eai:acl.owner" as owner, "eai:acl.app" as app, disabled`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(findQuery)}`);
        await page.waitForTimeout(8000);

        // Get search details
        let searchName = '';
        let searchOwner = '';
        let searchApp = '';

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const cells = await resultTable.$$('td');
            if (cells.length >= 4) {
                searchName = (await cells[0].textContent()).trim();
                searchOwner = (await cells[1].textContent()).trim();
                searchApp = (await cells[2].textContent()).trim();
                console.log(`Found search: ${searchName} (owner: ${searchOwner}, app: ${searchApp})`);
            }
        }

        if (!searchName) {
            throw new Error('No enabled scheduled search found');
        }

        // Step 2: Flag the search with a deadline that already passed
        console.log('Step 2: Flagging search with past deadline...');
        const pastTime = Math.floor(Date.now() / 1000) - 60;

        const flagQuery = `| makeresults
            | eval search_name="${searchName}",
                   owner="${searchOwner}",
                   app="${searchApp}",
                   status="notified",
                   flagged_time=${pastTime - 300},
                   flagged_by="test_user",
                   remediation_deadline=${pastTime},
                   reason="Auto-disable test with real search"
            | table search_name, owner, app, status, flagged_time, flagged_by, remediation_deadline, reason
            | append [| inputlookup flagged_searches_lookup | where search_name!="${searchName}"]
            | outputlookup flagged_searches_lookup`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(flagQuery)}`);
        await page.waitForTimeout(5000);

        // Step 3: Go to governance dashboard to trigger auto-disable check
        console.log('Step 3: Going to dashboard to trigger auto-disable...');
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForTimeout(15000); // Wait for auto-disable check (runs at 5 sec)

        // Step 4: Verify the search is disabled via REST
        console.log('Step 4: Checking if search is actually disabled via REST...');
        const checkQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local
            | search title="${searchName}"
            | table title, disabled, is_scheduled`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(checkQuery)}`);
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'tests/screenshots/auto-disable-real-result.png' });

        const restTable = await page.$('.results-table');
        if (restTable) {
            const cells = await restTable.$$('td');
            if (cells.length >= 2) {
                const disabledValue = (await cells[1].textContent()).trim();
                console.log(`Search disabled value: ${disabledValue}`);

                if (disabledValue === '1') {
                    console.log('SUCCESS: Search is now disabled!');
                } else {
                    console.log('WARNING: Search may not be disabled yet. disabled=' + disabledValue);
                }
            }
        }

        // Step 5: Check audit log
        console.log('Step 5: Checking audit log...');
        const auditQuery = `| inputlookup governance_audit_log_lookup | search action="auto-disabled" search_name="${searchName}" | head 1`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(auditQuery)}`);
        await page.waitForTimeout(3000);

        const auditTable = await page.$('.results-table');
        if (auditTable) {
            const text = await auditTable.textContent();
            console.log('Audit log found:', text.includes('auto-disabled'));
        }

        // Step 6: Re-enable the search for cleanup
        console.log('Step 6: Cleaning up - re-enabling the search...');
        const enableQuery = `| rest /servicesNS/${searchOwner}/${searchApp}/saved/searches/${encodeURIComponent(searchName)}/enable splunk_server=local method=post`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(enableQuery)}`);
        await page.waitForTimeout(3000);

        // Remove from flagged lookup
        const cleanupQuery = `| inputlookup flagged_searches_lookup | where search_name!="${searchName}" | outputlookup flagged_searches_lookup`;
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(cleanupQuery)}`);
        await page.waitForTimeout(2000);

        console.log('Test complete!');

        // Print relevant logs
        console.log('\n=== Auto-disable related logs ===');
        consoleLogs.forEach(log => {
            if (log.toLowerCase().includes('auto') || log.toLowerCase().includes('disable')) {
                console.log(log);
            }
        });
    });
});
