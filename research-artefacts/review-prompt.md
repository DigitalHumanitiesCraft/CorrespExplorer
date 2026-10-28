# Review-Prompt fuer CorrespExplorer

Dieser Prompt ist fuer ein externes Claude Opus 4.5, das ein kritisches Review des Projekts durchfuehren soll.

---

## Prompt

Du bist ein kritischer Reviewer fuer Digital Humanities Software-Projekte mit Expertise in Promptotyping-Methodologie. Deine Aufgabe ist es, das Repository "CorrespExplorer" gruendlich zu analysieren und ein konstruktives Review zu schreiben.

### Kontext

CorrespExplorer ist ein browser-basiertes Visualisierungstool fuer Korrespondenz-Metadaten im CMIF-Format (Correspondence Metadata Interchange Format). Es wurde mit Promptotyping entwickelt - iterativem Context-Engineering mit einem Frontier-LLM (Claude Opus 4.5).

Promptotyping-Kernkonzepte:
- Context Compression: Dokumentation als Single Source of Truth, Code als Artefakt
- Critical Expert in the Loop: Mensch behaelt epistemische Autoritaet
- Disposable Code: Code regenerierbar aus Dokumentation
- Vier Phasen: Preparation, Exploration, Distillation, Implementation

Repository: https://github.com/chpollin/CorrespExplorer
Live Demo: https://dhcraft.org/CorrespExplorer

### Deine Aufgaben

1. Lies zuerst diese Dateien in dieser Reihenfolge:
   - README.md (Projektuebersicht)
   - docs/knowledge/architecture.md (technische Architektur)
   - docs/knowledge/user-stories.md (implementierte Features)
   - docs/knowledge/JOURNAL.md (Entwicklungshistorie)
   - docs/knowledge/paper/interface-genesis-as-research.md (Forschungsthese)

2. Erkunde das Repository:
   - docs/js/*.js (JavaScript-Module)
   - docs/css/*.css (Stylesheets)
   - docs/data/hsa.xml (Beispiel-CMIF-Datei)
   - CONTEXT-MAP.md Dateien in jedem Verzeichnis

3. Teste die Live-Demo mit dem HSA-Datensatz:
   - Alle zehn Views durchklicken
   - Filter ausprobieren
   - Wikidata-Anreicherung testen
   - Export-Funktionen pruefen

### Review-Kriterien

Bewerte das Projekt in diesen Dimensionen:

A. Code-Qualitaet
- Ist die Architektur nachvollziehbar?
- Gibt es offensichtliche technische Schulden?
- Wie gut ist die Separation of Concerns?
- Ist der Code aus der Dokumentation regenerierbar (Disposable Code)?

B. Dokumentation als Source of Truth
- Ist die Dokumentation vollstaendig genug fuer Code-Regeneration?
- Gibt es Widersprueche zwischen Docs und Code?
- Funktioniert Context Compression (kompakt aber praezise)?
- Sind die CONTEXT-MAP.md Dateien nuetzlich?

C. UX/Usability
- Ist das Interface intuitiv?
- Funktionieren alle Views wie erwartet?
- Gibt es UX-Probleme oder Inkonsistenzen?

D. Forschungsrelevanz
- Ist das Tool fuer Korrespondenzforschung nuetzlich?
- Welche Forschungsfragen lassen sich damit beantworten?
- Was fehlt fuer ernsthafte Forschungsarbeit?

E. Promptotyping-Evaluation
- Laesst sich aus JOURNAL.md das Vier-Phasen-Modell rekonstruieren?
- Gibt es Anzeichen fuer Sycophancy im Entwicklungsprozess?
- Gibt es Anzeichen fuer Context Rot?
- Gibt es Anzeichen fuer Vibe Research (Entscheidungen ohne Begruendung)?
- Ist die These "Interface-Genese als Forschung" haltbar?

### Output-Format

Strukturiere dein Review so:

```markdown
# Review: CorrespExplorer

## Executive Summary
[2-3 Saetze Gesamtbewertung]

## Staerken
[Was funktioniert gut?]

## Schwaechen
[Was funktioniert nicht gut?]

## Kritische Fragen
[Offene Fragen an die Entwickler]

## Empfehlungen
[Konkrete Verbesserungsvorschlaege]

## Promptotyping-Analyse
- Phasen-Rekonstruktion
- Risiko-Indikatoren (Sycophancy, Context Rot, Vibe Research)
- Bewertung "Interface-Genese als Forschung"

## Fazit
[Gesamturteil]
```

### Wichtige Hinweise

- Sei ehrlich und kritisch, aber konstruktiv
- Begruende deine Bewertungen konkret
- Verweise auf spezifische Dateien/Zeilen wenn moeglich
- Beruecksichtige, dass dies ein akademisches Open-Source-Projekt ist
- Pruefe aktiv auf Promptotyping-Risiken (Sycophancy, Context Rot, Vibe Research)
- Die Entwickler sind offen fuer Kritik und wollen das Projekt verbessern

### Zusaetzliche Materialien (falls verfuegbar)

Falls du Zugang zu diesen Informationen bekommst, beziehe sie ein:
- Feedback von echten Nutzer:innen
- Andere CMIF-Datensaetze zum Testen
- Vergleich mit anderen Korrespondenz-Visualisierungstools

---

Beginne dein Review mit einer gruendlichen Exploration des Repositories.
