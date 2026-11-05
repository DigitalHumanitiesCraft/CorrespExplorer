// Test Suite: Demo
// What a workshop participant meets first: the tour, demo links in a new tab and the network of
// the tutorial dataset data/demo-showcase.xml

import { parseCMIF, loadDemoDataset, DEMO_DATASET_URL } from '../cmif-parser.js';
import { shouldStartDemoTour } from '../demo-tour.js';
import { datasetKey } from '../basket.js';
import { NETWORK_DEFAULTS } from '../constants.js';
import { defaultNetworkThreshold, buildContemporariesNetwork, buildTopicsNetwork } from '../views/network-view.js';
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
                assert(!shouldStartDemoTour('?demo=true&tour=0'), 'tour=0 sollte die Tour unterdruecken');

                // Finished in another tab: localStorage reaches every tab, sessionStorage did not
                localStorage.setItem(TOUR_DONE_KEY, 'true');
                assert(!shouldStartDemoTour('?demo=true&view=overview'), 'Beendete Tour sollte in neuen Tabs nicht wiederkommen');
            }
        },

        {
            name: 'Demo-Link ohne Upload: laedt den Tutorial-Datensatz mit dem Korbschluessel der Startseite',
            async run() {
                const data = await loadDemoDataset();
                const direct = await parseCMIF(DEMO_DATASET_URL);

                assert(data.letters.length === direct.letters.length && data.letters.length > 0,
                    `Briefe: ${data.letters.length} gegenueber ${direct.letters.length}`);
                assert(data.sourceInfo?.isDemo === true, 'sourceInfo sollte den Datensatz als Demo kennzeichnen');
                // upload.js keys the basket by the card's data-url, so shared basket links stay valid
                assert(datasetKey(data.sourceInfo) === datasetKey({ type: 'url', source: 'data/demo-showcase.xml' }),
                    `Korbschluessel weicht ab: ${datasetKey(data.sourceInfo)}`);
                assert(data.letters.some(l => l.place_sent?.lat), 'Koordinaten aus geonames_coordinates.json sollten gesetzt sein');
            }
        },

        {
            name: 'Netzwerk: Standardschwelle des Tutorial-Datensatzes ergibt Verbindungen',
            async run() {
                const { letters } = await parseCMIF(DEMO_DATASET_URL);
                const builders = { contemporaries: buildContemporariesNetwork, topics: buildTopicsNetwork };
                const ceilings = { contemporaries: NETWORK_DEFAULTS.minYears, topics: NETWORK_DEFAULTS.minCooccurrence };

                for (const [type, build] of Object.entries(builders)) {
                    const threshold = defaultNetworkThreshold(letters, type, ceilings[type]);
                    assert(threshold >= 1 && threshold <= ceilings[type], `${type}: Schwelle ${threshold} ausserhalb 1..${ceilings[type]}`);
                    const links = build(letters, threshold, NETWORK_DEFAULTS.maxNodes).links.length;
                    assert(links > 0, `${type}: Standardschwelle ${threshold} ergibt ein leeres Netzwerk`);
                    if (threshold < ceilings[type]) {
                        const above = build(letters, threshold + 1, NETWORK_DEFAULTS.maxNodes).links.length;
                        assert(above === 0, `${type}: Schwelle ${threshold + 1} haette noch ${above} Verbindungen und waere der bessere Standard`);
                    }
                }
            }
        }
    ]
};
