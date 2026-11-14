// Test Suite: the letter list. Places off the time axis, the direction of a letter seen from the
// person of the dataset, the groups of each order and the figure of the selection, with three
// values checked against an independent count of hsa-letters.json

import { assert } from './test-runner.js';
import { offAxisReason, compareByDate, letterDirection, sortLetters, groupLetters, selectionProfile } from '../views/letters-view.js';
import { findEgo } from '../views/network-view.js';

const assertEqual = (actual, expected, label) => assert(actual === expected, `${label}: ${actual} statt ${expected}`);

const person = (name, id) => ({ name, id });
const letter = (date, extra = {}) => ({ date, sender: person('A', 'a'), recipient: person('B', 'b'), ...extra });

let hsa = null;
async function loadHsa() {
    if (!hsa) hsa = await (await fetch('data/hsa-letters.json')).json();
    return hsa;
}

export const LettersTests = {
    name: 'Briefliste',

    setup() {},

    tests: [
        {
            name: 'offAxisReason: ohne Datum, nur als Text, unplausibel, nur Grenze, sonst null',
            run() {
                assertEqual(offAxisReason(letter(null)), 'undated', 'ohne Datum');
                assertEqual(offAxisReason(letter(null, { dateText: 'Anfang Mai' })), 'dateText', 'nur als Text');
                assertEqual(offAxisReason(letter('1290-01-01', { dateImplausible: true })), 'dateImplausible', 'unplausibel');
                assertEqual(offAxisReason(letter('1848', { dateBound: 'notAfter' })), 'dateBound', 'Grenze');
                assertEqual(offAxisReason(letter('1900-05-01')), null, 'datiert');
            }
        },
        {
            name: 'compareByDate: Briefe ohne Platz auf der Zeitachse stehen in beiden Richtungen am Ende, nach Grund geordnet',
            run() {
                const letters = [letter(null), letter('1901-01-01'), letter('1848', { dateBound: 'notBefore' }), letter('1900-01-01'), letter(null, { dateText: 'Mai' })];
                const desc = [...letters].sort((a, b) => compareByDate(a, b, -1)).map(l => l.date || l.dateText || 'x');
                const asc = [...letters].sort((a, b) => compareByDate(a, b, 1)).map(l => l.date || l.dateText || 'x');
                assertEqual(desc.join(' '), '1901-01-01 1900-01-01 1848 Mai x', 'absteigend');
                assertEqual(asc.join(' '), '1900-01-01 1901-01-01 1848 Mai x', 'aufsteigend');
            }
        },
        {
            name: 'letterDirection: an, von, weitere Empfänger und Briefe ohne die Person',
            run() {
                const c = person('C', 'c');
                const out = letterDirection({ sender: c, recipients: [person('A', 'a'), person('B', 'b')] }, 'c');
                assertEqual(out.dir, 'to', 'C schreibt');
                assertEqual(out.others.map(p => p.id).join(), 'a,b', 'an A und B');
                const back = letterDirection({ sender: person('A', 'a'), recipients: [person('B', 'b'), c] }, 'c');
                assertEqual(back.dir, 'from', 'C empfängt');
                assertEqual(back.others[0].id, 'a', 'von A');
                assertEqual(back.also.map(p => p.id).join(), 'b', 'auch an B');
                assertEqual(letterDirection(letter('1900'), 'c'), null, 'Brief ohne C');
                assertEqual(letterDirection(letter('1900'), null), null, 'ohne Person');
            }
        },
        {
            name: 'groupLetters: Jahre, Monate ab der Schwelle, Gruppen ohne Zeitachse am Ende, jeder Brief genau einmal',
            run() {
                const letters = [
                    ...['1900-01-02', '1900-01-05', '1900-03-01', '1900'].map(d => letter(d)),
                    letter('1901-02-02'),
                    letter(null), letter(null, { dateText: 'Mai' })
                ];
                const sorted = sortLetters(letters, 'date-asc');
                const groups = groupLetters(sorted, 'date-asc', { monthSplit: 3 });
                assertEqual(groups.map(g => `${g.label}/${g.sub}`).join(' '),
                    '1900/ohne Monat 1900/Januar 1900/März 1901/ Datum nur als Text/ Ohne Datum/', 'Gruppen');
                assertEqual(groups.reduce((n, g) => n + g.letters.length, 0), letters.length, 'Summe');
                const byName = groupLetters(sortLetters([letter('1900', { sender: person('Ärger', 'x') }), letter('1900', { sender: null })], 'person-asc'), 'person-asc');
                assertEqual(byName.map(g => g.label).join(' '), 'A Ohne Namen', 'Anfangsbuchstabe gefaltet, ohne Namen am Ende');
            }
        },
        {
            name: 'selectionProfile: leere Jahre bleiben als Spalte, die Spalten ergeben die Auswahl',
            run() {
                const letters = [letter('1900-01-01', { language: { code: 'de' } }), letter('1902-01-01'), letter(null)];
                const columns = selectionProfile(groupLetters(sortLetters(letters, 'date-desc'), 'date-desc'), 'date-desc');
                assertEqual(columns.map(c => `${c.top}:${c.total}`).join(' '), '1900:1 1901:0 1902:1 off:1', 'Spalten');
            }
        },
        {
            name: 'HSA: Spalte 1913, Spalte ohne Jahr und Briefe an und von der Person gegen eine eigene Zählung der Datei',
            async run() {
                const { letters } = await loadHsa();
                const columns = selectionProfile(groupLetters(sortLetters(letters, 'date-desc'), 'date-desc'), 'date-desc');
                const column = top => columns.find(c => c.top === top)?.total;
                assertEqual(column('1913'), letters.filter(l => (l.date || '').startsWith('1913')).length, 'Briefe 1913');
                assertEqual(column('off'), letters.filter(l => !l.date).length, 'Briefe ohne Datum');
                assertEqual(columns.reduce((n, c) => n + c.total, 0), letters.length, 'Summe der Spalten');
                const ego = findEgo(letters);
                const directions = letters.map(l => letterDirection(l, ego.id)?.dir);
                assertEqual(directions.filter(d => d === 'to').length, letters.filter(l => l.sender?.id === ego.id).length, 'Briefe der Person');
                assertEqual(directions.filter(d => d === 'from').length,
                    letters.filter(l => l.sender?.id !== ego.id && [l.recipient, ...(l.recipients || [])].some(r => r?.id === ego.id)).length, 'Briefe an die Person');
            }
        }
    ]
};
