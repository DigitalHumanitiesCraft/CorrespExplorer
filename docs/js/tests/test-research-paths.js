// Test suite: research paths, basket selection of a view, letter export and person index
// Real fixtures through parseCMIF and the preprocessed HSA file, real production functions

import { parseCMIF } from '../cmif-parser.js';
import { personKey, placeKey, personAuthority, isKnownPlace } from '../utils.js';
import { analyzeResearchQuestions, summarizeCorpus } from '../research-paths.js';
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
            name: 'analyzeResearchQuestions: Vorschau zählt Briefe je personKey (Parser)',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const questions = analyzeResearchQuestions(data.letters, data.indices);
                const persons = questions.find(q => q.path?.[0]?.view === 'persons' && q.category === 'descriptive');
                assert(persons, 'Descriptive persons question expected');
                const top = [...summarizeCorpus(data.letters).persons.values()].sort((a, b) => b.count - a.count)[0];
                assert(top.count === lettersOf(data.letters, top.key), `Top person count ${top.count} should equal its letters`);
                assert(persons.preview[0] === `${top.name} (${top.count})`, `Preview should start with ${top.name} (${top.count}), got ${persons.preview[0]}`);
            }
        },
        {
            name: 'analyzeResearchQuestions: Fehlende Erwähnungen als Anreicherungspotential mit Parser-Element',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const unavailable = analyzeResearchQuestions(data.letters, data.indices).filter(q => q.category === 'unavailable');
                const mentions = unavailable.find(q => q.missingData === 'Erwähnte Personen');
                assert(mentions, 'Fixture without mentionsPerson should yield the enrichment question');
                assert(mentions.suggestion.includes('mentionsPerson'), 'Suggestion should name the ref type the parser reads');
                assert(unavailable.every(q => !q.path), 'Unavailable questions carry no path');
            }
        },
        {
            name: 'analyzeResearchQuestions: Erwähnungen im Demo-Datensatz werden analysiert',
            async run() {
                const data = await parseCMIF('data/demo-showcase.xml');
                const questions = analyzeResearchQuestions(data.letters, data.indices);
                assert(questions.some(q => q.path?.[0]?.view === 'mentions-flow'), 'Mentions question expected');
                assert(!questions.some(q => q.missingData === 'Erwähnte Personen'), 'No mentions enrichment question expected');
            }
        },
        {
            name: 'analyzeResearchQuestions: HSA-JSON mit letters_sent und Sprach-Strings',
            async run() {
                const data = await (await fetch('data/hsa-letters.json')).json();
                const questions = analyzeResearchQuestions(data.letters, data.indices);
                const summary = summarizeCorpus(data.letters, data.indices);
                const persons = questions.find(q => q.category === 'descriptive' && q.path?.[0]?.view === 'persons');
                assert(persons.description.startsWith(summary.persons.size.toLocaleString('de-DE')), `Description should count ${summary.persons.size} persons`);
                assert(!persons.preview.some(p => p.endsWith('(0)')), 'Preview counts must not be 0 for the HSA index shape');
                const languages = questions.find(q => q.path?.[0]?.view === 'timeline' && q.category === 'descriptive');
                assert(languages && !languages.preview.some(p => p.endsWith('(0)')), 'Language preview counted from letters');
                const top = [...summary.persons.values()].sort((a, b) => b.count - a.count)[0];
                const ego = top.count > data.letters.length * 0.6;
                assert(questions.some(q => q.question.includes('Ego-Netzwerk')) === ego, 'Ego network detection follows the top person share');
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
                assert(basketSelectionForView('chronik', data.letters).type === 'letters', 'Other views collect letters');
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
                    'JSON trägt Poststempel, alle Empfänger und Datumstext');
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
            name: 'buildIndices: Personenindex trägt Normdaten-ID und System',
            async run() {
                const data = await parseCMIF('data/demo-showcase.xml');
                const withId = data.letters.find(l => l.sender?.id && l.sender?.authority).sender;
                const entry = data.indices.persons[personKey(withId)];
                const ref = personAuthority(entry);
                assert(ref && ref.id === withId.id && ref.authority === withId.authority, 'Index entry should resolve to the authority of its letters');
            }
        },

        {
            // The overview passes the summary built at load time instead of counting again
            name: 'analyzeResearchQuestions: übergebene Zusammenfassung ergibt dieselben Fragen',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const summary = summarizeCorpus(data.letters, data.indices);
                const passed = analyzeResearchQuestions(data.letters, data.indices, summary);
                const own = analyzeResearchQuestions(data.letters, data.indices);
                assert(passed.length > 0, 'Fixture sollte Forschungsfragen ergeben');
                assert(JSON.stringify(passed) === JSON.stringify(own), 'Fragen hängen davon ab, wer die Zusammenfassung bildet');
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
