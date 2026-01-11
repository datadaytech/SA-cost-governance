// @ts-check
const { test, expect } = require('@playwright/test');

const SPLUNK_USER = process.env.SPLUNK_USER || 'admin';
const SPLUNK_PASS = process.env.SPLUNK_PASS || 'changeme123';

test.describe('SA Topology Analyzer', () => {

  test.beforeEach(async ({ page }) => {
    // Login to Splunk
    await page.goto('/en-US/account/login');
    await page.waitForLoadState('networkidle');

    const usernameField = await page.locator('input[name="username"]');
    if (await usernameField.isVisible()) {
      await usernameField.fill(SPLUNK_USER);
      await page.locator('input[name="password"]').fill(SPLUNK_PASS);
      await page.locator('button[type="submit"], input[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }
  });

  test('Dashboard loads successfully', async ({ page }) => {
    await page.goto('/en-US/app/sa-topology/topology');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify page title
    const title = await page.title();
    expect(title).toContain('SA Topology Analyzer');

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard-loaded.png', fullPage: true });
  });

  test('Health badges display correct counts', async ({ page }) => {
    await page.goto('/en-US/app/sa-topology/topology');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check health badge values
    const healthGreen = await page.locator('#health-green').textContent();
    const healthYellow = await page.locator('#health-yellow').textContent();
    const healthRed = await page.locator('#health-red').textContent();

    console.log('Health counts - Green:', healthGreen, 'Yellow:', healthYellow, 'Red:', healthRed);

    // Expect non-zero values (mock data has 12 green, 2 yellow, 1 red)
    expect(parseInt(healthGreen || '0')).toBeGreaterThan(0);
    expect(parseInt(healthYellow || '0')).toBeGreaterThan(0);
    expect(parseInt(healthRed || '0')).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/screenshots/health-badges.png', fullPage: true });
  });

  test('Topology SVG renders with nodes', async ({ page }) => {
    await page.goto('/en-US/app/sa-topology/topology');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check for topology container
    const containerCount = await page.locator('#topology-container').count();
    expect(containerCount).toBe(1);

    // Check for SVG element
    const svgCount = await page.locator('#topology-container svg').count();
    expect(svgCount).toBeGreaterThan(0);

    // Check for node circles (should have 15 nodes in mock data)
    const circleCount = await page.locator('#topology-container svg circle').count();
    console.log('Circle nodes found:', circleCount);
    expect(circleCount).toBeGreaterThan(10);

    // Check for link paths
    const pathCount = await page.locator('#topology-container svg path').count();
    console.log('Path links found:', pathCount);
    expect(pathCount).toBeGreaterThan(5);

    await page.screenshot({ path: 'tests/screenshots/topology-svg.png', fullPage: true });
  });

  test('Node click shows details panel', async ({ page }) => {
    await page.goto('/en-US/app/sa-topology/topology');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Click on a node group (not just the circle, as text overlays it)
    const firstNode = page.locator('#topology-container svg g.node').first();
    await firstNode.click({ force: true });
    await page.waitForTimeout(1000);

    // Check if details panel appears
    const detailsPanel = await page.locator('#node-details').isVisible();
    console.log('Details panel visible:', detailsPanel);

    await page.screenshot({ path: 'tests/screenshots/node-details.png', fullPage: true });

    expect(detailsPanel).toBe(true);
  });

  test('Static files are accessible', async ({ page }) => {
    // Check D3.js
    const d3Response = await page.goto('/static/app/sa-topology/d3.v7.min.js');
    expect(d3Response?.status()).toBe(200);

    // Check CSS
    const cssResponse = await page.goto('/static/app/sa-topology/topology.css');
    expect(cssResponse?.status()).toBe(200);

    // Check JS
    const jsResponse = await page.goto('/static/app/sa-topology/topology_viz.js');
    expect(jsResponse?.status()).toBe(200);
  });

});
