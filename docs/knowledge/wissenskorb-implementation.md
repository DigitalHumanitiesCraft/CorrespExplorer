# Wissenskorb - Implementierungsplan

Kompakter, priorisierter Plan zur Umsetzung des globalen Wissenskorbs mit Fokus auf MVP.

Stand: 05.11.2025

## Scope Reduction

Fokus auf Kernfunktionalität:
- Local Storage Persistierung
- Globaler Zugang via Navigation
- Dedizierte Seite mit Personenliste
- Eine zentrale Visualisierung: Beziehungsnetzwerk
- Export-Funktionen

Verzicht auf (vorerst):
- Timeline-Visualisierung (existiert bereits in synthesis)
- Geografische Verteilung
- Berufsverteilung
- Teilen-Funktion via URL
- Batch-Operations

## Implementierungsschritte

### Schritt 1: Zentrale Bibliothek

Datei: docs/js/basket-manager.js

```javascript
// Singleton für globales Basket-Management
const BasketManager = {
    storageKey: 'herdata_basket',
    maxItems: 50,
    listeners: {},

    init() {
        this.load();
        window.addEventListener('storage', () => this.handleStorageChange());
    },

    load() {
        const data = localStorage.getItem(this.storageKey);
        this.items = data ? JSON.parse(data) : [];
    },

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        this.emit('change');
    },

    add(person) {
        if (this.has(person.id)) return false;
        if (this.items.length >= this.maxItems) {
            throw new Error('Wissenskorb voll');
        }
        this.items.push({
            ...person,
            addedAt: new Date().toISOString()
        });
        this.save();
        this.emit('add', person);
        return true;
    },

    remove(personId) {
        const index = this.items.findIndex(p => p.id === personId);
        if (index === -1) return false;
        const person = this.items[index];
        this.items.splice(index, 1);
        this.save();
        this.emit('remove', person);
        return true;
    },

    clear() {
        this.items = [];
        this.save();
        this.emit('clear');
    },

    has(personId) {
        return this.items.some(p => p.id === personId);
    },

    getAll() {
        return [...this.items];
    },

    getCount() {
        return this.items.length;
    },

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },

    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => cb(data));
    },

    handleStorageChange() {
        this.load();
        this.emit('sync');
    }
};
```

Aufwand: 2 Stunden

### Schritt 2: Navigation erweitern

Alle Navbar-Dateien anpassen:
- docs/components/navbar.html
- docs/components/navbar-synthesis.html
- docs/components/navbar-stats.html
- docs/components/navbar-map.html

Ergänzung nach nav-brand:

```html
<a href="wissenskorb.html" class="nav-link nav-link-basket" aria-label="Wissenskorb">
    <i class="fas fa-bookmark"></i>
    <span id="nav-basket-badge" class="nav-badge">0</span>
</a>
```

navbar-loader.js erweitern:

```javascript
export async function loadNavbar(variant = 'full') {
    // ... existing code ...

    // Initialize basket after navbar loaded
    setTimeout(() => {
        initDropdown();
        initBasket();
    }, 0);
}

function initBasket() {
    BasketManager.init();
    updateBasketBadge();

    BasketManager.on('change', () => {
        updateBasketBadge();
    });
}

function updateBasketBadge() {
    const badge = document.getElementById('nav-basket-badge');
    if (!badge) return;

    const count = BasketManager.getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}
```

CSS in docs/css/style.css:

```css
.nav-link-basket {
    position: relative;
}

.nav-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--color-accent);
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: bold;
}
```

Aufwand: 2 Stunden

### Schritt 3: Wissenskorb-Seite

Datei: docs/wissenskorb.html

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wissenskorb - HerData</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/search.css">
    <link rel="stylesheet" href="css/basket.css">
</head>
<body>
    <div id="navbar-placeholder"></div>

    <div class="basket-container">
        <header class="basket-header">
            <h1>Wissenskorb</h1>
            <div class="basket-stats">
                <span id="basket-count-display">0 Personen</span>
            </div>
        </header>

        <main class="basket-main">
            <aside class="basket-sidebar">
                <div class="basket-actions">
                    <button id="export-csv" class="btn-export">
                        <i class="fas fa-download"></i> CSV Export
                    </button>
                    <button id="export-json" class="btn-export">
                        <i class="fas fa-download"></i> JSON Export
                    </button>
                    <button id="clear-basket" class="btn-clear">
                        <i class="fas fa-trash"></i> Alle entfernen
                    </button>
                </div>

                <div class="basket-list" id="basket-list">
                    <p class="empty-state">Noch keine Personen im Wissenskorb</p>
                </div>
            </aside>

            <section class="basket-visualization">
                <h2>Beziehungsnetzwerk</h2>
                <div id="network-graph" class="network-container">
                    <p class="empty-state">Füge Personen hinzu um Beziehungen zu sehen</p>
                </div>
            </section>
        </main>
    </div>

    <script type="module" src="js/basket-manager.js"></script>
    <script type="module" src="js/wissenskorb.js"></script>
