// Time view: one figure from the whole period down to the single letters. Above, the letters per
// year of the selection as a profile in the language colours; dragging over it, or the arrow keys,
// choose a period. Below, the chosen period at the finest resolution that stays legible for its
// length: bins of months, quarters, half years or years when the period holds many letters, the
// single letters as marks on a true time axis when it holds few, so a gap between two letters is a
// distance. With a central person the letters from that person stand above the axis and the
// letters to that person below it, so the exchange reads as a dialogue. This view absorbs the
// former representations Jahre, Tage and Chronik (US-05, US-28 to US-32, US-34).
//
// The chosen period is the period of the sidebar (state.filters.temporal): one period for slider,
// selection sentence, title, letters drawer and URL. The profile draws the selection under every
// filter except the period, as the space-time view draws all years beside a picked one, so the
// period stands as chosen against the whole and can be moved or released there.

import { LANGUAGE_COLORS, LETTER_FEATURES, NO_LANGUAGE, languageLabel } from '../constants.js';
import { escapeHtml, showToast, isMultiYearSpan, letterRecipients, personKey } from '../utils.js';
import { addLettersToBasket } from '../basket.js';
import { state } from '../state-manager.js';
import { renderDataTable, readTokens } from './view-support.js';
import { formatNumber as fmt } from '../formatters.js';
import { countOf, PALE_TOKEN, OUTSIDE_OPACITY } from '../selection-ui.js';
import { rowCentre, letterDirection } from './letters-view.js';
import { initChronikView, correspondenceContext, contextText, personAge, lifeDatesOf } from './chronik-view.js';

// Above this many letters on the axis the lower figure counts letters in bins instead of drawing
// each one; a period of one year always shows its letters (the busiest year of the Hugo Schuchardt
// Archiv holds 510). A setting of this view, chosen so that marks of 7px stay apart on a wide screen.
export const LETTER_LIMIT = 600;
// Bin lengths in months, from the finest; the finest whose bins keep MIN_BIN_PX on screen is used
const BIN_STEPS = [1, 3, 6, 12];
const MIN_BIN_PX = 3;
// A column of letter marks stops at this many; the rest is named as "+n" above it
const MAX_ROWS = 24;
const DAY_MS = 86400000;
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

let deps = {};
// The resolution and marks of the last drawing, for hit tests, keys and the table
let scene = null;
let hoverKey = null;
let resizeObserver = null;
let lastWidth = 0;
// After a period was chosen from the lower figure, the focus continues there after the redraw
let focusDetailAfterRender = false;

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getFilteredLetters - letters under every filter, the period included
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.setPeriod - (start, end) chooses a period of years; (null) releases it
 * @param {Function} dependencies.showUndatedLetters
 * @param {Function} dependencies.showLetterDetail
 * @param {Function} dependencies.renderLanguageKey - draws the shared language key into a host
 */
export function initTimelineView(dependencies) {
    deps = dependencies;
    initChronikView({
        getFilteredLetters: deps.getFilteredLetters,
        getAllLetters: deps.getAllLetters,
        onEnriched: () => renderDetail()
    });
    bindDetail();
}

// Dates as day numbers (days since 1970-01-01 in UTC), so a time zone never shifts a day

const dayNumber = (y, m, d) => Date.UTC(y, m - 1, d) / DAY_MS;

function dateParts(text) {
    const match = /^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(String(text || ''));
    if (!match) return null;
    return { y: Number(match[1]), m: match[2] ? Number(match[2]) : null, d: match[3] ? Number(match[3]) : null };
}

function partsStart({ y, m, d }) {
    return dayNumber(y, m || 1, d || 1);
}

// Day after the last day the parts cover
function partsEnd({ y, m, d }) {
    if (d) return dayNumber(y, m, d) + 1;
    if (m) return dayNumber(y, m + 1, 1);
    return dayNumber(y + 1, 1, 1);
}

/**
 * Where a letter stands on the time axis: the days its date covers, from start up to end
 * (exclusive). A day is one day, a month or year date covers the month or year, a range its span.
 * Null for a letter without a place on the axis: no date, a date only in words, a single date
 * bound, an implausible year or a span over several years (decision E5).
 * @param {Object} letter
 * @returns {{start: number, end: number, exact: boolean}|null}
 */
export function axisInterval(letter) {
    if (!letter?.date || !letter.year || letter.dateImplausible || letter.dateBound || isMultiYearSpan(letter)) return null;
    if (letter.datePrecision === 'unknown') return null;
    const from = dateParts(letter.date);
    if (!from) return null;
    const start = partsStart(from);
    let end = partsEnd(from);
    if (letter.datePrecision === 'range' && letter.dateTo) {
        const to = dateParts(letter.dateTo);
        if (to) end = Math.max(start + 1, partsEnd(to));
    }
    return { start, end, exact: end - start === 1 };
}

/**
 * The resolution of the lower figure for the letters of a period
 * @param {number} count - letters on the axis
 * @param {number} months - length of the period in months
 * @param {number} width - width of the figure in px
 * @returns {{level: 'letters'|'bins', binMonths: number|null}}
 */
export function timeResolution(count, months, width) {
    if (count <= LETTER_LIMIT || months <= 12) return { level: 'letters', binMonths: null };
    const binMonths = BIN_STEPS.find(step => width / Math.ceil(months / step) >= MIN_BIN_PX) || 12;
    return { level: 'bins', binMonths };
}

/**
 * The side of the axis a letter stands on: 'out' when the central person wrote it, 'in' when that
 * person received it, 'other' for a letter between two other persons, 'all' without central person
 * @param {Object} letter
 * @param {string|null} centreKey - personKey of the central person
 * @returns {'out'|'in'|'other'|'all'}
 */
export function letterSide(letter, centreKey) {
    if (!centreKey) return 'all';
    const direction = letterDirection(letter, centreKey);
    if (!direction) return 'other';
    return direction.dir === 'to' ? 'out' : 'in';
}

/**
 * The letters of a period that stand on the time axis inside it
 * @param {Array} letters
 * @param {{start: number, end: number}} period - first and last year
 * @returns {Array}
 */
export function periodLetters(letters, { start, end }) {
    const from = dayNumber(start, 1, 1);
    const to = dayNumber(end + 1, 1, 1);
    return letters.filter(letter => {
        const iv = axisInterval(letter);
        return iv && iv.start >= from && iv.end <= to;
    });
}

/**
 * The first stretch of the selection that the single letters fit into, from its first year on,
 * the place where the former chronicle began; at least one year
 * @param {Array} letters
 * @param {number} [limit]
 * @returns {{start: number, end: number}|null}
 */
export function chronicleStart(letters, limit = LETTER_LIMIT) {
    const perYear = new Map();
    letters.forEach(letter => {
        if (axisInterval(letter)) perYear.set(letter.year, (perYear.get(letter.year) || 0) + 1);
    });
    const years = [...perYear.keys()].sort((a, b) => a - b);
    if (!years.length) return null;
    let sum = 0;
    let end = years[0];
    for (const year of years) {
        if (year !== years[0] && sum + perYear.get(year) > limit) break;
        sum += perYear.get(year);
        end = year;
    }
    return { start: years[0], end };
}

