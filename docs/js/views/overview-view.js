// Start view: the dashboard of the dataset and, in the sidebar above the filters, what the dataset
// is and where it comes from. The dashboard holds the explorer's views in small (time by language,
// the correspondence circle, the map, the subjects, the transmission), in the idiom of the start
// page's figure. Every small view sets the same filters as the sidebar, shows the letters of every
// filter but its own (so a choice stands out among the others instead of leaving its view alone
// with itself, the rule of the topics view), keeps the whole dataset pale behind them and marks
// what is chosen in the selection colour. Its label opens the view in full.

import { LETTER_FEATURES, LANGUAGE_COLORS, NO_LANGUAGE, isRestLanguage, languageLabel } from '../constants.js';
import { safeUrl, datedYearRange, personKey, placeKey, letterRecipients, isKnownPlace } from '../utils.js';
import { startTour } from '../demo-tour.js';
import { state } from '../state-manager.js';
import { readTokens } from './view-support.js';
import * as network from './network-view.js';
import { subjectProfiles } from './topics-view.js';
import { loadLand, mapFrame, frameProjection, landPath, smallGeometry } from '../mini-figures.js';

let deps = {};

const SVG_NS = 'http://www.w3.org/2000/svg';
const number = n => n.toLocaleString('de-DE');
const ofLetters = (n, total) => (n === total ? `${number(total)} ${total === 1 ? 'Brief' : 'Briefe'}` : `${number(n)} von ${number(total)} Briefen`);
// The mentioned persons kept around the circle, as on the start page
const OUTER_LIMIT = 300;
// The chords of the circle: the strongest, so a large archive does not draw thousands of curves
const CHORD_LIMIT = 400;
// A map is drawn where at least this share of the letters with a known place can stand on it;
// below that, the most frequent places stand by name
const MAP_SHARE = 0.5;
// The transmission statements of a letter record, as the start page names them; shown only where
// the dataset carries at least two, since a single share is no figure
const DASH_FEATURES = ['postmark', 'address', 'records', 'dateInferred', 'placeInferred'];
const ROW_HEIGHT = { subject: 44, place: 26 };
// At most this many rows of subjects or places by name, so a tall screen gives them room, not
// number; the places stay fewer, so a dataset with many sidebar filters keeps its first screen
// near the density limits of the interface yardstick
const ROW_LIMIT = { subject: 8, place: 6 };

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.getFilteredLetters
 * @param {Function} dependencies.getFilterState
 * @param {Function} dependencies.getCorpusSummary - summarizeCorpus() of the whole dataset
 * @param {Function} dependencies.getCorpusQuality - datasetQuality() of the whole dataset
 * @param {Function} dependencies.togglePerson
 * @param {Function} dependencies.togglePlace
 * @param {Function} dependencies.toggleSubject
 * @param {Function} dependencies.toggleLanguage
 * @param {Function} dependencies.toggleFeature
 * @param {Function} dependencies.setYearRange
 * @param {Function} dependencies.releaseYears
 * @param {Function} dependencies.isViewAvailable
 * @param {Function} dependencies.switchView
 */
export function initOverviewView(dependencies) {
    deps = dependencies;
}

// Pure parts, exported for the tests

/**
 * The short name of a licence from its address, else the text of the source
 * @param {string|null} url
 * @param {string|null} text
 * @returns {string|null}
 */
