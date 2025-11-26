// CorrespExplorer - Shared Data Module
// Multi-source data loading with in-memory caching

import { getCurrentSource, getDataType } from './config.js';

// Cache per data source
const cache = {
    herdata: null,
    hsa: null
};

/**
 * Load data for the current source
 * Uses in-memory cache to avoid redundant fetches
 * @returns {Promise<Object>} Data object (structure depends on source type)
 */
export async function loadData() {
    const source = getCurrentSource();
    const sourceId = source.id;

    // Return cached data if available
    if (cache[sourceId]) {
        console.log(`Using cached ${source.name} data`);
        return cache[sourceId];
    }

    console.log(`Fetching ${source.dataFile}`);

    const response = await fetch(source.dataFile);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch ${source.dataFile}`);
    }

    const data = await response.json();

    // Validate data structure based on type
    if (!data.meta) {
        throw new Error('Invalid data structure: missing meta object');
    }

    if (source.dataType === 'persons' && !Array.isArray(data.persons)) {
        throw new Error('Invalid data structure: missing persons array');
    }

    if (source.dataType === 'letters' && !Array.isArray(data.letters)) {
        throw new Error('Invalid data structure: missing letters array');
    }

    cache[sourceId] = data;

    const count = source.dataType === 'persons' ? data.persons.length : data.letters.length;
    console.log(`Loaded ${count} ${source.ui.entityLabel.toLowerCase()} from ${source.name}`);

    return data;
}

/**
 * Load persons data (legacy function for backward compatibility)
 * @returns {Promise<{meta: Object, persons: Array}>}
 */
export async function loadPersons() {
    const source = getCurrentSource();

    if (source.dataType !== 'persons') {
        console.warn('loadPersons() called but current source is letter-centric');
    }

    return loadData();
}

/**
 * Load letters data
 * @returns {Promise<{meta: Object, letters: Array, indices: Object}>}
 */
export async function loadLetters() {
    const source = getCurrentSource();

    if (source.dataType !== 'letters') {
        console.warn('loadLetters() called but current source is person-centric');
    }

    return loadData();
}

/**
 * Get person by ID
 * @param {Array} persons - Array of person objects
 * @param {string} id - Person ID to find
 * @returns {Object|undefined} Person object or undefined
 */
export function getPersonById(persons, id) {
    return persons.find(p => p.id === id);
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
 * @param {string} authorityId - VIAF or GND ID
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
 * Clear cached data for current or all sources
 * @param {string|null} sourceId - Source to clear, or null for all
 */
export function clearCache(sourceId = null) {
    if (sourceId) {
        cache[sourceId] = null;
        console.log(`Cache cleared for ${sourceId}`);
    } else {
        Object.keys(cache).forEach(key => cache[key] = null);
        console.log('All caches cleared');
    }
}
