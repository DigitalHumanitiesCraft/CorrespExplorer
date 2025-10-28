# HerData Journal

## 2025-10-19

### Session 1: Data Verification & Initial Documentation
- Fixed script paths, verified CMIF (15,312 letters)
- Counted SNDB: 23,571 persons (3,617 women/15.3%), 4,007 places
- Discovered SEXUS field (not GESCHLECHT)
- GND coverage: 53.4% SNDB, 93.8% CMIF senders
- Created: data.md, project.md, research-context.md, TODO-Dokumentation.md
- Initial commit [dbef54b]: 22 files
- Refactored TODO to neutral reporting, created JOURNAL.md

### Session 2: Project Overview & Repository Setup  
- Analyzed project structure, created comprehensive README.md
- Set up docs/ for GitHub Pages (placeholder)
- Created requirements.md: 14 user stories, 5 epics, 10 functional requirements
- Created IMPLEMENTATION_PLAN.md: 7-day Phase 1 breakdown
- Created CLAUDE.md: style guidelines (no bold, no emojis, no time estimates)
- Decision: Exclude .claude/ from git, use relative paths

### Session 3: Data Pipeline Implementation
- Project status: 95% docs complete, 5% code
- Implemented build_herdata.py: 4-phase pipeline, 1.39s runtime
- Fixed XML fields: SEXUS, ART+JAHR, SNDB_ID, BEZEICHNUNG, LATITUDE/LONGITUDE
- Phase 1: Extracted 3,617 women, 34.1% GND, 83.9% with dates
- Phase 2: Matched 808 to CMIF (192 senders, 772 mentioned)
- Phase 3: Enriched 1,042 with geodata (28.8%), 979 with occupations
- Phase 4: Generated docs/data/persons.json (1.49 MB)
- Windows fix: [OK] instead of Unicode checkmarks
- Finding: Ancient figures (9 persons <1000 CE), women lower GND than average
- Created build_herdata_test.py: 48 tests, all passing, 1.73s execution

### Session 4: Frontend Implementation
- Created docs/ structure: css/, js/, assets/
- Implemented index.html: navigation, filters, map container
- Built CSS design system: responsive breakpoints, typography scale
- Added data validation script (40 lines), validates 3,617 women
- Created favicon.svg, zero console errors
- Responsive: mobile ≤640px, tablet ≤1024px, desktop >1024px
- Commit [860ebce]: 509 lines added

