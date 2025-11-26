// CorrespExplorer - HSA Data Module
// Data loading with in-memory caching

import { CONFIG } from './config.js';

const DEBUG = false;

const log = {
    debug: (msg) => DEBUG && console.log(`[Data] ${msg}`)
};

// Cache for loaded data
let cache = null;

/**
 * Load HSA letters data
 * Uses in-memory cache to avoid redundant fetches
 * @returns {Promise<{meta: Object, letters: Array, indices: Object}>}
 */
export async function loadData() {
    if (cache) {
        log.debug('Using cached HSA data');
        return cache;
    }

    log.debug(`Fetching ${CONFIG.dataFile}`);

    const response = await fetch(CONFIG.dataFile);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch ${CONFIG.dataFile}`);
    }

    const data = await response.json();

    if (!data.meta) {
        throw new Error('Invalid data structure: missing meta object');
    }

    if (!Array.isArray(data.letters)) {
        throw new Error('Invalid data structure: missing letters array');
    }

    cache = data;

    log.debug(`Loaded ${data.letters.length} letters from HSA`);

    return data;
}

/**
 * Get letter by ID
 * @param {Array} letters - Array of letter objects
 * @param {string} id - Letter ID to find
 * @returns {Object|undefined} Letter object or undefined
 */
export function getLetterById(letters, id) {
    return letters.find(l => l.id === id);
}

/**
 * Get person from indices by authority ID
 * @param {Object} indices - Indices object with persons
 * @param {string} authorityId - VIAF ID
 * @returns {Object|undefined} Person data from index
 */
export function getPersonFromIndex(indices, authorityId) {
    return indices?.persons?.[authorityId];
}

/**
 * Get place from indices by GeoNames ID
 * @param {Object} indices - Indices object with places
 * @param {string} geonamesId - GeoNames ID
 * @returns {Object|undefined} Place data from index
 */
export function getPlaceFromIndex(indices, geonamesId) {
    return indices?.places?.[geonamesId];
}

/**
 * Get subject from indices
 * @param {Object} indices - Indices object with subjects
 * @param {string} subjectId - Subject URI or ID
 * @returns {Object|undefined} Subject data from index
 */
export function getSubjectFromIndex(indices, subjectId) {
    return indices?.subjects?.[subjectId];
}

/**
 * Clear cached data
 */
export function clearCache() {
    cache = null;
    log.debug('Cache cleared');
}
