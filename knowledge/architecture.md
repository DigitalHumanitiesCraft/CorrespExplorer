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
updated: 2026-11-14
authors: [Christopher Pollin]
template:
  name: Vorlage Architecture
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/architecture
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-architecture
related: [data, specification, design, testing]
---

# Architecture

CorrespExplorer ist eine statische Browser-Anwendung ohne Backend und ohne Build-Schritt. GitHub Pages liefert den Ordner `docs/` aus, alle Verarbeitung läuft im Browser in ES-Modulen, die Wissensbasis liegt außerhalb in `knowledge/`. Dieses Dokument beschreibt Seiten, Module, Datenfluss und die Stellen, an denen eine neue Ansicht ansetzt. Die Modulliste mit Exporten führt `docs/js/CONTEXT-MAP.md`, die Ansichtsmodule `docs/js/views/CONTEXT-MAP.md`.

## Stack

| Bibliothek | Version | Zweck | Lizenz |
|---|---|---|---|
| MapLibre GL JS | 4.7.1 | Karte im Explorer und im Korb | BSD-3-Clause |
| noUiSlider | 15.7.1 | Zeitraumregler | MIT |
| D3 | 7.9.0 | Netzwerk, Erwähnungsfluss, Zeitleiste und Netzwerk des Korbs | ISC |
| d3-sankey | 0.12.3 | Erwähnungsfluss | BSD-3-Clause |
| Font Awesome Free | 6.4.0 | Symbole (nur woff2) | Icons CC BY 4.0, Schriften OFL 1.1, Code MIT |
| Inter, Lato, Merriweather | Stand 2026-10-29 | Schriften | OFL 1.1 |

