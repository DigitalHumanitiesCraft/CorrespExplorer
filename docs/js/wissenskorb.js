// Wissenskorb Page - Main Logic
// Displays and manages the user's collection of persons

import { loadNavbar } from './navbar-loader.js';

let allPersons = [];

// Initialize page
async function init() {
    console.log('Initializing Wissenskorb page...');

    // Load navbar
    await loadNavbar('full');

    // Load person data for enrichment
    try {
        const response = await fetch('data/persons.json');
        const data = await response.json();
        allPersons = data.persons;
        console.log(`✅ Loaded ${allPersons.length} persons for reference`);
    } catch (error) {
        console.error('❌ Error loading persons data:', error);
    }

    // Setup event listeners
    setupEventListeners();

    // Initial render
    render();

    console.log('✅ Wissenskorb page initialized');
}

// Setup all event listeners
function setupEventListeners() {
    // Basket change listeners
    BasketManager.on('change', render);
    BasketManager.on('add', render);
    BasketManager.on('remove', render);
    BasketManager.on('clear', render);
    BasketManager.on('sync', render);

    // Button listeners
    document.getElementById('export-csv').addEventListener('click', handleExportCSV);
    document.getElementById('export-json').addEventListener('click', handleExportJSON);
    document.getElementById('clear-basket').addEventListener('click', handleClearAll);
}

// Main render function
function render() {
    renderStats();
    renderList();
    renderNetwork();
}

// Render statistics
function renderStats() {
    const count = BasketManager.getCount();
    const countDisplay = document.getElementById('basket-count-display');

    if (countDisplay) {
        countDisplay.textContent = count;
    }
}

// Render person list
function renderList() {
    const container = document.getElementById('basket-list');
    if (!container) return;

    const items = BasketManager.getAll();

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bookmark" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p>Noch keine Personen im Wissenskorb</p>
                <p class="empty-state-hint">
                    Fügen Sie Personen aus der
                    <a href="index.html">Karte</a>,
                    <a href="synthesis/index.html">Personenliste</a> oder dem
                    <a href="stats.html">Brief-Explorer</a> hinzu.
                </p>
            </div>
        `;
        return;
    }

    // Sort by date added (newest first)
    const sorted = [...items].sort((a, b) => {
        const dateA = new Date(a.addedAt);
        const dateB = new Date(b.addedAt);
        return dateB - dateA;
    });

    container.innerHTML = sorted.map(person => {
        const birth = person.dates?.birth || '?';
        const death = person.dates?.death || '?';

        const occupationsHtml = person.occupations && person.occupations.length > 0
            ? `<div class="basket-item-occupations">${person.occupations.slice(0, 2).map(o => o.name).join(', ')}</div>`
            : '';

        const roleLabel = getRoleLabel(person.role);
        const roleClass = person.role || 'unknown';

        return `
            <div class="basket-item" data-id="${person.id}">
                <div class="basket-item-content">
                    <a href="person.html?id=${person.id}" class="basket-item-name" target="_blank">
                        ${person.name}
                        <i class="fas fa-external-link-alt" style="font-size: 0.7rem; margin-left: 0.25rem; opacity: 0.6;"></i>
                    </a>
                    <div class="basket-item-meta">
                        <span class="basket-item-dates">${birth}–${death}</span>
                        <span class="role-badge ${roleClass}">${roleLabel}</span>
                    </div>
                    ${occupationsHtml}
                </div>
                <button class="btn-remove" data-id="${person.id}" title="Aus Wissenskorb entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    // Add remove handlers
    container.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = btn.dataset.id;
            handleRemovePerson(personId);
        });
    });
}

// Render relationship network
function renderNetwork() {
    const container = document.getElementById('network-graph');
    if (!container) return;

    const items = BasketManager.getAll();

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-project-diagram" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p>Fügen Sie Personen hinzu um Beziehungen zu sehen</p>
            </div>
        `;
        return;
    }

    // Build network data - only connections between persons in basket
    const personIds = new Set(items.map(p => p.id));
    const edges = [];

    items.forEach(person => {
        if (!person.relationships || person.relationships.length === 0) return;

        person.relationships.forEach(rel => {
            if (personIds.has(rel.target_id)) {
                edges.push({
                    source: person.id,
                    target: rel.target_id,
                    type: rel.type,
                    sourceName: person.name
                });
            }
        });
    });

    if (edges.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-unlink" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p>Keine Beziehungen zwischen den Personen im Korb</p>
                <p class="empty-state-hint">
                    Fügen Sie weitere Personen hinzu oder wählen Sie Personen mit bekannten Verbindungen.
                </p>
            </div>
        `;
        return;
    }

    // Render force-directed graph
    renderForceGraph(container, items, edges);
}

