---
title: Testing
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2025-12-03
updated: 2026-10-29
authors: [Christopher Pollin]
template:
  name: Vorlage Testing
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-testing
related: [architecture, data, uncertainty-specification, plan]
---

# Testing

Die Tests laufen im Browser ohne externe Abhängigkeiten und prüfen Produktionscode mit kleinen CMIF-Fixture-Dateien, für die Indexform der Vorprozessierung zusätzlich mit `data/hsa-letters.json`. Geplante Erweiterungen wie CI stehen in [plan.md](plan.md).

## Philosophie

Was testen wir?
- CMIF-Datenverarbeitung (XML zu JSON, Unsicherheits-Erkennung)
- Indizes des Parsers (Personen, Orte, Themen, Sprachen) und Zählungen aus den Briefen
- Formatierung mit Unsicherheits-Indikatoren
- Kritische Business-Logik (Filter, State-Management, URL-State, Forschungspfade, Korb, Export)
- Performance-kritische Funktionen (Caching)

Was testen wir nicht?
- Visuelles Rendering (D3, MapLibre) und die Aggregationen, die nur in `explore.js` oder einer Ansicht leben, etwa `aggregateLettersByPlace()` und den Aufbau des Netzwerks
- Externe APIs (Wikidata, correspSearch)
- Browser-spezifische Edge-Cases

