# CorrespExplorer Architektur

## Systemuebersicht

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Upload     │  │   Parser     │  │   Store      │       │
│  │  (Datei/URL) │──│  (CMIF-XML)  │──│  (Memory)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│           │                                   │              │
│           v                                   v              │
│  ┌──────────────────────────────────────────────────┐       │
│  │                 Visualisierung                     │       │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │       │
│  │  │ Karte  │  │Timeline│  │Netzwerk│  │ Liste  │  │       │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Module

### cmif-parser.js (geplant)

Browser-basierter CMIF-Parser:

```javascript
// Oeffentliche API
export async function parseCMIF(source) {
  // source: File, URL oder String
  const xml = await loadXML(source);
  const letters = extractLetters(xml);
  const indices = buildIndices(letters);
  return { letters, indices, meta };
}

// Erkennt Authority-Typ aus URL
function parseAuthorityRef(url) {
  if (url.includes('viaf.org')) return { type: 'viaf', id: extractId(url) };
  if (url.includes('d-nb.info/gnd')) return { type: 'gnd', id: extractId(url) };
  if (url.includes('geonames.org')) return { type: 'geonames', id: extractId(url) };
  return { type: 'unknown', id: url };
}
```

### data.js

Datenmanagement und Caching:

```javascript
import { CONFIG } from './config.js';

let cache = null;

export async function loadData() {
  if (cache) return cache;
  const response = await fetch(CONFIG.dataFile);
  cache = await response.json();
  return cache;
}

export function getPersonFromIndex(id) {
  return cache?.indices?.persons?.[id];
}

export function getPlaceFromIndex(id) {
  return cache?.indices?.places?.[id];
}
```

### config.js

Anwendungskonfiguration:

```javascript
export const CONFIG = {
  name: 'CorrespExplorer',
  dataFile: 'data/hsa-letters.json',  // Vorprozessiert
  dateRange: { min: 1859, max: 1927 },
  features: {
    hasSubjects: true,
    hasMentionsPlace: true,
    hasMentionsPerson: true,
    hasLanguage: true
  },
  ui: {
    primaryColor: '#1e40af',
    entityLabel: 'Briefe'
  }
};
```

### app.js

Hauptanwendung mit Kartenlogik:

```javascript
import { loadData } from './data.js';
import { CONFIG } from './config.js';

let map;
let allLetters = [];
let filteredLetters = [];

async function init() {
  const data = await loadData();
  allLetters = data.letters;
  initMap();
  initFilters(data);
  renderMarkers();
}

function aggregateLettersByPlace(letters, placesIndex) {
  // Gruppiert Briefe nach Absendeort
  // Reichert mit Koordinaten aus Index an
}

function renderMarkers(places) {
  // GeoJSON generieren
  // MapLibre-Layer aktualisieren
}
```

## Datenfluss

### 1. Vorprozessierte Daten (aktuell)

```
CMIF.xml
    │
    v
build_hsa_data.py ──────────────────┐
    │                               │
    v                               v
hsa-letters.json            geonames_coordinates.json
    │
    v
data.js (fetch)
    │
    v
app.js (visualize)
```

### 2. Browser-Upload (geplant)

```
User Upload (File/URL)
    │
    v
cmif-parser.js (DOMParser)
    │
    v
Memory Store
    │
    v
app.js (visualize)
```

## Datenmodell

### Brief (Letter)

```json
{
  "id": "o:hsa.letter.654",
  "url": "https://gams.uni-graz.at/o:hsa.letter.654",
  "date": "1913-06-13",
  "year": 1913,
  "sender": {
    "name": "Urquijo Ybarra, Julio de",
    "id": "18030027",
    "authority": "viaf"
  },
  "recipient": {
    "name": "Schuchardt, Hugo",
    "id": "261931943",
    "authority": "viaf"
  },
  "place_sent": {
    "name": "Saint-Jean-de-Luz",
    "geonames_id": "6440594",
    "lat": 43.3882,
    "lon": -1.6603
  },
  "language": {
    "code": "es",
    "label": "Spanisch"
  },
  "mentions": {
    "subjects": [...],
    "persons": [...],
    "places": [...]
  }
}
```

### Indizes

```json
{
  "persons": {
    "18030027": {
      "name": "Urquijo Ybarra, Julio de",
      "authority": "viaf",
      "letter_count": 243,
      "as_sender": 120,
      "as_recipient": 123
    }
  },
  "places": {
    "6440594": {
      "name": "Saint-Jean-de-Luz",
      "lat": 43.3882,
      "lon": -1.6603,
      "letter_count": 45
    }
  },
  "subjects": {
    "S.4567": {
      "label": "Baskisch",
      "category": "lexvo",
      "letter_count": 698
    }
  }
}
```

## CMIF-Parsing

### XPath-Ausdruecke

```xpath
// Alle Briefe
//tei:correspDesc

// Sender
.//tei:correspAction[@type='sent']/tei:persName

// Empfaenger
.//tei:correspAction[@type='received']/tei:persName

// Absende-Ort
.//tei:correspAction[@type='sent']/tei:placeName

// Datum
.//tei:correspAction[@type='sent']/tei:date/@when

// Briefsprache
.//tei:note/tei:ref[contains(@type, 'hasLanguage')]/@target

// Erwahnte Themen
.//tei:note/tei:ref[contains(@type, 'mentionsSubject')]
```

### Namespace-Handling

CMIF-Dateien verwenden TEI-Namespace:
```javascript
const TEI_NS = 'http://www.tei-c.org/ns/1.0';

function getElementsByTagNameNS(element, localName) {
  return element.getElementsByTagNameNS(TEI_NS, localName);
}
```

## Koordinaten-Aufloesung

### Wikidata SPARQL

```sparql
SELECT ?geonames ?lat ?lon WHERE {
  VALUES ?geonames { "2988507" "6440594" }
  ?item wdt:P1566 ?geonames .
  ?item p:P625 ?coordStatement .
  ?coordStatement ps:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
}
```

### Caching

Koordinaten werden in `geonames_coordinates.json` gecacht:
```json
{
  "2988507": { "lat": 48.8566, "lon": 2.3522, "name": "Paris" },
  "6440594": { "lat": 43.3882, "lon": -1.6603, "name": "Saint-Jean-de-Luz" }
}
```

## UI-Komponenten

### Kartenansicht

- MapLibre GL JS 4.x
- CartoDB Basemap (Light/Dark)
- GeoJSON-Clustering
- Popup mit Orts-Statistiken

### Filter

- noUiSlider fuer Zeitraum
- Checkboxen fuer Sprachen
- Reset-Button

### Navigation

- Responsive Navbar
- View-Switcher (Karte, Personen, Briefe, Themen, Orte)
- Mobile Burger-Menu

## Performance

### Strategien

1. Lazy Loading der Daten
2. Debouncing der Filter-Updates
3. Clustering fuer Karten-Performance
4. Index-basierte Lookups

### Limits

- Getestet mit 11.576 Briefen
- GeoJSON-Clustering bis 50.000 Punkte performant
- Browser-Parsing bis ca. 50MB XML praktikabel
