// Wissenskorb Page - Main Logic
// Displays and manages the user's collection of persons

import { loadNavbar } from './navbar-loader.js';
import { Toast, Download } from './utils.js';

let allPersons = [];
let searchQuery = '';
let roleFilters = {
    sender: true,
    mentioned: true,
    both: true,
    indirect: true
};
let relationshipFilters = {
    hasRelationships: true,
    noRelationships: true
};
let networkMode = 'agrelon'; // 'agrelon', 'places', 'occupations'
let filterOnlyConnected = true;

// Initialize page
async function init() {
    // Load navbar
    await loadNavbar('full');

    // Load person data for enrichment
    try {
        const response = await fetch('data/persons.json');
        const data = await response.json();
        allPersons = data.persons;
    } catch (error) {
        console.error('Error loading persons data:', error);
    }

    // Setup event listeners
    setupEventListeners();

    // Initial render
    render();
}

// Setup all event listeners
function setupEventListeners() {
    // Network navigation controls
    setupNetworkControls();

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

    // Search listener
    const searchInput = document.getElementById('basket-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderList();
        });
    }

    // Role filter listeners
    document.querySelectorAll('input[name="role-filter"]').forEach(input => {
        input.addEventListener('change', (e) => {
            roleFilters[e.target.value] = e.target.checked;
            renderList();
            renderNetwork();
        });
    });

    // Relationship filter listeners
    const hasRelsFilter = document.getElementById('filter-has-relationships');
    const noRelsFilter = document.getElementById('filter-no-relationships');

    if (hasRelsFilter) {
        hasRelsFilter.addEventListener('change', (e) => {
            relationshipFilters.hasRelationships = e.target.checked;
            renderList();
            renderNetwork();
        });
    }

    if (noRelsFilter) {
        noRelsFilter.addEventListener('change', (e) => {
            relationshipFilters.noRelationships = e.target.checked;
            renderList();
            renderNetwork();
        });
    }

    // Network mode button listeners
    document.querySelectorAll('.network-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const mode = btn.dataset.mode;

            // Update active state
            document.querySelectorAll('.network-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update network mode
            networkMode = mode;
            renderNetwork();

            Toast.show(`Netzwerk-Modus: ${getNetworkModeLabel(mode)}`, 'info');
        });
    });

    // Only connected filter listener
    const onlyConnectedFilter = document.getElementById('filter-only-connected');
    if (onlyConnectedFilter) {
        onlyConnectedFilter.addEventListener('change', (e) => {
            filterOnlyConnected = e.target.checked;
            renderNetwork();
        });
    }
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
    const items = BasketManager.getAll();

    // Update main count
    const countDisplay = document.getElementById('basket-count-display');
    if (countDisplay) {
        countDisplay.textContent = count;
    }

    // Calculate role statistics
    let senderCount = 0;
    let mentionedCount = 0;
    let relationshipCount = 0;

    items.forEach(person => {
        if (person.role === 'sender' || person.role === 'both') {
            senderCount++;
        }
        if (person.role === 'mentioned' || person.role === 'both') {
            mentionedCount++;
        }
        if (person.relationships && person.relationships.length > 0) {
            relationshipCount += person.relationships.length;
        }
    });

    // Update overview stats
    const statSenders = document.getElementById('stat-senders');
    const statMentioned = document.getElementById('stat-mentioned');
    const statRelationships = document.getElementById('stat-relationships');

    if (statSenders) statSenders.textContent = senderCount;
    if (statMentioned) statMentioned.textContent = mentionedCount;
    if (statRelationships) statRelationships.textContent = relationshipCount;
}

