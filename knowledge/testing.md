---
title: Testing
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2025-12-03
updated: 2026-11-15
authors: [Christopher Pollin]
template:
  name: Vorlage Testing
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-testing
related: [architecture, data, specification, uncertainty-specification, plan]
---

# Testing

Die Prüfung von CorrespExplorer hat fünf Ebenen: Modultests im Browser an echten Datendateien, einen Browser-Smoke-Test des Wegs durch die Seiten, eine Korpusprüfung des Parsers an Beständen außerhalb des Repositorys, Messungen der Oberfläche und Aufgabenprüfungen durch Agenten, die den Browser bedienen. Seit 2026-11-14 kommt ein fester Aufgabensatz hinzu, dessen Antworten ein Skript aus den Daten berechnet und der in jeder Runde erneut läuft. Grüne Tests schließen Fehler der Oberfläche nicht aus, das zeigten alle Durchsichten seit Oktober 2026. Eine CI gibt es nicht.

## Teststrategie

| Ebene | Werkzeug | Fehlerklasse, die nur sie sieht |
|---|---|---|
| Modultests | `docs/test.html` mit den Suites aus `docs/js/tests/run-all-tests.js` | falsche Logik in Parser, Zählung, Filter, URL-Zustand, Export, Geometrie der Figuren |
| Smoke-Test | `tests/browser/smoke.py` (Playwright, Chrome headless) | Fehler, die nur die geladene Seite zeigt: Laden, Konsole, Navigation, Historie, Export, Startfigur |
| Korpusprüfung | `verification/check-corpus.mjs` | Parserfehler an einem ganzen echten Bestand, der nicht gebündelt werden darf |
| Messung | Dichtemessung des ersten Bildschirms, Kontrastrechnung, Bildrate | zu viele Ebenen und Flächen, zu geringer Kontrast, langsames Zeichnen |
| Aufgabenprüfung | Agenten mit Browser, fester Aufgabensatz | ob Forschende ihre Fragen in der Oberfläche beantworten können |

Tests verwenden keine Mock-Daten. Sie laden echte XML-Dateien aus `docs/data/` über die Produktionsfunktion `parseCMIF`, wo sie die Indexform der Vorprozessierung brauchen, `docs/data/hsa-letters.json` unverändert (Entscheidung des Operators vom 2026-10-30). Ein neuer Fall wird als Brief in eine Fixture-Datei aufgenommen. Tests importieren die echten Funktionen und duplizieren keine Helfer.

## Was garantiert ist

Für jede Prüfung: ob sie gegen den Code läuft, den das Werkzeug nutzt, ob sie die echten Daten abdeckt, und ob sie fehlschlagen kann.

