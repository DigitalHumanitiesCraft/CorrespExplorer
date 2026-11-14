// The composition of the start figure from what a dataset holds. A statement the data do not hold
// takes no place; a figure that needs something missing gives way to one that works with what is
// there; what a holding lacks is said once, in one sentence. Pure, so the rules can be tested
// (tests/test-compose.js) and every dataset, one's own included, is composed by the same rules.
//
// Rules, in the order the function applies them:
// 1. A statement is held when at least one letter carries it (coverage above zero).
// 2. Correspondents are drawn as the correspondence circle, dates as the time figure: one mark per
//    letter while the letters are in this browser and few enough to tell apart, else the stacked
//    profile.
// 3. Places are a map while some of them have coordinates, else a ranking of their names. Missing
//    coordinates are named once in the sentence of what the holding lacks.
// 4. The language of the letters colours the time figure and its key; it takes no figure of its
//    own while there is a time figure.
// 5. The link to the edition is shown in the letter; it takes no figure.
// 6. A band holds only its held statements. A band without any statement left shrinks away; its
//    absence stands in the sentence. The band of TEI letter records, where held, draws postmarks
//    over the years, the records per letter and the share of each other property.

export const UNIT_LIMIT = 300;

const PHRASES = {
    place: 'Absendeorte',
    date: 'Datierungen',
    link: 'Links zur Edition',
    language: 'Sprachangaben',
    mentionsPerson: 'erwähnten Personen',
    mentionsPlace: 'erwähnten Orte',
    mentionsSubject: 'Themen',
    coordinates: 'Koordinaten der Orte',
    mentionedCoordinates: 'Koordinaten der erwähnten Orte',
    record: 'Angaben aus TEI-Briefsätzen wie Poststempel, Anschrift und Signatur'
};

const RECORD_KEYS = ['postmark', 'address', 'signature', 'records', 'inferred'];

/**
 * @param {Object} summary - from summarizeLetters() or data/examples.json
 * @param {{lettersInBrowser?: boolean}} [options]
 * @returns {{bands: Array<{key: string, items: Array<{key: string, figure: string}>}>, missing: string[], sentence: string}}
 */
export function composeFigure(summary, { lettersInBrowser = false } = {}) {
    const held = key => (summary?.coverage?.[key] || 0) > 0;
    const missing = [];
    const core = [];
    if (held('persons')) core.push({ key: 'persons', figure: 'circle' });
    if (held('place')) core.push({ key: 'place', figure: summary.located?.length ? 'map' : 'ranking' });
    else missing.push('place');
    if (held('date')) core.push({ key: 'date', figure: lettersInBrowser && summary.dated <= UNIT_LIMIT ? 'letters' : 'profile' });
    else missing.push('date');
    if (!held('link')) missing.push('link');

    const extension = [];
    if (held('language') && !held('date')) extension.push({ key: 'language', figure: 'bar' });
    if (!held('language')) missing.push('language');
    ['mentionsPerson', 'mentionsPlace', 'mentionsSubject'].forEach(key => {
        if (!held(key)) {
            missing.push(key);
            return;
        }
        const figure = { mentionsPerson: 'ring', mentionsPlace: summary.mentionedLocated?.length ? 'map' : 'ranking', mentionsSubject: 'profiles' }[key];
        extension.push({ key, figure });
    });
    if (held('place') && !summary.located?.length) missing.push('coordinates');
    else if (held('mentionsPlace') && !summary.mentionedLocated?.length) missing.push('mentionedCoordinates');

    const record = [];
    if (held('postmark') && summary.postmarkYears?.length) record.push({ key: 'postmark', figure: 'years' });
    if (held('records')) record.push({ key: 'records', figure: 'histogram' });
    // A property with a figure of its own does not stand a second time in the list of shares
    const own = new Set(record.map(item => item.key));
    const shares = RECORD_KEYS.filter(key => held(key) && !own.has(key));
    if (shares.length) record.push({ key: 'features', figure: 'shares', keys: shares });
    if (!RECORD_KEYS.some(held)) missing.push('record');

    const bands = [
        { key: 'core', items: core },
        { key: 'extension', items: extension },
        { key: 'record', items: record }
    ].filter(band => band.items.length > 0);
    return { bands, missing, sentence: missingSentence(missing) };
}

/**
 * One sentence that names what a holding lacks, or an empty string
 * @param {string[]} missing - keys of PHRASES
 */
export function missingSentence(missing) {
    const phrases = missing.map(key => PHRASES[key]).filter(Boolean);
    if (phrases.length === 0) return '';
    const list = phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(', ')} und ${phrases[phrases.length - 1]}`;
    return `Dieser Bestand trägt keine ${list}.`;
}
