// Overview: figures of the whole dataset, its source and licence, the data situation as chips,
// what the source records about the transmission, entry points and research paths.

import { LETTER_FEATURES, LANGUAGE_COLORS, NO_LANGUAGE, isRestLanguage, languageLabel } from '../constants.js';
import { escapeHtml, safeUrl, externalLink, datedYearRange, personKey, placeKey, letterRecipients } from '../utils.js';
import { startTour } from '../demo-tour.js';
import { state } from '../state-manager.js';

let deps = {};

// Transmission features the overview names, each as the phrase after its count
const OVERVIEW_FEATURES = {
    undated: 'ohne Datum',
    dateImplausible: 'mit unplausiblem Jahr',
    dateInferred: 'mit erschlossenem Datum',
    placeInferred: 'mit erschlossenem Ort',
    recordsDiffer: 'mit abweichenden Einträgen'
};

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.getDataIndices
 * @param {Function} dependencies.getCorpusSummary - summarizeCorpus() of the whole dataset
 * @param {Function} dependencies.getCorpusQuality - datasetQuality() of the whole dataset
 * @param {Function} dependencies.showLettersWithFeature
 * @param {Function} dependencies.switchView
 */
export function initOverviewView(dependencies) {
    deps = dependencies;
}

// Figures, source, data situation, entry points and research paths of the whole dataset
export function renderOverview() {
    const meta = state.getMeta();
    if (!meta) return;
    const allLetters = deps.getAllLetters();
    const totalLetters = allLetters.length;
    const corpus = deps.getCorpusSummary();
    const corpusQuality = deps.getCorpusQuality();

    // Update title
    const titleEl = document.getElementById('overview-title');
    if (titleEl) {
        titleEl.textContent = meta.title || 'Datensatz';
    }

    // Update inline stats: Briefe | Zeitraum | Personen | Orte
    const statsInlineEl = document.getElementById('overview-stats-inline');
    if (statsInlineEl) {
        // Same period as the year slider, so a span such as 1822 to 1922 does not stretch it
        const period = datedYearRange(allLetters) || datedYearRange(allLetters, { includeSpans: true });
        const minYear = period?.min;
        const maxYear = period?.max;
        statsInlineEl.innerHTML = `
            <span class="stat-item"><i class="fas fa-envelope" aria-hidden="true"></i> <span class="stat-value">${totalLetters.toLocaleString('de-DE')}</span> Briefe</span>
            ${minYear && maxYear ? `<span class="stat-item"><i class="fas fa-calendar" aria-hidden="true"></i> <span class="stat-value">${minYear}–${maxYear}</span></span>` : ''}
            <span class="stat-item"><i class="fas fa-users" aria-hidden="true"></i> <span class="stat-value">${corpus.persons.size.toLocaleString('de-DE')}</span> Personen</span>
            <span class="stat-item"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> <span class="stat-value">${corpus.places.size.toLocaleString('de-DE')}</span> Orte</span>
        `;
    }

    // Update source info: Quelle | Lizenz
    const sourceInlineEl = document.getElementById('overview-source-inline');
    if (sourceInlineEl) {
        const parts = [];

        // Check for JSON format (teiHeader) vs cmif-parser format
        const teiHeader = meta.teiHeader || {};
        const hasJsonFormat = Object.keys(teiHeader).length > 0;

        // Source/Publisher
        const publisherValue = hasJsonFormat
            ? teiHeader.publisher
            : (meta.publishers?.map(p => p.name).join(', ') || null);
        if (publisherValue) {
            parts.push(escapeHtml(publisherValue));
        }

        // Licence, with the change note a preprocessed dataset carries (CC BY requires indicating changes)
        if (hasJsonFormat && teiHeader.licence) {
            parts.push(externalLink(teiHeader.licenceTarget, teiHeader.licence));
        } else if (meta.licence?.text) {
            parts.push(externalLink(meta.licence.url, meta.licence.text));
        }
        if (meta.modifications) {
            parts.push(`<details class="source-modifications"><summary>Bearbeitet</summary>${escapeHtml(meta.modifications)}</details>`);
        }

        // CMIF URL
        const cmifUrl = safeUrl(hasJsonFormat ? teiHeader.cmifUrl : meta.cmifUrl);
        if (cmifUrl) {
            parts.push(externalLink(cmifUrl, 'CMIF'));
        }

        // Several files loaded as one dataset: how many, and how records became letters
        if (meta.files?.total > 1) {
            const n = value => value.toLocaleString('de-DE');
            let note = `${n(meta.files.loaded)} Dateien`;
            if (meta.files.records > totalLetters) note += `, ${n(meta.files.records)} Einträge zu ${n(totalLetters)} Briefen zusammengeführt`;
            if (meta.files.skipped?.length) note += `, ${n(meta.files.skipped.length)} weitere Dateien ohne Briefe`;
            parts.push(escapeHtml(note));
        }

        sourceInlineEl.innerHTML = parts.length > 0
            ? parts.join(' <span class="source-sep">|</span> ')
            : '';
    }

    const percent = ({ known, total }) => (total > 0 ? Math.round((known / total) * 100) : 0);
    const dateQuality = percent(corpusQuality.dates);
    const personQuality = percent(corpusQuality.persons);
    const placeQuality = percent(corpusQuality.places);

    // Update quality chips
    updateQualityChip('quality-chip-dates', `${dateQuality}% auf den Tag datiert`);
    updateQualityChip('quality-chip-persons', `${personQuality}% mit Normdatensatz`);
    updateQualityChip('quality-chip-places', `${placeQuality}% mit Koordinaten`);
    renderFeatureChips();

    // Show/hide tutorial button based on dataset
    const tutorialBtn = document.getElementById('start-tutorial-btn');
    if (tutorialBtn) {
        const urlParams = new URLSearchParams(window.location.search);
        const isDemo = urlParams.get('demo') === 'true';
        if (isDemo) {
            tutorialBtn.classList.remove('hidden');
            // Setup click handler (once)
            if (!tutorialBtn.dataset.listenerAdded) {
                tutorialBtn.addEventListener('click', () => startTour());
                tutorialBtn.dataset.listenerAdded = 'true';
            }
        } else {
            tutorialBtn.classList.add('hidden');
        }
    }

    renderOverviewChart();
}

