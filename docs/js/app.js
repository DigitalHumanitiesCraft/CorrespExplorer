// HerData - MapLibre GL JS Implementation
// Interactive map visualization with filtering

import { loadPersons } from "./data.js";
import { GlobalSearch } from "./search.js";
import { loadNavbar } from "./navbar-loader.js";
import { getPersonConnections, getClusterConnections, getConnectionColor } from "./network-utils.js";
import { initDebugPanel } from "./debug.js";

let map;
let allPersons = [];
let filteredPersons = [];
let temporalFilter = null;  // { start: year, end: year }

// Tooltip variables (accessible to all event handlers)
let clusterTooltip = null;
let markerTooltip = null;

// Track if event handlers are already set up
let handlersSetup = false;

// Network visualization state
let currentConnections = [];
let networkEnabled = {
    'Familie': true,
    'Beruflich': true,
    'Sozial': true
};
let clusterHoverTimeout = null;

// Compact logging utility (export for Timeline module)
export const Debug = {
    log: (type, msg) => {
        const icons = {
            'INIT': '🟢',
            'RENDER': '🔵',
            'EVENT': '🟡',
            'CLICK': '🟠',
            'ERROR': '🔴'
        };
        const icon = icons[type] || '⚪';
        console.log(`${icon} ${type}: ${msg}`);
    }
};

// Backward compatibility
const log = {
    init: (msg) => Debug.log('INIT', msg),
    render: (msg) => Debug.log('RENDER', msg),
    event: (msg) => Debug.log('EVENT', msg),
    click: (msg) => Debug.log('CLICK', msg),
    error: (msg) => Debug.log('ERROR', msg)
};

// Role colors matching design.md
const ROLE_COLORS = {
    'sender': '#2c5f8d',      // Steel Blue - Hat geschrieben
    'mentioned': '#6c757d',   // Medium Gray - Wurde erwähnt
    'both': '#2d6a4f',        // Forest Green - Beide
    'indirect': '#adb5bd'     // Light Gray - Nur SNDB
};

// Occupation group definitions
const OCCUPATION_GROUPS = {
    'artistic': ['Schauspielerin', 'Malerin', 'Tänzerin', 'Stempelschneiderin', 'Gemmenschneiderin',
                 'Bildhauerin', 'Miniaturmalerin', 'Radiererin', 'Stecherin', 'Kupferstecherin', 'Zeichnerin'],
    'literary': ['Schriftstellerin', 'Übersetzerin', 'Dichterin'],
    'musical': ['Sängerin', 'Pianistin', 'Komponistin', 'Organistin', 'Harfenistin'],
    'court': ['Hofdame', 'Oberhofmeisterin', 'Stiftsdame', 'Kammerfrau', 'Prinzessin', 'Fürstin', 'Herzogin'],
    'education': ['Erzieherin', 'Pädagogin', 'Lehrerin']
};

// Classify person's occupation group
function getOccupationGroup(person) {
    if (!person.occupations || person.occupations.length === 0) {
        return 'none';
    }

    for (const occ of person.occupations) {
        for (const [group, occupations] of Object.entries(OCCUPATION_GROUPS)) {
            if (occupations.includes(occ.name)) {
                return group;
            }
        }
    }

    return 'other';
}

// Initialize application
async function init() {
    log.init("Starting application");
    await loadNavbar();

    // Initialize debug panel
    await initDebugPanel();

    try {
        // Load data using shared module
        const loading = document.getElementById('loading');
        loading.textContent = 'Daten werden geladen...';

        const data = await loadPersons();

        // Add occupation group to each person
        allPersons = data.persons.map(person => ({
            ...person,
            occupation_group: getOccupationGroup(person)
        }));
        filteredPersons = allPersons;

        // Update stats in navbar
        updateStats(data.meta);

        loading.textContent = `${data.meta.total_women} Frauen geladen`;
        loading.style.background = '#d8f3dc';
        loading.style.color = '#2d6a4f';

        log.init(`Loaded ${allPersons.length} persons, ${data.meta.with_geodata} with geodata`);

        initMap();
        initFilters();
        initSearch();
        log.init('Application ready');
    } catch (error) {
        showError('Initialisierung fehlgeschlagen: ' + error.message);
        log.error('Init failed: ' + error.message);
    }
}

