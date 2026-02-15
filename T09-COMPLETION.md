# T09 - Flujo de turnos básico (draw + energy) — COMPLETADO

**Fecha:** 2026-02-11 06:40 CET

## Resumen

Implementado el módulo `turn-manager.js` que gestiona el flujo de turnos básicos: robo de cartas, generación de energía, y finalización de turno con Pokemon Checkup.

## Archivos creados

1. **`simulator/js/engine/turn-manager.js`** (170 líneas)
   - Módulo principal de gestión de turnos
   - Exporta 5 funciones: `startTurn`, `endTurn`, `drawCard`, `canAttachEnergy`, `attachEnergy`

2. **`simulator/js/engine/turn-manager.test.js`** (290 líneas)
   - Tests unitarios completos
   - 21 tests cubriendo todas las funcionalidades

## Funcionalidades implementadas

### startTurn(state)
- Limpia flags del turno anterior (supporterUsedThisTurn, retreatedThisTurn, energyZone.usedThisTurn, normalAttachUsedThisTurn, attackedThisTurn)
- Desplaza energía de "next" a "current" en Energy Zone
- Genera nueva energía "next" aleatoria
- **NO roba carta** en primer turno del jugador que va primero (turn 0, player1)
- Roba 1 carta del deck en otros casos (respeta límite de mano max 10)
- Añade entrada al log de acciones

### endTurn(state)
- Ejecuta Pokemon Checkup (delegado a `processPokemonCheckup` de game-state.js)
- Verifica condiciones de victoria (delegado a `checkWinCondition` de game-state.js)
- Cambia currentPlayer (player1 ↔ player2)
- Incrementa contador de turnos
- Añade entrada al log de acciones

### drawCard(state, playerId)
- Verifica que deck no esté vacío (deck-out no es derrota en Pocket)
- Verifica límite de mano (max 10 cartas)
- Saca carta de deck (shift) y añade a hand
- Añade entrada al log de acciones

### canAttachEnergy(state, playerId)
- Verifica primer turno del jugador que va primero (turn 0, player1) → NO permitido
- Verifica que no se haya usado este turno (normalAttachUsedThisTurn)
- Verifica que haya energía en Energy Zone (currentEnergy)
- Devuelve objeto `{ valid: boolean, reason: string }`

### attachEnergy(state, playerId, target)
- Valida con `canAttachEnergy`
- Añade energía al Pokémon (active o bench)
- Marca `normalAttachUsedThisTurn = true`
- Limpia `currentEnergy` de Energy Zone
- Devuelve objeto `{ state, valid, reason }`
- Añade entrada al log de acciones

## Tests

### Total tests: 21 ✅ Todos pasando

1. startTurn crea nuevo estado
2. startTurn limpia flags
3. startTurn desplaza energía next→current
4. startTurn roba carta (no primer turno)
5. startTurn NO roba en primer turno going first
6. startTurn roba para player2 en turn 0
7. startTurn añade log
8. drawCard elimina de deck
9. drawCard hace nada con deck vacío
10. drawCard respeta límite mano 10
11. canAttachEnergy false en primer turno going first
12. canAttachEnergy false si ya usado
13. canAttachEnergy false sin energía
14. canAttachEnergy true si válido
15. attachEnergy añade energía a Pokémon
16. attachEnergy limpia current energy
17. attachEnergy setea normalAttachUsedThisTurn
18. endTurn cambia jugador
19. endTurn añade log
20. ciclo completo de turno funciona

## Cambios en archivos existentes

### main.js
- Importado `startTurn`, `endTurn`, `drawCard`, `canAttachEnergy`, `attachEnergy` desde `turn-manager.js`
- Renombrado `attachEnergy` importado como `attachEnergyTurn` para evitar conflictos con `moves.js`
- No se requiere cambios en lógica de UI ya que los nombres de funciones son los mismos

## Reglas implementadas

### Baseline TCG
- Primer turno del jugador que va primero: NO roba carta
- Primer turno del jugador que va primero: NO adjuntar energía manual
- Limite de mano: max 10 cartas
- Deck vacío: no es derrota, simplemente no se roba

### TODO-Pocket-Verify
- Confirmado in-game: "Primer turno del jugador que va primero" es el primer turno de la partida (turn 0) cuando player1 es el que empieza
- Sin unknowns pendientes en este módulo

## Servidor local

- **URL:** http://192.168.0.29:3000
- **Estado:** Funcionando correctamente
- **Tests:** Ejecutables en navegador con `window.runTurnManagerTests()`

## Próximo ticket

**T10 - Pokemon Checkup (estados alterados)**
- Crear módulo `status.js` separado (actualmente en game-state.js)
- Implementar lógica de Pokemon Checkup para cada estado
- Tests unitarios

## Referencias

- Flujo de turno: `docs/rules/flujo-de-partida-y-turnos.md`
- Energy Zone: `docs/mechanics/energy-zone.md`
- Primer turno: `docs/rules/flujo-de-partida-y-turnos.md` (diferencias)
