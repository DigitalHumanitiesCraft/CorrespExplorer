# Technical Architecture

Technische Implementierungsdetails der HerData-Webanwendung.

Stand: 2025-10-30

Siehe [INDEX.md](INDEX.md) für Navigation im Knowledge Vault und [decisions.md](decisions.md) für architektonische Entscheidungen (ADRs).

## Technology Stack

### Frontend
- MapLibre GL JS 4.7.1 (WebGL-basiertes Rendering)
- Vanilla JavaScript ES6+ (keine Frameworks)
- CSS Grid und Flexbox (responsive Layout)
- OpenStreetMap Raster-Tiles

### Data Pipeline
- Python 3.7+ (Standard Library only)
- XML ElementTree (TEI-CMIF und SNDB-Parsing)
- JSON-Output (1.49 MB optimiert)

### Deployment
- GitHub Pages (main branch, /docs Ordner)
- Live URL: https://chpollin.github.io/HerData/
- Keine Build-Tools erforderlich (statische Dateien)

## MapLibre GL JS Implementation

### Layer-Architektur

MapLibre GL JS verwendet drei Layer zur Darstellung:

1. Cluster-Kreise (persons-clusters)
2. Cluster-Zahlen (persons-cluster-count)
3. Individuelle Marker (persons-layer)

Siehe [app.js:230-305](../docs/js/app.js) für vollständige Layer-Konfiguration.

### Clustering-Konfiguration

```javascript
map.addSource('persons', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 10,      // Oberhalb Zoom 10: keine Cluster
    clusterRadius: 40,       // Pixel-Radius für Clustering
    clusterProperties: {
        // Nur letter-relevante Rollen (ADR-003)
        'sender_count': ['+', ['case', ['==', ['get', 'role'], 'sender'], 1, 0]],
        'mentioned_count': ['+', ['case', ['==', ['get', 'role'], 'mentioned'], 1, 0]],
        'both_count': ['+', ['case', ['==', ['get', 'role'], 'both'], 1, 0]]
        // indirect_count absichtlich weggelassen (kein Briefbezug)
    }
});
```

