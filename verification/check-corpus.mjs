// Runs the production parser over a folder of TEI or CMIF files outside the repository and checks
// what it returns against the source XML, letter by letter. The data are not bundled (data.md,
// Stefan Zweig Digital), so the corpus folder is an argument.
// Usage: node verification/check-corpus.mjs <jsdom package dir> <corpus dir>
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const [jsdomDir, corpusDir] = process.argv.slice(2);
if (!jsdomDir || !corpusDir) {
    console.error('Usage: node verification/check-corpus.mjs <jsdom package dir> <corpus dir>');
    process.exit(2);
}
const require = createRequire(join(jsdomDir, 'package.json'));
const { JSDOM } = require(jsdomDir);
const win = new JSDOM('').window;
globalThis.DOMParser = win.DOMParser;

const here = dirname(fileURLToPath(import.meta.url));
const { parseCMIFFiles, isNoDate } = await import(pathToFileURL(join(here, '../docs/js/cmif-parser.js')).href);
const { LETTER_FEATURES } = await import(pathToFileURL(join(here, '../docs/js/constants.js')).href);

const TEI = 'http://www.tei-c.org/ns/1.0';
const names = readdirSync(corpusDir).filter(f => f.endsWith('.xml')).sort();
const xml = names.map(f => readFileSync(join(corpusDir, f), 'utf8'));
// Record by record for the comparison with the source, then merged as the explorer shows it
const data = await parseCMIFFiles(xml, null, names, { merge: false });
const merged = await parseCMIFFiles(xml, null, names);

// Source letters in the order the parser reads them
const source = [];
for (const text of xml) {
    const doc = new win.DOMParser().parseFromString(text, 'application/xml');
    source.push(...doc.getElementsByTagNameNS(TEI, 'correspDesc'));
}

