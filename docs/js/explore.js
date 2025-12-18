// Explore View - Generic CMIF visualization
// Displays data from sessionStorage (uploaded/loaded via upload.js)

import { LANGUAGE_COLORS, LANGUAGE_LABELS, UI_DEFAULTS, MAP_DEFAULTS, NETWORK_DEFAULTS, computeLanguageColors } from './constants.js';
import { initBasketUI } from './basket-ui.js';
import {
    isInBasket as basketIsInBasket,
    addToBasket as basketAdd,
    removeFromBasket as basketRemove,
    toggleBasketItem as basketToggle,
    getBasketCounts,
    clearBasket as basketClear,
    onBasketChange,
    getBasketItems
} from './basket.js';
import { enrichPerson, formatLifeDates, formatPlaces, buildExternalLinks } from './wikidata-enrichment.js';
import { debounce, escapeHtml } from './utils.js';
import {
    formatDateWithPrecision,
    formatSingleDate,
    formatPersonName,
    formatPlaceName,
    getDatePrecisionClass,
    getPersonPrecisionClass,
    getPlacePrecisionClass,
    getPersonInitials
} from './formatters.js';
import { checkAndStartDemoTour } from './demo-tour.js';
import { state } from './state-manager.js';
import { elements, initDOMCache } from './dom-cache.js';

const IS_PRODUCTION = true;

// DEPRECATED: Moved to state-manager.js
// These variables are kept temporarily for backward compatibility
// TODO: Remove after full migration
let map;  // Still used directly, not in state
let allLetters = [];  // Use: state.getAllLetters()
let filteredLetters = [];  // Use: state.getFilteredLetters()
let placeAggregation = {};  // Use: state.getPlaceAggregation()
let dataIndices = {};  // Use: state.getIndices()
let dataMeta = {};  // Use: state.getMeta()
let temporalFilter = null;  // Use: state.filters.temporal
let dateRange = { min: 1800, max: 2000 };  // Use: state.ui.dateRange

// Quality filter state - Use: state.filters.quality
let qualityFilter = {
    preciseDates: false,
    knownPersons: false,
    locatedPlaces: false
};

// Track state
let handlersSetup = false;
let mapInitialized = false;  // Use: state.mapInitialized

// Topics view state - Use: state.ui.*
let subjectIndex = {};
let selectedSubjectId = null;  // Use: state.ui.selectedTopicId
let topicsSearchTerm = '';  // Use: state.ui.topicsSearchTerm
let topicsSortOrder = 'count-desc';  // Use: state.ui.topicsSortOrder

// Places view state - Use: state.ui.*
let placesIndex = {};
let selectedPlaceId = null;  // Use: state.ui.selectedPlaceId
let placesSearchTerm = '';  // Use: state.ui.placesSearchTerm
let placesSortOrder = 'count-desc';  // Use: state.ui.placesSortOrder

// Mentions Flow view state - Use: state.ui.*
let mentionedPersonsIndex = new Map();
let selectedMentionsPerson = null;  // Currently selected person for mentions view

// Logging utility
const log = {
    init: (msg) => !IS_PRODUCTION && console.log(`[INIT] ${msg}`),
    render: (msg) => !IS_PRODUCTION && console.log(`[RENDER] ${msg}`),
    event: (msg) => !IS_PRODUCTION && console.log(`[EVENT] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

// Map marker color - Rust Red from logo (tokens.css --color-primary)
const PRIMARY_COLOR = '#A64B3F';

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
    const hasLanguages = allLetters.some(l => l.language?.code);

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
        }
    };

    log.init(`Available views: ${Object.entries(availableViews).filter(([k, v]) => v.available).map(([k]) => k).join(', ')}`);
    return availableViews;
}

// Update view buttons based on availability
function updateViewButtons() {
    const viewButtons = document.querySelectorAll('.view-btn');

    viewButtons.forEach(btn => {
        const view = btn.dataset.view;
        const viewInfo = availableViews[view];

        if (viewInfo) {
            if (viewInfo.available) {
                btn.style.display = '';
                btn.disabled = false;
                btn.title = '';
            } else {
                btn.style.display = 'none';
                btn.disabled = true;
                btn.title = viewInfo.reason;
            }
        }
    });

}

// Update sidebar data coverage details
function updateDataCoverageDetails() {
    const container = elements.dataCoverageDetails;
    if (!container) return;

    // Calculate data coverage
    const coordCount = Object.keys(placeAggregation).length;
    const totalPlaces = Object.keys(dataIndices.places || {}).length;
    const missingCount = totalPlaces - coordCount;
    const hasLanguages = allLetters.some(l => l.language?.code);
    const hasSubjects = allLetters.some(l => l.mentions?.subjects?.length > 0);
    const hasAuthorityIds = allLetters.some(l =>
        l.sender?.authority || l.recipient?.authority
    );

    // Count languages
    const languageSet = new Set();
    allLetters.forEach(l => {
        if (l.language?.code) languageSet.add(l.language.code);
    });

    // Count subjects
    const subjectSet = new Set();
    allLetters.forEach(l => {
        l.mentions?.subjects?.forEach(s => subjectSet.add(s.name || s));
    });

    // Build compact info lines
    const lines = [];

    // Geo data - always show with link to missing places
    if (totalPlaces > 0) {
        let geoLine = `<div class="dataset-coverage-item"><i class="fas fa-map-marker-alt"></i> ${coordCount}/${totalPlaces} Orte verortet`;
        if (missingCount > 0) {
            geoLine += ` <a href="#" id="show-missing-places" class="missing-places-link" title="Liste der Orte ohne Koordinaten">(${missingCount} ohne Geodaten)</a>`;
        }
        geoLine += '</div>';
        lines.push(geoLine);
    }

    // Languages - only if present
    if (hasLanguages) {
        lines.push(`<div class="dataset-coverage-item"><i class="fas fa-language"></i> ${languageSet.size} Sprache(n)</div>`);
    }

    // Subjects - only if present
    if (hasSubjects) {
        lines.push(`<div class="dataset-coverage-item"><i class="fas fa-tags"></i> ${subjectSet.size} Themen</div>`);
    }

    // Authority IDs - only if present
    if (hasAuthorityIds) {
        lines.push(`<div class="dataset-coverage-item"><i class="fas fa-fingerprint"></i> Authority-IDs</div>`);
    }

    // Show what's NOT in the data (compact)
    const missing = [];
    if (!hasLanguages) missing.push('Sprachen');
    if (!hasSubjects) missing.push('Themen');
    if (!hasAuthorityIds) missing.push('Authority-IDs');

    if (missing.length > 0) {
        lines.push(`<div class="dataset-coverage-item muted"><i class="fas fa-minus"></i> Ohne: ${missing.join(', ')}</div>`);
    }

    container.innerHTML = lines.join('');

    // Re-attach missing places link handler
    const missingLink = container.querySelector('#show-missing-places');
    if (missingLink) {
        missingLink.addEventListener('click', (e) => {
            e.preventDefault();
            showMissingPlacesModal();
        });
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
    log.init('Starting CorrespExplorer');

    // Initialize DOM Cache
    initDOMCache();
    log.init('DOM Cache initialized');

    try {
        const data = await loadData();

        if (!data) {
            // No data available, redirect to index
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

        // Keep backward-compatible references (TODO: Remove after full migration)
        allLetters = data.letters || [];
        filteredLetters = allLetters;
        dataIndices = data.indices || {};
        dataMeta = data.meta || {};

        log.init('State Manager initialized with data');

        // Compute dynamic language colors based on data distribution
        computeLanguageColors(allLetters);

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

        // Build mentions index
        mentionedPersonsIndex = buildMentionedPersonsIndex(allLetters);
        log.init(`Built mentions index: ${mentionedPersonsIndex.size} persons mentioned`);

        // Detect available views based on data
        detectAvailableViews();

        // Read URL state before UI init
        initUrlState();

        // Check if URL-requested view is available, otherwise use first available
        if (!availableViews[currentView]?.available) {
            currentView = getFirstAvailableView();
        }

        updateUI(data);
        log.init(`Loaded ${allLetters.length} letters, ${Object.keys(placeAggregation).length} places with coordinates`);

        // Update view buttons based on data availability
        updateViewButtons();

        // Update data coverage details in sidebar
        updateDataCoverageDetails();

        initMap();
        initFilters();
        initTopicsQuickFilter();
        initViewSwitcher();
        initPersonsView();
        initLettersView();
        initTimeline();
        initTopicsView();
        initPlacesView();
        initNetworkView();
        initMentionsFlowView();
        initChronikView();
        initExport();
        initMissingPlacesModal();
        initBasketUI(dataIndices, allLetters);

        // Setup Knowledge Path handlers and load existing session
        setupKnowledgePathHandlers();
        loadKnowledgePath();

        // Store data in sessionStorage for wissenskorb.js
        try {
            sessionStorage.setItem('correspData', JSON.stringify({
                letters: allLetters,
                indices: dataIndices,
                meta: dataMeta
            }));
        } catch (e) {
            // sessionStorage may be full or unavailable
            console.warn('Could not store data in sessionStorage for Wissenskorb');
        }

        // Apply initial view (use detected first available if map not available)
        switchView(currentView);

        // Apply person filter from URL
        if (selectedPersonId) {
            applyPersonFilter(selectedPersonId);
        }

        // Apply subject filter from URL
        if (selectedSubjectId) {
            applySubjectFilter(selectedSubjectId);
        }

        hideLoading();
        log.init('Application ready');

        // Check if demo dataset and show tour
        checkAndStartDemoTour();
    } catch (error) {
        showError('Initialisierung fehlgeschlagen: ' + error.message);
        log.error('Init failed: ' + error.message);
        hideLoading();
    }
}

// Load data from sessionStorage or URL parameter
async function loadData() {
    // Check for direct JSON URL parameter (for large preprocessed datasets)
    const params = new URLSearchParams(window.location.search);
    const jsonUrl = params.get('json');

    if (jsonUrl) {
        try {
            log.init(`Loading JSON from URL: ${jsonUrl}`);
            const response = await fetch(jsonUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            data.sourceInfo = {
                type: 'preprocessed',
                source: jsonUrl,
                isDemo: params.get('demo') === 'true'
            };
            return data;
        } catch (e) {
            log.error(`Failed to load JSON from ${jsonUrl}: ${e.message}`);
        }
    }

    // Try sessionStorage
    const storedData = sessionStorage.getItem('cmif-data');
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch (e) {
            log.error('Failed to parse stored data');
        }
    }

    // Nothing in storage - redirect will happen
    return null;
}

// Update UI with data info
function updateUI(data) {
    // Update navbar title
    const titleEl = elements.datasetTitle;
    if (titleEl && data.meta?.title) {
        titleEl.textContent = data.meta.title;
        document.title = `${data.meta.title} - CorrespExplorer`;
    }

    // Update stats
    const totalLetters = elements.totalLettersCount;
    const totalSenders = elements.totalSendersCount;
    const totalPlacesEl = elements.totalPlacesCount;

    if (totalLetters) totalLetters.textContent = (data.meta?.total_letters || allLetters.length).toLocaleString('de-DE');
    if (totalSenders) totalSenders.textContent = (data.meta?.unique_senders || Object.keys(dataIndices.persons || {}).length).toLocaleString('de-DE');
    if (totalPlacesEl) totalPlacesEl.textContent = (data.meta?.unique_places || Object.keys(dataIndices.places || {}).length).toLocaleString('de-DE');

    // Update uncertainty statistics if available
    updateUncertaintyStats(data.meta?.uncertainty);

    // Build language filter
    buildLanguageFilter();
}


// Format licence text for display
function formatLicence(licence) {
    if (!licence) return '';

    const text = licence.text || '';
    const url = licence.url || '';

    // Detect common licence types
    if (url.includes('publicdomain/zero') || text.includes('CC0')) {
        return 'CC0';
    } else if (url.includes('by-sa/4.0') || text.includes('CC BY-SA 4.0')) {
        return 'CC BY-SA 4.0';
    } else if (url.includes('by/4.0') || text.includes('CC BY 4.0')) {
        return 'CC BY 4.0';
    } else if (url.includes('by-nc/4.0') || text.includes('CC BY-NC 4.0')) {
        return 'CC BY-NC 4.0';
    } else if (text.length > 20) {
        return text.substring(0, 20) + '...';
    }

    return text || 'Lizenz';
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
    updateQualityIcon('senders-quality-icon', unknownSenders, totalSenders, 'unbekannt/unvollstaendig');
    updateQualityIcon('places-quality-icon', imprecisePlaces, totalPlaces, 'ohne Koordinaten');
}

// Update quality icon visibility and tooltip
function updateQualityIcon(iconId, count, total, label) {
    const iconEl = document.getElementById(iconId);
    if (!iconEl) return;

    if (count === 0) {
        iconEl.style.display = 'none';
        return;
    }

    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    iconEl.title = `${count} ${label} (${percentage}%)`;
    iconEl.style.display = 'inline';
}

// Build language filter checkboxes dynamically
function buildLanguageFilter() {
    const languages = dataIndices.languages || {};
    const languageKeys = Object.keys(languages);

    if (languageKeys.length === 0) {
        return;
    }

    const container = elements.languageCheckboxes;
    const filterGroup = elements.languageFilterGroup;

    if (!container || !filterGroup) return;

    // Sort by letter count
    languageKeys.sort((a, b) => languages[b].letter_count - languages[a].letter_count);

    // Take top 10 languages
    const topLanguages = languageKeys.slice(0, 10);

    topLanguages.forEach(code => {
        const lang = languages[code];
        // Use LANGUAGE_LABELS for display, fallback to data label or code
        let displayLabel = LANGUAGE_LABELS[code] || lang.label || code;
        // Handle special cases - None means no language specified in source data
        const isNoLanguage = (displayLabel === 'None' || code === 'None');
        if (isNoLanguage) {
            displayLabel = 'Ohne Angabe';
        }
        const tooltip = isNoLanguage ? 'Keine Sprachzuordnung in den Quelldaten' : '';
        const label = document.createElement('label');
        if (tooltip) {
            label.title = tooltip;
        }
        label.innerHTML = `
            <input type="checkbox" name="language" value="${code}" checked>
            <span>${displayLabel}</span>
            <span class="filter-count" id="count-lang-${code}">(${lang.letter_count})</span>
        `;
        container.appendChild(label);
    });

    filterGroup.style.display = 'block';

    // Add event listeners
    container.querySelectorAll('input[name="language"]').forEach(cb => {
        cb.addEventListener('change', debounce(applyFilters, 300));
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

    filterGroup.style.display = 'block';

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
        const isActive = selectedSubjectId === topic.id;
        return `
            <div class="topic-quick-item ${isActive ? 'active' : ''}" data-topic-id="${escapeHtml(topic.id)}" title="${escapeHtml(topic.label)}">
                <span class="topic-label">${escapeHtml(topic.label)}</span>
                <span class="topic-count">${topic.count}</span>
            </div>
        `;
    }).join('');

    // Show count info
    if (filtered.length > toShow.length) {
        container.innerHTML += `<div class="topics-more-info">${filtered.length - toShow.length} weitere Themen...</div>`;
    }

    // Add click handlers
    container.querySelectorAll('.topic-quick-item').forEach(item => {
        item.addEventListener('click', () => {
            const topicId = item.dataset.topicId;
            const isActive = item.classList.contains('active');

            // Remove active from all
            container.querySelectorAll('.topic-quick-item').forEach(i => i.classList.remove('active'));

            if (isActive) {
                // Clear filter
                clearSubjectFilter();
            } else {
                // Apply filter
                item.classList.add('active');
                applySubjectFilter(topicId);
            }
            updateUrlState();
        });
    });
}

// Update topics quick filter state when subject filter changes
function updateTopicsQuickFilterState() {
    const container = elements.topicsQuickFilter;
    if (!container) return;

    container.querySelectorAll('.topic-quick-item').forEach(item => {
        const topicId = item.dataset.topicId;
        if (selectedSubjectId === topicId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ============================================
// Mentions Flow View - Helper Functions
// ============================================

// Build index of mentioned persons
function buildMentionedPersonsIndex(letters) {
    const mentioned = new Map();

    for (const letter of letters) {
        if (!letter.mentions?.persons) continue;

        for (const person of letter.mentions.persons) {
            const key = person.id || person.name;

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
            entry.mentionedBy.add(letter.sender.id);
            entry.mentionedInLetters.push(letter.id);
        }
    }

    return mentioned;
}

// Classify person as correspondent, mentioned, or both
function classifyPerson(personId, correspondents, mentioned) {
    const isCorrespondent = correspondents.has(personId);
    const isMentioned = mentioned.has(personId);

    if (isCorrespondent && isMentioned) return 'both';
    if (isCorrespondent) return 'correspondent';
    if (isMentioned) return 'mentioned';
    return null;
}

// Build Sankey data structure from mentions
function buildSankeyData(letters, topN = 20, minSenderMentions = 5, minFlowValue = 2) {
    // 1. Aggregiere Mention-Flows
    const flows = new Map(); // key: "senderId→mentionedId", value: count

    for (const letter of letters) {
        if (!letter.mentions?.persons) continue;

        for (const person of letter.mentions.persons) {
            const targetId = person.id || person.name;
            const key = `${letter.sender.id}→${targetId}`;
            flows.set(key, (flows.get(key) || 0) + 1);
        }
    }

    // 2. Finde Top N meist-erwähnte Personen
    const mentionCounts = new Map();
    for (const [flow, count] of flows) {
        const [_, targetId] = flow.split('→');
        mentionCounts.set(targetId, (mentionCounts.get(targetId) || 0) + count);
    }

    const topMentioned = Array.from(mentionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([id]) => id);

    if (topMentioned.length === 0) {
        return { nodes: [], links: [] };
    }

    // 3. Berechne Sender-Statistiken (wie viele top-mentioned persons erwähnt jeder Sender?)
    const senderStats = new Map();
    for (const [flow, count] of flows) {
        const [sourceId, targetId] = flow.split('→');

        if (!topMentioned.includes(targetId)) continue;

        if (!senderStats.has(sourceId)) {
            senderStats.set(sourceId, {
                totalMentions: 0,
                uniqueTargets: new Set()
            });
        }

        const stats = senderStats.get(sourceId);
        stats.totalMentions += count;
        stats.uniqueTargets.add(targetId);
    }

    // 4. Baue Nodes - nur Sender mit genug Mentions
    const nodeSet = new Set();
    const nodes = [];

    for (const [flow, count] of flows) {
        const [sourceId, targetId] = flow.split('→');

        if (!topMentioned.includes(targetId)) continue;
        if (count < minFlowValue) continue;  // Zu schwache Verbindung ignorieren

        // Prüfe ob Sender genug mentions hat
        const senderStat = senderStats.get(sourceId);
        if (!senderStat || senderStat.totalMentions < minSenderMentions) {
            continue;
        }

        // Source node (correspondent)
        if (!nodeSet.has(sourceId)) {
            nodeSet.add(sourceId);
            const sourcePerson = dataIndices.persons?.[sourceId];
            nodes.push({
                id: sourceId,
                name: sourcePerson?.name || sourceId,
                column: 0  // Linke Spalte
            });
        }

        // Target node (mentioned)
        if (!nodeSet.has(targetId)) {
            nodeSet.add(targetId);
            const targetPerson = mentionedPersonsIndex.get(targetId);
            const displayName = targetPerson?.name || dataIndices.persons?.[targetId]?.name || targetId;
            nodes.push({
                id: targetId,
                name: displayName,
                column: 1  // Rechte Spalte
            });
        }
    }

    // 5. Baue Links - nur für verbleibende Nodes
    const links = [];
    for (const [flow, count] of flows) {
        const [sourceId, targetId] = flow.split('→');

        if (!topMentioned.includes(targetId)) continue;
        if (count < minFlowValue) continue;

        const sourceIndex = nodes.findIndex(n => n.id === sourceId);
        const targetIndex = nodes.findIndex(n => n.id === targetId);

        if (sourceIndex !== -1 && targetIndex !== -1) {
            links.push({
                source: sourceIndex,
                target: targetIndex,
                value: count
            });
        }
    }

    log.render(`Built Sankey data: ${nodes.length} nodes, ${links.length} links (filtered: topN=${topN}, minSenderMentions=${minSenderMentions}, minFlowValue=${minFlowValue})`);
    return { nodes, links };
}

// Aggregate letters by place_sent for map visualization
function aggregateLettersByPlace(letters, placesIndex) {
    const places = {};

    letters.forEach(letter => {
        if (!letter.place_sent) return;

        const placeId = letter.place_sent.geonames_id;
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
        if (letter.sender?.name) {
            const senderName = letter.sender.name;
            const senderId = letter.sender.authority || letter.sender.name;
            if (!places[placeId].senderCounts[senderName]) {
                places[placeId].senderCounts[senderName] = { count: 0, id: senderId };
            }
            places[placeId].senderCounts[senderName].count++;
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
            .map(([name, data]) => ({ name, count: data.count, id: data.id }));
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

const mapStyles = {
    'light': {
        name: 'CartoDB Positron',
        url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    },
    'dark': {
        name: 'CartoDB Dark Matter',
        url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }
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
        style: {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {},
            layers: []
        },
        center: center,
        zoom: 4
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
        renderPlaceMarkers(placeAggregation);
        setMapStyle(currentMapStyle);
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
    const style = mapStyles[styleKey];
    if (!style) return;

    if (map.getLayer('base-tiles-layer')) {
        map.removeLayer('base-tiles-layer');
    }
    if (map.getSource('base-tiles')) {
        map.removeSource('base-tiles');
    }

    map.addSource('base-tiles', {
        type: 'raster',
        tiles: [style.url],
        tileSize: 256,
        attribution: style.attribution
    });

    map.addLayer({
        id: 'base-tiles-layer',
        type: 'raster',
        source: 'base-tiles',
        minzoom: 0,
        maxzoom: 19
    }, 'places-clusters');

    const layerSwitcherBtn = elements.getById('layer-switcher');
    if (layerSwitcherBtn) {
        layerSwitcherBtn.innerHTML = (styleKey === 'light') ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
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
    // Cluster layer - always uniform color (clusters mix languages)
    map.addLayer({
        id: 'places-clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': PRIMARY_COLOR,
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
            'circle-stroke-color': '#ffffff'
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
            'text-color': '#ffffff'
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
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.85
        }
    });
}

// Get the circle color expression based on current color mode
function getMapCircleColorExpression() {
    if (mapColorMode === 'uniform') {
        return PRIMARY_COLOR;
    }

    // Build dynamic match expression based on available languages
    const defaultColor = LANGUAGE_COLORS['other'] || LANGUAGE_COLORS['None'] || '#78716c';
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

    // Update button state
    const btn = elements.mapColorToggle;
    if (btn) {
        if (mapColorMode === 'language') {
            btn.innerHTML = '<i class="fas fa-palette"></i>';
            btn.title = 'Einheitliche Farbe verwenden';
        } else {
            btn.innerHTML = '<i class="fas fa-circle"></i>';
            btn.title = 'Nach Sprache einfaerben';
        }
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
        const label = LANGUAGE_LABELS[lang] || lang;
        html += `
            <div class="map-legend-item">
                <span class="map-legend-color" style="background-color: ${color}"></span>
                <span class="map-legend-label">${label}</span>
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
    const inBasket = isInBasket('places', placeId);

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
                <button class="popup-basket-toggle ${inBasket ? 'in-basket' : ''}"
                        data-type="places" data-id="${escapeHtml(placeId)}"
                        title="${inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufuegen'}">
                    <i class="fas fa-star"></i>
                </button>
            </div>
            <div class="popup-stats">
                <p><strong>${props.letter_count}</strong> Briefe von ${props.sender_count} Absendern</p>
                <p class="popup-year-range">${yearRange}</p>
                ${topSendersHtml}
                ${props.languages ? `<p class="popup-languages"><small>Sprachen: ${props.languages}</small></p>` : ''}
            </div>
            <div class="popup-actions">
                <button class="popup-action-btn popup-show-letters" data-place-id="${escapeHtml(placeId)}">
                    <i class="fas fa-envelope"></i> Briefe anzeigen
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
            const type = basketBtn.dataset.type;
            const id = basketBtn.dataset.id;
            const nowInBasket = toggleBasketItem(type, id);
            basketBtn.classList.toggle('in-basket', nowInBasket);
            basketBtn.title = nowInBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufuegen';
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

    if (!yearRangeSlider) {
        log.init('Filter elements not found, skipping filter init');
        return;
    }

    const debouncedApply = debounce(applyFilters, 300);

    // Year range slider
    if (typeof noUiSlider !== 'undefined' && dateRange.min < dateRange.max) {
        noUiSlider.create(yearRangeSlider, {
            start: [dateRange.min, dateRange.max],
            connect: true,
            step: 1,
            range: { 'min': dateRange.min, 'max': dateRange.max },
            format: {
                to: value => Math.round(value),
                from: value => Number(value)
            }
        });

        yearRangeSlider.noUiSlider.on('update', (values) => {
            const startYear = parseInt(values[0]);
            const endYear = parseInt(values[1]);
            if (yearRangeText) {
                yearRangeText.textContent = `${startYear} - ${endYear}`;
            }
            const isDefaultRange = startYear === dateRange.min && endYear === dateRange.max;
            temporalFilter = isDefaultRange ? null : { start: startYear, end: endYear };
            debouncedApply();
        });

        if (yearRangeText) {
            yearRangeText.textContent = `${dateRange.min} - ${dateRange.max}`;
        }
    } else if (yearRangeText) {
        yearRangeText.textContent = `${dateRange.min} - ${dateRange.max}`;
    }

    // Quality filter checkboxes
    const preciseDatesCheckbox = elements.filterPreciseDates;
    const knownPersonsCheckbox = elements.filterKnownPersons;
    const locatedPlacesCheckbox = elements.filterLocatedPlaces;

    if (preciseDatesCheckbox) {
        preciseDatesCheckbox.checked = qualityFilter.preciseDates;
        preciseDatesCheckbox.addEventListener('change', () => {
            qualityFilter.preciseDates = preciseDatesCheckbox.checked;
            applyFilters();
        });
    }
    if (knownPersonsCheckbox) {
        knownPersonsCheckbox.checked = qualityFilter.knownPersons;
        knownPersonsCheckbox.addEventListener('change', () => {
            qualityFilter.knownPersons = knownPersonsCheckbox.checked;
            applyFilters();
        });
    }
    if (locatedPlacesCheckbox) {
        locatedPlacesCheckbox.checked = qualityFilter.locatedPlaces;
        locatedPlacesCheckbox.addEventListener('change', () => {
            qualityFilter.locatedPlaces = locatedPlacesCheckbox.checked;
            applyFilters();
        });
    }

    // Reset button
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const languageCheckboxes = document.querySelectorAll('input[name="language"]');
            languageCheckboxes.forEach(cb => cb.checked = true);
            if (yearRangeSlider.noUiSlider) {
                yearRangeSlider.noUiSlider.set([dateRange.min, dateRange.max]);
            }
            temporalFilter = null;
            selectedPersonId = null;
            selectedSubjectId = null;

            // Reset quality filters
            qualityFilter = { preciseDates: false, knownPersons: false, locatedPlaces: false };
            if (preciseDatesCheckbox) preciseDatesCheckbox.checked = false;
            if (knownPersonsCheckbox) knownPersonsCheckbox.checked = false;
            if (locatedPlacesCheckbox) locatedPlacesCheckbox.checked = false;

            updateSubjectFilterDisplay();
            applyFilters();
        });
    }
}

// Apply filters and re-render map
function applyFilters() {
    const languageFilters = getCheckedValues('language');

    // Update state with current filters (will trigger getFilteredLetters cache invalidation)
    const filterUpdates = {};

    if (temporalFilter) {
        filterUpdates.temporal = { min: temporalFilter.start, max: temporalFilter.end };
    } else {
        filterUpdates.temporal = null;
    }

    filterUpdates.languages = languageFilters.length > 0 ? languageFilters : [];
    filterUpdates.person = selectedPersonId || null;
    filterUpdates.subject = selectedSubjectId || null;
    filterUpdates.quality = { ...qualityFilter };

    state.updateFilters(filterUpdates);

    // Get filtered letters from state (uses cached filter logic)
    filteredLetters = state.getFilteredLetters();

    // Keep backward compatibility references
    allLetters = state.getAllLetters();

    // Re-aggregate places based on filtered letters
    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});
    state.data.placeAggregation = placeAggregation;

    if (map && map.loaded() && mapInitialized) {
        renderPlaceMarkers(placeAggregation);
        updateMapLegend();
    }

    updateFilterCounts();
    updateUrlState();
    updatePersonFilterDisplay();
    updateFilterIndicators();

    // Re-render active view
    if (currentView === 'topics') {
        renderTopicsList();
    } else if (currentView === 'timeline') {
        renderTimeline();
    } else if (currentView === 'persons') {
        renderPersonsList();
    } else if (currentView === 'letters') {
        renderLettersList();
    } else if (currentView === 'places') {
        renderPlacesList();
    } else if (currentView === 'chronik') {
        renderChronik();
    }
}

// Apply person filter
function applyPersonFilter(personId) {
    log.event(`Applying person filter: ${personId}`);
    selectedPersonId = personId;
    applyFilters();
    log.event(`Filtered letters count: ${filteredLetters.length}`);

    // Update UI to show active filter
    updatePersonFilterDisplay();
    updateFilterIndicators();
}

// Clear person filter
function clearPersonFilter() {
    selectedPersonId = null;
    applyFilters();
    updateFilterIndicators();
}

