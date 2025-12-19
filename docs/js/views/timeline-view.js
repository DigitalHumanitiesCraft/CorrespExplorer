// Timeline View - Extracted from explore.js
// Stacked bar chart showing temporal distribution of correspondence

import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../constants.js';
import { elements } from '../dom-cache.js';

// Module state
let timelineRendered = false;
let timelineStackMode = 'language'; // 'language' or 'correspondent'

// External dependencies - injected via init
let getFilteredLetters = null;
let getAllLetters = null;
let applyFilters = null;
let switchView = null;
let basketIsInBasket = null;
let basketAdd = null;
let showToast = null;

/**
 * Initialize timeline view with external dependencies
 * @param {Object} deps - External dependencies from explore.js
 */
export function initTimelineView(deps) {
    // Inject dependencies
    getFilteredLetters = deps.getFilteredLetters;
    getAllLetters = deps.getAllLetters;
    applyFilters = deps.applyFilters;
    switchView = deps.switchView;
    basketIsInBasket = deps.basketIsInBasket;
    basketAdd = deps.basketAdd;
    showToast = deps.showToast;

    // Setup stack mode toggle
    const stackToggle = elements.getById('timeline-stack-toggle');
    if (stackToggle) {
        stackToggle.addEventListener('change', (e) => {
            timelineStackMode = e.target.value;
            renderTimeline();
        });
    }
}

/**
 * Check if timeline has been rendered
 */
export function isTimelineRendered() {
    return timelineRendered;
}

/**
 * Reset timeline rendered state (call when filters change)
 */
export function resetTimelineRendered() {
    timelineRendered = false;
}

/**
 * Render the timeline view
 */
