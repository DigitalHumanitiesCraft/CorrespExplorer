// Summary of a dataset for the figure of the start page: which statements of the data model its
// letters carry, and the small aggregates the figure draws for each. One definition for every
// dataset: the tutorial and a local edition are summarised in the browser from the explorer's own
// parser output, the Hugo Schuchardt Archiv by preprocessing/build_examples.py, which ports this
// file rule by rule (tests/browser/smoke.py compares both on the archive).

import { personKey, letterRecipients, placeKey, isKnownPlace } from './utils.js';
import { NO_LANGUAGE } from './constants.js';

// A person on at least this share of the letters stands in the centre of the correspondence
// circle, the rule of findEgo() in views/network-view.js
const EGO_SHARE = 0.5;
const TOP_PERSONS = 24;
const TOP_MENTIONS = 3;

/**
 * The statements of the model and the test that tells whether a letter carries them. The order is
 * the order of the figure; `band` names the layer of the model the statement belongs to.
 */
export const STATEMENTS = [
    { key: 'persons', band: 'core', test: l => Boolean(personKey(l.sender)) || letterRecipients(l).some(p => personKey(p)) },
    { key: 'place', band: 'core', test: l => isKnownPlace(l.place_sent) },
    { key: 'date', band: 'core', test: l => Boolean(l.year) },
    { key: 'link', band: 'core', test: l => Boolean(l.url) },
    { key: 'language', band: 'extension', test: l => Boolean(l.language?.code) },
    { key: 'mentionsPerson', band: 'extension', test: l => (l.mentions?.persons?.length || 0) > 0 },
    { key: 'mentionsPlace', band: 'extension', test: l => (l.mentions?.places?.length || 0) > 0 },
    { key: 'mentionsSubject', band: 'extension', test: l => (l.mentions?.subjects?.length || 0) > 0 },
    { key: 'postmark', band: 'record', test: l => Boolean(l.postmark) },
    { key: 'address', band: 'record', test: l => Boolean(l.address) },
    { key: 'signature', band: 'record', test: l => Boolean(l.signature) },
    { key: 'records', band: 'record', test: l => (l.records?.length || 0) > 1 },
    { key: 'inferred', band: 'record', test: l => Boolean(l.dateInferred || l.place_sent?.inferred) }
];

