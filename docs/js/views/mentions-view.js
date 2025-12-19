// Mentions Flow View - Extracted from explore.js
// Sankey diagram showing person mention relationships

import { escapeHtml } from '../utils.js';
import { elements } from '../dom-cache.js';

// Module state
let selectedMentionsPerson = null;

// External dependencies - injected via init
let getFilteredLetters = null;
let showLetterDetail = null;
let log = { init: () => {}, render: () => {} };

// Constants
const PRIMARY_COLOR = '#A64B3F';

/**
 * Initialize mentions view with external dependencies
 * @param {Object} deps - External dependencies from explore.js
 */
export function initMentionsView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    showLetterDetail = deps.showLetterDetail;
    log = deps.log || { init: () => {}, render: () => {} };

    initMentionsFlowViewInternal();
}

/**
 * Reset selected person (e.g., when data changes)
 */
export function resetMentionsPerson() {
    selectedMentionsPerson = null;
}

/**
 * Initialize the mentions flow view
 */
function initMentionsFlowViewInternal() {
    log.init('Initializing Mentions Flow View');
    initMentionsPersonAutocomplete();
}

/**
 * Initialize autocomplete for person selection
 */
function initMentionsPersonAutocomplete() {
    const input = elements.getById('mentions-person-search');
    const dropdown = elements.getById('mentions-person-dropdown');
    if (!input || !dropdown) return;

    let highlightedIndex = -1;
    let currentResults = [];

    // Build persons list for autocomplete
    function getPersonsWithMentions() {
        const personsMap = new Map();
        const filteredLetters = getFilteredLetters();

        filteredLetters.forEach(letter => {
            // Count how many times each person is mentioned
            const mentions = letter.mentions?.persons || [];
            mentions.forEach(person => {
                const id = person.id || person.name;
                const name = person.name || id;
                if (!personsMap.has(id)) {
                    personsMap.set(id, { id, name, mentionCount: 0 });
                }
                personsMap.get(id).mentionCount++;
            });

            // Also count correspondents who mention others
            const senderId = letter.sender?.id;
            const senderName = letter.sender?.name;
            if (senderId && mentions.length > 0) {
                if (!personsMap.has(senderId)) {
                    personsMap.set(senderId, { id: senderId, name: senderName, mentionCount: 0 });
                }
            }
        });

        // Filter out entries with 0 mentions and sort by count
        return Array.from(personsMap.values())
            .filter(p => p.mentionCount > 0)
            .sort((a, b) => b.mentionCount - a.mentionCount);
    }

    function renderDropdown(results) {
        currentResults = results;
        highlightedIndex = -1;

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="autocomplete-empty">Keine Treffer</div>';
            dropdown.classList.remove('hidden');
            return;
        }

        // Show all results - scrollable dropdown handles large lists
        dropdown.innerHTML = results.map((person, i) => `
            <div class="autocomplete-item" data-index="${i}" data-id="${person.id}">
                <span class="autocomplete-item-name">${escapeHtml(person.name)}</span>
                <span class="autocomplete-item-count">${person.mentionCount}</span>
            </div>
        `).join('');

        dropdown.classList.remove('hidden');
    }

    function selectPerson(person) {
        selectedMentionsPerson = person;
        input.value = person.name;
        dropdown.classList.add('hidden');

        // Update selected person display
        const selectedDisplay = elements.getById('mentions-flow-selected-person');
        if (selectedDisplay) {
            selectedDisplay.innerHTML = `<strong>${escapeHtml(person.name)}</strong> - ${person.mentionCount} Erwaehnungen`;
        }

        // Render the flow for this person
        renderMentionsFlowForPerson(person);
    }

    // Input event - filter as user types
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (query.length < 1) {
            // Show all alphabetically when empty
            const allPersons = getPersonsWithMentions();
            const sorted = allPersons.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            renderDropdown(sorted);
            return;
        }

        const allPersons = getPersonsWithMentions();
        // Split query into words for multi-word search
        const queryWords = query.split(/\s+/);
        const filtered = allPersons.filter(p => {
            const nameLower = p.name.toLowerCase();
            // All query words must be found in the name
            return queryWords.every(word => nameLower.includes(word));
        });

        // Sort filtered results: exact matches first, then by mention count
        filtered.sort((a, b) => {
            const aStartsWith = a.name.toLowerCase().startsWith(query);
            const bStartsWith = b.name.toLowerCase().startsWith(query);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return b.mentionCount - a.mentionCount;
        });

        renderDropdown(filtered);
    });

    // Focus - show all persons alphabetically sorted
    input.addEventListener('focus', () => {
        const allPersons = getPersonsWithMentions();
        // Sort alphabetically by name
        const sorted = allPersons.sort((a, b) => a.name.localeCompare(b.name, 'de'));
        renderDropdown(sorted);
    });

    // Click outside - close dropdown
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (dropdown.classList.contains('hidden')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, currentResults.length - 1);
            updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            updateHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && currentResults[highlightedIndex]) {
                selectPerson(currentResults[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.add('hidden');
        }
    });

    function updateHighlight() {
        dropdown.querySelectorAll('.autocomplete-item').forEach((item, i) => {
            item.classList.toggle('highlighted', i === highlightedIndex);
        });
    }

    // Click on dropdown item
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            if (currentResults[index]) {
                selectPerson(currentResults[index]);
            }
        }
    });
}

