# Design Decisions and Learnings

Dokumentation der wichtigsten Entscheidungen mit Rationale. Erklärt WARUM bestimmte Lösungen gewählt wurden.

Stand: 2025-12-18

---

## 1. CMIF-Parsing Strategie

### Authority-IDs als Golden Key

CMIF-Daten enthalten sowohl Authority-URIs (@ref Attribut) als auch Anzeigenamen (Textinhalt). Das ref-Attribut ist der primäre Identifikator für Matching und Vergleiche. Anzeigenamen können zwischen Editionen variieren und dienen nur der Darstellung.

Rationale: Verschiedene Editionen schreiben denselben Namen unterschiedlich (Goethe vs. von Goethe vs. Goethe, Johann Wolfgang). Authority-URIs wie GND oder VIAF sind eindeutig und ermöglichen korrekte Aggregation.

Unterstützte Authority-Systeme: VIAF, GND, LC, BNF, GeoNames, Lexvo

Implementation: parseAuthorityRef() in cmif-parser.js extrahiert Typ und ID aus URLs via Pattern-Matching

---

## 2. Visualisierung von Unsicherheit

### Detached Bin Pattern für Undatierte Briefe

Briefe ohne Datum werden in einem separaten Balken rechts der Timeline dargestellt statt in die Zeitachse integriert.

Rationale: Undatierte Briefe würden die Zeitachse verzerren wenn sie einem Platzhalter-Jahr zugeordnet werden. Separate Darstellung macht Datenqualität transparent und verhindert falsche Interpretationen.

Vorteile:
- Klare visuelle Trennung zwischen datiert und undatiert
- Click-Interaktion filtert auf undatierte Briefe
- Schematischer Platzhalter (gestrichelte Box mit Checkmark) wenn alle Briefe datiert

Implementation: Timeline-View prüft datePrecision und gruppiert unknown-Briefe separat

### Konsistente Unsicherheits-Indikatoren

Farb- und Icon-System für Datenqualität:
- Exakt (Tag/Monat/Jahr): Keine Markierung (kein visuelles Rauschen bei guten Daten)
- Unvollständig (nur Jahr): Amber mit Kalender-Icon
- Zeitraum (notBefore/notAfter): Blau mit Doppelpfeil
- Unsicher (cert=low): Rot mit Fragezeichen
- Unbekannt: Grau mit Fragezeichen

Prinzip: Gute Daten erhalten keine Markierung. Nur Unsicherheiten werden hervorgehoben.

Implementation: formatters.js gibt CSS-Klassen basierend auf datePrecision zurück

---

## 3. Stacked Bar Charts für Sprach-Breakdown

### Dynamische Farbzuweisung

Problem: Bei Korpora mit vielen Sprachen werden Stacked Bars unleserlich durch zu viele kräftige Farben.

Lösung: Dominante Sprache (meiste Briefe) erhält kräftige Farbe, alle anderen Sprachen bekommen Pastelltöne. Dies fokussiert Aufmerksamkeit auf Hauptsprache ohne sekundäre Sprachen zu verstecken.

Implementation: computeLanguageColors() in constants.js sortiert Sprachen nach Häufigkeit und weist Farben zu

### Einfarbige Balken bei fehlenden Sprachdaten

Wenn Korpus keine language-Metadaten enthält: Einfarbige Balken (color-primary) statt Stacking, Legende zeigt "Keine Sprachdaten im Korpus".

Rationale: Gestackte Balken mit nur einer Kategorie wären irreführend. Einfarbige Darstellung kommuniziert ehrlich dass Sprachdaten nicht vorhanden sind.

Detection: hasLanguageData prüft ob mindestens ein Brief language.code hat

---

## 4. Performance-Strategien

Entscheidungen für clientseitige Verarbeitung großer Datensätze:

1. Lazy Rendering: Listen nur rendern wenn View aktiv (verhindert DOM-Overhead)
2. Debouncing: Filter-Updates mit 300ms Verzögerung (reduziert Re-Renders)
3. Clustering: MapLibre-Cluster ab 100+ Punkten (reduziert DOM-Elemente)
4. Limits: Brief-Liste auf 500 Einträge begrenzt mit Warning (DOM-Performance)
5. Index-Lookups: O(1) Zugriff auf Personen/Orte via Map-basierte Indices

Rationale: Bei 11.576 Briefen ist naives Rendering zu langsam. Diese Strategien halten App unter 200ms Render-Zeit auch bei großen Datasets.

