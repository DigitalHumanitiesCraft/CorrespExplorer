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
    const profiles = subjectProfiles(lettersBesideSubject());
    const kinds = new Set(profiles.subjects.map(s => s.kind));
    model = {
        profiles,
        twoKinds: kinds.size > 1,
        chosen: state.filters.subject || null,
        rows: [],
        co: null
    };
    model.co = model.chosen ? coOccurrence(model.chosen) : null;
    measure();
    arrange();
    renderAxis();
    renderChoice();
    renderTable();
    revealChosen();
    draw();
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
        grid: token('--color-border-light'), rule: token('--color-border-control'), cursor: token('--color-text-light')
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
    const plotX1 = width - 16;
    geom = {
        width, height, narrow, pitch, nameW, plotX0, plotX1,
        ridge: narrow ? 20 : Math.round(pitch * 2.2),
        // Room above the first row for the part of its ridge that rises over the row
        offset: narrow ? 0 : Math.round(pitch * 1.2),
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
    axis.innerHTML = `<div class="tp-axis__years">${labels}</div><div class="tp-key">${kinds}<span class="tp-key__item tp-key__scale">${scale}</span></div>`;
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
    strip.innerHTML = `${group(`Korrespondenten${egoNote}`, marks(persons, 'person', state.filters.person))}
        ${group('Orte', marks(places, 'place', state.filters.place))}
        ${group('<span class="tp-key__swatch tp-key__swatch--with" aria-hidden="true"></span> Zusammen mit', marks(related, 'subject', null))}
        ${geom?.narrow ? '' : `<button type="button" class="tp-choice__letters" data-act="letters" aria-label="Briefe zum Thema ${escapeHtml(subject.label)} zeigen"><i class="fas fa-list" aria-hidden="true"></i> Briefe zeigen</button>`}`;
    strip.classList.remove('hidden');
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
