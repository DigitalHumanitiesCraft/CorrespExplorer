// Wissenskorb Page Module
// Dedicated page for analysing the letters, persons and places collected in the basket

import {
    initBasket,
    getBasketItems,
    getBasketCounts,
    removeFromBasket,
    clearBasket,
    onBasketChange,
    generateBasketUrl,
    loadBasketFromUrl,
    getSharedBasketDataset
} from './basket.js';

import { BASKET_LIMITS } from './constants.js';
import { debounce, escapeHtml, safeUrl, downloadFile, showToast, personKey, placeKey, isAllowedJsonPath } from './utils.js';
import { lettersToCsv, letterExportRow } from './export.js';
import { readTokens } from './views/view-support.js';

// State
let dataIndices = {};
let allLetters = [];
let currentViz = 'timeline';
let map = null;
let mapMarkers = [];
let networkSimulation = null;

// The details list renders this many letters at once; the rest is named as a count
const DETAILS_LIMIT = 100;
const PREPROCESSED_PREFIX = 'preprocessed:';

// DOM Elements
const elements = {};

// Initialize page
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Cache DOM elements
    cacheElements();

    // Basket of the dataset the explorer handed over. A shared link names its own dataset; a
    // preprocessed data/*.json dataset can be loaded here directly, so the link also works in a
    // fresh browser. For any other dataset loadBasketFromUrl explains which dataset to load.
    let dataset = sessionStorage.getItem('correspDatasetKey');
    let sharedJsonPath = null;
    const sharedDataset = getSharedBasketDataset();
    if (sharedDataset && sharedDataset !== dataset && sharedDataset.startsWith(PREPROCESSED_PREFIX)) {
        const path = sharedDataset.slice(PREPROCESSED_PREFIX.length);
        if (isAllowedJsonPath(path)) {
            dataset = sharedDataset;
            sharedJsonPath = path;
        }
    }
    initBasket(dataset);
    loadBasketFromUrl();

    const jsonPath = await loadData(sharedJsonPath);
    linkBackToExplorer(jsonPath);

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

    // Nav count of all entries
    elements.totalCount = document.getElementById('basket-total-count');

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
    elements.basketMapEmpty = document.getElementById('basket-map-empty');
    elements.detailsList = document.getElementById('details-list');
    elements.detailsSearch = document.getElementById('details-search');
    elements.detailsSort = document.getElementById('details-sort');
}

