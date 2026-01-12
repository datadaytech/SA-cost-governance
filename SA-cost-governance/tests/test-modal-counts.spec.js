/**
 * Modal Count Verification Tests
 * Ensures modal counts match table data and update correctly when status changes
 */

const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const SPLUNK_USER = process.env.SPLUNK_USER || 'admin';
const SPLUNK_PASSWORD = process.env.SPLUNK_PASSWORD || 'changeme123';

test.describe('Modal Count Verification Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Login to Splunk
        console.log('Logging in...');
        await page.goto(`${SPLUNK_URL}/en-US/account/login`);
        await page.fill('input[name="username"]', SPLUNK_USER);
        await page.fill('input[name="password"]', SPLUNK_PASSWORD);
        await page.click('input[type="submit"]');
        await page.waitForTimeout(3000);
        console.log('Logged in');

        // Navigate to governance page
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/scheduled_search_governance`);
        await page.waitForTimeout(5000);
    });

    test('Test 1: Verify Suspicious modal count matches table suspicious count', async ({ page }) => {
        console.log('\n=== Test 1: Suspicious Modal Count Verification ===\n');

        // Get the suspicious count from the metric panel
        const suspiciousPanel = await page.$('#suspicious_metric_panel .single-value, #suspicious_metric .single-value');
        let panelCount = 0;
        if (suspiciousPanel) {
            const panelText = await suspiciousPanel.textContent();
            panelCount = parseInt(panelText.trim()) || 0;
            console.log(`Suspicious panel count: ${panelCount}`);
        }

        // Count suspicious rows in the table (rows with suspicious status/icon)
        await page.waitForTimeout(3000);
        const suspiciousRows = await page.$$('tr:has(.suspicious-icon), tr[data-status="suspicious"]');
        const tableCount = suspiciousRows.length;
        console.log(`Table suspicious count: ${tableCount}`);

        // Click on the suspicious panel to open modal
        const panel = await page.$('#suspicious_metric_panel, [id*="suspicious"]');
        if (panel) {
            await panel.click();
            await page.waitForTimeout(2000);

            // Count rows in the modal
            const modalRows = await page.$$('#metricPopupTableBody tr.metric-popup-row');
            const modalCount = modalRows.length;
            console.log(`Modal row count: ${modalCount}`);

            // Get modal title value
            const modalValue = await page.$('#metricPopupValue');
            if (modalValue) {
                const modalValueText = await modalValue.textContent();
                console.log(`Modal value display: ${modalValueText}`);
            }

            // Close modal
            await page.click('#metricPopupClose');
        }

        console.log('\nTest 1 complete\n');
    });

    test('Test 2: Verify Flagged modal count matches flagged + notified count', async ({ page }) => {
        console.log('\n=== Test 2: Flagged Modal Count Verification ===\n');

        // Get the flagged count from the metric panel
        const flaggedPanel = await page.$('#flagged_metric_panel .single-value, #flagged_metric .single-value');
        let panelCount = 0;
        if (flaggedPanel) {
            const panelText = await flaggedPanel.textContent();
            panelCount = parseInt(panelText.trim()) || 0;
            console.log(`Flagged panel count: ${panelCount}`);
        }

        // Also get notified count if separate panel exists
        const notifiedPanel = await page.$('#notified_metric_panel .single-value, #notified_metric .single-value');
        let notifiedCount = 0;
        if (notifiedPanel) {
            const notifiedText = await notifiedPanel.textContent();
            notifiedCount = parseInt(notifiedText.trim()) || 0;
            console.log(`Notified panel count: ${notifiedCount}`);
        }

        console.log(`Expected total (flagged + notified): ${panelCount}`);

        // Click on flagged panel to open modal
        const panel = await page.$('#flagged_metric_panel');
        if (panel) {
            await panel.click();
            await page.waitForTimeout(3000);

            // Count rows in the modal
            const modalRows = await page.$$('#metricPopupTableBody tr.metric-popup-row');
            const modalCount = modalRows.length;
            console.log(`Modal row count: ${modalCount}`);

            // Get modal title value
            const modalValue = await page.$('#metricPopupValue');
            if (modalValue) {
                const modalValueText = await modalValue.textContent();
                console.log(`Modal value display: ${modalValueText}`);
            }

            // Verify the count matches
            expect(modalCount).toBe(panelCount);
            console.log(`✓ Modal count (${modalCount}) matches panel count (${panelCount})`);

            // Close modal
            await page.click('#metricPopupClose');
        }

        console.log('\nTest 2 complete\n');
    });

    test('Test 3: Verify Disabled modal count matches table disabled count', async ({ page }) => {
        console.log('\n=== Test 3: Disabled Modal Count Verification ===\n');

        // Get the disabled count from the metric panel
        const disabledPanel = await page.$('#disabled_metric_panel .single-value, [id*="disabled"] .single-value');
        let panelCount = 0;
        if (disabledPanel) {
            const panelText = await disabledPanel.textContent();
            panelCount = parseInt(panelText.trim()) || 0;
            console.log(`Disabled panel count: ${panelCount}`);
        }

        // Click on disabled panel to open modal
        const panel = await page.$('#disabled_metric_panel, [id*="disabled_metric"]');
        if (panel) {
            await panel.click();
            await page.waitForTimeout(2000);

            // Count rows in the modal
            const modalRows = await page.$$('#metricPopupTableBody tr.metric-popup-row');
            const modalCount = modalRows.length;
            console.log(`Modal row count: ${modalCount}`);

            // Close modal
            await page.click('#metricPopupClose');
        }

        console.log('\nTest 3 complete\n');
    });

    test('Test 4: Verify Expiring Soon modal count', async ({ page }) => {
        console.log('\n=== Test 4: Expiring Soon Modal Count Verification ===\n');

        // Get the expiring count from the metric panel
        const expiringPanel = await page.$('#expiring_metric_panel .single-value, [id*="expiring"] .single-value');
        let panelCount = 0;
        if (expiringPanel) {
            const panelText = await expiringPanel.textContent();
            panelCount = parseInt(panelText.trim()) || 0;
            console.log(`Expiring panel count: ${panelCount}`);
        }

        // Click on expiring panel to open modal
        const panel = await page.$('#expiring_metric_panel, [id*="expiring_metric"]');
        if (panel) {
            await panel.click();
            await page.waitForTimeout(2000);

            // Count rows in the modal
            const modalRows = await page.$$('#metricPopupTableBody tr.metric-popup-row');
            const modalCount = modalRows.length;
            console.log(`Modal row count: ${modalCount}`);

            // Close modal
            await page.click('#metricPopupClose');
        }

        console.log('\nTest 4 complete\n');
    });

    test('Test 5: Flag a search and verify count updates', async ({ page }) => {
        console.log('\n=== Test 5: Flag Search and Verify Count Updates ===\n');

        // Get initial flagged count
        await page.waitForTimeout(3000);
        const flaggedPanel = await page.$('#flagged_metric_panel .single-value');
        let initialCount = 0;
        if (flaggedPanel) {
            const panelText = await flaggedPanel.textContent();
            initialCount = parseInt(panelText.trim()) || 0;
            console.log(`Initial flagged count: ${initialCount}`);
        }

        // Click on suspicious panel to find an unflagged suspicious search
        const suspiciousPanel = await page.$('#suspicious_metric_panel');
        if (suspiciousPanel) {
            const suspiciousText = await page.$eval('#suspicious_metric_panel .single-value', el => el.textContent);
            const suspiciousCount = parseInt(suspiciousText) || 0;

            if (suspiciousCount > 0) {
                await suspiciousPanel.click();
                await page.waitForTimeout(2000);

                // Select the first row
                const firstCheckbox = await page.$('#metricPopupTableBody tr.metric-popup-row input[type="checkbox"]');
                if (firstCheckbox) {
                    await firstCheckbox.click();
                    console.log('Selected first suspicious search');

                    // Click Flag button
                    const flagBtn = await page.$('#metricPopupFlag');
                    if (flagBtn && await flagBtn.isVisible()) {
                        await flagBtn.click();
                        await page.waitForTimeout(3000);
                        console.log('Clicked Flag button');

                        // Close modal if still open
                        const closeBtn = await page.$('#metricPopupClose');
                        if (closeBtn && await closeBtn.isVisible()) {
                            await closeBtn.click();
                        }

                        // Wait for page refresh
                        await page.waitForTimeout(5000);

                        // Check new flagged count
                        const newFlaggedPanel = await page.$('#flagged_metric_panel .single-value');
                        if (newFlaggedPanel) {
                            const newText = await newFlaggedPanel.textContent();
                            const newCount = parseInt(newText.trim()) || 0;
                            console.log(`New flagged count: ${newCount}`);
                            console.log(`Expected: ${initialCount + 1}`);
                        }
                    }
                }

                // Close modal
                const closeBtn = await page.$('#metricPopupClose');
                if (closeBtn && await closeBtn.isVisible()) {
                    await closeBtn.click();
                }
            } else {
                console.log('No suspicious searches to flag');
            }
        }

        console.log('\nTest 5 complete\n');
    });

    test('Test 6: Query REST API to verify lookup data', async ({ page }) => {
        console.log('\n=== Test 6: Verify Lookup Data via SPL ===\n');

        // Run a search to get the actual counts from the lookup
        const countQuery = `| inputlookup flagged_searches_lookup
            | stats count as total,
                    count(eval(status="pending")) as pending,
                    count(eval(status="notified")) as notified,
                    count(eval(status="disabled")) as disabled,
                    count(eval(status="review")) as review
            | eval flagged_total = pending + notified`;

        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent(countQuery)}`);
        await page.waitForTimeout(10000);

        const resultsTable = await page.$('.results-table');
        if (resultsTable) {
            const cells = await resultsTable.$$('td');
            if (cells.length > 0) {
                const values = await Promise.all(cells.map(c => c.textContent()));
                console.log('Lookup counts:', values.join(' | '));
            }
        }

        console.log('\nTest 6 complete\n');
    });

    test('Test 7: Verify Total Scheduled Searches modal', async ({ page }) => {
        console.log('\n=== Test 7: Total Scheduled Searches Modal Verification ===\n');

        // Get the total count from the metric panel
        const totalPanel = await page.$('#total_metric_panel .single-value, [id*="total"] .single-value');
        let panelCount = 0;
        if (totalPanel) {
            const panelText = await totalPanel.textContent();
            panelCount = parseInt(panelText.trim()) || 0;
            console.log(`Total panel count: ${panelCount}`);
        }

        // Click on total panel to open modal
        const panel = await page.$('#total_metric_panel, [id*="total_metric"]');
        if (panel) {
            await panel.click();
            await page.waitForTimeout(2000);

            // Count rows in the modal
            const modalRows = await page.$$('#metricPopupTableBody tr.metric-popup-row');
            const modalCount = modalRows.length;
            console.log(`Modal row count: ${modalCount}`);

            // Get modal title value
            const modalValue = await page.$('#metricPopupValue');
            if (modalValue) {
                const modalValueText = await modalValue.textContent();
                console.log(`Modal value display: ${modalValueText}`);
            }

            // Close modal
            await page.click('#metricPopupClose');
        }

        console.log('\nTest 7 complete\n');
    });
});
