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

import { debounce, escapeHtml, safeUrl, downloadFile, showToast, personKey, placeKey, isAllowedJsonPath, csvCell } from './utils.js';

// State
let dataIndices = {};
let allLetters = [];
let currentViz = 'timeline';
let currentItemType = 'persons';
let map = null;

// DOM Elements
const elements = {};

// Initialize page
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Cache DOM elements
    cacheElements();

    // Basket of the dataset the explorer handed over
    initBasket(sessionStorage.getItem('correspDatasetKey'));
    loadBasketFromUrl();

    // Load data from sessionStorage
    await loadData();

    // Setup event listeners
    setupEventListeners();

    // Listen for basket changes
    onBasketChange(handleBasketChange);

    // Initial render
    render();
}

function cacheElements() {
    elements.emptyState = document.getElementById('empty-state');
    elements.content = document.getElementById('wissenskorb-content');

    // Item lists
    elements.personsList = document.getElementById('persons-list');
    elements.lettersList = document.getElementById('letters-list');
    elements.placesList = document.getElementById('places-list');

    // Tab counts
    elements.tabPersonsCount = document.getElementById('tab-persons-count');
    elements.tabLettersCount = document.getElementById('tab-letters-count');
    elements.tabPlacesCount = document.getElementById('tab-places-count');

    // List counts
    elements.personsListCount = document.getElementById('persons-list-count');
    elements.lettersListCount = document.getElementById('letters-list-count');
    elements.placesListCount = document.getElementById('places-list-count');

    // Nav count (legacy)
    elements.personCount = document.getElementById('person-count');

    // Stats
    elements.statLetters = document.getElementById('stat-letters');
    elements.statYears = document.getElementById('stat-years');
    elements.statPlaces = document.getElementById('stat-places');
    elements.statConnections = document.getElementById('stat-connections');

    // Visualizations
    elements.timelineChart = document.getElementById('timeline-chart');
    elements.timelineLegend = document.getElementById('timeline-legend');
    elements.networkChart = document.getElementById('network-chart');
    elements.basketMap = document.getElementById('basket-map');
    elements.detailsList = document.getElementById('details-list');
    elements.detailsSearch = document.getElementById('details-search');
    elements.detailsSort = document.getElementById('details-sort');
}

