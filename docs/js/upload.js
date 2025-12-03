// Upload Component - Handles CMIF file upload and URL loading
// Parses CMIF-XML and stores data for visualization

import { parseCMIF, enrichWithCoordinates } from './cmif-parser.js';
import { isCorrespSearchUrl, searchCorrespSearch, getResultCount } from './correspsearch-api.js';
import { enrichPersonsBatch, countEnrichable } from './wikidata-enrichment.js';
import { resolveGeoNamesCoordinates, applyCoordinatesToData, analyzeCoordinateNeeds } from './geonames-enrichment.js';
import { analyzeDataCapabilities } from './utils.js';

// DOM Elements
let uploadZone, fileInput, urlInput, urlSubmit;
let errorMessage, loadingState, loadingText;
let datasetCards;

// Config modal elements
let configModal;

// Pending data for configuration
let pendingData = null;
let pendingSourceInfo = null;

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    // Cache DOM elements
    uploadZone = document.getElementById('upload-zone');
    fileInput = document.getElementById('file-input');
    urlInput = document.getElementById('url-input');
    urlSubmit = document.getElementById('url-submit');
    errorMessage = document.getElementById('error-message');
    loadingState = document.getElementById('loading-state');
    loadingText = document.getElementById('loading-text');
    datasetCards = document.querySelectorAll('.dataset-card');

    // Config modal
    configModal = document.getElementById('config-modal');

    setupEventListeners();
}

function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // Click on upload zone
    uploadZone.addEventListener('click', (e) => {
        if (e.target !== fileInput && !e.target.classList.contains('upload-btn')) {
            fileInput.click();
        }
    });

    // URL submit
    urlSubmit.addEventListener('click', handleUrlSubmit);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUrlSubmit();
        }
    });

    // Dataset cards
    console.log('Found dataset cards:', datasetCards.length);
    datasetCards.forEach(card => {
        card.addEventListener('click', () => {
            console.log('Card clicked:', card.dataset.url || card.dataset.dataset);
            handleDatasetSelect(card);
        });
    });

    // Config modal buttons
    if (configModal) {
        const closeBtn = configModal.querySelector('.modal-close');
        const skipBtn = document.getElementById('config-skip-btn');
        const startBtn = document.getElementById('config-start-btn');

        if (closeBtn) closeBtn.addEventListener('click', hideConfigModal);
        if (skipBtn) skipBtn.addEventListener('click', handleConfigSkip);
        if (startBtn) startBtn.addEventListener('click', handleConfigStart);

        configModal.addEventListener('click', (e) => {
            if (e.target === configModal) hideConfigModal();
        });
    }
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// File select handler
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// URL submit handler
async function handleUrlSubmit() {
    const url = urlInput.value.trim();

    if (!url) {
        showError('Bitte geben Sie eine URL ein.');
        return;
    }

    if (!isValidUrl(url)) {
        showError('Bitte geben Sie eine gueltige URL ein.');
        return;
    }

    hideError();

    // Check if this is a correspSearch API URL
    if (isCorrespSearchUrl(url)) {
        showLoading('Lade von correspSearch API...');
        try {
            const data = await parseCMIF(url, (loaded, total) => {
                if (total) {
                    updateLoadingText(`Lade Briefe... ${loaded}${total > loaded ? '+' : ''}`);
                } else {
                    updateLoadingText(`Lade Briefe... ${loaded}+`);
                }
            });
            await showConfigDialog(data, { type: 'correspsearch', source: url });
        } catch (error) {
            showError(`Fehler beim Laden: ${error.message}`);
            hideLoading();
        }
        return;
    }

    showLoading('Lade CMIF von URL...');

    try {
        const data = await parseCMIF(url);
        await showConfigDialog(data, { type: 'url', source: url });
    } catch (error) {
        showError(`Fehler beim Laden: ${error.message}`);
        hideLoading();
    }
}

