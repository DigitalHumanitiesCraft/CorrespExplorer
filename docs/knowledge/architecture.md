---
title: Architecture
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2025-11-26
updated: 2026-10-29
authors: [Christopher Pollin]
template:
  name: Vorlage Architecture
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/architecture
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-architecture
related: [data, specification, design, testing]
---

# Architecture

CorrespExplorer ist eine statische Browser-Anwendung ohne Backend und ohne Build-Schritt. GitHub Pages liefert den Ordner `docs/` aus, alle Verarbeitung läuft clientseitig in ES-Modulen. Datenformat und Quellen beschreibt [data.md](data.md), die Begründungen übergreifender Entscheidungen [specification.md](specification.md#entscheidungen). Die Modulliste mit Exporten führt `docs/js/CONTEXT-MAP.md`, die Ansichtsmodule `docs/js/views/CONTEXT-MAP.md`.

## Seiten

| Seite | Skript | Aufgabe |
|---|---|---|
| `index.html` | `upload.js` | Upload per Datei oder Drag-and-Drop, URL-Feld für CMIF-Dateien und correspSearch-API-URLs, zwei Beispieldatensätze, Konfigurationsdialog für die Anreicherung mit Abbruch. `index.html?demo=true` lädt den Tutorial-Datensatz und startet die Tour |
| `explore.html` | `explore.js` | Explorer mit zwölf Ansichten, Sidebar mit Datensatz, Filtern und Wissenskorb, Wissenspfad-Leiste, Export |
| `wissenskorb.html` | `wissenskorb.js` | Analyseseite des Datenkorbs mit Listen, Zeitleiste, Netzwerk, Karte, Details, Export und Teilen per Link |
| `vault.html` | `vault.js` | Viewer für die Wissensbasis in `docs/knowledge/` |
| `about.html` | keines | Projektinformation, Lizenzen |
| `test.html` | `tests/run-all-tests.js` | Browser-Test-Runner. Die Seite besitzt den einzigen Auslöser eines Laufs, die Schaltfläche „Run“, die `?test=true` beim Laden einmal betätigt |

## Bibliotheken

Alle Bibliotheken liegen versioniert in `docs/vendor/`, jeweils mit ihrer Lizenzdatei. Zur Laufzeit lädt keine Seite Code, Stylesheets oder Schriften von einem CDN.

| Bibliothek | Version | Zweck | Lizenz |
|---|---|---|---|
| MapLibre GL JS | 4.7.1 | Karte im Explorer und im Datenkorb | BSD-3-Clause |
| noUiSlider | 15.7.1 | Zeitraumfilter | MIT |
| D3 | 7.9.0 | Netzwerk, Zeitleisten im Datenkorb | ISC |
| d3-sankey | 0.12.3 | Erwähnungsfluss | BSD-3-Clause |
| marked | 12.0.2 | Markdown-Rendering im Vault | MIT |
| Font Awesome Free | 6.4.0 | Icons (nur woff2-Schriften) | Icons CC BY 4.0, Schriften OFL 1.1, Code MIT |
| Inter, Lato, Merriweather | Google-Fonts-Stand vom 2026-10-29 | Schriften, Untermengen latin und latin-ext | OFL 1.1 |

Extern bleibt allein die Grundkarte von OpenFreeMap. Ist sie nicht erreichbar, setzt `initMap()` einen leeren Hintergrundstil, damit die Ortsmarker sichtbar bleiben. Die Karte der Korbseite hat denselben Rückfall nach einem Stilfehler oder acht Sekunden ohne Laden. Wikidata, GeoNames über Wikidata und correspSearch werden nur auf Aktion der Nutzenden abgefragt, auch im Personen-Dialog ([ADR-006](specification.md#adr-006-externe-dienste-nur-auf-ausdrückliche-aktion)).

## Module

Die Module stehen in `docs/js/`, die ausgelagerten Ansichten in `docs/js/views/`.

- Daten: `cmif-parser.js` parst CMIF-XML zur internen Struktur, `correspsearch-api.js` lädt correspSearch-API-URLs, beide bilden die Indizes mit `buildIndices()` aus `utils.js`. `state-manager.js` hält Daten und Filterlogik und ist der einzige Leser und Schreiber des URL-Zustands (`toURLParams()`, `fromURLParams()`). `formatters.js` formatiert Datum, Person und Ort mit Unsicherheitsanzeige.
- Gemeinsame Helfer in `utils.js`: Escaping (`escapeHtml`, `safeUrl`, `externalLink`, `isAllowedJsonPath`), Schlüssel (`personKey`, `placeKey`, `cleanId`), Platzhalter unbekannter Orte (`isUnknownPlaceName`, `isKnownPlace`), Normdaten einer Person (`personAuthority`), Indizes (`buildIndices`), Datumsklassifikation (`classifyDate`), Qualitätszählung (`countIdentifiedPersons`), CSV (`csvCell`), Dialoge (`openModal`, `closeModal`, `enableModalKeyboard`, `trapTabKey`), der eine Toast aller Seiten (`showToast`) und Download. Die früheren Exporte `formatDate`, `extractYear` und `analyzeDataCapabilities` sind entfernt, Datumsanzeige läuft über `formatters.js`.
- Infrastruktur: `dom-cache.js`, `constants.js` mit der einen Sprachbezeichnungstabelle (`LANGUAGE_LABELS`, `languageLabel()`), dem Code `NO_LANGUAGE` für Briefe ohne Sprache, der Liste `VIEWS` der zwölf Ansichten und den Korbgrenzen `BASKET_LIMITS`.
- Anreicherung: `wikidata-enrichment.js` für Personen, `geonames-enrichment.js` für Koordinaten über Wikidata. Beide nehmen ein `AbortSignal`, mit dem der Konfigurationsdialog der Startseite eine laufende Anreicherung abbricht. `enrichPerson()` liefert `null`, wenn Wikidata keinen Eintrag hat, und wirft, wenn die Anfrage scheitert. Der Personen-Dialog unterscheidet so „Kein Wikidata-Eintrag gefunden“ von „Wikidata nicht erreichbar“, nur beantwortete Anfragen werden zwischengespeichert.
- Forschungspfade: `research-paths.js` zählt mit `summarizeCorpus()` Personen und Orte aus den Briefen über `personKey` und `placeKey`, Orte ohne Platzhalter für unbekannte Orte (`isKnownPlace()`). Sidebar und Übersicht übernehmen diese Zählung. Die Funktion ordnet mit `analyzeResearchQuestions()` die Fragen den epistemischen Kategorien zu ([ADR-004](specification.md#adr-004-epistemische-kategorien-für-forschungsfragen)). Beides sind reine Funktionen und unabhängig von der Indexform, die zwischen Parser und HSA-Datei verschieden ist. `renderOverviewResearchPaths()` und `renderResearchPathCards()` zeichnen die Karten.
- Wissenspfad: `knowledge-path.js` mit `initKnowledgePath()`, `startKnowledgePath()` und `basketSelectionForView()` führt die Pfad-Leiste und den Korbabschnitt der Sidebar.
- Export: `export.js` mit `LETTER_EXPORT_COLUMNS`, `letterExportRow()`, `lettersToCsv()` und `lettersToJson()`, eine Spaltenmenge für CSV und JSON, die Kopfzeile auch ohne Briefe.
- Korb: `basket.js` mit einem Korb je Datensatz in localStorage, Massenaufnahme über `addItemsToBasket()`, Tab-Synchronisation und URL-Teilen (`basketToParams()`, `basketFromParams()`, `loadBasketFromUrl()`). `onBasketChange()` gibt eine Funktion zum Abmelden zurück. Die Korbseite exportiert mit `lettersToCsv()` und `letterExportRow()` aus `export.js` und verlinkt nach einem `data/*.json`-Datensatz zurück auf `explore.html?json=<Pfad>`.
- Demo-Tour: `demo-tour.js` mit `initDemoTour({ switchView })`, `checkAndStartDemoTour()` und `startTour()`. Die Tour ist ein modaler Dialog: Der Fokus liegt auf dem Hauptknopf des aktiven Schritts, Tab bleibt über `trapTabKey()` im Schritt, Escape beendet sie und gibt den Fokus zurück. Schritte mit `data-view` wechseln vorher die Ansicht, die Sidebar-Schritte deshalb in die Briefansicht. Ein nicht sichtbares Ziel, etwa die eingeklappte Sidebar unter 768 px, erhält keine Hervorhebung.
- Seiten: `upload.js`, `explore.js`, `wissenskorb.js`, `vault.js`, `demo-tour.js`.
- Ansichten in `views/`: Zeitleiste, Aktivität, Chronik, Vergleich, Netzwerk, Erwähnungsfluss, Themen, Orte, dazu `view-support.js` mit `readTokens()` und `bindCombobox()` für mehrere Ansichten.

`explore.js` orchestriert. Übersicht, Karte, Korrespondenten, Briefe, Filter und die Detail-Dialoge liegen weiter dort, Forschungspfade, Wissenspfad und Export in den eigenen Modulen. Die Ansichtsmodule erhalten ihre Abhängigkeiten über `init*View(deps)` und importieren `explore.js` nicht, damit keine zirkulären Importe entstehen.

## Datenfluss

1. Erweiterter Datensatz: `preprocessing/build_hsa_data.py` erzeugt aus der CMIF-Datei des Hugo Schuchardt Archivs `docs/data/hsa-letters.json` mit Indizes, teiHeader-Metadaten, Koordinaten aus Wikidata und dem Änderungsvermerk `meta.modifications`. `explore.html?json=data/hsa-letters.json` lädt die Datei bei jedem Aufruf direkt, `?json=` akzeptiert nur relative Pfade unter `data/` mit Endung `.json`. Ein solcher Datensatz wird nicht nach sessionStorage kopiert. Scheitert das Laden (unzulässiger Pfad, Netzwerk- oder HTTP-Fehler, kein JSON, keine Briefliste), zeigt der Explorer die Meldung im Bereich `#load-error` (`role="alert"`) mit einem Link zur Startseite. Er fällt nicht auf einen älteren Upload zurück und leitet nicht weiter.
2. Upload: `upload.js` übergibt Datei oder URL an `parseCMIF()`, ergänzt Koordinaten aus `docs/data/geonames_coordinates.json` (Wikidata-Tabelle, Herkunft in [data.md](data.md#herkunft-von-docsdatageonames_coordinatesjson)) und optional aus Wikidata, speichert das Ergebnis unter `cmif-data` in sessionStorage und leitet zu `explore.html?view=overview` weiter. Ohne `?json=` und ohne Upload im Tab leitet der Explorer zur Startseite.
3. correspSearch: URLs der API v2.0 (Host `correspsearch.net`, Pfad `/api/`) gehen an `fetchFromCorrespSearchUrl()`. Ohne Parameter `x` folgt der Lader den Seiten ab `x=1`, solange `notesStmt/relatedItem` eine nächste Seite nennt, höchstens bis `API_DEFAULTS.correspSearchMaxLetters`. Mit `x` lädt er genau diese Seite. URLs auf `tei-xml.xql` lehnt er mit dem Hinweis auf `tei-json.xql` ab, ein Netzwerkfehler meldet einen möglichen CORS-Grund.
4. URL-Zustand und Filter: Beim Laden liest `initUrlState()` die Parameter allein über `state.fromURLParams()`. Die URL beschreibt den vollständigen Filterzustand, ein fehlender Parameter setzt seinen Filter zurück. `view=` gilt nur für einen Eintrag aus `VIEWS`. Alle Filter aus der URL wirken vor dem ersten Rendern (`applyFilters({ render: false })`). `applyFilters()` schreibt Zeitraum, Sprachen, Person, Ort, Thema und Qualitätsfilter in den state-manager und liest die gefilterten Briefe zurück. Personen ohne Normdaten-ID und Orte ohne GeoNames-ID werden über ihren Namen gefiltert (`personKey`, `placeKey`). Sind alle Sprachen angehakt, gilt kein Sprachfilter (`languages: null`), ist keine angehakt, bleibt kein Brief. Der Balken der undatierten Briefe setzt den Zeitfilter `{ undated: true }` (URL `undated=1`), weil der Jahresregler Werte außerhalb seines Bereichs begrenzt. Der Regler schreibt den Filter nur bei abgeschlossener Eingabe (Ereignis `set`).
5. Datenkorb: Ansichten legen Briefe, Personen und Orte über `basket.js` in localStorage ab, unter einem Schlüssel je Datensatz (`datasetKey(sourceInfo)`, also Typ und json-Pfad, Dateiname oder URL). Personen und Orte gehen mit `personKey` und `placeKey` in den Korb, auch ohne Normdaten-ID. Der Wissenspfad in sessionStorage trägt denselben Schlüssel und wird bei anderem Datensatz nicht geladen. Der Explorer übergibt der Analyseseite den Schlüssel (`correspDatasetKey`) und bei einem `?json=`-Datensatz nur dessen Pfad (`correspDataSource`), den `wissenskorb.js` selbst lädt. Hochgeladene Datensätze kopiert er nach `correspData`, scheitert das am Kontingent, bleibt die Analyseseite ohne Daten. Die Analyseseite wertet die Vereinigung aus Briefen des Korbs, allen Briefen seiner Personen und allen Briefen von seinen Orten aus, Details und Export (CSV und JSON) folgen derselben Menge.
6. Korb teilen: `generateBasketUrl()` schreibt den Korb mit `basketToParams()` in die Parameter `basket_letters`, `basket_persons` und `basket_places`, jeder Schlüssel einzeln prozentkodiert und mit Komma verbunden, dazu `basket_v=2` und `basket_dataset` mit dem Datensatzschlüssel. Leere Typen entfernen veraltete Parameter. `basketFromParams()` liest auch ältere Links ohne `basket_v`, die nur an Kommas getrennt werden. `loadBasketFromUrl()` führt einen geteilten Korb mit dem vorhandenen zusammen statt ihn zu ersetzen, hält die Korbgrenzen ein und nimmt einen Korb eines anderen Datensatzes nicht auf, sondern nennt den Datensatz in einem Toast. Danach entfernt es die Parameter mit `replaceState`, damit ein Neuladen nicht erneut importiert. Nennt ein Link auf `wissenskorb.html` einen vorprozessierten Datensatz (`preprocessed:data/….json`, geprüft mit `isAllowedJsonPath`), lädt die Analyseseite diese Datei selbst, der Link funktioniert also auch in einem frischen Browser.
7. Tests: `test.html` lädt `run-all-tests.js`, die Suites lesen echte Datendateien ([testing.md](testing.md)).

## Datenmodell

Ein Brief trägt `id`, `url`, `date`, `dateTo`, `year`, `datePrecision` (day, month, year, range, unknown), `dateCertainty`, `sender` und `recipient` (`name`, `id`, `authority`, `precision`), `place_sent` (`name`, `geonames_id`, `lat`, `lon`, `precision`), `language` (`code`, `label`) und `mentions` (`subjects`, `persons`, `places`, bei CMIF v2 zusätzlich `orgs` und `bibls`). Die Briefe der HSA-Datei tragen bei Personen und Orten kein Feld `precision` ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis)).

Die Indizes unterscheiden sich zwischen Parser und Vorprozessierung. Parser und correspSearch-Lader schlüsseln Personen und Orte mit `personKey` und `placeKey`, also auch ohne Normdaten-ID über den Namen, und speichern bei Personen `id` und `authority`, bei Orten `geonames_id`. Sie schreiben Sprachen als `{label, letter_count}` und Personen mit `letter_count`, die HSA-Datei Sprachen als Bezeichnungs-String, Personen mit `viaf`, `letters_sent` und `letters_received` und nur Personen mit Normdaten-ID. `personAuthority()` liefert System und ID aus beiden Formen. Code, der Zählungen braucht, rechnet sie deshalb aus den Briefen (Übersicht, Forschungspfade, Sprachfilter, Qualitätsanzeige).

## Ansichten

- Übersicht mit Kennzahlen, Quelle, Lizenz und Änderungsvermerk, Qualitäts-Chips, Einstiegspunkten und Forschungspfaden. Ein Klick auf einen Pfad startet einen Wissenspfad, dessen Leiste durch die Schritte führt. Nicht beantwortbare Fragen stehen in einem aufklappbaren Abschnitt „Anreicherungspotential“.
- Karte (MapLibre mit Clustering, Farbmodus nach Sprache), Korrespondenten, Briefe.
- Zeitleiste, Themen, Orte, Netzwerk, Erwähnungsfluss, Chronik, Aktivität und Vergleich in `views/`. Netzwerk und Erwähnungsfluss lesen ihre Farben mit `readTokens()` aus `tokens.css`, weil D3-Attribute `var()` nicht auflösen.

Die Sidebar ist auf Übersicht, Chronik, Aktivität und Vergleich ausgeblendet. Unter 768 px Breite liegt sie außerhalb des Bildschirms und öffnet sich über den Filter-Schalter der Navigation, Escape schließt sie und gibt den Fokus an den Schalter zurück. Elemente mit `role="button"` reagieren über einen globalen Handler auf Enter und Leertaste. `enableModalKeyboard()` schließt Dialoge mit Escape, führt den Fokus hinein, hält ihn mit Tab im Dialog und gibt ihn beim Schließen zurück, ein Dialog ohne Namen erhält `aria-labelledby` auf seine erste Überschrift. Ihr MutationObserver prüft nur Änderungen, die einen Dialog betreffen, weil die Prüfung das Layout misst und jeder Filterschritt große Listen neu zeichnet.

## Entwurfsmuster

- Kein Build: ES-Module direkt im Browser, Deployment als statische Seite. Tree-Shaking und Minifizierung entfallen bewusst.
- Live Bindings: `constants.js` exportiert die Sprachfarben als `const`-Objekt, das `computeLanguageColors()` nach dem Laden eines Korpus neu befüllt.
- URL-State: Ansicht und Filter stehen in der URL, `state-manager.js` serialisiert und liest sie, geschrieben wird mit `replaceState`. Der Zurück-Knopf des Browsers verlässt den Explorer deshalb, statt Filterschritte zurückzunehmen.
- Speichermodell: Hochgeladene Datensätze liegen in sessionStorage (je nach Browser etwa 5 bis 10 MB), vorprozessierte Datensätze werden per Pfad geladen, der Korb liegt in localStorage.
- Zustand in `explore.js`: Die Modulvariablen `allLetters`, `filteredLetters`, `dataIndices` und die Filtereingaben bleiben die Arbeitskopie der Ansichten. Der state-manager besitzt die Filterlogik, `applyFilters()` gleicht beide ab.

## Grenzen

- Die Briefliste rendert höchstens 500 Einträge.
- Ein Upload in sessionStorage scheitert am Kontingent des Browsers. Für große Datensätze ist die Vorprozessierung zu JSON vorgesehen.
- Ein geteilter Link auf `explore.html` trägt bei einem Upload nur Ansicht und Filter, der Datensatz liegt im Tab der Absenderin. Empfänger ohne diesen Upload landen auf der Startseite.
- correspSearch-Abfragen laden höchstens `API_DEFAULTS.correspSearchMaxLetters` Briefe, der Konfigurationsdialog zeigt dann geladene und gefundene Treffer.
- Vorausgesetzt sind ES-Module, DOMParser, Fetch, Web Storage und CSS Custom Properties. Geprüft wird in Chrome (headless, Playwright), andere Browser sind nicht systematisch getestet.
