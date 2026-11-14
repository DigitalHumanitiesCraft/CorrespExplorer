// CMIF Parser - Browser-based XML parsing for Correspondence Metadata Interchange Format
// Parses CMIF-XML files and converts them to the internal JSON structure
// Also handles correspSearch API responses (TEI-JSON format)

import { isCorrespSearchUrl, fetchFromCorrespSearchUrl } from './correspsearch-api.js';
import { parseAuthorityRef, parseGeoNamesRef, safeUrl, classifyDate, cleanId, buildIndices, isUnknownPlaceName, httpErrorMessage } from './utils.js';
import { LANGUAGE_LABELS } from './constants.js';

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
    } else if (typeof source !== 'string') {
        throw new TypeError('parseCMIF erwartet eine Datei, eine URL oder einen XML-String');
    } else if (source.trimStart().startsWith('<')) {
        xmlString = source;
    } else if (/^https?:\/\//i.test(source)) {
        // Check if this is a correspSearch API URL
        if (isCorrespSearchUrl(source)) {
            return await fetchFromCorrespSearchUrl(source, onProgress);
        }

        try {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(httpErrorMessage(response.status, response.statusText));
            }
            xmlString = await response.text();
        } catch (fetchError) {
            // fetch rejects with a TypeError for unknown hosts, missing network and CORS alike;
            // the browser does not tell them apart, so the message names all three
            if (fetchError.name === 'TypeError') {
                const hostname = new URL(source).hostname;
                throw new Error(`${hostname} ist nicht erreichbar: Die Adresse existiert nicht, die Netzwerkverbindung fehlt oder der Server erlaubt keine Anfragen aus dem Browser (CORS). Prüfen Sie die URL, sonst laden Sie die Datei herunter und verwenden den Datei-Upload.`);
            }
            throw fetchError;
        }
    } else if (/^[a-z][a-z0-9+.-]*:/i.test(source)) {
        throw new Error(`Nicht unterstütztes URL-Schema: ${source.split(':')[0]}`);
    } else {
        // Relative URL (local file path like 'data/test.xml')
        try {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(httpErrorMessage(response.status, response.statusText));
            }
            xmlString = await response.text();
        } catch (fetchError) {
            throw new Error(`Fehler beim Laden der lokalen Datei: ${fetchError.message}`);
        }
    }

    if (!xmlString || !xmlString.trim()) {
        throw new Error('Die Datei ist leer. Bitte wählen Sie eine CMIF-Datei mit Briefdaten aus.');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        // The browser's parser text is English and technical; it stays in the console for debugging
        console.error('CMIF XML parser error:', parseError.textContent);
        throw new Error('Die Datei ist kein gültiges XML und kann nicht als CMIF gelesen werden. Bitte prüfen Sie, ob es sich um eine wohlgeformte CMIF-XML-Datei handelt.');
    }

    const letters = extractLetters(doc);
    const indices = buildIndices(letters);
    const meta = extractMeta(doc, letters);

    return { letters, indices, meta };
}

/**
 * Parse several files as one dataset, for editions that publish one TEI file per correspondence.
 * A file without letters or without valid XML is skipped and named in meta.files, the others
 * load. Letter ids are made unique across files.
 * @param {File[]|string[]} sources - Files or XML strings
 * @param {Function} [onProgress] - Called with (done, total)
 * @param {string[]} [names] - Names of the sources, where they are no File objects
 * @returns {Promise<Object>} Parsed data with letters, indices and meta
 */
export async function parseCMIFFiles(sources, onProgress = null, names = null) {
    const parts = [];
    const skipped = [];
    for (let i = 0; i < sources.length; i++) {
        const name = names?.[i] || sources[i].name || `Datei ${i + 1}`;
        try {
            parts.push(await parseCMIF(sources[i]));
        } catch (error) {
            skipped.push({ name, reason: error.message });
        }
        onProgress?.(i + 1, sources.length);
    }
    if (parts.length === 0) {
        throw new Error(`Keine der ${sources.length} Dateien enthält Briefe. ${skipped[0]?.reason || ''}`.trim());
    }
    return mergeDatasets(parts, { total: sources.length, skipped });
}

