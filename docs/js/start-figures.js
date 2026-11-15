// The figure of the start page: a dashboard of the explorer's own visualisations in small, composed
// from what the chosen dataset holds (start-compose.js). The bands of the data model (the core of
// CMIF, the extensions an edition adds in CMIF, what TEI letter records add) give the order; a
// statement the data do not hold takes no place, and what the holding lacks stands in one sentence.
// At the left one example letter as sheets of one envelope, one per band; each of its lines and
// the mark of that line in a figure share a numbered tag in the selection colour, and pointing at
// either brings both forward. A click on a mark that narrows to letters makes one of them the
// example letter, and the marks move. Every number comes from summarizeLetters()
// (start-summary.js) or from data/examples.json, its port for the Hugo Schuchardt Archiv.

import { computeLanguageColors, languageLabel, NO_LANGUAGE } from './constants.js';
import { parseCMIFFiles } from './cmif-parser.js';
import { formatSingleDate, formatNumber as format, plural } from './formatters.js';
import { summarizeLetters, recordOf, STATEMENTS, letterTime } from './start-summary.js';
import { composeFigure } from './start-compose.js';
import { prefersReducedMotion, httpErrorMessage, personKey, letterRecipients, placeKey } from './utils.js';
import { loadLand, mapFrame, frameProjection, landPath, smallGeometry } from './mini-figures.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SUMMARY_URL = 'data/examples.json';
// The key names three languages; the rest share the grey of "übrige Sprachen" as in the explorer
const NAMED_LANGUAGES = 3;
const AXIS_ROOM = 16;
// Room at the left of a list figure for the mark of the letter, so it never covers a name
const INSET = 26;
// A year above this multiple of the 90th percentile of the yearly counts is cut, its count written
// at the cut, so one dominant year does not flatten all others (the scale stays linear)
const CLIP_FACTOR = 1.6;
// Height a subject profile needs to be read; fewer profiles stand where the band is lower
const SUBJECT_ROW = 46;


// Modules of the explorer whose pure parts are reused: the circle layout of the network view and
// the side of a letter on the time axis. They come in lazily, so a failure there leaves one
// figure empty and the rest standing
const lazy = path => {
    let promise = null;
    return () => {
        if (!promise) promise = import(path).catch(error => {
            console.error(`Start figure: ${path} unavailable:`, error);
            return null;
        });
        return promise;
    };
};
const loadEgoModule = lazy('./views/network-view.js');
const loadTimeModule = lazy('./views/timeline-view.js');

const DATASETS = {
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

// The three parts of the model. They name the groups in the text alternative and, on hover and
// focus, the sheets of the letter; the page itself carries no band headings
const BAND_LABELS = { core: 'Kern des CMIF', extension: 'Erweiterungen im CMIF', record: 'TEI-Briefsätze' };
const SHEET_CAPTIONS = { core: 'Was jedes CMIF enthält', extension: 'Was die Edition im CMIF ergänzt', record: 'Was ein TEI-Briefsatz ergänzt' };
// Share of the height each band takes, and of the width each figure takes in its band
const BAND_WEIGHT = { core: 1.25, extension: 1, record: 0.85 };
const FIGURE_WEIGHT = { circle: 1, map: 1.15, ranking: 0.8, letters: 2, profile: 2, ring: 1, profiles: 1.6, bar: 1, years: 1.6, histogram: 1, shares: 1.3 };

// What the text alternative says the middle band is, as far as the knowledge base carries it
const EXTENSION_NOTE = 'Sprache und Erwähnungen stehen im CMIF als note/ref im correspDesc';

const languageCount = s => Object.keys(s.languages || {}).filter(c => c !== NO_LANGUAGE).length;

// Name, the view its title opens (with the target named on hover and focus), its count and its
// drawing per figure kind
const STATEMENT_VIEWS = {
    persons: { name: 'Absender und Empfänger', view: 'network', action: 'Netzwerk', count: s => `${format(s.persons)} Personen` },
    place: { name: 'Absendeorte', view: 'map', action: 'Karte', count: s => `${format(s.places)} Orte` },
    date: { name: 'Datum', view: 'timeline', action: 'Zeitleiste', count: s => `${format(s.dated)} datierte Briefe` },
    language: { name: 'Sprache', view: 'timeline', action: 'Zeitleiste', count: s => `${format(languageCount(s))} Sprachen` },
    mentionsPerson: { name: 'Erwähnte Personen', view: 'mentions-flow', action: 'Erwähnungen', count: s => `${format(s.mentioned.persons.distinct)} Personen` },
    mentionsPlace: { name: 'Erwähnte Orte', view: 'letters', action: 'Briefliste', count: s => `${format(s.mentioned.places.distinct)} Orte` },
    mentionsSubject: { name: 'Themen', view: 'topics', action: 'Themen', count: s => `${format(s.mentioned.subjects.distinct)} Themen` },
    postmark: { name: 'Poststempel', view: 'letters', feat: 'postmark', action: 'Briefliste', count: s => `${format(s.coverage.postmark)} Briefe` },
    records: { name: 'Einträge je Brief', view: 'letters', feat: 'records', action: 'Briefliste', count: s => (s.recordsDiffer ? `${format(s.recordsDiffer)} mit abweichenden Einträgen` : '') },
    features: { name: 'Merkmale der Überlieferung', view: 'letters', action: 'Briefliste', count: () => '' }
};

const FEATURE_NAMES = { postmark: 'Poststempel', address: 'Anschrift', signature: 'Signatur', records: 'Mehrfach verzeichnet', inferred: 'Erschlossene Angaben' };

const DRAWERS = {
    circle: drawCircle,
    map: (context, key) => drawPlaces(key === 'place' ? 'sent' : 'mentioned')(context),
    ranking: drawRanking,
    letters: drawLetters,
    profile: drawProfile,
    ring: drawRing,
    profiles: drawSubjects,
    bar: drawLanguages,
    years: drawPostmarks,
    histogram: drawRecords,
    shares: drawShares
};

const loaded = new Map();
let current = null;
let record = null;
let requestedLetter = null;
let options = {};
let model = null;
let status = null;
let textAlternative = null;
// Per drawn figure: draw() and mark(record); a resize redraws, a letter only marks
let figures = [];
let traced = null;

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
    // Pointing at a line of the letter or at its mark brings both forward
    ['pointerover', 'focusin'].forEach(type => model.addEventListener(type, event => trace(traceKey(event.target))));
    ['pointerleave', 'focusout'].forEach(type => model.addEventListener(type, () => trace(null)));
    const params = new URLSearchParams(window.location.search);
    const asked = params.get('dataset');
    requestedLetter = params.get('letter');
    // The Hugo Schuchardt Archiv is the default; an unknown holding in the address (the former
    // tutorial among them) and one that cannot be read (the local edition on the published site)
    // fall back to it silently
    const start = DATASETS[asked] && asked !== 'own' ? asked : 'hsa';
    choose(start, { fallback: start === 'hsa' ? null : 'hsa' });
}

