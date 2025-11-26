# Journal: CorrespExplorer

Entwicklungsprotokoll fuer den generischen CMIF-Visualisierer.

---

## 2025-11-26 (Phase 8: Integration und Netzwerk)

### Repository-Bereinigung

Entfernung aller HerData-bezogenen Dateien:
- 100+ Dateien geloescht (HTML, JS, CSS, Daten)
- Fokus nun ausschliesslich auf CorrespExplorer
- README.md und CLAUDE.md aktualisiert

### Implementiert: correspSearch API Integration (Direkt-Suche)

Vollstaendige Integration der correspSearch API v2.0 als Datenquelle:

1. Neues Modul correspsearch-api.js
   - searchCorrespSearch(params) fuer Suche mit Parametern
   - fetchFromCorrespSearchUrl() fuer direkte URL-Eingabe
   - getResultCount() fuer Ergebnis-Vorschau
   - Automatische Paginierung (10 Briefe pro Seite)
   - TEI-JSON zu internem Format Transformation

2. Suchformular auf Landing-Page (index.html)
   - Person-Feld (GND-URI Eingabe)
   - Absende-Ort-Feld (GeoNames-URI Eingabe)
   - Zeitraum-Filter (Start- und Enddatum)
   - Ergebnis-Vorschau mit Gesamtanzahl
   - Limit bei 5000 Briefen (sessionStorage-Schutz)

3. Integration in cmif-parser.js
   - Erkennung von correspSearch API URLs
   - Automatische Delegation an API-Modul
   - Progress-Callback fuer Lade-Anzeige

4. CSS-Styling (upload.css)
   - Responsives Suchformular
   - Hover-Effekte und Focus-States
   - Mobile-optimierte Darstellung

### Implementiert: correspSearch Integration (US-24)

1. Helper-Funktion buildCorrespSearchUrl()
   - Unterstuetzt GND und VIAF Authority-IDs
   - Generiert korrekte correspSearch-Such-URLs

2. UI-Integration
   - Lupe-Button in Personen-Karten
   - correspSearch-Links im Brief-Detail-Modal
   - Oeffnet externe Suche in neuem Tab

### Implementiert: Orte ohne Koordinaten (US-08)

1. Klickbarer Link in Geodaten-Info
2. Modal mit sortierter Liste
   - Orte nach Briefanzahl sortiert
   - GeoNames-Links fuer manuelle Recherche

### Implementiert: Netzwerk-Visualisierung (US-11)

1. D3.js Force-Directed Graph
   - Knoten = Personen (Groesse nach Briefanzahl)
   - Kanten = Korrespondenzbeziehungen
   - Farbcodierung: Absender (blau), Empfaenger (gruen), beides (lila)

2. Ego-Netzwerk-Erkennung
   - Automatische Erkennung bei >80% Verbindungen zu einem Knoten
   - Radiales Layout fuer bessere Darstellung
   - "Ego-Netzwerk" Badge in Stats

3. Controls
   - Min. Briefe Schwellenwert
   - Max. Personen (Performance-Limit)
   - Layout-Auswahl (Force/Radial)
   - Zoom zuruecksetzen

4. Interaktion
   - Drag-and-Drop fuer Knoten
   - Zoom und Pan
   - Klick auf Knoten filtert Briefe
   - Tooltips mit Details

5. Bug-Fix
   - Feldname recipient statt receiver
   - Beide Varianten werden unterstuetzt

### Tests erweitert

Neue Tests in explore-tests.js:
- buildNetworkData: Netzwerk-Daten aufbauen
- buildNetworkData: MinLetters Filter anwenden

---

## 2025-11-26 (Phase 7: Themen-Explorer Implementation)

### Implementiert: Topics View (US-25, US-26, US-27)

Vollstaendige Implementierung des Themen-Explorers:

1. HTML-Struktur (explore.html)
   - Neuer View-Button in Navigation (topics-view-btn)
   - Two-Pane Layout: Topics-Liste links, Detail-Panel rechts
   - Suchfeld und Sortierung fuer Themen

2. CSS-Styles (explore.css)
   - Topic-Cards mit visuellen Frequenz-Balken
   - Detail-Panel mit Korrespondenten, Mini-Timeline, verwandten Themen
   - Subject-Filter-Badge (gruen, distinct von Person-Filter)

3. JavaScript-Logik (explore.js)
   - Inverted Index (subjectIndex) mit Vorab-Berechnung
   - Tracking von: count, letterIds, persons, years, cooccurrence
   - renderTopicsList() mit Suche/Sortierung
   - selectTopic() fuer Detail-Panel
   - applySubjectFilter() integriert in globales Filter-System
   - URL-State Support (subject Parameter)

Technische Entscheidungen:
- Frequenz-Liste statt Tag-Cloud (bessere Vergleichbarkeit)
- Expliziter Filter-Button (Explore vs. Filter Trennung)
- Co-Occurrence basiert auf gleichen Briefen
- Top 10 Korrespondenten und verwandte Themen im Detail-Panel
- Mini-Timeline mit automatischer Gruppierung bei langen Zeitraeumen

---

## 2025-11-26 (Phase 7: Netzwerk-View Konzeption)

### Analyse: Ungenutzte Daten

Ueberpruefung der CMIF-Datennutzung ergab:

| Datenfeld | Status |
|-----------|--------|
| letters (Briefe) | Vollstaendig genutzt |
| id, url, date, year | Genutzt |
| sender, recipient | Genutzt |
| place_sent | Genutzt (Karte) |
| language | Genutzt (Filter) |
| mentions.subjects | Nur im Brief-Detail |
| mentions.persons | Nur im Brief-Detail |
| mentions.places | Nur im Brief-Detail |
| indices.subjects | Komplett ungenutzt |
| indices.persons.letters_sent/received | Wird neu berechnet |

