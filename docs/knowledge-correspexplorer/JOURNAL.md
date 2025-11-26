# Journal: CorrespExplorer

Entwicklungsprotokoll fuer den generischen CMIF-Visualisierer.

---

## 2025-11-26 (Feature-Komplett)

### Implementierte Features

Phase 1-4 vollstaendig umgesetzt:

1. CMIF-Parser (js/cmif-parser.js)
   - Browser-basiertes XML-Parsing mit DOMParser
   - Unterstuetzung fuer Datei-Upload, URL-Fetch, String-Input
   - Authority-Erkennung (VIAF, GND, GeoNames, Lexvo)
   - Index-Generierung fuer Personen, Orte, Sprachen, Themen

2. Upload-Interface (index.html, js/upload.js)
   - Drag-and-Drop fuer CMIF-Dateien
   - URL-Input mit CORS-Fehlerbehandlung
   - Beispiel-Datensaetze (HSA als Default)
   - Weiterleitung zu explore.html

3. Visualisierung (explore.html, js/explore.js)
   - Kartenansicht mit MapLibre GL JS Clustering
   - Korrespondenten-Liste mit Suche und Sortierung
   - Brief-Liste mit Suche und Sortierung
   - Dynamische Filter (Zeitraum, Sprache)
   - View-Switching zwischen Karte/Personen/Briefe

4. Export
   - CSV-Export der gefilterten Briefe
   - JSON-Export der gefilterten Briefe
   - Modal-Dialog mit Format-Auswahl

### Entscheidung E10: Hybrides Speichermodell

Grosse Datensaetze (HSA) werden via URL-Parameter geladen:
- `explore.html?dataset=hsa` laedt vorprozessierte JSON direkt
- Umgeht sessionStorage-Limit von ca. 5MB

Kleinere Datensaetze (Upload) nutzen sessionStorage:
- Funktioniert fuer Datensaetze bis ca. 3000 Briefe
- Bei Quota-Ueberschreitung: Fehlermeldung mit Hinweis

### Dateistruktur

```
docs/
  index.html          - Landing-Page mit Upload
  explore.html        - Visualisierung (Karte, Listen, Export)
  css/
    upload.css        - Upload-Komponenten-Styles
    explore.css       - Listen- und Modal-Styles
  js/
    cmif-parser.js    - Browser-CMIF-Parser
    upload.js         - Upload-Handler
    explore.js        - Visualisierungs-Logik
  data/
    hsa-letters.json  - Vorprozessierte HSA-Daten
```

---

## 2025-11-26 (Projektvision)

### Ziel: Generischer CMIF-Explorer

CorrespExplorer soll ein Tool werden, in das Nutzer beliebige CMIF-XML-Dateien hochladen koennen. Das Tool parst die XML im Browser und visualisiert die Korrespondenz-Metadaten.

Kernfunktionen:
- CMIF-Upload (Datei oder URL)
- Automatische Erkennung der Datenstruktur
- Karten-, Timeline- und Netzwerk-Visualisierung
- Filter nach Zeit, Ort, Person, Sprache

### Entscheidung E9: Browser-basiertes XML-Parsing

CMIF-Dateien sollen direkt im Browser geparst werden statt serverseitiger Vorverarbeitung.

Begruendung:
- Keine Backend-Infrastruktur erforderlich
- Nutzer behaelt Kontrolle ueber seine Daten
- Sofortige Visualisierung nach Upload
- DOMParser API ist performant genug fuer typische CMIF-Groessen

Einschraenkung: Sehr grosse Dateien (100MB+) koennten Probleme bereiten. Fuer solche Faelle bleibt die Python-Pipeline als Alternative.

### Aktueller Stand

Das HSA (Hugo Schuchardt Archiv) dient als Referenz-Implementation:
- 11.576 Briefe erfolgreich visualisiert
- Kartenansicht mit Orts-Clustering
- Filter fuer Zeitraum und Sprache

---

## 2025-11-26 (HSA-Implementation)

### Daten-Pipeline

Preprocessing-Skripte fuer HSA-Daten:

