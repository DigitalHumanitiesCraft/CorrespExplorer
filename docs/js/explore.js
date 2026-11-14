// Explorer page: loads a dataset (?json= path or the upload in sessionStorage), keeps the filter
// inputs and the URL state, switches between the views and wires the view modules.

import { NO_LANGUAGE, VIEWS, LETTER_FEATURES, computeLanguageColors, registerLanguageLabels, languageLabel } from './constants.js';
import { initBasket, datasetKey, loadBasketFromUrl } from './basket.js';
import { debounce, escapeHtml, isAllowedJsonPath, sameFilterParams, datedYearRange, enableModalKeyboard, openModal, closeModal, showToast, downloadFile, personKey, placeKey, letterRecipients } from './utils.js';
import { datasetQuality, summarizeCorpus } from './research-paths.js';
import { datasetToJson, lettersToCsv } from './export.js';
import { initKnowledgePath } from './knowledge-path.js';
import { formatCountOf } from './formatters.js';
import { initDemoTour, checkAndStartDemoTour } from './demo-tour.js';
import { loadDemoDataset, loadUrlDataset } from './cmif-parser.js';
import { isCorrespSearchUrl, correspSearchShareUrl } from './correspsearch-api.js';
import { state } from './state-manager.js';
import { elements, initDOMCache } from './dom-cache.js';
import { filterSentence } from './views/view-support.js';
import { initOverviewView, renderOverview } from './views/overview-view.js';
import { initMapView, updateMapPlaces, resizeMap, aggregateLettersByPlace } from './views/map-view.js';
import { initPersonsView, renderPersonsList } from './views/persons-view.js';
import { initLettersView, renderLettersList, showLetterDetail, clearLetterSearch } from './views/letters-view.js';
import { initTimelineView, renderTimeline as renderTimelineView } from './views/timeline-view.js';
import { initActivityView, renderActivity as renderActivityView } from './views/activity-view.js';
import { initComparisonView, renderComparison as renderComparisonView } from './views/comparison-view.js';
import { initChronikView, renderChronik as renderChronikView } from './views/chronik-view.js';
import { initNetworkView as initNetworkViewModule, renderNetwork as renderNetworkView } from './views/network-view.js';
import { initMentionsView, renderMentionsFlow as renderMentionsFlowView } from './views/mentions-view.js';
import { initTopicsView, renderTopicsList as renderTopicsListView, getSubjectIndex } from './views/topics-view.js';
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
let selectedPlaceFilter = null;
// The subject filter is separate from the topic shown in the topics view, which only displays it
let activeSubjectFilter = null;
let initialLanguageFilter = null;
let currentView = 'overview';

// Mentions Flow view state
let mentionedPersonsIndex = new Map();  // Used for detectAvailableViews

// Available views tracking
let availableViews = {};

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
            btn.classList.toggle('hidden', !viewInfo.available);
            btn.disabled = !viewInfo.available;
            btn.title = viewInfo.available ? '' : viewInfo.reason;
        }
    });
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
        initTopicsQuickFilter();
        initViewSwitcher();
        // The view modules receive what they need from here and never import this file
        initOverviewView({
            getAllLetters: () => allLetters,
            getDataIndices: () => dataIndices,
            getCorpusSummary: () => corpusSummary,
            getCorpusQuality: () => corpusQuality,
            getAvailableViews: () => availableViews,
            showLettersWithFeature,
            switchView
        });
        initMapView({
            getPlaceAggregation: () => placeAggregation,
            applyPlaceFilter,
            applyPersonFilter,
            switchView
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
            switchView,
            showUndatedLetters,
            showLettersWithFeature
        });
        initTopicsView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            applySubjectFilter
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
            switchView
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
const LANGUAGES_SHOWN = 8;

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

    // The most frequent languages stand in the list, the others open on demand, so a dataset with
    // twenty languages does not push the remaining filters off the screen
    let target = container;
    const more = languageKeys.length > LANGUAGES_SHOWN + 1 ? document.createElement('details') : null;
    if (more) {
        more.className = 'filter-more';
        const summary = document.createElement('summary');
        summary.textContent = `${languageKeys.length - LANGUAGES_SHOWN} weitere Sprachen`;
        more.appendChild(summary);
    }

    languageKeys.forEach((code, index) => {
        if (more && index === LANGUAGES_SHOWN) target = more;
        const displayLabel = languageLabel(code);
        const tooltip = code === NO_LANGUAGE ? 'Keine Sprachzuordnung in den Quelldaten' : '';
        const label = document.createElement('label');
        if (tooltip) {
            label.title = tooltip;
        }
        label.innerHTML = `
            <input type="checkbox" name="language" value="${escapeHtml(code)}"${!initialLanguageFilter || initialLanguageFilter.includes(code) ? ' checked' : ''}>
            <span>${escapeHtml(displayLabel)}</span>
            <span class="filter-count" id="count-lang-${escapeHtml(code)}">(${counts[code]})</span>
        `;
        target.appendChild(label);
    });
    if (more) container.appendChild(more);

    filterGroup.classList.remove('hidden');

    container.querySelectorAll('input[name="language"]').forEach(cb => {
        cb.addEventListener('change', debounce(() => applyFilters(), 300));
    });
}

