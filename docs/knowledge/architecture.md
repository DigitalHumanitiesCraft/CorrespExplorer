# CorrespExplorer - Architecture

Technische Architektur und Modulübersicht der Web-Applikation.

## Systemuebersicht

CorrespExplorer ist eine rein browser-basierte Single-Page-Application ohne Backend. Alle Datenverarbeitung erfolgt clientseitig mit JavaScript ES6 Modules. Die Architektur folgt einem Upload-Parse-Visualize Pattern mit optionaler Wikidata-Anreicherung.

Browser-Architektur:
- index.html (Landing Page)
  - Upload via Drag and Drop
  - URL Input für Remote-CMIF
  - Beispiel-Datasets (HSA)
  - Alle drei Wege führen zu cmif-parser.js
    - Parser nutzt DOMParser für XML-Verarbeitung
    - Erstellt Indices für Personen, Orte, Sprachen, Themen
    - Speichert Ergebnis in sessionStorage
    - Alternativ: URL-Parameter für Demo-Datasets
- explore.html (Hauptvisualisierung)
  - Lädt Daten aus sessionStorage oder URL-Parameter
  - Acht Views: Map, Persons, Letters, Timeline, Topics, Places, Network, Mentions Flow
  - Sidebar mit Filter und Statistiken
  - Export-Funktion für CSV und JSON

## Seiten-Struktur

### index.html - Landing-Page

Einstiegspunkt für alle Nutzer:
- Upload-Zone (Drag-and-Drop, Datei-Auswahl)
- URL-Input für Remote-CMIF
- Beispiel-Datensaetze (HSA als Default)

Nach erfolgreichem Upload/Auswahl: Weiterleitung zu explore.html

### explore.html - Visualisierung

Hauptansicht mit acht Views:
1. Karte (MapLibre GL JS mit Clustering)
2. Korrespondenten (sortierbare/suchbare Liste)
3. Briefe (sortierbare/suchbare Liste)
4. Timeline (Stacked Bar Chart nach Jahr mit Sprachverteilung, Detached Bin für undatierte Briefe)
5. Themen (Topics View mit Detail-Panel)
6. Orte (Places View mit Detail-Panel)
7. Netzwerk (Force-Directed Graph)
8. Mentions Flow (Sankey Diagram für Erwähnungen)

Sidebar mit:
- Statistik-Cards (Briefe, Absender, Orte)
- Geodaten-Info (Orte mit/ohne Koordinaten)
- Zeitraum-Filter (noUiSlider)
- Sprach-Filter (Checkboxen, Top 10)
- Person/Thema/Ort-Filter-Badge (wenn aktiv)
- Legende

Navigation mit:
- View-Switcher (8 Buttons)
- Export-Button
- Neuer Datensatz-Link
- About-Link
- Vault-Link
- Tests-Link

URL-State:
- Filter werden in URL gespeichert
- Parameter: dataset, view, yearMin, yearMax, person, subject, place, langs
- Ermöglicht Bookmarking und Teilen

### about.html - Projektinformation

Statische Seite mit:
- Projekthintergrund
- CMIF-Format Erklärung
- Nutzungshinweise
- Promptotyping-Methodik
- Kontaktinformationen

### vault.html - Promptotyping Vault

Dokumentations-Viewer für knowledge/ Ordner:
- Sidebar mit Dokumenten-Liste
- Markdown-Rendering
- Kategorie-Filter
- Laden von knowledge/ Markdown-Dateien

### wissenskorb.html - Knowledge Basket

Dedizierte Analyse-Seite für gesammelte Items:
- Person-Liste Panel
- Visualisierungen: Timeline, Map, Network
- Filter und Sortierung
- Export-Funktionen

### compare.html - Datensatz-Vergleich

Vergleichsseite für zwei CMIF-Datensätze:
- Zwei Upload-Slots (Datei oder URL)
- Gemeinsame Personen/Orte finden
- Unique-Listen (nur in A, nur in B)
- CSV-Export der Ergebnisse

### test.html - Test Suite

Browser-basierte Test-Ausführung:
- Run Tests Button
- Test-Output Anzeige
- Test-Summary mit Pass/Fail Count
- Auto-run via URL-Parameter

## JavaScript Modules

