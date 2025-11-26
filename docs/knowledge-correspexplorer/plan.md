# CorrespExplorer - Entwicklungsplan

Stand: 2025-11-26

---

## Aktueller Implementierungsstand

### Vollstaendig implementiert (36 User Stories)

| US | Feature | Beschreibung |
|----|---------|--------------|
| US-01 | CMIF-Upload | Drag-and-Drop oder Datei-Dialog |
| US-02 | URL-Laden | CMIF von URL laden |
| US-03 | Beispiel-Datensatz | HSA-Daten ein-Klick laden |
| US-04 | Statistik-Cards | Briefe, Personen, Orte |
| US-05 | Timeline | Zeitliche Verteilung |
| US-06 | Kartenansicht | Clustering, Zoom, Pan |
| US-07 | Orts-Details | Top-5 Absender im Map-Popup mit Briefanzahl |
| US-08 | Fehlende Koordinaten | Modal mit Liste der Orte ohne Geodaten |
| US-09 | Korrespondenten-Liste | Suche, Sortierung |
| US-10 | Person-Filter | Klick filtert Briefe |
| US-12 | Brief-Liste | Suche, Sortierung |
| US-13 | Brief-Details | Inline-Expansion mit allen Metadaten |
| US-14 | Quell-Navigation | Link zur Original-Edition |
| US-15 | Zeitraum-Filter | Slider fuer Start/Ende |
| US-16 | Sprach-Filter | Checkboxen mit Anzahl |
| US-18 | Filter-Kombination | UND-Verknuepfung |
| US-19 | Filter-Reset | Alle Filter zuruecksetzen |
| US-20 | URL-Sharing | Filter in URL codiert |
| US-21 | CSV-Export | Gefilterte Briefe |
| US-22 | JSON-Export | Strukturierte Daten |
| US-11 | Netzwerk-Graph | D3.js Force-Directed Graph mit Zoom und Drag |
| US-24 | correspSearch-Integration | Button in Personen-Liste und Brief-Modal |
| US-28 | correspSearch Direkt-Suche | Suchformular auf Landing-Page |
| US-29 | Externe CMIF-URLs | Laden von GitHub und anderen Quellen |
| US-25 | Themen-Liste | Topics View mit Suche |
| US-26 | Themen-Details | Korrespondenten, Timeline, verwandte Themen |
| US-27 | Themen-Filter | Integration ins Filter-System |
| US-30 | Adaptive Views | Views basierend auf Datenverfuegbarkeit |
| US-31 | Wissenskorb | Dedizierte Seite mit Timeline, Netzwerk, Karte, Multi-Tab-Sync |
| US-32 | Wikidata-Enrichment | Biografische Daten via SPARQL (GND/VIAF) |
| US-33 | Konfigurations-Dialog | Enrichment-Optionen beim Datensatz-Laden |
| US-34 | Landing-Page Design | Logo, Cream-Hintergrund, Border-Design |
| US-35 | Explore-Page Design | Konsistente Farben, Map-Marker Rust-Red |
| US-36 | Typografie und UX | Tooltips, Link-Farben, Active-States |
| US-17 | Themen-Schnellfilter | Top-5 Themen in Sidebar |
| US-23 | Datensatz-Vergleich | Vergleichsseite compare.html |

### Offen (0 User Stories)

Alle User Stories sind implementiert.

---

## Neue Features

### 1. Orte-Index (Places View)

Analog zur Persons-View eine dedizierte Orte-Ansicht.

Funktionen:
- Alphabetische Liste aller Orte
- Suche und Sortierung (Name, Briefanzahl)
- Klick auf Ort filtert Briefe
- Anzeige: gesendete Briefe pro Ort
- Link zu GeoNames/Wikidata

Technische Umsetzung:
- Neuer View-Button in Navigation
- `renderPlacesList()` analog zu `renderPersonsList()`
- `applyPlaceFilter()` im Filter-System
- URL-Parameter `place`

### 2. Wissenskorb (Knowledge Basket) - Erweitert

Dedizierte Seite fuer die Analyse gesammelter Personen.

