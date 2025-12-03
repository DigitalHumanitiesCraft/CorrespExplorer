// CMIF Parser - Browser-based XML parsing for Correspondence Metadata Interchange Format
// Parses CMIF-XML files and converts them to the internal JSON structure
// Also handles correspSearch API responses (TEI-JSON format)

import { isCorrespSearchUrl, fetchFromCorrespSearchUrl } from './correspsearch-api.js';
import { parseAuthorityRef, parseGeoNamesRef } from './utils.js';

const TEI_NS = 'http://www.tei-c.org/ns/1.0';

/**
 * Parse a CMIF source (File, URL, or XML string)
 * @param {File|string} source - File object, URL string, or XML string
 * @param {Function} [onProgress] - Progress callback for correspSearch API
 * @returns {Promise<Object>} Parsed data with letters, indices, and meta
 */
export async function parseCMIF(source, onProgress = null) {
    let xmlString;

    if (source instanceof File) {
        xmlString = await source.text();
    } else if (source.startsWith('http://') || source.startsWith('https://')) {
        // Check if this is a correspSearch API URL
        if (isCorrespSearchUrl(source)) {
            return await fetchFromCorrespSearchUrl(source, onProgress);
        }

        try {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            xmlString = await response.text();
        } catch (fetchError) {
            // CORS errors manifest as TypeError or NetworkError
            if (fetchError.name === 'TypeError' || fetchError.message.includes('Failed to fetch') ||
                fetchError.message.includes('NetworkError') || fetchError.message.includes('CORS')) {
                const hostname = new URL(source).hostname;
                throw new Error(`CORS-Fehler: ${hostname} erlaubt keine direkten Anfragen. Bitte laden Sie die Datei manuell herunter und verwenden Sie den Datei-Upload.`);
            }
            throw fetchError;
        }
    } else if (source.endsWith('.xml') || source.includes('/')) {
        // Relative URL (local file path like 'data/test.xml')
        try {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            xmlString = await response.text();
        } catch (fetchError) {
            throw new Error(`Fehler beim Laden der lokalen Datei: ${fetchError.message}`);
        }
    } else {
        xmlString = source;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error(`XML parsing error: ${parseError.textContent}`);
    }

    const letters = extractLetters(doc);
    const indices = buildIndices(letters);
    const meta = extractMeta(doc, letters);

    return { letters, indices, meta };
}

/**
 * Extract all letters (correspDesc elements) from the document
 */
function extractLetters(doc) {
    const correspDescs = doc.getElementsByTagNameNS(TEI_NS, 'correspDesc');
    const letters = [];

    for (const desc of correspDescs) {
        const letter = extractLetter(desc);
        if (letter) {
            letters.push(letter);
        }
    }

    return letters;
}

/**
 * Extract a single letter from a correspDesc element
 */
function extractLetter(desc) {
    const id = desc.getAttribute('ref') || desc.getAttribute('key') || `letter-${Math.random().toString(36).substr(2, 9)}`;
    const url = desc.getAttribute('ref') || null;

    const sentAction = getCorrespAction(desc, 'sent');
    const receivedAction = getCorrespAction(desc, 'received');

    const sender = extractPerson(sentAction);
    const recipient = extractPerson(receivedAction);
    const placeSent = extractPlace(sentAction);
    const dateInfo = extractDate(sentAction);

    const note = desc.getElementsByTagNameNS(TEI_NS, 'note')[0];
    const language = extractLanguage(note);
    const mentions = extractMentions(note);

    return {
        id: cleanId(id),
        url,
        date: dateInfo.date,
        dateTo: dateInfo.dateTo,
        year: dateInfo.year,
        datePrecision: dateInfo.precision,
        dateCertainty: dateInfo.certainty,
        sender,
        recipient,
        place_sent: placeSent,
        language,
        mentions
    };
}

/**
 * Get correspAction element by type
 */
function getCorrespAction(desc, type) {
    const actions = desc.getElementsByTagNameNS(TEI_NS, 'correspAction');
    for (const action of actions) {
        if (action.getAttribute('type') === type) {
            return action;
        }
    }
    return null;
}

// Patterns indicating unknown persons
const UNKNOWN_PERSON_PATTERNS = [
    /^\[NN\]$/i,
    /^N\.?N\.?$/i,
    /^Unbekannt$/i,
    /^Unknown$/i,
    /^\?\?\?$/
];