const failures = [];
const check = (name, ok, detail = '') => {
    if (!ok) failures.push(`${name} ${detail}`.trim());
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${detail}`.trimEnd());
};
const children = (el, ...tags) => el ? [...el.children].filter(c => tags.includes(c.localName)) : [];
const action = (desc, type) => [...desc.getElementsByTagNameNS(TEI, 'correspAction')].filter(a => a.getAttribute('type') === type);
const marked = el => /supplied|deduced/.test(`${el.getAttribute('type') || ''} ${el.getAttribute('ana') || ''}`);
const clean = s => s.replace(/\s+/g, ' ').trim();

const { letters } = data;
check('every correspDesc becomes one letter', letters.length === source.length, `${letters.length} of ${source.length}`);
check('letter ids are unique', new Set(letters.map(l => l.id)).size === letters.length);
check('no letter id is a position fallback', letters.every(l => !/^letter-\d+/.test(l.id)), `${letters.filter(l => /^letter-\d+/.test(l.id)).length} fallbacks`);

let postmarkAsPlace = 0, inferredPlaceLost = 0, inferredDateLost = 0, recipientsLost = 0, addressLost = 0;
let localRefIdentified = 0, rawWhitespace = 0, postmarkLost = 0, dateTextLost = 0, addressAsPlace = 0;
let placeWordingLost = 0, sendersLost = 0, selfAddressed = 0, markedDateLost = 0, placeAlternativeLost = 0;
letters.forEach((letter, i) => {
    const desc = source[i];
    const sent = action(desc, 'sent')[0];
    // Places and dates of the action itself; one inside an address belongs to the address
    const places = children(sent, 'placeName');
    const stamps = places.filter(p => p.getAttribute('type') === 'postmark').map(p => clean(p.textContent));
    const real = places.filter(p => p.getAttribute('type') !== 'postmark');
    // The wording of the letter (type original) is no sending place; it is kept as placeText
    const chosen = real.find(p => !p.getAttribute('type')) || real.find(p => p.getAttribute('type') !== 'original');
    const wording = real.find(p => p.getAttribute('type') === 'original');
    if (!chosen && wording && letter.placeText !== clean(wording.textContent)) placeWordingLost++;

    if (letter.place_sent && stamps.includes(letter.place_sent.name) && !real.some(p => clean(p.textContent) === letter.place_sent.name)) postmarkAsPlace++;
    if (stamps.length && !stamps.every(s => (letter.postmark || '').includes(s))) postmarkLost++;
    if (chosen && marked(chosen) && !letter.place_sent?.inferred) inferredPlaceLost++;
    if (Boolean(chosen) !== Boolean(letter.place_sent)) inferredPlaceLost++;
    // A second untyped place of another name is kept beside the chosen one
    const untypedNames = new Set(places.filter(p => !p.getAttribute('type')).map(p => clean(p.textContent).replace(/^\[([^\]]+)\]$/, '$1')));
    for (const name of untypedNames) {
        if (name !== letter.place_sent?.name && !(letter.placeAlternatives || []).some(a => a.name === name)) placeAlternativeLost++;
    }

    const dates = children(sent, 'date');
    // Brackets follow the date element whose value is shown, not a supplied sibling
    const DATE_ATTRS = ['when', 'from', 'to', 'notBefore', 'notAfter'];
    const shown = dates.find(d => DATE_ATTRS.some(a => d.getAttribute(a))) || dates[0];
    const showsSomething = shown && (DATE_ATTRS.some(a => shown.getAttribute(a)) || !isNoDate(shown.textContent));
    if (showsSomething && marked(shown) !== Boolean(letter.dateInferred)) inferredDateLost++;
    // Every marked date element either is the date shown as inferred or leaves its wording in
    // dateSupplied; a placeholder for no date says nothing that could be lost
    for (const d of dates) {
        if (d === shown || !marked(d) || isNoDate(d.textContent) || !clean(d.textContent)) continue;
        if (clean(d.textContent) === clean(shown.textContent)) continue;
        if (!letter.dateSupplied && !(DATE_ATTRS.some(a => d.getAttribute(a)) && letter.dateInferred)) markedDateLost++;
    }
    // Nobody writes to themselves while the source names another sender
    const names = el => [...el.children].filter(c => c.localName === 'persName' || c.localName === 'orgName').length;
    const sourceSenders = sent ? names(sent) : 0;
    if (sourceSenders > 1 && (letter.senders || []).length !== sourceSenders) sendersLost++;
    const rcpts = letter.recipients || (letter.recipient ? [letter.recipient] : []);
    const key = person => person?.id || person?.name;
    if (sourceSenders > 1 && rcpts.some(r => key(r) === key(letter.sender)) && letter.senders.some(x => !rcpts.some(r => key(r) === key(x)))) selfAddressed++;
    // "o. D." and "[Date Unknown]" say that there is no date; they must not stand as a date in words
    const worded = dates.some(d => clean(d.textContent) && !isNoDate(d.textContent));
    if (dates.length && !dates.some(d => d.getAttribute('when')) && !letter.date && Boolean(letter.dateText) !== worded) dateTextLost++;

    const received = action(desc, 'received').flatMap(a => children(a, 'persName', 'orgName'));
    const got = letter.recipients || (letter.recipient ? [letter.recipient] : []);
    if (received.length !== got.length) recipientsLost++;

    const addrLines = [...desc.getElementsByTagNameNS(TEI, 'addrLine')].map(a => clean(a.textContent)).filter(Boolean);
    const allAddresses = (letter.addresses || [letter.address || '']).join(' | ');
    if (addrLines.length && !addrLines.every(a => allAddresses.includes(a))) addressLost++;
    if (letter.place_sent && addrLines.includes(letter.place_sent.name) && !real.some(p => clean(p.textContent) === letter.place_sent.name)) addressAsPlace++;

    for (const person of [letter.sender, ...got]) {
        if (!person) continue;
        if (person.localRef && (person.precision === 'identified' || person.id)) localRefIdentified++;
        if (/\s{2,}|\n/.test(person.name)) rawWhitespace++;
    }
});
check('no postmark stands as sending place', postmarkAsPlace === 0, String(postmarkAsPlace));
check('every postmark is kept as postmark', postmarkLost === 0, String(postmarkLost));
check('every place marked supplied or deduced is flagged inferred', inferredPlaceLost === 0, String(inferredPlaceLost));
check('a date is flagged inferred exactly where the shown date element is marked supplied', inferredDateLost === 0, String(inferredDateLost));
check('no marked date element is lost without a trace', markedDateLost === 0, `${markedDateLost}; ${letters.filter(l => l.dateSupplied).length} letters keep a supplied wording`);
check('every untyped place of sending is the place or an alternative', placeAlternativeLost === 0, `${placeAlternativeLost}; ${letters.filter(l => l.placeAlternatives).length} letters with alternatives`);
check('the wording of a place stands as text and makes no sending place', placeWordingLost === 0, String(placeWordingLost));
check('every sender the source names is kept', sendersLost === 0, String(sendersLost));
check('no recipient stands as sender while the source names another sender', selfAddressed === 0, String(selfAddressed));
check('a date given only as text keeps its text, a placeholder for no date does not', dateTextLost === 0, String(dateTextLost));
check('every recipient of the source is in the letter', recipientsLost === 0, String(recipientsLost));
check('every address line is kept as address', addressLost === 0, String(addressLost));
check('no address stands as sending place', addressAsPlace === 0, String(addressAsPlace));
check('no reference inside the edition counts as identified', localRefIdentified === 0, String(localRefIdentified));
check('person names carry no line breaks', rawWhitespace === 0, String(rawWhitespace));

const recordIds = merged.letters.flatMap(l => l.records ? l.records.map(r => r.id) : [l.id]);
check('every record belongs to exactly one letter', recordIds.length === letters.length && new Set(recordIds).size === letters.length,
    `${recordIds.length} record ids for ${letters.length} records`);
check('merged records share one shelfmark and no contradicting dates', merged.letters.filter(l => l.records).every(l => {
    const group = letters.filter(r => l.records.some(x => x.id === r.id));
    return new Set(group.map(r => r.signature)).size === 1 && new Set(group.map(r => r.date).filter(Boolean)).size <= 1;
}));
// The count the merge rule (ADR-009) predicts from the records alone: a shelfmark whose records
// agree on the date is one letter; one whose dates differ gives a letter per date and one per
// record without date; a record without shelfmark is a letter of its own
const shelfmarks = new Map();
for (const record of letters) {
    if (!record.signature) continue;
    if (!shelfmarks.has(record.signature)) shelfmarks.set(record.signature, []);
    shelfmarks.get(record.signature).push(record);
}
let expectedLetters = letters.filter(r => !r.signature).length;
let splitShelfmarks = 0;
for (const group of shelfmarks.values()) {
    const dates = new Set(group.map(r => r.date).filter(Boolean));
    if (dates.size <= 1) { expectedLetters++; continue; }
    splitShelfmarks++;
    expectedLetters += dates.size + group.filter(r => !r.date).length;
}
check('letters equal what the merge rule predicts from the records', merged.letters.length === expectedLetters,
    `${merged.letters.length} letters, ${expectedLetters} predicted from ${shelfmarks.size} shelfmarks, ${splitShelfmarks} with differing dates`);
check('every letter of a shelfmark with differing dates names the others', merged.letters.filter(l => l.signature && (shelfmarks.get(l.signature) || []).length > 1
    && new Set(shelfmarks.get(l.signature).map(r => r.date).filter(Boolean)).size > 1).every(l => l.sharedSignature?.length > 0));
const span = merged.letters.map(l => l.year).filter(Boolean);
check('no letter with an implausible year stands on the time axis', merged.letters.every(l => !l.dateImplausible || l.year === null), `${Math.min(...span)} to ${Math.max(...span)}`);

const indexed = Object.values(data.indices.persons).reduce((sum, p) => sum + p.as_recipient, 0);
const namedRecipients = letters.reduce((sum, l) => sum + (l.recipients || (l.recipient ? [l.recipient] : [])).filter(r => r.id || r.name).length, 0);
check('the person index counts every recipient', indexed === namedRecipients, `${indexed} of ${namedRecipients}`);

console.log('\nFigures of this run (snapshot, not a specification):');
console.log(JSON.stringify({
    files: data.meta.files.total,
    files_loaded: data.meta.files.loaded,
    files_skipped: data.meta.files.skipped.map(s => s.name),
    title: data.meta.title,
    records: letters.length,
    letters: merged.letters.length,
    distinct_shelfmarks: new Set(letters.map(l => l.signature).filter(Boolean)).size,
    period: [Math.min(...span), Math.max(...span)],
    implausible_dates: merged.letters.filter(l => l.dateImplausible).map(l => `${l.id} ${l.date}`),
    persons: Object.keys(merged.indices.persons).length,
    places: Object.keys(merged.indices.places).length,
    features: Object.fromEntries(LETTER_FEATURES.map(f => [f.key, merged.letters.filter(f.test).length])),
    sender_precision: data.meta.uncertainty.senders,
    date_precision: data.meta.uncertainty.dates,
    place_precision: data.meta.uncertainty.places,
    with_geonames: letters.filter(l => l.place_sent?.geonames_id).length,
    json_chars: JSON.stringify(data).length
}, null, 1));

if (failures.length) {
    console.error(`\n${failures.length} check(s) failed`);
    process.exit(1);
}
console.log('\nAll checks passed');
