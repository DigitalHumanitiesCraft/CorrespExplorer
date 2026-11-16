# CorrespExplorer

CorrespExplorer is a browser-based research tool for exploring correspondence metadata in CMIF and TEI letter records. Researchers can examine correspondence networks, places, dates and topics through linked views, filter a shared selection and trace patterns back to individual letter records and their editions.

[Open the live demo](https://dhcraft.org/CorrespExplorer/) to explore the Hugo Schuchardt Archiv, or load your own files. Local files are processed in your browser, without installation or server-side data processing.

## Getting started

1. Open the live demo with the bundled Hugo Schuchardt Archiv, or choose “Eigene Daten” to load local files or a source URL.
2. Select “Im Explorer öffnen” and explore letters, persons, places, time and topics. The interface is in German.
3. Filter the shared selection and open its letter records to inspect the evidence behind a pattern. Follow the links to the source editions.

You can compare correspondents, collect records in the Wissenskorb and export selections as CSV or JSON. Shared filter URLs work with datasets that recipients can also access. They do not upload or share your local files.

## Supported data

CorrespExplorer reads [CMIF](https://github.com/TEI-Correspondence-SIG/CMIF), the TEI-based Correspondence Metadata Interchange Format, and TEI letter records containing `correspDesc`. Several files from one edition can be loaded as a single dataset. You can also load results from [correspSearch](https://correspsearch.net).

What each view can show depends on the metadata supplied by the edition. The parser preserves supported editorial qualifications, postmarks, addresses and other letter-level information. [Data documentation](knowledge/data.md) describes the supported structures and datasets, and the [uncertainty specification](knowledge/uncertainty-specification.md) explains how missing and uncertain values are handled.

Source URLs, correspSearch queries and optional Wikidata enrichment contact external services. The OpenFreeMap basemap is requested when the map view is first opened. Libraries and fonts are bundled locally.

## Status and limitations

Version 0.9.0 is available on GitHub Pages. Its Git tag and GitHub Release are pending. CorrespExplorer is a research prototype without a support commitment, and findings should be checked against the underlying editions. It displays metadata and links to editions, without displaying letter texts or editing source data.

Module tests, browser smoke tests and an independent agent review cover the documented preview. Scholarly validation, manual tasks and accessibility checks remain incomplete. Tests are run locally and are not part of continuous integration. The [changelog](CHANGELOG.md) records the current verification status and known limitations, with detailed evidence in [testing.md](knowledge/testing.md) and outstanding work in [plan.md](knowledge/plan.md).

## Development

Serve the website locally with Python:

```bash
python -m http.server 8000 --directory docs
```

Open [localhost:8000](http://localhost:8000). Run the module tests at [test.html?test=true](http://localhost:8000/test.html?test=true), or run the browser smoke test with `uv run tests/browser/smoke.py`. The [testing guide](knowledge/testing.md#ausführen) includes the fixed task set and further checks.

The application uses JavaScript ES modules, D3, MapLibre GL JS and noUiSlider, without a build step. GitHub Pages publishes `docs/` from `main`. Dataset preparation scripts are in `preprocessing/`.

Development follows Promptotyping, a working practice that translates research data and their contexts into research artefacts with LLM agents. The [project knowledge](knowledge/INDEX.md) documents scope, data, design and decisions, mostly in German. The [journal](knowledge/journal.md#2026-11-16-readme-und-entwicklungsgeschichte) records the development history. Coding instructions are in [CLAUDE.md](CLAUDE.md).

## Licence and citation

Code is licensed under [MIT](LICENSE), documentation under CC BY 4.0. Third-party datasets, libraries, fonts and marks retain their own terms.

The bundled Hugo Schuchardt Archiv export is published by the Centre for Information Modelling, University of Graz, under CC BY 4.0. Its JSON derivatives are converted, indexed and enriched versions. Their transformations are documented in the data and rights inventory and in the metadata of `hsa-letters.json`. Coordinate data come from Wikidata under CC0 and GeoNames under CC BY 4.0. The [data and rights inventory](knowledge/data.md#rechte-und-lizenzen) lists attribution, modifications and licences for the bundled material.

Use [CITATION.cff](CITATION.cff) to cite the software. Machine-readable metadata are also available in [codemeta.json](codemeta.json).

Report problems or suggest improvements through [GitHub Issues](https://github.com/DigitalHumanitiesCraft/CorrespExplorer/issues). CorrespExplorer is developed at [Digital Humanities Craft](https://dhcraft.org/).
