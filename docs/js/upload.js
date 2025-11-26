// Upload Component - Handles CMIF file upload and URL loading
// Parses CMIF-XML and stores data for visualization

import { parseCMIF, enrichWithCoordinates } from './cmif-parser.js';

// DOM Elements
let uploadZone, fileInput, urlInput, urlSubmit;
let errorMessage, loadingState, loadingText;
let datasetCards;

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
    showLoading('Lade CMIF von URL...');

    try {
        const data = await parseCMIF(url);
        await processData(data, { type: 'url', source: url });
    } catch (error) {
        showError(`Fehler beim Laden: ${error.message}`);
        hideLoading();
    }
}

// Dataset card handler
async function handleDatasetSelect(card) {
    const dataset = card.dataset.dataset;
    const info = card.dataset.info;

    hideError();

    if (dataset === 'hsa') {
        // HSA uses preprocessed local data - redirect directly
        window.location.href = 'explore.html?dataset=hsa';
    } else if (info === 'cmif') {
        // Trigger file input click
        fileInput.click();
    } else if (info === 'correspsearch') {
        // Focus URL input with example
        urlInput.value = 'https://correspsearch.net/api/v1.1/cmif-wgs.xql?correspondent=http://d-nb.info/gnd/118540238';
        urlInput.focus();
        urlInput.select();
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
    document.querySelector('.example-datasets').style.display = 'none';
    if (text) {
        loadingText.textContent = text;
    }
}

function hideLoading() {
    loadingState.classList.remove('active');
    uploadZone.style.display = 'block';
    document.querySelector('.url-input-section').style.display = 'block';
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
