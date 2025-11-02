// Network View - AGRELON Relationship Visualization
// Uses force-graph library for 2D network layout

let personsData = null;
let graphData = null;
let graphInstance = null;
let relationshipTypes = new Set();

// Load data and initialize
async function init() {
    try {
        const response = await fetch('data/persons.json');
        personsData = await response.json();

        // Build graph data structure
        graphData = buildGraphData(personsData.persons);

        // Populate filter dropdowns
        populateFilters();

        // Initialize force-graph
        initializeGraph();

        // Set up event listeners
        setupEventListeners();

        console.log(`Network loaded: ${graphData.nodes.length} nodes, ${graphData.links.length} links`);
    } catch (error) {
        console.error('Error loading network data:', error);
    }
}

// Build nodes and links from persons data
function buildGraphData(persons) {
    const nodes = [];
    const links = [];

    // Create nodes for all persons
    persons.forEach(person => {
        nodes.push({
            id: person.id,
            name: person.name,
            gnd_id: person.gnd_id || null,
            letter_count: person.letter_count || 0,
            relationships: person.relationships || [],
            hasRelationships: (person.relationships && person.relationships.length > 0)
        });
    });

    // Create links from relationships
    const processedPairs = new Set();

    persons.forEach(person => {
        if (!person.relationships) return;

        person.relationships.forEach(rel => {
            // Create unique key for this relationship (bidirectional)
            const pairKey = [person.id, rel.target_id].sort().join('-');

            // Only add link once per pair
            if (!processedPairs.has(pairKey)) {
                processedPairs.add(pairKey);

                links.push({
                    source: person.id,
                    target: rel.target_id,
                    type: rel.type,
                    type_id: rel.type_id,
                    reciprocal_type: rel.reciprocal_type
                });

                relationshipTypes.add(rel.type);
            }
        });
    });

    return { nodes, links };
}

// Populate filter dropdowns
function populateFilters() {
    const typeFilter = document.getElementById('relationship-type-filter');

    // Add all relationship types
    const sortedTypes = Array.from(relationshipTypes).sort();
    sortedTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
}

// Initialize force-graph visualization
function initializeGraph() {
    const container = document.getElementById('network-graph');

    graphInstance = ForceGraph()(container)
        .graphData(graphData)
        .nodeId('id')
        .nodeLabel(node => node.name)
        .nodeVal(node => node.hasRelationships ? 8 : 2)
        .nodeColor(node => node.hasRelationships ? '#4a90e2' : '#ccc')
        .nodeCanvasObject((node, ctx, globalScale) => {
            // Draw circle
            const size = node.hasRelationships ? 5 : 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fillStyle = node.hasRelationships ? '#4a90e2' : '#ccc';
            ctx.fill();

            // Draw label for nodes with relationships (if zoomed in enough)
            if (node.hasRelationships && globalScale > 1.5) {
                ctx.font = '3px Sans-Serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#333';
                ctx.fillText(node.name, node.x, node.y + 7);
            }
        })
        .linkWidth(2)
        .linkColor(() => '#999')
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(2)
        .onNodeClick(handleNodeClick)
        .onNodeHover(handleNodeHover)
        .onBackgroundClick(() => {
            hideTooltip();
        })
        .d3Force('charge').strength(-50);

    // Update stats
    updateStats();
}

// Handle node click
function handleNodeClick(node) {
    if (!node) return;

    // Open person detail page
    window.open(`person.html?id=${node.id}`, '_blank');
}

// Handle node hover
function handleNodeHover(node) {
    const tooltip = document.getElementById('network-tooltip');

    if (node) {
        const relCount = node.relationships ? node.relationships.length : 0;

        tooltip.innerHTML = `
            <div class="tooltip-name">${node.name}</div>
            <div class="tooltip-details">
                Beziehungen: ${relCount}<br>
                Briefe: ${node.letter_count}
                ${node.gnd_id ? '<br>GND: ' + node.gnd_id : ''}
            </div>
        `;

        tooltip.classList.add('visible');
    } else {
        hideTooltip();
    }
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.getElementById('network-tooltip');
    tooltip.classList.remove('visible');
}

// Update statistics display
function updateStats() {
    document.getElementById('stat-nodes').textContent = graphData.nodes.length;
    document.getElementById('stat-edges').textContent = graphData.links.length;

    const visibleNodes = graphData.nodes.filter(n => n.hasRelationships).length;
    document.getElementById('stat-visible').textContent = visibleNodes;
}

// Filter graph by relationship type
function filterByRelationshipType(type) {
    if (type === 'all') {
        // Show all links
        graphInstance.graphData(graphData);
    } else {
        // Filter links by type
        const filteredLinks = graphData.links.filter(link =>
            link.type === type || link.reciprocal_type === type
        );

        // Get node IDs that are connected by filtered links
        const connectedNodeIds = new Set();
        filteredLinks.forEach(link => {
            connectedNodeIds.add(link.source.id || link.source);
            connectedNodeIds.add(link.target.id || link.target);
        });

        // Filter nodes to only show connected ones
        const filteredNodes = graphData.nodes.filter(node =>
            connectedNodeIds.has(node.id)
        );

        graphInstance.graphData({ nodes: filteredNodes, links: filteredLinks });

        // Update visible stat
        document.getElementById('stat-visible').textContent = filteredNodes.length;
    }
}

// Search for person by name
function searchByName(query) {
    if (!query || query.length < 2) {
        // Reset highlight
        graphInstance.nodeColor(node => node.hasRelationships ? '#4a90e2' : '#ccc');
        return;
    }

    const lowerQuery = query.toLowerCase();

    // Highlight matching nodes
    graphInstance.nodeColor(node => {
        if (node.name.toLowerCase().includes(lowerQuery)) {
            return '#e74c3c'; // Red for matches
        }
        return node.hasRelationships ? '#4a90e2' : '#ccc';
    });

    // Zoom to first match
    const firstMatch = graphData.nodes.find(node =>
        node.name.toLowerCase().includes(lowerQuery)
    );

    if (firstMatch) {
        graphInstance.centerAt(firstMatch.x, firstMatch.y, 1000);
        graphInstance.zoom(3, 1000);
    }
}

// Reset view to initial state
function resetView() {
    // Reset filters
    document.getElementById('relationship-type-filter').value = 'all';
    document.getElementById('name-search').value = '';

    // Reset graph data
    graphInstance.graphData(graphData);
    graphInstance.nodeColor(node => node.hasRelationships ? '#4a90e2' : '#ccc');

    // Reset zoom
    graphInstance.zoomToFit(400);

    // Update stats
    updateStats();
}

// Set up event listeners
function setupEventListeners() {
    // Relationship type filter
    document.getElementById('relationship-type-filter').addEventListener('change', (e) => {
        filterByRelationshipType(e.target.value);
    });

    // Name search
    const searchInput = document.getElementById('name-search');
    searchInput.addEventListener('input', (e) => {
        searchByName(e.target.value);
    });

    // Reset button
    document.getElementById('reset-view').addEventListener('click', resetView);

    // Update tooltip position on mouse move
    document.addEventListener('mousemove', (e) => {
        const tooltip = document.getElementById('network-tooltip');
        if (tooltip.classList.contains('visible')) {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
