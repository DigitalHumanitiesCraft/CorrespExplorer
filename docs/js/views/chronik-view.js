// What the former chronicle added to a list of letters, kept for the time view (timeline-view.js):
// the place of a letter in the exchange between two persons ("493. von 521 Briefen zwischen
// beiden", US-31) and, after an enrichment the reader starts, life dates and ages (US-29, US-30).
// The three layouts of the chronicle are retired; the time view draws the letters on a true time
// axis instead, with the letters from and to the central person on two sides.

import { escapeHtml, openModal, closeModal, personKey, letterRecipients } from '../utils.js';
import { enrichPerson, formatLifeDates } from '../wikidata-enrichment.js';
import { state } from '../state-manager.js';

let enriched = false;
const enrichmentData = new Map();
let enrichmentCancelled = false;
let correspondenceIndex = null;
let indexSource = null;

let getFilteredLetters = null;
let getAllLetters = null;
let onEnriched = null;

/**
 * @param {Object} deps
 * @param {Function} deps.getFilteredLetters - the persons of these letters are offered for enrichment
 * @param {Function} [deps.getAllLetters] - the correspondence index counts the whole dataset
 * @param {Function} [deps.onEnriched] - called when an enrichment has finished
 */
export function initChronikView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    // The position in a correspondence is a property of the whole dataset, not of the filter
    getAllLetters = deps.getAllLetters || (() => state.getAllLetters());
    onEnriched = deps.onEnriched || null;

    // The enrichment queries Wikidata and starts only on the reader's action (ADR-006)
    document.getElementById('chronik-enrich-btn')?.addEventListener('click', openEnrichmentModal);
    document.getElementById('enrichment-start-btn')?.addEventListener('click', runEnrichment);
    document.getElementById('enrichment-cancel-btn')?.addEventListener('click', () => { enrichmentCancelled = true; });
    document.getElementById('enrichment-close-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('enrichment-modal');
        if (modal) closeModal(modal);
    });
}

// A date that can stand on the time axis; an implausible year is a slip of the source and would
// put the letter decades away from its neighbours, so it sorts with the undated letters
function axisDate(letter) {
    return letter.dateImplausible ? null : letter.date || null;
}

function compareByAxisDate(a, b) {
    return (axisDate(a) || '9999').localeCompare(axisDate(b) || '9999');
}

// A correspondence is the exchange between two persons in both directions
function pairKey(a, b) {
    return [a, b].sort().join('<->');
}

// Key of a person who can stand in a correspondence. An unknown person ("Unbekannt") is not one
// correspondent: all unknown writers would share a key and form one false correspondence.
function correspondentKey(person) {
    return person && person.precision !== 'unknown' ? personKey(person) : null;
}

/**
 * Index of every correspondence: the letters between two persons, in either direction, in
 * date order. A letter to several recipients belongs to the correspondence with each of them.
 * @param {Array} letters
 * @returns {Map<string, {letters: Array<{id: string, year: number|null}>, dated: number}>}
 */
function buildCorrespondenceIndex(letters) {
    const index = new Map();
    for (const letter of letters) {
        const senderId = correspondentKey(letter.sender);
        if (!senderId) continue;
        for (const recipient of letterRecipients(letter)) {
            const recipientId = correspondentKey(recipient);
            if (!recipientId || recipientId === senderId) continue;
            const key = pairKey(senderId, recipientId);
            if (!index.has(key)) index.set(key, { letters: [] });
            index.get(key).letters.push(letter);
        }
    }
    for (const entry of index.values()) {
        entry.letters.sort(compareByAxisDate);
        entry.dated = entry.letters.filter(l => axisDate(l) && l.year).length;
        entry.letters = entry.letters.map(l => ({ id: l.id, year: axisDate(l) ? l.year : null }));
    }
    return index;
}

/**
 * Place of a letter in the correspondence with its first recipient: its number among the
 * dated letters, the total, and the year of the previous letter when two or more years lie
 * between them.
 * @param {Object} letter
 * @param {Map} [index] - defaults to the index of the whole dataset, built once per dataset
 * @returns {{number: number|null, total: number, dated: number, isFirst?: boolean, isLast?: boolean, previousYear?: number|null}|null}
 */
export function correspondenceContext(letter, index = datasetIndex()) {
    if (!index) return null;
    const senderId = correspondentKey(letter.sender);
    const recipientId = correspondentKey(letterRecipients(letter)[0]);
    if (!senderId || !recipientId || senderId === recipientId) return null;
    const entry = index.get(pairKey(senderId, recipientId));
    if (!entry) return null;
    const position = entry.letters.findIndex(l => l.id === letter.id);
    const total = entry.letters.length;
    const own = entry.letters[position];
    if (!own?.year) return { number: null, total, dated: entry.dated };
    const previous = position > 0 ? entry.letters[position - 1] : null;
    return {
        number: position + 1,
        total,
        dated: entry.dated,
        isFirst: position === 0,
        isLast: position === entry.dated - 1,
        previousYear: previous?.year && own.year - previous.year >= 2 ? previous.year : null
    };
}

function datasetIndex() {
    const all = getAllLetters ? getAllLetters() : state.getAllLetters();
    if (indexSource !== all) {
        correspondenceIndex = buildCorrespondenceIndex(all);
        indexSource = all;
    }
    return correspondenceIndex;
}

/**
 * The context in words. "zwischen beiden" refers to the two names the same label gives before it.
 * @param {Object|null} context - from correspondenceContext
 * @returns {string}
 */
