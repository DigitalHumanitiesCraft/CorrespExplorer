// Wissenskorb Page Module
// Dedicated page for analyzing collected persons from the basket

import {
    initBasket,
    getBasketItems,
    getBasketCounts,
    removeFromBasket,
    clearBasket,
    onBasketChange,
    generateBasketUrl,
    loadBasketFromUrl
} from './basket.js';

import { debounce, escapeHtml, downloadFile, showToast } from './utils.js';

// State
let dataIndices = {};
let allLetters = [];
let currentViz = 'timeline';
let map = null;

// DOM Elements
const elements = {};

// Initialize page
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Cache DOM elements
    cacheElements();

    // Initialize basket
    initBasket();
    loadBasketFromUrl();

    // Load data from sessionStorage
    loadData();

    // Setup event listeners
    setupEventListeners();

    // Setup Storage Events for multi-tab sync
    setupStorageSync();

    // Listen for basket changes
    onBasketChange(handleBasketChange);

    // Initial render
    render();
}

function cacheElements() {
    elements.emptyState = document.getElementById('empty-state');
    elements.content = document.getElementById('wissenskorb-content');
    elements.personList = document.getElementById('person-list');
    elements.personCount = document.getElementById('person-count');
    elements.personListCount = document.getElementById('person-list-count');
    elements.statLetters = document.getElementById('stat-letters');
    elements.statYears = document.getElementById('stat-years');
    elements.statPlaces = document.getElementById('stat-places');
    elements.statConnections = document.getElementById('stat-connections');
    elements.timelineChart = document.getElementById('timeline-chart');
    elements.timelineLegend = document.getElementById('timeline-legend');
    elements.networkChart = document.getElementById('network-chart');
    elements.basketMap = document.getElementById('basket-map');
    elements.detailsList = document.getElementById('details-list');
    elements.detailsSearch = document.getElementById('details-search');
    elements.detailsSort = document.getElementById('details-sort');
    elements.toast = document.getElementById('toast');
    elements.toastMessage = document.getElementById('toast-message');
}

function loadData() {
    try {
        const storedData = sessionStorage.getItem('correspData');
        if (storedData) {
            const parsed = JSON.parse(storedData);
            allLetters = parsed.letters || [];
            dataIndices = parsed.indices || {};
        }
    } catch (e) {
        // Data not available - wissenskorb page opened directly
    }
}

function setupEventListeners() {
    // Share button
    document.getElementById('share-btn')?.addEventListener('click', handleShare);

    // Clear button
    document.getElementById('clear-btn')?.addEventListener('click', handleClear);

    // Export buttons
    document.getElementById('export-csv-btn')?.addEventListener('click', () => exportData('csv'));
    document.getElementById('export-json-btn')?.addEventListener('click', () => exportData('json'));

    // Visualization tabs
    document.querySelectorAll('.viz-tab').forEach(tab => {
        tab.addEventListener('click', () => switchViz(tab.dataset.viz));
    });

    // Details search and sort
    elements.detailsSearch?.addEventListener('input', debounce(renderDetails, 300));
    elements.detailsSort?.addEventListener('change', renderDetails);
}

function setupStorageSync() {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'correspexplorer-basket') {
            render();
        }
    });
}

function handleBasketChange(counts) {
    render();
}

function render() {
    const personIds = getBasketItems('persons');
    const counts = getBasketCounts();

    // Update counts
    elements.personCount.textContent = counts.persons;
    elements.personListCount.textContent = `${counts.persons} / 50`;

    // Show empty state or content
    if (personIds.length === 0) {
        elements.emptyState.style.display = 'flex';
        elements.content.style.display = 'none';
        return;
    }

    elements.emptyState.style.display = 'none';
    elements.content.style.display = 'flex';

    // Get resolved person data
    const persons = resolvePersons(personIds);

    // Update stats
    updateStats(persons);

    // Render person list
    renderPersonList(persons);

    // Render current visualization
    renderCurrentViz(persons);
}

function resolvePersons(personIds) {
    const persons = [];
    const personIndex = dataIndices.persons || {};

    for (const id of personIds) {
        const person = personIndex[id];
        if (person) {
            // Get letters for this person
            const letters = allLetters.filter(l =>
                l.sender?.authority === id || l.recipient?.authority === id
            );

            persons.push({
                id,
                name: person.name || id,
                authority: person.authority,
                letter_count: person.letter_count || letters.length,
                letters,
                years: [...new Set(letters.map(l => l.year).filter(y => y))],
                places: [...new Set(letters.map(l => l.place_sent?.name).filter(p => p))]
            });
        }
    }

    return persons;
}

