# CorrespExplorer

Interactive visualization tool for correspondence metadata in CMIF (Correspondence Metadata Interchange Format).

Live Demo: https://dhcraft.org/CorrespExplorer

## Purpose

CorrespExplorer lets researchers load any CMIF file in the browser and explore the correspondence it describes, without installation or server-side processing.

- CMIF-XML file upload (drag-and-drop or URL), and URLs of the correspSearch API v2.0
- Links from person and letter details to the correspSearch web search
- Wikidata enrichment (portraits, life dates, professions)
- Twelve views (overview, map, correspondents, letters, timeline, topics, places, network, mentions flow, chronicle, activity heatmap, comparison)
- Research paths that guide through the views (Wissenspfade) and a basket (Wissenskorb) with its own analysis page
- Multi-dimensional filtering (time, language, person, subject, place)
- CSV/JSON export
- URL-based state sharing

Scope and its deliberate limits are in [project.md](docs/knowledge/project.md).

## Data and rights

The tool reads CMIF, the TEI-based exchange format for correspondence metadata. Uploaded data stay in the browser. Two example datasets are bundled: the Hugo Schuchardt Archiv (HSA), the correspondence of the linguist Hugo Schuchardt (1842–1927), and a synthetic tutorial dataset with a guided tour. Its figures, the further datasets and their sources are documented in [data.md](docs/knowledge/data.md), and the handling of uncertain and missing values in [uncertainty-specification.md](docs/knowledge/uncertainty-specification.md).

The bundled datasets keep the licences their publishers state, see [Licence and citation](#licence-and-citation).

## Use

1. Visit https://dhcraft.org/CorrespExplorer
2. Upload a CMIF-XML file, enter a URL, or select one of the two example datasets (Hugo Schuchardt Archiv, or the tutorial dataset with its tour)
3. Explore the correspondence through the views of the explorer (overview, map, persons, letters, timeline, network and others)

For local development:

```bash
python -m http.server 8000 --directory docs
# Visit http://localhost:8000
```

Run the tests in the browser at `http://localhost:8000/test.html?test=true`, which starts one run on load, or open `test.html` and press Run. The extended HSA dataset is rebuilt with `python preprocessing/build_hsa_data.py`, which needs the Python package `lxml` (`pip install -r preprocessing/requirements.txt`). See [CLAUDE.md](CLAUDE.md) for coding guidelines.

The technology stack is MapLibre GL JS (map), D3 with d3-sankey (network and flow diagrams), noUiSlider (time range), marked (knowledge viewer) and vanilla JavaScript ES modules, with no build process. All libraries and fonts are vendored in `docs/vendor/` with their licence files, so the pages load no code from a CDN; only the OpenFreeMap basemap is external.

GitHub Pages serves the `main` branch. The branch `feature/research-dashboards` (December 2025, phases 40 to 46 of its own journal) was merged into main on 2026-10-29 (`14b2d17`).

The documentation lives in [docs/knowledge/](docs/knowledge/INDEX.md), whose index maps every document. Most knowledge documents are written in German.

## How this was built

CorrespExplorer began in October 2025 as HerData, a prototype for women in Goethe's correspondence (first commit `dbef54b`), and became a generic explorer for any CMIF file on 2025-11-26 (`9a01c32`). Christopher Pollin developed the tool with Promptotyping, an iterative method in which a domain expert and an LLM build a research tool from maintained project knowledge ([Promptotyping: Von der Idee zur Anwendung](https://dhcraft.org/excellence/blog/Promptotyping/)). The harness was Claude Code. Where commits carry a co-author trailer, it names the coding agent: in 2025 mostly an unversioned "Claude", Claude Opus 4.5 from December 2025, Claude Opus 4.8 on the July 2026 licensing commit and Claude Opus 5.5 from October 2026. The project knowledge lives in [docs/knowledge/](docs/knowledge/INDEX.md), and [CLAUDE.md](CLAUDE.md) is the agent's entry point.

Checking is layered. Verification runs the browser test runner `docs/test.html`, which loads CMIF fixture files through the production parser; there is no CI. Agentic review by LLM agents checked behaviour beyond the tests, among them a prompt for an external review ([review-prompt.md](research-artefacts/review-prompt.md)), a code review round on 2026-10-02, a browser test of every view with Playwright on 2026-10-29 and, on the same day, an audit by subagents (function, pages, accessibility, design, code and documentation) with the fixes reviewed independently. Commit `29dfc15` is the state before the knowledge base was aligned with the Promptotyping document templates on 2026-10-28. The episodes in which output looked correct and was not are recorded in the [journal](docs/knowledge/journal.md).

## Limits

- The tests cover small fixture files and passed while the October 2026 review still found defects in the interface. Behaviour outside the tested functions is checked only by review.
- There is no continuous integration. The test runner and the browser checks of the views run by hand.
- Open findings and planned work are tracked in [plan.md](docs/knowledge/plan.md).

## Licence and citation

Code is licensed under the MIT License (see [LICENSE](LICENSE)). Documentation and knowledge documents are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Third-party research data is excluded from these terms and keeps the licence its publisher states in the CMIF teiHeader. The bundled Hugo Schuchardt Archiv export is licensed CC BY 4.0 by the Centre for Information Modelling, University of Graz; `docs/data/hsa-letters.json` is a changed version of it (converted to JSON, indexed, coordinates added from Wikidata), as its `meta.modifications` states. The bundled Schönbach file is CC0. Details and open points are in [docs/knowledge/data.md](docs/knowledge/data.md#rechte-und-lizenzen).

Citation metadata is in [CITATION.cff](CITATION.cff) and [codemeta.json](codemeta.json).

## Resources

- [CMIF Specification](https://github.com/TEI-Correspondence-SIG/CMIF)
- [correspSearch](https://correspsearch.net)
- [TEI Guidelines](https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html)

## Contact

Christopher Pollin
Digital Humanities Craft OG
https://dhcraft.org
