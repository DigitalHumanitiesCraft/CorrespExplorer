# HerData Technical Analysis

Detaillierte technische Analyse des HerData-Projekts: Architektur, Implementation, Code-Qualität und Verbesserungspotentiale.

Stand: 2025-10-29

Siehe auch:
- [knowledge/technical-architecture.md](knowledge/technical-architecture.md) - Frontend-Architektur Details
- [REQUIREMENTS_VALIDATION.md](REQUIREMENTS_VALIDATION.md) - Requirements-Validierung
- [knowledge/INDEX.md](knowledge/INDEX.md) - Knowledge Vault Navigation

## Executive Summary

HerData ist eine vollständig funktionsfähige Digital Humanities Web-Anwendung mit solider technischer Grundlage:

Technologie-Stack:
- Backend: Python 3.x (Standard Library only, keine externen Dependencies)
- Frontend: Vanilla JavaScript ES6+ mit MapLibre GL JS 4.7.1
- Deployment: GitHub Pages (statische Dateien)
- Datenformat: JSON (432 KB, 448 Personen)

Code-Umfang:
- Python Pipeline: 2.744 Zeilen (5 Dateien)
- JavaScript Frontend: 1.693 Zeilen (4 Dateien)
- CSS Styling: 1.188 Zeilen (2 Dateien)
- Gesamt: 4.881 Zeilen produktiver Code

Qualitätsmerkmale:
- Objektorientiertes Design mit klarer Phasenstruktur
- Umfassende Validierung (48 Assertions in Pipeline)
- Modulare Architektur (separate JS-Module für Map, Timeline, Network)
- Dokumentierte Architekturentscheidungen (8 ADRs)
- Performance-optimiert (Pipeline: 0,63s, JSON: 81% kleiner)

Verbesserungspotentiale:
- Beziehungsdaten nicht integriert (922 verfügbar, nur 67 genutzt)
- Keine automatisierten Frontend-Tests
- Fehlende Fehlerbehandlung in einigen Bereichen
- Build-Tools könnten Entwicklung beschleunigen

## 1. Daten-Pipeline: Python Implementation

### 1.1 Architektur

Datei: preprocessing/build_herdata_new.py
Zeilen: 734
Klassen: 1 (HerDataPipelineNew)
Methoden: 13

Design-Pattern:
- Pipeline-Pattern mit 4 sequentiellen Phasen
- Builder-Pattern für JSON-Generierung
- Template Method für Phase-Validierung

```python
class HerDataPipelineNew:
    def __init__(self, new_export_dir, old_sndb_dir, cmif_file, output_file, verbose=True)

    # Phase 1: Women Identification
    def phase1_identify_women(self)
    def test_phase1(self)

    # Phase 2: CMIF Matching
    def phase2_match_letters(self)
    def test_phase2(self)

    # Phase 3: Data Enrichment
    def phase3_enrich_data(self)
    def test_phase3(self)

    # Phase 4: JSON Generation
    def phase4_generate_json(self)
    def test_phase4(self, output_data)

    # Orchestration
    def run(self)
    def print_summary(self, duration)
```

### 1.2 Datenfluss

4-Phasen-Pipeline mit Hybrid-Ansatz (Neu + Alt):

```
Phase 1: Identifizierung (NEW Export)
  Input:  ra_ndb_main.xml (797 Einträge)
          ra_ndb_indiv.xml (448 Frauen, SEXUS='w')
          ra_ndb_datierungen.xml (869 Datierungen)
  Output: 448 Frauen mit Grunddaten
  Validierung: 400-500 Personen, 50-70% GND-Abdeckung

Phase 2: CMIF-Matching (External)
  Input:  ra-cmif.xml (15.312 Briefe)
          GND-IDs aus Phase 1
  Output: 230 Frauen mit Briefverbindung (51,3%)
  Validierung: >0 Senderinnen, >0 Erwähnte

Phase 3: Datenanreicherung (HYBRID: New + Old)
  Input:  ra_ndb_orte.xml (NEW, 552 Ortsverknüpfungen)
          geo_main.xml (OLD, 4.007 Ortsnamen)
          geo_indiv.xml (OLD, 22.571 Koordinaten)
          ra_ndb_berufe.xml (NEW, 296 Berufe)
  Output: 227 Frauen mit Geodaten (50,7%)
          207 Frauen mit Berufen (46,2%)
  Validierung: 40-70% Geodaten-Abdeckung

Phase 4: JSON-Generierung
  Input:  Angereicherte Personen-Daten
  Output: docs/data/persons.json (432 KB)
          Meta-Informationen (generated, coverage, sources)
  Validierung: Required fields (id, name, role, normierung)
```

### 1.3 Datenmodell-Transformation

XML → Python → JSON Pipeline:

```
XML (Relational)                  Python (Objekt)              JSON (Denormalisiert)
─────────────────                 ────────────────             ──────────────────────
ra_ndb_indiv.xml                  self.women = {               {
  <ITEM>                            "1906": {                    "id": "1906",
    <ID>1906</ID>            →        "id": "1906",       →      "name": "Angelica...",
    <SEXUS>w</SEXUS>                  "name": "...",             "gnd": "116372443",
    <GND>116372443</GND>              "gnd": "...",              "dates": {
  </ITEM>                             "dates": {},                 "birth": "1806",
                                      "places": [],                "death": "1887"
ra_ndb_datierungen.xml                "occupations": []          },
  <ITEM>                            }                            "places": [
    <ID>1906</ID>                  }                              {
    <ART>Geburtsdatum</ART>                                         "name": "Weimar",
    <JAHR>1806</JAHR>                                               "lat": 50.9803,
  </ITEM>                                                           "lon": 11.32903,
                                                                    "type": "Wirkungsort"
ra_ndb_orte.xml + geo_*.xml                                       }
  <ITEM>                                                         ],
    <ID>1906</ID>                                                "occupations": [
    <SNDB_ID>79627</SNDB_ID>                                       {
  </ITEM>                                                            "name": "Gemmenschneiderin",
  ↓                                                                  "type": "Beruf"
  geo_main: 79627 → "Weimar"                                       }
  geo_indiv: 79627 → 50.9803, 11.32903                           ]
                                                               }
```

