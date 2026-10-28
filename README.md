# CorrespExplorer

Interactive visualization tool for correspondence metadata in CMIF (Correspondence Metadata Interchange Format).

Live Demo: https://dhcraft.org/CorrespExplorer

## Purpose

CorrespExplorer lets researchers load any CMIF file in the browser and explore the correspondence it describes, without installation or server-side processing.

- CMIF-XML file upload (drag-and-drop or URL)
- Links from person and letter details to the correspSearch web search
- Wikidata enrichment (portraits, life dates, professions)
- Visualization views (map, timeline, network, chronicle and others)
- Multi-dimensional filtering (time, language, person, subject, place)
- CSV/JSON export
- URL-based state sharing

Scope and its deliberate limits are in [project.md](docs/knowledge/project.md).

## Data and rights

The tool reads CMIF, the TEI-based exchange format for correspondence metadata. Uploaded data stay in the browser. The bundled example dataset is the Hugo Schuchardt Archiv (HSA), the correspondence of the linguist Hugo Schuchardt (1842–1927). Its figures, the further datasets and their sources are documented in [data.md](docs/knowledge/data.md), and the handling of uncertain and missing values in [uncertainty-specification.md](docs/knowledge/uncertainty-specification.md).

The example correspondence datasets remain with their archives and holders.

## Use

1. Visit https://dhcraft.org/CorrespExplorer
2. Upload a CMIF-XML file or select the example dataset (Hugo Schuchardt Archiv)
3. Explore the correspondence through the views of the explorer (overview, map, persons, letters, timeline, network and others)

For local development:

```bash
cd docs
python -m http.server 8000
# Visit http://localhost:8000
```

Run the tests in the browser at `http://localhost:8000/test.html?test=true`. See [CLAUDE.md](CLAUDE.md) for coding guidelines.

The technology stack is MapLibre GL JS 4.x (WebGL map rendering), D3.js with D3-Sankey (network and flow diagrams), noUiSlider (time range filtering) and vanilla JavaScript ES6 modules, with no build process.

GitHub Pages serves the `main` branch. The branch `feature/research-dashboards` (December 2025) continues the explorer with further views and a refactoring, recorded there as phases 40 to 46. It is not merged, and its phase numbers overlap with Phase 40 on main.

The documentation lives in [docs/knowledge/](docs/knowledge/INDEX.md), whose index maps every document. Most knowledge documents are written in German.

## How this was built

CorrespExplorer began in October 2025 as HerData, a prototype for women in Goethe's correspondence (first commit `dbef54b`), and became a generic explorer for any CMIF file on 2025-11-26 (`9a01c32`). Christopher Pollin developed the tool with Promptotyping, an iterative method in which a domain expert and an LLM build a research tool from maintained project knowledge ([Promptotyping: Von der Idee zur Anwendung](https://dhcraft.org/excellence/blog/Promptotyping/)). The harness was Claude Code. Where commits carry a co-author trailer, it names the coding agent: in 2025 mostly an unversioned "Claude", Claude Opus 4.5 from December 2025, Claude Opus 4.8 on the July 2026 licensing commit and Claude Opus 5.5 from October 2026. The project knowledge lives in [docs/knowledge/](docs/knowledge/INDEX.md), and [CLAUDE.md](CLAUDE.md) is the agent's entry point.

Checking is layered. Verification runs the browser test runner `docs/test.html`, which loads CMIF fixture files through the production parser; there is no CI. Agentic review by LLM agents checked behaviour beyond the tests, among them a prompt for an external review ([review-prompt.md](research-artefacts/review-prompt.md)) and a code review round on 2026-10-02. Commit `29dfc15` is the state before the knowledge base was aligned with the Promptotyping document templates on 2026-10-28. The episodes in which output looked correct and was not are recorded in the [journal](docs/knowledge/journal.md).

## Limits

- The tests cover small fixture files and passed while the October 2026 review still found defects in the interface. Behaviour outside the tested functions is checked only by review.
- There is no continuous integration; tests run by hand in the browser.
- Open findings and planned work are tracked in [plan.md](docs/knowledge/plan.md).

## Licence and citation

Code is licensed under the MIT License (see [LICENSE](LICENSE)). Documentation and knowledge documents are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Third-party research data is excluded from these terms; rights remain with their respective holders. The bundled example correspondence dataset (Hugo Schuchardt Archiv) remains with the archive.

Citation metadata is in [CITATION.cff](CITATION.cff) and [codemeta.json](codemeta.json).

## Resources

- [CMIF Specification](https://github.com/TEI-Correspondence-SIG/CMIF)
- [correspSearch](https://correspsearch.net)
- [TEI Guidelines](https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html)

## Contact

Christopher Pollin
Digital Humanities Craft OG
https://dhcraft.org
