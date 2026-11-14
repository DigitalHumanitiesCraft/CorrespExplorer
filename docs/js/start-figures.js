// The figure of the start page: one letter record unfolded into the data model the explorer reads,
// in three bands (the core of CMIF, the extensions an edition adds in CMIF, the statements of TEI
// letter records), each statement drawn as a small real aggregate of the chosen dataset in the
// idiom of the view it opens. A statement the dataset lacks stays in its place, empty and named.
// Inline SVG and DOM without a library; every number comes from summarizeLetters()
// (start-summary.js) or from data/examples.json, its port for the Hugo Schuchardt Archiv.

import { computeLanguageColors, languageLabel, NO_LANGUAGE } from './constants.js';
import { loadDemoDataset, parseCMIFFiles } from './cmif-parser.js';
import { formatSingleDate } from './formatters.js';
import { summarizeLetters } from './start-summary.js';
import { prefersReducedMotion, httpErrorMessage } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LAND_URL = 'vendor/natural-earth/countries-110m.geo.json';
const SUMMARY_URL = 'data/examples.json';
// The figure names its languages in one key, so the three most frequent keep their colour and
// the rest share the grey of "übrige Sprachen" as in the explorer
const NAMED_LANGUAGES = 3;

const format = n => n.toLocaleString('de-DE');

