// Wissenskorb (Knowledge Basket) Module
// Allows users to collect letters, persons, and places for later analysis

import { BASKET_LIMITS } from './constants.js';
import { showToast } from './utils.js';

// One basket per dataset: IDs of another dataset would point at the wrong or no letters
const STORAGE_PREFIX = 'correspexplorer-basket';
let storageKey = STORAGE_PREFIX;
let currentDataset = 'unknown';

// URL parameters of a shared basket. Format 2 percent-encodes each key before joining with
// commas, because name-based person keys ("Nachname, Vorname") contain commas themselves.
const URL_PARAMS = { letters: 'basket_letters', persons: 'basket_persons', places: 'basket_places' };
const URL_DATASET_PARAM = 'basket_dataset';
const URL_FORMAT_PARAM = 'basket_v';
const URL_FORMAT = '2';
const BASKET_TYPES = ['letters', 'persons', 'places'];

// Capacity limits
const MAX_PERSONS = BASKET_LIMITS.maxPersons;
const MAX_LETTERS = BASKET_LIMITS.maxLetters;
const MAX_PLACES = BASKET_LIMITS.maxPlaces;

// Basket data structure
let basket = {
    letters: [],    // Array of letter IDs
    persons: [],    // Array of person IDs
    places: []      // Array of place IDs
};

// Event listeners for basket changes
const listeners = [];

// Storage event listener for multi-tab sync
let storageListenerInitialized = false;

/**
 * Identifies the loaded dataset by its source (json path, file name or URL)
 * @param {Object} sourceInfo - { type, source } as written by upload.js and explore.js
 * @returns {string}
 */
export function datasetKey(sourceInfo) {
    return sourceInfo?.source ? `${sourceInfo.type || 'data'}:${sourceInfo.source}` : 'unknown';
}

/**
 * Initialize the basket of one dataset from localStorage
 * @param {string} dataset - Key from datasetKey()
 */
export function initBasket(dataset) {
    currentDataset = dataset || 'unknown';
    storageKey = `${STORAGE_PREFIX}:${currentDataset}`;
    basket = { letters: [], persons: [], places: [] };
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            basket = {
                letters: parsed.letters || [],
                persons: parsed.persons || [],
                places: parsed.places || []
            };
        }
    } catch (e) {
        console.warn('Could not load basket from localStorage:', e);
        basket = { letters: [], persons: [], places: [] };
    }

    // Setup storage event listener for multi-tab sync
    if (!storageListenerInitialized) {
        window.addEventListener('storage', handleStorageEvent);
        storageListenerInitialized = true;
    }

    notifyListeners();
}

/**
 * Handle storage events from other tabs
 */
function handleStorageEvent(e) {
    if (e.key === storageKey) {
        try {
            const parsed = JSON.parse(e.newValue || '{}');
            basket = {
                letters: parsed.letters || [],
                persons: parsed.persons || [],
                places: parsed.places || []
            };
            notifyListeners();
        } catch (err) {
            // Ignore parsing errors
        }
    }
}

/**
 * Save basket to localStorage
 */
function saveBasket() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(basket));
    } catch (e) {
        console.warn('Could not save basket to localStorage:', e);
    }
    notifyListeners();
}

/**
 * Get capacity limit for a type
 * @param {string} type
 * @returns {number}
 */
function getCapacityLimit(type) {
    switch (type) {
        case 'persons': return MAX_PERSONS;
        case 'letters': return MAX_LETTERS;
        case 'places': return MAX_PLACES;
        default: return 0;
    }
}

/**
 * Check if basket has capacity for a type
 * @param {string} type
 * @returns {boolean}
 */
export function hasCapacity(type) {
    if (!basket[type]) return false;
    return basket[type].length < getCapacityLimit(type);
}

/**
 * Add item to basket
 * @param {string} type - 'letters', 'persons', or 'places'
 * @param {string} id - Item ID
 * @returns {boolean|string} - true if added, false if already exists, 'full' if capacity reached
 */
export function addToBasket(type, id) {
    if (!basket[type]) return false;
    if (basket[type].includes(id)) return false;

    if (!hasCapacity(type)) return 'full';

    basket[type].push(id);
    saveBasket();
    return true;
}

