// Debug version of main.js - adds more logging for troubleshooting
import { loadCards, getCard, getCardImage, getCardCount } from './data/card-loader.js';
import { createInitialState, cloneState, isValidState, exportState, executeAttack, canAttack, applyDamage, handleKOPokemon } from './engine/game-state.js';
import { startTurn, endTurn, drawCard, canAttachEnergy as canAttachEnergyTurn, attachEnergy as attachEnergyTurn } from './engine/turn-manager.js';
import { flipCoin, flipCoins, toggleCoin, refillCoins, getQueue } from './engine/coin.js';
import { MOVE, canPlayToActive, canPlayToBench, canAttachEnergy, canRetreat, canEvolve, executePlayToActive, executePlayToBench, executeAttachEnergy, executeRetreat, executeEvolve } from './engine/moves.js';
console.log('========================================');
console.log('Pokemon TCG Pocket Simulator - DEBUG MODE');
console.log('========================================');
let state = createInitialState();
// ============================================================================
// DEBUG: Test button availability
// ============================================================================
function debugCheckButtons() {
    console.log('🔍 Checking button availability...');
    const buttons = [
        'play-btn',
        'pause-btn',
        'step-btn',
        'speed-select',
        'load-btn',
        'save-btn',
        'edit-btn',
        'coins-btn',
        'lang-btn',
        'export-log-btn'
    ];
    buttons.forEach(id => {
        const element = document.querySelector(`#${id}`);
        if (element) {
            console.log(`✅ Found: #${id}`);
        }
        else {
            console.error(`❌ NOT FOUND: #${id}`);
        }
    });
    return buttons.every(id => document.querySelector(`#${id}`) !== null);
}
// ============================================================================
// I18N
// ============================================================================
let currentLanguage = 'es';
const translations = { es: {}, en: {} };
async function loadTranslations() {
    try {
        const [es, en] = await Promise.all([
            fetch('js/i18n/es.json').then(r => r.json()),
            fetch('js/i18n/en.json').then(r => r.json())
        ]);
        translations.es = es;
        translations.en = en;
        console.log('✅ Translations loaded');
    }
    catch (e) {
        console.warn('⚠️  Could not load translations:', e);
    }
}
function t(key, params = {}) {
    const lang = translations[currentLanguage];
    const parts = key.split('.');
    let value = lang;
    for (const part of parts) {
        if (value && value[part]) {
            value = value[part];
        }
        else {
            value = null;
            break;
        }
    }
    if (!value)
        return key;
    let result = value;
    for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
    }
    return result;
}
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = t(key);
        if (value && value !== key)
            el.textContent = value;
    });
}
// ============================================================================
// EVENT LISTENERS (DEBUG VERSION)
// ============================================================================
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    // Test buttons first
    if (!debugCheckButtons()) {
        console.error('❌ Some buttons are missing from the DOM!');
    }
    // Helper function to add listener with debug logging
    function addListener(selector, eventType, handler) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`❌ Cannot add listener: ${selector} not found`);
            return;
        }
        element.addEventListener(eventType, (e) => {
            console.log(`🖱️  Event triggered: ${selector} ${eventType}`);
            handler(e);
        });
        console.log(`✅ Listener added: ${selector} ${eventType}`);
    }
    // Game loop
    addListener('#play-btn', 'click', () => {
        console.log('▶️  Play button clicked!');
        alert('Play button clicked! State:', state);
    });
    addListener('#pause-btn', 'click', () => {
        console.log('⏸️  Pause button clicked!');
        alert('Pause button clicked!');
    });
    addListener('#step-btn', 'click', () => {
        console.log('⏭️  Step button clicked!');
        alert('Step button clicked!');
    });
    addListener('#load-btn', 'click', () => {
        console.log('📁 Load button clicked!');
        alert('Load button clicked!');
    });
    addListener('#save-btn', 'click', () => {
        console.log('💾 Save button clicked!');
        alert('Save button clicked!');
    });
    addListener('#edit-btn', 'click', () => {
        console.log('✏️  Edit button clicked!');
        alert('Edit button clicked!');
    });
    addListener('#coins-btn', 'click', () => {
        console.log('🪙 Coins button clicked!');
        alert('Coins button clicked!');
    });
    addListener('#lang-btn', 'click', () => {
        console.log('🌐 Lang button clicked!');
        alert('Lang button clicked!');
    });
    addListener('#export-log-btn', 'click', () => {
        console.log('📤 Export log button clicked!');
        alert('Export log button clicked!');
    });
    console.log('✅ Event listeners setup complete!');
}
// ============================================================================
// INIT
// ============================================================================
async function init() {
    console.log('🚀 Initializing (DEBUG MODE)...');
    try {
        // Wait for DOM to be ready
        if (document.readyState !== 'complete') {
            console.log('⏳ Waiting for DOM to be ready...');
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                }
                else {
                    window.addEventListener('load', resolve, { once: true });
                }
            });
        }
        console.log('✅ DOM is ready');
        // Load translations
        await loadTranslations();
        applyTranslations();
        // Load card data
        await loadCards();
        console.log(`✅ ${getCardCount()} cards loaded`);
        // Setup UI
        setupEventListeners();
        console.log('✅ DEBUG MODE - Ready!');
    }
    catch (e) {
        console.error('❌ Init error:', e);
        alert('Init error: ' + e.message);
    }
}
// Wait for DOM to be ready before initializing
if (document.readyState === 'complete') {
    init().catch(e => console.error('❌ Init error:', e));
}
else {
    window.addEventListener('load', () => {
        init().catch(e => console.error('❌ Init error:', e));
    });
}
