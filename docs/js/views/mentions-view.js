// Mentions Flow View
// Sankey diagram showing person mention relationships

import { escapeHtml, openModal, closeModal, personKey } from '../utils.js';
import { formatDateWithPrecision } from '../formatters.js';
import { elements } from '../dom-cache.js';
import { bindCombobox, readTokens } from './view-support.js';

// Module state
let selectedMentionsPerson = null;

// External dependencies - injected via init
let getFilteredLetters = null;
let showLetterDetail = null;
let log = { init: () => {}, render: () => {} };

// Below this width the side columns get short labels, the full name stays in a <title>
const NARROW_WIDTH = 480;

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

    // Build persons list for autocomplete
    function getPersonsWithMentions() {
        const personsMap = new Map();
        getFilteredLetters().forEach(letter => {
            (letter.mentions?.persons || []).forEach(person => {
                const id = personKey(person);
                if (!id) return;
                if (!personsMap.has(id)) {
                    personsMap.set(id, { id, name: person.name || id, mentionCount: 0 });
                }
                personsMap.get(id).mentionCount++;
            });
        });

        return Array.from(personsMap.values())
            .sort((a, b) => b.mentionCount - a.mentionCount);
    }

    function selectPerson(person) {
        selectedMentionsPerson = person;
        input.value = person.name;

        const selectedDisplay = elements.getById('mentions-flow-selected-person');
        if (selectedDisplay) {
            selectedDisplay.innerHTML = `<strong>${escapeHtml(person.name)}</strong> - ${person.mentionCount} Erwaehnungen`;
        }

        renderMentionsFlowForPerson(person);
    }

    const combobox = bindCombobox(input, dropdown, {
        onSelect: selectPerson,
        count: person => person.mentionCount
    });

    const showAllAlphabetically = () => {
        combobox.show(getPersonsWithMentions().sort((a, b) => a.name.localeCompare(b.name, 'de')));
    };

    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (query.length < 1) {
            showAllAlphabetically();
            return;
        }

        // Every word of the query must occur in the name
        const queryWords = query.split(/\s+/);
        const filtered = getPersonsWithMentions().filter(p => {
            const nameLower = p.name.toLowerCase();
            return queryWords.every(word => nameLower.includes(word));
        });

        // Names starting with the query first, then by mention count
        filtered.sort((a, b) => {
            const aStartsWith = a.name.toLowerCase().startsWith(query);
            const bStartsWith = b.name.toLowerCase().startsWith(query);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return b.mentionCount - a.mentionCount;
        });

        combobox.show(filtered);
    });

    input.addEventListener('focus', showAllAlphabetically);
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
                const id = personKey(person);
                if (!id) return;
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
            placeholder.innerHTML = '<i class="fas fa-info-circle"></i><p>Keine Personen mit Erwaehnungen im Datensatz</p>';
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
                const mentionId = personKey(m);
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
        const isMentioned = mentions.some(m => personKey(m) === person.id);
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
    const narrow = width < NARROW_WIDTH;
    const tokens = readTokens({
        center: '--color-primary',
        sender: '--color-role-sender',
        mentioned: '--color-role-mentioned',
        text: '--color-text',
        textLight: '--color-text-light',
        fontXs: '--font-size-xs',
        fontSm: '--font-size-sm'
    });
    const nodeColor = d => d.isCenter ? tokens.center : (d.column === 0 ? tokens.sender : tokens.mentioned);

    // Side labels sit outside the node columns; reserve their width, so long names are not clipped
    const labelChars = narrow ? 12 : 25;
    const labelMargin = Math.min(Math.round(width * 0.3), labelChars * 7 + 16);
    const shortName = name => name.length > labelChars ? name.substring(0, labelChars - 1) + '…' : name;

    // Determine which columns have data
    const hasLeftColumn = personMentionedBy.length > 0;
    const hasRightColumn = mentionedByPerson.length > 0;

    const summary = `Erwaehnungsfluss fuer ${person.name}: ` +
        `${personMentionedBy.length} Absender erwaehnen die Person, die Person erwaehnt ${mentionedByPerson.length} Personen. ` +
        'Pfeiltasten wechseln den Knoten, Enter wechselt zu dieser Person.';

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height + headerHeight)
        .attr('role', 'group')
        .attr('aria-label', summary)
        .style('cursor', 'grab');

    // Column labels (outside zoom group, always visible)
    const labelGroup = svg.append('g')
        .attr('class', 'column-labels')
        .attr('aria-hidden', 'true');

    // Left column: People who mention the selected person (only show if data exists)
    if (hasLeftColumn) {
        labelGroup.append('text')
            .attr('x', 20)
            .attr('y', 20)
            .attr('text-anchor', 'start')
            .style('font-size', tokens.fontXs)
            .style('font-weight', '600')
            .style('fill', tokens.sender)
            .text('ERWAEHNT VON');

        if (!narrow) {
            labelGroup.append('text')
                .attr('x', 20)
                .attr('y', 34)
                .attr('text-anchor', 'start')
                .style('font-size', tokens.fontXs)
                .style('fill', tokens.textLight)
                .text('(diese Absender erwaehnen die Person)');
        }
    }

    // Center: Selected person
    labelGroup.append('text')
        .attr('x', width / 2)
        .attr('y', 26)
        .attr('text-anchor', 'middle')
        .style('font-size', tokens.fontXs)
        .style('font-weight', '600')
        .style('fill', tokens.center)
        .text('PERSON');

    // Right column: People mentioned by the selected person (only show if data exists)
    if (hasRightColumn) {
        labelGroup.append('text')
            .attr('x', width - 20)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .style('font-size', tokens.fontXs)
            .style('font-weight', '600')
            .style('fill', tokens.mentioned)
            .text('ERWAEHNT');

        if (!narrow) {
            labelGroup.append('text')
                .attr('x', width - 20)
                .attr('y', 34)
                .attr('text-anchor', 'end')
                .style('font-size', tokens.fontXs)
                .style('fill', tokens.textLight)
                .text('(von der Person in Briefen erwaehnt)');
        }
    }

    // Zoomable content group
    const g = svg.append('g')
        .attr('transform', `translate(0, ${headerHeight})`);

    // Sankey generator; a missing side column needs no label margin
    const sankeyGenerator = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .extent([[hasLeftColumn ? labelMargin : 20, 10], [width - (hasRightColumn ? labelMargin : 20), height - 10]]);

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

        const sourceColor = nodeColor(link.source);
        const targetColor = nodeColor(link.target);

        gradient.append('stop').attr('offset', '0%').attr('stop-color', sourceColor);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', targetColor);
    });

    // Create tooltip. The look should move to a .sankey-tooltip rule in the CSS; until then the
    // inline declarations use tokens only, so the floating box stays readable
    let tooltip = document.getElementById('sankey-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'sankey-tooltip';
        tooltip.className = 'sankey-tooltip';
        tooltip.setAttribute('aria-hidden', 'true');
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    // Links with hover and click
    const linkGroup = g.append('g').attr('aria-hidden', 'true');
    linkGroup.selectAll('path')
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
            tooltip.innerHTML = `<strong>${escapeHtml(sourceName)}</strong> erwaehnt <strong>${escapeHtml(targetName)}</strong> in ${d.value} Brief(en)`;
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
    const navigateTo = (d) => {
        if (d.isCenter) return; // Don't navigate to self
        const newPerson = { id: d.id, name: d.name, mentionCount: d.value || 0 };
        selectedMentionsPerson = newPerson;
        const input = elements.getById('mentions-person-search');
        if (input) input.value = d.name;
        renderMentionsFlowForPerson(newPerson);
        // The re-render replaced the nodes; keep keyboard users inside the chart
        container.querySelector('.sankey-node[tabindex="0"]')?.focus();
    };

    const node = g.append('g')
        .selectAll('g')
        .data(layoutNodes)
        .join('g')
        .attr('class', d => d.isCenter ? 'sankey-node sankey-node-center' : 'sankey-node sankey-node-clickable')
        .attr('role', d => d.isCenter ? null : 'button')
        .attr('tabindex', d => d.isCenter ? null : -1)
        // A shortened label leads the name so speech input can address the node by what it shows
        .attr('aria-label', d => {
            if (d.isCenter) return null;
            const shown = shortName(d.name);
            const lead = shown === d.name ? d.name : `${shown.replace('…', '')}, ${d.name}`;
            return `${lead}: ${d.value} ${d.column === 0 ? 'Briefe mit Erwaehnung der Person' : 'Erwaehnungen'}`;
        })
        .style('cursor', d => d.isCenter ? 'default' : 'pointer')
        .on('click', function(event, d) {
            if (d.isCenter) return;
            event.stopPropagation();
            navigateTo(d);
        })
        .on('keydown', function(event, d) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                navigateTo(d);
                return;
            }
            // The clickable nodes in layout order, the roving tabindex moves between them
            const stops = node.filter(n => !n.isCenter).nodes();
            const pos = stops.indexOf(this);
            const targets = { ArrowDown: pos + 1, ArrowRight: pos + 1, ArrowUp: pos - 1, ArrowLeft: pos - 1, Home: 0, End: stops.length - 1 };
            if (!(event.key in targets)) return;
            event.preventDefault();
            const next = stops[Math.max(0, Math.min(stops.length - 1, targets[event.key]))];
            this.setAttribute('tabindex', -1);
            next.setAttribute('tabindex', 0);
            next.focus();
        })
        .on('mouseover', function(event, d) {
            if (d.isCenter) return;
            // Visual hover feedback: brighten rect and underline text
            d3.select(this).select('rect')
                .transition().duration(150)
                .attr('opacity', 0.7)
                .attr('stroke', tokens.text)
                .attr('stroke-width', 2);
            d3.select(this).select('text')
                .transition().duration(150)
                .style('text-decoration', 'underline')
                .style('fill', tokens.center);
            tooltip.innerHTML = `<strong>${escapeHtml(d.name)}</strong><br>Klicken um zu dieser Person zu wechseln`;
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
                .style('fill', tokens.text);
            tooltip.style.display = 'none';
        });

    // One roving tab stop for the side nodes, in the order left column, right column
    const focusable = node.filter(d => !d.isCenter).nodes();
    if (focusable.length > 0) focusable[0].setAttribute('tabindex', 0);

    node.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => Math.max(4, d.y1 - d.y0))
        .attr('width', sankeyGenerator.nodeWidth())
        .attr('fill', nodeColor)
        .attr('rx', 3);

    // Labels; a shortened name keeps the full one in a <title>
    // Without a right column the center node sits at the right edge, so its label goes to the left
    const labelLeft = d => d.column === 0 || (d.isCenter && !hasRightColumn);
    const labels = node.append('text')
        .attr('x', d => labelLeft(d) ? d.x0 - 8 : (d.column === 2 ? d.x1 + 8 : d.x0 + 10))
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => labelLeft(d) ? 'end' : 'start')
        .text(d => d.isCenter ? d.name : shortName(d.name))
        .style('font-size', d => d.isCenter ? tokens.fontSm : tokens.fontXs)
        .style('font-weight', d => d.isCenter ? '700' : 'normal')
        .style('fill', tokens.text)
        .style('pointer-events', 'none');
    labels.filter(d => !d.isCenter && shortName(d.name) !== d.name)
        .append('title')
        .text(d => d.name);

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
        <button class="map-control-btn" id="sankey-zoom-in" title="Vergroessern" aria-label="Vergroessern"><i class="fas fa-plus" aria-hidden="true"></i></button>
        <button class="map-control-btn" id="sankey-zoom-out" title="Verkleinern" aria-label="Verkleinern"><i class="fas fa-minus" aria-hidden="true"></i></button>
        <button class="map-control-btn" id="sankey-zoom-reset" title="Zuruecksetzen" aria-label="Zuruecksetzen"><i class="fas fa-compress-arrows-alt" aria-hidden="true"></i></button>
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
        const mentionIds = (letter.mentions?.persons || []).map(personKey);
        return letterSenderId === senderId && mentionIds.includes(mentionedId);
    });

    if (relevantLetters.length === 0) {
        return;
    }

    // The modal reuses the list classes of the comparison view's common letters dialog
    let modal = document.getElementById('mention-letters-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mention-letters-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content common-letters-modal">
                <div class="modal-header">
                    <h3 id="mention-modal-title"></h3>
                    <button class="modal-close" aria-label="Schliessen">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="common-letters-list" id="mention-modal-body"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            const item = e.target.closest('[data-letter-id]');
            if (item) {
                closeModal(modal);
                showLetterDetail(item.dataset.letterId);
            }
        });
    }

    document.getElementById('mention-modal-title').textContent =
        `${senderName} erwaehnt ${mentionedName} (${relevantLetters.length} Briefe)`;

    const body = document.getElementById('mention-modal-body');
    body.innerHTML = relevantLetters.slice(0, 50).map(letter => {
        const recipient = letter.recipient?.name || 'Unbekannt';
        const place = letter.place_sent?.name || '';
        return `
            <div class="common-letter-item" role="button" tabindex="0" data-letter-id="${escapeHtml(letter.id)}">
                <span class="common-letter-date">${formatDateWithPrecision(letter)}</span>
                <span class="common-letter-recipient">An: ${escapeHtml(recipient)}</span>
                ${place ? `<span class="common-letter-place">(${escapeHtml(place)})</span>` : ''}
            </div>
        `;
    }).join('');

    if (relevantLetters.length > 50) {
        body.innerHTML += `<p class="common-letters-more">... und ${relevantLetters.length - 50} weitere Briefe</p>`;
    }

    openModal(modal);
}