| Prüfung | Was sie behauptet | Code des Werkzeugs | echte Daten | kann fehlschlagen |
|---|---|---|---|---|
| Suite CMIF Parser | Briefsätze, Unsicherheit, weitere Handlungen, Datumsgrenzen, Registerkennungen, Entsprechungen, Zusammenführung, unplausible Jahre | ja, `cmif-parser.js` und `utils.js` | Fixtures, darunter unverändert übernommene Einträge dreier Grazer Editionen | ja |
| Suites Aggregation, State Manager, Selection | Zählungen aus den Briefen, Filter, URL-Zustand mit Jahr, Gegenüber und Briefauszug, Marken und Zahl der Auswahlzeile (`selectionMarks()`, `drawerCountText()`) | ja | Fixtures und das ganze HSA | ja |
| Suites Spacetime, Network, Topics | Aggregation und Geometrie von Raum-Zeit und Korrespondenzkreis, Zählung, Ordnung, feste Tönungsskala und Treemap der Themen | ja, über die exportierten reinen Funktionen | das ganze HSA, Raster und Anteile gegen eine unabhängige Zählung für Paris 1882 bis 1892 | ja |
| Suite Letters (seit `c6185bc`) | Briefe ohne Platz auf der Zeitachse, Datumsordnung, Richtung von der zentralen Person aus, Gruppen nach Jahr und Monat, Jahresprofil | ja, `letters-view.js` | Fixtures und das HSA, die Spalten 1913 und ohne Jahr gegen eine eigene Zählung der Datei | ja |
| Suite Time (seit `c6185bc`) | Intervall eines Briefs auf der Achse, Wahl der Auflösung, Seite eines Briefs zur zentralen Person, Briefe und Abschnitte eines Zeitraums | ja, `timeline-view.js` | das HSA für 1912 und 1900 bis 1905 gegen eine getrennte Zählung | ja |
| Suite Dashboard (seit `c6185bc`) | Zählungen der Startansicht, `countOf()`, `languageOrder()` und `dominantLanguages()`, Rahmen und Projektion der kleinen Karte | ja, `overview-view.js`, `selection-ui.js`, `mini-figures.js` | Fixtures und das HSA | ja |
| Suite Compose (seit `b189cb5`) | `composeFigure()` für reines CMIF, Briefsätze ohne Koordinaten, einen erweiterten Bestand, Bestände ohne Datum und erwähnte Orte ohne Koordinaten, `missingSentence()` | ja, `start-compose.js` | Zusammenfassungen aus Fixtures | ja |
| Suites Formatters, Security, Basket, correspSearch, DOM Cache | Anzeige der Unsicherheit, Escaping, Korb, API-Antworten, DOM-Zugriff | ja | Fixtures, HSA, zwei gespeicherte API-Antworten | ja |
| Suite Research Paths and Export | Zählungen aus `summarizeCorpus()`, Korbauswahl einer Ansicht (`basketSelectionForView()`), CSV- und JSON-Export, Filtersatz, Personenindex mit Normdaten | ja, `research-paths.js`, `knowledge-path.js`, `export.js`, `view-support.js`, `utils.js` | Fixtures und das HSA | ja |
| Suite Demo | Standardschwelle, Kanten, Ego und Organisationen des Netzwerks an der Testdatei `demo-showcase.xml`, escapte Tabelle der Textalternative an `test-hostile.xml` | ja, `network-view.js` und `view-support.js` | nur Testdateien, darunter die synthetische Datei des früheren Tutorials | ja |
| Smoke-Test | siehe [Browser-Smoke-Test](#browser-smoke-test) | ja, die ausgelieferten Seiten | HSA, die Testdatei `demo-showcase.xml` über den Datei-Upload der Startseite | ja, Exit-Code nur bei vollem Erfolg 0 |
| Korpusprüfung | jeder Eintrag eines Bestands entspricht seiner Quelldatei | ja, der Parser über jsdom | ein ganzer externer Bestand | ja |
| Fester Aufgabensatz | die Oberfläche gibt die aus den Daten berechnete Antwort | die Oberfläche, bedient von Hand oder von einem Agenten | das ganze HSA | ja, sobald jemand die Antwort abliest |

Die Modultests prüfen nicht das gezeichnete Bild (D3, MapLibre, Zeichenflächen), nicht die Aggregationen, die nur in `explore.js` stehen, und keine externen Dienste.

## Abnahme

| Frage | Methode | Ebene | Stand |
|---|---|---|---|
| Liest das Werkzeug, was die Quelle sagt? | Modultests, Korpusprüfung, unabhängige Datenprüfung | automatisch und durch Agenten | Datenprüfung am Bestand von Stefan Zweig Digital vom 2026-11-14 ohne verlorenen oder doppelten Eintrag, die gefundenen Parserfehler behoben ([Journal](journal.md)) |
| Zeigt jede Ansicht die richtige Zahl? | fester Aufgabensatz | Aufgabe mit berechneter Antwort | Antworten berechnet, in der Oberfläche noch nicht abgelesen |
| Lässt sich die Oberfläche bedienen? | Bedienprüfung durch Agenten mit Zeiger und Tastatur | Agent im Browser | Raum-Zeit am 2026-11-14 geprüft und umgebaut |
| Dient sie den Forschenden? | Urteil am Bildschirm | Operator, Forschende | nichts abgenommen. Gutgeheißen hat der Operator die Startansicht im Stand von `b189cb5`, die Startseite als Figur und die Wahl von Raster und Anteile ([design.md](design.md)) |

## Feste Aufgaben

Jede Story in [specification.md](specification.md#epics-und-user-stories) hat eine Aufgabe am gebündelten Hugo Schuchardt Archiv mit einer Rechenregel. Ein Skript berechnet die Antworten aus `docs/data/hsa-letters.json`, ohne Code des Werkzeugs zu laden. In jeder Runde liest ein Mensch oder ein Agent die Antwort in der Oberfläche ab, eine Abweichung ist ein Befund und wird einer Story, der Gestaltung oder den Daten zugeordnet. Die Arbeitsweise hat der Operator am 2026-11-14 angenommen.

Das Skript lag am 2026-11-14 im Arbeitsordner der distillierenden Session und ist nicht Teil des Repositorys ([plan.md](plan.md#aufgabensatz-und-prüfungen)). Seine Regeln stehen in der Specification. Seit dem Umbau der Ansichten hat niemand die Antworten in der Oberfläche abgelesen.

Berechnete Antworten, Stand 2026-11-14, Datei `hsa-letters.json` mit `meta.generated` 2026-10-29:

| Story | Antwort |
|---|---|
| US-03, US-19 | 11.576 Briefe |
| US-01, US-02 | 11.576 `correspDesc` in `hsa.xml` |
| US-04, US-22 | 1.031 Personen (852 mit Normdaten-ID), 774 Orte |
| US-27 | 10.991 Briefe auf den Tag datiert |
| US-40 | 6.551 Briefe mit erwähnten Personen |
| US-11 | Georges Lacombe, 524 Briefe, vor Julio de Urquijo Ybarra (521) und Leo Spitzer (447) |
| US-42 | 1.030 Korrespondenten um Schuchardt |
| US-06 | Graz (2778067), 2.371 Briefe |
| US-07 | 1.851 Briefe Schuchardts aus Graz |
| US-08 | 139 Orte mit GeoNames-ID ohne Koordinaten |
| US-41 | Paris, 1912 mit 56 Briefen |
| US-24, US-26 | „Publikationsversand“, 627 Briefe. Mit den Sprachen als Themen stünde „Baskisch“ (Lexvo) mit 698 Briefen vorn |
| US-25 | José Leite de Vasconcelos, 41 Briefe |
| US-44 | Höhepunkt 1883 mit 33 Briefen |
| US-43 | 295 Briefe im Jahr 1900 |
| US-10, US-36 | 447 Briefe mit Leo Spitzer |
| US-09 | Georges Lacombe an zweiter Stelle nach Schuchardt |
| US-12, US-28 | `o:hsa.letter.8720`, 1859-01-12, Felix von Brusselle an Schuchardt |
| US-13 | zwei Personen, zwei Orte, zwei Themen |
| US-14 | https://gams.uni-graz.at/o:hsa.letter.654 |
| US-16 | 1.393 französische Briefe |
| US-18 | 284 Briefe |
| US-23 | VIAF 71397982 |
| US-37 | ein gemeinsamer Korrespondent, Hugo Schuchardt |
| US-05 | 1912 mit 510 Briefen, 304 Briefe ohne Datum |
| US-15, US-32 | 2.314 Briefe von 1900 bis 1910 |
| US-31 | erster Brief `o:hsa.letter.1426` am 1912-02-03, 447 Briefe |
| US-34 | 1912-02-04 mit 23 Briefen |
| US-20 | 270 Briefe |
| US-21 | 980 Zeilen |
| US-35 | 2.371 Briefe |
| US-39 | 304 Briefe „Ohne Datum“, alle übrigen Merkmale null |
| US-46 | keine Figur zu Poststempeln, kein Brief hat `postmark` (Stand 2026-11-15) |
| US-47 | wie US-06 |
| US-48 | wie US-16 |

Keine berechnete Antwort haben US-29 und US-30 (Wikidata), US-38 (geprüft mit der Korpusprüfung), US-45 (nicht bedient), US-17, US-32 und US-33 (nicht mehr bedient). Für US-28 und US-34 ist die Antwort berechnet, die Darstellung, in der sie abzulesen war, ist entfallen. Am 2026-11-15 hat die kuratierende Session in der Tabelle der unteren Zeitfigur die Antworten zu US-28 und US-31 abgelesen und die 23 Briefe vom 4.2.1912 gezählt, den briefreichsten Tag nennt dort aber kein Element ([specification.md](specification.md#zeit)). Die übrigen Antworten sind seit dem Umbau nicht abgelesen.

## Browser-Smoke-Test

`tests/browser/smoke.py` startet einen lokalen Server auf `docs/`, steuert Chrome headless über Playwright und meldet je Prüfung eine Zeile. Erwartete Zahlen liest es aus den gebündelten Daten. Die Liste steht in `_checks()`, am Stand nach dem Refactoring vom 2026-11-15 achtzehn Prüfungen ohne `--online` und `--axe`:

- Test-Runner ohne Fehlschlag
- alle Ansichten der Liste `VIEWS` des Skripts mit dem HSA ohne Konsolen- und Seitenfehler, Laden unter der Zeitgrenze (`--load-limit`, Vorgabe 5 Sekunden, Entscheidung E10)
- Testdatei (seit dem Refactoring, ersetzt den Demo-Link): `demo-showcase.xml` wird über den Datei-Upload der Startseite geladen, der Dialog „Datensatz konfigurieren“ übersprungen, das Netzwerk hat mit seiner Standardschwelle Knoten. Die Prüfung sichert den Weg eigener Daten von der Startseite in den Explorer.
- Stillgelegte Links (seit dem Refactoring, ersetzt „Tour einmal je Browser“): `view=activity` und `view=chronik` mit `demo=true&tour=0` öffnen die Zeitansicht ohne Konsolen- und Seitenfehler, ein Link mit `demo=true` ohne Datensatz führt auf die Startseite ohne den Hinweis auf den fehlenden Datensatz, `index.html?demo=true` bleibt auf der Startseite. Die Prüfung sichert, dass ältere Links nach dem Entfernen von Tutorial, Tagen und Chronik weiter öffnen.
- Link ohne Datensatz führt auf die Startseite mit Hinweis
- Zurück führt zur vorigen Ansicht, geteilter Filterlink zeigt die gefilterten Briefe
- CSV-Export mit BOM und Normdatenspalten, Stern legt die Person in den Korb
- Balken „Spanne“ und Hinweis der Karte auf die Ortsliste
- ein Jahresbalken öffnet seine Briefe im Briefauszug, die Zeitansicht bleibt
- Seitenstruktur, ruhendes Netzwerk unter reduzierter Bewegung, Entscheidung E8 mit JSON-Indizes und Tabellen
- Themen: eine Zeile je Thema der Datei, Enter setzt das Thema, alle Zeilen bleiben, ein Korrespondent des Streifens setzt den Personenfilter dazu
- Startansicht, Filter (seit `c6185bc`): Ein Thema filtert Kreis, Karte und Auswahlzeile, die Zahl der Zeile gleicht einer Zählung der Datei, ein zweiter Klick löst, der Kreis wählt mit Pfeiltaste und Enter eine Person.
- Startansicht, Skala des Zeitdiagramms (seit `d38b4c8`): Bei drei Fenstergrößen und nach Wahl und Lösen von Französisch in der Sprachlegende füllt die höchste blasse Säule die Fläche, kein Stapel ragt darüber, die Stapel haben mehrere Farben. Die Prüfung entstand, nachdem ein Bild des Operators Balken in voller Höhe und einer Farbe zeigte.
- Startseite: `examples.json` gleicht der Zusammenfassung von `start-summary.js` über `hsa-letters.json`, das Archiv ist Vorgabe, der Link des Kreises öffnet das Netzwerk, eine Angabe ohne Briefe (Poststempel) hat keinen Platz, „anderer Brief“ wechselt und die Adresse stellt den Brief wieder her, ein unbekannter Brief und `dataset=demo` fallen auf das Archiv zurück.

`--online` prüft zusätzlich einen geteilten correspSearch-Link gegen die API, über den Eintrag „Eigene Daten“ der Startseite. `--axe <Pfad>` führt axe-core über alle Seiten und die Startansicht bei 390px.

Lücke: Die Liste `VIEWS` des Skripts kennt die Raum-Zeit-Ansicht nicht, `chronik` und `activity` hat das Refactoring daraus entfernt. „Alle Ansichten ohne Fehler“ und axe-core laufen deshalb nicht über Raum-Zeit ([plan.md](plan.md#aufgabensatz-und-prüfungen)). Kopf und Fuß der Startseite und die Schiene haben keine eigene Prüfung.

## Korpusprüfung

`verification/check-corpus.mjs` lässt den Parser über einen Ordner mit TEI- oder CMIF-Dateien laufen und vergleicht jeden Eintrag mit seiner Quelldatei: jeder `correspDesc` wird ein Eintrag, IDs sind eindeutig, kein Poststempel und keine Anschrift steht als Absendeort, jede als ergänzt ausgezeichnete Angabe ist als erschlossen markiert, jeder Empfänger und jede Adresszeile bleibt erhalten, kein interner Verweis gilt als identifiziert. Danach prüft es den zusammengeführten Bestand: jeder Eintrag gehört zu genau einem Brief, zusammengeführte Einträge teilen eine Signatur ohne widersprechende Datierung, kein unplausibles Jahr steht auf der Zeitachse, der Personenindex zählt jeden Empfänger. Am Ende gibt es die Kennzahlen des Laufs aus. Es ist der Beleg für Bestände, deren Daten nicht gebündelt werden dürfen. Die Datenprüfung vom 2026-11-14 fand Parserfehler, die es nicht abdeckte, seither enthält es vier weitere Prüfungen.

## Messungen

- Dichtemessung des ersten Bildschirms: zählt Rahmen, Flächen, Schachtelung, Textstile, Überschriften und Bedienelemente über den ganzen ersten Bildschirm einschließlich Kopf und Seitenleiste, nach dem Maßstab „UI-Praxis für agentisch erzeugte Frontends“ des Hauswissens. Die Skripte lagen in den Arbeitsordnern der Sessions und sind nicht Teil des Repositorys. Bis zur Stufe „Gliederung nach Gegenstand“ zählte die Messung nur den Inhaltsbereich und übersah so die Gliederung. Die Listenansichten liegen über dem Arbeitsprofil des Maßstabs ([plan.md](plan.md#listen-und-vergleich)).
- Kontraste nach der WCAG-Formel, Ergebnisse in [design.md](design.md#kontraste).
- Bildrate beim Drehen der Raum-Zeit-Figur, vor und nach dem Umbau auf die Zeichenfläche, nur einmal gemessen.

## Aufgabenprüfung durch Browser-Agenten

Agenten mit Browserzugang prüfen die Oberfläche an Forschungsaufgaben, getrennt von den Agenten, die bauen. Ein Prüfer erhält Ansichten, Aufgaben mit prüfbarer Antwort, den Maßstab mit seiner Strukturmessung und keinen Hinweis auf die Einschätzung der Bauenden. Datenbefunde eines Prüfers werden an den Quelldateien nachgeprüft, bevor darauf gebaut wird. Ein Prüferbericht ist eine Beobachtung, das Urteil liegt beim Operator. Die Runden vom 2026-10-29, 2026-11-05 und 2026-11-14 stehen im [Journal](journal.md).

### Bedienprüfung der Raum-Zeit-Ansicht

Am 2026-11-14 bediente ein unabhängiger Agent die Raum-Zeit-Ansicht mit echtem Zeiger und echter Tastatur an zwölf festen Aufgaben, am eingecheckten Stand vor den Korrekturen. Die zwölf Aufgaben selbst sind im Repository nicht festgehalten, Befund und Korrekturen gibt diese Zusammenfassung nach dem Bericht der koordinierenden Session wieder.

Befunde:

- Klicks trafen in der schrägen Sicht in 30 Prozent der Fälle einen anderen Ort, von vorn in 20 Prozent.
- Ein an der Achse abgelesenes Jahr lag im Median neun Jahre daneben.
- Der Weg zurück war schwer zu finden: Die festen Blickrichtungen behielten Zoom und Verschiebung, kein Knopf zeigte nach freiem Drehen die Sicht an, Escape fehlte, die Kopfzeile brach bei einer Wahl um.
- Ein Ort, dessen Namen man kennt, war nicht zu finden.
- Die Skala der Breite änderte sich mit dem Filter.
- Verblasste Säulen hatten einen Kontrast von 1.1 bis 1.4 zu 1.

Behoben von der koordinierenden Session und im Browser nachgespielt (Commit `f24c8ae`): die nächste Marke gewinnt, erst Ort, dann Jahr, das Jahr steht an der Achse, Escape, feste Blickrichtungen setzen Zoom und Verschiebung zurück, Suche über der Ortsliste, eine Breitenskala, stärkere Abblendung. Offen geblieben ([plan.md](plan.md#orte-und-raum-zeit)): die Grundkarte wird beim Öffnen jeder Ansicht angefragt, Wien steht als zwei Orte in den Daten ([data.md](data.md#hugo-schuchardt-archiv)), ein Klick ins Leere löste die Wahl im Nachspiel nicht (nicht gesichert), breite Linien im Korrespondenzkreis überdecken einander.

Die zwölf Aufgaben sind der Anfang eines Aufgabensatzes, der in jeder Runde wieder läuft. Mit dem festen Aufgabensatz der Specification bilden sie ihn, sobald sie im Repository stehen.

## Was nicht geprüft ist

- Das gezeichnete Bild von Karte, Netzwerk, Raum-Zeit, Themen und Startfigur. Gedeckt durch Bildschirmfotos der bauenden Sessions und die Aufgabenprüfung.
- Die Raum-Zeit-Ansicht im Smoke-Test und unter axe-core.
- Raster und Anteile, Briefliste, Zeitansicht, Startansicht und Startseite über ihre Modultests und Smoke-Prüfungen hinaus. Gedeckt durch Lesetests frischer Leser an Startseite und Raster und Gegenzählungen der Bau-Agenten an `hsa-letters.json`, je in deren Berichten, nicht unabhängig wiederholt.
- Alles vom Abend des 2026-11-14 und der Nacht zum 2026-11-15 bei 200 Prozent Zoom und mit einem Screenreader.
- Zoom auf 200 Prozent, andere Browser als Chrome, Excel mit dem BOM.
- Der Wissenskorb mit Einträgen, die dunkle Grundkarte und der Exportdialog im neuen Farbschema.
- Fachliche Richtigkeit von Zusammenführung, Entsprechungen und unplausiblen Jahren. Das entscheiden die Editionen.

## Ausführen

```bash
python -m http.server 8000 --directory docs
# http://localhost:8000/test.html?test=true  startet einen Lauf, alle Suites müssen grün sein
uv run tests/browser/smoke.py                # alle Prüfungen, Exit-Code 0 nur bei vollem Erfolg
uv run tests/browser/smoke.py --online --axe path/to/axe.min.js
node verification/check-corpus.mjs <Pfad zu jsdom> <Ordner mit XML-Dateien>
uv run preprocessing/build_examples.py       # nach jeder Neuerzeugung von hsa-letters.json
```

`test.html` besitzt den einzigen Auslöser eines Laufs, `run-all-tests.js` startet keinen eigenen, weil zwei Läufe sich den state-manager teilten. Eine neue Suite ist eine Datei `docs/js/tests/test-<modul>.js`, die in `run-all-tests.js` registriert wird. Alle Suites prüfen mit `assert` aus `test-runner.js`, `teardown()` läuft auch nach einem Fehlschlag. `check-corpus.mjs` braucht `jsdom` aus einer vorhandenen Installation, weil das Repository keine Node-Abhängigkeiten führt.

## Stand

Am 2026-11-15 nach dem Refactoring registriert `run-all-tests.js` achtzehn Suites: CMIF Parser, Aggregation, Formatters, Security, Research Paths and Export, Demo, correspSearch, Spacetime, Network, Topics, Selection, Letters, Time, Dashboard, Compose, State Manager, DOM Cache, Basket. Neu seit dem Stand von `34fedd9` sind Letters, Time und Dashboard (`c6185bc`) und Compose (`b189cb5`), Topics ist mit dem Raster neu gefasst (`7cbe3c3`). Das Refactoring hat mit der Tagesansicht und den Forschungspfaden deren Tests entfernt, die Zahl der Modultests sank von 191 auf 181. Der Smoke-Test hat achtzehn Prüfungen ohne `--online` und `--axe`, zwei davon hat das Refactoring ersetzt ([Browser-Smoke-Test](#browser-smoke-test)). Suites und Smoke-Prüfungen sind aus den Dateien gezählt.

Nach Bericht der koordinierenden Session liefen am Commit `34fedd9` 160 Modultests und 16 Prüfungen des Smoke-Tests ohne Fehlschlag. Am Arbeitsbaum nach dem Refactoring lief `test.html?test=true` am 2026-11-15 in der kuratierenden Session mit 181 von 181 Modultests ohne Fehlschlag (Browser der Desktop-App gegen den lokalen Server). Den Smoke-Test hat die kuratierende Session nicht ausgeführt, sein Lauf am Stand des Refactorings ist von der Hauptsession zu bestätigen.
