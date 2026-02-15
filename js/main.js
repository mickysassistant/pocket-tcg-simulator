// Pokemon TCG Pocket Simulator - Main Entry Point
// Tasks: 01-08

import { loadCards, getCard, getCardImage, getCardCount } from './data/card-loader.js';
import {
    getAllDeckPresets,
    getDeckPreset,
    validateDeckPreset
} from './data/deck-presets.js';
import {
    createInitialState,
    cloneState,
    isValidState,
    exportState,
    executeAttack,
    canAttack,
    applyDamage,
    handleKOPokemon
} from './engine/game-state.js';
import {
    startTurn,
    endTurn,
    drawCard,
    canAttachEnergy as canAttachEnergyTurn,
    attachEnergy as attachEnergyTurn
} from './engine/turn-manager.js';
import {
    flipCoin,
    flipCoins,
    toggleCoin,
    refillCoins,
    getQueue
} from './engine/coin.js';
import {
    MOVE,
    canPlayToActive,
    canPlayToBench,
    canAttachEnergy,
    canRetreat,
    canEvolve,
    executePlayToActive,
    executePlayToBench,
    executeAttachEnergy,
    executeRetreat,
    executeEvolve
} from './engine/moves.js';
import {
    canPlayTrainer,
    playTrainer,
    getTrainerEffect
} from './engine/trainers.js';

console.log('========================================');
console.log('Pokemon TCG Pocket Simulator');
console.log('========================================');

// ============================================================================
// GLOBAL STATE
// ============================================================================

let state = createInitialState();

// Game loop control (Task 07)
let isPaused = true;
let gameLoopInterval = null;
let baseSpeedMs = 1000;
let currentSpeed = 1;

// Drag & drop state (Task 08)
let dragData = null; // { playerId, source, handIndex, cardId }

// Edit mode state (Task 17)
let editMode = false;
let editTarget = null; // { playerId, location } - location: 'active' or bench index

// Trainer card play modal state (Stage 1)
let trainerModalState = null; // { playerId, handIndex, cardId, card, selectedTarget, targetType }

// Retreat modal state (Stage 2)
let retreatModalState = null; // { playerId, benchIndex, retreatCost, selectedEnergyIndices }

// New game modal state (Stage 3)
let newGameModalState = null; // { player1DeckId, player2DeckId }

// i18n
let currentLanguage = 'es';
const translations = { es: {}, en: {} };

// ============================================================================
// I18N
// ============================================================================

async function loadTranslations() {
    try {
        const [es, en] = await Promise.all([
            fetch('js/i18n/es.json').then(r => r.json()),
            fetch('js/i18n/en.json').then(r => r.json())
        ]);
        translations.es = es;
        translations.en = en;
        console.log('✅ Translations loaded');
    } catch (e) {
        console.warn('⚠️  Could not load translations:', e);
    }
}

/**
 * Translation helper - get localized string by key with optional parameters
 * @param {string} key - Translation key (e.g., "ui.play" or "alerts.gameOverWinnerWins")
 * @param {Object} params - Optional parameters to replace in template (e.g., { winner: "Player 1" })
 * @returns {string} Localized string
 */
function t(key, params = {}) {
    const lang = translations[currentLanguage];
    const parts = key.split('.');
    let value = lang;
    for (const part of parts) {
        if (value && value[part]) { value = value[part]; } else { value = null; break; }
    }
    
    if (!value) return key; // Return key if translation not found
    
    // Replace parameters in template (e.g., "{winner}" with actual value)
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
        if (value && value !== key) el.textContent = value;
    });

    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const titleText = t('game.title');
        if (titleText && titleText !== 'game.title') {
            pageTitle.textContent = titleText;
        }
    }

    // Also update dynamic elements that need translation
    updateDynamicTranslations();
}

/**
 * Update elements that need dynamic translation updates
 * (e.g., alert banners, modal titles that change at runtime)
 */
function updateDynamicTranslations() {
    const editModeBanner = document.querySelector('.edit-mode-banner');
    if (editModeBanner && editModeBanner.textContent.includes('EDIT MODE')) {
        editModeBanner.textContent = '✏️ ' + t('ui.editMode') + ' — ' + (t('edit.clickToEdit') || '✏️ EDIT MODE — Click any Pokemon to edit');
    }

    // Update status select options
    updateSelectOptions('edit-status', [
        { value: '', label: t('status.none') },
        { value: 'poison', label: t('status.poison') },
        { value: 'poison+', label: t('status.poisonPlus') },
        { value: 'burn', label: t('status.burn') },
        { value: 'sleep', label: t('status.sleep') },
        { value: 'paralysis', label: t('status.paralysis') },
        { value: 'confusion', label: t('status.confusion') }
    ]);

    // Update energy type select options
    updateSelectOptions('edit-energy-type', [
        { value: 'G', label: t('energyTypes.G') },
        { value: 'R', label: t('energyTypes.R') },
        { value: 'W', label: t('energyTypes.W') },
        { value: 'L', label: t('energyTypes.L') },
        { value: 'P', label: t('energyTypes.P') },
        { value: 'F', label: t('energyTypes.F') },
        { value: 'D', label: t('energyTypes.D') },
        { value: 'M', label: t('energyTypes.M') },
        { value: 'C', label: t('energyTypes.C') }
    ]);
}

/**
 * Update select options with translated labels
 * @param {string} selectId - ID of the select element
 * @param {Array<{value: string, label: string}>} options - Options to set
 */
