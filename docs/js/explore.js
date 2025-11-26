// Explore View - Generic CMIF visualization
// Displays data from sessionStorage (uploaded/loaded via upload.js)

import { LANGUAGE_COLORS, LANGUAGE_LABELS, UI_DEFAULTS } from './constants.js';

// Utility: Debounce function
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

const IS_PRODUCTION = true;

let map;
let allLetters = [];
let filteredLetters = [];
let placeAggregation = {};
let dataIndices = {};
let dataMeta = {};
let temporalFilter = null;
let dateRange = { min: 1800, max: 2000 };

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

// Logging utility
const log = {
    init: (msg) => !IS_PRODUCTION && console.log(`[INIT] ${msg}`),
    render: (msg) => !IS_PRODUCTION && console.log(`[RENDER] ${msg}`),
    event: (msg) => !IS_PRODUCTION && console.log(`[EVENT] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

// Default color
const PRIMARY_COLOR = '#1e40af';

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

        // Calculate date range from data
        const years = allLetters.map(l => l.year).filter(y => y !== null && y !== undefined);
        if (years.length > 0) {
            dateRange.min = Math.min(...years);
            dateRange.max = Math.max(...years);
        }

        placeAggregation = aggregateLettersByPlace(allLetters, dataIndices.places || {});

        // Read URL state before UI init
        initUrlState();

        updateUI(data);
        log.init(`Loaded ${allLetters.length} letters, ${Object.keys(placeAggregation).length} places with coordinates`);

        initMap();
        initFilters();
        initViewSwitcher();
        initPersonsView();
        initLettersView();
        initTimeline();
        initTopicsView();
        initPlacesView();
        initExport();

        // Apply initial view from URL
        if (currentView !== 'map') {
            switchView(currentView);
        }

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
    const totalPlaces = document.getElementById('total-places-count');
    const visiblePlaces = document.getElementById('map-visible-count');
    const missingPlaces = document.getElementById('map-missing-count');

    if (totalLetters) totalLetters.textContent = (data.meta?.total_letters || allLetters.length).toLocaleString('de-DE');
    if (totalSenders) totalSenders.textContent = (data.meta?.unique_senders || Object.keys(dataIndices.persons || {}).length).toLocaleString('de-DE');
    if (totalPlaces) totalPlaces.textContent = (data.meta?.unique_places || Object.keys(dataIndices.places || {}).length).toLocaleString('de-DE');

    const placesWithCoords = Object.keys(placeAggregation).length;
    const totalPlacesCount = data.meta?.unique_places || Object.keys(dataIndices.places || {}).length;
    if (visiblePlaces) visiblePlaces.textContent = placesWithCoords;
    if (missingPlaces) missingPlaces.textContent = Math.max(0, totalPlacesCount - placesWithCoords);

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
        // Handle special cases
        if (displayLabel === 'None' || code === 'None') {
            displayLabel = 'Unbekannt';
        }
        const label = document.createElement('label');
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
                letterIds: []
            };
        }

        places[placeId].letter_count++;
        places[placeId].letterIds.push(letter.id);
        if (letter.year) places[placeId].years.add(letter.year);
        if (letter.sender?.name) {
            const senderName = letter.sender.name;
            places[placeId].senderCounts[senderName] = (places[placeId].senderCounts[senderName] || 0) + 1;
        }
        if (letter.language?.code) places[placeId].languages.add(letter.language.code);
    });

    // Convert Sets to arrays and calculate top senders
    Object.values(places).forEach(place => {
        place.years = Array.from(place.years).sort();
        place.languages = Array.from(place.languages);
        // Sort senders by letter count (descending)
        place.topSenders = Object.entries(place.senderCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
        place.senderCount = Object.keys(place.senderCounts).length;
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
    });

    // Layer switcher button
    const layerSwitcherBtn = document.getElementById('layer-switcher');
    if (layerSwitcherBtn) {
        layerSwitcherBtn.addEventListener('click', () => {
            currentMapStyle = (currentMapStyle === 'light') ? 'dark' : 'light';
            setMapStyle(currentMapStyle);
        });
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
                languages: place.languages.join(', ')
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
            clusterMaxZoom: 10,
            clusterRadius: 40,
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
    // Cluster layer
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

    // Individual place markers
    map.addLayer({
        id: 'places-layer',
        type: 'circle',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': PRIMARY_COLOR,
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
            'circle-opacity': 0.8
        }
    });
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

    // Parse top senders from JSON
    let topSendersHtml = '';
    if (props.top_senders) {
        try {
            const topSenders = JSON.parse(props.top_senders);
            if (topSenders.length > 0) {
                const senderItems = topSenders.map(s =>
                    `<li>${escapeHtml(s.name)} <span class="popup-sender-count">(${s.count})</span></li>`
                ).join('');
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
        <div class="popup">
            <h3>${props.name}</h3>
            <div class="popup-stats">
                <p><strong>${props.letter_count}</strong> Briefe von ${props.sender_count} Absendern</p>
                <p class="popup-year-range">${yearRange}</p>
                ${topSendersHtml}
                ${props.languages ? `<p class="popup-languages"><small>Sprachen: ${props.languages}</small></p>` : ''}
            </div>
        </div>
    `;

    new maplibregl.Popup()
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map);
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
            subjectMatch = letterSubjects.some(s => s.id === selectedSubjectId || s.label === selectedSubjectId);
        }

        return temporalMatch && languageMatch && personMatch && subjectMatch;
    });

    // Re-aggregate places based on filtered letters
    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});

    if (map && map.loaded() && mapInitialized) {
        renderPlaceMarkers(placeAggregation);
    }

    updateFilterCounts();
    updateUrlState();
    updatePersonFilterDisplay();

    // Re-render active view
    if (currentView === 'topics') {
        renderTopicsList();
    } else if (currentView === 'timeline') {
        renderTimeline();
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
}

