// Stats Cards Click Handlers
export function initStatsCards(allPersons) {
    const womenCard = document.getElementById('stat-card-women');
    const placesCard = document.getElementById('stat-card-places');

    if (womenCard) {
        womenCard.addEventListener('click', () => showWomenList(allPersons));
    }

    if (placesCard) {
        placesCard.addEventListener('click', () => showPlacesList(allPersons));
    }

    // Modal close handlers
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
}

function showWomenList(allPersons) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');

    title.textContent = 'Alle Frauen (448)';

    let html = '<ul class="modal-list">';
    allPersons.forEach(person => {
        const dates = person.dates ? `${person.dates.birth || '?'} – ${person.dates.death || '?'}` : 'Lebensdaten unbekannt';
        html += `<li>`;
        html += `<a href="person.html?id=${person.id}">${person.name}</a>`;
        html += `<div class="modal-list-meta">${dates}</div>`;
        html += `</li>`;
    });
    html += '</ul>';

    content.innerHTML = html;
    modal.style.display = 'flex';
}

function showPlacesList(allPersons) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');

    title.textContent = 'Alle Orte (227)';

    // Collect all unique places
    const placesMap = new Map();
    allPersons.forEach(person => {
        if (person.places) {
            person.places.forEach(place => {
                const key = place.name;
                if (!placesMap.has(key)) {
                    placesMap.set(key, { name: place.name, count: 0, persons: [] });
                }
                placesMap.get(key).count++;
                placesMap.get(key).persons.push(person.name);
            });
        }
    });

    // Sort by count
    const places = Array.from(placesMap.values()).sort((a, b) => b.count - a.count);

    let html = '<ul class="modal-list">';
    places.forEach(place => {
        html += `<li>`;
        html += `<strong>${place.name}</strong>`;
        html += `<div class="modal-list-meta">${place.count} ${place.count === 1 ? 'Person' : 'Personen'}</div>`;
        html += `</li>`;
    });
    html += '</ul>';

    content.innerHTML = html;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) {
        modal.style.display = 'none';
    }
}
