// Map view: the sending places of the filtered letters as clustered circles on a MapLibre map,
// places and clusters coloured by their dominant language, with a popup per place. The map and
// its external basemap are created when the view is first shown.

import { LANGUAGE_COLORS, MAP_DEFAULTS, NO_LANGUAGE, languageLabel } from '../constants.js';
import { languageCategory, languageColor } from '../selection-ui.js';
import { isInBasket } from '../basket.js';
import { escapeHtml, ignoreMissingStyleImages, showToast, personKey, placeKey } from '../utils.js';
import { elements } from '../dom-cache.js';
import { readTokens, toggleBasketButton } from './view-support.js';

let deps = {};
// MapLibre manages its own state, so the instance stays outside the state manager
let map;
let handlersSetup = false;
let mapInitialized = false;
// 'uniform' (single colour) or 'language' (by dominant language)
let mapColorMode = 'language';

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getPlaceAggregation - places of the filtered letters, from aggregateLettersByPlace
 * @param {Function} dependencies.applyPlaceFilter
 * @param {Function} dependencies.applyPersonFilter
 * @param {Function} dependencies.revealLetters - opens the letters of the selection below the map
 * @param {Function} dependencies.renderLanguageKey - draws the shared language key into a host
 */
export function initMapView(dependencies) {
    deps = dependencies;
    bindMapControls();
}

// Redraw the markers after the aggregation changed; before the map has loaded, its load handler
// draws the current aggregation itself. The key follows with the render of the view (resizeMap)
export function updateMapPlaces() {
    if (!map || !mapInitialized) return;
    renderPlaceMarkers(deps.getPlaceAggregation());
}

/**
 * Show the map: the first call creates it, so style and tiles of the external basemap are
 * requested only when a reader opens the map (ADR-006); later calls let it measure its container,
 * which it can only while visible
 */
export function resizeMap() {
    deps.renderLanguageKey?.(elements.getById('map-key'));
    if (!map) createMap(); else map.resize();
}

// Aggregate letters by place_sent for the map; places are keyed with placeKey (ADR-001), so a
// place without GeoNames id still appears when its index entry carries coordinates
export function aggregateLettersByPlace(letters, placesIndex) {
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

    // Convert Sets to arrays and calculate the top senders
    Object.values(places).forEach(place => {
        place.years = Array.from(place.years).sort();
        place.languages = Array.from(place.languages);
        // Sort senders by letter count (descending), include ID for linking
        place.topSenders = Object.entries(place.senderCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([id, data]) => ({ name: data.name, count: data.count, id }));
        place.senderCount = Object.keys(place.senderCounts).length;
    });

    return places;
}

// Map styles; the light style is the default (design.md, Karte), dark stays one click away
let currentMapStyle = 'light';

// OpenFreeMap needs no API key; its styles carry the OpenFreeMap/OpenMapTiles/OSM attribution
// (CARTO raster tiles now return an "API key required" placeholder)
const mapStyles = {
    'light': 'https://tiles.openfreemap.org/styles/positron',
    'dark': 'https://tiles.openfreemap.org/styles/dark'
};

function createMap() {
    // Calculate center from data or use Europe default
    let center = [10, 50];
    const placesWithCoords = Object.values(deps.getPlaceAggregation());
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

    ignoreMissingStyleImages(map);

    // design.md, Karte: the light basemap shows beige land and light-blue water. The paint of the
    // loaded OpenFreeMap style is changed in place, so no further style or tile is fetched
    map.on('style.load', () => {
        if (currentMapStyle === 'light') applyPaperBasemap(map);
    });

    // top-left, because the layer and colour buttons (.map-controls) sit top-right
    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    // Fallback without the basemap service: a plain background keeps the place markers usable
    let usingFallbackStyle = false;
    map.on('error', () => {
        if (mapInitialized || usingFallbackStyle || map.isStyleLoaded()) return;
        usingFallbackStyle = true;
        const background = readTokens({ bg: '--color-bg-light' }).bg;
        map.setStyle({
            version: 8,
            sources: {},
            layers: [{ id: 'background', type: 'background', paint: { 'background-color': background } }]
        });
        showToast('Grundkarte nicht erreichbar, Orte werden ohne Kartenhintergrund gezeigt');
    });

    map.on('load', () => {
        renderPlaceMarkers(deps.getPlaceAggregation());
        updateLayerSwitcherButton(currentMapStyle);
        mapInitialized = true;
    });
}

// The two buttons in the corner of the map work before the map exists; they act on it once it does
function bindMapControls() {
    elements.getById('layer-switcher')?.addEventListener('click', () => {
        if (!map) return;
        currentMapStyle = (currentMapStyle === 'light') ? 'dark' : 'light';
        setMapStyle(currentMapStyle);
    });
    elements.mapColorToggle?.addEventListener('click', toggleMapColorMode);
}

// Land layers of the Positron style that take the paper colour; missing layers are skipped,
// so a changed upstream style degrades to its own colours instead of failing
const PAPER_LAND_LAYERS = ['background', 'park', 'landuse_residential', 'landcover_wood', 'road_area_pier'];