/**
 * One's own data as a further choice of the figure, chosen and summarised in this browser
 * @param {Object} data - parser output
 * @param {string} name - what the choice says
 */
export function showOwnDataset(data, name) {
    DATASETS.own = { name, own: true, load: async () => ({ summary: summarizeLetters(data.letters), letters: data.letters }) };
    loaded.delete('own');
    const button = document.querySelector('.dataset-choice [data-choice="own"]');
    if (button) button.textContent = name;
    showOwnPanel(false);
    choose('own');
}

// "Eigene Daten" without loaded data opens the file choice, the drop target and the address field
// in place of the figure; with loaded data it chooses them, and a second press opens the panel
// again for other data
function bindChoice(button) {
    button.addEventListener('click', () => {
        const key = button.dataset.choice;
        if (key === 'own' && (!DATASETS.own || current === 'own')) {
            const panel = document.getElementById('own-data-panel');
            showOwnPanel(panel?.classList.contains('hidden'));
            return;
        }
        showOwnPanel(false);
        choose(key);
    });
}

function showOwnPanel(open) {
    const panel = document.getElementById('own-data-panel');
    const button = document.querySelector('.dataset-choice [data-choice="own"]');
    if (!panel) return;
    panel.classList.toggle('hidden', !open);
    button?.setAttribute('aria-expanded', String(Boolean(open)));
    // While the panel is open no holding is chosen, so the way into the explorer steps back
    document.querySelector('.figure-bar')?.classList.toggle('is-loading-own', Boolean(open));
    if (open) {
        document.querySelectorAll('.dataset-choice [data-choice]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        panel.querySelector('.upload-btn')?.focus?.();
    } else if (current) {
        document.querySelectorAll('.dataset-choice [data-choice]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.choice === current)));
    }
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
                loadEgoModule(),
                loadTimeModule()
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

function render(entry, dataset) {
    const { summary } = entry;
    figures = [];
    const composition = composeFigure(summary, { lettersInBrowser: Boolean(entry.letters) });
    const colors = languageSeries(summary.languages || {});
    const frame = mapFrame(summary.located?.length ? summary.located : summary.mentionedLocated || []);
    const context = { entry, summary, colors, frame, dataset, composition };
    const parts = [];
    composition.bands.forEach((band, row) => {
        const element = document.createElement('section');
        element.className = `band band--${band.key}`;
        element.style.gridRow = String(row + 1);
        element.setAttribute('aria-label', BAND_LABELS[band.key]);
        const row1 = document.createElement('div');
        row1.className = 'band-figures';
        // Widths from the figures this dataset gets, so freed space goes to what is there
        row1.style.gridTemplateColumns = band.items.map(item => `minmax(0, ${FIGURE_WEIGHT[item.figure]}fr)`).join(' ');
        band.items.forEach(item => row1.append(statement(item, context)));
        element.append(row1);
        // The sheet first, so in one column (narrow screens) each band follows its part of the letter
        parts.push(sheet(band.key, row, composition), element);
    });
    // Heights from the bands this dataset fills
    model.style.gridTemplateRows = composition.bands.map(b => `minmax(0, ${BAND_WEIGHT[b.key]}fr)`).join(' ');
    model.dataset.bands = composition.bands.map(b => b.key).join(' ');

    if (!prefersReducedMotion()) {
        model.classList.add('is-changing');
        requestAnimationFrame(() => requestAnimationFrame(() => model.classList.remove('is-changing')));
    }
    model.replaceChildren(...parts);
    model.dataset.dataset = current;
    const hint = model.querySelector('.record-hint');
    if (hint) {
        // Two sentences for the two things a first reader asked: what the numbers are, and that the
        // figures themselves choose letters (fresh-reader rounds of 2026-11-14)
        hint.textContent = `Die Nummern zeigen diesen Brief in den Grafiken. ${entry.letters
            ? 'Ein Klick auf einen Punkt wählt einen anderen.'
            : 'Ein Klick auf einen umrandeten Punkt wählt einen anderen.'}`;
    }
    redrawAll();
}

function redrawAll() {
    figures.forEach(f => f.draw());
    if (record) figures.forEach(f => f.mark(record));
    applyTags();
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
    applyTags();
    textAlternative.textContent = describe(entry?.summary, DATASETS[current], next);
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

// One statement: its title is the link into its view (an arrow, the target named on hover and
// focus), its figure takes clicks on marks
function statement(item, context) {
    const { summary, dataset } = context;
    const spec = STATEMENT_VIEWS[item.key];
    const element = document.createElement('div');
    element.className = `stmt stmt--${item.key} stmt--${item.figure}`;
    const label = document.createElement(dataset.own ? 'button' : 'a');
    label.className = 'stmt-label';
    const name = document.createElement('span');
    name.className = 'stmt-name';
    name.textContent = spec.name;
    label.append(name);
    const count = spec.count(summary);
    if (count) {
        const number = document.createElement('span');
        number.className = 'stmt-count';
        number.textContent = count;
        label.append(number);
    }
    label.dataset.target = `${spec.action} öffnen`;
    label.setAttribute('aria-label', `${spec.name}${count ? `, ${count}` : ''}: ${spec.action} von ${dataset.name} öffnen`);
    const params = new URLSearchParams({ view: spec.view });
    if (spec.feat) params.set('feat', spec.feat);
    if (dataset.own) {
        label.type = 'button';
        label.addEventListener('click', () => options.openOwn?.(spec.view, spec.feat || null));
    } else {
        label.href = dataset.explore(params.toString());
    }
    const figure = document.createElement('div');
    figure.className = 'stmt-figure';
    figure.setAttribute('aria-hidden', 'true');
    element.append(label, figure);
    const draw = DRAWERS[item.figure];
    addFigure(figure, figureContext => draw(figureContext, item.key, item), context);
    // The key of the language colours stands once, under the figure the colours appear in
    if ((item.key === 'date' || item.figure === 'bar') && context.colors.length > 1) element.append(languageKey(context.colors));
    return element;
}

function languageKey(colors) {
    const key = document.createElement('p');
    key.className = 'stmt-key';
    colors.forEach(({ label, color }) => {
        const item = document.createElement('span');
        const swatch = document.createElement('span');
        swatch.className = 'record-swatch';
        swatch.style.backgroundColor = color;
        item.append(swatch, document.createTextNode(label));
        key.append(item);
    });
    return key;
}

// A figure: an SVG at the pixel size of its container (placed absolutely, so it never feeds back
// into that size), a clipped layer of data and an unclipped layer of the letter's marks
let clipCount = 0;
function addFigure(container, draw, context) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('focusable', 'false');
    const clipId = `start-clip-${++clipCount}`;
    const clip = node('clipPath', { id: clipId });
    const clipRect = node('rect', { x: 0, y: 0, width: 1, height: 1 });
    clip.append(clipRect);
    const data = node('g', { class: 'figure-data', 'clip-path': `url(#${clipId})` });
    const marks = node('g', { class: 'figure-marks' });
    svg.append(clip, data, marks);
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
            clipRect.setAttribute('width', width);
            clipRect.setAttribute('height', height);
            placer = draw({ svg, data, marks, width, height, ...context }) || (() => {});
        },
        mark(next) {
            placer(next);
        }
    };
    figures.push(figure);
}

// The mark of the letter in a figure: a ring with a halo of paper and a dot, in the selection
// colour, positioned by transform so a change of letter can move it; its tag carries the number
// of its line in the letter
function letterMark(marks, anchor) {
    const group = node('g', { class: 'letter-mark', 'data-anchor': anchor });
    group.append(
        node('circle', { r: 9, class: 'letter-mark__halo' }),
        node('circle', { r: 9, class: 'letter-mark__ring' }),
        node('circle', { r: 3, class: 'letter-mark__dot' })
    );
    const tag = node('g', { class: 'letter-tag', transform: 'translate(11 -11)' });
    tag.append(node('circle', { r: 8 }), node('text', { 'text-anchor': 'middle', y: 4 }));
    group.append(tag);
    group.style.display = 'none';
    marks.append(group);
    return {
        at(x, y) {
            group.style.display = '';
            group.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            // At the left edge of a list the tag stands before the mark, clear of the names; elsewhere
            // above right, turning inwards near the right and top edge so it stays in the figure
            const width = Number(marks.ownerSVGElement?.getAttribute('width')) || Infinity;
            tag.setAttribute('transform', x < 24 ? 'translate(-17 0)' : `translate(${x > width - 24 ? -11 : 11} ${y < 22 ? 11 : -11})`);
            return group;
        },
        hide() {
            group.style.display = 'none';
        }
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
function pickable(element, action, { outline = false } = {}) {
    if (!action) return;
    element.classList.add('is-pickable');
    if (outline) element.classList.add('is-pickable--outlined');
    element.addEventListener('click', action);
}

// The archive offers few letters, so its choosable marks carry a ring; in a dataset whose letters
// are in this browser every mark is choosable and none needs one
const outlined = context => !context.entry.letters;

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
// the year the exchange begins, chords only between correspondents who write to each other; the
// names stand on hover
function drawCircle(context) {
    const { data, marks, width, height, summary } = context;
    const ego = summary.ego;
    data.replaceChildren();
    marks.replaceChildren();
    if (!ego) return null;
    const ready = [];
    const partner = letterMark(marks, 'persons');
    const mentionedHere = letterMark(marks, 'mentionsPerson');
    const place = next => {
        const pos = ready[0];
        if (!pos) return;
        const p = next?.partner !== null && next?.partner !== undefined ? pos.get(`i${next.partner}`) : null;
        if (p) partner.at(p.x, p.y); else partner.hide();
        const m = next?.mentionedInner !== null && next?.mentionedInner !== undefined ? pos.get(`i${next.mentionedInner}`) : null;
        if (m) mentionedHere.at(m.x, m.y); else mentionedHere.hide();
    };
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
            const mark = node('circle', { cx: p.x, cy: p.y, r: Math.max(1.4, p.r * 0.75), class: 'mini-node' });
            title(mark, `${name}, ${plural(letters, 'Brief', 'Briefe')}`);
            const key = innerKeys?.[i];
            pickable(mark, pick(l => key && partnerKey(l, centreKey) === key, r => r.partner === i), { outline: outlined(context) });
            items.push(mark);
        }
        const centre = node('circle', { cx: g.cx, cy: g.cy, r: 5, class: 'mini-node mini-node--centre' });
        title(centre, ego.centre);
        items.push(centre);
        data.replaceChildren(...items);
        ready.push(pos);
        if (record) place(record);
        applyTags();
    });
    return place;
}