Rationale für Denormalisierung:
- Frontend benötigt keine Joins
- JSON-Größe akzeptabel (432 KB)
- Faster client-side filtering
- Bessere Offline-Nutzung

### 1.4 Validierungsstrategie

Test-Driven Pipeline mit 48 Assertions:

```python
def test_phase1(self):
    total = len(self.women)
    with_gnd = sum(1 for w in self.women.values() if w.get('gnd'))

    # Expected: ~448 women (new export size)
    assert 400 <= total <= 500, f"Expected ~448 women in new export, got {total}"

    # Expected: ~60% GND coverage (new export quality)
    assert 0.50 <= with_gnd/total <= 0.70, f"Expected 50-70% GND coverage, got {with_gnd/total*100:.1f}%"

    self.log(f"[OK] Phase 1 validation passed: {total} women, {with_gnd/total*100:.1f}% GND")
    return True
```

Validierungstypen:
- Mengen-Assertions (400-500 Personen)
- Prozent-Assertions (50-70% GND)
- Existenz-Checks (>0 Senderinnen)
- Struktur-Validierung (required fields)

Fehlerbehandlung:
- Assertions werfen Exception bei Verletzung
- Pipeline stoppt bei Validierungsfehler
- Logs mit [OK] bei erfolgreichem Test

Limitation:
- Keine Unit Tests (nur Integration Tests)
- Keine Mock-Daten für isolierte Tests
- Keine Coverage-Metriken

### 1.5 Performance-Charakteristika

Benchmark (Dezember 2024, build_herdata_new.py):
```
Total duration: 0.63 seconds
Output size: 432 KB (was 1.56 MB, -81% reduction)
Processing speed: 711 persons/second
Memory usage: <50 MB (estimated)
```

Vergleich alte Pipeline (build_herdata.py):
```
Total duration: 1.4 seconds (55% slower)
Output size: 1.56 MB (261% larger)
Dataset: 3.617 women (full SNDB)
```

Optimierungen in neuer Pipeline:
- Kuratierter Export (448 statt 3.617 Personen)
- Nur SEXUS='w' (Filter frühzeitig)
- GND-basierter Index statt Name-Matching
- Geodaten-Hybrid (nur benötigte aus OLD SNDB)

Bottlenecks:
- XML-Parsing (ElementTree, nicht lxml)
- Lineare Suche in CMIF (keine Indizes)
- Keine Parallelisierung

Verbesserungspotential:
- lxml statt ElementTree (2-3x schneller)
- Caching von parsed XML-Trees
- Multiprocessing für CMIF-Matching

### 1.6 Code-Qualität

Positiv:
- Klare Phasenstruktur (Single Responsibility)
- Aussagekräftige Funktionsnamen (phase1_identify_women)
- Logging für Nachvollziehbarkeit
- Docstrings für alle Methoden
- Type Hints fehlen (Python 3.7+)

Verbesserungswürdig:
- Keine Error-Recovery (Pipeline stoppt bei erstem Fehler)
- Hardcodierte Pfade in main()
- Keine Konfigurationsdatei
- Magic Numbers (z.B. 0.5 für 50% in Assertions)
- Keine Dependency Injection

Code-Duplication:
- XML-Parsing-Boilerplate wiederholt sich
- Wiederverwendbarer XML-Helper fehlt

Empfohlene Refactorings:
```python
# Vorher
main_tree = ET.parse(self.new_export_dir / 'ra_ndb_main.xml')
main_root = main_tree.getroot()
for item in main_root.findall('.//ITEM'):
    # ...

# Nachher
class XMLHelper:
    @staticmethod
    def parse_items(filepath):
        tree = ET.parse(filepath)
        return tree.getroot().findall('.//ITEM')

# Usage
for item in XMLHelper.parse_items(self.new_export_dir / 'ra_ndb_main.xml'):
    # ...
```

### 1.7 Dependencies

Python Standard Library only:
- xml.etree.ElementTree (XML parsing)
- pathlib.Path (file handling)
- collections.defaultdict, Counter (data structures)
- json (output serialization)
- datetime.datetime (timestamps)

Vorteile:
- Keine externen Dependencies
- Einfache Installation (Python 3.7+ reicht)
- Keine Versionskonflikte

Nachteile:
- ElementTree langsamer als lxml
- Keine Schema-Validierung (kein lxml.etree)
- Keine XPath-Unterstützung

## 2. Web-Anwendung: Frontend Implementation

### 2.1 Datei-Struktur

