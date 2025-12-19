// Comparison View - Extracted from explore.js
// Side-by-side comparison of persons, periods, or places

import { LANGUAGE_LABELS } from '../constants.js';
import { debounce, escapeHtml } from '../utils.js';
import { elements } from '../dom-cache.js';

// Module state
let comparisonMode = 'persons';  // 'persons', 'periods', 'places'
let comparisonA = null;
let comparisonB = null;
let comparisonData = null;

// External dependencies - injected via init
let getFilteredLetters = null;
let getIndices = null;
let getMeta = null;
let applyPersonFilter = null;
let applyPlaceFilter = null;
let applyFilters = null;
let switchView = null;
let showLetterDetail = null;

/**
 * Initialize comparison view with external dependencies
 * @param {Object} deps - External dependencies from explore.js
 */
export function initComparisonView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    getIndices = deps.getIndices;
    getMeta = deps.getMeta;
    applyPersonFilter = deps.applyPersonFilter;
    applyPlaceFilter = deps.applyPlaceFilter;
    applyFilters = deps.applyFilters;
    switchView = deps.switchView;
    showLetterDetail = deps.showLetterDetail;
}

/**
 * Builds comparison data for two elements
 */
function buildComparisonData(mode, itemA, itemB) {
    const letters = getFilteredLetters();

    let lettersA = [];
    let lettersB = [];

    if (mode === 'persons') {
        lettersA = letters.filter(l =>
            l.sender?.id === itemA.id || l.recipient?.id === itemA.id
        );
        lettersB = letters.filter(l =>
            l.sender?.id === itemB.id || l.recipient?.id === itemB.id
        );
    } else if (mode === 'periods') {
        lettersA = letters.filter(l =>
            l.year >= itemA.from && l.year <= itemA.to
        );
        lettersB = letters.filter(l =>
            l.year >= itemB.from && l.year <= itemB.to
        );
    } else if (mode === 'places') {
        lettersA = letters.filter(l =>
            l.place_sent?.geonames_id === itemA.id || l.place_sent?.name === itemA.id
        );
        lettersB = letters.filter(l =>
            l.place_sent?.geonames_id === itemB.id || l.place_sent?.name === itemB.id
        );
    }

    const metricsA = calculateComparisonMetrics(lettersA);
    const metricsB = calculateComparisonMetrics(lettersB);
    const overlap = findComparisonOverlap(lettersA, lettersB);

    return { metricsA, metricsB, overlap, lettersA, lettersB };
}

/**
 * Calculates metrics for a set of letters
 */