Siehe [data.md](data.md#kern-statistiken) für Datenmodell-Details.

### Cluster-Farbcodierung (ADR-003)

Cluster-Farben visualisieren die Zusammensetzung nach Briefaktivität:

```javascript
'circle-color': [
    'case',
    // >50% haben geschrieben (sender + both) -> Steel Blue
    ['>', ['+', ['get', 'sender_count'], ['get', 'both_count']],
          ['*', ['get', 'point_count'], 0.5]],
    '#2c5f8d',

    // >50% nur erwähnt -> Medium Gray
    ['>', ['get', 'mentioned_count'], ['*', ['get', 'point_count'], 0.5]],
    '#6c757d',

    // Gemischt (keine Mehrheit) -> Forest Green
    '#2d6a4f'
]
```

Rationale: Cluster ohne Briefverbindung (indirect_count) erhalten keine Farbcodierung, da sie für die Korrespondenz-Forschung nicht relevant sind (siehe [decisions.md ADR-003](decisions.md#adr-003-cluster-color-encoding-for-research-interface)).

### Data-Driven Styling

Individuelle Marker verwenden match-Expressions:

```javascript
'circle-color': [
    'match',
    ['get', 'role'],
    'sender', '#2c5f8d',      // Steel Blue
    'mentioned', '#6c757d',   // Medium Gray
    'both', '#2d6a4f',        // Forest Green
    'indirect', '#adb5bd',    // Light Gray
    '#adb5bd'                 // Fallback
]
```

Zoom-responsive Radiusse via interpolate:

```javascript
'circle-radius': [
    'interpolate',
    ['linear'],
    ['zoom'],
    5, 6,    // Bei Zoom 5: 6px Radius
    10, 10,  // Bei Zoom 10: 10px Radius
    15, 16   // Bei Zoom 15: 16px Radius
]
```

## State Management

### Globale Variablen

Die Anwendung nutzt einfaches globales State Management:

```javascript
let map;                    // MapLibre-Instanz
let allPersons = [];        // Alle Personen (unveränderlich)
let filteredPersons = [];   // Gefilterte Personen (veränderlich)

let clusterTooltip = null;  // Hover-Tooltip für Cluster
let markerTooltip = null;   // Hover-Tooltip für Marker
let handlersSetup = false;  // Event-Handler-Status
```

Rationale: Für die MVP-Komplexität ausreichend. Phase 2 könnte State-Management-Library (Zustand, Redux) benötigen.

### Datenfluss

```
1. Initiale Datenladung:
   fetch(persons.json) → allPersons → filteredPersons

2. Filter-Änderung:
   filterPersons() → filteredPersons → renderMarkers()

3. Marker-Rendering:
   renderMarkers() → personsToGeoJSON() → map.getSource('persons').setData()
```

Wichtig: setData() statt Layer-Recreation (Grund: Event-Handler bleiben erhalten, Performance-Vorteil).

### Filter-Logik

Zwei unabhängige Filter kombiniert mit AND-Logik:

```javascript
function filterPersons() {
    // 1. Briefaktivität-Filter (Checkboxen)
    const activeRoles = getSelectedRoles();

    // 2. Berufsgruppen-Filter (Checkboxen)
    const activeGroups = getSelectedOccupationGroups();

    // AND-Verknüpfung
    filteredPersons = allPersons.filter(person => {
        const roleMatch = activeRoles.includes(person.role);
        const groupMatch = activeGroups.includes(person.occupation_group);
        return roleMatch && groupMatch;
    });

    renderMarkers(filteredPersons);
}
```

Performance: Filter-Update <50ms für 3.617 Personen (Ziel: <100ms erfüllt).

## Event Handler Architecture

### Setup-Pattern

Event-Handler werden nur einmal registriert (handlersSetup-Flag):

```javascript
if (!handlersSetup) {
    setupEventHandlers();
    handlersSetup = true;
}
```

Grund: Bei setData()-Updates bleiben Layer erhalten, wiederholte Handler-Registrierung würde zu Duplikaten führen.

### Click-Handler Hierarchie

1. Individuelle Marker (persons-layer): queryRenderedFeatures()
   - 1 Feature: Single-Person Popup
   - >1 Feature: Multi-Person Popup (gleiche Koordinaten)

2. Cluster (persons-clusters):
   - ≤50 Personen: Multi-Person Popup (ADR-002)
   - >50 Personen: Zoom-Aktion (easeTo)

Siehe [app.js:308-400](../docs/js/app.js) für vollständige Implementierung.

### Hover-Tooltips

Cluster-Tooltips zeigen Zusammensetzung:

```javascript
map.on('mouseenter', 'persons-clusters', (e) => {
    const props = e.features[0].properties;
    const senderCount = (props.sender_count || 0) + (props.both_count || 0);
    const mentionedCount = (props.mentioned_count || 0) + (props.both_count || 0);

    // HTML-Tooltip mit Breakdown
    const html = `
        <div class="hover-tooltip">
            <strong>${pointCount} Frauen</strong><br>
            <small>${senderCount} geschrieben • ${mentionedCount} erwähnt</small>
        </div>
    `;

    clusterTooltip = new maplibregl.Popup({...}).setHTML(html).addTo(map);
});
```

Cleanup bei mouseleave:

```javascript
map.on('mouseleave', 'persons-clusters', () => {
    if (clusterTooltip) {
        clusterTooltip.remove();
        clusterTooltip = null;
    }
});
```

## Data Transformation Pipeline

### JSON zu GeoJSON

persons.json wird zu MapLibre-kompatiblem GeoJSON transformiert:

```javascript
function personsToGeoJSON(persons) {
    const features = persons
        .filter(person => person.places && person.places.length > 0)
        .map(person => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [person.places[0].lon, person.places[0].lat]
            },
            properties: {
                id: person.id,
                name: person.name,
                role: person.role,
                normierung: person.normierung,
                gnd: person.gnd || null,
                // ... weitere Felder
            }
        }));

    return {
        type: 'FeatureCollection',
        features: features
    };
}
```

Wichtig: Nur erste Place (Primary Location) wird verwendet (Wirkungsort > Geburtsort > Sterbeort).

### Occupation Group Classification

Bei Datenladung wird occupation_group hinzugefügt:

```javascript
const OCCUPATION_GROUPS = {
    'artistic': ['Schauspielerin', 'Malerin', 'Tänzerin', ...],
    'literary': ['Schriftstellerin', 'Übersetzerin', 'Dichterin'],
    'musical': ['Sängerin', 'Pianistin', 'Komponistin', ...],
    'court': ['Hofdame', 'Oberhofmeisterin', 'Stiftsdame', ...],
    'education': ['Erzieherin', 'Pädagogin', 'Lehrerin']
};

function getOccupationGroup(person) {
    if (!person.occupations || person.occupations.length === 0) {
        return 'none';
    }

    for (const occ of person.occupations) {
        for (const [group, occupations] of Object.entries(OCCUPATION_GROUPS)) {
            if (occupations.includes(occ.name)) {
                return group;
            }
        }
    }

    return 'other';  // Beruf vorhanden, aber nicht klassifiziert
}
```

Angewandt beim Laden:

```javascript
allPersons = data.persons.map(person => ({
    ...person,
    occupation_group: getOccupationGroup(person)
}));
```

## Person Detail Page Architecture

### URL-basiertes Routing

Person-Detail-Seiten via URL-Parameter:

```
person.html?id=35267
```

Parsing:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const personId = urlParams.get('id');
```

### Tab-basierte UI

6 Tabs mit lazy content rendering:

1. Überblick (default aktiv)
2. Korrespondenz (Brief-Aktivität)
3. Orte (Geodaten)
4. Berufe (Occupations)
5. Netz (AGRELON-Beziehungen, aktuell Platzhalter)
6. Quellen (GND, SNDB, Zitation)

Tab-Wechsel via Event Delegation:

```javascript
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add to clicked
        button.classList.add('active');
        const targetId = button.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');

        // Trigger map resize if Orte tab
        if (targetId === 'tab-orte' && personMiniMap) {
            personMiniMap.resize();
        }
    });
});
```

### Mini-Map Implementation

Kleinere Karte auf Person-Detail-Seite (Orte-Tab):

```javascript
personMiniMap = new maplibregl.Map({
    container: 'person-mini-map',
    style: { /* ... gleiche Config wie Haupt-Karte */ },
    center: [firstPlace.lon, firstPlace.lat],
    zoom: 10
});