// Clear person filter
function clearPersonFilter() {
    selectedPersonId = null;
    applyFilters();
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
    } else if (view === 'map' && map) {
        map.resize();
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

    container.innerHTML = persons.map(person => {
        const initials = person.name.split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
        const total = person.sent + person.received;
        const personKey = person.id || person.name;

        return `
            <div class="person-card" data-id="${escapeHtml(personKey)}" data-name="${escapeHtml(person.name)}">
                <div class="person-avatar">${initials}</div>
                <div class="person-info">
                    <div class="person-name">${escapeHtml(person.name)}</div>
                    <div class="person-stats">
                        <span><i class="fas fa-paper-plane"></i> ${person.sent} gesendet</span>
                        <span><i class="fas fa-inbox"></i> ${person.received} empfangen</span>
                    </div>
                </div>
                <div class="person-count">${total}</div>
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
        const sender = letter.sender?.name || 'Unbekannt';
        const recipient = letter.recipient?.name || 'Unbekannt';
        const date = letter.date || 'Datum unbekannt';
        const place = letter.place_sent?.name || '';
        const language = letter.language?.label || '';

        return `
            <div class="letter-card" data-id="${letter.id || ''}">
                <div class="letter-header">
                    <div class="letter-participants">
                        ${escapeHtml(sender)}
                        <span class="letter-arrow"><i class="fas fa-arrow-right"></i></span>
                        ${escapeHtml(recipient)}
                    </div>
                    <div class="letter-date">${date}</div>
                </div>
                <div class="letter-meta">
                    ${place ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(place)}</span>` : ''}
                    ${language ? `<span><i class="fas fa-language"></i> ${escapeHtml(language)}</span>` : ''}
                    ${letter.url ? `<span><a href="${letter.url}" target="_blank"><i class="fas fa-external-link-alt"></i> Quelle</a></span>` : ''}
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

    // Add click handlers for letter details
    container.querySelectorAll('.letter-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open modal if clicking on external link
            if (e.target.closest('a')) return;

            const letterId = card.dataset.id;
            if (letterId) {
                showLetterDetail(letterId);
            }
        });
    });
}

// ===================
// LETTER DETAIL MODAL
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
    if (!container) return;

    // Use filtered letters
    const lettersToUse = filteredLetters;
    const isFiltered = filteredLetters.length < allLetters.length;

    // Get all years from all letters for consistent x-axis
    const allYearsSet = new Set();
    allLetters.forEach(letter => {
        if (letter.year) allYearsSet.add(letter.year);
    });
    const allYearsSorted = Array.from(allYearsSet).sort((a, b) => a - b);

    if (allYearsSorted.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Keine Jahresdaten verfuegbar</p></div>';
        return;
    }

    const minYear = allYearsSorted[0];
    const maxYear = allYearsSorted[allYearsSorted.length - 1];

    // Build stacked data by year and language
    const yearData = {};
    const languageTotals = {};

    // Initialize all years
    for (let y = minYear; y <= maxYear; y++) {
        yearData[y] = { total: 0, languages: {} };
    }

    // Count letters per year per language
    lettersToUse.forEach(letter => {
        if (!letter.year) return;
        const year = letter.year;
        const lang = letter.language?.code || 'other';
        const langKey = LANGUAGE_COLORS[lang] ? lang : 'other';

        yearData[year].total++;
        yearData[year].languages[langKey] = (yearData[year].languages[langKey] || 0) + 1;
        languageTotals[langKey] = (languageTotals[langKey] || 0) + 1;
    });

    // Find max for scaling
    let maxCount = 0;
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

        // Build stacked segments
        let segments = '';
        let tooltipParts = [`${y}: ${data.total} Briefe`];

        if (data.total > 0) {
            let currentBottom = 0;
            sortedLanguages.forEach(lang => {
                const count = data.languages[lang] || 0;
                if (count > 0) {
                    const segmentHeight = (count / data.total) * totalHeight;
                    const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other;
                    segments += `<div class="timeline-stack-segment" style="height: ${segmentHeight}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${lang}" data-count="${count}"></div>`;
                    currentBottom += segmentHeight;
                    const langLabel = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                    tooltipParts.push(`${langLabel}: ${count}`);
                }
            });
        }

        bars.push(`
            <div class="timeline-bar-wrapper" data-year="${y}" data-year-end="${y}">
                <div class="timeline-stacked-bar" style="height: ${totalHeight}%">
                    ${segments}
                </div>
                <div class="timeline-bar-tooltip">${tooltipParts.join('<br>')}</div>
                ${showLabel ? `<span class="timeline-bar-label">${y}</span>` : ''}
            </div>
        `);
    }

    container.innerHTML = bars.join('');

    // Update total
    if (totalEl) {
        const totalCount = lettersToUse.length;
        if (isFiltered) {
            totalEl.textContent = `${totalCount.toLocaleString('de-DE')} von ${allLetters.length.toLocaleString('de-DE')} Briefen (${minYear}-${maxYear})`;
        } else {
            totalEl.textContent = `${totalCount.toLocaleString('de-DE')} Briefe von ${minYear} bis ${maxYear}`;
        }
    }

    // Render legend
    if (legendEl) {
        const legendItems = sortedLanguages
            .filter(lang => languageTotals[lang] > 0)
            .map(lang => {
                const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other;
                const count = languageTotals[lang];
                const label = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                return `<span class="timeline-legend-item"><span class="timeline-legend-color" style="background: ${color}"></span>${label} (${count})</span>`;
            });
        legendEl.innerHTML = legendItems.join('');
    }

    // Add click handlers
    container.querySelectorAll('.timeline-bar-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', () => {
            const year = parseInt(wrapper.dataset.year);

            // Update year slider to single year
            const slider = document.getElementById('year-range-slider');
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([year, year]);
            }

            // Visual feedback
            container.querySelectorAll('.timeline-bar-wrapper').forEach(w => w.classList.remove('selected'));
            wrapper.classList.add('selected');
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

// ===================
// TOPICS VIEW
// ===================

function initTopicsView() {
    // Build subject index from letters
    buildSubjectIndex();

    // Show topics button if subjects exist
    const topicsBtn = document.getElementById('topics-view-btn');
    if (topicsBtn && Object.keys(subjectIndex).length > 0) {
        topicsBtn.style.display = '';
        log.init(`Topics view enabled: ${Object.keys(subjectIndex).length} subjects`);
    }

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
            const subjectId = subject.id || subject.label;
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
                const otherId = otherSubject.id || otherSubject.label;
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
            const subjectId = subject.id || subject.label;
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
                    <div class="topic-name">${escapeHtml(topic.label)}</div>
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
        return subjects.some(s => (s.id || s.label) === topicId);
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
            const otherId = s.id || s.label;
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

// Apply subject filter
function applySubjectFilter(subjectId) {
    selectedSubjectId = subjectId;
    applyFilters();
    updateSubjectFilterDisplay();
    switchView('letters');
    updateUrlState();
}

// Clear subject filter
function clearSubjectFilter() {
    selectedSubjectId = null;
    applyFilters();
    updateSubjectFilterDisplay();
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
        if (!letter.place_sent?.geonames_id) return;

        const placeId = letter.place_sent.geonames_id;

        if (!placesIndex[placeId]) {
            placesIndex[placeId] = {
                id: placeId,
                name: letter.place_sent.name,
                lat: letter.place_sent.lat,
                lon: letter.place_sent.lon,
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
        if (letter.place_sent?.geonames_id) {
            filteredPlaceIds.add(letter.place_sent.geonames_id);
        }
    });

    // Count letters per place in filtered set
    const filteredPlaceCounts = {};
    filteredLetters.forEach(letter => {
        if (letter.place_sent?.geonames_id) {
            const placeId = letter.place_sent.geonames_id;
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

    // Render list
    container.innerHTML = places.map(place => {
        const isActive = selectedPlaceId === place.id;
        const yearRange = place.yearMin && place.yearMax
            ? `${place.yearMin}-${place.yearMax}`
            : '';
        return `
            <div class="place-card ${isActive ? 'active' : ''}" data-place-id="${place.id}">
                <div class="place-info">
                    <div class="place-name">${escapeHtml(place.name)}</div>
                    <div class="place-meta">${place.senderCount} Absender ${yearRange ? `| ${yearRange}` : ''}</div>
                </div>
                <div class="place-count">${place.filteredCount}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.place-card').forEach(card => {
        card.addEventListener('click', () => {
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
    const filteredCount = filteredLetters.filter(l =>
        l.place_sent?.geonames_id === placeId
    ).length;

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
        year: letter.year,
        sender_name: letter.sender?.name || '',
        sender_id: letter.sender?.id || '',
        recipient_name: letter.recipient?.name || '',
        recipient_id: letter.recipient?.id || '',
        place_name: letter.place_sent?.name || '',
        place_geonames: letter.place_sent?.geonames_id || '',
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
// UTILITIES
// ===================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
