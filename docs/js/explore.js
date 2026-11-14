// Explorer page: loads a dataset (?json= path or the upload in sessionStorage), keeps the filter
// inputs and the URL state, switches between the views and wires the view modules.

import { NO_LANGUAGE, VIEWS, LETTER_FEATURES, LANGUAGE_COLORS, isRestLanguage, computeLanguageColors, registerLanguageLabels, languageLabel } from './constants.js';
import { initBasket, datasetKey, loadBasketFromUrl } from './basket.js';
import { debounce, escapeHtml, isAllowedJsonPath, sameFilterParams, datedYearRange, enableModalKeyboard, openModal, closeModal, showToast, downloadFile, personKey, letterRecipients } from './utils.js';
import { datasetQuality, summarizeCorpus } from './research-paths.js';
import { datasetToJson, lettersToCsv } from './export.js';
import { initKnowledgePath } from './knowledge-path.js';
import { formatCountOf } from './formatters.js';
import { initDemoTour, checkAndStartDemoTour } from './demo-tour.js';
import { loadDemoDataset, loadUrlDataset } from './cmif-parser.js';
import { isCorrespSearchUrl, correspSearchShareUrl } from './correspsearch-api.js';
import { state } from './state-manager.js';
import { elements, initDOMCache } from './dom-cache.js';
import { filterSentence, focusViewHeading, renderFilterNotice, selectionMarks } from './views/view-support.js';
import { initLettersDrawer, updateLettersDrawer, setDrawerOpen } from './views/letters-drawer.js';
import { initOverviewView, renderOverview } from './views/overview-view.js';
import { initMapView, updateMapPlaces, resizeMap, aggregateLettersByPlace } from './views/map-view.js';
import { initSpacetimeView, renderSpacetime } from './views/spacetime-view.js';
import { initPersonsView, renderPersonsList } from './views/persons-view.js';
import { initLettersView, renderLettersList, showLetterDetail, clearLetterSearch } from './views/letters-view.js';
import { initTimelineView, renderTimeline as renderTimelineView } from './views/timeline-view.js';
import { initActivityView, renderActivity as renderActivityView } from './views/activity-view.js';
import { initComparisonView, renderComparison as renderComparisonView } from './views/comparison-view.js';
import { initChronikView, renderChronik as renderChronikView } from './views/chronik-view.js';
import { initNetworkView as initNetworkViewModule, renderNetwork as renderNetworkView } from './views/network-view.js';
import { initMentionsView, renderMentionsFlow as renderMentionsFlowView } from './views/mentions-view.js';
import { initTopicsView, renderTopicsList as renderTopicsListView, topicCounts } from './views/topics-view.js';
import { initPlacesView, renderPlacesList as renderPlacesListView } from './views/places-view.js';

// Module-level copies of the loaded data and the filter inputs. state-manager.js holds the
// filter logic; applyFilters() writes these inputs into it and reads the result back.
let allLetters = [];
let filteredLetters = [];
let placeAggregation = {};
let dataIndices = {};
let temporalFilter = null;
let dateRange = { min: 1800, max: 2000 };
// Letters, persons and places of the whole dataset, set once in updateUI
let corpusTotals = null;
let corpusSummary = null;
let corpusQuality = null;
// History entries start after the first render; Back then leaves the explorer as before
let historyReady = false;
// sourceInfo of the loaded dataset; a correspSearch query goes into shared links as cs=
let datasetSource = null;
let restoringFromHistory = false;
let qualityFilter = { preciseDates: false, knownPersons: false, locatedPlaces: false };
let featureFilter = new Set();
let selectedPersonId = null;
// Second person beside selectedPersonId: only the letters between the two
let selectedPartnerId = null;
let selectedPlaceFilter = null;
// One year picked in the space-time figure; the period of the sidebar stays as it is
let pickedYearFilter = null;
// The subject filter is separate from the topic shown in the topics view, which only displays it
let activeSubjectFilter = null;
let initialLanguageFilter = null;
let currentView = 'overview';

// Mentions Flow view state
let mentionedPersonsIndex = new Map();  // Used for detectAvailableViews

// Available views tracking
let availableViews = {};

// The header offers the subjects of a correspondence; each groups the views that show it
const VIEW_GROUPS = {
    overview: ['overview'],
    letters: ['letters'],
    persons: ['persons', 'network', 'mentions-flow'],
    places: ['map', 'spacetime', 'places'],
    time: ['timeline', 'activity', 'chronik'],
    topics: ['topics']
};
// The comparison is an action on persons, places or periods and stays with the subject it was
// opened from; the subject decides what is compared
const COMPARISON_MODE = { persons: 'persons', places: 'places', time: 'periods' };
let comparisonGroup = 'persons';
const groupOf = view => (view === 'comparison'
    ? comparisonGroup
    : Object.keys(VIEW_GROUPS).find(group => VIEW_GROUPS[group].includes(view)));
// The representation last used in a group, so the group button returns to it
const lastViewOfGroup = {};

// Detect which views are available based on data
function detectAvailableViews() {
    const hasCoordinates = Object.keys(placeAggregation).length > 0;
    const hasPersons = Object.keys(dataIndices.persons || {}).length > 0;
    const hasLetters = allLetters.length > 0;
    const hasYears = allLetters.some(l => l.year !== null && l.year !== undefined);
    const hasSubjects = allLetters.some(l => l.mentions?.subjects?.length > 0);
    const hasPlaces = Object.keys(dataIndices.places || {}).length > 0;

    availableViews = {
        overview: {
            available: true,
            reason: null
        },
        map: {
            available: hasCoordinates,
            reason: hasCoordinates ? null : 'Keine Orte mit Koordinaten vorhanden'
        },
        spacetime: {
            available: hasCoordinates,
            reason: hasCoordinates ? null : 'Keine Orte mit Koordinaten vorhanden'
        },
        persons: {
            available: hasPersons,
            reason: hasPersons ? null : 'Keine Personen-Daten vorhanden'
        },
        letters: {
            available: hasLetters,
            reason: hasLetters ? null : 'Keine Briefe vorhanden'
        },
        timeline: {
            available: hasYears,
            reason: hasYears ? null : 'Keine Datums-Angaben vorhanden'
        },
        topics: {
            available: hasSubjects,
            reason: hasSubjects ? null : 'Keine Themen (subjects) im Datensatz'
        },
        places: {
            available: hasPlaces,
            reason: hasPlaces ? null : 'Keine Orts-Daten vorhanden'
        },
        network: {
            available: hasPersons && hasLetters,
            reason: (hasPersons && hasLetters) ? null : 'Keine Netzwerk-Daten vorhanden'
        },
        'mentions-flow': {
            available: mentionedPersonsIndex.size > 0,
            reason: mentionedPersonsIndex.size > 0 ? null : 'Keine Mentions-Daten im Datensatz'
        },
        chronik: {
            available: hasLetters,
            reason: hasLetters ? null : 'Keine Briefe vorhanden'
        },
        activity: {
            available: hasYears,
            reason: hasYears ? null : 'Keine Datums-Angaben vorhanden'
        },
        comparison: {
            available: hasPersons || hasPlaces,
            reason: (hasPersons || hasPlaces) ? null : 'Keine Personen oder Orte zum Vergleichen'
        }
    };

    return availableViews;
}