// Mentioned persons: the outer ring of the circle, a hollow mark for a person who never writes a
// letter in the dataset, a filled one for one who does; names on hover
function drawRing({ data, marks, width, height, summary }) {
    const ego = summary.ego;
    data.replaceChildren();
    marks.replaceChildren();
    if (!ego || ego.outer.length === 0) return null;
    const ready = [];
    const mark = letterMark(marks, 'mentionsPerson');
    const place = next => {
        const pos = ready[0];
        const p = pos && next?.mentionedOuter !== null && next?.mentionedOuter !== undefined ? pos.get(`o${next.mentionedOuter}`) : null;
        if (p) mark.at(p.x, p.y); else mark.hide();
    };
    loadEgoModule().then(module => {
        if (!module || !data.isConnected) return;
        const g = smallGeometry(module, width, height, true);
        const { pos } = module.egoLayout(egoInput(ego), g);
        const items = [node('circle', { cx: g.cx, cy: g.cy, r: g.R, class: 'mini-rim' })];
        ego.outer.forEach(([name, mentions, writes], i) => {
            const p = pos.get(`o${i}`);
            if (!p) return;
            const dot = node('circle', { cx: p.x, cy: p.y, r: 2.2, class: writes ? 'mini-mention' : 'mini-mention mini-mention--hollow' });
            title(dot, `${name}, in ${plural(mentions, 'Brief', 'Briefen')} erwähnt${writes ? '' : ', schreibt selbst keinen Brief'}`);
            items.push(dot);
        });
        data.replaceChildren(...items);
        ready.push(pos);
        if (record) place(record);
        applyTags();
    });
    return place;
}

