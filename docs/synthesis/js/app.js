// HerData Synthesis - Main Application

// Import navbar loader
import { loadNavbar } from '../../js/navbar-loader.js';

// State management
const state = {
    allPersons: [],
    filteredPersons: [],
    selectedPerson: null,
    basket: [],  // Wissenskorb
    filters: {
        search: '',
        roles: ['sender', 'mentioned', 'both', 'indirect'],
        normierung: ['gnd', 'sndb'],
        timeFilterMode: 'correspondence',  // 'correspondence' or 'lifespan'
        yearMin: 1762,
        yearMax: 1824
    },
    sorting: {
        column: 'name',
        direction: 'asc'
    }
};

// Single comprehensive view configuration
const tableColumns = [
    { key: 'star', label: '', sortable: false, tooltip: '' },
    { key: 'name', label: 'Name', sortable: true, tooltip: 'Klicke zum Sortieren nach Name' },
    { key: 'dates', label: 'Lebensdaten', sortable: false, tooltip: 'Geburts- und Todesjahr' },
    { key: 'role', label: 'Rolle', sortable: true, tooltip: 'Rolle in der Korrespondenz - Klicke zum Sortieren' },
    { key: 'correspondence_compact', label: 'Korrespondenz', sortable: true, tooltip: 'Anzahl gesendeter Briefe (B) und Erwähnungen (E) - Klicke zum Sortieren' },
    { key: 'occupations_compact', label: 'Berufe', sortable: true, tooltip: 'Bekannte Berufe und Tätigkeiten - Klicke zum Sortieren' },
    { key: 'relations_compact', label: 'Beziehungen', sortable: true, tooltip: 'Anzahl dokumentierter Beziehungen - Klicke zum Sortieren' },
    { key: 'biography_preview', label: 'Biografie', sortable: false, tooltip: 'Biografische Kurzinformation' }
];

// Initialize app
async function init() {
    console.log('Initializing HerData Synthesis...');

    // Load navbar
    await loadNavbar('synthesis');

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

    // Initialize noUiSlider for time filter
    const yearRangeSlider = document.getElementById('synthesis-year-range-slider');
    const yearRangeText = document.getElementById('synthesis-year-range-text');

    noUiSlider.create(yearRangeSlider, {
        start: [1762, 1824],
        connect: true,
        step: 1,
        range: {
            'min': 1762,
            'max': 1824
        },
        format: {
            to: value => Math.round(value),
            from: value => Number(value)
        }
    });

    // Time filter mode tabs
    const timeFilterTabs = document.querySelectorAll('.time-filter-tab');
    timeFilterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            state.filters.timeFilterMode = mode;

            // Update active tab
            timeFilterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update slider range based on mode
            if (mode === 'correspondence') {
                yearRangeSlider.noUiSlider.updateOptions({
                    range: { 'min': 1762, 'max': 1824 }
                });
                yearRangeSlider.noUiSlider.set([1762, 1824]);
            } else if (mode === 'lifespan') {
                yearRangeSlider.noUiSlider.updateOptions({
                    range: { 'min': 1700, 'max': 1850 }
                });
                yearRangeSlider.noUiSlider.set([1700, 1850]);
            }

            console.log(`Time filter mode changed to: ${mode}`);
        });
    });

    // Year range slider change listener
    yearRangeSlider.noUiSlider.on('update', (values) => {
        const startYear = parseInt(values[0]);
        const endYear = parseInt(values[1]);

        yearRangeText.textContent = `${startYear} – ${endYear}`;
        state.filters.yearMin = startYear;
        state.filters.yearMax = endYear;

        applyFilters();
    });
}

