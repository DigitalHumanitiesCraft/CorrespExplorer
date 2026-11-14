// Letters view: the filtered letters as a list with search, order and paging, and the letter
// dialog with all records the source holds for one letter.

import { isInBasket } from '../basket.js';
import { debounce, escapeHtml, safeUrl, openModal, closeModal, personKey, letterRecipients } from '../utils.js';
import { formatDateWithPrecision, formatPersonName, formatPlaceName, getDatePrecisionClass } from '../formatters.js';
import { state } from '../state-manager.js';
import { elements } from '../dom-cache.js';
import { buildCorrespSearchUrl, buildPersonLink, buildPlaceLink, correspSearchLink, detailRow, toggleBasketButton } from './view-support.js';

let deps = {};
let lettersSortOrder = 'date-desc';
let lettersSearchTerm = '';

// A filter set from another view opens the letter list without a search left from before, which
// would narrow the result without being asked for
export function clearLetterSearch() {
    lettersSearchTerm = '';
    if (elements.letterSearch) elements.letterSearch.value = '';
}

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getFilteredLetters
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.hasActiveFilter
 * @param {Function} dependencies.showLettersOfPerson - sets the person filter and opens the letter list
 */
export function initLettersView(dependencies) {
    deps = dependencies;
    const searchInput = elements.letterSearch;
    const sortSelect = elements.letterSort;

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            lettersSearchTerm = e.target.value.toLowerCase();
            renderLettersList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            lettersSortOrder = e.target.value;
            renderLettersList();
        });
    }
}

// Date order with undated letters last in both directions (they have no place on the time axis)
function compareByDate(a, b, direction) {
    // An implausible date sorts with the undated letters, as on the time axis
    const dateA = a.dateImplausible ? null : a.date;
    const dateB = b.dateImplausible ? null : b.date;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return direction * dateA.localeCompare(dateB);
}

// Letters shown per step; a longer list grows on request instead of ending silently
const LETTERS_PAGE = 200;
let lettersLimit = LETTERS_PAGE;
let lettersListKey = '';

