// Test Suite: Data Aggregation
// Tests aggregation logic with REAL CMIF data
// NOTE: Since aggregation functions are not exported from explore.js,
// these tests verify the aggregation results work correctly with real data

import { parseCMIF } from '../cmif-parser.js';
import { state } from '../state-manager.js';
import { isMultiYearSpan, datedYearRange } from '../utils.js';
import { datasetQuality, summarizeCorpus } from '../research-paths.js';
import { NO_LANGUAGE, registerLanguageLabels, languageLabel } from '../constants.js';
import { assert } from './test-runner.js';
import { analyzeCoordinateNeeds } from '../geonames-enrichment.js';
import { buildActivityIndex } from '../views/activity-view.js';
import { indexPlaces, coordinateCoverage, countLettersByPlace } from '../views/places-view.js';

export const AggregationTests = {
    name: 'Data Aggregation',

    setup() {
        // No setup needed
    },

    tests: [
        {
            name: 'datedYearRange: Spanne über ein Jahrhundert (Fall 025) dehnt den Zeitraum nicht (E5)',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const span = data.letters.find(l => l.id.endsWith('025'));
                const withinYear = data.letters.find(l => l.id.endsWith('005'));
                assert(span && isMultiYearSpan(span), 'Fall 025 sollte als mehrjährige Spanne gelten');
                assert(withinYear && withinYear.datePrecision === 'range' && !isMultiYearSpan(withinYear), 'Fall 005 liegt in einem Jahr');
                const range = datedYearRange(data.letters);
                assert(range.min > 1850, `Zeitraum beginnt bei ${range.min}, die Spanne 1850 bis 1950 zählt mit`);
                assert(datedYearRange(data.letters, { includeSpans: true }).min === 1850, 'Mit includeSpans zählt das Anfangsjahr');
            }
        },
        {
            name: 'analyzeCoordinateNeeds: Nur Orte mit GeoNames-ID gehen an die Auflösung, nicht Namen',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const geonamesIds = new Set(data.letters.map(l => l.place_sent?.geonames_id).filter(Boolean));
                const named = data.letters.filter(l => l.place_sent?.name && !l.place_sent.geonames_id);
                assert(named.length > 0, 'Fixture sollte Orte ohne GeoNames-ID enthalten (Region, Unbekannt)');
                const stats = analyzeCoordinateNeeds(data);
                const foreign = stats.geonamesIdsToResolve.filter(id => !geonamesIds.has(id));
                assert(foreign.length === 0, `Keine GeoNames-IDs: ${foreign.join(', ')}`);
                assert(stats.withGeoNamesId === stats.geonamesIdsToResolve.length, 'Zählung und Liste sollten übereinstimmen');
            }
        },
        {
            name: 'buildActivityIndex: Tages-, gröber und undatierte Briefe ergeben zusammen alle Briefe',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const index = buildActivityIndex(data.letters);
                const { month, year, range, undated, text, implausible } = index.withoutDay;
                assert(undated > 0, 'Fixture sollte undatierte Briefe enthalten');
                const sum = index.total + month + year + range + undated + text + implausible;
                assert(sum === data.letters.length, `Summe ${sum} statt ${data.letters.length} Briefe`);
            }
        },
        {
            // Regression: the busiest year counted only day-precise letters (326) where the timeline
            // counted every letter of the year (327)
            name: 'buildActivityIndex: Jahre zählen wie die Timeline, Datum nur als Text ist nicht undatiert',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const index = buildActivityIndex(data.letters);
                for (const [year, count] of index.lettersByYear) {
                    const timeline = data.letters.filter(l => l.year === year && !isMultiYearSpan(l)).length;
                    assert(count === timeline, `${year}: ${count} statt ${timeline} wie in der Timeline`);
                }
                const coarse = data.letters.find(l => l.year && l.datePrecision !== 'day' && !isMultiYearSpan(l));
                assert(coarse && index.lettersByYear.get(coarse.year) > (index.byYear.get(coarse.year) || 0),
                    'Ein nur auf Monat oder Jahr datierter Brief zählt im Jahr, nicht in den Tageszellen');
                assert(index.maxYear.count === Math.max(...index.lettersByYear.values()), 'Aktivstes Jahr aus allen Briefen des Jahres');

                const records = await parseCMIF('data/test-letter-records.xml');
                const withText = buildActivityIndex(records.letters).withoutDay;
                assert(withText.text === 1 && withText.undated === 1, `Text 1 und ohne Datum 1 erwartet: ${JSON.stringify(withText)}`);
            }
        },
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
                // A fixture without mentions has an empty subject index
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
                // setData keeps the filters, the temporal test before this one leaves its range set
                state.resetFilters();

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
        },

        {
            // Regression: the overview showed 0% identified persons because ids are bare
            // authority ids, not URLs. Sidebar icons and overview chips read these figures,
            // which count persons and places like the corpus summary behind the counters
            name: 'datasetQuality: Personen mit Normdaten-ID aus derselben Zusammenfassung wie die Zähler',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const corpus = summarizeCorpus(data.letters, data.indices);
                const quality = datasetQuality(data.letters, corpus);

                assert(quality.persons.total === corpus.persons.size, `Personen ${quality.persons.total} statt ${corpus.persons.size}`);
                assert(quality.places.total === corpus.places.size, `Orte ${quality.places.total} statt ${corpus.places.size}`);
                assert(quality.persons.known > 0, `Should count persons with authority id, got ${quality.persons.known}`);
                assert(quality.persons.known < quality.persons.total, `Fixture has persons without authority id, got ${quality.persons.known}/${quality.persons.total}`);
                const dayPrecise = data.letters.filter(l => l.datePrecision === 'day').length;
                assert(quality.dates.known === dayPrecise && quality.dates.total === data.letters.length, 'Tagesgenaue Daten falsch gezählt');
            }
        },

        {
            name: 'Sprachcode "None" der Quelle bleibt eine Sprache mit eigenem Label (Fall 023)',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const ladin = data.letters.find(l => l.id.endsWith('023'));
                assert(ladin?.language?.code === 'None', `Code sollte None sein, ist ${ladin?.language?.code}`);
                assert(ladin.language.label === 'Ladinisch', `Label sollte aus dem ref-Text kommen, ist ${ladin.language.label}`);

                registerLanguageLabels(data.letters);
                assert(languageLabel('None') === 'Ladinisch', `Anzeige sollte Ladinisch sein, ist ${languageLabel('None')}`);
                assert(languageLabel(NO_LANGUAGE) === 'Ohne Angabe', 'Briefe ohne Sprache heissen Ohne Angabe');

                state.setData(data);
                state.resetFilters();
                state.updateFilters({ languages: [NO_LANGUAGE] });
                const withoutLanguage = state.getFilteredLetters();
                assert(withoutLanguage.length > 0, 'Fixture sollte Briefe ohne Sprache enthalten');
                assert(!withoutLanguage.includes(ladin), 'Der Brief mit Code None darf nicht als ohne Sprache gelten');
                state.resetFilters();
            }
        },
        {
            // Places view: inferred places are counted per place, missing coordinates are a
            // property of the whole list when no place has any, and letters without place are counted
            name: 'Ortsansicht: erschlossene Orte je Ort, Briefe ohne Ort, Koordinatenlage der Liste',
            async run() {
                const { letters } = await parseCMIF('data/test-letter-records.xml');
                const index = indexPlaces(letters);
                assert(coordinateCoverage(index) === 'none', `Fixture ohne Koordinaten, Lage ${coordinateCoverage(index)}`);
                assert(Object.keys(index).sort().join('|') === 'London|Salzburg|Wien', `Orte wie in der Quelle, ist ${Object.keys(index).join('|')}`);

                const { counts, withoutPlace } = countLettersByPlace(letters);
                assert(withoutPlace === 1, `Ein Brief nennt nur einen Poststempel und keinen Ort, gezählt ${withoutPlace}`);
                assert(counts.Salzburg.count === 1 && counts.Salzburg.inferred === 1, 'Salzburg ist von der Edition erschlossen (ana="deduced")');
                assert(counts.Wien.inferred === 1, '[Wien] steht in eckigen Klammern und gilt als erschlossen');
                assert(counts.London.inferred === 0, 'London steht im Brief und ist nicht erschlossen');

                const hsa = await (await fetch('data/hsa-letters.json')).json();
                assert(coordinateCoverage(indexPlaces(hsa.letters)) === 'mixed', 'Das HSA mischt Orte mit und ohne Koordinaten');
            }
        }
    ]
};