// A value all parts share, else null
function sharedValue(values) {
    const distinct = new Set(values.map(v => JSON.stringify(v ?? null)));
    return distinct.size === 1 ? values[0] ?? null : null;
}

// The value most parts carry; series titles vary by typos across the files of one edition
function mostCommon(values) {
    const counts = new Map();
    values.filter(Boolean).forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/**
 * Join parsed datasets into one. The header of the joined dataset states only what all files
 * share; the title falls back to the series title, then to the number of files.
 */
function mergeDatasets(parts, files) {
    const seen = new Map();
    const letters = [];
    for (const part of parts) {
        for (const letter of part.letters) {
            // Fallback ids (letter-1) repeat in every file; a suffix keeps each letter addressable
            const count = (seen.get(letter.id) || 0) + 1;
            seen.set(letter.id, count);
            letters.push(count === 1 ? letter : { ...letter, id: `${letter.id}~${count}` });
        }
    }

    const metas = parts.map(p => p.meta);
    const first = metas[0];
    const years = metas.flatMap(m => [m.date_range.min, m.date_range.max]).filter(y => y !== null);
    const publishers = [...new Map(metas.flatMap(m => m.publishers).map(p => [p.name, p])).values()];
    const editors = [...new Map(metas.flatMap(m => m.editors).map(e => [e.name, e])).values()];
    const title = parts.length === 1
        ? first.title
        : sharedValue(metas.map(m => m.title)) || mostCommon(metas.map(m => m.seriesTitle)) || `${parts.length} Dateien`;

    return {
        letters,
        indices: buildIndices(letters),
        meta: {
            ...first,
            title,
            editors,
            publishers,
            publicationDate: sharedValue(metas.map(m => m.publicationDate)),
            licence: sharedValue(metas.map(m => m.licence)),
            cmifUrl: parts.length === 1 ? first.cmifUrl : null,
            sourceReference: sharedValue(metas.map(m => m.sourceReference)),
            sourceUrl: sharedValue(metas.map(m => m.sourceUrl)),
            total_letters: letters.length,
            unique_senders: new Set(letters.map(l => l.sender?.name).filter(Boolean)).size,
            unique_recipients: new Set(letters.map(l => l.recipient?.name).filter(Boolean)).size,
            unique_places: new Set(letters.map(l => l.place_sent?.geonames_id).filter(Boolean)).size,
            date_range: { min: years.length ? Math.min(...years) : null, max: years.length ? Math.max(...years) : null },
            uncertainty: calculateUncertaintyStats(letters),
            files: { total: files.total, loaded: parts.length, skipped: files.skipped }
        }
    };
}

/**
 * Extract all letters (correspDesc elements) from the document
 */
function extractLetters(doc) {
    const correspDescs = doc.getElementsByTagNameNS(TEI_NS, 'correspDesc');
    if (correspDescs.length === 0) {
        throw new Error('Keine Briefe gefunden: Die Datei enthält kein correspDesc-Element im TEI-Namensraum. Ist es eine CMIF-Datei?');
    }
    const letters = [];

    for (let i = 0; i < correspDescs.length; i++) {
        const letter = extractLetter(correspDescs[i], i);
        if (letter) {
            letters.push(letter);
        }
    }

    return letters;
}

/**
 * Extract a single letter from a correspDesc element
 */
function extractLetter(desc, index) {
    // TEI that describes each letter in its own record (biblFull, bibl, msDesc) carries the id on
    // that record instead of on correspDesc. The position is the last fallback, so ids stay
    // stable across reloads and URL state
    const record = enclosingRecord(desc);
    const id = desc.getAttribute('ref') || desc.getAttribute('key') || xmlId(desc) || xmlId(record) || `letter-${index + 1}`;
    const url = safeUrl(desc.getAttribute('ref')) || null;

    const sentAction = getCorrespAction(desc, 'sent');

    const sender = extractPerson(sentAction);
    const recipients = getCorrespActions(desc, 'received').flatMap(extractPersons);
    const recipient = recipients[0] || null;
    const { place: placeSent, postmark } = extractPlace(sentAction);
    const dateInfo = extractDate(sentAction);
    const address = extractAddress(desc);
    const signature = extractSignature(record);

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
        // Optional fields exist only where the source carries them, so plain CMIF letters keep
        // their shape
        ...(dateInfo.inferred && { dateInferred: true }),
        ...(dateInfo.text && { dateText: dateInfo.text }),
        sender,
        recipient,
        ...(recipients.length > 1 && { recipients }),
        place_sent: placeSent,
        ...(postmark && { postmark }),
        ...(address && { address }),
        ...(signature && { signature }),
        language,
        mentions
    };
}

