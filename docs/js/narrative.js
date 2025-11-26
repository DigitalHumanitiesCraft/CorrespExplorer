/**
 * HerData Narrative View
 * Gallery view with sidebar for browsing persons with portraits
 */

// State
let allPersons = [];
let wikimediaData = {};
let currentSort = 'letters';
let currentFilters = {
    onlyImage: false,
    onlyLetters: false,
    onlyAdel: false,
    roles: [],  // Empty = all roles, otherwise filter by selected
    occupation: '',
    search: ''
};

// Top occupations for "other" filter
const topOccupations = [
    'Schriftstellerin', 'Schauspielerin', 'Hofdame', 'Sängerin', 'Saengerin',
    'Malerin', 'Übersetzerin', 'Uebersetzerin', 'Salonière', 'Saloniere',
    'Erzieherin', 'Pädagogin', 'Paedagogin'
];

// DOM Elements
const galleryGrid = document.getElementById('gallery-grid');
const galleryLoading = document.getElementById('gallery-loading');
const sortSelect = document.getElementById('sort-select');
const filterImage = document.getElementById('filter-image');
const filterLetters = document.getElementById('filter-letters');
const searchInput = document.getElementById('search-input');
const visibleCount = document.getElementById('visible-count');
const imageCount = document.getElementById('image-count');

/**
 * Initialize the application
 */
async function init() {
    try {
        const [personsResponse, wikimediaResponse] = await Promise.all([
            fetch('data/persons.json'),
            fetch('data/wikimedia_commons_results.json').catch(() => ({ ok: false }))
        ]);

        const personsData = await personsResponse.json();
        allPersons = personsData.persons;

        if (wikimediaResponse.ok) {
            const wmData = await wikimediaResponse.json();
            wmData.persons_with_media.forEach(p => {
                if (p.gnd) {
                    wikimediaData[p.gnd] = p;
                }
            });
        }

        // Update image count
        const withImages = allPersons.filter(p => p.gnd && wikimediaData[p.gnd]).length;
        if (imageCount) imageCount.textContent = withImages;

        setupEventListeners();
        renderGallery();

    } catch (error) {
        console.error('Error loading data:', error);
        if (galleryLoading) {
            galleryLoading.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Fehler beim Laden';
        }
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderGallery();
        });
    }

    if (filterImage) {
        filterImage.addEventListener('change', (e) => {
            currentFilters.onlyImage = e.target.checked;
            renderGallery();
        });
    }

    if (filterLetters) {
        filterLetters.addEventListener('change', (e) => {
            currentFilters.onlyLetters = e.target.checked;
            renderGallery();
        });
    }

    // Adel filter
    const filterAdel = document.getElementById('filter-adel');
    if (filterAdel) {
        filterAdel.addEventListener('change', (e) => {
            currentFilters.onlyAdel = e.target.checked;
            renderGallery();
        });
    }

    // Role filters (checkboxes work as OR filter)
    const roleCheckboxes = ['sender', 'mentioned', 'both', 'indirect'];
    roleCheckboxes.forEach(role => {
        const checkbox = document.getElementById(`filter-role-${role}`);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                updateRoleFilters();
                renderGallery();
            });
        }
    });

    // Occupation filter
    const filterOccupation = document.getElementById('filter-occupation');
    if (filterOccupation) {
        filterOccupation.addEventListener('change', (e) => {
            currentFilters.occupation = e.target.value;
            renderGallery();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentFilters.search = e.target.value.toLowerCase();
            renderGallery();
        }, 300));
    }
}

/**
 * Update role filters from checkboxes
 */
function updateRoleFilters() {
    const roles = [];
    ['sender', 'mentioned', 'both', 'indirect'].forEach(role => {
        const checkbox = document.getElementById(`filter-role-${role}`);
        if (checkbox && checkbox.checked) {
            roles.push(role);
        }
    });
    currentFilters.roles = roles;
}

/**
 * Filter and sort persons
 */
