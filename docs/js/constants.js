// Zentrale Konstanten fuer CorrespExplorer

// Basis-Sprachfarben (kraeftig) - fuer dominante Sprache
export const LANGUAGE_COLORS_STRONG = {
    'de': '#1e40af', // Deutsch - primaer blau
    'fr': '#dc2626', // Franzoesisch - rot
    'it': '#16a34a', // Italienisch - gruen
    'en': '#7c3aed', // Englisch - lila
    'es': '#ea580c', // Spanisch - orange
    'pt': '#0891b2', // Portugiesisch - cyan
    'la': '#57534e', // Latein - grau
    'hu': '#be185d', // Ungarisch - pink
    'nl': '#d97706', // Niederlaendisch - amber
    'cy': '#4f46e5', // Walisisch - indigo
    'oc': '#0d9488', // Okzitanisch - teal
    'None': '#78716c', // Ohne Angabe - grau
    'other': '#78716c' // Andere - grau
};

// Pastell-Sprachfarben (dezent) - fuer sekundaere Sprachen
export const LANGUAGE_COLORS_PASTEL = {
    'de': '#93c5fd', // Deutsch - helles blau
    'fr': '#fca5a5', // Franzoesisch - helles rot
    'it': '#86efac', // Italienisch - helles gruen
    'en': '#c4b5fd', // Englisch - helles lila
    'es': '#fdba74', // Spanisch - helles orange
    'pt': '#a5f3fc', // Portugiesisch - helles cyan
    'la': '#d6d3d1', // Latein - helles grau
    'hu': '#f9a8d4', // Ungarisch - helles pink
    'nl': '#fcd34d', // Niederlaendisch - helles amber
    'cy': '#a5b4fc', // Walisisch - helles indigo
    'oc': '#99f6e4', // Okzitanisch - helles teal
    'None': '#d6d3d1', // Ohne Angabe - helles grau
    'other': '#d6d3d1' // Andere - helles grau
};

// Dynamische Farbzuweisung basierend auf Sprachverteilung
// Wird beim Laden des Datensatzes berechnet
export const LANGUAGE_COLORS = { ...LANGUAGE_COLORS_STRONG };

// Berechnet dynamische Farben basierend auf Briefverteilung
export function computeLanguageColors(letters) {
    // Zaehle Briefe pro Sprache
    const langCounts = {};
    letters.forEach(letter => {
        const lang = letter.language?.code || 'None';
        langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    // Sortiere nach Haeufigkeit
    const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);

    // Loesche alte Eintraege
    Object.keys(LANGUAGE_COLORS).forEach(key => delete LANGUAGE_COLORS[key]);

    // Dominante Sprache (Top 1) bekommt kraeftige Farbe
    // Alle anderen bekommen Pastelltoene
    sorted.forEach(([lang, count], index) => {
        if (index === 0) {
            // Dominante Sprache - kraeftig
            LANGUAGE_COLORS[lang] = LANGUAGE_COLORS_STRONG[lang] || LANGUAGE_COLORS_STRONG.other;
        } else {
            // Sekundaere Sprachen - pastell
            LANGUAGE_COLORS[lang] = LANGUAGE_COLORS_PASTEL[lang] || LANGUAGE_COLORS_PASTEL.other;
        }
    });

    // Fallbacks fuer nicht vorhandene Sprachen
    LANGUAGE_COLORS.other = LANGUAGE_COLORS_PASTEL.other;
    if (!LANGUAGE_COLORS.None) {
        LANGUAGE_COLORS.None = LANGUAGE_COLORS_PASTEL.None;
    }

    return LANGUAGE_COLORS;
}

// Sprachnamen fuer Anzeige
export const LANGUAGE_LABELS = {
    'de': 'Deutsch',
    'fr': 'Franzoesisch',
    'it': 'Italienisch',
    'en': 'Englisch',
    'es': 'Spanisch',
    'pt': 'Portugiesisch',
    'la': 'Latein',
    'hu': 'Ungarisch',
    'nl': 'Niederlaendisch',
    'cy': 'Walisisch',
    'oc': 'Okzitanisch',
    'None': 'Ohne Angabe',
    'other': 'Andere'
};

// UI-Defaults
export const UI_DEFAULTS = {
    debounceDelay: 300,
    minBarHeight: 4,
    maxTopSenders: 5,
    maxTopLanguages: 10,
    timelineLabelInterval: 15
};

// Sortier-Optionen
export const SORT_OPTIONS = {
    persons: {
        'letters-desc': { field: 'letterCount', dir: 'desc' },
        'letters-asc': { field: 'letterCount', dir: 'asc' },
        'name-asc': { field: 'name', dir: 'asc' },
        'name-desc': { field: 'name', dir: 'desc' }
    },
    letters: {
        'date-desc': { field: 'year', dir: 'desc' },
        'date-asc': { field: 'year', dir: 'asc' },
        'sender-asc': { field: 'senderName', dir: 'asc' }
    },
    topics: {
        'count-desc': { field: 'letterCount', dir: 'desc' },
        'count-asc': { field: 'letterCount', dir: 'asc' },
        'name-asc': { field: 'label', dir: 'asc' }
    },
    places: {
        'count-desc': { field: 'filteredCount', dir: 'desc' },
        'count-asc': { field: 'filteredCount', dir: 'asc' },
        'name-asc': { field: 'name', dir: 'asc' },
        'name-desc': { field: 'name', dir: 'desc' }
    }
};

// View-Namen
export const VIEWS = {
    MAP: 'map',
    PERSONS: 'persons',
    LETTERS: 'letters',
    TIMELINE: 'timeline',
    TOPICS: 'topics',
    PLACES: 'places',
    NETWORK: 'network'
};

// Map-Konfiguration
export const MAP_DEFAULTS = {
    clusterRadius: 40,
    clusterMaxZoom: 12
};

// Netzwerk-Konfiguration
export const NETWORK_DEFAULTS = {
    minYears: 3,          // Minimum gemeinsame Jahre fuer Zeitgenossen
    maxNodes: 50,         // Maximale Knotenanzahl
    minCooccurrence: 5,   // Minimum Kookkurrenz fuer Themen
    maxYearsSlider: 50,   // Max-Wert fuer Jahre-Slider
    maxNodesSlider: 100   // Max-Wert fuer Knoten-Slider
};

// Warenkorb-Limits
export const BASKET_LIMITS = {
    maxPersons: 50,
    maxLetters: 100,
    maxPlaces: 50
};

// API-Konfiguration
export const API_DEFAULTS = {
    correspSearchPageSize: 10  // correspSearch API Ergebnisse pro Seite
};