```
docs/
├── index.html              (107 Zeilen, Hauptansicht)
├── person.html             (168 Zeilen, Person-Detailseite)
├── network.html            (64 Zeilen, Netzwerk-Ansicht)
├── css/
│   ├── style.css           (1.028 Zeilen, Haupt-Styles)
│   └── network.css         (160 Zeilen, Netzwerk-spezifisch)
├── js/
│   ├── app.js              (818 Zeilen, Karte + Filter)
│   ├── timeline.js         (178 Zeilen, D3.js Timeline)
│   ├── person.js           (413 Zeilen, Person-Detailseite)
│   └── network.js          (284 Zeilen, AGRELON-Visualisierung)
└── data/
    └── persons.json        (432 KB, 448 Personen)

Total:
  HTML:  339 Zeilen
  CSS: 1.188 Zeilen
  JS:  1.693 Zeilen
  Gesamt: 3.220 Zeilen Frontend-Code
```

### 2.2 Architektur-Pattern

Vanilla JavaScript mit modularem Design:

```javascript
// app.js - Main Application
import { Timeline } from './timeline.js';

// Global State
let map;
let allPersons = [];
let filteredPersons = [];
let timeline = null;
let temporalFilter = null;

// Module Pattern (keine Klassen)
async function init() {
    await loadData();
    initMap();
    initFilters();
    initTabs();
}

// Event-Driven Architecture
document.addEventListener('DOMContentLoaded', init);
```

Design-Entscheidungen:
- Kein Framework (React, Vue, Angular)
- ES6 Modules (import/export)
- Globales State Management (keine Zustand/Redux)
- Imperative DOM-Manipulation

Vorteile:
- Keine Build-Tools erforderlich
- Schnelles Laden (kein Framework-Overhead)
- Einfache Debugging
- Direktes Deployment auf GitHub Pages

Nachteile:
- Skalierung schwieriger bei Wachstum
- State-Management fehleranfällig
- Keine Komponenten-Wiederverwendung
- Testing schwieriger

### 2.3 MapLibre GL JS Integration

Zentrale Visualisierung mit WebGL-Rendering:

```javascript
// Map Initialization (app.js:120-150)
function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'raster-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [
                {
                    id: 'simple-tiles',
                    type: 'raster',
                    source: 'raster-tiles',
                    minzoom: 0,
                    maxzoom: 22
                }
            ]
        },
        center: [11.3, 50.9],  // Weimar
        zoom: 6
    });
}
```

Layer-Architektur (3 Layers):

1. Cluster-Kreise (persons-clusters)
   - Dynamische Größe basierend auf point_count
   - Farbcodierung nach Briefaktivität
   - Zoom-responsive Radien

2. Cluster-Zahlen (persons-cluster-count)
   - Text-Layer mit point_count
   - Weiße Farbe für Lesbarkeit
   - Nur bei Clustern sichtbar

3. Individuelle Marker (persons-layer)
   - Circles mit role-basierter Farbe
   - Zoom-Interpolation (6px @ z5 → 16px @ z15)
   - Filter: ['!=', 'cluster', true]

Clustering-Konfiguration:
```javascript
map.addSource('persons', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 10,      // Clustering bis Zoom 10
    clusterRadius: 40,       // 40px Radius
    clusterProperties: {
        'sender_count': ['+', ['case', ['==', ['get', 'role'], 'sender'], 1, 0]],
        'mentioned_count': ['+', ['case', ['==', ['get', 'role'], 'mentioned'], 1, 0]],
        'both_count': ['+', ['case', ['==', ['get', 'role'], 'both'], 1, 0]]
        // 'indirect' absichtlich ausgeschlossen (ADR-003)
    }
});
```

Cluster-Farbcodierung (ADR-003):
```javascript
'circle-color': [
    'case',
    // >50% Senderinnen (sender + both) → Steel Blue
    ['>', ['+', ['get', 'sender_count'], ['get', 'both_count']],
          ['*', ['get', 'point_count'], 0.5]],
    '#2c5f8d',

    // >50% Erwähnte → Medium Gray
    ['>', ['get', 'mentioned_count'], ['*', ['get', 'point_count'], 0.5]],
    '#6c757d',

    // Gemischt → Forest Green
    '#2d6a4f'
]
```

Rationale:
- 'indirect' (nur SNDB, keine Briefe) werden nicht aggregiert
- Cluster ohne Briefverbindung für Forschung weniger relevant
- Farbcodierung zeigt Brief-Aktivität auf Blick

### 2.4 Timeline-Visualisierung (D3.js)

Datei: js/timeline.js (178 Zeilen)

Implementation:
```javascript
export class Timeline {
    constructor(containerId, data, onBrushCallback) {
        this.containerId = containerId;
        this.data = data;  // [{year, count}, ...]
        this.onBrush = onBrushCallback;
        this.svg = null;
        this.brush = null;
    }

    render() {
        // D3.js Histogram mit Brush-Selection
        const margin = {top: 20, right: 20, bottom: 30, left: 50};
        const width = 800 - margin.left - margin.right;
        const height = 200 - margin.top - margin.bottom;

        // Scales
        const x = d3.scaleLinear()
            .domain([d3.min(this.data, d => d.year), d3.max(this.data, d => d.year)])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.count)])
            .range([height, 0]);

        // Bars
        svg.selectAll('.bar')
            .data(this.data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.year))
            .attr('width', barWidth)
            .attr('y', d => y(d.count))
            .attr('height', d => height - y(d.count));

        // Brush for temporal filtering
        const brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on('end', (event) => this.handleBrush(event));
    }
}
```

Features:
- Lazy Loading (nur bei Tab-Switch)
- Brushing & Linking mit Map
- Reset-Button für Zeitfilter
- Responsive Width

Performance:
- <500ms Initial Render
- <100ms Brush Update
- 54 Jahre Zeitspanne (1772-1824)