1. `preprocessing/build_hsa_data.py`
   - Parst data/hsa/CMIF.xml
   - Extrahiert Briefe, Personen, Orte, Subjects
   - Generiert docs/data/hsa-letters.json

2. `preprocessing/resolve_geonames_wikidata.py`
   - Loest GeoNames-IDs zu Koordinaten auf
   - Nutzt Wikidata SPARQL als Vermittler
   - Cache in data/geonames_coordinates.json

Ergebnis: 82% der Orte mit Koordinaten angereichert.

### Frontend-Architektur

Modulare JavaScript-Struktur:

- `js/cmif-parser.js` - Browser-basierter CMIF-XML-Parser
- `js/upload.js` - Upload-Handler (Datei, URL, Beispiele)
- `js/explore.js` - Visualisierung (Karte, Listen, Export)
- `js/config.js` - Konfiguration (Zeitraum, Features, UI)
- `js/utils.js` - Hilfsfunktionen (debounce, Toast, Download)

### Kartenvisualisierung

MapLibre GL JS mit:
- GeoJSON-Source fuer Orte
- Clustering mit Aggregation der Briefanzahl
- Kreisgroesse skaliert mit Briefmenge
- Popup mit Orts-Statistiken

---

## Architektur-Entscheidungen

### E1: CMIF als Austauschformat

CMIF (Correspondence Metadata Interchange Format) als Zielformat, weil:
- TEI-basierter Standard
- Verwendet von correspSearch.net
- Viele Editions-Projekte liefern CMIF
- Klare Struktur fuer Sender/Empfaenger/Datum/Ort

### E2: Authority-Agnostisch

Das Tool unterstuetzt verschiedene Authority-Systeme:
- VIAF (virtuaf.org/viaf/{id})
- GND (d-nb.info/gnd/{id})
- GeoNames (sws.geonames.org/{id})
- Lexvo (lexvo.org/id/iso639-3/{code})

Die Authority-URLs werden geparst und normalisiert.

### E3: Wikidata fuer Koordinaten

Koordinaten-Aufloesung via Wikidata SPARQL statt GeoNames-API:
- Keine API-Keys erforderlich
- Batch-Abfragen moeglich
- Funktioniert fuer GeoNames, GND und andere

### E4: Brief-zentrierte Primaerstruktur

Datenmodell ist brief-zentriert:
```json
{
  "letters": [...],
  "indices": {
    "persons": {...},
    "places": {...},
    "subjects": {...}
  }
}
```

Indizes ermoeglichen sekundaere Sichten (Personen, Orte).

---

## HSA-Datenstruktur

### Uebersicht

| Metrik | Wert |
|--------|------|
| Briefe | 11.576 |
| Sender | 846 |
| Empfaenger | 112 |
| Absende-Orte | 774 |
| Subjects | 1.622 |
| Zeitraum | 1859-1927 |

### Erweiterte Metadaten

HSA verwendet LOD Academy CMIF Vocabulary mit:
- `mentionsSubject`: Themen im Brief (23.020 Vorkommen)
- `mentionsPlace`: Erwahnte Orte (5.955 Vorkommen)
- `mentionsPerson`: Erwahnte Personen (17.413 Vorkommen)
- `hasLanguage`: Briefsprache (18 Sprachen)

### Subject-Kategorien

1.622 Subjects in drei Kategorien:
- HSA-Subjects (1.272): Themen, Institutionen
- HSA-Languages (200): Interne Sprachcodes
- Lexvo (148): ISO 639-3 Sprachen

Top-Themen: Baskisch (698), Publikationsversand (627), Dankschreiben (515)

---

## Moegliche Erweiterungen

### Timeline-Ansicht
- Zeitliche Verteilung der Korrespondenz
- Brush-Selection fuer Zeitraum-Filter

### Netzwerk-Visualisierung
- Wer schreibt wem (Force-Directed Graph)
- Clustern nach Korrespondenten-Gruppen

### Koordinaten-Aufloesung fuer Uploads
- Wikidata SPARQL-Abfrage im Browser
- Progressives Enrichment

### URL-Sharing
- Aktuelle Filter als URL-Parameter
- Direktlinks zu gefilterten Ansichten
