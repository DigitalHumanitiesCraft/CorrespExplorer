// Helpers shared by several views: design tokens for D3 attributes and the combobox behaviour of
// the search fields. Kept here so the views do not each carry their own copy.

import { escapeHtml } from '../utils.js';

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
