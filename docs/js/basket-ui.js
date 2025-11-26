// Basket UI Module
// Handles the visual components and user interactions for the Knowledge Basket

import {
    initBasket,
    addToBasket,
    removeFromBasket,
    toggleBasketItem,
    isInBasket,
    getBasketItems,
    getBasketCounts,
    clearBasket,
    onBasketChange,
    resolveBasketItems,
    loadBasketFromUrl
} from './basket.js';

// State
let currentTab = 'letters';
let dataIndicesRef = null;
let allLettersRef = null;

/**
 * Initialize basket UI
 * @param {Object} dataIndices - Reference to data indices
 * @param {Array} allLetters - Reference to all letters
 */
export function initBasketUI(dataIndices, allLetters) {
    console.log('[Basket] Initializing basket UI...');

    dataIndicesRef = dataIndices;
    allLettersRef = allLetters;

    // Initialize basket from localStorage
    initBasket();

    // Try to load basket from URL
    loadBasketFromUrl();

    // Setup UI elements
    setupBasketButton();
    setupBasketModal();

    // Listen for basket changes
    onBasketChange(updateBasketBadge);

    // Initial badge update
    updateBasketBadge(getBasketCounts());

    console.log('[Basket] Basket UI initialized. Items:', getBasketCounts());
}

/**
 * Setup basket button in navbar
 */
function setupBasketButton() {
    const basketBtn = document.getElementById('basket-btn');
    if (basketBtn) {
        basketBtn.addEventListener('click', openBasketModal);
    }
}

/**
 * Setup basket modal
 */
function setupBasketModal() {
    const modal = document.getElementById('basket-modal');
    if (!modal) return;

    // Close button
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeBasketModal);
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBasketModal();
        }
    });

    // Tab switching
    const tabs = modal.querySelectorAll('.basket-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchBasketTab(tabName);
        });
    });

    // Clear button
    const clearBtn = document.getElementById('basket-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Wissenskorb wirklich leeren?')) {
                clearBasket();
                renderBasketContent();
            }
        });
    }

    // Export buttons
    const exportCsvBtn = document.getElementById('basket-export-csv');
    const exportJsonBtn = document.getElementById('basket-export-json');

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportBasket('csv'));
    }
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => exportBasket('json'));
    }
}

/**
 * Update basket badge in navbar
 */