function updateSelectOptions(selectId, options) {
    const select = document.querySelector(`#${selectId}`);
    if (!select) return;

    // Save current value
    const currentValue = select.value;

    // Clear and rebuild options
    select.innerHTML = options.map(opt =>
        `<option value="${opt.value}">${opt.label}</option>`
    ).join('');

    // Restore value if it still exists
    if (options.some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

// ============================================================================
// RENDER
// ============================================================================

function renderPokemon(pokemon, container, opts = {}) {
    if (!pokemon || !pokemon.cardId) {
        // Enhanced empty slot with icon, contextual message, and hint
        const zoneType = opts.zoneType || 'general';
        let emptyIcon = '➖';
        let emptyText = t('game.empty');
        let emptyHint = '';

        // Contextual empty messages with hints
        if (zoneType === 'active') {
            emptyIcon = '⭐';
            emptyText = t('game.emptyActive') || 'Active';
            emptyHint = t('ui.emptyActiveHint') || 'Play a Basic Pokemon here';
        } else if (zoneType === 'bench') {
            emptyIcon = '📋';
            emptyText = t('game.emptyBench') || 'Bench';
            emptyHint = t('ui.emptyBenchHint') || 'Drag Pokemon to bench';
        } else if (zoneType === 'hand') {
            emptyIcon = '🃏';
            emptyText = t('game.emptyHand') || 'Hand';
            emptyHint = t('ui.emptyHandHint') || 'Drag cards here from your hand';
        }

        container.innerHTML = `
            <div class="empty-slot empty-${zoneType}">
                <div class="empty-icon">${emptyIcon}</div>
                <div class="empty-text">${emptyText}</div>
                ${emptyHint ? `<div class="empty-hint">${emptyHint}</div>` : ''}
            </div>
        `;
        return;
    }
    const card = getCard(pokemon.cardId);
    if (!card) {
        container.innerHTML = `
            <div class="empty-slot unknown-card">
                <div class="empty-icon">❓</div>
                <div class="empty-text">${t('game.unknown')}</div>
            </div>
        `;
        return;
    }

    const imageUrl = getCardImage(pokemon.cardId, 'small');
    const maxHp = card.hp || 0;

    container.innerHTML = `
        <div class="pokemon-card${opts.draggable ? ' draggable' : ''}" data-card-id="${pokemon.cardId}"
             ${opts.draggable ? 'draggable="true"' : ''}>
            <img src="${imageUrl}" alt="${card.name}" loading="lazy" />
            <div class="hp-badge">${pokemon.currentHp}/${maxHp}</div>
            <div class="energy-display">
                ${(pokemon.energy || []).map(e => `<span class="energy energy-${e}">${e}</span>`).join('')}
            </div>
            ${pokemon.status ? `<div class="status-badge status-${pokemon.status}">${pokemon.status}</div>` : ''}
        </div>
    `;
}

function render(st) {
    renderPlayer(st.player1, 'player1');
    renderPlayer(st.player2, 'player2');
    renderStadium(st.stadium);
    renderAttackPanel(st);

    document.querySelector('#turn-number').textContent = st.turn;
    document.querySelector('#current-player').textContent =
        st.currentPlayer === 'player1' ? 'Player 1' : 'Player 2';

    renderCoinPreview(); // T16: Render coin preview (next 3 coins)
    renderLog(st.log);
}

function renderPlayer(player, playerId) {
    const isCurrent = state.currentPlayer === playerId;

    // Active Pokemon
    const activeZone = document.querySelector(`.active-zone[data-player="${playerId}"]`);
    renderPokemon(player.active, activeZone, { zoneType: 'active' });
    // Active zone is a drop target (for retreat, evolve, energy)
    activeZone.classList.toggle('drop-target', isCurrent);

    // Bench
    for (let i = 0; i < 3; i++) {
        const slot = document.querySelector(`.bench-slot[data-index="${i}"][data-player="${playerId}"]`);
        if (!slot) continue;
        const pokemon = player.bench[i] || null;
        renderPokemon(pokemon, slot, { zoneType: 'bench' });
        slot.classList.toggle('drop-target', isCurrent);
    }

    // Hand (draggable cards)
    const handZone = document.querySelector(`.hand[data-player="${playerId}"]`);
    if (player.hand.length === 0) {
        // Show empty state for hand
        handZone.innerHTML = `
            <div class="empty-slot empty-hand">
                <div class="empty-icon">🃏</div>
                <div class="empty-text">${t('game.emptyHand') || 'Empty Hand'}</div>
            </div>
        `;
    } else {
        handZone.innerHTML = player.hand.map((cardId, idx) => {
            const card = getCard(cardId);
            if (!card) return '<div class="empty-slot">?</div>';
            const imgUrl = getCardImage(cardId, 'small');
            const isTrainer = isTrainerCard(card);
            const cardClass = isTrainer ? 'pokemon-card mini trainer-card clickable' : 'pokemon-card mini draggable';
            const draggable = isTrainer ? 'false' : 'true';
            return `
                <div class="${cardClass}" ${draggable === 'true' ? 'draggable="true"' : ''}
                     data-card-id="${cardId}" data-hand-index="${idx}" data-player="${playerId}"
                     data-is-trainer="${isTrainer}">
                    <img src="${imgUrl}" alt="${card.name}" loading="lazy" draggable="false" />
                </div>
            `;
        }).join('');
    }

    // Deck & discard counts
    const dc = document.querySelector(`.deck[data-player="${playerId}"] .pile-count`);
    if (dc) dc.textContent = player.deck.length;
    const disc = document.querySelector(`.discard[data-player="${playerId}"] .pile-count`);
    if (disc) disc.textContent = player.discard.length;

    // Energy Zone (draggable when available)
    const curE = document.querySelector(`.energy-zone[data-player="${playerId}"] .energy-current .energy-icon`);
    const nxtE = document.querySelector(`.energy-zone[data-player="${playerId}"] .energy-next .energy-icon`);
    if (curE) {
        const e = player.energyZone.currentEnergy;
        curE.textContent = e || '—';
        if (e && isCurrent && !player.energyZone.usedThisTurn) {
            curE.classList.add('draggable');
            curE.draggable = true;
            curE.dataset.dragType = 'energy';
            curE.dataset.player = playerId;
        } else {
            curE.classList.remove('draggable');
            curE.draggable = false;
        }
    }
    if (nxtE) nxtE.textContent = player.energyZone.nextEnergy || '—';

    // Points
    const pv = document.querySelector(`.points-value[data-bind="${playerId}.points"]`);
    if (pv) pv.textContent = player.points;
}

function renderStadium(stadium) {
    const zone = document.querySelector('.stadium-zone');
    if (stadium) {
        const card = getCard(stadium);
        if (card) {
            const imgUrl = getCardImage(stadium, 'small');
            zone.innerHTML = `<div class="pokemon-card stadium"><img src="${imgUrl}" alt="${card.name}" loading="lazy" /></div>`;
            return;
        }
    }
    const hint = t('ui.stadiumHint') || 'Play a Stadium card here';
    zone.innerHTML = `
        <div class="stadium-placeholder">
            <div class="stadium-icon">🏟️</div>
            <div class="stadium-hint">${hint}</div>
        </div>
    `;
}

// ============================================================================
// ATTACK PANEL (Task 09: Damage Calculation + Weakness)
// ============================================================================

function renderAttackPanel(st) {
    const container = document.querySelector('#attack-buttons');
    if (!container) return;

    const currentPlayerId = st.currentPlayer;
    const currentPlayer = st[currentPlayerId];
    const attacker = currentPlayer.active;

    if (!attacker || !attacker.cardId) {
        container.innerHTML = '<div class="empty-slot" style="width:100%">No active Pokemon</div>';
        return;
    }

    const attackerCard = getCard(attacker.cardId);
    if (!attackerCard || !attackerCard.attacks || attackerCard.attacks.length === 0) {
        container.innerHTML = '<div class="empty-slot" style="width:100%">No attacks available</div>';
        return;
    }

    container.innerHTML = '';

    // Add retreat button (Stage 2)
    const retreatBtn = document.createElement('button');
    retreatBtn.className = 'attack-button retreat-button';
    retreatBtn.innerHTML = `
        <div>
            <div class="attack-name">${t('retreat.title')}</div>
        </div>
        <div class="attack-damage">↩️</div>
    `;

    // Check if retreat is possible
    const canRetreatActive = canRetreatActivePokemon(st, currentPlayerId);
    retreatBtn.disabled = !canRetreatActive;
    retreatBtn.addEventListener('click', () => openRetreatModal(currentPlayerId));
    container.appendChild(retreatBtn);

    // Add separator
    const separator = document.createElement('div');
    separator.className = 'attack-panel-separator';
    separator.textContent = '⚔️';
    container.appendChild(separator);

    // Check if already attacked this turn
    if (currentPlayer.attackedThisTurn) {
        container.innerHTML += '<div class="empty-slot" style="width:100%">Already attacked this turn</div>';
        return;
    }

    // Check if opponent has active Pokemon
    const opponentId = currentPlayerId === 'player1' ? 'player2' : 'player1';
    const opponent = st[opponentId];
    if (!opponent || !opponent.active) {
        container.innerHTML += '<div class="empty-slot" style="width:100%">No target to attack</div>';
        return;
    }

    attackerCard.attacks.forEach((attack, index) => {
        const button = document.createElement('button');
        button.className = 'attack-button';
        button.dataset.attackIndex = index;

        // Parse damage
        const damageMatch = attack.damage?.match(/(\d+)/);
        const damage = damageMatch ? damageMatch[1] : '0';

        // Build energy cost display
        const energyCostHtml = (attack.energyCost || []).map(type =>
            `<span class="energy-cost-icon energy-${type}">${type}</span>`
        ).join('');

        button.innerHTML = `
            <div>
                <div class="attack-cost">${energyCostHtml}</div>
                <div class="attack-name">${attack.name}</div>
            </div>
            <div class="attack-damage">${damage}</div>
        `;

        // Check if attack can be used
        const canUse = canAttack(st, index, getCard);

        button.disabled = !canUse;

        button.addEventListener('click', () => handleAttackClick(index));

        container.appendChild(button);
    });
}

function handleAttackClick(attackIndex) {
    if (state.winner) {
        showErrorModal(
            t('error.gameOver'),
            t('alerts.gameOverLoadScenario'),
            {
                severity: ErrorSeverity.WARNING,
                suggestion: t('error.suggestionGameOver'),
                primaryAction: {
                    text: t('ui.loadScenario'),
                    onClick: () => document.querySelector('#load-btn')?.click()
                }
            }
        );
        return;
    }

    const currentPlayerId = state.currentPlayer;
    const currentPlayer = state[currentPlayerId];

    if (currentPlayer.attackedThisTurn) {
        logError(t('alerts.alreadyAttackedThisTurn'));
        return;
    }

    // Validate energy cost before attacking (BUG-007 fix)
    if (!canAttack(state, attackIndex, getCard)) {
        logError(t('alerts.notEnoughEnergy') || 'Not enough energy for this attack');
        return;
    }

    // Validate status effects that prevent attacking (BUG-009 fix)
    const attacker = currentPlayer.active;
    if (attacker && (attacker.status === 'paralysis' || attacker.status === 'sleep')) {
        logError(t('alerts.cannotAttackStatus') || `Cannot attack while ${attacker.status}`);
        return;
    }

    // Handle Confusion: flip coin, tails = 20 damage to self (BUG-004 fix)
    if (attacker && attacker.status === 'confusion') {
        const coinResult = state.coinQueue && state.coinQueue.length > 0
            ? state.coinQueue.shift()
            : Math.random() < 0.5;
        if (!coinResult) {
            // Tails: deal 20 damage to self instead of attacking
            attacker.currentHp -= 20;
            if (attacker.currentHp <= 0) {
                attacker.currentHp = 0;
                state = handleKOPokemon(state, currentPlayerId, 'active', getCard);
            }
            state[currentPlayerId].attackedThisTurn = true;
            state.log.push({
                timestamp: Date.now(),
                turn: state.turn,
                player: currentPlayerId,
                action: 'confusion',
                details: 'Confusion: tails - dealt 20 damage to self'
            });
            render(state);
            state = endTurn(state, getCard);
            render(state);
            return;
        }
        // Heads: attack normally, confusion cleared
        state.log.push({
            timestamp: Date.now(),
            turn: state.turn,
            player: currentPlayerId,
            action: 'confusion',
            details: 'Confusion: heads - attack proceeds normally'
        });
    }

    // Execute attack
    state = executeAttack(state, attackIndex, getCard);
    render(state);

    // End turn after attack (attack phase ends turn)
    state = endTurn(state, getCard);
    render(state);

    // Check for game over
    if (state.winner) {
        setTimeout(() => {
            showErrorModal(
                t('error.gameOver'),
                t('alerts.gameOverWinnerWins', { winner: state.winner }),
                {
                    severity: ErrorSeverity.ERROR,
                    icon: '🏆',
                    primaryAction: {
                        text: t('ui.loadScenario'),
                        onClick: () => document.querySelector('#load-btn')?.click()
                    }
                }
            );
        }, 100);
    }
}

function renderLog(log) {
    const el = document.querySelector('.log-entries');
    if (!el) return;
    if (!log.length) {
        const emptyMessage = t('ui.noActions') || '⏳ Waiting for game to start...';
        const hint = t('ui.noActionsSimple') || 'No actions yet';
        el.innerHTML = `<div class="log-empty" data-i18n="ui.noActions" data-hint="${hint}">${emptyMessage}</div>`;
        return;
    }

    // Group by turn
    const groupedByTurn = {};
    for (const entry of log) {
        const turn = entry.turn ?? 0;
        if (!groupedByTurn[turn]) {
            groupedByTurn[turn] = [];
        }
        groupedByTurn[turn].push(entry);
    }

    // Build HTML with turn grouping
    const sortedTurns = Object.keys(groupedByTurn).map(Number).sort((a, b) => a - b);
    const html = sortedTurns.map(turn => {
        const entries = groupedByTurn[turn];
        const header = `<div class="log-turn-header">${t('game.turn')} ${turn}</div>`;
        const entryHtml = entries.map(entry => {
            const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
            // Color-code based on action type
            let actionClass = 'log-action';
            if (['damage', 'attack', 'ko'].includes(entry.action)) {
                actionClass += ' log-action-damage';
            } else if (['heal', 'recovery'].includes(entry.action)) {
                actionClass += ' log-action-healing';
            } else if (['checkup', 'status', 'poison', 'burn', 'sleep', 'paralysis'].includes(entry.action)) {
                actionClass += ' log-action-status';
            } else if (['draw', 'drawCard', 'evolve', 'playCard', 'attachEnergy'].includes(entry.action)) {
                actionClass += ' log-action-card';
            } else if (['ability', 'trigger'].includes(entry.action)) {
                actionClass += ' log-action-ability';
            } else if (['gameOver', 'win'].includes(entry.action)) {
                actionClass += ' log-action-damage'; // Use damage color for win messages
            }
            return `<div class="log-entry">
                <span class="log-time">${time}</span>
                <span class="log-player">${entry.player ?? ''}</span>
                <span class="${actionClass}">${entry.action}${entry.details ? ' — ' + entry.details : ''}${entry.card ? ' [' + entry.card + ']' : ''}</span>
            </div>`;
        }).join('');
        return header + entryHtml;
    }).join('');

    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
}

// Export log as text file
function exportLog() {
    if (!state.log || state.log.length === 0) {
        showErrorModal(
            t('error.cannotExport'),
            t('alerts.noLogEntriesToExport'),
            {
                severity: ErrorSeverity.WARNING,
                suggestion: t('error.suggestionEmptyLog')
            }
        );
        return;
    }

    // Group by turn
    const groupedByTurn = {};
    for (const entry of state.log) {
        const turn = entry.turn ?? 0;
        if (!groupedByTurn[turn]) {
            groupedByTurn[turn] = [];
        }
        groupedByTurn[turn].push(entry);
    }

    // Build text content
    const sortedTurns = Object.keys(groupedByTurn).map(Number).sort((a, b) => a - b);
    const lines = [];
    lines.push(t('log.logHeader'));
    lines.push(`${t('log.exported')} ${new Date().toISOString()}`);
    lines.push(`${t('log.totalTurns')} ${Math.max(...sortedTurns)}`);
    lines.push('');

    for (const turn of sortedTurns) {
        lines.push(t('log.turnHeader', { turn }));
        for (const entry of groupedByTurn[turn]) {
            const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
            const player = entry.player ?? '';
            const action = entry.action;
            const details = entry.details ? ' — ' + entry.details : '';
            const card = entry.card ? ' [' + entry.card + ']' : '';
            lines.push(`[${time}] ${player}: ${action}${details}${card}`);
        }
        lines.push('');
    }

    lines.push('=== End of Log ===');

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-log-turn-${state.turn}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// DRAG & DROP (Task 08)
// ============================================================================

function setupDragAndDrop() {
    const bf = document.getElementById('battlefield');

    // --- DRAG START ---
    bf.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.draggable');
        if (!card) { e.preventDefault(); return; }

        // Energy drag
        if (card.dataset.dragType === 'energy') {
            dragData = { type: 'energy', playerId: card.dataset.player };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'energy');
            card.classList.add('dragging');
            return;
        }

        // Card from hand
        const playerId = card.dataset.player;
        const handIndex = parseInt(card.dataset.handIndex, 10);
        const cardId = card.dataset.cardId;
        if (isNaN(handIndex)) { e.preventDefault(); return; }

        dragData = { type: 'card', playerId, handIndex, cardId };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cardId);
        card.classList.add('dragging');
    });

    // --- DRAG OVER / ENTER ---
    bf.addEventListener('dragover', (e) => {
        if (!dragData) return;
        const zone = e.target.closest('.active-zone, .bench-slot, .bench');
        if (zone) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });

    bf.addEventListener('dragenter', (e) => {
        const zone = e.target.closest('.active-zone, .bench-slot, .bench');
        if (zone && dragData) zone.classList.add('drag-over');
    });

    bf.addEventListener('dragleave', (e) => {
        const zone = e.target.closest('.active-zone, .bench-slot, .bench');
        if (zone) zone.classList.remove('drag-over');
    });

    // --- DROP ---
    bf.addEventListener('drop', (e) => {
        e.preventDefault();
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));

        if (!dragData) return;

        const zone = e.target.closest('.active-zone, .bench-slot, .bench');
        if (!zone) { dragData = null; return; }

        const targetPlayer = zone.dataset.player || zone.closest('[data-player]')?.dataset.player;

        if (dragData.type === 'energy') {
            handleEnergyDrop(zone, targetPlayer);
        } else if (dragData.type === 'card') {
            handleCardDrop(zone, targetPlayer);
        }

        dragData = null;
    });

    // --- DRAG END (cleanup) ---
    bf.addEventListener('dragend', () => {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        dragData = null;
    });
}

