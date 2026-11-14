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
related: [specification, testing, journal]
---

# Plan

Der Plan führt die offenen Befunde und angenommenen Vorhaben auf main. Erledigtes wandert ins [Journal](journal.md), Entscheidungen in die [Specification](specification.md#entscheidungen).

## Zielbild

Ein Zielbild für eine nächste Ausbaustufe ist nicht festgelegt. Als Fixpunkt gilt, dass main der über GitHub Pages ausgelieferte Stand bleibt, die offenen Befunde behoben oder begründet verworfen werden und der Browser-Test-Runner ohne Fehlschlag läuft.

## Offene Befunde

Nummerierte Befunde sind zurzeit keine offen. Die Befunde 1 bis 17 sind behoben oder entschieden und stehen im [Journal](journal.md), ein neuer Befund erhält die nächste Nummer.

### Offen aus der Iteration vom November 2026

Die Iteration an Briefsätzen ([Journal vom 2026-11-14](journal.md)) und ihre zwei Prüfrunden durch Browser-Agenten ([testing.md](testing.md#aufgabenprüfung-durch-browser-agenten)) ließen offen:

Daten und Parser

- Ein Link vom Brief in die Edition fehlt für Briefsätze. Die Quelle trägt je Brief eine PID (`idno type="PID"`), aus der sich nur mit Wissen über das Repositorium eine URL bilden lässt. Eine allgemeine Regel dafür gibt es nicht.
- Datierungen nur als Text („12. V. 1938“) stehen nicht auf der Zeitachse, weil das Werkzeug Datumsnotationen nicht normalisiert. Ein Jahr aus solchem Text zu lesen wäre eine Deutung und braucht eine Entscheidung.
- `textLang` der Briefsätze wird nicht als Briefsprache gelesen.
- Die CSV-Spalte `date_certainty` schreibt „high“, wo die Quelle keine Sicherheit nennt.
- Im HSA markiert „?“ einen Ort ohne Koordinaten, obwohl das Zeichen sonst eine unsichere Datierung meint.

Bedienung

- Der Forschungspfad zum Ego-Netzwerk lässt „Weiter“ ohne Personenwahl zu und zeigt dann die ungefilterte Chronik.
- Der Vergleich rechnet unter einem aktiven Filter der Seitenleiste und nennt das nur im Hinweissatz.
- Browser-Zurück aus der Briefliste behält den gesetzten Filter.
- Suche und Sortierung der Briefliste und die Auswahl „Anzeigen“ der Korrespondenten stehen nicht in der URL.
- Tooltips der Ansichtsleiste bleiben nach einem Klick stehen.
- Die Monate der Heatmap sind nicht anklickbar.
- Für ein Jahr nennt die Jahresauswahl der Aktivität einen tagesgenauen Brief mehr, als die Heatmap zeichnet. Die Ursache ist nicht untersucht.
- Bei 360 Pixel ist die Zeitleiste flach und zeigt nur die ersten Jahrzehnte, eine Personenzeile braucht vier bis fünf Textzeilen.

Code

- Die Dialoge sind `div role="dialog"` mit eigener Fokusfalle statt `<dialog>` mit `showModal()`.
- `explore.js` hält die Filtereingaben als Modulvariablen neben dem state-manager und gleicht beide in `applyFilters()` ab ([architecture.md](architecture.md#entwurfsmuster)). Ein Besitzer des Filterzustands würde den Abgleich ersparen.

Nicht geprüft sind 200 Prozent Browser-Zoom, axe-core auf dem neuen Stand und die Ansichten Themen und Erwähnungen mit Briefsätzen.

## Vorhaben

Die Punkte sind technisch und umkehrbar und brauchen keine Entscheidung des Operators.

- Live-Prüfung von „Lebensdaten von Wikidata laden“ im Personen-Dialog. correspSearch-API und OpenFreeMap-Grundkarte sind am 2026-11-05 live geprüft
- Prüfung des CSV-Exports in Excel: Der Export trägt seit Entscheidung E4 ein UTF-8-BOM, ob Excel die Umlaute damit beim Doppelklick richtig zeigt, ist ungeprüft, weil kein Excel zur Verfügung stand
- GitHub-Actions-Lauf für `test.html?test=true` und `tests/browser/smoke.py` (zweiter Schritt von Entscheidung E9)
- Gleichnamige Komponentenklassen in Seiten-CSS, die nie zusammen geladen werden (`.empty-state` in explore.css und wissenskorb.css, `.progress-bar` und `.progress-text` in explore.css und upload.css, `.error-message` in style.css und upload.css), auf je eine Komponente in components.css zurückführen
- Tastaturweg für die Sprachsegmente der Zeitleiste und die Verbindungen im Erwähnungsfluss. Jahresbalken, Netzwerkknoten und die Seitenknoten des Erwähnungsflusses haben einen
- `build_hsa_data.py` soll die Präzision von Absender, Empfänger und Absendeort wie der Parser klassifizieren. Den Briefen von `hsa-letters.json` fehlt das Feld `precision`, Personen- und Ortsmarkierungen bleiben beim HSA deshalb leer ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis))

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)), das Nachladen langer Listen mit der Briefliste vom November 2026. Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

## Offene Entscheidungen und Abhängigkeiten

### E11 Entlastung der Oberfläche

Der Operator hat die Oberfläche am 2026-11-10 als überladen beanstandet. Die Defekte sind behoben ([Journal](journal.md)). Zur Entscheidung liegt ein Oberflächenplan vor, außerhalb des Repositorys im Berichtsordner der koordinierenden Session. Er fragt, ob vier selten gebrauchte Ansichten (Erwähnungen, Chronik, Aktivität, Vergleich) unter einem Punkt Mehr stehen, ob die Startansicht auf Kennzahlen und Einstiege gekürzt wird und die Forschungspfade eine eigene Ansicht erhalten, ob die Sprachfarben einer Palette mit höchstens sechs unterscheidbaren Farben und einem zweiten Merkmal weichen, ob die Grundschrift auf 16px steigt und ob das Netzwerk beim Referenzdatensatz mit benannten Knoten öffnet. Eine Rechnung der Sprachfarben unter simulierter Farbsehschwäche (Matrizen nach Machado, Oliveira und Fernandes 2009, Abstand in CIELAB) fand in beiden Paletten mehrere Paare unter der Unterscheidbarkeit, in der Pastellpalette der Karte etwa Deutsch und Englisch bei Grünschwäche. Die Rechnung ersetzt keine Prüfung mit Betroffenen.

Zu E11 gehören seit der Iteration vom November 2026 zwei weitere Punkte. Die Dichtemessung des ersten Bildschirms liegt bei 1280 Pixel in jeder gemessenen Ansicht über mindestens einem Grenzwert, vor allem durch die Seitenleiste mit ihren Überschriften und Kästen. Die zweite Prüfrunde nannte die Chronik für Bestände ohne Anreicherung eine Briefliste in anderer Form, ob sie in der oberen Navigation bleibt, entscheidet der Operator.

### Beurteilung der Iteration vom November 2026

Die Beurteilung am laufenden Explorer und die fachliche Abnahme durch den Operator stehen aus, ebenso der Push, der die öffentliche Seite ändert. Die Rückmeldung an die Edition zu den Datenbefunden ([data.md](data.md#stefan-zweig-digital-tei-auf-briefebene-kein-cmif)) liegt beim Operator.

### Branches

Das Aufräumen der Branches neben main liegt beim Operator.

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