/**
 * Write the label of a data-situation chip. The chips stay neutral, without a
 * traffic-light colour, because they describe partner data without rating it (ADR-005).
 */
function updateQualityChip(chipId, label) {
    const spanEl = document.getElementById(chipId)?.querySelector('span');
    if (spanEl) spanEl.textContent = label;
}

/**
 * What the source records about the transmission, as buttons that list exactly those letters.
 * Only features the dataset has appear, so plain CMIF shows none.
 */
function renderFeatureChips() {
    const container = document.getElementById('overview-features');
    if (!container) return;
    const chips = LETTER_FEATURES
        .filter(feature => feature.key in OVERVIEW_FEATURES)
        .map(feature => ({ feature, count: deps.getAllLetters().filter(feature.test).length }))
        .filter(({ count }) => count > 0);
    container.classList.toggle('hidden', chips.length === 0);
    container.innerHTML = chips.map(({ feature, count }) =>
        `<button type="button" class="quality-chip quality-chip--link" data-feature="${feature.key}">${count.toLocaleString('de-DE')} ${OVERVIEW_FEATURES[feature.key]}</button>`
    ).join('');
    container.querySelectorAll('[data-feature]').forEach(btn => {
        btn.addEventListener('click', () => deps.showLettersWithFeature(btn.dataset.feature));
    });
}

const number = n => n.toLocaleString('de-DE');
const ROWS = 8;

/**
 * The workspace of the start view. Every chart shows the letters under the active filters and
 * sets a filter itself: a range of years, a person, a place, a language, a transmission feature.
 * The whole dataset stays visible behind the selection, so one sees what a filter leaves out.
 */