// Update filter indicators on view buttons
function updateFilterIndicators() {
    const hasActiveFilter = selectedPersonId || selectedSubjectId ||
        qualityFilter.preciseDates || qualityFilter.knownPersons || qualityFilter.locatedPlaces;

    // Update letters button with filter indicator
    const lettersBtn = document.querySelector('[data-view="letters"]');
    if (lettersBtn) {
        let indicator = lettersBtn.querySelector('.filter-indicator');
        if (hasActiveFilter) {
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.className = 'filter-indicator';
                indicator.title = 'Filter aktiv';
                lettersBtn.appendChild(indicator);
            }
        } else if (indicator) {
            indicator.remove();
        }
    }

    // Update map button
    const mapBtn = document.querySelector('[data-view="map"]');
    if (mapBtn) {
        let indicator = mapBtn.querySelector('.filter-indicator');
        if (hasActiveFilter) {
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.className = 'filter-indicator';
                indicator.title = 'Filter aktiv';
                mapBtn.appendChild(indicator);
            }
        } else if (indicator) {
            indicator.remove();
        }
    }

    // Update stats card to show filtered count
    const letterCountEl = elements.getById('letter-count');
    if (letterCountEl && hasActiveFilter) {
        letterCountEl.innerHTML = `${filteredLetters.length} <span class="filtered-indicator">/ ${allLetters.length}</span>`;
    } else if (letterCountEl) {
        letterCountEl.textContent = allLetters.length;
    }
}

// Update person filter display in sidebar
function updatePersonFilterDisplay() {
    let filterDisplay = elements.getById('person-filter-display');

    if (selectedPersonId && filteredLetters.length > 0) {
        // Find person name
        const letter = allLetters.find(l =>
            (l.sender?.id || l.sender?.name) === selectedPersonId ||
            (l.recipient?.id || l.recipient?.name) === selectedPersonId
        );
        const personName = letter?.sender?.id === selectedPersonId || letter?.sender?.name === selectedPersonId
            ? letter.sender.name
            : letter?.recipient?.name || selectedPersonId;

        if (!filterDisplay) {
            // Create filter display element
            const sidebar = document.querySelector('.sidebar');
            const statsCards = document.querySelector('.stats-cards');
            filterDisplay = document.createElement('div');
            filterDisplay.id = 'person-filter-display';
            filterDisplay.className = 'person-filter-active';
            sidebar.insertBefore(filterDisplay, statsCards.nextSibling);
        }

        filterDisplay.innerHTML = `
            <div class="filter-badge">
                <i class="fas fa-user"></i>
                <span>${escapeHtml(personName)}</span>
                <button class="filter-clear" title="Filter entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        filterDisplay.style.display = 'block';

        // Add click handler
        filterDisplay.querySelector('.filter-clear').addEventListener('click', clearPersonFilter);
    } else if (filterDisplay) {
        filterDisplay.style.display = 'none';
    }
}

// Update filter counts based on current filters (excluding language filter)
function updateFilterCounts() {
    // Get current filter state excluding language
    const yearRange = getYearRangeValues();
    const personFilters = selectedPersonId ? [selectedPersonId] : [];
    const topicFilters = selectedSubjectId ? [selectedSubjectId] : [];

    // Filter letters without language constraint to show potential counts
    const lettersWithoutLanguageFilter = allLetters.filter(letter => {
        // Year filter
        if (yearRange) {
            const year = letter.year;
            if (!year || year < yearRange[0] || year > yearRange[1]) return false;
        }

        // Person filter
        if (personFilters.length > 0) {
            const senderId = letter.sender?.id || letter.sender?.name;
            const recipientId = letter.recipient?.id || letter.recipient?.name;
            if (!personFilters.includes(senderId) && !personFilters.includes(recipientId)) return false;
        }

        // Topic filter
        if (topicFilters.length > 0) {
            const subjects = letter.mentions?.subjects || [];
            const hasSubject = subjects.some(s =>
                topicFilters.includes(s.id) || topicFilters.includes(s.label) || topicFilters.includes(s.uri)
            );
            if (!hasSubject) return false;
        }

        return true;
    });

    // Count letters per language in the filtered set
    const languageCounts = {};
    lettersWithoutLanguageFilter.forEach(letter => {
        if (letter.language?.code) {
            languageCounts[letter.language.code] = (languageCounts[letter.language.code] || 0) + 1;
        }
    });

    // Update all language count displays
    const allLanguageCheckboxes = document.querySelectorAll('input[name="language"]');
    allLanguageCheckboxes.forEach(cb => {
        const code = cb.value;
        const el = document.getElementById(`count-lang-${code}`);
        if (el) {
            const count = languageCounts[code] || 0;
            el.textContent = `(${count})`;
        }
    });
}

// Get year range values from slider
function getYearRangeValues() {
    const slider = elements.yearRangeSlider;
    if (slider && slider.noUiSlider) {
        const values = slider.noUiSlider.get();
        return [parseInt(values[0]), parseInt(values[1])];
    }
    return null;
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

function showError(message) {
    console.error(`Error: ${message}`);
    hideLoading();
    // Redirect to index on error
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default 3000)
 */
function showToast(message, duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    });

    // Show with animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    // Auto-hide
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===================
// URL STATE MANAGEMENT
// ===================

function initUrlState() {
    // Read initial state from URL
    const urlParams = new URLSearchParams(window.location.search);

    // View
    const view = urlParams.get('view');
    if (view && ['overview', 'map', 'persons', 'letters', 'timeline', 'topics', 'places', 'network', 'mentions-flow'].includes(view)) {
        currentView = view;
    }

    // Year range
    const yearMin = urlParams.get('yearMin');
    const yearMax = urlParams.get('yearMax');
    if (yearMin && yearMax) {
        temporalFilter = {
            start: parseInt(yearMin),
            end: parseInt(yearMax)
        };
    }

    // Person filter
    const person = urlParams.get('person');
    if (person) {
        selectedPersonId = person;
    }

    // Subject filter
    const subject = urlParams.get('subject');
    if (subject) {
        selectedSubjectId = subject;
    }

    // Languages
    const langs = urlParams.get('langs');
    if (langs) {
        initialLanguageFilter = langs.split(',');
    }

    // Quality filters
    if (urlParams.get('precise') === '1') {
        qualityFilter.preciseDates = true;
    }
    if (urlParams.get('known') === '1') {
        qualityFilter.knownPersons = true;
    }
    if (urlParams.get('located') === '1') {
        qualityFilter.locatedPlaces = true;
    }

}

function updateUrlState() {
    const urlParams = new URLSearchParams(window.location.search);

    // Preserve dataset parameter
    const dataset = urlParams.get('dataset');

    // Get URL params from state-manager
    const newParams = state.toURLParams();

    // Re-add dataset parameter (not part of state)
    if (dataset) newParams.set('dataset', dataset);

    // Add quality filter parameters (custom to this app, not in base state)
    if (qualityFilter.preciseDates) newParams.set('precise', '1');
    if (qualityFilter.knownPersons) newParams.set('known', '1');
    if (qualityFilter.locatedPlaces) newParams.set('located', '1');

    // Update URL without reload
    const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
}

// Variables for URL state
let selectedPersonId = null;
let initialLanguageFilter = null;

// ===================
// VIEW SWITCHING
// ===================

let currentView = 'overview';

function initViewSwitcher() {
    const viewButtons = document.querySelectorAll('.view-btn');

    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
            updateUrlState();
        });
    });
}

function switchView(view) {
    currentView = view;
    state.ui.currentView = view;

    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        const isActive = btn.dataset.view === view;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const viewElement = document.getElementById(`${view}-view`);
    if (viewElement) {
        viewElement.classList.add('active');
    }

    // On overview, chronik, questions, and activity: hide entire sidebar for full-width content
    // On other views: show sidebar with stats and filters
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden', view === 'overview' || view === 'chronik' || view === 'questions' || view === 'activity');
    }

    // Update sidebar legend for current view
    updateSidebarLegend(view);

    // Update view-specific filter controls visibility
    updateViewSpecificFilters(view);

    // Render view-specific content
    if (view === 'overview') {
        renderOverview();
    } else if (view === 'persons') {
        renderPersonsList();
    } else if (view === 'letters') {
        renderLettersList();
    } else if (view === 'timeline') {
        // Always re-render timeline when switching to it (to reflect filters)
        renderTimeline();
    } else if (view === 'topics') {
        renderTopicsList();
    } else if (view === 'places') {
        renderPlacesList();
    } else if (view === 'network') {
        renderNetwork();
    } else if (view === 'mentions-flow') {
        renderMentionsFlow();
    } else if (view === 'chronik') {
        renderChronik();
    } else if (view === 'questions') {
        renderResearchQuestions();
    } else if (view === 'activity') {
        renderActivity();
    } else if (view === 'map' && map) {
        map.resize();
    }
}

// Update sidebar legend based on current view
function updateSidebarLegend(view) {
    // All legend content elements
    const legendElements = {
        map: elements.getById('legend-map'),
        letters: elements.getById('legend-letters'),
        timeline: elements.getById('legend-timeline'),
        persons: elements.getById('legend-persons'),
        topics: elements.getById('legend-topics'),
        places: elements.getById('legend-places'),
        network: elements.getById('legend-network')
    };

    // Hide all legends
    Object.values(legendElements).forEach(el => {
        if (el) el.style.display = 'none';
    });

    // Show view-specific legend
    const targetLegend = legendElements[view];
    if (targetLegend) {
        targetLegend.style.display = 'block';
    } else {
        // Fallback to map legend if no specific legend exists
        if (legendElements.map) legendElements.map.style.display = 'block';
    }
}

// Update view-specific filter controls visibility
function updateViewSpecificFilters(view) {
    // Currently no view-specific sidebar filters
    // Mentions Flow search is now in the main content area
}

// ===================
// PERSONS LIST
// ===================

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
    if (!dataMeta) return;

    const meta = dataMeta;
    const totalLetters = meta.total_letters || 0;

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
        const personCount = Object.keys(dataIndices.persons || {}).length;
        const placeCount = Object.keys(dataIndices.places || {}).length;

        statsInlineEl.innerHTML = `
            <span class="stat-item"><i class="fas fa-envelope"></i> <span class="stat-value">${totalLetters.toLocaleString('de-DE')}</span> Briefe</span>
            ${minYear && maxYear ? `<span class="stat-item"><i class="fas fa-calendar"></i> <span class="stat-value">${minYear}–${maxYear}</span></span>` : ''}
            <span class="stat-item"><i class="fas fa-users"></i> <span class="stat-value">${personCount.toLocaleString('de-DE')}</span> Personen</span>
            <span class="stat-item"><i class="fas fa-map-marker-alt"></i> <span class="stat-value">${placeCount.toLocaleString('de-DE')}</span> Orte</span>
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
            parts.push(publisherValue);
        }

        // Licence
        let licenceText = null;
        if (hasJsonFormat && teiHeader.licence) {
            licenceText = teiHeader.licenceTarget
                ? `<a href="${teiHeader.licenceTarget}" target="_blank" rel="noopener">${teiHeader.licence}</a>`
                : teiHeader.licence;
        } else if (meta.licence?.text) {
            licenceText = meta.licence.url
                ? `<a href="${meta.licence.url}" target="_blank" rel="noopener">${meta.licence.text}</a>`
                : meta.licence.text;
        }
        if (licenceText) {
            parts.push(licenceText);
        }

        // CMIF URL
        const cmifUrl = hasJsonFormat ? teiHeader.cmifUrl : meta.cmifUrl;
        if (cmifUrl) {
            parts.push(`<a href="${cmifUrl}" target="_blank" rel="noopener">CMIF</a>`);
        }

        sourceInlineEl.innerHTML = parts.length > 0
            ? parts.join(' <span class="source-sep">|</span> ')
            : '';
    }

    // Calculate quality metrics
    const quality = meta.uncertainty || {};

    // Date quality (precise dates)
    const preciseDates = totalLetters - (quality.imprecise_dates || 0);
    const dateQuality = totalLetters > 0 ? Math.round((preciseDates / totalLetters) * 100) : 0;

    // Person quality (identified with authority refs)
    const allPersonsSet = allLetters.reduce((set, l) => {
        if (l.sender?.name) set.add(l.sender.id || l.sender.name);
        if (l.recipient?.name) set.add(l.recipient.id || l.recipient.name);
        return set;
    }, new Set());
    const identifiedPersons = allLetters.reduce((set, l) => {
        if (l.sender?.authority || l.sender?.precision === 'identified') {
            set.add(l.sender.id || l.sender.name);
        }
        if (l.recipient?.authority || l.recipient?.precision === 'identified') {
            set.add(l.recipient.id || l.recipient.name);
        }
        return set;
    }, new Set());
    const personQuality = allPersonsSet.size > 0 ? Math.round((identifiedPersons.size / allPersonsSet.size) * 100) : 0;

    // Place quality (georeferenced)
    const places = Object.values(dataIndices.places || {});
    const geoPlaces = places.filter(p => p.lat && p.lon).length;
    const placeQuality = places.length > 0 ? Math.round((geoPlaces / places.length) * 100) : 0;

    // Update quality chips
    updateQualityChip('quality-chip-dates', dateQuality, `${dateQuality}% Datiert`);
    updateQualityChip('quality-chip-persons', personQuality, `${personQuality}% Identifiziert`);
    updateQualityChip('quality-chip-places', placeQuality, `${placeQuality}% Georeferenziert`);

    // Setup entry point buttons
    setupEntryPointButtons();

    // Render research paths in overview (limited)
    renderOverviewResearchPaths();
}

/**
 * Update a quality chip with percentage and class
 */
function updateQualityChip(chipId, percentage, label) {
    const chip = document.getElementById(chipId);
    if (!chip) return;

    const spanEl = chip.querySelector('span');
    if (spanEl) {
        spanEl.textContent = label;
    }

    chip.classList.remove('high', 'medium', 'low');
    if (percentage >= 70) {
        chip.classList.add('high');
    } else if (percentage >= 40) {
        chip.classList.add('medium');
    } else {
        chip.classList.add('low');
    }
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
            const target = btn.dataset.target;
            if (target) {
                switchView(target);
                updateUrlState();
            }
        });
    });
}

/**
 * Update a quality bar with percentage and label
 */
function updateQualityBar(barId, valueId, percentage, count, total) {
    const bar = document.getElementById(barId);
    const value = document.getElementById(valueId);

    if (bar) {
        bar.style.width = `${percentage}%`;
        bar.classList.remove('high', 'medium', 'low');
        if (percentage >= 70) {
            bar.classList.add('high');
        } else if (percentage >= 40) {
            bar.classList.add('medium');
        } else {
            bar.classList.add('low');
        }
    }

    if (value) {
        value.textContent = `${percentage}% (${count}/${total})`;
    }
}

/**
 * Render research paths in the Overview view
 * Uses the same analyzeResearchQuestions() function as the questions view
 * Limited to 4 paths with "show all" button
 */
function renderOverviewResearchPaths() {
    const container = document.getElementById('overview-questions-grid');
    const showAllBtn = document.getElementById('show-all-paths-btn');
    if (!container) return;

    const questions = analyzeResearchQuestions();

    if (questions.length === 0) {
        container.innerHTML = `
            <div class="questions-empty">
                <i class="fas fa-question-circle"></i>
                <p>Keine Forschungspfade verfuegbar.</p>
            </div>
        `;
        if (showAllBtn) showAllBtn.classList.add('hidden');
        return;
    }

    // Only show descriptive and analytical questions (not unanswerable)
    const answerable = questions.filter(q => q.category !== 'unanswerable');

    // Limit to 4 paths for compact overview
    const MAX_PATHS = 4;
    const displayPaths = answerable.slice(0, MAX_PATHS);
    const hasMore = answerable.length > MAX_PATHS;

    // Show/hide "show all" button
    if (showAllBtn) {
        if (hasMore) {
            showAllBtn.classList.remove('hidden');
            showAllBtn.innerHTML = `<i class="fas fa-list"></i> Alle ${answerable.length} Pfade anzeigen`;
            showAllBtn.onclick = () => {
                renderResearchPathCards(container, answerable, questions);
                showAllBtn.classList.add('hidden');
            };
        } else {
            showAllBtn.classList.add('hidden');
        }
    }

    // Render limited cards
    renderResearchPathCards(container, displayPaths, questions);
}

/**
 * Render research path cards (shared by limited and expanded view)
 */
function renderResearchPathCards(container, paths, allQuestions) {
    container.innerHTML = paths.map(q => `
        <div class="question-card question-${q.category}" data-question-id="${q.id}">
            <div class="question-icon">
                <i class="fas ${q.icon || 'fa-question'}"></i>
            </div>
            <div class="question-content">
                <div class="question-text">${q.question}</div>
                <div class="question-path">
                    ${q.path.map((step, i) => `
                        <span class="path-step" data-view="${step.view}" data-step="${i}">
                            <span class="path-step-num">${i + 1}</span>
                            <span class="path-step-label">${step.label}</span>
                        </span>
                        ${i < q.path.length - 1 ? '<span class="path-arrow"><i class="fas fa-chevron-right"></i></span>' : ''}
                    `).join('')}
                </div>
            </div>
            <button class="question-start-btn" title="Wissenspfad starten">
                <i class="fas fa-play"></i>
            </button>
        </div>
    `).join('');

    // Add click handlers for path steps
    container.querySelectorAll('.path-step').forEach(step => {
        step.addEventListener('click', (e) => {
            e.stopPropagation();
            const view = step.dataset.view;
            if (view) {
                switchView(view);
                updateUrlState();
            }
        });
    });

    // Add click handler for start button - starts knowledge path
    container.querySelectorAll('.question-start-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.question-card');
            const questionId = card?.dataset.questionId;
            if (questionId) {
                const question = allQuestions.find(q => q.id === questionId);
                if (question && typeof startKnowledgePath === 'function') {
                    startKnowledgePath(question);
                }
            }
        });
    });

    // Card click also starts knowledge path
    container.querySelectorAll('.question-card').forEach(card => {
        card.addEventListener('click', () => {
            const questionId = card.dataset.questionId;
            const question = allQuestions.find(q => q.id === questionId);
            if (question && typeof startKnowledgePath === 'function') {
                startKnowledgePath(question);
            }
        });
    });
}

/**
 * Setup quick access buttons in overview
 */
function setupQuickAccessButtons() {
    document.querySelectorAll('.quick-access-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target) {
                switchView(target);
                updateUrlState();
            }
        });
    });
}

/**
 * Render metadata section on Overview page
 * Supports both JSON format (teiHeader) and cmif-parser format (direct properties)
 */
function renderOverviewMetadata() {
    const container = document.getElementById('overview-metadata');
    if (!container || !dataMeta) return;

    const items = [];

    // Check for JSON format (teiHeader object) vs cmif-parser format (direct properties)
    const teiHeader = dataMeta.teiHeader || {};
    const hasJsonFormat = Object.keys(teiHeader).length > 0;

    // Editor - JSON: teiHeader.editor (string), Parser: editors (array)
    const editorValue = hasJsonFormat
        ? teiHeader.editor
        : (dataMeta.editors?.map(e => e.name).join(', ') || null);
    if (editorValue) {
        items.push({
            icon: 'fa-user-edit',
            label: 'Herausgeber',
            value: editorValue
        });
    }

    // Publisher - JSON: teiHeader.publisher (string), Parser: publishers (array)
    const publisherValue = hasJsonFormat
        ? teiHeader.publisher
        : (dataMeta.publishers?.map(p => p.url
            ? `<a href="${p.url}" target="_blank" rel="noopener">${p.name}</a>`
            : p.name).join(', ') || null);
    if (publisherValue) {
        items.push({
            icon: 'fa-building',
            label: 'Verlag',
            value: publisherValue
        });
    }

    // Source (bibl) - JSON: teiHeader.bibl, Parser: sourceReference/sourceUrl
    const sourceValue = hasJsonFormat
        ? teiHeader.bibl
        : (dataMeta.sourceUrl && dataMeta.sourceReference
            ? `<a href="${dataMeta.sourceUrl}" target="_blank" rel="noopener">${dataMeta.sourceReference}</a>`
            : dataMeta.sourceReference || null);
    if (sourceValue) {
        items.push({
            icon: 'fa-quote-left',
            label: 'Quelle',
            value: sourceValue
        });
    }

    // CMIF URL - both formats use cmifUrl
    const cmifUrl = hasJsonFormat ? teiHeader.cmifUrl : dataMeta.cmifUrl;
    if (cmifUrl) {
        items.push({
            icon: 'fa-link',
            label: 'CMIF',
            value: `<a href="${cmifUrl}" target="_blank" rel="noopener">CMIF oeffnen</a>`
        });
    }

    // Licence - JSON: teiHeader.licence/licenceTarget, Parser: licence.text/url
    let licenceText = null;
    if (hasJsonFormat && teiHeader.licence) {
        licenceText = teiHeader.licenceTarget
            ? `<a href="${teiHeader.licenceTarget}" target="_blank" rel="noopener">${teiHeader.licence}</a>`
            : teiHeader.licence;
    } else if (dataMeta.licence?.text) {
        licenceText = dataMeta.licence.url
            ? `<a href="${dataMeta.licence.url}" target="_blank" rel="noopener">${dataMeta.licence.text}</a>`
            : dataMeta.licence.text;
    }
    if (licenceText) {
        items.push({
            icon: 'fa-balance-scale',
            label: 'Lizenz',
            value: licenceText
        });
    }

    // If no metadata available
    if (items.length === 0) {
        container.innerHTML = '<p class="no-data">Keine Metadaten verfuegbar</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="overview-metadata-item">
            <i class="fas ${item.icon}"></i>
            <span>${item.value}</span>
        </div>
    `).join('');
}

/**
 * Render top correspondents on Overview page
 */
function renderTopCorrespondents() {
    const container = document.getElementById('overview-top-correspondents');
    if (!container || !allLetters || allLetters.length === 0) return;

    // Count letters per person (both as sender and recipient)
    const personCounts = {};

    allLetters.forEach(letter => {
        if (letter.sender?.name) {
            const key = letter.sender.id || letter.sender.name;
            if (!personCounts[key]) {
                personCounts[key] = { name: letter.sender.name, id: letter.sender.id, count: 0 };
            }
            personCounts[key].count++;
        }
        if (letter.recipient?.name) {
            const key = letter.recipient.id || letter.recipient.name;
            if (!personCounts[key]) {
                personCounts[key] = { name: letter.recipient.name, id: letter.recipient.id, count: 0 };
            }
            personCounts[key].count++;
        }
    });

    // Sort by count and take top 5
    const topPersons = Object.values(personCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (topPersons.length === 0) {
        container.innerHTML = '<p class="no-data">Keine Korrespondenten gefunden</p>';
        return;
    }

    container.innerHTML = topPersons.map((person, index) => `
        <div class="correspondent-item" data-person-id="${person.id || ''}" data-person-name="${person.name}">
            <span class="correspondent-rank">${index + 1}.</span>
            <span class="correspondent-name" title="${person.name}">${person.name}</span>
            <span class="correspondent-count">${person.count} Briefe</span>
        </div>
    `).join('');

    // Add click handlers to navigate to persons view
    container.querySelectorAll('.correspondent-item').forEach(item => {
        item.addEventListener('click', () => {
            switchView('persons');
            updateUrlState();
            // Focus on search field with person name
            const searchInput = document.getElementById('person-search');
            if (searchInput) {
                searchInput.value = item.dataset.personName;
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    });
}

/**
 * Render language distribution on Overview page
 */
function renderLanguageDistribution() {
    const container = document.getElementById('overview-languages');
    const section = document.getElementById('overview-languages-section');
    if (!container || !section || !allLetters || allLetters.length === 0) return;

    // Count letters per language
    const langCounts = {};
    let totalWithLang = 0;

    allLetters.forEach(letter => {
        if (letter.language) {
            const lang = letter.language;
            langCounts[lang] = (langCounts[lang] || 0) + 1;
            totalWithLang++;
        }
    });

    const languages = Object.entries(langCounts);

    // Only show if there are multiple languages
    if (languages.length <= 1) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    // Sort by count
    languages.sort((a, b) => b[1] - a[1]);

    const maxCount = languages[0][1];

    container.innerHTML = languages.map(([lang, count]) => {
        const percentage = Math.round((count / totalWithLang) * 100);
        const barWidth = Math.round((count / maxCount) * 100);
        return `
            <div class="language-item">
                <span class="language-name">${lang.toUpperCase()}</span>
                <div class="language-bar-container">
                    <div class="language-bar" style="width: ${barWidth}%"></div>
                </div>
                <span class="language-count">${count} (${percentage}%)</span>
            </div>
        `;
    }).join('');
}

function renderPersonsList() {
    const container = elements.personsList;
    if (!container) return;

    // Build persons from filtered letters
    const personsMap = {};

    filteredLetters.forEach(letter => {
        // Count as sender
        if (letter.sender?.name) {
            const key = letter.sender.id || letter.sender.name;
            if (!personsMap[key]) {
                personsMap[key] = {
                    name: letter.sender.name,
                    id: letter.sender.id,
                    authority: letter.sender.authority,
                    precision: letter.sender.precision,
                    sent: 0,
                    received: 0
                };
            }
            personsMap[key].sent++;
        }

        // Count as recipient
        if (letter.recipient?.name) {
            const key = letter.recipient.id || letter.recipient.name;
            if (!personsMap[key]) {
                personsMap[key] = {
                    name: letter.recipient.name,
                    id: letter.recipient.id,
                    authority: letter.recipient.authority,
                    precision: letter.recipient.precision,
                    sent: 0,
                    received: 0
                };
            }
            personsMap[key].received++;
        }
    });

    let persons = Object.values(personsMap);

    // Filter by search
    if (personsSearchTerm) {
        persons = persons.filter(p =>
            p.name.toLowerCase().includes(personsSearchTerm)
        );
    }

    // Sort
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

    // Render
    if (persons.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Keine Korrespondenten gefunden</p>
            </div>
        `;
        return;
    }

    // Get enrichment data from sessionStorage
    const enrichmentData = JSON.parse(sessionStorage.getItem('person-enrichment') || '{}');

    container.innerHTML = persons.map(person => {
        const initials = getPersonInitials(person.name, person.precision);
        const total = person.sent + person.received;
        const personKey = person.id || person.name;
        const correspSearchUrl = buildCorrespSearchUrl(person);
        const precisionClass = getPersonPrecisionClass(person.precision);
        const hasWikidataEnrichment = enrichmentData[personKey]?.source === 'wikidata';

        // Small Wikidata indicator SVG
        const wikidataIndicator = hasWikidataEnrichment ? `
            <span class="wikidata-indicator" title="Wikidata-Anreicherung">
                <svg viewBox="0 0 30 20" width="14" height="10">
                    <rect fill="#990000" width="6" height="20"/>
                    <rect fill="#339966" x="8" width="6" height="20"/>
                    <rect fill="#006699" x="16" width="6" height="20"/>
                </svg>
            </span>
        ` : '';

        return `
            <div class="person-card ${precisionClass}" data-id="${escapeHtml(personKey)}" data-name="${escapeHtml(person.name)}">
                <div class="person-avatar">${initials}</div>
                <div class="person-info">
                    <div class="person-name" title="${escapeHtml(person.name)}">${escapeHtml(person.name)}${wikidataIndicator}</div>
                    <div class="person-stats">
                        <span><i class="fas fa-paper-plane"></i> ${person.sent} gesendet</span>
                        <span><i class="fas fa-inbox"></i> ${person.received} empfangen</span>
                    </div>
                </div>
                <div class="person-actions">
                    ${person.id ? `
                        <button class="btn-person-info" data-person-id="${escapeHtml(personKey)}"
                                title="Person-Details anzeigen" onclick="event.stopPropagation()">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    ` : ''}
                    ${correspSearchUrl ? `
                        <a href="${correspSearchUrl}" target="_blank" class="btn-correspsearch"
                           title="Weitere Briefe bei correspSearch suchen" onclick="event.stopPropagation()">
                            <i class="fas fa-search"></i>
                        </a>
                    ` : ''}
                    <div class="person-count">${total}</div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers for person filtering
    container.querySelectorAll('.person-card').forEach(card => {
        card.addEventListener('click', () => {
            const personId = card.dataset.id;
            if (personId) {
                applyPersonFilter(personId);
                switchView('letters');
                updateUrlState();
            }
        });
    });

    // Add click handlers for person info buttons
    container.querySelectorAll('.btn-person-info').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = btn.dataset.personId;
            if (personId) {
                showPersonDetail(personId);
            }
        });
    });
}

// ===================
// LETTERS LIST
// ===================

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

function renderLettersList() {
    const container = elements.lettersList;
    if (!container) return;

    let letters = [...filteredLetters];

    // Filter by search
    if (lettersSearchTerm) {
        letters = letters.filter(l =>
            (l.sender?.name || '').toLowerCase().includes(lettersSearchTerm) ||
            (l.recipient?.name || '').toLowerCase().includes(lettersSearchTerm) ||
            (l.place_sent?.name || '').toLowerCase().includes(lettersSearchTerm)
        );
    }

    // Sort
    letters.sort((a, b) => {
        switch (lettersSortOrder) {
            case 'date-desc':
                return (b.date || '').localeCompare(a.date || '');
            case 'date-asc':
                return (a.date || '').localeCompare(b.date || '');
            case 'sender-asc':
                return (a.sender?.name || '').localeCompare(b.sender?.name || '');
            default: return 0;
        }
    });

    // Limit to first 500 for performance
    const displayLetters = letters.slice(0, 500);

    if (displayLetters.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope"></i>
                <p>Keine Briefe gefunden</p>
            </div>
        `;
        return;
    }

    container.innerHTML = displayLetters.map(letter => {
        const senderName = formatPersonName(letter.sender?.name, letter.sender?.precision);
        const recipientName = formatPersonName(letter.recipient?.name, letter.recipient?.precision);
        const date = formatDateWithPrecision(letter);
        const placeName = formatPlaceName(letter.place_sent?.name, letter.place_sent?.precision);
        const language = letter.language?.label || '';

        // Get uncertainty CSS classes
        const dateClass = getDatePrecisionClass(letter.datePrecision, letter.dateCertainty);

        // Check if letter has additional details worth showing
        const hasDetails = letter.mentions?.subjects?.length > 0 ||
                          letter.mentions?.persons?.length > 0 ||
                          letter.mentions?.places?.length > 0 ||
                          letter.sender?.id ||
                          letter.recipient?.id;

        return `
            <div class="letter-card ${hasDetails ? 'has-details' : ''}" data-id="${letter.id || ''}">
                <div class="letter-header">
                    <div class="letter-participants">
                        ${hasDetails ? '<i class="fas fa-chevron-right expand-icon"></i>' : ''}
                        ${senderName}
                        <span class="letter-arrow"><i class="fas fa-arrow-right"></i></span>
                        ${recipientName}
                    </div>
                    <div class="letter-header-actions">
                        <div class="letter-date ${dateClass}">${date}</div>
                    </div>
                </div>
                <div class="letter-meta">
                    ${placeName ? `<span><i class="fas fa-map-marker-alt"></i> ${placeName}</span>` : ''}
                    ${language ? `<span><i class="fas fa-language"></i> ${escapeHtml(language)}</span>` : ''}
                    ${letter.url ? `<span><a href="${letter.url}" target="_blank"><i class="fas fa-external-link-alt"></i> Quelle</a></span>` : ''}
                </div>
                <div class="letter-details" style="display: none;">
                    ${buildLetterDetails(letter)}
                </div>
            </div>
        `;
    }).join('');

    // Show count info if limited
    if (letters.length > 500) {
        container.insertAdjacentHTML('beforeend', `
            <div class="empty-state">
                <p>Zeige 500 von ${letters.length} Briefen. Nutzen Sie die Suche oder Filter.</p>
            </div>
        `);
    }

    // Add click handlers for letter expansion (inline details)
    container.querySelectorAll('.letter-card.has-details').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't expand if clicking on external link, basket toggle, or action buttons
            if (e.target.closest('a') || e.target.closest('.basket-toggle') || e.target.closest('button')) return;

            toggleLetterExpand(card);
        });
    });
}

