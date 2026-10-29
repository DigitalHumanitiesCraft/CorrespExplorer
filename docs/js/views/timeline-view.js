// Timeline View
// Stacked bar chart showing temporal distribution of correspondence

import { LANGUAGE_COLORS, NO_LANGUAGE, languageLabel } from '../constants.js';
import { elements } from '../dom-cache.js';
import { escapeHtml, showToast } from '../utils.js';
import { addLettersToBasket } from '../basket.js';

// Module state
let undatedBinBound = false;  // the undated bin is static markup, its listeners are bound once

// External dependencies - injected via init
let getFilteredLetters = null;
let getAllLetters = null;
let applyFilters = null;
let switchView = null;
let showUndatedLetters = null;

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
    showUndatedLetters = deps.showUndatedLetters;
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
        undatedBin?.classList.add('hidden');
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
    const hasLanguageData = lettersToUse.some(l => l.language?.code);

    // Count letters per year per language, tracking date precision
    datedLetters.forEach(letter => {
        const year = letter.year;
        // If no language data in corpus, use a single category
        const lang = hasLanguageData ? (letter.language?.code || NO_LANGUAGE) : '_total';
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
        const lang = hasLanguageData ? (letter.language?.code || NO_LANGUAGE) : '_total';
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
                    segments += `<div class="timeline-stack-segment" style="height: ${segmentPct}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${escapeHtml(lang)}" data-count="${count}"></div>`;
                    currentBottom += segmentPct;
                    // Only add language breakdown to tooltip if we have language data
                    if (lang !== '_total') {
                        const langLabel = languageLabel(lang);
                        tooltipParts.push(`${escapeHtml(langLabel)}: ${count}`);
                    }
                }
            });
        }

        // Each year is a button for keyboard users; a roving tab stop keeps it one Tab for the chart
        const barLabel = `${y}: ${data.total} Briefe${hasImprecise ? `, ${data.imprecise} mit unscharfem Datum` : ''}`;
        bars.push(`
            <div class="timeline-bar-wrapper ${hasImprecise ? 'has-imprecise' : ''}" role="button" tabindex="-1" aria-label="${barLabel}" data-year="${y}" data-year-end="${y}" data-imprecise="${data.imprecise}">
                <div class="timeline-stacked-bar" style="height: ${totalHeight}%">
                    ${segments}
                </div>
                <div class="timeline-bar-tooltip">${tooltipParts.join('<br>')}</div>
                ${showLabel ? `<span class="timeline-bar-label">${y}</span>` : ''}
            </div>
        `);
    }

    container.innerHTML = bars.join('');
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Briefe pro Jahr. Pfeiltasten wechseln das Jahr, Enter filtert auf das Jahr, Umschalt und Enter legt seine Briefe in den Korb');

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
    renderUndatedBin(undatedBin, undatedLetters, undatedByLang, sortedLanguages, maxCount);

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
    setupTimelineClickHandlers(container);
}

/**
 * Render the undated letters bin
 */
function renderUndatedBin(undatedBin, undatedLetters, undatedByLang, sortedLanguages, maxCount) {
    if (!undatedBin) return;

    if (undatedLetters.length > 0) {
        undatedBin.classList.remove('hidden', 'all-dated');
        undatedBin.style.cursor = 'pointer';
        undatedBin.setAttribute('role', 'button');
        undatedBin.tabIndex = 0;
        // The accessible name starts with the visible text (count, then "k.A."), WCAG 2.5.3
        undatedBin.setAttribute('aria-label', `${undatedLetters.length} k.A., Briefe ohne Datum anzeigen`);
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
                undatedSegments += `<div class="timeline-stack-segment" style="height: ${segmentHeight}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${escapeHtml(lang)}" data-count="${count}"></div>`;
                currentBottom += segmentHeight;
                const langLabel = languageLabel(lang);
                tooltipParts.push(`${escapeHtml(langLabel)}: ${count}`);
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

        if (!undatedBinBound) {
            undatedBinBound = true;
            undatedBin.addEventListener('mousemove', (e) => {
                binTooltip.style.left = `${e.clientX}px`;
                binTooltip.style.top = `${e.clientY - binTooltip.offsetHeight - 10}px`;
            });
        }

        // A year range cannot express "no date": the slider clamps values below its minimum
        undatedBin.onclick = () => showUndatedLetters();
    } else {
        // Show schematic placeholder when all letters are dated
        undatedBin.classList.remove('hidden');
        undatedBin.classList.add('all-dated');
        undatedBin.removeAttribute('role');
        undatedBin.removeAttribute('tabindex');
        undatedBin.removeAttribute('aria-label');
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
                const label = languageLabel(lang);
                const tooltip = (lang === NO_LANGUAGE) ? 'Keine Sprachzuordnung in den Quelldaten' : '';
                return `<span class="timeline-legend-item"${tooltip ? ` title="${tooltip}"` : ''}><span class="timeline-legend-color" style="background: ${color}"></span>${escapeHtml(label)} (${count})</span>`;
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
function setupTimelineClickHandlers(container) {
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

            // '_total' stands for all languages when the filtered letters carry no language
            // code; unchecking every box would then empty the result
            if (lang !== '_total') {
                document.querySelectorAll('input[name="language"]').forEach(cb => {
                    cb.checked = (cb.value === lang);
                });
            }

            applyFilters();
            switchView('letters');
        });
    });

    // Click on bar wrapper (not segment) filters by year only
    const wrappers = [...container.querySelectorAll('.timeline-bar-wrapper')];
    const activateYear = (wrapper, toBasket) => {
        const year = parseInt(wrapper.dataset.year, 10);

        // Shift: add all letters of this year to the basket
        if (toBasket) {
            const yearLetters = filteredLetters.filter(l => l.year === year);
            showToast(addLettersToBasket(yearLetters.map(l => l.id)));
            return;
        }

        const slider = elements.yearRangeSlider;
        if (slider && slider.noUiSlider) {
            slider.noUiSlider.set([year, year]);
        }

        applyFilters();
        switchView('letters');
    };

    wrappers.forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('timeline-stack-segment')) return;
            activateYear(wrapper, e.shiftKey);
        });

        const tooltip = wrapper.querySelector('.timeline-bar-tooltip');
        if (tooltip) {
            wrapper.addEventListener('mousemove', (e) => {
                tooltip.style.left = `${e.clientX}px`;
                tooltip.style.top = `${e.clientY - tooltip.offsetHeight - 10}px`;
            });
        }
    });

    // Roving tab stop: the first year with letters, arrows move between years
    const start = wrappers.find(w => w.querySelector('.timeline-stack-segment')) || wrappers[0];
    if (start) start.tabIndex = 0;
    container.onkeydown = (e) => {
        const wrapper = e.target.closest?.('.timeline-bar-wrapper');
        if (!wrapper) return;
        if (e.key === 'Enter' || e.key === ' ') {
            // Handled here instead of the global role="button" handler, which drops the Shift key
            e.preventDefault();
            e.stopPropagation();
            activateYear(wrapper, e.shiftKey);
            return;
        }
        const index = wrappers.indexOf(wrapper);
        const targets = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: wrappers.length - 1 };
        if (!(e.key in targets)) return;
        e.preventDefault();
        const next = wrappers[Math.max(0, Math.min(wrappers.length - 1, targets[e.key]))];
        wrapper.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
    };
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
