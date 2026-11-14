// Test Suite: the one selection of all views, its sentence in the sidebar, the letters between two
// persons, the year picked in the space-time view and the count line of the letters drawer

import { assert } from './test-runner.js';
import { state, isLetterBetween } from '../state-manager.js';
import { selectionMarks } from '../views/view-support.js';
import { drawerCountText } from '../views/letters-drawer.js';
import { LETTER_FEATURES, languageLabel } from '../constants.js';
import { personKey, placeKey, letterRecipients, isMultiYearSpan } from '../utils.js';

let hsa = null;
async function loadHsa() {
    if (!hsa) hsa = await (await fetch('data/hsa-letters.json')).json();
    return hsa;
}

// The pair of persons with the most letters between them, counted here without the state manager
function busiestPair(letters) {
    const pairs = new Map();
    for (const letter of letters) {
        const from = personKey(letter.sender);
        for (const to of new Set(letterRecipients(letter).map(personKey))) {
            if (!from || !to || to === from) continue;
            const key = [from, to].sort().join('\u0000');
            pairs.set(key, (pairs.get(key) || 0) + 1);
        }
    }
    const [key, count] = [...pairs].sort((a, b) => b[1] - a[1])[0];
    const [a, b] = key.split('\u0000');
    return { a, b, count };
}