export function licenceName(url, text) {
    const address = typeof url === 'string' ? url : '';
    const cc = /creativecommons\.org\/licenses\/([a-z]+(?:-[a-z]+)*)\/(\d+(?:\.\d+)?)/i.exec(address);
    if (cc) return `CC ${cc[1].toUpperCase()} ${cc[2]}`;
    if (/creativecommons\.org\/publicdomain\/zero\//i.test(address)) return 'CC0';
    if (/creativecommons\.org\/publicdomain\/mark\//i.test(address)) return 'Public Domain Mark';
    return text?.trim() || null;
}

/**
 * Letters of the centre with each correspondent, by the partner rule of buildEgoNetwork(): the
 * other side of a sender-recipient pair; two recipients of one letter did not write to each other
 * @param {Array} letters
 * @param {string} centreId
 * @returns {{partners: Map<string, number>, centre: number}}
 */
export function partnerCounts(letters, centreId) {
    const partners = new Map();
    let centre = 0;
    for (const letter of letters) {
        const from = personKey(letter.sender);
        const recipients = letterRecipients(letter).map(personKey);
        if (from !== centreId && !recipients.includes(centreId)) continue;
        centre++;
        const others = from === centreId ? recipients.filter(k => k && k !== centreId) : (from ? [from] : []);
        new Set(others).forEach(key => partners.set(key, (partners.get(key) || 0) + 1));
    }
    return { partners, centre };
}

/**
 * Letters of the centre that name each person, once per letter
 * @param {Array} letters
 * @param {string} centreId
 * @returns {Map<string, number>}
 */
export function mentionCounts(letters, centreId) {
    const counts = new Map();
    for (const letter of letters) {
        if (!letter.mentions?.persons?.length) continue;
        if (personKey(letter.sender) !== centreId && !letterRecipients(letter).some(p => personKey(p) === centreId)) continue;
        new Set(letter.mentions.persons.map(personKey).filter(Boolean)).forEach(key => counts.set(key, (counts.get(key) || 0) + 1));
    }
    return counts;
}

/**
 * Letters per known sending place; a placeholder such as "Unbekannt" is no place
 * @param {Array} letters
 * @returns {Map<string, {key: string, name: string, count: number, lat: number|null, lon: number|null}>}
 */
export function placeCounts(letters) {
    const places = new Map();
    for (const letter of letters) {
        const place = letter.place_sent;
        if (!isKnownPlace(place)) continue;
        const key = placeKey(place);
        let entry = places.get(key);
        if (!entry) {
            const located = Number.isFinite(place.lat) && Number.isFinite(place.lon);
            entry = { key, name: place.name || key, count: 0, lat: located ? place.lat : null, lon: located ? place.lon : null };
            places.set(key, entry);
        }
        entry.count++;
    }
    return places;
}

// A year on the time axis: the letter's year where it is plausible
const usableYear = letter => (letter.year && !letter.dateImplausible ? letter.year : null);

/**
 * The category a letter has in the charts: its language, the grey rest, or none
 * @param {Object} letter
 * @returns {string}
 */
export function languageKey(letter) {
    const code = letter.language?.code || NO_LANGUAGE;
    return code !== NO_LANGUAGE && isRestLanguage(code) ? 'other' : code;
}

/**
 * Letters per year and language category
 * @param {Array} letters
 * @returns {Map<number, Map<string, number>>}
 */
export function yearLanguageCounts(letters) {
    const years = new Map();
    for (const letter of letters) {
        const year = usableYear(letter);
        if (!year) continue;
        if (!years.has(year)) years.set(year, new Map());
        const stack = years.get(year);
        const key = languageKey(letter);
        stack.set(key, (stack.get(key) || 0) + 1);
    }
    return years;
}

// The dataset-level model of the dashboard, built once per dataset
let model = null;

function buildModel(all) {
    const years = yearLanguageCounts(all);
    const totals = new Map([...years].map(([year, stack]) => [year, [...stack.values()].reduce((a, b) => a + b, 0)]));
    const yearList = [...totals.keys()];
    const hasLanguages = all.some(letter => letter.language?.code);
    const languageTotals = new Map();
    all.forEach(letter => {
        const key = languageKey(letter);
        languageTotals.set(key, (languageTotals.get(key) || 0) + 1);
    });
    // Most frequent language at the bottom of every column, as in the timeline
    const languageOrder = [...languageTotals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);

    const centre = network.mostConnectedPerson(all);
    let ego = centre ? network.buildEgoNetwork(all, centre.id) : null;
    if (ego && ego.inner.length < 2) ego = null;
    if (ego) ego = { ...ego, outer: ego.outer.slice(0, OUTER_LIMIT), chords: ego.chords.slice(0, CHORD_LIMIT) };

    const places = placeCounts(all);
    const located = [...places.values()].filter(p => p.lat !== null).sort((a, b) => b.count - a.count);
    const knownLetters = [...places.values()].reduce((sum, p) => sum + p.count, 0);
    const locatedLetters = located.reduce((sum, p) => sum + p.count, 0);
    const asMap = located.length > 0 && locatedLetters >= knownLetters * MAP_SHARE;

    const subjects = subjectProfiles(all);
    const features = LETTER_FEATURES.filter(f => DASH_FEATURES.includes(f.key))
        .map(f => ({ ...f, total: all.filter(f.test).length }))
        .filter(f => f.total > 0);

    return {
        letters: all,
        years: totals,
        first: yearList.length ? Math.min(...yearList) : null,
        last: yearList.length ? Math.max(...yearList) : null,
        peak: yearList.length ? Math.max(...totals.values()) : 0,
        hasLanguages,
        languageTotals,
        languageOrder,
        centre,
        ego,
        egoIndex: ego ? new Map(ego.inner.map((p, i) => [p.id, i])) : null,
        places,
        located,
        placeMax: located.length ? located[0].count : 1,
        frame: asMap ? mapFrame(located.map(p => [p.lat, p.lon, p.count])) : null,
        asMap,
        subjectTotals: new Map(subjects.subjects.map(s => [s.key, s])),
        hasSubjects: subjects.subjects.length > 0,
        features
    };
}

// The letters under every filter except one dimension, which its own small view shows whole
function lettersBeside(dimension) {
    const filters = state.filters;
    const without = {
        person: { person: null, partner: null },
        place: { place: null },
        subject: { subject: null },
        languages: { languages: null },
        time: { temporal: null, year: null },
        features: { features: null }
    }[dimension];
    // An empty language list is a set filter (no language chosen), so only null counts as unset
    const own = Object.keys(without).some(key => filters[key] !== null && filters[key] !== undefined);
    return own ? state.filterLetters({ ...filters, ...without }) : deps.getFilteredLetters();
}

// What the dashboard draws per part, kept between a filter change and a resize
const view = {
    colors: null,
    time: { cursor: null, anchor: null, drag: null, hover: null, counts: null, filter: null },
    persons: { layout: null, size: '', counts: null, mentions: null, cursor: -1, order: [] },
    places: { layout: null, size: '', counts: null, cursor: -1, order: [], land: null }
};

/**
 * Figures, source and data situation of the dataset in the sidebar, the dashboard in the view
 */
export function renderOverview() {
    const meta = state.getMeta();
    if (!meta) return;
    const all = deps.getAllLetters();
    if (!model || model.letters !== all) {
        model = buildModel(all);
        view.persons.layout = null;
        view.places.layout = null;
        renderDatasetBlock(meta, all);
        bindDashboard();
    }
    const started = performance.now();
    renderDashboard();
    // Measured from a filter change to the redrawn dashboard; read with performance.getEntriesByName
    performance.measure('dashboard', { start: started, end: performance.now() });
}

// The dataset block: what it is in two lines, the data situation as three thin share bars, the
// source in one or two small lines. The transmission features are filters right below it.
function renderDatasetBlock(meta, all) {
    const corpus = deps.getCorpusSummary();
    const quality = deps.getCorpusQuality();
    const title = document.getElementById('overview-title');
    if (title) title.textContent = meta.title || 'Datensatz';

    const what = document.getElementById('meta-what');
    if (what) {
        // Same period as the year slider, so a span such as 1822 to 1922 does not stretch it
        const period = datedYearRange(all) || datedYearRange(all, { includeSpans: true });
        const first = [`${number(all.length)} ${all.length === 1 ? 'Brief' : 'Briefe'}`];
        if (period?.min && period?.max) first.push(period.min === period.max ? String(period.min) : `${period.min}–${period.max}`);
        line(what, [first.join(', '), `${number(corpus.persons.size)} Personen, ${number(corpus.places.size)} Orte`]);
    }

    const shares = document.getElementById('meta-shares');
    if (shares) {
        const percent = ({ known, total }) => (total > 0 ? Math.round((known / total) * 100) : 0);
        shares.replaceChildren(...[
            [percent(quality.dates), 'auf den Tag datiert'],
            [percent(quality.persons), 'mit Normdatensatz'],
            [percent(quality.places), 'mit Koordinaten']
        ].map(([value, text]) => {
            // Neutral tone without a judging colour (ADR-005)
            const row = element('div', 'meta-share');
            const track = element('span', 'meta-share__track');
            const fill = element('span', 'meta-share__fill');
            fill.style.width = `${value}%`;
            track.append(fill);
            row.append(track, element('span', 'meta-share__text', `${value}% ${text}`));
            return row;
        }));
    }

    const source = document.getElementById('meta-source');
    if (source) source.replaceChildren(...sourceLines(meta, all.length));

    const tutorial = document.getElementById('start-tutorial-btn');
    if (tutorial) {
        const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
        tutorial.classList.toggle('hidden', !isDemo);
        if (isDemo && !tutorial.dataset.listenerAdded) {
            tutorial.addEventListener('click', () => startTour());
            tutorial.dataset.listenerAdded = 'true';
        }
    }
}

// Publisher; licence, source file and, for a dataset from several files, how records became
// letters; the change note of a preprocessed dataset (CC BY requires indicating changes)
function sourceLines(meta, total) {
    const tei = meta.teiHeader || {};
    const fromJson = Object.keys(tei).length > 0;
    const publisher = fromJson ? tei.publisher : (meta.publishers?.map(p => p.name).filter(Boolean).join(', ') || null);
    const licenceUrl = safeUrl(fromJson ? tei.licenceTarget : meta.licence?.url);
    const licence = licenceName(licenceUrl, fromJson ? tei.licence : meta.licence?.text);
    const fileUrl = safeUrl(fromJson ? tei.cmifUrl : meta.cmifUrl);

    const lines = [];
    if (publisher) lines.push(element('p', 'meta-source__line', publisher));
    const links = element('p', 'meta-source__line');
    const add = node => {
        if (links.childNodes.length) links.append(', ');
        links.append(node);
    };
    if (licence) add(licenceUrl ? link(licenceUrl, licence) : document.createTextNode(licence));
    if (fileUrl) add(link(fileUrl, 'CMIF-Datei'));
    if (meta.files?.total > 1) {
        let note = `${number(meta.files.loaded)} Dateien`;
        if (meta.files.records > total) note += `, ${number(meta.files.records)} Einträge zu ${number(total)} Briefen zusammengeführt`;
        if (meta.files.skipped?.length) note += `, ${number(meta.files.skipped.length)} weitere Dateien ohne Briefe`;
        add(document.createTextNode(note));
    }
    if (links.childNodes.length) lines.push(links);
    if (meta.modifications) {
        const details = element('details', 'meta-source__changes');
        details.append(element('summary', '', 'Bearbeitet'), element('p', '', meta.modifications));
        lines.push(details);
    }
    return lines;
}

function link(href, text) {
    const a = element('a', '', text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
}

function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function line(container, texts) {
    container.replaceChildren(...texts.map(text => element('span', 'meta-what__line', text)));
}

function svg(name, attributes = {}) {
    const el = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
}

// Wiring that holds for the whole dataset: which parts exist, the labels, pointer and keys
function bindDashboard() {
    const has = {
        time: model.years.size >= 2,
        languages: model.hasLanguages,
        persons: Boolean(model.ego),
        places: model.places.size > 0,
        subjects: model.hasSubjects,
        features: model.features.length >= 2
    };
    toggle('dash-time', !has.time && !has.languages);
    toggle('dash-years-box', !has.time);
    toggle('dash-languages', !has.languages);
    toggle('dash-persons', !has.persons);
    toggle('dash-places', !has.places);
    toggle('dash-places-figure', !model.asMap);
    toggle('dash-place-rows', model.asMap);
    toggle('dash-topics', !has.subjects);
    toggle('dash-features', !has.features);
    toggle('dash-stack', !has.subjects && !has.features);

    const placesOpen = document.querySelector('#dash-places .dash-open');
    if (placesOpen) placesOpen.dataset.open = model.asMap && deps.isViewAvailable?.('map') ? 'map' : 'places';
    document.querySelectorAll('#dashboard .dash-open').forEach(btn => { btn.onclick = () => deps.switchView(btn.dataset.open); });

    if (!bindDashboard.done) {
        bindDashboard.done = true;
        bindTime();
        bindCanvas('persons', document.getElementById('dash-persons-figure'));
        bindCanvas('places', document.getElementById('dash-places-figure'));
        const board = document.getElementById('dashboard');
        let frame = 0;
        new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                if (model && document.getElementById('overview-view')?.classList.contains('active')) renderDashboard();
            });
        }).observe(board);
    }
}

