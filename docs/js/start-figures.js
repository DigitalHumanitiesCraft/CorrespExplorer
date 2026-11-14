// The figure of the start page: a dashboard of the explorer's own visualisations in small, laid
// out as the data model the explorer reads. Three bands (the core of CMIF, the extensions an
// edition adds in CMIF, the statements of TEI letter records) hold the statements; each statement
// is a small real aggregate of the chosen dataset in the idiom of its view, with a label line that
// opens that view. In the middle one example letter, drawn as three sheets of one envelope; its
// own marks stand in rust in every aggregate, joined to its lines by fine curves. A click on a mark
// that narrows to letters makes one of them the example letter. A statement the dataset lacks
// stays in its place, empty and named. Every number comes from summarizeLetters()
// (start-summary.js) or from data/examples.json, its port for the Hugo Schuchardt Archiv.

import { computeLanguageColors, languageLabel, NO_LANGUAGE } from './constants.js';
import { loadDemoDataset, parseCMIFFiles } from './cmif-parser.js';
import { formatSingleDate } from './formatters.js';
import { summarizeLetters, recordOf, STATEMENTS } from './start-summary.js';
import { prefersReducedMotion, httpErrorMessage, personKey, letterRecipients, placeKey } from './utils.js';
import { loadLand, mapFrame, frameProjection, landPath, smallGeometry } from './mini-figures.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SUMMARY_URL = 'data/examples.json';
// The key names three languages; the rest share the grey of "übrige Sprachen" as in the explorer
const NAMED_LANGUAGES = 3;
// One mark per letter in the year figure while a letter keeps at least this height in pixels
const UNIT_MIN = 3;
const AXIS_ROOM = 16;
// Time of the rust marks moving to the letter's new places (none under reduced motion)
const MOVE_MS = 320;

const format = n => n.toLocaleString('de-DE');

// The circle layout of the explorer's network view is reused, not rebuilt: egoGeometry() and
// egoLayout() are pure. The module comes in lazily, so a failure there leaves the circle empty
// and the rest of the figure standing
let egoModule = null;
const loadEgoModule = () => {
    if (!egoModule) egoModule = import('./views/network-view.js').catch(error => {
        console.error('Correspondence circle unavailable:', error);
        return null;
    });
    return egoModule;
};

const DATASETS = {
    demo: {
        name: 'Tutorial',
        load: async () => {
            const letters = (await loadDemoDataset()).letters;
            return { summary: summarizeLetters(letters), letters };
        },
        explore: params => `explore.html?demo=true&tour=0&${params}`
    },
    hsa: {
        name: 'Hugo Schuchardt Archiv',
        // The archive's letters stay off this page (17 MB); its summary and example letters come
        // prepared from preprocessing/build_examples.py
        load: async () => {
            const response = await fetch(SUMMARY_URL);
            if (!response.ok) throw new Error(httpErrorMessage(response.status, response.statusText));
            return { summary: (await response.json()).datasets['data/hsa-letters.json'], letters: null };
        },
        explore: params => `explore.html?json=data/hsa-letters.json&${params}`
    },
    local: {
        name: 'Stefan Zweig Digital',
        load: async onProgress => {
            const { texts, names } = await fetchListedFiles('data/local/files.json', onProgress);
            const letters = (await parseCMIFFiles(texts, null, names)).letters;
            return { summary: summarizeLetters(letters), letters };
        },
        explore: params => `index.html?files=data/local/files.json&${params}`
    }
};

const BANDS = [
    { key: 'core', label: 'Kern des CMIF', left: ['persons', 'place'], right: ['date', 'link'] },
    { key: 'extension', label: 'Erweiterungen im CMIF', left: ['mentionsPerson', 'mentionsPlace'], right: ['mentionsSubject', 'language'] },
    { key: 'record', label: 'TEI-Briefsätze', left: ['postmark', 'address'], right: ['signature', 'records', 'inferred'] }
];

// What the text alternative says the middle band is, as far as the knowledge base carries it
const EXTENSION_NOTE = 'Sprache und Erwähnungen stehen im CMIF als note/ref im correspDesc';

const ofLetters = (n, s) => `${format(n)} von ${format(s.letters)} Briefen`;

