// Test Suite: Basket
// Bulk add, URL sharing and dataset scoping of basket.js with keys from data/test-uncertainty.xml

import { parseCMIF } from '../cmif-parser.js';
import { personKey, placeKey, csvCell } from '../utils.js';
import { lettersToCsv } from '../export.js';
import {
    datasetKey,
    initBasket,
    clearBasket,
    getBasketItems,
    addItemsToBasket,
    onBasketChange,
    basketToParams,
    basketFromParams,
    loadBasketFromUrl,
    addEntityToBasket
} from '../basket.js';
import { assert } from './test-runner.js';

const FIXTURE = 'data/test-uncertainty.xml';
// The key upload.js would write for this fixture; teardown restores its storage entry
const DATASET = datasetKey({ type: 'file', source: 'test-uncertainty.xml' });
const OTHER_DATASET = datasetKey({ type: 'file', source: 'test-hostile.xml' });
const STORAGE_KEY = `correspexplorer-basket:${DATASET}`;

// A user who loaded the same fixture keeps a basket under this key; setup saves it and teardown
// writes it back, so running the suite does not empty it
let savedBasket = null;

async function fixtureKeys() {
    const data = await parseCMIF(FIXTURE);
    const persons = [...new Set(data.letters.flatMap(l => [personKey(l.sender), personKey(l.recipient)]).filter(Boolean))];
    const places = [...new Set(data.letters.map(l => placeKey(l.place_sent)).filter(Boolean))];
    return { data, letters: data.letters.map(l => l.id), persons, places };
}