function toggle(id, hidden) {
    document.getElementById(id)?.classList.toggle('hidden', hidden);
}

function renderDashboard() {
    view.colors = readTokens({
        data: '--color-data', primary: '--color-primary', pale: '--color-border-light', control: '--color-border-control',
        text: '--color-text', light: '--color-text-light', bg: '--color-bg', land: '--color-bg-light'
    });
    const filter = deps.getFilterState();
    if (model.years.size >= 2) renderYears(filter);
    if (model.hasLanguages) renderLanguages(filter);
    if (model.ego) renderPersons(filter);
    if (model.places.size) renderPlaces(filter);
    if (model.hasSubjects) renderSubjects(filter);
    if (model.features.length >= 2) renderFeatures(filter);
}

// One tooltip for the dashboard, placed at a point of a figure; also shown for a keyboard cursor
function showTip(figure, x, y, text) {
    const tip = document.getElementById('dash-tip');
    const board = document.getElementById('dashboard');
    if (!tip || !board) return;
    tip.textContent = text;
    tip.classList.remove('hidden');
    const outer = board.getBoundingClientRect();
    const inner = figure.getBoundingClientRect();
    const width = tip.offsetWidth;
    let left = inner.left - outer.left + x + 12;
    if (left + width > outer.width - 4) left = Math.max(4, inner.left - outer.left + x - width - 12);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(0, inner.top - outer.top + y - tip.offsetHeight - 8)}px`;
}

function hideTip() {
    document.getElementById('dash-tip')?.classList.add('hidden');
}

function announce(text) {
    const live = document.getElementById('dash-live');
    if (live) live.textContent = text;
}

// Time: letters per year in the language colours, the dataset pale behind them. Dragging across
// years sets the period, a click one year; the keyboard walks the years with the arrow keys.

function yearGeometry(box) {
    const width = box.clientWidth;
    const height = box.clientHeight;
    const span = model.last - model.first + 1;
    return { width, height, band: width / span, plot: Math.max(height - 5, 10) };
}

function renderYears(filter) {
    const box = document.getElementById('dash-years');
    if (!box) return;
    const base = lettersBeside('time');
    const counts = yearLanguageCounts(base);
    view.time.counts = counts;
    view.time.filter = filter.years;
    const { width, height, band, plot } = yearGeometry(box);
    if (width < 2 || height < 2) return;
    const gap = band >= 4 ? 1 : 0;
    const w = Math.max(band - gap, 0.5);
    const scale = plot / model.peak;
    let pale = '';
    const paths = new Map(model.languageOrder.map(key => [key, '']));
    for (let year = model.first; year <= model.last; year++) {
        const x = (year - model.first) * band;
        const total = model.years.get(year) || 0;
        if (!total) continue;
        const h = Math.max(total * scale, 1);
        pale += `M${x.toFixed(1)} ${(plot - h).toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z`;
        const stack = counts.get(year);
        if (!stack) continue;
        let top = plot;
        for (const key of model.languageOrder) {
            const n = stack.get(key);
            if (!n) continue;
            const segment = n * scale;
            top -= segment;
            // A line of paper between two segments, as in the timeline
            const shown = Math.max(segment - (segment > 4 ? 1 : 0), 0.6);
            paths.set(key, paths.get(key) + `M${x.toFixed(1)} ${top.toFixed(1)}h${w.toFixed(1)}v${shown.toFixed(1)}h${(-w).toFixed(1)}Z`);
        }
    }
    const figure = box.querySelector('svg') || box.appendChild(svg('svg', { 'aria-hidden': 'true', focusable: 'false' }));
    figure.setAttribute('viewBox', `0 0 ${width} ${height}`);
    figure.setAttribute('width', width);
    figure.setAttribute('height', height);
    const parts = [svg('path', { d: pale, class: 'dash-pale' })];
    paths.forEach((d, key) => {
        if (d) parts.push(svg('path', { d, fill: model.hasLanguages ? LANGUAGE_COLORS[key] || LANGUAGE_COLORS.other : view.colors.data }));
    });
    // The chosen period: the years outside it fade, a rust bar runs beneath it
    const range = view.time.drag || filter.years;
    if (range) {
        const [a, b] = [Math.min(...range), Math.max(...range)];
        const x0 = (a - model.first) * band;
        const x1 = (b - model.first + 1) * band;
        if (x0 > 0) parts.push(svg('rect', { x: 0, y: 0, width: x0, height: plot, class: 'dash-fade' }));
        if (x1 < width) parts.push(svg('rect', { x: x1, y: 0, width: width - x1, height: plot, class: 'dash-fade' }));
        parts.push(svg('rect', { x: x0, y: plot + 1, width: Math.max(x1 - x0, 2), height: 4, class: 'dash-chosen' }));
    }
    parts.push(svg('line', { x1: 0, x2: width, y1: plot + 0.5, y2: plot + 0.5, class: 'dash-baseline' }));
    if (view.time.cursor !== null) {
        const x = (view.time.cursor - model.first) * band;
        parts.push(svg('rect', { x: x - 1, y: 0, width: Math.max(band, 2) + 2, height: plot, class: 'dash-cursor' }));
    }
    figure.replaceChildren(...parts);

    const all = model.letters.length;
    const dated = [...counts.values()].reduce((sum, stack) => sum + [...stack.values()].reduce((a, b) => a + b, 0), 0);
    // The axis names first and last year; the label names a chosen period
    setCount('dash-time-count', filter.years ? `${filter.years[0]}${filter.years[0] === filter.years[1] ? '' : `–${filter.years[1]}`}` : '');
    box.setAttribute('aria-label', `Briefe pro Jahr von ${model.first} bis ${model.last}, ${number(dated)} datierte von ${number(all)} Briefen, höchstens ${number(model.peak)} in einem Jahr. Pfeiltasten wählen ein Jahr, mit Umschalt einen Zeitraum, Eingabe setzt ihn, Escape hebt ihn auf.`);
    const axis = document.getElementById('dash-axis');
    if (axis) {
        const middle = filter.years ? 'Ziehen wählt einen anderen Zeitraum, Escape hebt ihn auf' : 'Zeitraum durch Ziehen wählen';
        axis.replaceChildren(element('span', '', String(model.first)), element('span', 'dash-axis__hint', middle), element('span', '', String(model.last)));
    }
}

function yearTip(year) {
    const total = model.years.get(year) || 0;
    const stack = view.time.counts?.get(year);
    const shown = stack ? [...stack.values()].reduce((a, b) => a + b, 0) : 0;
    return `${year}: ${ofLetters(shown, total)}`;
}

function bindTime() {
    const box = document.getElementById('dash-years');
    if (!box) return;
    const yearAt = event => {
        const { band } = yearGeometry(box);
        const x = event.clientX - box.getBoundingClientRect().left;
        return Math.min(model.last, Math.max(model.first, model.first + Math.floor(x / band)));
    };
    const tipAt = year => {
        const { band } = yearGeometry(box);
        showTip(box, (year - model.first + 0.5) * band, 0, yearTip(year));
    };
    box.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        const year = yearAt(event);
        view.time.drag = [year, year];
        box.setPointerCapture(event.pointerId);
        event.preventDefault();
        renderYears(deps.getFilterState());
    });
    box.addEventListener('pointermove', event => {
        const year = yearAt(event);
        tipAt(year);
        if (view.time.drag && view.time.drag[1] !== year) {
            view.time.drag[1] = year;
            renderYears(deps.getFilterState());
        }
    });
    const finish = () => {
        const drag = view.time.drag;
        view.time.drag = null;
        if (!drag) return;
        chooseYears(Math.min(...drag), Math.max(...drag));
    };
    box.addEventListener('pointerup', finish);
    box.addEventListener('pointercancel', () => { view.time.drag = null; renderYears(deps.getFilterState()); });
    box.addEventListener('pointerleave', () => { if (!view.time.drag) hideTip(); });
    box.addEventListener('focus', () => {
        if (view.time.cursor === null) view.time.cursor = view.time.filter ? view.time.filter[0] : peakYear();
        view.time.anchor = view.time.cursor;
        renderYears(deps.getFilterState());
        tipAt(view.time.cursor);
    });
    box.addEventListener('blur', () => {
        view.time.cursor = null;
        hideTip();
        renderYears(deps.getFilterState());
    });
    box.addEventListener('keydown', event => {
        const cursor = view.time.cursor ?? model.first;
        const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[event.key];
        let next = null;
        if (step) next = cursor + step;
        else if (event.key === 'Home') next = model.first;
        else if (event.key === 'End') next = model.last;
        if (next !== null) {
            event.preventDefault();
            view.time.cursor = Math.min(model.last, Math.max(model.first, next));
            if (!event.shiftKey) view.time.anchor = view.time.cursor;
            const a = Math.min(view.time.anchor, view.time.cursor);
            const b = Math.max(view.time.anchor, view.time.cursor);
            renderYears(deps.getFilterState());
            tipAt(view.time.cursor);
            announce(a === b ? yearTip(a) : `${a}–${b}`);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const a = Math.min(view.time.anchor ?? cursor, cursor);
            const b = Math.max(view.time.anchor ?? cursor, cursor);
            chooseYears(a, b);
        } else if (event.key === 'Escape' && view.time.filter) {
            event.preventDefault();
            event.stopPropagation();
            deps.releaseYears();
            box.focus();
        }
    });
}

function peakYear() {
    let best = model.first;
    model.years.forEach((n, year) => { if (n > (model.years.get(best) || 0)) best = year; });
    return best;
}

// The same period again releases it
function chooseYears(a, b) {
    const current = view.time.filter;
    if (current && current[0] === a && current[1] === b) deps.releaseYears(); else deps.setYearRange(a, b);
    if (document.activeElement !== document.getElementById('dash-years')) hideTip();
}

// Languages: the share bar of the selection and its key, which is also the key of the time
// profile above. A key entry or a segment toggles its language; the rest is one category.
function renderLanguages(filter) {
    const box = document.getElementById('dash-languages');
    if (!box) return;
    const base = lettersBeside('languages');
    const counts = new Map();
    base.forEach(letter => {
        const key = languageKey(letter);
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = base.length || 1;
    // The rest is chosen when every chosen language belongs to it, as the rest segment sets it
    const chosen = filter.languages;
    const restOnly = Boolean(chosen?.length) && chosen.every(code => code !== NO_LANGUAGE && isRestLanguage(code));
    const pressed = key => Boolean(chosen) && (key === 'other' ? restOnly : !restOnly && chosen.includes(key));
    const keys = model.languageOrder;
    const label = key => (key === 'other' ? 'Übrige Sprachen' : key === NO_LANGUAGE ? 'Ohne Angabe' : languageLabel(key));
    const bar = element('div', 'dash-share');
    bar.setAttribute('aria-hidden', 'true');
    keys.forEach(key => {
        const n = counts.get(key) || 0;
        if (!n) return;
        // Under a language filter the languages outside it fade, so the bar says what is chosen
        const choice = chosen ? (pressed(key) ? ' is-chosen' : ' is-outside') : '';
        const segment = element('span', `dash-share__segment${choice}`);
        segment.style.width = `${(n / total) * 100}%`;
        segment.style.backgroundColor = LANGUAGE_COLORS[key] || LANGUAGE_COLORS.other;
        segment.dataset.key = key;
        bar.append(segment);
    });
    const legend = element('div', 'dash-key');
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-label', 'Sprachen');
    keys.forEach(key => {
        const n = counts.get(key) || 0;
        const button = element('button', 'dash-key__item');
        button.type = 'button';
        button.dataset.key = key;
        button.setAttribute('aria-pressed', String(pressed(key)));
        button.setAttribute('aria-label', `${label(key)}, ${ofLetters(n, model.languageTotals.get(key) || 0)}`);
        const swatch = element('span', 'dash-key__swatch');
        swatch.style.backgroundColor = LANGUAGE_COLORS[key] || LANGUAGE_COLORS.other;
        button.append(swatch, document.createTextNode(label(key)));
        legend.append(button);
    });
    const focused = document.activeElement?.closest?.('#dash-languages .dash-key__item')?.dataset.key;
    box.replaceChildren(bar, legend);
    box.querySelectorAll('[data-key]').forEach(el => {
        const key = el.dataset.key;
        el.addEventListener('click', () => deps.toggleLanguage(key));
        withTip(el, `${label(key)}: ${ofLetters(counts.get(key) || 0, model.languageTotals.get(key) || 0)}`);
    });
    if (focused) box.querySelector(`.dash-key__item[data-key="${CSS.escape(focused)}"]`)?.focus();
}

// The tooltip of an element, for the pointer and for the keyboard focus alike
function withTip(el, text) {
    const show = () => {
        const board = document.getElementById('dashboard');
        const r = el.getBoundingClientRect();
        const b = board.getBoundingClientRect();
        showTip(board, r.left - b.left + Math.min(r.width / 2, 120), r.top - b.top, text);
    };
    el.addEventListener('pointerenter', show);
    el.addEventListener('pointerleave', hideTip);
    if (el.tabIndex >= 0) {
        el.addEventListener('focus', show);
        el.addEventListener('blur', hideTip);
    }
}

// Canvas figures: the circle and the map. Both draw once per filter change on a canvas sized to
// their box and answer pointer and keyboard through the same few lines: the marks are listed in
// an order, the arrow keys move a cursor through it, Enter chooses, Escape releases.

function prepareCanvas(figure) {
    const canvas = figure.querySelector('canvas');
    const width = figure.clientWidth;
    const height = figure.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height, size: `${width}x${height}` };
}

const PARTS = {
    persons: {
        draw: filter => renderPersons(filter),
        choose: key => deps.togglePerson(key),
        chosen: () => deps.getFilterState().person,
        tip: mark => personTip(mark)
    },
    places: {
        draw: filter => renderPlaces(filter),
        choose: key => deps.togglePlace(key),
        chosen: () => deps.getFilterState().place,
        tip: mark => placeTip(mark)
    }
};

function bindCanvas(name, figure) {
    if (!figure) return;
    const part = view[name];
    const spec = PARTS[name];
    const at = event => {
        const r = figure.getBoundingClientRect();
        const x = event.clientX - r.left;
        const y = event.clientY - r.top;
        let best = null;
        let distance = Infinity;
        for (const mark of part.order) {
            const d = Math.hypot(mark.x - x, mark.y - y) - mark.r;
            if (d < distance && d < 6) { best = mark; distance = d; }
        }
        return best;
    };
    figure.addEventListener('pointermove', event => {
        const mark = at(event);
        figure.classList.toggle('is-over-mark', Boolean(mark));
        if (mark) showTip(figure, mark.x, mark.y - mark.r, spec.tip(mark)); else hideTip();
    });
    figure.addEventListener('pointerleave', () => { if (document.activeElement !== figure) hideTip(); });
    figure.addEventListener('click', event => {
        const mark = at(event);
        if (!mark) return;
        part.cursor = part.order.indexOf(mark);
        spec.choose(mark.key);
    });
    const showCursor = () => {
        const mark = part.order[part.cursor];
        spec.draw(deps.getFilterState());
        if (!mark) return;
        showTip(figure, mark.x, mark.y - mark.r, spec.tip(mark));
        announce(spec.tip(mark));
    };
    figure.addEventListener('focus', () => {
        if (part.cursor < 0) {
            const chosen = spec.chosen();
            const index = part.order.findIndex(mark => mark.key === chosen);
            part.cursor = index >= 0 ? index : 0;
        }
        showCursor();
    });
    figure.addEventListener('blur', () => {
        part.cursor = -1;
        hideTip();
        spec.draw(deps.getFilterState());
    });
    figure.addEventListener('keydown', event => {
        const count = part.order.length;
        if (!count) return;
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[event.key];
        if (step || event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            part.cursor = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : Math.min(count - 1, Math.max(0, part.cursor + step));
            showCursor();
        } else if ((event.key === 'Enter' || event.key === ' ') && part.order[part.cursor]) {
            event.preventDefault();
            spec.choose(part.order[part.cursor].key);
            figure.focus();
            showCursor();
        } else if (event.key === 'Escape' && spec.chosen()) {
            event.preventDefault();
            event.stopPropagation();
            spec.choose(spec.chosen());
            figure.focus();
            showCursor();
        }
    });
}

// Persons: the correspondence circle of the network view in small. Distance from the centre by
// letters, angle by the year of the first dated letter, both from the whole dataset, so the circle
// keeps its shape; the selection fills each mark by its share, the chosen person stands in rust.
function renderPersons(filter) {
    const figure = document.getElementById('dash-persons-figure');
    if (!figure || !model.ego) return;
    const part = view.persons;
    const { ctx, width, height, size } = prepareCanvas(figure);
    if (width < 40 || height < 40) return;
    const ego = model.ego;
    if (!part.layout || part.size !== size) {
        const g = smallGeometry(network, width, height, ego.outer.length > 0);
        const { pos } = network.egoLayout(ego, g);
        const chords = new Path2D();
        ego.chords.forEach(c => {
            const p = pos.get(c.a);
            const q = pos.get(c.b);
            if (!p || !q) return;
            chords.moveTo(p.x, p.y);
            chords.quadraticCurveTo(g.cx, g.cy, q.x, q.y);
        });
        part.layout = { g, pos, chords };
        part.size = size;
    }
    const { g, pos, chords } = part.layout;
    const base = lettersBeside('person');
    const { partners, centre } = partnerCounts(base, model.centre.id);
    part.counts = partners;
    part.centre = centre;
    const mentions = ego.outer.length ? mentionCounts(base, model.centre.id) : null;
    const c = view.colors;

    ctx.lineWidth = 1;
    ctx.strokeStyle = c.pale;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = c.data;
    ctx.stroke(chords);
    ctx.globalAlpha = 1;

    // Mentioned persons outside the rim: hollow, filled where the selection names them
    if (mentions) {
        ego.outer.forEach(p => {
            const at = pos.get(p.id);
            if (!at) return;
            ctx.beginPath();
            ctx.arc(at.x, at.y, 1.8, 0, 2 * Math.PI);
            if (mentions.get(p.id)) {
                ctx.fillStyle = c.data;
                ctx.fill();
            } else {
                ctx.strokeStyle = c.pale;
                ctx.stroke();
            }
        });
    }

    // Weakest first, so the strong marks lie on top
    const order = [];
    for (let i = ego.inner.length - 1; i >= 0; i--) {
        const p = ego.inner[i];
        const at = pos.get(p.id);
        if (!at) continue;
        const r = Math.max(1.6, at.r * 0.75);
        const n = partners.get(p.id) || 0;
        ctx.beginPath();
        ctx.arc(at.x, at.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = c.pale;
        ctx.fill();
        if (n) {
            ctx.beginPath();
            ctx.arc(at.x, at.y, Math.max(1.4, r * Math.sqrt(n / p.letters)), 0, 2 * Math.PI);
            ctx.fillStyle = c.data;
            ctx.fill();
        }
        order.push({ key: p.id, name: p.name, x: at.x, y: at.y, r, n, total: p.letters });
    }
    order.reverse();
    const centreMark = { key: model.centre.id, name: model.centre.name, x: g.cx, y: g.cy, r: 5, n: centre, total: model.ego.centre.letters, isCentre: true };
    order.unshift(centreMark);
    part.order = order;

    ctx.beginPath();
    ctx.arc(g.cx, g.cy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = centre ? c.text : c.pale;
    ctx.fill();
    // The centre is named in the figure; it heads no ranking
    ctx.font = `12px ${getComputedStyle(figure).fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.bg;
    ctx.strokeText(model.centre.name, g.cx, g.cy + 8);
    ctx.fillStyle = c.light;
    ctx.fillText(model.centre.name, g.cx, g.cy + 8);

    const chosen = order.find(mark => mark.key === filter.person);
    if (chosen) markChosen(ctx, chosen, c);
    drawCursor(ctx, order[part.cursor], c);

    const shown = [...partners.values()].filter(Boolean).length;
    setCount('dash-persons-count', `${number(shown)} Briefpartner`);
    figure.setAttribute('aria-label', `Korrespondenzkreis um ${model.centre.name}: ${number(shown)} Briefpartner in der Auswahl, ${number(ego.inner.length)} im Bestand, Abstand zur Mitte nach Briefzahl, Winkel nach dem Jahr des ersten Briefs${mentions ? ', außen die in den Briefen erwähnten Personen' : ''}. Pfeiltasten gehen die Personen nach Briefzahl durch, Eingabe wählt, Escape hebt die Wahl auf.`);
}

function personTip(mark) {
    if (mark.isCentre) return `${mark.name}: ${ofLetters(mark.n, mark.total)}`;
    return `${mark.name}: ${ofLetters(mark.n, mark.total)} mit ${model.centre.name}`;
}

function markChosen(ctx, mark, c) {
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, Math.max(mark.r, 3), 0, 2 * Math.PI);
    ctx.fillStyle = c.primary;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, Math.max(mark.r, 3) + 3, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.primary;
    ctx.stroke();
}

