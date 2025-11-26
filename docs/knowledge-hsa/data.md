# HSA Datenmodell

## Übersicht

| Metrik | Wert |
|--------|------|
| Briefe | 11.576 |
| Sender | 846 |
| Empfänger | 112 |
| Absende-Orte | 774 |
| Erwähnte Orte | 336 |
| Subjects | 1.622 |
| Erwähnte Personen | 2.081 |
| Briefsprachen | 18 |
| Zeitraum | 1859-1927 |

## CMIF-Schema

Das HSA verwendet das TEI-basierte CMIF-Format mit LOD Academy Vocabulary-Erweiterungen.

### Kernstruktur

```xml
<correspDesc ref="brief-url">
  <correspAction type="sent">
    <persName ref="viaf-url">Sender</persName>
    <placeName ref="geonames-url">Ort</placeName>
    <date when="YYYY-MM-DD"/>
  </correspAction>
  <correspAction type="received">
    <persName ref="viaf-url">Empfänger</persName>
  </correspAction>
  <note>
    <!-- Metadaten -->
  </note>
</correspDesc>
```

### Metadaten im note-Element

| Typ | URI-Muster | Beschreibung |
|-----|------------|--------------|
| hasLanguage | `de`, `fr`, etc. | Briefsprache |
| mentionsSubject | HSA/Lexvo-URI | Thema des Briefs |
| mentionsPerson | VIAF-URI | Im Brief erwähnte Person |
| mentionsPlace | GeoNames-URI | Im Brief erwähnter Ort |

## Authority-Systeme

### Personen

Primär: VIAF (Virtual International Authority File)
- URL-Muster: `https://viaf.org/viaf/{id}`
- Coverage: 96%

Sekundär: HSA-intern
- URL-Muster: `http://schuchardt.uni-graz.at/id/person/{id}`
- Coverage: 4%

### Orte

GeoNames
- URL-Muster: `http://sws.geonames.org/{id}` oder `https://sws.geonames.org/{id}`
- Koordinaten via Wikidata aufgelöst
- Coverage: 82% mit Koordinaten

### Subjects

HSA-Subjects
- URL-Muster: `https://gams.uni-graz.at/o:hsa.subjects#S.{id}`
- 1.272 eindeutige Einträge

HSA-Languages
- URL-Muster: `https://gams.uni-graz.at/o:hsa.languages#L.{id}`
- 200 eindeutige Einträge

Lexvo (ISO 639-3)
- URL-Muster: `http://lexvo.org/id/iso639-3/{code}`
- 148 eindeutige Einträge

## JSON-Ausgabeformat

### Briefstruktur

```json
{
  "id": "o:hsa.letter.654",
  "url": "https://gams.uni-graz.at/o:hsa.letter.654",
  "date": "1913-06-13",
  "year": 1913,
  "sender": {
    "name": "Urquijo Ybarra, Julio de",
    "id": "18030027",
    "authority": "viaf"
  },
  "recipient": {
    "name": "Schuchardt, Hugo",
    "id": "261931943",
    "authority": "viaf"
  },
  "place_sent": {
    "name": "Saint-Jean-de-Luz",
    "geonames_id": "6440594",
    "lat": 43.3882,
    "lon": -1.6603
  },
  "language": {
    "code": "es",
    "label": "Spanisch"
  },
  "mentions": {
    "subjects": [...],
    "persons": [...],
    "places": [...]
  }
}
```

### Indizes

Die JSON enthält aggregierte Indizes für schnellen Zugriff:

- `indices.persons` - Personen mit Briefzählungen
- `indices.places` - Orte mit Koordinaten
- `indices.subjects` - Subjects mit Kategorien
- `indices.languages` - Sprachcodes und Labels

## Datenqualität

### Vollständigkeit

| Feld | Coverage |
|------|----------|
| Sender | 100% |
| Empfänger | 100% |
| Datum | 97% |
| Absende-Ort | 100% |
| Briefsprache | 100% |
| Koordinaten | 82% |

### Bekannte Lücken

1. **Fehlende Koordinaten** (158 Orte)
   - Meist historische Ortsnamen
   - Kleine Gemeinden ohne Wikidata-GeoNames-Verknüpfung

2. **VIAF-IDs bei mentionsPerson**
   - Manche erwähnte Personen haben nur Namen, keine ID
   - URI-Format variiert

3. **Ort "Unbekannt"**
   - 576 Briefe ohne bekannten Absende-Ort
   - Als "Unbekannt" markiert, keine GeoNames-ID

## Pipeline-Abhängigkeiten

1. `resolve_geonames_wikidata.py` muss vor `build_hsa_data.py` laufen
2. Koordinaten-Cache wird in `data/geonames_coordinates.json` gespeichert
3. Fehlende IDs werden in `data/geonames_missing.json` protokolliert
