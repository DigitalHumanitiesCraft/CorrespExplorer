// Explore View - Generic CMIF visualization
// Displays data from sessionStorage (uploaded/loaded via upload.js)

import { LANGUAGE_COLORS, LANGUAGE_LABELS, UI_DEFAULTS, MAP_DEFAULTS, NETWORK_DEFAULTS, computeLanguageColors } from './constants.js';
import { initBasketUI } from './basket-ui.js';
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

const IS_PRODUCTION = true;

let map;
let allLetters = [];
let filteredLetters = [];
let placeAggregation = {};
let dataIndices = {};
let dataMeta = {};
let temporalFilter = null;
let dateRange = { min: 1800, max: 2000 };

// Quality filter state
let qualityFilter = {
    preciseDates: false,
    knownPersons: false,
    locatedPlaces: false
};

// Track state
let handlersSetup = false;
let mapInitialized = false;

// Topics view state
let subjectIndex = {};
let selectedSubjectId = null;
let topicsSearchTerm = '';
let topicsSortOrder = 'count-desc';

// Places view state
let placesIndex = {};
let selectedPlaceId = null;
let placesSearchTerm = '';
let placesSortOrder = 'count-desc';

// Mentions Flow view state
let mentionedPersonsIndex = new Map();
let mentionsFlowMode = 'sankey'; // 'sankey' or 'network'
let mentionsTopN = 20;  // Reduced from 50 to reduce cognitive load
let mentionsMinCount = 2;
let mentionsMinSenderMentions = 5;  // Minimum mentions for sender to be shown

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
    const container = document.getElementById('data-coverage-details');
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

    try {
        const data = await loadData();

        if (!data) {
            // No data available, redirect to index
            window.location.href = 'index.html';
            return;
        }

        allLetters = data.letters || [];
        filteredLetters = allLetters;
        dataIndices = data.indices || {};
        dataMeta = data.meta || {};

        // Compute dynamic language colors based on data distribution
        computeLanguageColors(allLetters);

        // Calculate date range from data (filter unrealistic years)
        const years = allLetters.map(l => l.year).filter(y =>
            y !== null && y !== undefined && y >= 1400 && y <= 2100
        );
        if (years.length > 0) {
            dateRange.min = Math.min(...years);
            dateRange.max = Math.max(...years);
        }

        placeAggregation = aggregateLettersByPlace(allLetters, dataIndices.places || {});

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
        initExport();
        initMissingPlacesModal();
        initBasketUI(dataIndices, allLetters);

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

// Load data based on URL parameter or sessionStorage
async function loadData() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataset = urlParams.get('dataset');

    // HSA dataset - load from preprocessed JSON
    if (dataset === 'hsa') {
        try {
            const response = await fetch('data/hsa-letters.json');
            if (!response.ok) {
                throw new Error('HSA-Daten konnten nicht geladen werden');
            }
            const data = await response.json();
            return {
                ...data,
                sourceInfo: { type: 'preset', source: 'hsa' }
            };
        } catch (e) {
            log.error('Failed to load HSA data: ' + e.message);
            return null;
        }
    }

    // Other datasets - try sessionStorage (for smaller uploads)
    const storedData = sessionStorage.getItem('cmif-data');
    if (storedData) {
        try {
            return JSON.parse(storedData);
        } catch (e) {
            log.error('Failed to parse stored data');
        }
    }

    // No dataset specified and nothing in storage - redirect will happen
    return null;
}

