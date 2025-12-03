# Known Issues and Inconsistencies

Dokumentierte Widersprüche in Konfiguration und Dokumentation, die in zukünftigen Phasen behoben werden sollten.

Quelle: project-analysis.md Section 7 (2025-11-27)

---

## 1. PRIMARY_COLOR Inkonsistenz

Status: Offen
Schweregrad: Mittel
Auswirkung: Visuelle Abweichungen zwischen Komponenten

Problem:
- tokens.css: #A64B3F (Rust Red, Logo-abgeleitet)
- explore.js: #C65D3B (helleres Rot, hardcodiert)

Betroffene Komponenten:
- D3-Visualisierungen in explore.js (Timeline, Network)
- Global definierte Primary Color in tokens.css

Empfehlung: explore.js auf tokens.css PRIMARY_COLOR angleichen

---

## 2. Spacing-Unterschied

Status: Offen
Schweregrad: Niedrig
Auswirkung: 4px Differenz meist nicht sichtbar

Problem:
- design.md: Spacing-Skala mit 16px Base
- tokens.css: Spacing-Skala mit 12px Base (var(--space-md))

Empfehlung: tokens.css als kanonische Quelle verwenden

---

## 3. Font-Stack Unterschiede

Status: Offen
Schweregrad: Niedrig
Auswirkung: Minimal durch Fallback-Fonts

Problem:
- design.md: 'Inter' als Sans, 'JetBrains Mono' als Mono
- tokens.css: 'Lato', 'Inter' als Sans, 'Merriweather' für Headings, kein Mono definiert

Empfehlung: tokens.css erweitern um --font-mono oder aus design.md entfernen

---

## 4. Sidebar-Breite

Status: Offen
Schweregrad: Mittel
Auswirkung: Inkonsistentes Layout auf verschiedenen Seiten

Problem:
- tokens.css: 380px (var(--sidebar-width))
- design.md: 280px (>= 768px), 320px (>= 1280px)
- wissenskorb.css: 280px hardcodiert
- style.css Zeile 577, 713: 280px hardcodiert

Empfehlung: CSS-Variable konsistent nutzen, Responsive-Werte in tokens.css definieren

---

## 5. Breakpoints

Status: Offen
Schweregrad: Niedrig
Auswirkung: Unterschiedliche Responsive-Schwellwerte

Problem:
- design.md: sm = 640px
- tokens.css: sm = 480px (--breakpoint-sm)

Empfehlung: tokens.css als kanonische Quelle verwenden, design.md aktualisieren

---

## 6. VIEWS-Konstante unvollständig

Status: Offen
Schweregrad: Niedrig
Auswirkung: Code funktioniert (String-Literal verwendet), aber inkonsistent

Problem:
- constants.js definiert 6 Views (MAP, PERSONS, LETTERS, TIMELINE, TOPICS, PLACES)
- Fehlt: NETWORK und MENTIONS_FLOW (existieren in explore.html und explore.js)

Beleg:
- constants.js Zeile 72-79: nur 6 Views
- architecture.md: listet 8 Views
- explore.html: Buttons für network und mentions-flow vorhanden

Empfehlung: VIEWS-Konstante um NETWORK und MENTIONS_FLOW ergänzen

---

## 7. Veraltete Dokumentation in README

Status: Offen
Schweregrad: Niedrig
Auswirkung: Irreführend für Entwickler

Problem:
- README.md listet refactoring-plan.md in docs/knowledge/
- Datei wurde in Phase 14 gelöscht (JOURNAL.md)

Beleg:
- JOURNAL.md Phase 14: "Gelöscht: refactoring-plan.md (veraltet, nie umgesetzt)"
- Glob-Suche: Datei existiert nicht

Empfehlung: README.md Dateistruktur aktualisieren

---

## Priorisierung

Empfohlene Bearbeitungsreihenfolge:

1. **HIGH**: PRIMARY_COLOR in explore.js angleichen (visuelle Konsistenz)
2. **HIGH**: Sidebar-Breite konsolidieren (Layout-Konsistenz)
3. **MEDIUM**: VIEWS-Konstante ergänzen (Code-Qualität)
4. **MEDIUM**: README.md aktualisieren (Dokumentation)
5. **LOW**: design.md mit tokens.css synchronisieren (Referenz-Genauigkeit)
6. **LOW**: Breakpoints und Spacing vereinheitlichen (Edge-Cases)

---

## Tracking

Für jedes Issue sollte bei Behebung notiert werden:
- Behoben in: Phase X / Commit Hash
- Datum: YYYY-MM-DD
- Geänderte Dateien: Liste

Beispiel:
```
## 1. PRIMARY_COLOR Inkonsistenz

Status: BEHOBEN
Behoben in: Phase 28 / Commit abc123
Datum: 2025-01-15
Geänderte Dateien: explore.js (Zeile 42), constants.js (neue Konstante)
```
