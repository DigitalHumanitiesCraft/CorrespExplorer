# Knowledge Vault Context Map

Übersicht der 12 Dokumentationsdateien mit Zweck, Beziehungen und Nutzungsrichtlinien.

Stand: 2025-12-03

---

## Dokumenten-Kategorien

### Specifications (Fundament)

#### cmif-standard.md
- Zweck: TEI-basierte CMIF Format Spezifikation
- Zielgruppe: Entwickler (Parser), Forscher (Datenstruktur)
- Änderungsrate: Nie (externer Standard)
- Abhängigkeiten: Keine (Quelle für alle)
- Nutzen: XML-Struktur, Authority-Systeme, Parsing-Regeln

#### VAULT-RULES.md
- Zweck: Dokumentationsstandards für knowledge/ Ordner
- Zielgruppe: Dokumentations-Autoren, Contributors, Claude
- Änderungsrate: Selten (Standards stabil)
- Abhängigkeiten: Keine (Meta-Dokument)
- Nutzen: Schreibrichtlinien, verbotene Elemente, bevorzugte Formatierung

#### uncertainty-concept.md
- Zweck: Spezifikation für Unsicherheits-Handling in Parsing und UI
- Zielgruppe: Entwickler (Implementation), Forscher (Interpretation)
- Änderungsrate: Selten (stabile Spec)
- Abhängigkeiten: cmif-standard.md, demo-datasets.md
- Nutzen: 22 Test-Cases, Display-Patterns, Präzisions-Kategorien

### System (Architektur & Design)

#### architecture.md
- Zweck: Vollständige System-Übersicht und Komponenten-Referenz
- Zielgruppe: Entwickler, Claude
- Änderungsrate: Selten (nur bei Architektur-Änderungen)
- Abhängigkeiten: Referenziert von allen Development-Tasks
- Nutzen: 26 Module, 8 Views, 4 Datenflüsse, Performance-Limits

#### design.md
- Zweck: UI/UX Spezifikation mit visueller Sprache und Patterns
- Zielgruppe: Designer, Frontend-Entwickler
- Änderungsrate: Selten (Design-System stabil)
- Abhängigkeiten: tokens.css (kanonische Quelle)
- Nutzen: Farbpalette, Typografie, Komponenten-Specs, Unsicherheits-Icons

#### learnings.md
- Zweck: Erklärt WARUM Entscheidungen getroffen wurden (Rationale)
- Zielgruppe: Entwickler (Decision Framework), neue Contributors
- Änderungsrate: Selten (nur bei neuen Major Decisions)
- Abhängigkeiten: architecture.md, uncertainty-concept.md
- Nutzen: Authority-IDs als Golden Key, Detached Bin Pattern, Performance-Strategien

### Operational (Ausführung)

#### testing.md
- Zweck: Test-Philosophie und Execution-Strategy
- Zielgruppe: Entwickler (Test-Writing), QA
- Änderungsrate: Oft (Test-Coverage erweitert sich)
- Abhängigkeiten: architecture.md, demo-datasets.md
- Nutzen: Real Data Only Rule, 74+ Tests, Test-Pyramid, Best Practices

#### journal.md
- Zweck: Chronologisches Development-Log mit Decisions und Commits
- Zielgruppe: Entwickler (Evolution verstehen), Claude (Context)
- Änderungsrate: Kontinuierlich (nach jeder Phase)
- Abhängigkeiten: Alle technischen Dateien
- Nutzen: 27 Phasen dokumentiert, Architectural Decisions E1-E11

#### KNOWN-ISSUES.md
- Zweck: Registry von dokumentierten Inkonsistenzen mit Priorisierung
- Zielgruppe: Entwickler (Cleanup), Project Managers
- Änderungsrate: Oft (Issues discovered/fixed)
- Abhängigkeiten: architecture.md, design.md, tokens.css
- Nutzen: 7 Issues ranked, Fix-Reihenfolge, Tracking-Template

### Reference (Discovery)

#### user-stories.md
- Zweck: Requirements-Spec mit 27 implementierten Features
- Zielgruppe: Project Managers, Entwickler (Scope), Forscher
- Änderungsrate: Selten (Core Stories stabil)
- Abhängigkeiten: architecture.md (beschreibt Implementations)
- Nutzen: 27/27 Stories complete, Acceptance Criteria, 9 Kategorien

#### demo-datasets.md
- Zweck: Analyse von 6 Test-CMIF-Datasets mit Coverage-Matrix
- Zielgruppe: Entwickler (Testing), Forscher (Dataset-Auswahl)
- Änderungsrate: Selten (bei neuen Datasets)
- Abhängigkeiten: cmif-standard.md, uncertainty-concept.md
- Nutzen: test-uncertainty.xml mit 22 Cases, Performance-Testing mit Rollett

#### cmif-sources.md
- Zweck: Katalog externer CMIF-Repositories mit URLs
- Zielgruppe: Forscher, Entwickler (Data Loading)
- Änderungsrate: Oft (neue Quellen entdeckt)
- Abhängigkeiten: cmif-standard.md
- Nutzen: 85+ Files in csStorage, correspSearch API v2.0, GitHub Raw URLs

