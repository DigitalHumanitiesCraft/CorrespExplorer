// Network View
// Force-directed graph of who wrote to whom, of contemporaries or of topics

import { debounce, motionMs, personKey, letterRecipients } from '../utils.js';
import { NETWORK_DEFAULTS } from '../constants.js';
import { elements } from '../dom-cache.js';
import { readTokens, renderDataTable } from './view-support.js';

// Node colours per network type, as custom properties of tokens.css
const TYPE_COLOR_TOKEN = {
    correspondence: '--color-role-sender',
    contemporaries: '--color-role-sender',
    topics: '--color-warning'
};
// Organisations apart from persons, in the "Farbe" mode by kind
const ORGANIZATION_COLOR_TOKEN = '--color-primary';

// Module state
// Who wrote to whom is the basic question of a correspondence network, so it is the default type
let networkType = 'correspondence'; // 'correspondence', 'contemporaries', 'topics'
let networkMinLetters = NETWORK_DEFAULTS.minLetters;
let networkMinYears = NETWORK_DEFAULTS.minYears;
let networkMinCooccurrence = NETWORK_DEFAULTS.minCooccurrence;
let networkMaxNodes = NETWORK_DEFAULTS.maxNodes;
let networkColorMode = 'type'; // 'type' or 'entry' (entry year)
let networkHideEgo = false; // Hide the ego node (dominant person, else the most connected one)
let hasOrganizations = false; // Whether the dataset names organisations as correspondents
let networkSimulation = null;
let networkSvg = null;
let networkZoom = null;

