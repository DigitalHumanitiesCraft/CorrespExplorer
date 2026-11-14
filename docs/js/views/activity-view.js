// Activity Heatmap View - calendar heatmap showing correspondence activity

import { escapeHtml, isMultiYearSpan } from '../utils.js';
import { renderDataTable, renderFilterNotice } from './view-support.js';

// Module state
let activityIndex = null;
let activitySelectedYear = 'all';

// External dependencies - injected via init
let getFilteredLetters = null;
let showLetterDetail = null;

/**
 * Initialize activity view with external dependencies
 * @param {Object} deps - External dependencies from explore.js
 */
export function initActivityView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    showLetterDetail = deps.showLetterDetail;
}

/**
 * Parse "YYYY-MM-DD" as a local calendar date; new Date(string) reads it as UTC midnight and
 * shows the previous day in time zones west of UTC
 * @param {string} dateStr
 * @returns {Date}
 */
function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// Largest entry of a count map, the first one on ties
function largest(map) {
    let best = { key: null, count: 0 };
    for (const [key, count] of map) {
        if (count > best.count) best = { key, count };
    }
    return best;
}

/**
 * Builds index for activity heatmap. Only day-precise letters go into day cells: a month, year
 * or range date has no day, and placing it on the first day would invent a peak (NFR-04).
 * Years and months count like the timeline, every letter that has the year or the month, so the
 * busiest year here and the highest bar there agree.
 * @param {Array} letters - Array of letter objects
 * @returns {Object} Index with byDate, byYear, the counts per year and month, the busiest day,
 *   month and year, and the count of letters without a day cell by reason
 */
export function buildActivityIndex(letters) {
    const byDate = new Map();         // "YYYY-MM-DD" -> {count, ids}
    const byYear = new Map();         // YYYY -> count of day-precise letters, for the year select
    const lettersByYear = new Map();  // YYYY -> letters with this year, as in the timeline
    const lettersByMonth = new Map(); // "YYYY-MM" -> letters dated to the day or the month
    // undated: no date at all; text: date only as words; implausible: a year far outside the
    // dataset (the date stays, the year is withheld, cmif-parser flagImplausibleYears)
    const withoutDay = { month: 0, year: 0, range: 0, undated: 0, text: 0, implausible: 0 };

    let total = 0;

    for (const letter of letters) {
        // The same test as the year bars of the timeline
        if (letter.year && !isMultiYearSpan(letter)) {
            lettersByYear.set(letter.year, (lettersByYear.get(letter.year) || 0) + 1);
        }
        if (letter.dateImplausible) {
            withoutDay.implausible++;
            continue;
        }
        if (!letter.date || letter.datePrecision === 'unknown') {
            if (letter.dateText) withoutDay.text++; else withoutDay.undated++;
            continue;
        }

        if (letter.datePrecision === 'day' || letter.datePrecision === 'month') {
            const month = letter.date.substring(0, 7);
            lettersByMonth.set(month, (lettersByMonth.get(month) || 0) + 1);
        }

        if (letter.datePrecision !== 'day') {
            if (letter.datePrecision in withoutDay) withoutDay[letter.datePrecision]++;
            continue;
        }

        const date = letter.date.substring(0, 10);
        if (!byDate.has(date)) {
            byDate.set(date, { count: 0, ids: [] });
        }
        const dateEntry = byDate.get(date);
        dateEntry.count++;
        dateEntry.ids.push(letter.id);
        byYear.set(letter.year, (byYear.get(letter.year) || 0) + 1);
        total++;
    }

    const day = largest(new Map([...byDate].map(([date, entry]) => [date, entry.count])));
    const year = largest(lettersByYear);
    const month = largest(lettersByMonth);

    return {
        byDate,
        byYear,
        lettersByYear,
        lettersByMonth,
        total,
        withoutDay,
        maxDay: { date: day.key, count: day.count },
        maxYear: { year: year.key, count: year.count },
        maxMonth: { month: month.key, count: month.count },
        years: [...byYear.keys()].sort((a, b) => a - b)
    };
}

/**
 * Renders the Activity Heatmap View
 */
export function renderActivity() {
    const container = document.getElementById('activity-view');
    if (!container) return;

    const letters = getFilteredLetters();

    activityIndex = buildActivityIndex(letters);
    if (activitySelectedYear !== 'all' && !activityIndex.years.includes(activitySelectedYear)) {
        activitySelectedYear = 'all';
    }

    renderFilterNotice('activity-view');
    renderWithoutDayNote();

    // Render year selector
    bindYearSelector();
    renderActivityYearSelector();

    // Render heatmap
    renderActivitySummary();
    renderActivityHeatmap();
    renderActivityTable();

    // Hide details panel
    const detailsPanel = document.getElementById('activity-details');
    if (detailsPanel) detailsPanel.classList.add('hidden');
}