// Toggle letter card expansion
function toggleLetterExpand(card) {
    const details = card.querySelector('.letter-details');
    const icon = card.querySelector('.expand-icon');
    const isExpanded = card.classList.contains('expanded');

    if (isExpanded) {
        card.classList.remove('expanded');
        details.style.display = 'none';
        if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
    } else {
        card.classList.add('expanded');
        details.style.display = 'block';
        if (icon) icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
    }
}

// Build inline letter details content
function buildLetterDetails(letter) {
    let html = '<div class="letter-detail-content">';

    // Links to sender/recipient at correspSearch
    const senderLink = buildPersonLink(letter.sender);
    const recipientLink = buildPersonLink(letter.recipient);

    html += '<div class="letter-detail-persons">';
    html += `<span class="detail-person"><strong>Von:</strong> ${senderLink}</span>`;
    html += `<span class="detail-person"><strong>An:</strong> ${recipientLink}</span>`;
    html += '</div>';

    // Mentioned subjects
    if (letter.mentions?.subjects?.length > 0) {
        html += '<div class="letter-detail-mentions">';
        html += '<strong>Themen:</strong> ';
        html += letter.mentions.subjects.map(s => `<span class="mention-tag">${escapeHtml(s.label)}</span>`).join(' ');
        html += '</div>';
    }

    // Mentioned persons
    if (letter.mentions?.persons?.length > 0) {
        html += '<div class="letter-detail-mentions">';
        html += '<strong>Personen:</strong> ';
        html += letter.mentions.persons.map(p => `<span class="mention-tag">${escapeHtml(p.name)}</span>`).join(' ');
        html += '</div>';
    }

    // Mentioned places
    if (letter.mentions?.places?.length > 0) {
        html += '<div class="letter-detail-mentions">';
        html += '<strong>Orte:</strong> ';
        html += letter.mentions.places.map(p => `<span class="mention-tag">${escapeHtml(p.name)}</span>`).join(' ');
        html += '</div>';
    }

    // Action links
    html += '<div class="letter-detail-links">';

    const senderCorrespUrl = buildCorrespSearchUrl(letter.sender);
    const recipientCorrespUrl = buildCorrespSearchUrl(letter.recipient);

    if (senderCorrespUrl) {
        html += `<a href="${senderCorrespUrl}" target="_blank" class="detail-link" title="Alle Briefe von ${escapeHtml(letter.sender?.name)} bei correspSearch">
            <i class="fas fa-search"></i> ${escapeHtml(letter.sender?.name)} bei correspSearch
        </a>`;
    }
    if (recipientCorrespUrl && letter.recipient?.name !== letter.sender?.name) {
        html += `<a href="${recipientCorrespUrl}" target="_blank" class="detail-link" title="Alle Briefe von ${escapeHtml(letter.recipient?.name)} bei correspSearch">
            <i class="fas fa-search"></i> ${escapeHtml(letter.recipient?.name)} bei correspSearch
        </a>`;
    }

    html += '</div>';
    html += '</div>';

    return html;
}

// ===================
// LETTER DETAIL MODAL (kept for backwards compatibility)
// ===================

function showLetterDetail(letterId) {
    const letter = allLetters.find(l => l.id === letterId);
    if (!letter) return;

    const modal = elements.getById('letter-modal');
    const title = elements.getById('letter-modal-title');
    const body = elements.getById('letter-modal-body');

    if (!modal || !body) return;

    // Build title
    const sender = letter.sender?.name || 'Unbekannt';
    const recipient = letter.recipient?.name || 'Unbekannt';
    title.textContent = `${sender} an ${recipient}`;

    // Build content
    let html = '<div class="letter-detail">';

    // Basic info section
    html += '<div class="letter-detail-section">';
    html += '<h4>Grunddaten</h4>';

    html += `<div class="letter-detail-row">
        <span class="letter-detail-label">Datum</span>
        <span class="letter-detail-value">${letter.date || 'Unbekannt'}</span>
    </div>`;

    html += `<div class="letter-detail-row">
        <span class="letter-detail-label">Absender</span>
        <span class="letter-detail-value">${buildPersonLink(letter.sender)}</span>
    </div>`;

    html += `<div class="letter-detail-row">
        <span class="letter-detail-label">Empfaenger</span>
        <span class="letter-detail-value">${buildPersonLink(letter.recipient)}</span>
    </div>`;

    if (letter.place_sent?.name) {
        html += `<div class="letter-detail-row">
            <span class="letter-detail-label">Absendeort</span>
            <span class="letter-detail-value">${buildPlaceLink(letter.place_sent)}</span>
        </div>`;
    }

    if (letter.language?.label) {
        html += `<div class="letter-detail-row">
            <span class="letter-detail-label">Sprache</span>
            <span class="letter-detail-value">${escapeHtml(letter.language.label)}</span>
        </div>`;
    }

    html += '</div>';

    // Mentions section (if available)
    if (letter.mentions) {
        // Mentioned subjects
        if (letter.mentions.subjects?.length > 0) {
            html += '<div class="letter-detail-section">';
            html += '<h4>Erwaehnte Themen</h4>';
            html += '<div class="letter-detail-tags">';
            letter.mentions.subjects.forEach(subject => {
                html += `<span class="letter-detail-tag">${escapeHtml(subject.label)}</span>`;
            });
            html += '</div></div>';
        }

        // Mentioned persons
        if (letter.mentions.persons?.length > 0) {
            html += '<div class="letter-detail-section">';
            html += '<h4>Erwaehnte Personen</h4>';
            html += '<div class="letter-detail-tags">';
            letter.mentions.persons.forEach(person => {
                html += `<span class="letter-detail-tag">${buildPersonLink(person, true)}</span>`;
            });
            html += '</div></div>';
        }

        // Mentioned places
        if (letter.mentions.places?.length > 0) {
            html += '<div class="letter-detail-section">';
            html += '<h4>Erwaehnte Orte</h4>';
            html += '<div class="letter-detail-tags">';
            letter.mentions.places.forEach(place => {
                html += `<span class="letter-detail-tag">${buildPlaceLink(place, true)}</span>`;
            });
            html += '</div></div>';
        }
    }

    // Actions section
    html += '<div class="letter-detail-actions">';
    if (letter.url) {
        html += `<a href="${letter.url}" target="_blank" class="btn btn-primary">
            <i class="fas fa-external-link-alt"></i> Zur Quelle
        </a>`;
    }
    // Add to basket button
    const inBasket = basketIsInBasket('letters', letter.id);
    html += `<button class="btn btn-basket ${inBasket ? 'in-basket' : ''}" data-letter-id="${escapeHtml(letter.id)}">
        <i class="fas fa-star"></i> ${inBasket ? 'Im Korb' : 'Zum Korb'}
    </button>`;
    html += `<button class="btn btn-secondary" onclick="filterByPerson('${letter.sender?.id || letter.sender?.name}')">
        <i class="fas fa-filter"></i> Briefe von ${escapeHtml(letter.sender?.name || 'Absender')}
    </button>`;

    // correspSearch links for sender and recipient
    const senderCorrespUrl = buildCorrespSearchUrl(letter.sender);
    const recipientCorrespUrl = buildCorrespSearchUrl(letter.recipient);
    if (senderCorrespUrl || recipientCorrespUrl) {
        html += '<div class="corresp-search-links">';
        if (senderCorrespUrl) {
            html += `<a href="${senderCorrespUrl}" target="_blank" class="btn btn-corresp" title="Briefe von ${escapeHtml(letter.sender?.name)} bei correspSearch">
                <i class="fas fa-search"></i> ${escapeHtml(letter.sender?.name)} bei correspSearch
            </a>`;
        }
        if (recipientCorrespUrl) {
            html += `<a href="${recipientCorrespUrl}" target="_blank" class="btn btn-corresp" title="Briefe von ${escapeHtml(letter.recipient?.name)} bei correspSearch">
                <i class="fas fa-search"></i> ${escapeHtml(letter.recipient?.name)} bei correspSearch
            </a>`;
        }
        html += '</div>';
    }
    html += '</div>';

    html += '</div>';

    body.innerHTML = html;

    // Setup basket button handler
    const basketBtn = body.querySelector('.btn-basket[data-letter-id]');
    if (basketBtn) {
        basketBtn.addEventListener('click', () => {
            const letterId = basketBtn.dataset.letterId;
            const nowInBasket = basketToggle('letters', letterId);
            basketBtn.classList.toggle('in-basket', nowInBasket);
            basketBtn.innerHTML = `<i class="fas fa-star"></i> ${nowInBasket ? 'Im Korb' : 'Zum Korb'}`;
        });
    }

    // Show modal
    modal.style.display = 'flex';

    // Setup close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
}

// Show person detail modal with Wikidata enrichment (supports GND and VIAF)
async function showPersonDetail(personId) {
    // Find person in index (dataIndices.persons is keyed by authority ID like VIAF)
    let person = dataIndices.persons?.[personId];
    if (!person) {
        // Try to find by iterating values (match by viaf, id, or name)
        person = Object.values(dataIndices.persons || {}).find(p =>
            p.viaf === personId || p.id === personId || p.name === personId
        );
    }
    if (!person) return;

    // Normalize property names (HSA uses letters_sent/letters_received, dynamic uses sent/received)
    const sentCount = person.letters_sent ?? person.sent ?? 0;
    const receivedCount = person.letters_received ?? person.received ?? 0;

    // Normalize authority and id (HSA uses 'viaf' property, others use 'id' + 'authority')
    const authorityId = person.viaf || person.id;
    const authority = person.authority || (person.viaf ? 'viaf' : null);

    const modal = elements.getById('person-modal');
    const title = elements.getById('person-modal-title');
    const body = elements.getById('person-modal-body');

    if (!modal || !body) return;

    // Set title
    title.textContent = person.name;

    // Check if we can enrich from Wikidata (supports GND and VIAF)
    const canEnrich = authority && authorityId && ['gnd', 'viaf'].includes(authority);

    // Show loading state if we're fetching Wikidata
    if (canEnrich) {
        body.innerHTML = `
            <div class="person-detail-loading">
                <i class="fas fa-spinner fa-spin"></i> Lade Daten von Wikidata...
            </div>
        `;
    }

    modal.style.display = 'flex';

    // Setup close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };

    // First check if we have pre-cached enrichment from upload process
    let enriched = null;
    if (canEnrich) {
        try {
            const cachedEnrichment = sessionStorage.getItem('person-enrichment');
            if (cachedEnrichment) {
                const enrichmentData = JSON.parse(cachedEnrichment);
                enriched = enrichmentData[authorityId];
            }
        } catch {
            // Cache read failed, will fetch live
        }

        // If not in pre-cache, fetch live from Wikidata
        if (!enriched) {
            enriched = await enrichPerson(authority, authorityId);
        }
    }

    // Build content
    let html = '<div class="person-detail">';

    // Header with avatar/image and basic info
    html += '<div class="person-detail-header">';
    if (enriched?.thumbnail) {
        html += `<img class="person-detail-image" src="${enriched.thumbnail}" alt="${escapeHtml(person.name)}">`;
    } else {
        const initials = person.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        html += `<div class="person-detail-avatar">${initials}</div>`;
    }
    html += '<div class="person-detail-info">';
    html += `<h3>${escapeHtml(enriched?.name || person.name)}</h3>`;

    // Show enriched biographical data with Wikidata indicator
    if (enriched) {
        html += `<div class="wikidata-badge" title="Daten angereichert via Wikidata">
            <svg class="wikidata-logo" viewBox="0 0 30 20" width="16" height="11">
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
            html += `<div class="person-life-dates"><i class="fas fa-calendar"></i> ${lifeDates}</div>`;
        }
        if (places) {
            html += `<div class="person-places"><i class="fas fa-map-marker-alt"></i> ${places}</div>`;
        }
        if (enriched.professions?.length > 0) {
            html += `<div class="person-professions"><i class="fas fa-briefcase"></i> ${enriched.professions.slice(0, 3).join(', ')}</div>`;
        }
    }
    html += '</div></div>';

    // External links (from Wikidata enrichment or fallback)
    if (enriched) {
        const externalLinks = buildExternalLinks(enriched);
        if (externalLinks) {
            html += '<div class="person-detail-section">';
            html += '<h4>Externe Links</h4>';
            html += `<div class="person-detail-links">${externalLinks}</div>`;
            html += '</div>';
        }
    } else if (authority && authorityId) {
        // Fallback: show direct authority link if no Wikidata data
        html += '<div class="person-detail-section">';
        html += '<h4>Externe Links</h4>';
        html += '<div class="person-detail-links">';
        if (authority === 'viaf') {
            html += `<a href="https://viaf.org/viaf/${authorityId}" target="_blank" rel="noopener" title="VIAF">VIAF</a>`;
        } else if (authority === 'gnd') {
            html += `<a href="https://d-nb.info/gnd/${authorityId}" target="_blank" rel="noopener" title="GND">GND</a>`;
        }
        html += '</div></div>';
    }

    // Calculate letter count for this person
    const personLetterIds = allLetters.filter(l =>
        l.sender?.id === personId || l.sender?.viaf === personId ||
        l.recipient?.id === personId || l.recipient?.viaf === personId ||
        l.sender?.name === person.name || l.recipient?.name === person.name
    ).map(l => l.id);
    const totalLetters = personLetterIds.length;

    // Action buttons
    html += '<div class="person-detail-actions">';

    const correspSearchUrl = buildCorrespSearchUrl(person);
    if (correspSearchUrl) {
        html += `<a href="${correspSearchUrl}" target="_blank" class="btn btn-primary">
            <i class="fas fa-search"></i> Bei correspSearch suchen
        </a>`;
    }

    // Add to basket button
    html += `<button class="btn btn-basket" id="person-add-basket-btn" data-letter-ids="${escapeHtml(JSON.stringify(personLetterIds))}">
        <i class="fas fa-star"></i> ${totalLetters} Briefe zum Korb
    </button>`;

    html += `<button class="btn btn-secondary" onclick="filterByPerson('${escapeHtml(personId)}'); elements.getById('person-modal').style.display='none';">
        <i class="fas fa-filter"></i> Briefe filtern
    </button>`;

    html += '</div></div>';

    body.innerHTML = html;

    // Setup basket button handler
    const personBasketBtn = document.getElementById('person-add-basket-btn');
    if (personBasketBtn) {
        personBasketBtn.addEventListener('click', () => {
            const letterIds = JSON.parse(personBasketBtn.dataset.letterIds);
            let addedCount = 0;
            letterIds.forEach(id => {
                if (!basketIsInBasket('letters', id)) {
                    basketAdd('letters', id);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                showToast(`${addedCount} Briefe zum Korb hinzugefuegt`);
            } else {
                showToast('Alle Briefe bereits im Korb');
            }
        });
    }
}

// Helper to build correspSearch URL for a person
function buildCorrespSearchUrl(person) {
    if (!person) return null;

    // Normalize authority and id (HSA uses 'viaf' property, others use 'id' + 'authority')
    const authorityId = person.viaf || person.id;
    const authority = person.authority || (person.viaf ? 'viaf' : null);

    if (!authorityId || !authority) return null;

    // correspSearch API accepts GND and VIAF IDs
    let authorityUrl = null;
    switch (authority) {
        case 'gnd':
            authorityUrl = `http://d-nb.info/gnd/${authorityId}`;
            break;
        case 'viaf':
            authorityUrl = `http://viaf.org/viaf/${authorityId}`;
            break;
    }

    if (authorityUrl) {
        return `https://correspsearch.net/search.xql?correspondent=${encodeURIComponent(authorityUrl)}`;
    }
    return null;
}

// Helper to build person link with authority URL
function buildPersonLink(person, compact = false) {
    if (!person) return 'Unbekannt';

    const name = escapeHtml(person.name);
    let url = null;

    if (person.id && person.authority) {
        switch (person.authority) {
            case 'viaf':
                url = `https://viaf.org/viaf/${person.id}`;
                break;
            case 'gnd':
                url = `https://d-nb.info/gnd/${person.id}`;
                break;
        }
    }

    if (url) {
        return `<a href="${url}" target="_blank" title="In ${person.authority.toUpperCase()} ansehen">${name}</a>`;
    }
    return name;
}

// Helper to build place link with GeoNames URL
function buildPlaceLink(place, compact = false) {
    if (!place) return 'Unbekannt';

    const name = escapeHtml(place.name);

    if (place.geonames_id) {
        return `<a href="https://www.geonames.org/${place.geonames_id}" target="_blank" title="In GeoNames ansehen">${name}</a>`;
    }
    return name;
}

// Global function for onclick handler
window.filterByPerson = function(personId) {
    const modal = elements.getById('letter-modal');
    if (modal) modal.style.display = 'none';

    applyPersonFilter(personId);
    switchView('letters');
    updateUrlState();
};

// ===================
// TIMELINE
// ===================

let timelineRendered = false;
let timelineStackMode = 'language'; // 'language' or 'correspondent'

// LANGUAGE_COLORS and LANGUAGE_LABELS imported from constants.js

function initTimeline() {
    // Setup stack mode toggle
    const stackToggle = elements.getById('timeline-stack-toggle');
    if (stackToggle) {
        stackToggle.addEventListener('change', (e) => {
            timelineStackMode = e.target.value;
            renderTimeline();
        });
    }
}

function renderTimeline() {
    const container = elements.timelineChart;
    const totalEl = elements.getById('timeline-total');
    const legendEl = elements.getById('timeline-stack-legend');
    const undatedBin = elements.getById('timeline-undated-bin');
    if (!container) return;

    // Use filtered letters
    const lettersToUse = filteredLetters;
    const isFiltered = filteredLetters.length < allLetters.length;

    // Separate dated and undated letters
    const datedLetters = lettersToUse.filter(l => l.year);
    const undatedLetters = lettersToUse.filter(l => !l.year);

    // Get all years from all letters for consistent x-axis
    const allYearsSet = new Set();
    allLetters.forEach(letter => {
        if (letter.year) allYearsSet.add(letter.year);
    });
    const allYearsSorted = Array.from(allYearsSet).sort((a, b) => a - b);

    if (allYearsSorted.length === 0 && undatedLetters.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Keine Jahresdaten verfuegbar</p></div>';
        if (undatedBin) undatedBin.style.display = 'none';
        return;
    }

    const minYear = allYearsSorted[0] || 0;
    const maxYear = allYearsSorted[allYearsSorted.length - 1] || 0;

    // Build stacked data by year and language, tracking uncertainty
    const yearData = {};
    const languageTotals = {};
    let totalImprecise = 0;

    // Initialize all years
    for (let y = minYear; y <= maxYear; y++) {
        yearData[y] = { total: 0, imprecise: 0, languages: {} };
    }

    // Check if we have actual language data (not just None/other)
    const hasLanguageData = lettersToUse.some(l => l.language?.code && l.language.code !== 'None');

    // Count letters per year per language, tracking date precision
    datedLetters.forEach(letter => {
        const year = letter.year;
        // If no language data in corpus, use a single category
        const lang = hasLanguageData ? (letter.language?.code || 'None') : '_total';
        const langKey = hasLanguageData ? (LANGUAGE_COLORS[lang] ? lang : 'other') : '_total';
        const isImprecise = letter.datePrecision === 'range' ||
                           letter.datePrecision === 'year' ||
                           letter.datePrecision === 'month' ||
                           letter.dateCertainty === 'low';

        yearData[year].total++;
        yearData[year].languages[langKey] = (yearData[year].languages[langKey] || 0) + 1;
        languageTotals[langKey] = (languageTotals[langKey] || 0) + 1;

        if (isImprecise) {
            yearData[year].imprecise++;
            totalImprecise++;
        }
    });

    // Count undated letters by language
    const undatedByLang = {};
    undatedLetters.forEach(letter => {
        const lang = hasLanguageData ? (letter.language?.code || 'None') : '_total';
        const langKey = hasLanguageData ? (LANGUAGE_COLORS[lang] ? lang : 'other') : '_total';
        undatedByLang[langKey] = (undatedByLang[langKey] || 0) + 1;
        languageTotals[langKey] = (languageTotals[langKey] || 0) + 1;
    });

    // Find max for scaling (include undated count)
    let maxCount = undatedLetters.length;
    for (let y = minYear; y <= maxYear; y++) {
        if (yearData[y].total > maxCount) maxCount = yearData[y].total;
    }
    if (maxCount === 0) maxCount = 1;

    // Sort languages by total count for consistent stacking order
    const sortedLanguages = Object.entries(languageTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([lang]) => lang);

    // Calculate label interval - show roughly 15 labels
    const yearSpan = maxYear - minYear + 1;
    const labelInterval = Math.max(1, Math.ceil(yearSpan / 15));

    // Render stacked bars
    const bars = [];
    for (let y = minYear; y <= maxYear; y++) {
        const data = yearData[y];
        const totalHeight = data.total > 0 ? Math.max(4, (data.total / maxCount) * 100) : 0;
        const showLabel = (y - minYear) % labelInterval === 0 || y === maxYear;
        const hasImprecise = data.imprecise > 0;

        // Build stacked segments
        let segments = '';
        let tooltipParts = [`${y}: ${data.total} Briefe`];

        // Add imprecise info to tooltip
        if (hasImprecise) {
            tooltipParts.push(`<span class="tooltip-imprecise">${data.imprecise} mit unscharfem Datum</span>`);
        }

        if (data.total > 0) {
            let currentBottom = 0;
            sortedLanguages.forEach(lang => {
                const count = data.languages[lang] || 0;
                if (count > 0) {
                    // Segment height as percentage of the stacked bar (not the container)
                    const segmentPct = (count / data.total) * 100;
                    // Use primary color for _total (no language data), otherwise language color
                    const color = lang === '_total' ? 'var(--color-primary)' : (LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other);
                    segments += `<div class="timeline-stack-segment" style="height: ${segmentPct}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${lang}" data-count="${count}"></div>`;
                    currentBottom += segmentPct;
                    // Only add language breakdown to tooltip if we have language data
                    if (lang !== '_total') {
                        const langLabel = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                        tooltipParts.push(`${langLabel}: ${count}`);
                    }
                }
            });
        }

        bars.push(`
            <div class="timeline-bar-wrapper ${hasImprecise ? 'has-imprecise' : ''}" data-year="${y}" data-year-end="${y}" data-imprecise="${data.imprecise}">
                <div class="timeline-stacked-bar" style="height: ${totalHeight}%">
                    ${segments}
                </div>
                <div class="timeline-bar-tooltip">${tooltipParts.join('<br>')}</div>
                ${showLabel ? `<span class="timeline-bar-label">${y}</span>` : ''}
            </div>
        `);
    }

    container.innerHTML = bars.join('');

    // Add Y-axis gridlines
    renderTimelineGridlines(container, maxCount);

    // Responsive bar width based on year span
    const barWrappers = container.querySelectorAll('.timeline-bar-wrapper');
    if (yearSpan > 0 && yearSpan <= 20) {
        // Wider bars for narrow time ranges
        const maxWidth = Math.min(60, Math.max(20, Math.floor(800 / yearSpan)));
        barWrappers.forEach(w => {
            w.style.maxWidth = `${maxWidth}px`;
            w.style.minWidth = `${Math.max(12, maxWidth - 10)}px`;
        });
    } else {
        // Reset to default for large ranges
        barWrappers.forEach(w => {
            w.style.maxWidth = '';
            w.style.minWidth = '';
        });
    }

    // Render undated letters bin
    if (undatedBin) {
        if (undatedLetters.length > 0) {
            undatedBin.style.display = 'flex';
            undatedBin.classList.remove('all-dated');
            undatedBin.style.cursor = 'pointer';
            const undatedHeight = Math.max(4, (undatedLetters.length / maxCount) * 100);
            const binBar = undatedBin.querySelector('.undated-bin-bar');
            const binTooltip = undatedBin.querySelector('.undated-bin-tooltip');

            // Build stacked segments for undated bin
            let undatedSegments = '';
            let currentBottom = 0;
            let tooltipParts = [`Ohne Datum: ${undatedLetters.length} Briefe`];

            sortedLanguages.forEach(lang => {
                const count = undatedByLang[lang] || 0;
                if (count > 0) {
                    const segmentHeight = (count / undatedLetters.length) * 100;
                    const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other;
                    undatedSegments += `<div class="timeline-stack-segment" style="height: ${segmentHeight}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${lang}" data-count="${count}"></div>`;
                    currentBottom += segmentHeight;
                    const langLabel = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                    tooltipParts.push(`${langLabel}: ${count}`);
                }
            });

            binBar.style.height = `${undatedHeight}%`;
            binBar.innerHTML = undatedSegments;
            binTooltip.innerHTML = tooltipParts.join('<br>');

            // Set count above bar and label below (on axis level)
            const binCount = undatedBin.querySelector('.undated-bin-count');
            const binLabel = undatedBin.querySelector('.undated-bin-label');
            if (binCount) {
                binCount.textContent = undatedLetters.length;
            }
            if (binLabel) {
                binLabel.textContent = 'k.A.';
            }

            // Tooltip positioning
            undatedBin.addEventListener('mousemove', (e) => {
                binTooltip.style.left = `${e.clientX}px`;
                binTooltip.style.top = `${e.clientY - binTooltip.offsetHeight - 10}px`;
            });

            // Click handler for undated bin
            undatedBin.onclick = () => {
                // Filter to show only undated letters
                // Set year filter to impossible range to exclude all dated
                const slider = elements.yearRangeSlider;
                if (slider && slider.noUiSlider) {
                    // Set to min-1 to exclude all dated letters
                    slider.noUiSlider.set([minYear - 1, minYear - 1]);
                }
                applyFilters();
                switchView('letters');
            };
        } else {
            // Show schematic placeholder when all letters are dated
            undatedBin.style.display = 'flex';
            undatedBin.classList.add('all-dated');
            const binBar = undatedBin.querySelector('.undated-bin-bar');
            const binTooltip = undatedBin.querySelector('.undated-bin-tooltip');
            const binLabel = undatedBin.querySelector('.undated-bin-label');
            const binCount = undatedBin.querySelector('.undated-bin-count');

            if (binBar) {
                binBar.innerHTML = '';
                binBar.style.height = '0';
            }
            if (binCount) {
                binCount.innerHTML = '<i class="fas fa-check"></i>';
            }
            if (binLabel) {
                binLabel.textContent = 'k.A.';
            }
            if (binTooltip) {
                binTooltip.textContent = 'Alle Briefe datiert';
            }
            undatedBin.onclick = null;
            undatedBin.style.cursor = 'default';
        }
    }

    // Update total
    if (totalEl) {
        const totalCount = lettersToUse.length;
        const undatedInfo = undatedLetters.length > 0 ? ` + ${undatedLetters.length} ohne Datum` : '';
        if (isFiltered) {
            totalEl.textContent = `${datedLetters.length.toLocaleString('de-DE')} von ${allLetters.filter(l => l.year).length.toLocaleString('de-DE')} Briefen (${minYear}-${maxYear})${undatedInfo}`;
        } else {
            totalEl.textContent = `${datedLetters.length.toLocaleString('de-DE')} Briefe von ${minYear} bis ${maxYear}${undatedInfo}`;
        }
    }

    // Render legend
    if (legendEl) {
        let legendItems = [];

        if (hasLanguageData) {
            // Show language breakdown
            legendItems = sortedLanguages
                .filter(lang => languageTotals[lang] > 0 && lang !== '_total')
                .map(lang => {
                    const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other;
                    const count = languageTotals[lang];
                    const label = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                    const tooltip = (lang === 'None') ? 'Keine Sprachzuordnung in den Quelldaten' : '';
                    return `<span class="timeline-legend-item"${tooltip ? ` title="${tooltip}"` : ''}><span class="timeline-legend-color" style="background: ${color}"></span>${label} (${count})</span>`;
                });
        } else {
            // No language data - show info message
            legendItems.push(`<span class="timeline-legend-item timeline-legend-info" title="Dieses Korpus enthaelt keine Sprachmetadaten"><i class="fas fa-info-circle"></i> Keine Sprachdaten im Korpus</span>`);
        }

        // Add uncertainty indicator to legend if there are imprecise dates
        if (totalImprecise > 0) {
            legendItems.push(`<span class="timeline-legend-item timeline-legend-uncertainty" title="Briefe mit unvollstaendigem oder unsicherem Datum"><span class="timeline-legend-hatched"></span>Unscharfes Datum (${totalImprecise})</span>`);
        }

        legendEl.innerHTML = legendItems.join('');
    }

    // Add click handlers for segments (language + year filter)
    container.querySelectorAll('.timeline-stack-segment').forEach(segment => {
        segment.style.cursor = 'pointer';
        segment.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent wrapper click

            const wrapper = segment.closest('.timeline-bar-wrapper');
            const year = parseInt(wrapper.dataset.year);
            const lang = segment.dataset.lang;

            // Set year filter
            const slider = elements.yearRangeSlider;
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([year, year]);
            }

            // Set language filter - uncheck all, then check only this language
            document.querySelectorAll('input[name="language"]').forEach(cb => {
                cb.checked = (cb.value === lang);
            });

            // Apply filters and switch to letters view
            applyFilters();
            switchView('letters');
        });
    });

    // Click on bar wrapper (not segment) filters by year only
    container.querySelectorAll('.timeline-bar-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            // Only handle if click was not on a segment
            if (e.target.classList.contains('timeline-stack-segment')) return;

            const year = parseInt(wrapper.dataset.year);

            // Update year slider to single year
            const slider = elements.yearRangeSlider;
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([year, year]);
            }

            // Apply filters and switch to letters view
            applyFilters();
            switchView('letters');
        });

        // Tooltip positioning on mouse move
        const tooltip = wrapper.querySelector('.timeline-bar-tooltip');
        if (tooltip) {
            wrapper.addEventListener('mousemove', (e) => {
                tooltip.style.left = `${e.clientX}px`;
                tooltip.style.top = `${e.clientY - tooltip.offsetHeight - 10}px`;
            });
        }
    });

    timelineRendered = true;
}