/**
 * Determine person precision level
 * Levels: identified (has authority), named (name only), partial ([NN] in name), unknown
 */
function getPersonPrecision(name, authority) {
    if (!name) return 'unknown';

    const trimmedName = name.trim();

    // Check if completely unknown
    if (UNKNOWN_PERSON_PATTERNS.some(p => p.test(trimmedName))) {
        return 'unknown';
    }

    // Check if partially known (contains [NN] or similar)
    if (/\[NN\]|\[N\.N\.\]|\[\?\]/.test(trimmedName)) {
        return 'partial';
    }

    // Has authority reference = identified
    if (authority) {
        return 'identified';
    }

    // Has name but no authority = named
    return 'named';
}

/**
 * Extract person information from correspAction with precision detection
 * Precision levels: identified, named, partial, unknown
 */
function extractPerson(action) {
    if (!action) return null;

    const persName = action.getElementsByTagNameNS(TEI_NS, 'persName')[0];
    if (!persName) {
        const orgName = action.getElementsByTagNameNS(TEI_NS, 'orgName')[0];
        if (orgName) {
            return {
                name: orgName.textContent.trim(),
                id: null,
                authority: null,
                isOrganization: true,
                precision: 'named'
            };
        }
        return null;
    }

    const ref = persName.getAttribute('ref');
    const authority = parseAuthorityRef(ref);
    const name = persName.textContent.trim();
    const precision = getPersonPrecision(name, authority);

    return {
        name,
        id: authority?.id || null,
        authority: authority?.type || null,
        precision
    };
}

// Patterns indicating unknown places
const UNKNOWN_PLACE_PATTERNS = [
    /^Unbekannt$/i,
    /^Unknown$/i,
    /^\[?\?\]?$/
];

/**
 * Determine place precision level
 * Levels: exact (has GeoNames), region (name only, no GeoNames), unknown
 */
function getPlacePrecision(name, geonamesId) {
    if (!name) return 'unknown';

    const trimmedName = name.trim();

    // Check if unknown
    if (UNKNOWN_PLACE_PATTERNS.some(p => p.test(trimmedName))) {
        return 'unknown';
    }

    // Has GeoNames reference = can be geolocated (exact after coordinate enrichment)
    if (geonamesId) {
        return 'exact';
    }

    // Has name but no GeoNames = region (cannot be precisely located)
    return 'region';
}

/**
 * Extract place information from correspAction with precision detection
 * Precision levels: exact, region, unknown
 */
function extractPlace(action) {
    if (!action) return null;

    const placeName = action.getElementsByTagNameNS(TEI_NS, 'placeName')[0];
    if (!placeName) return null;

    const ref = placeName.getAttribute('ref');
    const geonames = parseGeoNamesRef(ref);
    const name = placeName.textContent.trim();
    const precision = getPlacePrecision(name, geonames?.id);

    return {
        name,
        geonames_id: geonames?.id || null,
        lat: null,
        lon: null,
        precision
    };
}

/**
 * Extract date information from correspAction with precision detection
 * Precision levels: day, month, year, range, unknown
 * Certainty levels: high, medium, low (from @cert attribute)
 */
function extractDate(action) {
    if (!action) return { date: null, dateTo: null, year: null, precision: 'unknown', certainty: 'high' };

    const dateEl = action.getElementsByTagNameNS(TEI_NS, 'date')[0];
    if (!dateEl) return { date: null, dateTo: null, year: null, precision: 'unknown', certainty: 'high' };

    const when = dateEl.getAttribute('when');
    const from = dateEl.getAttribute('from');
    const to = dateEl.getAttribute('to');
    const notBefore = dateEl.getAttribute('notBefore');
    const notAfter = dateEl.getAttribute('notAfter');
    const cert = dateEl.getAttribute('cert') || 'high';

    // Determine primary date string
    const dateStr = when || from || notBefore;
    const dateToStr = to || notAfter || null;

    if (!dateStr && !dateToStr) {
        return { date: null, dateTo: null, year: null, precision: 'unknown', certainty: cert };
    }

    const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : null;

    // Determine precision based on attributes and format
    let precision = 'unknown';
    if (from && to) {
        precision = 'range';
    } else if (notBefore || notAfter) {
        precision = 'range';
    } else if (when) {
        if (when.length === 10) precision = 'day';       // YYYY-MM-DD
        else if (when.length === 7) precision = 'month'; // YYYY-MM
        else if (when.length === 4) precision = 'year';  // YYYY
    }

    return {
        date: dateStr || dateToStr,
        dateTo: dateToStr,
        year: isNaN(year) ? null : year,
        precision,
        certainty: cert
    };
}

