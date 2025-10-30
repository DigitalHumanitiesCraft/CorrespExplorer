// People List Page
import { loadNavbar } from './navbar-loader.js';
import { loadPersons } from './data.js';

let allPersons = [];
let filteredPersons = [];

async function init() {
    await loadNavbar();

    try {
        const data = await loadPersons();
        allPersons = data.persons;
        filteredPersons = [...allPersons];

        renderList();
        initFilters();

        console.log(`✅ Loaded ${allPersons.length} persons`);
    } catch (error) {
        console.error('❌ Failed to load persons:', error);
        document.getElementById('people-list').innerHTML = `
            <div class="error-message">
                <p>Fehler beim Laden der Daten.</p>
            </div>
        `;
    }
}

function renderList() {
    const container = document.getElementById('people-list');

    if (filteredPersons.length === 0) {
        container.innerHTML = '<p>Keine Personen gefunden.</p>';
        return;
    }

    let html = '';
    filteredPersons.forEach(person => {
        const dates = person.dates
            ? `${person.dates.birth || '?'} – ${person.dates.death || '?'}`
            : 'Lebensdaten unbekannt';

        const letterCount = person.letters?.length || 0;
        const mentionCount = person.mentioned_in?.length || 0;
        const totalCount = letterCount + mentionCount;

        const occupation = person.occupation?.[0] || 'Keine Angabe';
        const place = person.places?.[0]?.name || 'Unbekannt';

        html += `
            <div class="list-item">
                <h3 class="list-item-title">
                    <a href="person.html?id=${person.id}">${person.name}</a>
                </h3>
                <div class="list-item-meta">${dates}</div>
                <div class="list-item-meta">${occupation}</div>
                <div class="list-item-meta">${place}</div>
                <div class="list-item-stats">
                    <div class="list-item-stat">
                        <strong>${totalCount}</strong> ${totalCount === 1 ? 'Brief' : 'Briefe'}
                    </div>
                </div>
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
            filteredPersons = allPersons.filter(person =>
                person.name.toLowerCase().includes(query)
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
            filteredPersons.sort((a, b) => a.name.localeCompare(b.name, 'de'));
            break;
        case 'letters':
            filteredPersons.sort((a, b) => {
                const countA = (a.letters?.length || 0) + (a.mentioned_in?.length || 0);
                const countB = (b.letters?.length || 0) + (b.mentioned_in?.length || 0);
                return countB - countA;
            });
            break;
        case 'birth':
            filteredPersons.sort((a, b) => {
                const yearA = a.dates?.birth ? parseInt(a.dates.birth) : 9999;
                const yearB = b.dates?.birth ? parseInt(b.dates.birth) : 9999;
                return yearA - yearB;
            });
            break;
    }

    renderList();
}

init();
