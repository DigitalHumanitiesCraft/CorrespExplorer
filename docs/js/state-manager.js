// State manager: one filter state for all views (ADR-003), so every view and the URL see the same
// letter set, and subscribers learn about changes without importing each other

import { personKey, placeKey } from './utils.js';

const LEGACY_PLACE_PREFIX = 'name:';
import { NO_LANGUAGE } from './constants.js';

/**
 * AppState
 *
 * - data: loaded CMIF data (letters, indices, meta)
 * - filters: active filters (temporal, languages, person, subject, place, quality)
 * - ui: UI state (currentView, selected items, search terms, sort orders)
 */
class AppState {
    constructor() {
        // Core data
        this.data = {
            letters: [],
            indices: {
                persons: {},
                places: {},
                subjects: {},
                languages: {}
            },
            meta: {},
            placeAggregation: {}
        };

        // Filter state
        this.filters = {
            temporal: null,              // { min, max } or { undated: true }
            languages: null,             // null = no filter, array = allowed codes (empty = none)
            person: null,                // personKey: authority id, else name
            subject: null,               // Subject URI, else id or label
            place: null,                 // placeKey: GeoNames id, else name
            quality: {
                preciseDates: false,
                knownPersons: false,
                locatedPlaces: false
            }
        };

        // UI state
        this.ui = {
            currentView: 'overview',

            // Topics view
            selectedTopicId: null,
            topicsSearchTerm: '',
            topicsSortOrder: 'count-desc',

            // Places view
            selectedPlaceId: null,
            placesSearchTerm: '',
            placesSortOrder: 'count-desc',

            // Network view
            networkMode: 'contemporaries',
            networkMinYears: 3,
            networkMaxNodes: 50,
            networkMinCooccurrence: 5,
            networkColorMode: 'type',

            // Mentions Flow view
            mentionsFlowMode: 'sankey',
            mentionsTopN: 20,
            mentionsMinCount: 2,
            mentionsMinSenderMentions: 5,

            // Map view
            mapColorMode: 'language',

            // General
            dateRange: { min: 1800, max: 2000 },
            availableViews: {}
        };

        // Map infrastructure (not part of reactive state)
        this.mapInstance = null;
        this.mapInitialized = false;

        // Subscribers for state changes
        this.subscribers = {
            data: [],
            filters: [],
            ui: []
        };

        // Computed state cache
        this._filteredLetters = null;
        this._filtersDirty = true;
    }

