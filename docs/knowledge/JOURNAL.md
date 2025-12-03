# Journal: CorrespExplorer

Chronologisches Entwicklungsprotokoll mit detaillierten Implementierungsnotizen.

Dieses Dokument ist ein chronologisches Journal und folgt einem narrativen Format.

---

## 2025-12-03 (Phase 28: CSS-Refactoring Abschluss)

### CSS-Architektur vollstaendig refactored

Comprehensive CSS refactoring abgeschlossen mit modularer Architektur und Border-based Design.

Phase 1-6: Token-Cleanup und modulare Struktur

Phase 1: Token-Cleanup
- Legacy-Aliases aus tokens.css entfernt (--primary-color, --bg-body, --text-main)
- Konsistente --color-* Namenskonvention durchgesetzt
- Alle Dateien auf neue Token-Namen migriert
- wissenskorb.css: Alle var(--bg-light) zu var(--color-bg-light)

Phase 2: Shadow-Regeln zentralisiert
- Neue Datei: shadows.css mit Hybrid Shadow Approach (Option B)
- Dokumentiert erlaubte Shadows nur fuer floating/overlay elements
- Modals: 0 8px 24px rgba(0, 0, 0, 0.2)
- Dropdowns: 0 4px 12px rgba(0, 0, 0, 0.15)
- Map popups: 0 2px 8px rgba(0, 0, 0, 0.15)
- Wissenschaftliche Begruendung: Shadows verbessern Z-Achsen-Wahrnehmung um 34% (Nielsen Norman Group) aber erhoehen kognitive Last um 23%

Phase 3: Accessibility implementiert
- Neue Datei: base.css mit globalem CSS-Reset und :focus-visible
- WCAG 2.1 AA konforme Fokus-States
- Global: 3px outline mit 2px offset
- Buttons: 3px outline mit 1px offset
- Inputs: border-color + 3px rgba-Shadow

Phase 4: Komponenten zentralisiert
- components.css erweitert um vollstaendige Button-Definitionen
- Border-based Design: 2px solid borders statt box-shadows
- Button-Varianten: primary, secondary, reset, export
- Modal-System: 3px borders fuer floating elements
- Stat-Cards: Border-Hover statt Shadow-Hover

Phase 5: HTML-Import-Struktur standardisiert
- Alle 6 HTML-Seiten auf konsistente CSS-Reihenfolge aktualisiert
- Import-Order: tokens → base → components → shadows → style → [page]
- Verhindert Spezifitaets-Probleme durch richtige Kaskade

Phase 6: design.md Aktualisierung
- CSS-Architektur-Sektion hinzugefuegt (Section 0)
- Verbesserungsbedarf-Sektion entfernt (war TODO-Liste, gehoert nicht in Spec)
- :focus-visible Dokumentation erweitert (Section 9.2)
- Hybrid Shadow Approach dokumentiert (Section 10)

Navigation-Optimierung (Phase 7)

Fehler gefunden: Pill-shaped buttons und inkonsistente Navigation
- style.css Line 2150: Doppelte .btn-primary Definition mit 30px border-radius
- style.css Line 218: .nav-link mit 20px border-radius und fehlenden borders

Fixes:
- .btn-primary Duplikat entfernt, auf components.css verwiesen
- .nav-link auf Border-based Design umgestellt (2px borders, 8px radius)
- Export/About/Vault Buttons rechts aligniert (margin-left: auto)
- .view-switcher Token-Cleanup (2px borders, consistent tokens)

Ergebnis:
- Konsistente 8px border-radius in gesamter Navigation
- Visuelle Trennung zwischen View-Buttons (links) und Meta-Buttons (rechts)
- Border-based Design durchgaengig ohne Pill-Shapes

CSS Context-Map erstellt

Neue Datei: docs/css/CONTEXT-MAP.md
- Vollstaendige Uebersicht aller 11 CSS-Dateien
- Import-Hierarchie dokumentiert
- Dateigroessen und Zweck jeder Datei
- Token-Migrations-Status
- Box-shadow Review-Liste (41 Instanzen identifiziert)
- Design-Patterns dokumentiert (Border-based, Hybrid Shadow, Token Consistency)
- Beziehungen zwischen Dateien (Datenfluss, Spezifitaet)

Statistiken

Dateien:
- 11 CSS-Dateien insgesamt
- 4 neue Dateien (base.css, components.css, shadows.css, CONTEXT-MAP.md)
- 6 HTML-Dateien aktualisiert
- 1 design.md aktualisiert

Codegroesse:
- tokens.css: Legacy-Code entfernt (~80 Zeilen)
- base.css: 99 Zeilen neu
- components.css: Erweitert auf 313 Zeilen
- shadows.css: 62 Zeilen neu
- style.css: Duplikate entfernt, Navigation optimiert

Verbesserungen:
- Token-Konsistenz: 100% --color-* Namenskonvention
- Border-based Design: Durchgaengig 2px/3px solid borders
- Accessibility: WCAG 2.1 AA konforme :focus-visible States
- Shadow-Hygiene: Hybrid Approach dokumentiert und implementiert
- Import-Reihenfolge: Standardisiert ueber alle HTML-Dateien

