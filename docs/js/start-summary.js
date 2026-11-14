// Summary of a dataset for the figure of the start page: which statements of the data model its
// letters carry, the small aggregates the figure draws for each, and the example letter with the
// place it takes in every aggregate. One definition for every dataset: one's own data and a local
// edition are summarised in the browser from the explorer's own parser output, the Hugo
// Schuchardt Archiv by preprocessing/build_examples.py, which ports this file rule by rule
// (tests/browser/smoke.py compares both on the archive).

import { personKey, letterRecipients, placeKey, isKnownPlace } from './utils.js';
import { NO_LANGUAGE } from './constants.js';

const TOP_MENTIONS = 3;
// The outer ring of mentioned persons keeps the most frequent; all correspondents are kept
const OUTER_LIMIT = 300;
// Example letters a dataset offers, so the archive, whose letters stay off this page, has some
const EXAMPLES = 12;

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
const compareKeys = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byCount = (a, b) => b.count - a.count || compareKeys(a.key, b.key);
const roundTo = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;
const located = place => Number.isFinite(place?.lat) && Number.isFinite(place?.lon);

// Time of a letter as a fractional year, the rule of letterTime() in views/network-view.js
export function letterTime(letter) {
    if (!letter.year || letter.dateImplausible) return null;
    const m = /^(\d{1,4})-(\d{2})(?:-(\d{2}))?/.exec(letter.date || '');
    if (!m || Number(m[1]) !== letter.year) return letter.year;
    return letter.year + (Number(m[2]) - 1) / 12 + (Number(m[3] || 1) - 1) / 366;
}

function letterParties(letter) {
    const parties = new Map();
    [letter.sender, ...letterRecipients(letter)].forEach(person => {
        const key = personKey(person);
        if (key && !parties.has(key)) parties.set(key, person);
    });
    return parties;
}

/**
 * @param {Array} letters - letters in the explorer's model (cmif-parser.js or hsa-letters.json)
 * @returns {Object} the summary the figure draws
 */
