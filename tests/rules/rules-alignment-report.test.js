#!/usr/bin/env node

/**
 * Tests for RULES_ALIGNMENT_REPORT.md
 * Validates report presence, format, and content for stories R002-R008
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for test output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    if (details) console.log(`  ${details}`);
    testsPassed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (details) console.log(`  ${details}`);
    testsFailed++;
  }
}

console.log(`${colors.blue}Running Rules Alignment Report Tests${colors.reset}\n`);

// Load the report
const reportPath = path.join(__dirname, '../../docs/RULES_ALIGNMENT_REPORT.md');
let reportContent = null;
let reportExists = false;

try {
  reportContent = fs.readFileSync(reportPath, 'utf8');
  reportExists = true;
} catch (err) {
  reportExists = false;
}

// AC1: Report file exists
assert(reportExists, 'AC1: Report file exists at docs/RULES_ALIGNMENT_REPORT.md');

if (reportExists) {
  // AC1: Report is non-empty
  assert(reportContent.length > 0, 'AC1: Report content is non-empty',
    `Size: ${reportContent.length} bytes`);

  // AC1: Report has expected header
  const hasHeader = reportContent.includes('# Rules Alignment Report');
  assert(hasHeader, 'AC1: Report has proper header',
    'Contains "# Rules Alignment Report"');

  // AC3: Opening-turn draw override section exists
  const hasOverrideSection = reportContent.includes('Opening-Turn Draw Override');
  assert(hasOverrideSection, 'AC3: Opening-turn draw override section exists');

  // AC3: Override section mentions R002
  const overrideSectionMentionsR002 = reportContent.match(/Opening-Turn Draw Override[\s\S]*?R002/);
  assert(overrideSectionMentionsR002 !== null, 'AC3: Override section references R002');

  // AC3: Override section has rationale
  const hasRationale = reportContent.includes('Rationale:');
  assert(hasRationale, 'AC3: Override section includes rationale');

  // AC3: Override section describes task-locked behavior
  const hasTaskLocked = reportContent.includes('task-locked');
  assert(hasTaskLocked, 'AC3: Override section mentions task-locked behavior');

  // AC2: Check entries for stories R002-R008
  const requiredStories = ['R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008'];
  
  for (const storyId of requiredStories) {
    const hasStoryId = reportContent.includes(storyId);
    assert(hasStoryId, `AC2: Report contains entry for ${storyId}`);
  }

  // AC2: Extract table and validate structure
  const tableMatch = reportContent.match(/\|[^|]*Story ID[^|]*\|[\s\S]*?(?=\n\n|$)/);
  const hasTable = tableMatch !== null;
  assert(hasTable, 'AC2: Report contains markdown table');

  if (hasTable) {
    const table = tableMatch[0];
    const tableRows = table.split('\n').filter(row => row.includes('|'));
    
    // Should have header + separator + at least 7 data rows
    const hasEnoughRows = tableRows.length >= 9; // header + separator + 7 stories
    assert(hasEnoughRows, 'AC2: Table has sufficient rows',
      `Found ${tableRows.length} rows`);

    // Check table headers
    const hasStoryIdHeader = table.includes('Story ID');
    const hasRuleHeader = table.includes('Rule');
    const hasSourceDocsHeader = table.includes('Source Docs');
    const hasImplementationFilesHeader = table.includes('Implementation Files');
    const hasTestFilesHeader = table.includes('Test Files');
    const hasStatusHeader = table.includes('Status');

    assert(hasStoryIdHeader, 'AC2: Table has "Story ID" column');
    assert(hasRuleHeader, 'AC2: Table has "Rule" column');
    assert(hasSourceDocsHeader, 'AC2: Table has "Source Docs" column');
    assert(hasImplementationFilesHeader, 'AC2: Table has "Implementation Files" column');
    assert(hasTestFilesHeader, 'AC2: Table has "Test Files" column');
    assert(hasStatusHeader, 'AC2: Table has "Status" column');

    // AC2: Each story has at least one source doc
    const storiesInTable = requiredStories.filter(storyId => {
      // Look for storyId in table rows (skip header and separator)
      const rowMatch = tableRows.find(row => row.includes(storyId) && !row.includes('Story ID') && !row.includes('---'));
      if (!rowMatch) return false;
      // After storyId, check if there's a source doc path
      const parts = rowMatch.split('|').map(p => p.trim());
      const storyIdx = parts.indexOf(storyId);
      if (storyIdx === -1) return false;
      // Source docs is at index 3 (after Story ID, Rule)
      const sourceDocs = parts[3] || '';
      return sourceDocs.length > 0 && sourceDocs.includes('.md');
    });

    assert(storiesInTable.length === requiredStories.length,
      'AC2: Each story has at least one source doc path',
      `Stories with source docs: ${storiesInTable.length}/${requiredStories.length}`);

    // AC2: Each story has at least one code file
    const storiesWithCode = requiredStories.filter(storyId => {
      const rowMatch = tableRows.find(row => row.includes(storyId) && !row.includes('Story ID') && !row.includes('---'));
      if (!rowMatch) return false;
      const parts = rowMatch.split('|').map(p => p.trim());
      const storyIdx = parts.indexOf(storyId);
      if (storyIdx === -1) return false;
      const codeFiles = parts[4] || '';
      return codeFiles.length > 0 && codeFiles.includes('src/');
    });

    assert(storiesWithCode.length === requiredStories.length,
      'AC2: Each story has at least one code file path',
      `Stories with code files: ${storiesWithCode.length}/${requiredStories.length}`);

    // AC2: Each story has at least one test file
    const storiesWithTests = requiredStories.filter(storyId => {
      const rowMatch = tableRows.find(row => row.includes(storyId) && !row.includes('Story ID') && !row.includes('---'));
      if (!rowMatch) return false;
      const parts = rowMatch.split('|').map(p => p.trim());
      const storyIdx = parts.indexOf(storyId);
      if (storyIdx === -1) return false;
      const testFiles = parts[5] || '';
      return testFiles.length > 0 && testFiles.includes('tests/');
    });

    assert(storiesWithTests.length === requiredStories.length,
      'AC2: Each story has at least one test file path',
      `Stories with test files: ${storiesWithTests.length}/${requiredStories.length}`);

    // AC2: Each story has a status
    const storiesWithStatus = requiredStories.filter(storyId => {
      const rowMatch = tableRows.find(row => row.includes(storyId) && !row.includes('Story ID') && !row.includes('---'));
      if (!rowMatch) return false;
      const parts = rowMatch.split('|').map(p => p.trim());
      const storyIdx = parts.indexOf(storyId);
      if (storyIdx === -1) return false;
      const status = parts[6] || '';
      return status.length > 0;
    });

    assert(storiesWithStatus.length === requiredStories.length,
      'AC2: Each story has a status value',
      `Stories with status: ${storiesWithStatus.length}/${requiredStories.length}`);
  }

  // AC4: Detailed summaries section exists
  const hasDetailedSummaries = reportContent.includes('Detailed Rule Summaries');
  assert(hasDetailedSummaries, 'AC4: Report includes detailed summaries section');

  // Check each story has a detailed summary
  for (const storyId of requiredStories) {
    // Each story should have a summary heading with the story ID
    const hasStorySummary = reportContent.includes(`${storyId}:`);
    assert(hasStorySummary, `AC4: Report includes detailed summary for ${storyId}`);
  }

  // AC4: Append-only format note exists
  const hasAppendOnlyNote = reportContent.includes('Append-Only Format');
  assert(hasAppendOnlyNote, 'AC4: Report includes append-only format note');

  // AC4: Last updated timestamp exists
  const hasLastUpdated = reportContent.includes('Last Updated:');
  assert(hasLastUpdated, 'AC4: Report includes last updated timestamp');
}

// AC5: Typecheck passes (plain JS project - just verify no syntax errors in report)
if (reportExists) {
  // For markdown, just ensure it's valid UTF-8 and doesn't have obvious issues
  const isValidUtf8 = Buffer.from(reportContent).toString() === reportContent;
  assert(isValidUtf8, 'AC5: Report file is valid UTF-8');
}

// Summary
console.log(`\n${colors.blue}Test Summary:${colors.reset}`);
console.log(`  ${colors.green}Passed:${colors.reset} ${testsPassed}`);
console.log(`  ${colors.red}Failed:${colors.reset} ${testsFailed}`);
console.log(`  ${colors.yellow}Total:${colors.reset} ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log(`\n${colors.red}Some tests failed${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}All tests passed!${colors.reset}`);
  process.exit(0);
}
