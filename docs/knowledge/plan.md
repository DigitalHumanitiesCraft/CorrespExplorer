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

Die Nummern stammen aus dem früheren Dokument der bekannten Probleme und laufen weiter. Die behobenen Befunde 1 bis 11 und die Review-Befunde stehen im Journal, 6 bis 8 und 9 bis 11 in den Einträgen vom 2026-10-29. Die Befunde der Prüfung vom 2026-10-29 durch Subagenten sind behoben, was davon offen blieb, steht unter [Vorhaben](#vorhaben). Die Prüfung des Forschungswegs vom 2026-11-05 ergab die Befunde 12 bis 17. Behoben sind 12, 13, 14, 16 und 17 (Journal vom 2026-11-05), Befund 15 ist eine Entscheidungsfrage ([E5](#e5-lange-zeitspannen-in-zeitleiste-und-zeitraum)).

### 8. correspSearch-API-URLs liefern keine Briefe

Behoben am 2026-10-29 (`b80eff0`). Der Lader setzt `x` als Seitennummer ab 1, folgt `notesStmt/relatedItem[@type="next"]` und hört bei `API_DEFAULTS.correspSearchMaxLetters` auf. Geprüft gegen die API mit `d=1890-01-01` (87 Briefe auf 9 Seiten, 9 Anfragen) und mit gesenkter Obergrenze auf eine Abfrage mit 273 Treffern. Der Abschnitt bleibt als Ziel der Verweise auf diesen Befund stehen.

## Vorhaben

Die Punkte sind technisch und umkehrbar und brauchen keine Entscheidung des Operators. Sie wurden am 2026-11-05 nicht umgesetzt, weil sie mehr als einen kleinen Eingriff verlangen.

- Live-Prüfung von „Lebensdaten von Wikidata laden“ im Personen-Dialog. correspSearch-API und OpenFreeMap-Grundkarte sind am 2026-11-05 live geprüft
- Tastaturweg für die Sprachsegmente der Zeitleiste und die Verbindungen im Erwähnungsfluss. Jahresbalken, Netzwerkknoten und die Seitenknoten des Erwähnungsflusses haben einen
- `build_hsa_data.py` soll die Präzision von Absender, Empfänger und Absendeort wie der Parser klassifizieren. Den Briefen von `hsa-letters.json` fehlt das Feld `precision`, Personen- und Ortsmarkierungen bleiben beim HSA deshalb leer, auch für die 576 Briefe aus „Unbekannt“ ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis))

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)). Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze, Nachladen oder Paginierung für große
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

## Offene Entscheidungen und Abhängigkeiten

Der Branch `feature/research-dashboards` und die übrigen Branches bleiben bestehen, ihr Aufräumen liegt beim Operator. Das Journal des Branchs vergab die Phasennummern 40 bis 46, die sich mit Phase 40 auf main überschneiden. Der Merge übernahm sie nicht als Überschriften ([journal.md](journal.md)).

Die folgenden Fragen sind am 2026-11-05 so weit vorbereitet, dass der Operator mit Ja oder Nein entscheiden kann. Ja bedeutet die empfohlene Option.

### E1 Zurück-Knopf nimmt Ansichtswechsel zurück

- Stand: `updateUrlState()` schreibt die URL mit `replaceState` (`explore.js`), Zurück nach mehreren Ansichtswechseln führt zur Startseite. US-20 beschreibt das als gewollt.
- Option A: Ansichtswechsel mit `pushState`, Filteränderungen weiter mit `replaceState`, `popstate` stellt Ansicht und Filter aus der URL wieder her.
- Option B: alles bleibt `replaceState`.
- Empfehlung A. Ein Ansichtswechsel ist ein Navigationsschritt, den Forschende mit Zurück erwarten. Filterschritte über den Jahresregler erzeugen beim Ziehen viele Zustände und würden die Historie füllen. `state.fromURLParams()` liest bereits den ganzen Zustand, `popstate` braucht nur dieselbe Einlesung wie beim Laden.

### E2 Wissenskorb sammelt Personen und Orte als eigene Einträge