// Sending places, or mentioned places as hollow rings, on the country outlines. Both maps share
// one frame (around the sending places), so the pair shows where the letters come from and what
// they speak of in the same space
function drawPlaces(kind) {
    return context => {
        const { data, marks, width, height, summary, frame } = context;
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
                pickable(dot, pick(l => key && placeKey(l.place_sent) === key, r => r.lat === lat && r.lon === lon), { outline: outlined(context) });
            }
            dots.push(dot);
        }
        data.replaceChildren(land, ...dots);
        loadLand().then(features => {
            if (features && land.isConnected) land.setAttribute('d', landPath(features, frame, project));
        });
        const mark = letterMark(marks, kind === 'sent' ? 'place' : 'mentionsPlace');
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

// Places without coordinates: the most frequent names as a ranking, bar by letters
function drawRanking(context, key) {
    const { data, marks, width, height, summary } = context;
    const list = key === 'place' ? summary.placesTop || [] : summary.mentioned?.places?.top || [];
    // At most three names: the ranking says where the letters come from, not every place
    const rows = Math.max(1, Math.min(list.length, 3, Math.floor(height / 30)));
    const rowHeight = height / Math.max(rows, 1);
    const max = list[0]?.[1] || 1;
    const items = [];
    const where = new Map();
    list.slice(0, rows).forEach(([name, count], i) => {
        const y = i * rowHeight;
        const label = node('text', { x: INSET, y: y + 14, class: 'mini-label' });
        label.textContent = `${name} ${format(count)}`;
        items.push(label, node('rect', { x: INSET, y: y + 19, width: Math.max(((width - INSET) * count) / max, 1), height: 3, class: 'mini-bar' }));
        where.set(name, y + 12);
    });
    data.replaceChildren(...items);
    marks.replaceChildren();
    const mark = letterMark(marks, key === 'place' ? 'place' : 'mentionsPlace');
    return next => {
        const name = key === 'place' ? next?.place : next?.mentionsPlace;
        if (!name || !where.has(name)) return mark.hide();
        mark.at(10, where.get(name));
    };
}

