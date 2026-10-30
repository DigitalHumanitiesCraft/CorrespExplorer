// Network View
// Force-directed graph showing relationships between correspondents or topics

import { debounce, personKey } from '../utils.js';
import { NETWORK_DEFAULTS } from '../constants.js';
import { elements } from '../dom-cache.js';
import { readTokens } from './view-support.js';

// Node colours per network type, as custom properties of tokens.css
const TYPE_COLOR_TOKEN = {
    contemporaries: '--color-role-sender',
    topics: '--color-warning'
};

// Module state
let networkType = 'contemporaries'; // 'contemporaries', 'topics'
let networkMinYears = NETWORK_DEFAULTS.minYears;
let networkMinCooccurrence = NETWORK_DEFAULTS.minCooccurrence;
let networkMaxNodes = NETWORK_DEFAULTS.maxNodes;
let networkColorMode = 'type'; // 'type' or 'entry' (entry year)
let networkHideEgo = false; // Hide the ego node (most connected person)
let networkSimulation = null;
let networkSvg = null;
let networkZoom = null;

// External dependencies - injected via init
let getFilteredLetters = null;
let getAllLetters = null;
let getDateRange = null;
let applyPersonFilter = null;
let applySubjectFilter = null;
let switchView = null;
let log = null;

/**
 * Initialize network view with external dependencies
 * @param {Object} deps - External dependencies from explore.js
 */
export function initNetworkView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    getAllLetters = deps.getAllLetters;
    getDateRange = deps.getDateRange;
    applyPersonFilter = deps.applyPersonFilter;
    applySubjectFilter = deps.applySubjectFilter;
    switchView = deps.switchView;
    log = deps.log || { init: () => {}, render: () => {} };

    setupNetworkEventHandlers();
}

/**
 * Setup event handlers for network view
 */
