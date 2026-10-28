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
updated: 2026-10-28
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

Ein Zielbild für eine nächste Ausbaustufe ist nicht festgelegt. Bis dahin gilt als Fixpunkt, dass main der über GitHub Pages ausgelieferte Stand bleibt, die offenen Befunde behoben oder begründet verworfen werden und der Browser-Test-Runner ohne Fehlschlag läuft. Ob der Branch `feature/research-dashboards` in main eingeht, ist offen ([handoff.md](handoff.md)).

## Offene Befunde

Die Nummern stammen aus dem früheren Dokument der bekannten Probleme und bleiben als Bezeichner erhalten. Die behobenen Einträge #1 bis #5 und die Review-Befunde vom Oktober 2026 stehen im Journal.

### 6. Personenfilter ohne Normdaten-ID liefert keine Briefe

Schweregrad mittel. Ein Klick auf eine Person ohne ID in Karte, Liste oder Dialog filtert auf null Briefe. `explore.js` verwendet als Personenschlüssel die ID oder den Namen, `state-manager.js` vergleicht im Personenfilter nur `sender.id` und `recipient.id`.

Nächster Schritt: im state-manager wie in `explore.js` auf ID oder Namen vergleichen ([ADR-001](specification.md#adr-001-normdaten-uris-als-primärer-schlüssel)).

### 7. Bedienelemente der Karte verdeckt

Schweregrad niedrig. Layer-Wechsel und Farbmodus-Schalter liegen unter der Navigationsleiste und sind nicht anklickbar, weil `.map-controls` absolut positioniert ist und der Bezugsrahmen oberhalb der Kartenansicht liegt.

Nächster Schritt: `#map-view` als Bezugsrahmen (`position: relative`) setzen und prüfen.

### 8. correspSearch-API-URLs liefern keine Briefe

Schweregrad mittel. Eine correspSearch-API-URL im URL-Feld der Startseite lädt einen leeren Datensatz. `upload.js` und `cmif-parser.js` leiten URLs mit `correspsearch.net/api` an `fetchFromCorrespSearchUrl` in `correspsearch-api.js` weiter. Die Paginierung beginnt mit `x=0` und zählt um die Seitengröße hoch. Die API v2.0 nummeriert Seiten ab `x=1` und antwortet auf `x=0` mit einer leeren Seite, worauf die Schleife abbricht. Geprüft am 2026-10-28 mit Node gegen https://correspsearch.net/api/v2.0/tei-json.xql (CORS erlaubt, `x=1` liefert Briefe, das Modul liefert keine). Das Suchformular wurde in Phase 24 entfernt, `searchCorrespSearch` und `getResultCount` sind in `upload.js` importiert und ungenutzt. Das Modul war auf höchstens 5000 Briefe je Anfrage und 10 Briefe je Seite ausgelegt.

Nächster Schritt: entscheiden, ob das Laden über die correspSearch-API erhalten bleibt. Falls ja, Paginierung auf Seitennummern ab 1 umstellen und eine Obergrenze für große Treffermengen setzen. Falls nein, den API-Pfad aus `upload.js` und `cmif-parser.js` entfernen und US-02 anpassen.

## Vorhaben

### Tests und Prüfung

- Performance-Regressionstests für Filter auf großen Datensätzen
- CI mit Headless-Browser, etwa GitHub Actions mit Playwright (`npx playwright test`), für reine Logik ergänzend `node --test js/tests/`

### Architektur

- Migration von `explore.js` auf `state.getFilteredLetters()` abschließen, Legacy-Variablen entfernen ([architecture.md](architecture.md#migration-status))
- Ansichten aus `explore.js` in Module auslagern ([architecture.md](architecture.md#monolithisches-explorejs))

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)). Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze, Nachladen oder Paginierung für große
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

## Offene Entscheidungen und Abhängigkeiten

- Befund 8 verlangt die Entscheidung, ob der API-Ladepfad bleibt. Sie fällt vor jeder Änderung an `correspsearch-api.js`.
- Der unverschmolzene Branch `feature/research-dashboards` vergibt die Phasennummern 40 bis 46 und verändert `explore.js`. Größere Umbauten an `explore.js` auf main hängen von der Entscheidung über diesen Branch ab ([handoff.md](handoff.md)).

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
