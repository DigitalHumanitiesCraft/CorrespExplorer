// Demo Tour Module
// Interactive onboarding tour for CorrespExplorer Demo

let currentStep = 1;
const totalSteps = 9;
let tourActive = false;

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

    tourActive = true;
    currentStep = 1;
    tourElement.style.display = 'block';

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
        tourElement.style.display = 'none';
    }

    tourActive = false;

    // Remove any highlight classes
    document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
    });

    // Mark tour as completed
    sessionStorage.setItem('ce-demo-tour-completed', 'true');
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
    }

    // Update progress dots
    updateProgressDots(stepNumber);

    // Highlight target element if specified
    highlightTarget(stepNumber);

    currentStep = stepNumber;
}

/**
 * Add progress dots to tour content
 */
function addProgressDots() {
    document.querySelectorAll('.tour-content').forEach((content, index) => {
        // Remove existing progress if any
        const existing = content.querySelector('.tour-progress');
        if (existing) existing.remove();

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
        if (targetEl) {
            targetEl.classList.add('tour-highlight');

            // Scroll target into view if needed
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

/**
 * Setup event listeners for tour navigation
 */
function setupTourListeners() {
    const tourElement = document.getElementById('demo-tour');
    if (!tourElement) return;

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

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tourActive) {
            endTour();
        }
    });
}

/**
 * Manually trigger tour (for testing or restart)
 */
export function restartTour() {
    sessionStorage.removeItem('ce-demo-tour-completed');
    startTour();
}