// Marker für Person-Orte
person.places.forEach(place => {
    new maplibregl.Marker({color: ROLE_COLORS[person.role]})
        .setLngLat([place.lon, place.lat])
        .setPopup(new maplibregl.Popup().setHTML(`
            <strong>${place.name}</strong><br>
            <small>${place.type}</small>
        `))
        .addTo(personMiniMap);
});
```

Wichtig: personMiniMap.resize() nach Tab-Wechsel (sonst graue Tiles).

## List Pages Architecture

### People List Page

Dedicated page listing all 448 women with search and sort capabilities:

```
people.html + people.js + list.css
```

Features:

- Search by name (case-insensitive filtering)
- Sort by: Name (A-Z), Letter count (descending), Birth year (ascending)
- Grid layout with responsive cards
- Shows: name, dates, occupation, location, letter count
- Direct links to person detail pages

Implementation:

```javascript
const data = await loadPersons();
allPersons = data.persons;
filteredPersons = [...allPersons];

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filteredPersons = allPersons.filter(person =>
        person.name.toLowerCase().includes(query)
    );
    sortAndRender();
});
```

### Places List Page

Dedicated page listing all 227 places with geodata:

```
places.html + places.js + list.css
```

Features:

- Search by place name
- Sort by: Name (A-Z), Person count (descending)
- Shows: coordinates, person count per place
- Expandable details with list of persons at each place
- Direct links to person detail pages

Data aggregation:

```javascript
const placesMap = new Map();
allPersons.forEach(person => {
    if (person.places) {
        person.places.forEach(place => {
            const key = place.name;
            if (!placesMap.has(key)) {
                placesMap.set(key, {
                    name: place.name,
                    lat: place.lat,
                    lon: place.lon,
                    count: 0,
                    persons: []
                });
            }
            placesMap.get(key).count++;
            placesMap.get(key).persons.push({id: person.id, name: person.name});
        });
    }
});
allPlaces = Array.from(placesMap.values());
```

### Shared Styling

Both list pages use list.css with consistent design patterns:

```css
.list-content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--space-lg);
}

