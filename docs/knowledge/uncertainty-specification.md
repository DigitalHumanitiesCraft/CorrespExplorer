# Handling Data Uncertainty

How CorrespExplorer handles incomplete or uncertain research data.

Stand: 2025-11-27

Related: [architecture.md](architecture.md), [CMIF-Data.md](CMIF-Data.md)

User documentation: [about.html](../about.html) (Section "Umgang mit Datenqualitaet")

Test file: [data/test-uncertainty.xml](../data/test-uncertainty.xml) (22 test cases)

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

The Hugo Schuchardt Archive CMIF uses only implicit uncertainty:

| Feature | Used | Not Used |
|---------|------|----------|
| `when` attribute | Yes | - |
| Incomplete dates (YYYY, YYYY-MM) | Yes (~280 cases) | - |
| `from`/`to` ranges | - | Not used |
| `notBefore`/`notAfter` | - | Not used |
| `cert` attribute | - | Not used |
| `Unbekannt` places | Yes (~50 cases) | - |
| `[NN]` persons | Few cases | - |

---

## Uncertainty Categories

### 1. Date Precision

| Level | Detection | HSA Count |
|-------|-----------|-----------|
| day | `YYYY-MM-DD` format | ~11,300 |
| month | `YYYY-MM` format | 115 |
| year | `YYYY` format | 166 |
| range | `from`/`to` or `notBefore`/`notAfter` present | 0 |
| uncertain | `cert="low"` | 0 |
| unknown | No date element | Few |

```javascript
function extractDateInfo(dateEl) {
    if (!dateEl) return { date: null, year: null, precision: 'unknown', certainty: 'high' };

    const when = dateEl.getAttribute('when');
    const from = dateEl.getAttribute('from');
    const to = dateEl.getAttribute('to');
    const notBefore = dateEl.getAttribute('notBefore');
    const notAfter = dateEl.getAttribute('notAfter');
    const cert = dateEl.getAttribute('cert') || 'high';

    // Determine primary date string
    const dateStr = when || from || notBefore;
    const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : null;

    // Determine precision
    let precision = 'unknown';
    if (from && to) {
        precision = 'range';
    } else if (notBefore || notAfter) {
        precision = 'range';
    } else if (when) {
        if (when.length === 10) precision = 'day';
        else if (when.length === 7) precision = 'month';
        else if (when.length === 4) precision = 'year';
    }

    return {
        date: dateStr,
        dateTo: to || notAfter || null,
        year: isNaN(year) ? null : year,
        precision,
        certainty: cert
    };
}
```

### 2. Place Precision

| Level | Detection | HSA Count |
|-------|-----------|-----------|
| exact | Has GeoNames ref with coordinates | ~729 |
| region | Name present, no GeoNames | ~45 |
| unknown | `Unbekannt` or missing | ~50 |

```javascript
function analyzePlacePrecision(place) {
    if (!place) return { precision: 'unknown', hasCoordinates: false };

    const name = place.name?.toLowerCase();
    if (!name || name === 'unbekannt' || name === 'unknown') {
        return { precision: 'unknown', hasCoordinates: false };
    }

    const hasCoordinates = place.lat != null && place.lon != null;
    return {
        precision: hasCoordinates ? 'exact' : 'region',
        hasCoordinates
    };
}
```

### 3. Person Identification

| Level | Detection | HSA Count |
|-------|-----------|-----------|
| identified | Has authority ref (VIAF, GND) | ~830 |
| named | Name present, no authority | ~16 |
| partial | Contains `[NN]` in name | Few |
| unknown | `[NN]`, `Unbekannt`, `Unknown` | ~100 |

```javascript
const UNKNOWN_PATTERNS = [
    /^\[NN\]$/i,
    /^N\.?N\.?$/i,
    /^Unbekannt$/i,
    /^Unknown$/i,
    /^\?\?\?$/
];

function analyzePersonPrecision(person) {
    if (!person || !person.name) {
        return { precision: 'unknown', hasAuthority: false };
    }

    const name = person.name.trim();

    if (UNKNOWN_PATTERNS.some(p => p.test(name))) {
        return { precision: 'unknown', hasAuthority: false };
    }

    if (/\[NN\]|\[N\.N\.\]|\[\?\]/.test(name)) {
        return { precision: 'partial', hasAuthority: !!person.authority };
    }

    return {
        precision: person.authority ? 'identified' : 'named',
        hasAuthority: !!person.authority
    };
}
```