// Update view buttons based on availability
function updateViewButtons() {
    const viewButtons = document.querySelectorAll('.view-btn');

    viewButtons.forEach(btn => {
        const view = btn.dataset.view;
        const viewInfo = availableViews[view];

        if (viewInfo) {
            btn.disabled = !viewInfo.available;
            btn.title = viewInfo.available ? '' : viewInfo.reason;
        }
    });
    // A subject without any view the dataset can fill leaves the header
    document.querySelectorAll('.view-group-btn').forEach(btn => {
        btn.classList.toggle('hidden', !VIEW_GROUPS[btn.dataset.group].some(view => availableViews[view]?.available));
    });
    syncViewVariants();
}

// The switch shows the representations of the active subject and sits in the header of the view
function syncViewVariants() {
    const group = groupOf(currentView);
    const variants = document.getElementById('view-variants');
    if (!variants) return;
    let shown = 0;
    variants.querySelectorAll('.view-btn').forEach(btn => {
        const compare = btn.dataset.view === 'comparison' && group in COMPARISON_MODE;
        const visible = (VIEW_GROUPS[group]?.includes(btn.dataset.view) || compare) && !btn.disabled;
        btn.classList.toggle('hidden', !visible);
        if (visible) shown++;
    });
    variants.classList.toggle('hidden', shown < 2);
    document.querySelector(`#${currentView}-view .view-header`)?.append(variants);
    document.querySelectorAll('.view-group-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.group === group));
    });
    document.querySelectorAll('.view-menu-item').forEach(item => {
        item.classList.toggle('hidden', availableViews[item.dataset.view]?.available === false);
        item.setAttribute('aria-current', String(item.dataset.view === currentView));
    });
}

const formatCount = n => n.toLocaleString('de-DE');
// "774 Orte", under a filter "95 von 774 Orten"
const partOf = (part, total, one, of = one) => (part === total
    ? `${formatCount(total)} ${one}`
    : `${formatCount(part)} von ${formatCount(total)} ${of}`);

// The header line of a view says what it currently shows; the subject itself stands in the header
function updateViewTitle() {
    const title = document.querySelector(`#${currentView}-view .view-header__title`);
    if (!title || !corpusTotals) return;
    const group = groupOf(currentView);
    const shown = hasActiveFilter() ? summarizeCorpus(filteredLetters, dataIndices) : null;
    if (currentView === 'comparison') {
        title.textContent = { persons: 'Zwei Personen im Vergleich', places: 'Zwei Orte im Vergleich', time: 'Zwei Zeiträume im Vergleich' }[group];
    } else if (currentView === 'map') {
        // The map draws the places that have coordinates
        title.textContent = `${formatCount(Object.keys(placeAggregation).length)} Orte auf der Karte`;
    } else if (currentView === 'network' || currentView === 'mentions-flow') {
        // Not visible: both name what they show in their own line under the header
        title.textContent = currentView === 'network' ? 'Netzwerk der Personen' : 'Erwähnungen';
    } else if (group === 'persons') {
        title.textContent = partOf(shown ? shown.persons.size : corpusTotals.persons, corpusTotals.persons, 'Personen');
    } else if (group === 'places') {
        title.textContent = partOf(shown ? shown.places.size : corpusTotals.places, corpusTotals.places, 'Orte', 'Orten');
    } else if (group === 'time') {
        const range = datedYearRange(filteredLetters);
        const years = !range ? '' : range.min === range.max ? `, ${range.min}` : `, ${range.min}–${range.max}`;
        title.textContent = partOf(filteredLetters.length, corpusTotals.letters, 'Briefe', 'Briefen') + years;
    } else if (group === 'topics') {
        // The topics figure keeps the subjects beside a chosen one, so it counts them itself
        const topics = topicCounts();
        title.textContent = topics
            ? partOf(topics.shown, topics.total, 'Themen')
            : partOf((shown || corpusSummary).subjects.size, corpusSummary.subjects.size, 'Themen');
    } else if (group === 'overview') {
        // Not visible: the header carries the name of the dataset, the page starts with its figures
        title.textContent = elements.getById('dataset-title')?.textContent?.trim() || 'Datensatz';
    }
}

// Get first available view
function getFirstAvailableView() {
    const viewOrder = ['letters', 'persons', 'timeline', 'places', 'network', 'map', 'topics'];
    for (const view of viewOrder) {
        if (availableViews[view]?.available) {
            return view;
        }
    }
    return 'letters'; // Fallback
}

