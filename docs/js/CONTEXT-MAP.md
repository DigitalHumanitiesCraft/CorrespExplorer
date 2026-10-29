# JavaScript Context Map

ES-Module ohne Build-Schritt. Aufbau und Datenfluss beschreibt [architecture.md](../knowledge/architecture.md), die Ansichtsmodule [views/CONTEXT-MAP.md](views/CONTEXT-MAP.md), die Tests [tests/CONTEXT-MAP.md](tests/CONTEXT-MAP.md).

## Einstiegspunkte

- upload.js - Startseite `index.html`: Upload, URL-Feld, Beispieldatensätze, Konfigurationsdialog mit Anreicherung und Abbruch über `AbortController`, `?demo=true` startet den Tutorial-Datensatz
- explore.js - Explorer `explore.html`: Laden mit sichtbarer Fehlermeldung (`#load-error`), URL-State über `state.fromURLParams()`, Filter, Übersicht, Karte, Korrespondenten, Briefe, Brief- und Personen-Dialog (Wikidata erst auf Klick, „Wikidata nicht erreichbar“ getrennt von „Kein Wikidata-Eintrag“), Fokus nach dem Entfernen einer Filtermarke auf der nächsten Marke oder `#reset-filters`, Escape schließt die mobile Sidebar, Initialisierung der Ansichtsmodule, des Wissenspfads und des Exports
- wissenskorb.js - Analyseseite `wissenskorb.html` des Wissenskorbs, lädt bei einem geteilten Link auf einen vorprozessierten Datensatz dessen Datei selbst, verlinkt nach einem `data/*.json`-Datensatz mit `?json=` zurück in den Explorer, exportiert über `lettersToCsv()` und `letterExportRow()` aus `export.js`, Farben über `readTokens()` aus `views/view-support.js`
- vault.js - Viewer `vault.html` für `docs/knowledge/`, leitet Links zwischen Dokumenten intern weiter

## Daten

- cmif-parser.js - `parseCMIF()` für Datei, URL oder XML-String, leitet correspSearch-API-URLs an correspsearch-api.js weiter, `enrichWithCoordinates()`
- correspsearch-api.js - `isCorrespSearchUrl()`, `fetchFromCorrespSearchUrl()` mit Seiten ab `x=1` und Obergrenze, Hinweis auf CORS bei Netzwerkfehlern, `tei-xml.xql` abgelehnt
- state-manager.js - `state` mit Daten, Filtern (Zeitraum oder undatiert, Sprachen, Person, Ort, Thema, Qualität), Cache, `filterLetters()` für beliebige Filtersätze, `toURLParams()` und `fromURLParams()` als einzige URL-Serialisierung
- formatters.js - Datum, Person und Ort mit Unsicherheitsanzeige, CSS-Klassen, Initialen (`getPersonInitials`)

## Gemeinsame Helfer

- utils.js - Escaping (`escapeHtml`, `safeUrl`, `externalLink`, `isAllowedJsonPath`), `csvCell`, `downloadFile`, `showToast`, Dialoge (`openModal`, `closeModal`, `enableModalKeyboard` mit Fokusfalle, die nur bei Änderungen an Dialogen prüft, `trapTabKey` für Modals und Demo-Tour), Normdaten (`parseAuthorityRef` mit VIAF in beiden URI-Formen, `parseGeoNamesRef`, `buildAuthorityLink`, `personAuthority`), `classifyDate`, `personKey`, `placeKey`, `isUnknownPlaceName`, `isKnownPlace` (Platzhalter wie „Unbekannt“ zählen nicht als Ort), `cleanId`, `buildIndices`, `countIdentifiedPersons`, `debounce`
- constants.js - Sprachfarben, die eine Bezeichnungstabelle `LANGUAGE_LABELS` mit `languageLabel()` und `registerLanguageLabels()`, `NO_LANGUAGE` für Briefe ohne Sprache, `VIEWS` mit den zwölf Ansichten, Karten-, Netzwerk- und API-Vorgaben, Korbgrenzen `BASKET_LIMITS`
- dom-cache.js - `elements` mit Gettern für wiederholt genutzte Elemente des Explorers
- export.js - `LETTER_EXPORT_COLUMNS`, `letterExportRow()`, `lettersToCsv()` (Kopfzeile auch ohne Briefe), `lettersToJson()`

## Anreicherung

- wikidata-enrichment.js - Personen über VIAF oder GND bei Wikidata, Lebensdaten, Bilder, Berufe, `enrichPerson()` (`null` ohne Eintrag, wirft bei gescheiterter Anfrage), `enrichPersonsBatch()` mit `AbortSignal`
- geonames-enrichment.js - Koordinaten zu GeoNames-IDs über Wikidata, `resolveGeoNamesCoordinates()` mit `AbortSignal`

## Forschungspfade, Korb und Führung

- research-paths.js - `summarizeCorpus()` (auch Quelle der Personen- und Ortszahl von Sidebar und Übersicht, Orte über `isKnownPlace`), `analyzeResearchQuestions()` als reine Funktionen über `personKey` und `placeKey`, `renderResearchPathCards()`, `renderOverviewResearchPaths()` mit dem Abschnitt „Anreicherungspotential“
- knowledge-path.js - `initKnowledgePath()`, `startKnowledgePath()`, `basketSelectionForView()`: Pfad-Leiste mit Schrittknöpfen und `aria-current="step"`, Korbabschnitt der Sidebar
- basket.js - Wissenskorb je Datensatz in localStorage (`initBasket(datasetKey(sourceInfo))`), `addItemsToBasket(type, ids)` mit einer Speicherung und `{added, duplicates, rejected}`, `addLettersToBasket()` mit Hinweistext zur Obergrenze, `onBasketChange()` mit Rückgabe zum Abmelden, Tab-Synchronisation, Teilen per URL (`basketToParams()`, `basketFromParams()`, `getSharedBasketDataset()`, `generateBasketUrl()`, `loadBasketFromUrl()` mit Zusammenführen, Format `basket_v=2` und `basket_dataset`)
- demo-tour.js - Onboarding-Tour des Tutorial-Datensatzes als modaler Dialog: `initDemoTour({ switchView })`, Fokus auf dem Hauptknopf jedes Schritts, Tab über `trapTabKey` im Schritt, Escape beendet und gibt den Fokus zurück, Schritte mit `data-view` wechseln die Ansicht

## Regeln

- Jeder Wert aus CMIF, JSON, Wikidata oder Storage passiert `escapeHtml` vor `innerHTML`, Links passieren `safeUrl` oder `externalLink` und tragen `rel="noopener noreferrer"`.
- Personen werden über `personKey`, Orte über `placeKey` verglichen, im Filter, in Indizes, in den Ansichten und im Korb. Normdaten einer Person liefert `personAuthority()`.
- Ansicht und Filter aus der URL liest nur `state.fromURLParams()`, Ansichtsnamen prüft `VIEWS`. Datensatz (`json`, `demo`) und geteilter Korb (`basket_*`) haben ihre eigenen Leser in `explore.js` und `basket.js`.
- Dateinamen kebab-case, Funktionen camelCase, Rendering `render*()`, Filter `apply*()`.
