// HerData - Statistics Dashboard
// Renders statistical charts using Apache ECharts

import { loadPersons } from "./data.js";
import { loadNavbar } from "./navbar-loader.js";
import { GlobalSearch } from "./search.js";

let allPersons = [];
let charts = {};

// Initialize dashboard
async function init() {
    console.log("📊 Initializing statistics dashboard");

    await loadNavbar();
    highlightActiveNavLink();

    try {
        // Load data using shared module
        const data = await loadPersons();
        allPersons = data.persons;
        console.log(`📊 Loaded ${allPersons.length} persons`);

        initSearch();
        initCharts();
        initExportButtons();

        console.log("✅ Statistics dashboard ready");
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

// Initialize all charts
function initCharts() {
    renderOccupationsChart();
    renderTimelineChart();
    renderPlacesChart();
    renderCohortsChart();
    renderActivityChart();
}

// Chart 1: Berufsverteilung
function renderOccupationsChart() {
    const container = document.getElementById('chart-occupations');
    charts.occupations = echarts.init(container);

    // Count occupations
    const occCounter = {};
    allPersons.forEach(person => {
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
            textStyle: { fontSize: 16 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}: {c} Personen'
        },
        grid: {
            left: '20%',
            right: '5%',
            top: '15%',
            bottom: '10%'
        },
        xAxis: {
            type: 'value',
            name: 'Anzahl',
            nameLocation: 'middle',
            nameGap: 25
        },
        yAxis: {
            type: 'category',
            data: sorted.map(([name]) => name).reverse(),
            axisLabel: {
                fontSize: 11,
                overflow: 'truncate',
                width: 120
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
                fontSize: 11
            }
        }]
    };

    charts.occupations.setOption(option);
}

// Chart 2: Brief-Timeline
function renderTimelineChart() {
    const container = document.getElementById('chart-timeline');
    charts.timeline = echarts.init(container);

    // Get timeline data from persons.json meta
    fetch('data/persons.json')
        .then(res => res.json())
        .then(data => {
            const timeline = data.meta.timeline;

            const option = {
                title: {
                    text: 'Briefe pro Jahr (1772-1824)',
                    left: 'center',
                    textStyle: { fontSize: 16 }
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} Briefe'
                },
                grid: {
                    left: '10%',
                    right: '10%',
                    top: '15%',
                    bottom: '15%'
                },
                xAxis: {
                    type: 'category',
                    data: timeline.map(t => t.year),
                    name: 'Jahr',
                    nameLocation: 'middle',
                    nameGap: 30,
                    axisLabel: {
                        interval: 4,
                        rotate: 0
                    }
                },
                yAxis: {
                    type: 'value',
                    name: 'Anzahl Briefe',
                    nameLocation: 'middle',
                    nameGap: 50
                },
                series: [{
                    type: 'line',
                    data: timeline.map(t => t.count),
                    smooth: true,
                    lineStyle: {
                        color: '#2c5f8d',
                        width: 2
                    },
                    itemStyle: { color: '#2c5f8d' },
                    areaStyle: {
                        color: 'rgba(44, 95, 141, 0.2)'
                    }
                }]
            };

            charts.timeline.setOption(option);
        });
}

// Chart 3: Geografische Zentren
function renderPlacesChart() {
    const container = document.getElementById('chart-places');
    charts.places = echarts.init(container);

    // Count places
    const placeCounter = {};
    allPersons.forEach(person => {
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
            textStyle: { fontSize: 16 }
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
            bottom: '25%'
        },
        xAxis: {
            type: 'category',
            data: sorted.map(([name]) => name),
            axisLabel: {
                rotate: 45,
                fontSize: 11
            }
        },
        yAxis: {
            type: 'value',
            name: 'Anzahl Personen',
            nameLocation: 'middle',
            nameGap: 40
        },
        series: [{
            type: 'bar',
            data: sorted.map(([, count]) => count),
            itemStyle: {
                color: '#2d6a4f',
                borderRadius: [4, 4, 0, 0]
            },
            label: {
                show: true,
                position: 'top',
                formatter: '{c}'
            }
        }]
    };

    charts.places.setOption(option);
}

// Chart 4: Generationen (Geburtsjahrzehnte)
function renderCohortsChart() {
    const container = document.getElementById('chart-cohorts');
    charts.cohorts = echarts.init(container);

    // Count birth decades
    const decadeCounter = {};
    allPersons.forEach(person => {
        if (person.dates && person.dates.birth) {
            try {
                const year = parseInt(person.dates.birth);
                const decade = Math.floor(year / 10) * 10;
                decadeCounter[decade] = (decadeCounter[decade] || 0) + 1;
            } catch (e) {
                // Skip invalid dates
            }
        }
    });

    // Sort by decade
    const sorted = Object.entries(decadeCounter)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    const option = {
        title: {
            text: 'Geburtsjahrzehnte',
            left: 'center',
            textStyle: { fontSize: 16 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}er: {c} Personen'
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
            name: 'Jahrzehnt',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'value',
            name: 'Anzahl Personen',
            nameLocation: 'middle',
            nameGap: 40
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
                formatter: '{c}'
            }
        }]
    };

    charts.cohorts.setOption(option);
}

