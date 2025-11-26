# CorrespExplorer - Entwicklungsplan

Stand: 2025-11-26

---

## Aktueller Implementierungsstand

### Vollstaendig implementiert (22 User Stories)

| US | Feature | Beschreibung |
|----|---------|--------------|
| US-01 | CMIF-Upload | Drag-and-Drop oder Datei-Dialog |
| US-02 | URL-Laden | CMIF von URL laden |
| US-03 | Beispiel-Datensatz | HSA-Daten ein-Klick laden |
| US-04 | Statistik-Cards | Briefe, Personen, Orte |
| US-05 | Timeline | Zeitliche Verteilung |
| US-06 | Kartenansicht | Clustering, Zoom, Pan |
| US-09 | Korrespondenten-Liste | Suche, Sortierung |
| US-10 | Person-Filter | Klick filtert Briefe |
| US-12 | Brief-Liste | Suche, Sortierung |
| US-13 | Brief-Details | Modal mit allen Metadaten |
| US-14 | Quell-Navigation | Link zur Original-Edition |
| US-15 | Zeitraum-Filter | Slider fuer Start/Ende |
| US-16 | Sprach-Filter | Checkboxen mit Anzahl |
| US-18 | Filter-Kombination | UND-Verknuepfung |
| US-19 | Filter-Reset | Alle Filter zuruecksetzen |
| US-20 | URL-Sharing | Filter in URL codiert |
| US-21 | CSV-Export | Gefilterte Briefe |
| US-22 | JSON-Export | Strukturierte Daten |
| US-25 | Themen-Liste | Topics View mit Suche |
| US-26 | Themen-Details | Korrespondenten, Timeline, verwandte Themen |
| US-27 | Themen-Filter | Integration ins Filter-System |

### Teilweise implementiert (2 User Stories)

| US | Feature | Status | Offene Aufgaben |
|----|---------|--------|-----------------|
| US-07 | Orts-Details | Popup zeigt nur Anzahl | Top-5 Absender im Popup anzeigen |
| US-08 | Fehlende Koordinaten | Anzahl wird gezeigt | Liste der Orte ohne Koordinaten |

### Offen (4 User Stories)

| US | Feature | Prioritaet | Beschreibung |
|----|---------|-----------|--------------|
| US-11 | Netzwerk-Graph | Hoch | Force-Directed Graph: Wer schreibt wem |
| US-17 | Themen-Schnellfilter | Niedrig | Top-Themen in Sidebar (Topics View existiert) |
| US-23 | Datensatz-Vergleich | Niedrig | Zwei CMIF-Dateien vergleichen |
| US-24 | correspSearch-Integration | Mittel | Verknuepfung mit correspSearch API |

---

## Neue Features (aus HerData-Konzept)

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

### 2. Wissenskorb (Knowledge Basket)

Sammlung von ausgewaehlten Briefen/Personen/Orten fuer spaetere Analyse.

Funktionen:
- "Merken"-Button bei Briefen, Personen, Orten
- Persistenz via localStorage
- Basket-Uebersicht als Modal oder eigene View
- Export der gesammelten Elemente
- Teilen via URL (IDs als Parameter)

Technische Umsetzung:
- `basket` Objekt im localStorage
- UI-Komponente fuer Basket-Badge und Modal
- Funktionen: `addToBasket()`, `removeFromBasket()`, `exportBasket()`

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

1. US-07: Orts-Details erweitern (Top-5 Absender im Popup)
2. Orte-Index View (Places View)
3. About-Seite

### Phase 2: Integration

4. correspSearch API Integration (US-24)
5. US-08: Liste der Orte ohne Koordinaten

### Phase 3: Erweiterte Features

6. Wissenskorb
7. US-11: Netzwerk-Visualisierung

### Phase 4: Polish

8. Design-System Konsolidierung
9. US-23: Datensatz-Vergleich (optional)

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
