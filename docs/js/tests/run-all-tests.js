// Main Test Entry Point
// Führt alle Test-Suites aus

import { runTests } from './test-runner.js';
import { CMIFParserTests } from './test-cmif-parser.js';
import { AggregationTests } from './test-aggregation.js';
import { FormattersTests } from './test-formatters.js';
import { StateManagerTests } from './test-state-manager.js';
import { DOMCacheTests } from './test-dom-cache.js';

/**
 * Führe alle Tests aus
 */
export async function runAllTests() {
    console.log('Starting CorrespExplorer Test Suite...\n');

    const suites = [
        // Business Logic (CMIF-Datenverarbeitung)
        CMIFParserTests,
        AggregationTests,
        FormattersTests,

        // Infrastructure (State Management)
        StateManagerTests,
        DOMCacheTests
    ];

    const results = await runTests(suites);

    // Return results für programmatischen Zugriff
    return results;
}

// Auto-run wenn als Modul geladen
if (typeof window !== 'undefined') {
    window.runAllTests = runAllTests;

    // Auto-run wenn ?test=true in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'true') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => runAllTests(), 500);
            });
        } else {
            setTimeout(() => runAllTests(), 500);
        }
    }
}
