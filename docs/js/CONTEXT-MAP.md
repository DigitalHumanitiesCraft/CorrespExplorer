# JavaScript Context Map

ES-Module ohne Build-Schritt. Aufbau und Datenfluss beschreibt [architecture.md](../knowledge/architecture.md), die Ansichtsmodule [views/CONTEXT-MAP.md](views/CONTEXT-MAP.md), die Tests [tests/CONTEXT-MAP.md](tests/CONTEXT-MAP.md).

## Einstiegspunkte

- upload.js - Startseite `index.html`: Upload, URL-Feld, Beispieldatensätze, Konfigurationsdialog mit Anreicherung
- explore.js - Explorer `explore.html`: Laden, Filter, URL-State, Übersicht, Karte, Korrespondenten, Briefe, Forschungs- und Wissenspfade, Export, Brief- und Personen-Dialog (Wikidata erst auf Klick), Initialisierung der Ansichtsmodule
- wissenskorb.js - Analyseseite `wissenskorb.html` des Wissenskorbs
- vault.js - Viewer `vault.html` für `docs/knowledge/`, leitet Links zwischen Dokumenten intern weiter

## Daten

- cmif-parser.js - `parseCMIF()` für Datei, URL oder XML-String, leitet correspSearch-API-URLs an correspsearch-api.js weiter, `enrichWithCoordinates()`
- correspsearch-api.js - `isCorrespSearchUrl()`, `fetchFromCorrespSearchUrl()` mit Seiten ab `x=1` und Obergrenze
- state-manager.js - `state` mit Daten, Filtern (Zeitraum oder undatiert, Sprachen, Person, Ort, Thema, Qualität), Cache, `filterLetters()` für beliebige Filtersätze und URL-Serialisierung
- formatters.js - Datum, Person und Ort mit Unsicherheitsanzeige, CSS-Klassen, Initialen

## Gemeinsame Helfer

- utils.js - Escaping (`escapeHtml`, `safeUrl`, `externalLink`, `isAllowedJsonPath`), `csvCell`, `downloadFile`, `showToast`, Dialoge (`openModal`, `closeModal`, `enableModalKeyboard`), Normdaten (`parseAuthorityRef`, `parseGeoNamesRef`, `buildAuthorityLink`), `classifyDate`, `personKey`, `placeKey`, `cleanId`, `buildIndices`, `countIdentifiedPersons`, `analyzeDataCapabilities`, `debounce`
- constants.js - Sprachfarben, die eine Bezeichnungstabelle `LANGUAGE_LABELS` mit `languageLabel()` und `registerLanguageLabels()`, `NO_LANGUAGE` für Briefe ohne Sprache, UI-, Karten-, Netzwerk- und API-Vorgaben, Korbgrenzen
- dom-cache.js - `elements` mit Gettern für wiederholt genutzte Elemente des Explorers

## Anreicherung

- wikidata-enrichment.js - Personen über VIAF oder GND bei Wikidata, Lebensdaten, Bilder, Berufe
- geonames-enrichment.js - Koordinaten zu GeoNames-IDs über Wikidata

## Korb und Führung

- basket.js - Wissenskorb je Datensatz in localStorage (`initBasket(datasetKey(sourceInfo))`), `addLettersToBasket()` mit Hinweis auf die Obergrenze, Tab-Synchronisation, Teilen per URL
- demo-tour.js - Onboarding-Tour des Tutorial-Datensatzes

## Regeln

- Jeder Wert aus CMIF, JSON, Wikidata oder Storage passiert `escapeHtml` vor `innerHTML`, Links passieren `safeUrl` oder `externalLink`.
- Personen werden über `personKey`, Orte über `placeKey` verglichen, im Filter, in Indizes und im Korb.
- Dateinamen kebab-case, Funktionen camelCase, Rendering `render*()`, Filter `apply*()`.
