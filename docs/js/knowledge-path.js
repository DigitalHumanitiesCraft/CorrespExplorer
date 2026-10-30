// Knowledge path (US-35, US-36): the bar under the navigation that leads through the steps of a
// research path, and the Wissenskorb section of the sidebar. The path lives in sessionStorage
// with the key of its dataset, the basket itself in basket.js.

import {
    addItemsToBasket,
    getBasketCounts,
    clearBasket,
    onBasketChange
} from './basket.js';
import { BASKET_LIMITS } from './constants.js';
import { escapeHtml, personKey, placeKey, showToast } from './utils.js';

const STORAGE_KEY = 'knowledgePath';

let knowledgePath = null;
let deps = null;

/**
 * Wire path bar and sidebar basket and restore a path of the same dataset
 * @param {{datasetKey: string, switchView: Function, getCurrentView: Function, getFilteredLetters: Function}} dependencies
 */
export function initKnowledgePath(dependencies) {
    deps = dependencies;

    document.getElementById('path-nav-back')?.addEventListener('click', () => goToStep(knowledgePath?.currentStep - 1));
    document.getElementById('path-nav-next')?.addEventListener('click', nextPathStep);
    document.getElementById('path-bar-close')?.addEventListener('click', endKnowledgePath);
    document.getElementById('add-to-basket')?.addEventListener('click', addToBasketFromView);
    document.getElementById('clear-basket')?.addEventListener('click', () => {
        clearBasket();
        showToast('Korb geleert');
    });

    onBasketChange(() => updateSidebarBasketUI());
    updateSidebarBasketUI();
    loadKnowledgePath();
}

/**
 * Start a path from a research question of the overview
 * @param {{question: string, category: string, path: Array<{view, label, action}>}} question
 */
export function startKnowledgePath(question) {
    if (!question?.path?.length) return;

    knowledgePath = {
        active: true,
        dataset: deps.datasetKey,
        questionId: `kp-${Date.now()}`,
        question: question.question,
        category: question.category,
        path: question.path,
        currentStep: 0
    };
    saveKnowledgePath();
    setPathUIVisible(true);
    deps.switchView(question.path[0].view);
    updateKnowledgePathUI();
}

function loadKnowledgePath() {
    knowledgePath = null;
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
        // A path started on another dataset refers to its persons and places
        if (saved?.active && saved.dataset === deps.datasetKey && saved.path?.length) {
            knowledgePath = saved;
            setPathUIVisible(true);
            updateKnowledgePathUI();
        }
    } catch (e) {
        console.error('Error loading knowledge path:', e);
    }
}

// Storage can be blocked or full (private mode, quota); the path then lasts only for this page
function saveKnowledgePath() {
    if (!knowledgePath) return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(knowledgePath));
    } catch (e) {
        console.warn('Knowledge path not saved:', e);
    }
}

function endKnowledgePath() {
    knowledgePath = null;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Knowledge path not removed from storage:', e);
    }
    setPathUIVisible(false);
    deps.switchView('overview');
}

function nextPathStep() {
    if (!knowledgePath) return;
    if (knowledgePath.currentStep >= knowledgePath.path.length - 1) {
        showToast('Wissenspfad abgeschlossen');
        endKnowledgePath();
        return;
    }
    goToStep(knowledgePath.currentStep + 1);
}

function goToStep(index) {
    if (!knowledgePath || !Number.isInteger(index) || index < 0 || index >= knowledgePath.path.length) return;
    knowledgePath.currentStep = index;
    saveKnowledgePath();
    deps.switchView(knowledgePath.path[index].view);
    updateKnowledgePathUI();
}

function setPathUIVisible(visible) {
    document.getElementById('knowledge-path-bar')?.classList.toggle('hidden', !visible);
    document.getElementById('knowledge-path-nav')?.classList.toggle('hidden', !visible);
}

function updateKnowledgePathUI() {
    if (!knowledgePath) return;

    const questionText = document.getElementById('path-bar-question-text');
    if (questionText) {
        questionText.textContent = knowledgePath.question;
        questionText.title = knowledgePath.question;
    }

    // Steps up to the current one are buttons that jump back; later steps are reached with Weiter
    const stepsContainer = document.getElementById('path-bar-steps');
    if (stepsContainer) {
        // Re-rendering replaces the step buttons, so a focused step hands focus to the new current one
        const hadFocus = stepsContainer.contains(document.activeElement);
        stepsContainer.innerHTML = knowledgePath.path.map((step, i) => {
            const isActive = i === knowledgePath.currentStep;
            const isComplete = i < knowledgePath.currentStep;
            const reachable = i <= knowledgePath.currentStep;
            const arrow = i < knowledgePath.path.length - 1
                ? '<span class="path-bar-step-arrow" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>'
                : '';
            return `
                <button type="button" class="path-bar-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}"
                        data-step="${i}" title="${escapeHtml(step.action)}"
                        ${isActive ? 'aria-current="step"' : ''} ${reachable ? '' : 'disabled'}>
                    <span class="path-bar-step-num">${i + 1}</span>
                    <span class="path-bar-step-label">${escapeHtml(step.label)}</span>
                </button>
                ${arrow}
            `;
        }).join('');

        stepsContainer.querySelectorAll('.path-bar-step:not([disabled])').forEach(stepEl => {
            stepEl.addEventListener('click', () => goToStep(parseInt(stepEl.dataset.step, 10)));
        });
        if (hadFocus) stepsContainer.querySelector(`[data-step="${knowledgePath.currentStep}"]`)?.focus();
    }

    const actionText = document.getElementById('path-action-text');
    const currentStep = knowledgePath.path[knowledgePath.currentStep];
    if (actionText && currentStep) {
        actionText.textContent = currentStep.action || 'Erkunde diese Ansicht und fuege interessante Elemente zum Korb hinzu.';
    }

    updatePathNavigation();
    updateSidebarBasketUI();
}

function updatePathNavigation() {
    const backBtn = document.getElementById('path-nav-back');
    const nextBtn = document.getElementById('path-nav-next');
    const stepInfo = document.getElementById('path-nav-step');

    if (backBtn) backBtn.disabled = knowledgePath.currentStep === 0;
    if (nextBtn) {
        const isLastStep = knowledgePath.currentStep >= knowledgePath.path.length - 1;
        nextBtn.innerHTML = isLastStep
            ? 'Pfad abschliessen <i class="fas fa-check" aria-hidden="true"></i>'
            : 'Weiter im Pfad <i class="fas fa-arrow-right" aria-hidden="true"></i>';
    }
    if (stepInfo) {
        stepInfo.textContent = `Schritt ${knowledgePath.currentStep + 1} von ${knowledgePath.path.length}`;
    }
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
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i> Korb oeffnen
                </a>
            `;
        }
        container.innerHTML = html;
    }

    const pathBarCount = document.getElementById('path-bar-basket-count');
    if (pathBarCount) pathBarCount.textContent = counts.total;

    const badge = document.getElementById('basket-badge');
    if (badge) {
        badge.textContent = counts.total;
        badge.classList.toggle('has-items', counts.total > 0);
    }
}
