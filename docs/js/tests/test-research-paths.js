// Test suite: corpus summary, basket selection of a view, letter export and person index
// Real fixtures through parseCMIF and the preprocessed HSA file, real production functions

import { parseCMIF } from '../cmif-parser.js';
import { personKey, placeKey, personAuthority, isKnownPlace } from '../utils.js';
import { summarizeCorpus } from '../research-paths.js';
import { basketSelectionForView } from '../knowledge-path.js';
import { datasetToJson, lettersToCsv, letterExportRow, LETTER_EXPORT_COLUMNS, CSV_BOM } from '../export.js';
import { describeFilters, filterSentence } from '../views/view-support.js';
import { assert } from './test-runner.js';

const lettersOf = (letters, key) =>
    letters.filter(l => personKey(l.sender) === key || personKey(l.recipient) === key).length;

export const ResearchPathTests = {
    name: 'Research Paths and Export',

    tests: [
        {
            name: 'summarizeCorpus: zählt Briefe je personKey (Parser)',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const top = [...summarizeCorpus(data.letters).persons.values()].sort((a, b) => b.count - a.count)[0];
                assert(top.count === lettersOf(data.letters, top.key), `Top person count ${top.count} should equal its letters`);
            }
        },
        {
            name: 'summarizeCorpus: HSA-JSON mit letters_sent und Sprach-Strings',
            async run() {
                const data = await (await fetch('data/hsa-letters.json')).json();
                const summary = summarizeCorpus(data.letters, data.indices);
                assert(summary.persons.size > 0 && [...summary.persons.values()].every(p => p.count > 0), 'Person counts must not be 0 for the HSA index shape');
                assert(summary.languages.size > 1 && [...summary.languages.values()].every(l => l.count > 0), 'Languages counted from letters');
            }
        },
        {
            // Regression: overview, sidebar and comparison counted the placeholder "Unbekannt" as a place
            name: 'summarizeCorpus: Platzhalter für unbekannte Orte zählen nicht als Ort',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const placeholders = data.letters.filter(l => l.place_sent?.precision === 'unknown');
                assert(placeholders.length > 0, 'test-uncertainty.xml should contain a letter from an unknown place');
                const summary = summarizeCorpus(data.letters, data.indices);
                const expected = new Set(data.letters.filter(l => isKnownPlace(l.place_sent)).map(l => placeKey(l.place_sent)));
                assert(summary.places.size === expected.size, `Expected ${expected.size} places, got ${summary.places.size}`);
                assert(placeholders.every(l => !summary.places.has(placeKey(l.place_sent))), 'The placeholder must not be counted');

                const hsa = await (await fetch('data/hsa-letters.json')).json();
                assert(summarizeCorpus(hsa.letters, hsa.indices).places.size === Object.keys(hsa.indices.places).length,
                    'HSA: places from the letters should match the place index, which has no placeholder');
            }
        },
        {
            name: 'basketSelectionForView: Personen und Orte über personKey und placeKey',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const expected = new Set(data.letters.flatMap(l => [personKey(l.sender), personKey(l.recipient)]).filter(Boolean));
                const { type, ids } = basketSelectionForView('persons', data.letters);
                assert(type === 'persons' && ids.length === expected.size, `Expected ${expected.size} person keys, got ${ids.length}`);
                assert(ids.some(id => !data.letters.some(l => l.sender?.id === id || l.recipient?.id === id)), 'Persons without authority id are included');
                assert(basketSelectionForView('timeline', data.letters).type === 'letters', 'Other views collect letters');
            }
        },
        {
            name: 'lettersToCsv: Kopfzeile auch ohne Briefe, eine Zeile je Brief',
            async run() {
                assert(lettersToCsv([]) === CSV_BOM + LETTER_EXPORT_COLUMNS.join(','), 'Empty export keeps BOM and header');
                const data = await parseCMIF('data/test-hostile.xml');
                const lines = lettersToCsv(data.letters).split('\n');
                assert(lines.length === data.letters.length + 1, `Expected ${data.letters.length + 1} lines, got ${lines.length}`);
            }
        },
        {
            name: 'lettersToCsv: Normdatei je Person in eigener Spalte (E4)',
            async run() {
                const data = await parseCMIF('data/demo-showcase.xml');
                const header = lettersToCsv([]).slice(CSV_BOM.length).split(',');
                const idCol = header.indexOf('sender_id');
                const authCol = header.indexOf('sender_authority');
                assert(idCol >= 0 && authCol === idCol + 1, `sender_authority sollte neben sender_id stehen: ${header.join(',')}`);
                assert(header.includes('recipient_authority'), 'recipient_authority fehlt');
                const letter = data.letters.find(l => l.sender?.id && l.sender?.authority);
                const line = lettersToCsv([letter]).split('\n')[1];
                assert(line.includes(`"${letter.sender.id}","${letter.sender.authority}"`), `Zeile ohne Normdatei: ${line}`);
            }
        },
        {
            // The export keeps the earlier columns in their order and appends the transmission fields
            name: 'CSV-Export: Überlieferungsmerkmale als angehängte Spalten (test-letter-records.xml)',
            async run() {
                const header = lettersToCsv([]).slice(CSV_BOM.length).split(',');
                assert(header.slice(0, 19).join(',') === 'id,date,date_to,year,date_precision,date_certainty,sender_name,sender_id,sender_authority,sender_precision,recipient_name,recipient_id,recipient_authority,recipient_precision,place_name,place_geonames,place_precision,language,url',
                    `Bisherige Spalten verändert: ${header.slice(0, 19).join(',')}`);
                const { letters } = await parseCMIF('data/test-letter-records.xml');
                const [r01, r02, r03] = letters.map(letterExportRow);
                assert(r01.signature === 'TA/B1.1' && r01.postmark === '9. APR 1937' && r01.address === 'Salzburg, Beispielgasse 5',
                    `Signatur, Poststempel, Anschrift: ${JSON.stringify(r01)}`);
                assert(r01.date_inferred === false && r01.records === 1 && r01.records_differ === false, 'Gelesenes Datum, ein Datensatz');
                assert(r02.date_inferred === true && r02.place_inferred === true, 'Erschlossenes Datum und erschlossener Ort');
                assert(r02.recipients_all === `${letters[1].recipients[0].name}; ${letters[1].recipients[1].name}`, `Alle Empfänger: ${r02.recipients_all}`);
                assert(r03.date_text === 'Pfingsten 1938' && r03.date === null, 'Datum nur als Text');
                const lines = lettersToCsv(letters).split('\n');
                assert(lines.length === letters.length + 1, 'Eine Zeile je Brief');
                assert(lines[1].split('","').length === LETTER_EXPORT_COLUMNS.length, 'Jede Zeile hat alle Spalten');
                const json = JSON.parse(datasetToJson(letters, { exported: '2026-11-14' }));
                assert(json.letters[0].postmark === '9. APR 1937' && json.letters[1].recipients.length === 2 && json.letters[2].dateText === 'Pfingsten 1938',
                    'JSON enthält Poststempel, alle Empfänger und Datumstext');
            }
        },
        {
            // Fields of test-parser-cases.xml, appended after the earlier columns
            name: 'CSV-Export: ergänztes Datum, weitere Absendeorte, alle Anschriften, geteilte Signatur (test-parser-cases.xml)',
            async run() {
                const header = lettersToCsv([]).slice(CSV_BOM.length).split(',');
                assert(header.slice(-4).join(',') === 'date_supplied,place_alternatives,addresses_all,shared_signature',
                    `Neue Spalten am Ende erwartet: ${header.slice(-4).join(',')}`);
                const { letters } = await parseCMIF('data/test-parser-cases.xml');
                const row = id => letterExportRow(letters.find(l => l.id === id));
                assert(row('TP.P01').place_alternatives === 'Neustadt', `Weiterer Absendeort: ${row('TP.P01').place_alternatives}`);
                assert(row('TP.P02').addresses_all === 'Erfundene Gasse 1, Adressstadt, 31. 12. 1899 | Beispielweg 2, 9999, Zielstadt',
                    `Alle Anschriften: ${row('TP.P02').addresses_all}`);
                assert(row('TP.M1a').shared_signature === 'TP.M1b', `Geteilte Signatur: ${row('TP.M1a').shared_signature}`);
                const c = await parseCMIF('data/test-letter-records-c.xml');
                assert(letterExportRow(c.letters[0]).date_supplied === 'Mai 1938', 'Wortlaut des ergänzten Datums');
                assert(lettersToCsv(letters).split('\n')[1].split('","').length === LETTER_EXPORT_COLUMNS.length, 'Jede Zeile hat alle Spalten');
            }
        },
        {
            // Views without sidebar and the export dialog state the filter in one sentence
            name: 'filterSentence: aktiver Filter als Satz mit Namen statt Schlüsseln',
            async run() {
                const { letters } = await parseCMIF('data/test-letter-records.xml');
                const none = { temporal: null, languages: null, person: null, place: null, subject: null, quality: {}, features: null };
                assert(filterSentence(none, letters, letters.length) === '', 'Ohne Filter kein Satz');
                const person = personKey(letters[0].sender);
                const filters = { ...none, person, temporal: { min: 1937, max: 1938 }, features: ['postmark'] };
                const parts = describeFilters(filters, letters);
                assert(parts[0] === `Person „${letters[0].sender.name}“`, `Name statt Schlüssel erwartet: ${parts[0]}`);
                const sentence = filterSentence(filters, letters, 1);
                assert(sentence === `Gezeigt wird 1 von 4 Briefen, gefiltert nach Person „${letters[0].sender.name}“, Jahren 1937 bis 1938 und Merkmal „Mit Poststempel“.`,
                    `Satz: ${sentence}`);
            }
        },
        {
            name: 'buildIndices: Personenindex enthält Normdaten-ID und System',
            async run() {
                const data = await parseCMIF('data/demo-showcase.xml');
                const withId = data.letters.find(l => l.sender?.id && l.sender?.authority).sender;
                const entry = data.indices.persons[personKey(withId)];
                const ref = personAuthority(entry);
                assert(ref && ref.id === withId.id && ref.authority === withId.authority, 'Index entry should resolve to the authority of its letters');
            }
        },

        {
            // US-22, decision E8: the JSON export carries letters with mentions and the indices
            name: 'JSON-Export: Briefe mit Erwähnungen und Indizes wie die Zusammenfassung',
            async run() {
                const data = await parseCMIF('data/demo-showcase.xml');
                const json = JSON.parse(datasetToJson(data.letters, { meta: data.meta, exported: '2026-11-05' }));
                const corpus = summarizeCorpus(data.letters);
                assert(json.letterCount === data.letters.length && json.letters.length === data.letters.length, 'Briefzahl weicht ab');
                const withMentions = data.letters.findIndex(l => (l.mentions?.persons || []).length > 0);
                assert(withMentions >= 0, 'Fixture sollte Erwähnungen enthalten');
                assert(json.letters[withMentions].mentions.persons.length === data.letters[withMentions].mentions.persons.length, 'Erwähnungen fehlen im Export');
                assert(json.indices.persons.length === corpus.persons.size, `Personenindex ${json.indices.persons.length} statt ${corpus.persons.size}`);
                assert(json.indices.places.length === corpus.places.size, 'Ortsindex weicht ab');
                assert(json.indices.persons.every(p => typeof p.letters === 'number' && 'identified' in p), 'Personenindex ohne Briefzahl oder Normdatenstatus');
                assert(json.dataset?.title === data.meta.title, 'Metadaten des Datensatzes fehlen');
            }
        }
    ]
};
