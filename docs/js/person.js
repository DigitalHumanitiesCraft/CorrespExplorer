// HerData - Person Detail Page
// Displays detailed information about a single person
import { loadPersons, getPersonById } from './data.js';
import { loadNavbar } from './navbar-loader.js';
import { GlobalSearch } from './search.js';

let currentPerson = null;
let allPersons = [];
let miniMap = null;

// Initialize page
async function init() {
    try {
        await loadNavbar();

        // Get person ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const personId = urlParams.get('id');

        if (!personId) {
            showError('Keine Person-ID angegeben');
            return;
        }

        // Load data using shared module
        const data = await loadPersons();
        allPersons = data.persons;

        // Find person
        currentPerson = getPersonById(allPersons, personId);

        if (!currentPerson) {
            showNotFound();
            return;
        }

        // Initialize search
        initSearch();

        // Render person page
        renderPerson();
        hideLoading();

    } catch (error) {
        showError('Fehler beim Laden der Person: ' + error.message);
        console.error('Init error:', error);
    }
}

// Global search
let globalSearch = null;
function initSearch() {
    if (allPersons.length > 0 && !globalSearch) {
        globalSearch = new GlobalSearch(allPersons);
        console.log("🔍 Global search initialized on person page");
    }
}

// Render person information
function renderPerson() {
    // Update page title
    document.title = `${currentPerson.name} - HerData`;

    // Render header
    renderHeader();

    // Render all tabs
    renderOverview();
    renderLetters();
    renderPlaces();
    renderOccupations();
    renderRelations();
    renderAdditionalBiographies();
    renderSources();

    // Show content
    document.getElementById('person-content').style.display = 'block';
}

// Render header section
function renderHeader() {
    // Name
    document.getElementById('person-name').textContent = currentPerson.name;

    // Dates
    const datesEl = document.getElementById('person-dates');
    if (currentPerson.dates) {
        const birth = currentPerson.dates.birth || '?';
        const death = currentPerson.dates.death || '?';
        datesEl.textContent = `${birth} – ${death}`;
    } else {
        datesEl.textContent = 'Lebensdaten unbekannt';
    }

    // Badges
    const badgesEl = document.getElementById('person-badges');
    let badges = [];

    // Role badges
    if (currentPerson.roles) {
        if (currentPerson.roles.includes('sender')) {
            badges.push('<span class="badge badge-role-sender">Absenderin</span>');
        }
        if (currentPerson.roles.includes('mentioned')) {
            badges.push('<span class="badge badge-role-mentioned">Erwähnt</span>');
        }
    } else if (currentPerson.role) {
        const roleLabels = {
            'sender': 'Absenderin',
            'mentioned': 'Erwähnt',
            'both': 'Absenderin & Erwähnt',
            'indirect': 'Indirekt (SNDB)'
        };
        badges.push(`<span class="badge badge-role-${currentPerson.role}">${roleLabels[currentPerson.role]}</span>`);
    }

    // Authority badges
    if (currentPerson.gnd) {
        badges.push('<span class="badge badge-gnd">GND</span>');
    }
    badges.push('<span class="badge badge-sndb">SNDB</span>');

    badgesEl.innerHTML = badges.join(' ');
}

// Render Overview tab
function renderOverview() {
    // Stats
    document.getElementById('stat-letters').textContent = currentPerson.letter_count || 0;
    document.getElementById('stat-mentions').textContent = currentPerson.mention_count || 0;
    document.getElementById('stat-places').textContent = currentPerson.places ? currentPerson.places.length : 0;
    document.getElementById('stat-occupations').textContent = currentPerson.occupations ? currentPerson.occupations.length : 0;

    // Biography
    const biographyEl = document.getElementById('biography-content');
    if (currentPerson.biography) {
        // Parse markup tags and display biography
        const parsedBiography = parseMarkup(currentPerson.biography);
        biographyEl.innerHTML = `<p class="biography-text">${parsedBiography}</p>`;
    } else {
        biographyEl.innerHTML = '<p class="placeholder-text">Keine Biographie verfügbar.</p>';
    }
}

