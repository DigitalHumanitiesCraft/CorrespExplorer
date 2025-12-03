// Test Suite: Data Aggregation
// Tests aggregation logic with REAL CMIF data
// NOTE: Since aggregation functions are not exported from explore.js,
// these tests verify the aggregation results work correctly with real data

import { parseCMIF } from '../cmif-parser.js';
import { state } from '../state-manager.js';

export const AggregationTests = {
    name: 'Data Aggregation',

    setup() {
        // No setup needed
    },

    tests: [
        {
            name: 'parseCMIF: Erstellt indices.persons aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.indices.persons, 'Should have persons index');
                const personIds = Object.keys(data.indices.persons);
                assert(personIds.length > 0, `Persons index should have entries, got ${personIds.length}`);

                const firstPerson = data.indices.persons[personIds[0]];
                assert(firstPerson.name, 'Person should have name');
                assert(typeof firstPerson.letter_count === 'number', 'Person should have letter_count');
                assert(firstPerson.letter_count > 0, 'Person should have at least 1 letter');
            }
        },

        {
            name: 'parseCMIF: Erstellt indices.places aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.indices.places, 'Should have places index');
                const placeIds = Object.keys(data.indices.places);
                assert(placeIds.length > 0, `Places index should have entries, got ${placeIds.length}`);

                const firstPlace = data.indices.places[placeIds[0]];
                assert(firstPlace.name, 'Place should have name');
            }
        },

        {
            name: 'parseCMIF: Erstellt indices.subjects aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.indices.subjects, 'Should have subjects index');
                // Subjects können leer sein wenn keine mentions vorhanden sind
                console.log(`Found ${Object.keys(data.indices.subjects).length} subjects in test data`);
            }
        },

        {
            name: 'parseCMIF: Erstellt indices.languages aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.indices.languages, 'Should have languages index');
                const langCodes = Object.keys(data.indices.languages);

                if (langCodes.length > 0) {
                    const firstLang = data.indices.languages[langCodes[0]];
                    assert(firstLang.code, 'Language should have code');
                    assert(firstLang.label, 'Language should have label');
                } else {
                    console.warn('No languages found in test data');
                }
            }
        },

        {
            name: 'State-Manager: setData mit echten CMIF-Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                state.setData(data);

                const allLetters = state.getAllLetters();
                assert(allLetters.length === data.letters.length, `Should have ${data.letters.length} letters, got ${allLetters.length}`);

                const indices = state.getIndices();
                assert(indices.persons, 'State should have persons index');
                assert(indices.places, 'State should have places index');
            }
        },

        {
            name: 'State-Manager: Filter by language mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const langCodes = Object.keys(data.indices.languages);
                if (langCodes.length === 0) {
                    console.warn('No languages in test data - skipping language filter test');
                    return;
                }

                const testLang = langCodes[0];
                state.updateFilters({ languages: [testLang] });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, `Should find letters with language ${testLang}`);
                assert(filtered.every(l => l.language?.code === testLang), `All letters should have language ${testLang}`);
            }
        },

        {
            name: 'State-Manager: Filter by person mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const personIds = Object.keys(data.indices.persons);
                assert(personIds.length > 0, 'Should have persons to test');

                const testPersonId = personIds[0];
                state.updateFilters({ person: testPersonId });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, `Should find letters for person ${testPersonId}`);

                const person = data.indices.persons[testPersonId];
                filtered.forEach(letter => {
                    const hasPerson = letter.sender?.id === testPersonId ||
                                     letter.recipient?.id === testPersonId ||
                                     letter.sender?.name === person.name ||
                                     letter.recipient?.name === person.name;
                    assert(hasPerson, `Letter ${letter.id} should involve person ${testPersonId}`);
                });
            }
        },

        {
            name: 'State-Manager: Filter by temporal range mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const years = data.letters.map(l => l.year).filter(y => y !== null);
                if (years.length === 0) {
                    console.warn('No years in test data - skipping temporal filter test');
                    return;
                }

                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                const midYear = Math.floor((minYear + maxYear) / 2);

                state.updateFilters({ temporal: { min: minYear, max: midYear } });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, `Should find letters between ${minYear} and ${midYear}`);

                filtered.forEach(letter => {
                    if (letter.year) {
                        assert(letter.year >= minYear && letter.year <= midYear,
                            `Letter year ${letter.year} should be between ${minYear} and ${midYear}`);
                    }
                });
            }
        },

        {
            name: 'State-Manager: Quality filter (preciseDates) mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                state.updateFilters({ quality: { preciseDates: true } });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, 'Should find letters with precise dates');

                filtered.forEach(letter => {
                    assert(letter.datePrecision === 'day',
                        `Letter ${letter.id} should have day precision, got ${letter.datePrecision}`);
                });
            }
        },

        {
            name: 'parseCMIF: Meta enthält uncertainty statistics',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.meta.uncertainty, 'Should have uncertainty stats');
                assert(data.meta.uncertainty.dates, 'Should have date uncertainty stats');
                assert(data.meta.uncertainty.senders, 'Should have sender uncertainty stats');
                assert(data.meta.uncertainty.recipients, 'Should have recipient uncertainty stats');
                assert(data.meta.uncertainty.places, 'Should have place uncertainty stats');

                console.log('Uncertainty stats:', JSON.stringify(data.meta.uncertainty, null, 2));
            }
        },

        {
            name: 'parseCMIF: Zählt Briefe pro Präzisions-Level',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                const datePrecisions = {};
                data.letters.forEach(l => {
                    datePrecisions[l.datePrecision] = (datePrecisions[l.datePrecision] || 0) + 1;
                });

                console.log('Date precisions:', datePrecisions);
                assert(Object.keys(datePrecisions).length > 0, 'Should have date precision distribution');
            }
        }
    ]
};

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}