Die Anwendung verwendet 26 JavaScript-Module organisiert in 7 Kategorien. Alle Module sind ES6-Module ohne Build-Prozess. Die Architektur trennt klar zwischen Core Data Processing (CMIF-Parsing, State-Management), Infrastructure (DOM-Caching, Utilities) und UI-Komponenten (Views, Basket, Enrichment).

### Core Data Processing

**cmif-parser.js**

Browser-basierter CMIF-Parser mit TEI-Namespace-Handling:
- Parst CMIF-XML (TEI) zu interner JSON-Struktur
- Unterstützt File, URL, XML-String, correspSearch API
- Erkennt Unsicherheiten: date/person/place precision
- Erstellt Indices: persons, places, subjects, languages
- Berechnet Metadaten und Statistiken
- Authority-Erkennung für VIAF, GND, GeoNames, Lexvo
- Imports: correspsearch-api.js, utils.js
- Exports: parseCMIF() returns Promise, enrichWithCoordinates()

**state-manager.js**

Zentrale State-Verwaltung:
- Verwaltet globalen State (data, filters, ui)
- Subscriber-Pattern für State-Updates
- Filter-Logik: temporal, languages, person, subject, place, quality
- Caching für Performance (invalidiert bei Filter-Änderungen)
- URL-Serialisierung: toURLParams(), fromURLParams()
- State-Struktur: data (letters, indices, meta), filters, ui (currentView, selections)
- Imports: keine
- Exports: state (singleton AppState)

**formatters.js**

Formatierung mit Unsicherheitsindikatoren:
- Formatiert Datumswerte mit Präzisions-Icons (Tag, Monat, Jahr, Range)
- Person- und Ortsnamen mit CSS-Klassen für Unsicherheiten
- CSS-Helper-Funktionen für Styling (getDatePrecisionClass, getPersonPrecisionClass, getPlacePrecisionClass)
- Initialen-Generator für Personen-Avatare
- Imports: utils.js
- Exports: formatDateWithPrecision, formatPersonName, formatPlaceName, getPersonInitials, CSS-Klassen-Funktionen

### Infrastructure

**dom-cache.js**

DOM-Element-Caching:
- Lazy-loading Cache für häufig genutzte Elemente
- Reduziert wiederholte querySelector-Aufrufe
- Methoden: byId(), bySelector(), allBySelector()
- Map-basiertes Caching-System
- Imports: keine
- Exports: DOMCache (Klasse), elements (singleton), initDOMCache()

**utils.js**

Shared utility functions:
- debounce: Verzögerte Funktionsausführung
- escapeHtml: XSS-Prävention
- downloadFile: Client-seitiger File-Download
- formatNumber: Lokalisierte Zahlenformatierung
- parseAuthorityRef: VIAF, GND, LCCN, ISNI, ORCID Erkennung
- parseGeoNamesRef: GeoNames ID Extraktion
- Imports: keine
- Exports: Einzelne Funktionen

**constants.js**

Zentrale Konstanten:
- LANGUAGE_COLORS: Dynamisch berechnet basierend auf Briefverteilung (starke Farben für häufige Sprachen, Pastell für seltene)
- LANGUAGE_LABELS: Menschenlesbare Sprachnamen
- UI_DEFAULTS: View-Einstellungen, Limits, Defaults
- MAP_DEFAULTS: MapLibre-Konfiguration, Clustering-Parameter
- NETWORK_DEFAULTS: Force-Directed-Graph-Parameter
- API_DEFAULTS: correspSearch API Einstellungen
- BASKET_LIMITS: MAX_PERSONS, MAX_LETTERS, MAX_PLACES
- Imports: keine
- Exports: Konstanten, computeLanguageColors()

### Enrichment

Optionale semantische Anreicherung über externe APIs. Beide Module cachen Ergebnisse in sessionStorage (7 Tage) um wiederholte API-Calls zu vermeiden.

**wikidata-enrichment.js**

Wikidata SPARQL-Integration:
- Queries via VIAF, GND, direct QID
- Batch-Processing mit Progress-Callbacks
- Biografische Daten: Lebensdaten, Bilder, Berufe
- Auflösung von Authority-IDs zu Wikidata-Entities
- SessionStorage-Caching (7 Tage)
- Imports: keine
- Exports: enrichPersonsBatch, enrichPerson, countEnrichable, formatLifeDates, formatPlaces, buildExternalLinks

**enrichment.js**

