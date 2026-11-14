// Overview: figures of the whole dataset, its source and licence, the data situation as chips,
// what the source records about the transmission, entry points and research paths.

import { LETTER_FEATURES } from '../constants.js';
import { escapeHtml, safeUrl, externalLink, datedYearRange } from '../utils.js';
import { analyzeResearchQuestions, renderOverviewResearchPaths } from '../research-paths.js';
import { startKnowledgePath } from '../knowledge-path.js';
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
 * @param {Function} dependencies.getAvailableViews
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

    // No entry point leads into a view the dataset cannot fill
    document.querySelectorAll('.entry-point-btn').forEach(btn => {
        btn.classList.toggle('hidden', deps.getAvailableViews()[btn.dataset.target]?.available === false);
    });

    // Setup entry point buttons
    setupEntryPointButtons();

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

    renderOverviewPaths();
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

let entryPointsInitialized = false;
function setupEntryPointButtons() {
    if (entryPointsInitialized) return;
    entryPointsInitialized = true;

    document.querySelectorAll('.entry-point-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.target) deps.switchView(btn.dataset.target);
        });
    });
}

// Research paths of the overview (US-33), analysed by research-paths.js from all letters
function renderOverviewPaths() {
    const container = document.getElementById('overview-questions-grid');
    if (!container) return;
    renderOverviewResearchPaths(container, document.getElementById('show-all-paths-btn'),
        analyzeResearchQuestions(deps.getAllLetters(), deps.getDataIndices(), deps.getCorpusSummary()), {
            onStartPath: startKnowledgePath,
            onStepClick: deps.switchView
        });
}
