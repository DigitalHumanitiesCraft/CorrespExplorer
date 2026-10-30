// Upload Component - Handles CMIF file upload and URL loading
// Parses CMIF-XML and stores data for visualization

import { parseCMIF, enrichWithCoordinates } from './cmif-parser.js';
import { isCorrespSearchUrl } from './correspsearch-api.js';
import { enrichPersonsBatch } from './wikidata-enrichment.js';
import { resolveGeoNamesCoordinates, applyCoordinatesToData, analyzeCoordinateNeeds } from './geonames-enrichment.js';
import { openModal, closeModal, enableModalKeyboard, personKey, placeKey } from './utils.js';

// DOM Elements
let uploadZone, fileInput, urlInput, urlSubmit;
let errorMessage, loadingState, loadingText;
let datasetCards;

// Config modal elements
let configModal;

// Pending data for configuration
let pendingData = null;
let pendingSourceInfo = null;

// Aborted when the dialog closes, so a running enrichment neither redirects nor touches cleared state
let enrichmentController = null;

// The element that started loading; it is hidden while loading, so focus returns to it explicitly
let lastTrigger = null;

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
    enableModalKeyboard();

    // about.html links here with ?demo=true, because the tutorial dataset has to pass the upload
    // dialog before explore.html can show it
    if (new URLSearchParams(window.location.search).get('demo') === 'true') {
        const demoCard = document.querySelector('.dataset-card[data-demo="true"]');
        if (demoCard) handleDatasetSelect(demoCard);
    }
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
        // Cards are role="button" divs (block content cannot go into <button>)
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDatasetSelect(card);
            }
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
        lastTrigger = fileInput;
        processFile(files[0]);
    }
}

// File select handler
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        lastTrigger = fileInput;
        processFile(files[0]);
    }
    // Without the reset, choosing the same file again fires no change event
    e.target.value = '';
}

// URL submit handler
async function handleUrlSubmit() {
    const url = urlInput.value.trim();
    lastTrigger = urlInput;

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
            const data = await parseCMIF(url, (loaded, totalHits) => {
                updateLoadingText(totalHits
                    ? `Lade Briefe... ${loaded} von ${totalHits}`
                    : `Lade Briefe... ${loaded}`);
            });
            await showConfigDialog(data, { type: 'correspsearch', source: url });
        } catch (error) {
            console.error('correspSearch load failed:', error);
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
        console.error('CMIF URL load failed:', error);
        showError(`Fehler beim Laden: ${error.message}`);
        hideLoading();
    }
}

