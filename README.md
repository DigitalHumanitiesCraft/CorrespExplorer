# CorrespExplorer

Interactive visualization tool for correspondence metadata in CMIF (Correspondence Metadata Interchange Format).

Live Demo: https://dhcraft.org/CorrespExplorer

## Quick Start

1. Visit https://dhcraft.org/CorrespExplorer
2. Upload a CMIF-XML file or select the example dataset (Hugo Schuchardt Archiv)
3. Explore the correspondence through the views of the explorer (overview, map, persons, letters, timeline, network and others)

For local development:
```bash
cd docs
python -m http.server 8000
# Visit http://localhost:8000
```

## Features

- CMIF-XML file upload (drag-and-drop or URL)
- Links from person and letter details to the correspSearch web search
- Wikidata enrichment (portraits, life dates, professions)
- Visualization views (map, timeline, network, chronicle and others)
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
| [INDEX.md](docs/knowledge/INDEX.md) | Entry point, document map and glossary |
| [project.md](docs/knowledge/project.md) | Project, data basis, standards, scope |
| [data.md](docs/knowledge/data.md) | CMIF model, bundled and external datasets, sources |
| [specification.md](docs/knowledge/specification.md) | Requirements, user stories, decisions |
| [uncertainty-specification.md](docs/knowledge/uncertainty-specification.md) | Handling of uncertain and missing data |
| [architecture.md](docs/knowledge/architecture.md) | Technical architecture, modules, data flow |
| [design.md](docs/knowledge/design.md) | UI/UX specifications, design system |
| [testing.md](docs/knowledge/testing.md) | Test strategy |
| [plan.md](docs/knowledge/plan.md) | Open findings and planned work |
| [handoff.md](docs/knowledge/handoff.md) | Open hand-over points |
| [journal.md](docs/knowledge/journal.md) | Development history by phase |

Most knowledge documents are written in German.

## Development

Run tests in browser:
```
docs/test.html?test=true
```

See [CLAUDE.md](CLAUDE.md) for coding guidelines.

## Licence

Code is licensed under the MIT License (see [LICENSE](LICENSE)). Documentation and knowledge documents are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Third-party research data is excluded from these terms; rights remain with their respective holders. The bundled example correspondence dataset (Hugo Schuchardt Archiv) remains with the archive.

## Resources

- [CMIF Specification](https://github.com/TEI-Correspondence-SIG/CMIF)
- [correspSearch](https://correspsearch.net)
- [TEI Guidelines](https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html)

## How this was built

CorrespExplorer began in October 2025 as HerData, a prototype for women in Goethe's correspondence (first commit `dbef54b`). On 2025-11-26 the project became a generic explorer for any CMIF file, and the HerData code and data were removed (`9a01c32`). The [journal](docs/knowledge/journal.md) records both stages.

Christopher Pollin developed the tool with Promptotyping, an iterative method in which a domain expert and an LLM build a research tool from maintained project knowledge ([Promptotyping: Von der Idee zur Anwendung](https://dhcraft.org/excellence/blog/Promptotyping/)). Until October 2026 (commit `29dfc15`) the knowledge base in `docs/knowledge/` consisted of a journal, a context map, a list of known issues and topic documents. It was then aligned with the Promptotyping templates.

Where commits carry a co-author trailer, it names the coding agent. In 2025 the trailer mostly reads an unversioned "Claude", Claude Opus 4.5 appears from December 2025, Claude Opus 4.8 on the July 2026 licensing commit (`764e746`), and Claude Opus 5.5 on the October 2026 review fixes and this curation. Three early pull requests came from `claude/...` branches, the naming used by Claude Code cloud sessions (merges `b1c6296`, `5af960d`, `05a3f81`).

There is no CI. Tests run in the browser test runner `docs/test.html`, which loads small CMIF fixture files through the production parser. Behaviour beyond the tests was checked in LLM agent reviews, among them a prompt for an external review ([review-prompt.md](research-artefacts/review-prompt.md)) and a code review round on 2026-10-02 (journal, Phase 40).

The history documents several episodes in which output looked correct and was not.

- In HerData, interface figures were plausible but wrong. A letter KPI showed the whole CMIF corpus instead of the letters by or with women (`7884063`), the navigation bar showed 633 places where 227 had geodata (`1ab93b9`), and the timeline counted all events instead of sent letters (`724dad5`).
- The knowledge base recorded all tests as passing, while the October 2026 review found cross-site scripting through CMIF values (`6204990`), a crash when applying the person or subject filter (`d35643f`), click handlers calling undefined functions and modals that never became visible (`24ba8f9`).
- Commit `255d7f7` states that all tests use real CMIF data. A test file with inline mock arrays that exercised no production code remained in the repository until `2f60cbf`.
- From `91d965a` on, the knowledge context map (today `INDEX.md`) certified its own full rule compliance and absence of redundancy while its file list went out of date and documents broke the rules it named. The claim was removed in `39b86d4`.

The branch `feature/research-dashboards` (December 2025) continues the explorer with further views and a refactoring, recorded there as phases 40 to 46. It is not merged, and its phase numbers overlap with Phase 40 on main. GitHub Pages serves main.

## Contact

Christopher Pollin
Digital Humanities Craft OG
https://dhcraft.org