---

## 5. Technische Patterns

### ES Module Live Bindings

ES Module Exports sind live bindings - Reassignment funktioniert nicht, Object-Mutation schon.

Problem: export let COLORS = {}; COLORS = {...} wirft Error
Lösung: export const COLORS = {}; dann Object.keys(COLORS).forEach(k => delete COLORS[k]) und neu befüllen

Rationale: Dynamische Farben basierend auf Korpus erfordern Mutation nach Import. Const mit Mutation ist idiomatischer als let mit Reassignment.

Implementation: computeLanguageColors() mutiert LANGUAGE_COLORS Object

### URL-State-Management

Filter-Zustand wird in URL gespeichert: explore.html?dataset=hsa&yearMin=1900&yearMax=1920&person=123&langs=de,fr

Vorteile:
- Bookmarking: Nutzer können gefilterte Ansicht speichern
- Sharing: URLs können an Kollegen gesendet werden
- Browser-History: Back-Button funktioniert erwartungsgemäß

Implementation: state-manager.js mit toURLParams() und fromURLParams(), replaceState statt pushState um History nicht zu überladen

### Hybrides Speichermodell

Große Datasets (HSA): Via URL-Parameter laden (?dataset=hsa), fetch von JSON
Kleinere Datasets (Upload): sessionStorage (bis ca. 5MB)
Quota exceeded: Fehlermeldung mit Hinweis auf Größe

Rationale: sessionStorage-Limit variiert nach Browser (5-10MB). HSA mit 11.576 Briefen ist zu groß. URL-Parameter umgehen dieses Limit komplett.

---

## 6. Netzwerk-Visualisierung

### Adaptive Defaults basierend auf Datensatz

Network-View passt minYears-Threshold an Zeitspanne an:
- Zeitspanne <= 5 Jahre: minYears = 1
- Zeitspanne <= 20 Jahre: minYears = 2
- Zeitspanne > 20 Jahre: minYears = 3

Rationale: Kurze Zeiträume haben weniger Korrespondenz-Beziehungen. Niedriger Threshold zeigt mehr Verbindungen. Längere Zeiträume brauchen höheren Threshold um Netzwerk lesbar zu halten.

### Jahr-Validierung

Unrealistische Jahre werden gefiltert (< 1400 oder > 2100) um Zeitachse nicht zu verzerren.

Rationale: OCR-Fehler oder Parsing-Issues können zu Jahren wie 0, 9999 oder 20250 führen. Diese würden Timeline-Skalierung zerstören.

### Farbe nach Eintrittsjahr

Alternative Farbgebung: Sequentielle Skala (YlGnBu) basierend auf erstem Brief-Jahr jedes Korrespondenten.

Nutzen: Visualisiert Netzwerk-Evolution, identifiziert frühe vs. späte Teilnehmer, zeigt zeitliche Entwicklung des Netzwerks.

Implementation: D3 scaleSequential mit interpolateYlGnBu, Gradient-Legende zeigt Jahresbereich

---

## 7. Architektur-Entscheidungen

### Zero-Build-Prozess

Projekt läuft direkt im Browser ohne Webpack, Babel oder andere Build-Tools.

Vorteile:
- Niedrige Einstiegshürde für Beitragende
- Einfaches Deployment als statische GitHub Pages
- Keine Build-Pipeline-Komplexität
- Schnellere Iteration im Development

Nachteile:
- Kein Tree-Shaking
- Kein Minification (aber HTTP/2 kompensiert teilweise)
- ES6 Modul-Support erforderlich (IE11 nicht unterstützt)

Entscheidung: Vorteile überwiegen für Academic-Open-Source-Projekt. Zielgruppe hat moderne Browser.

### Monolithisches explore.js

explore.js enthaelt alle Views in einer grossen Datei statt separater View-Module.

Rationale (initial): Views teilen viel State (filteredLetters, indices, temporalFilter). Separate Dateien wuerden komplexes Import-Geflecht erzeugen.

Status: Phase 1 Refactoring fuehrte state-manager.js ein. Weitere Modularisierung geplant aber noch nicht umgesetzt.

Lesson Learned: Fruehes Refactoring waere einfacher gewesen. Monolith ist nach vielen Phasen schwerer aufzubrechen.

---

## 8. UX-Prinzipien

### Ehrliche Kommunikation