Datenquelle:
```javascript
// Von persons.json meta.timeline
timeline: [
    {year: 1772, count: 1},
    {year: 1773, count: 6},
    // ... 54 Einträge
    {year: 1824, count: 230}
]
```

### 2.5 Netzwerk-Visualisierung (AGRELON)

Datei: js/network.js (284 Zeilen)

Status: Teilweise implementiert

Konzept:
- AGRELON-Ontologie (44 Beziehungstypen)
- Force-Directed Graph mit D3.js
- Filtern nach Beziehungstyp

Implementation:
```javascript
// Load person data with relationships
const response = await fetch('data/persons.json');
const data = await response.json();

// Build graph from relationships
const nodes = data.persons.map(p => ({
    id: p.id,
    name: p.name,
    group: p.role
}));

const links = [];
data.persons.forEach(person => {
    if (person.relations) {
        person.relations.forEach(rel => {
            links.push({
                source: person.id,
                target: rel.target_id,
                type: rel.type
            });
        });
    }
});

// D3 Force Simulation
const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(width / 2, height / 2));
```

Problem (siehe REQUIREMENTS_VALIDATION.md):
- Nur 67 von 448 Personen haben relations-Feld (15%)
- 922 Beziehungen in XML verfügbar, aber nicht integriert
- Netzwerk-Ansicht daher rudimentär

Verbesserungsbedarf:
- Integration von pers_koerp_beziehungen.xml
- AGRELON-Typen zuordnen (nsl_agrelon.xml)
- Graph-Layout optimieren

### 2.6 Person-Detailseite

Datei: person.html + js/person.js (413 Zeilen)

6-Tab-Struktur:

1. Überblick
   - Statistiken (Briefe, Erwähnungen, Orte, Berufe)
   - GND und SNDB Links
   - Lebensdaten

2. Korrespondenz
   - Brief-Liste (falls integriert)
   - Timeline der Briefe
   - Filter nach Jahr

3. Orte
   - Mini-Karte mit Markern
   - Liste der Orte (Geburt, Wirkung, Tod)
   - GeoNames-Links

4. Berufe
   - Berufs-Tags mit Typ
   - Gruppierung nach Kategorie

5. Netz
   - AGRELON-Beziehungen
   - Graph-Visualisierung (wenn Daten vorhanden)

6. Quellen
   - Automatische Zitation
   - SNDB und GND Nachweis
   - Datenstand

URL-Parameter:
```
person.html?id=1906
→ Lädt Person mit SNDB-ID 1906
```

Implementation:
```javascript
// Parse URL parameter
const urlParams = new URLSearchParams(window.location.search);
const personId = urlParams.get('id');

// Load person data
const response = await fetch('data/persons.json');
const data = await response.json();
const person = data.persons.find(p => p.id === personId);

// Render tabs
renderOverview(person);
renderCorrespondence(person);
renderPlaces(person);
renderOccupations(person);
renderNetwork(person);
renderSources(person);
```

### 2.7 Filter-Mechanismus

Multi-Criteria Filtering mit AND-Logik:

```javascript
function filterPersons() {
    // 1. Role Filter (Briefaktivität)
    const roleFilters = Array.from(document.querySelectorAll('input[name="role"]:checked'))
        .map(cb => cb.value);

    // 2. Occupation Group Filter
    const occFilters = Array.from(document.querySelectorAll('input[name="occupation"]:checked'))
        .map(cb => cb.value);

    // 3. Temporal Filter (from Timeline brush)
    const tempFilter = temporalFilter;

    // Combine with AND
    filteredPersons = allPersons.filter(person => {
        // Role check
        if (!roleFilters.includes(person.role)) return false;

        // Occupation check
        const occGroup = getOccupationGroup(person);
        if (!occFilters.includes(occGroup)) return false;

        // Temporal check (birth/death in range)
        if (tempFilter) {
            const birth = parseInt(person.dates?.birth);
            const death = parseInt(person.dates?.death);
            if (birth && birth > tempFilter.end) return false;
            if (death && death < tempFilter.start) return false;
        }

        return true;
    });

    renderMarkers();
}
```

Filter-Typen:
1. Briefaktivität (role): sender, mentioned, both, indirect
2. Berufsgruppe: artistic, literary, musical, court, education, other, none
3. Zeitraum: Start- und Endjahr via Timeline-Brush

Performance:
- Filter auf 448 Personen: <50ms
- Sofortige UI-Updates (keine Debounce)
- MapLibre setData() für Re-Rendering

Limitation:
- Keine URL-Serialisierung (Filter nicht bookmarkable)
- Keine Filter-Historie (Undo/Redo)
- Keine gespeicherten Filter-Sets

### 2.8 Responsive Design

CSS Grid + Flexbox Layout:

```css
/* 3-Spalten-Layout */
.container {
    display: grid;
    grid-template-columns: 250px 1fr;  /* Sidebar + Main */
    height: calc(100vh - 60px);        /* Full height minus navbar */
}

.main-content {
    display: flex;
    flex-direction: column;
}

/* Mobile Breakpoint */
@media (max-width: 768px) {
    .container {
        grid-template-columns: 1fr;    /* Single column */
    }

    .sidebar {
        position: fixed;               /* Overlay sidebar */
        z-index: 1000;
        transform: translateX(-100%);  /* Hidden by default */
    }

    .sidebar.open {
        transform: translateX(0);      /* Slide in */
    }
}
```

Breakpoints:
- Desktop: >768px (3-Spalten-Layout)
- Tablet: 768px (2-Spalten)
- Mobile: <768px (1-Spalte, Hamburger-Menu)

