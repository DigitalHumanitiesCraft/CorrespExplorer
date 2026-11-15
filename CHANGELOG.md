# Changelog

Changes to CorrespExplorer that a user or a maintainer notices. The repository carries no release tag yet, so everything stands under Unreleased until the first version is tagged. The reasons behind each change are in [knowledge/journal.md](knowledge/journal.md).

## Unreleased

Work of November 2026.

### Added

- TEI letter records (`correspDesc` inside `biblFull`, `bibl` or `msDesc`) are read next to CMIF, with all recipients, postmark, address, shelfmark and inferred statements. Several files load as one holding.
- The parser reads further actions of a letter such as forwarding, dates that give only an earliest or a latest day, and persons identified by a local register key instead of an authority identifier. Records with the same shelfmark are merged into one letter, also across files. A message that two holdings describe independently, with the same sender, recipient and day, is named in both and not merged.
- A space-time view places the letters of each place over the map by year.
- The network opens as a correspondence circle around one person, with distance by the number of letters and angle by the first dated letter. The network of all correspondents remains as a second mode.
- The letters of the current selection open under every view without leaving it.
- A selection line at the lower edge of every view shows the number of selected letters, the active filters and a reset.
- The start view of the explorer shows time, languages, persons, places and subjects of a holding as small figures of the real data. A click in any of them filters all of them.
- The start page shows one letter of the chosen holding unfolded into the data model the tool reads, composed from the statements that holding contains. The Hugo Schuchardt Archiv, offered before as a prepared dataset, is the holding it opens with.

### Changed

- The explorer is ordered by subject (start, letters, persons, places, time, subjects) with the representation switched inside each view, and a narrow rail replaces the wide sidebar.
- Time is one view: letters per year by language, and the chosen period by month or as single letters on a time axis.
- The subjects view is a grid of subjects by years on a fixed scale, with a treemap of shares as its second form.
- The letter list shows rows relative to the central person of a holding, grouped by year, with the year profile as navigation.
- Languages keep one colour across all views, and the language key filters by language.
- Header and footer of the start page follow the form of the other project sites of Digital Humanities Craft.

### Removed

- The tutorial with its guided tour and the `demo=true` entry. Links that still carry `demo=true` or `tour=0` open without an error.
- The calendar heatmap of days and the chronicle layouts. Links with `view=activity` or `view=chronik` open the time view.
- The research paths and the path bar. The basket remains.
- The ridgeline form of the subjects view.
