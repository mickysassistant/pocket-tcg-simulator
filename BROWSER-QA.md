# Browser QA Test Suite

El simulador ahora incluye un sistema de pruebas automatizadas que se ejecutan directamente en el navegador, permitiendo detectar bugs de UI, interacción y estado que los tests de Node.js no pueden capturar.

## ¿Cómo ejecutar las pruebas?

### Método 1: QA Automático (recomendado)
1. Abre el simulador con el flag QA:
   ```
   http://localhost:3000/?qa=true
   ```

2. Las pruebas se ejecutarán automáticamente cuando la página cargue
3. Al finalizar, se descargará un reporte JSON con los resultados

### Método 2: Manual desde consola
1. Abre el simulador normalmente
2. Abre DevTools (F12) → pestaña Console
3. Ejecuta:
   ```javascript
   window.qa.runAll()
   ```

4. Revisa los resultados en consola y descarga el reporte JSON

## Qué prueban las tests?

### Test 1: Interacciones Básicas
- ✅ El overlay de carga desaparece correctamente
- ✅ Todos los botones requeridos existen en el DOM
- ✅ Clicks en botones responden
- ✅ No hay errores de consola

### Test 2: Carga de Escenarios
- ✅ El editor de escenarios abre correctamente
- ✅ El JSON de escenario es válido
- ✅ El estado se muestra correctamente
- ✅ El modal se cierra apropiadamente

### Test 3: Controles de Juego
- ✅ El botón Step avanza el turno
- ✅ Los números de turno se actualizan
- ✅ No hay errores de estado

## Reporte de Resultados

Al finalizar las tests, se genera un archivo `qa-report-TIMESTAMP.json` con:

```json
{
  "timestamp": "2026-02-11T20:00:00.000Z",
  "totalChecks": 25,
  "errors": 2,
  "successes": 23,
  "errorsDetail": [
    {
      "type": "error",
      "message": "Element #missing-btn not found...",
      "time": 1739318400000
    }
  ],
  "results": [...]
}
```

## Integración con Cron

El cron job que ejecuta QA automáticamente puede visitar:
```
http://localhost:3000/?qa=true
```

Esto generará reportes automáticamente cada vez que se ejecuten las tests.

## Crear Nuevas Tests

Para añadir tests adicionales, edita `test-browser-qa.js`:

```javascript
class BrowserQA {
    // ... código existente ...

    async testNewFeature() {
        this.log('Testing new feature...');

        // Tu lógica de test aquí
        const element = await this.waitFor('#some-element');
        this.assert(element !== null, 'Element exists');

        this.success('New feature test passed');
    }

    async runAll() {
        // ... tests existentes ...

        await this.testNewFeature(); // Añadir tu test
    }
}
```

## Ventajas vs Tests de Node.js

| Tests Node.js | Tests Browser |
|----------------|----------------|
| ✅ Unit tests puros | ✅ Tests de UI completa |
| ✅ Rápidos | ✅ Detectan bugs de DOM |
| ❌ No prueban visuales | ✅ Capturan errores de JS |
| ❌ No prueban eventos | ✅ Prueban interacciones |
| ❌ Aislados del contexto real | ✅ Ejecutan en entorno real |

## Ejemplo de Bug Detectado por Browser QA

```
[QA ERROR] Loading overlay is still visible! This blocks all interactions.
  Overlay classes: status-overlay

[QA ERROR] Element #play-btn not found within 5000ms

Resultados:
  Total checks: 25
  Errors: 2
  Successes: 23
```

Este tipo de bug (overlay bloqueando clics) es imposible de detectar en Node.js pero el browser QA lo captura inmediatamente.
