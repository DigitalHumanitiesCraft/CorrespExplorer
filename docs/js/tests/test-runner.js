// Compact Test Runner für CorrespExplorer
// Fokussiert, klar, ohne Dependencies

export class TestRunner {
    constructor() {
        this.suites = [];
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
        };
    }

    /**
     * Registriere Test-Suite
     * @param {Object} suite - { name, setup?, teardown?, tests: [...] }
     */
    addSuite(suite) {
        this.suites.push(suite);
    }

    /**
     * Führe alle registrierten Test-Suites aus
     */
    async runAll() {
        console.log('='.repeat(60));
        console.log('CorrespExplorer Test Suite');
        console.log('='.repeat(60));

        const startTime = performance.now();

        for (const suite of this.suites) {
            await this.runSuite(suite);
        }

        this.results.duration = performance.now() - startTime;
        this.printReport();
    }

    /**
     * Führe eine Test-Suite aus
     */
    async runSuite(suite) {
        console.log(`\n--- ${suite.name} ---`);

        for (const test of suite.tests) {
            this.results.total++;

            try {
                // Setup
                if (suite.setup) {
                    await suite.setup();
                }

                // Run test
                await test.run();

                // Teardown
                if (suite.teardown) {
                    await suite.teardown();
                }

                this.results.passed++;
                console.log(`  ✓ ${test.name}`);

            } catch (error) {
                this.results.failed++;
                console.error(`  ✗ ${test.name}`);
                console.error(`    ${error.message}`);
                if (error.stack) {
                    console.error(`    ${error.stack.split('\n')[1]}`);
                }
            }
        }
    }

    /**
     * Drucke Test-Report
     */
    printReport() {
        console.log('\n' + '='.repeat(60));

        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`Ergebnis: ${this.results.passed}/${this.results.total} Tests bestanden (${passRate}%)`);
        console.log(`Dauer: ${this.results.duration.toFixed(2)}ms`);

        if (this.results.failed > 0) {
            console.log(`\nFehlgeschlagen: ${this.results.failed}`);
        }

        console.log('='.repeat(60));

        // Visual Banner (nur im Browser)
        if (typeof document !== 'undefined') {
            this.showVisualFeedback();
        }
    }

    /**
     * Zeige visuelles Feedback im Browser
     */
    showVisualFeedback() {
        const banner = document.createElement('div');
        const success = this.results.failed === 0;

        banner.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            z-index: 999999;
            background: ${success ? '#16a34a' : '#dc2626'};
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;

        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">${success ? '✓' : '✗'}</span>
                <div>
                    <div>Tests: ${this.results.passed}/${this.results.total}</div>
                    <div style="font-size: 12px; opacity: 0.9;">${this.results.duration.toFixed(0)}ms</div>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Auto-remove nach 5 Sekunden
        setTimeout(() => {
            banner.style.transition = 'opacity 0.3s';
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 300);
        }, 5000);

        // Klick zum Schließen
        banner.addEventListener('click', () => banner.remove());
    }
}

/**
 * Convenience function für schnelle Test-Ausführung
 * Usage: import { runTests } from './test-runner.js'
 */
export async function runTests(suites) {
    const runner = new TestRunner();
    suites.forEach(suite => runner.addSuite(suite));
    await runner.runAll();
    return runner.results;
}

/**
 * Inline Test-Helpers
 */
export const assert = {
    true(condition, message) {
        if (!condition) {
            throw new Error(message || 'Expected true, got false');
        }
    },

    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    },

    notEqual(actual, unexpected, message) {
        if (actual === unexpected) {
            throw new Error(message || `Expected not ${unexpected}, got ${actual}`);
        }
    },

    arrayLength(arr, length, message) {
        if (arr.length !== length) {
            throw new Error(message || `Expected length ${length}, got ${arr.length}`);
        }
    },

    includes(arr, value, message) {
        if (!arr.includes(value)) {
            throw new Error(message || `Expected array to include ${value}`);
        }
    },

    throws(fn, message) {
        try {
            fn();
            throw new Error(message || 'Expected function to throw');
        } catch (error) {
            if (error.message === message || error.message === 'Expected function to throw') {
                throw error;
            }
            // Function threw as expected
        }
    },

    async(fn, message) {
        if (typeof fn !== 'function' || fn.constructor.name !== 'AsyncFunction') {
            throw new Error(message || 'Expected async function');
        }
    }
};