export function renderLettersList() {
    const container = elements.lettersList;
    if (!container) return;

    const allLetters = deps.getAllLetters();
    let letters = [...deps.getFilteredLetters()];

    if (lettersSearchTerm) {
        const has = value => (value || '').toLowerCase().includes(lettersSearchTerm);
        letters = letters.filter(l =>
            has(l.sender?.name) ||
            letterRecipients(l).some(r => has(r.name)) ||
            has(l.place_sent?.name) || has(l.address) || has(l.postmark) || has(l.signature) || has(l.dateText)
        );
    }

    letters.sort((a, b) => {
        switch (lettersSortOrder) {
            case 'date-desc': return compareByDate(a, b, -1);
            case 'date-asc': return compareByDate(a, b, 1);
            case 'sender-asc': return (a.sender?.name || '').localeCompare(b.sender?.name || '');
            default: return 0;
        }
    });

    // A new filter, search or order starts again at the first step
    const listKey = `${lettersSearchTerm}|${lettersSortOrder}|${state.toURLParams().toString()}`;
    if (listKey !== lettersListKey) {
        lettersListKey = listKey;
        lettersLimit = LETTERS_PAGE;
    }
    const displayLetters = letters.slice(0, lettersLimit);

    // The count of the list is visible above it, also for a search and for no hit at all
    const result = document.getElementById('letters-result');
    if (result) {
        const total = allLetters.length.toLocaleString('de-DE');
        const found = letters.length.toLocaleString('de-DE');
        const narrowed = letters.length !== allLetters.length;
        const search = lettersSearchTerm ? ` für „${lettersSearchTerm}“` : '';
        const shown = letters.length > displayLetters.length ? `, die ersten ${displayLetters.length.toLocaleString('de-DE')} angezeigt` : '';
        result.textContent = narrowed || search
            ? `${found} von ${total} Briefen${search}${shown}`
            : `${total} Briefe${shown}`;
    }
    // The brackets are explained once where they occur, not only in a tooltip
    document.getElementById('letters-legend')?.classList.toggle('hidden',
        !displayLetters.some(l => l.dateInferred || l.place_sent?.inferred));

    if (displayLetters.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-envelope" aria-hidden="true"></i>
                <p>Keine Briefe gefunden. ${lettersSearchTerm ? 'Ändern Sie den Suchbegriff.' : ''} ${deps.hasActiveFilter() ? 'Setzen Sie die Filter in der Seitenleiste zurück.' : ''}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = displayLetters.map(letter => {
        const senderName = formatPersonName(letter.sender?.name, letter.sender?.precision);
        // Every recipient is named in the row; an absent recipient keeps the placeholder
        const recipients = letterRecipients(letter);
        const recipientName = recipients.length
            ? recipients.map(r => formatPersonName(r.name, r.precision)).join('; ')
            : formatPersonName(null);
        const date = formatDateWithPrecision(letter);
        const placeName = formatPlaceName(letter.place_sent?.name, letter.place_sent?.precision, letter.place_sent?.inferred);
        const language = letter.language?.label || '';
        const dateClass = getDatePrecisionClass(letter.datePrecision, letter.dateCertainty);
        const inBasket = isInBasket('letters', letter.id);
        const labelled = (label, value) => value
            ? `<span class="letter-meta__labelled"><span class="letter-meta__label">${label}</span> ${escapeHtml(value)}</span>` : '';
        const recordNote = letter.records?.length > 1
            ? `${letter.records.length} Einträge in der Quelle${letter.recordsDiffer ? ', Angaben weichen ab' : ''}` : '';

        // The participants are the button that opens the letter; the star stays a sibling control
        return `
            <div class="letter-card" data-id="${escapeHtml(letter.id || '')}">
                <div class="letter-header">
                    <button type="button" class="letter-participants letter-toggle" aria-haspopup="dialog">
                        <span>${senderName}</span>
                        <span class="letter-arrow" role="img" aria-label="an"><i class="fas fa-arrow-right" aria-hidden="true"></i></span>
                        <span>${recipientName}</span>
                    </button>
                    <div class="letter-header-actions">
                        <div class="letter-date ${dateClass}">${date}</div>
                        <button type="button" class="btn-letter-basket ${inBasket ? 'in-basket' : ''}"
                                data-letter-id="${escapeHtml(letter.id || '')}"
                                aria-label="Im Wissenskorb" aria-pressed="${inBasket}"
                                title="${inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufügen'}">
                            <i class="fas fa-star" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
                <div class="letter-meta">
                    ${placeName ? `<span><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${placeName}</span>` : ''}
                    ${labelled('Poststempel', letter.postmark)}
                    ${labelled('Anschrift', letter.address)}
                    ${labelled('Signatur', letter.signature)}
                    ${recordNote ? `<span class="letter-meta__note">${recordNote}</span>` : ''}
                    ${language ? `<span><i class="fas fa-language" aria-hidden="true"></i> ${escapeHtml(language)}</span>` : ''}
                    ${safeUrl(letter.url) ? `<span><a href="${escapeHtml(safeUrl(letter.url))}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt" aria-hidden="true"></i> Quelle</a></span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    if (letters.length > displayLetters.length) {
        const rest = letters.length - displayLetters.length;
        container.insertAdjacentHTML('beforeend', `
            <button type="button" class="btn btn-secondary list-more" id="letters-more">
                Weitere ${Math.min(rest, LETTERS_PAGE).toLocaleString('de-DE')} anzeigen (noch ${rest.toLocaleString('de-DE')} nicht angezeigt)
            </button>
        `);
        container.querySelector('#letters-more').addEventListener('click', () => {
            const firstNew = displayLetters.length;
            lettersLimit += LETTERS_PAGE;
            renderLettersList();
            // Keyboard focus continues at the first letter that was added
            container.querySelectorAll('.letter-toggle')[firstNew]?.focus();
        });
    }

    // The button and a click on the card surface open the letter with everything the source records
    container.querySelectorAll('.letter-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, .btn-letter-basket')) return;
            showLetterDetail(card.dataset.id);
        });
    });

    container.querySelectorAll('.btn-letter-basket').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.dataset.letterId) toggleBasketButton(btn, 'letters', btn.dataset.letterId);
        });
    });
}

/**
 * Dialog of one letter with everything the source records about it
 * @param {string} letterId
 */
