// HerData - Global Search Functionality

export class GlobalSearch {
    constructor(persons) {
        this.persons = persons;
        this.searchInput = document.getElementById('global-search');
        this.searchResults = document.getElementById('search-results');
        this.mobileSearchInput = document.getElementById('mobile-search');
        this.mobileSearchResults = document.getElementById('mobile-search-results');
        this.currentFocus = -1;

        this.initEventListeners();
    }

    initEventListeners() {
        // Desktop search
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value, false);
            });

            this.searchInput.addEventListener('keydown', (e) => {
                this.handleKeyboardNav(e, false);
            });
        }

        // Mobile search
        if (this.mobileSearchInput) {
            this.mobileSearchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value, true);
            });

            this.mobileSearchInput.addEventListener('keydown', (e) => {
                this.handleKeyboardNav(e, true);
            });
        }

        // Close results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-search') && !e.target.closest('.nav-mobile-search')) {
                this.hideResults(false);
                this.hideResults(true);
            }
        });

        // Escape key closes results
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideResults(false);
                this.hideResults(true);
                if (this.searchInput) this.searchInput.blur();
                if (this.mobileSearchInput) this.mobileSearchInput.blur();
            }
        });
    }

    handleSearch(query, isMobile = false) {
        if (!query || query.length < 2) {
            this.hideResults(isMobile);
            return;
        }

        const results = this.searchPersons(query);
        this.displayResults(results, query, isMobile);
    }

    searchPersons(query) {
        const lowerQuery = query.toLowerCase();

        return this.persons
            .filter(person => {
                const name = person.name.toLowerCase();
                if (name.includes(lowerQuery)) return true;

                // Also search in name variants
                if (person.name_variants && person.name_variants.length > 0) {
                    return person.name_variants.some(variant =>
                        variant.toLowerCase().includes(lowerQuery)
                    );
                }

                return false;
            })
            .slice(0, 10) // Limit to 10 results
            .sort((a, b) => {
                // Sort: exact match in main name first, then variants, then by name
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aMainMatch = aName.includes(lowerQuery);
                const bMainMatch = bName.includes(lowerQuery);

                // Prioritize main name matches
                if (aMainMatch && !bMainMatch) return -1;
                if (!aMainMatch && bMainMatch) return 1;

                // Within same category, prioritize starts-with
                if (aMainMatch && bMainMatch) {
                    const aStarts = aName.startsWith(lowerQuery);
                    const bStarts = bName.startsWith(lowerQuery);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                }

                return aName.localeCompare(bName);
            });
    }

    displayResults(results, query, isMobile = false) {
        this.currentFocus = -1;
        const container = isMobile ? this.mobileSearchResults : this.searchResults;
        const input = isMobile ? this.mobileSearchInput : this.searchInput;

        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="search-no-results">
                    Keine Ergebnisse für "${query}"
                </div>
            `;
            container.classList.add('active');
            return;
        }

        container.innerHTML = results.map((person, index) => {
            const meta = this.getPersonMeta(person);
            const variantMatch = this.getVariantMatch(person, query);
            return `
                <a
                    href="person.html?id=${person.id}"
                    class="search-result-item"
                    role="option"
                    data-index="${index}"
                    aria-label="Zur Person ${person.name} navigieren"
                >
                    <div class="search-result-name">${this.highlightMatch(person.name, query)}</div>
                    ${variantMatch ? `<div class="search-result-variant">auch: ${variantMatch}</div>` : ''}
                    ${meta ? `<div class="search-result-meta">${meta}</div>` : ''}
                </a>
            `;
        }).join('');

        container.classList.add('active');

        // Add click handlers
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                this.hideResults(isMobile);
                if (input) input.value = '';
            });
        });
    }

    getVariantMatch(person, query) {
        const lowerQuery = query.toLowerCase();

        // Check if main name matches
        if (person.name.toLowerCase().includes(lowerQuery)) {
            return null; // Don't show variant if main name matches
        }

        // Find matching variant
        if (person.name_variants && person.name_variants.length > 0) {
            const matchingVariant = person.name_variants.find(variant =>
                variant.toLowerCase().includes(lowerQuery)
            );
            if (matchingVariant) {
                return this.highlightMatch(matchingVariant, query);
            }
        }

        return null;
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

        // Letter count from briefe object
        if (person.briefe && person.briefe.gesamt > 0) {
            parts.push(`${person.briefe.gesamt} Briefe`);
        }

        if (person.occupations && person.occupations.length > 0) {
            parts.push(person.occupations[0].name);
        }

        return parts.join(' • ');
    }

    handleKeyboardNav(e, isMobile = false) {
        const container = isMobile ? this.mobileSearchResults : this.searchResults;
        if (!container) return;

        const items = container.querySelectorAll('.search-result-item');
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

    hideResults(isMobile = false) {
        const container = isMobile ? this.mobileSearchResults : this.searchResults;
        if (container) {
            container.classList.remove('active');
        }
        this.currentFocus = -1;
    }
}
