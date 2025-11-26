# CorrespExplorer Generalisierungsplan

## Ausgangssituation

### HerData (bestehendes System)
- 448 kuratierte Frauen aus Goethes Korrespondenznetzwerk
- 4-Phasen-Pipeline in Python (build_herdata.py)
- CMIF-Datei: ra-cmif.xml (PROPYLÄEN-Projekt, 15.312 Briefe)
- Frontend: Vanilla JS, MapLibre, ECharts
- Metadaten: Sender, Empfänger, Datum, Ort, mentionsPerson

### HSA-CMIF (neues Ziel)
- Hugo Schuchardt Archiv (Universität Graz)
- CMIF-Datei: data/hsa/CMIF.xml
- Erweiterte Metadaten im note-Tag:
  - mentionsSubject (Themen, Sprachen, Institutionen)
  - mentionsPlace (geographische Erwähnungen im Brieftext)
  - mentionsPerson (erwähnte Personen)
  - hasLanguage (Briefsprache)
- ~40.551 Metadaten-Einträge
- Verwendet VIAF statt GND als Personen-Authority
- Verwendet LOD Academy CMIF Vocabulary

## Schema-Vergleich

### PROPYLÄEN-CMIF (ra-cmif.xml)
```xml
<correspDesc ref="letter-url">
  <correspAction type="sent">
    <persName ref="https://d-nb.info/gnd/...">Name</persName>
    <placeName ref="https://www.geonames.org/...">Ort</placeName>
    <date when="1794-06-13"/>
  </correspAction>
  <correspAction type="received">
    <persName ref="gnd-url">Empfänger</persName>
  </correspAction>
  <note>
    <ref type="cmif:mentionsPerson" target="gnd-url">Name</ref>
    <ref type="cmif:hasLanguage" target="de"/>
  </note>
</correspDesc>
```

### HSA-CMIF (CMIF.xml)
```xml
<correspDesc ref="letter-url">
  <correspAction type="sent">
    <persName ref="https://viaf.org/viaf/...">Name</persName>
    <placeName ref="http://sws.geonames.org/...">Ort</placeName>
    <date when="1913-06-13"/>
  </correspAction>
  <correspAction type="received">
    <persName ref="viaf-url">Empfänger</persName>
  </correspAction>
  <note>
    <ref target="subject-uri" type="...#mentionsSubject">Thema</ref>
    <ref target="viaf-uri" type="...#mentionsPerson">Person</ref>
    <ref target="geonames-uri" type="...#mentionsPlace">Ort</ref>
    <ref target="lang-code" type="...#hasLanguage">Sprache</ref>
  </note>
</correspDesc>
```

### Zentrale Unterschiede
1. Authority-System: GND (PROPYLÄEN) vs. VIAF (HSA)
2. Namespace für Metadaten-Typen: cmif: prefix vs. LOD Academy URIs
3. HSA hat zusätzlich mentionsSubject und mentionsPlace
4. Datumsformate identisch (TEI-Standard)

## Phase 1: Python-Analyseskript

### Ziel
Performantes Skript zur Extraktion und statistischen Auswertung der HSA-CMIF-Daten.

### Implementierung: preprocessing/analyze_cmif.py

```python
# Kernfunktionen:
1. parse_cmif(file_path) -> List[Letter]
   - lxml für Performance (23 MB Datei)
   - Namespace-agnostisches Parsing
   - Extraktion aller correspDesc-Elemente

2. extract_metadata(note_element) -> Dict
   - mentionsSubject: [{uri, label}]
   - mentionsPlace: [{uri, label, geonames_id}]
   - mentionsPerson: [{uri, label, viaf_id}]
   - hasLanguage: [{code, label}]

3. generate_statistics() -> Dict
   - Briefanzahl gesamt
   - Zeitliche Verteilung (Jahre)
   - Top-Korrespondenten
   - Sprachverteilung
   - Themen-Häufigkeiten
   - Geographische Erwähnungen
   - Personen-Netzwerk

4. export_json(data, output_path)
   - Strukturierte JSON-Ausgabe
   - Separate Indizes für schnellen Frontend-Zugriff
```

### Output-Dateien
- letters.json: Alle Briefe mit Metadaten
- statistics.json: Aggregierte Statistiken
- indices/:
  - subjects.json: Themen-Index
  - places.json: Orte-Index
  - persons.json: Personen-Index
  - languages.json: Sprachen-Index

## Phase 2: Generalisierte Datenarchitektur

### JSON-Schema für letters.json

```json
{
  "meta": {
    "generated": "ISO-timestamp",
    "source": "HSA-CMIF",
    "total_letters": 13500,
    "date_range": {"min": "1866-11-15", "max": "1925-04-21"},
    "coverage": {
      "with_date": 13200,
      "with_place": 12800,
      "with_language": 13500,
      "with_subjects": 8500,
      "with_mentioned_places": 4200
    }
  },
  "letters": [
    {
      "id": "hsa.letter.654",
      "url": "https://gams.uni-graz.at/o:hsa.letter.654",
      "date": "1913-06-13",
      "year": 1913,
      "sender": {
        "name": "Urquijo Ybarra, Julio de",
        "authority_id": "18030027",
        "authority_type": "viaf"
      },
      "recipient": {
        "name": "Schuchardt, Hugo",
        "authority_id": "261931943",
        "authority_type": "viaf"
      },
      "place_sent": {
        "name": "Saint-Jean-de-Luz",
        "geonames_id": "6440594",
        "coordinates": null
      },
      "language": {
        "code": "es",
        "label": "Spanisch"
      },
      "mentions": {
        "subjects": [
          {"uri": "...", "label": "Cercle d'Études Euskariennes"}
        ],
        "persons": [
          {"name": "Lacombe, Georges", "viaf_id": "34446283"}
        ],
        "places": [
          {"name": "Paris", "geonames_id": "2988507"}
        ]
      }
    }
  ]
}
```