async function loadData() {
    try {
        let storedData = sessionStorage.getItem('correspData');
        // Datasets above the sessionStorage quota are handed over by their data/*.json path
        const source = JSON.parse(sessionStorage.getItem('correspDataSource') || 'null');
        if (!storedData && isAllowedJsonPath(source?.json)) {
            const response = await fetch(source.json);
            if (response.ok) storedData = await response.text();
        }
        if (storedData) {
            const parsed = JSON.parse(storedData);
            allLetters = parsed.letters || [];
            dataIndices = parsed.indices || {};
        } else {
            console.warn('Wissenskorb: Keine Daten in sessionStorage gefunden');
        }
    } catch (e) {
        console.error('Wissenskorb: Fehler beim Laden der Daten', e);
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

    // Item type tabs (Personen/Briefe/Orte)
    document.querySelectorAll('.item-tab').forEach(tab => {
        tab.addEventListener('click', () => switchItemType(tab.dataset.type));
    });

    // Visualization tabs
    document.querySelectorAll('.viz-tab').forEach(tab => {
        tab.addEventListener('click', () => switchViz(tab.dataset.viz));
    });

    // Details search and sort
    elements.detailsSearch?.addEventListener('input', debounce(renderDetails, 300));
    elements.detailsSort?.addEventListener('change', renderDetails);
}

function switchItemType(type) {
    currentItemType = type;

    // Update tab active state
    document.querySelectorAll('.item-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });

    // Update list container visibility
    document.querySelectorAll('.item-list-container').forEach(container => {
        container.classList.toggle('active', container.id === `${type}-list-container`);
    });
}

function handleBasketChange(counts) {
    render();
}

function render() {
    const counts = getBasketCounts();

    // Update tab counts
    if (elements.tabPersonsCount) elements.tabPersonsCount.textContent = counts.persons;
    if (elements.tabLettersCount) elements.tabLettersCount.textContent = counts.letters;
    if (elements.tabPlacesCount) elements.tabPlacesCount.textContent = counts.places;

    // Update list counts
    if (elements.personsListCount) elements.personsListCount.textContent = `${counts.persons} / 50`;
    if (elements.lettersListCount) elements.lettersListCount.textContent = `${counts.letters} / 100`;
    if (elements.placesListCount) elements.placesListCount.textContent = `${counts.places} / 50`;

    // Legacy nav count
    if (elements.personCount) elements.personCount.textContent = counts.persons;

    // Show empty state or content
    if (counts.total === 0) {
        elements.emptyState.style.display = 'flex';
        elements.content.style.display = 'none';
        return;
    }

    elements.emptyState.style.display = 'none';
    elements.content.style.display = 'flex';

    // Resolve all item types
    const personIds = getBasketItems('persons');
    const letterIds = getBasketItems('letters');
    const placeIds = getBasketItems('places');

    const persons = resolvePersons(personIds);
    const letters = resolveLetters(letterIds);
    const places = resolvePlaces(placeIds);

    // One analysed letter set per render, shared by stats and all visualisations
    const analysis = buildAnalysis(persons, letters, places);

    // Update stats
    updateStats(analysis);

    // Render all lists
    renderPersonList(persons);
    renderLetterList(letters);
    renderPlaceList(places);

    // Render current visualization
    renderCurrentViz(analysis);
}

function resolvePersons(personIds) {
    const persons = [];
    const personIndex = dataIndices.persons || {};

    for (const id of personIds) {
        // Try to find person in index
        let person = personIndex[id];

        // Fallback: search by name if not found by id
        if (!person) {
            person = Object.values(personIndex).find(p => p.name === id);
        }

        const letters = allLetters.filter(l => personKey(l.sender) === id || personKey(l.recipient) === id);

        // Always add person if found in index OR has letters
        if (person || letters.length > 0) {
            persons.push({
                id,
                name: person?.name || id,
                authority: person?.authority,
                letter_count: person?.letter_count || letters.length,
                letters,
                years: [...new Set(letters.map(l => l.year).filter(y => y))],
                places: [...new Set(letters.map(l => l.place_sent?.name).filter(p => p))]
            });
        }
    }

    return persons;
}

function resolveLetters(letterIds) {
    const letters = [];
    const letterMap = new Map(allLetters.map(l => [l.id, l]));

    for (const id of letterIds) {
        const letter = letterMap.get(id);
        if (letter) {
            letters.push(letter);
        }
    }

    return letters;
}

function resolvePlaces(placeIds) {
    const places = [];
    const placeIndex = dataIndices.places || {};

    for (const id of placeIds) {
        const place = placeIndex[id];
        if (place) {
            // Count letters from this place
            const letterCount = allLetters.filter(l =>
                placeKey(l.place_sent) === id || l.place_sent?.name === id
            ).length;

            places.push({
                id,
                name: place.name || id,
                lat: place.lat,
                lon: place.lon,
                letterCount
            });
        }
    }

    return places;
}

// The analysed letters are the union of the basket letters, all letters of basket persons and
// all letters sent from basket places. The network is built once here because the stats count
// its links.
function buildAnalysis(persons, basketLetters, places) {
    const byId = new Map();
    basketLetters.forEach(l => byId.set(l.id, l));
    persons.forEach(p => p.letters.forEach(l => byId.set(l.id, l)));
    const placeIds = new Set(places.map(p => p.id));
    if (placeIds.size > 0) {
        allLetters.forEach(l => {
            if (placeIds.has(placeKey(l.place_sent)) || placeIds.has(l.place_sent?.name)) {
                byId.set(l.id, l);
            }
        });
    }
    return {
        persons,
        letters: [...byId.values()],
        network: buildNetwork(persons, basketLetters)
    };
}

// Nodes are the basket persons plus the correspondents of explicitly basketed letters. Letters
// reached only through a basket place add no nodes, since a large place would flood the graph.
function buildNetwork(persons, basketLetters) {
    const nodeMap = new Map(persons.map(p => [p.id, {
        id: p.id,
        name: p.name,
        letterCount: p.letter_count
    }]));
    const addCorrespondent = (person) => {
        const id = personKey(person);
        if (!id) return;
        if (!nodeMap.has(id)) nodeMap.set(id, { id, name: person.name || id, letterCount: 0, extra: true });
    };
    basketLetters.forEach(l => {
        addCorrespondent(l.sender);
        addCorrespondent(l.recipient);
    });

    const networkLetters = new Map();
    basketLetters.forEach(l => networkLetters.set(l.id, l));
    persons.forEach(p => p.letters.forEach(l => networkLetters.set(l.id, l)));

    // Basket persons carry their index count, added correspondents only the letters seen here
    networkLetters.forEach(l => {
        [personKey(l.sender), personKey(l.recipient)].forEach(id => {
            if (nodeMap.get(id)?.extra) nodeMap.get(id).letterCount++;
        });
    });

    const linkMap = new Map();
    networkLetters.forEach(letter => {
        const senderId = personKey(letter.sender);
        const recipientId = personKey(letter.recipient);
        if (!senderId || !recipientId || senderId === recipientId) return;
        if (!nodeMap.has(senderId) || !nodeMap.has(recipientId)) return;
        const [source, target] = [senderId, recipientId].sort();
        const key = JSON.stringify([source, target]);
        if (!linkMap.has(key)) linkMap.set(key, { source, target, count: 0 });
        linkMap.get(key).count++;
    });

    return { nodes: [...nodeMap.values()], links: [...linkMap.values()] };
}

function updateStats(analysis) {
    const { letters, network } = analysis;
    elements.statLetters.textContent = letters.length;

    const years = letters.map(l => l.year).filter(y => y);
    elements.statYears.textContent = years.length > 0 ?
        `${Math.min(...years)}-${Math.max(...years)}` : '0';

    const placeNames = new Set(letters.map(l => l.place_sent?.name).filter(n => n));
    elements.statPlaces.textContent = placeNames.size;

    elements.statConnections.textContent = network.links.length;
}

function renderPersonList(persons) {
    if (!elements.personsList) return;

    if (persons.length === 0) {
        elements.personsList.innerHTML = '<div class="item-list-empty">Keine Personen im Korb</div>';
        return;
    }

    elements.personsList.innerHTML = persons.map(person => `
        <div class="item-row" data-id="${escapeHtml(person.id)}">
            <div class="item-row-content">
                <div class="item-row-name">${escapeHtml(person.name)}</div>
                <div class="item-row-meta">${person.letter_count} Briefe</div>
            </div>
            <button class="item-remove-btn" data-type="persons" data-id="${escapeHtml(person.id)}" title="Entfernen">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    setupRemoveButtons(elements.personsList);
}

function renderLetterList(letters) {
    if (!elements.lettersList) return;

    if (letters.length === 0) {
        elements.lettersList.innerHTML = '<div class="item-list-empty">Keine Briefe im Korb</div>';
        return;
    }

    elements.lettersList.innerHTML = letters.map(letter => `
        <div class="item-row" data-id="${escapeHtml(letter.id)}">
            <div class="item-row-content">
                <div class="item-row-name">
                    ${escapeHtml(letter.sender?.name || 'Unbekannt')}
                    <i class="fas fa-arrow-right item-row-arrow"></i>
                    ${escapeHtml(letter.recipient?.name || 'Unbekannt')}
                </div>
                <div class="item-row-meta">
                    ${escapeHtml(letter.date || 'o.D.')}
                    ${letter.place_sent?.name ? ` - ${escapeHtml(letter.place_sent.name)}` : ''}
                </div>
            </div>
            <button class="item-remove-btn" data-type="letters" data-id="${escapeHtml(letter.id)}" title="Entfernen">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    setupRemoveButtons(elements.lettersList);
}

function renderPlaceList(places) {
    if (!elements.placesList) return;

    if (places.length === 0) {
        elements.placesList.innerHTML = '<div class="item-list-empty">Keine Orte im Korb</div>';
        return;
    }

    elements.placesList.innerHTML = places.map(place => `
        <div class="item-row" data-id="${escapeHtml(place.id)}">
            <div class="item-row-content">
                <div class="item-row-name">
                    <i class="fas fa-map-marker-alt item-row-icon"></i>
                    ${escapeHtml(place.name)}
                </div>
                <div class="item-row-meta">${place.letterCount} Briefe</div>
            </div>
            <button class="item-remove-btn" data-type="places" data-id="${escapeHtml(place.id)}" title="Entfernen">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    setupRemoveButtons(elements.placesList);
}

function setupRemoveButtons(container) {
    container.querySelectorAll('.item-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromBasket(btn.dataset.type, btn.dataset.id);
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
    const persons = resolvePersons(getBasketItems('persons'));
    const letters = resolveLetters(getBasketItems('letters'));
    const places = resolvePlaces(getBasketItems('places'));
    renderCurrentViz(buildAnalysis(persons, letters, places));
}

function renderCurrentViz(analysis) {
    switch (currentViz) {
        case 'timeline':
            renderTimeline(analysis);
            break;
        case 'network':
            renderNetwork(analysis);
            break;
        case 'map':
            renderMap(analysis);
            break;
        case 'details':
            renderDetails();
            break;
    }
}

// Timeline Visualization
const EXTRA_SERIES_ID = '__basket_extra__';

function renderTimeline(analysis) {
    const container = elements.timelineChart;
    if (!container) return;

    // Clear previous
    container.innerHTML = '';

    // One series per basket person, plus the analysed letters that belong to none of them
    const series = analysis.persons.map(p => ({ id: p.id, name: p.name, letters: p.letters }));
    const covered = new Set(analysis.persons.flatMap(p => p.letters.map(l => l.id)));
    const extra = analysis.letters.filter(l => !covered.has(l.id));
    if (extra.length > 0) {
        series.push({ id: EXTRA_SERIES_ID, name: 'Weitere Briefe im Korb', letters: extra });
    }

    // Letter counts per year and series
    const yearData = new Map();
    series.forEach(s => {
        s.letters.forEach(l => {
            if (!l.year) return;
            if (!yearData.has(l.year)) yearData.set(l.year, new Map());
            const counts = yearData.get(l.year);
            counts.set(s.id, (counts.get(s.id) || 0) + 1);
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

    const maxCount = Math.max(...[...yearData.values()].map(counts =>
        [...counts.values()].reduce((sum, c) => sum + c, 0)
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
        series.forEach(s => {
            entry[s.id] = yearData.get(year).get(s.id) || 0;
        });
        return entry;
    });

    const stack = d3.stack()
        .keys(series.map(s => s.id));

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
    renderTimelineLegend(series, colorScale);
}

function renderTimelineLegend(series, colorScale) {
    const legend = elements.timelineLegend;
    if (!legend) return;

    legend.innerHTML = series.map((item, i) => `
        <span class="legend-item">
            <span class="legend-color" style="background: ${colorScale(i)};"></span>
            ${escapeHtml(item.name)}
        </span>
    `).join('');
}

// Network Visualization
function renderNetwork(analysis) {
    const container = elements.networkChart;
    if (!container) return;

    // Clear previous
    container.innerHTML = '';

    const { nodes, links } = analysis.network;

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
function renderMap(analysis) {
    const container = elements.basketMap;
    if (!container) return;

    // Letters per sending place of the analysed set, kept where the place index has coordinates
    const counts = new Map();
    analysis.letters.forEach(letter => {
        const placeId = placeKey(letter.place_sent);
        if (placeId) counts.set(placeId, (counts.get(placeId) || 0) + 1);
    });
    const placesIndex = dataIndices.places || {};
    const validPlaces = [];
    counts.forEach((count, placeId) => {
        const placeData = placesIndex[placeId];
        if (placeData?.lat && placeData?.lon) {
            validPlaces.push({
                name: placeData.name || placeId,
                lat: placeData.lat,
                lon: placeData.lon,
                count
            });
        }
    });

    if (validPlaces.length === 0) {
        container.innerHTML = '<div class="viz-empty">Keine Orte mit Koordinaten verfuegbar</div>';
        return;
    }

    // Initialize or update map
    if (!map) {
        map = new maplibregl.Map({
            container: 'basket-map',
            style: 'https://tiles.openfreemap.org/styles/positron',
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
            ${safeUrl(letter.url) ? `<a href="${escapeHtml(safeUrl(letter.url))}" target="_blank" class="details-link" title="Zum Brief"><i class="fas fa-external-link-alt"></i></a>` : ''}
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
            ].map(csvCell).join(','));
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
