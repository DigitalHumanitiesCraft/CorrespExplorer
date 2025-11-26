// Wikidata Enrichment Module
// Fetches biographical data from Wikidata via VIAF, GND, or direct QID
// Supports batch processing with progress callbacks

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
const CACHE_PREFIX = 'ce-wikidata-';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Property IDs for authority lookups
const AUTHORITY_PROPERTIES = {
    viaf: 'P214',      // VIAF ID
    gnd: 'P227',       // GND ID
    lccn: 'P244',      // Library of Congress
    isni: 'P213',      // ISNI
    orcid: 'P496'      // ORCID
};

/**
 * Get cached enrichment data
 */
function getCached(cacheKey) {
    try {
        const key = CACHE_PREFIX + cacheKey;
        const cached = sessionStorage.getItem(key);
        if (!cached) return null;

        const data = JSON.parse(cached);
        if (data.cachedAt && Date.now() - data.cachedAt < CACHE_DURATION) {
            return data;
        }
        sessionStorage.removeItem(key);
        return null;
    } catch {
        return null;
    }
}

/**
 * Store enrichment data in cache
 */
function setCache(cacheKey, data) {
    try {
        const key = CACHE_PREFIX + cacheKey;
        sessionStorage.setItem(key, JSON.stringify({
            ...data,
            cachedAt: Date.now()
        }));
    } catch {
        // Storage quota exceeded
    }
}

/**
 * Execute SPARQL query against Wikidata
 */