Warum?
- Tests validieren die Kernfunktionalität der App
- Tests sollten schnell, deterministisch und wartbar sein
- Was die Tests nicht abdecken, prüft der Browser-Durchlauf ([Browser-Prüfung der Ansichten](#browser-prüfung-der-ansichten)). Grüne Tests schließen Fehler der Oberfläche nicht aus, das zeigten die Prüfungen vom 2026-10-29

Regel: keine Mock-Daten
- Tests laden echte CMIF-XML-Dateien über `parseCMIF` (`docs/data/test-uncertainty.xml`, `docs/data/test-hostile.xml`, für Erwähnungen `docs/data/demo-showcase.xml`)
- Die Indexform der Vorprozessierung prüft die Suite Research Paths an der echten Datei `docs/data/hsa-letters.json`
- Tests importieren echte Funktionen aus den Modulen (`parseCMIF`, `formatDateWithPrecision`, `analyzeResearchQuestions`, `addItemsToBasket`, `lettersToCsv`)
- Keine duplizierten Helper-Funktionen in Tests
- Keine Mock-Objekte oder Stub-Daten
- Wenn Tests fehlschlagen, liegt es an echtem Code mit echten Daten

## Test-Ebenen

- Unit- und Integrationstests laufen im Browser-Test-Runner (`docs/test.html`)
- Eine automatisierte E2E-Suite im Repository gibt es nicht
- Bedienung und Darstellung der Ansichten werden mit einem Playwright-Durchlauf im Browser geprüft, siehe [Browser-Prüfung der Ansichten](#browser-prüfung-der-ansichten)

## Test-Abdeckung

Die in `run-all-tests.js` registrierten Suites sind die Quelle der Wahrheit. Anzahl und Ergebnis zeigt `test.html` beim Lauf.

Business Logic mit echten Daten
- test-cmif-parser.js - Parsing von XML zu JSON, Eingabevertrag, Unsicherheits-Erkennung
- test-aggregation.js - Indizes des Parsers, Integration mit dem state-manager, `countIdentifiedPersons`
- test-formatters.js - Formatierung mit echten Daten
- test-security.js - Escaping, URL-Schemata und `?json=`-Pfade gegen `docs/data/test-hostile.xml`
- test-research-paths.js - Forschungspfade für Parser- und HSA-Indexform, Korbauswahl je Ansicht, CSV-Export, Normdaten im Personenindex
- test-state-manager.js - Filter-Logik mit echten CMIF-Daten, darunter Personen- und Ortsfilter ohne Normdaten-ID und der Rundweg des URL-State

Infrastruktur
- test-dom-cache.js - Element-Caching, ohne CMIF-Daten
- test-basket.js - Massenaufnahme, URL-Teilen und Datensatzbindung des Korbs mit Schlüsseln aus `test-uncertainty.xml`, `csvCell` mit Werten aus `test-hostile.xml`

## Test-Typen

### 1. Unit Tests

Fokus: Einzelne Funktionen und Module isoliert testen

Beispiele:
- `state.updateFilters({ temporal: { min, max } })`
- `elements.getById('test-id')`
- `formatDateWithPrecision(letter)`

### 2. Integration Tests

Fokus: Zusammenspiel mehrerer Module

Beispiele:
- Ein Filter-Update ändert den State, `getFilteredLetters()` liefert die neue Menge
- Der Parser liefert Daten, mit denen der State initialisiert wird
- Filter-Kombination (temporal, language, person)

### 3. Regression Tests

Fokus: Bekannte Bugs sollten nicht wiederkehren

Beispiele:
- Unsicherheits-Erkennung (die Fälle aus test-uncertainty.xml, Liste in [uncertainty-specification.md](uncertainty-specification.md#test-cases))
- Edge-Cases (leere Daten, fehlende Felder, leerer Export)

## Test-Ausführung

```bash
# Server starten
python -m http.server 8000 --directory docs

# Browser öffnen, Lauf mit der Schaltfläche "Run"
http://localhost:8000/test.html

# Lauf beim Laden
http://localhost:8000/test.html?test=true
```

`test.html` besitzt den einzigen Auslöser. `?test=true` betätigt die Schaltfläche einmal, `run-all-tests.js` startet keinen eigenen Lauf, weil zwei gleichzeitige Läufe sich den state-manager teilten. Eine CI ist nicht eingerichtet.

## Browser-Prüfung der Ansichten

Die Ansichten prüft ein Durchlauf mit Python-Playwright in Chrome (`channel="chrome"`, headless) gegen einen lokalen Server auf `docs/`. Die Skripte liegen nicht im Repository. Der Durchlauf vom 2026-10-29 deckte ab:

- Laden von `explore.html?json=data/hsa-letters.json` und Upload von `demo-showcase.xml`, `test-uncertainty.xml` und `test-hostile.xml` über die Startseite
- jede der zwölf Ansichten mit Prüfung auf Konsolen- und Seitenfehler
- Bedienelemente der Karte, Personen-Dialog mit Escape und Fokusrückgabe, Aufklappen eines Briefs per Enter, Ortsfilter für einen Ort ohne GeoNames-ID, aktivster Tag der Heatmap
- Wissenspfad starten, alle Forschungspfade anzeigen, Briefe in den Korb legen und auf `wissenskorb.html` wiederfinden
- Breite 390px je Ansicht (kein horizontaler Seitenüberlauf, breite Grafiken scrollen im eigenen Container) und der Filter-Schalter der Sidebar
- alle Seiten ohne Zugriff auf externe Hosts außer der Grundkarte, dazu die Karte ohne Grundkarte
- `vault.html` mit Links zwischen den Wissensdokumenten
- Laden einer correspSearch-API-URL gegen den Live-Dienst mit einer Datumsabfrage

Externe Dienste mit Personenbezug (Wikidata) wurden im Durchlauf blockiert.

Ein zweiter Durchlauf am selben Tag prüfte die Behebung der Befunde 9 bis 11 mit denselben Mitteln:

- Tutorial-Datensatz über die Startseite: Genf (2660646) liegt bei 46,20 N 6,15 O
- Personen-Dialog: keine Anfrage an Wikidata beim Öffnen, Schaltfläche „Lebensdaten von Wikidata laden“, eine verzögerte Antwort für eine zuvor geöffnete Person erscheint nicht im Dialog der nächsten, Fokus bleibt im Dialog, Escape schließt
- Zeitleiste des HSA: Balken der undatierten Briefe sichtbar und per Enter bedienbar, führt zu den undatierten Briefen mit `undated=1` in der URL, das übersteht ein Neuladen. Ein `_total`-Segment lässt die Sprachauswahl stehen
- Alle Sprachen abgewählt ergibt „Keine Briefe gefunden“ und `langs=` in der URL, `yearMin`, `yearMax` und `langs` aus der URL stehen nach dem Laden in Regler und Checkboxen
- Korb und Wissenspfad nach Wechsel zum Tutorial-Datensatz leer, nach Rückkehr zum HSA wieder da, Toast mit Hinweis auf die Korbgrenze
- Korbseite mit nur Briefen, nur einem Ort und nur einer Person: Kennzahlen, Zeitleiste, Karte und Netzwerk zeigen die Briefmenge des Korbs (alle drei Fälle durch einen Subagenten, der Korb aus Briefen und der Korb mit Graz zusätzlich im Hauptlauf, Graz mit 2.371 Briefen wie in data.md)
- alle zwölf Ansichten mit HSA und Tutorial-Datensatz ohne Seitenfehler, „Ladinisch“ in Sprachfilter und Legende der Zeitleiste, neutrale Qualitäts-Chips, Startansicht bei 390px ohne horizontalen Überlauf

Ein dritter Durchgang am selben Tag war eine Prüfung in drei Schritten. Fünf Subagenten prüften getrennt nach Gebieten, vier weitere behoben die Befunde, eine unabhängige Durchsicht prüfte die Änderungen. Die Befunde und Behebungen stehen im [Journal](journal.md), die verbliebenen offenen Punkte in [plan.md](plan.md#vorhaben).

- Funktion des Explorers: Playwright-Skripte gegen HSA und Tutorial-Datensatz für Filter, URL-State, Dialoge, Ansichten, Wissenspfad und Export
- Seiten, Korb, Toasts und Sicherheit: Startseite mit Upload- und URL-Wegen, Korbseite, Teilen per Link, Synchronisation zwischen Tabs, `vault.html`, `about.html`, `test.html`, feindliche Eingaben und `?json=`-Pfade. correspsearch.net und OpenFreeMap waren aus der Prüfumgebung nicht erreichbar
- Barrierefreiheit nach WCAG 2.2 AA: axe-core 4.14.0 auf allen Seiten, dazu Tastaturbedienung, Fokus, Kontraste, Zielgrößen und Umbruch bei 320px von Hand
- Gestaltung und Responsivität: Screenshots der Seiten bei mehreren Breiten, undefinierte Tokens, Schatten, Breakpoints und ungenutztes CSS
- Code und Dokumentation: ESLint und ruff, ungenutzte Exporte, doppelte Logik und Widersprüche zwischen Code und Wissensdokumenten

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

Alle Suites importieren `assert(condition, message)` aus `test-runner.js` und definieren keine eigene Fassung.

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

`teardown()` läuft auch nach einem fehlgeschlagenen Test (`finally` in `test-runner.js`), damit eine Suite keinen Zustand an die nächste oder an den Browser-Speicher der Testenden weitergibt. Eine Suite, die in localStorage schreibt, sichert den vorigen Wert im Setup und schreibt ihn im Teardown zurück (Suite Basket).

### Test-Daten

Testdaten sind kleine, gezielt gebaute CMIF-XML-Dateien in `docs/data/`, die der Test über die Produktionsfunktion `parseCMIF` lädt. Ein neuer Fall wird als Brief in eine solche Datei aufgenommen (Unsicherheitsfälle in `test-uncertainty.xml`, feindliche Eingaben in `test-hostile.xml`). Inline-Arrays mit Brief-Objekten im Test umgehen den Parser und sind deshalb ausgeschlossen. Die CMIF-Datei `hsa.xml` wird nicht geparst. Die vorprozessierte `hsa-letters.json` lädt nur die Suite Research Paths, weil allein diese Datei die Indexform der Vorprozessierung trägt.

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

### Console-Output lesen

Ein fehlgeschlagener Test erscheint in der Ausgabe von `test.html` und in der Konsole mit seinem Namen und der Meldung aus `assert`, etwa „updateFilters: Temporal-Filter“ mit „Sollte 2 Briefe finden, fand 3“.

### Test isoliert ausführen
```javascript
const test = StateManagerTests.tests.find(t => t.name.includes('Temporal'));
await test.run();
```

### Breakpoint setzen
```javascript
run() {
    debugger;  // Browser stoppt hier
    const filtered = state.getFilteredLetters();
    assert(filtered.length === 1);
}
```

### State inspizieren
```javascript
console.log('State:', state.filters);
console.log('Filtered:', state.getFilteredLetters());
```

## Erweiterung

### Neue Test-Suite hinzufügen

1. Datei erstellen: `js/tests/test-mymodule.js`

```javascript
import { assert } from './test-runner.js';

export const MyModuleTests = {
    name: 'My Module',
    tests: [
        {
            name: 'Test description',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                assert(data.letters.length > 0, 'Fixture sollte Briefe enthalten');
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

### Wann Tests aktualisieren
- Bei API-Änderungen (Breaking Changes)
- Bei Bug-Fixes (Regression-Test hinzufügen)
- Bei Performance-Optimierungen (Benchmark aktualisieren)

### Wann Tests löschen
- Bei entfernten Features
- Bei komplett refactorierten Modulen

### Test-Review-Prozess
1. Alle Tests müssen grün sein vor Commit
2. Neue Features brauchen Tests
3. Bug-Fixes brauchen Regression-Test

## Metriken

Eine Coverage-Messung ist nicht eingerichtet. Frueher hier genannte Coverage-Werte waren nicht gemessen und wurden entfernt.
