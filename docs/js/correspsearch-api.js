// correspSearch API Integration
// Loads correspSearch API v2.0 TEI-JSON URLs (https://correspsearch.net/en/api.html) and
// transforms the result into the internal format of cmif-parser.js

import { parseAuthorityRef, parseGeoNamesRef, safeUrl, classifyDate, cleanId, buildIndices } from './utils.js';
import { API_DEFAULTS } from './constants.js';

/**
 * Check if a URL is a correspSearch API URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isCorrespSearchUrl(url) {
    try {
        const { protocol, hostname, pathname } = new URL(url);
        return /^https?:$/.test(protocol) && /(^|\.)correspsearch\.net$/i.test(hostname) && pathname.startsWith('/api/');
    } catch {
        return false;
    }
}

/**
 * Load letters from a correspSearch API URL.
 * The API pages its results with x = 1..n. A URL that already carries x loads only that page;
 * otherwise pages are followed while notesStmt/relatedItem names a next page, up to
 * API_DEFAULTS.correspSearchMaxLetters letters. The page size is not assumed, because the
 * documentation (100) and the observed responses (10) differ.
 * @param {string} url - Full API URL
 * @param {Function} [onProgress] - Progress callback (loaded, totalHits)
 * @returns {Promise<Object>} Parsed data in internal format
 */
export async function fetchFromCorrespSearchUrl(url, onProgress = null) {
    const urlObj = new URL(url);

    if (urlObj.searchParams.has('x')) {
        const data = await fetchPage(urlObj.toString());
        return transformToInternalFormat(extractLettersFromResponse(data), {});
    }

    const maxLetters = API_DEFAULTS.correspSearchMaxLetters;
    const allLetters = [];
    let totalHits = null;
    let truncated = false;

    for (let page = 1; ; page++) {
        urlObj.searchParams.set('x', String(page));
        const data = await fetchPage(urlObj.toString());
        const letters = extractLettersFromResponse(data);
        allLetters.push(...letters);
        totalHits ??= parseTotalHits(data);

        if (onProgress) onProgress(allLetters.length, totalHits);

        if (letters.length === 0 || !hasNextPage(data)) break;
        if (allLetters.length >= maxLetters) {
            truncated = true;
            break;
        }
    }

    const result = transformToInternalFormat(allLetters, {});
    result.meta.total_hits = totalHits;
    result.meta.truncated = truncated;
    return result;
}

async function fetchPage(url) {
    const response = await fetchWithRetry(url);
    if (!response.ok) {
        throw new Error(`correspSearch API error: ${response.status}`);
    }
    return response.json();
}

/**
 * Read the hit count from notesStmt/note ("1-10 of 87 hits")
 */
function parseTotalHits(data) {
    const note = data?.teiHeader?.fileDesc?.notesStmt?.note;
    const match = typeof note === 'string' ? note.match(/of\s+(\d+)\s+hits/i) : null;
    return match ? parseInt(match[1], 10) : null;
}

/**
 * The API names the following page in notesStmt/relatedItem[@type="next"]
 */
function hasNextPage(data) {
    const related = data?.teiHeader?.fileDesc?.notesStmt?.relatedItem;
    const items = Array.isArray(related) ? related : (related ? [related] : []);
    return items.some(item => item?.type === 'next');
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
    const letters = csLetters.map((csLetter, index) => transformLetter(csLetter, index)).filter(l => l !== null);
    const indices = buildIndices(letters);
    const meta = buildMeta(letters, searchParams);

    return { letters, indices, meta };
}

/**
 * Transform a single correspSearch letter to internal format
 */
function transformLetter(csLetter, index) {
    if (!csLetter) return null;

    // Handle different field naming conventions
    const sent = csLetter.correspAction?.find(a => a.type === 'sent') ||
                 csLetter.sent ||
                 { persName: csLetter.sender, placeName: csLetter.place, date: csLetter.date };

    const received = csLetter.correspAction?.find(a => a.type === 'received') ||
                     csLetter.received ||
                     { persName: csLetter.receiver || csLetter.addressee };

    // Fallback id from result position, so ids stay stable across reloads and URL state
    const id = csLetter.ref || csLetter.key || csLetter.id || `cs-${index + 1}`;
    const url = safeUrl(csLetter.ref) || null;

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
        dateTo: dateData.dateTo,
        year: dateData.year,
        datePrecision: dateData.precision,
        dateCertainty: dateData.certainty,
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
 * Extract date from correspAction or letter, with the precision rules of the CMIF parser
 */
function extractDateFromAction(action, letter) {
    let dateObj = action?.date || letter?.date;
    if (Array.isArray(dateObj)) dateObj = dateObj[0];
    if (!dateObj) return classifyDate({});

    if (typeof dateObj === 'string') return classifyDate({ when: dateObj });

    return classifyDate({
        when: dateObj.when || dateObj['@when'],
        from: dateObj.from || dateObj['@from'],
        to: dateObj.to || dateObj['@to'],
        notBefore: dateObj.notBefore || dateObj['@notBefore'],
        notAfter: dateObj.notAfter || dateObj['@notAfter'],
        cert: dateObj.cert || dateObj['@cert']
    });
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
