#!/usr/bin/env node

/**
 * Puppeteer E2E Smoke Test
 *
 * This is a minimal smoke test that launches a headless browser and verifies
 * that the local simulator page loads successfully.
 *
 * Usage: node tests/e2e/smoke.test.js
 *
 * Exit codes:
 *   0 - Test passed
 *   1 - Test failed
 */

const puppeteer = require('puppeteer');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TIMEOUT_MS = 10000;

/**
 * Main test function
 */
async function runSmokeTest() {
  let browser;
  const startTime = Date.now();

  try {
    console.log('🚀 Starting Puppeteer E2E smoke test...');
    console.log(`   Target: ${BASE_URL}`);
    console.log(`   Timeout: ${TIMEOUT_MS}ms`);

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to the local app URL
    console.log('🌐 Navigating to app...');
    await page.goto(BASE_URL, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT_MS
    });

    // Verify page loaded - check title
    const title = await page.title();
    console.log(`   Page title: "${title}"`);

    // Check if we can see content (directory listing or app content)
    const bodyText = await page.evaluate(() => document.body.innerText);

    // Basic verification: ensure page has content
    if (!bodyText || bodyText.length < 10) {
      throw new Error('Page content appears empty or missing');
    }

    // Verify we're on a valid page
    const url = page.url();
    if (!url.startsWith(BASE_URL)) {
      throw new Error(`Unexpected URL: ${url}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ Smoke test passed! (${elapsed}ms)`);
    console.log(`   Successfully loaded and verified page at ${url}`);

    return 0;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Smoke test failed! (${elapsed}ms)`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(1, 4).join('\n')}`);
    }
    return 1;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Run the test and exit with appropriate code
(async () => {
  const exitCode = await runSmokeTest();
  process.exit(exitCode);
})();
