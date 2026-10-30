// Explorer page: loads a dataset (?json= path or the upload in sessionStorage), keeps the filter
// inputs, renders overview, map, persons, letters and the dialogs, and wires the view modules.

import { LANGUAGE_COLORS, MAP_DEFAULTS, NO_LANGUAGE, BASKET_LIMITS, VIEWS, computeLanguageColors, registerLanguageLabels, languageLabel } from './constants.js';
import {
    isInBasket as basketIsInBasket,
    addToBasket as basketAdd,
    removeFromBasket as basketRemove,
    addLettersToBasket,
    initBasket,
    datasetKey,
    loadBasketFromUrl
} from './basket.js';
import { enrichPerson, formatLifeDates, formatPlaces, buildExternalLinks } from './wikidata-enrichment.js';
import { debounce, escapeHtml, safeUrl, externalLink, isAllowedJsonPath, countIdentifiedPersons, enableModalKeyboard, openModal, closeModal, showToast, downloadFile, personKey, placeKey, personAuthority } from './utils.js';
import { analyzeResearchQuestions, summarizeCorpus, renderOverviewResearchPaths } from './research-paths.js';
import { lettersToCsv, lettersToJson } from './export.js';
import { initKnowledgePath, startKnowledgePath } from './knowledge-path.js';
import {
    formatDateWithPrecision,
    formatPersonName,
    formatPlaceName,
    getDatePrecisionClass,
    getPersonPrecisionClass,
    getPersonInitials
} from './formatters.js';
import { initDemoTour, checkAndStartDemoTour, startTour } from './demo-tour.js';
import { state } from './state-manager.js';
import { elements, initDOMCache } from './dom-cache.js';
// View modules
import { initTimelineView, renderTimeline as renderTimelineView } from './views/timeline-view.js';
import { initActivityView, renderActivity as renderActivityView } from './views/activity-view.js';
import { initComparisonView, renderComparison as renderComparisonView } from './views/comparison-view.js';
import { initChronikView, renderChronik as renderChronikView } from './views/chronik-view.js';
import { initNetworkView as initNetworkViewModule, renderNetwork as renderNetworkView } from './views/network-view.js';
import { initMentionsView, renderMentionsFlow as renderMentionsFlowView } from './views/mentions-view.js';
import { initTopicsView, renderTopicsList as renderTopicsListView, getSubjectIndex } from './views/topics-view.js';
import { initPlacesView, renderPlacesList as renderPlacesListView } from './views/places-view.js';

// Map instance (not in state - MapLibre manages its own state)
let map;

// Module-level copies of the loaded data and the filter inputs. state-manager.js holds the
// filter logic; applyFilters() writes these inputs into it and reads the result back.
let allLetters = [];
let filteredLetters = [];
let placeAggregation = {};
let dataIndices = {};
let temporalFilter = null;
let dateRange = { min: 1800, max: 2000 };
let qualityFilter = { preciseDates: false, knownPersons: false, locatedPlaces: false };
let selectedPersonId = null;
let selectedPlaceFilter = null;
// The subject filter is separate from the topic shown in the topics view, which only displays it
let activeSubjectFilter = null;
let initialLanguageFilter = null;
let currentView = 'overview';

// Track state
let handlersSetup = false;
let mapInitialized = false;

// Mentions Flow view state
let mentionedPersonsIndex = new Map();  // Used for detectAvailableViews

// Logger handed to the view modules; only errors reach the console
const noop = () => {};
const log = {
    init: noop,
    render: noop,
    event: noop,
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

// Colour of a design token from tokens.css, for canvas and WebGL layers that cannot read CSS
function cssToken(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Map color mode: 'uniform' (single color) or 'language' (by dominant language)
let mapColorMode = 'language';

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
            // Nothing uploaded and no ?json= path: the start page offers the datasets
            window.location.href = 'index.html';
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
        filteredLetters = allLetters;
        dataIndices = data.indices || {};

        // Compute dynamic language colors based on data distribution
        computeLanguageColors(allLetters);
        registerLanguageLabels(allLetters);

        // Calculate date range from data (filter unrealistic years)
        const years = allLetters.map(l => l.year).filter(y =>
            y !== null && y !== undefined && y >= 1400 && y <= 2100
        );
        if (years.length > 0) {
            dateRange.min = Math.min(...years);
            dateRange.max = Math.max(...years);
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
            currentView = getFirstAvailableView();
        }

        updateUI(data);

        // Update view buttons based on data availability
        updateViewButtons();

        initMap();
        initFilters();
        initTopicsQuickFilter();
        initViewSwitcher();
        initPersonsView();
        initLettersView();
        // Initialize extracted timeline view with dependencies
        initTimelineView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            applyFilters,
            switchView,
            showUndatedLetters
        });
        // Initialize extracted topics view with dependencies
        initTopicsView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            applySubjectFilter,
            log
        });
        // Initialize extracted places view with dependencies
        initPlacesView({
            getFilteredLetters: () => filteredLetters,
            getAllLetters: () => allLetters,
            getDataIndices: () => dataIndices,
            applyPlaceFilter,
            switchView,
            onDataUpdated: handlePlacesDataUpdated,
            log
        });
        // Initialize extracted network view with dependencies
        initNetworkViewModule({
            getFilteredLetters: () => state.getFilteredLetters(),
            getAllLetters: () => allLetters,
            getDateRange: () => dateRange,
            applyPersonFilter,
            applySubjectFilter,
            switchView,
            log
        });
        // Initialize extracted mentions view with dependencies
        initMentionsView({
            getFilteredLetters: () => state.getFilteredLetters(),
            showLetterDetail,
            log
        });
        // Initialize extracted chronik view with dependencies
        initChronikView({
            getFilteredLetters: () => state.getFilteredLetters(),
            getAllLetters: () => allLetters,
            showLetterDetail
        });
        // Initialize extracted activity view with dependencies
        initActivityView({
            getFilteredLetters: () => state.getFilteredLetters(),
            showLetterDetail
        });
        // Initialize extracted comparison view with dependencies
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
        initDemoTour({ switchView });
        checkAndStartDemoTour();
    } catch (error) {
        log.error('Init failed: ' + error.message);
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
    if (!storedData) return null;
    try {
        return JSON.parse(storedData);
    } catch {
        throw new Error('Der hochgeladene Datensatz in diesem Tab ist nicht lesbar. Bitte laden Sie ihn auf der Startseite erneut.');
    }
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

    // Update stats
    const totalLetters = elements.totalLettersCount;
    const totalSenders = elements.totalSendersCount;
    const totalPlacesEl = elements.totalPlacesCount;

    // Persons and places are counted from the letters like in the overview (summarizeCorpus),
    // because meta.unique_senders and meta.unique_places count differently per source
    const corpus = summarizeCorpus(allLetters, dataIndices);
    if (totalLetters) totalLetters.textContent = (data.meta?.total_letters || allLetters.length).toLocaleString('de-DE');
    if (totalSenders) totalSenders.textContent = corpus.persons.size.toLocaleString('de-DE');
    if (totalPlacesEl) totalPlacesEl.textContent = corpus.places.size.toLocaleString('de-DE');

    // Update uncertainty statistics if available
    updateUncertaintyStats(data.meta?.uncertainty);

    // Build language filter
    buildLanguageFilter();
}

