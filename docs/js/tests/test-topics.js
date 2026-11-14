// Test Suite: topics view, the pure parts (profiles per subject, peak, order, search, marks)

import { assert } from './test-runner.js';
import { subjectProfiles, orderSubjects, matchSubjects, topEntries } from '../views/topics-view.js';

const assertEqual = (actual, expected, label) => assert(actual === expected, `${label}: ${actual} statt ${expected}`);
const subject = (key, label, category = 'hsa_subject') => ({ uri: key, label, category });
const letter = (year, subjects, extra = {}) => ({ year, mentions: { subjects }, ...extra });

const A = subject('a', 'Ästhetik');
const B = subject('b', 'Baskisch', 'lexvo');
const C = subject('c', 'Chronik');

function fixture() {
    return [
        letter(1880, [A, B]),
        letter(1880, [A, A]),
        letter(1881, [A]),
        letter(1882, [B]),
        letter(1882, [B]),
        letter(null, [B]),
        // A span over several years has no place on the time axis
        letter(1883, [C], { datePrecision: 'range', dateTo: '1885-01-01' }),
        letter(1890, [C]),
        letter(1884, [])
    ];
}

const byKey = profiles => Object.fromEntries(profiles.subjects.map(s => [s.key, s]));

export const TopicsTests = {
    name: 'Themen',

    setup() {},

    tests: [
        {
            name: 'subjectProfiles: ein Thema zählt einmal je Brief, Briefe ohne Jahr nur in der Summe',
            run() {
                const p = byKey(subjectProfiles(fixture()));
                assertEqual(p.a.total, 3, 'Ästhetik');
                assertEqual(p.a.years.get(1880), 2, 'Ästhetik 1880, doppelt genanntes Thema einmal');
                assertEqual(p.b.total, 4, 'Baskisch');
                assertEqual(p.b.undated, 1, 'Baskisch ohne Jahr');
                assertEqual(p.c.undated, 1, 'Spanne zählt als ohne Jahr');
                assertEqual(p.c.years.has(1883), false, 'Spanne nicht im Anfangsjahr');
                assertEqual(p.b.kind, 'language', 'Lexvo ist eine Sprache');
                assertEqual(p.a.kind, 'topic', 'übriges Thema');
            }
        },
        {
            name: 'subjectProfiles: Höhepunkt ist das Jahr mit den meisten Briefen, bei Gleichstand das frühere',
            run() {
                const profiles = subjectProfiles(fixture());
                const p = byKey(profiles);
                assertEqual(p.a.peak, 1880, 'Ästhetik');
                assertEqual(p.b.peak, 1882, 'Baskisch');
                assertEqual(p.c.peak, 1890, 'Chronik');
                assertEqual(p.c.first, 1890, 'erstes Jahr ohne die Spanne');
                const tie = byKey(subjectProfiles([letter(1901, [A]), letter(1899, [A])]));
                assertEqual(tie.a.peak, 1899, 'Gleichstand');
                assertEqual(profiles.maxYearCount, 2, 'größte Jahreszahl');
                assertEqual(profiles.yearMin, 1880, 'erstes Jahr');
                assertEqual(profiles.yearMax, 1890, 'letztes Jahr');
            }
        },
        {
            name: 'orderSubjects: nach Umfang absteigend, nach Höhepunkt in Blöcken der häufigsten',
            run() {
                const subjects = [
                    { key: 'early-small', label: 'e', total: 2, peak: 1850, first: 1850 },
                    { key: 'late-big', label: 'l', total: 9, peak: 1920, first: 1860 },
                    { key: 'mid-big', label: 'm', total: 8, peak: 1890, first: 1870 },
                    { key: 'none', label: 'n', total: 1, peak: null, first: null },
                    { key: 'early-mid', label: 'x', total: 5, peak: 1880, first: 1855 }
                ];
                const keys = list => list.map(s => s.key).join(' ');
                assertEqual(keys(orderSubjects(subjects, 'size', 2)), 'late-big mid-big early-mid early-small none', 'Umfang');
                // Blocks of two by size: [late-big, mid-big], [early-mid, early-small], [none]
                assertEqual(keys(orderSubjects(subjects, 'peak', 2)), 'mid-big late-big early-small early-mid none', 'Höhepunkt');
                assertEqual(keys(orderSubjects(subjects, 'first', 2)), 'late-big mid-big early-small early-mid none', 'erstes Auftreten');
                assertEqual(keys(orderSubjects(subjects, 'peak', 10)), 'early-small early-mid mid-big late-big none', 'ein Block');
            }
        },
        {
            name: 'matchSubjects: Suche ohne Groß- und Kleinschreibung und Diakritika',
            run() {
                const subjects = subjectProfiles(fixture()).subjects;
                assertEqual(matchSubjects(subjects, 'asthetik').map(s => s.key).join(), 'a', 'Ästhetik');
                assertEqual(matchSubjects(subjects, '  ').length, 3, 'leere Suche');
                assertEqual(matchSubjects(subjects, 'xyz').length, 0, 'kein Treffer');
            }
        },
        {
            name: 'topEntries: zählt jeden Eintrag einmal je Brief',
            run() {
                const letters = [{ p: ['x', 'x', 'y'] }, { p: ['x'] }, { p: ['z'] }];
                const top = topEntries(letters, l => l.p.map(k => ({ key: k, name: k })), 2);
                assertEqual(top.map(e => `${e.key}${e.count}`).join(), 'x2,y1', 'Rangfolge');
            }
        },
        {
            name: 'subjectProfiles: HSA stimmt mit einer unabhängigen Zählung überein',
            async run() {
                const data = await (await fetch('data/hsa-letters.json')).json();
                const profiles = subjectProfiles(data.letters);
                const p = byKey(profiles);
                // Counted with Python over docs/data/hsa-letters.json on 2026-11-14: each subject once
                // per letter, a year only for letters dated within one year
                assertEqual(profiles.subjects.length, 1622, 'Zahl der Themen');
                const basque = p['http://lexvo.org/id/iso639-3/eus'];
                assertEqual(basque.total, 698, 'Baskisch Briefe');
                assertEqual(`${basque.peak}:${basque.peakCount}`, '1893:53', 'Baskisch Höhepunkt');
                const zrph = p['https://gams.uni-graz.at/o:hsa.subjects#S.3085'];
                assertEqual(`${zrph.total} ${zrph.first}-${zrph.last} ${zrph.peak}`, '248 1869-1925 1921', 'Zeitschrift für romanische Philologie');
                const s948 = p['https://gams.uni-graz.at/o:hsa.subjects#S.948'];
                assertEqual(`${s948.total} ${s948.undated} ${s948.peak}:${s948.peakCount}`, '627 13 1883:33', 'S.948');
                assertEqual(profiles.maxYearCount, 68, 'größte Jahreszahl');
                assert(profiles.subjects.every(s => s.total === s.undated + [...s.years.values()].reduce((a, b) => a + b, 0)), 'Summe je Thema');
            }
        }
    ]
};
