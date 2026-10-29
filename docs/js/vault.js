/**
 * Promptotyping Vault - Document Viewer
 * Loads and renders markdown documentation files
 */

// Document definitions with metadata
const VAULT_DOCUMENTS = [
    {
        id: 'index',
        filename: 'INDEX.md',
        title: 'Index',
        description: 'Einstieg, Dokumentlandkarte und Begriffe',
        icon: 'fa-compass',
        category: 'overview'
    },
    {
        id: 'project',
        filename: 'project.md',
        title: 'Project',
        description: 'Projekt, Datengrundlage, Standards und Abgrenzungen',
        icon: 'fa-circle-info',
        category: 'overview'
    },
    {
        id: 'data',
        filename: 'data.md',
        title: 'Daten',
        description: 'CMIF-Modell, Datensaetze und externe Quellen',
        icon: 'fa-database',
        category: 'data'
    },
    {
        id: 'specification',
        filename: 'specification.md',
        title: 'Specification',
        description: 'Anforderungen, User Stories und Entscheidungen',
        icon: 'fa-list-check',
        category: 'requirements'
    },
    {
        id: 'uncertainty-specification',
        filename: 'uncertainty-specification.md',
        title: 'Uncertainty Specification',
        description: 'Umgang mit Datenqualitaet und Unsicherheit',
        icon: 'fa-question-circle',
        category: 'requirements'
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
        id: 'design',
        filename: 'design.md',
        title: 'Design',
        description: 'Visuelle Gestaltung und UI-Komponenten',
        icon: 'fa-palette',
        category: 'technical'
    },
    {
        id: 'testing',
        filename: 'testing.md',
        title: 'Testing',
        description: 'Teststrategie und Testdaten',
        icon: 'fa-vial',
        category: 'technical'
    },
    {
        id: 'plan',
        filename: 'plan.md',
        title: 'Plan',
        description: 'Offene Befunde und geplante Arbeit',
        icon: 'fa-tasks',
        category: 'process'
    },
    {
        id: 'handoff',
        filename: 'handoff.md',
        title: 'Handoff',
        description: 'Offene Uebergabepunkte',
        icon: 'fa-inbox',
        category: 'process'
    },
    {
        id: 'journal',
        filename: 'journal.md',
        title: 'Journal',
        description: 'Chronologische Dokumentation des Entwicklungsprozesses',
        icon: 'fa-book',
        category: 'process'
    }
];

// Hash IDs of the document set before October 2026 (commit 29dfc15) keep working
// because published links and the paper point to them.
const DOCUMENT_ALIASES = {
    'user-stories': 'specification',
    'learnings': 'specification',
    'cmif-sources': 'data',
    'demo-datasets': 'data',
    'uncertainty': 'uncertainty-specification',
    'cmif-data': 'data'
};

// Category definitions
const CATEGORIES = {
    overview: { title: 'Ueberblick', icon: 'fa-compass' },
    data: { title: 'Daten', icon: 'fa-database' },
    requirements: { title: 'Anforderungen', icon: 'fa-clipboard-list' },
    technical: { title: 'Technik', icon: 'fa-gear' },
    process: { title: 'Prozess', icon: 'fa-arrows-spin' }
};

// State
let currentDoc = null;
let docCache = new Map();

/**
 * Resolve a URL hash to a document, following aliases of retired document IDs.
 * An alias hit rewrites the hash to the canonical ID without a history entry.
 */
function findDocument(hash) {
    const id = DOCUMENT_ALIASES[hash] || hash;
    const doc = VAULT_DOCUMENTS.find(d => d.id === id);
    if (doc && id !== hash) {
        history.replaceState(null, '', `#${id}`);
    }
    return doc;
}

/**
 * Remove a leading YAML frontmatter block, which marked would render as text.
 */
function stripFrontmatter(markdown) {
    return markdown.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

const REPOSITORY_BLOB = 'https://github.com/DigitalHumanitiesCraft/CorrespExplorer/blob/main/docs/knowledge/';

/**
 * GitHub-style heading slug, so anchors written for the repository also work here
 */
function slugify(text) {
    return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

function scrollToSection(section) {
    const target = section && document.getElementById(decodeURIComponent(section));
    if (target) target.scrollIntoView();
}

/**
 * Give headings ids and route the relative links of a rendered document: links to another
 * knowledge document open it in the vault (with its section), in-page anchors scroll,
 * other relative paths point to the file in the repository.
 */
function wireDocumentLinks(container) {
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        if (!h.id) h.id = slugify(h.textContent);
    });

    container.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return;

        if (href.startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                scrollToSection(href.slice(1));
            });
            return;
        }

        const [path, section] = href.split('#');
        const doc = VAULT_DOCUMENTS.find(d => d.filename === path.replace(/^\.\//, ''));
        if (doc) {
            link.setAttribute('href', `#${doc.id}`);
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                window.location.hash = doc.id;
                await loadDocument(doc);
                scrollToSection(section);
            });
        } else {
            link.setAttribute('href', new URL(href, REPOSITORY_BLOB).href);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
        }
    });
}

/**
 * Initialize the vault
 */
async function init() {
    renderDocumentList();

    // Load the document named in the URL hash, otherwise the first document
    const hash = window.location.hash.slice(1);
    const doc = (hash && findDocument(hash)) || VAULT_DOCUMENTS[0];
    await loadDocument(doc);

    // Handle hash changes
    window.addEventListener('hashchange', async () => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const doc = findDocument(hash);
            if (doc && doc !== currentDoc) {
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
            content = stripFrontmatter(await response.text());
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

        wireDocumentLinks(contentEl.querySelector('.markdown-body'));
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