function drawCursor(ctx, mark, c) {
    if (!mark) return;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, Math.max(mark.r, 3) + 5, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.text;
    ctx.stroke();
}

// Places: the sending places on the country outlines, the dataset as pale rings, the selection as
// filled circles on the same scale. Without coordinates the most frequent places stand by name.
function renderPlaces(filter) {
    const base = lettersBeside('place');
    const counts = placeCounts(base);
    view.places.counts = counts;
    const shown = [...counts.values()].filter(p => p.count > 0).length;
    // The name of the part says what is counted
    setCount('dash-places-count', shown === model.places.size ? number(shown) : `${number(shown)} von ${number(model.places.size)}`);
    if (model.asMap) drawMap(filter, counts); else placeRows(filter, counts);
}

function drawMap(filter, counts) {
    const figure = document.getElementById('dash-places-figure');
    if (!figure) return;
    const part = view.places;
    const { ctx, width, height, size } = prepareCanvas(figure);
    if (width < 40 || height < 40) return;
    if (!part.layout || part.size !== size) {
        const project = frameProjection(model.frame, width, height);
        const points = model.located.map(p => {
            const [x, y] = project(p.lat, p.lon);
            return { key: p.key, name: p.name, total: p.count, x, y, r: 1.2 + 9 * Math.sqrt(p.count / model.placeMax) };
        }).filter(p => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
        part.layout = { project, points, land: null };
        part.size = size;
        loadLand().then(features => {
            if (!features || part.layout?.project !== project) return;
            part.layout.land = new Path2D(landPath(features, model.frame, project));
            drawMap(deps.getFilterState(), part.counts);
        });
    }
    const { points, land } = part.layout;
    const c = view.colors;
    if (land) {
        ctx.fillStyle = c.land;
        ctx.fill(land);
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = c.pale;
        ctx.stroke(land);
    }
    // Largest first, so the small places lie on top
    ctx.lineWidth = 1;
    points.forEach(p => {
        p.n = counts.get(p.key)?.count || 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.strokeStyle = c.control;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (p.n) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(2, 1.2 + 9 * Math.sqrt(p.n / model.placeMax)), 0, 2 * Math.PI);
            ctx.fillStyle = c.data;
            ctx.globalAlpha = 0.75;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });
    part.order = points;
    const chosen = points.find(p => p.key === filter.place);
    if (chosen) markChosen(ctx, chosen, c);
    drawCursor(ctx, points[part.cursor], c);
    const outside = model.places.size - points.length;
    figure.setAttribute('aria-label', `Karte der Absendeorte: ${number(points.length)} Orte im Ausschnitt${outside > 0 ? `, ${number(outside)} ohne Koordinaten oder außerhalb` : ''}, Kreisfläche nach Briefzahl. Pfeiltasten gehen die Orte nach Briefzahl durch, Eingabe wählt, Escape hebt die Wahl auf.`);
}

