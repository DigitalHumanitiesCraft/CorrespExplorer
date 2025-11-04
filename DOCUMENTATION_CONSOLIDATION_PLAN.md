# Documentation Consolidation Plan

Plan zur Integration aller Markdown-Dokumentation in docs/knowledge/ und Beseitigung von Duplikaten und veralteten Inhalten.

Stand: 2025-11-04

## Ziel

Alle .md Dateien müssen in docs/knowledge/ integriert sein. Das knowledge-System soll als zentrale, vollständige Wissensbasis dienen.

## Status Quo

Gefundene Markdown-Dateien: 27
- In docs/knowledge/: 9 Dateien
- Außerhalb: 18 Dateien (müssen konsolidiert werden)

## Kategorisierung der Dateien

### Kategorie A: Direkt nach docs/knowledge/ verschieben

Diese Dateien gehören zur Wissensbasis und sollten direkt verschoben werden:

1. **DEBUG_SYSTEM.md** (Root → docs/knowledge/)
   - Status: NEU (2025-11-04)
   - Inhalt: Dokumentation des Data Provenance Systems
   - Aktion: MOVE to docs/knowledge/debug-system.md
   - Grund: Technische Dokumentation, gehört zur Wissensbasis
   - Update: INDEX.md Link hinzufügen

2. **RESPONSIVE_ANALYSIS.md** (Root → docs/knowledge/)
   - Status: Neu (2025-11-02)
   - Inhalt: Mobile Responsive Design Analyse
   - Aktion: MOVE to docs/knowledge/responsive-design.md
   - Update: INDEX.md Link hinzufügen unter "Design"

3. **archive/planning/hover-network-plan.md** (Archiv → BEHALTEN)
   - Status: Implementiert (2025-10-29)
   - Inhalt: KOMPLETTER 3-Phasen Implementierungsplan (923 Zeilen!)
   - Aktion: BEHALTEN im Archiv (wertvolle Referenz für künftige Features)
   - Grund: Detaillierter Plan mit Code-Beispielen, Timeline, Tests
   - WICHTIG: Nicht löschen - dokumentiert erfolgreichen Implementierungsprozess

4. **archive/debug/CLUSTER_HOVER_DEBUG.md** (Archiv → BEHALTEN)
   - Status: Debug-Log für MapLibre API-Wechsel
   - Inhalt: 8 Lösungsversuche, Root Cause Analysis (172 Zeilen)
   - Aktion: BEHALTEN im Archiv (technisches Wissen)
   - Grund: Dokumentiert wichtiges Debugging (Callback → Promise API)
   - WICHTIG: Wertvoll für künftige MapLibre-Probleme

### Kategorie B: In docs/knowledge/ konsolidieren

Diese Dateien haben Überschneidungen mit bestehenden knowledge-Dateien:

5. **TECHNICAL_ANALYSIS.md** (Root → docs/knowledge/)
   - Status: Exzellent (2025-10-29)
   - Inhalt: Umfassende technische Analyse (1488 Zeilen)
   - Problem: Überschneidung mit technical-architecture.md
   - Aktion: MOVE to docs/knowledge/technical-analysis.md
   - Grund: Detaillierte Analyse, ergänzt technical-architecture.md
   - Update: INDEX.md Link, Querverweise zu technical-architecture.md

6. **REQUIREMENTS_VALIDATION.md** (Root → docs/knowledge/)
   - Status: Exzellent (2025-10-29)
   - Inhalt: Validierung aller Requirements gegen Daten (763 Zeilen)
   - Aktion: MOVE to docs/knowledge/requirements-validation.md
   - Update: INDEX.md Link, Querverweise zu requirements.md

7. **DOCUMENTATION_ASSESSMENT.md** (Root → docs/knowledge/)
   - Status: Gut (2025-11-02)
   - Inhalt: Bewertung aller 21 Markdown-Dateien
   - Aktion: MOVE to docs/knowledge/documentation-assessment.md
   - Grund: Meta-Dokumentation über Dokumentation
   - Update: INDEX.md Link unter "Dokumentation"

### Kategorie C: Als Planungsdokumente konsolidieren

Diese Dateien sind Planungsdokumente und sollten in einen Plan-Ordner:

8. **QUICK_WINS.md** (Root → docs/knowledge/)
   - Status: Gut (2025-11-02)
   - Inhalt: 6 Quick Win Features mit Code-Beispielen
   - Aktion: MOVE to docs/knowledge/implementation-quick-wins.md
   - Update: INDEX.md Link unter "Implementierung"