function monthOfDay(day) {
    const date = new Date(day * DAY_MS);
    return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1 };
}

/**
 * Letters counted in bins of a period. A letter counts in a bin when its date lies wholly inside
 * it: a month date in a bin of months, a year date only in a bin of a year. The others are counted
 * by precision as not placed at this resolution, so no date is spread over time it does not name.
 * @param {Array<{letter: Object, iv: Object, side: string}>} entries
 * @param {{startYear: number, endYear: number, binMonths: number}} grid
 * @returns {{bins: Array<{index: number, startMonth: number, total: number, sides: Object, langs: Object}>, unplaced: Object}}
 */
export function binLetters(entries, { startYear, endYear, binMonths }) {
    const months = (endYear - startYear + 1) * 12;
    const count = Math.ceil(months / binMonths);
    const bins = Array.from({ length: count }, (_, index) => ({
        index, startMonth: index * binMonths, total: 0,
        sides: { out: 0, in: 0, other: 0, all: 0 }, langs: { out: {}, in: {}, other: {}, all: {} }
    }));
    const unplaced = {};
    const monthIndex = day => {
        const { y, m } = monthOfDay(day);
        return (y - startYear) * 12 + m - 1;
    };
    for (const { letter, iv, side, lang } of entries) {
        const first = monthIndex(iv.start);
        const last = monthIndex(iv.end - 1);
        if (first < 0 || last >= months) continue;
        if (Math.floor(first / binMonths) !== Math.floor(last / binMonths)) {
            const key = letter.datePrecision || 'range';
            unplaced[key] = (unplaced[key] || 0) + 1;
            continue;
        }
        const bin = bins[Math.floor(first / binMonths)];
        bin.total++;
        bin.sides[side]++;
        bin.langs[side][lang] = (bin.langs[side][lang] || 0) + 1;
    }
    return { bins, unplaced };
}

// The colour key of a letter: a language with its own colour, the grey rest, or one data colour
// for a dataset without languages
function languageKey(letter, hasLanguages) {
    if (!hasLanguages) return '_total';
    const code = letter.language?.code || NO_LANGUAGE;
    return LANGUAGE_COLORS[code] ? code : 'other';
}

function colourOf(key) {
    return key === '_total' ? null : (LANGUAGE_COLORS[key] || LANGUAGE_COLORS.other);
}

// The period chosen in this view or the sidebar, or a year picked in the space-time view
function chosenPeriod() {
    const f = state.filters;
    if (f.year != null) return { start: f.year, end: f.year };
    if (f.temporal && !f.temporal.undated) return { start: f.temporal.min, end: f.temporal.max };
    return null;
}

// The selection under every filter except the period, cached while the filters stay the same
const profileCache = { key: null, source: null, letters: [] };
function profileLetters() {
    const filters = { ...state.filters, temporal: null, year: null };
    const key = JSON.stringify(filters);
    const source = state.getAllLetters();
    if (profileCache.key !== key || profileCache.source !== source) {
        profileCache.key = key;
        profileCache.source = source;
        profileCache.letters = state.filterLetters(filters);
    }
    return profileCache.letters;
}

/**
 * Render the time view: the profile, then the lower figure. The entry names the representation
 * an older link asked for: 'chronik' opens the single letters from the beginning of the selection.
 * @param {{entry?: string|null}} [options]
 */
export function renderTimeline({ entry = null } = {}) {
    if (entry === 'chronik' && !chosenPeriod()) {
        const start = chronicleStart(deps.getFilteredLetters());
        if (start) {
            // setPeriod applies the filters, which renders this view again
            deps.setPeriod(start.start, start.end);
            return;
        }
    }
    const started = performance.now();
    renderProfile();
    renderDetail();
    // Time from a change of period to the redrawn view, read by the measurement of the report
    document.getElementById('timeline-view')?.setAttribute('data-render-ms', String(Math.round(performance.now() - started)));
}

// Profile

const OFF_AXIS = [
    { key: 'undated', label: 'ohne Datum', phrase: 'ohne Datum' },
    { key: 'dateText', label: 'Datum nur als Text', phrase: 'nur als Text datiert' },
    { key: 'dateBound', label: 'Nur Datumsgrenze', phrase: 'nur mit einer Datumsgrenze' },
    { key: 'dateImplausible', label: 'Jahr unplausibel', phrase: 'mit unplausiblem Jahr' }
];

/**
 * Letters without a year, grouped by reason. `mixed` is true when the dataset gives a reason
 * besides a missing date; only then are the groups named, so plain CMIF keeps its single bin.
 */
function offAxisGroups(letters) {
    const groups = OFF_AXIS
        .map(group => ({ ...group, count: letters.filter(LETTER_FEATURES.find(f => f.key === group.key).test).length }))
        .filter(group => group.count > 0);
    return { groups, mixed: groups.some(group => group.key !== 'undated') };
}

function uncertainPhrase(imprecise, inferred) {
    const parts = [];
    if (imprecise) parts.push(`${fmt(imprecise)} mit unscharfem Datum`);
    if (inferred) parts.push(`${fmt(inferred)} mit erschlossenem Datum`);
    return parts.join(', ');
}

const isImprecise = letter => ['range', 'year', 'month'].includes(letter.datePrecision) || letter.dateCertainty === 'low';

// Letters per year of the whole dataset, counted once per loaded dataset
const wholeCache = { source: null, years: new Map() };
function wholeYears(allLetters) {
    if (wholeCache.source !== allLetters) {
        wholeCache.source = allLetters;
        wholeCache.years = new Map();
        allLetters.forEach(l => {
            if (l.year && !isMultiYearSpan(l)) wholeCache.years.set(l.year, (wholeCache.years.get(l.year) || 0) + 1);
        });
    }
    return wholeCache.years;
}