/**
 * Add several items of one type with a single save and a single change notification, so a bulk
 * add from a view does not write localStorage and re-render the listeners once per item.
 * @param {string} type - 'letters', 'persons', or 'places'
 * @param {string[]} ids - Item IDs (personKey/placeKey for persons and places)
 * @returns {{added: number, duplicates: number, rejected: number}} rejected counts items beyond the capacity limit
 */
export function addItemsToBasket(type, ids) {
    const result = { added: 0, duplicates: 0, rejected: 0 };
    if (!basket[type]) return result;
    const limit = getCapacityLimit(type);
    const present = new Set(basket[type]);
    for (const id of ids) {
        if (id === null || id === undefined || id === '') continue;
        if (present.has(id)) {
            result.duplicates++;
        } else if (basket[type].length >= limit) {
            result.rejected++;
        } else {
            basket[type].push(id);
            present.add(id);
            result.added++;
        }
    }
    if (result.added > 0) saveBasket();
    return result;
}

/**
 * Add several letters and describe the outcome for a toast. Letters beyond the capacity
 * limit are named, so the message never reports letters the basket did not take.
 * @param {string[]} ids - Letter IDs
 * @returns {string} Message for showToast
 */
export function addLettersToBasket(ids) {
    const { added, rejected } = addItemsToBasket('letters', ids);
    if (rejected > 0) {
        return `${added} Briefe zum Korb hinzugefuegt, ${rejected} nicht: Korb voll (hoechstens ${MAX_LETTERS} Briefe)`;
    }
    return added > 0 ? `${added} Briefe zum Korb hinzugefuegt` : 'Alle Briefe bereits im Korb';
}

/**
 * Remove item from basket
 * @param {string} type - 'letters', 'persons', or 'places'
 * @param {string} id - Item ID
 * @returns {boolean} - true if removed, false if not found
 */
export function removeFromBasket(type, id) {
    if (!basket[type]) return false;
    const index = basket[type].indexOf(id);
    if (index === -1) return false;

    basket[type].splice(index, 1);
    saveBasket();
    return true;
}

/**
 * Check if item is in basket
 * @param {string} type - 'letters', 'persons', or 'places'
 * @param {string} id - Item ID
 * @returns {boolean}
 */
export function isInBasket(type, id) {
    return basket[type]?.includes(id) || false;
}

/**
 * Get all items of a type from basket
 * @param {string} type - 'letters', 'persons', or 'places'
 * @returns {Array}
 */
export function getBasketItems(type) {
    return [...(basket[type] || [])];
}

/**
 * Get total count of items in basket
 * @returns {number}
 */
export function getBasketCount() {
    return basket.letters.length + basket.persons.length + basket.places.length;
}

/**
 * Get counts by type
 * @returns {Object}
 */
export function getBasketCounts() {
    return {
        letters: basket.letters.length,
        persons: basket.persons.length,
        places: basket.places.length,
        total: getBasketCount()
    };
}

/**
 * Clear entire basket
 */
export function clearBasket() {
    basket = { letters: [], persons: [], places: [] };
    saveBasket();
}

/**
 * Add listener for basket changes
 * @param {Function} callback
 * @returns {Function} Removes the listener again
 */
export function onBasketChange(callback) {
    listeners.push(callback);
    // The pages listen for their lifetime; the tests remove their listener again
    return () => {
        const index = listeners.indexOf(callback);
        if (index >= 0) listeners.splice(index, 1);
    };
}

/**
 * Notify all listeners of basket change
 */
function notifyListeners() {
    const counts = getBasketCounts();
    listeners.forEach(callback => {
        try {
            callback(counts, basket);
        } catch (e) {
            console.warn('Basket listener error:', e);
        }
    });
}

/**
 * Serialise a basket into URL parameters (format 2) together with its dataset key
 * @param {{letters: string[], persons: string[], places: string[]}} items
 * @param {string} dataset - Key from datasetKey()
 * @param {URLSearchParams} [params] - Existing parameters; stale basket parameters are removed
 * @returns {URLSearchParams}
 */