function applyPaperBasemap(targetMap) {
    const land = readTokens({ land: '--color-map-land' }).land;
    for (const id of PAPER_LAND_LAYERS) {
        const layer = targetMap.getLayer(id);
        if (layer) targetMap.setPaintProperty(id, layer.type === 'background' ? 'background-color' : 'fill-color', land);
    }
    if (targetMap.getLayer('water')) targetMap.setPaintProperty('water', 'fill-color', readTokens({ water: '--color-map-water' }).water);
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

// The language categories of the page (rule 11): each place carries its letters per category as
// properties n0, n1, ..., which the clusters sum, so a cluster takes the colour of the category with
// the most letters, as a single place does (design.md, rule 5)
const categories = () => Object.keys(LANGUAGE_COLORS);

/**
 * Letters of a place per language category, in the order of categories()
 * @param {Object} place - from aggregateLettersByPlace
 * @param {string[]} order
 * @returns {number[]}
 */
export function placeCategoryCounts(place, order) {
    const counts = order.map(() => 0);
    let withLanguage = 0;
    Object.entries(place.languageCounts).forEach(([code, n]) => {
        const index = order.indexOf(languageCategory(code));
        if (index >= 0) counts[index] += n;
        withLanguage += n;
    });
    const none = order.indexOf(NO_LANGUAGE);
    if (none >= 0) counts[none] += place.letter_count - withLanguage;
    return counts;
}

// Convert place aggregation to GeoJSON
function placesToGeoJSON(places) {
    const features = [];
    const order = categories();

    Object.values(places).forEach(place => {
        const counts = placeCategoryCounts(place, order);
        // The first of the largest counts, so ties go to the earlier category of the page order
        const dominant = order[counts.indexOf(Math.max(...counts))] || NO_LANGUAGE;
        const langColor = languageColor(dominant);

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
                language_color: langColor,
                ...Object.fromEntries(counts.map((n, i) => [`n${i}`, n]))
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
        map.getSource('places').setData(geojson);
    } else {
        map.addSource('places', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: MAP_DEFAULTS.clusterMaxZoom,
            clusterRadius: MAP_DEFAULTS.clusterRadius,
            clusterProperties: {
                'total_letters': ['+', ['get', 'letter_count']],
                ...Object.fromEntries(categories().map((_, i) => [`n${i}`, ['+', ['get', `n${i}`]]]))
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
    const { outline, text } = readTokens({ outline: '--color-bg', text: '--color-text' });

    // Cluster layer: in the colour of the language with the most letters among its places
    map.addLayer({
        id: 'places-clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': getClusterColorExpression(),
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
            'text-field': ['to-string', ['get', 'total_letters']],
            'text-font': ['Noto Sans Regular'],
            'text-size': 12
        },
        // Ink on a paper halo stays legible on every language colour of the clusters
        paint: {
            'text-color': text,
            'text-halo-color': outline,
            'text-halo-width': 1.5
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
        return readTokens({ data: '--color-data' }).data;
    }

    // A place carries the colour of its dominant category as a property
    return ['get', 'language_color'];
}

/**
 * The colour of a cluster: the category whose summed letters are largest, ties going to the earlier
 * category of the page order; in the uniform mode the data colour
 * @returns {Array|string} MapLibre expression
 */
function getClusterColorExpression() {
    if (mapColorMode === 'uniform') return readTokens({ data: '--color-data' }).data;
    const order = categories();
    const n = i => ['get', `n${i}`];
    const cases = ['case'];
    order.forEach((key, i) => {
        // Larger than every earlier category and not smaller than every later one
        const wins = order.map((_, j) => (j === i ? null : [j < i ? '>' : '>=', n(i), n(j)])).filter(Boolean);
        cases.push(wins.length ? ['all', ...wins] : true, languageColor(key));
    });
    cases.push(languageColor('other'));
    return cases;
}

// Update map marker colors when color mode changes
function updateMapColors() {
    if (!map || !map.getLayer('places-layer')) return;

    map.setPaintProperty('places-layer', 'circle-color', getMapCircleColorExpression());
    map.setPaintProperty('places-clusters', 'circle-color', getClusterColorExpression());
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
        ? (props.year_min === props.year_max ? `${props.year_min}` : `${props.year_min}–${props.year_max}`)
        : 'unbekannt';
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const languageNames = (props.languages || '').split(', ').filter(Boolean).map(languageLabel).join(', ');

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
                        <p class="popup-label">Häufigste Absender:</p>
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
                        title="${inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufügen'}">
                    <i class="fas fa-star" aria-hidden="true"></i>
                </button>
            </div>
            <div class="popup-stats">
                <p><strong>${props.letter_count}</strong> ${props.letter_count === 1 ? 'Brief' : 'Briefe'} von ${plural(props.sender_count, 'Absender', 'Absendern')}</p>
                <p class="popup-year-range">${yearRange}</p>
                ${topSendersHtml}
                ${languageNames ? `<p class="popup-languages"><small>Sprachen: ${escapeHtml(languageNames)}</small></p>` : ''}
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

    popupEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        popup.remove();
        map.getCanvas().focus();
    });

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
            deps.applyPlaceFilter(placeId);
            deps.revealLetters();
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
            deps.applyPersonFilter(personId);
            deps.revealLetters();
        });
    });
}
