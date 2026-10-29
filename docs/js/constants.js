// Shared constants of CorrespExplorer

// Language code of letters without a language. The former sentinel 'None' collided with the
// HSA source, which writes target="None" for Ladin (data.md, Hugo Schuchardt Archiv)
export const NO_LANGUAGE = '_none';

// Strong language colours, for the dominant language of a corpus
export const LANGUAGE_COLORS_STRONG = {
    'de': '#1e40af', // German
    'fr': '#dc2626', // French
    'it': '#16a34a', // Italian
    'en': '#7c3aed', // English
    'es': '#ea580c', // Spanish
    'pt': '#0891b2', // Portuguese
    'la': '#57534e', // Latin
    'hu': '#be185d', // Hungarian
    'nl': '#d97706', // Dutch
    'cy': '#4f46e5', // Welsh
    'oc': '#0d9488', // Occitan
    [NO_LANGUAGE]: '#78716c', // no language
    'other': '#78716c'
};

// Pastel language colours, for all other languages
export const LANGUAGE_COLORS_PASTEL = {
    'de': '#93c5fd', // German
    'fr': '#fca5a5', // French
    'it': '#86efac', // Italian
    'en': '#c4b5fd', // English
    'es': '#fdba74', // Spanish
    'pt': '#a5f3fc', // Portuguese
    'la': '#d6d3d1', // Latin
    'hu': '#f9a8d4', // Hungarian
    'nl': '#fcd34d', // Dutch
    'cy': '#a5b4fc', // Welsh
    'oc': '#99f6e4', // Occitan
    [NO_LANGUAGE]: '#d6d3d1', // no language
    'other': '#d6d3d1'
};

// Live binding filled by computeLanguageColors() when a dataset is loaded
export const LANGUAGE_COLORS = { ...LANGUAGE_COLORS_STRONG };

// Colours by letter count: many languages in strong colours make stacked bars unreadable
export function computeLanguageColors(letters) {
    const langCounts = {};
    letters.forEach(letter => {
        const lang = letter.language?.code || NO_LANGUAGE;
        langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);

    Object.keys(LANGUAGE_COLORS).forEach(key => delete LANGUAGE_COLORS[key]);

    // The most frequent language gets its strong colour, all others a pastel tone
    sorted.forEach(([lang], index) => {
        if (index === 0) {
            LANGUAGE_COLORS[lang] = LANGUAGE_COLORS_STRONG[lang] || LANGUAGE_COLORS_STRONG.other;
        } else {
            LANGUAGE_COLORS[lang] = LANGUAGE_COLORS_PASTEL[lang] || LANGUAGE_COLORS_PASTEL.other;
        }
    });

    // Fallbacks for codes outside the corpus
    LANGUAGE_COLORS.other = LANGUAGE_COLORS_PASTEL.other;
    if (!LANGUAGE_COLORS[NO_LANGUAGE]) {
        LANGUAGE_COLORS[NO_LANGUAGE] = LANGUAGE_COLORS_PASTEL[NO_LANGUAGE];
    }

    return LANGUAGE_COLORS;
}

// The one label table for parser and views, ISO 639-1 and the ISO 639-3 codes of Lexvo URIs
export const LANGUAGE_LABELS = {
    'de': 'Deutsch',
    'deu': 'Deutsch',
    'fr': 'Franzoesisch',
    'fra': 'Franzoesisch',
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
    'nl': 'Niederlaendisch',
    'nld': 'Niederlaendisch',
    'cy': 'Walisisch',
    'oc': 'Okzitanisch',
    'eu': 'Baskisch',
    'eus': 'Baskisch',
    'ca': 'Katalanisch',
    'cat': 'Katalanisch',
    'ro': 'Rumaenisch',
    'ron': 'Rumaenisch',
    'da': 'Daenisch',
    'eo': 'Esperanto',
    'pap': 'Papiamentu',
    [NO_LANGUAGE]: 'Ohne Angabe',
    'other': 'Andere'
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
