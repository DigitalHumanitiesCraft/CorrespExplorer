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
updated: 2026-11-15
authors: [Christopher Pollin]
template:
  name: Vorlage Architecture
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/architecture
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-architecture
related: [data, specification, design, testing]
---

# Architecture

CorrespExplorer ist eine statische Browser-Anwendung ohne Backend und ohne Build-Schritt. GitHub Pages liefert den Ordner `docs/` aus, alle Verarbeitung läuft im Browser in ES-Modulen, die Wissensbasis liegt außerhalb in `knowledge/`. Dieses Dokument beschreibt Seiten, Module, Stylesheets, ungenutzten Code, Datenfluss und die Stellen, an denen eine neue Ansicht ansetzt, am Stand `65ea4b8` nach dem Durchgang über alle Ansichten, der auf Refactoring und Distillation vom 2026-11-15 folgte. Die Modulliste mit Exporten führt `docs/js/CONTEXT-MAP.md`, die Ansichtsmodule `docs/js/views/CONTEXT-MAP.md`.

## Stack

| Bibliothek | Version | Zweck | Lizenz |
|---|---|---|---|
| MapLibre GL JS | 4.7.1 | Karte im Explorer und im Korb | BSD-3-Clause |
| noUiSlider | 15.7.1 | Zeitraumregler | MIT |
| D3 | 7.9.0 | Netzwerk, Erwähnungsfluss, Zeitleiste und Netzwerk des Korbs | ISC |
| d3-sankey | 0.12.3 | Erwähnungsfluss | BSD-3-Clause |
| Font Awesome Free | 6.4.0 | Symbole (nur woff2) | Icons CC BY 4.0, Schriften OFL 1.1, Code MIT |
| Inter, Lato, Merriweather | Stand 2026-10-29 | Schriften des Werkzeugs | OFL 1.1 |
| Bausteine der DHCraft-Projektseiten (`dhcraft-tokens.css`, `dhcraft-components.css`, Sora, Instrument Sans) | `brand-assets` bei `b0641cc` | Kopf und Fuß von Startseite und Projektseite | Stylesheets MIT, Schriften OFL 1.1, DHCraft-Zeichen geschützt |