function updateStats(persons) {
    // Total letters (unique)
    const allLetterIds = new Set();
    persons.forEach(p => p.letters.forEach(l => allLetterIds.add(l.id)));
    elements.statLetters.textContent = allLetterIds.size;

    // Years active
    const allYears = new Set();
    persons.forEach(p => p.years.forEach(y => allYears.add(y)));
    elements.statYears.textContent = allYears.size > 0 ?
        `${Math.min(...allYears)}-${Math.max(...allYears)}` : '0';

    // Unique places
    const allPlaces = new Set();
    persons.forEach(p => p.places.forEach(pl => allPlaces.add(pl)));
    elements.statPlaces.textContent = allPlaces.size;

    // Connections between persons
    const connections = countConnections(persons);
    elements.statConnections.textContent = connections;
}

function countConnections(persons) {
    const personIds = new Set(persons.map(p => p.id));
    let connections = 0;

    for (const person of persons) {
        for (const letter of person.letters) {
            const senderId = letter.sender?.authority;
            const recipientId = letter.recipient?.authority;

            if (senderId && recipientId && personIds.has(senderId) && personIds.has(recipientId)) {
                connections++;
            }
        }
    }

    return Math.floor(connections / 2); // Each connection counted twice
}

function renderPersonList(persons) {
    if (!elements.personList) return;

    elements.personList.innerHTML = persons.map(person => `
        <div class="person-item" data-id="${escapeHtml(person.id)}">
            <div class="person-item-content">
                <div class="person-name">${escapeHtml(person.name)}</div>
                <div class="person-meta">${person.letter_count} Briefe</div>
            </div>
            <button class="person-remove-btn" data-id="${escapeHtml(person.id)}" title="Entfernen">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    // Setup remove buttons
    elements.personList.querySelectorAll('.person-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromBasket('persons', btn.dataset.id);
        });
    });
}

function switchViz(vizId) {
    currentViz = vizId;

    // Update tabs
    document.querySelectorAll('.viz-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.viz === vizId);
    });

    // Update panels
    document.querySelectorAll('.viz-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `viz-${vizId}`);
    });

    // Render the visualization
    const personIds = getBasketItems('persons');
    const persons = resolvePersons(personIds);
    renderCurrentViz(persons);
}

function renderCurrentViz(persons) {
    switch (currentViz) {
        case 'timeline':
            renderTimeline(persons);
            break;
        case 'network':
            renderNetwork(persons);
            break;
        case 'map':
            renderMap(persons);
            break;
        case 'details':
            renderDetails();
            break;
    }
}

// Timeline Visualization
function renderTimeline(persons) {
    const container = elements.timelineChart;
    if (!container || persons.length === 0) return;

    // Clear previous
    container.innerHTML = '';

    // Collect all years with person activity
    const yearData = new Map();

    persons.forEach(person => {
        person.years.forEach(year => {
            if (!yearData.has(year)) {
                yearData.set(year, []);
            }
            yearData.get(year).push({
                name: person.name,
                id: person.id,
                count: person.letters.filter(l => l.year === year).length
            });
        });
    });

    if (yearData.size === 0) {
        container.innerHTML = '<div class="viz-empty">Keine Zeitdaten verfuegbar</div>';
        return;
    }

    // Sort years
    const sortedYears = [...yearData.keys()].sort((a, b) => a - b);
    const minYear = sortedYears[0];
    const maxYear = sortedYears[sortedYears.length - 1];

    // D3 Setup
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([0, width]);

    const maxCount = Math.max(...[...yearData.values()].map(arr =>
        arr.reduce((sum, p) => sum + p.count, 0)
    ));

    const y = d3.scaleLinear()
        .domain([0, maxCount])
        .nice()
        .range([height, 0]);

    // Color scale for persons
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // Create stacked data
    const stackData = sortedYears.map(year => {
        const entry = { year };
        const yearPersons = yearData.get(year) || [];
        persons.forEach((p, i) => {
            const personData = yearPersons.find(yp => yp.id === p.id);
            entry[p.id] = personData ? personData.count : 0;
        });
        return entry;
    });

    const stack = d3.stack()
        .keys(persons.map(p => p.id));

    const stackedData = stack(stackData);

    // Draw bars
    const barWidth = Math.max(2, width / sortedYears.length - 1);

    svg.selectAll('.layer')
        .data(stackedData)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', (d, i) => colorScale(i))
        .selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => x(d.data.year) - barWidth / 2)
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', barWidth)
        .attr('opacity', 0.8);

    // X Axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    // Y Axis
    svg.append('g')
        .call(d3.axisLeft(y).ticks(5));

    // Render legend
    renderTimelineLegend(persons, colorScale);
}

function renderTimelineLegend(persons, colorScale) {
    const legend = elements.timelineLegend;
    if (!legend) return;

    legend.innerHTML = persons.map((person, i) => `
        <span class="legend-item">
            <span class="legend-color" style="background: ${colorScale(i)};"></span>
            ${escapeHtml(person.name)}
        </span>
    `).join('');
}

// Network Visualization
function renderNetwork(persons) {
    const container = elements.networkChart;
    if (!container || persons.length === 0) return;

    // Clear previous
    container.innerHTML = '';

    // Build nodes and links
    const personIds = new Set(persons.map(p => p.id));
    const nodes = persons.map(p => ({
        id: p.id,
        name: p.name,
        letterCount: p.letter_count
    }));

    const linkMap = new Map();

    persons.forEach(person => {
        person.letters.forEach(letter => {
            const senderId = letter.sender?.authority;
            const recipientId = letter.recipient?.authority;

            if (senderId && recipientId && personIds.has(senderId) && personIds.has(recipientId)) {
                const key = [senderId, recipientId].sort().join('|');
                linkMap.set(key, (linkMap.get(key) || 0) + 1);
            }
        });
    });

    const links = [...linkMap.entries()].map(([key, count]) => {
        const [source, target] = key.split('|');
        return { source, target, count };
    });

    if (links.length === 0) {
        container.innerHTML = '<div class="viz-empty">Keine Verbindungen zwischen den Personen</div>';
        return;
    }

    // D3 Force Layout
    const width = container.clientWidth;
    const height = 400;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.count));

    // Draw nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', d => Math.max(8, Math.sqrt(d.letterCount) * 2))
        .attr('fill', '#3b82f6')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .call(drag(simulation));

    // Labels
    const labels = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text(d => d.name)
        .attr('font-size', '10px')
        .attr('dx', 12)
        .attr('dy', 4);

    // Tooltip
    node.append('title')
        .text(d => `${d.name}: ${d.letterCount} Briefe`);

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        labels
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });

    function drag(simulation) {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
}

// Map Visualization
function renderMap(persons) {
    const container = elements.basketMap;
    if (!container || persons.length === 0) return;

    // Collect all places with coordinates
    const places = new Map();
    const placesIndex = dataIndices.places || {};

    persons.forEach(person => {
        person.letters.forEach(letter => {
            const placeId = letter.place_sent?.authority || letter.place_sent?.name;
            if (placeId && !places.has(placeId)) {
                const placeData = placesIndex[placeId];
                if (placeData?.lat && placeData?.lon) {
                    places.set(placeId, {
                        name: placeData.name || placeId,
                        lat: placeData.lat,
                        lon: placeData.lon,
                        count: 1
                    });
                } else {
                    places.set(placeId, {
                        ...places.get(placeId) || {},
                        count: (places.get(placeId)?.count || 0) + 1
                    });
                }
            } else if (placeId && places.has(placeId)) {
                places.get(placeId).count++;
            }
        });
    });

    // Filter places with coordinates
    const validPlaces = [...places.values()].filter(p => p.lat && p.lon);

    if (validPlaces.length === 0) {
        container.innerHTML = '<div class="viz-empty">Keine Orte mit Koordinaten verfuegbar</div>';
        return;
    }

    // Initialize or update map
    if (!map) {
        map = new maplibregl.Map({
            container: 'basket-map',
            style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
            center: [10, 50],
            zoom: 4
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    // Wait for map to load
    map.on('load', () => {
        addMapMarkers(validPlaces);
    });

    if (map.loaded()) {
        addMapMarkers(validPlaces);
    }
}

function addMapMarkers(places) {
    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.maplibregl-marker');
    existingMarkers.forEach(m => m.remove());

    // Add markers
    const bounds = new maplibregl.LngLatBounds();

    places.forEach(place => {
        const el = document.createElement('div');
        el.className = 'basket-map-marker';
        el.style.width = `${Math.max(12, Math.sqrt(place.count) * 6)}px`;
        el.style.height = el.style.width;
        el.style.borderRadius = '50%';
        el.style.background = '#3b82f6';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';

        new maplibregl.Marker(el)
            .setLngLat([place.lon, place.lat])
            .setPopup(new maplibregl.Popup().setHTML(`
                <strong>${escapeHtml(place.name)}</strong><br>
                ${place.count} Briefe
            `))
            .addTo(map);

        bounds.extend([place.lon, place.lat]);
    });

    if (places.length > 1) {
        map.fitBounds(bounds, { padding: 50 });
    } else if (places.length === 1) {
        map.setCenter([places[0].lon, places[0].lat]);
        map.setZoom(6);
    }
}

// Details Visualization
function renderDetails() {
    const container = elements.detailsList;
    if (!container) return;

    const personIds = getBasketItems('persons');
    const persons = resolvePersons(personIds);

    // Collect all letters
    const letterSet = new Map();
    persons.forEach(person => {
        person.letters.forEach(letter => {
            if (!letterSet.has(letter.id)) {
                letterSet.set(letter.id, letter);
            }
        });
    });

    let letters = [...letterSet.values()];

    // Apply search filter
    const searchTerm = elements.detailsSearch?.value?.toLowerCase() || '';
    if (searchTerm) {
        letters = letters.filter(l =>
            (l.sender?.name || '').toLowerCase().includes(searchTerm) ||
            (l.recipient?.name || '').toLowerCase().includes(searchTerm) ||
            (l.place_sent?.name || '').toLowerCase().includes(searchTerm) ||
            (l.date || '').includes(searchTerm)
        );
    }

    // Apply sort
    const sortOrder = elements.detailsSort?.value || 'date-desc';
    letters.sort((a, b) => {
        switch (sortOrder) {
            case 'date-asc':
                return (a.date || '').localeCompare(b.date || '');
            case 'date-desc':
                return (b.date || '').localeCompare(a.date || '');
            case 'sender-asc':
                return (a.sender?.name || '').localeCompare(b.sender?.name || '');
            default:
                return 0;
        }
    });

    if (letters.length === 0) {
        container.innerHTML = '<div class="viz-empty">Keine Briefe gefunden</div>';
        return;
    }

    container.innerHTML = letters.slice(0, 100).map(letter => `
        <div class="details-item">
            <div class="details-date">${escapeHtml(letter.date || 'o.D.')}</div>
            <div class="details-content">
                <div class="details-correspondents">
                    ${escapeHtml(letter.sender?.name || 'Unbekannt')}
                    <i class="fas fa-arrow-right"></i>
                    ${escapeHtml(letter.recipient?.name || 'Unbekannt')}
                </div>
                ${letter.place_sent?.name ? `<div class="details-place"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(letter.place_sent.name)}</div>` : ''}
            </div>
            ${letter.url ? `<a href="${escapeHtml(letter.url)}" target="_blank" class="details-link" title="Zum Brief"><i class="fas fa-external-link-alt"></i></a>` : ''}
        </div>
    `).join('');

    if (letters.length > 100) {
        container.innerHTML += `<div class="details-more">... und ${letters.length - 100} weitere Briefe</div>`;
    }
}

// Share functionality
function handleShare() {
    const url = generateBasketUrl();

    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link in Zwischenablage kopiert');
        }).catch(() => {
            showToast('Fehler beim Kopieren');
        });
    } else {
        // Fallback
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Link in Zwischenablage kopiert');
    }
}

// Clear functionality
function handleClear() {
    if (confirm('Wissenskorb wirklich leeren?')) {
        clearBasket();
        render();
    }
}

// Export functionality
function exportData(format) {
    const personIds = getBasketItems('persons');
    const persons = resolvePersons(personIds);

    if (persons.length === 0) {
        showToast('Keine Daten zum Exportieren');
        return;
    }

    // Collect all unique letters
    const letterSet = new Map();
    persons.forEach(person => {
        person.letters.forEach(letter => {
            if (!letterSet.has(letter.id)) {
                letterSet.set(letter.id, letter);
            }
        });
    });

    const letters = [...letterSet.values()];

    let content, filename, mimeType;

    if (format === 'csv') {
        const lines = [
            'ID,Datum,Absender,Empfaenger,Ort,URL'
        ];

        letters.forEach(letter => {
            lines.push([
                letter.id || '',
                letter.date || '',
                letter.sender?.name || '',
                letter.recipient?.name || '',
                letter.place_sent?.name || '',
                letter.url || ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });

        content = lines.join('\n');
        filename = 'wissenskorb.csv';
        mimeType = 'text/csv;charset=utf-8;';
    } else {
        content = JSON.stringify({
            persons: persons.map(p => ({
                id: p.id,
                name: p.name,
                letter_count: p.letter_count,
                years: p.years,
                places: p.places
            })),
            letters: letters
        }, null, 2);
        filename = 'wissenskorb.json';
        mimeType = 'application/json';
    }

    downloadFile(content, filename, mimeType);
    showToast(`Export als ${format.toUpperCase()} gestartet`);
}

// Note: escapeHtml, debounce, downloadFile, showToast imported from utils.js
