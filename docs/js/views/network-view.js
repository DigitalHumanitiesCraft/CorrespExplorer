// Network View
// Two modes. "Ego" draws one person in the centre with its correspondents and, one level up, the
// persons their letters mention, every node labelled. "Gesamt" is the earlier force-directed graph
// of who wrote to whom, of contemporaries or of topics, kept because it serves other questions.

import { debounce, motionMs, personKey, letterRecipients, escapeHtml, openModal, closeModal } from '../utils.js';
import { NETWORK_DEFAULTS } from '../constants.js';
import { elements } from '../dom-cache.js';
import { formatDateWithPrecision } from '../formatters.js';
import { state } from '../state-manager.js';
import { showLetterDetail } from './letters-view.js';
import { readTokens, renderDataTable } from './view-support.js';

// Node colours per network type, as custom properties of tokens.css
const TYPE_COLOR_TOKEN = {
    correspondence: '--color-role-sender',
    contemporaries: '--color-role-sender',
    topics: '--color-role-topic'
};
// Organisations apart from persons, in the "Farbe" mode by kind
const ORGANIZATION_COLOR_TOKEN = '--color-role-organization';

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

// The ego network is the default: the one large network of an archive is a star or a hairball,
// a person with its direct neighbours can be read name by name
let networkMode = 'ego'; // 'ego' or 'whole'
let egoLevel = 'correspondence'; // 'correspondence' or 'mentions'
let egoHistory = []; // earlier centres as {filter, name}, for the way back
let egoFocusAfterRender = null; // 'figure' or 'list': where focus goes after a choice re-renders
let egoDrawn = null; // model and helpers of the drawn figure, for level switches without redraw