// Update uncertainty statistics in sidebar using icons with tooltips
function updateUncertaintyStats(uncertainty) {
    if (!uncertainty) return;

    // Support both old format (dates/senders/places) and new format (date_precision/date_certainty)
    let dates, senders, places;

    if (uncertainty.date_precision) {
        // New format from preprocessor
        dates = uncertainty.date_precision;
        senders = uncertainty.senders || { identified: 0, named: 0, unknown: 0 };
        places = uncertainty.places || { exact: 0, region: 0, unknown: 0 };
    } else if (uncertainty.dates) {
        // Old format
        dates = uncertainty.dates;
        senders = uncertainty.senders || { identified: 0, named: 0, unknown: 0 };
        places = uncertainty.places || { exact: 0, region: 0, unknown: 0 };
    } else {
        // No valid format
        return;
    }

    // Calculate imprecise dates (month + year + range + unknown)
    const impreciseDates = (dates.month || 0) + (dates.year || 0) + (dates.range || 0) + (dates.unknown || 0);
    const totalDates = (dates.day || 0) + impreciseDates;

    // Calculate unknown persons
    const unknownSenders = (senders.unknown || 0) + (senders.partial || 0) + (senders.missing || 0);
    const totalSenders = (senders.identified || 0) + (senders.named || 0) + unknownSenders;

    // Calculate places without coordinates
    const imprecisePlaces = (places.region || 0) + (places.unknown || 0) + (places.missing || 0);
    const totalPlaces = (places.exact || 0) + imprecisePlaces;

    // Update quality icons with tooltips
    updateQualityIcon('letters-quality-icon', impreciseDates, totalDates, 'mit ungenauem Datum');
    updateQualityIcon('senders-quality-icon', unknownSenders, totalSenders, 'Absender unbekannt oder unvollstaendig');
    updateQualityIcon('places-quality-icon', imprecisePlaces, totalPlaces, 'ohne Koordinaten');
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

    languageKeys.forEach(code => {
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
        container.appendChild(label);
    });

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

    filterGroup.classList.remove('hidden');

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

// Aggregate letters by place_sent for the map; places are keyed with placeKey (ADR-001), so a
// place without GeoNames id still appears when its index entry carries coordinates
function aggregateLettersByPlace(letters, placesIndex) {
    const places = {};

    letters.forEach(letter => {
        const placeId = placeKey(letter.place_sent);
        if (!placeId) return;

        let lat = letter.place_sent.lat;
        let lon = letter.place_sent.lon;

        if (!lat || !lon) {
            const indexedPlace = placesIndex[placeId];
            if (indexedPlace && indexedPlace.lat && indexedPlace.lon) {
                lat = indexedPlace.lat;
                lon = indexedPlace.lon;
            }
        }

        if (!lat || !lon) return;

        if (!places[placeId]) {
            places[placeId] = {
                id: placeId,
                name: letter.place_sent.name,
                lat: lat,
                lon: lon,
                letter_count: 0,
                years: new Set(),
                senderCounts: {},
                languages: new Set(),
                languageCounts: {},
                letterIds: []
            };
        }

        places[placeId].letter_count++;
        places[placeId].letterIds.push(letter.id);
        if (letter.year) places[placeId].years.add(letter.year);
        const senderId = personKey(letter.sender);
        if (senderId) {
            places[placeId].senderCounts[senderId] ??= { count: 0, name: letter.sender.name || senderId };
            places[placeId].senderCounts[senderId].count++;
        }
        if (letter.language?.code) {
            const langCode = letter.language.code;
            places[placeId].languages.add(langCode);
            places[placeId].languageCounts[langCode] = (places[placeId].languageCounts[langCode] || 0) + 1;
        }
    });

    // Convert Sets to arrays and calculate top senders + dominant language
    Object.values(places).forEach(place => {
        place.years = Array.from(place.years).sort();
        place.languages = Array.from(place.languages);
        // Sort senders by letter count (descending), include ID for linking
        place.topSenders = Object.entries(place.senderCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([id, data]) => ({ name: data.name, count: data.count, id }));
        place.senderCount = Object.keys(place.senderCounts).length;

        // Calculate dominant language
        const langEntries = Object.entries(place.languageCounts);
        if (langEntries.length > 0) {
            langEntries.sort((a, b) => b[1] - a[1]);
            place.dominantLanguage = langEntries[0][0];
            place.dominantLanguageCount = langEntries[0][1];
            place.dominantLanguageRatio = langEntries[0][1] / place.letter_count;
        } else {
            place.dominantLanguage = null;
            place.dominantLanguageCount = 0;
            place.dominantLanguageRatio = 0;
        }
    });

    return places;
}

// Map styles
let currentMapStyle = 'dark';

// OpenFreeMap needs no API key; its styles carry the OpenFreeMap/OpenMapTiles/OSM attribution
// (CARTO raster tiles now return an "API key required" placeholder)
const mapStyles = {
    'light': 'https://tiles.openfreemap.org/styles/positron',
    'dark': 'https://tiles.openfreemap.org/styles/dark'
};

function initMap() {
    // Calculate center from data or use Europe default
    let center = [10, 50];
    const placesWithCoords = Object.values(placeAggregation);
    if (placesWithCoords.length > 0) {
        const avgLon = placesWithCoords.reduce((sum, p) => sum + p.lon, 0) / placesWithCoords.length;
        const avgLat = placesWithCoords.reduce((sum, p) => sum + p.lat, 0) / placesWithCoords.length;
        center = [avgLon, avgLat];
    }

    map = new maplibregl.Map({
        container: 'map',
        style: mapStyles[currentMapStyle],
        center: center,
        zoom: 4,
        locale: {
            'Map.Title': 'Karte der Absendeorte',
            'NavigationControl.ZoomIn': 'Hineinzoomen',
            'NavigationControl.ZoomOut': 'Herauszoomen',
            'NavigationControl.ResetBearing': 'Nach Norden ausrichten'
        }
    });

    // top-left, because the layer and colour buttons (.map-controls) sit top-right
    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    // Fallback without the basemap service: a plain background keeps the place markers usable
    let usingFallbackStyle = false;
    map.on('error', () => {
        if (mapInitialized || usingFallbackStyle || map.isStyleLoaded()) return;
        usingFallbackStyle = true;
        const background = cssToken('--color-bg-light');
        map.setStyle({
            version: 8,
            sources: {},
            layers: [{ id: 'background', type: 'background', paint: { 'background-color': background } }]
        });
        showToast('Grundkarte nicht erreichbar, Orte werden ohne Kartenhintergrund gezeigt');
    });

    map.on('load', () => {
        renderPlaceMarkers(placeAggregation);
        updateLayerSwitcherButton(currentMapStyle);
        mapInitialized = true;
        updateMapLegend();
    });

    // Layer switcher button
    const layerSwitcherBtn = elements.getById('layer-switcher');
    if (layerSwitcherBtn) {
        layerSwitcherBtn.addEventListener('click', () => {
            currentMapStyle = (currentMapStyle === 'light') ? 'dark' : 'light';
            setMapStyle(currentMapStyle);
        });
    }

    // Color mode toggle button
    const colorToggleBtn = elements.mapColorToggle;
    if (colorToggleBtn) {
        colorToggleBtn.addEventListener('click', toggleMapColorMode);
    }
}

function setMapStyle(styleKey) {
    const styleUrl = mapStyles[styleKey];
    if (!styleUrl) return;

    // setStyle replaces the whole style, so the data sources and their layers are carried over
    map.setStyle(styleUrl, {
        transformStyle: (previous, next) => {
            if (!previous) return next;
            const ownSources = Object.keys(previous.sources).filter(id => !(id in next.sources));
            return {
                ...next,
                sources: {
                    ...next.sources,
                    ...Object.fromEntries(ownSources.map(id => [id, previous.sources[id]]))
                },
                layers: [...next.layers, ...previous.layers.filter(layer => ownSources.includes(layer.source))]
            };
        }
    });

    updateLayerSwitcherButton(styleKey);
}

function updateLayerSwitcherButton(styleKey) {
    const layerSwitcherBtn = elements.getById('layer-switcher');
    if (layerSwitcherBtn) {
        layerSwitcherBtn.innerHTML = (styleKey === 'light') ? '<i class="fas fa-moon" aria-hidden="true"></i>' : '<i class="fas fa-sun" aria-hidden="true"></i>';
        layerSwitcherBtn.title = (styleKey === 'light') ? 'Dunklen Kartenlayer aktivieren' : 'Hellen Kartenlayer aktivieren';
    }
}

// Convert place aggregation to GeoJSON
function placesToGeoJSON(places) {
    const features = [];

    Object.values(places).forEach(place => {
        // Get color for dominant language
        const langColor = place.dominantLanguage
            ? (LANGUAGE_COLORS[place.dominantLanguage] || LANGUAGE_COLORS['other'])
            : LANGUAGE_COLORS['other'];

        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [place.lon, place.lat]
            },
            properties: {
                id: place.id,
                name: place.name,
                letter_count: place.letter_count,
                sender_count: place.senderCount,
                language_count: place.languages.length,
                year_min: place.years.length > 0 ? Math.min(...place.years) : null,
                year_max: place.years.length > 0 ? Math.max(...place.years) : null,
                top_senders: JSON.stringify(place.topSenders),
                languages: place.languages.join(', '),
                dominant_language: place.dominantLanguage || 'other',
                dominant_language_ratio: place.dominantLanguageRatio || 0,
                language_color: langColor
            }
        });
    });

    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Render place markers on map
