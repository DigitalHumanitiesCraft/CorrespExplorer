# CorrespExplorer

Generisches Tool zur Visualisierung von CMIF-Korrespondenzdaten (Correspondence Metadata Interchange Format).

## Vision

CorrespExplorer ermoeglicht es Nutzern, beliebige CMIF-XML-Dateien hochzuladen und interaktiv zu explorieren. Das Tool parst die standardisierten Korrespondenz-Metadaten und bietet Visualisierungen fuer:

- Geographische Verteilung (Karte)
- Zeitliche Entwicklung (Timeline)
- Netzwerke (Korrespondenten)
- Themen und Sprachen

## CMIF-Standard

Das Correspondence Metadata Interchange Format ist ein TEI-basierter Standard der TEI Correspondence SIG:

- Kernelement: `<correspDesc>` fuer jeden Brief
- Absender/Empfaenger: `<persName>` mit Authority-ID (@ref)
- Orte: `<placeName>` mit GeoNames-ID (@ref)
- Datum: `<date>` mit @when/@from/@to/@notBefore/@notAfter
- Erweiterte Metadaten im `<note>`-Element

Unterstuetzte Authority-Systeme:
- VIAF (Virtual International Authority File)
- GND (Gemeinsame Normdatei)
- GeoNames (Orte)
- Lexvo (Sprachen, ISO 639-3)

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [CMIF-Data.md](CMIF-Data.md) | CMIF-Standard und Datenmodell |
| [architecture.md](architecture.md) | Frontend-Architektur und Module |
| [JOURNAL.md](JOURNAL.md) | Entwicklungsprotokoll |

## Beispieldaten

Das Hugo Schuchardt Archiv (HSA) dient als Referenz-Datensatz:

| Metrik | Wert |
|--------|------|
| Briefe | 11.576 |
| Korrespondenten | 846 |
| Orte | 774 |
| Zeitraum | 1859-1927 |

HSA-Quelldatei: `data/hsa/CMIF.xml`
Generierte JSON: `docs/data/hsa-letters.json`

## Features

### Implementiert

- Kartenansicht mit Clustering (MapLibre GL JS)
- Zeitraum-Filter (noUiSlider)
- Sprach-Filter
- Responsive Navigation

### Geplant

- CMIF-Upload (Datei oder URL)
- Korrespondenten-Liste mit Suche
- Themen-Explorer
- Brief-Detail-Ansicht
- Export-Funktionen

## Technologie

- Frontend: Vanilla JS (ES6 Modules)
- Karten: MapLibre GL JS
- Build: Python-Pipeline fuer CMIF-zu-JSON

## Pipeline

```
CMIF.xml (Upload/URL)
      |
      v
cmif-parser.js (Browser)
      |
      v
Visualisierung
```

Fuer vorprozessierte Daten:
```
data/hsa/CMIF.xml
      |
      v
preprocessing/build_hsa_data.py
      |
      +-- resolve_geonames_wikidata.py (Koordinaten)
      |
      v
docs/data/hsa-letters.json
```

## Lizenz

Die Software steht unter MIT-Lizenz.
CMIF-Daten stehen typischerweise unter CC-BY 4.0.