/**
 * Render Y-axis gridlines for timeline
 * @param {HTMLElement} container - Timeline chart container
 * @param {number} maxCount - Maximum letter count (for scaling)
 */
function renderTimelineGridlines(container, maxCount) {
    // Remove existing gridlines
    container.querySelectorAll('.timeline-gridline, .timeline-y-axis').forEach(el => el.remove());

    if (maxCount <= 1) return;

    // Calculate nice round numbers for gridlines (aim for 3-5 lines)
    const gridlineCount = 4;
    const rawStep = maxCount / gridlineCount;

    // Round to nice numbers (1, 2, 5, 10, 20, 50, 100, etc.)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceStep;
    if (normalized <= 1) niceStep = magnitude;
    else if (normalized <= 2) niceStep = 2 * magnitude;
    else if (normalized <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    // Ensure at least step of 1
    niceStep = Math.max(1, niceStep);

    // Create Y-axis container
    const yAxis = document.createElement('div');
    yAxis.className = 'timeline-y-axis';

    // Generate gridlines at nice intervals
    // Position uses percentage matching the bar height calculation
    for (let value = niceStep; value < maxCount; value += niceStep) {
        // Same calculation as bar height: (value / maxCount) * 100
        const percentage = (value / maxCount) * 100;

        // Gridline - positioned inside yAxis container
        const gridline = document.createElement('div');
        gridline.className = 'timeline-gridline';
        gridline.style.bottom = `${percentage}%`;

        // Label
        const label = document.createElement('span');
        label.className = 'timeline-gridline-label';
        label.textContent = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
        label.style.bottom = `${percentage}%`;

        yAxis.appendChild(gridline);
        yAxis.appendChild(label);
    }

    container.insertBefore(yAxis, container.firstChild);
}

// ===================
// TOPICS VIEW
// ===================

function initTopicsView() {
    // Build subject index from letters
    buildSubjectIndex();

    // Note: Topics button visibility is now handled by updateViewButtons()

    // Setup search and sort
    const searchInput = elements.getById('topic-search');
    const sortSelect = elements.getById('topic-sort');

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            topicsSearchTerm = e.target.value.toLowerCase();
            renderTopicsList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            topicsSortOrder = e.target.value;
            renderTopicsList();
        });
    }

    // Setup filter button
    const filterBtn = elements.getById('topic-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (selectedSubjectId) {
                applySubjectFilter(selectedSubjectId);
            }
        });
    }
}

// Build inverted index for subjects
function buildSubjectIndex() {
    subjectIndex = {};

    allLetters.forEach(letter => {
        if (!letter.mentions?.subjects) return;

        const letterSubjects = letter.mentions.subjects;
        const senderName = letter.sender?.name || 'Unbekannt';
        const senderId = letter.sender?.id || letter.sender?.name;
        const year = letter.year;

        letterSubjects.forEach(subject => {
            // Use uri as primary identifier, fallback to id, then label
            const subjectId = subject.uri || subject.id || subject.label;
            const subjectLabel = subject.label;

            if (!subjectIndex[subjectId]) {
                subjectIndex[subjectId] = {
                    id: subjectId,
                    label: subjectLabel,
                    count: 0,
                    letterIds: [],
                    persons: {},
                    years: {},
                    cooccurrence: {}
                };
            }

            subjectIndex[subjectId].count++;
            subjectIndex[subjectId].letterIds.push(letter.id);

            // Track persons
            if (senderId) {
                if (!subjectIndex[subjectId].persons[senderId]) {
                    subjectIndex[subjectId].persons[senderId] = { name: senderName, count: 0 };
                }
                subjectIndex[subjectId].persons[senderId].count++;
            }

            // Track years
            if (year) {
                subjectIndex[subjectId].years[year] = (subjectIndex[subjectId].years[year] || 0) + 1;
            }

            // Track co-occurrence with other subjects in same letter
            letterSubjects.forEach(otherSubject => {
                const otherId = otherSubject.uri || otherSubject.id || otherSubject.label;
                if (otherId !== subjectId) {
                    subjectIndex[subjectId].cooccurrence[otherId] =
                        (subjectIndex[subjectId].cooccurrence[otherId] || 0) + 1;
                }
            });
        });
    });

    log.init(`Subject index built: ${Object.keys(subjectIndex).length} subjects`);
}

function renderTopicsList() {
    const container = elements.topicsList;
    if (!container) return;

    // Build dynamic topic counts based on filtered letters
    const filteredTopicCounts = {};
    filteredLetters.forEach(letter => {
        if (!letter.mentions?.subjects) return;
        letter.mentions.subjects.forEach(subject => {
            const subjectId = subject.uri || subject.id || subject.label;
            if (!filteredTopicCounts[subjectId]) {
                filteredTopicCounts[subjectId] = 0;
            }
            filteredTopicCounts[subjectId]++;
        });
    });

    // Create topics array with filtered counts
    let topics = Object.values(subjectIndex)
        .map(topic => ({
            ...topic,
            filteredCount: filteredTopicCounts[topic.id] || 0
        }))
        .filter(t => t.filteredCount > 0); // Only show topics with matches in filtered letters

    // Filter by search
    if (topicsSearchTerm) {
        topics = topics.filter(t =>
            t.label.toLowerCase().includes(topicsSearchTerm)
        );
    }

    // Sort (use filteredCount instead of count)
    topics.sort((a, b) => {
        switch (topicsSortOrder) {
            case 'count-desc': return b.filteredCount - a.filteredCount;
            case 'count-asc': return a.filteredCount - b.filteredCount;
            case 'name-asc': return a.label.localeCompare(b.label);
            default: return 0;
        }
    });

    // Find max count for bar scaling (use filteredCount)
    const maxCount = topics.length > 0 ? Math.max(...topics.map(t => t.filteredCount)) : 1;

    if (topics.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <p>Keine Themen gefunden</p>
            </div>
        `;
        return;
    }

    container.innerHTML = topics.map(topic => {
        const barWidth = (topic.filteredCount / maxCount) * 100;
        const isActive = selectedSubjectId === topic.id;

        return `
            <div class="entity-card ${isActive ? 'active' : ''}" data-id="${escapeHtml(topic.id)}">
                <div class="entity-card-info">
                    <div class="entity-card-name" title="${escapeHtml(topic.label)}">${escapeHtml(topic.label)}</div>
                    <div class="entity-card-bar">
                        <div class="entity-card-bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                </div>
                <div class="entity-card-count">${topic.filteredCount}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.entity-card').forEach(card => {
        card.addEventListener('click', () => {
            const topicId = card.dataset.id;
            selectTopic(topicId);

            // Update active state
            container.querySelectorAll('.entity-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
}

function selectTopic(topicId) {
    selectedSubjectId = topicId;
    const topic = subjectIndex[topicId];
    if (!topic) return;

    // Calculate filtered data for this topic
    const filteredTopicLetters = filteredLetters.filter(letter => {
        const subjects = letter.mentions?.subjects || [];
        return subjects.some(s => (s.uri || s.id || s.label) === topicId);
    });

    const filteredCount = filteredTopicLetters.length;

    // Build filtered correspondents
    const filteredPersons = {};
    filteredTopicLetters.forEach(letter => {
        const senderId = letter.sender?.id || letter.sender?.name;
        const senderName = letter.sender?.name || 'Unbekannt';
        if (senderId) {
            if (!filteredPersons[senderId]) {
                filteredPersons[senderId] = { name: senderName, count: 0 };
            }
            filteredPersons[senderId].count++;
        }
    });

    // Build filtered years
    const filteredYears = {};
    filteredTopicLetters.forEach(letter => {
        if (letter.year) {
            filteredYears[letter.year] = (filteredYears[letter.year] || 0) + 1;
        }
    });

    // Build filtered cooccurrence
    const filteredCooccurrence = {};
    filteredTopicLetters.forEach(letter => {
        const subjects = letter.mentions?.subjects || [];
        subjects.forEach(s => {
            const otherId = s.uri || s.id || s.label;
            if (otherId !== topicId) {
                filteredCooccurrence[otherId] = (filteredCooccurrence[otherId] || 0) + 1;
            }
        });
    });

    const emptyState = elements.getById('topic-detail-empty');
    const content = elements.getById('topic-detail-content');
    const title = elements.getById('topic-detail-title');
    const count = elements.getById('topic-detail-count');
    const correspondents = elements.getById('topic-correspondents');
    const timeline = elements.getById('topic-timeline');
    const related = elements.getById('topic-related');
    const filterBtn = elements.getById('topic-filter-btn');

    if (emptyState) emptyState.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    // Title and count (show filtered count)
    if (title) title.textContent = topic.label;
    if (count) count.textContent = `${filteredCount} Briefe`;

    // Update filter button text
    if (filterBtn) {
        filterBtn.innerHTML = `<i class="fas fa-filter"></i> ${filteredCount} Briefe filtern`;
    }

    // Correspondents (top 10, from filtered data)
    if (correspondents) {
        const persons = Object.entries(filteredPersons)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const maxPersonCount = persons.length > 0 ? persons[0].count : 1;

        correspondents.innerHTML = persons.map(person => {
            const barWidth = (person.count / maxPersonCount) * 100;
            return `
                <div class="entity-stat-row">
                    <span class="entity-stat-name">${escapeHtml(person.name)}</span>
                    <span class="entity-stat-count">${person.count}</span>
                    <div class="entity-stat-bar">
                        <div class="entity-stat-bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        if (persons.length === 0) {
            correspondents.innerHTML = '<p style="color: var(--color-text-light); font-size: var(--font-size-sm);">Keine Korrespondenten</p>';
        }
    }

    // Mini timeline (from filtered data)
    if (timeline) {
        const years = Object.entries(filteredYears)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => a.year - b.year);

        if (years.length > 0) {
            const minYear = years[0].year;
            const maxYear = years[years.length - 1].year;
            const maxYearCount = Math.max(...years.map(y => y.count));

            // Fill gaps
            const allYears = [];
            for (let y = minYear; y <= maxYear; y++) {
                const found = years.find(yr => yr.year === y);
                allYears.push({ year: y, count: found ? found.count : 0 });
            }

            // Limit to ~30 bars max
            let displayYears = allYears;
            if (allYears.length > 30) {
                // Group by 5-year periods
                const grouped = {};
                allYears.forEach(y => {
                    const period = Math.floor(y.year / 5) * 5;
                    grouped[period] = (grouped[period] || 0) + y.count;
                });
                displayYears = Object.entries(grouped)
                    .map(([year, count]) => ({ year: parseInt(year), count }))
                    .sort((a, b) => a.year - b.year);
            }

            const displayMax = Math.max(...displayYears.map(y => y.count));

            timeline.innerHTML = displayYears.map(y => {
                const height = y.count > 0 ? Math.max(4, (y.count / displayMax) * 100) : 0;
                return `<div class="entity-mini-timeline-bar" style="height: ${height}%" title="${y.year}: ${y.count}"></div>`;
            }).join('');
        } else {
            timeline.innerHTML = '<p style="color: var(--color-text-light); font-size: var(--font-size-sm);">Keine Jahresdaten</p>';
        }
    }

    // Related topics (co-occurrence from filtered data)
    if (related) {
        const relatedTopics = Object.entries(filteredCooccurrence)
            .map(([id, count]) => {
                const relatedTopic = subjectIndex[id];
                return {
                    id,
                    label: relatedTopic?.label || id,
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        related.innerHTML = relatedTopics.map(rt => `
            <span class="entity-tag" data-id="${escapeHtml(rt.id)}">
                ${escapeHtml(rt.label)} (${rt.count})
            </span>
        `).join('');

        // Add click handlers to related tags
        related.querySelectorAll('.entity-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const relatedId = tag.dataset.id;
                selectTopic(relatedId);
                // Update list selection
                const container = elements.topicsList;
                container?.querySelectorAll('.entity-card').forEach(c => {
                    c.classList.toggle('active', c.dataset.id === relatedId);
                });
            });
        });

        if (relatedTopics.length === 0) {
            related.innerHTML = '<p style="color: var(--color-text-light); font-size: var(--font-size-sm);">Keine verwandten Themen</p>';
        }
    }
}

// Apply subject filter (stays on current view, updates map/data)
function applySubjectFilter(subjectId) {
    selectedSubjectId = subjectId;
    applyFilters();
    updateSubjectFilterDisplay();
    updateTopicsQuickFilterState();
    updateFilterIndicators();
    updateUrlState();
}

// Clear subject filter
function clearSubjectFilter() {
    selectedSubjectId = null;
    applyFilters();
    updateSubjectFilterDisplay();
    updateTopicsQuickFilterState();
    updateFilterIndicators();
}

// Update subject filter display in sidebar
function updateSubjectFilterDisplay() {
    let filterDisplay = elements.getById('subject-filter-display');

    if (selectedSubjectId && subjectIndex[selectedSubjectId]) {
        const topic = subjectIndex[selectedSubjectId];

        if (!filterDisplay) {
            // Create filter display element
            const sidebar = document.querySelector('.sidebar');
            const statsCards = document.querySelector('.stats-cards');
            filterDisplay = document.createElement('div');
            filterDisplay.id = 'subject-filter-display';
            filterDisplay.className = 'subject-filter-active';
            sidebar.insertBefore(filterDisplay, statsCards.nextSibling);
        }

        filterDisplay.innerHTML = `
            <div class="filter-badge subject-badge">
                <i class="fas fa-tag"></i>
                <span>${escapeHtml(topic.label)}</span>
                <button class="filter-clear" title="Filter entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        filterDisplay.style.display = 'block';

        // Add click handler
        filterDisplay.querySelector('.filter-clear').addEventListener('click', clearSubjectFilter);
    } else if (filterDisplay) {
        filterDisplay.style.display = 'none';
    }
}

// Global function for filtering by subject
window.filterBySubject = function(subjectId) {
    applySubjectFilter(subjectId);
};

// ===================
// PLACES VIEW
// ===================

function initPlacesView() {
    buildPlacesIndex();

    const searchInput = elements.getById('place-search');
    const sortSelect = elements.getById('place-sort');

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            placesSearchTerm = e.target.value.toLowerCase();
            renderPlacesList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            placesSortOrder = e.target.value;
            renderPlacesList();
        });
    }

    // Filter button
    const filterBtn = elements.getById('place-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (selectedPlaceId) {
                applyPlaceFilter(selectedPlaceId);
                switchView('letters');
            }
        });
    }

    // Add to basket button
    const addBasketBtn = elements.getById('place-add-basket-btn');
    if (addBasketBtn) {
        addBasketBtn.addEventListener('click', () => {
            const letterIdsJson = addBasketBtn.dataset.letterIds;
            if (!letterIdsJson) return;

            const letterIds = JSON.parse(letterIdsJson);
            let addedCount = 0;
            letterIds.forEach(id => {
                if (!basketIsInBasket('letters', id)) {
                    basketAdd('letters', id);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                showToast(`${addedCount} Briefe zum Korb hinzugefuegt`);
            } else {
                showToast('Alle Briefe bereits im Korb');
            }
        });
    }

    // Resolve coordinates button
    const resolveBtn = elements.getById('resolve-coords-btn');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', handleResolveCoordinates);
    }

    // Update missing coordinates banner
    updateMissingCoordinatesBanner();

    log.init(`Places view initialized: ${Object.keys(placesIndex).length} places`);
}

function buildPlacesIndex() {
    placesIndex = {};

    allLetters.forEach(letter => {
        if (!letter.place_sent?.name) return;

        // Use geonames_id if available, otherwise create ID from name
        const placeId = letter.place_sent.geonames_id || `name:${letter.place_sent.name}`;
        const hasCoordinates = letter.place_sent.lat != null && letter.place_sent.lon != null;
        const precision = letter.place_sent.precision || (hasCoordinates ? 'exact' : 'region');

        if (!placesIndex[placeId]) {
            placesIndex[placeId] = {
                id: placeId,
                name: letter.place_sent.name,
                lat: letter.place_sent.lat,
                lon: letter.place_sent.lon,
                precision: precision,
                hasCoordinates: hasCoordinates,
                letterCount: 0,
                letters: [],
                senders: {},
                languages: {},
                years: []
            };
        }

        placesIndex[placeId].letterCount++;
        placesIndex[placeId].letters.push(letter.id);
        if (letter.year) placesIndex[placeId].years.push(letter.year);

        if (letter.sender?.name) {
            const senderName = letter.sender.name;
            placesIndex[placeId].senders[senderName] = (placesIndex[placeId].senders[senderName] || 0) + 1;
        }

        if (letter.language?.code) {
            const langCode = letter.language.code;
            placesIndex[placeId].languages[langCode] = (placesIndex[placeId].languages[langCode] || 0) + 1;
        }
    });

    // Calculate top senders and year range for each place
    Object.values(placesIndex).forEach(place => {
        place.topSenders = Object.entries(place.senders)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
        place.senderCount = Object.keys(place.senders).length;
        place.yearMin = place.years.length > 0 ? Math.min(...place.years) : null;
        place.yearMax = place.years.length > 0 ? Math.max(...place.years) : null;
    });
}

function renderPlacesList() {
    const container = elements.placesList;
    if (!container) return;

    // Get places filtered by current filters
    const filteredPlaceIds = new Set();
    filteredLetters.forEach(letter => {
        if (letter.place_sent?.name) {
            const placeId = letter.place_sent.geonames_id || `name:${letter.place_sent.name}`;
            filteredPlaceIds.add(placeId);
        }
    });

    // Count letters per place in filtered set
    const filteredPlaceCounts = {};
    filteredLetters.forEach(letter => {
        if (letter.place_sent?.name) {
            const placeId = letter.place_sent.geonames_id || `name:${letter.place_sent.name}`;
            filteredPlaceCounts[placeId] = (filteredPlaceCounts[placeId] || 0) + 1;
        }
    });

    let places = Object.values(placesIndex)
        .filter(place => filteredPlaceIds.has(place.id))
        .map(place => ({
            ...place,
            filteredCount: filteredPlaceCounts[place.id] || 0
        }));

    // Apply search filter
    if (placesSearchTerm) {
        places = places.filter(place =>
            place.name.toLowerCase().includes(placesSearchTerm)
        );
    }

    // Apply sort
    switch (placesSortOrder) {
        case 'count-desc':
            places.sort((a, b) => b.filteredCount - a.filteredCount);
            break;
        case 'count-asc':
            places.sort((a, b) => a.filteredCount - b.filteredCount);
            break;
        case 'name-asc':
            places.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            break;
        case 'name-desc':
            places.sort((a, b) => b.name.localeCompare(a.name, 'de'));
            break;
    }

    // Render list with precision indicators
    container.innerHTML = places.map(place => {
        const isActive = selectedPlaceId === place.id;
        const yearRange = place.yearMin && place.yearMax
            ? `${place.yearMin}-${place.yearMax}`
            : '';
        const precisionClass = getPlacePrecisionClass(place.precision);
        const noCoordIcon = !place.hasCoordinates ? '<i class="fas fa-question-circle" title="Ohne Koordinaten"></i> ' : '';
        return `
            <div class="entity-card ${isActive ? 'active' : ''} ${precisionClass}" data-place-id="${place.id}">
                <div class="entity-card-info">
                    <div class="entity-card-name ${precisionClass}" title="${escapeHtml(place.name)}">${noCoordIcon}${escapeHtml(place.name)}</div>
                    <div class="entity-card-meta">${place.senderCount} Absender ${yearRange ? `| ${yearRange}` : ''}</div>
                </div>
                <div class="entity-card-count">${place.filteredCount}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.entity-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const placeId = card.dataset.placeId;
            selectPlace(placeId);
        });
    });
}

function selectPlace(placeId) {
    selectedPlaceId = placeId;
    const place = placesIndex[placeId];

    if (!place) return;

    // Update active state in list
    document.querySelectorAll('.entity-card[data-place-id]').forEach(card => {
        card.classList.toggle('active', card.dataset.placeId === placeId);
    });

    // Show detail panel
    const emptyState = elements.getById('place-detail-empty');
    const content = elements.getById('place-detail-content');

    if (emptyState) emptyState.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    // Calculate filtered count for this place
    const filteredCount = filteredLetters.filter(l => {
        if (!l.place_sent?.name) return false;
        const letterPlaceId = l.place_sent.geonames_id || `name:${l.place_sent.name}`;
        return letterPlaceId === placeId;
    }).length;

    // Update title and count
    elements.getById('place-detail-title').textContent = place.name;
    elements.getById('place-detail-count').textContent = `${filteredCount} Briefe`;

    // Render top senders
    const sendersContainer = elements.getById('place-top-senders');
    if (sendersContainer) {
        const maxCount = place.topSenders.length > 0 ? place.topSenders[0].count : 1;
        sendersContainer.innerHTML = place.topSenders.map(s => {
            const barWidth = (s.count / maxCount) * 100;
            return `<div class="entity-stat-row">
                <span class="entity-stat-name">${escapeHtml(s.name)}</span>
                <span class="entity-stat-count">${s.count}</span>
                <div class="entity-stat-bar">
                    <div class="entity-stat-bar-fill" style="width: ${barWidth}%"></div>
                </div>
            </div>`;
        }).join('');
    }

    // Render mini timeline
    const timelineContainer = elements.getById('place-timeline');
    if (timelineContainer && place.yearMin && place.yearMax) {
        const yearCounts = {};
        place.years.forEach(year => {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(yearCounts));
        const years = [];
        for (let y = place.yearMin; y <= place.yearMax; y++) {
            years.push({ year: y, count: yearCounts[y] || 0 });
        }

        timelineContainer.innerHTML = years.map(y => {
            const height = y.count > 0 ? Math.max(4, (y.count / maxCount) * 100) : 0;
            return `<div class="entity-mini-timeline-bar" style="height: ${height}%" title="${y.year}: ${y.count}"></div>`;
        }).join('');
    } else if (timelineContainer) {
        timelineContainer.innerHTML = '<p class="no-data">Keine Zeitdaten</p>';
    }

    // Render languages
    const languagesContainer = elements.getById('place-languages');
    if (languagesContainer) {
        const langEntries = Object.entries(place.languages)
            .sort((a, b) => b[1] - a[1]);

        languagesContainer.innerHTML = langEntries.map(([code, count]) => {
            const label = LANGUAGE_LABELS[code] || code.toUpperCase();
            const color = LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other;
            return `<span class="entity-tag" style="border-left: 3px solid ${color}">${label} (${count})</span>`;
        }).join('');
    }

    // Update GeoNames link
    const geonamesLink = elements.getById('place-geonames-link');
    if (geonamesLink) {
        geonamesLink.href = `https://www.geonames.org/${placeId}`;
    }

    // Update basket button count and handler
    const basketCountSpan = elements.getById('place-basket-count');
    if (basketCountSpan) {
        basketCountSpan.textContent = filteredCount;
    }

    // Store letter IDs for this place for basket add
    const placeLetterIds = filteredLetters.filter(l => {
        if (!l.place_sent?.name) return false;
        const letterPlaceId = l.place_sent.geonames_id || `name:${l.place_sent.name}`;
        return letterPlaceId === placeId;
    }).map(l => l.id);

    // Update basket button
    const addBasketBtn = elements.getById('place-add-basket-btn');
    if (addBasketBtn) {
        addBasketBtn.dataset.letterIds = JSON.stringify(placeLetterIds);
    }
}

function applyPlaceFilter(placeId) {
    log.event(`Applying place filter: ${placeId}`);

    // Filter letters by place
    filteredLetters = allLetters.filter(letter =>
        letter.place_sent?.geonames_id === placeId
    );

    // Update aggregation and UI
    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});

    if (map && map.loaded() && mapInitialized) {
        renderPlaceMarkers(placeAggregation);
        updateMapLegend();
    }

    updateFilterCounts();
    updateUrlState();

    log.event(`Filtered letters count: ${filteredLetters.length}`);
}

// Update missing coordinates banner in Places View
function updateMissingCoordinatesBanner() {
    const banner = elements.getById('places-missing-coords-banner');
    const countSpan = elements.getById('places-missing-count');

    if (!banner || !countSpan) return;

    // Count places without coordinates that have GeoNames IDs
    let missingCount = 0;
    const missingIds = [];

    Object.values(placesIndex).forEach(place => {
        if (!place.lat && place.geonames_id) {
            missingCount++;
            missingIds.push(place.geonames_id);
        }
    });

    if (missingCount > 0) {
        countSpan.textContent = missingCount;
        banner.classList.remove('hidden');
        banner.dataset.missingIds = JSON.stringify(missingIds);
    } else {
        banner.classList.add('hidden');
    }
}

