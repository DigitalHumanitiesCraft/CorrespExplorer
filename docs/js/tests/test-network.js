// Test Suite: Ego network
// The pure parts of the correspondence circle of network-view.js: the default centre, the counts
// of the two levels, ties of mentions only from the writer, and a geometry in which distance
// follows the letters, angle follows the first year, the second level moves nothing and names
// do not overlap

import { parseCMIF, DEMO_DATASET_URL } from '../cmif-parser.js';
import { buildEgoNetwork, egoGeometry, egoLayout, mostConnectedPerson, placeEgoLabels } from '../views/network-view.js';
import { personKey, letterRecipients } from '../utils.js';
import { assert } from './test-runner.js';

// Hugo Schuchardt Archiv as bundled. The expected values were counted from the same JSON by a
// separate Python script that shares no code with the app (sender and recipients keyed as
// personKey; partners are the other side of a sender-recipient pair; mentions from the letters the
// centre writes or receives).
const HSA_URL = 'data/hsa-letters.json';
const HSA_CENTRE = '261931943';
const HSA_COUNTS = { correspondence: 1030, mentions: 2486, hollow: 1456 };
const HSA_COUNTS_1900_1905 = { correspondence: 260, mentions: 670, hollow: 410 };

let hsaLetters = null;
async function hsa() {
    if (!hsaLetters) hsaLetters = (await (await fetch(HSA_URL)).json()).letters;
    return hsaLetters;
}

// Wide and phone figure sizes as the view measures them at 1280 x 800 and 360 x 740
const SIZES = [[948, 640], [330, 356]];