### Indizes für Frontend-Performance

```json
// subjects.json
{
  "subjects": {
    "S.4567": {
      "label": "Cercle d'Études Euskariennes",
      "uri": "https://gams.uni-graz.at/o:hsa.subjects#S.4567",
      "letter_count": 45,
      "letter_ids": ["hsa.letter.654", ...]
    }
  },
  "by_frequency": ["S.4567", "S.3085", ...]
}

// places_mentioned.json
{
  "places": {
    "2988507": {
      "name": "Paris",
      "geonames_id": "2988507",
      "coordinates": [48.8566, 2.3522],
      "mention_count": 234,
      "letter_ids": [...]
    }
  }
}
```

## Phase 3: Frontend-Visualisierungskonzept

### Architektur-Prinzip
Shneiderman's Mantra: Overview first, zoom and filter, details on demand

### Hauptansichten

#### 1. Netzwerkansicht (bestehend, erweitert)
- Korrespondenz-Netzwerk (Sender/Empfänger)
- NEU: Erwähnungsnetzwerk (mentionsPerson)
- Toggle zwischen beiden Modi
- Filterung nach Zeitraum, Sprache, Thema

#### 2. Kartenansicht (bestehend, erweitert)
- Absende-Orte (place_sent) - wie bisher
- NEU: Layer für mentionsPlace (inhaltliche Erwähnungen)
- Unterschiedliche Marker-Styles:
  - Blau: Absende-Orte
  - Orange: Im Brief erwähnte Orte
- Heatmap-Option für Erwähnungsdichte

#### 3. Themen-Explorer (NEU)
- Treemap der Subjects nach Häufigkeit
- Zeitlicher Verlauf pro Thema (Line Chart)
- Klick auf Thema filtert alle anderen Ansichten
- Kategorisierung: Sprachen, Institutionen, Konzepte

#### 4. Sprach-Dashboard (NEU)
- Tortendiagramm: Sprachverteilung
- Timeline: Sprachwechsel über Zeit
- Matrix: Sender-Sprache-Korrelation

### Filter-System (generalisiert)

```javascript
// FilterState erweitern
const filterDimensions = {
  // Bestehend
  timeRange: {min: 1866, max: 1925},
  persons: [],
  places: [],

  // Neu für CMIF-Metadaten
  languages: [],
  subjects: [],
  mentionedPlaces: [],
  mentionedPersons: []
};
```

### Datenfluss

```
CMIF.xml
    |
    v
analyze_cmif.py (lxml)
    |
    +-> letters.json
    +-> statistics.json
    +-> indices/*.json
    |
    v
Frontend (docs/)
    |
    +-> data.js (Lazy Loading)
    +-> Filter-Module
    +-> Visualisierungs-Komponenten
```

## Phase 4: Implementierungsschritte

### Schritt 1: Analyse-Skript
- analyze_cmif.py mit lxml
- Statistik-Output auf Konsole
- JSON-Export

### Schritt 2: Datenintegration
- JSON-Dateien in docs/data/
- data.js erweitern für neue Datenstruktur
- Lazy Loading für große Datensätze

### Schritt 3: Frontend-Erweiterung
- Bestehende Ansichten um neue Metadaten erweitern
- Neue Filter-Dimensionen
- Themen-Explorer als neue View

### Schritt 4: Generalisierung
- Konfigurationsdatei für CMIF-Quellen
- Mapping-Funktionen für verschiedene Authority-Systeme
- Modulare Pipeline-Architektur

## Konfigurationskonzept

```json
// config/cmif-sources.json
{
  "herdata": {
    "cmif_file": "data/ra-cmif.xml",
    "authority_type": "gnd",
    "authority_base_url": "https://d-nb.info/gnd/",
    "features": ["mentionsPerson", "hasLanguage"]
  },
  "hsa": {
    "cmif_file": "data/hsa/CMIF.xml",
    "authority_type": "viaf",
    "authority_base_url": "https://viaf.org/viaf/",
    "features": ["mentionsPerson", "mentionsPlace", "mentionsSubject", "hasLanguage"]
  }
}
```

## Nächste Schritte

1. Python-Skript analyze_cmif.py implementieren
2. HSA-Daten statistisch auswerten
3. JSON-Schema finalisieren
4. Frontend-Prototyp für Themen-Explorer
5. Generalisierte Konfiguration

## Offene Fragen

1. Sollen GeoNames-Koordinaten für mentionsPlace aufgelöst werden?
2. Welche Subjects sollen kategorisiert werden (Sprachen vs. Institutionen)?
3. Priorität: Vollständige HSA-Integration oder generisches Framework zuerst?