---

## UI Display

### Date Display

| Precision | Display | CSS Class |
|-----------|---------|-----------|
| day | "15. Jun 1900" | - |
| month | "Jun 1900" | `.date-imprecise` |
| year | "ca. 1900" | `.date-imprecise` |
| range | "Jun 1900 - Dec 1900" | `.date-range` |
| uncertain | "15. Jun 1900 (?)" | `.date-uncertain` |
| unknown | "Datum unbekannt" | `.date-unknown` |

```css
.date-imprecise { color: var(--color-text-muted); }
.date-range { color: var(--color-text-muted); }
.date-uncertain::after { content: " (?)"; color: var(--color-warning); }
.date-unknown { color: var(--color-text-muted); font-style: italic; }
```

### Map Display

Do not fake coordinates. Show regions in separate list:

```
Karte: 729 Orte mit Koordinaten
Ohne Koordinaten: 45 Orte
  - Steiermark (23 Briefe)
  - Deutschland (12 Briefe)
  - [unbekannt] (10 Briefe)
```

### Person Display

| Precision | Display | Avatar |
|-----------|---------|--------|
| identified | "Hugo Schuchardt" | "HS" |
| named | "Max Mustermann" | "MM" (no badge) |
| partial | "Rozario, [?] de" | "R?" |
| unknown | "[Unbekannt]" | "?" |

---

## Filter Options

```html
<div class="filter-group" id="quality-filter-group">
    <h4>Datenqualitaet</h4>
    <label><input type="checkbox" id="filter-precise-dates" /> Nur exakte Datierungen</label>
    <label><input type="checkbox" id="filter-known-persons" /> Nur identifizierte Personen</label>
    <label><input type="checkbox" id="filter-located-places" /> Nur lokalisierte Orte</label>
</div>
```

URL parameters: `precise=1`, `known=1`, `located=1`

Default: Show all data including uncertain entries.

---

## Statistics Display

Extend sidebar stats:

```
Briefe: 11.576
  - davon mit ungenauem Datum: 281 (2.4%)

Absender: 846
  - davon unbekannt: 12 (1.4%)

Orte: 774
  - davon ohne Koordinaten: 45 (5.8%)
```

---

## Export Format

CSV columns: `Datum_Praezision`, `Datum_Sicherheit`, `Sender_Praezision`, `Ort_Praezision`

JSON example:
```json
{
  "id": "test-005",
  "date": "1900-01-01",
  "dateTo": "1900-12-31",
  "precision": "range",
  "certainty": "high",
  "sender": {
    "name": "Hugo Schuchardt",
    "precision": "identified"
  },
  "place_sent": {
    "name": "Graz",
    "precision": "exact"
  }
}
```

---

## Test Cases

The file `data/test-uncertainty.xml` contains 22 cases organized in 4 sections:

### Section A: Date Uncertainty (Cases 001-007)

| Case | Description | Expected Display |
|------|-------------|------------------|
| 001 | Complete data (baseline) | "15. Jun 1900" |
| 002 | Year-month only (YYYY-MM) | "Jun 1900" with .date-imprecise |
| 003 | Year only (YYYY) | "ca. 1900" with .date-imprecise |
| 004 | Date range with from/to | "1. Jun - 30. Jun 1900" with .date-range |
| 005 | Date with notBefore/notAfter | "1. Jan - 31. Dez 1900" with .date-range |
| 006 | Date with cert="low" | "15. Jun 1900" + question mark icon |
| 007 | No date at all | "Datum unbekannt" with .date-unknown |

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

### Section D: Special Cases (Cases 019-022)

| Case | Description | Expected Display |
|------|-------------|------------------|
| 019 | Organization as sender | Name shown, isOrganization=true |
| 020 | Multiple uncertainties | All indicators visible |
| 021 | Letter with language (fr) | Language filter shows "Franzoesisch" |
| 022 | Letter with subjects | Topics visible in Topics view |

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Timeline with year-only dates? | Count normally, show in tooltip | Few entries, no distortion |
| Unknown persons in network? | Merge into single node | Shows attribution gaps |
| Regions on map? | Separate list | No fake precision |
| Default filter state? | Show all | Researchers decide |
| cert="low" display? | Add (?) suffix | Clear visual marker |

---

## Non-Goals

- Automatic date correction
- Geocoding of regions
- Person identification
- Quality scoring ("good"/"bad")

The tool visualizes uncertainty, it does not resolve it.
