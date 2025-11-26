// Upload Component - Handles CMIF file upload and URL loading
// Parses CMIF-XML and stores data for visualization
// Also handles correspSearch API queries

import { parseCMIF, enrichWithCoordinates } from './cmif-parser.js';
import { isCorrespSearchUrl, searchCorrespSearch, getResultCount } from './correspsearch-api.js';
import { enrichPersonsBatch, countEnrichable } from './wikidata-enrichment.js';

// DOM Elements
let uploadZone, fileInput, urlInput, urlSubmit;
let errorMessage, loadingState, loadingText;
let datasetCards;
let csSearchForm, csSearchBtn, csResultInfo;

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

    // correspSearch form elements
    csSearchForm = document.getElementById('cs-search-form');
    csSearchBtn = document.getElementById('cs-search-btn');
    csResultInfo = document.getElementById('cs-result-info');

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
    datasetCards.forEach(card => {
        card.addEventListener('click', () => handleDatasetSelect(card));
    });

    // correspSearch form
    if (csSearchBtn) {
        csSearchBtn.addEventListener('click', handleCorrespSearchSubmit);
    }
    if (csSearchForm) {
        csSearchForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCorrespSearchSubmit();
            }
        });
    }

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

// correspSearch form submit handler
async function handleCorrespSearchSubmit() {
    const correspondent = document.getElementById('cs-correspondent')?.value.trim();
    const place = document.getElementById('cs-place')?.value.trim();
    const startdate = document.getElementById('cs-startdate')?.value.trim();
    const enddate = document.getElementById('cs-enddate')?.value.trim();

    // Build search params
    const params = {};
    if (correspondent) params.correspondent = correspondent;
    if (place) params.placeSender = place;
    if (startdate) params.startdate = startdate;
    if (enddate) params.enddate = enddate;

    // Validate at least one parameter
    if (Object.keys(params).length === 0) {
        showError('Bitte geben Sie mindestens einen Suchparameter ein.');
        return;
    }

    hideError();

    // First check result count
    if (csResultInfo) {
        csResultInfo.textContent = 'Pruefe Ergebnisanzahl...';
        csResultInfo.classList.add('active');
    }

    try {
        const countResult = await getResultCount(params);

        if (countResult.count === 0) {
            showError('Keine Ergebnisse gefunden. Bitte aendern Sie die Suchkriterien.');
            if (csResultInfo) csResultInfo.classList.remove('active');
            return;
        }

        // Use totalHits if available, otherwise estimate
        const totalDisplay = countResult.totalHits
            ? countResult.totalHits.toLocaleString('de-DE')
            : (countResult.hasMore ? `${countResult.count}+` : countResult.count);

        // Warn if very large result set
        if (countResult.totalHits && countResult.totalHits > 5000) {
            showError(`Zu viele Ergebnisse (${totalDisplay} Briefe). Bitte schraenken Sie die Suche ein (z.B. mit Zeitraum).`);
            if (csResultInfo) csResultInfo.classList.remove('active');
            return;
        }

        if (countResult.totalHits && countResult.totalHits > 500) {
            if (csResultInfo) {
                csResultInfo.textContent = `${totalDisplay} Briefe gefunden. Lade alle Seiten...`;
            }
        }

        showLoading(`Lade ${totalDisplay} Briefe von correspSearch...`);

        const data = await searchCorrespSearch(params, (loaded, total) => {
            updateLoadingText(`Lade Briefe... ${loaded}${total && total > loaded ? '+' : ''}`);
        });

        await showConfigDialog(data, {
            type: 'correspsearch',
            source: 'correspSearch API',
            params
        });

    } catch (error) {
        showError(`Fehler bei der Suche: ${error.message}`);
        hideLoading();
        if (csResultInfo) csResultInfo.classList.remove('active');
    }
}