export function basketToParams(items, dataset, params = new URLSearchParams()) {
    for (const name of [...Object.values(URL_PARAMS), URL_DATASET_PARAM, URL_FORMAT_PARAM]) {
        params.delete(name);
    }
    let any = false;
    for (const type of BASKET_TYPES) {
        const ids = items[type] || [];
        if (ids.length > 0) {
            params.set(URL_PARAMS[type], ids.map(encodeURIComponent).join(','));
            any = true;
        }
    }
    if (any) {
        params.set(URL_FORMAT_PARAM, URL_FORMAT);
        if (dataset && dataset !== 'unknown') params.set(URL_DATASET_PARAM, dataset);
    }
    return params;
}

/**
 * Read a shared basket from URL parameters. Links without basket_v predate format 2 and are
 * split on commas only.
 * @param {URLSearchParams} params
 * @returns {{items: {letters: string[], persons: string[], places: string[]}, dataset: string|null, found: boolean}}
 */
export function basketFromParams(params) {
    const encoded = params.get(URL_FORMAT_PARAM) === URL_FORMAT;
    const decode = (part) => {
        if (!encoded) return part;
        try {
            return decodeURIComponent(part);
        } catch {
            return part;
        }
    };
    const items = { letters: [], persons: [], places: [] };
    let found = false;
    for (const type of BASKET_TYPES) {
        const value = params.get(URL_PARAMS[type]);
        if (value) {
            items[type] = [...new Set(value.split(',').filter(Boolean).map(decode).filter(Boolean))];
            found = true;
        }
    }
    return { items, dataset: params.get(URL_DATASET_PARAM), found };
}

/**
 * Dataset key named by the basket parameters of the current URL, if any
 * @returns {string|null}
 */
export function getSharedBasketDataset() {
    return new URLSearchParams(window.location.search).get(URL_DATASET_PARAM);
}

/**
 * Generate a shareable URL for the current page with the basket and its dataset key
 * @returns {string}
 */
export function generateBasketUrl() {
    const params = basketToParams(basket, currentDataset, new URLSearchParams(window.location.search));
    const query = params.toString();
    return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
}

/**
 * Merge a basket shared via URL parameters into the basket of the loaded dataset, once: the
 * parameters are removed from the address afterwards, so a reload does not import again.
 * A link for another dataset is not imported, because its IDs would point at other letters.
 * @param {Object} [options]
 * @param {boolean} [options.notify=true] - Report the outcome with showToast
 * @returns {{status: 'none'|'imported'|'other-dataset', added: number, rejected: number, dataset: string|null}}
 */
export function loadBasketFromUrl({ notify = true } = {}) {
    const params = new URLSearchParams(window.location.search);
    const { items, dataset, found } = basketFromParams(params);
    if (!found) return { status: 'none', added: 0, rejected: 0, dataset };

    const outcome = { status: 'imported', added: 0, rejected: 0, dataset };
    if (dataset && dataset !== currentDataset) {
        outcome.status = 'other-dataset';
    } else {
        for (const type of BASKET_TYPES) {
            const { added, rejected } = addItemsToBasket(type, items[type]);
            outcome.added += added;
            outcome.rejected += rejected;
        }
    }

    // Strip the basket parameters, so a reload or a later navigation does not import again
    basketToParams({}, null, params);
    const query = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);

    if (notify) {
        if (outcome.status === 'other-dataset') {
            const source = dataset.slice(dataset.indexOf(':') + 1);
            showToast(`Der geteilte Korb gehoert zum Datensatz "${source}". Laden Sie diesen Datensatz und oeffnen Sie den Link erneut.`, 8000);
        } else if (outcome.rejected > 0) {
            showToast(`${outcome.added} Eintraege aus dem geteilten Korb uebernommen, ${outcome.rejected} nicht: Korb voll (hoechstens ${MAX_LETTERS} Briefe, ${MAX_PERSONS} Personen, ${MAX_PLACES} Orte)`, 6000);
        } else {
            showToast(outcome.added > 0
                ? `${outcome.added} Eintraege aus dem geteilten Korb uebernommen`
                : 'Alle Eintraege des geteilten Korbs sind bereits im Korb');
        }
    }
    return outcome;
}