/**
 * Extract language from note element
 */
function extractLanguage(note) {
    if (!note) return null;

    const refs = note.getElementsByTagNameNS(TEI_NS, 'ref');
    for (const ref of refs) {
        const type = ref.getAttribute('type') || '';
        if (type.includes('hasLanguage')) {
            const target = ref.getAttribute('target');
            const code = extractLanguageCode(target);
            return {
                code,
                label: getLanguageLabel(code)
            };
        }
    }
    return null;
}

/**
 * Extract mentions (subjects, persons, places) from note element
 */
function extractMentions(note) {
    const mentions = {
        subjects: [],
        persons: [],
        places: []
    };

    if (!note) return mentions;

    const refs = note.getElementsByTagNameNS(TEI_NS, 'ref');
    for (const ref of refs) {
        const type = ref.getAttribute('type') || '';
        const target = ref.getAttribute('target');
        const label = ref.textContent.trim();

        if (type.includes('mentionsSubject')) {
            mentions.subjects.push({
                uri: target,
                label,
                category: categorizeSubject(target)
            });
        } else if (type.includes('mentionsPerson')) {
            const authority = parseAuthorityRef(target);
            mentions.persons.push({
                name: label,
                id: authority?.id || null,
                authority: authority?.type || null
            });
        } else if (type.includes('mentionsPlace')) {
            const geonames = parseGeoNamesRef(target);
            mentions.places.push({
                name: label,
                geonames_id: geonames?.id || null
            });
        }
    }

    return mentions;
}

/**
 * Extract language code from target
 */
