# Learnings und Design-Entscheidungen

Konsolidierte Erkenntnisse aus der Entwicklung von CorrespExplorer.

Stand: 2025-11-27

---

## 1. CMIF-Parsing Strategie

### Identitaeten vs. Strings

CMIF-Daten enthalten sowohl maschinenlesbare Identifikatoren als auch menschenlesbare Strings:

| Feld | Typ | Beispiel |
|------|-----|----------|
| `@ref` | Authority-URI | `https://d-nb.info/gnd/118540238` |
| Textinhalt | Anzeigename | `Goethe, Johann Wolfgang von` |

**Entscheidung:** Das `@ref`-Attribut ist der "Golden Key" fuer Identitaet. Der Textinhalt dient nur der Anzeige und kann zwischen Editionen variieren.

### Authority-Erkennung

```javascript
function parseAuthorityRef(url) {
  if (url.includes('viaf.org')) return { type: 'viaf', id: '...' };
  if (url.includes('d-nb.info/gnd')) return { type: 'gnd', id: '...' };
  if (url.includes('geonames.org')) return { type: 'geonames', id: '...' };
  if (url.includes('lexvo.org')) return { type: 'lexvo', id: '...' };
  return { type: 'unknown', id: url };
}
```

Unterstuetzte Authority-Systeme: VIAF, GND, LC, BNF, GeoNames, Lexvo.

---

## 2. Visualisierung von Zeit und Unsicherheit

### Detached Bin Pattern

Briefe ohne Datum ("undatiert") werden in einem separaten Balken rechts der Timeline dargestellt:

```
[ 1900 | 1901 | 1902 | ... | 1920 ]   ||   [ k.A. ]
         Haupttimeline                      Detached Bin
```

**Vorteile:**
- Undatierte Briefe verzerren nicht die Zeitachse
- Klare visuelle Trennung zwischen "datiert" und "undatiert"
- Klick auf den Bin filtert auf undatierte Briefe

**Schematischer Platzhalter:** Wenn alle Briefe datiert sind, zeigt der Bin eine gestrichelte Umrandung mit Checkmark-Icon - signalisiert "alles vollstaendig".

### Unsicherheits-Indikatoren

Konsistente visuelle Sprache fuer Datenqualitaet:

