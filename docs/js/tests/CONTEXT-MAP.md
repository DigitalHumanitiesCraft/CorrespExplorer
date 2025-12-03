# Test Context Map

Fokussiertes Testing ohne externe Dependencies

## Test-Dateien

Test-Runner (Infrastructure)
- test-runner.js - Kompakter Test-Runner ohne Dependencies
- run-all-tests.js - Entry Point für alle Tests

Business Logic Tests (CMIF-Datenverarbeitung)
- test-cmif-parser.js - 13 Tests für XML→JSON Parsing und Unsicherheits-Erkennung
- test-aggregation.js - 11 Tests für Daten-Aggregation (Orte, Sprachen, Netzwerke)
- test-formatters.js - 26 Tests für Datum/Person/Ort Formatierung

Infrastructure Tests (State Management)
- test-state-manager.js - 10 Tests für state-manager.js
- test-dom-cache.js - 9 Tests für dom-cache.js

Legacy Tests (nicht in run-all-tests.js)
- explore-tests.js - Filter, Aggregation, UI (alt)
- test-uncertainty.js - CMIF Unsicherheits-Erkennung (alt)

Test-UI
- ../test.html - Browser-basierte Test-Ausführung

## Test-Strategie

Was wird getestet:
1. CMIF Parser: XML→JSON Transformation, Unsicherheits-Erkennung (date/person/place precision)
2. Daten-Aggregation: aggregateLettersByPlace, countByLanguage, buildNetworkData, buildTimelineData
3. Formatierung: Datum/Person/Ort mit Unsicherheits-Indikatoren, CSS-Klassen, Initialen
4. State-Manager: Filter-Logik, Caching, URL-State
5. DOM-Cache: Element-Caching, Performance

Was NICHT getestet wird:
- D3/MapLibre Rendering (visuell, schwer automatisierbar)
- Wikidata SPARQL (externe API)
- Browser-spezifische Features

## Ausführung

Browser (empfohlen):
```
http://localhost:8000/test.html
```

URL-Parameter:
```
explore.html?test=true    # Startet Tests automatisch
test.html?test=true       # Gleiches
```

Programmatisch:
```javascript
import { runAllTests } from './js/tests/run-all-tests.js';
const results = await runAllTests();
// { passed, failed, total, duration }
```

Console:
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

CMIF Parser: 13 Tests
- Datums-Präzision (day, month, year, range)
- Datums-Certainty (low certainty)
- Personen-Präzision (identified with GND, named, unknown)
- Orts-Präzision (exact with GeoNames, region, unknown)
- Mentions-Extraktion (subjects with GND)
- Sprach-Erkennung (ISO 639-2 to ISO 639-1)

Aggregation: 11 Tests
- aggregateLettersByPlace: Gruppierung, Sender-Zählung, Sprachen
- Koordinaten-Handling (Letter vs. Index)
- Jahre-Sammlung (unique years)
- countByLanguage: Null-Handling
- buildNetworkData: Sender-Recipient Links
- buildTimelineData: Jahr-Gruppierung

Formatters: 26 Tests
- formatSingleDate: Jahr, Monat, Tag
- formatDateWithPrecision: Icons für Unsicherheit
- formatPersonName: identified, named, partial, unknown
- formatPlaceName: exact, region, unknown
- getPersonInitials: Normal, Single, Partial mit [NN]
- CSS-Klassen: date-imprecise, person-unknown, place-region

State-Manager: 10 Tests
- setData, updateFilters (temporal, language, person, kombiniert)
- Caching-Performance, resetFilters
- URL-Export/Import

DOM-Cache: 9 Tests
- getById mit Caching, Null-Handling
- Selector-Zugriff, Performance-Vergleich

## Performance-Benchmarks

Inkludiert in Tests:
- Filter-Caching: 2. Aufruf sollte < 50% der Zeit des 1. Aufrufs sein
- DOM-Caching: Wiederholte Zugriffe schneller als document.getElementById

## Debugging-Tipps

Console öffnen:
```javascript
// In test.html
document.getElementById('toggle-console').click()
```

Einzelne Suite testen:
```javascript
import { TestRunner } from './test-runner.js';
import { StateManagerTests } from './test-state-manager.js';

const runner = new TestRunner();
runner.addSuite(StateManagerTests);
await runner.runAll();
```

Nur einen Test:
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

Zusätzliche Tests:
- cmif-parser.js Tests (XML → JSON Transformation)
- formatters.js Tests (Datum/Person/Ort Formatierung)
- utils.js Tests (debounce, escapeHtml)

E2E-Tests (optional):
- Playwright/Cypress für User-Journeys
- Screenshot-Tests für Visualisierungen