// External dependencies - injected via init
let getFilteredLetters = null;
let getAllLetters = null;
let applyPersonFilter = null;
let applySubjectFilter = null;
let switchView = null;

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

    setupNetworkEventHandlers();
    setupEgoControls();
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
        colorGroup?.classList.remove('hidden');
    } else if (networkType === 'contemporaries') {
        label.textContent = 'Min. gemeinsame Jahre:';
        input.value = networkMinYears;
        input.min = 1;
        input.max = NETWORK_DEFAULTS.maxYearsSlider;
        if (valueDisplay) valueDisplay.textContent = networkMinYears;
        // Show color mode selector for contemporaries
        colorGroup?.classList.remove('hidden');
    } else if (networkType === 'topics') {
        label.textContent = 'Min. Co-Occurrence:';
        input.value = networkMinCooccurrence;
        input.min = 1;
        input.max = NETWORK_DEFAULTS.maxNodesSlider;
        if (valueDisplay) valueDisplay.textContent = networkMinCooccurrence;
        // Hide color mode selector for topics (entry year not applicable)
        colorGroup?.classList.add('hidden');
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
 * Render the network view in its current mode
 */
export function renderNetwork() {
    syncModeParts();
    if (networkMode === 'ego') {
        renderEgoNetwork();
    } else {
        egoDrawn = null;
        // The switch keeps the counts of the ego levels current under the filters
        const letters = egoScopeLetters();
        const centreId = state.filters.person || mostConnectedPerson(letters)?.id;
        renderLevelSwitch(centreId ? buildEgoNetwork(letters, centreId) : null,
            letters.some(l => l.mentions?.persons?.length > 0));
        renderWholeNetwork();
    }
}

/**
 * Render the whole-dataset network (mode "Gesamt")
 */
function renderWholeNetwork() {
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
function labelMeasure(container, fontPx, weight = 400) {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return text => text.length * fontPx * 0.6;
    context.font = `${weight} ${fontPx}px ${getComputedStyle(container).fontFamily}`;
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
function resetNetworkZoom() {
    if (networkSvg && networkZoom) {
        networkSvg.transition().duration(motionMs(500)).call(networkZoom.transform, d3.zoomIdentity);
    }
}

// Ego network
// A correspondence circle around one person. The distance of a correspondent from the centre
// says how many letters the two exchanged (more letters, closer, on a log scale), the angle says
// when the exchange began (first dated letter, clockwise from the top). Position carries the
// data, so no line runs from the centre; lines join only correspondents who wrote to each other.

const EGO_MARGIN = 8;
// Room outside the rim for the year ticks and their labels
const EGO_TICK_ROOM = 34;
// From the rim to the ring of mentioned persons, and that ring's rows
const EGO_BAND_GAP = { wide: 40, narrow: 28 };
const EGO_BAND_STEP = 5;
const EGO_BAND_ROWS = { wide: 7, narrow: 4 };
// Radians of the rim between the last and the first year; holds the reference ring labels and
// the correspondents without any dated letter
const EGO_GAP = 0.24;
// Names placed at most, strongest first, where they fit without overlap
const EGO_LABELS = { wide: 14, narrow: 6 };
const EGO_OUTER_LABELS = { wide: 8, narrow: 2 };
const EGO_NARROW = 600;

const formatNumber = n => n.toLocaleString('de-DE');
const plural = (n, one, many) => `${formatNumber(n)} ${n === 1 ? one : many}`;

// Sender and recipients of a letter, each person once
function letterParties(letter) {
    const parties = new Map();
    [letter.sender, ...letterRecipients(letter)].forEach(person => {
        const key = personKey(person);
        if (key && !parties.has(key)) parties.set(key, person);
    });
    return parties;
}

// Time of a letter as a fractional year, or null without a usable year
function letterTime(letter) {
    if (!letter.year || letter.dateImplausible) return null;
    const m = /^(\d{1,4})-(\d{2})(?:-(\d{2}))?/.exec(letter.date || '');
    if (!m || Number(m[1]) !== letter.year) return letter.year;
    return letter.year + (Number(m[2]) - 1) / 12 + (Number(m[3] || 1) - 1) / 366;
}

/**
 * The person with most correspondents, the default centre of the ego network. In an ego-centred
 * archive that is the person the archive is built around. Ties go to more letters, then the name.
 * @param {Array} letters
 * @returns {{id: string, name: string, partners: number, letters: number}|null}
 */
export function mostConnectedPerson(letters) {
    const people = new Map();
    const entry = (key, person) => {
        if (!people.has(key)) people.set(key, { id: key, name: person?.name || key, partners: new Set(), letters: 0 });
        return people.get(key);
    };
    letters.forEach(letter => {
        letterParties(letter).forEach((person, key) => { entry(key, person).letters++; });
        const from = personKey(letter.sender);
        if (!from) return;
        letterRecipients(letter).forEach(recipient => {
            const to = personKey(recipient);
            if (!to || to === from) return;
            entry(from, letter.sender).partners.add(to);
            entry(to, recipient).partners.add(from);
        });
    });
    let best = null;
    people.forEach(p => {
        if (!best || p.partners.size > best.partners.size ||
            (p.partners.size === best.partners.size && (p.letters > best.letters ||
                (p.letters === best.letters && p.name.localeCompare(best.name, 'de') < 0)))) best = p;
    });
    return best ? { id: best.id, name: best.name, partners: best.partners.size, letters: best.letters } : null;
}

/**
 * The ego network of one person in the given letters.
 * Correspondents ("correspondence"): the persons who wrote to the centre or received a letter
 * from it, with their letters, both directions, first and last date. Chords: letters between two
 * correspondents. Mentioned persons ("mentions"): persons named in the letters of the centre's
 * correspondence who are not correspondents of the centre. A mention links the letter's writer
 * to the person named, never two persons named together, which would invent a relation.
 * @param {Array} letters - letters under all filters except the person filter
 * @param {string} centreId - personKey of the centre
 */
export function buildEgoNetwork(letters, centreId) {
    const info = new Map();
    const note = (key, person) => {
        if (!info.has(key)) info.set(key, { id: key, name: person?.name || key, isOrganization: Boolean(person?.isOrganization) });
    };
    // Persons who send or receive a letter in these letters; the others are known only by mention
    const correspondents = new Set();
    const partners = new Map();
    const centreLetters = [];
    letters.forEach(letter => {
        const parties = letterParties(letter);
        parties.forEach((person, key) => { correspondents.add(key); note(key, person); });
        if (!parties.has(centreId)) return;
        centreLetters.push(letter);
        const from = personKey(letter.sender);
        // The partner is the other side of a sender-recipient pair, as in the whole network;
        // two recipients of the same letter did not write to each other
        const others = from === centreId
            ? letterRecipients(letter).map(personKey).filter(k => k && k !== centreId)
            : (from && from !== centreId ? [from] : []);
        const time = letterTime(letter);
        new Set(others).forEach(key => {
            const p = partners.get(key) || { letters: 0, toCentre: 0, fromCentre: 0, first: null, firstYear: null, lastYear: null };
            p.letters++;
            if (from === centreId) p.fromCentre++; else p.toCentre++;
            if (time !== null) {
                if (p.first === null || time < p.first) p.first = time;
                const year = Math.floor(time);
                if (p.firstYear === null || year < p.firstYear) p.firstYear = year;
                if (p.lastYear === null || year > p.lastYear) p.lastYear = year;
            }
            partners.set(key, p);
        });
    });

    // Mentions in the centre's letters: by whom (writer) and in whose exchange with the centre
    const mentioned = new Map();
    const links = new Map();
    centreLetters.forEach(letter => {
        const writer = personKey(letter.sender);
        const partner = writer === centreId
            ? letterRecipients(letter).map(personKey).find(k => k && k !== centreId)
            : writer;
        const seen = new Set();
        (letter.mentions?.persons || []).forEach(person => {
            const key = personKey(person);
            if (!key || key === centreId || seen.has(key)) return;
            seen.add(key);
            note(key, person);
            const m = mentioned.get(key) || { letters: 0, partners: new Map() };
            m.letters++;
            if (partner) m.partners.set(partner, (m.partners.get(partner) || 0) + 1);
            mentioned.set(key, m);
            if (writer && writer !== key) {
                const linkKey = `${writer}>${key}`;
                links.set(linkKey, { writer, mentioned: key, letters: (links.get(linkKey)?.letters || 0) + 1 });
            }
        });
    });

    const byName = (a, b) => a.name.localeCompare(b.name, 'de') || (a.id < b.id ? -1 : 1);
    const inner = [...partners].map(([id, p]) => ({
        ...info.get(id), ...p, ring: 'inner', writesLetters: true, mentions: mentioned.get(id)?.letters || 0
    })).sort((a, b) => b.letters - a.letters || byName(a, b));
    const outer = [...mentioned].filter(([id]) => !partners.has(id)).map(([id, m]) => ({
        ...info.get(id),
        ring: 'outer',
        mentions: m.letters,
        writesLetters: correspondents.has(id),
        // The correspondents in whose exchange with the centre the person is named, which place it
        partners: [...m.partners].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    })).sort((a, b) => b.mentions - a.mentions || byName(a, b));

    // Letters between two correspondents, which the circle shows as chords
    const chords = new Map();
    letters.forEach(letter => {
        const from = personKey(letter.sender);
        if (!partners.has(from)) return;
        new Set(letterRecipients(letter).map(personKey)).forEach(to => {
            if (!to || to === from || !partners.has(to)) return;
            const [a, b] = from < to ? [from, to] : [to, from];
            const key = `${a}|${b}`;
            const c = chords.get(key) || { key, a, b, letters: 0, aToB: 0, bToA: 0 };
            c.letters++;
            if (from === a) c.aToB++; else c.bToA++;
            chords.set(key, c);
        });
    });

    const secondLevel = new Set([...partners.keys(), ...mentioned.keys()]);
    return {
        centre: { ...(info.get(centreId) || { id: centreId, name: centreId, isOrganization: false }), ring: 'centre', letters: centreLetters.length, writesLetters: true },
        inner,
        outer,
        chords: [...chords.values()].sort((x, y) => y.letters - x.letters || (x.key < y.key ? -1 : 1)),
        mentionLinks: [...links.values()],
        counts: {
            correspondence: partners.size,
            mentions: secondLevel.size,
            // Persons of the second level who neither send nor receive a letter here
            hollow: [...secondLevel].filter(id => !correspondents.has(id)).length,
            onlyMentioned: outer.length
        }
    };
}

/**
 * Geometry of the circle: centre, rim radius R, inner radius r0 of the strongest correspondent,
 * and the ring of mentioned persons outside the year ticks. The ring is reserved whenever the
 * data have mentions, so switching the level never rescales the circle.
 * @param {number} width
 * @param {number} height
 * @param {{hasOuter: boolean}} options
 */
export function egoGeometry(width, height, { hasOuter }) {
    const narrow = width < EGO_NARROW;
    const size = narrow ? 'narrow' : 'wide';
    const cx = width / 2;
    const cy = height / 2;
    const room = Math.min(cx, cy) - EGO_MARGIN;
    const bandRows = EGO_BAND_ROWS[size];
    const outerRoom = hasOuter ? EGO_BAND_GAP[size] + EGO_BAND_STEP * bandRows + 4 : EGO_TICK_ROOM;
    const R = Math.max(50, room - outerRoom);
    return {
        width, height, cx, cy, R, narrow, size, hasOuter,
        r0: R * 0.14,
        bandR0: R + EGO_BAND_GAP[size],
        bandRows,
        bandStep: EGO_BAND_STEP
    };
}

const polar = (g, radius, angle) => ({ x: g.cx + radius * Math.sin(angle), y: g.cy - radius * Math.cos(angle) });

/**
 * Scales of the circle from the correspondents: angle from the first dated letter, distance from
 * the number of letters, mark radius with an area that grows with the letters
 */
export function egoScales(model, g) {
    const firsts = model.inner.map(p => p.first).filter(t => t !== null);
    const t0 = firsts.length ? Math.min(...firsts) : 0;
    const t1 = firsts.length ? Math.max(...firsts) : 1;
    const sweep = 2 * Math.PI - EGO_GAP;
    const span = t1 - t0;
    const maxN = Math.max(2, ...model.inner.map(p => p.letters));
    return {
        t0, t1, sweep,
        angle: t => (span > 0 ? ((t - t0) / span) * sweep : sweep / 2),
        distance: n => g.r0 + (g.R - g.r0) * (1 - Math.log(Math.max(1, n)) / Math.log(maxN)),
        markRadius: n => Math.max(2, (g.narrow ? 7 : 9) * Math.sqrt(n / maxN)),
        maxN
    };
}

/**
 * Positions of the circle. A correspondent sits at the angle of its first dated letter and at
 * the distance of its letter count; where two marks would cover each other, the later one moves
 * inwards, never past the distance of one letter more, so distance stays monotonic in letters.
 * Correspondents without a dated letter sit in the gap of the rim. Mentioned persons form rows
 * outside the rim near the correspondents in whose exchange they are named. The correspondents
 * depend only on themselves, so the second level never moves them.
 * @returns {{pos: Map<string, {x: number, y: number, r: number, angle: number, ring: string}>, scales: Object}}
 */
export function egoLayout(model, g) {
    const scales = egoScales(model, g);
    const pos = new Map([[model.centre.id, { x: g.cx, y: g.cy, r: g.narrow ? 6 : 8, angle: 0, ring: 'centre' }]]);
    const cell = 12;
    const grid = new Map();
    const cellKey = (i, j) => `${i},${j}`;
    const free = (x, y, r) => {
        const reach = Math.ceil((r + 10) / cell);
        const ci = Math.floor(x / cell);
        const cj = Math.floor(y / cell);
        for (let i = ci - reach; i <= ci + reach; i++) {
            for (let j = cj - reach; j <= cj + reach; j++) {
                for (const q of grid.get(cellKey(i, j)) || []) {
                    if (Math.hypot(q.x - x, q.y - y) < q.r + r + 0.8) return false;
                }
            }
        }
        return true;
    };
    const occupy = p => {
        const key = cellKey(Math.floor(p.x / cell), Math.floor(p.y / cell));
        grid.set(key, [...(grid.get(key) || []), p]);
    };
    occupy(pos.get(model.centre.id));

    const undated = model.inner.filter(p => p.first === null);
    const undatedAngle = new Map(undated.map((p, i) => [p.id, scales.sweep + EGO_GAP * ((i + 1) / (undated.length + 1))]));
    // Strongest first, so the few heavy marks keep their exact place
    model.inner.forEach(p => {
        const angle = p.first === null ? undatedAngle.get(p.id) : scales.angle(p.first);
        const r = scales.markRadius(p.letters);
        const outerD = scales.distance(p.letters);
        const innerD = p.letters >= scales.maxN ? g.r0 * 0.6 : scales.distance(p.letters + 1);
        let placed = null;
        const step = Math.max(1.5, r);
        for (let d = outerD; d > innerD + 0.25; d -= step) {
            const at = polar(g, d, angle);
            if (free(at.x, at.y, r)) {
                placed = at;
                break;
            }
        }
        const at = placed || polar(g, outerD, angle);
        const entry = { x: at.x, y: at.y, r, angle, ring: 'inner' };
        pos.set(p.id, entry);
        occupy(entry);
    });

    // Mentioned persons: angle of the exchanges they are named in, then rows outside the rim
    const outer = model.outer.map(p => {
        let sx = 0;
        let sy = 0;
        (p.partners || []).forEach(([id, n]) => {
            const a = pos.get(id)?.angle;
            if (a === undefined) return;
            sx += n * Math.sin(a);
            sy += n * Math.cos(a);
        });
        let angle = Math.atan2(sx, sy);
        if (angle < 0) angle += 2 * Math.PI;
        return { p, angle };
    }).sort((a, b) => a.angle - b.angle || (a.p.id < b.p.id ? -1 : 1));
    const rowEnd = new Array(g.bandRows).fill(-Infinity);
    outer.forEach(({ p, angle }) => {
        const r = 2.2;
        let row = rowEnd.findIndex((end, i) => angle - end >= (2 * r + 1.5) / (g.bandR0 + i * g.bandStep));
        if (row < 0) row = rowEnd.indexOf(Math.min(...rowEnd));
        rowEnd[row] = angle;
        const at = polar(g, g.bandR0 + row * g.bandStep, angle);
        pos.set(p.id, { x: at.x, y: at.y, r, angle, ring: 'outer' });
    });
    return { pos, scales };
}

// Reference rings: a few letter counts on the log scale, each named once
export function egoRings(maxN) {
    const ladder = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter(n => n < maxN);
    const powers = ladder.filter(n => /^10*$/.test(String(n)));
    return powers.length >= 3 ? powers : ladder.filter((n, i) => i % 2 === 0).slice(0, 4);
}

/**
 * Name labels where they fit: horizontal, beside the mark, over no mark, no other label and none
 * of the reserved boxes (centre name, ring labels, year labels), inside the figure. Correspondents
 * stay inside the year ticks, so the ring of mentioned persons never runs under a name.
 * @param {Array} people - in order of priority
 * @param {Map} pos - from egoLayout
 * @param {Object} g - from egoGeometry
 * @param {function(string): number} measure - text width in pixels
 * @param {{limit: number, reserved: Array, fontPx: number, outside?: number, inside?: number}} options
 * @returns {Map<string, {text: string, anchor: string, x: number, y: number, box: Object}>}
 */
export function placeEgoLabels(people, pos, g, measure, { limit, reserved = [], fontPx = 12, outside = 0, inside = Infinity }) {
    const placed = [...reserved];
    const result = new Map();
    const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    // The many marks of one or two letters do not block a name: its halo covers them, and they
    // stay reachable for the pointer because labels take no pointer events
    const marks = [...pos.entries()].filter(([, m]) => m.r > 2.5 || m.ring === 'centre');
    const hitsMark = (box, ownId) => marks.some(([id, m]) => id !== ownId &&
        m.x + m.r > box.x0 && m.x - m.r < box.x1 && m.y + m.r > box.y0 && m.y - m.r < box.y1);
    const corners = box => [[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]]
        .map(([x, y]) => Math.hypot(x - g.cx, y - g.cy));
    let tried = 0;
    for (const p of people) {
        if (result.size >= limit || tried > limit * 6) break;
        tried++;
        const m = pos.get(p.id);
        if (!m) continue;
        const text = labelText(p.name);
        const w = measure(text);
        const gap = m.r + 3;
        const right = m.x >= g.cx;
        let sides;
        if (outside > 0) {
            // Beyond a ring the name stands further out on the same ray
            const at = polar(g, outside + 4, m.angle);
            const sin = Math.sin(m.angle);
            const anchor = sin > 0.2 ? 'start' : sin < -0.2 ? 'end' : 'middle';
            const y = at.y + (anchor === 'middle' ? (Math.cos(m.angle) > 0 ? -fontPx * 0.5 : fontPx * 0.5) : 0);
            sides = [0, -1, 1].map(k => ({ anchor, x: at.x, y: y + k * fontPx }));
        } else {
            const near = right ? 'start' : 'end';
            const far = right ? 'end' : 'start';
            const dx = right ? gap : -gap;
            sides = [
                { anchor: near, x: m.x + dx, y: m.y },
                { anchor: near, x: m.x + dx, y: m.y - fontPx * 0.8 },
                { anchor: near, x: m.x + dx, y: m.y + fontPx * 0.8 },
                { anchor: far, x: m.x - dx, y: m.y },
                { anchor: 'middle', x: m.x, y: m.y - gap - fontPx * 0.45 },
                { anchor: 'middle', x: m.x, y: m.y + gap + fontPx * 0.45 }
            ];
            // Where the strong marks crowd the middle, a name may stand a little away, joined to
            // its mark by a short leader
            for (const shift of [22, 44]) {
                for (const k of [0, -1, 1, -2, 2]) {
                    sides.push({ anchor: near, x: m.x + dx + (right ? shift : -shift), y: m.y + k * fontPx * 1.1, leader: true });
                }
            }
        }
        for (const c of sides) {
            const x0 = c.anchor === 'start' ? c.x : c.anchor === 'end' ? c.x - w : c.x - w / 2;
            const box = { x0, x1: x0 + w, y0: c.y - fontPx * 0.6, y1: c.y + fontPx * 0.6 };
            if (box.x0 < 2 || box.x1 > g.width - 2 || box.y0 < 2 || box.y1 > g.height - 2) continue;
            const reach = corners(box);
            if (Math.max(...reach) > inside || Math.min(...reach) < outside) continue;
            if (placed.some(b => overlaps(b, box)) || hitsMark(box, p.id)) continue;
            placed.push(box);
            const leader = c.leader ? { x1: m.x, y1: m.y, x2: c.anchor === 'start' ? box.x0 - 2 : box.x1 + 2, y2: c.y } : null;
            result.set(p.id, { text, anchor: c.anchor, x: c.x, y: c.y, box, leader });
            break;
        }
    }
    return result;
}

// The person filter chooses the centre in this view. Chords and whether a person writes letters
// at all are facts of the letters without that filter, so the view reads all other filters;
// without a person filter that is the filtered set itself.
function egoScopeLetters() {
    return state.filters.person
        ? state.filterLetters({ ...state.filters, person: null })
        : getFilteredLetters();
}

function setupEgoControls() {
    // One switch for the two levels of the ego network and the whole network; a level switch
    // inside the ego network fades instead of redrawing
    bindSegmented(elements.getById('network-levels'), value => {
        if (value === 'whole') {
            networkMode = 'whole';
            renderNetwork();
            return;
        }
        const fromWhole = networkMode === 'whole';
        networkMode = 'ego';
        egoLevel = value;
        if (fromWhole) renderNetwork(); else applyEgoLevel();
    });

    // The way back and the release of the choice sit in the corner of the figure
    elements.getById('network-graph')?.addEventListener('click', event => {
        const action = event.target.closest('[data-ego]')?.dataset.ego;
        if (action === 'back') {
            const previous = egoHistory.pop();
            if (!previous) return;
            egoFocusAfterRender = 'figure';
            applyPersonFilter(previous.filter);
        } else if (action === 'clear') {
            egoHistory = [];
            egoFocusAfterRender = 'figure';
            applyPersonFilter(null);
        }
    });

    elements.getById('network-ego-list')?.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        const id = button?.closest('[data-id]')?.dataset.id;
        const person = id && egoDrawn?.people.get(id);
        if (!person) return;
        if (button.dataset.action === 'letters') {
            showPersonLetters(person);
        } else {
            activateEgoPerson(person, 'list');
        }
    });
}

/**
 * Segmented control: radio buttons in a radiogroup with one tab stop; arrows move and select
 */
function bindSegmented(box, onSelect) {
    if (!box) return;
    const select = (button, focus) => {
        const radios = [...box.querySelectorAll('[role="radio"]')];
        radios.forEach(r => {
            r.setAttribute('aria-checked', String(r === button));
            r.tabIndex = r === button ? 0 : -1;
        });
        if (focus) button.focus();
        onSelect(button.dataset.value);
    };
    box.addEventListener('click', event => {
        const button = event.target.closest('[role="radio"]');
        if (button && button.getAttribute('aria-checked') !== 'true') select(button, false);
    });
    box.addEventListener('keydown', event => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!step) return;
        const radios = [...box.querySelectorAll('[role="radio"]')];
        if (radios.length < 2) return;
        event.preventDefault();
        const current = radios.findIndex(r => r.getAttribute('aria-checked') === 'true');
        select(radios[(current + step + radios.length) % radios.length], true);
    });
}

