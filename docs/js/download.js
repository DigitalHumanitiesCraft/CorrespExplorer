// HerData - Download Page
// Data export and vault ZIP generation
import { loadNavbar } from './navbar-loader.js';
import { loadPersons } from './data.js';
import { GlobalSearch } from './search.js';

// Initialize
async function init() {
    await loadNavbar();

    // Initialize global search
    try {
        const data = await loadPersons();
        new GlobalSearch(data.persons);
    } catch (error) {
        console.error('Failed to load persons for search:', error);
    }

    // Setup vault ZIP download
    const vaultZipButton = document.getElementById('download-vault-zip');
    if (vaultZipButton) {
        vaultZipButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await generateVaultZip();
        });
    }
}

// Generate Vault ZIP file
async function generateVaultZip() {
    const button = document.getElementById('download-vault-zip');
    button.textContent = 'Generating ZIP...';
    button.classList.add('download-button-loading');

    try {
        // Import JSZip from CDN
        const JSZip = window.JSZip || await loadJSZip();

        const zip = new JSZip();
        const knowledgeFolder = zip.folder('herdata-vault');

        // List of knowledge documents
        const docs = [
            'data.md',
            'technical-architecture.md',
            'decisions.md',
            'design.md',
            'network-relations.md',
            'project.md',
            'requirements.md',
            'research-context.md'
        ];

        // Add README
        knowledgeFolder.file('README.txt', `HerData Knowledge Vault
===========================

Exportiert: ${new Date().toISOString().split('T')[0]}

Diese Dokumentation dient als:
- Context Engineering für Claude
- Arbeitsgrundlage während der Entwicklung
- Dokumentation für Teammitglieder
- Single Source of Truth

Lizenz: CC BY 4.0
Projekt: https://chpollin.github.io/HerData/
`);

        // Fetch and add each markdown file
        for (const doc of docs) {
            try {
                const response = await fetch(`../knowledge/${doc}`);
                if (response.ok) {
                    const content = await response.text();
                    knowledgeFolder.file(doc, content);
                }
            } catch (error) {
                console.error(`Failed to load ${doc}:`, error);
            }
        }

        // Generate ZIP
        const blob = await zip.generateAsync({ type: 'blob' });

        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `herdata-vault-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        button.textContent = 'Download Vault ZIP';
        button.classList.remove('download-button-loading');

    } catch (error) {
        console.error('Error generating ZIP:', error);
        button.textContent = 'Error - Try again';
        button.classList.remove('download-button-loading');
    }
}

// Load JSZip from CDN
async function loadJSZip() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Start
init();
