// Shared utility functions for CorrespExplorer
// Used by: explore.js, wissenskorb.js, basket-ui.js

/**
 * Debounce function - delays execution until after wait milliseconds
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Download file helper
 * @param {string} content - File content
 * @param {string} filename - Name for downloaded file
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Format number with locale
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('de-DE').format(num);
}

/**
 * Format date for display
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date
 */
export function formatDate(dateStr) {
    if (!dateStr) return 'o.D.';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('de-DE');
    } catch {
        return dateStr;
    }
}

/**
 * Extract year from date string
 * @param {string} dateStr - Date string (YYYY-MM-DD or YYYY)
 * @returns {number|null} - Year or null
 */
export function extractYear(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {number} duration - Duration in ms (default 3000)
 */
export function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast');

    // Create toast if not exists
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.innerHTML = '<i class="fas fa-check-circle"></i><span id="toast-message"></span>';
        document.body.appendChild(toast);
    }

    const messageEl = toast.querySelector('#toast-message') || toast.querySelector('span');
    if (messageEl) {
        messageEl.textContent = message;
    }

    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        return true;
    } catch {
        return false;
    }
}

/**
 * Build authority link (GND, VIAF, GeoNames)
 * @param {string} authorityUri - Full URI
 * @returns {string} - HTML link
 */
export function buildAuthorityLink(authorityUri) {
    if (!authorityUri) return '';

    let label = 'Link';
    if (authorityUri.includes('d-nb.info/gnd')) {
        label = 'GND';
    } else if (authorityUri.includes('viaf.org')) {
        label = 'VIAF';
    } else if (authorityUri.includes('geonames.org')) {
        label = 'GeoNames';
    } else if (authorityUri.includes('wikidata.org')) {
        label = 'Wikidata';
    }

    return `<a href="${escapeHtml(authorityUri)}" target="_blank" class="authority-link" title="${label}">${label}</a>`;
}

/**
 * Parse URL parameters
 * @returns {URLSearchParams}
 */
export function getUrlParams() {
    return new URLSearchParams(window.location.search);
}

/**
 * Update URL parameter without page reload
 * @param {string} key - Parameter key
 * @param {string|null} value - Parameter value (null to remove)
 */
export function setUrlParam(key, value) {
    const params = new URLSearchParams(window.location.search);
    if (value === null || value === undefined || value === '') {
        params.delete(key);
    } else {
        params.set(key, value);
    }
    const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    history.replaceState(null, '', newUrl);
}

/**
 * Parse authority reference URL (VIAF, GND, LC, BNF)
 * @param {string} url - Authority URL
 * @returns {Object|null} - { type, id } or null
 */
export function parseAuthorityRef(url) {
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
 * @param {string} url - GeoNames URL
 * @returns {Object|null} - { id } or null
 */
export function parseGeoNamesRef(url) {
    if (!url) return null;

    const match = url.match(/geonames\.org\/(\d+)/);
    if (match) return { id: match[1] };

    return null;
}

/**
 * Analyze dataset capabilities to determine which views are available
 * @param {Object} data - Parsed CMIF data
 * @returns {Object} Capabilities analysis
 */
export function analyzeDataCapabilities(data) {
    const capabilities = {
        hasPersons: false,
        hasDates: false,
        hasPlaces: false,
        hasCoordinates: false,
        hasSubjects: false,
        hasMentions: false,
        placeStats: {
            total: 0,
            withCoordinates: 0,
            withGeoNamesId: 0,
            needsResolution: 0
        }
    };

    if (!data || !data.letters) {
        return capabilities;
    }

    // Check persons
    capabilities.hasPersons = data.indices?.persons && Object.keys(data.indices.persons).length > 0;

    // Check dates
    capabilities.hasDates = data.letters.some(l => l.year !== null && l.year !== undefined);

    // Check places
    if (data.indices?.places) {
        const places = Object.values(data.indices.places);
        capabilities.hasPlaces = places.length > 0;
        capabilities.placeStats.total = places.length;

        for (const place of places) {
            if (place.lat && place.lon) {
                capabilities.placeStats.withCoordinates++;
                capabilities.hasCoordinates = true;
            } else if (place.geonames_id) {
                capabilities.placeStats.withGeoNamesId++;
                capabilities.placeStats.needsResolution++;
            }
        }
    }

    // Check subjects
    capabilities.hasSubjects = data.indices?.subjects && Object.keys(data.indices.subjects).length > 0;

    // Check mentions
    capabilities.hasMentions = data.letters.some(l =>
        l.mentions?.persons && l.mentions.persons.length > 0
    );

    return capabilities;
}