export function summarizeLetters(letters) {
    const coverage = {};
    STATEMENTS.forEach(s => { coverage[s.key] = 0; });
    const persons = new Map();
    const places = new Map();
    const knownPlaces = new Set();
    const languages = {};
    const perYear = new Map();
    const mentioned = { persons: new Map(), places: new Map(), subjects: new Map() };
    const mentionedPlaces = new Map();
    const subjectYears = new Map();
    const hosts = new Map();
    const sendingPlaces = new Map();
    const postmarkYears = new Map();
    const recordCounts = new Map();
    let recordsDiffer = 0;
    const scores = [];

    letters.forEach(letter => {
        let score = 0;
        STATEMENTS.forEach(s => {
            if (s.test(letter)) { coverage[s.key]++; score++; }
        });
        scores.push(score);

        // Persons with their letters and their partners, for the centre of the circle (the rule of
        // mostConnectedPerson() in views/network-view.js)
        const parties = letterParties(letter);
        parties.forEach((person, key) => {
            const entry = persons.get(key) || { key, name: person?.name || key, count: 0, partners: new Set() };
            entry.count++;
            persons.set(key, entry);
        });
        const from = personKey(letter.sender);
        if (from) {
            letterRecipients(letter).forEach(recipient => {
                const to = personKey(recipient);
                if (!to || to === from) return;
                persons.get(from).partners.add(to);
                persons.get(to).partners.add(from);
            });
        }

        const place = letter.place_sent;
        if (isKnownPlace(place)) {
            const key = placeKey(place);
            knownPlaces.add(key);
            const entry = sendingPlaces.get(key) || { key, name: place.name || key, count: 0 };
            entry.count++;
            sendingPlaces.set(key, entry);
        }
        // What the letter records of an edition add: postmarks over the years, records per letter
        if (letter.postmark && letter.year) postmarkYears.set(letter.year, (postmarkYears.get(letter.year) || 0) + 1);
        const records = letter.records?.length || 1;
        recordCounts.set(records, (recordCounts.get(records) || 0) + 1);
        if (letter.recordsDiffer) recordsDiffer++;
        if (located(place)) {
            const key = placeKey(place);
            const entry = places.get(key) || { key, lat: roundTo(place.lat, 3), lon: roundTo(place.lon, 3), count: 0 };
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

        if (letter.url) {
            const host = hostOf(letter.url);
            if (host) hosts.set(host, (hosts.get(host) || 0) + 1);
        }

        countMentions(mentioned.persons, letter.mentions?.persons, p => personKey(p), p => p.name);
        countMentions(mentioned.places, letter.mentions?.places, p => placeKey(p), p => p.name);
        countMentions(mentioned.subjects, letter.mentions?.subjects, s => s.uri || s.label, s => s.label);
        const seenPlaces = new Set();
        (letter.mentions?.places || []).forEach(p => {
            const key = placeKey(p);
            if (!key || seenPlaces.has(key) || !located(p)) return;
            seenPlaces.add(key);
            const entry = mentionedPlaces.get(key) || { key, lat: roundTo(p.lat, 3), lon: roundTo(p.lon, 3), count: 0 };
            entry.count++;
            mentionedPlaces.set(key, entry);
        });
        if (letter.year) {
            new Set((letter.mentions?.subjects || []).map(s => s.uri || s.label).filter(Boolean)).forEach(key => {
                const years = subjectYears.get(key) || new Map();
                years.set(letter.year, (years.get(letter.year) || 0) + 1);
                subjectYears.set(key, years);
            });
        }
    });

    const years = [...perYear.keys()].sort((a, b) => a - b);
    const ego = egoModel(letters, persons);
    const examples = pickExamples(letters, scores);
    const record = examples[0] || null;
    const topSubjects = [...mentioned.subjects.values()].sort(byCount);
    // The profiles of the three most frequent subjects; the subject of the example letter takes the
    // third place where it is not among them, so the letter has its mark in the figure
    const recordSubject = record ? first(record.mentions?.subjects) : null;
    const recordSubjectKey = recordSubject ? recordSubject.uri || recordSubject.label : null;
    const shown = topSubjects.slice(0, TOP_MENTIONS).map(s => s.key);
    if (recordSubjectKey && subjectYears.has(recordSubjectKey) && !shown.includes(recordSubjectKey)) shown.splice(TOP_MENTIONS - 1, 1, recordSubjectKey);

    const summary = {
        letters: letters.length,
        dated: years.reduce((sum, year) => sum + Object.values(perYear.get(year)).reduce((a, b) => a + b, 0), 0),
        first: years[0] ?? null,
        last: years[years.length - 1] ?? null,
        coverage,
        persons: persons.size,
        ego: ego.model,
        places: knownPlaces.size,
        located: [...places.values()].sort(byCount).map(p => [p.lat, p.lon, p.count]),
        languages: Object.fromEntries(Object.entries(languages).sort((a, b) => b[1] - a[1] || compareKeys(a[0], b[0]))),
        perYear: years.map(year => [year, perYear.get(year)]),
        hosts: [...hosts].sort((a, b) => b[1] - a[1] || compareKeys(a[0], b[0])).slice(0, 3),
        placesTop: [...sendingPlaces.values()].sort(byCount).slice(0, 5).map(p => [p.name, p.count]),
        postmarkYears: [...postmarkYears].sort((a, b) => a[0] - b[0]),
        recordCounts: [...recordCounts].sort((a, b) => a[0] - b[0]),
        recordsDiffer,
        mentioned: Object.fromEntries(Object.entries(mentioned).map(([kind, map]) => [kind, {
            distinct: map.size,
            top: [...map.values()].sort(byCount).slice(0, TOP_MENTIONS).map(m => [m.name, m.count])
        }])),
        mentionedLocated: [...mentionedPlaces.values()].sort(byCount).map(p => [p.lat, p.lon, p.count]),
        subjects: shown.map(key => [mentioned.subjects.get(key).name, [...subjectYears.get(key) || []].sort((a, b) => a[0] - b[0])]),
        examples: []
    };
    // What a letter needs to find its marks; kept off the serialised summary
    const context = { centreId: ego.centreId, inner: ego.inner, outer: ego.outer, subjects: shown, locatedKeys: [...places.values()].sort(byCount).map(p => p.key) };
    summary.examples = examples.map(letter => describeRecord(letter, context));
    Object.defineProperty(summary, 'context', { value: context, enumerable: false });
    return summary;
}

/**
 * The example record of any letter of a dataset summarised in this browser
 * @param {Object} letter
 * @param {Object} summary - from summarizeLetters() in this page
 */
export function recordOf(letter, summary) {
    return describeRecord(letter, summary.context);
}

// Example letters: the letters with most kinds of statements first (in the order of the source
// among equals), each a different combination of language, decade and sending place, so stepping
// through them shows different parts of the dataset
function pickExamples(letters, scores) {
    const order = letters.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
    const seen = new Set();
    const picked = [];
    for (const i of order) {
        const letter = letters[i];
        const kind = `${letter.language?.code || NO_LANGUAGE}|${letter.year ? Math.floor(letter.year / 10) : '-'}|${placeKey(letter.place_sent) || '-'}`;
        if (seen.has(kind)) continue;
        seen.add(kind);
        picked.push(letter);
        if (picked.length === EXAMPLES) break;
    }
    return picked;
}

const first = list => (list && list.length ? list[0] : null);

function hostOf(url) {
    try {
        return new URL(url).host || null;
    } catch {
        return null;
    }
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

/**
 * The correspondence circle of the explorer in its data, after buildEgoNetwork() in
 * views/network-view.js: the centre is the person with most correspondents, each correspondent
 * carries its letters with the centre and the time of the first, chords join correspondents who
 * wrote to each other, and the persons named in the centre's letters who are no correspondents of
 * it form the outer ring, each with the exchanges it is named in. Kept: the strongest of each.
 */
function egoModel(letters, persons) {
    let centre = null;
    persons.forEach(p => {
        if (!centre || p.partners.size > centre.partners.size ||
            (p.partners.size === centre.partners.size && (p.count > centre.count ||
                (p.count === centre.count && compareKeys(p.name, centre.name) < 0)))) centre = p;
    });
    if (!centre) return { model: null, inner: new Map(), outer: new Map() };
    const centreId = centre.key;
    const correspondents = new Set(persons.keys());
    const partners = new Map();
    const mentioned = new Map();
    letters.forEach(letter => {
        const parties = letterParties(letter);
        if (!parties.has(centreId)) return;
        const from = personKey(letter.sender);
        const others = from === centreId
            ? letterRecipients(letter).map(personKey).filter(k => k && k !== centreId)
            : (from && from !== centreId ? [from] : []);
        const time = letterTime(letter);
        new Set(others).forEach(key => {
            const p = partners.get(key) || { key, letters: 0, first: null };
            p.letters++;
            if (time !== null && (p.first === null || time < p.first)) p.first = time;
            partners.set(key, p);
        });
        const partner = from === centreId
            ? letterRecipients(letter).map(personKey).find(k => k && k !== centreId)
            : from;
        const seen = new Set();
        (letter.mentions?.persons || []).forEach(person => {
            const key = personKey(person);
            if (!key || key === centreId || seen.has(key)) return;
            seen.add(key);
            const m = mentioned.get(key) || { key, name: person.name || key, mentions: 0, partners: new Map() };
            m.mentions++;
            if (partner) m.partners.set(partner, (m.partners.get(partner) || 0) + 1);
            mentioned.set(key, m);
        });
    });
    const nameOf = key => persons.get(key)?.name || key;
    const inner = [...partners.values()]
        .sort((a, b) => b.letters - a.letters || compareKeys(nameOf(a.key), nameOf(b.key)) || compareKeys(a.key, b.key));
    const innerIndex = new Map(inner.map((p, i) => [p.key, i]));
    const outer = [...mentioned.values()].filter(m => !partners.has(m.key))
        .sort((a, b) => b.mentions - a.mentions || compareKeys(a.name, b.name) || compareKeys(a.key, b.key))
        .slice(0, OUTER_LIMIT);
    const outerIndex = new Map(outer.map((m, i) => [m.key, i]));
    const chords = new Map();
    letters.forEach(letter => {
        const from = personKey(letter.sender);
        if (!innerIndex.has(from)) return;
        new Set(letterRecipients(letter).map(personKey)).forEach(to => {
            if (!to || to === from || !innerIndex.has(to)) return;
            const [a, b] = [innerIndex.get(from), innerIndex.get(to)].sort((x, y) => x - y);
            const key = `${a}|${b}`;
            chords.set(key, (chords.get(key) || 0) + 1);
        });
    });
    return {
        inner: innerIndex,
        outer: outerIndex,
        model: {
            centre: centre.name,
            correspondents: partners.size,
            inner: inner.map(p => [nameOf(p.key), p.letters, p.first === null ? null : roundTo(p.first, 4)]),
            outer: outer.map(m => [m.name, m.mentions, correspondents.has(m.key) ? 1 : 0,
                [...m.partners].filter(([key]) => innerIndex.has(key))
                    .sort((a, b) => b[1] - a[1] || compareKeys(a[0], b[0])).slice(0, 3)
                    .map(([key, n]) => [innerIndex.get(key), n])]),
            chords: [...chords].map(([key, n]) => [...key.split('|').map(Number), n]).sort((x, y) => x[0] - y[0] || x[1] - y[1])
        },
        centreId
    };
}

// A letter as the record in the centre of the figure, with its place in each aggregate
function describeRecord(letter, context) {
    const { centreId, inner, outer, subjects } = context;
    const subject = first(letter.mentions?.subjects);
    const subjectIndex = subject ? subjects.indexOf(subject.uri || subject.label) : -1;
    const from = personKey(letter.sender);
    const partner = from === centreId
        ? letterRecipients(letter).map(personKey).find(k => k && k !== centreId)
        : from;
    const mentionedPerson = first(letter.mentions?.persons);
    const mentionedKey = personKey(mentionedPerson);
    const mentionedPlace = first(letter.mentions?.places);
    const place = letter.place_sent;
    return {
        id: letter.id || null,
        sender: letter.sender?.name || null,
        recipient: first(letterRecipients(letter))?.name || null,
        place: isKnownPlace(place) ? place.name : null,
        placeInferred: Boolean(place?.inferred),
        lat: located(place) ? roundTo(place.lat, 3) : null,
        lon: located(place) ? roundTo(place.lon, 3) : null,
        date: letter.date || null,
        dateText: letter.dateText || null,
        dateInferred: Boolean(letter.dateInferred),
        year: letter.year || null,
        language: letter.language?.code || null,
        languageLabel: letter.language?.label || null,
        url: letter.url || null,
        partner: inner.has(partner) ? inner.get(partner) : null,
        mentionsPerson: mentionedPerson?.name || null,
        mentionedInner: inner.has(mentionedKey) ? inner.get(mentionedKey) : null,
        mentionedOuter: outer.has(mentionedKey) ? outer.get(mentionedKey) : null,
        mentionsPlace: mentionedPlace?.name || null,
        mentionedLat: located(mentionedPlace) ? roundTo(mentionedPlace.lat, 3) : null,
        mentionedLon: located(mentionedPlace) ? roundTo(mentionedPlace.lon, 3) : null,
        mentionsSubject: first(letter.mentions?.subjects)?.label || null,
        subject: subjectIndex >= 0 ? subjectIndex : null,
        postmark: letter.postmark || null,
        address: letter.address || null,
        signature: letter.signature || null,
        records: letter.records?.length || 1
    };
}