// External dependencies - injected via init
let getFilteredLetters = null;
let getAllLetters = null;
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

    // Defaults: at most the configured thresholds, lowered until the dataset shows a connection
    const allLetters = getAllLetters();
    networkMinLetters = defaultNetworkThreshold(allLetters, 'correspondence', NETWORK_DEFAULTS.minLetters);
    networkMinYears = defaultNetworkThreshold(allLetters, 'contemporaries', NETWORK_DEFAULTS.minYears);
    networkMinCooccurrence = defaultNetworkThreshold(allLetters, 'topics', NETWORK_DEFAULTS.minCooccurrence);

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
            if (networkType === 'correspondence') {
                networkMinLetters = val;
            } else if (networkType === 'contemporaries') {
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
        <option value="correspondence">Briefwechsel</option>
        <option value="contemporaries">Zeitgenossen</option>
        ${hasSubjects ? '<option value="topics">Themen-Netzwerk</option>' : ''}
    `;

    // "By kind" promises a distinction; without organisations in the data there is none to make,
    // so the same option is the plain single colour and says so
    hasOrganizations = allLetters.some(l =>
        l.sender?.isOrganization || letterRecipients(l).some(r => r?.isOrganization));
    const typeOption = elements.getById('network-color-mode')?.querySelector('option[value="type"]');
    if (typeOption) typeOption.textContent = hasOrganizations ? 'Person oder Organisation' : 'Einheitlich';

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

    if (networkType === 'correspondence') {
        label.textContent = 'Min. Briefe:';
        input.value = networkMinLetters;
        input.min = 1;
        input.max = NETWORK_DEFAULTS.maxLettersSlider;
        if (valueDisplay) valueDisplay.textContent = networkMinLetters;
        if (colorGroup) colorGroup.style.display = '';
    } else if (networkType === 'contemporaries') {
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
 * Default threshold of a network type: the highest value up to ceiling that still yields an edge.
 * A fixed default left small datasets (the tutorial dataset) with an empty network.
 * @param {Array} letters - All letters of the dataset
 * @param {'correspondence'|'contemporaries'|'topics'} type
 * @param {number} ceiling - Configured default (NETWORK_DEFAULTS)
 * @returns {number}
 */
export function defaultNetworkThreshold(letters, type, ceiling) {
    const build = NETWORK_BUILDERS[type];
    for (let threshold = ceiling; threshold > 1; threshold--) {
        if (build(letters, threshold, NETWORK_DEFAULTS.maxNodes).links.length > 0) return threshold;
    }
    return 1;
}

/**
 * Build the correspondence network (US-11): persons as nodes, an edge joins sender and recipient
 * and counts their letters in both directions. Only pairs with at least minLetters letters are
 * kept, then at most maxNodes persons by their letters in the dataset.
 * @param {Array} letters
 * @param {number} minLetters
 * @param {number} maxNodes
 */
export function buildCorrespondenceNetwork(letters, minLetters, maxNodes) {
    const personInfo = new Map();
    const pairs = new Map();
    const touch = (key, person, year) => {
        if (!personInfo.has(key)) {
            personInfo.set(key, { id: key, name: person.name || key, letterCount: 0, firstYear: null, isOrganization: Boolean(person.isOrganization) });
        }
        const info = personInfo.get(key);
        info.letterCount++;
        if (year && (info.firstYear === null || year < info.firstYear)) info.firstYear = year;
    };

    letters.forEach(letter => {
        const from = personKey(letter.sender);
        if (from) touch(from, letter.sender, letter.year);
        // A letter to several recipients joins the sender with each of them
        const recipients = letterRecipients(letter);
        for (const recipient of recipients.length ? recipients : [null]) {
            const to = personKey(recipient);
            if (to) touch(to, recipient, letter.year);
            // A letter to oneself or with one side unknown is no correspondence between two persons
            if (!from || !to || from === to) continue;
            const [a, b] = [from, to].sort();
            if (!pairs.has(`${a}|${b}`)) pairs.set(`${a}|${b}`, { source: a, target: b, count: 0, forward: 0, backward: 0 });
            const pair = pairs.get(`${a}|${b}`);
            pair.count++;
            if (from === a) pair.forward++; else pair.backward++;
        }
    });

    const strong = [...pairs.values()].filter(p => p.count >= minLetters);
    const active = new Set(strong.flatMap(p => [p.source, p.target]));
    let shown = [...personInfo.values()].filter(p => active.has(p.id));
    if (shown.length > maxNodes) {
        shown = shown.sort((x, y) => y.letterCount - x.letterCount).slice(0, maxNodes);
    }
    const shownIds = new Set(shown.map(p => p.id));
    const links = strong
        .filter(p => shownIds.has(p.source) && shownIds.has(p.target))
        .sort((x, y) => y.count - x.count)
        .map(p => ({
            ...p,
            sourceName: personInfo.get(p.source).name,
            targetName: personInfo.get(p.target).name
        }));

    return {
        nodes: shown.map(p => ({ id: p.id, name: p.name, total: p.letterCount, firstYear: p.firstYear, isOrganization: p.isOrganization })),
        links,
        networkType: 'correspondence',
        stats: {
            totalPersons: personInfo.size,
            totalConnections: pairs.size,
            displayedPersons: shown.length,
            displayedConnections: links.length
        }
    };
}

/**
 * Build contemporaries network: persons who correspond in the same years
 */
export function buildContemporariesNetwork(letters, minYears, maxNodes) {
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
                lastYear: year,
                isOrganization: Boolean(letter.sender.isOrganization)
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
        lastYear: p.lastYear,
        isOrganization: p.isOrganization
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
export function buildTopicsNetwork(letters, minCooccurrence, maxNodes) {
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

const NETWORK_BUILDERS = {
    correspondence: buildCorrespondenceNetwork,
    contemporaries: buildContemporariesNetwork,
    topics: buildTopicsNetwork
};

const thresholdOf = type => ({ correspondence: networkMinLetters, contemporaries: networkMinYears, topics: networkMinCooccurrence })[type];

// A person on at least this share of the letters makes the dataset ego-centred: its network is a
// star around that person, and the relations between the others need to be announced
const EGO_SHARE = 0.5;
// Upper bound of node labels; the placement below shows fewer where they would overlap
const MAX_LABELS = 40;
const LABEL_MAX_CHARS = 26;
const LABEL_GAP = 4;

/**
 * The person who takes part in most letters, if that is at least half of them
 * @param {Array} letters
 * @returns {{id: string, name: string, count: number, total: number}|null}
 */
export function findEgo(letters) {
    const counts = new Map();
    letters.forEach(letter => {
        // A person counts once per letter, also when named as sender and recipient
        const keys = new Map();
        [letter.sender, ...letterRecipients(letter)].forEach(person => {
            const key = personKey(person);
            if (key && !keys.has(key)) keys.set(key, person.name || key);
        });
        keys.forEach((name, key) => {
            const entry = counts.get(key) || { id: key, name, count: 0 };
            entry.count++;
            counts.set(key, entry);
        });
    });
    let top = null;
    counts.forEach(entry => { if (!top || entry.count > top.count) top = entry; });
    return top && letters.length > 0 && top.count >= letters.length * EGO_SHARE
        ? { ...top, total: letters.length }
        : null;
}

/**
 * The network without one person: its edges go, persons left without any edge go too, and the
 * node limit applies to the rest. Built from the unlimited network, so hiding the ego frees its
 * place for persons who are linked to someone else.
 * @param {{nodes: Array, links: Array}} data
 * @param {string} egoId
 * @param {number} maxNodes
 */
export function networkWithoutEgo(data, egoId, maxNodes) {
    const linkedIds = links => new Set(links.flatMap(l => [l.source, l.target]));
    let links = data.links.filter(l => l.source !== egoId && l.target !== egoId);
    let linked = linkedIds(links);
    let nodes = data.nodes.filter(n => n.id !== egoId && linked.has(n.id));
    if (nodes.length > maxNodes) {
        nodes = [...nodes].sort((a, b) => b.total - a.total).slice(0, maxNodes);
        const shown = new Set(nodes.map(n => n.id));
        links = links.filter(l => shown.has(l.source) && shown.has(l.target));
        linked = linkedIds(links);
        nodes = nodes.filter(n => linked.has(n.id));
    }
    return { ...data, nodes, links };
}

// The node with most edges, the former meaning of "Ego" for datasets without a dominant person
function mostConnectedNode(data) {
    const degree = new Map();
    data.links.forEach(l => {
        degree.set(l.source, (degree.get(l.source) || 0) + 1);
        degree.set(l.target, (degree.get(l.target) || 0) + 1);
    });
    let best = null;
    degree.forEach((count, id) => { if (!best || count > best.count) best = { id, count }; });
    return best?.id || null;
}

/**
 * Network data of the current settings. The ego is the dominant person of the filtered letters,
 * else the most connected node. Returns the shown data and, for an ego-centred correspondence
 * network, how many edges the network keeps without the ego.
 */
function networkData(letters) {
    const build = NETWORK_BUILDERS[networkType];
    const threshold = thresholdOf(networkType);
    const ego = networkType === 'correspondence' ? findEgo(letters) : null;
    // Only the correspondence network is linear in the letters; the others keep their node
    // limit before the ego is removed, as before
    const full = ego ? build(letters, threshold, Infinity) : null;
    const withoutEgo = ego ? networkWithoutEgo(full, ego.id, networkMaxNodes) : null;

    let data;
    if (networkHideEgo && withoutEgo) {
        data = { ...withoutEgo, stats: full.stats };
    } else {
        data = build(letters, threshold, networkMaxNodes);
        if (networkHideEgo) {
            const egoId = mostConnectedNode(data);
            if (egoId) data = networkWithoutEgo(data, egoId, networkMaxNodes);
        }
    }
    return { data, ego, othersLinks: withoutEgo ? withoutEgo.links.length : null };
}

/**
 * Render the network visualization
 */
export function renderNetwork() {
    const container = elements.getById('network-graph');
    if (!container) return;

    const { data, ego, othersLinks } = networkData(getFilteredLetters());

    // Color scale for entry year mode (contemporaries only)
    let yearColorScale = null;
    let minYear = null;
    let maxYear = null;
    if (networkColorMode === 'entry' && networkType !== 'topics') {
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
    updateEgoNote(ego, othersLinks);

    // Text alternative: every shown connection with its strength
    const edgeColumn = { correspondence: 'Briefe', contemporaries: 'Gemeinsame Jahre', topics: 'Gemeinsame Briefe' }[networkType];
    renderDataTable(elements.getById('network-table'), {
        caption: `Verbindungen im Netzwerk (${data.links.length})`,
        columns: [networkType === 'topics' ? 'Thema' : 'Person', networkType === 'topics' ? 'Thema' : 'Person', edgeColumn],
        rows: data.links.map(l => [l.sourceName, l.targetName, networkType === 'contemporaries' ? l.sharedYears : l.count])
    });

    // A running simulation of the previous render would keep ticking on detached nodes
    networkSimulation?.stop();
    networkSimulation = null;

    // Clear previous
    container.innerHTML = '';

    if (data.nodes.length === 0) {
        const thresholdText = {
            correspondence: `mindestens ${networkMinLetters} Briefen zwischen zwei Personen`,
            contemporaries: `mindestens ${networkMinYears} gemeinsamen Jahren`,
            topics: `mindestens ${networkMinCooccurrence} gemeinsamen Erwähnungen`
        }[networkType];
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
        orgColor: ORGANIZATION_COLOR_TOKEN,
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
        `Größte Knoten: ${topNames}. Pfeiltasten wechseln den Knoten, Enter filtert die Briefe.`;

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
    const radius = d => nodeScale(d.total);

    // Calculate edge widths
    const edgeValueFn = networkType === 'contemporaries'
        ? d => d.sharedYears
        : d => d.count;
    const maxEdgeValue = Math.max(...data.links.map(edgeValueFn));
    const minEdgeValue = thresholdOf(networkType);
    const edgeScale = d3.scaleLinear()
        .domain([minEdgeValue, maxEdgeValue])
        .range([1, 8]);

    const typeColor = tokens.typeColor;

    // Node color function: by entry year, else organisations apart from persons where the
    // dataset names any; the legend states both colours, the tooltip the kind in words
    const getNodeColor = (d) => {
        if (yearColorScale && d.firstYear != null) {
            return yearColorScale(d.firstYear);
        }
        if (networkColorMode === 'type' && d.isOrganization) return tokens.orgColor;
        return typeColor;
    };
    const kindOf = d => d.isOrganization ? ' (Organisation)' : '';

    // The layout is computed before it is drawn, so a new render (such as "Ego ausblenden") shows
    // the settled picture instead of nodes falling in from the corner. The box force keeps every
    // node inside the visible area, which lets labels be placed against its edges.
    const area = width * height;
    networkSimulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links)
            .id(d => d.id)
            .distance(80))
        .force('charge', d3.forceManyBody().strength(-Math.max(30, Math.min(200, area / data.nodes.length / 25))))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05 * Math.min(3, width / height)))
        .force('collision', d3.forceCollide().radius(d => radius(d) + 5))
        .force('box', () => {
            data.nodes.forEach(d => {
                const r = radius(d) + 2;
                d.x = Math.max(r, Math.min(width - r, d.x));
                d.y = Math.max(r, Math.min(height - r, d.y));
            });
        })
        .stop();
    const settleTicks = Math.ceil(Math.log(networkSimulation.alphaMin()) / Math.log(1 - networkSimulation.alphaDecay()));
    networkSimulation.tick(settleTicks);

    const fontPx = parseFloat(tokens.fontSize) || 12;
    placeLabels(data.nodes, radius, width, height, fontPx, labelMeasure(container, fontPx));

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
        .attr('aria-label', d => networkType === 'contemporaries'
            ? `${d.name}${kindOf(d)}: ${d.total} Briefe, ${d.yearsActive} Jahre aktiv`
            : `${d.name}${kindOf(d)}: ${d.total} Briefe`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Node circles
    node.append('circle')
        .attr('r', radius)
        .attr('fill', d => getNodeColor(d))
        .attr('stroke', tokens.nodeStroke)
        .attr('stroke-width', 2);

    // Labels in their own layer above all nodes, so no later node covers them; a halo in the
    // background colour keeps them legible over edges
    const labelled = data.nodes.filter(d => d.label);
    const label = g.append('g')
        .attr('class', 'network-labels')
        .attr('aria-hidden', 'true')
        .selectAll('text')
        .data(labelled)
        .join('text')
        .text(d => d.label.text)
        .attr('text-anchor', d => d.label.anchor)
        .attr('font-size', tokens.fontSize)
        .attr('fill', tokens.label)
        .attr('stroke', tokens.nodeStroke)
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round')
        .attr('paint-order', 'stroke')
        .attr('pointer-events', 'none');

    // Tooltips
    if (networkType === 'topics') {
        node.append('title')
            .text(d => `${d.name}\n${d.total} Briefe`);
        link.append('title')
            .text(d => `${d.sourceName} + ${d.targetName}\n${d.count}x gemeinsam erwähnt`);
    } else if (networkType === 'correspondence') {
        node.append('title')
            .text(d => `${d.name}${kindOf(d)}\n${d.total} Briefe als Absender oder Empfänger`);
        link.append('title')
            .text(d => `${d.sourceName} und ${d.targetName}\n${d.count} Briefe (${d.forward} an ${d.targetName}, ${d.backward} an ${d.sourceName})`);
    } else {
        node.append('title')
            .text(d => {
                let text = `${d.name}${kindOf(d)}\n${d.total} Briefe\n${d.yearsActive} Jahre aktiv`;
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
        label.attr('opacity', n =>
            connectedIds.has(n.id) ? 1 : 0.3
        );
    };

    const unhighlight = () => {
        link.attr('stroke-opacity', baseOpacity)
            .attr('stroke', tokens.edge);
        node.select('circle').attr('opacity', 1);
        label.attr('opacity', 1);
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

    // Update positions on tick; drawn once now, again while a node is dragged
    const draw = () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
        label
            .attr('x', d => d.x + d.label.dx)
            .attr('y', d => d.y + d.label.dy);
    };
    networkSimulation.on('tick', draw);
    draw();

    // Dragging moves the node with the hand, which reduced motion does not forbid
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

// Text width in pixels at the label font, measured on a canvas so it works before the SVG exists
function labelMeasure(container, fontPx) {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return text => text.length * fontPx * 0.6;
    context.font = `${fontPx}px ${getComputedStyle(container).fontFamily}`;
    return text => context.measureText(text).width;
}

function labelText(name) {
    return name.length > LABEL_MAX_CHARS ? `${name.slice(0, LABEL_MAX_CHARS - 1)}…` : name;
}

/**
 * Give the largest nodes a label where it fits: right, left, above or below the node, inside the
 * drawing area, over no other node and no other label. Sets node.label = {text, anchor, dx, dy}.
 */
function placeLabels(nodes, radius, width, height, fontPx, measure) {
    const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const nodeBoxes = nodes.map(n => {
        const r = radius(n);
        return { node: n, x0: n.x - r, y0: n.y - r, x1: n.x + r, y1: n.y + r };
    });
    const placed = [];
    nodes.forEach(n => { delete n.label; });
    const byTotal = [...nodes].sort((a, b) => b.total - a.total);
    for (const n of byTotal) {
        if (placed.length >= MAX_LABELS) break;
        const text = labelText(n.name);
        const w = measure(text);
        const r = radius(n) + LABEL_GAP;
        // Baseline offsets: the text box spans from the baseline up by about 0.8 of the font size
        const candidates = [
            { anchor: 'start', dx: r, dy: fontPx * 0.35, x0: n.x + r },
            { anchor: 'end', dx: -r, dy: fontPx * 0.35, x0: n.x - r - w },
            { anchor: 'middle', dx: 0, dy: -r, x0: n.x - w / 2 },
            { anchor: 'middle', dx: 0, dy: r + fontPx * 0.8, x0: n.x - w / 2 }
        ];
        for (const c of candidates) {
            const baseline = n.y + c.dy;
            const box = { x0: c.x0, x1: c.x0 + w, y0: baseline - fontPx * 0.85, y1: baseline + fontPx * 0.25 };
            if (box.x0 < 2 || box.x1 > width - 2 || box.y0 < 2 || box.y1 > height - 2) continue;
            if (placed.some(p => overlaps(p, box))) continue;
            if (nodeBoxes.some(b => b.node !== n && overlaps(b, box))) continue;
            placed.push(box);
            n.label = { text, anchor: c.anchor, dx: c.dx, dy: c.dy };
            break;
        }
    }
}

/**
 * One sentence on the star: who stands in its centre and how many connections remain between
 * the other persons, with the switch that shows them next to it
 */
function updateEgoNote(ego, othersLinks) {
    const note = elements.getById('network-ego-note');
    const text = elements.getById('network-ego-text');
    const egoGroup = elements.getById('network-ego-group');
    if (!note || !text || !egoGroup) return;

    if (!ego) {
        note.classList.add('hidden');
        // Without a dominant person the switch stays among the other controls
        const controls = egoGroup.ownerDocument.querySelector('.network-controls');
        const resetBtn = elements.networkResetZoom;
        if (controls && egoGroup.parentElement !== controls) controls.insertBefore(egoGroup, resetBtn || null);
        return;
    }

    const count = n => n.toLocaleString('de-DE');
    const share = `${ego.name} ist an ${count(ego.count)} von ${count(ego.total)} Briefen beteiligt.`;
    text.textContent = networkHideEgo
        ? `${share} Die Person ist ausgeblendet, das Netz zeigt die Verbindungen zwischen den anderen Personen.`
        : othersLinks > 0
            ? `${share} Ohne diese Person zeigt das Netz ${count(othersLinks)} ${othersLinks === 1 ? 'Verbindung' : 'Verbindungen'} zwischen anderen Personen.`
            : `${share} Zwischen anderen Personen gibt es bei dieser Schwelle keine Verbindung.`;
    if (egoGroup.parentElement !== note) note.append(egoGroup);
    note.classList.remove('hidden');
}

/**
 * Update network statistics display: one line for what is shown of how much, so no second
 * count in the header can contradict it
 */
function updateNetworkStats(data, minYear, maxYear, yearColorScale) {
    const coverageDiv = elements.getById('network-coverage');
    const infoText = elements.getById('network-info-text');
    const legendDiv = elements.getById('network-legend');

    // Update info text
    if (infoText) {
        infoText.textContent = {
            correspondence: 'Wer schrieb wem: eine Linie verbindet Absender und Empfänger, ihre Stärke folgt der Zahl der Briefe',
            contemporaries: 'Korrespondenten, die in denselben Jahren aktiv sind',
            topics: 'Themen, die gemeinsam in Briefen erwähnt werden'
        }[networkType];
    }

    // Update legend
    if (legendDiv) {
        const label = { correspondence: 'Briefwechsel-Netzwerk', contemporaries: 'Zeitgenossen-Netzwerk', topics: 'Themen-Netzwerk' }[networkType];
        const sizeHint = networkType === 'topics'
            ? 'Größe = Anzahl Briefe'
            : 'Größe = Briefmenge';

        if (networkColorMode === 'entry' && networkType !== 'topics' && minYear && maxYear) {
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
            const byKind = networkType !== 'topics' && hasOrganizations;
            const items = byKind
                ? `<div class="legend-item"><span class="legend-circle" style="background: ${color};"></span> Person</div>
                   <div class="legend-item"><span class="legend-circle" style="background: var(${ORGANIZATION_COLOR_TOKEN});"></span> Organisation</div>`
                : `<div class="legend-item"><span class="legend-circle" style="background: ${color};"></span> ${label}</div>`;
            legendDiv.innerHTML = `
                ${items}
                <div class="legend-size-hint"><i class="fas fa-circle"></i> ${sizeHint}</div>
                <div class="legend-hint">Klick filtert Briefe | Hover zeigt Verbindungen</div>
            `;
        }
    }

    // Update coverage
    if (coverageDiv) {
        const count = n => n.toLocaleString('de-DE');
        const shown = networkType === 'topics'
            ? `${count(data.nodes.length)} von ${count(data.stats.totalTopics)} Themen`
            : `${count(data.nodes.length)} von ${count(data.stats.totalPersons)} Personen`;
        coverageDiv.textContent = `Sichtbar: ${shown}, ${count(data.links.length)} von ${count(data.stats.totalConnections)} Verbindungen`;
    }
}

/**
 * Reset network zoom to identity
 */
export function resetNetworkZoom() {
    if (networkSvg && networkZoom) {
        networkSvg.transition().duration(motionMs(500)).call(networkZoom.transform, d3.zoomIdentity);
    }
}