9. **MOBILE_IMPLEMENTATION_PLAN.md** (Root → docs/knowledge/)
   - Status: Gut (2025-11-02)
   - Inhalt: 4-Stunden-Plan für Mobile Responsive Fixes
   - Aktion: MOVE to docs/knowledge/implementation-mobile.md
   - Update: INDEX.md Link unter "Implementierung"

### Kategorie D: Im Root belassen (Meta-Dokumente)

Diese Dateien sollten im Root bleiben:

10. **README.md** (Root)
    - Status: Exzellent
    - Aktion: KEEP (Haupteinstiegspunkt für Repository)
    - Update: Datum hinzufügen (Last Updated: 2025-11-04)
    - Update: Link zu docs/knowledge/INDEX.md hinzufügen

11. **CLAUDE.md** (Root)
    - Status: Exzellent
    - Aktion: KEEP (Meta-Dokumentation für Claude Code)
    - Update: Keine

12. **JOURNAL.md** (Root) vs **documentation/JOURNAL.md**
    - Status: documentation/JOURNAL.md ist AKTUELLER (856 Zeilen vs 455 Zeilen)
    - Inhalt: documentation/ hat neueste Einträge (2025-11-04 Provenance System)
    - Aktion: REPLACE Root mit documentation/JOURNAL.md
    - Grund: documentation/JOURNAL.md ist das aktuelle Arbeitstagebuch
    - KRITISCH: Root-Version ist veraltet (nur bis 2025-10-29)

### Kategorie E: Duplikate konsolidieren

13. **documentation/JOURNAL.md** vs **JOURNAL.md** (Root)
    - Status: documentation/JOURNAL.md ist NEUER und VOLLSTÄNDIGER
    - Aktion: REPLACE Root JOURNAL.md mit documentation/JOURNAL.md
    - Strategie: `git mv documentation/JOURNAL.md JOURNAL.md` (überschreibt alte Version)
    - Dann: DELETE leeren documentation/ Ordner

14. **docs/README.md** vs **README.md** (Root)
    - Status: Unterschiedlich (docs/README.md ist Frontend-spezifisch)
    - Aktion: KEEP beide
    - Grund: docs/README.md ist Deployment-Dokumentation
    - Update: docs/README.md umbenennen zu docs/DEPLOYMENT.md?
    - Alternativ: In docs/knowledge/ verschieben als deployment.md

### Kategorie F: Als historisch markieren oder löschen

15. **PR_SUMMARY.md** (Root)
    - Status: Pull Request Zusammenfassung (2025-11-02)
    - Aktion: KEEP IM ARCHIV (nicht löschen!)
    - Grund: Dokumentiert wichtigen PR mit Analysen
    - Alternative: MOVE to archive/pr-summaries/2025-11-02-analysis-pr.md
    - WICHTIG: Enthält Zusammenfassung von 4 wichtigen Dokumenten

16. **VAULT_ANALYSIS.md** (Root)
    - Status: Datei existiert NICHT (Glob fand sie nicht)
    - Aktion: KEINE (Datei nicht vorhanden)
    - Hinweis: Wurde in DOCUMENTATION_ASSESSMENT.md referenziert, aber existiert nicht mehr

### Kategorie G: Spezifische Ordner-READMEs

17. **preprocessing/README.md**
    - Status: Unbekannt
    - Aktion: KEEP (Dokumentation für Python-Pipeline)
    - Prüfung: Mit TECHNICAL_ANALYSIS.md abgleichen
    - Optional: Querverweise hinzufügen

18. **docs/css/README.md**
    - Status: Unbekannt
    - Aktion: Prüfen und ggf. KEEP oder DELETE
    - Wenn nur Platzhalter: DELETE
    - Wenn substanziell: KEEP

19. **docs/js/README.md**
    - Status: Unbekannt
    - Aktion: Prüfen und ggf. KEEP oder DELETE

## Migrations-Aktionen (Priorisiert)

### Phase 1: Kritische Moves (Sofort)

1. Move DEBUG_SYSTEM.md → docs/knowledge/debug-system.md
2. Move TECHNICAL_ANALYSIS.md → docs/knowledge/technical-analysis.md
3. Move REQUIREMENTS_VALIDATION.md → docs/knowledge/requirements-validation.md
4. Update docs/knowledge/INDEX.md mit neuen Links

### Phase 2: Konsolidierung (Diese Woche)

5. Move DOCUMENTATION_ASSESSMENT.md → docs/knowledge/documentation-assessment.md
6. Move QUICK_WINS.md → docs/knowledge/implementation-quick-wins.md
7. Move MOBILE_IMPLEMENTATION_PLAN.md → docs/knowledge/implementation-mobile.md
8. Move RESPONSIVE_ANALYSIS.md → docs/knowledge/responsive-design.md
9. Replace Root JOURNAL.md with documentation/JOURNAL.md (aktuellere Version!)
10. Delete leeren documentation/ Ordner

