// Topics view: one figure of what the letters are about, when, and with whom. Every subject is a
// row whose ridge shows its letters per year on a shared time axis (a ridgeline). The rows that fit
// the screen are the most frequent subjects, ordered from early to late peak; scrolling leads to
// the next block of the same size, again from early to late, and the search reaches every subject.
// Choosing a row sets the subject filter; the strip under the figure then names the correspondents,
// places and neighbouring subjects of the choice, each a filter of its own.
// The ridges are painted on a canvas, because a figure of some hundred rows with a path each would
// need thousands of SVG nodes rebuilt on every scroll; the names are HTML buttons above it, so they
// keep focus, keyboard and the accessible names, and the pointer is matched to rows by geometry.

import { escapeHtml, foldText, debounce, isMultiYearSpan, personKey, placeKey, letterRecipients, isUnknownPlaceName } from '../utils.js';
import { state } from '../state-manager.js';
import { renderDataTable } from './view-support.js';
import { findEgo } from './network-view.js';

export const ORDERS = ['peak', 'size', 'first'];
// Subjects that are languages (Lexvo and the language list of the HSA) against all other subjects;
// the categories come from cmif-parser.js (categorizeSubject)
const LANGUAGE_CATEGORIES = new Set(['lexvo', 'hsa_language']);
// Below this figure width the names stand above their ridge instead of in a column beside it
const NARROW_WIDTH = 600;
// Marks in the strip of the chosen subject: correspondents, places, neighbouring subjects. A phone
// shows fewer and leaves the neighbours to the dark inner ridges of the figure.
const MARKS = { wide: [4, 2, 2], narrow: [3, 1, 0] };
// Three figures of the same subjects under trial until the operator chooses (2026-11-14): the
// course of each subject (ridge, the default), its share of all (treemap) and its years on one
// common scale (grid)
export const VARIANTS = ['ridge', 'treemap', 'grid'];
// Lower bounds of the four shades of the grid, one fixed scale for every figure and filter: a year
// with 1, 2 to 3, 4 to 9, or 10 and more letters. Fixed bounds keep a shade comparable between
// filter states; over the whole HSA the steps hold about 60, 26, 12 and 3 % of the filled cells.
export const SHADE_BOUNDS = [1, 2, 4, 10];
// Smallest area of a subject of its own in the treemap, 60 x 60 px: a short name fits, the target is
// far above 24 x 24 px, and the map keeps fewer unnamed slivers
export const MIN_AREA = 3600;

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
let variant = 'ridge';
// Keys of the tail opened in the treemap, null for the whole map
let drill = null;
const egoCache = { letters: null, ego: null, totals: null };

const el = id => document.getElementById(id);
const fmt = n => n.toLocaleString('de-DE');
const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
const span = (a, b) => (a === b ? String(a) : `${a}–${b}`);

/**
 * Key of a subject, the same expression the state manager filters with
 * @param {{uri?: string, id?: string, label?: string}} subject
 * @returns {string}
 */
export function subjectKey(subject) {
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
 * @param {Array} subjects - entries of subjectProfiles
 * @param {'peak'|'size'|'first'} by
 * @param {number} block - rows per block, the rows that fit the screen
 * @returns {Array}
 */
export function orderSubjects(subjects, by, block) {
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
 * @param {Object} dependencies
 * @param {Function} dependencies.getFilteredLetters - letters of all filters, the chosen subject included
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.toggleSubject - sets or releases the subject filter
 * @param {Function} dependencies.togglePerson - sets or releases the person filter
 * @param {Function} dependencies.togglePlace - sets or releases the place filter
 * @param {Function} dependencies.revealLetters - opens the letters of the selection in the drawer
 */
export function initTopicsView(dependencies) {
    deps = dependencies;
    const asked = new URLSearchParams(window.location.search).get('variant');
    if (VARIANTS.includes(asked)) variant = asked;
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
    }
    return egoCache;
}

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
    const kinds = new Set(profiles.subjects.map(s => s.kind));
    model = {
        profiles,
        letterCount: beside.length,
        twoKinds: kinds.size > 1,
        chosen: state.filters.subject || null,
        rows: [],
        co: null
    };
    model.co = model.chosen ? coOccurrence(model.chosen) : null;
    applyVariant();
    measure();
    arrange();
    if (variant !== 'treemap') renderAxis();
    renderChoice();
    renderTable();
    if (variant === 'treemap') {
        renderMap();
    } else {
        revealChosen();
        draw();
    }
}

