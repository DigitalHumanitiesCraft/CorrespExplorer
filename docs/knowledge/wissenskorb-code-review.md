# Wissenskorb - Code Quality Review

Kritische Analyse der Code-Qualität, Dokumentation und Refactoring-Potenzial.

Stand: 05.11.2025

## Code-Qualität Bewertung

### Positiv

1. **Architektur**
   - Saubere Trennung: BasketManager als Singleton
   - Event-basierte Kommunikation (lose Kopplung)
   - Konsistente API über alle Ansichten

2. **Fehlerbehandlung**
   - try-catch in BasketManager.save()
   - Validierung in add()
   - Fallback bei fehlendem Local Storage (könnte verbessert werden)

3. **Logging**
   - Konsistente Console-Logs mit Emojis
   - Gute Debuggability

4. **Naming**
   - Klare, beschreibende Namen
   - Konsistente Conventions

### Negativ

1. **Code-Duplikation**
   - showToast() existiert 3x (wissenskorb.js, stats.js, person.js)
   - updateBasketBadge() Logik ähnlich zu updateBasketButton()
   - Export-Funktionen ähnlich in mehreren Dateien

2. **Magic Numbers**
   - Timeouts: 10, 300, 3000 (ohne Konstanten)
   - Netzwerk-Graph: 0.35, 24, 28 (Radiuswerte)
   - CSS-Werte direkt im JavaScript

3. **Fehlende Dokumentation**
   - Kaum JSDoc-Kommentare
   - Keine Type-Definitionen
   - Funktions-Parameter nicht dokumentiert

4. **Error-Handling**
   - Local Storage Quota-Fehler nur mit alert()
   - Keine graceful degradation bei fehlendem Storage

## Refactoring-Potenzial

### 1. Toast-Notifications zentralisieren

**Problem:** showToast() Funktion existiert 3x identisch

**Lösung:** Zentrale Utility-Datei

```javascript
// docs/js/utils.js
export const Toast = {
    show(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        const icon = document.createElement('i');
        icon.className = this.getIcon(type);
        toast.prepend(icon);

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
};
```

**Impact:** -60 Zeilen Code, bessere Wartbarkeit

### 2. Konstanten definieren

**Problem:** Magic Numbers überall

**Lösung:** Konstanten-Datei

```javascript
// docs/js/basket-constants.js
export const BASKET_CONFIG = {
    STORAGE_KEY: 'herdata_basket',
    VERSION: '1.0',

    ANIMATION: {
        TOAST_SHOW_DELAY: 10,
        TOAST_HIDE_DELAY: 3000,
        TOAST_REMOVE_DELAY: 300,
        HIGHLIGHT_DURATION: 600
    },

    NETWORK_GRAPH: {
        CIRCLE_RADIUS: 0.35,
        NODE_SIZE: 20,
        NODE_SIZE_HOVER: 24
    }
};
```

**Impact:** Bessere Wartbarkeit, einfachere Anpassung

### 3. BasketManager Error-Handling verbessern

**Problem:** Nur console.error und alert

**Lösung:** Strukturiertes Error-Handling

```javascript
class BasketError extends Error {
    constructor(message, type = 'general') {
        super(message);
        this.name = 'BasketError';
        this.type = type;
    }
}

// In BasketManager
function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        emit('change');
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            emit('error', new BasketError(
                'Speicherplatz voll. Bitte exportieren und leeren.',
                'quota'
            ));
        } else {
            emit('error', new BasketError(
                'Fehler beim Speichern',
                'storage'
            ));
        }
        throw error;
    }
}

// In UI
BasketManager.on('error', (error) => {
    if (error.type === 'quota') {
        Toast.show(error.message, 'error');
        // Zeige Export-Dialog
    }
});
```

**Impact:** Bessere UX, graceful degradation

### 4. Network-Graph extrahieren

**Problem:** 200+ Zeilen SVG-Rendering in wissenskorb.js

**Lösung:** Eigene Klasse

```javascript
// docs/js/network-graph.js
export class NetworkGraph {
    constructor(container, nodes, edges, options = {}) {
        this.container = container;
        this.nodes = nodes;
        this.edges = edges;
        this.options = {
            width: options.width || container.clientWidth,
            height: options.height || 600,
            nodeRadius: options.nodeRadius || 20,
            ...options
        };
    }

    render() {
        this.createSVG();
        this.renderEdges();
        this.renderNodes();
        this.renderLegend();
    }

    createSVG() { /* ... */ }
    renderEdges() { /* ... */ }
    renderNodes() { /* ... */ }
    renderLegend() { /* ... */ }
}

// Nutzung
const graph = new NetworkGraph(container, nodes, edges);
graph.render();
```

**Impact:** Wiederverwendbar, testbar, übersichtlich

### 5. Type-Safety mit JSDoc

**Problem:** Keine Type-Definitionen

**Lösung:** JSDoc-Kommentare

```javascript
/**
 * @typedef {Object} Person
 * @property {string} id - Unique identifier
 * @property {string} name - Full name
 * @property {Object} dates - Birth and death dates
 * @property {string} dates.birth - Birth year
 * @property {string} dates.death - Death year
 * @property {string} role - Role (sender|mentioned|both|indirect)
 * @property {Array<Object>} occupations - List of occupations
 * @property {Array<Object>} relationships - List of relationships
 */

/**
 * Add a person to the basket
 * @param {Person} person - Person object to add
 * @returns {boolean} True if added, false if already exists
 * @throws {Error} If person is invalid
 */
function add(person) {
    // ...
}
```

**Impact:** Bessere IDE-Unterstützung, weniger Fehler

