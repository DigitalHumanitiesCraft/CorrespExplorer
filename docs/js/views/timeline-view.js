// Timeline View
// Stacked bar chart showing temporal distribution of correspondence

import { LANGUAGE_COLORS, LETTER_FEATURES, NO_LANGUAGE, languageLabel } from '../constants.js';
import { elements } from '../dom-cache.js';
import { escapeHtml, showToast, isMultiYearSpan } from '../utils.js';
import { addLettersToBasket } from '../basket.js';
import { renderDataTable } from './view-support.js';

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
    const spanBin = elements.getById('timeline-span-bin');
    if (!container) return;

    const filteredLetters = getFilteredLetters();
    const allLetters = getAllLetters();

    // Use filtered letters
    const lettersToUse = filteredLetters;
    const isFiltered = filteredLetters.length < allLetters.length;

    // Dated, undated and multi-year spans; a span has no year it belongs to (decision E5).
    // "Undated" here means without a place on the axis: no date, a date only in words, or a year
    // the parser withheld as implausible. The bin says which of these it holds.
    const spanLetters = lettersToUse.filter(isMultiYearSpan);
    const datedLetters = lettersToUse.filter(l => l.year && !isMultiYearSpan(l));
    const undatedLetters = lettersToUse.filter(l => !l.year);
    const offAxis = offAxisGroups(undatedLetters);

    // Get all years from all letters for consistent x-axis
    const allYearsSet = new Set();
    allLetters.forEach(letter => {
        if (letter.year && !isMultiYearSpan(letter)) allYearsSet.add(letter.year);
    });
    const allYearsSorted = Array.from(allYearsSet).sort((a, b) => a - b);

    if (allYearsSorted.length === 0 && undatedLetters.length === 0 && spanLetters.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Keine Jahresdaten verfügbar</p></div>';
        undatedBin?.classList.add('hidden');
        spanBin?.classList.add('hidden');
        renderDataTable(elements.getById('timeline-table'), { caption: '', columns: [], rows: [] });
        return;
    }

    // Without any year the loops below render no bar (minYear above maxYear)
    const minYear = allYearsSorted.length ? allYearsSorted[0] : 1;
    const maxYear = allYearsSorted.length ? allYearsSorted[allYearsSorted.length - 1] : 0;

    // Build stacked data by year and language, tracking uncertainty
    const yearData = {};
    const languageTotals = {};
    let totalImprecise = 0;

    // Initialize all years. `uncertain` counts each letter once whose date is imprecise or
    // inferred; the two counts behind it name the reasons in tooltip, legend and table.
    for (let y = minYear; y <= maxYear; y++) {
        yearData[y] = { total: 0, uncertain: 0, imprecise: 0, inferred: 0, languages: {} };
    }
    let totalInferred = 0;
    let totalUncertain = 0;

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
        // A date the edition supplied is no reading of the source; it shares the hatching
        if (letter.dateInferred) {
            yearData[year].inferred++;
            totalInferred++;
        }
        if (isImprecise || letter.dateInferred) {
            yearData[year].uncertain++;
            totalUncertain++;
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

    // Find max for scaling (include undated and span counts)
    let maxCount = Math.max(undatedLetters.length, spanLetters.length);
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
        const hasImprecise = data.uncertain > 0;
        const uncertainText = uncertainPhrase(data.imprecise, data.inferred);

        // Build stacked segments
        let segments = '';
        let tooltipParts = [`${y}: ${data.total} Briefe`, `<span class="tooltip-hint">Shift+Klick: zum Korb</span>`];

        // Add imprecise info to tooltip
        if (hasImprecise) {
            tooltipParts.push(`<span class="tooltip-imprecise">${uncertainText}</span>`);
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
        const barLabel = `${y}: ${data.total} Briefe${hasImprecise ? `, ${uncertainText}` : ''}`;
        bars.push(`
            <div class="timeline-bar-wrapper ${hasImprecise ? 'has-imprecise' : ''}" role="button" tabindex="-1" aria-label="${barLabel}" data-year="${y}" data-year-end="${y}" data-imprecise="${data.uncertain}">
                <div class="timeline-stacked-bar" style="height: ${totalHeight}%">
                    ${segments}
                    ${hasImprecise ? `<div class="timeline-uncertainty-overlay" style="height: ${(data.uncertain / data.total) * 100}%"></div>` : ''}
                </div>
                <div class="timeline-bar-tooltip">${tooltipParts.join('<br>')}</div>
                ${showLabel ? `<span class="timeline-bar-label">${y}</span>` : ''}
            </div>
        `);
    }

    container.innerHTML = bars.join('');
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Briefe pro Jahr. Pfeiltasten wechseln das Jahr, Enter zeigt die Briefe des Jahres in der Briefliste, Umschalt und Enter legt sie in den Korb');

    // The instruction names only what the chart offers: language segments exist only with languages
    const description = document.querySelector('#timeline-view .view-header__description');
    if (description) {
        description.textContent = hasLanguageData
            ? 'Klicken Sie auf ein Sprach-Segment, um nach Jahr und Sprache zu filtern.'
            : 'Klicken Sie auf ein Jahr, um seine Briefe in der Briefliste zu sehen.';
    }

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
    renderUndatedBin(undatedBin, undatedLetters, undatedByLang, sortedLanguages, maxCount, offAxis);
    renderSpanBin(spanBin, spanLetters, maxCount);

    // Update total
    if (totalEl) {
        const fmt = n => n.toLocaleString('de-DE');
        const spanInfo = spanLetters.length > 0 ? ` + ${spanLetters.length} über mehrere Jahre datiert` : '';
        const dated = isFiltered
            ? `${fmt(datedLetters.length)} von ${fmt(allLetters.filter(l => l.year).length)} Briefen (${minYear}-${maxYear})`
            : `${fmt(datedLetters.length)} Briefe von ${minYear} bis ${maxYear}`;
        if (offAxis.mixed) {
            // Each group without a place on the axis is named with its count and opens exactly its letters
            const links = offAxis.groups.map(g =>
                `<button type="button" class="timeline-total__link" data-feature="${g.key}">${fmt(g.count)} ${escapeHtml(g.phrase)}</button>`);
            const list = links.length > 1 ? `${links.slice(0, -1).join(', ')} und ${links[links.length - 1]}` : links[0];
            totalEl.innerHTML = `${escapeHtml(dated)}${escapeHtml(spanInfo)}. Ohne Platz auf der Zeitachse: ${list}.`;
            totalEl.querySelectorAll('.timeline-total__link').forEach(btn => {
                btn.addEventListener('click', () => showFeatureLetters(btn.dataset.feature));
            });
        } else {
            totalEl.textContent = `${dated}${undatedLetters.length > 0 ? ` + ${undatedLetters.length} ohne Datum` : ''}${spanInfo}`;
        }
    }

    // Render legend
    renderTimelineLegend(legendEl, sortedLanguages, languageTotals, hasLanguageData, totalUncertain, totalImprecise, totalInferred);

    // Text alternative: the values of every bar, with the languages of the stack in words. Columns
    // the dataset has nothing for (inferred dates, languages) are left out.
    const languageText = languages => Object.entries(languages)
        .filter(([lang]) => lang !== '_total')
        .sort((a, b) => b[1] - a[1])
        .map(([lang, count]) => `${lang === 'other' ? 'weitere' : languageLabel(lang)} ${count}`)
        .join(', ');
    const withInferred = totalInferred > 0;
    const row = (label, total, imprecise, inferred, languages) => [label, total, imprecise,
        ...(withInferred ? [inferred] : []), ...(hasLanguageData ? [languages] : [])];
    const tableRows = [];
    for (let y = minYear; y <= maxYear; y++) {
        const d = yearData[y];
        if (d?.total) tableRows.push(row(String(y), d.total, d.imprecise, d.inferred, languageText(d.languages)));
    }
    // Letters off the axis have no date to be imprecise about, so those cells stay empty
    if (offAxis.mixed) {
        offAxis.groups.forEach(g => tableRows.push(row(g.label, g.count, '', '', '')));
    } else if (undatedLetters.length) {
        tableRows.push(row('ohne Datum', undatedLetters.length, '', '', languageText(undatedByLang)));
    }
    if (spanLetters.length) tableRows.push(row('Spanne über mehrere Jahre', spanLetters.length, spanLetters.length,
        spanLetters.filter(l => l.dateInferred).length, ''));
    renderDataTable(elements.getById('timeline-table'), {
        caption: 'Briefe je Jahr',
        columns: ['Jahr', 'Briefe', 'davon unscharf datiert', ...(withInferred ? ['davon erschlossen'] : []), ...(hasLanguageData ? ['Sprachen'] : [])],
        rows: tableRows
    });

    // Add click handlers
    setupTimelineClickHandlers(container);
}