lobid.org GND API:
- On-demand Enrichment für Personen mit GND-IDs
- Wikidata-ID und Wikipedia-Link Extraktion aus lobid.org Daten
- Biographical Summary Extraction
- SessionStorage-Caching (7 Tage)
- Imports: keine
- Exports: enrichPersonFromGND

**correspsearch-api.js**

Integration der correspSearch API v2.0:
- Automatische Paginierung (10 Ergebnisse pro Seite)
- TEI-JSON zu internem Format Transformation
- Ergebnis-Vorschau mit Gesamtanzahl
- Retry-Logik bei Netzwerkfehlern
- Parameter: correspondent (GND/VIAF URI), placeSender (GeoNames URI), startdate/enddate (YYYY-MM-DD)
- Imports: utils.js, constants.js
- Exports: searchCorrespSearch, fetchFromCorrespSearchUrl, getResultCount, isCorrespSearchUrl

### Knowledge Basket

Persistente Sammlung von interessanten Items zur späteren Analyse. Basket-Daten werden in localStorage gespeichert und über Storage Events zwischen Tabs synchronisiert.

**basket.js**

Sammelt Items zur späteren Analyse:
- Speichert Items: letters, persons, places
- LocalStorage-Persistenz mit Multi-Tab-Sync via Storage Events
- Capacity Limits: MAX_PERSONS, MAX_LETTERS, MAX_PLACES
- URL-Serialisierung für Sharing (Base64-encoded compressed JSON)
- Event-System für Basket-Änderungen
- Imports: constants.js
- Exports: initBasket, addToBasket, removeFromBasket, toggleBasketItem, isInBasket, getBasketItems, getBasketCounts, clearBasket, onBasketChange, resolveBasketItems, generateBasketUrl, loadBasketFromUrl

**basket-ui.js**

UI-Komponenten für Basket:
- Button mit Badge (zeigt Anzahl gesammelter Items)
- Modal mit Tabs (Letters, Persons, Places)
- Add/Remove Actions in allen Views
- Export: JSON, CSV, URL
- Resolve-Logik: Verknüpft Basket-IDs mit Daten aus Indices
- Imports: basket.js, utils.js
- Exports: initBasketUI, setupBasketButton, setupBasketModal

### Main Application

**upload.js**

Handler für die Landing-Page:
- Event-Handler: handleFileSelect, handleDragDrop, handleUrlSubmit, handleDatasetSelect, handleCorrespSearchSubmit
- Config-Modal: Wikidata-Enrichment Option, Koordinaten-Auflösung
- Datenverarbeitung: parseCMIF(), optional enrichPersonsBatch(), enrichWithCoordinates()
- Speicherung in sessionStorage mit Quota-Exceeded-Handling
- Weiterleitung zu explore.html nach erfolgreichem Upload
- Imports: cmif-parser.js, correspsearch-api.js, wikidata-enrichment.js

**explore.js**

Hauptvisualisierung:
- Views: Map, Persons, Letters, Timeline, Topics, Places, Network, Mentions Flow
- View-Rendering und Interaktivität
- MapLibre GL für Karten-View
- D3-Sankey für Mentions Flow
- Initialisierung: loadData() aus sessionStorage oder URL-Parameter, initMap(), initFilters(), initViewSwitcher()
- View-Switching: updateButtons(), showViewContent(), renderViewContent()
- Export: prepareExportData(), downloadFile() für CSV/JSON
- Imports: state-manager, dom-cache, formatters, constants, wikidata-enrichment, basket-ui, demo-tour
- Migration zu state-manager läuft (Legacy-Code vorhanden)

### Secondary Pages

**wissenskorb.js**
- Dedizierte Basket-Analyse-Seite
- Visualisierungen: Timeline, Map, Network
- Filter und Sortierung für gesammelte Personen
- Imports: basket.js, utils.js

**compare.js**
- Dataset-Vergleich (zwei CMIF-Dateien)
- Findet gemeinsame Personen und Orte via ID-Matching
- Unique-Listen (nur in A, nur in B)
- Export: JSON, CSV für Vergleichsergebnisse
- Imports: cmif-parser.js, utils.js

**vault.js**
- Promptotyping Vault (Markdown-Viewer)
- Lädt knowledge/ Markdown-Dateien via fetch
- Sidebar-Navigation mit Kategorien (process, technical, requirements)
- Markdown-Rendering im Content-Bereich
- Imports: keine

