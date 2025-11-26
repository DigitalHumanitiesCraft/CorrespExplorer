// HerData - Brief-Explorer (Phase 2a)
// Interactive statistics dashboard with coordinated multi-view (CMV)

import { loadPersons } from "./data.js";
import { loadNavbar } from "./navbar-loader.js";
import { GlobalSearch } from "./search.js";
import { Toast } from "./utils.js";

// Global state
let allPersons = [];
let charts = {};
let timelineData = null;

// Occupation categories matching map sidebar (app.js)
const OCCUPATION_CATEGORIES = {
    'Künstlerisch': {
        color: '#2980b9',
        occupations: ['Schauspielerin', 'Malerin', 'Tänzerin', 'Bildhauerin',
                      'Miniaturmalerin', 'Radiererin', 'Stecherin', 'Kupferstecherin',
                      'Zeichnerin', 'Stempelschneiderin', 'Gemmenschneiderin',
                      'Silhouettenschneiderin', 'Illustratorin', 'Bildnismalerin',
                      'Scherenschneiderin', 'Kunststickerin']
    },
    'Literarisch': {
        color: '#27ae60',
        occupations: ['Schriftstellerin', 'Übersetzerin', 'Dichterin',
                      'Zeitschriftenredakteurin', 'Redakteurin', 'Lyrikerin', 'Publizistin']
    },
    'Musikalisch': {
        color: '#e67e22',
        occupations: ['Sängerin', 'Pianistin', 'Komponistin', 'Organistin', 'Harfenistin',
                      'Gesanglehrerin', 'Kammersängerin', 'Musiklehrerin', 'Deklamatorin']
    },
    'Hof/Adel': {
        color: '#8e44ad',
        occupations: ['Hofdame', 'Oberhofmeisterin', 'Stiftsdame', 'Kammerfrau',
                      'Prinzessin', 'Fürstin', 'Herzogin', 'Staatsdame',
                      'Regentin', 'Oberkammerherrin', 'Herzogin von Sachsen-Weimar',
                      'Großherzogin', 'Hofmeisterin', 'Königin von Preußen', 'deutsche Kaiserin']
    },
    'Bildung': {
        color: '#16a085',
        occupations: ['Erzieherin', 'Pädagogin', 'Lehrerin', 'Gouvernante',
                      'Kunsterzieherin', 'Zeichenlehrerin']
    }
};

// Get category for an occupation
function getOccupationCategory(occupationName) {
    for (const [category, data] of Object.entries(OCCUPATION_CATEGORIES)) {
        if (data.occupations.includes(occupationName)) {
            return category;
        }
    }
    return 'Sonstige';
}

// Adjust color brightness (positive percent = lighter, negative = darker)
function adjustColorBrightness(hex, percent) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Adjust brightness (blend towards white for positive percent)
    r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));

    // Convert back to hex
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// FilterState Singleton - manages coordinated view filtering
class FilterState {
    constructor() {
        if (FilterState.instance) {
            return FilterState.instance;
        }
        FilterState.instance = this;

        this.filters = {
            timeRange: null,  // { start: year, end: year }
            occupation: null,  // string: selected occupation name
            place: null,  // string: selected place name
            activityTypes: ['sender', 'mentioned', 'both', 'indirect'],  // array: checked activity types
            birthDecade: null  // number: selected birth decade (e.g., 1750)
        };

        this.listeners = [];
    }

    // Subscribe to filter changes
    subscribe(callback) {
        this.listeners.push(callback);
    }

    // Update filters and notify listeners
    update(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.notifyListeners();
    }