/**
 * Render the undated letters bin
 */
/**
 * Bin for letters dated to a span over several years, beside the undated bin. It informs and does
 * not filter: the year filter selects by start year, which a span does not stand for.
 */
function renderSpanBin(spanBin, spanLetters, maxCount) {
    if (!spanBin) return;
    if (spanLetters.length === 0) {
        spanBin.classList.add('hidden');
        return;
    }
    const startYears = spanLetters.map(l => l.year);
    const endYears = spanLetters.map(l => parseInt(String(l.dateTo).substring(0, 4), 10));
    const widest = `${Math.min(...startYears)} bis ${Math.max(...endYears)}`;
    spanBin.classList.remove('hidden');
    spanBin.querySelector('.undated-bin-count').textContent = spanLetters.length;
    spanBin.querySelector('.undated-bin-label').textContent = 'Spanne';
    const bar = spanBin.querySelector('.undated-bin-bar');
    bar.style.height = `${Math.max(4, (spanLetters.length / maxCount) * 100)}%`;
    bar.innerHTML = '<div class="timeline-stack-segment" style="height: 100%; background: var(--color-text-light); bottom: 0%;"></div>';
    const description = `${spanLetters.length} Briefe über mehrere Jahre datiert, zwischen ${widest}. Sie stehen in keinem Jahresbalken.`;
    spanBin.querySelector('.undated-bin-tooltip').textContent = description;
    spanBin.setAttribute('title', description);
}

