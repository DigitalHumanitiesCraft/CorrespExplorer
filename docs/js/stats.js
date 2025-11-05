// HerData - Brief-Explorer (Phase 2a)
// Interactive statistics dashboard with coordinated multi-view (CMV)

import { loadPersons } from "./data.js";
import { loadNavbar } from "./navbar-loader.js";
import { GlobalSearch } from "./search.js";

// Global state
let allPersons = [];
let charts = {};
let timelineData = null;

// FilterState Singleton - manages coordinated view filtering
class FilterState {
    constructor() {
        if (FilterState.instance) {
            return FilterState.instance;
        }
        FilterState.instance = this;

        this.filters = {
            timeRange: null,  // { start: year, end: year }
            timeMode: 'correspondence',  // 'correspondence' or 'lifespan'
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

        // Filter by time range
        if (this.filters.timeRange) {
            const { start, end } = this.filters.timeRange;
            const { timeMode } = this.filters;

            filtered = filtered.filter(person => {
                if (timeMode === 'correspondence') {
                    // Filter by correspondence years
                    if (!person.correspondence || person.correspondence.length === 0) {
                        return false;  // Exclude persons without correspondence
                    }
                    return person.correspondence.some(corr =>
                        corr.year >= start && corr.year <= end
                    );
                } else {
                    // Filter by lifespan years
                    if (!person.dates) return false;

                    const birthYear = person.dates.birth ? parseInt(person.dates.birth) : null;
                    const deathYear = person.dates.death ? parseInt(person.dates.death) : null;

                    // Person overlaps with time range if:
                    // - Born before end AND died after start
                    // - Or born in range (if no death date)
                    if (birthYear && deathYear) {
                        return birthYear <= end && deathYear >= start;
                    } else if (birthYear) {
                        return birthYear >= start && birthYear <= end;
                    }
                    return false;
                }
            });
        }

        // Filter by occupation
        if (this.filters.occupation) {
            filtered = filtered.filter(person => {
                if (!person.occupations || person.occupations.length === 0) return false;
                return person.occupations.some(occ => occ.name === this.filters.occupation);
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
            timeMode: this.filters.timeMode,  // Keep current mode
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
    console.log("📊 Initializing Brief-Explorer (Phase 2a)");

    await loadNavbar('stats');
    highlightActiveNavLink();

    try {
        // Load data
        const data = await loadPersons();
        allPersons = data.persons;
        timelineData = data.meta.timeline;
        console.log(`📊 Loaded ${allPersons.length} persons`);

        // Initialize FilterState singleton
        const filterState = new FilterState();

        // Subscribe to filter changes
        filterState.subscribe((filters) => {
            console.log("🔄 Filters updated:", filters);
            updateAllCharts();
            updateChartNotes();
            updateFilterChips();
        });

        initSearch();
        initMasterTimeline();
        initActivityFilter();
        initCharts();
        initExportButtons();
        initBasketButton();

        console.log("✅ Brief-Explorer ready (Phase 2a)");
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
        console.log("🔍 Global search initialized");
    }
}

// Initialize master timeline
function initMasterTimeline() {
    const container = document.getElementById('master-timeline');
    if (!container) return;

    const chart = echarts.init(container);
    charts.masterTimeline = chart;

    const filterState = new FilterState();
    const mode = filterState.filters.timeMode;

    // Prepare data based on mode
    let xAxisData, seriesData, minYear, maxYear;

    if (mode === 'correspondence') {
        // Use timeline from meta
        xAxisData = timelineData.map(t => t.year);
        seriesData = timelineData.map(t => t.count);
        minYear = 1762;
        maxYear = 1824;
    } else {
        // Generate lifespan histogram (births per decade)
        const decadeCounter = {};
        allPersons.forEach(person => {
            if (person.dates && person.dates.birth) {
                const year = parseInt(person.dates.birth);
                if (year >= 1700 && year <= 1850) {
                    const decade = Math.floor(year / 10) * 10;
                    decadeCounter[decade] = (decadeCounter[decade] || 0) + 1;
                }
            }
        });

        const decades = Object.keys(decadeCounter).sort((a, b) => parseInt(a) - parseInt(b));
        xAxisData = decades.map(d => parseInt(d));
        seriesData = decades.map(d => decadeCounter[d]);
        minYear = 1700;
        maxYear = 1850;
    }

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const year = params[0].name;
                const count = params[0].value;
                const label = mode === 'correspondence' ? 'Briefe' : 'Geburten';
                return `${year}: ${count} ${label}`;
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
                interval: mode === 'correspondence' ? 9 : 4,
                rotate: 0
            }
        },
        yAxis: {
            type: 'value',
            name: mode === 'correspondence' ? 'Briefe' : 'Personen',
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
            type: mode === 'correspondence' ? 'line' : 'bar',
            data: seriesData,
            smooth: mode === 'correspondence',
            lineStyle: mode === 'correspondence' ? {
                color: '#2c5f8d',
                width: 2
            } : undefined,
            itemStyle: {
                color: '#2c5f8d',
                borderRadius: mode === 'lifespan' ? [4, 4, 0, 0] : undefined
            },
            areaStyle: mode === 'correspondence' ? {
                color: 'rgba(44, 95, 141, 0.2)'
            } : undefined
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

    // Mode toggle buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newMode = btn.dataset.mode;
            if (newMode === filterState.filters.timeMode) return;

            // Update UI
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update FilterState and reinitialize timeline
            filterState.update({ timeMode: newMode, timeRange: null });
            initMasterTimeline();
            updateTimelineSelection(null, null);
        });
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

    console.log("⏱️ Master timeline initialized");
}

// Initialize activity filter checkboxes
function initActivityFilter() {
    const filterState = new FilterState();
    const checkboxes = document.querySelectorAll('.activity-checkbox');

    if (!checkboxes || checkboxes.length === 0) {
        console.warn("⚠️ Activity checkboxes not found");
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

    console.log("✅ Activity filter initialized");
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
        params.append('timeMode', filters.timeMode);
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
    const baseURL = 'synthesis/index.html';
    const queryString = params.toString();

    return queryString ? `${baseURL}?${queryString}` : baseURL;
}

// Update filter chips display
function updateFilterChips() {
    const filterState = new FilterState();
    const { timeRange, timeMode, occupation, place, activityTypes, birthDecade } = filterState.filters;

    const activeFiltersDiv = document.getElementById('active-filters');
    const filterChipsDiv = document.getElementById('filter-chips');

    if (!activeFiltersDiv || !filterChipsDiv) return;

    // Clear existing chips
    filterChipsDiv.innerHTML = '';

    const chips = [];
    const filteredPersons = filterState.getFilteredPersons();

    // Add time range chip if active
    if (timeRange) {
        const modeLabel = timeMode === 'correspondence' ? 'Korrespondenz' : 'Lebensdaten';
        chips.push({
            label: `${timeRange.start}–${timeRange.end} (${modeLabel})`,
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

    console.log('📊 Charts initialized');
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

// Chart 1: Berufsverteilung (Treemap)
function renderOccupationsChart() {
    const container = document.getElementById('chart-occupations');
    if (!charts.occupations) {
        charts.occupations = echarts.init(container);
    }

    const filterState = new FilterState();
    const persons = filterState.getFilteredPersons();

    // Count occupations
    const occCounter = {};
    persons.forEach(person => {
        if (person.occupations && person.occupations.length > 0) {
            person.occupations.forEach(occ => {
                occCounter[occ.name] = (occCounter[occ.name] || 0) + 1;
            });
        }
    });

    // Convert to treemap data (ALL occupations, not just top 15)
    const treemapData = Object.entries(occCounter)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
            name: name,
            value: value
        }));

    console.log(`📊 Treemap data: ${treemapData.length} occupations, top 5:`, treemapData.slice(0, 5));

    const option = {
        title: {
            text: `Alle Berufe (${treemapData.length})`,
            left: 'center',
            top: 10,
            textStyle: { fontSize: 14 }
        },
        tooltip: {
            formatter: (params) => {
                return `${params.name}<br/>${params.value} Personen`;
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
                    // Only show label if rect is large enough
                    if (params.value < 3) return '';
                    return `${params.name}\n${params.value}`;
                },
                fontSize: 11,
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
                    borderColor: '#2c5f8d',
                    borderWidth: 3
                },
                label: {
                    fontSize: 12,
                    fontWeight: 'bold'
                }
            },
            visualMin: 0,
            visualMax: Math.max(...treemapData.map(d => d.value)),
            colorMappingBy: 'value',
            levels: [
                {
                    color: ['#88b7d8', '#6ba3c8', '#4e8fb8', '#3d7ea8', '#2c5f8d'],
                    colorMappingBy: 'value',
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 2,
                        gapWidth: 2
                    }
                }
            ]
        }]
    };

