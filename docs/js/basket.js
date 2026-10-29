// Wissenskorb (Knowledge Basket) Module
// Allows users to collect letters, persons, and places for later analysis

import { BASKET_LIMITS } from './constants.js';

// One basket per dataset: IDs of another dataset would point at the wrong or no letters
const STORAGE_PREFIX = 'correspexplorer-basket';
let storageKey = STORAGE_PREFIX;

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
    storageKey = `${STORAGE_PREFIX}:${dataset || 'unknown'}`;
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
        default: return 50;
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

    // Check capacity
    if (!hasCapacity(type)) {
        console.warn(`[Basket] Capacity limit reached for ${type}`);
        return 'full';
    }

    basket[type].push(id);
    saveBasket();
    return true;
}

/**
 * Add several letters and describe the outcome for a toast. Letters beyond the capacity
 * limit are named, so the message never reports letters the basket did not take.
 * @param {string[]} ids - Letter IDs
 * @returns {string} Message for showToast
 */
export function addLettersToBasket(ids) {
    let added = 0;
    let rejected = 0;
    ids.forEach(id => {
        const result = addToBasket('letters', id);
        if (result === true) added++;
        else if (result === 'full') rejected++;
    });
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
 * Toggle item in basket
 * @param {string} type - 'letters', 'persons', or 'places'
 * @param {string} id - Item ID
 * @returns {boolean} - true if now in basket, false if removed
 */
export function toggleBasketItem(type, id) {
    if (isInBasket(type, id)) {
        removeFromBasket(type, id);
        return false;
    }
    // 'full' (capacity reached) leaves the item outside the basket
    return addToBasket(type, id) === true;
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
 */
export function onBasketChange(callback) {
    listeners.push(callback);
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
 * Export basket items with full data
 * @param {Object} dataIndices - The indices object containing persons, places data
 * @param {Array} allLetters - All letters array
 * @returns {Object} - Full basket data with resolved items
 */
export function resolveBasketItems(dataIndices, allLetters) {
    const resolved = {
        letters: [],
        persons: [],
        places: []
    };

    // Resolve letters
    const letterMap = new Map(allLetters.map(l => [l.id, l]));
    for (const id of basket.letters) {
        const letter = letterMap.get(id);
        if (letter) {
            resolved.letters.push(letter);
        }
    }

    // Resolve persons
    for (const id of basket.persons) {
        const person = dataIndices.persons?.[id];
        if (person) {
            resolved.persons.push({ id, ...person });
        }
    }

    // Resolve places
    for (const id of basket.places) {
        const place = dataIndices.places?.[id];
        if (place) {
            resolved.places.push({ id, ...place });
        }
    }

    return resolved;
}

/**
 * Generate shareable URL with basket items
 * @returns {string}
 */
export function generateBasketUrl() {
    const params = new URLSearchParams(window.location.search);

    if (basket.letters.length > 0) {
        params.set('basket_letters', basket.letters.join(','));
    }
    if (basket.persons.length > 0) {
        params.set('basket_persons', basket.persons.join(','));
    }
    if (basket.places.length > 0) {
        params.set('basket_places', basket.places.join(','));
    }

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/**
 * Load basket from URL parameters
 * @returns {boolean} - true if basket was loaded from URL
 */
export function loadBasketFromUrl() {
    const params = new URLSearchParams(window.location.search);
    let loaded = false;

    const letters = params.get('basket_letters');
    const persons = params.get('basket_persons');
    const places = params.get('basket_places');

    if (letters) {
        basket.letters = letters.split(',').filter(id => id);
        loaded = true;
    }
    if (persons) {
        basket.persons = persons.split(',').filter(id => id);
        loaded = true;
    }
    if (places) {
        basket.places = places.split(',').filter(id => id);
        loaded = true;
    }

    if (loaded) {
        saveBasket();
    }

    return loaded;
}
