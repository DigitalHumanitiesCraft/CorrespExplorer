# Knowledge Vault Context Map

Übersicht der Dokumentationsdateien in docs/knowledge/ mit Zweck, Beziehungen und Nutzungsrichtlinien. Code-nahe Context Maps liegen in docs/js/CONTEXT-MAP.md, docs/js/tests/CONTEXT-MAP.md und docs/css/CONTEXT-MAP.md.

Stand: 2026-10-28 (Dateibestand gegen das Repository geprüft)

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
- Zweck: Vollstaendige System-Uebersicht und Komponenten-Referenz (Single Source of Truth)
- Zielgruppe: Entwickler, Claude
- Aenderungsrate: Selten (nur bei Architektur-Aenderungen)
- Abhaengigkeiten: Referenziert von allen Development-Tasks
- Nutzen: Module, Views, Datenfluesse, Performance-Limits

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
- Aenderungsrate: Oft (Test-Coverage erweitert sich)
- Abhaengigkeiten: architecture.md, demo-datasets.md
- Nutzen: Real Data Only Rule, Test-Pyramid, Best Practices

#### JOURNAL.md
- Zweck: Chronologisches Development-Log mit Decisions und Commits
- Zielgruppe: Entwickler (Evolution verstehen), Claude (Context)
- Aenderungsrate: Kontinuierlich (nach jeder Phase)
- Abhaengigkeiten: Alle technischen Dateien
- Nutzen: Phasen-Historie, Architectural Decisions

#### KNOWN-ISSUES.md
- Zweck: Registry von dokumentierten Inkonsistenzen mit Priorisierung
- Zielgruppe: Entwickler (Cleanup), Project Managers
- Aenderungsrate: Oft (Issues discovered/fixed)
- Abhaengigkeiten: architecture.md, design.md, tokens.css
- Nutzen: Issue-Tracking, Fix-Reihenfolge

### Reference (Discovery)

#### user-stories.md
- Zweck: Requirements-Spec mit implementierten Features
- Zielgruppe: Project Managers, Entwickler (Scope), Forscher
- Aenderungsrate: Selten (Core Stories stabil)
- Abhaengigkeiten: architecture.md (beschreibt Implementations)
- Nutzen: Alle Stories implementiert, Acceptance Criteria

#### demo-datasets.md
- Zweck: Analyse von Test-CMIF-Datasets mit Coverage-Matrix
- Zielgruppe: Entwickler (Testing), Forscher (Dataset-Auswahl)
- Änderungsrate: Selten (bei neuen Datasets)
- Abhängigkeiten: cmif-standard.md, uncertainty-concept.md
- Nutzen: test-uncertainty.xml mit 22 Cases, Feature-Demo und HSA als Haupt-Demos

#### cmif-sources.md
- Zweck: Katalog externer CMIF-Repositories mit URLs
- Zielgruppe: Forscher, Entwickler (Data Loading)
- Änderungsrate: Oft (neue Quellen entdeckt)
- Abhängigkeiten: cmif-standard.md
- Nutzen: 85+ Files in csStorage, correspSearch API v2.0, GitHub Raw URLs

#### CONTEXT-MAP.md
- Zweck: Diese Übersicht über die Wissensdokumente
- Änderungsrate: Bei neuen, gelöschten oder umgewidmeten Dokumenten

### Paper (Reflexion)

#### paper/interface-genesis-as-research.md
- Zweck: Paper-Entwurf, der die Entwicklung von CorrespExplorer als Fallstudie für Promptotyping reflektiert
- Zielgruppe: Forscher (Digital Humanities, Methodik)
- Abhängigkeiten: JOURNAL.md, learnings.md

#### paper/review-prompt.md
- Zweck: Prompt für ein externes, kritisches LLM-Review des Repositorys
- Zielgruppe: Reviewer-Instanz, Autoren

---

## Nutzungs-Workflows

### Bei Code-Änderungen

1. Lese architecture.md (System verstehen)
2. Prüfe learnings.md (Design-Rationale)
3. Reviewe uncertainty-concept.md (bei Daten-Handling)
4. Konsultiere testing.md (Test-Coverage)
5. Update JOURNAL.md (Entscheidung dokumentieren)

### Bei neuen Features

1. Definiere in user-stories.md
2. Design in design.md (wenn visuell)
3. Plan Implementation in JOURNAL.md
4. Add Tests per testing.md Scope
5. Dokumentiere in architecture.md

### Bei Bug-Fixes

1. Checke KNOWN-ISSUES.md (bekannte Probleme)
2. Review learnings.md (Decision Rationale)
3. Add Regression-Test per testing.md
4. Update JOURNAL.md mit Fix-Details

### Bei Daten-Fragen

1. cmif-standard.md für Format-Spec
2. uncertainty-concept.md für Unsicherheits-Handling
3. demo-datasets.md für Test-Cases
4. cmif-sources.md für externe Quellen

---

## Dokumenten-Matrix

Das letzte Änderungsdatum einer Datei liefert `git log -1 -- <datei>`.

| Datei | Typ | Stabilität | Änderungsrate |
|-------|-----|------------|---------------|
| architecture.md | Architektur | Niedrig | Selten |
| cmif-sources.md | Referenz | Hoch | Oft |
| cmif-standard.md | Spezifikation | Sehr hoch | Nie |
| CONTEXT-MAP.md | Navigation | Mittel | Bei Dokumentänderungen |
| demo-datasets.md | Referenz | Mittel | Selten |
| design.md | Spezifikation | Hoch | Selten |
| JOURNAL.md | Historie | Niedrig | Kontinuierlich |
| KNOWN-ISSUES.md | Wartung | Niedrig | Oft |
| learnings.md | Konzept | Hoch | Selten |
| paper/interface-genesis-as-research.md | Paper-Entwurf | Mittel | Selten |
| paper/review-prompt.md | Prompt | Hoch | Selten |
| testing.md | Prozess | Mittel | Oft |
| uncertainty-concept.md | Spezifikation | Sehr hoch | Selten |
| user-stories.md | Requirements | Sehr hoch | Selten |
| VAULT-RULES.md | Governance | Sehr hoch | Selten |

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
JOURNAL.md ← Phase-Tracking
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
3. JOURNAL.md - Letzte Phasen
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
- JOURNAL.md aktualisieren mit Phase-Entry

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

## Regelkonformität

Die Einhaltung von VAULT-RULES.md wird nicht automatisch geprüft. Eine frühere Fassung dieser Datei bescheinigte sich volle Konformität und Redundanzfreiheit, während einzelne Dokumente gegen die Regeln verstießen (etwa Fettdruck in testing.md) und der Dateibestand nicht mehr stimmte. Aussagen über Konformität brauchen deshalb eine nachvollziehbare Prüfung.

---

## Nächste Schritte bei Updates

Wenn architecture.md aktualisiert wird:
- Prüfe ob learnings.md neue Decision dokumentieren muss
- Prüfe ob KNOWN-ISSUES.md neue Widersprüche auftreten
- Update JOURNAL.md mit Change-Rationale

Wenn neue Features kommen:
- user-stories.md: Neue Story hinzufügen
- architecture.md: Implementation dokumentieren
- JOURNAL.md: Phase-Entry erstellen
- testing.md: Test-Coverage erweitern

Wenn Issues gefunden werden:
- KNOWN-ISSUES.md: Issue registrieren mit Severity
- learnings.md: Wenn Decision falsch war, dokumentieren
- JOURNAL.md: Discovery dokumentieren
