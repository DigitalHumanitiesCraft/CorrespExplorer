// Topics view: what the letters are about, when, how much, and with whom. Two figures of the same
// subjects:
// - The grid, the default: one row per subject, one cell per year, shaded on one fixed scale for
//   every figure; a bar at the end of the row counts all letters of the subject. The rows that fit
//   the screen are the most frequent subjects, ordered from early to late peak; scrolling leads to
//   the next block of the same size, and the search reaches every subject.
// - The treemap ("Anteile"): every subject an area by its letters, grouped by the kind of subject
//   the data carry; the course of a chosen subject stands below the map as its row of the grid.
// Choosing a subject sets the subject filter; the strip under the figure then names the
// correspondents, places and neighbouring subjects of the choice, each a filter of its own.
// The grid is painted on a canvas, because some hundred rows of seventy cells would be thousands of
// nodes rebuilt on every scroll; the names are HTML options above it, so they keep focus, keyboard
// and accessible names, and the pointer is matched to rows and years by geometry.

import { escapeHtml, foldText, debounce, isMultiYearSpan, personKey, placeKey, letterRecipients, isUnknownPlaceName } from '../utils.js';
import { state } from '../state-manager.js';
import { renderDataTable } from './view-support.js';
import { formatNumber as fmt, plural } from '../formatters.js';
import { findEgo } from './network-view.js';
import { languageCategory, languageColor } from '../selection-ui.js';
import { languageLabel } from '../constants.js';

const ORDERS = ['peak', 'size', 'first'];
const VARIANTS = ['grid', 'treemap'];
// Subjects that are languages (Lexvo and the language list of the HSA) against all other subjects;
// the categories come from cmif-parser.js (categorizeSubject)
const LANGUAGE_CATEGORIES = new Set(['lexvo', 'hsa_language']);
// Below this figure width the names stand above their cells instead of in a column beside them
const NARROW_WIDTH = 600;
// Marks in the strip of the chosen subject: correspondents, places, neighbouring subjects
const MARKS = { wide: [4, 2, 2], narrow: [3, 1, 0] };
// Lower bounds of the four shades of the grid, one fixed scale for every figure and filter: a year
// with 1, 2 to 3, 4 to 9, or 10 and more letters. Fixed bounds keep a shade comparable between
// filter states; over the whole HSA the steps hold about 60, 26, 12 and 3 % of the filled cells.
const SHADE_BOUNDS = [1, 2, 4, 10];
// Smallest area of a subject of its own in the treemap, 60 x 60 px: a short name fits, the target is
// far above 24 x 24 px, and the map keeps fewer unnamed slivers
const MIN_AREA = 3600;

let deps = {};
let order = 'peak';
let query = '';
let model = null;
let geom = null;
let ink = null;
let bound = false;
let frame = 0;
let hoverIndex = -1;
let hoverYear = null;
let lastChosen = null;
let tableStale = true;
let variant = 'grid';
// Keys of the tail opened in the treemap, null for the whole map
let drill = null;
const egoCache = { letters: null, ego: null, totals: null };

const el = id => document.getElementById(id);
const span = (a, b) => (a === b ? String(a) : `${a}–${b}`);
// The one form of counts (design.md, rule 7): "20 von 257 Briefen", the whole alone as "257 Briefe"
const ofLetters = (part, whole) => (part === whole ? plural(whole, 'Brief', 'Briefe') : `${fmt(part)} von ${plural(whole, 'Brief', 'Briefen')}`);

/**
 * Key of a subject, the same expression the state manager filters with
 * @param {{uri?: string, id?: string, label?: string}} subject
 * @returns {string}
 */
function subjectKey(subject) {
    return subject.uri || subject.id || subject.label;
}

// A letter has a year on the time axis when it is dated within one plausible year; a span over
// several years says nothing about when it was written (decision E5, as in the other time axes)
function yearOf(letter) {
    const year = letter.year;
    if (!Number.isInteger(year) || year < 1400 || year > 2100 || isMultiYearSpan(letter)) return null;
    return year;
}

/**
 * Letters per subject and year. A subject counts once per letter, also when the letter names it
 * twice. Letters without a year count in the total and in `undated`, not on the time axis.
 * @param {Array} letters
 * @returns {{subjects: Array<{key: string, label: string, kind: string, total: number, undated: number, years: Map<number, number>, first: number|null, last: number|null, peak: number|null, peakCount: number}>, yearMin: number|null, yearMax: number|null, maxYearCount: number}}
 */
export function subjectProfiles(letters) {
    const byKey = new Map();
    let yearMin = Infinity;
    let yearMax = -Infinity;
    for (const letter of letters) {
        const subjects = letter.mentions?.subjects;
        if (!subjects?.length) continue;
        const year = yearOf(letter);
        const seen = new Set();
        for (const subject of subjects) {
            const key = subjectKey(subject);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            let entry = byKey.get(key);
            if (!entry) {
                entry = { key, label: subject.label || key, kind: LANGUAGE_CATEGORIES.has(subject.category) ? 'language' : 'topic', total: 0, undated: 0, years: new Map() };
                byKey.set(key, entry);
            }
            entry.total++;
            if (year === null) {
                entry.undated++;
            } else {
                entry.years.set(year, (entry.years.get(year) || 0) + 1);
                if (year < yearMin) yearMin = year;
                if (year > yearMax) yearMax = year;
            }
        }
    }
    let maxYearCount = 0;
    const subjects = [...byKey.values()];
    for (const s of subjects) {
        s.first = null;
        s.last = null;
        s.peak = null;
        s.peakCount = 0;
        for (const [year, count] of s.years) {
            if (s.first === null || year < s.first) s.first = year;
            if (s.last === null || year > s.last) s.last = year;
            // The earliest of several equal maxima is the peak
            if (count > s.peakCount || (count === s.peakCount && year < s.peak)) {
                s.peak = year;
                s.peakCount = count;
            }
        }
        if (s.peakCount > maxYearCount) maxYearCount = s.peakCount;
    }
    return {
        subjects,
        yearMin: yearMin <= yearMax ? yearMin : null,
        yearMax: yearMin <= yearMax ? yearMax : null,
        maxYearCount
    };
}

const bySize = (a, b) => b.total - a.total || a.label.localeCompare(b.label, 'de');
// Subjects without a dated letter have no peak and no first year and close their block
const byYear = field => (a, b) => (a[field] ?? Infinity) - (b[field] ?? Infinity) || bySize(a, b);

