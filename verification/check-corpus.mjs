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
const { parseCMIFFiles } = await import(pathToFileURL(join(here, '../docs/js/cmif-parser.js')).href);
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
letters.forEach((letter, i) => {
    const desc = source[i];
    const sent = action(desc, 'sent')[0];
    const places = sent ? [...sent.getElementsByTagNameNS(TEI, 'placeName')] : [];
    const stamps = places.filter(p => p.getAttribute('type') === 'postmark').map(p => clean(p.textContent));
    const real = places.filter(p => p.getAttribute('type') !== 'postmark');
    const chosen = real.find(p => !p.getAttribute('type')) || real[0];

    if (letter.place_sent && stamps.includes(letter.place_sent.name) && !real.some(p => clean(p.textContent) === letter.place_sent.name)) postmarkAsPlace++;
    if (stamps.length && !stamps.every(s => (letter.postmark || '').includes(s))) postmarkLost++;
    if (chosen && marked(chosen) && !letter.place_sent?.inferred) inferredPlaceLost++;
    if (Boolean(chosen) !== Boolean(letter.place_sent)) inferredPlaceLost++;

    const dates = sent ? [...sent.getElementsByTagNameNS(TEI, 'date')] : [];
    if (dates.some(marked) && !letter.dateInferred) inferredDateLost++;
    if (dates.length && !dates.some(d => d.getAttribute('when')) && !letter.date && !letter.dateText) dateTextLost++;

    const received = action(desc, 'received').flatMap(a => children(a, 'persName', 'orgName'));
    const got = letter.recipients || (letter.recipient ? [letter.recipient] : []);
    if (received.length !== got.length) recipientsLost++;

    const addrLines = [...desc.getElementsByTagNameNS(TEI, 'addrLine')].map(a => clean(a.textContent)).filter(Boolean);
    if (addrLines.length && !addrLines.every(a => (letter.address || '').includes(a))) addressLost++;
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
check('every date marked supplied is flagged inferred', inferredDateLost === 0, String(inferredDateLost));
check('a date given only as text keeps its text', dateTextLost === 0, String(dateTextLost));
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
check('letters equal distinct shelfmarks plus unmerged records', merged.letters.length === merged.letters.filter(l => l.records).length + merged.letters.filter(l => !l.records).length);
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