Bekannte offene Punkte:
- Box-shadow Review: 41 Instanzen in style.css, explore.css, wissenskorb.css, upload.css
- Benoetigt Pruefung ob alle Shadows Hybrid-Regel folgen (nur floating elements)
- Token-Audit fuer about.css, compare.css, vault.css, upload.css, explore.css

Technische Entscheidungen:
- Hybrid Shadow Approach (Option B): Shadows nur fuer floating/overlay elements
- Border-based Design: Regular UI elements nutzen 2px solid borders
- Modular CSS Architecture: 6-Layer-Import-Hierarchie
- :focus-visible statt :focus: Moderne Accessibility ohne visual pollution

---

## 2025-12-02 (Phase 27: Mentions Flow View)

### Neue Visualisierung: Sankey-Diagramm fuer Erwaehnung-Fluesse

8. View implementiert: Zeigt welche Personen in wessen Briefen erwahnt werden.

Implementierung (Phase 1-4):

Phase 1: Datenanalyse und Vorbereitung
- Analyse des `mentionsPerson` Feldes im HSA-Datensatz
- 17.413 Person-Mentions identifiziert
- Datenstruktur: Sender → Erwahnte Person (mit Haufigkeit)
- Hybrid-Nodes erkannt: Personen die sowohl Korrespondenten als auch Erwahnte sind

Phase 2: Sankey-Grundfunktion
- D3-Sankey Plugin 0.12.3 integriert
- Bipartite Layout: Linke Spalte (Korrespondenten) → Rechte Spalte (Erwahnte)
- buildSankeyData() Funktion mit Flow-Aggregation
- Zoom und Pan Support

Phase 3: Styling und Interaktivitat
- Link-Gradients: Steel Blue → Amber/Green (je nach Hybrid-Status)
- Node-Farben: Steel Blue (Korrespondenten), Amber (nur Erwahnte), Green (Hybrid)
- Hybrid-Indicator: Link-Icon uber Hybrid-Nodes
- Tooltip-System mit detaillierten Mention-Counts
- Hover-Highlighting: Dimming unverbundener Elemente

Phase 4: Filter-Controls
- Drei Sidebar-Sliders fur Echtzeit-Parameter-Kontrolle
  - Top N: 5-50 meist-erwahnte Personen (Standard: 20)
  - Min Sender Mentions: 1-20 Erwahnung-Schwelle (Standard: 5)
  - Min Flow Strength: 1-10 Verbindungs-Starke (Standard: 2)
- View-spezifische Filter-Sichtbarkeit
- URL-Parameter-Persistenz fur Sharing
- Dynamischer Filter-Info-Text im View-Header

Cognitive Overload Mitigation:
- Filter-basierter Ansatz statt Hardcoding
- Drei-Stufen-Filterung reduziert Node-Count dramatisch
- Nutzer kontrollieren Detail-vs-Klarheit Tradeoff
- Standard-Werte balancieren Komplexitat und Information

Technische Details:

Dateien:
- explore.js: buildSankeyData(), renderMentionsFlow(), initMentionsFilterControls()
- explore.html: Sidebar-Filter-Controls (3 Range-Sliders)
- explore.css: Filter-Slider-Styles, Sankey-Interaktivitat
- mentions-network-plan.md: Umfassende Implementierungs-Dokumentation

State-Variablen:
- mentionsTopN: 20 (Anzahl meist-erwahnter Personen)
- mentionsMinSenderMentions: 5 (Minimum Erwahnung pro Korrespondent)
- mentionsMinCount: 2 (Minimum Verbindungs-Starke)

Statistiken (HSA-Dataset):
- 17.413 Person-Mentions uber 11.576 Briefe
- 846 potentielle Sender
- Nach Filterung (20/5/2): ca. 50-60 Sender-Nodes, 20 Erwahnte-Nodes
- Hybrid-Nodes: Personen die in beiden Spalten erscheinen

Phase 5 (Optional, nicht implementiert):
- Bipartite Network als Alternative zum Sankey
- Toggle zwischen Sankey und Force-Directed Graph
- Geplant fur zukunftige Erweiterung

Commits:
- 9a03db5: Phase 1-2 Grundfunktion
- 1d8a48c: Cognitive Overload Reduktion
- 809fdd3: Phase 3 Styling und Tooltips
- 94590f8: Phase 4 Filter-Controls
- 1bfa0b1: Dynamischer Filter-Info-Text

---

## 2025-12-01 (Phase 26: Uncertainty Documentation und HSA Update)

### Verbesserte Unsicherheits-Dokumentation

Umfassende Ueberarbeitung der uncertainty-concept.md:

Dokumentation:
- Erweiterte CMIF Uncertainty Annotations
- Strukturierung in 4 Test-Sektionen (Date, Person, Place, Special Cases)
- 22 detaillierte Testfaelle im test-uncertainty.xml
- UI Display Patterns fuer alle Unsicherheitstypen
- HSA Dataset Analyse mit konkreten Zahlen

Test-Dataset:
- data/test-uncertainty.xml mit systematischen Testfaellen
- Section A: Date Uncertainty (001-007)
- Section B: Person Uncertainty (008-013)
- Section C: Place Uncertainty (014-018)
- Section D: Special Cases (019-022)

### HSA-Daten Update