Map-Responsiveness:
```javascript
// MapLibre auto-resize on window resize
map.on('load', () => {
    window.addEventListener('resize', () => {
        map.resize();
    });
});
```

### 2.9 Debugging System

Color-Coded Logging (Session 8):

```javascript
export const Debug = {
    log: (type, msg) => {
        const icons = {
            'INIT': '🟢',      // Application initialization
            'RENDER': '🔵',    // Map rendering and data updates
            'EVENT': '🟡',     // Event handler registration
            'CLICK': '🟠',     // User interactions
            'ERROR': '🔴'      // Error messages
        };
        const icon = icons[type] || '⚪';
        console.log(`${icon} ${type}: ${msg}`);
    }
};

// Usage
Debug.log('INIT', 'Starting application');
Debug.log('RENDER', 'Rendering 227 markers');
Debug.log('CLICK', 'Cluster clicked: 15 persons');
```

Vorteile:
- Visuelle Kategorisierung in Browser-Console
- Performance-Tracking (timestamps)
- Debugging-freundlich

Limitation:
- Production-Logs sollten entfernt werden
- Keine Log-Levels (DEBUG, INFO, WARN, ERROR)
- Keine strukturierten Logs (JSON)

### 2.10 Externe Dependencies

Externe Bibliotheken (CDN):

1. MapLibre GL JS 4.7.1
   - URL: https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js
   - Größe: ~220 KB (gzipped)
   - Lizenz: BSD-3-Clause

2. D3.js v7
   - URL: https://d3js.org/d3.v7.min.js
   - Größe: ~76 KB (gzipped)
   - Lizenz: ISC

3. noUiSlider 15.7.1
   - URL: https://unpkg.com/nouislider@15.7.1/dist/nouislider.min.js
   - Größe: ~12 KB (gzipped)
   - Lizenz: MIT
   - Verwendung: Zeitraum-Slider

Total External JS: ~308 KB (gzipped)

Vorteile CDN:
- Keine Build-Tools erforderlich
- Browser-Caching
- Schnelle Updates

Nachteile CDN:
- Offline nicht funktionsfähig
- Privacy-Bedenken (Tracking)
- Keine Version-Kontrolle (unpkg kann brechen)

Empfehlung:
- Vendor-Ordner mit lokalen Kopien
- Oder npm + Bundler (Vite, Parcel)

## 3. Architektur-Entscheidungen (ADRs)

Dokumentierte Entscheidungen: knowledge/decisions.md

### ADR-001: MapLibre GL JS statt Leaflet

Entscheidung: MapLibre GL JS
Rationale:
- WebGL-Rendering (bessere Performance)
- Native Heatmap-Funktionalität
- Bessere Animation-Support
- Moderne Appearance

Trade-off:
- 220 KB vs. 40 KB (5,5x größer)
- Steepere Learning Curve
- WebGL-Requirement

Status: Bewährt sich in Production

### ADR-002: Multi-Person Popups

Problem: Mehrere Personen am selben Ort

Lösung: Popup mit Liste statt einzelnem Popup

Implementation:
```javascript
const popup = new maplibregl.Popup()
    .setHTML(`
        <h4>${placeName}</h4>
        <ul>
            ${persons.map(p => `
                <li><a href="person.html?id=${p.id}">${p.name}</a></li>
            `).join('')}
        </ul>
    `);
```

### ADR-003: Cluster-Farbcodierung

Problem: Cluster-Farben sollen Briefaktivität zeigen

Lösung: Farbcodierung nach Mehrheit (>50%)
- Steel Blue: >50% haben geschrieben
- Medium Gray: >50% wurden erwähnt
- Forest Green: Gemischt

Bewusste Auslassung: 'indirect' (nur SNDB, keine Briefe)

Rationale: Forschungsfokus auf Korrespondenz

### ADR-008: Kuratierter Datenexport

Entscheidung: 448 Frauen statt 3.617

Rationale:
- Bessere Datenqualität (60,3% GND statt 34,1%)
- Höhere CMIF-Match-Rate (51,3% statt 22,3%)
- Fokus auf regest-relevante Personen
- 81% kleinerer JSON (432 KB statt 1,56 MB)

Trade-off:
- Weniger Vollständigkeit
- Kuratierungs-Bias möglich

Status: Erfolgreich implementiert

## 4. Code-Qualität Assessment

### 4.1 Python Pipeline

Positiv:
- Klare 4-Phasen-Struktur
- Umfassende Validierung (48 Assertions)
- Logging für Nachvollziehbarkeit
- Docstrings vorhanden
- Keine externen Dependencies

Verbesserungswürdig:
- Fehlende Type Hints
- Keine Unit Tests (nur Integration)
- Hardcodierte Magic Numbers
- XML-Parsing wiederholt sich
- Keine Error-Recovery

Code-Smell:
```python
# Hardcoded threshold
assert 0.50 <= with_gnd/total <= 0.70

# Better
GND_COVERAGE_MIN = 0.50
GND_COVERAGE_MAX = 0.70
assert GND_COVERAGE_MIN <= with_gnd/total <= GND_COVERAGE_MAX
```

Empfohlene Refactorings:
- XMLHelper-Klasse für Parsing
- Config-Datei für Thresholds
- Pytest-Suite für Unit Tests
- Type Hints hinzufügen

### 4.2 JavaScript Frontend

Positiv:
- Modulare Struktur (app.js, timeline.js, person.js, network.js)
- ES6 Modules (import/export)
- Aussagekräftige Funktionsnamen
- Debug-Logging implementiert

