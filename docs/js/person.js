// HerData - Person Detail Page (Story Style)
// Displays detailed information about a single person in scrollytelling format
import { loadPersons, getPersonById } from './data.js';
import { loadNavbar } from './navbar-loader.js';
import { GlobalSearch } from './search.js';
import { Toast } from './utils.js';

let currentPerson = null;
let allPersons = [];
let wikimediaData = {};
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

        // Load data
        const [data, wmResponse] = await Promise.all([
            loadPersons(),
            fetch('data/wikimedia_commons_results.json').catch(() => ({ ok: false }))
        ]);

        allPersons = data.persons;

        // Load Wikimedia data for portraits
        if (wmResponse.ok) {
            const wmData = await wmResponse.json();
            wmData.persons_with_media.forEach(p => {
                if (p.gnd) {
                    wikimediaData[p.gnd] = p;
                }
            });
        }

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
        console.log("Global search initialized on person page");
    }
}

// Render person information
function renderPerson() {
    // Update page title
    document.title = `${formatName(currentPerson.name)} - HerData`;

    // Render all sections
    renderHero();
    renderBiography();
    renderPlaces();
    renderLetters();
    renderRelations();
    renderAdditionalBiographies();
    renderCommonsGallery();  // Load Commons images asynchronously
    renderSources();
    renderQuality();
    renderCitation();
    renderDebugJSON();

    // Show content
    document.getElementById('person-content').style.display = 'block';
}

// Render hero section with portrait and basic info
function renderHero() {
    const heroEl = document.getElementById('story-hero');
    const wmData = currentPerson.gnd ? wikimediaData[currentPerson.gnd] : null;
    const hasImage = wmData && wmData.image_url;

    let html = '';

    // Portrait or placeholder
    if (hasImage) {
        const imageUrl = getWikimediaThumbnail(wmData.image_url, 400);
        html += `<img src="${imageUrl}" alt="${currentPerson.name}" class="story-portrait" id="story-portrait-img">`;
    } else {
        html += createPlaceholderHTML(currentPerson.name);
    }

    // Name
    html += `<h1 class="story-name">${formatName(currentPerson.name)}</h1>`;

    // Dates
    const dates = currentPerson.dates;
    if (dates) {
        const birth = dates.birth || '?';
        const death = dates.death || '?';
        html += `<p class="story-dates">${birth} - ${death}</p>`;
    } else {
        html += `<p class="story-dates">Lebensdaten unbekannt</p>`;
    }

    // Badges
    html += '<div class="story-badges">';
    if (currentPerson.roles) {
        if (currentPerson.roles.includes('sender')) {
            html += '<span class="badge badge-role-sender">Absenderin</span>';
        }
        if (currentPerson.roles.includes('mentioned')) {
            html += '<span class="badge badge-role-mentioned">Erwaehnt</span>';
        }
    } else if (currentPerson.role) {
        const roleLabels = {
            'sender': 'Absenderin',
            'mentioned': 'Erwaehnt',
            'both': 'Absenderin & Erwaehnt',
            'indirect': 'Indirekt (SNDB)'
        };
        html += `<span class="badge badge-role-${currentPerson.role}">${roleLabels[currentPerson.role]}</span>`;
    }
    if (currentPerson.gnd) {
        html += '<span class="badge badge-gnd">GND</span>';
    }
    html += '<span class="badge badge-sndb">SNDB</span>';
    html += '</div>';

    // Occupations
    if (currentPerson.occupations && currentPerson.occupations.length > 0) {
        html += '<div class="story-occupations">';
        currentPerson.occupations.forEach(occ => {
            html += `<span class="story-occupation">${occ.name}</span>`;
        });
        html += '</div>';
    }

    // Basket button
    html += `<button id="person-basket-btn" class="story-basket-btn" title="Zum Wissenskorb hinzufuegen">
        <i class="fas fa-bookmark"></i>
        <span id="basket-btn-text">Zum Wissenskorb</span>
    </button>`;

    heroEl.innerHTML = html;

    // Add error handler for portrait image
    const portraitImg = document.getElementById('story-portrait-img');
    if (portraitImg) {
        portraitImg.onerror = function() {
            this.outerHTML = createPlaceholderHTML(currentPerson.name);
        };
    }

    // Initialize basket button
    initBasketButton();
}