## Code-Dokumentation

### Ist-Zustand: MANGELHAFT

Nur inline-Kommentare, keine:
- JSDoc-Kommentare
- Funktions-Dokumentation
- Parameter-Beschreibungen
- Return-Value-Dokumentation
- Beispiele

### Soll-Zustand

Jede öffentliche Funktion sollte dokumentiert sein:

```javascript
/**
 * BasketManager - Singleton für globales Wissenskorb-Management
 *
 * Verwaltet eine persistente Sammlung von Personen im Local Storage.
 * Bietet Event-basierte Synchronisation über mehrere Browser-Tabs.
 *
 * @example
 * BasketManager.init();
 * BasketManager.add(person);
 * BasketManager.on('add', (person) => console.log('Added:', person));
 *
 * @see docs/knowledge/wissenskorb-status.md
 */
const BasketManager = (function() {
    /**
     * Storage key for Local Storage
     * @type {string}
     * @private
     */
    const STORAGE_KEY = 'herdata_basket';

    /**
     * Add person to basket
     *
     * Validates the person object and adds it to the basket if not already present.
     * Automatically saves to Local Storage and triggers 'add' and 'change' events.
     *
     * @param {Person} person - Person object with id, name, dates, etc.
     * @returns {boolean} True if added, false if already in basket
     * @throws {Error} If person is invalid (missing id or name)
     *
     * @example
     * const person = { id: '123', name: 'Anna Amalia', ... };
     * if (BasketManager.add(person)) {
     *   console.log('Added successfully');
     * }
     */
    function add(person) {
        // ...
    }
});
```

## Performance-Analyse

### Potenzielle Probleme

1. **Netzwerk-Graph bei vielen Nodes**
   - Circular Layout: O(n)
   - SVG-Rendering: O(n²) wegen Edges
   - Bei 100+ Personen langsam

2. **Batch-Add im Brief-Explorer**
   - Keine Debouncing
   - Synchrone forEach-Schleife
   - Bei 50+ Personen merkbare Verzögerung

3. **Local Storage I/O**
   - Bei jedem add/remove vollständiges JSON.stringify
   - Könnte debounced werden

### Lösungen

```javascript
// Debounced Save
let saveTimeout;
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        actualSave();
    }, 300);
}

// Batch-Add mit Progress
async function addBatch(persons) {
    const total = persons.length;
    let added = 0;

    for (const person of persons) {
        if (!BasketManager.has(person.id)) {
            BasketManager.add(person);
            added++;

            // Update progress every 10 items
            if (added % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                updateProgress(added, total);
            }
        }
    }

    return added;
}
```

## Sicherheit

### Ist-Zustand: OK

- Keine XSS-Anfälligkeiten (kein innerHTML mit User-Input)
- Local Storage ist domain-isoliert
- Keine sensiblen Daten

### Verbesserungen

1. **Input-Sanitization**
   ```javascript
   function sanitizeHtml(text) {
       const div = document.createElement('div');
       div.textContent = text;
       return div.innerHTML;
   }
   ```

2. **Storage-Versionierung**
   - Migration bei Schema-Änderungen
   - Backward-Compatibility

## Testbarkeit

### Ist-Zustand: SCHWIERIG

- Globale Abhängigkeiten (window, localStorage)
- Keine Dependency Injection
- Enge Kopplung an DOM

### Verbesserungen

```javascript
// Testbare Version mit DI
class BasketManager {
    constructor(storage = localStorage, eventBus = new EventEmitter()) {
        this.storage = storage;
        this.eventBus = eventBus;
    }

    add(person) {
        // ...
        this.storage.setItem(this.key, data);
        this.eventBus.emit('add', person);
    }
}

// In Tests
const mockStorage = new Map();
const mockEvents = new EventEmitter();
const basket = new BasketManager(mockStorage, mockEvents);
```

## Priorisierte Refactorings

### Priorität 1: Essentiell

1. **JSDoc-Dokumentation hinzufügen** (1-2 Stunden)
   - Alle öffentlichen Funktionen
   - Type-Definitionen
   - Beispiele

2. **showToast() zentralisieren** (30 Minuten)
   - utils.js erstellen
   - In allen Dateien ersetzen

### Priorität 2: Wichtig

3. **Error-Handling verbessern** (2 Stunden)
   - BasketError-Klasse
   - Graceful degradation
   - UI-Feedback verbessern

4. **Konstanten extrahieren** (1 Stunde)
   - basket-constants.js
   - Magic Numbers entfernen

### Priorität 3: Nice-to-have

5. **NetworkGraph extrahieren** (3 Stunden)
   - Eigene Klasse
   - Wiederverwendbar machen
   - Tests schreiben

6. **Performance-Optimierungen** (2-3 Stunden)
   - Debounced save
   - Batch-add mit Progress
   - Graph-Performance

## Zusammenfassung

### Code-Qualität: 7/10

**Gut:**
- Saubere Architektur
- Konsistente Naming
- Event-basierte Kommunikation

**Verbesserungsbedarf:**
- Dokumentation (3/10)
- Code-Duplikation
- Error-Handling
- Testbarkeit

### Empfehlungen

1. **Sofort:** JSDoc-Dokumentation + Toast zentralisieren (2 Stunden)
2. **Diese Woche:** Error-Handling + Konstanten (3 Stunden)
3. **Nächste Iteration:** NetworkGraph + Performance (5-6 Stunden)

### Fazit

Der Code funktioniert und ist wartbar, aber nicht optimal dokumentiert. Mit 5-6 Stunden Refactoring wäre die Qualität deutlich höher. Priorität sollte auf Dokumentation liegen.