/**
 * Order of the rows. By size the subjects run from most to fewest letters. By peak year or first
 * appearance the subjects are first ranked by size and cut into blocks of `block` rows; each block
 * runs from early to late, so the first screen holds the most frequent subjects and reads in time.
 * With `languagesApart` the subjects that are languages follow the other subjects as a group of
 * their own, ordered the same way (US-44: languages apart from the other subjects). They follow,
 * because an archive can name hundreds of dialects, which would push every other subject off the
 * first screen.
 * @param {Array} subjects - entries of subjectProfiles
 * @param {'peak'|'size'|'first'} by
 * @param {number} block - rows per block, the rows that fit the screen
 * @param {{languagesApart?: boolean}} [options]
 * @returns {Array}
 */
export function orderSubjects(subjects, by, block, { languagesApart = false } = {}) {
    if (languagesApart) {
        return [...orderSubjects(subjects.filter(s => s.kind !== 'language'), by, block),
            ...orderSubjects(subjects.filter(s => s.kind === 'language'), by, block)];
    }
    const ranked = [...subjects].sort(bySize);
    if (by === 'size') return ranked;
    const compare = byYear(by === 'first' ? 'first' : 'peak');
    const size = Math.max(1, Math.floor(block) || 1);
    const ordered = [];
    for (let i = 0; i < ranked.length; i += size) {
        ordered.push(...ranked.slice(i, i + size).sort(compare));
    }
    return ordered;
}

/**
 * Subjects whose label contains the search, both folded (case and diacritics)
 * @param {Array} subjects
 * @param {string} search
 * @returns {Array}
 */
export function matchSubjects(subjects, search) {
    const needle = foldText(search.trim());
    if (!needle) return subjects;
    return subjects.filter(s => foldText(s.label).includes(needle));
}

/**
 * The most frequent entries of a count over letters, each counted once per letter
 * @param {Array} letters
 * @param {function(Object): Array<{key: string, name: string}>} entriesOf
 * @param {number} n
 * @returns {Array<{key: string, name: string, count: number}>}
 */