function updateBasketBadge(counts) {
    const badge = document.getElementById('basket-badge');
    if (badge) {
        if (counts.total > 0) {
            badge.textContent = counts.total;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Also update tab counts if modal is open
    updateTabCounts(counts);
}

/**
 * Update tab counts in modal
 */
function updateTabCounts(counts) {
    const lettersCount = document.getElementById('basket-letters-count');
    const personsCount = document.getElementById('basket-persons-count');
    const placesCount = document.getElementById('basket-places-count');

    if (lettersCount) lettersCount.textContent = counts.letters;
    if (personsCount) personsCount.textContent = counts.persons;
    if (placesCount) placesCount.textContent = counts.places;
}

/**
 * Open basket modal
 */
function openBasketModal() {
    const modal = document.getElementById('basket-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderBasketContent();
    }
}

/**
 * Close basket modal
 */
function closeBasketModal() {
    const modal = document.getElementById('basket-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Switch basket tab
 */
function switchBasketTab(tabName) {
    currentTab = tabName;

    // Update tab buttons
    const tabs = document.querySelectorAll('.basket-tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update panels
    const panels = document.querySelectorAll('.basket-panel');
    panels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `basket-${tabName}-panel`);
    });

    renderBasketContent();
}

/**
 * Render basket content based on current tab
 */
function renderBasketContent() {
    const counts = getBasketCounts();
    updateTabCounts(counts);

    const emptyState = document.getElementById('basket-empty');
    const contentArea = document.querySelector('.basket-content');
    const footer = document.getElementById('basket-modal-footer');

    if (counts.total === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (contentArea) contentArea.style.display = 'none';
        if (footer) footer.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (contentArea) contentArea.style.display = 'block';
    if (footer) footer.style.display = 'flex';

    // Render current tab content
    switch (currentTab) {
        case 'letters':
            renderBasketLetters();
            break;
        case 'persons':
            renderBasketPersons();
            break;
        case 'places':
            renderBasketPlaces();
            break;
    }
}

/**
 * Render letters in basket
 */
function renderBasketLetters() {
    const container = document.getElementById('basket-letters-list');
    if (!container) return;

    const letterIds = getBasketItems('letters');
    const letterMap = new Map((allLettersRef || []).map(l => [l.id, l]));

    if (letterIds.length === 0) {
        container.innerHTML = '<div class="basket-empty-tab">Keine Briefe im Korb</div>';
        return;
    }

    container.innerHTML = letterIds.map(id => {
        const letter = letterMap.get(id);
        if (!letter) return '';

        const senderName = letter.sender?.name || 'Unbekannt';
        const recipientName = letter.recipient?.name || 'Unbekannt';
        const date = letter.date || 'Ohne Datum';

        return `
            <div class="basket-item" data-id="${escapeHtml(id)}" data-type="letters">
                <i class="fas fa-envelope"></i>
                <div class="basket-item-info">
                    <div class="basket-item-title">${escapeHtml(senderName)} → ${escapeHtml(recipientName)}</div>
                    <div class="basket-item-meta">${escapeHtml(date)}</div>
                </div>
                <button class="basket-item-remove" title="Aus Korb entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    setupRemoveButtons(container);
}

/**
 * Render persons in basket
 */
function renderBasketPersons() {
    const container = document.getElementById('basket-persons-list');
    if (!container) return;

    const personIds = getBasketItems('persons');
    const persons = dataIndicesRef?.persons || {};

    if (personIds.length === 0) {
        container.innerHTML = '<div class="basket-empty-tab">Keine Personen im Korb</div>';
        return;
    }

    container.innerHTML = personIds.map(id => {
        const person = persons[id];
        const name = person?.name || id;
        const count = person?.letter_count || 0;

        return `
            <div class="basket-item" data-id="${escapeHtml(id)}" data-type="persons">
                <i class="fas fa-user"></i>
                <div class="basket-item-info">
                    <div class="basket-item-title">${escapeHtml(name)}</div>
                    <div class="basket-item-meta">${count} Briefe</div>
                </div>
                <button class="basket-item-remove" title="Aus Korb entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    setupRemoveButtons(container);
}

/**
 * Render places in basket
 */
function renderBasketPlaces() {
    const container = document.getElementById('basket-places-list');
    if (!container) return;

    const placeIds = getBasketItems('places');
    const places = dataIndicesRef?.places || {};

    if (placeIds.length === 0) {
        container.innerHTML = '<div class="basket-empty-tab">Keine Orte im Korb</div>';
        return;
    }

    container.innerHTML = placeIds.map(id => {
        const place = places[id];
        const name = place?.name || id;
        const count = place?.letter_count || 0;

        return `
            <div class="basket-item" data-id="${escapeHtml(id)}" data-type="places">
                <i class="fas fa-map-marker-alt"></i>
                <div class="basket-item-info">
                    <div class="basket-item-title">${escapeHtml(name)}</div>
                    <div class="basket-item-meta">${count} Briefe</div>
                </div>
                <button class="basket-item-remove" title="Aus Korb entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    setupRemoveButtons(container);
}

/**
 * Setup remove buttons in basket items
 */
function setupRemoveButtons(container) {
    container.querySelectorAll('.basket-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.basket-item');
            const id = item.dataset.id;
            const type = item.dataset.type;
            removeFromBasket(type, id);
            renderBasketContent();
        });
    });
}

/**
 * Export basket data
 */
function exportBasket(format) {
    const resolved = resolveBasketItems(dataIndicesRef || {}, allLettersRef || []);
    const counts = getBasketCounts();

    if (counts.total === 0) {
        alert('Der Wissenskorb ist leer.');
        return;
    }

    let content, filename, mimeType;

    if (format === 'csv') {
        content = generateBasketCSV(resolved);
        filename = 'wissenskorb.csv';
        mimeType = 'text/csv;charset=utf-8;';
    } else {
        content = JSON.stringify(resolved, null, 2);
        filename = 'wissenskorb.json';
        mimeType = 'application/json';
    }

    downloadFile(content, filename, mimeType);
}

/**
 * Generate CSV from basket data
 */
function generateBasketCSV(resolved) {
    const lines = [];

    // Letters section
    if (resolved.letters.length > 0) {
        lines.push('=== BRIEFE ===');
        lines.push('ID,Datum,Absender,Empfaenger,Ort,URL');
        resolved.letters.forEach(letter => {
            lines.push([
                letter.id || '',
                letter.date || '',
                letter.sender?.name || '',
                letter.recipient?.name || '',
                letter.place_sent?.name || '',
                letter.url || ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });
        lines.push('');
    }

    // Persons section
    if (resolved.persons.length > 0) {
        lines.push('=== PERSONEN ===');
        lines.push('ID,Name,Authority,Briefe');
        resolved.persons.forEach(person => {
            lines.push([
                person.id || '',
                person.name || '',
                person.authority || '',
                person.letter_count || 0
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });
        lines.push('');
    }

    // Places section
    if (resolved.places.length > 0) {
        lines.push('=== ORTE ===');
        lines.push('ID,Name,Lat,Lon,Briefe');
        resolved.places.forEach(place => {
            lines.push([
                place.id || '',
                place.name || '',
                place.lat || '',
                place.lon || '',
                place.letter_count || 0
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
        });
    }

    return lines.join('\n');
}

/**
 * Download file helper
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Escape HTML helper
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================
// PUBLIC API for adding items
// ===================

/**
 * Create a basket toggle button HTML
 */
export function createBasketToggle(type, id) {
    const inBasket = isInBasket(type, id);
    return `
        <button class="basket-toggle ${inBasket ? 'in-basket' : ''}"
                data-type="${type}" data-id="${escapeHtml(id)}"
                title="${inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufuegen'}">
            <i class="fas fa-star"></i>
        </button>
    `;
}

/**
 * Setup basket toggle button event handlers
 */
export function setupBasketToggles(container) {
    if (!container) return;

    container.querySelectorAll('.basket-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const id = btn.dataset.id;

            const nowInBasket = toggleBasketItem(type, id);
            btn.classList.toggle('in-basket', nowInBasket);
            btn.title = nowInBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufuegen';
        });
    });
}

/**
 * Toggle item in basket (for external use)
 */
export { toggleBasketItem, isInBasket, addToBasket, removeFromBasket };