    // Notify all subscribers
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.filters));
    }

    // Get currently filtered persons
    getFilteredPersons() {
        let filtered = allPersons;

        // Filter by time range (correspondence mode only)
        if (this.filters.timeRange) {
            const { start, end } = this.filters.timeRange;

            filtered = filtered.filter(person => {
                // Filter by correspondence years
                if (!person.correspondence || person.correspondence.length === 0) {
                    return false;  // Exclude persons without correspondence
                }
                return person.correspondence.some(corr =>
                    corr.year >= start && corr.year <= end
                );
            });
        }

        // Filter by occupation (supports both individual occupations and category names)
        if (this.filters.occupation) {
            const filterValue = this.filters.occupation;

            // Check if filter is a category name
            const isCategory = OCCUPATION_CATEGORIES.hasOwnProperty(filterValue) || filterValue === 'Sonstige';

            filtered = filtered.filter(person => {
                if (!person.occupations || person.occupations.length === 0) return false;

                if (isCategory) {
                    // Filter by category - check if any occupation belongs to this category
                    return person.occupations.some(occ => getOccupationCategory(occ.name) === filterValue);
                } else {
                    // Filter by specific occupation name
                    return person.occupations.some(occ => occ.name === filterValue);
                }
            });
        }

        // Filter by place
        if (this.filters.place) {
            filtered = filtered.filter(person => {
                if (!person.places || person.places.length === 0) return false;
                return person.places.some(place => place.name === this.filters.place);
            });
        }

        // Filter by activity types (only if not all are selected)
        if (this.filters.activityTypes && this.filters.activityTypes.length < 4) {
            filtered = filtered.filter(person => {
                const letterCount = person.letter_count || 0;
                const mentionCount = person.mention_count || 0;

                const isSender = letterCount > 0 && mentionCount === 0;
                const isMentioned = letterCount === 0 && mentionCount > 0;
                const isBoth = letterCount > 0 && mentionCount > 0;
                const isIndirect = letterCount === 0 && mentionCount === 0;

                return (
                    (this.filters.activityTypes.includes('sender') && isSender) ||
                    (this.filters.activityTypes.includes('mentioned') && isMentioned) ||
                    (this.filters.activityTypes.includes('both') && isBoth) ||
                    (this.filters.activityTypes.includes('indirect') && isIndirect)
                );
            });
        }

        // Filter by birth decade
        if (this.filters.birthDecade !== null) {
            filtered = filtered.filter(person => {
                if (!person.dates || !person.dates.birth) return false;
                const birthYear = parseInt(person.dates.birth);
                const personDecade = Math.floor(birthYear / 10) * 10;
                return personDecade === this.filters.birthDecade;
            });
        }

        return filtered;
    }

    // Reset filters
    reset() {
        this.filters = {
            timeRange: null,
            occupation: null,
            place: null,
            activityTypes: ['sender', 'mentioned', 'both', 'indirect'],  // Reset to all checked
            birthDecade: null
        };
        this.notifyListeners();
    }
}

// Initialize dashboard
async function init() {
    await loadNavbar('stats');
    highlightActiveNavLink();

    try {
        // Load data
        const data = await loadPersons();
        allPersons = data.persons;
        timelineData = data.meta.timeline;

        // Initialize FilterState singleton
        const filterState = new FilterState();

        // Subscribe to filter changes
        filterState.subscribe((filters) => {
            updateAllCharts();
            updateChartNotes();
            updateFilterChips();
        });

        initSearch();
        initMasterTimeline();
        initActivityFilter();
        initCharts();
        initBasketButton();
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Daten konnten nicht geladen werden');
    }
}

// Highlight active nav link
function highlightActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'stats.html') {
            link.style.background = 'rgba(255, 255, 255, 0.15)';
            link.style.color = 'white';
        }
    });
}

// Initialize search
function initSearch() {
    if (allPersons.length > 0) {
        new GlobalSearch(allPersons);
    }
}

