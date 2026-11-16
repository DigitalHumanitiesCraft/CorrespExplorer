# CorrespExplorer

Version 0.9.0 is prepared for release. The Git tag and GitHub Release are pending. Verification status and known limitations are recorded in [CHANGELOG.md](CHANGELOG.md).

Experiment. CorrespExplorer is a research prototype developed with coding agents. It shows letter metadata in CMIF (Correspondence Metadata Interchange Format) and in TEI letter records as a few large figures over one shared selection, in the browser and without a server. It is being developed into the viewing tool for a shared letter model of five Graz editions. It is not a finished or supported product, and its results need checking before any reuse. Its tests cover fixture files and the bundled Hugo Schuchardt Archiv, reviews still find defects in the interface, and the open findings are listed in [knowledge/plan.md](knowledge/plan.md). Feedback belongs in the [issues of the repository](https://github.com/DigitalHumanitiesCraft/CorrespExplorer/issues).

Live Demo: https://dhcraft.org/CorrespExplorer

## Purpose

CorrespExplorer lets researchers load letter metadata in the browser and see who wrote to whom, when, from where and about what, and which letters stand behind each pattern, without installation or server-side processing. It does not show letter texts and does not edit or correct data; it links to the editions.

- A start page that is one figure of small views and an example letter, composed from what the chosen dataset contains and ordered by its data model (core of CMIF, its extensions, TEI letter records)
- A start view in the explorer made of small real views that filter one another, with a language key that is also the language filter
- Large views over one selection: a correspondence circle around a person (with the whole network as a second mode), a map, a space-time view with the places on a ground plane and the years as height, and topics as a grid of subjects by years with a treemap of shares
- Further representations per subject: a letter list told from the central person and grouped by year, lists of persons and places, one time view from the whole period down to single letters, mentions, comparison
- A narrow rail of signs for the holding, the period, the languages and the other filters, and one line at the lower edge of every view with the count of the selection, its filters as removable marks and its letters on request
- Loading CMIF or TEI files (several files of one edition as one dataset), addresses and URLs of the correspSearch API v2.0
- Values inferred by the edition, postmarks, addresses, letters recorded several times and implausible years shown as what they are
- Wikidata enrichment on explicit request, links to the correspSearch search
- CSV and JSON export, a basket (Wissenskorb) with its own analysis page, URL-based state sharing

State on 2026-11-15: the start page, the start view, the letter list, the time view and the topics grid were rebuilt on 2026-11-14 and in the following night. On 2026-11-15 a refactoring removed the tutorial with its tour, the retired day and chronicle views and the unused research-path machinery from the code; old links to them still open. Later on 2026-11-15 a review of the parser against the Hugo Schuchardt Archiv and the Stefan Zweig Digital letters led to fixes (supplied date wording, further places of sending, all addresses, letters under one shelfmark with different dates), every view was brought under the shared rules of the design (one language key in every view, the basemap only on the map), and the fixed task set became a script. The interface of this state has not been accepted as a whole, and the form of the network is an open research question ([journal](knowledge/journal.md)).

Scope and its deliberate limits are in [project.md](knowledge/project.md).

## Data and rights

The tool reads CMIF, the TEI-based exchange format for correspondence metadata. Uploaded data stay in the browser. The bundled example dataset is the Hugo Schuchardt Archiv (HSA), the correspondence of the linguist Hugo Schuchardt (1842–1927), on which the tool is developed and tested and which the start page offers. The synthetic dataset of the former tutorial stays in the repository only as a test file; the tutorial and its guided tour were removed on 2026-11-15. The letter records of Stefan Zweig Digital, which carry no licence statement, are loaded only locally and are not bundled. Its figures, the further datasets and their sources are documented in [data.md](knowledge/data.md), and the handling of uncertain and missing values in [uncertainty-specification.md](knowledge/uncertainty-specification.md).

The bundled datasets keep the licences their publishers state, see [Licence and citation](#licence-and-citation).

## Use

1. Visit https://dhcraft.org/CorrespExplorer
2. Keep the Hugo Schuchardt Archiv, the default above the start figure, or choose "Eigene Daten" to load your own files or an address
3. Open it in the explorer and work in the views of its subjects (start, letters, persons, places, time, topics)

For local development:

```bash
python -m http.server 8000 --directory docs
# Visit http://localhost:8000
```

Run the tests in the browser at `http://localhost:8000/test.html?test=true`, which starts one run on load, or open `test.html` and press Run. The browser smoke test `uv run tests/browser/smoke.py` serves `docs/` itself and walks the researcher's path through the pages. `uv run verification/task_set.py` lists the fixed task set with answers computed from the bundled data, and with `--browser` reads each answer in the rendered view against a running local server. The extended HSA dataset is rebuilt with `python preprocessing/build_hsa_data.py`, which needs the Python package `lxml` (`pip install -r preprocessing/requirements.txt`), and the summary of the start figure with `uv run preprocessing/build_examples.py`. How the checks work and what they leave unchecked is in [knowledge/testing.md](knowledge/testing.md). See [CLAUDE.md](CLAUDE.md) for coding guidelines.

The technology stack is MapLibre GL JS (map), D3 with d3-sankey (network and flow diagrams), noUiSlider (time range) and vanilla JavaScript ES modules with canvas drawing for the space-time and topics views, with no build process. All libraries, fonts and the Natural Earth country outlines (public domain) are vendored in `docs/vendor/` with their licence or provenance files, so the pages load no code from a CDN; the OpenFreeMap basemap is requested when the map view is first opened. Source URLs, correspSearch queries and explicitly requested enrichment can also contact external services.

GitHub Pages serves the `main` branch. The branch `feature/research-dashboards` (December 2025, phases 40 to 46 of its own journal) was merged into main on 2026-10-29 (`14b2d17`).

The documentation lives in [knowledge/](knowledge/INDEX.md), whose index maps every document. Most knowledge documents are written in German.

## How this was built

CorrespExplorer began in October 2025 as HerData, a prototype for women in Goethe's correspondence (first commit `dbef54b`), and became a generic explorer for any CMIF file on 2025-11-26 (`9a01c32`). Christopher Pollin developed the tool with Promptotyping, a working practice for translating research data and their contexts, with LLM agents, into research artefacts that fit researchers’ purposes and ways of working ([Promptotyping: Von der Idee zur Anwendung](https://dhcraft.org/excellence/blog/Promptotyping/)). The harness was Claude Code. Where commits carry a co-author trailer, it names the coding agent: in 2025 mostly an unversioned "Claude", Claude Opus 4.5 from December 2025, Claude Opus 4.8 on the July 2026 licensing commit and Claude Opus 5.5 from October 2026. In November 2026 one further iteration was made for the completion of the paper on the Promptotyping method, with Claude Opus 5.5 and Claude Fable 5.2 in Claude Code: the tool now reads TEI letter records, loads an edition published as many files as one dataset, and shows postmarks, addresses, values inferred by the edition and letters recorded several times as what they are. On 2026-11-14 the operator decided that the tool becomes the viewing tool for the shared letter model of the project GOSSIP, with four large views over one selection ([journal](knowledge/journal.md)). The project knowledge lives in [knowledge/](knowledge/INDEX.md), and [CLAUDE.md](CLAUDE.md) is the agent's entry point.

Checking is layered. Verification runs the browser test runner `docs/test.html`, which loads CMIF fixture files through the production parser; there is no CI. Agentic review by LLM agents checked behaviour beyond the tests, among them a prompt for an external review ([review-prompt.md](research-artefacts/review-prompt.md)), a code review round on 2026-10-02, a browser test of every view with Playwright on 2026-10-29 and, on the same day, an audit by subagents (function, pages, accessibility, design, code and documentation) with the fixes reviewed independently, and on 2026-11-05 a walkthrough of the researcher's path, live and locally, ahead of a workshop. Commit `29dfc15` is the state before the knowledge base was aligned with the Promptotyping document templates on 2026-10-28. The episodes in which output looked correct and was not are recorded in the [journal](knowledge/journal.md).

## Limits

- The tests cover fixture files and the bundled archive and passed while reviews still found defects in the interface. Behaviour outside the tested functions is checked only by review and by a fixed task set read off the interface.
- There is no continuous integration. The test runner and the browser smoke test run by hand.
- Open findings and planned work are tracked in [plan.md](knowledge/plan.md).

## Licence and citation

Code is licensed under the MIT License (see [LICENSE](LICENSE)). Documentation and knowledge documents are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Third-party research data is excluded from these terms and keeps the licence its publisher states in the CMIF teiHeader. The bundled Hugo Schuchardt Archiv export is licensed CC BY 4.0 by the Centre for Information Modelling, University of Graz; `docs/data/hsa-letters.json` and `docs/data/examples.json` are changed versions of it (converted to JSON, indexed, coordinates added from Wikidata, summarised for the start figure), as `meta.modifications` of the first file states. The bundled Schönbach file is CC0. The test files `docs/data/test-parallel-a.xml` and `test-parallel-b.xml` each quote one record of a CMIF file under CC BY 4.0, named in their headers, and `test-correspsearch.json` and `test-correspsearch-empty.json` are unchanged answers of the correspSearch API, CC BY 4.0 as stated in their headers. All other test files are synthetic. Details and open points are in [knowledge/data.md](knowledge/data.md#rechte-und-lizenzen).

Citation metadata is in [CITATION.cff](CITATION.cff) and [codemeta.json](codemeta.json).

## Resources

- [CMIF Specification](https://github.com/TEI-Correspondence-SIG/CMIF)
- [correspSearch](https://correspsearch.net)
- [TEI Guidelines](https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html)

## Contact

Christopher Pollin
Digital Humanities Craft OG
https://dhcraft.org