// Handle coordinate resolution button click
async function handleResolveCoordinates() {
    const banner = elements.getById('places-missing-coords-banner');
    const btn = elements.getById('resolve-coords-btn');

    if (!banner || !btn) return;

    const missingIds = JSON.parse(banner.dataset.missingIds || '[]');

    if (missingIds.length === 0) {
        showToast('Keine Orte zum Auflösen gefunden', 'info');
        return;
    }

    // Disable button and show loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lade Koordinaten...';

    try {
        // Dynamically import the geonames enrichment module
        const { resolveGeoNamesCoordinates, applyCoordinatesToData } = await import('./geonames-enrichment.js');

        // Resolve coordinates
        const coordinates = await resolveGeoNamesCoordinates(missingIds, (loaded, total) => {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loaded}/${total}`;
        });

        // Apply coordinates to current data
        const currentData = {
            letters: allLetters,
            indices: dataIndices
        };

        applyCoordinatesToData(currentData, coordinates);

        // Update sessionStorage with new coordinates
        const storedData = JSON.parse(sessionStorage.getItem('cmif-data') || '{}');
        storedData.letters = allLetters;
        storedData.indices = dataIndices;
        sessionStorage.setItem('cmif-data', JSON.stringify(storedData));

        // Rebuild place aggregation
        placeAggregation = aggregateLettersByPlace(allLetters, dataIndices.places || {});

        // Rebuild places index
        buildPlacesIndex();
        renderPlacesList();

        // Update views
        detectAvailableViews();
        updateViewButtons();

        // Reinitialize map if it's now available
        if (availableViews.map?.available && map) {
            initMap();
            updateMap();
        }

        const resolvedCount = Object.keys(coordinates).length;
        showToast(`${resolvedCount} Orte erfolgreich georeferenziert`, 'success');

        // Update banner
        updateMissingCoordinatesBanner();

    } catch (error) {
        console.error('Failed to resolve coordinates:', error);
        showToast(`Fehler beim Auflösen: ${error.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-globe"></i> Koordinaten nachladen';
    }
}

// ===================
// EXPORT
// ===================

function initExport() {
    const exportBtn = elements.exportBtn;
    const modal = elements.exportModal;
    const closeBtn = modal?.querySelector('.modal-close');
    const exportOptions = modal?.querySelectorAll('.export-option');

    if (exportBtn && modal) {
        exportBtn.addEventListener('click', () => {
            const info = elements.getById('export-info');
            if (info) {
                info.textContent = `${filteredLetters.length} Briefe werden exportiert`;
            }
            modal.style.display = 'flex';
        });

        closeBtn?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        exportOptions?.forEach(option => {
            option.addEventListener('click', () => {
                const format = option.dataset.format;
                exportData(format);
                modal.style.display = 'none';
            });
        });
    }
}

function exportData(format) {
    const data = filteredLetters.map(letter => ({
        id: letter.id,
        date: letter.date,
        date_to: letter.dateTo || '',
        year: letter.year,
        date_precision: letter.datePrecision || '',
        date_certainty: letter.dateCertainty || 'high',
        sender_name: letter.sender?.name || '',
        sender_id: letter.sender?.id || '',
        sender_precision: letter.sender?.precision || '',
        recipient_name: letter.recipient?.name || '',
        recipient_id: letter.recipient?.id || '',
        recipient_precision: letter.recipient?.precision || '',
        place_name: letter.place_sent?.name || '',
        place_geonames: letter.place_sent?.geonames_id || '',
        place_precision: letter.place_sent?.precision || '',
        language: letter.language?.code || '',
        url: letter.url || ''
    }));

    let content, filename, mimeType;

    if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const rows = data.map(row =>
            headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
        );
        content = [headers.join(','), ...rows].join('\n');
        filename = 'korrespondenz.csv';
        mimeType = 'text/csv;charset=utf-8';
    } else {
        content = JSON.stringify(data, null, 2);
        filename = 'korrespondenz.json';
        mimeType = 'application/json';
    }

    downloadFile(content, filename, mimeType);
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ===================
// NETWORK VIEW
// ===================

let networkType = 'contemporaries'; // 'contemporaries', 'topics', 'correspondence'
let networkMinYears = NETWORK_DEFAULTS.minYears;
let networkMinCooccurrence = NETWORK_DEFAULTS.minCooccurrence;
let networkMaxNodes = NETWORK_DEFAULTS.maxNodes;
let networkColorMode = 'type'; // 'type' or 'entry' (entry year)
let networkHideEgo = false; // Hide the ego node (most connected person)
let networkSimulation = null;
let networkSvg = null;
let networkZoom = null;

function initNetworkView() {
    const typeSelect = elements.getById('network-type');
    const thresholdInput = elements.getById('network-threshold');
    const maxNodesInput = elements.getById('network-max-nodes');
    const resetZoomBtn = elements.networkResetZoom;

    // Calculate dynamic default for minYears based on dataset timespan
    const timespan = dateRange.max - dateRange.min;
    if (timespan <= 5) {
        networkMinYears = 1;
    } else if (timespan <= 20) {
        networkMinYears = 2;
    } else {
        networkMinYears = NETWORK_DEFAULTS.minYears;
    }

    // Check if topics are available and update UI
    updateNetworkTypeOptions();

    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            networkType = e.target.value;
            updateNetworkThresholdLabel();
            renderNetwork();
        });
    }

    if (thresholdInput) {
        const thresholdValue = elements.getById('network-threshold-value');
        // Debounced render for slider
        const debouncedRender = debounce(() => renderNetwork(), 150);

        thresholdInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 1;
            // Update display value immediately
            if (thresholdValue) thresholdValue.textContent = val;
            if (networkType === 'contemporaries') {
                networkMinYears = val;
            } else if (networkType === 'topics') {
                networkMinCooccurrence = val;
            }
            // Debounced render while sliding
            debouncedRender();
        });

        // Also handle change for final value
        thresholdInput.addEventListener('change', (e) => {
            renderNetwork();
        });
    }

    if (maxNodesInput) {
        maxNodesInput.addEventListener('change', (e) => {
            networkMaxNodes = parseInt(e.target.value) || NETWORK_DEFAULTS.maxNodes;
            renderNetwork();
        });
    }

    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', resetNetworkZoom);
    }

    // Color mode select
    const colorModeSelect = elements.getById('network-color-mode');
    if (colorModeSelect) {
        colorModeSelect.addEventListener('change', (e) => {
            networkColorMode = e.target.value;
            renderNetwork();
        });
    }

    // Hide ego checkbox
    const hideEgoCheckbox = elements.getById('network-hide-ego');
    if (hideEgoCheckbox) {
        hideEgoCheckbox.addEventListener('change', (e) => {
            networkHideEgo = e.target.checked;
            renderNetwork();
        });
    }

    log.init('Network view initialized');
}

function updateNetworkTypeOptions() {
    const typeSelect = elements.getById('network-type');
    if (!typeSelect) return;

    // Check if we have subjects data
    const hasSubjects = allLetters.some(l =>
        l.mentions?.subjects && l.mentions.subjects.length > 0
    );

    // Update options
    typeSelect.innerHTML = `
        <option value="contemporaries">Zeitgenossen</option>
        ${hasSubjects ? '<option value="topics">Themen-Netzwerk</option>' : ''}
    `;

    updateNetworkThresholdLabel();
}

function updateNetworkThresholdLabel() {
    const label = elements.getById('network-threshold-label');
    const input = elements.getById('network-threshold');
    const valueDisplay = elements.getById('network-threshold-value');
    const colorGroup = elements.getById('network-color-group');

    if (!label || !input) return;

    if (networkType === 'contemporaries') {
        label.textContent = 'Min. gemeinsame Jahre:';
        input.value = networkMinYears;
        input.min = 1;
        input.max = NETWORK_DEFAULTS.maxYearsSlider;
        if (valueDisplay) valueDisplay.textContent = networkMinYears;
        // Show color mode selector for contemporaries
        if (colorGroup) colorGroup.style.display = '';
    } else if (networkType === 'topics') {
        label.textContent = 'Min. Co-Occurrence:';
        input.value = networkMinCooccurrence;
        input.min = 1;
        input.max = NETWORK_DEFAULTS.maxNodesSlider;
        if (valueDisplay) valueDisplay.textContent = networkMinCooccurrence;
        // Hide color mode selector for topics (entry year not applicable)
        if (colorGroup) colorGroup.style.display = 'none';
        // Reset to type color mode when switching to topics
        networkColorMode = 'type';
        const colorSelect = elements.getById('network-color-mode');
        if (colorSelect) colorSelect.value = 'type';
    }
}

// Build contemporaries network: persons who correspond in the same years
function buildContemporariesNetwork(letters, minYears = NETWORK_DEFAULTS.minYears, maxNodes = NETWORK_DEFAULTS.maxNodes) {
    // Group letters by year and person
    const yearPersons = new Map();
    const personInfo = new Map();

    letters.forEach(letter => {
        const year = letter.year;
        const senderId = letter.sender?.id || letter.sender?.name;
        const senderName = letter.sender?.name;

        if (!year || !senderId || !senderName) return;

        // Track person info
        if (!personInfo.has(senderId)) {
            personInfo.set(senderId, {
                id: senderId,
                name: senderName,
                years: new Set(),
                letterCount: 0,
                firstYear: year,
                lastYear: year
            });
        }
        const info = personInfo.get(senderId);
        info.years.add(year);
        info.letterCount++;
        info.firstYear = Math.min(info.firstYear, year);
        info.lastYear = Math.max(info.lastYear, year);

        // Track year -> persons
        if (!yearPersons.has(year)) {
            yearPersons.set(year, new Set());
        }
        yearPersons.get(year).add(senderId);
    });

    // Calculate shared years between person pairs
    const edges = new Map();
    const persons = Array.from(personInfo.values());

    for (let i = 0; i < persons.length; i++) {
        for (let j = i + 1; j < persons.length; j++) {
            const p1 = persons[i];
            const p2 = persons[j];

            // Count shared years
            const sharedYears = [...p1.years].filter(y => p2.years.has(y));

            if (sharedYears.length >= minYears) {
                const edgeKey = [p1.id, p2.id].sort().join('|');
                edges.set(edgeKey, {
                    source: p1.id,
                    target: p2.id,
                    sourceName: p1.name,
                    targetName: p2.name,
                    sharedYears: sharedYears.length,
                    yearRange: [Math.min(...sharedYears), Math.max(...sharedYears)]
                });
            }
        }
    }

    // Sort edges and limit nodes
    let filteredEdges = Array.from(edges.values());
    filteredEdges.sort((a, b) => b.sharedYears - a.sharedYears);

    // Get active nodes
    const activeNodeIds = new Set();
    filteredEdges.forEach(e => {
        activeNodeIds.add(e.source);
        activeNodeIds.add(e.target);
    });

    let nodes = persons
        .filter(p => activeNodeIds.has(p.id))
        .map(p => ({
            id: p.id,
            name: p.name,
            total: p.letterCount,
            yearsActive: p.years.size,
            firstYear: p.firstYear,
            lastYear: p.lastYear
        }));

    // Limit to top nodes by letter count
    if (nodes.length > maxNodes) {
        nodes.sort((a, b) => b.total - a.total);
        const topNodeIds = new Set(nodes.slice(0, maxNodes).map(n => n.id));
        nodes = nodes.filter(n => topNodeIds.has(n.id));
        filteredEdges = filteredEdges.filter(e =>
            topNodeIds.has(e.source) && topNodeIds.has(e.target)
        );
    }

    return {
        nodes,
        links: filteredEdges,
        networkType: 'contemporaries',
        stats: {
            totalPersons: personInfo.size,
            totalConnections: edges.size,
            displayedPersons: nodes.length,
            displayedConnections: filteredEdges.length
        }
    };
}

// Build topic co-occurrence network
function buildTopicsNetwork(letters, minCooccurrence = NETWORK_DEFAULTS.minCooccurrence, maxNodes = NETWORK_DEFAULTS.maxNodes) {
    const topicInfo = new Map();
    const cooccurrence = new Map();

    letters.forEach(letter => {
        const subjects = letter.mentions?.subjects || [];
        if (subjects.length < 2) return;

        // Track topic info
        subjects.forEach(s => {
            const sid = s.id || s.label;
            if (!sid) return;
            if (!topicInfo.has(sid)) {
                topicInfo.set(sid, {
                    id: sid,
                    label: s.label || sid,
                    letterCount: 0
                });
            }
            topicInfo.get(sid).letterCount++;
        });

        // Track co-occurrences
        for (let i = 0; i < subjects.length; i++) {
            for (let j = i + 1; j < subjects.length; j++) {
                const s1 = subjects[i].id || subjects[i].label;
                const s2 = subjects[j].id || subjects[j].label;
                if (!s1 || !s2) continue;

                const edgeKey = [s1, s2].sort().join('|');
                if (!cooccurrence.has(edgeKey)) {
                    cooccurrence.set(edgeKey, {
                        source: s1,
                        target: s2,
                        sourceName: subjects[i].label || s1,
                        targetName: subjects[j].label || s2,
                        count: 0
                    });
                }
                cooccurrence.get(edgeKey).count++;
            }
        }
    });

    // Filter by minimum co-occurrence
    let filteredEdges = Array.from(cooccurrence.values())
        .filter(e => e.count >= minCooccurrence);
    filteredEdges.sort((a, b) => b.count - a.count);

    // Get active topics
    const activeTopicIds = new Set();
    filteredEdges.forEach(e => {
        activeTopicIds.add(e.source);
        activeTopicIds.add(e.target);
    });

    let nodes = Array.from(topicInfo.values())
        .filter(t => activeTopicIds.has(t.id))
        .map(t => ({
            id: t.id,
            name: t.label,
            total: t.letterCount
        }));

    // Limit to top nodes
    if (nodes.length > maxNodes) {
        nodes.sort((a, b) => b.total - a.total);
        const topNodeIds = new Set(nodes.slice(0, maxNodes).map(n => n.id));
        nodes = nodes.filter(n => topNodeIds.has(n.id));
        filteredEdges = filteredEdges.filter(e =>
            topNodeIds.has(e.source) && topNodeIds.has(e.target)
        );
    }

    return {
        nodes,
        links: filteredEdges,
        networkType: 'topics',
        stats: {
            totalTopics: topicInfo.size,
            totalConnections: cooccurrence.size,
            displayedTopics: nodes.length,
            displayedConnections: filteredEdges.length
        }
    };
}

function renderNetwork() {
    const container = elements.getById('network-graph');
    if (!container) return;

    // Build network data based on selected type
    let data;
    if (networkType === 'topics') {
        data = buildTopicsNetwork(filteredLetters, networkMinCooccurrence, networkMaxNodes);
    } else {
        data = buildContemporariesNetwork(filteredLetters, networkMinYears, networkMaxNodes);
    }

    // Filter out ego node if requested (node with most connections)
    let egoNodeId = null;
    if (networkHideEgo && data.nodes.length > 0) {
        // Count connections per node
        const connectionCount = new Map();
        data.nodes.forEach(n => connectionCount.set(n.id, 0));
        data.links.forEach(l => {
            connectionCount.set(l.source, (connectionCount.get(l.source) || 0) + 1);
            connectionCount.set(l.target, (connectionCount.get(l.target) || 0) + 1);
        });

        // Find ego (most connected node)
        let maxConnections = 0;
        connectionCount.forEach((count, id) => {
            if (count > maxConnections) {
                maxConnections = count;
                egoNodeId = id;
            }
        });

        // Remove ego node and its edges
        if (egoNodeId) {
            data.nodes = data.nodes.filter(n => n.id !== egoNodeId);
            data.links = data.links.filter(l =>
                l.source !== egoNodeId && l.target !== egoNodeId
            );
        }
    }

    // Color scale for entry year mode (contemporaries only) - calculated early for legend
    let yearColorScale = null;
    let minYear = null;
    let maxYear = null;
    if (networkColorMode === 'entry' && networkType === 'contemporaries') {
        const years = data.nodes.map(n => n.firstYear).filter(y => y != null);
        if (years.length > 0) {
            minYear = Math.min(...years);
            maxYear = Math.max(...years);
            // Use a sequential color scale from yellow (early) to dark blue (late)
            yearColorScale = d3.scaleSequential(d3.interpolateYlGnBu)
                .domain([minYear, maxYear]);
        }
    }

    // Update stats display
    const nodeCount = elements.getById('network-node-count');
    const edgeCount = elements.getById('network-edge-count');
    const coverageDiv = elements.getById('network-coverage');
    const infoText = elements.getById('network-info-text');

    if (nodeCount) nodeCount.textContent = data.nodes.length;
    if (edgeCount) edgeCount.textContent = data.links.length;

    // Update info text based on network type
    if (infoText) {
        if (networkType === 'topics') {
            infoText.textContent = 'Themen die gemeinsam in Briefen erwaehnt werden';
        } else {
            infoText.textContent = 'Korrespondenten die in denselben Jahren aktiv sind';
        }
    }

    // Update network legend based on type and color mode
    const legendDiv = elements.getById('network-legend');
    if (legendDiv) {
        const label = networkType === 'topics' ? 'Themen-Netzwerk' : 'Zeitgenossen-Netzwerk';
        const sizeHint = networkType === 'topics'
            ? 'Groesse = Anzahl Briefe'
            : 'Groesse = Briefmenge';

        // Check if entry year coloring is active
        if (networkColorMode === 'entry' && networkType === 'contemporaries' && minYear && maxYear) {
            legendDiv.innerHTML = `
                <div class="legend-item">
                    <span class="legend-gradient" style="background: linear-gradient(to right, ${yearColorScale(minYear)}, ${yearColorScale((minYear + maxYear) / 2)}, ${yearColorScale(maxYear)});"></span>
                    <span class="legend-years">${minYear} - ${maxYear}</span>
                </div>
                <div class="legend-size-hint"><i class="fas fa-circle"></i> ${sizeHint}</div>
                <div class="legend-hint">Farbe = Eintrittsjahr | Hover zeigt Verbindungen</div>
            `;
        } else {
            const color = networkType === 'topics' ? '#f59e0b' : '#3b82f6';
            legendDiv.innerHTML = `
                <div class="legend-item">
                    <span class="legend-circle" style="background: ${color};"></span> ${label}
                </div>
                <div class="legend-size-hint"><i class="fas fa-circle"></i> ${sizeHint}</div>
                <div class="legend-hint">Klick filtert Briefe | Hover zeigt Verbindungen</div>
            `;
        }
    }

    // Update coverage info
    if (coverageDiv) {
        if (networkType === 'topics') {
            const pct = data.stats.totalTopics > 0
                ? Math.round((data.stats.displayedTopics / data.stats.totalTopics) * 100) : 0;
            coverageDiv.innerHTML = `
                <span class="coverage-info">
                    Anzeige: ${data.stats.displayedTopics} von ${data.stats.totalTopics} Themen (${pct}%)
                    | ${data.stats.displayedConnections} von ${data.stats.totalConnections} Verbindungen
                </span>
            `;
        } else {
            const pct = data.stats.totalPersons > 0
                ? Math.round((data.stats.displayedPersons / data.stats.totalPersons) * 100) : 0;
            coverageDiv.innerHTML = `
                <span class="coverage-info">
                    Anzeige: ${data.stats.displayedPersons} von ${data.stats.totalPersons} Personen (${pct}%)
                    | ${data.stats.displayedConnections} von ${data.stats.totalConnections} Verbindungen
                </span>
            `;
        }
    }

    // Clear previous
    container.innerHTML = '';

    if (data.nodes.length === 0) {
        const thresholdText = networkType === 'topics'
            ? `mindestens ${networkMinCooccurrence} gemeinsamen Erwaehungen`
            : `mindestens ${networkMinYears} gemeinsamen Jahren`;
        container.innerHTML = `
            <div class="network-empty">
                <i class="fas fa-project-diagram"></i>
                <p>Keine Verbindungen mit ${thresholdText} gefunden.</p>
                <p>Versuchen Sie, den Schwellenwert zu reduzieren.</p>
            </div>
        `;
        return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Create SVG
    networkSvg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, width, height]);

    // Create container for zoom
    const g = networkSvg.append('g');

    // Setup zoom
    networkZoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    networkSvg.call(networkZoom);

    // Calculate node sizes
    const maxTotal = Math.max(...data.nodes.map(n => n.total));
    const nodeScale = d3.scaleSqrt()
        .domain([1, maxTotal])
        .range([8, 35]);

    // Calculate edge widths based on network type
    const edgeValueFn = networkType === 'topics'
        ? d => d.count
        : d => d.sharedYears;
    const maxEdgeValue = Math.max(...data.links.map(edgeValueFn));
    const minEdgeValue = networkType === 'topics' ? networkMinCooccurrence : networkMinYears;
    const edgeScale = d3.scaleLinear()
        .domain([minEdgeValue, maxEdgeValue])
        .range([1, 8]);

    // Color for network types
    const typeColor = networkType === 'topics' ? '#f59e0b' : '#3b82f6';

    // Node color function (uses yearColorScale defined earlier if in entry mode)
    const getNodeColor = (d) => {
        if (yearColorScale && d.firstYear != null) {
            return yearColorScale(d.firstYear);
        }
        return typeColor;
    };

    // Create simulation
    networkSimulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links)
            .id(d => d.id)
            .distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => nodeScale(d.total) + 5));

    // Dynamic edge opacity based on number of links (more links = more transparent)
    const baseOpacity = data.links.length > 300 ? 0.15 :
                        data.links.length > 100 ? 0.3 :
                        data.links.length > 50 ? 0.4 : 0.5;

    // Draw edges
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', baseOpacity)
        .attr('stroke-width', d => edgeScale(edgeValueFn(d)));

    // Draw nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Node circles
    node.append('circle')
        .attr('r', d => nodeScale(d.total))
        .attr('fill', d => getNodeColor(d))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

    // Node labels (only for larger nodes)
    node.filter(d => d.total > maxTotal * 0.15)
        .append('text')
        .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
        .attr('x', d => nodeScale(d.total) + 5)
        .attr('y', 4)
        .attr('font-size', '11px')
        .attr('fill', '#333');

    // Tooltips
    if (networkType === 'topics') {
        node.append('title')
            .text(d => `${d.name}\n${d.total} Briefe`);
        link.append('title')
            .text(d => `${d.sourceName} + ${d.targetName}\n${d.count}x gemeinsam erwaehnt`);
    } else {
        node.append('title')
            .text(d => {
                let text = `${d.name}\n${d.total} Briefe\n${d.yearsActive} Jahre aktiv`;
                if (d.firstYear) text += `\nErster Brief: ${d.firstYear}`;
                return text;
            });
        link.append('title')
            .text(d => `${d.sourceName} & ${d.targetName}\n${d.sharedYears} gemeinsame Jahre\n(${d.yearRange[0]}-${d.yearRange[1]})`);
    }

    // Click handler
    node.on('click', (event, d) => {
        event.stopPropagation();
        if (networkType === 'topics') {
            applySubjectFilter(d.id);
        } else {
            applyPersonFilter(d.id);
        }
        switchView('letters');
    });

    // Hover highlight - show only connected edges and dim others
    node.on('mouseenter', (event, d) => {
        // Find connected node IDs
        const connectedIds = new Set();
        connectedIds.add(d.id);
        data.links.forEach(l => {
            if (l.source.id === d.id) connectedIds.add(l.target.id);
            if (l.target.id === d.id) connectedIds.add(l.source.id);
        });

        // Highlight connected edges, dim others
        link.attr('stroke-opacity', l =>
            (l.source.id === d.id || l.target.id === d.id) ? 0.8 : baseOpacity * 0.2
        ).attr('stroke', l =>
            (l.source.id === d.id || l.target.id === d.id) ? '#666' : '#999'
        );

        // Dim unconnected nodes
        node.select('circle').attr('opacity', n =>
            connectedIds.has(n.id) ? 1 : 0.3
        );
        node.select('text').attr('opacity', n =>
            connectedIds.has(n.id) ? 1 : 0.3
        );
    });

    node.on('mouseleave', () => {
        // Reset all edges
        link.attr('stroke-opacity', baseOpacity)
            .attr('stroke', '#999');
        // Reset all nodes
        node.select('circle').attr('opacity', 1);
        node.select('text').attr('opacity', 1);
    });

    // Update positions on simulation tick
    networkSimulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
        if (!event.active) networkSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) networkSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

function resetNetworkZoom() {
    if (networkSvg && networkZoom) {
        networkSvg.transition().duration(500).call(networkZoom.transform, d3.zoomIdentity);
    }
}

// ===================
// MISSING PLACES MODAL
// ===================

