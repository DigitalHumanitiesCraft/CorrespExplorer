// Helpers shared by several views: the active filters in words, design tokens for D3 attributes,
// the combobox of the search fields, the star button of the basket and the links and rows of the
// detail dialogs. Kept here so the views do not each carry their own copy.

import { escapeHtml, letterRecipients, personAuthority, personKey, placeKey, showToast } from '../utils.js';
import { BASKET_LIMITS, LETTER_FEATURES, languageLabel } from '../constants.js';
import { isInBasket, addToBasket, removeFromBasket } from '../basket.js';
import { state } from '../state-manager.js';

// German enumeration: "a", "a und b", "a, b und c"
function joinGerman(parts) {
    return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`;
}

// Display names of the keys a filter holds, resolved from the letters; the key itself is the fallback
function personName(key, letters) {
    for (const letter of letters) {
        const person = [letter.sender, ...letterRecipients(letter)].find(p => personKey(p) === key);
        if (person?.name) return person.name;
    }
    return key;
}

function placeName(key, letters) {
    return letters.find(l => placeKey(l.place_sent) === key)?.place_sent?.name || key;
}

function subjectLabel(key, letters) {
    for (const letter of letters) {
        const subject = letter.mentions?.subjects?.find(s => (s.uri || s.id || s.label) === key);
        if (subject?.label) return subject.label;
    }
    return key;
}

// Above this many languages the mark counts them instead of naming each
const NAMED_LANGUAGES = 3;
const QUALITY_MARKS = [
    ['preciseDates', 'nur exakte Datierungen'],
    ['knownPersons', 'nur identifizierte Personen'],
    ['locatedPlaces', 'nur lokalisierte Orte']
];

/**
 * The selection as the marks of one sentence, in a fixed order: person, place, time, language,
 * topic, features. Each mark names one filter that can be removed on its own; its key says which.
 * A partner joins the person with "und", every other mark follows after a comma, so the marks read
 * as „Hugo Schuchardt und Leo Spitzer, Graz, 1900–1905, Französisch“.
 * @param {Object} filters - same shape as state.filters
 * @param {Array} letters - all letters of the dataset, to resolve names
 * @returns {{key: string, label: string, joiner: string}[]}
 */
export function selectionMarks(filters, letters) {
    const marks = [];
    const add = (key, label, joiner = ', ') => marks.push({ key, label, joiner: marks.length ? joiner : '' });
    if (filters.person) {
        add('person', personName(filters.person, letters));
        if (filters.partner) add('partner', personName(filters.partner, letters), ' und ');
    }
    if (filters.place) add('place', placeName(filters.place, letters));
    if (filters.temporal?.undated) {
        add('time', 'ohne Jahr');
    } else if (filters.temporal) {
        const { min, max } = filters.temporal;
        add('time', min === max ? String(min) : `${min}–${max}`);
    }
    // A year picked in a figure, beside the period of the sidebar
    if (filters.year != null) add('year', String(filters.year));
    if (filters.languages) {
        const names = filters.languages.map(languageLabel);
        add('languages', names.length === 0 ? 'keine Sprache'
            : names.length > NAMED_LANGUAGES ? `${names.length} Sprachen`
                : names.join(' oder '));
    }
    if (filters.subject) add('subject', subjectLabel(filters.subject, letters));
    for (const key of filters.features || []) {
        const feature = LETTER_FEATURES.find(f => f.key === key);
        if (feature) add(`feature:${key}`, feature.label);
    }
    for (const [key, label] of QUALITY_MARKS) {
        if (filters.quality?.[key]) add(`quality:${key}`, label);
    }
    return marks;
}

/**
 * The active filters in words, one phrase per filter, so a view without sidebar can say what
 * narrows its letters. Names are resolved from the letters, as the sentence of the sidebar does.
 * @param {Object} filters - same shape as state.filters
 * @param {Array} letters - all letters of the dataset
 * @returns {string[]} phrases that read after "gefiltert nach"
 */
export function describeFilters(filters, letters) {
    const parts = [];
    if (filters.person && filters.partner) {
        parts.push(`Briefen zwischen „${personName(filters.person, letters)}“ und „${personName(filters.partner, letters)}“`);
    } else if (filters.person) {
        parts.push(`Person „${personName(filters.person, letters)}“`);
    }
    if (filters.place) parts.push(`Absendeort „${placeName(filters.place, letters)}“`);
    if (filters.subject) parts.push(`Thema „${subjectLabel(filters.subject, letters)}“`);
    if (filters.temporal?.undated) {
        parts.push('Briefen ohne Jahr');
    } else if (filters.temporal) {
        const { min, max } = filters.temporal;
        parts.push(min === max ? `Jahr ${min}` : `Jahren ${min} bis ${max}`);
    }
    if (filters.year != null) parts.push(`Jahr ${filters.year}`);
    if (filters.languages) {
        parts.push(filters.languages.length === 0
            ? 'keiner Sprache'
            : `${filters.languages.length === 1 ? 'Sprache' : 'Sprachen'} ${joinGerman(filters.languages.map(languageLabel))}`);
    }
    for (const key of filters.features || []) {
        const feature = LETTER_FEATURES.find(f => f.key === key);
        if (feature) parts.push(`Merkmal „${feature.label}“`);
    }
    if (filters.quality?.preciseDates) parts.push('tagesgenauem Datum');
    if (filters.quality?.knownPersons) parts.push('identifizierten Personen');
    if (filters.quality?.locatedPlaces) parts.push('Orten mit Koordinaten');
    return parts;
}

/**
 * One sentence on the active filter, or an empty string without filter. Plain text, for the
 * export dialog and any other place that states the filter.
 * @param {Object} [filters]
 * @param {Array} [allLetters]
 * @param {number} [shown] - number of letters the filter leaves
 * @returns {string}
 */
export function filterSentence(filters = state.filters, allLetters = state.getAllLetters(), shown = state.getFilteredLetters().length) {
    const parts = describeFilters(filters, allLetters);
    if (parts.length === 0) return '';
    const total = allLetters.length;
    return `Gezeigt ${shown === 1 ? 'wird' : 'werden'} ${shown.toLocaleString('de-DE')} von ${total.toLocaleString('de-DE')} Briefen, gefiltert nach ${joinGerman(parts)}.`;
}

/**
 * Text alternative of a chart: a table of the values the chart shows, below the chart, shown on
 * one quiet switch named by `label`.
 * Screen readers and keyboard users get every value without pointing at marks, and everyone can
 * read exact numbers. Every cell is escaped. The scrolling region takes focus, so the keyboard can
 * scroll it (axe scrollable-region-focusable). Without rows the host is emptied.
 * @param {HTMLElement|null} host - container below the chart
 * @param {{caption: string, columns: string[], rows: Array<Array<string|number>>, limit?: number, label?: string}} table
 */
export function renderDataTable(host, { caption, columns, rows, limit = 500, label = 'Daten als Tabelle' }) {
    if (!host) return;
    if (rows.length === 0) {
        host.innerHTML = '';
        return;
    }
    // The table is the figure's alternative, shown on demand under one quiet switch at the same
    // place in every view, without a collapsed box (design.md, rule 4); its state survives redraws
    const shown = host.dataset.tableShown === 'true';
    const rowsShown = rows.slice(0, limit);
    const cell = value => (typeof value === 'number' ? value.toLocaleString('de-DE') : escapeHtml(String(value ?? '')));
    const note = rows.length > limit
        ? `<p class="chart-table__note">Die ersten ${limit.toLocaleString('de-DE')} von ${rows.length.toLocaleString('de-DE')} Zeilen.</p>`
        : '';
    const id = host.id ? `${host.id}-table` : '';
    host.innerHTML = `
        <div class="chart-table">
            <button type="button" class="chart-table__switch" aria-expanded="${shown}"${id ? ` aria-controls="${id}"` : ''}>${escapeHtml(shown ? 'Tabelle ausblenden' : label)}</button>
            <div class="chart-table__body${shown ? '' : ' hidden'}"${id ? ` id="${id}"` : ''}>
                <div class="chart-table__scroll" tabindex="0" role="region" aria-label="${escapeHtml(caption)}">
                    <table>
                        <caption>${escapeHtml(caption)}</caption>
                        <thead><tr>${columns.map(c => `<th scope="col">${escapeHtml(c)}</th>`).join('')}</tr></thead>
                        <tbody>${rowsShown.map(row => `<tr>${row.map((v, i) => (i === 0 ? `<th scope="row">${cell(v)}</th>` : `<td${typeof v === 'number' ? ' class="chart-table__num"' : ''}>${cell(v)}</td>`)).join('')}</tr>`).join('')}</tbody>
                    </table>
                </div>
                ${note}
            </div>
        </div>`;
    const button = host.querySelector('.chart-table__switch');
    button.addEventListener('click', () => {
        const next = host.dataset.tableShown !== 'true';
        host.dataset.tableShown = String(next);
        button.setAttribute('aria-expanded', String(next));
        button.textContent = next ? 'Tabelle ausblenden' : label;
        host.querySelector('.chart-table__body').classList.toggle('hidden', !next);
    });
}

/**
 * Current values of design tokens from tokens.css. SVG presentation attributes and gradient stops
 * set through D3 attr() cannot resolve var(), so the views read the values once per render.
 * @param {Object<string, string>} names - Map of result key to custom property name
 * @returns {Object<string, string>}
 */
export function readTokens(names) {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(Object.entries(names).map(([key, prop]) => [key, style.getPropertyValue(prop).trim()]));
}

/**
 * Bind a text input and its dropdown as combobox and listbox.
 * Keyboard: ArrowDown and ArrowUp move the active option, Enter selects it, Escape closes the list.
 * Focus stays in the input; the active option is announced through aria-activedescendant.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} listbox - Element with an id, shown and hidden through the hidden class
 * @param {{onSelect: function(Object): void, label?: function(Object): string, count?: function(Object): (number|string|null)}} options
 * @returns {{show: function(Array, string=): void, hide: function(): void, isOpen: function(): boolean}}
 */
export function bindCombobox(input, listbox, { onSelect, label = item => item.name, count = () => null }) {
    let items = [];
    let active = -1;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', listbox.id);
    listbox.setAttribute('role', 'listbox');
    if (input.getAttribute('aria-label')) listbox.setAttribute('aria-label', input.getAttribute('aria-label'));

    const optionId = i => `${listbox.id}-option-${i}`;

    const setActive = (index) => {
        active = index;
        listbox.querySelectorAll('[role="option"]').forEach((el, i) => {
            const isActive = i === active;
            el.classList.toggle('highlighted', isActive);
            el.setAttribute('aria-selected', String(isActive));
            if (isActive) el.scrollIntoView({ block: 'nearest' });
        });
        if (active >= 0) {
            input.setAttribute('aria-activedescendant', optionId(active));
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    };

    const hide = () => {
        listbox.classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        active = -1;
    };

    const show = (results, emptyText = 'Keine Treffer') => {
        items = results;
        active = -1;
        input.removeAttribute('aria-activedescendant');
        if (results.length === 0) {
            listbox.innerHTML = `<div class="autocomplete-empty">${escapeHtml(emptyText)}</div>`;
        } else {
            listbox.innerHTML = results.map((item, i) => {
                const n = count(item);
                return `<div class="autocomplete-item" role="option" id="${optionId(i)}" aria-selected="false" data-index="${i}">
                    <span class="autocomplete-item-name">${escapeHtml(label(item))}</span>
                    ${n != null ? `<span class="autocomplete-item-count">${escapeHtml(String(n))}</span>` : ''}
                </div>`;
            }).join('');
        }
        listbox.classList.remove('hidden');
        input.setAttribute('aria-expanded', 'true');
    };

    const select = (index) => {
        const item = items[index];
        if (!item) return;
        hide();
        onSelect(item);
    };

    input.addEventListener('keydown', (e) => {
        if (listbox.classList.contains('hidden')) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length > 0) setActive(Math.min(active + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length > 0) setActive(Math.max(active - 1, 0));
        } else if (e.key === 'Enter') {
            if (active >= 0) {
                e.preventDefault();
                select(active);
            }
        } else if (e.key === 'Escape') {
            // Closing the list must not also close a surrounding dialog or clear the search field
            e.preventDefault();
            e.stopPropagation();
            hide();
        }
    });

    // mousedown would move focus out of the input and close the list before the click lands
    listbox.addEventListener('mousedown', (e) => e.preventDefault());
    listbox.addEventListener('click', (e) => {
        const option = e.target.closest('[role="option"]');
        if (option) select(parseInt(option.dataset.index, 10));
    });
    input.addEventListener('blur', hide);

    return { show, hide, isOpen: () => !listbox.classList.contains('hidden') };
}

const BASKET_LABELS = {
    letters: { one: 'Brief', limit: `höchstens ${BASKET_LIMITS.maxLetters} Briefe` },
    persons: { one: 'Person', limit: `höchstens ${BASKET_LIMITS.maxPersons} Personen` },
    places: { one: 'Ort', limit: `höchstens ${BASKET_LIMITS.maxPlaces} Orte` }
};

/**
 * Toggle one basket entry from a star button. A full basket leaves the entry out and says so,
 * instead of marking it as added. Returns whether the entry is in the basket afterwards.
 */
export function toggleBasketButton(btn, type, id, { pressed = true } = {}) {
    const labels = BASKET_LABELS[type];
    if (isInBasket(type, id)) {
        removeFromBasket(type, id);
        showToast(`${labels.one} aus dem Korb entfernt`);
    } else {
        const result = addToBasket(type, id);
        if (result !== true) {
            showToast(result === 'full' ? `Korb voll: ${labels.limit}` : `${labels.one} nicht hinzugefügt`);
            return false;
        }
        showToast(`${labels.one} zum Korb hinzugefügt`);
    }
    const inBasket = isInBasket(type, id);
    btn.classList.toggle('in-basket', inBasket);
    btn.title = inBasket ? 'Aus Korb entfernen' : 'Zum Korb hinzufügen';
    if (pressed) btn.setAttribute('aria-pressed', String(inBasket));
    return inBasket;
}

// After a change of view that a control inside the content triggered, keyboard focus continues
// at the title of the new view instead of falling back to the document
export function focusViewHeading(view) {
    const heading = document.querySelector(`#${view}-view .view-header__title`);
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus();
}