function renderPlaceMarkers(places) {
    const geojson = placesToGeoJSON(places);

    if (map.getSource('places')) {
        log.render(`Updating data: ${geojson.features.length} places`);
        map.getSource('places').setData(geojson);
    } else {
        log.render(`Creating source: ${geojson.features.length} places`);
        map.addSource('places', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: MAP_DEFAULTS.clusterMaxZoom,
            clusterRadius: MAP_DEFAULTS.clusterRadius,
            clusterProperties: {
                'total_letters': ['+', ['get', 'letter_count']]
            }
        });
    }

    if (!map.getLayer('places-clusters')) {
        addMapLayers();
    }

    if (!handlersSetup) {
        setupEventHandlers();
        handlersSetup = true;
    }
}

// Add map layers
function addMapLayers() {
    const primary = cssToken('--color-primary');
    const outline = cssToken('--color-bg');

    // Cluster layer - always uniform color (clusters mix languages)
    map.addLayer({
        id: 'places-clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': primary,
            'circle-radius': [
                'step',
                ['get', 'total_letters'],
                15,
                50, 20,
                200, 25,
                500, 30,
                1000, 35
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': outline
        }
    });

    // Cluster count label
    map.addLayer({
        id: 'places-cluster-count',
        type: 'symbol',
        source: 'places',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Noto Sans Regular'],
            'text-size': 12
        },
        paint: {
            'text-color': outline
        }
    });

    // Individual place markers - color by language or uniform
    map.addLayer({
        id: 'places-layer',
        type: 'circle',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': getMapCircleColorExpression(),
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'letter_count'],
                1, 6,
                10, 10,
                50, 14,
                200, 18,
                500, 22
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': outline,
            'circle-opacity': 0.85
        }
    });
}

// Get the circle color expression based on current color mode
function getMapCircleColorExpression() {
    if (mapColorMode === 'uniform') {
        return cssToken('--color-primary');
    }

    // Build dynamic match expression based on available languages
    const defaultColor = LANGUAGE_COLORS['other'] || LANGUAGE_COLORS[NO_LANGUAGE];
    const matchExpr = ['match', ['get', 'dominant_language']];

    // Add only defined language colors (skip undefined values)
    Object.entries(LANGUAGE_COLORS).forEach(([lang, color]) => {
        if (lang !== 'other' && color) {
            matchExpr.push(lang, color);
        }
    });

    // Default fallback (required by MapLibre match expression)
    matchExpr.push(defaultColor);

    return matchExpr;
}

// Update map marker colors when color mode changes
function updateMapColors() {
    if (!map || !map.getLayer('places-layer')) return;

    map.setPaintProperty('places-layer', 'circle-color', getMapCircleColorExpression());
    updateMapLegend();
}

// Toggle map color mode
function toggleMapColorMode() {
    mapColorMode = (mapColorMode === 'language') ? 'uniform' : 'language';
    updateMapColors();

    // The accessible name stays "Nach Sprache einfärben", aria-pressed carries the state
    const btn = elements.mapColorToggle;
    if (btn) {
        const byLanguage = mapColorMode === 'language';
        btn.setAttribute('aria-pressed', String(byLanguage));
        btn.innerHTML = byLanguage ? '<i class="fas fa-palette" aria-hidden="true"></i>' : '<i class="fas fa-circle" aria-hidden="true"></i>';
        btn.title = byLanguage ? 'Einheitliche Farbe verwenden' : 'Nach Sprache einfärben';
    }
}

// Update the map legend based on current data and color mode
function updateMapLegend() {
    const legend = elements.mapLegend;
    const legendItems = legend?.querySelector('.map-legend-items');
    if (!legend || !legendItems) return;

    // Hide legend in uniform mode
    if (mapColorMode === 'uniform') {
        legend.classList.add('hidden');
        return;
    }

    legend.classList.remove('hidden');

    // Count places per dominant language
    const langCounts = {};
    Object.values(placeAggregation).forEach(place => {
        const lang = place.dominantLanguage || 'other';
        if (!langCounts[lang]) {
            langCounts[lang] = { places: 0, letters: 0 };
        }
        langCounts[lang].places++;
        langCounts[lang].letters += place.letter_count;
    });

    // Sort by letter count
    const sortedLangs = Object.entries(langCounts)
        .sort((a, b) => b[1].letters - a[1].letters)
        .slice(0, 8); // Show top 8 languages

    // Build legend HTML
    let html = '';
    for (const [lang, counts] of sortedLangs) {
        const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS['other'];
        const label = languageLabel(lang);
        html += `
            <div class="map-legend-item">
                <span class="map-legend-color" style="background-color: ${color}"></span>
                <span class="map-legend-label">${escapeHtml(label)}</span>
                <span class="map-legend-count">${counts.places}</span>
            </div>
        `;
    }

    legendItems.innerHTML = html;
}

// Setup event handlers
function setupEventHandlers() {
    // Click on individual place
    map.on('click', 'places-layer', (e) => {
        const props = e.features[0].properties;
        showPlacePopup(e.lngLat, props);
    });

    // Click on cluster
    map.on('click', 'places-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['places-clusters'] });
        if (!features.length) return;

        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource('places');

        source.getClusterExpansionZoom(clusterId)
            .then(zoom => {
                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            });
    });

    // Hover effects
    map.on('mouseenter', 'places-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'places-layer', () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'places-clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'places-clusters', () => {
        map.getCanvas().style.cursor = '';
    });
}