export function contextText(context) {
    if (!context) return '';
    if (context.total === 1) return 'Einziger Brief zwischen beiden';
    if (context.number === null) return `Ohne Stelle in der Folge der ${context.total} Briefe zwischen beiden`;
    if (context.isFirst) return `Erster von ${context.total} Briefen zwischen beiden`;
    const base = context.isLast && context.dated === context.total
        ? `Letzter von ${context.total} Briefen zwischen beiden`
        : `${context.number}. von ${context.total} Briefen zwischen beiden`;
    return context.previousYear ? `${base}, nach einer Lücke seit ${context.previousYear}` : base;
}

function personEnrichment(person) {
    if (!person || !enriched) return null;
    const authorityId = person.viaf || person.gnd || person.id;
    if (authorityId && enrichmentData.has(authorityId)) return enrichmentData.get(authorityId);
    if (person.name && enrichmentData.has(person.name)) return enrichmentData.get(person.name);
    return null;
}

// Wikidata first, then a date the source itself records
function lifeYear(person, field) {
    const value = personEnrichment(person)?.[field] || person?.[field];
    const match = typeof value === 'string' ? value.match(/^(-?\d{4})/) : null;
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Age of a person in the year of a letter, from life dates of the source or of an enrichment
 * @param {Object} person
 * @param {Object} letter
 * @returns {number|null}
 */
export function personAge(person, letter) {
    const birth = lifeYear(person, 'birthDate');
    if (!birth || !letter.year) return null;
    const death = lifeYear(person, 'deathDate');
    if (death && letter.year > death) return null;
    const age = letter.year - birth;
    return age >= 0 ? age : null;
}

/**
 * Life dates of a person as the enrichment gives them, "1842–1927", or an empty string
 * @param {Object} person
 * @returns {string}
 */
export function lifeDatesOf(person) {
    const data = personEnrichment(person);
    return data ? formatLifeDates(data) || '' : '';
}

// Persons with an authority record, the only ones Wikidata can be asked about (US-29)
function enrichablePersons() {
    const persons = new Map();
    for (const letter of getFilteredLetters()) {
        [letter.sender, ...letterRecipients(letter)].forEach(person => {
            if (!person) return;
            const authority = person.authority || (person.viaf ? 'viaf' : (person.gnd ? 'gnd' : null));
            const authorityId = person.viaf || person.gnd || person.id;
            if (authority && authorityId && !persons.has(authorityId)) {
                persons.set(authorityId, { name: person.name, authority, authorityId });
            }
        });
    }
    return [...persons.values()];
}

const show = (id, visible) => document.getElementById(id)?.classList.toggle('hidden', !visible);

function openEnrichmentModal() {
    const modal = document.getElementById('enrichment-modal');
    if (!modal) return;
    document.getElementById('enrichment-person-count').textContent = enrichablePersons().length;
    show('enrichment-info', true);
    show('enrichment-progress', false);
    show('enrichment-done', false);
    show('enrichment-start-btn', true);
    show('enrichment-cancel-btn', false);
    show('enrichment-close-btn', false);
    openModal(modal);
}

async function runEnrichment() {
    enrichmentCancelled = false;
    show('enrichment-info', false);
    show('enrichment-progress', true);
    show('enrichment-start-btn', false);
    show('enrichment-cancel-btn', true);

    const persons = enrichablePersons();
    document.getElementById('enrichment-total').textContent = persons.length;
    let found = 0;
    let missing = 0;
    const stats = { birth: 0, death: 0, profession: 0 };
    const log = document.getElementById('enrichment-live-log');
    log.innerHTML = '';

    for (let i = 0; i < persons.length; i++) {
        if (enrichmentCancelled) break;
        const person = persons[i];
        document.getElementById('enrichment-current').textContent = i + 1;
        document.getElementById('enrichment-current-person').textContent = person.name || '';
        document.getElementById('enrichment-progress-bar').style.width = `${((i + 1) / persons.length) * 100}%`;
        try {
            const data = await enrichPerson(person.authority, person.authorityId);
            const entry = document.createElement('div');
            if (data) {
                enrichmentData.set(person.authorityId, data);
                if (person.name) enrichmentData.set(person.name, data);
                found++;
                if (data.birthDate) stats.birth++;
                if (data.deathDate) stats.death++;
                if (data.professions?.length) stats.profession++;
                entry.className = 'enrichment-log-entry enrichment-log-success';
                entry.innerHTML = `<span class="log-name">${escapeHtml(person.name || 'Unbekannt')}</span> <span class="log-status">${escapeHtml(formatLifeDates(data) || '')}</span>`;
            } else {
                missing++;
                entry.className = 'enrichment-log-entry enrichment-log-empty';
                entry.innerHTML = `<span class="log-name">${escapeHtml(person.name || 'Unbekannt')}</span> <span class="log-status">keine Daten</span>`;
            }
            log.insertBefore(entry, log.firstChild);
            while (log.children.length > 8) log.removeChild(log.lastChild);
            // A pause between requests keeps the public service unburdened
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(`Failed to enrich ${person.name}:`, error.message);
            missing++;
        }
    }

    enriched = true;
    show('chronik-enrich-btn', false);
    show('chronik-enrich-status', true);
    show('enrichment-progress', false);
    show('enrichment-done', true);
    document.getElementById('enrichment-success-count').textContent = found;
    document.getElementById('enrichment-summary').innerHTML = `
        <div class="enrichment-summary-grid">
            <div class="summary-item">${stats.birth} Geburtsdaten</div>
            <div class="summary-item">${stats.death} Sterbedaten</div>
            <div class="summary-item">${stats.profession} Berufe</div>
            <div class="summary-item summary-empty">${missing} ohne Daten</div>
        </div>`;
    show('enrichment-cancel-btn', false);
    show('enrichment-close-btn', true);
    onEnriched?.();
}
