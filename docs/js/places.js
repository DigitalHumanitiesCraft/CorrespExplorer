// Places List Page
import { loadNavbar } from './navbar-loader.js';
import { loadPersons } from './data.js';
import { GlobalSearch } from './search.js';

let allPlaces = [];
let filteredPlaces = [];

async function init() {
    await loadNavbar();

    try {
        const data = await loadPersons();
        const allPersons = data.persons;

        // Initialize global search
        new GlobalSearch(allPersons);

        // Collect all unique places with person counts
        const placesMap = new Map();
        allPersons.forEach(person => {
            if (person.places) {
                person.places.forEach(place => {
                    const key = place.name;
                    if (!placesMap.has(key)) {
                        placesMap.set(key, {
                            name: place.name,
                            lat: place.lat,
                            lon: place.lon,
                            count: 0,
                            persons: []
                        });
                    }
                    placesMap.get(key).count++;
                    placesMap.get(key).persons.push({
                        id: person.id,
                        name: person.name
                    });
                });
            }
        });

        allPlaces = Array.from(placesMap.values());
        filteredPlaces = [...allPlaces];

        // Default sort by count (descending)
        filteredPlaces.sort((a, b) => b.count - a.count);

        renderList();
        initFilters();
    } catch (error) {
        console.error('Failed to load places:', error);
        document.getElementById('places-list').innerHTML = `
            <div class="error-message">
                <p>Fehler beim Laden der Daten.</p>
            </div>
        `;
    }
}

function renderList() {
    const container = document.getElementById('places-list');

    if (filteredPlaces.length === 0) {
        container.innerHTML = '<p>Keine Orte gefunden.</p>';
        return;
    }

    let html = '';
    filteredPlaces.forEach(place => {
        html += `
            <div class="list-item">
                <h3 class="list-item-title">
                    ${place.name}
                </h3>
                <div class="list-item-stats">
                    <div class="list-item-stat">
                        <strong>${place.count}</strong> ${place.count === 1 ? 'Person' : 'Personen'}
                    </div>
                </div>
                <details style="margin-top: 12px;">
                    <summary style="cursor: pointer; color: var(--color-text-light); font-size: 14px;">
                        Personen anzeigen
                    </summary>
                    <ul style="margin-top: 8px; padding-left: 20px; font-size: 14px;">
                        ${place.persons.map(p => `
                            <li><a href="person.html?id=${p.id}">${p.name}</a></li>
                        `).join('')}
                    </ul>
                </details>
            </div>
        `;
    });

    container.innerHTML = html;
}

function initFilters() {
    const searchInput = document.getElementById('search-list');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filteredPlaces = allPlaces.filter(place =>
                place.name.toLowerCase().includes(query)
            );
            sortAndRender();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            sortAndRender();
        });
    }
}

function sortAndRender() {
    const sortSelect = document.getElementById('sort-select');
    const sortBy = sortSelect?.value || 'name';

    switch (sortBy) {
        case 'name':
            filteredPlaces.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            break;
        case 'count':
            filteredPlaces.sort((a, b) => b.count - a.count);
            break;
    }

    renderList();
}

init();