// Render force-directed graph using SVG
function renderForceGraph(container, nodes, edges) {
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = 600;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.background = '#f8f9fa';
    svg.style.borderRadius = '8px';
    container.appendChild(svg);

    // Simple circular layout for initial positioning
    const positions = new Map();
    nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.35;
        positions.set(node.id, {
            x: width / 2 + Math.cos(angle) * radius,
            y: height / 2 + Math.sin(angle) * radius
        });
    });

    // Create edge group
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('class', 'edges');
    svg.appendChild(edgeGroup);

    // Draw edges
    edges.forEach(edge => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);

        if (!sourcePos || !targetPos) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourcePos.x);
        line.setAttribute('y1', sourcePos.y);
        line.setAttribute('x2', targetPos.x);
        line.setAttribute('y2', targetPos.y);
        line.setAttribute('stroke', '#95a5a6');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-opacity', '0.6');

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${edge.sourceName} → ${edge.type}`;
        line.appendChild(title);

        edgeGroup.appendChild(line);
    });

    // Create node group
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('class', 'nodes');
    svg.appendChild(nodeGroup);

    // Draw nodes
    nodes.forEach(node => {
        const pos = positions.get(node.id);
        if (!pos) return;

        // Outer circle (background)
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', pos.x);
        outerCircle.setAttribute('cy', pos.y);
        outerCircle.setAttribute('r', '24');
        outerCircle.setAttribute('fill', 'white');
        outerCircle.setAttribute('stroke', getRoleColor(node.role));
        outerCircle.setAttribute('stroke-width', '3');
        outerCircle.style.cursor = 'pointer';
        outerCircle.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';

        // Inner circle (colored)
        const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        innerCircle.setAttribute('cx', pos.x);
        innerCircle.setAttribute('cy', pos.y);
        innerCircle.setAttribute('r', '20');
        innerCircle.setAttribute('fill', getRoleColor(node.role));
        innerCircle.setAttribute('fill-opacity', '0.2');
        innerCircle.style.cursor = 'pointer';

        // Hover effect
        const hoverHandler = () => {
            outerCircle.setAttribute('r', '28');
            innerCircle.setAttribute('r', '24');
        };
        const unhoverHandler = () => {
            outerCircle.setAttribute('r', '24');
            innerCircle.setAttribute('r', '20');
        };

        outerCircle.addEventListener('mouseenter', hoverHandler);
        innerCircle.addEventListener('mouseenter', hoverHandler);
        outerCircle.addEventListener('mouseleave', unhoverHandler);
        innerCircle.addEventListener('mouseleave', unhoverHandler);

        // Click handler
        const clickHandler = () => {
            window.open(`person.html?id=${node.id}`, '_blank');
        };
        outerCircle.addEventListener('click', clickHandler);
        innerCircle.addEventListener('click', clickHandler);

        // Title (tooltip)
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        const birth = node.dates?.birth || '?';
        const death = node.dates?.death || '?';
        title.textContent = `${node.name} (${birth}–${death})\nKlicke für Details`;
        outerCircle.appendChild(title);

        nodeGroup.appendChild(outerCircle);
        nodeGroup.appendChild(innerCircle);

        // Label (surname only for space)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', pos.x);
        text.setAttribute('y', pos.y + 40);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', '500');
        text.setAttribute('fill', '#2c3e50');
        text.style.pointerEvents = 'none';

        // Extract surname (last part of name)
        const nameParts = node.name.split(' ');
        const surname = nameParts[nameParts.length - 1];
        text.textContent = surname;

        nodeGroup.appendChild(text);
    });

    // Add legend
    const legendY = height - 80;
    const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    legendGroup.setAttribute('class', 'legend');
    svg.appendChild(legendGroup);

    const roles = [
        { key: 'sender', label: 'Absenderin' },
        { key: 'mentioned', label: 'Erwähnt' },
        { key: 'both', label: 'Beides' },
        { key: 'indirect', label: 'SNDB' }
    ];

    roles.forEach((role, i) => {
        const x = 20 + (i * 120);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', legendY);
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', getRoleColor(role.key));
        legendGroup.appendChild(circle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + 15);
        text.setAttribute('y', legendY + 4);
        text.setAttribute('font-size', '11');
        text.setAttribute('fill', '#7f8c8d');
        text.textContent = role.label;
        legendGroup.appendChild(text);
    });
}

// Get role color
function getRoleColor(role) {
    const colors = {
        'sender': '#3498db',      // Blue
        'mentioned': '#e67e22',   // Orange
        'both': '#9b59b6',        // Purple
        'indirect': '#95a5a6'     // Gray
    };
    return colors[role] || '#95a5a6';
}

// Get role label
function getRoleLabel(role) {
    const labels = {
        'sender': 'Absenderin',
        'mentioned': 'Erwähnt',
        'both': 'Beides',
        'indirect': 'SNDB'
    };
    return labels[role] || role;
}

// Handle remove person
function handleRemovePerson(personId) {
    const person = BasketManager.getById(personId);
    if (!person) return;

    if (confirm(`${person.name} aus dem Wissenskorb entfernen?`)) {
        BasketManager.remove(personId);
        showToast(`${person.name} entfernt`);
    }
}

// Handle export CSV
function handleExportCSV() {
    const csv = BasketManager.exportAsCSV();

    if (!csv) {
        showToast('Wissenskorb ist leer', 'warning');
        return;
    }

    downloadFile(csv, 'wissenskorb.csv', 'text/csv');
    showToast(`${BasketManager.getCount()} Personen als CSV exportiert`);
}

// Handle export JSON
function handleExportJSON() {
    const json = BasketManager.exportAsJSON();

    if (!json) {
        showToast('Wissenskorb ist leer', 'warning');
        return;
    }

    downloadFile(json, 'wissenskorb.json', 'application/json');
    showToast(`${BasketManager.getCount()} Personen als JSON exportiert`);
}

// Handle clear all
function handleClearAll() {
    const count = BasketManager.getCount();

    if (count === 0) {
        showToast('Wissenskorb ist bereits leer', 'info');
        return;
    }

    if (confirm(`Alle ${count} Personen aus dem Wissenskorb entfernen?`)) {
        BasketManager.clear();
        showToast('Wissenskorb geleert');
    }
}

// Download file helper
function downloadFile(content, filename, mimeType) {
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

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' :
                     type === 'warning' ? 'fas fa-exclamation-triangle' :
                     type === 'error' ? 'fas fa-times-circle' :
                     'fas fa-info-circle';
    toast.prepend(icon);

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
