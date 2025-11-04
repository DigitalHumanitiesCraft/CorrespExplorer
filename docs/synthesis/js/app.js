// HerData Synthesis - Main Application

// State management
const state = {
    allPersons: [],
    filteredPersons: [],
    selectedPerson: null,
    basket: [],  // Wissenskorb
    viewMode: 'basis',
    filters: {
        search: '',
        roles: ['sender', 'mentioned', 'both', 'indirect'],
        normierung: ['gnd', 'sndb'],
        birthMin: 1700,
        birthMax: 1850
    },
    sorting: {
        column: 'name',
        direction: 'asc'
    }
};

// View mode configurations
const viewModes = {
    basis: {
        columns: [
            { key: 'name', label: 'Name', sortable: true },
            { key: 'dates', label: 'Lebensdaten', sortable: false },
            { key: 'role', label: 'Rolle', sortable: true },
            { key: 'correspondence_summary', label: 'Korrespondenz', sortable: false }
        ]
    },
    korrespondenz: {
        columns: [
            { key: 'name', label: 'Name', sortable: true },
            { key: 'letter_count', label: 'Briefe gesendet', sortable: true },
            { key: 'mention_count', label: 'Erwähnungen', sortable: true },
            { key: 'letter_years', label: 'Jahre aktiv', sortable: false }
        ]
    },
    biografisch: {
        columns: [
            { key: 'name', label: 'Name', sortable: true },
            { key: 'occupations', label: 'Berufe', sortable: false },
            { key: 'places', label: 'Orte', sortable: false },
            { key: 'gnd', label: 'GND', sortable: false }
        ]
    }
};

// Initialize app
async function init() {
    console.log('Initializing HerData Synthesis...');

    try {
        // Load data
        const response = await fetch('../data/persons.json');
        const data = await response.json();

        state.allPersons = data.persons;
        state.filteredPersons = [...state.allPersons];

        console.log(`Loaded ${state.allPersons.length} persons`);

        // Setup UI
        setupEventListeners();
        updateStatistics();
        renderTable();

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('table-body').innerHTML =
            '<tr><td colspan="4" class="loading">Fehler beim Laden der Daten</td></tr>';
    }
}

// Setup event listeners
function setupEventListeners() {
    // View mode buttons
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.viewMode = e.target.dataset.mode;
            renderTable();
        });
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.toLowerCase();
        applyFilters();
    });

    // Role filters
    document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const roleCheckboxes = document.querySelectorAll('.filter-group input[value="sender"], input[value="mentioned"], input[value="both"], input[value="indirect"]');
            state.filters.roles = Array.from(roleCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            const normCheckboxes = document.querySelectorAll('.filter-group input[value="gnd"], input[value="sndb"]');
            state.filters.normierung = Array.from(normCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            applyFilters();
        });
    });

    // Reset filters
    document.getElementById('reset-filters').addEventListener('click', () => {
        resetFilters();
    });

    // Basket export buttons
    document.getElementById('export-basket-csv').addEventListener('click', () => {
        exportBasketToCSV();
    });

    document.getElementById('export-basket-json').addEventListener('click', () => {
        exportBasketToJSON();
    });

    document.getElementById('clear-basket').addEventListener('click', () => {
        clearBasket();
    });
}

// Apply filters
function applyFilters() {
    state.filteredPersons = state.allPersons.filter(person => {
        // Search filter
        if (state.filters.search && !person.name.toLowerCase().includes(state.filters.search)) {
            return false;
        }

        // Role filter
        if (!state.filters.roles.includes(person.role)) {
            return false;
        }

        // Normierung filter
        if (!state.filters.normierung.includes(person.normierung)) {
            return false;
        }

        // Birth year filter
        if (person.dates && person.dates.birth) {
            const birthYear = parseInt(person.dates.birth);
            if (birthYear < state.filters.birthMin || birthYear > state.filters.birthMax) {
                return false;
            }
        }

        return true;
    });

    updateStatistics();
    renderTable();
}