// Time, for few letters: one mark per letter on a true time axis, the letters from the central
// person above it and the letters to that person below it (the idiom of the explorer's time
// view), in the language colours
function drawLetters(context) {
    const { data, marks, width, height, summary, colors, entry } = context;
    data.replaceChildren();
    marks.replaceChildren();
    const ready = [];
    const mark = letterMark(marks, 'date');
    const place = next => {
        const at = ready[0]?.get(next?.id);
        if (at) mark.at(at.x, at.y); else mark.hide();
    };
    loadTimeModule().then(module => {
        if (!data.isConnected) return;
        const centreId = summary.context?.centreId || null;
        const side = letter => (module ? module.letterSide(letter, centreId) : 'all');
        const plot = height - AXIS_ROOM;
        const axis = plot / 2;
        const t0 = summary.first;
        const t1 = summary.last + 1;
        const x = t => 10 + ((t - t0) / (t1 - t0)) * (width - 20);
        const r = Math.max(3, Math.min(7, (plot / 2 - 14) / 5));
        const pitch = r * 2 + 1;
        const columns = { out: new Map(), in: new Map(), other: new Map(), all: new Map() };
        const positions = new Map();
        const items = [node('line', { x1: 0, x2: width, y1: axis, y2: axis, class: 'mini-baseline' })];
        const keyOf = code => seriesKey(colors, code);
        entry.letters.filter(l => letterTime(l) !== null).sort((a, b) => letterTime(a) - letterTime(b)).forEach(letter => {
            const s = side(letter);
            const cx = x(letterTime(letter));
            const bucket = Math.round(cx / pitch);
            const level = columns[s].get(bucket) || 0;
            columns[s].set(bucket, level + 1);
            const offset = (level + 0.5) * pitch + 2;
            const cy = s === 'in' ? axis + offset : s === 'out' || s === 'all' ? axis - offset : axis;
            const color = colors.find(c => c.key === keyOf(letter.language?.code || NO_LANGUAGE))?.color;
            const dot = node('circle', { cx, cy, r, fill: color, class: 'mini-letter' });
            title(dot, [letter.sender?.name, letter.date].filter(Boolean).join(', '));
            pickable(dot, pick(l => l === letter, () => false));
            items.push(dot);
            positions.set(letter.id, { x: cx, y: cy });
        });
        const ego = summary.ego;
        const side1 = node('text', { x: 0, y: 11, class: 'mini-axis' });
        side1.textContent = ego && centreId ? `von ${ego.centre}` : '';
        const side2 = node('text', { x: 0, y: plot - 2, class: 'mini-axis' });
        side2.textContent = ego && centreId ? `an ${ego.centre}` : '';
        items.push(side1, side2, axisLabel(String(summary.first), 0, height - 3, 'start'), axisLabel(String(summary.last), width, height - 3, 'end'));
        data.replaceChildren(...items);
        ready.push(positions);
        if (record) place(record);
        applyTags();
    });
    return place;
}

function axisLabel(text, x, y, anchor) {
    const t = node('text', { x, y, class: 'mini-axis', 'text-anchor': anchor });
    t.textContent = text;
    return t;
}