</body>
</html>
```

Aufwand: 1 Stunde

### Schritt 4: Wissenskorb-Logic

Datei: docs/js/wissenskorb.js

```javascript
import { loadNavbar } from './navbar-loader.js';

let allPersons = [];

async function init() {
    await loadNavbar('full');

    // Load person data
    const response = await fetch('data/persons.json');
    const data = await response.json();
    allPersons = data.persons;

    // Initialize basket
    BasketManager.init();

    // Setup listeners
    BasketManager.on('change', render);

    // Setup buttons
    document.getElementById('export-csv').addEventListener('click', exportCSV);
    document.getElementById('export-json').addEventListener('click', exportJSON);
    document.getElementById('clear-basket').addEventListener('click', clearAll);

    render();
}

function render() {
    renderList();
    renderNetwork();
    updateStats();
}

function renderList() {
    const container = document.getElementById('basket-list');
    const items = BasketManager.getAll();

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-state">Noch keine Personen im Wissenskorb</p>';
        return;
    }

    container.innerHTML = items.map(person => {
        const birth = person.dates?.birth || '?';
        const death = person.dates?.death || '?';
        return `
            <div class="basket-item" data-id="${person.id}">
                <div class="basket-item-info">
                    <a href="person.html?id=${person.id}" class="basket-item-name">${person.name}</a>
                    <div class="basket-item-meta">${birth}-${death}</div>
                    ${person.occupations ? `<div class="basket-item-occupations">${person.occupations.slice(0,2).map(o => o.name).join(', ')}</div>` : ''}
                </div>
                <button class="btn-remove" data-id="${person.id}" title="Entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    // Add remove handlers
    container.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            BasketManager.remove(btn.dataset.id);
        });
    });
}

function renderNetwork() {
    const container = document.getElementById('network-graph');
    const items = BasketManager.getAll();

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-state">Füge Personen hinzu um Beziehungen zu sehen</p>';
        return;
    }

    // Build network data
    const nodes = items.map(p => ({
        id: p.id,
        label: p.name,
        data: p
    }));

    const edges = [];
    const personIds = new Set(items.map(p => p.id));

    items.forEach(person => {
        if (!person.relationships) return;
        person.relationships.forEach(rel => {
            if (personIds.has(rel.target_id)) {
                edges.push({
                    source: person.id,
                    target: rel.target_id,
                    type: rel.type
                });
            }
        });
    });

    if (edges.length === 0) {
        container.innerHTML = '<p class="empty-state">Keine Beziehungen zwischen den Personen im Korb</p>';
        return;
    }

    // Simple force-directed layout
    renderForceGraph(container, nodes, edges);
}

function renderForceGraph(container, nodes, edges) {
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = 600;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    container.appendChild(svg);

    // Simple physics simulation
    const positions = new Map();
    nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.3;
        positions.set(node.id, {
            x: width/2 + Math.cos(angle) * radius,
            y: height/2 + Math.sin(angle) * radius
        });
    });

    // Draw edges
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('class', 'edges');
    svg.appendChild(edgeGroup);

    edges.forEach(edge => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourcePos.x);
        line.setAttribute('y1', sourcePos.y);
        line.setAttribute('x2', targetPos.x);
        line.setAttribute('y2', targetPos.y);
        line.setAttribute('stroke', '#ccc');
        line.setAttribute('stroke-width', '2');

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = edge.type;
        line.appendChild(title);

        edgeGroup.appendChild(line);
    });

    // Draw nodes
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('class', 'nodes');
    svg.appendChild(nodeGroup);

    nodes.forEach(node => {
        const pos = positions.get(node.id);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pos.x);
        circle.setAttribute('cy', pos.y);
        circle.setAttribute('r', '20');
        circle.setAttribute('fill', 'var(--color-primary)');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '2');
        circle.style.cursor = 'pointer';

        circle.addEventListener('click', () => {
            window.location.href = `person.html?id=${node.id}`;
        });

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = node.label;
        circle.appendChild(title);

        nodeGroup.appendChild(circle);

        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', pos.x);
        text.setAttribute('y', pos.y + 35);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#333');
        text.textContent = node.label.split(' ').pop(); // Last name only
        nodeGroup.appendChild(text);
    });
}

function updateStats() {
    const count = BasketManager.getCount();
    document.getElementById('basket-count-display').textContent =
        `${count} ${count === 1 ? 'Person' : 'Personen'}`;
}

function exportCSV() {
    const items = BasketManager.getAll();
    if (items.length === 0) return;

    const headers = ['Name', 'Lebensdaten', 'Rolle', 'GND'];
    let csv = headers.join(',') + '\n';

    items.forEach(p => {
        csv += [
            `"${p.name}"`,
            `"${p.dates?.birth || '?'}-${p.dates?.death || '?'}"`,
            `"${p.role}"`,
            `"${p.gnd || ''}"`
        ].join(',') + '\n';
    });

    download(csv, 'wissenskorb.csv', 'text/csv');
}

function exportJSON() {
    const items = BasketManager.getAll();
    if (items.length === 0) return;

    download(JSON.stringify(items, null, 2), 'wissenskorb.json', 'application/json');
}

function download(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function clearAll() {
    if (!confirm('Alle Personen aus dem Wissenskorb entfernen?')) return;
    BasketManager.clear();
}

document.addEventListener('DOMContentLoaded', init);
```

Aufwand: 4 Stunden

### Schritt 5: Styling

Datei: docs/css/basket.css

```css
.basket-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--spacing-lg);
}

.basket-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 2px solid var(--color-border);
}

.basket-main {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: var(--spacing-lg);
}

.basket-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.basket-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.btn-export, .btn-clear {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    background: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.btn-export:hover {
    background: var(--color-bg-hover);
}

.btn-clear {
    color: var(--color-error);
    border-color: var(--color-error);
}

.btn-clear:hover {
    background: var(--color-error);
    color: white;
}

.basket-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-height: 600px;
    overflow-y: auto;
}

.basket-item {
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: start;
}

.basket-item:hover {
    background: var(--color-bg-hover);
}

.basket-item-info {
    flex: 1;
}

.basket-item-name {
    font-weight: bold;
    color: var(--color-primary);
    text-decoration: none;
}

.basket-item-name:hover {
    text-decoration: underline;
}

.basket-item-meta {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-top: var(--spacing-xs);
}

.basket-item-occupations {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-top: var(--spacing-xs);
}

.btn-remove {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: var(--spacing-xs);
}

.btn-remove:hover {
    color: var(--color-error);
}

.basket-visualization {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: var(--spacing-lg);
}

.network-container {
    min-height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-state {
    color: var(--color-text-muted);
    font-style: italic;
    text-align: center;
}

@media (max-width: 1024px) {
    .basket-main {
        grid-template-columns: 1fr;
    }
}
```

Aufwand: 2 Stunden

### Schritt 6: Integration in synthesis

Datei: docs/synthesis/js/app.js anpassen

Änderungen:
1. state.basket entfernen
2. Alle Basket-Funktionen auf BasketManager umstellen
3. Import hinzufügen

```javascript
// At top
import { loadNavbar } from '../../js/navbar-loader.js';
import '../../js/basket-manager.js';

// In state: remove basket array
const state = {
    allPersons: [],
    filteredPersons: [],
    selectedPerson: null,
    // basket: [],  // REMOVE THIS
    filters: { /* ... */ }
};

// Replace toggleBasket function
function toggleBasket(personId) {
    const person = state.allPersons.find(p => p.id === personId);
    if (!person) return;

    if (BasketManager.has(personId)) {
        BasketManager.remove(personId);
        showToast(`${person.name} aus Wissenskorb entfernt`);
    } else {
        try {
            BasketManager.add(person);
            showToast(`${person.name} zum Wissenskorb hinzugefügt`);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    updateBasketView();
    renderTable();
}

// Update updateBasketView to read from BasketManager
function updateBasketView() {
    const basketItems = BasketManager.getAll();
    const count = basketItems.length;

    document.getElementById('basket-count').textContent = count;
    // ... rest of function, use basketItems instead of state.basket
}

// In formatCell for star button
case 'star':
    const inBasket = BasketManager.has(person.id);
    // ... rest stays same
```

Aufwand: 2 Stunden

### Schritt 7: Integration in andere Ansichten

Optional für später, aber einfach:

In Marker-Popups (index.html):

```javascript
popup.innerHTML = `
    <h3>${person.name}</h3>
    <p>${person.dates?.birth || '?'} - ${person.dates?.death || '?'}</p>
    <button onclick="BasketManager.add(${JSON.stringify(person)})">
        <i class="fas fa-bookmark"></i> Zum Wissenskorb
    </button>
`;
```

Aufwand: 1 Stunde pro Ansicht

## Gesamtaufwand

Kern-Features (Schritte 1-6): ca. 13 Stunden
Integration in andere Ansichten: ca. 3-4 Stunden
Testing und Bugfixes: ca. 3 Stunden

Total: 19-20 Stunden

## Priorität

1. Schritt 1-2: Basis-Infrastruktur (kritisch)
2. Schritt 3-5: Dedizierte Seite (wichtig)
3. Schritt 6: synthesis-Integration (wichtig)
4. Schritt 7: Weitere Integrationen (optional)

## Visualisierung: Wissensgraph

Fokus auf Beziehungsnetzwerk weil:
- Zeigt Verbindungen zwischen gesammelten Personen
- Erkennbar welche Personen zentral sind
- Interaktiv und explorativ
- SVG-basiert, keine schwere Bibliothek nötig
- Erweiterbar mit D3.js für besseres Layout

Vorteile gegenüber Timeline:
- Timeline existiert bereits in synthesis
- Netzwerk zeigt Struktur statt nur Zeitachse
- Mehrwert für comparative analysis
- Unique value proposition

## Start

Beginne mit Schritt 1 und teste sofort im Browser:

```javascript
// In Browser Console
BasketManager.init();
BasketManager.add({ id: '1', name: 'Test Person' });
console.log(BasketManager.getAll());
```