export function topEntries(letters, entriesOf, n) {
    const counts = new Map();
    for (const letter of letters) {
        const seen = new Set();
        for (const { key, name } of entriesOf(letter)) {
            if (!key || seen.has(key)) continue;
            seen.add(key);
            const entry = counts.get(key) || { key, name: name || key, count: 0 };
            entry.count++;
            counts.set(key, entry);
        }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de')).slice(0, n);
}

/**
 * Step of the grid's shade for a yearly count, 0 for an empty year
 * @param {number} count
 * @returns {number} 0 to 4
 */
export function shadeStep(count) {
    let step = 0;
    for (const bound of SHADE_BOUNDS) if (count >= bound) step++;
    return step;
}

/**
 * Subjects with an area of their own in a treemap and the tail. A subject stands alone when its
 * share of all mentions gives it at least `minArea` of the map; with `singlesApart` a subject of one
 * letter always joins the tail, because its size says nothing beside the others and a hundred
 * single squares turn the map into dust. The tail is one area that opens to its subjects.
 * @param {Array} subjects - entries of subjectProfiles
 * @param {number} area - area of the whole map in px²
 * @param {{minArea?: number, singlesApart?: boolean, mentions?: number}} [options] - mentions: the
 *   sum the share refers to, by default the sum of `subjects`
 * @returns {{shown: Array, rest: Array, mentions: number}}
 */
export function splitTail(subjects, area, { minArea = MIN_AREA, singlesApart = true, mentions } = {}) {
    const sum = subjects.reduce((n, s) => n + s.total, 0);
    const whole = mentions ?? sum;
    const shown = [];
    const rest = [];
    for (const s of [...subjects].sort(bySize)) {
        const own = whole ? (s.total / whole) * area : 0;
        if (own >= minArea && !(singlesApart && s.total === 1)) shown.push(s);
        else rest.push(s);
    }
    return { shown, rest, mentions: sum };
}

/**
 * The groups of the treemap. The data carry a kind only as the vocabulary of a subject's URI
 * (categorizeSubject): languages (Lexvo and the language list of the HSA) and the other subjects.
 * Where a dataset has one kind, the map has no groups.
 * @param {Array} subjects
 * @param {number} area
 * @param {{minArea?: number, singlesApart?: boolean}} [options]
 * @returns {Array<{kind: string|null, name: string|null, shown: Array, rest: Array, mentions: number}>}
 */
export function mapGroups(subjects, area, options = {}) {
    const mentions = subjects.reduce((n, s) => n + s.total, 0);
    const kinds = [['language', 'Sprachen'], ['topic', 'Übrige Themen']].filter(([kind]) => subjects.some(s => s.kind === kind));
    if (kinds.length < 2) return [{ kind: null, name: null, ...splitTail(subjects, area, options) }];
    // The tail rule reads each subject's share of the whole map, not of its group
    return kinds.map(([kind, name]) => ({ kind, name, ...splitTail(subjects.filter(s => s.kind === kind), area, { ...options, mentions }) }));
}

/**
 * Name of the tail area, e.g. "117 weitere Themen mit je einem Brief"
 * @param {Array} rest
 * @returns {string}
 */
export function restLabel(rest) {
    const n = rest.length;
    const counts = rest.map(s => s.total);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const letters = c => (c === 1 ? 'einem Brief' : `${fmt(c)} Briefen`);
    if (n === 1) return `1 weiteres Thema mit ${letters(min)}`;
    const per = min === max ? `mit je ${letters(min)}` : `mit je ${fmt(min)} bis ${fmt(max)} Briefen`;
    return `${fmt(n)} weitere Themen ${per}`;
}

/**
 * What the tail holds of the whole, e.g. "zusammen 7.403 von 23.020 Nennungen"
 * @param {Array} rest
 * @param {number} whole - all mentions of the map
 * @returns {string}
 */
export function restShare(rest, whole) {
    const sum = rest.reduce((n, s) => n + s.total, 0);
    return `zusammen ${fmt(sum)} von ${plural(whole, 'Nennung', 'Nennungen')}`;
}

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getFilteredLetters - letters of all filters, the chosen subject included
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.toggleSubject - sets or releases the subject filter
 * @param {Function} dependencies.togglePerson - sets or releases the person filter
 * @param {Function} dependencies.togglePlace - sets or releases the place filter
 */
export function initTopicsView(dependencies) {
    deps = dependencies;
    // variant=treemap opens the map; variant=grid and no parameter open the grid
    if (new URLSearchParams(window.location.search).get('variant') === 'treemap') variant = 'treemap';
}

// The figure shows the letters of all filters except the subject: a chosen subject stands out among
// the others instead of leaving the figure alone with the subjects of its own letters
function lettersBesideSubject() {
    return state.filterLetters({ ...state.filters, subject: null });
}

// The person on at least half of all letters (the bequeather of an archive) takes part in nearly
// every subject and would head every list of correspondents, so the strip names the others
function datasetContext() {
    const all = deps.getAllLetters?.() || state.getAllLetters();
    if (egoCache.letters !== all) {
        egoCache.letters = all;
        egoCache.ego = findEgo(all);
        egoCache.totals = new Set(all.flatMap(l => (l.mentions?.subjects || []).map(subjectKey))).size;
        egoCache.languages = [...new Set(all.map(l => l.language?.code).filter(Boolean))];
    }
    return egoCache;
}

/**
 * The colour of a subject (rule 5), as on the start view: a subject named like a language of the
 * letters takes the colour of that language, a language subject outside the coloured languages the
 * grey of the rest. Every other subject keeps the data tone of the figure (null).
 * @param {{kind: string, label: string}} subject
 * @returns {string|null}
 */
function subjectHue(subject) {
    if (subject.kind !== 'language') return null;
    const code = datasetContext().languages.find(c => languageLabel(c) === subject.label);
    return languageColor(code ? languageCategory(code) : 'other');
}

// The four shades of a hue, mixed as the data shades --tp-step-1 to 4 in topics.css
const hueSteps = (hue, paper, text) => [
    `color-mix(in srgb, ${hue} 18%, ${paper})`, `color-mix(in srgb, ${hue} 40%, ${paper})`,
    `color-mix(in srgb, ${hue} 66%, ${paper})`, `color-mix(in srgb, ${hue} 55%, ${text})`
];

/**
 * Subjects shown and in the dataset, for the title of the view; null before the first render
 * @returns {{shown: number, total: number}|null}
 */
export function topicCounts() {
    if (!model) return null;
    return { shown: model.profiles.subjects.length, total: datasetContext().totals };
}

/**
 * Render the figure from the current filters. Called by explore.js on every filter change and when
 * the view opens.
 */
export function renderTopicsList() {
    const figure = el('topics-figure');
    if (!figure) return;
    bind();
    readInk();
    const beside = lettersBesideSubject();
    const profiles = subjectProfiles(beside);
    profiles.subjects.forEach(s => {
        s.hue = subjectHue(s);
        s.steps = s.hue ? hueSteps(s.hue, ink.paper, ink.text) : null;
    });
    const kinds = new Set(profiles.subjects.map(s => s.kind));
    // The shared key explains the language colours of the subjects and is the language filter;
    // its last mark names the data tone of the other subjects
    deps.renderLanguageKey?.(el('topics-language-key'), {
        others: profiles.subjects.some(s => !s.hue) ? [{ label: 'Übrige Themen', color: ink.steps[2] }] : []
    });
    model = {
        profiles,
        letterCount: beside.length,
        maxTotal: profiles.subjects.reduce((m, s) => Math.max(m, s.total), 1),
        twoKinds: kinds.size > 1,
        chosen: state.filters.subject || null,
        rows: []
    };
    applyVariant();
    measure();
    arrange();
    renderChoice();
    renderTable();
    if (variant === 'treemap') {
        renderMap();
    } else {
        renderAxis();
        revealChosen();
        draw();
    }
}

// Show the parts of the chosen figure; the order serves the grid only, the search both
function applyVariant() {
    const map = variant === 'treemap';
    el('topics-figure')?.classList.toggle('hidden', map);
    el('topics-axis')?.classList.toggle('hidden', map);
    el('topics-map')?.classList.toggle('hidden', !map);
    el('topics-map-note')?.classList.toggle('hidden', !map);
    el('topics-order')?.classList.toggle('hidden', map);
    el('topics-key')?.classList.toggle('hidden', map);
    el('topic-search')?.setAttribute('aria-controls', map ? 'topics-map-areas' : 'topics-rows');
    document.querySelectorAll('#topics-variants [data-variant]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.variant === variant)));
}

// The map stands in the address, so a shared link opens it; the grid needs no parameter
function writeVariant() {
    const url = new URL(window.location.href);
    if (variant === 'treemap') url.searchParams.set('variant', 'treemap');
    else url.searchParams.delete('variant');
    window.history.replaceState(window.history.state, '', url);
}

// Order and search applied to the profiles; renders the row list
function arrange() {
    const block = geom ? geom.block : 30;
    model.block = block;
    model.rows = orderSubjects(matchSubjects(model.profiles.subjects, query), order, block, { languagesApart: model.twoKinds });
    // The first row of the languages, where a rule in ink separates them from the other subjects
    model.groupBreak = model.twoKinds ? model.rows.findIndex(s => s.kind === 'language') : -1;
    model.index = new Map(model.rows.map((s, i) => [s.key, i]));
    renderRows();
}

function readInk() {
    const css = getComputedStyle(el('topics-figure'));
    const token = name => css.getPropertyValue(name).trim();
    ink = {
        chosen: token('--color-primary'), text: token('--color-text'), grid: token('--color-border-light'),
        rule: token('--color-border-control'), quiet: token('--color-text-light'), band: token('--color-bg-light'),
        paper: token('--color-bg'),
        steps: [1, 2, 3, 4].map(n => token(`--tp-step-${n}`))
    };
}

// Geometry of the grid for its current size: row pitch, name column, cells, bar column and blocks
function measure() {
    const scroll = el('topics-scroll');
    const width = scroll?.clientWidth || 0;
    const height = scroll?.clientHeight || 0;
    if (!width || !height) {
        geom = geom && geom.width ? geom : null;
        return;
    }
    const narrow = width < NARROW_WIDTH;
    // 26px leaves about twenty rows on a laptop screen, the most the first screen carries as text
    // beside header and rail (density limit of the work profile); a phone puts the name above
    const pitch = narrow ? 38 : 26;
    // The name column grows with the screen up to 300px, where long titles of journals fit
    const nameW = narrow ? 0 : Math.round(Math.min(300, Math.max(150, width * 0.2)));
    const plotX0 = narrow ? 12 : nameW + 12;
    const barW = narrow ? 44 : Math.round(Math.min(140, Math.max(90, width * 0.08)));
    const plotX1 = width - 16 - barW;
    geom = {
        width, height, narrow, pitch, nameW, plotX0, plotX1, barW,
        cellH: narrow ? 16 : pitch - 8,
        // A block is the rows of the first screen. It follows the window, not the figure, so that
        // the strip of a chosen subject or the open drawer, which shorten the figure, do not
        // reorder it; the subtrahend is the height of the bars above and below the figure.
        block: Math.max(8, Math.floor((window.innerHeight - (narrow ? 300 : 250)) / pitch))
    };
}

function xOf(year) {
    const { yearMin, yearMax } = model.profiles;
    const { plotX0, plotX1 } = geom;
    return plotX0 + ((year - yearMin) / (yearMax - yearMin + 1)) * (plotX1 - plotX0);
}

function yearAt(x) {
    const { yearMin, yearMax } = model.profiles;
    const { plotX0, plotX1 } = geom;
    if (yearMin === null || x < plotX0 || x > plotX1) return null;
    const year = Math.floor(yearMin + ((x - plotX0) / (plotX1 - plotX0)) * (yearMax - yearMin + 1));
    return Math.max(yearMin, Math.min(yearMax, year));
}

function describe(s) {
    const letters = ofLetters(s.total, model.letterCount);
    if (s.first === null) return `${letters}, ohne Jahr`;
    const undated = s.undated ? `, davon ${fmt(s.undated)} ohne Jahr` : '';
    return `${letters}, ${span(s.first, s.last)}, die meisten ${s.peak} (${fmt(s.peakCount)})${undated}`;
}

function renderRows() {
    const list = el('topics-rows');
    const empty = el('topics-empty');
    if (!list) return;
    const focusedKey = list.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const current = focusedKey ?? (model.chosen && model.index.has(model.chosen) ? model.chosen : model.rows[0]?.key);
    const rows = model.rows;
    list.classList.toggle('tp-rows--narrow', Boolean(geom?.narrow));
    // A single-select listbox: one tab stop, the options carry name and numbers
    list.innerHTML = rows.map((s, i) => {
        const chosen = s.key === model.chosen;
        const kind = model.twoKinds && s.kind === 'language' ? ' (Sprache)' : '';
        return `<li role="option" class="tp-row${chosen ? ' tp-row--chosen' : ''}" data-i="${i}" data-key="${escapeHtml(s.key)}" aria-selected="${chosen}" aria-label="${escapeHtml(`${s.label}${kind}: ${describe(s)}`)}" tabindex="${s.key === current ? 0 : -1}"><span class="tp-row__name">${escapeHtml(s.label)}</span></li>`;
    }).join('');
    if (geom) {
        list.style.setProperty('--tp-pitch', `${geom.pitch}px`);
        list.style.setProperty('--tp-name-width', `${geom.nameW}px`);
    }
    let message = '';
    if (model.profiles.subjects.length === 0) message = 'Die Auswahl enthält keinen Brief mit Thema.';
    else if (rows.length === 0) message = `Kein Thema enthält „${query.trim()}“.`;
    if (empty) {
        empty.textContent = message;
        empty.classList.toggle('hidden', !message);
    }
    if (focusedKey) list.querySelector(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
}

// The axis of the grid: a tick for every year, a label at round years, and over the bar column
// the scale of the bars; the key line of the shades stands in the bar of the figure
function renderAxis() {
    const axis = el('topics-axis');
    const key = el('topics-key');
    if (!axis) return;
    const { yearMin, yearMax } = model.profiles;
    if (!geom || yearMin === null) {
        axis.innerHTML = '';
        if (key) key.innerHTML = '';
        return;
    }
    const cellW = (geom.plotX1 - geom.plotX0) / (yearMax - yearMin + 1);
    const step = tickStep(yearMax - yearMin + 1, geom.plotX1 - geom.plotX0);
    const ticks = [];
    let path = '';
    for (let y = yearMin; y <= yearMax; y++) {
        const x = (xOf(y) + cellW / 2).toFixed(1);
        const labelled = y % step === 0 || (yearMax - yearMin < step && (y === yearMin || y === yearMax));
        path += `M${x} ${labelled ? 12 : 16}V20`;
        if (labelled) ticks.push(`<span class="tp-axis__year" style="left:${x}px">${y}</span>`);
    }
    const barX = geom.plotX1 + 10;
    axis.innerHTML = `<svg class="tp-axis__ticks" width="${geom.width}" height="20" aria-hidden="true"><path d="${path}"/></svg>${ticks.join('')}<span class="tp-axis__bar" style="left:${barX}px;width:${geom.width - 16 - barX}px">bis ${plural(model.maxTotal, 'Brief', 'Briefe')}</span>`;
    if (key) {
        const sw = n => `<span class="tp-key__swatch tp-key__swatch--s${n}"></span>`;
        key.innerHTML = `<span class="tp-key__line">Briefe je Jahr ${sw(1)} 1 ${sw(2)} 2–3 ${sw(3)} 4–9 ${sw(4)} 10 und mehr <span class="tp-key__peak"></span> die meisten, Balken: alle Briefe des Themas</span>`;
    }
}

function tickStep(years, width) {
    // Labels at least about 44px apart, a year label and some air: every year where a period is
    // short (a reader matched a cell to the wrong year when only every other year was labelled,
    // reading test of 2026-11-14), every fifth year over the HSA's seven decades
    const fit = Math.max(1, Math.floor(width / 44));
    return [1, 2, 5, 10, 20, 25, 50, 100].find(step => years / step <= fit) || 100;
}

// The chosen subject: who writes about it, from where, and with which subjects
function renderChoice() {
    const strip = el('topics-choice');
    if (!strip) return;
    const subject = model.chosen ? model.profiles.subjects.find(s => s.key === model.chosen) : null;
    if (!subject) {
        strip.classList.add('hidden');
        strip.innerHTML = '';
        return;
    }
    const letters = deps.getFilteredLetters();
    const { ego } = datasetContext();
    const [nPersons, nPlaces, nRelated] = MARKS[geom?.narrow ? 'narrow' : 'wide'];
    const persons = topEntries(letters, letter => [letter.sender, ...letterRecipients(letter)]
        .map(p => ({ key: personKey(p), name: p?.name }))
        .filter(p => p.key && p.key !== ego?.id), nPersons);
    const places = topEntries(letters, letter => (letter.place_sent && !isUnknownPlaceName(letter.place_sent.name)
        ? [{ key: placeKey(letter.place_sent), name: letter.place_sent.name }] : []), nPlaces);
    const related = topEntries(letters, letter => (letter.mentions?.subjects || [])
        .map(s => ({ key: subjectKey(s), name: s.label }))
        .filter(s => s.key !== subject.key), nRelated);
    const marks = (entries, attr, pressedKey) => {
        const max = entries[0]?.count || 1;
        return entries.map(e => {
            const r = 2 + 5 * Math.sqrt(e.count / max);
            const pressed = pressedKey === e.key;
            // The size of the mark carries the count; the number itself is in name and title
            const label = escapeHtml(`${e.name}: ${ofLetters(e.count, letters.length)}`);
            return `<button type="button" class="tp-mark" data-${attr}="${escapeHtml(e.key)}" aria-pressed="${pressed}" aria-label="${label}" title="${label}"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="${r.toFixed(1)}"/></svg><span class="tp-mark__name">${escapeHtml(e.name)}</span></button>`;
        }).join('');
    };
    const group = (label, html) => (html ? `<div class="tp-choice__group"><span class="tp-choice__label">${label}</span>${html}</div>` : '');
    // Name and number of the chosen subject stand in its row and in the line of the selection at
    // the lower edge, which also opens its letters; the strip adds only what they lack. Beside the
    // map it carries the course of the subject, its row of the grid.
    const egoNote = ego ? ` ohne ${escapeHtml(ego.name)}` : '';
    const course = variant === 'treemap' ? courseHtml(subject) : '';
    strip.innerHTML = `${course}${group(`Korrespondenten${egoNote}`, marks(persons, 'person', state.filters.person))}
        ${group('Orte', marks(places, 'place', state.filters.place))}
        ${group('Zusammen mit', marks(related, 'subject', null))}`;
    strip.classList.remove('hidden');
}

// The years of one subject as a row of cells in the shades of the grid, over the years of the figure
function courseHtml(subject) {
    const { yearMin, yearMax } = model.profiles;
    if (yearMin === null || subject.first === null) return '';
    const years = yearMax - yearMin + 1;
    const cells = [...subject.years].map(([year, count]) => `<rect class="tp-course__s${shadeStep(count)}" x="${(year - yearMin) * 10 + 0.5}" y="0" width="9" height="16"><title>${year}: ${plural(count, 'Brief', 'Briefe')}</title></rect>`).join('');
    return `<div class="tp-choice__group tp-course"><span class="tp-choice__label">${yearMin}</span><svg class="tp-course__cells" viewBox="0 0 ${years * 10} 16" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(`${subject.label}, ${describe(subject)}`)}"><rect class="tp-course__base" x="0" y="15" width="${years * 10}" height="1"/>${cells}</svg><span class="tp-choice__label">${yearMax}</span></div>`;
}

// The treemap: every subject an area by the letters that name it, under all filters but the
// subject; laid out by the squarified treemap of the vendored D3. A search shows the subjects it
// finds as a map of their own, so it reaches a subject inside the tail as well.
function renderMap() {
    const host = el('topics-map');
    const list = el('topics-map-areas');
    const groupsHost = el('topics-map-groups');
    const text = el('topics-map-text');
    if (!host || !list) return;
    const searching = Boolean(query.trim());
    let subjects = model.profiles.subjects;
    if (searching) {
        subjects = matchSubjects(subjects, query);
    } else if (drill) {
        subjects = subjects.filter(s => drill.has(s.key));
        if (!subjects.length) {
            drill = null;
            subjects = model.profiles.subjects;
        }
    }
    const opened = searching || Boolean(drill);
    el('topics-map-back')?.classList.toggle('hidden', !opened);
    const W = host.clientWidth;
    const H = host.clientHeight;
    // Without the vendored D3 (a failed load) the map stays empty and the grid keeps working
    const d3 = typeof window.d3?.treemap === 'function' ? window.d3 : null;
    const mentions = subjects.reduce((n, s) => n + s.total, 0);
    if (text) {
        text.textContent = !model.profiles.subjects.length
            ? 'Die Auswahl enthält keinen Brief mit Thema.'
            : searching
                ? (subjects.length ? `${plural(subjects.length, 'Thema enthält', 'Themen enthalten')} „${query.trim()}“, zusammen ${plural(mentions, 'Nennung', 'Nennungen')}.` : `Kein Thema enthält „${query.trim()}“.`)
                : drill
                    ? `${plural(subjects.length, 'Thema', 'Themen')} mit zusammen ${plural(mentions, 'Nennung', 'Nennungen')}.`
                    : `Ein Brief nennt oft mehrere Themen, die Flächen zählen deshalb ${plural(mentions, 'Nennung', 'Nennungen')} in ${plural(model.letterCount, 'Brief', 'Briefen')}.`;
    }
    if (!W || !H || !d3 || !subjects.length) {
        list.innerHTML = '';
        if (groupsHost) groupsHost.innerHTML = '';
        model.areas = [];
        return;
    }
    // A larger screen gives the same subjects larger areas rather than more of them: at most about
    // a hundred areas of their own, so a wide map does not turn into a field of unnamed slivers
    const groups = mapGroups(subjects, W * H, { singlesApart: !opened, minArea: Math.max(MIN_AREA, (W * H) / 100) });
    const grouped = groups.length > 1;
    const sumOf = items => items.reduce((n, s) => n + s.total, 0);
    const nodeOf = g => ({ group: g, children: [...g.shown.map(s => ({ s, group: g })), ...(g.rest.length ? [{ rest: g }] : [])] });
    const root = d3.hierarchy(grouped ? { children: groups.map(nodeOf) } : nodeOf(groups[0]))
        .sum(d => (d.s ? d.s.total : d.rest ? sumOf(d.rest.rest) : 0))
        // The tail closes its group, whatever its size
        .sort((a, b) => (a.data.rest ? 1 : 0) - (b.data.rest ? 1 : 0) || b.value - a.value);
    d3.treemap().tile(d3.treemapSquarify).size([W, H]).paddingInner(2)
        .paddingTop(n => (grouped && n.depth === 1 ? 20 : 0))(root);
    if (groupsHost) {
        groupsHost.innerHTML = grouped
            ? root.children.map(g => `<span class="tp-map__group" style="left:${g.x0.toFixed(1)}px;top:${g.y0.toFixed(1)}px;width:${(g.x1 - g.x0).toFixed(1)}px">${escapeHtml(g.data.group.name)}</span>`).join('')
            : '';
    }
    const leaves = root.leaves();
    model.areas = leaves.map(n => n.data);
    const focusedKey = list.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const keyOf = d => (d.rest ? `rest:${d.rest.kind ?? ''}` : d.s.key);
    const current = focusedKey ?? (model.chosen && leaves.some(n => keyOf(n.data) === model.chosen) ? model.chosen : keyOf(leaves[0].data));
    list.innerHTML = leaves.map((n, i) => {
        const d = n.data;
        const w = n.x1 - n.x0;
        const h = n.y1 - n.y0;
        const key = keyOf(d);
        const chosen = !d.rest && key === model.chosen;
        const name = d.rest ? restLabel(d.rest.rest) : d.s.label;
        const share = d.rest ? restShare(d.rest.rest, mentions) : '';
        const label = d.rest
            ? `${name}, ${share}, Enter öffnet sie`
            : `${name}${grouped ? ` (${d.group.name})` : ''}: ${ofLetters(d.s.total, model.letterCount)}`;
        // A name stands in an area with room for two short lines; the others name themselves on
        // hover and focus, because names broken into syllables in narrow areas read as noise
        const fits = w >= 72 && h >= 30;
        const inner = d.rest && h >= 46 ? `${escapeHtml(name)}, ${escapeHtml(share)}` : escapeHtml(name);
        const cls = `tp-area${d.rest ? ' tp-area--rest' : ''}${chosen ? ' tp-area--chosen' : ''}`;
        // A language takes its colour here as in the grid (rule 5)
        const hue = d.s?.hue ? `--tp-hue:${d.s.hue};` : '';
        return `<li role="option" class="${cls}" data-i="${i}" data-key="${escapeHtml(key)}" aria-selected="${chosen}" aria-label="${escapeHtml(label)}" tabindex="${key === current ? 0 : -1}" style="${hue}left:${n.x0.toFixed(1)}px;top:${n.y0.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px">${fits ? `<span class="tp-area__name">${inner}</span>` : ''}</li>`;
    }).join('');
    model.mapMentions = mentions;
    if (focusedKey) list.querySelector(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus();
}

function showMapTooltip(li) {
    const tip = el('topics-map-tooltip');
    const host = el('topics-map');
    const d = model?.areas?.[Number(li.dataset.i)];
    if (!tip || !host || !d) return;
    const lines = d.rest
        ? [restLabel(d.rest.rest), restShare(d.rest.rest, model.mapMentions), 'Ein Klick öffnet sie']
        : [d.s.label, describe(d.s)];
    tip.innerHTML = lines.map(escapeHtml).join('<br>');
    tip.classList.remove('hidden');
    const x = li.offsetLeft + li.offsetWidth / 2;
    const y = li.offsetTop;
    tip.style.left = `${Math.max(4, Math.min(host.clientWidth - tip.offsetWidth - 4, x - tip.offsetWidth / 2))}px`;
    tip.style.top = `${y - tip.offsetHeight - 6 >= 0 ? y - tip.offsetHeight - 6 : Math.min(host.clientHeight - tip.offsetHeight - 4, y + li.offsetHeight + 6)}px`;
}

function hideMapTooltip() {
    el('topics-map-tooltip')?.classList.add('hidden');
}

// An area chooses its subject like a row; the tail opens its subjects as a map of their own
function actOnArea(li) {
    const d = model?.areas?.[Number(li.dataset.i)];
    if (!d) return;
    if (d.rest) {
        drill = new Set(d.rest.rest.map(s => s.key));
        hideMapTooltip();
        renderMap();
        el('topics-map-areas')?.querySelector('.tp-area')?.focus();
    } else {
        deps.toggleSubject(d.s.key);
    }
}

// The table of all rows costs more than the figure, so it is built when it is shown; hidden, the
// shared switch stands over a table of one row
function renderTable() {
    const host = el('topics-table');
    if (!host) return;
    const shown = host.dataset.tableShown === 'true';
    tableStale = !shown;
    const rows = model.rows.map(s => [s.label, model.twoKinds ? (s.kind === 'language' ? 'Sprache' : 'Thema') : 'Thema', s.total, s.first ?? '', s.peak ?? '', s.last ?? '']);
    renderDataTable(host, {
        caption: 'Themen mit Briefen, erstem Jahr, Jahr der meisten Briefe und letztem Jahr',
        columns: ['Thema', 'Art', 'Briefe', 'Erstes Jahr', 'Meiste Briefe', 'Letztes Jahr'],
        rows: shown ? rows : rows.slice(0, 1),
        limit: Math.max(1, rows.length)
    });
}

// A subject chosen elsewhere (a link, the overview, a mark of the strip) scrolls into view
function revealChosen() {
    const chosen = model.chosen;
    if (chosen === lastChosen) return;
    lastChosen = chosen;
    const i = chosen ? model.index.get(chosen) : undefined;
    const scroll = el('topics-scroll');
    if (i === undefined || !scroll || !geom) return;
    const top = i * geom.pitch;
    if (top < scroll.scrollTop || top + geom.pitch > scroll.scrollTop + scroll.clientHeight) {
        scroll.scrollTop = Math.max(0, top - scroll.clientHeight / 2);
    }
}

function scheduleDraw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
}

// The grid: one cell per subject and year in the shade of its step, an empty year stays empty; a
// quiet band behind every other decade; the year of the most letters underlined; at the right a
// bar of all letters of the subject on one linear scale for the figure, over a track of the scale
function draw() {
    const canvas = el('topics-canvas');
    const scroll = el('topics-scroll');
    if (!canvas || !scroll || !model || !geom || !ink || variant !== 'grid') return;
    const { width, height, pitch, plotX0, plotX1, block, cellH } = geom;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const { yearMin, yearMax } = model.profiles;
    if (yearMin === null || !model.rows.length) return;
    const top = scroll.scrollTop;
    const cellW = (plotX1 - plotX0) / (yearMax - yearMin + 1);
    const barX0 = plotX1 + 10;
    const barLen = width - 16 - barX0;

    // Every other decade on a quiet band, so the eye finds a year in seventy columns; a period of
    // under twenty years has its year labels close enough, and a band there read as a meaning
    // (reading test of 2026-11-14)
    if (yearMax - yearMin >= 20) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = ink.band;
        for (let d = Math.floor(yearMin / 10) * 10; d <= yearMax; d += 10) {
            if ((d / 10) % 2 !== 0) continue;
            const x0 = xOf(Math.max(d, yearMin));
            const x1 = xOf(Math.min(d + 10, yearMax + 1));
            ctx.fillRect(x0, 0, x1 - x0, height);
        }
        ctx.globalAlpha = 1;
    }
    // Where a cell is wide enough, it carries its number: a first-time reader took a year of six
    // letters for "10 und mehr" from the shade alone (reading test of 2026-11-14)
    const numbered = cellW >= 22;
    if (numbered) {
        ctx.font = `12px ${getComputedStyle(canvas).fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    }

    const first = Math.max(0, Math.floor(top / pitch));
    const last = Math.min(model.rows.length - 1, Math.ceil((top + height) / pitch));
    const blocked = order !== 'size';
    for (let i = first; i <= last; i++) {
        const s = model.rows[i];
        const y0 = i * pitch - top + pitch - cellH - 3;
        const chosen = s.key === model.chosen;
        // The languages stand apart as their own group, under a rule in ink; the blocks of each
        // group count from its first row
        const groupStart = model.groupBreak > 0 && i >= model.groupBreak ? model.groupBreak : 0;
        if (i === model.groupBreak && i > 0) {
            ctx.fillStyle = ink.text;
            ctx.fillRect(0, Math.round(i * pitch - top) - 1, width, 2);
        } else if (blocked && i > groupStart && (i - groupStart) % block === 0) {
            ctx.fillStyle = ink.rule;
            ctx.fillRect(0, Math.round(i * pitch - top), width, 1);
        }
        // A hairline under the years, so an empty year reads as empty and not as missing
        ctx.fillStyle = ink.grid;
        ctx.fillRect(plotX0, y0 + cellH, plotX1 - plotX0, 1);
        for (const [year, count] of s.years) {
            const step = shadeStep(count);
            // The chosen subject in rust at the same four steps, a language in its colour, all
            // other subjects in the data tone
            if (chosen) {
                ctx.globalAlpha = [0.3, 0.5, 0.75, 1][step - 1];
                ctx.fillStyle = ink.chosen;
            } else {
                ctx.fillStyle = (s.steps || ink.steps)[step - 1];
            }
            ctx.fillRect(plotX0 + (year - yearMin) * cellW + 0.5, y0, Math.max(1, cellW - 1), cellH);
            ctx.globalAlpha = 1;
            if (numbered) {
                ctx.fillStyle = step >= 3 ? ink.paper : ink.text;
                ctx.fillText(fmt(count), plotX0 + (year - yearMin + 0.5) * cellW, y0 + cellH / 2 + 1);
            }
        }
        // The year of the most letters, underlined in ink: in the blocks ordered by peak the
        // marks run from early to late
        if (s.peak !== null) {
            ctx.fillStyle = ink.text;
            ctx.fillRect(plotX0 + (s.peak - yearMin) * cellW + 0.5, y0 + cellH - 1, Math.max(2, cellW - 1), 3);
        }
        ctx.fillStyle = ink.grid;
        ctx.fillRect(barX0, y0 + cellH / 2 - 3, barLen, 6);
        ctx.fillStyle = chosen ? ink.chosen : ink.quiet;
        ctx.fillRect(barX0, y0 + cellH / 2 - 3, Math.max(1.5, (barLen * s.total) / model.maxTotal), 6);
    }
    // The cell under the pointer
    if (hoverYear !== null && hoverIndex >= first && hoverIndex <= last) {
        const y0 = hoverIndex * pitch - top + pitch - cellH - 3;
        ctx.strokeStyle = ink.text;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(plotX0 + (hoverYear - yearMin) * cellW) + 0.5, Math.round(y0) - 1.5, Math.max(2, Math.round(cellW)), cellH + 3);
    }
}

function showTooltip(i, year, anchorX) {
    const tip = el('topics-tooltip');
    const s = model?.rows[i];
    if (!tip || !s || !geom) return;
    const scroll = el('topics-scroll');
    const lines = [];
    if (year !== null) lines.push(`${s.label}, ${year}: ${plural(s.years.get(year) || 0, 'Brief', 'Briefe')}`);
    else lines.push(s.label);
    lines.push(describe(s));
    tip.innerHTML = lines.map(escapeHtml).join('<br>');
    tip.classList.remove('hidden');
    const rowTop = i * geom.pitch - scroll.scrollTop;
    const x = anchorX ?? geom.plotX0;
    tip.style.left = `${Math.max(4, Math.min(geom.width - tip.offsetWidth - 4, x + 12))}px`;
    const above = rowTop - tip.offsetHeight - 6;
    tip.style.top = `${above >= 0 ? above : rowTop + geom.pitch + 6}px`;
}

function hideTooltip() {
    el('topics-tooltip')?.classList.add('hidden');
}

function setHover(i, year) {
    if (i === hoverIndex && year === hoverYear) return;
    hoverIndex = i;
    hoverYear = year;
    scheduleDraw();
}

function bind() {
    if (bound) return;
    bound = true;
    const scroll = el('topics-scroll');
    const list = el('topics-rows');

    // Scrolling moves the rows away from a pointer tooltip; a focused row keeps its tooltip,
    // because focusing a row far down scrolls the figure to it
    scroll.addEventListener('scroll', () => {
        const focused = list.contains(document.activeElement) ? document.activeElement : null;
        if (focused) requestAnimationFrame(() => showTooltip(Number(focused.dataset.i), null));
        else hideTooltip();
        scheduleDraw();
    }, { passive: true });

    // The shared switch of the table shows a table of one row until it is first opened; then the
    // full table is built and the focus stays on the switch
    el('topics-table')?.addEventListener('click', (e) => {
        if (!e.target.closest('.chart-table__switch') || !tableStale || !model) return;
        if (el('topics-table').dataset.tableShown !== 'true') return;
        renderTable();
        el('topics-table').querySelector('.chart-table__switch')?.focus();
    });

    // Pointer: the row under it by its band, the year by its position on the axis
    scroll.addEventListener('pointermove', (e) => {
        if (!model || !geom) return;
        const rect = scroll.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const i = Math.floor((e.clientY - rect.top + scroll.scrollTop) / geom.pitch);
        if (i < 0 || i >= model.rows.length) {
            setHover(-1, null);
            hideTooltip();
            return;
        }
        const year = yearAt(mx);
        setHover(i, year);
        showTooltip(i, year, mx);
    });
    scroll.addEventListener('pointerleave', () => {
        setHover(-1, null);
        hideTooltip();
    });

    // A row chooses its subject, the chosen row releases it
    list.addEventListener('click', (e) => {
        const row = e.target.closest('.tp-row');
        if (row) deps.toggleSubject(row.dataset.key);
    });
    // One tab stop for the list; arrows, Home, End and the page keys move within it, Enter and
    // Space choose or release the subject of the focused row, Escape releases the choice
    list.addEventListener('keydown', (e) => {
        const rows = [...list.querySelectorAll('.tp-row')];
        const index = rows.indexOf(document.activeElement);
        if (index < 0) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            deps.toggleSubject(rows[index].dataset.key);
            return;
        }
        if (e.key === 'Escape' && model?.chosen) {
            e.preventDefault();
            deps.toggleSubject(model.chosen);
            return;
        }
        const page = geom ? Math.max(1, geom.block - 1) : 10;
        const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1, PageDown: index + page, PageUp: index - page }[e.key];
        if (target === undefined) return;
        e.preventDefault();
        const next = rows[Math.max(0, Math.min(rows.length - 1, target))];
        rows.forEach(r => { r.tabIndex = r === next ? 0 : -1; });
        next.focus();
    });
    // Focus shows what hover shows: the row emphasised and its numbers
    list.addEventListener('focusin', (e) => {
        const row = e.target.closest('.tp-row');
        if (!row) return;
        const i = Number(row.dataset.i);
        setHover(i, null);
        // Wait for the scroll that focusing caused, so the tooltip finds the row where it now is
        requestAnimationFrame(() => showTooltip(i, null));
    });
    list.addEventListener('focusout', (e) => {
        if (list.contains(e.relatedTarget)) return;
        setHover(-1, null);
        hideTooltip();
    });

    el('topics-order')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-order]');
        if (!btn || !ORDERS.includes(btn.dataset.order) || btn.dataset.order === order) return;
        order = btn.dataset.order;
        document.querySelectorAll('#topics-order [data-order]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        el('topics-scroll').scrollTop = 0;
        arrange();
        renderTable();
        draw();
    });

    const search = el('topic-search');
    const applySearch = () => {
        query = search.value;
        if (variant === 'treemap') {
            drill = null;
            renderMap();
            return;
        }
        el('topics-scroll').scrollTop = 0;
        arrange();
        renderTable();
        draw();
    };
    search?.addEventListener('input', debounce(applySearch, 150));
    search?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Enter chooses the first, in the map the largest, subject the search finds
            e.preventDefault();
            if (query !== search.value) applySearch();
            const firstKey = variant === 'treemap'
                ? model?.areas?.find(d => d.s)?.s.key
                : model?.rows[0]?.key;
            if (firstKey && firstKey !== model.chosen) deps.toggleSubject(firstKey);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const target = variant === 'treemap' ? '#topics-map-areas .tp-area[tabindex="0"]' : '#topics-rows .tp-row[tabindex="0"]';
            document.querySelector(target)?.focus();
        }
    });

    el('topics-variants')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-variant]');
        if (!btn || !VARIANTS.includes(btn.dataset.variant) || btn.dataset.variant === variant) return;
        variant = btn.dataset.variant;
        drill = null;
        writeVariant();
        el('topics-scroll').scrollTop = 0;
        hideTooltip();
        hideMapTooltip();
        renderTopicsList();
    });

    // Treemap: one tab stop; arrows and Home/End move in the order of size, Enter or a click
    // chooses, Escape releases; hover and focus name the area
    const areas = el('topics-map-areas');
    areas?.addEventListener('click', (e) => {
        const li = e.target.closest('.tp-area');
        if (li) actOnArea(li);
    });
    areas?.addEventListener('keydown', (e) => {
        const items = [...areas.querySelectorAll('.tp-area')];
        const index = items.indexOf(document.activeElement);
        if (index < 0) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            actOnArea(items[index]);
            return;
        }
        if (e.key === 'Escape') {
            if (model?.chosen) deps.toggleSubject(model.chosen);
            else if (drill || query) el('topics-map-back')?.click();
            e.preventDefault();
            return;
        }
        const target = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }[e.key];
        if (target === undefined) return;
        e.preventDefault();
        const next = items[Math.max(0, Math.min(items.length - 1, target))];
        items.forEach(it => { it.tabIndex = it === next ? 0 : -1; });
        next.focus();
    });
    const previewArea = (e) => {
        const li = e.target.closest?.('.tp-area');
        if (li) showMapTooltip(li);
    };
    areas?.addEventListener('pointerover', previewArea);
    areas?.addEventListener('focusin', previewArea);
    areas?.addEventListener('pointerleave', hideMapTooltip);
    areas?.addEventListener('focusout', (e) => { if (!areas.contains(e.relatedTarget)) hideMapTooltip(); });
    // Back to all subjects: closes an opened tail and clears the search
    el('topics-map-back')?.addEventListener('click', () => {
        drill = null;
        if (search && query) {
            search.value = '';
            query = '';
        }
        renderMap();
        el('topics-map-areas')?.querySelector('.tp-area')?.focus();
    });
    new ResizeObserver(() => {
        if (model && variant === 'treemap' && el('topics-view')?.classList.contains('active')) renderMap();
    }).observe(el('topics-map'));

    el('topics-choice')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.person) deps.togglePerson(btn.dataset.person);
        else if (btn.dataset.place) deps.togglePlace(btn.dataset.place);
        else if (btn.dataset.subject) deps.toggleSubject(btn.dataset.subject);
    });

    // Refit when the figure changes size while visible (window, rail, drawer, breakpoint)
    new ResizeObserver(() => {
        if (!model || variant !== 'grid' || !el('topics-view')?.classList.contains('active')) return;
        const before = geom ? `${geom.block}/${geom.narrow}/${geom.width}` : '';
        measure();
        if (!geom) return;
        if (`${geom.block}/${geom.narrow}/${geom.width}` !== before) {
            arrange();
            renderAxis();
        }
        draw();
    }).observe(scroll);
}