export const NetworkTests = {
    name: 'Ego-Netzwerk',

    tests: [
        {
            name: 'HSA: Zentrum ist der Nachlassgeber, die Ebenen zählen wie die unabhängige Zählung',
            async run() {
                const letters = await hsa();
                const centre = mostConnectedPerson(letters);
                assert(centre?.id === HSA_CENTRE, `Zentrum sollte ${HSA_CENTRE} sein, ist ${centre?.id}`);

                const model = buildEgoNetwork(letters, HSA_CENTRE);
                for (const [level, expected] of Object.entries(HSA_COUNTS)) {
                    assert(model.counts[level] === expected, `${level}: ${model.counts[level]} statt ${expected}`);
                }
                assert(model.inner.length === HSA_COUNTS.correspondence, 'Nicht alle Korrespondenzpartner im Bild');
                assert(model.outer.length === model.counts.onlyMentioned, 'Nicht alle nur Erwähnten im Bild');
                const years = letters.filter(l => l.year >= 1900 && l.year <= 1905);
                const narrowed = buildEgoNetwork(years, HSA_CENTRE).counts;
                for (const [level, expected] of Object.entries(HSA_COUNTS_1900_1905)) {
                    assert(narrowed[level] === expected, `1900 bis 1905, ${level}: ${narrowed[level]} statt ${expected}`);
                }
            }
        },

        {
            // A tie of mentions joins the writer of a letter and the person it names; two persons
            // named in the same letter are never joined, which would invent a relation
            name: 'HSA: jede Erwähnung geht vom Schreiber eines Briefs aus, Sehnen nur zwischen Korrespondenten',
            async run() {
                const letters = await hsa();
                const model = buildEgoNetwork(letters, HSA_CENTRE);
                const said = new Set();
                letters.forEach(l => {
                    const parties = [l.sender, ...letterRecipients(l)].map(personKey);
                    if (!parties.includes(HSA_CENTRE)) return;
                    const writer = personKey(l.sender);
                    (l.mentions?.persons || []).forEach(m => said.add(`${writer}>${personKey(m)}`));
                });
                assert(model.mentionLinks.length > 0, 'Das HSA sollte Erwähnungen haben');
                model.mentionLinks.forEach(link => {
                    assert(said.has(`${link.writer}>${link.mentioned}`), `${link.writer} erwähnt ${link.mentioned} in keinem Brief`);
                });
                const partners = new Set(model.inner.map(p => p.id));
                assert(model.chords.every(c => partners.has(c.a) && partners.has(c.b)), 'Eine Sehne führt nicht zwischen zwei Korrespondenten');
                assert(model.outer.every(p => !partners.has(p.id)), 'Ein Korrespondenzpartner steht im Ring der nur Erwähnten');
            }
        },

        {
            name: 'Kreis: Abstand fällt mit den Briefen, Winkel steigt mit dem ersten Jahr, zweite Ebene bewegt nichts',
            async run() {
                const model = buildEgoNetwork(await hsa(), HSA_CENTRE);
                for (const [width, height] of SIZES) {
                    const g = egoGeometry(width, height, { hasOuter: true });
                    const { pos } = egoLayout(model, g);
                    const dist = id => Math.hypot(pos.get(id).x - g.cx, pos.get(id).y - g.cy);
                    const byLetters = [...model.inner].sort((a, b) => a.letters - b.letters);
                    for (let i = 1; i < byLetters.length; i++) {
                        const fewer = byLetters[i - 1];
                        const more = byLetters[i];
                        if (more.letters > fewer.letters) {
                            assert(dist(more.id) <= dist(fewer.id) + 1e-6,
                                `${width}px: ${more.name} (${more.letters} Briefe) steht weiter außen als ${fewer.name} (${fewer.letters})`);
                        }
                    }
                    const dated = model.inner.filter(p => p.first !== null).sort((a, b) => a.first - b.first);
                    for (let i = 1; i < dated.length; i++) {
                        assert(pos.get(dated[i].id).angle >= pos.get(dated[i - 1].id).angle - 1e-9,
                            `${width}px: Winkel von ${dated[i].name} kleiner als der eines früheren Briefwechsels`);
                    }
                    const { pos: alone } = egoLayout({ ...model, outer: [] }, g);
                    for (const p of [model.centre, ...model.inner]) {
                        assert(alone.get(p.id).x === pos.get(p.id).x && alone.get(p.id).y === pos.get(p.id).y,
                            `${width}px: ${p.name} bewegt sich mit der zweiten Ebene`);
                    }
                    pos.forEach((at, id) => {
                        assert(at.x >= 0 && at.x <= width && at.y >= 0 && at.y <= height, `${width}px: ${id} liegt außerhalb der Fläche`);
                    });
                }
            }
        },

        {
            name: 'Kreis: Namen überlappen einander nicht und bleiben in der Fläche',
            async run() {
                const model = buildEgoNetwork(await hsa(), HSA_CENTRE);
                // A fixed width per character stands in for the canvas measure of the view
                const measure = text => text.length * 6.5;
                const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
                for (const [width, height] of SIZES) {
                    const g = egoGeometry(width, height, { hasOuter: true });
                    const { pos } = egoLayout(model, g);
                    const innerPos = new Map([...pos].filter(([, p]) => p.ring !== 'outer'));
                    const inner = placeEgoLabels(model.inner, innerPos, g, measure, { limit: 20, inside: g.bandR0 - 4 });
                    const outer = placeEgoLabels(model.outer, pos, g, measure, {
                        limit: 8, reserved: [...inner.values()].map(l => l.box), outside: g.bandR0 + g.bandRows * g.bandStep + 2
                    });
                    const boxes = [...inner.values(), ...outer.values()].map(l => l.box);
                    assert(inner.size > 0, `${width}px: kein Name gesetzt`);
                    boxes.forEach((b, i) => {
                        assert(b.x0 >= 0 && b.x1 <= width && b.y0 >= 0 && b.y1 <= height, `${width}px: Name außerhalb der Fläche`);
                        boxes.slice(i + 1).forEach(c => assert(!overlaps(b, c), `${width}px: zwei Namen überlappen`));
                    });
                }
            }
        },

        {
            name: 'Tutorial-Datensatz: Zentrum, Korrespondenzpartner und Sehnen zwischen ihnen',
            async run() {
                const { letters } = await parseCMIF(DEMO_DATASET_URL);
                const centre = mostConnectedPerson(letters);
                assert(centre, 'Kein Zentrum gefunden');
                const model = buildEgoNetwork(letters, centre.id);
                assert(model.inner.length > 0, 'Das Zentrum hat keine Korrespondenzpartner');
                assert(model.counts.correspondence === centre.partners, `Korrespondenz ${model.counts.correspondence} gegenüber ${centre.partners} Partnern`);
                const between = letters.filter(l => {
                    const from = personKey(l.sender);
                    return from !== centre.id && letterRecipients(l).some(r => {
                        const to = personKey(r);
                        return to !== centre.id && to !== from && model.inner.some(p => p.id === from) && model.inner.some(p => p.id === to);
                    });
                }).length;
                const counted = model.chords.reduce((sum, c) => sum + c.letters, 0);
                assert(counted === between, `Sehnen zählen ${counted} Briefe, zwischen den Partnern liegen ${between}`);
            }
        }
    ]
};