// Chart 5: Briefaktivität
function renderActivityChart() {
    const container = document.getElementById('chart-activity');
    charts.activity = echarts.init(container);

    // Count activity types
    const senders = allPersons.filter(p => (p.letter_count || 0) > 0).length;
    const mentioned = allPersons.filter(p => (p.mention_count || 0) > 0).length;
    const both = allPersons.filter(p => (p.letter_count || 0) > 0 && (p.mention_count || 0) > 0).length;
    const indirect = allPersons.filter(p => (p.letter_count || 0) === 0 && (p.mention_count || 0) === 0).length;

    const option = {
        title: {
            text: 'Briefaktivität (448 Frauen)',
            left: 'center',
            textStyle: { fontSize: 16 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: '{b}: {c} Personen ({d}%)'
        },
        grid: {
            left: '10%',
            right: '10%',
            top: '15%',
            bottom: '15%'
        },
        xAxis: {
            type: 'category',
            data: ['Absenderinnen', 'Erwähnt', 'Beides', 'Nur SNDB'],
            axisLabel: { fontSize: 12 }
        },
        yAxis: {
            type: 'value',
            name: 'Anzahl Personen',
            nameLocation: 'middle',
            nameGap: 40
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
                formatter: '{c}'
            },
            barMaxWidth: 80
        }]
    };

    charts.activity.setOption(option);
}

// Initialize export buttons
function initExportButtons() {
    // Individual export buttons
    document.querySelectorAll('.btn-export').forEach(btn => {
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

    // Export all button
    document.getElementById('export-all-btn').addEventListener('click', exportAll);
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

// Export chart data as CSV
async function exportCSV(chartId) {
    let csv = '';
    let filename = `herdata-${chartId}.csv`;

    switch (chartId) {
        case 'occupations':
            csv = generateOccupationsCSV();
            break;
        case 'timeline':
            csv = await generateTimelineCSV();
            break;
        case 'places':
            csv = generatePlacesCSV();
            break;
        case 'cohorts':
            csv = generateCohortsCSV();
            break;
        case 'activity':
            csv = generateActivityCSV();
            break;
    }

    downloadCSV(csv, filename);
    console.log(`📥 Exported ${chartId} as CSV`);
}

// Generate CSV for each chart type
function generateOccupationsCSV() {
    const occCounter = {};
    allPersons.forEach(person => {
        if (person.occupations && person.occupations.length > 0) {
            person.occupations.forEach(occ => {
                occCounter[occ.name] = (occCounter[occ.name] || 0) + 1;
            });
        }
    });

    const sorted = Object.entries(occCounter).sort((a, b) => b[1] - a[1]);
    let csv = 'Beruf,Anzahl,Prozent\n';
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);

    sorted.forEach(([name, count]) => {
        const percent = ((count / total) * 100).toFixed(1);
        csv += `"${name}",${count},${percent}%\n`;
    });

    return csv;
}

function generateTimelineCSV() {
    return fetch('data/persons.json')
        .then(res => res.json())
        .then(data => {
            let csv = 'Jahr,Briefe\n';
            data.meta.timeline.forEach(t => {
                csv += `${t.year},${t.count}\n`;
            });
            return csv;
        });
}

function generatePlacesCSV() {
    const placeCounter = {};
    const placeCoords = {};

    allPersons.forEach(person => {
        if (person.places && person.places.length > 0) {
            person.places.forEach(place => {
                placeCounter[place.name] = (placeCounter[place.name] || 0) + 1;
                placeCoords[place.name] = { lat: place.lat, lon: place.lon };
            });
        }
    });

    const sorted = Object.entries(placeCounter).sort((a, b) => b[1] - a[1]);
    let csv = 'Ort,Anzahl,Latitude,Longitude\n';

    sorted.forEach(([name, count]) => {
        const coords = placeCoords[name];
        csv += `"${name}",${count},${coords.lat},${coords.lon}\n`;
    });

    return csv;
}

function generateCohortsCSV() {
    const decadeCounter = {};
    allPersons.forEach(person => {
        if (person.dates && person.dates.birth) {
            try {
                const year = parseInt(person.dates.birth);
                const decade = Math.floor(year / 10) * 10;
                decadeCounter[decade] = (decadeCounter[decade] || 0) + 1;
            } catch (e) {}
        }
    });

    const sorted = Object.entries(decadeCounter).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    let csv = 'Jahrzehnt,Anzahl\n';

    sorted.forEach(([decade, count]) => {
        csv += `${decade}er,${count}\n`;
    });

    return csv;
}

function generateActivityCSV() {
    const senders = allPersons.filter(p => (p.letter_count || 0) > 0).length;
    const mentioned = allPersons.filter(p => (p.mention_count || 0) > 0).length;
    const both = allPersons.filter(p => (p.letter_count || 0) > 0 && (p.mention_count || 0) > 0).length;
    const indirect = allPersons.filter(p => (p.letter_count || 0) === 0 && (p.mention_count || 0) === 0).length;

    let csv = 'Kategorie,Anzahl,Prozent\n';
    const total = allPersons.length;

    csv += `Absenderinnen,${senders},${((senders/total)*100).toFixed(1)}%\n`;
    csv += `Erwähnt,${mentioned},${((mentioned/total)*100).toFixed(1)}%\n`;
    csv += `Beides,${both},${((both/total)*100).toFixed(1)}%\n`;
    csv += `Nur SNDB,${indirect},${((indirect/total)*100).toFixed(1)}%\n`;

    return csv;
}

// Download CSV helper
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Export all statistics as ZIP
async function exportAll() {
    console.log('📥 Exporting all statistics...');

    // Export all CSVs
    await exportCSV('occupations');
    await exportCSV('timeline');
    await exportCSV('places');
    await exportCSV('cohorts');
    await exportCSV('activity');

    // Note: Browser will download files individually
    // For true ZIP, we'd need JSZip library
    alert('Alle Statistiken wurden als CSV-Dateien heruntergeladen.');
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
