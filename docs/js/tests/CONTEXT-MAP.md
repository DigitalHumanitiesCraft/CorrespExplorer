# Test Context Map

Fokussiertes Testing ohne externe Dependencies

## Test-Dateien

**Test-Runner** (Infrastructure)
- test-runner.js - Kompakter Test-Runner ohne Dependencies
- run-all-tests.js - Entry Point für alle Tests

**Unit Tests** (Modul-Tests)
- test-state-manager.js - 10 Tests für state-manager.js
- test-dom-cache.js - 9 Tests für dom-cache.js

**Integration Tests**
- explore-tests.js - Filter, Aggregation, UI (legacy)
- test-uncertainty.js - CMIF Unsicherheits-Erkennung

**Test-UI**
- ../test.html - Browser-basierte Test-Ausführung

## Test-Strategie

**Was wird getestet:**
1. State-Manager: Filter-Logik, Caching, URL-State
2. DOM-Cache: Element-Caching, Performance
3. Filter-Kombinationen (temporal, language, person, subject, quality)
4. Daten-Aggregation (countByPlace, countByLanguage, buildNetworkData)
5. Unsicherheits-Erkennung (datePrecision, personPrecision, placePrecision)

**Was NICHT getestet wird:**
- D3/MapLibre Rendering (visuell, schwer automatisierbar)
- Wikidata SPARQL (externe API)
- Browser-spezifische Features

## Ausführung

**Browser (empfohlen):**
```
http://localhost:8000/test.html
```

**URL-Parameter:**
```
explore.html?test=true    # Startet Tests automatisch
test.html?test=true       # Gleiches
```

**Programmatisch:**
```javascript
import { runAllTests } from './js/tests/run-all-tests.js';
const results = await runAllTests();
// { passed, failed, total, duration }
```

**Console:**
```javascript
window.runAllTests()  // Verfügbar nach Laden
```

## Test-Struktur

```javascript
// Suite-Format
export const MyTests = {
    name: 'Suite Name',

    setup() {
        // Vor jedem Test
    },

    teardown() {
        // Nach jedem Test
    },

    tests: [
        {
            name: 'Test-Beschreibung',
            run() {
                assert(condition, 'message');
            }
        }
    ]
};
```

## Assert-Helpers

```javascript
assert.true(condition, msg)
assert.equal(actual, expected, msg)
assert.notEqual(actual, unexpected, msg)
assert.arrayLength(arr, length, msg)
assert.includes(arr, value, msg)
assert.throws(fn, msg)
```

## Test-Abdeckung

**State-Manager: 10 Tests**
- setData: Initialisierung
- updateFilters: temporal, language, person, subject, quality
- Filter-Kombinationen
- Caching-Performance
- resetFilters
- URL-Export/Import

**DOM-Cache: 9 Tests**
- getById mit Caching
- Null-Handling
- Selector-Zugriff
- clearCache
- Predefined Accessors
- Performance-Vergleich

**Integration (explore-tests.js): ~30 Tests**
- Filter-Logik
- Aggregation
- Utilities
- UI-Elemente (nur im Browser)

**Unsicherheit (test-uncertainty.js): 22 Tests**
- Datums-Präzision (day, month, year, range)
- Personen-Präzision (identified, named, partial, unknown)
- Orts-Präzision (exact, region, unknown)

## Performance-Benchmarks

Inkludiert in Tests:
- Filter-Caching: 2. Aufruf sollte < 50% der Zeit des 1. Aufrufs sein
- DOM-Caching: Wiederholte Zugriffe schneller als document.getElementById

## Debugging-Tipps

**Console öffnen:**
```javascript
// In test.html
document.getElementById('toggle-console').click()
```

**Einzelne Suite testen:**
```javascript
import { TestRunner } from './test-runner.js';
import { StateManagerTests } from './test-state-manager.js';

const runner = new TestRunner();
runner.addSuite(StateManagerTests);
await runner.runAll();
```

**Nur einen Test:**
```javascript
const test = StateManagerTests.tests[0];
StateManagerTests.setup?.();
await test.run();
```

## Test-Coverage-Ziele

- State-Manager: 100% (alle Funktionen getestet)
- DOM-Cache: 90% (Browser-spezifisch teilweise ausgelassen)
- Filter-Logik: 80% (Haupt-Pfade abgedeckt)
- UI: 30% (visuell schwer testbar)

## Nächste Schritte

**Zusätzliche Tests:**
- cmif-parser.js Tests (XML → JSON Transformation)
- formatters.js Tests (Datum/Person/Ort Formatierung)
- utils.js Tests (debounce, escapeHtml)

**E2E-Tests (optional):**
- Playwright/Cypress für User-Journeys
- Screenshot-Tests für Visualisierungen
