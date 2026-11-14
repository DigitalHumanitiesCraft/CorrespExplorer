// Test Suite: space-time view, the pure parts (aggregation, ground plane, projection, fit)

import { parseCMIF } from '../cmif-parser.js';
import { assert } from './test-runner.js';
import { aggregatePlaceYears, groundLayout, projectPoint, fitBox, CAMERAS } from '../views/spacetime-view.js';

export const SpacetimeTests = {
    name: 'Raum-Zeit',

    setup() {},

    tests: [
        {
            name: 'aggregatePlaceYears: gezeichnete, jahrlose und ortlose Briefe ergeben zusammen alle Briefe',
            async run() {
                const data = await parseCMIF('data/test-uncertainty.xml');
                const agg = aggregatePlaceYears(data.letters, data.indices?.places || {});
                const sum = agg.drawn + agg.withoutYear + agg.withoutCoords;
                assert(sum === data.letters.length, `Summe ${sum} statt ${data.letters.length}`);
                const marks = agg.places.reduce((n, p) => n + p.years.reduce((m, y) => m + y.count, 0), 0);
                assert(marks === agg.drawn, `Marken zählen ${marks}, gezeichnet ${agg.drawn}`);
                assert(agg.places.every(p => p.total === p.years.reduce((m, y) => m + y.count, 0)), 'Summe je Ort');
            }
        },
        {
            name: 'aggregatePlaceYears: HSA zeichnet Briefe mit Jahr und Koordinaten je Ort und Jahr',
            async run() {
                const response = await fetch('data/hsa-letters.json');
                const data = await response.json();
                const agg = aggregatePlaceYears(data.letters, data.indices?.places || {});
                assert(agg.drawn + agg.withoutYear + agg.withoutCoords === data.letters.length, 'Summe aller Briefe');
                assert(agg.places.length > 100, `nur ${agg.places.length} Orte`);
                const top = agg.places[0];
                assert(top.total >= agg.places[1].total, 'Orte nach Briefzahl absteigend');
                assert(agg.yearMin < agg.yearMax, 'Jahresspanne');
            }
        },
        {
            name: 'groundLayout: entfernte Einzelorte stehen am Rand, der Kern füllt den Rahmen',
            run() {
                const europe = [
                    { lat: 47.07, lon: 15.44, total: 2000 }, { lat: 48.21, lon: 16.37, total: 800 },
                    { lat: 48.86, lon: 2.35, total: 700 }, { lat: 52.52, lon: 13.40, total: 200 },
                    { lat: 41.90, lon: 12.50, total: 150 }
                ];
                const overseas = { lat: 38.90, lon: -77.04, total: 2 };
                const g = groundLayout([...europe, overseas]);
                assert(g.lonMin > -10, `Rahmen reicht bis ${g.lonMin.toFixed(1)}`);
                const far = g.toGround(overseas.lat, overseas.lon);
                assert(far.outside && Math.abs(far.x + g.ax) < 1e-9, 'Washington steht am Westrand');
                const graz = g.toGround(47.07, 15.44);
                assert(!graz.outside, 'Graz liegt im Rahmen');
                assert(Math.max(g.ax, g.az) === 1, 'die größere Seite spannt -1 bis 1');
            }
        },
        {
            name: 'projectPoint: von oben liegt Norden oben, von vorn liegt das spätere Jahr oben',
            run() {
                const g = groundLayout([{ lat: 40, lon: 0, total: 1 }, { lat: 60, lon: 20, total: 1 }]);
                const north = g.toGround(60, 10);
                const south = g.toGround(40, 10);
                const top = CAMERAS.oben;
                assert(projectPoint(north.x, north.z, 0, top).y < projectPoint(south.x, south.z, 0, top).y, 'Norden oben');
                const front = CAMERAS.front;
                assert(projectPoint(0, 0, 0.5, front).y < projectPoint(0, 0, -0.5, front).y, 'später oben');
                const east = g.toGround(50, 20);
                const west = g.toGround(50, 0);
                assert(projectPoint(east.x, east.z, 0, front).x > projectPoint(west.x, west.z, 0, front).x, 'Osten rechts');
            }
        },
        {
            name: 'fitBox: der Quader passt in jeder Blickrichtung in die Figur',
            run() {
                const margin = { left: 50, right: 20, top: 20, bottom: 20 };
                for (const view of Object.values(CAMERAS)) {
                    const fit = fitBox(1, 0.7, view, 800, 600, margin);
                    for (const x of [-1, 1]) for (const z of [-0.7, 0.7]) for (const h of [-0.65, 0.65]) {
                        const p = projectPoint(x, z, h, view);
                        const X = fit.screenX + (p.x - fit.cx) * fit.scale;
                        const Y = fit.screenY + (p.y - fit.cy) * fit.scale;
                        assert(X >= margin.left - 1e-6 && X <= 800 - margin.right + 1e-6, `X ${X.toFixed(1)} außerhalb`);
                        assert(Y >= margin.top - 1e-6 && Y <= 600 - margin.bottom + 1e-6, `Y ${Y.toFixed(1)} außerhalb`);
                    }
                }
            }
        }
    ]
};