/**
 * Create tooltip element for hover effects
 */
function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'mentions-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.background = 'var(--color-background-elevated)';
    tooltip.style.border = '1px solid var(--color-border)';
    tooltip.style.borderRadius = '4px';
    tooltip.style.padding = '8px 12px';
    tooltip.style.fontSize = '13px';
    tooltip.style.lineHeight = '1.5';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '10000';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    document.body.appendChild(tooltip);
    return tooltip;
}

/**
 * Main render function for mentions flow
 */
export function renderMentionsFlow() {
    const placeholder = elements.mentionsFlowPlaceholder;
    const filteredLetters = getFilteredLetters();

    // If no person selected, auto-select the most mentioned person
    if (!selectedMentionsPerson) {
        const personsMap = new Map();
        filteredLetters.forEach(letter => {
            const mentions = letter.mentions?.persons || [];
            mentions.forEach(person => {
                const id = person.id || person.name;
                const name = person.name || id;
                if (!personsMap.has(id)) {
                    personsMap.set(id, { id, name, mentionCount: 0 });
                }
                personsMap.get(id).mentionCount++;
            });
        });

        const sortedPersons = Array.from(personsMap.values())
            .sort((a, b) => b.mentionCount - a.mentionCount);

        if (sortedPersons.length > 0) {
            selectedMentionsPerson = sortedPersons[0];
            // Update input field and ensure dropdown is closed
            const input = elements.getById('mentions-person-search');
            const dropdown = elements.getById('mentions-person-dropdown');
            if (input) {
                input.value = selectedMentionsPerson.name;
            }
            if (dropdown) {
                dropdown.classList.add('hidden');
            }
        }
    }

    if (placeholder) {
        if (!selectedMentionsPerson) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Keine Personen mit Erwahnungen im Datensatz</p>';
        } else {
            renderMentionsFlowForPerson(selectedMentionsPerson);
        }
    }
}

/**
 * Render Sankey diagram for a specific person
 */
