// Demo Tour Module
// Interactive onboarding tour for CorrespExplorer Demo. The tour is a modal dialog: focus moves
// to the primary button of each step, Tab stays inside the step, Escape ends the tour and focus
// returns to where it was before.

import { trapTabKey } from './utils.js';

let currentStep = 1;
const totalSteps = 12;
let tourActive = false;
let returnFocus = null;
let switchView = null;

/**
 * Hand the tour the view switch of explore.js; steps with data-view open their view first,
 * because sidebar sections are hidden on the overview
 * @param {{switchView: function(string): void}} deps
 */
export function initDemoTour(deps) {
    switchView = deps.switchView;
}

/**
 * Check if this is a demo dataset and show tour
 */
export function checkAndStartDemoTour() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDemo = urlParams.get('demo') === 'true';

    // Check if tour was already completed
    const tourCompleted = sessionStorage.getItem('ce-demo-tour-completed');

    if (isDemo && !tourCompleted) {
        // Small delay to let the page render
        setTimeout(() => {
            startTour();
        }, 1500);
    }
}

/**
 * Start the demo tour
 */
export function startTour() {
    const tourElement = document.getElementById('demo-tour');
    if (!tourElement) return;

    if (!tourActive) returnFocus = document.activeElement;
    tourActive = true;
    currentStep = 1;
    tourElement.classList.remove('hidden');

    // Add progress dots to each step
    addProgressDots();

    // Show first step
    showStep(1);

    // Setup event listeners
    setupTourListeners();
}

/**
 * End the tour
 */
function endTour() {
    const tourElement = document.getElementById('demo-tour');
    if (tourElement) {
        tourElement.classList.add('hidden');
    }

    tourActive = false;

    // Remove any highlight classes
    document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
    });

    // Mark tour as completed; blocked storage only means the tour may start again
    try {
        sessionStorage.setItem('ce-demo-tour-completed', 'true');
    } catch {
        // Nothing to keep
    }

    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
}

/**
 * Show a specific step
 */
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.tour-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show current step
    const currentStepEl = document.querySelector(`.tour-step[data-step="${stepNumber}"]`);
    if (currentStepEl) {
        currentStepEl.classList.add('active');
        if (currentStepEl.dataset.view && switchView) switchView(currentStepEl.dataset.view);
    }

    // Update progress dots
    updateProgressDots(stepNumber);

    // Highlight target element if specified
    highlightTarget(stepNumber);

    currentStep = stepNumber;

    // The previous step's button is hidden now, so focus moves to the primary button of this one
    currentStepEl?.querySelector('.tour-next, .tour-finish')?.focus();
}

/**
 * Add progress dots to tour content
 */
function addProgressDots() {
    document.querySelectorAll('.tour-content').forEach((content, index) => {
        // A restart from the tutorial button calls this again, so drop the previous counter and dots
        content.querySelectorAll('.tour-progress, .tour-step-counter').forEach(el => el.remove());

        // Add step counter
        const counter = document.createElement('div');
        counter.className = 'tour-step-counter';
        counter.textContent = `Schritt ${index + 1} von ${totalSteps}`;
        content.insertBefore(counter, content.firstChild);

        // Add progress dots
        const progress = document.createElement('div');
        progress.className = 'tour-progress';

        for (let i = 1; i <= totalSteps; i++) {
            const dot = document.createElement('span');
            dot.className = 'tour-progress-dot';
            dot.dataset.step = i;
            progress.appendChild(dot);
        }

        content.appendChild(progress);
    });
}

/**
 * Update progress dots
 */
function updateProgressDots(currentStep) {
    document.querySelectorAll('.tour-progress-dot').forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'completed');

        if (dotStep === currentStep) {
            dot.classList.add('active');
        } else if (dotStep < currentStep) {
            dot.classList.add('completed');
        }
    });
}

/**
 * Highlight target element
 */
function highlightTarget(stepNumber) {
    // Remove existing highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
    });

    const stepEl = document.querySelector(`.tour-step[data-step="${stepNumber}"]`);
    if (!stepEl) return;

    const content = stepEl.querySelector('.tour-content');
    const targetSelector = content?.dataset?.target;

    if (targetSelector) {
        const targetEl = document.querySelector(targetSelector);
        // A hidden target (off-canvas sidebar on narrow screens) gets no spotlight
        if (targetEl && isOnScreen(targetEl)) {
            targetEl.classList.add('tour-highlight');

            // Scroll target into view if needed
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function isOnScreen(el) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth;
}

/**
 * Setup event listeners for tour navigation
 */
// startTour can run again from the tutorial button; the delegated listeners are bound once
let tourListenersBound = false;

function setupTourListeners() {
    const tourElement = document.getElementById('demo-tour');
    if (!tourElement || tourListenersBound) return;
    tourListenersBound = true;

    // Use event delegation
    tourElement.addEventListener('click', (e) => {
        const target = e.target;

        if (target.classList.contains('tour-next')) {
            if (currentStep < totalSteps) {
                showStep(currentStep + 1);
            }
        } else if (target.classList.contains('tour-prev')) {
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        } else if (target.classList.contains('tour-skip') || target.classList.contains('tour-finish')) {
            endTour();
        }
    });

    // Escape ends the tour, Tab stays inside the active step
    document.addEventListener('keydown', (e) => {
        if (!tourActive) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            endTour();
        } else if (e.key === 'Tab') {
            const stepEl = document.querySelector(`.tour-step[data-step="${currentStep}"]`);
            if (stepEl) trapTabKey(e, stepEl);
        }
    });
}