// Show the parts of the chosen variant; order and search serve the row figures only
function applyVariant() {
    const map = variant === 'treemap';
    el('topics-figure')?.classList.toggle('hidden', map);
    el('topics-axis')?.classList.toggle('hidden', map);
    el('topics-map')?.classList.toggle('hidden', !map);
    el('topics-map-note')?.classList.toggle('hidden', !map);
    el('topics-order')?.classList.toggle('hidden', map);
    el('topic-search')?.classList.toggle('hidden', map);
    document.querySelectorAll('#topics-variants [data-variant]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.variant === variant)));
}

// The variant stands in the address, so a shared link opens the same figure
function writeVariant() {
    const url = new URL(window.location.href);
    if (variant === 'ridge') url.searchParams.delete('variant');
    else url.searchParams.set('variant', variant);
    window.history.replaceState(window.history.state, '', url);
}

// Order and search applied to the profiles; renders the row list
function arrange() {
    const block = geom ? geom.block : 30;
    model.block = block;
    model.rows = orderSubjects(matchSubjects(model.profiles.subjects, query), order, block);
    model.index = new Map(model.rows.map((s, i) => [s.key, i]));
    renderRows();
}

// Letters per year that share a letter with the chosen subject, per other subject
function coOccurrence(chosen) {
    const co = new Map();
    for (const letter of deps.getFilteredLetters()) {
        const year = yearOf(letter);
        if (year === null) continue;
        const seen = new Set();
        for (const s of letter.mentions?.subjects || []) {
            const key = subjectKey(s);
            if (key === chosen || seen.has(key)) continue;
            seen.add(key);
            let years = co.get(key);
            if (!years) co.set(key, (years = new Map()));
            years.set(year, (years.get(year) || 0) + 1);
        }
    }
    return co;
}

function readInk() {
    const css = getComputedStyle(el('topics-figure'));
    const token = name => css.getPropertyValue(name).trim();
    ink = {
        topic: token('--color-role-topic'), language: token('--color-data'), chosen: token('--color-primary'),
        chosenBand: token('--color-primary-light'), hoverBand: token('--color-bg-light'), bg: token('--color-bg'),
        grid: token('--color-border-light'), rule: token('--color-border-control'), cursor: token('--color-text-light'),
        steps: [1, 2, 3, 4].map(n => token(`--tp-step-${n}`))
    };
}

// Geometry of the figure for its current size: row pitch, ridge height, name column and blocks
function measure() {
    const scroll = el('topics-scroll');
    const width = scroll?.clientWidth || 0;
    const height = scroll?.clientHeight || 0;
    if (!width || !height) {
        geom = geom && geom.width ? geom : null;
        return;
    }
    const narrow = width < NARROW_WIDTH;
    // Narrow: the name takes the upper part of the row and the ridge stays below it; wide: the
    // ridge rises over the rows above, as a ridgeline does, so the rows can stay close
    // 26px leaves about twenty rows on a laptop screen, the most the first screen carries as
    // text beside header and sidebar (density limit of the work profile)
    const pitch = narrow ? 38 : 26;
    const nameW = narrow ? 0 : Math.round(Math.min(230, Math.max(140, width * 0.24)));
    const plotX0 = narrow ? 12 : nameW + 12;
    // The grid keeps a column at the right for the bar of all letters of a subject
    const grid = variant === 'grid';
    const barW = grid ? (narrow ? 40 : 80) : 0;
    const plotX1 = width - 16 - barW;
    geom = {
        width, height, narrow, pitch, nameW, plotX0, plotX1, barW,
        ridge: narrow ? 20 : Math.round(pitch * 2.2),
        // Room above the first row for the part of its ridge that rises over the row; the grid
        // has no overlap
        offset: narrow || grid ? 0 : Math.round(pitch * 1.2),
        // A block is the rows of the first screen. It follows the window, not the figure, so that
        // the strip of a chosen subject or the open drawer, which shorten the figure, do not
        // reorder it; the subtrahend is the height of header, axis, table line and drawer line.
        block: Math.max(8, Math.floor((window.innerHeight - (narrow ? 300 : 246)) / pitch))
    };
}

function xOf(year) {
    const { yearMin, yearMax } = model.profiles;
    const { plotX0, plotX1 } = geom;
    return plotX0 + ((year - yearMin + 0.5) / (yearMax - yearMin + 1)) * (plotX1 - plotX0);
}

function yearAt(x) {
    const { yearMin, yearMax } = model.profiles;
    const { plotX0, plotX1 } = geom;
    if (yearMin === null || x < plotX0 || x > plotX1) return null;
    const year = Math.floor(yearMin + ((x - plotX0) / (plotX1 - plotX0)) * (yearMax - yearMin + 1));
    return Math.max(yearMin, Math.min(yearMax, year));
}

// Height of a count: square root of its share of the largest yearly count, so a subject with a
// few letters a year still shows its course beside one with dozens; the key names the values
function heightOf(count) {
    if (!count) return 0;
    return Math.max(1.5, geom.ridge * Math.sqrt(count / model.profiles.maxYearCount));
}

function describe(s) {
    if (s.first === null) return `${plural(s.total, 'Brief', 'Briefe')}, ohne Jahr`;
    const undated = s.undated ? `, davon ${fmt(s.undated)} ohne Jahr` : '';
    return `${plural(s.total, 'Brief', 'Briefe')} ${span(s.first, s.last)}, die meisten ${s.peak} (${fmt(s.peakCount)})${undated}`;
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
        return `<li role="option" class="tp-row${chosen ? ' tp-row--chosen' : ''}" data-i="${i}" data-key="${escapeHtml(s.key)}" aria-selected="${chosen}" aria-label="${escapeHtml(`${s.label}: ${describe(s)}`)}" tabindex="${s.key === current ? 0 : -1}"><span class="tp-row__name">${escapeHtml(s.label)}</span></li>`;
    }).join('');
    if (geom) list.style.setProperty('--tp-pitch', `${geom.pitch}px`);
    if (geom) list.style.setProperty('--tp-offset', `${geom.offset}px`);
    if (geom) list.style.setProperty('--tp-name-width', `${geom.nameW}px`);
    let message = '';
    if (model.profiles.subjects.length === 0) message = 'Die Auswahl enthält keinen Brief mit Thema.';
    else if (rows.length === 0) message = `Kein Thema enthält „${query.trim()}“.`;
    if (empty) {
        empty.textContent = message;
        empty.classList.toggle('hidden', !message);
    }
    if (focusedKey) list.querySelector(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
}