// Parts of the view that belong to one mode only
function syncModeParts() {
    const ego = networkMode === 'ego';
    elements.getById('network-ego-list')?.classList.toggle('hidden', !ego);
    document.querySelector('#network-view .net-info')?.classList.toggle('hidden', !ego);
    ['network-coverage', 'network-legend'].forEach(id => {
        elements.getById(id)?.classList.toggle('hidden', ego);
    });
    document.querySelector('#network-view .network-controls')?.classList.toggle('hidden', ego);
    if (ego) elements.getById('network-ego-note')?.classList.add('hidden');
    document.querySelector('#network-view .network-container')?.classList.toggle('network-container--ego', ego);
    syncSwitch();
    if (ego) {
        const info = elements.getById('network-info-text');
        if (info) info.textContent = EGO_DESCRIPTION;
    }
}

// The one sentence on what distance and angle mean; also the tooltip of the info sign
const EGO_DESCRIPTION = 'Je näher an der Mitte, desto mehr Briefe; der Winkel zeigt, wann der Briefwechsel beginnt, im Uhrzeigersinn ab oben. Linien verbinden Korrespondenten, die einander schrieben.';

const switchValue = () => (networkMode === 'whole' ? 'whole' : egoLevel);

function syncSwitch() {
    elements.getById('network-levels')?.querySelectorAll('[role="radio"]').forEach(r => {
        const on = r.dataset.value === switchValue();
        r.setAttribute('aria-checked', String(on));
        r.tabIndex = on ? 0 : -1;
    });
}