// Render biography section
function renderBiography() {
    const contentEl = document.getElementById('biography-content');

    if (currentPerson.biography) {
        const parsedBio = parseMarkup(currentPerson.biography);
        contentEl.innerHTML = `<p class="story-bio">${parsedBio}</p>`;
    } else {
        contentEl.innerHTML = '<p class="story-bio">Keine Biografie verfuegbar.</p>';
    }
}

// Render places section with map
function renderPlaces() {
    const sectionEl = document.getElementById('places-section');
    const listEl = document.getElementById('places-list');

    if (!currentPerson.places || currentPerson.places.length === 0) {
        sectionEl.style.display = 'none';
        return;
    }

    sectionEl.style.display = 'block';

    // Build places list
    let html = '';
    currentPerson.places.forEach((place, index) => {
        html += `<li class="story-place-item">
            <span><strong>${index + 1}.</strong> ${place.name}</span>
            ${place.type ? `<span class="story-place-type">${place.type}</span>` : ''}
        </li>`;
    });
    listEl.innerHTML = html;

    // Initialize map
    initMiniMap();
}

// Initialize mini-map for places
function initMiniMap() {
    const mapEl = document.getElementById('places-map');

    if (!currentPerson.places || currentPerson.places.length === 0) {
        return;
    }

    const validPlaces = currentPerson.places.filter(p => p.lat && p.lon);
    if (validPlaces.length === 0) {
        mapEl.innerHTML = '<p style="padding: 20px; color: #666; text-align: center;">Keine Koordinaten verfuegbar</p>';
        return;
    }

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
            layers: [{
                id: 'osm-tiles-layer',
                type: 'raster',
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 19
            }]
        },
        center: [validPlaces[0].lon, validPlaces[0].lat],
        zoom: validPlaces.length === 1 ? 10 : 5
    });

    miniMap.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add numbered markers
    validPlaces.forEach((place, index) => {
        const el = document.createElement('div');
        el.style.cssText = 'width: 24px; height: 24px; background: #3b5998; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);';
        el.textContent = index + 1;

        new maplibregl.Marker(el)
            .setLngLat([place.lon, place.lat])
            .setPopup(new maplibregl.Popup().setHTML(`
                <strong>${place.name}</strong>
                ${place.type ? `<br><em>${place.type}</em>` : ''}
            `))
            .addTo(miniMap);
    });

    // Fit bounds if multiple places
    if (validPlaces.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        validPlaces.forEach(place => {
            bounds.extend([place.lon, place.lat]);
        });
        miniMap.fitBounds(bounds, { padding: 40 });
    }
}

// Render letters/correspondence section
function renderLetters() {
    const contentEl = document.getElementById('letters-content');
    const letterCount = currentPerson.letter_count || 0;
    const mentionCount = currentPerson.mention_count || 0;

    let html = '';

    if (letterCount === 0 && mentionCount === 0) {
        html += `<div class="story-context-box">
            Diese Person wurde ueber biographische Quellen (SNDB) identifiziert,
            tritt aber in Goethes gescannter Briefkorrespondenz (CMIF)
            weder als Absenderin noch als erwaehnte Person auf.
        </div>`;
    } else {
        html += '<div class="story-letters-summary">';
        html += `<div class="story-letter-stat">
            <div class="story-letter-stat-value">${letterCount}</div>
            <div class="story-letter-stat-label">Briefe gesendet</div>
        </div>`;
        html += `<div class="story-letter-stat">
            <div class="story-letter-stat-value">${mentionCount}</div>
            <div class="story-letter-stat-label">Erwaehnungen</div>
        </div>`;
        html += '</div>';
    }

    contentEl.innerHTML = html;
}