// Initialize master timeline
function initMasterTimeline() {
    const container = document.getElementById('master-timeline');
    if (!container) return;

    const chart = echarts.init(container);
    charts.masterTimeline = chart;

    const filterState = new FilterState();

    // Timeline data - correspondence mode only
    const xAxisData = timelineData.map(t => t.year);
    const seriesData = timelineData.map(t => t.count);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const year = params[0].name;
                const count = params[0].value;
                return `${year}: ${count} Briefe`;
            }
        },
        grid: {
            left: '5%',
            right: '5%',
            top: '10%',
            bottom: '20%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            boundaryGap: false,
            axisLabel: {
                interval: 9,
                rotate: 0
            }
        },
        yAxis: {
            type: 'value',
            name: 'Briefe',
            nameLocation: 'middle',
            nameGap: 35,
            splitLine: { lineStyle: { type: 'dashed' } }
        },
        dataZoom: [{
            type: 'slider',
            start: 0,
            end: 100,
            height: 30,
            bottom: 10,
            handleIcon: 'path://M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z',
            handleSize: '120%',
            handleStyle: {
                color: '#2c5f8d',
                shadowBlur: 3,
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowOffsetX: 2,
                shadowOffsetY: 2
            },
            labelFormatter: (value, valueStr) => {
                return xAxisData[value] || '';
            }
        }],
        series: [{
            type: 'line',
            data: seriesData,
            smooth: true,
            lineStyle: {
                color: '#2c5f8d',
                width: 2
            },
            itemStyle: {
                color: '#2c5f8d'
            },
            areaStyle: {
                color: 'rgba(44, 95, 141, 0.2)'
            }
        }]
    };

    chart.setOption(option);

    // Handle dataZoom changes
    chart.on('dataZoom', (params) => {
        const startIdx = Math.floor(params.start / 100 * xAxisData.length);
        const endIdx = Math.ceil(params.end / 100 * xAxisData.length) - 1;

        const startYear = xAxisData[startIdx];
        const endYear = xAxisData[endIdx];

        // Update FilterState
        filterState.update({
            timeRange: { start: startYear, end: endYear }
        });

        // Update timeline selection display
        updateTimelineSelection(startYear, endYear);
    });

    // Reset button
    const resetBtn = document.getElementById('reset-timeline');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            chart.dispatchAction({
                type: 'dataZoom',
                start: 0,
                end: 100
            });
            filterState.reset();
            updateTimelineSelection(null, null);
        });
    }
}

// Initialize activity filter checkboxes
function initActivityFilter() {
    const filterState = new FilterState();
    const checkboxes = document.querySelectorAll('.activity-checkbox');

    if (!checkboxes || checkboxes.length === 0) {
        return;
    }

    // Add change event listeners to all checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Collect all checked values
            const checkedTypes = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            // Update filter state
            filterState.update({ activityTypes: checkedTypes });
        });
    });
}

// Update timeline selection display
function updateTimelineSelection(start, end) {
    const display = document.getElementById('timeline-selection');
    if (!display) return;

    if (!start || !end) {
        display.textContent = 'Gesamter Zeitraum ausgewählt';
    } else {
        display.textContent = `${start} – ${end}`;
    }
}

// Build URL for filtered persons view
function buildPersonsURL(filters) {
    const params = new URLSearchParams();

    // Add time range filter
    if (filters.timeRange) {
        params.append('timeStart', filters.timeRange.start);
        params.append('timeEnd', filters.timeRange.end);
    }

    // Add occupation filter
    if (filters.occupation) {
        params.append('occupation', filters.occupation);
    }

    // Add place filter
    if (filters.place) {
        params.append('place', filters.place);
    }

    // Add birth decade filter
    if (filters.birthDecade !== null) {
        params.append('birthDecade', filters.birthDecade);
    }

    // Add activity types filter (only if not all are selected)
    if (filters.activityTypes && filters.activityTypes.length < 4 && filters.activityTypes.length > 0) {
        params.append('activityTypes', filters.activityTypes.join(','));
    }

    // Build relative URL to synthesis
    const baseURL = 'synthesis.html';
    const queryString = params.toString();

    return queryString ? `${baseURL}?${queryString}` : baseURL;
}

