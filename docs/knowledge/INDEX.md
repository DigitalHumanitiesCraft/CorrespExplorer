---
title: Index
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
version: 0.1
created: 2025-12-03
updated: 2026-10-28
authors: [Christopher Pollin]
template:
  name: Vorlage Index
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/index
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-index
related: [project, data, specification, architecture, design, testing, plan, handoff, journal]
---

# Index

Die Wissensbasis von CorrespExplorer richtet sich an Menschen und Coding-Agents, die am Werkzeug arbeiten. Sie liegt abweichend von der Konvention unter `docs/knowledge/` statt `knowledge/`, weil GitHub Pages den Ordner `docs/` ausliefert und die Seite `vault.html` die Dokumente von dort lädt. Die Arbeitsregeln für Agenten stehen in `CLAUDE.md` im Repository-Root, Code-nahe Übersichten in `docs/js/CONTEXT-MAP.md`, `docs/js/tests/CONTEXT-MAP.md` und `docs/css/CONTEXT-MAP.md`.

Die gemeinsame Schemaversion der Dokumente steht im Feld `version` dieses Index, die übrigen Dokumente erben sie.

## Dokumente

| Pfad | Funktion | Routing Question | Aktualisierung |
|---|---|---|---|
| [project.md](project.md) | Charter | Was ist dieses Projekt, für wen, mit welcher Datengrundlage? | bei Änderung von Identität oder Scope |
| [data.md](data.md) | Material | Welche CMIF-Daten verarbeitet das Werkzeug, woher kommen sie, wie sind sie modelliert? | bei neuen Datensätzen, Quellen oder Parser-Änderungen |
| [specification.md](specification.md) | Specification | Was soll das Werkzeug tun und warum? | bei neuen Stories oder Entscheidungen |
| [uncertainty-specification.md](uncertainty-specification.md) | Specification | Wie werden unsichere und fehlende Angaben erkannt, angezeigt und getestet? | bei Änderung der Unsicherheitsbehandlung |
| [architecture.md](architecture.md) | Architecture | Wie ist das Werkzeug technisch aufgebaut? | bei Änderung von Modulen, Seiten oder Datenfluss |
| [design.md](design.md) | Design | Wie sieht die Oberfläche aus und warum? | bei Änderung des Designsystems |
| [testing.md](testing.md) | Quality Assurance | Was wird wie getestet? | bei neuen Suites oder Testregeln |
| [plan.md](plan.md) | Planning | Welche Befunde und Vorhaben sind offen? | bei neuen Befunden und nach deren Erledigung |
| [handoff.md](handoff.md) | Handoff | Welche Übergabepunkte sind offen? | bei Eingang oder Verarbeitung eines Punkts |
| [journal.md](journal.md) | Provenance | Wie ist der heutige Stand entstanden? | nach sachlich zusammengehörigen Übergängen |

## Ablagezonen

- `docs/knowledge/` enthält die dauerhaft gepflegten Promptotyping Documents einschließlich `handoff.md`.
- `research-artefacts/` enthält den Paper-Entwurf zur Entstehung des Werkzeugs als Forschung und den Prompt für ein externes LLM-Review.
- `docs/data/` enthält Beispiel- und Testdatensätze, `preprocessing/` die Python-Skripte, die erweiterte Datensätze erzeugen.

## Lesepfade

- Sessionstart: `CLAUDE.md`, dann [INDEX.md](INDEX.md), [handoff.md](handoff.md), [project.md](project.md) und das aufgabenrelevante Dokument.
- Code-Änderung: [architecture.md](architecture.md), `docs/js/CONTEXT-MAP.md`, [testing.md](testing.md), bei Datenbezug [data.md](data.md) und [uncertainty-specification.md](uncertainty-specification.md).
- Neue Funktion: [specification.md](specification.md), [design.md](design.md), dann [architecture.md](architecture.md).
- Fehlerbehebung: [plan.md](plan.md#offene-befunde), dann [journal.md](journal.md) für den Entstehungskontext.

## Konvention

Die Wissensbasis folgt der Konvention für Promptotyping Documents mit ihren Vorlagen (https://dhcraft.org/Promptotyping/#konvention-v0.1). Bis Oktober 2026 (Commit `29dfc15`) bestand sie aus Journal, Context Map, einer Liste bekannter Probleme und Themendokumenten, die Umstellung ist im Journal festgehalten.

## Begriffe

### CMIF

Correspondence Metadata Interchange Format, ein TEI-basiertes Format der TEI Correspondence SIG für den Austausch von Briefmetadaten.

Verwendet in [data.md](data.md#modell), [project.md](project.md#standards).

### correspSearch

Webservice der Berlin-Brandenburgischen Akademie der Wissenschaften, der CMIF-Dateien vieler Editionen aggregiert und über eine API durchsuchbar macht.

Verwendet in [data.md](data.md#externe-cmif-quellen), [plan.md](plan.md#8-correspsearch-api-urls-liefern-keine-briefe).

### Erweiterter Datensatz

Datensatz, der über Absender, Empfänger, Ort und Datum hinaus erwähnte Personen, Orte, Themen und teiHeader-Metadaten trägt. Er wird in Python vorprozessiert und als JSON geladen, ein Standard-CMIF wird dagegen im Browser geparst.

Verwendet in [architecture.md](architecture.md#datenfluss), [data.md](data.md#vorprozessierung-erweiterter-datensätze).

### Forschungspfad

Folge von Ansichten und Aktionen, die eine Forschungsfrage an den geladenen Datensatz beantwortet, eingeordnet in eine epistemische Kategorie.

Verwendet in [specification.md](specification.md#adr-004-epistemische-kategorien-für-forschungsfragen), [design.md](design.md#forschungspfade).

### Wissenskorb

Sammlung ausgewählter Briefe, Personen und Orte, im localStorage gehalten, über Tabs synchronisiert und auf einer eigenen Analyseseite ausgewertet (`wissenskorb.html`).

Verwendet in [architecture.md](architecture.md#3-basket-knowledge-basket).
