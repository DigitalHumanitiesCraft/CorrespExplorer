# Known Issues and Inconsistencies

Stand: 2025-12-18

Alle dokumentierten Issues wurden behoben.

---

## Behobene Issues (Archiv)

### 1. PRIMARY_COLOR Inkonsistenz
- Behoben in: Phase 33 / 2025-12-18
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
- Behoben in: Phase 31 / 2025-12-09
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
