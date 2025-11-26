// HerData - Network Utilities
// Functions for analyzing and visualizing person connections

/**
 * Get all connections for a person
 * @param {Object} person - Person object from persons.json
 * @param {Array} allPersons - All persons for ID lookup
 * @returns {Array<Object>} Array of connection objects
 */
export function getPersonConnections(person, allPersons, cachedCorrespondence = null) {
    const connections = [];

    // Check if person has places (required for connections)
    if (!person.places || person.places.length === 0) {
        return connections;
    }

    // 1. AGRELON relationships (family, professional, social)
    if (person.relationships && Array.isArray(person.relationships)) {
        person.relationships.forEach(relation => {
            const targetPerson = allPersons.find(p => p.id === relation.target_id);

            if (targetPerson && targetPerson.places && targetPerson.places.length > 0) {
                const targetPlace = targetPerson.places[0];

                connections.push({
                    type: 'agrelon',
                    subtype: relation.type,
                    category: categorizeRelationByAgrelonId(relation.type_id),
                    person: targetPerson,
                    from: {
                        lat: person.places[0].lat,
                        lon: person.places[0].lon,
                        name: person.places[0].name
                    },
                    to: {
                        lat: targetPlace.lat,
                        lon: targetPlace.lon,
                        name: targetPlace.name
                    },
                    strength: 5
                });
            }
        });
    }

    // 2. Correspondence connections (woman-to-woman letters)
    // Use cached connections if provided, otherwise compute
    const corrConnections = cachedCorrespondence || extractCorrespondenceConnections(allPersons);
    corrConnections.forEach(conn => {
        // Include connection if person is sender OR recipient
        if (conn.sender.id === person.id || conn.recipient.id === person.id) {
            connections.push(conn);
        }
    });

    return connections;
}

/**
 * Categorize AGRELON relation by ID
 * @param {string} agrelonId - AGRELON ID (e.g., "4010", "3010")
 * @returns {string} Category: Familie, Beruflich, Sozial, or Unbekannt
 */
function categorizeRelationByAgrelonId(agrelonId) {
    // Familie (Verwandtschaft)
    if (agrelonId.startsWith('4')) return 'Familie';

    // Beruflich
    if (agrelonId.startsWith('3')) return 'Beruflich';

    // Sozial (Private Bekanntschaft + Gruppenbeteiligung)
    if (agrelonId.startsWith('1') || agrelonId.startsWith('2')) return 'Sozial';

    return 'Unbekannt';
}

/**
 * Categorize AGRELON relation type into Familie/Beruflich/Sozial (deprecated - use categorizeRelationByAgrelonId)
 * @param {string} relationType - AGRELON type (e.g., "Tochter", "Mutter")
 * @returns {string} Category: Familie, Beruflich, Sozial, or Unbekannt
 */
function categorizeRelation(relationType) {
    const familyTypes = [
        'Tochter', 'Sohn', 'Mutter', 'Vater', 'Schwester', 'Bruder',
        'Großmutter', 'Großvater', 'Enkelin', 'Enkel',
        'Ehefrau', 'Ehemann', 'Partnerin', 'Partner',
        'Tante', 'Onkel', 'Nichte', 'Neffe', 'Cousine', 'Cousin',
        'Schwiegermutter', 'Schwiegervater', 'Schwiegertochter', 'Schwiegersohn',
        'Stiefmutter', 'Stiefvater', 'Stieftochter', 'Stiefsohn'
    ];

    const professionalTypes = [
        'Arbeitgeber', 'Arbeitnehmer', 'Kollege', 'Kollegin',
        'Mentor', 'Mentee', 'Verleger', 'Verlegerin', 'Autor', 'Autorin',
        'Patron', 'Patronin', 'Protégé', 'Protégée',
        'Lehrer', 'Lehrerin', 'Schüler', 'Schülerin'
    ];

    const socialTypes = [
        'Freund', 'Freundin', 'Bekannter', 'Bekannte',
        'Nachbar', 'Nachbarin', 'Gast', 'Gastgeber', 'Gastgeberin',
        'Mitglied'
    ];

    if (familyTypes.includes(relationType)) return 'Familie';
    if (professionalTypes.includes(relationType)) return 'Beruflich';
    if (socialTypes.includes(relationType)) return 'Sozial';

    return 'Unbekannt';
}

/**
 * Get connections for all persons in a cluster
 * @param {Array} clusterPersons - Array of person objects in cluster
 * @param {Array} allPersons - All persons for lookup
 * @returns {Array<Object>} Array of unique connections
 */
