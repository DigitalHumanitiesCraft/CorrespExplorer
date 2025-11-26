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