export function showLetterDetail(letterId) {
    const letter = deps.getAllLetters().find(l => l.id === letterId);
    if (!letter) return;

    const modal = elements.getById('letter-modal');
    const title = elements.getById('letter-modal-title');
    const body = elements.getById('letter-modal-body');

    if (!modal || !body) return;

    const sender = letter.sender?.name || 'Unbekannt';
    const recipient = letterRecipients(letter).map(r => r.name).join('; ') || 'Unbekannt';
    title.textContent = `${sender} an ${recipient}`;

    let html = '<div class="letter-detail">';

    html += '<div class="letter-detail-section">';
    html += '<h4>Grunddaten</h4>';
    // Date with its precision marker, as in the list (ADR-002)
    html += detailRow('Datum', formatDateWithPrecision(letter), getDatePrecisionClass(letter.datePrecision, letter.dateCertainty));
    html += detailRow('Absender', buildPersonLink(letter.sender));
    html += detailRow('Empfänger', letterRecipients(letter).map(buildPersonLink).join('; ') || buildPersonLink(null));
    if (letter.place_sent?.name) {
        html += detailRow('Absendeort', letter.place_sent.inferred
            ? formatPlaceName(letter.place_sent.name, letter.place_sent.precision, true)
            : buildPlaceLink(letter.place_sent));
    }
    if (letter.postmark) html += detailRow('Poststempel', escapeHtml(letter.postmark));
    if (letter.address) html += detailRow('Anschrift', escapeHtml(letter.address));
    if (letter.signature) html += detailRow('Signatur', escapeHtml(letter.signature));
    if (letter.language?.label) html += detailRow('Sprache', escapeHtml(letter.language.label));
    if (letter.dateInferred || letter.place_sent?.inferred) {
        html += '<p class="list-legend">Eckige Klammern: von der Edition erschlossen, nicht dem Brief entnommen.</p>';
    }
    if (letter.recordsDiffer) {
        html += '<p class="list-legend">Die Angaben oben folgen dem ersten Eintrag der Quelle mit Datum. Die übrigen Einträge stehen darunter.</p>';
    }
    html += '</div>';

    // Several records of the source for one letter are listed as they stand, nothing is decided between them
    if (letter.records?.length > 1) {
        html += '<div class="letter-detail-section">';
        html += `<h4>${letter.records.length} Einträge in der Quelle${letter.recordsDiffer ? ', Angaben weichen ab' : ''}</h4>`;
        html += '<ul class="letter-records">';
        html += letter.records.map(record => `<li><span class="letter-records__id">${escapeHtml(record.id)}</span> ${escapeHtml([
            record.sender || 'ohne Absender',
            `an ${record.recipients.join('; ') || 'ohne Empfänger'}`,
            record.place || 'ohne Ort',
            record.date || 'ohne Datum'
        ].join(', '))}</li>`).join('');
        html += '</ul></div>';
    }

    const mentionSections = [
        ['Erwähnte Themen', letter.mentions?.subjects, s => escapeHtml(s.label)],
        ['Erwähnte Personen', letter.mentions?.persons, p => buildPersonLink(p)],
        ['Erwähnte Orte', letter.mentions?.places, p => buildPlaceLink(p)]
    ];
    for (const [heading, items, render] of mentionSections) {
        if (!items?.length) continue;
        html += `<div class="letter-detail-section"><h4>${heading}</h4><div class="letter-detail-tags">`;
        html += items.map(item => `<span class="letter-detail-tag">${render(item)}</span>`).join('');
        html += '</div></div>';
    }

    html += '<div class="letter-detail-actions">';
    if (safeUrl(letter.url)) {
        html += `<a href="${escapeHtml(safeUrl(letter.url))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            <i class="fas fa-external-link-alt" aria-hidden="true"></i> Zur Quelle
        </a>`;
    }
    const inBasket = isInBasket('letters', letter.id);
    html += `<button type="button" class="btn btn-basket ${inBasket ? 'in-basket' : ''}" data-letter-id="${escapeHtml(letter.id)}">
        <i class="fas fa-star" aria-hidden="true"></i> <span class="btn-basket-label">${inBasket ? 'Im Korb' : 'Zum Korb'}</span>
    </button>`;
    const senderKey = personKey(letter.sender);
    if (senderKey) {
        html += `<button type="button" class="btn btn-secondary btn-filter-person" data-person-id="${escapeHtml(senderKey)}">
            <i class="fas fa-filter" aria-hidden="true"></i> Briefe von ${escapeHtml(letter.sender.name || 'Absender')}
        </button>`;
    }

    const senderCorrespUrl = buildCorrespSearchUrl(letter.sender);
    const recipientLinks = letterRecipients(letter)
        .map(r => [buildCorrespSearchUrl(r), r.name]).filter(([url]) => url);
    if (senderCorrespUrl || recipientLinks.length) {
        html += '<div class="corresp-search-links">';
        if (senderCorrespUrl) html += correspSearchLink(senderCorrespUrl, letter.sender.name, 'btn btn-corresp');
        html += recipientLinks.map(([url, name]) => correspSearchLink(url, name, 'btn btn-corresp')).join('');
        html += '</div>';
    }
    html += '</div></div>';

    body.innerHTML = html;
    body.querySelector('.btn-filter-person')?.addEventListener('click', (e) => {
        closeModal(modal);
        deps.showLettersOfPerson(e.currentTarget.dataset.personId);
    });

    const basketBtn = body.querySelector('.btn-basket[data-letter-id]');
    basketBtn?.addEventListener('click', () => {
        // The visible label carries the state, so no aria-pressed here
        const nowInBasket = toggleBasketButton(basketBtn, 'letters', basketBtn.dataset.letterId, { pressed: false });
        basketBtn.querySelector('.btn-basket-label').textContent = nowInBasket ? 'Im Korb' : 'Zum Korb';
    });

    openModal(modal);
}