**demo-tour.js**
- Interaktives Onboarding für Demo-Dataset
- Gesteuert via URL-Parameter (demo=true)
- SessionStorage für Tour-Status (ce-demo-tour-completed)
- 9 Steps mit Progress-Dots
- Imports: keine
- Exports: checkAndStartDemoTour, startTour

### Test Suite

Browser-basiertes Testing ohne Node.js oder externes Test-Framework. Alle Tests verwenden real CMIF data statt Mock-Daten um die tatsächliche Datenverarbeitung zu validieren.

**tests/test-runner.js**
- Test-Framework ohne Dependencies
- TestRunner-Klasse mit runAll(), runSuite()
- Einfaches Assert-System
- Exports: TestRunner, runTests()

**tests/run-all-tests.js**
- Test-Entry-Point
- Registriert alle Suites: CMIFParserTests, AggregationTests, FormattersTests, StateManagerTests, DOMCacheTests
- Auto-run via URL-Parameter (test=true)
- Imports: test-runner.js, alle Test-Suites
- Exports: runAllTests()

Test-Suites (69 Tests total):
- test-cmif-parser.js: 13 Tests - XML-Parsing, Unsicherheits-Erkennung, Indices-Erstellung
- test-formatters.js: 26 Tests - Formatierung mit Präzisions-Indikatoren, CSS-Klassen
- test-aggregation.js: 11 Tests - Indices-Erstellung, State-Integration, Filtering
- test-state-manager.js: 10 Tests - Filter-Logik, Caching, URL-State Serialisierung
- test-dom-cache.js: 9 Tests - Element-Caching, Performance

Alle Tests verwenden real CMIF data aus data/test-uncertainty.xml, keine Mock-Daten.

## Datenfluss

Die Anwendung unterstützt vier verschiedene Datenflüsse je nach Use Case: vorprozessierte Demo-Daten (HSA), User-Upload, Knowledge Basket und automatisierte Tests.

### 1. HSA (Vorprozessiert)

Python-Preprocessing für Demo-Dataset:
- CMIF.xml aus data/hsa/ als Input
- build_hsa_data.py verarbeitet XML und erzeugt hsa-letters.json mit Indices
- resolve_geonames_wikidata.py löst GeoNames-IDs zu Koordinaten auf
- analyze_hsa_cmif.py analysiert CMIF-Struktur und Metadaten
- consolidate_css_variables.py (Refactoring: CSS-Variablen zu tokens.css)
- migrate_to_dom_cache.py (Refactoring: Legacy-Code zu dom-cache.js)
- explore.html?dataset=hsa lädt direkt hsa-letters.json via fetch
- explore.js visualisiert ohne zusätzliches clientseitiges Parsing
- geonames_coordinates.json wird für Orte ohne Koordinaten verwendet

### 2. Upload (Browser-Parsing)

Browser-basierte Verarbeitung ohne Backend:
- User Upload (File via Drag-Drop oder URL via Fetch)
- upload.js empfängt Input
- cmif-parser.js parst mit DOMParser (clientseitig)
  - Extrahiert Briefe aus correspDesc-Elementen
  - Erstellt Indices für Personen, Orte, Sprachen, Themen
  - Erkennt Unsicherheiten in Daten (date precision, person precision, place precision)
- Optional: Wikidata-Enrichment via enrichPersonsBatch()
- Speichert JSON in sessionStorage (Quota-Limit ~5MB)
- Weiterleitung zu explore.html
- explore.js lädt aus sessionStorage und visualisiert

### 3. Basket (Knowledge Basket)

User-Collection Workflow:
- User sammelt interessante Items (Letters, Persons, Places) in Views
- basket-ui.js UI-Actions (Add/Remove Buttons)
- basket.js Storage-Logic speichert in localStorage
- localStorage-JSON mit IDs der gesammelten Items
- Multi-Tab Sync via Storage Events (automatisch zwischen Tabs synchronisiert)
- URL-Sharing via generateBasketUrl() (Base64-compressed)
- Export als JSON oder CSV
- wissenskorb.html: Dedizierte Analyse-Seite für Basket-Items

### 4. Tests

Automatisierte Test-Ausführung:
- run-all-tests.js startet Test-Runner
- test-runner.js führt alle Suites aus
- Jede Suite ruft parseCMIF() auf
- cmif-parser.js lädt data/test-uncertainty.xml
- Tests validieren XML-Parsing, Formatierung, State-Management, DOM-Caching
- Ergebnisse als Pass/Fail mit Duration
- Keine Mock-Daten, nur real CMIF-XML

