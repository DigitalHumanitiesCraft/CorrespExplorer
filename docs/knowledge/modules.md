# JavaScript Module Reference

Technische Referenz aller JavaScript-Module mit Imports, Exports und Abhaengigkeiten.

Fuer Architektur-Uebersicht siehe [architecture.md](architecture.md).

## Core Modules

### cmif-parser.js

Browser-basierter CMIF-Parser mit TEI-Namespace-Handling.

Funktion: Parst CMIF-XML (TEI) zu interner JSON-Struktur. Unterstuetzt File, URL, XML-String, correspSearch API. Erkennt Unsicherheiten (date/person/place precision). Erstellt Indices fuer Personen, Orte, Sprachen, Themen. Authority-Erkennung fuer VIAF, GND, GeoNames, Lexvo.

Imports: correspsearch-api.js, utils.js

Exports:
- parseCMIF(input) - Hauptfunktion, returns Promise mit parsed data
- enrichWithCoordinates(data) - Fuegt Koordinaten zu Orten hinzu

### state-manager.js

Zentrale State-Verwaltung mit Subscriber-Pattern.

Funktion: Verwaltet globalen State (data, filters, ui). Subscriber-Pattern fuer State-Updates. Filter-Logik: temporal, languages, person, subject, place, quality. Caching fuer Performance. URL-Serialisierung.

Imports: keine

Exports:
- state - Singleton AppState mit Methoden:
  - getFilteredLetters() - Cached filtered letters
  - getAllLetters() - All letters
  - getIndices() - Person/Place/Subject indices
  - getMeta() - Dataset metadata
  - setFilter(name, value) - Update filter
  - toURLParams() / fromURLParams() - URL state

### formatters.js

Formatierung mit Unsicherheitsindikatoren.

Funktion: Formatiert Datumswerte mit Praezisions-Icons. Person- und Ortsnamen mit CSS-Klassen fuer Unsicherheiten. Initialen-Generator fuer Avatare.

Imports: utils.js

Exports:
- formatDateWithPrecision(date, precision) - Datum mit Icon
- formatSingleDate(date) - Einfaches Datum
- formatPersonName(person) - Name mit Precision-Class
- formatPlaceName(place) - Ort mit Precision-Class
- getDatePrecisionClass(precision) - CSS-Klasse
- getPersonPrecisionClass(precision) - CSS-Klasse
- getPlacePrecisionClass(precision) - CSS-Klasse
- getPersonInitials(name) - Initialen fuer Avatar

### dom-cache.js

DOM-Element-Caching fuer Performance.

Funktion: Lazy-loading Cache fuer haeufig genutzte Elemente. Reduziert wiederholte querySelector-Aufrufe. Map-basiertes Caching.

Imports: keine

Exports:
- DOMCache - Klasse
- elements - Singleton mit gecachten Elementen
- initDOMCache() - Initialisierung

### utils.js

Shared Utility Functions.

Imports: keine

Exports:
- debounce(fn, delay) - Verzoegerte Ausfuehrung
- escapeHtml(str) - XSS-Praevention
- downloadFile(content, filename, type) - Client-seitiger Download
- formatNumber(num) - Lokalisierte Zahlen
- parseAuthorityRef(ref) - VIAF, GND, LCCN, ISNI, ORCID
- parseGeoNamesRef(ref) - GeoNames ID
- analyzeDataCapabilities(data) - Prueft Daten-Features

### constants.js

Zentrale Konstanten und Konfiguration.

Imports: keine

Exports:
- LANGUAGE_COLORS - Dynamisch berechnet nach Briefverteilung
- LANGUAGE_LABELS - Menschenlesbare Sprachnamen
- UI_DEFAULTS - View-Einstellungen, Limits
- MAP_DEFAULTS - MapLibre-Konfiguration
- NETWORK_DEFAULTS - Force-Graph-Parameter
- API_DEFAULTS - correspSearch API
- BASKET_LIMITS - MAX_PERSONS, MAX_LETTERS, MAX_PLACES
- computeLanguageColors(languages) - Berechnet Farbskala

## Entry Points

### upload.js

Landing Page Handler (index.html).

Funktion: File-Upload via Drag-Drop. URL-Input fuer Remote-CMIF. Config-Modal fuer Enrichment-Optionen. Zwei-stufige Anreicherung (Koordinaten, dann Personen). Speicherung in sessionStorage.

Imports: cmif-parser.js, correspsearch-api.js, wikidata-enrichment.js, geonames-enrichment.js, utils.js

Exports: keine (Event-Handler)

### explore.js

Hauptvisualisierung (explore.html).

Funktion: View-Orchestrierung fuer 12 Views. MapLibre GL fuer Karten. Sidebar mit Filtern. Export CSV/JSON.