// Initialize application
async function init() {
    initDOMCache();

    try {
        const data = await loadData();

        if (!data) {
            // Nothing uploaded and no ?json= path: the start page says why and offers the datasets
            window.location.href = 'index.html?notice=dataset-missing';
            return;
        }

        // Initialize State Manager with data
        state.setData({
            letters: data.letters || [],
            indices: data.indices || {},
            meta: data.meta || {},
            placeAggregation: {}  // Will be set below
        });

        allLetters = data.letters || [];
        datasetSource = data.sourceInfo || null;
        filteredLetters = allLetters;
        dataIndices = data.indices || {};

        // Compute dynamic language colors based on data distribution
        computeLanguageColors(allLetters);
        registerLanguageLabels(allLetters);

        // Period of the letters that fit a year; multi-year spans only when nothing else is dated
        const yearRange = datedYearRange(allLetters) || datedYearRange(allLetters, { includeSpans: true });
        if (yearRange) {
            dateRange.min = yearRange.min;
            dateRange.max = yearRange.max;
            state.updateUI({ dateRange: { min: dateRange.min, max: dateRange.max } });
        }

        placeAggregation = aggregateLettersByPlace(allLetters, dataIndices.places || {});

        // Update state with placeAggregation
        state.data.placeAggregation = placeAggregation;

        mentionedPersonsIndex = buildMentionedPersonsIndex(allLetters);

        // Detect available views based on data
        detectAvailableViews();

        // Read URL state before UI init
        initUrlState();

        // Check if URL-requested view is available, otherwise use first available
        if (!availableViews[currentView]?.available) {
            currentView = currentView === 'map' && availableViews.places?.available ? 'places' : getFirstAvailableView();
        }

        updateUI(data);

        // Update view buttons based on data availability
        updateViewButtons();

        initFilters();
        initViewSwitcher();
        // The view modules receive what they need from here and never import this file
        initOverviewView({
            getAllLetters: () => allLetters,
            getDataIndices: () => dataIndices,
            getCorpusSummary: () => corpusSummary,
            getCorpusQuality: () => corpusQuality,
            showLettersWithFeature,
            showLettersOfYear,
            switchView,
            getFilteredLetters: () => filteredLetters,
            getFilterState: () => ({
                person: selectedPersonId,
                place: selectedPlaceFilter,
                subject: activeSubjectFilter,
                features: [...featureFilter],
                languages: languageSelection(),
                years: temporalFilter && !temporalFilter.undated ? [temporalFilter.start, temporalFilter.end] : null,
                active: hasActiveFilter()
            }),
            togglePerson: key => (selectedPersonId === key ? clearPersonFilter() : applyPersonFilter(key)),
            togglePlace: key => (selectedPlaceFilter === key ? clearPlaceFilter() : applyPlaceFilter(key)),
            toggleSubject: key => (activeSubjectFilter === key ? clearSubjectFilter() : applySubjectFilter(key)),
            toggleLanguage,
            toggleFeature,
            setYearRange,
            resetFilters: () => elements.resetFiltersBtn?.click()
        });
        initMapView({
            getPlaceAggregation: () => placeAggregation,
            applyPlaceFilter,
            applyPersonFilter,
            revealLetters
        });
        initSpacetimeView({
            getDataIndices: () => dataIndices,
            togglePlace: key => (selectedPlaceFilter === key ? clearPlaceFilter() : applyPlaceFilter(key)),
            // The letters of one place in one year, the other filters stay as they are. The
            // year is picked, not set as the period, so the figure keeps its time axis
            showLettersOfPlaceYear: (key, year) => {
                clearLetterSearch();
                selectedPlaceFilter = key;
                pickedYearFilter = year;
                applyFilters();
                revealLetters();
            },
            // A year chosen in the place list narrows the selection without opening the letters,
            // because a keyboard walks through the years of a select one by one
            pickYear: year => {
                pickedYearFilter = year;
                applyFilters();
            }
        });
        initPersonsView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            getDataIndices: () => dataIndices,
            showLettersOfPerson
        });
        initLettersView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            hasActiveFilter,
            showLettersOfPerson
        });
        initTimelineView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            applyFilters,
            revealLetters,
            showUndatedLetters,
            showLettersWithFeature,
            clearLetterSearch
        });
        initTopicsView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            toggleSubject: key => (activeSubjectFilter === key ? clearSubjectFilter() : applySubjectFilter(key)),
            togglePerson: key => (selectedPersonId === key ? clearPersonFilter() : applyPersonFilter(key)),
            togglePlace: key => (selectedPlaceFilter === key ? clearPlaceFilter() : applyPlaceFilter(key)),
            revealLetters
        });
        initPlacesView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            getDataIndices: () => dataIndices,
            applyPlaceFilter,
            switchView,
            onDataUpdated: handlePlacesDataUpdated
        });
        initNetworkViewModule({
            getFilteredLetters: () => state.getFilteredLetters(),
            getAllLetters: () => allLetters,
            applyPersonFilter,
            applySubjectFilter,
            showLettersBetween,
            revealLetters
        });
        initMentionsView({
            getFilteredLetters: () => state.getFilteredLetters(),
            showLetterDetail
        });
        initChronikView({
            getFilteredLetters: () => state.getFilteredLetters(),
            getAllLetters: () => allLetters,
            showLetterDetail
        });
        initActivityView({
            getFilteredLetters: () => state.getFilteredLetters(),
            showLetterDetail
        });
        initComparisonView({
            getFilteredLetters: () => state.getFilteredLetters(),
            getIndices: () => dataIndices,
            getMeta: () => state.getMeta(),
            applyPersonFilter,
            applyPlaceFilter,
            applyFilters,
            switchView,
            showLetterDetail
        });
        initLettersDrawer({
            getFilteredLetters: () => filteredLetters,
            getTotal: () => allLetters.length,
            hasActiveFilter,
            openLetterList: () => {
                switchView('letters');
                focusViewHeading('letters');
            },
            onToggle: open => {
                state.ui.drawerOpen = open;
                updateUrlState();
            }
        });
        initExport();
        // Basket of this dataset from localStorage, then items shared via ?basket_* URL parameters
        const currentDatasetKey = datasetKey(data.sourceInfo);
        sessionStorage.setItem('correspDatasetKey', currentDatasetKey);
        initBasket(currentDatasetKey);
        loadBasketFromUrl();

        initKnowledgePath({
            datasetKey: currentDatasetKey,
            switchView,
            getCurrentView: () => currentView,
            getFilteredLetters: () => filteredLetters
        });

        handOverDatasetToBasketPage(data);

        // Every filter read from the URL applies before the first view renders
        applyFilters({ render: false });
        switchView(currentView);
        // A shared link may carry the open drawer; it opens without taking the focus
        if (state.ui.drawerOpen) setDrawerOpen(true);

        hideLoading();
        historyReady = true;
        window.addEventListener('popstate', handleHistoryNavigation);
        initDemoTour({ switchView });
        checkAndStartDemoTour();
    } catch (error) {
        console.error('Init failed:', error);
        showError(error.message);
    }
}

// wissenskorb.html needs the dataset. A ?json= dataset is reloaded there from its path, so only
// uploads are copied into sessionStorage (stringifying a large file costs time and quota).
function handOverDatasetToBasketPage(data) {
    const jsonPath = data.sourceInfo?.type === 'preprocessed' ? data.sourceInfo.source : null;
    if (isAllowedJsonPath(jsonPath)) {
        sessionStorage.removeItem('correspData');
        sessionStorage.setItem('correspDataSource', JSON.stringify({ json: jsonPath }));
        return;
    }
    try {
        sessionStorage.setItem('correspData', JSON.stringify({
            letters: state.getAllLetters(),
            indices: state.getIndices(),
            meta: state.getMeta()
        }));
        sessionStorage.removeItem('correspDataSource');
    } catch (e) {
        sessionStorage.removeItem('correspData');
        console.warn('Could not store data in sessionStorage for the Wissenskorb page', e);
    }
}

// Load the dataset named by ?json=, else the upload from sessionStorage. A ?json= that fails
// raises an error for the page instead of silently showing an older upload.
async function loadData() {
    const params = new URLSearchParams(window.location.search);
    const jsonUrl = params.get('json');

    if (jsonUrl !== null) {
        if (!isAllowedJsonPath(jsonUrl)) {
            throw new Error(`Der Parameter json= erlaubt nur relative Pfade unter data/ mit der Endung .json, nicht "${jsonUrl}".`);
        }
        let response;
        try {
            response = await fetch(jsonUrl);
        } catch {
            throw new Error(`Die Datei ${jsonUrl} konnte nicht geladen werden (Netzwerkfehler).`);
        }
        if (!response.ok) {
            throw new Error(`Die Datei ${jsonUrl} konnte nicht geladen werden (HTTP ${response.status}).`);
        }
        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error(`Die Datei ${jsonUrl} enthält kein gültiges JSON.`);
        }
        if (!Array.isArray(data?.letters)) {
            throw new Error(`Die Datei ${jsonUrl} enthält keine Briefliste (letters).`);
        }
        data.sourceInfo = {
            type: 'preprocessed',
            source: jsonUrl,
            isDemo: params.get('demo') === 'true'
        };
        return data;
    }

    const storedData = sessionStorage.getItem('cmif-data');
    let stored = null;
    if (storedData) {
        try {
            stored = JSON.parse(storedData);
        } catch {
            throw new Error('Der hochgeladene Datensatz in diesem Tab ist nicht lesbar. Bitte laden Sie ihn auf der Startseite erneut.');
        }
    }

    // A shared correspSearch link names its query and loads it again, also over another dataset
    // that this tab still holds (decision E3)
    const sharedQuery = params.get('cs');
    if (sharedQuery !== null) {
        if (!isCorrespSearchUrl(sharedQuery)) {
            throw new Error('Der Parameter cs= erlaubt nur Adressen der correspSearch-API (https://correspsearch.net/api/...).');
        }
        return stored?.sourceInfo?.source === sharedQuery ? stored : loadUrlDataset(sharedQuery, { type: 'correspsearch' });
    }
    if (stored) return stored;
    return params.get('demo') === 'true' ? loadDemoDataset() : null;
}