const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const RECORD_ELEMENTS = new Set(['biblFull', 'bibl', 'biblStruct', 'msDesc']);

function xmlId(el) {
    return el?.getAttributeNS(XML_NS, 'id') || null;
}

// Nearest ancestor that describes this one letter, or null in a plain CMIF list
function enclosingRecord(desc) {
    for (let el = desc.parentElement; el; el = el.parentElement) {
        if (el.namespaceURI === TEI_NS && RECORD_ELEMENTS.has(el.localName)) return el;
    }
    return null;
}

// Shelfmark of the letter from its own record (idno type="signature" or "shelfmark")
function extractSignature(record) {
    if (!record) return null;
    for (const idno of record.getElementsByTagNameNS(TEI_NS, 'idno')) {
        const type = (idno.getAttribute('type') || '').toLowerCase();
        if (type === 'signature' || type === 'shelfmark') return cleanText(idno.textContent) || null;
    }
    return null;
}

function cleanText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

function directChildren(parent, localName) {
    return parent ? [...parent.children].filter(el => el.namespaceURI === TEI_NS && el.localName === localName) : [];
}

/**
 * Whether the source marks a value as supplied by the editors rather than read from the letter:
 * TEI @evidence, a @type or @ana token such as supplied, deduced, inferred or conjecture, or the
 * editorial convention of square brackets around the whole value. Such a value is shown as
 * inferred and never as secured (uncertainty-specification.md).
 */
function isInferred(el) {
    if (el.hasAttribute('evidence')) return true;
    const tokens = `${el.getAttribute('type') || ''} ${el.getAttribute('ana') || ''}`.toLowerCase();
    if (/\b(supplied|deduced|inferred|conjectur\w*|erschlossen)\b/.test(tokens)) return true;
    return /^\[[^\]]+\]$/.test(cleanText(el.textContent));
}

/**
 * Postal address written on the letter (address/addrLine inside correspDesc). It is the place a
 * letter was sent to, never its sending place.
 */
function extractAddress(desc) {
    const address = desc.getElementsByTagNameNS(TEI_NS, 'address')[0];
    if (!address) return null;
    const lines = [...address.getElementsByTagNameNS(TEI_NS, 'addrLine')].map(l => cleanText(l.textContent)).filter(Boolean);
    return (lines.length ? lines.join(', ') : cleanText(address.textContent)) || null;
}

/**
 * Get correspAction element by type
 */
function getCorrespActions(desc, type) {
    return [...desc.getElementsByTagNameNS(TEI_NS, 'correspAction')].filter(action => action.getAttribute('type') === type);
}

