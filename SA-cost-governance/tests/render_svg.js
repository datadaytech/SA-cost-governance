const { chromium } = require('playwright');
const fs = require('fs');

async function renderSVG() {
    const svgContent = fs.readFileSync('/Users/steve/Documents/ai_projects/sa-cost-governance-ralph/tests/splunk-coin-flat.svg', 'utf8');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const html = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background:transparent;}svg{display:block;}</style></head><body>${svgContent}</body></html>`;
    
    await page.setContent(html);
    
    // 36x36
    await page.setViewportSize({ width: 36, height: 36 });
    await page.evaluate(() => {
        const svg = document.querySelector('svg');
        svg.setAttribute('width', '36');
        svg.setAttribute('height', '36');
    });
    await page.screenshot({ path: '/tmp/appIcon.png', omitBackground: true });
    
    // 72x72
    await page.setViewportSize({ width: 72, height: 72 });
    await page.evaluate(() => {
        const svg = document.querySelector('svg');
        svg.setAttribute('width', '72');
        svg.setAttribute('height', '72');
    });
    await page.screenshot({ path: '/tmp/appIcon_2x.png', omitBackground: true });
    
    await browser.close();
    console.log('Icons rendered!');
}

renderSVG().catch(console.error);