// Time, for many letters: letters per year stacked by language, the most frequent at the bottom,
// on a linear scale. A year above CLIP_FACTOR times the 90th percentile is cut at that height and
// its count written at the cut, so one dominant year leaves the others readable
function drawProfile(context) {
    const { data, marks, width, height, summary, colors } = context;
    const perYear = summary.perYear || [];
    data.replaceChildren();
    marks.replaceChildren();
    if (perYear.length === 0) return null;
    const byYear = new Map(perYear);
    const years = summary.last - summary.first + 1;
    const band = width / years;
    const gap = band >= 4 ? 1 : 0;
    const top = 24;
    const plot = height - AXIS_ROOM - top;
    const totals = perYear.map(([, counts]) => Object.values(counts).reduce((a, b) => a + b, 0));
    const sorted = [...totals].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))];
    const max = sorted[sorted.length - 1];
    const cap = max > p90 * CLIP_FACTOR ? Math.max(p90 * CLIP_FACTOR, 1) : max;
    const scale = plot / cap;
    const items = [];
    const keyOf = code => seriesKey(colors, code);
    let lastLabel = -Infinity;
    let labelRow = 0;
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
        let y = top + plot;
        colors.forEach(({ key, color }) => {
            const n = stacked[key];
            if (!n) return;
            let h = n * scale;
            if (y - h < top) h = y - top;
            if (h <= 0) return;
            y -= h;
            items.push(node('rect', { x, y, width: w, height: h - (h > 4 ? 1 : 0), fill: color }));
        });
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total > cap) {
            // The cut: two strokes of paper across the bar, the count above it
            items.push(node('path', { d: `M${x - 1} ${top + 6} l${w + 2} -3 M${x - 1} ${top + 10} l${w + 2} -3`, class: 'mini-cut' }));
            // Counts of neighbouring cut years step up a line instead of running into each other
            const lx = Math.min(Math.max(x + w / 2, 14), width - 14);
            labelRow = lx - lastLabel < 30 ? labelRow + 1 : 0;
            lastLabel = lx;
            items.push(axisLabel(format(total), lx, top - 2 - labelRow * 11, 'middle'));
        }
        const hit = node('rect', { x, y: top, width: band, height: plot, class: 'mini-hit' });
        pickable(hit, pick(l => l.year === year, r => r.year === year), { outline: false });
        if (hit.classList.contains('is-pickable')) items.push(hit);
    }
    items.push(node('line', { x1: 0, x2: width, y1: top + plot + 0.5, y2: top + plot + 0.5, class: 'mini-baseline' }),
        axisLabel(String(summary.first), 0, height - 3, 'start'), axisLabel(String(summary.last), width, height - 3, 'end'));
    data.replaceChildren(...items);
    const mark = letterMark(marks, 'date');
    return next => {
        if (!next?.year || next.year < summary.first || next.year > summary.last) return mark.hide();
        mark.at(((next.year - summary.first) + 0.5) * band, top + plot);
    };
}

// Languages as one bar of their shares, where the dataset has no time figure to colour
function drawLanguages({ data, marks, width, height, colors }) {
    const total = colors.reduce((sum, s) => sum + s.count, 0);
    const barHeight = Math.min(14, height);
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
    const mark = letterMark(marks, 'language');
    return next => {
        const span = next?.language ? spans.get(seriesKey(colors, next.language)) : null;
        if (!span) return mark.hide();
        mark.at(span[0] + span[1] / 2, barHeight / 2);
    };
}

// The subjects most named, as small year profiles on one scale, as many as the height holds (the
// letter's own subject among them where it is)
function drawSubjects({ data, marks, width, height, summary }) {
    const list = summary.subjects || [];
    const rows = Math.max(1, Math.min(list.length, Math.floor(height / SUBJECT_ROW)));
    const shown = list.slice(0, rows);
    const max = Math.max(1, ...shown.flatMap(([, years]) => years.map(([, n]) => n)));
    const span = summary.last - summary.first + 1;
    const band = width / span;
    const rowHeight = height / rows;
    const items = [];
    shown.forEach(([label, years], index) => {
        const y0 = index * rowHeight;
        const plot = rowHeight - 20;
        const name = node('text', { x: 0, y: y0 + 12, class: 'mini-label' });
        name.textContent = label;
        items.push(name, node('line', { x1: 0, x2: width, y1: y0 + 16 + plot + 0.5, y2: y0 + 16 + plot + 0.5, class: 'mini-baseline' }));
        years.filter(([year]) => year >= summary.first && year <= summary.last).forEach(([year, n]) => {
            const h = Math.max((n / max) * plot, 1);
            items.push(node('rect', { x: (year - summary.first) * band, y: y0 + 16 + plot - h, width: Math.max(band - (band >= 4 ? 1 : 0), 0.5), height: h, class: 'mini-subject' }));
        });
    });
    data.replaceChildren(...items);
    marks.replaceChildren();
    const mark = letterMark(marks, 'mentionsSubject');
    return next => {
        if (next?.subject === null || next?.subject === undefined || next.subject >= rows || !next.year) return mark.hide();
        mark.at((next.year - summary.first + 0.5) * band, next.subject * rowHeight + rowHeight - 4);
    };
}

// Postmarks over the years: the letters with a postmark per year, on the axis of the time figure
function drawPostmarks({ data, marks, width, height, summary }) {
    const list = summary.postmarkYears || [];
    const span = summary.last - summary.first + 1;
    const band = width / span;
    const plot = height - AXIS_ROOM;
    const max = Math.max(1, ...list.map(([, n]) => n));
    data.replaceChildren(
        ...list.filter(([year]) => year >= summary.first && year <= summary.last).map(([year, n]) => {
            const h = Math.max((n / max) * plot, 1);
            return node('rect', { x: (year - summary.first) * band, y: plot - h, width: Math.max(band - (band >= 4 ? 1 : 0), 0.5), height: h, class: 'mini-subject' });
        }),
        node('line', { x1: 0, x2: width, y1: plot + 0.5, y2: plot + 0.5, class: 'mini-baseline' }),
        axisLabel(String(summary.first), 0, height - 3, 'start'),
        axisLabel(String(summary.last), width, height - 3, 'end')
    );
    marks.replaceChildren();
    const mark = letterMark(marks, 'postmark');
    return next => {
        if (!next?.postmark || !next.year) return mark.hide();
        mark.at((next.year - summary.first + 0.5) * band, plot);
    };
}

