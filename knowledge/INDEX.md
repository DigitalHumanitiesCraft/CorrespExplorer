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
updated: 2026-11-15
authors: [Christopher Pollin]
template:
  name: Vorlage Index
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/index
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-index
related: [project, data, specification, architecture, design, testing, plan, journal]
---

# Index

Die Wissensbasis von CorrespExplorer richtet sich an Menschen und Coding-Agents, die am Werkzeug arbeiten. Sie liegt unter `knowledge/` im Repository-Root, außerhalb des ausgelieferten Ordners `docs/`, und wird nicht als Teil der Website ausgeliefert ([ADR-008](specification.md#adr-008-wissensbasis-nicht-auf-der-website)). Die Arbeitsregeln für Agenten stehen in `CLAUDE.md` im Repository-Root, code-nahe Übersichten in `docs/js/CONTEXT-MAP.md`, `docs/js/views/CONTEXT-MAP.md`, `docs/js/tests/CONTEXT-MAP.md` und `docs/css/CONTEXT-MAP.md`. Die gemeinsame Schemaversion der Dokumente steht im Feld `version` dieses Index.

## Dokumente

| Pfad | Funktion | Routing Question | Aktualisierung |
|---|---|---|---|
| [journal.md](journal.md) | Provenance | Was ist offen, und wie ist der heutige Stand entstanden? | bei jedem Übergang, `## Open` bei jeder Übergabe |
| [project.md](project.md) | Charter | Wofür ist das Werkzeug da, wofür nicht, und woran wird es entwickelt? | bei Änderung von Zweck oder Abgrenzung |
| [specification.md](specification.md) | Specification | Was soll das Werkzeug für Forschende leisten, was davon tut es, wie prüft man es, und warum ist es so gebaut? | bei neuen Stories, Entscheidungen und Änderungen des Funktionsumfangs |
| [data.md](data.md) | Material | Was liest das Werkzeug, was enthalten die Datensätze und die erzeugten Dateien, wie verhält sich das gemeinsame Briefmodell dazu? | bei neuen Datensätzen, Quellen oder Parser-Änderungen |
| [uncertainty-specification.md](uncertainty-specification.md) | Specification | Wie werden unsichere und fehlende Angaben erkannt, angezeigt und getestet? | bei Änderung der Unsicherheitsbehandlung |
| [design.md](design.md) | Design | Wie sieht die Oberfläche aus, nach welchen gemeinsamen Regeln, was hat der Operator dazu gesagt und was davon gesehen? | bei Änderung von Aufbau, Ansichten oder Gestaltungsregeln |
| [architecture.md](architecture.md) | Architecture | Wie ist das Werkzeug gebaut, welche Teile teilen die Ansichten, was ist ungenutzt, und wo setzt eine Änderung an? | bei Änderung von Modulen, Seiten oder Datenfluss |
| [testing.md](testing.md) | Quality Assurance | Was garantieren die Prüfungen, wie laufen sie, und was bleibt ungeprüft? | bei neuen Prüfungen und nach jeder Prüfrunde |
| [plan.md](plan.md) | Planning | Was ist offen, woher kommt es, und was wartet auf den Operator? | bei neuen Befunden, Entscheidungen und nach deren Erledigung |
| [network-figures.md](network-figures.md) | Domain knowledge | Was lässt sich bei Briefdaten als Netz in Beziehung setzen, und welche Daten braucht es? | vor jeder Arbeit am Netzwerk |

## Ablagezonen

- `knowledge/` enthält die Promptotyping Documents.
- `research-artefacts/` enthält den Paper-Entwurf zur Entstehung des Werkzeugs und den Prompt für ein externes LLM-Review.
- `docs/data/` enthält Beispiel- und Testdatensätze und die erzeugte `examples.json`, `preprocessing/` die Python-Skripte, die sie erzeugen.
- `verification/` enthält Prüfwerkzeuge für Bestände außerhalb des Repositorys (`check-corpus.mjs`, `serve_local_corpus.py`), `tests/browser/` den Smoke-Test. Daten liegen dort nicht.
- `docs/vendor/` enthält Bibliotheken, Schriften und die Länderumrisse mit ihren Lizenzen, `docs/assets/dhcraft/` die Bausteine von Kopf und Fuß der Projektseiten mit Herkunft und Lizenz.

## Lesepfade

- Sessionstart: `CLAUDE.md`, der Abschnitt `## Open` am Anfang von [journal.md](journal.md), dieser Index, dann [plan.md](plan.md) und die Dokumente der Aufgabe.
- Neue Funktion oder Ansicht: [specification.md](specification.md) (Story und Aufgabe), [design.md](design.md) (Aufbau, gemeinsame Regeln und Rückmeldungen des Operators), [architecture.md](architecture.md#wo-eine-neue-ansicht-ansetzt).
- Durchgang nach den gemeinsamen Regeln: [design.md](design.md#gemeinsame-regeln-aller-ansichten), die geteilten Teile in [architecture.md](architecture.md#module), die Liste je Ansicht in [plan.md](plan.md#durchgang-nach-den-gemeinsamen-regeln).
- Aufräumen: [architecture.md](architecture.md#ungenutzt), [plan.md](plan.md#aufräumen).
- Daten und Parser: [data.md](data.md#was-der-parser-liest), [uncertainty-specification.md](uncertainty-specification.md), [testing.md](testing.md#korpusprüfung).
- Prüfrunde: [testing.md](testing.md#feste-aufgaben) mit den Aufgaben der Specification, Befunde nach [plan.md](plan.md).
- Gemeinsames Briefmodell: [data.md](data.md#gemeinsames-brief--und-aussagemodell), [plan.md](plan.md#gemeinsames-briefmodell), `knowledge/data.md` im Repository `gossip`.

## Konvention

Die Wissensbasis folgt der Konvention für Promptotyping Documents mit ihren Vorlagen (https://dhcraft.org/Promptotyping/templates/convention.md). Bis Oktober 2026 (Commit `29dfc15`) bestand sie aus Journal, Context Map, einer Liste bekannter Probleme und Themendokumenten. Am 2026-11-14 wurde sie nach der neuen Richtung des Werkzeugs distilliert, am 2026-11-15 nach dem Umbau von Startseite, Startansicht, Briefliste, Zeit und Themen erneut und nach dem anschließenden Refactoring kuratiert ([Journal](journal.md)).

## Begriffe

### CMIF

Correspondence Metadata Interchange Format, ein TEI-basiertes Format der TEI Correspondence SIG für den Austausch von Briefmetadaten.

### correspSearch

Webservice der Berlin-Brandenburgischen Akademie der Wissenschaften, der CMIF-Dateien vieler Editionen aggregiert und über eine API durchsuchbar macht.

### Briefsatz

Ein TEI-Eintrag, der einen Brief in einem eigenen Datensatz beschreibt, etwa ein `biblFull` mit `correspDesc`, Signatur, Poststempel und Anschrift. Stefan Zweig Digital veröffentlicht seine Briefmetadaten so.

### Gegenstand

Einer der Reiter des Explorers: Start, Briefe, Personen, Orte, Zeit, Themen. Ein Gegenstand hat eine oder mehrere Darstellungen.

### Darstellung

Eine Figur oder Liste zu einem Gegenstand, etwa Karte, Raum-Zeit und Liste unter Orte. Ihre Adresse ist der URL-Parameter `view`.

### Auswahl

Die Menge der Briefe unter allen gesetzten Filtern. Alle Darstellungen zeigen dieselbe Auswahl.

### Auswahlzeile

Die Zeile am unteren Rand jeder Darstellung, der eine Ort für die Auswahl, mit der Zahl ihrer Briefe, „Gefiltert nach“ mit den Filtern als entfernbare Marken und „Filter aufheben“ ([design.md](design.md#auswahlzeile)).

### Briefauszug

Die Briefe der Auswahl als Liste über der Darstellung, geöffnet über die Zahl der Auswahlzeile, in jeder Darstellung außer der Briefliste (`letters-drawer.js`).

### Schiene

Die Seitenleiste des Explorers als schmale Spalte aus Zeichen mit Hinweis und zugänglichem Namen, die sich zu vollen Beschriftungen öffnen lässt. Bestand, Zeitraum und Sprache öffnen je ein Feld daneben ([design.md](design.md#schiene)).

### Sprachlegende

Die eine Zeile der Sprachen mit ihren Farben, jede so breit wie ihr Anteil an der Auswahl, die zugleich erklärt, was die Farben bedeuten, und als Sprachfilter dient (`renderLanguageKey()` in `selection-ui.js`). Bisher steht sie in der Startansicht.

### Korrespondenzkreis

Die Darstellung Netzwerk in ihrer Grundform: eine Person in der Mitte, ihre Korrespondenten nach Briefzahl und Beginn des Briefwechsels, auf der zweiten Stufe die Erwähnten.

### Raum-Zeit

Die Darstellung, die die Absendeorte nach ihren Koordinaten auf eine Grundfläche und die Jahre als Höhe darüber stellt.

### Startfigur

Die Figur der Startseite aus den kleinen Darstellungen des Explorers und einem Beispielbrief, zusammengesetzt aus dem, was der gewählte Bestand enthält (`composeFigure()` in `start-compose.js`), in der Ordnung des Datenmodells (Kern des CMIF, Erweiterungen im CMIF, TEI-Briefsätze), deren Namen nicht auf der Seite stehen. Nummerierte Marken verbinden die Zeilen des Briefs mit seinen Marken in den Figuren.

### Startansicht

Die Darstellung „Start“ des Explorers, ein Dashboard kleiner echter Darstellungen, die einander filtern. Sie ist von der Startseite zu unterscheiden.

### Raster

Die Hauptfigur der Themenansicht mit einer Zeile je Thema und einer Zelle je Jahr, getönt auf einer festen Skala nach der Zahl der Briefe.

### Anteile

Die zweite Figur der Themenansicht, eine Treemap, in der jedes Thema eine Fläche nach seinen Briefen ist.

### Erweiterter Datensatz

Datensatz, der über Absender, Empfänger, Ort und Datum hinaus erwähnte Personen, Orte, Themen und Sprachen enthält, wie das Hugo Schuchardt Archiv. Er wird in Python vorprozessiert und als JSON geladen.

### Aussage

Im gemeinsamen Briefmodell von GOSSIP das, was eine Stelle eines Briefs mit einer dritten Person tut, mit Verweis, Familie, Stimme und Prüfstand ([data.md](data.md#gemeinsames-brief--und-aussagemodell)). Das Werkzeug liest noch keine Aussagen.

### Wissenskorb

Sammlung ausgewählter Briefe, Personen und Orte eines Datensatzes, im localStorage gehalten, über Tabs synchronisiert, per Link teilbar und auf `wissenskorb.html` ausgewertet. In Oberfläche und Commits heißt er auch Korb oder Datenkorb.

### Forschungspfad, Wissenspfad

Eine Folge von Ansichten zu einer Forschungsfrage und ihre geführte Leiste. Seit 2026-11-14 ohne Einstieg in der Oberfläche, seit dem Refactoring vom 2026-11-15 auch aus dem Code entfernt ([specification.md](specification.md#us-33-methodisch-geleitete-exploration)). Der Name lebt nur in den Modulnamen `knowledge-path.js` und `research-paths.js` fort, die heute Korb und Zählung enthalten.