async function querySparql(query) {
    const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/sparql-results+json',
            'User-Agent': 'CorrespExplorer/1.0 (https://github.com/DHCraft/CorrespExplorer)'
        }
    });

    if (!response.ok) {
        throw new Error(`SPARQL query failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Find Wikidata QID from authority ID (VIAF, GND, etc.)
 */
async function findWikidataQid(authority, authorityId) {
    const property = AUTHORITY_PROPERTIES[authority?.toLowerCase()];
    if (!property || !authorityId) return null;

    const cacheKey = `qid-${authority}-${authorityId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached.qid;

    const query = `
        SELECT ?item WHERE {
            ?item wdt:${property} "${authorityId}" .
        } LIMIT 1
    `;

    try {
        const result = await querySparql(query);
        const bindings = result?.results?.bindings || [];

        if (bindings.length > 0) {
            const itemUri = bindings[0].item?.value;
            const qid = itemUri?.match(/Q\d+$/)?.[0] || null;
            setCache(cacheKey, { qid });
            return qid;
        }

        setCache(cacheKey, { qid: null });
        return null;
    } catch (error) {
        console.warn(`Failed to find QID for ${authority}:${authorityId}:`, error.message);
        return null;
    }
}

/**
 * Fetch person data from Wikidata by QID
 */
async function fetchPersonData(qid) {
    if (!qid) return null;

    const cacheKey = `person-${qid}`;
    const cached = getCached(cacheKey);
    if (cached && !cached.notFound) return cached;

    const query = `
        SELECT ?item ?itemLabel ?itemDescription
               ?birthDate ?deathDate
               ?birthPlaceLabel ?deathPlaceLabel
               ?image ?genderLabel
               ?occupationLabel
               ?gnd ?viaf
               ?articleDe ?articleEn
        WHERE {
            BIND(wd:${qid} AS ?item)

            OPTIONAL { ?item wdt:P569 ?birthDate . }
            OPTIONAL { ?item wdt:P570 ?deathDate . }
            OPTIONAL { ?item wdt:P19 ?birthPlace . }
            OPTIONAL { ?item wdt:P20 ?deathPlace . }
            OPTIONAL { ?item wdt:P18 ?image . }
            OPTIONAL { ?item wdt:P21 ?gender . }
            OPTIONAL { ?item wdt:P106 ?occupation . }
            OPTIONAL { ?item wdt:P227 ?gnd . }
            OPTIONAL { ?item wdt:P214 ?viaf . }

            OPTIONAL {
                ?articleDe schema:about ?item ;
                           schema:isPartOf <https://de.wikipedia.org/> .
            }
            OPTIONAL {
                ?articleEn schema:about ?item ;
                           schema:isPartOf <https://en.wikipedia.org/> .
            }

            SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
        }
        LIMIT 10
    `;

    try {
        const result = await querySparql(query);
        const bindings = result?.results?.bindings || [];

        if (bindings.length === 0) {
            setCache(cacheKey, { notFound: true });
            return null;
        }

        // Aggregate occupations from multiple rows
        const occupations = [...new Set(
            bindings
                .map(b => b.occupationLabel?.value)
                .filter(Boolean)
        )];

        const first = bindings[0];
        const enriched = {
            qid,
            name: first.itemLabel?.value || null,
            description: first.itemDescription?.value || null,
            birthDate: formatDate(first.birthDate?.value),
            deathDate: formatDate(first.deathDate?.value),
            birthPlace: first.birthPlaceLabel?.value || null,
            deathPlace: first.deathPlaceLabel?.value || null,
            image: first.image?.value || null,
            thumbnail: first.image?.value ? getThumbnailUrl(first.image.value) : null,
            gender: first.genderLabel?.value || null,
            professions: occupations.slice(0, 5),
            gndId: first.gnd?.value || null,
            viafId: first.viaf?.value || null,
            wikipediaUrl: first.articleDe?.value || first.articleEn?.value || null,
            wikidataUrl: `https://www.wikidata.org/wiki/${qid}`
        };

        setCache(cacheKey, enriched);
        return enriched;
    } catch (error) {
        console.warn(`Failed to fetch data for ${qid}:`, error.message);
        return null;
    }
}

/**
 * Format ISO date to year or full date string
 */
function formatDate(isoDate) {
    if (!isoDate) return null;
    // Handle Wikidata date formats like "1842-02-04T00:00:00Z"
    const match = isoDate.match(/^(-?\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
    if (match) {
        const [, year, month, day] = match;
        if (day && month) {
            return `${year}-${month}-${day}`;
        }
        return year;
    }
    return null;
}

/**
 * Get Wikimedia Commons thumbnail URL
 */
function getThumbnailUrl(imageUrl, width = 200) {
    if (!imageUrl) return null;
    // Convert commons URL to thumbnail
    // From: https://commons.wikimedia.org/wiki/Special:FilePath/Image.jpg
    // To: https://commons.wikimedia.org/wiki/Special:FilePath/Image.jpg?width=200
    if (imageUrl.includes('Special:FilePath')) {
        return `${imageUrl}?width=${width}`;
    }
    return imageUrl;
}

/**
 * Enrich a single person from their authority ID
 * @param {string} authority - Authority type (viaf, gnd, etc.)
 * @param {string} authorityId - The authority ID
 * @returns {Promise<Object|null>} Enriched data or null
 */
export async function enrichPerson(authority, authorityId) {
    if (!authority || !authorityId) return null;

    // Try to find QID
    const qid = await findWikidataQid(authority, authorityId);
    if (!qid) return null;

    // Fetch person data
    return fetchPersonData(qid);
}

/**
 * Batch enrich multiple persons
 * @param {Array} persons - Array of {name, authority, authorityId} objects
 * @param {Function} onProgress - Progress callback (current, total, person)
 * @returns {Promise<Map>} Map of authorityId -> enriched data
 */
export async function enrichPersonsBatch(persons, onProgress) {
    const results = new Map();
    const enrichable = persons.filter(p => p.authority && p.authorityId);

    for (let i = 0; i < enrichable.length; i++) {
        const person = enrichable[i];

        if (onProgress) {
            onProgress(i + 1, enrichable.length, person);
        }

        try {
            const enriched = await enrichPerson(person.authority, person.authorityId);
            if (enriched) {
                results.set(person.authorityId, enriched);
            }

            // Rate limiting: 100ms delay between requests
            if (i < enrichable.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.warn(`Failed to enrich ${person.name}:`, error.message);
        }
    }

    return results;
}

/**
 * Format life dates for display
 */
export function formatLifeDates(enriched) {
    if (!enriched) return '';
    const birth = enriched.birthDate;
    const death = enriched.deathDate;

    if (!birth && !death) return '';

    const extractYear = (date) => {
        if (!date) return '?';
        const match = date.match(/^(-?\d{4})/);
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
 * Format places for display
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
 */
export function buildExternalLinks(enriched) {
    if (!enriched) return '';
    const links = [];

    if (enriched.qid) {
        links.push(`<a href="${enriched.wikidataUrl}" target="_blank" rel="noopener" title="Wikidata">Wikidata</a>`);
    }
    if (enriched.gndId) {
        links.push(`<a href="https://d-nb.info/gnd/${enriched.gndId}" target="_blank" rel="noopener" title="GND">GND</a>`);
    }
    if (enriched.viafId) {
        links.push(`<a href="https://viaf.org/viaf/${enriched.viafId}" target="_blank" rel="noopener" title="VIAF">VIAF</a>`);
    }
    if (enriched.wikipediaUrl) {
        links.push(`<a href="${enriched.wikipediaUrl}" target="_blank" rel="noopener" title="Wikipedia">Wikipedia</a>`);
    }

    return links.join(' | ');
}

/**
 * Count persons with enrichable authority IDs
 */
export function countEnrichable(persons) {
    if (!Array.isArray(persons)) {
        // If it's an object (like dataIndices.persons), convert to array
        persons = Object.values(persons || {});
    }

    return persons.filter(p => {
        const authority = p.authority || (p.viaf ? 'viaf' : null);
        const authorityId = p.viaf || p.id || p.authorityId;
        return authority && authorityId;
    }).length;
}

/**
 * Clear enrichment cache
 */
export function clearEnrichmentCache() {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
}
