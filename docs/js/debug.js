/**
 * Debug Panel Module
 * Displays data provenance information for review
 */

let provenanceMap = null;
let debugPanelActive = false;

/**
 * Load provenance mapping
 */
async function loadProvenanceMap() {
    try {
        const response = await fetch('data/data_provenance_map.json');
        if (!response.ok) throw new Error('Failed to load provenance map');
        provenanceMap = await response.json();
        return provenanceMap;
    } catch (error) {
        console.error('Error loading provenance map:', error);
        return null;
    }
}

/**
 * Initialize debug panel
 */
export async function initDebugPanel() {
    // Load provenance map
    await loadProvenanceMap();

    // Create debug button if it doesn't exist
    if (!document.getElementById('debug-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'debug-toggle';
        toggleBtn.className = 'debug-toggle';
        toggleBtn.innerHTML = '🔍 Debug';
        toggleBtn.addEventListener('click', toggleDebugPanel);
        document.body.appendChild(toggleBtn);
    }

    // Create debug panel if it doesn't exist
    if (!document.getElementById('debug-panel')) {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.className = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-panel-header">
                <h3>Datenherkunft</h3>
                <button class="debug-panel-close" aria-label="Schließen">×</button>
            </div>
            <div class="debug-panel-content">
                <div id="debug-fields" class="debug-tab-content active"></div>
            </div>
        `;
        document.body.appendChild(panel);

        // Attach event listeners
        panel.querySelector('.debug-panel-close').addEventListener('click', toggleDebugPanel);

        // Render content
        renderDebugFields();
    }

    // Check URL for debug parameter - if present, show panel immediately
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            showDebugPanel();
        }, 100);
    }
}

/**
 * Toggle debug panel visibility
 */
function toggleDebugPanel() {
    const panel = document.getElementById('debug-panel');
    debugPanelActive = !debugPanelActive;

    if (debugPanelActive) {
        panel.classList.add('active');
    } else {
        panel.classList.remove('active');
    }
}

/**
 * Show debug panel
 */
function showDebugPanel() {
    const panel = document.getElementById('debug-panel');
    panel.classList.add('active');
    debugPanelActive = true;
}


/**
 * Render field information
 */
function renderDebugFields() {
    if (!provenanceMap) return;

    const container = document.getElementById('debug-fields');
    const fields = provenanceMap.field_mappings;

    let html = '<div class="provenance-list">';

    Object.entries(fields).forEach(([fieldName, info]) => {
        // Handle nested fields (like dates.birth)
        if (typeof info === 'object' && !info.source_files && !info.description) {
            // Nested field
            Object.entries(info).forEach(([subField, subInfo]) => {
                if (subField === '_provenance') return; // Skip provenance meta
                html += renderFieldInfo(`${fieldName}.${subField}`, subInfo);
            });
        } else {
            html += renderFieldInfo(fieldName, info);
        }
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Render single field info
 */
function renderFieldInfo(fieldName, info) {
    return `
        <div class="field-info" data-field="${fieldName.toLowerCase()}">
            <div class="field-info-header">
                <span class="field-name">${fieldName}</span>
                ${info.phase ? `<span class="field-phase">Phase ${info.phase}</span>` : ''}
            </div>
            ${info.description ? `<div class="field-description">${info.description}</div>` : ''}
            <div class="field-source">
                <strong>Quelle:</strong> ${Array.isArray(info.source_files) ? info.source_files.join(', ') : info.source_files || 'N/A'}
                ${info.xpath ? `<br><strong>XPath:</strong> ${info.xpath}` : ''}
                ${info.transformation ? `<br><strong>Transform:</strong> ${info.transformation}` : ''}
            </div>
            ${info.example ? `<div class="field-example">Beispiel: ${info.example}</div>` : ''}
            ${info.coverage ? `<div class="field-coverage">Abdeckung: ${info.coverage}</div>` : ''}
            ${info.note ? `<div class="field-note" style="font-size: 12px; color: #6c757d; margin-top: 4px;">${info.note}</div>` : ''}
        </div>
    `;
}



/**
 * Get provenance for specific field
 */
export function getFieldProvenance(fieldName) {
    if (!provenanceMap) return null;

    // Handle nested fields
    const parts = fieldName.split('.');
    let info = provenanceMap.field_mappings;

    for (const part of parts) {
        if (info[part]) {
            info = info[part];
        } else {
            return null;
        }
    }

    return info;
}

/**
 * Wrap field with hover provenance tooltip
 */
export function wrapFieldWithProvenance(fieldName, value) {
    const prov = getFieldProvenance(fieldName);
    if (!prov || !prov.source_files) return value;

    const sourceFiles = Array.isArray(prov.source_files) ? prov.source_files.join(', ') : prov.source_files;
    const tooltipContent = `
        <strong>${fieldName}</strong>
        Quelle: <code>${sourceFiles}</code><br>
        ${prov.xpath ? `XPath: <code>${prov.xpath.substring(0, 80)}${prov.xpath.length > 80 ? '...' : ''}</code><br>` : ''}
        ${prov.phase ? `Phase: ${prov.phase}` : ''}
    `;

    return `
        <span class="field-with-provenance">
            ${value}
            <span class="field-provenance-tooltip">${tooltipContent}</span>
        </span>
    `;
}

/**
 * Render raw data viewer for a person object
 */
export function renderRawDataViewer(person, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !person) return;

    const rawDataHtml = `
        <div class="raw-data-section">
            <div class="raw-data-header">
                <h3>Raw Data (JSON)</h3>
                <button class="raw-data-toggle" onclick="toggleRawData('${containerId}-content')">
                    Anzeigen/Verbergen
                </button>
            </div>
            <div id="${containerId}-content" class="raw-data-content">
                <pre class="raw-data-json">${syntaxHighlightJSON(person)}</pre>
                <div class="raw-data-actions">
                    <button class="raw-data-copy" onclick="copyRawData('${containerId}-content')">
                        In Zwischenablage kopieren
                    </button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = rawDataHtml;

    // Make toggle function global
    window.toggleRawData = function(contentId) {
        const content = document.getElementById(contentId);
        if (content) {
            content.classList.toggle('active');
        }
    };

    // Make copy function global
    window.copyRawData = function(contentId) {
        const content = document.getElementById(contentId);
        if (!content) return;

        const text = content.querySelector('.raw-data-json').textContent;
        navigator.clipboard.writeText(text).then(() => {
            const button = content.parentElement.querySelector('.raw-data-copy');
            const originalText = button.textContent;
            button.textContent = 'Kopiert!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        });
    };
}

/**
 * Syntax highlight JSON
 */
function syntaxHighlightJSON(obj) {
    let json = JSON.stringify(obj, null, 2);

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Auto-initialize if debug=true in URL
if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        document.addEventListener('DOMContentLoaded', initDebugPanel);
    }
}
