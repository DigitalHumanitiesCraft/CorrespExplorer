// Activity Heatmap View - calendar heatmap showing correspondence activity

import { escapeHtml } from '../utils.js';

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

/**
 * Builds index for activity heatmap. Only day-precise letters go into day cells: a month, year
 * or range date has no day, and placing it on the first day would invent a peak (NFR-04).
 * @param {Array} letters - Array of letter objects
 * @returns {Object} Index with byDate, byYear, byMonth, stats and the count of letters without a day
 */
export function buildActivityIndex(letters) {
    const byDate = new Map();      // "YYYY-MM-DD" -> {count, ids}
    const byYear = new Map();      // YYYY -> count of day-precise letters
    const byMonth = new Map();     // "YYYY-MM" -> count of day-precise letters
    const withoutDay = { month: 0, year: 0, range: 0, undated: 0 };
    const yearsWithLetters = new Set();

    let total = 0;
    let maxDay = { date: null, count: 0 };
    let maxYear = { year: null, count: 0 };

    for (const letter of letters) {
        if (!letter.date || letter.datePrecision === 'unknown') {
            withoutDay.undated++;
            continue;
        }

        if (letter.datePrecision !== 'day') {
            if (letter.datePrecision in withoutDay) withoutDay[letter.datePrecision]++;
            continue;
        }

        const date = letter.date.substring(0, 10);
        const year = letter.year;
        const month = date.substring(0, 7);

        if (!byDate.has(date)) {
            byDate.set(date, { count: 0, ids: [] });
        }
        const dateEntry = byDate.get(date);
        dateEntry.count++;
        dateEntry.ids.push(letter.id);

        byYear.set(year, (byYear.get(year) || 0) + 1);
        byMonth.set(month, (byMonth.get(month) || 0) + 1);
        yearsWithLetters.add(year);

        if (dateEntry.count > maxDay.count) {
            maxDay = { date, count: dateEntry.count };
        }

        total++;
    }

    for (const [year, count] of byYear) {
        if (count > maxYear.count) {
            maxYear = { year, count };
        }
    }

    const years = Array.from(yearsWithLetters).sort((a, b) => a - b);
    const monthCount = byMonth.size || 1;
    const avgPerMonth = Math.round(total / monthCount * 10) / 10;

    return {
        byDate,
        byYear,
        byMonth,
        total,
        withoutDay,
        maxDay,
        maxYear,
        years,
        avgPerMonth
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

    // Update statistics cards
    const totalEl = document.getElementById('activity-total');
    const busiestDayEl = document.getElementById('activity-busiest-day');
    const busiestYearEl = document.getElementById('activity-busiest-year');
    const avgEl = document.getElementById('activity-avg-per-month');

    if (totalEl) totalEl.textContent = activityIndex.total.toLocaleString('de-DE');
    if (busiestDayEl) {
        busiestDayEl.textContent = activityIndex.maxDay.date
            ? `${activityIndex.maxDay.count} (${formatDay(activityIndex.maxDay.date, false)})`
            : '-';
    }
    if (busiestYearEl) {
        busiestYearEl.textContent = activityIndex.maxYear.year
            ? `${activityIndex.maxYear.year} (${activityIndex.maxYear.count})`
            : '-';
    }
    if (avgEl) avgEl.textContent = activityIndex.avgPerMonth;

    renderWithoutDayNote(container);

    // Render year selector
    bindYearSelector();
    renderActivityYearSelector();

    // Render heatmap
    renderActivityHeatmap();

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

/**
 * Note on the letters dated only to month, year or a range, which have no day cell
 */
function renderWithoutDayNote(container) {
    let note = document.getElementById('activity-without-day-note');
    if (!note) {
        note = document.createElement('p');
        note.id = 'activity-without-day-note';
        note.className = 'filter-help';
        container.querySelector('.activity-stats')?.after(note);
    }
    const { month, year, range, undated } = activityIndex.withoutDay;
    const sum = month + year + range;
    if (sum + undated === 0) {
        note.classList.add('hidden');
        note.textContent = '';
        return;
    }
    const parts = [];
    if (month) parts.push(`${month.toLocaleString('de-DE')} auf den Monat`);
    if (year) parts.push(`${year.toLocaleString('de-DE')} auf das Jahr`);
    if (range) parts.push(`${range.toLocaleString('de-DE')} auf einen Zeitraum`);
    // Day, coarser and undated letters add up to the whole dataset, so no letter goes unmentioned
    const sentences = ['Die Heatmap zeigt nur tagesgenau datierte Briefe.'];
    if (sum) sentences.push(`${sum.toLocaleString('de-DE')} weitere Briefe sind nur ${parts.join(', ')} datiert.`);
    if (undated) sentences.push(`${undated.toLocaleString('de-DE')} ${undated === 1 ? 'Brief ist' : 'Briefe sind'} undatiert.`);
    sentences.push('Sie erscheinen in keiner Tageszelle.');
    note.textContent = sentences.join(' ');
    note.classList.remove('hidden');
}

/**
 * Fills the year select (all years, then each year with its day-precise letters) and enables
 * the previous and next buttons. A select keeps decades of years in one line, where one button
 * per year filled the screen above the heatmap.
 */
function renderActivityYearSelector() {
    const select = document.getElementById('activity-year-select');
    if (!select || !activityIndex) return;

    const options = [['all', 'Alle Jahre'], ...activityIndex.years.map(year =>
        [String(year), `${year} (${(activityIndex.byYear.get(year) || 0).toLocaleString('de-DE')} Briefe)`])];
    select.innerHTML = options.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('');
    select.value = String(activitySelectedYear);
    updateYearSteps();
}

function selectActivityYear(value) {
    activitySelectedYear = value === 'all' ? 'all' : parseInt(value, 10);
    const select = document.getElementById('activity-year-select');
    if (select) select.value = String(activitySelectedYear);
    updateYearSteps();
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
        html += `<div class="activity-year-block">
            <div class="activity-year-label">${year}</div>
            <div class="activity-year-grid">`;

        // First date of year
        const firstDay = new Date(year, 0, 1);
        const lastDay = new Date(year, 11, 31);

        // For each day of year
        const currentDate = new Date(firstDay);
        let weekHtml = '<div class="activity-week">';

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
            }

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
        html += weekHtml + '</div></div>';
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
