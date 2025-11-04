# HerData Debug System Documentation

## Overview

The HerData project implements a comprehensive data provenance tracking system that documents the origin and transformation of every data field in the pipeline. This enables transparent, reproducible research by making data sources explicitly traceable.

## Implementation (Phase 1 Complete - Backend)

### Data Pipeline Enhancement

The pipeline now tracks provenance for all 11 data fields across 4 processing phases:

**Pipeline:** [preprocessing/build_herdata_new.py](../preprocessing/build_herdata_new.py)

**Status:** track_provenance=True by default

### Tracked Fields

| Field | Coverage | Source Files | Phase |
|-------|----------|--------------|-------|
| id | 100% (448) | ra_ndb_main.xml | 1 |
| name | 100% (448) | ra_ndb_main.xml | 1 |
| gnd | 60.3% (270) | ra_ndb_indiv.xml | 1 |
| dates.birth | 90.8% (407) | ra_ndb_datierungen.xml | 1 |
| dates.death | 90.6% (406) | ra_ndb_datierungen.xml | 1 |
| letter_count | 42.6% (191) | ra-cmif.xml | 2 |
| mention_count | 43.5% (195) | ra-cmif.xml | 2 |
| role | 100% (448) | calculated from counts | 2 |
| places | 50.7% (227) | ra_ndb_orte.xml + geo_*.xml (HYBRID) | 3 |
| occupations | 46.2% (207) | ra_ndb_berufe.xml | 3 |
| biography | 100% (448) | projekt_regestausgabe.xml | 3 |

Total: 3,695 provenance entries for 448 women

### Output Files

The pipeline generates two JSON files:

#### 1. persons.json (Production)
- Size: 446 KB
- Purpose: Frontend application data
- Contents: Clean data without provenance metadata
- Performance: Optimized for fast loading

#### 2. persons_debug.json (Debug)
- Size: 1.8 MB
- Purpose: Data transparency and validation
- Contents: Full data + _provenance field for each person
- Increase: +1.3 MB (+293% larger)

### Provenance Data Structure

Each field in persons_debug.json includes provenance metadata:

```json
{
  "_provenance": {
    "name": {
      "source": "ra_ndb_main.xml",
      "xpath": "//ITEM[ID='1906' and LFDNR='0']/VORNAMEN, NACHNAME, TITEL",
      "raw_value": {
        "vornamen": "Angelica Bellonata",
        "nachname": "Facius",
        "titel": ""
      },
      "transformation": "concatenation with space: 'Angelica Bellonata Facius'",
      "extracted_at": "2025-11-04T15:33:03.359075"
    },
    "gnd": {
      "source": "ra_ndb_indiv.xml",
      "xpath": "//ITEM[ID='1906']/GND",
      "raw_value": "1055367276",
      "transformation": "direct extraction",
      "extracted_at": "2025-11-04T15:33:03.359075"
    }
  }
}
```

### Performance Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Pipeline execution | 1.11s | 0.67s | -40% (faster) |
| Production JSON | 0.44 MB | 0.44 MB | 0% (unchanged) |
| Debug JSON | n/a | 1.71 MB | +1.71 MB (new) |
| Provenance entries | 0 | 3,695 | +3,695 |

Note: Pipeline is faster due to code optimization during refactoring.

## Usage

### Running the Pipeline

```bash
cd preprocessing
python build_herdata_new.py
```

Output:
- docs/data/persons.json (production)
- docs/data/persons_debug.json (debug)

### Disabling Provenance Tracking

To disable provenance tracking (faster, no debug file):

```python
pipeline = HerDataPipelineNew(
    herdata_dir='data/herdata',
    sndb_dir='data/sndb',
    cmif_file='data/ra-cmif.xml',
    output_file='docs/data/persons.json',
    track_provenance=False  # Disable
)
```

### Inspecting Provenance Data

Python example:

```python
import json

with open('docs/data/persons_debug.json') as f:
    data = json.load(f)

# Find a person
person = next(p for p in data['persons'] if p['id'] == '1906')

# Access provenance
print(person['_provenance']['name'])
```

## Frontend Integration (Phase 2 - Planned)

Status: Not yet implemented

Planned features:
- Debug panel on person.html
- Hover tooltips showing data sources
- Raw data viewer
- One-click access to provenance

See [IMPLEMENTATION_PLAN_DEBUG.md](IMPLEMENTATION_PLAN_DEBUG.md) for Phase 2 details.

## Validation

All pipeline tests pass with provenance enabled:

```bash
pytest preprocessing/build_herdata_test.py -v
```

Coverage:
- 48 tests
- All phases validated
- Provenance data structure verified

## Scientific Value

This provenance system enables:

1. Transparency: Every data point traceable to source
2. Reproducibility: Exact transformation documented
3. Data quality assessment: Missing data clearly identified
4. Scholarly citation: Precise source attribution
5. Debugging: Pipeline issues quickly diagnosed

## Known Limitations

1. Provenance tracked only for first occurrence of multi-value fields (places, occupations)
   - Reason: Avoid excessive provenance bloat
   - Impact: First place/occupation fully documented, subsequent entries inherit documentation

2. Relationships not yet tracked
   - Reason: Complex bidirectional structure
   - Planned: Phase 2 enhancement

3. Letter_years array not individually tracked
   - Reason: Derived from letter_count matches
   - Documented via letter_count provenance

## Future Enhancements (Phase 2+)

See [HYBRID_APPROACH_PLAN.md](../HYBRID_APPROACH_PLAN.md) for:
- Frontend debug panel integration
- Universal debug module for all pages
- Hover tooltips on data fields
- Raw XML snippet display

## References

- Pipeline: [preprocessing/build_herdata_new.py](../preprocessing/build_herdata_new.py)
- Provenance Mapping: [docs/data/data_provenance_map.json](data/data_provenance_map.json)
- Data Model: [docs/knowledge/data.md](knowledge/data.md)

Last updated: 2025-11-04
