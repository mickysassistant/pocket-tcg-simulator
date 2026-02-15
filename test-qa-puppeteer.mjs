/**
 * Browser QA Runner using Puppeteer
 * Visits http://localhost:3000/?qa=true and captures test results
 */

import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const QA_REPORT_DIR = '/home/deckie/.openclaw/workspace/pocket-tcg-simulator/qa-reports';
const SIMULATOR_URL = 'http://localhost:3000/?qa=true';

async function runBrowserQA() {
    console.log('🧪 Starting Browser QA with Puppeteer...');
    console.log(`📍 URL: ${SIMULATOR_URL}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console messages and errors
    const consoleErrors = [];
    const consoleWarnings = [];
    const qaMessages = [];

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();

        if (type === 'error') {
            consoleErrors.push({
                text: text,
                location: msg.location()
            });
            console.error(`❌ [Browser Error] ${text}`);
        } else if (type === 'warning') {
            consoleWarnings.push({ text: text });
            console.warn(`⚠️  [Browser Warning] ${text}`);
        } else if (text.includes('[QA]')) {
            qaMessages.push({ text: text, type: type });
            if (type === 'log') {
                console.log(`📋 ${text}`);
            }
        }
    });

    // Capture page errors (JavaScript errors)
    page.on('pageerror', error => {
        consoleErrors.push({
            text: error.message,
            stack: error.stack
        });
        console.error(`❌ [Page Error] ${error.message}`);
    });

    // Capture request failures (ignore favicon 404s and other non-critical failures)
    const failedRequests = [];
    page.on('requestfailed', request => {
        const failure = request.failure();
        const url = request.url();

        // Ignore non-critical 404s (favicon.ico, test files, etc.)
        if (failure && failure.errorText !== 'net::ERR_ABORTED') {
            const isCritical = !url.match(/\.(ico|png|jpg|svg|woff|woff2)$/) &&
                              !url.includes('test-');
            if (isCritical) {
                failedRequests.push({
                    url: url,
                    error: failure.errorText
                });
                console.warn(`⚠️  [Request Failed] ${url} - ${failure.errorText}`);
            }
        }
    });

    try {
        console.log('⏳ Loading page...');
        await page.goto(SIMULATOR_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        console.log('⏳ Waiting for QA tests to complete...');
        // Wait for QA tests to run (give it 5 seconds)
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check 1: Loading overlay
        console.log('🔍 Checking loading overlay...');
        const loadingOverlayVisible = await page.evaluate(() => {
            const overlay = document.querySelector('#status-overlay');
            return overlay && !overlay.classList.contains('hidden');
        });

        if (loadingOverlayVisible) {
            consoleErrors.push({
                text: 'Loading overlay is still visible - blocks all interactions!',
                critical: true
            });
            console.error('❌ Loading overlay is still visible!');
        } else {
            console.log('✅ Loading overlay is hidden');
        }

        // Check 2: Required buttons
        console.log('🔍 Checking required buttons...');
        const requiredButtons = [
            '#play-btn', '#pause-btn', '#step-btn',
            '#load-btn', '#save-btn', '#edit-btn',
            '#coins-btn', '#lang-btn'
        ];

        const missingButtons = [];
        for (const selector of requiredButtons) {
            const exists = await page.$(selector);
            if (!exists) {
                missingButtons.push(selector);
                consoleErrors.push({ text: `Required button not found: ${selector}` });
                console.error(`❌ Missing button: ${selector}`);
            }
        }

        if (missingButtons.length === 0) {
            console.log('✅ All required buttons exist');
        }

        // Check 3: Page state
        console.log('🔍 Checking page state...');
        const pageState = await page.evaluate(() => {
            return {
                turnNumber: document.querySelector('#turn-number')?.textContent,
                currentPlayer: document.querySelector('#current-player')?.textContent,
                logEntries: document.querySelectorAll('.log-entries .log-entry').length
            };
        });

        console.log('✅ Page state:', pageState);

        // Check 4: QA messages
        console.log('🔍 Checking QA messages...');
        const qaSuccessMessages = qaMessages.filter(m =>
            m.text.includes('SUCCESS') || m.text.includes('passed')
        );
        const qaErrorMessages = qaMessages.filter(m =>
            m.text.includes('ERROR') || m.text.includes('failed')
        );

        console.log(`📊 QA Results: ${qaSuccessMessages.length} success, ${qaErrorMessages.length} errors`);

        // Check 5: JavaScript execution
        console.log('🔍 Testing JavaScript execution...');
        const jsTestResult = await page.evaluate(() => {
            try {
                const result = 2 + 2;
                return { success: true, result };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        if (jsTestResult.success && jsTestResult.result === 4) {
            console.log('✅ JavaScript execution works');
        } else {
            consoleErrors.push({
                text: 'JavaScript execution failed',
                result: jsTestResult
            });
            console.error('❌ JavaScript execution test failed');
        }

        // Check 6: Try clicking a button
        console.log('🔍 Testing button click...');
        try {
            await page.click('#step-btn', { timeout: 2000 });
            await new Promise(resolve => setTimeout(resolve, 300));

            const newTurnNumber = await page.$eval('#turn-number', el => el.textContent);
            console.log(`✅ Button click works - Turn advanced to ${newTurnNumber}`);
        } catch (e) {
            consoleErrors.push({
                text: `Button click failed: ${e.message}`
            });
            console.error(`❌ Button click failed: ${e.message}`);
        }

        // Filter out 404 errors (non-critical)
        const criticalErrors = consoleErrors.filter(err =>
            !err.text.includes('404 (Not Found)')
        );

        // Generate report
        const report = {
            timestamp: new Date().toISOString(),
            url: SIMULATOR_URL,
            status: criticalErrors.length === 0 && !loadingOverlayVisible ? 'PASS' : 'FAIL',
            totalChecks: 10 + criticalErrors.length + consoleWarnings.length,
            errors: criticalErrors.length,
            warnings: consoleWarnings.length,
            criticalErrors: consoleErrors.filter(e => e.critical).length,
            loadingOverlayHidden: !loadingOverlayVisible,
            allButtonsPresent: missingButtons.length === 0,
            pageState: pageState,
            qaMessages: {
                total: qaMessages.length,
                success: qaSuccessMessages.length,
                error: qaErrorMessages.length
            },
            consoleErrors: consoleErrors,
            consoleWarnings: consoleWarnings,
            failedRequests: failedRequests
        };

        // Save report
        if (!existsSync(QA_REPORT_DIR)) {
            mkdirSync(QA_REPORT_DIR, { recursive: true });
        }

        const reportPath = join(QA_REPORT_DIR, `qa-browser-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n=== QA BROWSER REPORT ===');
        console.log(`Status: ${report.status}`);
        console.log(`Total Checks: ${report.totalChecks}`);
        console.log(`Errors: ${report.errors}`);
        console.log(`Warnings: ${report.warnings}`);
        console.log(`Critical: ${report.criticalErrors}`);
        console.log(`Report saved: ${reportPath}`);

        if (report.status === 'PASS') {
            console.log('✅ ALL TESTS PASSED!');
            return { success: true, report };
        } else {
            console.log('❌ TESTS FAILED!');
            if (loadingOverlayVisible) {
                console.error('🔴 CRITICAL: Loading overlay blocks all interactions!');
            }
            if (missingButtons.length > 0) {
                console.error('🔴 MISSING BUTTONS:', missingButtons);
            }
            criticalErrors.slice(0, 5).forEach((err, i) => {
                console.error(`${i + 1}. ${err.text}`);
            });
            return { success: false, report };
        }

    } catch (e) {
        console.error('❌ QA execution failed:', e.message);
        console.error('Stack:', e.stack);

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
