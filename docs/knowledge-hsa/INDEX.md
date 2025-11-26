# Knowledge Base: Hugo Schuchardt Archiv

Dokumentation der HSA-Datenquelle für den CorrespExplorer.

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [project.md](project.md) | Projektkontext und Forschungshintergrund |
| [data.md](data.md) | Datenmodell, Struktur, Qualität |
| [subjects.md](subjects.md) | Subject-Taxonomie und Kategorien |

## Externe Ressourcen

- Hugo Schuchardt Archiv: https://schuchardt.uni-graz.at
- CMIF-Datei: https://gams.uni-graz.at/context:hsa/CMIF
- GAMS Repository: https://gams.uni-graz.at/context:hsa

## Daten im CorrespExplorer

- Quelldatei: `data/hsa/CMIF.xml`
- Generierte JSON: `docs/data/hsa-letters.json`
- Koordinaten-Cache: `data/geonames_coordinates.json`

## Pipeline

```
data/hsa/CMIF.xml
       |
       v
preprocessing/build_hsa_data.py
       |
       +-- data/geonames_coordinates.json (via resolve_geonames_wikidata.py)
       |
       v
docs/data/hsa-letters.json
```
