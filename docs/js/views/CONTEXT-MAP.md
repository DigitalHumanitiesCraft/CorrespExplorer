# Views Context Map

Ansichtsmodule des Explorers. `explore.js` ruft beim Start `init*View(deps)` mit den Abhängigkeiten auf, die Render-Funktion der aktuellen Ansicht bei jedem Wechsel in die Ansicht und nach jeder Filteränderung (`renderView()` für alle zwölf Ansichten). Die Module importieren `explore.js` nicht, damit keine zirkulären Importe entstehen. Gefilterte und alle Briefe lesen sie über die injizierten Funktionen, eigener Zustand ist Darstellungszustand wie Auswahl, Layout, Zoom und die Brief-IDs des offenen Details. Übersicht, Karte, Korrespondenten und Briefe liegen in `explore.js`.

| Modul | Ansicht | Abhängigkeiten aus explore.js | Exporte |
|---|---|---|---|
| timeline-view.js | Gestapelte Jahresbalken nach Sprache, Balken der undatierten Briefe. Jahresbalken mit `role="button"` und Roving Tabindex: Enter filtert auf das Jahr, Umschalt und Enter legt seine Briefe in den Korb | getFilteredLetters, getAllLetters, applyFilters, switchView, showUndatedLetters | initTimelineView, renderTimeline |
| topics-view.js | Themenliste mit Detail, Korrespondenten, Zeitverlauf und verwandten Themen. Das Detail folgt dem Filter, die Detailauswahl ist vom Themenfilter getrennt | getFilteredLetters, getAllLetters, applySubjectFilter, log | initTopicsView, renderTopicsList, getSubjectIndex |
| places-view.js | Ortsliste mit Detail aus den gefilterten Briefen, Hinweis auf Orte ohne Koordinaten und Auflösung über Wikidata, Schlüssel durchgehend `placeKey` | getFilteredLetters, getAllLetters, getDataIndices, applyPlaceFilter, switchView, onDataUpdated, log | initPlacesView, renderPlacesList, updateMissingCoordinatesBanner |
| network-view.js | Netzwerk der Zeitgenossen (Absender, Kante bei gemeinsamen aktiven Jahren) oder der Themen (D3). Knoten mit Roving Tabindex, Enter filtert. Eine neue Darstellung stoppt die alte Simulation | getFilteredLetters, getAllLetters, getDateRange, applyPersonFilter, applySubjectFilter, switchView, log | initNetworkView, renderNetwork, resetNetworkZoom |
| mentions-view.js | Erwähnungsfluss als Sankey-Diagramm (d3-sankey) mit Suchfeld als Combobox, Seitenknoten fokussierbar | getFilteredLetters, showLetterDetail, log | initMentionsView, renderMentionsFlow |
| chronik-view.js | Chronologische Briefliste in drei Layouts mit Jahresmarken und einer Marke „Datum unbekannt“, Nachladen in Blöcken über einen `IntersectionObserver`, „Erster Brief“ aus allen Briefen, Wikidata-Anreicherung auf Klick | getFilteredLetters, getAllLetters, showLetterDetail | initChronikView, renderChronik |
| activity-view.js | Kalender-Heatmap mit Tagesdetails aus Briefen mit Tagesdatum, Hinweis auf die übrigen, alle Jahre wählbar, Zellen mit Roving Tabindex | getFilteredLetters, showLetterDetail | initActivityView, renderActivity |
| comparison-view.js | Vergleich zweier Personen, Zeiträume oder Orte über die Indexschlüssel, Suchfelder als Combobox, Top-Orte ohne Platzhalter „Unbekannt“ (`isKnownPlace`) | getFilteredLetters, getIndices, getMeta, applyPersonFilter, applyPlaceFilter, applyFilters, switchView, showLetterDetail | initComparisonView, renderComparison |
| view-support.js | keine, gemeinsame Helfer | keine | readTokens, bindCombobox |

## Gemeinsame Helfer

- `view-support.js`: `readTokens(names)` liest Werte aus `tokens.css` für D3-Attribute, die `var()` nicht auflösen. `bindCombobox(input, listbox, options)` gibt Suchfeldern `role="combobox"`, eine Liste mit `role="option"`, Pfeiltasten, Enter, Escape und `aria-activedescendant` (Erwähnungsfluss, Vergleich).
- Aus `../utils.js`: Escaping (`escapeHtml`, `safeUrl`), `personKey`, `placeKey`, `debounce`, `showToast`, `openModal`, `closeModal`.
- Aus `../formatters.js`: `formatDateWithPrecision`, `getPersonInitials`, `getPlacePrecisionClass`.
- Sprachbezeichnungen und -farben über `languageLabel()`, `LANGUAGE_COLORS` und `NO_LANGUAGE` aus `../constants.js`, Netzwerkvorgaben über `NETWORK_DEFAULTS`.
- Korbaktionen über `addLettersToBasket()` aus `../basket.js` (Zeitleiste, Orte), Elemente aus `../dom-cache.js`.
- Die Chronik nutzt zusätzlich `enrichPerson()` und `formatLifeDates()` aus `../wikidata-enrichment.js` und fällt ohne `getAllLetters` auf `state.getAllLetters()` aus `../state-manager.js` zurück.

## Farben der Grafiken

Netzwerk und Erwähnungsfluss nehmen ihre Farben aus Tokens ([design.md](../../knowledge/design.md#datenvisualisierung)).

- Netzwerk: Personen `--color-role-sender`, Themen `--color-warning`, Kanten `--color-text-light`, hervorgehobene Kanten und Beschriftung `--color-text`, Knotenrand `--color-bg`
- Erwähnungsfluss: Absender links `--color-role-sender`, Mitte `--color-primary`, erwähnte Personen rechts `--color-role-mentioned`, Text `--color-text` und `--color-text-light`