// How the records of one letter relate: letters by the number of records the edition keeps of
// them, from three records on in one row (how many differ stands in the title)
const RECORDS_FOLD = 3;
function drawRecords({ data, marks, width, height, summary }) {
    const counts = [];
    (summary.recordCounts || []).forEach(([records, n]) => {
        if (records < RECORDS_FOLD) counts.push([records, n, String(records)]);
        else if (counts.length && counts[counts.length - 1][0] === RECORDS_FOLD) counts[counts.length - 1][1] += n;
        else counts.push([RECORDS_FOLD, n, `${RECORDS_FOLD} und mehr`]);
    });
    const rows = Math.max(counts.length, 1);
    const rowHeight = Math.min(30, height / rows);
    const max = Math.max(1, ...counts.map(([, n]) => n));
    const items = [];
    const where = new Map();
    counts.forEach(([records, n, label0], i) => {
        const y = i * rowHeight;
        const label = node('text', { x: INSET, y: y + 12, class: 'mini-label' });
        label.textContent = `${label0} ${records === 1 ? 'Eintrag' : 'Einträge'}: ${format(n)} ${n === 1 ? 'Brief' : 'Briefe'}`;
        items.push(label, node('rect', { x: INSET, y: y + 16, width: Math.max(((width - INSET) * n) / max, 1), height: 3, class: 'mini-bar' }));
        where.set(records, y + 10);
    });
    data.replaceChildren(...items);
    marks.replaceChildren();
    const mark = letterMark(marks, 'records');
    return next => {
        const row = next?.records >= RECORDS_FOLD ? RECORDS_FOLD : next?.records;
        return where.has(row) && row > 1 ? mark.at(10, where.get(row)) : mark.hide();
    };
}