// Update UI with data info
function updateUI(data) {
    // Update title
    const titleEl = document.getElementById('dataset-title');
    if (titleEl && data.meta?.title) {
        titleEl.textContent = data.meta.title;
        document.title = `${data.meta.title} - CorrespExplorer`;
    }

    // Update stats
    const totalLetters = document.getElementById('total-letters-count');
    const totalSenders = document.getElementById('total-senders-count');
    const totalPlacesEl = document.getElementById('total-places-count');

    if (totalLetters) totalLetters.textContent = (data.meta?.total_letters || allLetters.length).toLocaleString('de-DE');
    if (totalSenders) totalSenders.textContent = (data.meta?.unique_senders || Object.keys(dataIndices.persons || {}).length).toLocaleString('de-DE');
    if (totalPlacesEl) totalPlacesEl.textContent = (data.meta?.unique_places || Object.keys(dataIndices.places || {}).length).toLocaleString('de-DE');

    // Update uncertainty statistics if available
    updateUncertaintyStats(data.meta?.uncertainty);

    // Update source info
    const sourceInfo = document.getElementById('source-info');
    if (sourceInfo && data.sourceInfo) {
        if (data.sourceInfo.type === 'file') {
            sourceInfo.textContent = `Datei: ${data.sourceInfo.source}`;
        } else if (data.sourceInfo.type === 'url') {
            sourceInfo.innerHTML = `<a href="${data.sourceInfo.source}" target="_blank">URL</a>`;
        } else if (data.sourceInfo.type === 'preset') {
            sourceInfo.textContent = `Beispieldatensatz: ${data.sourceInfo.source.toUpperCase()}`;
        }
    }

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

    const container = document.getElementById('language-checkboxes');
    const filterGroup = document.getElementById('language-filter-group');

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

    const filterGroup = document.getElementById('topics-filter-group');
    const showAllLink = document.getElementById('show-all-topics');

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
    const searchInput = document.getElementById('topics-quick-search');
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
    const container = document.getElementById('topics-quick-filter');
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
    const container = document.getElementById('topics-quick-filter');
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
    const layerSwitcherBtn = document.getElementById('layer-switcher');
    if (layerSwitcherBtn) {
        layerSwitcherBtn.addEventListener('click', () => {
            currentMapStyle = (currentMapStyle === 'light') ? 'dark' : 'light';
            setMapStyle(currentMapStyle);
        });
    }

    // Color mode toggle button
    const colorToggleBtn = document.getElementById('map-color-toggle');
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

    const layerSwitcherBtn = document.getElementById('layer-switcher');
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
    const btn = document.getElementById('map-color-toggle');
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
    const legend = document.getElementById('map-legend');
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
    const yearRangeSlider = document.getElementById('year-range-slider');
    const yearRangeText = document.getElementById('year-range-text');
    const resetButton = document.getElementById('reset-filters');

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
    const preciseDatesCheckbox = document.getElementById('filter-precise-dates');
    const knownPersonsCheckbox = document.getElementById('filter-known-persons');
    const locatedPlacesCheckbox = document.getElementById('filter-located-places');

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

    filteredLetters = allLetters.filter(letter => {
        // Time filter
        let temporalMatch = true;
        if (temporalFilter && letter.year) {
            temporalMatch = letter.year >= temporalFilter.start && letter.year <= temporalFilter.end;
        }

        // Language filter
        let languageMatch = true;
        if (languageFilters.length > 0 && letter.language) {
            languageMatch = languageFilters.includes(letter.language.code);
        }

        // Person filter
        let personMatch = true;
        if (selectedPersonId) {
            const senderId = letter.sender?.id || letter.sender?.name;
            const recipientId = letter.recipient?.id || letter.recipient?.name;
            personMatch = senderId === selectedPersonId || recipientId === selectedPersonId;
        }

        // Subject filter
        let subjectMatch = true;
        if (selectedSubjectId) {
            const letterSubjects = letter.mentions?.subjects || [];
            subjectMatch = letterSubjects.some(s =>
                (s.uri || s.id || s.label) === selectedSubjectId || s.label === selectedSubjectId
            );
        }

        // Quality filters
        let qualityMatch = true;
        if (qualityFilter.preciseDates) {
            qualityMatch = qualityMatch && letter.datePrecision === 'day';
        }
        if (qualityFilter.knownPersons) {
            const senderOk = letter.sender?.precision === 'identified';
            const recipientOk = !letter.recipient || letter.recipient.precision === 'identified';
            qualityMatch = qualityMatch && senderOk && recipientOk;
        }
        if (qualityFilter.locatedPlaces) {
            qualityMatch = qualityMatch && letter.place_sent?.precision === 'exact';
        }

        return temporalMatch && languageMatch && personMatch && subjectMatch && qualityMatch;
    });

    // Re-aggregate places based on filtered letters
    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});

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
    const letterCountEl = document.getElementById('letter-count');
    if (letterCountEl && hasActiveFilter) {
        letterCountEl.innerHTML = `${filteredLetters.length} <span class="filtered-indicator">/ ${allLetters.length}</span>`;
    } else if (letterCountEl) {
        letterCountEl.textContent = allLetters.length;
    }
}