// Update UI with data info
function updateUI(data) {
    const titleEl = elements.datasetTitle;
    if (titleEl && data.meta?.title) {
        titleEl.textContent = data.meta.title;
        // The navbar truncates a long title; the tooltip keeps it readable in full
        titleEl.title = data.meta.title;
        document.title = `${data.meta.title} - CorrespExplorer`;
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = `${data.meta.title} im CorrespExplorer`;
    }

    // The one summary of the whole dataset: persons and places are counted from the letters
    // (summarizeCorpus), because meta.unique_senders and meta.unique_places count differently per
    // source. Sidebar counts, quality icons and the overview all read from it.
    corpusSummary = summarizeCorpus(allLetters, dataIndices);
    corpusQuality = datasetQuality(allLetters, corpusSummary);
    corpusTotals = { letters: allLetters.length, persons: corpusSummary.persons.size, places: corpusSummary.places.size };
    updateStatCounts();

    updateQualityIcons(corpusQuality);

    // Build language filter
    buildLanguageFilter();
    buildFeatureFilter();
}

// Quality icons next to the sidebar counts, from the same figures as the overview chips
function updateQualityIcons(quality) {
    updateQualityIcon('letters-quality-icon', quality.dates.total - quality.dates.known, quality.dates.total, 'ohne tagesgenaues Datum');
    updateQualityIcon('senders-quality-icon', quality.persons.total - quality.persons.known, quality.persons.total, 'Personen ohne Normdatei-ID');
    updateQualityIcon('places-quality-icon', quality.places.total - quality.places.known, quality.places.total, 'Orte ohne Koordinaten');
}

// Update quality icon visibility and tooltip
function updateQualityIcon(iconId, count, total, label) {
    const iconEl = document.getElementById(iconId);
    if (!iconEl) return;

    if (count === 0) {
        iconEl.classList.add('hidden');
        return;
    }

    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    iconEl.title = `${count} ${label} (${percentage}%)`;
    iconEl.setAttribute('aria-label', iconEl.title);
    iconEl.setAttribute('role', 'img');
    iconEl.classList.remove('hidden');
}

// Number of languages the sidebar lists before the rest folds into "weitere Sprachen"

// Build language filter checkboxes dynamically
function buildLanguageFilter() {
    // Counted from the letters, because the index shape differs between parser
    // ({label, letter_count}) and preprocessing (label string); every code gets a
    // checkbox, so no language falls out of the allow-list of the state filter
    const counts = {};
    allLetters.forEach(letter => {
        const code = letter.language?.code || NO_LANGUAGE;
        counts[code] = (counts[code] || 0) + 1;
    });
    if (Object.keys(counts).every(code => code === NO_LANGUAGE)) return;

    const container = elements.languageCheckboxes;
    const filterGroup = elements.languageFilterGroup;

    if (!container || !filterGroup) return;

    const languageKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

    // The list folds where the colours end: the languages with a colour of their own stand open,
    // the others are the grey "Übrige Sprachen" of the charts and open on demand. One cut for
    // list, legend and map, also for a dataset with twenty languages.
    const restCount = languageKeys.filter(code => isRestLanguage(code)).length;
    const more = restCount > 1 ? document.createElement('details') : null;
    if (more) {
        more.className = 'filter-more';
        more.appendChild(document.createElement('summary'));
    }

    languageKeys.forEach(code => {
        const target = more && isRestLanguage(code) ? more : container;
        const displayLabel = languageLabel(code);
        const tooltip = code === NO_LANGUAGE ? 'Keine Sprachzuordnung in den Quelldaten' : '';
        const label = document.createElement('label');
        if (tooltip) {
            label.title = tooltip;
        }
        label.innerHTML = `
            <input type="checkbox" name="language" value="${escapeHtml(code)}"${!initialLanguageFilter || initialLanguageFilter.includes(code) ? ' checked' : ''}>
            ${more && isRestLanguage(code) ? '' : `<span class="lang-swatch" style="background: ${LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other}" aria-hidden="true"></span>`}
            <span>${escapeHtml(displayLabel)}</span>
            <span class="filter-count" id="count-lang-${escapeHtml(code)}">(${counts[code].toLocaleString('de-DE')})</span>
        `;
        target.appendChild(label);
    });
    if (more) container.appendChild(more);

    filterGroup.classList.remove('hidden');

    container.querySelectorAll('input[name="language"]').forEach(cb => {
        cb.addEventListener('change', debounce(() => applyFilters(), 300));
    });
}

// Mentioned persons, used to decide whether the mentions flow view is available
function buildMentionedPersonsIndex(letters) {
    const mentioned = new Map();

    for (const letter of letters) {
        if (!letter.mentions?.persons) continue;
        // Parser and correspSearch loader may leave sender or recipient null
        const senderKey = personKey(letter.sender);

        for (const person of letter.mentions.persons) {
            const key = personKey(person);
            if (!key) continue;

            if (!mentioned.has(key)) {
                mentioned.set(key, {
                    id: key,
                    name: person.name,
                    authority: person.authority,
                    mentionCount: 0,
                    mentionedBy: new Set(),
                    mentionedInLetters: []
                });
            }

            const entry = mentioned.get(key);
            entry.mentionCount++;
            if (senderKey) entry.mentionedBy.add(senderKey);
            entry.mentionedInLetters.push(letter.id);
        }
    }

    return mentioned;
}