function handleEnergyDrop(zone, targetPlayer) {
    const { playerId } = dragData;
    if (targetPlayer !== playerId) { logError(t('alerts.canOnlyAttachToOwnPokemon')); return; }

    const check = canAttachEnergy(state, playerId);
    if (!check.valid) { logError(t(check.reasonKey)); return; }

    let target;
    if (zone.classList.contains('active-zone')) {
        target = 'active';
    } else if (zone.classList.contains('bench-slot')) {
        target = parseInt(zone.dataset.index, 10);
    } else {
        logError(t('alerts.dropEnergyOnPokemon')); return;
    }

    // Verify target has a Pokemon
    const player = state[playerId];
    const pokemon = target === 'active' ? player.active : player.bench[target];
    if (!pokemon) { logError(t('alerts.noPokemonInSlot')); return; }

    state = executeAttachEnergy(state, playerId, target);
    render(state);
    console.log(`⚡ Energy attached to ${target}`);
}

function handleCardDrop(zone, targetPlayer) {
    const { playerId, handIndex, cardId } = dragData;
    const card = getCard(cardId);
    if (!card) { logError(t('alerts.cardNotFound')); return; }

    // Only allow dropping on your own side (sandbox: both sides allowed)
    // For now, allow any player to drag to their own zones
    if (targetPlayer !== playerId) { logError(t('alerts.canOnlyPlayToOwnZones')); return; }

    const isBasic = isBasicPokemonCard(card);
    const isEvolution = !isBasic && card.supertype === 'Pokémon';

    // --- Drop on Active zone ---
    if (zone.classList.contains('active-zone')) {
        const player = state[playerId];

        if (isEvolution && player.active) {
            // Try to evolve
            return handleEvolveDrop(playerId, handIndex, 'active', card);
        }

        if (!isBasic) { logError(t('alerts.onlyBasicToActive')); return; }
        const check = canPlayToActive(state, playerId, handIndex);
        if (!check.valid) { logError(t(check.reasonKey)); return; }

        state = executePlayToActive(state, playerId, handIndex, card);
        render(state);
        console.log(`🃏 ${card.name} played to Active`);
        return;
    }

    // --- Drop on Bench slot or Bench container ---
    if (zone.classList.contains('bench-slot') || zone.classList.contains('bench')) {
        const player = state[playerId];

        // If dropping on a specific bench slot with a Pokemon, try evolve
        if (zone.classList.contains('bench-slot')) {
            const benchIdx = parseInt(zone.dataset.index, 10);
            if (isEvolution && player.bench[benchIdx]) {
                return handleEvolveDrop(playerId, handIndex, benchIdx, card);
            }
        }

        if (!isBasic) { logError(t('alerts.onlyBasicToBench')); return; }
        const check = canPlayToBench(state, playerId, handIndex);
        if (!check.valid) { logError(t(check.reasonKey)); return; }

        state = executePlayToBench(state, playerId, handIndex, card);
        render(state);
        console.log(`🃏 ${card.name} played to Bench`);
        return;
    }

    logError(t('alerts.invalidDropZone'));
}

