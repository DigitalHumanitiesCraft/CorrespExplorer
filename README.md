# HerData

Semantic Processing and Visualization of Women in Goethe's Correspondence (1762-1824)

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Data Source: Zenodo](https://img.shields.io/badge/Data-Zenodo%2014998880-blue)](https://zenodo.org/records/14998880)
[![Project: PROPYLÄEN](https://img.shields.io/badge/Project-PROPYL%C3%84EN-green)](https://goethe-biographica.de)

## Overview

HerData makes visible the women in Johann Wolfgang von Goethe's correspondence network by integrating two complementary data sources: CMIF letter metadata and SNDB biographical authority files. The project transforms historical XML data into an interactive, explorable visualization for scholars, students, and the culturally interested public.

Key Goals:
- Identification of women who corresponded with Goethe (as senders and mentioned persons)
- Contextualization through biographical, geographic, temporal, and social network data
- Visualization via interactive maps, timelines, and network graphs
- Narrativization using biographical texts from project-specific XML files

## Project Status

Current Phase: Enhanced with Curated Dataset (Export 2025-10-27)

Live Demo: [https://chpollin.github.io/HerData/](https://chpollin.github.io/HerData/)

Latest Update (2025-10-28):
- NEW: Curated dataset of 448 women with significantly improved data quality
- NEW: 60.3% GND coverage (was 34.1% - nearly doubled)
- NEW: 51.3% CMIF match rate (was 22.3% - increased by 130%)
- NEW: Hybrid data approach (new export + old geodata resolution)
- NEW: Pipeline refactored for ra_ndb_* file structure
- JSON dataset: 0.29 MB (was 1.56 MB - 81% reduction)
- Pipeline performance: 0.63s (was 1.4s - 55% faster)

Completed Features:
- Data ingestion with hybrid approach (15,312 letters, 448 curated women)
- Python pipeline refactored (build_herdata_new.py with 48 tests)
- Interactive map with MapLibre GL JS (WebGL rendering, clustering)
- Research-oriented filtering: Briefaktivität and Berufsgruppe (7 occupation groups)
- Visual hierarchy: Cluster colors encode letter activity
- Person detail pages with modern card-based layout (no tabs)
- Central search with typeahead and keyboard navigation
- Comprehensive accessibility (ARIA labels, keyboard navigation)
- Shared navbar component (DRY principle)
- Corrected statistics: 448 women, 227 places with geodata
- ADR-001: MapLibre GL JS selected over Leaflet
- ADR-002: Multi-person popup for overlapping markers
- ADR-003: Cluster color encoding for research interface
- ADR-008: Curated dataset selection strategy
- GitHub Pages deployment

Removed Features (UX simplification):
- Timeline removed: Simplified to focus on core map visualization
- Network tab removed: Out of scope for current phase

## Repository Structure

```
HerData/
│
├── README.md                    # This file
├── JOURNAL.md                   # Project session log & decisions
├── .gitignore                   # Git exclusions
│
├── knowledge/                   # Complete project documentation
│   ├── data.md                  # Data model & entity relationships (12.5 KB)
│   ├── project.md               # Project goals & implementation strategy (9.3 KB)
│   ├── research-context.md      # Scientific & DH context (4 KB)
│   ├── design.md                # UI/UX design system & interaction patterns
│   └── TODO-Dokumentation.md    # Identified documentation gaps (reference notes)
│
├── data/                        # Raw datasets (not committed, see below)
│   ├── ra-cmif.xml              # 15,312 letters in TEI-XML/CMIF (23.4 MB)
│   ├── analysis-report.md       # Generated statistical analysis
│   └── SNDB/                    # Geographic data (3.6 MB, for coordinate resolution)
│       ├── geo_main.xml         # 4,007 places with names
│       ├── geo_indiv.xml        # 22,571 coordinates
│       └── geo_links.xml        # 63,766 GeoNames linkages
│
├── new-data/                    # NEW: Curated export (2025-10-27)
│   └── Datenexport 2025-10-27/  # 8 XML files with 448 women (800 KB)
│       ├── ra_ndb_main.xml              # 797 entries (448 unique IDs, names)
│       ├── ra_ndb_indiv.xml             # 448 women (SEXUS='w', GND)
│       ├── ra_ndb_datierungen.xml       # 869 life dates
│       ├── ra_ndb_berufe.xml            # 296 occupations
│       ├── ra_ndb_orte.xml              # 552 place links (SNDB_ID refs)
│       ├── ra_ndb_beziehungen.xml       # 939 AGRELON relationships
│       ├── projekt_regestausgabe.xml    # 448 biographical texts
│       └── nsl_agrelon.xml              # 38 relationship types
│
├── preprocessing/               # Data analysis & transformation scripts
│   ├── analyze_goethe_letters.py    # CMIF parser & statistical report generator
│   ├── build_herdata_new.py         # NEW: Pipeline for curated export (active)
│   ├── build_herdata.py             # OLD: Pipeline for full SNDB (reference)
│   ├── compare_data_sources.py      # Data quality comparison tool
│   └── compare_output.txt           # Comparison analysis results
│
└── docs/                        # GitHub Pages site (web visualization)
    └── (future: interactive visualization app)
```

## Data Sources

HerData uses a hybrid approach combining three data sources:

### 1. CMIF Letter Metadata (ra-cmif.xml)

Source: PROPYLÄEN Project, Klassik Stiftung Weimar
Format: TEI-XML/CMIF Standard
License: CC BY 4.0
DOI: [Zenodo 14998880](https://zenodo.org/records/14998880)
Coverage: 1760–1824 (64 years)
Snapshot: March 2025

Contents:
- 15,312 letters from 2,525 senders to Goethe
- 633 unique places (Weimar 34%, Jena 15%, Berlin 7%)
- 67,665 person mentions (14,425 unique persons)
- 3,914 bibliographic mentions (2,147 unique works)
- 380 organization mentions (120 unique organizations)

### 2. SNDB Curated Export (NEW - Active as of 2025-10-28)

Source: PROPYLÄEN Project / Klassik Stiftung Weimar
Format: XML (ra_ndb_* file structure)
Export Date: 27 October 2025
Size: 8 files, 800 KB

Contents:
- 448 curated women (12.4% of full SNDB, focus on regest-relevant persons)
- 60.3% GND coverage (nearly double the full SNDB rate)
- 94.0% with life dates
- 51.3% with CMIF letter connection
- 50.7% with geodata
- 448 biographical texts (projekt_regestausgabe.xml)
- 939 AGRELON relationships

Data Quality Improvements vs. Full SNDB:
- GND coverage: +76.8% (60.3% vs 34.1%)
- Date completeness: +12.0% (94.0% vs 83.9%)
- CMIF match rate: +130% relative (51.3% vs 22.3%)
- Geodata coverage: +76.0% relative (50.7% vs 28.8%)

### 3. SNDB Geographic Data (OLD - Essential for Coordinate Resolution)

Source: Klassik Stiftung Weimar
Format: XML (geo_* file structure)
Size: 3 files, 3.6 MB

Why still needed:
The new curated export contains place references (SNDB_ID) but not the actual place names or coordinates. The old SNDB geodata files resolve these references:

- geo_main.xml: 4,007 places with names
- geo_indiv.xml: 22,571 coordinate sets
- geo_links.xml: 63,766 GeoNames linkages

Pipeline workflow:
1. ra_ndb_orte.xml (new) → SNDB_ID: 79627
2. geo_main.xml (old) → "Weimar"
3. geo_indiv.xml (old) → Lat: 50.9795, Lon: 11.3235

Authority Coverage:
- 93.8% GND IDs for senders
- 91.6% GeoNames IDs for places
- 82.5% GND IDs for mentioned persons

Peak Period: 1810s (4,592 letters, 30% of corpus)
Languages: 96.9% German, 2.7% French, 0.4% other

### 2. SNDB Biographical Authority Files

Source: Sammlung Normdaten Biographica, Klassik Stiftung Weimar
Format: 14 XML files (relational database export)
Data Snapshot: October 2025 (structurally stable, ~2 years old)

Contents:
- 23,571 unique person IDs (27,835 total entries with name variants)
  - 3,617 women (15.3%) ← *Primary target group*
  - 16,572 men (70.3%)
  - 3,382 no gender data (14.3%)
- Gender field: `SEXUS` (values: `m`, `w`)
- GND coverage: 53.4% (12,596 persons)
- 4,007 places with GeoNames linkage
- 6,580 relationships (AGRELON ontology: 44 types)
- 29,375 occupation entries (multiple per person)
- 21,058 location assignments (birth/death/activity places)

Biographical Narratives:
- 6,790 entries from letter edition project
- 20,128 entries from regest edition (largest)
- 2,254 entries from BUG (Biographica Universalis Goetheana)
- 1,004 diary mentions

## Data Integration Strategy

### Linkage Points

1. GND-ID Matching (primary): CMIF `persName@ref` ↔ SNDB `GND` field
2. SNDB Internal: `ID` links all 14 SNDB files
3. Geographic: CMIF `placeName@ref` (GeoNames) ↔ `geo_links.xml`
4. Fallback: Name-based fuzzy matching when GND unavailable

### Processing Pipeline (4 Phases)

Phase 1: Identify Women
- Load all IDs from `pers_koerp_main.xml` (23,571 unique)
- Filter `SEXUS=w` in `pers_koerp_indiv.xml` → 3,617 women
- Extract SNDB-IDs and GND-IDs (when available)

Phase 2: Match Letters
- Match CMIF senders against women's GND-IDs
- Match CMIF `mentionsPerson` against women's names/GND-IDs
- Result: Women as authors + women mentioned

Phase 3: Enrich Data
- Geographic: `pers_koerp_orte.xml` + `geo_*` files
- Temporal: `pers_koerp_datierungen.xml`
- Social: `pers_koerp_berufe.xml`
- Network: `pers_koerp_beziehungen.xml` + `nsl_agrelon.xml`

Phase 4: Narrativize
- Extract biographical texts from `projekt_*.xml` files
- Generate rich person profiles for visualization

## Technical Implementation

### Analysis Tool

Script: [`preprocessing/analyze_goethe_letters.py`](preprocessing/analyze_goethe_letters.py)

Functionality:
- Parses CMIF XML in 3–5 seconds using `xml.etree.ElementTree`
- Extracts senders, dates, places, mentions, languages, publication status
- Generates comprehensive [`data/analysis-report.md`](data/analysis-report.md) with 12 statistical sections

Dependencies: Python 3.x, `xml.etree.ElementTree` (stdlib)

Usage:
```bash
cd preprocessing
python analyze_goethe_letters.py
```

Output: `data/analysis-report.md` (15,312 letters analyzed, 240 lines)

### Interactive Map Visualization (MVP Complete)

- Live Application: [https://chpollin.github.io/HerData/](https://chpollin.github.io/HerData/)
- Technology: MapLibre GL JS 4.7.1 (WebGL rendering)
- Base Map: OpenStreetMap raster tiles
- Scope: 1,042 women with geodata (28.8% coverage)
- Features: Clustering, role-based coloring, real-time filtering, multi-person popups
- Performance: Instant filter updates, smooth zoom transitions
- Data Source: docs/data/persons.json (1.49 MB, 3,617 women total)
- Local Testing: Open docs/index.html or use local server
- Decision: ADR-001 documented MapLibre selection over Leaflet

### Person Detail Pages (Phase 2 - Complete)

- Live Example: [Anna Altmutter](https://chpollin.github.io/HerData/person.html?id=35267)
- Access: Click any person name in map popups or direct URL
- Structure: 6-tab layout (Überblick, Korrespondenz, Orte, Berufe, Netz, Quellen)
- Features:
  - Statistics overview (letters, mentions, places, occupations)
  - Interactive mini-map for person locations
  - GND and SNDB authority links
  - Automatic citation generator
- Data: All 3,617 women accessible via person.html?id=[SNDB-ID]
- Responsive: Mobile-optimized with 2-column stats grid

## Design System

See [`knowledge/design.md`](knowledge/design.md) for complete UI/UX specification.

Key Principles:
- Information Seeking Mantra: Overview → Zoom/Filter → Details on Demand (Shneiderman)
- Visual Encoding: Role (color), Frequency (size), Space/Time (position), Type (shape)
- Progressive Disclosure: Manage cognitive load with layered complexity

Primary Views:
1. Explorer (landing): Map view with integrated filtering with live faceting
2. Person Profile: 6 tabs (overview, correspondence, network, places, occupations, sources)
3. Letter Detail: Regest, metadata, mentioned entities, TEI link (when available)
4. Network Graph: AGRELON relationships + co-mentions, temporal filtering
5. Stories: Curated biographical dossiers

Faceting Dimensions:
- Role (sender/mentioned/indirect)
- Normalization (GND/SNDB-only/none)
- Time (exact/range, decade slider)
- Place (letter origin/activity location)
- Language (de/fr/en/it/la/vls)
- Text basis (Manuscript/Print/Copy/Draft)
- Publication (Abstract/Transcription)
- Relationship type (44 AGRELON categories)

## Research Context

### PROPYLÄEN Long-term Project

Institution: Klassik Stiftung Weimar
Duration: Until 2039
Scope: Digital edition of 20,000+ letters to Goethe from ~3,800 correspondents

Current Status:
- Complete: 1762–August 1786 (regests, transcriptions, digitizations)
- TEI-XML available: September 1786–1797 (downloadable 10.8 MB ZIP)
- Metadata online: 1786–1824 (senders, places, dates)
- Regests online: Through 1822
- Searchable full text: Through 1822
- TEI API coverage: 15.7% of letters

Latest Print Volume: Band 10 (1823–1824), J.B. Metzler 2023

### Digital Humanities Standards

- TEI (Text Encoding Initiative): Digital scholarly editions
- CMIF (Correspondence Metadata Interchange Format): Letter metadata exchange
- Linked Open Data: GND (Gemeinsame Normdatei), GeoNames
- AGRELON (Agent Relationship Ontology): 44 relationship types

### Gender Studies Perspective

HerData addresses:
- Visibility of marginalized historical actors
- Gender dynamics around 1800 through structured data
- Reconstruction of women's networks and agency
- Spatialization of female activity spheres

## Documentation

All documentation in [`knowledge/`](knowledge/) and [`documentation/`](documentation/) folders:

- [data.md](knowledge/data.md): Complete data model, XML schemas, entity relationships, API endpoints
- [project.md](knowledge/project.md): Project goals, implementation strategy, processing pipeline
- [research-context.md](knowledge/research-context.md): PROPYLÄEN project, DH standards, research questions
- [design.md](knowledge/design.md): UI/UX design system, information architecture, interaction patterns
- [decisions.md](knowledge/decisions.md): Architecture Decision Records (ADR-001, ADR-002)
- [JOURNAL.md](documentation/JOURNAL.md): Development sessions log with technical decisions
- [TODO-Dokumentation.md](knowledge/TODO-Dokumentation.md): Identified documentation gaps (reference notes, non-binding)

### Development Features

Debugging System (Session 8):

Color-coded browser console logging for troubleshooting:
- 🟢 INIT: Application initialization
- 🔵 RENDER: Map rendering and data updates
- 🟡 EVENT: Event handler registration
- 🟠 CLICK: User interactions with details
- 🔴 ERROR: Error messages

## Getting Started

### Prerequisites

- Python 3.x (for preprocessing scripts)
- Git (for cloning repository)
- Web browser (for future visualization)

### Installation

```bash
# Clone repository
git clone https://github.com/[your-username]/HerData.git
cd HerData

# Verify data files (not in repo, obtain separately)
# Place in data/ and data/SNDB/ directories
ls -lh data/ra-cmif.xml
ls data/SNDB/*.xml

# Run analysis
cd preprocessing
python analyze_goethe_letters.py
```

### Data Acquisition

CMIF File:
- Download from [Zenodo 14998880](https://zenodo.org/records/14998880)
- Place as `data/ra-cmif.xml`

SNDB Files:
- Contact: Klassik Stiftung Weimar (data export from internal database)
- Place in `data/SNDB/` directory (14 XML files)

## Citation

If you use HerData in your research, please cite:

```bibtex
@software{herdata2025,
  title = {HerData: Semantic Processing and Visualization of Women in Goethe's Correspondence},
  author = {Christopher Pollin},
  year = {2025},
  url = {https://chpollin.github.io/HerData/},
  note = {Data sources: PROPYLÄEN Project (Zenodo 14998880), SNDB Klassik Stiftung Weimar}
}
```

Data Source Citation:
```
PROPYLÄEN – Digitale Edition der Briefe an Goethe. Klassik Stiftung Weimar, 2025.
DOI: 10.5281/zenodo.14998880
```

---

## Acknowledgments

- Klassik Stiftung Weimar for PROPYLÄEN project data and SNDB authority files
- CMIF (Correspondence Metadata Interchange Format) working group
- TEI Consortium for text encoding standards
- GND (Deutsche Nationalbibliothek) and GeoNames for authority files

---

## Contact & Links

- Project Website: [https://chpollin.github.io/HerData/](https://chpollin.github.io/HerData/)
- GitHub Repository: [https://github.com/chpollin/HerData](https://github.com/chpollin/HerData)
- PROPYLÄEN Platform: https://goethe-biographica.de
- SNDB Online: https://ores.klassik-stiftung.de/ords/f?p=900
- Zenodo Dataset: https://zenodo.org/records/14998880

---

*Last Updated: 2025-10-19*
*Project Journal: [documentation/JOURNAL.md](documentation/JOURNAL.md)*
