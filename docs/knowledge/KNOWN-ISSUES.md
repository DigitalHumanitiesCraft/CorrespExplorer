# Known Issues and Inconsistencies

Stand: 2026-10-02

---

## 6. Personenfilter ohne Authority-ID liefert keine Briefe

Status: Offen
Schweregrad: Mittel
Auswirkung: Klick auf Personen ohne ID (Karte, Liste, Dialog) filtert auf null Briefe

Problem:
- explore.js verwendet als Personenschluessel id oder Name
- state-manager.js vergleicht im Personenfilter nur sender.id und recipient.id

Empfehlung: Im state-manager wie in explore.js auf id oder Name vergleichen

## 7. Karten-Bedienelemente verdeckt

Status: Offen
Schweregrad: Niedrig
Auswirkung: Layer-Wechsel und Farbmodus-Schalter der Karte liegen unter der Navigationsleiste und sind nicht anklickbar

Problem:
- .map-controls ist absolut positioniert, der Bezugsrahmen liegt oberhalb der Kartenansicht

Empfehlung: #map-view als Bezugsrahmen (position: relative) setzen und pruefen

---

## Behobene Issues (Archiv)

### Review-Befunde Oktober 2026
- Behoben in: Phase 40 / 2026-10-02
- Problem: XSS ueber CMIF- und JSON-Werte, ?json= von fremden Quellen, Absturz bei Personen- und Themenfilter, Inline-onclick mit Datenwerten, CARTO-Basiskarte ohne Key, unklarer parseCMIF-Eingabevertrag, fehlender Tastaturzugang
- Loesung: siehe JOURNAL.md, Phase 40

### 1. PRIMARY_COLOR Inkonsistenz
- Behoben in: Commit dbda53f / 2025-11-27 (bis zur Archivierung am 2025-12-18 hier weiter als offen gefuehrt)
- Problem: explore.js verwendete #C65D3B statt #A64B3F
- Loesung: explore.js verwendet nun korrekt #A64B3F

### 2. Sidebar-Breite
- Behoben in: Phase 31 / 2025-12-09
- Problem: Hardcodierte Werte statt CSS-Variable
- Loesung: style.css verwendet calc(-1 * var(--sidebar-width))

### 3. VIEWS-Konstante
- Behoben in: Phase 31 / 2025-12-09
- Problem: NETWORK und MENTIONS_FLOW fehlten
- Loesung: constants.js ergaenzt

### 4. README.md Referenz
- Behoben in: Commit dbda53f / 2025-11-27
- Problem: Verweis auf geloeschte refactoring-plan.md
- Loesung: README.md aktualisiert

### 5. Design-Dokumentation
- Behoben in: Phase 33 / 2025-12-18
- Problem: Spacing/Breakpoints/Fonts in design.md veraltet
- Loesung: design.md ist nun synchron mit tokens.css

---

## Tracking-Format

Bei neuen Issues:
```
## X. Issue-Titel

Status: Offen
Schweregrad: Hoch/Mittel/Niedrig
Auswirkung: Beschreibung

Problem:
- Detail 1
- Detail 2

Empfehlung: Loesung
```
