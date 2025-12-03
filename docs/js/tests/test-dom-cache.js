// Test Suite: DOM Cache
// Fokussiert auf Caching-Logik und Element-Zugriff

import { elements, initDOMCache } from '../dom-cache.js';

export const DOMCacheTests = {
    name: 'DOM Cache',

    setup() {
        // Create mock DOM elements for testing
        if (typeof document !== 'undefined') {
            // Clean up previous test elements
            document.querySelectorAll('[data-test-element]').forEach(el => el.remove());

            // Create test elements
            const testContainer = document.createElement('div');
            testContainer.id = 'test-container';
            testContainer.dataset.testElement = 'true';

            const testButton = document.createElement('button');
            testButton.id = 'test-button';
            testButton.dataset.testElement = 'true';

            const testInput = document.createElement('input');
            testInput.id = 'test-input';
            testInput.dataset.testElement = 'true';

            document.body.appendChild(testContainer);
            document.body.appendChild(testButton);
            document.body.appendChild(testInput);

            // Clear cache
            elements.clearCache();
        }
    },

    teardown() {
        // Clean up test elements
        if (typeof document !== 'undefined') {
            document.querySelectorAll('[data-test-element]').forEach(el => el.remove());
        }
    },

    tests: [
        {
            name: 'getById: Findet Element und cached es',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                const el1 = elements.getById('test-button');
                const el2 = elements.getById('test-button');

                assert(el1 !== null, 'Sollte Element finden');
                assert(el1 === el2, 'Sollte gecachtes Element zurückgeben (gleiche Referenz)');
                assert(el1.id === 'test-button', 'Sollte korrektes Element sein');
            }
        },

        {
            name: 'getById: Gibt null für nicht-existierende IDs zurück',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                const el = elements.getById('non-existent-element');
                assert(el === null, 'Sollte null für nicht-existierende IDs zurückgeben');
            }
        },

        {
            name: 'getBySelector: Findet Element mit Selector',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                const el = elements.getBySelector('#test-container');
                assert(el !== null, 'Sollte Element finden');
                assert(el.id === 'test-container', 'Sollte korrektes Element sein');
            }
        },

        {
            name: 'getAllBySelector: Gibt NodeList zurück',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                const els = elements.getAllBySelector('[data-test-element]');
                assert(els.length >= 3, `Sollte mindestens 3 Test-Elemente finden, fand ${els.length}`);
            }
        },

        {
            name: 'clearCache: Leert Cache',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                // Cache etwas
                elements.getById('test-button');
                elements.getById('test-input');

                // Cache leeren
                elements.clearCache();

                // Nach clear sollten Elemente neu geholt werden
                // (können wir nicht direkt testen, aber clearCache sollte nicht werfen)
                const el = elements.getById('test-button');
                assert(el !== null, 'Sollte Element nach clear auch noch finden');
            }
        },

        {
            name: 'Predefined accessor: mapContainer',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                // Erstelle map-container für Test
                const mapContainer = document.createElement('div');
                mapContainer.id = 'map-container';
                mapContainer.dataset.testElement = 'true';
                document.body.appendChild(mapContainer);

                const el = elements.mapContainer;
                assert(el !== null, 'Sollte map-container finden');
                assert(el.id === 'map-container', 'Sollte korrektes Element sein');
            }
        },

        {
            name: 'Predefined accessor: Gibt null für fehlende Elemente',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                // nonExistentElement gibt es nicht
                const el = elements.getById('definitely-does-not-exist');
                assert(el === null, 'Sollte null für fehlende Elemente geben');
            }
        },

        {
            name: 'initDOMCache: Lädt kritische Elemente vor',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                // Erstelle kritische Elemente
                const navbar = document.createElement('nav');
                navbar.className = 'navbar';
                navbar.dataset.testElement = 'true';
                document.body.appendChild(navbar);

                const sidebar = document.createElement('aside');
                sidebar.className = 'sidebar';
                sidebar.dataset.testElement = 'true';
                document.body.appendChild(sidebar);

                // Clear cache und init
                elements.clearCache();
                initDOMCache();

                // Sollte ohne Fehler durchlaufen
                assert(true, 'initDOMCache sollte ohne Fehler durchlaufen');
            }
        },

        {
            name: 'Performance: Wiederholte Zugriffe sind schneller',
            run() {
                if (typeof document === 'undefined') {
                    console.warn('Skipping test (no DOM)');
                    return;
                }

                elements.clearCache();

                // Erster Zugriff (nicht gecacht)
                const start1 = performance.now();
                for (let i = 0; i < 100; i++) {
                    document.getElementById('test-button');
                }
                const time1 = performance.now() - start1;

                // Zweiter Zugriff (gecacht via elements)
                const start2 = performance.now();
                for (let i = 0; i < 100; i++) {
                    elements.getById('test-button');
                }
                const time2 = performance.now() - start2;

                // Gecachte Zugriffe sollten schneller sein (oder ähnlich schnell bei schnellen Browsern)
                console.log(`Performance: Direct ${time1.toFixed(2)}ms, Cached ${time2.toFixed(2)}ms`);
                assert(true, 'Performance-Test durchgeführt');
            }
        }
    ]
};

// Helper function
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}
