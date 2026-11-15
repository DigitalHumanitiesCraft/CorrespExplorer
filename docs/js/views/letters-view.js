// Letters view: the filtered letters as a list grouped along the order the reader chose, with
// search, a figure of the selection that jumps within the list, and the letter dialog with all
// records the source holds for one letter. The letters drawer renders its list with the same
// groups and rows (renderLetterGroups).

import { isInBasket } from '../basket.js';
import { debounce, escapeHtml, safeUrl, openModal, closeModal, personKey, letterRecipients, foldText, isKnownPlace } from '../utils.js';
import { formatDateWithPrecision, formatPersonName, formatPlaceName, getDatePrecisionClass, sharedLetterLabel } from '../formatters.js';
import { LANGUAGE_COLORS, LETTER_FEATURES, NO_LANGUAGE, isRestLanguage, languageLabel } from '../constants.js';
import { state } from '../state-manager.js';
import { elements } from '../dom-cache.js';
import { findEgo } from './network-view.js';
import { buildCorrespSearchUrl, buildPersonLink, buildPlaceLink, correspSearchLink, detailRow, toggleBasketButton } from './view-support.js';
import { countOf } from '../selection-ui.js';

let deps = {};
let lettersSortOrder = 'date-desc';
let lettersSearchTerm = '';

// A filter set from another view opens the letter list without a search left from before, which
// would narrow the result without being asked for
export function clearLetterSearch() {
    lettersSearchTerm = '';
    if (elements.letterSearch) elements.letterSearch.value = '';
}

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getFilteredLetters
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.hasActiveFilter
 * @param {Function} dependencies.showLettersOfPerson - sets the person filter and opens the letter list
 * @param {Function} dependencies.renderLanguageKey - draws the shared language key into a host
 */
export function initLettersView(dependencies) {
    deps = dependencies;
    const searchInput = elements.letterSearch;
    const sortSelect = elements.letterSort;

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            lettersSearchTerm = foldText(e.target.value.trim());
            renderLettersList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            lettersSortOrder = e.target.value;
            renderLettersList();
        });
    }
    bindLetterRows(elements.lettersList);
    bindProfile(document.getElementById('letters-profile'));
}

// Places without a position on the time axis, in the order their groups close the list. The
// labels are those of the sidebar filters, so a state carries one word everywhere
const OFF_AXIS_ORDER = ['dateBound', 'dateText', 'dateImplausible', 'undated'];

/**
 * Why a letter has no place on the time axis, as the key of its sidebar filter, or null when it has one
 * @param {Object} letter
 * @returns {string|null}
 */
export function offAxisReason(letter) {
    if (letter.dateImplausible) return 'dateImplausible';
    if (!letter.date) return letter.dateText ? 'dateText' : 'undated';
    if (letter.dateBound) return 'dateBound';
    return null;
}

const featureLabel = key => LETTER_FEATURES.find(f => f.key === key)?.label || key;

// Date order with the letters off the time axis last in both directions, grouped by their reason
export function compareByDate(a, b, direction) {
    const offA = offAxisReason(a);
    const offB = offAxisReason(b);
    if (offA || offB) {
        if (!offA) return -1;
        if (!offB) return 1;
        return OFF_AXIS_ORDER.indexOf(offA) - OFF_AXIS_ORDER.indexOf(offB);
    }
    return direction * a.date.localeCompare(b.date);
}

/**
 * The person the rows are told from: the person of the person filter, else the person on at least
 * half of all letters (findEgo). Rows then name the other party and the direction instead of
 * repeating that person in every row.
 * @returns {{key: string, name: string}|null}
 */
const egoCache = { letters: null, ego: null };
export function rowCentre() {
    const all = state.getAllLetters();
    const chosen = state.filters?.person;
    if (chosen) {
        for (const letter of all) {
            const person = [letter.sender, ...letterRecipients(letter)].find(p => personKey(p) === chosen);
            if (person) return { key: chosen, name: person.name || chosen };
        }
        return { key: chosen, name: chosen };
    }
    if (egoCache.letters !== all) {
        egoCache.letters = all;
        egoCache.ego = findEgo(all);
    }
    return egoCache.ego ? { key: egoCache.ego.id, name: egoCache.ego.name } : null;
}

/**
 * Direction of a letter seen from one person: "to" when that person wrote it, "from" when that
 * person received it. `others` are the persons the row names, `also` further recipients beside
 * the centre. Null for a letter the person is not part of.
 * @param {Object} letter
 * @param {string|null} centreKey
 * @returns {{dir: 'to'|'from', others: Array, also: Array}|null}
 */
export function letterDirection(letter, centreKey) {
    if (!centreKey) return null;
    const recipients = letterRecipients(letter);
    if (personKey(letter.sender) === centreKey) {
        return { dir: 'to', others: recipients.filter(r => personKey(r) !== centreKey), also: [] };
    }
    const index = recipients.findIndex(r => personKey(r) === centreKey);
    if (index < 0) return null;
    return { dir: 'from', others: letter.sender ? [letter.sender] : [], also: recipients.filter((_, i) => i !== index) };
}

// The name a person order sorts by: the other party where the row is told from one person
function personSortName(letter, centreKey) {
    const direction = letterDirection(letter, centreKey);
    const person = direction ? direction.others[0] : letter.sender;
    return person?.name || '';
}

