// Places View - Extracted from explore.js
// Place browsing, filtering and coordinate resolution

import { escapeHtml, debounce } from '../utils.js';
import { getPlacePrecisionClass } from '../formatters.js';
import { elements } from '../dom-cache.js';
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../constants.js';

// Module state
let placesIndex = {};
let selectedPlaceId = null;
let placesSearchTerm = '';
let placesSortOrder = 'count-desc';

// Injected dependencies
let getFilteredLetters = null;
let getAllLetters = null;
let getDataIndices = null;
let applyPlaceFilter = null;
let switchView = null;
let basketAdd = null;
let basketIsInBasket = null;
let showToast = null;
let log = null;

// Callbacks for data updates
let onDataUpdated = null;

/**
 * Initialize places view with dependencies
 */
export function initPlacesView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    getAllLetters = deps.getAllLetters;
    getDataIndices = deps.getDataIndices;
    applyPlaceFilter = deps.applyPlaceFilter;
    switchView = deps.switchView;
    basketAdd = deps.basketAdd;
    basketIsInBasket = deps.basketIsInBasket;
    showToast = deps.showToast;
    onDataUpdated = deps.onDataUpdated;
    log = deps.log || { init: () => {}, event: () => {} };

    buildPlacesIndex();

    const searchInput = elements.getById('place-search');
    const sortSelect = elements.getById('place-sort');

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            placesSearchTerm = e.target.value.toLowerCase();
            renderPlacesList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            placesSortOrder = e.target.value;
            renderPlacesList();
        });
    }

    // Filter button
    const filterBtn = elements.getById('place-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (selectedPlaceId && applyPlaceFilter) {
                applyPlaceFilter(selectedPlaceId);
                if (switchView) switchView('letters');
            }
        });
    }

    // Add to basket button
    const addBasketBtn = elements.getById('place-add-basket-btn');
    if (addBasketBtn) {
        addBasketBtn.addEventListener('click', () => {
            const letterIdsJson = addBasketBtn.dataset.letterIds;
            if (!letterIdsJson || !basketAdd || !basketIsInBasket) return;

            const letterIds = JSON.parse(letterIdsJson);
            let addedCount = 0;
            letterIds.forEach(id => {
                if (!basketIsInBasket('letters', id)) {
                    basketAdd('letters', id);
                    addedCount++;
                }
            });

            if (addedCount > 0 && showToast) {
                showToast(`${addedCount} Briefe zum Korb hinzugefuegt`);
            } else if (showToast) {
                showToast('Alle Briefe bereits im Korb');
            }
        });
    }

    // Resolve coordinates button
    const resolveBtn = elements.getById('resolve-coords-btn');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', handleResolveCoordinates);
    }

    // Update missing coordinates banner
    updateMissingCoordinatesBanner();

    log.init(`Places view initialized: ${Object.keys(placesIndex).length} places`);
}

/**
 * Build places index from all letters
 */
function buildPlacesIndex() {
    placesIndex = {};
    const allLetters = getAllLetters();

    allLetters.forEach(letter => {
        if (!letter.place_sent?.name) return;

        // Use geonames_id if available, otherwise create ID from name
        const placeId = letter.place_sent.geonames_id || `name:${letter.place_sent.name}`;
        const hasCoordinates = letter.place_sent.lat != null && letter.place_sent.lon != null;
        const precision = letter.place_sent.precision || (hasCoordinates ? 'exact' : 'region');

        if (!placesIndex[placeId]) {
            placesIndex[placeId] = {
                id: placeId,
                name: letter.place_sent.name,
                lat: letter.place_sent.lat,
                lon: letter.place_sent.lon,
                geonames_id: letter.place_sent.geonames_id,
                precision: precision,
                hasCoordinates: hasCoordinates,
                letterCount: 0,
                letters: [],
                senders: {},
                languages: {},
                years: []
            };
        }

        placesIndex[placeId].letterCount++;
        placesIndex[placeId].letters.push(letter.id);
        if (letter.year) placesIndex[placeId].years.push(letter.year);

        if (letter.sender?.name) {
            const senderName = letter.sender.name;
            placesIndex[placeId].senders[senderName] = (placesIndex[placeId].senders[senderName] || 0) + 1;
        }

        if (letter.language?.code) {
            const langCode = letter.language.code;
            placesIndex[placeId].languages[langCode] = (placesIndex[placeId].languages[langCode] || 0) + 1;
        }
    });

    // Calculate top senders and year range for each place
    Object.values(placesIndex).forEach(place => {
        place.topSenders = Object.entries(place.senders)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
        place.senderCount = Object.keys(place.senders).length;
        place.yearMin = place.years.length > 0 ? Math.min(...place.years) : null;
        place.yearMax = place.years.length > 0 ? Math.max(...place.years) : null;
    });
}

/**
 * Render the places list
 */