// The properties of the transmission as one list of shares, each with its count
function drawShares({ data, marks, width, height, summary }, key, item) {
    const keys = item.keys || [];
    const rowHeight = Math.min(34, height / Math.max(keys.length, 1));
    const items = [];
    const where = new Map();
    keys.forEach((feature, i) => {
        const y = i * rowHeight;
        const n = summary.coverage[feature];
        const label = node('text', { x: INSET, y: y + 12, class: 'mini-label' });
        label.textContent = `${FEATURE_NAMES[feature]}: ${format(n)} von ${format(summary.letters)}`;
        const share = n / Math.max(summary.letters, 1);
        items.push(label,
            node('rect', { x: INSET, y: y + 16, width: width - INSET, height: 4, class: 'mini-track' }),
            node('rect', { x: INSET, y: y + 16, width: Math.max(share * (width - INSET), 1), height: 4, class: 'mini-share' }));
        where.set(feature, y + 10);
    });
    data.replaceChildren(...items);
    marks.replaceChildren();
    // One mark per property the letter carries; the postmark and the records have their own
    // figures where those are drawn, so here they mark only where no such figure stands
    const own = ['address', 'signature', 'inferred', 'postmark', 'records'].filter(k => keys.includes(k));
    const placed = own.map(k => [k, letterMark(marks, k)]);
    const carries = (next, k) => (k === 'records' ? next?.records > 1 : k === 'inferred' ? next?.placeInferred || next?.dateInferred : Boolean(next?.[k]));
    return next => placed.forEach(([k, mark]) => {
        const elsewhere = (k === 'postmark' || k === 'records') && model.querySelector(`.stmt--${k}`);
        if (carries(next, k) && !elsewhere) mark.at(10, where.get(k)); else mark.hide();
    });
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

// The letter: one sheet per band the dataset fills. The first carries the flap of the envelope and
// the instruction for choosing another letter
function sheet(band, row, composition) {
    const element = document.createElement('div');
    element.className = `record-sheet record-sheet--${band}`;
    element.style.gridRow = String(row + 1);
    element.dataset.band = band;
    element.dataset.caption = SHEET_CAPTIONS[band];
    // The caption of a sheet appears on hover and focus; keyboard users reach it through the
    // numbered lines inside, which are focusable
    if (row === 0) {
        const flap = node('svg', { class: 'record-flap', viewBox: '0 0 100 20', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
        flap.append(node('path', { d: 'M0 0 L50 18 L100 0', 'vector-effect': 'non-scaling-stroke' }));
        element.append(flap);
    }
    const lines = document.createElement('div');
    lines.className = 'record-lines';
    element.append(lines);
    if (row === 0) {
        const choice = document.createElement('div');
        choice.className = 'record-choice';
        const hint = document.createElement('p');
        hint.className = 'record-hint';
        const other = document.createElement('button');
        other.type = 'button';
        other.className = 'record-other';
        other.textContent = 'anderer Brief';
        other.setAttribute('aria-label', 'Anderen Beispielbrief zeigen');
        other.addEventListener('click', stepLetter);
        choice.append(hint, other);
        element.append(choice);
    }
    return element;
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
            r?.url && ['', r.url, 'record-link']
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
            r?.records > 1 && ['records', `${r.records} Einträge in der Quelle`],
            (r?.placeInferred || r?.dateInferred) && ['inferred', `erschlossen: ${[r.placeInferred && 'Ort', r.dateInferred && 'Datum'].filter(Boolean).join(' und ')}`]
        ]
    };
    const sheets = [...model.querySelectorAll('.record-sheet')];
    const shown = new Set(sheets.map(s => s.dataset.band));
    // Lines of a band the dataset does not draw (the language of a holding without mentions) join
    // the first sheet, so the letter stays whole
    const byBand = { core: [...lines.core], extension: [], record: [] };
    ['extension', 'record'].forEach(band => {
        (shown.has(band) ? byBand[band] : byBand.core).push(...lines[band]);
    });
    sheets.forEach(element => {
        const box = element.querySelector('.record-lines');
        const present = byBand[element.dataset.band].filter(Boolean);
        box.replaceChildren(...present.map(([anchor, text, cls = '', swatch]) => {
            const line = document.createElement(cls === 'record-link' ? 'a' : 'p');
            line.className = `record-line ${cls}`.trim();
            if (anchor) line.dataset.line = anchor;
            if (cls === 'record-link') {
                line.href = text;
                line.target = '_blank';
                line.rel = 'noopener noreferrer';
                line.textContent = text.replace(/^https?:\/\//, '');
                return line;
            }
            const tag = document.createElement('span');
            tag.className = 'record-tag';
            tag.setAttribute('aria-hidden', 'true');
            line.append(tag);
            if (swatch) {
                const mark = document.createElement('span');
                mark.className = 'record-swatch';
                mark.style.backgroundColor = swatch;
                line.append(mark);
            }
            line.append(document.createTextNode(text));
            return line;
        }));
    });
}

// Number the lines of the letter whose mark stands in a figure, and give each mark the same number
function applyTags() {
    if (!model) return;
    let n = 0;
    model.querySelectorAll('.record-line[data-line]').forEach(line => {
        const mark = [...model.querySelectorAll(`.letter-mark[data-anchor="${line.dataset.line}"]`)].find(m => m.style.display !== 'none');
        const tag = line.querySelector('.record-tag');
        if (!mark) {
            line.classList.remove('is-tagged');
            if (tag) tag.textContent = '';
            return;
        }
        n++;
        line.classList.add('is-tagged');
        line.tabIndex = 0;
        if (tag) tag.textContent = String(n);
        mark.querySelector('.letter-tag text').textContent = String(n);
    });
    separateTags();
    if (traced) trace(traced);
}

// Two marks of the letter close together in one figure (its partner and a person it mentions)
// turn their tags to opposite sides, so the numbers stay apart
function separateTags() {
    model.querySelectorAll('.figure-marks').forEach(layer => {
        const shown = [...layer.querySelectorAll('.letter-mark')].filter(m => m.style.display !== 'none');
        for (let i = 1; i < shown.length; i++) {
            const a = shown[i - 1].querySelector('.letter-mark__ring').getBoundingClientRect();
            const b = shown[i].querySelector('.letter-mark__ring').getBoundingClientRect();
            if (Math.hypot(a.x - b.x, a.y - b.y) < 30) shown[i].querySelector('.letter-tag').setAttribute('transform', 'translate(-12 12)');
        }
    });
}

function traceKey(target) {
    const holder = target?.closest?.('[data-line], .letter-mark');
    return holder ? holder.dataset.line || holder.dataset.anchor || null : null;
}

// One line and its mark forward, the other letter marks back
function trace(key) {
    traced = key;
    model.classList.toggle('is-tracing', Boolean(key));
    model.querySelectorAll('.record-line[data-line], .letter-mark').forEach(el => {
        el.classList.toggle('is-traced', Boolean(key) && (el.dataset.line || el.dataset.anchor) === key);
    });
}

// Text alternative: what the dataset holds, what it lacks, the scale of the time figure and the
// example letter
function describe(summary, dataset, r) {
    if (!summary || !dataset) return '';
    const composition = composeFigure(summary, { lettersInBrowser: Boolean(loaded.get(current)?.letters) });
    const parts = composition.bands.map(band => {
        const items = band.items.map(item => {
            const spec = STATEMENT_VIEWS[item.key];
            if (item.key === 'features') return item.keys.map(k => `${FEATURE_NAMES[k]} in ${format(summary.coverage[k])} Briefen`).join('; ');
            return `${spec.name}, ${spec.count(summary)}`;
        });
        const note = band.key === 'extension' ? ` (${EXTENSION_NOTE})` : '';
        return `${BAND_LABELS[band.key]}${note}: ${items.join('; ')}.`;
    });
    const time = composition.bands[0]?.items.find(i => i.key === 'date');
    const scale = time?.figure === 'profile' ? ' Die Zeitfigur zählt linear; ein Jahr weit über den übrigen ist gekappt und nennt seine Zahl.' : '';
    const letter = r ? ` Beispielbrief: ${[r.sender, r.recipient && `an ${r.recipient}`, r.place, r.date].filter(Boolean).join(', ')}.` : '';
    return `${dataset.name}, ${format(summary.letters)} Briefe. ${parts.join(' ')} ${composition.sentence}${scale}${letter}`;
}
