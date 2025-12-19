# CorrespExplorer - Architecture

Technische Architektur der Web-Applikation.

Fuer detaillierte Modul-Referenz siehe [modules.md](modules.md).

## Systemuebersicht

CorrespExplorer ist eine rein browser-basierte Single-Page-Application ohne Backend. Alle Datenverarbeitung erfolgt clientseitig mit JavaScript ES6 Modules. Die Architektur folgt einem Upload-Parse-Visualize Pattern mit optionaler Wikidata-Anreicherung.

Zwei Einstiegspunkte:
- index.html - Landing Page mit Upload/URL-Input
- explore.html - Hauptvisualisierung mit 12 Views

Zwei-Tier Datensatz-Architektur:
- Standard CMIF: Absender, Empfaenger, Datum, Ort (correspAction)
- Erweiterte Datensaetze: Zusaetzlich mentionsSubject, mentionsPerson, mentionsPlace, teiHeader
- Erweiterte Daten werden vorprozessiert (Python-Pipeline) wegen CORS-Einschraenkungen

## Seiten-Struktur

### index.html - Landing Page

- Upload-Zone (Drag-and-Drop, Datei-Auswahl)
- URL-Input fuer Remote-CMIF
- Beispiel-Datensaetze (HSA als Default)
- Nach Upload: Weiterleitung zu explore.html

### explore.html - Hauptvisualisierung

12 Views:
1. Uebersicht - Start-View mit Statistiken, Datenqualitaet, Entry-Points
2. Karte - MapLibre GL mit Clustering
3. Korrespondenten - Sortierbare/suchbare Liste
4. Briefe - Sortierbare/suchbare Liste
5. Timeline - Stacked Bar Chart nach Jahr
6. Themen - Topics mit Detail-Panel
7. Orte - Places mit Detail-Panel
8. Netzwerk - Force-Directed Graph
9. Mentions Flow - Sankey Diagram
10. Chronik - Vertikaler Zeitstrahl mit Wikidata
11. Aktivitaet - GitHub-Style Heatmap
12. Vergleich - Split-Screen Analyse

Sidebar: Statistiken, Zeitraum-Filter, Sprach-Filter, aktive Filter-Badges

URL-State: Filter werden in URL gespeichert (dataset, view, yearMin, yearMax, person, subject, place, langs)

### Weitere Seiten

- about.html - Projektinformation
- vault.html - Dokumentations-Viewer fuer knowledge/
- wissenskorb.html - Dedizierte Basket-Analyse
- test.html - Browser-basierte Test Suite

## Modul-Kategorien

### Core (keine zirkulaeren Dependencies)

- state-manager.js - Zentrales State-Management mit Subscriber-Pattern
- dom-cache.js - DOM-Element-Caching fuer Performance
- constants.js - Farben, UI-Defaults, Konfiguration
- utils.js - Shared Hilfsfunktionen
- formatters.js - Formatierung mit Unsicherheitsindikatoren

### Data Processing

- cmif-parser.js - Browser-XML-Parser fuer CMIF/TEI

### Enrichment (optionale Datenanreicherung)

- wikidata-enrichment.js - Wikidata SPARQL fuer Personen
- geonames-enrichment.js - GeoNames zu Koordinaten via Wikidata

### Extracted Views (views/)

6 View-Module extrahiert aus explore.js:
- timeline-view.js, activity-view.js, chronik-view.js
- comparison-view.js, network-view.js, mentions-view.js

Pattern: Dependency Injection - externe Abhaengigkeiten via init() injiziert

### UI/UX

- basket.js - LocalStorage-Wissenskorb-Logik
- basket-ui.js - Wissenskorb UI-Komponenten
- demo-tour.js - Onboarding-Tour

## Datenfluss

### 1. Vorprozessierte Daten (HSA)

Python-Pipeline erzeugt JSON mit Indices:
```
CMIF.xml -> build_hsa_data.py -> hsa-letters.json
explore.html?json=data/hsa-letters.json -> explore.js visualisiert
```