.list-item {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: var(--space-lg);
    transition: all 0.2s ease;
}

.list-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--color-primary);
}
```

Responsive behavior: Auto-fill grid collapses to single column on mobile.

### Navigation Integration

List pages accessible via clickable stat cards in sidebar:

```html
<a href="people.html" class="stat-card stat-card-clickable">
    <div class="stat-value">448</div>
    <div class="stat-label">Frauen</div>
</a>
```

Design decision: Dedicated pages preferred over modals for better UX and navigation.

## Download Page Architecture

### Export Formats

download.html provides multiple export formats:

1. JSON (full dataset with all fields)
2. CSV (flat table, 15 columns for Excel/R/SPSS)
3. Excel (planned)
4. Vault ZIP (all knowledge documentation)

CSV structure:

```
id, name, gnd, birth_year, death_year, letter_count, mention_count,
roles, primary_place, place_lat, place_lon, primary_occupation,
sndb_url, has_biography, has_relations
```

### Vault ZIP Generation

Client-side ZIP creation using JSZip library:

```javascript
async function generateVaultZip() {
    const JSZip = window.JSZip || await loadJSZip();
    const zip = new JSZip();
    const knowledgeFolder = zip.folder('herdata-vault');

    const docs = ['data.md', 'technical-architecture.md', ...];

    for (const doc of docs) {
        const response = await fetch(`../knowledge/${doc}`);
        if (response.ok) {
            const content = await response.text();
            knowledgeFolder.file(doc, content);
        }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'herdata-vault.zip';
    a.click();
    URL.revokeObjectURL(url);
}
```

## Shared Data Module

### Data Loading API

Centralized data loading with in-memory cache:

```javascript
// data.js
let cachedData = null;

export async function loadPersons() {
    if (cachedData) {
        console.log('Using cached persons data');
        return cachedData;
    }

    const response = await fetch('data/persons.json');
    const data = await response.json();

    if (!data.meta || !Array.isArray(data.persons)) {
        throw new Error('Invalid data structure');
    }

    cachedData = data;
    return data;  // Returns {meta, persons}
}
```

Usage pattern:

```javascript
const data = await loadPersons();
const persons = data.persons;  // Extract array
const meta = data.meta;        // Extract metadata
```

### Component Loading

Shared navbar component loaded via navbar-loader.js:

```javascript
export async function loadNavbar() {
    const response = await fetch('components/navbar.html');
    const html = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = html;

    // Initialize global search after navbar loaded
    if (typeof GlobalSearch !== 'undefined') {
        new GlobalSearch();
    }
}
```

Design decision: All pages must use the full navbar template for consistency.

## Performance Optimization

### setData vs Layer Recreation

Bei Filter-Updates wird setData() statt removeLayer/addLayer verwendet:

```javascript
// ✓ Korrekt: setData() - schnell, erhält Layer und Handler
if (map.getSource('persons')) {
    map.getSource('persons').setData(geojson);
}

// ✗ Vermeiden: Layer neu erstellen - langsam, Handler gehen verloren
if (map.getLayer('persons-layer')) {
    map.removeLayer('persons-layer');
}
map.addLayer({...});
```

Performance-Gewinn: ~80% schneller bei Filter-Updates (gemessen: <50ms statt ~200ms).

### WebGL GPU Acceleration

MapLibre GL JS nutzt WebGL für Hardware-beschleunigtes Rendering:

- Alle Geometrien als GPU-Buffers
- Cluster-Berechnungen auf GPU
- Smooth Zoom-Transitions ohne JavaScript-Recalculation

Anforderung: WebGL-fähiger Browser (2011+ Standard).

### Clustering-Algorithmus

MapLibre's interner Supercluster-Algorithmus:

- Hierarchisches Clustering (zoom-abhängig)
- O(n log n) Performance
- clusterRadius: Pixel-basiert (konstant bei Zoom)
- clusterMaxZoom: Ab Zoom 11 keine Cluster mehr

Performance: 1.042 Marker rendern in <1s, keine Verzögerung beim Zoom.

## Browser Compatibility

### WebGL Requirements

Mindestanforderungen:

- WebGL 1.0 Support (2011+ Browsers)
- JavaScript ES6+ (const, let, arrow functions, template literals)
- CSS Custom Properties (--variable)

Nicht unterstützt:

- Internet Explorer 11 (kein WebGL 1.0)

## Debug Utilities

### Color-Coded Logging

Strukturiertes Logging via Utility-Objekt:

```javascript
const log = {
    init: (msg) => console.log(`🟢 INIT: ${msg}`),
    render: (msg) => console.log(`🔵 RENDER: ${msg}`),
    event: (msg) => console.log(`🟡 EVENT: ${msg}`),
    click: (msg) => console.log(`🟠 CLICK: ${msg}`),
    error: (msg) => console.error(`🔴 ERROR: ${msg}`)
};
```

Nutzung:

```javascript
log.init('Starting application');
log.render('Updating data: 1042 markers');
log.click('Cluster: 217 persons at Weimar');
```

Vorteil: Visuelles Filtern in Browser DevTools via Emoji-Farben.

### MapLibre Debug Mode

Aktivierung via Browser Console:

```javascript
map.showTileBoundaries = true;   // Tile-Grenzen anzeigen
map.showCollisionBoxes = true;   // Label-Kollisionsboxen
```

Für Cluster-Debugging:

```javascript
// Alle Features am Mauszeiger abfragen
map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point);
    console.table(features.map(f => f.properties));
});
```

## CSS Architecture

### Design Token System

CSS Custom Properties für konsistente Werte:

```css
:root {
    /* Color Palette (Siehe design.md) */
    --color-primary: #2c5f8d;     /* Steel Blue */
    --color-secondary: #6c757d;   /* Medium Gray */
    --color-accent: #2d6a4f;      /* Forest Green */
    --color-indirect: #adb5bd;    /* Light Gray */

    /* Typography */
    --font-body: 'Lora', Georgia, serif;
    --font-heading: 'Crimson Text', serif;

    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;

    /* Layout */
    --navbar-height: 60px;
    --sidebar-width: 320px;
}
```

### BEM Methodology

Informelle BEM-Konvention (Block-Element-Modifier):

```css
/* Block */
.person-popup { }

