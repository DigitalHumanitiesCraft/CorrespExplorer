// Activity Heatmap View - Extracted from explore.js
// GitHub-style calendar heatmap showing correspondence activity

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
 * Builds index for activity heatmap
 * @param {Array} letters - Array of letter objects
 * @returns {Object} Index with byDate, byYear, byMonth, byWeekday, stats
 */
function buildActivityIndex(letters) {
    const byDate = new Map();      // "YYYY-MM-DD" -> {count, ids}
    const byYear = new Map();      // YYYY -> count
    const byMonth = new Map();     // "YYYY-MM" -> count
    const byWeekday = [0, 0, 0, 0, 0, 0, 0]; // Mo-So counts

    let total = 0;
    let maxDay = { date: null, count: 0 };
    let maxYear = { year: null, count: 0 };

    for (const letter of letters) {
        // Only letters with date (not 'unknown')
        if (!letter.date || letter.datePrecision === 'unknown') continue;

        const date = letter.date;  // "YYYY-MM-DD"
        const year = letter.year;
        const month = date.substring(0, 7);  // "YYYY-MM"

        // Calculate weekday (0=Su in JS, we want 0=Mo)
        const jsWeekday = new Date(date).getDay();
        const weekday = jsWeekday === 0 ? 6 : jsWeekday - 1;

        // Aggregate by date
        if (!byDate.has(date)) {
            byDate.set(date, { count: 0, ids: [] });
        }
        const dateEntry = byDate.get(date);
        dateEntry.count++;
        dateEntry.ids.push(letter.id);

        // Aggregate by year
        byYear.set(year, (byYear.get(year) || 0) + 1);

        // Aggregate by month
        byMonth.set(month, (byMonth.get(month) || 0) + 1);

        // Aggregate by weekday
        byWeekday[weekday]++;

        // Track max day (only exact dates, not placeholders like 1798-01-01)
        if (letter.datePrecision === 'exact' && dateEntry.count > maxDay.count) {
            maxDay = { date, count: dateEntry.count };
        }

        total++;
    }

    // Find max year
    for (const [year, count] of byYear) {
        if (count > maxYear.count) {
            maxYear = { year, count };
        }
    }

    // Calculate statistics
    const years = Array.from(byYear.keys()).sort((a, b) => a - b);
    const monthCount = byMonth.size || 1;
    const avgPerMonth = Math.round(total / monthCount * 10) / 10;

    return {
        byDate,
        byYear,
        byMonth,
        byWeekday,
        total,
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

    // Build index
    activityIndex = buildActivityIndex(letters);

    // Update statistics cards
    const totalEl = document.getElementById('activity-total');
    const busiestDayEl = document.getElementById('activity-busiest-day');
    const busiestYearEl = document.getElementById('activity-busiest-year');
    const avgEl = document.getElementById('activity-avg-per-month');

    if (totalEl) totalEl.textContent = activityIndex.total.toLocaleString('de-DE');
    if (busiestDayEl) {
        busiestDayEl.textContent = activityIndex.maxDay.date
            ? `${activityIndex.maxDay.count} (${activityIndex.maxDay.date})`
            : '-';
    }
    if (busiestYearEl) {
        busiestYearEl.textContent = activityIndex.maxYear.year
            ? `${activityIndex.maxYear.year} (${activityIndex.maxYear.count})`
            : '-';
    }
    if (avgEl) avgEl.textContent = activityIndex.avgPerMonth;

    // Render year selector
    renderActivityYearSelector();

    // Render heatmap
    renderActivityHeatmap();

    // Hide details panel
    const detailsPanel = document.getElementById('activity-details');
    if (detailsPanel) detailsPanel.classList.add('hidden');
}

/**
 * Renders year selection buttons
 */
function renderActivityYearSelector() {
    const container = document.getElementById('activity-year-selector');
    if (!container || !activityIndex) return;

    const years = activityIndex.years;

    let html = `<button class="activity-year-btn ${activitySelectedYear === 'all' ? 'active' : ''}"
                        data-year="all">Alle Jahre</button>`;

    // Only show every 5th year if many years
    const step = years.length > 20 ? 5 : (years.length > 10 ? 2 : 1);

    for (let i = 0; i < years.length; i += step) {
        const year = years[i];
        const isActive = activitySelectedYear === year;
        html += `<button class="activity-year-btn ${isActive ? 'active' : ''}"
                         data-year="${year}">${year}</button>`;
    }

    container.innerHTML = html;

    // Click handlers
    container.querySelectorAll('.activity-year-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const year = btn.dataset.year;
            activitySelectedYear = year === 'all' ? 'all' : parseInt(year);

            // Update active status
            container.querySelectorAll('.activity-year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Re-render heatmap
            renderActivityHeatmap();
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
            const dateStr = currentDate.toISOString().substring(0, 10);
            const data = byDate.get(dateStr);
            const count = data ? data.count : 0;
            const level = getActivityLevel(count, maxCount);

            const weekday = currentDate.getDay();
            const adjustedWeekday = weekday === 0 ? 6 : weekday - 1;

            // Start new week (Monday)
            if (adjustedWeekday === 0 && currentDate > firstDay) {
                weekHtml += '</div><div class="activity-week">';
            }

            weekHtml += `<span class="activity-cell activity-level-${level}"
                              data-date="${dateStr}"
                              data-count="${count}"
                              title="${dateStr}: ${count} Brief${count !== 1 ? 'e' : ''}"></span>`;

            currentDate.setDate(currentDate.getDate() + 1);
        }

        weekHtml += '</div>';
        html += weekHtml + '</div></div>';
    }

    container.innerHTML = html;

    // Click handlers for cells
    container.querySelectorAll('.activity-cell[data-date]').forEach(cell => {
        cell.addEventListener('click', () => {
            const date = cell.dataset.date;
            const count = parseInt(cell.dataset.count);
            if (count > 0) {
                showActivityDetails(date);
            }
        });
    });
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

    // Format date
    const dateObj = new Date(date);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = dateObj.toLocaleDateString('de-DE', options);

    // Find letters of the day
    const allLetters = getFilteredLetters();
    const dayLetters = allLetters.filter(l => l.date === date);

    // Render list
    let html = '';
    for (const letter of dayLetters) {
        const senderName = letter.sender?.name || 'Unbekannt';
        const recipientName = letter.recipient?.name || 'Unbekannt';
        const place = letter.place_sent?.name || '';

        html += `<div class="activity-detail-item" data-letter-id="${letter.id}">
            <span class="activity-detail-sender">${senderName}</span>
            <span class="activity-detail-arrow"><i class="fas fa-arrow-right"></i></span>
            <span class="activity-detail-recipient">${recipientName}</span>
            ${place ? `<span class="activity-detail-place">(${place})</span>` : ''}
        </div>`;
    }

    listEl.innerHTML = html;
    detailsPanel.classList.remove('hidden');

    // Click handlers for letter details
    listEl.querySelectorAll('.activity-detail-item').forEach(item => {
        item.addEventListener('click', () => {
            const letterId = item.dataset.letterId;
            const letter = allLetters.find(l => l.id === letterId);
            if (letter) {
                showLetterDetail(letter.id);
            }
        });
    });
}
