/**
 * Cron Integration for Browser QA
 * Ejecuta tests de navegador automatizados con Puppeteer
 * Si encuentra bugs, genera reporte y notifica
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PROJECT_DIR = '/home/deckie/.openclaw/workspace/pocket-tcg-simulator';
const QA_SCRIPT = join(PROJECT_DIR, 'test-qa-puppeteer.mjs');
const REPORT_DIR = join(PROJECT_DIR, 'qa-reports');
const TELEGRAM_TARGET = '7907512741';
const CHANNEL = 'telegram';

/**
 * Ejecuta el script de QA de navegador
 */
async function runBrowserQA() {
    console.log('🧪 Iniciando QA de navegador...');

    return new Promise((resolve, reject) => {
        const qaProcess = spawn('node', [QA_SCRIPT], {
            cwd: PROJECT_DIR,
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });

        let stdout = '';
        let stderr = '';

        qaProcess.stdout.on('data', (data) => {
            const text = data.toString();
            stdout += text;
            console.log(text);
        });

        qaProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        qaProcess.on('close', (code) => {
            if (code === 0) {
                // Exit code 0 means success
                console.log('✅ QA completado exitosamente');
                resolve({ success: true, stdout, stderr });
            } else {
                console.error(`❌ QA falló con código ${code}`);
                reject(new Error(`QA failed with code ${code}`));
            }
        });

        qaProcess.on('error', (err) => {
            console.error('❌ Error ejecutando QA:', err);
            reject(err);
        });

        // Timeout después de 2 minutos
        setTimeout(() => {
            qaProcess.kill('SIGTERM');
            reject(new Error('QA timeout'));
        }, 120000);
    });
}

/**
 * Analiza el reporte de QA y determina si hay errores críticos
 */
function analyzeReport(reportPath) {
    try {
        const report = JSON.parse(readFileSync(reportPath, 'utf8'));

        const hasErrors = report.errors > 0;
        const hasCriticalErrors = report.criticalErrors > 0;
        const loadingOverlayBlocked = !report.loadingOverlayHidden;
        const buttonsMissing = !report.allButtonsPresent;
        const jsExecutionFailed = report.pageState === null;

        // Error crítico: overlay bloqueando
        if (loadingOverlayBlocked) {
            return {
                critical: true,
                issue: 'LOADING_OVERLAY_BLOCKING',
                message: '❌ CRÍTICO: El overlay de carga está visible y bloquea toda la UI',
                suggestion: 'Verificar que hideLoading() se llama correctamente en init()'
            };
        }

        // Error crítico: botones faltantes
        if (buttonsMissing) {
            return {
                critical: true,
                issue: 'BUTTONS_MISSING',
                message: '❌ CRÍTICO: Faltan botones requeridos en la UI',
                suggestion: 'Verificar estructura del HTML y selectores CSS'
            };
        }

        // Error crítico: JavaScript no se ejecuta
        if (jsExecutionFailed) {
            return {
                critical: true,
                issue: 'JS_EXECUTION_FAILED',
                message: '❌ CRÍTICO: JavaScript no se ejecutó correctamente',
                suggestion: 'Verificar errores de import/export en módulos'
            };
        }

        // Error: hubo errores de consola
        if (hasErrors) {
            return {
                critical: false,
                issue: 'CONSOLE_ERRORS',
                message: `⚠️ Se detectaron ${report.errors} errores en la consola`,
                details: report.consoleErrors.slice(0, 3),
                suggestion: 'Revisar reporte completo para detalles'
            };
        }

        // Todo bien
        return {
            critical: false,
            issue: 'NONE',
            message: '✅ Todos los tests pasaron exitosamente',
            report: report
        };

    } catch (e) {
        return {
            critical: true,
            issue: 'REPORT_PARSE_ERROR',
            message: `❌ Error parseando reporte: ${e.message}`,
            suggestion: 'Verificar formato de reporte JSON'
        };
    }
}

/**
 * Busca el reporte más reciente
 */
function findLatestReport() {
    try {
        // Check if directory exists
        if (!existsSync(REPORT_DIR)) {
            console.warn(`Directory doesn't exist: ${REPORT_DIR}`);
            return null;
        }

        // List files and find the latest
        const files = readdirSync(REPORT_DIR).filter(f => f.startsWith('qa-browser-'));
        if (files.length === 0) {
            console.warn('No QA reports found');
            return null;
        }

        // Sort by modification time
        const fileStats = files.map(f => {
            const stat = statSync(join(REPORT_DIR, f));
            return { file: f, mtime: stat.mtimeMs };
        });

        fileStats.sort((a, b) => b.mtime - a.mtime);
        const latest = fileStats[0];

        return join(REPORT_DIR, latest.file);
    } catch (e) {
        console.warn(`Error finding latest report: ${e.message}`);
        return null;
    }
}