export function getClusterConnections(clusterPersons, allPersons, cachedCorrespondence = null) {
    const allConnections = [];
    const seen = new Set();

    clusterPersons.forEach(person => {
        const personConnections = getPersonConnections(person, allPersons, cachedCorrespondence);

        personConnections.forEach(conn => {
            // Create unique key including person IDs and connection type to preserve parallel connections
            // For AGRELON: include source person ID + target person ID + type
            // For correspondence: sender ID + recipient ID (already handled by extractCorrespondenceConnections)
            let key;
            if (conn.type === 'agrelon' && conn.person) {
                // AGRELON relationship: source person + target person + relation type + coordinates
                key = `agrelon-${person.id}-${conn.person.id}-${conn.subtype}-${conn.from.lat},${conn.from.lon}-${conn.to.lat},${conn.to.lon}`;
            } else if (conn.sender && conn.recipient) {
                // Correspondence: sender + recipient + coordinates
                key = `correspondence-${conn.sender.id}-${conn.recipient.id}-${conn.from.lat},${conn.from.lon}-${conn.to.lat},${conn.to.lon}`;
            } else {
                // Fallback: just coordinates (for any unexpected connection types)
                key = `${conn.from.lat},${conn.from.lon}-${conn.to.lat},${conn.to.lon}`;
            }

            if (!seen.has(key)) {
                seen.add(key);
                allConnections.push(conn);
            }
        });
    });

    return allConnections;
}

/**
 * Extract woman-to-woman correspondence connections
 * @param {Array} allPersons - All persons from persons.json
 * @returns {Array<Object>} Array of correspondence connections
 */
export function extractCorrespondenceConnections(allPersons) {
    const connections = [];
    const womenByGnd = new Map();

    // Build GND lookup for fast matching
    allPersons.forEach(p => {
        if (p.gnd) womenByGnd.set(p.gnd, p);
    });

    // Find woman-to-woman correspondence
    allPersons.forEach(sender => {
        if (!sender.correspondence || !Array.isArray(sender.correspondence)) return;
        if (!sender.places || sender.places.length === 0) return;

        sender.correspondence.forEach(corr => {
            const recipientGnd = corr.recipient_gnd;
            if (!recipientGnd) return;

            const recipient = womenByGnd.get(recipientGnd);
            if (!recipient) return; // Not a woman in our dataset

            // Recipient must have places for map visualization
            if (!recipient.places || recipient.places.length === 0) return;

            connections.push({
                type: 'correspondence',
                subtype: 'letter',
                category: 'Korrespondenz',
                sender: sender,
                recipient: recipient,
                from: {
                    lat: sender.places[0].lat,
                    lon: sender.places[0].lon,
                    name: sender.places[0].name
                },
                to: {
                    lat: recipient.places[0].lat,
                    lon: recipient.places[0].lon,
                    name: recipient.places[0].name
                },
                year: corr.year,
                date: corr.date,
                strength: 1 // Will be aggregated
            });
        });
    });

    // Aggregate: Count letters per pair (bidirectional)
    const aggregated = new Map();
    connections.forEach(conn => {
        // Create bidirectional key (sort IDs to avoid duplicates)
        const ids = [conn.sender.id, conn.recipient.id].sort();
        const key = `${ids[0]}-${ids[1]}`;

        if (aggregated.has(key)) {
            aggregated.get(key).strength++;
            aggregated.get(key).years.push(conn.year);
        } else {
            aggregated.set(key, {
                ...conn,
                years: [conn.year]
            });
        }
    });

    return Array.from(aggregated.values());
}

/**
 * Get color for connection based on category
 * @param {string} category - Familie, Beruflich, Sozial, Korrespondenz, Ort
 * @returns {string} Hex color code
 */
export function getConnectionColor(category) {
    const colors = {
        'Familie': '#D0388C',        // Magenta/Pink - family relations
        'Beruflich': '#3498db',      // Blue - professional, distinct from Sozial
        'Sozial': '#f39c12',         // Orange/Amber - social, warm color contrast
        'Korrespondenz': '#6C5CE7',  // Purple - for woman-to-woman letters
        'Ort': '#6c757d',            // Gray
        'Unbekannt': '#adb5bd'       // Light gray
    };

    return colors[category] || colors['Unbekannt'];
}

/**
 * Filter connections by enabled categories
 * @param {Array} connections - Array of connection objects
 * @param {Object} enabledCategories - Object with category: boolean pairs
 * @returns {Array<Object>} Filtered connections
 */
export function filterConnections(connections, enabledCategories) {
    return connections.filter(conn => enabledCategories[conn.category]);
}
