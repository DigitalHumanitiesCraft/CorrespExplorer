# JavaScript Context Map

26 Module | ES6-Architektur ohne Build-Tools

Detaillierte Dokumentation: [architecture.md](../knowledge/architecture.md)

## Module nach Kategorie

Entry Points (App-Initialisierung)
- upload.js - Landing Page (index.html)
- explore.js - Hauptansicht (explore.html), 10 Views
- wissenskorb.js - Persoenlicher Wissenskorb
- vault.js - Dokumentations-Viewer

Core (keine Dependencies)
- state-manager.js - Zentrales State-Management
- dom-cache.js - DOM-Element-Caching
- constants.js - Farben, UI-Defaults, Konfiguration
- utils.js - Hilfsfunktionen
- formatters.js - Formatierung (Datum, Person, Ort)

Data (Parsing und Laden)
- cmif-parser.js - Browser-XML-Parser, TEI-JSON-Handler
- correspsearch-api.js - correspSearch API v2.0 Integration

Enrichment (Datenanreicherung)
- wikidata-enrichment.js - SPARQL fuer Bilder, Lebensdaten
- geonames-enrichment.js - GeoNames zu Koordinaten via Wikidata
- enrichment.js - lobid.org GND API

UI/UX (User-Interaktion)
- basket.js - LocalStorage-Wissenskorb-Logik
- basket-ui.js - Wissenskorb UI-Komponenten
- demo-tour.js - Onboarding-Tour

Tests (siehe tests/CONTEXT-MAP.md)
- test-runner.js - Test-Framework
- run-all-tests.js - Test-Entry-Point
- test-*.js - 5 Test-Suites (74+ Tests)

## Kritische Abhaengigkeiten

explore.js importiert fast alle Module und ist das Herzstueck.

Aenderungen an diesen Modulen haben weitreichende Auswirkungen:
- cmif-parser.js - Alle Datenverarbeitung
- state-manager.js - Alle Filter und UI-State
- formatters.js - Alle Views
- constants.js - Fast alle Module

## Views in explore.js

10 Views: Overview, Map, Persons, Letters, Timeline, Topics, Places, Network, Mentions Flow, Chronik

Jeder View hat:
- renderXYZ() Funktion
- Optionale setupXYZ() Funktion
- View-spezifischer State in state.ui

## Naming Conventions

Dateien: kebab-case.js
Funktionen: camelCase()
Klassen: PascalCase
Rendering: renderXYZ()
State-Updates: updateXYZ()
Filter: applyXYZ()
Builder: buildXYZ()