// Show popup for a place
function showPlacePopup(lngLat, props) {
    const yearRange = props.year_min && props.year_max
        ? `${props.year_min}–${props.year_max}`
        : 'unbekannt';

    // Basket toggle state
    const placeId = props.id;
    const inBasket = basketIsInBasket('places', placeId);

    // Parse top senders from JSON - make them clickable
    let topSendersHtml = '';
    if (props.top_senders) {
        try {
            const topSenders = JSON.parse(props.top_senders);
            if (topSenders.length > 0) {
                const senderItems = topSenders.map(s => {
                    const personId = s.id || '';
                    if (personId) {
                        return `<li><a href="#" class="popup-person-link" data-person-id="${escapeHtml(personId)}">${escapeHtml(s.name)}</a> <span class="popup-sender-count">(${s.count})</span></li>`;
                    }
                    return `<li>${escapeHtml(s.name)} <span class="popup-sender-count">(${s.count})</span></li>`;
                }).join('');
                const moreText = props.sender_count > 5 ? `<li class="popup-more">... und ${props.sender_count - 5} weitere</li>` : '';
                topSendersHtml = `
                    <div class="popup-top-senders">
                        <p class="popup-label">Top Absender:</p>
                        <ul>${senderItems}${moreText}</ul>
                    </div>
                `;
            }
        } catch (e) {
            // Fallback if JSON parsing fails
        }
    }

    const html = `
        <div class="popup popup-place" data-place-id="${escapeHtml(placeId)}">
            <div class="popup-header">
                <h3>${escapeHtml(props.name)}</h3>
                <button type="button" class="popup-basket-toggle ${inBasket ? 'in-basket' : ''}"
                        data-type="places" data-id="${escapeHtml(placeId)}"
                        aria-label="Ort im Wissenskorb" aria-pressed="${inBasket}"
                        title="${inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufuegen'}">
                    <i class="fas fa-star" aria-hidden="true"></i>
                </button>
            </div>
            <div class="popup-stats">
                <p><strong>${props.letter_count}</strong> Briefe von ${props.sender_count} Absendern</p>
                <p class="popup-year-range">${yearRange}</p>
                ${topSendersHtml}
                ${props.languages ? `<p class="popup-languages"><small>Sprachen: ${escapeHtml(props.languages)}</small></p>` : ''}
            </div>
            <div class="popup-actions">
                <button type="button" class="popup-action-btn popup-show-letters" data-place-id="${escapeHtml(placeId)}">
                    <i class="fas fa-envelope" aria-hidden="true"></i> Briefe anzeigen
                </button>
            </div>
        </div>
    `;

    const popup = new maplibregl.Popup()
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map);

    // Setup event handlers after popup is added to DOM
    setupPopupEventHandlers(popup);
}

// Setup event handlers for place popup
function setupPopupEventHandlers(popup) {
    const popupEl = popup.getElement();
    if (!popupEl) return;

    // Basket toggle
    const basketBtn = popupEl.querySelector('.popup-basket-toggle');
    if (basketBtn) {
        basketBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBasketButton(basketBtn, basketBtn.dataset.type, basketBtn.dataset.id);
        });
    }

    // Show letters button
    const showLettersBtn = popupEl.querySelector('.popup-show-letters');
    if (showLettersBtn) {
        showLettersBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const placeId = showLettersBtn.dataset.placeId;
            popup.remove();
            applyPlaceFilter(placeId);
            switchView('letters');
        });
    }

    // Clickable person links
    const personLinks = popupEl.querySelectorAll('.popup-person-link');
    personLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const personId = link.dataset.personId;
            popup.remove();
            applyPersonFilter(personId);
            switchView('letters');
        });
    });
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

    state.updateFilters(filterUpdates);
    filteredLetters = state.getFilteredLetters();
    allLetters = state.getAllLetters();

    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});
    state.data.placeAggregation = placeAggregation;

    if (map && map.loaded() && mapInitialized) {
        renderPlaceMarkers(placeAggregation);
        updateMapLegend();
    }

    updateFilterCounts();
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
    selectedPersonId = personId;
    applyFilters();
}

function clearPersonFilter() {
    selectedPersonId = null;
    applyFilters();
}

// Goes through the state manager like the other filters, so every view and the reset button see it
function applyPlaceFilter(placeId) {
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
    return Boolean(f.temporal || f.languages || f.person || f.place || f.subject ||
        f.quality?.preciseDates || f.quality?.knownPersons || f.quality?.locatedPlaces);
}

// Views whose button marks active filters: letters and map, and the views without sidebar,
// where the filters themselves are not visible
const FILTER_INDICATOR_VIEWS = ['letters', 'map', 'chronik', 'activity', 'comparison'];

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
        if (personKey(letter.recipient) === key) return letter.recipient.name || key;
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

const FILTER_BADGE_ORDER = ['person-filter-display', 'place-filter-display', 'subject-filter-display'];

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
}

// Language counts under all other active filters, so each checkbox shows what selecting it would add
function updateFilterCounts() {
    const languageCounts = {};
    state.filterLetters({ ...state.filters, languages: null }).forEach(letter => {
        const code = letter.language?.code || NO_LANGUAGE;
        languageCounts[code] = (languageCounts[code] || 0) + 1;
    });

    document.querySelectorAll('input[name="language"]').forEach(cb => {
        const el = document.getElementById(`count-lang-${cb.value}`);
        if (el) el.textContent = `(${languageCounts[cb.value] || 0})`;
    });
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

    // Redraw the markers on the existing map; initMap would create a second map instance
    if (availableViews.map?.available && map && mapInitialized) {
        renderPlaceMarkers(placeAggregation);
        updateMapLegend();
    }
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
}

function updateUrlState() {
    const urlParams = new URLSearchParams(window.location.search);
    const newParams = state.toURLParams();

    // Keep the parameters that select the dataset, so a reload or shared link still loads it
    for (const key of ['dataset', 'json', 'demo']) {
        const value = urlParams.get(key);
        if (value) newParams.set(key, value);
    }

    const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
}

// View switching

function initViewSwitcher() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
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
        case 'map': map?.resize(); break;
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

    renderView(view);
}

// Persons list

let personsSortOrder = 'letters-desc';
let personsSearchTerm = '';

function initPersonsView() {
    const searchInput = elements.personSearch;
    const sortSelect = elements.personSort;

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            personsSearchTerm = e.target.value.toLowerCase();
            renderPersonsList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            personsSortOrder = e.target.value;
            renderPersonsList();
        });
    }
}

/**
 * Render the Overview view with statistics and recommendations
 */
