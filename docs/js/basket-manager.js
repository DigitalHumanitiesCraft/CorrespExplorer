// Basket Manager - Global Persistent Storage for HerData Wissenskorb
// Central singleton for managing the user's collection of persons across all views

const BasketManager = (function() {
    const STORAGE_KEY = 'herdata_basket';
    const MAX_ITEMS = null; // No limit
    const VERSION = '1.0';
    const DEBUG = false; // Set to true for debug logging

    let items = [];
    let listeners = {};

    // Simple logger that respects DEBUG flag
    const log = {
        debug: (msg) => DEBUG && console.log(`[Basket] ${msg}`),
        error: (msg, error) => console.error(`[Basket] ${msg}`, error || '')
    };

    // Initialize basket from localStorage
    function init() {
        log.debug('Initializing BasketManager');
        load();
        setupStorageListener();
        log.debug(`BasketManager loaded with ${items.length} items`);
    }

    // Load basket from localStorage
    function load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);

                // Validate version and structure
                if (data.version === VERSION && Array.isArray(data.items)) {
                    items = data.items;
                } else {
                    log.debug('Basket data version mismatch or invalid format, resetting');
                    items = [];
                }
            } else {
                items = [];
            }
        } catch (error) {
            log.error('Error loading basket from localStorage:', error);
            items = [];
        }
    }

    // Save basket to localStorage
    function save() {
        try {
            const data = {
                version: VERSION,
                updated: new Date().toISOString(),
                items: items
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            emit('change');
            log.debug(`Basket saved with ${items.length} items`);
        } catch (error) {
            log.error('Error saving basket to localStorage:', error);

            // Check if quota exceeded
            if (error.name === 'QuotaExceededError') {
                alert('Speicherplatz voll. Bitte exportieren Sie Ihren Wissenskorb und entfernen Sie einige Einträge.');
            }
        }
    }

    // Add person to basket
    function add(person) {
        if (!person || !person.id) {
            log.error('Invalid person object:', person);
            return false;
        }

        if (has(person.id)) {
            log.debug(`Person ${person.name} already in basket`);
            return false;
        }

        const item = {
            id: person.id,
            name: person.name,
            addedAt: new Date().toISOString(),
            dates: person.dates || null,
            role: person.role || null,
            gnd: person.gnd || null,
            normierung: person.normierung || null,
            occupations: person.occupations || null,
            relationships: person.relationships || null,
            places: person.places || null,
            letter_count: person.letter_count || 0,
            mention_count: person.mention_count || 0
        };

        items.push(item);
        save();
        emit('add', item);
        log.debug(`Added ${person.name} to basket`);
        return true;
    }

    // Remove person from basket
    function remove(personId) {
        const index = items.findIndex(p => p.id === personId);

        if (index === -1) {
            log.debug(`Person ${personId} not found in basket`);
            return false;
        }

        const person = items[index];
        items.splice(index, 1);
        save();
        emit('remove', person);
        log.debug(`Removed ${person.name} from basket`);
        return true;
    }

    // Clear entire basket
    function clear() {
        const count = items.length;
        items = [];
        save();
        emit('clear');
        log.debug(`Cleared basket (removed ${count} items)`);
    }

    // Check if person is in basket
    function has(personId) {
        return items.some(p => p.id === personId);
    }

    // Get all items in basket
    function getAll() {
        return [...items];
    }

    // Get basket count
    function getCount() {
        return items.length;
    }

    // Get person by ID from basket
    function getById(personId) {
        return items.find(p => p.id === personId) || null;
    }

    // Export as CSV
    function exportAsCSV() {
        if (items.length === 0) {
            log.debug('Basket is empty, nothing to export');
            return null;
        }

        const headers = ['Name', 'Lebensdaten', 'Rolle', 'GND', 'Normierung', 'Berufe', 'Briefe', 'Erwähnungen'];
        let csv = headers.join(',') + '\n';

        items.forEach(person => {
            const birth = person.dates?.birth || '?';
            const death = person.dates?.death || '?';
            const occupations = person.occupations ? person.occupations.map(o => o.name).join('; ') : '';

            const row = [
                `"${person.name}"`,
                `"${birth}-${death}"`,
                `"${person.role || ''}"`,
                `"${person.gnd || ''}"`,
                `"${person.normierung || ''}"`,
                `"${occupations}"`,
                person.letter_count || 0,
                person.mention_count || 0
            ];
            csv += row.join(',') + '\n';
        });

        log.debug(`Exported ${items.length} items as CSV`);
        return csv;
    }

    // Export as JSON
    function exportAsJSON() {
        if (items.length === 0) {
            log.debug('Basket is empty, nothing to export');
            return null;
        }

        const exportData = {
            exported: new Date().toISOString(),
            count: items.length,
            items: items
        };

        log.debug(`Exported ${items.length} items as JSON`);
        return JSON.stringify(exportData, null, 2);
    }

    // Event system - register listener
    function on(event, callback) {
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push(callback);
        log.debug(`Registered listener for '${event}' event`);
    }

    // Event system - unregister listener
    function off(event, callback) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    }

    // Event system - emit event
    function emit(event, data) {
        if (!listeners[event]) return;

        listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                log.error(`Error in ${event} listener:`, error);
            }
        });
    }

    // Listen to storage events from other tabs
    function setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY) {
                log.debug('Storage changed in another tab, reloading basket');
                load();
                emit('sync');
            }
        });
    }

    // Public API
    return {
        init,
        add,
        remove,
        clear,
        has,
        getAll,
        getCount,
        getById,
        exportAsCSV,
        exportAsJSON,
        on,
        off,
        MAX_ITEMS
    };
})();

// Make globally available
window.BasketManager = BasketManager;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        BasketManager.init();
    });
} else {
    BasketManager.init();
}
