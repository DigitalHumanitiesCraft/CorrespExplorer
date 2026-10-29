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
// Section to scroll to once the document named by the next hash change has rendered
let pendingSection = null;
// Increments per load, so a slower earlier fetch cannot overwrite a later document
let loadSequence = 0;

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
const REPOSITORY_DOCS_PATH = '/DigitalHumanitiesCraft/CorrespExplorer/blob/main/docs/';

/**
 * GitHub-style heading slug, so anchors written for the repository also work here
 */
function slugify(text) {
    return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

function scrollToSection(section) {
    if (!section) return;
    let id = section;
    try {
        id = decodeURIComponent(section);
    } catch {
        // A malformed escape is looked up as written
    }
    document.getElementById(id)?.scrollIntoView();
}

/**
 * Show a document and optionally one of its sections. Only the hash change loads, so a click
 * renders the document once and the scroll is not undone by a second render.
 */
function openDocument(doc, section = null) {
    if (currentDoc === doc && window.location.hash.slice(1) === doc.id) {
        scrollToSection(section);
        return;
    }
    pendingSection = section;
    if (window.location.hash.slice(1) === doc.id) {
        showDocument(doc);
    } else {
        window.location.hash = doc.id;
    }
}

async function showDocument(doc) {
    const section = pendingSection;
    pendingSection = null;
    if (await loadDocument(doc)) scrollToSection(section);
}

/**
 * Pages and data files that GitHub Pages serves from docs/ open live; everything else, such as
 * code or Markdown outside the knowledge base, opens in the repository
 */
function resolveRelativeLink(href) {
    const target = new URL(href, REPOSITORY_BLOB);
    if (target.pathname.startsWith(REPOSITORY_DOCS_PATH)) {
        const sitePath = target.pathname.slice(REPOSITORY_DOCS_PATH.length);
        if (/\.html$/i.test(sitePath) || sitePath.startsWith('data/')) {
            return { href: sitePath + target.hash, external: false };
        }
    }
    return { href: target.href, external: true };
}

/**
 * Give headings ids and route the relative links of a rendered document: links to another
 * knowledge document open it in the vault (with its section), in-page anchors scroll,
 * other relative paths point to the file in the repository.
 */
function wireDocumentLinks(container) {
    // GitHub numbers repeated slugs (-1, -2), and links in the documents rely on that
    const used = new Map();
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        if (h.id) return;
        const base = slugify(h.textContent);
        const n = used.get(base) || 0;
        used.set(base, n + 1);
        h.id = n === 0 ? base : `${base}-${n}`;
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
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openDocument(doc, section);
            });
        } else {
            const resolved = resolveRelativeLink(href);
            link.setAttribute('href', resolved.href);
            if (resolved.external) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
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

    // The single place where navigation loads a document (sidebar, links, back and forward)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        const doc = hash && findDocument(hash);
        if (doc) showDocument(doc);
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
                    <i class="fas ${category.icon}" aria-hidden="true"></i> ${category.title}
                </div>
                ${docs.map(doc => `
                    <a href="#${doc.id}" class="doc-item" data-doc-id="${doc.id}" title="${doc.description}">
                        <i class="fas ${doc.icon}" aria-hidden="true"></i>
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
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const doc = VAULT_DOCUMENTS.find(d => d.id === item.dataset.docId);
            if (doc) openDocument(doc);
        });
    });
}

/**
 * Load and render a document
 * @returns {Promise<boolean>} true if this call rendered the document
 */
async function loadDocument(doc) {
    const contentEl = document.getElementById('vault-content');
    if (!contentEl) return false;
    const sequence = ++loadSequence;

    // Update active state in sidebar
    document.querySelectorAll('.doc-item').forEach(item => {
        const active = item.dataset.docId === doc.id;
        item.classList.toggle('active', active);
        if (active) {
            item.setAttribute('aria-current', 'page');
        } else {
            item.removeAttribute('aria-current');
        }
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
        if (sequence !== loadSequence) return false;

        // Count lines for stats
        const lineCount = content.split('\n').length;

        // Parse markdown to HTML
        const htmlContent = marked.parse(content);

        // Render document
        contentEl.innerHTML = `
            <div class="doc-header">
                <h1><i class="fas ${doc.icon}" aria-hidden="true"></i> <span class="doc-header-title">${doc.title}</span></h1>
                <div class="doc-meta">
                    <span class="doc-meta-item">
                        <i class="fas fa-file" aria-hidden="true"></i> ${doc.filename}
                    </span>
                    <span class="doc-meta-item">
                        <i class="fas fa-align-left" aria-hidden="true"></i> ${lineCount} Zeilen
                    </span>
                    <span class="doc-meta-item">
                        <i class="fas fa-folder" aria-hidden="true"></i> ${CATEGORIES[doc.category]?.title || doc.category}
                    </span>
                </div>
            </div>
            <div class="markdown-body">
                ${htmlContent}
            </div>
        `;

        const body = contentEl.querySelector('.markdown-body');
        promoteDocumentTitle(contentEl.querySelector('.doc-header h1'), body);
        wireDocumentLinks(body);
        currentDoc = doc;

        // Scroll to top
        contentEl.scrollTop = 0;
        return true;

    } catch (error) {
        if (sequence !== loadSequence) return false;
        console.error('Error loading document:', error);
        contentEl.innerHTML = `
            <div class="content-placeholder">
                <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                <p></p>
            </div>
        `;
        contentEl.querySelector('.content-placeholder p').textContent = `Fehler beim Laden des Dokuments: ${error.message}`;
        return false;
    }
}

/**
 * Every knowledge document opens with its own # title. It becomes the text of the header h1,
 * so the page has a single h1 and anchors to the title still resolve.
 */
function promoteDocumentTitle(headerHeading, body) {
    const first = body?.firstElementChild;
    if (!headerHeading || first?.tagName !== 'H1') return;
    headerHeading.querySelector('.doc-header-title').textContent = first.textContent;
    headerHeading.id = slugify(first.textContent);
    first.remove();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