// Apply filters
function applyFilters() {
    state.filteredPersons = state.allPersons.filter(person => {
        // Search filter - also search in name variants
        if (state.filters.search) {
            const nameMatch = person.name.toLowerCase().includes(state.filters.search);
            const variantMatch = person.name_variants && person.name_variants.some(variant =>
                variant.toLowerCase().includes(state.filters.search)
            );
            if (!nameMatch && !variantMatch) {
                return false;
            }
        }

        // Role filter
        if (!state.filters.roles.includes(person.role)) {
            return false;
        }

        // Normierung filter
        if (!state.filters.normierung.includes(person.normierung)) {
            return false;
        }

        // Time filter (correspondence or lifespan mode)
        if (state.filters.timeFilterMode === 'correspondence') {
            // Filter by letter years
            if (person.letter_years && person.letter_years.length > 0) {
                const hasMatch = person.letter_years.some(year =>
                    year >= state.filters.yearMin && year <= state.filters.yearMax
                );
                if (!hasMatch) return false;
            }
            // If no letter_years, person passes filter (indirect/SNDB entries)
        } else if (state.filters.timeFilterMode === 'lifespan') {
            // Filter by birth/death years
            const birthYear = person.dates?.birth ? parseInt(person.dates.birth) : null;
            const deathYear = person.dates?.death ? parseInt(person.dates.death) : null;

            if (birthYear || deathYear) {
                // Check if lifespan overlaps with filter range
                const personStart = birthYear || state.filters.yearMin;
                const personEnd = deathYear || state.filters.yearMax;
                const overlaps = !(personEnd < state.filters.yearMin || personStart > state.filters.yearMax);
                if (!overlaps) return false;
            }
            // If no dates, person passes filter
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
    const thead = document.getElementById('table-headers');
    const tbody = document.getElementById('table-body');

    // Render headers
    thead.innerHTML = tableColumns.map(col =>
        `<th data-column="${col.key}" ${col.sortable ? 'class="sortable"' : ''} ${col.tooltip ? `data-tooltip="${col.tooltip}"` : ''}>
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
        const cells = tableColumns.map(col => formatCell(person, col.key)).join('');
        return `<tr data-id="${person.id}" ${state.selectedPerson?.id === person.id ? 'class="selected"' : ''}>
            ${cells}
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
}

// Format table cell based on column key
function formatCell(person, key) {
    switch(key) {
        case 'star':
            const inBasket = state.basket.some(p => p.id === person.id);
            return `<td style="width: 40px; text-align: center;">
                <button class="btn-add-basket ${inBasket ? 'in-basket' : ''}" data-id="${person.id}" title="Zum Wissenskorb hinzufügen">
                    ${inBasket ? '⭐' : '☆'}
                </button>
            </td>`;

        case 'name':
            let nameHtml = `<strong>${person.name}</strong>`;
            // Show matched variant if searching and variant matched
            if (state.filters.search && !person.name.toLowerCase().includes(state.filters.search)) {
                const matchingVariant = person.name_variants?.find(variant =>
                    variant.toLowerCase().includes(state.filters.search)
                );
                if (matchingVariant) {
                    nameHtml += `<br><small style="color: #666; font-style: italic;">auch: ${matchingVariant}</small>`;
                }
            }
            return `<td>${nameHtml}</td>`;

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

        case 'correspondence_compact':
            const sent = person.letter_count || 0;
            const mentions = person.mention_count || 0;
            if (sent === 0 && mentions === 0) {
                return `<td class="muted" style="font-size: 0.85rem;" title="Diese Person erscheint nur in biografischen Quellen, nicht in der erhaltenen Briefkorrespondenz">keine</td>`;
            }
            const corrParts = [];
            if (sent > 0) corrParts.push(`${sent}B`);
            if (mentions > 0) corrParts.push(`${mentions}E`);
            const tooltipText = [];
            if (sent > 0) tooltipText.push(`${sent} Brief${sent > 1 ? 'e' : ''} gesendet`);
            if (mentions > 0) tooltipText.push(`${mentions}× erwähnt`);
            return `<td style="font-size: 0.85rem;" title="${tooltipText.join(', ')}">${corrParts.join(' ')}</td>`;

        case 'occupations_compact':
            const occs = person.occupations || [];
            if (occs.length === 0) {
                return `<td class="muted" style="font-size: 0.85rem;">-</td>`;
            }
            if (occs.length <= 2) {
                return `<td style="font-size: 0.85rem;">${occs.map(o => o.name).join(', ')}</td>`;
            }
            const firstTwo = occs.slice(0, 2).map(o => o.name).join(', ');
            const remaining = occs.length - 2;
            return `<td style="font-size: 0.85rem;" title="${occs.map(o => o.name).join(', ')}">${firstTwo} <span class="muted">+${remaining}</span></td>`;

        case 'relations_compact':
            const rels = person.relationships || [];
            if (rels.length === 0) {
                return `<td class="muted" style="font-size: 0.85rem;">-</td>`;
            }
            return `<td style="font-size: 0.85rem;"><span class="info-badge" title="${rels.length} Beziehung${rels.length > 1 ? 'en' : ''}">${rels.length}</span></td>`;

        case 'biography_preview':
            if (!person.biography) {
                return `<td class="muted" style="font-size: 0.85rem;">-</td>`;
            }
            const cleanBioPreview = person.biography
                .replace(/#s\+/g, '')
                .replace(/#s-/g, '')
                .replace(/#e\+/g, '')
                .replace(/#e-/g, '');
            const preview = cleanBioPreview.length > 60 ? cleanBioPreview.substring(0, 60) + '...' : cleanBioPreview;
            return `<td style="font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cleanBioPreview}">${preview}</td>`;

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
            case 'correspondence_compact':
                // Sort by total correspondence (letters + mentions)
                aVal = (a.letter_count || 0) + (a.mention_count || 0);
                bVal = (b.letter_count || 0) + (b.mention_count || 0);
                break;
            case 'occupations_compact':
                // Sort alphabetically by first occupation
                aVal = a.occupations?.[0]?.name?.toLowerCase() || 'zzz';
                bVal = b.occupations?.[0]?.name?.toLowerCase() || 'zzz';
                break;
            case 'relations_compact':
                // Sort by number of relationships
                aVal = a.relationships?.length || 0;
                bVal = b.relationships?.length || 0;
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
    const headers = ['Name', 'Lebensdaten', 'Rolle', 'Briefe', 'Erwähnungen', 'Berufe', 'Beziehungen', 'GND'];

    let csv = headers.join(',') + '\n';

    state.filteredPersons.forEach(person => {
        const row = [
            `"${person.name}"`,
            `"${person.dates?.birth || '?'}-${person.dates?.death || '?'}"`,
            `"${getRoleLabel(person.role)}"`,
            person.letter_count || 0,
            person.mention_count || 0,
            `"${person.occupations?.map(o => o.name).join('; ') || '-'}"`,
            person.relationships?.length || 0,
            `"${person.gnd || '-'}"`
        ];
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

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show timeline person popup
function showTimelinePersonPopup(personId, anchorElement) {
    const person = state.allPersons.find(p => p.id === personId);
    if (!person) return;

    // Remove any existing popup
    const existingPopup = document.querySelector('.timeline-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Build popup content
    let popupContent = `
        <div class="timeline-popup-header">
            <h4>${person.name}</h4>
            <button class="timeline-popup-close">&times;</button>
        </div>
        <div class="timeline-popup-body">
            <p><strong>Lebensdaten:</strong> ${person.dates?.birth || '?'} - ${person.dates?.death || '?'}</p>
            <p><strong>Rolle:</strong> ${getRoleLabel(person.role)}</p>
    `;

    // Add occupations if available
    if (person.occupations && person.occupations.length > 0) {
        popupContent += `
            <p><strong>Berufe:</strong> ${person.occupations.map(o => o.name).join(', ')}</p>
        `;
    }

    // Add relationships if available
    if (person.relationships && person.relationships.length > 0) {
        popupContent += `
            <div class="timeline-popup-section">
                <strong>Beziehungen:</strong>
                <ul class="timeline-popup-relations">
        `;

        person.relationships.forEach(rel => {
            const target = state.allPersons.find(p => p.id === rel.target_id);
            if (target) {
                const inBasket = state.basket.some(p => p.id === target.id);
                popupContent += `
                    <li>
                        ${rel.type}: <a href="#" class="person-link-popup" data-id="${target.id}">${target.name}</a>
                        ${inBasket ? '<span class="in-basket-marker">★</span>' : ''}
                    </li>
                `;
            }
        });

        popupContent += `
                </ul>
            </div>
        `;
    }

    // Add correspondence summary if available
    if (person.correspondence && person.correspondence.length > 0) {
        const sent = person.correspondence.filter(c => c.type === 'sent').length;
        const mentioned = person.correspondence.filter(c => c.type === 'mentioned').length;
        popupContent += `
            <p><strong>Korrespondenz:</strong> ${sent} Briefe gesendet, ${mentioned}× erwähnt</p>
        `;
    }

    popupContent += `
        </div>
    `;

    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'timeline-popup';
    popup.innerHTML = popupContent;

    // Position popup near the anchor element
    document.body.appendChild(popup);

    const rect = anchorElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    // Position to the right of the timeline bar if there's space, otherwise to the left
    let left = rect.right + 10;
    if (left + popupRect.width > window.innerWidth) {
        left = rect.left - popupRect.width - 10;
    }

    // Center vertically relative to the bar
    let top = rect.top + (rect.height / 2) - (popupRect.height / 2);

    // Keep popup within viewport
    if (top < 10) top = 10;
    if (top + popupRect.height > window.innerHeight - 10) {
        top = window.innerHeight - popupRect.height - 10;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    // Add event listeners
    popup.querySelector('.timeline-popup-close').addEventListener('click', () => {
        popup.remove();
    });

    // Close popup when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !anchorElement.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 0);

    // Handle person links in popup
    popup.querySelectorAll('.person-link-popup').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.id;
            popup.remove();

            // Switch to Person tab and show details
            const personTab = document.querySelector('[data-tab="person"]');
            if (personTab) {
                personTab.click();
            }

            // Find person in table and highlight
            selectPerson(targetId);
        });
    });
}

// Wissenskorb functions
function toggleBasket(personId) {
    const person = state.allPersons.find(p => p.id === personId);
    if (!person) return;

    const index = state.basket.findIndex(p => p.id === personId);

    if (index >= 0) {
        // Remove from basket
        state.basket.splice(index, 1);
        showToast(`${person.name} aus Wissenskorb entfernt`);
    } else {
        // Check limit
        if (state.basket.length >= 20) {
            showToast('Wissenskorb voll - maximal 20 Personen möglich', 'warning');
            return;
        }
        // Add to basket
        state.basket.push(person);
        showToast(`${person.name} zum Wissenskorb hinzugefügt (${state.basket.length}/20)`);
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
        container.innerHTML = `
            <div class="empty-state-help">
                <p class="empty-state">Ihr Wissenskorb ist leer</p>
                <p class="help-text">Klicken Sie auf ☆ neben Namen in der Tabelle, um Personen für vergleichende Analysen zu sammeln.</p>
                <ul class="help-list">
                    <li>Visualisieren Sie Lebenszeiten</li>
                    <li>Entdecken Sie Beziehungen zwischen Personen</li>
                    <li>Exportieren Sie Ihre Auswahl</li>
                </ul>
            </div>
        `;
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

    // Add timeline bar click handlers
    container.querySelectorAll('.timeline-bar').forEach(bar => {
        bar.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = bar.dataset.personId;
            showTimelinePersonPopup(personId, e.currentTarget);
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
                        const person = state.basket.find(p => p.name === y.name);
                        return `
                            <div class="timeline-row" style="top: ${top}px;">
                                <div class="timeline-bar" style="left: ${left}%; width: ${width}%;"
                                     title="${y.name} (${y.birth}-${y.death})"
                                     data-person-id="${person.id}"
                                     data-tooltip="Klicke für Details">
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
        showToast('Wissenskorb ist leer', 'warning');
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
    showToast(`${state.basket.length} Personen als CSV exportiert`);
}

function exportBasketToJSON() {
    if (state.basket.length === 0) {
        showToast('Wissenskorb ist leer', 'warning');
        return;
    }

    const json = JSON.stringify(state.basket, null, 2);
    downloadFile(json, 'wissenskorb.json', 'application/json');
    showToast(`${state.basket.length} Personen als JSON exportiert`);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