// Year labels above the plot, and the keys of colour and height at its right end
function renderAxis() {
    const axis = el('topics-axis');
    if (!axis) return;
    const { yearMin, yearMax, maxYearCount } = model.profiles;
    if (!geom || yearMin === null) {
        axis.innerHTML = '';
        return;
    }
    const step = tickStep(yearMax - yearMin + 1, geom.plotX1 - geom.plotX0);
    const ticks = [];
    for (let y = Math.ceil(yearMin / step) * step; y <= yearMax; y += step) ticks.push(y);
    if (!ticks.length) ticks.push(yearMin);
    const labels = ticks.map(y => `<span class="tp-axis__year" style="left:${xOf(y).toFixed(1)}px">${y}</span>`).join('');
    const kinds = model.twoKinds
        ? '<span class="tp-key__item"><span class="tp-key__swatch tp-key__swatch--language"></span>Sprachen</span><span class="tp-key__item"><span class="tp-key__swatch tp-key__swatch--topic"></span>übrige Themen</span>'
        : '';
    // The height key: the ridge of one letter and of the largest yearly count, in proportion to
    // the ridges and shrunk to the height of a text line
    const glyph = n => {
        const h = Math.max(1, (12 * heightOf(n)) / geom.ridge);
        return `<svg width="6" height="12" aria-hidden="true"><rect class="tp-key__bar" x="1" y="${(12 - h).toFixed(1)}" width="4" height="${h.toFixed(1)}"/></svg>`;
    };
    const scale = maxYearCount > 1 ? `Briefe je Jahr ${glyph(1)} 1 bis ${glyph(maxYearCount)} ${fmt(maxYearCount)}` : '';
    // The grid: one line of key for the fixed shades and the bar, in one neutral data tone
    const sw = step => `<span class="tp-key__swatch tp-key__swatch--s${step}"></span>`;
    const key = variant === 'grid'
        ? `<span class="tp-key__line">Briefe je Jahr ${sw(1)} 1 ${sw(2)} 2–3 ${sw(3)} 4–9 ${sw(4)} 10 und mehr, rechts alle Briefe des Themas</span>`
        : `${kinds}<span class="tp-key__item tp-key__scale">${scale}</span>`;
    axis.innerHTML = `<div class="tp-axis__years">${labels}</div><div class="tp-key">${key}</div>`;
}