// Initialize global search
let globalSearch = null;
function initSearch() {
    if (allPersons.length > 0 && !globalSearch) {
        globalSearch = new GlobalSearch(allPersons);
        console.log("🔍 Global search initialized");
    }
}

// Initialize MapLibre map
function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
            },
            layers: [
                {
                    id: 'osm-tiles-layer',
                    type: 'raster',
                    source: 'osm-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }
            ]
        },
        center: [11.3235, 50.9795], // Weimar
        zoom: 5
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Wait for map to load, then add markers
    map.on('load', () => {
        renderMarkers(filteredPersons);
        hideLoading();
    });
}

// Convert persons to GeoJSON format
function personsToGeoJSON(persons) {
    const features = [];

    persons.forEach(person => {
        if (!person.places || person.places.length === 0) return;

        // Use first place (primary location)
        const place = person.places[0];

        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [place.lon, place.lat]
            },
            properties: {
                id: person.id,
                name: person.name,
                role: person.role,
                normierung: person.normierung,
                gnd: person.gnd || null,
                birth: person.dates?.birth || null,
                death: person.dates?.death || null,
                letter_count: person.letter_count || 0,
                mention_count: person.mention_count || 0,
                place_name: place.name,
                place_type: place.type
            }
        });
    });

    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Render markers on map
function renderMarkers(persons) {
    const geojson = personsToGeoJSON(persons);

    // Check if source exists - update data or create new source
    if (map.getSource('persons')) {
        // Update existing source data (preserves layers and event handlers)
        log.render(`Updating data: ${geojson.features.length} markers (via setData)`);
        map.getSource('persons').setData(geojson);
    } else {
        // First time: create source with clustering
        log.render(`Creating source: ${geojson.features.length} markers (initial)`);
        map.addSource('persons', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: 10,
            clusterRadius: 40,
            clusterProperties: {
                // Count persons by role in each cluster (only letter-relevant roles)
                'sender_count': ['+', ['case', ['==', ['get', 'role'], 'sender'], 1, 0]],
                'mentioned_count': ['+', ['case', ['==', ['get', 'role'], 'mentioned'], 1, 0]],
                'both_count': ['+', ['case', ['==', ['get', 'role'], 'both'], 1, 0]]
                // indirect_count omitted - not color-encoded (no letter connection)
            }
        });
    }

    // Only add layers if they don't exist yet
    if (!map.getLayer('persons-clusters')) {
        log.render('Adding layers (first time)');
        addMapLayers();
    }

    // Only setup event handlers once
    if (!handlersSetup) {
        log.render('Setting up event handlers (first time)');
        setupEventHandlers();
        handlersSetup = true;
    }
}