// Name, the view it opens, its one line of figures and the figure it draws
const STATEMENT_VIEWS = {
    persons: { name: 'Absender und Empfänger', view: 'network', action: 'Netzwerk', count: s => `${format(s.persons)} Personen`, draw: drawCircle },
    place: { name: 'Absendeort', view: 'map', action: 'Karte', count: s => (s.located?.length ? `${format(s.places)} Orte` : `${format(s.places)} Orte, keiner mit Koordinaten`), draw: drawPlaces('sent') },
    date: { name: 'Datum', view: 'timeline', action: 'Zeitleiste', count: s => `${format(s.dated)} datierte Briefe`, draw: drawYears, prepare: languageKeyFor('date') },
    link: { name: 'Link zur Edition', view: 'letters', action: 'Briefliste', count: s => (s.hosts?.length === 1 ? `${ofLetters(s.coverage.link, s)}, ${s.hosts[0][0]}` : ofLetters(s.coverage.link, s)) },
    language: { name: 'Sprache', view: 'timeline', action: 'Zeitleiste', count: s => `${format(Object.keys(s.languages).filter(c => c !== NO_LANGUAGE).length)} Sprachen`, draw: drawLanguages, prepare: languageKeyFor('language') },
    mentionsPerson: { name: 'Erwähnte Personen', view: 'mentions-flow', action: 'Erwähnungen', count: s => `${format(s.mentioned.persons.distinct)} Personen`, draw: drawRing, prepare: topNames },
    mentionsPlace: { name: 'Erwähnte Orte', view: 'letters', action: 'Briefliste', count: s => (s.mentionedLocated?.length ? `${format(s.mentioned.places.distinct)} Orte` : `${format(s.mentioned.places.distinct)} Orte, keiner mit Koordinaten`), draw: drawPlaces('mentioned'), prepare: unlocatedNames },
    mentionsSubject: { name: 'Themen', view: 'topics', action: 'Themen', count: s => `${format(s.mentioned.subjects.distinct)} Themen`, prepare: subjectRows },
    postmark: { name: 'Poststempel', view: 'letters', feat: 'postmark', action: 'Briefliste', count: s => ofLetters(s.coverage.postmark, s), draw: drawShare('postmark') },
    address: { name: 'Anschrift', view: 'letters', feat: 'address', action: 'Briefliste', count: s => ofLetters(s.coverage.address, s), draw: drawShare('address') },
    signature: { name: 'Signatur', view: 'letters', action: 'Briefliste', count: s => ofLetters(s.coverage.signature, s), draw: drawShare('signature') },
    records: { name: 'Mehrfach verzeichnet', view: 'letters', feat: 'records', action: 'Briefliste', count: s => ofLetters(s.coverage.records, s), draw: drawShare('records') },
    inferred: { name: 'Erschlossene Angaben', view: 'letters', action: 'Briefliste', count: s => ofLetters(s.coverage.inferred, s), draw: drawShare('inferred') }
};

const loaded = new Map();
let current = null;
let record = null;
let requestedLetter = null;
let options = {};
let model = null;
let status = null;
let textAlternative = null;
// Per drawn figure: draw(width, height) and mark(record); a resize redraws, a letter only marks
let figures = [];
let leaderTimer = null;

/**
 * Fetch every file a file list names: a JSON document {"files": ["a.xml", …]} with names relative
 * to the list. Shared by the figure and by upload.js, which opens the same edition.
 * @param {string} listPath
 * @param {function(number, number): void} [onProgress]
 * @returns {Promise<{texts: string[], names: string[]}>}
 */
export async function fetchListedFiles(listPath, onProgress = null) {
    const response = await fetch(listPath);
    if (!response.ok) throw new Error(httpErrorMessage(response.status, response.statusText));
    const list = await response.json();
    // A name may not leave the folder of the list
    const names = (Array.isArray(list?.files) ? list.files : []).filter(name => typeof name === 'string' && /^[\w\-.]+\.xml$/.test(name));
    if (names.length === 0) throw new Error('Die Dateiliste nennt keine XML-Dateien.');
    const base = listPath.slice(0, listPath.lastIndexOf('/') + 1);
    const texts = [];
    for (let i = 0; i < names.length; i++) {
        const fileResponse = await fetch(base + names[i]);
        texts.push(fileResponse.ok ? await fileResponse.text() : '');
        if (onProgress && (i % 10 === 0 || i === names.length - 1)) onProgress(i + 1, names.length);
    }
    return { texts, names };
}

/**
 * Build the figure and show the dataset the address names (?dataset=…&letter=…), else the
 * dataset whose choice is pressed. Unknown values fall back to the default without a message.
 * @param {{openOwn?: function(?string, ?string): void}} [settings] - opens one's own data in a view
 */
export function initStartFigure(settings = {}) {
    options = settings;
    model = document.getElementById('model');
    status = document.getElementById('model-status');
    textAlternative = document.getElementById('model-text');
    if (!model) return;
    document.querySelectorAll('.dataset-choice [data-choice]').forEach(bindChoice);
    new ResizeObserver(() => redrawAll()).observe(model);
    const params = new URLSearchParams(window.location.search);
    const asked = params.get('dataset');
    requestedLetter = params.get('letter');
    const pressed = document.querySelector('.dataset-choice [aria-pressed="true"]');
    // A dataset that cannot be read (the local edition on the published site) falls back silently
    const start = DATASETS[asked] ? asked : pressed?.dataset.choice || 'demo';
    choose(start, { fallback: start === 'demo' ? null : 'demo' });
}

/**
 * One's own data as a further choice of the figure, chosen and summarised in this browser
 * @param {Object} data - parser output
 * @param {string} name - what the choice says
 */
export function showOwnDataset(data, name) {
    DATASETS.own = { name, own: true, load: async () => ({ summary: summarizeLetters(data.letters), letters: data.letters }) };
    loaded.delete('own');
    let button = document.querySelector('.dataset-choice [data-choice="own"]');
    if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.dataset.choice = 'own';
        bindChoice(button);
        document.querySelector('.dataset-choice')?.append(button);
    }
    button.textContent = name;
    choose('own');
}

function bindChoice(button) {
    button.addEventListener('click', () => choose(button.dataset.choice));
}