// Initialize Topics Quick Filter in sidebar
// All subjects sorted by count (for quick filter)
let sortedSubjects = [];

function initTopicsQuickFilter() {
    if (!dataIndices?.subjects) return;

    const subjects = dataIndices.subjects;
    const subjectKeys = Object.keys(subjects);

    if (subjectKeys.length === 0) return;

    const filterGroup = elements.topicsFilterGroup;
    const showAllLink = elements.showAllTopics;

    if (!filterGroup) return;

    // Sort all subjects by letter count
    sortedSubjects = subjectKeys.map(id => ({
        id,
        label: subjects[id].label || subjects[id].name || id,
        count: subjects[id].letter_count || subjects[id].count || 0
    })).sort((a, b) => b.count - a.count);

    // Only a dataset with topics offers the group; switchView hides it again in the topics view
    filterGroup.dataset.available = 'true';
    filterGroup.classList.toggle('hidden', currentView === 'topics');

    // Render initial list (top 15)
    renderTopicsQuickFilter('');

    // Setup search input
    const searchInput = elements.topicsQuickSearch;
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            renderTopicsQuickFilter(e.target.value.toLowerCase());
        }, 200));
    }

    // Show all topics link
    if (showAllLink) {
        showAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('topics');
        });
    }
}

function renderTopicsQuickFilter(searchTerm) {
    const container = elements.topicsQuickFilter;
    if (!container) return;

    // Filter by search term
    let filtered = sortedSubjects;
    if (searchTerm) {
        filtered = sortedSubjects.filter(t => t.label.toLowerCase().includes(searchTerm));
    }

    // Show top 15 (or all matches if searching)
    const toShow = searchTerm ? filtered.slice(0, 30) : filtered.slice(0, 15);

    if (toShow.length === 0) {
        container.innerHTML = '<div class="topics-no-results">Keine Themen gefunden</div>';
        return;
    }

    container.innerHTML = toShow.map(topic => {
        const isActive = activeSubjectFilter === topic.id;
        return `
            <button type="button" class="topic-quick-item ${isActive ? 'active' : ''}" aria-pressed="${isActive}" data-topic-id="${escapeHtml(topic.id)}" title="${escapeHtml(topic.label)}">
                <span class="topic-label">${escapeHtml(topic.label)}</span>
                <span class="topic-count">${topic.count}</span>
            </button>
        `;
    }).join('');

    if (filtered.length > toShow.length) {
        container.innerHTML += `<div class="topics-more-info">${filtered.length - toShow.length} weitere Themen...</div>`;
    }

    container.querySelectorAll('.topic-quick-item').forEach(item => {
        item.addEventListener('click', () => {
            if (activeSubjectFilter === item.dataset.topicId) {
                clearSubjectFilter();
            } else {
                applySubjectFilter(item.dataset.topicId);
            }
        });
    });
}