const placeSortName = letter => (isKnownPlace(letter.place_sent) ? letter.place_sent.name : '');

const collator = new Intl.Collator('de', { sensitivity: 'base' });

/**
 * The letters in one of the orders of the list. Names sort alphabetically with letters without a
 * name last, and by date within one name.
 * @param {Array} letters
 * @param {'date-desc'|'date-asc'|'person-asc'|'place-asc'} order
 * @param {string|null} centreKey
 * @returns {Array} a new array
 */
export function sortLetters(letters, order, centreKey = null) {
    if (order === 'date-desc' || order === 'date-asc') {
        const direction = order === 'date-desc' ? -1 : 1;
        return [...letters].sort((a, b) => compareByDate(a, b, direction));
    }
    const nameOf = order === 'place-asc' ? placeSortName : l => personSortName(l, centreKey);
    // Keys once per letter instead of once per comparison
    return letters.map(letter => ({ letter, name: nameOf(letter) }))
        .sort((a, b) => (!a.name - !b.name) || collator.compare(a.name, b.name) || compareByDate(a.letter, b.letter, 1))
        .map(entry => entry.letter);
}

// Above this many letters in one year a date order splits the year into its months
const MONTH_SPLIT = 60;
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function initialOf(name) {
    const first = foldText(name).trim()[0];
    return first && /[a-z]/.test(first) ? first.toUpperCase() : '#';
}

/**
 * Consecutive groups of sorted letters. A date order groups by year, a year with many letters by
 * month, and closes with one group per reason a letter has no place on the time axis. A name order
 * groups by the initial of the name and closes with the letters without one.
 * @param {Array} sorted - letters in the order of sortLetters
 * @param {string} order
 * @param {{centreKey?: string|null, monthSplit?: number}} [options]
 * @returns {{key: string, top: string, label: string, sub: string, letters: Array}[]}
 */
export function groupLetters(sorted, order, { centreKey = null, monthSplit = MONTH_SPLIT } = {}) {
    let keyOf;
    if (order === 'date-desc' || order === 'date-asc') {
        const perYear = new Map();
        sorted.forEach(l => {
            if (!offAxisReason(l)) perYear.set(l.date.slice(0, 4), (perYear.get(l.date.slice(0, 4)) || 0) + 1);
        });
        keyOf = (letter) => {
            const reason = offAxisReason(letter);
            if (reason) return { key: `off:${reason}`, top: 'off', label: featureLabel(reason), sub: '' };
            const year = letter.date.slice(0, 4);
            if (perYear.get(year) <= monthSplit) return { key: year, top: year, label: year, sub: '' };
            const month = letter.date.length >= 7 ? Number(letter.date.slice(5, 7)) : 0;
            return { key: `${year}-${month}`, top: year, label: year, sub: MONTHS[month - 1] || 'ohne Monat' };
        };
    } else {
        const place = order === 'place-asc';
        keyOf = (letter) => {
            const name = place ? placeSortName(letter) : personSortName(letter, centreKey);
            if (!name) return { key: 'none', top: 'none', label: place ? 'Ohne Ort' : 'Ohne Namen', sub: '' };
            const initial = initialOf(name);
            return { key: initial, top: initial, label: initial === '#' ? 'Andere' : initial, sub: '' };
        };
    }
    const groups = [];
    for (const letter of sorted) {
        const head = keyOf(letter);
        const last = groups[groups.length - 1];
        if (last && last.key === head.key) last.letters.push(letter);
        else groups.push({ ...head, letters: [letter] });
    }
    return groups;
}

/**
 * Columns of the figure above the list: in a date order every year from the first to the last,
 * empty years included so the axis keeps its scale, and one column for the letters off the axis;
 * in a name order one column per initial. Each column counts its letters by language.
 * @param {Array} groups - result of groupLetters
 * @param {string} order
 * @returns {{top: string, label: string, total: number, languages: Map<string, number>}[]}
 */
export function selectionProfile(groups, order) {
    const columns = new Map();
    const column = (top, label) => {
        if (!columns.has(top)) columns.set(top, { top, label, total: 0, languages: new Map() });
        return columns.get(top);
    };
    const dated = order === 'date-desc' || order === 'date-asc';
    if (dated) {
        const years = groups.filter(g => g.top !== 'off').map(g => Number(g.top));
        if (years.length) {
            for (let y = Math.min(...years); y <= Math.max(...years); y++) column(String(y), String(y));
        }
    }
    for (const group of groups) {
        const col = column(group.top, group.top === 'off' ? 'ohne Jahr' : group.label);
        for (const letter of group.letters) {
            const code = letter.language?.code || NO_LANGUAGE;
            const shade = code === NO_LANGUAGE || !isRestLanguage(code) ? code : 'other';
            col.total++;
            col.languages.set(shade, (col.languages.get(shade) || 0) + 1);
        }
    }
    return [...columns.values()];
}

