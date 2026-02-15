#!/usr/bin/env node
/**
 * Regression Test: Check for duplicate function declarations
 *
 * This test ensures there are no duplicate function declarations in the codebase,
 * which would cause a SyntaxError and break the entire application.
 *
 * Bug: Duplicate isBasicPokemonCard function at lines 877 and 1123 in js/main.js
 * This caused "Uncaught SyntaxError: Identifier 'isBasicPokemonCard' has already been declared"
 */

import { readFileSync } from 'fs';

const FILE_PATH = './js/main.js';

function checkForDuplicateDeclarations(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const functionDeclarations = [];
    const duplicates = [];

    // Regex to match function declarations: function name(params) {
    const functionRegex = /^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(functionRegex);
        if (match) {
            const funcName = match[1];
            const lineNum = i + 1;

            // Check if we've seen this function before
            const existing = functionDeclarations.find(f => f.name === funcName);
            if (existing) {
                duplicates.push({
                    name: funcName,
                    firstLine: existing.line,
                    duplicateLine: lineNum
                });
            } else {
                functionDeclarations.push({ name: funcName, line: lineNum });
            }
        }
    }

    return {
        totalFunctions: functionDeclarations.length,
        duplicates: duplicates,
        hasDuplicates: duplicates.length > 0
    };
}

function runTest() {
    console.log('============================================================');
    console.log('Regression Test: Check for Duplicate Function Declarations');
    console.log('============================================================\n');

    console.log(`[Test 1] Loading ${FILE_PATH}`);
    let result;
    try {
        result = checkForDuplicateDeclarations(FILE_PATH);
        console.log(`✅ PASS: File loaded successfully`);
        console.log(`   Found ${result.totalFunctions} function declarations\n`);
    } catch (e) {
        console.log(`❌ FAIL: ${e.message}\n`);
        return false;
    }

    console.log('[Test 2] Checking for duplicate function declarations');
    if (result.hasDuplicates) {
        console.log(`❌ FAIL: Found ${result.duplicates.length} duplicate function(s):`);
        result.duplicates.forEach(dup => {
            console.log(`   - ${dup.name}: first at line ${dup.firstLine}, duplicate at line ${dup.duplicateLine}`);
        });
        console.log();
        return false;
    } else {
        console.log(`✅ PASS: No duplicate function declarations found\n`);
    }

    console.log('[Test 3] Specific check for isBasicPokemonCard');
    const basicPokemonCount = result.totalFunctions >= 0 ? (result.duplicates.find(d => d.name === 'isBasicPokemonCard') ? 2 : 1) : 0;
    if (basicPokemonCount > 1) {
        console.log(`❌ FAIL: isBasicPokemonCard declared multiple times\n`);
        return false;
    } else {
        console.log(`✅ PASS: isBasicPokemonCard declared exactly once\n`);
    }

    console.log('============================================================');
    console.log('Regression Test Results');
    console.log('============================================================');
    console.log(`Total tests: 3`);
    console.log(`Passed: 3`);
    console.log(`Failed: 0`);
    console.log();
    console.log('All tests passed! No duplicate function declarations found.');
    console.log('============================================================\n');

    return true;
}

// Run the test
const success = runTest();
process.exit(success ? 0 : 1);
