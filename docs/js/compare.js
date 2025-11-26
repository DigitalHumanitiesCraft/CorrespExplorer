// Compare Module - Handles CMIF dataset comparison
// Allows loading two datasets and finding common persons/places

import { parseCMIF } from './cmif-parser.js';
import { downloadFile, escapeHtml } from './utils.js';

// State
let datasetA = null;
let datasetB = null;
let comparisonResult = null;

// DOM Elements
let fileInputA, fileInputB;
let urlInputA, urlInputB;
let uploadA, uploadB;
let infoA, infoB;
let loadingA, loadingB;
let clearBtnA, clearBtnB;
let compareBtn;
let resultsSection;
let errorMessage;

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    // Cache DOM elements
    fileInputA = document.getElementById('file-input-a');
    fileInputB = document.getElementById('file-input-b');
    urlInputA = document.getElementById('url-input-a');
    urlInputB = document.getElementById('url-input-b');
    uploadA = document.getElementById('upload-a');
    uploadB = document.getElementById('upload-b');
    infoA = document.getElementById('info-a');
    infoB = document.getElementById('info-b');
    loadingA = document.getElementById('loading-a');
    loadingB = document.getElementById('loading-b');
    clearBtnA = document.getElementById('clear-a');
    clearBtnB = document.getElementById('clear-b');
    compareBtn = document.getElementById('compare-btn');
    resultsSection = document.getElementById('results-section');
    errorMessage = document.getElementById('error-message');

    setupEventListeners();
}

function setupEventListeners() {
    // File inputs
    fileInputA.addEventListener('change', (e) => handleFileSelect(e, 'a'));
    fileInputB.addEventListener('change', (e) => handleFileSelect(e, 'b'));

    // URL submits
    document.getElementById('url-submit-a').addEventListener('click', () => handleUrlSubmit('a'));
    document.getElementById('url-submit-b').addEventListener('click', () => handleUrlSubmit('b'));

    urlInputA.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUrlSubmit('a');
    });
    urlInputB.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUrlSubmit('b');
    });

    // Clear buttons
    clearBtnA.addEventListener('click', () => clearDataset('a'));
    clearBtnB.addEventListener('click', () => clearDataset('b'));

    // Compare button
    compareBtn.addEventListener('click', runComparison);

    // Tab switching
    document.querySelectorAll('.results-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Export button
    document.getElementById('export-comparison').addEventListener('click', exportComparison);
}

// File handlers
async function handleFileSelect(e, slot) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xml') && !file.type.includes('xml')) {
        showError('Bitte waehlen Sie eine XML-Datei aus.');
        return;
    }

    hideError();
    showLoading(slot);

    try {
        const data = await parseCMIF(file);
        data.sourceName = file.name;
        setDataset(slot, data);
    } catch (error) {
        showError(`Fehler beim Parsen: ${error.message}`);
        hideLoading(slot);
    }
}

async function handleUrlSubmit(slot) {
    const input = slot === 'a' ? urlInputA : urlInputB;
    const url = input.value.trim();

    if (!url) {
        showError('Bitte geben Sie eine URL ein.');
        return;
    }

    if (!isValidUrl(url)) {
        showError('Bitte geben Sie eine gueltige URL ein.');
        return;
    }

    hideError();
    showLoading(slot);

    try {
        const data = await parseCMIF(url);
        data.sourceName = url;
        setDataset(slot, data);
    } catch (error) {
        showError(`Fehler beim Laden: ${error.message}`);
        hideLoading(slot);
    }
}

function setDataset(slot, data) {
    if (slot === 'a') {
        datasetA = data;
    } else {
        datasetB = data;
    }

    hideLoading(slot);
    showDatasetInfo(slot, data);
    updateCompareButton();
}