// Dataset card handler
async function handleDatasetSelect(card) {
    const dataset = card.dataset.dataset;
    const info = card.dataset.info;
    const url = card.dataset.url;

    hideError();

    if (dataset === 'hsa') {
        // HSA uses preprocessed local data - redirect directly (already enriched)
        window.location.href = 'explore.html?dataset=hsa';
    } else if (url) {
        // External CMIF URL - load and show config
        showLoading('Lade CMIF von URL...');
        try {
            const data = await parseCMIF(url);
            await showConfigDialog(data, { type: 'url', source: url });
        } catch (error) {
            showError(`Fehler beim Laden: ${error.message}`);
            hideLoading();
        }
    } else if (info === 'cmif') {
        // Trigger file input click
        fileInput.click();
    } else if (info === 'correspsearch') {
        // Scroll to correspSearch form or show it
        const csSection = document.getElementById('correspsearch-section');
        if (csSection) {
            csSection.scrollIntoView({ behavior: 'smooth' });
            // Focus the first input
            const firstInput = csSection.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 300);
            }
        } else {
            // Fallback: use URL input with example
            urlInput.value = 'https://correspsearch.net/api/v2.0/?correspondent=http://d-nb.info/gnd/118540238&format=json';
            urlInput.focus();
            urlInput.select();
        }
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
        }
    } catch {
        console.log('Koordinaten-Cache nicht verfuegbar');
    }

    // Count entities
    const letterCount = data.letters?.length || 0;
    const personCount = countUniquePersons(data.letters || []);
    const placeCount = countUniquePlaces(data.letters || []);
    const enrichableCount = countEnrichablePersons(data.letters || []);

    // Update modal content
    document.getElementById('config-letters-count').textContent = letterCount.toLocaleString('de-DE');
    document.getElementById('config-persons-count').textContent = personCount.toLocaleString('de-DE');
    document.getElementById('config-places-count').textContent = placeCount.toLocaleString('de-DE');
    document.getElementById('enrich-persons-info').textContent = `${enrichableCount} Personen mit Authority-ID`;

    // Show warning for large datasets
    const warningEl = document.getElementById('config-warning');
    const warningTextEl = document.getElementById('config-warning-text');
    if (enrichableCount > 50) {
        warningEl.style.display = 'block';
        const estimatedTime = Math.ceil(enrichableCount * 0.15); // ~150ms per request
        warningTextEl.textContent = `Die Anreicherung von ${enrichableCount} Personen kann ca. ${estimatedTime} Sekunden dauern.`;
    } else if (enrichableCount === 0) {
        warningEl.style.display = 'block';
        warningTextEl.textContent = 'Keine Personen mit GND- oder VIAF-ID gefunden. Anreicherung nicht moeglich.';
        document.getElementById('enrich-persons').checked = false;
        document.getElementById('enrich-persons').disabled = true;
    } else {
        warningEl.style.display = 'none';
        document.getElementById('enrich-persons').disabled = false;
    }

    // Reset progress
    document.getElementById('config-progress').style.display = 'none';
    document.getElementById('config-progress-fill').style.width = '0%';

    // Show buttons
    document.querySelector('.config-actions').style.display = 'flex';

    // Show modal
    configModal.style.display = 'flex';
}

function hideConfigModal() {
    configModal.style.display = 'none';
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

    const shouldEnrich = document.getElementById('enrich-persons')?.checked;

    if (!shouldEnrich) {
        finalizeAndRedirect(pendingData, pendingSourceInfo);
        return;
    }

    // Hide buttons, show progress
    document.querySelector('.config-actions').style.display = 'none';
    document.getElementById('config-progress').style.display = 'block';

    // Extract unique persons with authority IDs
    const persons = extractEnrichablePersons(pendingData.letters || []);

    if (persons.length === 0) {
        finalizeAndRedirect(pendingData, pendingSourceInfo);
        return;
    }

    // Enrich with progress updates
    const progressFill = document.getElementById('config-progress-fill');
    const progressText = document.getElementById('config-progress-text');

    try {
        const enrichedMap = await enrichPersonsBatch(persons, (current, total, person) => {
            const percent = Math.round((current / total) * 100);
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `Lade ${current}/${total}: ${person.name}`;
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
        console.warn('Enrichment failed:', error);
        progressText.textContent = 'Anreicherung fehlgeschlagen, fahre fort...';
    }

    // Short delay to show completion
    await new Promise(resolve => setTimeout(resolve, 500));

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

    // Redirect to visualization
    window.location.href = 'explore.html';
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
