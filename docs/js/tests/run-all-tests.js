// Main Test Entry Point
// Registers and runs every test suite

import { runTests } from './test-runner.js';
import { CMIFParserTests } from './test-cmif-parser.js';
import { AggregationTests } from './test-aggregation.js';
import { FormattersTests } from './test-formatters.js';
import { StateManagerTests } from './test-state-manager.js';
import { DOMCacheTests } from './test-dom-cache.js';
import { SecurityTests } from './test-security.js';
import { BasketTests } from './test-basket.js';
import { ResearchPathTests } from './test-research-paths.js';

/**
 * Run all registered suites
 */
export async function runAllTests() {
    console.log('Starting CorrespExplorer Test Suite...\n');

    const suites = [
        // Business logic (CMIF data processing)
        CMIFParserTests,
        AggregationTests,
        FormattersTests,
        SecurityTests,
        ResearchPathTests,

        // Infrastructure (State Management)
        StateManagerTests,
        DOMCacheTests,
        BasketTests
    ];

    const results = await runTests(suites);

    // Results for programmatic callers such as the test page
    return results;
}

// test.html owns the single run trigger (Run button and ?test=true), so the suites never run
// twice against the shared state singleton
if (typeof window !== 'undefined') {
    window.runAllTests = runAllTests;
}
