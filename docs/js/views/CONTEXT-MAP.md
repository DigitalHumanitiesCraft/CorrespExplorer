# Views Context Map

Ansichtsmodule des Explorers. `explore.js` ruft beim Start `init*View(deps)` mit den Abhängigkeiten auf und bei jedem Wechsel in die Ansicht die Render-Funktion. Die Module importieren `explore.js` nicht, damit keine zirkulären Importe entstehen, und halten nur ihren Darstellungszustand. Übersicht, Karte, Korrespondenten und Briefe liegen weiter in `explore.js`.

| Modul | Ansicht | Abhängigkeiten aus explore.js | Exporte |
|---|---|---|---|
| timeline-view.js | Gestapelte Jahresbalken nach Sprache, Balken der undatierten Briefe | getFilteredLetters, getAllLetters, applyFilters, switchView, basketIsInBasket, basketAdd, showToast | initTimelineView, renderTimeline |
| topics-view.js | Themenliste mit Detail, Korrespondenten, Zeitverlauf und verwandten Themen | getFilteredLetters, getAllLetters, applySubjectFilter, log | initTopicsView, renderTopicsList, getSubjectIndex, getSelectedSubjectId, setSelectedSubjectId |
| places-view.js | Ortsliste mit Detail, Hinweis auf Orte ohne Koordinaten und Auflösung über Wikidata | getFilteredLetters, getAllLetters, getDataIndices, applyPlaceFilter, switchView, basketAdd, basketIsInBasket, showToast, onDataUpdated, log | initPlacesView, renderPlacesList, updateMissingCoordinatesBanner, getPlacesIndex, getSelectedPlaceId |
| network-view.js | Netzwerk der Zeitgenossen oder der Themen (D3) | getFilteredLetters, getAllLetters, getDateRange, applyPersonFilter, applySubjectFilter, switchView, log | initNetworkView, renderNetwork, resetNetworkZoom |
| mentions-view.js | Erwähnungsfluss als Sankey-Diagramm (d3-sankey) | getFilteredLetters, showLetterDetail, log | initMentionsView, renderMentionsFlow |
| chronik-view.js | Chronologische Briefliste in drei Layouts, Wikidata-Anreicherung auf Klick | getFilteredLetters, showLetterDetail | initChronikView, renderChronik |
| activity-view.js | Kalender-Heatmap mit Tagesdetails | getFilteredLetters, showLetterDetail | initActivityView, renderActivity |
| comparison-view.js | Vergleich zweier Personen, Zeiträume oder Orte | getFilteredLetters, getIndices, getMeta, applyPersonFilter, applyPlaceFilter, applyFilters, switchView, showLetterDetail | initComparisonView, renderComparison |

Gemeinsame Helfer kommen aus `../utils.js` (Escaping, `personKey`, `placeKey`, `debounce`), Konstanten aus `../constants.js`, Elemente aus `../dom-cache.js`.
