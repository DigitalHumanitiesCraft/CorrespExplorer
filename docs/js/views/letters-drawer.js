// Letters drawer: the letters of the current selection at the lower edge of every view except the
// letter list. One line names their number and opens the list upwards over the view, so the view
// keeps its state while one reads the letters. The letter list stays the full list with search and
// order, one control away. Rows and the letter dialog are those of the letter list.

import { sortLetters, renderLetterGroups, bindLetterRows } from './letters-view.js';
import { formatNumber as fmt } from '../formatters.js';

let deps = {};
let isOpen = false;
let visible = true;
let inLetterList = false;
let renderedFrom = null;

const el = id => document.getElementById(id);

/**
 * Count of the selection as the line says it: "312 Briefe", under a filter "312 von 11.576 Briefen"
 * @param {number} part
 * @param {number} total
 * @param {boolean} filtered
 * @returns {string}
 */
export function drawerCountText(part, total, filtered) {
    if (!filtered) return `${fmt(total)} ${total === 1 ? 'Brief' : 'Briefe'}`;
    return `${fmt(part)} von ${fmt(total)} ${total === 1 ? 'Brief' : 'Briefen'}`;
}

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getFilteredLetters
 * @param {Function} dependencies.getTotal - number of letters in the dataset
 * @param {Function} dependencies.hasActiveFilter
 * @param {Function} dependencies.openLetterList - switches to the letter list
 * @param {Function} dependencies.onToggle - called with the new state, for the URL
 */
export function initLettersDrawer(dependencies) {
    deps = dependencies;
    const drawer = el('letters-drawer');
    const list = el('letters-drawer-list');
    if (!drawer || !list) return;
    el('letters-drawer-toggle').addEventListener('click', () => {
        if (inLetterList) deps.openLetterList(); else setDrawerOpen(!isOpen, { focus: true });
    });
    el('letters-drawer-all').addEventListener('click', () => deps.openLetterList());
    // Escape inside the drawer closes it; dialogs over it take Escape first and mark it handled
    drawer.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || e.defaultPrevented || !isOpen) return;
        e.preventDefault();
        setDrawerOpen(false, { focus: true });
    });
    bindLetterRows(list);
    bindGrip();
}

// Lowest height the reader can give the list, and the share of the main area it may take at most;
// the view above keeps the rest and refits to it
const MIN_HEIGHT = 96;
const MAX_SHARE = 0.8;
const KEY_STEP = 48;

/**
 * The grip on the upper edge of the open list: dragging it or the arrow keys set the height of the
 * list. Without it the list takes the height its rows need, up to a third of the main area.
 */
function bindGrip() {
    const grip = el('letters-drawer-grip');
    const panel = el('letters-drawer-panel');
    if (!grip || !panel) return;
    const limit = () => (el('main-content')?.clientHeight || window.innerHeight) * MAX_SHARE;
    const setHeight = (px) => {
        const height = Math.round(Math.max(MIN_HEIGHT, Math.min(limit(), px)));
        // A reader-set value, so it lives on the element; the stylesheet keeps the default
        panel.style.setProperty('--drawer-height', `${height}px`);
        grip.setAttribute('aria-valuenow', String(height));
    };
    let drag = null;
    grip.addEventListener('pointerdown', (e) => {
        drag = { y: e.clientY, height: panel.getBoundingClientRect().height };
        grip.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    grip.addEventListener('pointermove', (e) => {
        if (drag) setHeight(drag.height + drag.y - e.clientY);
    });
    const end = () => { drag = null; };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('keydown', (e) => {
        const step = { ArrowUp: KEY_STEP, ArrowDown: -KEY_STEP }[e.key];
        if (!step) return;
        e.preventDefault();
        setHeight(panel.getBoundingClientRect().height + step);
    });
}

/**
 * Open or close the list. Opening moves focus to the first letter, closing back to the line, when
 * the reader asked for it with this control or a "show letters" action.
 */
export function setDrawerOpen(open, { focus = false } = {}) {
    isOpen = open;
    const toggle = el('letters-drawer-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    el('letters-drawer')?.classList.toggle('letters-drawer--open', open);
    el('letters-drawer-panel')?.classList.toggle('hidden', !open);
    el('letters-drawer-all')?.classList.toggle('hidden', !open);
    if (open) {
        renderList();
        const panel = el('letters-drawer-panel');
        el('letters-drawer-grip')?.setAttribute('aria-valuenow', String(Math.round(panel.getBoundingClientRect().height)));
    }
    deps.onToggle?.(open);
    if (!focus) return;
    if (open) {
        const first = el('letters-drawer-list')?.querySelector('.letter-toggle');
        (first || el('letters-drawer-panel'))?.focus();
    } else {
        toggle.focus();
    }
}

/**
 * Count of the line and, when open, the list; called after every change of filter or view
 * @param {{hidden: boolean}} options - hidden in the letter list itself
 */
export function updateLettersDrawer({ hidden, inList = false }) {
    const drawer = el('letters-drawer');
    if (!drawer || !deps.getFilteredLetters) return;
    visible = !hidden;
    inLetterList = inList;
    drawer.classList.toggle('hidden', hidden);
    // In the letter list the count stands at the same place, but the list it would open is the
    // view itself, so it is no disclosure there
    const toggle = el('letters-drawer-toggle');
    toggle.classList.toggle('letters-drawer__toggle--list', inList);
    if (inList) {
        toggle.removeAttribute('aria-expanded');
        toggle.removeAttribute('aria-controls');
    } else {
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-controls', 'letters-drawer-panel');
    }
    const letters = deps.getFilteredLetters();
    el('letters-drawer-count').textContent = drawerCountText(letters.length, deps.getTotal(), deps.hasActiveFilter());
    if (isOpen && visible) renderList();
}

function renderList() {
    const list = el('letters-drawer-list');
    if (!list) return;
    const letters = deps.getFilteredLetters();
    // A selection with the same letters keeps its rows, scroll position and focus. Setting a filter
    // to the value it has (the year slider repeats its value after a pause) hands out a new array
    // with the same letters
    const same = renderedFrom && letters.length === renderedFrom.length && letters.every((l, i) => l === renderedFrom[i]);
    renderedFrom = letters;
    if (same) return;
    const hadFocus = list.contains(document.activeElement);
    list.scrollTop = 0;
    if (letters.length === 0) {
        list.innerHTML = '<p class="letters-drawer__empty">Die Auswahl enthält keinen Brief.</p>';
    } else {
        // Oldest first: a selection of letters reads as a correspondence in its course. Groups and
        // rows are those of the letter list, written as the list is scrolled
        renderLetterGroups(list, sortLetters(letters, 'date-asc'), { order: 'date-asc' });
    }
    // Rows replaced under the focus hand it to the first new row, not to the document
    if (hadFocus) (list.querySelector('.letter-toggle') || el('letters-drawer-panel'))?.focus();
}