/* Element */
.person-popup__header { }
.person-popup__body { }

/* Modifier */
.person-popup--large { }
```

Nicht strikt durchgesetzt, aber als Leitlinie verwendet.

### Responsive Breakpoints

Mobile-First Approach:

```css
/* Mobile: 0-768px (default) */
.sidebar {
    width: 100%;
}

/* Tablet: 768px+ */
@media (min-width: 768px) {
    .sidebar {
        width: var(--sidebar-width);
    }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
    .container {
        max-width: 1200px;
    }
}
```

Siehe [design.md](design.md#responsive-breakpoints) für Designsystem-Details.

## Accessibility Considerations

### Current Implementation

Basis-Accessibility:

- Semantisches HTML5 (nav, main, section, article)
- Alt-Texte für Bilder (aktuell: keine Bilder im UI)
- WCAG AA Farbkontraste (Navy Blue #2c5f8d auf Weiß: 6.8:1)
- Keyboard-Navigation für Links und Buttons

### Missing Features

Noch nicht implementiert:

- ARIA-Labels für Karte und Marker
- Keyboard-Navigation für Karte (Tab zu Clustern/Markern)
- Screen-Reader-Support für Cluster-Zusammensetzung
- Focus-Styles für alle interaktiven Elemente
- Skip-Links für Navigation

Siehe Empfehlungen in VAULT_ANALYSIS.md für Accessibility-Audit-Plan.

## Error Handling

### Loading States

Initial Loading:

```javascript
const loading = document.getElementById('loading');
loading.textContent = 'Daten werden geladen...';