// Runs fn with the given query string on the test page and restores the address afterwards
async function withSearch(search, fn) {
    const original = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}`);
    try {
        return await fn();
    } finally {
        window.history.replaceState(window.history.state, '', original);
    }
}

export const BasketTests = {
    name: 'Basket',

    setup() {
        try {
            savedBasket = localStorage.getItem(STORAGE_KEY);
        } catch {
            savedBasket = null;
        }
        initBasket(DATASET);
        clearBasket();
    },

    teardown() {
        clearBasket();
        try {
            if (savedBasket === null) {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, savedBasket);
            }
        } catch {
            // Storage may be blocked; the basket then lives only in memory
        }
    },

    tests: [
        {
            name: 'addItemsToBasket: Speichert und benachrichtigt einmal, zählt Duplikate',
            async run() {
                const { persons } = await fixtureKeys();
                let notifications = 0;
                const unsubscribe = onBasketChange(() => { notifications++; });
                try {
                    const first = addItemsToBasket('persons', persons);
                    assert(first.added === persons.length, `Erwartet ${persons.length} hinzugefügt, erhalten ${first.added}`);
                    assert(notifications === 1, `Erwartet eine Benachrichtigung, erhalten ${notifications}`);

                    const second = addItemsToBasket('persons', persons);
                    assert(second.added === 0 && second.duplicates === persons.length,
                        `Zweiter Aufruf sollte nur Duplikate melden: ${JSON.stringify(second)}`);
                    assert(notifications === 1, 'Ohne Änderung sollte keine weitere Benachrichtigung folgen');
                } finally {
                    unsubscribe();
                }
                clearBasket();
                assert(notifications === 1, 'Nach dem Abmelden sollte der Listener nicht mehr benachrichtigt werden');
            }
        },
        {
            name: 'URL-Teilen: Namensschlüssel mit Komma, Orte und Datensatz überstehen den Rundweg',
            async run() {
                const { letters, persons, places } = await fixtureKeys();
                const withComma = persons.filter(k => k.includes(','));
                assert(withComma.length > 0, 'Fixture sollte einen Personenschlüssel mit Komma enthalten');

                const params = basketToParams({ letters, persons, places }, DATASET);
                const parsed = basketFromParams(new URLSearchParams(params.toString()));
                assert(parsed.dataset === DATASET, `Datensatz erwartet ${DATASET}, erhalten ${parsed.dataset}`);
                assert(JSON.stringify(parsed.items.persons) === JSON.stringify(persons), 'Personenschlüssel verändert');
                assert(JSON.stringify(parsed.items.letters) === JSON.stringify(letters), 'Brief-IDs verändert');
                assert(JSON.stringify(parsed.items.places) === JSON.stringify(places), 'Ortsschlüssel verändert');
            }
        },
        {
            name: 'URL-Teilen: Leere Typen entfernen veraltete Parameter',
            async run() {
                const { letters, persons } = await fixtureKeys();
                const stale = basketToParams({ letters, persons, places: [] }, DATASET);
                const fresh = basketToParams({ letters: [], persons: persons.slice(0, 1), places: [] }, DATASET, stale);
                assert(!fresh.has('basket_letters'), 'basket_letters sollte bei leerem Briefkorb fehlen');
                assert(fresh.has('basket_persons'), 'basket_persons sollte gesetzt sein');
            }
        },
        {
            name: 'URL-Teilen: Links ohne basket_v werden wie bisher an Kommas getrennt',
            async run() {
                const { letters } = await fixtureKeys();
                const legacy = new URLSearchParams({ basket_letters: letters.join(',') });
                const parsed = basketFromParams(legacy);
                assert(JSON.stringify(parsed.items.letters) === JSON.stringify(letters), 'Alte Links sollten lesbar bleiben');
                assert(parsed.dataset === null, 'Alte Links tragen keinen Datensatz');
            }
        },
        {
            name: 'loadBasketFromUrl: Führt zusammen, entfernt die Parameter, ignoriert fremde Datensätze',
            async run() {
                const { letters, persons } = await fixtureKeys();
                addItemsToBasket('persons', persons.slice(0, 1));

                const shared = basketToParams({ letters: letters.slice(0, 2), persons: persons.slice(1, 2), places: [] }, DATASET);
                const outcome = await withSearch(`?keep=1&${shared}`, () => {
                    const result = loadBasketFromUrl({ notify: false });
                    assert(new URLSearchParams(window.location.search).get('keep') === '1', 'Fremde Parameter sollten bleiben');
                    assert(!window.location.search.includes('basket_'), 'basket_*-Parameter sollten entfernt sein');
                    return result;
                });
                assert(outcome.status === 'imported' && outcome.added === 3, `Erwartet 3 importiert: ${JSON.stringify(outcome)}`);
                assert(getBasketItems('persons').length === 2, 'Vorhandene Person sollte erhalten bleiben (Zusammenführen)');

                const foreign = basketToParams({ letters: letters.slice(2, 3), persons: [], places: [] }, OTHER_DATASET);
                const other = await withSearch(`?${foreign}`, () => loadBasketFromUrl({ notify: false }));
                assert(other.status === 'other-dataset', `Fremder Datensatz sollte nicht importiert werden: ${other.status}`);
                assert(getBasketItems('letters').length === 2, 'Briefkorb sollte unverändert bleiben');
            }
        },
        {
            name: 'csvCell: Verdoppelt Anführungszeichen aus data/test-hostile.xml',
            async run() {
                const data = await parseCMIF('data/test-hostile.xml');
                const name = data.letters.map(l => l.recipient?.name).find(n => n?.includes('"'));
                assert(name, 'Fixture sollte einen Namen mit Anführungszeichen enthalten');
                const cell = csvCell(name);
                assert(cell === `"${name.replace(/"/g, '""')}"`, `Unerwartete CSV-Zelle: ${cell}`);
            }
        },
        {
            name: 'addEntityToBasket: Person und Ort als eigene Einträge, ohne Briefe (E2)',
            async run() {
                const { persons, places } = await fixtureKeys();
                initBasket(DATASET);
                clearBasket();
                assert(addEntityToBasket('persons', persons[0]) === 'Person zum Korb hinzugefügt', 'Meldung beim Hinzufügen');
                assert(addEntityToBasket('persons', persons[0]) === 'Person ist bereits im Korb', 'Meldung bei Duplikat');
                addEntityToBasket('places', places[0]);
                assert(getBasketItems('persons').includes(persons[0]), 'Person sollte im Korb liegen');
                assert(getBasketItems('places').includes(places[0]), 'Ort sollte im Korb liegen');
                assert(getBasketItems('letters').length === 0, 'Es sollten keine Briefe in den Korb kommen');
            }
        },
        {
            name: 'CSV-Export: Formeln aus data/test-hostile.xml beginnen mit Apostroph',
            async run() {
                const data = await parseCMIF('data/test-hostile.xml');
                const formulas = data.letters.flatMap(l => [l.sender?.name, l.recipient?.name, l.place_sent?.name])
                    .filter(v => /^[=+\-@]/.test(v || ''));
                assert(formulas.length >= 3, `Fixture sollte Formelwerte enthalten, gefunden ${formulas.length}`);
                const csv = lettersToCsv(data.letters);
                // A quoted cell may not open with a formula character; the guard puts an apostrophe first
                const unguarded = csv.split('\n').filter(line => /(^|,)"[=+\-@]/.test(line));
                assert(unguarded.length === 0, `Ungeschützte Formel im CSV: ${unguarded[0]}`);
                for (const value of formulas) {
                    assert(csv.includes(`"'${value.replace(/"/g, '""')}"`), `Wert ohne Apostroph exportiert: ${value}`);
                }
            }
        }
    ]
};