// The datasets of the figure. `explore` builds the address of a view of that dataset; a local
// edition has no address of its own and passes through the start page (upload.js, ?files=)
const DATASETS = {
    demo: {
        name: 'Tutorial',
        load: async () => summarizeLetters((await loadDemoDataset()).letters),
        explore: params => `explore.html?demo=true&tour=0&${params}`
    },
    hsa: {
        name: 'Hugo Schuchardt Archiv',
        load: async () => {
            const response = await fetch(SUMMARY_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return (await response.json()).datasets['data/hsa-letters.json'];
        },
        explore: params => `explore.html?json=data/hsa-letters.json&${params}`
    },
    local: {
        name: 'Stefan Zweig Digital',
        load: async onProgress => {
            const { texts, names } = await fetchListedFiles('data/local/files.json', onProgress);
            return summarizeLetters((await parseCMIFFiles(texts, null, names)).letters);
        },
        explore: params => `index.html?files=data/local/files.json&${params}`
    }
};

const BANDS = [
    { key: 'core', label: 'Kern des CMIF', left: ['persons', 'place'], right: ['date', 'link'] },
    { key: 'extension', label: 'Erweiterungen im CMIF', left: ['language', 'mentionsPerson'], right: ['mentionsPlace', 'mentionsSubject'] },
    { key: 'record', label: 'TEI-Briefsätze', left: ['postmark', 'address'], right: ['signature', 'records', 'inferred'] }
];

// Name, the view it opens, the figure it draws and the one number beside its name
const STATEMENT_VIEWS = {
    persons: { name: 'Absender und Empfänger', view: 'network', action: 'Netzwerk', count: s => `${format(s.persons)} Personen`, draw: drawCircle },
    place: { name: 'Absendeort', view: 'map', action: 'Karte', count: s => (s.located?.length ? `${format(s.places)} Orte` : `${format(s.places)} Orte, keiner mit Koordinaten`), draw: drawMap },
    date: { name: 'Datum', view: 'timeline', action: 'Zeitleiste', count: s => `${s.first}–${s.last}`, draw: drawYears },
    link: { name: 'Link zur Edition', view: 'letters', action: 'Briefliste', count: s => `${format(s.coverage.link)} Briefe`, draw: drawShare('link') },
    language: { name: 'Sprache', view: 'timeline', action: 'Zeitleiste', count: s => `${format(Object.keys(s.languages).filter(c => c !== NO_LANGUAGE).length)} Sprachen`, draw: drawLanguages, prepare: languageKey },
    mentionsPerson: { name: 'Erwähnte Personen', view: 'mentions-flow', action: 'Erwähnungen', count: s => `${format(s.mentioned.persons.distinct)} Personen`, draw: null, prepare: topNames('persons') },
    mentionsPlace: { name: 'Erwähnte Orte', view: 'letters', action: 'Briefliste', count: s => `${format(s.mentioned.places.distinct)} Orte`, draw: null, prepare: topNames('places') },
    mentionsSubject: { name: 'Themen', view: 'topics', action: 'Themen', count: s => `${format(s.mentioned.subjects.distinct)} Themen`, draw: null, prepare: topNames('subjects') },
    postmark: { name: 'Poststempel', view: 'letters', feat: 'postmark', action: 'Briefliste', count: s => `${format(s.coverage.postmark)} Briefe`, draw: drawShare('postmark') },
    address: { name: 'Anschrift', view: 'letters', feat: 'address', action: 'Briefliste', count: s => `${format(s.coverage.address)} Briefe`, draw: drawShare('address') },
    signature: { name: 'Signatur', view: 'letters', action: 'Briefliste', count: s => `${format(s.coverage.signature)} Briefe`, draw: drawShare('signature') },
    records: { name: 'Mehrfach verzeichnet', view: 'letters', feat: 'records', action: 'Briefliste', count: s => `${format(s.coverage.records)} Briefe`, draw: drawShare('records') },
    inferred: { name: 'Erschlossene Angaben', view: 'letters', action: 'Briefliste', count: s => `${format(s.coverage.inferred)} Briefe`, draw: drawShare('inferred') }
};

const summaries = new Map();
let landPromise = null;
let current = null;
let model = null;
let status = null;
let textAlternative = null;
const redraws = [];

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
 * Build the figure into the page and show the dataset whose choice is pressed
 */
export function initStartFigure() {
    model = document.getElementById('model');
    status = document.getElementById('model-status');
    textAlternative = document.getElementById('model-text');
    if (!model) return;
    document.querySelectorAll('.dataset-choice [data-choice]').forEach(button => {
        button.addEventListener('click', () => choose(button.dataset.choice));
    });
    new ResizeObserver(() => redrawAll()).observe(model);
    const pressed = document.querySelector('.dataset-choice [aria-pressed="true"]');
    choose(pressed?.dataset.choice || 'demo');
}

async function choose(key) {
    const dataset = DATASETS[key];
    if (!dataset) return;
    current = key;
    document.querySelectorAll('.dataset-choice [data-choice]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.choice === key));
    });
    // The open control of the chosen dataset only; upload.js handles what it does
    document.querySelectorAll('.dataset-card[data-for]').forEach(card => {
        card.classList.toggle('hidden', card.dataset.for !== key);
    });
    let summary = summaries.get(key);
    if (!summary) {
        setStatus(key === 'local' ? 'Lade die Dateien der Edition …' : 'Lade …');
        try {
            summary = await dataset.load((done, total) => {
                if (current === key) setStatus(`Lade die Dateien der Edition, ${format(done)} von ${format(total)}`);
            });
            summaries.set(key, summary);
        } catch (error) {
            console.error('Start figure could not load its dataset:', error);
            if (current === key) setStatus(`Die Grafik für ${dataset.name} ließ sich nicht laden. Der Datensatz bleibt über „Im Explorer öffnen“ erreichbar.`);
            return;
        }
    }
    if (current !== key) return;
    setStatus('');
    render(summary, dataset);
}

function setStatus(text) {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('hidden', !text);
    model.classList.toggle('is-waiting', Boolean(text));
}

// Whether a dataset carries a statement at all
const carried = (summary, key) => (summary.coverage?.[key] || 0) > 0;