    charts.occupations.setOption(option, true);

    // Add click handler for occupation filtering
    charts.occupations.off('click');  // Remove old handlers
    charts.occupations.on('click', (params) => {
        if (params.componentType === 'series') {
            const occupation = params.name;
            console.log(`🔍 Filter by occupation: ${occupation}`);

            // Toggle occupation filter
            if (filterState.filters.occupation === occupation) {
                // Click same occupation -> remove filter
                filterState.update({ occupation: null });
            } else {
                // Click different occupation -> set filter
                filterState.update({ occupation: occupation });
            }
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

    // Count places
    const placeCounter = {};
    persons.forEach(person => {
        if (person.places && person.places.length > 0) {
            person.places.forEach(place => {
                placeCounter[place.name] = (placeCounter[place.name] || 0) + 1;
            });
        }
    });

    // Sort and get top 10
    const sorted = Object.entries(placeCounter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const option = {
        title: {
            text: 'Top 10 Orte',
            left: 'center',
            textStyle: { fontSize: 14 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}: {c} Personen'
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
            console.log(`🔍 Filter by place: ${place}`);

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

// Chart 3: Generationen
function renderCohortsChart() {
    const container = document.getElementById('chart-cohorts');
    if (!charts.cohorts) {
        charts.cohorts = echarts.init(container);
    }

    const filterState = new FilterState();
    const persons = filterState.getFilteredPersons();

    // Count birth decades
    const decadeCounter = {};
    persons.forEach(person => {
        if (person.dates && person.dates.birth) {
            try {
                const year = parseInt(person.dates.birth);
                const decade = Math.floor(year / 10) * 10;
                decadeCounter[decade] = (decadeCounter[decade] || 0) + 1;
            } catch (e) {}
        }
    });

    // Sort by decade
    const sorted = Object.entries(decadeCounter)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    const option = {
        title: {
            text: 'Geburtsjahrzehnte',
            left: 'center',
            textStyle: { fontSize: 14 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}: {c} Personen'
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
            console.log(`🔍 Filter by birth decade: ${decade}`);

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

// Initialize export buttons
function initExportButtons() {
    const exportButtons = document.querySelectorAll('.btn-export');

    exportButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chartId = e.target.dataset.export;
            const format = e.target.dataset.format;

            if (format === 'csv') {
                exportCSV(chartId);
            } else if (format === 'png') {
                exportPNG(chartId);
            }
        });
    });

    console.log(`✅ Initialized ${exportButtons.length} export buttons`);
}

// Export chart as PNG
function exportPNG(chartId) {
    const chart = charts[chartId];
    if (!chart) return;

    const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
    });

    const link = document.createElement('a');
    link.download = `herdata-${chartId}.png`;
    link.href = url;
    link.click();

    console.log(`📥 Exported ${chartId} as PNG`);
}

// Export chart data as CSV (placeholder - will use filtered data)
function exportCSV(chartId) {
    console.log(`📥 CSV export for ${chartId} (filtered data)`);
    alert('CSV-Export wird in Phase 2b implementiert');
}

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
            showToast('Keine gefilterten Personen zum Hinzufügen', 'warning');
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
            showToast(message + extra);
        } else {
            showToast('Alle Personen bereits im Wissenskorb', 'info');
        }

        console.log(`🧺 Added ${added} persons to basket (${skipped} skipped)`);
    });

    console.log('✅ Basket button initialized');
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' :
                     type === 'warning' ? 'fas fa-exclamation-triangle' :
                     type === 'error' ? 'fas fa-times-circle' :
                     'fas fa-info-circle';
    toast.prepend(icon);

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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
