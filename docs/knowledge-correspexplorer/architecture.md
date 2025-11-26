# CorrespExplorer Architektur

## Systemuebersicht

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   index.html                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐      │   │
│  │  │  Upload    │  │   URL      │  │  Beispiel  │      │   │
│  │  │  (Drag&Drop)│  │  (Fetch)  │  │  (HSA)     │      │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘      │   │
│  │        │               │               │              │   │
│  │        v               v               v              │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │              cmif-parser.js                   │    │   │
│  │  │         (DOMParser, Index-Builder)            │    │   │
│  │  └──────────────────────┬───────────────────────┘    │   │
│  │                         │                             │   │
│  │        ┌────────────────┴────────────────┐           │   │
│  │        │                                 │           │   │
│  │        v                                 v           │   │
│  │  sessionStorage                    URL-Parameter     │   │
│  │  (kleine Daten)                    (?dataset=hsa)    │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         v                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  explore.html                         │   │
│  │  ┌────────┐  ┌────────────┐  ┌──────────┐            │   │
│  │  │ Karte  │  │Korresponden│  │  Briefe  │            │   │
│  │  │MapLibre│  │   Liste    │  │  Liste   │            │   │
│  │  └────────┘  └────────────┘  └──────────┘            │   │
│  │       │           │              │                    │   │
│  │       └───────────┴──────────────┘                    │   │
│  │                   │                                   │   │
│  │                   v                                   │   │
│  │            ┌──────────┐                               │   │
│  │            │  Export  │                               │   │
│  │            │ CSV/JSON │                               │   │
│  │            └──────────┘                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Seiten-Struktur

### index.html - Landing-Page

Einstiegspunkt fuer alle Nutzer:
- Upload-Zone (Drag-and-Drop, Datei-Auswahl)
- URL-Input fuer Remote-CMIF
- Beispiel-Datensaetze (HSA als Default)

Nach erfolgreichem Upload/Auswahl: Weiterleitung zu explore.html

### explore.html - Visualisierung

Hauptansicht mit sieben Views:
1. Karte (MapLibre GL JS mit Clustering)
2. Korrespondenten (sortierbare/suchbare Liste)
3. Briefe (sortierbare/suchbare Liste)
4. Timeline (Balkendiagramm nach Jahr mit Sprachverteilung)
5. Themen (Topics View mit Detail-Panel)
6. Orte (Places View mit Detail-Panel)
7. Netzwerk (D3.js Force-Directed Graph)

Sidebar mit:
- Statistik-Cards (Briefe, Absender, Orte)
- Geodaten-Info (Orte mit/ohne Koordinaten)
- Zeitraum-Filter (noUiSlider)
- Sprach-Filter (Checkboxen, Top 10)
- Person/Thema/Ort-Filter-Badge (wenn aktiv)
- Legende

Navigation mit:
- View-Switcher (7 Buttons)
- Export-Button
- "Neuer Datensatz"-Link
- About-Link

URL-State:
- Filter werden in URL gespeichert
- Parameter: dataset, view, yearMin, yearMax, person, subject, place, langs
- Ermoeglicht Bookmarking und Teilen

### about.html - Projektinformation

Statische Seite mit:
- Projekthintergrund
- CMIF-Format Erklaerung
- Nutzungshinweise
- Kontaktinformationen

## Module

### cmif-parser.js

Browser-basierter CMIF-Parser mit TEI-Namespace-Handling:

```javascript
// Oeffentliche API
export async function parseCMIF(source) {
  // source: File, URL oder String
  const xml = await loadXML(source);
  const letters = extractLetters(xml);
  const indices = buildIndices(letters);
  const meta = extractMeta(xml, letters);
  return { letters, indices, meta };
}

export function enrichWithCoordinates(data, coordsCache) {
  // Reichert Orte mit Koordinaten aus Cache an
}
```

Authority-Erkennung:
```javascript
function parseAuthorityRef(url) {
  if (url.includes('viaf.org')) return { type: 'viaf', id: '...' };
  if (url.includes('d-nb.info/gnd')) return { type: 'gnd', id: '...' };
  if (url.includes('geonames.org')) return { type: 'geonames', id: '...' };
  if (url.includes('lexvo.org')) return { type: 'lexvo', id: '...' };
  return { type: 'unknown', id: url };
}
```

### correspsearch-api.js

Integration der correspSearch API v2.0:

```javascript
// Oeffentliche API
export function isCorrespSearchUrl(url) { ... }
export async function searchCorrespSearch(params, onProgress) { ... }
export async function fetchFromCorrespSearchUrl(url, onProgress) { ... }
export async function getResultCount(params) { ... }

// Parameter
// - correspondent: GND/VIAF URI
// - placeSender: GeoNames URI
// - startdate/enddate: YYYY-MM-DD
```

Features:
- Automatische Paginierung (10 pro Seite)
- TEI-JSON zu internem Format Transformation
- Ergebnis-Vorschau mit Gesamtanzahl
- Retry-Logik bei Netzwerkfehlern

### upload.js

Handler fuer die Landing-Page:

```javascript
// Event-Handler
function handleFileSelect(e) { ... }
function handleDragDrop(e) { ... }
function handleUrlSubmit() { ... }
function handleDatasetSelect(card) { ... }
function handleCorrespSearchSubmit() { ... }

// Datenverarbeitung
async function processFile(file) {
  const data = await parseCMIF(file);
  await processData(data, sourceInfo);
}

async function processData(data, sourceInfo) {
  // Koordinaten anreichern (falls Cache vorhanden)
  enrichWithCoordinates(data, coordsCache);

  // Speichern
  try {
    sessionStorage.setItem('cmif-data', JSON.stringify(data));
    window.location.href = 'explore.html';
  } catch (e) {
    // Quota exceeded - zu gross fuer sessionStorage
    showError('Datensatz zu gross...');
  }
}
```

### explore.js

Visualisierungs-Logik:

```javascript
// Initialisierung
async function init() {
  const data = await loadData();  // URL-Parameter oder sessionStorage
  initMap();
  initFilters();
  initViewSwitcher();
  initPersonsView();
  initLettersView();
  initExport();
}

// Datenladung
async function loadData() {
  const dataset = new URLSearchParams(location.search).get('dataset');

  if (dataset === 'hsa') {
    // Vorprozessierte Daten direkt laden
    return await fetch('data/hsa-letters.json').then(r => r.json());
  }

  // Aus sessionStorage
  return JSON.parse(sessionStorage.getItem('cmif-data'));
}

// View-Switching
function switchView(view) {
  // 'map', 'persons', 'letters'
  updateButtons(view);
  showViewContent(view);
  renderViewContent(view);
}

// Export
function exportData(format) {
  // 'csv' oder 'json'
  const data = prepareExportData(filteredLetters);
  downloadFile(content, filename, mimeType);
}
```

## Datenfluss

### 1. HSA (Vorprozessiert)

```
CMIF.xml (data/hsa/)
    │
    v
build_hsa_data.py ──────────────────┐
    │                               │
    v                               v
hsa-letters.json            geonames_coordinates.json
    │                               │
    v                               v
explore.html?dataset=hsa    (Koordinaten-Cache)
    │
    v
explore.js (fetch + visualize)
```

### 2. Upload (Browser-Parsing)

```
User Upload (File/URL)
    │
    v
upload.js
    │
    v
cmif-parser.js (DOMParser)
    │
    v
sessionStorage (JSON)
    │
    v
explore.html
    │
    v
explore.js (load + visualize)
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
  "languages": {
    "es": {
      "code": "es",
      "label": "Spanisch",
      "letter_count": 708
    }
  },
  "subjects": {
    "S.4567": {
      "label": "Baskisch",
      "uri": "...",
      "category": "lexvo",
      "letter_count": 698
    }
  }
}
```

### Meta

```json
{
  "title": "Hugo Schuchardt Korrespondenz",
  "publisher": "Universitaet Graz",
  "total_letters": 11576,
  "unique_senders": 846,
  "unique_recipients": 112,
  "unique_places": 774,
  "date_range": {
    "min": 1859,
    "max": 1927
  },
  "generated": "2025-11-26T..."
}
```

## UI-Komponenten

### Kartenansicht

- MapLibre GL JS 4.x
- CartoDB Basemap (Light/Dark Toggle)
- GeoJSON-Clustering mit Aggregation
- Popup mit Orts-Statistiken

### Korrespondenten-Liste

- Suche nach Name
- Sortierung: Briefanzahl, Name (A-Z/Z-A)
- Avatar mit Initialen
- Statistik: Gesendet/Empfangen

### Brief-Liste

- Suche nach Sender, Empfaenger, Ort
- Sortierung: Datum, Absender
- Link zur Quelle (falls URL vorhanden)
- Limit: 500 Briefe (Performance)

### Filter

- noUiSlider fuer Zeitraum
- Checkboxen fuer Sprachen (Top 10)
- Reset-Button

### Export-Modal

- CSV-Format (Tabellenstruktur)
- JSON-Format (Strukturierte Daten)
- Zeigt Anzahl der exportierten Briefe

## CSS-Struktur

```
css/
  tokens.css      - Design-Tokens (Farben, Spacing, Fonts)
  components.css  - Wiederverwendbare Komponenten
  style.css       - Haupt-Styles (Navbar, Sidebar, Map)
  upload.css      - Upload-Zone, Dataset-Cards
  explore.css     - Listen, Modal, View-Switching
```

## Performance-Strategien

1. Lazy Rendering: Listen nur rendern wenn View aktiv
2. Debouncing: Filter-Updates mit 300ms Verzoegerung
3. Clustering: MapLibre-Cluster fuer 1000+ Punkte
4. Limit: Brief-Liste auf 500 Eintraege begrenzt
5. Index-Lookups: O(1) Zugriff auf Personen/Orte

## Limits und Einschraenkungen

| Aspekt | Limit | Begruendung |
|--------|-------|-------------|
| sessionStorage | ~5MB | Browser-Limit |
| Brief-Liste | 500 | DOM-Performance |
| Sprach-Filter | 10 | UI-Uebersichtlichkeit |
| CMIF-Upload | ~50MB | Browser-Parsing |

## Browser-Kompatibilitaet

Getestet mit:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

Erforderlich:
- ES6 Module Support
- DOMParser API
- sessionStorage
- Fetch API
