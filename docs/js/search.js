// HerData - Global Search Functionality

export class GlobalSearch {
    constructor(persons) {
        this.persons = persons;
        this.searchInput = document.getElementById('global-search');
        this.searchResults = document.getElementById('search-results');
        this.currentFocus = -1;

        this.initEventListeners();
    }

    initEventListeners() {
        // Input event for search
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyboardNav(e);
        });

        // Close results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-search')) {
                this.hideResults();
            }
        });

        // Escape key closes results
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideResults();
                this.searchInput.blur();
            }
        });
    }

    handleSearch(query) {
        if (!query || query.length < 2) {
            this.hideResults();
            return;
        }

        const results = this.searchPersons(query);
        this.displayResults(results, query);
    }

    searchPersons(query) {
        const lowerQuery = query.toLowerCase();

        return this.persons
            .filter(person => {
                const name = person.name.toLowerCase();
                return name.includes(lowerQuery);
            })
            .slice(0, 10) // Limit to 10 results
            .sort((a, b) => {
                // Sort: exact match first, then by name
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aStarts = aName.startsWith(lowerQuery);
                const bStarts = bName.startsWith(lowerQuery);

                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return aName.localeCompare(bName);
            });
    }

    displayResults(results, query) {
        this.currentFocus = -1;

        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="search-no-results">
                    Keine Ergebnisse für "${query}"
                </div>
            `;
            this.searchResults.classList.add('active');
            return;
        }

        this.searchResults.innerHTML = results.map((person, index) => {
            const meta = this.getPersonMeta(person);
            return `
                <a
                    href="person.html?id=${person.id}"
                    class="search-result-item"
                    role="option"
                    data-index="${index}"
                    aria-label="Zur Person ${person.name} navigieren"
                >
                    <div class="search-result-name">${this.highlightMatch(person.name, query)}</div>
                    ${meta ? `<div class="search-result-meta">${meta}</div>` : ''}
                </a>
            `;
        }).join('');

        this.searchResults.classList.add('active');

        // Add click handlers
        this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                this.hideResults();
                this.searchInput.value = '';
            });
        });
    }

    highlightMatch(text, query) {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        return text.substring(0, index) +
               '<strong>' + text.substring(index, index + query.length) + '</strong>' +
               text.substring(index + query.length);
    }

    getPersonMeta(person) {
        const parts = [];

        if (person.dates && (person.dates.birth || person.dates.death)) {
            const birth = person.dates.birth || '?';
            const death = person.dates.death || '?';
            parts.push(`${birth}–${death}`);
        }

        if (person.letter_count) {
            parts.push(`${person.letter_count} Briefe`);
        } else if (person.mention_count) {
            parts.push(`${person.mention_count} Erwähnungen`);
        }

        if (person.occupations && person.occupations.length > 0) {
            parts.push(person.occupations[0].name);
        }

        return parts.join(' • ');
    }

    handleKeyboardNav(e) {
        const items = this.searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.currentFocus++;
            if (this.currentFocus >= items.length) this.currentFocus = 0;
            this.setActive(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.currentFocus--;
            if (this.currentFocus < 0) this.currentFocus = items.length - 1;
            this.setActive(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.currentFocus > -1) {
                items[this.currentFocus].click();
            }
        }
    }

    setActive(items) {
        items.forEach((item, index) => {
            if (index === this.currentFocus) {
                item.focus();
                item.setAttribute('aria-selected', 'true');
            } else {
                item.removeAttribute('aria-selected');
            }
        });
    }

    hideResults() {
        this.searchResults.classList.remove('active');
        this.currentFocus = -1;
    }
}