// Ties break on the key by code units, as Python compares strings, so both summaries agree
const byCount = (a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
const round = value => Math.round(value * 1000) / 1000;

/**
 * @param {Array} letters - letters in the explorer's model (cmif-parser.js or hsa-letters.json)
 * @returns {Object} the summary the figure draws
 */
export function summarizeLetters(letters) {
    const coverage = {};
    STATEMENTS.forEach(s => { coverage[s.key] = 0; });
    const persons = new Map();
    const pairs = new Map();
    const places = new Map();
    const knownPlaces = new Set();
    const languages = {};
    const perYear = new Map();
    const mentioned = { persons: new Map(), places: new Map(), subjects: new Map() };
    let record = null;
    let recordScore = -1;

    letters.forEach(letter => {
        let score = 0;
        STATEMENTS.forEach(s => {
            if (s.test(letter)) { coverage[s.key]++; score++; }
        });
        if (score > recordScore) { record = letter; recordScore = score; }

        // A person counts once per letter, also when named as sender and recipient
        const senderKey = personKey(letter.sender);
        const seen = new Map();
        [letter.sender, ...letterRecipients(letter)].forEach(person => {
            const key = personKey(person);
            if (key && !seen.has(key)) seen.set(key, person.name || key);
        });
        seen.forEach((name, key) => {
            const entry = persons.get(key) || { key, name, count: 0 };
            entry.count++;
            persons.set(key, entry);
        });
        if (senderKey) {
            new Set(letterRecipients(letter).map(personKey).filter(k => k && k !== senderKey)).forEach(recipientKey => {
                const pair = senderKey < recipientKey ? `${senderKey}\u0000${recipientKey}` : `${recipientKey}\u0000${senderKey}`;
                pairs.set(pair, (pairs.get(pair) || 0) + 1);
            });
        }

        const place = letter.place_sent;
        if (isKnownPlace(place)) knownPlaces.add(placeKey(place));
        if (Number.isFinite(place?.lat) && Number.isFinite(place?.lon)) {
            const key = placeKey(place);
            const entry = places.get(key) || { key, lat: round(place.lat), lon: round(place.lon), count: 0 };
            entry.count++;
            places.set(key, entry);
        }

        const code = letter.language?.code || NO_LANGUAGE;
        languages[code] = (languages[code] || 0) + 1;
        if (letter.year) {
            const counts = perYear.get(letter.year) || {};
            counts[code] = (counts[code] || 0) + 1;
            perYear.set(letter.year, counts);
        }

        countMentions(mentioned.persons, letter.mentions?.persons, p => personKey(p), p => p.name);
        countMentions(mentioned.places, letter.mentions?.places, p => placeKey(p), p => p.name);
        countMentions(mentioned.subjects, letter.mentions?.subjects, s => s.uri || s.label, s => s.label);
    });

    const ranked = [...persons.values()].sort(byCount);
    const top = ranked[0];
    const ego = top && top.count >= letters.length * EGO_SHARE ? top.key : null;
    const circle = ranked.slice(0, TOP_PERSONS);
    const index = new Map(circle.map((p, i) => [p.key, i]));
    const edges = [];
    pairs.forEach((count, pair) => {
        const [a, b] = pair.split('\u0000');
        if (index.has(a) && index.has(b)) edges.push([Math.min(index.get(a), index.get(b)), Math.max(index.get(a), index.get(b)), count]);
    });
    edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const years = [...perYear.keys()].sort((a, b) => a - b);

    return {
        letters: letters.length,
        first: years[0] ?? null,
        last: years[years.length - 1] ?? null,
        coverage,
        persons: persons.size,
        ego: ego === null ? null : 0,
        circle: circle.map(p => [p.name, p.count]),
        edges,
        places: knownPlaces.size,
        located: [...places.values()].sort(byCount).map(p => [p.lat, p.lon, p.count]),
        languages: Object.fromEntries(Object.entries(languages).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))),
        perYear: years.map(year => [year, perYear.get(year)]),
        mentioned: Object.fromEntries(Object.entries(mentioned).map(([kind, map]) => [kind, {
            distinct: map.size,
            top: [...map.values()].sort(byCount).slice(0, TOP_MENTIONS).map(m => [m.name, m.count])
        }])),
        record: record && describeRecord(record)
    };
}

// A mention counts once per letter
function countMentions(map, list, keyOf, nameOf) {
    const seen = new Set();
    (list || []).forEach(item => {
        const key = keyOf(item);
        if (!key || seen.has(key)) return;
        seen.add(key);
        const entry = map.get(key) || { key, name: nameOf(item) || key, count: 0 };
        entry.count++;
        map.set(key, entry);
    });
}

// The letter that carries most statements, as the record in the centre of the figure: the first
// such letter in the order of the source
function describeRecord(letter) {
    const first = list => (list && list.length ? list[0] : null);
    return {
        sender: letter.sender?.name || null,
        recipient: first(letterRecipients(letter))?.name || null,
        place: isKnownPlace(letter.place_sent) ? letter.place_sent.name : null,
        placeInferred: Boolean(letter.place_sent?.inferred),
        date: letter.date || null,
        dateText: letter.dateText || null,
        dateInferred: Boolean(letter.dateInferred),
        language: letter.language?.code || null,
        languageLabel: letter.language?.label || null,
        url: letter.url || null,
        mentionsPerson: first(letter.mentions?.persons)?.name || null,
        mentionsPlace: first(letter.mentions?.places)?.name || null,
        mentionsSubject: first(letter.mentions?.subjects)?.label || null,
        postmark: letter.postmark || null,
        address: letter.address || null,
        signature: letter.signature || null,
        records: letter.records?.length || 1
    };
}
