# JavaScript Architecture

Kompakte Definition aller JavaScript-Module und ihrer Funktionen.

## Files Overview

```
js/
├── data.js            # Shared data module (55 lines)
├── app.js             # Map view (808 lines)
├── person.js          # Person detail page (418 lines)
├── stats.js           # Statistics dashboard (590 lines)
├── search.js          # Global search (183 lines)
└── navbar-loader.js   # Component loader (34 lines)
```

Total: 2.088 lines JavaScript

---

## data.js (Shared Data Module)

Zentrale Datenverwaltung mit In-Memory-Caching.

### loadPersons()
```javascript
async function loadPersons() -> {meta: Object, persons: Array}
```

Lädt persons.json vom Server. Cached Ergebnis in-memory.

Rückgabe:
```javascript
{
    meta: {
        source: "SNDB + CMIF",
        total_women: 448,
        with_geodata: 227,
        letters_total: 15312
    },
    persons: [
        {
            id: "Q123456",           // Wikidata ID
            name: "Anna Amalia",     // Name
            role: "sender",          // sender | mentioned | indirect
            normierung: "gnd",       // gnd | sndb | none
            gnd: "118502573",        // GND-ID (optional)
            dates: "1739–1807",      // Lebensdaten (optional)
            places: [],              // Orte mit lat/lon
            occupations: [],         // Berufe
            briefe: {}               // Brief-Statistik
        }
    ]
}
```

Verwendung:
```javascript
import { loadPersons } from './data.js';

const data = await loadPersons();
console.log(data.persons.length); // 448
```

Caching-Strategie:
- 1. Aufruf: Fetch von data/persons.json
- Weitere Aufrufe: Return cached data
- Browser HTTP-Cache funktioniert automatisch

### getPersonById(persons, id)
```javascript
function getPersonById(persons, id) -> Object | undefined
```

Findet Person nach ID.

Parameter:
- `persons` - Array von Person-Objekten
- `id` - Wikidata ID (z.B. "Q123456")

Rückgabe: Person-Objekt oder undefined

Verwendung:
```javascript
import { getPersonById } from './data.js';

const person = getPersonById(allPersons, "Q123456");
if (person) {
    console.log(person.name);
}
```

### clearCache()
```javascript
function clearCache() -> void
```

Löscht gecachte Daten. Nützlich für Tests oder manuelles Reload.

Verwendung:
```javascript
import { clearCache } from './data.js';

clearCache();
const freshData = await loadPersons(); // Fetch erneut
```

---

## app.js (Map View)

Interaktive Karte mit MapLibre GL JS und Filter-Sidebar.

### Globale Variablen
```javascript
let map                 // MapLibre-Instanz
let allPersons          // Alle 448 Personen (mit occupation_group)
let filteredPersons     // Gefilterte Personen (aktuell sichtbar)
let temporalFilter      // { start: Jahr, end: Jahr }
let clusterTooltip      // Cluster-Tooltip-Element
let markerTooltip       // Marker-Tooltip-Element
```

### Konstanten

**ROLE_COLORS** - Farben für Rollen (matching tokens.css)
```javascript
{
    'sender': '#2c5f8d',      // Steel Blue
    'mentioned': '#6c757d',   // Medium Gray
    'both': '#2d6a4f',        // Forest Green
    'indirect': '#adb5bd'     // Light Gray
}
```

**OCCUPATION_GROUPS** - Berufs-Kategorien
```javascript
{
    'artistic': [...],   // Schauspielerin, Malerin, ...
    'literary': [...],   // Schriftstellerin, Übersetzerin, ...
    'musical': [...],    // Sängerin, Pianistin, ...
    'court': [...],      // Hofdame, Fürstin, ...
    'education': [...]   // Erzieherin, Lehrerin, ...
}
```

### Hauptfunktionen

**init()** - Initialisiert Anwendung
```javascript
async function init()
```

Ablauf:
1. Navbar laden
2. Daten laden (loadPersons)
3. occupation_group hinzufügen
4. Karte initialisieren (MapLibre)
5. Filter initialisieren
6. Search initialisieren

**getOccupationGroup(person)** - Klassifiziert Beruf
```javascript
function getOccupationGroup(person) -> string
```

Rückgabe: 'artistic' | 'literary' | 'musical' | 'court' | 'education' | 'other' | 'none'

**initMap()** - MapLibre GL JS Setup
```javascript
function initMap()
```

Konfiguration:
- Center: Weimar [11.3235, 50.9795]
- Zoom: 5
- Tiles: OpenStreetMap
- Controls: Navigation (top-right)

**renderMarkers(persons)** - Rendert GeoJSON-Punkte
```javascript
function renderMarkers(persons)
```

