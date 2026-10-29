// Test suite: state manager
// Filter logic and URL state on real CMIF fixtures

import { parseCMIF } from '../cmif-parser.js';
import { state } from '../state-manager.js';
import { placeKey } from '../utils.js';
import { assert } from './test-runner.js';

export const StateManagerTests = {
    name: 'State Manager',

    setup() {
        // Each test starts from empty data and no filters
        state.data = {
            letters: [],
            indices: { persons: {}, places: {}, subjects: {}, languages: {} },
            meta: {},
            placeAggregation: {}
        };
        state.resetFilters();
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
            // Regression: persons without authority id are keyed by name in the person list (plan finding 6)
            name: 'updateFilters: Person-Filter ohne Normdaten-ID filtert ueber den Namen',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const unidentified = data.letters.find(l => l.sender?.name && !l.sender.id)?.sender;
                assert(unidentified, 'test-uncertainty.xml sollte einen Absender ohne ID enthalten');

                state.updateFilters({ person: unidentified.name });
                const filtered = state.getFilteredLetters();
                assert(filtered.length > 0, `Sollte Briefe fuer ${unidentified.name} finden`);
                filtered.forEach(letter => {
                    const names = [letter.sender, letter.recipient].map(p => p?.id || p?.name);
                    assert(names.includes(unidentified.name), `Brief ${letter.id} sollte ${unidentified.name} enthalten`);
                });
            }
        },

        {
            // Regression: the places view, the place index of the parser and the filter share placeKey,
            // so a place selected anywhere matches the same letters (ADR-001)
            name: 'updateFilters: Ort-Filter ueber placeKey mit und ohne GeoNames-ID',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const unlocated = data.letters.find(l => l.place_sent?.name && !l.place_sent.geonames_id).place_sent;
                const located = data.letters.find(l => l.place_sent?.geonames_id).place_sent;

                for (const place of [unlocated, located]) {
                    const key = placeKey(place);
                    assert(data.indices.places[key], `Ortsindex sollte den Schluessel ${key} fuehren`);

                    state.updateFilters({ place: key });
                    const filtered = state.getFilteredLetters();
                    const expected = data.letters.filter(l => placeKey(l.place_sent) === key);
                    assert(filtered.length > 0 && filtered.length === expected.length,
                        `Filter ${key} sollte ${expected.length} Briefe finden, fand ${filtered.length}`);
                    assert(filtered.length === data.indices.places[key].letter_count,
                        `Briefzahl des Ortsindex fuer ${key} sollte zum Filter passen`);
                }
                assert(placeKey(located) === located.geonames_id, 'Ein Ort mit GeoNames-ID sollte ueber die ID filtern');
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

                // First call fills the cache
                const result1 = state.getFilteredLetters();

                // Second call returns the cached array
                const result2 = state.getFilteredLetters();

                assert(result1.length === result2.length, 'Beide Aufrufe sollten gleich viele Briefe liefern');
                assert(result1 === result2, 'Zweiter Aufruf sollte gecachtes Array zurückgeben (same reference)');

                // A filter change invalidates the cache
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
                assert(state.filters.languages === null, 'Languages sollte ohne Filter (null) sein');
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
        },

        {
            name: 'updateFilters: Leere Sprachauswahl liefert keine Briefe, null keinen Filter',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                state.updateFilters({ languages: [] });
                assert(state.getFilteredLetters().length === 0, `Ohne gewaehlte Sprache sollte kein Brief bleiben, blieben ${state.getFilteredLetters().length}`);

                state.updateFilters({ languages: null });
                assert(state.getFilteredLetters().length === data.letters.length, 'Ohne Sprachfilter sollten alle Briefe bleiben');
            }
        },

        {
            name: 'updateFilters: Temporal-Filter undated liefert genau die Briefe ohne Jahr',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);
                const undated = data.letters.filter(l => !l.year);
                assert(undated.length > 0, 'Fixture sollte undatierte Briefe enthalten');

                state.updateFilters({ temporal: { undated: true } });
                const filtered = state.getFilteredLetters();

                assert(filtered.length === undated.length, `Sollte ${undated.length} undatierte Briefe finden, fand ${filtered.length}`);
                assert(filtered.every(l => !l.year), 'Alle Treffer sollten ohne Jahr sein');
            }
        },

        {
            name: 'URL-Parameter: undated und leere Sprachauswahl ueberstehen den Rundweg',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                state.updateFilters({ temporal: { undated: true }, languages: [] });
                const params = state.toURLParams();
                assert(params.get('undated') === '1', 'undated sollte als Parameter erscheinen');
                assert(params.has('langs') && params.get('langs') === '', 'Leere Sprachauswahl sollte als leeres langs erscheinen');

                state.resetFilters();
                state.fromURLParams(params);
                assert(state.filters.temporal?.undated === true, 'undated sollte importiert sein');
                assert(Array.isArray(state.filters.languages) && state.filters.languages.length === 0, 'Leere Sprachauswahl sollte importiert sein');
            }
        },

        {
            name: 'URL-Parameter: Alle Filter ueberstehen den Rundweg toURLParams und fromURLParams',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const letter = data.letters.find(l => l.year && l.language?.code && l.mentions?.subjects?.length && l.place_sent);
                assert(letter, 'test-uncertainty.xml sollte einen datierten Brief mit Sprache, Thema und Ort enthalten');
                const subject = letter.mentions.subjects[0];

                state.updateUI({ currentView: 'letters' });
                state.updateFilters({
                    temporal: { min: letter.year, max: letter.year },
                    languages: [letter.language.code],
                    person: letter.sender.id || letter.sender.name,
                    subject: subject.uri || subject.id || subject.label,
                    place: placeKey(letter.place_sent),
                    quality: { preciseDates: true, knownPersons: true }
                });
                const lettersBefore = state.getFilteredLetters().map(l => l.id);
                assert(lettersBefore.includes(letter.id), `Brief ${letter.id} sollte alle gesetzten Filter erfuellen`);

                // parseCMIF alone resolves no coordinates, so located only takes part in the parameter round trip
                state.updateFilters({ quality: { locatedPlaces: true } });
                const before = JSON.stringify(state.filters);
                const params = state.toURLParams();
                assert(params.get('precise') === '1' && params.get('known') === '1' && params.get('located') === '1',
                    'Qualitaetsfilter sollten als precise, known und located erscheinen');

                state.resetFilters();
                state.updateUI({ currentView: 'overview' });
                state.fromURLParams(new URLSearchParams(params.toString()));

                assert(JSON.stringify(state.filters) === before, `Filter nach dem Rundweg ${JSON.stringify(state.filters)} statt ${before}`);
                assert(state.ui.currentView === 'letters', 'Ansicht sollte erhalten bleiben');

                state.updateFilters({ quality: { locatedPlaces: false } });
                assert(JSON.stringify(state.getFilteredLetters().map(l => l.id)) === JSON.stringify(lettersBefore),
                    'Die gefilterten Briefe sollten nach dem Rundweg dieselben sein');
            }
        },

        {
            // Regression: links from before ADR-001 wrote place=name:<Ort> for places without GeoNames id
            name: 'fromURLParams: Alter Ortsparameter name:<Ort> fuehrt zum Schluessel nach placeKey',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const unlocated = data.letters.find(l => l.place_sent?.name && !l.place_sent.geonames_id).place_sent;
                const key = placeKey(unlocated);
                state.fromURLParams(new URLSearchParams({ place: `name:${unlocated.name}` }));

                assert(state.filters.place === key, `Ort-Filter ${state.filters.place} statt ${key}`);
                assert(state.getFilteredLetters().length === data.indices.places[key].letter_count,
                    'Der alte Link sollte dieselben Briefe zeigen wie der Ortsindex');
            }
        },

        {
            name: 'fromURLParams: Filter ohne Parameter werden zurueckgesetzt',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);

                const personIds = Object.keys(data.indices.persons);
                state.updateFilters({ person: personIds[0], languages: [], quality: { preciseDates: true } });
                state.fromURLParams(new URLSearchParams('yearMin=abc&yearMax=1900'));

                assert(state.filters.person === null, 'Person ohne Parameter sollte zurueckgesetzt sein');
                assert(state.filters.languages === null, 'Sprachen ohne langs sollten ohne Filter sein');
                assert(state.filters.temporal === null, 'Ein nicht numerisches Jahr sollte keinen Zeitfilter setzen');
                assert(state.filters.quality.preciseDates === false, 'Qualitaetsfilter ohne Parameter sollte aus sein');
                assert(state.getFilteredLetters().length === data.letters.length, 'Ohne Filter sollten alle Briefe bleiben');
            }
        },

        {
            name: 'filterLetters: Zaehlt unter anderen Filtern ohne den Cache zu aendern',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                state.setData(data);
                const langCodes = Object.keys(data.indices.languages);
                assert(langCodes.length > 0, 'Fixture sollte Sprachen enthalten');

                state.updateFilters({ languages: [langCodes[0]] });
                const cached = state.getFilteredLetters();
                const withoutLanguage = state.filterLetters({ ...state.filters, languages: null });

                assert(withoutLanguage.length === data.letters.length, 'Ohne Sprachfilter sollten alle Briefe zaehlen');
                assert(state.getFilteredLetters() === cached, 'Der Cache der gefilterten Briefe sollte unberuehrt bleiben');
            }
        }
    ]
};
