// The summary of a letter list that sidebar, overview, export and start page count from, and its
// data-quality figures. The research paths that gave this module its name are retired.
//
// All figures are counted from the letters via personKey and placeKey (ADR-001), because the
// index shapes differ between the CMIF parser (letter_count, {label, letter_count}) and the
// preprocessed HSA JSON (letters_sent/letters_received, language strings, subjects with count).

import { personKey, placeKey, isKnownPlace, letterRecipients } from './utils.js';
import { languageLabel } from './constants.js';

function bump(map, key, init) {
    if (!map.has(key)) map.set(key, { ...init, count: 0 });
    const entry = map.get(key);
    entry.count++;
    return entry;
}

/**
 * Persons, places, subjects, languages, dates and mentions of a letter list.
 * A place counts as located when its letter or its index entry carries coordinates.
 * @param {Array} letters
 * @param {Object} [indices] - data indices, only read for place coordinates
 * @returns {Object} Maps keyed by personKey, placeKey, subject URI or label and language code
 */
export function summarizeCorpus(letters, indices = {}) {
    const persons = new Map();
    const places = new Map();
    const subjects = new Map();
    const languages = new Map();
    const mentioned = new Map();
    const yearCounts = new Map();
    let datedLetters = 0;
    let lettersWithMentions = 0;
    let personMentions = 0;

    for (const letter of letters) {
        // A person seen once with and once without authority id stays two keys (ADR-001)
        // Once per letter, also for a person who is sender and recipient of it
        const seen = new Set();
        for (const person of [letter.sender, ...letterRecipients(letter)]) {
            const key = personKey(person);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            bump(persons, key, { key, name: person.name || key, identified: Boolean(person.id) });
        }

        // A placeholder for an unknown place is no place, as in the sidebar and comparison counts
        const placeId = isKnownPlace(letter.place_sent) ? placeKey(letter.place_sent) : null;
        if (placeId) {
            const entry = bump(places, placeId, { key: placeId, name: letter.place_sent.name || placeId, located: false });
            const indexed = indices.places?.[placeId];
            if ((letter.place_sent.lat && letter.place_sent.lon) || (indexed?.lat && indexed?.lon)) {
                entry.located = true;
            }
        }

        for (const subject of letter.mentions?.subjects || []) {
            const key = subject.uri || subject.id || subject.label;
            if (key) bump(subjects, key, { key, name: subject.label || key });
        }

        const code = letter.language?.code;
        if (code) bump(languages, code, { key: code, name: languageLabel(code) });

        if (letter.year !== null && letter.year !== undefined) {
            datedLetters++;
            bump(yearCounts, letter.year, { key: letter.year, name: String(letter.year) });
        }

        const mentionedPersons = letter.mentions?.persons || [];
        if (mentionedPersons.length > 0) {
            lettersWithMentions++;
            personMentions += mentionedPersons.length;
            for (const person of mentionedPersons) {
                const key = personKey(person);
                if (key) bump(mentioned, key, { key, name: person.name || key });
            }
        }
    }

    return { total: letters.length, persons, places, subjects, languages, mentioned, yearCounts, datedLetters, lettersWithMentions, personMentions };
}

/**
 * Data-quality figures of one corpus summary: day-precise dates, persons with authority id,
 * places with coordinates. The single source of the sidebar quality icons and the overview chips,
 * so both count persons and places like the lists (personKey, placeKey).
 * @param {Array} letters
 * @param {ReturnType<typeof summarizeCorpus>} corpus - summary of the same letters
 * @returns {{dates: {known: number, total: number}, persons: {known: number, total: number}, places: {known: number, total: number}}}
 */
export function datasetQuality(letters, corpus) {
    const persons = [...corpus.persons.values()];
    const places = [...corpus.places.values()];
    return {
        // A day in an implausible year is no usable date
        dates: { known: letters.filter(l => l.datePrecision === 'day' && !l.dateImplausible).length, total: letters.length },
        persons: { known: persons.filter(p => p.identified).length, total: persons.length },
        places: { known: places.filter(p => p.located).length, total: places.length }
    };
}
