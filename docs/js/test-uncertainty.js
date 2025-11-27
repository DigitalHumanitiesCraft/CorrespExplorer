// Test script for uncertainty detection in CMIF parser
// Run in browser console after loading explore.html with test-uncertainty.xml
// Or use: parseCMIF('data/test-uncertainty.xml').then(r => testUncertainty(r))

export function testUncertainty(data) {
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    function test(name, condition, details = '') {
        const passed = Boolean(condition);
        results.tests.push({ name, passed, details });
        if (passed) {
            results.passed++;
            console.log(`✓ ${name}`);
        } else {
            results.failed++;
            console.error(`✗ ${name}`, details);
        }
        return passed;
    }

    console.log('=== Testing Uncertainty Detection ===\n');

    // Find letters by ID for testing
    const findLetter = (id) => data.letters.find(l => l.id === id || l.id.endsWith(id));

    // Test 1: Complete data baseline
    const letter001 = findLetter('test-001');
    test('Case 001: Day precision detected',
        letter001?.datePrecision === 'day',
        `Got: ${letter001?.datePrecision}`);
    test('Case 001: Sender identified',
        letter001?.sender?.precision === 'identified',
        `Got: ${letter001?.sender?.precision}`);
    test('Case 001: Place exact',
        letter001?.place_sent?.precision === 'exact',
        `Got: ${letter001?.place_sent?.precision}`);

    // Test 2: Year-month date
    const letter002 = findLetter('test-002');
    test('Case 002: Month precision detected',
        letter002?.datePrecision === 'month',
        `Got: ${letter002?.datePrecision}`);

    // Test 3: Year-only date
    const letter003 = findLetter('test-003');
    test('Case 003: Year precision detected',
        letter003?.datePrecision === 'year',
        `Got: ${letter003?.datePrecision}`);

    // Test 4: Date range with from/to
    const letter004 = findLetter('test-004');
    test('Case 004: Range precision detected',
        letter004?.datePrecision === 'range',
        `Got: ${letter004?.datePrecision}`);
    test('Case 004: dateTo populated',
        letter004?.dateTo !== null,
        `Got: ${letter004?.dateTo}`);

    // Test 5: notBefore/notAfter
    const letter005 = findLetter('test-005');
    test('Case 005: Range precision for notBefore/notAfter',
        letter005?.datePrecision === 'range',
        `Got: ${letter005?.datePrecision}`);

    // Test 6: cert="low"
    const letter006 = findLetter('test-006');
    test('Case 006: Low certainty detected',
        letter006?.dateCertainty === 'low',
        `Got: ${letter006?.dateCertainty}`);

    // Test 7: No date
    const letter007 = findLetter('test-007');
    test('Case 007: Unknown precision for missing date',
        letter007?.datePrecision === 'unknown',
        `Got: ${letter007?.datePrecision}`);

    // Test 8: Unknown sender [NN]
    const letter008 = findLetter('test-008');
    test('Case 008: Unknown sender [NN] detected',
        letter008?.sender?.precision === 'unknown',
        `Got: ${letter008?.sender?.precision}`);

    // Test 9: Unknown sender "Unbekannt"
    const letter009 = findLetter('test-009');
    test('Case 009: Unknown sender Unbekannt detected',
        letter009?.sender?.precision === 'unknown',
        `Got: ${letter009?.sender?.precision}`);

    // Test 10: Partial name
    const letter010 = findLetter('test-010');
    test('Case 010: Partial name detected',
        letter010?.sender?.precision === 'partial',
        `Got: ${letter010?.sender?.precision}`);

    // Test 11: Unknown recipient
    const letter011 = findLetter('test-011');
    test('Case 011: Unknown recipient detected',
        letter011?.recipient?.precision === 'unknown',
        `Got: ${letter011?.recipient?.precision}`);

    // Test 12: Unknown place
    const letter012 = findLetter('test-012');
    test('Case 012: Unknown place detected',
        letter012?.place_sent?.precision === 'unknown',
        `Got: ${letter012?.place_sent?.precision}`);

    // Test 13: Region without GeoNames
    const letter013 = findLetter('test-013');
    test('Case 013: Region precision for place without GeoNames',
        letter013?.place_sent?.precision === 'region',
        `Got: ${letter013?.place_sent?.precision}`);

    // Test 14: Country only
    const letter014 = findLetter('test-014');
    test('Case 014: Region precision for country',
        letter014?.place_sent?.precision === 'region',
        `Got: ${letter014?.place_sent?.precision}`);

    // Test 15: No place
    const letter015 = findLetter('test-015');
    test('Case 015: Null place_sent for missing place',
        letter015?.place_sent === null,
        `Got: ${JSON.stringify(letter015?.place_sent)}`);

    // Test 16: Person without authority
    const letter016 = findLetter('test-016');
    test('Case 016: Named precision for person without authority',
        letter016?.sender?.precision === 'named',
        `Got: ${letter016?.sender?.precision}`);

    // Test 17: Multiple uncertainties
    const letter017 = findLetter('test-017');
    test('Case 017: All uncertainties detected',
        letter017?.datePrecision === 'year' &&
        letter017?.sender?.precision === 'unknown' &&
        letter017?.recipient?.precision === 'unknown' &&
        letter017?.place_sent?.precision === 'unknown',
        `Date: ${letter017?.datePrecision}, Sender: ${letter017?.sender?.precision}, Recipient: ${letter017?.recipient?.precision}, Place: ${letter017?.place_sent?.precision}`);

    // Test 18: Organization sender
    const letter018 = findLetter('test-018');
    test('Case 018: Organization detected',
        letter018?.sender?.isOrganization === true,
        `Got isOrganization: ${letter018?.sender?.isOrganization}`);

    // Test metadata uncertainty stats
    console.log('\n=== Testing Metadata Statistics ===\n');

    const uncertainty = data.meta?.uncertainty;
    test('Meta: Uncertainty stats present',
        uncertainty !== undefined && uncertainty !== null,
        `Got: ${typeof uncertainty}`);

    if (uncertainty) {
        test('Meta: Date stats present',
            uncertainty.dates !== undefined,
            `Got: ${JSON.stringify(uncertainty.dates)}`);
        test('Meta: Sender stats present',
            uncertainty.senders !== undefined,
            `Got: ${JSON.stringify(uncertainty.senders)}`);
        test('Meta: Place stats present',
            uncertainty.places !== undefined,
            `Got: ${JSON.stringify(uncertainty.places)}`);

        // Check specific counts (18 test cases)
        test('Meta: 18 letters parsed',
            data.letters.length === 18,
            `Got: ${data.letters.length}`);
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Passed: ${results.passed}/${results.passed + results.failed}`);
    console.log(`Failed: ${results.failed}`);

    if (results.failed > 0) {
        console.log('\nFailed tests:');
        results.tests.filter(t => !t.passed).forEach(t => {
            console.log(`  - ${t.name}: ${t.details}`);
        });
    }

    return results;
}

// Export for use as module
export default testUncertainty;
