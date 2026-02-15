/**
 * Automated Browser QA Runner for Cron
 * Visits http://localhost:3000/?qa=true and captures test results
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const QA_REPORT_DIR = '/home/deckie/.openclaw/workspace/pocket-tcg-simulator/qa-reports';
const SIMULATOR_URL = 'http://localhost:3000/?qa=true';

async function runBrowserQA() {
    console.log('🧪 Starting Browser QA...');
    console.log(`📍 URL: ${SIMULATOR_URL}`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Capture console errors
    const consoleErrors = [];
    const consoleWarnings = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push({
                text: msg.text(),
                location: msg.location()
            });
            console.error(`❌ [Browser Error] ${msg.text()}`);
        } else if (msg.type() === 'warning') {
            consoleWarnings.push({
                text: msg.text()
            });
            console.warn(`⚠️  [Browser Warning] ${msg.text()}`);
        } else if (msg.text().includes('[QA]')) {
            console.log(`📋 ${msg.text()}`);
        }
    });

    // Capture page errors
    page.on('pageerror', error => {
        consoleErrors.push({
            text: error.message,
            stack: error.stack
        });
        console.error(`❌ [Page Error] ${error.message}`);
    });

    try {
        console.log('⏳ Loading page...');
        await page.goto(SIMULATOR_URL, { waitUntil: 'networkidle', timeout: 30000 });

        console.log('⏳ Waiting for QA tests to complete...');
        // Wait for QA to finish (look for report download trigger or completion message)
        await page.waitForTimeout(5000);

        // Check if page loaded correctly
        const loadingOverlay = await page.$('#status-overlay:not(.hidden)');
        if (loadingOverlay) {
            consoleErrors.push({
                text: 'Loading overlay is still visible - blocks all interactions!'
            });
            console.error('❌ Loading overlay detected!');
        }

        // Check for required buttons
        const requiredButtons = [
            '#play-btn', '#pause-btn', '#step-btn',
            '#load-btn', '#save-btn', '#edit-btn'
        ];

        for (const selector of requiredButtons) {
            const button = await page.$(selector);
            if (!button) {
                consoleErrors.push({
                    text: `Required button not found: ${selector}`
                });
                console.error(`❌ Missing button: ${selector}`);
            }
        }

        // Check JavaScript execution
        const turnNumber = await page.$eval('#turn-number', el => el.textContent);
        console.log(`✅ Page loaded - Turn: ${turnNumber}`);

        // Check for toasts (errors/success messages)
        const toasts = await page.$$eval('.toast-error, .toast-info', elements =>
            elements.map(el => el.textContent)
        );

        if (toasts.length > 0) {
            console.log(`📢 Toasts detected: ${toasts.join(', ')}`);
        }

        // Generate report
        const report = {
            timestamp: new Date().toISOString(),
            url: SIMULATOR_URL,
            totalChecks: consoleErrors.length + consoleWarnings.length + 10,
            errors: consoleErrors.length,
            warnings: consoleWarnings.length,
            status: consoleErrors.length === 0 ? 'PASS' : 'FAIL',
            consoleErrors,
            consoleWarnings,
            toasts,
            pageState: {
                turnNumber,
                loadingOverlayHidden: !(await page.$('#status-overlay:not(.hidden)'))
            }
        };

        // Save report
        if (!require('fs').existsSync(QA_REPORT_DIR)) {
            require('fs').mkdirSync(QA_REPORT_DIR, { recursive: true });
        }

        const reportPath = join(QA_REPORT_DIR, `qa-browser-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n=== QA BROWSER REPORT ===');
        console.log(`Status: ${report.status}`);
        console.log(`Errors: ${report.errors}`);
        console.log(`Warnings: ${report.warnings}`);
        console.log(`Report saved: ${reportPath}`);

        if (report.status === 'PASS') {
            console.log('✅ ALL TESTS PASSED!');
            return { success: true, report };
        } else {
            console.log('❌ TESTS FAILED!');
            consoleErrors.forEach((err, i) => {
                console.error(`${i + 1}. ${err.text}`);
            });
            return { success: false, report };
        }

    } catch (e) {
        console.error('❌ QA execution failed:', e.message);
        const failureReport = {
            timestamp: new Date().toISOString(),
            status: 'CRASH',
            error: e.message,
            stack: e.stack
        };

        const reportPath = join(QA_REPORT_DIR, `qa-browser-crash-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(failureReport, null, 2));

        return { success: false, report: failureReport };
    } finally {
        await context.close();
        await browser.close();
    }
}

// Run QA
runBrowserQA()
    .then(result => {
        process.exit(result.success ? 0 : 1);
    })
    .catch(e => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    });