// Reasons a letter has no place on the time axis, each with the letter-list filter that shows
// exactly its letters (LETTER_FEATURES key, URL parameter feat=)
const OFF_AXIS = [
    { key: 'undated', label: 'ohne Datum', phrase: 'ohne Datum' },
    { key: 'dateText', label: 'Datum nur als Text', phrase: 'nur als Text datiert' },
    { key: 'dateImplausible', label: 'Jahr unplausibel', phrase: 'mit unplausiblem Jahr' }
];

/**
 * Letters without a year, grouped by reason. `mixed` is true when the dataset gives a reason
 * besides a missing date; only then does the timeline name the groups, so plain CMIF keeps its
 * single "k.A." bin.
 * @param {Array} letters - letters without year
 * @returns {{groups: Array<{key: string, label: string, phrase: string, count: number}>, mixed: boolean}}
 */
function offAxisGroups(letters) {
    const groups = OFF_AXIS
        .map(group => ({ ...group, count: letters.filter(LETTER_FEATURES.find(f => f.key === group.key).test).length }))
        .filter(group => group.count > 0);
    return { groups, mixed: groups.some(group => group.key !== 'undated') };
}

// "3 mit unscharfem Datum, 2 mit erschlossenem Datum"
function uncertainPhrase(imprecise, inferred) {
    const parts = [];
    if (imprecise) parts.push(`${imprecise} mit unscharfem Datum`);
    if (inferred) parts.push(`${inferred} mit erschlossenem Datum`);
    return parts.join(', ');
}

/**
 * After a bar sent the reader to the letter list, focus goes to its heading; the bar itself
 * leaves the screen with the timeline, and focus would otherwise fall back to the document.
 */
function focusLettersHeading() {
    const heading = document.querySelector('#letters-view .view-header__title');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus();
}

/**
 * Letter list with one group of letters without a year. The feature filter of the sidebar is
 * set through its checkbox, whose change handler in explore.js applies it. Deliberate shortcut:
 * explore.js offers no function for it yet; once it injects one, this should call it instead.
 */
function showFeatureLetters(key) {
    const box = document.querySelector(`input[name="feature"][value="${key}"]`);
    if (!box) {
        showUndatedLetters();
    } else {
        if (!box.checked) {
            box.checked = true;
            box.dispatchEvent(new Event('change'));
        }
        switchView('letters');
    }
    focusLettersHeading();
}