function extractLanguageCode(target) {
    if (!target) return null;

    // Direct code (de, fr, en, etc.)
    if (/^[a-z]{2,3}$/.test(target)) {
        return target;
    }

    // Lexvo URL
    const lexvoMatch = target.match(/lexvo\.org\/id\/iso639-3\/([a-z]{3})/);
    if (lexvoMatch) return lexvoMatch[1];

    // HSA Language URL
    const hsaMatch = target.match(/hsa\.languages#L\.(\d+)/);
    if (hsaMatch) return `hsa-lang-${hsaMatch[1]}`;

    return target;
}

/**
 * Categorize subject by URI pattern
 */
function categorizeSubject(uri) {
    if (!uri) return 'unknown';

    if (uri.includes('lexvo.org')) return 'lexvo';
    if (uri.includes('hsa.subjects')) return 'hsa_subject';
    if (uri.includes('hsa.languages')) return 'hsa_language';

    return 'other';
}

/**
 * Get language label from code
 */
function getLanguageLabel(code) {
    const labels = {
        'de': 'Deutsch',
        'deu': 'Deutsch',
        'fr': 'Franzoesisch',
        'fra': 'Franzoesisch',
        'en': 'Englisch',
        'eng': 'Englisch',
        'it': 'Italienisch',
        'ita': 'Italienisch',
        'es': 'Spanisch',
        'spa': 'Spanisch',
        'pt': 'Portugiesisch',
        'por': 'Portugiesisch',
        'nl': 'Niederlaendisch',
        'nld': 'Niederlaendisch',
        'eu': 'Baskisch',
        'eus': 'Baskisch',
        'la': 'Latein',
        'lat': 'Latein',
        'hu': 'Ungarisch',
        'hun': 'Ungarisch',
        'ro': 'Rumaenisch',
        'ron': 'Rumaenisch',
        'ca': 'Katalanisch',
        'cat': 'Katalanisch'
    };

    return labels[code] || code;
}

/**
 * Clean letter ID (remove URL prefix if present)
 */
function cleanId(id) {
    if (!id) return null;

    // Extract ID from URL
    const match = id.match(/[#/]([^#/]+)$/);
    if (match) return match[1];

    return id;
}

/**
 * Build indices from letters array
 */
function buildIndices(letters) {
    const persons = {};
    const places = {};
    const subjects = {};
    const languages = {};

    for (const letter of letters) {
        // Index sender
        if (letter.sender?.id) {
            const key = letter.sender.id;
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
        if (letter.recipient?.id) {
            const key = letter.recipient.id;
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
        if (letter.place_sent?.geonames_id) {
            const key = letter.place_sent.geonames_id;
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

        // Index language
        if (letter.language?.code) {
            const key = letter.language.code;
            if (!languages[key]) {
                languages[key] = {
                    code: key,
                    label: letter.language.label,
                    letter_count: 0
                };
            }
            languages[key].letter_count++;
        }

        // Index subjects
        for (const subject of letter.mentions?.subjects || []) {
            const key = subject.uri || subject.label;
            if (!subjects[key]) {
                subjects[key] = {
                    label: subject.label,
                    uri: subject.uri,
                    category: subject.category,
                    letter_count: 0
                };
            }
            subjects[key].letter_count++;
        }
    }

    return { persons, places, subjects, languages };
}

/**
 * Calculate uncertainty statistics from letters
 */
function calculateUncertaintyStats(letters) {
    const dateStats = {
        day: 0,
        month: 0,
        year: 0,
        range: 0,
        unknown: 0,
        lowCertainty: 0
    };

    const senderStats = {
        identified: 0,
        named: 0,
        partial: 0,
        unknown: 0,
        missing: 0
    };

    const recipientStats = {
        identified: 0,
        named: 0,
        partial: 0,
        unknown: 0,
        missing: 0
    };

    const placeStats = {
        exact: 0,
        region: 0,
        unknown: 0,
        missing: 0
    };

    for (const letter of letters) {
        // Date statistics
        if (letter.datePrecision) {
            dateStats[letter.datePrecision] = (dateStats[letter.datePrecision] || 0) + 1;
        }
        if (letter.dateCertainty === 'low') {
            dateStats.lowCertainty++;
        }

        // Sender statistics
        if (letter.sender) {
            senderStats[letter.sender.precision] = (senderStats[letter.sender.precision] || 0) + 1;
        } else {
            senderStats.missing++;
        }

        // Recipient statistics
        if (letter.recipient) {
            recipientStats[letter.recipient.precision] = (recipientStats[letter.recipient.precision] || 0) + 1;
        } else {
            recipientStats.missing++;
        }

        // Place statistics
        if (letter.place_sent) {
            placeStats[letter.place_sent.precision] = (placeStats[letter.place_sent.precision] || 0) + 1;
        } else {
            placeStats.missing++;
        }
    }

    return {
        dates: dateStats,
        senders: senderStats,
        recipients: recipientStats,
        places: placeStats
    };
}

/**
 * Extract metadata from document
 */
function extractMeta(doc, letters) {
    const title = doc.getElementsByTagNameNS(TEI_NS, 'title')[0]?.textContent.trim() || 'Untitled';
    const publisher = doc.getElementsByTagNameNS(TEI_NS, 'publisher')[0]?.textContent.trim() || null;

    const years = letters.map(l => l.year).filter(y => y !== null);
    const minYear = years.length > 0 ? Math.min(...years) : null;
    const maxYear = years.length > 0 ? Math.max(...years) : null;

    const uniquePlaces = new Set(letters.map(l => l.place_sent?.geonames_id).filter(Boolean));
    // Count unique senders/recipients by name to include unidentified persons
    const uniqueSenders = new Set(letters.map(l => l.sender?.name).filter(Boolean));
    const uniqueRecipients = new Set(letters.map(l => l.recipient?.name).filter(Boolean));

    // Calculate uncertainty statistics
    const uncertainty = calculateUncertaintyStats(letters);

    return {
        title,
        publisher,
        total_letters: letters.length,
        unique_senders: uniqueSenders.size,
        unique_recipients: uniqueRecipients.size,
        unique_places: uniquePlaces.size,
        date_range: {
            min: minYear,
            max: maxYear
        },
        uncertainty,
        generated: new Date().toISOString()
    };
}

/**
 * Enrich places with coordinates from a coordinates cache
 * @param {Object} data - Parsed CMIF data
 * @param {Object} coordsCache - Object mapping geonames_id to {lat, lon}
 */
export function enrichWithCoordinates(data, coordsCache) {
    for (const letter of data.letters) {
        if (letter.place_sent?.geonames_id) {
            const coords = coordsCache[letter.place_sent.geonames_id];
            if (coords) {
                letter.place_sent.lat = coords.lat;
                letter.place_sent.lon = coords.lon;
            }
        }
    }

    for (const [id, place] of Object.entries(data.indices.places)) {
        const coords = coordsCache[id];
        if (coords) {
            place.lat = coords.lat;
            place.lon = coords.lon;
        }
    }

    return data;
}