// Initialize filters
function initFilters() {
    const yearRangeSlider = elements.yearRangeSlider;
    const yearRangeText = elements.yearRangeText;
    const resetButton = elements.resetFiltersBtn;

    if (!yearRangeSlider) return;

    // Wrapped, because applyFilters reads options from its first parameter, not from an event
    const debouncedApply = debounce(() => applyFilters(), 300);

    // Year range slider
    if (typeof noUiSlider !== 'undefined' && dateRange.min < dateRange.max) {
        const urlRange = temporalFilter && !temporalFilter.undated;
        noUiSlider.create(yearRangeSlider, {
            start: urlRange ? [temporalFilter.start, temporalFilter.end] : [dateRange.min, dateRange.max],
            connect: true,
            step: 1,
            range: { 'min': dateRange.min, 'max': dateRange.max },
            handleAttributes: [{ 'aria-label': 'Startjahr' }, { 'aria-label': 'Endjahr' }],
            format: {
                to: value => Math.round(value),
                from: value => Number(value)
            }
        });

        // 'update' fires on binding and while dragging, 'set' only for committed values
        // (release, keyboard, set()); binding the filter to 'update' reset a URL filter at load
        yearRangeSlider.noUiSlider.on('update', (values) => {
            if (yearRangeText) yearRangeText.textContent = `${parseInt(values[0])} - ${parseInt(values[1])}`;
        });
        yearRangeSlider.noUiSlider.on('set', (values) => {
            const startYear = parseInt(values[0]);
            const endYear = parseInt(values[1]);
            const isDefaultRange = startYear === dateRange.min && endYear === dateRange.max;
            temporalFilter = isDefaultRange ? null : { start: startYear, end: endYear };
            debouncedApply();
        });
    } else if (yearRangeText) {
        yearRangeText.textContent = `${dateRange.min} - ${dateRange.max}`;
    }

    const qualityCheckboxes = {
        preciseDates: elements.filterPreciseDates,
        knownPersons: elements.filterKnownPersons,
        locatedPlaces: elements.filterLocatedPlaces
    };
    Object.entries(qualityCheckboxes).forEach(([key, checkbox]) => {
        if (!checkbox) return;
        checkbox.checked = qualityFilter[key];
        checkbox.addEventListener('change', () => {
            qualityFilter[key] = checkbox.checked;
            applyFilters();
        });
    });

    resetButton?.addEventListener('click', () => {
        document.querySelectorAll('input[name="language"]').forEach(cb => { cb.checked = true; });
        if (yearRangeSlider.noUiSlider) {
            yearRangeSlider.noUiSlider.set([dateRange.min, dateRange.max]);
        }
        temporalFilter = null;
        selectedPersonId = null;
        selectedPartnerId = null;
        selectedPlaceFilter = null;
        pickedYearFilter = null;
        activeSubjectFilter = null;
        qualityFilter = { preciseDates: false, knownPersons: false, locatedPlaces: false };
        Object.values(qualityCheckboxes).forEach(cb => { if (cb) cb.checked = false; });
        featureFilter.clear();
        document.querySelectorAll('input[name="feature"]').forEach(cb => { cb.checked = false; });
        const hadFocus = document.activeElement === resetButton;
        applyFilters();
        if (hadFocus) focusViewHeading(currentView);
    });
}

// Screen readers hear the result count once the filter input settles
const announceResultCount = debounce(() => {
    const status = document.getElementById('filter-status');
    if (!status) return;
    status.textContent = hasActiveFilter()
        ? `${filteredLetters.length.toLocaleString('de-DE')} von ${allLetters.length.toLocaleString('de-DE')} Briefen entsprechen dem Filter`
        : `Alle ${allLetters.length.toLocaleString('de-DE')} Briefe`;
}, 600);

/**
 * Write the filter inputs into the state manager, read the filtered letters back and update
 * badges, counts, URL and, unless render is false, the active view.
 */
function applyFilters({ render = true } = {}) {
    const languageFilters = getCheckedValues('language');
    const filterUpdates = {};

    if (temporalFilter?.undated) {
        filterUpdates.temporal = { undated: true };
    } else if (temporalFilter) {
        filterUpdates.temporal = { min: temporalFilter.start, max: temporalFilter.end };
    } else {
        filterUpdates.temporal = null;
    }
    if (temporalFilter?.undated && elements.yearRangeText) {
        elements.yearRangeText.textContent = 'Nur Briefe ohne Datum';
    }

    // All boxes checked (or none present) means no language filter, none checked means no letters
    const allLanguagesChecked = languageFilters.length === document.querySelectorAll('input[name="language"]').length;
    filterUpdates.languages = allLanguagesChecked ? null : languageFilters;
    filterUpdates.person = selectedPersonId || null;
    filterUpdates.partner = (selectedPersonId && selectedPartnerId) || null;
    filterUpdates.place = selectedPlaceFilter || null;
    filterUpdates.year = pickedYearFilter;
    filterUpdates.subject = activeSubjectFilter || null;
    filterUpdates.quality = { ...qualityFilter };
    filterUpdates.features = featureFilter.size ? [...featureFilter] : null;

    state.updateFilters(filterUpdates);
    filteredLetters = state.getFilteredLetters();
    allLetters = state.getAllLetters();

    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});
    state.data.placeAggregation = placeAggregation;

    updateMapPlaces();

    updateFilterCounts();
    updateFeatureCounts();
    updateStatCounts();
    updateUrlState();
    renderSelectionSentence();
    updateFilterIndicators();
    SIDEBAR_VIEWS.forEach(view => renderFilterNotice(`${view}-view`)?.classList.add('view-filter-notice--narrow'));
    announceResultCount();
    updateLettersDrawer({ hidden: currentView === 'letters' });

    if (render) renderView(currentView);
    updateViewTitle();
    elements.resetFiltersBtn?.classList.toggle('hidden', !hasActiveFilter());
}

// The filters as the charts of the start view set them. Each goes through the same state as the
// sidebar control of its kind, so both always agree.
function languageSelection() {
    const boxes = [...document.querySelectorAll('input[name="language"]')];
    const checked = boxes.filter(cb => cb.checked);
    return checked.length === boxes.length ? null : checked.map(cb => cb.value);
}

// One language or the rest alone; the same choice again releases it
function toggleLanguage(code) {
    const matches = value => (code === 'other' ? isRestLanguage(value) : value === code);
    const boxes = [...document.querySelectorAll('input[name="language"]')];
    const only = boxes.some(cb => !cb.checked) && boxes.every(cb => cb.checked === matches(cb.value));
    boxes.forEach(cb => { cb.checked = only || matches(cb.value); });
    applyFilters();
}

function toggleFeature(key) {
    if (featureFilter.has(key)) featureFilter.delete(key); else featureFilter.add(key);
    document.querySelectorAll('input[name="feature"]').forEach(cb => { cb.checked = featureFilter.has(cb.value); });
    applyFilters();
}

function setYearRange(start, end) {
    const slider = elements.yearRangeSlider?.noUiSlider;
    if (!slider) return;
    slider.set([start, end]);
    const { min, max } = slider.options.range;
    temporalFilter = start === min && end === max ? null : { start, end };
    applyFilters();
}

// The letters of one year, set through the year slider like a click on a bar of the time view
function showLettersOfYear(year) {
    if (hasActiveFilter()) elements.resetFiltersBtn?.click();
    clearLetterSearch();
    const slider = elements.yearRangeSlider?.noUiSlider;
    if (slider) slider.set([year, year]);
    temporalFilter = { start: year, end: year };
    applyFilters();
    revealLetters();
}

// Undated letters have no place on the year slider, so they get their own temporal filter
function showUndatedLetters() {
    temporalFilter = { undated: true };
    applyFilters();
    revealLetters();
}

/**
 * The letters of the selection just set, without leaving the view: the drawer opens and takes the
 * focus. In the letter list, which has no drawer, the list itself shows them.
 */
function revealLetters() {
    if (currentView === 'letters') {
        focusViewHeading('letters');
        return;
    }
    setDrawerOpen(true, { focus: true });
}

// A new person is a new centre of the selection, so a partner chosen beside the last one goes
function applyPersonFilter(personId) {
    clearLetterSearch();
    selectedPersonId = personId;
    selectedPartnerId = null;
    applyFilters();
}

function clearPersonFilter() {
    selectedPersonId = null;
    selectedPartnerId = null;
    applyFilters();
}