// Reset filters
function resetFilters() {
    state.filters = {
        search: '',
        roles: ['sender', 'mentioned', 'both', 'indirect'],
        normierung: ['gnd', 'sndb'],
        birthMin: 1700,
        birthMax: 1850
    };

    document.getElementById('search-input').value = '';
    document.querySelectorAll('.filter-group input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });

    applyFilters();
}

// Render table
function renderTable() {
    const mode = viewModes[state.viewMode];
    const thead = document.getElementById('table-headers');
    const tbody = document.getElementById('table-body');

    // Render headers
    thead.innerHTML = mode.columns.map(col =>
        `<th data-column="${col.key}" ${col.sortable ? 'class="sortable"' : ''}>
            ${col.label}
            ${col.sortable && state.sorting.column === col.key ?
                (state.sorting.direction === 'asc' ? ' ▲' : ' ▼') : ''}
        </th>`
    ).join('');

    // Add click handlers for sortable columns
    thead.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            if (state.sorting.column === column) {
                state.sorting.direction = state.sorting.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.sorting.column = column;
                state.sorting.direction = 'asc';
            }
            sortAndRender();
        });
    });

    // Sort data
    const sorted = sortPersons(state.filteredPersons);

    // Render rows
    tbody.innerHTML = sorted.map(person => {
        const inBasket = state.basket.some(p => p.id === person.id);
        const cells = mode.columns.map(col => formatCell(person, col.key)).join('');
        const starButton = `<td style="width: 40px; text-align: center;">
            <button class="btn-add-basket ${inBasket ? 'in-basket' : ''}" data-id="${person.id}" title="Zum Wissenskorb hinzufügen">
                ${inBasket ? '⭐' : '☆'}
            </button>
        </td>`;
        return `<tr data-id="${person.id}" ${state.selectedPerson?.id === person.id ? 'class="selected"' : ''}>
            ${starButton}${cells}
        </tr>`;
    }).join('');

    // Add click handlers for star buttons
    tbody.querySelectorAll('.btn-add-basket').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = btn.dataset.id;
            toggleBasket(personId);
        });
    });

    // Add click handlers for rows
    tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', (e) => {
            // Don't select if clicking on star button
            if (e.target.classList.contains('btn-add-basket')) return;
            const personId = tr.dataset.id;
            selectPerson(personId);
        });
    });

    // Update count
    document.getElementById('table-count').textContent = `${sorted.length} Einträge`;
    document.getElementById('filtered-count').textContent =
        sorted.length !== state.allPersons.length ? `(${sorted.length} gefiltert)` : '';
}

