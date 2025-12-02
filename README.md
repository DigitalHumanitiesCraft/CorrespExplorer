# CorrespExplorer

Interactive visualization tool for correspondence metadata in CMIF (Correspondence Metadata Interchange Format).

Live Demo: https://dhcraft.org/CorrespExplorer

## Overview

CorrespExplorer enables researchers to explore letter correspondence through an interactive web interface. Upload any CMIF-XML file or use the included example dataset to visualize correspondence networks on maps, timelines, and filterable lists.

Key Features:
- CMIF-XML file upload (drag-and-drop or URL)
- correspSearch API integration for direct queries
- Wikidata enrichment for biographical data (images, life dates, professions)
- Interactive map with location clustering
- Correspondent and letter lists with search and sorting
- Timeline visualization with language breakdown
- Topics explorer for subject analysis
- Places view for geographic analysis
- Multi-dimensional filtering (time, language, person, subject, place)
- CSV/JSON export of filtered data
- URL-based state sharing

## Quick Start

1. Visit https://chpollin.github.io/CorrespExplorer/
2. Upload a CMIF-XML file or select the example dataset (Hugo Schuchardt Archiv)
3. Explore the correspondence through different views

For local development:
```bash
cd docs
python -m http.server 8000
# Visit http://localhost:8000
```

## Example Dataset: Hugo Schuchardt Archiv

The included HSA dataset contains correspondence of linguist Hugo Schuchardt (1842-1927):

| Metric | Value |
|--------|-------|
| Letters | 11,576 |
| Correspondents | 846 |
| Places | 774 |
| Subjects | 1,622 |
| Languages | 18 |
| Time Period | 1859-1927 |

Source: Hugo Schuchardt Archiv, University of Graz

## Application Structure

```
docs/
  index.html          - Landing page with CMIF upload
  explore.html        - Main visualization interface
  about.html          - Project information

  js/
    cmif-parser.js           - Browser-based CMIF XML parser
    upload.js                - File upload, URL handling, config dialog
    explore.js               - Main visualization logic
    wikidata-enrichment.js   - Wikidata SPARQL enrichment module
    correspsearch-api.js     - correspSearch API client
    constants.js             - Shared constants (colors, labels, views)
    utils.js                 - Shared utility functions
    basket.js                - Knowledge basket storage logic
    basket-ui.js             - Knowledge basket UI components
    compare.js               - Dataset comparison logic
    wissenskorb.js           - Knowledge basket page logic
    enrichment.js            - Additional enrichment functions
    explore-tests.js         - Browser-based test suite

  css/
    tokens.css        - Design system tokens
    style.css         - Base styles and layout
    components.css    - Reusable UI components
    explore.css       - Visualization-specific styles
    upload.css        - Upload page styles
    about.css         - About page styles

  data/
    hsa-letters.json  - Pre-processed HSA dataset
    hsa/CMIF.xml      - Original HSA CMIF source

preprocessing/
  build_hsa_data.py           - HSA data preprocessing
  resolve_geonames_wikidata.py - Coordinate resolution
  analyze_hsa_cmif.py         - CMIF analysis tool

docs/knowledge/
  JOURNAL.md            - Development log (26 phases)
  user-stories.md       - Requirements documentation (27 user stories)
  architecture.md       - Technical architecture
  design.md             - Design system documentation
  learnings.md          - Design decisions and patterns
  plan.md               - Completed features (historical)
  CMIF-Data.md          - CMIF standard documentation
  demo-datasets.md      - Demo dataset documentation
  cmif-sources.md       - CMIF sources reference
  project-analysis.md   - Project analysis report
  uncertainty-concept.md - Uncertainty handling documentation
```

## Views

1. **Map View** - Geographic distribution of correspondence locations with clustering
2. **Persons View** - Searchable list of all correspondents with letter counts
3. **Letters View** - Chronological list of all letters with metadata
4. **Timeline View** - Temporal distribution with stacked language bars
5. **Topics View** - Subject exploration with co-occurrence analysis
6. **Places View** - Geographic index with filtering capabilities
7. **Network View** - Force-directed graph of correspondence relationships
8. **Mentions Flow View** - Sankey diagram showing mention flows between correspondents and mentioned persons

## Filtering

Filters can be combined and are reflected in the URL for sharing:

- **Time Period**: Slider for start and end year
- **Languages**: Checkbox selection with dynamic counts
- **Person**: Click on correspondent to filter their letters
- **Subject**: Click on topic to filter related letters
- **Place**: Click on location to filter letters from that place

## CMIF Support

CorrespExplorer parses standard CMIF-XML with support for:

- `correspDesc` elements with sender/recipient
- `persName` with authority references (VIAF, GND)
- `placeName` with GeoNames references
- `date` in various formats (when, from/to, notBefore/notAfter)
- Extended metadata via `note` elements:
  - `hasLanguage` - Letter language
  - `mentionsSubject` - Subject references
  - `mentionsPerson` - Mentioned persons
  - `mentionsPlace` - Mentioned places

## Semantic Enrichment

When loading a dataset, CorrespExplorer offers optional Wikidata enrichment:

- Resolves GND and VIAF identifiers to Wikidata entities
- Fetches biographical data: birth/death dates and places
- Retrieves portrait images from Wikimedia Commons
- Adds profession/occupation information
- Provides external links to Wikipedia, Wikidata, GND, VIAF

Enrichment runs at load time with a progress indicator. Data is cached in the browser session for fast access during exploration.

## Technology Stack

- MapLibre GL JS 4.x - WebGL map rendering
- D3-Sankey 0.12.3 - Flow diagram visualization
- noUiSlider - Time range filtering
- Vanilla JavaScript ES6 modules
- CSS custom properties (design tokens)
- No build process required

## Data Processing

For large datasets, use the preprocessing scripts:

```bash
# Analyze CMIF file
python preprocessing/analyze_hsa_cmif.py

# Build processed JSON
python preprocessing/build_hsa_data.py

# Resolve GeoNames coordinates
python preprocessing/resolve_geonames_wikidata.py
```

## Development

Run tests in browser:
```
explore.html?test=true
```

Tests cover:
- Filter logic (temporal, language, person, place)
- Aggregation functions (counting, indexing)
- Utility functions (escaping, sorting)
- UI element presence

## License

CC BY 4.0

## Resources

- CMIF Specification: https://github.com/TEI-Correspondence-SIG/CMIF
- correspSearch: https://correspsearch.net
- TEI Guidelines: https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html

## Development Methodology

CorrespExplorer was developed by Christopher Pollin using Claude (Opus 4.5) in Claude Code with the Promptotyping methodology.

Promptotyping: LLM-assisted prototyping of research tools based on research data and scholar-centered design.

More information: [Promptotyping: Von der Idee zur Anwendung](https://dhcraft.org/excellence/blog/Promptotyping/)

## Contact

Christopher Pollin
Digital Humanities Craft OG
https://dhcraft.org