function handleEvolveDrop(playerId, handIndex, targetLocation, evoCard) {
    const check = canEvolve(state, playerId, handIndex, targetLocation, getCard);
    if (!check.valid) { logError(t(check.reasonKey)); return; }

    // Target Pokemon reference (already validated in canEvolve)
    const target = targetLocation === 'active'
        ? state[playerId].active
        : state[playerId].bench[targetLocation];
    if (!target) { logError(t('alerts.noPokemonToEvolve')); return; }

    const targetCard = getCard(target.cardId);
    if (!targetCard) { logError(t('alerts.targetCardNotFound')); return; }

    // Check evolvesFrom matches target name
    // TODO-Pocket-Verify: evolution chain field names in card data
    if (evoCard.evolvesFrom && evoCard.evolvesFrom !== targetCard.name) {
        logError(t('alerts.evolutionMismatch', { cardName: evoCard.name, evolvesFrom: evoCard.evolvesFrom, targetName: targetCard.name }));
        return;
    }

    state = executeEvolve(state, playerId, handIndex, targetLocation, evoCard, getCard);
    render(state);
    console.log(`🔄 ${targetCard.name} evolved into ${evoCard.name}`);
}

/**
 * Error severity levels for better error categorization
 * @enum {string}
 */
const ErrorSeverity = {
    WARNING: 'warning',   // User can continue (minor issue)
    ERROR: 'error',       // Action failed but app is stable
    CRITICAL: 'critical'  // Something went wrong, may need reload
};

/**
 * Error categories for better error messages
 * @enum {string}
 */
const ErrorCategory = {
    VALIDATION: 'validation',     // Invalid user input/action
    GAME_STATE: 'game_state',     // Invalid game state
    NETWORK: 'network',           // Failed to load resources
    SYSTEM: 'system'              // Unexpected errors
};

/**
 * Enhanced error logging with categorization, severity, and user-friendly messages
 * @param {string} msg - Error message
 * @param {Object} options - Error options
 * @param {ErrorCategory} options.category - Error category
 * @param {ErrorSeverity} options.severity - Error severity
 * @param {string} options.suggestion - Recovery suggestion for user
 * @param {Error} options.error - Original error object (for debugging)
 */
function logError(msg, options = {}) {
    const { category = ErrorCategory.VALIDATION, severity = ErrorSeverity.WARNING, suggestion, error } = options;

    // Console logging with full context
    console.group(`❌ [${severity.toUpperCase()}] ${msg}`);
    console.log(`Category: ${category}`);
    if (suggestion) console.log(`Suggestion: ${suggestion}`);
    if (error) console.error('Original error:', error);
    console.groupEnd();

    // User-friendly toast notification
    let displayMsg = msg;
    if (severity === ErrorSeverity.CRITICAL) {
        displayMsg = '⚠️ ' + displayMsg;
    }

    // Add suggestion to toast if available
    if (suggestion) {
        displayMsg += `\n💡 ${suggestion}`;
    }

    const toast = document.createElement('div');
    toast.className = `toast-error toast-${severity}`;
    toast.textContent = displayMsg;
    document.body.appendChild(toast);

    // Show duration based on severity
    const duration = severity === ErrorSeverity.CRITICAL ? 4000 : 2500;
    setTimeout(() => toast.remove(), duration);
}

/**
 * Show error modal with detailed information and recovery options
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {Object} options - Modal options
 * @param {ErrorSeverity} options.severity - Error severity
 * @param {string} options.suggestion - Recovery suggestion
 * @param {Error} options.error - Original error object for details
 * @param {Object} options.primaryAction - Primary button action { text, onClick }
 * @param {Function} options.onClose - Callback when modal closes
 */
function showErrorModal(title, message, options = {}) {
    const {
        severity = ErrorSeverity.ERROR,
        suggestion,
        error,
        primaryAction,
        onClose
    } = options;

    const modal = document.querySelector('#error-modal');
    const icon = modal.querySelector('.error-modal-icon');
    const titleEl = modal.querySelector('#error-modal-title');
    const messageEl = modal.querySelector('#error-modal-message');
    const suggestionEl = modal.querySelector('#error-modal-suggestion');
    const detailsEl = modal.querySelector('#error-modal-details');
    const detailsContent = modal.querySelector('#error-modal-details-content');
    const primaryBtn = modal.querySelector('#error-modal-primary');
    const secondaryBtn = modal.querySelector('#error-modal-secondary');

    // Set icon and title based on severity
    if (severity === ErrorSeverity.CRITICAL) {
        icon.textContent = '🔴';
        icon.classList.add('critical');
        titleEl.className = 'error-modal-title';
    } else if (severity === ErrorSeverity.WARNING) {
        icon.textContent = '⚠️';
        icon.classList.remove('critical');
        titleEl.className = 'error-modal-title warning';
    } else {
        icon.textContent = '❌';
        icon.classList.remove('critical');
        titleEl.className = 'error-modal-title';
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    messageEl.className = `error-modal-message ${severity === ErrorSeverity.WARNING ? 'warning' : ''}`;

    // Set suggestion if provided
    if (suggestion) {
        suggestionEl.textContent = suggestion;
        suggestionEl.classList.remove('hidden');
    } else {
        suggestionEl.classList.add('hidden');
    }

    // Set details if error provided
    if (error) {
        detailsContent.textContent = error.stack || String(error);
        detailsEl.classList.remove('hidden');
    } else {
        detailsEl.classList.add('hidden');
    }

    // Set primary button action
    if (primaryAction) {
        primaryBtn.textContent = primaryAction.text;
        primaryBtn.className = `btn-primary ${severity === ErrorSeverity.WARNING ? 'warning' : ''}`;
        primaryBtn.onclick = () => {
            if (primaryAction.onClick) primaryAction.onClick();
            hideErrorModal();
        };
        primaryBtn.classList.remove('hidden');
    } else {
        primaryBtn.classList.add('hidden');
    }

    // Close button
    secondaryBtn.onclick = () => {
        if (onClose) onClose();
        hideErrorModal();
    };

    // Show modal
    modal.classList.add('active');
}

/**
 * Hide error modal
 */
function hideErrorModal() {
    document.querySelector('#error-modal').classList.remove('active');
}

/**
 * Show informational message as toast (non-error feedback)
 * @param {string} msg - Informational message
 */
function logInfo(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-info';
    toast.textContent = `✅ ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================================================
// SCENARIO / CONTROLS
// ============================================================================

function loadScenario(json) {
    showLoading(t('ui.loadingScenario') || 'Loading scenario...');
    try {
        const scenario = JSON.parse(json);

        if (!isValidState(scenario)) {
            console.error('❌ Validation failed');
            throw new Error('Invalid scenario');
        }

        state = scenario;
        render(state);
        console.log('✅ Scenario loaded');
        logInfo(t('alerts.scenarioLoaded'));
        hideGameOverBanner(); // Hide game over banner when loading new scenario (T19a)
    } catch (e) {
        console.error('❌ Load scenario error:', e);
        showErrorModal(
            t('error.invalidScenario'),
            t('alerts.invalidScenario', { error: e.message }),
            {
                severity: ErrorSeverity.ERROR,
                suggestion: t('error.suggestionInvalidScenario'),
                error: e
            }
        );
    } finally {
        hideLoading();
    }
}

function saveScenario() {
    showLoading(t('ui.savingScenario') || 'Saving scenario...');
    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
        try {
            const json = JSON.stringify(exportState(state), null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scenario-turn-${state.turn}.json`;
            a.click();
            URL.revokeObjectURL(url);
            logInfo(t('alerts.scenarioSaved'));
        } catch (e) {
            logError(t('alerts.failedToSaveScenario'), {
                severity: ErrorSeverity.ERROR,
                error: e,
                suggestion: t('error.suggestionTryAgain')
            });
        } finally {
            hideLoading();
        }
    }, 50);
}

function openScenarioEditor() {
    document.querySelector('#scenario-json').value = JSON.stringify(exportState(state), null, 2);
    document.querySelector('#scenario-modal').classList.add('active');
}

// ============================================================================
// STAGE 3: NEW GAME FROM DECK PRESETS
// ============================================================================