function renderOverview() {
    const meta = state.getMeta();
    if (!meta) return;
    const totalLetters = allLetters.length;
    // Counted from the letters with personKey and placeKey like the lists and research paths,
    // because the HSA index leaves out persons without authority id
    const corpus = summarizeCorpus(allLetters, dataIndices);

    // Update title
    const titleEl = document.getElementById('overview-title');
    if (titleEl) {
        titleEl.textContent = meta.title || 'Datensatz';
    }

    // Update inline stats: Briefe | Zeitraum | Personen | Orte
    const statsInlineEl = document.getElementById('overview-stats-inline');
    if (statsInlineEl) {
        const minYear = meta.date_range?.min;
        const maxYear = meta.date_range?.max;
        statsInlineEl.innerHTML = `
            <span class="stat-item"><i class="fas fa-envelope" aria-hidden="true"></i> <span class="stat-value">${totalLetters.toLocaleString('de-DE')}</span> Briefe</span>
            ${minYear && maxYear ? `<span class="stat-item"><i class="fas fa-calendar" aria-hidden="true"></i> <span class="stat-value">${minYear}–${maxYear}</span></span>` : ''}
            <span class="stat-item"><i class="fas fa-users" aria-hidden="true"></i> <span class="stat-value">${corpus.persons.size.toLocaleString('de-DE')}</span> Personen</span>
            <span class="stat-item"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> <span class="stat-value">${corpus.places.size.toLocaleString('de-DE')}</span> Orte</span>
        `;
    }

    // Update source info: Quelle | Lizenz
    const sourceInlineEl = document.getElementById('overview-source-inline');
    if (sourceInlineEl) {
        const parts = [];

        // Check for JSON format (teiHeader) vs cmif-parser format
        const teiHeader = meta.teiHeader || {};
        const hasJsonFormat = Object.keys(teiHeader).length > 0;

        // Source/Publisher
        const publisherValue = hasJsonFormat
            ? teiHeader.publisher
            : (meta.publishers?.map(p => p.name).join(', ') || null);
        if (publisherValue) {
            parts.push(escapeHtml(publisherValue));
        }

        // Licence, with the change note a preprocessed dataset carries (CC BY requires indicating changes)
        if (hasJsonFormat && teiHeader.licence) {
            parts.push(externalLink(teiHeader.licenceTarget, teiHeader.licence));
        } else if (meta.licence?.text) {
            parts.push(externalLink(meta.licence.url, meta.licence.text));
        }
        if (meta.modifications) {
            parts.push(`<details class="source-modifications"><summary>Bearbeitet</summary>${escapeHtml(meta.modifications)}</details>`);
        }

        // CMIF URL
        const cmifUrl = safeUrl(hasJsonFormat ? teiHeader.cmifUrl : meta.cmifUrl);
        if (cmifUrl) {
            parts.push(externalLink(cmifUrl, 'CMIF'));
        }

        sourceInlineEl.innerHTML = parts.length > 0
            ? parts.join(' <span class="source-sep">|</span> ')
            : '';
    }

    // Calculate quality metrics from the letters, since parser and preprocessing
    // name their uncertainty summaries differently
    // Date quality (day precision, as in the header quality icons)
    const preciseDates = allLetters.filter(l => l.datePrecision === 'day').length;
    const dateQuality = totalLetters > 0 ? Math.round((preciseDates / totalLetters) * 100) : 0;

    // Person quality (identified with authority refs)
    const persons = countIdentifiedPersons(allLetters);
    const personQuality = persons.total > 0 ? Math.round((persons.identified / persons.total) * 100) : 0;

    // Place quality (georeferenced)
    const geoPlaces = [...corpus.places.values()].filter(p => p.located).length;
    const placeQuality = corpus.places.size > 0 ? Math.round((geoPlaces / corpus.places.size) * 100) : 0;

    // Update quality chips
    updateQualityChip('quality-chip-dates', `${dateQuality}% Datiert`);
    updateQualityChip('quality-chip-persons', `${personQuality}% Identifiziert`);
    updateQualityChip('quality-chip-places', `${placeQuality}% Georeferenziert`);

    // Setup entry point buttons
    setupEntryPointButtons();

    // Show/hide tutorial button based on dataset
    const tutorialBtn = document.getElementById('start-tutorial-btn');
    if (tutorialBtn) {
        const urlParams = new URLSearchParams(window.location.search);
        const isDemo = urlParams.get('demo') === 'true';
        if (isDemo) {
            tutorialBtn.classList.remove('hidden');
            // Setup click handler (once)
            if (!tutorialBtn.dataset.listenerAdded) {
                tutorialBtn.addEventListener('click', () => {
                    // Clear the "completed" flag so tour can restart
                    sessionStorage.removeItem('ce-demo-tour-completed');
                    startTour();
                });
                tutorialBtn.dataset.listenerAdded = 'true';
            }
        } else {
            tutorialBtn.classList.add('hidden');
        }
    }

    renderOverviewPaths();
}

/**
 * Write the label of a data-situation chip. The chips stay neutral, without a
 * traffic-light colour, because they describe partner data without rating it (ADR-005).
 */
function updateQualityChip(chipId, label) {
    const spanEl = document.getElementById(chipId)?.querySelector('span');
    if (spanEl) spanEl.textContent = label;
}

/**
 * Setup entry point button click handlers (called once on init)
 */
let entryPointsInitialized = false;
function setupEntryPointButtons() {
    if (entryPointsInitialized) return;
    entryPointsInitialized = true;

    document.querySelectorAll('.entry-point-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.target) switchView(btn.dataset.target);
        });
    });
}

// Research paths of the overview (US-33), analysed by research-paths.js from all letters
function renderOverviewPaths() {
    const container = document.getElementById('overview-questions-grid');
    if (!container) return;
    renderOverviewResearchPaths(container, document.getElementById('show-all-paths-btn'),
        analyzeResearchQuestions(allLetters, dataIndices), {
            onStartPath: startKnowledgePath,
            onStepClick: switchView
        });
}

