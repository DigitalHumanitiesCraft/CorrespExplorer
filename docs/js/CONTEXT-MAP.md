# JavaScript Context Map

18 Module | Modulare ES6-Architektur ohne Build-Tools

## Module nach Kategorie

Entry Points (App-Initialisierung)
- upload.js - Landing Page (index.html)
- explore.js - Hauptansicht (explore.html) - größte Datei
- compare.js - Datensatz-Vergleich
- wissenskorb.js - Persönlicher Wissenskorb (WIP)

Core (keine Dependencies)
- state-manager.js - Zentrales State-Management (Phase 1 - neu)
- dom-cache.js - DOM-Element-Caching für Performance
- constants.js - Farben, UI-Defaults, Konfiguration
- utils.js - Hilfsfunktionen (debounce, escapeHtml, etc.)
- formatters.js - Formatierung (Datum, Person, Ort)

Data (Parsing & Laden)
- cmif-parser.js - Browser-XML-Parser, TEI-JSON-Handler
- correspsearch-api.js - correspSearch API v2.0 Integration

Enrichment (Datenanreicherung)
- wikidata-enrichment.js - SPARQL für Bilder, Lebensdaten, Orte
- geonames-enrichment.js - GeoNames zu Koordinaten via Wikidata SPARQL
- enrichment.js - Zusätzliche Enrichments

UI/UX (User-Interaktion)
- basket.js - LocalStorage-Wissenskorb-Logik
- basket-ui.js - Wissenskorb UI-Komponenten
- demo-tour.js - Onboarding-Tour