// Render relations section
function renderRelations() {
    const sectionEl = document.getElementById('relations-section');
    const contentEl = document.getElementById('relations-content');

    if (!currentPerson.relations || currentPerson.relations.length === 0) {
        sectionEl.style.display = 'none';
        return;
    }

    sectionEl.style.display = 'block';

    // Group relations by category
    const byCategory = {
        'Familie': [],
        'Beruflich': [],
        'Sozial': []
    };

    const categoryColors = {
        'Familie': '#D0388C',
        'Beruflich': '#3498db',
        'Sozial': '#f39c12'
    };

    currentPerson.relations.forEach(rel => {
        const targetPerson = allPersons.find(p => p.id === rel.target);
        if (!targetPerson) return;

        // Categorize by AGRELON ID prefix
        const prefix = rel.agrelon_id ? rel.agrelon_id.charAt(0) : '1';
        const category = prefix === '4' ? 'Familie' : prefix === '3' ? 'Beruflich' : 'Sozial';

        byCategory[category].push({
            ...rel,
            targetPerson: targetPerson
        });
    });

    let html = '';

    for (const [category, relations] of Object.entries(byCategory)) {
        if (relations.length === 0) continue;

        const color = categoryColors[category];
        html += `<div class="story-relation-category">
            <h3 style="color: ${color};">${category} (${relations.length})</h3>`;

        relations.forEach(rel => {
            const dates = rel.targetPerson.dates
                ? `(${rel.targetPerson.dates.birth || '?'} - ${rel.targetPerson.dates.death || '?'})`
                : '';
            html += `<div class="story-relation-item">
                <div class="story-relation-type" style="color: ${color};">${rel.type}</div>
                <a href="person.html?id=${rel.target}" class="story-relation-name">
                    ${formatName(rel.targetPerson.name)}
                </a>
                <span class="story-relation-dates">${dates}</span>
            </div>`;
        });

        html += '</div>';
    }

    contentEl.innerHTML = html;
}

// Render additional biographies section
function renderAdditionalBiographies() {
    const sectionEl = document.getElementById('additional-biographies-section');
    const contentEl = document.getElementById('additional-biographies-content');

    if (!currentPerson.biographies || currentPerson.biographies.length === 0) {
        sectionEl.style.display = 'none';
        return;
    }

    sectionEl.style.display = 'block';

    const sourceNames = {
        'goebriefe': 'Goethe-Briefe Register',
        'bug': 'Briefnetzwerk um Goethe',
        'tagebuch': 'Goethe Tagebuch'
    };

    // Group by source
    const bySource = {};
    currentPerson.biographies.forEach(bio => {
        if (!bySource[bio.source]) {
            bySource[bio.source] = [];
        }
        bySource[bio.source].push(bio);
    });

    let html = '';
    for (const [source, bios] of Object.entries(bySource)) {
        const sourceName = sourceNames[source] || source;
        html += `<h3 style="margin: 0 0 var(--space-sm) 0; font-size: var(--font-size-md);">${sourceName}</h3>`;
        bios.forEach(bio => {
            const parsedText = parseBiographyMarkup(bio.text);
            html += `<p class="story-bio" style="margin-bottom: var(--space-md);">${parsedText}</p>`;
        });
    }

    contentEl.innerHTML = html;
}

// Render Commons Gallery section (async - loads from Wikimedia API)
async function renderCommonsGallery() {
    const sectionEl = document.getElementById('commons-gallery-section');
    const loadingEl = document.getElementById('commons-gallery-loading');
    const gridEl = document.getElementById('commons-gallery-grid');

    const wmData = currentPerson.gnd ? wikimediaData[currentPerson.gnd] : null;

    // Only show section if there's a Commons category
    if (!wmData || !wmData.commons_category) {
        sectionEl.style.display = 'none';
        return;
    }

    sectionEl.style.display = 'block';

    try {
        // Fetch images from Commons category using the API
        const categoryName = wmData.commons_category;
        const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(categoryName)}&cmtype=file&cmlimit=20&format=json&origin=*`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.query || !data.query.categorymembers || data.query.categorymembers.length === 0) {
            loadingEl.innerHTML = '<p>Keine weiteren Bilder in dieser Kategorie gefunden.</p>';
            return;
        }

        const files = data.query.categorymembers;

        // Get image URLs for all files
        const titles = files.map(f => f.title).join('|');
        const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=300&format=json&origin=*`;

        const imageInfoResponse = await fetch(imageInfoUrl);
        const imageInfoData = await imageInfoResponse.json();

        loadingEl.style.display = 'none';

        const pages = imageInfoData.query.pages;
        let html = '';
        let imageCount = 0;

        for (const pageId in pages) {
            const page = pages[pageId];
            if (page.imageinfo && page.imageinfo[0]) {
                const info = page.imageinfo[0];
                const thumbUrl = info.thumburl || info.url;
                const fullUrl = info.descriptionurl || info.url;

                // Get title/description from metadata
                let title = page.title.replace('File:', '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
                if (info.extmetadata && info.extmetadata.ObjectName) {
                    title = info.extmetadata.ObjectName.value;
                }

                // Escape HTML in title
                const safeTitle = escapeHtml(title);
                const shortTitle = title.length > 50 ? escapeHtml(title.substring(0, 47)) + '...' : safeTitle;

                html += `<a href="${fullUrl}" target="_blank" rel="noopener" class="commons-gallery-item" title="${safeTitle}">
                    <img src="${thumbUrl}" alt="${safeTitle}" loading="lazy">
                    <div class="gallery-caption">${shortTitle}</div>
                </a>`;
                imageCount++;
            }
        }

        if (imageCount > 0) {
            gridEl.innerHTML = html;

            // Add link to full category
            gridEl.innerHTML += `<a href="https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(categoryName)}"
                target="_blank" rel="noopener" class="commons-gallery-link">
                <i class="fas fa-external-link-alt"></i> Alle Bilder auf Wikimedia Commons ansehen
            </a>`;
        } else {
            loadingEl.innerHTML = '<p>Keine Bilder gefunden.</p>';
            loadingEl.style.display = 'block';
        }

    } catch (error) {
        console.error('Error loading Commons gallery:', error);
        loadingEl.innerHTML = '<p>Fehler beim Laden der Bilder.</p>';
    }
}