## Datenmodell

Das interne Datenmodell ist normalisiert mit Briefen als Hauptentitäten und separierten Indices für Personen, Orte, Sprachen und Themen. Alle Referenzen verwenden Authority-IDs (GND, VIAF, GeoNames) für eindeutige Identifikation.

### Brief (Letter)

Jeder Brief enthält:
- id: Eindeutige Kennung
- url: Link zur Quelle (optional)
- date: ISO-Datum (YYYY-MM-DD)
- year: Extrahiertes Jahr für Timeline
- datePrecision: day, month, year, range, unknown
- sender: Objekt mit name, id, authority, precision
- recipient: Objekt mit name, id, authority, precision
- place_sent: Objekt mit name, geonames_id, lat, lon, precision
- language: Objekt mit code, label
- mentions: Objekt mit subjects, persons, places Arrays

### Indizes

Personen-Index:
- Schlüssel: Authority-ID (VIAF, GND) oder generated ID
- Wert: name, authority, letter_count, as_sender, as_recipient

Orte-Index:
- Schlüssel: GeoNames-ID
- Wert: name, lat, lon, letter_count

Sprachen-Index:
- Schlüssel: ISO 639 Language Code
- Wert: code, label, letter_count

Themen-Index:
- Schlüssel: Subject URI
- Wert: label, uri, category (lexvo, gnd, etc), letter_count

### Meta

Metadaten:
- title: Dataset-Titel
- publisher: Herausgeber
- total_letters: Anzahl Briefe
- unique_senders: Anzahl eindeutiger Absender
- unique_recipients: Anzahl eindeutiger Empfänger
- unique_places: Anzahl eindeutiger Orte
- date_range: min/max Jahr
- uncertainty: Statistiken zu Unsicherheiten (dates, senders, recipients, places mit Präzisions-Verteilung)
- generated: Timestamp

## UI-Komponenten

Alle Views teilen eine gemeinsame Sidebar mit Filtern und Statistiken. Filter sind kombinierbar und werden in der URL gespeichert für Bookmarking und Sharing.

### Kartenansicht

- MapLibre GL JS 4.x für WebGL-Rendering
- CartoDB Basemap mit Light/Dark Toggle
- GeoJSON-Clustering mit Aggregation bei vielen Punkten
- Popup mit Orts-Statistiken (Briefanzahl, Top Korrespondenten)

### Korrespondenten-Liste

- Suche nach Name (debounced)
- Sortierung: Briefanzahl, Name (A-Z/Z-A)
- Avatar mit Initialen und Farbe
- Statistik: Gesendet/Empfangen
- Wikidata-Enrichment optional sichtbar (Portrait, Lebensdaten)

### Brief-Liste

- Suche nach Sender, Empfänger, Ort
- Sortierung: Datum, Absender
- Link zur Quelle (wenn URL vorhanden)
- Limit: 500 Briefe (DOM-Performance)
- Unsicherheits-Indikatoren für Datum, Personen, Orte

### Timeline View

- Stacked Bar Chart nach Jahr
- Sprachverteilung sichtbar durch Farben
- Detached Bin für undatierte Briefe
- Click-Interaktion: Zoom zu Jahr

### Topics View

- Liste aller Themen mit Briefanzahl
- Detail-Panel: Co-occurring Topics
- Click-Filter: Zeigt Briefe zu Thema

### Places View

- Geografische Liste mit Koordinaten
- Statistiken pro Ort
- Click-Filter: Zeigt Briefe von Ort

### Network View

- Force-Directed Graph
- Knoten: Personen
- Kanten: Korrespondenz-Beziehungen
- Farben: Rolle (Sender, Mentioned, Both)

### Mentions Flow View

- Sankey Diagram mit D3-Sankey
- Links: Korrespondenten zu erwähnten Personen
- Flow-Breite: Anzahl Erwähnungen

### Filter

- noUiSlider für Zeitraum (Min/Max Jahr)
- Checkboxen für Sprachen (Top 10, dynamisch sortiert)
- Reset-Button
- Quality-Filter: Precise Dates, Known Persons, Located Places

### Export-Modal