function getFilteredPersons() {
    let filtered = [...allPersons];

    // Image filter
    if (currentFilters.onlyImage) {
        filtered = filtered.filter(p => p.gnd && wikimediaData[p.gnd]);
    }

    // Letters filter
    if (currentFilters.onlyLetters) {
        filtered = filtered.filter(p => p.letter_count > 0);
    }

    // Adel filter (check for "von ", "Gräfin", "Herzogin", etc. in name)
    if (currentFilters.onlyAdel) {
        filtered = filtered.filter(p => isAdelig(p.name));
    }

    // Role filter (OR logic: show if person matches any selected role)
    if (currentFilters.roles.length > 0) {
        filtered = filtered.filter(p => currentFilters.roles.includes(p.role));
    }

    // Occupation filter
    if (currentFilters.occupation) {
        filtered = filtered.filter(p => hasOccupation(p, currentFilters.occupation));
    }

    // Search filter
    if (currentFilters.search) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(currentFilters.search) ||
            (p.biography && p.biography.toLowerCase().includes(currentFilters.search))
        );
    }

    switch (currentSort) {
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            break;
        case 'birth':
            filtered.sort((a, b) => {
                const birthA = a.dates?.birth ? parseInt(a.dates.birth) : 9999;
                const birthB = b.dates?.birth ? parseInt(b.dates.birth) : 9999;
                return birthA - birthB;
            });
            break;
        case 'letters':
            filtered.sort((a, b) => (b.letter_count || 0) - (a.letter_count || 0));
            break;
        case 'image':
            filtered.sort((a, b) => {
                const hasImageA = a.gnd && wikimediaData[a.gnd] ? 1 : 0;
                const hasImageB = b.gnd && wikimediaData[b.gnd] ? 1 : 0;
                if (hasImageA !== hasImageB) return hasImageB - hasImageA;
                return (b.letter_count || 0) - (a.letter_count || 0);
            });
            break;
    }

    return filtered;
}

/**
 * Update filter counts based on all persons
 */
function updateFilterCounts() {
    // Count persons with images
    const withImages = allPersons.filter(p => p.gnd && wikimediaData[p.gnd]).length;
    const countImage = document.getElementById('count-image');
    if (countImage) countImage.textContent = withImages;

    // Count persons with letters
    const withLetters = allPersons.filter(p => p.letter_count > 0).length;
    const countLetters = document.getElementById('count-letters');
    if (countLetters) countLetters.textContent = withLetters;

    // Count adelige (nobility)
    const adelCount = allPersons.filter(p => isAdelig(p.name)).length;
    const countAdel = document.getElementById('count-adel');
    if (countAdel) countAdel.textContent = adelCount;

    // Count by role
    ['sender', 'mentioned', 'both', 'indirect'].forEach(role => {
        const count = allPersons.filter(p => p.role === role).length;
        const countElement = document.getElementById(`count-role-${role}`);
        if (countElement) countElement.textContent = count;
    });
}

/**
 * Render gallery with chunked loading for better performance
 */