// Render sources section
function renderSources() {
    const contentEl = document.getElementById('sources-content');
    const wmData = currentPerson.gnd ? wikimediaData[currentPerson.gnd] : null;

    let html = '<ul class="story-sources-list">';

    if (currentPerson.gnd) {
        html += `<li><a href="https://d-nb.info/gnd/${currentPerson.gnd}" target="_blank" rel="noopener">
            <i class="fas fa-external-link-alt"></i> GND: ${currentPerson.gnd}
        </a></li>`;
    }

    if (currentPerson.sndb_url) {
        html += `<li><a href="${currentPerson.sndb_url}" target="_blank" rel="noopener">
            <i class="fas fa-external-link-alt"></i> SNDB-Eintrag
        </a></li>`;
    }

    if (wmData && wmData.wikidata_id) {
        html += `<li><a href="https://www.wikidata.org/wiki/${wmData.wikidata_id}" target="_blank" rel="noopener">
            <i class="fas fa-external-link-alt"></i> Wikidata
        </a></li>`;
    }

    if (wmData && wmData.commons_category) {
        html += `<li><a href="https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(wmData.commons_category)}" target="_blank" rel="noopener">
            <i class="fas fa-images"></i> Wikimedia Commons
        </a></li>`;
    }

    html += `<li><a href="index.html?person=${currentPerson.id}">
        <i class="fas fa-map-marker-alt"></i> Auf der Karte anzeigen
    </a></li>`;

    html += '</ul>';
    contentEl.innerHTML = html;
}

// Render data quality section
function renderQuality() {
    const contentEl = document.getElementById('quality-content');

    const indicator = (available) => available
        ? '<span class="quality-icon available"><i class="fas fa-check"></i></span>'
        : '<span class="quality-icon unavailable"><i class="fas fa-times"></i></span>';

    let html = '<ul class="story-quality-list">';
    html += `<li>${indicator(currentPerson.gnd)} Normierung: ${currentPerson.gnd ? 'GND vorhanden' : 'Nur SNDB'}</li>`;
    html += `<li>${indicator(currentPerson.dates)} Lebensdaten: ${currentPerson.dates ? 'Verfuegbar' : 'Nicht verfuegbar'}</li>`;
    html += `<li>${indicator(currentPerson.places && currentPerson.places.length > 0)} Geodaten: ${currentPerson.places && currentPerson.places.length > 0 ? currentPerson.places.length + ' Orte' : 'Nicht verfuegbar'}</li>`;
    html += `<li>${indicator(currentPerson.occupations && currentPerson.occupations.length > 0)} Berufsdaten: ${currentPerson.occupations && currentPerson.occupations.length > 0 ? currentPerson.occupations.length + ' Eintraege' : 'Nicht verfuegbar'}</li>`;
    html += `<li><span class="quality-icon info"><i class="fas fa-info"></i></span> Datenstand: SNDB Oktober 2025</li>`;
    html += '</ul>';

    contentEl.innerHTML = html;
}

// Render citation section
function renderCitation() {
    const contentEl = document.getElementById('citation-content');

    const citationText = `${currentPerson.name}. In: HerData - Frauen in Goethes Briefkorrespondenz. Hrsg. von Christopher Pollin. 2025. https://chpollin.github.io/HerData/person.html?id=${currentPerson.id} (Zugriff: ${new Date().toLocaleDateString('de-DE')})`;

    contentEl.innerHTML = `
        <div class="story-citation-box">
            <pre class="story-citation-text">${citationText}</pre>
            <button class="story-copy-btn" onclick="copyCitation()">
                <i class="fas fa-copy"></i> Kopieren
            </button>
        </div>
    `;
}

