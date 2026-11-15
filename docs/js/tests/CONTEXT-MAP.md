# Test Context Map

Browser-Tests ohne externe Abhängigkeiten. Regeln und Abdeckung stehen in [testing.md](https://github.com/DigitalHumanitiesCraft/CorrespExplorer/blob/main/knowledge/testing.md). Die in `run-all-tests.js` registrierten Suites sind die Quelle der Wahrheit, Anzahl und Ergebnis zeigt `test.html` beim Lauf.

## Dateien

- test-runner.js - `TestRunner` mit Suites, Setup, Teardown (auch nach einem Fehlschlag) und Zeitmessung, `runTests(suites)`, gemeinsames `assert(condition, message)`
- run-all-tests.js - registriert die Suites, stellt `runAllTests()` bereit und setzt `window.runAllTests`. Es startet keinen Lauf selbst, damit die Suites nicht zweimal gleichzeitig gegen den gemeinsamen state-manager laufen
- test-cmif-parser.js - XML zu JSON, Eingabevertrag, Unsicherheitserkennung, TEI-Briefsätze mit Poststempel, Anschrift, Signatur und erschlossenen Angaben, mehrere Dateien als ein Bestand über `parseCMIFFiles()`
- test-aggregation.js - `datedYearRange()` ohne mehrjährige Spannen (Fall 025), `analyzeCoordinateNeeds()`, Indizes des Parsers, Filter über den state-manager, `datasetQuality()` zählt aus derselben Zusammenfassung wie die Zähler, Sprachcode `None` der Quelle gegenüber Briefen ohne Sprache, Ortsansicht mit erschlossenen Orten, Briefen ohne Ort und Koordinatenlage (`indexPlaces()`, `coordinateCoverage()`, `countLettersByPlace()`)
- test-formatters.js - Datum, Person und Ort mit Unsicherheitsanzeige, CSS-Klassen, Initialen, `formatCountOf()`, `sharedLetterLabel()`
- test-security.js - Escaping, URL-Schemata und `?json=`-Pfade gegen `data/test-hostile.xml`
- test-research-paths.js - Normdatei-Spalten und BOM des CSV-Exports, Merkmale der Überlieferung als angehängte CSV-Spalten, JSON-Export mit Erwähnungen und Indizes, `summarizeCorpus()` gegen `test-uncertainty.xml`, `demo-showcase.xml` und die Indexform von `data/hsa-letters.json`, Platzhalter „Unbekannt“ zählt nicht als Ort, `basketSelectionForView()`, `lettersToCsv()` mit Kopfzeile ohne Briefe, `filterSentence()` mit Namen statt Schlüsseln, Normdaten im Personenindex über `personAuthority()`
- test-state-manager.js - `sameFilterParams()` für die Zurück-Navigation, Filter, Cache, URL-State mit vollständigem Rundweg, Zurücksetzen fehlender Parameter und altem Ortsparameter `place=name:<Ort>`, Personen- und Ortsfilter ohne Normdaten-ID über `placeKey`, undatierte Briefe, leere Sprachauswahl, `filterLetters()`
- test-demo.js - Netzwerk aller am früheren Tutorial-Datensatz `demo-showcase.xml`, der als Fixture bleibt: Standardschwelle ergibt Verbindungen, Kanten des Briefwechsels zählen die Briefe zwischen zwei Personen, die Tabelle der Textalternative escaped Namen aus `test-hostile.xml`, Ego eines Datensatzes, Netz ohne Ego und Organisationen als Knotenart
- test-network.js - reine Teile des Korrespondenzkreises: Zentrum über `mostConnectedPerson()`, Zählungen beider Ebenen von `buildEgoNetwork()` am HSA gegen eine unabhängige Zählung, Erwähnungen nur vom Schreiber eines Briefs, Sehnen nur zwischen Korrespondenten, Geometrie aus `egoGeometry()` und `egoLayout()` (Abstand nach Briefen, Winkel nach erstem Jahr, die zweite Ebene verschiebt nichts), Namen ohne Überlappung (`placeEgoLabels()`), Zeichenfolge der Sehnen, damit die breitere den Zeiger erhält (`chordPaintOrder()`, `chordHitWidth()`), Tutorial-Datensatz
- test-dashboard.js - Startansicht: `licenceName()`, `partnerCounts()`, `mentionCounts()`, `placeCounts()` ohne Platzhalter, `yearLanguageCounts()` ohne unplausible Jahre, `countOf()`, `languageOrder()` und `dominantLanguages()` aus `selection-ui.js`, `mapFrame()` und `frameProjection()` aus `mini-figures.js`
- test-compose.js - Zusammensetzung der Startgrafik durch `composeFigure()` für reines CMIF, Briefsätze ohne Koordinaten, erweiterte Bestände, Briefe ohne Datum und erwähnte Orte ohne Koordinaten, `missingSentence()`
- test-spacetime.js - reine Teile der Raum-Zeit-Figur: `aggregatePlaceYears()` verliert keinen Brief und zählt am HSA je Ort und Jahr, `groundLayout()` mit entfernten Einzelorten am Rand, `projectPoint()` mit Norden oben von oben und späteren Jahren oben von vorn, `fitBox()` in jeder Blickrichtung
- test-time.js - reine Teile der Zeitansicht: `axisInterval()`, `timeResolution()`, `letterSide()` nach zentraler Person, `periodLetters()` und `binLetters()` am HSA gegen eine getrennte Zählung der Datei, `chronicleStart()`
- test-topics.js - reine Teile der Themenansicht: `subjectProfiles()` mit Höhepunkt und Zählung am HSA, `orderSubjects()` auch mit den Sprachen als eigener Gruppe, `matchSubjects()` ohne Groß- und Kleinschreibung und Diakritika, `topEntries()`, `shadeStep()` auf fester Skala, `splitTail()`, `mapGroups()`, `restLabel()` und `restShare()` der Treemap, Raster und Anteile am HSA gegen eine unabhängige Zählung
- test-letters.js - Briefliste: `offAxisReason()`, `compareByDate()` mit Briefen ohne Platz auf der Zeitachse am Ende, `letterDirection()`, `groupLetters()` mit jedem Brief genau einmal, `selectionProfile()` mit leeren Jahren, Werte am HSA gegen eine eigene Zählung der Datei
- test-selection.js - die eine Auswahl aller Ansichten: `isLetterBetween()` für Briefe zwischen zwei Personen, Person und Partner in der Auswahl, Partner, gewähltes Jahr und offene Briefleiste im Rundweg über die URL, gewähltes Jahr ohne mehrjährige Spannen, `selectionMarks()` als Satz in fester Ordnung, `drawerCountText()` der Briefleiste
- test-correspsearch.js - `correspSearchShareUrl()` nur für Adressen der API, `datasetFromPages()` an den gespeicherten API-Antworten `data/test-correspsearch.json` (Briefe, Herausgeber, Lizenz) und `data/test-correspsearch-empty.json` (Abbruch ohne Treffer)
- test-dom-cache.js - Element-Caching über `getById()` und `initDOMCache()`
- test-basket.js - `addItemsToBasket()` mit einer Benachrichtigung und Abmelden des Listeners, Setup und Teardown sichern und schreiben einen vorhandenen Korb des Fixture-Datensatzes zurück, URL-Teilen im Format `basket_v=2` mit Namensschlüsseln, die Kommas enthalten, Entfernen veralteter Parameter, ältere Links ohne `basket_v`, Zusammenführen und Datensatzprüfung in `loadBasketFromUrl()`, `csvCell` mit Anführungszeichen und der Formelschutz von `lettersToCsv()` aus `test-hostile.xml`, `addEntityToBasket()` legt Person und Ort ohne Briefe ab
- ../../test.html - Oberfläche des Runners mit dem einzigen Auslöser eines Laufs

## Ausführung

- Im Browser `http://localhost:8000/test.html?test=true` bei `python -m http.server 8000 --directory docs`. Der Parameter betätigt die Schaltfläche „Run“ einmal, ohne ihn startet der Lauf auf Klick
- Headless mit Playwright: `test.html?test=true` öffnen und `#test-summary` lesen
- In der Konsole von `test.html`: `window.runAllTests()`

## Suite-Format

Eine Suite exportiert ein Objekt mit `name`, optional `setup()` und `teardown()` und `tests`, einer Liste aus `{ name, run() }`. Die Suites prüfen mit `assert(condition, message)` aus `test-runner.js`. CMIF-Daten laden sie über `parseCMIF()` aus den Dateien in `docs/data/`, die Form der vorprozessierten HSA-Datei prüfen sie an `data/hsa-letters.json` selbst.