// Add map layers (called only once)
function addMapLayers() {
    // Cluster circles
    map.addLayer({
        id: 'persons-clusters',
        type: 'circle',
        source: 'persons',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': [
                'case',
                // If >50% wrote letters (sender + both) -> Steel Blue
                ['>', ['+', ['get', 'sender_count'], ['get', 'both_count']], ['*', ['get', 'point_count'], 0.5]], ROLE_COLORS.sender,
                // If >50% only mentioned -> Medium Gray
                ['>', ['get', 'mentioned_count'], ['*', ['get', 'point_count'], 0.5]], ROLE_COLORS.mentioned,
                // Mixed (no majority) -> Forest Green
                ROLE_COLORS.both
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                15,  // radius for count < 10
                10, 20,  // radius for count 10-50
                50, 25,  // radius for count 50-100
                100, 30  // radius for count >= 100
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // Cluster count labels
    map.addLayer({
        id: 'persons-cluster-count',
        type: 'symbol',
        source: 'persons',
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

    // Individual person markers
    map.addLayer({
        id: 'persons-layer',
        type: 'circle',
        source: 'persons',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': [
                'match',
                ['get', 'role'],
                'sender', ROLE_COLORS.sender,
                'mentioned', ROLE_COLORS.mentioned,
                'both', ROLE_COLORS.both,
                'indirect', ROLE_COLORS.indirect,
                ROLE_COLORS.indirect
            ],
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, 6,    // radius at zoom 5 (was 4)
                10, 10,  // radius at zoom 10 (was 8)
                15, 16   // radius at zoom 15 (was 12)
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
        }
    });
}

// Draw connection lines on map
function drawConnectionLines(connections) {
    // Remove existing lines first
    clearConnectionLines();

    if (connections.length === 0) {
        log.event('No connections to draw');
        return;
    }

    // Filter by enabled categories
    const filtered = connections.filter(conn => networkEnabled[conn.category]);

    log.event(`Drawing ${filtered.length} connection lines`);

    // Aggregate connections by same from-to coordinates
    const aggregated = new Map();
    filtered.forEach(conn => {
        const key = `${conn.from.lat},${conn.from.lon}-${conn.to.lat},${conn.to.lon}`;

        if (!aggregated.has(key)) {
            aggregated.set(key, {
                ...conn,
                count: 1,
                persons: [conn.person.name]
            });
        } else {
            const existing = aggregated.get(key);
            existing.count++;
            existing.persons.push(conn.person.name);
        }
    });

    // Create GeoJSON for lines with aggregated counts
    const features = Array.from(aggregated.values()).map(conn => ({
        type: 'Feature',
        properties: {
            category: conn.category,
            subtype: conn.subtype,
            personName: conn.person.name,
            fromPlace: conn.from.name,
            toPlace: conn.to.name,
            count: conn.count,
            persons: conn.persons.join(', ')
        },
        geometry: {
            type: 'LineString',
            coordinates: [
                [conn.from.lon, conn.from.lat],
                [conn.to.lon, conn.to.lat]
            ]
        }
    }));

    const geojson = {
        type: 'FeatureCollection',
        features: features
    };

    // Add source for connection lines
    map.addSource('connections', {
        type: 'geojson',
        data: geojson
    });

    // Add shadow/glow layer for connection lines (for better visibility)
    map.addLayer({
        id: 'connection-lines-glow',
        type: 'line',
        source: 'connections',
        paint: {
            'line-color': '#ffffff',
            'line-width': [
                'interpolate',
                ['linear'],
                ['get', 'count'],
                1, 8,    // 1 connection = 8px glow (increased)
                5, 10,   // 5 connections = 10px glow
                10, 12,  // 10 connections = 12px glow
                20, 14   // 20+ connections = 14px glow
            ],
            'line-opacity': 0.6,  // Increased from 0.4
            'line-blur': 4        // Increased from 3
        }
    }, 'persons-layer'); // Insert below markers

    // Add main connection lines layer
    map.addLayer({
        id: 'connection-lines',
        type: 'line',
        source: 'connections',
        paint: {
            'line-color': [
                'match',
                ['get', 'category'],
                'Familie', getConnectionColor('Familie'),
                'Beruflich', getConnectionColor('Beruflich'),
                'Sozial', getConnectionColor('Sozial'),
                getConnectionColor('Unbekannt')
            ],
            'line-width': [
                'interpolate',
                ['linear'],
                ['get', 'count'],
                1, 4,    // 1 connection = 4px (increased from 3)
                5, 6,    // 5 connections = 6px (increased from 5)
                10, 8,   // 10 connections = 8px (increased from 7)
                20, 12   // 20+ connections = 12px (increased from 10)
            ],
            'line-opacity': 0.9  // Increased from 0.8 for maximum visibility
        }
    }, 'persons-layer'); // Insert below markers

    currentConnections = filtered;
}

// Clear connection lines from map
function clearConnectionLines() {
    if (map.getLayer('connection-lines')) {
        map.removeLayer('connection-lines');
    }
    if (map.getLayer('connection-lines-glow')) {
        map.removeLayer('connection-lines-glow');
    }
    if (map.getSource('connections')) {
        map.removeSource('connections');
    }
    currentConnections = [];
}

// Setup event handlers for map interactions (called only once)
function setupEventHandlers() {
    log.event('Registering event handlers');

    // Click handler for individual markers
    map.on('click', 'persons-layer', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['persons-layer']
        });
        log.click(`Marker: ${features.length} person(s) at location`);

        if (features.length === 1) {
            showSinglePersonPopup(e.lngLat, features[0].properties);
        } else {
            showMultiPersonPopup(e.lngLat, features);
        }
    });

    // Click handler for clusters
    map.on('click', 'persons-clusters', (e) => {
        log.click('Cluster clicked - processing...');

        // Remove hover tooltip first
        if (clusterTooltip) {
            clusterTooltip.remove();
            clusterTooltip = null;
        }

        const features = map.queryRenderedFeatures(e.point, {
            layers: ['persons-clusters']
        });

        if (!features || features.length === 0) {
            log.error('No cluster features found at click point');
            return;
        }

        const clusterCoords = features[0].geometry.coordinates;
        const pointCount = features[0].properties.point_count;
        log.click(`Cluster: ${pointCount} persons at [${clusterCoords[0].toFixed(4)}, ${clusterCoords[1].toFixed(4)}]`);

        // Get cluster source and ID
        const source = map.getSource('persons');
        const clusterId = features[0].properties.cluster_id;

        // For small clusters (≤50), show popup with persons
        if (pointCount <= 50) {
            log.click(`Finding persons at cluster location from data (≤50 threshold)`);

            // Get persons in this cluster from MapLibre (Promise API)
            source.getClusterLeaves(clusterId, pointCount)
                .then(leaves => {
                    log.click(`Found ${leaves.length} persons in cluster from MapLibre`);

                    if (leaves.length > 0) {
                        // Convert coordinates array to lngLat object
                        const lngLat = { lng: clusterCoords[0], lat: clusterCoords[1] };
                        showMultiPersonPopup(lngLat, leaves);
                    } else {
                        log.error('No persons found in cluster - zooming instead');
                        // Zoom to cluster as fallback
                        source.getClusterExpansionZoom(clusterId)
                            .then(zoom => {
                                map.easeTo({
                                    center: clusterCoords,
                                    zoom: zoom
                                });
                            })
                            .catch(err => log.error(`getClusterExpansionZoom failed: ${err.message}`));
                    }
                })
                .catch(error => {
                    log.error(`Failed to get cluster leaves: ${error.message}`);
                    // Fallback: zoom to cluster
                    source.getClusterExpansionZoom(clusterId)
                        .then(zoom => {
                            map.easeTo({
                                center: clusterCoords,
                                zoom: zoom
                            });
                        })
                        .catch(err => log.error(`getClusterExpansionZoom failed: ${err.message}`));
                });

            return; // Exit early, promise handles rest
        }

        // For large clusters (>50), zoom to expand
        source.getClusterExpansionZoom(clusterId)
            .then(zoom => {
                map.easeTo({
                    center: clusterCoords,
                    zoom: zoom
                });
            })
            .catch(err => log.error(`getClusterExpansionZoom failed: ${err.message}`));
    });

    // Hover tooltips for clusters
    map.on('mouseenter', 'persons-clusters', (e) => {
        map.getCanvas().style.cursor = 'pointer';

        const props = e.features[0].properties;
        const pointCount = props.point_count;
        const coordinates = e.features[0].geometry.coordinates.slice();
        const clusterId = props.cluster_id;

        log.event(`Cluster hover: ${pointCount} persons, cluster_id=${clusterId}`);

        // Build composition breakdown
        const senderCount = (props.sender_count || 0) + (props.both_count || 0);
        const mentionedCount = (props.mentioned_count || 0) + (props.both_count || 0);
        const indirectCount = props.indirect_count || 0;

        let details = [];
        if (senderCount > 0) details.push(`${senderCount} geschrieben`);
        if (mentionedCount > 0) details.push(`${mentionedCount} erwähnt`);
        if (indirectCount > 0) details.push(`${indirectCount} SNDB`);

        // Show initial tooltip immediately (without connection count)
        const html = `
            <div class="hover-tooltip">
                <strong>${pointCount} Frauen</strong><br>
                <small>${details.join(' • ')}</small><br>
                <small id="network-info" style="color: #999;">Verbindungen werden geladen...</small>
            </div>
        `;

        clusterTooltip = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'hover-tooltip-popup'
        })
            .setLngLat(coordinates)
            .setHTML(html)
            .addTo(map);

        // Get persons in cluster - use Promise API (MapLibre changed from callbacks to Promises!)
        const source = map.getSource('persons');

        source.getClusterLeaves(clusterId, pointCount)
            .then(leaves => {
                log.event(`Promise resolved: got ${leaves.length} leaves from cluster`);

                // Convert features to person objects
                const clusterPersons = leaves
                    .map(leaf => allPersons.find(p => p.id === leaf.properties.id))
                    .filter(p => p && p.places && p.places.length > 0);

                const connections = getClusterConnections(clusterPersons, allPersons);

                // Update tooltip with connection info - search within popup element
                const popupEl = clusterTooltip ? clusterTooltip.getElement() : null;
                const networkInfoEl = popupEl ? popupEl.querySelector('#network-info') : null;

                log.event(`Found ${connections.length} connections, networkInfoEl=${!!networkInfoEl}`);
                if (networkInfoEl && connections.length > 0) {
                    // Count by category
                    const familieCount = connections.filter(c => c.category === 'Familie').length;
                    const beruflichCount = connections.filter(c => c.category === 'Beruflich').length;
                    const sozialCount = connections.filter(c => c.category === 'Sozial').length;

                    const connDetails = [];
                    if (familieCount > 0) connDetails.push(`<span style="color: #ff0066; font-weight: bold;">${familieCount} Familie</span>`);
                    if (beruflichCount > 0) connDetails.push(`<span style="color: #00ccff; font-weight: bold;">${beruflichCount} Beruflich</span>`);
                    if (sozialCount > 0) connDetails.push(`<span style="color: #ffcc00; font-weight: bold;">${sozialCount} Sozial</span>`);

                    networkInfoEl.innerHTML = `<strong style="color: #fff;">${connections.length} Verbindungen:</strong> ${connDetails.join(' • ')}`;
                    networkInfoEl.style.color = '#fff';
                } else if (networkInfoEl) {
                    networkInfoEl.innerHTML = 'Keine Verbindungen';
                    networkInfoEl.style.color = '#999';
                }

                // Draw connection lines
                drawConnectionLines(connections);
                log.event(`Showing ${connections.length} connections for cluster (${clusterPersons.length} persons)`);
            })
            .catch(error => {
                log.error(`getClusterLeaves Promise rejected: ${error.message}`);
            });
    });

    map.on('mouseleave', 'persons-clusters', () => {
        map.getCanvas().style.cursor = '';

        if (clusterTooltip) {
            clusterTooltip.remove();
            clusterTooltip = null;
        }
        clearConnectionLines();
    });

    // Hover tooltips for individual markers
    map.on('mouseenter', 'persons-layer', (e) => {
        map.getCanvas().style.cursor = 'pointer';

        const props = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates.slice();

        // Find person and show connections
        const person = allPersons.find(p => p.id === props.id);
        if (person && person.places && person.places.length > 0) {
            const connections = getPersonConnections(person, allPersons);
            drawConnectionLines(connections);
            log.event(`Showing ${connections.length} connections for ${person.name}`);
        }

        // Create tooltip content
        const dates = props.birth || props.death
            ? `(${props.birth || '?'}–${props.death || '?'})`
            : '';

        // Check if debug mode is active
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug') === 'true';

        let html = '';
        if (debugMode && person) {
            // Enhanced debug tooltip with data provenance info
            const places = person.places ? person.places.map(p => `${p.name} (${p.type})`).join(', ') : 'N/A';
            const occupations = person.occupations ? person.occupations.map(o => o.name).join(', ') : 'N/A';
            const gndInfo = person.gnd ? `GND: ${person.gnd}` : 'Keine GND';

            html = `
                <div class="hover-tooltip hover-tooltip-debug">
                    <strong>${props.name}</strong> ${dates}<br>
                    <small style="color: #6c757d; margin-top: 4px; display: block;">
                        ${gndInfo}<br>
                        Orte: ${places}<br>
                        Berufe: ${occupations}<br>
                        Briefe: ${props.letter_count || 0} | Erwähnungen: ${props.mention_count || 0}
                    </small>
                </div>
            `;
        } else {
            // Standard tooltip
            html = `<div class="hover-tooltip"><strong>${props.name}</strong> ${dates}</div>`;
        }

        markerTooltip = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'hover-tooltip-popup'
        })
            .setLngLat(coordinates)
            .setHTML(html)
            .addTo(map);
    });

    map.on('mouseleave', 'persons-layer', () => {
        map.getCanvas().style.cursor = '';
        if (markerTooltip) {
            markerTooltip.remove();
            markerTooltip = null;
        }
        clearConnectionLines();
    });
}