function renderMentionsFlowForPerson(person) {
    const container = elements.getById('mentions-flow-graph');
    const placeholder = elements.mentionsFlowPlaceholder;
    const filteredLetters = getFilteredLetters();

    if (!container) return;

    // Clear previous
    container.innerHTML = '';

    // Build data for this specific person
    // Two scenarios:
    // 1. Person is a correspondent (sender) - show who they mention
    // 2. Person is mentioned - show who mentions them

    const mentionedByPerson = [];  // Person mentions these people
    const personMentionedBy = [];  // These people mention the person

    filteredLetters.forEach(letter => {
        const senderId = letter.sender?.id;
        const senderName = letter.sender?.name || 'Unbekannt';
        const mentions = letter.mentions?.persons || [];

        // Check if this person is the sender - show who they mention
        if (senderId === person.id) {
            mentions.forEach(m => {
                const mentionId = m.id || m.name;
                // Skip self-references
                if (mentionId === person.id) return;

                const existingIdx = mentionedByPerson.findIndex(x => x.id === mentionId);
                if (existingIdx >= 0) {
                    mentionedByPerson[existingIdx].count++;
                } else {
                    mentionedByPerson.push({
                        id: mentionId,
                        name: m.name || m.id,
                        count: 1
                    });
                }
            });
        }

        // Check if this person is mentioned in the letter
        const isMentioned = mentions.some(m => (m.id || m.name) === person.id);
        // Skip if sender is the same person (self-reference)
        if (isMentioned && senderId && senderId !== person.id) {
            const existingIdx = personMentionedBy.findIndex(x => x.id === senderId);
            if (existingIdx >= 0) {
                personMentionedBy[existingIdx].count++;
            } else {
                personMentionedBy.push({
                    id: senderId,
                    name: senderName,
                    count: 1
                });
            }
        }
    });

    // Sort by count
    mentionedByPerson.sort((a, b) => b.count - a.count);
    personMentionedBy.sort((a, b) => b.count - a.count);

    if (mentionedByPerson.length === 0 && personMentionedBy.length === 0) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Keine Mentions-Daten fuer diese Person</p>';
        return;
    }

    placeholder.style.display = 'none';

    // Build simple Sankey: Left = who mentions person, Center = person, Right = who person mentions
    const nodes = [];
    const links = [];
    const nodeIndexMap = new Map();

    // Add "mentioned by" nodes on the left
    personMentionedBy.slice(0, 15).forEach(p => {
        const idx = nodes.length;
        nodeIndexMap.set('left-' + p.id, idx);
        nodes.push({ name: p.name, id: p.id, column: 0 });
    });

    // Add central person
    const centerIdx = nodes.length;
    nodeIndexMap.set('center-' + person.id, centerIdx);
    nodes.push({ name: person.name, id: person.id, column: 1, isCenter: true });

    // Add "mentions" nodes on the right
    mentionedByPerson.slice(0, 15).forEach(p => {
        const idx = nodes.length;
        nodeIndexMap.set('right-' + p.id, idx);
        nodes.push({ name: p.name, id: p.id, column: 2 });
    });

    // Create links from left to center
    personMentionedBy.slice(0, 15).forEach(p => {
        links.push({
            source: nodeIndexMap.get('left-' + p.id),
            target: centerIdx,
            value: p.count
        });
    });

    // Create links from center to right
    mentionedByPerson.slice(0, 15).forEach(p => {
        links.push({
            source: centerIdx,
            target: nodeIndexMap.get('right-' + p.id),
            value: p.count
        });
    });

    if (nodes.length < 2 || links.length === 0) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Zu wenig Daten fuer Visualisierung</p>';
        return;
    }

    // Render Sankey with zoom/pan
    const width = container.clientWidth || 900;
    const height = Math.max(400, nodes.length * 30);
    const headerHeight = 40; // Space for column labels

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height + headerHeight)
        .style('cursor', 'grab');

    // Column labels (outside zoom group, always visible)
    const labelGroup = svg.append('g')
        .attr('class', 'column-labels');

    // Determine which columns have data
    const hasLeftColumn = personMentionedBy.length > 0;
    const hasRightColumn = mentionedByPerson.length > 0;

    // Left column: People who mention the selected person (only show if data exists)
    if (hasLeftColumn) {
        labelGroup.append('text')
            .attr('x', 20)
            .attr('y', 20)
            .attr('text-anchor', 'start')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#2c5f8d')
            .text('ERWAEHNT VON');

        labelGroup.append('text')
            .attr('x', 20)
            .attr('y', 32)
            .attr('text-anchor', 'start')
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-light)')
            .text('(diese Absender erwaehnen die Person)');
    }

    // Center: Selected person
    labelGroup.append('text')
        .attr('x', width / 2)
        .attr('y', 26)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', PRIMARY_COLOR)
        .text('PERSON');

    // Right column: People mentioned by the selected person (only show if data exists)
    if (hasRightColumn) {
        labelGroup.append('text')
            .attr('x', width - 20)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('fill', '#f59e0b')
            .text('ERWAEHNT');

        labelGroup.append('text')
            .attr('x', width - 20)
            .attr('y', 32)
            .attr('text-anchor', 'end')
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-light)')
            .text('(von der Person in Briefen erwaehnt)');
    }

    // Zoomable content group
    const g = svg.append('g')
        .attr('transform', `translate(0, ${headerHeight})`);

    // Sankey generator
    const sankeyGenerator = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .extent([[80, 10], [width - 80, height - 10]]);

    const { nodes: layoutNodes, links: layoutLinks } = sankeyGenerator({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    // Gradients
    const defs = svg.append('defs');
    layoutLinks.forEach((link, i) => {
        const gradient = defs.append('linearGradient')
            .attr('id', `person-link-gradient-${i}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', link.source.x1)
            .attr('x2', link.target.x0);

        const sourceColor = link.source.isCenter ? PRIMARY_COLOR : '#2c5f8d';
        const targetColor = link.target.isCenter ? PRIMARY_COLOR : '#f59e0b';

        gradient.append('stop').attr('offset', '0%').attr('stop-color', sourceColor);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', targetColor);
    });

    // Create tooltip
    let tooltip = document.getElementById('sankey-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'sankey-tooltip';
        tooltip.style.cssText = 'position:fixed;display:none;background:#fff;border:2px solid var(--color-border);border-radius:4px;padding:8px 12px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1000;pointer-events:none;max-width:300px;';
        document.body.appendChild(tooltip);
    }

    // Links with hover and click
    const linkGroup = g.append('g');
    const linkPaths = linkGroup.selectAll('path')
        .data(layoutLinks)
        .join('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke', (d, i) => `url(#person-link-gradient-${i})`)
        .attr('stroke-width', d => Math.max(2, d.width))
        .attr('fill', 'none')
        .attr('opacity', 0.6)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 0.9);
            const sourceName = d.source.name;
            const targetName = d.target.name;
            const isLeftToCenter = d.source.column === 0;
            const text = isLeftToCenter
                ? `<strong>${sourceName}</strong> erwaehnt <strong>${targetName}</strong> in ${d.value} Brief(en)`
                : `<strong>${sourceName}</strong> erwaehnt <strong>${targetName}</strong> in ${d.value} Brief(en)`;
            tooltip.innerHTML = text;
            tooltip.style.display = 'block';
        })
        .on('mousemove', function(event) {
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.6);
            tooltip.style.display = 'none';
        })
        .on('click', function(event, d) {
            event.stopPropagation();
            // Show letters where source mentions target
            const senderId = d.source.column === 0 ? d.source.id : (d.source.isCenter ? person.id : null);
            const mentionedId = d.target.column === 2 ? d.target.id : (d.target.isCenter ? person.id : null);
            if (senderId && mentionedId) {
                showMentionLetters(senderId, mentionedId, d.source.name, d.target.name);
            }
        });

    // Nodes with click to navigate
    const node = g.append('g')
        .selectAll('g')
        .data(layoutNodes)
        .join('g')
        .attr('class', d => d.isCenter ? 'sankey-node sankey-node-center' : 'sankey-node sankey-node-clickable')
        .style('cursor', d => d.isCenter ? 'default' : 'pointer')
        .on('click', function(event, d) {
            if (d.isCenter) return; // Don't navigate to self
            event.stopPropagation();
            // Navigate to this person
            const newPerson = { id: d.id, name: d.name, mentionCount: d.value || 0 };
            selectedMentionsPerson = newPerson;
            const input = elements.getById('mentions-person-search');
            if (input) input.value = d.name;
            renderMentionsFlowForPerson(newPerson);
        })
        .on('mouseover', function(event, d) {
            if (d.isCenter) return;
            // Visual hover feedback: brighten rect and underline text
            d3.select(this).select('rect')
                .transition().duration(150)
                .attr('opacity', 0.7)
                .attr('stroke', 'var(--color-text)')
                .attr('stroke-width', 2);
            d3.select(this).select('text')
                .transition().duration(150)
                .style('text-decoration', 'underline')
                .style('fill', 'var(--color-primary)');
            tooltip.innerHTML = `<strong>${d.name}</strong><br>Klicken um zu dieser Person zu wechseln`;
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
        })
        .on('mousemove', function(event) {
            tooltip.style.left = (event.clientX + 10) + 'px';
            tooltip.style.top = (event.clientY - 10) + 'px';
        })
        .on('mouseout', function(event, d) {
            if (d.isCenter) return;
            // Reset visual feedback
            d3.select(this).select('rect')
                .transition().duration(150)
                .attr('opacity', 1)
                .attr('stroke', 'none')
                .attr('stroke-width', 0);
            d3.select(this).select('text')
                .transition().duration(150)
                .style('text-decoration', 'none')
                .style('fill', 'var(--color-text)');
            tooltip.style.display = 'none';
        });

    node.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => Math.max(4, d.y1 - d.y0))
        .attr('width', sankeyGenerator.nodeWidth())
        .attr('fill', d => d.isCenter ? PRIMARY_COLOR : (d.column === 0 ? '#2c5f8d' : '#f59e0b'))
        .attr('rx', 3);

    // Labels
    node.append('text')
        .attr('x', d => d.column === 0 ? d.x0 - 8 : (d.column === 2 ? d.x1 + 8 : d.x0 + 10))
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.column === 0 ? 'end' : 'start')
        .text(d => d.name.length > 25 ? d.name.substring(0, 25) + '...' : d.name)
        .style('font-size', d => d.isCenter ? '14px' : '12px')
        .style('font-weight', d => d.isCenter ? '700' : 'normal')
        .style('fill', 'var(--color-text)')
        .style('pointer-events', 'none');

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
            g.attr('transform', `translate(${event.transform.x}, ${event.transform.y + headerHeight}) scale(${event.transform.k})`);
            svg.style('cursor', event.transform.k > 1 ? 'move' : 'grab');
        });

    svg.call(zoom);

    // Add zoom controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'sankey-zoom-controls';
    controlsDiv.innerHTML = `
        <button class="map-control-btn" id="sankey-zoom-in" title="Vergroessern"><i class="fas fa-plus"></i></button>
        <button class="map-control-btn" id="sankey-zoom-out" title="Verkleinern"><i class="fas fa-minus"></i></button>
        <button class="map-control-btn" id="sankey-zoom-reset" title="Zuruecksetzen"><i class="fas fa-compress-arrows-alt"></i></button>
    `;
    container.style.position = 'relative';
    container.appendChild(controlsDiv);

    // Zoom control handlers
    document.getElementById('sankey-zoom-in')?.addEventListener('click', () => {
        svg.transition().call(zoom.scaleBy, 1.3);
    });
    document.getElementById('sankey-zoom-out')?.addEventListener('click', () => {
        svg.transition().call(zoom.scaleBy, 0.7);
    });
    document.getElementById('sankey-zoom-reset')?.addEventListener('click', () => {
        svg.transition().call(zoom.transform, d3.zoomIdentity);
    });

    log.render(`Rendered person flow: ${layoutNodes.length} nodes, ${layoutLinks.length} links`);
}