Funktionen:
- Stern-Button bei Personen zum Hinzufuegen
- Dedizierte Seite `wissenskorb.html` mit Visualisierungen
- Timeline: Aktivitaetszeitraum der gesammelten Personen (D3.js stacked bar chart)
- Netzwerk: Verbindungen zwischen gesammelten Personen (D3.js force-directed graph)
- Karte: Geografische Verteilung der Korrespondenz (MapLibre)
- Details: Alle Briefe der gesammelten Personen
- Export als CSV oder JSON
- Teilen via URL (IDs als Parameter)
- Multi-Tab Synchronisation via Storage Events
- Kapazitaetslimit: 50 Personen, 100 Briefe, 50 Orte

Technische Umsetzung:
- `basket.js`: localStorage-Persistenz mit Storage Events
- `basket-ui.js`: Toggle-Buttons und Badge-Updates
- `wissenskorb.html`: Dedizierte Analyse-Seite
- `wissenskorb.js`: Visualisierungslogik
- `wissenskorb.css`: Seiten-spezifische Styles

### 3. About-Seite

Informationsseite ueber das Projekt.

Inhalte:
- Projekthintergrund (DH-Kontext)
- CMIF-Format Erklaerung
- Datenquellen und Lizenzen
- Nutzungshinweise
- Technische Dokumentation (Link)
- Kontakt/Impressum

Technische Umsetzung:
- Neue HTML-Seite `about.html`
- Verlinkung in Navigation
- Wiederverwendung der CSS-Tokens

### 4. correspSearch API Integration (US-24)

Verknuepfung mit der correspSearch Plattform.

correspSearch API v2.0:
- Basis-URL: `https://correspsearch.net/api/v2.0/`
- Suche nach Korrespondent: `correspondent=http://d-nb.info/gnd/{ID}`
- Suche nach Zeitraum: `startdate=YYYY-MM-DD&enddate=YYYY-MM-DD`
- Format: JSON oder TEI-XML

Funktionen:
- Button "Weitere Briefe bei correspSearch" in Person-Detail
- Verwendet GND/VIAF-ID aus Authority-Daten
- Oeffnet correspSearch-Suche in neuem Tab
- Optional: Inline-Anzeige der Ergebnisse

Technische Umsetzung:
- Helper-Funktion `buildCorrespSearchUrl(personId, authorityType)`
- Button in Personen-Liste und Brief-Detail-Modal
- CORS beachten bei direkter API-Abfrage

### 5. Einheitliches Design-System

Konsolidierung der CSS-Tokens und Komponenten.

Aufgaben:
- Pruefung und Vereinheitlichung von tokens.css
- Komponenten-Bibliothek dokumentieren
- Dark Mode Unterstuetzung (optional)
- Responsive Breakpoints vereinheitlichen
- Accessibility-Audit (ARIA, Kontraste)

### 6. Prompttyping Vault

Knowledge-Base fuer Claude Code aus .md Dateien.

Konzept:
- Markdown-Dateien in knowledge-correspexplorer/ als Kontextquelle
- JOURNAL.md fuer Entwicklungsprotokoll
- user-stories.md fuer Anforderungen
- plan.md (dieses Dokument) fuer Roadmap

Status: Bereits vorhanden, wird automatisch von Claude Code genutzt.

---

## Priorisierte Roadmap

### Phase 1: Kern-Verbesserungen

1. ~~US-07: Orts-Details erweitern (Top-5 Absender im Popup)~~ - erledigt
2. ~~Orte-Index View (Places View)~~ - erledigt
3. ~~About-Seite~~ - erledigt

### Phase 2: Integration

4. ~~correspSearch API Integration (US-24)~~ - erledigt
5. ~~US-08: Liste der Orte ohne Koordinaten~~ - erledigt

### Phase 3: Erweiterte Features

6. ~~US-11: Netzwerk-Visualisierung~~ - erledigt
7. ~~Wissenskorb (US-31)~~ - erledigt

### Phase 4: Design-Ueberarbeitung - ABGESCHLOSSEN

8. ~~US-34: Landing-Page Design~~ - erledigt
   - Logo/Branding hinzugefuegt (Header)
   - Farbpalette aus design.md umgesetzt (Cream-Hintergrund, Rust-Red Akzent)
   - Cards mit 2px Borders und besserer Abhebung
   - Upload-Zone visuell aufgewertet