// Update filter chips display
function updateFilterChips() {
    const filterState = new FilterState();
    const { timeRange, occupation, place, activityTypes, birthDecade } = filterState.filters;

    const activeFiltersDiv = document.getElementById('active-filters');
    const filterChipsDiv = document.getElementById('filter-chips');

    if (!activeFiltersDiv || !filterChipsDiv) return;

    // Clear existing chips
    filterChipsDiv.innerHTML = '';

    const chips = [];
    const filteredPersons = filterState.getFilteredPersons();

    // Add time range chip if active
    if (timeRange) {
        chips.push({
            label: `${timeRange.start}–${timeRange.end}`,
            onRemove: () => {
                filterState.update({ timeRange: null });
                // Reset dataZoom slider
                if (charts.masterTimeline) {
                    charts.masterTimeline.dispatchAction({
                        type: 'dataZoom',
                        start: 0,
                        end: 100
                    });
                }
            }
        });
    }

    // Add occupation chip if active
    if (occupation) {
        // Count persons with this occupation in current filter context
        let count = filteredPersons.length;
        chips.push({
            label: `${occupation} (${count})`,
            onRemove: () => {
                filterState.update({ occupation: null });
            }
        });
    }

    // Add place chip if active
    if (place) {
        // Count persons with this place in current filter context
        let count = filteredPersons.length;
        chips.push({
            label: `${place} (${count})`,
            onRemove: () => {
                filterState.update({ place: null });
            }
        });
    }

    // Add activity filter chip if not all types are selected
    if (activityTypes && activityTypes.length < 4 && activityTypes.length > 0) {
        const typeLabels = {
            'sender': 'Absenderin',
            'mentioned': 'Erwähnt',
            'both': 'Beides',
            'indirect': 'Nur SNDB'
        };
        const activeLabels = activityTypes.map(type => typeLabels[type]).join(', ');
        chips.push({
            label: `Briefaktivität: ${activeLabels}`,
            onRemove: () => {
                // Reset to all types
                filterState.update({ activityTypes: ['sender', 'mentioned', 'both', 'indirect'] });
                // Also reset checkboxes
                const checkboxes = document.querySelectorAll('.activity-checkbox');
                checkboxes.forEach(cb => cb.checked = true);
            }
        });
    }

    // Add birth decade chip if active
    if (birthDecade !== null) {
        let count = filteredPersons.length;
        chips.push({
            label: `${birthDecade}er Generation (${count})`,
            onRemove: () => {
                filterState.update({ birthDecade: null });
            }
        });
    }

    // Show/hide active filters section
    if (chips.length > 0) {
        activeFiltersDiv.style.display = 'flex';

        // Render chips
        chips.forEach(chip => {
            const chipEl = document.createElement('span');
            chipEl.className = 'filter-chip';
            chipEl.innerHTML = `
                ${chip.label}
                <button class="filter-chip-remove" aria-label="Filter entfernen">×</button>
            `;

            chipEl.querySelector('.filter-chip-remove').addEventListener('click', chip.onRemove);
            filterChipsDiv.appendChild(chipEl);
        });

        // Update "View Persons" button
        const viewPersonsBtn = document.getElementById('view-persons-btn');
        const viewPersonsCount = document.getElementById('view-persons-count');

        if (viewPersonsBtn && viewPersonsCount) {
            const personsURL = buildPersonsURL(filterState.filters);
            viewPersonsBtn.href = personsURL;
            viewPersonsCount.textContent = filteredPersons.length;
        }

        // Update "Add to Basket" button
        const addFilteredBtn = document.getElementById('add-filtered-to-basket');
        const addFilteredCount = document.getElementById('add-filtered-count');

        if (addFilteredBtn && addFilteredCount) {
            addFilteredCount.textContent = filteredPersons.length;
        }
    } else {
        activeFiltersDiv.style.display = 'none';
    }
}

// Initialize all charts
function initCharts() {
    renderOccupationsChart();
    renderPlacesChart();
    renderCohortsChart();

    // Note: echarts.connect() removed because coordinated highlighting
    // doesn't make sense between different chart types (treemap vs bar charts)
    // with semantically unrelated data (occupations vs places vs cohorts)
}

// Update all charts with filtered data
function updateAllCharts() {
    renderOccupationsChart();
    renderPlacesChart();
    renderCohortsChart();
}