| Typ | Farbe | Icon | Bedeutung |
|-----|-------|------|-----------|
| Exaktes Datum | -- | -- | Keine Markierung |
| Nur Jahr/Monat | Amber (#f59e0b) | Kalender | Unvollstaendig |
| Zeitraum | Blau (#2C5282) | Doppelpfeil | notBefore/notAfter |
| Unsicher | Rot (#ef4444) | Fragezeichen | cert="low" |
| Unbekannt | Grau | Fragezeichen | Kein Datum |

**Prinzip:** Exakte Daten erhalten keine Markierung - kein visuelles Rauschen bei guten Daten.

### Timeline-Schraffur

Balken mit unscharfen Datierungen werden durch diagonale Schraffur markiert. Die Schraffurhoehe zeigt den Anteil der Briefe mit ungenauem Datum im jeweiligen Jahr.

---

## 3. Stacked Bar Charts fuer Multidimensionalitaet

### Dynamische Sprachfarben

Problem: Bei Korpora mit vielen Sprachen werden Stacked Bars zu bunt und unleserlich.

**Loesung:** Dominante Sprache (meiste Briefe) erhaelt kraeftige Farbe, alle anderen Sprachen bekommen Pastelltoene.

```javascript
export function computeLanguageColors(letters) {
    const langCounts = {};
    letters.forEach(letter => {
        const lang = letter.language?.code || 'None';
        langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);

    sorted.forEach(([lang, count], index) => {
        if (index === 0) {
            // Dominante Sprache - kraeftig
            LANGUAGE_COLORS[lang] = LANGUAGE_COLORS_STRONG[lang];
        } else {
            // Sekundaere Sprachen - pastell
            LANGUAGE_COLORS[lang] = LANGUAGE_COLORS_PASTEL[lang];
        }
    });
}
```

### Korpora ohne Sprachdaten

Wenn ein Korpus keine Sprachmetadaten enthaelt:
- Einfarbige Balken (--color-primary) statt Stacking
- Legende zeigt "Keine Sprachdaten im Korpus"
- Keine "Andere"-Kategorie bei fehlenden Daten

**Erkennung:**
```javascript
const hasLanguageData = letters.some(l =>
    l.language?.code && l.language.code !== 'None'
);
```

### Responsive Bar Width

Balkenbreite passt sich dem Zeitraum an:
- Bei <= 20 Jahren: Breitere Balken (bis 60px)
- Bei groesseren Zeitraeumen: Schmalere Balken

---

## 4. UX-Prinzipien

### Redundanz-Vermeidung

- Keine doppelten Informationen in verschiedenen Views
- Filter-State wird zentral verwaltet und in URL gespeichert
- Indizes werden einmal berechnet und wiederverwendet

### Ehrliche Kommunikation

- Unsicherheit wird transparent dargestellt, niemals versteckt
- Fehlende Daten werden explizit als "unbekannt" markiert
- Tooltips erklaeren die Bedeutung von Symbolen

### Progressive Disclosure

- Uebersicht zuerst, Details bei Bedarf
- Klick auf Element zeigt mehr Information
- Modal/Panel fuer vollstaendige Metadaten

### Performance-Strategien

1. **Lazy Rendering:** Listen nur rendern wenn View aktiv
2. **Debouncing:** Filter-Updates mit 300ms Verzoegerung
3. **Clustering:** MapLibre-Cluster fuer 1000+ Punkte
4. **Limits:** Brief-Liste auf 500 Eintraege begrenzt
5. **Index-Lookups:** O(1) Zugriff auf Personen/Orte

---

## 5. Technische Patterns

### ES Module Live Bindings

Problem: ES Module Exports sind "live bindings" - Reassignment funktioniert nicht.

```javascript
// FALSCH - funktioniert nicht
export let COLORS = { de: 'blue' };
COLORS = { de: 'red' }; // Error: Assignment to constant variable

// RICHTIG - Object mutieren
export const COLORS = { de: 'blue' };
Object.keys(COLORS).forEach(key => delete COLORS[key]);
COLORS.de = 'red'; // Funktioniert
```

### URL-State-Management

Filter-Zustand wird in URL gespeichert:
```
explore.html?dataset=hsa&yearMin=1900&yearMax=1920&person=123&langs=de,fr
```

- Ermoeglicht Bookmarking und Teilen
- Browser-History wird nicht ueberladen (replaceState statt pushState)
- Initialisierung liest URL-Parameter beim Laden

### Hybrides Speichermodell

- **Grosse Datensaetze (HSA):** Via URL-Parameter laden (`?dataset=hsa`)
- **Kleinere Datensaetze (Upload):** sessionStorage (bis ~5MB)
- **Quota exceeded:** Fehlermeldung mit Hinweis auf Groesse

---

## 6. Code-Architektur und Refactoring

### Modulstruktur (Stand 2025-11)

```
docs/js/
├── Entry Points
│   ├── explore.js (4200+ Zeilen, Haupt-Visualisierung)
│   ├── upload.js (Upload/API-Anbindung)
│   ├── compare.js (Vergleichsansicht)
│   └── wissenskorb.js (Basket-Standalone)
├── Core
│   ├── cmif-parser.js (XML/JSON Parsing)
│   └── correspsearch-api.js (API-Integration)
└── Shared
    ├── utils.js (Hilfsfunktionen)
    ├── constants.js (Farben, Defaults)
    ├── basket.js (Basket State)
    ├── basket-ui.js (Basket UI)
    ├── formatters.js (Datum/Person/Ort-Formatierung)
    └── wikidata-enrichment.js (Personen-Anreicherung)
```

### Erkenntnisse aus Refactoring-Analyse

**explore.js Monolith:**
- 4200+ Zeilen, 85+ Funktionen, 7 Views
- Starke Kopplung zwischen Views und State
- Globale Variablen: `allLetters`, `filteredLetters`, `currentView`, etc.
- UI-Events direkt mit Filterlogik verwoben

**Erfolgreich extrahierte Module:**
- `formatters.js`: Reine Funktionen ohne Side Effects
- `basket.js/basket-ui.js`: Eigener State mit klarer API
- `wikidata-enrichment.js`: Isolierte API-Aufrufe mit Caching
- `constants.js`: Konfigurationswerte

**Herausforderungen bei weiterer Modularisierung:**
- Views teilen viel State (`filteredLetters`, `temporalFilter`)
- Event-Handler rufen direkt andere Funktionen auf (`applyFilters`, `switchView`)
- URL-State-Synchronisation greift auf viele globale Variablen zu

**Empfohlene Strategie fuer weitere Modularisierung:**
1. State-Management einfuehren (Store-Pattern)
2. Views als Module mit definierten Inputs/Outputs
3. Event-Bus fuer View-uebergreifende Kommunikation

---

## 7. Roadmap / Offene Punkte

### Y-Achsen-Gridlines (Timeline)

Horizontale Hilfslinien fuer bessere Ablesbarkeit der Briefanzahl.

### Themen-Cluster (Netzwerk)

Visualisierung von Themen-Kookkurrenz als Force-Directed Graph.

### Koordinaten-Aufloesung fuer Uploads

Wikidata SPARQL-Abfrage im Browser fuer GeoNames-IDs ohne Koordinaten.

### Personen-Enrichment Optimierung

Batch-Verarbeitung mit Fortschrittsanzeige statt einzelner API-Calls.

---

## Referenzen

- [architecture.md](architecture.md) - Systemarchitektur und Datenfluss
- [design.md](design.md) - Visuelle Design-Richtlinien
- [JOURNAL.md](JOURNAL.md) - Chronologisches Entwicklungsprotokoll
- [user-stories.md](user-stories.md) - Anforderungen und Features
