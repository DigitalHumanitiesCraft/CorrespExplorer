// Test Suite: CMIF Parser
// Tests XML→JSON parsing with REAL CMIF data

import { parseCMIF, parseCMIFFiles } from '../cmif-parser.js';
import { assert } from './test-runner.js';
import { httpErrorMessage } from '../utils.js';

export const CMIFParserTests = {
    name: 'CMIF Parser',

    setup() {
        // No setup needed
    },

    tests: [
        {
            name: 'parseCMIF: Fehlende Datei meldet HTTP 404 mit deutschem Grund',
            async run() {
                let message = '';
                try {
                    await parseCMIF('data/does-not-exist.xml');
                } catch (error) {
                    message = error.message;
                }
                assert(message.includes('HTTP 404 (Datei nicht gefunden)'), `Erhalten: ${message}`);
                // HTTP/2 servers such as GitHub Pages send no status text; the message must not end in a colon
                assert(httpErrorMessage(404, '') === 'HTTP 404 (Datei nicht gefunden)', `Erhalten: ${httpErrorMessage(404, '')}`);
                assert(httpErrorMessage(418, '') === 'HTTP 418', `Erhalten: ${httpErrorMessage(418, '')}`);
            }
        },
        {
            name: 'parseCMIF: Erwähnte Personen, Orte und Themen aus data/demo-showcase.xml',
            async run() {
                const data = await parseCMIF('data/demo-showcase.xml');
                const persons = data.letters.flatMap(l => l.mentions?.persons || []);
                const places = data.letters.flatMap(l => l.mentions?.places || []);
                const subjects = data.letters.flatMap(l => l.mentions?.subjects || []);
                assert(persons.some(p => p.name === 'Jacob Grimm' && p.id === '31997136' && p.authority === 'viaf'),
                    `Jacob Grimm mit VIAF 31997136 erwartet, erhalten ${JSON.stringify(persons.slice(0, 2))}`);
                assert(places.length > 0 && places.some(p => p.geonames_id), 'Erwähnte Orte mit GeoNames-ID erwartet');
                assert(subjects.length > 0 && subjects.every(s => s.label), 'Erwähnte Themen mit Bezeichnung erwartet');
            }
        },
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
            name: 'Datums-Präzision: from und to am selben Tag sind ein Tagesdatum (Fall 024)',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const letter = data.letters.find(l => l.id.endsWith('024'));

                assert(letter, 'Fall 024 sollte geparst sein');
                assert(letter.datePrecision === 'day', `Erwartet day, erhalten ${letter.datePrecision}`);
                assert(letter.date === '1890-02-09' && letter.year === 1890, `Datum falsch: ${letter.date}`);
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
            name: 'parseCMIF: Akzeptiert XML-String mit "/" im Inhalt',
            async run() {
                const xml = await (await fetch('data/test-uncertainty.xml')).text();
                const fromString = await parseCMIF(xml);
                const fromPath = await parseCMIF('data/test-uncertainty.xml');
                assert(fromString.letters.length === fromPath.letters.length,
                    `String and path parse should agree, got ${fromString.letters.length} vs ${fromPath.letters.length}`);
            }
        },

        {
            name: 'parseCMIF: Lehnt andere Typen und URL-Schemata ab',
            async run() {
                for (const bad of [42, null, { url: 'data/test-uncertainty.xml' }]) {
                    const error = await parseCMIF(bad).then(() => null, e => e);
                    assert(error instanceof TypeError, `Should reject ${JSON.stringify(bad)} with TypeError, got ${error}`);
                }
                for (const bad of ['javascript:alert(1)', 'data:application/xml,<TEI/>', 'file:///etc/passwd']) {
                    const error = await parseCMIF(bad).then(() => null, e => e);
                    assert(error && error.message.includes('URL-Schema'), `Should reject ${bad}, got ${error}`);
                }
            }
        },

        {
            name: 'parseCMIF: Ohne correspDesc klarer Fehler',
            async run() {
                const xml = await (await fetch('data/test-uncertainty.xml')).text();
                const doc = new DOMParser().parseFromString(xml, 'application/xml');
                [...doc.getElementsByTagNameNS('http://www.tei-c.org/ns/1.0', 'correspDesc')].forEach(el => el.remove());
                const emptyXml = new XMLSerializer().serializeToString(doc);
                const error = await parseCMIF(emptyXml).then(() => null, e => e);
                assert(error && error.message.includes('correspDesc'), `Should throw a correspDesc error, got ${error}`);
            }
        },

        {
            name: 'parseCMIF: Fallback-ID aus Dokumentposition ist deterministisch',
            async run() {
                const first = await parseCMIF('data/test-hostile.xml');
                const second = await parseCMIF('data/test-hostile.xml');
                // Third correspDesc in test-hostile.xml has neither ref nor key
                assert(first.letters[2].id === 'letter-3', `Expected letter-3, got ${first.letters[2].id}`);
                assert(second.letters[2].id === first.letters[2].id, 'Fallback id should be stable across parses');
                const ids = first.letters.map(l => l.id);
                assert(new Set(ids).size === ids.length, `Letter ids should be unique, got ${ids.join(', ')}`);
            }
        },

        {
            name: 'Briefsätze: ID vom Datensatz, Poststempel ist kein Absendeort, Anschrift und Signatur bleiben erhalten',
            async run() {
                const { letters } = await parseCMIF('data/test-letter-records.xml');
                const r01 = letters[0];
                assert(r01.id === 'REC.a.1', `ID vom biblFull erwartet, erhalten ${r01.id}`);
                assert(r01.place_sent?.name === 'London', `London als Absendeort erwartet, erhalten ${r01.place_sent?.name}`);
                assert(r01.postmark === '9. APR 1937', `Poststempel erwartet, erhalten ${r01.postmark}`);
                assert(r01.address === 'Salzburg, Beispielgasse 5', `Anschrift erwartet, erhalten ${r01.address}`);
                assert(r01.signature === 'TA/B1.1', `Signatur erwartet, erhalten ${r01.signature}`);
                assert(r01.sender.name === 'Muster, Anna', `Name ohne Zeilenumbruch erwartet, erhalten ${JSON.stringify(r01.sender.name)}`);
                assert(r01.date === '1937-04-09' && !r01.dateInferred, 'Gelesenes Datum bleibt unmarkiert');
                const r04 = letters[3];
                assert(r04.place_sent === null && r04.postmark === 'Graz 2', `Nur Poststempel: kein Absendeort, erhalten ${JSON.stringify(r04.place_sent)}`);
            }
        },

        {
            name: 'Briefsätze: Erschlossenes ist markiert, Datum nur als Text bleibt Text, interner Verweis ist nicht identifiziert',
            async run() {
                const { letters, indices } = await parseCMIF('data/test-letter-records.xml');
                const [, r02, r03] = letters;
                assert(r02.place_sent.inferred === true, 'ana="deduced" markiert den Ort als erschlossen');
                assert(r02.dateInferred === true, 'type="supplied" markiert das Datum als erschlossen');
                assert(r02.recipients?.length === 2, `Zwei Empfänger erwartet, erhalten ${r02.recipients?.length}`);
                assert(r02.recipients[1].isOrganization && r02.recipients[1].authority === 'gnd', 'GND ohne Schema wird an der Körperschaft erkannt');
                assert(indices.persons['000000003-1']?.as_recipient === 1, 'Der zweite Empfänger zählt im Personenindex');
                assert(r03.date === null && r03.dateText === 'Pfingsten 1938', `Datumstext erwartet, erhalten ${r03.dateText}`);
                assert(r03.sender.precision === 'named' && r03.sender.id === null && r03.sender.localRef === '#TESTPER.7',
                    `Interner Verweis bleibt "named", erhalten ${JSON.stringify(r03.sender)}`);
                assert(r03.place_sent.name === 'Wien' && r03.place_sent.inferred === true, `[Wien] wird Wien, erschlossen; erhalten ${JSON.stringify(r03.place_sent)}`);
            }
        },

        {
            name: 'Mehrere Dateien: ein Bestand, eindeutige IDs, übersprungene Datei wird genannt',
            async run() {
                const sources = await Promise.all(['data/test-letter-records.xml', 'data/test-letter-records-b.xml', 'data/test-letter-records-b.xml']
                    .map(path => fetch(path).then(r => r.text())));
                const data = await parseCMIFFiles([...sources, '<TEI xmlns="http://www.tei-c.org/ns/1.0"/>'], null, ['a.xml', 'b.xml', 'b2.xml', 'leer.xml']);
                assert(data.letters.length === 6, `6 Briefe erwartet, erhalten ${data.letters.length}`);
                const ids = data.letters.map(l => l.id);
                assert(new Set(ids).size === ids.length, `Eindeutige IDs erwartet, erhalten ${ids.join(', ')}`);
                assert(data.meta.title === 'Test Series: Letter Records', `Reihentitel erwartet, erhalten ${data.meta.title}`);
                assert(data.meta.files.loaded === 3 && data.meta.files.skipped[0]?.name === 'leer.xml', `Dateibilanz: ${JSON.stringify(data.meta.files)}`);
                // R05 in both copies of file b is a further record of letter R01 (same shelfmark and date)
                const r01 = data.letters.find(l => l.id === 'REC.a.1');
                assert(r01.records?.length === 3 && r01.recordsDiffer === true, `R01 mit 3 Einträgen, die abweichen, erhalten ${JSON.stringify(r01.records)}`);
                assert(r01.place_sent.name === 'London', `Der erste Eintrag mit Datum führt, erhalten ${r01.place_sent.name}`);
                assert(data.meta.files.records === 8, `8 Einträge erwartet, erhalten ${data.meta.files.records}`);
                assert(data.letters.every(l => !l.dateImplausible), 'Kein Jahr gilt in einem kleinen Bestand als unplausibel');
                assert(data.meta.publishers.length === 1, `Ein Herausgeber erwartet, erhalten ${JSON.stringify(data.meta.publishers)}`);
                // R03 names her without authority id, which stays a separate key (ADR-001)
                assert(data.indices.persons['000000001'].letter_count === 5, `Anna Muster mit GND in 5 Briefen, erhalten ${data.indices.persons['000000001'].letter_count}`);
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