// Update chart notes with current filter stats
function updateChartNotes() {
    const filterState = new FilterState();
    const filteredPersons = filterState.getFilteredPersons();

    // Update occupation note
    const occWithData = filteredPersons.filter(p => p.occupations && p.occupations.length > 0).length;

    // Count total occupation assignments (not unique persons)
    let totalOccAssignments = 0;
    filteredPersons.forEach(p => {
        if (p.occupations && p.occupations.length > 0) {
            totalOccAssignments += p.occupations.length;
        }
    });

    const occNote = document.getElementById('note-occupations');
    if (occNote) {
        const percentage = Math.round(occWithData/filteredPersons.length*100);
        occNote.textContent = `${occWithData} von ${filteredPersons.length} Frauen (${percentage}%) haben Berufsangaben. Mehrfachberufe werden mehrfach gezählt.`;
    }

    // Update places note
    const placesWithData = filteredPersons.filter(p => p.places && p.places.length > 0).length;
    const uniquePlaces = new Set();
    filteredPersons.forEach(p => {
        if (p.places) p.places.forEach(place => uniquePlaces.add(place.name));
    });
    const placesNote = document.getElementById('note-places');
    if (placesNote) {
        placesNote.textContent = `${placesWithData} Frauen mit Ortsangaben (${uniquePlaces.size} verschiedene Orte)`;
    }

    // Update cohorts note
    const cohortsWithData = filteredPersons.filter(p => p.dates && p.dates.birth).length;
    const cohortsNote = document.getElementById('note-cohorts');
    if (cohortsNote) {
        cohortsNote.textContent = `${cohortsWithData} Frauen mit Lebensdaten`;
    }
}

