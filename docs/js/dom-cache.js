// DOM cache of the explorer: elements looked up once by id and kept, so the many render calls do
// not repeat getElementById

/**
 * Lazy cache of DOM elements
 */
class DOMCache {
    constructor() {
        this._cache = new Map();
    }

    /**
     * Get element by ID with caching
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null
     */
    byId(id) {
        if (this._cache.has(id)) {
            return this._cache.get(id);
        }

        const element = document.getElementById(id);
        if (element) {
            this._cache.set(id, element);
        }
        return element;
    }

    /**
     * Clear cache (useful after dynamic DOM updates)
     */
    clear() {
        this._cache.clear();
    }
}

// Create singleton instance
const cache = new DOMCache();

/**
 * Pre-defined element accessors for frequently used elements
 * Uses getters for lazy initialization
 */
export const elements = {
    // Navigation
    get datasetTitle() { return cache.byId('dataset-title'); },

    // Stats cards
    get totalLettersCount() { return cache.byId('total-letters-count'); },
    get totalSendersCount() { return cache.byId('total-senders-count'); },
    get totalPlacesCount() { return cache.byId('total-places-count'); },

    // Filter controls
    get resetFiltersBtn() { return cache.byId('reset-filters'); },
    get yearRangeSlider() { return cache.byId('year-range-slider'); },
    get yearRangeText() { return cache.byId('year-range-text'); },

    // Quality filters
    get filterPreciseDates() { return cache.byId('filter-precise-dates'); },
    get filterKnownPersons() { return cache.byId('filter-known-persons'); },
    get filterLocatedPlaces() { return cache.byId('filter-located-places'); },

    // Language filter
    get languageFilterGroup() { return cache.byId('language-filter-group'); },
    get languageCheckboxes() { return cache.byId('language-checkboxes'); },

    // Views
    get mapLegend() { return cache.byId('map-legend'); },
    get mapColorToggle() { return cache.byId('map-color-toggle'); },

    get personSearch() { return cache.byId('person-search'); },
    get personSort() { return cache.byId('person-sort'); },
    get personsList() { return cache.byId('persons-list'); },

    get letterSearch() { return cache.byId('letter-search'); },
    get letterSort() { return cache.byId('letter-sort'); },
    get lettersList() { return cache.byId('letters-list'); },

    get placesList() { return cache.byId('places-list'); },

    get networkResetZoom() { return cache.byId('network-reset-zoom'); },

    get mentionsFlowPlaceholder() { return cache.byId('mentions-flow-placeholder'); },

    // Modals
    get exportModal() { return cache.byId('export-modal'); },
    get exportBtn() { return cache.byId('export-btn'); },

    // Loading overlay
    get loadingOverlay() { return cache.byId('loading-overlay'); },

    // Helper methods; the explorer never clears the cache, the tests do between cases
    clearCache() {
        cache.clear();
    },

    /**
     * Get element by custom ID (not in pre-defined list)
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null
     */
    getById(id) {
        return cache.byId(id);
    }
};

/**
 * Fill the cache with the elements the explorer reads first, once the DOM is ready
 */
export function initDOMCache() {
    ['loadingOverlay', 'datasetTitle', 'yearRangeSlider', 'personsList', 'lettersList']
        .forEach(key => elements[key]);
}