function getCorrespAction(desc, type) {
    return getCorrespActions(desc, type)[0] || null;
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

// "Surname, Forename" for names split into child elements, else the text with collapsed whitespace
function personName(el) {
    const surname = cleanText(directChildren(el, 'surname')[0]?.textContent);
    const forename = cleanText(directChildren(el, 'forename')[0]?.textContent);
    if (surname && forename) return `${surname}, ${forename}`;
    return cleanText(el.textContent);
}

function personFromElement(el) {
    const ref = (el.getAttribute('ref') || '').trim();
    const name = personName(el);
    // A reference inside the edition (#id) or to an unknown system is no authority record: the
    // person stays "named", and the reference is kept so the source value is not lost
    const parsed = parseAuthorityRef(ref);
    const authority = parsed && (parsed.type !== 'unknown' || safeUrl(ref)) ? parsed : null;
    const localRef = ref && !authority ? { localRef: ref } : {};
    if (el.localName === 'orgName') {
        return {
            name,
            id: authority?.id || null,
            authority: authority?.type || null,
            isOrganization: true,
            precision: authority ? 'identified' : 'named',
            ...localRef
        };
    }
    return {
        name,
        id: authority?.id || null,
        authority: authority?.type || null,
        precision: getPersonPrecision(name, authority),
        ...localRef
    };
}

/**
 * All persons and organisations of a correspAction in document order
 * Precision levels: identified, named, partial, unknown
 */
function extractPersons(action) {
    if (!action) return [];
    return [...action.children]
        .filter(el => el.namespaceURI === TEI_NS && (el.localName === 'persName' || el.localName === 'orgName'))
        .map(personFromElement);
}

/**
 * First person of a correspAction, else its first organisation
 */
function extractPerson(action) {
    const all = extractPersons(action);
    return all.find(p => !p.isOrganization) || all[0] || null;
}

/**
 * Determine place precision level
 * Levels: exact (has GeoNames), region (name only, no GeoNames), unknown
 */
function getPlacePrecision(name, geonamesId) {
    if (!name) return 'unknown';

    const trimmedName = name.trim();

    // Check if unknown
    if (isUnknownPlaceName(trimmedName)) {
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
 * Sending place and postmark of a correspAction. A placeName of type postmark is the stamp, not
 * the place of writing, and one of type original repeats the wording of the letter; the sending
 * place is the first untyped placeName, else the first that is no postmark.
 * Precision levels: exact, region, unknown
 * @returns {{place: Object|null, postmark: string|null}}
 */
function extractPlace(action) {
    if (!action) return { place: null, postmark: null };

    const placeNames = [...action.getElementsByTagNameNS(TEI_NS, 'placeName')];
    const isPostmark = el => /^post(mark|alstamp|stempel)$/i.test(el.getAttribute('type') || '');
    const stamps = [
        ...placeNames.filter(isPostmark),
        ...[...action.getElementsByTagNameNS(TEI_NS, 'note')].filter(isPostmark)
    ].map(el => cleanText(el.textContent)).filter(Boolean);
    const postmark = [...new Set(stamps)].join(', ') || null;

    const candidates = placeNames.filter(el => !isPostmark(el));
    const placeName = candidates.find(el => !el.getAttribute('type')) || candidates[0];
    if (!placeName) return { place: null, postmark };

    const ref = placeName.getAttribute('ref');
    const geonames = parseGeoNamesRef(ref);
    const inferred = isInferred(placeName);
    // Brackets are the marker, not part of the name, so "[Wien]" and "Wien" are one place
    const name = cleanText(placeName.textContent).replace(/^\[([^\]]+)\]$/, '$1');
    const precision = getPlacePrecision(name, geonames?.id);

    return {
        place: {
            name,
            geonames_id: geonames?.id || null,
            lat: null,
            lon: null,
            precision,
            ...(inferred && { inferred: true })
        },
        postmark
    };
}

/**
 * Extract date information from correspAction with precision detection
 * Precision levels: day, month, year, range, unknown
 * Certainty levels: high, medium, low (from @cert attribute)
 * A source may repeat the date per language; the first element with a machine-readable value
 * counts. A date given only as text keeps that text, so the letter is not shown as undated.
 */
function extractDate(action) {
    const dateEls = action ? [...action.getElementsByTagNameNS(TEI_NS, 'date')] : [];
    const DATE_ATTRS = ['when', 'from', 'to', 'notBefore', 'notAfter'];
    const dateEl = dateEls.find(el => DATE_ATTRS.some(a => el.getAttribute(a))) || dateEls[0];
    if (!dateEl) return classifyDate({});

    const info = classifyDate({
        when: dateEl.getAttribute('when'),
        from: dateEl.getAttribute('from'),
        to: dateEl.getAttribute('to'),
        notBefore: dateEl.getAttribute('notBefore'),
        notAfter: dateEl.getAttribute('notAfter'),
        cert: dateEl.getAttribute('cert')
    });
    const text = cleanText(dateEl.textContent);
    return {
        ...info,
        inferred: dateEls.some(isInferred),
        text: !info.date && text ? text : null
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
            // The edition's own label (ref text) names codes outside the shared table
            return {
                code,
                label: LANGUAGE_LABELS[code] || ref.textContent.trim() || code
            };
        }
    }
    return null;
}

/**
 * Extract mentions (subjects, persons, places, orgs, bibls) from note element
 */
function extractMentions(note) {
    const mentions = {
        subjects: [],
        persons: [],
        places: [],
        orgs: [],
        bibls: []
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
        } else if (type.includes('mentionsOrg')) {
            const authority = parseAuthorityRef(target);
            mentions.orgs.push({
                name: label,
                id: authority?.id || null,
                authority: authority?.type || null
            });
        } else if (type.includes('mentionsBibl')) {
            mentions.bibls.push({
                title: label,
                uri: target
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
 * Calculate uncertainty statistics from letters
 */
function calculateUncertaintyStats(letters) {
    const dateStats = {
        day: 0,
        month: 0,
        year: 0,
        range: 0,
        unknown: 0,
        lowCertainty: 0,
        inferred: 0
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
        missing: 0,
        inferred: 0
    };

    for (const letter of letters) {
        // Date statistics
        if (letter.datePrecision) {
            dateStats[letter.datePrecision] = (dateStats[letter.datePrecision] || 0) + 1;
        }
        if (letter.dateCertainty === 'low') {
            dateStats.lowCertainty++;
        }
        if (letter.dateInferred) {
            dateStats.inferred++;
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
            if (letter.place_sent.inferred) placeStats.inferred++;
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
 * Extract metadata from document (full teiHeader)
 */
function extractMeta(doc, letters) {
    // titleStmt
    const titleStmt = doc.getElementsByTagNameNS(TEI_NS, 'titleStmt')[0];
    const title = titleStmt?.getElementsByTagNameNS(TEI_NS, 'title')[0]?.textContent.trim() || 'Untitled';
    // Editions with one file per correspondence name the whole in seriesStmt
    const seriesTitle = doc.getElementsByTagNameNS(TEI_NS, 'seriesStmt')[0]
        ?.getElementsByTagNameNS(TEI_NS, 'title')[0]?.textContent.trim() || null;

    // Editor(s) from titleStmt
    const editors = [];
    const editorEls = titleStmt?.getElementsByTagNameNS(TEI_NS, 'editor') || [];
    for (const editorEl of editorEls) {
        const emailEl = editorEl.getElementsByTagNameNS(TEI_NS, 'email')[0];
        const refAttr = editorEl.getAttribute('ref');
        // Get text content without email
        let name = editorEl.textContent.trim();
        if (emailEl) {
            name = name.replace(emailEl.textContent, '').trim();
        }
        editors.push({
            name,
            email: emailEl?.textContent.trim() || null,
            ref: safeUrl(refAttr) || null
        });
    }

    // publicationStmt
    const publicationStmt = doc.getElementsByTagNameNS(TEI_NS, 'publicationStmt')[0];

    // Publisher(s) - can be multiple, each can be text or contain ref
    const publishers = [];
    const publisherEls = publicationStmt?.getElementsByTagNameNS(TEI_NS, 'publisher') || [];
    for (const publisherEl of publisherEls) {
        const refEl = publisherEl.getElementsByTagNameNS(TEI_NS, 'ref')[0];
        if (refEl) {
            publishers.push({
                name: refEl.textContent.trim(),
                url: safeUrl(refEl.getAttribute('target')) || null
            });
        } else {
            publishers.push({
                name: cleanText(publisherEl.textContent),
                url: null
            });
        }
    }

    // Publication date
    const pubDateEl = publicationStmt?.getElementsByTagNameNS(TEI_NS, 'date')[0];
    const publicationDate = pubDateEl?.getAttribute('when') || pubDateEl?.textContent.trim() || null;

    // Licence
    const licenceEl = publicationStmt?.getElementsByTagNameNS(TEI_NS, 'licence')[0];
    const licence = licenceEl ? {
        text: licenceEl.textContent.trim(),
        url: safeUrl(licenceEl.getAttribute('target')) || null
    } : null;

    // CMIF URL (idno with type="url")
    const idnoEls = publicationStmt?.getElementsByTagNameNS(TEI_NS, 'idno') || [];
    let cmifUrl = null;
    for (const idno of idnoEls) {
        if (idno.getAttribute('type') === 'url') {
            cmifUrl = safeUrl(idno.textContent) || null;
            break;
        }
    }

    // sourceDesc/bibl - bibliographic reference with optional link
    const sourceDesc = doc.getElementsByTagNameNS(TEI_NS, 'sourceDesc')[0];
    const biblEl = sourceDesc?.getElementsByTagNameNS(TEI_NS, 'bibl')[0];
    let sourceReference = null;
    let sourceUrl = null;
    if (biblEl) {
        const biblRefEl = biblEl.getElementsByTagNameNS(TEI_NS, 'ref')[0];
        if (biblRefEl) {
            sourceUrl = safeUrl(biblRefEl.getAttribute('target')) || null;
        }
        // Get text without the ref URL text for cleaner display
        sourceReference = biblEl.textContent.trim();
    }

    // Letter statistics
    const years = letters.map(l => l.year).filter(y => y !== null);
    const minYear = years.length > 0 ? Math.min(...years) : null;
    const maxYear = years.length > 0 ? Math.max(...years) : null;

    const uniquePlaces = new Set(letters.map(l => l.place_sent?.geonames_id).filter(Boolean));
    const uniqueSenders = new Set(letters.map(l => l.sender?.name).filter(Boolean));
    const uniqueRecipients = new Set(letters.map(l => l.recipient?.name).filter(Boolean));

    // Calculate uncertainty statistics
    const uncertainty = calculateUncertaintyStats(letters);

    return {
        // Header metadata
        title,
        seriesTitle,
        editors,
        publishers,
        publicationDate,
        licence,
        cmifUrl,
        sourceReference,
        sourceUrl,
        // Letter statistics
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

/**
 * Add coordinates from the prebuilt Wikidata/GeoNames table (data.md, Rechte und Lizenzen).
 * A missing table leaves the places without coordinates, the map then lists them as such.
 * @param {Object} data - Parsed CMIF data
 * @returns {Promise<Object>} the same data
 */
export async function addTableCoordinates(data) {
    try {
        const response = await fetch('data/geonames_coordinates.json');
        if (response.ok) {
            const { coordinates } = await response.json();
            enrichWithCoordinates(data, coordinates);
        }
    } catch (error) {
        console.warn('Coordinates table not available:', error);
    }
    return data;
}

// Tutorial dataset of the start page; its card loads this path, so the basket key matches
export const DEMO_DATASET_URL = 'data/demo-showcase.xml';

/**
 * The tutorial dataset as the start page prepares it, without Wikidata enrichment (ADR-006).
 * Demo links opened in a new tab or by another person load it here instead of landing on the
 * start page.
 * @returns {Promise<Object>} parsed data with sourceInfo
 */
export async function loadDemoDataset() {
    return loadUrlDataset(DEMO_DATASET_URL, { isDemo: true });
}

/**
 * A dataset from a URL as the start page prepares it, coordinates from the table and no Wikidata
 * enrichment (ADR-006). The sourceInfo matches the start page, so the basket key stays the same.
 * @param {string} url - Bundled CMIF path or correspSearch API URL
 * @param {{isDemo?: boolean, type?: string}} [options] - type as the start page sets it (url, correspsearch)
 * @returns {Promise<Object>}
 */
export async function loadUrlDataset(url, { isDemo = false, type = 'url' } = {}) {
    const data = await addTableCoordinates(await parseCMIF(url));
    data.sourceInfo = isDemo ? { type, source: url, isDemo: true } : { type, source: url };
    return data;
}