// Dataset card handler
async function handleDatasetSelect(card) {
    const dataset = card.dataset.dataset;
    const info = card.dataset.info;
    const url = card.dataset.url;
    const isDemo = card.dataset.demo === 'true';

    console.log('handleDatasetSelect:', { dataset, info, url, isDemo });

    hideError();

    if (dataset === 'hsa') {
        // HSA uses preprocessed local data - redirect directly (already enriched)
        window.location.href = 'explore.html?dataset=hsa';
    } else if (url) {
        // External CMIF URL - load and show config
        console.log('Loading CMIF from:', url);
        showLoading('Lade CMIF von URL...');
        try {
            const data = await parseCMIF(url);
            console.log('CMIF parsed successfully:', data);
            await showConfigDialog(data, { type: 'url', source: url, isDemo: isDemo });
        } catch (error) {
            console.error('Error loading CMIF:', error);
            showError(`Fehler beim Laden: ${error.message}`);
            hideLoading();
        }
    } else if (info === 'cmif') {
        // Trigger file input click
        fileInput.click();
    }
}

// Process uploaded file
async function processFile(file) {
    // Validate file type
    if (!file.name.endsWith('.xml') && !file.type.includes('xml')) {
        showError('Bitte waehlen Sie eine XML-Datei aus.');
        return;
    }

    hideError();
    showLoading(`Verarbeite ${file.name}...`);

    try {
        const data = await parseCMIF(file);
        await showConfigDialog(data, { type: 'file', source: file.name });
    } catch (error) {
        showError(`Fehler beim Parsen: ${error.message}`);
        hideLoading();
    }
}

// Show configuration dialog
async function showConfigDialog(data, sourceInfo) {
    console.log('showConfigDialog called with:', { letterCount: data.letters?.length, sourceInfo });
    hideLoading();

    // Store pending data
    pendingData = data;
    pendingSourceInfo = sourceInfo;

    // Try to enrich with cached coordinates first
    try {
        const coordsResponse = await fetch('data/geonames_coordinates.json');
        if (coordsResponse.ok) {
            const coordsCache = await coordsResponse.json();
            enrichWithCoordinates(pendingData, coordsCache);
            console.log('Static coordinates enriched');
        }
    } catch (error) {
        console.log('Coordinates cache not available:', error);
    }

    // Analyze data capabilities
    console.log('Analyzing data capabilities...');
    const capabilities = analyzeDataCapabilities(data);
    const coordStats = analyzeCoordinateNeeds(data);
    console.log('Coordinate stats:', coordStats);

    // Count entities
    const letterCount = data.letters?.length || 0;
    const personCount = countUniquePersons(data.letters || []);
    const placeCount = countUniquePlaces(data.letters || []);
    const enrichableCount = countEnrichablePersons(data.letters || []);

    // Update modal content
    document.getElementById('config-letters-count').textContent = letterCount.toLocaleString('de-DE');
    document.getElementById('config-persons-count').textContent = personCount.toLocaleString('de-DE');
    document.getElementById('config-places-count').textContent = placeCount.toLocaleString('de-DE');

    // Coordinate enrichment option
    const coordOption = document.getElementById('config-option-coordinates');
    const coordInfo = document.getElementById('enrich-coordinates-info');
    const coordCheckbox = document.getElementById('enrich-coordinates');

    if (coordStats.needsResolution > 0) {
        coordOption.style.display = 'block';
        const cacheInfo = coordStats.withCoordinates > 0 ?
            ` (${coordStats.withCoordinates} bereits im Cache)` : '';
        coordInfo.textContent = `${coordStats.needsResolution} Orte mit GeoNames-ID${cacheInfo}`;
        coordCheckbox.disabled = false;
        coordCheckbox.checked = true;
    } else {
        coordOption.style.display = 'none';
    }

    // Person enrichment option
    document.getElementById('enrich-persons-info').textContent = `${enrichableCount} Personen mit Authority-ID`;

    // Show warning for large datasets
    const warningEl = document.getElementById('config-warning');
    const warningTextEl = document.getElementById('config-warning-text');

    const totalTime = Math.ceil(coordStats.needsResolution * 0.2 + enrichableCount * 0.15);

    if (enrichableCount > 50 || coordStats.needsResolution > 50) {
        warningEl.style.display = 'block';
        warningTextEl.textContent = `Die Anreicherung kann ca. ${totalTime} Sekunden dauern.`;
    } else if (enrichableCount === 0 && coordStats.needsResolution === 0) {
        warningEl.style.display = 'block';
        warningTextEl.textContent = 'Keine Anreicherungsoptionen verfuegbar.';
    } else {
        warningEl.style.display = 'none';
    }

    // Disable person enrichment if no enrichable persons
    if (enrichableCount === 0) {
        document.getElementById('enrich-persons').checked = false;
        document.getElementById('enrich-persons').disabled = true;
    } else {
        document.getElementById('enrich-persons').disabled = false;
    }

    console.log('Preparing to show modal...');

    // Reset progress
    const progressSection = document.getElementById('config-progress');
    progressSection.classList.add('hidden');
    progressSection.style.display = 'none';
    document.getElementById('config-progress-fill').style.width = '0%';

    // Show buttons
    document.querySelector('.config-actions').style.display = 'flex';

    console.log('Opening modal...');
    // Show modal
    configModal.classList.remove('hidden');
    configModal.style.display = 'flex';
    console.log('Modal should be visible now. configModal:', configModal);
}

