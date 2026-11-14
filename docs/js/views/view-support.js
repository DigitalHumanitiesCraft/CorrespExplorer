// Helpers shared by several views: design tokens for D3 attributes and the combobox behaviour of
// the search fields. Kept here so the views do not each carry their own copy.

import { escapeHtml, letterRecipients, personKey, placeKey } from '../utils.js';
import { LETTER_FEATURES, languageLabel } from '../constants.js';
import { state } from '../state-manager.js';

// German enumeration: "a", "a und b", "a, b und c"
function joinGerman(parts) {
    return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`;
}

/**
 * The active filters in words, one phrase per filter, so a view without sidebar can say what
 * narrows its letters. Names are resolved from the letters, as the sidebar badges do.
 * @param {Object} filters - same shape as state.filters
 * @param {Array} letters - all letters of the dataset
 * @returns {string[]} phrases that read after "gefiltert nach"
 */
export function describeFilters(filters, letters) {
    const parts = [];
    if (filters.person) {
        let name = filters.person;
        for (const letter of letters) {
            const person = [letter.sender, ...letterRecipients(letter)].find(p => personKey(p) === filters.person);
            if (person?.name) { name = person.name; break; }
        }
        parts.push(`Person „${name}“`);
    }
    if (filters.place) {
        const name = letters.find(l => placeKey(l.place_sent) === filters.place)?.place_sent?.name || filters.place;
        parts.push(`Absendeort „${name}“`);
    }
    if (filters.subject) {
        let label = filters.subject;
        for (const letter of letters) {
            const subject = letter.mentions?.subjects?.find(s => (s.uri || s.id || s.label) === filters.subject);
            if (subject?.label) { label = subject.label; break; }
        }
        parts.push(`Thema „${label}“`);
    }
    if (filters.temporal?.undated) {
        parts.push('Briefen ohne Jahr');
    } else if (filters.temporal) {
        const { min, max } = filters.temporal;
        parts.push(min === max ? `Jahr ${min}` : `Jahren ${min} bis ${max}`);
    }
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
 * filter notice of the views without sidebar and for any other place that states the filter.
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
 * Notice under the header of a view without sidebar (activity, chronicle, comparison): the
 * filter set elsewhere narrows these views too, and without the sidebar it would act unseen.
 * The button uses the sidebar's reset button, which stays in the document while the sidebar is
 * hidden, so no further hook into explore.js is needed. Focus then moves to the view heading,
 * because the notice and its button disappear with the filter.
 * @param {string} viewId - id of the view container, e.g. 'activity-view'
 */
export function renderFilterNotice(viewId) {
    const header = document.querySelector(`#${viewId} .view-header`);
    if (!header) return;
    let notice = document.getElementById(`${viewId}-filter-notice`);
    const sentence = filterSentence();
    if (!sentence) {
        notice?.classList.add('hidden');
        return;
    }
    if (!notice) {
        notice = document.createElement('div');
        notice.id = `${viewId}-filter-notice`;
        notice.className = 'view-filter-notice';
        notice.setAttribute('role', 'status');
        header.after(notice);
    }
    const reset = document.getElementById('reset-filters');
    notice.innerHTML = `<span>${escapeHtml(sentence)}</span>${reset
        ? '<button type="button" class="view-filter-notice__clear">Filter aufheben</button>'
        : ''}`;
    notice.classList.remove('hidden');
    notice.querySelector('.view-filter-notice__clear')?.addEventListener('click', () => {
        reset.click();
        const title = header.querySelector('.view-header__title');
        if (title) {
            title.tabIndex = -1;
            title.focus();
        }
    });
}

/**
 * Current values of design tokens from tokens.css. SVG presentation attributes and gradient stops
 * set through D3 attr() cannot resolve var(), so the views read the values once per render.
 * @param {Object<string, string>} names - Map of result key to custom property name
 * @returns {Object<string, string>}
 */
/**
 * Text alternative of a chart: a collapsed table of the values the chart shows, below the chart.
 * Screen readers and keyboard users get every value without pointing at marks, and everyone can
 * read exact numbers. Every cell is escaped. The scrolling region takes focus, so the keyboard can
 * scroll it (axe scrollable-region-focusable). Without rows the host is emptied.
 * @param {HTMLElement|null} host - container below the chart
 * @param {{caption: string, columns: string[], rows: Array<Array<string|number>>, limit?: number}} table
 */
export function renderDataTable(host, { caption, columns, rows, limit = 500 }) {
    if (!host) return;
    if (rows.length === 0) {
        host.innerHTML = '';
        return;
    }
    const open = host.querySelector('details')?.open ? ' open' : '';
    const shown = rows.slice(0, limit);
    const cell = value => (typeof value === 'number' ? value.toLocaleString('de-DE') : escapeHtml(String(value ?? '')));
    const note = rows.length > limit
        ? `<p class="chart-table__note">Die ersten ${limit.toLocaleString('de-DE')} von ${rows.length.toLocaleString('de-DE')} Zeilen.</p>`
        : '';
    host.innerHTML = `
        <details class="chart-table"${open}>
            <summary>Daten als Tabelle</summary>
            <div class="chart-table__scroll" tabindex="0" role="region" aria-label="${escapeHtml(caption)}">
                <table>
                    <caption>${escapeHtml(caption)}</caption>
                    <thead><tr>${columns.map(c => `<th scope="col">${escapeHtml(c)}</th>`).join('')}</tr></thead>
                    <tbody>${shown.map(row => `<tr>${row.map((v, i) => (i === 0 ? `<th scope="row">${cell(v)}</th>` : `<td${typeof v === 'number' ? ' class="chart-table__num"' : ''}>${cell(v)}</td>`)).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
            ${note}
        </details>`;
}

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
