// CorrespExplorer - HSA Configuration
// Hugo Schuchardt Archiv data configuration

export const CONFIG = {
    name: 'Hugo Schuchardt Archiv',
    shortName: 'HSA',
    description: 'Korrespondenz des Sprachwissenschaftlers Hugo Schuchardt',
    dataFile: 'data/hsa-letters.json',
    authority: {
        type: 'viaf',
        baseUrl: 'https://viaf.org/viaf/'
    },
    features: {
        hasSubjects: true,
        hasMentionsPlace: true,
        hasMentionsPerson: true,
        hasLanguage: true
    },
    ui: {
        primaryColor: '#1e40af',
        accentColor: '#2563eb',
        entityLabel: 'Briefe',
        entityLabelSingular: 'Brief'
    },
    dateRange: {
        min: 1859,
        max: 1927
    }
};

/**
 * Get the configuration
 * @returns {Object} Config object
 */
export function getConfig() {
    return CONFIG;
}

/**
 * Check if a specific feature is available
 * @param {string} featureName - Feature to check
 * @returns {boolean}
 */
export function hasFeature(featureName) {
    return CONFIG.features[featureName] === true;
}