function isBasicPokemonCard(card) {
    if (!card) return false;
    return card.supertype === 'Pokémon' && card.subtype === 'Basic';
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildPlayerFromPreset(playerName, preset, turnPlayed = 0) {
    const validation = validateDeckPreset(preset);
    if (!validation.valid) {
        throw new Error(`${t('newGame.invalidDeck')}: ${validation.errors.join(', ')}`);
    }

    const missingCards = preset.deck.filter(cardId => !getCard(cardId));
    if (missingCards.length > 0) {
        throw new Error(`${t('newGame.invalidDeck')}: missing cards ${missingCards.join(', ')}`);
    }

    const shuffledDeck = shuffleArray(preset.deck);
    const basicIndices = shuffledDeck
        .map((cardId, idx) => ({ cardId, idx, card: getCard(cardId) }))
        .filter(entry => isBasicPokemonCard(entry.card));

    if (basicIndices.length === 0) {
        throw new Error(`${t('newGame.invalidDeck')}: no basic Pokemon`);
    }

    const activePick = basicIndices[0];
    const remainingAfterActive = shuffledDeck.filter((_, idx) => idx !== activePick.idx);

    const bench = [];
    const benchCandidates = remainingAfterActive
        .map((cardId, idx) => ({ cardId, idx, card: getCard(cardId) }))
        .filter(entry => isBasicPokemonCard(entry.card));

    const benchIndicesToRemove = [];
    for (let i = 0; i < Math.min(3, benchCandidates.length); i++) {
        const candidate = benchCandidates[i];
        bench.push({
            cardId: candidate.cardId,
            currentHp: candidate.card.hp,
            energy: [],
            status: null,
            turnPlayed
        });
        benchIndicesToRemove.push(candidate.idx);
    }

    const deckAfterSetup = remainingAfterActive.filter((_, idx) => !benchIndicesToRemove.includes(idx));
    const hand = deckAfterSetup.slice(0, Math.min(5, deckAfterSetup.length));
    const deck = deckAfterSetup.slice(hand.length);

    return {
        points: 0,
        active: {
            cardId: activePick.cardId,
            currentHp: activePick.card.hp,
            energy: [],
            status: null,
            turnPlayed
        },
        bench,
        hand,
        deck,
        discard: [],
        energyZone: {
            currentEnergy: preset.energyTypes[0] || null,
            nextEnergy: preset.energyTypes[1] || preset.energyTypes[0] || null,
            configuredTypes: [...preset.energyTypes],
            usedThisTurn: false
        },
        supporterUsedThisTurn: false,
        retreatedThisTurn: false,
        normalAttachUsedThisTurn: false,
        attackedThisTurn: false
    };
}

function startNewGameFromPresets(player1DeckId, player2DeckId) {
    const preset1 = getDeckPreset(player1DeckId);
    const preset2 = getDeckPreset(player2DeckId);

    if (!preset1 || !preset2) {
        throw new Error(t('newGame.invalidDeck'));
    }

    const newState = createInitialState();
    newState.name = 'New game from presets';
    newState.description = `${preset1.name} vs ${preset2.name}`;
    newState.turn = 1;
    newState.currentPlayer = 'player1';
    newState.player1 = buildPlayerFromPreset('Player 1', preset1, 0);
    newState.player2 = buildPlayerFromPreset('Player 2', preset2, 0);

    if (!isValidState(newState)) {
        throw new Error(t('newGame.invalidDeck'));
    }

    state = newState;
    hideGameOverBanner();
    render(state);
    logInfo(t('newGame.gameStarted'));
}

function clearNewGameValidationError() {
    const err = document.querySelector('#new-game-validation-error');
    if (err) err.textContent = '';
}

function setNewGameValidationError(msg) {
    const err = document.querySelector('#new-game-validation-error');
    if (err) err.textContent = msg || '';
}

function renderDeckPresetSelectors() {
    const presets = getAllDeckPresets();
    const select1 = document.querySelector('#deck-select-player1');
    const select2 = document.querySelector('#deck-select-player2');

    [select1, select2].forEach(select => {
        if (!select) return;
        select.innerHTML = `<option value="">${t('newGame.selectDeckLabel')}</option>`;
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = `${preset.name} (${preset.deck.length})`;
            select.appendChild(option);
        });
    });
}

function openNewGameModal() {
    renderDeckPresetSelectors();
    clearNewGameValidationError();
    newGameModalState = { player1DeckId: '', player2DeckId: '' };
    document.querySelector('#new-game-modal')?.classList.add('active');
}

function closeNewGameModal() {
    document.querySelector('#new-game-modal')?.classList.remove('active');
    newGameModalState = null;
    clearNewGameValidationError();
}

function confirmStartNewGame() {
    const player1DeckId = document.querySelector('#deck-select-player1')?.value;
    const player2DeckId = document.querySelector('#deck-select-player2')?.value;

    if (!player1DeckId) {
        setNewGameValidationError(t('newGame.deckSelectRequired', { player: t('game.player1') }));
        return;
    }

    if (!player2DeckId) {
        setNewGameValidationError(t('newGame.deckSelectRequired', { player: t('game.player2') }));
        return;
    }

    try {
        startNewGameFromPresets(player1DeckId, player2DeckId);
        closeNewGameModal();
    } catch (error) {
        setNewGameValidationError(error.message || t('newGame.invalidDeck'));
    }
}

function setupNewGameModalListeners() {
    document.querySelector('#new-game-btn')?.addEventListener('click', openNewGameModal);
    document.querySelector('#new-game-cancel-btn')?.addEventListener('click', closeNewGameModal);
    document.querySelector('#new-game-start-btn')?.addEventListener('click', confirmStartNewGame);

    document.querySelector('#deck-select-player1')?.addEventListener('change', clearNewGameValidationError);
    document.querySelector('#deck-select-player2')?.addEventListener('change', clearNewGameValidationError);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Scenario
    document.querySelector('#load-btn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = (e) => {
            showLoading(t('ui.readingFile') || 'Reading file...');
            const reader = new FileReader();
            reader.onload = (ev) => loadScenario(ev.target.result);
            reader.onerror = () => {
                hideLoading();
                logError(t('alerts.failedToReadFile'), {
                    severity: ErrorSeverity.ERROR,
                    suggestion: t('error.suggestionTryAgain')
                });
            };
            reader.readAsText(e.target.files[0]);
        };
        input.click();
    });
    document.querySelector('#save-btn')?.addEventListener('click', saveScenario);
    document.querySelector('#edit-btn')?.addEventListener('click', toggleEditMode);
    document.querySelector('#apply-scenario')?.addEventListener('click', () => {
        loadScenario(document.querySelector('#scenario-json').value);
        document.querySelector('#scenario-modal').classList.remove('active');
    });
    document.querySelector('#cancel-scenario')?.addEventListener('click', () => {
        document.querySelector('#scenario-modal').classList.remove('active');
    });

    // Language
    document.querySelector('#lang-btn')?.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'es' ? 'en' : 'es';
        applyTranslations();
        updateDynamicTranslations();
    });

    // Game loop (T07)
    document.querySelector('#play-btn')?.addEventListener('click', () => {
        if (state.winner) {
            showErrorModal(
                t('error.gameOver'),
                t('alerts.gameOverLoadScenario'),
                {
                    severity: ErrorSeverity.WARNING,
                    suggestion: t('error.suggestionGameOver'),
                    primaryAction: {
                        text: t('ui.loadScenario'),
                        onClick: () => document.querySelector('#load-btn')?.click()
                    }
                }
            );
            return;
        }
        isPaused = false;
        startGameLoop();
    });
    document.querySelector('#pause-btn')?.addEventListener('click', () => {
        isPaused = true;
        stopGameLoop();
    });
    document.querySelector('#step-btn')?.addEventListener('click', () => {
        if (state.winner) {
            showErrorModal(
                t('error.gameOver'),
                t('alerts.gameOver'),
                {
                    severity: ErrorSeverity.WARNING,
                    suggestion: t('error.suggestionGameOver'),
                    primaryAction: {
                        text: t('ui.loadScenario'),
                        onClick: () => document.querySelector('#load-btn')?.click()
                    }
                }
            );
            return;
        }
        stepTurn();
    });
    document.querySelector('#speed-select')?.addEventListener('change', (e) => {
        currentSpeed = parseInt(e.target.value, 10);
        if (!isPaused) { stopGameLoop(); startGameLoop(); }
    });

    // Coins
    document.querySelector('#coins-btn')?.addEventListener('click', () => {
        renderCoinQueueModal();
        document.querySelector('#coin-modal').classList.add('active');
    });
    document.querySelector('#refill-coins')?.addEventListener('click', () => {
        refillCoins(state);
        renderCoinQueueModal();
        render(state);
    });
    document.querySelector('#close-coins')?.addEventListener('click', () => {
        document.querySelector('#coin-modal').classList.remove('active');
    });

    // Modal overlays
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // Export log (T15)
    document.querySelector('#export-log-btn')?.addEventListener('click', exportLog);

    // Trainer card clicks (Stage 1)
    document.addEventListener('click', (e) => {
        const trainerCard = e.target.closest('.trainer-card');
        if (trainerCard) {
            const playerId = trainerCard.dataset.player;
            const handIndex = parseInt(trainerCard.dataset.handIndex, 10);
            const cardId = trainerCard.dataset.cardId;
            handleTrainerCardClick(playerId, handIndex, cardId);
        }
    });

    // Game over banner (T19a - Better Error Messages)
    document.querySelector('#game-over-load-scenario')?.addEventListener('click', () => {
        hideGameOverBanner();
        openScenarioEditor();
    });

    console.log('✅ Event listeners ready');
}

// ============================================================================
// GAME LOOP (Task 07)
// ============================================================================

function startGameLoop() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    const ms = Math.floor(baseSpeedMs / currentSpeed);
    gameLoopInterval = setInterval(() => {
        if (isPaused || state.winner) { stopGameLoop(); return; }
        stepTurn();
    }, ms);
}

function stopGameLoop() {
    if (gameLoopInterval) { clearInterval(gameLoopInterval); gameLoopInterval = null; }
}

function stepTurn() {
    state = startTurn(state);
    render(state);
    state = endTurn(state, getCard);
    render(state);
    if (state.winner) {
        isPaused = true; stopGameLoop();
        showGameOverBanner();
    }
}

/**
 * Show game over banner (Task 19a - Better Error Messages)
 */
function showGameOverBanner() {
    const banner = document.querySelector('#game-over-banner');
    const winnerEl = document.querySelector('#game-over-winner');
    winnerEl.textContent = t('alerts.gameOverWinnerWins', { winner: state.winner });
    banner.classList.remove('hidden');
}