function renderProfile() {
    const container = document.getElementById('timeline-chart');
    if (!container) return;
    const letters = profileLetters();
    const allLetters = deps.getAllLetters();
    const period = chosenPeriod();
    const undatedChosen = Boolean(state.filters.temporal?.undated);

    const spanLetters = letters.filter(isMultiYearSpan);
    const datedLetters = letters.filter(l => l.year && !isMultiYearSpan(l));
    const undatedLetters = letters.filter(l => !l.year);
    const offAxis = offAxisGroups(undatedLetters);

    // The axis spans the years of the whole dataset, so it stays put under every filter
    const years = [...new Set(allLetters.filter(l => l.year && !isMultiYearSpan(l)).map(l => l.year))].sort((a, b) => a - b);
    const minYear = years.length ? years[0] : 1;
    const maxYear = years.length ? years[years.length - 1] : 0;
    const hasLanguages = letters.some(l => l.language?.code);

    const yearData = {};
    for (let y = minYear; y <= maxYear; y++) yearData[y] = { total: 0, uncertain: 0, imprecise: 0, inferred: 0, languages: {} };
    const languageTotals = {};
    let totals = { uncertain: 0, imprecise: 0, inferred: 0 };
    datedLetters.forEach(letter => {
        const data = yearData[letter.year];
        if (!data) return;
        const key = languageKey(letter, hasLanguages);
        data.total++;
        data.languages[key] = (data.languages[key] || 0) + 1;
        languageTotals[key] = (languageTotals[key] || 0) + 1;
        const imprecise = isImprecise(letter);
        if (imprecise) { data.imprecise++; totals.imprecise++; }
        // A date the edition supplied is no reading of the source; it shares the hatching
        if (letter.dateInferred) { data.inferred++; totals.inferred++; }
        if (imprecise || letter.dateInferred) { data.uncertain++; totals.uncertain++; }
    });
    const undatedByLang = {};
    undatedLetters.forEach(letter => {
        const key = languageKey(letter, hasLanguages);
        undatedByLang[key] = (undatedByLang[key] || 0) + 1;
        languageTotals[key] = (languageTotals[key] || 0) + 1;
    });
    // One order of the languages on the whole page, by their frequency in the whole dataset (rule 11)
    const order = hasLanguages ? Object.keys(LANGUAGE_COLORS).filter(key => languageTotals[key] > 0) : ['_total'];

    // The whole dataset per year stands pale behind the selection, on the same scale (rule 6)
    const whole = wholeYears(allLetters);
    let maxCount = Math.max(1, undatedLetters.length, spanLetters.length);
    for (let y = minYear; y <= maxYear; y++) maxCount = Math.max(maxCount, yearData[y].total, whole.get(y) || 0);
    container.style.setProperty('--tv-pale', `var(${PALE_TOKEN})`);
    container.style.setProperty('--tv-outside', String(OUTSIDE_OPACITY));

    // About one year label per 48px of width
    const yearSpan = Math.max(0, maxYear - minYear + 1);
    const width = container.clientWidth || 600;
    const labelEvery = niceYearStep(Math.max(1, Math.ceil(yearSpan / Math.max(2, Math.floor(width / 100)))));

    const bars = [];
    for (let y = minYear; y <= maxYear; y++) {
        const data = yearData[y];
        const height = data.total ? Math.max(3, (data.total / maxCount) * 100) : 0;
        let bottom = 0;
        const segments = order.map(key => {
            const count = data.languages[key] || 0;
            if (!count) return '';
            const share = (count / data.total) * 100;
            const colour = colourOf(key) || 'var(--color-data)';
            const segment = `<span class="tv-seg" style="height: ${share}%; bottom: ${bottom}%; background: ${colour}"></span>`;
            bottom += share;
            return segment;
        }).join('');
        const hatch = data.uncertain ? `<span class="tv-hatch" style="height: ${(data.uncertain / data.total) * 100}%"></span>` : '';
        const chosen = period && y >= period.start && y <= period.end;
        const wholeCount = whole.get(y) || 0;
        const label = `${y}: ${countOf(data.total, wholeCount, wholeCount === 1 ? 'Brief' : 'Briefe', 'Briefen')}${data.uncertain ? `, ${uncertainPhrase(data.imprecise, data.inferred)}` : ''}`;
        const showLabel = (y % labelEvery === 0) || (yearSpan <= 3);
        const pale = wholeCount > data.total ? `<span class="tv-whole" style="height: ${Math.max(3, (wholeCount / maxCount) * 100)}%"></span>` : '';
        bars.push(`<span class="tv-bar${chosen ? ' is-chosen' : ''}" role="button" tabindex="-1" data-year="${y}" aria-label="${escapeHtml(label)}" aria-pressed="${Boolean(chosen)}">`
            + pale
            + `<span class="tv-stack" style="height: ${height}%">${segments}${hatch}</span>`
            + (showLabel ? `<span class="tv-bar__label" aria-hidden="true">${y}</span>` : '')
            + '</span>');
    }
    container.innerHTML = bars.join('');
    container.classList.toggle('is-narrowed', Boolean(period) || undatedChosen);
    container.setAttribute('aria-label', 'Briefe je Jahr. Pfeiltasten wechseln das Jahr, Enter wählt es als Zeitraum, Umschalt mit Pfeiltasten erweitert den Zeitraum, Escape hebt ihn auf, Umschalt und Enter legt die Briefe des Jahrs in den Korb');
    renderGridlines(document.getElementById('tv-grid'), maxCount);

    renderUndatedBin(undatedLetters, undatedByLang, order, maxCount, offAxis, undatedChosen);
    renderSpanBin(spanLetters, maxCount);
    renderLegend(hasLanguages, totals);
    bindProfile(container, letters);

    // Text alternative: every year with its values, then the letters off the axis
    const withInferred = totals.inferred > 0;
    const languageText = languages => Object.entries(languages).filter(([key]) => key !== '_total')
        .sort((a, b) => b[1] - a[1]).map(([key, count]) => `${key === 'other' ? 'weitere' : languageLabel(key)} ${count}`).join(', ');
    const row = (label, total, imprecise, inferred, languages) => [label, total, imprecise,
        ...(withInferred ? [inferred] : []), ...(hasLanguages ? [languages] : [])];
    const rows = [];
    for (let y = minYear; y <= maxYear; y++) {
        const d = yearData[y];
        if (d.total) rows.push(row(String(y), d.total, d.imprecise, d.inferred, languageText(d.languages)));
    }
    if (offAxis.mixed) offAxis.groups.forEach(g => rows.push(row(g.label, g.count, '', '', '')));
    else if (undatedLetters.length) rows.push(row('ohne Datum', undatedLetters.length, '', '', languageText(undatedByLang)));
    if (spanLetters.length) rows.push(row('Spanne über mehrere Jahre', spanLetters.length, spanLetters.length, spanLetters.filter(l => l.dateInferred).length, ''));
    // Two tables stand under the view; each link says which figure it gives in numbers
    renderDataTable(document.getElementById('timeline-table'), {
        caption: 'Briefe je Jahr, ohne den gewählten Zeitraum',
        label: 'Briefe je Jahr als Tabelle',
        columns: ['Jahr', 'Briefe', 'davon unscharf datiert', ...(withInferred ? ['davon erschlossen'] : []), ...(hasLanguages ? ['Sprachen'] : [])],
        rows
    });
}

// Label steps of 1, 2, 5, 10, 20, 25, 50 years, so labels fall on round years
function niceYearStep(raw) {
    return [1, 2, 5, 10, 20, 25, 50, 100].find(step => step >= raw) || raw;
}