---

## Nutzungs-Workflows

### Bei Code-Änderungen

1. Lese architecture.md (System verstehen)
2. Prüfe learnings.md (Design-Rationale)
3. Reviewe uncertainty-concept.md (bei Daten-Handling)
4. Konsultiere testing.md (Test-Coverage)
5. Update journal.md (Entscheidung dokumentieren)

### Bei neuen Features

1. Definiere in user-stories.md
2. Design in design.md (wenn visuell)
3. Plan Implementation in journal.md
4. Add Tests per testing.md Scope
5. Dokumentiere in architecture.md

### Bei Bug-Fixes

1. Checke KNOWN-ISSUES.md (bekannte Probleme)
2. Review learnings.md (Decision Rationale)
3. Add Regression-Test per testing.md
4. Update journal.md mit Fix-Details

### Bei Daten-Fragen

1. cmif-standard.md für Format-Spec
2. uncertainty-concept.md für Unsicherheits-Handling
3. demo-datasets.md für Test-Cases
4. cmif-sources.md für externe Quellen

---

## Dokumenten-Matrix

| Datei | Typ | Stabilität | Änderungsrate | Zuletzt |
|-------|-----|------------|---------------|---------|
| architecture.md | Architektur | Niedrig | Selten | 2025-12 |
| cmif-sources.md | Referenz | Hoch | Oft | 2025-12 |
| cmif-standard.md | Spezifikation | Sehr hoch | Nie | - |
| demo-datasets.md | Referenz | Mittel | Selten | 2025-11 |
| design.md | Spezifikation | Hoch | Selten | 2025-11 |
| journal.md | Historie | Niedrig | Kontinuierlich | 2025-12 |
| KNOWN-ISSUES.md | Wartung | Niedrig | Oft | 2025-12 |
| learnings.md | Konzept | Hoch | Selten | 2025-12 |
| testing.md | Prozess | Mittel | Oft | 2025-12 |
| uncertainty-concept.md | Spezifikation | Sehr hoch | Selten | 2025-11 |
| user-stories.md | Requirements | Sehr hoch | Selten | 2025-11 |
| VAULT-RULES.md | Governance | Sehr hoch | Selten | 2025-11 |

---

## Beziehungs-Graph

### Fundament-Layer
cmif-standard.md → uncertainty-concept.md → architecture.md
VAULT-RULES.md → Alle Docs (Style-Compliance)

### Architektur-Layer
architecture.md ← Alle Development-Tasks
design.md ← CSS-Entwicklung
learnings.md ← Decision-Framework

### Operations-Layer
testing.md ← Test-Writing
journal.md ← Phase-Tracking
KNOWN-ISSUES.md ← Maintenance

### Discovery-Layer
user-stories.md → Feature-Planning
demo-datasets.md → Testing
cmif-sources.md → Data-Loading

---

## Kritische Pfade

### Für Claude Context
1. architecture.md - System-Übersicht
2. learnings.md - Decision Rationale
3. journal.md - Letzte Phasen
4. KNOWN-ISSUES.md - Aktuelle Probleme

### Für neue Entwickler
1. user-stories.md - Was kann die App
2. architecture.md - Wie ist sie gebaut
3. design.md - Wie sieht sie aus
4. testing.md - Wie wird getestet

### Für Forscher
1. user-stories.md - Feature-Übersicht
2. cmif-sources.md - Daten-Quellen
3. demo-datasets.md - Test-Daten
4. cmif-standard.md - Format-Verständnis

---

## Wartungs-Richtlinien

### Bei jedem Commit
- journal.md aktualisieren mit Phase-Entry

### Bei Architektur-Änderungen
- architecture.md aktualisieren
- learnings.md wenn neue Decision
- KNOWN-ISSUES.md wenn Issue gelöst

### Bei neuen Features
- user-stories.md User Story hinzufügen
- architecture.md Feature dokumentieren
- testing.md Test-Scope erweitern

### Bei neuen Datenquellen
- cmif-sources.md URL hinzufügen
- demo-datasets.md wenn als Test genutzt

---

## Qualitäts-Metriken

Total: 12 Dateien

Compliance: 12/12 VAULT-RULES compliant (100%)
Coverage: Alle Aspekte dokumentiert (System, Process, Standards, History)
Redundanz: Keine (jedes Doc hat unique Purpose)

---

## Nächste Schritte bei Updates

Wenn architecture.md aktualisiert wird:
- Prüfe ob learnings.md neue Decision dokumentieren muss
- Prüfe ob KNOWN-ISSUES.md neue Widersprüche auftreten
- Update journal.md mit Change-Rationale

Wenn neue Features kommen:
- user-stories.md: Neue Story hinzufügen
- architecture.md: Implementation dokumentieren
- journal.md: Phase-Entry erstellen
- testing.md: Test-Coverage erweitern

Wenn Issues gefunden werden:
- KNOWN-ISSUES.md: Issue registrieren mit Severity
- learnings.md: Wenn Decision falsch war, dokumentieren
- journal.md: Discovery dokumentieren