// The level switch carries the counts, so the figure needs no legend
function renderLevelSwitch(model, hasMentions) {
    const box = elements.getById('network-levels');
    if (!box) return;
    const counts = model?.counts || { correspondence: 0, mentions: 0, hollow: 0 };
    const segments = [{
        value: 'correspondence',
        html: `Korrespondenz <strong>${formatNumber(counts.correspondence)}</strong>`,
        label: `Korrespondenz: ${plural(counts.correspondence, 'Person', 'Personen')} im Briefwechsel`
    }];
    if (hasMentions) {
        segments.push({
            value: 'mentions',
            html: `Erwähnte <strong>${formatNumber(counts.mentions)}</strong>` +
                (counts.hollow ? ` <span class="ego-sign ego-sign--hollow" aria-hidden="true"></span><strong>${formatNumber(counts.hollow)}</strong>` : ''),
            label: `Erwähnte: ${plural(counts.mentions, 'Person', 'Personen')} im Briefwechsel und in den Briefen genannt` +
                (counts.hollow ? `, davon ${formatNumber(counts.hollow)} ohne eigenen Brief` : '')
        });
    }
    // The whole network of the dataset, the default before the ego network, stays one step away
    segments.push({ value: 'whole', html: 'Gesamt', label: 'Gesamt: das Netzwerk des ganzen Datensatzes' });
    // Rebuilding the buttons would drop the focus of a keyboard user who just moved the switch
    const hadFocus = box.contains(document.activeElement);
    box.innerHTML = segments.map(s => {
        const on = s.value === switchValue();
        return `<button type="button" class="net-seg__btn" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-value="${s.value}" aria-label="${escapeHtml(s.label)}" title="${escapeHtml(s.label)}">${s.html}</button>`;
    }).join('');
    if (hadFocus) box.querySelector('[aria-checked="true"]')?.focus();
}