export function renderTimeline() {
    const container = elements.timelineChart;
    const totalEl = elements.getById('timeline-total');
    const legendEl = elements.getById('timeline-stack-legend');
    const undatedBin = elements.getById('timeline-undated-bin');
    if (!container) return;

    const filteredLetters = getFilteredLetters();
    const allLetters = getAllLetters();

    // Use filtered letters
    const lettersToUse = filteredLetters;
    const isFiltered = filteredLetters.length < allLetters.length;

    // Separate dated and undated letters
    const datedLetters = lettersToUse.filter(l => l.year);
    const undatedLetters = lettersToUse.filter(l => !l.year);

    // Get all years from all letters for consistent x-axis
    const allYearsSet = new Set();
    allLetters.forEach(letter => {
        if (letter.year) allYearsSet.add(letter.year);
    });
    const allYearsSorted = Array.from(allYearsSet).sort((a, b) => a - b);

    if (allYearsSorted.length === 0 && undatedLetters.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Keine Jahresdaten verfuegbar</p></div>';
        if (undatedBin) undatedBin.style.display = 'none';
        return;
    }

    const minYear = allYearsSorted[0] || 0;
    const maxYear = allYearsSorted[allYearsSorted.length - 1] || 0;

    // Build stacked data by year and language, tracking uncertainty
    const yearData = {};
    const languageTotals = {};
    let totalImprecise = 0;

    // Initialize all years
    for (let y = minYear; y <= maxYear; y++) {
        yearData[y] = { total: 0, imprecise: 0, languages: {} };
    }

    // Check if we have actual language data (not just None/other)
    const hasLanguageData = lettersToUse.some(l => l.language?.code && l.language.code !== 'None');

    // Count letters per year per language, tracking date precision
    datedLetters.forEach(letter => {
        const year = letter.year;
        // If no language data in corpus, use a single category
        const lang = hasLanguageData ? (letter.language?.code || 'None') : '_total';
        const langKey = hasLanguageData ? (LANGUAGE_COLORS[lang] ? lang : 'other') : '_total';
        const isImprecise = letter.datePrecision === 'range' ||
                           letter.datePrecision === 'year' ||
                           letter.datePrecision === 'month' ||
                           letter.dateCertainty === 'low';

        yearData[year].total++;
        yearData[year].languages[langKey] = (yearData[year].languages[langKey] || 0) + 1;
        languageTotals[langKey] = (languageTotals[langKey] || 0) + 1;

        if (isImprecise) {
            yearData[year].imprecise++;
            totalImprecise++;
        }
    });

    // Count undated letters by language
    const undatedByLang = {};
    undatedLetters.forEach(letter => {
        const lang = hasLanguageData ? (letter.language?.code || 'None') : '_total';
        const langKey = hasLanguageData ? (LANGUAGE_COLORS[lang] ? lang : 'other') : '_total';
        undatedByLang[langKey] = (undatedByLang[langKey] || 0) + 1;
        languageTotals[langKey] = (languageTotals[langKey] || 0) + 1;
    });

    // Find max for scaling (include undated count)
    let maxCount = undatedLetters.length;
    for (let y = minYear; y <= maxYear; y++) {
        if (yearData[y].total > maxCount) maxCount = yearData[y].total;
    }
    if (maxCount === 0) maxCount = 1;

    // Sort languages by total count for consistent stacking order
    const sortedLanguages = Object.entries(languageTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([lang]) => lang);

    // Calculate label interval - show roughly 15 labels
    const yearSpan = maxYear - minYear + 1;
    const labelInterval = Math.max(1, Math.ceil(yearSpan / 15));

    // Render stacked bars
    const bars = [];
    for (let y = minYear; y <= maxYear; y++) {
        const data = yearData[y];
        const totalHeight = data.total > 0 ? Math.max(4, (data.total / maxCount) * 100) : 0;
        const showLabel = (y - minYear) % labelInterval === 0 || y === maxYear;
        const hasImprecise = data.imprecise > 0;

        // Build stacked segments
        let segments = '';
        let tooltipParts = [`${y}: ${data.total} Briefe`, `<span class="tooltip-hint">Shift+Klick: zum Korb</span>`];

        // Add imprecise info to tooltip
        if (hasImprecise) {
            tooltipParts.push(`<span class="tooltip-imprecise">${data.imprecise} mit unscharfem Datum</span>`);
        }

        if (data.total > 0) {
            let currentBottom = 0;
            sortedLanguages.forEach(lang => {
                const count = data.languages[lang] || 0;
                if (count > 0) {
                    // Segment height as percentage of the stacked bar (not the container)
                    const segmentPct = (count / data.total) * 100;
                    // Use primary color for _total (no language data), otherwise language color
                    const color = lang === '_total' ? 'var(--color-primary)' : (LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other);
                    segments += `<div class="timeline-stack-segment" style="height: ${segmentPct}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${lang}" data-count="${count}"></div>`;
                    currentBottom += segmentPct;
                    // Only add language breakdown to tooltip if we have language data
                    if (lang !== '_total') {
                        const langLabel = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                        tooltipParts.push(`${langLabel}: ${count}`);
                    }
                }
            });
        }

        bars.push(`
            <div class="timeline-bar-wrapper ${hasImprecise ? 'has-imprecise' : ''}" data-year="${y}" data-year-end="${y}" data-imprecise="${data.imprecise}">
                <div class="timeline-stacked-bar" style="height: ${totalHeight}%">
                    ${segments}
                </div>
                <div class="timeline-bar-tooltip">${tooltipParts.join('<br>')}</div>
                ${showLabel ? `<span class="timeline-bar-label">${y}</span>` : ''}
            </div>
        `);
    }

    container.innerHTML = bars.join('');

    // Add Y-axis gridlines
    renderTimelineGridlines(container, maxCount);

    // Responsive bar width based on year span
    const barWrappers = container.querySelectorAll('.timeline-bar-wrapper');
    if (yearSpan > 0 && yearSpan <= 20) {
        // Wider bars for narrow time ranges
        const maxWidth = Math.min(60, Math.max(20, Math.floor(800 / yearSpan)));
        barWrappers.forEach(w => {
            w.style.maxWidth = `${maxWidth}px`;
            w.style.minWidth = `${Math.max(12, maxWidth - 10)}px`;
        });
    } else {
        // Reset to default for large ranges
        barWrappers.forEach(w => {
            w.style.maxWidth = '';
            w.style.minWidth = '';
        });
    }

    // Render undated letters bin
    renderUndatedBin(undatedBin, undatedLetters, undatedByLang, sortedLanguages, maxCount, minYear);

    // Update total
    if (totalEl) {
        const undatedInfo = undatedLetters.length > 0 ? ` + ${undatedLetters.length} ohne Datum` : '';
        if (isFiltered) {
            totalEl.textContent = `${datedLetters.length.toLocaleString('de-DE')} von ${allLetters.filter(l => l.year).length.toLocaleString('de-DE')} Briefen (${minYear}-${maxYear})${undatedInfo}`;
        } else {
            totalEl.textContent = `${datedLetters.length.toLocaleString('de-DE')} Briefe von ${minYear} bis ${maxYear}${undatedInfo}`;
        }
    }

    // Render legend
    renderTimelineLegend(legendEl, sortedLanguages, languageTotals, hasLanguageData, totalImprecise);

    // Add click handlers
    setupTimelineClickHandlers(container, minYear);

    timelineRendered = true;
}

