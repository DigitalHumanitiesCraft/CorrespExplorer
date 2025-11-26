import { loadNavbar } from './navbar-loader.js';
import { loadPersons } from './data.js';
import { GlobalSearch } from './search.js';

async function init() {
    // Load the shared navbar
    await loadNavbar();

    // Initialize global search functionality
    try {
        const data = await loadPersons();
        new GlobalSearch(data.persons);
    } catch (error) {
        console.error('Failed to load persons for search:', error);
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}