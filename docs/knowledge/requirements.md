# Requirements

User Stories, funktionale und nicht-funktionale Anforderungen.

Stand: 2025-10-19

Siehe [INDEX.md](INDEX.md) für Navigation im Knowledge Vault.

---

## Scope

Dataset: Details siehe [data.md](data.md#kern-statistiken)
Users: Kultur-interessierte Laien (primary), Studierende/Forschende (secondary)
Approach: Exploratory visualization (Overview → Filter → Detail)
Platform: GitHub Pages (static), Leaflet.js + D3.js

---

## User Stories

### Epic 1: Exploration

US-01 Als Nutzer*in möchte ich auf einer Karte sehen, wo Frauen lebten/korrespondierten, um geografische Muster zu erkennen.
Akzeptanz: Interaktive Karte mit Clustern, Click → Popup (Name, Rolle, Briefanzahl), Performance <2s

US-02 Als Nutzer*in möchte ich die zeitliche Verteilung der Korrespondenz sehen, um Peaks zu identifizieren.
Akzeptanz: Timeline 1760–1824, Brush-Selection filtert Karte, Peak 1817 sichtbar

US-03 Als Nutzer*in möchte ich Frauen nach Rolle filtern (Absenderin/Erwähnte), um Teilmengen zu analysieren.
Akzeptanz: Sidebar-Filter, Live-Update aller Ansichten

US-04 Als Nutzer*in möchte ich sehen, welche Frauen GND-Normdaten haben, um Datenqualität zu beurteilen.
Akzeptanz: Filter "Normierung: GND/SNDB/Keine", Badges in Profilen

### Epic 2: Person verstehen

US-05 Als Nutzer*in möchte ich ein Personenprofil mit Biografie, Briefen, Orten und Beziehungen sehen.
Akzeptanz: 6 Tabs (Überblick, Korrespondenz, Netz, Orte, Berufe, Quellen), Biogramme aus projekt-XML

US-06 Als Nutzer*in möchte ich alle Briefe einer Person chronologisch sehen, um ihre Korrespondenz zu verfolgen.
Akzeptanz: Briefliste mit Datum/Ort/Regest, Sortierung, Link zu Briefdetail

US-07 Als Nutzer*in möchte ich das soziale Netzwerk einer Person visualisiert sehen.
Akzeptanz: Graph mit AGRELON-Relationen + Ko-Erwähnungen, Filter nach Beziehungstyp

### Epic 3: Quellenarbeit

US-08 Als Nutzer*in möchte ich zu GND/SNDB/PROPYLÄEN verlinkt werden, um externe Quellen zu prüfen.
Akzeptanz: Clickable Badges, Links zu `d-nb.info/gnd/[ID]`, `ores.klassik-stiftung.de`, `goethe-biographica.de`

US-09 Als Nutzer*in möchte ich Briefregesten lesen, um Inhalte zu verstehen (TEI nur 15.7% verfügbar).
Akzeptanz: Briefdetailseite mit Regest (immer), TEI-Link (wenn vorhanden), Metadaten (Datum, Ort, Sprache)

US-10 Als Nutzer*in möchte ich Suchergebnisse als CSV exportieren, um Daten weiterzuverarbeiten.
Akzeptanz: Export-Button, CSV mit ID, Name, Daten, Rollen, Briefanzahl

### Epic 4: Netzwerk erkunden

US-11 Als Nutzer*in möchte ich alle Frauen in einem Netzwerk sehen, die über Beziehungen verbunden sind.
Akzeptanz: Dual-Layer-Graph (Ko-Erwähnung + AGRELON), 44 Beziehungstypen filterbar, Zeit-Slider

US-12 Als Nutzer*in möchte ich nach Personen, Orten oder Briefen suchen, um gezielt zu navigieren.
Akzeptanz: Unified Search mit Typeahead, gruppierte Ergebnisse (Personen/Briefe/Orte), <100ms Response

### Epic 5: Kontext verstehen

US-13 Als Nutzer*in möchte ich kuratierte Stories lesen, um historische Narrative zu erleben.
Akzeptanz: Stories-Modul mit Text + eingebetteten Visualisierungen, Deep-Links zu Entitäten

US-14 Als Nutzer*in möchte ich Ortsprofile sehen, um Briefzentren zu verstehen.
Akzeptanz: Ortsprofil mit assoziierten Personen, Timeline, Mini-Karte

---

## Functional Requirements

### FR-01: Data Pipeline
- XML → JSON-Konvertierung (4 Phasen: Identify → Match → Enrich → Narrativize)
- Output: `persons.json` (~7 MB), `letters.json`, `network.json`
- Felder: ID, Name, Lat/Lon, Role, LetterCount, MentionCount, GND, SNDB, Dates, Biogramm

### FR-02: Map View
- Leaflet.js mit Clustering (Spiderfier bei Overlap)
- Marker-Farbe: Role (Absenderin/Erwähnt/Indirekt)
- Marker-Größe: Briefanzahl/Erwähnungen
- Popup: Name, Dates, Role-Badges, "Details →"

### FR-03: Timeline View
- D3.js Area-Chart, Jahr-Binning (1760–1824)
- Brush-Selection → Crossfilter mit Karte/Liste
- Annotation: Peak 1817 (730 Briefe)

### FR-04: Person Profile
- 6 Tabs: Überblick | Korrespondenz | Netz | Orte | Berufe | Quellen
- Badges: GND ✓ | SNDB ✓ | TEI ✓ (wenn vorhanden)
- Biogramm aus `pers_koerp_projekt_*.xml`

### FR-05: Network Graph
- D3.js Force-Directed Layout
- Dual-Layer: Ko-Erwähnungen (CMIF) + AGRELON (SNDB)
- Filter: 44 Beziehungstypen, Zeit-Slider
- Node: Form=Typ, Color=Rolle, Size=Häufigkeit

### FR-06: Search
- Typeahead über Personen/Briefe/Orte
- Facettierte Ergebnisse
- Persistente Filter (Role, Normierung, Zeit)

### FR-07: Responsive Design
- 3 Breakpoints: ≤640 | ≤1024 | >1024
- Mobile: Facets in Overlay, Fokus-Ansicht für Karte/Netz
- Desktop: Sidebar-Facets, Split-View

### FR-08: Performance
- TTI (Time to Interactive) ≤ 2s
- Map-Render mit 3,617 Personen ≤ 1s
- Lazy-Loading für Detailseiten

### FR-09: Data Quality Transparency
- Badges für Normierung (GND/GeoNames/TEI)
- Fuzzy-Match-Warnung bei fehlender GND
- Datenstand-Hinweis: "SNDB Oktober 2025"

### FR-10: Export & Links
- CSV/JSON-Export
- Permalinks für Personen/Briefe/Orte
- Externe Links: GND, SNDB, PROPYLÄEN, Zenodo

---

## Non-Functional Requirements

### NFR-01: Performance
- Initial Load ≤ 2s (TTI)
- Map Clustering FPS ≥ 30
- Search Response ≤ 100ms

### NFR-02: Accessibility
- WCAG AA Kontraste
- Keyboard-Navigation
- Screen-Reader kompatibel

### NFR-03: Browser Support
- Modern Browsers with WebGL 1.0 support
- ES6+ erforderlich

### NFR-04: Data Volume
- Repository ≤ 1 GB (GitHub Pages Limit)
- Einzeldatei ≤ 100 MB
- Persons.json ~7 MB (3,617 × 2 KB)

### NFR-05: Maintainability
- Modularer Code (Components)
- Dokumentierte Datenfelder
- Versionierung (Git Tags)

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
Deliverable: Funktionale Karte mit Basisfiltern

- [ ] Data Pipeline: XML → persons.json
- [ ] Map View: Leaflet.js + Clustering
- [ ] Person Popup: Name, Rolle, Briefanzahl
- [ ] Sidebar Filter: Rolle, Normierung
- [ ] Global Navigation Skeleton
- [ ] GitHub Pages Deployment

Success: 3,617 Frauen sichtbar, <2s Load, 2 Filter funktional

### Phase 2: Enrichment (Week 3-4)
Deliverable: Timeline, Profile, Search

- [ ] Timeline View (D3.js)
- [ ] Person Detail Pages (6 Tabs)
- [ ] Unified Search (Typeahead)
- [ ] Person List View + Export
- [ ] Brushing & Linking (Map ↔ Timeline ↔ List)

Success: 3 Views synchronisiert, Profile komplett, Search <100ms

### Phase 3: Advanced (Week 5-6)
Deliverable: Netzwerk, Stories, API-Integration

- [ ] Network Graph (D3.js Force)
- [ ] AGRELON-Filter (44 Typen)
- [ ] Letter Detail Pages
- [ ] Place Profiles
- [ ] Stories Module (2 Beispiele)
- [ ] API-Links (TEI, SNDB)

Success: Alle 6 Nav-Bereiche funktional, Stories publiziert

---

## Technical Stack

Frontend:
- Leaflet.js 1.9+ (Map)
- D3.js 7+ (Timeline, Network)
- Vanilla JS (ES6+), keine Frameworks

Build:
- Python 3.x (XML → JSON Pipeline)
- Node.js (optional: Minification)

Hosting:
- GitHub Pages (Static)
- Custom Domain (optional)

Data:
- CMIF: `ra-cmif.xml` (23.4 MB)
- SNDB: 14 XML-Dateien (32 MB)
- Output: JSON (~10 MB total)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Large Dataset Performance | Clustering, Virtualization, Lazy-Loading |
| Low TEI Coverage (15.7%) | Regests als Fallback, UI-Kennzeichnung |
| Missing GND (46.6%) | Fuzzy Matching, Confidence-Badges |
| Geographic Clustering (Weimar) | Spider-Cluster, Zoom-Decluttering |
| Network Complexity (6,580 Edges) | Frauen-Subgraph, On-Demand-Loading |
| Data Staleness (PROPYLÄEN 2039) | Versionsnote, Manuelles Rebuild |

---

## Out of Scope

- Real-time API (use static snapshots)
- User Accounts / Annotations
- RDF/SPARQL Endpoint
- ML-basierte Disambiguation
- Automatic PROPYLÄEN Sync

---

References: [project.md](project.md), [data.md](data.md), [design.md](design.md), [wireframe.md](wireframe.md)

---

## 3. TECHNICAL ARCHITECTURE

Hosting: GitHub Pages (static site)

Technology Stack ([design.md](design.md), [wireframe.md](wireframe.md)):
- Map: Leaflet.js (proven in MVP) or WebGL for performance
- Timeline: D3.js or Chart.js (area chart/histogram)
- Network: D3.js force-directed graph or Cytoscape.js
- Data format: Pre-processed JSON (not client-side XML parsing)
- Performance target: TTI ≤ 2 seconds

Data Pipeline ([project.md](project.md)):

```
Phase 1: Identify Women
  pers_koerp_main.xml → 23,571 IDs
  pers_koerp_indiv.xml SEXUS=w → 3,617 women
  → Extract: ID, Name, GND (if exists)

Phase 2: Match Letters
  CMIF persName@ref → GND match → Women as senders
  CMIF mentionsPerson@target → GND/Name match → Women mentioned
  → Extract: Letter count, date ranges, places

Phase 3: Enrich Data
  pers_koerp_orte.xml + geo_* → Geodata (lat/lon)
  pers_koerp_datierungen.xml → Life dates
  pers_koerp_berufe.xml → Occupations
  pers_koerp_beziehungen.xml + nsl_agrelon.xml → Network edges

Phase 4: Narrativize
  pers_koerp_projekt_*.xml → Biographical texts
  → Generate person profiles
```

Output: `docs/data/persons.json`, `docs/data/letters.json`, `docs/data/network.json`

File Size Constraints:
- GitHub Pages: 1 GB repository limit, 100 MB file limit
- Estimated: 3,617 persons × ~2 KB = ~7 MB (acceptable)
- Network data needs pruning (only edges with women)

---

## 4. CORE FEATURES PRIORITY

### Phase 1 - MVP (REQUIRED)

1. Explorer Landing Page ([wireframe.md](wireframe.md)):
- 3-tab structure: Karte (default) | Zeit | Netz
- KPI display: "15.312 Briefe • 3.617 Frauen • 633 Orte"
- Guided prompts: "Zeige Frauen mit Briefen 1810–1819 in Weimar"

2. Map View (PRIMARY) ([design.md](design.md), [wireframe.md](wireframe.md)):
- Required:
  - Leaflet.js with clustering
  - Markers for women with geodata
  - Popup on click: Name, Dates, Role (sender/mentioned), Letter count
- Nice-to-have Phase 1:
  - Heatmap layer toggle
  - Level-of-detail (cluster counts)

3. Person Popup (Minimal Profile):
- Name + Life dates (if available)
- Role badges: "Absenderin" / "Erwähnt" / "Indirekt (SNDB)"
- GND/SNDB badges (if available)
- Letter count / Mention count
- "Details →" link to full profile

4. Basic Filtering (Sidebar):
- Role: Absenderin | Erwähnte | Indirekt (SNDB)
- Normierung: GND vorhanden | Nur SNDB | Keine
- Apply → Map updates

5. Global Navigation:
- Entdecken (active) | Personen | Briefe | Orte | Netzwerk | Stories
- Search icon (Phase 2)

### Phase 2 - Enrichment

6. Timeline View ([wireframe.md](wireframe.md)):
- Year-binned histogram (1760–1824)
- Peak marked: 1810s (4,592 letters), Höchstjahr 1817 (730)
- Brush selection → filters map + person list

7. Person Detail Pages (6 tabs) ([wireframe.md](wireframe.md)):
- Tab 1: Überblick (Biogramm from projekt-XML + Key facts)
- Tab 2: Korrespondenz (Letter list with dates, places, regests)
- Tab 3: Netz (SNDB relations + co-mentions)
- Tab 4: Orte (Activity places + letter origins, mini-map)
- Tab 5: Berufe/Rollen (from pers_koerp_berufe.xml)
- Tab 6: Quellen & Links (GND, SNDB, PROPYLÄEN, Zenodo)

8. Unified Search ([wireframe.md](wireframe.md)):
- Typeahead with entity suggestions (Personen | Briefe | Orte)
- Grouped results
- Sortierung: Relevanz | Datum | Häufigkeit

9. Person List View:
- Sortable table: Name | Dates | Role | Letters | Mentions
- Pagination (50 per page)
- Export CSV

### Phase 3 - Advanced

10. Network Graph ([wireframe.md](wireframe.md)):
- Dual-layer: Co-mentions (CMIF) + AGRELON relations (SNDB)
- Filter by relationship type (44 AGRELON categories)
- Time slider: Fade edges outside selection
- Node detail on click → Person profile

11. Letter Detail View ([wireframe.md](wireframe.md)):
- Metadata: Sender, Recipient (Goethe), Date, Place, Language
- Regest (always available)
- TEI link (if hasTextBase available, 15.7%)
- Mentioned entities panel

12. Stories Module ([wireframe.md](wireframe.md)):
- Curated dossiers (hybrid text + visualizations)
- Deep-links to persons/letters/places
- Biographical texts from projekt-XML

13. Place Profiles:
- 633 places with GeoNames links
- Associated persons (senders + activity locations)
- Timeline of letters from location

14. Data Export & API:
- CSV/JSON export of search results
- Permalinks for all entities
- Link to CMIF TEI API: `https://api.goethe-biographica.de/exist/apps/api/v1.0/tei/get-records.xql`
- Link to SNDB: `https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:[ID]`

---

## 5. DESIGN SPECIFICATIONS

Visual Encoding ([design.md](design.md)):
- Color: Role (Absenderin/Erwähnte/Indirekt)
- Size: Frequency (letter count, mention count)
- Position: Space (lat/lon) + Time (year)
- Shape: Entity type (Person/Place/Letter)

Design System ([design.md](design.md)):
- Typography: 12/14/16/20/24/32 scale, line-height ≥ 1.4
- Spacing: 4/8/12/16/24/32
- Colors: Accessibility WCAG AA/AAA contrast
- Responsive: 3 breakpoints (≤640, ≤1024, >1024)
- Icons: Normdaten/Links/Export/Filter/Map/Timeline/Network

Atomic Components:
- Badge (GND/SNDB)
- Chip (Role/Relation type)
- Pill-Toggle (View switching)
- Tag (Language)
- Counter (Match count)
- Searchfield with Typeahead
- Facet Panel (Accordion)
- Person Card
- Letter List
- Mini-Map/Mini-Network (tooltips)

Key UI Patterns:
- Progressive disclosure (max 7–9 primary elements per view)
- Brushing & Linking (filter propagates across all views)
- Skeleton loading states
- Empty states with contextual prompts
- Data quality badges visible (GND/GeoNames available)

Responsiveness:
- Mobile: Facets in overlay/drawer
- Desktop: Facets in sidebar
- Map/Network: Focus mode on mobile (panel overlay)

---

## 6. DATA QUALITY & TRANSPARENCY

Visible Quality Indicators ([design.md](design.md)):
- Badges: ✓ GND | ✓ GeoNames | ✓ TEI available
- Confidence warnings: "Fuzzy name match (no GND)"
- Fallback indicators: "Regest only (TEI unavailable)"
- Data snapshot note: "SNDB Stand: Oktober 2025"

Error Handling:
- API timeout → Show cached regest
- Missing geodata → No map marker (visible in list only)
- Broken GND link → Warning + SNDB fallback

---

## 7. IMPLEMENTATION PHASES

### Phase 1: MVP (Week 1-2)
Goal: Interactive map with 3,617 women, basic filtering

Tasks:
1. Data pipeline script: XML → JSON conversion
2. Generate `docs/data/persons.json` with: ID, Name, Lat/Lon, Role, LetterCount, MentionCount, GND, SNDB, Dates
3. Build HTML skeleton with global navigation
4. Implement Leaflet.js map with clustering
5. Add sidebar with Role + Normierung filters
6. Person popup with basic info
7. Deploy to GitHub Pages

Deliverables:
- Functional map view
- 3,617 women visible (subset with geodata as markers)
- Click → popup → basic profile
- 2 facet filters working

### Phase 2: Enrichment (Week 3-4)
Tasks:
1. Timeline view (D3.js histogram)
2. Person detail pages (6 tabs)
3. Unified search with typeahead
4. Person list view with export
5. Letter data integration
6. Brushing & linking between map/timeline/list

Deliverables:
- 3 views (map/timeline/list) synchronized
- Person profiles with all 6 tabs
- Search functional
- CSV export

### Phase 3: Advanced (Week 5-6)
Tasks:
1. Network graph (D3.js force-directed)
2. AGRELON filtering (44 types)
3. Letter detail pages
4. Place profiles
5. Stories module (1-2 curated examples)
6. Full API integration (TEI, SNDB links)

Deliverables:
- Complete system per design.md
- All 6 main navigation sections functional
- Stories published

---

## 8. TECHNICAL RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large dataset (3,617 persons) | Slow map rendering | Clustering + virtualization; consider server-side aggregation |
| Low TEI coverage (15.7%) | Limited full-text access | Always show Regests as fallback; mark TEI availability clearly |
| Missing GND (46.6% SNDB) | Ambiguous person matching | Fuzzy name matching; mark confidence; link to SNDB |
| Geographic concentration (Weimar 34%) | Cluster overlap on map | Use spider-cluster or zoom-dependent decluttering |
| Network graph complexity | Performance with 6,580 edges | Prune to women-only subgraph; lazy-load on demand |
| Static site limitation | No backend processing | Pre-compute all aggregations during build |
| Data updates (PROPYLÄEN until 2039) | Stale data | Versioning note in footer; manual rebuild process |

---

## 9. SUCCESS METRICS

Performance:
- TTI (Time to Interactive) ≤ 2 seconds
- Map render with 3,617 persons ≤ 1 second
- Search typeahead response ≤ 100ms

Usability:
- All top 5 user tasks completable in ≤ 3 clicks
- Mobile-responsive (3 breakpoints)
- Accessibility: WCAG AA contrast, keyboard navigation

Data Coverage:
- All 3,617 women visible (list view)
- ≥60% with geodata (map markers)
- ≥50% with biographical text (from projekt-XML)

---

## 10. OUT OF SCOPE (Future Enhancements)

- Real-time API integration (use static snapshots)
- User accounts / saved searches
- Collaborative annotations
- RDF/SPARQL endpoint
- Integration with external DH platforms beyond links
- Machine learning for entity disambiguation
- Automatic data updates from PROPYLÄEN

---

## 11. DEPENDENCIES & PREREQUISITES

Data Files Required:
- `data/ra-cmif.xml` (15,312 letters, 23.4 MB)
- `data/SNDB/*.xml` (14 files, 32 MB total)

External APIs (optional, Phase 3):
- CMIF TEI API: `https://api.goethe-biographica.de/...`
- SNDB Online: `https://ores.klassik-stiftung.de/ords/...`

Build Tools:
- Python 3.x (XML parsing, JSON generation)
- Node.js (optional: for build automation, minification)
- Git/GitHub (version control, Pages hosting)

Frontend Libraries:
- Leaflet.js 1.9+ (map)
- D3.js 7+ (timeline, network)
- Modern browser with ES6+ support

---

## SUMMARY: Minimum Viable Product Definition

Phase 1 MVP includes:
1. Interactive map (Leaflet.js, clustering, 3,617 women)
2. Person popups (name, dates, role, letter count, GND/SNDB badges)
3. Sidebar filters (Role, Normierung)
4. Global navigation skeleton
5. Data pipeline (XML → JSON)
6. GitHub Pages deployment
7. Performance target: <2s TTI

Excludes from Phase 1:
- Timeline view (Phase 2)
- Network graph (Phase 3)
- Person detail pages (Phase 2)
- Search (Phase 2)
- Stories (Phase 3)

Data Requirements Phase 1:
- `persons.json`: ID, Name, Lat, Lon, Role, LetterCount, MentionCount, GND, SNDB, BirthYear, DeathYear
- ~7 MB JSON file (acceptable for static hosting)

---

References:
- [project.md](project.md) - Project goals, data integration
- [data.md](data.md) - Data model, schemas
- [design.md](design.md) - UI/UX specifications
- [wireframe.md](wireframe.md) - View specifications
- [research-context.md](research-context.md) - DH standards, limitations

Next Steps:
1. Build data pipeline script (preprocessing/build_json.py)
2. Generate persons.json
3. Implement map view (docs/index.html + docs/app.js)
4. Deploy to GitHub Pages