function render(summary, dataset) {
    redraws.length = 0;
    const colors = languageSeries(summary.languages || {});
    const parts = [];
    BANDS.forEach((band, row) => {
        const label = document.createElement('p');
        label.className = `band-label band-row-${row + 1}`;
        label.textContent = band.label;
        parts.push(label);
        ['left', 'right'].forEach(side => {
            const cell = document.createElement('div');
            cell.className = `band-side band-side--${side} band-side--${band.key} band-row-${row + 1}`;
            band[side].forEach(key => cell.append(statement(key, summary, dataset, colors)));
            parts.push(cell);
        });
    });
    parts.push(recordCard(summary, dataset, colors));
    const leaders = document.createElementNS(SVG_NS, 'svg');
    leaders.setAttribute('class', 'model-leaders');
    leaders.setAttribute('aria-hidden', 'true');
    parts.push(leaders);
    redraws.push(() => drawLeaders(leaders));

    if (!prefersReducedMotion()) {
        model.classList.add('is-changing');
        requestAnimationFrame(() => requestAnimationFrame(() => model.classList.remove('is-changing')));
    }
    model.replaceChildren(...parts);
    model.dataset.dataset = current;
    textAlternative.textContent = describe(summary, dataset);
    redrawAll();
}

function redrawAll() {
    redraws.forEach(redraw => redraw());
}

// One statement: a link into its view with its name, its number and its figure, or the same place
// empty with the words "nicht im Bestand"
function statement(key, summary, dataset, colors) {
    const spec = STATEMENT_VIEWS[key];
    const present = carried(summary, key);
    const element = document.createElement(present ? 'a' : 'div');
    element.className = `stmt stmt--${key}${present ? '' : ' is-absent'}`;
    const name = document.createElement('span');
    name.className = 'stmt-name';
    name.textContent = spec.name;
    const count = document.createElement('span');
    count.className = 'stmt-count';
    count.textContent = present ? spec.count(summary) : 'nicht im Bestand';
    const figure = document.createElement('span');
    figure.className = 'stmt-figure';
    figure.setAttribute('aria-hidden', 'true');
    element.append(name, count, figure);
    if (present) {
        // Text that sizes the figure (names of mentions, the key of the languages) stands before
        // the first drawing, so the drawing measures its final size
        spec.prepare?.(figure, summary, colors);
        const params = new URLSearchParams({ view: spec.view });
        if (spec.feat) params.set('feat', spec.feat);
        element.href = dataset.explore(params.toString());
        element.setAttribute('aria-label', `${spec.name}, ${spec.count(summary)}: ${spec.action} von ${dataset.name} öffnen`);
        if (spec.draw) redraws.push(() => drawInto(figure, (svg, w, h) => spec.draw(svg, w, h, summary, colors, figure)));
    }
    return element;
}

