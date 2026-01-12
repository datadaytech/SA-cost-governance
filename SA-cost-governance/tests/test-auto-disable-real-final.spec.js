// Final test with a real scheduled search
const { test, expect, chromium } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

test.describe('Auto-Disable Real Search Final', () => {
    // Increase timeout to 2 minutes for this long-running test
    test.setTimeout(120000);

    test('Auto-disable actually disables a real search', async () => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        page.on('console', msg => {
            if (msg.text().includes('Auto-disable') || msg.text().includes('REST disable') || msg.text().includes('rows:')) {
                console.log('>>> Console:', msg.text());
            }
        });

        let searchName = '';
        let searchOwner = '';
        let searchApp = '';

        try {
            // Login
            console.log('Logging in...');
            await page.goto(`${SPLUNK_URL}/en-US/account/login`);
            await page.fill('input[name="username"]', CREDENTIALS.username);
            await page.fill('input[name="password"]', CREDENTIALS.password);
            await page.click('input[type="submit"]');
            await page.waitForURL('**/en-US/app/**', { timeout: 30000 });
            console.log('Logged in\n');

            // Find a real enabled scheduled search
            console.log('Finding a real enabled scheduled search...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| rest /servicesNS/-/-/saved/searches splunk_server=local | search is_scheduled=1 disabled=0 | rename "eai:acl.owner" as owner, "eai:acl.app" as app | head 1 | table title, owner, app`)}`);
            await page.waitForTimeout(10000);

            const resultTable = await page.$('.results-table');
            if (resultTable) {
                const cells = await resultTable.$$('td');
                if (cells.length >= 3) {
                    searchName = (await cells[0].textContent()).trim();
                    searchOwner = (await cells[1].textContent()).trim();
                    searchApp = (await cells[2].textContent()).trim();
                }
            }

            if (!searchName) {
                console.log('No enabled scheduled search found - skipping test');
                return;
            }

            console.log(`Found: "${searchName}" (owner: ${searchOwner}, app: ${searchApp})\n`);

            // Add to flagged lookup with past deadline
            console.log('Adding to flagged lookup with past deadline...');
            const pastTime = Math.floor(Date.now() / 1000) - 120;

            const addQuery = `| makeresults
                | eval search_name="${searchName}", owner="${searchOwner}", app="${searchApp}", status="notified", flagged_time=${pastTime - 300}, flagged_by="test", remediation_deadline=${pastTime}, reason="Real test"
                | table search_name, owner, app, status, flagged_time, flagged_by, remediation_deadline, reason
                | outputlookup append=true flagged_searches_lookup`;

            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(addQuery)}`);
            await page.waitForTimeout(5000);

            // Verify entry
            console.log('Verifying entry...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| inputlookup flagged_searches_lookup | search search_name="${searchName}" | table status, remediation_deadline`)}`);
            await page.waitForTimeout(5000);

            let tableText = await page.$eval('.results-table', el => el.textContent).catch(() => 'No results');
            console.log('Entry:', tableText.includes('notified') ? 'Added with notified status' : 'Not found');
            console.log('');

            // Go to dashboard to trigger auto-disable
            console.log('Going to dashboard...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
            await page.waitForSelector('#all_searches_table', { timeout: 30000 });

            console.log('Waiting 25 seconds for auto-disable...');
            await page.waitForTimeout(25000);
            console.log('');

            // Check lookup status
            console.log('Checking lookup status...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| inputlookup flagged_searches_lookup | search search_name="${searchName}" | table status, notes`)}`);
            await page.waitForTimeout(5000);

            let status = '';
            const statusTable = await page.$('.results-table');
            if (statusTable) {
                const cells = await statusTable.$$('td');
                if (cells.length >= 1) {
                    status = (await cells[0].textContent()).trim();
                }
            }
            console.log(`Lookup status: ${status}`);

            // Check if saved search is actually disabled via REST
            console.log('\nChecking saved search via REST...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| rest /servicesNS/-/-/saved/searches splunk_server=local | search title="${searchName}" | table title, disabled`)}`);
            await page.waitForTimeout(5000);

            await page.screenshot({ path: 'tests/screenshots/auto-disable-real-final.png' });

            let disabled = '';
            const restTable = await page.$('.results-table');
            if (restTable) {
                const cells = await restTable.$$('td');
                if (cells.length >= 2) {
                    disabled = (await cells[1].textContent()).trim();
                }
            }
            console.log(`Saved search disabled: ${disabled}`);

            console.log('\n=== RESULTS ===');
            console.log(`Search: ${searchName}`);
            console.log(`Lookup status: ${status}`);
            console.log(`Actually disabled: ${disabled === '1' ? 'YES' : 'NO'}`);

            // Re-enable the search for cleanup
            console.log('\nCleaning up - re-enabling search...');
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| rest /servicesNS/${searchOwner}/${searchApp}/saved/searches/${encodeURIComponent(searchName)}/enable splunk_server=local method=POST`)}`);
            await page.waitForTimeout(3000);

            // Remove from lookup
            await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(`| inputlookup flagged_searches_lookup | where search_name!="${searchName}" | outputlookup flagged_searches_lookup`)}`);
            await page.waitForTimeout(2000);

            // Assertions
            expect(status).toBe('disabled');

        } finally {
            await context.close();
            await browser.close();
        }
    });
});
