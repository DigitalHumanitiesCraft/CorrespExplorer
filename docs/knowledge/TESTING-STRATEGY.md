# Testing Strategy

Kompakt, fokussiert, ohne externe Dependencies

## Philosophie

**Was testen wir?**
- Kritische Business-Logik (Filter, State-Management)
- Performance-kritische Funktionen (Caching)
- Datenstrukturen und Transformationen

**Was testen wir NICHT?**
- Visuelles Rendering (D3, MapLibre)
- Externe APIs (Wikidata, correspSearch)
- Browser-spezifische Edge-Cases

**Warum?**
- Tests sollten schnell laufen (< 1 Sekunde)
- Tests sollten deterministisch sein
- Tests sollten wartbar sein

## Test-Pyramide

```
         /\        E2E Tests (0)
        /  \       - Zu aufwendig für Prototyp-Phase
       /    \
      /------\     Integration Tests (~30)
     /        \    - Filter-Kombinationen
    /          \   - Aggregation-Logik
   /------------\  - Unsicherheits-Erkennung
  /              \
 /----------------\ Unit Tests (19)
                    - State-Manager (10)
                    - DOM-Cache (9)
```

## Test-Abdeckung (Ist-Stand)

| Modul | Tests | Abdeckung | Priorität |
|-------|-------|-----------|-----------|
| state-manager.js | 10 | 100% | Kritisch |
| dom-cache.js | 9 | 90% | Hoch |
| explore.js (Filter) | 6 | 80% | Hoch |
| explore.js (Aggregation) | 6 | 70% | Mittel |
| cmif-parser.js (Uncertainty) | 22 | 60% | Mittel |
| utils.js | 4 | 40% | Niedrig |
| formatters.js | 0 | 0% | Niedrig |
| wikidata-enrichment.js | 0 | 0% | Niedrig (API) |

**Gesamt:** 57 Tests

## Test-Typen

### 1. Unit Tests

Fokus: Einzelne Funktionen/Module isoliert testen

Beispiele:
- `state.updateFilters({ temporal: { min, max } })`
- `elements.getById('test-id')`
- `formatDate(letter.date, letter.datePrecision)`

### 2. Integration Tests

Fokus: Zusammenspiel mehrerer Module

Beispiele:
- Filter-Update → State-Änderung → getFilteredLetters()
- Upload → Parser → State-Initialisierung
- Filter-Kombination (temporal + language + person)

### 3. Regression Tests

Fokus: Bekannte Bugs sollten nicht wiederkehren

Beispiele:
- Unsicherheits-Erkennung (22 Testfälle aus test-uncertainty.xml)
- Edge-Cases (leere Daten, fehlende Felder)

## Test-Ausführung

**Lokal (Development):**
```bash
# Server starten
python -m http.server 8000 --directory docs

# Browser öffnen
http://localhost:8000/test.html

# Oder mit Auto-Run
http://localhost:8000/test.html?test=true
```

**CI/CD (zukünftig):**
```bash
# Headless Browser (Playwright)
npx playwright test

# Node.js (für Logic-Tests)
node --test js/tests/
```

## Best Practices

### Test-Benennung

```javascript
// Gut: Beschreibend, was getestet wird
'updateFilters: Temporal-Filter filtert nach Zeitraum'
'getFilteredLetters: Caching verhindert redundante Berechnungen'

// Schlecht: Zu generisch
'Test 1'
'Filter funktioniert'
```

### Assertions

```javascript
// Gut: Spezifische Fehlermeldung
assert(filtered.length === 2, `Sollte 2 Briefe finden, fand ${filtered.length}`);

// Schlecht: Keine Fehlermeldung
assert(filtered.length === 2);
```

### Setup/Teardown

```javascript
export const MyTests = {
    setup() {
        // Vor jedem Test: Clean State
        state.resetFilters();
        elements.clearCache();
    },

    teardown() {
        // Nach jedem Test: Cleanup
        document.querySelectorAll('[data-test]').forEach(el => el.remove());
    }
};
```

### Test-Daten

```javascript
// Gut: Minimale, fokussierte Test-Daten
const testLetters = [
    { id: '1', year: 1920, language: { code: 'de' } },
    { id: '2', year: 1930, language: { code: 'fr' } }
];

// Schlecht: Production-Daten (11.576 Briefe)
const testLetters = productionData.letters;
```

## Performance-Ziele

- Alle Tests < 1 Sekunde
- Einzelne Suite < 200ms
- Einzelner Test < 20ms

Aktuelle Performance (test.html):
- State-Manager: ~50ms (10 Tests)
- DOM-Cache: ~30ms (9 Tests)
- Integration: ~100ms (30 Tests)
- **Gesamt: ~180ms (57 Tests)**

## Debugging fehlgeschlagener Tests

**1. Console-Output lesen:**
```
✗ updateFilters: Temporal-Filter
  Expected 1, got 3
  at test-state-manager.js:42
```

**2. Test isoliert ausführen:**
```javascript
const test = StateManagerTests.tests.find(t => t.name.includes('Temporal'));
await test.run();
```

**3. Breakpoint setzen:**
```javascript
run() {
    debugger;  // Browser stoppt hier
    const filtered = state.getFilteredLetters();
    assert(filtered.length === 1);
}
```

**4. State inspizieren:**
```javascript
console.log('State:', state.filters);
console.log('Filtered:', state.getFilteredLetters());
```

## Erweiterung

### Neue Test-Suite hinzufügen

1. Datei erstellen: `js/tests/test-mymodule.js`

```javascript
export const MyModuleTests = {
    name: 'My Module',
    tests: [
        {
            name: 'Test description',
            run() {
                assert.equal(1 + 1, 2);
            }
        }
    ]
};
```

2. In run-all-tests.js registrieren:

```javascript
import { MyModuleTests } from './test-mymodule.js';

const suites = [
    StateManagerTests,
    DOMCacheTests,
    MyModuleTests  // Neu
];
```

3. Tests ausführen: `test.html`

## Test-Maintenance

**Wann Tests aktualisieren:**
- Bei API-Änderungen (Breaking Changes)
- Bei Bug-Fixes (Regression-Test hinzufügen)
- Bei Performance-Optimierungen (Benchmark aktualisieren)

**Wann Tests löschen:**
- Bei entfernten Features
- Bei komplett refactorierten Modulen

**Test-Review-Prozess:**
1. Alle Tests müssen grün sein vor Commit
2. Neue Features brauchen Tests
3. Bug-Fixes brauchen Regression-Test

## Metriken

**Coverage-Ziele (langfristig):**
- Core-Module (state-manager, dom-cache): 100%
- Business-Logic (filter, aggregation): 80%
- UI-Logic (rendering, interactions): 30%
- Gesamt: 60%

**Aktuelle Coverage: ~45%**

## Nächste Schritte

1. Tests für cmif-parser.js (XML-Parsing-Edge-Cases)
2. Tests für formatters.js (Datum/Person/Ort)
3. Performance-Regression-Tests (Filter bei 10k+ Briefen)
4. CI-Integration (GitHub Actions mit Playwright)
