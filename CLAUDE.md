<!-- template: Vorlage Action-Layer v0.5, https://dhcraft.org/Promptotyping/promptotyping-document/action-layer -->

# Project instructions for CorrespExplorer

CorrespExplorer is a browser tool that shows letter metadata as a few large figures over one shared selection: a correspondence circle, a map, a space-time view, one time view and topics, with one line for the selection and its letters at the lower edge of every view, a start view of small views that filter one another, and a start page composed from what the chosen holding contains. The rules every view is to follow are in `knowledge/design.md`, section "Gemeinsame Regeln aller Ansichten". Since 2026-11-14 it is being developed into the viewing tool for the shared letter model of the project GOSSIP. It is built with Promptotyping: the documents in `knowledge/` hold the domain knowledge and the specification from which the code is implemented, and the operator (Christopher Pollin) decides on scope, acceptance and anything that leaves the repository.

## Knowledge base

The knowledge base lives in `knowledge/` at the repository root, outside `docs/`, because GitHub Pages publishes everything under `docs/` and the knowledge base, internal notes and drafts are not served. At every session start, after this file, read the `## Open` section at the beginning of `knowledge/journal.md` first, then `knowledge/INDEX.md`, `knowledge/plan.md` and the documents the task needs. Consult the entries of the journal when the origin or rationale of a change is needed.

| Task | Read first |
|---|---|
| Purpose, scope, relation to GOSSIP | `knowledge/project.md` |
| Requirements, stories, their state and test tasks, decisions | `knowledge/specification.md` |
| What the parser reads, datasets, the shared letter model, licences | `knowledge/data.md`, `knowledge/uncertainty-specification.md` |
| Interface, views, colours, the operator's statements | `knowledge/design.md`, `docs/css/tokens.css`, `knowledge/context-maps/css.md` |
| Modules, data flow, adding a view | `knowledge/architecture.md`, `knowledge/context-maps/js.md`, `knowledge/context-maps/views.md` |
| Checks and how to run them | `knowledge/testing.md`, `knowledge/context-maps/tests.md` |
| What is open and what waits for the operator | `knowledge/plan.md` |

## Working rules

- Open points: use the `## Open` section of the journal at session start. Check source and current target of each point you use, integrate durable content into its document first, write the journal entry and remove the point from `## Open`. Each handoff rewrites `## Open` as the complete current list.
- Journal: one entry per coherent step at the top of `## Einträge` in `knowledge/journal.md`, newest first, date only, with the fields Anlass, Befund, Entschieden, Verworfen, Korrigiert, Geändert, Belege where they have content and at least one commit or other evidence. Older entries are history and are not rewritten.
- Write-back: after a change, update the responsible document and every document that restates it. A new or changed view gets its story, state and test task in `specification.md`, its account in `design.md` and its module in `architecture.md`. A parser change goes into `data.md`. An open finding goes into `plan.md` with its origin.
- Operator statements: his words stay verbatim in `design.md`, section "Rückmeldungen des Operators", with one line on what followed. Never paraphrase them away.
- Status: name the status of every statement about the tool an agent made (built, tested by whom, not independently read, not accepted). Stories proposed by an agent stay marked as proposals until the operator adopts them.
- Each round of work closes with the fixed task set of `specification.md` (answers computed by `verification/task_set.py`, dated in `testing.md`), an independent reader and the operator's judgement at the screen. Assign each finding to a story, to the design or to the data.
- Nothing invented: dataset figures, CMIF structures, authority IDs and source URLs come from the data files or the cited source. Ask when knowledge is missing.
- Truth hierarchy: the code and the data files outrank the knowledge documents, `tokens.css` outranks values in `design.md`, the registered suites in `run-all-tests.js` outrank any list in the documents. Report contradictions instead of letting them drift.
- No claims of compliance, completeness or passing tests without a check that was actually run and is named.
- No volatile numbers in this file or the knowledge documents (test counts, line counts, file sizes). Dated figures belong in `journal.md` and `testing.md`.

## Writing rules

- Knowledge documents are German with English technical terms unless their frontmatter says otherwise, user stories in the form "Als Forschende möchte ich ..., um ...". This file and `README.md` are English.
- No bold, no emojis, no box drawings, no middle dot as separator. Lists for parallel items, tables where items are parallel, prose where points build on each other.
- Code only where necessary, such as signatures or key constants.
- Every knowledge document carries the frontmatter core (`title`, `project`, `method`, `status`, `created`, `updated`) and, where a template exists, the `template` block. `updated` changes only with content.

## Design principles

Value source: `knowledge/design.md`. Read it before interface or text work.

- One large figure per view over the shared selection, the letters of the selection one click away.
- Mark only uncertain values. Exact data stay unmarked, unknown data are called unknown, gaps in partner data are enrichment potential.
- Rust is the interaction colour, ink blue the data colour, languages take the Okabe-Ito palette from `constants.js`. Take colours, spacing and type from the tokens, never hard-coded values.
- Every figure has a keyboard route to the same data. Every interactive element is keyboard-operable with a visible focus.
- Large scenes are drawn on a canvas with labels and controls as SVG or HTML above it.

## Scope

The tool shows no letter texts, edits and corrects no data, geocodes no regions, identifies no unknown persons, merges no letters across holdings and rates no edition (see `knowledge/project.md`).

Do not:

- push, merge, tag or rewrite history without the operator's explicit instruction
- add mock data, stubs or duplicated helpers to tests
- put knowledge documents, notes or drafts under `docs/`

## Tooling

Check the available tools and runtimes before dependent steps. Name any check that was not run.

### Commands

- Local server: `python -m http.server 8000 --directory docs`, then http://localhost:8000
- Unit tests: http://localhost:8000/test.html?test=true, all suites must pass before every commit
- Smoke test: `uv run tests/browser/smoke.py` (exit code 0 only when every check passed), with `--online` and `--axe <path to axe.min.js>` for the live API and axe-core
- Corpus check of the parser: `node verification/check-corpus.mjs <path to jsdom> <folder of XML files>`
- Fixed task set: `uv run verification/task_set.py` lists every task with its answer computed from the bundled data (`--json` for JSON), `--browser` also reads each answer in the rendered view against a running server on `docs/` (default http://localhost:8137/)
- Preprocessing: `python preprocessing/build_hsa_data.py`, then `uv run preprocessing/build_examples.py` for the start figure

### Conventions

- No build step. JavaScript is ES modules, `const` and `let`, `async`/`await`, pure functions where possible. HTML is semantic, CSS uses BEM class names and is mobile-first. Visibility switches through the class `.hidden`.
- Python follows PEP 8 with docstrings and type hints where appropriate.
- File names: Python `lowercase_with_underscores.py`, JavaScript modules `kebab-case.js`, tests `test-*.js`, knowledge documents lowercase with `INDEX.md` as the hub.
- Code comments are English and explain why, not what.
- Git: commit messages in English, imperative, one line stating what and why where not obvious, with the co-author trailer naming the coding agent and model.

### Testing

Never use mock data or test data objects in tests.

- Tests load real XML fixture files from `docs/data/` through `parseCMIF`. Where a test needs the index shape of the preprocessing, it loads a bundled preprocessed dataset (`docs/data/*.json`) as it is, never a hand-made copy.
- Tests import the real functions from the production modules and never duplicate helpers.
- A new case becomes a letter in a fixture file.

### Security

- Escape every value from the data and from Wikidata before it reaches `innerHTML`, allow only `http` and `https` links.
- `?json=` loads only relative paths under `data/` ending in `.json`, a file list `?files=` only names inside its own folder.
- Never read or print `.env`. Uploaded data stay in the browser.
