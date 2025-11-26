// Upload Component - Handles CMIF file upload and URL loading
// Parses CMIF-XML and stores data for visualization
// Also handles correspSearch API queries

import { parseCMIF, enrichWithCoordinates } from './cmif-parser.js';
import { isCorrespSearchUrl, searchCorrespSearch, getResultCount } from './correspsearch-api.js';

// DOM Elements
let uploadZone, fileInput, urlInput, urlSubmit;
let errorMessage, loadingState, loadingText;
let datasetCards;
let csSearchForm, csSearchBtn, csResultInfo;

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
            await processData(data, { type: 'correspsearch', source: url });
        } catch (error) {
            showError(`Fehler beim Laden: ${error.message}`);
            hideLoading();
        }
        return;
    }

    showLoading('Lade CMIF von URL...');

    try {
        const data = await parseCMIF(url);
        await processData(data, { type: 'url', source: url });
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

        await processData(data, {
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
        // HSA uses preprocessed local data - redirect directly
        window.location.href = 'explore.html?dataset=hsa';
    } else if (url) {
        // External CMIF URL - load directly
        showLoading('Lade CMIF von URL...');
        try {
            const data = await parseCMIF(url);
            await processData(data, { type: 'url', source: url });
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
        await processData(data, { type: 'file', source: file.name });
    } catch (error) {
        showError(`Fehler beim Parsen: ${error.message}`);
        hideLoading();
    }
}

// Process parsed CMIF data
async function processData(data, sourceInfo) {
    updateLoadingText('Pruefe Koordinaten...');

    // Try to enrich with cached coordinates
    try {
        const coordsResponse = await fetch('data/geonames_coordinates.json');
        if (coordsResponse.ok) {
            const coordsCache = await coordsResponse.json();
            enrichWithCoordinates(data, coordsCache);
        }
    } catch {
        // Coordinates cache not available, continue without
        console.log('Koordinaten-Cache nicht verfuegbar');
    }

    // Store data in sessionStorage for use by visualization
    const storedData = {
        ...data,
        sourceInfo,
        loadedAt: new Date().toISOString()
    };

    try {
        sessionStorage.setItem('cmif-data', JSON.stringify(storedData));
    } catch (e) {
        // Storage quota exceeded - dataset too large
        showError(`Datensatz zu gross fuer Browser-Speicher (${data.letters?.length || 0} Briefe). Bitte verwenden Sie einen kleineren Datensatz oder das vorprozessierte HSA.`);
        hideLoading();
        return;
    }

    updateLoadingText('Weiterleitung zur Visualisierung...');

    // Redirect to visualization
    setTimeout(() => {
        window.location.href = 'explore.html';
    }, 500);
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