// Bei Erfolg
loading.textContent = `${data.meta.total_women} Frauen geladen`;
loading.style.background = '#d8f3dc';

// Bei Fehler
loading.textContent = 'Fehler beim Laden der Daten';
loading.style.background = '#f8d7da';
```

### Try-Catch Blöcke

Fehler-Handling in init():

```javascript
async function init() {
    try {
        await loadData();
        initMap();
        initFilters();
        log.init('Application ready');
    } catch (error) {
        showError('Initialisierung fehlgeschlagen: ' + error.message);
        log.error('Init failed: ' + error.message);
    }
}
```

### Validation

Datenstruktur-Validierung:

```javascript
if (!data.meta || !Array.isArray(data.persons)) {
    throw new Error('Ungültige Datenstruktur');
}
```

## Next Steps for Technical Documentation

### Phase 2 Implementation

Wenn Phase 2 startet, sollten folgende Abschnitte hinzugefügt werden:

1. Timeline View Implementation (D3.js oder Observable Plot)
2. Network Graph Architecture (Force-Graph oder Cytoscape.js)
3. Search Index Strategy (Client-Side vs Server-Side)
4. State Management Migration (bei Komplexitätszunahme)

### Testing Strategy

Formal testing nicht implementiert, aber empfohlen:

- Unit Tests für Utility-Funktionen (getOccupationGroup, personsToGeoJSON)
- Integration Tests für Filter-Pipeline
- E2E Tests für kritische User Journeys (Cypress, Playwright)
- Visual Regression Tests für UI-Komponenten

### Build Tooling

Aktuell keine Build-Tools, aber für Production empfohlen:

- Module Bundler (Webpack, Rollup, Vite)
- Minification (Terser für JS, cssnano für CSS)
- Source Maps für Debugging
- Tree Shaking für optimale Bundle-Größe

### Code Quality Tools

Empfohlene Tools für zukünftige Entwicklung:

- ESLint (Code-Linting)
- Prettier (Code-Formatierung)
- TypeScript (Type Safety)
- JSDoc (Function Documentation)

## Referenzen

Interne Dokumentation:

- [decisions.md](decisions.md) - ADR-001, ADR-002, ADR-003
- [design.md](design.md) - UI/UX-Design-System
- [data.md](data.md) - Datenmodell und Statistiken
- [wireframe.md](wireframe.md) - UI-Spezifikationen

Code-Dateien:

- [docs/js/app.js](../docs/js/app.js) - Haupt-Anwendungs-Logik (731 Zeilen)
- [docs/js/person.js](../docs/js/person.js) - Person-Detail-Seite (392 Zeilen)
- [docs/css/style.css](../docs/css/style.css) - Stylesheet (943 Zeilen)
- [docs/index.html](../docs/index.html) - Haupt-HTML
- [docs/person.html](../docs/person.html) - Person-Detail-HTML

Externe Dokumentation:

- MapLibre GL JS Docs: https://maplibre.org/maplibre-gl-js/docs/
- GeoJSON Specification: https://geojson.org/
- WebGL Fundamentals: https://webglfundamentals.org/