// Dataset card handler
async function handleDatasetSelect(card) {
    const info = card.dataset.info;
    const url = card.dataset.url;
    const jsonUrl = card.dataset.json;
    const isDemo = card.dataset.demo === 'true';
    lastTrigger = card;

    hideError();

    if (jsonUrl) {
        // Pre-processed JSON goes to explore.html by path, which bypasses the sessionStorage size limit
        const params = new URLSearchParams();
        params.set('json', jsonUrl);
        params.set('view', 'overview');
        if (isDemo) params.set('demo', 'true');
        window.location.href = `explore.html?${params.toString()}`;
    } else if (url) {
        showLoading('Lade CMIF von URL...');
        try {
            const data = await parseCMIF(url);
            await showConfigDialog(data, { type: 'url', source: url, isDemo: isDemo });
        } catch (error) {
            console.error('Error loading CMIF:', error);
            showError(`Fehler beim Laden: ${error.message}`);
            hideLoading();
        }
    } else if (info === 'cmif') {
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
        console.error('CMIF file parse failed:', error);
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

    // Coordinates from the prebuilt Wikidata/GeoNames table (data.md, Rechte und Lizenzen)
    try {
        const coordsResponse = await fetch('data/geonames_coordinates.json');
        if (coordsResponse.ok) {
            const { coordinates } = await coordsResponse.json();
            enrichWithCoordinates(data, coordinates);
        }
    } catch (error) {
        console.warn('Coordinates cache not available:', error);
    }

    const coordStats = analyzeCoordinateNeeds(data);

    // Count entities
    const letterCount = data.letters?.length || 0;
    const personCount = countUniquePersons(data.letters || []);
    const placeCount = countUniquePlaces(data.letters || []);
    const enrichableCount = extractEnrichablePersons(data.letters || []).length;

    // Update modal content
    // A correspSearch query above the letter cap loads only its first pages
    document.getElementById('config-letters-count').textContent = data.meta?.truncated && data.meta.total_hits
        ? `${letterCount.toLocaleString('de-DE')} von ${data.meta.total_hits.toLocaleString('de-DE')}`
        : letterCount.toLocaleString('de-DE');
    document.getElementById('config-persons-count').textContent = personCount.toLocaleString('de-DE');
    document.getElementById('config-places-count').textContent = placeCount.toLocaleString('de-DE');

    // Coordinate enrichment option
    const coordOption = document.getElementById('config-option-coordinates');
    const coordInfo = document.getElementById('enrich-coordinates-info');
    const coordCheckbox = document.getElementById('enrich-coordinates');

    // The hidden class is the only visibility switch (display:none !important in base.css)
    coordOption.classList.toggle('hidden', coordStats.needsResolution === 0);
    if (coordStats.needsResolution > 0) {
        const cacheInfo = coordStats.withCoordinates > 0 ?
            ` (${coordStats.withCoordinates} bereits im Cache)` : '';
        coordInfo.textContent = `${coordStats.needsResolution} Orte mit GeoNames-ID${cacheInfo}`;
        coordCheckbox.disabled = false;
        coordCheckbox.checked = true;
    }

    // Person enrichment option
    document.getElementById('enrich-persons-info').textContent = `${enrichableCount} Personen mit Authority-ID`;

    // Show warning for large datasets
    const warningEl = document.getElementById('config-warning');
    const warningTextEl = document.getElementById('config-warning-text');

    const totalTime = Math.ceil(coordStats.needsResolution * 0.2 + enrichableCount * 0.15);

    if (enrichableCount > 50 || coordStats.needsResolution > 50) {
        warningTextEl.textContent = `Die Anreicherung kann ca. ${totalTime} Sekunden dauern.`;
        warningEl.classList.remove('hidden');
    } else if (enrichableCount === 0 && coordStats.needsResolution === 0) {
        warningTextEl.textContent = 'Keine Anreicherungsoptionen verfuegbar.';
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Disable person enrichment if no enrichable persons
    const personsCheckbox = document.getElementById('enrich-persons');
    if (enrichableCount === 0) {
        personsCheckbox.checked = false;
        personsCheckbox.disabled = true;
    } else {
        personsCheckbox.disabled = false;
    }

    resetConfigProgress();
    openModal(configModal);
}

// Back to the options view: progress hidden, action buttons shown
function resetConfigProgress() {
    document.getElementById('config-progress').classList.add('hidden');
    document.getElementById('config-progress-fill').style.width = '0%';
    document.querySelector('.config-actions').classList.remove('hidden');
}

// Closing also cancels a running enrichment; its results are discarded
function hideConfigModal() {
    enrichmentController?.abort();
    enrichmentController = null;

    closeModal(configModal);
    resetConfigProgress();

    pendingData = null;
    pendingSourceInfo = null;

    if (lastTrigger?.isConnected) lastTrigger.focus();
}

// Skip enrichment and go directly to visualization
function handleConfigSkip() {
    if (!pendingData) return;
    finalizeAndRedirect(pendingData, pendingSourceInfo);
}

// Start enrichment process
async function handleConfigStart() {
    if (!pendingData) return;

    // Local copies: hideConfigModal clears the pending state while the requests below await
    const data = pendingData;
    const sourceInfo = pendingSourceInfo;
    const controller = new AbortController();
    enrichmentController = controller;
    const { signal } = controller;

    const shouldEnrichCoords = document.getElementById('enrich-coordinates')?.checked;
    const shouldEnrichPersons = document.getElementById('enrich-persons')?.checked;

    if (!shouldEnrichCoords && !shouldEnrichPersons) {
        finalizeAndRedirect(data, sourceInfo);
        return;
    }

    // Hide buttons, show progress
    document.querySelector('.config-actions').classList.add('hidden');
    document.getElementById('config-progress').classList.remove('hidden');

    const progressFill = document.getElementById('config-progress-fill');
    const progressText = document.getElementById('config-progress-text');

    // Step 1: Enrich coordinates (if requested)
    if (shouldEnrichCoords) {
        const coordStats = analyzeCoordinateNeeds(data);

        if (coordStats.needsResolution > 0) {
            try {
                progressText.textContent = 'Lade Koordinaten von Wikidata...';

                const coordinates = await resolveGeoNamesCoordinates(
                    coordStats.geonamesIdsToResolve,
                    (loaded, total) => {
                        if (signal.aborted) return;
                        const percent = Math.round((loaded / total) * 50); // First 50% of progress
                        progressFill.style.width = `${percent}%`;
                        progressText.textContent = `Lade Koordinaten... ${loaded}/${total}`;
                    },
                    signal
                );
                if (signal.aborted) return;

                applyCoordinatesToData(data, coordinates);
                progressText.textContent = `${Object.keys(coordinates).length} Orte georeferenziert`;

            } catch (error) {
                if (signal.aborted) return;
                console.warn('Coordinate enrichment failed:', error);
                progressText.textContent = 'Koordinaten-Auflösung fehlgeschlagen, fahre fort...';
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            if (signal.aborted) return;
        }
    }

    // Step 2: Enrich persons (if requested)
    if (shouldEnrichPersons) {
        const persons = extractEnrichablePersons(data.letters || []);

        if (persons.length > 0) {
            try {
                const baseProgress = shouldEnrichCoords ? 50 : 0;

                const enrichedMap = await enrichPersonsBatch(persons, (current, total, person) => {
                    if (signal.aborted) return;
                    const percent = baseProgress + Math.round((current / total) * (100 - baseProgress));
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Lade Personen... ${current}/${total}: ${person.name}`;
                }, signal);
                if (signal.aborted) return;

                // Store enrichment data in session storage for use by explore.js
                if (enrichedMap.size > 0) {
                    const enrichmentData = {};
                    enrichedMap.forEach((entry, authorityId) => {
                        enrichmentData[authorityId] = entry;
                    });
                    sessionStorage.setItem('person-enrichment', JSON.stringify(enrichmentData));
                }

                progressText.textContent = `${enrichedMap.size} Personen angereichert`;

            } catch (error) {
                if (signal.aborted) return;
                console.warn('Person enrichment failed:', error);
                progressText.textContent = 'Personen-Anreicherung fehlgeschlagen, fahre fort...';
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            if (signal.aborted) return;
        }
    }

    finalizeAndRedirect(data, sourceInfo);
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
        console.error('Could not store dataset in sessionStorage:', e);
        showError(`Datensatz zu gross fuer Browser-Speicher (${data.letters?.length || 0} Briefe). Bitte verwenden Sie einen kleineren Datensatz oder das vorprozessierte HSA.`);
        hideConfigModal();
        return;
    }

    // Always start with the overview; the demo flag starts the tour in explore.js
    window.location.href = sourceInfo?.isDemo ? 'explore.html?demo=true&view=overview' : 'explore.html?view=overview';
}

// Persons by personKey (ADR-001), so name variants of one authority ID count once
function countUniquePersons(letters) {
    const persons = new Set();
    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            const key = personKey(person);
            if (key) persons.add(key);
        });
    });
    return persons.size;
}

// Places by placeKey (ADR-001)
function countUniquePlaces(letters) {
    const places = new Set();
    letters.forEach(letter => {
        const key = placeKey(letter.place_sent);
        if (key) places.add(key);
    });
    return places.size;
}

// Persons with a GND or VIAF ID, the authorities the Wikidata lookup supports
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

// UI helpers: the input sections give way to the loading state, switched by the hidden class
function setInputSectionsHidden(hidden) {
    [uploadZone, document.querySelector('.url-input-section'), document.querySelector('.example-datasets')]
        .forEach(el => el?.classList.toggle('hidden', hidden));
}

function showLoading(text) {
    loadingState.classList.add('active');
    setInputSectionsHidden(true);
    if (text) {
        loadingText.textContent = text;
    }
}

function hideLoading() {
    loadingState.classList.remove('active');
    setInputSectionsHidden(false);
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