// Mark the quick filter entry of the active subject filter
function updateTopicsQuickFilterState() {
    const container = elements.topicsQuickFilter;
    if (!container) return;

    container.querySelectorAll('.topic-quick-item').forEach(item => {
        const isActive = activeSubjectFilter === item.dataset.topicId;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
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
        selectedPlaceFilter = null;
        activeSubjectFilter = null;
        qualityFilter = { preciseDates: false, knownPersons: false, locatedPlaces: false };
        Object.values(qualityCheckboxes).forEach(cb => { if (cb) cb.checked = false; });
        featureFilter.clear();
        document.querySelectorAll('input[name="feature"]').forEach(cb => { cb.checked = false; });
        applyFilters();
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
    filterUpdates.place = selectedPlaceFilter || null;
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
    updateFilterBadges();
    updateTopicsQuickFilterState();
    updateFilterIndicators();
    announceResultCount();

    if (render) renderView(currentView);
}

// Undated letters have no place on the year slider, so they get their own temporal filter
function showUndatedLetters() {
    temporalFilter = { undated: true };
    applyFilters();
    switchView('letters');
}

function applyPersonFilter(personId) {
    clearLetterSearch();
    selectedPersonId = personId;
    applyFilters();
}

function clearPersonFilter() {
    selectedPersonId = null;
    applyFilters();
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
    return Boolean(f.temporal || f.languages || f.person || f.place || f.subject || f.features?.length ||
        f.quality?.preciseDates || f.quality?.knownPersons || f.quality?.locatedPlaces);
}

// Every view that shows the filtered letters marks an active filter on its button, so a list
// shortened by a filter set elsewhere is never silent
const FILTER_INDICATOR_VIEWS = ['letters', 'persons', 'places', 'timeline', 'network', 'map', 'chronik', 'activity', 'comparison'];

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

function personNameForKey(key) {
    for (const letter of allLetters) {
        if (personKey(letter.sender) === key) return letter.sender.name || key;
        const recipient = letterRecipients(letter).find(r => personKey(r) === key);
        if (recipient) return recipient.name || key;
    }
    return key;
}

function placeNameForKey(key) {
    const letter = allLetters.find(l => placeKey(l.place_sent) === key);
    return letter?.place_sent?.name || key;
}

function subjectLabelForKey(key) {
    return getSubjectIndex()?.[key]?.label || dataIndices.subjects?.[key]?.label || key;
}

const FILTER_BADGE_ORDER = ['person-filter-display', 'place-filter-display', 'subject-filter-display', 'feature-filter-display'];

/**
 * Removable badge of an active person, place or subject filter under the sidebar stats. The
 * badge stays while the filter is set, also when it leaves no letter, so it can be removed.
 */
function updateFilterBadge(id, className, icon, label, onClear) {
    let display = elements.getById(id);
    if (!label) {
        display?.classList.add('hidden');
        return;
    }
    if (!display) {
        display = document.createElement('div');
        display.id = id;
        display.className = className;
        // Person, place, subject: fixed order after the stats cards
        const previous = FILTER_BADGE_ORDER.slice(0, FILTER_BADGE_ORDER.indexOf(id))
            .map(prevId => document.getElementById(prevId))
            .filter(Boolean)
            .pop();
        (previous || document.querySelector('.stats-cards'))?.after(display);
    }
    display.innerHTML = `
        <div class="filter-badge ${className.includes('subject') ? 'subject-badge' : ''}">
            <i class="fas ${icon}" aria-hidden="true"></i>
            <span>${escapeHtml(label)}</span>
            <button type="button" class="filter-clear" title="Filter entfernen" aria-label="Filter entfernen: ${escapeHtml(label)}">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>
    `;
    display.classList.remove('hidden');
    display.querySelector('.filter-clear').addEventListener('click', () => {
        onClear();
        // The badge disappears with its filter, so focus moves to the next remaining badge or
        // the reset button instead of falling back to the document
        const next = FILTER_BADGE_ORDER
            .map(badgeId => document.getElementById(badgeId))
            .find(el => el && !el.classList.contains('hidden'));
        (next?.querySelector('.filter-clear') || elements.resetFiltersBtn)?.focus();
    });
}

function updateFilterBadges() {
    updateFilterBadge('person-filter-display', 'person-filter-active', 'fa-user',
        selectedPersonId ? personNameForKey(selectedPersonId) : null, clearPersonFilter);
    updateFilterBadge('place-filter-display', 'person-filter-active place-filter-active', 'fa-map-marker-alt',
        selectedPlaceFilter ? placeNameForKey(selectedPlaceFilter) : null, clearPlaceFilter);
    updateFilterBadge('subject-filter-display', 'subject-filter-active', 'fa-tag',
        activeSubjectFilter ? subjectLabelForKey(activeSubjectFilter) : null, clearSubjectFilter);
    // Transmission filters can be set from another view, so they show as a badge like the others
    const featureLabels = LETTER_FEATURES.filter(f => featureFilter.has(f.key)).map(f => f.label);
    updateFilterBadge('feature-filter-display', 'person-filter-active feature-filter-active', 'fa-filter',
        featureLabels.length ? featureLabels.join(', ') : null, () => {
            featureFilter.clear();
            document.querySelectorAll('input[name="feature"]').forEach(cb => { cb.checked = false; });
            applyFilters();
        });
}

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
        if (el) el.textContent = `(${count})`;
        // A language without a letter under the other filters says nothing and leaves the list
        cb.closest('label')?.classList.toggle('hidden', count === 0);
    });

    // The folded group names how many languages it still holds and leaves when it holds none
    const more = document.querySelector('#language-checkboxes .filter-more');
    if (more) {
        const shown = more.querySelectorAll('label:not(.hidden)').length;
        more.classList.toggle('hidden', shown === 0);
        more.querySelector('summary').textContent = shown === 1 ? '1 weitere Sprache' : `${shown} weitere Sprachen`;
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
    selectedPlaceFilter = f.place;
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
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
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

    // Overview, chronik, activity and comparison use the full width without sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const noSidebar = view === 'overview' || view === 'chronik' || view === 'activity' || view === 'comparison';
        sidebar.classList.toggle('hidden', noSidebar);
        setSidebarOpen(false);
        document.getElementById('sidebar-toggle')?.classList.toggle('hidden', noSidebar);
    }
    // The topics view lists and searches all topics itself, so the short list in the sidebar steps aside.
    // Visibility runs through the .hidden class only (design.md), the dataset flag says whether topics exist
    const topicsGroup = elements.topicsFilterGroup;
    if (topicsGroup) topicsGroup.classList.toggle('hidden', view === 'topics' || topicsGroup.dataset.available !== 'true');

    renderView(view);
}

// The letter list under one transmission feature, alone or added to the features already set
function showLettersWithFeature(key, { keepOthers = false } = {}) {
    clearLetterSearch();
    if (!keepOthers) featureFilter.clear();
    featureFilter.add(key);
    document.querySelectorAll('input[name="feature"]').forEach(cb => { cb.checked = featureFilter.has(cb.value); });
    applyFilters({ render: false });
    switchView('letters');
}

// The letter list of one person, from a list entry or a dialog
function showLettersOfPerson(personId) {
    applyPersonFilter(personId);
    switchView('letters');
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
