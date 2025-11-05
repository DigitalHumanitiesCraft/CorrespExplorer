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
            timeMode: 'correspondence'  // 'correspondence' or 'lifespan'
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
        if (!this.filters.timeRange) {
            return allPersons;
        }

        const { start, end } = this.filters.timeRange;
        const { timeMode } = this.filters;

        return allPersons.filter(person => {
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

    // Reset filters
    reset() {
        this.filters = {
            timeRange: null,
            timeMode: this.filters.timeMode  // Keep current mode
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
        initCharts();
        initExportButtons();

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

// Update filter chips display
function updateFilterChips() {
    const filterState = new FilterState();
    const { timeRange, timeMode } = filterState.filters;

    const activeFiltersDiv = document.getElementById('active-filters');
    const filterChipsDiv = document.getElementById('filter-chips');

    if (!activeFiltersDiv || !filterChipsDiv) return;

    // Clear existing chips
    filterChipsDiv.innerHTML = '';

    const chips = [];

    // Add time range chip if active
    if (timeRange) {
        const modeLabel = timeMode === 'correspondence' ? 'Korrespondenz' : 'Lebensdaten';
        chips.push({
            label: `${timeRange.start}–${timeRange.end} (${modeLabel})`,
            onRemove: () => {
                filterState.reset();
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
    } else {
        activeFiltersDiv.style.display = 'none';
    }
}

// Initialize all charts
function initCharts() {
    renderOccupationsChart();
    renderPlacesChart();
    renderCohortsChart();
    renderActivityChart();

    // Connect charts for coordinated tooltips and highlights
    echarts.connect([
        charts.masterTimeline,
        charts.occupations,
        charts.places,
        charts.cohorts,
        charts.activity
    ]);

    console.log('📊 Charts connected for linked brushing');
}

// Update all charts with filtered data
function updateAllCharts() {
    renderOccupationsChart();
    renderPlacesChart();
    renderCohortsChart();
    renderActivityChart();
}

// Update chart notes with current filter stats
function updateChartNotes() {
    const filterState = new FilterState();
    const filteredPersons = filterState.getFilteredPersons();

    // Update occupation note
    const occWithData = filteredPersons.filter(p => p.occupations && p.occupations.length > 0).length;
    const occNote = document.getElementById('note-occupations');
    if (occNote) {
        occNote.textContent = `${occWithData} von ${filteredPersons.length} Frauen (${Math.round(occWithData/filteredPersons.length*100)}%) haben Berufsangaben`;
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

    // Update activity note
    const activityNote = document.getElementById('note-activity');
    if (activityNote) {
        activityNote.textContent = `Verteilung nach Rolle (${filteredPersons.length} Frauen)`;
    }
}

// Chart 1: Berufsverteilung
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

    // Sort and get top 15
    const sorted = Object.entries(occCounter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    const option = {
        title: {
            text: 'Top 15 Berufe',
            left: 'center',
            textStyle: { fontSize: 14 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}: {c} Personen'
        },
        grid: {
            left: '25%',
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
                width: 100
            }
        },
        series: [{
            type: 'bar',
            data: sorted.map(([, count]) => count).reverse(),
            itemStyle: {
                color: '#2c5f8d',
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

    charts.occupations.setOption(option, true);
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
}

// Chart 4: Briefaktivität
function renderActivityChart() {
    const container = document.getElementById('chart-activity');
    if (!charts.activity) {
        charts.activity = echarts.init(container);
    }

    const filterState = new FilterState();
    const persons = filterState.getFilteredPersons();

    // Count activity types
    const senders = persons.filter(p => (p.letter_count || 0) > 0 && (p.mention_count || 0) === 0).length;
    const mentioned = persons.filter(p => (p.letter_count || 0) === 0 && (p.mention_count || 0) > 0).length;
    const both = persons.filter(p => (p.letter_count || 0) > 0 && (p.mention_count || 0) > 0).length;
    const indirect = persons.filter(p => (p.letter_count || 0) === 0 && (p.mention_count || 0) === 0).length;

    const option = {
        title: {
            text: `Briefaktivität (${persons.length} Frauen)`,
            left: 'center',
            textStyle: { fontSize: 14 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const name = params[0].name;
                const value = params[0].value;
                const percent = ((value / persons.length) * 100).toFixed(1);
                return `${name}: ${value} (${percent}%)`;
            }
        },
        grid: {
            left: '10%',
            right: '10%',
            top: '15%',
            bottom: '20%'
        },
        xAxis: {
            type: 'category',
            data: ['Nur Absenderin', 'Nur Erwähnt', 'Beides', 'Nur SNDB'],
            axisLabel: {
                fontSize: 10,
                rotate: 20
            }
        },
        yAxis: {
            type: 'value',
            name: 'Personen'
        },
        series: [{
            type: 'bar',
            data: [
                { value: senders, itemStyle: { color: '#2c5f8d' } },
                { value: mentioned, itemStyle: { color: '#6c757d' } },
                { value: both, itemStyle: { color: '#2d6a4f' } },
                { value: indirect, itemStyle: { color: '#adb5bd' } }
            ],
            label: {
                show: true,
                position: 'top',
                formatter: '{c}',
                fontSize: 10
            },
            barMaxWidth: 60
        }]
    };

    charts.activity.setOption(option, true);
}

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