/**
 * Hide game over banner
 */
function hideGameOverBanner() {
    const banner = document.querySelector('#game-over-banner');
    banner.classList.add('hidden');
}

// ============================================================================
// COIN QUEUE MODAL
// ============================================================================

function renderCoinQueueModal() {
    const container = document.querySelector('#coin-queue-display');
    if (!container) return;
    const queue = getQueue(state);
    container.innerHTML = queue.map((coin, i) =>
        `<span class="coin-item ${coin ? 'heads' : 'tails'}" data-index="${i}">${coin ? '🪙' : '✖️'}</span>`
    ).join('');
    container.querySelectorAll('.coin-item').forEach(el => {
        el.addEventListener('click', () => {
            toggleCoin(state, parseInt(el.dataset.index, 10));
            renderCoinQueueModal();
            renderCoinPreview(); // Update coin preview in main UI
        });
    });
}

/**
 * Renders the coin preview showing the next 3 coins in the queue.
 * This is displayed in the main UI controls area.
 */
function renderCoinPreview() {
    const container = document.querySelector('#coin-preview-display');
    if (!container) return;
    const queue = getQueue(state);
    const nextCoins = queue.slice(0, 3);
    container.innerHTML = nextCoins.map((coin, i) =>
        `<span class="coin ${coin ? 'heads' : 'tails'}">${coin ? '🪙' : '✖️'}</span>`
    ).join('');
}

// ============================================================================
// EDIT MODE (Task 17)
// ============================================================================

function toggleEditMode() {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);

    // Add/remove banner
    let banner = document.querySelector('.edit-mode-banner');
    if (editMode) {
        isPaused = true;
        stopGameLoop();
        if (!banner) {
            banner = document.createElement('div');
            banner.className = 'edit-mode-banner';
            banner.textContent = '✏️ EDIT MODE — Click any Pokemon to edit';
            document.body.appendChild(banner);
        }
        // Add click listeners to pokemon cards
        setupEditClickListeners();
    } else {
        if (banner) banner.remove();
        removeEditClickListeners();
    }
}

function setupEditClickListeners() {
    // Active zones
    document.querySelectorAll('.active-zone').forEach(zone => {
        zone.addEventListener('click', handleEditClick);
    });
    // Bench slots
    document.querySelectorAll('.bench-slot').forEach(slot => {
        slot.addEventListener('click', handleEditClick);
    });
}

function removeEditClickListeners() {
    document.querySelectorAll('.active-zone').forEach(zone => {
        zone.removeEventListener('click', handleEditClick);
    });
    document.querySelectorAll('.bench-slot').forEach(slot => {
        slot.removeEventListener('click', handleEditClick);
    });
}

function handleEditClick(e) {
    if (!editMode) return;
    e.stopPropagation();

    const zone = e.currentTarget;
    const playerId = zone.dataset.player;

    let location, pokemon;
    if (zone.classList.contains('active-zone')) {
        location = 'active';
        pokemon = state[playerId]?.active;
    } else if (zone.classList.contains('bench-slot')) {
        location = parseInt(zone.dataset.index, 10);
        pokemon = state[playerId]?.bench[location];
    }

    if (!pokemon) {
        logError(t('alerts.noPokemonInSlot'));
        return;
    }

    openPokemonEditor(playerId, location, pokemon);
}

function openPokemonEditor(playerId, location, pokemon) {
    editTarget = { playerId, location };

    const card = getCard(pokemon.cardId);
    const imgUrl = getCardImage(pokemon.cardId, 'small');
    const maxHp = card?.hp || pokemon.maxHp || 999;

    // Populate modal
    document.querySelector('#edit-pokemon-img').src = imgUrl || '';
    document.querySelector('#edit-pokemon-name').textContent = card?.name || pokemon.cardId;

    const playerLabel = playerId === 'player1' ? t('game.player1') : t('game.player2');
    const locationLabel = location === 'active' ? t('edit.locationActive') : t('edit.benchSlot', { slot: location });
    document.querySelector('#edit-pokemon-location').textContent =
        t('edit.locationFormat', { player: playerLabel, location: locationLabel });

    document.querySelector('#edit-hp').value = pokemon.currentHp;
    document.querySelector('#edit-hp').max = maxHp;
    document.querySelector('#edit-max-hp').textContent = maxHp;
    document.querySelector('#edit-status').value = pokemon.status || '';
    document.querySelector('#edit-validation-error').textContent = '';

    // Render energy list
    renderEditEnergyList(pokemon.energy || []);

    // Show modal
    document.querySelector('#pokemon-edit-modal').classList.add('active');
}

function renderEditEnergyList(energies) {
    const container = document.querySelector('#edit-energy-list');
    container.innerHTML = energies.map((e, i) =>
        `<span class="edit-energy-item energy-${e}" data-index="${i}">${e}</span>`
    ).join('');

    // Click to remove
    container.querySelectorAll('.edit-energy-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index, 10);
            const currentEnergies = getCurrentEditEnergies();
            currentEnergies.splice(idx, 1);
            renderEditEnergyList(currentEnergies);
        });
    });
}

function getCurrentEditEnergies() {
    return Array.from(document.querySelectorAll('#edit-energy-list .edit-energy-item'))
        .map(el => el.textContent);
}

function setupEditModalListeners() {
    // Add energy
    document.querySelector('#edit-energy-add-btn')?.addEventListener('click', () => {
        const type = document.querySelector('#edit-energy-type').value;
        const energies = getCurrentEditEnergies();
        energies.push(type);
        renderEditEnergyList(energies);
    });

    // Apply
    document.querySelector('#edit-pokemon-apply')?.addEventListener('click', () => {
        if (!editTarget) return;
        const { playerId, location } = editTarget;

        const hp = parseInt(document.querySelector('#edit-hp').value, 10);
        const status = document.querySelector('#edit-status').value || null;
        const energies = getCurrentEditEnergies();
        const maxHp = parseInt(document.querySelector('#edit-max-hp').textContent, 10);

        // Validate
        if (isNaN(hp) || hp < 0) {
            document.querySelector('#edit-validation-error').textContent = t('alerts.hpMustBeNonNegative');
            return;
        }
        if (hp > maxHp) {
            document.querySelector('#edit-validation-error').textContent = t('alerts.hpCannotExceedMax', { maxHp });
            return;
        }

        // Apply changes
        const pokemon = location === 'active'
            ? state[playerId].active
            : state[playerId].bench[location];

        if (!pokemon) {
            document.querySelector('#edit-validation-error').textContent = t('alerts.pokemonNoLongerExists');
            return;
        }

        pokemon.currentHp = hp;
        pokemon.status = status;
        pokemon.energy = energies;

        // Log the edit
        const card = getCard(pokemon.cardId);
        const name = card?.name || pokemon.cardId;
        state.log.push({
            turn: state.turn,
            player: playerId,
            action: 'edit',
            details: `Edited ${name}: HP=${hp}, status=${status || 'none'}, energy=[${energies.join(',')}]`,
            timestamp: Date.now()
        });

        // Close and re-render
        document.querySelector('#pokemon-edit-modal').classList.remove('active');
        editTarget = null;
        render(state);
    });

    // Remove pokemon
    document.querySelector('#edit-pokemon-remove')?.addEventListener('click', () => {
        if (!editTarget) return;
        if (!confirm(t('alerts.confirmRemovePokemon'))) return;

        const { playerId, location } = editTarget;
        const pokemon = location === 'active'
            ? state[playerId].active
            : state[playerId].bench[location];

        const card = getCard(pokemon?.cardId);
        const name = card?.name || pokemon?.cardId || 'Unknown';

        if (location === 'active') {
            state[playerId].active = null;
        } else {
            state[playerId].bench.splice(location, 1);
        }

        state.log.push({
            turn: state.turn,
            player: playerId,
            action: 'edit',
            details: `Removed ${name} from ${location === 'active' ? 'Active' : `Bench ${location}`}`,
            timestamp: Date.now()
        });

        document.querySelector('#pokemon-edit-modal').classList.remove('active');
        editTarget = null;
        render(state);
    });

    // Cancel
    document.querySelector('#edit-pokemon-cancel')?.addEventListener('click', () => {
        document.querySelector('#pokemon-edit-modal').classList.remove('active');
        editTarget = null;
    });
}

// ============================================================================
// INIT
// ============================================================================

/**
 * Show loading overlay with message (T19b: Loading States)
 * @param {string} message - Loading message to display
 * @param {Object} [options] - Optional config
 * @param {number} [options.progress] - Progress percentage (0-100), shows progress bar
 * @param {string} [options.progressText] - Text below progress bar
 */
function showLoading(message, options = {}) {
    const overlay = document.querySelector('#status-overlay');
    const text = document.querySelector('#status-text');
    const progressContainer = document.querySelector('#status-progress');
    const progressFill = document.querySelector('#status-progress-fill');
    const progressText = document.querySelector('#status-progress-text');

    if (overlay) overlay.classList.remove('hidden');
    if (text) text.textContent = message;

    if (options.progress !== undefined && progressContainer) {
        progressContainer.classList.remove('hidden');
        if (progressFill) progressFill.style.width = `${options.progress}%`;
        if (progressText) progressText.textContent = options.progressText || '';
    } else if (progressContainer) {
        progressContainer.classList.add('hidden');
    }
}