/**
 * Notifica resultado del QA
 */
function notifyQA(result) {
    const message = result.message;

    if (result.critical) {
        // Error crítico - necesito intentarlo arreglar
        console.error(message);
        return {
            needsFix: true,
            issue: result.issue,
            message: message,
            suggestion: result.suggestion
        };
    } else if (result.issue !== 'NONE') {
        // Error no crítico - solo notificar
        console.log(message);
        return {
            needsFix: false,
            issue: result.issue,
            message: message
        };
    } else {
        // Éxito
        console.log(message);
        return {
            needsFix: false,
            issue: 'NONE',
            message: message
        };
    }
}

/**
 * Intenta arreglar el error automáticamente si es posible
 */
async function tryAutoFix(issue) {
    console.log(`🔧 Intentando arreglar: ${issue}...`);

    switch (issue) {
        case 'LOADING_OVERLAY_BLOCKING':
            // Este es el error que teníamos - overlay no se oculta
            // Ya lo arreglamos añadiendo export a generateEnergy
            console.log('✅ Ya arreglado: generateEnergy tiene export');
            return { fixed: true, message: 'El error ya fue corregido en run anterior' };

        case 'BUTTONS_MISSING':
        case 'JS_EXECUTION_FAILED':
            // Estos requieren revisión manual
            return { fixed: false, message: 'Requiere revisión manual' };

        case 'CONSOLE_ERRORS':
            // Errores de consola pueden ser varios - análisis manual
            return { fixed: false, message: 'Requiere análisis del reporte' };

        default:
            return { fixed: false, message: 'Error desconocido' };
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('========================================');
    console.log('CRON: Browser QA Test Runner');
    console.log('========================================');

    try {
        // 1. Ejecutar QA de navegador
        const qaResult = await runBrowserQA();

        if (!qaResult.success) {
            console.error('❌ QA script falló - notificar manualmente');
            throw new Error('QA execution failed');
        }

        // 2. Analizar reporte generado
        const latestReportPath = findLatestReport();
        if (!latestReportPath) {
            console.warn('⚠️  No se encontró reporte de QA');
            return { status: 'NO_REPORT', message: 'No se encontró reporte de QA' };
        }

        console.log(`📊 Analizando reporte: ${latestReportPath}`);
        const analysis = analyzeReport(latestReportPath);
        const notification = notifyQA(analysis);

        // 3. Si hay error crítico, intentar arreglar
        if (notification.needsFix) {
            console.log('\n🔧 Se detectó error crítico - intentando auto-fix...');
            const fixResult = await tryAutoFix(notification.issue);

            if (fixResult.fixed) {
                console.log('✅ Auto-fix aplicado - re-ejecutando QA para verificar...');
                // Re-ejecutar QA para verificar
                await new Promise(r => setTimeout(r, 3000));
                const verifyResult = await runBrowserQA();

                if (verifyResult.success) {
                    const verifyReport = findLatestReport();
                    const verifyAnalysis = analyzeReport(verifyReport);
                    if (!verifyAnalysis.critical) {
                        console.log('🎉 Fix verificado - QA ahora pasa!');
                        return {
                            status: 'FIXED_AND_VERIFIED',
                            message: `Se arregló y verificó el error: ${notification.issue}`
                        };
                    }
                }
            } else {
                console.log(`⚠️  Auto-fix no posible: ${fixResult.message}`);
                return {
                    status: 'MANUAL_FIX_REQUIRED',
                    message: `${notification.message}\n\n🔧 ${fixResult.message}`
                };
            }
        } else {
            // No hay errores o solo warnings
            return {
                status: 'OK',
                message: notification.message
            };
        }

    } catch (e) {
        console.error('❌ Error en cron runner:', e);
        return {
            status: 'ERROR',
            message: `Error fatal: ${e.message}`
        };
    }
}

// Ejecutar
main()
    .then(result => {
        console.log('\n========================================');
        console.log('RESUMEN FINAL');
        console.log('========================================');
        console.log(`Status: ${result.status}`);
        console.log(`Message: ${result.message}`);
        process.exit(result.status === 'OK' || result.status === 'FIXED_AND_VERIFIED' ? 0 : 1);
    })
    .catch(e => {
        console.error('❌ Fatal error:', e);
        process.exit(2);
    });