Tests (siehe tests/CONTEXT-MAP.md)
- tests/*.js - Unit/Integration-Tests

## Programmfluss

### 1. Landing Page (index.html)

```
upload.js
  ├─> Datei-Upload / URL-Input
  ├─> cmif-parser.js: XML → JSON
  ├─> Config-Modal zeigen mit Enrichment-Optionen
  │   ├─> Optional: geonames-enrichment.js (GeoNames IDs → Koordinaten)
  │   └─> Optional: wikidata-enrichment.js (Authority IDs → Bilder/Daten)
  ├─> sessionStorage.setItem('cmif_data', ...)
  └─> window.location.href = 'explore.html'
```

### 2. Hauptansicht (explore.html)

```
explore.js (5.084 Zeilen - zentrale Datei)
  │
  ├─> INITIALIZATION
  │   ├─> state-manager.js: state.setData()
  │   ├─> dom-cache.js: initDOMCache()
  │   └─> constants.js: computeLanguageColors()
  │
  ├─> DATA LOADING
  │   ├─> sessionStorage.getItem('cmif_data')
  │   ├─> oder: cmif-parser.js bei URL-Parameter
  │   └─> aggregateLettersByPlace()
  │
  ├─> FILTER SYSTEM
  │   ├─> applyFilters()
  │   ├─> state.updateFilters()
  │   └─> state.getFilteredLetters() [cached]
  │
  ├─> 8 VIEWS (Rendering)
  │   ├─> renderMap() - MapLibre GL + GeoJSON
  │   ├─> renderPersonsList() + wikidata-enrichment.js
  │   ├─> renderLettersList() + formatters.js
  │   ├─> renderTimeline() - D3.js Stacked Bars
  │   ├─> renderTopicsList() + renderTopicDetail()
  │   ├─> renderPlacesList()
  │   ├─> renderNetwork() - D3 Force-Directed
  │   └─> renderMentionsFlow() - D3 Sankey
  │
  ├─> INTERACTIONS
  │   ├─> basket-ui.js: Hinzufügen zu Wissenskorb
  │   ├─> Export: CSV/JSON Download
  │   └─> URL-State: state.toURLParams()
  │
  └─> ONBOARDING
      └─> demo-tour.js: Intro für Demo-Datensatz
```

### 3. Filter-Fluss (kritischer Pfad)

```
User-Interaction (z.B. Jahr-Slider)
  │
  ├─> Event-Handler in explore.js
  │
  ├─> state.updateFilters({ temporal: { min, max } })
  │   └─> state._filtersDirty = true
  │
  ├─> applyFilters()
  │   ├─> state.getFilteredLetters() [cached oder neu]
  │   ├─> aggregateLettersByPlace(filtered)
  │   └─> updateUI()
  │
  └─> Render aktive View
      ├─> renderMap()
      ├─> renderTimeline()
      └─> etc.
```

### 4. Daten-Enrichment-Fluss

```
Ursprungsdaten (CMIF-XML)
  │
  ├─> cmif-parser.js
  │   └─> Basis-JSON-Struktur
  │
  ├─> wikidata-enrichment.js
  │   ├─> enrichPerson(viaf) → SPARQL
  │   ├─> → Bild-URL, Lebensdaten, Professionen
  │   └─> Cache in LocalStorage
  │
  └─> formatters.js
      ├─> formatDateWithPrecision()
      ├─> formatPersonName()
      └─> formatPlaceName()
```

## Modul-Abhängigkeiten

### Keine Dependencies (Core)
- constants.js
- utils.js
- formatters.js

### Level 1 (Nutzt nur Core)
- dom-cache.js → (keine)
- state-manager.js → (keine)
- cmif-parser.js → utils.js

### Level 2 (Nutzt Core + Level 1)
- wikidata-enrichment.js → formatters.js
- basket.js → utils.js
- basket-ui.js → basket.js, formatters.js

### Level 3 (Hauptmodule)
- explore.js → ALLE (außer upload, compare, wissenskorb)
- upload.js → cmif-parser, correspsearch-api
- compare.js → cmif-parser, formatters
- wissenskorb.js → basket, formatters

## Daten-Strukturen

### State-Manager State
```javascript
state = {
    data: {
        letters: Array<Letter>,
        indices: { persons, places, subjects, languages },
        meta: { total_letters, date_range, uncertainty },
        placeAggregation: Map<geoID, LetterCount>
    },
    filters: {
        temporal: { min, max } | null,
        languages: string[],
        person: string | null,
        subject: string | null,
        place: string | null,
        quality: { preciseDates, knownPersons, locatedPlaces }
    },
    ui: {
        currentView: 'map' | 'persons' | ...,
        selectedTopicId, topicsSearchTerm, topicsSortOrder,
        selectedPlaceId, placesSearchTerm, placesSortOrder,
        ... (view-specific state)
    }
}
```

### Letter-Objekt
```javascript
{
    id: string,
    url: string,
    date: string,
    dateTo: string | null,
    year: number,
    datePrecision: 'day'|'month'|'year'|'range'|'unknown',
    dateCertainty: 'high'|'medium'|'low',
    sender: { name, id, authority },
    recipient: { name, id, authority },
    place_sent: { name, geonames_id, lat, lon },
    language: { code, label },
    mentions: {
        subjects: [...],
        persons: [...],
        places: [...]
    }
}
```

## Performance-Hotspots

| Funktion | Aufrufe/Session | Optimierung |
|----------|-----------------|-------------|
| getFilteredLetters() | ~100x | State-Manager Caching |
| renderLettersList() | ~50x | Limit: 500 Einträge |
| aggregateLettersByPlace() | ~30x | O(n) aber unvermeidbar |
| MapLibre rendering | ~10x | Clustering ab 100 Punkten |
| D3 Network | ~5x | maxNodes: 50 |

## Refactoring-Potenzial (Phase 2)

explore.js ist mit Abstand die größte Datei und könnte aufgeteilt werden in:

View-Module:
- map-view.js, persons-view.js, letters-view.js, timeline-view.js
- topics-view.js, places-view.js, network-view.js, mentions-flow-view.js

Core-Module:
- filter-engine.js - Filter-Logik aus explore.js
- data-loader.js - Daten-Laden und Aggregation

## Naming Conventions

Dateien:
- `kebab-case.js` für Module
- `test-*.js` für Tests
- `UPPERCASE.md` für Docs

Funktionen:
- `camelCase()` für Funktionen
- `PascalCase` für Klassen
- `renderXYZ()` für View-Rendering
- `updateXYZ()` für State-Updates
- `applyXYZ()` für Filter-Anwendung
- `buildXYZ()` für Datenstruktur-Aufbau

Variablen:
- `camelCase` für Variablen
- `UPPER_SNAKE_CASE` für Konstanten (constants.js)
- `_privateVar` für interne State-Variablen (z.B. state._filtersDirty)

## Import-Reihenfolge (Best Practice)

```javascript
// 1. External Libraries
import maplibregl from 'maplibre-gl';
import * as d3 from 'd3';

// 2. Core Modules
import { state } from './state-manager.js';
import { elements } from './dom-cache.js';
import { CONSTANTS } from './constants.js';

// 3. Utilities
import { debounce, escapeHtml } from './utils.js';
import { formatDate, formatPerson } from './formatters.js';

// 4. Feature Modules
import { enrichPerson } from './wikidata-enrichment.js';
import { initBasketUI } from './basket-ui.js';
```

## Debugging-Tipps

State inspizieren:
```javascript
// Im Browser-Console
window.state = state;  // In explore.js exportieren
state.getAllLetters()
state.getFilteredLetters()
state.filters
```

DOM-Cache inspizieren:
```javascript
window.elements = elements;
elements.mapContainer
elements.clearCache()
```

Test-Mode:
```
explore.html?test=true     // Startet Tests automatisch
```

Logging:
```javascript
// In explore.js
const IS_PRODUCTION = false;  // Aktiviert Logging
log.init('...')
log.render('...')
log.event('...')
```