function renderOverviewChart() {
    const all = deps.getAllLetters();
    const shown = deps.getFilteredLetters();
    const filter = deps.getFilterState();
    renderResult(all, shown, filter);
    renderYears(all, shown, filter);
    renderBars('ws-persons', topPersons(shown), filter.person, deps.togglePerson);
    renderBars('ws-places', topPlaces(shown), filter.place, deps.togglePlace);
    renderBars('ws-topics', topTopics(shown), filter.subject, deps.toggleSubject);
    renderBars('ws-languages', languages(shown), filter.languages?.length === 1 ? filter.languages[0] : filter.languages ? 'other' : null, deps.toggleLanguage);
    renderBars('ws-features', features(shown), filter.features, deps.toggleFeature);
    document.querySelectorAll('.ws-panel__open').forEach(btn => { btn.onclick = () => deps.switchView(btn.dataset.open); });
}

function renderResult(all, shown, filter) {
    const box = document.getElementById('ws-result');
    if (!box) return;
    const count = filter.active ? `${number(shown.length)} von ${number(all.length)} Briefen in der Auswahl` : `${number(all.length)} Briefe`;
    box.innerHTML = `<strong>${count}</strong>
        <button type="button" class="btn btn-secondary btn-sm" id="ws-show">Briefe ansehen</button>
        ${filter.active ? '<button type="button" class="btn btn-secondary btn-sm" id="ws-reset">Auswahl aufheben</button>' : ''}`;
    box.querySelector('#ws-show').onclick = () => deps.switchView('letters');
    const reset = box.querySelector('#ws-reset');
    if (reset) reset.onclick = () => deps.resetFilters();
}

const usableYear = letter => (letter.year && !letter.dateImplausible ? letter.year : null);

// The category a letter has in the charts: its language, the rest, or none
function languageKey(letter) {
    const code = letter.language?.code || NO_LANGUAGE;
    return code !== NO_LANGUAGE && isRestLanguage(code) ? 'other' : code;
}

// Letters per year, stacked by language where the dataset has languages. The pale column is the
// dataset, the stack inside it the selection. Dragging across years sets the period; the keyboard
// sets it with the slider of the sidebar.
function renderYears(all, shown, filter) {
    const box = document.getElementById('overview-chart');
    if (!box) return;
    const total = new Map();
    for (const letter of all) {
        const year = usableYear(letter);
        if (year) total.set(year, (total.get(year) || 0) + 1);
    }
    box.closest('.ws-panel')?.classList.toggle('hidden', total.size < 2);
    if (total.size < 2) return;
    const hasLanguages = all.some(letter => letter.language?.code);
    const stacks = new Map();
    const order = new Map();
    for (const letter of shown) {
        const year = usableYear(letter);
        if (!year) continue;
        const key = hasLanguages ? languageKey(letter) : '_all';
        if (!stacks.has(year)) stacks.set(year, new Map());
        stacks.get(year).set(key, (stacks.get(year).get(key) || 0) + 1);
        order.set(key, (order.get(key) || 0) + 1);
    }
    // The most frequent language sits at the bottom of every column
    const keys = [...order.entries()].sort((x, y) => y[1] - x[1]).map(([key]) => key);
    const years = [...total.keys()];
    const min = Math.min(...years);
    const max = Math.max(...years);
    const peak = Math.max(...total.values());
    let bars = '';
    for (let year = min; year <= max; year++) {
        const t = total.get(year) || 0;
        const stack = stacks.get(year) || new Map();
        const s = [...stack.values()].reduce((sum, n) => sum + n, 0);
        const segments = keys.filter(key => stack.get(key)).map(key =>
            `<span class="overview-chart__seg" style="height: ${stack.get(key) / t * 100}%; background: ${key === '_all' ? 'var(--color-data)' : LANGUAGE_COLORS[key] || LANGUAGE_COLORS.other}"></span>`).join('');
        bars += `<span class="overview-chart__year" data-year="${year}" title="${year}: ${number(s)} von ${number(t)} ${t === 1 ? 'Brief' : 'Briefen'}">
            <span class="overview-chart__bar" style="height: ${t ? Math.max(2, t / peak * 100) : 0}%">${segments}</span></span>`;
    }
    const period = filter.years ? `${filter.years[0]}${filter.years[0] === filter.years[1] ? '' : `–${filter.years[1]}`} gewählt` : 'Zeitraum durch Ziehen wählen';
    box.innerHTML = `
        <div class="overview-chart__bars" role="img" aria-label="Briefe pro Jahr von ${min} bis ${max}, höchstens ${number(peak)} in einem Jahr">${bars}</div>
        <div class="overview-chart__axis"><span>${min}</span><span>${period}</span><span>${max}</span></div>`;
    const yearAt = e => Number(e.target.closest('.overview-chart__year')?.dataset.year) || null;
    const strip = box.querySelector('.overview-chart__bars');
    let start = null;
    strip.addEventListener('pointerdown', e => { start = yearAt(e); e.preventDefault(); });
    strip.addEventListener('pointerup', e => {
        const end = yearAt(e);
        if (start && end) deps.setYearRange(Math.min(start, end), Math.max(start, end));
        start = null;
    });
}

