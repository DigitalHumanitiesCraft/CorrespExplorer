// Letter export as CSV and JSON (US-21, US-22). One column set for every page that exports
// letters, so the header stays the same and an empty selection still yields a header row.

import { csvCell } from './utils.js';

export const LETTER_EXPORT_COLUMNS = [
    'id', 'date', 'date_to', 'year', 'date_precision', 'date_certainty',
    'sender_name', 'sender_id', 'sender_precision',
    'recipient_name', 'recipient_id', 'recipient_precision',
    'place_name', 'place_geonames', 'place_precision',
    'language', 'url'
];

/**
 * One flat export row of a letter, keyed by LETTER_EXPORT_COLUMNS
 * @param {Object} letter
 * @returns {Object}
 */
export function letterExportRow(letter) {
    return {
        id: letter.id,
        date: letter.date,
        date_to: letter.dateTo || '',
        year: letter.year,
        date_precision: letter.datePrecision || '',
        date_certainty: letter.dateCertainty || 'high',
        sender_name: letter.sender?.name || '',
        sender_id: letter.sender?.id || '',
        sender_precision: letter.sender?.precision || '',
        recipient_name: letter.recipient?.name || '',
        recipient_id: letter.recipient?.id || '',
        recipient_precision: letter.recipient?.precision || '',
        place_name: letter.place_sent?.name || '',
        place_geonames: letter.place_sent?.geonames_id || '',
        place_precision: letter.place_sent?.precision || '',
        language: letter.language?.code || '',
        url: letter.url || ''
    };
}

/**
 * CSV with header row; every cell passes csvCell (quoting, formula guard)
 * @param {Array} letters
 * @returns {string}
 */
export function lettersToCsv(letters) {
    const rows = letters.map(letter => {
        const row = letterExportRow(letter);
        return LETTER_EXPORT_COLUMNS.map(column => csvCell(row[column] ?? '')).join(',');
    });
    return [LETTER_EXPORT_COLUMNS.join(','), ...rows].join('\n');
}

/**
 * JSON array of export rows
 * @param {Array} letters
 * @returns {string}
 */
export function lettersToJson(letters) {
    return JSON.stringify(letters.map(letterExportRow), null, 2);
}
