---
title: Uncertainty Specification
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: en
created: 2025-11-27
updated: 2026-11-15
authors: [Christopher Pollin]
related: [specification, data, design, architecture]
---

# Handling Data Uncertainty

How CorrespExplorer handles incomplete or uncertain research data.

Related: [specification.md](specification.md#adr-002-unsicherheit-sichtbar-machen), [data.md](data.md), [design.md](design.md#unsicherheit), [architecture.md](architecture.md)

User documentation: [about.html](../docs/about.html) (section "Umgang mit Unsicherheit")

Test file: [data/test-uncertainty.xml](../docs/data/test-uncertainty.xml) (23 test cases)

---

## CMIF Uncertainty Annotations

The CMIF standard supports several ways to express uncertainty:

### Date Attributes

| Attribute | Meaning | Example | Uncertainty Type |
|-----------|---------|---------|------------------|
| `when` | Exact date | `when="1900-06-15"` | None (if complete) |
| `when` | Incomplete | `when="1900-06"` or `when="1900"` | Implicit (format) |
| `from`/`to` | Date range | `from="1900-06-01" to="1900-06-30"` | Explicit range |
| `notBefore`/`notAfter` | Terminus post/ante quem | `notBefore="1900-01-01" notAfter="1900-12-31"` | Explicit bounds |
| `cert` | Certainty level | `cert="low"` | Explicit doubt |

### Person/Place Patterns

| Pattern | Meaning | Example |
|---------|---------|---------|
| `[NN]` | Completely unknown | `<persName>[NN]</persName>` |
| `Unbekannt` / `Unknown` | Not identified | `<persName>Unbekannt</persName>` |
| Partial `[NN]` | Partially known | `<persName>Rozario, [NN] de</persName>` |
| Missing `@ref` | No authority link | `<persName>Max Mustermann</persName>` |
| `Unbekannt` place | Unknown location | `<placeName>Unbekannt</placeName>` |
| Region name | No coordinates | `<placeName>Steiermark</placeName>` |

### HSA Dataset Analysis

The Hugo Schuchardt Archive CMIF uses only implicit uncertainty. It marks no value as inferred, which is a statement about its markup and not about its editorial practice ([Editorial inference](#editorial-inference-postmarks-and-implausible-years)). Counts from `docs/data/hsa-letters.json` (11,576 letters, preprocessing of 2026-10-29), computed on 2026-10-29:

| Feature | Used | Count |
|---------|------|-------|
| `when` attribute | Yes | 11,272 letters with a date |
| Incomplete dates (YYYY-MM, YYYY) | Yes | 281 letters (115 month, 166 year) |
| No date | Yes | 304 letters |
| `from`/`to` ranges | No | 0 |
| `notBefore`/`notAfter` | No | 0 |
| `cert` attribute | No | 0 |
| `Unbekannt` as place of sending, without GeoNames ID | Yes | 576 letters |
| Places with GeoNames ID but without coordinates | Yes | 139 of 774 places, 708 letters |
| `[NN]` in correspondents | No | 0; in `hsa.xml` three mentions of two persons carry `[NN]` |
| Correspondents without authority ID | Yes | 179 of 1,031 persons (by `personKey`), 524 letters as sender |

The preprocessed letters carry `datePrecision` and `dateCertainty`, but no `precision` on `sender`, `recipient` and `place_sent`. Person and place markers therefore stay empty for the HSA dataset, including the 576 letters from `Unbekannt`; the same file uploaded as CMIF is classified by the parser. This gap is listed in [plan.md](plan.md#daten-und-parser).

---

## Uncertainty Categories

### 1. Date Precision

`classifyDate()` in `utils.js` classifies a TEI date for the CMIF parser and the correspSearch loader. `from` and `to` on the same day count as that day. A single bound (`notBefore` or `notAfter` alone) keeps the bound as the date, sets `dateBound` and leaves the year empty, so the letter stands beside the time axis (since 2026-11-14). Otherwise the primary date is `when`, else `from`, else `notBefore`; `dateTo` is `to` or `notAfter`; the year is the first four characters of the primary date. The CMIF parser cuts a time of day before classifying, so `when="1900-06-15T10:00"` is the day 1900-06-15 (since 2026-11-15); the correspSearch loader passes its values unchanged.

| Level | Detection | HSA Count |
|-------|-----------|-----------|
| day | `when` as `YYYY-MM-DD`, or `from` equal to `to` | 10,991 |
| month | `when` as `YYYY-MM` | 115 |
| year | `when` as `YYYY` | 166 |
| range | `from` and `to`, `notBefore` and `notAfter`, or a single bound (then without year) | 0 |
| unknown | No date attribute | 304 |

Certainty is read from `cert` (default `high`) independently of the precision level. HSA: 11,576 `high`, 0 `low`.

### 2. Place Precision

`getPlacePrecision()` in `cmif-parser.js` classifies the place of sending. Coordinates are a separate question: the map shows a place only with `lat` and `lon`.

| Level | Detection | HSA Count |
|-------|-----------|-----------|
| exact | GeoNames ID present | 11,000 letters at 774 places |
| region | Name without GeoNames ID | 0 |
| unknown | Name `Unbekannt`, `Unknown`, `?`, `[?]` or no name | 576 letters |

Of the 774 HSA places with GeoNames ID, 635 carry coordinates and 139 do not (`meta.places_with_coordinates`, `meta.places_without_coordinates`, coverage 82.0 %).

### 3. Person Identification

`getPersonPrecision()` in `cmif-parser.js` classifies sender and recipient. Unknown patterns (`UNKNOWN_PERSON_PATTERNS`):

```javascript
[/^\[NN\]$/i, /^N\.?N\.?$/i, /^Unbekannt$/i, /^Unknown$/i, /^\?\?\?$/]
```

| Level | Detection | HSA Count (persons by `personKey`) |
|-------|-----------|-----------|
| unknown | No name, or a name matching the unknown patterns | 0 |
| partial | Name contains `[NN]`, `[N.N.]` or `[?]` | 0 |
| identified | Authority reference recognised by `parseAuthorityRef()` | 852 |
| named | Name without authority reference; also organisations (`orgName`) | 179 |

---

## UI Display

### Date Display

`formatDateWithPrecision()` in `formatters.js` writes the date, `getDatePrecisionClass()` adds the CSS class. Month names are German abbreviations (`Jan`, `Feb`, `Maer`, `Apr`, `Mai`, `Jun`, `Jul`, `Aug`, `Sep`, `Okt`, `Nov`, `Dez`).

| Precision | Display | Icon (title) | CSS Class |
|-----------|---------|--------------|-----------|
| day | "15.6.1900" | - | - |
| month | "Jun 1900" | `fa-calendar-alt` ("Nur Monat bekannt") | `.date-imprecise` |
| year | "1900" | `fa-calendar-alt` ("Nur Jahr bekannt") | `.date-imprecise` |
| range | "1.6.1900 – 30.6.1900" | `fa-arrows-alt-h` ("Zeitraum (notBefore/notAfter)") | `.date-range` |
| uncertain (`cert="low"`) | date as for its precision, e.g. "15.6.1900" | `fa-question-circle` ("Unsichere Datierung (cert=low)"), replaces the other icons | `.date-uncertain` |
| unknown | "unbekannt" | `fa-question` ("Datum unbekannt") | `.date-unknown` |

A range without `dateTo` shows the single date without icon. Colours of icons and classes come from tokens, see [design.md](design.md#unsicherheit); the classes are defined in `tokens.css` and `explore.css`.

### Map Display

Do not fake coordinates. Places without coordinates appear in the places view, not on the map; a notice in the places view names their number and offers the resolution through Wikidata on click. HSA, 2026-10-29: 635 of 774 places with GeoNames ID on the map, 139 without coordinates, plus `Unbekannt` (576 letters) without GeoNames ID.

### Person Display

`formatPersonName()` and `getPersonInitials()` in `formatters.js`. Since 2026-11-14 the list of correspondents shows no initials. The card layout of the chronicle, the last place that showed them, was retired with the chronicle on 2026-11-14, so no view shows initials. `persons-view.js` still imports `getPersonInitials()` without calling it.

| Precision | Display | Avatar |
|-----------|---------|--------|
| identified | "Hugo Schuchardt" | "HS" |
| named | "Max Mustermann" in `.person-named` | "MM" (no badge) |
| partial | "Rozario, [NN] de" in `.person-partial` | "R?" |
| unknown | name in brackets, e.g. "[[NN]]" or "[Unbekannt]", in `.person-unknown`; without name "[Unbekannt]" | "?" |

`formatPlaceName()` adds a question mark icon ("Unbekannter Ort") to unknown places. A region place, meaning a name without GeoNames ID, is shown unmarked since 2026-11-14, with the title "Ohne GeoNames-ID, nicht auf der Karte": for editions that record no GeoNames IDs it is the normal case, and the earlier hint "(Region)" claimed an imprecision the source does not state.

## Editorial inference, postmarks and implausible years

Added on 2026-11-14 for TEI that describes each letter in its own record. Every rule is triggered by properties of the data and holds for any file that carries them.

A value counts as inferred only where the source marks it, by `@evidence`, by a `@type` or `@ana` token supplied, deduced, inferred, conjecture or erschlossen, or by square brackets around the whole value. An unmarked value is taken as the edition gives it, with the precision of its attribute. The tool adds no doubt of its own. In the HSA, o:hsa.letter.10232 has `when="1887-04"` without `cert` or `evidence`, so the tool shows April 1887 with month precision and not as inferred, whatever the edition's reasons for giving only the month. The same holds for a read date beside a supplied wording. Whether the read value is itself an editorial fill-in is for the edition to say, and the supplied wording is kept beside it in `dateSupplied`.

| Property of the source | Detection in `cmif-parser.js` | Field | Display |
|---|---|---|---|
| Value supplied by the edition | `@evidence`, a `@type` or `@ana` token `supplied`, `deduced`, `inferred`, `conjecture…`, `erschlossen`, or square brackets around the whole value (`isInferred()`) | `dateInferred`, `place_sent.inferred` | value in square brackets, class `.date-inferred` or `.place-inferred`, legend line above the letter list |
| Supplied wording beside a read date | a date element marked as supplied without a value of its own, beside the date element whose value is shown (since 2026-11-15) | `dateSupplied` with the wording; the read date keeps its precision and stays unmarked | labelled value "Ergänztes Datum" in the letter row, the letter dialog and the basket, beside the read date (since `65ea4b8`); exported as `date_supplied` |
| Date only as text | `date` without machine-readable attribute | `dateText`, `date` stays null | the text in italics, off the time axis |
| Postmark | `placeName` or `note` with `@type` postmark, postalStamp or Poststempel | `postmark` | labelled value "Poststempel", never the sending place |
| Wording of the place on the letter | `placeName type="original"` | never the sending place; where it is the only `placeName` besides postmarks, its text is kept as `placeText` and the letter has no sending place (since 2026-11-14) | the wording as the source gives it, not in the place list |
| Several places of sending | further `placeName` of the sending action with another name than the chosen one, neither postmark nor wording (since 2026-11-15) | `placeAlternatives` with name, GeoNames id and inferred mark; the place of sending stays the first untyped one | labelled value "Weiterer Absendeort" or "Weitere Absendeorte" in the letter row, the letter dialog and the basket, an inferred one in square brackets (since `65ea4b8`); the views count only the place of sending; exported as `place_alternatives` |
| Postal address | every `address` inside `correspDesc`, its parts joined with a comma; a `placeName` or `date` inside an address belongs to the address (since 2026-11-15) | `address` (the first), `addresses` (all, where there are several) | labelled value "Anschrift", never the sending place; several addresses as "Anschriften", each on its own line in the dialog and as its own "Anschrift" in the basket (since `65ea4b8`); exported as `addresses_all` |
| Reference without authority record | `persName/@ref` or `orgName/@ref` that is no URL of a known authority with a number, such as `#ID`, a Wikidata URI or a bare `https://viaf.org/viaf/` (since 2026-11-15 also for http(s) URLs of unknown systems) | `localRef`, precision `named` | "ohne Normdatensatz" |
| Year far from all others | a gap of 40 years or more separates less than a twentieth of the dated letters from the rest (`flagImplausibleYears()`) | `dateImplausible`, `year` null, `date` kept | date as the source gives it with the word "unplausibel", off the time axis, sorted with the undated letters |
| Several records of one letter | records sharing a shelfmark and a date; records without a date join where all dated records of the shelfmark agree (`mergeRecords()`) | `records`, `recordsDiffer` | "n Einträge in der Quelle", with "Angaben weichen ab" where sender, recipients or place differ by name; the dialog lists every record |
| One shelfmark, differing dates | records of one shelfmark with different dates: one letter per date, records without a date stay single (since 2026-11-15) | `sharedSignature` with id and date of the other letters | "Gleiche Signatur wie Brief vom …" in the letter row and the basket (`sharedLetterLabel()` in `formatters.js`, a date only in words in quotation marks); the dialog lists the other letters under "Unter derselben Signatur", each opening in place (since `65ea4b8`); exported as `shared_signature` |
| One date bound and no date | `date` with only `@notBefore` or only `@notAfter` (`classifyDate()`) | `dateBound`, `date` holds the bound, `year` null | "nicht nach 1848" or "nicht vor 1848", off the time axis, filter "Nur Datumsgrenze" |
| Placeholder for no date | text of the `date` element such as "ohne Datum", "o. D.", "n. d.", "s.d.", also in square brackets as "[o. D.]" or "[Date Unknown]" (`isNoDate()`) | no `dateText`, no `dateInferred` | the letter counts as undated, not as dated in words |
| Action besides sending and receiving | `correspAction` with another `@type`, such as `forwarded` | `furtherActions` with type, persons and a place or date only where the action carries its own | row "Weitergeleitet an" in the dialog, filter "Weitergeleitet"; the persons are no correspondents and enter neither index nor network |
| Id in the register of the edition | `persName/@corresp`, or a `@ref` that is no authority record | `localRef` | key of the person where no authority record exists, so name variants of one register entry stay one person |
| Same identified sender, recipients and day in two files | letters of different files after merging by shelfmark (`markParallels()`) | `parallels` with id and file of the others, `file` on every letter of a dataset from several files | section "Möglicherweise derselbe Brief in einer anderen Datei", filter "Auch in anderer Datei"; nothing is merged, both count |

An inferred value is never shown as secured, a postmark and an address never as a place, and the tool decides nothing between differing records: the first record with a date leads, the others fill only what it lacks. A merged letter shows a date or place as inferred exactly when the record that value comes from marks it (since 2026-11-15; before, one marked record made the date of the merged letter inferred). The sidebar group "Überlieferung" (`LETTER_FEATURES` in `constants.js`, URL parameter `feat`) offers one filter per property the loaded dataset has, so each group can be listed; plain CMIF shows no such group. Unknown person patterns now include `Unidentified` and bilingual placeholders such as `Unbekannt/Unidentified`.

---

## Filter Options

```html
<div class="filter-group" id="quality-filter-group">
    <label><input type="checkbox" id="filter-precise-dates" /> Nur exakte Datierungen</label>
    <label><input type="checkbox" id="filter-known-persons" /> Nur identifizierte Personen</label>
    <label><input type="checkbox" id="filter-located-places" /> Nur lokalisierte Orte</label>
</div>
```

URL parameters: `precise=1`, `known=1`, `located=1`

Default: Show all data including uncertain entries.

---

## Statistics Display

Since 2026-11-14 the section of the sidebar with these counts (`#sidebar-dataset`) stays hidden; `updateQualityIcons()` in `explore.js` still fills its icons, and the shares appear as the neutral data-situation figures of the start view. The icons give letters, persons and places a tooltip that names the share without exact value. The figures come from `datasetQuality()` in `research-paths.js`, the same source as the data-situation chips of the overview, so uploads and preprocessed datasets count alike. The icon is hidden when the share is zero. Until 2026-11-05 the icons read `meta.uncertainty` of the preprocessing.

- Letters: every letter without day precision, "{n} ohne tagesgenaues Datum ({p}%)"
- Persons: senders and recipients without authority id, counted by `personKey`, "{n} Personen ohne Normdatei-ID ({p}%)"
- Places: places of dispatch without coordinates, counted by `placeKey`, "{n} Orte ohne Koordinaten ({p}%)"

HSA, from `meta.uncertainty` of `hsa-letters.json` on 2026-10-29: 585 of 11,576 letters with imprecise or missing date (5.1 %: 115 month, 166 year, 304 unknown). The preprocessing writes no sender or place statistics, so the two other icons stay hidden for the HSA. Sidebar and overview count persons and places alike from the letters with `summarizeCorpus()`: 1,031 persons (senders and recipients by `personKey`) and 774 places (by `placeKey`, without the placeholder "Unbekannt", see `isKnownPlace()`). The quality icon of the persons card still counts senders.

---

## Export Format

`export.js` defines one column set for CSV and JSON (`LETTER_EXPORT_COLUMNS`). The uncertainty columns are `date_precision`, `date_certainty`, `sender_precision`, `recipient_precision` and `place_precision`; `date_to` carries the end of a range.

JSON example (one element of the exported array, case 005 of `test-uncertainty.xml`):
```json
{
  "id": "005",
  "date": "1900-01-01",
  "date_to": "1900-12-31",
  "year": 1900,
  "date_precision": "range",
  "date_certainty": "high",
  "sender_name": "Hugo Schuchardt",
  "sender_id": "261931943",
  "sender_precision": "identified",
  "place_name": "Graz",
  "place_geonames": "2778067",
  "place_precision": "exact"
}
```

The example omits the remaining columns of `LETTER_EXPORT_COLUMNS`, among them the columns of letter records (`date_text`, `date_inferred`, `date_implausible`, `place_inferred`, `date_bound` and others) and, appended on 2026-11-15, `date_supplied`, `place_alternatives`, `addresses_all` and `shared_signature`.

---

## Test Cases

The file `data/test-uncertainty.xml` contains 23 cases organized in 4 sections:

### Section A: Date Uncertainty (Cases 001-007)

| Case | Description | Expected Display |
|------|-------------|------------------|
| 001 | Complete data (baseline) | "15.6.1900" |
| 002 | Year-month only (YYYY-MM) | "Jun 1900" with calendar icon, .date-imprecise |
| 003 | Year only (YYYY) | "1900" with calendar icon, .date-imprecise |
| 004 | Date range with from/to | "1.6.1900 – 30.6.1900" with .date-range |
| 005 | Date with notBefore/notAfter | "1.1.1900 – 31.12.1900" with .date-range |
| 006 | Date with cert="low" | "15.6.1900" with question mark icon, .date-uncertain |
| 007 | No date at all | "unbekannt" with .date-unknown |

### Section B: Person Uncertainty (Cases 008-013)

| Case | Description | Expected Display |
|------|-------------|------------------|
| 008 | Unknown sender [NN] | Avatar "?", .person-unknown |
| 009 | Unknown sender "Unbekannt" | Avatar "?", .person-unknown |
| 010 | Partial name "Rozario, [NN] de" | Avatar "R?", .person-partial |
| 011 | Unknown recipient | Recipient Avatar "?", .person-unknown |
| 012 | Person without authority | Name shown, .person-named, no badge |
| 013 | Person with GND (not VIAF) | Normal display with GND badge |

### Section C: Place Uncertainty (Cases 014-018)

| Case | Description | Expected Display |
|------|-------------|------------------|
| 014 | Unknown place "Unbekannt" | .place-unknown, no map marker |
| 015 | Region without GeoNames | "Steiermark" with .place-region |
| 016 | Country only | "Deutschland" with .place-region |
| 017 | No place at all | Empty or "-" |
| 018 | Place with GeoNames | Normal display, map marker |

### Section D: Special Cases (Cases 019-025)

| Case | Description | Expected Display |
|------|-------------|------------------|
| 019 | Organization as sender | Name shown, isOrganization=true |
| 020 | Multiple uncertainties | All indicators visible |
| 021 | Letter with language (fr) | Language filter shows "Franzoesisch" |
| 022 | Letter with subjects | Topics visible in Topics view |
| 023 | Language target "None" with label Ladinisch, as in the HSA source | Shown as "Ladinisch", not counted as a letter without language |
| 024 | `from` and `to` on the same day, as correspSearch writes exact dates | Day precision, no range marker |
| 025 | `notBefore="1850"` and `notAfter="1950"`, a span over a century | Range precision, shown in the timeline bin "Spanne", not part of the dataset period |

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Timeline with year-only dates? | Count normally, show in tooltip | Few entries, no distortion |
| Unknown persons in network? | Merge into single node | Shows attribution gaps |
| Regions on map? | Separate list | No fake precision |
| Default filter state? | Show all | Researchers decide |
| cert="low" display? | Question mark icon before the date | Clear visual marker |

---

## Non-Goals

- Automatic date correction
- Geocoding of regions
- Person identification
- Quality scoring ("good"/"bad")

The tool visualizes uncertainty, it does not resolve it.