Alle Bibliotheken liegen versioniert in `docs/vendor/` mit ihrer Lizenzdatei, dazu die Länderumrisse von Natural Earth (`docs/vendor/natural-earth/`, [data.md](data.md#länderumrisse)). Die Bausteine der Projektseiten liegen in `docs/assets/dhcraft/`. Raum-Zeit, das Raster der Themen, die untere Figur der Zeit und Kreis und Karte der Startansicht zeichnen ohne Bibliothek auf eine Zeichenfläche. Extern bleibt allein die Grundkarte von OpenFreeMap, die erst angefragt wird, wenn die Kartenansicht zum ersten Mal erscheint. Ohne sie zeigt die Karte die Orte auf einfarbiger Fläche. Wikidata, GeoNames über Wikidata und correspSearch werden nur auf Aktion abgefragt ([ADR-006](specification.md#adr-006-externe-dienste-nur-auf-ausdrückliche-aktion)).

## Seiten

| Seite | Skript | Aufgabe |
|---|---|---|
| `index.html` | `upload.js` mit `start-figures.js` und `start-compose.js` | Startseite aus dem gewählten Bestand, Element der Bestände mit eigenen Daten, Laden von Dateien, Dateilisten und Adressen, Dialog „Datensatz konfigurieren“ für die Anreicherung, Kopf und Fuß der Projektseiten |
| `explore.html` | `explore.js` | Explorer mit Gegenständen, Darstellungen, Schiene, Auswahlzeile mit Briefauszug und Export |
| `wissenskorb.html` | `wissenskorb.js` | Analyseseite des Korbs mit Listen, Zeitleiste, Netzwerk, Karte, Export und Teilen |
| `about.html` | keines | Projektinformation und Lizenzen, Kopf und Fuß der Projektseiten |
| `test.html` | `tests/run-all-tests.js` | Test-Runner, einziger Auslöser eines Laufs |

Kopf und Fuß in der Form der Projektseiten haben `index.html` und seit `8464b92` `about.html`. `explore.html` behält seine eigene Kopfzeile, weil sie die Navigation des Explorers ist ([plan.md](plan.md#kopf-und-fuß-für-den-explorer)).

## Module

Die Module stehen in `docs/js/`, die Ansichten in `docs/js/views/`.

- Daten: `cmif-parser.js` liest CMIF und TEI-Briefsätze, auch mehrere Dateien als einen Bestand (`parseCMIF()`, `parseCMIFFiles()`), führt Einträge gleicher Signatur zusammen, markiert Entsprechungen und unplausible Jahre ([data.md](data.md#was-der-parser-liest)). `correspsearch-api.js` lädt die correspSearch-API seitenweise. Beide bilden die Indizes mit `buildIndices()` aus `utils.js`.
- Zustand: `state-manager.js` hält Daten, Filter und Darstellungszustand und ist der einzige Leser und Schreiber der URL (`toURLParams()`, `fromURLParams()`). Filter: `temporal` (Zeitraum oder undatiert), `year` (ein in einer Figur gewähltes Jahr neben dem Zeitraum), `languages`, `person` und `partner` (die Briefe zwischen zwei Personen), `subject`, `place`, `features` (Merkmale der Überlieferung) und `quality`. Darstellung: `currentView` und `drawerOpen`. `filterLetters()` filtert einen beliebigen Filtersatz, damit eine Ansicht die Briefe aller Filter außer ihrem eigenen zeichnen kann.
- Helfer: `utils.js` (Escaping, Schlüssel `personKey` und `placeKey`, Datumsklassifikation `classifyDate()`, `datedYearRange()`, `isMultiYearSpan()`, Indizes, Dialoge, Toast), `formatters.js` (Datum, Person, Ort mit Unsicherheit, `formatNumber()`, `plural()`, `formatCountOf()` und `sharedLetterLabel()`, das einen anderen Brief derselben Signatur als „Brief vom …“ benennt), `constants.js` (`VIEWS`, `LETTER_FEATURES`, Sprachpalette, Vorgaben, Korbgrenzen), `dom-cache.js`, `export.js` (CSV und JSON).
- Zählung: `research-paths.js` liefert `summarizeCorpus()` und `datasetQuality()`, die Quelle der Kennzahlen von Startansicht, Schiene, Export und Upload. Mehr enthält das Modul nicht mehr, sein Name stammt von den entfernten Forschungspfaden.
- Geteilte Teile der Auswahl: `selection-ui.js` hält, was nach den [gemeinsamen Regeln](design.md#gemeinsame-regeln-aller-ansichten) jede Ansicht gleich tun soll. Es nutzen die Startansicht, `explore.js` für die Titel und die Sprachlegende jeder Ansicht und die Ansichten selbst für Sprachfarben und das blasse Ganze.
  - `countOf(part, total, one, of)` gibt die eine Zählform („774 Orte“, unter einem Filter „95 von 774 Orten“, Regel 7).
  - `renderLanguageKey(host, {counts, totals, chosen, onToggle, onRest, tip, others})` zeichnet die Sprachlegende, die zugleich Anteilsbalken und Sprachfilter ist (Regeln 2, 5, 11). `languageOrder()`, `languageCategory()`, `languageColor()` und `languageName()` geben die eine Reihenfolge und Farbe der Sprachen, `dominantLanguages()` die häufigste Sprache je Marke.
  - `PALE_TOKEN` (`--color-border-light`) und `OUTSIDE_OPACITY` (0.3) sind die Werte, mit denen eine Figur das Ganze blass hinter die Auswahl stellt (Regel 6). Seit `7e04269` sind sie wieder exportiert. Die Zeitansicht liest beide, die Raum-Zeit-Ansicht `OUTSIDE_OPACITY`.
  - `CHOOSABLE` und `OVER_MARK` sind die Klassen, die Zeiger und Umriss sagen lassen, dass ein Klick wählt (Regel 8).
- Auswahl in `explore.js` und `view-support.js`: `revealLetters()` öffnet die Briefe einer eben gesetzten Auswahl im Briefauszug, in der Briefliste setzt es den Fokus auf deren Titel. Ansichten erhalten es über ihre `deps`. `renderViewLanguageKey(host, {others})` in `explore.js` zeichnet mit `renderLanguageKey()` die Sprachlegende einer Ansicht und setzt Zählung, Filter und die Liste der übrigen Sprachen ein. Die Marken zählen die Briefe unter allen Filtern außer der Sprache, die Summen des Bestands einmal nach dem Laden. Jede Ansicht außer der Startansicht erhält sie als `deps.renderLanguageKey`, `others` nennt Farben, die keine Sprache sind. `updateSelectionLine()` und `renderSelectionSentence()` füllen die Auswahlzeile, `selectionMarks()` in `view-support.js` liefert ihre Marken. `renderDataTable(host, {caption, columns, rows, limit, label})` setzt die Tabelle einer Figur hinter einen ruhigen Schalter, dessen Text `label` ist (Vorgabe „Daten als Tabelle“). Der Zustand steht in `host.dataset.tableShown` und überlebt ein Neuzeichnen (Regel 4).
- Kleine Figuren: `mini-figures.js` hält, was Startseite und Startansicht gemeinsam zeichnen: `loadLand()` lädt die Länderumrisse einmal je Seite, `mapFrame()`, `frameProjection()` und `landPath()` legen Ausschnitt und Projektion der kleinen Karte fest, `smallGeometry()` passt die Geometrie des Korrespondenzkreises (`egoGeometry()` aus `network-view.js`) an eine kleine Figur an.
- Startseite: `start-summary.js` definiert mit `summarizeLetters()` und `STATEMENTS`, welche Angaben des Datenmodells die Briefe enthalten und welche Aggregate die Figur zeichnet. `start-compose.js` setzt mit `composeFigure(summary, {lettersInBrowser})` daraus die Figur nach festen Regeln zusammen und bildet mit `missingSentence()` den Satz über Fehlendes. Die Funktion ist rein und in `test-compose.js` geprüft. `start-figures.js` zeichnet die Figur, markiert den Beispielbrief mit nummerierten Marken und verwaltet die Wahl des Bestands. Für das HSA liest sie `docs/data/examples.json`, das `preprocessing/build_examples.py` nach denselben Regeln erzeugt. Kreis und Zeitseite übernimmt sie lazy aus `network-view.js` und `timeline-view.js`.
- Anreicherung: `wikidata-enrichment.js`, `geonames-enrichment.js`, beide mit `AbortSignal`.
- Korb: `basket.js` (ein Korb je Datensatz in localStorage, Tab-Synchronisation, Teilen per URL) und `knowledge-path.js`, das nur noch den Korbabschnitt der Seitenleiste enthält (`initKnowledgePath()`, `basketSelectionForView()`). Der Modulname stammt vom entfernten Wissenspfad.
- Ansichten: je ein Modul für Startansicht (`overview-view.js`), Karte, Raum-Zeit, Korrespondenten mit Personen-Dialog, Briefe mit Brief-Dialog, Zeit, Themen, Orte, Netzwerk, Erwähnungsfluss und Vergleich, dazu `letters-drawer.js` für den Briefauszug und `view-support.js` für Geteiltes (Filtersatz, Tokens für Grafiken, Tabellen als Textalternative, Stern des Korbs, Zeilen der Dialoge).

Einzelne Ansichten:

- `map-view.js` legt Karte, Stil und Kacheln der Grundkarte erst beim ersten Zeigen der Ansicht an (`resizeMap()`), die Knöpfe in der Ecke wirken erst, wenn die Karte besteht. Jeder Ort erhält seine Briefe je Sprachkategorie als Eigenschaften (`placeCategoryCounts()`), die Cluster summieren sie und nehmen die Farbe der Sprache mit den meisten Briefen.
- `overview-view.js` zeichnet das Dashboard der Startansicht, Zeit mit Griffen und Sprachlegende als SVG, Kreis und Karte auf Zeichenflächen, Themen und Überlieferung als Knöpfe. `lettersBeside(dimension)` gibt jeder kleinen Darstellung die Briefe aller Filter außer ihres eigenen. `renderDatasetFacts()` füllt den Block des Bestands, den `initRail()` hinter das Info-Zeichen legt.
- `network-view.js` hat zwei Betriebsarten. „Ego“ baut mit `buildEgoNetwork()` den Korrespondenzkreis um eine Person (Partner mit Briefzahl und erstem Brief, Sehnen zwischen Korrespondenten, erwähnte Personen als äußerer Ring) und legt ihn mit `egoGeometry()`, `egoScales()` und `egoLayout()` aus, alles reine Funktionen. Die Punkte färbt es mit `dominantLanguages()`, die nur Erwähnten in `--color-text`. `chordPaintOrder()` zeichnet die Sehnen von der schmalsten zur breitesten, `chordHitWidth()` gibt jeder eine unsichtbare Trefferfläche von mindestens 10px. „Gesamt“ ist das Kräftelayout mit den Bauern aus `NETWORK_BUILDERS` (Briefwechsel, Zeitgenossen, Themen).
- `spacetime-view.js` aggregiert Briefe je Ort und Jahr mit der häufigsten Sprache (`aggregatePlaceYears()`), projiziert orthographisch ohne Bibliothek (`groundLayout()`, `projectPoint()`, `fitBox()`) und zeichnet auf eine Zeichenfläche. Achse und Ortsnamen sind SVG darüber, der Zeiger wird über die Geometrie der letzten Zeichnung zugeordnet (`hitAt()`).
- `letters-view.js` sortiert (`sortLetters()`), gruppiert (`groupLetters()`) und zählt das Jahresprofil (`selectionProfile()`), alles rein. `rowCentre()` bestimmt die zentrale Person, `letterDirection()` die Richtung eines Briefs von ihr aus. `renderLetterGroups()` schreibt Zeilen erst, wenn ihre Gruppe in die Nähe des sichtbaren Teils kommt, und dient Briefliste und Briefauszug.
- `letters-drawer.js` zeigt die Briefe der Auswahl über jeder Ansicht, mit Zeilen und Dialog aus `letters-view.js`. In der Briefliste führt dieselbe Zahl zur Liste selbst (`updateLettersDrawer({inList})`). `drawerCountText()` bildet die Zahl der Auswahlzeile.
- `timeline-view.js` ist die eine Zeitansicht mit dem Profil je Jahr oben und dem gewählten Zeitraum unten in der feinsten lesbaren Auflösung (`timeResolution()`, `binLetters()`, `periodLetters()`, `axisInterval()`, `letterSide()`), einzelne Briefe bis `LETTER_LIMIT`. Hinter dem Profil zeichnet sie den ganzen Bestand je Jahr blass (`wholeYears()`). Stelle im Briefwechsel, Lebensdaten und Alter liest sie aus `chronik-view.js`.
- `chronik-view.js` hält nur noch den Index der Briefwechsel (`buildCorrespondenceIndex()`, `correspondenceContext()`, `contextText()`) und die Anreicherung mit Lebensdaten auf Aktion (`personAge()`, `lifeDatesOf()`), die die Zeitansicht von der Chronik übernimmt.
- `topics-view.js` zeichnet das Raster aus Themen und Jahren auf eine Zeichenfläche, die Namen sind HTML-Optionen darüber (`subjectProfiles()`, `orderSubjects()` mit `languagesApart` für die Sprachen als eigene Gruppe, `matchSubjects()`, `topEntries()`, `shadeStep()` mit `SHADE_BOUNDS`), und die Treemap „Anteile“ (`mapGroups()`, `splitTail()`, `restLabel()`, `restShare()`, `MIN_AREA`).

`explore.js` orchestriert: Es lädt den Datensatz, hält die Filtereingaben der Schiene, das gewählte Jahr und das Gegenüber als Arbeitskopie, wechselt die Ansicht, füllt die Auswahlzeile, richtet die Schiene ein (`initRail()`, `openRailPanel()`, `syncRail()`) und öffnet den Export. Die Ansichtsmodule erhalten ihre Abhängigkeiten über `init*View(deps)` und importieren `explore.js` nicht.

## Stylesheets

Ladereihenfolge und Zuständigkeit führt `docs/css/CONTEXT-MAP.md`. Seit dem 2026-11-14 hinzugekommen:

- `rail.css`: die Schiene, die Auswahlzeile und die Sprachlegende, also die Teile, die jede Ansicht teilt.
- `dashboard.css`: Block des Bestands und Dashboard der Startansicht.
- `letters.css`: Briefliste und Liste des Briefauszugs.
- `time.css`: die Zeitansicht.
- `topics.css`: Raster und Anteile.
- `site-frame.css`: passt Kopf und Fuß der Projektseiten an das Werkzeug an, für `index.html` und `about.html`. Die Bausteine aus `assets/dhcraft/` liegen in der Kaskadenebene `dh`, die ungeschichteten Regeln des Werkzeugs haben Vorrang, deshalb setzt die Datei Abstände und Farben von Kopf und Fuß neu. Kopf und Fuß nutzen die Schriften Sora und Instrument Sans, der Seitenkörper behält die Schriften des Werkzeugs.

`docs/assets/dhcraft/` enthält die unverändert kopierten Bausteine der Projektseiten aus dem Repository `brand-assets` mit Herkunft und Lizenz ([data.md](data.md#gemeinsame-bausteine-der-projektseiten)). Eine neuere Fassung wird durch erneutes Kopieren des Ordners übernommen, angepasst wird nur in `site-frame.css`.

## Ungenutzt

Das Refactoring vom 2026-11-15 (Schritt „refactoren“ der Promptotyping-Folge) hat entfernt, was keine Oberfläche mehr erreichte. Entfernt sind:

- Tutorial und Tour: `demo-tour.js`, der Einstieg `demo=true` mit `loadDemoDataset()` und `DEMO_DATASET_URL`, Markup und Regeln der Tour, ihr Knopf im Block des Bestands und der Abschnitt der Tour in `about.html`. Ältere Links mit `demo=true` oder `tour=0` öffnen ohne Fehler, ein Link mit `demo=true` ohne Datensatz führt ohne Hinweis auf die Startseite. `docs/data/demo-showcase.xml` bleibt als Testdatei.
- `views/activity-view.js` mit der Kalender-Heatmap und seinen Tests, die Knöpfe „Chronik“ und „Tage“ und die Regeln `.chronik-*` und `.activity-*`. `view=activity` und `view=chronik` öffnen weiter die Zeitansicht, beide Namen stehen dafür in `VIEWS`.
- Die Maschinerie der Forschungspfade mit Pfadleiste, Fragekarten und `analyzeResearchQuestions()`. `knowledge-path.js` enthält nur noch den Korb, `research-paths.js` nur noch `summarizeCorpus()` und `datasetQuality()`.
- Tote Regeln, ungenutzte Exporte, ungenutzte Getter in `dom-cache.js` und `renderFilterNotice()`. Einige Exporte sind modulintern geworden. `PALE_TOKEN` und `OUTSIDE_OPACITY` exportiert `selection-ui.js` seit `7e04269` wieder.

Was ungenutzt bleibt und im [Plan](plan.md#aufräumen) steht:

- Dateien, auf die keine Seite verweist: `docs/data/hsa.xml` (`verification/task_set.py` zählt darin die Antwort zu US-01 und US-02, `resolve_geonames_wikidata.py` überspringt sie), `docs/data/schoenbach.xml`, `docs/assets/logo-no-background.png`, `docs/assets/logo.jpg` und `docs/favicon.svg`.
- Tokens in `tokens.css`, die kein Stylesheet und kein Skript liest, darunter die Stufen `--color-scale-1` bis `--color-scale-4`.
- `persons-view.js` importiert `getPersonInitials()`, ohne es aufzurufen.
- Die Kacheln `#sidebar-dataset` sind ausgeblendet und werden befüllt, die Moduswahl des Vergleichs steht verborgen im Markup.
- Mehrfach gebaute Helfer für Hinweisfelder, Trefferprüfung und die zentrale Person in Startansicht, Zeit, Raum-Zeit, Themen, Briefliste und Netzwerk.

## Wo eine neue Ansicht ansetzt

1. Modul `docs/js/views/<name>-view.js` mit `init<Name>View(deps)` und einer Zeichenfunktion, eigenes Stylesheet in `docs/css/` mit `<link>` in `explore.html`.
2. `VIEWS` in `constants.js`, damit `view=<name>` als Adresse gilt.
3. In `explore.js`: Import und Aufruf von `init…` mit den `deps`, die die Ansicht braucht, `revealLetters` eingeschlossen, wenn sie Briefe öffnet. Eintrag in `VIEW_GROUPS` unter ihrem Gegenstand, Bedingung in `detectAvailableViews()`, `case` in `renderView()`, bei Bedarf ein Titel in `updateViewTitle()`. Setzt die Ansicht Zeitraum oder Sprache selbst, blendet `syncRail()` das Zeichen der Schiene für sie aus.
4. In `explore.html`: Knopf in `#view-variants` mit `.view-btn-text`, aus dem das Menü unter dem Reiter seinen Namen liest, und ein Bereich `<div id="<name>-view" class="tab-content">` mit `.view-header` und `h2.view-header__title`. Das Menü entsteht aus `VIEW_GROUPS`.
5. Die geteilten Teile verwenden statt eigener: `countOf()` für Zählungen, `renderLanguageKey()` für Sprachen, die Werte `PALE_TOKEN` oder `OUTSIDE_OPACITY` für das blasse Ganze, `deps.renderLanguageKey` für die Sprachlegende, `CHOOSABLE` und `OVER_MARK` für wählbare Marken, `renderDataTable()` mit eigenem `label` für die Tabelle, `revealLetters()` für die Briefe. Die Ansicht setzt keine eigene Zahl der Auswahl und keinen eigenen Filtersatz, beides steht in der Auswahlzeile.
6. `VIEWS` und `GROUP_OF` in `tests/browser/smoke.py`, eine Suite für die reinen Funktionen, registriert in `run-all-tests.js`, `docs/js/views/CONTEXT-MAP.md`, und die Story in [specification.md](specification.md).

## Datenfluss

1. Laden. `upload.js` übergibt Datei, Dateien oder Adresse an den Parser, ergänzt Koordinaten aus `docs/data/geonames_coordinates.json` und auf Wunsch aus Wikidata, legt das Ergebnis in sessionStorage und leitet zum Explorer. `explore.html?json=data/….json` lädt einen vorprozessierten Datensatz direkt (nur relative Pfade unter `data/`), `?files=` eine Dateiliste, `cs=` eine correspSearch-Abfrage. Ohne Datensatz leitet der Explorer zur Startseite mit Hinweis.
2. Startseite. `start-figures.js` lädt den gewählten Bestand (HSA aus `examples.json`, lokaler Bestand über die Dateiliste, eigene Daten aus dem Parser), fasst ihn mit `summarizeLetters()` zusammen, lässt `composeFigure()` die Figuren wählen und zeichnet sie. Ein Titel öffnet den Explorer in ihrer Darstellung, bei eigenen Daten über `upload.js`.
3. Indizes und Kennzahlen. Beim Laden bildet `explore.js` einmal `summarizeCorpus()` und `datasetQuality()` über alle Briefe. Die Indexformen von Parser und HSA-Datei unterscheiden sich ([Datenmodell](#datenmodell)), Zählungen kommen deshalb aus den Briefen.
4. Filter. `fromURLParams()` setzt alle Filter vor dem ersten Zeichnen. `applyFilters()` schreibt die Eingaben der Schiene, das gewählte Jahr und das Gegenüber in den state-manager und liest die gefilterten Briefe zurück. Auswahlzeile und Titel der Ansichten folgen daraus.
5. Ansichten. Die aktive Ansicht zeichnet die gefilterten Briefe. Raum-Zeit, Themen, Korrespondenzkreis, das Profil der Zeitansicht und die kleinen Darstellungen der Startansicht zeichnen die Briefe aller Filter außer dem, der in ihnen gewählt ist, und heben die Wahl hervor.
6. URL. `updateUrlState()` legt bei einem Ansichtswechsel einen Historieneintrag an und ersetzt ihn bei Filteränderungen. Bei Zurück wechselt der Explorer nur die Ansicht, wenn die Filter gleich sind, sonst lädt er neu.
7. Korb. Ansichten legen Briefe, Personen und Orte über `basket.js` ab, unter einem Schlüssel je Datensatz. Die Analyseseite wertet die Vereinigung aus Briefen des Korbs und allen Briefen seiner Personen und Orte aus.
8. Vorprozessierung außerhalb des Browsers: `build_hsa_data.py` erzeugt `hsa-letters.json`, `build_examples.py` daraus `examples.json`, `resolve_geonames_wikidata.py` die Koordinatentabelle.

## Datenmodell

Ein Brief hat `id`, `url`, `date`, `dateTo`, `year`, `datePrecision` (day, month, year, range, unknown), `dateCertainty`, `sender` und `recipient` (`name`, `id`, `authority`, `precision`, wo vorhanden `localRef` und `isOrganization`), `place_sent` (`name`, `geonames_id`, `lat`, `lon`, `precision`), `language` (`code`, `label`) und `mentions` (`subjects`, `persons`, `places`, bei CMIF v2 `orgs` und `bibls`).

Wo die Quelle es enthält, kommen hinzu: `senders` und `recipients` bei mehreren Beteiligten (`letterRecipients()` liefert die Empfänger jedes Briefs), `dateInferred`, `dateText`, `dateWording`, `dateSupplied` (der Wortlaut eines ergänzten Datums neben dem gelesenen), `dateBound`, `dateImplausible`, `placeText`, `placeAlternatives` (weitere Absendeorte mit Name, GeoNames-ID und Markierung), `postmark`, `address` und bei mehreren Anschriften `addresses`, `signature`, `records` und `recordsDiffer`, `sharedSignature` (die anderen Briefe einer Signatur mit abweichendem Datum, je mit `id` und `date`), `furtherActions`, `file` und `parallels`, am Absendeort `inferred`. Ein Brief ohne diese Angaben behält seine Form. Bedeutung und Erkennung in [data.md](data.md#was-der-parser-liest) und [uncertainty-specification.md](uncertainty-specification.md#editorial-inference-postmarks-and-implausible-years).

Die Briefe der HSA-Datei haben bei Personen und Orten kein Feld `precision`. Parser und correspSearch-Lader schlüsseln Indizes mit `personKey` und `placeKey` und zählen `letter_count`. Die HSA-Datei schreibt Sprachen als Bezeichnung, Personen mit `viaf`, `letters_sent` und `letters_received` und nur Personen mit Normdaten-ID. `personAuthority()` liest beide Formen.

## Entwurfsmuster

- Kein Build: ES-Module direkt im Browser.
- Live Bindings: `constants.js` exportiert die Sprachfarben als Objekt, das `computeLanguageColors()` nach dem Laden neu befüllt, damit alle Ansichten und die Startfigur dieselbe Zuordnung lesen.
- Zeichenfläche für große Szenen mit Trefferprüfung über die Geometrie ([design.md](design.md#zeichenflächen-für-große-szenen)).
- Speicher: hochgeladene Datensätze in sessionStorage (etwa 5 bis 10 MB je Browser), vorprozessierte per Pfad, der Korb in localStorage.
- Doppelte Haltung der Filter: Die Modulvariablen in `explore.js` sind die Arbeitskopie, der state-manager besitzt die Filterlogik, `applyFilters()` gleicht beide ab ([plan.md](plan.md#aufräumen)).

## Grenzen

- Ein Upload in sessionStorage scheitert am Kontingent des Browsers, große Datensätze werden vorprozessiert.
- Ein geteilter Link enthält bei einem Upload nur Ansicht und Filter.
- correspSearch-Abfragen laden höchstens `API_DEFAULTS.correspSearchMaxLetters` Briefe.
- Geprüft wird in Chrome über Playwright, andere Browser sind nicht systematisch getestet.