Unsicherheit wird transparent dargestellt, nie versteckt. Fehlende Daten werden explizit als "unbekannt" markiert. Tooltips erklären Bedeutung von Symbolen.

Rationale: Forschende brauchen Transparenz über Datenqualität um korrekte Schlüsse zu ziehen. Verschweigen von Unsicherheit führt zu Fehlinterpretationen.

### Progressive Disclosure

Übersicht zuerst, Details bei Bedarf. Click auf Element zeigt mehr Information. Modal/Panel für vollständige Metadaten.

Rationale: Bei 11.576 Briefen würde Anzeige aller Details gleichzeitig zu Cognitive Overload führen. Schrittweise Vertiefung hält Interface übersichtlich.

### Redundanz-Vermeidung

Keine doppelten Informationen in verschiedenen Views. Filter-State wird zentral verwaltet. Indices werden einmal berechnet und wiederverwendet.

Rationale: Redundanz führt zu Inkonsistenzen. Single Source of Truth Prinzip verhindert Synchronisations-Bugs.

---

## 9. Forschungspfade - Methodische Navigation

### Epistemische Kategorisierung

Forschungsfragen werden in vier Kategorien eingeteilt basierend auf der Art der benoetigten Erkenntnis:

1. Deskriptiv: Direkt aus Daten ablesbar (Zahlen, Fakten)
2. Analytisch: Erfordert Berechnung/Aggregation
3. Interpretativ: Erfordert Kontext und Interpretation
4. Nicht beantwortbar: Fehlende Daten verhindern Antwort

Rationale: Diese Kategorisierung macht den epistemischen Status einer Frage explizit. Nutzer wissen sofort, welche Art von Antwort sie erwarten koennen.

Implementation: analyzeResearchQuestions() kategorisiert Fragen basierend auf Datenverfuegbarkeit

### Multi-Step Forschungspfade

Jede Frage zeigt einen Pfad durch mehrere Views mit konkreten Aktionen:

Struktur pro Schritt:
- view: Ziel-View zum Navigieren
- label: Kurzbeschreibung des Schritts
- action: Konkrete Taetigkeit im View

Rationale: Forschung ist selten linear. Pfade zeigen dass Fragen oft mehrere Views erfordern und geben methodische Anleitung.

UI-Entscheidung: Aktionen werden unter dem Label angezeigt, nicht im Tooltip. Tooltips erfordern Hover und verstecken kritische Information.

### Nicht-wertende Sprache fuer Partner-Daten

"Anreicherungspotential" statt "Datenqualitaet" oder "Datenabdeckung".

Rationale: CMIF-Daten stammen oft von Forschungspartnern. "Qualitaet" impliziert Bewertung deren Arbeit. "Anreicherungspotential" fokussiert auf zukuenftige Moeglichkeiten statt auf Defizite.

Lesson Learned: UI-Sprache muss diplomatisch sein wenn Daten von externen Quellen kommen.

### Sichtbarkeit von UI-Elementen

Pfad-Nummern: Akzentfarbe statt neutrales Grau

Problem: Weisse Zahlen auf hellem Hintergrund waren unsichtbar.
Loesung: Background auf var(--color-accent) gesetzt.

Rationale: Nummerierung ist kritisch fuer Pfad-Verstaendnis. Wichtige Elemente brauchen starken Kontrast.

### Parser-Datenstrukturen

Erkenntnisse aus der Forschungspfade-Implementation:

1. Personen:
   - letter_count enthaelt Gesamtzahl (as_sender + as_recipient)
   - letters_sent existiert nicht im Parser

2. Subjects:
   - Parser verwendet label-Property, nicht name
   - Fallback: s.label || s.name

3. Sprachen:
   - CMIF speichert URLs als Sprachcodes (z.B. http://lexvo.org/id/iso639-3/deu)
   - LANGUAGE_LABELS mappt URLs zu lesbaren Labels

Lesson Learned: Parser-Dokumentation vor Verwendung pruefen. Annahmen ueber Datenstrukturen oft falsch.

---

## Referenzen

Für technische Implementation siehe:
- architecture.md - Systemarchitektur und Datenfluss
- uncertainty-concept.md - Detaillierte Unsicherheits-Implementierung
- TESTING-STRATEGY.md - Test-Philosophie mit Real Data

Für historischen Kontext siehe:
- JOURNAL.md - Chronologisches Entwicklungsprotokoll
- user-stories.md - Anforderungen und Features