// Render person list
function renderList() {
    const tbody = document.getElementById('basket-table-body');
    const listCount = document.getElementById('list-count');
    if (!tbody) return;

    let items = BasketManager.getAll();
    const totalItems = items.length;

    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" class="empty-state-container">
                    <div class="smart-empty-state">
                        <div class="empty-icon-wrapper">
                            <i class="fas fa-lightbulb"></i>
                        </div>
                        <h3>Ihr Wissenskorb ist noch leer</h3>
                        <p class="empty-subtitle">Der Wissenskorb ist Ihr zentrales Werkzeug für vergleichende Analysen. Starten Sie Ihre Recherche hier:</p>
                        
                        <div class="action-cards">
                            <a href="stats.html" class="action-card">
                                <div class="action-icon"><i class="fas fa-chart-pie"></i></div>
                                <h4>Muster finden</h4>
                                <p>Nutzen Sie den <strong>Brief-Explorer</strong>, um nach Berufsgruppen oder Generationen zu filtern und interessante Cluster zu entdecken.</p>
                                <span class="btn-text">Zu den Statistiken <i class="fas fa-arrow-right"></i></span>
                            </a>
                            
                            <a href="index.html" class="action-card">
                                <div class="action-icon"><i class="fas fa-map-marked-alt"></i></div>
                                <h4>Raum analysieren</h4>
                                <p>Erkunden Sie auf der <strong>Karte</strong> geografische Netzwerke und identifizieren Sie Korrespondenz-Zentren.</p>
                                <span class="btn-text">Zur Karte <i class="fas fa-arrow-right"></i></span>
                            </a>
                            
                            <a href="synthesis.html" class="action-card">
                                <div class="action-icon"><i class="fas fa-list"></i></div>
                                <h4>Gezielt suchen</h4>
                                <p>Nutzen Sie die <strong>Personenliste</strong>, um gezielt nach Namen zu suchen – auch nach Frauen ohne Geodaten.</p>
                                <span class="btn-text">Zur Liste <i class="fas fa-arrow-right"></i></span>
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        if (listCount) listCount.textContent = '(0)';
        return;
    }

    // Apply role filters
    items = items.filter(person => roleFilters[person.role || 'indirect']);

    // Apply relationship filters
    items = items.filter(person => {
        const hasRels = person.relationships && person.relationships.length > 0;
        if (hasRels) return relationshipFilters.hasRelationships;
        return relationshipFilters.noRelationships;
    });

    // Apply search filter
    if (searchQuery) {
        items = items.filter(person => {
            const nameMatch = person.name.toLowerCase().includes(searchQuery);
            const occupationMatch = person.occupations && person.occupations.some(o =>
                o.name.toLowerCase().includes(searchQuery)
            );
            return nameMatch || occupationMatch;
        });
    }

    // Update count
    if (listCount) {
        listCount.textContent = `(${items.length}${items.length !== totalItems ? ` / ${totalItems}` : ''})`;
    }

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" class="empty-state">
                    <i class="fas fa-filter" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>Keine Personen mit aktuellen Filtern</p>
                </td>
            </tr>
        `;
        return;
    }

    // Sort by name (alphabetically)
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = sorted.map(person => {
        const birth = person.dates?.birth || '?';
        const death = person.dates?.death || '?';

        const occupations = person.occupations && person.occupations.length > 0
            ? person.occupations.slice(0, 2).map(o => o.name).join(', ')
            : '—';

        const relationshipCount = person.relationships ? person.relationships.length : 0;

        const roleLabel = getRoleLabel(person.role);
        const roleClass = person.role || 'indirect';

        return `
            <tr data-id="${person.id}">
                <td>
                    <a href="person.html?id=${person.id}" class="person-name-link" target="_blank">
                        ${person.name}
                        <i class="fas fa-external-link-alt" style="font-size: 0.7rem; margin-left: 0.25rem; opacity: 0.6;"></i>
                    </a>
                </td>
                <td>${birth}–${death}</td>
                <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
                <td>${occupations}</td>
                <td>${relationshipCount}</td>
                <td>
                    <button class="btn-remove" data-id="${person.id}" title="Aus Korb entfernen">
                        Entfernen
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Add remove listeners
    tbody.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            BasketManager.remove(id);
            Toast.show('Person aus Wissenskorb entfernt', 'success');
        });
    });
}

