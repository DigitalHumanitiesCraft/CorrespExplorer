// Letter export as CSV and JSON (US-21, US-22). One column set for every page that exports
// letters, so the header stays the same and an empty selection still yields a header row.

import { csvCell } from './utils.js';
import { summarizeCorpus } from './research-paths.js';

export const LETTER_EXPORT_COLUMNS = [
    'id', 'date', 'date_to', 'year', 'date_precision', 'date_certainty',
    'sender_name', 'sender_id', 'sender_authority', 'sender_precision',
    'recipient_name', 'recipient_id', 'recipient_authority', 'recipient_precision',
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
        // The id alone does not say whether it is a GND or a VIAF number
        sender_authority: letter.sender?.authority || '',
        sender_precision: letter.sender?.precision || '',
        recipient_name: letter.recipient?.name || '',
        recipient_id: letter.recipient?.id || '',
        recipient_authority: letter.recipient?.authority || '',
        recipient_precision: letter.recipient?.precision || '',
        place_name: letter.place_sent?.name || '',
        place_geonames: letter.place_sent?.geonames_id || '',
        place_precision: letter.place_sent?.precision || '',
        language: letter.language?.code || '',
        url: letter.url || ''
    };
}

// Byte order mark: Excel reads a UTF-8 CSV without it in the system code page and breaks umlauts
// (decision E4 of 2026-11-05; the effect in Excel is not yet checked)
export const CSV_BOM = '\uFEFF';

/**
 * CSV with BOM and header row; every cell passes csvCell (quoting, formula guard)
 * @param {Array} letters
 * @returns {string}
 */
export function lettersToCsv(letters) {
    const rows = letters.map(letter => {
        const row = letterExportRow(letter);
        return LETTER_EXPORT_COLUMNS.map(column => csvCell(row[column] ?? '')).join(',');
    });
    return CSV_BOM + [LETTER_EXPORT_COLUMNS.join(','), ...rows].join('\n');
}

/**
 * Whole data structure of a letter list as JSON (US-22, decision E8 of 2026-11-05): the letters as
 * the explorer holds them, with mentions, precision and certainty, the indices of persons, places
 * and subjects counted from the same letters (personKey, placeKey, as the lists count), and the
 * dataset metadata with its source. The CSV keeps the flat rows for spreadsheets.
 * @param {Array} letters - filtered letters
 * @param {{meta?: Object, source?: Object, indices?: Object, exported?: string}} [context] - indices give
 *   the coordinates that preprocessed datasets keep in their place index
 * @returns {string}
 */
export function datasetToJson(letters, { meta = null, source = null, indices = {}, exported = new Date().toISOString() } = {}) {
    const corpus = summarizeCorpus(letters, indices);
    const index = (map, extra) => [...map.values()]
        .sort((a, b) => b.count - a.count)
        .map(entry => ({ key: entry.key, name: entry.name, letters: entry.count, ...extra(entry) }));
    return JSON.stringify({
        format: 'CorrespExplorer JSON export',
        exported,
        dataset: meta,
        source,
        letterCount: letters.length,
        letters,
        indices: {
            persons: index(corpus.persons, e => ({ identified: e.identified })),
            places: index(corpus.places, e => ({ located: e.located })),
            subjects: index(corpus.subjects, () => ({}))
        }
    }, null, 2);
}