function placeTip(mark) {
    return `${mark.name}: ${ofLetters(mark.n || 0, mark.total)}`;
}

// Rows of the most frequent places by name, as many as the box holds; the chosen one stays
function placeRows(filter, counts) {
    const box = document.getElementById('dash-place-rows');
    if (!box) return;
    const fit = Math.min(ROW_LIMIT.place, Math.max(3, Math.floor(box.clientHeight / ROW_HEIGHT.place) || ROW_LIMIT.place));
    const ranked = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'));
    const rows = pinChosen(ranked, filter.place, fit, key => counts.get(key) || { key, name: model.places.get(key)?.name || key, count: 0 });
    const peak = Math.max(1, ...rows.map(r => model.places.get(r.key)?.count || r.count));
    renderRows(box, rows.map(r => ({
        key: r.key, label: r.name, count: r.count, total: model.places.get(r.key)?.count || r.count, peak, pressed: r.key === filter.place
    })), key => deps.togglePlace(key));
    if (rows.length === 0) box.replaceChildren(element('p', 'dash-empty', 'Keine Absendeorte in dieser Auswahl.'));
}

function pinChosen(ranked, chosen, fit, fallback) {
    const rows = ranked.slice(0, fit);
    if (chosen && !rows.some(r => r.key === chosen)) rows.splice(Math.max(fit - 1, 0), 1, fallback(chosen));
    return rows;
}