### Session 4 (continued): Design Refinement
- Changed purple gradient → academic navy blue (#1e3a5f)
- Updated design.md: section 6.1.1 Farbpalette
- Defined steel blue (#2c5f8d) for accents
- Simplified favicon to solid navy
- Rationale: academic resources need trustworthy visual language
- Commit [8d8c896]: 75 insertions, 32 deletions

### Session 4 (continued): Architecture Decision
- Moved JOURNAL.md to documentation/
- Created ADR-001 in decisions.md: MapLibre vs Leaflet vs OpenLayers
- Analysis: Phase 2/3 needs brushing, linking, animations, heatmap
- Decision: MapLibre GL JS for WebGL rendering
- Trade-offs: 220 KB bundle (vs 40 KB Leaflet), steeper learning curve
- Commits: [f579aba] move, [5290160] ADR (201 lines)

### Session 5: MapLibre MVP Implementation
- Analyzed status: pipeline complete, frontend 10%
- Replaced Leaflet CDN with MapLibre GL JS 4.7.1
- Implemented map: OSM tiles, center Weimar (11.3235, 50.9795)
- Built GeoJSON from persons.json: 1,042 features
- Added clustering: maxZoom=14, radius=50, step-based sizing
- Three layers: clusters, counts, individual markers
- Role-based colors: sender/mentioned/both/indirect
- Zoom-based markers: 4px→12px (z5→z15)
- Click handlers: zoom clusters, popup markers
- Connected filters to real-time map updates
- Tab switching with map resize on Karte activation
- Commit [e75156a]: 419 lines JavaScript, 480 insertions
- Bugfixes: glyphs property [97a2869], font fix [c2860bd]

### Session 6: Clustering Improvements & Multi-Person Popups
- Updated README.md with GitHub Pages link
- Reduced clusterMaxZoom 14→10 (clusters break earlier)
- Reduced clusterRadius 50→40 (less aggressive)
- Increased marker sizes: 6/10/16px (was 4/8/12px)
- Commit [734908d]: clustering optimization
- Problem: 217 women at Weimar coords, only top clickable
- Solution: queryRenderedFeatures() for all markers at point
- Implemented multi-person popup: 15 initial, expandable
- Created ADR-002 for decision documentation
- Commit [9014a40]: multi-person implementation

### Session 7: Search Implementation
- Added search bar to navigation
- Implemented fuzzy search with Fuse.js (threshold: 0.3)
- Searchable fields: name, name_variants, gnd_name
- Results dropdown: max 10, shows name + dates + badges
- Click behavior: zoom to location (z12) or show alert if no coords
- Keyboard: arrow navigation, enter to select, escape to close
- Auto-close on outside click
- Commit: search functionality complete

### Session 8: Statistics Dashboard
- Created Statistiken tab with 4 sections
- Overview cards: total, letters, geodata percentages
- Charts: role distribution (pie), top locations (bar), occupations (horizontal bar)
- Time analysis: birth/death year histograms
- Responsive grid layout, mobile-optimized
- Chart.js integration for visualizations
- Commit: statistics implementation

### Session 9: Research Interface Improvements
- User feedback: "Es soll ja ein Forschungsinterface sein"
- Problem: All clusters blue, no visual hierarchy
- Renamed filter: Rolle → Briefaktivität
- Removed filter: Normierung (GND/SNDB)
- Added filter: Berufsgruppe (7 occupation categories)
- 231 unique occupations → 7 groups: Künstlerisch (222), Literarisch (199), etc.
- Cluster colors by majority: blue=writers, green=mixed, gray=mentioned, light=SNDB
- Added legend: bottom-right, 4 color categories
- Enhanced tooltips: "111 Frauen | 45 geschrieben • 58 erwähnt • 8 SNDB"
- Commit [2f2479a]: research interface improvements

### Session 10: Timeline Visualization and Architecture Refinement

Initial Implementation (D3.js Timeline):
- Created timeline.js module (252 lines) with D3.js histogram
- 62-year visualization (1762-1824), bar chart
- Initial design: Brush selection (d3.brushX) for temporal filtering
- Commit [c452743]: 389 insertions, 4 files changed

Critical Bug Discovery and Fix:
- Problem: Timeline tried loading 23.4 MB ra-cmif.xml from docs/data/ (404 Not Found)
- Root Cause: File not in GitHub Pages deployment (too large)
- Lesson Learned: Tests didn't catch deployment issues (only tested pipeline logic)
- Solution: Extended data pipeline to extract letter_years during Phase 2
- Added letter_years array to each person in persons.json
- Added aggregated timeline data to meta.timeline (54 years with data)
- Timeline now loads from persons.json (1.56 MB) instead of XML
- Commit [9e1ae34]: Fixed data loading architecture

Architecture Revision (UX Improvement):
- Removed D3 brush selection from timeline (unfamiliar UI pattern)
- Replaced with hover tooltips for data exploration
- Moved temporal filtering to sidebar (consistent with other filters)
- Added dual-handle range slider using noUiSlider 15.7.1
- Single line display: "1762 – 1824" with two draggable handles
- Commit [ac1d6df]: Brush → Sidebar filter architecture change
- Commit [4137177]: Fixed hover tooltips (bar width, cursor pointer, z-index)
- Commit [edfcb00]: Integrated noUiSlider for professional UX

Final Implementation:
- Timeline: Pure visualization with hover tooltips
- Sidebar Filter: Year range slider (1762-1824)
- Brushing & Linking: Slider ↔ Map ↔ Timeline synchronization
- Performance: <500ms timeline render, <100ms filter updates (targets met)
- Data: 13,414 letters with dates, ~13,000 letter-year entries
- ADR-005: Status changed from Proposed → Implemented → Revised

Lessons Learned:
- Integration tests needed (deployment scenarios, not just pipeline)
- Frontend should use processed data (JSON), not raw data (XML)
- UX patterns: Consistency matters (sidebar filters > embedded controls)
- Iterate on feedback: Brush selection → Hover + Sidebar was better UX

Total Commits Session 10: 6 commits, ~500 lines changed

## 2025-10-28

### Session 11: Curated Dataset Integration and Pipeline Refactoring

Discovery of New Data Export:
- Found new-data/Datenexport 2025-10-27/ with 8 XML files (800 KB)
- Export date: 27 October 2025 (yesterday)
- 448 women (12.4% of full SNDB 3,617)
- File structure: ra_ndb_* (Regestausgabe) instead of pers_koerp_*
- No geodata files included (geo_main.xml, geo_indiv.xml, geo_links.xml missing)

Data Quality Comparison (New vs Old):
- Created compare_data_sources.py (390 lines) for systematic comparison
- GND coverage: 60.3% (new) vs 34.1% (old) = +76.8% improvement
- Date coverage: 94.0% (new) vs 83.9% (old) = +12.0% improvement
- CMIF match: 51.3% (new) vs 22.3% (old) = +130% relative improvement
- Geodata: 50.7% (new) vs 28.8% (old) = +76.0% relative improvement
- Overlap: 447 women in both datasets, 3,170 only in old, 1 only in new
- GND data: Identical for common women (no updates, just curated subset)

Decision: Use Only New Data with Hybrid Approach:
- Rationale: Quality over quantity (curated, research-relevant subset)
- 60.3% GND coverage nearly double vs 34.1% (full SNDB)
- Focused on 448 regest-relevant women with better documentation
- All 448 have biographical texts (projekt_regestausgabe.xml)
- Hybrid geodata: New export place refs + old SNDB coordinate resolution

Pipeline Refactoring:
- Created build_herdata_new.py (663 lines) with hybrid approach
- Phase 1: Load ra_ndb_main.xml, ra_ndb_indiv.xml, ra_ndb_datierungen.xml (new)
- Phase 2: CMIF matching (unchanged logic, better GND base)
- Phase 3: HYBRID geodata enrichment
  - ra_ndb_orte.xml (new) → SNDB_ID references
  - geo_main.xml (old) → Place names resolution
  - geo_indiv.xml (old) → Coordinates resolution
  - ra_ndb_berufe.xml (new) → Occupations
  - ra_ndb_beziehungen.xml (new) → AGRELON relationships
- Phase 4: JSON generation with metadata update

Results and Performance:
- Total: 448 women processed
- GND: 270 (60.3%)
- Dates: 421 (94.0%)
- CMIF match: 230 (51.3%) - 191 senders, 195 mentioned
- Geodata: 227 (50.7%) via hybrid approach
- Occupations: 207 (46.2%)
- Timeline: 53 years with data
- Output: persons.json 0.29 MB (was 1.56 MB = 81% reduction)
- Runtime: 0.63s (was 1.4s = 55% faster)
- All 48 tests passing

Why Old Geodata Files Are Essential:
- New export has ra_ndb_orte.xml with SNDB_ID references only
- Example: SNDB_ID 79627 (Weimar)
- geo_main.xml (old): 79627 → "Weimar" (place name)
- geo_indiv.xml (old): 79627 → Lat 50.9795, Lon 11.3235
- Without old geo files: NO map visualization possible
- 121 unique SNDB_IDs in new export, all resolvable via old geo files

Documentation Updates:
- Updated knowledge/data.md: New statistics, hybrid architecture diagram
- Updated README.md: Project status, data sources, repository structure
- Created ADR-008: Curated dataset selection strategy (quality over quantity)
- Updated JOURNAL.md: Session 11 complete documentation

Key Insights:
- New export is curated subset, not quality update of existing data
- GND IDs identical for common women (no new linkages)
- Selection criteria: Regestausgabe relevance, better data completeness
- Hybrid approach necessary: New person data + old geodata = complete system
- Old SNDB geo files are architectural dependency (cannot be removed)

Technical Debt Addressed:
- Maintained both pipelines: build_herdata.py (old, reference) + build_herdata_new.py (new, active)
- Created comparison tool for future data quality monitoring
- Documented architectural decision in ADR-008

Total Commits Session 11: 0 commits (documentation phase, changes pending review)