function clearDataset(slot) {
    if (slot === 'a') {
        datasetA = null;
    } else {
        datasetB = null;
    }

    const upload = slot === 'a' ? uploadA : uploadB;
    const info = slot === 'a' ? infoA : infoB;
    const clearBtn = slot === 'a' ? clearBtnA : clearBtnB;
    const fileInput = slot === 'a' ? fileInputA : fileInputB;
    const urlInput = slot === 'a' ? urlInputA : urlInputB;

    upload.style.display = 'block';
    info.style.display = 'none';
    clearBtn.style.display = 'none';
    fileInput.value = '';
    urlInput.value = '';

    updateCompareButton();
    resultsSection.style.display = 'none';
}

function showLoading(slot) {
    const upload = slot === 'a' ? uploadA : uploadB;
    const loading = slot === 'a' ? loadingA : loadingB;
    upload.style.display = 'none';
    loading.style.display = 'flex';
}

function hideLoading(slot) {
    const upload = slot === 'a' ? uploadA : uploadB;
    const loading = slot === 'a' ? loadingA : loadingB;
    loading.style.display = 'none';
}

function showDatasetInfo(slot, data) {
    const upload = slot === 'a' ? uploadA : uploadB;
    const info = slot === 'a' ? infoA : infoB;
    const clearBtn = slot === 'a' ? clearBtnA : clearBtnB;

    upload.style.display = 'none';
    info.style.display = 'block';
    clearBtn.style.display = 'block';

    // Update info
    const title = slot === 'a' ? document.getElementById('title-a') : document.getElementById('title-b');
    const letters = slot === 'a' ? document.getElementById('letters-a') : document.getElementById('letters-b');
    const persons = slot === 'a' ? document.getElementById('persons-a') : document.getElementById('persons-b');
    const places = slot === 'a' ? document.getElementById('places-a') : document.getElementById('places-b');

    // Extract name from source
    let name = data.sourceName || 'Unbekannt';
    if (name.length > 40) {
        name = '...' + name.slice(-37);
    }
    title.textContent = name;

    letters.textContent = (data.letters?.length || 0).toLocaleString('de-DE');
    persons.textContent = countUniquePersons(data.letters || []).toLocaleString('de-DE');
    places.textContent = countUniquePlaces(data.letters || []).toLocaleString('de-DE');
}

function updateCompareButton() {
    compareBtn.disabled = !datasetA || !datasetB;
}

// Comparison logic
function runComparison() {
    if (!datasetA || !datasetB) return;

    hideError();

    // Extract entities from both datasets
    const personsA = extractPersons(datasetA.letters || []);
    const personsB = extractPersons(datasetB.letters || []);
    const placesA = extractPlaces(datasetA.letters || []);
    const placesB = extractPlaces(datasetB.letters || []);

    // Find common entities by authority ID
    const commonPersons = findCommonById(personsA, personsB);
    const commonPlaces = findCommonById(placesA, placesB);

    // Find unique entities
    const uniquePersonsA = findUniqueById(personsA, personsB);
    const uniquePersonsB = findUniqueById(personsB, personsA);

    // Calculate overlap percentage
    const totalPersonsA = Object.keys(personsA).length;
    const totalPersonsB = Object.keys(personsB).length;
    const commonCount = commonPersons.length;
    const overlapPercent = totalPersonsA + totalPersonsB > 0
        ? Math.round((commonCount * 2) / (totalPersonsA + totalPersonsB) * 100)
        : 0;

    comparisonResult = {
        commonPersons,
        commonPlaces,
        uniquePersonsA,
        uniquePersonsB,
        overlapPercent,
        totalA: { persons: totalPersonsA, places: Object.keys(placesA).length },
        totalB: { persons: totalPersonsB, places: Object.keys(placesB).length }
    };

    displayResults();
}

function extractPersons(letters) {
    const persons = {};
    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            if (person?.name) {
                const key = person.id || person.name;
                if (!persons[key]) {
                    persons[key] = {
                        id: person.id,
                        name: person.name,
                        authority: person.authority,
                        letterCount: 0
                    };
                }
                persons[key].letterCount++;
            }
        });
    });
    return persons;
}

function extractPlaces(letters) {
    const places = {};
    letters.forEach(letter => {
        const place = letter.place_sent;
        if (place?.name) {
            const key = place.id || place.name;
            if (!places[key]) {
                places[key] = {
                    id: place.id,
                    name: place.name,
                    letterCount: 0
                };
            }
            places[key].letterCount++;
        }
    });
    return places;
}