// The letters exchanged between two persons, from a tie of the network
function showLettersBetween(personId, partnerId) {
    clearLetterSearch();
    selectedPersonId = personId;
    selectedPartnerId = partnerId;
    applyFilters();
    revealLetters();
}

// Goes through the state manager like the other filters, so every view and the reset button see it
function applyPlaceFilter(placeId) {
    clearLetterSearch();
    selectedPlaceFilter = placeId;
    applyFilters();
}

function clearPlaceFilter() {
    selectedPlaceFilter = null;
    applyFilters();
}

// Only these two change the subject filter; selecting a topic in the topics view only shows it
function applySubjectFilter(subjectId) {
    activeSubjectFilter = subjectId;
    applyFilters();
}

function clearSubjectFilter() {
    activeSubjectFilter = null;
    applyFilters();
}

function hasActiveFilter() {
    const f = state.filters;
    return Boolean(f.temporal || f.languages || f.person || f.partner || f.year != null || f.place || f.subject || f.features?.length ||
        f.quality?.preciseDates || f.quality?.knownPersons || f.quality?.locatedPlaces);
}

// Every view that shows the filtered letters marks an active filter on its button, so a list
// shortened by a filter set elsewhere is never silent
const FILTER_INDICATOR_VIEWS = ['letters', 'persons', 'places', 'timeline', 'network', 'mentions-flow', 'map', 'spacetime','chronik', 'activity', 'comparison', 'topics'];

function updateFilterIndicators() {
    const active = hasActiveFilter();
    FILTER_INDICATOR_VIEWS.forEach(view => {
        const btn = document.querySelector(`.view-btn[data-view="${view}"]`);
        if (!btn) return;
        let indicator = btn.querySelector('.filter-indicator');
        if (active && !indicator) {
            indicator = document.createElement('span');
            indicator.className = 'filter-indicator';
            indicator.title = 'Filter aktiv';
            indicator.setAttribute('aria-hidden', 'true');
            btn.appendChild(indicator);
        } else if (!active && indicator) {
            indicator.remove();
        }
    });
}

// Views with the filter sidebar beside them on a wide screen
const SIDEBAR_VIEWS = ['map', 'spacetime', 'persons', 'letters', 'timeline', 'topics', 'places', 'network', 'mentions-flow'];

// What removing one mark of the selection sentence releases; each goes through the same inputs as
// the sidebar control of its kind, so slider, checkboxes and sentence always agree
function releaseMark(key) {
    if (key === 'person') {
        // Of two persons the other one stays, so removing one name leaves the other's letters
        if (selectedPartnerId) applyPersonFilter(selectedPartnerId); else clearPersonFilter();
    } else if (key === 'partner') {
        selectedPartnerId = null;
        applyFilters();
    } else if (key === 'place') {
        clearPlaceFilter();
    } else if (key === 'time') {
        temporalFilter = null;
        const slider = elements.yearRangeSlider?.noUiSlider;
        if (slider) slider.set([slider.options.range.min, slider.options.range.max]);
        applyFilters();
    } else if (key === 'year') {
        pickedYearFilter = null;
        applyFilters();
    } else if (key === 'languages') {
        document.querySelectorAll('input[name="language"]').forEach(cb => { cb.checked = true; });
        applyFilters();
    } else if (key === 'subject') {
        clearSubjectFilter();
    } else if (key.startsWith('feature:')) {
        featureFilter.delete(key.slice('feature:'.length));
        document.querySelectorAll('input[name="feature"]').forEach(cb => { cb.checked = featureFilter.has(cb.value); });
        applyFilters();
    } else if (key.startsWith('quality:')) {
        const name = key.slice('quality:'.length);
        qualityFilter[name] = false;
        const box = { preciseDates: elements.filterPreciseDates, knownPersons: elements.filterKnownPersons, locatedPlaces: elements.filterLocatedPlaces }[name];
        if (box) box.checked = false;
        applyFilters();
    }
}

/**
 * The selection as one sentence of removable marks at the top of the sidebar filters, such as
 * „Paris, 1900–1905, Französisch“. It replaces the separate badges of person, place, subject and
 * features, so every filter is named once and in a fixed order. A mark stays while its filter is
 * set, also when the filter leaves no letter, so it can be removed.
 */
function renderSelectionSentence() {
    const sentence = document.getElementById('selection-sentence');
    if (!sentence) return;
    const marks = selectionMarks(state.filters, allLetters);
    sentence.classList.toggle('hidden', marks.length === 0);
    // An unchanged sentence keeps its elements, so the focus on a mark survives a repeated filter
    const key = JSON.stringify(marks);
    if (sentence.dataset.marks === key) return;
    sentence.dataset.marks = key;
    sentence.innerHTML = marks.map(mark => `${escapeHtml(mark.joiner)}<span class="selection-mark">${escapeHtml(mark.label)}<button type="button" class="selection-mark__clear" data-mark="${escapeHtml(mark.key)}" aria-label="${escapeHtml(mark.label)} entfernen" title="Entfernen"><i class="fas fa-times" aria-hidden="true"></i></button></span>`).join('');
}

document.getElementById('selection-sentence')?.addEventListener('click', (e) => {
    const button = e.target.closest('.selection-mark__clear');
    if (!button) return;
    const sentence = e.currentTarget;
    const index = [...sentence.querySelectorAll('.selection-mark__clear')].indexOf(button);
    releaseMark(button.dataset.mark);
    // The mark leaves with its filter, so focus goes to the mark now in its place, else the one
    // before it, else the heading of the view, instead of falling back to the document
    const rest = sentence.querySelectorAll('.selection-mark__clear');
    const next = rest[Math.min(index, rest.length - 1)];
    if (next) next.focus(); else focusViewHeading(currentView);
});

// The sidebar figures show the filtered share of the dataset, so an active filter is never silent
function updateStatCounts() {
    if (!corpusTotals) return;
    const shown = hasActiveFilter()
        ? summarizeCorpus(filteredLetters, dataIndices)
        : null;
    const pairs = [
        [elements.totalLettersCount, shown ? shown.total : corpusTotals.letters, corpusTotals.letters],
        [elements.totalSendersCount, shown ? shown.persons.size : corpusTotals.persons, corpusTotals.persons],
        [elements.totalPlacesCount, shown ? shown.places.size : corpusTotals.places, corpusTotals.places]
    ];
    for (const [el, part, total] of pairs) {
        if (!el) continue;
        const { value, of } = formatCountOf(part, total);
        el.textContent = value;
        if (of) {
            const small = document.createElement('span');
            small.className = 'stat-value__of';
            small.textContent = of;
            el.append(small);
        }
    }
}