// Global variable to store cytoscape instance
let cy = null;

// Setup network navigation controls
function setupNetworkControls() {
    const zoomInBtn = document.getElementById('network-zoom-in');
    const zoomOutBtn = document.getElementById('network-zoom-out');
    const fitBtn = document.getElementById('network-fit');
    const helpBtn = document.getElementById('network-help');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (cy) {
                cy.zoom(cy.zoom() * 1.2);
                cy.center();
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (cy) {
                cy.zoom(cy.zoom() * 0.8);
                cy.center();
            }
        });
    }

    if (fitBtn) {
        fitBtn.addEventListener('click', () => {
            if (cy) {
                cy.fit(undefined, 50); // 50px padding
            }
        });
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Toggle or create help tooltip
            let tooltip = document.querySelector('.network-help-tooltip');

            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'network-help-tooltip';
                tooltip.innerHTML = `
                    <strong>Navigation</strong>
                    <ul>
                        <li>Ziehen: Netzwerk verschieben</li>
                        <li>Mausrad: Zoomen</li>
                        <li>Knoten klicken: Details</li>
                        <li>Knoten ziehen: Position ändern</li>
                    </ul>
                `;
                document.getElementById('network-controls').appendChild(tooltip);
            }

            tooltip.classList.toggle('active');

            // Close on outside click
            const closeTooltip = (event) => {
                if (!tooltip.contains(event.target) && event.target !== helpBtn) {
                    tooltip.classList.remove('active');
                    document.removeEventListener('click', closeTooltip);
                }
            };

            if (tooltip.classList.contains('active')) {
                setTimeout(() => {
                    document.addEventListener('click', closeTooltip);
                }, 10);
            }
        });
    }
}