/**
 * Update loading progress without changing the message (T19b)
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} [progressText] - Optional text below progress bar
 */
function updateLoadingProgress(progress, progressText) {
    const progressContainer = document.querySelector('#status-progress');
    const progressFill = document.querySelector('#status-progress-fill');
    const progressTextEl = document.querySelector('#status-progress-text');

    if (progressContainer) progressContainer.classList.remove('hidden');
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressTextEl) progressTextEl.textContent = progressText || '';
}

/**
 * Hide loading overlay (T19b)
 */
function hideLoading() {
    const overlay = document.querySelector('#status-overlay');
    const progressContainer = document.querySelector('#status-progress');
    if (overlay) overlay.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
}

// ============================================================================
// TRAINER CARD PLAY MODAL (Stage 1)
// ============================================================================

/**
 * Open trainer card play modal
 * @param {string} playerId - Player ID
 * @param {number} handIndex - Index of card in hand
 */
function openTrainerModal(playerId, handIndex) {
    const player = state[playerId];
    const cardId = player.hand[handIndex];
    const card = getCard(cardId);

    if (!card || card.supertype !== 'Trainer') {
        logError(t('errors.validation.trainerInvalidCard') || 'Not a valid trainer card');
        return;
    }

    // Get trainer effect
    const effect = getTrainerEffect(card.name);

    // Setup modal state
    trainerModalState = {
        playerId,
        handIndex,
        cardId,
        card,
        effect,
        selectedTarget: null,
        targetType: effect ? effect.targetType : null
    };

    // Populate modal UI
    const modal = document.querySelector('#trainer-play-modal');
    const cardImg = document.querySelector('#trainer-card-img');
    const cardName = document.querySelector('#trainer-card-name');
    const cardType = document.querySelector('#trainer-card-type');
    const targetSection = document.querySelector('#trainer-target-selection');
    const errorDiv = document.querySelector('#trainer-validation-error');

    // Clear previous state
    errorDiv.textContent = '';
    targetSection.innerHTML = '';

    // Set card info
    cardImg.src = getCardImage(cardId, 'small');
    cardName.textContent = card.name;
    cardType.textContent = effect ? t(`trainer.${effect.type}`) || effect.type : t('trainer.item');

    // Render target selection if needed
    if (effect && effect.needsTarget) {
        renderTargetSelection(effect.targetType, playerId);
    } else {
        // No target needed
        targetSection.innerHTML = `<div class="target-section-title">${t('trainer.targetNone')}</div>`;
    }

    // Show modal
    modal.classList.add('active');
}

/**
 * Render target selection options based on target type
 * @param {string} targetType - Type of target needed
 * @param {string} playerId - Current player ID
 */
function renderTargetSelection(targetType, playerId) {
    const targetSection = document.querySelector('#trainer-target-selection');
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    const player = state[playerId];
    const opponent = state[opponentId];

    let html = '';

    switch (targetType) {
        case 'pokemon':
            // Select from own active or bench
            html += `<div class="target-section-title">${t('trainer.selectPokemonTarget')}</div>`;
            html += `<div class="target-options">`;

            // Active Pokemon
            if (player.active) {
                html += `<div class="target-option" data-target="active">${t('trainer.targetActive')}</div>`;
            }

            // Bench Pokemon
            player.bench.forEach((p, i) => {
                if (p) {
                    html += `<div class="target-option" data-target="${i}">${t('trainer.targetBench', { slot: i + 1 })}</div>`;
                }
            });

            html += `</div>`;
            break;

        case 'benchPokemon':
            // Select from own bench only
            html += `<div class="target-section-title">${t('trainer.selectPokemonTarget')}</div>`;
            html += `<div class="target-options">`;

            player.bench.forEach((p, i) => {
                if (p && p.energy.length > 0) {
                    html += `<div class="target-option" data-target="${i}">${t('trainer.targetBench', { slot: i + 1 })}</div>`;
                }
            });

            html += `</div>`;
            break;

        case 'handCard':
            // For now, auto-select first Pokemon card in hand
            const pokemonInHand = player.hand.findIndex(id => {
                const c = getCard(id);
                return c && c.supertype === 'Pokémon';
            });
            if (pokemonInHand >= 0) {
                trainerModalState.selectedTarget = pokemonInHand;
                trainerModalState.handCardIndex = pokemonInHand;
            }
            html += `<div class="target-section-title">${t('trainer.targetNone')}</div>`;
            break;

        default:
            html += `<div class="target-section-title">${t('trainer.targetNone')}</div>`;
    }

    targetSection.innerHTML = html;

    // Add click handlers to target options
    targetSection.querySelectorAll('.target-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected from all options
            targetSection.querySelectorAll('.target-option').forEach(o => o.classList.remove('selected'));
            // Add selected to clicked option
            option.classList.add('selected');
            trainerModalState.selectedTarget = option.dataset.target;
        });
    });
}

/**
 * Validate trainer card play
 * @returns {{valid: boolean, error: string|null}}
 */
function validateTrainerPlay() {
    if (!trainerModalState) {
        return { valid: false, error: 'No trainer card selected' };
    }

    const { playerId, handIndex, cardId, effect, selectedTarget, targetType } = trainerModalState;

    // Check if card is still in hand
    const player = state[playerId];
    if (!player.hand[handIndex] || player.hand[handIndex] !== cardId) {
        return { valid: false, error: t('errors.validation.trainerNotInHand') };
    }

    // Build opts for validation
    const opts = {};
    if (selectedTarget !== null) {
        if (targetType === 'pokemon') {
            opts.pokemonIndex = selectedTarget;
        } else if (targetType === 'benchPokemon') {
            opts.benchIndex = parseInt(selectedTarget, 10);
        }
    }

    // Use engine validation
    const canPlay = canPlayTrainer(state, playerId, cardId, getCard, opts);

    if (!canPlay) {
        // Determine specific error
        if (effect && effect.type === 'supporter' && player.supporterUsedThisTurn) {
            return { valid: false, error: t('errors.validation.supporterAlreadyUsed') };
        }
        return { valid: false, error: t('errors.validation.trainerConditionNotMet') };
    }

    return { valid: true, error: null };
}

/**
 * Confirm trainer card play
 */
function confirmTrainerPlay() {
    const errorDiv = document.querySelector('#trainer-validation-error');
    errorDiv.textContent = '';

    // Validate
    const validation = validateTrainerPlay();
    if (!validation.valid) {
        errorDiv.textContent = validation.error;
        return;
    }

    const { playerId, handIndex, cardId, selectedTarget, targetType } = trainerModalState;

    // Build opts for execution
    const opts = {};
    if (selectedTarget !== null) {
        if (targetType === 'pokemon') {
            opts.pokemonIndex = selectedTarget;
        } else if (targetType === 'benchPokemon') {
            opts.benchIndex = parseInt(selectedTarget, 10);
        } else if (targetType === 'handCard') {
            opts.handCardIndex = trainerModalState.handCardIndex;
        }
    }

    // Execute trainer card play
    state = playTrainer(state, playerId, cardId, getCard, opts);
    render(state);

    // Close modal
    closeTrainerModal();

    // Log success
    const card = getCard(cardId);
    console.log(`🎴 Played trainer card: ${card.name}`);
}

/**
 * Close trainer card play modal
 */
function closeTrainerModal() {
    const modal = document.querySelector('#trainer-play-modal');
    modal.classList.remove('active');
    trainerModalState = null;
}

/**
 * Setup trainer modal event listeners
 */
function setupTrainerModalListeners() {
    const modal = document.querySelector('#trainer-play-modal');
    const confirmBtn = document.querySelector('#trainer-confirm-btn');
    const cancelBtn = document.querySelector('#trainer-cancel-btn');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmTrainerPlay);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeTrainerModal);
    }
}

/**
 * Check if a card is a trainer card
 * @param {Object} card - Card object
 * @returns {boolean}
 */
function isTrainerCard(card) {
    return card && card.supertype === 'Trainer';
}

/**
 * Handle trainer card click from hand
 * @param {string} playerId - Player ID
 * @param {number} handIndex - Index in hand
 * @param {string} cardId - Card ID
 */
function handleTrainerCardClick(playerId, handIndex, cardId) {
    const card = getCard(cardId);

    if (!card || !isTrainerCard(card)) {
        return;
    }

    // Open modal to play trainer card
    openTrainerModal(playerId, handIndex);
}

/**
 * Add loading state to a button (T19b)
 * @param {HTMLElement} btn - Button element
 */
function setButtonLoading(btn) {
    if (btn) btn.classList.add('btn-loading');
}

/**
 * Remove loading state from a button (T19b)
 * @param {HTMLElement} btn - Button element
 */
function clearButtonLoading(btn) {
    if (btn) btn.classList.remove('btn-loading');
}

// ============================================================================
// RETREAT MODAL (Stage 2)
// ============================================================================

/**
 * Check if the current player can retreat their active Pokemon
 * @param {Object} st - Game state
 * @param {string} playerId - Player ID
 * @returns {boolean}
 */
