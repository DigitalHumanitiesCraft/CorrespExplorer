// HerData - Shared Data Module
// Simple data loading with in-memory caching

let cachedData = null;

/**
 * Load persons data from JSON file
 * Uses in-memory cache to avoid redundant fetches
 * @returns {Promise<{meta: Object, persons: Array}>} Data object with meta and persons
 */
export async function loadPersons() {
    // Return cached data if available
    if (cachedData) {
        console.log('📦 Using cached persons data');
        return cachedData;
    }

    console.log('🔄 Fetching data/persons.json');

    const response = await fetch('data/persons.json');

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch persons.json`);
    }

    const data = await response.json();

    // Validate data structure
    if (!data.meta || !Array.isArray(data.persons)) {
        throw new Error('Invalid data structure: missing meta or persons array');
    }

    cachedData = data;
    console.log(`✅ Loaded ${data.persons.length} persons`);

    return data;
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
 * Clear cached data (useful for testing/reload)
 */
export function clearCache() {
    cachedData = null;
    console.log('🗑️ Cache cleared');
}
