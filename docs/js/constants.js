// Shared constants of CorrespExplorer

// Language code of letters without a language. The former sentinel 'None' collided with the
// HSA source, which writes target="None" for Ladin (data.md, Hugo Schuchardt Archiv)
/**
 * Properties of the transmission a source may record per letter. Each becomes a sidebar filter
 * when at least one letter of the loaded dataset has it, so every such group can be listed.
 * `param` is the token in the `feat` URL parameter.
 */
export const LETTER_FEATURES = [
    { key: 'undated', label: 'Ohne Datum', test: l => !l.date && !l.dateText },
    { key: 'dateImplausible', label: 'Datum unplausibel', test: l => Boolean(l.dateImplausible) },
    { key: 'dateInferred', label: 'Datum erschlossen', test: l => Boolean(l.dateInferred) },
    { key: 'dateText', label: 'Datum nur als Text', test: l => Boolean(l.dateText) },
    { key: 'dateBound', label: 'Nur Datumsgrenze', test: l => Boolean(l.dateBound) },
    { key: 'placeInferred', label: 'Ort erschlossen', test: l => Boolean(l.place_sent?.inferred) },
    { key: 'postmark', label: 'Mit Poststempel', test: l => Boolean(l.postmark) },
    { key: 'address', label: 'Mit Anschrift', test: l => Boolean(l.address) },
    { key: 'multiRecipients', label: 'Mehrere Empfänger', test: l => (l.recipients?.length || 0) > 1 },
    { key: 'records', label: 'Mehrfach verzeichnet', test: l => (l.records?.length || 0) > 1 },
    { key: 'recordsDiffer', label: 'Einträge weichen ab', test: l => Boolean(l.recordsDiffer) },
    { key: 'parallels', label: 'Auch in anderer Datei', test: l => Boolean(l.parallels?.length) },
    { key: 'forwarded', label: 'Weitergeleitet', test: l => Boolean(l.furtherActions?.some(a => a.type === 'forwarded')) }
];

export const NO_LANGUAGE = '_none';

/**
 * Categorical colours for languages, in the order of assignment. Six hues of the Okabe-Ito
 * palette (Okabe & Ito 2008, Color Universal Design), chosen for readers with a colour vision
 * deficiency; its yellow is left out because it disappears on the paper background, its black
 * because ink is the text colour. Neighbours in this order differ in lightness, so the two or
 * three largest segments of a stacked bar stay apart without relying on hue.
 * Hue alone carries about seven categories (Healey 1996), so only the most frequent languages
 * of a dataset get a colour; the rest share LANGUAGE_REST_COLOR and stay reachable by name in
 * the sidebar filter, the tooltips and the data table. design.md, Datenvisualisierung.
 */
const LANGUAGE_PALETTE = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00'];
const LANGUAGE_REST_COLOR = '#8C8676';  // warm grey: "Übrige Sprachen"
const LANGUAGE_NONE_COLOR = '#C9C4B4';  // lighter warm grey: letters without a language

// Live binding filled by computeLanguageColors() when a dataset is loaded. A language code
// without an entry belongs to the rest ('other').
export const LANGUAGE_COLORS = { other: LANGUAGE_REST_COLOR, [NO_LANGUAGE]: LANGUAGE_NONE_COLOR };

// The most frequent languages of the dataset take the palette in order of their letter count
export function computeLanguageColors(letters) {
    const langCounts = {};
    letters.forEach(letter => {
        const lang = letter.language?.code;
        if (lang) langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    Object.keys(LANGUAGE_COLORS).forEach(key => delete LANGUAGE_COLORS[key]);
    Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, LANGUAGE_PALETTE.length)
        .forEach(([lang], index) => { LANGUAGE_COLORS[lang] = LANGUAGE_PALETTE[index]; });
    LANGUAGE_COLORS.other = LANGUAGE_REST_COLOR;
    LANGUAGE_COLORS[NO_LANGUAGE] = LANGUAGE_NONE_COLOR;

    return LANGUAGE_COLORS;
}

// True for a language code that has no colour of its own and counts among the rest
export function isRestLanguage(code) {
    return code === 'other' || !LANGUAGE_COLORS[code];
}

// The one label table for parser and views, ISO 639-1 and the ISO 639-3 codes of Lexvo URIs
export const LANGUAGE_LABELS = {
    'de': 'Deutsch',
    'deu': 'Deutsch',
    'fr': 'Französisch',
    'fra': 'Französisch',
    'it': 'Italienisch',
    'ita': 'Italienisch',
    'en': 'Englisch',
    'eng': 'Englisch',
    'es': 'Spanisch',
    'spa': 'Spanisch',
    'pt': 'Portugiesisch',
    'por': 'Portugiesisch',
    'la': 'Latein',
    'lat': 'Latein',
    'hu': 'Ungarisch',
    'hun': 'Ungarisch',
    'nl': 'Niederländisch',
    'nld': 'Niederländisch',
    'cy': 'Walisisch',
    'oc': 'Okzitanisch',
    'eu': 'Baskisch',
    'eus': 'Baskisch',
    'ca': 'Katalanisch',
    'cat': 'Katalanisch',
    'ro': 'Rumänisch',
    'ron': 'Rumänisch',
    'da': 'Dänisch',
    'eo': 'Esperanto',
    'pap': 'Papiamentu',
    [NO_LANGUAGE]: 'Ohne Angabe',
    'other': 'Übrige Sprachen'
};

// Labels the loaded data carries for codes outside the table, such as HSA's "None" for Ladin
const dataLanguageLabels = {};

export function registerLanguageLabels(letters) {
    Object.keys(dataLanguageLabels).forEach(key => delete dataLanguageLabels[key]);
    letters.forEach(letter => {
        const { code, label } = letter.language || {};
        if (code && label && !dataLanguageLabels[code]) dataLanguageLabels[code] = label;
    });
}

/**
 * Display label of a language code: table first, then the label from the data, then the code
 */
export function languageLabel(code) {
    return LANGUAGE_LABELS[code] || dataLanguageLabels[code] || code;
}

// The twelve views of explore.html in navigation order; URL parameter view= accepts only these
export const VIEWS = [
    'overview', 'map', 'persons', 'letters', 'timeline', 'topics', 'places',
    'network', 'mentions-flow', 'chronik', 'activity', 'comparison'
];

// Map defaults
export const MAP_DEFAULTS = {
    clusterRadius: 40,
    clusterMaxZoom: 12
};

// Network defaults
export const NETWORK_DEFAULTS = {
    minLetters: 5,        // letters between two persons for the correspondence network
    maxLettersSlider: 100,
    minYears: 3,          // shared active years for contemporaries
    maxNodes: 50,
    minCooccurrence: 5,   // shared letters for topic co-occurrence
    maxYearsSlider: 50,
    maxNodesSlider: 100
};

// Basket capacity per type
export const BASKET_LIMITS = {
    maxPersons: 50,
    maxLetters: 100,
    maxPlaces: 50
};

// API defaults
export const API_DEFAULTS = {
    // Upper bound for one correspSearch API URL; the API pages its results, so large queries stop here
    correspSearchMaxLetters: 1000
};