// Show popup for single person
function showSinglePersonPopup(lngLat, properties) {
    const dates = properties.birth || properties.death
        ? `(${properties.birth || '?'} – ${properties.death || '?'})`
        : '';

    const gndBadge = properties.gnd
        ? '<span class="badge badge-gnd">GND</span>'
        : '';

    const stats = [];
    if (properties.letter_count > 0) {
        stats.push(`<strong>${properties.letter_count}</strong> Briefe`);
    }
    if (properties.mention_count > 0) {
        stats.push(`<strong>${properties.mention_count}</strong> Erwähnungen`);
    }

    const html = `
        <div class="popup">
            <h3>${properties.name} ${dates}</h3>
            <div class="popup-badges">
                ${gndBadge}
                <span class="badge badge-sndb">SNDB</span>
            </div>
            <div class="popup-stats">
                ${stats.length > 0 ? '<p>' + stats.join(' • ') + '</p>' : ''}
                <p class="popup-location">${properties.place_name} (${properties.place_type})</p>
            </div>
            <a href="person.html?id=${properties.id}">Details →</a>
        </div>
    `;

    new maplibregl.Popup()
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map);
}

// Show popup for multiple people at same location
function showMultiPersonPopup(lngLat, features) {
    const count = features.length;
    const firstFeature = features[0].properties;
    const locationName = firstFeature.place_name;
    const locationType = firstFeature.place_type;

    // Build list of persons (show first 15, with option to expand)
    const maxInitial = 15;
    const showAll = count <= maxInitial;
    const personsToShow = showAll ? features : features.slice(0, maxInitial);

    let personItems = personsToShow.map(feature => {
        const p = feature.properties;
        const dates = p.birth || p.death ? `(${p.birth || '?'} – ${p.death || '?'})` : '';
        const gndBadge = p.gnd ? '<span class="badge badge-gnd">GND</span>' : '';

        const stats = [];
        if (p.letter_count > 0) stats.push(`${p.letter_count} Briefe`);
        if (p.mention_count > 0) stats.push(`${p.mention_count} Erw.`);
        const statsText = stats.length > 0 ? stats.join(' • ') : '';

        // Check if person has relations
        const person = allPersons.find(person => person.id === p.id);
        const hasRelations = person && person.relations && person.relations.length > 0;
        const relationBadge = hasRelations
            ? `<span class="badge badge-relation" title="${person.relations.length} Verbindungen">🔗 ${person.relations.length}</span>`
            : '';

        return `
            <div class="person-item ${hasRelations ? 'has-relations' : ''}" data-id="${p.id}" onclick="window.location.href='person.html?id=${p.id}'">
                <div class="person-name">
                    <strong>${p.name}</strong> ${dates}
                </div>
                <div class="person-meta">
                    ${gndBadge}
                    <span class="badge badge-sndb">SNDB</span>
                    ${relationBadge}
                    ${statsText ? `<span class="person-stats">${statsText}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const showMoreButton = !showAll
        ? `<button class="show-more-btn" onclick="expandPersonList(event)">Zeige alle ${count} Frauen</button>`
        : '';

    const html = `
        <div class="multi-person-popup">
            <h3>${locationName}</h3>
            <p class="location-info">${count} Frauen • ${locationType}</p>
            <div class="person-list">
                ${personItems}
            </div>
            ${showMoreButton}
        </div>
    `;

    new maplibregl.Popup({
        maxWidth: '400px'
    })
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map);

    // Store all features for potential expansion
    map._currentPopupFeatures = features;
}

// Expand person list to show all entries
window.expandPersonList = function(event) {
    event.preventDefault();
    const features = map._currentPopupFeatures;
    if (!features) return;

    const firstFeature = features[0].properties;

    // Rebuild popup with all persons
    let personItems = features.map(feature => {
        const p = feature.properties;
        const dates = p.birth || p.death ? `(${p.birth || '?'} – ${p.death || '?'})` : '';
        const gndBadge = p.gnd ? '<span class="badge badge-gnd">GND</span>' : '';

        const stats = [];
        if (p.letter_count > 0) stats.push(`${p.letter_count} Briefe`);
        if (p.mention_count > 0) stats.push(`${p.mention_count} Erw.`);
        const statsText = stats.length > 0 ? stats.join(' • ') : '';

        // Check if person has relations
        const person = allPersons.find(person => person.id === p.id);
        const hasRelations = person && person.relations && person.relations.length > 0;
        const relationBadge = hasRelations
            ? `<span class="badge badge-relation" title="${person.relations.length} Verbindungen">🔗 ${person.relations.length}</span>`
            : '';

        return `
            <div class="person-item ${hasRelations ? 'has-relations' : ''}" data-id="${p.id}" onclick="window.location.href='person.html?id=${p.id}'">
                <div class="person-name">
                    <strong>${p.name}</strong> ${dates}
                </div>
                <div class="person-meta">
                    ${gndBadge}
                    <span class="badge badge-sndb">SNDB</span>
                    ${relationBadge}
                    ${statsText ? `<span class="person-stats">${statsText}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Update popup content
    const popupContent = event.target.closest('.maplibregl-popup-content');
    if (popupContent) {
        const personList = popupContent.querySelector('.person-list');
        const showMoreBtn = popupContent.querySelector('.show-more-btn');

        if (personList) personList.innerHTML = personItems;
        if (showMoreBtn) showMoreBtn.remove();
    }
}

// Initialize filter system
function initFilters() {
    const roleCheckboxes = document.querySelectorAll('input[name="role"]');
    const occupationCheckboxes = document.querySelectorAll('input[name="occupation"]');
    const placeTypeCheckboxes = document.querySelectorAll('input[name="place-type"]');
    const resetButton = document.getElementById('reset-filters');

    // Attach change listeners
    roleCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    occupationCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    placeTypeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

    // Initialize noUiSlider for year range
    const yearRangeSlider = document.getElementById('year-range-slider');
    const yearRangeText = document.getElementById('year-range-text');

    noUiSlider.create(yearRangeSlider, {
        start: [1762, 1824],
        connect: true,
        step: 1,
        range: {
            'min': 1762,
            'max': 1824
        },
        format: {
            to: value => Math.round(value),
            from: value => Number(value)
        }
    });

    // Year range slider change listener
    yearRangeSlider.noUiSlider.on('update', (values) => {
        const startYear = parseInt(values[0]);
        const endYear = parseInt(values[1]);

        yearRangeText.textContent = `${startYear} – ${endYear}`;

        // Only set filter if range is not full 1762-1824
        if (startYear === 1762 && endYear === 1824) {
            temporalFilter = null;
        } else {
            temporalFilter = { start: startYear, end: endYear };
        }

        log.event(`Temporal filter: ${startYear}-${endYear}`);
        applyFilters();
    });

    // Select all button
    const selectAllButton = document.getElementById('select-all-filters');
    selectAllButton.addEventListener('click', () => {
        roleCheckboxes.forEach(cb => cb.checked = true);
        occupationCheckboxes.forEach(cb => cb.checked = true);
        placeTypeCheckboxes.forEach(cb => cb.checked = true);

        // Reset year range slider to full range
        yearRangeSlider.noUiSlider.set([1762, 1824]);
        temporalFilter = null;

        applyFilters();
    });

    // Reset button
    resetButton.addEventListener('click', () => {
        roleCheckboxes.forEach(cb => cb.checked = false);
        occupationCheckboxes.forEach(cb => cb.checked = false);
        placeTypeCheckboxes.forEach(cb => cb.checked = false);

        // Reset year range slider
        yearRangeSlider.noUiSlider.set([1762, 1824]);
        temporalFilter = null;

        applyFilters();
    });
}

// Apply filters to data and update map
function applyFilters() {
    const roleFilters = getCheckedValues('role');
    const occupationFilters = getCheckedValues('occupation');
    const placeTypeFilters = getCheckedValues('place-type');

    // Filter persons
    filteredPersons = allPersons.filter(person => {
        // Role filter: check if person's role matches any selected role
        const roleMatch = roleFilters.some(r => {
            if (person.roles && person.roles.includes(r)) return true;
            if (person.role === r) return true;
            return false;
        });

        // Occupation filter: check if person's occupation group matches
        const occupationMatch = occupationFilters.includes(person.occupation_group);

        // Temporal filter: check if person has letters in selected time range
        let temporalMatch = true;
        if (temporalFilter && person.letter_years) {
            temporalMatch = person.letter_years.some(year =>
                year >= temporalFilter.start && year <= temporalFilter.end
            );
        }

        // Place type filter: check if person has a place with selected type
        let placeTypeMatch = true;
        if (person.places && person.places.length > 0) {
            placeTypeMatch = person.places.some(place =>
                placeTypeFilters.includes(place.type)
            );
        } else {
            // If person has no places, exclude them when place type filter is active
            placeTypeMatch = false;
        }

        return roleMatch && occupationMatch && temporalMatch && placeTypeMatch;
    });

    log.render(`Filters applied: ${filteredPersons.length} / ${allPersons.length} persons (place types: ${placeTypeFilters.join(', ')})`);

    // Update map
    if (map && map.loaded()) {
        renderMarkers(filteredPersons);
    }
}

// Get checked checkbox values
function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// Initialize tab switching
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-view`) {
                    content.classList.add('active');
                }
            });

            // Resize map if switching to map tab
            if (targetTab === 'map' && map) {
                setTimeout(() => map.resize(), 100);
            }

            // Initialize timeline if switching to timeline tab
            if (targetTab === 'timeline' && !timeline) {
                initializeTimeline();
            }
        });
    });
}

// Initialize timeline
async function initializeTimeline() {
    log.init('Initializing timeline...');

    timeline = new Timeline('timeline-chart');

    try {
        await timeline.initialize();
        log.init('Timeline initialized successfully');
    } catch (error) {
        log.error(`Timeline initialization failed: ${error.message}`);
    }
}

// Update statistics in navbar
function updateStats(meta) {
    //     document.getElementById('stat-letters').textContent = '15.312 Briefe';
    //     document.getElementById('stat-women').textContent = `${meta.total_women.toLocaleString('de-DE')} Frauen`;
    //     document.getElementById('stat-places').textContent = '633 Orte';
    // Stats now in sidebar, no navbar update needed
}

// Hide loading message
function hideLoading() {
    const loading = document.getElementById('loading');
    setTimeout(() => {
        loading.style.display = 'none';
    }, 500);
}

// Show error message
function showError(message) {
    const loading = document.getElementById('loading');
    loading.textContent = message;
    loading.style.background = '#f8d7da';
    loading.style.color = '#9b2226';
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
