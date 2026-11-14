# Views Context Map

Ansichtsmodule des Explorers. `explore.js` ruft beim Start `init*View(deps)` mit den Abhängigkeiten auf, die Render-Funktion der aktuellen Ansicht bei jedem Wechsel in die Ansicht und nach jeder Filteränderung (`renderView()` für alle zwölf Ansichten). Die Module importieren `explore.js` nicht, damit keine zirkulären Importe entstehen. Gefilterte und alle Briefe lesen sie über die injizierten Funktionen, eigener Zustand ist Darstellungszustand wie Auswahl, Layout, Zoom und die Brief-IDs des offenen Details. Übersicht, Karte, Korrespondenten und Briefe liegen in `explore.js`.

| Modul | Ansicht | Abhängigkeiten aus explore.js | Exporte |
|---|---|---|---|
| overview-view.js | Übersicht: Kennzahlen, Quelle und Lizenz, Chips der Datenlage, Merkmale der Überlieferung als Knöpfe in die Briefliste, Einstiege, Forschungspfade | getAllLetters, getDataIndices, getCorpusSummary, getCorpusQuality, getAvailableViews, showLettersWithFeature, switchView | initOverviewView, renderOverview |
| map-view.js | Karte der Absendeorte (MapLibre, Clustering, Farbe nach dominanter Sprache oder einheitlich), Popup je Ort mit Korb, Briefen und häufigsten Absendern, Rückfall ohne Grundkarte | getPlaceAggregation, applyPlaceFilter, applyPersonFilter, switchView | initMapView, updateMapPlaces, resizeMap, aggregateLettersByPlace |
| persons-view.js | Korrespondentenliste mit Suche, Ordnung und Auswahl der Art, Personen-Dialog mit `personFacts()` aus allen Briefen und Wikidata erst auf Klick („Wikidata nicht erreichbar“ getrennt von „Kein Wikidata-Eintrag“) | getFilteredLetters, getAllLetters, getDataIndices, showLettersOfPerson | initPersonsView, renderPersonsList |
| letters-view.js | Briefliste mit Zahlzeile, Suche, Ordnung und Nachladen in Schritten, Brief-Dialog mit allen Angaben und allen Einträgen der Quelle | getFilteredLetters, getAllLetters, hasActiveFilter, showLettersOfPerson | initLettersView, renderLettersList, showLetterDetail, clearLetterSearch |
| timeline-view.js | Gestapelte Jahresbalken nach Sprache, Balken der undatierten Briefe und der Spannen über mehrere Jahre, Tabelle je Jahr als Textalternative. Jahresbalken mit `role="button"` und Roving Tabindex: Enter filtert auf das Jahr, Umschalt und Enter legt seine Briefe in den Korb | getFilteredLetters, getAllLetters, applyFilters, switchView, showUndatedLetters, showLettersWithFeature | initTimelineView, renderTimeline |
| topics-view.js | Themenliste mit Detail, Korrespondenten, Zeitverlauf und verwandten Themen. Das Detail folgt dem Filter, die Detailauswahl ist vom Themenfilter getrennt | getFilteredLetters, getAllLetters, applySubjectFilter | initTopicsView, renderTopicsList, getSubjectIndex |
| places-view.js | Ortsliste mit Detail aus den gefilterten Briefen, Hinweis auf Orte ohne Koordinaten und Auflösung über Wikidata, Schlüssel durchgehend `placeKey` | getFilteredLetters, getAllLetters, getDataIndices, applyPlaceFilter, switchView, onDataUpdated | initPlacesView, renderPlacesList, indexPlaces, coordinateCoverage, countLettersByPlace |
| network-view.js | Netzwerk des Briefwechsels (Standard, Kante zwischen Absender und Empfänger nach Zahl der Briefe), der Zeitgenossen (Absender, Kante bei gemeinsamen aktiven Jahren) oder der Themen (D3), Aufbau über `NETWORK_BUILDERS`, Tabelle der Verbindungen als Textalternative. Unter reduzierter Bewegung wird das Layout vorab berechnet (`settleWithoutMotion`). `defaultNetworkThreshold()` senkt die Standardschwelle, bis der Datensatz eine Kante zeigt. Knoten mit Roving Tabindex, Enter filtert. Eine neue Darstellung stoppt die alte Simulation | getFilteredLetters, getAllLetters, applyPersonFilter, applySubjectFilter, switchView | initNetworkView, renderNetwork, resetNetworkZoom, defaultNetworkThreshold, buildCorrespondenceNetwork, buildContemporariesNetwork, buildTopicsNetwork |
| mentions-view.js | Erwähnungsfluss als Sankey-Diagramm (d3-sankey) mit Suchfeld als Combobox, Seitenknoten fokussierbar, Tabelle aller Erwähnungspaare als Textalternative, Briefliste im Dialog `.modal` | getFilteredLetters, showLetterDetail | initMentionsView, renderMentionsFlow |
| chronik-view.js | Chronologische Briefliste in drei Layouts mit Jahresmarken und einer Marke „Datum unbekannt“, Nachladen in Blöcken über einen `IntersectionObserver`, „Erster Brief“ aus allen Briefen, Wikidata-Anreicherung auf Klick | getFilteredLetters, getAllLetters, showLetterDetail | initChronikView, renderChronik |
| activity-view.js | Kalender-Heatmap mit Tagesdetails aus Briefen mit Tagesdatum, Hinweis auf die übrigen, Jahr über eine Auswahlliste mit Vor und Zurück, Zellen mit Roving Tabindex, Tabelle je Jahr und Monat als Textalternative | getFilteredLetters, showLetterDetail | initActivityView, renderActivity |
| comparison-view.js | Vergleich zweier Personen, Zeiträume oder Orte über die Indexschlüssel, Suchfelder als Combobox, Top-Orte ohne Platzhalter „Unbekannt“ (`isKnownPlace`) | getFilteredLetters, getIndices, getMeta, applyPersonFilter, applyPlaceFilter, applyFilters, switchView, showLetterDetail | initComparisonView, renderComparison |
| view-support.js | keine, gemeinsame Helfer | keine | describeFilters, filterSentence, renderFilterNotice, readTokens, bindCombobox, renderDataTable, toggleBasketButton, detailRow, correspSearchLink, authorityUrl, buildCorrespSearchUrl, buildPersonLink, buildPlaceLink |

