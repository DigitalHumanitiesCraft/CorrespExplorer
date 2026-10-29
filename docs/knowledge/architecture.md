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
| `index.html` | `upload.js` | Upload per Datei oder Drag-and-Drop, URL-Feld für CMIF-Dateien und correspSearch-API-URLs, zwei Beispieldatensätze, Konfigurationsdialog für die Anreicherung |
| `explore.html` | `explore.js` | Explorer mit zwölf Ansichten, Sidebar mit Datensatz, Filtern und Wissenskorb, Wissenspfad-Leiste, Export |
| `wissenskorb.html` | `wissenskorb.js` | Analyseseite des Datenkorbs mit Listen, Zeitleiste, Netzwerk, Karte, Details und Export |
| `vault.html` | `vault.js` | Viewer für die Wissensbasis in `docs/knowledge/` |
| `about.html` | keines | Projektinformation, Lizenzen |
| `test.html` | `tests/run-all-tests.js` | Browser-Test-Runner |

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

Extern bleibt allein die Grundkarte von OpenFreeMap. Ist sie nicht erreichbar, setzt `initMap()` einen leeren Hintergrundstil, damit die Ortsmarker sichtbar bleiben. Wikidata, GeoNames über Wikidata und correspSearch werden nur auf Aktion der Nutzenden abgefragt, die Personendetails fragen Wikidata beim Öffnen ab.

## Module

Die Module stehen in `docs/js/`, die ausgelagerten Ansichten in `docs/js/views/`.

- Daten: `cmif-parser.js` parst CMIF-XML zur internen Struktur, `correspsearch-api.js` lädt correspSearch-API-URLs, `state-manager.js` hält Daten und Filterlogik, `formatters.js` formatiert Datum, Person und Ort mit Unsicherheitsanzeige.
- Gemeinsame Helfer in `utils.js`: Escaping (`escapeHtml`, `safeUrl`, `externalLink`, `isAllowedJsonPath`), Schlüssel (`personKey`, `placeKey`), Datumsklassifikation (`classifyDate`), Qualitätszählung (`countIdentifiedPersons`), CSV (`csvCell`), Modal-Tastatur (`enableModalKeyboard`), Toast und Download.
- Infrastruktur: `dom-cache.js`, `constants.js`.
- Anreicherung: `wikidata-enrichment.js` für Personen, `geonames-enrichment.js` für Koordinaten über Wikidata.
- Korb: `basket.js` mit localStorage, Tab-Synchronisation und URL-Teilen.
- Seiten: `upload.js`, `explore.js`, `wissenskorb.js`, `vault.js`, `demo-tour.js`.
- Ansichten in `views/`: Zeitleiste, Aktivität, Chronik, Vergleich, Netzwerk, Erwähnungsfluss, Themen, Orte.

`explore.js` orchestriert. Übersicht, Karte, Korrespondenten, Briefe, Forschungspfade, Wissenspfade, Filter, Export und die Detail-Dialoge liegen weiter dort. Die Ansichtsmodule erhalten ihre Abhängigkeiten über `init*View(deps)` und importieren `explore.js` nicht, damit keine zirkulären Importe entstehen.

## Datenfluss

1. Erweiterter Datensatz: `preprocessing/build_hsa_data.py` erzeugt aus der CMIF-Datei des Hugo Schuchardt Archivs `docs/data/hsa-letters.json` mit Indizes, teiHeader-Metadaten, Koordinaten aus Wikidata und dem Änderungsvermerk `meta.modifications`. `explore.html?json=data/hsa-letters.json` lädt die Datei direkt, `?json=` akzeptiert nur relative Pfade unter `data/` mit Endung `.json`.
2. Upload: `upload.js` übergibt Datei oder URL an `parseCMIF()`, ergänzt Koordinaten aus `docs/data/geonames_coordinates.json` und optional aus Wikidata, speichert das Ergebnis in sessionStorage und leitet zu `explore.html` weiter.
3. correspSearch: URLs der API v2.0 (Host `correspsearch.net`, Pfad `/api/`) gehen an `fetchFromCorrespSearchUrl()`. Ohne Parameter `x` folgt der Lader den Seiten ab `x=1`, solange `notesStmt/relatedItem` eine nächste Seite nennt, höchstens bis `API_DEFAULTS.correspSearchMaxLetters`. Mit `x` lädt er genau diese Seite.
4. Filter: `applyFilters()` schreibt Zeitraum, Sprachen, Person, Ort, Thema und Qualitätsfilter in den state-manager und liest die gefilterten Briefe zurück. Personen ohne Normdaten-ID und Orte ohne GeoNames-ID werden über ihren Namen gefiltert (`personKey`, `placeKey`). Sind alle Sprachen angehakt, gilt kein Sprachfilter.
5. Datenkorb: Ansichten legen Briefe, Personen und Orte über `basket.js` in localStorage ab. Der Explorer übergibt den Datensatz in sessionStorage (`correspData`). Übersteigt er das Kontingent, übergibt er bei `?json=`-Datensätzen nur den Pfad (`correspDataSource`), und `wissenskorb.js` lädt die Datei selbst.
6. Tests: `test.html` lädt `run-all-tests.js`, die Suites lesen echte Fixture-Dateien über `parseCMIF()` ([testing.md](testing.md)).