async function choose(key, { fallback = null } = {}) {
    const dataset = DATASETS[key];
    if (!dataset) return;
    current = key;
    document.querySelectorAll('.dataset-choice [data-choice]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.choice === key));
    });
    // The open control of the chosen dataset only; upload.js handles what it does
    document.querySelectorAll('.figure-open[data-for]').forEach(card => {
        card.classList.toggle('hidden', card.dataset.for !== key);
    });
    let entry = loaded.get(key);
    if (!entry) {
        setStatus(key === 'local' ? 'Die Dateien der Edition werden gelesen.' : 'Der Bestand wird gelesen.');
        try {
            const [result] = await Promise.all([
                dataset.load((done, total) => {
                    if (current === key) setStatus(`Die Dateien der Edition werden gelesen, ${format(done)} von ${format(total)}.`);
                }),
                loadEgoModule()
            ]);
            entry = result;
            loaded.set(key, entry);
        } catch (error) {
            console.error('Start figure could not read its dataset:', error);
            if (current !== key) return;
            if (fallback) return choose(fallback);
            setStatus(`${dataset.name} ließ sich nicht lesen; der Bestand bleibt über „Im Explorer öffnen“ erreichbar.`);
            return;
        }
    }
    if (current !== key) return;
    setStatus('');
    render(entry, dataset);
    const asked = requestedLetter;
    requestedLetter = null;
    setRecord(findRecord(entry, asked) || entry.summary.examples?.[0] || null, { move: false });
}

// The record of a letter id: among the letters in this browser, else among the prepared examples
function findRecord(entry, id) {
    if (!id) return null;
    if (entry.letters) {
        const letter = entry.letters.find(l => l.id === id);
        return letter ? recordOf(letter, entry.summary) : null;
    }
    return entry.summary.examples?.find(r => r.id === id) || null;
}

function setStatus(text) {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('hidden', !text);
    model.classList.toggle('is-waiting', Boolean(text));
}

const carried = (summary, key) => (summary.coverage?.[key] || 0) > 0;

function render(entry, dataset) {
    const { summary } = entry;
    figures = [];
    const colors = languageSeries(summary.languages || {});
    const frame = mapFrame(summary.located?.length ? summary.located : summary.mentionedLocated || []);
    const context = { entry, summary, colors, frame, dataset };
    const parts = [];
    BANDS.forEach((band, row) => {
        const label = document.createElement('p');
        label.className = `band-label band-row-${row + 1}`;
        label.textContent = band.label;
        parts.push(label);
        ['left', 'right'].forEach(side => {
            const cell = document.createElement('div');
            cell.className = `band-side band-side--${side} band-side--${band.key} band-row-${row + 1}`;
            band[side].forEach(key => cell.append(statement(key, context)));
            parts.push(cell);
        });
    });
    parts.push(...sheets());
    const leaders = document.createElementNS(SVG_NS, 'svg');
    leaders.setAttribute('class', 'model-leaders');
    leaders.setAttribute('aria-hidden', 'true');
    parts.push(leaders);

    if (!prefersReducedMotion()) {
        model.classList.add('is-changing');
        requestAnimationFrame(() => requestAnimationFrame(() => model.classList.remove('is-changing')));
    }
    model.replaceChildren(...parts);
    model.dataset.dataset = current;
    // A middle band without any picture (plain CMIF, letter records) gives its height to the others
    const pictures = ['mentionsPerson', 'mentionsPlace', 'mentionsSubject'].some(key => carried(summary, key));
    model.classList.toggle('is-extension-sparse', !pictures);
    redrawAll();
}

function redrawAll() {
    figures.forEach(f => f.draw());
    if (record) figures.forEach(f => f.mark(record));
    drawLeaders();
}

/**
 * Make a record the example letter: refill the sheets, move the rust marks, note it in the address
 * @param {Object|null} next
 * @param {{move?: boolean}} [settings] - false right after a change of dataset
 */
function setRecord(next, { move = true } = {}) {
    record = next;
    const entry = loaded.get(current);
    fillSheets(next, entry?.summary);
    model.classList.toggle('is-moving', move && !prefersReducedMotion());
    figures.forEach(f => f.mark(next));
    textAlternative.textContent = describe(entry?.summary, DATASETS[current], next);
    // The leaders follow the marks once they have moved
    drawLeaders();
    clearTimeout(leaderTimer);
    leaderTimer = setTimeout(drawLeaders, move ? MOVE_MS + 40 : 0);
    if (!DATASETS[current]?.own) {
        const params = new URLSearchParams({ dataset: current });
        if (next?.id) params.set('letter', next.id);
        history.replaceState(history.state, '', `${window.location.pathname}?${params.toString()}`);
    }
}

// "anderer Brief": the next of the dataset's example letters
function stepLetter() {
    const examples = loaded.get(current)?.summary.examples || [];
    if (examples.length === 0) return;
    const at = examples.findIndex(r => r.id === record?.id);
    setRecord(examples[(at + 1) % examples.length]);
}

// The letter a mark narrows to: among the letters in this browser the one with most kinds of
// statements; for the archive the first prepared example that matches, or none
function pick(matches, prepared) {
    const entry = loaded.get(current);
    if (!entry) return null;
    // Searched on the click, so drawing a large dataset does not scan its letters once per mark
    if (entry.letters) {
        return () => {
            let best = null;
            let bestScore = -1;
            entry.letters.forEach(letter => {
                if (!matches(letter)) return;
                const score = STATEMENTS.filter(s => s.test(letter)).length;
                if (score > bestScore) { best = letter; bestScore = score; }
            });
            if (best) setRecord(recordOf(best, entry.summary));
        };
    }
    const example = (entry.summary.examples || []).find(prepared);
    return example ? () => setRecord(example) : null;
}

