// HSA CorrespExplorer - MapLibre GL JS Implementation
// Interactive map visualization of Hugo Schuchardt correspondence

import { loadData } from "./data.js";
import { CONFIG } from "./config.js";
import { loadNavbar } from "./navbar-loader.js";
import { debounce } from "./utils.js";

const IS_PRODUCTION = true;

let map;
let allLetters = [];
let filteredLetters = [];
let placeAggregation = {};
let dataIndices = {};
let temporalFilter = null;

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

// HSA color
const HSA_COLOR = CONFIG.ui.primaryColor;

// Initialize application
async function init() {
    log.init("Starting HSA CorrespExplorer");
    await loadNavbar('map');

    try {
        const data = await loadData();

        allLetters = data.letters;
        filteredLetters = allLetters;
        dataIndices = data.indices || {};

        placeAggregation = aggregateLettersByPlace(allLetters, dataIndices.places || {});

        updateStats(data.meta);
        log.init(`Loaded ${allLetters.length} letters, ${Object.keys(placeAggregation).length} places with coordinates`);

        initMap();
        initFilters(data);

        log.init('Application ready');
    } catch (error) {
        showError('Initialisierung fehlgeschlagen: ' + error.message);
        log.error('Init failed: ' + error.message);
        hideLoading();
    }
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

// Update stats display
function updateStats(meta) {
    const visibleEl = document.getElementById('map-visible-count');
    const missingEl = document.getElementById('map-missing-count');
    const totalEl = document.getElementById('total-letters-count');

    const placesWithCoords = Object.keys(placeAggregation).length;

    if (visibleEl) visibleEl.textContent = placesWithCoords;
    if (missingEl) missingEl.textContent = meta.unique_places - placesWithCoords;
    if (totalEl) totalEl.textContent = meta.total_letters.toLocaleString('de-DE');
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
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {},
            layers: []
        },
        center: [15.44, 47.07], // Graz (Schuchardt's location)
        zoom: 4
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
        renderPlaceMarkers(placeAggregation);
        setMapStyle(currentMapStyle);
        mapInitialized = true;
        hideLoading();
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
            'circle-color': HSA_COLOR,
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
            'circle-color': HSA_COLOR,
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
        ? `${props.year_min}${props.year_max}`
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
function initFilters(data) {
    const yearRangeSlider = document.getElementById('year-range-slider');
    const yearRangeText = document.getElementById('year-range-text');
    const languageCheckboxes = document.querySelectorAll('input[name="language"]');
    const resetButton = document.getElementById('reset-filters');

    if (!yearRangeSlider) {
        log.init('Filter elements not found, skipping filter init');
        return;
    }

    const debouncedApply = debounce(applyFilters, 300);

    // Year range slider
    if (typeof noUiSlider !== 'undefined') {
        noUiSlider.create(yearRangeSlider, {
            start: [CONFIG.dateRange.min, CONFIG.dateRange.max],
            connect: true,
            step: 1,
            range: { 'min': CONFIG.dateRange.min, 'max': CONFIG.dateRange.max },
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
            const isDefaultRange = startYear === CONFIG.dateRange.min && endYear === CONFIG.dateRange.max;
            temporalFilter = isDefaultRange ? null : { start: startYear, end: endYear };
            debouncedApply();
        });
    }

    // Language checkboxes
    languageCheckboxes.forEach(cb => cb.addEventListener('change', debouncedApply));

    // Reset button
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            languageCheckboxes.forEach(cb => cb.checked = true);
            if (yearRangeSlider.noUiSlider) {
                yearRangeSlider.noUiSlider.set([CONFIG.dateRange.min, CONFIG.dateRange.max]);
            }
            temporalFilter = null;
            applyFilters();
        });
    }

    // Initialize filter counts
    updateFilterCounts();
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

        return temporalMatch && languageMatch;
    });

    // Re-aggregate places based on filtered letters
    placeAggregation = aggregateLettersByPlace(filteredLetters, dataIndices.places || {});

    if (map && map.loaded() && mapInitialized) {
        renderPlaceMarkers(placeAggregation);
    }

    updateFilterCounts();
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

    // Update total filtered count
    const filteredCountEl = document.getElementById('filtered-letters-count');
    if (filteredCountEl) {
        filteredCountEl.textContent = filteredLetters.length.toLocaleString('de-DE');
    }
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
}

// Start application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
