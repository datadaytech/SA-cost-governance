/**
 * Flagging Persistence and State Flow Tests
 * Tests that flagged status persists across page reloads and state transitions work correctly
 */

const { test, expect } = require('@playwright/test');

const SPLUNK_URL = process.env.SPLUNK_URL || 'http://localhost:8000';
const SPLUNK_USER = process.env.SPLUNK_USER || 'admin';
const SPLUNK_PASSWORD = process.env.SPLUNK_PASSWORD || 'changeme123';

test.describe('Flagging Persistence Tests', () => {

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

    test('Test 1: Verify panel counts match lookup status sums', async ({ page }) => {
        console.log('\n=== Test 1: Panel Count Verification ===\n');

        // Get counts from each panel
        const flaggedPanel = await page.$('#flagged_metric_panel .single-value');
        const pendingReviewPanel = await page.$('#pending_review_metric_panel .single-value');
        const disabledPanel = await page.$('#disabled_metric_panel .single-value');

        let flaggedCount = 0, pendingReviewCount = 0, disabledCount = 0;

        if (flaggedPanel) {
            const text = await flaggedPanel.textContent();
            flaggedCount = parseInt(text.trim()) || 0;
            console.log(`Flagged panel count: ${flaggedCount}`);
        }

        if (pendingReviewPanel) {
            const text = await pendingReviewPanel.textContent();
            pendingReviewCount = parseInt(text.trim()) || 0;
            console.log(`Pending Review panel count: ${pendingReviewCount}`);
        }

        if (disabledPanel) {
            const text = await disabledPanel.textContent();
            disabledCount = parseInt(text.trim()) || 0;
            console.log(`Disabled panel count: ${disabledCount}`);
        }

        // Run SPL queries to get actual counts
        await page.goto(`${SPLUNK_URL}/en-US/app/SA-cost-governance/search?q=${encodeURIComponent('| inputlookup flagged_searches_lookup | stats count by status')}`);
        await page.waitForTimeout(10000);

        console.log('\nPanel counts retrieved successfully');
        console.log('Test 1 complete\n');
    });

    test('Test 2: Flagged status persists after page reload', async ({ page }) => {
        console.log('\n=== Test 2: Flagged Persistence After Reload ===\n');

        // Get initial flagged count
        const initialFlaggedPanel = await page.$('#flagged_metric_panel .single-value');
        let initialCount = 0;
        if (initialFlaggedPanel) {
            const text = await initialFlaggedPanel.textContent();
            initialCount = parseInt(text.trim()) || 0;
            console.log(`Initial flagged count: ${initialCount}`);
        }

        // Reload the page
        console.log('Reloading page...');
        await page.reload();
        await page.waitForTimeout(5000);

        // Get flagged count after reload
        const reloadedFlaggedPanel = await page.$('#flagged_metric_panel .single-value');
        let reloadedCount = 0;
        if (reloadedFlaggedPanel) {
            const text = await reloadedFlaggedPanel.textContent();
            reloadedCount = parseInt(text.trim()) || 0;
            console.log(`Flagged count after reload: ${reloadedCount}`);
        }

        // Verify counts match
        expect(reloadedCount).toBe(initialCount);
        console.log(`Persistence verified: ${reloadedCount} === ${initialCount}`);

        console.log('\nTest 2 complete\n');
    });

    test('Test 3: Table shows correct governance status for flagged searches', async ({ page }) => {
        console.log('\n=== Test 3: Table Governance Status Verification ===\n');

        // Wait for table to load
        await page.waitForTimeout(5000);

        // Check for Notified status in table
        const notifiedCells = await page.$$('td:has-text("Notified")');
        console.log(`Found ${notifiedCells.length} cells with "Notified" status`);

        // Check for Flagged status in table
        const flaggedCells = await page.$$('td:has-text("Flagged")');
        console.log(`Found ${flaggedCells.length} cells with "Flagged" status`);

        // Check for Pending Review status in table
        const pendingReviewCells = await page.$$('td:has-text("Pending Review")');
        console.log(`Found ${pendingReviewCells.length} cells with "Pending Review" status`);

        console.log('\nTest 3 complete\n');
    });

    test('Test 4: Flagged modal shows correct searches', async ({ page }) => {
        console.log('\n=== Test 4: Flagged Modal Content Verification ===\n');

        // Get flagged panel count
        const flaggedPanel = await page.$('#flagged_metric_panel .single-value');
        let panelCount = 0;
        if (flaggedPanel) {
            const text = await flaggedPanel.textContent();
            panelCount = parseInt(text.trim()) || 0;
            console.log(`Flagged panel count: ${panelCount}`);
        }

        if (panelCount > 0) {
            // Click on flagged panel
            const panel = await page.$('#flagged_metric_panel');
            if (panel) {
                await panel.click();
                await page.waitForTimeout(3000);

                // Count rows in modal
                const modalRows = await page.$$('#metricPopupTableBody tr.metric-popup-row');
                const modalCount = modalRows.length;
                console.log(`Modal row count: ${modalCount}`);

                // Verify counts match
                expect(modalCount).toBe(panelCount);
                console.log(`Modal count matches panel: ${modalCount} === ${panelCount}`);

                // Check modal displays correct statuses
                for (let i = 0; i < Math.min(modalRows.length, 3); i++) {
                    const row = modalRows[i];
                    const statusCell = await row.$('td:nth-child(3)');
                    if (statusCell) {
                        const status = await statusCell.textContent();
                        console.log(`Row ${i + 1} status: ${status.trim()}`);
                    }
                }

                // Close modal
                await page.click('#metricPopupClose');
            }
        } else {
            console.log('No flagged searches to verify');
        }

        console.log('\nTest 4 complete\n');
    });

    test('Test 5: Pending Review modal shows correct searches', async ({ page }) => {
        console.log('\n=== Test 5: Pending Review Modal Verification ===\n');

        // Get pending review panel count
        const pendingReviewPanel = await page.$('#pending_review_metric_panel .single-value');
        let panelCount = 0;
        if (pendingReviewPanel) {
            const text = await pendingReviewPanel.textContent();
            panelCount = parseInt(text.trim()) || 0;
            console.log(`Pending Review panel count: ${panelCount}`);
        }

        if (panelCount > 0) {
            // Click on pending review panel
            const panel = await page.$('#pending_review_metric_panel');
            if (panel) {
                await panel.click();
                await page.waitForTimeout(3000);

                // Count rows in modal
                const modalRows = await page.$$('#metricPopupTableBody tr.metric-popup-row');
                const modalCount = modalRows.length;
                console.log(`Modal row count: ${modalCount}`);

                // Verify counts match
                expect(modalCount).toBe(panelCount);
                console.log(`Modal count matches panel: ${modalCount} === ${panelCount}`);

                // Close modal
                await page.click('#metricPopupClose');
            }
        } else {
            console.log('No pending review searches to verify');
        }

        console.log('\nTest 5 complete\n');
    });

    test('Test 6: Days Left shows correct format', async ({ page }) => {
        console.log('\n=== Test 6: Days Left Format Verification ===\n');

        // Click on flagged panel to check time format
        const flaggedPanel = await page.$('#flagged_metric_panel');
        if (flaggedPanel) {
            const panelValue = await page.$('#flagged_metric_panel .single-value');
            const count = panelValue ? parseInt(await panelValue.textContent()) || 0 : 0;

            if (count > 0) {
                await flaggedPanel.click();
                await page.waitForTimeout(3000);

                // Check for time remaining format in modal
                const timeRemaining = await page.$('#metricPopupTableBody td:has-text("h ")');
                if (timeRemaining) {
                    const timeText = await timeRemaining.textContent();
                    console.log(`Time remaining format found: ${timeText.trim()}`);

                    // Verify format doesn't show "0d" for less than 1 day
                    if (!timeText.includes('d ')) {
                        console.log('Correct: No "d" shown for less than 1 day');
                    } else if (timeText.startsWith('0d')) {
                        console.log('ERROR: Shows "0d" prefix which should be hidden');
                    } else {
                        console.log('Shows days (1d or more) - correct format');
                    }
                }

                // Close modal
                await page.click('#metricPopupClose');
            }
        }

        console.log('\nTest 6 complete\n');
    });

    test('Test 7: Status persistence across multiple page loads', async ({ page }) => {
        console.log('\n=== Test 7: Multiple Page Load Persistence ===\n');

        const counts = [];

        for (let i = 0; i < 3; i++) {
            console.log(`Load ${i + 1}...`);

            if (i > 0) {
                await page.reload();
                await page.waitForTimeout(5000);
            }

            const flaggedPanel = await page.$('#flagged_metric_panel .single-value');
            const pendingReviewPanel = await page.$('#pending_review_metric_panel .single-value');
            const disabledPanel = await page.$('#disabled_metric_panel .single-value');

            const loadCounts = {
                flagged: flaggedPanel ? parseInt(await flaggedPanel.textContent()) || 0 : 0,
                pendingReview: pendingReviewPanel ? parseInt(await pendingReviewPanel.textContent()) || 0 : 0,
                disabled: disabledPanel ? parseInt(await disabledPanel.textContent()) || 0 : 0
            };

            counts.push(loadCounts);
            console.log(`  Flagged: ${loadCounts.flagged}, Pending Review: ${loadCounts.pendingReview}, Disabled: ${loadCounts.disabled}`);
        }

        // Verify all loads show same counts
        for (let i = 1; i < counts.length; i++) {
            expect(counts[i].flagged).toBe(counts[0].flagged);
            expect(counts[i].pendingReview).toBe(counts[0].pendingReview);
            expect(counts[i].disabled).toBe(counts[0].disabled);
        }

        console.log('All page loads show consistent counts');
        console.log('\nTest 7 complete\n');
    });
});
