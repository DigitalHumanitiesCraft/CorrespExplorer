// Test Suite: Demo
// What a workshop participant meets first: the tour, demo links in a new tab and the network of
// the tutorial dataset data/demo-showcase.xml

import { parseCMIF, loadDemoDataset, DEMO_DATASET_URL } from '../cmif-parser.js';
import { shouldStartDemoTour } from '../demo-tour.js';
import { datasetKey } from '../basket.js';
import { NETWORK_DEFAULTS } from '../constants.js';
import { defaultNetworkThreshold, buildContemporariesNetwork, buildCorrespondenceNetwork, buildTopicsNetwork, findEgo, networkWithoutEgo } from '../views/network-view.js';
import { personKey } from '../utils.js';
import { renderDataTable } from '../views/view-support.js';
import { assert } from './test-runner.js';

const TOUR_DONE_KEY = 'ce-demo-tour-completed';
// A browser that finished the tour keeps that state; setup saves it and teardown writes it back
let savedTourState = null;

export const DemoTests = {
    name: 'Demo',

    setup() {
        savedTourState = localStorage.getItem(TOUR_DONE_KEY);
    },

    teardown() {
        if (savedTourState === null) localStorage.removeItem(TOUR_DONE_KEY);
        else localStorage.setItem(TOUR_DONE_KEY, savedTourState);
    },

    tests: [
        {
            name: 'Tour: startet nur im Demo, bis sie in diesem Browser beendet wurde',
            run() {
                localStorage.removeItem(TOUR_DONE_KEY);
                assert(shouldStartDemoTour('?demo=true&view=overview'), 'Demo ohne beendete Tour sollte die Tour zeigen');
                assert(!shouldStartDemoTour('?view=overview'), 'Ohne demo=true keine Tour');
                assert(!shouldStartDemoTour('?demo=true&tour=0'), 'tour=0 sollte die Tour unterdrücken');

                // Finished in another tab: localStorage reaches every tab, sessionStorage did not
                localStorage.setItem(TOUR_DONE_KEY, 'true');
                assert(!shouldStartDemoTour('?demo=true&view=overview'), 'Beendete Tour sollte in neuen Tabs nicht wiederkommen');
            }
        },

        {
            name: 'Demo-Link ohne Upload: lädt den Tutorial-Datensatz mit dem Korbschlüssel der Startseite',
            async run() {
                const data = await loadDemoDataset();
                const direct = await parseCMIF(DEMO_DATASET_URL);

                assert(data.letters.length === direct.letters.length && data.letters.length > 0,
                    `Briefe: ${data.letters.length} gegenüber ${direct.letters.length}`);
                assert(data.sourceInfo?.isDemo === true, 'sourceInfo sollte den Datensatz als Demo kennzeichnen');
                // upload.js keys the basket by the card's data-url, so shared basket links stay valid
                assert(datasetKey(data.sourceInfo) === datasetKey({ type: 'url', source: 'data/demo-showcase.xml' }),
                    `Korbschlüssel weicht ab: ${datasetKey(data.sourceInfo)}`);
                assert(data.letters.some(l => l.place_sent?.lat), 'Koordinaten aus geonames_coordinates.json sollten gesetzt sein');
            }
        },

        {
            name: 'Netzwerk: Standardschwelle des Tutorial-Datensatzes ergibt Verbindungen',
            async run() {
                const { letters } = await parseCMIF(DEMO_DATASET_URL);
                const builders = { correspondence: buildCorrespondenceNetwork, contemporaries: buildContemporariesNetwork, topics: buildTopicsNetwork };
                const ceilings = { correspondence: NETWORK_DEFAULTS.minLetters, contemporaries: NETWORK_DEFAULTS.minYears, topics: NETWORK_DEFAULTS.minCooccurrence };

                for (const [type, build] of Object.entries(builders)) {
                    const threshold = defaultNetworkThreshold(letters, type, ceilings[type]);
                    assert(threshold >= 1 && threshold <= ceilings[type], `${type}: Schwelle ${threshold} ausserhalb 1..${ceilings[type]}`);
                    const links = build(letters, threshold, NETWORK_DEFAULTS.maxNodes).links.length;
                    assert(links > 0, `${type}: Standardschwelle ${threshold} ergibt ein leeres Netzwerk`);
                    if (threshold < ceilings[type]) {
                        const above = build(letters, threshold + 1, NETWORK_DEFAULTS.maxNodes).links.length;
                        assert(above === 0, `${type}: Schwelle ${threshold + 1} hätte noch ${above} Verbindungen und wäre der bessere Standard`);
                    }
                }
            }
        },

        {
            // US-11, decision E8: edges are letters between two persons, counted in both directions
            name: 'Netzwerk Briefwechsel: Kante zählt die Briefe zwischen Absender und Empfänger',
            async run() {
                const { letters } = await parseCMIF(DEMO_DATASET_URL);
                const all = buildCorrespondenceNetwork(letters, 1, 10000);
                assert(all.links.length > 0, 'Tutorial-Datensatz sollte Briefwechsel enthalten');
                for (const link of all.links.slice(0, 5)) {
                    const between = letters.filter(l => {
                        const pair = [personKey(l.sender), personKey(l.recipient)];
                        return pair.includes(link.source) && pair.includes(link.target);
                    });
                    assert(link.count === between.length, `${link.sourceName} und ${link.targetName}: ${link.count} statt ${between.length} Briefe`);
                    assert(link.forward + link.backward === link.count, 'Richtungen ergeben nicht die Summe');
                }
                const strongest = all.links[0].count;
                const filtered = buildCorrespondenceNetwork(letters, strongest, 10000);
                assert(filtered.links.every(l => l.count >= strongest), 'Mindestzahl der Briefe nicht eingehalten');
                assert(filtered.links.length >= 1 && filtered.links.length <= all.links.length, 'Filter nach Mindestzahl wirkungslos');
            }
        },

        {
            // The text alternatives of the charts print names from the data; they must stay text
            name: 'Textalternative: Tabelle des Netzwerks escaped Namen aus test-hostile.xml',
            async run() {
                const { letters } = await parseCMIF('data/test-hostile.xml');
                const { links } = buildCorrespondenceNetwork(letters, 1, 1000);
                assert(links.length > 0, 'Fixture sollte Briefwechsel enthalten');
                const host = document.createElement('div');
                renderDataTable(host, {
                    caption: 'Verbindungen',
                    columns: ['Person', 'Person', 'Briefe'],
                    rows: links.map(l => [l.sourceName, l.targetName, l.count])
                });
                assert(host.querySelectorAll('tbody tr').length === links.length, 'Eine Zeile je Verbindung');
                assert(!host.querySelector('tbody img, tbody b'), 'Markup aus den Daten wurde als HTML eingefügt');
                assert(host.textContent.includes('<img src=x onerror=alert(1)>') || host.textContent.includes('<b>bold</b>'), 'Name sollte als Text erscheinen');
                renderDataTable(host, { caption: '', columns: [], rows: [] });
                assert(host.innerHTML === '', 'Ohne Zeilen bleibt der Platz leer');
            }
        },

        {
            // An ego-centred dataset: the dominant person is found, hiding it keeps only the
            // relations between the others, and organisations stay distinguishable from persons
            name: 'Netzwerk: Ego des Datensatzes, Verbindungen ohne Ego, Organisationen als Knotenart',
            async run() {
                const { letters } = await parseCMIF('data/test-letter-records.xml');
                const ego = findEgo(letters);
                const muster = letters[0].sender;
                assert(ego && ego.id === personKey(muster), `Ego sollte ${muster.name} sein, ist ${ego?.name}`);
                assert(ego.count === 3 && ego.total === letters.length, `Ego an 3 von ${letters.length} Briefen, gezählt ${ego.count}`);

                const full = buildCorrespondenceNetwork(letters, 1, Infinity);
                const org = full.nodes.find(n => n.name === 'Verlag Probe');
                assert(org?.isOrganization === true, 'Der Verlag ist als Organisation markiert');
                assert(full.nodes.filter(n => n.isOrganization).length === 1, 'Nur der Verlag ist Organisation');

                const others = networkWithoutEgo(full, ego.id, 50);
                assert(others.links.every(l => l.source !== ego.id && l.target !== ego.id), 'Keine Kante des Ego bleibt');
                assert(others.links.length === full.links.filter(l => l.source !== ego.id && l.target !== ego.id).length,
                    'Alle Kanten zwischen anderen Personen bleiben');
                assert(others.links.length > 0, 'Fixture hat Verbindungen ohne Ego');
                const linked = new Set(others.links.flatMap(l => [l.source, l.target]));
                assert(others.nodes.every(n => linked.has(n.id)), 'Ohne Ego bleibt kein Knoten ohne Kante');
                assert(networkWithoutEgo(full, ego.id, 1).nodes.length === 0, 'Ein einzelner Knoten hat keine Kante und entfällt');

                const { letters: hostile } = await parseCMIF('data/test-hostile.xml');
                const egoHostile = findEgo(hostile);
                assert(!egoHostile || egoHostile.count * 2 >= hostile.length, 'Ego nur bei mindestens der Hälfte der Briefe');
            }
        }
    ]
};
