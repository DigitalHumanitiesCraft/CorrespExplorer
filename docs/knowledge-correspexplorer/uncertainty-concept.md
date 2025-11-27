# Handling Data Uncertainty

How CorrespExplorer handles incomplete or uncertain research data.

Stand: 2025-11-27

Related: [architecture.md](architecture.md), [CMIF-Data.md](CMIF-Data.md)

---

## Problem Overview

Research correspondence data contains three types of uncertainty:

| Type | Example | HSA Dataset |
|------|---------|-------------|
| Incomplete dates | `1913` or `1913-06` instead of `1913-06-13` | 281 of 11,576 (2.4%) |
| Imprecise places | "Steiermark" without coordinates | 45 of 774 places (5.8%) |
| Unknown persons | `[NN]`, `Unbekannt` | ~100 entries |

Principle: Show uncertainty transparently, never hide or fake precision.

---

## 1. Date Precision

### Detection

```javascript
// In cmif-parser.js, extend extractDate()
function getDatePrecision(dateStr) {
    if (!dateStr) return 'unknown';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'day';
    if (/^\d{4}-\d{2}$/.test(dateStr)) return 'month';
    if (/^\d{4}$/.test(dateStr)) return 'year';
    return 'unknown';
}
```

### Display

| Precision | Display | CSS Class |
|-----------|---------|-----------|
| day | "13. Jun 1913" | - |
| month | "Jun 1913" | `.date-month-only` |
| year | "ca. 1913" | `.date-year-only` |
| unknown | "Datum unbekannt" | `.date-unknown` |

```css
.date-month-only,
.date-year-only {
    color: var(--color-text-muted);
}
.date-year-only::before {
    content: "ca. ";
}
```

### Timeline Handling

Count all dates normally. Show uncertainty in tooltip: "davon X mit ungenauem Datum".

---

## 2. Place Precision

### Detection

```javascript
function analyzePlace(place) {
    if (!place) return { type: 'unknown', hasCoordinates: false };

    const hasCoordinates = place.lat != null && place.lon != null;

    if (!place.name || place.name === 'unknown') return { type: 'unknown', hasCoordinates };
    if (!hasCoordinates) return { type: 'region', hasCoordinates };
    return { type: 'exact', hasCoordinates };
}
```

### Map Display

Do not fake coordinates for regions. Show separate list below map:

```
Karte: 729 Orte mit Koordinaten
Ohne Koordinaten: 45 Orte
  - Steiermark (23 Briefe)
  - Deutschland (12 Briefe)
  - [unbekannt] (10 Briefe)
```

---

## 3. Person Identification

### Detection

```javascript
const UNKNOWN_PATTERNS = [
    /^\[NN\]$/i,
    /^N\.?N\.?$/i,
    /^Unbekannt$/i,
    /^Unknown$/i
];

function isUnknownPerson(name) {
    if (!name) return true;
    return UNKNOWN_PATTERNS.some(p => p.test(name.trim()));
}
```

### Display

| Type | Display | Avatar |
|------|---------|--------|
| Known | "Hugo Schuchardt" | "HS" |
| Unknown | "[Unbekannt]" | "?" |

```css
.person-unknown {
    color: var(--color-text-muted);
    font-style: italic;
}
.person-unknown .person-avatar {
    border: 2px dashed var(--color-border);
}
```

### Network View

Merge all unknown persons into single "[Unbekannt]" node.

---

## 4. Statistics Display

Extend sidebar stats to show uncertainty:

```
Briefe: 11.576
  - davon mit ungenauem Datum: 281 (2.4%)

Absender: 846
  - davon unbekannt: 12 (1.4%)

Orte: 774
  - davon ohne Koordinaten: 45 (5.8%)
```

---

## 5. Filter Options

Add data quality filter section:

```html
<div class="filter-group" id="quality-filter-group">
    <h4>Datenqualitaet</h4>
    <label><input type="checkbox" id="filter-precise-dates" /> Nur exakte Datierungen</label>
    <label><input type="checkbox" id="filter-known-persons" /> Nur bekannte Personen</label>
    <label><input type="checkbox" id="filter-located-places" /> Nur lokalisierte Orte</label>
</div>
```

URL parameters: `precise=1`, `known=1`, `located=1`

Default: Show all data including uncertain entries.

---

## 6. Export

Include uncertainty metadata in exports:

CSV columns: `Datum_Praezision`, `Sender_Unbekannt`, `Ort_Koordinaten`

JSON fields: `precision`, `isUnknown`, `hasCoordinates`

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Timeline with year-only dates? | Count normally, show in tooltip | Few entries, no significant distortion |
| Unknown persons in network? | Merge into single node | Shows how many letters lack attribution |
| Regions on map? | Separate list, not on map | No fake precision |
| Default filter state? | Show all data | Researchers decide what to filter |

---

## Non-Goals

- Automatic date correction
- Geocoding of regions
- Person identification
- Quality scoring ("good"/"bad")

The tool visualizes uncertainty, it does not resolve it.
