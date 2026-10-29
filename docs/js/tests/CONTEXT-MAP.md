# Test Context Map

Browser-Tests ohne externe Abhängigkeiten. Regeln und Abdeckung stehen in [testing.md](../../knowledge/testing.md). Die in `run-all-tests.js` registrierten Suites sind die Quelle der Wahrheit, Anzahl und Ergebnis zeigt `test.html` beim Lauf.

## Dateien

- test-runner.js - `TestRunner` mit Suites, Setup, Teardown (auch nach einem Fehlschlag) und Zeitmessung, gemeinsames `assert(condition, message)`
- run-all-tests.js - registriert die Suites, stellt `runAllTests()` bereit und setzt `window.runAllTests`. Es startet keinen Lauf selbst, damit die Suites nicht zweimal gleichzeitig gegen den gemeinsamen state-manager laufen
- test-cmif-parser.js - XML zu JSON, Eingabevertrag, Unsicherheitserkennung
- test-aggregation.js - Indizes des Parsers, Filter über den state-manager, `countIdentifiedPersons`, Sprachcode `None` der Quelle gegenüber Briefen ohne Sprache
- test-formatters.js - Datum, Person und Ort mit Unsicherheitsanzeige, CSS-Klassen, Initialen
- test-security.js - Escaping, URL-Schemata und `?json=`-Pfade gegen `data/test-hostile.xml`
- test-research-paths.js - `analyzeResearchQuestions()` und `summarizeCorpus()` gegen `test-uncertainty.xml`, `demo-showcase.xml` und die Indexform von `data/hsa-letters.json`, Platzhalter „Unbekannt“ zählt nicht als Ort, `basketSelectionForView()`, `lettersToCsv()` mit Kopfzeile ohne Briefe, Normdaten im Personenindex über `personAuthority()`
- test-state-manager.js - Filter, Cache, URL-State mit vollständigem Rundweg, Zurücksetzen fehlender Parameter und altem Ortsparameter `place=name:<Ort>`, Personen- und Ortsfilter ohne Normdaten-ID über `placeKey`, undatierte Briefe, leere Sprachauswahl, `filterLetters()`
- test-dom-cache.js - Element-Caching
- test-basket.js - `addItemsToBasket()` mit einer Benachrichtigung und Abmelden des Listeners, Setup und Teardown sichern und schreiben einen vorhandenen Korb des Fixture-Datensatzes zurück, URL-Teilen im Format `basket_v=2` mit Namensschlüsseln, die Kommas enthalten, Entfernen veralteter Parameter, ältere Links ohne `basket_v`, Zusammenführen und Datensatzprüfung in `loadBasketFromUrl()`, `csvCell` mit Anführungszeichen aus `test-hostile.xml`
- ../../test.html - Oberfläche des Runners mit dem einzigen Auslöser eines Laufs

## Ausführung

- Im Browser `http://localhost:8000/test.html?test=true` bei `python -m http.server 8000 --directory docs`. Der Parameter betätigt die Schaltfläche „Run“ einmal, ohne ihn startet der Lauf auf Klick
- Headless mit Playwright: `test.html?test=true` öffnen und `#test-summary` lesen
- In der Konsole von `test.html`: `window.runAllTests()`

## Suite-Format

Eine Suite exportiert ein Objekt mit `name`, optional `setup()` und `teardown()` und `tests`, einer Liste aus `{ name, run() }`. Die Suites prüfen mit `assert(condition, message)` aus `test-runner.js`. CMIF-Daten laden sie über `parseCMIF()` aus den Dateien in `docs/data/`, die Form der vorprozessierten HSA-Datei prüfen sie an `data/hsa-letters.json` selbst.
