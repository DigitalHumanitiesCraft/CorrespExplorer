// Quick test to verify parseCMIF works in Node.js environment
import { parseCMIF } from './docs/js/cmif-parser.js';

console.log('Starting quick test...');

try {
    const data = await parseCMIF('docs/data/test-uncertainty.xml');
    console.log(`✓ Successfully parsed ${data.letters.length} letters`);
    console.log(`✓ Has indices:`, Object.keys(data.indices));
    console.log(`✓ Has meta:`, Object.keys(data.meta));

    // Check date precision
    const dayLetters = data.letters.filter(l => l.datePrecision === 'day');
    console.log(`✓ Found ${dayLetters.length} letters with day precision`);

    const monthLetters = data.letters.filter(l => l.datePrecision === 'month');
    console.log(`✓ Found ${monthLetters.length} letters with month precision`);

    console.log('\nAll basic checks passed!');
} catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
}