function renderGridlines(host, maxCount) {
    if (!host) return;
    if (maxCount <= 1) {
        host.innerHTML = '';
        return;
    }
    const raw = maxCount / 3;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    const step = Math.max(1, (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude);
    const lines = [];
    for (let value = step; value < maxCount; value += step) {
        const pct = (value / maxCount) * 100;
        lines.push(`<span class="tv-grid__line" style="bottom: ${pct}%"></span><span class="tv-grid__label" style="bottom: ${pct}%">${fmt(value)}</span>`);
    }
    host.innerHTML = lines.join('');
}

function renderUndatedBin(undated, byLang, order, maxCount, offAxis, chosen) {
    const bin = document.getElementById('timeline-undated-bin');
    if (!bin) return;
    if (!undated.length) {
        bin.classList.add('hidden');
        return;
    }
    bin.classList.remove('hidden');
    bin.classList.toggle('is-chosen', chosen);
    const label = offAxis.mixed ? 'ohne Jahr' : 'ohne Datum';
    const groups = offAxis.groups.map(g => `${fmt(g.count)} ${g.phrase}`).join(', ');
    bin.setAttribute('aria-label', offAxis.mixed
        ? `${fmt(undated.length)} ${label}: ${groups}. Briefe zeigen`
        : `${fmt(undated.length)} ${label}, Briefe zeigen`);
    bin.dataset.tip = offAxis.mixed ? `Ohne Platz auf der Zeitachse: ${groups}` : `${fmt(undated.length)} Briefe ohne Datum`;
    let bottom = 0;
    bin.querySelector('.tv-bin__bar').innerHTML = order.map(key => {
        const count = byLang[key] || 0;
        if (!count) return '';
        const share = (count / undated.length) * 100;
        const segment = `<span class="tv-seg" style="height: ${share}%; bottom: ${bottom}%; background: ${colourOf(key) || 'var(--color-data)'}"></span>`;
        bottom += share;
        return segment;
    }).join('');
    bin.querySelector('.tv-bin__bar').style.height = `${Math.max(3, (undated.length / maxCount) * 100)}%`;
    bin.querySelector('.tv-bin__count').textContent = fmt(undated.length);
    bin.querySelector('.tv-bin__label').textContent = label;
}

/**
 * Bin for letters dated to a span over several years. It informs and does not filter: the period
 * selects by start year, which a span does not stand for (decision E5).
 */
function renderSpanBin(spans, maxCount) {
    const bin = document.getElementById('timeline-span-bin');
    if (!bin) return;
    if (!spans.length) {
        bin.classList.add('hidden');
        return;
    }
    const first = Math.min(...spans.map(l => l.year));
    const last = Math.max(...spans.map(l => parseInt(String(l.dateTo).substring(0, 4), 10)));
    bin.classList.remove('hidden');
    bin.querySelector('.tv-bin__count').textContent = fmt(spans.length);
    bin.querySelector('.tv-bin__label').textContent = 'Spanne';
    const bar = bin.querySelector('.tv-bin__bar');
    bar.style.height = `${Math.max(3, (spans.length / maxCount) * 100)}%`;
    bar.innerHTML = '<span class="tv-seg tv-seg--span" style="height: 100%; bottom: 0"></span>';
    const text = `${fmt(spans.length)} Briefe über mehrere Jahre datiert, zwischen ${first} und ${last}. Sie stehen in keinem Jahr.`;
    bin.dataset.tip = text;
    bin.setAttribute('aria-label', text);
}

// The colours are explained by the shared language key, which is also the language filter (rules 2
// and 11); this line names only what the key does not: the mark of an uncertain date, and that a
// dataset without languages draws its bars in one colour
function renderLegend(hasLanguages, uncertain) {
    deps.renderLanguageKey?.(document.getElementById('timeline-key'));
    const legend = document.getElementById('timeline-stack-legend');
    if (!legend) return;
    const items = hasLanguages ? [] : ['<span class="tv-legend__item">Keine Sprachdaten im Korpus</span>'];
    // One mark for every date that is no exact reading of the source: hatching in the profile, an
    // open ring with its span below
    if (uncertain.uncertain > 0) {
        const label = uncertain.inferred === 0 ? 'Unscharfes Datum'
            : uncertain.imprecise === 0 ? 'Erschlossenes Datum' : 'Unscharfes oder erschlossenes Datum';
        items.push(`<span class="tv-legend__item" title="${escapeHtml(uncertainPhrase(uncertain.imprecise, uncertain.inferred))}"><span class="tv-swatch tv-swatch--hatch"></span><span class="tv-swatch tv-swatch--ring"></span>${label}</span>`);
    }
    legend.innerHTML = items.join('');
}

// Choose the years from a to b, or release the period when exactly that year is chosen again
function commitYears(a, b, { toggle = true } = {}) {
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    const period = chosenPeriod();
    if (toggle && start === end && period && period.start === start && period.end === end) {
        deps.setPeriod(null);
    } else {
        deps.setPeriod(start, end);
    }
}

function bindProfile(container, letters) {
    const bars = [...container.querySelectorAll('.tv-bar')];
    const period = chosenPeriod();
    const start = (period && bars.find(b => Number(b.dataset.year) === period.start))
        || bars.find(b => b.querySelector('.tv-seg')) || bars[0];
    if (start) start.tabIndex = 0;

    const barAt = (clientX) => {
        const rect = container.getBoundingClientRect();
        const index = Math.floor(((clientX - rect.left) / rect.width) * bars.length);
        return bars[Math.max(0, Math.min(bars.length - 1, index))];
    };
    const preview = (a, b) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        bars.forEach(bar => bar.classList.toggle('is-dragged', Number(bar.dataset.year) >= lo && Number(bar.dataset.year) <= hi));
    };

    let drag = null;
    container.onpointerdown = (e) => {
        if (e.button !== 0) return;
        const bar = barAt(e.clientX);
        if (!bar) return;
        drag = { from: Number(bar.dataset.year), to: Number(bar.dataset.year), shift: e.shiftKey };
        container.setPointerCapture(e.pointerId);
        preview(drag.from, drag.to);
        e.preventDefault();
    };
    container.onpointermove = (e) => {
        const bar = barAt(e.clientX);
        if (!drag) {
            showTip(bar?.getAttribute('aria-label'), e.clientX, e.clientY);
            return;
        }
        hideTip();
        drag.to = Number(bar.dataset.year);
        preview(drag.from, drag.to);
    };
    const finish = (commit) => {
        if (!drag) return;
        const { from, to, shift } = drag;
        drag = null;
        bars.forEach(bar => bar.classList.remove('is-dragged'));
        if (!commit) return;
        if (shift && from === to) {
            // Shift and click: the letters of the year into the basket, as before
            showToast(addLettersToBasket(letters.filter(l => l.year === from && !isMultiYearSpan(l)).map(l => l.id)));
            return;
        }
        commitYears(from, to);
    };
    container.onpointerup = () => finish(true);
    container.onpointercancel = () => finish(false);
    container.onpointerleave = () => { if (!drag) hideTip(); };

    container.onkeydown = (e) => {
        const bar = e.target.closest?.('.tv-bar');
        if (!bar) return;
        const year = Number(bar.dataset.year);
        if (e.key === 'Enter' || e.key === ' ') {
            // Handled here instead of the global role="button" handler, which drops the Shift key
            e.preventDefault();
            e.stopPropagation();
            if (e.shiftKey) {
                showToast(addLettersToBasket(letters.filter(l => l.year === year && !isMultiYearSpan(l)).map(l => l.id)));
            } else {
                refocusYear = year;
                commitYears(year, year);
            }
            return;
        }
        if (e.key === 'Escape' && chosenPeriod()) {
            e.preventDefault();
            refocusYear = year;
            deps.setPeriod(null);
            return;
        }
        const index = bars.indexOf(bar);
        const targets = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: bars.length - 1 };
        if (!(e.key in targets)) return;
        e.preventDefault();
        const next = bars[Math.max(0, Math.min(bars.length - 1, targets[e.key]))];
        if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            // Shift extends the period from its far end, or from the year in focus
            const current = chosenPeriod();
            const nextYear = Number(next.dataset.year);
            const anchor = !current ? year : (year === current.end ? current.start : current.end);
            refocusYear = nextYear;
            commitYears(anchor, nextYear, { toggle: false });
            return;
        }
        bar.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
        showTipFor(next, next.getAttribute('aria-label'));
    };
    container.onfocusout = () => hideTip();

    if (refocusYear != null) {
        const target = bars.find(b => Number(b.dataset.year) === refocusYear);
        refocusYear = null;
        if (target) {
            bars.forEach(b => { b.tabIndex = -1; });
            target.tabIndex = 0;
            target.focus();
        }
    }

    const undated = document.getElementById('timeline-undated-bin');
    if (undated && !undated.dataset.bound) {
        undated.dataset.bound = '1';
        undated.addEventListener('click', () => deps.showUndatedLetters());
        undated.addEventListener('pointermove', e => showTip(undated.dataset.tip, e.clientX, e.clientY));
        undated.addEventListener('pointerleave', hideTip);
    }
    const span = document.getElementById('timeline-span-bin');
    if (span && !span.dataset.bound) {
        span.dataset.bound = '1';
        span.addEventListener('pointermove', e => showTip(span.dataset.tip, e.clientX, e.clientY));
        span.addEventListener('pointerleave', hideTip);
    }
}

