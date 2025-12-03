// Test Suite: State Manager
// Tests Filter-Logik mit REAL CMIF data

import { parseCMIF } from '../cmif-parser.js';
import { state } from '../state-manager.js';

export const StateManagerTests = {
    name: 'State Manager',

    setup() {
        // Reset state before each test
        state.data = {
            letters: [],
            indices: { persons: {}, places: {}, subjects: {}, languages: {} },
            meta: {},
            placeAggregation: {}
        };
        state.filters = {
            temporal: null,
            languages: [],
            person: null,
            subject: null,
            place: null,
            quality: { preciseDates: false, knownPersons: false, locatedPlaces: false }
        };
        state._filtersDirty = true;
    },

    tests: [
        {
            name: 'setData: Initialisiert Daten mit echten CMIF-Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                state.setData(data);

                assert(state.getAllLetters().length === data.letters.length, `Sollte ${data.letters.length} Briefe haben, hat ${state.getAllLetters().length}`);
                assert(state.getMeta().total_letters === data.letters.length, 'Meta sollte gesetzt sein');
                assert(Object.keys(state.getIndices().persons).length > 0, 'Personen-Index sollte gefüllt sein');
                assert(state._filtersDirty === true, 'Cache sollte dirty sein');
            }
        },

        {
            name: 'updateFilters: Temporal-Filter mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const years = data.letters.map(l => l.year).filter(y => y !== null);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                const midYear = Math.floor((minYear + maxYear) / 2);

                state.updateFilters({ temporal: { min: minYear, max: midYear } });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, `Sollte Briefe finden zwischen ${minYear} und ${midYear}`);
                assert(filtered.length < data.letters.length, 'Filter sollte Briefe ausschließen');
                filtered.forEach(letter => {
                    if (letter.year) {
                        assert(letter.year >= minYear && letter.year <= midYear,
                            `Brief-Jahr ${letter.year} sollte zwischen ${minYear} und ${midYear} liegen`);
                    }
                });
            }
        },

        {
            name: 'updateFilters: Language-Filter mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const langCodes = Object.keys(data.indices.languages);
                if (langCodes.length === 0) {
                    console.warn('No languages in test data - skipping test');
                    return;
                }

                const testLang = langCodes[0];
                state.updateFilters({ languages: [testLang] });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, `Sollte Briefe mit Sprache ${testLang} finden`);
                assert(filtered.every(l => l.language?.code === testLang), `Alle Briefe sollten Sprache ${testLang} haben`);
            }
        },

        {
            name: 'updateFilters: Person-Filter mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const personIds = Object.keys(data.indices.persons);
                assert(personIds.length > 0, 'Sollte Personen im Index haben');

                const testPersonId = personIds[0];
                const testPerson = data.indices.persons[testPersonId];

                state.updateFilters({ person: testPersonId });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, `Sollte Briefe für Person ${testPersonId} finden`);

                // Check that all filtered letters involve this person
                filtered.forEach(letter => {
                    const hasPerson = letter.sender?.id === testPersonId ||
                                     letter.recipient?.id === testPersonId ||
                                     letter.sender?.name === testPerson.name ||
                                     letter.recipient?.name === testPerson.name;
                    assert(hasPerson, `Brief ${letter.id} sollte Person ${testPersonId} enthalten`);
                });
            }
        },

        {
            name: 'updateFilters: Kombinierte Filter mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const years = data.letters.map(l => l.year).filter(y => y !== null);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);

                const langCodes = Object.keys(data.indices.languages);
                const personIds = Object.keys(data.indices.persons);

                if (langCodes.length === 0 || personIds.length === 0) {
                    console.warn('Insufficient data for combined filter test');
                    return;
                }

                const testLang = langCodes[0];
                const testPersonId = personIds[0];

                state.updateFilters({
                    temporal: { min: minYear, max: maxYear },
                    languages: [testLang],
                    person: testPersonId
                });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, 'Sollte Briefe mit kombinierten Filtern finden');

                // All filters must apply
                filtered.forEach(letter => {
                    if (letter.year) {
                        assert(letter.year >= minYear && letter.year <= maxYear, 'Jahr sollte im Bereich liegen');
                    }
                    assert(letter.language?.code === testLang, 'Sprache sollte passen');
                });
            }
        },

        {
            name: 'updateFilters: Quality-Filter - preciseDates mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                state.updateFilters({ quality: { preciseDates: true } });

                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, 'Sollte Briefe mit Tag-Präzision finden');

                filtered.forEach(letter => {
                    assert(letter.datePrecision === 'day',
                        `Brief ${letter.id} sollte day precision haben, hat ${letter.datePrecision}`);
                });
            }
        },

        {
            name: 'getFilteredLetters: Caching funktioniert mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const years = data.letters.map(l => l.year).filter(y => y !== null);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                const midYear = Math.floor((minYear + maxYear) / 2);

                state.updateFilters({ temporal: { min: minYear, max: midYear } });

                // Erster Aufruf
                const result1 = state.getFilteredLetters();

                // Zweiter Aufruf (should be cached - same reference)
                const result2 = state.getFilteredLetters();

                assert(result1.length === result2.length, 'Beide Aufrufe sollten gleich viele Briefe liefern');
                assert(result1 === result2, 'Zweiter Aufruf sollte gecachtes Array zurückgeben (same reference)');

                // Filter ändern sollte Cache invalidieren
                state.updateFilters({ temporal: { min: minYear, max: maxYear } });
                const result3 = state.getFilteredLetters();
                assert(result3 !== result1, 'Nach Filter-Änderung sollte neues Array erstellt werden');
                assert(result3.length >= result1.length, 'Erweiterter Filter sollte mindestens gleich viele Briefe liefern');
            }
        },

        {
            name: 'resetFilters: Setzt alle Filter zurück mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const years = data.letters.map(l => l.year).filter(y => y !== null);
                const langCodes = Object.keys(data.indices.languages);
                const personIds = Object.keys(data.indices.persons);

                // Set all filters
                state.updateFilters({
                    temporal: { min: Math.min(...years), max: Math.max(...years) },
                    languages: langCodes,
                    person: personIds[0],
                    quality: { preciseDates: true, knownPersons: true }
                });

                state.resetFilters();

                assert(state.filters.temporal === null, 'Temporal sollte null sein');
                assert(state.filters.languages.length === 0, 'Languages sollte leer sein');
                assert(state.filters.person === null, 'Person sollte null sein');
                assert(state.filters.subject === null, 'Subject sollte null sein');
                assert(state.filters.place === null, 'Place sollte null sein');
                assert(state.filters.quality.preciseDates === false, 'QualityFilter sollte zurückgesetzt sein');

                // After reset, should return all letters
                const allFiltered = state.getFilteredLetters();
                assert(allFiltered.length === data.letters.length, 'Nach Reset sollten alle Briefe zurückgegeben werden');
            }
        },

        {
            name: 'toURLParams: Exportiert State zu URL-Parametern mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const years = data.letters.map(l => l.year).filter(y => y !== null);
                const langCodes = Object.keys(data.indices.languages);
                const personIds = Object.keys(data.indices.persons);

                state.updateUI({ currentView: 'timeline' });
                state.updateFilters({
                    temporal: { min: Math.min(...years), max: Math.max(...years) },
                    languages: langCodes.slice(0, 2), // First 2 languages
                    person: personIds[0]
                });

                const params = state.toURLParams();

                assert(params.get('view') === 'timeline', 'View sollte gesetzt sein');
                assert(params.get('yearMin') === String(Math.min(...years)), `yearMin sollte ${Math.min(...years)} sein`);
                assert(params.get('yearMax') === String(Math.max(...years)), `yearMax sollte ${Math.max(...years)} sein`);

                if (langCodes.length > 0) {
                    const langsParam = params.get('langs');
                    assert(langsParam !== null, 'Sprachen-Parameter sollte gesetzt sein');
                }

                assert(params.get('person') === personIds[0], 'Person sollte gesetzt sein');
            }
        },

        {
            name: 'fromURLParams: Importiert State aus URL-Parametern mit echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const years = data.letters.map(l => l.year).filter(y => y !== null);
                const langCodes = Object.keys(data.indices.languages);
                const personIds = Object.keys(data.indices.persons);

                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);

                const params = new URLSearchParams();
                params.set('view', 'letters');
                params.set('yearMin', String(minYear));
                params.set('yearMax', String(maxYear));

                if (langCodes.length > 0) {
                    params.set('langs', langCodes.slice(0, 2).join(','));
                }

                if (personIds.length > 0) {
                    params.set('person', personIds[0]);
                }

                state.fromURLParams(params);

                assert(state.ui.currentView === 'letters', 'View sollte gesetzt sein');
                assert(state.filters.temporal.min === minYear, `yearMin sollte ${minYear} sein`);
                assert(state.filters.temporal.max === maxYear, `yearMax sollte ${maxYear} sein`);

                if (langCodes.length > 0) {
                    assert(state.filters.languages.length > 0, 'Languages sollten importiert sein');
                }

                if (personIds.length > 0) {
                    assert(state.filters.person === personIds[0], 'Person sollte importiert sein');
                }
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
