# Testing Strategy

Kompakt, fokussiert, ohne externe Dependencies

## Philosophie

Was testen wir?
- CMIF-Datenverarbeitung (XML→JSON, Unsicherheits-Erkennung)
- Daten-Aggregation (Orte, Sprachen, Netzwerke)
- Formatierung mit Unsicherheits-Indikatoren
- Kritische Business-Logik (Filter, State-Management)
- Performance-kritische Funktionen (Caching)

Was testen wir NICHT?
- Visuelles Rendering (D3, MapLibre)
- Externe APIs (Wikidata, correspSearch)
- Browser-spezifische Edge-Cases

Warum?
- Tests validieren die Kernfunktionalität der App
- Wenn CMIF-Parsing und Aggregation funktionieren, läuft die App
- Tests sollten schnell laufen (< 1 Sekunde)
- Tests sollten deterministisch sein
- Tests sollten wartbar sein

Wichtige Regel: NIE Mock-Daten verwenden
- Tests laden IMMER echte CMIF-XML Dateien ueber parseCMIF (docs/data/test-uncertainty.xml, docs/data/test-hostile.xml)
- Tests importieren IMMER echte Funktionen aus den Modulen (parseCMIF, aggregateLettersByPlace, formatDateWithPrecision)
- Keine duplizierten Helper-Funktionen in Tests
- Keine Mock-Objekte oder Stub-Daten
- Wenn Tests fehlschlagen, liegt es an echtem Code mit echten Daten

## Test-Ebenen

- Unit- und Integrationstests laufen im Browser-Test-Runner (docs/test.html)
- E2E-Tests gibt es nicht
- Visuelle Pruefung und Bedienung der Views erfolgen manuell oder in Agenten-Reviews

## Test-Abdeckung

Die in run-all-tests.js registrierten Suites sind die Quelle der Wahrheit. Anzahl und Ergebnis zeigt test.html beim Lauf.

Business Logic mit echten CMIF-Daten
- test-cmif-parser.js - XML→JSON Parsing, Eingabevertrag, Unsicherheits-Erkennung
- test-aggregation.js - Indices-Erstellung, State-Manager Integration
- test-formatters.js - Formatierung mit echten Daten
- test-security.js - Escaping, URL-Schemata und ?json=-Pfade gegen docs/data/test-hostile.xml
- test-state-manager.js - Filter-Logik mit echten CMIF-Daten

Infrastructure (ohne CMIF-Daten)
- test-dom-cache.js - Element-Caching

Nicht im Runner
- test-uncertainty.js - Konsolen-Helfer, der ein mit parseCMIF geladenes test-uncertainty.xml prueft

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

Testdaten sind kleine, gezielt gebaute CMIF-XML-Dateien in docs/data/, die der Test ueber die Produktionsfunktion parseCMIF laedt. Ein neuer Fall wird als Brief in eine solche Datei aufgenommen (Unsicherheitsfaelle in test-uncertainty.xml, feindliche Eingaben in test-hostile.xml). Inline-Arrays mit Brief-Objekten im Test umgehen den Parser und sind deshalb ausgeschlossen. Der volle Produktionsdatensatz (hsa.xml) ist fuer schnelle, deterministische Tests zu gross.

```javascript
// Gut: echte Fixture-Datei durch echten Parser
const data = await parseCMIF('data/test-uncertainty.xml');

// Schlecht: Inline-Objekte, die die Parser-Logik umgehen
const testLetters = [{ id: '1', year: 1920 }];
```

## Performance-Ziele

- Alle Tests < 1 Sekunde
- Einzelne Suite < 200ms
- Einzelner Test < 20ms

Die aktuelle Laufzeit zeigt test.html nach jedem Lauf.

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

Eine Coverage-Messung ist nicht eingerichtet. Frueher hier genannte Coverage-Werte waren nicht gemessen und wurden entfernt.

## Nächste Schritte

1. Performance-Regression-Tests (Filter bei 10k+ Briefen)
2. CI-Integration (GitHub Actions mit Playwright)