- Stand: Stern und Personen-Dialog legen die Briefe der Person ab, gedeckelt auf 100 (`btn-person-basket` in `explore.js`). Die Reiter Personen und Orte der Korbseite bleiben leer, die Seite trägt das Banner „In Arbeit“ (`wissenskorb.html`). `basket.js` und `wissenskorb.js` führen Personen und Orte bereits als eigene Listen, die Korbseite wertet die Briefe des Korbs zusammen mit allen Briefen seiner Personen und Orte aus ([architecture.md](architecture.md#datenfluss)).
- Option A: Stern einer Person oder eines Orts legt die Person oder den Ort ab, Briefe bleiben Briefe. Das Banner „In Arbeit“ entfällt.
- Option B: Der Korb bleibt ein Briefkorb, die Reiter Personen und Orte entfallen.
- Empfehlung A. Die Datenstruktur und die Auswertung der Korbseite sind dafür gebaut, die Obergrenze von 100 Briefen je Person verschwindet, und der Korb hält, was die Reiter versprechen.

### E3 Geteilte Links auf correspSearch-Abfragen laden die Abfrage neu

- Stand: Der Link trägt Ansicht und Filter, nicht die Abfrage. Empfänger landen seit 2026-11-05 mit Hinweis auf der Startseite.
- Option A: Der Explorer schreibt die API-URL als Parameter `cs=` in den Link und lädt sie beim Öffnen neu, zugelassen nur für Adressen, die `isCorrespSearchUrl()` annimmt (Host `correspsearch.net`, Pfad `/api/`).
- Option B: Es bleibt beim Hinweis.
- Empfehlung A. Die Abfrage ist öffentlich und reproduzierbar, nur der Zeitpunkt kann andere Treffer bringen. Die Prüfung über `isCorrespSearchUrl()` verhindert, dass ein Link beliebige Adressen laden lässt. ADR-006 betrifft Anfragen mit Personenbezug an Wikidata und GeoNames, das Neuladen der Datenquelle fällt nicht darunter, die ADR sollte das ausdrücklich sagen.

### E4 Export unterscheidet Normdateien und öffnet in Excel mit Umlauten

- Stand: `sender_id` und `recipient_id` tragen nur die Nummer (`export.js`), GND 118540238 und VIAF 261931943 sind in der Tabelle nicht unterscheidbar. Die CSV hat kein UTF-8-BOM.
- Option A: zwei neue Spalten `sender_authority` und `recipient_authority` (`gnd`, `viaf`), die vorhandenen Spalten bleiben unverändert, die CSV beginnt mit einem BOM.
- Option B: Format von US-21 unverändert.
- Empfehlung A. Neue Spalten brechen keine Auswertung, die nach Spaltennamen liest. Dass Excel eine UTF-8-CSV ohne BOM beim Doppelklick in der Systemkodierung liest, ist verbreitete Erfahrung, hier aber nicht geprüft, weil kein Excel zur Verfügung stand.

### E5 Lange Zeitspannen in Zeitleiste und Zeitraum

- Stand: Ein Brief mit `from="1822-12-09" to="1922-12-13"` zählt in Zeitleiste, Jahresfilter und Zeitraum des Datensatzes als Brief von 1822 (`classifyDate` setzt `year` aus dem Anfang). Die correspSearch-Abfrage für 1890 zeigt deshalb den Zeitraum 1822 bis 1890. Die Fixture `test-correspsearch.json` enthält solche Spannen.
- Option A: Briefe, deren Spanne über ein Jahr hinausreicht, stehen wie die undatierten Briefe in einem abgesetzten Balken „Zeitspanne“ und zählen nicht zum Zeitraum des Datensatzes.
- Option B: Anfangsjahr wie bisher, die Spanne steht nur im Tooltip und im Brief.
- Empfehlung A. Ein Jahrhundert als Anfangsjahr erfindet einen Ausschlag, das widerspricht NFR-04 und der Begründung, mit der die Heatmap Monats- und Jahresdaten aus den Tageszellen hält ([design.md](design.md#undatierte-briefe-als-abgesetzter-balken)).

### E6 Zielgröße der Heatmap-Zellen

- Stand: Die Zellen der Aktivitäts-Heatmap sind 12 x 12px (`.activity-cell` in `explore.css`), Ziel nach WCAG 2.2 SC 2.5.8 sind 24 x 24px. Einen Tastaturweg mit Roving Tabindex gibt es. axe-core meldet keinen Verstoß.
- Option A: Die Zellen bleiben 12px, [design.md](design.md#9-accessibility) begründet die Ausnahme „wesentliche Darstellung“ von SC 2.5.8 für das Kalenderraster.
- Option B: 24px-Zellen, der HSA-Kalender über rund 70 Jahre wird dafür viermal so groß und scrollt.
- Empfehlung A. Ein Tageskalender über Jahrzehnte ist nur als dichtes Raster lesbar, und Tastatur und Tooltip erreichen jede Zelle. Ob die Ausnahme trägt, ist eine Auslegung der Norm, keine Messung.

### E7 Kartenmarker ohne eigenen Tastaturweg

- Stand: Die Marker sind Teil der MapLibre-Fläche. Die Ortsansicht listet dieselben Orte mit Briefzahl und Filter per Tastatur.
- Option A: Die Ortsliste gilt als gleichwertige Alternative, die Karte bekommt einen sichtbaren Hinweis darauf.
- Option B: eigene fokussierbare Marker als HTML-Elemente über der Karte.
- Empfehlung A. Die Liste bietet dieselbe Funktion, eigene Marker müssten Clustering und Zoom von MapLibre nachbauen.

### E8 Lücken der Stories

Beim Abgleich der Stories mit dem Code am 2026-10-29 ([specification.md](specification.md#epics-und-user-stories)) blieben vier Kriterien ohne Umsetzung. Je Story ist Ja „umsetzen“, Nein „aus der Story streichen“.

- US-11 Netzwerk aus dem Briefwechsel (Kante Absender zu Empfänger, Stärke nach Briefanzahl, Mindestzahl der Briefe): Empfehlung umsetzen. „Wer schrieb wem“ ist die Grundfrage eines Korrespondenznetzes, beide Prüfagenten vom 2026-11-05 lasen das Zeitgenossen-Netz als solches und wurden getäuscht. Der Typ wäre ein dritter Eintrag in `network-type` neben Zeitgenossen und Themen.
- US-22 JSON-Export mit Indizes und Erwähnungen: Empfehlung umsetzen. Die Daten liegen im state-manager vollständig vor, der Export ist eine Serialisierung.
- US-05 Gruppierung der Timeline nach Dekade: Empfehlung streichen. Die Zeitleiste zeigt auch 70 Jahre lesbar, der Jahresregler grenzt ein.
- US-27 Top-5-Korrespondenten, Sprachverteilung und Ansichtsempfehlungen in der Übersicht: Empfehlung streichen. Die Forschungspfade der Übersicht zeigen die aktivsten Korrespondenten als Vorschau, die Sprachverteilung steht in der Zeitleiste.

### E9 Browser-Prüfung im Repository

- Stand: Die Browser-Prüfungen vom 2026-10-29 und 2026-11-05 liefen mit Python-Playwright-Skripten außerhalb des Repositorys. Eine CI gibt es nicht.
- Option A: ein Skript `tests/browser/smoke.py` im Repository (jede Ansicht ohne Konsolenfehler, Tour mit Escape, Demo-Link, geteilter HSA-Link, CSV-Spalten, axe-core ohne Verstöße), zunächst lokal, später als GitHub-Actions-Lauf zusammen mit `test.html?test=true`.
- Option B: weiter manuelle Läufe.
- Empfehlung A. Die Befunde vom 2026-10-29 und 2026-11-05 lagen alle in der Oberfläche, die der Test-Runner nicht sieht. Playwright ist ein Entwicklungswerkzeug und berührt die Regel „kein Build-Schritt“ für die Seite nicht.

### E10 Performance-Tests

- Option A: keine eigenen Performance-Tests, die Ladezeit des HSA im Browser-Smoke-Test (E9) mit großzügiger Grenze beobachten.
- Option B: Zeitmessungen der Filter im Test-Runner mit festen Grenzen.
- Empfehlung A. Feste Zeitgrenzen hängen vom Rechner ab und schlagen zufällig fehl. Am 2026-11-05 lud der HSA lokal in rund einer halben Sekunde.

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
