// Enrichment Module - Fetches additional data from lobid.org GND API
// Provides on-demand enrichment for persons with GND IDs

const LOBID_BASE = 'https://lobid.org/gnd/';
const CACHE_PREFIX = 'ce-enriched-';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * Extract GND ID from various URI formats
 * @param {string} uri - GND URI (e.g., http://d-nb.info/gnd/118540238)
 * @returns {string|null} - GND ID or null
 */
function extractGndId(uri) {
    if (!uri) return null;

    // Match patterns like:
    // http://d-nb.info/gnd/118540238
    // https://d-nb.info/gnd/118540238
    // 118540238
    const match = uri.match(/(?:d-nb\.info\/gnd\/|^)(\d+[0-9X]?)$/i);
    return match ? match[1] : null;
}

/**
 * Extract Wikidata ID from sameAs array
 * @param {Array} sameAs - Array of sameAs objects from lobid.org
 * @returns {string|null} - Wikidata QID or null
 */
function extractWikidataId(sameAs) {
    if (!Array.isArray(sameAs)) return null;

    for (const item of sameAs) {
        const id = item.id || item;
        if (typeof id === 'string' && id.includes('wikidata.org')) {
            const match = id.match(/Q\d+/);
            if (match) return match[0];
        }
    }
    return null;
}

/**
 * Extract Wikipedia URL from sameAs or wikipedia field
 * @param {Object} data - lobid.org response data
 * @returns {string|null} - Wikipedia URL or null
 */
function extractWikipediaUrl(data) {
    // Check wikipedia field first
    if (data.wikipedia && Array.isArray(data.wikipedia)) {
        // Prefer German Wikipedia
        const deWiki = data.wikipedia.find(w => w.id?.includes('de.wikipedia'));
        if (deWiki) return deWiki.id;
        // Fall back to any Wikipedia
        if (data.wikipedia[0]?.id) return data.wikipedia[0].id;
    }

    // Check sameAs for Wikipedia links
    if (Array.isArray(data.sameAs)) {
        for (const item of data.sameAs) {
            const id = item.id || item;
            if (typeof id === 'string' && id.includes('wikipedia.org')) {
                return id;
            }
        }
    }

    return null;
}

/**
 * Get cached enrichment data
 * @param {string} gndId - GND ID
 * @returns {Object|null} - Cached data or null if expired/missing
 */
function getCached(gndId) {
    try {
        const key = CACHE_PREFIX + gndId;
        const cached = sessionStorage.getItem(key);
        if (!cached) return null;

        const data = JSON.parse(cached);

        // Check if cache is still valid
        if (data.cachedAt && Date.now() - data.cachedAt < CACHE_DURATION) {
            return data;
        }

        // Cache expired
        sessionStorage.removeItem(key);
        return null;
    } catch {
        return null;
    }
}

/**
 * Store enrichment data in cache
 * @param {string} gndId - GND ID
 * @param {Object} data - Enrichment data
 */
function setCache(gndId, data) {
    try {
        const key = CACHE_PREFIX + gndId;
        const cacheData = {
            ...data,
            cachedAt: Date.now()
        };
        sessionStorage.setItem(key, JSON.stringify(cacheData));
    } catch {
        // Storage quota exceeded - ignore
    }
}

/**
 * Fetch enrichment data from lobid.org GND API
 * @param {string} gndUri - Full GND URI or just the ID
 * @returns {Promise<Object|null>} - Enriched person data or null on error
 */
export async function enrichFromGND(gndUri) {
    const gndId = extractGndId(gndUri);
    if (!gndId) return null;

    // Check cache first
    const cached = getCached(gndId);
    if (cached) return cached;

    try {
        const url = `${LOBID_BASE}${gndId}.json`;
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                // GND ID not found - cache negative result
                setCache(gndId, { notFound: true });
                return null;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Extract relevant fields
        const enriched = {
            gndId,
            name: data.preferredName || null,
            variantNames: data.variantName || [],
            birthDate: data.dateOfBirth?.[0] || null,
            deathDate: data.dateOfDeath?.[0] || null,
            birthPlace: data.placeOfBirth?.[0]?.label || null,
            deathPlace: data.placeOfDeath?.[0]?.label || null,
            professions: (data.professionOrOccupation || []).map(p => p.label).filter(Boolean),
            gender: data.gender?.[0]?.label || null,
            thumbnail: data.depiction?.[0]?.thumbnail || null,
            image: data.depiction?.[0]?.id || null,
            wikidataId: extractWikidataId(data.sameAs),
            wikipediaUrl: extractWikipediaUrl(data),
            biographicalNote: data.biographicalOrHistoricalInformation?.[0] || null,
            // Additional useful fields
            academicDegree: data.academicDegree?.[0]?.label || null,
            affiliations: (data.affiliation || []).map(a => a.label).filter(Boolean),
            placeOfActivity: (data.placeOfActivity || []).map(p => p.label).filter(Boolean)
        };

        // Cache the result
        setCache(gndId, enriched);

        return enriched;
    } catch (error) {
        console.warn(`Failed to enrich GND ${gndId}:`, error.message);
        return null;
    }
}

/**
 * Format life dates as string
 * @param {Object} enriched - Enriched person data
 * @returns {string} - Formatted life dates (e.g., "1749-1832")
 */
export function formatLifeDates(enriched) {
    if (!enriched) return '';

    const birth = enriched.birthDate;
    const death = enriched.deathDate;

    if (!birth && !death) return '';

    // Extract year from ISO date or year-only format
    const extractYear = (date) => {
        if (!date) return '?';
        const match = date.match(/^(\d{4})/);
        return match ? match[1] : date;
    };

    const birthYear = extractYear(birth);
    const deathYear = death ? extractYear(death) : '';

    if (deathYear) {
        return `${birthYear}-${deathYear}`;
    } else if (birth) {
        return `*${birthYear}`;
    }

    return '';
}

/**
 * Format place info as string
 * @param {Object} enriched - Enriched person data
 * @returns {string} - Formatted place info (e.g., "Frankfurt - Weimar")
 */
export function formatPlaces(enriched) {
    if (!enriched) return '';

    const birth = enriched.birthPlace;
    const death = enriched.deathPlace;

    if (!birth && !death) return '';

    if (birth && death && birth !== death) {
        return `${birth} - ${death}`;
    }

    return birth || death || '';
}

/**
 * Build external links HTML
 * @param {Object} enriched - Enriched person data
 * @returns {string} - HTML string with external links
 */
export function buildExternalLinks(enriched) {
    if (!enriched) return '';

    const links = [];

    // GND link
    if (enriched.gndId) {
        links.push(`<a href="https://d-nb.info/gnd/${enriched.gndId}" target="_blank" rel="noopener" title="GND">GND</a>`);
    }

    // Wikidata link
    if (enriched.wikidataId) {
        links.push(`<a href="https://www.wikidata.org/wiki/${enriched.wikidataId}" target="_blank" rel="noopener" title="Wikidata">Wikidata</a>`);
    }

    // Wikipedia link
    if (enriched.wikipediaUrl) {
        links.push(`<a href="${enriched.wikipediaUrl}" target="_blank" rel="noopener" title="Wikipedia">Wikipedia</a>`);
    }

    return links.join(' | ');
}

/**
 * Clear all enrichment cache
 */
export function clearEnrichmentCache() {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
}

/**
 * Check if a person has GND authority
 * @param {Object} person - Person object from CMIF data
 * @returns {boolean} - True if person has GND ID
 */
export function hasGndId(person) {
    if (!person) return false;
    return person.authority === 'gnd' && person.authorityId;
}

/**
 * Get GND URI from person object
 * @param {Object} person - Person object from CMIF data
 * @returns {string|null} - GND URI or null
 */
export function getGndUri(person) {
    if (!hasGndId(person)) return null;
    return `http://d-nb.info/gnd/${person.authorityId}`;
}
