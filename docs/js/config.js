// CorrespExplorer - Data Source Configuration
// Defines available CMIF data sources and their properties

export const DATA_SOURCES = {
    herdata: {
        id: 'herdata',
        name: 'HerData',
        description: 'Frauen in Goethes Briefkorrespondenz',
        dataFile: 'data/persons.json',
        dataType: 'persons', // persons-centric
        authority: {
            type: 'gnd',
            baseUrl: 'https://d-nb.info/gnd/'
        },
        features: {
            hasSubjects: false,
            hasMentionsPlace: false,
            hasMentionsPerson: true,
            hasLanguage: true,
            hasOccupations: true,
            hasBiographies: true
        },
        ui: {
            primaryColor: '#2c3e50',
            accentColor: '#3498db',
            entityLabel: 'Frauen',
            entityLabelSingular: 'Frau'
        }
    },
    hsa: {
        id: 'hsa',
        name: 'Hugo Schuchardt Archiv',
        description: 'Korrespondenz des Sprachwissenschaftlers Hugo Schuchardt',
        dataFile: 'data/hsa-letters.json',
        dataType: 'letters', // letter-centric
        authority: {
            type: 'viaf',
            baseUrl: 'https://viaf.org/viaf/'
        },
        features: {
            hasSubjects: true,
            hasMentionsPlace: true,
            hasMentionsPerson: true,
            hasLanguage: true,
            hasOccupations: false,
            hasBiographies: false
        },
        ui: {
            primaryColor: '#1e40af',
            accentColor: '#2563eb',
            entityLabel: 'Briefe',
            entityLabelSingular: 'Brief'
        }
    }
};

// Current active data source
let currentSource = 'herdata';

/**
 * Get the current data source configuration
 * @returns {Object} Current data source config
 */
export function getCurrentSource() {
    return DATA_SOURCES[currentSource];
}

/**
 * Set the active data source
 * @param {string} sourceId - ID of the data source ('herdata' or 'hsa')
 */
export function setCurrentSource(sourceId) {
    if (!DATA_SOURCES[sourceId]) {
        throw new Error(`Unknown data source: ${sourceId}`);
    }
    currentSource = sourceId;
    console.log(`Data source set to: ${sourceId}`);
}

/**
 * Get all available data sources
 * @returns {Object} All data source configurations
 */
export function getAllSources() {
    return DATA_SOURCES;
}

/**
 * Check if current source has a specific feature
 * @param {string} featureName - Feature to check
 * @returns {boolean}
 */
export function hasFeature(featureName) {
    const source = getCurrentSource();
    return source.features[featureName] === true;
}

/**
 * Get the data type of current source
 * @returns {string} 'persons' or 'letters'
 */
export function getDataType() {
    return getCurrentSource().dataType;
}

/**
 * Detect data source from URL parameter or default
 * @returns {string} Data source ID
 */
export function detectSourceFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    if (source && DATA_SOURCES[source]) {
        setCurrentSource(source);
        return source;
    }
    return currentSource;
}
