// Zentrale Konstanten fuer CorrespExplorer

// Sprachfarben fuer Visualisierungen
export const LANGUAGE_COLORS = {
    'de': '#1e40af', // Deutsch - primaer blau
    'fr': '#dc2626', // Franzoesisch - rot
    'it': '#16a34a', // Italienisch - gruen
    'en': '#9333ea', // Englisch - lila
    'es': '#ea580c', // Spanisch - orange
    'pt': '#0891b2', // Portugiesisch - cyan
    'la': '#78716c', // Latein - grau
    'hu': '#be185d', // Ungarisch - pink
    'nl': '#f59e0b', // Niederlaendisch - amber
    'cy': '#6366f1', // Walisisch - indigo
    'oc': '#14b8a6', // Okzitanisch - teal
    'other': '#64748b' // Andere - slate
};

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
    'None': 'Unbekannt',
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
    PLACES: 'places'
};
