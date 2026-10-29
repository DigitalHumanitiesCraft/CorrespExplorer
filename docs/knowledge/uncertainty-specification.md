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
updated: 2026-10-29
authors: [Christopher Pollin]
related: [specification, data, design, architecture]
---

# Handling Data Uncertainty

How CorrespExplorer handles incomplete or uncertain research data.

Related: [specification.md](specification.md#adr-002-unsicherheit-sichtbar-machen), [data.md](data.md), [design.md](design.md#unsicherheits-indikatoren), [architecture.md](architecture.md)

User documentation: [about.html](../about.html) (section "Umgang mit Unsicherheit")

Test file: [data/test-uncertainty.xml](../data/test-uncertainty.xml) (23 test cases)

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

The Hugo Schuchardt Archive CMIF uses only implicit uncertainty. Counts from `docs/data/hsa-letters.json` (11,576 letters, preprocessing of 2026-10-29), computed on 2026-10-29:

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

The preprocessed letters carry `datePrecision` and `dateCertainty`, but no `precision` on `sender`, `recipient` and `place_sent`. Person and place markers therefore stay empty for the HSA dataset, including the 576 letters from `Unbekannt`; the same file uploaded as CMIF is classified by the parser. This gap is listed in [plan.md](plan.md#vorhaben).

---

## Uncertainty Categories

### 1. Date Precision

`classifyDate()` in `utils.js` classifies a TEI date for the CMIF parser and the correspSearch loader. The primary date is `when`, else `from`, else `notBefore`; `dateTo` is `to` or `notAfter`; the year is the first four characters of the primary date.

| Level | Detection | HSA Count |
|-------|-----------|-----------|
| day | `when` as `YYYY-MM-DD` | 10,991 |
| month | `when` as `YYYY-MM` | 115 |
| year | `when` as `YYYY` | 166 |
| range | `from` and `to`, or `notBefore` or `notAfter` | 0 |
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

A range without `dateTo` shows the single date without icon. Colours of icons and classes come from tokens, see [design.md](design.md#unsicherheits-indikatoren); the classes are defined in `tokens.css` and `explore.css`.

### Map Display

Do not fake coordinates. Places without coordinates appear in the places view, not on the map; a notice in the places view names their number and offers the resolution through Wikidata on click. HSA, 2026-10-29: 635 of 774 places with GeoNames ID on the map, 139 without coordinates, plus `Unbekannt` (576 letters) without GeoNames ID.

### Person Display

`formatPersonName()` and `getPersonInitials()` in `formatters.js`:

| Precision | Display | Avatar |
|-----------|---------|--------|
| identified | "Hugo Schuchardt" | "HS" |
| named | "Max Mustermann" in `.person-named` | "MM" (no badge) |
| partial | "Rozario, [NN] de" in `.person-partial` | "R?" |
| unknown | name in brackets, e.g. "[[NN]]" or "[Unbekannt]", in `.person-unknown`; without name "[Unbekannt]" | "?" |

`formatPlaceName()` adds a question mark icon ("Unbekannter Ort") to unknown places and the hint "(Region)" to region places.

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

The sidebar shows letters, senders and places with an icon whose tooltip names the uncertain share (`updateUncertaintyStats()` in `explore.js`). The icon is hidden when the share is zero or `meta.uncertainty` has no entry for it.

- Letters: month, year, range and unknown dates together, "{n} mit ungenauem Datum ({p}%)"
- Senders: unknown, partial and missing senders, "{n} unbekannt/unvollstaendig ({p}%)"
- Places: region, unknown and missing places, "{n} ohne Koordinaten ({p}%)"

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

The example omits the remaining columns (`recipient_name`, `recipient_id`, `recipient_precision`, `language`, `url`).

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

### Section D: Special Cases (Cases 019-023)

| Case | Description | Expected Display |
|------|-------------|------------------|
| 019 | Organization as sender | Name shown, isOrganization=true |
| 020 | Multiple uncertainties | All indicators visible |
| 021 | Letter with language (fr) | Language filter shows "Franzoesisch" |
| 022 | Letter with subjects | Topics visible in Topics view |
| 023 | Language target "None" with label Ladinisch, as in the HSA source | Shown as "Ladinisch", not counted as a letter without language |

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