function findCommonById(entitiesA, entitiesB) {
    const common = [];
    const keysA = Object.keys(entitiesA);

    keysA.forEach(key => {
        if (entitiesB[key]) {
            common.push({
                ...entitiesA[key],
                countA: entitiesA[key].letterCount,
                countB: entitiesB[key].letterCount
            });
        }
    });

    // Sort by combined count
    common.sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));
    return common;
}

function findUniqueById(entitiesA, entitiesB) {
    const unique = [];
    const keysA = Object.keys(entitiesA);

    keysA.forEach(key => {
        if (!entitiesB[key]) {
            unique.push(entitiesA[key]);
        }
    });

    // Sort by count
    unique.sort((a, b) => b.letterCount - a.letterCount);
    return unique;
}

function displayResults() {
    if (!comparisonResult) return;

    resultsSection.style.display = 'block';

    // Update summary
    document.getElementById('common-persons-count').textContent =
        comparisonResult.commonPersons.length.toLocaleString('de-DE');
    document.getElementById('common-places-count').textContent =
        comparisonResult.commonPlaces.length.toLocaleString('de-DE');
    document.getElementById('overlap-percent').textContent =
        comparisonResult.overlapPercent + '%';

    // Update tab counts
    document.getElementById('tab-persons-count').textContent = comparisonResult.commonPersons.length;
    document.getElementById('tab-places-count').textContent = comparisonResult.commonPlaces.length;
    document.getElementById('tab-unique-a-count').textContent = comparisonResult.uniquePersonsA.length;
    document.getElementById('tab-unique-b-count').textContent = comparisonResult.uniquePersonsB.length;

    // Render lists
    renderCommonPersons();
    renderCommonPlaces();
    renderUniquePersons('a');
    renderUniquePersons('b');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function renderCommonPersons() {
    const container = document.getElementById('list-persons');

    if (comparisonResult.commonPersons.length === 0) {
        container.innerHTML = '<div class="empty-state">Keine gemeinsamen Personen gefunden</div>';
        return;
    }

    container.innerHTML = comparisonResult.commonPersons.map(person => `
        <div class="result-item">
            <div class="result-icon"><i class="fas fa-user"></i></div>
            <div class="result-info">
                <div class="result-name">${escapeHtml(person.name)}</div>
                ${person.authority && person.id ? `
                    <div class="result-meta">
                        <a href="${getAuthorityUrl(person.authority, person.id)}" target="_blank" rel="noopener">
                            ${person.authority.toUpperCase()}: ${person.id}
                        </a>
                    </div>
                ` : ''}
            </div>
            <div class="result-counts">
                <span class="count-badge count-a">${person.countA} in A</span>
                <span class="count-badge count-b">${person.countB} in B</span>
            </div>
        </div>
    `).join('');
}

function renderCommonPlaces() {
    const container = document.getElementById('list-places');

    if (comparisonResult.commonPlaces.length === 0) {
        container.innerHTML = '<div class="empty-state">Keine gemeinsamen Orte gefunden</div>';
        return;
    }

    container.innerHTML = comparisonResult.commonPlaces.map(place => `
        <div class="result-item">
            <div class="result-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div class="result-info">
                <div class="result-name">${escapeHtml(place.name)}</div>
                ${place.id ? `
                    <div class="result-meta">GeoNames: ${place.id}</div>
                ` : ''}
            </div>
            <div class="result-counts">
                <span class="count-badge count-a">${place.countA} in A</span>
                <span class="count-badge count-b">${place.countB} in B</span>
            </div>
        </div>
    `).join('');
}

function renderUniquePersons(slot) {
    const container = document.getElementById(`list-unique-${slot}`);
    const persons = slot === 'a' ? comparisonResult.uniquePersonsA : comparisonResult.uniquePersonsB;
    const label = slot === 'a' ? 'A' : 'B';

    if (persons.length === 0) {
        container.innerHTML = `<div class="empty-state">Alle Personen aus ${label} sind auch in ${slot === 'a' ? 'B' : 'A'} enthalten</div>`;
        return;
    }

    container.innerHTML = persons.slice(0, 100).map(person => `
        <div class="result-item">
            <div class="result-icon"><i class="fas fa-user"></i></div>
            <div class="result-info">
                <div class="result-name">${escapeHtml(person.name)}</div>
                ${person.authority && person.id ? `
                    <div class="result-meta">
                        <a href="${getAuthorityUrl(person.authority, person.id)}" target="_blank" rel="noopener">
                            ${person.authority.toUpperCase()}: ${person.id}
                        </a>
                    </div>
                ` : ''}
            </div>
            <div class="result-counts">
                <span class="count-badge">${person.letterCount} Briefe</span>
            </div>
        </div>
    `).join('') + (persons.length > 100 ? `<div class="more-indicator">... und ${persons.length - 100} weitere</div>` : '');
}

function switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.results-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update panels
    document.querySelectorAll('.results-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });
}

function getAuthorityUrl(authority, id) {
    switch (authority) {
        case 'gnd':
            return `https://d-nb.info/gnd/${id}`;
        case 'viaf':
            return `https://viaf.org/viaf/${id}`;
        default:
            return '#';
    }
}

function exportComparison() {
    if (!comparisonResult) return;

    const lines = [];

    // Header
    lines.push('=== CMIF Datensatz-Vergleich ===');
    lines.push(`Datensatz A: ${datasetA.sourceName || 'Unbekannt'}`);
    lines.push(`Datensatz B: ${datasetB.sourceName || 'Unbekannt'}`);
    lines.push(`Ueberschneidung: ${comparisonResult.overlapPercent}%`);
    lines.push('');

    // Common persons
    lines.push('=== GEMEINSAME PERSONEN ===');
    lines.push('Name,Authority,ID,Briefe_A,Briefe_B');
    comparisonResult.commonPersons.forEach(p => {
        lines.push([
            `"${p.name}"`,
            p.authority || '',
            p.id || '',
            p.countA,
            p.countB
        ].join(','));
    });
    lines.push('');

    // Common places
    lines.push('=== GEMEINSAME ORTE ===');
    lines.push('Name,GeoNames_ID,Briefe_A,Briefe_B');
    comparisonResult.commonPlaces.forEach(p => {
        lines.push([
            `"${p.name}"`,
            p.id || '',
            p.countA,
            p.countB
        ].join(','));
    });
    lines.push('');

    // Unique persons A
    lines.push('=== NUR IN DATENSATZ A ===');
    lines.push('Name,Authority,ID,Briefe');
    comparisonResult.uniquePersonsA.forEach(p => {
        lines.push([
            `"${p.name}"`,
            p.authority || '',
            p.id || '',
            p.letterCount
        ].join(','));
    });
    lines.push('');

    // Unique persons B
    lines.push('=== NUR IN DATENSATZ B ===');
    lines.push('Name,Authority,ID,Briefe');
    comparisonResult.uniquePersonsB.forEach(p => {
        lines.push([
            `"${p.name}"`,
            p.authority || '',
            p.id || '',
            p.letterCount
        ].join(','));
    });

    const content = lines.join('\n');
    downloadFile(content, 'cmif-vergleich.csv', 'text/csv;charset=utf-8;');
}

// Helper functions
function countUniquePersons(letters) {
    const persons = new Set();
    letters.forEach(letter => {
        if (letter.sender?.name) persons.add(letter.sender.id || letter.sender.name);
        if (letter.recipient?.name) persons.add(letter.recipient.id || letter.recipient.name);
    });
    return persons.size;
}

function countUniquePlaces(letters) {
    const places = new Set();
    letters.forEach(letter => {
        if (letter.place_sent?.name) places.add(letter.place_sent.id || letter.place_sent.name);
    });
    return places.size;
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('active');
}

function hideError() {
    errorMessage.classList.remove('active');
    errorMessage.textContent = '';
}