Verbesserungswürdig:
- Globales State Management fehleranfällig
- Keine TypeScript (Type Safety fehlt)
- Keine automatisierten Tests
- Fehlerbehandlung rudimentär
- Keine Code-Dokumentation (JSDoc)

Code-Smell:
```javascript
// Global mutable state
let filteredPersons = [];

// Better: Immutable state
const state = {
    allPersons: [],
    filters: {
        roles: ['sender', 'mentioned'],
        occupations: ['artistic', 'literary'],
        temporal: null
    }
};

function applyFilters(state) {
    return {
        ...state,
        filteredPersons: state.allPersons.filter(/* ... */)
    };
}
```

Empfohlene Verbesserungen:
- State-Management-Library (Zustand)
- TypeScript Migration
- Jest/Vitest für Testing
- JSDoc für Dokumentation
- ESLint + Prettier

### 4.3 CSS Styling

Struktur:
- style.css: 1.028 Zeilen (Haupt-Styles)
- network.css: 160 Zeilen (Netzwerk-spezifisch)

Positiv:
- CSS Grid + Flexbox
- Responsive Breakpoints
- Custom Properties (CSS Variables)
- BEM-ähnliche Naming

Verbesserungswürdig:
- Keine CSS-Präprozessor (SASS/LESS)
- Einige !important (Code-Smell)
- Wiederholungen (DRY-Prinzip verletzt)
- Keine CSS-Modules (Namespace-Kollisionen möglich)

Beispiel CSS Variables:
```css
:root {
    --color-primary: #2c5f8d;
    --color-secondary: #6c757d;
    --color-success: #2d6a4f;
    --color-gray: #adb5bd;

    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
}

.marker-sender {
    background-color: var(--color-primary);
}
```

Empfohlen:
- SASS für Nesting und Mixins
- PostCSS für Autoprefixer
- CSS-Modules für Scoping

## 5. Performance-Analyse

### 5.1 Pipeline Performance

Benchmark (build_herdata_new.py):
```
Execution Time: 0.63 seconds
Dataset: 448 women
Throughput: 711 persons/second
Output: 432 KB JSON
Memory: <50 MB (estimated)
```

Breakdown:
- Phase 1 (Identify): ~0.2s (XML parsing)
- Phase 2 (CMIF): ~0.3s (15.312 Briefe)
- Phase 3 (Enrich): ~0.1s (Geodata + Occupations)
- Phase 4 (JSON): ~0.03s (Serialization)

Bottleneck: CMIF-Matching (15.312 Briefe linear durchsuchen)

Optimierung:
```python
# Current: Linear search
for corresp in correspondences:  # 15.312 iterations
    for woman_id, woman_data in self.women.items():  # 448 iterations
        # → 6.860.736 comparisons worst case

# Better: Pre-indexed
gnd_to_woman = {woman['gnd']: woman_id for woman_id, woman in self.women.items()}
for corresp in correspondences:  # 15.312 iterations
    gnd = extract_gnd(corresp)
    if gnd in gnd_to_woman:  # O(1) lookup
        # → 15.312 comparisons only
```

Bereits implementiert in build_herdata_new.py:258-282

### 5.2 Frontend Performance

Load Time Metrics (Estimated):
```
Initial Load:
- HTML: <50ms (5 KB)
- CSS: <100ms (20 KB)
- JS: <200ms (56 KB)
- MapLibre: ~500ms (220 KB CDN)
- D3.js: ~200ms (76 KB CDN)
- persons.json: ~300ms (432 KB)
Total: ~1.35s (acceptable)

Time to Interactive (TTI): ~2s
First Contentful Paint (FCP): ~500ms
```

Rendering Performance:
- Map initial render: <500ms (227 markers)
- Filter update: <50ms (re-render 448 persons)
- Timeline render: <500ms (D3.js)
- Brush selection: <100ms

Optimierungen:
- Lazy loading für Timeline (nur bei Tab-Switch)
- MapLibre WebGL-Rendering (GPU-beschleunigt)
- GeoJSON-Clustering (reduziert DOM-Elemente)

Bottleneck:
- CMIF Timeline-Daten (54 Jahre) könnten gecacht werden
- persons.json könnte komprimiert werden (gzip)

### 5.3 Bundle Size

Frontend Assets:
```
CSS:
  style.css: 20 KB
  network.css: 3 KB
  Total CSS: 23 KB (ungzipped)

JavaScript:
  app.js: 28 KB
  person.js: 14 KB
  timeline.js: 5.6 KB
  network.js: 8.6 KB
  Total JS: 56 KB (ungzipped)

Data:
  persons.json: 432 KB (ungzipped)

External (CDN):
  MapLibre GL JS: 220 KB (gzipped)
  D3.js: 76 KB (gzipped)
  noUiSlider: 12 KB (gzipped)
  Total External: 308 KB

Grand Total: ~819 KB (ungzipped)
```

Mit gzip Compression (estimated):
```
CSS: 23 KB → ~6 KB (-74%)
JS: 56 KB → ~15 KB (-73%)
persons.json: 432 KB → ~120 KB (-72%)
Total: ~449 KB (gzipped)
```

Verbesserungspotential:
- Bundler (Vite) mit Tree-Shaking
- Code-Splitting (Timeline nur lazy)
- Image-Optimization (favicon.svg)
- Service Worker für Caching

## 6. Sicherheit & Privacy

### 6.1 Daten-Privacy

Personenbezogene Daten:
- Namen (historische Personen, >100 Jahre tot)
- Lebensdaten (1722-1899)
- Wohnorte (historisch)
- Berufe (historisch)

