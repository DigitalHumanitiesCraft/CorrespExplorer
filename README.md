# CorrespExplorer

Interactive visualization tool for correspondence metadata in CMIF (Correspondence Metadata Interchange Format).

Live Demo: https://dhcraft.org/CorrespExplorer

## Quick Start

1. Visit https://dhcraft.org/CorrespExplorer
2. Upload a CMIF-XML file or select the example dataset (Hugo Schuchardt Archiv)
3. Explore the correspondence through 11 different views

For local development:
```bash
cd docs
python -m http.server 8000
# Visit http://localhost:8000
```

## Features

- CMIF-XML file upload (drag-and-drop or URL)
- correspSearch API integration
- Wikidata enrichment (portraits, life dates, professions)
- 11 visualization views (map, timeline, network, chronicle, activity, etc.)
- Multi-dimensional filtering (time, language, person, subject, place)
- CSV/JSON export
- URL-based state sharing

## Example Dataset

Hugo Schuchardt Archiv (HSA) - correspondence of linguist Hugo Schuchardt (1842-1927):

| Metric | Value |
|--------|-------|
| Letters | 11,576 |
| Correspondents | 846 |
| Places | 774 |
| Subjects | 1,622 |
| Languages | 18 |
| Time Period | 1859-1927 |

## Technology Stack

- MapLibre GL JS 4.x (WebGL map rendering)
- D3.js with D3-Sankey (network and flow diagrams)
- noUiSlider (time range filtering)
- Vanilla JavaScript ES6 modules
- No build process required

## Documentation

Detailed documentation in `docs/knowledge/`:

| Document | Purpose |
|----------|---------|
| [architecture.md](docs/knowledge/architecture.md) | Technical architecture, modules, data flow |
| [user-stories.md](docs/knowledge/user-stories.md) | 36 implemented features with acceptance criteria |
| [design.md](docs/knowledge/design.md) | UI/UX specifications, design system |
| [JOURNAL.md](docs/knowledge/JOURNAL.md) | Development history (43 phases) |
| [testing.md](docs/knowledge/testing.md) | Test strategy (74+ tests) |
| [CONTEXT-MAP.md](docs/knowledge/CONTEXT-MAP.md) | Documentation overview |

## Development

Run tests in browser:
```
docs/test.html?test=true
```

See [CLAUDE.md](CLAUDE.md) for coding guidelines.

## License

CC BY 4.0

## Resources

- [CMIF Specification](https://github.com/TEI-Correspondence-SIG/CMIF)
- [correspSearch](https://correspsearch.net)
- [TEI Guidelines](https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html)

## Development Methodology

Developed by Christopher Pollin using Claude (Opus 4.5) with the Promptotyping methodology.

More information: [Promptotyping: Von der Idee zur Anwendung](https://dhcraft.org/excellence/blog/Promptotyping/)

## Contact

Christopher Pollin
Digital Humanities Craft OG
https://dhcraft.org