- CSV-Format (Tabellenstruktur für Excel)
- JSON-Format (Strukturierte Daten für weitere Verarbeitung)
- Zeigt Anzahl der exportierten Briefe

## CSS Stylesheets

Das Design System basiert auf CSS Custom Properties (Design Tokens) definiert in tokens.css. Alle Styles folgen einem Logo-derived Color Scheme (Rust Red, Steel Blue, Cream) mit border-based Card Design im Retro-Stil.

### Design System

**tokens.css**
- Design Tokens (Canonical Values)
- Colors: Logo-derived palette (Rust Red Primary, Steel Blue Secondary, Cream Background)
- Typography: Font families (Inter, Lato, Merriweather), sizes (xs bis 3xl), weights
- Spacing: Space scale (xs, sm, md, lg, xl, 2xl, 3xl)
- Layout: Sidebar width, navbar height, responsive breakpoints
- Borders: Border width (2-3px für thick borders), radius (sm, md, lg)
- Shadows: Box shadows für Cards
- Transitions: Animation timing (fast, normal, slow)
- Status-Farben: Success (Forest Green), Info (Academic Blue), Warning (Dark Gold), Error (Dark Red)
- Role Colors: Sender (Steel Blue), Mentioned (Medium Gray), Both (Forest Green)
- Badge Colors: GND (Green), SNDB (Gold)
- Verwendet von: Alle CSS-Dateien via import

**style.css**
- Base styles und Layout
- Reset (Box-Sizing, Margins, Paddings)
- Body-Styles (Font, Color, Background)
- Global Card Style (border-based design, 2px border, hover effect)
- Global Button Style
- Navigation (landing-nav)
- Imports: tokens.css, components.css

**components.css**
- Shared UI-Komponenten über alle Views
- Sidebar Info Section (compact statistics)
- Filter Group (checkboxes, sliders)
- Button Groups (view-switcher, action-buttons)
- Badge Styles (GND, SNDB, Precision-Indicators)
- Modal Styles (overlay, content, close-button)
- Toast Notifications
- Progress Indicators (loading-spinner, progress-bar)
- Search Bars
- Table Styles

### View-Specific Styles

CSS-Dateien pro View:
- explore.css: Explore View (Map, Timeline, Network, Sankey, Sidebar)
- upload.css: Landing Page, Upload Zone, Disclaimer, Dataset Cards
- about.css: About Page, Content Sections, Feature Lists
- vault.css: Vault Page, Document Viewer, Sidebar Navigation
- wissenskorb.css: Basket Analysis Page, Person-List-Panel
- compare.css: Dataset Comparison, Upload-Slots, Results

Alle View-Specific Styles verwenden tokens.css für konsistente Gestaltung. Keine Duplikation von Token-Werten.

## Performance-Strategien

Die Performance-Optimierung fokussiert auf Client-Side-Rendering großer Datenmengen ohne Server-Backend.

1. Lazy Rendering: Listen nur rendern wenn View aktiv (View-Switching invalidiert nicht andere Views)
2. Debouncing: Filter-Updates mit 300ms Verzögerung (vermeidet zu häufige Re-Renders)
3. Clustering: MapLibre-Cluster für 1000+ Punkte (reduziert DOM-Elemente)
4. Limit: Brief-Liste auf 500 Einträge begrenzt (DOM-Performance, zeigt Warning wenn mehr vorhanden)
5. Index-Lookups: O(1) Zugriff auf Personen/Orte via Map-basierte Indices

## Limits und Einschraenkungen

Browser-basierte Architektur hat technische Grenzen durch Storage-Quotas und DOM-Performance. Limits sind bewusst gewählt um Usability zu erhalten.

Aspekt - Limit - Begründung:
- sessionStorage: ~5MB - Browser-Limit, größere Datasets via Preprocessing
- Brief-Liste: 500 Einträge - DOM-Performance, Warning bei mehr Ergebnissen
- Sprach-Filter: Top 10 - UI-Übersichtlichkeit, alle anderen unter "Other"
- CMIF-Upload: ~50MB - Browser-Parsing-Performance

## HTML Pages

Sieben spezialisierte HTML-Seiten ohne gemeinsames Template-System. Jede Seite lädt nur die benötigten JavaScript-Module und Stylesheets.