// The year bar that takes the focus again after a keyboard choice redrew the profile
let refocusYear = null;

// Tooltip, one for both figures; its text is set as text, never as markup

function showTip(text, x, y) {
    const tip = document.getElementById('tv-tip');
    if (!tip || !text) {
        hideTip();
        return;
    }
    const lines = Array.isArray(text) ? text : [text];
    tip.replaceChildren(...lines.filter(Boolean).map((line, i) => {
        const div = document.createElement('div');
        if (i === 0) div.className = 'tv-tip__head';
        div.textContent = line;
        return div;
    }));
    tip.classList.remove('hidden');
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const left = Math.max(4, Math.min(window.innerWidth - width - 4, x - width / 2));
    const top = y - height - 12 < 4 ? y + 16 : y - height - 12;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
}

function showTipFor(el, text) {
    const rect = el.getBoundingClientRect();
    showTip(text, rect.left + rect.width / 2, rect.top);
}

function hideTip() {
    document.getElementById('tv-tip')?.classList.add('hidden');
}

// Lower figure

const SIDE_ORDER = { out: 0, in: 1, other: 2, all: 0 };

function dateLabel(letter, iv) {
    const parts = dateParts(letter.date);
    let text;
    if (letter.datePrecision === 'range' && letter.dateTo) {
        const to = dateParts(letter.dateTo);
        text = `${partsLabel(parts)} bis ${partsLabel(to)}`;
    } else {
        text = partsLabel(parts);
    }
    const notes = [];
    if (!iv.exact && letter.datePrecision !== 'range') notes.push(parts.m ? 'nur Monat bekannt' : 'nur Jahr bekannt');
    if (letter.dateCertainty === 'low') notes.push('unsicher');
    if (letter.dateInferred) notes.push('erschlossen');
    return notes.length ? `${text}, ${notes.join(', ')}` : text;
}

function partsLabel(p) {
    if (!p) return '';
    if (p.d) return `${p.d}.${p.m}.${p.y}`;
    if (p.m) return `${MONTHS[p.m - 1]} ${p.y}`;
    return String(p.y);
}

function personLabel(person, letter) {
    const name = person?.name || 'Unbekannt';
    const age = person ? personAge(person, letter) : null;
    return age != null ? `${name} (${age})` : name;
}

function letterTip(letter, iv) {
    const recipients = letterRecipients(letter);
    const to = recipients.length ? recipients.map(r => personLabel(r, letter)).join('; ') : 'Unbekannt';
    return [
        dateLabel(letter, iv),
        `${personLabel(letter.sender, letter)} an ${to}`,
        letter.place_sent?.name || '',
        contextText(correspondenceContext(letter))
    ];
}

function binLabel(bin, binMonths, startYear) {
    const year = startYear + Math.floor(bin.startMonth / 12);
    const month = bin.startMonth % 12;
    if (binMonths === 12) return String(year);
    if (binMonths === 6) return `${month === 0 ? '1.' : '2.'} Halbjahr ${year}`;
    if (binMonths === 3) return `${month / 3 + 1}. Quartal ${year}`;
    return `${MONTHS[month]} ${year}`;
}

const UNIT = { 1: 'je Monat', 3: 'je Quartal', 6: 'je Halbjahr', 12: 'je Jahr' };
const NO_BIN = { 1: 'Keinem Monat', 3: 'Keinem Quartal', 6: 'Keinem Halbjahr', 12: 'Keinem Jahr' };
const PRECISION_PHRASE = { month: 'nur auf den Monat', year: 'nur auf das Jahr', range: 'auf einen Zeitraum', day: 'auf einen Tag' };

function sideNames(centre) {
    if (!centre) return null;
    const life = lifeDatesOf(centrePerson(centre));
    const name = life ? `${centre.name} (${life})` : centre.name;
    return { out: `von ${name}`, in: `an ${name}`, other: 'zwischen anderen' };
}

// The person object of the centre, for life dates and ages
function centrePerson(centre) {
    for (const letter of deps.getAllLetters()) {
        const person = [letter.sender, ...letterRecipients(letter)].find(p => personKey(p) === centre.key);
        if (person) return person;
    }
    return null;
}