// One labelled row of a detail dialog; valueHtml is already escaped
export function detailRow(label, valueHtml, valueClass = '') {
    return `<div class="letter-detail-row">
        <span class="letter-detail-label">${label}</span>
        <span class="letter-detail-value ${valueClass}">${valueHtml}</span>
    </div>`;
}

export function correspSearchLink(url, name, className) {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="${className}" title="Briefe von ${escapeHtml(name)} bei correspSearch">
        <i class="fas fa-search" aria-hidden="true"></i> ${escapeHtml(name)} bei correspSearch
    </a>`;
}

// Page of a person at the authority (VIAF or GND), or null for other systems
export function authorityUrl(authority, id) {
    if (!id) return null;
    if (authority === 'viaf') return `https://viaf.org/viaf/${encodeURIComponent(id)}`;
    if (authority === 'gnd') return `https://d-nb.info/gnd/${encodeURIComponent(id)}`;
    return null;
}

// correspSearch search for a person; the API accepts GND and VIAF URIs as correspondent
export function buildCorrespSearchUrl(person) {
    const ref = personAuthority(person);
    if (!ref) return null;

    let authorityUri = null;
    if (ref.authority === 'gnd') authorityUri = `http://d-nb.info/gnd/${ref.id}`;
    if (ref.authority === 'viaf') authorityUri = `http://viaf.org/viaf/${ref.id}`;

    return authorityUri
        ? `https://correspsearch.net/search.xql?correspondent=${encodeURIComponent(authorityUri)}`
        : null;
}

// Person name, linked to its authority page when it has one
export function buildPersonLink(person) {
    if (!person) return 'Unbekannt';
    const name = escapeHtml(person.name);
    const ref = personAuthority(person);
    const url = ref && authorityUrl(ref.authority, ref.id);
    return url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="In ${escapeHtml(ref.authority.toUpperCase())} ansehen">${name}</a>`
        : name;
}

// Place name, linked to GeoNames when it has an id
export function buildPlaceLink(place) {
    if (!place) return 'Unbekannt';
    const name = escapeHtml(place.name);
    return place.geonames_id
        ? `<a href="https://www.geonames.org/${encodeURIComponent(place.geonames_id)}" target="_blank" rel="noopener noreferrer" title="In GeoNames ansehen">${name}</a>`
        : name;
}
