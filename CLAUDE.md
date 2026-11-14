<!-- template: Vorlage Action-Layer v0.5, https://dhcraft.org/Promptotyping/promptotyping-document/action-layer -->

# Project instructions for CorrespExplorer

CorrespExplorer is a browser tool for exploring correspondence metadata in CMIF. It is built with Promptotyping: the documents in `knowledge/` hold the domain knowledge and specification from which the code is implemented, and the operator (Christopher Pollin) decides on scope, acceptance and anything that leaves the repository.

## Knowledge base

The knowledge base lives in `knowledge/` at the repository root, outside `docs/`, because GitHub Pages publishes everything under `docs/` and the knowledge base, internal notes and drafts are not served. The site links to it on GitHub. At every session start, after this file, read `knowledge/INDEX.md`, then the `## Open` section at the beginning of `knowledge/journal.md` and `knowledge/plan.md`, then the documents relevant to the task. Consult `knowledge/journal.md` when the origin or rationale of a change is needed.

| Task | Read first |
|---|---|
| CMIF parsing, datasets, sources | `knowledge/data.md`, `knowledge/uncertainty-specification.md` |
| Requirements, stories, decisions | `knowledge/specification.md` |
| Modules, pages, data flow | `knowledge/architecture.md`, then `docs/js/CONTEXT-MAP.md` |
| UI, CSS, visualisation | `knowledge/design.md`, `docs/css/tokens.css`, `docs/css/CONTEXT-MAP.md` |
| Tests | `knowledge/testing.md`, `docs/js/tests/CONTEXT-MAP.md` |
| Bugs and planned work | `knowledge/plan.md` |
| Open input or hand-over | `knowledge/journal.md`, section `## Open` |

## Working rules

- Open points: read the `## Open` section of `knowledge/journal.md` at session start. Check source and current target of each point you use, integrate durable content first, write the journal record and remove the point from `## Open` completely.
- Journal: write one entry per coherent transition at the top of `knowledge/journal.md`, newest first, with date only, no timestamps, using the fields of the journal template (Anlass, Befund, Entschieden, Korrigiert, Geändert, Belege) and at least one commit or other evidence. Current status, open tasks and detailed test output belong in their own documents.
- Write-back: after a change, update the document responsible for it and every document that restates it. Code change in modules or data flow goes into `architecture.md` and the matching `CONTEXT-MAP.md`. A new feature gets its story in `specification.md`, a design change goes into `design.md`, a new data source into `data.md`, a new or fixed bug into `plan.md` and the journal, a decision into `specification.md` as a new ADR.
- Nothing invented: dataset figures, CMIF structures, authority IDs and source URLs come from the data files or the cited source. Ask when knowledge is missing.
- Truth hierarchy: the code and the data files outrank the knowledge documents, `tokens.css` outranks the colour and spacing values in `design.md`, and the registered suites in `run-all-tests.js` outrank any test list in the documents. Report contradictions instead of letting them drift.
- No claims of compliance, completeness or passing tests without a check that was actually run and is named.
- No volatile numbers in this file or the knowledge documents (test counts, line counts, file sizes, coverage). Current figures come from `test.html` or the data. Future work goes into `plan.md`.

## Writing rules

These rules keep documents compact and readable for people and for the model context, where every token counts.

- No bold, no emojis, no exclamation marks for emphasis, no "estimated time" sections.
- No box drawings or ASCII art. Describe data flow in prose or nested lists ("A leads to B, B produces C").
- Code only where necessary, such as API signatures, key constants or critical patterns, never full implementations.
- Clear `#` headings, bullet lists for parallel items, neutral and factual tone without superlatives, facts with sources, relative links between documents.
- Statistics give absolute numbers with percentages and the snapshot date. Data quality issues are stated openly.
- Knowledge documents are German unless their frontmatter says otherwise. Technical terms keep their original form (GND, VIAF, TEI, CMIF). User stories in German: "Als Forschende möchte ich ..., um ...".
- Every knowledge document carries the frontmatter core (`title`, `project`, `method`, `status`, `created`, `updated`) and, where a template exists, the `template` block. `updated` changes only with content.

## Design principles

Value source: `knowledge/design.md`. Read it before UI or text work.

- Mark only uncertain values. Exact data stay unmarked, unknown data are called unknown.
- Use border-based design. Box shadows only on floating elements (modals, dropdowns, tooltips, map popups).
- Take colours, spacing and type from the tokens in `tokens.css`, never hard-coded values.
- Keep every interactive element keyboard-operable with a visible focus.
- Describe gaps in partner data as enrichment potential, never as poor quality.

## Scope

The project does not correct dates, geocode regions, identify unknown persons or rate the quality of an edition (see `knowledge/project.md`).

Do not:

- push, merge, tag or rewrite history without explicit instruction
- add mock data, stubs or duplicated helpers to tests

## Tooling

Check the available tools and runtimes before dependent steps. Name any check that was not run.

### Commands

- Local server: `python -m http.server 8000 --directory docs`, then http://localhost:8000
- Tests: http://localhost:8000/test.html?test=true, all suites must pass before every commit
- Preprocessing of extended datasets: `python preprocessing/build_hsa_data.py`

### Conventions

- No build step. JavaScript is ES modules, `const` and `let`, `async`/`await`, pure functions where possible. HTML is semantic, CSS uses BEM class names and is mobile-first.
- Python follows PEP 8 with docstrings and type hints where appropriate.
- File names: Python `lowercase_with_underscores.py`, JavaScript modules `kebab-case.js`, tests `test-*.js`, knowledge documents lowercase kebab-case with `INDEX.md` as the hub.
- Code comments are English and explain why, not what. Remove commented-out code before committing.
- Git: commit messages in English, imperative, one line stating what and why where not obvious, with the co-author trailer naming the coding agent and model.

### Testing

Never use mock data or test data objects in tests.

- Tests load real CMIF-XML fixture files from `docs/data/` through `parseCMIF`. Where a test needs the index shape of the preprocessing, it may load a bundled preprocessed dataset (`docs/data/*.json`) as it is, never a hand-made copy.
- Tests import the real functions from the production modules and never duplicate helpers.
- A new case becomes a letter in a fixture file (`test-uncertainty.xml`, `test-hostile.xml`).

### Security

- Escape every CMIF, JSON and Wikidata value before it reaches `innerHTML`, allow only `http` and `https` links.
- `?json=` loads only relative paths under `data/` ending in `.json`.
- Never read or print `.env`. Uploaded data stay in the browser.