// Parse SNDB markup tags in biographical text
function parseMarkup(text) {
    if (!text) return '';

    return text
        // #s+text#s- = Sperrsatz (spacing) → use <em> for emphasis
        .replace(/#s\+([^#]+)#s-/g, '<em>$1</em>')
        // _ = Unterstrich für Leerzeichen in manchen Kontexten
        .replace(/\b_\b/g, ' ');
}

// Render Additional Biographies section
function renderAdditionalBiographies() {
    const card = document.getElementById('additional-biographies-card');
    const content = document.getElementById('additional-biographies-content');
    
    if (!currentPerson.biographies || currentPerson.biographies.length === 0) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    
    // Source name mapping
    const sourceNames = {
        'goebriefe': 'Goethe-Briefe Register',
        'bug': 'Briefnetzwerk um Goethe',
        'tagebuch': 'Goethe Tagebuch'
    };
    
    // Group biographies by source
    const bySource = {};
    currentPerson.biographies.forEach(bio => {
        if (!bySource[bio.source]) {
            bySource[bio.source] = [];
        }
        bySource[bio.source].push(bio);
    });
    
    let html = '<div class="biographies-list">';
    
    for (const [source, bios] of Object.entries(bySource)) {
        const sourceName = sourceNames[source] || source;
        html += '<div class="biography-source">';
        html += '<h3 class="biography-source-title">' + sourceName + '</h3>';
        
        bios.forEach(bio => {
            const parsedText = parseBiographyMarkup(bio.text);
            html += '<div class="biography-text">' + parsedText + '</div>';
        });
        
        html += '</div>';
    }
    
    html += '</div>';
    content.innerHTML = html;
}

// Parse biography markup tags
function parseBiographyMarkup(text) {
    if (!text) return '';
    
    return text
        // #k# = Kursiv (italic)
        .replace(/#k#([^#]+)#\/k#/g, '<em>$1</em>')
        // #r# = Recte/Roman (normal)
        .replace(/#r#([^#]+)#\/r#/g, '<span>$1</span>')
        // #s+ = Sperrsatz (spaced)
        .replace(/#s\+([^#]+)#s-/g, '<strong>$1</strong>')
        // Clean up any remaining markup
        .replace(/#[^#]*#/g, '');
}

// Render Letters tab
function renderLetters() {
    const contentEl = document.getElementById('letters-content');

    const letterCount = currentPerson.letter_count || 0;
    const mentionCount = currentPerson.mention_count || 0;

    let html = '<div class="letters-summary">';

    if (letterCount > 0) {
        html += `<p><strong>${letterCount}</strong> ${letterCount === 1 ? 'Brief' : 'Briefe'} an Goethe gesendet</p>`;
    }

    if (mentionCount > 0) {
        html += `<p><strong>${mentionCount}</strong> ${mentionCount === 1 ? 'Erwähnung' : 'Erwähnungen'} in Briefen</p>`;
    }

    if (letterCount === 0 && mentionCount === 0) {
        html += '<p>Keine direkte Korrespondenz mit Goethe nachgewiesen.</p>';
        html += '<p class="note">Diese Person ist über SNDB-Normdaten identifiziert, tritt aber nicht in der CMIF-Briefkorrespondenz auf.</p>';
    } else {
        html += '<div class="placeholder-content" style="margin-top: 24px;">';
        html += '<p>Derzeit sind nur Anzahlen verfügbar. Detaillierte Briefinformationen könnten in Zukunft ergänzt werden:</p>';
        html += '<ul>';
        html += '<li>Chronologische Briefliste mit Datum und Ort</li>';
        html += '<li>Regesten (Zusammenfassungen aus den Briefeditionen)</li>';
        html += '<li>Links zu digitalen Editionen (wenn verfügbar)</li>';
        html += '<li>Erwähnungen in anderen Briefen</li>';
        html += '</ul>';
        html += '</div>';
    }

    html += '</div>';

    contentEl.innerHTML = html;
}

// Render Places tab
function renderPlaces() {
    const placesListEl = document.getElementById('places-list');

    if (!currentPerson.places || currentPerson.places.length === 0) {
        placesListEl.innerHTML = '<p class="placeholder-text">Keine Ortsdaten verfügbar.</p>';
        document.getElementById('places-map').style.display = 'none';
        return;
    }

    // Build places list
    let html = '<div class="places-grid">';
    currentPerson.places.forEach(place => {
        html += `
            <div class="place-card">
                <h3>${place.name}</h3>
                <p class="place-type">${place.type}</p>
                <p class="place-coords">${place.lat.toFixed(5)}°N, ${place.lon.toFixed(5)}°E</p>
            </div>
        `;
    });
    html += '</div>';

    placesListEl.innerHTML = html;

    // Initialize mini-map
    initMiniMap();
}

// Initialize mini-map for places
function initMiniMap() {
    const mapEl = document.getElementById('places-map');

    if (!currentPerson.places || currentPerson.places.length === 0) {
        mapEl.style.display = 'none';
        return;
    }

    mapEl.style.display = 'block';

    // Calculate center and zoom based on places
    const firstPlace = currentPerson.places[0];
    const center = [firstPlace.lon, firstPlace.lat];
    const zoom = currentPerson.places.length === 1 ? 10 : 6;

    miniMap = new maplibregl.Map({
        container: 'places-map',
        style: {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
            },
            layers: [
                {
                    id: 'osm-tiles-layer',
                    type: 'raster',
                    source: 'osm-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }
            ]
        },
        center: center,
        zoom: zoom
    });

    miniMap.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add markers for all places
    currentPerson.places.forEach(place => {
        new maplibregl.Marker({ color: '#2c5f8d' })
            .setLngLat([place.lon, place.lat])
            .setPopup(new maplibregl.Popup().setHTML(`<strong>${place.name}</strong><br>${place.type}`))
            .addTo(miniMap);
    });

    // Fit bounds if multiple places
    if (currentPerson.places.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        currentPerson.places.forEach(place => {
            bounds.extend([place.lon, place.lat]);
        });
        miniMap.fitBounds(bounds, { padding: 50 });
    }
}

// Render Occupations tab
function renderOccupations() {
    const contentEl = document.getElementById('occupations-content');

    if (!currentPerson.occupations || currentPerson.occupations.length === 0) {
        contentEl.innerHTML = '<p class="placeholder-text">Keine Berufsdaten verfügbar.</p>';
        return;
    }

    let html = '<div class="occupations-list">';
    currentPerson.occupations.forEach(occ => {
        html += `
            <div class="occupation-item">
                <span class="occupation-name">${occ.name}</span>
                <span class="occupation-type">${occ.type}</span>
            </div>
        `;
    });
    html += '</div>';

    contentEl.innerHTML = html;
}

// Render Relations tab
function renderRelations() {
    const contentEl = document.getElementById('relations-content');
    const cardEl = document.getElementById('relations-card');

    if (!currentPerson.relations || currentPerson.relations.length === 0) {
        cardEl.style.display = 'none';
        return;
    }

    // Show card
    cardEl.style.display = 'block';

    // Group relations by category
    const byCategory = {
        'Familie': [],
        'Beruflich': [],
        'Sozial': []
    };

    currentPerson.relations.forEach(rel => {
        const targetPerson = allPersons.find(p => p.id === rel.target);
        if (!targetPerson) return;

        // Categorize by AGRELON ID prefix
        const prefix = rel.agrelon_id.charAt(0);
        const category = prefix === '4' ? 'Familie' : prefix === '3' ? 'Beruflich' : 'Sozial';

        byCategory[category].push({
            ...rel,
            targetPerson: targetPerson
        });
    });

    // Build HTML
    let html = '<div class="relations-list">';

    // Familie
    if (byCategory['Familie'].length > 0) {
        html += `<div class="relation-category">
            <h3 style="color: #ff0066; font-size: 16px; margin-bottom: 12px;">Familie (${byCategory['Familie'].length})</h3>`;
        byCategory['Familie'].forEach(rel => {
            const dates = rel.targetPerson.birth || rel.targetPerson.death
                ? `(${rel.targetPerson.birth || '?'} – ${rel.targetPerson.death || '?'})`
                : '';
            html += `
                <div class="relation-item">
                    <div class="relation-type" style="color: #ff0066;">${rel.type}</div>
                    <a href="person.html?id=${rel.target}" class="relation-name">
                        <strong>${rel.targetPerson.name}</strong> ${dates}
                    </a>
                </div>
            `;
        });
        html += '</div>';
    }

    // Beruflich
    if (byCategory['Beruflich'].length > 0) {
        html += `<div class="relation-category">
            <h3 style="color: #00ccff; font-size: 16px; margin-bottom: 12px;">Beruflich (${byCategory['Beruflich'].length})</h3>`;
        byCategory['Beruflich'].forEach(rel => {
            const dates = rel.targetPerson.birth || rel.targetPerson.death
                ? `(${rel.targetPerson.birth || '?'} – ${rel.targetPerson.death || '?'})`
                : '';
            html += `
                <div class="relation-item">
                    <div class="relation-type" style="color: #00ccff;">${rel.type}</div>
                    <a href="person.html?id=${rel.target}" class="relation-name">
                        <strong>${rel.targetPerson.name}</strong> ${dates}
                    </a>
                </div>
            `;
        });
        html += '</div>';
    }

    // Sozial
    if (byCategory['Sozial'].length > 0) {
        html += `<div class="relation-category">
            <h3 style="color: #ffcc00; font-size: 16px; margin-bottom: 12px;">Sozial (${byCategory['Sozial'].length})</h3>`;
        byCategory['Sozial'].forEach(rel => {
            const dates = rel.targetPerson.birth || rel.targetPerson.death
                ? `(${rel.targetPerson.birth || '?'} – ${rel.targetPerson.death || '?'})`
                : '';
            html += `
                <div class="relation-item">
                    <div class="relation-type" style="color: #ffcc00;">${rel.type}</div>
                    <a href="person.html?id=${rel.target}" class="relation-name">
                        <strong>${rel.targetPerson.name}</strong> ${dates}
                    </a>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div>';

    contentEl.innerHTML = html;
}

// Render Sources tab
function renderSources() {
    const contentEl = document.getElementById('sources-content');

    let html = '<div class="sources-links">';

    // GND Link
    if (currentPerson.gnd) {
        html += `
            <p class="normdaten-link">
                <strong>GND:</strong>
                <a href="https://d-nb.info/gnd/${currentPerson.gnd}" target="_blank" rel="noopener">
                    https://d-nb.info/gnd/${currentPerson.gnd} ↗
                </a>
            </p>
        `;
    }

    // SNDB Link
    if (currentPerson.sndb_url) {
        html += `
            <p class="normdaten-link">
                <strong>SNDB:</strong>
                <a href="${currentPerson.sndb_url}" target="_blank" rel="noopener">
                    ${currentPerson.sndb_url} ↗
                </a>
            </p>
        `;
    }

    html += '</div>';

    contentEl.innerHTML = html;

    // Data quality
    const qualityEl = document.getElementById('data-quality');
    let qualityHtml = '<ul class="data-quality-list">';

    // Helper function for quality indicators
    const indicator = (available) => available ? '<span class="quality-icon available">✓</span>' : '<span class="quality-icon unavailable">✗</span>';

    qualityHtml += `<li>${indicator(currentPerson.gnd)} Normierung: ${currentPerson.gnd ? 'GND vorhanden' : 'Nur SNDB'}</li>`;
    qualityHtml += `<li>${indicator(currentPerson.dates)} Lebensdaten: ${currentPerson.dates ? 'Verfügbar' : 'Nicht verfügbar'}</li>`;
    qualityHtml += `<li>${indicator(currentPerson.places && currentPerson.places.length > 0)} Geodaten: ${currentPerson.places && currentPerson.places.length > 0 ? currentPerson.places.length + ' Orte' : 'Nicht verfügbar'}</li>`;
    qualityHtml += `<li>${indicator(currentPerson.occupations && currentPerson.occupations.length > 0)} Berufsdaten: ${currentPerson.occupations && currentPerson.occupations.length > 0 ? currentPerson.occupations.length + ' Einträge' : 'Nicht verfügbar'}</li>`;
    qualityHtml += `<li><span class="quality-icon info">i</span> Datenstand: SNDB Oktober 2025</li>`;
    qualityHtml += '</ul>';
    qualityEl.innerHTML = qualityHtml;

    // Citation
    const citationEl = document.getElementById('citation-content');
    const citationText = `${currentPerson.name}. In: HerData - Frauen in Goethes Briefkorrespondenz. ` +
        `Hrsg. von Christopher Pollin. 2025. ` +
        `https://chpollin.github.io/HerData/person.html?id=${currentPerson.id} ` +
        `(Zugriff: ${new Date().toLocaleDateString('de-DE')})`;

    citationEl.innerHTML = `
        <div class="citation-box">
            <pre class="citation-text">${citationText}</pre>
            <button class="copy-button" onclick="copyCitation()" aria-label="Zitat kopieren">
                Kopieren
            </button>
        </div>
    `;
}

// Copy citation to clipboard
window.copyCitation = function() {
    const citationText = document.querySelector('.citation-text').textContent;
    navigator.clipboard.writeText(citationText).then(() => {
        const button = document.querySelector('.copy-button');
        const originalText = button.textContent;
        button.textContent = 'Kopiert!';
        button.style.background = '#28a745';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Fehler beim Kopieren:', err);
        alert('Kopieren fehlgeschlagen. Bitte manuell markieren und kopieren.');
    });
};

// Initialize tab switching
// Tab functionality removed - using card layout instead

// Show loading state
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show not found error
function showNotFound() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('not-found').style.display = 'block';
}

// Show error message
function showError(message) {
    document.getElementById('loading').textContent = message;
    document.getElementById('loading').style.background = '#f8d7da';
    document.getElementById('loading').style.color = '#9b2226';
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