function tickStep(years, width) {
    // Labels at least about 80px apart: decades on a laptop over the HSA's seven decades
    const fit = Math.max(1, Math.floor(width / 80));
    return [1, 2, 5, 10, 20, 25, 50, 100].find(step => years / step <= fit) || 100;
}

// The chosen subject: its letters, who writes about it, from where, and with which subjects
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
            const label = escapeHtml(`${e.name}: ${plural(e.count, 'Brief', 'Briefe')}`);
            return `<button type="button" class="tp-mark" data-${attr}="${escapeHtml(e.key)}" aria-pressed="${pressed}" aria-label="${label}" title="${label}"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="${r.toFixed(1)}"/></svg><span class="tp-mark__name">${escapeHtml(e.name)}</span></button>`;
        }).join('');
    };
    const group = (label, html) => (html ? `<div class="tp-choice__group"><span class="tp-choice__label">${label}</span>${html}</div>` : '');
    // Name and number of the chosen subject stand in its row, the sidebar mark and the drawer line;
    // the strip adds only what they lack. On a phone the drawer line right below is the only way
    // to the letters, the button would repeat it in a strip that has little room. The swatch of
    // "Zusammen mit" is the key of the dark inner ridges, the letters shared with the chosen subject.
    const egoNote = ego ? ` ohne ${escapeHtml(ego.name)}` : '';
    // Beside the treemap the strip carries the course of the chosen subject, its row of the grid
    const course = variant === 'treemap' ? courseHtml(subject) : '';
    strip.innerHTML = `${course}${group(`Korrespondenten${egoNote}`, marks(persons, 'person', state.filters.person))}
        ${group('Orte', marks(places, 'place', state.filters.place))}
        ${group(`${variant === 'ridge' ? '<span class="tp-key__swatch tp-key__swatch--with" aria-hidden="true"></span> ' : ''}Zusammen mit`, marks(related, 'subject', null))}
        ${geom?.narrow ? '' : `<button type="button" class="tp-choice__letters" data-act="letters" aria-label="Briefe zum Thema ${escapeHtml(subject.label)} zeigen"><i class="fas fa-list" aria-hidden="true"></i> Briefe zeigen</button>`}`;
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
// subject; laid out by the squarified treemap of the vendored D3
function renderMap() {
    const host = el('topics-map');
    const list = el('topics-map-areas');
    const groupsHost = el('topics-map-groups');
    const text = el('topics-map-text');
    if (!host || !list) return;
    let subjects = model.profiles.subjects;
    if (drill) {
        subjects = subjects.filter(s => drill.has(s.key));
        if (!subjects.length) {
            drill = null;
            subjects = model.profiles.subjects;
        }
    }
    el('topics-map-back')?.classList.toggle('hidden', !drill);
    const W = host.clientWidth;
    const H = host.clientHeight;
    const d3 = window.d3;
    const mentions = subjects.reduce((n, s) => n + s.total, 0);
    if (text) {
        text.textContent = !subjects.length
            ? 'Die Auswahl enthält keinen Brief mit Thema.'
            : drill
                ? `${plural(subjects.length, 'Thema', 'Themen')} mit zusammen ${plural(mentions, 'Nennung', 'Nennungen')}.`
                : `Ein Brief nennt oft mehrere Themen, die Flächen zählen deshalb ${plural(mentions, 'Nennung', 'Nennungen')} in ${plural(model.letterCount, 'Brief', 'Briefen')}.`;
    }
    if (!W || !H || !d3 || !subjects.length) {
        list.innerHTML = '';
        if (groupsHost) groupsHost.innerHTML = '';
        return;
    }
    const groups = mapGroups(subjects, W * H, { singlesApart: !drill });
    const grouped = groups.length > 1;
    const sumOf = list => list.reduce((n, s) => n + s.total, 0);
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
        const label = d.rest
            ? `${name}, zusammen ${plural(sumOf(d.rest.rest), 'Nennung', 'Nennungen')}, Enter öffnet sie`
            : `${name}${grouped ? ` (${d.group.name})` : ''}: ${fmt(d.s.total)} von ${plural(model.letterCount, 'Brief', 'Briefen')}`;
        // A name stands in an area with room for two short lines; the others name themselves on
        // hover and focus, because names broken into syllables in narrow areas read as noise
        const fits = w >= 72 && h >= 30;
        const cls = `tp-area${d.rest ? ' tp-area--rest' : ''}${chosen ? ' tp-area--chosen' : ''}`;
        return `<li role="option" class="${cls}" data-i="${i}" data-key="${escapeHtml(key)}" aria-selected="${chosen}" aria-label="${escapeHtml(label)}" tabindex="${key === current ? 0 : -1}" style="left:${n.x0.toFixed(1)}px;top:${n.y0.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px">${fits ? `<span class="tp-area__name">${escapeHtml(name)}</span>` : ''}</li>`;
    }).join('');
    if (focusedKey) list.querySelector(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus();
}

