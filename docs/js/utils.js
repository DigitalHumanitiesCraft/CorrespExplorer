// Shared utility functions for CorrespExplorer
// Used by the explorer, the Datenkorb page, the parser and the view modules

/**
 * Debounce function - delays execution until after wait milliseconds
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    // Quotes are escaped too, because results are interpolated into attribute values
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Return the URL only if it uses the http or https scheme
 * @param {string} url - URL from CMIF or loaded JSON
 * @returns {string} - The URL, or '' for any other scheme or invalid input
 */
export function safeUrl(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : '';
}

/**
 * Build an external link from dataset values; falls back to escaped text for non-http(s) URLs
 * @param {string} url - URL from CMIF or loaded JSON
 * @param {string} text - Link text from CMIF or loaded JSON
 * @returns {string} - HTML
 */
export function externalLink(url, text) {
    const href = safeUrl(url);
    return href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`
        : escapeHtml(text);
}

/**
 * Check a ?json= parameter: only same-origin relative paths to .json files under data/
 * @param {string} path - Value of the json URL parameter
 * @returns {boolean}
 */
export function isAllowedJsonPath(path) {
    if (typeof path !== 'string') return false;
    if (!/^data\/[\w\-./]+\.json$/.test(path)) return false;
    return !path.split('/').includes('..');
}

/**
 * Quote a value as a CSV cell. A leading =, +, - or @ gets an apostrophe, so spreadsheet
 * programs do not evaluate names or places from CMIF as formulas.
 * @param {*} value
 * @returns {string}
 */
export function csvCell(value) {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Download file helper
 * @param {string} content - File content
 * @param {string} filename - Name for downloaded file
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType) {
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
 * Show a toast notification, replacing any toast still on screen.
 * @param {string} message - Message to show
 * @param {number} duration - Duration in ms (default 3000)
 */
export function showToast(message, duration = 3000) {
    document.querySelector('.toast-notification')?.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
        <span class="toast-message">${escapeHtml(message)}</span>
        <button type="button" class="toast-close" aria-label="Meldung schliessen"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(toast);

    const hide = () => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector('.toast-close').addEventListener('click', hide);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(hide, duration);
}

/**
 * Show a modal. The close button and a click on the backdrop close it; keyboard
 * behaviour comes from enableModalKeyboard. The hidden class is the only visibility switch.
 */
export function openModal(modal) {
    modal.style.removeProperty('display');
    modal.classList.remove('hidden');
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.onclick = () => closeModal(modal);
    modal.onclick = (e) => { if (e.target === modal) closeModal(modal); };
}

export function closeModal(modal) {
    modal.classList.add('hidden');
}

const DIALOG_SELECTOR = '.modal-overlay, .modal:not(.modal-overlay .modal)';
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function isShown(el) {
    return el.getClientRects().length > 0;
}

/**
 * Keep Tab and Shift+Tab inside a container: focus wraps from the last shown focusable element
 * to the first and back, and enters the container when it was outside. Shared by the modals and
 * the demo tour.
 * @param {KeyboardEvent} e - keydown event with key Tab
 * @param {HTMLElement} container
 */
export function trapTabKey(e, container) {
    const focusable = [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isShown);
    if (focusable.length === 0) {
        e.preventDefault();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const inside = container.contains(document.activeElement);
    if (e.shiftKey && (!inside || document.activeElement === first)) {
        last.focus();
        e.preventDefault();
    } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        first.focus();
        e.preventDefault();
    }
}

let dialogHeadingCount = 0;

// A dialog without an accessible name is named by its first heading
function labelDialog(dialog) {
    if (dialog.hasAttribute('aria-labelledby') || dialog.hasAttribute('aria-label')) return;
    const heading = dialog.querySelector('h1, h2, h3, h4');
    if (!heading) return;
    if (!heading.id) heading.id = `dialog-heading-${++dialogHeadingCount}`;
    dialog.setAttribute('aria-labelledby', heading.id);
}

/**
 * Keyboard behaviour for every modal of a page. Opening moves focus into the topmost dialog
 * (its close button first), Tab and Shift+Tab wrap inside it, Escape closes it through its
 * close button, and closing returns focus to the element that had it before. A MutationObserver
 * detects opening and closing, so static modals (hidden class) and generated ones (new element,
 * style.display in older modules) behave alike.
 */
export function enableModalKeyboard() {
    let openDialog = null;
    let returnFocus = null;

    const sync = () => {
        const dialogs = [...document.querySelectorAll(DIALOG_SELECTOR)].filter(isShown);
        const top = dialogs[dialogs.length - 1] || null;
        if (top === openDialog) return;
        if (top) {
            if (!openDialog) returnFocus = document.activeElement;
            top.setAttribute('role', 'dialog');
            top.setAttribute('aria-modal', 'true');
            labelDialog(top);
            if (!top.contains(document.activeElement)) {
                (top.querySelector('.modal-close') || top.querySelector(FOCUSABLE_SELECTOR))?.focus();
            }
        } else if (returnFocus?.isConnected) {
            returnFocus.focus();
        }
        openDialog = top;
    };

    // Only records that touch a dialog run sync: sync measures layout (isShown), and every filter
    // step re-renders large lists and sidebar classes, which would otherwise force a reflow each time
    const touchesDialog = (record) => {
        if (record.type === 'attributes') return record.target.matches?.(DIALOG_SELECTOR) || false;
        return [...record.addedNodes, ...record.removedNodes].some(node =>
            node.nodeType === Node.ELEMENT_NODE && (node.matches(DIALOG_SELECTOR) || node.querySelector(DIALOG_SELECTOR)));
    };
    new MutationObserver((records) => {
        if (records.some(touchesDialog)) sync();
    }).observe(document.body, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class']
    });

    document.addEventListener('keydown', (e) => {
        if (!openDialog) return;
        if (e.key === 'Escape') {
            const close = openDialog.querySelector('.modal-close');
            if (close) {
                close.click();
            } else {
                closeModal(openDialog);
            }
            e.preventDefault();
        } else if (e.key === 'Tab') {
            trapTabKey(e, openDialog);
        }
    });
}

/**
 * Build authority link (GND, VIAF, GeoNames)
 * @param {string} authorityUri - Full URI
 * @returns {string} - HTML link
 */
export function buildAuthorityLink(authorityUri) {
    authorityUri = safeUrl(authorityUri);
    if (!authorityUri) return '';

    let label = 'Link';
    if (authorityUri.includes('d-nb.info/gnd')) {
        label = 'GND';
    } else if (authorityUri.includes('viaf.org')) {
        label = 'VIAF';
    } else if (authorityUri.includes('geonames.org')) {
        label = 'GeoNames';
    } else if (authorityUri.includes('wikidata.org')) {
        label = 'Wikidata';
    }

    return `<a href="${escapeHtml(authorityUri)}" target="_blank" rel="noopener noreferrer" class="authority-link" title="${label}">${label}</a>`;
}

/**
 * Parse authority reference URL (VIAF, GND, LC, BNF)
 * @param {string} url - Authority URL
 * @returns {Object|null} - { type, id } or null
 */
export function parseAuthorityRef(url) {
    if (!url) return null;

    // VIAF
    // CMIF files write both viaf.org/viaf/{id} and the short form viaf.org/{id}
    const viafMatch = url.match(/viaf\.org\/(?:viaf\/)?(\d+)/);
    if (viafMatch) return { type: 'viaf', id: viafMatch[1] };

    // GND
    const gndMatch = url.match(/d-nb\.info\/gnd\/([^\s/]+)/);
    if (gndMatch) return { type: 'gnd', id: gndMatch[1] };

    // Library of Congress
    const lcMatch = url.match(/id\.loc\.gov\/authorities\/names\/([^\s/]+)/);
    if (lcMatch) return { type: 'lc', id: lcMatch[1] };

    // BNF
    const bnfMatch = url.match(/data\.bnf\.fr\/ark:\/12148\/([^\s/]+)/);
    if (bnfMatch) return { type: 'bnf', id: bnfMatch[1] };

    return { type: 'unknown', id: url };
}

/**
 * Parse GeoNames reference URL
 * @param {string} url - GeoNames URL
 * @returns {Object|null} - { id } or null
 */
export function parseGeoNamesRef(url) {
    if (!url) return null;

    const match = url.match(/geonames\.org\/(\d+)/);
    if (match) return { id: match[1] };

    return null;
}

/**
 * Classify a TEI date by its attributes, shared by the CMIF parser and the correspSearch loader.
 * Precision levels: day, month, year, range, unknown. Certainty comes from @cert (default high).
 * @param {{when?: string, from?: string, to?: string, notBefore?: string, notAfter?: string, cert?: string}} attrs
 * @returns {{date: string|null, dateTo: string|null, year: number|null, precision: string, certainty: string}}
 */
export function classifyDate({ when, from, to, notBefore, notAfter, cert } = {}) {
    const certainty = cert || 'high';
    const dateStr = when || from || notBefore;
    const dateToStr = to || notAfter || null;

    if (!dateStr && !dateToStr) {
        return { date: null, dateTo: null, year: null, precision: 'unknown', certainty };
    }

    const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : null;

    let precision = 'unknown';
    if ((from && to) || notBefore || notAfter) {
        precision = 'range';
    } else if (when) {
        if (when.length === 10) precision = 'day';       // YYYY-MM-DD
        else if (when.length === 7) precision = 'month'; // YYYY-MM
        else if (when.length === 4) precision = 'year';  // YYYY
    }

    return {
        date: dateStr || dateToStr,
        dateTo: dateToStr,
        year: Number.isNaN(year) ? null : year,
        precision,
        certainty
    };
}

/**
 * Key of a correspondent in the person index, filters and basket: authority id, else name
 * @param {{id?: string, name?: string}|null} person
 * @returns {string|null}
 */
export function personKey(person) {
    return person?.id || person?.name || null;
}

/**
 * Key of a place in the place index and basket: GeoNames id, else name
 * @param {{geonames_id?: string, name?: string}|null} place
 * @returns {string|null}
 */
export function placeKey(place) {
    return place?.geonames_id || place?.name || null;
}

// Names a source writes for an unknown place, such as the HSA placeholder "Unbekannt"
const UNKNOWN_PLACE_PATTERNS = [
    /^Unbekannt$/i,
    /^Unknown$/i,
    /^\[?\?\]?$/
];

/**
 * Whether a place name is a placeholder for an unknown place
 * @param {string|null} name
 * @returns {boolean}
 */
export function isUnknownPlaceName(name) {
    const trimmed = (name || '').trim();
    return UNKNOWN_PLACE_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Whether a sending place counts as a place: it has a GeoNames id, or a name that is no
 * placeholder for an unknown place. Place counts in the sidebar, overview and comparison use it,
 * so the HSA letters from "Unbekannt" do not add a place.
 * @param {{geonames_id?: string, name?: string}|null} place
 * @returns {boolean}
 */
export function isKnownPlace(place) {
    if (place?.geonames_id) return true;
    return Boolean(place?.name) && !isUnknownPlaceName(place.name);
}

/**
 * Authority system and id of a person from a letter, an index entry or a mention. The parser
 * and correspSearch store `id` and `authority`, the preprocessed HSA index stores `viaf`.
 * @param {{id?: string, authority?: string, viaf?: string}|null} person
 * @returns {{authority: string, id: string}|null} - null without both system and id
 */
export function personAuthority(person) {
    const id = person?.viaf || person?.id || null;
    const authority = person?.authority || (person?.viaf ? 'viaf' : null);
    return id && authority ? { authority, id } : null;
}

/**
 * Letter ID without the URL prefix of the edition
 * @param {string|null} id
 * @returns {string|null}
 */
export function cleanId(id) {
    if (!id) return null;
    const match = id.match(/[#/]([^#/]+)$/);
    return match ? match[1] : id;
}

/**
 * Person, place, language and subject indices of a letter list, shared by the CMIF parser and
 * the correspSearch loader. Persons and places are keyed with personKey and placeKey (ADR-001).
 * @param {Array} letters
 * @returns {{persons: Object, places: Object, subjects: Object, languages: Object}}
 */
export function buildIndices(letters) {
    const persons = {};
    const places = {};
    const subjects = {};
    const languages = {};

    const countPerson = (person, role) => {
        const key = personKey(person);
        if (!key) return;
        persons[key] ??= { name: person.name, id: person.id || null, authority: person.authority || null, letter_count: 0, as_sender: 0, as_recipient: 0 };
        persons[key].letter_count++;
        persons[key][role]++;
    };

    for (const letter of letters) {
        countPerson(letter.sender, 'as_sender');
        countPerson(letter.recipient, 'as_recipient');

        const placeId = placeKey(letter.place_sent);
        if (placeId) {
            places[placeId] ??= { name: letter.place_sent.name, geonames_id: letter.place_sent.geonames_id || null, lat: letter.place_sent.lat, lon: letter.place_sent.lon, letter_count: 0 };
            places[placeId].letter_count++;
        }

        const code = letter.language?.code;
        if (code) {
            languages[code] ??= { code, label: letter.language.label, letter_count: 0 };
            languages[code].letter_count++;
        }

        for (const subject of letter.mentions?.subjects || []) {
            const key = subject.uri || subject.label;
            subjects[key] ??= { label: subject.label, uri: subject.uri, category: subject.category, letter_count: 0 };
            subjects[key].letter_count++;
        }
    }

    return { persons, places, subjects, languages };
}

/**
 * Count distinct correspondents (senders and recipients) and those with an authority reference.
 * Parser and preprocessing store the bare authority id (e.g. "18030027") in `id` and the
 * system in `authority`, so a present `id` marks identification, not a URL prefix.
 * Persons without id are keyed by name, as in the person index of explore.js.
 * @param {Array} letters - Letters with sender/recipient objects
 * @returns {{identified: number, total: number}}
 */
export function countIdentifiedPersons(letters) {
    const all = new Set();
    const identified = new Set();
    for (const letter of letters) {
        for (const person of [letter.sender, letter.recipient]) {
            if (!person?.name) continue;
            all.add(person.id || person.name);
            if (person.id) identified.add(person.id);
        }
    }
    return { identified: identified.size, total: all.size };
}