export const SelectionTests = {
    name: 'Auswahl und Briefleiste',

    setup() {},

    tests: [
        {
            name: 'isLetterBetween: nur Briefe, die einer der beiden dem anderen schrieb',
            run() {
                const person = name => ({ name });
                const letter = (from, ...to) => ({ sender: person(from), recipient: person(to[0]), recipients: to.map(person) });
                assert(isLetterBetween(letter('A', 'B'), 'A', 'B'), 'A an B');
                assert(isLetterBetween(letter('B', 'A'), 'A', 'B'), 'B an A');
                assert(isLetterBetween(letter('A', 'C', 'B'), 'A', 'B'), 'A an C und B');
                assert(!isLetterBetween(letter('A', 'C'), 'A', 'B'), 'A an C ist kein Brief zwischen A und B');
                assert(!isLetterBetween(letter('C', 'A', 'B'), 'A', 'B'), 'C an beide ist kein Brief zwischen A und B');
                assert(!isLetterBetween({ sender: null, recipient: null }, 'A', 'B'), 'Brief ohne Personen');
            }
        },
        {
            name: 'Person und Partner: die Auswahl zählt die Briefe zwischen beiden wie die Daten',
            async run() {
                const data = await loadHsa();
                state.setData(data);
                const { a, b, count } = busiestPair(data.letters);
                state.resetFilters();
                state.updateFilters({ person: a, partner: b });
                const shown = state.getFilteredLetters().length;
                assert(shown === count, `Auswahl ${shown}, gezählt ${count}`);
                state.updateFilters({ person: b, partner: a });
                assert(state.getFilteredLetters().length === count, 'die Reihenfolge der beiden ändert nichts');
                state.resetFilters();
            }
        },
        {
            name: 'URL: Partner nur neben einer Person, gewähltes Jahr und offene Leiste überleben den Link',
            async run() {
                const data = await loadHsa();
                state.setData(data);
                const { a, b } = busiestPair(data.letters);
                state.fromURLParams(new URLSearchParams({ person: a, partner: b, year: '1900', drawer: '1', view: 'spacetime' }));
                const params = state.toURLParams();
                assert(params.get('person') === a && params.get('partner') === b, 'Person und Partner');
                assert(params.get('year') === '1900' && state.filters.year === 1900, 'gewähltes Jahr');
                assert(params.get('drawer') === '1' && state.ui.drawerOpen === true, 'offene Leiste');
                state.fromURLParams(new URLSearchParams({ partner: b }));
                assert(state.filters.partner === null, 'ein Partner ohne Person gilt nicht');
                assert(state.ui.drawerOpen === false, 'ohne drawer=1 ist die Leiste zu');
                state.resetFilters();
            }
        },
        {
            name: 'Gewähltes Jahr: die Briefe dieses Jahrs ohne Spannen über mehrere Jahre, der Zeitraum bleibt',
            async run() {
                const data = await loadHsa();
                state.setData(data);
                state.resetFilters();
                state.updateFilters({ year: 1900 });
                const expected = data.letters.filter(l => l.year === 1900 && !isMultiYearSpan(l)).length;
                assert(state.getFilteredLetters().length === expected, `${state.getFilteredLetters().length} statt ${expected}`);
                assert(state.filters.temporal === null, 'der Zeitraum ist nicht gesetzt');
                state.resetFilters();
                assert(state.filters.year === null, 'Zurücksetzen hebt das Jahr auf');
            }
        },
        {
            name: 'selectionMarks: ein Satz in fester Ordnung, Person und Partner mit „und“',
            async run() {
                const data = await loadHsa();
                const { a, b } = busiestPair(data.letters);
                const place = data.letters.find(l => l.place_sent?.name && l.place_sent?.geonames_id).place_sent;
                const subject = data.letters.find(l => l.mentions?.subjects?.length).mentions.subjects[0];
                const feature = LETTER_FEATURES[0].key;
                const marks = selectionMarks({
                    person: a, partner: b, place: placeKey(place), temporal: { min: 1900, max: 1905 }, year: 1902,
                    languages: ['fr'], subject: subject.uri || subject.id || subject.label, features: [feature],
                    quality: { preciseDates: true }
                }, data.letters);
                const keys = marks.map(m => m.key);
                const order = ['person', 'partner', 'place', 'time', 'year', 'languages', 'subject', `feature:${feature}`, 'quality:preciseDates'];
                assert(JSON.stringify(keys) === JSON.stringify(order), keys.join(' '));
                assert(marks[0].joiner === '' && marks[1].joiner === ' und ' && marks[2].joiner === ', ', 'Verbindungen');
                assert(marks[2].label === place.name, `Ort ${marks[2].label}`);
                assert(marks[3].label === '1900–1905' && marks[4].label === '1902', 'Zeitraum und Jahr');
                assert(marks[5].label === languageLabel('fr'), `Sprache ${marks[5].label}`);
                assert(marks[6].label === subject.label, `Thema ${marks[6].label}`);
                const nameOf = key => [...data.letters.flatMap(l => [l.sender, ...letterRecipients(l)])].find(p => personKey(p) === key)?.name;
                assert(marks[0].label === nameOf(a) && marks[1].label === nameOf(b), `Namen ${marks[0].label}, ${marks[1].label}`);
            }
        },
        {
            name: 'selectionMarks: Sprachen gezählt ab vier, keine Sprache, ohne Jahr, ohne Filter kein Satz',
            run() {
                const many = selectionMarks({ languages: ['de', 'fr', 'it', 'es'] }, []);
                assert(many[0].label === '4 Sprachen', many[0].label);
                const two = selectionMarks({ languages: ['de', 'fr'] }, []);
                assert(two[0].label === `${languageLabel('de')} oder ${languageLabel('fr')}`, two[0].label);
                assert(selectionMarks({ languages: [] }, [])[0].label === 'keine Sprache', 'leere Auswahl');
                assert(selectionMarks({ temporal: { undated: true } }, [])[0].label === 'ohne Jahr', 'ohne Jahr');
                assert(selectionMarks({ temporal: { min: 1900, max: 1900 } }, [])[0].label === '1900', 'ein Jahr');
                const none = { temporal: null, year: null, languages: null, person: null, partner: null, subject: null, place: null, features: null, quality: { preciseDates: false, knownPersons: false, locatedPlaces: false } };
                assert(selectionMarks(none, []).length === 0, 'ohne Filter keine Marke');
                assert(selectionMarks({ partner: 'B' }, []).length === 0, 'ein Partner ohne Person ist keine Marke');
            }
        },
        {
            name: 'drawerCountText: Zahl der Auswahl wie die Zeile sie sagt',
            run() {
                assert(drawerCountText(11576, 11576, false) === '11.576 Briefe', drawerCountText(11576, 11576, false));
                assert(drawerCountText(312, 11576, true) === '312 von 11.576 Briefen', drawerCountText(312, 11576, true));
                assert(drawerCountText(1, 1, false) === '1 Brief', drawerCountText(1, 1, false));
                assert(drawerCountText(0, 11576, true) === '0 von 11.576 Briefen', drawerCountText(0, 11576, true));
            }
        }
    ]
};