function renderGallery() {
    if (!galleryGrid) return;

    const filtered = getFilteredPersons();

    if (visibleCount) {
        visibleCount.textContent = filtered.length;
    }

    updateFilterCounts();

    galleryGrid.innerHTML = '';

    if (galleryLoading) {
        galleryLoading.style.display = 'none';
    }

    // Show empty state if no results
    if (filtered.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #6c757d;">
                <i class="fas fa-filter" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <h3 style="margin: 0 0 8px 0; font-size: 1.2rem;">Keine Ergebnisse</h3>
                <p style="margin: 0; font-size: 0.95rem;">
                    Die aktuelle Filterkombination liefert keine Treffer.<br>
                    Versuche, einige Filter zu deaktivieren.
                </p>
            </div>
        `;
        galleryGrid.appendChild(emptyState);
        return;
    }

    // Render in chunks for better performance
    const chunkSize = 50;
    let currentIndex = 0;

    function renderChunk() {
        const fragment = document.createDocumentFragment();
        const end = Math.min(currentIndex + chunkSize, filtered.length);

        for (let i = currentIndex; i < end; i++) {
            const card = createPersonCard(filtered[i]);
            fragment.appendChild(card);
        }

        galleryGrid.appendChild(fragment);
        currentIndex = end;

        if (currentIndex < filtered.length) {
            requestAnimationFrame(renderChunk);
        }
    }

    renderChunk();
}

/**
 * Create person card
 */
function createPersonCard(person) {
    const card = document.createElement('div');
    card.className = 'person-card';

    // Create link wrapper
    const link = document.createElement('a');
    link.href = `person.html?id=${person.id}`;
    link.style.textDecoration = 'none';
    link.style.color = 'inherit';
    link.style.display = 'block';

    const wmData = person.gnd ? wikimediaData[person.gnd] : null;
    const hasImage = wmData && wmData.image_url;

    const imageDiv = document.createElement('div');
    imageDiv.className = 'card-image';

    if (hasImage) {
        const img = document.createElement('img');
        img.src = getWikimediaThumbnail(wmData.image_url, 300);
        img.alt = person.name;
        img.loading = 'lazy';
        img.onerror = () => {
            imageDiv.innerHTML = createPlaceholder(person.name);
        };
        imageDiv.appendChild(img);
    } else {
        imageDiv.innerHTML = createPlaceholder(person.name);
    }

    link.appendChild(imageDiv);

    const content = document.createElement('div');
    content.className = 'card-content';

    const name = document.createElement('h3');
    name.className = 'card-name';
    name.textContent = formatName(person.name);
    content.appendChild(name);

    if (person.dates) {
        const dates = document.createElement('p');
        dates.className = 'card-dates';
        dates.textContent = formatDates(person.dates);
        content.appendChild(dates);
    }

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    if (person.role && person.role !== 'indirect') {
        const roleBadge = document.createElement('span');
        roleBadge.className = `card-badge ${person.role}`;
        roleBadge.textContent = getRoleLabel(person.role);
        meta.appendChild(roleBadge);
    }

    if (person.letter_count > 0) {
        const letterBadge = document.createElement('span');
        letterBadge.className = 'card-badge letters';
        letterBadge.textContent = `${person.letter_count} Briefe`;
        meta.appendChild(letterBadge);
    }

    if (meta.children.length > 0) {
        content.appendChild(meta);
    }

    link.appendChild(content);
    card.appendChild(link);

    // Add bookmark button
    const inBasket = BasketManager.has(person.id);
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = `btn-bookmark ${inBasket ? 'in-basket' : ''}`;
    bookmarkBtn.dataset.id = person.id;
    bookmarkBtn.title = inBasket ? 'Aus Wissenskorb entfernen' : 'Zum Wissenskorb hinzufuegen';
    bookmarkBtn.innerHTML = `<i class="fas fa-bookmark"></i>`;
    bookmarkBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleBasket(person, bookmarkBtn);
    };

    card.appendChild(bookmarkBtn);
    return card;
}

// Helper functions
function createPlaceholder(name) {
    return `<div class="card-placeholder">
        <span class="placeholder-initials">${getInitials(name)}</span>
        <i class="fas fa-user placeholder-icon"></i>
    </div>`;
}

function getInitials(name) {
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || '??';
}

function formatName(name) {
    return name.replace(/\s*\([^)]*\)/g, '').trim();
}

function formatDates(dates) {
    if (!dates) return '';
    const birth = dates.birth || '?';
    const death = dates.death || '?';
    return `${birth} - ${death}`;
}

function getRoleLabel(role) {
    const labels = { 'sender': 'Absenderin', 'mentioned': 'Erwaehnt', 'both': 'Beides' };
    return labels[role] || role;
}

/**
 * Check if person has noble title in name
 */
function isAdelig(name) {
    if (!name) return false;
    const adelPatterns = [
        / von /i,
        / vom /i,
        /Gräfin/i,
        /Graefin/i,
        /Herzogin/i,
        /Fürstin/i,
        /Fuerstin/i,
        /Freifrau/i,
        /Freiin/i,
        /Baronin/i,
        /Baroness/i,
        /Prinzessin/i,
        /Landgräfin/i,
        /Markgräfin/i,
        /Großherzogin/i
    ];
    return adelPatterns.some(pattern => pattern.test(name));
}

/**
 * Check if person has specific occupation
 */
function hasOccupation(person, occupation) {
    if (!person.occupations || !Array.isArray(person.occupations)) return false;

    if (occupation === 'other') {
        // "Andere" = has occupation but not in top list
        return person.occupations.some(occ => {
            const name = occ.name || occ;
            return !topOccupations.some(top =>
                normalizeUmlauts(name).toLowerCase().includes(normalizeUmlauts(top).toLowerCase())
            );
        });
    }

    // Normalize search term and compare
    const searchNormalized = normalizeUmlauts(occupation).toLowerCase();

    return person.occupations.some(occ => {
        const name = normalizeUmlauts(occ.name || occ).toLowerCase();
        return name.includes(searchNormalized);
    });
}

/**
 * Normalize umlauts for comparison (ä->ae, ü->ue, ö->oe, ß->ss)
 */
function normalizeUmlauts(str) {
    if (!str) return '';
    return str
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/Ä/g, 'Ae')
        .replace(/Ö/g, 'Oe')
        .replace(/Ü/g, 'Ue')
        .replace(/ß/g, 'ss');
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Toggle person in/out of Wissenskorb
 */
function toggleBasket(person, button) {
    const inBasket = BasketManager.has(person.id);

    if (inBasket) {
        BasketManager.remove(person.id);
        button.classList.remove('in-basket');
        button.title = 'Zum Wissenskorb hinzufuegen';
        showToast(`${person.name} aus Wissenskorb entfernt`);
    } else {
        BasketManager.add(person);
        button.classList.add('in-basket');
        button.title = 'Aus Wissenskorb entfernen';
        const count = BasketManager.getCount();
        showToast(`${person.name} zum Wissenskorb hinzugefuegt (${count} Personen)`);
    }
}

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--color-text);
        color: var(--color-bg);
        padding: 12px 20px;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
