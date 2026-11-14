// Places View
// Place browsing, filtering and coordinate resolution

import { escapeHtml, debounce, showToast, placeKey, personKey } from '../utils.js';
import { addEntityToBasket } from '../basket.js';
import { getPlacePrecisionClass } from '../formatters.js';
import { elements } from '../dom-cache.js';
import { LANGUAGE_COLORS, languageLabel } from '../constants.js';

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
    onDataUpdated = deps.onDataUpdated;

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
            if (!selectedPlaceId) return;
            showToast(addEntityToBasket('places', selectedPlaceId));
        });
    }

    // Resolve coordinates button
    const resolveBtn = elements.getById('resolve-coords-btn');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', handleResolveCoordinates);
    }

    // Update missing coordinates banner
    updateMissingCoordinatesBanner();
}

function buildPlacesIndex() {
    placesIndex = indexPlaces(getAllLetters());
}

/**
 * Index of the sending places of the given letters, keyed with placeKey like the parser index and
 * the place filter of the state manager (ADR-001). Names stay as the source gives them: the tool
 * does not merge or normalise places (project.md, scope).
 * @param {Array} letters
 * @returns {Object<string, Object>}
 */
export function indexPlaces(letters) {
    const index = {};

    letters.forEach(letter => {
        if (!letter.place_sent?.name) return;

        const placeId = placeKey(letter.place_sent);
        const hasCoordinates = letter.place_sent.lat != null && letter.place_sent.lon != null;
        const precision = letter.place_sent.precision || (hasCoordinates ? 'exact' : 'region');

        if (!index[placeId]) {
            index[placeId] = {
                id: placeId,
                name: letter.place_sent.name,
                lat: letter.place_sent.lat,
                lon: letter.place_sent.lon,
                geonames_id: letter.place_sent.geonames_id,
                precision: precision,
                hasCoordinates: hasCoordinates,
                letterCount: 0,
                senders: new Set(),
                years: []
            };
        }

        const place = index[placeId];
        place.letterCount++;
        if (letter.year) place.years.push(letter.year);
        const senderId = personKey(letter.sender);
        if (senderId) place.senders.add(senderId);
    });

    // Sender count and year range over all letters describe the place itself in the list
    Object.values(index).forEach(place => {
        place.senderCount = place.senders.size;
        place.yearMin = place.years.length > 0 ? Math.min(...place.years) : null;
        place.yearMax = place.years.length > 0 ? Math.max(...place.years) : null;
    });
    return index;
}

/**
 * Whether the places of an index have coordinates: 'all', 'none' or 'mixed'. Only a mixed
 * dataset marks the single place without coordinates; where none has any, that is the normal
 * case and is said once for the whole list (design.md, Markierung nur an unsicheren Werten).
 * @param {Object<string, Object>} index - from indexPlaces
 * @returns {'all'|'none'|'mixed'}
 */
export function coordinateCoverage(index) {
    const places = Object.values(index);
    const located = places.filter(p => p.hasCoordinates).length;
    if (located === places.length) return 'all';
    return located === 0 ? 'none' : 'mixed';
}

/**
 * Letters per place in a letter set, with the number whose place the edition inferred, and the
 * letters without any sending place
 * @param {Array} letters
 * @returns {{counts: Object<string, {count: number, inferred: number}>, withoutPlace: number}}
 */
export function countLettersByPlace(letters) {
    const counts = {};
    let withoutPlace = 0;
    letters.forEach(letter => {
        if (!letter.place_sent?.name) {
            withoutPlace++;
            return;
        }
        const entry = counts[placeKey(letter.place_sent)] ||= { count: 0, inferred: 0 };
        entry.count++;
        if (letter.place_sent.inferred) entry.inferred++;
    });
    return { counts, withoutPlace };
}

/**
 * Show the letters of a place whose sending place the edition inferred. The places view has no
 * handle on the sidebar filter state, so it sets the existing checkbox of the feature filter and
 * lets its own change handler apply it; the checkbox exists only when the dataset has such letters.
 */
function showInferredLetters(placeId) {
    const checkbox = document.querySelector('input[name="feature"][value="placeInferred"]');
    if (!checkbox || !applyPlaceFilter) return;
    if (!checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    }
    applyPlaceFilter(placeId);
    if (switchView) switchView('letters');
}

/**
 * Letters of the current filter sent from one place
 */
function filteredLettersOfPlace(placeId) {
    return getFilteredLetters().filter(l => l.place_sent?.name && placeKey(l.place_sent) === placeId);
}

/**
 * Render the places list
 */