    /**
     * Subscribe to state changes
     * @param {string} stateKey - 'data', 'filters', or 'ui'
     * @param {Function} callback - Function to call when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(stateKey, callback) {
        if (!this.subscribers[stateKey]) {
            console.warn(`Unknown state key: ${stateKey}`);
            return () => {};
        }

        this.subscribers[stateKey].push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.subscribers[stateKey].indexOf(callback);
            if (index > -1) {
                this.subscribers[stateKey].splice(index, 1);
            }
        };
    }

    /**
     * Notify all subscribers of a state change
     * @param {string} stateKey - Which part of state changed
     */
    notify(stateKey) {
        if (this.subscribers[stateKey]) {
            this.subscribers[stateKey].forEach(callback => {
                try {
                    callback(this[stateKey]);
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            });
        }
    }

    /**
     * Set data (letters, indices, meta)
     * @param {Object} newData - Data object with letters, indices, meta
     */
    setData(newData) {
        this.data = {
            letters: newData.letters || [],
            indices: newData.indices || { persons: {}, places: {}, subjects: {}, languages: {} },
            meta: newData.meta || {},
            placeAggregation: newData.placeAggregation || {}
        };

        this._filtersDirty = true;
        this.notify('data');
    }

    /**
     * Update filters
     * @param {Object} filterUpdates - Partial filter object
     */
    updateFilters(filterUpdates) {
        this.filters = {
            ...this.filters,
            ...filterUpdates,
            quality: {
                ...this.filters.quality,
                ...(filterUpdates.quality || {})
            }
        };

        this._filtersDirty = true;
        this.notify('filters');
    }

    /**
     * Reset all filters to defaults
     */
    resetFilters() {
        this.filters = {
            temporal: null,
            languages: null,
            person: null,
            subject: null,
            place: null,
            quality: {
                preciseDates: false,
                knownPersons: false,
                locatedPlaces: false
            }
        };

        this._filtersDirty = true;
        this.notify('filters');
    }

    /**
     * Update UI state
     * @param {Object} uiUpdates - Partial UI object
     */
    updateUI(uiUpdates) {
        this.ui = {
            ...this.ui,
            ...uiUpdates
        };

        this.notify('ui');
    }

    /**
     * Get filtered letters (cached)
     * @returns {Array} Filtered letters
     */
    getFilteredLetters() {
        if (!this._filtersDirty && this._filteredLetters) {
            return this._filteredLetters;
        }

        // Apply all filters
        this._filteredLetters = this.filterLetters(this.filters);

        this._filtersDirty = false;
        return this._filteredLetters;
    }

    /**
     * Letters matching an arbitrary filter set, uncached. The sidebar uses it to count
     * languages under all other active filters.
     * @param {Object} filters - Same shape as this.filters
     * @returns {Array} Matching letters
     */
    filterLetters(filters) {
        return this.data.letters.filter(letter => {
            if (filters.temporal?.undated) {
                if (letter.year) return false;
            } else if (filters.temporal) {
                if (!letter.year) return false;
                if (letter.year < filters.temporal.min || letter.year > filters.temporal.max) {
                    return false;
                }
            }

            if (filters.languages) {
                const langCode = letter.language?.code || NO_LANGUAGE;
                if (!filters.languages.includes(langCode)) {
                    return false;
                }
            }

            if (filters.person) {
                if (personKey(letter.sender) !== filters.person &&
                    personKey(letter.recipient) !== filters.person) {
                    return false;
                }
            }

            if (filters.subject) {
                const hasSubject = letter.mentions?.subjects?.some(s =>
                    (s.uri || s.id || s.label) === filters.subject
                );
                if (!hasSubject) return false;
            }

            if (filters.place) {
                const place = letter.place_sent;
                if (!place || placeKey(place) !== filters.place) {
                    return false;
                }
            }

            if (filters.quality?.preciseDates && letter.datePrecision !== 'day') return false;
            if (filters.quality?.knownPersons && (!letter.sender?.id || !letter.recipient?.id)) return false;
            if (filters.quality?.locatedPlaces && (!letter.place_sent?.lat || !letter.place_sent?.lon)) return false;

            return true;
        });
    }

    /**
     * Get all letters (unfiltered)
     * @returns {Array} All letters
     */
    getAllLetters() {
        return this.data.letters;
    }

    /**
     * Get data indices
     * @returns {Object} Indices
     */
    getIndices() {
        return this.data.indices;
    }

    /**
     * Get metadata
     * @returns {Object} Meta
     */
    getMeta() {
        return this.data.meta;
    }

    /**
     * Get place aggregation
     * @returns {Object} Place aggregation
     */
    getPlaceAggregation() {
        return this.data.placeAggregation;
    }

    /**
     * Export view and every filter to URL parameters. fromURLParams reads the same names, so
     * a shared link restores the exact letter set.
     * Names: view, undated=1 | yearMin+yearMax, langs (comma list, empty = no language selected),
     * person, subject, place, precise=1, known=1, located=1
     * @returns {URLSearchParams} URL params
     */
    toURLParams() {
        const params = new URLSearchParams();

        // Current view
        if (this.ui.currentView) {
            params.set('view', this.ui.currentView);
        }

        // Temporal filter
        if (this.filters.temporal?.undated) {
            params.set('undated', '1');
        } else if (this.filters.temporal) {
            params.set('yearMin', this.filters.temporal.min);
            params.set('yearMax', this.filters.temporal.max);
        }

        // Language filter
        if (this.filters.languages) {
            params.set('langs', this.filters.languages.join(','));
        }

        // Person filter
        if (this.filters.person) {
            params.set('person', this.filters.person);
        }

        // Subject filter
        if (this.filters.subject) {
            params.set('subject', this.filters.subject);
        }

        // Place filter
        if (this.filters.place) {
            params.set('place', this.filters.place);
        }

        // Quality filters
        if (this.filters.quality?.preciseDates) params.set('precise', '1');
        if (this.filters.quality?.knownPersons) params.set('known', '1');
        if (this.filters.quality?.locatedPlaces) params.set('located', '1');

        return params;
    }

    /**
     * Load view and filters from URL parameters written by toURLParams. The URL describes the
     * complete filter state: a filter missing from it is reset, so the round trip is exact.
     * @param {URLSearchParams} params - URL params
     */
    fromURLParams(params) {
        const view = params.get('view');
        if (view) {
            this.updateUI({ currentView: view });
        }

        // A year range needs both ends as integers; anything else means no time filter
        let temporal = null;
        const yearMin = parseInt(params.get('yearMin'), 10);
        const yearMax = parseInt(params.get('yearMax'), 10);
        if (params.get('undated') === '1') {
            temporal = { undated: true };
        } else if (Number.isInteger(yearMin) && Number.isInteger(yearMax)) {
            temporal = { min: yearMin, max: yearMax };
        }

        // An empty langs parameter is a deliberate empty selection, not a missing filter
        let languages = null;
        if (params.has('langs')) {
            const langs = params.get('langs');
            languages = langs ? langs.split(',') : [];
        }

        // Links shared before ADR-001 named a place without GeoNames id as name:<Ort>; placeKey
        // keys such a place by its bare name, so the prefix is dropped to keep old links working
        let place = params.get('place') || null;
        if (place?.startsWith(LEGACY_PLACE_PREFIX)) place = place.slice(LEGACY_PLACE_PREFIX.length) || null;

        this.updateFilters({
            temporal,
            languages,
            person: params.get('person') || null,
            subject: params.get('subject') || null,
            place,
            quality: {
                preciseDates: params.get('precise') === '1',
                knownPersons: params.get('known') === '1',
                locatedPlaces: params.get('located') === '1'
            }
        });
    }
}

// Singleton instance
export const state = new AppState();
