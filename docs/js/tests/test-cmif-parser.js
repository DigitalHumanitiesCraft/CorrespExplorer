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
            name: 'Grazer Fälle: Weiterleitung bleibt erhalten, Datumsgrenze ohne Jahr, Registerkennung als Schlüssel',
            async run() {
                const { letters, indices } = await parseCMIF('data/test-graz-cases.xml');
                const [l18, l201, l7327] = letters;
                assert(l18.furtherActions?.length === 1 && l18.furtherActions[0].type === 'forwarded',
                    `Eine Handlung forwarded erwartet, erhalten ${JSON.stringify(l18.furtherActions)}`);
                assert(l18.furtherActions[0].persons[0].name === 'Muster-Beispiel, Joseph', 'Die Person der Weiterleitung bleibt erhalten');
                assert(!('date' in l18.furtherActions[0]) && !('place' in l18.furtherActions[0]), 'Die Weiterleitung erbt weder Datum noch Ort des Versands');
                assert(l18.recipient.precision === 'unknown', `Der Empfänger bleibt unbekannt, erhalten ${l18.recipient.precision}`);
                assert(!indices.persons['999002000'] || indices.persons['999002000'].letter_count === 2,
                    `Die Weiterleitung zählt nicht als Brief der Person, erhalten ${indices.persons['999002000']?.letter_count}`);
                const smith = 'https://example.org/edition/persons#P.701';
                assert(l201.sender.id === null && l201.sender.localRef === smith && l201.sender.precision === 'named',
                    `Registerkennung ohne Normdatum erwartet, erhalten ${JSON.stringify(l201.sender)}`);
                assert(indices.persons[smith]?.as_sender === 1, 'Die Registerkennung ist der Schlüssel im Personenindex');
                assert(l201.datePrecision === 'year' && l201.year === 1801, 'when="1801" ist ein Jahr');
                assert(l7327.dateBound === 'notAfter' && l7327.date === '1848' && l7327.year === null && l7327.dateTo === null,
                    `Obere Grenze ohne Jahr erwartet, erhalten ${JSON.stringify([l7327.dateBound, l7327.date, l7327.year, l7327.dateTo])}`);
                assert(l7327.place_sent.precision === 'unknown', `"ohne Ort" ist kein Ort, erhalten ${l7327.place_sent.precision}`);
                assert(l7327.sender.localRef === 'https://example.org/edition/persons#P.88' && l7327.sender.id === '999000088',
                    'Normdatum und Registerkennung stehen nebeneinander, das Normdatum ist der Schlüssel');
            }
        },

        {
            name: 'Zwei Bestände: gleicher Absender, Empfänger und Tag werden benannt, nicht zusammengeführt',
            async run() {
                const sources = await Promise.all(['data/test-parallel-a.xml', 'data/test-parallel-b.xml', 'data/test-graz-cases.xml']
                    .map(path => fetch(path).then(r => r.text())));
                const data = await parseCMIFFiles(sources, null, ['boltzmann.xml', 'brentano.xml', 'hpe.xml']);
                assert(data.letters.length === 5, `5 Briefe erwartet, erhalten ${data.letters.length}`);
                const a = data.letters.find(l => l.id === '622');
                const b = data.letters.find(l => l.file === 'brentano.xml');
                assert(b.sender.authority === 'gnd' && b.sender.id === '118513109', `GND ohne "gnd/" wird gelesen, erhalten ${JSON.stringify(b.sender)}`);
                assert(a.parallels?.length === 1 && a.parallels[0].id === b.id && a.parallels[0].file === 'brentano.xml',
                    `Verweis auf den anderen Bestand erwartet, erhalten ${JSON.stringify(a.parallels)}`);
                assert(b.parallels?.[0]?.id === '622', 'Der Verweis gilt in beide Richtungen');
                assert(data.indices.persons['118513109'].as_sender === 2, 'Beide Einträge zählen einzeln, die Person ist eine');
                assert(data.letters.filter(l => l.file === 'hpe.xml').every(l => !l.parallels), 'Briefe ohne Entsprechung haben keinen Verweis');
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
        },

        {
            name: 'Briefsätze: Mitabsender, Ortswortlaut, gelesenes Datum und Sprache des Datensatzes',
            async run() {
                const { letters } = await parseCMIF('data/test-letter-records-c.xml');
                const c01 = letters[0];
                assert(c01.sender.name === 'Verlag Beispiel', `Der Verlag schreibt, nicht die Empfängerin; erhalten ${c01.sender?.name}`);
                assert(c01.senders?.length === 2, 'Beide Absender der Quelle bleiben erhalten');
                assert(c01.recipient.name === 'Empfang, Erika', `Empfängerin erwartet, erhalten ${c01.recipient?.name}`);
                assert(c01.place_sent === null, 'Ein Ortswortlaut allein ist kein Absendeort');
                assert(c01.placeText === '49, Musterstrasse, | London, W.1.', `Wortlaut bleibt als Text, erhalten ${c01.placeText}`);
                assert(c01.date === '1938-05-05' && !c01.dateInferred, 'Ein gelesenes Datum neben einem erschlossenen bleibt ungeklammert');
                assert(c01.datePrecision === 'day', `Das gelesene Datum behält seine Präzision, erhalten ${c01.datePrecision}`);
                assert(c01.dateSupplied === 'Mai 1938', `Der Wortlaut des ergänzten Datums bleibt erhalten, erhalten ${c01.dateSupplied}`);
                assert(c01.dateWording === '5. 5. 38', `Wortlaut des Datums erwartet, erhalten ${c01.dateWording}`);
                assert(c01.language?.code === 'de', `Sprache aus textLang erwartet, erhalten ${c01.language?.code}`);
            }
        },

        {
            name: 'Parserfälle: Zwei Absendeorte, der zweite bleibt als Alternative (P01)',
            async run() {
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                const p01 = letters.find(l => l.id === 'TP.P01');
                assert(p01.place_sent?.name === 'Altstadt' && p01.place_sent.geonames_id === '9990001' && p01.place_sent.inferred === true,
                    `Der erste Ort bleibt Absendeort, erhalten ${JSON.stringify(p01.place_sent)}`);
                assert(JSON.stringify(p01.placeAlternatives) === JSON.stringify([{ name: 'Neustadt', geonames_id: null, inferred: true }]),
                    `Neustadt als einzige Alternative erwartet, die Wiederholung von Altstadt nicht; erhalten ${JSON.stringify(p01.placeAlternatives)}`);
            }
        },

        {
            name: 'Parserfälle: Ort und Datum in der Anschrift sind kein Absendeort und kein Briefdatum, jede Anschrift bleibt (P02, P03)',
            async run() {
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                const p02 = letters.find(l => l.id === 'TP.P02');
                const p03 = letters.find(l => l.id === 'TP.P03');
                assert(p02.place_sent?.name === 'Schreibort' && !p02.placeAlternatives, `Schreibort erwartet, erhalten ${JSON.stringify(p02.place_sent)}`);
                assert(p02.date === '1901-02-03', `Datum der Handlung erwartet, erhalten ${p02.date}`);
                assert(p02.address === 'Erfundene Gasse 1, Adressstadt, 31. 12. 1899', `Erste Anschrift erwartet, erhalten ${p02.address}`);
                assert(JSON.stringify(p02.addresses) === JSON.stringify(['Erfundene Gasse 1, Adressstadt, 31. 12. 1899', 'Beispielweg 2, 9999, Zielstadt']),
                    `Beide Anschriften, Teile mit Komma, erwartet; erhalten ${JSON.stringify(p02.addresses)}`);
                assert(p03.place_sent === null, `Ein Ort nur in der Anschrift ist kein Absendeort, erhalten ${JSON.stringify(p03.place_sent)}`);
                assert(p03.date === null && p03.datePrecision === 'unknown', `Ein Datum nur in der Anschrift ist kein Briefdatum, erhalten ${p03.date}`);
                assert(p03.address === 'Erfundene Gasse 3, Adressstadt' && !p03.addresses, `Zeile und Ort der Anschrift erwartet, erhalten ${p03.address}`);
            }
        },

        {
            name: 'Parserfälle: Verweis eines unbekannten Systems und VIAF ohne Nummer sind kein Normdatum (P04)',
            async run() {
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                const p04 = letters.find(l => l.id === 'TP.P04');
                assert(p04.sender.precision === 'named' && p04.sender.id === null && p04.sender.authority === null
                    && p04.sender.localRef === 'https://www.wikidata.org/entity/Q1', `Wikidata als Verweis erwartet, erhalten ${JSON.stringify(p04.sender)}`);
                assert(p04.recipient.precision === 'named' && p04.recipient.id === null && p04.recipient.localRef === 'https://viaf.org/viaf/',
                    `VIAF ohne Nummer als Verweis erwartet, erhalten ${JSON.stringify(p04.recipient)}`);
            }
        },

        {
            name: 'Parserfälle: Die Notiz des Briefs zählt, nicht die Notiz der Handlung (P05)',
            async run() {
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                const p05 = letters.find(l => l.id === 'TP.P05');
                assert(p05.language?.code === 'fr', `Sprache aus der Notiz des Briefs erwartet, erhalten ${JSON.stringify(p05.language)}`);
                assert(p05.mentions.persons.length === 1 && p05.mentions.persons[0].id === '999000005', `Erwähnung erwartet, erhalten ${JSON.stringify(p05.mentions.persons)}`);
            }
        },

        {
            name: 'Parserfälle: Platzhalter ohne Datum sind undatiert, eine Uhrzeit ergibt den Tag (P06 bis P09)',
            async run() {
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                for (const id of ['TP.P06', 'TP.P07', 'TP.P08']) {
                    const letter = letters.find(l => l.id === id);
                    assert(letter.date === null && !letter.dateText && !letter.dateInferred && letter.datePrecision === 'unknown',
                        `${id} sollte undatiert sein, erhalten ${JSON.stringify([letter.date, letter.dateText, letter.dateInferred])}`);
                }
                const p09 = letters.find(l => l.id === 'TP.P09');
                assert(p09.date === '1900-06-15' && p09.datePrecision === 'day' && p09.year === 1900,
                    `Tag erwartet, erhalten ${JSON.stringify([p09.date, p09.datePrecision])}`);
            }
        },

        {
            name: 'Parserfälle: Eine Signatur, zwei gleiche Daten und ein Jahrhundertfehler ergeben zwei Briefe (M1)',
            async run() {
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                const group = letters.filter(l => l.signature === 'TP/M1');
                assert(group.length === 2, `Zwei Briefe erwartet, erhalten ${group.length}`);
                const [merged, apart] = group;
                assert(merged.id === 'TP.M1a' && merged.records?.map(r => r.id).join() === 'TP.M1a,TP.M1c',
                    `M1a und M1c zusammengeführt erwartet, erhalten ${JSON.stringify(merged.records)}`);
                assert(apart.id === 'TP.M1b' && !apart.records, `M1b bleibt allein, erhalten ${JSON.stringify(apart.records)}`);
                assert(merged.sharedSignature?.[0]?.id === 'TP.M1b' && merged.sharedSignature[0].date === '2019-02-20',
                    `Der zusammengeführte Brief nennt den abweichenden, erhalten ${JSON.stringify(merged.sharedSignature)}`);
                assert(apart.sharedSignature?.[0]?.id === 'TP.M1a', 'Der abweichende Brief nennt den zusammengeführten');
            }
        },

        {
            name: 'Parserfälle: Zusammenführung füllt Sprache und Ortswortlaut, Erschlossen folgt dem gezeigten Wert (M2 bis M4)',
            async run() {
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                const m2 = letters.find(l => l.id === 'TP.M2a');
                const m3 = letters.find(l => l.id === 'TP.M3a');
                const m4 = letters.find(l => l.id === 'TP.M4a');
                assert(m2.records?.length === 2, 'M2 ist ein Brief');
                assert(m2.language?.code === 'fr', `Sprache aus dem zweiten Eintrag erwartet, erhalten ${JSON.stringify(m2.language)}`);
                assert(m2.placeText === 'Hotel Erfunden, Zimmer 3', `Ortswortlaut aus dem zweiten Eintrag erwartet, erhalten ${m2.placeText}`);
                assert(!m2.dateInferred, 'Das gezeigte Datum stammt aus dem Eintrag, der es nicht markiert');
                assert(m3.place_sent?.name === 'Schreibort' && m3.place_sent.inferred === true, `Der übernommene Ort bleibt erschlossen, erhalten ${JSON.stringify(m3.place_sent)}`);
                assert(m4.place_sent?.name === 'Schreibort' && !m4.place_sent.inferred, `Der gelesene Ort des führenden Eintrags bleibt unmarkiert, erhalten ${JSON.stringify(m4.place_sent)}`);
            }
        }
    ]
};
