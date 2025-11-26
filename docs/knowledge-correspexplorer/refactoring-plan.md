# Refactoring-Plan: CorrespExplorer

Stand: 2025-11-26

---

## Analyse-Ergebnis

| Datei | Zeilen | Problem |
|-------|--------|---------|
| explore.js | 2418 | Zu gross, duplizierter Code |
| explore.css | 1260 | Wiederholte Patterns |
| style.css | 2015 | Ueberlappung mit explore.css |
| Gesamt JS | 10.922 | Verstreute Logik |
| Gesamt CSS | 9.800 | Duplizierte Komponenten |

---

## Identifizierte Probleme

### JavaScript (explore.js)

1. **Filter-Pattern dreifach dupliziert** (200 Zeilen)
   - applyPersonFilter / applySubjectFilter / applyPlaceFilter
   - clearXFilter / updateXFilterDisplay
   - Gleiche Logik, unterschiedliche Variablen

2. **Render-Funktionen wiederholen sich** (150 Zeilen)
   - renderPersonsList / renderTopicsList / renderPlacesList
   - Alle: Filter -> Sort -> Template -> Handlers

3. **Index-Building redundant** (80 Zeilen)
   - aggregateLettersByPlace / buildSubjectIndex / buildPlacesIndex
   - Gleiche Iteration, aehnliche Aggregation

4. **Detail-Panels dupliziert** (150 Zeilen)
   - showLetterDetail / selectTopic / selectPlace
   - Gleiche Struktur: Header, Sections, Actions

5. **State verstreut** (11 globale Variablen)
   - Keine zentrale Verwaltung
   - Schwer zu debuggen

6. **Konstanten nicht zentralisiert**
   - LANGUAGE_COLORS / LANGUAGE_LABELS inline
   - Magic Values im Code

### CSS

1. **Card-Styles vierfach dupliziert** (200 Zeilen)
   - .person-card / .letter-card / .topic-card / .place-card
   - Identische Basis-Properties

2. **Detail-Panel-Styles dupliziert** (100 Zeilen)
   - .topic-detail-* / .place-detail-*
   - Gleiche Struktur

3. **Mini-Timeline dupliziert** (40 Zeilen)
   - .topic-mini-timeline / .place-mini-timeline

4. **Flexbox-Patterns wiederholt** (300+ Zeilen)
   - display: flex; gap: var(--space-md); 38x verwendet

---

## Refactoring-Phasen

### Phase 1: Basis-Konsolidierung (Prioritaet HOCH)

#### 1.1 CSS: Base-Card-Komponente
```css
/* components.css erweitern */
.card-base {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.card-base:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
}

.card-base.active {
    border-color: var(--color-primary);
    background: rgba(30, 64, 175, 0.05);
}
```

Dann in explore.css:
```css
.person-card { /* nur spezifische Ergaenzungen */ }
.topic-card { /* nur spezifische Ergaenzungen */ }
.place-card { /* nur spezifische Ergaenzungen */ }
```

**Einsparung:** ~150 Zeilen CSS

#### 1.2 JS: Konstanten extrahieren
```javascript
// js/constants.js
export const LANGUAGE_COLORS = {
    'de': '#1e40af',
    'fr': '#dc2626',
    // ...
};

export const LANGUAGE_LABELS = {
    'de': 'Deutsch',
    'fr': 'Franzoesisch',
    // ...
};
```

**Einsparung:** ~30 Zeilen, bessere Wartbarkeit

---

### Phase 2: Filter-Abstraktion (Prioritaet HOCH)

#### 2.1 FilterManager-Modul
```javascript
// js/modules/filter-manager.js
export class FilterManager {
    constructor(allLetters, onFilterChange) {
        this.allLetters = allLetters;
        this.filters = {
            person: null,
            subject: null,
            place: null,
            temporal: null,
            languages: []
        };
        this.onFilterChange = onFilterChange;
    }

    setFilter(type, value) {
        this.filters[type] = value;
        this.applyFilters();
    }

    clearFilter(type) {
        this.filters[type] = null;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = this.allLetters;
        // Alle Filter anwenden
        if (this.filters.person) {
            filtered = filtered.filter(l => /* ... */);
        }
        // ...
        this.onFilterChange(filtered);
    }

    getActiveFilters() {
        return Object.entries(this.filters)
            .filter(([k, v]) => v !== null);
    }
}
```

