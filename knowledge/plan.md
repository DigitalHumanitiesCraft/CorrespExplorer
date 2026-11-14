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
updated: 2026-11-14
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

Ein Zielbild für eine nächste Ausbaustufe ist nicht festgelegt. Als Fixpunkt gilt, dass main der über GitHub Pages ausgelieferte Stand bleibt, die offenen Befunde behoben oder begründet verworfen werden und der Browser-Test-Runner ohne Fehlschlag läuft. Seit 2026-10-29 enthält main den Stand des früheren Branchs `feature/research-dashboards` (Merge `14b2d17`).

## Offene Befunde

Die Nummern stammen aus dem früheren Dokument der bekannten Probleme und laufen weiter. Die behobenen Befunde 1 bis 11 und die Review-Befunde stehen im Journal, 6 bis 8 und 9 bis 11 in den Einträgen vom 2026-10-29. Die Befunde der Prüfung vom 2026-10-29 durch Subagenten sind behoben, was davon offen blieb, steht unter [Vorhaben](#vorhaben). Die Prüfung des Forschungswegs vom 2026-11-05 ergab die Befunde 12 bis 17. Behoben sind 12, 13, 14, 16 und 17, Befund 15 nach Entscheidung E5 (Journal vom 2026-11-05).

### 8. correspSearch-API-URLs liefern keine Briefe

Behoben am 2026-10-29 (`b80eff0`). Der Lader setzt `x` als Seitennummer ab 1, folgt `notesStmt/relatedItem[@type="next"]` und hört bei `API_DEFAULTS.correspSearchMaxLetters` auf. Geprüft gegen die API mit `d=1890-01-01` (87 Briefe auf 9 Seiten, 9 Anfragen) und mit gesenkter Obergrenze auf eine Abfrage mit 273 Treffern. Der Abschnitt bleibt als Ziel der Verweise auf diesen Befund stehen.

## Vorhaben

Die Punkte sind technisch und umkehrbar und brauchen keine Entscheidung des Operators. Sie wurden am 2026-11-05 nicht umgesetzt, weil sie mehr als einen kleinen Eingriff verlangen.

- Sichtprüfung der neun Ansichten neben Übersicht, Briefen und Karte und der Tour mit der zweizeiligen Kopfzeile vom 2026-11-10, dazu ein Lauf von `tests/browser/smoke.py` und axe auf dem neuen Stand
- Live-Prüfung von „Lebensdaten von Wikidata laden“ im Personen-Dialog. correspSearch-API und OpenFreeMap-Grundkarte sind am 2026-11-05 live geprüft
- Prüfung des CSV-Exports in Excel: Der Export trägt seit Entscheidung E4 ein UTF-8-BOM, ob Excel die Umlaute damit beim Doppelklick richtig zeigt, ist ungeprüft, weil kein Excel zur Verfügung stand
- GitHub-Actions-Lauf für `test.html?test=true` und `tests/browser/smoke.py` (zweiter Schritt von Entscheidung E9)
- Gleichnamige Komponentenklassen in Seiten-CSS, die nie zusammen geladen werden (`.empty-state` in explore.css und wissenskorb.css, `.progress-bar` und `.progress-text` in explore.css und upload.css, `.error-message` in style.css und upload.css), auf je eine Komponente in components.css zurückführen
- Tastaturweg für die Sprachsegmente der Zeitleiste und die Verbindungen im Erwähnungsfluss. Jahresbalken, Netzwerkknoten und die Seitenknoten des Erwähnungsflusses haben einen
- `build_hsa_data.py` soll die Präzision von Absender, Empfänger und Absendeort wie der Parser klassifizieren. Den Briefen von `hsa-letters.json` fehlt das Feld `precision`, Personen- und Ortsmarkierungen bleiben beim HSA deshalb leer, auch für die 576 Briefe aus „Unbekannt“ ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis))

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)). Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze, Nachladen oder Paginierung für große
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

### Offen aus der Iteration vom November 2026