function canRetreatActivePokemon(st, playerId) {
    const player = st[playerId];
    if (!player || !player.active) return false;
    if (player.retreatedThisTurn) return false;

    // Check if there's at least one Pokemon on the bench
    const hasBenchPokemon = player.bench.some(p => p !== null);
    if (!hasBenchPokemon) return false;

    // Get retreat cost from card
    const card = getCard(player.active.cardId);
    if (!card) return false;

    const retreatCost = card.retreatCost || 0;
    if (retreatCost === 0) return true; // Free retreat

    // Check if enough energy is attached
    if (player.active.energy.length < retreatCost) return false;

    // Check status that blocks retreat
    const status = player.active.status;
    if (status === 'sleep' || status === 'paralysis') return false;

    return true;
}

/**
 * Open retreat modal
 * @param {string} playerId - Player ID
 */
function openRetreatModal(playerId) {
    const player = state[playerId];
    if (!player || !player.active) {
        logError(t('alerts.noPokemonInSlot'));
        return;
    }

    // Check if can retreat
    if (!canRetreatActivePokemon(state, playerId)) {
        logError(t('retreat.cannotRetreat'));
        return;
    }

    // Get retreat cost
    const card = getCard(player.active.cardId);
    const retreatCost = card?.retreatCost || 0;

    // Setup modal state
    retreatModalState = {
        playerId,
        benchIndex: null,
        retreatCost,
        selectedEnergyIndices: []
    };

    // Populate modal UI
    const modal = document.querySelector('#retreat-modal');
    const activeImg = document.querySelector('#retreat-active-img');
    const activeName = document.querySelector('#retreat-active-name');
    const costValue = document.querySelector('#retreat-cost-value');
    const benchSection = document.querySelector('#retreat-bench-selection');
    const benchOptions = document.querySelector('#retreat-bench-options');
    const energySection = document.querySelector('#retreat-energy-selection');
    const energyInstructions = document.querySelector('#retreat-discard-instructions');
    const energyList = document.querySelector('#retreat-energy-list');
    const energyStatus = document.querySelector('#retreat-energy-status');
    const errorDiv = document.querySelector('#retreat-validation-error');

    // Clear previous state
    errorDiv.textContent = '';
    benchOptions.innerHTML = '';
    energyList.innerHTML = '';
    energyStatus.textContent = '';
    energyStatus.className = 'retreat-energy-status';

    // Set active Pokemon info
    activeImg.src = getCardImage(player.active.cardId, 'small');
    activeName.textContent = card?.name || player.active.cardId;
    costValue.textContent = retreatCost;

    // Render bench options
    if (retreatCost > 0) {
        energyInstructions.textContent = t('retreat.discardInstructions', { cost: retreatCost });
        energySection.classList.remove('hidden');
    } else {
        energyInstructions.textContent = t('retreat.discardComplete', { selected: 0, cost: 0 });
        energySection.classList.add('hidden');
    }

    player.bench.forEach((p, i) => {
        if (p) {
            const benchCard = getCard(p.cardId);
            const option = document.createElement('div');
            option.className = 'target-option';
            option.dataset.benchIndex = i;
            option.textContent = benchCard?.name || p.cardId;
            option.addEventListener('click', () => {
                benchOptions.querySelectorAll('.target-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                retreatModalState.benchIndex = i;
                updateRetreatEnergyStatus();
            });
            benchOptions.appendChild(option);
        }
    });

    // Render energy selection if needed
    if (retreatCost > 0) {
        player.active.energy.forEach((energy, idx) => {
            const energyItem = document.createElement('div');
            energyItem.className = 'retreat-energy-item';
            energyItem.dataset.energyIndex = idx;
            energyItem.innerHTML = `
                <span class="energy energy-${energy}">${energy}</span>
                <span class="energy-index">${idx}</span>
            `;
            energyItem.addEventListener('click', () => toggleRetreatEnergySelection(idx, energyItem));
            energyList.appendChild(energyItem);
        });
    }

    // Show modal
    modal.classList.add('active');
}

/**
 * Toggle energy selection for retreat
 * @param {number} energyIndex - Index of energy card
 * @param {HTMLElement} element - Energy element
 */
function toggleRetreatEnergySelection(energyIndex, element) {
    const idx = retreatModalState.selectedEnergyIndices.indexOf(energyIndex);
    if (idx >= 0) {
        // Deselect
        retreatModalState.selectedEnergyIndices.splice(idx, 1);
        element.classList.remove('selected');
    } else {
        // Select
        retreatModalState.selectedEnergyIndices.push(energyIndex);
        element.classList.add('selected');
    }
    updateRetreatEnergyStatus();
}

/**
 * Update retreat energy status display
 */
function updateRetreatEnergyStatus() {
    const energyStatus = document.querySelector('#retreat-energy-status');
    const selected = retreatModalState.selectedEnergyIndices.length;
    const cost = retreatModalState.retreatCost;

    if (cost === 0) {
        energyStatus.textContent = t('retreat.discardComplete', { selected: 0, cost: 0 });
        energyStatus.className = 'retreat-energy-status complete';
        return;
    }

    if (selected === cost) {
        energyStatus.textContent = t('retreat.discardComplete', { selected, cost });
        energyStatus.className = 'retreat-energy-status complete';
    } else if (selected < cost) {
        energyStatus.textContent = t('retreat.discardIncomplete', { cost, selected });
        energyStatus.className = 'retreat-energy-status incomplete';
    } else {
        energyStatus.textContent = t('retreat.discardExcess', { selected, cost });
        energyStatus.className = 'retreat-energy-status excess';
    }
}

/**
 * Validate retreat action
 * @returns {{valid: boolean, error: string|null}}
 */
function validateRetreat() {
    if (!retreatModalState) {
        return { valid: false, error: 'No retreat action in progress' };
    }

    const { playerId, benchIndex, retreatCost, selectedEnergyIndices } = retreatModalState;
    const player = state[playerId];

    // Check if bench is selected
    if (benchIndex === null || !player.bench[benchIndex]) {
        return { valid: false, error: t('retreat.noBenchPokemon') };
    }

    // Check energy count matches retreat cost
    if (selectedEnergyIndices.length !== retreatCost) {
        if (selectedEnergyIndices.length < retreatCost) {
            return { valid: false, error: t('retreat.energyInsufficient') };
        } else {
            return { valid: false, error: t('retreat.energyMismatch') };
        }
    }

    // Check if can still retreat (in case state changed)
    if (!canRetreatActivePokemon(state, playerId)) {
        return { valid: false, error: t('retreat.cannotRetreat') };
    }

    return { valid: true, error: null };
}

/**
 * Confirm retreat action
 */
function confirmRetreat() {
    const errorDiv = document.querySelector('#retreat-validation-error');
    errorDiv.textContent = '';

    // Validate
    const validation = validateRetreat();
    if (!validation.valid) {
        errorDiv.textContent = validation.error;
        return;
    }

    const { playerId, benchIndex, retreatCost, selectedEnergyIndices } = retreatModalState;

    // Execute retreat
    state = executeRetreat(state, playerId, benchIndex, retreatCost, selectedEnergyIndices);
    render(state);

    // Close modal
    closeRetreatModal();

    // Log success
    const newActive = state[playerId].active;
    const newCard = getCard(newActive.cardId);
    logInfo(t('retreat.retreatSuccess', { pokemonName: newCard?.name || newActive.cardId }));
}

/**
 * Close retreat modal
 */
function closeRetreatModal() {
    const modal = document.querySelector('#retreat-modal');
    modal.classList.remove('active');
    retreatModalState = null;
}

/**
 * Setup retreat modal event listeners
 */
function setupRetreatModalListeners() {
    const confirmBtn = document.querySelector('#retreat-confirm-btn');
    const cancelBtn = document.querySelector('#retreat-cancel-btn');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmRetreat);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeRetreatModal);
    }
}

async function init() {
    console.log('🚀 Initializing...');

    try {
        // Step 1: Load translations (T19b: progress bar)
        showLoading(t('ui.loadingTranslations') || 'Loading translations...', { progress: 10, progressText: '1/3' });
        await loadTranslations();
        applyTranslations();
        updateDynamicTranslations();
        console.log('✅ Translations loaded');

        // Step 2: Load card data
        showLoading(t('ui.loadingCards') || 'Loading cards...', { progress: 40, progressText: '2/3' });
        await loadCards();
        const cardCount = getCardCount();
        console.log(`✅ ${cardCount} cards loaded`);

        // Step 3: Setup UI
        showLoading(t('ui.setupInterface') || 'Setting up interface...', { progress: 80, progressText: '3/3' });
        setupEventListeners();
        setupDragAndDrop();
        setupEditModalListeners();
        setupTrainerModalListeners();
        setupRetreatModalListeners();
        setupNewGameModalListeners();
        render(state);
        console.log('✅ Interface ready');

        // All done - hide loading
        updateLoadingProgress(100, '✅');
        await new Promise(r => setTimeout(r, 200)); // Brief flash of 100%
        hideLoading();
        console.log('✅ Simulator ready! Drag cards from hand to Active/Bench.');
    } catch (e) {
        hideLoading();
        logError('Failed to initialize simulator', {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.CRITICAL,
            suggestion: 'Try refreshing the page or check the console for details.',
            error: e
        });
    }
}

init().catch(e => console.error('❌ Init error:', e));