// Language counts under all other active filters, so each checkbox shows what selecting it would add
function updateFilterCounts() {
    const languageCounts = {};
    state.filterLetters({ ...state.filters, languages: null }).forEach(letter => {
        const code = letter.language?.code || NO_LANGUAGE;
        languageCounts[code] = (languageCounts[code] || 0) + 1;
    });

    document.querySelectorAll('input[name="language"]').forEach(cb => {
        const count = languageCounts[cb.value] || 0;
        const el = document.getElementById(`count-lang-${cb.value}`);
        if (el) el.textContent = `(${count.toLocaleString('de-DE')})`;
        // A language without a letter under the other filters says nothing and leaves the list
        cb.closest('label')?.classList.toggle('hidden', count === 0);
    });

    // The folded group names how many languages it still holds and leaves when it holds none
    const more = document.querySelector('#language-checkboxes .filter-more');
    if (more) {
        const shown = more.querySelectorAll('label:not(.hidden)').length;
        more.classList.toggle('hidden', shown === 0);
        more.querySelector('summary').innerHTML = `<span class="lang-swatch" style="background: ${LANGUAGE_COLORS.other}" aria-hidden="true"></span> Übrige Sprachen (${shown})`;
        // A language filter that selects a folded language must not hide that it does
        const all = document.querySelectorAll('input[name="language"]');
        const checked = document.querySelectorAll('input[name="language"]:checked');
        if (checked.length < all.length && more.querySelector('label:not(.hidden) input:checked')) more.open = true;
    }
}

function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function hideLoading() {
    const loadingOverlay = elements.loadingOverlay;
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// A dataset that cannot be loaded is reported on the page, with the way back to the start page
function showError(message) {
    hideLoading();
    const box = document.getElementById('load-error');
    const text = document.getElementById('load-error-text');
    if (box && text) {
        text.textContent = message;
        box.classList.remove('hidden');
        document.querySelector('.container')?.classList.add('hidden');
        box.querySelector('a')?.focus();
    } else {
        showToast(message, 10000);
    }
}

// Places view resolved coordinates: rebuild the aggregation and redraw the markers
function handlePlacesDataUpdated() {
    placeAggregation = aggregateLettersByPlace(allLetters, dataIndices.places || {});

    detectAvailableViews();
    updateViewButtons();

    if (availableViews.map?.available) updateMapPlaces();
}

// URL state

// Read view and filters from the URL through the state manager, the one parser of the URL
// state, and copy them into the explorer's filter inputs (slider, checkboxes, badges)
function initUrlState() {
    const urlParams = new URLSearchParams(window.location.search);
    state.fromURLParams(urlParams);

    const view = urlParams.get('view');
    if (view === 'questions') {
        currentView = 'overview';
    } else if (VIEWS.includes(view)) {
        currentView = view;
    }

    const f = state.filters;
    if (f.temporal?.undated) {
        temporalFilter = { undated: true };
    } else if (f.temporal) {
        temporalFilter = { start: f.temporal.min, end: f.temporal.max };
    }
    selectedPersonId = f.person;
    selectedPartnerId = f.partner;
    selectedPlaceFilter = f.place;
    pickedYearFilter = f.year;
    activeSubjectFilter = f.subject;
    initialLanguageFilter = f.languages;
    qualityFilter = { preciseDates: false, knownPersons: false, locatedPlaces: false, ...f.quality };
    featureFilter = new Set(f.features || []);
}

/**
 * Sidebar filters for what the source records about the transmission of a letter (postmark,
 * inferred date or place, several recipients). A feature no letter of the dataset has gets no
 * checkbox, so plain CMIF shows no such group.
 */
function buildFeatureFilter() {
    const group = document.getElementById('feature-filter-group');
    const container = document.getElementById('feature-checkboxes');
    if (!group || !container) return;
    // A quality filter that would keep every letter or none says nothing about this dataset
    const qualityTests = {
        'filter-precise-dates': l => l.datePrecision === 'day',
        'filter-known-persons': l => Boolean(l.sender?.id && l.recipient && letterRecipients(l).every(r => r.id)),
        'filter-located-places': l => Boolean(l.place_sent?.lat && l.place_sent?.lon)
    };
    for (const [id, test] of Object.entries(qualityTests)) {
        const count = allLetters.filter(test).length;
        document.getElementById(id)?.closest('label')?.classList.toggle('hidden', count === 0 || count === allLetters.length);
    }

    const present = LETTER_FEATURES.filter(feature => allLetters.some(feature.test));
    group.classList.toggle('hidden', present.length === 0);
    container.innerHTML = present.map(feature => `
        <label class="filter-checkbox">
            <input type="checkbox" name="feature" value="${feature.key}" ${featureFilter.has(feature.key) ? 'checked' : ''}>
            <span>${escapeHtml(feature.label)}</span>
            <span class="filter-count" id="count-feature-${feature.key}"></span>
        </label>`).join('');
    container.querySelectorAll('input[name="feature"]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) featureFilter.add(cb.value); else featureFilter.delete(cb.value);
            applyFilters();
        });
    });
}

// Counts under all other active filters, like the language counts
function updateFeatureCounts() {
    const boxes = document.querySelectorAll('input[name="feature"]');
    if (boxes.length === 0) return;
    boxes.forEach(cb => {
        const feature = LETTER_FEATURES.find(f => f.key === cb.value);
        const others = (state.filters.features || []).filter(key => key !== cb.value);
        const count = state.filterLetters({ ...state.filters, features: [...others, cb.value] }).length;
        const el = document.getElementById(`count-feature-${feature.key}`);
        if (el) el.textContent = `(${count.toLocaleString('de-DE')})`;
    });
}

function updateUrlState() {
    const urlParams = new URLSearchParams(window.location.search);
    const newParams = state.toURLParams();

    // Keep the parameters that select the dataset, so a reload or shared link still loads it
    for (const key of ['dataset', 'json', 'demo']) {
        const value = urlParams.get(key);
        if (value) newParams.set(key, value);
    }
    const sharedQuery = correspSearchShareUrl(datasetSource);
    if (sharedQuery) newParams.set('cs', sharedQuery);

    const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;

    // A view change is a navigation step with its own history entry, so Back returns to the
    // previous view (decision E1). Filter changes replace the entry: a slider drag would flood it.
    const viewChanged = urlParams.get('view') !== newParams.get('view');
    if (historyReady && viewChanged && !restoringFromHistory) {
        window.history.pushState({}, '', newUrl);
    } else {
        window.history.replaceState({}, '', newUrl);
    }
}

// Back and Forward: an entry with the current filters only switches the view, an entry with other
// filters reloads, because init() reads view and filters from the URL in one place
function handleHistoryNavigation() {
    const params = new URLSearchParams(window.location.search);
    if (!sameFilterParams(params, state.toURLParams())) {
        window.location.reload();
        return;
    }
    const view = params.get('view');
    restoringFromHistory = true;
    try {
        switchView(VIEWS.includes(view) ? view : 'overview');
    } finally {
        restoringFromHistory = false;
    }
}

// View switching