- index.html: Landing Page (upload.js, upload.css)
- explore.html: Main App (explore.js, explore.css)
- about.html: Info Page (about.css)
- vault.html: Documentation Viewer (vault.js, vault.css)
- wissenskorb.html: Basket Analysis (wissenskorb.js, wissenskorb.css)
- compare.html: Dataset Comparison (compare.js, compare.css)
- test.html: Test Suite (run-all-tests.js, style.css)

## Technology Stack

- Vanilla JavaScript ES6 Modules (kein Build-Prozess, direkt im Browser lauffähig)
- MapLibre GL JS 4.x: WebGL map rendering mit Clustering
- D3-Sankey 0.12.3: Flow diagram visualization für Mentions Flow
- noUiSlider: Time range filtering für Timeline
- CSS Custom Properties: Design tokens ohne Preprocessor
- SessionStorage: Data persistence für aktuelle Session
- LocalStorage: Basket persistence über Sessions hinweg

## Kritische Abhängigkeiten

Fünf zentrale Module bilden das Fundament der Anwendung. Änderungen an diesen Modulen haben weitreichende Auswirkungen.

Zentrale Module:
- cmif-parser.js: Alle Datenverarbeitung, wird von upload, compare, tests verwendet
- state-manager.js: Alle Filter und UI-State, wird von explore verwendet
- formatters.js: Alle Views, wird für jede Datenanzeige verwendet
- constants.js: Fast alle Module, zentrale Konfiguration
- utils.js: Überall verwendet, Shared Functions

Design System:
- tokens.css: Von allen CSS-Dateien verwendet, keine Token-Duplikation
- components.css: Shared Components über alle Views
- Konsistente Verwendung von CSS Custom Properties

## Migration Status

Refactoring zu besserer State-Verwaltung und Performance-Optimierung erfolgt in Phasen. Aktueller Stand: Phase 27 (Dezember 2024).

Phase 1 (Completed):
- state-manager.js introduced (Subscriber-Pattern, Caching, URL-State)
- dom-cache.js introduced (Performance-Optimierung)
- tokens.css Design System (Logo-derived Colors, Spacing Scale)

Aktuelle Phase 27:
- Mentions Flow View mit Filter-Controls (Sidebar Sliders für topN, minSenderMentions, minCount)
- Dynamic Filter Info Text (zeigt aktive Filter-Werte)
- Cognitive Overload Mitigation (Default-Limits für übersichtliche Darstellung)

In Progress:
- explore.js: Partial migration to state-manager (Legacy-Variablen koexistieren mit state-manager)
- Vollständige Nutzung von state.getFilteredLetters() statt manuellem Filtering
- Entfernung von Legacy-Variablen (allLetters, filteredLetters, placeAggregation direkt in explore.js)

## Testing Strategy

Tests validieren die tatsächliche Datenverarbeitung mit real CMIF-XML Dateien. Kein Mock-Data um realitätsnahe Test-Coverage zu garantieren.

Test-Suites:
- test-cmif-parser.js: CMIF-XML zu JSON Parsing (14 Tests)
- test-formatters.js: Datum, Person, Ort Formatierung (27 Tests)
- test-aggregation.js: Indices-Erstellung, Daten-Aggregation (12 Tests)
- test-state-manager.js: Filter-Logik, Caching, URL-State (11 Tests)
- test-dom-cache.js: Element-Caching, Performance (10 Tests)
- test-uncertainty.js: Uncertainty-Handling (zusätzliche Tests)
- explore-tests.js: Legacy Exploratory Tests (416 Zeilen)

Total: 74+ Tests über 7 Suites

Strategie:
- Real CMIF data only (data/test-uncertainty.xml mit 22 repräsentativen Unsicherheits-Fällen)
- No mock data or synthetic objects (alle Tests verwenden parseCMIF() mit echten Daten)
- Business logic tests: ~90% - CMIF-Parser, Formatters, Aggregation, State-Manager, Uncertainty
- Infrastructure tests: ~10% - DOM-Cache (keine CMIF-Daten benötigt)
- Browser-based testing (no Node.js, läuft direkt in test.html)
- All tests pass: 100%

## Browser-Kompatibilitaet

Moderne Browser-Features erforderlich. Keine Polyfills für ältere Browser. Getestet auf aktuellen Versionen der Major Browsers.

Getestet mit:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

Erforderlich:
- ES6 Module Support (import/export)
- DOMParser API (XML-Parsing)
- sessionStorage/localStorage
- Fetch API
- CSS Custom Properties
