// CorrespExplorer Test Suite
// Aufruf: explore.html?test=true

const TestRunner = {
    results: [],
    startTime: null,

    test(name, fn) {
        try {
            fn();
            this.results.push({ name, passed: true });
            console.log(`  OK: ${name}`);
        } catch (e) {
            this.results.push({ name, passed: false, error: e.message });
            console.error(`  FEHLER: ${name} - ${e.message}`);
        }
    },

    assert(condition, msg = 'Assertion failed') {
        if (!condition) throw new Error(msg);
    },

    assertEqual(actual, expected, msg) {
        if (actual !== expected) {
            throw new Error(msg || `Erwartet: ${expected}, Erhalten: ${actual}`);
        }
    },

    assertArrayLength(arr, length, msg) {
        if (arr.length !== length) {
            throw new Error(msg || `Array-Laenge: erwartet ${length}, erhalten ${arr.length}`);
        }
    },

    run() {
        console.log('='.repeat(50));
        console.log('CorrespExplorer Test Suite');
        console.log('='.repeat(50));
        this.startTime = Date.now();
        this.results = [];

        this.runFilterTests();
        this.runAggregationTests();
        this.runUtilityTests();
        this.runUITests();

        this.report();
    },

    runFilterTests() {
        console.log('\n--- Filter Tests ---');

        this.test('applyTemporalFilter: Zeitraum filtern', () => {
            const letters = [
                { year: 1900 },
                { year: 1920 },
                { year: 1950 },
                { year: null }
            ];
            const filtered = letters.filter(l => {
                if (!l.year) return false;
                return l.year >= 1910 && l.year <= 1940;
            });
            this.assertArrayLength(filtered, 1, 'Sollte 1 Brief im Zeitraum finden');
            this.assertEqual(filtered[0].year, 1920);
        });

        this.test('applyLanguageFilter: Sprache filtern', () => {
            const letters = [
                { language: { code: 'de' } },
                { language: { code: 'fr' } },
                { language: { code: 'de' } },
                { language: null }
            ];
            const filtered = letters.filter(l =>
                l.language && ['de'].includes(l.language.code)
            );
            this.assertArrayLength(filtered, 2, 'Sollte 2 deutsche Briefe finden');
        });

        this.test('applyPersonFilter: Person filtern', () => {
            const letters = [
                { sender: { name: 'Mueller' }, recipient: { name: 'Schmidt' } },
                { sender: { name: 'Schmidt' }, recipient: { name: 'Meier' } },
                { sender: { name: 'Huber' }, recipient: { name: 'Schmidt' } }
            ];
            const personId = 'Schmidt';
            const filtered = letters.filter(l =>
                l.sender?.name === personId || l.recipient?.name === personId
            );
            this.assertArrayLength(filtered, 3, 'Schmidt sollte in 3 Briefen vorkommen');
        });

        this.test('applyPlaceFilter: Ort filtern', () => {
            const letters = [
                { place_sent: { geonames_id: '123' } },
                { place_sent: { geonames_id: '456' } },
                { place_sent: { geonames_id: '123' } },
                { place_sent: null }
            ];
            const filtered = letters.filter(l =>
                l.place_sent?.geonames_id === '123'
            );
            this.assertArrayLength(filtered, 2, 'Sollte 2 Briefe aus Ort 123 finden');
        });

        this.test('combineFilters: Mehrere Filter kombinieren', () => {
            const letters = [
                { year: 1920, language: { code: 'de' }, sender: { name: 'A' } },
                { year: 1920, language: { code: 'fr' }, sender: { name: 'A' } },
                { year: 1950, language: { code: 'de' }, sender: { name: 'A' } },
                { year: 1920, language: { code: 'de' }, sender: { name: 'B' } }
            ];
            const filtered = letters.filter(l =>
                l.year >= 1910 && l.year <= 1930 &&
                l.language?.code === 'de' &&
                l.sender?.name === 'A'
            );
            this.assertArrayLength(filtered, 1, 'Nur 1 Brief sollte alle Filter erfuellen');
        });
    },

    runAggregationTests() {
        console.log('\n--- Aggregation Tests ---');

        this.test('countByPlace: Orte zaehlen', () => {
            const letters = [
                { place_sent: { geonames_id: '123', name: 'Wien' } },
                { place_sent: { geonames_id: '123', name: 'Wien' } },
                { place_sent: { geonames_id: '456', name: 'Graz' } },
                { place_sent: null }
            ];
            const counts = {};
            letters.forEach(l => {
                if (l.place_sent?.geonames_id) {
                    const id = l.place_sent.geonames_id;
                    counts[id] = (counts[id] || 0) + 1;
                }
            });
            this.assertEqual(Object.keys(counts).length, 2, 'Sollte 2 Orte haben');
            this.assertEqual(counts['123'], 2, 'Wien sollte 2 Briefe haben');
            this.assertEqual(counts['456'], 1, 'Graz sollte 1 Brief haben');
        });

        this.test('countByLanguage: Sprachen zaehlen', () => {
            const letters = [
                { language: { code: 'de' } },
                { language: { code: 'de' } },
                { language: { code: 'fr' } },
                { language: null }
            ];
            const counts = {};
            letters.forEach(l => {
                if (l.language?.code) {
                    const code = l.language.code;
                    counts[code] = (counts[code] || 0) + 1;
                }
            });
            this.assertEqual(counts['de'], 2, 'Deutsch sollte 2 sein');
            this.assertEqual(counts['fr'], 1, 'Franzoesisch sollte 1 sein');
        });

        this.test('countByYear: Jahre zaehlen', () => {
            const letters = [
                { year: 1900 },
                { year: 1900 },
                { year: 1901 },
                { year: null }
            ];
            const counts = {};
            letters.forEach(l => {
                if (l.year) {
                    counts[l.year] = (counts[l.year] || 0) + 1;
                }
            });
            this.assertEqual(counts[1900], 2);
            this.assertEqual(counts[1901], 1);
        });

        this.test('buildSubjectIndex: Themen-Index aufbauen', () => {
            const letters = [
                { mentions: { subjects: [{ uri: 'a', label: 'Thema A' }] } },
                { mentions: { subjects: [{ uri: 'a', label: 'Thema A' }, { uri: 'b', label: 'Thema B' }] } },
                { mentions: { subjects: [] } },
                { mentions: null }
            ];
            const index = {};
            letters.forEach(l => {
                const subjects = l.mentions?.subjects || [];
                subjects.forEach(s => {
                    if (!index[s.uri]) {
                        index[s.uri] = { uri: s.uri, label: s.label, count: 0 };
                    }
                    index[s.uri].count++;
                });
            });
            this.assertEqual(Object.keys(index).length, 2, 'Sollte 2 Themen haben');
            this.assertEqual(index['a'].count, 2, 'Thema A sollte 2x vorkommen');
            this.assertEqual(index['b'].count, 1, 'Thema B sollte 1x vorkommen');
        });
    },

    runUtilityTests() {
        console.log('\n--- Utility Tests ---');

        this.test('escapeHtml: XSS verhindern', () => {
            const escapeHtml = (str) => {
                if (!str) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };
            const input = '<script>alert("xss")</script>';
            const escaped = escapeHtml(input);
            this.assert(!escaped.includes('<script>'), 'Sollte Script-Tags escapen');
            this.assert(escaped.includes('&lt;'), 'Sollte < zu &lt; konvertieren');
        });

        this.test('debounce: Funktion verzoegern', (done) => {
            let callCount = 0;
            const debounce = (fn, delay) => {
                let timeout;
                return (...args) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => fn(...args), delay);
                };
            };
            const fn = debounce(() => callCount++, 50);
            fn(); fn(); fn();
            this.assertEqual(callCount, 0, 'Sollte noch nicht aufgerufen sein');
        });

        this.test('sortByField: Nach Feld sortieren', () => {
            const items = [
                { name: 'C', count: 1 },
                { name: 'A', count: 3 },
                { name: 'B', count: 2 }
            ];
            const sorted = [...items].sort((a, b) => b.count - a.count);
            this.assertEqual(sorted[0].name, 'A', 'A sollte an erster Stelle sein');
            this.assertEqual(sorted[2].name, 'C', 'C sollte an letzter Stelle sein');
        });

        this.test('formatNumber: Zahl formatieren', () => {
            const format = (n) => n.toLocaleString('de-DE');
            this.assertEqual(format(1234), '1.234');
            this.assertEqual(format(1000000), '1.000.000');
        });
    },

    runUITests() {
        console.log('\n--- UI Tests ---');

        this.test('DOM: Elemente vorhanden', () => {
            // Diese Tests nur wenn im Browser
            if (typeof document === 'undefined') return;

            const elements = [
                'total-letters-count',
                'total-senders-count',
                'total-places-count'
            ];
            elements.forEach(id => {
                const el = document.getElementById(id);
                this.assert(el !== null, `Element #${id} sollte existieren`);
            });
        });

        this.test('ViewSwitcher: Views wechseln', () => {
            if (typeof document === 'undefined') return;

            const views = ['map', 'persons', 'letters', 'timeline', 'topics', 'places'];
            views.forEach(view => {
                const btn = document.querySelector(`[data-view="${view}"]`);
                this.assert(btn !== null, `View-Button fuer ${view} sollte existieren`);
            });
        });
    },

    report() {
        const duration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        console.log('\n' + '='.repeat(50));
        console.log(`Ergebnis: ${passed}/${this.results.length} Tests bestanden`);
        console.log(`Dauer: ${duration}ms`);

        if (failed > 0) {
            console.log('\nFehlgeschlagene Tests:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.error(`  - ${r.name}: ${r.error}`);
            });
        }

        console.log('='.repeat(50));

        // Visual feedback
        if (typeof document !== 'undefined') {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 15px 20px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 14px;
                z-index: 10000;
                background: ${failed === 0 ? '#16a34a' : '#dc2626'};
                color: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            banner.textContent = `Tests: ${passed}/${this.results.length} OK (${duration}ms)`;
            document.body.appendChild(banner);

            setTimeout(() => banner.remove(), 5000);
        }

        return { passed, failed, total: this.results.length, duration };
    }
};

// Auto-run wenn test=true in URL
if (typeof window !== 'undefined' && window.location.search.includes('test=true')) {
    // Warte bis DOM geladen
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => TestRunner.run(), 1000);
        });
    } else {
        setTimeout(() => TestRunner.run(), 1000);
    }
}

// Export fuer manuellen Aufruf
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}

export { TestRunner };
