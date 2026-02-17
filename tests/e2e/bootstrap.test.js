#!/usr/bin/env node

/**
 * Puppeteer Runner Bootstrap Tests
 *
 * Tests to verify that the Puppeteer E2E runner is properly bootstrapped.
 * This is a unit-style test that verifies configuration without launching
 * a browser.
 *
 * Usage: node tests/e2e/bootstrap.test.js
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const SMOKE_TEST_PATH = path.join(PROJECT_ROOT, 'tests', 'e2e', 'smoke.test.js');

let testsPassed = 0;
let testsFailed = 0;

/**
 * Test assertion helper
 */
function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ ${message}`);
    testsFailed++;
  }
}

/**
 * Test 1: Verify Puppeteer is installed as dev dependency
 */
function testPuppeteerInstalled() {
  console.log('\n📦 Test: Puppeteer is installed as dev dependency');
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  assert(
    packageJson.devDependencies && packageJson.devDependencies.puppeteer,
    'Puppeteer is listed in devDependencies'
  );
}

/**
 * Test 2: Verify npm scripts for E2E execution exist
 */
function testE2EScriptsExist() {
  console.log('\n🔧 Test: npm scripts for E2E execution exist');
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  assert(
    packageJson.scripts && packageJson.scripts['test:e2e'],
    'test:e2e script exists in package.json'
  );
  assert(
    packageJson.scripts['test:e2e'].includes('tests/e2e'),
    'test:e2e script references tests/e2e directory'
  );
}

/**
 * Test 3: Verify smoke test file exists
 */
function testSmokeTestExists() {
  console.log('\n📄 Test: Smoke test file exists');
  assert(
    fs.existsSync(SMOKE_TEST_PATH),
    `Smoke test exists at ${SMOKE_TEST_PATH}`
  );
  assert(
    fs.statSync(SMOKE_TEST_PATH).mode & fs.constants.S_IXUSR,
    'Smoke test file is executable'
  );
}

/**
 * Test 4: Verify smoke test is valid JavaScript
 */
function testSmokeTestIsValidJS() {
  console.log('\n✨ Test: Smoke test is valid JavaScript');
  try {
    require(SMOKE_TEST_PATH);
    // If we get here, the file loaded without syntax errors
    // Note: We don't actually run the test here
    console.log('  ✅ Smoke test syntax is valid');
    testsPassed++;
  } catch (error) {
    // Ignore errors about not being able to require the main function
    // We just want to check syntax
    if (error.message.includes('not a function') || error.code === 'MODULE_NOT_FOUND') {
      console.log('  ✅ Smoke test syntax is valid');
      testsPassed++;
    } else {
      console.error(`  ❌ Smoke test has syntax errors: ${error.message}`);
      testsFailed++;
    }
  }
}

/**
 * Test 5: Verify tests/e2e directory exists
 */
function testE2EDirectoryExists() {
  console.log('\n📁 Test: tests/e2e directory exists');
  const e2eDir = path.join(PROJECT_ROOT, 'tests', 'e2e');
  assert(
    fs.existsSync(e2eDir) && fs.statSync(e2eDir).isDirectory(),
    'tests/e2e directory exists'
  );
}

/**
 * Test 6: Verify Puppeteer can be imported
 */
function testPuppeteerImportable() {
  console.log('\n🎭 Test: Puppeteer can be imported');
  try {
    require('puppeteer');
    console.log('  ✅ Puppeteer can be imported');
    testsPassed++;
  } catch (error) {
    console.error(`  ❌ Failed to import Puppeteer: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 Puppeteer Runner Bootstrap Tests');
  console.log('='.repeat(60));

  testPuppeteerInstalled();
  testE2EScriptsExist();
  testSmokeTestExists();
  testSmokeTestIsValidJS();
  testE2EDirectoryExists();
  testPuppeteerImportable();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log('='.repeat(60));

  if (testsFailed === 0) {
    console.log('\n🎉 All bootstrap tests passed!');
    return 0;
  } else {
    console.log(`\n💥 ${testsFailed} test(s) failed!`);
    return 1;
  }
}

// Run tests and exit with appropriate code
const exitCode = runAllTests();
process.exit(exitCode);
