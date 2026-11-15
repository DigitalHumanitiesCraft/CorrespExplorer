// Test Suite: the dashboard of the start view, its pure parts (licence name, the counts its small
// views draw) and the shared drawing parts of mini-figures.js

import { assert } from './test-runner.js';
import { licenceName, partnerCounts, mentionCounts, placeCounts, yearLanguageCounts } from '../views/overview-view.js';
import { mapFrame, frameProjection } from '../mini-figures.js';
import { countOf, languageOrder, languageCategory, dominantLanguages } from '../selection-ui.js';
import { LANGUAGE_COLORS, NO_LANGUAGE, computeLanguageColors } from '../constants.js';

const assertEqual = (actual, expected, label) => assert(actual === expected, `${label}: ${actual} statt ${expected}`);
const person = (id, name = id) => ({ id, name });
const C = person('c', 'Zentrum');
const A = person('a', 'Anna');
const B = person('b', 'Bruno');

export const DashboardTests = {
    name: 'Startansicht',

    setup() {},

    tests: [
        {
            name: 'licenceName: Kurzname aus der Adresse, sonst der Text der Quelle',
            run() {
                assertEqual(licenceName('https://creativecommons.org/licenses/by/4.0/', 'This file is licensed under the terms of the Creative-Commons-License CC-BY 4.0'), 'CC BY 4.0', 'CC BY');
                assertEqual(licenceName('http://creativecommons.org/licenses/by-sa/3.0/de/', null), 'CC BY-SA 3.0', 'CC BY-SA');
                assertEqual(licenceName('https://creativecommons.org/publicdomain/zero/1.0/', 'CC0'), 'CC0', 'CC0');
                assertEqual(licenceName('https://example.org/licence', ' Eigene Lizenz '), 'Eigene Lizenz', 'fremde Adresse');
                assertEqual(licenceName(null, null), null, 'ohne Lizenz');
            }
        },
        {
            name: 'partnerCounts: Gegenseite des Zentrums, ein Brief zählt je Partner einmal',
            run() {
                const letters = [
                    { sender: C, recipient: A },
                    { sender: A, recipient: C },
                    { sender: B, recipient: C },
                    // Two recipients of one letter of the centre are both its partners
                    { sender: C, recipient: A, recipients: [A, B] },
                    // A letter between two others does not belong to the circle
                    { sender: A, recipient: B }
                ];
                const { partners, centre } = partnerCounts(letters, 'c');
                assertEqual(centre, 4, 'Briefe des Zentrums');
                assertEqual(partners.get('a'), 3, 'Anna');
                assertEqual(partners.get('b'), 2, 'Bruno');
                assertEqual(partners.has('c'), false, 'Zentrum ist kein eigener Partner');
            }
        },
        {
            name: 'mentionCounts: Erwähnungen in Briefen des Zentrums, einmal je Brief',
            run() {
                const letters = [
                    { sender: C, recipient: A, mentions: { persons: [B, B] } },
                    { sender: A, recipient: B, mentions: { persons: [B] } }
                ];
                const counts = mentionCounts(letters, 'c');
                assertEqual(counts.get('b'), 1, 'Bruno einmal');
            }
        },
        {
            name: 'placeCounts: Platzhalter wie Unbekannt sind kein Ort, Koordinaten bleiben',
            run() {
                const letters = [
                    { place_sent: { name: 'Graz', geonames_id: '2778067', lat: 47.07, lon: 15.44 } },
                    { place_sent: { name: 'Graz', geonames_id: '2778067', lat: 47.07, lon: 15.44 } },
                    { place_sent: { name: 'Unbekannt' } },
                    { place_sent: { name: 'Wien' } },
                    {}
                ];
                const places = placeCounts(letters);
                assertEqual(places.size, 2, 'zwei Orte');
                assertEqual(places.get('2778067').count, 2, 'Graz');
                assertEqual(places.get('Wien').lat, null, 'Wien ohne Koordinaten');
                assertEqual(places.has('Unbekannt'), false, 'kein Platzhalter');
            }
        },
        {
            name: 'yearLanguageCounts: unplausible Jahre fehlen, Sprachen je Jahr',
            run() {
                const counts = yearLanguageCounts([
                    { year: 1900, language: { code: 'de' } },
                    { year: 1900, language: { code: 'de' } },
                    { year: 1900 },
                    { year: 1200, dateImplausible: true },
                    {}
                ]);
                assertEqual(counts.size, 1, 'ein Jahr');
                assertEqual([...counts.get(1900).values()].reduce((a, b) => a + b, 0), 3, 'drei Briefe 1900');
                assertEqual(counts.get(1900).get('_none'), 1, 'ein Brief ohne Sprache');
            }
        },
        {
            name: 'countOf: eine Form für alle Zählangaben, ungefiltert nur die Gesamtzahl',
            run() {
                assertEqual(countOf(774, 774, 'Orte', 'Orten'), '774 Orte', 'ungefiltert');
                assertEqual(countOf(95, 774, 'Orte', 'Orten'), '95 von 774 Orten', 'gefiltert');
                assertEqual(countOf(1030, 1031, 'Personen'), '1.030 von 1.031 Personen', 'Tausenderpunkt');
            }
        },
        {
            name: 'languageOrder und dominantLanguages: Reihenfolge der Farben, Sprache einer Marke nach ihren Briefen',
            run() {
                const saved = { ...LANGUAGE_COLORS };
                computeLanguageColors([
                    { language: { code: 'fr' } }, { language: { code: 'de' } }, { language: { code: 'de' } }
                ]);
                const order = languageOrder(new Map([['fr', 1], ['de', 2], ['other', 0], [NO_LANGUAGE, 3]]));
                assertEqual(order.join(','), `de,fr,${NO_LANGUAGE}`, 'Häufigkeit im Bestand, ohne leere Gruppen, ohne Angabe zuletzt');
                // The time view's former own order, the keys of the colours with letters, is the same
                const totals = { fr: 1, de: 2, other: 4, [NO_LANGUAGE]: 0, _total: 7 };
                assertEqual(languageOrder(totals).join(','), Object.keys(LANGUAGE_COLORS).filter(key => totals[key] > 0).join(','), 'Reihenfolge der Zeitansicht');
                assertEqual(languageCategory('xx'), 'other', 'Sprache ohne eigene Farbe gehört zum Rest');
                assertEqual(languageCategory(null), NO_LANGUAGE, 'ohne Sprache');
                const dominant = dominantLanguages([
                    { place: 'a', language: { code: 'fr' } },
                    { place: 'a', language: { code: 'de' } },
                    { place: 'a', language: { code: 'fr' } },
                    { place: 'b', language: { code: 'de' } },
                    { place: 'b', language: { code: 'fr' } }
                ], l => [l.place]);
                assertEqual(dominant.get('a'), 'fr', 'häufigste Sprache');
                assertEqual(dominant.get('b'), 'de', 'Gleichstand geht an die frühere Farbe');
                Object.keys(LANGUAGE_COLORS).forEach(key => delete LANGUAGE_COLORS[key]);
                Object.assign(LANGUAGE_COLORS, saved);
            }
        },
        {
            name: 'mapFrame und frameProjection: der Rahmen umfasst die Orte, die Projektion bleibt in der Fläche',
            run() {
                const places = [[47.07, 15.44, 10], [48.2, 16.37, 5], [52.52, 13.4, 1]];
                const frame = mapFrame(places);
                assert(frame.latMin < 47.07 && frame.latMax > 52.52, 'Breite im Rahmen');
                const project = frameProjection(frame, 200, 100);
                places.forEach(([lat, lon]) => {
                    const [x, y] = project(lat, lon);
                    assert(x >= 0 && x <= 200 && y >= 0 && y <= 100, `${lat}/${lon} liegt in der Fläche`);
                });
                assertEqual(mapFrame([]), null, 'ohne Orte kein Rahmen');
            }
        }
    ]
};