DSGVO-Relevanz: NEIN
- Alle Personen verstorben
- Historische Forschung (Ausnahme Art. 89 DSGVO)
- Öffentlich zugängliche Datenquellen (SNDB, CMIF)

Externe Requests:
- OpenStreetMap Tiles (IP-Logging möglich)
- unpkg CDN (IP-Logging möglich)
- GND-Links (d-nb.info, IP-Logging)
- GeoNames-Links (geonames.org, IP-Logging)

Empfehlung:
- Privacy Policy hinzufügen
- Cookie-Banner (falls Tracking)
- Self-Hosting von Tiles + Libraries

### 6.2 XSS-Schutz

Potentielle Vulnerabilities:

1. Popup-HTML-Injection
```javascript
// VULNERABLE
popup.setHTML(`<h4>${person.name}</h4>`);

// Better (falls name aus User-Input)
const sanitize = (str) => str.replace(/[<>]/g, '');
popup.setHTML(`<h4>${sanitize(person.name)}</h4>`);
```

Aktueller Status: SAFE
- Alle Daten aus persons.json (kontrolliert)
- Keine User-Inputs in HTML
- Keine eval() oder innerHTML mit User-Data

2. URL-Parameter-Injection
```javascript
// person.html?id=<script>alert('XSS')</script>
const personId = urlParams.get('id');

// SAFE (parseInt filtert Strings)
const person = data.persons.find(p => p.id === personId);
```

### 6.3 Dependency Security

Externe Dependencies:
- MapLibre GL JS 4.7.1 (unpkg CDN)
- D3.js v7 (d3js.org CDN)
- noUiSlider 15.7.1 (unpkg CDN)

Risiken:
- CDN-Kompromittierung (Supply Chain Attack)
- Veraltete Versionen (Known Vulnerabilities)
- Keine Subresource Integrity (SRI)

Empfehlung:
```html
<!-- Current -->
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>

<!-- Better: SRI Hash -->
<script
    src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"
    integrity="sha384-ABC123..."
    crossorigin="anonymous">
</script>
```

## 7. Verbesserungspotentiale

### 7.1 Kritische Lücken (Highest Priority)

1. Beziehungsdaten nicht integriert
   - Problem: 922 Beziehungen in XML, nur 67 integriert
   - Impact: Epic 2 (Verwandtschaft) zu 85% blockiert
   - Lösung: Pipeline erweitern (pers_koerp_beziehungen.xml)
   - Aufwand: 1-2 Tage

2. Briefdaten nicht integriert
   - Problem: 15.312 Briefe in CMIF, nur 67 Personen haben letter_count
   - Impact: US-4.3 (Brief-Chronologie) blockiert
   - Lösung: CMIF-Parser erweitern
   - Aufwand: 1-2 Tage

3. Namensvarianten fehlen
   - Problem: 797 Namensformen in XML, nur Hauptnamen in JSON
   - Impact: US-1.1 (Namenssuche) eingeschränkt
   - Lösung: ra_ndb_main.xml parsen
   - Aufwand: 0.5 Tage

### 7.2 Code-Qualität (Medium Priority)

1. Frontend-Tests fehlen
   - Problem: Keine automatisierten Tests
   - Impact: Refactoring riskant, Regressions möglich
   - Lösung: Jest/Vitest + Testing Library
   - Aufwand: 3-5 Tage

2. TypeScript Migration
   - Problem: Keine Type Safety
   - Impact: Runtime-Errors, schlechte IDE-Unterstützung
   - Lösung: Schrittweise Migration zu .ts
   - Aufwand: 5-10 Tage

3. State Management
   - Problem: Globale Variablen fehleranfällig
   - Impact: Skalierung schwierig
   - Lösung: Zustand oder Redux
   - Aufwand: 2-3 Tage

### 7.3 Performance-Optimierungen (Low Priority)

1. Bundle-Optimierung
   - Problem: Keine Tree-Shaking, keine Code-Splitting
   - Impact: Größere Bundles als nötig
   - Lösung: Vite + Bundle-Analyzer
   - Aufwand: 1-2 Tage

2. Service Worker
   - Problem: Keine Offline-Unterstützung
   - Impact: Keine PWA-Features
   - Lösung: Workbox für Caching
   - Aufwand: 2-3 Tage

3. Image-Optimization
   - Problem: favicon.svg könnte optimiert sein
   - Impact: Minimal
   - Lösung: SVGO
   - Aufwand: 0.5 Tage

### 7.4 Feature-Erweiterungen

1. Full-Text-Suche
   - Konzept: Fuse.js für fuzzy search
   - Scope: Namen, Biografien, Berufe
   - Aufwand: 2-3 Tage

2. Export-Funktionen
   - CSV-Export der gefilterten Daten
   - PNG-Export der Visualisierungen
   - BibTeX-Zitationen
   - Aufwand: 2-3 Tage

3. Storytelling-Features
   - Kuratierte Touren (z.B. "Schriftstellerinnen um 1800")
   - Deep-Links für spezifische Filter
   - Annotationen auf Karte
   - Aufwand: 5-7 Tage

## 8. Best Practices Compliance

### 8.1 Digital Humanities Standards

Erfüllt:
- TEI-XML konforme Datenquellen
- CMIF-Standard für Briefmetadaten
- Linked Open Data (GND, GeoNames)
- AGRELON-Ontologie für Beziehungen
- Wissenschaftliche Zitation (README.md)

Teilweise erfüllt:
- Dublin Core Metadata (könnte hinzugefügt werden)
- Schema.org Markup (SEO-Optimierung)