function showMapTooltip(li) {
    const tip = el('topics-map-tooltip');
    const host = el('topics-map');
    const d = model?.areas?.[Number(li.dataset.i)];
    if (!tip || !host || !d) return;
    const lines = d.rest
        ? [restLabel(d.rest.rest), 'Ein Klick öffnet sie']
        : [d.s.label, `${fmt(d.s.total)} von ${plural(model.letterCount, 'Brief', 'Briefen')}`, describe(d.s)];
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

// The table of all rows costs more than the figure, so it is built when it is opened and kept
// current only while it is open; closed, the host holds the disclosure alone
function renderTable() {
    const host = el('topics-table');
    if (!host) return;
    if (!model.rows.length) {
        host.innerHTML = '';
        return;
    }
    if (!host.querySelector('details')?.open) {
        if (!host.querySelector('details')) host.innerHTML = '<details class="chart-table"><summary>Daten als Tabelle</summary></details>';
        tableStale = true;
        return;
    }
    tableStale = false;
    const rows = model.rows.map(s => [s.label, model.twoKinds ? (s.kind === 'language' ? 'Sprache' : 'Thema') : 'Thema', s.total, s.first ?? '', s.peak ?? '', s.last ?? '']);
    renderDataTable(host, {
        caption: 'Themen mit Briefen, erstem Jahr, Jahr der meisten Briefe und letztem Jahr',
        columns: ['Thema', 'Art', 'Briefe', 'Erstes Jahr', 'Meiste Briefe', 'Letztes Jahr'],
        rows,
        limit: rows.length
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
    const top = geom.offset + i * geom.pitch;
    if (top < scroll.scrollTop || top + geom.pitch > scroll.scrollTop + scroll.clientHeight) {
        scroll.scrollTop = Math.max(0, top - scroll.clientHeight / 2);
    }
}

function scheduleDraw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
}

function draw() {
    const canvas = el('topics-canvas');
    const scroll = el('topics-scroll');
    if (!canvas || !scroll || !model || !geom || !ink) return;
    const { width, height, pitch, ridge, plotX0, plotX1, block, narrow, offset } = geom;
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
    // Scroll position counted from the top of the first row
    const top = scroll.scrollTop - offset;
    if (variant === 'grid') {
        drawGrid(ctx, top);
        return;
    }

    // Decades as faint lines behind the ridges; on a phone only within the ridge of each row, so
    // they do not cross the names above the ridges
    const decades = [];
    for (let y = Math.ceil(yearMin / 10) * 10; y <= yearMax; y += 10) decades.push(Math.round(xOf(y)) + 0.5);
    const grid = (y0, y1) => {
        ctx.strokeStyle = ink.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const x of decades) {
            ctx.moveTo(x, y0);
            ctx.lineTo(x, y1);
        }
        ctx.stroke();
    };
    if (!narrow) grid(0, height);

    // Rows from top to bottom, so a lower ridge covers the foot of the one above; rows below the
    // screen whose ridge reaches into it are drawn as well
    const first = Math.max(0, Math.floor(top / pitch) - 1);
    const last = Math.min(model.rows.length - 1, Math.ceil((top + height + ridge) / pitch));
    const blocked = order !== 'size';
    ctx.save();
    ctx.beginPath();
    ctx.rect(narrow ? 0 : plotX0 - 4, 0, width, height);
    ctx.clip();
    for (let i = first; i <= last; i++) {
        const s = model.rows[i];
        const base = (i + 1) * pitch - top - (narrow ? 3 : 2);
        const chosen = s.key === model.chosen;
        const hovered = i === hoverIndex;
        const hue = chosen ? ink.chosen : model.twoKinds && s.kind === 'language' ? ink.language : ink.topic;
        if (blocked && i > 0 && i % block === 0) {
            const y = Math.round(i * pitch - top) + 0.5;
            ctx.strokeStyle = ink.rule;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        if (narrow) grid(base - ridge, base);
        ridgePath(ctx, s.years, base);
        // An opaque fill in the colour of the row's band hides the ridges behind it
        ctx.fillStyle = chosen ? ink.chosenBand : hovered ? ink.hoverBand : ink.bg;
        ctx.fill();
        ctx.globalAlpha = chosen ? 0.35 : 0.45;
        ctx.fillStyle = hue;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = hue;
        ctx.lineWidth = chosen || hovered ? 1.75 : 1;
        ctx.stroke();
        // The peak as a dot: in the blocks ordered by peak the dots run from early to late
        if (s.peak !== null) {
            ctx.fillStyle = hue;
            ctx.beginPath();
            ctx.arc(xOf(s.peak), base - heightOf(s.peakCount), chosen ? 3 : 2.25, 0, Math.PI * 2);
            ctx.fill();
        }
        // On a phone the strip has no room for the neighbouring subjects, whose swatch keys this
        const shared = narrow ? null : model.co?.get(s.key);
        if (shared) {
            ridgePath(ctx, shared, base);
            ctx.fillStyle = hue;
            ctx.fill();
        }
    }
    ctx.restore();

    // The year under the pointer as a thin line through all rows
    if (hoverYear !== null) {
        const x = Math.round(xOf(hoverYear)) + 0.5;
        ctx.strokeStyle = ink.cursor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
}

// The grid: one cell per subject and year in the shade of its step, an empty year stays empty;
// at the right a bar of all letters of the subject on one linear scale for the figure
function drawGrid(ctx, top) {
    const { width, height, pitch, plotX0, plotX1, block, narrow } = geom;
    const { yearMin, yearMax } = model.profiles;
    const cellW = (plotX1 - plotX0) / (yearMax - yearMin + 1);
    const cellH = narrow ? 16 : pitch - 8;
    const maxTotal = model.profiles.subjects.reduce((m, s) => Math.max(m, s.total), 1);
    const barX0 = plotX1 + 10;
    const barLen = width - 16 - barX0;
    const first = Math.max(0, Math.floor(top / pitch));
    const last = Math.min(model.rows.length - 1, Math.ceil((top + height) / pitch));
    const blocked = order !== 'size';
    for (let i = first; i <= last; i++) {
        const s = model.rows[i];
        const y0 = i * pitch - top + pitch - cellH - 3;
        const chosen = s.key === model.chosen;
        if (blocked && i > 0 && i % block === 0) {
            ctx.fillStyle = ink.rule;
            ctx.fillRect(0, Math.round(i * pitch - top), width, 1);
        }
        // A hairline under the years, so an empty year reads as empty and not as missing
        ctx.fillStyle = ink.grid;
        ctx.fillRect(plotX0, y0 + cellH, plotX1 - plotX0, 1);
        for (const [year, count] of s.years) {
            const step = shadeStep(count);
            // The chosen subject in rust at the same four steps, all others in the data tone
            if (chosen) {
                ctx.globalAlpha = [0.35, 0.55, 0.75, 1][step - 1];
                ctx.fillStyle = ink.chosen;
            } else {
                ctx.fillStyle = ink.steps[step - 1];
            }
            ctx.fillRect(plotX0 + (year - yearMin) * cellW + 0.5, y0, Math.max(1, cellW - 1), cellH);
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = chosen ? ink.chosen : ink.cursor;
        ctx.fillRect(barX0, y0 + cellH / 2 - 3, Math.max(1, (barLen * s.total) / maxTotal), 6);
    }
    // The cell under the pointer or the column of its year
    if (hoverYear !== null && hoverIndex >= first && hoverIndex <= last) {
        const y0 = hoverIndex * pitch - top + pitch - cellH - 3;
        ctx.strokeStyle = ink.cursor;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(plotX0 + (hoverYear - yearMin) * cellW) + 0.5, Math.round(y0) - 1.5, Math.max(2, Math.round(cellW)), cellH + 3);
    }
}

function ridgePath(ctx, years, base) {
    const { yearMin, yearMax } = model.profiles;
    ctx.beginPath();
    ctx.moveTo(xOf(yearMin - 0.5), base);
    for (let y = yearMin; y <= yearMax; y++) ctx.lineTo(xOf(y), base - heightOf(years.get(y) || 0));
    ctx.lineTo(xOf(yearMax + 0.5), base);
    ctx.closePath();
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
    const shared = year !== null ? model.co?.get(s.key)?.get(year) : null;
    if (shared) lines.push(`${fmt(shared)} davon zusammen mit dem gewählten Thema`);
    tip.innerHTML = lines.map(escapeHtml).join('<br>');
    tip.classList.remove('hidden');
    const rowTop = geom.offset + i * geom.pitch - scroll.scrollTop;
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

    // toggle does not bubble, so the host listens in the capture phase
    el('topics-table')?.addEventListener('toggle', (e) => {
        if (e.target.open && tableStale && model) renderTable();
    }, true);

    // Pointer: the row under it by its band, the year by its position on the axis
    scroll.addEventListener('pointermove', (e) => {
        if (!model || !geom) return;
        const rect = scroll.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const i = Math.floor((e.clientY - rect.top + scroll.scrollTop - geom.offset) / geom.pitch);
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
    // Space choose or release the subject of the focused row
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
        el('topics-scroll').scrollTop = 0;
        arrange();
        renderTable();
        draw();
    };
    search?.addEventListener('input', debounce(applySearch, 150));
    search?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Enter chooses the first subject the search finds
            e.preventDefault();
            if (query !== search.value) applySearch();
            const firstRow = model?.rows[0];
            if (firstRow && firstRow.key !== model.chosen) deps.toggleSubject(firstRow.key);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            el('topics-rows')?.querySelector('.tp-row[tabindex="0"]')?.focus();
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
            else if (drill) el('topics-map-back')?.click();
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
    el('topics-map-back')?.addEventListener('click', () => {
        drill = null;
        renderMap();
        el('topics-map-areas')?.querySelector('.tp-area')?.focus();
    });
    new ResizeObserver(() => {
        if (model && variant === 'treemap' && el('topics-view')?.classList.contains('active')) renderMap();
    }).observe(el('topics-map'));

    el('topics-choice')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.act === 'letters') deps.revealLetters();
        else if (btn.dataset.act === 'release' && model?.chosen) deps.toggleSubject(model.chosen);
        else if (btn.dataset.person) deps.togglePerson(btn.dataset.person);
        else if (btn.dataset.place) deps.togglePlace(btn.dataset.place);
        else if (btn.dataset.subject) deps.toggleSubject(btn.dataset.subject);
    });

    // Refit when the figure changes size while visible (window, sidebar, drawer, breakpoint)
    new ResizeObserver(() => {
        if (!model || !el('topics-view')?.classList.contains('active')) return;
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
