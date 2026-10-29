// Test Suite: Security
// Escaping and URL-scheme checks against the hostile CMIF fixture data/test-hostile.xml

import { parseCMIF } from '../cmif-parser.js';
import { escapeHtml, safeUrl, buildAuthorityLink, isAllowedJsonPath } from '../utils.js';
import { formatPersonName, formatPlaceName, formatDateWithPrecision } from '../formatters.js';
import { assert } from './test-runner.js';

const URL_KEYS = ['url', 'ref', 'cmifUrl', 'sourceUrl'];

// Collect every value stored under a URL-bearing key anywhere in the parsed structure
function collectUrls(value, found = []) {
    if (Array.isArray(value)) {
        value.forEach(v => collectUrls(v, found));
    } else if (value && typeof value === 'object') {
        for (const [key, v] of Object.entries(value)) {
            if (URL_KEYS.includes(key) && typeof v === 'string') found.push(v);
            collectUrls(v, found);
        }
    }
    return found;
}

// Render an HTML string into a detached element and count the elements it created
function elementCount(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.querySelectorAll('*').length;
}

export const SecurityTests = {
    name: 'Security',

    tests: [
        {
            name: 'escapeHtml: Escaped & < > " \'',
            run() {
                const result = escapeHtml(`&<>"'`);
                assert(result === '&amp;&lt;&gt;&quot;&#39;', `Unexpected escape result: ${result}`);
            }
        },

        {
            name: 'escapeHtml: Behaelt 0 und liefert leeren String fuer null/undefined',
            run() {
                assert(escapeHtml(0) === '0', `0 should stay "0", got "${escapeHtml(0)}"`);
                assert(escapeHtml(null) === '', 'null should yield empty string');
                assert(escapeHtml(undefined) === '', 'undefined should yield empty string');
            }
        },

        {
            name: 'safeUrl: Akzeptiert nur http und https',
            run() {
                assert(safeUrl('https://example.org/a') === 'https://example.org/a', 'https should pass');
                assert(safeUrl('HTTP://example.org') === 'HTTP://example.org', 'http in upper case should pass');
                for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.example', 'data/x.json', '', null, undefined, 42]) {
                    assert(safeUrl(bad) === '', `Should reject ${String(bad)}`);
                }
            }
        },

        {
            name: 'buildAuthorityLink: Kein Link fuer javascript: URI',
            run() {
                assert(buildAuthorityLink('javascript:alert(1)') === '', 'javascript: URI must not become a link');
                assert(buildAuthorityLink('https://d-nb.info/gnd/118540238').includes('href="https://d-nb.info/gnd/118540238"'), 'GND link should be built');
            }
        },

        {
            name: 'isAllowedJsonPath: Nur relative .json-Pfade unter data/',
            run() {
                assert(isAllowedJsonPath('data/hsa-letters.json'), 'data/hsa-letters.json should be allowed');
                for (const bad of ['https://evil.example/x.json', '//evil.example/data/x.json', '/data/x.json',
                    'data/../x.json', 'data/x.json?y', 'data/x.xml', 'javascript:alert(1)//data/x.json', 'data\\x.json', '', null]) {
                    assert(!isAllowedJsonPath(bad), `Should reject ${String(bad)}`);
                }
            }
        },

        {
            name: 'Hostile CMIF: Parser liefert keine javascript:/data: URL',
            async run() {
                const data = await parseCMIF('data/test-hostile.xml');
                const urls = collectUrls(data);
                const unsafe = urls.filter(u => safeUrl(u) === '');
                assert(unsafe.length === 0, `Unsafe URLs survived parsing: ${unsafe.join(', ')}`);
                assert(urls.includes('https://example.org/letter/004'), 'Valid https letter ref should be kept');
                const first = data.letters[0];
                assert(first.url === null, `javascript: ref must not become letter.url, got ${first.url}`);
                assert(data.meta.cmifUrl === null, `javascript: idno must not become cmifUrl, got ${data.meta.cmifUrl}`);
            }
        },

        {
            name: 'Hostile CMIF: Namen und Orte erzeugen keine Elemente',
            async run() {
                const data = await parseCMIF('data/test-hostile.xml');
                for (const letter of data.letters) {
                    const html = [
                        formatPersonName(letter.sender?.name, 'named'),
                        formatPersonName(letter.recipient?.name, letter.recipient?.precision),
                        formatPlaceName(letter.place_sent?.name, letter.place_sent?.precision),
                        formatDateWithPrecision(letter),
                        `<span title="${escapeHtml(letter.sender?.name)}" data-id="${escapeHtml(letter.id)}">${escapeHtml(letter.language?.code)}</span>`
                    ].join('');
                    const container = document.createElement('div');
                    container.innerHTML = html;
                    assert(container.querySelector('img, b, script') === null, `Markup from data became an element: ${html}`);
                    const withHandler = [...container.querySelectorAll('*')].filter(el =>
                        [...el.attributes].some(a => a.name.startsWith('on')));
                    assert(withHandler.length === 0, `Event handler attribute injected: ${html}`);
                }
                assert(elementCount(escapeHtml('<img src=x onerror=alert(1)>')) === 0, 'Escaped payload must not create elements');
            }
        }
    ]
};
