// Test Suite: State Manager
// Fokussiert auf kritische State-Verwaltungsfunktionen

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
            name: 'setData: Initialisiert Daten korrekt',
            run() {
                const testData = {
                    letters: [
                        { id: '1', year: 1900 },
                        { id: '2', year: 1910 }
                    ],
                    indices: { persons: { '123': { name: 'Test' } } },
                    meta: { total_letters: 2 }
                };

                state.setData(testData);

                assert(state.getAllLetters().length === 2, 'Sollte 2 Briefe haben');
                assert(state.getMeta().total_letters === 2, 'Meta sollte gesetzt sein');
                assert(state._filtersDirty === true, 'Cache sollte dirty sein');
            }
        },

        {
            name: 'updateFilters: Temporal-Filter',
            run() {
                state.setData({
                    letters: [
                        { id: '1', year: 1900 },
                        { id: '2', year: 1920 },
                        { id: '3', year: 1950 }
                    ]
                });

                state.updateFilters({ temporal: { min: 1910, max: 1940 } });

                const filtered = state.getFilteredLetters();
                assert(filtered.length === 1, `Sollte 1 Brief finden, fand ${filtered.length}`);
                assert(filtered[0].year === 1920, 'Sollte Brief von 1920 sein');
            }
        },

        {
            name: 'updateFilters: Language-Filter',
            run() {
                state.setData({
                    letters: [
                        { id: '1', language: { code: 'de' } },
                        { id: '2', language: { code: 'fr' } },
                        { id: '3', language: { code: 'de' } },
                        { id: '4', language: null }
                    ]
                });

                state.updateFilters({ languages: ['de'] });

                const filtered = state.getFilteredLetters();
                assert(filtered.length === 2, `Sollte 2 deutsche Briefe finden, fand ${filtered.length}`);
                assert(filtered.every(l => l.language?.code === 'de'), 'Alle sollten deutsch sein');
            }
        },

        {
            name: 'updateFilters: Person-Filter',
            run() {
                state.setData({
                    letters: [
                        { id: '1', sender: { id: 'A' }, recipient: { id: 'B' } },
                        { id: '2', sender: { id: 'B' }, recipient: { id: 'C' } },
                        { id: '3', sender: { id: 'C' }, recipient: { id: 'B' } }
                    ]
                });

                state.updateFilters({ person: 'B' });

                const filtered = state.getFilteredLetters();
                assert(filtered.length === 3, `Sollte 3 Briefe mit B finden, fand ${filtered.length}`);
            }
        },

        {
            name: 'updateFilters: Kombinierte Filter',
            run() {
                state.setData({
                    letters: [
                        { id: '1', year: 1920, language: { code: 'de' }, sender: { id: 'A' } },
                        { id: '2', year: 1920, language: { code: 'fr' }, sender: { id: 'A' } },
                        { id: '3', year: 1950, language: { code: 'de' }, sender: { id: 'A' } },
                        { id: '4', year: 1920, language: { code: 'de' }, sender: { id: 'B' } }
                    ]
                });

                state.updateFilters({
                    temporal: { min: 1910, max: 1930 },
                    languages: ['de'],
                    person: 'A'
                });

                const filtered = state.getFilteredLetters();
                assert(filtered.length === 1, `Sollte 1 Brief finden, fand ${filtered.length}`);
                assert(filtered[0].id === '1', 'Sollte Brief 1 sein');
            }
        },

        {
            name: 'updateFilters: Quality-Filter - preciseDates',
            run() {
                state.setData({
                    letters: [
                        { id: '1', datePrecision: 'day' },
                        { id: '2', datePrecision: 'month' },
                        { id: '3', datePrecision: 'year' },
                        { id: '4', datePrecision: 'unknown' }
                    ]
                });

                state.updateFilters({ quality: { preciseDates: true } });

                const filtered = state.getFilteredLetters();
                assert(filtered.length === 1, `Sollte 1 Brief mit Tag-Präzision finden, fand ${filtered.length}`);
                assert(filtered[0].datePrecision === 'day', 'Sollte day-Präzision haben');
            }
        },

        {
            name: 'getFilteredLetters: Caching funktioniert',
            run() {
                state.setData({
                    letters: Array.from({ length: 1000 }, (_, i) => ({ id: `${i}`, year: 1900 + i }))
                });

                state.updateFilters({ temporal: { min: 1900, max: 1950 } });

                // Erster Aufruf
                const start1 = performance.now();
                const result1 = state.getFilteredLetters();
                const time1 = performance.now() - start1;

                // Zweiter Aufruf (should be cached)
                const start2 = performance.now();
                const result2 = state.getFilteredLetters();
                const time2 = performance.now() - start2;

                assert(result1.length === result2.length, 'Beide Aufrufe sollten gleich viele Briefe liefern');
                assert(time2 < time1 / 2, `Zweiter Aufruf sollte schneller sein (${time2.toFixed(2)}ms vs ${time1.toFixed(2)}ms)`);
            }
        },

        {
            name: 'resetFilters: Setzt alle Filter zurück',
            run() {
                state.updateFilters({
                    temporal: { min: 1900, max: 1950 },
                    languages: ['de', 'fr'],
                    person: 'A',
                    subject: 'S1',
                    place: 'P1',
                    quality: { preciseDates: true, knownPersons: true }
                });

                state.resetFilters();

                assert(state.filters.temporal === null, 'Temporal sollte null sein');
                assert(state.filters.languages.length === 0, 'Languages sollte leer sein');
                assert(state.filters.person === null, 'Person sollte null sein');
                assert(state.filters.subject === null, 'Subject sollte null sein');
                assert(state.filters.place === null, 'Place sollte null sein');
                assert(state.filters.quality.preciseDates === false, 'QualityFilter sollte zurückgesetzt sein');
            }
        },

        {
            name: 'toURLParams: Exportiert State zu URL-Parametern',
            run() {
                state.updateUI({ currentView: 'timeline' });
                state.updateFilters({
                    temporal: { min: 1900, max: 1950 },
                    languages: ['de', 'fr'],
                    person: '123',
                    subject: 'S1'
                });

                const params = state.toURLParams();

                assert(params.get('view') === 'timeline', 'View sollte gesetzt sein');
                assert(params.get('yearMin') === '1900', 'yearMin sollte 1900 sein');
                assert(params.get('yearMax') === '1950', 'yearMax sollte 1950 sein');
                assert(params.get('langs') === 'de,fr', 'Sprachen sollten komma-separiert sein');
                assert(params.get('person') === '123', 'Person sollte gesetzt sein');
                assert(params.get('subject') === 'S1', 'Subject sollte gesetzt sein');
            }
        },

        {
            name: 'fromURLParams: Importiert State aus URL-Parametern',
            run() {
                const params = new URLSearchParams();
                params.set('view', 'letters');
                params.set('yearMin', '1910');
                params.set('yearMax', '1930');
                params.set('langs', 'de,en');
                params.set('person', '456');

                state.fromURLParams(params);

                assert(state.ui.currentView === 'letters', 'View sollte gesetzt sein');
                assert(state.filters.temporal.min === 1910, 'yearMin sollte 1910 sein');
                assert(state.filters.temporal.max === 1930, 'yearMax sollte 1930 sein');
                assert(state.filters.languages.includes('de'), 'de sollte in languages sein');
                assert(state.filters.languages.includes('en'), 'en sollte in languages sein');
                assert(state.filters.person === '456', 'Person sollte 456 sein');
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
