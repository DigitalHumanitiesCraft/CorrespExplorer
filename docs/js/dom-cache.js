// DOM Cache - Zentrale Referenzen zu häufig genutzten DOM-Elementen
// Reduziert wiederholte querySelector/getElementById-Aufrufe und verbessert Performance

/**
 * DOMCache - Lazy-loading cache für DOM-Elemente
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
     * Get element by selector with caching
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null} Element or null
     */
    bySelector(selector) {
        if (this._cache.has(selector)) {
            return this._cache.get(selector);
        }

        const element = document.querySelector(selector);
        if (element) {
            this._cache.set(selector, element);
        }
        return element;
    }

    /**
     * Get elements by selector (not cached, as NodeList can change)
     * @param {string} selector - CSS selector
     * @returns {NodeList} NodeList of elements
     */
    allBySelector(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * Clear cache (useful after dynamic DOM updates)
     */
    clear() {
        this._cache.clear();
    }

    /**
     * Remove specific element from cache
     * @param {string} key - ID or selector
     */
    remove(key) {
        this._cache.delete(key);
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
    get navbar() { return cache.bySelector('.navbar'); },
    get navBrand() { return cache.bySelector('.nav-brand'); },
    get datasetTitle() { return cache.byId('dataset-title'); },
    get viewSwitcher() { return cache.bySelector('.view-switcher'); },
    get viewButtons() { return cache.allBySelector('.view-btn'); },

    // Sidebar
    get sidebar() { return cache.bySelector('.sidebar'); },

    // Stats cards
    get totalLettersCount() { return cache.byId('total-letters-count'); },
    get totalSendersCount() { return cache.byId('total-senders-count'); },
    get totalPlacesCount() { return cache.byId('total-places-count'); },
    get sourceInfo() { return cache.byId('source-info'); },
    get dataCoverageDetails() { return cache.byId('data-coverage-details'); },

    // Quality icons
    get lettersQualityIcon() { return cache.byId('letters-quality-icon'); },
    get sendersQualityIcon() { return cache.byId('senders-quality-icon'); },
    get placesQualityIcon() { return cache.byId('places-quality-icon'); },

    // Filter controls
    get resetFiltersBtn() { return cache.byId('reset-filters'); },
    get activeFilters() { return cache.byId('active-filters'); },
    get yearRangeSlider() { return cache.byId('year-range-slider'); },
    get yearRangeText() { return cache.byId('year-range-text'); },

    // Quality filters
    get qualityFilterGroup() { return cache.byId('quality-filter-group'); },
    get filterPreciseDates() { return cache.byId('filter-precise-dates'); },
    get filterKnownPersons() { return cache.byId('filter-known-persons'); },
    get filterLocatedPlaces() { return cache.byId('filter-located-places'); },

    // Language filter
    get languageFilterGroup() { return cache.byId('language-filter-group'); },
    get languageCheckboxes() { return cache.byId('language-checkboxes'); },

    // Topics filter
    get topicsFilterGroup() { return cache.byId('topics-filter-group'); },
    get topicsQuickSearch() { return cache.byId('topics-quick-search'); },
    get topicsQuickFilter() { return cache.byId('topics-quick-filter'); },
    get showAllTopics() { return cache.byId('show-all-topics'); },

    // Mentions Flow filter
    get mentionsFilterGroup() { return cache.byId('mentions-filter-group'); },
    get mentionsPersonSearch() { return cache.byId('mentions-person-search'); },
    get mentionsPersonDropdown() { return cache.byId('mentions-person-dropdown'); },

    // View containers
    get mapContainer() { return cache.byId('map-container'); },
    get mapElement() { return cache.byId('map'); },
    get mapLegend() { return cache.byId('map-legend'); },
    get mapColorToggle() { return cache.byId('map-color-toggle'); },

    get personsContainer() { return cache.byId('persons-container'); },
    get personSearch() { return cache.byId('person-search'); },
    get personSort() { return cache.byId('person-sort'); },
    get personsList() { return cache.byId('persons-list'); },

    get lettersContainer() { return cache.byId('letters-container'); },
    get letterSearch() { return cache.byId('letter-search'); },
    get letterSort() { return cache.byId('letter-sort'); },
    get lettersList() { return cache.byId('letters-list'); },

    get timelineContainer() { return cache.byId('timeline-container'); },
    get timelineChart() { return cache.byId('timeline-chart'); },

    get topicsContainer() { return cache.byId('topics-container'); },
    get topicsSearch() { return cache.byId('topics-search'); },
    get topicsSort() { return cache.byId('topics-sort'); },
    get topicsList() { return cache.byId('topics-list'); },
    get topicDetail() { return cache.byId('topic-detail'); },

    get placesContainer() { return cache.byId('places-container'); },
    get placesSearch() { return cache.byId('places-search'); },
    get placesSort() { return cache.byId('places-sort'); },
    get placesList() { return cache.byId('places-list'); },
    get placeDetail() { return cache.byId('place-detail'); },

    get networkContainer() { return cache.byId('network-container'); },
    get networkSvg() { return cache.byId('network-svg'); },
    get networkModeSelect() { return cache.byId('network-mode'); },
    get networkMinYearsSlider() { return cache.byId('network-min-years'); },
    get networkMinYearsValue() { return cache.byId('network-min-years-value'); },
    get networkMaxNodesSlider() { return cache.byId('network-max-nodes'); },
    get networkMaxNodesValue() { return cache.byId('network-max-nodes-value'); },
    get networkMinCooccurrenceSlider() { return cache.byId('network-min-cooccurrence'); },
    get networkMinCooccurrenceValue() { return cache.byId('network-min-cooccurrence-value'); },
    get networkColorModeSelect() { return cache.byId('network-color-mode'); },
    get networkResetZoom() { return cache.byId('network-reset-zoom'); },

    get mentionsFlowContainer() { return cache.byId('mentions-flow-container'); },
    get mentionsFlowSvg() { return cache.byId('mentions-flow-svg'); },
    get mentionsFlowPlaceholder() { return cache.byId('mentions-flow-placeholder'); },

    // Modals
    get exportModal() { return cache.byId('export-modal'); },
    get exportBtn() { return cache.byId('export-btn'); },
    get exportCsv() { return cache.byId('export-csv'); },
    get exportJson() { return cache.byId('export-json'); },
    get exportClose() { return cache.byId('export-close'); },

    get placesWithoutCoordsModal() { return cache.byId('places-without-coords-modal'); },
    get placesWithoutCoordsList() { return cache.byId('places-without-coords-list'); },
    get closeWithoutCoordsModal() { return cache.byId('close-without-coords-modal'); },

    // Loading overlay
    get loadingOverlay() { return cache.byId('loading-overlay'); },

    // Tooltips
    get mentionsTooltip() { return cache.byId('mentions-tooltip'); },

    // View-specific buttons
    get topicsViewBtn() { return cache.byId('topics-view-btn'); },
    get placesViewBtn() { return cache.byId('places-view-btn'); },
    get networkViewBtn() { return cache.byId('network-view-btn'); },
    get mentionsFlowViewBtn() { return cache.byId('mentions-flow-view-btn'); },

    // Helper methods
    clearCache() {
        cache.clear();
    },

    removeFromCache(key) {
        cache.remove(key);
    },

    /**
     * Check if element exists
     * @param {string} id - Element ID
     * @returns {boolean} True if element exists
     */
    exists(id) {
        return cache.byId(id) !== null;
    },

    /**
     * Get element by custom ID (not in pre-defined list)
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null
     */
    getById(id) {
        return cache.byId(id);
    },

    /**
     * Get element by custom selector (not in pre-defined list)
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null} Element or null
     */
    getBySelector(selector) {
        return cache.bySelector(selector);
    },

    /**
     * Get elements by custom selector (returns NodeList)
     * @param {string} selector - CSS selector
     * @returns {NodeList} NodeList of elements
     */
    getAllBySelector(selector) {
        return cache.allBySelector(selector);
    }
};

/**
 * Initialize cache after DOM is ready
 * This pre-loads frequently accessed elements
 */
export function initDOMCache() {
    // Pre-load critical elements by accessing them
    // This ensures they're in cache when needed
    const criticalElements = [
        'loadingOverlay',
        'navbar',
        'sidebar',
        'viewButtons',
        'mapContainer',
        'personsContainer',
        'lettersContainer',
        'timelineContainer'
    ];

    criticalElements.forEach(key => {
        try {
            // Access getter to trigger caching
            elements[key];
        } catch (error) {
            console.warn(`Failed to pre-cache element: ${key}`);
        }
    });

    console.log('[DOM Cache] Initialized with pre-loaded elements');
}