function renderDetail() {
    const figure = document.getElementById('tv-figure');
    const canvas = document.getElementById('tv-canvas');
    const caption = document.getElementById('tv-unit');
    if (!figure || !canvas || !document.getElementById('timeline-view')?.classList.contains('active')) return;

    const letters = deps.getFilteredLetters();
    const hasLanguages = letters.some(l => l.language?.code);
    const centre = rowCentre();
    const entries = [];
    for (const letter of letters) {
        const iv = axisInterval(letter);
        if (iv) entries.push({ letter, iv, side: letterSide(letter, centre?.key), lang: languageKey(letter, hasLanguages) });
    }
    entries.sort((a, b) => a.iv.start - b.iv.start || a.iv.end - b.iv.end);

    // The letters of the selection open from the count in the line at the lower edge (rule 1)
    const empty = document.getElementById('tv-empty');
    if (!entries.length) {
        scene = null;
        canvas.classList.add('hidden');
        document.getElementById('tv-axis').innerHTML = '';
        document.getElementById('tv-marks').innerHTML = '';
        document.getElementById('tv-detail-note').classList.add('hidden');
        if (caption) caption.textContent = '';
        empty.textContent = letters.length
            ? 'Kein Brief der Auswahl hat einen Platz auf der Zeitachse.'
            : 'Die Auswahl enthält keinen Brief.';
        empty.classList.remove('hidden');
        renderDataTable(document.getElementById('tv-table'), { caption: '', columns: [], rows: [] });
        return;
    }
    empty.classList.add('hidden');
    canvas.classList.remove('hidden');

    const period = chosenPeriod();
    const startYear = period ? period.start : monthOfDay(entries[0].iv.start).y;
    const endYear = period ? period.end : Math.max(...entries.map(e => monthOfDay(e.iv.end - 1).y));
    const axis = { start: dayNumber(startYear, 1, 1), end: dayNumber(endYear + 1, 1, 1), startYear, endYear };
    const width = Math.max(240, figure.clientWidth);
    lastWidth = figure.clientWidth;
    const months = (endYear - startYear + 1) * 12;
    const resolution = timeResolution(entries.length, months, width);
    const sides = centre ? ['out', 'in', ...(entries.some(e => e.side === 'other') ? ['other'] : [])] : ['all'];
    const names = sideNames(centre);

    scene = resolution.level === 'letters'
        ? layoutLetters(entries, axis, width, sides)
        : layoutBins(entries, axis, width, sides, resolution.binMonths);
    scene.names = names;
    scene.sides = sides;
    scene.ticks = axisTicks(scene, axis);
    drawScene(canvas, scene);
    renderAxis(scene);
    renderMarks(scene);
    if (caption) caption.textContent = scene.level === 'letters' ? 'Einzelne Briefe' : `Briefe ${UNIT[scene.binMonths]}`;

    // What the bins cannot place, so no letter of the selection goes unmentioned
    const note = document.getElementById('tv-detail-note');
    const unplaced = Object.entries(scene.unplaced || {}).filter(([, n]) => n > 0);
    if (unplaced.length) {
        const parts = unplaced.map(([key, n]) => `${fmt(n)} ${PRECISION_PHRASE[key] || 'unscharf'} datiert`);
        note.textContent = `${NO_BIN[scene.binMonths]} zuzuordnen: ${parts.join(', ')}.`;
        note.classList.remove('hidden');
    } else {
        note.classList.add('hidden');
    }
    renderDetailTable(scene, names);
    // The uncertainty legend names the open ring only while the letters are drawn
    document.getElementById('timeline-stack-legend')?.classList.toggle('tv-legend--rings', scene.level === 'letters');

    if (focusDetailAfterRender) {
        focusDetailAfterRender = false;
        document.querySelector('#tv-marks .tv-mark[tabindex="0"]')?.focus();
    }
}

/**
 * The single letters as marks, stacked in columns of their day; the letters from the centre
 * above the axis, the letters to it below, the letters between others in a lane of their own
 */
function layoutLetters(entries, axis, width, sides) {
    const size = width < 520 ? 6 : 7;
    const col = size + 1;
    const pad = Math.ceil(size / 2) + 2;
    const plotW = width - 2 * pad;
    const x = day => pad + ((day - axis.start) / (axis.end - axis.start)) * plotW;
    const columns = Math.max(1, Math.floor(plotW / col));
    const stacks = Object.fromEntries(sides.map(side => [side, new Map()]));
    const marks = [];
    const overflow = [];
    for (const entry of entries) {
        const side = sides.includes(entry.side) ? entry.side : sides[0];
        const cx = x((entry.iv.start + entry.iv.end) / 2);
        const c = Math.max(0, Math.min(columns - 1, Math.floor((cx - pad) / col)));
        const stack = stacks[side];
        const row = stack.get(c) || 0;
        stack.set(c, row + 1);
        // A letter beyond the top of its column is not drawn but stays in the keyboard order and
        // the table; its focus ring stands on the "+n" of the column
        const hidden = row >= MAX_ROWS;
        marks.push({ ...entry, side, c, row: hidden ? MAX_ROWS + 1 : row, hidden, cx: pad + c * col + col / 2, x0: x(entry.iv.start), x1: x(entry.iv.end) });
    }
    for (const side of sides) {
        for (const [c, n] of stacks[side]) if (n > MAX_ROWS) overflow.push({ side, c, extra: n - MAX_ROWS, cx: pad + c * col + col / 2 });
    }
    const rowsOf = side => Math.min(MAX_ROWS, Math.max(2, ...stacks[side].values(), 0)) + (overflow.some(o => o.side === side) ? 2 : 0);
    const lanes = buildLanes(sides, side => rowsOf(side) * col);
    for (const mark of marks) {
        const lane = lanes[mark.side];
        mark.cy = lane.up ? lane.axis - (mark.row + 0.5) * col : lane.axis + (mark.row + 0.5) * col;
        mark.r = size / 2;
        mark.key = `l:${mark.letter.id}`;
    }
    overflow.forEach(o => {
        const lane = lanes[o.side];
        const rowsShown = MAX_ROWS + 0.5;
        o.cy = lane.up ? lane.axis - rowsShown * col - col : lane.axis + rowsShown * col + col;
    });
    // The keyboard reads the marks as the eye does, left to right along the axis: a year date
    // stands at the middle of its year, not at its first day
    marks.sort((a, b) => a.cx - b.cx || SIDE_ORDER[a.side] - SIDE_ORDER[b.side] || a.row - b.row);
    return { level: 'letters', width, height: lanes.height, lanes, marks, overflow, x, pad, size, axisYears: axis };
}

/**
 * Lanes from top to bottom: the upper side grows upwards from its axis, the lower side and the
 * lane of letters between others grow downwards. Tick labels stand in a band under the first axis.
 */
function buildLanes(sides, heightOf) {
    const LABEL = 18;
    const TICKS = 20;
    const GAP = 10;
    const lanes = {};
    let y = LABEL;
    const [first, ...rest] = sides;
    const firstHeight = heightOf(first);
    lanes[first] = { up: true, top: y, axis: y + firstHeight, height: firstHeight };
    y += firstHeight;
    lanes.ticks = y;
    y += TICKS;
    // The lower sides grow downwards from their top line; the band of tick labels separates the
    // upper side from the lower one like the spine of the former chronicle. Each lower side names
    // itself in a band under its marks.
    for (const side of rest) {
        if (side === 'other') y += GAP;
        const h = heightOf(side);
        lanes[side] = { up: false, top: y, axis: y, height: h, label: y + h + 2 };
        y += h + LABEL;
    }
    lanes.height = y + 4;
    return lanes;
}

