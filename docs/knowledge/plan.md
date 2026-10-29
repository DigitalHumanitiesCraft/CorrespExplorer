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
updated: 2026-10-29
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

Die Nummern stammen aus dem früheren Dokument der bekannten Probleme und laufen weiter. Die behobenen Befunde 1 bis 8 und die Review-Befunde stehen im Journal, 6 bis 8 im Eintrag vom 2026-10-29.

### 8. correspSearch-API-URLs liefern keine Briefe

Behoben am 2026-10-29 (`b80eff0`). Der Lader setzt `x` als Seitennummer ab 1, folgt `notesStmt/relatedItem[@type="next"]` und hört bei `API_DEFAULTS.correspSearchMaxLetters` auf. Geprüft gegen die API mit `d=1890-01-01` (87 Briefe auf 9 Seiten, 9 Anfragen) und mit gesenkter Obergrenze auf eine Abfrage mit 273 Treffern. Der Abschnitt bleibt als Ziel der Verweise auf diesen Befund stehen.

### 9. Statische Koordinatentabelle ordnet IDs falsch zu

Schweregrad mittel. `docs/data/geonames_coordinates.json` ergänzt beim Upload Orte ohne Koordinaten. 13 ihrer 58 Einträge tragen zu einer GeoNames-ID Namen und Koordinaten einer anderen Stadt. Der Tutorial-Datensatz zeigt deshalb Genf (ID 2660646) bei Bern. Herkunft und Prüfung stehen in [data.md](data.md#herkunft-von-docsdatageonames_coordinatesjson). Die Datei ist Datenbestand und blieb unverändert.

Nächster Schritt: Der Operator entscheidet zwischen drei Wegen. Die Tabelle aus GeoNames neu erzeugen und die Quelle dokumentieren, sie durch die Wikidata-Tabelle `data/geonames_coordinates.json` ersetzen, die schon `build_hsa_data.py` speist, oder den statischen Schritt in `upload.js` entfernen und Koordinaten nur über die Wikidata-Anreicherung auflösen.

### 10. Personendetails fragen Wikidata ohne Zustimmung ab

Schweregrad niedrig. Der Personen-Dialog fragt beim Öffnen die Normdaten-ID der Person bei Wikidata ab (`showPersonDetail` in `explore.js`), während die Chronik und der Upload die Anreicherung erst auf ausdrücklichen Klick starten. Die Anfrage enthält nur die Normdaten-ID einer historischen Person.

Nächster Schritt: Der Operator entscheidet, ob der Dialog die Anreicherung erst auf Klick lädt.

### 11. Restliche Befunde der Prüfung vom 2026-10-29

Die Code- und Oberflächenprüfung nach dem Merge ergab weitere Punkte, die nicht behoben sind. Sie stammen aus dem Lesen des Codes und sind nur teils im Browser nachvollzogen.

- Ein Klick auf den Balken der undatierten Briefe setzt den Zeitregler auf das erste Jahr, weil noUiSlider Werte unter dem Minimum begrenzt. Ein Klick auf ein Sprachsegment ohne passende Checkbox (`_total`) liefert keine Briefe.
- Werden alle Sprachen abgewählt, zeigt der Explorer alle Briefe.
- `yearMin`, `yearMax` und `langs` aus der URL werden beim Laden nicht zuverlässig angewandt.
- Der Korb und der Wissenspfad sind nicht an einen Datensatz gebunden und erscheinen nach einem Wechsel des Datensatzes weiter.
- Die Analyseseite des Korbs wertet in Zeitleiste, Netzwerk und Karte nur die Personen des Korbs aus.
- `showPersonDetail` kann bei schnellem Wechsel die Antwort einer früheren Person in den Dialog schreiben.
- Das Zeitgenossen-Netzwerk vergleicht alle Absenderpaare und kann bei mehreren tausend Absendern lange rechnen.
- Im Sprachindex der HSA-Datei steht `None` für Ladinisch, die Oberfläche zeigt ihn als „Ohne Angabe“ ([data.md](data.md#hugo-schuchardt-archiv)).
- Doppelte Logik: zwei Toast-Implementierungen (`utils.js`, `explore.js`), `buildIndices` und `cleanId` in Parser und correspSearch-Lader, zwei Tabellen für Sprachbezeichnungen (`constants.js`, `cmif-parser.js`), Öffnen und Schließen der Dialoge in jedem Modul. Jede Testdatei definiert ihr eigenes `assert`.

## Vorhaben

### Tests und Prüfung

- CI mit Headless-Browser, etwa ein GitHub-Actions-Lauf von `test.html?test=true` mit Playwright
- Regressionstests für `csvCell` und die Transformation der correspSearch-Antwort, sobald ein Fixture dafür im Repository liegt
- Performance-Regressionstests für Filter auf großen Datensätzen

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)). Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze, Nachladen oder Paginierung für große
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

## Offene Entscheidungen und Abhängigkeiten

- Befund 9: Umgang mit der statischen Koordinatentabelle.
- Befund 10: Wikidata-Abfrage im Personen-Dialog erst auf Klick.
- Die Qualitäts-Chips der Startansicht färben Datierung, Identifizierung und Georeferenzierung als Ampel, rot unter 40 Prozent. Ob das der nicht wertenden Sprache von ADR-005 widerspricht, entscheidet der Operator ([design.md](design.md#startansicht-und-navigation)).
- Der Branch `feature/research-dashboards` und die übrigen Branches bleiben bestehen, ihr Aufräumen liegt beim Operator. Das Journal des Branchs vergab die Phasennummern 40 bis 46, die sich mit Phase 40 auf main überschneiden. Der Merge übernahm sie nicht als Überschriften ([journal.md](journal.md)).

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