// One statement: its label line is the link into its view, its figure takes clicks on marks
function statement(key, context) {
    const { summary, dataset } = context;
    const spec = STATEMENT_VIEWS[key];
    const present = carried(summary, key);
    const element = document.createElement('div');
    element.className = `stmt stmt--${key}${present ? '' : ' is-absent'}`;
    const label = document.createElement(present ? (dataset.own ? 'button' : 'a') : 'p');
    label.className = 'stmt-label';
    const name = document.createElement('span');
    name.className = 'stmt-name';
    name.textContent = spec.name;
    const count = document.createElement('span');
    count.className = 'stmt-count';
    count.textContent = present ? spec.count(summary) : 'nicht im Bestand';
    label.append(name, count);
    element.append(label);
    if (!present) {
        const empty = document.createElement('span');
        empty.className = 'stmt-empty';
        element.append(empty);
        return element;
    }
    const params = new URLSearchParams({ view: spec.view });
    if (spec.feat) params.set('feat', spec.feat);
    label.setAttribute('aria-label', `${spec.name}, ${spec.count(summary)}: ${spec.action} von ${dataset.name} öffnen`);
    if (dataset.own) {
        label.type = 'button';
        label.addEventListener('click', () => options.openOwn?.(spec.view, spec.feat || null));
    } else {
        label.href = dataset.explore(params.toString());
    }
    if (key === 'link') count.dataset.anchor = 'link';
    let figure = null;
    if (spec.draw) {
        figure = document.createElement('div');
        figure.className = 'stmt-figure';
        figure.setAttribute('aria-hidden', 'true');
        element.append(figure);
    }
    spec.prepare?.(element, figure, context);
    if (spec.draw) addFigure(figure, spec.draw, context);
    return element;
}

// A figure: an SVG at the pixel size of its container (placed absolutely, so it never feeds back
// into that size), a layer of data marks redrawn on resize and a layer of the letter's marks
function addFigure(container, draw, context) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('focusable', 'false');
    const data = node('g', { class: 'figure-data' });
    const marks = node('g', { class: 'figure-marks' });
    svg.append(data, marks);
    container.append(svg);
    let placer = () => {};
    const figure = {
        draw() {
            const width = Math.floor(container.clientWidth);
            const height = Math.floor(container.clientHeight);
            if (width < 2 || height < 2) return;
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            placer = draw({ svg, data, marks, width, height, ...context }) || (() => {});
        },
        mark(next) {
            placer(next);
        }
    };
    figures.push(figure);
}

// A rust mark of the letter, positioned by transform so that a change of letter can move it
function letterMark(marks, shape, attributes, anchor) {
    const mark = node(shape, { ...attributes, class: `letter-mark ${attributes.class || ''}`.trim(), 'data-anchor': anchor });
    mark.style.display = 'none';
    marks.append(mark);
    return {
        at(x, y) {
            mark.style.display = '';
            mark.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            return mark;
        },
        hide() {
            mark.style.display = 'none';
        },
        element: mark
    };
}

function node(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        element.setAttribute(key, typeof value === 'number' ? value.toFixed(2) : value);
    });
    return element;
}

function title(element, text) {
    const t = document.createElementNS(SVG_NS, 'title');
    t.textContent = text;
    element.append(t);
}

// Marks that choose a letter answer the pointer; without a letter behind them they stay inert
function pickable(element, action) {
    if (!action) return;
    element.classList.add('is-pickable');
    element.addEventListener('click', action);
}

// The letter's partner as the explorer's ego network sees it: the other side of the centre
function partnerKey(letter, centreId) {
    const from = personKey(letter.sender);
    return from === centreId ? letterRecipients(letter).map(personKey).find(k => k && k !== centreId) : from;
}

// The model egoLayout() reads, from the summary's circle
function egoInput(ego) {
    return {
        centre: { id: 'c' },
        inner: ego.inner.map(([, letters, firstTime], i) => ({ id: `i${i}`, letters, first: firstTime })),
        outer: ego.outer.map(([, , , partners], i) => ({ id: `o${i}`, partners: partners.map(([j, n]) => [`i${j}`, n]) }))
    };
}