// Format table cell based on column key
function formatCell(person, key) {
    switch(key) {
        case 'name':
            return `<td><strong>${person.name}</strong></td>`;

        case 'dates':
            const birth = person.dates?.birth || '?';
            const death = person.dates?.death || '?';
            const uncertain = (birth === '?' || death === '?');
            return `<td ${uncertain ? 'class="uncertain"' : ''}>${birth}-${death}</td>`;

        case 'role':
            return `<td><span class="role-badge ${person.role}">${getRoleLabel(person.role)}</span></td>`;

        case 'places':
            const place = person.places?.[0]?.name || '-';
            return `<td>${place}</td>`;

        case 'correspondence_summary':
            const sent = person.letter_count || 0;
            const mentions = person.mention_count || 0;
            if (sent === 0 && mentions === 0) {
                return `<td class="muted">keine Korrespondenz</td>`;
            }
            const parts = [];
            if (sent > 0) parts.push(`${sent} Brief${sent > 1 ? 'e' : ''}`);
            if (mentions > 0) parts.push(`${mentions}× erwähnt`);
            return `<td>${parts.join(', ')}</td>`;

        case 'letter_count':
            return `<td>${person.letter_count || 0}</td>`;

        case 'mention_count':
            return `<td>${person.mention_count || 0}</td>`;

        case 'letter_years':
            if (person.letter_years && person.letter_years.length > 0) {
                const min = Math.min(...person.letter_years);
                const max = Math.max(...person.letter_years);
                return `<td>${min}-${max}</td>`;
            }
            return `<td>-</td>`;

        case 'occupations':
            const occs = person.occupations?.map(o => o.name).join(', ') || '-';
            return `<td>${occs}</td>`;

        case 'gnd':
            if (person.gnd) {
                return `<td><a href="https://d-nb.info/gnd/${person.gnd}" target="_blank">${person.gnd}</a></td>`;
            }
            return `<td>-</td>`;

        default:
            return `<td>-</td>`;
    }
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

// Sort persons
function sortPersons(persons) {
    const sorted = [...persons];
    const { column, direction } = state.sorting;

    sorted.sort((a, b) => {
        let aVal, bVal;

        switch(column) {
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
            case 'role':
                aVal = a.role;
                bVal = b.role;
                break;
            case 'letter_count':
                aVal = a.letter_count || 0;
                bVal = b.letter_count || 0;
                break;
            case 'mention_count':
                aVal = a.mention_count || 0;
                bVal = b.mention_count || 0;
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

// Sort and re-render
function sortAndRender() {
    renderTable();
}

// Select person
function selectPerson(personId) {
    state.selectedPerson = state.allPersons.find(p => p.id === personId);

    // Update selected row
    document.querySelectorAll('#table-body tr').forEach(tr => {
        tr.classList.toggle('selected', tr.dataset.id === personId);
    });

    // Switch to person tab and render detail
    switchTab('person');
    renderPersonDetail();
}

// Switch tab
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
}

// Render person detail
function renderPersonDetail() {
    const container = document.getElementById('person-detail');

    if (!state.selectedPerson) {
        container.innerHTML = '<p class="empty-state">Wähle eine Person aus der Tabelle</p>';
        return;
    }

    const p = state.selectedPerson;

    let html = `
        <h2>${p.name}</h2>

        <div class="detail-section">
            <h4>Stammdaten</h4>
            <div class="detail-value">
                <p><strong>Lebensdaten:</strong> ${p.dates?.birth || '?'} - ${p.dates?.death || '?'}</p>
                <p><strong>Rolle:</strong> <span class="role-badge ${p.role}">${getRoleLabel(p.role)}</span></p>
                <p><strong>Normierung:</strong> ${p.normierung.toUpperCase()}</p>
                ${p.gnd ? `<p><strong>GND:</strong> <a href="https://d-nb.info/gnd/${p.gnd}" target="_blank">${p.gnd}</a></p>` : ''}
                <p><strong>SNDB:</strong> <a href="${p.sndb_url}" target="_blank">Link</a></p>
            </div>
        </div>
    `;

    // Occupations
    if (p.occupations && p.occupations.length > 0) {
        html += `
            <div class="detail-section">
                <h4>Berufe</h4>
                <div class="detail-value">
                    <ul>
                        ${p.occupations.map(o => `<li>${o.name}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // Places
    if (p.places && p.places.length > 0) {
        html += `
            <div class="detail-section">
                <h4>Orte</h4>
                <div class="detail-value">
                    <ul>
                        ${p.places.map(pl => `<li>${pl.name} (${pl.type})</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // Correspondence
    if (p.correspondence && p.correspondence.length > 0) {
        const sent = p.correspondence.filter(c => c.type === 'sent').length;
        const mentioned = p.correspondence.filter(c => c.type === 'mentioned').length;

        html += `
            <div class="detail-section">
                <h4>Korrespondenz</h4>
                <div class="detail-value">
                    <p><strong>Briefe gesendet:</strong> ${sent}</p>
                    <p><strong>Erwähnungen:</strong> ${mentioned}</p>
                </div>
            </div>
        `;
    }

    // Relationships
    if (p.relationships && p.relationships.length > 0) {
        html += `
            <div class="detail-section">
                <h4>Beziehungen</h4>
                <div class="detail-value">
                    <ul>
                        ${p.relationships.slice(0, 5).map(rel => {
                            const target = state.allPersons.find(per => per.id === rel.target_id);
                            if (target) {
                                return `<li>${rel.type}: <a href="#" class="person-link" data-id="${target.id}">${target.name}</a></li>`;
                            }
                            return `<li>${rel.type}: Unbekannt</li>`;
                        }).join('')}
                    </ul>
                    ${p.relationships.length > 5 ? `<p><em>... und ${p.relationships.length - 5} weitere</em></p>` : ''}
                </div>
            </div>
        `;
    }

    // Biography
    if (p.biography) {
        // Clean markup from biography
        const cleanBio = p.biography
            .replace(/#s\+/g, '')
            .replace(/#s-/g, '')
            .replace(/#e\+/g, '')
            .replace(/#e-/g, '');

        const isLong = cleanBio.length > 300;
        const displayBio = isLong ? cleanBio.substring(0, 300) + '...' : cleanBio;

        html += `
            <div class="detail-section">
                <h4>Biografie</h4>
                <div class="detail-value">
                    <p id="bio-text-${p.id}">${displayBio}</p>
                    ${isLong ? `<button class="btn-expand" onclick="expandBio('${p.id}', '${cleanBio.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">mehr anzeigen</button>` : ''}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Add click handlers for person links in relationships
    container.querySelectorAll('.person-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.id;
            selectPerson(targetId);
        });
    });
}

// Expand biography function (global for onclick)
window.expandBio = function(personId, fullText) {
    const bioEl = document.getElementById(`bio-text-${personId}`);
    if (bioEl) {
        bioEl.innerHTML = fullText;
        // Remove expand button
        const btn = bioEl.nextElementSibling;
        if (btn && btn.classList.contains('btn-expand')) {
            btn.remove();
        }
    }
};

// Update statistics
function updateStatistics() {
    // Statistics are no longer displayed in a separate tab
    // This function is kept for potential future use
}

// Export to CSV
function exportToCSV() {
    const mode = viewModes[state.viewMode];
    const headers = mode.columns.map(col => col.label);

    let csv = headers.join(',') + '\n';

    state.filteredPersons.forEach(person => {
        const row = mode.columns.map(col => {
            let value = '';
            switch(col.key) {
                case 'name':
                    value = person.name;
                    break;
                case 'dates':
                    value = `${person.dates?.birth || '?'}-${person.dates?.death || '?'}`;
                    break;
                case 'role':
                    value = getRoleLabel(person.role);
                    break;
                case 'places':
                    value = person.places?.[0]?.name || '-';
                    break;
                case 'letter_count':
                    value = person.letter_count || 0;
                    break;
                case 'mention_count':
                    value = person.mention_count || 0;
                    break;
                case 'occupations':
                    value = person.occupations?.map(o => o.name).join('; ') || '-';
                    break;
                case 'gnd':
                    value = person.gnd || '-';
                    break;
                default:
                    value = '-';
            }
            return `"${value}"`;
        });
        csv += row.join(',') + '\n';
    });

    downloadFile(csv, 'herdata-export.csv', 'text/csv');
}

// Export to JSON
function exportToJSON() {
    const json = JSON.stringify(state.filteredPersons, null, 2);
    downloadFile(json, 'herdata-export.json', 'application/json');
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

// Wissenskorb functions
function toggleBasket(personId) {
    const person = state.allPersons.find(p => p.id === personId);
    if (!person) return;

    const index = state.basket.findIndex(p => p.id === personId);

    if (index >= 0) {
        // Remove from basket
        state.basket.splice(index, 1);
    } else {
        // Add to basket
        state.basket.push(person);
    }

    updateBasketView();
    renderTable(); // Re-render to update star buttons
}

function updateBasketView() {
    const count = state.basket.length;
    document.getElementById('basket-count').textContent = count;

    const container = document.getElementById('basket-content');
    const actions = document.getElementById('basket-actions');

    if (count === 0) {
        container.innerHTML = '<p class="empty-state">Noch keine Personen im Korb</p>';
        actions.style.display = 'none';
        return;
    }

    actions.style.display = 'block';

    let html = '<div class="basket-list">';

    state.basket.forEach(person => {
        const birth = person.dates?.birth || '?';
        const death = person.dates?.death || '?';

        html += `
            <div class="basket-item">
                <div class="basket-item-info">
                    <div class="basket-item-name">${person.name}</div>
                    <div class="basket-item-meta">${birth}-${death} • ${getRoleLabel(person.role)}</div>
                </div>
                <button class="btn-basket-remove" data-id="${person.id}" title="Entfernen">×</button>
            </div>
        `;
    });

    html += '</div>';

    // Add mini visualizations
    html += renderBasketVisualizations();

    container.innerHTML = html;

    // Add remove handlers
    container.querySelectorAll('.btn-basket-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBasket(btn.dataset.id);
        });
    });
}

function renderBasketVisualizations() {
    if (state.basket.length === 0) return '';

    let html = '';

    // Timeline visualization (swimlane style)
    const years = state.basket
        .filter(p => p.dates?.birth && p.dates?.death)
        .map(p => ({
            name: p.name,
            birth: parseInt(p.dates.birth),
            death: parseInt(p.dates.death)
        }))
        .sort((a, b) => a.birth - b.birth);

    if (years.length > 0) {
        const minYear = Math.min(...years.map(y => y.birth));
        const maxYear = Math.max(...years.map(y => y.death));
        const span = maxYear - minYear;
        const rowHeight = 24;
        const timelineHeight = years.length * rowHeight;

        html += `
            <div class="basket-viz">
                <h4>Zeitliche Übersicht</h4>
                <div class="timeline-swimlane" style="height: ${timelineHeight}px;">
                    ${years.map((y, index) => {
                        const left = ((y.birth - minYear) / span) * 100;
                        const width = ((y.death - y.birth) / span) * 100;
                        const top = index * rowHeight;
                        return `
                            <div class="timeline-row" style="top: ${top}px;">
                                <div class="timeline-bar" style="left: ${left}%; width: ${width}%;" title="${y.name} (${y.birth}-${y.death})">
                                    <span class="timeline-label">${y.name}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: var(--spacing-xs);">
                    ${minYear} - ${maxYear}
                </div>
            </div>
        `;
    }

    // Relationships
    const withRelations = state.basket.filter(p => p.relationships && p.relationships.length > 0);
    if (withRelations.length > 0) {
        const connections = [];
        withRelations.forEach(person => {
            person.relationships.forEach(rel => {
                const target = state.basket.find(p => p.id === rel.target_id);
                if (target) {
                    connections.push({
                        from: person.name,
                        to: target.name,
                        type: rel.type
                    });
                }
            });
        });

        if (connections.length > 0) {
            html += `
                <div class="basket-viz">
                    <h4>Verbindungen im Korb</h4>
                    <ul style="font-size: 0.85rem; margin: 0; padding-left: var(--spacing-lg);">
                        ${connections.slice(0, 5).map(c => `
                            <li>${c.from} → ${c.to} (${c.type})</li>
                        `).join('')}
                        ${connections.length > 5 ? `<li><em>... und ${connections.length - 5} weitere</em></li>` : ''}
                    </ul>
                </div>
            `;
        }
    }

    return html;
}

function clearBasket() {
    if (!confirm('Wissenskorb wirklich leeren?')) return;
    state.basket = [];
    updateBasketView();
    renderTable();
}

function exportBasketToCSV() {
    if (state.basket.length === 0) {
        alert('Wissenskorb ist leer');
        return;
    }

    const headers = ['Name', 'Lebensdaten', 'Rolle', 'GND', 'Berufe'];
    let csv = headers.join(',') + '\n';

    state.basket.forEach(person => {
        const row = [
            `"${person.name}"`,
            `"${person.dates?.birth || '?'}-${person.dates?.death || '?'}"`,
            `"${getRoleLabel(person.role)}"`,
            `"${person.gnd || '-'}"`,
            `"${person.occupations?.map(o => o.name).join('; ') || '-'}"`
        ];
        csv += row.join(',') + '\n';
    });

    downloadFile(csv, 'wissenskorb.csv', 'text/csv');
}

function exportBasketToJSON() {
    if (state.basket.length === 0) {
        alert('Wissenskorb ist leer');
        return;
    }

    const json = JSON.stringify(state.basket, null, 2);
    downloadFile(json, 'wissenskorb.json', 'application/json');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