function renderPersonsList() {
    const container = elements.personsList;
    if (!container) return;

    // Persons of the filtered letters, keyed with personKey (ADR-001)
    const personsMap = {};
    const count = (person, role) => {
        const key = personKey(person);
        if (!key || !person.name) return;
        personsMap[key] ??= {
            key,
            name: person.name,
            id: person.id,
            authority: person.authority,
            precision: person.precision,
            sent: 0,
            received: 0
        };
        personsMap[key][role]++;
    };
    filteredLetters.forEach(letter => {
        count(letter.sender, 'sent');
        count(letter.recipient, 'received');
    });

    let persons = Object.values(personsMap);

    if (personsSearchTerm) {
        persons = persons.filter(p => p.name.toLowerCase().includes(personsSearchTerm));
    }

    persons.sort((a, b) => {
        const totalA = a.sent + a.received;
        const totalB = b.sent + b.received;

        switch (personsSortOrder) {
            case 'letters-desc': return totalB - totalA;
            case 'letters-asc': return totalA - totalB;
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'name-desc': return b.name.localeCompare(a.name);
            default: return 0;
        }
    });

    if (persons.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" aria-hidden="true"></i>
                <p>Keine Korrespondenten gefunden</p>
            </div>
        `;
        return;
    }

    let enrichmentData = {};
    try {
        enrichmentData = JSON.parse(sessionStorage.getItem('person-enrichment') || '{}') || {};
    } catch {
        // Unreadable enrichment cache: the list shows no Wikidata markers
    }

    // The card is no button: filtering, basket, details and correspSearch are separate controls
    container.innerHTML = persons.map(person => {
        const initials = getPersonInitials(person.name, person.precision);
        const total = person.sent + person.received;
        const correspSearchUrl = buildCorrespSearchUrl(person);
        const precisionClass = getPersonPrecisionClass(person.precision);
        const hasWikidataEnrichment = enrichmentData[person.key]?.source === 'wikidata';
        const name = escapeHtml(person.name);

        const wikidataIndicator = hasWikidataEnrichment ? `
            <span class="wikidata-indicator" title="Wikidata-Anreicherung" role="img" aria-label="Wikidata-Anreicherung">
                <svg viewBox="0 0 30 20" width="14" height="10" aria-hidden="true">
                    <rect fill="#990000" width="6" height="20"/>
                    <rect fill="#339966" x="8" width="6" height="20"/>
                    <rect fill="#006699" x="16" width="6" height="20"/>
                </svg>
            </span>
        ` : '';

        return `
            <div class="person-card ${precisionClass}" data-id="${escapeHtml(person.key)}" data-name="${name}">
                <div class="person-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
                <div class="person-info">
                    <div class="person-name" title="${name}"><button type="button" class="person-filter-btn" data-id="${escapeHtml(person.key)}" title="Briefe von ${name} anzeigen">${name}</button>${wikidataIndicator}</div>
                    <div class="person-stats">
                        <span><i class="fas fa-paper-plane" aria-hidden="true"></i> ${person.sent} gesendet</span>
                        <span><i class="fas fa-inbox" aria-hidden="true"></i> ${person.received} empfangen</span>
                    </div>
                </div>
                <div class="person-actions">
                    <button type="button" class="btn-person-basket" data-person-id="${escapeHtml(person.key)}"
                            title="${total} Briefe zum Korb hinzufuegen" aria-label="${total} Briefe von ${name} zum Korb hinzufügen">
                        <i class="fas fa-star" aria-hidden="true"></i>
                    </button>
                    ${person.id ? `
                        <button type="button" class="btn-person-info" data-person-id="${escapeHtml(person.key)}"
                                title="Person-Details anzeigen" aria-label="Details zu ${name}">
                            <i class="fas fa-info-circle" aria-hidden="true"></i>
                        </button>
                    ` : ''}
                    ${correspSearchUrl ? `
                        <a href="${escapeHtml(correspSearchUrl)}" target="_blank" rel="noopener noreferrer" class="btn-correspsearch"
                           title="Weitere Briefe bei correspSearch suchen" aria-label="${name} bei correspSearch suchen">
                            <i class="fas fa-search" aria-hidden="true"></i>
                        </a>
                    ` : ''}
                    <div class="person-count">${total}</div>
                </div>
            </div>
        `;
    }).join('');

    const filterTo = (personId) => {
        if (!personId) return;
        applyPersonFilter(personId);
        switchView('letters');
    };

    // The name button is the keyboard control; a click on the card surface does the same
    container.querySelectorAll('.person-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            filterTo(card.dataset.id);
        });
    });
    container.querySelectorAll('.person-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterTo(btn.dataset.id));
    });

    container.querySelectorAll('.btn-person-info').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.dataset.personId) showPersonDetail(btn.dataset.personId);
        });
    });

    container.querySelectorAll('.btn-person-basket').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = btn.dataset.personId;
            if (!personId) return;
            const personLetterIds = filteredLetters
                .filter(l => personKey(l.sender) === personId || personKey(l.recipient) === personId)
                .map(l => l.id);
            showToast(addLettersToBasket(personLetterIds));
        });
    });
}

// Letters list

let lettersSortOrder = 'date-desc';
let lettersSearchTerm = '';

function initLettersView() {
    const searchInput = elements.letterSearch;
    const sortSelect = elements.letterSort;

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            lettersSearchTerm = e.target.value.toLowerCase();
            renderLettersList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            lettersSortOrder = e.target.value;
            renderLettersList();
        });
    }
}

// Date order with undated letters last in both directions (they have no place on the time axis)
function compareByDate(a, b, direction) {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return direction * a.date.localeCompare(b.date);
}

const BASKET_LABELS = {
    letters: { one: 'Brief', limit: `höchstens ${BASKET_LIMITS.maxLetters} Briefe` },
    persons: { one: 'Person', limit: `höchstens ${BASKET_LIMITS.maxPersons} Personen` },
    places: { one: 'Ort', limit: `höchstens ${BASKET_LIMITS.maxPlaces} Orte` }
};

/**
 * Toggle one basket entry from a star button. A full basket leaves the entry out and says so,
 * instead of marking it as added. Returns whether the entry is in the basket afterwards.
 */
function toggleBasketButton(btn, type, id, { pressed = true } = {}) {
    const labels = BASKET_LABELS[type];
    if (basketIsInBasket(type, id)) {
        basketRemove(type, id);
        showToast(`${labels.one} aus dem Korb entfernt`);
    } else {
        const result = basketAdd(type, id);
        if (result !== true) {
            showToast(result === 'full' ? `Korb voll: ${labels.limit}` : `${labels.one} nicht hinzugefügt`);
            return false;
        }
        showToast(`${labels.one} zum Korb hinzugefügt`);
    }
    const inBasket = basketIsInBasket(type, id);
    btn.classList.toggle('in-basket', inBasket);
    btn.title = inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufuegen';
    if (pressed) btn.setAttribute('aria-pressed', String(inBasket));
    return inBasket;
}

function renderLettersList() {
    const container = elements.lettersList;
    if (!container) return;

    let letters = [...filteredLetters];

    if (lettersSearchTerm) {
        letters = letters.filter(l =>
            (l.sender?.name || '').toLowerCase().includes(lettersSearchTerm) ||
            (l.recipient?.name || '').toLowerCase().includes(lettersSearchTerm) ||
            (l.place_sent?.name || '').toLowerCase().includes(lettersSearchTerm)
        );
    }

    letters.sort((a, b) => {
        switch (lettersSortOrder) {
            case 'date-desc': return compareByDate(a, b, -1);
            case 'date-asc': return compareByDate(a, b, 1);
            case 'sender-asc': return (a.sender?.name || '').localeCompare(b.sender?.name || '');
            default: return 0;
        }
    });

    // Limit to first 500 for performance
    const displayLetters = letters.slice(0, 500);

    if (displayLetters.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope" aria-hidden="true"></i>
                <p>Keine Briefe gefunden</p>
            </div>
        `;
        return;
    }

    container.innerHTML = displayLetters.map((letter, index) => {
        const senderName = formatPersonName(letter.sender?.name, letter.sender?.precision);
        const recipientName = formatPersonName(letter.recipient?.name, letter.recipient?.precision);
        const date = formatDateWithPrecision(letter);
        const placeName = formatPlaceName(letter.place_sent?.name, letter.place_sent?.precision);
        const language = letter.language?.label || '';
        const dateClass = getDatePrecisionClass(letter.datePrecision, letter.dateCertainty);
        const inBasket = basketIsInBasket('letters', letter.id);
        const detailsId = `letter-details-${index}`;

        const hasDetails = letter.mentions?.subjects?.length > 0 ||
                          letter.mentions?.persons?.length > 0 ||
                          letter.mentions?.places?.length > 0 ||
                          letter.sender?.id ||
                          letter.recipient?.id;

        // The participants are the expand button; the star stays a sibling control (no nesting)
        const participants = `
            ${hasDetails ? '<i class="fas fa-chevron-right expand-icon" aria-hidden="true"></i>' : ''}
            ${senderName}
            <span class="letter-arrow" role="img" aria-label="an"><i class="fas fa-arrow-right" aria-hidden="true"></i></span>
            ${recipientName}
        `;

        return `
            <div class="letter-card ${hasDetails ? 'has-details' : ''}" data-id="${escapeHtml(letter.id || '')}">
                <div class="letter-header">
                    ${hasDetails
                        ? `<button type="button" class="letter-participants letter-toggle" aria-expanded="false" aria-controls="${detailsId}">${participants}</button>`
                        : `<div class="letter-participants">${participants}</div>`}
                    <div class="letter-header-actions">
                        <div class="letter-date ${dateClass}">${date}</div>
                        <button type="button" class="btn-letter-basket ${inBasket ? 'in-basket' : ''}"
                                data-letter-id="${escapeHtml(letter.id || '')}"
                                aria-label="Im Wissenskorb" aria-pressed="${inBasket}"
                                title="${inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufuegen'}">
                            <i class="fas fa-star" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
                <div class="letter-meta">
                    ${placeName ? `<span><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${placeName}</span>` : ''}
                    ${language ? `<span><i class="fas fa-language" aria-hidden="true"></i> ${escapeHtml(language)}</span>` : ''}
                    ${safeUrl(letter.url) ? `<span><a href="${escapeHtml(safeUrl(letter.url))}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt" aria-hidden="true"></i> Quelle</a></span>` : ''}
                </div>
                ${hasDetails ? `<div class="letter-details hidden" id="${detailsId}">${buildLetterDetails(letter)}</div>` : ''}
            </div>
        `;
    }).join('');

    if (letters.length > 500) {
        container.insertAdjacentHTML('beforeend', `
            <div class="empty-state">
                <p>Zeige 500 von ${letters.length} Briefen. Nutzen Sie die Suche oder Filter.</p>
            </div>
        `);
    }

    // The toggle button and a click on the card surface expand the inline details
    container.querySelectorAll('.letter-card.has-details').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, .btn-letter-basket')) return;
            toggleLetterExpand(card);
        });
    });

    container.querySelectorAll('.btn-letter-basket').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.dataset.letterId) toggleBasketButton(btn, 'letters', btn.dataset.letterId);
        });
    });
}

