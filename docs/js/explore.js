// Explore View - Generic CMIF visualization
// Displays data from sessionStorage (uploaded/loaded via upload.js)

import { debounce } from './utils.js';

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
        initExport();

        // Apply initial view from URL
        if (currentView !== 'map') {
            switchView(currentView);
        }

        // Apply person filter from URL
        if (selectedPersonId) {
            applyPersonFilter(selectedPersonId);
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
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" name="language" value="${code}" checked>
            <span>${lang.label || code}</span>
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
                senders: new Set(),
                languages: new Set(),
                letterIds: []
            };
        }

        places[placeId].letter_count++;
        places[placeId].letterIds.push(letter.id);
        if (letter.year) places[placeId].years.add(letter.year);
        if (letter.sender?.name) places[placeId].senders.add(letter.sender.name);
        if (letter.language?.code) places[placeId].languages.add(letter.language.code);
    });

    // Convert Sets to arrays
    Object.values(places).forEach(place => {
        place.years = Array.from(place.years).sort();
        place.senders = Array.from(place.senders);
        place.languages = Array.from(place.languages);
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
                sender_count: place.senders.length,
                language_count: place.languages.length,
                year_min: place.years.length > 0 ? Math.min(...place.years) : null,
                year_max: place.years.length > 0 ? Math.max(...place.years) : null,
                senders: place.senders.slice(0, 5).join(', '),
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

    const html = `
        <div class="popup">
            <h3>${props.name}</h3>
            <div class="popup-stats">
                <p><strong>${props.letter_count}</strong> Briefe</p>
                <p>${props.sender_count} Absender | ${yearRange}</p>
                ${props.senders ? `<p class="popup-senders"><small>${props.senders}${props.sender_count > 5 ? '...' : ''}</small></p>` : ''}
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

        return temporalMatch && languageMatch && personMatch;
    });

    // Re-aggregate places based on filtered letters
    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});

    if (map && map.loaded() && mapInitialized) {
        renderPlaceMarkers(placeAggregation);
    }

    updateFilterCounts();
    updateUrlState();
    updatePersonFilterDisplay();
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

// Update filter counts
function updateFilterCounts() {
    // Count letters per language
    const languageCounts = {};
    filteredLetters.forEach(letter => {
        if (letter.language?.code) {
            languageCounts[letter.language.code] = (languageCounts[letter.language.code] || 0) + 1;
        }
    });

    // Update count displays
    Object.keys(languageCounts).forEach(code => {
        const el = document.getElementById(`count-lang-${code}`);
        if (el) {
            el.textContent = `(${languageCounts[code]})`;
        }
    });
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
    if (view && ['map', 'persons', 'letters', 'timeline'].includes(view)) {
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

function initTimeline() {
    // Timeline is rendered on demand when view is switched
}

function renderTimeline() {
    const container = document.getElementById('timeline-chart');
    const totalEl = document.getElementById('timeline-total');
    if (!container) return;

    // Use filtered letters if filter is active, otherwise all letters
    const lettersToCount = filteredLetters.length < allLetters.length ? filteredLetters : allLetters;
    const isFiltered = filteredLetters.length < allLetters.length;

    // Count letters per year
    const yearCounts = {};
    lettersToCount.forEach(letter => {
        if (letter.year) {
            yearCounts[letter.year] = (yearCounts[letter.year] || 0) + 1;
        }
    });

    // Use full date range from all letters for consistent display
    const allYearCounts = {};
    allLetters.forEach(letter => {
        if (letter.year) {
            allYearCounts[letter.year] = (allYearCounts[letter.year] || 0) + 1;
        }
    });

    const years = Object.keys(allYearCounts).map(Number).sort((a, b) => a - b);
    if (years.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Keine Jahresdaten verfuegbar</p></div>';
        return;
    }

    // Fill gaps in years
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const allYearsData = [];
    for (let y = minYear; y <= maxYear; y++) {
        allYearsData.push({
            year: y,
            count: yearCounts[y] || 0,
            totalCount: allYearCounts[y] || 0
        });
    }

    // Find max count for scaling (use total for consistent scaling)
    const maxCount = Math.max(...allYearsData.map(y => y.totalCount));

    // Determine if we should group by decade (for large spans)
    const yearSpan = maxYear - minYear;
    const groupByDecade = yearSpan > 50;

    let displayData;
    if (groupByDecade) {
        // Group by decade
        const decadeCounts = {};
        const decadeTotalCounts = {};
        allYearsData.forEach(({ year, count, totalCount }) => {
            const decade = Math.floor(year / 10) * 10;
            decadeCounts[decade] = (decadeCounts[decade] || 0) + count;
            decadeTotalCounts[decade] = (decadeTotalCounts[decade] || 0) + totalCount;
        });
        displayData = Object.entries(decadeCounts).map(([decade, count]) => ({
            label: `${decade}s`,
            year: parseInt(decade),
            yearEnd: parseInt(decade) + 9,
            count,
            totalCount: decadeTotalCounts[decade]
        }));
    } else {
        displayData = allYearsData.map(({ year, count, totalCount }) => ({
            label: year.toString(),
            year,
            yearEnd: year,
            count,
            totalCount
        }));
    }

    const displayMaxCount = Math.max(...displayData.map(d => d.totalCount));

    // Calculate label interval - show roughly 10-15 labels
    const labelInterval = Math.max(1, Math.ceil(displayData.length / 15));

    // Render bars
    container.innerHTML = displayData.map((data, index) => {
        const height = data.totalCount > 0 ? Math.max(4, (data.count / displayMaxCount) * 100) : 0;
        const bgHeight = data.totalCount > 0 ? Math.max(4, (data.totalCount / displayMaxCount) * 100) : 0;
        const showLabel = index % labelInterval === 0 || index === displayData.length - 1;
        const tooltipText = isFiltered
            ? `${data.label}: ${data.count} von ${data.totalCount} Briefen`
            : `${data.label}: ${data.count} Briefe`;

        return `
            <div class="timeline-bar-wrapper" data-year="${data.year}" data-year-end="${data.yearEnd}">
                ${isFiltered ? `<div class="timeline-bar-bg" style="height: ${bgHeight}%"></div>` : ''}
                <div class="timeline-bar ${isFiltered ? 'timeline-bar-filtered' : ''}"
                     style="height: ${height}%"
                     data-count="${data.count}">
                </div>
                <div class="timeline-bar-tooltip">${tooltipText}</div>
                ${showLabel ? `<span class="timeline-bar-label">${data.label}</span>` : ''}
            </div>
        `;
    }).join('');

    // Update total
    if (totalEl) {
        if (isFiltered) {
            totalEl.textContent = `${lettersToCount.length.toLocaleString('de-DE')} von ${allLetters.length.toLocaleString('de-DE')} Briefen (${minYear}-${maxYear})`;
        } else {
            totalEl.textContent = `${allLetters.length.toLocaleString('de-DE')} Briefe von ${minYear} bis ${maxYear}`;
        }
    }

    // Add click handlers to wrapper elements
    container.querySelectorAll('.timeline-bar-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', () => {
            const yearStart = parseInt(wrapper.dataset.year);
            const yearEnd = parseInt(wrapper.dataset.yearEnd);

            // Update year slider
            const slider = document.getElementById('year-range-slider');
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([yearStart, yearEnd]);
            }

            // Visual feedback
            container.querySelectorAll('.timeline-bar-wrapper').forEach(w => w.classList.remove('selected'));
            wrapper.classList.add('selected');
        });
    });

    timelineRendered = true;
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