## Datenmodell

Ein Brief trägt `id`, `url`, `date`, `dateTo`, `year`, `datePrecision` (day, month, year, range, unknown), `dateCertainty`, `sender` und `recipient` (`name`, `id`, `authority`, `precision`), `place_sent` (`name`, `geonames_id`, `lat`, `lon`, `precision`), `language` (`code`, `label`) und `mentions` (`subjects`, `persons`, `places`, bei CMIF v2 zusätzlich `orgs` und `bibls`).

Die Indizes unterscheiden sich zwischen Parser und Vorprozessierung. Der Parser schreibt Sprachen als `{label, letter_count}` und Personen mit `letter_count`, die HSA-Datei Sprachen als Bezeichnungs-String und Personen mit `letters_sent` und `letters_received`. Code, der Zählungen braucht, rechnet sie deshalb aus den Briefen (Sprachfilter, Qualitätsanzeige).

## Ansichten

- Übersicht mit Kennzahlen, Quelle, Lizenz und Änderungsvermerk, Qualitäts-Chips, Einstiegspunkten und Forschungspfaden. Ein Klick auf einen Pfad startet einen Wissenspfad, dessen Leiste durch die Schritte führt.
- Karte (MapLibre mit Clustering, Farbmodus nach Sprache), Korrespondenten, Briefe.
- Zeitleiste, Themen, Orte, Netzwerk, Erwähnungsfluss, Chronik, Aktivität und Vergleich in `views/`.

Die Sidebar ist auf Übersicht, Chronik, Aktivität und Vergleich ausgeblendet. Unter 768 px Breite liegt sie außerhalb des Bildschirms und öffnet sich über den Filter-Schalter der Navigation. Elemente mit `role="button"` reagieren über einen globalen Handler auf Enter und Leertaste, `enableModalKeyboard()` schließt Dialoge mit Escape und führt den Fokus hinein und zurück.

## Entwurfsmuster

- Kein Build: ES-Module direkt im Browser, Deployment als statische Seite. Tree-Shaking und Minifizierung entfallen bewusst.
- Live Bindings: `constants.js` exportiert die Sprachfarben als `const`-Objekt, das `computeLanguageColors()` nach dem Laden eines Korpus neu befüllt.
- URL-State: Ansicht und Filter stehen in der URL, `state-manager.js` serialisiert sie, geschrieben wird mit `replaceState`.
- Speichermodell: Hochgeladene Datensätze liegen in sessionStorage (je nach Browser etwa 5 bis 10 MB), große vorprozessierte Datensätze werden per Pfad geladen, der Korb liegt in localStorage.
- Zustand in `explore.js`: Die Modulvariablen `allLetters`, `filteredLetters`, `dataIndices` und die Filtereingaben bleiben die Arbeitskopie der Ansichten. Der state-manager besitzt die Filterlogik, `applyFilters()` gleicht beide ab.

## Grenzen

- Die Briefliste rendert höchstens 500 Einträge.
- Ein Datensatz in sessionStorage scheitert am Kontingent des Browsers. Für große Datensätze ist die Vorprozessierung zu JSON vorgesehen.
- correspSearch-Abfragen laden höchstens `API_DEFAULTS.correspSearchMaxLetters` Briefe, der Konfigurationsdialog zeigt dann geladene und gefundene Treffer.
- Vorausgesetzt sind ES-Module, DOMParser, Fetch, Web Storage und CSS Custom Properties. Geprüft wird in Chrome (headless, Playwright), andere Browser sind nicht systematisch getestet.