// Buttons with a bar: the dataset as a pale track, the selection on the same scale
function renderRows(box, rows, choose) {
    const focused = document.activeElement?.closest?.('.dash-row-item')?.dataset.key;
    box.replaceChildren(...rows.map(row => {
        const button = element('button', 'dash-row-item');
        button.type = 'button';
        button.dataset.key = row.key;
        button.setAttribute('aria-pressed', String(row.pressed));
        const track = element('span', 'dash-row-item__track');
        const whole = element('span', 'dash-row-item__whole');
        whole.style.width = `${(row.total / row.peak) * 100}%`;
        const part = element('span', 'dash-row-item__fill');
        part.style.width = `${(row.count / row.peak) * 100}%`;
        track.append(whole, part);
        button.setAttribute('aria-label', `${row.label}, ${ofLetters(row.count, row.total)}`);
        button.append(element('span', 'dash-row-item__label', row.label), track);
        button.addEventListener('click', () => choose(row.key));
        withTip(button, `${row.label}: ${ofLetters(row.count, row.total)}`);
        return button;
    }));
    if (focused) box.querySelector(`.dash-row-item[data-key="${CSS.escape(focused)}"]`)?.focus();
}

// Subjects: the most frequent subjects of the selection as small year profiles on one scale and
// over the years of the time profile, the dataset pale behind them; a row toggles its subject
function renderSubjects(filter) {
    const box = document.getElementById('dash-subjects');
    if (!box) return;
    const profiles = subjectProfiles(lettersBeside('subject'));
    const bySubject = new Map(profiles.subjects.map(s => [s.key, s]));
    const ranked = profiles.subjects.filter(s => s.total > 0).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'de'));
    const fit = Math.min(ROW_LIMIT.subject, Math.max(3, Math.floor(box.clientHeight / ROW_HEIGHT.subject) || 6));
    const rows = pinChosen(ranked, filter.subject, fit, key => bySubject.get(key) || { key, label: model.subjectTotals.get(key)?.label || key, total: 0, years: new Map() });
    const first = model.first ?? profiles.yearMin;
    const last = model.last ?? profiles.yearMax;
    const span = Math.max(1, (last ?? 0) - (first ?? 0) + 1);
    let max = 1;
    rows.forEach(row => model.subjectTotals.get(row.key)?.years.forEach(n => { if (n > max) max = n; }));
    setCount('dash-topics-count', ranked.length === model.subjectTotals.size ? number(ranked.length) : `${number(ranked.length)} von ${number(model.subjectTotals.size)}`);
    const focused = document.activeElement?.closest?.('#dash-subjects .dash-subject')?.dataset.key;
    box.replaceChildren(...rows.filter(Boolean).map(row => {
        const whole = model.subjectTotals.get(row.key);
        const button = element('button', 'dash-subject');
        button.type = 'button';
        button.dataset.key = row.key;
        button.setAttribute('aria-pressed', String(row.key === filter.subject));
        button.setAttribute('aria-label', `${row.label}, ${ofLetters(row.total || 0, whole?.total || 0)}`);
        const head = element('span', 'dash-subject__head');
        head.append(element('span', 'dash-subject__label', row.label));
        const profile = svg('svg', { class: 'dash-subject__profile', viewBox: `0 0 ${span} 10`, preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
        const bars = years => {
            let d = '';
            years?.forEach((n, year) => {
                if (year < first || year > last) return;
                const h = Math.max((n / max) * 10, 0.6);
                d += `M${year - first} ${(10 - h).toFixed(2)}h0.86v${h.toFixed(2)}h-0.86Z`;
            });
            return d;
        };
        profile.append(svg('path', { d: bars(whole?.years), class: 'dash-pale' }), svg('path', { d: bars(row.years), class: 'dash-subject__bars' }));
        button.append(head, profile);
        button.addEventListener('click', () => deps.toggleSubject(row.key));
        withTip(button, `${row.label}: ${ofLetters(row.total || 0, whole?.total || 0)}`);
        return button;
    }));
    if (rows.length === 0) box.replaceChildren(element('p', 'dash-empty', 'Keine Themen in dieser Auswahl.'));
    if (focused) box.querySelector(`.dash-subject[data-key="${CSS.escape(focused)}"]`)?.focus();
}

// Transmission: what the letter records carry, each as its share of the selection on a thin bar,
// the idiom of the start page; a share toggles its feature as the filter of the sidebar does
function renderFeatures(filter) {
    const box = document.getElementById('dash-feature-rows');
    if (!box) return;
    const base = lettersBeside('features');
    const focused = document.activeElement?.closest?.('#dash-feature-rows .dash-feature')?.dataset.key;
    box.replaceChildren(...model.features.map(f => {
        const count = base.filter(f.test).length;
        const button = element('button', 'dash-feature');
        button.type = 'button';
        button.dataset.key = f.key;
        button.setAttribute('aria-pressed', String(filter.features.includes(f.key)));
        const head = element('span', 'dash-feature__head');
        head.append(element('span', 'dash-feature__label', f.label));
        button.setAttribute('aria-label', `${f.label}, ${ofLetters(count, base.length)}`);
        const track = element('span', 'dash-feature__track');
        const fill = element('span', 'dash-feature__fill');
        fill.style.width = `${base.length ? (count / base.length) * 100 : 0}%`;
        track.append(fill);
        button.append(head, track);
        button.addEventListener('click', () => deps.toggleFeature(f.key));
        withTip(button, `${f.label}: ${ofLetters(count, base.length)}`);
        return button;
    }));
    if (focused) box.querySelector(`.dash-feature[data-key="${CSS.escape(focused)}"]`)?.focus();
}

function setCount(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