function layoutBins(entries, axis, width, sides, binMonths) {
    const pad = 4;
    const plotW = width - 2 * pad;
    const sideOf = side => (sides.includes(side) ? side : sides[0]);
    const { bins, unplaced } = binLetters(entries.map(e => ({ ...e, side: sideOf(e.side) })), { startYear: axis.startYear, endYear: axis.endYear, binMonths });
    const binW = plotW / bins.length;
    const max = Object.fromEntries(sides.map(side => [side, Math.max(1, ...bins.map(b => b.sides[side]))]));
    // One scale for all sides, so a bar of the same height is the same number of letters
    const budget = width < 520 ? 150 : 200;
    const total = sides.reduce((sum, side) => sum + max[side], 0);
    const perLetter = budget / total;
    const lanes = buildLanes(sides, side => Math.max(24, max[side] * perLetter));
    const marks = bins.filter(b => b.total > 0).map(bin => ({
        bin, key: `b:${bin.index}`,
        x0: pad + bin.index * binW, x1: pad + (bin.index + 1) * binW,
        cx: pad + (bin.index + 0.5) * binW
    }));
    const x = day => pad + ((day - axis.start) / (axis.end - axis.start)) * plotW;
    return { level: 'bins', binMonths, width, height: lanes.height, lanes, marks, bins, unplaced, perLetter, binW, x, pad, axisYears: axis };
}