### Phase 3: Optionale Archivierung

11. OPTIONAL: Move PR_SUMMARY.md → archive/pr-summaries/ (oder im Root lassen)
12. Prüfe docs/css/README.md, docs/js/README.md (falls vorhanden)
13. Entscheide über docs/README.md (KEEP als Deployment-Doku oder MOVE?)

WICHTIG: Wir löschen NICHTS aus archive/! Diese Dateien dokumentieren wertvolle Implementierungs- und Debug-Prozesse.

### Phase 4: Updates (Nach Moves)

17. Update docs/knowledge/INDEX.md komplett neu strukturieren
18. Update Root README.md mit "Last Updated: 2025-11-04"
19. Add cross-references zwischen allen knowledge-Dateien
20. Update docs/knowledge/VAULT-REGELN.md falls nötig

## Neue Struktur docs/knowledge/

Nach Konsolidierung:

```
docs/knowledge/
├── INDEX.md                        # Map of Content (UPDATED)
├── VAULT-REGELN.md                 # Strukturprinzipien
│
├── Projekt
│   ├── project.md                  # Projektziele
│   └── research-context.md         # Wissenschaftlicher Kontext
│
├── Daten
│   ├── data.md                     # Datenmodell
│   └── data-provenance-map.json    # Provenance Mapping
│
├── Design
│   ├── design.md                   # UI/UX System
│   └── responsive-design.md        # NEU: Mobile Design Analyse
│
├── Requirements
│   ├── requirements.md             # User Stories
│   └── requirements-validation.md  # NEU: Validierung gegen Daten
│
├── Technische Architektur
│   ├── technical-architecture.md   # Frontend Details
│   ├── technical-analysis.md       # NEU: Gesamtanalyse
│   └── debug-system.md             # NEU: Provenance System
│
├── Entscheidungen
│   └── decisions.md                # ADRs
│
├── Netzwerk
│   └── network-relations.md        # AGRELON-Relationen
│
├── Implementierung
│   ├── implementation-quick-wins.md   # NEU: 6 Quick Win Features
│   └── implementation-mobile.md       # NEU: Mobile Responsive Plan
│
└── Dokumentation (Meta)
    ├── documentation-assessment.md    # NEU: Dokumentations-Review
    └── vault-analysis.md              # Optional: Vault-Analyse
```

## INDEX.md Update

Neue Struktur für INDEX.md:

```markdown
# HerData Knowledge Vault - Map of Content

Stand: 2025-11-04

## Projekt

[project.md](project.md) - Projektziel, Datenquellen, Implementierungsstatus
[research-context.md](research-context.md) - Wissenschaftlicher Kontext

## Daten

[data.md](data.md) - Datenmodell, Strukturen, Verknüpfungen
[debug-system.md](debug-system.md) - Data Provenance System

## Design

[design.md](design.md) - UI/UX-System
[responsive-design.md](responsive-design.md) - Mobile Responsive Design Analyse

## Requirements

[requirements.md](requirements.md) - User Stories, funktionale Anforderungen
[requirements-validation.md](requirements-validation.md) - Validierung gegen tatsächliche Daten

## Technische Architektur

[technical-architecture.md](technical-architecture.md) - Frontend-Implementierung Details
[technical-analysis.md](technical-analysis.md) - Umfassende technische Analyse (Python + JavaScript)

## Entscheidungen

[decisions.md](decisions.md) - Architecture Decision Records (ADRs)

## Netzwerk

[network-relations.md](network-relations.md) - AGRELON-Beziehungen und Netzwerk-Visualisierung

## Implementierung

[implementation-quick-wins.md](implementation-quick-wins.md) - 6 Quick Win Features mit Code
[implementation-mobile.md](implementation-mobile.md) - Mobile Responsive Implementation Plan

## Dokumentation

[documentation-assessment.md](documentation-assessment.md) - Review aller Markdown-Dateien

## Externe Verweise

- Live Demo: https://chpollin.github.io/HerData/
- Repository: https://github.com/chpollin/HerData
- Hauptdokumentation: [../../README.md](../../README.md)
- Entwicklungsjournal: [../../JOURNAL.md](../../JOURNAL.md)
```

## Commit-Strategie

Einzelne Commits für bessere Nachvollziehbarkeit:

### Commit 1: Move new analysis documents
```bash
git mv DEBUG_SYSTEM.md docs/knowledge/debug-system.md
git mv TECHNICAL_ANALYSIS.md docs/knowledge/technical-analysis.md
git mv REQUIREMENTS_VALIDATION.md docs/knowledge/requirements-validation.md
git commit -m "Move analysis documents to knowledge vault

- Move DEBUG_SYSTEM.md to docs/knowledge/debug-system.md
- Move TECHNICAL_ANALYSIS.md to docs/knowledge/technical-analysis.md
- Move REQUIREMENTS_VALIDATION.md to docs/knowledge/requirements-validation.md

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Commit 2: Move planning documents
```bash
git mv DOCUMENTATION_ASSESSMENT.md docs/knowledge/documentation-assessment.md
git mv QUICK_WINS.md docs/knowledge/implementation-quick-wins.md
git mv MOBILE_IMPLEMENTATION_PLAN.md docs/knowledge/implementation-mobile.md
git mv RESPONSIVE_ANALYSIS.md docs/knowledge/responsive-design.md
git commit -m "Move planning documents to knowledge vault

- Move planning and assessment documents
- Consolidate implementation guides
- Add responsive design documentation

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Commit 3: Update JOURNAL.md to latest version
```bash
# Replace old JOURNAL.md with current version from documentation/
git rm JOURNAL.md
git mv documentation/JOURNAL.md JOURNAL.md
rmdir documentation
git commit -m "Update JOURNAL.md to latest version

- Replace outdated root JOURNAL.md (455 lines, until 2025-10-29)
- Use current documentation/JOURNAL.md (856 lines, until 2025-11-04)
- Includes latest session: Data Provenance System Implementation
- Remove empty documentation/ directory

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Commit 4: Archive PR summary (OPTIONAL)
```bash
# OPTIONAL: Nur wenn wir PR_SUMMARY.md archivieren wollen
mkdir -p archive/pr-summaries
git mv PR_SUMMARY.md archive/pr-summaries/2025-11-02-analysis-pr.md
git commit -m "Archive PR summary for documentation

- Move PR_SUMMARY.md to archive for historical reference
- Preserves important analysis documentation

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

HINWEIS: Commit 4 ist OPTIONAL. Wir können PR_SUMMARY.md auch im Root lassen.

### Commit 5: Update INDEX.md and README.md (oder Commit 4 wenn Commit 4 übersprungen)
```bash
# Edit docs/knowledge/INDEX.md
# Edit README.md
git add docs/knowledge/INDEX.md README.md
git commit -m "Update documentation navigation and timestamps

- Restructure docs/knowledge/INDEX.md with new documents
- Add Last Updated timestamp to README.md
- Add cross-references between knowledge documents

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Validierung nach Migration

Checkliste:

- [ ] Alle 27 .md Dateien kategorisiert
- [ ] Kritische Dateien nach docs/knowledge/ verschoben
- [ ] Duplikate konsolidiert (JOURNAL.md)
- [ ] Obsolete Dateien gelöscht
- [ ] docs/knowledge/INDEX.md aktualisiert
- [ ] README.md mit Datum versehen
- [ ] Alle Links in INDEX.md funktionieren
- [ ] Cross-references hinzugefügt
- [ ] Git History sauber (einzelne Commits)
- [ ] Keine broken links

## Erwartetes Ergebnis

Nach Abschluss:

In docs/knowledge/:
- 17 Dateien (vorher 9, +8 neue)
- Vollständige Navigation via INDEX.md
- Alle technischen Analysen integriert
- Alle Planungsdokumente integriert
- Meta-Dokumentation vorhanden

Im Root:
- README.md (Haupteinstieg)
- CLAUDE.md (Meta-Regeln)
- JOURNAL.md (Entwicklungslog)
- Keine verstreuten Analyse-Dokumente mehr

Gelöscht:
- documentation/ Ordner (nach Merge von JOURNAL.md)
- NICHTS aus archive/ (alle Dateien bleiben als Referenz!)

Archiviert (optional):
- PR_SUMMARY.md → archive/pr-summaries/ (oder im Root belassen)

## Zeitaufwand

Geschätzt:
- Phase 1 (Kritische Moves): 30 min
- Phase 2 (Konsolidierung): 45 min
- Phase 3 (Aufräumen): 30 min
- Phase 4 (Updates): 45 min
- Validierung: 30 min

Gesamt: 3 Stunden

## Risiken

Gering:
- Git move erhält History
- Keine Code-Änderungen
- Nur Dokumentations-Reorganisation

Mögliche Probleme:
- Broken links nach Move (manuell prüfen)
- INDEX.md Struktur komplex (Schritt für Schritt)
- JOURNAL.md Merge könnte Duplikate haben (manuell prüfen)

Mitigation:
- Jeden Commit einzeln testen
- Links nach jedem Move validieren
- Backup vor Beginn erstellen