function toggleLetterExpand(card) {
    const details = card.querySelector('.letter-details');
    const icon = card.querySelector('.expand-icon');
    const expand = !card.classList.contains('expanded');
    card.classList.toggle('expanded', expand);
    card.querySelector('.letter-toggle')?.setAttribute('aria-expanded', String(expand));
    details?.classList.toggle('hidden', !expand);
    icon?.classList.replace(expand ? 'fa-chevron-right' : 'fa-chevron-down', expand ? 'fa-chevron-down' : 'fa-chevron-right');
}

// Inline letter details: persons with authority links, mentions, correspSearch links
function buildLetterDetails(letter) {
    let html = '<div class="letter-detail-content">';

    html += '<div class="letter-detail-persons">';
    html += `<span class="detail-person"><strong>Von:</strong> ${buildPersonLink(letter.sender)}</span>`;
    html += `<span class="detail-person"><strong>An:</strong> ${buildPersonLink(letter.recipient)}</span>`;
    html += '</div>';

    const mentionGroups = [
        ['Themen', letter.mentions?.subjects, s => s.label],
        ['Personen', letter.mentions?.persons, p => p.name],
        ['Orte', letter.mentions?.places, p => p.name]
    ];
    for (const [label, items, text] of mentionGroups) {
        if (!items?.length) continue;
        html += `<div class="letter-detail-mentions"><strong>${label}:</strong> `;
        html += items.map(item => `<span class="mention-tag">${escapeHtml(text(item))}</span>`).join(' ');
        html += '</div>';
    }

    html += '<div class="letter-detail-links">';
    const senderCorrespUrl = buildCorrespSearchUrl(letter.sender);
    const recipientCorrespUrl = buildCorrespSearchUrl(letter.recipient);
    if (senderCorrespUrl) {
        html += correspSearchLink(senderCorrespUrl, letter.sender.name, 'detail-link');
    }
    if (recipientCorrespUrl && letter.recipient?.name !== letter.sender?.name) {
        html += correspSearchLink(recipientCorrespUrl, letter.recipient.name, 'detail-link');
    }
    html += '</div>';
    html += '</div>';

    return html;
}

function correspSearchLink(url, name, className) {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="${className}" title="Briefe von ${escapeHtml(name)} bei correspSearch">
        <i class="fas fa-search" aria-hidden="true"></i> ${escapeHtml(name)} bei correspSearch
    </a>`;
}

// Letter detail modal

function detailRow(label, valueHtml, valueClass = '') {
    return `<div class="letter-detail-row">
        <span class="letter-detail-label">${label}</span>
        <span class="letter-detail-value ${valueClass}">${valueHtml}</span>
    </div>`;
}

function showLetterDetail(letterId) {
    const letter = allLetters.find(l => l.id === letterId);
    if (!letter) return;

    const modal = elements.getById('letter-modal');
    const title = elements.getById('letter-modal-title');
    const body = elements.getById('letter-modal-body');

    if (!modal || !body) return;

    const sender = letter.sender?.name || 'Unbekannt';
    const recipient = letter.recipient?.name || 'Unbekannt';
    title.textContent = `${sender} an ${recipient}`;

    let html = '<div class="letter-detail">';

    html += '<div class="letter-detail-section">';
    html += '<h4>Grunddaten</h4>';
    // Date with its precision marker, as in the list (ADR-002)
    html += detailRow('Datum', formatDateWithPrecision(letter), getDatePrecisionClass(letter.datePrecision, letter.dateCertainty));
    html += detailRow('Absender', buildPersonLink(letter.sender));
    html += detailRow('Empfaenger', buildPersonLink(letter.recipient));
    if (letter.place_sent?.name) {
        html += detailRow('Absendeort', buildPlaceLink(letter.place_sent));
    }
    if (letter.language?.label) {
        html += detailRow('Sprache', escapeHtml(letter.language.label));
    }
    html += '</div>';

    const mentionSections = [
        ['Erwaehnte Themen', letter.mentions?.subjects, s => escapeHtml(s.label)],
        ['Erwaehnte Personen', letter.mentions?.persons, p => buildPersonLink(p)],
        ['Erwaehnte Orte', letter.mentions?.places, p => buildPlaceLink(p)]
    ];
    for (const [heading, items, render] of mentionSections) {
        if (!items?.length) continue;
        html += `<div class="letter-detail-section"><h4>${heading}</h4><div class="letter-detail-tags">`;
        html += items.map(item => `<span class="letter-detail-tag">${render(item)}</span>`).join('');
        html += '</div></div>';
    }

    html += '<div class="letter-detail-actions">';
    if (safeUrl(letter.url)) {
        html += `<a href="${escapeHtml(safeUrl(letter.url))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            <i class="fas fa-external-link-alt" aria-hidden="true"></i> Zur Quelle
        </a>`;
    }
    const inBasket = basketIsInBasket('letters', letter.id);
    html += `<button type="button" class="btn btn-basket ${inBasket ? 'in-basket' : ''}" data-letter-id="${escapeHtml(letter.id)}">
        <i class="fas fa-star" aria-hidden="true"></i> <span class="btn-basket-label">${inBasket ? 'Im Korb' : 'Zum Korb'}</span>
    </button>`;
    const senderKey = personKey(letter.sender);
    if (senderKey) {
        html += `<button type="button" class="btn btn-secondary btn-filter-person" data-person-id="${escapeHtml(senderKey)}">
            <i class="fas fa-filter" aria-hidden="true"></i> Briefe von ${escapeHtml(letter.sender.name || 'Absender')}
        </button>`;
    }

    const senderCorrespUrl = buildCorrespSearchUrl(letter.sender);
    const recipientCorrespUrl = buildCorrespSearchUrl(letter.recipient);
    if (senderCorrespUrl || recipientCorrespUrl) {
        html += '<div class="corresp-search-links">';
        if (senderCorrespUrl) html += correspSearchLink(senderCorrespUrl, letter.sender.name, 'btn btn-corresp');
        if (recipientCorrespUrl) html += correspSearchLink(recipientCorrespUrl, letter.recipient.name, 'btn btn-corresp');
        html += '</div>';
    }
    html += '</div>';
    html += '</div>';

    body.innerHTML = html;
    body.querySelector('.btn-filter-person')?.addEventListener('click', (e) => {
        filterByPerson(e.currentTarget.dataset.personId);
    });

    const basketBtn = body.querySelector('.btn-basket[data-letter-id]');
    basketBtn?.addEventListener('click', () => {
        // The visible label carries the state, so no aria-pressed here
        const nowInBasket = toggleBasketButton(basketBtn, 'letters', basketBtn.dataset.letterId, { pressed: false });
        basketBtn.querySelector('.btn-basket-label').textContent = nowInBasket ? 'Im Korb' : 'Zum Korb';
    });

    openModal(modal);
}

// Counts opened person dialogs, so a Wikidata answer for an earlier person is dropped
let personDetailRequest = 0;

// Show person detail modal. Wikidata is queried only on an explicit click (ADR-006),
// enrichment already consented to during upload is read from sessionStorage.
function showPersonDetail(personId) {
    // Parser indices are keyed with personKey, the HSA index with the VIAF id
    let person = dataIndices.persons?.[personId];
    if (!person) {
        person = Object.values(dataIndices.persons || {}).find(p =>
            p.viaf === personId || p.id === personId || p.name === personId
        );
    }
    if (!person) return;

    const modal = elements.getById('person-modal');
    const title = elements.getById('person-modal-title');
    const body = elements.getById('person-modal-body');
    if (!modal || !body) return;

    const ref = personAuthority(person);
    const authority = ref?.authority || null;
    const authorityId = ref?.id || null;
    const canEnrich = Boolean(ref && ['gnd', 'viaf'].includes(authority));

    let cached = null;
    if (canEnrich) {
        try {
            cached = JSON.parse(sessionStorage.getItem('person-enrichment') || '{}')[authorityId] || null;
        } catch {
            // Unreadable cache: the dialog offers the explicit Wikidata request instead
        }
    }

    const request = ++personDetailRequest;
    const detail = { person, personId, authority, authorityId, canEnrich, modal, body, request };
    title.textContent = person.name;
    renderPersonDetail(detail, cached);
    openModal(modal);
}

async function loadPersonEnrichment(detail, button) {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lade Daten von Wikidata...';
    let enriched = null;
    let failed = false;
    try {
        enriched = await enrichPerson(detail.authority, detail.authorityId);
    } catch (error) {
        // enrichPerson throws only when the request fails; null means Wikidata has no entry
        failed = true;
        console.warn('Wikidata request failed:', error);
    }
    if (detail.request !== personDetailRequest) return;
    if (enriched) {
        renderPersonDetail(detail, enriched);
    } else {
        const status = failed
            ? 'Wikidata nicht erreichbar. Bitte später erneut versuchen.'
            : 'Kein Wikidata-Eintrag gefunden.';
        button.outerHTML = `<p class="person-enrich-status" tabindex="-1">${status}</p>`;
    }
    // The clicked button is gone after re-rendering; keep keyboard focus inside the dialog
    (detail.body.querySelector('.person-enrich-status') || detail.modal.querySelector('.modal-close'))?.focus();
}

function renderPersonDetail(detail, enriched) {
    const { person, personId, authority, authorityId, canEnrich, modal, body } = detail;

    let html = '<div class="person-detail">';

    html += '<div class="person-detail-header">';
    if (enriched?.thumbnail && safeUrl(enriched.thumbnail)) {
        html += `<img class="person-detail-image" src="${escapeHtml(safeUrl(enriched.thumbnail))}" alt="${escapeHtml(person.name)}">`;
    } else {
        html += `<div class="person-detail-avatar" aria-hidden="true">${escapeHtml(getPersonInitials(person.name, person.precision))}</div>`;
    }
    html += '<div class="person-detail-info">';
    html += `<h3>${escapeHtml(enriched?.name || person.name)}</h3>`;

    if (enriched) {
        html += `<div class="wikidata-badge" title="Daten angereichert via Wikidata">
            <svg class="wikidata-logo" viewBox="0 0 30 20" width="16" height="11" aria-hidden="true">
                <rect fill="#990000" width="6" height="20"/>
                <rect fill="#339966" x="8" width="6" height="20"/>
                <rect fill="#006699" x="16" width="6" height="20"/>
            </svg>
            <span>Wikidata</span>
        </div>`;
        if (enriched.description) {
            html += `<div class="person-description">${escapeHtml(enriched.description)}</div>`;
        }
        const lifeDates = formatLifeDates(enriched);
        const places = formatPlaces(enriched);
        if (lifeDates) {
            html += `<div class="person-life-dates"><i class="fas fa-calendar" aria-hidden="true"></i> ${escapeHtml(lifeDates)}</div>`;
        }
        if (places) {
            html += `<div class="person-places"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${escapeHtml(places)}</div>`;
        }
        if (enriched.professions?.length > 0) {
            html += `<div class="person-professions"><i class="fas fa-briefcase" aria-hidden="true"></i> ${escapeHtml(enriched.professions.slice(0, 3).join(', '))}</div>`;
        }
    } else if (canEnrich) {
        html += `<button type="button" class="btn btn-secondary person-enrich-btn">
            <i class="fas fa-cloud-download-alt" aria-hidden="true"></i> Lebensdaten von Wikidata laden
        </button>`;
    }
    html += '</div></div>';

    const authorityHref = authorityUrl(authority, authorityId);
    if (enriched) {
        const externalLinks = buildExternalLinks(enriched);
        if (externalLinks) {
            html += '<div class="person-detail-section">';
            html += '<h4>Externe Links</h4>';
            html += `<div class="person-detail-links">${externalLinks}</div>`;
            html += '</div>';
        }
    } else if (authorityHref) {
        html += '<div class="person-detail-section">';
        html += '<h4>Externe Links</h4>';
        html += `<div class="person-detail-links"><a href="${escapeHtml(authorityHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(authority.toUpperCase())}</a></div>`;
        html += '</div>';
    }

    // Letters of this person, matched with personKey like the person filter (ADR-001)
    const personLetterIds = allLetters
        .filter(l => personKey(l.sender) === personId || personKey(l.recipient) === personId)
        .map(l => l.id);

    html += '<div class="person-detail-actions">';

    const correspSearchUrl = buildCorrespSearchUrl(person);
    if (correspSearchUrl) {
        html += `<a href="${escapeHtml(correspSearchUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            <i class="fas fa-search" aria-hidden="true"></i> Bei correspSearch suchen
        </a>`;
    }

    html += `<button type="button" class="btn btn-basket person-add-basket-btn">
        <i class="fas fa-star" aria-hidden="true"></i> ${personLetterIds.length} Briefe zum Korb
    </button>`;

    html += `<button type="button" class="btn btn-secondary btn-filter-person" data-person-id="${escapeHtml(personId)}">
        <i class="fas fa-filter" aria-hidden="true"></i> Briefe filtern
    </button>`;

    html += '</div></div>';

    body.innerHTML = html;
    body.querySelector('.person-enrich-btn')?.addEventListener('click', (e) => {
        loadPersonEnrichment(detail, e.currentTarget);
    });
    body.querySelector('.btn-filter-person').addEventListener('click', (e) => {
        closeModal(modal);
        filterByPerson(e.currentTarget.dataset.personId);
    });
    // The letter ids stay in this closure instead of a JSON attribute in the markup
    body.querySelector('.person-add-basket-btn').addEventListener('click', () => {
        showToast(addLettersToBasket(personLetterIds));
    });
}