/**
 * Render the undated letters bin
 */
function renderUndatedBin(undatedBin, undatedLetters, undatedByLang, sortedLanguages, maxCount, minYear) {
    if (!undatedBin) return;

    if (undatedLetters.length > 0) {
        undatedBin.style.display = 'flex';
        undatedBin.classList.remove('all-dated');
        undatedBin.style.cursor = 'pointer';
        const undatedHeight = Math.max(4, (undatedLetters.length / maxCount) * 100);
        const binBar = undatedBin.querySelector('.undated-bin-bar');
        const binTooltip = undatedBin.querySelector('.undated-bin-tooltip');

        // Build stacked segments for undated bin
        let undatedSegments = '';
        let currentBottom = 0;
        let tooltipParts = [`Ohne Datum: ${undatedLetters.length} Briefe`];

        sortedLanguages.forEach(lang => {
            const count = undatedByLang[lang] || 0;
            if (count > 0) {
                const segmentHeight = (count / undatedLetters.length) * 100;
                const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other;
                undatedSegments += `<div class="timeline-stack-segment" style="height: ${segmentHeight}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${lang}" data-count="${count}"></div>`;
                currentBottom += segmentHeight;
                const langLabel = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                tooltipParts.push(`${langLabel}: ${count}`);
            }
        });

        binBar.style.height = `${undatedHeight}%`;
        binBar.innerHTML = undatedSegments;
        binTooltip.innerHTML = tooltipParts.join('<br>');

        // Set count above bar and label below
        const binCount = undatedBin.querySelector('.undated-bin-count');
        const binLabel = undatedBin.querySelector('.undated-bin-label');
        if (binCount) binCount.textContent = undatedLetters.length;
        if (binLabel) binLabel.textContent = 'k.A.';

        // Tooltip positioning
        undatedBin.addEventListener('mousemove', (e) => {
            binTooltip.style.left = `${e.clientX}px`;
            binTooltip.style.top = `${e.clientY - binTooltip.offsetHeight - 10}px`;
        });

        // Click handler for undated bin
        undatedBin.onclick = () => {
            const slider = elements.yearRangeSlider;
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([minYear - 1, minYear - 1]);
            }
            applyFilters();
            switchView('letters');
        };
    } else {
        // Show schematic placeholder when all letters are dated
        undatedBin.style.display = 'flex';
        undatedBin.classList.add('all-dated');
        const binBar = undatedBin.querySelector('.undated-bin-bar');
        const binTooltip = undatedBin.querySelector('.undated-bin-tooltip');
        const binLabel = undatedBin.querySelector('.undated-bin-label');
        const binCount = undatedBin.querySelector('.undated-bin-count');

        if (binBar) {
            binBar.innerHTML = '';
            binBar.style.height = '0';
        }
        if (binCount) binCount.innerHTML = '<i class="fas fa-check"></i>';
        if (binLabel) binLabel.textContent = 'k.A.';
        if (binTooltip) binTooltip.textContent = 'Alle Briefe datiert';
        undatedBin.onclick = null;
        undatedBin.style.cursor = 'default';
    }
}

/**
 * Render timeline legend
 */
function renderTimelineLegend(legendEl, sortedLanguages, languageTotals, hasLanguageData, totalImprecise) {
    if (!legendEl) return;

    let legendItems = [];

    if (hasLanguageData) {
        legendItems = sortedLanguages
            .filter(lang => languageTotals[lang] > 0 && lang !== '_total')
            .map(lang => {
                const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other;
                const count = languageTotals[lang];
                const label = LANGUAGE_LABELS[lang] || lang.toUpperCase();
                const tooltip = (lang === 'None') ? 'Keine Sprachzuordnung in den Quelldaten' : '';
                return `<span class="timeline-legend-item"${tooltip ? ` title="${tooltip}"` : ''}><span class="timeline-legend-color" style="background: ${color}"></span>${label} (${count})</span>`;
            });
    } else {
        legendItems.push(`<span class="timeline-legend-item timeline-legend-info" title="Dieses Korpus enthaelt keine Sprachmetadaten"><i class="fas fa-info-circle"></i> Keine Sprachdaten im Korpus</span>`);
    }

    if (totalImprecise > 0) {
        legendItems.push(`<span class="timeline-legend-item timeline-legend-uncertainty" title="Briefe mit unvollstaendigem oder unsicherem Datum"><span class="timeline-legend-hatched"></span>Unscharfes Datum (${totalImprecise})</span>`);
    }

    legendEl.innerHTML = legendItems.join('');
}

