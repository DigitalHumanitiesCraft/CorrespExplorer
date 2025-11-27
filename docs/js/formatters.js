// Formatters - Display formatting for dates, persons, places with uncertainty
// Extracted from explore.js for better modularity

import { escapeHtml } from './utils.js';

// ===================
// CSS CLASS HELPERS
// ===================

/**
 * Get CSS class for date precision
 * @param {string} precision - day, month, year, range, unknown
 * @param {string} certainty - high, medium, low
 * @returns {string} CSS classes
 */
export function getDatePrecisionClass(precision, certainty) {
    const classes = [];
    if (precision === 'month' || precision === 'year') {
        classes.push('date-imprecise');
    } else if (precision === 'range') {
        classes.push('date-range');
    } else if (precision === 'unknown') {
        classes.push('date-unknown');
    }
    if (certainty === 'low') {
        classes.push('date-uncertain');
    }
    return classes.join(' ');
}

/**
 * Get CSS class for person precision
 * @param {string} precision - identified, named, partial, unknown
 * @returns {string} CSS class
 */
export function getPersonPrecisionClass(precision) {
    if (precision === 'unknown') return 'person-unknown';
    if (precision === 'partial') return 'person-partial';
    if (precision === 'named') return 'person-named';
    return '';
}

/**
 * Get CSS class for place precision
 * @param {string} precision - exact, region, unknown
 * @returns {string} CSS class
 */
export function getPlacePrecisionClass(precision) {
    if (precision === 'unknown') return 'place-unknown';
    if (precision === 'region') return 'place-region';
    return '';
}

// ===================
// NAME FORMATTERS
// ===================

/**
 * Format person name with uncertainty indicator
 * @param {string} name - Person name
 * @param {string} precision - identified, named, partial, unknown
 * @returns {string} HTML string
 */
export function formatPersonName(name, precision) {
    if (!name) return '<span class="person-unknown">[Unbekannt]</span>';
    if (precision === 'unknown') {
        return `<span class="person-unknown">[${escapeHtml(name)}]</span>`;
    }
    if (precision === 'partial') {
        return `<span class="person-partial">${escapeHtml(name)}</span>`;
    }
    if (precision === 'named') {
        return `<span class="person-named">${escapeHtml(name)}</span>`;
    }
    return escapeHtml(name);
}

/**
 * Format place name with uncertainty indicator
 * @param {string} name - Place name
 * @param {string} precision - exact, region, unknown
 * @returns {string} HTML string
 */
export function formatPlaceName(name, precision) {
    if (!name) return '';
    if (precision === 'unknown') {
        return `<span class="place-unknown">${escapeHtml(name)} <i class="fas fa-question-circle" title="Unbekannter Ort"></i></span>`;
    }
    if (precision === 'region') {
        return `<span class="place-region">${escapeHtml(name)} <span class="region-hint">(Region)</span></span>`;
    }
    return escapeHtml(name);
}

// ===================
// DATE FORMATTERS
// ===================

// German month names for date formatting
const MONTH_NAMES = ['Jan', 'Feb', 'Maer', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/**
 * Format a single date string to readable format
 * @param {string} dateStr - Date string (YYYY, YYYY-MM, or YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export function formatSingleDate(dateStr) {
    if (!dateStr) return '';

    // Handle different date formats
    if (dateStr.length === 4) {
        // Just year: YYYY
        return dateStr;
    } else if (dateStr.length === 7) {
        // Year and month: YYYY-MM
        const [year, month] = dateStr.split('-');
        return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
    } else if (dateStr.length === 10) {
        // Full date: YYYY-MM-DD
        const [year, month, day] = dateStr.split('-');
        return `${parseInt(day)}.${parseInt(month)}.${year}`;
    }
    return dateStr;
}

/**
 * Format date with precision indicator (icons for imprecise dates)
 * @param {Object} letter - Letter object with date, dateTo, datePrecision, dateCertainty
 * @returns {string} HTML string with date and optional icon
 */
export function formatDateWithPrecision(letter) {
    if (!letter.date) {
        return '<span class="date-unknown"><i class="fas fa-question" title="Datum unbekannt"></i> unbekannt</span>';
    }

    const date = letter.date;
    const precision = letter.datePrecision;
    const certainty = letter.dateCertainty;

    let formattedDate;
    let icon = '';
    let tooltip = '';

    // Format based on precision
    if (precision === 'year') {
        formattedDate = date;
        icon = '<i class="fas fa-calendar-alt date-precision-icon" title="Nur Jahr bekannt"></i>';
        tooltip = 'Nur Jahr bekannt';
    } else if (precision === 'month') {
        // YYYY-MM -> "Mon YYYY"
        const [year, month] = date.split('-');
        formattedDate = `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
        icon = '<i class="fas fa-calendar-alt date-precision-icon" title="Nur Monat bekannt"></i>';
        tooltip = 'Nur Monat bekannt';
    } else if (precision === 'range' && letter.dateTo) {
        // Format range dates nicely
        const fromFormatted = formatSingleDate(date);
        const toFormatted = formatSingleDate(letter.dateTo);
        formattedDate = `${fromFormatted} – ${toFormatted}`;
        icon = '<i class="fas fa-arrows-alt-h date-range-icon" title="Zeitraum (notBefore/notAfter)"></i>';
        tooltip = 'Zeitraum: Brief wurde zwischen diesen Daten verfasst';
    } else {
        formattedDate = formatSingleDate(date);
    }

    // Add uncertainty marker with tooltip for cert="low"
    if (certainty === 'low') {
        icon = '<i class="fas fa-question-circle date-uncertain-icon" title="Unsichere Datierung (cert=low)"></i>';
        tooltip = 'Unsichere Datierung: Die Quelle markiert dieses Datum als unsicher';
    }

    // Build final output with icon prefix for imprecise dates
    if (icon) {
        return `<span class="date-with-precision" title="${tooltip}">${icon} ${formattedDate}</span>`;
    }
    return formattedDate;
}

// ===================
// INITIALS
// ===================

/**
 * Get initials for person, handling unknown persons
 * @param {string} name - Person name
 * @param {string} precision - identified, named, partial, unknown
 * @returns {string} Initials (1-2 characters)
 */
export function getPersonInitials(name, precision) {
    if (precision === 'unknown' || !name) return '?';

    // Handle partial names like "Rozario, [NN] de"
    const cleanName = name.replace(/\[NN\]|\[N\.N\.\]|\[\?\]/gi, '').trim();
    const parts = cleanName.split(/[\s,]+/).filter(p => p.length > 0);

    if (parts.length === 0) return '?';

    const initials = parts
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Add ? for partial names
    if (precision === 'partial') {
        return initials.length === 1 ? initials + '?' : initials[0] + '?';
    }

    return initials || '?';
}