// The letter in the centre: the record that carries most statements, its fields grouped by band
function recordCard(summary, dataset, colors) {
    const card = document.createElement('article');
    card.className = 'record';
    card.setAttribute('aria-label', `Beispielbrief aus ${dataset.name}`);
    const flap = document.createElementNS(SVG_NS, 'svg');
    flap.setAttribute('class', 'record-flap');
    flap.setAttribute('viewBox', '0 0 100 20');
    flap.setAttribute('preserveAspectRatio', 'none');
    flap.setAttribute('aria-hidden', 'true');
    const fold = document.createElementNS(SVG_NS, 'path');
    fold.setAttribute('d', 'M0 0 L50 18 L100 0');
    fold.setAttribute('vector-effect', 'non-scaling-stroke');
    flap.append(fold);
    card.append(flap);
    const r = summary.record || {};
    // Values the edition supplied stand in square brackets, as everywhere in the explorer
    const bracket = (value, inferred) => (inferred ? `[${value}]` : value);
    const when = r.date ? formatSingleDate(r.date) : r.dateText;
    const language = r.language ? (languageLabel(r.language) === r.language && r.languageLabel ? r.languageLabel : languageLabel(r.language)) : null;
    const languageColor = r.language ? (colors.find(c => c.key === r.language) || colors.find(c => c.key === 'other'))?.color : null;
    const lines = {
        core: [
            r.sender && ['record-sender', r.sender],
            r.recipient && ['', `an ${r.recipient}`],
            (r.place || when) && ['', [r.place && bracket(r.place, r.placeInferred), when && bracket(when, r.dateInferred)].filter(Boolean).join(', ')],
            r.url ? ['record-link', r.url] : ['record-absent', 'ohne Link zur Edition']
        ],
        extension: [
            language && ['', language, languageColor],
            r.mentionsPerson && ['', `erwähnt ${r.mentionsPerson}`],
            r.mentionsPlace && ['', `erwähnt ${r.mentionsPlace}`],
            r.mentionsSubject && ['', `Thema ${r.mentionsSubject}`]
        ],
        record: [
            r.postmark && ['', `Poststempel ${r.postmark}`],
            r.address && ['', `Anschrift ${r.address}`],
            r.signature && ['', `Signatur ${r.signature}`],
            r.records > 1 && ['', `${r.records} Einträge in der Quelle`]
        ]
    };
    BANDS.forEach((band, row) => {
        const group = document.createElement('div');
        group.className = `record-group record-group--${band.key} band-row-${row + 1}`;
        const present = lines[band.key].filter(Boolean);
        if (present.length === 0) present.push(['record-absent', 'keine Angaben dieser Art']);
        present.forEach(([cls, text, swatch]) => {
            const line = document.createElement(cls === 'record-link' ? 'a' : 'p');
            line.className = `record-line ${cls}`.trim();
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
            group.append(line);
        });
        card.append(group);
    });
    return card;
}

// Text alternative: the model with what the chosen dataset carries of it
function describe(summary, dataset) {
    const parts = BANDS.map(band => {
        const items = [...band.left, ...band.right].map(key => {
            const spec = STATEMENT_VIEWS[key];
            return carried(summary, key)
                ? `${spec.name} in ${format(summary.coverage[key])} von ${format(summary.letters)} Briefen`
                : `${spec.name} nicht im Bestand`;
        });
        return `${band.label}: ${items.join('; ')}.`;
    });
    return `${dataset.name}, ${format(summary.letters)} Briefe. ${parts.join(' ')}`;
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

// The SVG takes the pixel size of its container, so marks stay sharp and circles round at every
// width; the container is measured, the SVG is placed absolutely and never feeds back into it
function drawInto(container, draw) {
    const width = Math.floor(container.clientWidth);
    const height = Math.floor(container.clientHeight);
    if (width < 2 || height < 2) return;
    let svg = container.querySelector(':scope > svg');
    if (!svg) {
        svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('focusable', 'false');
        container.append(svg);
    }
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    draw(svg, width, height);
}

function node(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, typeof value === 'number' ? value.toFixed(2) : value));
    return element;
}

