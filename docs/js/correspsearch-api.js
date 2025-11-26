// correspSearch API Integration
// Handles fetching and transforming data from the correspSearch API v2.0

const CORRESPSEARCH_API_BASE = 'https://correspsearch.net/api/v2.0/tei-json.xql';
const MAX_RESULTS_PER_PAGE = 10; // API returns 10 per page by default

/**
 * Check if a URL is a correspSearch API URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isCorrespSearchUrl(url) {
    return url && url.includes('correspsearch.net/api');
}

/**
 * Search correspSearch API with given parameters
 * @param {Object} params - Search parameters
 * @param {string} [params.correspondent] - Person URI (GND/VIAF)
 * @param {string} [params.place] - Place URI (GeoNames)
 * @param {string} [params.placeSender] - Sender place URI
 * @param {string} [params.startdate] - Start date (YYYY-MM-DD)
 * @param {string} [params.enddate] - End date (YYYY-MM-DD)
 * @param {boolean} [params.available] - Only with digitized version
 * @param {Function} [onProgress] - Progress callback (loaded, total)
 * @returns {Promise<Object>} Parsed data in internal format
 */
export async function searchCorrespSearch(params, onProgress = null) {
    const allLetters = [];
    let offset = 0;
    let hasMore = true;
    let totalEstimate = null;

    while (hasMore) {
        const url = buildApiUrl(params, offset);
        const response = await fetchWithRetry(url);

        if (!response.ok) {
            throw new Error(`correspSearch API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Handle different response formats
        const letters = extractLettersFromResponse(data);
        allLetters.push(...letters);

        // Check pagination
        hasMore = data.teiHeader?.profileDesc?.correspDesc?.length === MAX_RESULTS_PER_PAGE ||
                  data.more === true ||
                  (Array.isArray(data) && data.length === MAX_RESULTS_PER_PAGE);

        if (hasMore) {
            offset += MAX_RESULTS_PER_PAGE;

            // Estimate total for progress
            if (!totalEstimate && letters.length === MAX_RESULTS_PER_PAGE) {
                totalEstimate = offset + MAX_RESULTS_PER_PAGE * 2; // Rough estimate
            }

            if (onProgress) {
                onProgress(allLetters.length, totalEstimate || allLetters.length + 100);
            }
        }

        // Safety limit to prevent infinite loops
        if (offset > 10000) {
            console.warn('correspSearch: Reached safety limit of 10000 results');
            break;
        }
    }

    if (onProgress) {
        onProgress(allLetters.length, allLetters.length);
    }

    return transformToInternalFormat(allLetters, params);
}

/**
 * Fetch a single page from correspSearch API URL
 * @param {string} url - Full API URL
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<Object>} Parsed data in internal format
 */
export async function fetchFromCorrespSearchUrl(url, onProgress = null) {
    // Extract base URL and check for pagination parameter
    const urlObj = new URL(url);
    const hasOffset = urlObj.searchParams.has('x');

    if (hasOffset) {
        // Single page request
        const response = await fetchWithRetry(url);
        if (!response.ok) {
            throw new Error(`correspSearch API error: ${response.status}`);
        }
        const data = await response.json();
        const letters = extractLettersFromResponse(data);
        return transformToInternalFormat(letters, {});
    }

    // Fetch all pages
    const allLetters = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        urlObj.searchParams.set('x', offset.toString());
        const pageUrl = urlObj.toString();

        const response = await fetchWithRetry(pageUrl);
        if (!response.ok) {
            throw new Error(`correspSearch API error: ${response.status}`);
        }

        const data = await response.json();
        const letters = extractLettersFromResponse(data);
        allLetters.push(...letters);

        hasMore = letters.length === MAX_RESULTS_PER_PAGE;

        if (hasMore) {
            offset += MAX_RESULTS_PER_PAGE;
            if (onProgress) {
                onProgress(allLetters.length, null);
            }
        }

        if (offset > 10000) break;
    }

    if (onProgress) {
        onProgress(allLetters.length, allLetters.length);
    }

    return transformToInternalFormat(allLetters, {});
}

/**
 * Build API URL from parameters
 */
function buildApiUrl(params, offset = 0) {
    const url = new URL(CORRESPSEARCH_API_BASE);

    if (params.correspondent) {
        url.searchParams.set('correspondent', params.correspondent);
    }
    if (params.place) {
        url.searchParams.set('place', params.place);
    }
    if (params.placeSender) {
        url.searchParams.set('placeSender', params.placeSender);
    }
    if (params.startdate) {
        url.searchParams.set('startdate', params.startdate);
    }
    if (params.enddate) {
        url.searchParams.set('enddate', params.enddate);
    }
    if (params.available) {
        url.searchParams.set('available', 'online');
    }

    // Pagination: x=2 means page 2, x=3 means page 3, etc.
    if (offset > 0) {
        url.searchParams.set('x', (offset / MAX_RESULTS_PER_PAGE + 1).toString());
    }

    return url.toString();
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

/**
 * Extract letters from various response formats
 */
function extractLettersFromResponse(data) {
    // TEI-JSON format with teiHeader
    if (data.teiHeader?.profileDesc?.correspDesc) {
        return Array.isArray(data.teiHeader.profileDesc.correspDesc)
            ? data.teiHeader.profileDesc.correspDesc
            : [data.teiHeader.profileDesc.correspDesc];
    }

    // Direct array of correspDesc
    if (Array.isArray(data)) {
        return data;
    }

    // Object with letters property
    if (data.letters) {
        return data.letters;
    }

    // Object with correspDesc property
    if (data.correspDesc) {
        return Array.isArray(data.correspDesc) ? data.correspDesc : [data.correspDesc];
    }

    return [];
}

/**
 * Transform correspSearch letters to internal format
 */
function transformToInternalFormat(csLetters, searchParams) {
    const letters = csLetters.map(transformLetter).filter(l => l !== null);
    const indices = buildIndices(letters);
    const meta = buildMeta(letters, searchParams);

    return { letters, indices, meta };
}

/**
 * Transform a single correspSearch letter to internal format
 */
function transformLetter(csLetter) {
    if (!csLetter) return null;

    // Handle different field naming conventions
    const sent = csLetter.correspAction?.find(a => a.type === 'sent') ||
                 csLetter.sent ||
                 { persName: csLetter.sender, placeName: csLetter.place, date: csLetter.date };

    const received = csLetter.correspAction?.find(a => a.type === 'received') ||
                     csLetter.received ||
                     { persName: csLetter.receiver || csLetter.addressee };

    const id = csLetter.ref || csLetter.key || csLetter.id || `cs-${Math.random().toString(36).substr(2, 9)}`;
    const url = csLetter.ref || null;

    // Extract sender
    const senderData = extractPersonFromAction(sent);

    // Extract recipient
    const recipientData = extractPersonFromAction(received);

    // Extract place
    const placeData = extractPlaceFromAction(sent);

    // Extract date
    const dateData = extractDateFromAction(sent, csLetter);

    return {
        id: cleanId(id),
        url,
        date: dateData.date,
        year: dateData.year,
        sender: senderData,
        recipient: recipientData,
        place_sent: placeData,
        language: null, // correspSearch does not provide language info
        mentions: { subjects: [], persons: [], places: [] }
    };
}

/**
 * Extract person data from correspAction
 */
function extractPersonFromAction(action) {
    if (!action) return null;

    // Handle persName as object or string
    let name, ref;

    if (action.persName) {
        if (typeof action.persName === 'string') {
            name = action.persName;
            ref = action.ref || null;
        } else if (Array.isArray(action.persName)) {
            // Multiple persons - take first
            const first = action.persName[0];
            name = first['#text'] || first._ || first.name || first;
            ref = first.ref || null;
        } else {
            name = action.persName['#text'] || action.persName._ || action.persName.name || action.persName;
            ref = action.persName.ref || null;
        }
    } else if (action.name) {
        name = action.name;
        ref = action.ref || null;
    } else if (typeof action === 'string') {
        name = action;
        ref = null;
    } else {
        return null;
    }

    if (!name || typeof name !== 'string') return null;

    const authority = parseAuthorityRef(ref);

    return {
        name: name.trim(),
        id: authority?.id || null,
        authority: authority?.type || null
    };
}

/**
 * Extract place data from correspAction
 */
function extractPlaceFromAction(action) {
    if (!action) return null;

    let name, ref;

    if (action.placeName) {
        if (typeof action.placeName === 'string') {
            name = action.placeName;
            ref = action.placeRef || null;
        } else if (Array.isArray(action.placeName)) {
            const first = action.placeName[0];
            name = first['#text'] || first._ || first.name || first;
            ref = first.ref || null;
        } else {
            name = action.placeName['#text'] || action.placeName._ || action.placeName.name || action.placeName;
            ref = action.placeName.ref || null;
        }
    } else if (action.place) {
        if (typeof action.place === 'string') {
            name = action.place;
        } else {
            name = action.place.name || action.place['#text'] || action.place;
            ref = action.place.ref || null;
        }
    } else {
        return null;
    }

    if (!name || typeof name !== 'string') return null;

    const geonames = parseGeoNamesRef(ref);

    return {
        name: name.trim(),
        geonames_id: geonames?.id || null,
        lat: null,
        lon: null
    };
}

/**
 * Extract date from correspAction or letter
 */
function extractDateFromAction(action, letter) {
    let dateObj = action?.date || letter?.date;

    if (!dateObj) return { date: null, year: null };

    let dateStr;

    // Handle array format (correspSearch returns date as array)
    if (Array.isArray(dateObj)) {
        const firstDate = dateObj[0];
        if (firstDate) {
            dateStr = firstDate.when || firstDate.from || firstDate.notBefore || firstDate.notAfter;
        }
    } else if (typeof dateObj === 'string') {
        dateStr = dateObj;
    } else {
        dateStr = dateObj.when || dateObj.from || dateObj.notBefore || dateObj.notAfter ||
                  dateObj['@when'] || dateObj['@from'] || dateObj['@notBefore'];
    }

    if (!dateStr) return { date: null, year: null };

    const year = parseInt(dateStr.substring(0, 4), 10);

    return {
        date: dateStr,
        year: isNaN(year) ? null : year
    };
}

/**
 * Parse authority reference URL
 */
function parseAuthorityRef(url) {
    if (!url) return null;

    // VIAF
    const viafMatch = url.match(/viaf\.org\/viaf\/(\d+)/);
    if (viafMatch) return { type: 'viaf', id: viafMatch[1] };

    // GND
    const gndMatch = url.match(/d-nb\.info\/gnd\/([^\s/]+)/);
    if (gndMatch) return { type: 'gnd', id: gndMatch[1] };

    // Library of Congress
    const lcMatch = url.match(/id\.loc\.gov\/authorities\/names\/([^\s/]+)/);
    if (lcMatch) return { type: 'lc', id: lcMatch[1] };

    return { type: 'unknown', id: url };
}

/**
 * Parse GeoNames reference URL
 */
function parseGeoNamesRef(url) {
    if (!url) return null;

    const match = url.match(/geonames\.org\/(\d+)/);
    if (match) return { id: match[1] };

    return null;
}

/**
 * Clean letter ID
 */
function cleanId(id) {
    if (!id) return null;
    const match = id.match(/[#/]([^#/]+)$/);
    if (match) return match[1];
    return id;
}

/**
 * Build indices from letters
 */
function buildIndices(letters) {
    const persons = {};
    const places = {};
    const languages = {};
    const subjects = {};

    for (const letter of letters) {
        // Index sender
        if (letter.sender?.name) {
            const key = letter.sender.id || letter.sender.name;
            if (!persons[key]) {
                persons[key] = {
                    name: letter.sender.name,
                    authority: letter.sender.authority,
                    letter_count: 0,
                    as_sender: 0,
                    as_recipient: 0
                };
            }
            persons[key].letter_count++;
            persons[key].as_sender++;
        }

        // Index recipient
        if (letter.recipient?.name) {
            const key = letter.recipient.id || letter.recipient.name;
            if (!persons[key]) {
                persons[key] = {
                    name: letter.recipient.name,
                    authority: letter.recipient.authority,
                    letter_count: 0,
                    as_sender: 0,
                    as_recipient: 0
                };
            }
            persons[key].letter_count++;
            persons[key].as_recipient++;
        }

        // Index place
        if (letter.place_sent?.name) {
            const key = letter.place_sent.geonames_id || letter.place_sent.name;
            if (!places[key]) {
                places[key] = {
                    name: letter.place_sent.name,
                    lat: letter.place_sent.lat,
                    lon: letter.place_sent.lon,
                    letter_count: 0
                };
            }
            places[key].letter_count++;
        }
    }

    return { persons, places, subjects, languages };
}

/**
 * Build metadata
 */
function buildMeta(letters, searchParams) {
    const years = letters.map(l => l.year).filter(y => y !== null);
    const uniquePlaces = new Set(letters.map(l => l.place_sent?.geonames_id || l.place_sent?.name).filter(Boolean));
    const uniqueSenders = new Set(letters.map(l => l.sender?.id || l.sender?.name).filter(Boolean));
    const uniqueRecipients = new Set(letters.map(l => l.recipient?.id || l.recipient?.name).filter(Boolean));

    let title = 'correspSearch Ergebnisse';
    if (searchParams.correspondent) {
        title = `Korrespondenz: ${searchParams.correspondent}`;
    }

    return {
        title,
        publisher: 'correspSearch',
        source: 'correspSearch API v2.0',
        total_letters: letters.length,
        unique_senders: uniqueSenders.size,
        unique_recipients: uniqueRecipients.size,
        unique_places: uniquePlaces.size,
        date_range: {
            min: years.length > 0 ? Math.min(...years) : null,
            max: years.length > 0 ? Math.max(...years) : null
        },
        generated: new Date().toISOString()
    };
}

/**
 * Get count of results for a query (first page only)
 * @param {Object} params - Search parameters
 * @returns {Promise<{count: number, hasMore: boolean, totalHits: number|null}>}
 */
export async function getResultCount(params) {
    const url = buildApiUrl(params, 0);
    const response = await fetchWithRetry(url);

    if (!response.ok) {
        throw new Error(`correspSearch API error: ${response.status}`);
    }

    const data = await response.json();
    const letters = extractLettersFromResponse(data);

    // Try to extract total count from notesStmt (e.g., "1-10 of 200000 hits")
    let totalHits = null;
    const note = data.teiHeader?.fileDesc?.notesStmt?.note;
    if (note && typeof note === 'string') {
        const match = note.match(/of\s+(\d+)\s+hits/i);
        if (match) {
            totalHits = parseInt(match[1], 10);
        }
    }

    // Check for next page link
    const hasMore = data.teiHeader?.fileDesc?.notesStmt?.relatedItem?.type === 'next' ||
                    letters.length === MAX_RESULTS_PER_PAGE;

    return {
        count: letters.length,
        hasMore,
        totalHits
    };
}
