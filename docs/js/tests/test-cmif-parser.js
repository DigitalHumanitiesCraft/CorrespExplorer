// Test Suite: CMIF Parser
// Tests XML→JSON parsing with REAL CMIF data

import { parseCMIF } from '../cmif-parser.js';

export const CMIFParserTests = {
    name: 'CMIF Parser',

    setup() {
        // No setup needed
    },

    tests: [
        {
            name: 'parseCMIF: Lädt und parst test-uncertainty.xml',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data !== null, 'Data should not be null');
                assert(data.letters, 'Data should have letters array');
                assert(data.letters.length > 0, `Should have letters, got ${data.letters.length}`);
                assert(data.indices, 'Data should have indices');
                assert(data.meta, 'Data should have meta');
            }
        },

        {
            name: 'Datums-Präzision: Findet day precision in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const dayPrecisionLetters = data.letters.filter(l => l.datePrecision === 'day');

                assert(dayPrecisionLetters.length > 0, `Should find letters with day precision, found ${dayPrecisionLetters.length}`);

                const firstLetter = dayPrecisionLetters[0];
                assert(firstLetter.date, 'Letter should have date');
                assert(firstLetter.date.length === 10, `Date should be YYYY-MM-DD format, got ${firstLetter.date}`);
            }
        },

        {
            name: 'Datums-Präzision: Findet month precision in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const monthPrecisionLetters = data.letters.filter(l => l.datePrecision === 'month');

                assert(monthPrecisionLetters.length > 0, `Should find letters with month precision, found ${monthPrecisionLetters.length}`);

                const firstLetter = monthPrecisionLetters[0];
                assert(firstLetter.date.length === 7, `Date should be YYYY-MM format, got ${firstLetter.date}`);
            }
        },

        {
            name: 'Datums-Präzision: Findet year precision in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const yearPrecisionLetters = data.letters.filter(l => l.datePrecision === 'year');

                assert(yearPrecisionLetters.length > 0, `Should find letters with year precision, found ${yearPrecisionLetters.length}`);

                const firstLetter = yearPrecisionLetters[0];
                assert(firstLetter.year, 'Letter should have year');
            }
        },

        {
            name: 'Datums-Präzision: Findet range precision in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const rangePrecisionLetters = data.letters.filter(l => l.datePrecision === 'range');

                assert(rangePrecisionLetters.length > 0, `Should find letters with range precision, found ${rangePrecisionLetters.length}`);

                const firstLetter = rangePrecisionLetters[0];
                assert(firstLetter.date, 'Letter should have date');
                assert(firstLetter.dateTo, 'Letter should have dateTo for range');
            }
        },

        {
            name: 'Personen-Präzision: Findet identified persons (with authority) in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const identifiedPersons = data.letters.filter(l =>
                    l.sender?.precision === 'identified' || l.recipient?.precision === 'identified'
                );

                assert(identifiedPersons.length > 0, `Should find identified persons, found ${identifiedPersons.length}`);

                const firstLetter = identifiedPersons[0];
                const person = firstLetter.sender?.precision === 'identified' ? firstLetter.sender : firstLetter.recipient;
                assert(person.authority, `Identified person should have authority, got ${person.authority}`);
                assert(person.id, `Identified person should have ID, got ${person.id}`);
            }
        },

        {
            name: 'Personen-Präzision: Findet named persons (no authority) in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const namedPersons = data.letters.filter(l =>
                    l.sender?.precision === 'named' || l.recipient?.precision === 'named'
                );

                assert(namedPersons.length > 0, `Should find named persons, found ${namedPersons.length}`);

                const firstLetter = namedPersons[0];
                const person = firstLetter.sender?.precision === 'named' ? firstLetter.sender : firstLetter.recipient;
                assert(person.name, 'Named person should have name');
                assert(person.authority === null, `Named person should have no authority, got ${person.authority}`);
            }
        },

        {
            name: 'Personen-Präzision: Findet unknown persons in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const unknownPersons = data.letters.filter(l =>
                    l.sender?.precision === 'unknown' || l.recipient?.precision === 'unknown'
                );

                assert(unknownPersons.length > 0, `Should find unknown persons, found ${unknownPersons.length}`);
            }
        },

        {
            name: 'Orts-Präzision: Findet exact places (with GeoNames) in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const exactPlaces = data.letters.filter(l => l.place_sent?.precision === 'exact');

                assert(exactPlaces.length > 0, `Should find exact places, found ${exactPlaces.length}`);

                const firstLetter = exactPlaces[0];
                assert(firstLetter.place_sent.geonames_id, `Exact place should have GeoNames ID, got ${firstLetter.place_sent.geonames_id}`);
            }
        },

        {
            name: 'Orts-Präzision: Findet region places (no GeoNames) in echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const regionPlaces = data.letters.filter(l => l.place_sent?.precision === 'region');

                assert(regionPlaces.length > 0, `Should find region places, found ${regionPlaces.length}`);

                const firstLetter = regionPlaces[0];
                assert(firstLetter.place_sent.name, 'Region place should have name');
                assert(firstLetter.place_sent.geonames_id === null, `Region place should have no GeoNames ID, got ${firstLetter.place_sent.geonames_id}`);
            }
        },

        {
            name: 'Indices: Erstellt persons index aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.indices.persons, 'Should have persons index');
                assert(Object.keys(data.indices.persons).length > 0, `Persons index should not be empty, got ${Object.keys(data.indices.persons).length} persons`);

                const firstPersonId = Object.keys(data.indices.persons)[0];
                const person = data.indices.persons[firstPersonId];
                assert(person.name, 'Person should have name');
            }
        },

        {
            name: 'Indices: Erstellt places index aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.indices.places, 'Should have places index');
                assert(Object.keys(data.indices.places).length > 0, `Places index should not be empty, got ${Object.keys(data.indices.places).length} places`);
            }
        },

        {
            name: 'Meta: Extrahiert metadata aus echten Daten',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');

                assert(data.meta.total_letters > 0, `Should have total_letters count, got ${data.meta.total_letters}`);
                assert(data.meta.date_range, 'Should have date_range');
                assert(data.meta.uncertainty, 'Should have uncertainty stats');
            }
        }
    ]
};

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}