// Render relationship network with Cytoscape.js
function renderNetwork() {
    const container = document.getElementById('network-graph');
    const controls = document.getElementById('network-controls');
    const legend = document.getElementById('network-legend');
    if (!container) return;

    const items = BasketManager.getAll();

    if (items.length === 0) {
        // Hide network controls and legend when empty
        if (controls) controls.style.display = 'none';
        if (legend) legend.style.display = 'none';

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-project-diagram" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p>Fügen Sie Personen hinzu um Beziehungen zu sehen</p>
            </div>
        `;
        if (cy) {
            cy.destroy();
            cy = null;
        }
        return;
    }

    // Show network controls and legend when graph is displayed
    if (controls) controls.style.display = 'flex';
    if (legend) legend.style.display = 'flex';

    // Build network data based on mode
    const personIds = new Set(items.map(p => p.id));
    const personMap = new Map(items.map(p => [p.id, p]));
    let relationships = [];

    if (networkMode === 'agrelon') {
        // AGRELON mode - direct relationships
        items.forEach(person => {
            if (!person.relationships || person.relationships.length === 0) return;

            person.relationships.forEach(rel => {
                if (personIds.has(rel.target_id)) {
                    const targetPerson = personMap.get(rel.target_id);
                    relationships.push({
                        source: person,
                        target: targetPerson,
                        type: rel.type
                    });
                }
            });
        });
    } else if (networkMode === 'places') {
        // Places mode - persons connected via central place nodes
        const placeMap = new Map(); // place name -> persons with this place

        items.forEach(person => {
            if (!person.places || person.places.length === 0) return;

            person.places.forEach(place => {
                if (!placeMap.has(place.name)) {
                    placeMap.set(place.name, []);
                }
                placeMap.get(place.name).push(person);
            });
        });

        // Only include places shared by at least 2 persons
        placeMap.forEach((persons, placeName) => {
            if (persons.length >= 2) {
                persons.forEach(person => {
                    relationships.push({
                        source: person,
                        target: {
                            id: `place-${placeName}`,
                            name: placeName,
                            isPlace: true
                        },
                        type: placeName
                    });
                });
            }
        });
    } else if (networkMode === 'occupations') {
        // Occupations mode - persons connected via central occupation nodes
        const occupationMap = new Map(); // occupation name -> persons with this occupation

        items.forEach(person => {
            if (!person.occupations || person.occupations.length === 0) return;

            person.occupations.forEach(occ => {
                if (!occupationMap.has(occ.name)) {
                    occupationMap.set(occ.name, []);
                }
                occupationMap.get(occ.name).push(person);
            });
        });

        // Only include occupations shared by at least 2 persons
        occupationMap.forEach((persons, occName) => {
            if (persons.length >= 2) {
                persons.forEach(person => {
                    relationships.push({
                        source: person,
                        target: { id: `occ-${occName}`, name: occName, isOccupation: true },
                        type: occName
                    });
                });
            }
        });
    }

    // Apply "only connected" filter
    let filteredItems = items;
    if (filterOnlyConnected && relationships.length > 0) {
        const connectedIds = new Set();
        relationships.forEach(rel => {
            connectedIds.add(rel.source.id);
            connectedIds.add(rel.target.id);
        });
        filteredItems = items.filter(p => connectedIds.has(p.id));
    }

    if (relationships.length === 0) {
        const modeLabel = getNetworkModeLabel(networkMode);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-unlink" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p>Keine Verbindungen im Modus: ${modeLabel}</p>
                <p class="empty-state-hint">
                    Fügen Sie weitere Personen hinzu oder wählen Sie einen anderen Modus.
                </p>
            </div>
        `;
        if (cy) {
            cy.destroy();
            cy = null;
        }
        return;
    }

    // Clear container for Cytoscape
    container.innerHTML = '';

    // Build Cytoscape elements
    const elements = [];

    // Calculate connection counts for node sizing
    const connectionCounts = new Map();
    relationships.forEach(rel => {
        connectionCounts.set(rel.source.id, (connectionCounts.get(rel.source.id) || 0) + 1);
        connectionCounts.set(rel.target.id, (connectionCounts.get(rel.target.id) || 0) + 1);
    });

    // Add nodes (only filtered persons)
    filteredItems.forEach(person => {
        const connCount = connectionCounts.get(person.id) || 0;
        const nodeSize = Math.max(30, Math.min(60, 30 + connCount * 5)); // Size based on connections

        elements.push({
            data: {
                id: person.id,
                label: person.name,
                role: person.role || 'indirect',
                connectionCount: connCount,
                size: nodeSize,
                type: 'person'
            }
        });
    });

    // Add occupation nodes in occupations mode
    if (networkMode === 'occupations') {
        const occupationNodes = new Set();
        relationships.forEach(rel => {
            if (rel.target.isOccupation) {
                occupationNodes.add(rel.target.name);
            }
        });

        occupationNodes.forEach(occName => {
            const occConnCount = relationships.filter(r => r.target.name === occName).length;
            const nodeSize = Math.max(40, Math.min(80, 40 + occConnCount * 3));

            elements.push({
                data: {
                    id: `occ-${occName}`,
                    label: occName,
                    role: 'occupation',
                    connectionCount: occConnCount,
                    size: nodeSize,
                    type: 'occupation'
                }
            });
        });
    }

    // Add place nodes in places mode
    if (networkMode === 'places') {
        const placeNodes = new Set();
        relationships.forEach(rel => {
            if (rel.target.isPlace) {
                placeNodes.add(rel.target.name);
            }
        });

        placeNodes.forEach(placeName => {
            const placeConnCount = relationships.filter(r => r.target.name === placeName).length;
            const nodeSize = Math.max(40, Math.min(80, 40 + placeConnCount * 3));

            elements.push({
                data: {
                    id: `place-${placeName}`,
                    label: placeName,
                    role: 'place',
                    connectionCount: placeConnCount,
                    size: nodeSize,
                    type: 'place'
                }
            });
        });
    }

    // Add edges (relationships) - group duplicate edges
    const edgeMap = new Map(); // key: "sourceId-targetId", value: {source, target, count, types}

    relationships.forEach(rel => {
        let targetId = rel.target.id;
        if (rel.target.isOccupation) {
            targetId = `occ-${rel.target.name}`;
        } else if (rel.target.isPlace) {
            targetId = `place-${rel.target.name}`;
        }

        const edgeKey = `${rel.source.id}-${targetId}`;

        if (edgeMap.has(edgeKey)) {
            const existing = edgeMap.get(edgeKey);
            existing.count++;
            existing.types.push(rel.type);
        } else {
            edgeMap.set(edgeKey, {
                source: rel.source.id,
                target: targetId,
                count: 1,
                types: [rel.type]
            });
        }
    });

    // Create edges from grouped data
    let edgeIndex = 0;
    edgeMap.forEach((edge, key) => {
        const width = Math.min(10, 1 + edge.count * 0.5); // Width based on count
        const label = networkMode === 'agrelon' ? edge.types[0] : ''; // Show first type in AGRELON mode

        elements.push({
            data: {
                id: `edge-${edgeIndex++}`,
                source: edge.source,
                target: edge.target,
                label: label,
                width: width,
                count: edge.count,
                types: edge.types
            }
        });
    });

    // Destroy existing cytoscape instance
    if (cy) {
        cy.destroy();
    }

    // Create Cytoscape instance
    cy = cytoscape({
        container: container,
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': 'data(role)',
                    'label': '',
                    'color': '#2c3e50',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 5,
                    'font-size': '10px',
                    'font-weight': '600',
                    'width': 'data(size)',
                    'height': 'data(size)',
                    'border-width': 2,
                    'border-color': '#fff',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px'
                }
            },
            {
                selector: 'node[role="sender"]',
                style: {
                    'background-color': '#3498db'
                }
            },
            {
                selector: 'node[role="mentioned"]',
                style: {
                    'background-color': '#e67e22'
                }
            },
            {
                selector: 'node[role="both"]',
                style: {
                    'background-color': '#9b59b6'
                }
            },
            {
                selector: 'node[role="indirect"]',
                style: {
                    'background-color': '#95a5a6'
                }
            },
            {
                selector: 'node[role="occupation"]',
                style: {
                    'background-color': '#f39c12',
                    'shape': 'round-rectangle',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-weight': 'bold',
                    'color': 'white',
                    'text-outline-color': '#f39c12',
                    'text-outline-width': 2,
                    'label': 'data(label)'
                }
            },
            {
                selector: 'node[role="place"]',
                style: {
                    'background-color': '#27ae60',
                    'shape': 'diamond',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-weight': 'bold',
                    'color': 'white',
                    'text-outline-color': '#27ae60',
                    'text-outline-width': 2,
                    'label': 'data(label)'
                }
            },
            {
                selector: 'node.show-label',
                style: {
                    'label': 'data(label)'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 'data(width)',
                    'line-color': '#dfe6e9',
                    'target-arrow-color': '#dfe6e9',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'label': 'data(label)',
                    'font-size': '8px',
                    'color': '#7f8c8d',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 4,
                    'border-color': '#e74c3c'
                }
            }
        ],
        layout: (networkMode === 'occupations' || networkMode === 'places') ? {
            name: 'cose',
            animate: true,
            animationDuration: 500,
            // Strong gravity pulls everything toward center nodes
            nodeOverlap: 20,
            nodeRepulsion: function(node) {
                // Central nodes repel less (act as gravity wells)
                if (node.data('type') === 'occupation' || node.data('type') === 'place') {
                    return 400000;
                }
                // Persons repel more from each other
                return 8000;
            },
            idealEdgeLength: function(edge) {
                // Shorter edges to central nodes = tighter clustering
                return 50;
            },
            edgeElasticity: function(edge) {
                // Edges to central nodes are very elastic (pull strongly)
                return 200;
            },
            gravity: 80, // Strong gravity toward center
            numIter: 2000,
            initialTemp: 500,
            coolingFactor: 0.99,
            minTemp: 1.0
        } : {
            name: 'cose',
            animate: true,
            animationDuration: 500,
            nodeRepulsion: 8000,
            idealEdgeLength: 100,
            edgeElasticity: 100,
            nestingFactor: 1.2,
            gravity: 1,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
        },
        minZoom: 0.5,
        maxZoom: 2
    });

    // Add tooltips and interactions
    cy.on('tap', 'node', function(evt) {
        const node = evt.target;
        const personId = node.data('id');
        window.open(`person.html?id=${personId}`, '_blank');
    });

    cy.on('mouseover', 'node', function(evt) {
        const node = evt.target;
        node.style('cursor', 'pointer');
        node.addClass('show-label');
    });

    cy.on('mouseout', 'node', function(evt) {
        const node = evt.target;
        node.removeClass('show-label');
    });

    // Edge tooltips
    let tooltip = document.getElementById('edge-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'edge-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        tooltip.style.background = 'rgba(44, 62, 80, 0.95)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '0.85rem';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '1000';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        document.body.appendChild(tooltip);
    }

    cy.on('mouseover', 'edge', function(evt) {
        const edge = evt.target;
        const count = edge.data('count');
        const types = edge.data('types');

        let tooltipContent = '';
        if (count > 1) {
            tooltipContent = `<strong>${count} Verbindungen</strong><br>`;
            if (types && types.length > 0) {
                tooltipContent += types.slice(0, 5).join(', ');
                if (types.length > 5) {
                    tooltipContent += ` (+${types.length - 5} weitere)`;
                }
            }
        } else {
            tooltipContent = types && types[0] ? types[0] : 'Verbindung';
        }

        tooltip.innerHTML = tooltipContent;
        tooltip.style.display = 'block';
    });

    cy.on('mouseout', 'edge', function(evt) {
        tooltip.style.display = 'none';
    });

    cy.on('mousemove', 'edge', function(evt) {
        tooltip.style.left = evt.originalEvent.pageX + 10 + 'px';
        tooltip.style.top = evt.originalEvent.pageY + 10 + 'px';
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

// Get network mode label
function getNetworkModeLabel(mode) {
    const labels = {
        'agrelon': 'AGRELON Beziehungen',
        'places': 'Gemeinsame Orte',
        'occupations': 'Gemeinsame Berufe'
    };
    return labels[mode] || mode;
}

// Handle export CSV
function handleExportCSV() {
    const csv = BasketManager.exportAsCSV();

    if (!csv) {
        Toast.show('Wissenskorb ist leer', 'warning');
        return;
    }

    Download.file(csv, 'wissenskorb.csv', 'text/csv');
    Toast.show(`${BasketManager.getCount()} Personen als CSV exportiert`);
}

// Handle export JSON
function handleExportJSON() {
    const json = BasketManager.exportAsJSON();

    if (!json) {
        Toast.show('Wissenskorb ist leer', 'warning');
        return;
    }

    Download.file(json, 'wissenskorb.json', 'application/json');
    Toast.show(`${BasketManager.getCount()} Personen als JSON exportiert`);
}

// Handle clear all
function handleClearAll() {
    const count = BasketManager.getCount();

    if (count === 0) {
        Toast.show('Wissenskorb ist bereits leer', 'info');
        return;
    }

    if (confirm(`Alle ${count} Personen aus dem Wissenskorb entfernen?`)) {
        BasketManager.clear();
        Toast.show('Wissenskorb geleert');
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