// Chart 1: Berufsverteilung (Treemap) - grouped by semantic categories with drill-down
function renderOccupationsChart() {
    const container = document.getElementById('chart-occupations');
    if (!charts.occupations) {
        charts.occupations = echarts.init(container);
    }

    const filterState = new FilterState();
    const persons = filterState.getFilteredPersons();
    const activeCategory = filterState.filters.occupation;

    // Check if we're in drill-down mode (category filter is active)
    const isCategory = activeCategory && (OCCUPATION_CATEGORIES.hasOwnProperty(activeCategory) || activeCategory === 'Sonstige');

    let treemapData = [];
    let titleText = '';

    if (isCategory) {
        // DRILL-DOWN MODE: Show individual occupations within the selected category
        const occupationCounter = {};

        persons.forEach(person => {
            if (person.occupations && person.occupations.length > 0) {
                person.occupations.forEach(occ => {
                    const category = getOccupationCategory(occ.name);
                    if (category === activeCategory) {
                        occupationCounter[occ.name] = (occupationCounter[occ.name] || 0) + 1;
                    }
                });
            }
        });

        // Get category base color
        const baseColor = activeCategory === 'Sonstige'
            ? '#95a5a6'
            : OCCUPATION_CATEGORIES[activeCategory]?.color || '#95a5a6';

        // Build treemap data for individual occupations
        const occupations = Object.entries(occupationCounter).sort((a, b) => b[1] - a[1]);
        const totalOccupations = occupations.length;

        occupations.forEach(([occName, count], index) => {
            // Create color shades: darkest for largest, lightest for smallest
            const shadeFactor = totalOccupations > 1 ? index / (totalOccupations - 1) : 0;
            const shadeColor = adjustColorBrightness(baseColor, shadeFactor * 40); // 0% to 40% lighter

            treemapData.push({
                name: occName,
                value: count,
                _occupation: occName,
                itemStyle: { color: shadeColor }
            });
        });

        titleText = `${activeCategory} (${treemapData.length} Berufe) - Klick zum Zurueck`;

    } else {
        // CATEGORY MODE: Show occupation categories
        const categoryCounter = {};
        const categoryDetails = {};

        // Initialize categories
        for (const category of Object.keys(OCCUPATION_CATEGORIES)) {
            categoryCounter[category] = 0;
            categoryDetails[category] = {};
        }
        categoryCounter['Sonstige'] = 0;
        categoryDetails['Sonstige'] = {};

        // Count unique persons per category (not occupation entries)
        const categoryPersons = {};
        for (const category of Object.keys(OCCUPATION_CATEGORIES)) {
            categoryPersons[category] = new Set();
        }
        categoryPersons['Sonstige'] = new Set();

        persons.forEach(person => {
            if (person.occupations && person.occupations.length > 0) {
                person.occupations.forEach(occ => {
                    const category = getOccupationCategory(occ.name);
                    categoryCounter[category]++;
                    categoryDetails[category][occ.name] = (categoryDetails[category][occ.name] || 0) + 1;
                    // Track unique persons per category
                    categoryPersons[category].add(person.id);
                });
            }
        });

        // Build treemap data with category colors
        for (const [category, data] of Object.entries(OCCUPATION_CATEGORIES)) {
            if (categoryCounter[category] > 0) {
                const details = Object.entries(categoryDetails[category])
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => `${name} (${count})`)
                    .join(', ');
                const personCount = categoryPersons[category].size;
                treemapData.push({
                    name: category,
                    value: categoryCounter[category],
                    _tooltip: details,
                    _category: category,
                    _personCount: personCount,
                    itemStyle: { color: data.color }
                });
            }
        }

        // Add "Sonstige" category
        if (categoryCounter['Sonstige'] > 0) {
            const details = Object.entries(categoryDetails['Sonstige'])
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => `${name} (${count})`)
                .join(', ');
            const personCount = categoryPersons['Sonstige'].size;
            treemapData.push({
                name: 'Sonstige',
                value: categoryCounter['Sonstige'],
                _tooltip: details,
                _category: 'Sonstige',
                _personCount: personCount,
                itemStyle: { color: '#95a5a6' }
            });
        }

        treemapData.sort((a, b) => b.value - a.value);
        titleText = `Berufsgruppen (${treemapData.length} Kategorien)`;
    }

    const option = {
        title: {
            text: titleText,
            left: 'center',
            top: 10,
            textStyle: {
                fontSize: 14,
                color: isCategory ? '#2c5f8d' : '#333'
            },
            triggerEvent: isCategory  // Make title clickable in drill-down mode
        },
        tooltip: {
            formatter: (params) => {
                if (params.data._tooltip) {
                    const personCount = params.data._personCount || params.value;
                    const entryCount = params.value;
                    const countText = params.data._personCount
                        ? `${personCount} Personen (${entryCount} Eintraege)`
                        : `${entryCount} Eintraege`;
                    return `<strong>${params.name}</strong><br/>${countText}<br/><span style="font-size:11px;color:#666;max-width:300px;display:block;white-space:normal;">${params.data._tooltip}</span>`;
                }
                const personCount = params.data._personCount || params.value;
                return `<strong>${params.name}</strong><br/>${personCount} Personen`;
            }
        },
        series: [{
            type: 'treemap',
            data: treemapData,
            top: 50,
            bottom: 10,
            left: 10,
            right: 10,
            roam: false,
            nodeClick: false,
            breadcrumb: {
                show: false
            },
            label: {
                show: true,
                formatter: (params) => {
                    // Show person count if available (category mode), otherwise entries count
                    const count = params.data._personCount || params.value;
                    return `${params.name}\n${count}`;
                },
                fontSize: 12,
                color: 'white'
            },
            upperLabel: {
                show: false
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                gapWidth: 2
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.5)',
                    borderColor: '#2c3e50',
                    borderWidth: 3
                },
                label: {
                    fontSize: 13,
                    fontWeight: 'bold'
                }
            }
        }]
    };

    charts.occupations.setOption(option, true);

    // Add click handler for occupation filtering
    charts.occupations.off('click');  // Remove old handlers
    charts.occupations.on('click', (params) => {
        if (params.componentType === 'series') {
            const clickedName = params.name;

            if (isCategory) {
                // In drill-down mode: click on specific occupation filters to that occupation
                // Filter to specific occupation (this will show category view with filtered persons)
                filterState.update({ occupation: clickedName });
            } else {
                // In category mode: click drills down into category
                if (filterState.filters.occupation === clickedName) {
                    filterState.update({ occupation: null });
                } else {
                    filterState.update({ occupation: clickedName });
                }
            }
        } else if (params.componentType === 'title' && isCategory) {
            // Click on title goes back to category overview
            filterState.update({ occupation: null });
        }
    });
}

