// Test Suite: time view, the pure parts (place on the axis, resolution by length of period, sides
// by central person, letters of a period, bins, the start of the former chronicle). The expected
// counts of the Hugo Schuchardt Archiv come from a separate filter over the data file, written
// without the functions under test.

import { assert } from './test-runner.js';
import { axisInterval, timeResolution, letterSide, periodLetters, binLetters, chronicleStart, LETTER_LIMIT } from '../views/timeline-view.js';
import { isMultiYearSpan } from '../utils.js';

let hsa = null;
async function hsaLetters() {
    if (!hsa) hsa = (await (await fetch('data/hsa-letters.json')).json()).letters;
    return hsa;
}

// The letters of one year with a place on the axis, counted without axisInterval
function independentYearCount(letters, first, last) {
    return letters.filter(l => l.year && l.year >= first && l.year <= last && l.date
        && !l.dateImplausible && !l.dateBound && l.datePrecision !== 'unknown' && !isMultiYearSpan(l)).length;
}

const person = (id, name) => ({ id, name });

export const TimeTests = {
    name: 'Zeit',

    setup() {},

    tests: [
        {
            name: 'axisInterval: Tag, Monat, Jahr und Spanne decken ihre Tage, ohne Platz bleibt null',
            run() {
                const day = axisInterval({ date: '1912-02-29', year: 1912, datePrecision: 'day' });
                assert(day.end - day.start === 1 && day.exact, 'ein Tag');
                const month = axisInterval({ date: '1912-02', year: 1912, datePrecision: 'month' });
                assert(month.end - month.start === 29 && !month.exact, `Februar 1912 hat 29 Tage, gezählt ${month.end - month.start}`);
                const year = axisInterval({ date: '1900', year: 1900, datePrecision: 'year' });
                assert(year.end - year.start === 365, `1900 ist kein Schaltjahr, gezählt ${year.end - year.start}`);
                const range = axisInterval({ date: '1900-06-01', dateTo: '1900-06-30', year: 1900, datePrecision: 'range' });
                assert(range.end - range.start === 30, 'Juni als Spanne');
                assert(axisInterval({ date: '1850-01-01', dateTo: '1950-12-31', year: 1850, datePrecision: 'range' }) === null, 'Spanne über Jahre');
                assert(axisInterval({ date: '1990-01-01', year: null, dateImplausible: true, datePrecision: 'day' }) === null, 'unplausibles Jahr');
                assert(axisInterval({ date: '1848', year: null, dateBound: 'notAfter', datePrecision: 'year' }) === null, 'nur eine Grenze');
                assert(axisInterval({ date: null, dateText: 'Ostern', year: null }) === null, 'nur als Text');
            }
        },
        {
            name: 'timeResolution: wenige Briefe einzeln, viele in Abschnitten, die feinsten noch lesbaren',
            run() {
                assert(timeResolution(4, 600, 900).level === 'letters', 'vier Briefe über fünfzig Jahre einzeln');
                assert(timeResolution(LETTER_LIMIT, 792, 900).level === 'letters', 'an der Grenze einzeln');
                assert(timeResolution(3000, 12, 320).level === 'letters', 'ein Jahr immer einzeln');
                const decades = timeResolution(11000, 69 * 12, 900);
                assert(decades.level === 'bins' && decades.binMonths === 3, `Jahrzehnte breit je Quartal, erhalten ${decades.binMonths}`);
                const phone = timeResolution(11000, 69 * 12, 320);
                assert(phone.binMonths === 12, `Jahrzehnte schmal je Jahr, erhalten ${phone.binMonths}`);
                const years = timeResolution(1319, 6 * 12, 900);
                assert(years.binMonths === 1, `sechs Jahre je Monat, erhalten ${years.binMonths}`);
            }
        },
        {
            name: 'letterSide: von der zentralen Person oben, an sie unten, zwischen anderen für sich',
            run() {
                const a = person('A', 'Anna');
                const b = person('B', 'Bert');
                const c = person('C', 'Clara');
                assert(letterSide({ sender: a, recipient: b }, 'A') === 'out', 'A schreibt');
                assert(letterSide({ sender: b, recipient: a }, 'A') === 'in', 'A empfängt');
                assert(letterSide({ sender: b, recipients: [c, a], recipient: c }, 'A') === 'in', 'A unter mehreren Empfängern');
                assert(letterSide({ sender: b, recipient: c }, 'A') === 'other', 'ohne A');
                assert(letterSide({ sender: b, recipient: c }, null) === 'all', 'ohne zentrale Person eine Seite');
            }
        },
        {
            name: 'periodLetters: HSA 1912 und 1900 bis 1905 wie eine getrennte Zählung der Datei',
            async run() {
                const letters = await hsaLetters();
                const y1912 = periodLetters(letters, { start: 1912, end: 1912 }).length;
                const expected1912 = independentYearCount(letters, 1912, 1912);
                assert(y1912 === expected1912, `1912: ${y1912} statt ${expected1912}`);
                const span = periodLetters(letters, { start: 1900, end: 1905 }).length;
                const expectedSpan = independentYearCount(letters, 1900, 1905);
                assert(span === expectedSpan, `1900 bis 1905: ${span} statt ${expectedSpan}`);
            }
        },
        {
            name: 'binLetters: HSA 1900 bis 1905 je Monat, Abschnitte und nicht Zugeordnete ergeben alle Briefe',
            async run() {
                const letters = await hsaLetters();
                const entries = periodLetters(letters, { start: 1900, end: 1905 })
                    .map(letter => ({ letter, iv: axisInterval(letter), side: 'all', lang: 'de' }));
                const { bins, unplaced } = binLetters(entries, { startYear: 1900, endYear: 1905, binMonths: 1 });
                const counted = bins.reduce((sum, b) => sum + b.total, 0);
                const left = Object.values(unplaced).reduce((sum, n) => sum + n, 0);
                assert(bins.length === 72, `${bins.length} Monate`);
                assert(counted + left === entries.length, `${counted} + ${left} statt ${entries.length}`);
                const dayOrMonth = entries.filter(e => ['day', 'month'].includes(e.letter.datePrecision)).length;
                assert(counted === dayOrMonth, `in Monaten ${counted}, tages- oder monatsgenau ${dayOrMonth}`);
                assert(unplaced.year === entries.length - dayOrMonth, 'die Jahresdaten bleiben ohne Monat');
            }
        },
        {
            name: 'chronicleStart: HSA beginnt mit dem ersten Jahr und endet vor der Grenze der Einzelbriefe',
            async run() {
                const letters = await hsaLetters();
                const start = chronicleStart(letters);
                const first = Math.min(...letters.filter(l => axisInterval(l)).map(l => l.year));
                assert(start.start === first, `Beginn ${start.start} statt ${first}`);
                const inside = independentYearCount(letters, start.start, start.end);
                const next = independentYearCount(letters, start.start, start.end + 1);
                assert(inside <= LETTER_LIMIT && next > LETTER_LIMIT, `${start.start} bis ${start.end}: ${inside}, ein Jahr mehr ${next}`);
                assert(chronicleStart([]) === null, 'ohne Briefe kein Beginn');
            }
        }
    ]
};
