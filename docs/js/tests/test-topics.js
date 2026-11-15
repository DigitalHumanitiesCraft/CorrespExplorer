// Test Suite: topics view, the pure parts: profiles per subject, peak, order of the grid's rows,
// search, marks, the grid's shade steps, and the treemap's tail rule, groups and tail labels

import { assert } from './test-runner.js';
import { subjectProfiles, orderSubjects, matchSubjects, topEntries, shadeStep, splitTail, mapGroups, restLabel, restShare } from '../views/topics-view.js';

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
            name: 'orderSubjects: Sprachen als eigene Gruppe nach den übrigen Themen (US-44)',
            run() {
                const subjects = [
                    { key: 'french', label: 'Französisch', kind: 'language', total: 9, peak: 1900, first: 1870 },
                    { key: 'travel', label: 'Reisen', kind: 'topic', total: 3, peak: 1880, first: 1880 },
                    { key: 'basque', label: 'Baskisch', kind: 'language', total: 7, peak: 1885, first: 1880 },
                    { key: 'review', label: 'Rezension', kind: 'topic', total: 5, peak: 1910, first: 1890 }
                ];
                const keys = list => list.map(s => s.key).join(' ');
                assertEqual(keys(orderSubjects(subjects, 'size', 10, { languagesApart: true })), 'review travel french basque', 'Umfang je Gruppe');
                assertEqual(keys(orderSubjects(subjects, 'peak', 10, { languagesApart: true })), 'travel review basque french', 'Höhepunkt je Gruppe');
                assertEqual(keys(orderSubjects(subjects, 'size', 10)), 'french basque review travel', 'ohne Trennung wie bisher');
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
            name: 'shadeStep: eine feste Skala für jede Figur, leere Jahre bleiben leer',
            run() {
                const steps = [0, 1, 2, 3, 4, 9, 10, 68].map(shadeStep).join();
                assertEqual(steps, '0,1,2,2,3,3,4,4', 'Stufen für 0, 1, 2, 3, 4, 9, 10, 68');
            }
        },
        {
            name: 'splitTail: Flächen summieren die Nennungen, Einzelbriefe und kleine Flächen gehen in den Rest',
            run() {
                const s = (key, total) => ({ key, label: key, total });
                const subjects = [s('a', 10), s('b', 5), s('c', 1), s('d', 1), s('e', 2)];
                const split = splitTail(subjects, 1000, { minArea: 100 });
                assertEqual(split.shown.map(x => x.key).join(), 'a,b,e', 'eigene Flächen');
                assertEqual(split.rest.map(x => x.key).join(), 'c,d', 'Rest');
                const sum = list => list.reduce((n, x) => n + x.total, 0);
                assertEqual(sum(split.shown) + sum(split.rest), split.mentions, 'Summe');
                assertEqual(split.mentions, 19, 'Nennungen');
                // 2 of 19 mentions on 1000 px² are 105 px²: with a larger minimum it joins the rest
                assertEqual(splitTail(subjects, 1000, { minArea: 110 }).rest.map(x => x.key).join(), 'e,c,d', 'Schwelle');
                assertEqual(splitTail(subjects, 1000, { minArea: 10, singlesApart: false }).rest.length, 0, 'geöffneter Rest');
            }
        },
        {
            name: 'mapGroups: Gruppen nur nach der Art, die in den Daten vorkommt, Anteil am Ganzen',
            run() {
                const s = (key, total, kind) => ({ key, label: key, total, kind });
                const groups = mapGroups([s('a', 6, 'topic'), s('b', 3, 'language'), s('c', 1, 'language')], 1000, { minArea: 250 });
                assertEqual(groups.map(g => g.name).join(), 'Sprachen,Übrige Themen', 'zwei Gruppen');
                // b has 3 of 10 mentions of the whole map, 300 px², not 3 of 4 of its group
                assertEqual(groups[0].shown.map(x => x.key).join(), 'b', 'Sprache mit eigener Fläche');
                assertEqual(groups[0].rest.map(x => x.key).join(), 'c', 'Sprache im Rest');
                assertEqual(mapGroups([s('a', 6, 'topic')], 1000).length, 1, 'eine Art, keine Gruppen');
                assertEqual(mapGroups([s('a', 6, 'topic')], 1000)[0].name, null, 'ohne Gruppenname');
            }
        },
        {
            name: 'restLabel und restShare: nennen Zahl, Spanne und Anteil der Nennungen',
            run() {
                const s = total => ({ total });
                assertEqual(restLabel([s(1), s(1)]), '2 weitere Themen mit je einem Brief', 'Einzelbriefe');
                assertEqual(restLabel([s(1)]), '1 weiteres Thema mit einem Brief', 'eins');
                assertEqual(restLabel([s(1), s(2), s(2)]), '3 weitere Themen mit je 1 bis 2 Briefen', 'Spanne');
                assertEqual(restShare([s(1), s(2), s(2)], 23020), 'zusammen 5 von 23.020 Nennungen', 'Anteil am Ganzen');
            }
        },
        {
            name: 'Raster und Anteile: HSA in Paris 1882 bis 1892 stimmt mit einer unabhängigen Zählung überein',
            async run() {
                const data = await (await fetch('data/hsa-letters.json')).json();
                // The filter of the case: sending place Paris (GeoNames 2988507), years 1882 to 1892
                const letters = data.letters.filter(l => l.place_sent?.geonames_id === '2988507' && l.year >= 1882 && l.year <= 1892);
                const profiles = subjectProfiles(letters);
                const sum = profiles.subjects.reduce((n, s) => n + s.total, 0);
                // Counted with Python over docs/data/hsa-letters.json on 2026-11-14
                assertEqual(letters.length, 257, 'Briefe');
                assertEqual(profiles.subjects.length, 194, 'Themen');
                assertEqual(sum, 412, 'Nennungen, die Summe der Flächen');
                assertEqual(profiles.subjects.filter(s => s.total === 1).length, 117, 'Themen mit einem Brief');
                assertEqual(profiles.maxYearCount, 8, 'größte Jahreszahl');
                const top = [...profiles.subjects].sort((a, b) => b.total - a.total)[0];
                assertEqual(`${top.label} ${top.total}`, 'Spanisch 20', 'größtes Thema');
                const all = subjectProfiles(data.letters).subjects;
                assertEqual(all.reduce((n, s) => n + s.total, 0), 23020, 'Nennungen im ganzen Bestand');
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