export function renderPlacesList() {
    const container = elements.placesList;
    if (!container) return;

    const filteredLetters = getFilteredLetters();

    // Get places filtered by current filters
    const filteredPlaceIds = new Set();
    filteredLetters.forEach(letter => {
        if (letter.place_sent?.name) {
            const placeId = letter.place_sent.geonames_id || `name:${letter.place_sent.name}`;
            filteredPlaceIds.add(placeId);
        }
    });

    // Count letters per place in filtered set
    const filteredPlaceCounts = {};
    filteredLetters.forEach(letter => {
        if (letter.place_sent?.name) {
            const placeId = letter.place_sent.geonames_id || `name:${letter.place_sent.name}`;
            filteredPlaceCounts[placeId] = (filteredPlaceCounts[placeId] || 0) + 1;
        }
    });

    let places = Object.values(placesIndex)
        .filter(place => filteredPlaceIds.has(place.id))
        .map(place => ({
            ...place,
            filteredCount: filteredPlaceCounts[place.id] || 0
        }));

    // Apply search filter
    if (placesSearchTerm) {
        places = places.filter(place =>
            place.name.toLowerCase().includes(placesSearchTerm)
        );
    }

    // Apply sort
    switch (placesSortOrder) {
        case 'count-desc':
            places.sort((a, b) => b.filteredCount - a.filteredCount);
            break;
        case 'count-asc':
            places.sort((a, b) => a.filteredCount - b.filteredCount);
            break;
        case 'name-asc':
            places.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            break;
        case 'name-desc':
            places.sort((a, b) => b.name.localeCompare(a.name, 'de'));
            break;
    }

    // Render list with precision indicators
    container.innerHTML = places.map(place => {
        const isActive = selectedPlaceId === place.id;
        const yearRange = place.yearMin && place.yearMax
            ? `${place.yearMin}-${place.yearMax}`
            : '';
        const precisionClass = getPlacePrecisionClass(place.precision);
        const noCoordIcon = !place.hasCoordinates ? '<i class="fas fa-question-circle" title="Ohne Koordinaten"></i> ' : '';
        return `
            <div class="entity-card ${isActive ? 'active' : ''} ${precisionClass}" data-place-id="${place.id}">
                <div class="entity-card-info">
                    <div class="entity-card-name ${precisionClass}" title="${escapeHtml(place.name)}">${noCoordIcon}${escapeHtml(place.name)}</div>
                    <div class="entity-card-meta">${place.senderCount} Absender ${yearRange ? `| ${yearRange}` : ''}</div>
                </div>
                <div class="entity-card-count">${place.filteredCount}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.entity-card').forEach(card => {
        card.addEventListener('click', () => {
            const placeId = card.dataset.placeId;
            selectPlace(placeId);
        });
    });
}

/**
 * Select a place and show its details
 */
function selectPlace(placeId) {
    selectedPlaceId = placeId;
    const place = placesIndex[placeId];

    if (!place) return;

    const filteredLetters = getFilteredLetters();

    // Update active state in list
    document.querySelectorAll('.entity-card[data-place-id]').forEach(card => {
        card.classList.toggle('active', card.dataset.placeId === placeId);
    });

    // Show detail panel
    const emptyState = elements.getById('place-detail-empty');
    const content = elements.getById('place-detail-content');

    if (emptyState) emptyState.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    // Calculate filtered count for this place
    const filteredCount = filteredLetters.filter(l => {
        if (!l.place_sent?.name) return false;
        const letterPlaceId = l.place_sent.geonames_id || `name:${l.place_sent.name}`;
        return letterPlaceId === placeId;
    }).length;

    // Update title and count
    const titleEl = elements.getById('place-detail-title');
    const countEl = elements.getById('place-detail-count');
    if (titleEl) titleEl.textContent = place.name;
    if (countEl) countEl.textContent = `${filteredCount} Briefe`;

    // Render top senders
    const sendersContainer = elements.getById('place-top-senders');
    if (sendersContainer) {
        const maxCount = place.topSenders.length > 0 ? place.topSenders[0].count : 1;
        sendersContainer.innerHTML = place.topSenders.map(s => {
            const barWidth = (s.count / maxCount) * 100;
            return `<div class="entity-stat-row">
                <span class="entity-stat-name">${escapeHtml(s.name)}</span>
                <span class="entity-stat-count">${s.count}</span>
                <div class="entity-stat-bar">
                    <div class="entity-stat-bar-fill" style="width: ${barWidth}%"></div>
                </div>
            </div>`;
        }).join('');
    }

    // Render mini timeline
    const timelineContainer = elements.getById('place-timeline');
    if (timelineContainer && place.yearMin && place.yearMax) {
        const yearCounts = {};
        place.years.forEach(year => {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(yearCounts));
        const years = [];
        for (let y = place.yearMin; y <= place.yearMax; y++) {
            years.push({ year: y, count: yearCounts[y] || 0 });
        }

        timelineContainer.innerHTML = years.map(y => {
            const height = y.count > 0 ? Math.max(4, (y.count / maxCount) * 100) : 0;
            return `<div class="entity-mini-timeline-bar" style="height: ${height}%" title="${y.year}: ${y.count}"></div>`;
        }).join('');
    } else if (timelineContainer) {
        timelineContainer.innerHTML = '<p class="no-data">Keine Zeitdaten</p>';
    }

    // Render languages
    const languagesContainer = elements.getById('place-languages');
    if (languagesContainer) {
        const langEntries = Object.entries(place.languages)
            .sort((a, b) => b[1] - a[1]);

        languagesContainer.innerHTML = langEntries.map(([code, count]) => {
            const label = LANGUAGE_LABELS[code] || code.toUpperCase();
            const color = LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other;
            return `<span class="entity-tag" style="border-left: 3px solid ${color}">${label} (${count})</span>`;
        }).join('');
    }

    // Update GeoNames link
    const geonamesLink = elements.getById('place-geonames-link');
    if (geonamesLink && place.geonames_id) {
        geonamesLink.href = `https://www.geonames.org/${place.geonames_id}`;
        geonamesLink.style.display = '';
    } else if (geonamesLink) {
        geonamesLink.style.display = 'none';
    }

    // Update basket button count and handler
    const basketCountSpan = elements.getById('place-basket-count');
    if (basketCountSpan) {
        basketCountSpan.textContent = filteredCount;
    }

    // Store letter IDs for this place for basket add
    const placeLetterIds = filteredLetters.filter(l => {
        if (!l.place_sent?.name) return false;
        const letterPlaceId = l.place_sent.geonames_id || `name:${l.place_sent.name}`;
        return letterPlaceId === placeId;
    }).map(l => l.id);

    // Update basket button
    const addBasketBtn = elements.getById('place-add-basket-btn');
    if (addBasketBtn) {
        addBasketBtn.dataset.letterIds = JSON.stringify(placeLetterIds);
    }
}

/**
 * Update missing coordinates banner in Places View
 */
export function updateMissingCoordinatesBanner() {
    const banner = elements.getById('places-missing-coords-banner');
    const countSpan = elements.getById('places-missing-count');

    if (!banner || !countSpan) return;

    // Count places without coordinates that have GeoNames IDs
    let missingCount = 0;
    const missingIds = [];

    Object.values(placesIndex).forEach(place => {
        if (!place.lat && place.geonames_id) {
            missingCount++;
            missingIds.push(place.geonames_id);
        }
    });

    if (missingCount > 0) {
        countSpan.textContent = missingCount;
        banner.classList.remove('hidden');
        banner.dataset.missingIds = JSON.stringify(missingIds);
    } else {
        banner.classList.add('hidden');
    }
}

/**
 * Handle coordinate resolution button click
 */
async function handleResolveCoordinates() {
    const banner = elements.getById('places-missing-coords-banner');
    const btn = elements.getById('resolve-coords-btn');

    if (!banner || !btn) return;

    const missingIds = JSON.parse(banner.dataset.missingIds || '[]');

    if (missingIds.length === 0) {
        if (showToast) showToast('Keine Orte zum Aufloesen gefunden', 'info');
        return;
    }

    // Disable button and show loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lade Koordinaten...';

    try {
        // Dynamically import the geonames enrichment module
        const { resolveGeoNamesCoordinates, applyCoordinatesToData } = await import('../geonames-enrichment.js');

        // Resolve coordinates
        const coordinates = await resolveGeoNamesCoordinates(missingIds, (loaded, total) => {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loaded}/${total}`;
        });

        // Apply coordinates to current data
        const allLetters = getAllLetters();
        const dataIndices = getDataIndices();
        const currentData = {
            letters: allLetters,
            indices: dataIndices
        };

        applyCoordinatesToData(currentData, coordinates);

        // Update sessionStorage with new coordinates
        const storedData = JSON.parse(sessionStorage.getItem('cmif-data') || '{}');
        storedData.letters = allLetters;
        storedData.indices = dataIndices;
        sessionStorage.setItem('cmif-data', JSON.stringify(storedData));

        // Rebuild places index
        buildPlacesIndex();
        renderPlacesList();

        // Notify parent about data update
        if (onDataUpdated) {
            onDataUpdated(coordinates);
        }

        const resolvedCount = Object.keys(coordinates).length;
        if (showToast) showToast(`${resolvedCount} Orte erfolgreich georeferenziert`, 'success');

        // Update banner
        updateMissingCoordinatesBanner();

    } catch (error) {
        console.error('Failed to resolve coordinates:', error);
        if (showToast) showToast(`Fehler beim Aufloesen: ${error.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-globe"></i> Koordinaten nachladen';
    }
}

/**
 * Get the places index
 */
export function getPlacesIndex() {
    return placesIndex;
}

/**
 * Get the currently selected place ID
 */
export function getSelectedPlaceId() {
    return selectedPlaceId;
}

/**
 * Set the selected place ID (for external control)
 */
export function setSelectedPlaceId(id) {
    selectedPlaceId = id;
}

/**
 * Rebuild the places index (call after data changes)
 */
export function rebuildPlacesIndex() {
    buildPlacesIndex();
}

/**
 * Reset places view state
 */
export function resetPlacesState() {
    selectedPlaceId = null;
    placesSearchTerm = '';
    placesSortOrder = 'count-desc';

    const emptyState = elements.getById('place-detail-empty');
    const content = elements.getById('place-detail-content');
    if (emptyState) emptyState.classList.remove('hidden');
    if (content) content.classList.add('hidden');
}
