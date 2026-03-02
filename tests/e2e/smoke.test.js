/**
 * E2E Smoke Tests for Pocket TCG Simulator
 *
 * These tests verify basic browser functionality using Puppeteer.
 *
 * Prerequisites:
 * - npm install puppeteer
 * - Run the simulator: npx serve -l 3000 (from project root)
 *
 * Run with:
 *   node tests/e2e/smoke.test.js
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function runSmokeTests() {
  let browser;
  let failures = [];
  let passed = 0;

  try {
    console.log('Starting Puppeteer smoke tests...\n');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Test 1: Page loads successfully
    try {
      console.log('Test 1: Loading main page...');
      await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 5000 });
      const title = await page.title();
      console.log(`  ✓ Page loaded: "${title}"`);
      passed++;
    } catch (error) {
      failures.push({ test: 'Page load', error: error.message });
      console.log(`  ✗ Failed: ${error.message}`);
    }

    // Test 2: JavaScript execution works
    try {
      console.log('\nTest 2: Checking JavaScript execution...');
      const result = await page.evaluate(() => {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
      });
      if (result) {
        console.log('  ✓ JavaScript execution works');
        passed++;
      } else {
        throw new Error('JavaScript context not available');
      }
    } catch (error) {
      failures.push({ test: 'JavaScript execution', error: error.message });
      console.log(`  ✗ Failed: ${error.message}`);
    }

    // Test 3: Check for console errors
    try {
      console.log('\nTest 3: Checking for console errors...');
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      await page.reload();
      // Wait a bit for any async errors
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (errors.length === 0) {
        console.log('  ✓ No console errors detected');
        passed++;
      } else {
        throw new Error(`Found ${errors.length} console errors: ${errors.join(', ')}`);
      }
    } catch (error) {
      failures.push({ test: 'Console errors', error: error.message });
      console.log(`  ✗ Failed: ${error.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SMOKE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failures.length}`);
    console.log('='.repeat(50));

    if (failures.length > 0) {
      console.log('\nFailed tests:');
      failures.forEach(f => {
        console.log(`  - ${f.test}: ${f.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All smoke tests passed!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('TEST SUITE ERROR');
    console.error('='.repeat(50));
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runSmokeTests();
}

module.exports = { runSmokeTests };
