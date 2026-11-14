// Parts every view of the explorer shares when it shows and sets the selection (knowledge/design.md,
// "Gemeinsame Regeln aller Ansichten"): one form for counts (rule 7), the language key that is the
// language filter, in one order of languages (rules 2, 5 and 11), the values with which a figure
// sets the selection before the pale whole (rule 6), and the classes that say a mark can be chosen
// (rule 8). The dashboard of the start view uses them now; the other figures can take them over.

import { LANGUAGE_COLORS, NO_LANGUAGE, isRestLanguage, languageLabel } from './constants.js';

const format = n => n.toLocaleString('de-DE');

/**
 * A count in the one form of the page: "774 Orte", under a filter "95 von 774 Orten" (rule 7)
 * @param {number} part
 * @param {number} total
 * @param {string} one - the thing in the nominative plural ("Orte")
 * @param {string} [of] - the thing after "von" ("Orten"), where it differs
 * @returns {string}
 */
export function countOf(part, total, one, of = one) {
    return part === total ? `${format(total)} ${one}` : `${format(part)} von ${format(total)} ${of}`;
}

/**
 * Rule 6: the selection stands in full colour before the pale whole. A figure draws the whole
 * dataset in PALE_TOKEN (or, where it fades marks instead, at OUTSIDE_OPACITY) and the selection
 * in the colour of its language or the data colour.
 */
export const PALE_TOKEN = '--color-border-light';
export const OUTSIDE_OPACITY = 0.3;

/**
 * Rule 8: a figure whose marks can be chosen sets CHOOSABLE on itself, and OVER_MARK while the
 * pointer rests on a mark, so the cursor and the outline say that a click chooses (dashboard.css)
 */
export const CHOOSABLE = 'is-choosable';
export const OVER_MARK = 'is-over-mark';

/**
 * The language category a code has in every figure: its own colour, the grey rest, or none
 * @param {string|null|undefined} code
 * @returns {string}
 */
export function languageCategory(code) {
    if (!code || code === NO_LANGUAGE) return NO_LANGUAGE;
    return isRestLanguage(code) ? 'other' : code;
}

/**
 * The categories in the one order of the page (rule 11): the languages with a colour by their
 * frequency in the whole dataset, as computeLanguageColors() assigned them, then the rest, then
 * the letters without a language
 * @param {Map<string, number>|Object} totals - letters per category in the whole dataset
 * @returns {string[]}
 */
export function languageOrder(totals) {
    const has = key => (totals instanceof Map ? totals.get(key) : totals[key]) > 0;
    const coloured = Object.keys(LANGUAGE_COLORS).filter(key => key !== 'other' && key !== NO_LANGUAGE);
    return [...coloured, 'other', NO_LANGUAGE].filter(has);
}

export const languageColor = key => LANGUAGE_COLORS[key] || LANGUAGE_COLORS.other;
export const languageName = key => (key === 'other' ? 'Übrige Sprachen' : key === NO_LANGUAGE ? 'Ohne Angabe' : languageLabel(key));

/**
 * The most frequent language category of each key over letters, for colouring a mark by the
 * language of its letters (the rule of the space-time view)
 * @param {Array} letters
 * @param {function(Object): Array<string>} keysOf - the keys a letter counts for
 * @returns {Map<string, string>}
 */
export function dominantLanguages(letters, keysOf) {
    const counts = new Map();
    for (const letter of letters) {
        const category = languageCategory(letter.language?.code);
        for (const key of new Set(keysOf(letter))) {
            if (!key) continue;
            let byLanguage = counts.get(key);
            if (!byLanguage) counts.set(key, byLanguage = new Map());
            byLanguage.set(category, (byLanguage.get(category) || 0) + 1);
        }
    }
    const result = new Map();
    counts.forEach((byLanguage, key) => {
        let best = null;
        let most = 0;
        // Ties go to the earlier category of the page order, so the result does not depend on
        // the order of the letters
        const order = Object.keys(LANGUAGE_COLORS);
        byLanguage.forEach((n, category) => {
            if (n > most || (n === most && order.indexOf(category) < order.indexOf(best))) { best = category; most = n; }
        });
        result.set(key, best);
    });
    return result;
}

/**
 * The language key that is the language filter (rule 2): one row of language marks over the width
 * of the figure, each as wide as its share of the selection and at least as wide as its name, so
 * the row is the share bar and its legend at once. A click or Enter on a language toggles it; the
 * rest is one mark that opens the list of its languages. The count stands in the tooltip and the
 * accessible name.
 * @param {HTMLElement} host
 * @param {Object} options
 * @param {Map<string, number>} options.counts - letters per category in the selection
 * @param {Map<string, number>} options.totals - letters per category in the whole dataset
 * @param {string[]|null} options.chosen - the language filter: checked codes, or null
 * @param {function(string): void} options.onToggle - toggles one category
 * @param {function(HTMLElement): void} options.onRest - opens the list of the rest languages
 * @param {function(HTMLElement, string): void} [options.tip] - shows a tooltip at an element
 */
export function renderLanguageKey(host, { counts, totals, chosen, onToggle, onRest, tip }) {
    const restOnly = Boolean(chosen?.length) && chosen.every(code => code !== NO_LANGUAGE && isRestLanguage(code));
    const pressed = key => Boolean(chosen) && (key === 'other' ? restOnly : !restOnly && chosen.includes(key));
    const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
    const focused = document.activeElement?.closest?.('.language-key__mark')?.dataset.key;
    const row = document.createElement('div');
    row.className = 'language-key';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Sprache der Briefe, Farbe in allen Figuren');
    const name = document.createElement('span');
    name.className = 'language-key__name';
    name.textContent = 'Sprache';
    name.setAttribute('aria-hidden', 'true');
    row.append(name);
    languageOrder(totals).forEach(key => {
        const n = counts.get(key) || 0;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'language-key__mark';
        if (chosen && !pressed(key)) button.classList.add('is-outside');
        button.dataset.key = key;
        // The share of the selection widens the mark beyond the width of its name
        button.style.flexGrow = String(n / total);
        button.style.setProperty('--language', languageColor(key));
        const text = `${languageName(key)}: ${countOf(n, totals.get(key) || 0, n === 1 && (totals.get(key) || 0) === 1 ? 'Brief' : 'Briefe', 'Briefen')}`;
        if (key === 'other') {
            button.setAttribute('aria-haspopup', 'true');
            button.setAttribute('aria-pressed', String(pressed(key)));
            button.setAttribute('aria-label', `${text}, öffnet die Liste dieser Sprachen`);
            button.addEventListener('click', () => onRest(button));
        } else {
            button.setAttribute('aria-pressed', String(pressed(key)));
            button.setAttribute('aria-label', text);
            button.addEventListener('click', () => onToggle(key));
        }
        const label = document.createElement('span');
        label.className = 'language-key__label';
        label.textContent = languageName(key);
        button.append(label);
        if (tip) {
            const show = () => tip(button, text);
            button.addEventListener('pointerenter', show);
            button.addEventListener('focus', show);
            button.addEventListener('pointerleave', () => tip(null));
            button.addEventListener('blur', () => tip(null));
        }
        row.append(button);
    });
    host.replaceChildren(row);
    if (focused) host.querySelector(`.language-key__mark[data-key="${CSS.escape(focused)}"]`)?.focus();
}