Alle Bibliotheken liegen versioniert in `docs/vendor/` mit ihrer Lizenzdatei, dazu die Länderumrisse von Natural Earth (`docs/vendor/natural-earth/`, [data.md](data.md#länderumrisse)). Raum-Zeit und Themen zeichnen ohne Bibliothek auf eine Zeichenfläche. Extern bleibt allein die Grundkarte von OpenFreeMap, ohne sie zeigt die Karte die Orte auf einfarbiger Fläche. Wikidata, GeoNames über Wikidata und correspSearch werden nur auf Aktion abgefragt ([ADR-006](specification.md#adr-006-externe-dienste-nur-auf-ausdrückliche-aktion)).

## Seiten

| Seite | Skript | Aufgabe |
|---|---|---|
| `index.html` | `upload.js` mit `start-figures.js` | Startfigur, Wahl des Beispiels, Laden eigener Dateien, Dateilisten und Adressen, Dialog „Datensatz konfigurieren“ für die Anreicherung |
| `explore.html` | `explore.js` | Explorer mit Gegenständen, Darstellungen, Seitenleiste, Briefauszug und Export |
| `wissenskorb.html` | `wissenskorb.js` | Analyseseite des Korbs mit Listen, Zeitleiste, Netzwerk, Karte, Export und Teilen |
| `about.html` | keines | Projektinformation, Lizenzen |
| `test.html` | `tests/run-all-tests.js` | Test-Runner, einziger Auslöser eines Laufs |

## Module

Die Module stehen in `docs/js/`, die Ansichten in `docs/js/views/`.

- Daten: `cmif-parser.js` liest CMIF und TEI-Briefsätze, auch mehrere Dateien als einen Bestand (`parseCMIF()`, `parseCMIFFiles()`), führt Einträge gleicher Signatur zusammen, markiert Entsprechungen und unplausible Jahre ([data.md](data.md#was-der-parser-liest)). `correspsearch-api.js` lädt die correspSearch-API seitenweise. Beide bilden die Indizes mit `buildIndices()` aus `utils.js`.
- Zustand: `state-manager.js` hält Daten, Filter und Darstellungszustand und ist der einzige Leser und Schreiber der URL (`toURLParams()`, `fromURLParams()`). Filter: `temporal` (Zeitraum oder undatiert), `year` (ein in einer Figur gewähltes Jahr neben dem Zeitraum), `languages`, `person` und `partner` (die Briefe zwischen zwei Personen), `subject`, `place`, `features` (Merkmale der Überlieferung) und `quality`. Darstellung: `currentView` und `drawerOpen`. `filterLetters()` filtert einen beliebigen Filtersatz, damit eine Ansicht die Briefe aller Filter außer ihrem eigenen zeichnen kann.
- Helfer: `utils.js` (Escaping, Schlüssel `personKey` und `placeKey`, Datumsklassifikation `classifyDate()`, `datedYearRange()`, `isMultiYearSpan()`, Indizes, Dialoge, Toast), `formatters.js` (Datum, Person, Ort mit Unsicherheit), `constants.js` (`VIEWS`, `LETTER_FEATURES`, Sprachpalette, Vorgaben, Korbgrenzen), `dom-cache.js`, `export.js` (CSV und JSON).
- Zählung: `research-paths.js` liefert `summarizeCorpus()` und `datasetQuality()`, die Quelle der Kennzahlen von Startansicht, Seitenleiste und Export. Die übrigen Funktionen des Moduls (`analyzeResearchQuestions()`, die Darstellung der Pfade) haben seit 2026-11-14 keinen Einstieg mehr in der Oberfläche.
- Startfigur: `start-summary.js` definiert mit `summarizeLetters()` und `STATEMENTS`, welche Angaben des Datenmodells die Briefe tragen und welche Aggregate die Figur zeichnet. `start-figures.js` zeichnet die drei Bänder, markiert den Beispielbrief und lädt die Länderumrisse. Für das HSA liest sie `docs/data/examples.json`, das `preprocessing/build_examples.py` nach denselben Regeln erzeugt. Den Korrespondenzkreis übernimmt sie aus `network-view.js` (`egoGeometry()`, `egoLayout()`), lazy geladen.
- Anreicherung: `wikidata-enrichment.js`, `geonames-enrichment.js`, beide mit `AbortSignal`.
- Korb und Führung: `basket.js` (ein Korb je Datensatz in localStorage, Tab-Synchronisation, Teilen per URL), `knowledge-path.js` (Korbabschnitt der Seitenleiste und die Pfadleiste ohne Einstieg), `demo-tour.js`.
- Ansichten: je ein Modul für Übersicht (Arbeitsfläche), Karte, Raum-Zeit, Korrespondenten mit Personen-Dialog, Briefe mit Brief-Dialog, Zeitleiste, Themen, Orte, Netzwerk, Erwähnungsfluss, Chronik, Aktivität und Vergleich, dazu `letters-drawer.js` für den Briefauszug und `view-support.js` für Geteiltes (Filtersatz, Tokens für Grafiken, Tabellen als Textalternative, Stern des Korbs, Zeilen der Dialoge).

Einzelne Ansichten:

- `network-view.js` hat zwei Betriebsarten. „Ego“ baut mit `buildEgoNetwork()` den Korrespondenzkreis um eine Person (Partner mit Briefzahl und erstem Brief, Sehnen zwischen Korrespondenten, erwähnte Personen als äußerer Ring) und legt ihn mit `egoGeometry()`, `egoScales()` und `egoLayout()` aus, alles reine Funktionen. „Gesamt“ ist das Kräftelayout mit den Bauern aus `NETWORK_BUILDERS` (Briefwechsel, Zeitgenossen, Themen).
- `spacetime-view.js` aggregiert Briefe je Ort und Jahr mit der häufigsten Sprache (`aggregatePlaceYears()`), projiziert orthographisch ohne Bibliothek (`groundLayout()`, `projectPoint()`, `fitBox()`) und zeichnet auf eine Zeichenfläche. Achse und Ortsnamen sind SVG darüber, der Zeiger wird über die Geometrie der letzten Zeichnung zugeordnet (`hitAt()`). `screenPositionOf()` liefert Prüfungen die Bildschirmposition einer Marke.
- `topics-view.js` zeichnet die Themen als Kämme über einer gemeinsamen Zeitachse auf eine Zeichenfläche, die Namen sind HTML-Knöpfe darüber (`subjectProfiles()`, `orderSubjects()`, `matchSubjects()`, `topEntries()`).
- `letters-drawer.js` zeigt die Briefe der Auswahl unter jeder Ansicht außer der Briefliste, wächst beim Scrollen in Schritten und nutzt Zeilen und Dialog aus `letters-view.js`.

`explore.js` orchestriert: Es lädt den Datensatz, hält die Filtereingaben der Seitenleiste, das gewählte Jahr und das Gegenüber als Arbeitskopie, wechselt die Ansicht, setzt den Satz der Auswahl und öffnet den Export. Die Ansichtsmodule erhalten ihre Abhängigkeiten über `init*View(deps)` und importieren `explore.js` nicht.

## Wo eine neue Ansicht ansetzt

1. Modul `docs/js/views/<name>-view.js` mit `init<Name>View(deps)` und `render<Name>()`, eigenes Stylesheet in `docs/css/`.
2. `VIEWS` in `constants.js`, damit `view=<name>` als Adresse gilt.
3. In `explore.js`: Import und Aufruf von `init…`, Eintrag in `VIEW_GROUPS` unter ihrem Gegenstand, Bedingung in `detectAvailableViews()`, `case` im Render-Schalter, bei Bedarf `SIDEBAR_VIEWS` und `FILTER_INDICATOR_VIEWS`.
4. In `explore.html`: Knopf in `#view-variants`, Bereich `<div id="<name>-view" class="tab-content">` mit `.view-header`, Stylesheet. Das Menü unter dem Reiter entsteht aus `VIEW_GROUPS`.
5. `VIEWS` in `tests/browser/smoke.py`, eine Suite für die reinen Funktionen, `docs/js/views/CONTEXT-MAP.md`, und die Story in [specification.md](specification.md).

## Datenfluss

1. Laden. `upload.js` übergibt Datei, Dateien oder Adresse an den Parser, ergänzt Koordinaten aus `docs/data/geonames_coordinates.json` und auf Wunsch aus Wikidata, legt das Ergebnis in sessionStorage und leitet zum Explorer. `explore.html?json=data/….json` lädt einen vorprozessierten Datensatz direkt (nur relative Pfade unter `data/`), `?files=` eine Dateiliste, `demo=true` das Tutorial, `cs=` eine correspSearch-Abfrage. Ohne Datensatz leitet der Explorer zur Startseite mit Hinweis.
2. Startfigur. `start-figures.js` lädt den gewählten Bestand (Tutorial im Browser, HSA aus `examples.json`, lokaler Bestand über die Dateiliste, eigene Daten aus dem Parser), fasst ihn mit `summarizeLetters()` zusammen und zeichnet die Bänder. Ein Link einer Angabe öffnet den Explorer in ihrer Darstellung.
3. Indizes und Kennzahlen. Beim Laden bildet `explore.js` einmal `summarizeCorpus()` und `datasetQuality()` über alle Briefe. Die Indexformen von Parser und HSA-Datei unterscheiden sich ([Datenmodell](#datenmodell)), Zählungen kommen deshalb aus den Briefen.
4. Filter. `fromURLParams()` setzt alle Filter vor dem ersten Zeichnen. `applyFilters()` schreibt die Eingaben der Seitenleiste, das gewählte Jahr und das Gegenüber in den state-manager und liest die gefilterten Briefe zurück. Der Satz der Auswahl, die Titel der Ansichten und die Zeile des Briefauszugs folgen daraus.
5. Ansichten. Die aktive Ansicht zeichnet die gefilterten Briefe. Raum-Zeit, Themen und der Korrespondenzkreis zeichnen die Briefe aller Filter außer dem, der in ihnen gewählt ist, und heben die Wahl hervor.
6. URL. `updateUrlState()` legt bei einem Ansichtswechsel einen Historieneintrag an und ersetzt ihn bei Filteränderungen. Bei Zurück wechselt der Explorer nur die Ansicht, wenn die Filter gleich sind, sonst lädt er neu.
7. Korb. Ansichten legen Briefe, Personen und Orte über `basket.js` ab, unter einem Schlüssel je Datensatz. Die Analyseseite wertet die Vereinigung aus Briefen des Korbs und allen Briefen seiner Personen und Orte aus.
8. Vorprozessierung außerhalb des Browsers: `build_hsa_data.py` erzeugt `hsa-letters.json`, `build_examples.py` daraus `examples.json`, `resolve_geonames_wikidata.py` die Koordinatentabelle.

## Datenmodell

Ein Brief trägt `id`, `url`, `date`, `dateTo`, `year`, `datePrecision` (day, month, year, range, unknown), `dateCertainty`, `sender` und `recipient` (`name`, `id`, `authority`, `precision`, wo vorhanden `localRef` und `isOrganization`), `place_sent` (`name`, `geonames_id`, `lat`, `lon`, `precision`), `language` (`code`, `label`) und `mentions` (`subjects`, `persons`, `places`, bei CMIF v2 `orgs` und `bibls`).

Wo die Quelle es trägt, kommen hinzu: `senders` und `recipients` bei mehreren Beteiligten (`letterRecipients()` liefert die Empfänger jedes Briefs), `dateInferred`, `dateText`, `dateWording`, `dateBound`, `dateImplausible`, `placeText`, `postmark`, `address`, `signature`, `records` und `recordsDiffer`, `furtherActions`, `file` und `parallels`, am Absendeort `inferred`. Ein Brief ohne diese Angaben behält seine Form. Bedeutung und Erkennung in [data.md](data.md#was-der-parser-liest) und [uncertainty-specification.md](uncertainty-specification.md#editorial-inference-postmarks-and-implausible-years).

Die Briefe der HSA-Datei tragen bei Personen und Orten kein Feld `precision`. Parser und correspSearch-Lader schlüsseln Indizes mit `personKey` und `placeKey` und zählen `letter_count`. Die HSA-Datei schreibt Sprachen als Bezeichnung, Personen mit `viaf`, `letters_sent` und `letters_received` und nur Personen mit Normdaten-ID. `personAuthority()` liest beide Formen.

## Entwurfsmuster

- Kein Build: ES-Module direkt im Browser.
- Live Bindings: `constants.js` exportiert die Sprachfarben als Objekt, das `computeLanguageColors()` nach dem Laden neu befüllt, damit alle Ansichten und die Startfigur dieselbe Zuordnung lesen.
- Zeichenfläche für große Szenen mit Trefferprüfung über die Geometrie ([design.md](design.md#zeichenflächen-für-große-szenen)).
- Speicher: hochgeladene Datensätze in sessionStorage (etwa 5 bis 10 MB je Browser), vorprozessierte per Pfad, der Korb in localStorage.
- Doppelte Haltung der Filter: Die Modulvariablen in `explore.js` sind die Arbeitskopie, der state-manager besitzt die Filterlogik, `applyFilters()` gleicht beide ab ([plan.md](plan.md#aufräumen)).

## Grenzen

- Ein Upload in sessionStorage scheitert am Kontingent des Browsers, große Datensätze werden vorprozessiert.
- Ein geteilter Link trägt bei einem Upload nur Ansicht und Filter.
- correspSearch-Abfragen laden höchstens `API_DEFAULTS.correspSearchMaxLetters` Briefe.
- Geprüft wird in Chrome über Playwright, andere Browser sind nicht systematisch getestet.