function hideConfigModal() {
    configModal.classList.add('hidden');
    configModal.style.display = 'none';

    // Reset progress section
    const progressSection = document.getElementById('config-progress');
    progressSection.classList.add('hidden');
    progressSection.style.display = 'none';

    pendingData = null;
    pendingSourceInfo = null;
}

// Skip enrichment and go directly to visualization
function handleConfigSkip() {
    if (!pendingData) return;
    finalizeAndRedirect(pendingData, pendingSourceInfo);
}

// Start enrichment process
async function handleConfigStart() {
    if (!pendingData) return;

    const shouldEnrichCoords = document.getElementById('enrich-coordinates')?.checked;
    const shouldEnrichPersons = document.getElementById('enrich-persons')?.checked;

    if (!shouldEnrichCoords && !shouldEnrichPersons) {
        finalizeAndRedirect(pendingData, pendingSourceInfo);
        return;
    }

    // Hide buttons, show progress
    document.querySelector('.config-actions').style.display = 'none';
    const progressSection = document.getElementById('config-progress');
    progressSection.classList.remove('hidden');
    progressSection.style.display = 'block';

    const progressFill = document.getElementById('config-progress-fill');
    const progressText = document.getElementById('config-progress-text');

    // Step 1: Enrich coordinates (if requested)
    if (shouldEnrichCoords) {
        const coordStats = analyzeCoordinateNeeds(pendingData);

        if (coordStats.needsResolution > 0) {
            try {
                progressText.textContent = 'Lade Koordinaten von Wikidata...';

                const coordinates = await resolveGeoNamesCoordinates(
                    coordStats.geonamesIdsToResolve,
                    (loaded, total) => {
                        const percent = Math.round((loaded / total) * 50); // First 50% of progress
                        progressFill.style.width = `${percent}%`;
                        progressText.textContent = `Lade Koordinaten... ${loaded}/${total}`;
                    }
                );

                applyCoordinatesToData(pendingData, coordinates);
                progressText.textContent = `${Object.keys(coordinates).length} Orte georeferenziert`;

            } catch (error) {
                console.warn('Coordinate enrichment failed:', error);
                progressText.textContent = 'Koordinaten-Auflösung fehlgeschlagen, fahre fort...';
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Step 2: Enrich persons (if requested)
    if (shouldEnrichPersons) {
        const persons = extractEnrichablePersons(pendingData.letters || []);

        if (persons.length > 0) {
            try {
                const baseProgress = shouldEnrichCoords ? 50 : 0;

                const enrichedMap = await enrichPersonsBatch(persons, (current, total, person) => {
                    const percent = baseProgress + Math.round((current / total) * (100 - baseProgress));
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Lade Personen... ${current}/${total}: ${person.name}`;
                });

                // Store enrichment data in session storage for use by explore.js
                if (enrichedMap.size > 0) {
                    const enrichmentData = {};
                    enrichedMap.forEach((data, authorityId) => {
                        enrichmentData[authorityId] = data;
                    });
                    sessionStorage.setItem('person-enrichment', JSON.stringify(enrichmentData));
                }

                progressText.textContent = `${enrichedMap.size} Personen angereichert`;

            } catch (error) {
                console.warn('Person enrichment failed:', error);
                progressText.textContent = 'Personen-Anreicherung fehlgeschlagen, fahre fort...';
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    finalizeAndRedirect(pendingData, pendingSourceInfo);
}

// Store data and redirect to visualization
function finalizeAndRedirect(data, sourceInfo) {
    const storedData = {
        ...data,
        sourceInfo,
        loadedAt: new Date().toISOString()
    };

    try {
        sessionStorage.setItem('cmif-data', JSON.stringify(storedData));
    } catch (e) {
        showError(`Datensatz zu gross fuer Browser-Speicher (${data.letters?.length || 0} Briefe). Bitte verwenden Sie einen kleineren Datensatz oder das vorprozessierte HSA.`);
        hideConfigModal();
        return;
    }

    // Redirect to visualization - append demo flag if needed
    const redirectUrl = sourceInfo?.isDemo ? 'explore.html?demo=true' : 'explore.html';
    window.location.href = redirectUrl;
}

// Helper: Count unique persons
function countUniquePersons(letters) {
    const persons = new Set();
    letters.forEach(letter => {
        if (letter.sender?.name) persons.add(letter.sender.name);
        if (letter.recipient?.name) persons.add(letter.recipient.name);
    });
    return persons.size;
}

// Helper: Count unique places
function countUniquePlaces(letters) {
    const places = new Set();
    letters.forEach(letter => {
        if (letter.place_sent?.name) places.add(letter.place_sent.name);
    });
    return places.size;
}

// Helper: Count enrichable persons (with GND or VIAF)
function countEnrichablePersons(letters) {
    const persons = new Map();
    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            if (person?.id && person?.authority && ['gnd', 'viaf'].includes(person.authority)) {
                persons.set(person.id, person);
            }
        });
    });
    return persons.size;
}

// Helper: Extract enrichable persons for batch processing
function extractEnrichablePersons(letters) {
    const persons = new Map();
    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            if (person?.id && person?.authority && ['gnd', 'viaf'].includes(person.authority)) {
                if (!persons.has(person.id)) {
                    persons.set(person.id, {
                        name: person.name,
                        authority: person.authority,
                        authorityId: person.id
                    });
                }
            }
        });
    });
    return Array.from(persons.values());
}

// UI helpers
function showLoading(text) {
    loadingState.classList.add('active');
    uploadZone.style.display = 'none';
    document.querySelector('.url-input-section').style.display = 'none';
    const csSection = document.getElementById('correspsearch-section');
    if (csSection) csSection.style.display = 'none';
    document.querySelector('.example-datasets').style.display = 'none';
    if (text) {
        loadingText.textContent = text;
    }
}

function hideLoading() {
    loadingState.classList.remove('active');
    uploadZone.style.display = 'block';
    document.querySelector('.url-input-section').style.display = 'block';
    const csSection = document.getElementById('correspsearch-section');
    if (csSection) csSection.style.display = 'block';
    document.querySelector('.example-datasets').style.display = 'block';
}

function updateLoadingText(text) {
    loadingText.textContent = text;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('active');
}

function hideError() {
    errorMessage.classList.remove('active');
    errorMessage.textContent = '';
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}