function initViewSwitcher() {
    // Every subject with several representations lists them in a menu under its tab, so they
    // are found at the top of the page from every view
    document.querySelectorAll('.view-group-btn').forEach(btn => {
        const views = VIEW_GROUPS[btn.dataset.group];
        if (views.length < 2) return;
        const group = document.createElement('span');
        group.className = 'view-group';
        btn.replaceWith(group);
        const menu = document.createElement('span');
        menu.className = 'view-group__menu';
        views.forEach(view => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'view-menu-item';
            item.dataset.view = view;
            item.textContent = document.querySelector(`.view-btn[data-view="${view}"] .view-btn-text`)?.textContent || view;
            item.addEventListener('click', () => { switchView(view); btn.focus(); });
            menu.append(item);
        });
        group.append(btn, menu);
        // A choice closes the menu until the pointer and the focus have left the tab; open, it
        // would cover the representation switch that stands below it in the view header
        group.addEventListener('click', () => group.classList.add('view-group--closed'));
        // while the focus still rests on the tab the menu stays closed, or it would reopen under the pointer's way to the view
        group.addEventListener('pointerleave', () => { if (!group.contains(document.activeElement)) group.classList.remove('view-group--closed'); });
        group.addEventListener('focusout', (e) => { if (!group.contains(e.relatedTarget)) group.classList.remove('view-group--closed'); });
    });
    document.querySelectorAll('.view-group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const views = VIEW_GROUPS[btn.dataset.group].filter(view => availableViews[view]?.available);
            const last = lastViewOfGroup[btn.dataset.group];
            if (views.length) switchView(views.includes(last) ? last : views[0]);
        });
    });
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.view !== 'comparison') {
                switchView(btn.dataset.view);
                btn.focus();
                return;
            }
            // Compare what the current subject lists: two persons, two places or two periods
            const from = groupOf(currentView);
            comparisonGroup = from in COMPARISON_MODE ? from : 'persons';
            switchView('comparison');
            document.querySelector(`.comparison-mode-btn[data-mode="${COMPARISON_MODE[comparisonGroup]}"]`)?.click();
            btn.focus();
        });
        // The tooltip shows the description only to mouse users; a hidden text gives it to screen readers
        if (btn.dataset.tooltipDesc) {
            const desc = document.createElement('span');
            desc.id = `view-desc-${btn.dataset.view}`;
            desc.className = 'visually-hidden';
            desc.textContent = btn.dataset.tooltipDesc;
            btn.append(desc);
            btn.setAttribute('aria-describedby', desc.id);
        }
    });
    // Links inside view texts, such as the place list named on the map
    document.querySelectorAll('[data-switch-view]').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.switchView));
    });
}

// Render a view from the current filtered letters
function renderView(view) {
    switch (view) {
        case 'overview': renderOverview(); break;
        case 'persons': renderPersonsList(); break;
        case 'letters': renderLettersList(); break;
        case 'timeline': renderTimelineView(); break;
        case 'topics': renderTopicsListView(); break;
        case 'places': renderPlacesListView(); break;
        case 'network': renderNetworkView(); break;
        case 'mentions-flow': renderMentionsFlowView(); break;
        case 'chronik': renderChronikView(); break;
        case 'activity': renderActivityView(); break;
        case 'comparison': renderComparisonView(); break;
        case 'map': resizeMap(); break;
        case 'spacetime': renderSpacetime(); break;
    }
}

function switchView(view) {
    // The former questions view is part of the overview
    if (view === 'questions') view = 'overview';

    currentView = view;
    state.ui.currentView = view;
    updateUrlState();

    document.querySelectorAll('.view-btn').forEach(btn => {
        const isActive = btn.dataset.view === view;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
        // On narrow screens the switcher scrolls horizontally; keep the active view in sight
        const switcher = btn.parentElement;
        if (isActive && switcher && switcher.scrollWidth > switcher.clientWidth) {
            btn.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${view}-view`);
    });
    lastViewOfGroup[groupOf(view)] = view;
    syncViewVariants();

    // Overview, chronik, activity and comparison use the full width without sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const noSidebar = view === 'chronik' || view === 'activity' || view === 'comparison';
        // What describes the dataset stands in the sidebar of the start view, above its filters
        const meta = document.querySelector('.workspace__meta');
        if (meta && meta.parentElement !== sidebar) sidebar.prepend(meta);
        meta?.classList.toggle('hidden', view !== 'overview');
        sidebar.classList.toggle('hidden', noSidebar);
        setSidebarOpen(false);
        document.getElementById('sidebar-toggle')?.classList.toggle('hidden', noSidebar);
    }

    renderView(view);
    updateViewTitle();
    // The drawer keeps its state across views and stands back only for the letter list itself
    updateLettersDrawer({ hidden: view === 'letters' });
}

// The letter list under one transmission feature, alone or added to the features already set
function showLettersWithFeature(key, { keepOthers = false } = {}) {
    clearLetterSearch();
    if (!keepOthers) featureFilter.clear();
    featureFilter.add(key);
    document.querySelectorAll('input[name="feature"]').forEach(cb => { cb.checked = featureFilter.has(cb.value); });
    applyFilters();
    revealLetters();
}

// The letters of one person, from a list entry or a dialog
function showLettersOfPerson(personId) {
    applyPersonFilter(personId);
    revealLetters();
}

// Export

function initExport() {
    const exportBtn = elements.exportBtn;
    const modal = elements.exportModal;
    const exportOptions = modal?.querySelectorAll('.export-option');

    if (!exportBtn || !modal) return;

    exportBtn.addEventListener('click', () => {
        // An empty selection offers no download, which would be a file without letters
        const empty = filteredLetters.length === 0;
        const info = elements.getById('export-info');
        if (info) {
            info.textContent = empty
                ? 'Der aktuelle Filter enthält keine Briefe. Ändern oder entfernen Sie Filter, um zu exportieren.'
                // The sentence names the active filters in words, as in the views without sidebar
                : `${filterSentence() || `Alle ${filteredLetters.length.toLocaleString('de-DE')} Briefe.`} Exportiert wird genau diese Auswahl, mit allen Angaben der Quelle zu Datierung, Empfängern, Signatur, Poststempel und Anschrift.`;
        }
        exportOptions?.forEach(option => { option.disabled = empty; });
        openModal(modal);
    });

    exportOptions?.forEach(option => {
        option.addEventListener('click', () => {
            if (filteredLetters.length === 0) return;
            if (option.dataset.format === 'csv') {
                downloadFile(lettersToCsv(filteredLetters), 'korrespondenz.csv', 'text/csv;charset=utf-8');
            } else {
                downloadFile(datasetToJson(filteredLetters, { meta: state.getMeta(), source: datasetSource, indices: dataIndices }), 'korrespondenz.json', 'application/json');
            }
            closeModal(modal);
        });
    });
}

enableModalKeyboard();

// Narrow screens: the sidebar with dataset summary and filters is off-canvas and opened by this toggle
function setSidebarOpen(open) {
    document.querySelector('.sidebar')?.classList.toggle('open', open);
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Filter ausblenden' : 'Filter anzeigen');
    }
}

document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    setSidebarOpen(!document.querySelector('.sidebar')?.classList.contains('open'));
});

// Escape closes the open off-canvas sidebar and returns focus to its toggle. Dialogs, the tour and
// the comboboxes handle Escape first and mark it with preventDefault or stop it.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (!document.querySelector('.sidebar')?.classList.contains('open')) return;
    setSidebarOpen(false);
    document.getElementById('sidebar-toggle')?.focus();
});

// role="button" elements get native button keyboard behaviour: Enter and Space trigger their click handler
document.addEventListener('keydown', (e) => {
    const el = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && el.getAttribute?.('role') === 'button' && el.tagName !== 'BUTTON') {
        e.preventDefault();
        el.click();
    }
});

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
