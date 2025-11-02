# HerData Frontend

Interactive web application for exploring 448 women in Johann Wolfgang von Goethe's correspondence network (1762-1824).

Live: https://chpollin.github.io/HerData/

## Project Overview

HerData visualizes women in Goethe's correspondence through an interactive map, detailed person profiles, and statistical dashboards. Built as a static web application optimized for GitHub Pages deployment.

Current Dataset:
- 448 curated women from SNDB authority files
- 15,312 letters from CMIF (Correspondence Metadata Interchange Format)
- 227 women with geographic coordinates (50.7%)
- 207 women with occupation data (46%)
- 270 women with GND identifiers (60.3%)
- 84 AGRELON relations (67 persons connected, 41 geo-located)

## Application Structure

### Pages

1. **index.html** - Interactive Map (Main Entry Point)
   - MapLibre GL JS visualization with clustering
   - **Network visualization with hover-based connections**
   - Real-time filtering by letter activity and occupation groups
   - Time period slider (1762-1824)
   - Search with typeahead (448 persons)
   - WebGL rendering for performance

2. **person.html** - Person Detail Pages
   - Card-based layout (no tabs)
   - Biography from SNDB regestausgabe
   - Correspondence statistics (letters sent/mentioned)
   - Geographic locations with mini-map
   - Occupations and professions
   - Data quality indicators with icons
   - Citation text with copy button
   - GND/SNDB authority links

3. **stats.html** - Statistical Dashboard
   - 5 interactive charts using Apache ECharts
   - Berufsverteilung (Top 15 occupations)
   - Brief-Timeline (1772-1824 temporal distribution)
   - Geografische Zentren (Top 10 places)
   - Generationen (Birth cohorts by decade)
   - Briefaktivität (Activity categories)
   - CSV/PNG export for each chart

### Component Architecture

```
docs/
├── index.html              # Map view
├── person.html             # Person profiles
├── stats.html              # Statistics dashboard
│
├── components/
│   ├── navbar.html         # Shared navigation (with search & stats)
│   └── navbar-simple.html  # Simple navigation (for person pages)
│
├── js/
│   ├── app.js              # Main map application (920 lines)
│   ├── network-utils.js    # Network connection utilities (160 lines)
│   ├── data.js             # Shared data loading module (55 lines)
│   ├── person.js           # Person page logic (434 lines)
│   ├── stats.js            # Chart rendering & export (612 lines)
│   ├── search.js           # Global search with typeahead (183 lines)
│   └── navbar-loader.js    # Component loader (34 lines)
│
├── css/
│   ├── tokens.css          # Design system tokens (158 lines)
│   ├── style.css           # Map styles & responsive layout (1028 lines)
│   ├── person-cards.css    # Person page card layout (383 lines)
│   ├── stats.css           # Dashboard grid styling (236 lines)
│   ├── search.css          # Search dropdown styles (96 lines)
│   └── network.css         # Network view (archived, not imported)
│
└── data/
    └── persons.json        # Complete dataset (447 KB, 448 persons)
```

## Technology Stack

Frontend:
- MapLibre GL JS 4.7.1 (WebGL map rendering with clustering)
- Apache ECharts 5.5.0 (Interactive statistical charts)
- noUiSlider 15.7.1 (Dual-handle range slider)
- Vanilla JavaScript ES6 modules (no framework)
- CSS custom properties (design system)

Data Format:
- GeoJSON for geographic visualization
- JSON for person metadata and relationships
- TEI-XML/CMIF for letter metadata (source)

Standards:
- Semantic HTML5
- ARIA labels for accessibility
- Responsive design (mobile-first)
- Progressive enhancement

## Features

Map Visualization:
- Cluster-based rendering (227 women with coordinates)
- **Network visualization with hover-based connections:**
  - 84 AGRELON relations from SNDB
  - Color-coded lines: Familie (red), Beruflich (green), Sozial (orange)
  - Real-time rendering on marker/cluster hover
  - 41 persons with geo-located connections
- Role-based color coding:
  - Steel Blue: Letter senders
  - Medium Gray: Mentioned persons
  - Forest Green: Both roles
  - Light Gray: Indirect evidence (SNDB only)
- Interactive popups with person data
- Real-time filter updates

Filtering System:
- Letter Activity: Sender, Mentioned, SNDB-only
- Occupation Groups: 7 categories (artistic, literary, musical, court, education, other, none)
- Time Period: 1762-1824 slider with live update

Search:
- Typeahead with keyboard navigation (Arrow keys, Enter, Escape)
- Highlighting of matched text
- Direct links to person pages

Person Profiles:
- Biography with SNDB markup parsing
- Letter statistics with visual indicators
- Geographic locations on mini-map
- Professional activities
- Data quality transparency
- One-click citation copying

Statistical Analysis:
- Quantitative visualizations of occupation distribution
- Temporal patterns in correspondence
- Geographic concentration analysis
- Generational cohort analysis
- Data quality transparency

Export Functionality:
- CSV format with proper headers
- PNG format at 2x resolution
- Per-chart export buttons

