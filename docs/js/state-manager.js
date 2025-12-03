// State Manager - Zentrales State-Management für CorrespExplorer
// Verwaltet globalen Anwendungszustand und benachrichtigt Subscriber bei Änderungen

/**
 * AppState - Zentrale State-Verwaltung
 *
 * Struktur:
 * - data: Geladene CMIF-Daten (letters, indices, meta)
 * - filters: Aktive Filter (temporal, languages, person, subject, place, quality)
 * - ui: UI-Zustand (currentView, selected items, search terms, sort orders)
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
            temporal: null,              // { min: number, max: number }
            languages: [],               // Array of language codes
            person: null,                // Person ID
            subject: null,               // Subject URI
            place: null,                 // Place GeoNames ID
            quality: {
                preciseDates: false,
                knownPersons: false,
                locatedPlaces: false
            }
        };

        // UI state
        this.ui = {
            currentView: 'map',

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
            languages: [],
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
        this._filteredLetters = this.data.letters.filter(letter => {
            // Temporal filter
            if (this.filters.temporal) {
                if (!letter.year) return false;
                if (letter.year < this.filters.temporal.min || letter.year > this.filters.temporal.max) {
                    return false;
                }
            }

            // Language filter
            if (this.filters.languages.length > 0) {
                const langCode = letter.language?.code || 'None';
                if (!this.filters.languages.includes(langCode)) {
                    return false;
                }
            }

            // Person filter
            if (this.filters.person) {
                const senderId = letter.sender?.id;
                const recipientId = letter.recipient?.id;
                if (senderId !== this.filters.person && recipientId !== this.filters.person) {
                    return false;
                }
            }

            // Subject filter
            if (this.filters.subject) {
                const hasSubject = letter.mentions?.subjects?.some(s =>
                    (s.uri || s.id || s.label) === this.filters.subject
                );
                if (!hasSubject) return false;
            }

            // Place filter
            if (this.filters.place) {
                const placeId = letter.place_sent?.geonames_id;
                if (placeId !== this.filters.place) {
                    return false;
                }
            }

            // Quality filters
            if (this.filters.quality.preciseDates) {
                if (letter.datePrecision !== 'day') return false;
            }

            if (this.filters.quality.knownPersons) {
                if (!letter.sender?.id || !letter.recipient?.id) return false;
            }

            if (this.filters.quality.locatedPlaces) {
                if (!letter.place_sent?.lat || !letter.place_sent?.lon) return false;
            }

            return true;
        });

        this._filtersDirty = false;
        return this._filteredLetters;
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
     * Export state to URL parameters
     * @returns {URLSearchParams} URL params
     */
    toURLParams() {
        const params = new URLSearchParams();

        // Current view
        if (this.ui.currentView) {
            params.set('view', this.ui.currentView);
        }

        // Temporal filter
        if (this.filters.temporal) {
            params.set('yearMin', this.filters.temporal.min);
            params.set('yearMax', this.filters.temporal.max);
        }

        // Language filter
        if (this.filters.languages.length > 0) {
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

        return params;
    }

    /**
     * Load state from URL parameters
     * @param {URLSearchParams} params - URL params
     */
    fromURLParams(params) {
        const updates = {};

        // View
        const view = params.get('view');
        if (view) {
            this.updateUI({ currentView: view });
        }

        // Temporal filter
        const yearMin = params.get('yearMin');
        const yearMax = params.get('yearMax');
        if (yearMin && yearMax) {
            updates.temporal = {
                min: parseInt(yearMin),
                max: parseInt(yearMax)
            };
        }

        // Language filter
        const langs = params.get('langs');
        if (langs) {
            updates.languages = langs.split(',');
        }

        // Person filter
        const person = params.get('person');
        if (person) {
            updates.person = person;
        }

        // Subject filter
        const subject = params.get('subject');
        if (subject) {
            updates.subject = subject;
        }

        // Place filter
        const place = params.get('place');
        if (place) {
            updates.place = place;
        }

        if (Object.keys(updates).length > 0) {
            this.updateFilters(updates);
        }
    }
}

// Singleton instance
export const state = new AppState();