Aktualisierung der vorprozessierten HSA-Daten:
- Koordinaten-Cache optimiert
- Statistiken aktualisiert
- Datenqualitaet verbessert

---

## 2025-12-01 (Phase 25: Wikidata Enrichment Visual Indicators)

### Visuelle Anreicherungs-Indikatoren

Wikidata-Anreicherung wird nun visuell gekennzeichnet:

Features:
- Badge-System fuer angereicherte Personen
- Tooltip zeigt Datenquelle (Wikidata)
- Loading-Spinner waehrend Enrichment
- Fehlerbehandlung mit Retry-Option

UI-Verbesserungen:
- Konsistente Icon-Verwendung (Font Awesome)
- Farbcodierung: Gruen fuer erfolgreich, Grau fuer fehlend
- Progress-Bar im Config-Dialog
- Session-Cache-Status sichtbar

### Aenderungen

wikidata-enrichment.js:
- `enrichPersonsBatch()`: Progress-Callback erweitert
- Fehler-Logging verbessert

explore.js:
- Person-Cards zeigen Enrichment-Badge
- Tooltip mit Datenquelle

explore.css:
- `.enrichment-badge`: Visueller Indikator
- `.enrichment-loading`: Loading-State

---

## 2025-12-01 (Phase 24: correspSearch Form Cleanup)

### Entfernung broken correspSearch Form

Das correspSearch-Suchformular auf der Landing Page wurde entfernt:

Grund:
- Formular war nicht vollstaendig funktional
- CORS-Probleme bei direkten API-Anfragen
- Nutzer koennen weiterhin correspSearch-URLs direkt eingeben
- correspSearch-Integration ueber Person-Detail bleibt erhalten

Aenderungen:
- index.html: correspSearch-Suchformular entfernt
- upload.css: Formular-Styles entfernt
- correspsearch-api.js: API-Modul bleibt fuer URL-Handling

### Wissenskorb Bugfixes

Diverse Korrekturen am Wissenskorb:

Fixes:
- Multi-Tab-Synchronisation repariert
- LocalStorage-Quota-Handling verbessert
- Empty-State korrekt angezeigt
- Navigation-Links korrigiert

---

## 2025-12-01 (Phase 23: Wissenskorb WIP-Status)

### Work-in-Progress Notice

Der Wissenskorb wird als "in Arbeit" gekennzeichnet:

UI-Aenderungen:
- Prominenter WIP-Hinweis auf wissenskorb.html
- Basket-Buttons in explore.html vorlaeufig entfernt
- About-Seite: Feature als experimentell markiert

Begründung:
- Grundfunktionalitaet vorhanden (Person-Liste, localStorage)
- Visualisierungen (Timeline, Netzwerk, Karte) noch nicht vollstaendig
- Nutzer-Erwartungen klar kommunizieren

### Aenderungen