Imports: state-manager.js, dom-cache.js, formatters.js, constants.js, wikidata-enrichment.js, basket-ui.js, demo-tour.js, views/*

Exports: keine (Self-initializing)

Verbleibende Views: Overview, Map, Persons, Letters, Topics, Places, Questions

### wissenskorb.js

Basket-Analyse-Seite (wissenskorb.html).

Funktion: Dedizierte Analyse fuer gesammelte Items. Visualisierungen: Timeline, Map, Network.

Imports: basket.js, utils.js

Exports: keine

### vault.js

Dokumentations-Viewer (vault.html).

Funktion: Laedt knowledge/ Markdown-Dateien. Sidebar-Navigation mit Kategorien.

Imports: keine

Exports: keine

## Extracted Views (views/)

Alle View-Module folgen dem Dependency Injection Pattern.

### views/timeline-view.js

Zeitleisten-Visualisierung.

Funktion: Stacked Bar Chart nach Jahr. Brush-Selection fuer Zeitraum. Detached Bin fuer undatierte Briefe.

Imports: formatters.js, dom-cache.js

Exports:
- initTimelineView(deps) - Initialisierung mit Dependencies
- renderTimeline() - Render-Funktion
- resetTimelineRendered() - Reset State

Dependencies (via init): getFilteredLetters, getMeta, showLetterDetail

### views/activity-view.js

GitHub-style Kalender-Heatmap.

Funktion: Wochentage x Wochen Matrix. Farbintensitaet nach Briefanzahl. Jahr-Auswahl und Detail-Panel.

Imports: dom-cache.js

Exports:
- initActivityView(deps) - Initialisierung
- renderActivity() - Render-Funktion

Dependencies (via init): getFilteredLetters, showLetterDetail

### views/chronik-view.js

Chronologische Brief-Liste mit Wikidata.

Funktion: Vertikaler Zeitstrahl nach Jahren. Drei Layouts (Cards, Compact, Timeline). Wikidata-Anreicherung. Altersberechnung.

Imports: wikidata-enrichment.js, formatters.js, utils.js, dom-cache.js

Exports:
- initChronikView(deps) - Initialisierung
- renderChronik() - Render-Funktion
- isChronikEnriched() - Status-Check
- resetChronikState() - Reset

Dependencies (via init): getFilteredLetters, showLetterDetail, state

### views/comparison-view.js

Side-by-Side Vergleich.

Funktion: Split-Screen fuer Personen/Orte/Zeitraeume. Metriken und Overlap-Analyse. Autocomplete-Suche.

Imports: utils.js, dom-cache.js

Exports:
- initComparisonView(deps) - Initialisierung
- renderComparison() - Render-Funktion

Dependencies (via init): getFilteredLetters, getIndices, getMeta, applyPersonFilter, applyPlaceFilter, switchView, showLetterDetail

### views/network-view.js

D3.js Force-Directed Graph.

Funktion: Knoten = Personen, Kanten = Korrespondenz. Zoom/Pan. Click-Navigation zu Filter.

Imports: dom-cache.js

Exports:
- initNetworkView(deps) - Initialisierung
- renderNetwork() - Render-Funktion
- resetNetworkZoom() - Zoom zuruecksetzen

Dependencies (via init): getFilteredLetters, getAllLetters, getDateRange, applyPersonFilter, applySubjectFilter, switchView, log

### views/mentions-view.js

Sankey-Diagramm fuer Erwahnungen.

Funktion: Drei-Spalten-Layout (Erwaehnende - Person - Erwaehnte). D3-Sankey. Autocomplete. Click-Navigation.

Imports: utils.js, dom-cache.js

Exports:
- initMentionsView(deps) - Initialisierung
- renderMentionsFlow() - Render-Funktion
- resetMentionsPerson() - Reset selected person

Dependencies (via init): getFilteredLetters, showLetterDetail, log

### views/topics-view.js

Themen-Browse mit Detail-Panel.

Funktion: Subject/Topic-Index aus Briefen. Liste mit Suche/Sortierung. Detail-Panel zeigt Korrespondenten, Timeline, verwandte Themen. Click-Handler fuer Filter.

Imports: utils.js, dom-cache.js

Exports:
- initTopicsView(deps) - Initialisierung
- renderTopicsList() - Render-Funktion
- getSubjectIndex() - Aktueller Index
- getSelectedSubjectId() - Aktuell ausgewaehltes Thema
- setSelectedSubjectId(id) - Setzt Auswahl
- rebuildSubjectIndex() - Index neu aufbauen
- resetTopicsState() - Reset State

Dependencies (via init): getFilteredLetters, getAllLetters, applySubjectFilter, log

### views/places-view.js

Orte-Browse mit Koordinaten-Aufloesung.

Funktion: Places-Index aus Briefen. Liste mit Suche/Sortierung. Detail-Panel zeigt Absender, Timeline, Sprachen. GeoNames-Link. Koordinaten-Aufloesung via Wikidata. Basket-Integration.

Imports: utils.js, formatters.js, dom-cache.js, constants.js

Exports:
- initPlacesView(deps) - Initialisierung
- renderPlacesList() - Render-Funktion
- getPlacesIndex() - Aktueller Index
- getSelectedPlaceId() - Aktuell ausgewaehlter Ort
- setSelectedPlaceId(id) - Setzt Auswahl
- rebuildPlacesIndex() - Index neu aufbauen
- resetPlacesState() - Reset State
- updateMissingCoordinatesBanner() - Banner aktualisieren

Dependencies (via init): getFilteredLetters, getAllLetters, getDataIndices, applyPlaceFilter, switchView, basketAdd, basketIsInBasket, showToast, onDataUpdated, log

## Enrichment Modules

### wikidata-enrichment.js

Wikidata SPARQL-Integration fuer Personen.

Funktion: Queries via VIAF, GND, QID. Batch-Processing. Biografische Daten. SessionStorage-Caching (7 Tage).

Imports: keine

Exports:
- enrichPersonsBatch(persons, callback) - Batch-Anreicherung
- enrichPerson(person) - Einzelne Person
- countEnrichable(persons) - Zaehlt anreicherbare
- formatLifeDates(data) - Formatiert Lebensdaten
- formatPlaces(data) - Formatiert Orte
- buildExternalLinks(data) - Wikipedia/Wikidata Links

### geonames-enrichment.js

GeoNames zu Koordinaten via Wikidata.

Funktion: Loest GeoNames-IDs zu Koordinaten auf. Batch-Processing (50 IDs). Rate Limiting (1.5s). LocalStorage-Caching.

Imports: keine

Exports:
- resolveGeoNamesCoordinates(ids, callback) - Batch-Aufloesung
- applyCoordinatesToData(data, coords) - Wendet Koordinaten an
- analyzeCoordinateNeeds(data) - Analysiert fehlende Koordinaten

### enrichment.js

lobid.org GND API.

Funktion: On-demand Enrichment fuer Personen mit GND-IDs. Wikidata-ID und Wikipedia-Link Extraktion.

Imports: keine

Exports:
- enrichPersonFromGND(gndId) - Anreicherung via lobid.org

### correspsearch-api.js

correspSearch API v2.0 Integration.

Funktion: Automatische Paginierung. TEI-JSON Transformation. Retry-Logik.

Imports: utils.js, constants.js

Exports:
- searchCorrespSearch(params) - Suche mit Parametern
- fetchFromCorrespSearchUrl(url) - Direkter URL-Abruf
- getResultCount(params) - Ergebnis-Vorschau
- isCorrespSearchUrl(url) - URL-Pruefung

## Basket Modules

### basket.js

LocalStorage-basierte Sammlung.

Funktion: Speichert Items (letters, persons, places). Multi-Tab-Sync via Storage Events. URL-Serialisierung fuer Sharing.

Imports: constants.js

Exports:
- initBasket() - Initialisierung
- addToBasket(type, item) - Item hinzufuegen
- removeFromBasket(type, id) - Item entfernen
- toggleBasketItem(type, item) - Toggle
- isInBasket(type, id) - Status-Check
- getBasketItems(type) - Items abrufen
- getBasketCounts() - Zaehler
- clearBasket() - Leeren
- onBasketChange(callback) - Event-Listener
- generateBasketUrl() - URL fuer Sharing
- loadBasketFromUrl(url) - URL laden

### basket-ui.js

UI-Komponenten fuer Basket.

Funktion: Button mit Badge. Modal mit Tabs. Add/Remove Actions. Export JSON/CSV/URL.

Imports: basket.js, utils.js

Exports:
- initBasketUI() - Initialisierung
- setupBasketButton() - Button-Setup
- setupBasketModal() - Modal-Setup

## UI Modules

### demo-tour.js

Interaktives Onboarding.

Funktion: Gesteuert via URL-Parameter (demo=true). SessionStorage fuer Tour-Status. 9 Steps mit Progress-Dots.

Imports: keine

Exports:
- checkAndStartDemoTour() - Auto-Start Check
- startTour() - Manueller Start

## Test Modules

### tests/test-runner.js

Test-Framework ohne Dependencies.

Exports:
- TestRunner - Klasse mit runAll(), runSuite()
- runTests() - Convenience-Funktion

### tests/run-all-tests.js

Test-Entry-Point.

Funktion: Registriert alle Suites. Auto-run via URL-Parameter.

Imports: test-runner.js, alle test-*.js

Exports:
- runAllTests() - Startet alle Tests

### Test Suites

- test-cmif-parser.js - XML-Parsing (13 Tests)
- test-formatters.js - Formatierung (26 Tests)
- test-aggregation.js - Indices/Aggregation (11 Tests)
- test-state-manager.js - Filter/Caching (10 Tests)
- test-dom-cache.js - DOM-Caching (9 Tests)

Alle Tests verwenden real CMIF data aus data/test-uncertainty.xml.
