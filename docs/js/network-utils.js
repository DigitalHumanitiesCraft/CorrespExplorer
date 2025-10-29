// HerData - Network Utilities
// Functions for analyzing and visualizing person connections

/**
 * Get all connections for a person
 * @param {Object} person - Person object from persons.json
 * @param {Array} allPersons - All persons for ID lookup
 * @returns {Array<Object>} Array of connection objects
 */
export function getPersonConnections(person, allPersons) {
    const connections = [];

    // Check if person has places (required for connections)
    if (!person.places || person.places.length === 0) {
        return connections;
    }

    // 1. AGRELON relationships (family, professional, social)
    if (person.relations && Array.isArray(person.relations)) {
        person.relations.forEach(relation => {
            const targetPerson = allPersons.find(p => p.id === relation.target);

            if (targetPerson && targetPerson.places && targetPerson.places.length > 0) {
                const targetPlace = targetPerson.places[0];

                connections.push({
                    type: 'agrelon',
                    subtype: relation.type,
                    category: categorizeRelation(relation.type),
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

    // 2. Letter correspondence connections
    if (person.briefe && person.briefe.gesamt > 0) {
        // For now, we'll add correspondence connections in Phase 2
        // when we have proper sender/recipient data
    }

    return connections;
}

/**
 * Categorize AGRELON relation type into Familie/Beruflich/Sozial
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
export function getClusterConnections(clusterPersons, allPersons) {
    const allConnections = [];
    const seen = new Set();

    clusterPersons.forEach(person => {
        const personConnections = getPersonConnections(person, allPersons);

        personConnections.forEach(conn => {
            // Create unique key to avoid duplicates
            const key = `${conn.from.lat},${conn.from.lon}-${conn.to.lat},${conn.to.lon}`;

            if (!seen.has(key)) {
                seen.add(key);
                allConnections.push(conn);
            }
        });
    });

    return allConnections;
}

/**
 * Get color for connection based on category
 * @param {string} category - Familie, Beruflich, Sozial, Ort
 * @returns {string} Hex color code
 */
export function getConnectionColor(category) {
    const colors = {
        'Familie': '#e63946',        // Red
        'Beruflich': '#06a77d',      // Green
        'Sozial': '#f77f00',         // Orange
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