function initMissingPlacesModal() {
    const modal = elements.getById('missing-places-modal');
    const closeBtn = modal?.querySelector('.modal-close');

    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

function showMissingPlacesModal() {
    const modal = elements.getById('missing-places-modal');
    const body = elements.getById('missing-places-body');

    if (!modal || !body) return;

    // Collect all places from letters
    const allPlacesFromLetters = new Map();
    const placesIndex = dataIndices.places || {};

    allLetters.forEach(letter => {
        if (!letter.place_sent) return;

        const placeId = letter.place_sent.geonames_id;
        const placeName = letter.place_sent.name;

        if (!placeId || !placeName) return;

        // Check if this place has coordinates
        let hasCoords = false;

        // Check in letter data
        if (letter.place_sent.lat && letter.place_sent.lon) {
            hasCoords = true;
        }

        // Check in places index
        if (!hasCoords && placesIndex[placeId]) {
            const indexed = placesIndex[placeId];
            if (indexed.lat && indexed.lon) {
                hasCoords = true;
            }
        }

        // Check in placeAggregation (already filtered for coords)
        if (!hasCoords && placeAggregation[placeId]) {
            hasCoords = true;
        }

        if (!hasCoords) {
            if (!allPlacesFromLetters.has(placeId)) {
                allPlacesFromLetters.set(placeId, {
                    id: placeId,
                    name: placeName,
                    letterCount: 0
                });
            }
            allPlacesFromLetters.get(placeId).letterCount++;
        }
    });

    // Sort by letter count
    const missingPlaces = Array.from(allPlacesFromLetters.values())
        .sort((a, b) => b.letterCount - a.letterCount);

    // Render list
    if (missingPlaces.length === 0) {
        body.innerHTML = '<p class="empty-state">Alle Orte haben Koordinaten.</p>';
    } else {
        const geonamesBase = 'https://www.geonames.org/';
        body.innerHTML = `
            <p class="missing-places-intro">${missingPlaces.length} Orte ohne Koordinaten gefunden:</p>
            <div class="missing-places-list">
                ${missingPlaces.map(place => `
                    <div class="missing-place-item">
                        <span class="missing-place-name">${escapeHtml(place.name)}</span>
                        <span class="missing-place-count">${place.letterCount} ${place.letterCount === 1 ? 'Brief' : 'Briefe'}</span>
                        ${place.id ? `<a href="${geonamesBase}${place.id}" target="_blank" class="missing-place-link" title="GeoNames"><i class="fas fa-external-link-alt"></i></a>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    modal.style.display = 'flex';
}

// ============================================
// Mentions Flow View
// ============================================

function initMentionsFlowView() {
    log.init('Initializing Mentions Flow View');

    // Initialize autocomplete for person selection
    initMentionsPersonAutocomplete();
}

function initMentionsPersonAutocomplete() {
    const input = elements.getById('mentions-person-search');
    const dropdown = elements.getById('mentions-person-dropdown');
    if (!input || !dropdown) return;

    let highlightedIndex = -1;
    let currentResults = [];

    // Build persons list for autocomplete
    function getPersonsWithMentions() {
        const personsMap = new Map();

        filteredLetters.forEach(letter => {
            // Count how many times each person is mentioned
            const mentions = letter.mentions?.persons || [];
            mentions.forEach(person => {
                const id = person.id || person.name;
                const name = person.name || id;
                if (!personsMap.has(id)) {
                    personsMap.set(id, { id, name, mentionCount: 0 });
                }
                personsMap.get(id).mentionCount++;
            });

            // Also count correspondents who mention others
            const senderId = letter.sender?.id;
            const senderName = letter.sender?.name;
            if (senderId && mentions.length > 0) {
                if (!personsMap.has(senderId)) {
                    personsMap.set(senderId, { id: senderId, name: senderName, mentionCount: 0 });
                }
            }
        });

        // Filter out entries with 0 mentions and sort by count
        return Array.from(personsMap.values())
            .filter(p => p.mentionCount > 0)
            .sort((a, b) => b.mentionCount - a.mentionCount);
    }

    function renderDropdown(results) {
        currentResults = results;
        highlightedIndex = -1;

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="autocomplete-empty">Keine Treffer</div>';
            dropdown.classList.remove('hidden');
            return;
        }

        // Show all results - scrollable dropdown handles large lists
        dropdown.innerHTML = results.map((person, i) => `
            <div class="autocomplete-item" data-index="${i}" data-id="${person.id}">
                <span class="autocomplete-item-name">${escapeHtml(person.name)}</span>
                <span class="autocomplete-item-count">${person.mentionCount}</span>
            </div>
        `).join('');

        dropdown.classList.remove('hidden');
    }

    function selectPerson(person) {
        selectedMentionsPerson = person;
        input.value = person.name;
        dropdown.classList.add('hidden');

        // Update selected person display
        const selectedDisplay = elements.getById('mentions-flow-selected-person');
        if (selectedDisplay) {
            selectedDisplay.innerHTML = `<strong>${escapeHtml(person.name)}</strong> - ${person.mentionCount} Erwaehnungen`;
        }

        // Render the flow for this person
        renderMentionsFlowForPerson(person);
    }

    // Input event - filter as user types
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (query.length < 1) {
            // Show all alphabetically when empty
            const allPersons = getPersonsWithMentions();
            const sorted = allPersons.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            renderDropdown(sorted);
            return;
        }

        const allPersons = getPersonsWithMentions();
        // Split query into words for multi-word search
        const queryWords = query.split(/\s+/);
        const filtered = allPersons.filter(p => {
            const nameLower = p.name.toLowerCase();
            // All query words must be found in the name
            return queryWords.every(word => nameLower.includes(word));
        });

        // Sort filtered results: exact matches first, then by mention count
        filtered.sort((a, b) => {
            const aStartsWith = a.name.toLowerCase().startsWith(query);
            const bStartsWith = b.name.toLowerCase().startsWith(query);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return b.mentionCount - a.mentionCount;
        });

        renderDropdown(filtered);
    });

    // Focus - show all persons alphabetically sorted
    input.addEventListener('focus', () => {
        const allPersons = getPersonsWithMentions();
        // Sort alphabetically by name
        const sorted = allPersons.sort((a, b) => a.name.localeCompare(b.name, 'de'));
        renderDropdown(sorted);
    });

    // Click outside - close dropdown
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (dropdown.classList.contains('hidden')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, currentResults.length - 1);
            updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            updateHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && currentResults[highlightedIndex]) {
                selectPerson(currentResults[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.add('hidden');
        }
    });

    function updateHighlight() {
        dropdown.querySelectorAll('.autocomplete-item').forEach((item, i) => {
            item.classList.toggle('highlighted', i === highlightedIndex);
        });
    }

    // Click on dropdown item
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            if (currentResults[index]) {
                selectPerson(currentResults[index]);
            }
        }
    });
}

function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'mentions-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.background = 'var(--color-background-elevated)';
    tooltip.style.border = '1px solid var(--color-border)';
    tooltip.style.borderRadius = '4px';
    tooltip.style.padding = '8px 12px';
    tooltip.style.fontSize = '13px';
    tooltip.style.lineHeight = '1.5';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '10000';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    document.body.appendChild(tooltip);
    return tooltip;
}

function renderMentionsFlow() {
    const placeholder = elements.mentionsFlowPlaceholder;

    // If no person selected, auto-select the most mentioned person
    if (!selectedMentionsPerson) {
        const personsMap = new Map();
        filteredLetters.forEach(letter => {
            const mentions = letter.mentions?.persons || [];
            mentions.forEach(person => {
                const id = person.id || person.name;
                const name = person.name || id;
                if (!personsMap.has(id)) {
                    personsMap.set(id, { id, name, mentionCount: 0 });
                }
                personsMap.get(id).mentionCount++;
            });
        });

        const sortedPersons = Array.from(personsMap.values())
            .sort((a, b) => b.mentionCount - a.mentionCount);

        if (sortedPersons.length > 0) {
            selectedMentionsPerson = sortedPersons[0];
            // Update input field and ensure dropdown is closed
            const input = elements.getById('mentions-person-search');
            const dropdown = elements.getById('mentions-person-dropdown');
            if (input) {
                input.value = selectedMentionsPerson.name;
            }
            if (dropdown) {
                dropdown.classList.add('hidden');
            }
        }
    }

    if (placeholder) {
        if (!selectedMentionsPerson) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Keine Personen mit Erwahnungen im Datensatz</p>';
        } else {
            renderMentionsFlowForPerson(selectedMentionsPerson);
        }
    }
}

function renderMentionsFlowForPerson(person) {
    const container = elements.getById('mentions-flow-graph');
    const placeholder = elements.mentionsFlowPlaceholder;

    if (!container) return;

    // Clear previous
    container.innerHTML = '';

    // Build data for this specific person
    // Two scenarios:
    // 1. Person is a correspondent (sender) - show who they mention
    // 2. Person is mentioned - show who mentions them

    const mentionedByPerson = [];  // Person mentions these people
    const personMentionedBy = [];  // These people mention the person

    filteredLetters.forEach(letter => {
        const senderId = letter.sender?.id;
        const senderName = letter.sender?.name || 'Unbekannt';
        const mentions = letter.mentions?.persons || [];

        // Check if this person is the sender - show who they mention
        if (senderId === person.id) {
            mentions.forEach(m => {
                const mentionId = m.id || m.name;
                // Skip self-references
                if (mentionId === person.id) return;

                const existingIdx = mentionedByPerson.findIndex(x => x.id === mentionId);
                if (existingIdx >= 0) {
                    mentionedByPerson[existingIdx].count++;
                } else {
                    mentionedByPerson.push({
                        id: mentionId,
                        name: m.name || m.id,
                        count: 1
                    });
                }
            });
        }

        // Check if this person is mentioned in the letter
        const isMentioned = mentions.some(m => (m.id || m.name) === person.id);
        // Skip if sender is the same person (self-reference)
        if (isMentioned && senderId && senderId !== person.id) {
            const existingIdx = personMentionedBy.findIndex(x => x.id === senderId);
            if (existingIdx >= 0) {
                personMentionedBy[existingIdx].count++;
            } else {
                personMentionedBy.push({
                    id: senderId,
                    name: senderName,
                    count: 1
                });
            }
        }
    });

    // Sort by count
    mentionedByPerson.sort((a, b) => b.count - a.count);
    personMentionedBy.sort((a, b) => b.count - a.count);

    if (mentionedByPerson.length === 0 && personMentionedBy.length === 0) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Keine Mentions-Daten fuer diese Person</p>';
        return;
    }

    placeholder.style.display = 'none';

    // Build simple Sankey: Left = who mentions person, Center = person, Right = who person mentions
    const nodes = [];
    const links = [];
    const nodeIndexMap = new Map();

    // Add "mentioned by" nodes on the left
    personMentionedBy.slice(0, 15).forEach(p => {
        const idx = nodes.length;
        nodeIndexMap.set('left-' + p.id, idx);
        nodes.push({ name: p.name, id: p.id, column: 0 });
    });

    // Add central person
    const centerIdx = nodes.length;
    nodeIndexMap.set('center-' + person.id, centerIdx);
    nodes.push({ name: person.name, id: person.id, column: 1, isCenter: true });

    // Add "mentions" nodes on the right
    mentionedByPerson.slice(0, 15).forEach(p => {
        const idx = nodes.length;
        nodeIndexMap.set('right-' + p.id, idx);
        nodes.push({ name: p.name, id: p.id, column: 2 });
    });

    // Create links from left to center
    personMentionedBy.slice(0, 15).forEach(p => {
        links.push({
            source: nodeIndexMap.get('left-' + p.id),
            target: centerIdx,
            value: p.count
        });
    });

    // Create links from center to right
    mentionedByPerson.slice(0, 15).forEach(p => {
        links.push({
            source: centerIdx,
            target: nodeIndexMap.get('right-' + p.id),
            value: p.count
        });
    });

    if (nodes.length < 2 || links.length === 0) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Zu wenig Daten fuer Visualisierung</p>';
        return;
    }

    // Render Sankey with zoom/pan
    const width = container.clientWidth || 900;
    const height = Math.max(400, nodes.length * 30);
    const headerHeight = 40; // Space for column labels

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height + headerHeight)
        .style('cursor', 'grab');

    // Column labels (outside zoom group, always visible)
    const labelGroup = svg.append('g')
        .attr('class', 'column-labels');

    // Determine which columns have data
    const hasLeftColumn = personMentionedBy.length > 0;
    const hasRightColumn = mentionedByPerson.length > 0;

    // Left column: People who mention the selected person (only show if data exists)
    if (hasLeftColumn) {
        labelGroup.append('text')
            .attr('x', 20)
            .attr('y', 20)
            .attr('text-anchor', 'start')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#2c5f8d')
            .text('ERWAEHNT VON');

        labelGroup.append('text')
            .attr('x', 20)
            .attr('y', 32)
            .attr('text-anchor', 'start')
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-light)')
            .text('(diese Absender erwaehnen die Person)');
    }

    // Center: Selected person
    labelGroup.append('text')
        .attr('x', width / 2)
        .attr('y', 26)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', PRIMARY_COLOR)
        .text('PERSON');

    // Right column: People mentioned by the selected person (only show if data exists)
    if (hasRightColumn) {
        labelGroup.append('text')
            .attr('x', width - 20)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#f59e0b')
            .text('ERWAEHNT');

        labelGroup.append('text')
            .attr('x', width - 20)
            .attr('y', 32)
            .attr('text-anchor', 'end')
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-light)')
            .text('(von der Person in Briefen erwaehnt)');
    }

    // Zoomable content group
    const g = svg.append('g')
        .attr('transform', `translate(0, ${headerHeight})`);

    // Sankey generator
    const sankeyGenerator = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .extent([[80, 10], [width - 80, height - 10]]);

    const { nodes: layoutNodes, links: layoutLinks } = sankeyGenerator({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    // Gradients
    const defs = svg.append('defs');
    layoutLinks.forEach((link, i) => {
        const gradient = defs.append('linearGradient')
            .attr('id', `person-link-gradient-${i}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', link.source.x1)
            .attr('x2', link.target.x0);

        const sourceColor = link.source.isCenter ? PRIMARY_COLOR : '#2c5f8d';
        const targetColor = link.target.isCenter ? PRIMARY_COLOR : '#f59e0b';

        gradient.append('stop').attr('offset', '0%').attr('stop-color', sourceColor);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', targetColor);
    });

    // Create tooltip
    let tooltip = document.getElementById('sankey-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'sankey-tooltip';
        tooltip.style.cssText = 'position:fixed;display:none;background:#fff;border:2px solid var(--color-border);border-radius:4px;padding:8px 12px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1000;pointer-events:none;max-width:300px;';
        document.body.appendChild(tooltip);
    }

    // Links with hover and click
    const linkGroup = g.append('g');
    const linkPaths = linkGroup.selectAll('path')
        .data(layoutLinks)
        .join('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke', (d, i) => `url(#person-link-gradient-${i})`)
        .attr('stroke-width', d => Math.max(2, d.width))
        .attr('fill', 'none')
        .attr('opacity', 0.6)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 0.9);
            const sourceName = d.source.name;
            const targetName = d.target.name;
            const isLeftToCenter = d.source.column === 0;
            const text = isLeftToCenter
                ? `<strong>${sourceName}</strong> erwaehnt <strong>${targetName}</strong> in ${d.value} Brief(en)`
                : `<strong>${sourceName}</strong> erwaehnt <strong>${targetName}</strong> in ${d.value} Brief(en)`;
            tooltip.innerHTML = text;
            tooltip.style.display = 'block';
        })
        .on('mousemove', function(event) {
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.6);
            tooltip.style.display = 'none';
        })
        .on('click', function(event, d) {
            event.stopPropagation();
            // Show letters where source mentions target
            const senderId = d.source.column === 0 ? d.source.id : (d.source.isCenter ? person.id : null);
            const mentionedId = d.target.column === 2 ? d.target.id : (d.target.isCenter ? person.id : null);
            if (senderId && mentionedId) {
                showMentionLetters(senderId, mentionedId, d.source.name, d.target.name);
            }
        });

    // Nodes with click to navigate
    const node = g.append('g')
        .selectAll('g')
        .data(layoutNodes)
        .join('g')
        .attr('class', d => d.isCenter ? 'sankey-node sankey-node-center' : 'sankey-node sankey-node-clickable')
        .style('cursor', d => d.isCenter ? 'default' : 'pointer')
        .on('click', function(event, d) {
            if (d.isCenter) return; // Don't navigate to self
            event.stopPropagation();
            // Navigate to this person
            const newPerson = { id: d.id, name: d.name, mentionCount: d.value || 0 };
            selectedMentionsPerson = newPerson;
            const input = elements.getById('mentions-person-search');
            if (input) input.value = d.name;
            renderMentionsFlowForPerson(newPerson);
        })
        .on('mouseover', function(event, d) {
            if (d.isCenter) return;
            // Visual hover feedback: brighten rect and underline text
            d3.select(this).select('rect')
                .transition().duration(150)
                .attr('opacity', 0.7)
                .attr('stroke', 'var(--color-text)')
                .attr('stroke-width', 2);
            d3.select(this).select('text')
                .transition().duration(150)
                .style('text-decoration', 'underline')
                .style('fill', 'var(--color-primary)');
            tooltip.innerHTML = `<strong>${d.name}</strong><br>Klicken um zu dieser Person zu wechseln`;
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
        })
        .on('mousemove', function(event) {
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
        })
        .on('mouseout', function(event, d) {
            if (d.isCenter) return;
            // Reset visual feedback
            d3.select(this).select('rect')
                .transition().duration(150)
                .attr('opacity', 1)
                .attr('stroke', 'none')
                .attr('stroke-width', 0);
            d3.select(this).select('text')
                .transition().duration(150)
                .style('text-decoration', 'none')
                .style('fill', 'var(--color-text)');
            tooltip.style.display = 'none';
        });

    node.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => Math.max(4, d.y1 - d.y0))
        .attr('width', sankeyGenerator.nodeWidth())
        .attr('fill', d => d.isCenter ? PRIMARY_COLOR : (d.column === 0 ? '#2c5f8d' : '#f59e0b'))
        .attr('rx', 3);

    // Labels
    node.append('text')
        .attr('x', d => d.column === 0 ? d.x0 - 8 : (d.column === 2 ? d.x1 + 8 : d.x0 + 10))
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.column === 0 ? 'end' : 'start')
        .text(d => d.name.length > 25 ? d.name.substring(0, 25) + '...' : d.name)
        .style('font-size', d => d.isCenter ? '14px' : '12px')
        .style('font-weight', d => d.isCenter ? '700' : 'normal')
        .style('fill', 'var(--color-text)')
        .style('pointer-events', 'none');

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
            g.attr('transform', `translate(${event.transform.x}, ${event.transform.y + headerHeight}) scale(${event.transform.k})`);
            svg.style('cursor', event.transform.k > 1 ? 'move' : 'grab');
        });

    svg.call(zoom);

    // Add zoom controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'sankey-zoom-controls';
    controlsDiv.innerHTML = `
        <button class="map-control-btn" id="sankey-zoom-in" title="Vergroessern"><i class="fas fa-plus"></i></button>
        <button class="map-control-btn" id="sankey-zoom-out" title="Verkleinern"><i class="fas fa-minus"></i></button>
        <button class="map-control-btn" id="sankey-zoom-reset" title="Zuruecksetzen"><i class="fas fa-compress-arrows-alt"></i></button>
    `;
    container.style.position = 'relative';
    container.appendChild(controlsDiv);

    // Zoom control handlers
    document.getElementById('sankey-zoom-in')?.addEventListener('click', () => {
        svg.transition().call(zoom.scaleBy, 1.3);
    });
    document.getElementById('sankey-zoom-out')?.addEventListener('click', () => {
        svg.transition().call(zoom.scaleBy, 0.7);
    });
    document.getElementById('sankey-zoom-reset')?.addEventListener('click', () => {
        svg.transition().call(zoom.transform, d3.zoomIdentity);
    });

    log.render(`Rendered person flow: ${layoutNodes.length} nodes, ${layoutLinks.length} links`);
}

// Show modal with letters where sender mentions mentionedPerson
function showMentionLetters(senderId, mentionedId, senderName, mentionedName) {
    // Find all letters where sender mentions the person
    const relevantLetters = filteredLetters.filter(letter => {
        const letterSenderId = letter.sender?.id;
        const mentions = letter.mentions?.persons || [];
        const mentionIds = mentions.map(m => m.id || m.name);
        return letterSenderId === senderId && mentionIds.includes(mentionedId);
    });

    if (relevantLetters.length === 0) {
        return;
    }

    // Create modal
    let modal = document.getElementById('mention-letters-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mention-letters-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:700px;max-height:80vh;overflow-y:auto;">
                <div class="modal-header">
                    <h3 id="mention-modal-title"></h3>
                    <button class="modal-close" onclick="document.getElementById('mention-letters-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="mention-modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Populate modal
    document.getElementById('mention-modal-title').textContent =
        `${senderName} erwaehnt ${mentionedName} (${relevantLetters.length} Briefe)`;

    const body = document.getElementById('mention-modal-body');
    body.innerHTML = relevantLetters.slice(0, 50).map(letter => {
        const date = letter.date || 'Datum unbekannt';
        const recipient = letter.recipient?.name || 'Unbekannt';
        const place = letter.place_sent?.name || '';
        return `
            <div style="padding:12px;border-bottom:1px solid var(--color-border-light);cursor:pointer;"
                 onclick="window.openLetterDetail && window.openLetterDetail('${letter.id}')">
                <div style="font-weight:600;color:var(--color-text);">${date}</div>
                <div style="font-size:13px;color:var(--color-text-light);">
                    An: ${recipient}${place ? ' | ' + place : ''}
                </div>
            </div>
        `;
    }).join('');

    if (relevantLetters.length > 50) {
        body.innerHTML += `<div style="padding:12px;color:var(--color-text-light);text-align:center;">... und ${relevantLetters.length - 50} weitere Briefe</div>`;
    }

    modal.style.display = 'flex';
}

// ===================
// CHRONIK VIEW
// ===================

// Chronik view state
let chronikEnriched = false;
let chronikEnrichmentData = new Map();
let chronikSortedLetters = [];
let chronikRenderedCount = 0;
let chronikScrollHandler = null;
let chronikCorrespondenceIndex = null;
let chronikLayout = 'cards'; // 'cards' | 'compact' | 'timeline'
const CHRONIK_BATCH_SIZE = 100;

/**
 * Build correspondence index for relationship context
 * Maps sender→recipient pairs to their letter history
 * @param {Array} letters - Array of letter objects
 * @returns {Map} Index mapping "senderId→recipientId" to correspondence data
 */
function buildCorrespondenceIndex(letters) {
    const index = new Map();

    for (const letter of letters) {
        const senderId = letter.sender?.id || letter.sender?.name;
        const recipientId = letter.recipient?.id || letter.recipient?.name;

        if (!senderId || !recipientId) continue;

        const key = `${senderId}→${recipientId}`;

        if (!index.has(key)) {
            index.set(key, {
                letters: [],
                totalCount: 0
            });
        }

        const entry = index.get(key);
        entry.letters.push({
            id: letter.id,
            year: letter.year,
            date: letter.date
        });
        entry.totalCount++;
    }

    // Sort letters chronologically within each correspondence
    for (const entry of index.values()) {
        entry.letters.sort((a, b) => {
            const dateA = a.date || '9999';
            const dateB = b.date || '9999';
            return dateA.localeCompare(dateB);
        });
        entry.firstLetterId = entry.letters[0]?.id;
    }

    return index;
}

/**
 * Get correspondence context for a letter
 * @param {Object} letter - Letter object
 * @returns {Object} Context with isFirstLetter, letterNumber, totalLetters
 */
function getCorrespondenceContext(letter) {
    if (!chronikCorrespondenceIndex) return null;

    const senderId = letter.sender?.id || letter.sender?.name;
    const recipientId = letter.recipient?.id || letter.recipient?.name;

    if (!senderId || !recipientId) return null;

    const key = `${senderId}→${recipientId}`;
    const entry = chronikCorrespondenceIndex.get(key);

    if (!entry) return null;

    // Find position of this letter in the correspondence
    const letterIndex = entry.letters.findIndex(l => l.id === letter.id);

    return {
        isFirstLetter: letter.id === entry.firstLetterId,
        letterNumber: letterIndex + 1,
        totalLetters: entry.totalCount,
        direction: 'sent'
    };
}

/**
 * Extract birth year from person data (CMIF or Wikidata enrichment)
 * @param {Object} person - Person object from letter
 * @param {Object} enrichment - Wikidata enrichment data (optional)
 * @returns {number|null} Birth year or null
 */
function getPersonBirthYear(person, enrichment) {
    // Priority 1: Wikidata enrichment
    if (enrichment?.birthDate) {
        const match = enrichment.birthDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    // Priority 2: CMIF data (if present)
    if (person?.birthDate) {
        const match = person.birthDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    return null;
}

/**
 * Extract death year from person data (CMIF or Wikidata enrichment)
 * @param {Object} person - Person object from letter
 * @param {Object} enrichment - Wikidata enrichment data (optional)
 * @returns {number|null} Death year or null
 */
function getPersonDeathYear(person, enrichment) {
    // Priority 1: Wikidata enrichment
    if (enrichment?.deathDate) {
        const match = enrichment.deathDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    // Priority 2: CMIF data (if present)
    if (person?.deathDate) {
        const match = person.deathDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    return null;
}

/**
 * Calculate age at time of letter
 * @param {number} birthYear - Birth year
 * @param {Object} letter - Letter object with date/year
 * @returns {number|null} Age or null
 */
function calculateAge(birthYear, letter) {
    if (!birthYear) return null;

    const letterYear = letter.year || (letter.date ? parseInt(letter.date.substring(0, 4), 10) : null);
    if (!letterYear) return null;

    return letterYear - birthYear;
}

/**
 * Build lifespan bar HTML showing where in life the person is at letter time
 * @param {number} birthYear - Birth year
 * @param {number} deathYear - Death year (or null if still alive/unknown)
 * @param {number} age - Age at time of letter
 * @returns {string} HTML for lifespan bar
 */
function buildLifespanBar(birthYear, deathYear, age) {
    if (!birthYear || !age || age < 0) return '';

    // Calculate total lifespan (use death year or estimate 85 if unknown)
    const totalYears = deathYear ? (deathYear - birthYear) : 85;
    const percentage = Math.min(100, Math.round((age / totalYears) * 100));

    const tooltip = deathYear
        ? `${birthYear}-${deathYear} (${totalYears} Jahre)`
        : `*${birthYear}`;

    return `
        <div class="chronik-lifespan" title="${tooltip}">
            <div class="chronik-lifespan-bar">
                <div class="chronik-lifespan-progress" style="width: ${percentage}%"></div>
            </div>
            <span class="chronik-lifespan-age">${age}</span>
        </div>
    `;
}

/**
 * Initialize Chronik view event handlers
 */
function initChronikView() {
    // Layout toggle buttons
    document.querySelectorAll('.chronik-layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layout = btn.dataset.layout;
            if (layout) switchChronikLayout(layout);
        });
    });

    // Open modal button
    const enrichBtn = document.getElementById('chronik-enrich-btn');
    if (enrichBtn) {
        enrichBtn.addEventListener('click', () => {
            openEnrichmentModal();
        });
    }

    // Modal buttons
    const startBtn = document.getElementById('enrichment-start-btn');
    const cancelBtn = document.getElementById('enrichment-cancel-btn');
    const closeBtn = document.getElementById('enrichment-close-btn');
    const modal = document.getElementById('enrichment-modal');

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            await runEnrichment();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            chronikEnrichmentCancelled = true;
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeEnrichmentModal();
        });
    }

    // Close modal on X or backdrop click
    if (modal) {
        modal.querySelector('.modal-close')?.addEventListener('click', closeEnrichmentModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEnrichmentModal();
        });
    }
}

let chronikEnrichmentCancelled = false;

/**
 * Open the enrichment modal
 */
function openEnrichmentModal() {
    const modal = document.getElementById('enrichment-modal');
    if (!modal) return;

    // Count enrichable persons
    const letters = state.getFilteredLetters();
    const personsToEnrich = new Map();

    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            if (!person) return;
            const authority = person.authority || (person.viaf ? 'viaf' : (person.gnd ? 'gnd' : null));
            const authorityId = person.viaf || person.gnd || person.id;
            if (authority && authorityId && !personsToEnrich.has(authorityId)) {
                personsToEnrich.set(authorityId, { name: person.name, authority, authorityId });
            }
        });
    });

    // Update count
    document.getElementById('enrichment-person-count').textContent = personsToEnrich.size;

    // Reset modal state
    document.getElementById('enrichment-info').classList.remove('hidden');
    document.getElementById('enrichment-progress').classList.add('hidden');
    document.getElementById('enrichment-done').classList.add('hidden');
    document.getElementById('enrichment-start-btn').classList.remove('hidden');
    document.getElementById('enrichment-cancel-btn').classList.add('hidden');
    document.getElementById('enrichment-close-btn').classList.add('hidden');

    // Show modal
    modal.classList.remove('hidden');
}

/**
 * Close the enrichment modal
 */
function closeEnrichmentModal() {
    const modal = document.getElementById('enrichment-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Run the enrichment process with progress
 */
async function runEnrichment() {
    chronikEnrichmentCancelled = false;

    // Update UI
    document.getElementById('enrichment-info').classList.add('hidden');
    document.getElementById('enrichment-progress').classList.remove('hidden');
    document.getElementById('enrichment-start-btn').classList.add('hidden');
    document.getElementById('enrichment-cancel-btn').classList.remove('hidden');

    // Collect persons
    const letters = state.getFilteredLetters();
    const personsToEnrich = new Map();

    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            if (!person) return;
            const authority = person.authority || (person.viaf ? 'viaf' : (person.gnd ? 'gnd' : null));
            const authorityId = person.viaf || person.gnd || person.id;
            if (authority && authorityId && !personsToEnrich.has(authorityId)) {
                personsToEnrich.set(authorityId, { name: person.name, authority, authorityId });
            }
        });
    });

    const personsArray = Array.from(personsToEnrich.values());
    const total = personsArray.length;

    document.getElementById('enrichment-total').textContent = total;

    let enrichedCount = 0;
    let notFoundCount = 0;
    const enrichmentStats = {
        withPortrait: 0,
        withBirthDate: 0,
        withDeathDate: 0,
        withProfession: 0,
        withWikipedia: 0
    };
    const liveLog = document.getElementById('enrichment-live-log');
    liveLog.innerHTML = '';

    for (let i = 0; i < personsArray.length; i++) {
        if (chronikEnrichmentCancelled) break;

        const person = personsArray[i];

        // Update progress
        document.getElementById('enrichment-current').textContent = i + 1;
        document.getElementById('enrichment-current-person').textContent = person.name || '';
        document.getElementById('enrichment-progress-bar').style.width = `${((i + 1) / total) * 100}%`;

        try {
            const enriched = await enrichPerson(person.authority, person.authorityId);
            if (enriched) {
                chronikEnrichmentData.set(person.authorityId, enriched);
                if (person.name) chronikEnrichmentData.set(person.name, enriched);
                enrichedCount++;

                // Track what was found
                if (enriched.image) enrichmentStats.withPortrait++;
                if (enriched.birthDate) enrichmentStats.withBirthDate++;
                if (enriched.deathDate) enrichmentStats.withDeathDate++;
                if (enriched.professions?.length > 0) enrichmentStats.withProfession++;
                if (enriched.wikipediaUrl) enrichmentStats.withWikipedia++;

                // Live log entry - show what was found
                const found = [];
                if (enriched.image) found.push('<i class="fas fa-portrait" title="Portrait"></i>');
                if (enriched.birthDate) found.push('<i class="fas fa-baby" title="Geburtsdatum"></i>');
                if (enriched.deathDate) found.push('<i class="fas fa-cross" title="Sterbedatum"></i>');
                if (enriched.professions?.length > 0) found.push('<i class="fas fa-briefcase" title="Beruf"></i>');
                if (enriched.wikipediaUrl) found.push('<i class="fas fa-wikipedia-w" title="Wikipedia"></i>');

                const logEntry = document.createElement('div');
                logEntry.className = 'enrichment-log-entry enrichment-log-success';
                logEntry.innerHTML = `<span class="log-name">${escapeHtml(person.name || 'Unbekannt')}</span> <span class="log-icons">${found.join(' ')}</span>`;
                liveLog.insertBefore(logEntry, liveLog.firstChild);
            } else {
                notFoundCount++;
                const logEntry = document.createElement('div');
                logEntry.className = 'enrichment-log-entry enrichment-log-empty';
                logEntry.innerHTML = `<span class="log-name">${escapeHtml(person.name || 'Unbekannt')}</span> <span class="log-status">keine Daten</span>`;
                liveLog.insertBefore(logEntry, liveLog.firstChild);
            }

            // Keep only last 8 entries visible
            while (liveLog.children.length > 8) {
                liveLog.removeChild(liveLog.lastChild);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(`Failed to enrich ${person.name}:`, error.message);
            notFoundCount++;
        }
    }

    // Done
    chronikEnriched = true;
    renderChronik();
    document.querySelector('.chronik-container')?.classList.add('enriched');
    updateChronikEnrichmentUI();

    // Show done state with summary
    document.getElementById('enrichment-progress').classList.add('hidden');
    document.getElementById('enrichment-done').classList.remove('hidden');
    document.getElementById('enrichment-success-count').textContent = enrichedCount;

    // Build summary
    const summaryEl = document.getElementById('enrichment-summary');
    summaryEl.innerHTML = `
        <div class="enrichment-summary-grid">
            <div class="summary-item"><i class="fas fa-portrait"></i> ${enrichmentStats.withPortrait} Portraits</div>
            <div class="summary-item"><i class="fas fa-baby"></i> ${enrichmentStats.withBirthDate} Geburtsdaten</div>
            <div class="summary-item"><i class="fas fa-cross"></i> ${enrichmentStats.withDeathDate} Sterbedaten</div>
            <div class="summary-item"><i class="fas fa-briefcase"></i> ${enrichmentStats.withProfession} Berufe</div>
            <div class="summary-item"><i class="fas fa-wikipedia-w"></i> ${enrichmentStats.withWikipedia} Wikipedia</div>
            <div class="summary-item summary-empty"><i class="fas fa-times-circle"></i> ${notFoundCount} ohne Daten</div>
        </div>
    `;

    document.getElementById('enrichment-cancel-btn').classList.add('hidden');
    document.getElementById('enrichment-close-btn').classList.remove('hidden');
}

/**
 * Render the Chronik timeline view with lazy loading
 */
function renderChronik() {
    const container = elements.getById('chronik-timeline');
    if (!container) return;

    const letters = state.getFilteredLetters();

    if (!letters || letters.length === 0) {
        container.innerHTML = `
            <div class="chronik-empty">
                <i class="fas fa-scroll"></i>
                <p>Keine Briefe im ausgewaehlten Zeitraum</p>
            </div>
        `;
        chronikSortedLetters = [];
        chronikRenderedCount = 0;
        return;
    }

    // Sort letters by date (oldest first for top-to-bottom timeline)
    chronikSortedLetters = [...letters].sort((a, b) => {
        const dateA = a.date || '9999';
        const dateB = b.date || '9999';
        return dateA.localeCompare(dateB);
    });

    // Build correspondence index for relationship context
    chronikCorrespondenceIndex = buildCorrespondenceIndex(chronikSortedLetters);

    // Reset state
    chronikRenderedCount = 0;
    container.innerHTML = '';

    // Render first batch
    renderChronikBatch(container);

    // Update enrichment button visibility
    updateChronikEnrichmentUI();

    // Setup scroll handler for lazy loading
    setupChronikScrollHandler(container);

    // Show total count info
    const totalCount = chronikSortedLetters.length;
    if (totalCount > CHRONIK_BATCH_SIZE) {
        updateChronikLoadMoreInfo(container, totalCount);
    }

    log.render(`Rendered Chronik: ${Math.min(CHRONIK_BATCH_SIZE, totalCount)} of ${totalCount} letters (lazy loading)`);
}

/**
 * Render a batch of letters to the Chronik
 */
