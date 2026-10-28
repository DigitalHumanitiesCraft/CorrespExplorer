---
title: Project
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2026-10-28
updated: 2026-10-28
authors: [Christopher Pollin]
template:
  name: Vorlage Projekt-Wissensdokument
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/project
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-project
knowledge-sources:
  institutions:
    correspSearch: https://correspsearch.net
    Hugo Schuchardt Archiv: https://gams.uni-graz.at/context:hsa
  standards:
    CMIF: https://github.com/TEI-Correspondence-SIG/CMIF
    TEI P5: https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html
related: [data, specification, architecture, design, plan]
---

# Project

CorrespExplorer ist ein Werkzeug im Browser zur interaktiven Exploration von Korrespondenz-Metadaten im Correspondence Metadata Interchange Format (CMIF). Es lädt beliebige CMIF-Dateien und bringt einen Beispieldatensatz aus dem Hugo Schuchardt Archiv mit. Die Anwendung ist unter https://dhcraft.org/CorrespExplorer erreichbar.

## Datengrundlage

Das Werkzeug arbeitet auf CMIF-Dateien, die Editionen und Archive veröffentlichen und die der Webservice correspSearch der Berlin-Brandenburgischen Akademie der Wissenschaften aggregiert. Nutzende laden eine Datei hoch oder geben eine URL an. Als Beispiel dient der vorprozessierte Briefbestand des Hugo Schuchardt Archivs der Universität Graz mit Themen, erwähnten Personen und Orten und Briefsprachen. Ein synthetischer Datensatz führt durch die Funktionen. Die Rechte an den Korrespondenzdaten bleiben bei den Editionen und Archiven. Quellen, Datenmodell und Testdatensätze beschreibt [data.md](data.md).

## Übergeordneter Kontext

CorrespExplorer begann im Oktober 2025 als HerData, ein Prototyp zu Frauen in Goethes Korrespondenz, und wurde am 2025-11-26 zu einem generischen Explorer für CMIF-Dateien umgebaut (`9a01c32`). Das Repository dient als Fallstudie in einem Paper über Promptotyping. Es gehört zur Werkzeugfamilie ResearchTools von Digital Humanities Craft.

## Worum es geht

Briefeditionen erschließen ihre Bestände über Metadaten zu Absendern, Empfängern, Orten, Daten und Themen. CMIF macht diese Metadaten über Editionen hinweg austauschbar, ein Werkzeug zur schnellen Exploration einer einzelnen CMIF-Datei fehlte aber. CorrespExplorer zeigt einen Bestand in koordinierten Ansichten und macht dabei die Datenlage sichtbar, also fehlende Koordinaten, unscharfe Datierungen und Personen ohne Normdaten. Die Zielgruppe sind Forschende der Digital Humanities, der Geschichts- und Literaturwissenschaft, Archive, Bibliotheken und Editionsprojekte.

## Standards

Die technische Anschlussfähigkeit folgt etablierten Standards.

- Datenformat: CMIF, ein TEI-basiertes Format der TEI Correspondence SIG auf Grundlage von `correspDesc`
- Personen: VIAF, GND, Library of Congress und Bibliothèque nationale de France als Normdaten-URIs
- Orte: GeoNames, ergänzt um Koordinaten aus Wikidata
- Sprachen: ISO 639 und Lexvo-URIs
- Anreicherung: Wikidata über SPARQL für Lebensdaten, Berufe, Porträts und Koordinaten

Normdaten-URIs tragen Abgleich und Aggregation, weil Editionen Namen unterschiedlich schreiben ([ADR-001](specification.md#adr-001-normdaten-uris-als-primärer-schlüssel)).

## Technische Umsetzung

Die Anwendung ist eine statische Seite ohne Backend und ohne Build-Schritt, ausgeliefert über GitHub Pages aus `docs/` auf main. CMIF wird im Browser geparst, große Datensätze werden in Python vorprozessiert. Bibliotheken (MapLibre GL JS, D3 mit D3-Sankey, noUiSlider, Font Awesome, marked) lädt die Seite zur Laufzeit von CDNs, Kartenkacheln von OpenFreeMap. Christopher Pollin entwickelt das Werkzeug mit Promptotyping in Claude Code. Die Commit-Trailer nennen die beteiligten LLM-Versionen, die README fasst sie zusammen. Aufbau und Datenfluss beschreibt [architecture.md](architecture.md).

## Funktionsumfang

Die Ansichten umfassen Übersicht, Karte, Korrespondenten, Briefe, Timeline, Themen, Orte, Netzwerk, Erwähnungsflüsse, Chronik, Forschungspfade und Aktivitäts-Heatmap. Sie teilen einen Filterzustand für Zeitraum, Sprache, Person, Thema und Ort, der in der URL steht und sich teilen lässt. Gefilterte Briefe lassen sich als CSV oder JSON exportieren, der Wissenskorb sammelt Briefe, Personen und Orte für eine eigene Analyseseite. Anforderungen und Stories stehen in [specification.md](specification.md).

Unsicherheit in den Daten wird erkannt und markiert. Exakte Werte bleiben ohne Markierung, unvollständige Daten, Zeiträume und unsichere Datierungen tragen Symbole, undatierte Briefe stehen außerhalb der Zeitachse ([uncertainty-specification.md](uncertainty-specification.md)).

## Abgrenzungen

Das Projekt leistet nicht:

- automatische Korrektur von Datierungen
- Geokodierung von Regionen ohne Koordinaten
- Identifikation unbekannter Personen
- Bewertung der Datenqualität einer Edition
- Anzeige von Brieftexten, es verlinkt auf die Edition
- Speicherung hochgeladener Daten auf einem Server

Das Werkzeug macht den Zustand der Daten sichtbar und überlässt Korrektur und Bewertung den Editionen und den Forschenden.

## Begriffe

Die projektzentralen Begriffe definiert [INDEX.md](INDEX.md#begriffe).

## Lizenz

Der Code steht unter der MIT-Lizenz (`LICENSE`), Dokumentation und Wissensdokumente unter Creative Commons Attribution 4.0 International. Forschungsdaten Dritter sind davon ausgenommen, die Rechte bleiben bei ihren Inhabern, für den gebündelten Datensatz beim Hugo Schuchardt Archiv. Zitierangaben stehen in `CITATION.cff` und `codemeta.json`.