function setupNetworkEventHandlers() {
    const typeSelect = elements.getById('network-type');
    const thresholdInput = elements.getById('network-threshold');
    const maxNodesInput = elements.getById('network-max-nodes');
    const resetZoomBtn = elements.networkResetZoom;

    // Calculate dynamic default for minYears based on dataset timespan
    const dateRange = getDateRange();
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
        thresholdInput.addEventListener('change', () => {
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

/**
 * Update network type options based on available data
 */
function updateNetworkTypeOptions() {
    const typeSelect = elements.getById('network-type');
    if (!typeSelect) return;

    const allLetters = getAllLetters();

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

/**
 * Update threshold label based on network type
 */
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

/**
 * Build contemporaries network: persons who correspond in the same years
 */
function buildContemporariesNetwork(letters, minYears, maxNodes) {
    // Years and letter counts per sender
    const personInfo = new Map();

    letters.forEach(letter => {
        const year = letter.year;
        const senderId = personKey(letter.sender);
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
    });

    // Pair comparison over year bitmasks: comparing Sets pair by pair took seconds with a few
    // thousand senders. Only persons active in at least minYears years can have an edge.
    const persons = Array.from(personInfo.values()).filter(p => p.years.size >= minYears);
    const firstYear = Math.min(...persons.map(p => p.firstYear));
    const words = persons.length > 0 ? Math.ceil((Math.max(...persons.map(p => p.lastYear)) - firstYear + 1) / 32) : 0;
    persons.forEach(p => {
        p.mask = new Uint32Array(words);
        p.years.forEach(y => { p.mask[(y - firstYear) >> 5] |= 1 << ((y - firstYear) & 31); });
    });
    const shared = (a, b) => {
        let count = 0;
        for (let w = 0; w < words; w++) {
            let v = a.mask[w] & b.mask[w];
            while (v) { v &= v - 1; count++; }
        }
        return count;
    };

    // First pass counts edges and marks persons with at least one edge, without building edges
    let totalConnections = 0;
    const active = new Set();
    for (let i = 0; i < persons.length; i++) {
        for (let j = i + 1; j < persons.length; j++) {
            if (shared(persons[i], persons[j]) >= minYears) {
                totalConnections++;
                active.add(persons[i]);
                active.add(persons[j]);
            }
        }
    }

    // Shown are the persons with an edge, at most maxNodes of them by letter count
    // Keep the index order before the stable sort, so ties resolve as before
    let shownPersons = persons.filter(p => active.has(p));
    if (shownPersons.length > maxNodes) {
        shownPersons.sort((a, b) => b.letterCount - a.letterCount);
        shownPersons = shownPersons.slice(0, maxNodes);
    }

    const filteredEdges = [];
    for (let i = 0; i < shownPersons.length; i++) {
        for (let j = i + 1; j < shownPersons.length; j++) {
            const p1 = shownPersons[i];
            const p2 = shownPersons[j];
            const sharedYears = [...p1.years].filter(y => p2.years.has(y));
            if (sharedYears.length >= minYears) {
                filteredEdges.push({
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
    filteredEdges.sort((a, b) => b.sharedYears - a.sharedYears);

    const nodes = shownPersons.map(p => ({
        id: p.id,
        name: p.name,
        total: p.letterCount,
        yearsActive: p.years.size,
        firstYear: p.firstYear,
        lastYear: p.lastYear
    }));

    return {
        nodes,
        links: filteredEdges,
        networkType: 'contemporaries',
        stats: {
            totalPersons: personInfo.size,
            totalConnections,
            displayedPersons: nodes.length,
            displayedConnections: filteredEdges.length
        }
    };
}

/**
 * Build topic co-occurrence network
 */
function buildTopicsNetwork(letters, minCooccurrence, maxNodes) {
    const topicInfo = new Map();
    const cooccurrence = new Map();

    letters.forEach(letter => {
        const subjects = letter.mentions?.subjects || [];
        if (subjects.length < 2) return;

        // Track topic info
        subjects.forEach(s => {
            const sid = s.uri || s.id || s.label;
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
                const s1 = subjects[i].uri || subjects[i].id || subjects[i].label;
                const s2 = subjects[j].uri || subjects[j].id || subjects[j].label;
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

/**
 * Render the network visualization
 */
export function renderNetwork() {
    const container = elements.getById('network-graph');
    if (!container) return;

    const filteredLetters = getFilteredLetters();

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

    // Color scale for entry year mode (contemporaries only)
    let yearColorScale = null;
    let minYear = null;
    let maxYear = null;
    if (networkColorMode === 'entry' && networkType === 'contemporaries') {
        const years = data.nodes.map(n => n.firstYear).filter(y => y != null);
        if (years.length > 0) {
            minYear = Math.min(...years);
            maxYear = Math.max(...years);
            yearColorScale = d3.scaleSequential(d3.interpolateYlGnBu)
                .domain([minYear, maxYear]);
        }
    }

    // Update stats display
    updateNetworkStats(data, minYear, maxYear, yearColorScale);

    // A running simulation of the previous render would keep ticking on detached nodes
    networkSimulation?.stop();
    networkSimulation = null;

    // Clear previous
    container.innerHTML = '';

    if (data.nodes.length === 0) {
        const thresholdText = networkType === 'topics'
            ? `mindestens ${networkMinCooccurrence} gemeinsamen Erwaehnungen`
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
    const tokens = readTokens({
        typeColor: TYPE_COLOR_TOKEN[networkType] || TYPE_COLOR_TOKEN.contemporaries,
        edge: '--color-text-light',
        edgeActive: '--color-text',
        nodeStroke: '--color-bg',
        label: '--color-text',
        fontSize: '--font-size-xs'
    });

    // Text alternative of the chart; the nodes inside stay reachable as buttons, so the SVG is a
    // labelled group rather than role="img", which would hide them from assistive technology
    const nodeKind = networkType === 'topics' ? 'Themen' : 'Korrespondenten';
    const topNames = [...data.nodes].sort((a, b) => b.total - a.total).slice(0, 3).map(n => n.name).join(', ');
    const summary = `Netzwerk mit ${data.nodes.length} ${nodeKind} und ${data.links.length} Verbindungen. ` +
        `Groesste Knoten: ${topNames}. Pfeiltasten wechseln den Knoten, Enter filtert die Briefe.`;

    // Create SVG
    networkSvg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, width, height])
        .attr('role', 'group')
        .attr('aria-label', summary);

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

    // Calculate edge widths
    const edgeValueFn = networkType === 'topics'
        ? d => d.count
        : d => d.sharedYears;
    const maxEdgeValue = Math.max(...data.links.map(edgeValueFn));
    const minEdgeValue = networkType === 'topics' ? networkMinCooccurrence : networkMinYears;
    const edgeScale = d3.scaleLinear()
        .domain([minEdgeValue, maxEdgeValue])
        .range([1, 8]);

    const typeColor = tokens.typeColor;

    // Node color function
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

    // Dynamic edge opacity
    const baseOpacity = data.links.length > 300 ? 0.15 :
                        data.links.length > 100 ? 0.3 :
                        data.links.length > 50 ? 0.4 : 0.5;

    // Draw edges
    const link = g.append('g')
        .attr('class', 'links')
        .attr('aria-hidden', 'true')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', tokens.edge)
        .attr('stroke-opacity', baseOpacity)
        .attr('stroke-width', d => edgeScale(edgeValueFn(d)));

    // Draw nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'node')
        .attr('role', 'button')
        .attr('tabindex', -1)
        .attr('aria-label', d => networkType === 'topics'
            ? `${d.name}: ${d.total} Briefe`
            : `${d.name}: ${d.total} Briefe, ${d.yearsActive} Jahre aktiv`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Node circles
    node.append('circle')
        .attr('r', d => nodeScale(d.total))
        .attr('fill', d => getNodeColor(d))
        .attr('stroke', tokens.nodeStroke)
        .attr('stroke-width', 2);

    // Node labels (only for larger nodes)
    node.filter(d => d.total > maxTotal * 0.15)
        .append('text')
        .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
        .attr('x', d => nodeScale(d.total) + 5)
        .attr('y', 4)
        .attr('font-size', tokens.fontSize)
        .attr('fill', tokens.label);

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

    const activateNode = (d) => {
        if (networkType === 'topics') {
            applySubjectFilter(d.id);
        } else {
            applyPersonFilter(d.id);
        }
        switchView('letters');
    };

    node.on('click', (event, d) => {
        event.stopPropagation();
        activateNode(d);
    });

    const highlight = (d) => {
        const connectedIds = new Set();
        connectedIds.add(d.id);
        data.links.forEach(l => {
            if (l.source.id === d.id) connectedIds.add(l.target.id);
            if (l.target.id === d.id) connectedIds.add(l.source.id);
        });

        link.attr('stroke-opacity', l =>
            (l.source.id === d.id || l.target.id === d.id) ? 0.8 : baseOpacity * 0.2
        ).attr('stroke', l =>
            (l.source.id === d.id || l.target.id === d.id) ? tokens.edgeActive : tokens.edge
        );

        node.select('circle').attr('opacity', n =>
            connectedIds.has(n.id) ? 1 : 0.3
        );
        node.select('text').attr('opacity', n =>
            connectedIds.has(n.id) ? 1 : 0.3
        );
    };

    const unhighlight = () => {
        link.attr('stroke-opacity', baseOpacity)
            .attr('stroke', tokens.edge);
        node.select('circle').attr('opacity', 1);
        node.select('text').attr('opacity', 1);
    };

    node.on('mouseenter', (event, d) => highlight(d));
    node.on('mouseleave', unhighlight);
    node.on('focus', (event, d) => highlight(d));
    node.on('blur', unhighlight);

    // Keyboard path: one tab stop on the largest node, arrows walk the nodes by size,
    // Enter and Space filter like a click. SVG elements have no click(), so the global
    // role="button" handler of explore.js cannot serve them.
    const nodeElements = node.nodes();
    const order = data.nodes.map((d, i) => i).sort((a, b) => data.nodes[b].total - data.nodes[a].total);
    if (order.length > 0) nodeElements[order[0]].setAttribute('tabindex', 0);
    node.on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            activateNode(d);
            return;
        }
        const pos = order.indexOf(data.nodes.indexOf(d));
        const targets = { ArrowRight: pos + 1, ArrowDown: pos + 1, ArrowLeft: pos - 1, ArrowUp: pos - 1, Home: 0, End: order.length - 1 };
        if (!(event.key in targets)) return;
        event.preventDefault();
        const next = nodeElements[order[Math.max(0, Math.min(order.length - 1, targets[event.key]))]];
        event.currentTarget.setAttribute('tabindex', -1);
        next.setAttribute('tabindex', 0);
        next.focus();
    });

    // Update positions on tick
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

/**
 * Update network statistics display
 */
function updateNetworkStats(data, minYear, maxYear, yearColorScale) {
    const nodeCount = elements.getById('network-node-count');
    const edgeCount = elements.getById('network-edge-count');
    const coverageDiv = elements.getById('network-coverage');
    const infoText = elements.getById('network-info-text');
    const legendDiv = elements.getById('network-legend');

    if (nodeCount) nodeCount.textContent = data.nodes.length;
    if (edgeCount) edgeCount.textContent = data.links.length;

    // Update info text
    if (infoText) {
        if (networkType === 'topics') {
            infoText.textContent = 'Themen die gemeinsam in Briefen erwaehnt werden';
        } else {
            infoText.textContent = 'Korrespondenten die in denselben Jahren aktiv sind';
        }
    }

    // Update legend
    if (legendDiv) {
        const label = networkType === 'topics' ? 'Themen-Netzwerk' : 'Zeitgenossen-Netzwerk';
        const sizeHint = networkType === 'topics'
            ? 'Groesse = Anzahl Briefe'
            : 'Groesse = Briefmenge';

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
            const color = `var(${TYPE_COLOR_TOKEN[networkType] || TYPE_COLOR_TOKEN.contemporaries})`;
            legendDiv.innerHTML = `
                <div class="legend-item">
                    <span class="legend-circle" style="background: ${color};"></span> ${label}
                </div>
                <div class="legend-size-hint"><i class="fas fa-circle"></i> ${sizeHint}</div>
                <div class="legend-hint">Klick filtert Briefe | Hover zeigt Verbindungen</div>
            `;
        }
    }

    // Update coverage
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
}

/**
 * Reset network zoom to identity
 */
export function resetNetworkZoom() {
    if (networkSvg && networkZoom) {
        networkSvg.transition().duration(500).call(networkZoom.transform, d3.zoomIdentity);
    }
}