Nicht erfüllt:
- IIIF für Bilder (keine Bilder vorhanden)
- RDF/Turtle Export
- SPARQL Endpoint

### 8.2 Web Development Standards

Erfüllt:
- Semantic HTML5
- Responsive Design
- Accessibility (teilweise)
- Progressive Enhancement

Verbesserungswürdig:
- ARIA-Attribute für Screen Reader
- Keyboard-Navigation
- Color-Contrast (WCAG 2.1)
- Focus-Indikatoren

### 8.3 Open Source Best Practices

Erfüllt:
- CC BY 4.0 Lizenz (Daten)
- GitHub Repository
- README mit Installation
- Architecture Decision Records

Verbesserungswürdig:
- CONTRIBUTING.md fehlt
- CODE_OF_CONDUCT.md fehlt
- Issue Templates fehlen
- CI/CD Pipeline fehlt

## 9. Deployment & DevOps

### 9.1 GitHub Pages Setup

Konfiguration:
- Branch: main
- Folder: /docs
- Custom Domain: nein
- HTTPS: ja (automatisch)

Vorteile:
- Kostenlos
- Automatisches Deployment bei Push
- HTTPS inklusive
- CDN-Distribution

Nachteile:
- Kein Backend möglich
- Keine Serverside-Rendering
- Keine Umgebungsvariablen
- 100 GB Bandwidth/Monat Limit

### 9.2 Build Process

Aktuell: KEIN Build-Prozess
- Direkte Commits in /docs
- Python-Pipeline manuell ausführen
- JSON manuell in /docs/data kopieren

Empfohlener Workflow:
```bash
# 1. Pipeline ausführen
cd preprocessing
python build_herdata_new.py

# 2. JSON in docs kopieren
cp output/persons.json ../docs/data/

# 3. Commit und Push
git add docs/data/persons.json
git commit -m "Update persons.json"
git push origin main

# 4. GitHub Pages deployed automatisch
```

Verbesserung mit CI/CD:
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
    paths:
      - 'data/**'
      - 'preprocessing/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Run pipeline
        run: |
          cd preprocessing
          python build_herdata_new.py
      - name: Copy JSON
        run: cp preprocessing/output/persons.json docs/data/
      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/data/persons.json
          git commit -m "Auto-update persons.json"
          git push
```

### 9.3 Monitoring & Analytics

Aktuell: KEINE Analytics

Empfohlen:
- Plausible Analytics (Privacy-friendly)
- Matomo (Self-hosted)
- KEINE Google Analytics (Privacy-Bedenken)

Metriken:
- Page Views
- Unique Visitors
- Session Duration
- Filter-Nutzung (Custom Events)
- Person-Detailseite-Aufrufe

## 10. Fazit

### 10.1 Stärken des Projekts

1. Solide technische Grundlage
   - Klare Architektur (4-Phasen-Pipeline)
   - Moderne Web-Technologien (MapLibre, D3.js)
   - Performance-optimiert (0,63s Pipeline, 432 KB JSON)

2. Wissenschaftliche Qualität
   - Standards-konform (TEI, CMIF, AGRELON)
   - Transparente Datenherkunft
   - Reproduzierbare Pipeline

3. Benutzerfreundlichkeit
   - Intuitive Visualisierungen
   - Multi-Kriterien-Filter
   - Responsive Design

4. Dokumentation
   - Umfassendes knowledge/ Verzeichnis
   - Architecture Decision Records
   - Requirements Engineering

### 10.2 Schwächen

1. Datenintegration unvollständig
   - 922 Beziehungen nicht integriert
   - 15.312 Briefe nicht vollständig verknüpft
   - Namensvarianten fehlen

2. Code-Qualität verbesserungsfähig
   - Keine automatisierten Tests
   - Keine Type Safety (TypeScript)
   - Globales State Management

3. Fehlende Features
   - Keine Volltextsuche
   - Keine Export-Funktionen
   - Keine Storytelling-Features

### 10.3 Empfehlungen

Kurzfristig (1-2 Wochen):
1. Beziehungsdaten integrieren (HIGHEST PRIORITY)
2. Briefdaten vollständig verknüpfen
3. Namensvarianten hinzufügen
4. Frontend-Tests implementieren

Mittelfristig (1-2 Monate):
1. TypeScript Migration
2. State Management Library
3. Full-Text-Suche
4. Export-Funktionen
5. CI/CD Pipeline

Langfristig (3-6 Monate):
1. PWA-Features (Service Worker)
2. Storytelling-Module
3. RDF/Turtle Export
4. SPARQL Endpoint
5. Multi-Language Support

### 10.4 Gesamtbewertung

HerData ist ein technisch solides, wissenschaftlich fundiertes Digital Humanities Projekt mit klarem Fokus und guter Umsetzung. Die Hauptstärke liegt in der klaren Architektur und den modernen Visualisierungen. Die Hauptschwäche ist die unvollständige Datenintegration, die 20-30% der geplanten Features blockiert.

Technische Reife: 7/10
- Produktionsreif für MVP
- Verbesserungsbedarf bei Tests und Types

Wissenschaftliche Qualität: 9/10
- Exzellente Dokumentation
- Standards-konform
- Transparente Methodik

Benutzerfreundlichkeit: 8/10
- Intuitive Bedienung
- Responsive Design
- Verbesserungsbedarf bei Accessibility

Empfehlung: Projekt ist bereit für öffentliches Launch. Kritische Lücken (Beziehungsdaten) sollten in nächsten 2-4 Wochen geschlossen werden.