// Chart 2: Geografische Zentren
function renderPlacesChart() {
    const container = document.getElementById('chart-places');
    if (!charts.places) {
        charts.places = echarts.init(container);
    }

    const filterState = new FilterState();
    const persons = filterState.getFilteredPersons();

    // Count places AND track occupation categories per place
    const placeCounter = {};
    const placeOccupations = {};

    persons.forEach(person => {
        if (person.places && person.places.length > 0) {
            person.places.forEach(place => {
                placeCounter[place.name] = (placeCounter[place.name] || 0) + 1;

                // Track occupations for this place
                if (!placeOccupations[place.name]) {
                    placeOccupations[place.name] = {
                        'Literarisch': 0, 'Künstlerisch': 0, 'Musikalisch': 0,
                        'Hof/Adel': 0, 'Bildung': 0, 'Sonstige': 0
                    };
                }

                // Count occupation categories
                if (person.occupations && person.occupations.length > 0) {
                    const categories = new Set();
                    person.occupations.forEach(occ => {
                        const cat = getOccupationCategory(occ.name);
                        categories.add(cat);
                    });
                    categories.forEach(cat => {
                        placeOccupations[place.name][cat]++;
                    });
                }
            });
        }
    });

    // Sort and get top 10
    const sorted = Object.entries(placeCounter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Colors for occupation categories
    const catColors = {
        'Künstlerisch': '#2980b9',
        'Literarisch': '#27ae60',
        'Musikalisch': '#e67e22',
        'Hof/Adel': '#8e44ad',
        'Bildung': '#16a085',
        'Sonstige': '#7f8c8d'
    };

    const option = {
        title: {
            text: 'Top 10 Orte',
            left: 'center',
            textStyle: { fontSize: 14 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            confine: true,
            formatter: (params) => {
                const placeName = params[0].name;
                const count = params[0].value;
                const occs = placeOccupations[placeName];

                // Compact occupation display
                let occParts = [];
                const categories = ['Literarisch', 'Künstlerisch', 'Musikalisch', 'Hof/Adel', 'Bildung', 'Sonstige'];
                categories.forEach(cat => {
                    if (occs && occs[cat] > 0) {
                        occParts.push(`<span style="color:${catColors[cat]}">●</span>${occs[cat]}`);
                    }
                });

                const occLine = occParts.length > 0 ? `<br/>${occParts.join(' ')}` : '';
                return `<strong>${placeName}</strong>: ${count}${occLine}`;
            }
        },
        grid: {
            left: '30%',
            right: '5%',
            top: '15%',
            bottom: '10%'
        },
        xAxis: {
            type: 'value',
            name: 'Anzahl'
        },
        yAxis: {
            type: 'category',
            data: sorted.map(([name]) => name).reverse(),
            axisLabel: {
                fontSize: 10,
                overflow: 'truncate',
                width: 120
            }
        },
        series: [{
            type: 'bar',
            data: sorted.map(([, count]) => count).reverse(),
            itemStyle: {
                color: '#2d6a4f',
                borderRadius: [0, 4, 4, 0]
            },
            label: {
                show: true,
                position: 'inside',
                formatter: '{c}',
                color: 'white',
                fontSize: 10
            }
        }]
    };

    charts.places.setOption(option, true);

    // Add click handler for place filtering
    charts.places.off('click');  // Remove old handlers
    charts.places.on('click', (params) => {
        if (params.componentType === 'series') {
            const place = params.name;

            // Toggle place filter
            if (filterState.filters.place === place) {
                // Click same place -> remove filter
                filterState.update({ place: null });
            } else {
                // Click different place -> set filter
                filterState.update({ place: place });
            }
        }
    });
}

// Chart 3: Generationen with occupation breakdown in tooltip
function renderCohortsChart() {
    const container = document.getElementById('chart-cohorts');
    if (!charts.cohorts) {
        charts.cohorts = echarts.init(container);
    }

    const filterState = new FilterState();
    const persons = filterState.getFilteredPersons();

    // Count birth decades AND occupation categories per decade
    const decadeCounter = {};
    const decadeOccupations = {};

    persons.forEach(person => {
        if (person.dates && person.dates.birth) {
            try {
                const year = parseInt(person.dates.birth);
                const decade = Math.floor(year / 10) * 10;
                decadeCounter[decade] = (decadeCounter[decade] || 0) + 1;

                // Count occupations for this decade
                if (!decadeOccupations[decade]) {
                    decadeOccupations[decade] = {
                        'Literarisch': 0, 'Künstlerisch': 0, 'Musikalisch': 0,
                        'Hof/Adel': 0, 'Bildung': 0, 'Sonstige': 0
                    };
                }
                if (person.occupations) {
                    person.occupations.forEach(occ => {
                        const cat = getOccupationCategory(occ.name);
                        decadeOccupations[decade][cat]++;
                    });
                }
            } catch (e) {}
        }
    });

    // Sort by decade
    const sorted = Object.entries(decadeCounter)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    // Category colors for tooltip
    const catColors = {
        'Literarisch': '#27ae60', 'Künstlerisch': '#2980b9', 'Musikalisch': '#e67e22',
        'Hof/Adel': '#8e44ad', 'Bildung': '#16a085', 'Sonstige': '#95a5a6'
    };

    const option = {
        title: {
            text: 'Geburtsjahrzehnte',
            left: 'center',
            textStyle: { fontSize: 14 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            confine: true,
            formatter: (params) => {
                const decade = params[0].name.replace('er', '');
                const count = params[0].value;
                const occs = decadeOccupations[decade];

                if (!occs) return `${params[0].name}: ${count}`;

                // Compact occupation display
                let occParts = [];
                const categories = ['Literarisch', 'Künstlerisch', 'Musikalisch', 'Hof/Adel', 'Bildung', 'Sonstige'];
                categories.forEach(cat => {
                    if (occs[cat] > 0) {
                        occParts.push(`<span style="color:${catColors[cat]}">●</span>${occs[cat]}`);
                    }
                });

                const occLine = occParts.length > 0 ? `<br/>${occParts.join(' ')}` : '';
                return `<strong>${params[0].name}</strong>: ${count}${occLine}`;
            }
        },
        grid: {
            left: '10%',
            right: '10%',
            top: '15%',
            bottom: '15%'
        },
        xAxis: {
            type: 'category',
            data: sorted.map(([decade]) => decade + 'er'),
            axisLabel: { fontSize: 10 }
        },
        yAxis: {
            type: 'value',
            name: 'Personen'
        },
        series: [{
            type: 'bar',
            data: sorted.map(([, count]) => count),
            itemStyle: {
                color: '#6c757d',
                borderRadius: [4, 4, 0, 0]
            },
            label: {
                show: true,
                position: 'top',
                formatter: '{c}',
                fontSize: 10
            }
        }]
    };

    charts.cohorts.setOption(option, true);

    // Add click handler for birth decade filtering
    charts.cohorts.off('click');  // Remove old handlers
    charts.cohorts.on('click', (params) => {
        if (params.componentType === 'series') {
            // Extract decade number from label like "1750er"
            const decadeStr = params.name.replace('er', '');
            const decade = parseInt(decadeStr);

            // Toggle birth decade filter
            if (filterState.filters.birthDecade === decade) {
                // Click same decade -> remove filter
                filterState.update({ birthDecade: null });
            } else {
                // Click different decade -> set filter
                filterState.update({ birthDecade: decade });
            }
        }
    });
}

// Chart 4: Briefaktivität
// Activity chart removed - now using checkboxes in sidebar (Phase 2d)
// Export buttons removed - functionality moved to download.html

// Initialize "Add to Basket" button
function initBasketButton() {
    const addFilteredBtn = document.getElementById('add-filtered-to-basket');

    if (!addFilteredBtn) {
        console.warn('⚠️ Add to basket button not found');
        return;
    }

    addFilteredBtn.addEventListener('click', () => {
        const filterState = new FilterState();
        const filteredPersons = filterState.getFilteredPersons();

        if (filteredPersons.length === 0) {
            Toast.show('Keine gefilterten Personen zum Hinzufügen', 'warning');
            return;
        }

        // Add all filtered persons to basket
        let added = 0;
        let skipped = 0;

        filteredPersons.forEach(person => {
            if (!BasketManager.has(person.id)) {
                BasketManager.add(person);
                added++;
            } else {
                skipped++;
            }
        });

        // Show feedback
        if (added > 0) {
            const message = added === 1
                ? `1 Person zum Wissenskorb hinzugefügt`
                : `${added} Personen zum Wissenskorb hinzugefügt`;
            const extra = skipped > 0 ? ` (${skipped} bereits im Korb)` : '';
            Toast.show(message + extra);
        } else {
            Toast.show('Alle Personen bereits im Wissenskorb', 'info');
        }
    });
}

// Show error message
function showError(message) {
    console.error(message);
    alert(message);
}

// Handle window resize
window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => {
        if (chart) chart.resize();
    });
});

// Initialize on load
init();
