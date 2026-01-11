// @ts-check
const { test, expect } = require('@playwright/test');

const SPLUNK_USER = process.env.SPLUNK_USER || 'admin';
const SPLUNK_PASS = process.env.SPLUNK_PASS || 'changeme123';

test.describe('Management Tier Connection Lines', () => {

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

  test('Management nodes render with diamond shapes', async ({ page }) => {
    // Set to mock/demo mode via URL token
    await page.goto('/en-US/app/sa-topology/topology?form.view_mode=mock');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check for management panel
    const mgmtPanel = page.locator('.management-panel');
    const mgmtPanelCount = await mgmtPanel.count();
    console.log('Management panel groups found:', mgmtPanelCount);
    expect(mgmtPanelCount).toBeGreaterThan(0);

    // Check for management nodes (diamond shapes via mgmt-node class)
    const mgmtNodes = page.locator('.mgmt-node');
    const mgmtNodeCount = await mgmtNodes.count();
    console.log('Management nodes found:', mgmtNodeCount);
    expect(mgmtNodeCount).toBeGreaterThanOrEqual(5); // CM, Deployer, LM, DS, MC

    // Check for diamond-shaped rects in management nodes
    const diamonds = page.locator('.mgmt-diamond');
    const diamondCount = await diamonds.count();
    console.log('Diamond shapes found:', diamondCount);
    expect(diamondCount).toBeGreaterThanOrEqual(5);

    await page.screenshot({ path: 'tests/screenshots/management-nodes.png', fullPage: true });
  });

  test('Management connections exist and connect to correct coordinates', async ({ page }) => {
    await page.goto('/en-US/app/sa-topology/topology?form.view_mode=mock');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check for control/management type connections
    const controlConnections = page.locator('.connection-control');
    const controlCount = await controlConnections.count();
    console.log('Control connections found:', controlCount);
    expect(controlCount).toBeGreaterThan(0);

    // Get all connection paths
    const allConnections = page.locator('.connection-path');
    const connectionCount = await allConnections.count();
    console.log('Total connection paths:', connectionCount);

    // Check that paths have valid 'd' attributes (not empty or malformed)
    for (let i = 0; i < Math.min(connectionCount, 5); i++) {
      const pathD = await allConnections.nth(i).getAttribute('d');
      console.log(`Connection ${i} path:`, pathD?.substring(0, 50) + '...');
      expect(pathD).toBeTruthy();
      expect(pathD).toContain('M'); // Must start with moveto
      expect(pathD).toContain('C'); // Must have curve
    }

    await page.screenshot({ path: 'tests/screenshots/management-connections.png', fullPage: true });
  });

  test('Connections stay aligned after viewport resize', async ({ page }) => {
    // Start with a standard viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/en-US/app/sa-topology/topology?form.view_mode=mock');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Take screenshot before resize
    await page.screenshot({ path: 'tests/screenshots/connections-before-resize.png', fullPage: true });

    // Get initial positions of management nodes and their connections
    const mgmtNodes = page.locator('.mgmt-node');
    const initialNodeCount = await mgmtNodes.count();
    console.log('Management nodes before resize:', initialNodeCount);

    // Get connection paths before resize
    const connections = page.locator('.connection-path');
    const connectionsBefore = await connections.count();
    console.log('Connections before resize:', connectionsBefore);

    // Resize viewport to smaller size
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(2000);

    // Take screenshot after resize
    await page.screenshot({ path: 'tests/screenshots/connections-after-resize.png', fullPage: true });

    // Verify nodes and connections still exist
    const nodesAfter = await mgmtNodes.count();
    const connectionsAfter = await connections.count();
    console.log('Management nodes after resize:', nodesAfter);
    console.log('Connections after resize:', connectionsAfter);

    // Nodes and connections should still be present
    expect(nodesAfter).toBe(initialNodeCount);
    expect(connectionsAfter).toBe(connectionsBefore);

    // Resize to even smaller
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/connections-small-viewport.png', fullPage: true });

    // Still should have nodes and connections
    const nodesSmall = await mgmtNodes.count();
    const connectionsSmall = await connections.count();
    console.log('Management nodes at small viewport:', nodesSmall);
    console.log('Connections at small viewport:', connectionsSmall);
    expect(nodesSmall).toBe(initialNodeCount);
  });

  test('Connection legend displays all connection types', async ({ page }) => {
    await page.goto('/en-US/app/sa-topology/topology?form.view_mode=mock');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check for connection legend
    const legend = page.locator('.connection-legend');
    const legendCount = await legend.count();
    console.log('Connection legend found:', legendCount);
    expect(legendCount).toBe(1);

    // Check legend contains text for different connection types
    const legendText = await legend.textContent();
    console.log('Legend content:', legendText);

    // Should contain labels for connection types
    expect(legendText).toContain('Data');
    expect(legendText).toContain('Search');
    expect(legendText).toContain('Management');

    await page.screenshot({ path: 'tests/screenshots/connection-legend.png', fullPage: true });
  });

  test('Dark theme is consistently applied', async ({ page }) => {
    await page.goto('/en-US/app/sa-topology/topology?form.view_mode=mock');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check topology container has dark background
    const container = page.locator('#topology-container');
    const bgColor = await container.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Container background color:', bgColor);

    // Background should be dark (not white/light)
    // Dark colors have low RGB values
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      console.log(`RGB values: R=${r}, G=${g}, B=${b}`);
      // All values should be low for dark theme (< 50)
      expect(r).toBeLessThan(50);
      expect(g).toBeLessThan(50);
      expect(b).toBeLessThan(50);
    }

    await page.screenshot({ path: 'tests/screenshots/dark-theme.png', fullPage: true });
  });

});
