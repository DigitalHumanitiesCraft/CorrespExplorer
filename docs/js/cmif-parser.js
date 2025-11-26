// CMIF Parser - Browser-based XML parsing for Correspondence Metadata Interchange Format
// Parses CMIF-XML files and converts them to the internal JSON structure
// Also handles correspSearch API responses (TEI-JSON format)

import { isCorrespSearchUrl, fetchFromCorrespSearchUrl } from './correspsearch-api.js';

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
            if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                throw new Error('CORS-Fehler: Der Server erlaubt keine direkten Anfragen. Laden Sie die Datei manuell herunter und verwenden Sie den Datei-Upload.');
            }
            throw fetchError;
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
        year: dateInfo.year,
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

/**
 * Extract person information from correspAction
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
                isOrganization: true
            };
        }
        return null;
    }

    const ref = persName.getAttribute('ref');
    const authority = parseAuthorityRef(ref);

    return {
        name: persName.textContent.trim(),
        id: authority?.id || null,
        authority: authority?.type || null
    };
}

/**
 * Extract place information from correspAction
 */
function extractPlace(action) {
    if (!action) return null;

    const placeName = action.getElementsByTagNameNS(TEI_NS, 'placeName')[0];
    if (!placeName) return null;

    const ref = placeName.getAttribute('ref');
    const geonames = parseGeoNamesRef(ref);

    return {
        name: placeName.textContent.trim(),
        geonames_id: geonames?.id || null,
        lat: null,
        lon: null
    };
}

/**
 * Extract date information from correspAction
 */
function extractDate(action) {
    if (!action) return { date: null, year: null };

    const dateEl = action.getElementsByTagNameNS(TEI_NS, 'date')[0];
    if (!dateEl) return { date: null, year: null };

    const when = dateEl.getAttribute('when');
    const from = dateEl.getAttribute('from');
    const notBefore = dateEl.getAttribute('notBefore');
    const notAfter = dateEl.getAttribute('notAfter');

    const dateStr = when || from || notBefore || notAfter;

    if (!dateStr) return { date: null, year: null };

    const year = parseInt(dateStr.substring(0, 4), 10);

    return {
        date: dateStr,
        year: isNaN(year) ? null : year
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

    // BNF
    const bnfMatch = url.match(/data\.bnf\.fr\/ark:\/12148\/([^\s/]+)/);
    if (bnfMatch) return { type: 'bnf', id: bnfMatch[1] };

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
 * Extract metadata from document
 */
function extractMeta(doc, letters) {
    const title = doc.getElementsByTagNameNS(TEI_NS, 'title')[0]?.textContent.trim() || 'Untitled';
    const publisher = doc.getElementsByTagNameNS(TEI_NS, 'publisher')[0]?.textContent.trim() || null;

    const years = letters.map(l => l.year).filter(y => y !== null);
    const minYear = years.length > 0 ? Math.min(...years) : null;
    const maxYear = years.length > 0 ? Math.max(...years) : null;

    const uniquePlaces = new Set(letters.map(l => l.place_sent?.geonames_id).filter(Boolean));
    const uniqueSenders = new Set(letters.map(l => l.sender?.id).filter(Boolean));
    const uniqueRecipients = new Set(letters.map(l => l.recipient?.id).filter(Boolean));

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