### Forschungsfragen fuer Romanistik

Diskussion der Kernfrage: "Was macht ein Briefnetzwerk aus?"

Identifizierte Forschungsfragen:
1. Ueber was haben Romanisten geschrieben? (Themen-Analyse)
2. Welche Themen verbinden verschiedene Korrespondenten?
3. Wie verbreiten sich Themen ueber Zeit und Raum?
4. Wer sind die zentralen Vermittler im Netzwerk?
5. In welchen Sprachen werden welche Themen diskutiert?

### Visualisierungs-Optionen evaluiert

1. Force-Directed Graph: Klassisches Netzwerk, aber unuebersichtlich bei 846 Personen
2. Sankey-Diagramm: Gut fuer Aggregationen, verliert Details
3. Matrix-Heatmap: Kompakt, aber abstrakt
4. Chord-Diagramm: Aesthetisch, begrenzt auf ca. 50 Elemente
5. Dashboard: Kombiniert mehrere Visualisierungen

### Entscheidung E12: Themen-Explorer

Empfehlung: Dashboard-Ansatz mit Themen-Fokus

Begruendung:
- Nutzt den ungenutzten subjects-Index (1.622 Themen)
- Beantwortet die Kernfrage "Worüber wurde geschrieben"
- Integrierbar in bestehendes Filter-System
- Keine Performance-Probleme wie bei grossen Graphen

Aufbau:
- Top-Themen als klickbare Tags/Wolke
- Detail-Panel: Korrespondenten, Zeitverlauf, verwandte Themen
- Integration mit bestehenden Filtern

### Neue User Stories

- US-25: Themen durchsuchen
- US-26: Thema-Detail ansehen
- US-27: Nach Thema filtern

### Dokumentation

Neues Konzeptdokument erstellt:
- `knowledge-correspexplorer/network-view-concept.md`
- Detaillierte Analyse aller Visualisierungs-Optionen
- Technische Umsetzungsplanung

---

## 2025-11-26 (Phase 6: Brief-Details und Timeline-Verbesserung)

### Neu implementierte Features

1. Brief-Detail-Modal (US-13)
   - Klick auf Brief-Karte oeffnet Modal mit allen Metadaten
   - Zeigt Grunddaten: Datum, Absender, Empfaenger, Ort, Sprache
   - Zeigt erwaehnte Entitaeten: Themen, Personen, Orte (mentions)
   - Links zu Authority-Dateien (VIAF, GND, GeoNames)
   - Button zum Filtern nach Absender
   - Link zur Original-Quelle

2. Verbesserte Timeline
   - Zeigt gefilterte vs. ungefilterte Briefe (Hintergrund-Balken)
   - Dynamische Label-Intervalle (ca. 15 Labels)
   - Tooltips zeigen "X von Y Briefen" bei aktivem Filter
   - Re-Rendering bei Filterwechsel

3. User Stories Dokument
   - 25 User Stories dokumentiert
   - 19 implementiert, 2 teilweise, 4 offen
   - Priorisierung der offenen Features

### Technische Verbesserungen

- Timeline HTML-Struktur: Wrapper-Element fuer Hintergrund-Balken
- CSS: Neue Styles fuer Letter-Detail-Modal
- Helper-Funktionen: buildPersonLink(), buildPlaceLink()
- Global: filterByPerson() fuer onclick-Handler

---

## 2025-11-26 (Phase 5: Erweiterte Features)

### Neu implementierte Features

1. URL-Sharing (Entscheidung E11)
   - Filter-Zustand wird in URL gespeichert
   - Parameter: view, yearMin, yearMax, person, langs
   - Direktlinks zu gefilterten Ansichten moeglich
   - Browser-History wird nicht ueberladen (replaceState)

2. Person-Detail-Ansicht
   - Klick auf Korrespondent filtert alle Briefe
   - Filter-Badge in Sidebar zeigt aktiven Person-Filter
   - Automatischer Wechsel zur Brief-Liste
   - Filter kann ueber X-Button entfernt werden

3. Timeline-Visualisierung
   - Balkendiagramm der Briefe pro Jahr/Dekade
   - Automatische Gruppierung bei Zeitspannen > 50 Jahre
   - Klick auf Balken setzt Zeitraum-Filter
   - Tooltips mit Briefanzahl

### Entscheidung E11: URL-State-Management

Filter-Zustand in URL speichern fuer:
- Bookmarking von gefilterten Ansichten
- Teilen von Links mit Kollegen
- Browser-Zurueck-Funktion

Technische Umsetzung:
- URLSearchParams API
- history.replaceState (kein pushState um History nicht zu ueberladen)
- Initialisierung liest URL-Parameter beim Laden

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
   - Timeline-Ansicht mit Balkendiagramm
   - Dynamische Filter (Zeitraum, Sprache, Person)
   - View-Switching zwischen Karte/Personen/Briefe/Timeline

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

### Netzwerk-Visualisierung
- Wer schreibt wem (Force-Directed Graph)
- Clustern nach Korrespondenten-Gruppen

### Koordinaten-Aufloesung fuer Uploads
- Wikidata SPARQL-Abfrage im Browser
- Progressives Enrichment

### Themen-Filter (HSA-spezifisch)
- Subjects als zusaetzliche Filteroption
- Top-Themen in Sidebar

### Brief-Detail-Modal
- Vollstaendige Metadaten anzeigen
- Erwahnte Personen, Orte, Themen