function renderEgoNetwork() {
    const container = elements.getById('network-graph');
    if (!container) return;
    const letters = egoScopeLetters();
    const hasMentions = letters.some(l => l.mentions?.persons?.length > 0);
    if (!hasMentions) egoLevel = 'correspondence';
    const centreId = state.filters.person || mostConnectedPerson(letters)?.id || null;

    networkSimulation?.stop();
    networkSimulation = null;
    container.innerHTML = '';
    // The figure fills what the header leaves of the screen; the header's height depends on how
    // its switches wrap, so it is measured rather than assumed (network.css reads the value)
    const view = document.getElementById('network-view');
    if (view) {
        const offset = container.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop;
        view.style.setProperty('--network-head', `${Math.round(offset)}px`);
    }

    const model = centreId ? buildEgoNetwork(letters, centreId) : null;
    renderLevelSwitch(model, hasMentions);

    if (!model || model.inner.length === 0) {
        egoDrawn = null;
        const name = model?.centre.name;
        container.innerHTML = `${cornerControls()}<div class="network-empty"><i class="fas fa-project-diagram" aria-hidden="true"></i><div>${name
            ? `${escapeHtml(name)} hat unter den gewählten Filtern keinen Briefwechsel mit einer anderen Person.`
            : 'Unter den gewählten Filtern gibt es keinen Briefwechsel zwischen zwei Personen.'}</div></div>`;
        const list = elements.getById('network-ego-list');
        if (list) list.innerHTML = '';
        renderDataTable(elements.getById('network-table'), { caption: '', columns: [], rows: [] });
        return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;
    const g = egoGeometry(width, height, { hasOuter: model.outer.length > 0 });
    const { pos, scales } = egoLayout(model, g);
    const people = new Map([model.centre, ...model.inner, ...model.outer].map(p => [p.id, p]));
    const fontPx = parseFloat(readTokens({ size: '--font-size-xs' }).size) || 12;
    const measure = labelMeasure(container, fontPx);
    const boldMeasure = labelMeasure(container, fontPx, 600);

    const svg = d3.select(container).append('svg')
        .attr('class', 'ego-svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, width, height])
        .attr('role', 'group');

    // Reference rings and the rim with the years; the centre name, the ring names and the year
    // labels are reserved before any person gets a name
    const reserved = [];
    const textBox = (x, y, w, anchor) => {
        const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
        return { x0, x1: x0 + w, y0: y - fontPx * 0.6, y1: y + fontPx * 0.6 };
    };
    const centreText = labelText(model.centre.name);
    const centreY = g.cy + pos.get(model.centre.id).r + fontPx;
    reserved.push(textBox(g.cx, centreY, boldMeasure(centreText), 'middle'));

    const frame = svg.append('g').attr('class', 'ego-frame').attr('aria-hidden', 'true');
    // Ring and year names move above the marks at the end, so their halo keeps them legible
    const frameText = svg.append('g').attr('class', 'ego-frame-text').attr('aria-hidden', 'true');
    const rings = egoRings(scales.maxN);
    rings.forEach(n => {
        const d = scales.distance(n);
        frame.append('circle').attr('class', n === 1 ? 'ego-rim' : 'ego-ring')
            .attr('cx', g.cx).attr('cy', g.cy).attr('r', d);
        const text = n === 1 ? '1 Brief' : `${formatNumber(n)} Briefe`;
        const y = g.cy - d;
        // Right of the top, where the first years begin; the gap left of it names the undated
        frameText.append('text').attr('class', 'ego-ring-label').attr('x', g.cx + 4).attr('y', y)
            .attr('dy', '0.35em').attr('text-anchor', 'start').text(text);
        reserved.push(textBox(g.cx + 4, y, measure(text), 'start'));
    });
    // The gap of the rim between the last and the first year, dashed
    const gapArc = d3.arc()({ innerRadius: g.R, outerRadius: g.R, startAngle: scales.sweep, endAngle: 2 * Math.PI });
    frame.append('path').attr('class', 'ego-gap').attr('d', gapArc).attr('transform', `translate(${g.cx},${g.cy})`);
    const tickCount = g.narrow ? 4 : 9;
    let years = d3.ticks(scales.t0, scales.t1, tickCount).filter(y => Number.isInteger(y) && y >= scales.t0 && y <= scales.t1);
    // A short span holds no whole year between its ends; then its first year stands alone
    if (years.length === 0 && model.inner.some(p => p.first !== null)) years = [Math.floor(scales.t0)];
    years.forEach(year => {
        const a = scales.angle(Math.max(year, scales.t0));
        const p1 = polar(g, g.R, a);
        const p2 = polar(g, g.R + 5, a);
        frame.append('line').attr('class', 'ego-tick').attr('x1', p1.x).attr('y1', p1.y).attr('x2', p2.x).attr('y2', p2.y);
        const at = polar(g, g.R + 14, a);
        const anchor = Math.sin(a) > 0.3 ? 'start' : Math.sin(a) < -0.3 ? 'end' : 'middle';
        frameText.append('text').attr('class', 'ego-year').attr('x', at.x).attr('y', at.y).attr('dy', '0.35em')
            .attr('text-anchor', anchor).text(year);
        reserved.push(textBox(at.x, at.y, measure(String(year)), anchor));
    });
    // On a phone the dashed gap alone marks the undated; its words would cover the ring names
    if (!g.narrow && model.inner.some(p => p.first === null)) {
        const a = scales.sweep + EGO_GAP / 2;
        const at = polar(g, g.R + 14, a);
        frameText.append('text').attr('class', 'ego-year').attr('x', at.x).attr('y', at.y).attr('dy', '0.35em')
            .attr('text-anchor', 'end').text('ohne Datum');
        reserved.push(textBox(at.x, at.y, measure('ohne Datum'), 'end'));
    }

    // Chords between correspondents, bent towards the centre
    const maxChord = Math.max(1, ...model.chords.map(c => c.letters));
    const chordWidth = d3.scaleSqrt().domain([1, maxChord]).range([1, 5]);
    const chordPath = c => {
        const a = pos.get(c.a);
        const b = pos.get(c.b);
        const mx = (a.x + b.x) / 2 * 0.5 + g.cx * 0.5;
        const my = (a.y + b.y) / 2 * 0.5 + g.cy * 0.5;
        return `M${a.x},${a.y}Q${mx},${my} ${b.x},${b.y}`;
    };
    const chord = svg.append('g').attr('class', 'ego-chords').attr('aria-hidden', 'true')
        .selectAll('g').data(model.chords, c => c.key).join('g').attr('class', 'ego-chord');
    chord.append('path').attr('class', 'ego-chord__line').attr('d', chordPath).attr('stroke-width', c => chordWidth(c.letters));
    // A wider transparent stroke makes thin chords reachable for the pointer
    chord.append('path').attr('class', 'ego-chord__hit').attr('d', chordPath);

    // Lines of mentions appear only for the person under the pointer or in focus
    const hoverLines = svg.append('g').attr('class', 'ego-mention-lines').attr('aria-hidden', 'true');

    // Mentioned persons: one pass of plain marks, reachable by pointer and through the list
    const band = svg.append('g').attr('class', 'ego-band').attr('data-level', 'mentions')
        .selectAll('circle').data(model.outer, p => p.id).join('circle')
        .attr('class', p => `ego-out ${p.writesLetters ? 'ego-out--filled' : 'ego-out--hollow'}`)
        .attr('cx', p => pos.get(p.id).x).attr('cy', p => pos.get(p.id).y).attr('r', p => pos.get(p.id).r);

    // Correspondents and centre: one tab stop, arrows walk them by angle
    const nodeData = [model.centre, ...[...model.inner].sort((a, b) => pos.get(a.id).angle - pos.get(b.id).angle || b.letters - a.letters)];
    const node = svg.append('g').attr('class', 'ego-nodes').selectAll('g').data(nodeData, d => d.id).join('g')
        // "node" as in the whole network, so checks and styles that look for nodes find both modes
        .attr('class', d => `node ego-node ego-node--${d.ring}`)
        .attr('data-id', d => d.id)
        .attr('transform', d => `translate(${pos.get(d.id).x},${pos.get(d.id).y})`)
        .attr('role', 'button')
        .attr('tabindex', d => (d.ring === 'centre' ? 0 : -1));
    node.each(function (d) {
        const r = pos.get(d.id).r;
        const shape = d.isOrganization
            ? d3.select(this).append('rect').attr('x', -r).attr('y', -r).attr('width', 2 * r).attr('height', 2 * r)
            : d3.select(this).append('circle').attr('r', r);
        shape.attr('class', `ego-mark ${d.ring === 'centre' ? 'ego-mark--centre' : 'ego-mark--filled'}`);
    });

    // Names: the strongest correspondents, then (second level) the most mentioned persons
    const limits = { inner: EGO_LABELS[g.size], outer: EGO_OUTER_LABELS[g.size] };
    const innerPos = new Map([...pos].filter(([, p]) => p.ring !== 'outer'));
    const innerLabels = placeEgoLabels(model.inner, innerPos, g, measure, {
        limit: limits.inner, reserved, fontPx, inside: g.hasOuter ? g.bandR0 - 4 : Infinity
    });
    const outerLabels = placeEgoLabels(model.outer, pos, g, measure, {
        limit: limits.outer, reserved: [...reserved, ...[...innerLabels.values()].map(l => l.box)], fontPx,
        outside: g.bandR0 + g.bandRows * g.bandStep + 2
    });
    const labelData = [
        { id: model.centre.id, text: centreText, anchor: 'middle', x: g.cx, y: centreY, ring: 'centre' },
        ...[...innerLabels].map(([id, l]) => ({ id, ...l, ring: 'inner' })),
        ...[...outerLabels].map(([id, l]) => ({ id, ...l, ring: 'outer' }))
    ];
    const labelLayer = svg.append('g').attr('class', 'ego-labels').attr('aria-hidden', 'true');
    labelLayer.selectAll('line').data(labelData.filter(l => l.leader)).join('line')
        .attr('class', 'ego-leader')
        .attr('data-level', l => (l.ring === 'outer' ? 'mentions' : null))
        .attr('x1', l => l.leader.x1).attr('y1', l => l.leader.y1)
        .attr('x2', l => l.leader.x2).attr('y2', l => l.leader.y2);
    const label = labelLayer
        .selectAll('text').data(labelData, l => l.id).join('text')
        .attr('class', l => `ego-label ego-label--${l.ring}`)
        .attr('data-level', l => (l.ring === 'outer' ? 'mentions' : null))
        .attr('x', l => l.x).attr('y', l => l.y).attr('dy', '0.35em')
        .attr('text-anchor', l => l.anchor)
        .text(l => l.text);
    svg.node().append(frameText.node());

    // Tooltip for pointer and keyboard focus; its text also stands in the accessible names
    const tip = document.createElement('div');
    tip.className = 'ego-tip hidden';
    tip.setAttribute('aria-hidden', 'true');
    container.append(tip);
    const placeTip = (x, y) => {
        const box = tip.getBoundingClientRect();
        const left = x > width * 0.55 ? x - 14 - box.width : x + 14;
        tip.style.left = `${Math.max(4, Math.min(width - box.width - 4, left))}px`;
        tip.style.top = `${Math.max(4, Math.min(height - box.height - 4, y + 14))}px`;
    };
    const showTip = (lines, x, y) => {
        tip.replaceChildren(...lines.map((line, i) => {
            const el = document.createElement(i === 0 ? 'strong' : 'span');
            el.textContent = line;
            return el;
        }));
        tip.classList.remove('hidden');
        placeTip(x, y);
    };

    // Emphasis touches only the elements of one person, so a figure of a thousand marks stays fast
    const nodeById = new Map(node.nodes().map(el => [el.__data__.id, el]));
    const chordsOf = new Map();
    chord.nodes().forEach(el => {
        const c = el.__data__;
        [c.a, c.b].forEach(id => chordsOf.set(id, [...(chordsOf.get(id) || []), el]));
    });
    let emphasised = [];
    const clearEmphasis = () => {
        emphasised.forEach(el => el.classList.remove('is-near'));
        emphasised = [];
        svg.classed('is-focusing', false);
        hoverLines.selectAll('*').remove();
        tip.classList.add('hidden');
    };
    const emphasise = (id, x, y, lines) => {
        clearEmphasis();
        svg.classed('is-focusing', true);
        const els = [nodeById.get(id), ...(chordsOf.get(id) || [])].filter(Boolean);
        (chordsOf.get(id) || []).forEach(el => {
            const c = el.__data__;
            const other = nodeById.get(c.a === id ? c.b : c.a);
            if (other) els.push(other);
        });
        if (egoLevel === 'mentions') {
            const linked = model.mentionLinks.filter(l => l.writer === id || l.mentioned === id);
            hoverLines.selectAll('line').data(linked).join('line')
                .attr('class', 'ego-mention-line')
                .attr('x1', l => pos.get(l.writer)?.x).attr('y1', l => pos.get(l.writer)?.y)
                .attr('x2', l => pos.get(l.mentioned)?.x).attr('y2', l => pos.get(l.mentioned)?.y)
                .filter(l => !pos.get(l.writer) || !pos.get(l.mentioned)).remove();
            linked.forEach(l => {
                const other = nodeById.get(l.writer === id ? l.mentioned : l.writer);
                if (other) els.push(other);
            });
        }
        els.forEach(el => el.classList.add('is-near'));
        emphasised = els;
        showTip(lines, x, y);
    };

    const nameOf = id => people.get(id)?.name || id;
    node.on('mouseenter', (event, d) => emphasise(d.id, pos.get(d.id).x, pos.get(d.id).y, personLines(d, model.centre)))
        .on('mouseleave', clearEmphasis)
        .on('focus', (event, d) => emphasise(d.id, pos.get(d.id).x, pos.get(d.id).y, personLines(d, model.centre)))
        .on('blur', clearEmphasis)
        .on('click', (event, d) => {
            event.stopPropagation();
            activateEgoPerson(d, null);
        })
        .on('keydown', function (event, d) {
            if (event.key === 'Enter' || event.key === ' ') {
                // SVG elements have no click(), so the global role="button" handler cannot serve them
                event.preventDefault();
                event.stopPropagation();
                activateEgoPerson(d, 'figure');
                return;
            }
            const order = node.nodes();
            const at = order.indexOf(this);
            const targets = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: order.length - 1 };
            if (!(event.key in targets)) return;
            event.preventDefault();
            const next = order[(targets[event.key] + order.length) % order.length];
            this.setAttribute('tabindex', -1);
            next.setAttribute('tabindex', 0);
            next.focus();
        });
    band.on('mouseenter', (event, p) => emphasise(p.id, pos.get(p.id).x, pos.get(p.id).y, personLines(p, model.centre)))
        .on('mouseleave', clearEmphasis)
        .on('click', (event, p) => {
            event.stopPropagation();
            activateEgoPerson(p, null);
        });
    chord.on('mouseenter', function (event, c) {
        clearEmphasis();
        svg.classed('is-focusing', true);
        emphasised = [this, nodeById.get(c.a), nodeById.get(c.b)].filter(Boolean);
        emphasised.forEach(el => el.classList.add('is-near'));
        const [x, y] = d3.pointer(event, svg.node());
        showTip(chordLines(c, nameOf), x, y);
    })
        .on('mousemove', event => {
            const [x, y] = d3.pointer(event, svg.node());
            placeTip(x, y);
        })
        .on('mouseleave', clearEmphasis)
        .on('click', (event, c) => {
            event.stopPropagation();
            showTieLetters(c);
        });

    container.insertAdjacentHTML('afterbegin', cornerControls());

    egoDrawn = { model, g, pos, people, letters, svg, node, label, nameOf };
    renderEgoList(model);
    applyEgoLevel();

    const focusTarget = egoFocusAfterRender;
    egoFocusAfterRender = null;
    if (focusTarget === 'figure') {
        container.querySelector('.ego-node--centre')?.focus();
    } else if (focusTarget === 'list') {
        elements.getById('network-ego-list')?.querySelector('.ego-row--centre button')?.focus();
    }
}

// The way back and the release of the choice, only where they apply
function cornerControls() {
    const previous = egoHistory[egoHistory.length - 1];
    const parts = [];
    if (previous) {
        parts.push(`<button type="button" class="ego-corner__btn" data-ego="back"><i class="fas fa-arrow-left" aria-hidden="true"></i> ${escapeHtml(previous.name)}</button>`);
    }
    if (state.filters.person) {
        parts.push('<button type="button" class="ego-corner__btn" data-ego="clear">Auswahl aufheben</button>');
    }
    return parts.length ? `<div class="ego-corner">${parts.join('')}</div>` : '';
}

// Years of an exchange in words
function yearsOf(p) {
    if (p.firstYear === null) return 'kein datierter Brief';
    return p.firstYear === p.lastYear ? String(p.firstYear) : `${p.firstYear} bis ${p.lastYear}`;
}

// Name, role and counts of a person, for the tooltip and the accessible name
function personLines(person, centre) {
    const kind = person.isOrganization ? 'Organisation' : null;
    const mentions = egoLevel === 'mentions';
    if (person.ring === 'centre') {
        return [person.name, `Im Zentrum, ${plural(person.letters, 'Brief', 'Briefe')}`, kind,
            'Klick oder Enter öffnet die Briefe'].filter(Boolean);
    }
    if (person.ring === 'inner') {
        return [person.name,
            `${plural(person.letters, 'Brief', 'Briefe')} mit ${centre.name}: ${formatNumber(person.toCentre)} an, ${formatNumber(person.fromCentre)} von`,
            yearsOf(person),
            mentions && person.mentions ? `in ${plural(person.mentions, 'Brief', 'Briefen')} erwähnt` : null,
            kind,
            'Klick oder Enter rückt die Person ins Zentrum'].filter(Boolean);
    }
    return [person.name,
        `in ${plural(person.mentions, 'Brief', 'Briefen')} von und an ${centre.name} erwähnt`,
        person.writesLetters ? 'schreibt oder erhält selbst Briefe im Bestand' : 'kein eigener Brief im Bestand',
        kind,
        person.writesLetters ? 'Klick rückt die Person ins Zentrum' : 'Klick öffnet die Briefe, die die Person erwähnen'
    ].filter(Boolean);
}

function chordLines(c, nameOf) {
    const a = nameOf(c.a);
    const b = nameOf(c.b);
    return [`${a} und ${b}`,
        `${plural(c.letters, 'Brief', 'Briefe')}: ${formatNumber(c.aToB)} an ${b}, ${formatNumber(c.bToA)} an ${a}`,
        'Klick öffnet die Briefe'];
}

// Show or hide the second level without moving anything that stays
function applyEgoLevel() {
    if (!egoDrawn) return;
    const { svg, node, model } = egoDrawn;
    const mentions = egoLevel === 'mentions';
    svg.classed('ego--mentions', mentions);
    node.attr('aria-label', d => personLines(d, model.centre).join('. '));
    svg.attr('aria-label', `${model.centre.name} im Zentrum mit ${plural(model.inner.length, 'Korrespondenzpartner', 'Korrespondenzpartnern')}` +
        (mentions && model.outer.length ? ` und ${plural(model.outer.length, 'nur erwähnten Person', 'nur erwähnten Personen')} am Rand` : '') +
        `. ${EGO_DESCRIPTION} Pfeiltasten wechseln die Person, Enter rückt sie ins Zentrum.`);

    elements.getById('network-ego-list')?.querySelectorAll('.ego-row--outer').forEach(row => {
        row.classList.toggle('hidden', !mentions);
    });
    syncSwitch();

    const rows = model.inner.map(p => [p.name, p.letters, p.firstYear ?? '', p.lastYear ?? '', p.mentions]);
    if (mentions) model.outer.forEach(p => rows.push([p.name, 0, '', '', p.mentions]));
    renderDataTable(elements.getById('network-table'), {
        caption: `Personen um ${model.centre.name} (${rows.length})`,
        columns: ['Person', `Briefe mit ${model.centre.name}`, 'Erster Brief', 'Letzter Brief', 'Erwähnungen'],
        rows
    });
}

// The person list mirrors the figure and is its keyboard path: name moves the centre, count opens letters
function renderEgoList(model) {
    const list = elements.getById('network-ego-list');
    if (!list) return;
    const centre = model.centre;
    list.innerHTML = [centre, ...model.inner, ...model.outer].map(p => {
        const sign = `<span class="ego-sign ${p.isOrganization ? 'ego-sign--square ' : ''}ego-sign--${p.ring === 'centre' ? 'centre' : p.writesLetters ? 'filled' : 'hollow'}" aria-hidden="true"></span>`;
        const name = escapeHtml(p.name);
        let nameEl;
        let count;
        let countLabel;
        if (p.ring === 'centre') {
            nameEl = `<span class="ego-row__name ego-row__name--centre">${name}</span>`;
            count = plural(p.letters, 'Brief', 'Briefe');
            countLabel = `Alle ${count} von und an ${p.name} in der Briefliste`;
        } else if (p.ring === 'inner') {
            nameEl = `<button type="button" class="ego-row__name" data-action="centre" aria-label="${name} ins Zentrum">${name}</button>`;
            count = plural(p.letters, 'Brief', 'Briefe');
            countLabel = `${count} zwischen ${p.name} und ${centre.name} zeigen`;
        } else {
            nameEl = p.writesLetters
                ? `<button type="button" class="ego-row__name" data-action="centre" aria-label="${name} ins Zentrum">${name}</button>`
                : `<span class="ego-row__name">${name}</span>`;
            count = `${formatNumber(p.mentions)}× erwähnt`;
            countLabel = `${plural(p.mentions, 'Brief', 'Briefe')} zeigen, die ${p.name} erwähnen`;
        }
        return `<li class="ego-row ego-row--${p.ring}" data-id="${escapeHtml(p.id)}">${sign}${nameEl}` +
            `<button type="button" class="ego-row__count" data-action="letters" aria-label="${escapeHtml(countLabel)}">${escapeHtml(count)}</button></li>`;
    }).join('');
}

// A click on a person: a correspondent becomes the centre through the person filter, so the
// other views follow; the centre and persons without own letters open their letters instead
function activateEgoPerson(person, focusTarget) {
    if (person.ring === 'centre' || !person.writesLetters) {
        showPersonLetters(person);
        return;
    }
    egoHistory.push({ filter: state.filters.person || null, name: egoDrawn?.model.centre.name || '' });
    egoFocusAfterRender = focusTarget;
    applyPersonFilter(person.id);
}

function showPersonLetters(person) {
    if (!egoDrawn) return;
    const { model, letters } = egoDrawn;
    if (person.ring === 'centre') {
        // The letter list under the person filter is the existing way to all letters of a person
        if (state.filters.person !== person.id) applyPersonFilter(person.id);
        switchView('letters');
        return;
    }
    if (person.ring === 'inner') {
        showTieLetters({ a: model.centre.id, b: person.id });
        return;
    }
    const centreId = model.centre.id;
    const found = letters.filter(l => letterParties(l).has(centreId) &&
        (l.mentions?.persons || []).some(m => personKey(m) === person.id));
    showLettersDialog(`${person.name} erwähnt in Briefen von und an ${model.centre.name}`, found);
}

// The letters exchanged between two persons
function showTieLetters(t) {
    if (!egoDrawn) return;
    const { letters, nameOf } = egoDrawn;
    const pair = new Set([t.a, t.b]);
    const found = letters.filter(l => {
        const from = personKey(l.sender);
        return pair.has(from) && letterRecipients(l).some(r => {
            const to = personKey(r);
            return to !== from && pair.has(to);
        });
    });
    showLettersDialog(`Briefe zwischen ${nameOf(t.a)} und ${nameOf(t.b)}`, found);
}

const DIALOG_LIMIT = 100;

/**
 * List of letters in the dialog form of the comparison and mentions views; a row opens the letter
 */
function showLettersDialog(title, found) {
    if (found.length === 0) return;
    // By date, letters without a date at the end
    const sorted = [...found].sort((x, y) => (!x.date - !y.date) || String(x.date || '').localeCompare(String(y.date || '')));
    document.getElementById('network-letters-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'network-letters-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'network-letters-modal-title');
    const rows = sorted.slice(0, DIALOG_LIMIT).map(letter => {
        const recipients = letterRecipients(letter).map(r => r?.name).filter(Boolean).join('; ') || 'Unbekannt';
        const place = letter.place_sent?.name || '';
        return `<div class="common-letter-item" role="button" tabindex="0" data-letter-id="${escapeHtml(letter.id)}">
                <span class="common-letter-date">${formatDateWithPrecision(letter)}</span>
                <span class="common-letter-sender">${escapeHtml(letter.sender?.name || 'Unbekannt')}</span>
                <i class="fas fa-arrow-right" aria-hidden="true"></i>
                <span class="common-letter-recipient">${escapeHtml(recipients)}</span>
                ${place ? `<span class="common-letter-place">(${escapeHtml(place)})</span>` : ''}
            </div>`;
    }).join('');
    const more = sorted.length > DIALOG_LIMIT
        ? `<div class="common-letters-more">Die ersten ${DIALOG_LIMIT} von ${formatNumber(sorted.length)} Briefen.</div>`
        : '';
    modal.innerHTML = `<div class="modal-content modal-lg">
            <div class="modal-header">
                <h3 id="network-letters-modal-title">${escapeHtml(title)} (${formatNumber(sorted.length)})</h3>
                <button class="modal-close" aria-label="Schließen">&times;</button>
            </div>
            <div class="modal-body"><div class="common-letters-list">${rows}${more}</div></div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
        const item = event.target.closest('[data-letter-id]');
        if (!item) return;
        closeModal(modal);
        showLetterDetail(item.dataset.letterId);
    });
    openModal(modal);
}