/**
 * German date of a day key: long form with weekday for headings, DD.MM.YYYY otherwise.
 * The short form is built from the string, because the heatmap labels up to 366 cells per year.
 */
function formatDay(dateStr, withWeekday = true) {
    if (!withWeekday) {
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    }
    return parseLocalDate(dateStr).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const num = n => n.toLocaleString('de-DE');

// "1938-05" -> "Mai 1938"; without year -> "Mai"
function monthName(key, withYear = true) {
    const name = MONTH_NAMES[parseInt(key.substring(5, 7), 10) - 1];
    return withYear ? `${name} ${key.substring(0, 4)}` : name;
}

/**
 * The busiest year, month and day in one sentence, in place of four figure boxes, so the
 * question "when was most written" is answered without reading the table. With a year chosen,
 * a second sentence names that year's total and its busiest month.
 */
function renderActivitySummary() {
    const el = document.getElementById('activity-summary');
    if (!el || !activityIndex) return;
    const { total, maxYear, maxMonth, maxDay, lettersByYear, lettersByMonth } = activityIndex;
    if (total === 0 && !maxYear.year) {
        el.textContent = 'Kein Brief ist tagesgenau datiert, die Heatmap bleibt leer.';
        return;
    }
    const sentences = [`${num(total)} ${total === 1 ? 'Brief ist' : 'Briefe sind'} tagesgenau datiert.`];
    const peaks = [];
    if (maxYear.year) peaks.push(`im Jahr ${maxYear.year} (${num(maxYear.count)})`);
    if (maxMonth.month) peaks.push(`im ${monthName(maxMonth.month)} (${num(maxMonth.count)})`);
    if (maxDay.date) peaks.push(`am ${formatDay(maxDay.date, false)} (${num(maxDay.count)})`);
    if (peaks.length) sentences.push(`Die meisten Briefe entstanden ${peaks.join(', ').replace(/, ([^,]*)$/, ' und $1')}.`);
    if (activitySelectedYear !== 'all') {
        const yearMonths = new Map([...lettersByMonth].filter(([key]) => key.startsWith(`${activitySelectedYear}-`)));
        const busiest = largest(yearMonths);
        const count = lettersByYear.get(activitySelectedYear) || 0;
        sentences.push(`${activitySelectedYear}: ${num(count)} ${count === 1 ? 'Brief' : 'Briefe'}${busiest.key ? `, die meisten im ${monthName(busiest.key, false)} (${num(busiest.count)})` : ''}.`);
    }
    el.textContent = sentences.join(' ');
}

/**
 * Note on the letters without a day cell, beside the heatmap it explains: dated only to month,
 * year or a range, dated only in words, with an implausible year, or undated. Together with the
 * day-precise letters they add up to the shown letters, so none goes unmentioned.
 */
function renderWithoutDayNote() {
    const note = document.getElementById('activity-without-day-note');
    if (!note || !activityIndex) return;
    const { month, year, range, undated, text, implausible } = activityIndex.withoutDay;
    const parts = [];
    if (month) parts.push(`${num(month)} nur auf den Monat datiert`);
    if (year) parts.push(`${num(year)} nur auf das Jahr datiert`);
    if (range) parts.push(`${num(range)} auf einen Zeitraum datiert`);
    if (text) parts.push(`${num(text)} nur als Text datiert`);
    if (implausible) parts.push(`${num(implausible)} mit unplausiblem Jahr`);
    if (undated) parts.push(`${num(undated)} ohne Datum`);
    const sum = month + year + range + undated + text + implausible;
    if (sum === 0) {
        note.classList.add('hidden');
        note.textContent = '';
        return;
    }
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}` : parts[0];
    note.textContent = `Die Heatmap zeigt nur tagesgenau datierte Briefe. ${sum === 1 ? 'Ein weiterer Brief fehlt in ihr' : `${num(sum)} weitere Briefe fehlen in ihr`}: ${list}.`;
    note.classList.remove('hidden');
}

/**
 * Fills the year select (all years, then each year with its day-precise letters, labelled
 * "tagesgenau" because the heatmap leaves out the letters dated to month or year) and enables
 * the previous and next buttons. A select keeps decades of years in one line, where one button
 * per year filled the screen above the heatmap.
 */
function renderActivityYearSelector() {
    const select = document.getElementById('activity-year-select');
    if (!select || !activityIndex) return;

    const options = [['all', 'Alle Jahre'], ...activityIndex.years.map(year =>
        [String(year), `${year} (${(activityIndex.byYear.get(year) || 0).toLocaleString('de-DE')} tagesgenau)`])];
    select.innerHTML = options.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('');
    select.value = String(activitySelectedYear);
    updateYearSteps();
}

function selectActivityYear(value) {
    activitySelectedYear = value === 'all' ? 'all' : parseInt(value, 10);
    const select = document.getElementById('activity-year-select');
    if (select) select.value = String(activitySelectedYear);
    updateYearSteps();
    renderActivitySummary();
    renderActivityHeatmap();
}

// Previous and next walk through the select's options, from "Alle Jahre" into the first year
function updateYearSteps() {
    const select = document.getElementById('activity-year-select');
    if (!select) return;
    document.querySelectorAll('.activity-year-step').forEach(btn => {
        const target = select.selectedIndex + Number(btn.dataset.step);
        btn.disabled = target < 0 || target >= select.options.length;
    });
}

function bindYearSelector() {
    const select = document.getElementById('activity-year-select');
    if (!select || select.dataset.bound) return;
    select.dataset.bound = 'true';
    select.addEventListener('change', () => selectActivityYear(select.value));
    document.querySelectorAll('.activity-year-step').forEach(btn => {
        btn.addEventListener('click', () => {
            const option = select.options[select.selectedIndex + Number(btn.dataset.step)];
            if (option) selectActivityYear(option.value);
        });
    });
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

// Text alternative of the heatmap: day-precise letters per year and month
function renderActivityTable() {
    if (!activityIndex) return;
    const perYear = new Map(activityIndex.years.map(year => [year, new Array(12).fill(0)]));
    for (const [date, data] of activityIndex.byDate) {
        const months = perYear.get(parseInt(date.substring(0, 4), 10));
        if (months) months[parseInt(date.substring(5, 7), 10) - 1] += data.count;
    }
    renderDataTable(document.getElementById('activity-table'), {
        caption: 'Tagesgenau datierte Briefe je Monat',
        columns: ['Jahr', ...MONTHS, 'Summe'],
        rows: [...perYear].map(([year, months]) => [String(year), ...months, months.reduce((a, b) => a + b, 0)])
    });
}

/**
 * Renders the heatmap grid
 */
function renderActivityHeatmap() {
    const container = document.getElementById('activity-heatmap');
    if (!container || !activityIndex) return;

    const { byDate, years } = activityIndex;

    // Filter years
    const displayYears = activitySelectedYear === 'all'
        ? years
        : [activitySelectedYear];

    // Calculate max value for color scale (for displayed years)
    let maxCount = 0;
    for (const [date, data] of byDate) {
        const year = parseInt(date.substring(0, 4));
        if (displayYears.includes(year) && data.count > maxCount) {
            maxCount = data.count;
        }
    }

    // Generate HTML
    let html = '';

    for (const year of displayYears) {
        // First date of year
        const firstDay = new Date(year, 0, 1);
        const lastDay = new Date(year, 11, 31);

        // For each day of year
        const currentDate = new Date(firstDay);
        let weekHtml = '<div class="activity-week">';
        // One slot per week column; a month's name stands over the week that holds its first day
        const monthSlots = [''];

        // Empty cells at start (before first weekday)
        const firstWeekday = firstDay.getDay();
        const adjustedFirstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;
        for (let i = 0; i < adjustedFirstWeekday; i++) {
            weekHtml += '<span class="activity-cell activity-cell-empty"></span>';
        }

        while (currentDate <= lastDay) {
            // Local calendar fields; toISOString would shift the day in time zones east of UTC
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            const data = byDate.get(dateStr);
            const count = data ? data.count : 0;
            const level = getActivityLevel(count, maxCount);

            const weekday = currentDate.getDay();
            const adjustedWeekday = weekday === 0 ? 6 : weekday - 1;

            // Start new week (Monday)
            if (adjustedWeekday === 0 && currentDate > firstDay) {
                weekHtml += '</div><div class="activity-week">';
                monthSlots.push('');
            }
            if (currentDate.getDate() === 1) monthSlots[monthSlots.length - 1] = MONTHS[currentDate.getMonth()];

            // Only days with letters are operable; one roving tab stop keeps Tab order usable
            const label = `${formatDay(dateStr, false)}: ${count} Brief${count !== 1 ? 'e' : ''}`;
            weekHtml += count > 0
                ? `<span class="activity-cell activity-level-${level}" role="button" tabindex="-1"
                              data-date="${dateStr}" data-count="${count}"
                              aria-label="${label}" title="${label}"></span>`
                : `<span class="activity-cell activity-level-0" data-date="${dateStr}" title="${label}"></span>`;

            currentDate.setDate(currentDate.getDate() + 1);
        }

        weekHtml += '</div>';
        // The month row repeats what each cell's label already says, so screen readers skip it
        html += `<div class="activity-year-block">
            <div class="activity-year-label">${year}</div>
            <div class="activity-month-row" aria-hidden="true">${monthSlots.map(m => `<span>${m}</span>`).join('')}</div>
            <div class="activity-year-grid">${weekHtml}</div></div>`;
    }

    container.innerHTML = html;
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Briefe pro Tag. Pfeiltasten wechseln zwischen Tagen mit Briefen, Enter zeigt die Briefe des Tages');

    const cells = [...container.querySelectorAll('.activity-cell[role="button"]')];
    if (cells.length > 0) cells[0].tabIndex = 0;

    // One delegated listener per container instead of one per cell; the container persists across renders
    if (!container.dataset.bound) {
        container.dataset.bound = '1';
        container.addEventListener('click', (e) => {
            const cell = e.target.closest('.activity-cell[role="button"]');
            if (!cell) return;
            moveCellFocus(container, cell, false);
            showActivityDetails(cell.dataset.date);
        });
        container.addEventListener('keydown', (e) => {
            const cell = e.target.closest('.activity-cell[role="button"]');
            if (!cell) return;
            const all = [...container.querySelectorAll('.activity-cell[role="button"]')];
            const index = all.indexOf(cell);
            const targets = {
                ArrowRight: index + 1, ArrowDown: index + 1,
                ArrowLeft: index - 1, ArrowUp: index - 1,
                Home: 0, End: all.length - 1
            };
            if (!(e.key in targets)) return;
            e.preventDefault();
            const next = all[Math.max(0, Math.min(all.length - 1, targets[e.key]))];
            if (next) moveCellFocus(container, next, true);
        });
    }
}

/**
 * Move the roving tab stop of the heatmap to a cell
 */
function moveCellFocus(container, cell, focus) {
    container.querySelectorAll('.activity-cell[tabindex="0"]').forEach(c => { c.tabIndex = -1; });
    cell.tabIndex = 0;
    if (focus) cell.focus();
}

/**
 * Calculates activity level (0-4) for color scale
 */
function getActivityLevel(count, maxCount) {
    if (count === 0) return 0;
    if (maxCount === 0) return 0;

    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

/**
 * Shows details for a specific day
 */
function showActivityDetails(date) {
    const detailsPanel = document.getElementById('activity-details');
    const dateEl = document.getElementById('activity-details-date');
    const listEl = document.getElementById('activity-details-list');

    if (!detailsPanel || !dateEl || !listEl || !activityIndex) return;

    const data = activityIndex.byDate.get(date);
    if (!data) return;

    dateEl.textContent = formatDay(date);

    const ids = new Set(data.ids);
    const dayLetters = getFilteredLetters().filter(l => ids.has(l.id));

    // Render list
    let html = '';
    for (const letter of dayLetters) {
        const senderName = letter.sender?.name || 'Unbekannt';
        const recipientName = letter.recipient?.name || 'Unbekannt';
        const place = letter.place_sent?.name || '';

        html += `<div class="activity-detail-item" role="button" tabindex="0" data-letter-id="${escapeHtml(letter.id)}">
            <span class="activity-detail-sender">${escapeHtml(senderName)}</span>
            <span class="activity-detail-arrow"><i class="fas fa-arrow-right"></i></span>
            <span class="activity-detail-recipient">${escapeHtml(recipientName)}</span>
            ${place ? `<span class="activity-detail-place">(${escapeHtml(place)})</span>` : ''}
        </div>`;
    }

    listEl.innerHTML = html;
    detailsPanel.classList.remove('hidden');

    // Click handlers for letter details
    listEl.querySelectorAll('.activity-detail-item').forEach(item => {
        item.addEventListener('click', () => showLetterDetail(item.dataset.letterId));
    });
}