## Gemeinsame Helfer

- `view-support.js`: `readTokens(names)` liest Werte aus `tokens.css` für D3-Attribute, die `var()` nicht auflösen. `bindCombobox(input, listbox, options)` gibt Suchfeldern `role="combobox"`, eine Liste mit `role="option"`, Pfeiltasten, Enter, Escape und `aria-activedescendant` (Erwähnungsfluss, Vergleich). `renderDataTable(host, table)` schreibt die aufklappbare Tabelle unter einer Grafik, jede Zelle escaped. `describeFilters()`, `filterSentence()` und `renderFilterNotice(viewId)` bilden den Satz über aktive Filter in den Ansichten ohne Seitenleiste, mit dem Knopf „Filter aufheben“, der `#reset-filters` auslöst, `explore.js` nutzt `filterSentence()` im Exportdialog. `toggleBasketButton()` schaltet einen Korbeintrag über einen Stern und meldet einen vollen Korb (Karte, Briefliste, Brief-Dialog). `detailRow()`, `buildPersonLink()`, `buildPlaceLink()`, `authorityUrl()`, `buildCorrespSearchUrl()` und `correspSearchLink()` bauen Zeilen und Links der Dialoge.
- Aus `../utils.js`: Escaping (`escapeHtml`, `safeUrl`), `personKey`, `placeKey`, `debounce`, `showToast`, `openModal`, `closeModal`, reduzierte Bewegung (`motionMs`, `settleWithoutMotion`).
- Aus `../formatters.js`: `formatDateWithPrecision`, `getPersonInitials`, `getPlacePrecisionClass`.
- Sprachbezeichnungen und -farben über `languageLabel()`, `LANGUAGE_COLORS` und `NO_LANGUAGE` aus `../constants.js`, Netzwerkvorgaben über `NETWORK_DEFAULTS`.
- Korbaktionen über `addLettersToBasket()` aus `../basket.js` (Zeitleiste, Orte), Elemente aus `../dom-cache.js`.
- Die Chronik nutzt zusätzlich `enrichPerson()` und `formatLifeDates()` aus `../wikidata-enrichment.js` und fällt ohne `getAllLetters` auf `state.getAllLetters()` aus `../state-manager.js` zurück.

## Farben der Grafiken

Netzwerk und Erwähnungsfluss nehmen ihre Farben aus Tokens ([design.md](../../../knowledge/design.md#datenvisualisierung)).

- Netzwerk: Personen in Briefwechsel und Zeitgenossen `--color-role-sender`, Themen `--color-warning`, Kanten `--color-text-light`, hervorgehobene Kanten und Beschriftung `--color-text`, Knotenrand `--color-bg`
- Erwähnungsfluss: Absender links `--color-role-sender`, Mitte `--color-primary`, erwähnte Personen rechts `--color-role-mentioned`, Text `--color-text` und `--color-text-light`

## Einzelheiten je Modul

- `timeline-view.js`: Untertitel, Legende und Tabelle richten sich nach dem, was der Datensatz enthält (Sprachen, erschlossene Datierungen). Der Balken ohne Jahr nennt seine Gruppen, die Zahlen im Fußsatz führen über `showLettersWithFeature(key, { keepOthers: true })` zu den Briefen.
- `activity-view.js`: `buildActivityIndex()` liefert auch `lettersByYear` nach der Zählung der Zeitleiste und `withoutDay` mit den Gründen. Ein Satz ersetzt die Kennzahlkästen, die Heatmap trägt eine Monatszeile.
- `chronik-view.js`: Index der Briefwechsel je Personenpaar über alle Empfänger, jeder Eintrag nennt seine Stelle darin. Unbekannte Personen bilden kein Paar.
- `comparison-view.js`: Zeiträume aus den Jahren, die die Briefe tragen, frei eingebbar. Personen und Orte der Suchliste mit Briefzahl.
- `places-view.js`: `coordinateCoverage()` liefert `all`, `none` oder `mixed`. Die Marke für fehlende Koordinaten steht nur bei `mixed`.
- `network-view.js` exportiert `findEgo()` und `networkWithoutEgo()`. Das Layout wird immer vorab berechnet, Beschriftungen stehen in einer eigenen Ebene ohne Überlappung.
