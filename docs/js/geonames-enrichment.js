// GeoNames Coordinate Enrichment - Resolves GeoNames IDs to coordinates via Wikidata SPARQL
// Uses Wikidata as intermediary: GeoNames ID (P1566) → Coordinates (P625)

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'CorrespExplorer/1.0 (https://github.com/DigitalHumanitiesCraft/CorrespExplorer)';
const BATCH_SIZE = 50; // Wikidata recommendation
const CACHE_KEY = 'correspexplorer_geonames_cache';
const CACHE_TTL_DAYS = 7;

/**
 * Execute SPARQL query against Wikidata
 * @param {string} query - SPARQL query
 * @returns {Promise<Object>} Query results
 */
async function sparqlQuery(query) {
    const url = `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/sparql-results+json',
            'User-Agent': USER_AGENT
        }
    });

    if (!response.ok) {
        throw new Error(`Wikidata SPARQL error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Resolve GeoNames IDs to coordinates via Wikidata in batches
 * @param {Array<string>} geonamesIds - Array of GeoNames IDs
 * @param {Function} onProgress - Progress callback (loaded, total)
 * @returns {Promise<Object>} Map of geonamesId -> {lat, lon, name}
 */
export async function resolveGeoNamesCoordinates(geonamesIds, onProgress = null) {
    const results = {};
    const total = geonamesIds.length;
    let processed = 0;

    // Check cache first
    const cache = loadCache();
    const uncachedIds = [];

    for (const id of geonamesIds) {
        if (cache[id]) {
            results[id] = cache[id];
            processed++;
        } else {
            uncachedIds.push(id);
        }
    }

    if (onProgress && processed > 0) {
        onProgress(processed, total);
    }

    // Process uncached IDs in batches
    for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
        const batch = uncachedIds.slice(i, i + BATCH_SIZE);

        const batchResults = await resolveBatch(batch);

        for (const [id, coords] of Object.entries(batchResults)) {
            results[id] = coords;
            cache[id] = coords; // Update cache
        }

        processed += batch.length;
        if (onProgress) {
            onProgress(processed, total);
        }

        // Rate limiting: Wikidata recommends max 1 request/second
        if (i + BATCH_SIZE < uncachedIds.length) {
            await sleep(1500);
        }
    }

    // Save updated cache
    saveCache(cache);

    return results;
}

/**
 * Resolve a batch of GeoNames IDs via Wikidata SPARQL
 * @param {Array<string>} geonamesIds - Batch of GeoNames IDs
 * @returns {Promise<Object>} Map of geonamesId -> {lat, lon, name}
 */
async function resolveBatch(geonamesIds) {
    const results = {};

    // Build VALUES clause for batch query
    const values = geonamesIds.map(id => `"${id}"`).join(' ');

    const query = `
        SELECT ?geonamesId ?lat ?lon ?label ?labelDe WHERE {
            VALUES ?geonamesId { ${values} }
            ?place wdt:P1566 ?geonamesId .
            ?place p:P625 ?coordStatement .
            ?coordStatement psv:P625 ?coordNode .
            ?coordNode wikibase:geoLatitude ?lat .
            ?coordNode wikibase:geoLongitude ?lon .
            OPTIONAL { ?place rdfs:label ?label . FILTER(LANG(?label) = "en") }
            OPTIONAL { ?place rdfs:label ?labelDe . FILTER(LANG(?labelDe) = "de") }
        }
    `;

    try {
        const response = await sparqlQuery(query);

        if (response.results && response.results.bindings) {
            for (const binding of response.results.bindings) {
                const id = binding.geonamesId.value;
                results[id] = {
                    lat: parseFloat(binding.lat.value),
                    lon: parseFloat(binding.lon.value),
                    name: binding.labelDe?.value || binding.label?.value || null
                };
            }
        }
    } catch (error) {
        console.error('Error resolving GeoNames batch:', error);
        // Don't throw - return partial results
    }

    return results;
}

/**
 * Enrich data object with resolved coordinates
 * @param {Object} data - Parsed CMIF data
 * @param {Object} coordinates - Map of geonamesId -> {lat, lon, name}
 * @returns {Object} Enriched data
 */
export function applyCoordinatesToData(data, coordinates) {
    let enrichedCount = 0;

    // Enrich letters
    for (const letter of data.letters) {
        if (letter.place_sent?.geonames_id) {
            const coords = coordinates[letter.place_sent.geonames_id];
            if (coords && !letter.place_sent.lat) {
                letter.place_sent.lat = coords.lat;
                letter.place_sent.lon = coords.lon;
                enrichedCount++;
            }
        }
    }

    // Enrich places index
    for (const [id, place] of Object.entries(data.indices.places)) {
        const coords = coordinates[id];
        if (coords && !place.lat) {
            place.lat = coords.lat;
            place.lon = coords.lon;
            enrichedCount++;
        }
    }

    console.log(`Enriched ${enrichedCount} places with coordinates`);

    return data;
}

/**
 * Analyze which places need coordinate resolution
 * @param {Object} data - Parsed CMIF data
 * @returns {Object} Statistics about places and coordinates
 */
export function analyzeCoordinateNeeds(data) {
    const stats = {
        totalPlaces: 0,
        withCoordinates: 0,
        withGeoNamesId: 0,
        needsResolution: 0,
        geonamesIdsToResolve: []
    };

    if (!data.indices?.places) {
        return stats;
    }

    for (const [id, place] of Object.entries(data.indices.places)) {
        stats.totalPlaces++;

        if (place.lat && place.lon) {
            stats.withCoordinates++;
        } else if (id) {
            stats.withGeoNamesId++;
            stats.needsResolution++;
            stats.geonamesIdsToResolve.push(id);
        }
    }

    return stats;
}

/**
 * Load coordinate cache from localStorage
 * @returns {Object} Cached coordinates
 */
function loadCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return {};

        const data = JSON.parse(cached);

        // Check if cache is expired
        if (data.timestamp) {
            const age = Date.now() - data.timestamp;
            const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

            if (age > maxAge) {
                console.log('GeoNames cache expired, clearing');
                localStorage.removeItem(CACHE_KEY);
                return {};
            }
        }

        return data.coordinates || {};
    } catch (error) {
        console.error('Error loading GeoNames cache:', error);
        return {};
    }
}

/**
 * Save coordinate cache to localStorage
 * @param {Object} coordinates - Coordinates to cache
 */
function saveCache(coordinates) {
    try {
        const data = {
            coordinates,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving GeoNames cache:', error);
    }
}

/**
 * Sleep helper for rate limiting
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