export function renderPlacesList() {
    const container = elements.placesList;
    if (!container) return;

    const { counts, withoutPlace } = countLettersByPlace(getFilteredLetters());
    const coverage = coordinateCoverage(placesIndex);
    renderPlacesNote(coverage, Object.keys(counts).length, withoutPlace);

    let places = Object.values(placesIndex)
        .filter(place => counts[place.id]?.count > 0)
        .map(place => ({
            ...place,
            filteredCount: counts[place.id].count,
            inferredCount: counts[place.id].inferred
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

    // Missing coordinates are marked per place only where other places have them
    const markMissing = coverage === 'mixed';
    container.innerHTML = places.map(place => {
        const isActive = selectedPlaceId === place.id;
        const yearRange = place.yearMin && place.yearMax
            ? `${place.yearMin}-${place.yearMax}`
            : '';
        const precisionClass = markMissing || place.precision === 'unknown' ? getPlacePrecisionClass(place.precision) : '';
        const noCoordIcon = markMissing && !place.hasCoordinates ? '<i class="fas fa-question-circle" title="Ohne Koordinaten"></i> ' : '';
        const meta = [`${place.senderCount} Absender`, yearRange,
            place.inferredCount > 0 ? `davon ${place.inferredCount} erschlossen` : ''].filter(Boolean).join(' | ');
        return `
            <div class="entity-card ${isActive ? 'active' : ''} ${precisionClass}" role="button" tabindex="0" aria-pressed="${isActive}" data-place-id="${escapeHtml(place.id)}">
                <div class="entity-card-info">
                    <div class="entity-card-name ${precisionClass}" title="${escapeHtml(place.name)}">${noCoordIcon}${escapeHtml(place.name)}</div>
                    <div class="entity-card-meta">${meta}</div>
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

    // The open detail follows the filter like the list, otherwise its numbers would contradict the list
    if (selectedPlaceId) {
        if (counts[selectedPlaceId]) {
            renderPlaceDetail(selectedPlaceId);
        } else {
            clearPlaceDetail();
        }
    }
}

/**
 * One sentence each for what holds for the whole list instead of for single places: that no
 * place has coordinates, and how many letters name no sending place
 */
function renderPlacesNote(coverage, placeCount, withoutPlace) {
    const note = elements.getById('places-note');
    if (!note) return;
    const sentences = [];
    if (coverage === 'none' && placeCount > 0) {
        sentences.push(`Der Datensatz nennt für keinen seiner ${Object.keys(placesIndex).length.toLocaleString('de-DE')} Absendeorte Koordinaten. Die Orte stehen deshalb nur in dieser Liste, nicht auf der Karte.`);
    }
    if (withoutPlace > 0) {
        sentences.push(withoutPlace === 1
            ? '1 Brief nennt keinen Absendeort und fehlt in dieser Liste.'
            : `${withoutPlace.toLocaleString('de-DE')} Briefe nennen keinen Absendeort und fehlen in dieser Liste.`);
    }
    note.textContent = sentences.join(' ');
    note.classList.toggle('hidden', sentences.length === 0);
}

/**
 * Select a place and show its details
 */
function selectPlace(placeId) {
    if (!placesIndex[placeId]) return;
    selectedPlaceId = placeId;

    document.querySelectorAll('.entity-card[data-place-id]').forEach(card => {
        const active = card.dataset.placeId === placeId;
        card.classList.toggle('active', active);
        card.setAttribute('aria-pressed', String(active));
    });

    renderPlaceDetail(placeId);
}

/**
 * Close the detail when the selected place has no letters under the current filter
 */
function clearPlaceDetail() {
    selectedPlaceId = null;
    elements.getById('place-detail-empty')?.classList.remove('hidden');
    elements.getById('place-detail-content')?.classList.add('hidden');
}

/**
 * Render the detail panel of a place from the filtered letters, so count, senders, years
 * and languages describe the same letter set
 */
function renderPlaceDetail(placeId) {
    const place = placesIndex[placeId];
    if (!place) return;

    const placeLetters = filteredLettersOfPlace(placeId);
    const filteredCount = placeLetters.length;

    const senders = new Map();
    const yearCounts = {};
    const languages = {};
    placeLetters.forEach(letter => {
        const senderId = personKey(letter.sender);
        if (senderId) {
            const entry = senders.get(senderId) || { name: letter.sender.name || senderId, count: 0 };
            entry.count++;
            senders.set(senderId, entry);
        }
        if (letter.year) yearCounts[letter.year] = (yearCounts[letter.year] || 0) + 1;
        if (letter.language?.code) {
            languages[letter.language.code] = (languages[letter.language.code] || 0) + 1;
        }
    });
    const topSenders = [...senders.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    const emptyState = elements.getById('place-detail-empty');
    const content = elements.getById('place-detail-content');
    if (emptyState) emptyState.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    const titleEl = elements.getById('place-detail-title');
    const countEl = elements.getById('place-detail-count');
    if (titleEl) titleEl.textContent = place.name;
    if (countEl) {
        // The inferred number leads to exactly those letters, through the existing feature filter
        const inferredCount = placeLetters.filter(l => l.place_sent.inferred).length;
        const canShow = inferredCount > 0 && document.querySelector('input[name="feature"][value="placeInferred"]');
        countEl.innerHTML = `${filteredCount.toLocaleString('de-DE')} ${filteredCount === 1 ? 'Brief' : 'Briefe'}` + (inferredCount === 0 ? ''
            : canShow ? `, davon <button type="button" class="view-header__link place-inferred-btn" title="Briefe dieses Orts zeigen, deren Ort die Edition erschlossen hat">${inferredCount} erschlossen</button>`
            : `, davon ${inferredCount} erschlossen`);
        // The button is rebuilt with the count, so it is found in its container, not via the id cache
        countEl.querySelector('.place-inferred-btn')?.addEventListener('click', () => showInferredLetters(placeId));
    }

    const sendersContainer = elements.getById('place-top-senders');
    if (sendersContainer) {
        const maxCount = topSenders.length > 0 ? topSenders[0].count : 1;
        sendersContainer.innerHTML = topSenders.map(s => {
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

    const timelineContainer = elements.getById('place-timeline');
    const years = Object.keys(yearCounts).map(Number);
    if (timelineContainer && years.length > 0) {
        const yearMin = Math.min(...years);
        const yearMax = Math.max(...years);
        const maxCount = Math.max(...Object.values(yearCounts));
        const bars = [];
        for (let y = yearMin; y <= yearMax; y++) {
            const count = yearCounts[y] || 0;
            const height = count > 0 ? Math.max(4, (count / maxCount) * 100) : 0;
            bars.push(`<div class="entity-mini-timeline-bar" style="height: ${height}%" title="${y}: ${count}"></div>`);
        }
        timelineContainer.innerHTML = bars.join('');
    } else if (timelineContainer) {
        timelineContainer.innerHTML = '<p class="no-data">Keine Zeitdaten</p>';
    }

    const languagesContainer = elements.getById('place-languages');
    if (languagesContainer) {
        // A dataset without language data would leave an empty section under its heading
        languagesContainer.closest('.entity-detail-section')?.classList.toggle('hidden', Object.keys(languages).length === 0);
        languagesContainer.innerHTML = Object.entries(languages)
            .sort((a, b) => b[1] - a[1])
            .map(([code, count]) => {
                const color = LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other;
                return `<span class="entity-tag" style="border-left: 3px solid ${color}">${escapeHtml(languageLabel(code))} (${count})</span>`;
            }).join('');
    }

    const geonamesLink = elements.getById('place-geonames-link');
    if (geonamesLink && place.geonames_id) {
        geonamesLink.href = `https://www.geonames.org/${encodeURIComponent(place.geonames_id)}`;
        geonamesLink.style.display = '';
    } else if (geonamesLink) {
        geonamesLink.style.display = 'none';
    }

}

/**
 * Update missing coordinates banner in Places View
 */
function updateMissingCoordinatesBanner() {
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
        showToast('Keine Orte zum Auflösen gefunden');
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

        // Keep an uploaded dataset in sessionStorage current; a ?json= dataset is not stored there,
        // and a quota error must not turn the successful resolution into a failure
        const stored = sessionStorage.getItem('cmif-data');
        if (stored) {
            try {
                sessionStorage.setItem('cmif-data', JSON.stringify({ ...JSON.parse(stored), letters: allLetters, indices: dataIndices }));
            } catch (storageError) {
                console.warn('Resolved coordinates not stored in sessionStorage', storageError);
            }
        }

        // Rebuild places index
        buildPlacesIndex();
        renderPlacesList();

        // Notify parent about data update
        if (onDataUpdated) {
            onDataUpdated(coordinates);
        }

        const resolvedCount = Object.keys(coordinates).length;
        showToast(`${resolvedCount} Orte erfolgreich georeferenziert`);

        // Update banner
        updateMissingCoordinatesBanner();

    } catch (error) {
        console.error('Failed to resolve coordinates:', error);
        showToast(`Fehler beim Auflösen: ${error.message}`);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-globe"></i> Koordinaten nachladen';
    }
}