function calculateComparisonMetrics(letters) {
    if (letters.length === 0) {
        return {
            count: 0,
            yearRange: null,
            topPlaces: [],
            topTopics: [],
            topCorrespondents: [],
            languages: {}
        };
    }

    // Time range
    const years = letters.map(l => l.year).filter(y => y);
    const yearRange = years.length > 0
        ? { min: Math.min(...years), max: Math.max(...years) }
        : null;

    // Top places
    const placeCounts = new Map();
    for (const letter of letters) {
        if (letter.place_sent?.name) {
            const key = letter.place_sent.geonames_id || letter.place_sent.name;
            const entry = placeCounts.get(key) || { name: letter.place_sent.name, count: 0 };
            entry.count++;
            placeCounts.set(key, entry);
        }
    }
    const topPlaces = Array.from(placeCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Top topics
    const topicCounts = new Map();
    for (const letter of letters) {
        for (const subject of letter.mentions?.subjects || []) {
            const key = subject.label || subject.uri;
            topicCounts.set(key, (topicCounts.get(key) || 0) + 1);
        }
    }
    const topTopics = Array.from(topicCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Top correspondents
    const personCounts = new Map();
    for (const letter of letters) {
        if (letter.sender?.name) {
            const key = letter.sender.id || letter.sender.name;
            const entry = personCounts.get(key) || { name: letter.sender.name, count: 0 };
            entry.count++;
            personCounts.set(key, entry);
        }
        if (letter.recipient?.name) {
            const key = letter.recipient.id || letter.recipient.name;
            const entry = personCounts.get(key) || { name: letter.recipient.name, count: 0 };
            entry.count++;
            personCounts.set(key, entry);
        }
    }
    const topCorrespondents = Array.from(personCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Languages
    const languages = {};
    for (const letter of letters) {
        if (letter.language?.code) {
            languages[letter.language.code] = (languages[letter.language.code] || 0) + 1;
        }
    }

    return {
        count: letters.length,
        yearRange,
        topPlaces,
        topTopics,
        topCorrespondents,
        languages
    };
}

/**
 * Finds overlap between two sets of letters
 */
function findComparisonOverlap(lettersA, lettersB) {
    // Common letter IDs
    const idsA = new Set(lettersA.map(l => l.id));
    const idsB = new Set(lettersB.map(l => l.id));
    const commonIds = [...idsA].filter(id => idsB.has(id));

    // Common topics
    const topicsA = new Set();
    const topicsB = new Set();
    for (const letter of lettersA) {
        for (const s of letter.mentions?.subjects || []) {
            topicsA.add(s.label || s.uri);
        }
    }
    for (const letter of lettersB) {
        for (const s of letter.mentions?.subjects || []) {
            topicsB.add(s.label || s.uri);
        }
    }
    const commonTopics = [...topicsA].filter(t => topicsB.has(t));

    // Common correspondents
    const personsA = new Set();
    const personsB = new Set();
    for (const letter of lettersA) {
        if (letter.sender?.id) personsA.add(letter.sender.id);
        if (letter.recipient?.id) personsA.add(letter.recipient.id);
    }
    for (const letter of lettersB) {
        if (letter.sender?.id) personsB.add(letter.sender.id);
        if (letter.recipient?.id) personsB.add(letter.recipient.id);
    }
    const commonPersons = [...personsA].filter(p => personsB.has(p));

    // Time overlap
    const yearsA = lettersA.map(l => l.year).filter(y => y);
    const yearsB = lettersB.map(l => l.year).filter(y => y);
    let timeOverlap = null;
    if (yearsA.length > 0 && yearsB.length > 0) {
        const overlapStart = Math.max(Math.min(...yearsA), Math.min(...yearsB));
        const overlapEnd = Math.min(Math.max(...yearsA), Math.max(...yearsB));
        if (overlapStart <= overlapEnd) {
            timeOverlap = { from: overlapStart, to: overlapEnd };
        }
    }

    return {
        commonLetters: commonIds.length,
        commonTopics,
        commonPersons: commonPersons.length,
        timeOverlap
    };
}

/**
 * Renders the comparison view
 */
export function renderComparison() {
    const container = document.getElementById('comparison-view');
    if (!container) return;

    setupComparisonModeSelector();
    renderComparisonQuickSelect();
    setupComparisonAutocomplete('a');
    setupComparisonAutocomplete('b');

    if (comparisonA && comparisonB) {
        renderComparisonResults();
    } else {
        document.getElementById('comparison-results')?.classList.add('hidden');
        document.getElementById('comparison-placeholder')?.classList.remove('hidden');
    }
}

/**
 * Initializes mode selection
 */
function setupComparisonModeSelector() {
    const buttons = document.querySelectorAll('.comparison-mode-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === comparisonMode);
        btn.onclick = () => {
            comparisonMode = btn.dataset.mode;
            comparisonA = null;
            comparisonB = null;
            buttons.forEach(b => b.classList.toggle('active', b === btn));
            renderComparisonQuickSelect();
            document.getElementById('comparison-results')?.classList.add('hidden');
            document.getElementById('comparison-placeholder')?.classList.remove('hidden');
            const inputA = document.getElementById('comparison-input-a');
            const inputB = document.getElementById('comparison-input-b');
            if (inputA) inputA.value = '';
            if (inputB) inputB.value = '';
        };
    });
}

/**
 * Renders quick-select buttons based on mode
 */
function renderComparisonQuickSelect() {
    const quickA = document.getElementById('comparison-quick-a');
    const quickB = document.getElementById('comparison-quick-b');
    if (!quickA || !quickB) return;

    const dataIndices = getIndices();
    let items = [];

    if (comparisonMode === 'persons') {
        const persons = Object.values(dataIndices.persons || {})
            .sort((a, b) => b.letter_count - a.letter_count)
            .slice(0, 10);
        items = persons.map(p => ({ id: p.id, name: p.name }));
    } else if (comparisonMode === 'periods') {
        const meta = getMeta();
        const min = meta.date_range?.min || 1850;
        const max = meta.date_range?.max || 1930;
        const mid = Math.floor((min + max) / 2);
        items = [
            { id: `${min}-${mid}`, name: `${min}-${mid}`, from: min, to: mid },
            { id: `${mid+1}-${max}`, name: `${mid+1}-${max}`, from: mid+1, to: max }
        ];
    } else if (comparisonMode === 'places') {
        const places = Object.values(dataIndices.places || {})
            .sort((a, b) => b.letter_count - a.letter_count)
            .slice(0, 10);
        items = places.map(p => ({ id: p.geonames_id || p.name, name: p.name }));
    }

    const renderQuickButtons = (container, exclude) => {
        const filtered = items.filter(item => item.id !== exclude?.id);
        container.innerHTML = filtered.slice(0, 5).map(item =>
            `<button class="comparison-quick-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}"
                     ${item.from ? `data-from="${item.from}" data-to="${item.to}"` : ''}>
                ${escapeHtml(item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name)}
            </button>`
        ).join('');
    };

    renderQuickButtons(quickA, comparisonB);
    renderQuickButtons(quickB, comparisonA);

    quickA.querySelectorAll('.comparison-quick-btn').forEach(btn => {
        btn.onclick = () => selectComparisonItem('a', {
            id: btn.dataset.id,
            name: btn.dataset.name,
            from: btn.dataset.from ? parseInt(btn.dataset.from) : undefined,
            to: btn.dataset.to ? parseInt(btn.dataset.to) : undefined
        });
    });
    quickB.querySelectorAll('.comparison-quick-btn').forEach(btn => {
        btn.onclick = () => selectComparisonItem('b', {
            id: btn.dataset.id,
            name: btn.dataset.name,
            from: btn.dataset.from ? parseInt(btn.dataset.from) : undefined,
            to: btn.dataset.to ? parseInt(btn.dataset.to) : undefined
        });
    });
}

/**
 * Selects an element for comparison
 */
function selectComparisonItem(side, item) {
    if (side === 'a') {
        comparisonA = item;
        document.getElementById('comparison-input-a').value = item.name;
    } else {
        comparisonB = item;
        document.getElementById('comparison-input-b').value = item.name;
    }

    renderComparisonQuickSelect();

    if (comparisonA && comparisonB) {
        renderComparisonResults();
    }
}

/**
 * Renders comparison results
 */
function renderComparisonResults() {
    const resultsContainer = document.getElementById('comparison-results');
    const placeholder = document.getElementById('comparison-placeholder');

    if (!resultsContainer || !comparisonA || !comparisonB) return;

    comparisonData = buildComparisonData(
        comparisonMode, comparisonA, comparisonB
    );
    const { metricsA, metricsB, overlap, lettersA, lettersB } = comparisonData;

    document.getElementById('comparison-title-a').textContent = comparisonA.name;
    document.getElementById('comparison-title-b').textContent = comparisonB.name;

    renderComparisonMetrics('a', metricsA, lettersA.length);
    renderComparisonMetrics('b', metricsB, lettersB.length);
    renderComparisonOverlap(overlap, lettersA, lettersB);

    resultsContainer.classList.remove('hidden');
    placeholder.classList.add('hidden');
}

/**
 * Renders metrics for a panel
 */
function renderComparisonMetrics(side, metrics, letterCount) {
    const container = document.getElementById(`comparison-metrics-${side}`);
    if (!container) return;

    let html = `
        <div class="comparison-metric">
            <span class="metric-value">${metrics.count.toLocaleString('de-DE')}</span>
            <span class="metric-label">Briefe</span>
        </div>
    `;

    // Show letters button if there are letters
    if (letterCount > 0) {
        html += `
            <button class="btn btn-show-letters" data-side="${side}">
                <i class="fas fa-list"></i> Briefe anzeigen
            </button>
        `;
    }

    if (metrics.yearRange) {
        html += `
            <div class="comparison-metric">
                <span class="metric-value">${metrics.yearRange.min} - ${metrics.yearRange.max}</span>
                <span class="metric-label">Zeitraum</span>
            </div>
        `;
    }

    if (metrics.topPlaces.length > 0) {
        html += `
            <div class="comparison-metric-list">
                <span class="metric-label">Top-Orte</span>
                <ul>
                    ${metrics.topPlaces.map(p =>
                        `<li>${escapeHtml(p.name)} <span class="metric-count">(${p.count})</span></li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    if (metrics.topTopics.length > 0) {
        html += `
            <div class="comparison-metric-list">
                <span class="metric-label">Top-Themen</span>
                <ul>
                    ${metrics.topTopics.map(t =>
                        `<li>${escapeHtml(t.name)} <span class="metric-count">(${t.count})</span></li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    const langEntries = Object.entries(metrics.languages);
    if (langEntries.length > 0) {
        html += `
            <div class="comparison-metric-list">
                <span class="metric-label">Sprachen</span>
                <ul>
                    ${langEntries.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, count]) =>
                        `<li>${LANGUAGE_LABELS[code] || code} <span class="metric-count">(${count})</span></li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    container.innerHTML = html;

    // Add click handler for show letters button
    const showBtn = container.querySelector('.btn-show-letters');
    if (showBtn) {
        showBtn.addEventListener('click', () => {
            const side = showBtn.dataset.side;
            showComparisonLetters(side);
        });
    }
}

/**
 * Shows letters from a comparison side in Letters View
 */
function showComparisonLetters(side) {
    if (!comparisonData) return;

    const letters = side === 'a' ? comparisonData.lettersA : comparisonData.lettersB;
    const item = side === 'a' ? comparisonA : comparisonB;

    if (letters.length === 0) return;

    // Set appropriate filter based on mode
    if (comparisonMode === 'persons') {
        applyPersonFilter(item.id);
    } else if (comparisonMode === 'places') {
        applyPlaceFilter(item.id);
    } else if (comparisonMode === 'periods') {
        // For periods, set the year range slider
        const slider = elements.getById('year-slider');
        if (slider && slider.noUiSlider) {
            slider.noUiSlider.set([item.from, item.to]);
        }
        applyFilters();
    }

    // Switch to letters view
    switchView('letters');
}

/**
 * Renders overlap section
 */
function renderComparisonOverlap(overlap, lettersA, lettersB) {
    const container = document.getElementById('comparison-overlap-content');
    if (!container) return;

    let html = '';

    // Find common letter IDs for clickable link
    const setA = new Set(lettersA.map(l => l.id));
    const commonLetterIds = lettersB.filter(l => setA.has(l.id)).map(l => l.id);

    if (overlap.commonLetters > 0) {
        html += `
            <div class="overlap-item overlap-clickable" id="overlap-common-letters">
                <i class="fas fa-envelope"></i>
                <span>${overlap.commonLetters} gemeinsame Briefe</span>
                <i class="fas fa-arrow-right overlap-arrow"></i>
            </div>
        `;
    }

    if (overlap.timeOverlap) {
        html += `
            <div class="overlap-item">
                <i class="fas fa-clock"></i>
                <span>Zeitliche Ueberlappung: ${overlap.timeOverlap.from} - ${overlap.timeOverlap.to}</span>
            </div>
        `;
    }

    if (overlap.commonPersons > 0) {
        html += `
            <div class="overlap-item">
                <i class="fas fa-users"></i>
                <span>${overlap.commonPersons} gemeinsame Korrespondenten</span>
            </div>
        `;
    }

    if (overlap.commonTopics.length > 0) {
        html += `
            <div class="overlap-item overlap-topics">
                <i class="fas fa-tags"></i>
                <span>${overlap.commonTopics.length} gemeinsame Themen:</span>
                <div class="overlap-tags">
                    ${overlap.commonTopics.slice(0, 10).map(t =>
                        `<span class="overlap-tag">${escapeHtml(t)}</span>`
                    ).join('')}
                    ${overlap.commonTopics.length > 10 ? `<span class="overlap-more">+${overlap.commonTopics.length - 10} weitere</span>` : ''}
                </div>
            </div>
        `;
    }

    if (!html) {
        html = '<p class="overlap-none">Keine direkten Ueberschneidungen gefunden</p>';
    }

    container.innerHTML = html;

    // Add click handler for common letters
    const commonLettersEl = container.querySelector('#overlap-common-letters');
    if (commonLettersEl && commonLetterIds.length > 0) {
        commonLettersEl.addEventListener('click', () => {
            showCommonLettersModal(commonLetterIds);
        });
    }
}

/**
 * Shows modal with common letters
 */
function showCommonLettersModal(letterIds) {
    const allLetters = getFilteredLetters();
    const letters = allLetters.filter(l => letterIds.includes(l.id));

    if (letters.length === 0) return;

    // Create modal content
    let html = `
        <div class="modal-header">
            <h3>Gemeinsame Briefe (${letters.length})</h3>
            <button class="modal-close" id="common-letters-modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="common-letters-list">
    `;

    for (const letter of letters.slice(0, 50)) {
        const date = letter.date || 'Undatiert';
        const sender = letter.sender?.name || 'Unbekannt';
        const recipient = letter.recipient?.name || 'Unbekannt';
        const place = letter.place_sent?.name || '';

        html += `
            <div class="common-letter-item" data-letter-id="${letter.id}">
                <span class="common-letter-date">${date}</span>
                <span class="common-letter-sender">${escapeHtml(sender)}</span>
                <i class="fas fa-arrow-right"></i>
                <span class="common-letter-recipient">${escapeHtml(recipient)}</span>
                ${place ? `<span class="common-letter-place">(${escapeHtml(place)})</span>` : ''}
            </div>
        `;
    }

    if (letters.length > 50) {
        html += `<p class="common-letters-more">... und ${letters.length - 50} weitere</p>`;
    }

    html += `
            </div>
        </div>
    `;

    // Show modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'common-letters-modal';
    modal.innerHTML = `<div class="modal common-letters-modal">${html}</div>`;
    document.body.appendChild(modal);

    // Close handler
    document.getElementById('common-letters-modal-close').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Click on letter opens detail
    modal.querySelectorAll('.common-letter-item').forEach(item => {
        item.addEventListener('click', () => {
            const letterId = item.dataset.letterId;
            const letter = allLetters.find(l => l.id === letterId);
            if (letter) {
                modal.remove();
                showLetterDetail(letter.id);
            }
        });
    });
}

/**
 * Initializes autocomplete for comparison search
 */
function setupComparisonAutocomplete(side) {
    const input = document.getElementById(`comparison-input-${side}`);
    const dropdown = document.getElementById(`comparison-dropdown-${side}`);
    if (!input || !dropdown) return;

    // Remove old listeners by cloning
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    const dataIndices = getIndices();

    const debouncedSearch = debounce((query) => {
        const dd = document.getElementById(`comparison-dropdown-${side}`);
        if (query.length < 2) {
            dd.classList.add('hidden');
            return;
        }

        let results = [];
        const lowerQuery = query.toLowerCase();

        if (comparisonMode === 'persons') {
            results = Object.values(dataIndices.persons || {})
                .filter(p => p.name.toLowerCase().includes(lowerQuery))
                .sort((a, b) => b.letter_count - a.letter_count)
                .slice(0, 10)
                .map(p => ({ id: p.id, name: p.name }));
        } else if (comparisonMode === 'places') {
            results = Object.values(dataIndices.places || {})
                .filter(p => p.name.toLowerCase().includes(lowerQuery))
                .sort((a, b) => b.letter_count - a.letter_count)
                .slice(0, 10)
                .map(p => ({ id: p.geonames_id || p.name, name: p.name }));
        }

        if (results.length > 0) {
            dd.innerHTML = results.map(r =>
                `<div class="autocomplete-item" data-id="${r.id}" data-name="${escapeHtml(r.name)}">
                    ${escapeHtml(r.name)}
                </div>`
            ).join('');
            dd.classList.remove('hidden');

            dd.querySelectorAll('.autocomplete-item').forEach(item => {
                item.onclick = () => {
                    selectComparisonItem(side, {
                        id: item.dataset.id,
                        name: item.dataset.name
                    });
                    dd.classList.add('hidden');
                };
            });
        } else {
            dd.classList.add('hidden');
        }
    }, 200);

    newInput.addEventListener('input', () => debouncedSearch(newInput.value));
    newInput.addEventListener('blur', () => {
        setTimeout(() => document.getElementById(`comparison-dropdown-${side}`)?.classList.add('hidden'), 200);
    });
}