// Returns the data/*.json path the dataset came from, or null for an upload
async function loadData(sharedJsonPath = null) {
    let jsonPath = null;
    try {
        let storedData = sharedJsonPath ? null : sessionStorage.getItem('correspData');
        // Datasets above the sessionStorage quota are handed over by their data/*.json path
        const source = sharedJsonPath
            ? { json: sharedJsonPath }
            : JSON.parse(sessionStorage.getItem('correspDataSource') || 'null');
        if (!storedData && isAllowedJsonPath(source?.json)) {
            jsonPath = source.json;
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
    return jsonPath;
}

// A plain explore.html would open the last upload of this tab instead of a ?json= dataset, so the
// links back name the dataset path. Uploads live in sessionStorage and need no parameter.
function linkBackToExplorer(jsonPath) {
    if (!isAllowedJsonPath(jsonPath)) return;
    const href = `explore.html?json=${encodeURIComponent(jsonPath)}`;
    document.querySelectorAll('a.explorer-link').forEach(link => { link.href = href; });
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
    // Wrapped, because renderDetails takes the analysis as its first parameter, not the event
    elements.detailsSearch?.addEventListener('input', debounce(() => renderDetails(), 300));
    elements.detailsSort?.addEventListener('change', () => renderDetails());
}

function switchItemType(type) {
    // aria-pressed exposes the selected list to assistive technology, the class styles it
    document.querySelectorAll('.item-tab').forEach(tab => {
        const active = tab.dataset.type === type;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-pressed', String(active));
    });

    // Update list container visibility
    document.querySelectorAll('.item-list-container').forEach(container => {
        container.classList.toggle('active', container.id === `${type}-list-container`);
    });
}

function handleBasketChange() {
    render();
}

// One analysed letter set, shared by stats, visualisations, details and export
function currentAnalysis() {
    const persons = resolvePersons(getBasketItems('persons'));
    const letters = resolveLetters(getBasketItems('letters'));
    const places = resolvePlaces(getBasketItems('places'));
    return { ...buildAnalysis(persons, letters, places), basketLetters: letters, places };
}

function render() {
    const counts = getBasketCounts();

    // Update tab counts
    if (elements.tabPersonsCount) elements.tabPersonsCount.textContent = counts.persons;
    if (elements.tabLettersCount) elements.tabLettersCount.textContent = counts.letters;
    if (elements.tabPlacesCount) elements.tabPlacesCount.textContent = counts.places;

    // Update list counts
    if (elements.personsListCount) elements.personsListCount.textContent = `${counts.persons} / ${BASKET_LIMITS.maxPersons}`;
    if (elements.lettersListCount) elements.lettersListCount.textContent = `${counts.letters} / ${BASKET_LIMITS.maxLetters}`;
    if (elements.placesListCount) elements.placesListCount.textContent = `${counts.places} / ${BASKET_LIMITS.maxPlaces}`;

    if (elements.totalCount) elements.totalCount.textContent = counts.total;

    // The hidden class is the only visibility switch (display:none !important in base.css)
    elements.emptyState.classList.toggle('hidden', counts.total > 0);
    elements.content.classList.toggle('hidden', counts.total === 0);
    if (counts.total === 0) {
        stopNetwork();
        return;
    }

    const analysis = currentAnalysis();

    // Update stats
    updateStats(analysis);

    // Render all lists
    renderPersonList(analysis.persons);
    renderLetterList(analysis.basketLetters);
    renderPlaceList(analysis.places);

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

    // Without any dated letter the span is unknown, not zero years
    const years = letters.map(l => l.year).filter(y => y);
    const minYear = years.length > 0 ? Math.min(...years) : null;
    const maxYear = years.length > 0 ? Math.max(...years) : null;
    elements.statYears.textContent = minYear === null ? 'unbekannt'
        : (minYear === maxYear ? String(minYear) : `${minYear}-${maxYear}`);

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
            <button type="button" class="item-remove-btn" data-type="persons" data-id="${escapeHtml(person.id)}" title="Entfernen" aria-label="${escapeHtml(person.name)} aus dem Korb entfernen">
                <i class="fas fa-times" aria-hidden="true"></i>
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
                    <i class="fas fa-arrow-right item-row-arrow" role="img" aria-label="an"></i>
                    ${escapeHtml(letter.recipient?.name || 'Unbekannt')}
                </div>
                <div class="item-row-meta">
                    ${escapeHtml(letter.date || 'o.D.')}
                    ${letter.place_sent?.name ? ` - ${escapeHtml(letter.place_sent.name)}` : ''}
                </div>
            </div>
            <button type="button" class="item-remove-btn" data-type="letters" data-id="${escapeHtml(letter.id)}" title="Entfernen" aria-label="Brief ${escapeHtml(letter.sender?.name || 'Unbekannt')} an ${escapeHtml(letter.recipient?.name || 'Unbekannt')}, ${escapeHtml(letter.date || 'ohne Datum')}, aus dem Korb entfernen">
                <i class="fas fa-times" aria-hidden="true"></i>
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
                    <i class="fas fa-map-marker-alt item-row-icon" aria-hidden="true"></i>
                    ${escapeHtml(place.name)}
                </div>
                <div class="item-row-meta">${place.letterCount} Briefe</div>
            </div>
            <button type="button" class="item-remove-btn" data-type="places" data-id="${escapeHtml(place.id)}" title="Entfernen" aria-label="${escapeHtml(place.name)} aus dem Korb entfernen">
                <i class="fas fa-times" aria-hidden="true"></i>
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

    document.querySelectorAll('.viz-tab').forEach(tab => {
        const active = tab.dataset.viz === vizId;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-pressed', String(active));
    });

    // Update panels
    document.querySelectorAll('.viz-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `viz-${vizId}`);
    });

    if (vizId !== 'network') stopNetwork();
    renderCurrentViz(currentAnalysis());
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
            renderDetails(analysis);
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

    const datedCount = [...yearData.values()].reduce((sum, counts) =>
        sum + [...counts.values()].reduce((s, c) => s + c, 0), 0);
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('role', 'img')
        .attr('aria-label', `Balkendiagramm: ${datedCount} datierte Briefe je Jahr von ${minYear} bis ${maxYear}, gestapelt nach ${series.length} Reihen`)
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

    // A running simulation of the previous render would keep ticking on detached nodes
    stopNetwork();
    container.innerHTML = '';

    const { nodes, links } = analysis.network;

    if (links.length === 0) {
        container.innerHTML = '<div class="viz-empty">Keine Verbindungen zwischen den Personen</div>';
        return;
    }

    // D3 Force Layout
    const width = container.clientWidth;
    const height = 400;
    // D3 attributes take values, not var(), so the colours come from tokens.css at render time
    const tokens = readTokens({
        link: '--color-text-light', node: '--color-primary', ring: '--color-bg',
        labelSize: '--font-size-xs', label: '--color-text'
    });

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('role', 'img')
        .attr('aria-label', `Netzwerk: ${nodes.length} Personen, ${links.length} Verbindungen`);

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
    networkSimulation = simulation;

    // Draw links
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', tokens.link)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.count));

    // Draw nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', d => Math.max(8, Math.sqrt(d.letterCount) * 2))
        .attr('fill', tokens.node)
        .attr('stroke', tokens.ring)
        .attr('stroke-width', 2)
        .call(drag(simulation));

    // Labels
    const labels = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text(d => d.name)
        .attr('font-size', tokens.labelSize)
        .attr('fill', tokens.label)
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

function stopNetwork() {
    networkSimulation?.stop();
    networkSimulation = null;
}

// Map Visualization
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
// Without an error event a hanging style request would leave an empty canvas for good
const MAP_STYLE_TIMEOUT_MS = 8000;

function renderMap(analysis) {
    const container = elements.basketMap;
    const emptyEl = elements.basketMapEmpty;
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

    // The map canvas stays in place; an empty set only swaps it for the message
    const empty = validPlaces.length === 0;
    container.classList.toggle('hidden', empty);
    emptyEl?.classList.toggle('hidden', !empty);
    if (empty) {
        clearMapMarkers();
        return;
    }

    if (!map) {
        map = createMap();
    } else {
        // The container may have been hidden while the panel was inactive
        map.resize();
    }

    // Markers are DOM elements and need no loaded style, so they are placed at once
    addMapMarkers(validPlaces);
}

function createMap() {
    const instance = new maplibregl.Map({
        container: elements.basketMap,
        style: MAP_STYLE_URL,
        center: [10, 50],
        zoom: 4
    });
    instance.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Same fallback as initMap in explore.js: a plain background keeps the markers usable
    let fallback = false;
    const useFallbackStyle = () => {
        if (fallback || instance.isStyleLoaded()) return;
        fallback = true;
        instance.setStyle({
            version: 8,
            sources: {},
            layers: [{ id: 'background', type: 'background', paint: { 'background-color': readTokens({ bg: '--color-bg-light' }).bg } }]
        });
        showToast('Grundkarte nicht erreichbar, Orte werden ohne Kartenhintergrund gezeigt');
    };
    instance.on('error', useFallbackStyle);
    const timer = setTimeout(useFallbackStyle, MAP_STYLE_TIMEOUT_MS);
    instance.once('load', () => clearTimeout(timer));
    return instance;
}

function clearMapMarkers() {
    mapMarkers.forEach(marker => marker.remove());
    mapMarkers = [];
}

function addMapMarkers(places) {
    clearMapMarkers();

    const bounds = new maplibregl.LngLatBounds();
    const { fill, ring } = readTokens({ fill: '--color-primary', ring: '--color-bg' });

    places.forEach(place => {
        const el = document.createElement('div');
        el.className = 'basket-map-marker';
        el.style.width = `${Math.max(12, Math.sqrt(place.count) * 6)}px`;
        el.style.height = el.style.width;
        el.style.borderRadius = '50%';
        el.style.background = fill;
        el.style.border = `2px solid ${ring}`;
        el.style.cursor = 'pointer';

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([place.lon, place.lat])
            .setPopup(new maplibregl.Popup().setHTML(`
                <strong>${escapeHtml(place.name)}</strong><br>
                ${place.count} Briefe
            `))
            .addTo(map);
        mapMarkers.push(marker);

        bounds.extend([place.lon, place.lat]);
    });

    if (places.length > 1) {
        map.fitBounds(bounds, { padding: 50 });
    } else {
        map.setCenter([places[0].lon, places[0].lat]);
        map.setZoom(6);
    }
}

// Details Visualization
// Lists the analysed union (architecture.md, Datenfluss step 5), not only the persons' letters
function renderDetails(analysis = currentAnalysis()) {
    const container = elements.detailsList;
    if (!container) return;

    let letters = [...analysis.letters];

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

    container.innerHTML = letters.slice(0, DETAILS_LIMIT).map(letter => `
        <div class="details-item">
            <div class="details-date">${escapeHtml(letter.date || 'o.D.')}</div>
            <div class="details-content">
                <div class="details-correspondents">
                    ${escapeHtml(letter.sender?.name || 'Unbekannt')}
                    <i class="fas fa-arrow-right" role="img" aria-label="an"></i>
                    ${escapeHtml(letter.recipient?.name || 'Unbekannt')}
                </div>
                ${letter.place_sent?.name ? `<div class="details-place"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${escapeHtml(letter.place_sent.name)}</div>` : ''}
            </div>
            ${safeUrl(letter.url) ? `<a href="${escapeHtml(safeUrl(letter.url))}" target="_blank" rel="noopener noreferrer" class="details-link" title="Zum Brief" aria-label="Brief in der Edition oeffnen (neues Fenster)"><i class="fas fa-external-link-alt" aria-hidden="true"></i></a>` : ''}
        </div>
    `).join('');

    if (letters.length > DETAILS_LIMIT) {
        container.innerHTML += `<div class="details-more">... und ${letters.length - DETAILS_LIMIT} weitere Briefe</div>`;
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
// Exports the same analysed union the page shows: basket letters plus the letters of its
// persons and places
function exportData(format) {
    const analysis = currentAnalysis();
    const { persons, places, letters } = analysis;

    if (letters.length === 0 && persons.length === 0 && places.length === 0) {
        showToast('Keine Daten zum Exportieren');
        return;
    }

    let content, filename, mimeType;

    // Letters use the columns of the explorer export (export.js), so both files read alike
    if (format === 'csv') {
        content = lettersToCsv(letters);
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
            places: places.map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, letter_count: p.letterCount })),
            basket_letters: analysis.basketLetters.map(l => l.id),
            letters: letters.map(letterExportRow)
        }, null, 2);
        filename = 'wissenskorb.json';
        mimeType = 'application/json';
    }

    downloadFile(content, filename, mimeType);
    showToast(`Export als ${format.toUpperCase()} gestartet`);
}
