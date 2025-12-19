# Views Context Map

Extrahierte View-Module aus explore.js zur besseren Wartbarkeit.

## Architektur-Prinzipien

Dependency Injection: Alle Module erhalten externe Abhaengigkeiten via init()-Funktion.
Kein direkter Import von explore.js - verhindert zirkulaere Abhaengigkeiten.
Lokaler State: Jedes Modul verwaltet view-spezifischen State intern.
Einheitliches Interface: init(), render(), optional reset().

## Module

timeline-view.js
- Zeitleisten-Visualisierung (Brush-Selektion)
- Abhaengigkeiten: getFilteredLetters, getMeta, showLetterDetail
- Exports: initTimelineView, renderTimeline, resetTimelineRendered

activity-view.js
- GitHub-style Aktivitaets-Heatmap
- Abhaengigkeiten: getFilteredLetters, showLetterDetail
- Exports: initActivityView, renderActivity

chronik-view.js
- Chronologische Brief-Liste mit Wikidata-Anreicherung
- Abhaengigkeiten: getFilteredLetters, showLetterDetail, state
- Imports: wikidata-enrichment.js (enrichPerson, formatLifeDates)
- Exports: initChronikView, renderChronik, isChronikEnriched, resetChronikState

comparison-view.js
- Side-by-Side Vergleich von Personen/Orten/Zeitraeumen
- Abhaengigkeiten: getFilteredLetters, getIndices, getMeta, applyPersonFilter, applyPlaceFilter, switchView, showLetterDetail
- Exports: initComparisonView, renderComparison

network-view.js
- D3.js Force-Graph (Korrespondenten/Themen)
- Abhaengigkeiten: getFilteredLetters, getAllLetters, getDateRange, applyPersonFilter, applySubjectFilter, switchView, log
- Exports: initNetworkView, renderNetwork, resetNetworkZoom

mentions-view.js
- Sankey-Diagramm fuer Personen-Erwahnungen
- Abhaengigkeiten: getFilteredLetters, showLetterDetail, log
- Exports: initMentionsView, renderMentionsFlow, resetMentionsPerson

topics-view.js
- Themen-Browse mit Detail-Panel
- Abhaengigkeiten: getFilteredLetters, getAllLetters, applySubjectFilter, log
- Exports: initTopicsView, renderTopicsList, getSubjectIndex, getSelectedSubjectId, setSelectedSubjectId, rebuildSubjectIndex, resetTopicsState

places-view.js
- Orte-Browse mit Detail-Panel und Koordinaten-Aufloesung
- Abhaengigkeiten: getFilteredLetters, getAllLetters, getDataIndices, applyPlaceFilter, switchView, basketAdd, basketIsInBasket, showToast, onDataUpdated, log
- Exports: initPlacesView, renderPlacesList, getPlacesIndex, getSelectedPlaceId, setSelectedPlaceId, rebuildPlacesIndex, resetPlacesState, updateMissingCoordinatesBanner

## Dependency Injection Pattern

Beispiel aus network-view.js:
```javascript
// In explore.js
initNetworkViewModule({
    getFilteredLetters: () => state.getFilteredLetters(),
    getAllLetters: () => allLetters,
    getDateRange: () => dateRange,
    applyPersonFilter,
    applySubjectFilter,
    switchView,
    log
});

// In network-view.js
let getFilteredLetters = null;
export function initNetworkView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    // ...
}
```

## Datenfluss

explore.js (Orchestrierung)
    |
    v
views/*.js (Visualisierung)
    |
    v
DOM (HTML-Container in explore.html)

1. explore.js laedt Daten und initialisiert Views mit Dependencies
2. Bei View-Wechsel ruft explore.js entsprechende render*() Funktion auf
3. View-Module greifen ueber injizierte Funktionen auf Daten zu
4. User-Interaktionen rufen injizierte Callback-Funktionen auf

## Integration in explore.js

Imports am Dateianfang:
```javascript
import { initTimelineView, renderTimeline as renderTimelineView } from './views/timeline-view.js';
import { initActivityView, renderActivity as renderActivityView } from './views/activity-view.js';
// ...
```

Initialisierung in initializeApp():
```javascript
initTimelineView({ ... });
initActivityView({ ... });
// ...
```

Render in switchView():
```javascript
} else if (view === 'timeline') {
    renderTimelineView();
} else if (view === 'activity') {
    renderActivityView();
// ...
```

## Verbleibende Views in explore.js

Noch nicht extrahiert:
- Map View (MapLibre-Integration, komplex)
- Persons View (integriert mit Filter-System)
- Letters View (stark mit State verwoben)
- Overview/Questions View (Research Questions)
