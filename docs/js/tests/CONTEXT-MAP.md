# Test Context Map

Browser-Tests ohne externe Abhängigkeiten. Regeln und Abdeckung stehen in [testing.md](../../knowledge/testing.md). Die in `run-all-tests.js` registrierten Suites sind die Quelle der Wahrheit, Anzahl und Ergebnis zeigt `test.html` beim Lauf.

## Dateien

- test-runner.js - `TestRunner` mit Suites, Setup, Teardown und Zeitmessung, gemeinsames `assert(condition, message)`
- run-all-tests.js - registriert die Suites, `runAllTests()`, Auto-Start mit `?test=true`
- test-cmif-parser.js - XML zu JSON, Eingabevertrag, Unsicherheitserkennung
- test-aggregation.js - Indizes des Parsers, Filter über den state-manager, `countIdentifiedPersons`, Sprachcode `None` der Quelle gegenüber Briefen ohne Sprache
- test-formatters.js - Datum, Person und Ort mit Unsicherheitsanzeige, CSS-Klassen, Initialen
- test-security.js - Escaping, URL-Schemata und `?json=`-Pfade gegen `data/test-hostile.xml`
- test-state-manager.js - Filter, Cache, URL-State, Personen- und Ortsfilter ohne Normdaten-ID, undatierte Briefe, leere Sprachauswahl, `filterLetters()`
- test-dom-cache.js - Element-Caching
- ../../test.html - Oberfläche des Runners

## Ausführung

- Im Browser `http://localhost:8000/test.html?test=true` bei `python -m http.server 8000 --directory docs`
- Headless mit Playwright: `test.html?test=true` öffnen und `#test-summary` lesen
- In der Konsole von `test.html`: `window.runAllTests()`

## Suite-Format

Eine Suite exportiert ein Objekt mit `name`, optional `setup()` und `teardown()` und `tests`, einer Liste aus `{ name, run() }`. Die Suites prüfen mit `assert(condition, message)` aus `test-runner.js` und laden Daten nur über `parseCMIF()` aus den Fixture-Dateien in `docs/data/`.
