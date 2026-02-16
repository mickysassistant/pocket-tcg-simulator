#!/usr/bin/env node

/**
 * Stage 1 UI Smoke Test
 *
 * Smoke test for the collapsible controls panel that verifies:
 * 1. HTML can be parsed
 * 2. CSS files are valid
 * 3. JavaScript can be parsed
 * 4. No obvious syntax errors
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let errors = [];

function testHTMLSyntax() {
    console.log('Testing HTML syntax...');
    try {
        const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');

        // Check for basic HTML structure
        if (!html.includes('<!DOCTYPE html>')) {
            errors.push('HTML missing DOCTYPE declaration');
        }
        if (!html.includes('<html')) {
            errors.push('HTML missing <html> tag');
        }
        if (!html.includes('<head>')) {
            errors.push('HTML missing <head> tag');
        }
        if (!html.includes('<body>')) {
            errors.push('HTML missing <body> tag');
        }
        if (!html.includes('</html>')) {
            errors.push('HTML missing closing </html> tag');
        }

        // Check for unclosed tags (basic check)
        const openDivs = (html.match(/<div[^>]*>/g) || []).length;
        const closeDivs = (html.match(/<\/div>/g) || []).length;
        if (openDivs !== closeDivs) {
            errors.push(`Unbalanced <div> tags: ${openDivs} opening, ${closeDivs} closing`);
        }

        const openButtons = (html.match(/<button[^>]*>/g) || []).length;
        const closeButtons = (html.match(/<\/button>/g) || []).length;
        if (openButtons !== closeButtons) {
            errors.push(`Unbalanced <button> tags: ${openButtons} opening, ${closeButtons} closing`);
        }

        console.log('✓ HTML syntax check complete');
    } catch (error) {
        errors.push(`HTML syntax error: ${error.message}`);
    }
}

function testCSSSyntax() {
    console.log('Testing CSS syntax...');
    try {
        const cssFiles = [
            'css/battlefield.css',
            'css/dialogs.css',
            'css/log.css'
        ];

        for (const file of cssFiles) {
            try {
                const css = readFileSync(join(__dirname, file), 'utf-8');

                // Check for basic CSS errors
                const openBraces = (css.match(/{/g) || []).length;
                const closeBraces = (css.match(/}/g) || []).length;
                if (openBraces !== closeBraces) {
                    errors.push(`${file}: Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
                }

                // Check for syntax errors in the file
                if (css.includes(';;')) {
                    errors.push(`${file}: Double semicolons found`);
                }

                console.log(`✓ ${file} syntax check complete`);
            } catch (error) {
                errors.push(`${file} CSS error: ${error.message}`);
            }
        }
    } catch (error) {
        errors.push(`CSS syntax error: ${error.message}`);
    }
}

function testJSSyntax() {
    console.log('Testing JavaScript syntax...');
    try {
        const jsFiles = [
            'js/main.js'
        ];

        for (const file of jsFiles) {
            try {
                const js = readFileSync(join(__dirname, file), 'utf-8');

                // Basic syntax checks
                const openParens = (js.match(/\(/g) || []).length;
                const closeParens = (js.match(/\)/g) || []).length;
                if (openParens !== closeParens) {
                    errors.push(`${file}: Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`);
                }

                const openBraces = (js.match(/{/g) || []).length;
                const closeBraces = (js.match(/}/g) || []).length;
                if (openBraces !== closeBraces) {
                    errors.push(`${file}: Unbalanced braces: ${openParens} opening, ${closeBraces} closing`);
                }

                const openBrackets = (js.match(/\[/g) || []).length;
                const closeBrackets = (js.match(/\]/g) || []).length;
                if (openBrackets !== closeBrackets) {
                    errors.push(`${file}: Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing`);
                }

                // Check for common errors
                if (js.includes('function') && !js.includes('=>')) {
                    // Has regular functions, that's fine
                }

                console.log(`✓ ${file} syntax check complete`);
            } catch (error) {
                errors.push(`${file} JavaScript error: ${error.message}`);
            }
        }
    } catch (error) {
        errors.push(`JavaScript syntax error: ${error.message}`);
    }
}

function testControlsPanelStructure() {
    console.log('Testing controls panel structure...');
    try {
        const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');
        const js = readFileSync(join(__dirname, 'js/main.js'), 'utf-8');
        const css = readFileSync(join(__dirname, 'css/dialogs.css'), 'utf-8');

        // Check HTML structure
        if (!html.includes('class="controls-panel"')) {
            errors.push('Missing controls-panel class in HTML');
        }
        if (!html.includes('id="controls-toggle"')) {
            errors.push('Missing controls-toggle button in HTML');
        }
        if (!html.includes('class="controls-content"')) {
            errors.push('Missing controls-content class in HTML');
        }

        // Check CSS styles
        if (!css.includes('.controls-panel')) {
            errors.push('Missing .controls-panel CSS rule');
        }
        if (!css.includes('.controls-panel.collapsed')) {
            errors.push('Missing .controls-panel.collapsed CSS rule');
        }
        if (!css.includes('.controls-toggle-btn')) {
            errors.push('Missing .controls-toggle-btn CSS rule');
        }
        if (!css.includes('.controls-content')) {
            errors.push('Missing .controls-content CSS rule');
        }

        // Check JavaScript functionality
        if (!js.includes('#controls-toggle')) {
            errors.push('Missing #controls-toggle selector in JavaScript');
        }
        if (!js.includes('classList.toggle')) {
            errors.push('Missing classList.toggle in JavaScript');
        }
        if (!js.includes('collapsed')) {
            errors.push('Missing "collapsed" class handling in JavaScript');
        }

        console.log('✓ Controls panel structure check complete');
    } catch (error) {
        errors.push(`Controls panel structure error: ${error.message}`);
    }
}

function testResponsiveDesign() {
    console.log('Testing responsive design...');
    try {
        const css = readFileSync(join(__dirname, 'css/dialogs.css'), 'utf-8');

        // Check for responsive breakpoints
        if (!css.includes('@media (max-width: 1024px)')) {
            errors.push('Missing 1024px responsive breakpoint');
        }
        if (!css.includes('@media (max-width: 768px)')) {
            errors.push('Missing 768px responsive breakpoint');
        }
        if (!css.includes('@media (max-width: 480px)')) {
            errors.push('Missing 480px responsive breakpoint');
        }

        console.log('✓ Responsive design check complete');
    } catch (error) {
        errors.push(`Responsive design error: ${error.message}`);
    }
}

function testAccessibility() {
    console.log('Testing accessibility...');
    try {
        const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');

        // Check for accessibility features
        if (!html.includes('aria-label')) {
            errors.push('Missing aria-label attributes');
        }
        if (!html.includes('aria-label="Toggle controls panel"')) {
            errors.push('Missing specific aria-label for controls toggle button');
        }

        console.log('✓ Accessibility check complete');
    } catch (error) {
        errors.push(`Accessibility error: ${error.message}`);
    }
}

// Run all tests
console.log('Stage 1 UI Smoke Test');
console.log('=====================\n');

testHTMLSyntax();
testCSSSyntax();
testJSSyntax();
testControlsPanelStructure();
testResponsiveDesign();
testAccessibility();

console.log('\n=====================');
if (errors.length === 0) {
    console.log('✓ All smoke tests passed!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run serve');
    console.log('2. Open http://localhost:3000 in a browser');
    console.log('3. Manually verify the collapsible controls panel');
    console.log('4. Test responsive behavior by resizing the browser window');
    process.exit(0);
} else {
    console.log(`✗ Found ${errors.length} error(s):\n`);
    errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
    });
    process.exit(1);
}