// Search fields of a letter, folded once per letter instead of on every keystroke
const haystacks = new WeakMap();
function haystackOf(letter) {
    let text = haystacks.get(letter);
    if (text === undefined) {
        text = foldText([
            letter.sender?.name, ...letterRecipients(letter).map(r => r.name), letter.place_sent?.name,
            ...(letter.placeAlternatives || []).map(p => p.name),
            ...(letter.addresses || [letter.address]), letter.postmark, letter.signature, letter.dateText, letter.dateSupplied,
            letter.language?.label || (letter.language?.code ? languageLabel(letter.language.code) : ''),
            letter.id, letter.url
        ].filter(Boolean).join('\n'));
        haystacks.set(letter, text);
    }
    return text;
}

let renderedFrom = null;
let renderedKey = '';

export function renderLettersList() {
    const container = elements.lettersList;
    if (!container) return;

    const filtered = deps.getFilteredLetters();
    // The key under the profile is its legend and the language filter (rules 2 and 5)
    deps.renderLanguageKey?.(document.getElementById('letters-key'));
    // The same letters in the same order keep their rows, scroll position and focus: switching
    // back to the list or a filter set to the value it has hands out a new array of the same letters
    const key = `${lettersSearchTerm}|${lettersSortOrder}`;
    if (key === renderedKey && renderedFrom && filtered.length === renderedFrom.length && filtered.every((l, i) => l === renderedFrom[i])) {
        // A star set in the drawer meanwhile shows here as well
        container.querySelectorAll('.btn-letter-basket[data-letter-id]').forEach(star => {
            const inBasket = isInBasket('letters', star.dataset.letterId);
            star.classList.toggle('in-basket', inBasket);
            star.setAttribute('aria-pressed', String(inBasket));
        });
        return;
    }
    renderedFrom = filtered;
    renderedKey = key;

    const letters = lettersSearchTerm ? filtered.filter(l => haystackOf(l).includes(lettersSearchTerm)) : filtered;
    const centre = rowCentre();
    const sorted = sortLetters(letters, lettersSortOrder, centre?.key);

    // The count of the selection stands in the line at the lower edge, as in every view (rule 1).
    // Above the list stand only what the search leaves of it and how the rows are told
    const result = document.getElementById('letters-result');
    if (result) {
        const hits = lettersSearchTerm
            ? `${countOf(letters.length, filtered.length, letters.length === 1 ? 'Brief' : 'Briefe', 'Briefen')} ${letters.length === 1 ? 'enthält' : 'enthalten'} den Suchbegriff`
            : '';
        // No hit: the sentence of the empty state says it, a zero above it would repeat it
        result.innerHTML = letters.length === 0 ? ''
            : `${escapeHtml(hits)}${centre ? `<span class="lv-centre">${hits ? '. ' : ''}Mit ${escapeHtml(centre.name)}: „von“ nennt den Absender, „an“ den Empfänger</span>` : ''}`;
    }
    // The brackets are explained once where they occur, not only in a tooltip
    document.getElementById('letters-legend')?.classList.toggle('hidden',
        !letters.some(hasBrackets));

    const profileHost = document.getElementById('letters-profile');
    if (sorted.length === 0) {
        profileHost?.classList.add('hidden');
        lists.get(container)?.observer.disconnect();
        lists.delete(container);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope" aria-hidden="true"></i>
                <p>Keine Briefe gefunden. ${lettersSearchTerm ? 'Ändern Sie den Suchbegriff.' : ''} ${deps.hasActiveFilter() ? 'Setzen Sie die Filter in der Seitenleiste zurück.' : ''}</p>
            </div>
        `;
        return;
    }

    const list = renderLetterGroups(container, sorted, {
        order: lettersSortOrder,
        centre,
        onPosition: tops => markProfile(profileHost, tops)
    });
    if (profileHost) {
        profileHost.classList.remove('hidden');
        profile.columns = selectionProfile(list.groups, lettersSortOrder);
        profile.dated = lettersSortOrder.startsWith('date');
        profile.list = list;
        profile.tops = new Set();
        drawProfile(profileHost);
    }
}

// Rows rendered per step: a group is laid out as an empty stretch of its estimated height, and its
// rows are written when that stretch comes near the visible part of the list. A selection of the
// whole archive opens without building some ten thousand rows, and the scroll bar and a jump to a
// year still reach every letter.
const CHUNK = 50;
const lists = new WeakMap();

/**
 * Render sorted letters as groups of rows into a scrolling container. Used by the letter list and
 * the letters drawer, so both show the same groups and rows.
 * @param {HTMLElement} container - the element that scrolls
 * @param {Array} sorted - letters in their final order
 * @param {{order?: string, centre?: {key: string, name: string}|null, onPosition?: function(Set<string>): void}} [options]
 * @returns {{groups: Array, jumpTo: function(string, {focus?: boolean}=): void}}
 */
export function renderLetterGroups(container, sorted, { order = 'date-asc', centre = rowCentre(), onPosition = null } = {}) {
    lists.get(container)?.observer.disconnect();
    const groups = groupLetters(sorted, order, { centreKey: centre?.key });
    const list = {
        groups,
        centre,
        compactDate: order.startsWith('date'),
        onPosition,
        current: null,
        observer: null,
        jumpTo: (top, options) => jumpTo(container, top, options)
    };
    lists.set(container, list);
    const idBase = `${container.id || 'letters'}-group`;
    container.classList.add('lv-scroll');
    container.classList.toggle('lv-scroll--pairs', !centre);
    container.classList.toggle('lv-scroll--compact', list.compactDate);
    container.classList.toggle('lv-scroll--plain', !sorted.some(l => hasNotes(l, centre?.key)));
    container.innerHTML = `<ol class="lv-groups">${groups.map((group, gi) => {
        const chunks = [];
        for (let start = 0; start < group.letters.length; start += CHUNK) {
            chunks.push(`<li class="lv-pending" aria-hidden="true" data-group="${gi}" data-start="${start}" style="--rows: ${Math.min(CHUNK, group.letters.length - start)}"></li>`);
        }
        return `<li class="lv-group" data-top="${escapeHtml(group.top)}">
            <div class="lv-label" id="${idBase}-${gi}"><span class="lv-label__main">${escapeHtml(group.label)}</span>${group.sub ? `<span class="lv-label__sub">${escapeHtml(group.sub)}</span>` : ''}</div>
            <ol class="lv-rows" aria-labelledby="${idBase}-${gi}">${chunks.join('')}</ol>
        </li>`;
    }).join('')}</ol>`;

    list.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) fillChunk(container, entry.target); });
    }, { root: container, rootMargin: '600px 0px' });
    container.querySelectorAll('.lv-pending').forEach(p => list.observer.observe(p));
    container.scrollTop = 0;
    // The first rows are written at once, so focus can move to the first letter right away
    const first = container.querySelector('.lv-pending');
    if (first) fillChunk(container, first);

    if (!container.dataset.positionBound) {
        container.dataset.positionBound = 'true';
        let frame = 0;
        const report = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => { frame = 0; reportPosition(container); });
        };
        container.addEventListener('scroll', report, { passive: true });
        // A list rendered while its view was hidden reports once it has a height
        new ResizeObserver(report).observe(container);
    }
    requestAnimationFrame(() => reportPosition(container));
    return list;
}

function fillChunk(container, pending) {
    const list = lists.get(container);
    if (!list || !pending.isConnected) return;
    list.observer.unobserve(pending);
    const group = list.groups[Number(pending.dataset.group)];
    const start = Number(pending.dataset.start);
    const rows = group.letters.slice(start, start + CHUNK)
        .map(letter => letterRowHtml(letter, { centre: list.centre, compactDate: list.compactDate })).join('');
    const parent = pending.parentElement;
    pending.outerHTML = rows;
    // The stretch left for the rows not yet written follows the height rows really take
    if (!list.measured) {
        const shown = parent.querySelectorAll('.letter-card');
        const height = parent.getBoundingClientRect().height;
        // A list rendered while its view is hidden has no height yet; it measures on a later step
        if (shown.length && height > 0) {
            list.measured = true;
            container.style.setProperty('--lv-row-height', `${height / shown.length}px`);
        }
    }
    // Rows written change the offsets; the figure follows once the frame is laid out
    if (!list.positionFrame) {
        list.positionFrame = requestAnimationFrame(() => { list.positionFrame = 0; reportPosition(container); });
    }
}

// The groups in sight, by their column in the figure; groups are in document order, so the first
// one in sight is found by halving
function reportPosition(container) {
    const list = lists.get(container);
    if (!list?.onPosition) return;
    const groupEls = container.querySelectorAll('.lv-group');
    const top = container.scrollTop;
    const bottom = top + container.clientHeight;
    let lo = 0;
    let hi = groupEls.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const el = groupEls[mid];
        if (el.offsetTop + el.offsetHeight <= top) lo = mid + 1;
        else hi = mid;
    }
    const tops = new Set();
    for (let i = lo; i < groupEls.length && groupEls[i].offsetTop < bottom; i++) tops.add(groupEls[i].dataset.top);
    const key = [...tops].join('|');
    if (key === list.current) return;
    list.current = key;
    list.onPosition(tops);
}

/**
 * Scroll the list to the first group of a column of the figure. With focus, the keyboard continues
 * at the first letter of that group.
 */
function jumpTo(container, top, { focus = false } = {}) {
    const groupEl = container.querySelector(`.lv-group[data-top="${CSS.escape(top)}"]`);
    if (!groupEl) return;
    const first = groupEl.querySelector('.lv-pending');
    if (first) fillChunk(container, first);
    const settle = (frames) => {
        container.scrollTop = groupEl.offsetTop;
        // Rows written above the target in the frames after the jump can move it; follow it briefly
        if (frames > 0) requestAnimationFrame(() => settle(frames - 1));
    };
    settle(3);
    if (focus) groupEl.querySelector('.letter-toggle')?.focus({ preventScroll: true });
}

const profile = { columns: [], dated: true, list: null, tops: new Set() };

// Gap in pixels a year label needs beside the next one
const TICK_SPACE = 64;
const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

function drawProfile(host) {
    const columns = profile.columns;
    const max = Math.max(1, ...columns.map(c => c.total));
    const axisColumns = columns.filter(c => c.top !== 'off').length;
    const width = host.clientWidth || 600;
    const step = profile.dated
        ? TICK_STEPS.find(s => (width / Math.max(1, axisColumns)) * s >= TICK_SPACE) || 100
        : 1;
    const colourOf = code => LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other;
    const hasLanguages = columns.some(c => [...c.languages.keys()].some(code => code !== NO_LANGUAGE));
    // Bottom to top in the order of the language colours, the most frequent language at the base
    const order = Object.keys(LANGUAGE_COLORS);
    const rank = code => (order.indexOf(code) < 0 ? order.length : order.indexOf(code));

    // The figure is one listbox: its columns are options, so it takes one tab stop and no control
    // per year (the density limit counts controls in the first screen)
    host.innerHTML = `<div class="lv-profile__bars">${columns.map((col, i) => {
        const off = col.top === 'off';
        const tick = off || !profile.dated || Number(col.top) % step === 0
            ? `<span class="lv-bar__tick" aria-hidden="true">${escapeHtml(col.label)}</span>` : '';
        if (col.total === 0) return `<span class="lv-bar lv-bar--empty" aria-hidden="true">${tick}</span>`;
        const segments = hasLanguages
            ? [...col.languages].sort((a, b) => rank(a[0]) - rank(b[0]))
                .map(([code, n]) => `<span class="lv-bar__seg" style="flex-grow: ${n}; background: ${colourOf(code)}"></span>`).join('')
            : `<span class="lv-bar__seg lv-bar__seg--plain" style="flex-grow: 1"></span>`;
        const name = `${off ? 'Ohne Platz auf der Zeitachse' : col.label}: ${col.total.toLocaleString('de-DE')} ${col.total === 1 ? 'Brief' : 'Briefe'}`;
        return `<span class="lv-bar${off ? ' lv-bar--off' : ''}" role="option" id="letters-profile-${i}" aria-selected="false" data-top="${escapeHtml(col.top)}" aria-label="${escapeHtml(name)}" title="${escapeHtml(name)}">
            <span class="lv-bar__stack" style="height: ${Math.max(4, (col.total / max) * 100)}%">${segments}</span>${tick}
        </span>`;
    }).join('')}</div>`;
    host.removeAttribute('aria-activedescendant');
    // A figure drawn again for a new width keeps the mark of where the list is
    markProfile(host, profile.tops);
    host.setAttribute('aria-label', profile.dated
        ? 'Briefe je Jahr. Pfeiltasten wählen ein Jahr, Enter springt in der Liste dorthin.'
        : 'Briefe je Anfangsbuchstabe. Pfeiltasten wählen einen Buchstaben, Enter springt in der Liste dorthin.');
}

function markProfile(host, tops) {
    profile.tops = tops;
    host?.querySelectorAll('.lv-bar[data-top]').forEach(bar => bar.classList.toggle('is-current', tops.has(bar.dataset.top)));
}

// The column the keyboard stands on, announced through aria-activedescendant
function setActiveColumn(host, bar) {
    host.querySelectorAll('.lv-bar.is-active').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
    if (!bar) return;
    bar.classList.add('is-active');
    bar.setAttribute('aria-selected', 'true');
    host.setAttribute('aria-activedescendant', bar.id);
}

// One tab stop for the figure: arrow keys move between its columns, Enter or Space jumps to the
// column's letters and hands the keyboard to the first of them; a click jumps there as well
function bindProfile(host) {
    if (!host || host.dataset.bound) return;
    host.dataset.bound = 'true';
    host.addEventListener('click', (e) => {
        const bar = e.target.closest('.lv-bar[data-top]');
        if (!bar || !profile.list) return;
        setActiveColumn(host, bar);
        profile.list.jumpTo(bar.dataset.top);
    });
    // Focus starts on the column the list shows
    host.addEventListener('focus', () => {
        if (!host.querySelector('.lv-bar.is-active')) {
            setActiveColumn(host, host.querySelector('.lv-bar.is-current') || host.querySelector('.lv-bar[data-top]'));
        }
    });
    host.addEventListener('keydown', (e) => {
        const bars = [...host.querySelectorAll('.lv-bar[data-top]')];
        const index = bars.findIndex(b => b.classList.contains('is-active'));
        if ((e.key === 'Enter' || e.key === ' ') && index >= 0 && profile.list) {
            e.preventDefault();
            profile.list.jumpTo(bars[index].dataset.top, { focus: true });
            return;
        }
        const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: bars.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        setActiveColumn(host, bars[Math.max(0, Math.min(bars.length - 1, next))]);
    });
    // The year labels thin out by the width the figure has
    let width = 0;
    new ResizeObserver(entries => {
        const now = Math.round(entries[0].contentRect.width);
        if (now && Math.abs(now - width) > 40 && profile.columns.length) {
            width = now;
            drawProfile(host);
            if (profile.list) reportPosition(elements.lettersList);
        }
    }).observe(host);
}

const forwardedTo = letter => (letter.furtherActions || []).filter(a => a.type === 'forwarded').flatMap(a => a.persons);

// Whether a letter shows a value in the editorial brackets, which the legend explains
const hasBrackets = letter => Boolean(letter.dateInferred || letter.place_sent?.inferred
    || letter.placeAlternatives?.some(p => p.inferred));

// Whether a row has anything in its last column; a list without any drops that column
function hasNotes(letter, centreKey) {
    return Boolean(letter.postmark || letter.address || letter.signature || letter.records?.length > 1
        || letter.dateSupplied || letter.placeAlternatives?.length || letter.sharedSignature?.length
        || forwardedTo(letter).length || letterDirection(letter, centreKey)?.also.length);
}

// Further places of sending in the notation of the place column, an inferred one in brackets
const alternativesHtml = letter => (letter.placeAlternatives || [])
    .map(p => formatPlaceName(p.name, p.geonames_id ? 'exact' : 'region', p.inferred)).join('; ');
const alternativesLabel = letter => (letter.placeAlternatives?.length === 1 ? 'Weiterer Absendeort' : 'Weitere Absendeorte');

const namesHtml = persons => (persons.length
    ? persons.map(p => formatPersonName(p.name, p.precision)).join('; ')
    : formatPersonName(null));

/**
 * One letter as a row: star of the basket, date, the persons as the button that opens the letter,
 * place, language and what the source records beyond that. The columns line up across rows.
 * Told from one person (rowCentre), a row names the other party with "von" or "an".
 * @param {Object} letter
 * @param {{centre?: {key: string}|null, compactDate?: boolean}} [options] - compactDate leaves the
 *   year of a plain day date to the label of its group
 * @returns {string} escaped HTML of an li element
 */
function letterRowHtml(letter, { centre = null, compactDate = false } = {}) {
    const direction = letterDirection(letter, centre?.key);
    const who = direction
        ? `<span class="lv-dir">${direction.dir === 'to' ? 'an' : 'von'}</span> <span class="lv-name">${namesHtml(direction.others)}</span>`
        : `<span class="lv-name">${formatPersonName(letter.sender?.name, letter.sender?.precision)}</span>
           <span class="letter-arrow" role="img" aria-label="an"><i class="fas fa-arrow-right" aria-hidden="true"></i></span>
           <span class="lv-name">${namesHtml(letterRecipients(letter))}</span>`;

    const plainDay = compactDate && letter.datePrecision === 'day' && !letter.dateInferred
        && letter.dateCertainty !== 'low' && !offAxisReason(letter) && /^\d{4}-\d{2}-\d{2}$/.test(letter.date || '');
    const date = plainDay
        ? `${Number(letter.date.slice(8, 10))}.${Number(letter.date.slice(5, 7))}.`
        : formatDateWithPrecision(letter);
    const dateClass = getDatePrecisionClass(letter.datePrecision, letter.dateCertainty);
    const placeName = formatPlaceName(letter.place_sent?.name, letter.place_sent?.precision, letter.place_sent?.inferred);
    // The language is its colour field together with its name, so the meaning never rests on the
    // colour alone; the colour ties the row to the key above the list
    const code = letter.language?.code;
    const languageName = code ? escapeHtml(letter.language.label || languageLabel(code)) : '';
    const language = code
        ? `<span class="lang-swatch" style="background: ${LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other}" aria-hidden="true"></span>${languageName}`
        : '';

    const labelled = (label, valueHtml) => (valueHtml
        ? `<span class="letter-meta__labelled"><span class="letter-meta__label">${label}</span> ${valueHtml}</span>` : '');
    const forwarded = forwardedTo(letter);
    const recordNote = letter.records?.length > 1
        ? `${letter.records.length} Einträge in der Quelle${letter.recordsDiffer ? ', Angaben weichen ab' : ''}` : '';
    const sharedNote = letter.sharedSignature?.length
        ? `Gleiche Signatur wie ${letter.sharedSignature.map(sharedLetterLabel).join('; ')}` : '';
    const inBasket = isInBasket('letters', letter.id);

    // The persons are the button that opens the letter; the star stays a sibling control
    return `<li class="letter-card" data-id="${escapeHtml(letter.id || '')}">
        <button type="button" class="btn-letter-basket ${inBasket ? 'in-basket' : ''}"
                data-letter-id="${escapeHtml(letter.id || '')}"
                aria-label="Im Wissenskorb" aria-pressed="${inBasket}"
                title="${inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufügen'}">
            <i class="fas fa-star" aria-hidden="true"></i>
        </button>
        <span class="lv-date letter-date ${dateClass}">${date}</span>
        <button type="button" class="letter-toggle lv-who" aria-haspopup="dialog">${who}</button>
        <span class="lv-place">${placeName}</span>
        <span class="lv-lang">${language}</span>
        <span class="letter-meta lv-notes">${[
            direction?.also.length ? labelled('Auch an', namesHtml(direction.also)) : '',
            forwarded.length ? labelled('Weitergeleitet an', namesHtml(forwarded)) : '',
            labelled('Ergänztes Datum', escapeHtml(letter.dateSupplied || '')),
            labelled(alternativesLabel(letter), alternativesHtml(letter)),
            labelled('Poststempel', escapeHtml(letter.postmark || '')),
            letter.addresses
                ? labelled('Anschriften', letter.addresses.map(escapeHtml).join(' | '))
                : labelled('Anschrift', escapeHtml(letter.address || '')),
            labelled('Signatur', escapeHtml(letter.signature || '')),
            recordNote ? `<span class="letter-meta__note">${recordNote}</span>` : '',
            sharedNote ? `<span class="letter-meta__note">${escapeHtml(sharedNote)}</span>` : ''
        ].join('')}</span>
    </li>`;
}

/**
 * Clicks of a list of letter rows, bound once on the list so rows added later need no listener of
 * their own: the star toggles the basket, the rest of a row opens the letter.
 * @param {HTMLElement|null} container
 */
export function bindLetterRows(container) {
    if (!container || container.dataset.rowsBound) return;
    container.dataset.rowsBound = 'true';
    container.addEventListener('click', (e) => {
        const star = e.target.closest('.btn-letter-basket');
        if (star) {
            if (star.dataset.letterId) toggleBasketButton(star, 'letters', star.dataset.letterId);
            return;
        }
        const card = e.target.closest('.letter-card');
        if (!card || e.target.closest('a')) return;
        // The dialog returns focus to the element that had it, so the row's button takes it first
        card.querySelector('.letter-toggle')?.focus();
        showLetterDetail(card.dataset.id);
    });
}

/**
 * Dialog of one letter with everything the source records about it
 * @param {string} letterId
 */
export function showLetterDetail(letterId) {
    const letter = deps.getAllLetters().find(l => l.id === letterId);
    if (!letter) return;

    const modal = elements.getById('letter-modal');
    const title = elements.getById('letter-modal-title');
    const body = elements.getById('letter-modal-body');

    if (!modal || !body) return;

    const sender = letter.sender?.name || 'Unbekannt';
    const recipient = letterRecipients(letter).map(r => r.name).join('; ') || 'Unbekannt';
    title.textContent = `${sender} an ${recipient}`;

    let html = '<div class="letter-detail">';

    html += '<div class="letter-detail-section">';
    html += '<h4>Grunddaten</h4>';
    // Date with its precision marker, as in the list (ADR-002)
    html += detailRow('Datum', formatDateWithPrecision(letter), getDatePrecisionClass(letter.datePrecision, letter.dateCertainty));
    // A date element the edition marked as supplied stands beside the date read, which stays as it is
    if (letter.dateSupplied) html += detailRow('Ergänztes Datum', escapeHtml(letter.dateSupplied));
    html += detailRow('Absender', buildPersonLink(letter.sender));
    // The source names several senders, such as a person and a publishing house
    if (letter.senders) html += detailRow('Absender laut Quelle', letter.senders.map(p => escapeHtml(p.name)).join('; '));
    // The wording says more than the machine-readable value wherever that value is no day
    if (letter.dateWording && (letter.dateImplausible || letter.datePrecision !== 'day')) html += detailRow('Datum im Brief', escapeHtml(letter.dateWording));
    if (letter.placeText) html += detailRow('Ortsangabe im Brief', escapeHtml(letter.placeText));
    html += detailRow('Empfänger', letterRecipients(letter).map(buildPersonLink).join('; ') || buildPersonLink(null));
    if (letter.place_sent?.name) {
        html += detailRow('Absendeort', letter.place_sent.inferred
            ? formatPlaceName(letter.place_sent.name, letter.place_sent.precision, true)
            : buildPlaceLink(letter.place_sent));
    }
    // Further places of sending the source names; the place above stays the one the views count
    if (letter.placeAlternatives?.length) {
        html += detailRow(alternativesLabel(letter), letter.placeAlternatives
            .map(p => (p.inferred ? formatPlaceName(p.name, 'exact', true) : buildPlaceLink(p))).join('; '));
    }
    // Actions besides sending and receiving, as the source states them
    for (const action of letter.furtherActions || []) {
        const label = action.type === 'forwarded' ? 'Weitergeleitet an' : `Weitere Handlung (${escapeHtml(action.type)})`;
        const parts = [action.persons.map(buildPersonLink).join('; '), escapeHtml(action.place || ''), escapeHtml(action.date || '')];
        html += detailRow(label, parts.filter(Boolean).join(', ') || 'ohne Angabe');
    }
    if (letter.postmark) html += detailRow('Poststempel', escapeHtml(letter.postmark));
    // Each address on its own line where the letter carries several
    if (letter.addresses) {
        html += detailRow('Anschriften', letter.addresses.map(a => `<span class="letter-detail-line">${escapeHtml(a)}</span>`).join(''));
    } else if (letter.address) {
        html += detailRow('Anschrift', escapeHtml(letter.address));
    }
    if (letter.signature) html += detailRow('Signatur', escapeHtml(letter.signature));
    if (letter.file) html += detailRow('Datei', escapeHtml(letter.file));
    if (letter.language?.label) html += detailRow('Sprache', escapeHtml(letter.language.label));
    if (hasBrackets(letter)) {
        html += '<p class="list-legend">Eckige Klammern: von der Edition erschlossen, nicht dem Brief entnommen.</p>';
    }
    if (letter.recordsDiffer) {
        html += '<p class="list-legend">Die Angaben oben folgen dem ersten Eintrag der Quelle mit Datum, fehlende Angaben sind aus den übrigen Einträgen ergänzt. Alle Einträge stehen darunter.</p>';
    }
    html += '</div>';

    // A letter of another file with the same identified sender, recipients and day; the reader decides
    if (letter.parallels?.length) {
        html += '<div class="letter-detail-section">';
        html += '<h4>Möglicherweise derselbe Brief in einer anderen Datei</h4>';
        html += '<ul class="letter-records">';
        html += letter.parallels.map(p => `<li><span class="letter-records__id">${escapeHtml(p.id)}</span> ${escapeHtml(p.file)}</li>`).join('');
        html += '</ul>';
        html += '<p class="list-legend">Absender, Empfänger und Tag stimmen überein. Beide Einträge bleiben getrennt und zählen einzeln.</p>';
        html += '</div>';
    }

    // Other letters the source files under the same shelfmark with another date; each opens here
    const shared = (letter.sharedSignature || []).filter(s => s.id);
    if (shared.length) {
        html += '<div class="letter-detail-section">';
        html += '<h4>Unter derselben Signatur</h4>';
        html += '<ul class="letter-records">';
        html += shared.map(s => `<li><button type="button" class="letter-open-link" data-letter-id="${escapeHtml(s.id)}">${escapeHtml(sharedLetterLabel(s))}</button> <span class="letter-records__id">${escapeHtml(s.id)}</span></li>`).join('');
        html += '</ul>';
        html += '<p class="list-legend">Die Signatur steht für mehrere Briefe mit verschiedenem Datum. Jeder zählt einzeln.</p>';
        html += '</div>';
    }

    // Several records of the source for one letter are listed as they stand, nothing is decided between them
    if (letter.records?.length > 1) {
        html += '<div class="letter-detail-section">';
        html += `<h4>${letter.records.length} Einträge in der Quelle${letter.recordsDiffer ? ', Angaben weichen ab' : ''}</h4>`;
        html += '<ul class="letter-records">';
        html += letter.records.map(record => `<li><span class="letter-records__id">${escapeHtml(record.id)}</span> ${escapeHtml([
            record.sender || 'ohne Absender',
            `an ${record.recipients.join('; ') || 'ohne Empfänger'}`,
            record.place || 'ohne Ort',
            record.date || 'ohne Datum'
        ].join(', '))}</li>`).join('');
        html += '</ul></div>';
    }

    const mentionSections = [
        ['Erwähnte Themen', letter.mentions?.subjects, s => escapeHtml(s.label)],
        ['Erwähnte Personen', letter.mentions?.persons, p => buildPersonLink(p)],
        ['Erwähnte Orte', letter.mentions?.places, p => buildPlaceLink(p)]
    ];
    for (const [heading, items, render] of mentionSections) {
        if (!items?.length) continue;
        html += `<div class="letter-detail-section"><h4>${heading}</h4><div class="letter-detail-tags">`;
        html += items.map(item => `<span class="letter-detail-tag">${render(item)}</span>`).join('');
        html += '</div></div>';
    }

    html += '<div class="letter-detail-actions">';
    if (safeUrl(letter.url)) {
        html += `<a href="${escapeHtml(safeUrl(letter.url))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            <i class="fas fa-external-link-alt" aria-hidden="true"></i> Zur Quelle
        </a>`;
    }
    const inBasket = isInBasket('letters', letter.id);
    html += `<button type="button" class="btn btn-basket ${inBasket ? 'in-basket' : ''}" data-letter-id="${escapeHtml(letter.id)}">
        <i class="fas fa-star" aria-hidden="true"></i> <span class="btn-basket-label">${inBasket ? 'Im Korb' : 'Zum Korb'}</span>
    </button>`;
    const senderKey = personKey(letter.sender);
    if (senderKey) {
        html += `<button type="button" class="btn btn-secondary btn-filter-person" data-person-id="${escapeHtml(senderKey)}">
            <i class="fas fa-filter" aria-hidden="true"></i> Briefe von ${escapeHtml(letter.sender.name || 'Absender')}
        </button>`;
    }

    const senderCorrespUrl = buildCorrespSearchUrl(letter.sender);
    const recipientLinks = letterRecipients(letter)
        .map(r => [buildCorrespSearchUrl(r), r.name]).filter(([url]) => url);
    if (senderCorrespUrl || recipientLinks.length) {
        html += '<div class="corresp-search-links">';
        if (senderCorrespUrl) html += correspSearchLink(senderCorrespUrl, letter.sender.name, 'btn btn-secondary');
        html += recipientLinks.map(([url, name]) => correspSearchLink(url, name, 'btn btn-secondary')).join('');
        html += '</div>';
    }
    html += '</div></div>';

    body.innerHTML = html;
    // The dialog shows the other letter in place; its close button takes the focus the removed
    // button had, and closing still returns to the row the dialog was opened from
    body.querySelectorAll('.letter-open-link').forEach(btn => btn.addEventListener('click', () => {
        showLetterDetail(btn.dataset.letterId);
        modal.querySelector('.modal-close')?.focus();
    }));
    body.querySelector('.btn-filter-person')?.addEventListener('click', (e) => {
        closeModal(modal);
        deps.showLettersOfPerson(e.currentTarget.dataset.personId);
    });

    const basketBtn = body.querySelector('.btn-basket[data-letter-id]');
    basketBtn?.addEventListener('click', () => {
        // The visible label carries the state, so no aria-pressed here
        const nowInBasket = toggleBasketButton(basketBtn, 'letters', basketBtn.dataset.letterId, { pressed: false });
        basketBtn.querySelector('.btn-basket-label').textContent = nowInBasket ? 'Im Korb' : 'Zum Korb';
        // The star of the row behind the dialog, in the letter list or the drawer, shows the same state
        document.querySelectorAll(`.btn-letter-basket[data-letter-id="${CSS.escape(basketBtn.dataset.letterId)}"]`).forEach(rowStar => {
            rowStar.classList.toggle('in-basket', nowInBasket);
            rowStar.setAttribute('aria-pressed', String(nowInBasket));
            rowStar.title = nowInBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufügen';
        });
    });

    openModal(modal);
}