**Einsparung:** ~200 Zeilen in explore.js

---

### Phase 3: List-Renderer (Prioritaet MITTEL)

#### 3.1 Generischer List-Renderer
```javascript
// js/modules/list-renderer.js
export class ListRenderer {
    constructor(containerId, itemTemplate, config) {
        this.container = document.getElementById(containerId);
        this.template = itemTemplate;
        this.config = config;
    }

    render(items, searchTerm = '', sortOrder = 'default') {
        let filtered = this.applySearch(items, searchTerm);
        let sorted = this.applySort(filtered, sortOrder);

        this.container.innerHTML = sorted
            .map(item => this.template(item))
            .join('');

        this.attachHandlers();
    }

    applySearch(items, term) {
        if (!term) return items;
        return items.filter(item =>
            this.config.searchFields.some(field =>
                item[field]?.toLowerCase().includes(term)
            )
        );
    }

    applySort(items, order) {
        const [field, dir] = order.split('-');
        return [...items].sort((a, b) => {
            const cmp = this.config.sortFn[field](a, b);
            return dir === 'desc' ? -cmp : cmp;
        });
    }
}
```

**Einsparung:** ~150 Zeilen

---

### Phase 4: Detail-Panel (Prioritaet MITTEL)

#### 4.1 Generisches Detail-Panel
```javascript
// js/modules/detail-panel.js
export class DetailPanel {
    constructor(panelId, emptyStateId, contentId) {
        this.panel = document.getElementById(panelId);
        this.emptyState = document.getElementById(emptyStateId);
        this.content = document.getElementById(contentId);
    }

    show(data, sections) {
        this.emptyState.style.display = 'none';
        this.content.style.display = 'block';

        sections.forEach(section => {
            const el = document.getElementById(section.id);
            if (el) el.innerHTML = section.render(data);
        });
    }

    hide() {
        this.emptyState.style.display = 'flex';
        this.content.style.display = 'none';
    }
}
```

**Einsparung:** ~100 Zeilen

---

## Test-Strategie

### Kompakte Test-Suite

