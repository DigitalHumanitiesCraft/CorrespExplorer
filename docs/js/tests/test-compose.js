// Test Suite: the composition of the start figure from what a dataset holds (start-compose.js)

import { assert } from './test-runner.js';
import { composeFigure, missingSentence } from '../start-compose.js';

const assertEqual = (actual, expected, label) => assert(actual === expected, `${label}: ${actual} statt ${expected}`);
const figures = composition => composition.bands.map(b => `${b.key}:${b.items.map(i => `${i.key}=${i.figure}`).join(',')}`).join(' | ');

// Coverage of every statement, zero unless given
const summary = (coverage, extra = {}) => ({
    letters: 100,
    dated: 100,
    located: [[48.2, 16.4, 10]],
    mentionedLocated: [],
    postmarkYears: [],
    coverage: {
        persons: 100, place: 0, date: 0, link: 0, language: 0, mentionsPerson: 0, mentionsPlace: 0,
        mentionsSubject: 0, postmark: 0, address: 0, signature: 0, records: 0, inferred: 0, ...coverage
    },
    ...extra
});

export const ComposeTests = {
    name: 'Startgrafik: Zusammensetzung',

    setup() {},

    tests: [
        {
            name: 'reines CMIF: nur der Kern, Erweiterungen und Briefsätze im einen Satz',
            run() {
                const c = composeFigure(summary({ place: 100, date: 100, link: 100 }));
                assertEqual(figures(c), 'core:persons=circle,place=map,date=profile', 'Bänder');
                assertEqual(c.sentence, 'Dieser Bestand trägt keine Sprachangaben, erwähnten Personen, erwähnten Orte, Themen und Angaben aus TEI-Briefsätzen wie Poststempel, Anschrift und Signatur.', 'Satz');
            }
        },
        {
            name: 'Briefsätze ohne Koordinaten: Rangfolge der Orte, eigenes Band der Überlieferung',
            run() {
                const c = composeFigure(summary(
                    { place: 90, date: 80, language: 95, postmark: 10, address: 30, signature: 100, records: 20, inferred: 15 },
                    { located: [], postmarkYears: [[1930, 4]] }
                ), { lettersInBrowser: true });
                assertEqual(figures(c), 'core:persons=circle,place=ranking,date=letters | record:postmark=years,records=histogram,features=shares', 'Bänder');
                assertEqual(c.bands[1].items[2].keys.join(','), 'address,signature,inferred', 'Merkmale ohne eigene Figur');
                assert(c.sentence.includes('Koordinaten der Orte') && c.sentence.includes('Links zur Edition'), c.sentence);
                assert(!c.sentence.includes('Sprachangaben'), 'die Sprache färbt die Zeitfigur und fehlt nicht');
            }
        },
        {
            name: 'erweiterter Bestand: Erwähnungen als Bilder, die Sprache ohne eigene Figur',
            run() {
                const c = composeFigure(summary(
                    { place: 100, date: 100, link: 100, language: 100, mentionsPerson: 50, mentionsPlace: 30, mentionsSubject: 60 },
                    { mentionedLocated: [[48.8, 2.3, 3]] }
                ));
                assertEqual(figures(c), 'core:persons=circle,place=map,date=profile | extension:mentionsPerson=ring,mentionsPlace=map,mentionsSubject=profiles', 'Bänder');
                assertEqual(c.sentence, 'Dieser Bestand trägt keine Angaben aus TEI-Briefsätzen wie Poststempel, Anschrift und Signatur.', 'Satz');
            }
        },
        {
            name: 'ohne Datum steht die Sprache als eigener Balken; viele Briefe zeigen das Profil',
            run() {
                const c = composeFigure(summary({ language: 100 }));
                assertEqual(figures(c), 'core:persons=circle | extension:language=bar', 'Bänder');
                const many = composeFigure(summary({ date: 100 }, { dated: 5000 }), { lettersInBrowser: true });
                assertEqual(many.bands[0].items[1].figure, 'profile', 'viele Briefe');
            }
        },
        {
            name: 'erwähnte Orte ohne Koordinaten: Rangfolge und genau benannte Lücke',
            run() {
                const c = composeFigure(summary({ place: 100, date: 100, link: 100, language: 100, mentionsPlace: 5 }));
                assertEqual(c.bands[1].items[0].figure, 'ranking', 'Figur');
                assert(c.sentence.includes('Koordinaten der erwähnten Orte'), c.sentence);
            }
        },
        {
            name: 'missingSentence: leer ohne Lücke, ein Glied ohne Komma',
            run() {
                assertEqual(missingSentence([]), '', 'leer');
                assertEqual(missingSentence(['mentionsSubject']), 'Dieser Bestand trägt keine Themen.', 'eins');
            }
        }
    ]
};