function renderChronikBatch(container) {
    const startIdx = chronikRenderedCount;
    const endIdx = Math.min(startIdx + CHRONIK_BATCH_SIZE, chronikSortedLetters.length);

    if (startIdx >= chronikSortedLetters.length) return;

    // Track current year for year markers
    let currentYear = null;
    if (startIdx > 0 && chronikSortedLetters[startIdx - 1]) {
        const prevLetter = chronikSortedLetters[startIdx - 1];
        currentYear = prevLetter.year || (prevLetter.date ? prevLetter.date.substring(0, 4) : null);
    }

    // Build HTML for this batch
    let html = '';
    for (let i = startIdx; i < endIdx; i++) {
        const letter = chronikSortedLetters[i];
        const year = letter.year || (letter.date ? letter.date.substring(0, 4) : 'Unbekannt');

        // Add year marker if year changed
        if (year !== currentYear) {
            html += `
                <div class="chronik-year-marker">
                    <span class="chronik-year-label">${year}</span>
                </div>
            `;
            currentYear = year;
        }

        html += renderChronikEntry(letter);
    }

    // Append to container
    const fragment = document.createElement('div');
    fragment.innerHTML = html;

    // Add click handlers before appending
    fragment.querySelectorAll('.chronik-entry').forEach(entry => {
        entry.addEventListener('click', () => {
            const letterId = entry.dataset.letterId;
            if (letterId && window.openLetterDetail) {
                window.openLetterDetail(letterId);
            }
        });
    });

    // Move children to container
    while (fragment.firstChild) {
        container.appendChild(fragment.firstChild);
    }

    chronikRenderedCount = endIdx;

    // Update load more info
    if (chronikSortedLetters.length > CHRONIK_BATCH_SIZE) {
        updateChronikLoadMoreInfo(container, chronikSortedLetters.length);
    }
}

/**
 * Setup scroll handler for lazy loading
 */
function setupChronikScrollHandler(container) {
    // Remove old handler
    if (chronikScrollHandler) {
        window.removeEventListener('scroll', chronikScrollHandler);
    }

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    chronikScrollHandler = debounce(() => {
        if (currentView !== 'chronik') return;
        if (chronikRenderedCount >= chronikSortedLetters.length) return;

        // Check if user scrolled near bottom
        const scrollTop = mainContent.scrollTop;
        const scrollHeight = mainContent.scrollHeight;
        const clientHeight = mainContent.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - 500) {
            renderChronikBatch(container);
        }
    }, 100);

    mainContent.addEventListener('scroll', chronikScrollHandler);
}

/**
 * Update the load more info display
 */
function updateChronikLoadMoreInfo(container, total) {
    // Remove existing info
    const existingInfo = container.querySelector('.chronik-load-info');
    if (existingInfo) existingInfo.remove();

    if (chronikRenderedCount < total) {
        const remaining = total - chronikRenderedCount;
        const info = document.createElement('div');
        info.className = 'chronik-load-info';
        info.innerHTML = `
            <p>${chronikRenderedCount} von ${total} Briefen geladen</p>
            <button class="btn btn-secondary btn-sm" id="chronik-load-more">
                <i class="fas fa-plus"></i> ${Math.min(remaining, CHRONIK_BATCH_SIZE)} weitere laden
            </button>
        `;
        container.appendChild(info);

        // Add click handler
        info.querySelector('#chronik-load-more')?.addEventListener('click', () => {
            renderChronikBatch(container);
        });
    }
}

/**
 * Render a single letter entry in the Chronik (dispatches to layout-specific renderer)
 */
function renderChronikEntry(letter) {
    if (chronikLayout === 'compact') {
        return renderChronikEntryCompact(letter);
    } else if (chronikLayout === 'timeline') {
        return renderChronikEntryTimeline(letter);
    }
    return renderChronikEntryCards(letter);
}

/**
 * Render letter entry in cards layout (original, detailed view)
 */
