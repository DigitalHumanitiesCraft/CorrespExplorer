// Upload Component - Handles CMIF file upload and URL loading
// Parses CMIF-XML and stores data for visualization

import { parseCMIF, parseCMIFFiles, addTableCoordinates } from './cmif-parser.js';
import { isCorrespSearchUrl } from './correspsearch-api.js';
import { summarizeCorpus } from './research-paths.js';
import { enrichPersonsBatch } from './wikidata-enrichment.js';
import { resolveGeoNamesCoordinates, applyCoordinatesToData, analyzeCoordinateNeeds } from './geonames-enrichment.js';
import { openModal, closeModal, enableModalKeyboard, isAllowedJsonPath } from './utils.js';
import { VIEWS, LETTER_FEATURES } from './constants.js';
import { initStartFigure, fetchListedFiles, showOwnDataset } from './start-figures.js';

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

// verification/serve_local_corpus.py mounts a corpus under data/local and binds to the loopback
// interface only, so the file list can exist only on a loopback host
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

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
    showLocalDataset();
    initStartFigure({ openOwn: (view, feat) => openOwnData(view, feat) });
    document.getElementById('own-open')?.addEventListener('click', () => openOwnData());

    // Config modal
    configModal = document.getElementById('config-modal');

    setupEventListeners();
    enableModalKeyboard();

    const startParams = new URLSearchParams(window.location.search);
    if (startParams.get('files')) {
        // The figure links a view of a local edition through here, so view and feat pass on
        loadFileList(startParams.get('files'), { view: startParams.get('view'), feat: startParams.get('feat') });
    } else if (startParams.get('notice') === 'dataset-missing') {
        // explore.html sends links here whose dataset lay only in the sender's tab
        showError('Der Link gehört zu einem Datensatz, der nur im Browser der teilenden Person geladen war (eigene Datei oder correspSearch-Abfrage). Laden Sie den Datensatz hier erneut.');
    }
}

function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // The drop zone is the <label> of the file input, so a click opens the picker without a handler

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
        // A native button activates on Enter and Space by itself; a role="button" element needs it
        if (card.tagName !== 'BUTTON') {
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDatasetSelect(card);
                }
            });
        }
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
        processFiles([...files]);
    }
}

// File select handler
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        lastTrigger = fileInput;
        processFiles([...files]);
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
        showError('Bitte geben Sie eine gültige URL ein.');
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
            await presentDataset(data, { type: 'correspsearch', source: url });
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
        await presentDataset(data, { type: 'url', source: url });
    } catch (error) {
        console.error('CMIF URL load failed:', error);
        showError(`Fehler beim Laden: ${error.message}`);
        hideLoading();
    }
}

// A corpus mounted under data/local appears as a choice of the figure where its file list
// exists. The published site carries no such list and is never served from a loopback host, so
// it does not ask for the list and the choice stays hidden there.
async function showLocalDataset() {
    const card = document.getElementById('local-dataset');
    const choice = document.getElementById('local-dataset-choice');
    if (!card || !choice || !LOOPBACK_HOSTS.has(window.location.hostname)) return;
    try {
        const response = await fetch(card.dataset.files);
        if (!response.ok) return;
        const files = (await response.json())?.files;
        if (!Array.isArray(files) || files.length === 0) return;
        choice.classList.remove('hidden');
    } catch {
        // No local corpus: the choice stays hidden
    }
}

// Dataset card handler: a card names either a file list (data-files) or pre-processed JSON (data-json)
async function handleDatasetSelect(card) {
    lastTrigger = card;
    hideError();
    // An edition published as many files, named by a file list
    if (card.dataset.files) return loadFileList(card.dataset.files);
    const jsonUrl = card.dataset.json;
    if (jsonUrl) {
        // Pre-processed JSON goes to explore.html by path, which bypasses the sessionStorage size limit
        const params = new URLSearchParams();
        params.set('json', jsonUrl);
        params.set('view', 'overview');
        window.location.href = `explore.html?${params.toString()}`;
    }
}

/**
 * Load an edition published as many files from a file list: a JSON document under data/ with
 * {"files": ["a.xml", ...]}, names relative to the list. The path obeys the same rule as ?json=,
 * and a file name may not leave the folder of the list.
 */
async function loadFileList(listPath, { view = null, feat = null } = {}) {
    if (!isAllowedJsonPath(listPath)) {
        showError('Die Dateiliste muss ein relativer Pfad unter data/ mit der Endung .json sein.');
        return;
    }
    showLoading('Lade Dateiliste...');
    try {
        const { texts, names } = await fetchListedFiles(listPath, (done, total) => updateLoadingText(`Lade Dateien... ${done} von ${total}`));
        const data = await parseCMIFFiles(texts, null, names);
        await showConfigDialog(data, { type: 'file', source: `${data.meta.title} (${data.meta.files.loaded} Dateien)`, view, feat });
    } catch (error) {
        console.error('File list load failed:', error);
        showError(`Fehler beim Laden der Dateiliste: ${error.message}`);
        hideLoading();
    }
}

