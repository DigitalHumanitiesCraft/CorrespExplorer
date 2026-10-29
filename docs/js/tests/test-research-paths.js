// Test suite: research paths, basket selection of a view, letter export and person index
// Real fixtures through parseCMIF and the preprocessed HSA file, real production functions

import { parseCMIF } from '../cmif-parser.js';
import { personKey, placeKey, personAuthority, isKnownPlace } from '../utils.js';
import { analyzeResearchQuestions, summarizeCorpus } from '../research-paths.js';
import { basketSelectionForView } from '../knowledge-path.js';
import { lettersToCsv, LETTER_EXPORT_COLUMNS } from '../export.js';
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
                assert(lettersToCsv([]) === LETTER_EXPORT_COLUMNS.join(','), 'Empty export keeps the header');
                const data = await parseCMIF('data/test-hostile.xml');
                const lines = lettersToCsv(data.letters).split('\n');
                assert(lines.length === data.letters.length + 1, `Expected ${data.letters.length + 1} lines, got ${lines.length}`);
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
        }
    ]
};
