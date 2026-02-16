/**
 * Tests for Rule Lock Manifest Parsing
 * Story: R001 - Create machine-readable rule lock manifest for execution tracking
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '../docs/rule-lock-manifest.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertArrayContains(array, value, message) {
  if (!array.includes(value)) {
    throw new Error(`${message}\nArray does not contain: ${value}`);
  }
}

function runTests() {
  console.log('Running rule-lock-manifest tests...\n');

  // Test 1: Manifest file exists
  console.log('Test 1: Manifest file exists');
  assert(fs.existsSync(MANIFEST_PATH), 'Manifest file should exist');
  console.log('  ✓ PASSED\n');

  // Test 2: Manifest JSON is valid
  console.log('Test 2: Manifest JSON is valid');
  const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestContent);
  console.log('  ✓ PASSED\n');

  // Test 3: Manifest has required top-level properties
  console.log('Test 3: Manifest has required top-level properties');
  assert(manifest.version !== undefined, 'Manifest should have version');
  assert(manifest.runId !== undefined, 'Manifest should have runId');
  assert(manifest.createdAt !== undefined, 'Manifest should have createdAt');
  assert(manifest.rules !== undefined, 'Manifest should have rules');
  assertEqual(typeof manifest.rules, 'object', 'rules should be an object');
  assert(Array.isArray(manifest.rules), 'rules should be an array');
  console.log('  ✓ PASSED\n');

  // Test 4: Each rule entry has required fields
  console.log('Test 4: Each rule entry has required fields');
  const requiredFields = ['storyId', 'ruleName', 'status', 'sourceDocPath', 'codeTargets', 'testTargets'];
  
  manifest.rules.forEach((rule, index) => {
    requiredFields.forEach(field => {
      assert(rule[field] !== undefined, `Rule at index ${index} missing field: ${field}`);
    });
  });
  console.log(`  ✓ PASSED (${manifest.rules.length} rules validated)\n`);

  // Test 5: Story IDs follow expected format (R001, R002, etc.)
  console.log('Test 5: Story IDs follow expected format');
  const storyIds = manifest.rules.map(r => r.storyId);
  storyIds.forEach(id => {
    assert(/^R\d{3}$/.test(id), `Story ID should match RXXX format: ${id}`);
  });
  console.log('  ✓ PASSED\n');

  // Test 6: Status values are valid
  console.log('Test 6: Status values are valid');
  const validStatuses = ['planned', 'completed', 'in-progress'];
  manifest.rules.forEach(rule => {
    assert(validStatuses.includes(rule.status), `Invalid status: ${rule.status}`);
  });
  console.log('  ✓ PASSED\n');

  // Test 7: codeTargets and testTargets are arrays
  console.log('Test 7: codeTargets and testTargets are arrays');
  manifest.rules.forEach((rule, index) => {
    assert(Array.isArray(rule.codeTargets), `Rule at index ${index} codeTargets should be array`);
    assert(Array.isArray(rule.testTargets), `Rule at index ${index} testTargets should be array`);
  });
  console.log('  ✓ PASSED\n');

  // Test 8: Expected story IDs are present (R001-R010)
  console.log('Test 8: Expected story IDs are present (R001-R010)');
  const expectedStoryIds = [
    'R001', 'R002', 'R003', 'R004', 'R005',
    'R006', 'R007', 'R008', 'R009', 'R010'
  ];
  expectedStoryIds.forEach(id => {
    assert(storyIds.includes(id), `Expected story ID ${id} not found`);
  });
  console.log(`  ✓ PASSED (all ${expectedStoryIds.length} expected stories present)\n`);

  // Test 9: R001 is marked as completed (current story)
  console.log('Test 9: R001 is marked as completed');
  const r001 = manifest.rules.find(r => r.storyId === 'R001');
  assert(r001 !== undefined, 'R001 should exist');
  assertEqual(r001.status, 'completed', 'R001 should be marked as completed');
  console.log('  ✓ PASSED\n');

  // Test 10: Story statuses are correct (R001-R008 completed, rest planned)
  console.log('Test 10: Story statuses are correct');
  const completedStories = manifest.rules.filter(r =>
    ['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008', 'R009'].includes(r.storyId)
  );
  completedStories.forEach(rule => {
    assertEqual(rule.status, 'completed', `${rule.storyId} should be marked as completed`);
  });

  const plannedStories = manifest.rules.filter(r =>
    !['R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008', 'R009'].includes(r.storyId)
  );
  plannedStories.forEach(rule => {
    assertEqual(rule.status, 'planned', `${rule.storyId} should be marked as planned`);
  });
  console.log(`  ✓ PASSED (${completedStories.length} completed, ${plannedStories.length} planned)\n`);

  // Test 11: Run ID matches expected
  console.log('Test 11: Run ID matches expected');
  const expectedRunId = 'dfaa96d0-9c58-4ecb-a82d-ffb2849bce3f';
  assertEqual(manifest.runId, expectedRunId, 'Run ID should match expected value');
  console.log('  ✓ PASSED\n');

  console.log('='.repeat(50));
  console.log('ALL TESTS PASSED ✓');
  console.log('='.repeat(50));
}

try {
  runTests();
  process.exit(0);
} catch (error) {
  console.error('\n' + '='.repeat(50));
  console.error('TEST FAILED ✗');
  console.error('='.repeat(50));
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