### 2. User-Upload (Browser-Parsing)

```
File/URL -> upload.js -> cmif-parser.js -> sessionStorage -> explore.js
           Optional: geonames-enrichment, wikidata-enrichment
```

### 3. Knowledge Basket

```
User sammelt Items -> basket.js (localStorage) -> Multi-Tab-Sync
Export: JSON, CSV, URL-Sharing
```

## Datenmodell

### Brief (Letter)

```javascript
{
  id: "unique-id",
  url: "source-link",
  date: "YYYY-MM-DD",
  year: 1798,
  datePrecision: "day|month|year|range|unknown",
  sender: { name, id, authority, precision },
  recipient: { name, id, authority, precision },
  place_sent: { name, geonames_id, lat, lon, precision },
  language: { code, label },
  mentions: { subjects: [], persons: [], places: [] }
}
```

### Indices

- persons: Authority-ID -> { name, authority, letter_count, as_sender, as_recipient }
- places: GeoNames-ID -> { name, lat, lon, letter_count }
- languages: ISO-Code -> { code, label, letter_count }
- subjects: URI -> { label, uri, category, letter_count }

### Meta

- title, publisher, total_letters
- unique_senders, unique_recipients, unique_places
- date_range: { min, max }
- uncertainty: Statistiken zu Praezision

## Design Patterns

### Dependency Injection (Views)

View-Module erhalten Abhaengigkeiten via init():
```javascript
initNetworkView({
    getFilteredLetters: () => state.getFilteredLetters(),
    applyPersonFilter,
    switchView,
    log
});
```

Vorteile: Keine zirkulaeren Imports, testbar, lose Kopplung.

### Subscriber Pattern (State)

State-Aenderungen via subscribe():
```javascript
state.subscribe('filters', (newFilters) => {
    renderCurrentView();
});
```

### Caching Layers

1. DOM-Cache: Haeufig genutzte Elemente
2. State-Cache: Gefilterte Briefe (invalidiert bei Filter-Aenderung)
3. Storage-Cache: Wikidata/GeoNames-Ergebnisse (7 Tage)

## Performance-Strategien

1. Lazy Rendering - Views nur rendern wenn aktiv
2. Debouncing - Filter-Updates mit 300ms Verzoegerung
3. Clustering - MapLibre-Cluster fuer viele Punkte
4. Limits - Brief-Liste auf 500 begrenzt
5. Index-Lookups - O(1) Zugriff via Map

## Technische Limits

- sessionStorage: ~5MB (Browser-Limit)
- Brief-Liste: 500 Eintraege (DOM-Performance)
- Sprach-Filter: Top 10 (UI-Uebersichtlichkeit)
- CMIF-Upload: ~50MB (Browser-Parsing)

## Technology Stack

- Vanilla JavaScript ES6 Modules (kein Build-Prozess)
- MapLibre GL JS 4.x - WebGL Map Rendering
- D3.js - Timeline, Network, Sankey
- noUiSlider - Zeitraum-Filter
- CSS Custom Properties - Design Tokens

## CSS Architecture

Design System in tokens.css:
- Logo-derived Colors (Rust Red, Steel Blue, Cream)
- Typography Scale (Inter, Lato, Merriweather)
- Spacing Scale (xs bis 3xl)
- Border-based Card Design

Stylesheets:
- tokens.css - Design Tokens
- style.css - Base Styles
- components.css - Shared Components
- explore.css, upload.css, etc. - View-spezifisch

## Browser-Kompatibilitaet

Getestet: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+

Erforderlich:
- ES6 Module Support
- DOMParser API
- sessionStorage/localStorage
- Fetch API
- CSS Custom Properties

## Testing

Browser-basierte Tests ohne Node.js:
- 74+ Tests ueber 7 Suites
- Real CMIF data (keine Mocks)
- test.html mit Auto-run Option

Test-Suites: cmif-parser, formatters, aggregation, state-manager, dom-cache