/**
 * Setup click handlers for timeline bars
 */
function setupTimelineClickHandlers(container, minYear) {
    const filteredLetters = getFilteredLetters();

    // Click handlers for segments (language + year filter)
    container.querySelectorAll('.timeline-stack-segment').forEach(segment => {
        segment.style.cursor = 'pointer';
        segment.addEventListener('click', (e) => {
            e.stopPropagation();

            const wrapper = segment.closest('.timeline-bar-wrapper');
            const year = parseInt(wrapper.dataset.year);
            const lang = segment.dataset.lang;

            // Set year filter
            const slider = elements.yearRangeSlider;
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([year, year]);
            }

            // Set language filter
            document.querySelectorAll('input[name="language"]').forEach(cb => {
                cb.checked = (cb.value === lang);
            });

            applyFilters();
            switchView('letters');
        });
    });

    // Click on bar wrapper (not segment) filters by year only
    container.querySelectorAll('.timeline-bar-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('timeline-stack-segment')) return;

            const year = parseInt(wrapper.dataset.year);

            // Shift+Click: Add all letters of this year to basket
            if (e.shiftKey) {
                const yearLetters = filteredLetters.filter(l => l.year === year);
                let addedCount = 0;
                yearLetters.forEach(l => {
                    if (!basketIsInBasket('letters', l.id)) {
                        basketAdd('letters', l.id);
                        addedCount++;
                    }
                });
                if (addedCount > 0) {
                    showToast(`${addedCount} Briefe aus ${year} zum Korb hinzugefuegt`);
                } else if (yearLetters.length > 0) {
                    showToast(`Alle ${yearLetters.length} Briefe aus ${year} bereits im Korb`);
                }
                return;
            }

            // Normal click: Update year slider
            const slider = elements.yearRangeSlider;
            if (slider && slider.noUiSlider) {
                slider.noUiSlider.set([year, year]);
            }

            applyFilters();
            switchView('letters');
        });

        // Tooltip positioning
        const tooltip = wrapper.querySelector('.timeline-bar-tooltip');
        if (tooltip) {
            wrapper.addEventListener('mousemove', (e) => {
                tooltip.style.left = `${e.clientX}px`;
                tooltip.style.top = `${e.clientY - tooltip.offsetHeight - 10}px`;
            });
        }
    });
}

/**
 * Render Y-axis gridlines for timeline
 */
function renderTimelineGridlines(container, maxCount) {
    // Remove existing gridlines
    container.querySelectorAll('.timeline-gridline, .timeline-y-axis').forEach(el => el.remove());

    if (maxCount <= 1) return;

    // Calculate nice round numbers for gridlines (aim for 3-5 lines)
    const gridlineCount = 4;
    const rawStep = maxCount / gridlineCount;

    // Round to nice numbers
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceStep;
    if (normalized <= 1) niceStep = magnitude;
    else if (normalized <= 2) niceStep = 2 * magnitude;
    else if (normalized <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    niceStep = Math.max(1, niceStep);

    // Create Y-axis container
    const yAxis = document.createElement('div');
    yAxis.className = 'timeline-y-axis';

    for (let value = niceStep; value < maxCount; value += niceStep) {
        const percentage = (value / maxCount) * 100;

        const gridline = document.createElement('div');
        gridline.className = 'timeline-gridline';
        gridline.style.bottom = `${percentage}%`;

        const label = document.createElement('span');
        label.className = 'timeline-gridline-label';
        label.textContent = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
        label.style.bottom = `${percentage}%`;

        yAxis.appendChild(gridline);
        yAxis.appendChild(label);
    }

    container.insertBefore(yAxis, container.firstChild);
}
