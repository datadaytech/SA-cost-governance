// Test to verify runtime values are accurate and sourced from real job data
const { test, expect, chromium } = require('@playwright/test');

const SPLUNK_URL = 'http://localhost:8000';
const CREDENTIALS = { username: 'admin', password: 'changeme123' };

test.describe('Runtime Accuracy Tests', () => {
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

    test('Test 1: Verify runtime data exists in job history', async () => {
        console.log('=== Test 1: Check job history for runtime data ===\n');

        // Query the search/jobs REST endpoint directly
        const jobsQuery = `| rest /servicesNS/-/-/search/jobs splunk_server=local
            | search savedsearch_name=*
            | stats avg(runDuration) as avg_runtime count as job_count by savedsearch_name
            | where job_count > 0
            | sort - job_count
            | head 20`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(jobsQuery)}`);
        await page.waitForTimeout(10000);

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const rows = await resultTable.$$('tr');
            console.log(`Found ${rows.length - 1} searches with job history\n`);

            // Get header
            const headers = await resultTable.$$('th');
            const headerTexts = await Promise.all(headers.map(h => h.textContent()));
            console.log('Columns:', headerTexts.join(' | '));
            console.log('-'.repeat(80));

            // Get first 10 data rows
            for (let i = 1; i < Math.min(rows.length, 11); i++) {
                const cells = await rows[i].$$('td');
                const cellTexts = await Promise.all(cells.map(c => c.textContent()));
                console.log(cellTexts.join(' | '));
            }
        } else {
            console.log('No results table found - may need to wait for search to complete');
        }

        await page.screenshot({ path: 'tests/screenshots/runtime-test1-job-history.png' });
        console.log('\nTest 1 complete\n');
    });

    test('Test 2: Compare cache runtime vs actual job runtime', async () => {
        console.log('=== Test 2: Compare cached vs actual runtime ===\n');

        // Get a specific search name from the governance table
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForSelector('#all_searches_table', { timeout: 30000 });
        await page.waitForTimeout(5000);

        // Get first search name and its displayed runtime
        const firstRow = await page.$('#all_searches_table table tbody tr:first-child');
        const cells = await firstRow.$$('td');

        // Column indices may vary - find the runtime column
        let searchName = '';
        let displayedRuntime = '';

        if (cells.length >= 5) {
            searchName = (await cells[1].textContent()).trim();
            // Runtime is typically in column 4 or 5
            for (let i = 3; i < cells.length; i++) {
                const text = (await cells[i].textContent()).trim();
                if (text.match(/^\d+(\.\d+)?\s*(s|m|min|sec|ms)$/i) || text === 'N/A') {
                    displayedRuntime = text;
                    console.log(`Found runtime in column ${i + 1}: ${displayedRuntime}`);
                    break;
                }
            }
        }

        console.log(`Search: ${searchName}`);
        console.log(`Displayed Runtime: ${displayedRuntime}`);

        // Now query the actual job data for this search
        const actualQuery = `| rest /servicesNS/-/-/search/jobs splunk_server=local
            | search savedsearch_name="${searchName.replace(/[⚡🔍🚩]/g, '').trim()}"
            | stats avg(runDuration) as avg_runtime max(runDuration) as max_runtime min(runDuration) as min_runtime count as job_count`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(actualQuery)}`);
        await page.waitForTimeout(8000);

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const text = await resultTable.textContent();
            console.log(`\nActual job data: ${text.substring(0, 300)}`);
        }

        await page.screenshot({ path: 'tests/screenshots/runtime-test2-comparison.png' });
        console.log('\nTest 2 complete\n');
    });

    test('Test 3: Verify cache has runtime data', async () => {
        console.log('=== Test 3: Check governance_search_cache for runtime ===\n');

        // Query the cache directly
        const cacheQuery = `| inputlookup governance_search_cache.csv
            | table title, avg_runtime_sec, avg_runtime_display, max_runtime_sec, run_count, runtime_ratio
            | head 15`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(cacheQuery)}`);
        await page.waitForTimeout(8000);

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const rows = await resultTable.$$('tr');
            console.log(`Cache has ${rows.length - 1} entries\n`);

            // Print headers
            const headers = await resultTable.$$('th');
            const headerTexts = await Promise.all(headers.map(h => h.textContent()));
            console.log(headerTexts.join(' | '));
            console.log('-'.repeat(100));

            // Print data
            for (let i = 1; i < rows.length; i++) {
                const cells = await rows[i].$$('td');
                const cellTexts = await Promise.all(cells.map(c => c.textContent()));
                console.log(cellTexts.join(' | '));
            }
        }

        await page.screenshot({ path: 'tests/screenshots/runtime-test3-cache.png' });
        console.log('\nTest 3 complete\n');
    });

    test('Test 4: Run a search and verify runtime is captured', async () => {
        console.log('=== Test 4: Execute search and verify runtime capture ===\n');

        // Find a test search that exists
        const findSearchQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local
            | search title="Governance_Test_*" is_scheduled=1
            | head 1
            | table title, "eai:acl.app" as app, "eai:acl.owner" as owner`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(findSearchQuery)}`);
        await page.waitForTimeout(8000);

        let testSearchName = '';
        let testApp = '';
        let testOwner = '';

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const cells = await resultTable.$$('td');
            if (cells.length >= 3) {
                testSearchName = (await cells[0].textContent()).trim();
                testApp = (await cells[1].textContent()).trim();
                testOwner = (await cells[2].textContent()).trim();
            }
        }

        if (!testSearchName) {
            console.log('No test search found - skipping');
            return;
        }

        console.log(`Test search: ${testSearchName}`);
        console.log(`App: ${testApp}, Owner: ${testOwner}`);

        // Get runtime BEFORE running the search
        const beforeQuery = `| rest /servicesNS/-/-/search/jobs splunk_server=local
            | search savedsearch_name="${testSearchName}"
            | stats count as job_count avg(runDuration) as avg_runtime`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(beforeQuery)}`);
        await page.waitForTimeout(5000);

        let beforeCount = 0;
        const beforeTable = await page.$('.results-table');
        if (beforeTable) {
            const text = await beforeTable.textContent();
            console.log(`\nBefore running: ${text}`);
            const match = text.match(/(\d+)/);
            if (match) beforeCount = parseInt(match[1]);
        }

        // Trigger the saved search to run
        console.log('\nTriggering saved search execution...');
        const triggerQuery = `| savedsearch "${testSearchName}"`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(triggerQuery)}`);

        // Wait for the search to complete
        console.log('Waiting for search to complete...');
        await page.waitForTimeout(15000);

        // Check runtime AFTER
        const afterQuery = `| rest /servicesNS/-/-/search/jobs splunk_server=local
            | search savedsearch_name="${testSearchName}"
            | stats count as job_count avg(runDuration) as avg_runtime max(runDuration) as max_runtime latest(runDuration) as latest_runtime`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(afterQuery)}`);
        await page.waitForTimeout(8000);

        const afterTable = await page.$('.results-table');
        if (afterTable) {
            const text = await afterTable.textContent();
            console.log(`After running: ${text}`);
        }

        await page.screenshot({ path: 'tests/screenshots/runtime-test4-execution.png' });
        console.log('\nTest 4 complete\n');
    });

    test('Test 5: Verify runtime used in suspicious classification', async () => {
        console.log('=== Test 5: Check suspicious classification based on runtime ===\n');

        // Query to show how runtime affects suspicious status
        const analysisQuery = `| inputlookup governance_search_cache.csv
            | eval runtime_check = case(
                avg_runtime_sec > 300, "LONG (>5min) - SUSPICIOUS",
                avg_runtime_sec > 120, "MEDIUM (2-5min)",
                avg_runtime_sec > 60, "SHORT (1-2min)",
                avg_runtime_sec > 0, "QUICK (<1min)",
                1=1, "NO DATA")
            | eval ratio_check = case(
                runtime_ratio > 10, "HIGH RATIO (>10%) - SUSPICIOUS",
                runtime_ratio > 5, "MEDIUM RATIO (5-10%)",
                runtime_ratio > 0, "LOW RATIO (<5%)",
                1=1, "NO RATIO")
            | table title, avg_runtime_sec, avg_runtime_display, frequency_seconds, runtime_ratio, runtime_check, ratio_check, is_suspicious, suspicious_reason
            | head 15`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(analysisQuery)}`);
        await page.waitForTimeout(10000);

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const rows = await resultTable.$$('tr');
            console.log(`Analyzing ${rows.length - 1} searches\n`);

            // Count suspicious by reason
            let longRuntimeCount = 0;
            let highRatioCount = 0;
            let noDataCount = 0;

            for (let i = 1; i < rows.length; i++) {
                const cells = await rows[i].$$('td');
                if (cells.length >= 7) {
                    const title = (await cells[0].textContent()).trim().substring(0, 40);
                    const avgRuntime = (await cells[1].textContent()).trim();
                    const runtimeDisplay = (await cells[2].textContent()).trim();
                    const runtimeRatio = (await cells[4].textContent()).trim();
                    const runtimeCheck = (await cells[5].textContent()).trim();
                    const isSuspicious = (await cells[7].textContent()).trim();

                    console.log(`${title}...`);
                    console.log(`  Runtime: ${runtimeDisplay} (${avgRuntime}s) | Ratio: ${runtimeRatio}% | ${runtimeCheck}`);
                    console.log(`  Suspicious: ${isSuspicious === '1' ? 'YES' : 'NO'}`);
                    console.log('');

                    if (runtimeCheck.includes('LONG')) longRuntimeCount++;
                    if (runtimeCheck.includes('HIGH RATIO')) highRatioCount++;
                    if (runtimeCheck.includes('NO DATA')) noDataCount++;
                }
            }

            console.log('\n--- Summary ---');
            console.log(`Long runtime (>5min): ${longRuntimeCount}`);
            console.log(`High ratio (>10%): ${highRatioCount}`);
            console.log(`No runtime data: ${noDataCount}`);
        }

        await page.screenshot({ path: 'tests/screenshots/runtime-test5-suspicious.png' });
        console.log('\nTest 5 complete\n');
    });

    test('Test 6: Check for missing/null runtime values', async () => {
        console.log('=== Test 6: Identify searches with missing runtime data ===\n');

        // Find searches where runtime data is missing or null
        const missingQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local
            | search is_scheduled=1
            | rename "eai:acl.app" as app
            | table title, app, cron_schedule
            | join type=left title [| rest /servicesNS/-/-/search/jobs splunk_server=local | search savedsearch_name=* | stats avg(runDuration) as avg_runtime count as job_count by savedsearch_name | rename savedsearch_name as title]
            | eval has_runtime = if(isnotnull(avg_runtime) AND job_count > 0, "YES", "NO - MISSING")
            | stats count by has_runtime
            | eval status = has_runtime + ": " + tostring(count) + " searches"`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(missingQuery)}`);
        await page.waitForTimeout(10000);

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const text = await resultTable.textContent();
            console.log('Runtime data availability:');
            console.log(text);
        }

        // Also list searches without runtime
        const listMissingQuery = `| rest /servicesNS/-/-/saved/searches splunk_server=local
            | search is_scheduled=1
            | rename "eai:acl.app" as app
            | table title, app, cron_schedule
            | join type=left title [| rest /servicesNS/-/-/search/jobs splunk_server=local | search savedsearch_name=* | stats avg(runDuration) as avg_runtime count as job_count by savedsearch_name | rename savedsearch_name as title]
            | where isnull(avg_runtime) OR job_count=0 OR job_count=""
            | table title, app, cron_schedule
            | head 20`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(listMissingQuery)}`);
        await page.waitForTimeout(10000);

        const missingTable = await page.$('.results-table');
        if (missingTable) {
            const rows = await missingTable.$$('tr');
            if (rows.length > 1) {
                console.log(`\nSearches WITHOUT runtime data (${rows.length - 1} found):`);
                for (let i = 1; i < Math.min(rows.length, 11); i++) {
                    const cells = await rows[i].$$('td');
                    if (cells && cells.length > 0) {
                        const title = (await cells[0].textContent()).trim();
                        console.log(`  - ${title}`);
                    }
                }
            } else {
                console.log('\nAll scheduled searches have runtime data!');
            }
        } else {
            console.log('No results - all searches may have runtime data');
        }

        await page.screenshot({ path: 'tests/screenshots/runtime-test6-missing.png' });
        console.log('\nTest 6 complete\n');
    });

    test('Test 7: Validate runtime display matches raw value', async () => {
        console.log('=== Test 7: Verify runtime display formatting ===\n');

        // Check that avg_runtime_display correctly formats avg_runtime_sec
        // The format strips decimals for whole numbers (e.g., "1m" not "1.0m", "30s" not "30.0s")
        const formatQuery = `| inputlookup governance_search_cache.csv
            | eval minutes = floor(avg_runtime_sec/60)
            | eval expected_display = case(
                isnull(avg_runtime_sec), "N/A",
                avg_runtime_sec >= 60, tostring(minutes) + "m",
                1=1, tostring(floor(avg_runtime_sec)) + "s")
            | eval format_match = if(avg_runtime_display = expected_display OR (avg_runtime_display = "N/A" AND isnull(avg_runtime_sec)), "MATCH", "MISMATCH: got " + avg_runtime_display + " expected " + expected_display)
            | table title, avg_runtime_sec, avg_runtime_display, expected_display, format_match
            | where format_match != "MATCH"`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(formatQuery)}`);
        await page.waitForTimeout(8000);

        const resultTable = await page.$('.results-table');
        if (resultTable) {
            const rows = await resultTable.$$('tr');
            if (rows.length > 1) {
                console.log(`Found ${rows.length - 1} formatting mismatches:`);
                for (let i = 1; i < rows.length; i++) {
                    const cells = await rows[i].$$('td');
                    const cellTexts = await Promise.all(cells.map(c => c.textContent()));
                    console.log(cellTexts.join(' | '));
                }
            } else {
                console.log('All runtime displays match their raw values correctly!');
            }
        }

        await page.screenshot({ path: 'tests/screenshots/runtime-test7-format.png' });
        console.log('\nTest 7 complete\n');
    });
});