function drawScene(canvas, s) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(s.width * dpr);
    canvas.height = Math.round(s.height * dpr);
    canvas.style.height = `${s.height}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, s.width, s.height);
    // Colours from the tokens, read at drawing time so a theme change follows
    const t = readTokens({ text: '--color-text', light: '--color-text-light', border: '--color-border-light', data: '--color-data', accent: '--color-primary', bg: '--color-bg' });

    // Axis lines and year rules
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    for (const tick of s.ticks || []) {
        ctx.beginPath();
        ctx.moveTo(Math.round(tick.x) + 0.5, 4);
        ctx.lineTo(Math.round(tick.x) + 0.5, s.height - 4);
        ctx.stroke();
    }
    ctx.strokeStyle = t.text;
    for (const side of s.sides) {
        const y = Math.round(s.lanes[side].axis) + 0.5;
        ctx.beginPath();
        ctx.moveTo(s.pad, y);
        ctx.lineTo(s.width - s.pad, y);
        ctx.stroke();
    }

    if (s.level === 'letters') {
        for (const m of s.marks) {
            if (m.hidden) {
                if (m.key === hoverKey) {
                    ctx.beginPath();
                    ctx.arc(m.cx, m.cy, m.r + 5, 0, Math.PI * 2);
                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = t.accent;
                    ctx.stroke();
                }
                continue;
            }
            const colour = colourOf(m.lang) || t.data;
            const uncertain = !m.iv.exact || m.letter.dateInferred || m.letter.dateCertainty === 'low';
            // The span the date covers, as a thin line through the open mark; a span over a large
            // part of the axis (a year date in a year) only under the pointer or the focus
            const wide = m.x1 - m.x0 > (s.width - 2 * s.pad) * 0.15;
            if (!m.iv.exact && m.x1 - m.x0 > m.r * 2 && (!wide || m.key === hoverKey)) {
                ctx.strokeStyle = t.light;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(m.x0, m.cy);
                ctx.lineTo(m.x1, m.cy);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(m.cx, m.cy, uncertain ? m.r - 1 : m.r, 0, Math.PI * 2);
            if (uncertain) {
                ctx.fillStyle = t.bg;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = colour;
                ctx.stroke();
            } else {
                ctx.fillStyle = colour;
                ctx.fill();
            }
            if (m.key === hoverKey) {
                // Pointer and keyboard focus: the accent ring is the visible focus of the mark
                ctx.beginPath();
                ctx.arc(m.cx, m.cy, m.r + 3, 0, Math.PI * 2);
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = t.accent;
                ctx.stroke();
            }
        }
    } else {
        const gap = s.binW > 4 ? 1 : 0;
        for (const m of s.marks) {
            const w = Math.max(1, s.binW - gap);
            for (const side of s.sides) {
                const lane = s.lanes[side];
                let offset = 0;
                // Stacked in the one order of the page, the most frequent language of the whole
                // dataset at the axis (rule 11)
                const rank = lang => { const i = Object.keys(LANGUAGE_COLORS).indexOf(lang); return i < 0 ? Infinity : i; };
                const langs = Object.entries(m.bin.langs[side]).sort((a, b) => rank(a[0]) - rank(b[0]));
                for (const [lang, n] of langs) {
                    const h = n * s.perLetter;
                    ctx.fillStyle = colourOf(lang) || t.data;
                    const y = lane.up ? lane.axis - offset - h : lane.axis + offset;
                    ctx.fillRect(m.x0 + gap / 2, y, w, h);
                    offset += h;
                }
            }
            if (m.key === hoverKey) {
                ctx.strokeStyle = t.accent;
                ctx.lineWidth = 2;
                ctx.strokeRect(m.x0, 2, s.binW, s.height - 4);
            }
        }
    }
}

// Ticks every year, or every month in a period of up to two years, thinned to keep 44px apart
function axisTicks(s, axis) {
    const ticks = [];
    const years = axis.endYear - axis.startYear + 1;
    if (years <= 2) {
        for (let y = axis.startYear; y <= axis.endYear; y++) {
            for (let m = 1; m <= 12; m++) {
                const x = s.x(dayNumber(y, m, 1));
                ticks.push({ x, label: m === 1 ? String(y) : MONTHS_SHORT[m - 1], major: m === 1 });
            }
        }
        const every = Math.max(1, [1, 2, 3, 6].find(step => (s.width / (years * 12)) * step >= 100) || 12);
        return ticks.filter((tick, i) => i % every === 0);
    }
    const step = niceYearStep(Math.max(1, Math.ceil(years / Math.max(2, Math.floor(s.width / 96)))));
    for (let y = Math.ceil(axis.startYear / step) * step; y <= axis.endYear; y += step) {
        ticks.push({ x: s.x(dayNumber(y, 1, 1)), label: String(y), major: true });
    }
    if (!ticks.length || ticks[0].label !== String(axis.startYear)) {
        if (!ticks.length || ticks[0].x - s.x(axis.start) > 40) ticks.unshift({ x: s.x(axis.start), label: String(axis.startYear), major: true });
    }
    return ticks;
}

function renderAxis(s) {
    const host = document.getElementById('tv-axis');
    // A label at the left edge starts there instead of standing half outside the figure
    const ticks = s.ticks.map(t => `<span class="tv-tick${t.x < 20 ? ' tv-tick--start' : ''}" style="left: ${t.x}px; top: ${s.lanes.ticks + 3}px">${escapeHtml(t.label)}</span>`);
    const labels = [];
    if (s.names) {
        const first = s.sides[0];
        labels.push(`<span class="tv-side" style="top: 0">${escapeHtml(s.names[first])}</span>`);
        for (const side of ['in', 'other']) {
            if (s.lanes[side]) labels.push(`<span class="tv-side" style="top: ${s.lanes[side].label}px">${escapeHtml(s.names[side])}</span>`);
        }
    }
    const overflow = (s.overflow || []).map(o => `<span class="tv-more" style="left: ${o.cx}px; top: ${o.cy - 7}px">+${fmt(o.extra)}</span>`);
    host.style.height = `${s.height}px`;
    host.innerHTML = ticks.join('') + labels.join('') + overflow.join('');
}

function markLabel(m, s) {
    if (s.level === 'letters') return letterTip(m.letter, m.iv);
    const head = `${binLabel(m.bin, s.binMonths, s.axisYears.startYear)}: ${fmt(m.bin.total)} ${m.bin.total === 1 ? 'Brief' : 'Briefe'}`;
    const parts = s.names ? s.sides.filter(side => m.bin.sides[side]).map(side => `${s.names[side]}: ${fmt(m.bin.sides[side])}`) : [];
    return [head, ...parts];
}

// One focusable element per mark over the canvas: keyboard, focus ring and accessible name, in
// time order with one tab stop. The pointer finds the marks by geometry (pointer-events: none).
function renderMarks(s) {
    const host = document.getElementById('tv-marks');
    const hint = s.level === 'letters'
        ? 'Briefe in zeitlicher Folge. Pfeiltasten wechseln den Brief, Enter öffnet ihn.'
        : 'Briefe je Zeitabschnitt. Pfeiltasten wechseln den Abschnitt, Enter wählt ihn als Zeitraum.';
    host.setAttribute('aria-label', hint);
    host.style.height = `${s.height}px`;
    host.innerHTML = s.marks.map((m, i) => {
        const label = markLabel(m, s).filter(Boolean).join('. ');
        const top = s.level === 'letters' ? m.cy : s.lanes.ticks;
        return `<button type="button" class="tv-mark" tabindex="${i === 0 ? 0 : -1}" data-i="${i}" style="left: ${m.cx}px; top: ${top}px" aria-label="${escapeHtml(label)}"></button>`;
    }).join('');
}

function markAt(clientX, clientY) {
    if (!scene) return null;
    const rect = document.getElementById('tv-canvas').getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (scene.level === 'letters') {
        let best = null;
        for (const m of scene.marks) {
            if (m.hidden) continue;
            const d = Math.hypot(m.cx - x, m.cy - y);
            if (d <= m.r + 3 && (!best || d < best.d)) best = { m, d };
        }
        return best?.m || null;
    }
    return scene.marks.find(m => x >= m.x0 && x < m.x1) || null;
}

function activateMark(m) {
    if (!m) return;
    if (scene.level === 'letters') {
        deps.showLetterDetail(m.letter.id);
        return;
    }
    // A bin narrows the period to its years; a bin of months within one year to that year
    const first = scene.axisYears.startYear + Math.floor(m.bin.startMonth / 12);
    const last = scene.axisYears.startYear + Math.floor((m.bin.startMonth + scene.binMonths - 1) / 12);
    focusDetailAfterRender = true;
    deps.setPeriod(first, Math.min(last, scene.axisYears.endYear));
}

function setHover(key) {
    if (hoverKey === key || !scene) return;
    hoverKey = key;
    drawScene(document.getElementById('tv-canvas'), scene);
}

function bindDetail() {
    const figure = document.getElementById('tv-figure');
    const marks = document.getElementById('tv-marks');
    if (!figure || !marks) return;

    let drag = null;
    figure.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !scene) return;
        drag = { from: markAt(e.clientX, e.clientY), x: e.clientX };
        if (scene.level === 'bins') figure.setPointerCapture(e.pointerId);
    });
    figure.addEventListener('pointermove', (e) => {
        const m = markAt(e.clientX, e.clientY);
        figure.classList.toggle('is-over-mark', Boolean(m));
        setHover(m?.key || null);
        if (m) showTip(markLabel(m, scene), e.clientX, e.clientY);
        else hideTip();
    });
    figure.addEventListener('pointerleave', () => {
        setHover(null);
        hideTip();
    });
    figure.addEventListener('pointerup', (e) => {
        if (!drag || !scene) return;
        const to = markAt(e.clientX, e.clientY);
        const from = drag.from;
        drag = null;
        if (scene.level === 'bins' && from && to && from !== to) {
            // Dragging over bins chooses the years they cover
            const year = m => scene.axisYears.startYear + Math.floor(m.bin.startMonth / 12);
            commitYears(year(from), year(to), { toggle: false });
            return;
        }
        if (from && from === to) {
            const index = scene.marks.indexOf(from);
            const proxy = marks.querySelector(`.tv-mark[data-i="${index}"]`);
            // The letter dialog returns the focus to the element that had it
            if (proxy && scene.level === 'letters') moveFocus(proxy, true);
            activateMark(from);
        }
    });

    marks.addEventListener('keydown', (e) => {
        const proxy = e.target.closest('.tv-mark');
        if (!proxy || !scene) return;
        const all = [...marks.querySelectorAll('.tv-mark')];
        const index = all.indexOf(proxy);
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            activateMark(scene.marks[Number(proxy.dataset.i)]);
            return;
        }
        const targets = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: all.length - 1 };
        if (!(e.key in targets)) return;
        e.preventDefault();
        const next = all[Math.max(0, Math.min(all.length - 1, targets[e.key]))];
        moveFocus(next, true);
    });
    marks.addEventListener('focusin', (e) => {
        const proxy = e.target.closest('.tv-mark');
        if (!proxy || !scene) return;
        const m = scene.marks[Number(proxy.dataset.i)];
        setHover(m.key);
        showTipFor(proxy, markLabel(m, scene));
    });
    marks.addEventListener('focusout', () => {
        setHover(null);
        hideTip();
    });

    // The figure follows the width of the main area, the sidebar or the drawer may change it
    resizeObserver = new ResizeObserver(() => {
        if (Math.abs(figure.clientWidth - lastWidth) > 4 && document.getElementById('timeline-view')?.classList.contains('active')) {
            requestAnimationFrame(() => renderDetail());
        }
    });
    resizeObserver.observe(figure);
}

function moveFocus(proxy, focus) {
    document.querySelectorAll('#tv-marks .tv-mark[tabindex="0"]').forEach(p => { p.tabIndex = -1; });
    proxy.tabIndex = 0;
    if (focus) proxy.focus();
}

function renderDetailTable(s, names) {
    const host = document.getElementById('tv-table');
    if (s.level === 'letters') {
        const withSide = Boolean(names);
        const rows = s.marks.map(m => {
            const tip = letterTip(m.letter, m.iv);
            return [tip[0], ...(withSide ? [names[m.side]] : []), tip[1], tip[2], tip[3]];
        });
        renderDataTable(host, {
            caption: 'Die Briefe des Zeitraums in zeitlicher Folge',
            label: 'Die Briefe des Zeitraums als Tabelle',
            columns: ['Datum', ...(withSide ? ['Seite'] : []), 'Brief', 'Ort', 'Stelle im Briefwechsel'],
            rows
        });
        return;
    }
    const sides = names ? s.sides : [];
    renderDataTable(host, {
        caption: `Briefe ${UNIT[s.binMonths]}`,
        label: `Briefe ${UNIT[s.binMonths]} als Tabelle`,
        columns: ['Zeitraum', 'Briefe', ...sides.map(side => names[side])],
        rows: s.bins.filter(b => b.total).map(b => [binLabel(b, s.binMonths, s.axisYears.startYear), b.total, ...sides.map(side => b.sides[side])])
    });
}