// Update person filter display in sidebar
function updatePersonFilterDisplay() {
    let filterDisplay = document.getElementById('person-filter-display');

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
    const slider = document.getElementById('year-range-slider');
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
    const loadingOverlay = document.getElementById('loading-overlay');
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

// ===================
// URL STATE MANAGEMENT
// ===================

function initUrlState() {
    // Read initial state from URL
    const urlParams = new URLSearchParams(window.location.search);

    // View
    const view = urlParams.get('view');
    if (view && ['map', 'persons', 'letters', 'timeline', 'topics'].includes(view)) {
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
    const newParams = new URLSearchParams();
    if (dataset) newParams.set('dataset', dataset);

    // View
    if (currentView !== 'map') {
        newParams.set('view', currentView);
    }

    // Year range (only if not default)
    if (temporalFilter) {
        newParams.set('yearMin', temporalFilter.start);
        newParams.set('yearMax', temporalFilter.end);
    }

    // Person filter
    if (selectedPersonId) {
        newParams.set('person', selectedPersonId);
    }

    // Subject filter
    if (selectedSubjectId) {
        newParams.set('subject', selectedSubjectId);
    }

    // Languages (only if not all selected)
    const checkedLangs = getCheckedValues('language');
    const allLangs = Object.keys(dataIndices.languages || {});
    if (checkedLangs.length > 0 && checkedLangs.length < allLangs.length) {
        newParams.set('langs', checkedLangs.join(','));
    }

    // Quality filters
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

let currentView = 'map';

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

    // Update sidebar legend for current view
    updateSidebarLegend(view);

    // Render view-specific content
    if (view === 'persons') {
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
    } else if (view === 'map' && map) {
        map.resize();
    }
}

// Update sidebar legend based on current view
function updateSidebarLegend(view) {
    // All legend content elements
    const legendElements = {
        map: document.getElementById('legend-map'),
        letters: document.getElementById('legend-letters'),
        timeline: document.getElementById('legend-timeline'),
        persons: document.getElementById('legend-persons'),
        topics: document.getElementById('legend-topics'),
        places: document.getElementById('legend-places'),
        network: document.getElementById('legend-network')
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

// ===================
// PERSONS LIST
// ===================

let personsSortOrder = 'letters-desc';
let personsSearchTerm = '';

function initPersonsView() {
    const searchInput = document.getElementById('person-search');
    const sortSelect = document.getElementById('person-sort');

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

function renderPersonsList() {
    const container = document.getElementById('persons-list');
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
    const searchInput = document.getElementById('letter-search');
    const sortSelect = document.getElementById('letter-sort');

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
    const container = document.getElementById('letters-list');
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

    const modal = document.getElementById('letter-modal');
    const title = document.getElementById('letter-modal-title');
    const body = document.getElementById('letter-modal-body');

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

    const modal = document.getElementById('person-modal');
    const title = document.getElementById('person-modal-title');
    const body = document.getElementById('person-modal-body');

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

    // Action buttons
    html += '<div class="person-detail-actions">';

    const correspSearchUrl = buildCorrespSearchUrl(person);
    if (correspSearchUrl) {
        html += `<a href="${correspSearchUrl}" target="_blank" class="btn btn-primary">
            <i class="fas fa-search"></i> Bei correspSearch suchen
        </a>`;
    }

    html += `<button class="btn btn-secondary" onclick="filterByPerson('${escapeHtml(personId)}'); document.getElementById('person-modal').style.display='none';">
        <i class="fas fa-filter"></i> Briefe filtern
    </button>`;

    html += '</div></div>';

    body.innerHTML = html;
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
    const modal = document.getElementById('letter-modal');
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
    const stackToggle = document.getElementById('timeline-stack-toggle');
    if (stackToggle) {
        stackToggle.addEventListener('change', (e) => {
            timelineStackMode = e.target.value;
            renderTimeline();
        });
    }
}

function renderTimeline() {
    const container = document.getElementById('timeline-chart');
    const totalEl = document.getElementById('timeline-total');
    const legendEl = document.getElementById('timeline-stack-legend');
    const undatedBin = document.getElementById('timeline-undated-bin');
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
                const slider = document.getElementById('year-range-slider');
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
            const slider = document.getElementById('year-range-slider');
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
            const slider = document.getElementById('year-range-slider');
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
    const searchInput = document.getElementById('topic-search');
    const sortSelect = document.getElementById('topic-sort');

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
    const filterBtn = document.getElementById('topic-filter-btn');
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
    const container = document.getElementById('topics-list');
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
            <div class="topic-card ${isActive ? 'active' : ''}" data-id="${escapeHtml(topic.id)}">
                <div class="topic-info">
                    <div class="topic-name" title="${escapeHtml(topic.label)}">${escapeHtml(topic.label)}</div>
                    <div class="topic-bar-container">
                        <div class="topic-bar" style="width: ${barWidth}%"></div>
                    </div>
                </div>
                <div class="topic-count">${topic.filteredCount}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.topic-card').forEach(card => {
        card.addEventListener('click', () => {
            const topicId = card.dataset.id;
            selectTopic(topicId);

            // Update active state
            container.querySelectorAll('.topic-card').forEach(c => c.classList.remove('active'));
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

    const emptyState = document.querySelector('.topic-detail-empty');
    const content = document.getElementById('topic-detail-content');
    const title = document.getElementById('topic-detail-title');
    const count = document.getElementById('topic-detail-count');
    const correspondents = document.getElementById('topic-correspondents');
    const timeline = document.getElementById('topic-timeline');
    const related = document.getElementById('topic-related');
    const filterBtn = document.getElementById('topic-filter-btn');

    if (emptyState) emptyState.style.display = 'none';
    if (content) content.style.display = 'block';

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
                <div class="topic-correspondent">
                    <span class="topic-correspondent-name">${escapeHtml(person.name)}</span>
                    <span class="topic-correspondent-count">${person.count}</span>
                    <div class="topic-correspondent-bar">
                        <div class="topic-correspondent-bar-fill" style="width: ${barWidth}%"></div>
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
                return `<div class="topic-mini-bar" style="height: ${height}%" data-tooltip="${y.year}: ${y.count}"></div>`;
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
            <span class="topic-related-tag" data-id="${escapeHtml(rt.id)}">
                ${escapeHtml(rt.label)}
                <span class="topic-related-tag-count">(${rt.count})</span>
            </span>
        `).join('');

        // Add click handlers to related tags
        related.querySelectorAll('.topic-related-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const relatedId = tag.dataset.id;
                selectTopic(relatedId);
                // Update list selection
                const container = document.getElementById('topics-list');
                container?.querySelectorAll('.topic-card').forEach(c => {
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
    let filterDisplay = document.getElementById('subject-filter-display');

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

    const searchInput = document.getElementById('place-search');
    const sortSelect = document.getElementById('place-sort');

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
    const filterBtn = document.getElementById('place-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (selectedPlaceId) {
                applyPlaceFilter(selectedPlaceId);
                switchView('letters');
            }
        });
    }

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
    const container = document.getElementById('places-list');
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
            <div class="place-card ${isActive ? 'active' : ''} ${precisionClass}" data-place-id="${place.id}">
                <div class="place-info">
                    <div class="place-name ${precisionClass}" title="${escapeHtml(place.name)}">${noCoordIcon}${escapeHtml(place.name)}</div>
                    <div class="place-meta">${place.senderCount} Absender ${yearRange ? `| ${yearRange}` : ''}</div>
                </div>
                <div class="place-count">${place.filteredCount}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.place-card').forEach(card => {
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
    document.querySelectorAll('.place-card').forEach(card => {
        card.classList.toggle('active', card.dataset.placeId === placeId);
    });

    // Show detail panel
    const emptyState = document.querySelector('.place-detail-empty');
    const content = document.getElementById('place-detail-content');

    if (emptyState) emptyState.style.display = 'none';
    if (content) content.style.display = 'block';

    // Calculate filtered count for this place
    const filteredCount = filteredLetters.filter(l => {
        if (!l.place_sent?.name) return false;
        const letterPlaceId = l.place_sent.geonames_id || `name:${l.place_sent.name}`;
        return letterPlaceId === placeId;
    }).length;

    // Update title and count
    document.getElementById('place-detail-title').textContent = place.name;
    document.getElementById('place-detail-count').textContent = `${filteredCount} Briefe`;

    // Render top senders
    const sendersContainer = document.getElementById('place-top-senders');
    if (sendersContainer) {
        sendersContainer.innerHTML = place.topSenders.map(s =>
            `<div class="place-sender-item">
                <span class="place-sender-name">${escapeHtml(s.name)}</span>
                <span class="place-sender-count">${s.count}</span>
            </div>`
        ).join('');
    }

    // Render mini timeline
    const timelineContainer = document.getElementById('place-timeline');
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

        timelineContainer.innerHTML = `
            <div class="mini-timeline-bars">
                ${years.map(y => {
                    const height = y.count > 0 ? Math.max(10, (y.count / maxCount) * 100) : 0;
                    return `<div class="mini-timeline-bar" style="height: ${height}%" title="${y.year}: ${y.count}"></div>`;
                }).join('')}
            </div>
            <div class="mini-timeline-labels">
                <span>${place.yearMin}</span>
                <span>${place.yearMax}</span>
            </div>
        `;
    } else if (timelineContainer) {
        timelineContainer.innerHTML = '<p class="no-data">Keine Zeitdaten</p>';
    }

    // Render languages
    const languagesContainer = document.getElementById('place-languages');
    if (languagesContainer) {
        const langEntries = Object.entries(place.languages)
            .sort((a, b) => b[1] - a[1]);

        languagesContainer.innerHTML = langEntries.map(([code, count]) => {
            const label = LANGUAGE_LABELS[code] || code.toUpperCase();
            const color = LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other;
            return `<span class="place-language-tag" style="border-left: 3px solid ${color}">${label} (${count})</span>`;
        }).join('');
    }

    // Update GeoNames link
    const geonamesLink = document.getElementById('place-geonames-link');
    if (geonamesLink) {
        geonamesLink.href = `https://www.geonames.org/${placeId}`;
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

// ===================
// EXPORT
// ===================

function initExport() {
    const exportBtn = document.getElementById('export-btn');
    const modal = document.getElementById('export-modal');
    const closeBtn = modal?.querySelector('.modal-close');
    const exportOptions = modal?.querySelectorAll('.export-option');

    if (exportBtn && modal) {
        exportBtn.addEventListener('click', () => {
            const info = document.getElementById('export-info');
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
    const typeSelect = document.getElementById('network-type');
    const thresholdInput = document.getElementById('network-threshold');
    const maxNodesInput = document.getElementById('network-max-nodes');
    const resetZoomBtn = document.getElementById('network-reset-zoom');

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
        const thresholdValue = document.getElementById('network-threshold-value');
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
    const colorModeSelect = document.getElementById('network-color-mode');
    if (colorModeSelect) {
        colorModeSelect.addEventListener('change', (e) => {
            networkColorMode = e.target.value;
            renderNetwork();
        });
    }

    // Hide ego checkbox
    const hideEgoCheckbox = document.getElementById('network-hide-ego');
    if (hideEgoCheckbox) {
        hideEgoCheckbox.addEventListener('change', (e) => {
            networkHideEgo = e.target.checked;
            renderNetwork();
        });
    }

    log.init('Network view initialized');
}

function updateNetworkTypeOptions() {
    const typeSelect = document.getElementById('network-type');
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
    const label = document.getElementById('network-threshold-label');
    const input = document.getElementById('network-threshold');
    const valueDisplay = document.getElementById('network-threshold-value');
    const colorGroup = document.getElementById('network-color-group');

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
        const colorSelect = document.getElementById('network-color-mode');
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
    const container = document.getElementById('network-graph');
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
    const nodeCount = document.getElementById('network-node-count');
    const edgeCount = document.getElementById('network-edge-count');
    const coverageDiv = document.getElementById('network-coverage');
    const infoText = document.getElementById('network-info-text');

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
    const legendDiv = document.getElementById('network-legend');
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
    const modal = document.getElementById('missing-places-modal');
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
    const modal = document.getElementById('missing-places-modal');
    const body = document.getElementById('missing-places-body');

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
    // View wird on-demand gerendert in switchView
}

function renderMentionsFlow() {
    if (!availableViews['mentions-flow']?.available) {
        document.getElementById('mentions-flow-placeholder').innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>${availableViews['mentions-flow']?.reason || 'Keine Mentions-Daten vorhanden'}</p>
        `;
        return;
    }

    const container = document.getElementById('mentions-flow-graph');
    const placeholder = document.getElementById('mentions-flow-placeholder');

    // Clear previous
    container.innerHTML = '';
    placeholder.style.display = 'flex';
    placeholder.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Berechne Sankey-Diagramm...</p>';

    try {
        // Build Sankey data with filtering parameters
        const sankeyData = buildSankeyData(
            filteredLetters,
            mentionsTopN,
            mentionsMinSenderMentions,
            mentionsMinCount
        );

        if (sankeyData.nodes.length === 0) {
            placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Keine Mentions-Daten in den gefilterten Briefen (nach Filtern)</p>';
            return;
        }

        // Setup dimensions
        const width = container.clientWidth || 1200;
        const height = container.clientHeight || 800;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`);

        const g = svg.append('g');

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Create Sankey generator
        const sankeyGenerator = d3.sankey()
            .nodeWidth(15)
            .nodePadding(10)
            .extent([[100, 50], [width - 100, height - 50]]);

        // Generate layout
        const {nodes, links} = sankeyGenerator({
            nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
            links: sankeyData.links.map(d => Object.assign({}, d))
        });

        // Render links
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(links)
            .join('path')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('fill', 'none')
            .attr('opacity', 0.5)
            .on('mouseover', function() {
                d3.select(this).attr('opacity', 1.0);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 0.5);
            });

        // Render nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .join('g');

        node.append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => d.y1 - d.y0)
            .attr('width', sankeyGenerator.nodeWidth())
            .attr('fill', d => d.column === 0 ? '#2c5f8d' : '#f59e0b')
            .attr('rx', 3);

        // Add labels
        node.append('text')
            .attr('x', d => d.column === 0 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.column === 0 ? 'start' : 'end')
            .text(d => d.name)
            .style('font-size', '11px')
            .style('fill', 'var(--color-text-primary)');

        // Hide placeholder
        placeholder.style.display = 'none';

        log.render(`Rendered Sankey: ${nodes.length} nodes, ${links.length} links`);
    } catch (error) {
        log.error('Error rendering Sankey: ' + error.message);
        placeholder.innerHTML = `<i class="fas fa-exclamation-triangle"></i><p>Fehler beim Rendern: ${error.message}</p>`;
    }
}

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