// One file loads as before; several files of one edition load as one dataset
async function processFiles(files) {
    if (files.length === 1) return processFile(files[0]);

    const xmlFiles = files.filter(file => file.name.endsWith('.xml') || file.type.includes('xml'));
    if (xmlFiles.length === 0) {
        showError('Bitte wählen Sie XML-Dateien aus.');
        return;
    }

    hideError();
    showLoading(`Verarbeite ${xmlFiles.length} Dateien...`);
    try {
        const data = await parseCMIFFiles(xmlFiles, (done, total) => {
            if (done % 10 === 0 || done === total) updateLoadingText(`Verarbeite Dateien... ${done} von ${total}`);
        });
        await presentDataset(data, { type: 'file', source: `${data.meta.title} (${data.meta.files.loaded} Dateien)` });
    } catch (error) {
        console.error('CMIF files parse failed:', error);
        showError(`Fehler beim Parsen: ${error.message}`);
        hideLoading();
    }
}

// Process uploaded file
async function processFile(file) {
    // Validate file type
    if (!file.name.endsWith('.xml') && !file.type.includes('xml')) {
        showError('Bitte wählen Sie eine XML-Datei aus.');
        return;
    }

    hideError();
    showLoading(`Verarbeite ${file.name}...`);

    try {
        const data = await parseCMIF(file);
        await presentDataset(data, { type: 'file', source: file.name });
    } catch (error) {
        console.error('CMIF file parse failed:', error);
        showError(`Fehler beim Parsen: ${error.message}`);
        hideLoading();
    }
}

// One's own data, once read: the figure takes them as a further choice and shows which parts of
// the model they fill; the dialog that leads into the explorer opens at once as before, and
// "Im Explorer öffnen" brings it back after it was closed
let ownData = null;

async function presentDataset(data, sourceInfo) {
    ownData = { data, sourceInfo };
    try {
        // Coordinates from the table first, as the dialog adds them, so the maps can draw the places
        await addTableCoordinates(data);
        showOwnDataset(data, ownName(data, sourceInfo));
    } catch (error) {
        // The figure is an addition; the way into the explorer must not depend on it
        console.error('Start figure could not show the loaded data:', error);
    }
    await showConfigDialog(data, sourceInfo);
}

// The name of one's own holding in the choice: the title of the file, else its name or address
function ownName(data, sourceInfo) {
    const name = (data.meta?.title || sourceInfo?.source || 'Eigene Daten').trim();
    return name.length > 40 ? `${name.slice(0, 39)}…` : name;
}

function openOwnData(view = null, feat = null) {
    if (!ownData) return;
    lastTrigger = document.activeElement;
    showConfigDialog(ownData.data, { ...ownData.sourceInfo, view, feat });
}

// Show configuration dialog
async function showConfigDialog(data, sourceInfo) {
    hideLoading();

    // Store pending data
    pendingData = data;
    pendingSourceInfo = sourceInfo;

    await addTableCoordinates(data);

    const coordStats = analyzeCoordinateNeeds(data);

    // Count entities
    const letterCount = data.letters?.length || 0;
    // Counted like the explorer's overview, so the dialog and the explorer show the same figures
    const corpus = summarizeCorpus(data.letters || [], data.indices);
    const personCount = corpus.persons.size;
    const placeCount = corpus.places.size;
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
    document.getElementById('enrich-persons-info').textContent = `${enrichableCount} Personen mit Normdatensatz (GND oder VIAF)`;

    // Show warning for large datasets
    const warningEl = document.getElementById('config-warning');
    const warningTextEl = document.getElementById('config-warning-text');

    const totalTime = Math.ceil(coordStats.needsResolution * 0.2 + enrichableCount * 0.15);

    if (enrichableCount > 50 || coordStats.needsResolution > 50) {
        warningTextEl.textContent = `Die Anreicherung kann ca. ${totalTime} Sekunden dauern.`;
        warningEl.classList.remove('hidden');
    } else if (enrichableCount === 0 && coordStats.needsResolution === 0) {
        warningTextEl.textContent = 'Keine Anreicherungsoptionen verfügbar.';
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
        showError(`Datensatz zu groß für Browser-Speicher (${data.letters?.length || 0} Briefe). Bitte verwenden Sie einen kleineren Datensatz oder das vorprozessierte HSA.`);
        hideConfigModal();
        return;
    }

    // The overview unless a link of the start figure asked for a view (and a feature filter); both
    // values are checked against the known lists
    const params = new URLSearchParams();
    params.set('view', VIEWS.includes(sourceInfo?.view) ? sourceInfo.view : 'overview');
    const features = (sourceInfo?.feat || '').split(',').filter(key => LETTER_FEATURES.some(f => f.key === key));
    if (features.length) params.set('feat', features.join(','));
    window.location.href = `explore.html?${params.toString()}`;
}

// Persons with a GND or VIAF ID, the authorities the Wikidata lookup supports
function extractEnrichablePersons(letters) {
    const persons = new Map();
    letters.forEach(letter => {
        [letter.sender, ...(letter.recipients || [letter.recipient])].forEach(person => {
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

// UI helpers: the entries give way to the loading state, switched by the hidden class
function setInputSectionsHidden(hidden) {
    document.querySelectorAll('.figure-bar, .model').forEach(el => el.classList.toggle('hidden', hidden));
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
