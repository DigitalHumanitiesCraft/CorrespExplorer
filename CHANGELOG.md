# Changelog

Changes to CorrespExplorer that a user or a maintainer notices. Version 0.9.0 was deployed to GitHub Pages on 2026-11-16. The [GitHub pre-release](https://github.com/DigitalHumanitiesCraft/CorrespExplorer/releases/tag/v0.9.0) tags the reviewed source as `v0.9.0`. The reasons behind each change are in [knowledge/journal.md](knowledge/journal.md).

## Unreleased

## 0.9.0 (2026-11-16)

Verification status `reviewed`. Module and browser smoke tests pass. A fresh independent agent found no material code or rendering blocker in the reviewed scope. The fixed task set retains one unresolved mismatch and manual tasks. This is a research preview, without scholarly validation or a guarantee of stable interfaces.

### Release corrections

- Use the same language colours on the start page and in the explorer, including languages outside the former three-language subset.
- Use one topic colour across the start page, dashboard and topics view.
- Let the shared language key wrap within its available width.
- Label the network level containing correspondents and mentioned persons as a union, and distinguish the places drawable on the map from those with dates in space-time.
- Clear an ego-network person selection with Escape and restore keyboard focus.
- Move internal module maps and the legacy tool logos out of the Pages directory; use the DHCraft mark under its existing permission.
- Include source-specific licence metadata in the coordinate tables and their generator, preserving all coordinate values.

### Known limitations

- The proposed task US-40 asks for letters mentioning people; the start page shows the number of distinct mentioned people. This remains an undecided requirement, not a passing task.
- The shared letter-model statements and the combined register are future work.
- The interface density checker reports threshold exceedances on entry pages and narrow explorer views. The existing layouts remain in place. Full UI acceptance is pending.
- Screen-reader use and browsers other than Chrome have not been systematically tested. External services remain subject to availability.
- The original tool logos remain outside the website until their provenance and rights are established.

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