Erstellt MapLibre Source + Layer:
- Clustering aktiviert (radius: 50px)
- Farbe basierend auf überwiegender Rolle
- Click-Events für Cluster und Marker

**initFilters()** - Filter-Event-Listener
```javascript
function initFilters()
```

Filter-Typen:
- Role: sender | mentioned | indirect (Checkboxen)
- Occupation Groups: 7 Kategorien (Checkboxen)
- Temporal: 1762-1824 (noUiSlider dual-handle)

**applyFilters()** - Wendet aktive Filter an
```javascript
function applyFilters()
```

Logik:
1. Start mit allPersons
2. Role-Filter (wenn aktiv)
3. Occupation-Filter (wenn aktiv)
4. Temporal-Filter (wenn aktiv)
5. Update filteredPersons
6. Re-render Karte

**personsToGeoJSON(persons)** - Konvertiert zu GeoJSON
```javascript
function personsToGeoJSON(persons) -> FeatureCollection
```

Format:
```javascript
{
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: { id, name, role, ... }
        }
    ]
}
```

### Event Handlers

**onClusterClick** - Cluster aufzoomen
```javascript
map.on('click', 'clusters', (e) => { ... })
```

Zoomt auf Cluster-Bounding-Box.

**onMarkerClick** - Person-Popup öffnen
```javascript
map.on('click', 'persons', (e) => { ... })
```

Zeigt Multi-Person-Popup (bei gleichen Koordinaten).

**onMouseEnter/Leave** - Tooltips
```javascript
map.on('mouseenter', 'clusters', (e) => { ... })
map.on('mouseleave', 'clusters', (e) => { ... })
```

Zeigt Cluster-Count oder Person-Name.

### Helper Functions

**getDominantRole(persons)** - Häufigste Rolle im Cluster
```javascript
function getDominantRole(persons) -> string
```

**updateStats(meta)** - Navbar-Statistik
```javascript
function updateStats(meta)
```

**showError(message)** - Error-Overlay
```javascript
function showError(message)
```

**hideLoading()** - Loading-Overlay ausblenden
```javascript
function hideLoading()
```

---

## person.js (Person Detail Page)

Zeigt detaillierte Informationen einer einzelnen Person (Card-Layout).

### Globale Variablen
```javascript
let currentPerson       // Aktuelle Person
let allPersons          // Alle Personen (für Search)
let miniMap             // MapLibre-Instanz (Mini-Karte)
```

### Hauptfunktionen

**init()** - Initialisiert Personenseite
```javascript
async function init()
```

Ablauf:
1. Navbar laden (simple)
2. Person-ID aus URL extrahieren
3. Daten laden (loadPersons)
4. Person finden (getPersonById)
5. Seite rendern
6. Search initialisieren

**renderPerson()** - Rendert alle Cards
```javascript
function renderPerson()
```

Ruft auf:
- renderHeader()
- renderOverview()
- renderLetters()
- renderPlaces()
- renderOccupations()
- renderSources()

**renderHeader()** - Name, Daten, Badges
```javascript
function renderHeader()
```

Elemente:
- #person-name: Name
- #person-dates: Lebensdaten
- #person-badges: Role-Badge, GND/SNDB-Links

**renderOverview()** - Biography Card
```javascript
function renderOverview()
```

Zeigt SNDB Regestausgabe (biography field).

**renderLetters()** - Correspondence Card
```javascript
function renderLetters()
```

Statistik:
- Gesamt: briefe.gesamt
- Als Absenderin: briefe.als_absenderin
- Erwähnt: briefe.erwähnt

Visuelle Indikatoren (Progress Bars).

**renderPlaces()** - Locations Card
```javascript
function renderPlaces()
```

Liste von Orten + Mini-Karte (MapLibre).

Mini-Karte-Konfiguration:
- Height: 300px
- Alle Orte als Marker
- Fit Bounds auf alle Punkte

**renderOccupations()** - Occupations Card
```javascript
function renderOccupations()
```

Liste von Berufen mit SNDB-Links.

**renderSources()** - Data Quality + Citation
```javascript
function renderSources()
```

Data Quality Icons:
- ✓ (green): Vorhanden
- ✗ (red): Nicht vorhanden
- i (blue): Info

Citation Box:
- Zitiervorschlag
- Copy-Button (Clipboard API)

### Helper Functions

**showError(message)** - Error anzeigen
```javascript
function showError(message)
```

**showNotFound()** - 404 anzeigen
```javascript
function showNotFound()
```

**hideLoading()** - Loading ausblenden
```javascript
function hideLoading()
```

**copyToClipboard()** - Text in Clipboard
```javascript
async function copyToClipboard()
```

---

## stats.js (Statistics Dashboard)

Rendert 5 interaktive Charts mit Apache ECharts.

