// The Wissenskorb section of the sidebar: add the selection of the current view, empty the basket,
// and the counts in the sidebar and the navigation badge. The basket itself lives in basket.js.
// The knowledge path (US-35, US-36) that gave this module its name is retired.

import {
    addItemsToBasket,
    getBasketCounts,
    clearBasket,
    onBasketChange
} from './basket.js';
import { BASKET_LIMITS } from './constants.js';
import { personKey, placeKey, showToast } from './utils.js';

let deps = null;

/**
 * Wire the sidebar basket
 * @param {{getCurrentView: Function, getFilteredLetters: Function}} dependencies
 */
export function initKnowledgePath(dependencies) {
    deps = dependencies;

    document.getElementById('add-to-basket')?.addEventListener('click', addToBasketFromView);
    document.getElementById('clear-basket')?.addEventListener('click', () => {
        clearBasket();
        showToast('Korb geleert');
    });

    onBasketChange(() => updateSidebarBasketUI());
    updateSidebarBasketUI();
}

const BASKET_TYPES = {
    persons: { many: 'Personen', limit: BASKET_LIMITS.maxPersons },
    places: { many: 'Orte', limit: BASKET_LIMITS.maxPlaces },
    letters: { many: 'Briefe', limit: BASKET_LIMITS.maxLetters }
};

/**
 * Selection of a view for the "Zum Wissenskorb" button: persons and places by personKey and
 * placeKey (ADR-001), so entries without authority id are collected too, else letter ids
 * @param {string} view
 * @param {Array} letters - filtered letters
 * @returns {{type: string, ids: string[]}}
 */
export function basketSelectionForView(view, letters) {
    if (view === 'persons') {
        return { type: 'persons', ids: [...new Set(letters.flatMap(l => [personKey(l.sender), personKey(l.recipient)]).filter(Boolean))] };
    }
    if (view === 'places' || view === 'map') {
        return { type: 'places', ids: [...new Set(letters.map(l => placeKey(l.place_sent)).filter(Boolean))] };
    }
    return { type: 'letters', ids: [...new Set(letters.map(l => l.id).filter(Boolean))] };
}

function addToBasketFromView() {
    const { type, ids } = basketSelectionForView(deps.getCurrentView(), deps.getFilteredLetters());
    const { added, rejected } = addItemsToBasket(type, ids);
    const { many, limit } = BASKET_TYPES[type];

    if (rejected > 0) {
        showToast(`${added} ${many} zum Korb hinzugefügt, ${rejected} nicht: Korb voll (höchstens ${limit} ${many})`);
    } else if (added > 0) {
        showToast(`${added} ${many} zum Korb hinzugefügt`);
    } else {
        showToast(ids.length > 0 ? `Alle ${many} bereits im Korb` : 'Keine Einträge in der aktuellen Auswahl');
    }
}

function updateSidebarBasketUI() {
    const counts = getBasketCounts();
    const container = document.getElementById('basket-content');

    if (container) {
        const groups = [
            ['persons', 'fa-users', 'Personen'],
            ['places', 'fa-map-marker-alt', 'Orte'],
            ['letters', 'fa-envelope', 'Briefe']
        ].filter(([type]) => counts[type] > 0);

        let html = groups.map(([type, icon, label]) => `
            <div class="basket-group">
                <span class="basket-group-label"><i class="fas ${icon}" aria-hidden="true"></i> ${label}</span>
                <span class="basket-group-count">${counts[type]}</span>
            </div>
        `).join('');

        if (html === '') {
            html = '<div class="basket-empty">Korb ist leer</div>';
        } else {
            html += `
                <a href="wissenskorb.html" class="basket-view-link">
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i> Korb öffnen
                </a>
            `;
        }
        container.innerHTML = html;
    }

    const badge = document.getElementById('basket-badge');
    if (badge) {
        badge.textContent = counts.total;
        badge.classList.toggle('has-items', counts.total > 0);
    }
}