/**
 * Show modal with letters where sender mentions mentionedPerson
 */
function showMentionLetters(senderId, mentionedId, senderName, mentionedName) {
    const filteredLetters = getFilteredLetters();

    // Find all letters where sender mentions the person
    const relevantLetters = filteredLetters.filter(letter => {
        const letterSenderId = letter.sender?.id;
        const mentions = letter.mentions?.persons || [];
        const mentionIds = mentions.map(m => m.id || m.name);
        return letterSenderId === senderId && mentionIds.includes(mentionedId);
    });

    if (relevantLetters.length === 0) {
        return;
    }

    // Create modal
    let modal = document.getElementById('mention-letters-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mention-letters-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:700px;max-height:80vh;overflow-y:auto;">
                <div class="modal-header">
                    <h3 id="mention-modal-title"></h3>
                    <button class="modal-close" onclick="document.getElementById('mention-letters-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="mention-modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Populate modal
    document.getElementById('mention-modal-title').textContent =
        `${senderName} erwaehnt ${mentionedName} (${relevantLetters.length} Briefe)`;

    const body = document.getElementById('mention-modal-body');
    body.innerHTML = relevantLetters.slice(0, 50).map(letter => {
        const date = letter.date || 'Datum unbekannt';
        const recipient = letter.recipient?.name || 'Unbekannt';
        const place = letter.place_sent?.name || '';
        return `
            <div style="padding:12px;border-bottom:1px solid var(--color-border-light);cursor:pointer;"
                 onclick="window.openLetterDetail && window.openLetterDetail('${letter.id}')">
                <div style="font-weight:600;color:var(--color-text);">${date}</div>
                <div style="font-size:13px;color:var(--color-text-light);">
                    An: ${recipient}${place ? ' | ' + place : ''}
                </div>
            </div>
        `;
    }).join('');

    if (relevantLetters.length > 50) {
        body.innerHTML += `<div style="padding:12px;color:var(--color-text-light);text-align:center;">... und ${relevantLetters.length - 50} weitere Briefe</div>`;
    }

    modal.style.display = 'flex';
}