### Globale Variablen
```javascript
let allPersons          // Alle Personen
let charts              // { occupations, timeline, places, cohorts, activity }
```

### Hauptfunktionen

**init()** - Initialisiert Dashboard
```javascript
async function init()
```

Ablauf:
1. Navbar laden
2. Active Link highlighten
3. Daten laden (loadPersons)
4. Charts initialisieren
5. Export-Buttons initialisieren

**initCharts()** - Alle 5 Charts rendern
```javascript
function initCharts()
```

Ruft auf:
- renderOccupationsChart()
- renderTimelineChart()
- renderPlacesChart()
- renderCohortsChart()
- renderActivityChart()

### Chart-Funktionen

**renderOccupationsChart()** - Berufsverteilung
```javascript
function renderOccupationsChart()
```

Typ: Horizontal Bar Chart
Daten: Top 15 Berufe
Count: 207/448 Personen mit Berufsdaten (46%)

ECharts-Konfiguration:
- xAxis: value (Anzahl)
- yAxis: category (Berufsname)
- series: bar, itemStyle: --color-secondary
- labels: inside bars (white text)

**renderTimelineChart()** - Brief-Timeline
```javascript
function renderTimelineChart()
```

Typ: Line Chart
Daten: 1772-1824, jährliche Aggregation
Series: Briefsender (Steel Blue) + Erwähnte (Medium Gray)

ECharts-Konfiguration:
- xAxis: category (Jahre)
- yAxis: value (Anzahl)
- series: 2 Lines (als_absenderin, erwähnt)
- smooth: true

**renderPlacesChart()** - Geografische Zentren
```javascript
function renderPlacesChart()
```

Typ: Horizontal Bar Chart
Daten: Top 10 Orte
Count: 227/448 Personen mit Koordinaten (50.7%)

Weimar: 83 Personen (37% aller mit Geodata)

**renderCohortsChart()** - Generationen
```javascript
function renderCohortsChart()
```

Typ: Vertical Bar Chart
Daten: Geburtsjahrzehnte (1700-1809)
Count: 213/448 Personen mit Geburtsjahr (48%)

Fokus: 1750-1790 (Goethe-Ära) = 279 Personen (62%)

**renderActivityChart()** - Briefaktivität
```javascript
function renderActivityChart()
```

Typ: Pie Chart
Kategorien:
- Viel (>10 Briefe)
- Mittel (5-10 Briefe)
- Wenig (1-4 Briefe)
- Nur erwähnt (0 Briefe, aber in CMIF)
- Nur SNDB (keine Briefe, nur biographischer Nachweis)

Transparency: 218/448 (49%) nur indirekte Evidenz

### Export-Funktionen

**initExportButtons()** - Event-Listener für Export
```javascript
function initExportButtons()
```

Buttons:
- data-export="chartId"
- data-format="csv" | "png"

**exportCSV(chartId)** - CSV-Export
```javascript
async function exportCSV(chartId)
```

Format:
- Header-Zeile
- Datenzeilen
- Download via Blob + createObjectURL

**exportPNG(chartId)** - PNG-Export
```javascript
function exportPNG(chartId)
```

Technik:
- echarts.getDataURL({ pixelRatio: 2 })
- Download via <a> tag mit download-Attribut

### Helper Functions

**highlightActiveNavLink()** - Stats-Link hervorheben
```javascript
function highlightActiveNavLink()
```

**showError(message)** - Error anzeigen
```javascript
function showError(message)
```

---

## search.js (Global Search)

Typeahead-Suche über alle Personen (Navbar).

### Klasse: GlobalSearch

**constructor(persons)**
```javascript
new GlobalSearch(persons)
```

Initialisiert Suche:
- Speichert persons-Array
- Bindet Event-Listener (input, keydown, blur)
- Initialisiert result-Container

**handleInput(event)** - Input-Event
```javascript
handleInput(event)
```

Ablauf:
1. Query extrahieren (trimmed, lowercase)
2. Wenn < 2 Zeichen: Hide results
3. Sonst: Search + Show results

**search(query)** - Suche durchführen
```javascript
search(query) -> Array
```

Logik:
- Filter: name.toLowerCase().includes(query)
- Oder: dates.includes(query)
- Oder: occupations.some(occ => occ.name.includes(query))
- Limit: 10 Ergebnisse

**renderResults(results, query)** - Results rendern
```javascript
renderResults(results, query)
```

Erstellt:
- .search-result-item für jede Person
- Highlighted query (HTML <mark>)
- Metadaten: Dates + first occupation

**highlightMatch(text, query)** - Query highlighten
```javascript
highlightMatch(text, query) -> string
```

Wrapped matched text in <mark> tag.

