/**
 * Mobile Filter Bar - Shared Component
 * Synchronisiert Mobile-Filter mit Desktop-Filtern
 * Verwendet in: index.html, synthesis.html, stats.html, narrative.html
 */

(function() {
    'use strict';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', initMobileFilter);

    function initMobileFilter() {
        const mobileFilterBar = document.querySelector('.mobile-filter-bar');
        if (!mobileFilterBar) return;

        const roleToggles = mobileFilterBar.querySelectorAll('.role-toggle');
        const searchInput = mobileFilterBar.querySelector('#mobile-search-input');
        const resultCount = mobileFilterBar.querySelector('#mobile-result-count');

        // Role toggle click handler
        roleToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                syncRoleFilters();
            });
        });

        // Search input handler with debounce
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    syncSearch(searchInput.value);
                }, 300);
            });
        }

        // Sync initial state from desktop checkboxes
        syncFromDesktop();

        // Listen for desktop filter changes to update mobile
        observeDesktopFilters();
    }

    /**
     * Sync role filters from mobile to desktop
     */
    function syncRoleFilters() {
        const mobileToggles = document.querySelectorAll('.mobile-filter-bar .role-toggle');
        const activeRoles = Array.from(mobileToggles)
            .filter(t => t.classList.contains('active'))
            .map(t => t.dataset.role);

        // Find and update desktop checkboxes
        const desktopCheckboxes = document.querySelectorAll(
            'input[name="role"], ' +
            '.filter-group input[value="sender"], ' +
            '.filter-group input[value="mentioned"], ' +
            '.filter-group input[value="both"], ' +
            '.filter-group input[value="indirect"], ' +
            '.activity-checkbox'
        );

        desktopCheckboxes.forEach(cb => {
            const value = cb.value;
            if (['sender', 'mentioned', 'both', 'indirect'].includes(value)) {
                cb.checked = activeRoles.includes(value);
            }
        });

        // Trigger change event on first checkbox to trigger filter update
        if (desktopCheckboxes.length > 0) {
            desktopCheckboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
        }

        // For pages that use custom filter systems
        triggerFilterUpdate();
    }

    /**
     * Sync search from mobile to existing search systems
     */
    function syncSearch(query) {
        // Try different search input IDs used across pages
        const searchInputs = [
            document.querySelector('.search-box input'),
            document.querySelector('#global-search'),
            document.querySelector('.sidebar-search input'),
            document.querySelector('#search-input')
        ];

        searchInputs.forEach(input => {
            if (input && input !== document.querySelector('#mobile-search-input')) {
                input.value = query;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // For synthesis.js - directly update state if available
        if (window.synthesisState) {
            window.synthesisState.filters.search = query.toLowerCase();
            if (typeof applyFilters === 'function') {
                applyFilters();
            }
        }

        // For narrative.js
        if (typeof window.filterPersons === 'function') {
            window.filterPersons();
        }

        triggerFilterUpdate();
    }

    /**
     * Sync mobile toggles from desktop checkbox state
     */
    function syncFromDesktop() {
        const roles = ['sender', 'mentioned', 'both', 'indirect'];

        roles.forEach(role => {
            const desktopCheckbox = document.querySelector(
                `input[name="role"][value="${role}"], ` +
                `.filter-group input[value="${role}"], ` +
                `.activity-checkbox[value="${role}"]`
            );

            const mobileToggle = document.querySelector(
                `.mobile-filter-bar .role-toggle[data-role="${role}"]`
            );

            if (desktopCheckbox && mobileToggle) {
                if (desktopCheckbox.checked) {
                    mobileToggle.classList.add('active');
                } else {
                    mobileToggle.classList.remove('active');
                }
            }
        });
    }

    /**
     * Observe desktop filter changes and sync to mobile
     */
    function observeDesktopFilters() {
        const desktopCheckboxes = document.querySelectorAll(
            'input[name="role"], ' +
            '.filter-group input[value="sender"], ' +
            '.filter-group input[value="mentioned"], ' +
            '.filter-group input[value="both"], ' +
            '.filter-group input[value="indirect"], ' +
            '.activity-checkbox'
        );

        desktopCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                syncFromDesktop();
            });
        });
    }

    /**
     * Trigger filter update for different page implementations
     */
    function triggerFilterUpdate() {
        // Synthesis page
        if (typeof window.applyFilters === 'function') {
            window.applyFilters();
        }

        // Map page (app.js)
        if (typeof window.updateFilters === 'function') {
            window.updateFilters();
        }

        // Stats page
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }

        // Narrative page
        if (typeof window.filterPersons === 'function') {
            window.filterPersons();
        }

        // Update mobile result count
        updateMobileResultCount();
    }

    /**
     * Update the result count in mobile filter bar
     */
    function updateMobileResultCount() {
        const mobileCount = document.querySelector('#mobile-result-count');
        if (!mobileCount) return;

        // Try to find visible count from different sources
        const sources = [
            document.querySelector('#visible-count'),
            document.querySelector('#kpi-persons .stat-value'),
            document.querySelector('.result-count span'),
            document.querySelector('[id*="count"]')
        ];

        for (const source of sources) {
            if (source && source.textContent) {
                const count = source.textContent.replace(/[^\d]/g, '');
                if (count) {
                    mobileCount.textContent = count;
                    break;
                }
            }
        }
    }

    // Expose for external updates
    window.updateMobileFilterCount = updateMobileResultCount;
    window.syncMobileFilters = syncFromDesktop;

})();
