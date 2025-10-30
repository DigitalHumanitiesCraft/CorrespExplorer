// HerData - Promptotyping Vault
// Wiki-style knowledge documentation viewer
import { loadNavbar } from './navbar-loader.js';

// Knowledge documents
const DOCS = [
    { id: 'data', title: 'Datenmodell', file: '../knowledge/data.md', category: 'Data' },
    { id: 'technical-architecture', title: 'Technische Architektur', file: '../knowledge/technical-architecture.md', category: 'Architecture' },
    { id: 'decisions', title: 'Architektur-Entscheidungen', file: '../knowledge/decisions.md', category: 'Architecture' },
    { id: 'design', title: 'Design System', file: '../knowledge/design.md', category: 'Design' },
    { id: 'network-relations', title: 'Netzwerk-Relationen', file: '../knowledge/network-relations.md', category: 'Features' },
    { id: 'project', title: 'Projektziele', file: '../knowledge/project.md', category: 'Project' },
    { id: 'requirements', title: 'Anforderungen', file: '../knowledge/requirements.md', category: 'Project' },
    { id: 'research-context', title: 'Forschungskontext', file: '../knowledge/research-context.md', category: 'Research' }
];

let currentDoc = null;

// Initialize
async function init() {
    await loadNavbar();
    renderSidebar();

    // Setup download button
    const downloadBtn = document.getElementById('vault-download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            window.location.href = 'download.html#vault-zip';
        });
    }

    // Check URL for doc parameter
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('doc');

    if (docId) {
        loadDocument(docId);
    }
}

// Render sidebar navigation
function renderSidebar() {
    const nav = document.getElementById('vault-nav');

    // Group by category
    const byCategory = {};
    DOCS.forEach(doc => {
        if (!byCategory[doc.category]) {
            byCategory[doc.category] = [];
        }
        byCategory[doc.category].push(doc);
    });

    let html = '';
    for (const [category, docs] of Object.entries(byCategory)) {
        html += `<div class="vault-nav-category">`;
        html += `<h3 class="vault-nav-category-title">${category}</h3>`;
        html += `<ul class="vault-nav-list">`;

        docs.forEach(doc => {
            html += `<li><a href="#" class="vault-nav-link" data-doc-id="${doc.id}">${doc.title}</a></li>`;
        });

        html += `</ul></div>`;
    }

    nav.innerHTML = html;

    // Add click handlers
    nav.querySelectorAll('.vault-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const docId = e.currentTarget.getAttribute('data-doc-id');
            loadDocument(docId);
        });
    });
}

// Load and render document
async function loadDocument(docId) {
    const doc = DOCS.find(d => d.id === docId);
    if (!doc) {
        console.error('Document not found:', docId);
        return;
    }

    currentDoc = doc;

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('doc', docId);
    window.history.pushState({}, '', url);

    // Update active state in sidebar
    document.querySelectorAll('.vault-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-doc-id="${docId}"]`)?.classList.add('active');

    // Update header
    document.getElementById('doc-title').textContent = doc.title;
    document.getElementById('doc-meta').textContent = doc.category;

    // Load markdown
    try {
        const response = await fetch(doc.file);
        if (!response.ok) throw new Error('Failed to load document');

        const markdown = await response.text();
        const html = marked.parse(markdown);

        document.getElementById('vault-article').innerHTML = html;

        // Scroll to top
        window.scrollTo(0, 0);

    } catch (error) {
        console.error('Error loading document:', error);
        document.getElementById('vault-article').innerHTML = `
            <div class="error-message">
                <h2>Fehler beim Laden</h2>
                <p>Das Dokument konnte nicht geladen werden.</p>
            </div>
        `;
    }
}

// Start
init();