**handleKeyDown(event)** - Keyboard-Navigation
```javascript
handleKeyDown(event)
```

Keys:
- ArrowDown: Nächstes Result
- ArrowUp: Vorheriges Result
- Enter: Selected result öffnen
- Escape: Results schließen

**selectResult(index)** - Result auswählen
```javascript
selectResult(index)
```

Navigiert zu person.html?id={personId}

**hideResults()** - Dropdown schließen
```javascript
hideResults()
```

---

## navbar-loader.js (Component Loader)

Lädt Navbar-HTML asynchron.

### loadNavbar(type)
```javascript
async function loadNavbar(type = 'full') -> void
```

Parameter:
- `type`: 'full' (navbar.html) | 'simple' (navbar-simple.html)

Ablauf:
1. Fetch components/navbar.html
2. Inject in #navbar-container
3. Return

Verwendung:
```javascript
import { loadNavbar } from './navbar-loader.js';

await loadNavbar();        // Full navbar
await loadNavbar('simple'); // Simple navbar
```

---

## Data Flow

```
User opens page
    ↓
init()
    ↓
loadPersons() (data.js)
    ↓
    ├─ Cache hit? → Return cached data
    └─ Cache miss → Fetch persons.json → Cache → Return
    ↓
Process data (add occupation_group, etc.)
    ↓
Render UI (Map/Cards/Charts)
    ↓
Initialize Search (GlobalSearch)
    ↓
User interaction (Filter/Search/Click)
    ↓
Update UI
```

---

## Browser Compatibility

ES6 Modules:
- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

APIs verwendet:
- Fetch API
- URL API (URLSearchParams)
- Clipboard API (person.js)
- ES6 Features (async/await, arrow functions, destructuring)

---

## Performance

**Initial Load:**
- persons.json: 447 KB (ungzipped), ~100 KB (gzipped)
- Time to Interactive: <3s (3G)

**Memory:**
- allPersons: ~450 KB in-memory
- Browser cache: persons.json cached (HTTP headers)

**Re-renders:**
- Map filter update: <100ms
- Chart resize: <50ms
- Search results: <50ms

---

## Testing Strategy

Manuell:
- Browser DevTools Console
- Network tab (Cache-Hits prüfen)
- Console.log für Debug

Zukünftig (optional):
- Vitest für Unit Tests
- Playwright für E2E Tests

---

## Extension Points

### SPARQL-Integration

In data.js erweitern:

```javascript
export async function loadPersons(source = 'json') {
    if (cachedData) return cachedData;

    let data;

    if (source === 'sparql') {
        data = await fetchFromSPARQL();
    } else {
        const response = await fetch('data/persons.json');
        data = await response.json();
    }

    cachedData = data;
    return data;
}

async function fetchFromSPARQL() {
    const response = await fetch('https://endpoint.org/sparql', {
        method: 'POST',
        headers: { 'Accept': 'application/sparql-results+json' },
        body: SPARQL_QUERY
    });

    const sparqlResult = await response.json();
    return transformSPARQL(sparqlResult);
}
```

### API-Integration

Analog zu SPARQL: `source = 'api'` mit fetch zu REST-Endpoint.

---

## Code Style

Conventions:
- 4 spaces Indentation
- camelCase für Variablen/Funktionen
- PascalCase für Klassen (GlobalSearch)
- const für Konstanten (ROLE_COLORS)
- let für Variablen (nie var)
- async/await statt Promises.then()
- Arrow Functions bevorzugt
- Template Strings für Strings mit Variablen
- JSDoc-Kommentare für Public Functions (optional)

Naming:
- init() - Hauptinitialisierung
- render*() - Rendering-Funktionen
- handle*() - Event-Handler
- show*()/hide*() - UI-Toggle
- get*() - Getter
- apply*() - Filter/Transformation

---

## Debugging

Console-Ausgaben:
- 🟢 INIT: Initialisierung
- 🔵 RENDER: Rendering
- 🟡 EVENT: Events
- 🟠 CLICK: Clicks
- 🔴 ERROR: Fehler
- 📦 Cache-Hit
- 🔄 Fetching
- ✅ Success
- 🔍 Search initialized
- 📊 Stats

Browser DevTools:
- Console: Alle Logs
- Network: persons.json (Cache-Status)
- Application: Local Storage (leer, kein Persistence)

---

## Dependencies

External Libraries (CDN):
- MapLibre GL JS 4.7.1 (Map rendering)
- Apache ECharts 5.5.0 (Charts)
- noUiSlider 15.7.1 (Temporal filter)

No Build Step:
- Native ES6 Modules
- No bundler (webpack/vite/rollup)
- No transpilation (Babel)
- No minification (development mode)

Future (optional):
- Vite for bundling
- Terser for minification
- TypeScript for type safety
