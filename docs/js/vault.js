/**
 * Promptotyping Vault - Document Viewer
 * Loads and renders markdown documentation files
 */

// Document definitions with metadata
const VAULT_DOCUMENTS = [
    {
        id: 'journal',
        filename: 'JOURNAL.md',
        title: 'Development Journal',
        description: 'Chronologische Dokumentation des Entwicklungsprozesses',
        icon: 'fa-book',
        category: 'process'
    },
    {
        id: 'architecture',
        filename: 'architecture.md',
        title: 'Architecture',
        description: 'Technische Systemarchitektur und Komponenten',
        icon: 'fa-sitemap',
        category: 'technical'
    },
    {
        id: 'user-stories',
        filename: 'user-stories.md',
        title: 'User Stories',
        description: 'Anforderungen und Akzeptanzkriterien',
        icon: 'fa-list-check',
        category: 'requirements'
    },
    {
        id: 'plan',
        filename: 'plan.md',
        title: 'Implementation Plan',
        description: 'Roadmap und Umsetzungsstatus',
        icon: 'fa-tasks',
        category: 'process'
    },
    {
        id: 'design',
        filename: 'design.md',
        title: 'Design System',
        description: 'Visuelle Gestaltung und UI-Komponenten',
        icon: 'fa-palette',
        category: 'technical'
    },
    {
        id: 'learnings',
        filename: 'learnings.md',
        title: 'Learnings',
        description: 'Design-Entscheidungen und Patterns',
        icon: 'fa-lightbulb',
        category: 'process'
    },
    {
        id: 'cmif-data',
        filename: 'CMIF-Data.md',
        title: 'CMIF Data Format',
        description: 'Datenformat und Struktur',
        icon: 'fa-code',
        category: 'technical'
    },
    {
        id: 'cmif-sources',
        filename: 'cmif-sources.md',
        title: 'CMIF Sources',
        description: 'Verfuegbare CMIF-Repositorien und Quellen',
        icon: 'fa-database',
        category: 'data'
    },
    {
        id: 'demo-datasets',
        filename: 'demo-datasets.md',
        title: 'Demo Datasets',
        description: 'Analyse der Beispiel-Datensaetze',
        icon: 'fa-table',
        category: 'data'
    },
    {
        id: 'uncertainty',
        filename: 'uncertainty-concept.md',
        title: 'Uncertainty Concept',
        description: 'Umgang mit Datenqualitaet und Unsicherheit',
        icon: 'fa-question-circle',
        category: 'technical'
    },
    {
        id: 'project-analysis',
        filename: 'project-analysis.md',
        title: 'Project Analysis',
        description: 'Detaillierte Projektanalyse',
        icon: 'fa-magnifying-glass-chart',
        category: 'process'
    }
];

// Category definitions
const CATEGORIES = {
    process: { title: 'Prozess', icon: 'fa-arrows-spin' },
    technical: { title: 'Technik', icon: 'fa-gear' },
    requirements: { title: 'Anforderungen', icon: 'fa-clipboard-list' },
    data: { title: 'Daten', icon: 'fa-database' }
};

// State
let currentDoc = null;
let docCache = new Map();

/**
 * Initialize the vault
 */
async function init() {
    renderDocumentList();

    // Check URL hash for direct document link, otherwise load first doc
    const hash = window.location.hash.slice(1);
    if (hash) {
        const doc = VAULT_DOCUMENTS.find(d => d.id === hash);
        if (doc) {
            await loadDocument(doc);
        } else {
            // Invalid hash, load first document
            await loadDocument(VAULT_DOCUMENTS[0]);
        }
    } else {
        // No hash, load first document by default
        await loadDocument(VAULT_DOCUMENTS[0]);
    }

    // Handle hash changes
    window.addEventListener('hashchange', async () => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const doc = VAULT_DOCUMENTS.find(d => d.id === hash);
            if (doc) {
                await loadDocument(doc);
            }
        }
    });
}

/**
 * Render the document list in the sidebar
 */
function renderDocumentList() {
    const docList = document.getElementById('doc-list');
    if (!docList) return;

    // Group documents by category
    const byCategory = {};
    for (const doc of VAULT_DOCUMENTS) {
        const cat = doc.category || 'other';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(doc);
    }

    // Render by category
    let html = '';
    let isFirst = true;

    for (const [catId, docs] of Object.entries(byCategory)) {
        const category = CATEGORIES[catId] || { title: catId, icon: 'fa-folder' };

        html += `
            <div class="doc-category${isFirst ? ' first' : ''}">
                <div class="doc-category-title">
                    <i class="fas ${category.icon}"></i> ${category.title}
                </div>
                ${docs.map(doc => `
                    <a href="#${doc.id}" class="doc-item" data-doc-id="${doc.id}" title="${doc.description}">
                        <i class="fas ${doc.icon}"></i>
                        <span>${doc.title}</span>
                    </a>
                `).join('')}
            </div>
        `;
        isFirst = false;
    }

    docList.innerHTML = html;

    // Add click handlers
    docList.querySelectorAll('.doc-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const docId = item.dataset.docId;
            const doc = VAULT_DOCUMENTS.find(d => d.id === docId);
            if (doc) {
                window.location.hash = doc.id;
                await loadDocument(doc);
            }
        });
    });
}

/**
 * Load and render a document
 */
async function loadDocument(doc) {
    const contentEl = document.getElementById('vault-content');
    if (!contentEl) return;

    // Update active state in sidebar
    document.querySelectorAll('.doc-item').forEach(item => {
        item.classList.toggle('active', item.dataset.docId === doc.id);
    });

    // Show loading state
    contentEl.innerHTML = `
        <div class="loading-indicator">
            <i class="fas fa-spinner"></i> Lade Dokument...
        </div>
    `;

    try {
        // Check cache first
        let content;
        if (docCache.has(doc.id)) {
            content = docCache.get(doc.id);
        } else {
            // Fetch the markdown file
            const response = await fetch(`knowledge/${doc.filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            content = await response.text();
            docCache.set(doc.id, content);
        }

        // Count lines for stats
        const lineCount = content.split('\n').length;

        // Parse markdown to HTML
        const htmlContent = marked.parse(content);

        // Render document
        contentEl.innerHTML = `
            <div class="doc-header">
                <h1><i class="fas ${doc.icon}"></i> ${doc.title}</h1>
                <div class="doc-meta">
                    <span class="doc-meta-item">
                        <i class="fas fa-file"></i> ${doc.filename}
                    </span>
                    <span class="doc-meta-item">
                        <i class="fas fa-align-left"></i> ${lineCount} Zeilen
                    </span>
                    <span class="doc-meta-item">
                        <i class="fas fa-folder"></i> ${CATEGORIES[doc.category]?.title || doc.category}
                    </span>
                </div>
            </div>
            <div class="markdown-body">
                ${htmlContent}
            </div>
        `;

        currentDoc = doc;

        // Scroll to top
        contentEl.scrollTop = 0;

    } catch (error) {
        console.error('Error loading document:', error);
        contentEl.innerHTML = `
            <div class="content-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Fehler beim Laden des Dokuments: ${error.message}</p>
            </div>
        `;
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
