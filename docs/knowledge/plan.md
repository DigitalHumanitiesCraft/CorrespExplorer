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
updated: 2026-11-05
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

Die Nummern stammen aus dem früheren Dokument der bekannten Probleme und laufen weiter. Die behobenen Befunde 1 bis 11 und die Review-Befunde stehen im Journal, 6 bis 8 und 9 bis 11 in den Einträgen vom 2026-10-29. Die Befunde der Prüfung vom 2026-10-29 durch Subagenten sind behoben, was davon offen blieb, steht unter [Vorhaben](#vorhaben). Die Prüfung des Forschungswegs vom 2026-11-05 ergab die Befunde 12 bis 17. Behoben sind 12, 13, 14, 16 und 17, Befund 15 nach Entscheidung E5 (Journal vom 2026-11-05).

### 8. correspSearch-API-URLs liefern keine Briefe

Behoben am 2026-10-29 (`b80eff0`). Der Lader setzt `x` als Seitennummer ab 1, folgt `notesStmt/relatedItem[@type="next"]` und hört bei `API_DEFAULTS.correspSearchMaxLetters` auf. Geprüft gegen die API mit `d=1890-01-01` (87 Briefe auf 9 Seiten, 9 Anfragen) und mit gesenkter Obergrenze auf eine Abfrage mit 273 Treffern. Der Abschnitt bleibt als Ziel der Verweise auf diesen Befund stehen.

## Vorhaben

Die Punkte sind technisch und umkehrbar und brauchen keine Entscheidung des Operators. Sie wurden am 2026-11-05 nicht umgesetzt, weil sie mehr als einen kleinen Eingriff verlangen.

- Live-Prüfung von „Lebensdaten von Wikidata laden“ im Personen-Dialog. correspSearch-API und OpenFreeMap-Grundkarte sind am 2026-11-05 live geprüft
- Prüfung des CSV-Exports in Excel: Der Export trägt seit Entscheidung E4 ein UTF-8-BOM, ob Excel die Umlaute damit beim Doppelklick richtig zeigt, ist ungeprüft, weil kein Excel zur Verfügung stand
- GitHub-Actions-Lauf für `test.html?test=true` und `tests/browser/smoke.py` (zweiter Schritt von Entscheidung E9)
- Tastaturweg für die Sprachsegmente der Zeitleiste und die Verbindungen im Erwähnungsfluss. Jahresbalken, Netzwerkknoten und die Seitenknoten des Erwähnungsflusses haben einen
- `build_hsa_data.py` soll die Präzision von Absender, Empfänger und Absendeort wie der Parser klassifizieren. Den Briefen von `hsa-letters.json` fehlt das Feld `precision`, Personen- und Ortsmarkierungen bleiben beim HSA deshalb leer, auch für die 576 Briefe aus „Unbekannt“ ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis))

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)). Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze, Nachladen oder Paginierung für große
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

## Offene Entscheidungen und Abhängigkeiten

Der Branch `feature/research-dashboards` und die übrigen Branches bleiben bestehen, ihr Aufräumen liegt beim Operator. Das Journal des Branchs vergab die Phasennummern 40 bis 46, die sich mit Phase 40 auf main überschneiden. Der Merge übernahm sie nicht als Überschriften ([journal.md](journal.md)).

Die Fragen E1 bis E10 vom 2026-11-05 lagen mit Optionen und Empfehlung beim Operator. Er übertrug die technischen und umkehrbaren Entscheidungen der koordinierenden Session. E1 bis E7, E9 und E10 sind nach der Empfehlung umgesetzt und im [Journal](journal.md) festgehalten, ihre Begründungen stehen in den zuständigen Dokumenten ([specification.md](specification.md), [design.md](design.md), [testing.md](testing.md)).

### E8 Lücken der Stories

Wartet auf den Operator, weil das Streichen von User Stories eine inhaltliche Frage des Umfangs ist. Beim Abgleich der Stories mit dem Code am 2026-10-29 ([specification.md](specification.md#epics-und-user-stories)) blieben vier Kriterien ohne Umsetzung. Je Story ist Ja „umsetzen“, Nein „aus der Story streichen“.

- US-11 Netzwerk aus dem Briefwechsel (Kante Absender zu Empfänger, Stärke nach Briefanzahl, Mindestzahl der Briefe): Empfehlung umsetzen. „Wer schrieb wem“ ist die Grundfrage eines Korrespondenznetzes, beide Prüfagenten vom 2026-11-05 lasen das Zeitgenossen-Netz als solches. Der Typ wäre ein dritter Eintrag in `network-type` neben Zeitgenossen und Themen.
- US-22 JSON-Export mit Indizes und Erwähnungen: Empfehlung umsetzen. Die Daten liegen im state-manager vollständig vor, der Export ist eine Serialisierung.
- US-05 Gruppierung der Timeline nach Dekade: Empfehlung streichen. Die Zeitleiste zeigt auch 70 Jahre lesbar, der Jahresregler grenzt ein.
- US-27 Top-5-Korrespondenten, Sprachverteilung und Ansichtsempfehlungen in der Übersicht: Empfehlung streichen. Die Forschungspfade der Übersicht zeigen die aktivsten Korrespondenten als Vorschau, die Sprachverteilung steht in der Zeitleiste.

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