## Data Pipeline

Source → Processing → Visualization:

1. **Source Data:**
   - CMIF XML: 15,312 letters (ra-cmif.xml, 23.4 MB)
   - SNDB Export: 448 women (8 XML files, 800 KB)
   - SNDB Geodata: Coordinate resolution (3.6 MB)

2. **Processing:**
   - Pipeline: preprocessing/build_herdata_new.py
   - 7 phases: identification, enrichment, validation
   - Runtime: 0.63 seconds
   - Test suite: 48 tests, all passing

3. **Output:**
   - docs/data/persons.json (447 KB)
   - Metadata in JSON structure
   - Timeline data pre-aggregated
   - 100% data integrity

## Local Development

Start a local server:

```bash
# Python 3
cd docs
python -m http.server 8000

# Node.js
npx http-server docs -p 8000

# PHP
php -S localhost:8000 -t docs
```

Then visit: http://localhost:8000

No build process required - all dependencies loaded via CDN.

## Browser Requirements

Modern browsers with WebGL and ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

Required Features:
- ES6 modules (import/export)
- Fetch API
- Clipboard API (for citation copying)
- CSS custom properties
- WebGL (for map rendering)

## Performance

Initial Load:
- persons.json: 447 KB (gzipped: ~100 KB)
- Total assets: ~1.2 MB (including map tiles)
- Time to interactive: <3 seconds on 3G

Runtime:
- Map rendering: WebGL accelerated
- Filter updates: <100 ms
- Chart rendering: <500 ms
- Search: Real-time typeahead

Optimization:
- MapLibre clustering for dense areas
- Lazy loading of person pages
- Component-based navbar (DRY principle)
- Minimal external dependencies

## Deployment

GitHub Pages Configuration:
- Source: `docs/` directory
- Branch: `main`
- Custom domain: Not configured
- HTTPS: Enforced

Deploy Steps:
1. Commit changes to `docs/` directory
2. Push to `main` branch
3. GitHub Actions builds automatically
4. Live in 2-3 minutes

URL: https://chpollin.github.io/HerData/

## Accessibility

WCAG 2.1 Level A Compliance:
- Semantic HTML5 elements (nav, main, aside)
- ARIA labels on interactive elements
- Keyboard navigation for search
- Focus indicators on all controls
- Alternative text for visual information
- Role attributes for screen readers

Keyboard Shortcuts:
- Arrow Up/Down: Navigate search results
- Enter: Select search result
- Escape: Close search/dialogs
- Tab: Standard navigation

## Known Limitations

Data Coverage:
- 49% of women are indirect evidence only (SNDB, no letters)
- 50% lack geographic coordinates
- 54% lack occupation data
- Geodata resolution limited to place names (no coordinates for all)

Removed Features:
- Timeline view (removed in Session 10 for UX simplification)
- Network visualization (archived, force-graph implementation exists)

Future Enhancements:
- Relationship network visualization (AGRELON data available)
- Enhanced accessibility (color patterns for colorblind users)
- Full JSON export of filtered datasets
- Advanced temporal analysis (lifespan timelines)

## Architecture Decisions

Key Technical Choices:
- ADR-001: MapLibre GL JS over Leaflet (WebGL performance)
- ADR-002: Multi-person popups for overlapping coordinates
- ADR-003: Cluster color encoding based on predominant role
- ADR-008: Curated dataset (448 women) over complete SNDB export

Design Principles:
- Static-first (no backend required)
- Progressive enhancement
- Mobile-first responsive design
- Academic color palette (navy blue, steel blue)
- Research-oriented interface

Component Strategy:
- Shared navbar via async loading
- Card-based layouts (no tabs)
- Modular CSS with custom properties
- ES6 modules for code organization

## Documentation

Project Documentation:
- `/README.md` - Complete project overview
- `/documentation/JOURNAL.md` - Development session log (14 sessions)
- `/knowledge/` - Architecture and design documentation

Technical Documentation:
- `/preprocessing/README.md` - Data pipeline documentation
- This file (`/docs/README.md`) - Frontend deployment guide

Code Documentation:
- Inline comments explain "why" not "what"
- Function-level docstrings where appropriate
- Architecture Decision Records (ADRs) in knowledge/decisions.md

## Credits

Data Sources:
- SNDB (Sammlung Normdaten Biographica) - Biographical authority files
- CMIF (Correspondence Metadata Interchange Format) - Letter metadata
- GND (Gemeinsame Normdatei) - Authority identifiers
- OpenStreetMap - Base map tiles

Libraries:
- MapLibre GL JS (BSD-3-Clause)
- Apache ECharts (Apache-2.0)
- noUiSlider (MIT)

Project:
- PROPYLÄEN: Goethe Biographica
- Center for Information Modeling, University of Graz
- Christopher Pollin (Project Lead)

License: CC BY 4.0

## Support

Issues: https://github.com/chpollin/HerData/issues
Documentation: https://github.com/chpollin/HerData/wiki
Contact: christopher.pollin@uni-graz.at