function renderChronikEntryCards(letter) {
    const senderName = letter.sender?.name || 'Unbekannt';
    const senderPrecision = letter.sender?.precision || 'identified';
    const recipientName = letter.recipient?.name || 'Unbekannt';
    const recipientPrecision = letter.recipient?.precision || 'identified';

    const senderEnriched = getPersonEnrichment(letter.sender);
    const recipientEnriched = getPersonEnrichment(letter.recipient);

    const senderBirthYear = getPersonBirthYear(letter.sender, senderEnriched);
    const recipientBirthYear = getPersonBirthYear(letter.recipient, recipientEnriched);
    const senderDeathYear = getPersonDeathYear(letter.sender, senderEnriched);
    const recipientDeathYear = getPersonDeathYear(letter.recipient, recipientEnriched);
    const senderAge = calculateAge(senderBirthYear, letter);
    const recipientAge = calculateAge(recipientBirthYear, letter);

    const context = getCorrespondenceContext(letter);
    const dateDisplay = formatDateWithPrecision(letter);

    const senderPortrait = buildPortraitHtml(senderEnriched, senderName);
    const recipientPortrait = buildPortraitHtml(recipientEnriched, recipientName);
    const senderBio = buildBioHtml(senderEnriched);
    const recipientBio = buildBioHtml(recipientEnriched);
    const senderLifespan = buildLifespanBar(senderBirthYear, senderDeathYear, senderAge);
    const recipientLifespan = buildLifespanBar(recipientBirthYear, recipientDeathYear, recipientAge);

    let contextHtml = '';
    if (context) {
        if (context.isFirstLetter) {
            contextHtml = '<span class="chronik-first-letter"><i class="fas fa-star"></i> Erster Brief</span>';
        } else if (context.totalLetters > 1) {
            contextHtml = `<span class="chronik-letter-count">Brief ${context.letterNumber} von ${context.totalLetters}</span>`;
        }
    }

    const place = letter.place_sent?.name || '';

    return `
        <div class="chronik-entry chronik-entry-cards" data-letter-id="${letter.id}">
            <a href="${letter.url || '#'}" target="_blank" class="chronik-entry-link"
               onclick="event.stopPropagation()" title="Quelle oeffnen">
                <i class="fas fa-external-link-alt"></i>
            </a>
            <div class="chronik-entry-header">
                <div class="chronik-entry-date">${dateDisplay}</div>
                <div class="chronik-entry-persons">
                    <div class="chronik-entry-sender">
                        ${senderPortrait}
                        <div class="chronik-person-info">
                            <span class="chronik-person-name">${formatPersonName(senderName, senderPrecision)}</span>
                            ${senderLifespan}
                            ${senderBio}
                        </div>
                    </div>
                    <div class="chronik-entry-arrow">
                        <i class="fas fa-arrow-right"></i> an
                    </div>
                    <div class="chronik-entry-recipient">
                        ${recipientPortrait}
                        <div class="chronik-person-info">
                            <span class="chronik-person-name">${formatPersonName(recipientName, recipientPrecision)}</span>
                            ${recipientLifespan}
                            ${recipientBio}
                        </div>
                    </div>
                </div>
            </div>
            <div class="chronik-entry-meta">
                ${contextHtml}
                ${place ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(place)}</span>` : ''}
            </div>
        </div>
    `;
}

/**
 * Render letter entry in compact layout (single row)
 */
function renderChronikEntryCompact(letter) {
    const senderName = letter.sender?.name || 'Unbekannt';
    const recipientName = letter.recipient?.name || 'Unbekannt';

    const senderEnriched = getPersonEnrichment(letter.sender);
    const recipientEnriched = getPersonEnrichment(letter.recipient);

    const senderBirthYear = getPersonBirthYear(letter.sender, senderEnriched);
    const recipientBirthYear = getPersonBirthYear(letter.recipient, recipientEnriched);
    const senderDeathYear = getPersonDeathYear(letter.sender, senderEnriched);
    const recipientDeathYear = getPersonDeathYear(letter.recipient, recipientEnriched);
    const senderAge = calculateAge(senderBirthYear, letter);
    const recipientAge = calculateAge(recipientBirthYear, letter);

    const context = getCorrespondenceContext(letter);
    const dateDisplay = formatDateWithPrecision(letter);
    const place = letter.place_sent?.name || '';

    // Compact lifespan (just the bar, smaller)
    const senderBar = buildLifespanBarCompact(senderBirthYear, senderDeathYear, senderAge);
    const recipientBar = buildLifespanBarCompact(recipientBirthYear, recipientDeathYear, recipientAge);

    let contextBadge = '';
    if (context?.isFirstLetter) {
        contextBadge = '<span class="chronik-badge-first" title="Erster Brief"><i class="fas fa-star"></i></span>';
    } else if (context?.totalLetters > 1) {
        contextBadge = `<span class="chronik-badge-count" title="Brief ${context.letterNumber} von ${context.totalLetters}">${context.letterNumber}/${context.totalLetters}</span>`;
    }

    return `
        <div class="chronik-entry chronik-entry-compact" data-letter-id="${letter.id}">
            <div class="chronik-compact-date">${dateDisplay}</div>
            <div class="chronik-compact-sender">
                <span class="chronik-compact-name" title="${escapeHtml(senderName)}">${escapeHtml(truncateName(senderName))}</span>
                ${senderBar}
            </div>
            <div class="chronik-compact-arrow"><i class="fas fa-arrow-right"></i></div>
            <div class="chronik-compact-recipient">
                <span class="chronik-compact-name" title="${escapeHtml(recipientName)}">${escapeHtml(truncateName(recipientName))}</span>
                ${recipientBar}
            </div>
            <div class="chronik-compact-meta">
                ${contextBadge}
                ${place ? `<span class="chronik-compact-place" title="${escapeHtml(place)}"><i class="fas fa-map-marker-alt"></i></span>` : ''}
            </div>
        </div>
    `;
}

/**
 * Render letter entry in timeline layout (sender left, recipient right)
 */
function renderChronikEntryTimeline(letter) {
    const senderName = letter.sender?.name || 'Unbekannt';
    const recipientName = letter.recipient?.name || 'Unbekannt';

    const senderEnriched = getPersonEnrichment(letter.sender);
    const recipientEnriched = getPersonEnrichment(letter.recipient);

    const senderBirthYear = getPersonBirthYear(letter.sender, senderEnriched);
    const recipientBirthYear = getPersonBirthYear(letter.recipient, recipientEnriched);
    const senderDeathYear = getPersonDeathYear(letter.sender, senderEnriched);
    const recipientDeathYear = getPersonDeathYear(letter.recipient, recipientEnriched);
    const senderAge = calculateAge(senderBirthYear, letter);
    const recipientAge = calculateAge(recipientBirthYear, letter);

    const context = getCorrespondenceContext(letter);
    const dateDisplay = formatDateWithPrecision(letter);
    const place = letter.place_sent?.name || '';

    const senderPortraitSmall = buildPortraitHtmlSmall(senderEnriched, senderName);
    const recipientPortraitSmall = buildPortraitHtmlSmall(recipientEnriched, recipientName);

    const senderBar = buildLifespanBarCompact(senderBirthYear, senderDeathYear, senderAge);
    const recipientBar = buildLifespanBarCompact(recipientBirthYear, recipientDeathYear, recipientAge);

    let contextBadge = '';
    if (context?.isFirstLetter) {
        contextBadge = '<span class="chronik-tl-badge first"><i class="fas fa-star"></i></span>';
    } else if (context?.totalLetters > 1) {
        contextBadge = `<span class="chronik-tl-badge">${context.letterNumber}/${context.totalLetters}</span>`;
    }

    return `
        <div class="chronik-entry chronik-entry-timeline" data-letter-id="${letter.id}">
            <div class="chronik-tl-left">
                ${senderPortraitSmall}
                <div class="chronik-tl-person">
                    <span class="chronik-tl-name">${escapeHtml(truncateName(senderName, 20))}</span>
                    ${senderBar}
                </div>
            </div>
            <div class="chronik-tl-center">
                <div class="chronik-tl-date">${dateDisplay}</div>
                ${contextBadge}
                ${place ? `<div class="chronik-tl-place"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(truncateName(place, 15))}</div>` : ''}
            </div>
            <div class="chronik-tl-right">
                ${recipientPortraitSmall}
                <div class="chronik-tl-person">
                    <span class="chronik-tl-name">${escapeHtml(truncateName(recipientName, 20))}</span>
                    ${recipientBar}
                </div>
            </div>
        </div>
    `;
}

/**
 * Build compact lifespan bar (smaller version for compact/timeline layouts)
 */
function buildLifespanBarCompact(birthYear, deathYear, age) {
    if (!birthYear || !age || age < 0) return '';

    const totalYears = deathYear ? (deathYear - birthYear) : 85;
    const percentage = Math.min(100, Math.round((age / totalYears) * 100));

    const tooltip = deathYear
        ? `${age} Jahre (${birthYear}-${deathYear})`
        : `${age} Jahre (*${birthYear})`;

    return `
        <div class="chronik-lifespan-compact" title="${tooltip}">
            <div class="chronik-lifespan-bar-compact">
                <div class="chronik-lifespan-progress-compact" style="width: ${percentage}%"></div>
            </div>
            <span class="chronik-lifespan-age-compact">${age}</span>
        </div>
    `;
}

/**
 * Build small portrait HTML (for timeline layout)
 */
function buildPortraitHtmlSmall(enriched, name) {
    if (enriched?.thumbnail) {
        return `<img src="${enriched.thumbnail}" alt="${escapeHtml(name)}" class="chronik-portrait-small" loading="lazy">`;
    }
    if (chronikEnriched) {
        const initials = getPersonInitials(name, 'identified');
        return `<div class="chronik-portrait-small-placeholder">${initials}</div>`;
    }
    return '';
}

/**
 * Truncate name to max length
 */
function truncateName(name, maxLen = 25) {
    if (!name || name.length <= maxLen) return name;
    return name.substring(0, maxLen - 1) + '…';
}

/**
 * Switch Chronik layout and re-render
 */
function switchChronikLayout(layout) {
    chronikLayout = layout;

    // Update toggle buttons
    document.querySelectorAll('.chronik-layout-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    // Update timeline class for CSS
    const timeline = document.getElementById('chronik-timeline');
    if (timeline) {
        timeline.className = `chronik-timeline chronik-layout-${layout}`;
    }

    // Re-render
    renderChronik();
}

/**
 * Build portrait HTML for a person
 */
function buildPortraitHtml(enriched, name) {
    if (enriched && enriched.thumbnail) {
        return `<img src="${enriched.thumbnail}" alt="${escapeHtml(name)}" class="chronik-portrait" loading="lazy">`;
    }

    if (chronikEnriched) {
        // Show placeholder if enrichment was done but no image found
        const initials = getPersonInitials(name, 'identified');
        return `<div class="chronik-portrait-placeholder">${initials}</div>`;
    }

    // Before enrichment, show nothing
    return '';
}

/**
 * Build biographical info HTML
 */
function buildBioHtml(enriched) {
    if (!enriched) return '';

    const lifeDates = formatLifeDates(enriched);
    const profession = enriched.professions?.[0] || '';

    if (!lifeDates && !profession) return '';

    return `
        <div class="chronik-bio">
            ${lifeDates ? `<div class="chronik-bio-dates"><i class="fas fa-birthday-cake"></i> ${lifeDates}</div>` : ''}
            ${profession ? `<div class="chronik-bio-profession">${escapeHtml(profession)}</div>` : ''}
        </div>
    `;
}

/**
 * Get enrichment data for a person
 */
function getPersonEnrichment(person) {
    if (!person || !chronikEnriched) return null;

    // Try to find by authority ID
    const authorityId = person.viaf || person.gnd || person.id;
    if (authorityId && chronikEnrichmentData.has(authorityId)) {
        return chronikEnrichmentData.get(authorityId);
    }

    // Try to find by name
    if (person.name && chronikEnrichmentData.has(person.name)) {
        return chronikEnrichmentData.get(person.name);
    }

    return null;
}

/**
 * Update Chronik enrichment UI elements
 */
function updateChronikEnrichmentUI() {
    const enrichBtn = elements.getById('chronik-enrich-btn');
    const statusEl = elements.getById('chronik-enrich-status');

    if (chronikEnriched) {
        if (enrichBtn) enrichBtn.classList.add('hidden');
        if (statusEl) statusEl.classList.remove('hidden');
    } else {
        if (enrichBtn) enrichBtn.classList.remove('hidden');
        if (statusEl) statusEl.classList.add('hidden');
    }
}

// ============================================================================
// RESEARCH QUESTIONS VIEW
// ============================================================================

/**
 * Analyze corpus data and generate research questions with epistemological categories
 * Categories: descriptive (what), analytical (patterns), interpretive (meaning)
 */
function analyzeResearchQuestions() {
    if (!allLetters || !dataIndices) return [];

    const questions = [];
    const totalLetters = allLetters.length;

    // --- DESCRIPTIVE QUESTIONS (What is in the corpus?) ---

    // Persons - with Top 3 preview
    const persons = Object.values(dataIndices.persons || {});
    const personsWithAuthority = persons.filter(p => p.viaf || p.gnd);
    if (persons.length > 0) {
        // Calculate total letters per person and get top 3
        // Use letter_count from parser (as_sender + as_recipient counts)
        const personsByActivity = persons
            .map(p => ({
                name: p.name,
                count: p.letter_count || 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        questions.push({
            category: 'descriptive',
            question: 'Wer sind die aktivsten Korrespondenten?',
            description: `${persons.length} Personen im Korpus`,
            preview: personsByActivity.map(p => `${p.name} (${p.count})`),
            view: 'persons',
            icon: 'fa-users',
            coverage: Math.round((personsWithAuthority.length / persons.length) * 100),
            dataField: 'persons',
            path: [
                { view: 'persons', label: 'Korrespondenten', action: 'sortieren nach Briefanzahl' }
            ]
        });
    }

    // Places - with Top 3 preview
    const places = Object.values(dataIndices.places || {});
    const placesWithCoords = places.filter(p => p.lat && p.lon);
    if (places.length > 0) {
        const topPlaces = places
            .map(p => ({ name: p.name, count: p.letter_count || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        questions.push({
            category: 'descriptive',
            question: 'Von welchen Orten wurde korrespondiert?',
            description: `${places.length} Orte, ${placesWithCoords.length} georeferenziert`,
            preview: topPlaces.map(p => `${p.name} (${p.count})`),
            view: 'places',
            icon: 'fa-map-marker-alt',
            coverage: Math.round((placesWithCoords.length / places.length) * 100),
            dataField: 'places',
            path: [
                { view: 'places', label: 'Orte', action: 'Liste durchsuchen' },
                { view: 'map', label: 'Karte', action: 'geografische Verteilung' }
            ]
        });
    }

    // Subjects/Topics - with Top 3 preview
    const subjects = Object.values(dataIndices.subjects || {});
    if (subjects.length > 0) {
        const topSubjects = subjects
            .map(s => ({ name: s.label || s.name, count: s.letter_count || 0 }))
            .filter(s => s.name && s.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        questions.push({
            category: 'descriptive',
            question: 'Welche Themen dominieren die Korrespondenz?',
            description: `${subjects.length} verschiedene Themen`,
            preview: topSubjects.length > 0 ? topSubjects.map(s => `${s.name} (${s.count})`) : null,
            view: 'topics',
            icon: 'fa-tags',
            coverage: 100,
            dataField: 'subjects',
            path: [
                { view: 'topics', label: 'Themen', action: 'Thema auswaehlen und zum Korb' }
            ]
        });
    }

    // Languages - with Top 3 preview
    const languages = Object.keys(dataIndices.languages || {});
    if (languages.length > 1) {
        const topLangs = Object.entries(dataIndices.languages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        questions.push({
            category: 'descriptive',
            question: 'In welchen Sprachen wurde korrespondiert?',
            description: `${languages.length} Sprachen im Korpus`,
            preview: topLangs.map(([lang, count]) => {
                // Use LANGUAGE_LABELS for display, fallback to short code
                const label = LANGUAGE_LABELS[lang] || (lang.length > 10 ? lang.substring(0, 10) + '...' : lang);
                return `${label} (${count})`;
            }),
            view: 'timeline',
            icon: 'fa-language',
            coverage: 100,
            dataField: 'languages',
            path: [
                { view: 'timeline', label: 'Timeline', action: 'Sprachen in Farblegende sehen' }
            ]
        });
    }

    // --- ANALYTICAL QUESTIONS (What patterns exist?) ---

    // Temporal patterns - with top years preview
    const datedLetters = allLetters.filter(l => l.year);
    if (datedLetters.length > 0) {
        const years = datedLetters.map(l => l.year);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        // Count letters per year and get top 3
        const yearCounts = {};
        years.forEach(y => { yearCounts[y] = (yearCounts[y] || 0) + 1; });
        const topYears = Object.entries(yearCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        questions.push({
            category: 'analytical',
            question: 'Wie entwickelt sich die Korrespondenzfrequenz ueber Zeit?',
            description: `Zeitraum ${minYear}-${maxYear}, ${datedLetters.length} datierte Briefe`,
            preview: topYears.map(([year, count]) => `${year} (${count})`),
            view: 'activity',
            icon: 'fa-chart-line',
            coverage: Math.round((datedLetters.length / totalLetters) * 100),
            dataField: 'dates',
            path: [
                { view: 'activity', label: 'Aktivitaet', action: 'Heatmap fuer Muster pruefen' },
                { view: 'timeline', label: 'Timeline', action: 'Jaehrliche Verteilung' }
            ]
        });
    }

    // Network structure - with top network nodes preview
    if (persons.length >= 5) {
        // Check for ego-network pattern and get top 3 by connections
        // Use letter_count from parser
        const personsWithCounts = persons
            .map(p => ({
                name: p.name,
                count: p.letter_count || 0
            }))
            .sort((a, b) => b.count - a.count);
        const topNetworkNodes = personsWithCounts.slice(0, 3);
        const maxLetters = personsWithCounts[0]?.count || 0;
        const totalConnections = personsWithCounts.reduce((a, b) => a + b.count, 0) / 2;
        const isEgoNetwork = maxLetters > totalConnections * 0.6;

        questions.push({
            category: 'analytical',
            question: isEgoNetwork
                ? 'Wie ist das Ego-Netzwerk um die zentrale Person strukturiert?'
                : 'Welche Cluster und Vermittler gibt es im Korrespondenz-Netzwerk?',
            description: isEgoNetwork
                ? 'Ego-Netzwerk erkannt: Eine Person dominiert die Korrespondenz'
                : `${persons.length} Personen in Beziehung`,
            preview: topNetworkNodes.map(p => `${p.name} (${p.count})`),
            view: 'network',
            icon: 'fa-project-diagram',
            coverage: Math.round((personsWithAuthority.length / persons.length) * 100),
            dataField: 'network',
            path: [
                { view: 'network', label: 'Netzwerk', action: 'Struktur erkunden' },
                { view: 'persons', label: 'Korrespondenten', action: 'Person auswaehlen' },
                { view: 'chronik', label: 'Chronik', action: 'Beziehungsverlauf' }
            ]
        });
    }

    // Geographic patterns
    if (placesWithCoords.length >= 3) {
        questions.push({
            category: 'analytical',
            question: 'Gibt es geografische Cluster in der Korrespondenz?',
            description: `${placesWithCoords.length} Orte mit Koordinaten`,
            view: 'map',
            icon: 'fa-map',
            coverage: Math.round((placesWithCoords.length / places.length) * 100),
            dataField: 'coordinates',
            path: [
                { view: 'map', label: 'Karte', action: 'Cluster identifizieren' },
                { view: 'places', label: 'Orte', action: 'Ort auswaehlen und zum Korb' }
            ]
        });
    }

    // Mentions analysis (if available) - with top mentioned persons
    const lettersWithMentions = allLetters.filter(l => l.mentions?.persons?.length > 0);
    if (lettersWithMentions.length > 0) {
        const totalMentions = lettersWithMentions.reduce((sum, l) => sum + l.mentions.persons.length, 0);
        // Count mentions per person
        const mentionCounts = {};
        lettersWithMentions.forEach(l => {
            l.mentions.persons.forEach(p => {
                const name = p.name || p.ref || 'Unbekannt';
                mentionCounts[name] = (mentionCounts[name] || 0) + 1;
            });
        });
        const topMentioned = Object.entries(mentionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        questions.push({
            category: 'analytical',
            question: 'Wer wird in wessen Briefen erwaehnt?',
            description: `${totalMentions} Personen-Erwaehnungen in ${lettersWithMentions.length} Briefen`,
            preview: topMentioned.map(([name, count]) => `${name} (${count}x)`),
            view: 'mentions-flow',
            icon: 'fa-diagram-project',
            coverage: Math.round((lettersWithMentions.length / totalLetters) * 100),
            dataField: 'mentions',
            path: [
                { view: 'mentions-flow', label: 'Mentions', action: 'Erwaehnungs-Muster' },
                { view: 'persons', label: 'Korrespondenten', action: 'Person filtern' }
            ]
        });
    }

    // --- INTERPRETIVE QUESTIONS (What does it mean?) ---

    // Language-geography correlation - REMOVED: No view shows this correlation directly
    // The path was misleading - users couldn't actually filter map by language

    // Biographical context
    if (datedLetters.length > 0 && personsWithAuthority.length > 0) {
        questions.push({
            category: 'interpretive',
            question: 'Wie veraendert sich die Korrespondenz im Lebensverlauf?',
            description: 'Erfordert Wikidata-Anreicherung fuer Lebensdaten',
            view: 'chronik',
            icon: 'fa-scroll',
            coverage: Math.round((personsWithAuthority.length / persons.length) * 100),
            dataField: 'biography',
            path: [
                { view: 'chronik', label: 'Chronik', action: 'Wikidata-Anreicherung aktivieren' }
            ]
        });
    }

    // Topic evolution - Note: We don't have a topics-over-time view, just topic filtering
    if (subjects.length > 0 && datedLetters.length > 0) {
        questions.push({
            category: 'interpretive',
            question: 'Welche Themen dominieren in bestimmten Zeitraeumen?',
            description: 'Zeitfilter + Themenansicht kombinieren',
            view: 'topics',
            icon: 'fa-stream',
            coverage: 100,
            dataField: 'topic-evolution',
            path: [
                { view: 'topics', label: 'Themen', action: 'Thema waehlen, dann Zeitfilter setzen' }
            ]
        });
    }

    // Relationship development
    if (persons.length >= 2 && datedLetters.length > 0) {
        questions.push({
            category: 'interpretive',
            question: 'Wie entwickeln sich einzelne Briefbeziehungen?',
            description: 'Erster Brief, Frequenz, Dauer einer Korrespondenz',
            view: 'persons',
            icon: 'fa-handshake',
            coverage: Math.round((datedLetters.length / totalLetters) * 100),
            dataField: 'relationships',
            path: [
                { view: 'persons', label: 'Korrespondenten', action: 'Person waehlen und filtern' },
                { view: 'activity', label: 'Aktivitaet', action: 'Aktivitaetsmuster der Person' }
            ]
        });
    }

    // --- UNAVAILABLE QUESTIONS (what's missing) ---
    // These questions COULD be asked but can't be answered with current data

    // No geo data
    if (places.length > 0 && placesWithCoords.length === 0) {
        questions.push({
            category: 'unavailable',
            question: 'Wo wurde korrespondiert? (Kartenansicht)',
            description: `${places.length} Orte ohne Koordinaten - Geo-Visualisierung nicht moeglich`,
            icon: 'fa-map-marked-alt',
            coverage: 0,
            missingData: 'Koordinaten',
            suggestion: 'GeoNames-IDs oder Wikidata-IDs in CMIF hinzufuegen'
        });
    }

    // No dates
    if (datedLetters.length === 0 && totalLetters > 0) {
        questions.push({
            category: 'unavailable',
            question: 'Wie entwickelt sich die Korrespondenz zeitlich?',
            description: `${totalLetters} Briefe ohne Datierung - Timeline nicht moeglich`,
            icon: 'fa-calendar-times',
            coverage: 0,
            missingData: 'Datumsangaben',
            suggestion: 'correspAction-Elemente mit when/notBefore/notAfter befuellen'
        });
    }

    // No authority IDs
    if (persons.length > 0 && personsWithAuthority.length === 0) {
        questions.push({
            category: 'unavailable',
            question: 'Wer sind die Korrespondenten? (Wikidata-Anreicherung)',
            description: `${persons.length} Personen ohne Authority-IDs - keine Anreicherung moeglich`,
            icon: 'fa-user-slash',
            coverage: 0,
            missingData: 'GND/VIAF IDs',
            suggestion: 'Authority-IDs (GND, VIAF) zu persName-Elementen hinzufuegen'
        });
    }

    // No mentions
    if (lettersWithMentions.length === 0 && totalLetters > 10) {
        questions.push({
            category: 'unavailable',
            question: 'Wer wird in Briefen erwaehnt?',
            description: 'Keine Personen-Erwaehnungen erfasst - Mentions-Analyse nicht moeglich',
            icon: 'fa-comment-slash',
            coverage: 0,
            missingData: 'rs/persName in correspDesc',
            suggestion: 'Erwaehnungen als rs-Elemente innerhalb note erfassen'
        });
    }

    // No subjects/topics
    if (subjects.length === 0 && totalLetters > 10) {
        questions.push({
            category: 'unavailable',
            question: 'Welche Themen werden behandelt?',
            description: 'Keine Themen-Verschlagwortung - Topic-Analyse nicht moeglich',
            icon: 'fa-tags',
            coverage: 0,
            missingData: 'Keywords/Subjects',
            suggestion: 'Keywords als rs type="subject" in note erfassen'
        });
    }

    // Only one language
    if (languages.length <= 1 && totalLetters > 10) {
        questions.push({
            category: 'unavailable',
            question: 'In welchen Sprachen wurde korrespondiert?',
            description: languages.length === 1
                ? `Nur eine Sprache erfasst (${languages[0]}) - Sprachvergleich nicht moeglich`
                : 'Keine Sprachangaben - Sprachanalyse nicht moeglich',
            icon: 'fa-language',
            coverage: 0,
            missingData: 'xml:lang Attribute',
            suggestion: 'xml:lang zu correspAction-Elementen hinzufuegen'
        });
    }

    // Add unique IDs to all questions
    questions.forEach((q, i) => {
        q.id = `q-${q.category}-${i}`;
    });

    return questions;
}

/**
 * Render the Research Questions view
 */
function renderResearchQuestions() {
    const container = document.getElementById('questions-grid');
    const metaContainer = document.getElementById('questions-meta');
    if (!container) return;

    const questions = analyzeResearchQuestions();

    if (questions.length === 0) {
        container.innerHTML = `
            <div class="questions-empty">
                <i class="fas fa-question-circle"></i>
                <p>Keine Forschungsfragen konnten generiert werden. Das Korpus enthaelt moeglicherweise zu wenig strukturierte Daten.</p>
            </div>
        `;
        return;
    }

    // Group by category
    const categories = {
        descriptive: {
            title: 'Deskriptiv',
            subtitle: 'Was ist im Korpus?',
            icon: 'fa-list',
            questions: []
        },
        analytical: {
            title: 'Analytisch',
            subtitle: 'Welche Muster gibt es?',
            icon: 'fa-search',
            questions: []
        },
        interpretive: {
            title: 'Interpretativ',
            subtitle: 'Was bedeutet das?',
            icon: 'fa-lightbulb',
            questions: []
        },
        unavailable: {
            title: 'Nicht beantwortbar',
            subtitle: 'Fehlende Daten im Korpus',
            icon: 'fa-exclamation-triangle',
            questions: []
        }
    };

    questions.forEach(q => {
        if (categories[q.category]) {
            categories[q.category].questions.push(q);
        }
    });

    // Render categories
    let html = '';
    for (const [catKey, cat] of Object.entries(categories)) {
        if (cat.questions.length === 0) continue;

        html += `
            <div class="questions-category">
                <div class="questions-category-header">
                    <i class="fas ${cat.icon}"></i>
                    <div>
                        <h3>${cat.title}</h3>
                        <span class="questions-category-subtitle">${cat.subtitle}</span>
                    </div>
                </div>
                <div class="questions-list">
        `;

        for (const q of cat.questions) {
            const isUnavailable = catKey === 'unavailable';
            const coverageClass = q.coverage >= 70 ? 'high' : q.coverage >= 40 ? 'medium' : 'low';

            // Build preview HTML if available
            let previewHtml = '';
            if (q.preview && q.preview.length > 0) {
                previewHtml = `
                    <div class="question-preview">
                        <span class="preview-label">Top ${q.preview.length}:</span>
                        ${q.preview.map(item => `<span class="preview-item">${item}</span>`).join('')}
                    </div>
                `;
            }

            // Build path HTML if available (not for unavailable)
            let pathHtml = '';
            if (q.path && q.path.length > 0 && !isUnavailable) {
                const pathSteps = q.path.map((step, i) => `
                    <span class="path-step" data-view="${step.view}">
                        <span class="path-step-header">
                            <span class="path-step-num">${i + 1}</span>
                            <span class="path-step-label">${step.label}</span>
                        </span>
                        <span class="path-step-action">${step.action}</span>
                    </span>
                `).join('<span class="path-arrow"><i class="fas fa-chevron-right"></i></span>');
                pathHtml = `<div class="question-path">${pathSteps}</div>`;
            }

            // Build suggestion HTML for unavailable questions
            let suggestionHtml = '';
            if (isUnavailable && q.suggestion) {
                suggestionHtml = `
                    <div class="question-suggestion">
                        <span class="suggestion-label"><i class="fas fa-wrench"></i> Fehlend:</span>
                        <span class="suggestion-text">${q.missingData}</span>
                    </div>
                    <div class="question-fix">
                        <i class="fas fa-lightbulb"></i> ${q.suggestion}
                    </div>
                `;
            }

            html += `
                <div class="question-card ${isUnavailable ? 'unavailable' : ''}" ${!isUnavailable ? `data-view="${q.view}" data-path='${JSON.stringify(q.path || [])}'` : ''}>
                    <div class="question-icon"><i class="fas ${q.icon}"></i></div>
                    <div class="question-content">
                        <div class="question-text">${q.question}</div>
                        <div class="question-description">${q.description}</div>
                        ${previewHtml}
                        ${pathHtml}
                        ${suggestionHtml}
                        ${q.filterHint ? `<div class="question-hint"><i class="fas fa-info-circle"></i> ${q.filterHint}</div>` : ''}
                    </div>
                    ${!isUnavailable ? `
                    <div class="question-meta">
                        <div class="question-coverage ${coverageClass}" title="Anreicherungspotential: ${q.coverage}% der Daten haben IDs fuer Wikidata-Lookup">
                            <div class="question-coverage-bar" style="width: ${q.coverage}%"></div>
                            <span>${q.coverage}%</span>
                        </div>
                        <div class="question-action">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>` : ''}
                </div>
            `;
        }

        html += '</div></div>';
    }

    container.innerHTML = html;

    // Add click handlers for path steps (navigate to that specific view)
    container.querySelectorAll('.path-step').forEach(step => {
        step.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            const view = step.dataset.view;
            if (view) {
                switchView(view);
                updateUrlState();
            }
        });
    });

    // Add click handlers for cards - start knowledge path
    container.querySelectorAll('.question-card:not(.unavailable)').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't start path if clicking on individual path steps
            if (e.target.closest('.path-step')) return;

            // Extract question data and start knowledge path
            const questionText = card.querySelector('.question-text')?.textContent || '';
            const pathData = card.dataset.path || '[]';
            const view = card.dataset.view;

            try {
                const path = JSON.parse(pathData);
                if (path && path.length > 0) {
                    // Get category from parent element
                    const categoryEl = card.closest('.questions-category');
                    const categoryTitle = categoryEl?.querySelector('h3')?.textContent?.toLowerCase() || '';
                    let category = 'descriptive';
                    if (categoryTitle.includes('analytisch')) category = 'analytical';
                    else if (categoryTitle.includes('interpretativ')) category = 'interpretive';

                    // Start the knowledge path
                    startKnowledgePath({
                        question: questionText,
                        category: category,
                        path: path,
                        view: view
                    });
                }
            } catch (err) {
                console.error('Error starting knowledge path:', err);
                // Fallback: just navigate to the view
                if (view) {
                    switchView(view);
                    updateUrlState();
                }
            }
        });
    });

    // Render meta info
    if (metaContainer) {
        const answerable = questions.filter(q => q.category !== 'unavailable').length;
        const unavailable = categories.unavailable.questions.length;
        const descriptive = categories.descriptive.questions.length;
        const analytical = categories.analytical.questions.length;
        const interpretive = categories.interpretive.questions.length;

        metaContainer.innerHTML = `
            <div class="questions-meta-info">
                <p>
                    <strong>${answerable} Forschungspfade</strong> wurden aus der Datenstruktur abgeleitet:
                    ${descriptive} deskriptive, ${analytical} analytische, ${interpretive} interpretative.
                    ${unavailable > 0 ? `<span class="meta-unavailable">${unavailable} weitere Pfade sind wegen fehlender Daten nicht verfuegbar.</span>` : ''}
                </p>
                <p class="questions-meta-note">
                    <i class="fas fa-info-circle"></i>
                    Klicke auf einen Pfad-Schritt um direkt zu diesem View zu navigieren.
                    Die Datenabdeckung zeigt, wie vollstaendig die Daten fuer diese Frage sind.
                </p>
            </div>
        `;
    }
}

// ===================
// WISSENSPFAD (Knowledge Path)
// ===================

let knowledgePath = null;

/**
 * Startet einen neuen Wissenspfad
 * @param {Object} question - Forschungsfrage mit path Array
 */
function startKnowledgePath(question) {
    if (!question || !question.path || question.path.length === 0) {
        console.error('Cannot start knowledge path: invalid question data');
        return;
    }

    knowledgePath = {
        active: true,
        questionId: `kp-${Date.now()}`,
        question: question.question,
        category: question.category,
        path: question.path,
        currentStep: 0,
        basket: {
            personIds: [],
            placeIds: [],
            letterIds: [],
            topicIds: [],
            timeRange: null,
            languages: []
        },
        stepHistory: []
    };

    // In sessionStorage speichern
    sessionStorage.setItem('knowledgePath', JSON.stringify(knowledgePath));

    // UI anzeigen
    showKnowledgePathUI();

    // Zum ersten View navigieren
    const firstStep = question.path[0];
    switchView(firstStep.view);
    updateUrlState();
}

/**
 * Laedt bestehenden Wissenspfad aus sessionStorage
 */
function loadKnowledgePath() {
    const saved = sessionStorage.getItem('knowledgePath');
    if (saved) {
        try {
            knowledgePath = JSON.parse(saved);
            if (knowledgePath && knowledgePath.active) {
                showKnowledgePathUI();
                return true;
            }
        } catch (e) {
            console.error('Error loading knowledge path:', e);
        }
    }
    knowledgePath = null;
    return false;
}

/**
 * Speichert aktuellen Wissenspfad
 */
function saveKnowledgePath() {
    if (knowledgePath) {
        sessionStorage.setItem('knowledgePath', JSON.stringify(knowledgePath));
    }
}

/**
 * Beendet den Wissenspfad
 */
function endKnowledgePath() {
    knowledgePath = null;
    sessionStorage.removeItem('knowledgePath');
    hideKnowledgePathUI();

    // Zur Pfade-View zurueck
    switchView('questions');
    updateUrlState();
}

/**
 * Navigiert zum naechsten Schritt im Pfad
 */
function nextPathStep() {
    if (!knowledgePath) return;

    // Aktuellen Zustand zur History hinzufuegen
    knowledgePath.stepHistory.push({
        step: knowledgePath.currentStep,
        view: knowledgePath.path[knowledgePath.currentStep].view,
        basket: JSON.parse(JSON.stringify(knowledgePath.basket)),
        timestamp: Date.now()
    });

    knowledgePath.currentStep++;
    saveKnowledgePath();

    if (knowledgePath.currentStep >= knowledgePath.path.length) {
        // Pfad abgeschlossen - zurueck zur Pfade-View
        showPathCompletedMessage();
        endKnowledgePath();
    } else {
        // Naechster View
        const nextStep = knowledgePath.path[knowledgePath.currentStep];
        switchView(nextStep.view);
        updateUrlState();
        updateKnowledgePathUI();
    }
}

/**
 * Navigiert zum vorherigen Schritt
 */
function previousPathStep() {
    if (!knowledgePath || knowledgePath.currentStep === 0) return;

    knowledgePath.currentStep--;

    // Korb auf vorherigen Zustand zuruecksetzen
    if (knowledgePath.stepHistory.length > 0) {
        const prevState = knowledgePath.stepHistory.pop();
        knowledgePath.basket = prevState.basket;
    }

    saveKnowledgePath();

    const prevStep = knowledgePath.path[knowledgePath.currentStep];
    switchView(prevStep.view);
    updateUrlState();
    updateKnowledgePathUI();
}

/**
 * Fuegt aktuelle Auswahl zum universellen Korb hinzu (basket.js)
 * Funktioniert auch ohne aktiven Wissenspfad
 */
function addToBasketFromView() {
    const currentView = state.ui.currentView;
    const filteredLetters = state.getFilteredLetters();
    let addedCount = 0;

    switch (currentView) {
        case 'persons':
            // Alle Personen aus gefilterten Briefen
            filteredLetters.forEach(l => {
                if (l.sender?.id) {
                    const result = basketAdd('persons', l.sender.id);
                    if (result === true) addedCount++;
                }
                if (l.recipient?.id) {
                    const result = basketAdd('persons', l.recipient.id);
                    if (result === true) addedCount++;
                }
            });
            break;

        case 'places':
        case 'map':
            // Alle Orte aus gefilterten Briefen
            filteredLetters.forEach(l => {
                if (l.place_sent?.id) {
                    const result = basketAdd('places', l.place_sent.id);
                    if (result === true) addedCount++;
                }
            });
            break;

        case 'letters':
        case 'chronik':
            // Alle gefilterten Briefe
            filteredLetters.forEach(l => {
                if (l.id) {
                    const result = basketAdd('letters', l.id);
                    if (result === true) addedCount++;
                }
            });
            break;

        case 'timeline':
        case 'activity':
            // Bei Timeline/Activity: alle gefilterten Briefe
            filteredLetters.forEach(l => {
                if (l.id) {
                    const result = basketAdd('letters', l.id);
                    if (result === true) addedCount++;
                }
            });
            break;

        default:
            // Generisch: alle Brief-IDs
            filteredLetters.forEach(l => {
                if (l.id) {
                    const result = basketAdd('letters', l.id);
                    if (result === true) addedCount++;
                }
            });
    }

    // Feedback
    if (addedCount > 0) {
        showToast(`${addedCount} Element(e) zum Korb hinzugefuegt`);
    } else {
        showToast('Auswahl bereits im Korb oder Limit erreicht');
    }
}

/**
 * Leert den universellen Korb (basket.js)
 */
function clearBasketHandler() {
    basketClear();
    showToast('Korb geleert');
}

/**
 * Zeigt Wissenspfad UI-Elemente (Pfad-Leiste und Navigation)
 * Wissenskorb-Sidebar bleibt IMMER sichtbar
 */
function showKnowledgePathUI() {
    const pathBar = document.getElementById('knowledge-path-bar');
    const pathNav = document.getElementById('knowledge-path-nav');

    if (pathBar) pathBar.classList.remove('hidden');
    if (pathNav) pathNav.classList.remove('hidden');

    updateKnowledgePathUI();
}

/**
 * Versteckt Wissenspfad UI-Elemente (nur Pfad-Leiste und Navigation)
 * Wissenskorb-Sidebar bleibt IMMER sichtbar
 */
function hideKnowledgePathUI() {
    const pathBar = document.getElementById('knowledge-path-bar');
    const pathNav = document.getElementById('knowledge-path-nav');

    if (pathBar) pathBar.classList.add('hidden');
    if (pathNav) pathNav.classList.add('hidden');
}

/**
 * Aktualisiert alle Wissenspfad UI-Elemente
 */
function updateKnowledgePathUI() {
    if (!knowledgePath) return;

    // Frage-Text
    const questionText = document.getElementById('path-bar-question-text');
    if (questionText) {
        questionText.textContent = knowledgePath.question;
        questionText.title = knowledgePath.question;
    }

    // Pfad-Schritte rendern
    const stepsContainer = document.getElementById('path-bar-steps');
    if (stepsContainer) {
        let html = '';
        knowledgePath.path.forEach((step, i) => {
            const isActive = i === knowledgePath.currentStep;
            const isComplete = i < knowledgePath.currentStep;

            html += `
                <div class="path-bar-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}"
                     data-step="${i}" title="${step.action}">
                    <span class="path-bar-step-num">${i + 1}</span>
                    <span class="path-bar-step-label">${step.label}</span>
                </div>
            `;

            if (i < knowledgePath.path.length - 1) {
                html += '<span class="path-bar-step-arrow"><i class="fas fa-chevron-right"></i></span>';
            }
        });
        stepsContainer.innerHTML = html;

        // Click-Handler fuer Schritte
        stepsContainer.querySelectorAll('.path-bar-step').forEach(stepEl => {
            stepEl.addEventListener('click', () => {
                const stepIndex = parseInt(stepEl.dataset.step);
                if (stepIndex <= knowledgePath.currentStep) {
                    // Zu diesem Schritt zurueckspringen
                    while (knowledgePath.currentStep > stepIndex) {
                        previousPathStep();
                    }
                }
            });
        });
    }

    // Korb-Zaehler aus basket.js
    const basketCount = document.getElementById('path-bar-basket-count');
    if (basketCount) {
        const counts = getBasketCounts();
        basketCount.textContent = counts.total;
    }

    // Aktions-Anleitung aktualisieren
    const actionText = document.getElementById('path-action-text');
    if (actionText && knowledgePath.path[knowledgePath.currentStep]) {
        const currentStep = knowledgePath.path[knowledgePath.currentStep];
        actionText.textContent = currentStep.action || 'Erkunde diese Ansicht und fuege interessante Elemente zum Korb hinzu.';
    }

    // Navigation aktualisieren
    updatePathNavigation();
    updateSidebarBasketUI();
}

/**
 * Aktualisiert Pfad-Navigation Buttons
 */
function updatePathNavigation() {
    if (!knowledgePath) return;

    const backBtn = document.getElementById('path-nav-back');
    const nextBtn = document.getElementById('path-nav-next');
    const stepInfo = document.getElementById('path-nav-step');

    if (backBtn) {
        backBtn.disabled = knowledgePath.currentStep === 0;
    }

    if (nextBtn) {
        const isLastStep = knowledgePath.currentStep >= knowledgePath.path.length - 1;
        nextBtn.innerHTML = isLastStep
            ? 'Pfad abschliessen <i class="fas fa-check"></i>'
            : 'Weiter im Pfad <i class="fas fa-arrow-right"></i>';
    }

    if (stepInfo) {
        stepInfo.textContent = `Schritt ${knowledgePath.currentStep + 1} von ${knowledgePath.path.length}`;
    }
}

/**
 * Aktualisiert Korb-Sidebar mit Daten aus basket.js
 */
function updateSidebarBasketUI() {
    const container = document.getElementById('basket-content');
    if (!container) return;

    const counts = getBasketCounts();
    let html = '';

    if (counts.persons > 0) {
        html += `
            <div class="basket-group">
                <span class="basket-group-label"><i class="fas fa-users"></i> Personen</span>
                <span class="basket-group-count">${counts.persons}</span>
            </div>
        `;
    }

    if (counts.places > 0) {
        html += `
            <div class="basket-group">
                <span class="basket-group-label"><i class="fas fa-map-marker-alt"></i> Orte</span>
                <span class="basket-group-count">${counts.places}</span>
            </div>
        `;
    }

    if (counts.letters > 0) {
        html += `
            <div class="basket-group">
                <span class="basket-group-label"><i class="fas fa-envelope"></i> Briefe</span>
                <span class="basket-group-count">${counts.letters}</span>
            </div>
        `;
    }

    if (html === '') {
        html = '<div class="basket-empty">Korb ist leer</div>';
    }

    // Link zur Wissenskorb-Seite
    if (counts.total > 0) {
        html += `
            <a href="wissenskorb.html" class="basket-view-link">
                <i class="fas fa-external-link-alt"></i> Korb oeffnen
            </a>
        `;
    }

    container.innerHTML = html;

    // Korb-Zaehler in Pfad-Leiste aktualisieren
    const pathBarCount = document.getElementById('path-bar-basket-count');
    if (pathBarCount) {
        pathBarCount.textContent = counts.total;
    }

    // Navbar-Badge aktualisieren
    const badge = document.getElementById('basket-badge');
    if (badge) {
        badge.textContent = counts.total;
        if (counts.total > 0) {
            badge.classList.add('has-items');
        } else {
            badge.classList.remove('has-items');
        }
    }
}

/**
 * Zeigt Erfolgsmeldung bei Pfad-Abschluss
 */
function showPathCompletedMessage() {
    showToast('Wissenspfad abgeschlossen');
}

/**
 * Setup Event-Handler fuer Wissenspfad und Korb
 */
function setupKnowledgePathHandlers() {
    // Pfad-Navigation
    document.getElementById('path-nav-back')?.addEventListener('click', previousPathStep);
    document.getElementById('path-nav-next')?.addEventListener('click', nextPathStep);
    document.getElementById('path-bar-close')?.addEventListener('click', endKnowledgePath);

    // Korb-Aktionen (nutzt jetzt basket.js)
    document.getElementById('add-to-basket')?.addEventListener('click', addToBasketFromView);
    document.getElementById('clear-basket')?.addEventListener('click', clearBasketHandler);

    // Listener fuer Korb-Aenderungen (synchronisiert UI)
    onBasketChange((counts) => {
        updateSidebarBasketUI();
    });

    // Initiales UI-Update
    updateSidebarBasketUI();
}

// ===================
// ACTIVITY HEATMAP VIEW
// ===================

let activityIndex = null;
let activitySelectedYear = 'all';

/**
 * Baut Index fuer Aktivitaets-Heatmap
 * @param {Array} letters - Array von Brief-Objekten
 * @returns {Object} Index mit byDate, byYear, byMonth, byWeekday, stats
 */
function buildActivityIndex(letters) {
    const byDate = new Map();      // "YYYY-MM-DD" -> {count, ids}
    const byYear = new Map();      // YYYY -> count
    const byMonth = new Map();     // "YYYY-MM" -> count
    const byWeekday = [0, 0, 0, 0, 0, 0, 0]; // Mo-So counts

    let total = 0;
    let maxDay = { date: null, count: 0 };
    let maxYear = { year: null, count: 0 };

    for (const letter of letters) {
        // Nur Briefe mit Datum (nicht 'unknown')
        if (!letter.date || letter.datePrecision === 'unknown') continue;

        const date = letter.date;  // "YYYY-MM-DD"
        const year = letter.year;
        const month = date.substring(0, 7);  // "YYYY-MM"

        // Wochentag berechnen (0=So in JS, wir wollen 0=Mo)
        const jsWeekday = new Date(date).getDay();
        const weekday = jsWeekday === 0 ? 6 : jsWeekday - 1;

        // By date aggregieren
        if (!byDate.has(date)) {
            byDate.set(date, { count: 0, ids: [] });
        }
        const dateEntry = byDate.get(date);
        dateEntry.count++;
        dateEntry.ids.push(letter.id);

        // By year aggregieren
        byYear.set(year, (byYear.get(year) || 0) + 1);

        // By month aggregieren
        byMonth.set(month, (byMonth.get(month) || 0) + 1);

        // By weekday aggregieren
        byWeekday[weekday]++;

        // Max day tracken (nur exakte Daten, nicht Platzhalter wie 1798-01-01)
        if (letter.datePrecision === 'exact' && dateEntry.count > maxDay.count) {
            maxDay = { date, count: dateEntry.count };
        }

        total++;
    }

    // Max year finden
    for (const [year, count] of byYear) {
        if (count > maxYear.count) {
            maxYear = { year, count };
        }
    }

    // Statistiken berechnen
    const years = Array.from(byYear.keys()).sort((a, b) => a - b);
    const monthCount = byMonth.size || 1;
    const avgPerMonth = Math.round(total / monthCount * 10) / 10;

    return {
        byDate,
        byYear,
        byMonth,
        byWeekday,
        total,
        maxDay,
        maxYear,
        years,
        avgPerMonth
    };
}

/**
 * Rendert den Activity-Heatmap-View
 */
function renderActivity() {
    const container = document.getElementById('activity-view');
    if (!container) return;

    const letters = state.getFilteredLetters();

    // Index bauen
    activityIndex = buildActivityIndex(letters);

    // Statistik-Karten aktualisieren
    const totalEl = document.getElementById('activity-total');
    const busiestDayEl = document.getElementById('activity-busiest-day');
    const busiestYearEl = document.getElementById('activity-busiest-year');
    const avgEl = document.getElementById('activity-avg-per-month');

    if (totalEl) totalEl.textContent = activityIndex.total.toLocaleString('de-DE');
    if (busiestDayEl) {
        busiestDayEl.textContent = activityIndex.maxDay.date
            ? `${activityIndex.maxDay.count} (${activityIndex.maxDay.date})`
            : '-';
    }
    if (busiestYearEl) {
        busiestYearEl.textContent = activityIndex.maxYear.year
            ? `${activityIndex.maxYear.year} (${activityIndex.maxYear.count})`
            : '-';
    }
    if (avgEl) avgEl.textContent = activityIndex.avgPerMonth;

    // Jahr-Selector rendern
    renderActivityYearSelector();

    // Heatmap rendern
    renderActivityHeatmap();

    // Details ausblenden
    const detailsPanel = document.getElementById('activity-details');
    if (detailsPanel) detailsPanel.classList.add('hidden');
}

/**
 * Rendert Jahr-Auswahl-Buttons
 */
function renderActivityYearSelector() {
    const container = document.getElementById('activity-year-selector');
    if (!container || !activityIndex) return;

    const years = activityIndex.years;

    let html = `<button class="activity-year-btn ${activitySelectedYear === 'all' ? 'active' : ''}"
                        data-year="all">Alle Jahre</button>`;

    // Nur jeden 5. Jahr zeigen wenn viele Jahre
    const step = years.length > 20 ? 5 : (years.length > 10 ? 2 : 1);

    for (let i = 0; i < years.length; i += step) {
        const year = years[i];
        const isActive = activitySelectedYear === year;
        html += `<button class="activity-year-btn ${isActive ? 'active' : ''}"
                         data-year="${year}">${year}</button>`;
    }

    container.innerHTML = html;

    // Click-Handler
    container.querySelectorAll('.activity-year-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const year = btn.dataset.year;
            activitySelectedYear = year === 'all' ? 'all' : parseInt(year);

            // Active-Status aktualisieren
            container.querySelectorAll('.activity-year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Heatmap neu rendern
            renderActivityHeatmap();
        });
    });
}

/**
 * Rendert die Heatmap-Grid
 */
function renderActivityHeatmap() {
    const container = document.getElementById('activity-heatmap');
    if (!container || !activityIndex) return;

    const { byDate, years } = activityIndex;

    // Jahre filtern
    const displayYears = activitySelectedYear === 'all'
        ? years
        : [activitySelectedYear];

    // Max-Wert fuer Farbskala berechnen (fuer angezeigte Jahre)
    let maxCount = 0;
    for (const [date, data] of byDate) {
        const year = parseInt(date.substring(0, 4));
        if (displayYears.includes(year) && data.count > maxCount) {
            maxCount = data.count;
        }
    }

    // HTML generieren
    let html = '';

    for (const year of displayYears) {
        html += `<div class="activity-year-block">
            <div class="activity-year-label">${year}</div>
            <div class="activity-year-grid">`;

        // Erstes Datum des Jahres
        const firstDay = new Date(year, 0, 1);
        const lastDay = new Date(year, 11, 31);

        // Fuer jeden Tag des Jahres
        const currentDate = new Date(firstDay);
        let weekHtml = '<div class="activity-week">';

        // Leere Zellen am Anfang (vor erstem Wochentag)
        const firstWeekday = firstDay.getDay();
        const adjustedFirstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;
        for (let i = 0; i < adjustedFirstWeekday; i++) {
            weekHtml += '<span class="activity-cell activity-cell-empty"></span>';
        }

        while (currentDate <= lastDay) {
            const dateStr = currentDate.toISOString().substring(0, 10);
            const data = byDate.get(dateStr);
            const count = data ? data.count : 0;
            const level = getActivityLevel(count, maxCount);

            const weekday = currentDate.getDay();
            const adjustedWeekday = weekday === 0 ? 6 : weekday - 1;

            // Neue Woche starten (Montag)
            if (adjustedWeekday === 0 && currentDate > firstDay) {
                weekHtml += '</div><div class="activity-week">';
            }

            weekHtml += `<span class="activity-cell activity-level-${level}"
                              data-date="${dateStr}"
                              data-count="${count}"
                              title="${dateStr}: ${count} Brief${count !== 1 ? 'e' : ''}"></span>`;

            currentDate.setDate(currentDate.getDate() + 1);
        }

        weekHtml += '</div>';
        html += weekHtml + '</div></div>';
    }

    container.innerHTML = html;

    // Click-Handler fuer Zellen
    container.querySelectorAll('.activity-cell[data-date]').forEach(cell => {
        cell.addEventListener('click', () => {
            const date = cell.dataset.date;
            const count = parseInt(cell.dataset.count);
            if (count > 0) {
                showActivityDetails(date);
            }
        });
    });
}

/**
 * Berechnet Aktivitaets-Level (0-4) fuer Farbskala
 */
function getActivityLevel(count, maxCount) {
    if (count === 0) return 0;
    if (maxCount === 0) return 0;

    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

/**
 * Zeigt Details fuer einen bestimmten Tag
 */
function showActivityDetails(date) {
    const detailsPanel = document.getElementById('activity-details');
    const dateEl = document.getElementById('activity-details-date');
    const listEl = document.getElementById('activity-details-list');

    if (!detailsPanel || !dateEl || !listEl || !activityIndex) return;

    const data = activityIndex.byDate.get(date);
    if (!data) return;

    // Datum formatieren
    const dateObj = new Date(date);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = dateObj.toLocaleDateString('de-DE', options);

    // Briefe des Tages finden
    const allLetters = state.getFilteredLetters();
    const dayLetters = allLetters.filter(l => l.date === date);

    // Liste rendern
    let html = '';
    for (const letter of dayLetters) {
        const senderName = letter.sender?.name || 'Unbekannt';
        const recipientName = letter.recipient?.name || 'Unbekannt';
        const place = letter.place_sent?.name || '';

        html += `<div class="activity-detail-item" data-letter-id="${letter.id}">
            <span class="activity-detail-sender">${senderName}</span>
            <span class="activity-detail-arrow"><i class="fas fa-arrow-right"></i></span>
            <span class="activity-detail-recipient">${recipientName}</span>
            ${place ? `<span class="activity-detail-place">(${place})</span>` : ''}
        </div>`;
    }

    listEl.innerHTML = html;
    detailsPanel.classList.remove('hidden');

    // Click-Handler fuer Brief-Details
    listEl.querySelectorAll('.activity-detail-item').forEach(item => {
        item.addEventListener('click', () => {
            const letterId = item.dataset.letterId;
            const letter = allLetters.find(l => l.id === letterId);
            if (letter) {
                showLetterDetailModal(letter);
            }
        });
    });
}

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