- Ein Link vom Brief in die Edition fehlt für Briefsätze. Die Quelle trägt je Brief eine PID (`idno type="PID"`), aus der sich nur mit Wissen über das Repositorium eine URL bilden lässt. Eine allgemeine Regel dafür gibt es nicht.
- Datierungen nur als Text („12. V. 1938“) stehen nicht auf der Zeitachse, weil das Werkzeug Datumsnotationen nicht normalisiert. Ein Jahr aus solchem Text zu lesen wäre eine Deutung und braucht eine Entscheidung.
- `textLang` der Briefsätze wird nicht als Briefsprache gelesen.
- Suche und Sortierung der Briefliste und die Auswahl „Anzeigen“ der Korrespondenten stehen nicht in der URL.
- Zweite Prüfrunde, nicht behoben: Der Forschungspfad zum Ego-Netzwerk lässt „Weiter“ ohne Personenwahl zu und zeigt dann die ungefilterte Chronik. Der Vergleich rechnet unter einem aktiven Filter der Seitenleiste und nennt das nur im Hinweissatz. Bei 360 Pixel ist die Zeitleiste flach und zeigt nur die ersten Jahrzehnte, eine Personenzeile braucht vier bis fünf Textzeilen. Tooltips der Ansichtsleiste bleiben nach einem Klick stehen. Browser-Zurück aus der Briefliste behält den gesetzten Filter. Für ein Jahr nennt die Jahresauswahl der Aktivität einen tagesgenauen Brief mehr, als die Heatmap zeichnet (Ursache nicht untersucht). Die Monate der Heatmap sind nicht anklickbar. Die Dialoge sind `div role="dialog"` statt `<dialog>`.
- Die Dichtemessung des ersten Bildschirms liegt in mehreren Ansichten über den Grenzwerten, vor allem durch die Seitenleiste (fünf Überschriften und ihre Kästen in jeder Ansicht). Das gehört zu E11.
- Im HSA markiert weiter „?“ einen Ort ohne Koordinaten, obwohl das Zeichen sonst eine unsichere Datierung meint.
- Die CSV-Spalte `date_certainty` schreibt „high“, wo die Quelle keine Sicherheit nennt.
- Die Zeitleiste ruft die Überlieferungsfilter über die Checkboxen der Seitenleiste auf (im Code als bewusste Abkürzung vermerkt), eine Abhängigkeit aus `explore.js` wäre der saubere Weg.
- Ob die Chronik für Bestände ohne Anreicherung in der oberen Navigation bleibt, entscheidet der Operator mit E11.
- Was der Datenprüfung für Stefan Zweig Digital auffiel (falsches Jahrhundert, vertauschte Namensteile, abweichende Einträge desselben Briefs, Schreibweise des Reihentitels), steht in [data.md](data.md#stefan-zweig-digital-tei-auf-briefebene-kein-cmif) und ist eine Rückmeldung an die Edition, keine Aufgabe des Werkzeugs.

## Offene Entscheidungen und Abhängigkeiten

### E11 Entlastung der Oberfläche

Der Operator hat die Oberfläche am 2026-11-10 als überladen beanstandet. Die Defekte sind behoben ([Journal](journal.md)). Zur Entscheidung liegt ein Oberflächenplan vor, außerhalb des Repositorys im Berichtsordner der koordinierenden Session. Er fragt, ob vier selten gebrauchte Ansichten (Erwähnungen, Chronik, Aktivität, Vergleich) unter einem Punkt Mehr stehen, ob die Startansicht auf Kennzahlen und Einstiege gekürzt wird und die Forschungspfade eine eigene Ansicht erhalten, ob die Sprachfarben einer Palette mit höchstens sechs unterscheidbaren Farben und einem zweiten Merkmal weichen, ob die Grundschrift auf 16px steigt und ob das Netzwerk beim Referenzdatensatz mit benannten Knoten öffnet. Eine Rechnung der Sprachfarben unter simulierter Farbsehschwäche (Matrizen nach Machado, Oliveira und Fernandes 2009, Abstand in CIELAB) fand in beiden Paletten mehrere Paare unter der Unterscheidbarkeit, in der Pastellpalette der Karte etwa Deutsch und Englisch bei Grünschwäche. Die Rechnung ersetzt keine Prüfung mit Betroffenen.

Der Branch `feature/research-dashboards` besteht nach dem Merge weder lokal noch auf origin (lokale Remote-Referenzen am 2026-11-10). Das Aufräumen der übrigen Branches liegt beim Operator. Das Journal des Branchs vergab die Phasennummern 40 bis 46, die sich mit Phase 40 auf main überschneiden. Der Merge übernahm sie nicht als Überschriften ([journal.md](journal.md)).

Die Fragen E1 bis E10 vom 2026-11-05 lagen mit Optionen und Empfehlung beim Operator. Er übertrug die technischen und umkehrbaren Entscheidungen der koordinierenden Session und entschied E8 selbst. E1 bis E10 sind nach der Empfehlung umgesetzt und im [Journal](journal.md) festgehalten, ihre Begründungen stehen in den zuständigen Dokumenten ([specification.md](specification.md), [design.md](design.md), [testing.md](testing.md)).

### E8 Lücken der Stories

Entschieden vom Operator am 2026-11-05 nach der Empfehlung: US-11 (Netzwerk aus dem Briefwechsel) und US-22 (JSON-Export mit Indizes und Erwähnungen) sind umgesetzt, die offenen Kriterien von US-05 (Dekadengruppierung) und US-27 (Top-5-Korrespondenten, Sprachverteilung, Ansichtsempfehlungen) gestrichen. Begründung in [ADR-007](specification.md#adr-007-umfang-der-stories-nach-dem-abgleich-mit-dem-code), Umsetzung im [Journal](journal.md).

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