// Page of a person at the authority (VIAF or GND), or null for other systems
function authorityUrl(authority, id) {
    if (!id) return null;
    if (authority === 'viaf') return `https://viaf.org/viaf/${encodeURIComponent(id)}`;
    if (authority === 'gnd') return `https://d-nb.info/gnd/${encodeURIComponent(id)}`;
    return null;
}

// correspSearch search for a person; the API accepts GND and VIAF URIs as correspondent
function buildCorrespSearchUrl(person) {
    const ref = personAuthority(person);
    if (!ref) return null;

    let authorityUri = null;
    if (ref.authority === 'gnd') authorityUri = `http://d-nb.info/gnd/${ref.id}`;
    if (ref.authority === 'viaf') authorityUri = `http://viaf.org/viaf/${ref.id}`;

    return authorityUri
        ? `https://correspsearch.net/search.xql?correspondent=${encodeURIComponent(authorityUri)}`
        : null;
}

// Person name, linked to its authority page when it has one
function buildPersonLink(person) {
    if (!person) return 'Unbekannt';
    const name = escapeHtml(person.name);
    const ref = personAuthority(person);
    const url = ref && authorityUrl(ref.authority, ref.id);
    return url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="In ${escapeHtml(ref.authority.toUpperCase())} ansehen">${name}</a>`
        : name;
}

// Place name, linked to GeoNames when it has an id
function buildPlaceLink(place) {
    if (!place) return 'Unbekannt';
    const name = escapeHtml(place.name);
    return place.geonames_id
        ? `<a href="https://www.geonames.org/${encodeURIComponent(place.geonames_id)}" target="_blank" rel="noopener noreferrer" title="In GeoNames ansehen">${name}</a>`
        : name;
}

function filterByPerson(personId) {
    const modal = elements.getById('letter-modal');
    if (modal) closeModal(modal);

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
                : `${filteredLetters.length.toLocaleString('de-DE')} Briefe werden exportiert`;
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
                downloadFile(lettersToJson(filteredLetters), 'korrespondenz.json', 'application/json');
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