// Correspondence circle after the ego figure of the network view: the central person in the
// middle, the most frequent correspondents on a ring in order of their letters, an edge for every
// pair that wrote to each other, its width by their letters
function drawCircle(svg, width, height, summary) {
    const people = summary.circle || [];
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    const centre = summary.ego === 0 ? 0 : null;
    const ring = people.map((_, i) => i).filter(i => i !== centre);
    const max = Math.max(...ring.map(i => people[i][1]), 1);
    const position = new Map();
    if (centre !== null) position.set(centre, { x: cx, y: cy });
    ring.forEach((i, k) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * k) / ring.length;
        position.set(i, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    });
    const maxEdge = Math.max(...(summary.edges || []).map(e => e[2]), 1);
    const marks = [];
    (summary.edges || []).forEach(([a, b, count]) => {
        const p = position.get(a);
        const q = position.get(b);
        if (!p || !q) return;
        // Pairs on the ring bend towards the centre, so chords stay apart from the spokes
        const d = a === centre || b === centre
            ? `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${q.x.toFixed(1)} ${q.y.toFixed(1)}`
            : `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        marks.push(node('path', { d, class: 'mini-edge', 'stroke-width': 0.6 + 3.4 * Math.sqrt(count / maxEdge) }));
    });
    position.forEach((p, i) => {
        const r = i === centre ? 6 : 2 + 5 * Math.sqrt(people[i][1] / max);
        marks.push(node('circle', { cx: p.x, cy: p.y, r, class: i === centre ? 'mini-node mini-node--centre' : 'mini-node' }));
    });
    svg.replaceChildren(...marks);
}

// Sending places on the country outlines: an equirectangular frame around the places that hold
// most of the letters (the frame rule of the space-time view), a dot per place sized by letters
function drawMap(svg, width, height, summary) {
    const places = summary.located || [];
    if (places.length === 0) {
        svg.replaceChildren();
        return;
    }
    const frame = mapFrame(places);
    const k = Math.cos((((frame.latMin + frame.latMax) / 2) * Math.PI) / 180);
    const spanX = (frame.lonMax - frame.lonMin) * k;
    const spanY = frame.latMax - frame.latMin;
    const scale = Math.min(width / spanX, height / spanY);
    const offsetX = (width - spanX * scale) / 2;
    const offsetY = (height - spanY * scale) / 2;
    const project = (lat, lon) => [offsetX + (lon - frame.lonMin) * k * scale, offsetY + (frame.latMax - lat) * scale];
    const land = node('path', { class: 'mini-land' });
    const max = places[0][2];
    // The largest places last, so they lie on top
    const dots = places.slice().reverse().map(([lat, lon, count]) => {
        const [x, y] = project(lat, lon);
        return node('circle', { cx: x, cy: y, r: 1.2 + 8 * Math.sqrt(count / max), class: 'mini-place' });
    });
    svg.replaceChildren(land, ...dots);
    loadLand().then(features => {
        if (!features || !land.isConnected) return;
        const rings = [];
        features.forEach(feature => {
            const geometry = feature.geometry;
            const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
            polygons.forEach(polygon => {
                const outer = polygon[0];
                // Only outlines near the frame, so the path stays small
                if (!outer.some(([lon, lat]) => lon > frame.lonMin - 20 && lon < frame.lonMax + 20 && lat > frame.latMin - 20 && lat < frame.latMax + 20)) return;
                rings.push(`M${outer.map(([lon, lat]) => project(lat, lon).map(v => v.toFixed(1)).join(' ')).join('L')}Z`);
            });
        });
        land.setAttribute('d', rings.join(''));
    });
}

function mapFrame(places) {
    const quantile = (value, share) => {
        const sorted = places.map(p => [value(p), p[2]]).sort((a, b) => a[0] - b[0]);
        const total = sorted.reduce((sum, [, w]) => sum + w, 0);
        let seen = 0;
        for (const [v, w] of sorted) {
            seen += w;
            if (seen >= total * share) return v;
        }
        return sorted[sorted.length - 1][0];
    };
    const latMin = quantile(p => p[0], 0.03);
    const latMax = quantile(p => p[0], 0.97);
    const lonMin = quantile(p => p[1], 0.03);
    const lonMax = quantile(p => p[1], 0.97);
    const padLat = Math.max((latMax - latMin) * 0.12, 1.5);
    const padLon = Math.max((lonMax - lonMin) * 0.12, 1.5);
    return { latMin: latMin - padLat, latMax: latMax + padLat, lonMin: lonMin - padLon, lonMax: lonMax + padLon };
}

function loadLand() {
    if (!landPromise) {
        landPromise = fetch(LAND_URL)
            .then(response => (response.ok ? response.json() : null))
            .then(json => json?.features || null)
            .catch(() => null);
    }
    return landPromise;
}

// Letters per year, stacked by language with the most frequent at the bottom as in the timeline
function drawYears(svg, width, height, summary, colors) {
    const perYear = summary.perYear || [];
    if (perYear.length === 0) return;
    const byYear = new Map(perYear);
    const years = summary.last - summary.first + 1;
    const band = width / years;
    const gap = band >= 4 ? 1 : 0;
    const totals = perYear.map(([, counts]) => Object.values(counts).reduce((a, b) => a + b, 0));
    const scale = height / Math.max(...totals);
    const marks = [];
    for (let i = 0; i < years; i++) {
        const counts = byYear.get(summary.first + i);
        if (!counts) continue;
        const stacked = {};
        Object.entries(counts).forEach(([code, n]) => {
            const key = seriesKey(colors, code);
            stacked[key] = (stacked[key] || 0) + n;
        });
        let top = height;
        colors.forEach(({ key, color }) => {
            const n = stacked[key];
            if (!n) return;
            const h = n * scale;
            top -= h;
            // A line of paper between two segments, as in the explorer's timeline
            const separator = h > 4 ? 1 : 0;
            marks.push(node('rect', { x: i * band, y: top, width: Math.max(band - gap, 0.5), height: h - separator, fill: color }));
        });
    }
    svg.replaceChildren(...marks);
}

// Languages as one bar of their shares
function drawLanguages(svg, width, height, summary, colors) {
    const total = colors.reduce((sum, s) => sum + s.count, 0);
    let x = 0;
    svg.replaceChildren(...colors.map(({ count, color }) => {
        const w = (count / total) * width;
        const mark = node('rect', { x, y: 0, width: Math.max(w - 1, 0.5), height, fill: color });
        x += w;
        return mark;
    }));
}

// The key of the language colours beneath their bar, which is the key of the year figure as well.
// Each name keeps its swatch on its line
function languageKey(figure, summary, colors) {
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
    figure.after(key);
}

// The names of the most frequent mentions, one per line, each over a bar of its letters drawn in
// CSS, so name and bar share one line box
function topNames(kind) {
    return (figure, summary) => {
        const list = document.createElement('span');
        list.className = 'stmt-list';
        const top = summary.mentioned?.[kind]?.top || [];
        const max = top[0]?.[1] || 1;
        top.forEach(([name, count]) => {
            const item = document.createElement('span');
            item.textContent = name;
            item.style.setProperty('--share', String(count / max));
            list.append(item);
        });
        figure.append(list);
    };
}

// Share of the letters that carry a statement, as a bar on a light track
function drawShare(key) {
    return (svg, width, height, summary) => {
        const share = (summary.coverage?.[key] || 0) / Math.max(summary.letters, 1);
        const y = Math.max(height / 2 - 3, 0);
        svg.replaceChildren(
            node('rect', { x: 0, y, width, height: 6, class: 'mini-track' }),
            node('rect', { x: 0, y, width: Math.max(share * width, 1), height: 6, class: 'mini-share' })
        );
    };
}

// Fine lines from the record to the statements of its band: one along the top of each side, a
// tick down to each statement, so each band reads as one part of the letter unfolded
function drawLeaders(svg) {
    const box = model.getBoundingClientRect();
    const card = model.querySelector('.record')?.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    // In one column (narrow screens) the bands follow the record and need no lines
    if (!card || getComputedStyle(model).getPropertyValue('--leaders').trim() === 'none') {
        svg.replaceChildren();
        return;
    }
    const paths = [];
    model.querySelectorAll('.band-side').forEach(side => {
        const statements = [...side.querySelectorAll('.stmt')].map(s => s.getBoundingClientRect());
        if (statements.length === 0) return;
        const y = statements[0].top - box.top - 8;
        const left = side.classList.contains('band-side--left');
        const edge = (left ? card.left : card.right) - box.left;
        const ticks = statements.map(r => r.left + 1 - box.left);
        const far = left ? Math.min(...ticks) : Math.max(...ticks);
        let d = `M${edge.toFixed(1)} ${y.toFixed(1)} H${far.toFixed(1)}`;
        ticks.forEach(x => { d += ` M${x.toFixed(1)} ${y.toFixed(1)} v5`; });
        paths.push(node('path', { d, class: 'leader' }));
    });
    svg.replaceChildren(...paths);
}
