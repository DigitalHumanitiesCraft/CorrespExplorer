// Test Suite: Formatters
// Tests formatting functions with REAL data from cmif-parser

import { parseCMIF } from '../cmif-parser.js';
import { assert } from './test-runner.js';
import {
    formatSingleDate,
    formatDateWithPrecision,
    formatPersonName,
    formatPlaceName,
    getPersonInitials,
    getDatePrecisionClass,
    getPersonPrecisionClass,
    getPlacePrecisionClass,
    formatCountOf
} from '../formatters.js';

export const FormattersTests = {
    name: 'Formatters',

    setup() {
        // No setup needed
    },

    tests: [
        {
            name: 'formatCountOf: Gefilterter Anteil neben der Gesamtzahl, ungefiltert nur die Gesamtzahl',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const total = data.letters.length;
                const part = data.letters.filter(l => l.datePrecision === 'day').length;
                assert(part > 0 && part < total, 'Fixture sollte Briefe mit und ohne Tagesdatum enthalten');
                const filtered = formatCountOf(part, total);
                assert(filtered.value === String(part) && filtered.of === `von ${total}`, `Erhalten: ${JSON.stringify(filtered)}`);
                const all = formatCountOf(total, total);
                assert(all.value === String(total) && all.of === '', 'Ohne Filter nur die Gesamtzahl');
            }
        },
        {
            name: 'formatSingleDate: Formatiert YYYY',
            run() {
                const result = formatSingleDate('1920');
                assert(result === '1920', `Should return 1920, got ${result}`);
            }
        },

        {
            name: 'formatSingleDate: Formatiert YYYY-MM',
            run() {
                const result = formatSingleDate('1920-05');
                assert(result.includes('1920'), `Should include 1920, got ${result}`);
                assert(result.includes('Mai'), `Should include 'Mai', got ${result}`);
            }
        },

        {
            name: 'formatSingleDate: Formatiert YYYY-MM-DD',
            run() {
                const result = formatSingleDate('1920-05-15');
                assert(result === '15.5.1920', `Should return '15.5.1920', got ${result}`);
            }
        },

        {
            name: 'formatDateWithPrecision: Formatiert echte Briefe mit day precision',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const dayLetter = data.letters.find(l => l.datePrecision === 'day');

                assert(dayLetter, 'Should find letter with day precision');

                const result = formatDateWithPrecision(dayLetter);
                assert(result, 'Should return formatted date');
                assert(!result.includes('fas fa-calendar-alt'), `Day precision should not have icon, got ${result}`);
            }
        },

        {
            name: 'formatDateWithPrecision: Formatiert echte Briefe mit month precision',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const monthLetter = data.letters.find(l => l.datePrecision === 'month');

                assert(monthLetter, 'Should find letter with month precision');

                const result = formatDateWithPrecision(monthLetter);
                assert(result.includes('fas fa-calendar-alt'), `Month precision should have icon, got ${result}`);
            }
        },

        {
            name: 'formatDateWithPrecision: Formatiert echte Briefe mit year precision',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const yearLetter = data.letters.find(l => l.datePrecision === 'year');

                assert(yearLetter, 'Should find letter with year precision');

                const result = formatDateWithPrecision(yearLetter);
                assert(result.includes('fas fa-calendar-alt'), `Year precision should have icon, got ${result}`);
            }
        },

        {
            name: 'formatDateWithPrecision: Formatiert echte Briefe mit range',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const rangeLetter = data.letters.find(l => l.datePrecision === 'range');

                assert(rangeLetter, 'Should find letter with range precision');

                const result = formatDateWithPrecision(rangeLetter);
                assert(result.includes('–'), `Range should have separator, got ${result}`);
                assert(result.includes('fas fa-arrows-alt-h'), `Range should have range icon, got ${result}`);
            }
        },

        {
            name: 'formatPersonName: Formatiert identified person aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.sender?.precision === 'identified');

                assert(letter, 'Should find letter with identified sender');

                const result = formatPersonName(letter.sender.name, letter.sender.precision);
                assert(result === letter.sender.name, `Identified person should return plain name, got ${result}`);
                assert(!result.includes('span'), 'Identified person should not have span wrapper');
            }
        },

        {
            name: 'formatPersonName: Formatiert named person aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.sender?.precision === 'named');

                assert(letter, 'Should find letter with named sender');

                const result = formatPersonName(letter.sender.name, letter.sender.precision);
                assert(result.includes('person-named'), `Should have person-named class, got ${result}`);
            }
        },

        {
            name: 'formatPersonName: Formatiert unknown person aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.sender?.precision === 'unknown');

                assert(letter, 'Should find letter with unknown sender');

                const result = formatPersonName(letter.sender.name, letter.sender.precision);
                assert(result.includes('person-unknown'), `Should have person-unknown class, got ${result}`);
            }
        },

        {
            name: 'formatPlaceName: Formatiert exact place aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.place_sent?.precision === 'exact');

                assert(letter, 'Should find letter with exact place');

                const result = formatPlaceName(letter.place_sent.name, letter.place_sent.precision);
                assert(result === letter.place_sent.name, `Exact place should return plain name, got ${result}`);
            }
        },

        {
            name: 'formatPlaceName: Formatiert region place aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.place_sent?.precision === 'region');

                assert(letter, 'Should find letter with region place');

                const result = formatPlaceName(letter.place_sent.name, letter.place_sent.precision);
                assert(result.includes('place-region'), `Should have place-region class, got ${result}`);
                // A name without GeoNames id is no uncertain place: no "(Region)" suffix, the title says why it is off the map
                assert(!result.includes('(Region)') && result.includes('Ohne GeoNames-ID'), `Should stay unmarked with a title, got ${result}`);
                const inferred = formatPlaceName('Wien', 'region', true);
                assert(inferred.includes('[Wien]') && inferred.includes('place-inferred'), `Inferred place keeps the brackets, got ${inferred}`);
            }
        },

        {
            name: 'formatPlaceName: Formatiert unknown place aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.place_sent?.precision === 'unknown');

                if (letter) {
                    const result = formatPlaceName(letter.place_sent.name, letter.place_sent.precision);
                    assert(result.includes('place-unknown'), `Should have place-unknown class, got ${result}`);
                    assert(result.includes('fa-question-circle'), `Should have question icon, got ${result}`);
                } else {
                    console.warn('No unknown places in test data - skipping test');
                }
            }
        },

        {
            name: 'getPersonInitials: Extrahiert Initialen aus echten Personennamen',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.sender?.name);

                assert(letter, 'Should find letter with sender name');

                const result = getPersonInitials(letter.sender.name, letter.sender.precision);
                assert(result.length >= 1, `Should return at least 1 initial, got ${result}`);
                assert(result.length <= 2, `Should return at most 2 initials, got ${result}`);
            }
        },

        {
            name: 'getDatePrecisionClass: day precision hat keine Klasse',
            run() {
                const result = getDatePrecisionClass('day', 'high');
                assert(result === '', `Day precision should have no class, got '${result}'`);
            }
        },

        {
            name: 'getDatePrecisionClass: month precision hat date-imprecise',
            run() {
                const result = getDatePrecisionClass('month', 'high');
                assert(result === 'date-imprecise', `Should return 'date-imprecise', got '${result}'`);
            }
        },

        {
            name: 'getDatePrecisionClass: year precision hat date-imprecise',
            run() {
                const result = getDatePrecisionClass('year', 'high');
                assert(result === 'date-imprecise', `Should return 'date-imprecise', got '${result}'`);
            }
        },

        {
            name: 'getDatePrecisionClass: range precision hat date-range',
            run() {
                const result = getDatePrecisionClass('range', 'high');
                assert(result === 'date-range', `Should return 'date-range', got '${result}'`);
            }
        },

        {
            name: 'getDatePrecisionClass: low certainty fügt date-uncertain hinzu',
            run() {
                const result = getDatePrecisionClass('day', 'low');
                assert(result === 'date-uncertain', `Should return 'date-uncertain', got '${result}'`);
            }
        },

        {
            name: 'getPersonPrecisionClass: unknown person',
            run() {
                const result = getPersonPrecisionClass('unknown');
                assert(result === 'person-unknown', `Should return 'person-unknown', got '${result}'`);
            }
        },

        {
            name: 'getPersonPrecisionClass: partial person',
            run() {
                const result = getPersonPrecisionClass('partial');
                assert(result === 'person-partial', `Should return 'person-partial', got '${result}'`);
            }
        },

        {
            name: 'getPersonPrecisionClass: named person',
            run() {
                const result = getPersonPrecisionClass('named');
                assert(result === 'person-named', `Should return 'person-named', got '${result}'`);
            }
        },

        {
            name: 'getPersonPrecisionClass: identified person (no class)',
            run() {
                const result = getPersonPrecisionClass('identified');
                assert(result === '', `Should return empty string, got '${result}'`);
            }
        },

        {
            name: 'getPlacePrecisionClass: unknown place',
            run() {
                const result = getPlacePrecisionClass('unknown');
                assert(result === 'place-unknown', `Should return 'place-unknown', got '${result}'`);
            }
        },

        {
            name: 'getPlacePrecisionClass: region place',
            run() {
                const result = getPlacePrecisionClass('region');
                assert(result === 'place-region', `Should return 'place-region', got '${result}'`);
            }
        },

        {
            name: 'getPlacePrecisionClass: exact place (no class)',
            run() {
                const result = getPlacePrecisionClass('exact');
                assert(result === '', `Should return empty string, got '${result}'`);
            }
        }
    ]
};