```javascript
// js/tests/explore-tests.js

const TestRunner = {
    results: [],

    test(name, fn) {
        try {
            fn();
            this.results.push({ name, passed: true });
        } catch (e) {
            this.results.push({ name, passed: false, error: e.message });
        }
    },

    assert(condition, msg) {
        if (!condition) throw new Error(msg);
    },

    report() {
        const passed = this.results.filter(r => r.passed).length;
        console.log(`Tests: ${passed}/${this.results.length} bestanden`);
        this.results.filter(r => !r.passed).forEach(r =>
            console.error(`FEHLER: ${r.name} - ${r.error}`)
        );
    }
};

// Filter-Tests
TestRunner.test('Filter: Person anwenden', () => {
    const letters = [
        { sender: { name: 'A' } },
        { sender: { name: 'B' } }
    ];
    const filtered = applyPersonFilter(letters, 'A');
    TestRunner.assert(filtered.length === 1, 'Sollte 1 Brief filtern');
});

TestRunner.test('Filter: Zeitraum anwenden', () => {
    const letters = [
        { year: 1900 },
        { year: 1920 },
        { year: 1950 }
    ];
    const filtered = applyTemporalFilter(letters, [1910, 1940]);
    TestRunner.assert(filtered.length === 1, 'Sollte 1 Brief im Zeitraum finden');
});

TestRunner.test('Filter: Sprache anwenden', () => {
    const letters = [
        { language: { code: 'de' } },
        { language: { code: 'fr' } },
        { language: { code: 'de' } }
    ];
    const filtered = applyLanguageFilter(letters, ['de']);
    TestRunner.assert(filtered.length === 2, 'Sollte 2 deutsche Briefe finden');
});

// Aggregation-Tests
TestRunner.test('Aggregation: Orte zaehlen', () => {
    const letters = [
        { place_sent: { geonames_id: '123', name: 'Wien' } },
        { place_sent: { geonames_id: '123', name: 'Wien' } },
        { place_sent: { geonames_id: '456', name: 'Graz' } }
    ];
    const agg = aggregateLettersByPlace(letters, {});
    TestRunner.assert(Object.keys(agg).length === 2, 'Sollte 2 Orte haben');
    TestRunner.assert(agg['123'].letter_count === 2, 'Wien sollte 2 Briefe haben');
});

TestRunner.test('Aggregation: Sprachen zaehlen', () => {
    const letters = [
        { language: { code: 'de' } },
        { language: { code: 'de' } },
        { language: { code: 'fr' } }
    ];
    const counts = countLanguages(letters);
    TestRunner.assert(counts['de'] === 2, 'Deutsch sollte 2 sein');
    TestRunner.assert(counts['fr'] === 1, 'Franzoesisch sollte 1 sein');
});

// Render-Tests
TestRunner.test('Render: HTML-Escaping', () => {
    const input = '<script>alert("xss")</script>';
    const escaped = escapeHtml(input);
    TestRunner.assert(!escaped.includes('<script>'), 'Sollte Script-Tags entfernen');
});

// Index-Tests
TestRunner.test('Index: Themen aufbauen', () => {
    const letters = [
        { mentions: { subjects: [{ uri: 'a', label: 'Thema A' }] } },
        { mentions: { subjects: [{ uri: 'a', label: 'Thema A' }] } },
        { mentions: { subjects: [{ uri: 'b', label: 'Thema B' }] } }
    ];
    const index = buildSubjectIndex(letters);
    TestRunner.assert(Object.keys(index).length === 2, 'Sollte 2 Themen haben');
});

// UI-State-Tests
TestRunner.test('State: View wechseln', () => {
    switchView('timeline');
    TestRunner.assert(currentView === 'timeline', 'View sollte timeline sein');
});

// Alle Tests ausfuehren
TestRunner.report();
```

### Test-Aufruf in Browser-Konsole
```javascript
// In explore.js am Ende:
if (window.location.search.includes('test=true')) {
    import('./tests/explore-tests.js');
}
```

Dann aufrufen mit: `explore.html?test=true`

---

## Implementierungs-Reihenfolge

1. **Woche 1: Basis**
   - [ ] CSS Card-Base erstellen
   - [ ] constants.js extrahieren
   - [ ] Test-Suite aufsetzen

2. **Woche 2: Filter**
   - [ ] FilterManager implementieren
   - [ ] explore.js auf FilterManager umstellen
   - [ ] Tests fuer Filter

3. **Woche 3: Rendering**
   - [ ] ListRenderer implementieren
   - [ ] Views auf ListRenderer umstellen
   - [ ] Tests fuer Rendering

4. **Woche 4: Polish**
   - [ ] DetailPanel abstrahieren
   - [ ] CSS-Utilities hinzufuegen
   - [ ] Finale Tests und Cleanup

---

## Metriken nach Refactoring

| Datei | Vorher | Nachher | Einsparung |
|-------|--------|---------|------------|
| explore.js | 2418 | ~1400 | 42% |
| explore.css | 1260 | ~800 | 37% |
| Neue Module | 0 | ~400 | - |
| **Netto** | 3678 | ~2600 | **29%** |

---

## Risiken und Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Regression | Test-Suite vor jedem Commit |
| Browser-Kompatibilitaet | Keine neuen APIs verwenden |
| Performance | Benchmark vorher/nachher |
| Komplexitaet | Schrittweise Umstellung |

---

## Quick Wins (sofort umsetzbar)

1. LANGUAGE_COLORS/LABELS in constants.js verschieben
2. CSS Card-Base extrahieren
3. Duplizierte escapeHtml() entfernen (bereits in utils.js)
4. Mini-Timeline CSS konsolidieren
