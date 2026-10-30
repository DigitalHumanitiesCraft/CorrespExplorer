---
title: Plan
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: active
language: de
created: 2026-10-28
updated: 2026-10-30
authors: [Christopher Pollin]
template:
  name: Vorlage Plan
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/plan
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-plan
related: [specification, testing, journal, handoff]
---

# Plan

Der Plan führt die offenen Befunde und angenommenen Vorhaben auf main. Erledigtes wandert ins [Journal](journal.md), Entscheidungen in die [Specification](specification.md#entscheidungen).

## Zielbild

Ein Zielbild für eine nächste Ausbaustufe ist nicht festgelegt. Als Fixpunkt gilt, dass main der über GitHub Pages ausgelieferte Stand bleibt, die offenen Befunde behoben oder begründet verworfen werden und der Browser-Test-Runner ohne Fehlschlag läuft. Seit 2026-10-29 enthält main den Branch `feature/research-dashboards` (Merge `14b2d17`).

## Offene Befunde

Die Nummern stammen aus dem früheren Dokument der bekannten Probleme und laufen weiter. Die behobenen Befunde 1 bis 11 und die Review-Befunde stehen im Journal, 6 bis 8 und 9 bis 11 in den Einträgen vom 2026-10-29. Die Befunde der Prüfung vom 2026-10-29 durch Subagenten (Funktion, Seiten, Barrierefreiheit, Gestaltung, Code und Dokumentation) sind behoben und im Journal festgehalten, was davon offen blieb, steht unter [Vorhaben](#vorhaben). Zurzeit ist kein Befund offen.

### 8. correspSearch-API-URLs liefern keine Briefe

Behoben am 2026-10-29 (`b80eff0`). Der Lader setzt `x` als Seitennummer ab 1, folgt `notesStmt/relatedItem[@type="next"]` und hört bei `API_DEFAULTS.correspSearchMaxLetters` auf. Geprüft gegen die API mit `d=1890-01-01` (87 Briefe auf 9 Seiten, 9 Anfragen) und mit gesenkter Obergrenze auf eine Abfrage mit 273 Treffern. Der Abschnitt bleibt als Ziel der Verweise auf diesen Befund stehen.

## Vorhaben

### Tests und Prüfung

- CI mit Headless-Browser, etwa ein GitHub-Actions-Lauf von `test.html?test=true` mit Playwright
- Live-Prüfung der externen Dienste nach den Änderungen vom 2026-10-29 und 2026-10-30: Laden einer correspSearch-API-URL über die Startseite, „Lebensdaten von Wikidata laden“ im Personen-Dialog, Grundkarte von OpenFreeMap auf Karte und Korbseite. Die Prüfumgebung erreichte `correspsearch.net`, `query.wikidata.org`, `www.wikidata.org` und `tiles.openfreemap.org` nicht (Gateway antwortete 403), geprüft sind nur die Fehlerwege ohne Netz
- Regressionstest für den Formelschutz von `csvCell`, sobald eine Fixture-Datei einen Wert mit führendem `=`, `+`, `-` oder `@` trägt. Das Verdoppeln von Anführungszeichen prüft die Suite Basket seit 2026-10-29
- Regressionstests für die Transformation der correspSearch-Antwort, sobald ein Fixture dafür im Repository liegt
- Parser-Test für Erwähnungen (`mentionsPerson`, `mentionsPlace`, `mentionsSubject`) an einer Fixture-Datei. Bisher prüft nur die Suite Research Paths an `demo-showcase.xml`, dass Erwähnungen ankommen
- Performance-Regressionstests für Filter auf großen Datensätzen

### Barrierefreiheit und Bedienung

Offen aus der Prüfung nach WCAG 2.2 AA vom 2026-10-29.

- Die Zellen der Aktivitäts-Heatmap sind 12 x 12px groß (`.activity-cell` in `explore.css`) und unterschreiten die Zielgröße von 24 x 24px ([design.md](design.md#9-accessibility))
- Die Sprachsegmente der Zeitleiste und die Verbindungen im Erwähnungsfluss sind nur mit der Maus erreichbar. Jahresbalken, Netzwerkknoten und die Seitenknoten des Erwähnungsflusses haben inzwischen einen Tastaturweg

### Oberfläche und Texte

- Die Legende der Zeitleiste kündigt eine Schraffur für den Anteil unscharfer Daten an ([design.md](design.md#unsicherheits-indikatoren)), die Zeitleiste rendert `.timeline-uncertainty-overlay` aber nicht
- Die Kartenmarker sind Teil der MapLibre-Fläche und nicht einzeln per Tastatur erreichbar, die Ortsansicht bietet dieselben Orte als Liste

### Lücken der Stories

Beim Abgleich der Stories mit dem Code am 2026-10-29 ([specification.md](specification.md#epics-und-user-stories)) blieben diese Kriterien ohne Umsetzung.

- US-05: Gruppierung der Timeline nach Dekade
- US-11: Netzwerk aus dem Briefwechsel selbst (Kante zwischen Absender und Empfänger, Stärke nach Briefanzahl) und Filter nach Mindestzahl der Briefe. Die Zeitgenossen-Kanten zeigen gemeinsame aktive Jahre
- US-22: JSON-Export mit vollständiger Datenstruktur, Indizes und Erwähnungen
- US-27: Die fünf aktivsten Korrespondenten, die Sprachverteilung und Ansichtsempfehlungen in der Übersicht. Zu entscheiden ist, ob sie zurückkehren oder aus der Story entfallen

### Daten

- Die Briefe von `hsa-letters.json` tragen kein Feld `precision` bei Absender, Empfänger und Absendeort. Personen- und Ortsmarkierungen bleiben beim HSA deshalb leer, auch für die 576 Briefe aus „Unbekannt“ ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis)). `build_hsa_data.py` könnte die Präzision wie der Parser klassifizieren

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)). Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze, Nachladen oder Paginierung für große
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

## Offene Entscheidungen und Abhängigkeiten

- Der Branch `feature/research-dashboards` und die übrigen Branches bleiben bestehen, ihr Aufräumen liegt beim Operator. Das Journal des Branchs vergab die Phasennummern 40 bis 46, die sich mit Phase 40 auf main überschneiden. Der Merge übernahm sie nicht als Überschriften ([journal.md](journal.md)).
- Der Explorer schreibt die URL mit `replaceState`, der Zurück-Knopf verlässt ihn deshalb, statt Filterschritte zurückzunehmen ([architecture.md](architecture.md#entwurfsmuster)). Ob Filterschritte mit `pushState` in die Browser-Historie gehen sollen, entscheidet der Operator.

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