function renderUndatedBin(undatedBin, undatedLetters, undatedByLang, sortedLanguages, maxCount, offAxis) {
    if (!undatedBin) return;

    if (undatedLetters.length > 0) {
        undatedBin.classList.remove('hidden', 'all-dated');
        undatedBin.style.cursor = 'pointer';
        undatedBin.setAttribute('role', 'button');
        undatedBin.tabIndex = 0;
        const visibleLabel = offAxis.mixed ? 'ohne Jahr' : 'k.A.';
        const groupText = offAxis.groups.map(g => `${g.count} ${g.phrase}`).join(', ');
        // The accessible name starts with the visible text (count, then the label), WCAG 2.5.3
        undatedBin.setAttribute('aria-label', offAxis.mixed
            ? `${undatedLetters.length} ohne Jahr: ${groupText}. Alle anzeigen`
            : `${undatedLetters.length} k.A., Briefe ohne Datum anzeigen`);
        const undatedHeight = Math.max(4, (undatedLetters.length / maxCount) * 100);
        const binBar = undatedBin.querySelector('.undated-bin-bar');
        const binTooltip = undatedBin.querySelector('.undated-bin-tooltip');

        // Build stacked segments for undated bin
        let undatedSegments = '';
        let currentBottom = 0;
        const tooltipParts = offAxis.mixed
            ? [`Ohne Platz auf der Zeitachse: ${undatedLetters.length} Briefe`, ...offAxis.groups.map(g => `${g.count} ${escapeHtml(g.phrase)}`)]
            : [`Ohne Datum: ${undatedLetters.length} Briefe`];

        sortedLanguages.forEach(lang => {
            const count = undatedByLang[lang] || 0;
            if (count > 0) {
                const segmentHeight = (count / undatedLetters.length) * 100;
                const color = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.other;
                undatedSegments += `<div class="timeline-stack-segment" style="height: ${segmentHeight}%; background: ${color}; bottom: ${currentBottom}%;" data-lang="${escapeHtml(lang)}" data-count="${count}"></div>`;
                currentBottom += segmentHeight;
                // '_total' is the single category of a dataset without languages, no language
                if (lang !== '_total') tooltipParts.push(`${escapeHtml(languageLabel(lang))}: ${count}`);
            }
        });

        binBar.style.height = `${undatedHeight}%`;
        binBar.innerHTML = undatedSegments;
        binTooltip.innerHTML = tooltipParts.join('<br>');

        // Set count above bar and label below
        const binCount = undatedBin.querySelector('.undated-bin-count');
        const binLabel = undatedBin.querySelector('.undated-bin-label');
        if (binCount) binCount.textContent = undatedLetters.length;
        if (binLabel) binLabel.textContent = visibleLabel;

        if (!undatedBinBound) {
            undatedBinBound = true;
            undatedBin.addEventListener('mousemove', (e) => {
                binTooltip.style.left = `${e.clientX}px`;
                binTooltip.style.top = `${e.clientY - binTooltip.offsetHeight - 10}px`;
            });
        }

        // A year range cannot express "no date": the slider clamps values below its minimum
        undatedBin.onclick = () => {
            showUndatedLetters();
            focusLettersHeading();
        };
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
function renderTimelineLegend(legendEl, sortedLanguages, languageTotals, hasLanguageData, totalUncertain, totalImprecise, totalInferred) {
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
        legendItems.push(`<span class="timeline-legend-item timeline-legend-info" title="Dieses Korpus enthält keine Sprachmetadaten"><i class="fas fa-info-circle"></i> Keine Sprachdaten im Korpus</span>`);
    }

    // One hatching for every date that is no exact reading of the source; the label names only
    // the reasons the dataset has, a letter both imprecise and inferred counts once
    if (totalUncertain > 0) {
        const [label, title] = totalInferred === 0
            ? ['Unscharfes Datum', 'Briefe mit unvollständigem oder unsicherem Datum']
            : totalImprecise === 0
                ? ['Erschlossenes Datum', 'Briefe, deren Datum die Edition erschlossen hat']
                : ['Unscharfes oder erschlossenes Datum', `${uncertainPhrase(totalImprecise, totalInferred)}; ein Brief mit beidem zählt einmal`];
        legendItems.push(`<span class="timeline-legend-item timeline-legend-uncertainty" title="${title}"><span class="timeline-legend-hatched"></span>${label} (${totalUncertain})</span>`);
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
            focusLettersHeading();
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
        focusLettersHeading();
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