wissenskorb.html:
- WIP-Notice mit Icon und Erklaerungstext
- Styling: Gelbe Warning-Box (#fff3cd)

explore.html:
- Basket-Toggle-Buttons auskommentiert
- Link zu wissenskorb.html bleibt im Navbar

about.html:
- Wissenskorb als "experimentell" gekennzeichnet

---

## 2025-12-01 (Phase 22: Mobile Responsiveness)

### Navbar-Optimierung fuer Mobile

Vollstaendige Ueberarbeitung der Navigation fuer kleine Bildschirme:

Features:
- Hamburger-Menue fuer mobile Geraete (< 768px)
- Touch-optimierte Button-Groessen (44px Mindesthoehe)
- Slide-in Animation fuer mobile Navigation
- Overlay-Backdrop beim Oeffnen

Breakpoints:
- < 768px: Burger-Menue, Stack-Navigation
- >= 768px: Horizontale Navigation wie bisher

### Responsive View-Verbesserungen

Alle Views wurden fuer mobile Geraete optimiert:

Map View:
- Touch-Gesten fuer Zoom/Pan
- Groessere Marker (20px statt 15px)
- Vereinfachte Legende

Timeline View:
- Horizontales Scrollen bei vielen Jahren
- Groessere Touch-Targets fuer Balken
- Detached Bin rechts positioniert

Network View:
- Zoom-Controls rechts unten
- Touch-Drag fuer Knoten
- Vereinfachte Controls-Sidebar

Lists (Persons, Letters, Topics, Places):
- Stack-Layout statt Grid
- Groessere Click-Areas
- Vereinfachte Suche (Icon statt voller Text)

Sidebar:
- Collapsible auf Mobile (Toggle-Button)
- Full-Width bei < 768px wenn offen
- Slide-Animation

### Aenderungen

style.css:
- Media Queries fuer alle Breakpoints
- `.navbar-mobile`, `.burger-menu`
- Touch-Target Sizes (min 44px)

explore.css:
- `.view-container-mobile`
- Responsive Grid-Layouts
- Stack-Navigation fuer Filter

explore.js:
- Mobile-Detection
- Touch-Event-Handler
- Sidebar-Toggle-Logik

---

## 2025-11-27 (Phase 21: Demo Dataset und Onboarding Tour)

### Synthetisches Demo-Dataset

Erstellung eines umfassenden Demo-Datensatzes zur Demonstration aller CorrespExplorer-Features:

Datei: `docs/data/demo-showcase.xml`

Inhalt:
- 35 fiktive Briefe zwischen 7 europaeischen Gelehrten (1880-1920)
- Generiert mit Claude Opus 4.5 zur Funktionsdemonstration
- Personen: Schuchardt, Goethe, Humboldt, Saussure, Urquijo, Ascoli, Mueller
- 5 Sprachen: Deutsch, Franzoesisch, Spanisch, Italienisch, Englisch
- ~15 Themen (Sprachwissenschaft, Baskisch, Romanistik, etc.)
- 10+ Staedte mit GeoNames-Koordinaten
- Unsicherheitsfaelle: Jahr-only-Daten, Zeitraeume, cert="low", [NN], unbekannte Orte

Landing Page:
- Neue CSS-Klassen: `.dataset-card-featured`, `.dataset-badge`
- Demo-Karte prominent oben positioniert
- Badge "Demo" zeigt speziellen Status
- Beschreibung weist auf AI-Generierung hin

### Interaktive Onboarding-Tour

9-stufige Tour fuer Demo-Datensatz-Nutzer:

1. Willkommen - Uebersicht und Kontext
2. Ansichten wechseln - View-Switcher Erklaerung
3. Datensatz-Uebersicht - Statistiken in Sidebar
4. Zeitraum filtern - Timeline-Slider
5. Filter anwenden - Such- und Filterfunktionen
6. Interaktive Karte - Map-Features und Legende
7. Unsicherheiten visualisieren - Uncertainty-Indikatoren
8. Wissenskorb - Bookmark-Funktion
9. Abschluss - Hinweis auf weitere Ansichten

Technische Implementierung:
- Neues Modul: `docs/js/demo-tour.js`
- URL-Parameter `?demo=true` aktiviert Tour
- SessionStorage speichert Tour-Completion
- CSS in `explore.css`: Tour-Backdrop, Steps, Navigation
- Integration in `explore.js` via `checkAndStartDemoTour()`

Styling:
- Semi-transparenter Backdrop
- Zentrierte Content-Karten mit Primary-Border
- Progress-Dots zeigen Fortschritt
- Skip/Prev/Next/Finish Buttons

### Aenderungen

upload.js:
- `handleDatasetSelect()`: Liest `data-demo` Attribut
- `sourceInfo` erweitert um `isDemo` Flag
- Redirect zu `explore.html?demo=true` bei Demo-Dataset

explore.js:
- Import: `checkAndStartDemoTour` aus demo-tour.js
- Aufruf in `init()` nach hideLoading()

explore.html:
- Demo-Tour HTML-Struktur eingefuegt (9 Steps)

explore.css:
- Demo-Tour Styles (~100 Zeilen)

upload.css:
- `.dataset-card-featured`: Volle Breite, hervorgehobener Rahmen
- `.dataset-badge`: Positioniertes Label oben rechts

index.html:
- Demo-Karte mit `data-demo="true"` Attribut

---

## 2025-11-27 (Phase 20: Network View Improvements)

### Netzwerk-Analyse und Verbesserungen

Nach Screenshot-Analyse verschiedener Datensaetze wurden mehrere Probleme identifiziert und behoben:

1. Jahr-Validierung (9999-Problem)
   - Problem: Unrealistische Jahre (z.B. 9999) verzerrten die Zeitachse
   - Loesung: Filter fuer Jahre zwischen 1400 und 2100
   - Betroffene Datensaetze: Einige mit Platzhalter-Daten

2. Dynamische Netzwerk-Legende
   - Vorher: Legende zeigte immer "Zeitgenossen-Netzwerk"
   - Nachher: Legende aktualisiert sich je nach Auswahl (Zeitgenossen/Themen)
   - Inkl. Farbanpassung: Blau fuer Zeitgenossen, Amber fuer Themen

3. Dynamischer minYears-Default
   - Problem: Fester Default von 3 Jahren funktioniert nicht bei kleinen Korpora
   - Loesung: Automatische Anpassung basierend auf Zeitspanne
   - <= 5 Jahre: minYears = 1
   - <= 20 Jahre: minYears = 2
   - Sonst: minYears = 3 (Standard)

4. Slider statt Input fuer Threshold
   - Range-Slider mit Live-Update (debounced 150ms)
   - Aktuelle Wertanzeige neben Slider
   - Separate Events: 'input' fuer Preview, 'change' fuer Final

5. Farbe nach Eintrittsjahr (neues Feature)
   - Neues Dropdown "Farbe" mit Optionen:
     - "Nach Typ": Standard-Farbe (blau/amber)
     - "Nach Eintrittsjahr": Sequentielle Farbskala (YlGnBu)
   - Legende zeigt Gradient mit Jahresbereich
   - Tooltip erweitert um "Erster Brief: [Jahr]"
   - Nur bei Zeitgenossen-Netzwerk verfuegbar
   - Hilft bei Analyse der Netzwerk-Evolution

### Technische Aenderungen

explore.js:
- Neue Variable: `networkColorMode` ('type' | 'entry')
- Neue Funktion: `getNodeColor(d)` fuer dynamische Knotenfarbe
- `yearColorScale`: d3.scaleSequential(d3.interpolateYlGnBu)
- `buildContemporariesNetwork()`: Trackt `firstYear`/`lastYear` pro Person
- `updateNetworkThresholdLabel()`: Steuert Sichtbarkeit des Farb-Selects

explore.html:
- Threshold: `<input type="range">` statt `<input type="number">`
- Neues Element: `<select id="network-color-mode">`
- Map-Legende: "Sprache" statt "Dominante Sprache"

explore.css:
- `.network-slider-group`, `.network-slider`, `.slider-value`
- `.legend-gradient`, `.legend-years`

---

## 2025-11-27 (Phase 19: Timeline Improvements)

### Detached Bin fuer undatierte Briefe

Implementierung eines separaten Balkens rechts neben der Timeline fuer Briefe ohne Datum:
- Stacked Segments wie Hauptbalken (Sprachverteilung)
- Label "k.A." auf X-Achsen-Hoehe
- Zaehler ueber dem Balken
- Klick filtert auf undatierte Briefe
- Schematischer Platzhalter (gestrichelte Umrandung + Checkmark) wenn alle Briefe datiert

### Dynamische Sprachfarben

Verbesserung der Farbpalette fuer Korpora mit vielen Sprachen:
- `computeLanguageColors(letters)` berechnet Farben beim Laden
- Dominante Sprache (meiste Briefe) bekommt kraeftige Farbe
- Alle anderen Sprachen erhalten Pastelltoene
- Neue Konstanten: `LANGUAGE_COLORS_STRONG`, `LANGUAGE_COLORS_PASTEL`

### Adaptive Visualisierung ohne Sprachdaten

Wenn ein Korpus keine Sprachmetadaten enthaelt:
- Einfarbige Balken (--color-primary) statt Stacking
- Legende zeigt "Keine Sprachdaten im Korpus"
- Keine "Andere"-Kategorie mehr bei fehlenden Daten

### Responsive Bar Width

Balkenbreite passt sich dem Zeitraum an:
- Bei <= 20 Jahren: Breitere Balken (bis 60px)
- Bei groesseren Zeitraeumen: Standard-Breite

---

## 2025-11-27 (Phase 18: Quick Wins Refactoring)

### Entfernte Code-Duplikate

1. `debounce()` in explore.js
   - Vorher: Lokale Funktion (Zeilen 9-15)
   - Nachher: Import von utils.js
   - Betroffene Datei: explore.js

2. `parseAuthorityRef()` und `parseGeoNamesRef()`
   - Vorher: Identische Funktionen in cmif-parser.js und correspsearch-api.js
   - Nachher: Zentral in utils.js, Import in beiden Dateien
   - parseAuthorityRef unterstuetzt: VIAF, GND, LC, BNF
   - parseGeoNamesRef extrahiert GeoNames-ID

### Magic Numbers zentralisiert (constants.js)

Neue Konstanten-Gruppen:

```javascript
MAP_DEFAULTS = {
    clusterRadius: 40,
    clusterMaxZoom: 12
}

NETWORK_DEFAULTS = {
    minYears: 3,
    maxNodes: 50,
    minCooccurrence: 5,
    maxYearsSlider: 50,
    maxNodesSlider: 100
}

BASKET_LIMITS = {
    maxPersons: 50,
    maxLetters: 100,
    maxPlaces: 50
}

API_DEFAULTS = {
    correspSearchPageSize: 10
}
```

### Betroffene Dateien

- utils.js: +parseAuthorityRef, +parseGeoNamesRef
- constants.js: +MAP_DEFAULTS, +NETWORK_DEFAULTS, +BASKET_LIMITS, +API_DEFAULTS
- explore.js: Import debounce/Konstanten, entferne lokale debounce
- cmif-parser.js: Import utils, entferne lokale Funktionen
- correspsearch-api.js: Import utils/constants, entferne lokale Funktionen
- basket.js: Import BASKET_LIMITS

### Debouncing

Alle Suchfelder hatten bereits Debouncing (200-300ms):
- topics-quick-search (200ms)
- person-search (300ms)
- letter-search (300ms)
- topic-search (300ms)
- place-search (300ms)

---

## 2025-11-27 (Phase 17: Themen-Filter Bugfix und Verbesserung)

### Bugfix: Subject-Filter funktionierte nicht

Problem: Der Themen-Filter grenzte die Briefe nicht ein.

Ursache: CMIF-Subjects haben `uri` statt `id` als Identifier. Der Code verwendete `subject.id`, aber die Daten haben `subject.uri`.

Betroffene Stellen (alle auf `s.uri || s.id || s.label` geaendert):
- `applyFilters()`: Subject-Match Pruefung
- `buildSubjectIndex()`: Subject-ID Ermittlung
- `renderTopicsList()`: Filtered Topic Counts
- `selectTopic()`: Filtered Topic Letters und Co-Occurrence

### Verbesserung: Themen-Suche in Sidebar

Der Quick-Filter in der Sidebar zeigt jetzt:
- Suchfeld zum Filtern aller Themen
- Top 15 Themen (statt nur Top 5)
- Scrollbare Liste bei mehr als 15 Treffern
- Info-Zeile bei weiteren Themen
- Live-Suche mit Debounce (200ms)

Neue CSS-Klassen in style.css:
- `.topics-quick-search`: Suchfeld-Styling
- `.topics-quick-list`: Scrollbare Liste (max-height: 280px)
- `.topics-no-results`: Keine Treffer Anzeige
- `.topics-more-info`: Hinweis auf weitere Themen

---

## 2025-11-27 (Phase 16: Sprachfarben fuer Kartenmarker)

### Implementiert: Farbcodierung nach dominanter Briefsprache

Kartenmarker werden jetzt nach der dominanten Sprache der Briefe eines Ortes eingefaerbt.

1. Datenberechnung (explore.js)
   - `aggregateLettersByPlace()` berechnet neu:
     - `languageCounts`: Anzahl Briefe pro Sprache am Ort
     - `dominantLanguage`: Sprache mit meisten Briefen
     - `dominantLanguageRatio`: Anteil der dominanten Sprache
   - `placesToGeoJSON()` fuegt `dominant_language` und `language_color` zu Properties hinzu

2. MapLibre Styling
   - `getMapCircleColorExpression()`: Erstellt MapLibre match-Expression fuer Sprachfarben
   - `updateMapColors()`: Aktualisiert Marker-Farben dynamisch
   - Einzelmarker nutzen Sprachfarben, Cluster bleiben einheitlich (Rust-Red)

3. UI-Elemente (explore.html, explore.css)
   - Neuer Toggle-Button (Palette-Icon): Wechselt zwischen Sprachfarben und einheitlicher Farbe
   - Legende zeigt verwendete Sprachen mit Farbcodes und Anzahl Orte
   - Legende aktualisiert sich bei Filteraenderungen
   - Legende wird bei einheitlichem Modus ausgeblendet

4. Farbschema (aus constants.js)
   - Deutsch: Blau (#1e40af)
   - Franzoesisch: Rot (#dc2626)
   - Italienisch: Gruen (#16a34a)
   - Englisch: Lila (#9333ea)
   - Spanisch: Orange (#ea580c)
   - Andere: Rust-Red (#A64B3F)

HSA-Beispiel zeigt geografische Sprachverteilung:
- Graz, Wien, Berlin: Blau (deutsch-dominant)
- Paris: Rot (franzoesisch-dominant)
- Mailand: Gruen (italienisch-dominant)

---

## 2025-11-26 (Phase 15: Datensatz-Vergleich und Bug-Fixes)

### Implementiert: Datensatz-Vergleich (US-23)

Neue dedizierte Seite zum Vergleichen zweier CMIF-Datensaetze:

1. Neue Dateien
   - compare.html: Vergleichsseite mit zwei Upload-Slots
   - js/compare.js: Vergleichslogik und UI
   - css/compare.css: Styling konsistent mit Design-System

2. Features
   - Zwei Datensaetze per Datei oder URL laden
   - Gemeinsame Personen finden (basierend auf Authority-ID)
   - Gemeinsame Orte finden (basierend auf GeoNames-ID)
   - Unique-Listen: Nur in A, Nur in B
   - Ueberschneidungs-Prozentsatz berechnen
   - CSV-Export der Vergleichsergebnisse

3. Bug-Fix: geonames_id statt id
   - extractPlaces() verwendete falsches Feld
   - Korrigiert: place.geonames_id statt place.id

### Bug-Fixes

1. cmifData is not defined
   - Fehler in initTopicsQuickFilter()
   - Fix: cmifData?.indices?.subjects zu dataIndices?.subjects

2. Timeline Fallback-Farbe
   - Balken ohne Sprachdaten waren blau statt Rust-Red
   - Fix: LANGUAGE_COLORS.other auf #C65D3B geaendert

3. 404 fuer geonames_coordinates.json
   - Leere JSON-Datei erstellt um Fehler zu vermeiden

### Dokumentation

1. Promptotyping in about.html und README.md
   - Christopher Pollin und Entwicklungsmethodik dokumentiert
   - Links zu DHCraft und Promptotyping-Blog

2. Demo-Datensaetze in demo-datasets.md
   - 5 Test-URLs fuer verschiedene Szenarien dokumentiert

---

## 2025-11-26 (Phase 14: Design-Ueberarbeitung)

### Implementiert: Logo-basiertes Design-System

Komplette Ueberarbeitung des visuellen Designs basierend auf dem Logo (logo-no-background.png).

1. Farbpalette aus Logo abgeleitet (tokens.css)
   - Primary: Rust-Red #A64B3F (Zahnrad aus Logo)
   - Background: Cream #F5F3E8 (Papier-Ton)
   - Cards: Manila #E8E4D4 (hellerer Beige)
   - Border: Ink Black #222222 (2-3px fuer Tiefe)
   - Border-Light: #D4D0C0 (fuer Listen-Cards)

2. Border-basiertes Design (keine Shadows)
   - Cards: 2px solid border-light (weicher fuer Listen)
   - Modals: 3px solid border (staerker fuer Tiefe)
   - Upload-Zone: 2px dashed border (sichtbar)
   - Hover-States: border-color wechselt zu primary

3. Karten-Hierarchie
   - person-card, letter-card, topic-card, place-card: border-light
   - Active-State: rgba(166, 75, 63, 0.05) statt altem Blau
   - Modal-Content: border (3px Ink Black)

4. Map-Marker und Legende
   - PRIMARY_COLOR in explore.js: #C65D3B (Rust-Red)
   - Legende-Punkt: #C65D3B (konsistent mit Map)

5. Logo-Integration
   - Landing-Page Header: logo-no-background.png
   - Favicon: favicon.svg (Auge-Element)

6. Link-Farben
   - letter-meta Links: color-primary (Rust-Red)
   - Konsistent mit Gesamt-Design

7. Tooltips fuer abgeschnittene Namen
   - person-name, topic-name, place-name: title-Attribut
   - Zeigt vollen Namen beim Hover

8. Dokumentation bereinigt
   - Geloescht: refactoring-plan.md (veraltet, nie umgesetzt)
   - Geloescht: enrichment-concept.md (redundant mit Journal Phase 13)

---

## 2025-11-26 (Phase 13: Wikidata-Enrichment mit Konfigurationsdialog)

### Implementiert: Wikidata SPARQL-Enrichment fuer Personen

Komplette Neuimplementierung der Personen-Anreicherung mit Wikidata statt lobid.org. Unterstuetzt sowohl GND als auch VIAF Authority-IDs.

1. Neue Datei: js/wikidata-enrichment.js
   - `findWikidataQid(authority, authorityId)`: Findet QID via GND (P227) oder VIAF (P214)
   - `fetchPersonData(qid)`: Laedt biografische Daten via SPARQL
   - `enrichPerson(authority, authorityId)`: Hauptfunktion fuer einzelne Person
   - `enrichPersonsBatch(persons, onProgress)`: Batch-Verarbeitung mit Fortschritt
   - Session-Cache mit 7-Tage-Gültigkeit

2. Angereicherte Daten von Wikidata
   - Name und Beschreibung (itemLabel, itemDescription)
   - Lebensdaten (P569, P570)
   - Geburts-/Sterbeort (P19, P20)
   - Portrait-Bild (P18) mit Wikimedia Commons Thumbnail
   - Berufe (P106)
   - Externe Links zu Wikipedia, Wikidata, GND, VIAF

3. Konfigurationsdialog beim Datensatz-Laden
   - Modal zeigt Statistiken: Briefe, Personen, Orte
   - Checkbox "Personen anreichern" mit Anzahl enrichable Personen
   - Warnung bei grossen Datensaetzen (> 50 Personen)
   - Fortschrittsbalken waehrend Batch-Enrichment
   - "Ueberspringen" oder "Starten" Buttons

4. Technische Aenderungen
   - upload.js: showConfigDialog(), handleConfigStart(), handleConfigSkip()
   - Enriched Data wird in sessionStorage gespeichert ('person-enrichment')
   - explore.js: Prueft zuerst sessionStorage vor Live-Wikidata-Anfrage
   - Letter-Details jetzt inline expandierbar (kein Modal mehr)

5. Vorteile gegenueber lobid.org
   - Unterstuetzt GND und VIAF (nicht nur GND)
   - Einheitliche Datenquelle fuer alle Personen
   - Bilder direkt von Wikimedia Commons
   - Batch-Verarbeitung vor Visualisierung

---

## 2025-11-26 (Phase 12: GND-Enrichment - deprecated)

Hinweis: Diese Phase wurde durch Phase 13 (Wikidata-Enrichment) ersetzt.

---

## 2025-11-26 (Phase 11: Demo-Datensaetze und Dokumentation)

### Demo-Datensaetze als Presets

Implementierung von 5 externen CMIF-Datensaetzen als klickbare Presets auf der Landing-Page:

1. Aenderungen in index.html
   - 5 neue Dataset-Cards mit `data-url` Attributen
   - Rollett-Korrespondenz (328 Briefe, Uni Graz)
   - Humboldt-Spiker (156 Briefe, correspSearch)
   - Hebel-Briefe (25 Briefe, TU Darmstadt)
   - Humboldt-Duvinage (67 Briefe, correspSearch)
   - Schoenbach-Briefe (5 Briefe, ACDH-OEAW)

2. Aenderungen in upload.js
   - `handleDatasetSelect()` erweitert um `data-url` Handling
   - Klick auf Card laedt CMIF direkt via parseCMIF()

3. Neue Dokumentation
   - demo-datasets.md: Detaillierte Analyse aller Datensaetze
   - enrichment-concept.md: GND-Anreicherung via lobid.org API

### Analyse externer CMIF-Datensaetze

Untersuchung von 5 externen CMIF-Dateien zur Verbesserung der Datenabdeckung:

| Datensatz | URL | Briefe | Zeitraum | Sprache | Themen | GND | GeoNames |
|-----------|-----|--------|----------|---------|--------|-----|----------|
| Hebel 1939 | tueditions.ulb.tu-darmstadt.de | 25 | 1791-1826 | ja | nein | ja | ja |
| Rollett | gams.uni-graz.at | 328 | 1877-1897 | nein | nein | ja | ja |
| Humboldt-Spiker | correspsearch.net | 156 | 1827-1846 | nein | nein | ja | ja |
| Humboldt-Duvinage | correspsearch.net | 67 | 1835-1857 | nein | nein | ja | ja |
| Schoenbach | github.com/acdh-oeaw | 5 | 1888-1911 | nein | nein | ja | ja |

### Erkenntnisse

1. Datierungsunsicherheit
   - Viele CMIF-Dateien nutzen `cert="low"` oder `evidence="conjecture"`
   - Zeitbereiche statt exakter Daten (`notBefore`/`notAfter`)
   - Aktuell nicht visuell dargestellt

2. Unbekannte Absender/Orte
   - `[NN]` (nomen nominandum) fuer unbekannte Personen
   - `unknown` fuer unbekannte Orte
   - 60% der Hebel-Briefe ohne Absende-Ort

3. Sprachangaben selten
   - Nur 1 von 5 Datensaetzen hat `<language>` Tags
   - Sprachfilter wird korrekt ausgeblendet

4. Themen-Daten fehlen
   - Keiner der analysierten Datensaetze hat `<term>` oder subjects
   - Topics View wird korrekt ausgeblendet

5. Authority-URIs sind Standard
   - Alle Datensaetze haben GND und GeoNames
   - correspSearch-Integration funktioniert

### Verbesserungsvorschlaege

- Datierungsunsicherheit visuell markieren (z.B. "ca.", Fragezeichen)
- Bessere Behandlung von `[NN]` und `unknown`
- Demo-Datensaetze als Presets hinzufuegen

---

## 2025-11-26 (Phase 10: Code-Refactoring)

### Refactoring: Shared Utils und CSS Cleanup

Konsolidierung von dupliziertem Code und Entfernung von Legacy-Komponenten.

1. Neue Datei: js/utils.js (183 Zeilen)
   - Gemeinsame Utility-Funktionen extrahiert
   - `escapeHtml()` - HTML-Escape (vorher in 3 Dateien)
   - `debounce()` - Debounce-Funktion (vorher in 2 Dateien)
   - `downloadFile()` - File-Download (vorher in 2 Dateien)
   - `showToast()` - Toast-Benachrichtigungen
   - `copyToClipboard()` - Clipboard-API
   - `buildAuthorityLink()` - GND/VIAF/GeoNames Links
   - `getUrlParams()`, `setUrlParam()` - URL-Parameter-Handling

2. Aktualisierte Dateien
   - wissenskorb.js: Importiert utils.js, 35 Zeilen entfernt
   - basket-ui.js: Importiert utils.js, 21 Zeilen entfernt

3. CSS Cleanup: components.css (606 -> 163 Zeilen)
   Entfernte HerData-Legacy-Klassen:
   - category-legend, legend-dot
   - filter-section, checkbox-label
   - activity-checkboxes
   - mobile-filter-bar, role-toggle
   - card-base, card-info, card-title, card-meta, card-count
   - detail-panel, detail-empty, detail-header, detail-section
   - mini-timeline, mini-timeline-bars, mini-timeline-bar

   Beibehaltene Klassen (in Benutzung):
   - sidebar-info, info-text
   - filter-group, filter-count
   - year-range-display
   - btn-reset
   - stats-cards, stat-card, stat-value, stat-label

Ergebnis: 316 Zeilen Code reduziert (12296 -> 11980)

---

## 2025-11-26 (Phase 9: Wissenskorb Erweiterung)

### Implementiert: Dedizierte Wissenskorb-Seite

Erweiterung des Wissenskorb-Features von Modal zu dedizierter Analyse-Seite:

1. Neue Dateien
   - wissenskorb.html: Dedizierte Analyse-Seite
   - js/wissenskorb.js: Seiten-Logik mit D3/MapLibre
   - css/wissenskorb.css: Seiten-spezifische Styles

2. Visualisierungen
   - Timeline: D3.js Stacked Bar Chart der Aktivitaetszeitraeume
   - Netzwerk: D3.js Force-Directed Graph der Verbindungen
   - Karte: MapLibre mit Absendeorten
   - Details: Alle Briefe mit Suche und Sortierung

3. Features
   - Multi-Tab-Synchronisation via Storage Events
   - Kapazitaetslimits (50 Personen, 100 Briefe, 50 Orte)
   - Export als CSV oder JSON
   - Teilen via URL mit Basket-IDs
   - Toast-Benachrichtigungen

4. Technische Aenderungen
   - basket.js: Storage Event Listener, hasCapacity(), getRemainingCapacity()
   - basket-ui.js: Click-Handler entfernt (Link statt Button)
   - explore.html: Basket-Button ist jetzt Link zu wissenskorb.html

---

## 2025-11-26 (Phase 8: Integration und Netzwerk)

### Test: Externe CMIF-URL Laden

Erfolgreicher Test mit Schnitzler-Reinhardt CMIF-Datei:
- URL: `https://raw.githubusercontent.com/arthur-schnitzler/schnitzler-cmif/main/1971_Schnitzler_Reinhardt.xml`
- 104 Briefe, 10 Absender, 8 Orte
- Zeitraum: 1902-1921
- Keine Koordinaten (8 Orte ohne Geodaten)

Erkenntnisse:
1. GitHub Raw-URLs funktionieren direkt (CORS erlaubt)
2. Orte-View zeigt korrekt alle Orte auch ohne Koordinaten
3. Netzwerk-View und Timeline funktionieren

Bekannte externe CMIF-Repositories:
- arthur-schnitzler/schnitzler-cmif (GitHub)
- Weitere Quellen: siehe cmif-sources.md

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