9. ~~US-35: Explore-Page Design~~ - erledigt
   - Sidebar/Main-Content Kontrast verbessert (Manila vs Cream)
   - Konsistente Border-Widths (border-light fuer Cards, border fuer Modals)
   - Map-Marker auf Rust-Red (#C65D3B) geaendert

10. ~~US-36: Typografie und UX~~ - erledigt
    - Tooltips fuer abgeschnittene Namen (person, topic, place)
    - Links in letter-meta mit Primary-Color
    - Active-States mit Rust-Red Tint

### Phase 5: Optionale Features - ABGESCHLOSSEN

11. ~~US-17: Themen-Schnellfilter~~ - erledigt
    - Top-5 Themen in Sidebar
    - Klick filtert nach Thema
    - Link zu Topics View

12. ~~US-23: Datensatz-Vergleich~~ - erledigt
    - Dedizierte Vergleichsseite (compare.html)
    - Zwei Datensaetze laden und vergleichen
    - Gemeinsame Personen/Orte identifizieren
    - CSV-Export der Vergleichsergebnisse

---

## Feature-Plan: correspSearch API Integration

### Uebersicht

Integration der correspSearch API v2.0 als direkte Datenquelle in CorrespExplorer. Ermoeglicht das Suchen und Laden von Korrespondenzen aus dem correspSearch-Netzwerk (180.000+ Briefe) ohne vorherigen Download.

### API-Grundlagen

Basis-URL: `https://correspsearch.net/api/v2.0/`

Formate:
- TEI-JSON (empfohlen): `&format=json`
- TEI-XML: `&format=tei`

Wichtige Parameter:
| Parameter | Beschreibung | Beispiel |
|-----------|--------------|----------|
| correspondent | Person (GND/VIAF URI) | `http://d-nb.info/gnd/118540238` |
| place | Ort (GeoNames URI) | `http://sws.geonames.org/2778067` |
| placeSender | Nur Absende-Ort | `http://sws.geonames.org/2778067` |
| startdate | Fruehestes Datum | `1850-01-01` |
| enddate | Spaetestes Datum | `1900-12-31` |
| available | Nur mit Digitalisat | `online` |
| x | Paginierung Offset | `0`, `100`, `200` |

Paginierung:
- Maximal 100 Eintraege pro Request
- Naechste Seite via `x=100`, `x=200`, etc.
- `more=true` im Response zeigt weitere Ergebnisse an

### UI-Design

Neue Sektion auf index.html zwischen URL-Input und Beispiel-Datensaetzen:

```
┌─────────────────────────────────────────────────────────────┐
│                    correspSearch Suche                       │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Person (GND/VIAF):  [________________________] [?]    │ │
│  │  Ort (GeoNames):     [________________________] [?]    │ │
│  │  Zeitraum:           [____] bis [____]                 │ │
│  │  Nur mit Digitalisat: [ ]                              │ │
│  │                                                        │ │
│  │  [Suchen]                                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Ergebnisse: 0 Briefe gefunden          [Alle laden]         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  □ Goethe-Schiller Briefwechsel (142 Briefe)           │ │
│  │  □ Humboldt-Korrespondenz (89 Briefe)                  │ │
│  │  ...                                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Alternativ (einfachere Variante):
- Erweiterte URL-Input Sektion mit Autocomplete fuer bekannte IDs
- Vorgegebene Beispiel-Queries als Buttons

### Implementierungs-Schritte

Phase 1: API-Integration (Grundfunktion)

1. Neues Modul `correspsearch-api.js`:
   - `searchCorrespSearch(params)` - API-Anfrage mit Parametern
   - `fetchAllPages(params)` - Automatische Paginierung
   - `transformToInternalFormat(apiResponse)` - TEI-JSON zu internem Format

2. Anpassung `cmif-parser.js`:
   - Erkennung von correspSearch API URLs
   - Automatische Paginierung bei API-URLs
   - TEI-JSON Response Parsing

3. Anpassung `upload.js`:
   - Erweiterung `handleUrlSubmit()` fuer API-URLs
   - Progress-Anzeige bei Paginierung
   - Abbruch-Moeglichkeit bei grossen Ergebnissen

Phase 2: Such-UI (Komfort)

4. HTML-Erweiterung `index.html`:
   - correspSearch Suchformular
   - Ergebnis-Vorschau vor dem Laden
   - Anzahl-Anzeige und Warnung bei grossen Ergebnissen

5. Autocomplete/Lookup:
   - GND-Suche (lobid.org API)
   - VIAF-Suche (viaf.org API)
   - GeoNames-Suche

Phase 3: Verknuepfung

6. Integration in explore.html:
   - "Weitere Briefe bei correspSearch" Button bei Personen
   - Direkt-Link mit aktueller Person-ID
   - Ergebnisse zur aktuellen Ansicht hinzufuegen (optional)

### TEI-JSON Struktur

Response-Beispiel:
```json
{
  "letters": [
    {
      "id": "example-123",
      "ref": "https://example.org/letter/123",
      "sender": {
        "name": "Goethe, Johann Wolfgang von",
        "ref": "http://d-nb.info/gnd/118540238"
      },
      "receiver": {
        "name": "Schiller, Friedrich",
        "ref": "http://d-nb.info/gnd/118607626"
      },
      "date": {
        "when": "1794-08-23"
      },
      "place": {
        "name": "Weimar",
        "ref": "http://sws.geonames.org/2812482"
      }
    }
  ],
  "more": true,
  "next": "https://correspsearch.net/api/v2.0/?correspondent=...&x=100"
}
```

### Transformation zu internem Format

TEI-JSON zu internem Letter-Objekt:
```javascript
function transformCorrespSearchLetter(csLetter) {
    return {
        id: csLetter.id || csLetter.ref,
        url: csLetter.ref,
        date: csLetter.date?.when || csLetter.date?.from || null,
        year: extractYear(csLetter.date),
        sender: {
            name: csLetter.sender?.name,
            id: extractAuthorityId(csLetter.sender?.ref),
            authority: detectAuthorityType(csLetter.sender?.ref)
        },
        recipient: {
            name: csLetter.receiver?.name,
            id: extractAuthorityId(csLetter.receiver?.ref),
            authority: detectAuthorityType(csLetter.receiver?.ref)
        },
        place_sent: {
            name: csLetter.place?.name,
            geonames_id: extractGeoNamesId(csLetter.place?.ref),
            lat: null,
            lon: null
        },
        language: null,  // correspSearch liefert keine Sprachinfo
        mentions: { subjects: [], persons: [], places: [] }
    };
}
```

### CORS und Proxy

correspSearch API erlaubt CORS:
- Direkte Browser-Anfragen moeglich
- Kein Proxy erforderlich
- Headers: `Accept: application/json`

### Limits und Warnungen

| Situation | Verhalten |
|-----------|-----------|
| > 500 Briefe | Warnung anzeigen, Bestaetigung erforderlich |
| > 2000 Briefe | Empfehlung: Filter einschraenken |
| > 5000 Briefe | sessionStorage-Limit wahrscheinlich erreicht |
| API-Fehler | Fallback auf bestehende URL-Eingabe |

### Beispiel-Queries als Schnellzugriff

| Name | Parameter |
|------|-----------|
| Goethe-Korrespondenz | `correspondent=http://d-nb.info/gnd/118540238` |
| Briefe aus Wien | `placeSender=http://sws.geonames.org/2761369` |
| Korrespondenz 1848 | `startdate=1848-01-01&enddate=1848-12-31` |

### Abhaengigkeiten

- Keine neuen Libraries erforderlich
- Nutzt bestehende `parseCMIF()` Infrastruktur
- Koordinaten-Anreicherung via bestehendes GeoNames-Cache

### Zeitplan-Empfehlung

1. Phase 1 (API-Integration): Kernfunktionalitaet
2. Phase 2 (Such-UI): Komfortfunktionen
3. Phase 3 (Verknuepfung): Integration mit explore.html

---

## Technische Schulden

- Timeline: Tooltips bei Hover verbessern
- Map: Layer-Switcher Icons vereinheitlichen
- Export: CMIF-Export Option hinzufuegen
- Performance: Lazy Loading fuer grosse Listen
- Tests: Unit-Tests fuer Parser und Filter-Logik

---

## Referenzen

- correspSearch API Dokumentation: https://correspsearch.net/index.xql?id=api
- CMIF Spezifikation: https://correspsearch.net/index.xql?id=participate_cmi-format
- TEI Correspondence SIG: https://tei-c.org/activities/sig/correspondence/