function ranked(counts, labels) {
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, ROWS)
        .map(([key, count]) => ({ key, label: labels.get(key) || key, count }));
}

// A person counts once per letter, also as sender and recipient of the same letter
function topPersons(letters) {
    const counts = new Map();
    const labels = new Map();
    for (const letter of letters) {
        const seen = new Set();
        for (const person of [letter.sender, ...letterRecipients(letter)]) {
            const key = personKey(person);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            counts.set(key, (counts.get(key) || 0) + 1);
            if (!labels.has(key)) labels.set(key, person.name || key);
        }
    }
    return ranked(counts, labels);
}

function topPlaces(letters) {
    const counts = new Map();
    const labels = new Map();
    for (const letter of letters) {
        const key = placeKey(letter.place_sent);
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!labels.has(key)) labels.set(key, letter.place_sent.name || key);
    }
    return ranked(counts, labels);
}

function topTopics(letters) {
    const counts = new Map();
    const labels = new Map();
    for (const letter of letters) {
        for (const subject of letter.mentions?.subjects || []) {
            const key = subject.uri || subject.id || subject.label;
            if (!key) continue;
            counts.set(key, (counts.get(key) || 0) + 1);
            if (!labels.has(key)) labels.set(key, subject.label || key);
        }
    }
    return ranked(counts, labels);
}

// The languages with a colour of their own, then the rest and the letters without a language
function languages(letters) {
    const counts = new Map();
    for (const letter of letters) {
        const key = languageKey(letter);
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (counts.size === 1 && counts.has(NO_LANGUAGE)) return [];
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ key, label: languageLabel(key), count, color: LANGUAGE_COLORS[key] || LANGUAGE_COLORS.other }));
}

function features(letters) {
    return LETTER_FEATURES.map(feature => ({ key: feature.key, label: feature.label, count: letters.filter(feature.test).length }))
        .filter(row => row.count > 0);
}

// Ranked rows as buttons: the row sets its filter, the pressed row releases it
function renderBars(id, rows, active, toggle) {
    const box = document.getElementById(id);
    if (!box) return;
    box.closest('.ws-panel')?.classList.toggle('hidden', rows.length === 0);
    const peak = Math.max(1, ...rows.map(row => row.count));
    const isActive = key => (Array.isArray(active) ? active.includes(key) : active === key);
    box.innerHTML = rows.map(row => `
        <button type="button" class="ws-bar" data-key="${escapeHtml(row.key)}" aria-pressed="${isActive(row.key)}">
            <span class="ws-bar__label">${escapeHtml(row.label)}</span>
            <span class="ws-bar__track"><span class="ws-bar__fill" style="width: ${row.count / peak * 100}%${row.color ? `; background: ${row.color}` : ''}"></span></span>
            <span class="ws-bar__count">${number(row.count)}</span>
        </button>`).join('');
    box.querySelectorAll('.ws-bar').forEach(btn => {
        btn.addEventListener('click', () => {
            toggle(btn.dataset.key);
            document.querySelector(`#${id} .ws-bar[data-key="${CSS.escape(btn.dataset.key)}"]`)?.focus();
        });
    });
}