// Correspondents: the explorer's ego circle in small. Distance from the centre by letters, angle by
// the year the exchange begins, chords only between correspondents who write to each other
function drawCircle({ data, marks, width, height, summary, entry }) {
    const ego = summary.ego;
    data.replaceChildren();
    marks.replaceChildren();
    if (!ego) return null;
    const placeMarks = [];
    loadEgoModule().then(module => {
        if (!module || !data.isConnected) return;
        const g = smallGeometry(module, width, height, false);
        const { pos } = module.egoLayout({ ...egoInput(ego), outer: [] }, g);
        const items = [node('circle', { cx: g.cx, cy: g.cy, r: g.R, class: 'mini-rim' })];
        const maxChord = Math.max(1, ...ego.chords.map(c => c[2]));
        ego.chords.forEach(([a, b, n]) => {
            const p = pos.get(`i${a}`);
            const q = pos.get(`i${b}`);
            if (!p || !q) return;
            items.push(node('path', { d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${g.cx.toFixed(1)} ${g.cy.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`, class: 'mini-edge', 'stroke-width': 0.5 + 2 * Math.sqrt(n / maxChord) }));
        });
        const centreKey = summary.context?.centreId;
        const innerKeys = summary.context ? [...summary.context.inner.keys()] : null;
        // Weakest first, so the strong marks lie on top
        for (let i = ego.inner.length - 1; i >= 0; i--) {
            const p = pos.get(`i${i}`);
            const [name, letters] = ego.inner[i];
            const mark = node('circle', { cx: p.x, cy: p.y, r: Math.max(1.2, p.r * 0.75), class: 'mini-node' });
            title(mark, `${name}, ${format(letters)} Briefe`);
            const key = innerKeys?.[i];
            pickable(mark, pick(l => key && partnerKey(l, centreKey) === key, r => r.partner === i));
            items.push(mark);
        }
        const centre = node('circle', { cx: g.cx, cy: g.cy, r: 5, class: 'mini-node mini-node--centre' });
        title(centre, ego.centre);
        items.push(centre);
        data.replaceChildren(...items);
        placeMarks.push(pos);
        if (record) place(record);
        drawLeaders();
    });
    const partner = letterMark(marks, 'circle', { r: 5 }, 'persons');
    const mentionedHere = letterMark(marks, 'circle', { r: 6, class: 'letter-mark--hollow' }, 'mentionsPerson');
    const place = next => {
        const pos = placeMarks[0];
        if (!pos) return;
        const p = next?.partner !== null && next?.partner !== undefined ? pos.get(`i${next.partner}`) : null;
        if (p) partner.at(p.x, p.y); else partner.hide();
        const m = next?.mentionedInner !== null && next?.mentionedInner !== undefined ? pos.get(`i${next.mentionedInner}`) : null;
        if (m) mentionedHere.at(m.x, m.y); else mentionedHere.hide();
    };
    return place;
}

// Mentioned persons: the outer ring of the circle, a hollow mark for a person who never writes a
// letter in the dataset, a filled one for one who does; the three most named are listed beside
function drawRing({ data, marks, width, height, summary }) {
    const ego = summary.ego;
    data.replaceChildren();
    marks.replaceChildren();
    if (!ego || ego.outer.length === 0) return null;
    const ready = [];
    loadEgoModule().then(module => {
        if (!module || !data.isConnected) return;
        const g = smallGeometry(module, width, height, true);
        const { pos } = module.egoLayout(egoInput(ego), g);
        const items = [node('circle', { cx: g.cx, cy: g.cy, r: g.R, class: 'mini-rim' })];
        ego.outer.forEach(([name, mentions, writes], i) => {
            const p = pos.get(`o${i}`);
            if (!p) return;
            const mark = node('circle', { cx: p.x, cy: p.y, r: 2, class: writes ? 'mini-mention' : 'mini-mention mini-mention--hollow' });
            title(mark, `${name}, in ${format(mentions)} Briefen erwähnt`);
            items.push(mark);
        });
        data.replaceChildren(...items);
        ready.push(pos);
        if (record) place(record);
        drawLeaders();
    });
    const mark = letterMark(marks, 'circle', { r: 4.5, class: 'letter-mark--hollow' }, 'mentionsPerson');
    const place = next => {
        const pos = ready[0];
        const p = pos && next?.mentionedOuter !== null && next?.mentionedOuter !== undefined ? pos.get(`o${next.mentionedOuter}`) : null;
        if (p) mark.at(p.x, p.y); else mark.hide();
    };
    return place;
}

// Sending places, or mentioned places as hollow rings, on the country outlines. Both maps share
// one frame (around the sending places), so the pair shows where the letters come from and what
// they speak of in the same space
function drawPlaces(kind) {
    return ({ data, marks, width, height, summary, frame }) => {
        const list = kind === 'sent' ? summary.located || [] : summary.mentionedLocated || [];
        data.replaceChildren();
        marks.replaceChildren();
        if (!frame || list.length === 0) return null;
        const project = frameProjection(frame, width, height);
        const land = node('path', { class: 'mini-land' });
        const max = list[0][2];
        const keys = kind === 'sent' ? summary.context?.locatedKeys : null;
        const dots = [];
        for (let i = list.length - 1; i >= 0; i--) {
            const [lat, lon, count] = list[i];
            const [x, y] = project(lat, lon);
            const dot = node('circle', { cx: x, cy: y, r: 1.2 + 8 * Math.sqrt(count / max), class: kind === 'sent' ? 'mini-place' : 'mini-place mini-place--mentioned' });
            if (kind === 'sent') {
                const key = keys?.[i];
                pickable(dot, pick(l => key && placeKey(l.place_sent) === key, r => r.lat === lat && r.lon === lon));
            }
            dots.push(dot);
        }
        data.replaceChildren(land, ...dots);
        loadLand().then(features => {
            if (features && land.isConnected) land.setAttribute('d', landPath(features, frame, project));
        });
        const mark = letterMark(marks, 'circle', { r: 5, class: kind === 'sent' ? '' : 'letter-mark--hollow' }, kind === 'sent' ? 'place' : 'mentionsPlace');
        return next => {
            const lat = kind === 'sent' ? next?.lat : next?.mentionedLat;
            const lon = kind === 'sent' ? next?.lon : next?.mentionedLon;
            if (lat === null || lat === undefined || lon === null || lon === undefined) return mark.hide();
            const [x, y] = project(lat, lon);
            if (x < 0 || x > width || y < 0 || y > height) return mark.hide();
            mark.at(x, y);
        };
    };
}

// Letters per year in the language colours, the most frequent language at the bottom as in the
// timeline. While a letter keeps a few pixels of height, every letter is one mark (the unit chart
// of a small dataset); above that, the stacked profile. First and last year stand at the axis
function drawYears({ data, marks, width, height, summary, colors, entry }) {
    const perYear = summary.perYear || [];
    data.replaceChildren();
    marks.replaceChildren();
    if (perYear.length === 0) return null;
    const byYear = new Map(perYear);
    const years = summary.last - summary.first + 1;
    const band = width / years;
    const gap = band >= 4 ? 1 : 0;
    const plot = height - AXIS_ROOM;
    const totals = perYear.map(([, counts]) => Object.values(counts).reduce((a, b) => a + b, 0));
    const maxTotal = Math.max(...totals);
    const unit = plot / maxTotal;
    const units = unit >= UNIT_MIN;
    const items = [];
    const unitOf = new Map();
    const keyOf = code => seriesKey(colors, code);
    // In the unit chart each letter of this browser has its own mark, in the order of the stack
    const lettersByYear = new Map();
    if (units && entry.letters) {
        const order = new Map(colors.map((s, i) => [s.key, i]));
        entry.letters.forEach(letter => {
            if (!letter.year || !byYear.has(letter.year)) return;
            const list = lettersByYear.get(letter.year) || [];
            list.push(letter);
            lettersByYear.set(letter.year, list);
        });
        lettersByYear.forEach(list => list.sort((a, b) => order.get(keyOf(a.language?.code || NO_LANGUAGE)) - order.get(keyOf(b.language?.code || NO_LANGUAGE))));
    }
    for (let i = 0; i < years; i++) {
        const year = summary.first + i;
        const counts = byYear.get(year);
        if (!counts) continue;
        const stacked = {};
        Object.entries(counts).forEach(([code, n]) => {
            stacked[keyOf(code)] = (stacked[keyOf(code)] || 0) + n;
        });
        const x = i * band;
        const w = Math.max(band - gap, 0.5);
        let top = plot;
        if (units) {
            const list = lettersByYear.get(year);
            let k = 0;
            colors.forEach(({ key, color }) => {
                for (let n = 0; n < (stacked[key] || 0); n++) {
                    top -= unit;
                    const mark = node('rect', { x, y: top, width: w, height: Math.max(unit - 1, 1), fill: color });
                    const letter = list?.[k];
                    if (letter) {
                        unitOf.set(letter.id, { x: x + w / 2, y: top + unit / 2 });
                        pickable(mark, pick(l => l === letter, () => false));
                    }
                    items.push(mark);
                    k++;
                }
            });
        } else {
            colors.forEach(({ key, color }) => {
                const n = stacked[key];
                if (!n) return;
                const h = n * (plot / maxTotal);
                top -= h;
                // A line of paper between two segments, as in the explorer's timeline
                items.push(node('rect', { x, y: top, width: w, height: h - (h > 4 ? 1 : 0), fill: color }));
            });
            const hit = node('rect', { x, y: 0, width: band, height: plot, class: 'mini-hit' });
            pickable(hit, pick(l => l.year === year, r => r.year === year));
            if (hit.classList.contains('is-pickable')) items.push(hit);
        }
    }
    const label = (text, x, anchor) => {
        const t = node('text', { x, y: height - 3, class: 'mini-axis', 'text-anchor': anchor });
        t.textContent = text;
        return t;
    };
    items.push(node('line', { x1: 0, x2: width, y1: plot + 0.5, y2: plot + 0.5, class: 'mini-baseline' }), label(String(summary.first), 0, 'start'), label(String(summary.last), width, 'end'));
    data.replaceChildren(...items);
    const mark = units
        ? letterMark(marks, 'rect', { x: -Math.max(band - gap, 0.5) / 2 - 1, y: -unit / 2 - 1, width: Math.max(band - gap, 0.5) + 2, height: unit + 1 }, 'date')
        : letterMark(marks, 'path', { d: 'M0 0 l-5 7 h10 z' }, 'date');
    return next => {
        if (!next?.year || next.year < summary.first || next.year > summary.last) return mark.hide();
        const at = units ? unitOf.get(next.id) : null;
        if (units && at) return mark.at(at.x, at.y);
        mark.at(((next.year - summary.first) + 0.5) * band, plot + 1);
    };
}

// Languages as one bar of their shares; the letter's language underlined in rust
function drawLanguages({ data, marks, width, height, colors }) {
    const total = colors.reduce((sum, s) => sum + s.count, 0);
    const barHeight = Math.min(12, height - 5);
    let x = 0;
    const spans = new Map();
    data.replaceChildren(...colors.map(({ key, count, color }) => {
        const w = (count / total) * width;
        spans.set(key, [x, w]);
        const mark = node('rect', { x, y: 0, width: Math.max(w - 1, 0.5), height: barHeight, fill: color });
        x += w;
        return mark;
    }));
    marks.replaceChildren();
    const mark = letterMark(marks, 'rect', { x: 0, y: 0, width: 1, height: 3 }, 'language');
    return next => {
        if (!next?.language) return mark.hide();
        const span = spans.get(seriesKey(colors, next.language));
        if (!span) return mark.hide();
        mark.element.setAttribute('width', Math.max(span[1] - 1, 2).toFixed(1));
        mark.at(span[0], barHeight + 2);
    };
}

// Share of the letters that carry a statement, as a bar on a light track; a rust dot before it
// where the letter carries the statement
function drawShare(key) {
    return ({ data, marks, width, height, summary }) => {
        const share = (summary.coverage?.[key] || 0) / Math.max(summary.letters, 1);
        const y = Math.max(height / 2 - 3, 0);
        data.replaceChildren(
            node('rect', { x: 8, y, width: width - 8, height: 6, class: 'mini-track' }),
            node('rect', { x: 8, y, width: Math.max(share * (width - 8), 1), height: 6, class: 'mini-share' })
        );
        marks.replaceChildren();
        const mark = letterMark(marks, 'circle', { r: 3 }, key);
        const carriedBy = next => (key === 'records' ? next?.records > 1 : key === 'inferred' ? next?.placeInferred || next?.dateInferred : Boolean(next?.[key]));
        return next => (carriedBy(next) ? mark.at(3, y + 3) : mark.hide());
    };
}

// The three most frequent subjects (or two and the letter's own) as small year profiles on one
// scale, aligned with the year figure above them
function subjectRows(element, figure, context) {
    const { summary } = context;
    const rows = document.createElement('div');
    rows.className = 'subject-rows';
    rows.setAttribute('aria-hidden', 'true');
    const max = Math.max(1, ...(summary.subjects || []).flatMap(([, years]) => years.map(([, n]) => n)));
    const span = summary.last - summary.first + 1;
    (summary.subjects || []).forEach(([label, years], index) => {
        const row = document.createElement('div');
        row.className = 'subject-row';
        const name = document.createElement('span');
        name.className = 'subject-name';
        name.textContent = label;
        const area = document.createElement('div');
        area.className = 'subject-figure';
        row.append(name, area);
        rows.append(row);
        addFigure(area, ({ data, marks, width, height }) => {
            const band = width / span;
            const plot = height - 1;
            data.replaceChildren(
                node('line', { x1: 0, x2: width, y1: plot + 0.5, y2: plot + 0.5, class: 'mini-baseline' }),
                ...years.filter(([year]) => year >= summary.first && year <= summary.last).map(([year, n]) => {
                    const h = Math.max((n / max) * plot, 1);
                    return node('rect', { x: (year - summary.first) * band, y: plot - h, width: Math.max(band - (band >= 4 ? 1 : 0), 0.5), height: h, class: 'mini-subject' });
                })
            );
            marks.replaceChildren();
            const mark = letterMark(marks, 'rect', { x: -Math.max(band, 2) / 2, y: -plot, width: Math.max(band, 2), height: plot }, index === 0 ? 'mentionsSubject' : `mentionsSubject-${index}`);
            mark.element.classList.add('letter-mark--column');
            return next => {
                if (next?.subject !== index || !next.year) return mark.hide();
                const el = mark.at((next.year - summary.first + 0.5) * band, plot);
                el.dataset.anchor = 'mentionsSubject';
            };
        }, context);
    });
    element.append(rows);
}

// Mentioned places without coordinates (the tutorial, many editions) cannot stand on the map; their
// three most frequent names stand in the place of the map instead
function unlocatedNames(element, figure, context) {
    if (context.summary.mentionedLocated?.length) return;
    figure.classList.add('hidden');
    const list = document.createElement('span');
    list.className = 'stmt-list';
    (context.summary.mentioned?.places?.top || []).forEach(([name]) => {
        const item = document.createElement('span');
        item.textContent = name;
        list.append(item);
    });
    figure.after(list);
}

// The names of the most frequent mentioned persons beneath their ring
function topNames(element, figure, context) {
    const top = context.summary.mentioned?.persons?.top || [];
    const list = document.createElement('span');
    list.className = 'stmt-list';
    top.forEach(([name]) => {
        const item = document.createElement('span');
        item.textContent = name;
        list.append(item);
    });
    figure.after(list);
}

// The key of the language colours, stated once: under the year figure, or under the language bar
// where a dataset has no dates
function languageKeyFor(owner) {
    return (element, figure, context) => {
        const { summary, colors } = context;
        const owns = owner === 'date' || !carried(summary, 'date');
        if (!owns || !carried(summary, 'language')) return;
        const key = document.createElement('span');
        key.className = 'stmt-key';
        colors.forEach(({ label, color }) => {
            const item = document.createElement('span');
            const swatch = document.createElement('span');
            swatch.className = 'record-swatch';
            swatch.style.backgroundColor = color;
            item.append(swatch, document.createTextNode(label));
            key.append(item);
        });
        element.append(key);
    };
}

// The explorer's own rule assigns the colours (computeLanguageColors), fed with one stand-in letter
// per counted letter, so a language has the same colour here and in the explorer
function languageSeries(languages) {
    const standIns = Object.entries(languages)
        .filter(([code]) => code !== NO_LANGUAGE)
        .flatMap(([code, count]) => Array.from({ length: count }, () => ({ language: { code } })));
    const palette = { ...computeLanguageColors(standIns) };
    const ranked = Object.keys(languages)
        .filter(code => code !== NO_LANGUAGE && palette[code])
        .sort((a, b) => languages[b] - languages[a] || (a < b ? -1 : 1))
        .slice(0, NAMED_LANGUAGES);
    const series = ranked.map(code => ({ key: code, label: languageLabel(code), color: palette[code], count: languages[code] }));
    const rest = Object.entries(languages)
        .filter(([code]) => code !== NO_LANGUAGE && !ranked.includes(code))
        .reduce((sum, [, n]) => sum + n, 0);
    if (rest > 0) series.push({ key: 'other', label: 'übrige Sprachen', color: palette.other, count: rest });
    if (languages[NO_LANGUAGE]) series.push({ key: NO_LANGUAGE, label: 'ohne Angabe', color: palette[NO_LANGUAGE], count: languages[NO_LANGUAGE] });
    return series;
}

const seriesKey = (series, code) => (series.some(s => s.key === code) ? code : code === NO_LANGUAGE ? NO_LANGUAGE : 'other');

// The letter as three sheets drawn out of one envelope, one per band and as tall as its lines
function sheets() {
    return BANDS.map((band, row) => {
        const sheet = document.createElement('div');
        sheet.className = `record-sheet record-sheet--${band.key} band-row-${row + 1}`;
        if (row === 0) {
            const flap = node('svg', { class: 'record-flap', viewBox: '0 0 100 20', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
            flap.append(node('path', { d: 'M0 0 L50 18 L100 0', 'vector-effect': 'non-scaling-stroke' }));
            sheet.append(flap);
        }
        const lines = document.createElement('div');
        lines.className = 'record-lines';
        sheet.append(lines);
        if (row === 0) {
            const other = document.createElement('button');
            other.type = 'button';
            other.className = 'record-other';
            other.textContent = 'anderer Brief';
            other.setAttribute('aria-label', 'Anderen Beispielbrief zeigen');
            other.addEventListener('click', stepLetter);
            sheet.append(other);
        }
        return sheet;
    });
}

function fillSheets(r, summary) {
    const colors = languageSeries(summary?.languages || {});
    const bracket = (value, inferred) => (inferred ? `[${value}]` : value);
    const when = r?.date ? formatSingleDate(r.date) : r?.dateText;
    const language = r?.language ? (languageLabel(r.language) === r.language && r.languageLabel ? r.languageLabel : languageLabel(r.language)) : null;
    const languageColor = r?.language ? colors.find(c => c.key === seriesKey(colors, r.language))?.color : null;
    const lines = {
        core: [
            r?.sender && ['persons', r.sender, 'record-sender'],
            r?.recipient && ['', `an ${r.recipient}`],
            r?.place && ['place', bracket(r.place, r.placeInferred)],
            when && ['date', bracket(when, r.dateInferred)],
            r?.url ? ['link', r.url, 'record-link'] : ['', 'ohne Link zur Edition', 'record-absent']
        ],
        extension: [
            language && ['language', language, '', languageColor],
            r?.mentionsPerson && ['mentionsPerson', `erwähnt ${r.mentionsPerson}`],
            r?.mentionsPlace && ['mentionsPlace', `erwähnt ${r.mentionsPlace}`],
            r?.mentionsSubject && ['mentionsSubject', `Thema ${r.mentionsSubject}`]
        ],
        record: [
            r?.postmark && ['postmark', `Poststempel ${r.postmark}`],
            r?.address && ['address', `Anschrift ${r.address}`],
            r?.signature && ['signature', `Signatur ${r.signature}`],
            r?.records > 1 && ['records', `${r.records} Einträge in der Quelle`]
        ]
    };
    BANDS.forEach(band => {
        const box = model.querySelector(`.record-sheet--${band.key} .record-lines`);
        if (!box) return;
        const present = lines[band.key].filter(Boolean);
        if (present.length === 0) present.push(['', 'keine Angaben dieser Art', 'record-absent']);
        box.replaceChildren(...present.map(([anchor, text, cls = '', swatch]) => {
            const line = document.createElement(cls === 'record-link' ? 'a' : 'p');
            line.className = `record-line ${cls}`.trim();
            if (anchor) line.dataset.line = anchor;
            if (cls === 'record-link') {
                line.href = text;
                line.target = '_blank';
                line.rel = 'noopener noreferrer';
                line.textContent = text.replace(/^https?:\/\//, '');
            } else if (swatch) {
                const mark = document.createElement('span');
                mark.className = 'record-swatch';
                mark.style.backgroundColor = swatch;
                line.append(mark, document.createTextNode(text));
            } else {
                line.textContent = text;
            }
            return line;
        }));
    });
}

// Text alternative: the model with what the chosen dataset carries of it, and the example letter
function describe(summary, dataset, r) {
    if (!summary || !dataset) return '';
    const parts = BANDS.map(band => {
        const items = [...band.left, ...band.right].map(key => {
            const spec = STATEMENT_VIEWS[key];
            return carried(summary, key)
                ? `${spec.name} in ${format(summary.coverage[key])} von ${format(summary.letters)} Briefen`
                : `${spec.name} nicht im Bestand`;
        });
        const note = band.key === 'extension' ? ` (${EXTENSION_NOTE})` : '';
        return `${band.label}${note}: ${items.join('; ')}.`;
    });
    const letter = r ? ` Beispielbrief: ${[r.sender, r.recipient && `an ${r.recipient}`, r.place, r.date].filter(Boolean).join(', ')}.` : '';
    return `${dataset.name}, ${format(summary.letters)} Briefe. ${parts.join(' ')}${letter}`;
}

// Fine rust curves from each line of the letter to its mark in the figures. In one column (narrow
// screens) the sheets stand above the bands and the curves are left out; the marks stay
function drawLeaders() {
    const svg = model?.querySelector('.model-leaders');
    if (!svg) return;
    const box = model.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    if (getComputedStyle(model).getPropertyValue('--leaders').trim() === 'none') {
        svg.replaceChildren();
        return;
    }
    const paths = [];
    model.querySelectorAll('.record-line[data-line]').forEach(line => {
        const target = [...model.querySelectorAll(`[data-anchor="${line.dataset.line}"]`)].find(el => el.style.display !== 'none' && el.getClientRects().length);
        if (!target) return;
        const sheet = line.closest('.record-sheet').getBoundingClientRect();
        const l = line.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        const tx = t.left + t.width / 2 - box.left;
        const ty = t.top + t.height / 2 - box.top;
        const right = tx > sheet.right - box.left;
        const sx = (right ? sheet.right : sheet.left) - box.left;
        const sy = l.top + l.height / 2 - box.top;
        const bend = (tx - sx) * 0.5;
        paths.push(node('path', { d: `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx + bend).toFixed(1)} ${sy.toFixed(1)} ${(tx - bend).toFixed(1)} ${ty.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`, class: 'leader' }));
    });
    svg.replaceChildren(...paths);
}
