#!/usr/bin/env node
/**
 * Test to verify the SyntaxError from duplicate function declaration
 */
import { readFileSync } from 'fs';

console.log('Testing for duplicate function declaration...\n');

const mainJS = readFileSync('js/main.js', 'utf-8');
const functionRegex = /function\s+(\w+)\s*\(/g;
const matches = [];
let match;

while ((match = functionRegex.exec(mainJS)) !== null) {
    const functionName = match[1];
    const lineNumber = mainJS.substring(0, match.index).split('\n').length;
    matches.push({ name: functionName, line: lineNumber });
}

// Find duplicates
const functionCounts = {};
matches.forEach(m => {
    functionCounts[m.name] = (functionCounts[m.name] || 0) + 1;
});

const duplicates = matches.filter(m => functionCounts[m.name] > 1);

if (duplicates.length > 0) {
    console.log('❌ FOUND DUPLICATE FUNCTION DECLARATIONS:\n');
    const dupNames = [...new Set(duplicates.map(d => d.name))];
    dupNames.forEach(name => {
        const occurrences = matches.filter(m => m.name === name);
        console.log(`   Function: ${name}`);
        occurrences.forEach(o => {
            console.log(`   - Line ${o.line}`);
        });
        console.log('');
    });
    console.log('This will cause: SyntaxError: redeclaration of function <name>');
} else {
    console.log('✓ No duplicate function declarations found.');
}