// Render debug JSON section
function renderDebugJSON() {
    const debugEl = document.getElementById('debug-json');
    if (!debugEl || !currentPerson) return;

    // Syntax highlight the JSON
    const jsonString = JSON.stringify(currentPerson, null, 2);
    debugEl.innerHTML = syntaxHighlightJSON(jsonString);
}

// Syntax highlight JSON for debug display
function syntaxHighlightJSON(json) {
    // Escape HTML
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Add color spans
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function(match) {
            let color = '#b5cea8'; // number - green
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    color = '#9cdcfe'; // key - light blue
                } else {
                    color = '#ce9178'; // string - orange
                }
            } else if (/true|false/.test(match)) {
                color = '#569cd6'; // boolean - blue
            } else if (/null/.test(match)) {
                color = '#569cd6'; // null - blue
            }
            return '<span style="color:' + color + '">' + match + '</span>';
        }
    );
}

// Copy citation to clipboard
window.copyCitation = function() {
    const citationText = document.querySelector('.story-citation-text').textContent;
    navigator.clipboard.writeText(citationText).then(() => {
        const button = document.querySelector('.story-copy-btn');
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Kopiert';
        button.style.background = '#28a745';
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Fehler beim Kopieren:', err);
        alert('Kopieren fehlgeschlagen. Bitte manuell markieren und kopieren.');
    });
};

// Initialize basket button
function initBasketButton() {
    const basketBtn = document.getElementById('person-basket-btn');
    const basketBtnText = document.getElementById('basket-btn-text');

    if (!basketBtn || !currentPerson) return;

    updateBasketButton();

    basketBtn.addEventListener('click', () => {
        const inBasket = BasketManager.has(currentPerson.id);

        if (inBasket) {
            BasketManager.remove(currentPerson.id);
            Toast.show(`${formatName(currentPerson.name)} aus Wissenskorb entfernt`);
        } else {
            BasketManager.add(currentPerson);
            Toast.show(`${formatName(currentPerson.name)} zum Wissenskorb hinzugefuegt`);
        }

        updateBasketButton();
    });
}

// Update basket button visual state
function updateBasketButton() {
    const basketBtn = document.getElementById('person-basket-btn');
    const basketBtnText = document.getElementById('basket-btn-text');

    if (!basketBtn || !currentPerson) return;

    const inBasket = BasketManager.has(currentPerson.id);

    if (inBasket) {
        basketBtn.classList.add('in-basket');
        basketBtn.title = 'Aus Wissenskorb entfernen';
        basketBtnText.textContent = 'Im Wissenskorb';
    } else {
        basketBtn.classList.remove('in-basket');
        basketBtn.title = 'Zum Wissenskorb hinzufuegen';
        basketBtnText.textContent = 'Zum Wissenskorb';
    }
}

// Helper functions
function formatName(name) {
    return name.replace(/\s*\([^)]*\)/g, '').trim();
}

function getInitials(name) {
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || '??';
}

function createPlaceholderHTML(name) {
    return `<div class="story-portrait-placeholder">
        <span class="placeholder-initials">${getInitials(name)}</span>
        <i class="fas fa-user placeholder-icon"></i>
    </div>`;
}

function getWikimediaThumbnail(url, width = 300) {
    if (!url) return null;
    if (url.includes('/commons/')) {
        const parts = url.split('/commons/');
        if (parts.length === 2) {
            const filename = parts[1].split('/').pop();
            return `${parts[0]}/commons/thumb/${parts[1]}/${width}px-${filename}`;
        }
    }
    return url;
}

function parseMarkup(text) {
    if (!text) return '';
    return text
        .replace(/#s\+([^#]+)#s-/g, '<em>$1</em>')
        .replace(/\b_\b/g, ' ');
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseBiographyMarkup(text) {
    if (!text) return '';
    return text
        .replace(/#k#([^#]+)#\/k#/g, '<em>$1</em>')
        .replace(/#r#([^#]+)#\/r#/g, '<span>$1</span>')
        .replace(/#s\+([^#]+)#s-/g, '<strong>$1</strong>')
        .replace(/#[^#]*#/g, '');
}

// Show/hide states
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showNotFound() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('not-found').style.display = 'block';
}

function showError(message) {
    const loadingEl = document.getElementById('loading');
    loadingEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    loadingEl.style.color = '#9b2226';
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
