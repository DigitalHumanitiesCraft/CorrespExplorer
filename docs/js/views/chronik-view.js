// Chronik View - Extracted from explore.js
// Timeline display of letters with Wikidata enrichment support

import { escapeHtml } from '../utils.js';
import { formatDateWithPrecision, getPersonInitials } from '../formatters.js';
import { enrichPerson, formatLifeDates } from '../wikidata-enrichment.js';
import { elements } from '../dom-cache.js';

// Module state
let chronikEnriched = false;
let chronikEnrichmentData = new Map();
let chronikSortedLetters = [];
let chronikRenderedCount = 0;
let chronikScrollHandler = null;
let chronikCorrespondenceIndex = null;
let chronikLayout = 'cards'; // 'cards' | 'compact' | 'timeline'
let chronikEnrichmentCancelled = false;
const CHRONIK_BATCH_SIZE = 100;

// External dependencies - injected via init
let getFilteredLetters = null;
let showLetterDetail = null;
let stateRef = null;

/**
 * Initialize chronik view with external dependencies
 * @param {Object} deps - External dependencies from explore.js
 */
export function initChronikView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    showLetterDetail = deps.showLetterDetail;
    stateRef = deps.state;

    setupChronikEventHandlers();
}

/**
 * Setup event handlers for chronik view
 */
function setupChronikEventHandlers() {
    // Layout toggle buttons
    document.querySelectorAll('.chronik-layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layout = btn.dataset.layout;
            if (layout) switchChronikLayout(layout);
        });
    });

    // Open modal button
    const enrichBtn = document.getElementById('chronik-enrich-btn');
    if (enrichBtn) {
        enrichBtn.addEventListener('click', () => {
            openEnrichmentModal();
        });
    }

    // Modal buttons
    const startBtn = document.getElementById('enrichment-start-btn');
    const cancelBtn = document.getElementById('enrichment-cancel-btn');
    const closeBtn = document.getElementById('enrichment-close-btn');
    const modal = document.getElementById('enrichment-modal');

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            await runEnrichment();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            chronikEnrichmentCancelled = true;
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeEnrichmentModal();
        });
    }

    // Close modal on X or backdrop click
    if (modal) {
        modal.querySelector('.modal-close')?.addEventListener('click', closeEnrichmentModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEnrichmentModal();
        });
    }
}

/**
 * Build correspondence index for relationship context
 * Maps sender->recipient pairs to their letter history
 * @param {Array} letters - Array of letter objects
 * @returns {Map} Index mapping "senderId->recipientId" to correspondence data
 */
function buildCorrespondenceIndex(letters) {
    const index = new Map();

    for (const letter of letters) {
        const senderId = letter.sender?.id || letter.sender?.name;
        const recipientId = letter.recipient?.id || letter.recipient?.name;

        if (!senderId || !recipientId) continue;

        const key = `${senderId}->${recipientId}`;

        if (!index.has(key)) {
            index.set(key, {
                letters: [],
                totalCount: 0
            });
        }

        const entry = index.get(key);
        entry.letters.push({
            id: letter.id,
            year: letter.year,
            date: letter.date
        });
        entry.totalCount++;
    }

    // Sort letters chronologically within each correspondence
    for (const entry of index.values()) {
        entry.letters.sort((a, b) => {
            const dateA = a.date || '9999';
            const dateB = b.date || '9999';
            return dateA.localeCompare(dateB);
        });
        entry.firstLetterId = entry.letters[0]?.id;
    }

    return index;
}

/**
 * Get correspondence context for a letter
 * @param {Object} letter - Letter object
 * @returns {Object} Context with isFirstLetter, letterNumber, totalLetters
 */
function getCorrespondenceContext(letter) {
    if (!chronikCorrespondenceIndex) return null;

    const senderId = letter.sender?.id || letter.sender?.name;
    const recipientId = letter.recipient?.id || letter.recipient?.name;

    if (!senderId || !recipientId) return null;

    const key = `${senderId}->${recipientId}`;
    const entry = chronikCorrespondenceIndex.get(key);

    if (!entry) return null;

    // Find position of this letter in the correspondence
    const letterIndex = entry.letters.findIndex(l => l.id === letter.id);

    return {
        isFirstLetter: letter.id === entry.firstLetterId,
        letterNumber: letterIndex + 1,
        totalLetters: entry.totalCount,
        direction: 'sent'
    };
}

/**
 * Extract birth year from person data (CMIF or Wikidata enrichment)
 * @param {Object} person - Person object from letter
 * @param {Object} enrichment - Wikidata enrichment data (optional)
 * @returns {number|null} Birth year or null
 */
function getPersonBirthYear(person, enrichment) {
    // Priority 1: Wikidata enrichment
    if (enrichment?.birthDate) {
        const match = enrichment.birthDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    // Priority 2: CMIF data (if present)
    if (person?.birthDate) {
        const match = person.birthDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    return null;
}

/**
 * Extract death year from person data (CMIF or Wikidata enrichment)
 * @param {Object} person - Person object from letter
 * @param {Object} enrichment - Wikidata enrichment data (optional)
 * @returns {number|null} Death year or null
 */
function getPersonDeathYear(person, enrichment) {
    // Priority 1: Wikidata enrichment
    if (enrichment?.deathDate) {
        const match = enrichment.deathDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    // Priority 2: CMIF data (if present)
    if (person?.deathDate) {
        const match = person.deathDate.match(/^(-?\d{4})/);
        if (match) return parseInt(match[1], 10);
    }

    return null;
}

/**
 * Calculate age at time of letter
 * @param {number} birthYear - Birth year
 * @param {Object} letter - Letter object with date/year
 * @returns {number|null} Age or null
 */
function calculateAge(birthYear, letter) {
    if (!birthYear) return null;

    const letterYear = letter.year || (letter.date ? parseInt(letter.date.substring(0, 4), 10) : null);
    if (!letterYear) return null;

    return letterYear - birthYear;
}

/**
 * Build lifespan bar HTML showing where in life the person is at letter time
 * @param {number} birthYear - Birth year
 * @param {number} deathYear - Death year (or null if still alive/unknown)
 * @param {number} age - Age at time of letter
 * @returns {string} HTML for lifespan bar
 */
function buildLifespanBar(birthYear, deathYear, age) {
    if (!birthYear || !age || age < 0) return '';

    // Calculate total lifespan (use death year or estimate 85 if unknown)
    const totalYears = deathYear ? (deathYear - birthYear) : 85;
    const percentage = Math.min(100, Math.round((age / totalYears) * 100));

    const tooltip = deathYear
        ? `${birthYear}-${deathYear} (${totalYears} Jahre)`
        : `*${birthYear}`;

    return `
        <div class="chronik-lifespan" title="${tooltip}">
            <div class="chronik-lifespan-bar">
                <div class="chronik-lifespan-progress" style="width: ${percentage}%"></div>
            </div>
            <span class="chronik-lifespan-age">${age}</span>
        </div>
    `;
}

/**
 * Build compact lifespan bar (smaller version for compact/timeline layouts)
 */
function buildLifespanBarCompact(birthYear, deathYear, age) {
    if (!birthYear || !age || age < 0) return '';

    const totalYears = deathYear ? (deathYear - birthYear) : 85;
    const percentage = Math.min(100, Math.round((age / totalYears) * 100));

    const tooltip = deathYear
        ? `${age} Jahre (${birthYear}-${deathYear})`
        : `${age} Jahre (*${birthYear})`;

    return `
        <div class="chronik-lifespan-compact" title="${tooltip}">
            <div class="chronik-lifespan-bar-compact">
                <div class="chronik-lifespan-progress-compact" style="width: ${percentage}%"></div>
            </div>
            <span class="chronik-lifespan-age-compact">${age}</span>
        </div>
    `;
}

/**
 * Get enrichment data for a person
 */
function getPersonEnrichment(person) {
    if (!person || !chronikEnriched) return null;

    // Try to find by authority ID
    const authorityId = person.viaf || person.gnd || person.id;
    if (authorityId && chronikEnrichmentData.has(authorityId)) {
        return chronikEnrichmentData.get(authorityId);
    }

    // Try to find by name
    if (person.name && chronikEnrichmentData.has(person.name)) {
        return chronikEnrichmentData.get(person.name);
    }

    return null;
}

/**
 * Build portrait HTML for a person
 */
function buildPortraitHtml(enriched, name) {
    if (enriched && enriched.thumbnail) {
        return `<img src="${enriched.thumbnail}" alt="${escapeHtml(name)}" class="chronik-portrait" loading="lazy">`;
    }

    if (chronikEnriched) {
        // Show placeholder if enrichment was done but no image found
        const initials = getPersonInitials(name, 'identified');
        return `<div class="chronik-portrait-placeholder">${initials}</div>`;
    }

    // Before enrichment, show nothing
    return '';
}

/**
 * Build small portrait HTML (for timeline layout)
 */
function buildPortraitHtmlSmall(enriched, name) {
    if (enriched?.thumbnail) {
        return `<img src="${enriched.thumbnail}" alt="${escapeHtml(name)}" class="chronik-portrait-small" loading="lazy">`;
    }
    if (chronikEnriched) {
        const initials = getPersonInitials(name, 'identified');
        return `<div class="chronik-portrait-small-placeholder">${initials}</div>`;
    }
    return '';
}

/**
 * Build biographical info HTML
 */
function buildBioHtml(enriched) {
    if (!enriched) return '';

    const lifeDates = formatLifeDates(enriched);
    const profession = enriched.professions?.[0] || '';

    if (!lifeDates && !profession) return '';

    return `
        <div class="chronik-bio">
            ${lifeDates ? `<div class="chronik-bio-dates"><i class="fas fa-birthday-cake"></i> ${lifeDates}</div>` : ''}
            ${profession ? `<div class="chronik-bio-profession">${escapeHtml(profession)}</div>` : ''}
        </div>
    `;
}

/**
 * Truncate name to max length
 */
function truncateName(name, maxLen = 25) {
    if (!name || name.length <= maxLen) return name;
    return name.substring(0, maxLen - 1) + '...';
}

/**
 * Render the Chronik timeline view with lazy loading
 */
export function renderChronik() {
    const container = elements.getById('chronik-timeline');
    if (!container) return;

    const letters = getFilteredLetters();

    if (!letters || letters.length === 0) {
        container.innerHTML = '<div class="chronik-empty">Keine Briefe im ausgewaehlten Zeitraum</div>';
        chronikRenderedCount = 0;
        chronikSortedLetters = [];
        return;
    }

    // Build correspondence index for context
    chronikCorrespondenceIndex = buildCorrespondenceIndex(letters);

    // Sort letters by date (oldest first)
    chronikSortedLetters = [...letters].sort((a, b) => {
        const dateA = a.date || '9999';
        const dateB = b.date || '9999';
        return dateA.localeCompare(dateB);
    });

    // Reset container
    container.innerHTML = '';
    chronikRenderedCount = 0;

    // Render first batch
    renderChronikBatch(container);

    // Setup infinite scroll
    if (chronikScrollHandler) {
        container.removeEventListener('scroll', chronikScrollHandler);
    }

    chronikScrollHandler = () => {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        // Load more when scrolled near bottom
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            renderChronikBatch(container);
        }
    };

    container.addEventListener('scroll', chronikScrollHandler);

    // Update enrichment UI
    updateChronikEnrichmentUI();
}

/**
 * Render a batch of letters
 */
function renderChronikBatch(container) {
    const endIndex = Math.min(chronikRenderedCount + CHRONIK_BATCH_SIZE, chronikSortedLetters.length);

    if (chronikRenderedCount >= chronikSortedLetters.length) return;

    const fragment = document.createDocumentFragment();

    for (let i = chronikRenderedCount; i < endIndex; i++) {
        const letter = chronikSortedLetters[i];
        const entryHtml = renderChronikEntry(letter);

        const wrapper = document.createElement('div');
        wrapper.innerHTML = entryHtml;
        const entry = wrapper.firstElementChild;

        if (entry) {
            entry.addEventListener('click', () => {
                showLetterDetail(letter.id);
            });
            fragment.appendChild(entry);
        }
    }

    container.appendChild(fragment);
    chronikRenderedCount = endIndex;
}

/**
 * Render a single letter entry based on layout
 */
function renderChronikEntry(letter) {
    switch (chronikLayout) {
        case 'compact':
            return renderChronikEntryCompact(letter);
        case 'timeline':
            return renderChronikEntryTimeline(letter);
        case 'cards':
        default:
            return renderChronikEntryCards(letter);
    }
}

/**
 * Render letter entry in cards layout (full info)
 */
function renderChronikEntryCards(letter) {
    const senderName = letter.sender?.name || 'Unbekannt';
    const recipientName = letter.recipient?.name || 'Unbekannt';

    // Get enrichment data
    const senderEnriched = getPersonEnrichment(letter.sender);
    const recipientEnriched = getPersonEnrichment(letter.recipient);

    // Get birth years and calculate ages
    const senderBirthYear = getPersonBirthYear(letter.sender, senderEnriched);
    const recipientBirthYear = getPersonBirthYear(letter.recipient, recipientEnriched);
    const senderDeathYear = getPersonDeathYear(letter.sender, senderEnriched);
    const recipientDeathYear = getPersonDeathYear(letter.recipient, recipientEnriched);
    const senderAge = calculateAge(senderBirthYear, letter);
    const recipientAge = calculateAge(recipientBirthYear, letter);

    // Get correspondence context
    const context = getCorrespondenceContext(letter);

    // Build HTML parts
    const senderPortrait = buildPortraitHtml(senderEnriched, senderName);
    const recipientPortrait = buildPortraitHtml(recipientEnriched, recipientName);

    const senderBio = buildBioHtml(senderEnriched);
    const recipientBio = buildBioHtml(recipientEnriched);

    const senderLifespan = buildLifespanBar(senderBirthYear, senderDeathYear, senderAge);
    const recipientLifespan = buildLifespanBar(recipientBirthYear, recipientDeathYear, recipientAge);

    const dateDisplay = formatDateWithPrecision(letter);
    const place = letter.place_sent?.name || '';

    // Context badge (first letter or position in correspondence)
    let contextBadge = '';
    if (context?.isFirstLetter) {
        contextBadge = '<span class="chronik-context-badge first"><i class="fas fa-star"></i> Erster Brief</span>';
    } else if (context?.totalLetters > 1) {
        contextBadge = `<span class="chronik-context-badge">${context.letterNumber}. von ${context.totalLetters}</span>`;
    }

    return `
        <div class="chronik-entry chronik-entry-cards" data-letter-id="${letter.id}">
            <div class="chronik-header">
                <div class="chronik-date">${dateDisplay}</div>
                ${place ? `<div class="chronik-place"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(place)}</div>` : ''}
                ${contextBadge}
            </div>
            <div class="chronik-persons">
                <div class="chronik-person chronik-sender">
                    ${senderPortrait}
                    <div class="chronik-person-info">
                        <span class="chronik-person-role">Absender</span>
                        <span class="chronik-person-name">${escapeHtml(senderName)}</span>
                        ${senderBio}
                        ${senderLifespan}
                    </div>
                </div>
                <div class="chronik-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="chronik-person chronik-recipient">
                    ${recipientPortrait}
                    <div class="chronik-person-info">
                        <span class="chronik-person-role">Empfaenger</span>
                        <span class="chronik-person-name">${escapeHtml(recipientName)}</span>
                        ${recipientBio}
                        ${recipientLifespan}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render letter entry in compact layout (minimal info, more letters visible)
 */
function renderChronikEntryCompact(letter) {
    const senderName = letter.sender?.name || 'Unbekannt';
    const recipientName = letter.recipient?.name || 'Unbekannt';

    const senderEnriched = getPersonEnrichment(letter.sender);
    const recipientEnriched = getPersonEnrichment(letter.recipient);

    const senderBirthYear = getPersonBirthYear(letter.sender, senderEnriched);
    const recipientBirthYear = getPersonBirthYear(letter.recipient, recipientEnriched);
    const senderDeathYear = getPersonDeathYear(letter.sender, senderEnriched);
    const recipientDeathYear = getPersonDeathYear(letter.recipient, recipientEnriched);
    const senderAge = calculateAge(senderBirthYear, letter);
    const recipientAge = calculateAge(recipientBirthYear, letter);

    const context = getCorrespondenceContext(letter);
    const dateDisplay = formatDateWithPrecision(letter);
    const place = letter.place_sent?.name || '';

    const senderBar = buildLifespanBarCompact(senderBirthYear, senderDeathYear, senderAge);
    const recipientBar = buildLifespanBarCompact(recipientBirthYear, recipientDeathYear, recipientAge);

    let contextBadge = '';
    if (context?.isFirstLetter) {
        contextBadge = '<span class="chronik-badge first"><i class="fas fa-star"></i></span>';
    } else if (context?.totalLetters > 1) {
        contextBadge = `<span class="chronik-badge">${context.letterNumber}/${context.totalLetters}</span>`;
    }

    return `
        <div class="chronik-entry chronik-entry-compact" data-letter-id="${letter.id}">
            <div class="chronik-compact-date">${dateDisplay}</div>
            <div class="chronik-compact-sender">
                <span class="name">${escapeHtml(truncateName(senderName, 20))}</span>
                ${senderBar}
            </div>
            <div class="chronik-compact-arrow"><i class="fas fa-arrow-right"></i></div>
            <div class="chronik-compact-recipient">
                <span class="name">${escapeHtml(truncateName(recipientName, 20))}</span>
                ${recipientBar}
            </div>
            ${place ? `<div class="chronik-compact-place">${escapeHtml(truncateName(place, 12))}</div>` : ''}
            ${contextBadge}
        </div>
    `;
}

/**
 * Render letter entry in timeline layout (sender left, recipient right)
 */
function renderChronikEntryTimeline(letter) {
    const senderName = letter.sender?.name || 'Unbekannt';
    const recipientName = letter.recipient?.name || 'Unbekannt';

    const senderEnriched = getPersonEnrichment(letter.sender);
    const recipientEnriched = getPersonEnrichment(letter.recipient);

    const senderBirthYear = getPersonBirthYear(letter.sender, senderEnriched);
    const recipientBirthYear = getPersonBirthYear(letter.recipient, recipientEnriched);
    const senderDeathYear = getPersonDeathYear(letter.sender, senderEnriched);
    const recipientDeathYear = getPersonDeathYear(letter.recipient, recipientEnriched);
    const senderAge = calculateAge(senderBirthYear, letter);
    const recipientAge = calculateAge(recipientBirthYear, letter);

    const context = getCorrespondenceContext(letter);
    const dateDisplay = formatDateWithPrecision(letter);
    const place = letter.place_sent?.name || '';

    const senderPortraitSmall = buildPortraitHtmlSmall(senderEnriched, senderName);
    const recipientPortraitSmall = buildPortraitHtmlSmall(recipientEnriched, recipientName);

    const senderBar = buildLifespanBarCompact(senderBirthYear, senderDeathYear, senderAge);
    const recipientBar = buildLifespanBarCompact(recipientBirthYear, recipientDeathYear, recipientAge);

    let contextBadge = '';
    if (context?.isFirstLetter) {
        contextBadge = '<span class="chronik-tl-badge first"><i class="fas fa-star"></i></span>';
    } else if (context?.totalLetters > 1) {
        contextBadge = `<span class="chronik-tl-badge">${context.letterNumber}/${context.totalLetters}</span>`;
    }

    return `
        <div class="chronik-entry chronik-entry-timeline" data-letter-id="${letter.id}">
            <div class="chronik-tl-left">
                ${senderPortraitSmall}
                <div class="chronik-tl-person">
                    <span class="chronik-tl-name">${escapeHtml(truncateName(senderName, 20))}</span>
                    ${senderBar}
                </div>
            </div>
            <div class="chronik-tl-center">
                <div class="chronik-tl-date">${dateDisplay}</div>
                ${contextBadge}
                ${place ? `<div class="chronik-tl-place"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(truncateName(place, 15))}</div>` : ''}
            </div>
            <div class="chronik-tl-right">
                ${recipientPortraitSmall}
                <div class="chronik-tl-person">
                    <span class="chronik-tl-name">${escapeHtml(truncateName(recipientName, 20))}</span>
                    ${recipientBar}
                </div>
            </div>
        </div>
    `;
}

/**
 * Switch Chronik layout and re-render
 */
function switchChronikLayout(layout) {
    chronikLayout = layout;

    // Update toggle buttons
    document.querySelectorAll('.chronik-layout-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    // Update timeline class for CSS
    const timeline = document.getElementById('chronik-timeline');
    if (timeline) {
        timeline.className = `chronik-timeline chronik-layout-${layout}`;
    }

    // Re-render
    renderChronik();
}

/**
 * Update Chronik enrichment UI elements
 */
function updateChronikEnrichmentUI() {
    const enrichBtn = elements.getById('chronik-enrich-btn');
    const statusEl = elements.getById('chronik-enrich-status');

    if (chronikEnriched) {
        if (enrichBtn) enrichBtn.classList.add('hidden');
        if (statusEl) statusEl.classList.remove('hidden');
    } else {
        if (enrichBtn) enrichBtn.classList.remove('hidden');
        if (statusEl) statusEl.classList.add('hidden');
    }
}

/**
 * Open the enrichment modal
 */
function openEnrichmentModal() {
    const modal = document.getElementById('enrichment-modal');
    if (!modal) return;

    // Count enrichable persons
    const letters = getFilteredLetters();
    const personsToEnrich = new Map();

    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            if (!person) return;
            const authority = person.authority || (person.viaf ? 'viaf' : (person.gnd ? 'gnd' : null));
            const authorityId = person.viaf || person.gnd || person.id;
            if (authority && authorityId && !personsToEnrich.has(authorityId)) {
                personsToEnrich.set(authorityId, { name: person.name, authority, authorityId });
            }
        });
    });

    // Update count
    document.getElementById('enrichment-person-count').textContent = personsToEnrich.size;

    // Reset modal state
    document.getElementById('enrichment-info').classList.remove('hidden');
    document.getElementById('enrichment-progress').classList.add('hidden');
    document.getElementById('enrichment-done').classList.add('hidden');
    document.getElementById('enrichment-start-btn').classList.remove('hidden');
    document.getElementById('enrichment-cancel-btn').classList.add('hidden');
    document.getElementById('enrichment-close-btn').classList.add('hidden');

    // Show modal
    modal.classList.remove('hidden');
}

/**
 * Close the enrichment modal
 */
function closeEnrichmentModal() {
    const modal = document.getElementById('enrichment-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Run the enrichment process with progress
 */
async function runEnrichment() {
    chronikEnrichmentCancelled = false;

    // Update UI
    document.getElementById('enrichment-info').classList.add('hidden');
    document.getElementById('enrichment-progress').classList.remove('hidden');
    document.getElementById('enrichment-start-btn').classList.add('hidden');
    document.getElementById('enrichment-cancel-btn').classList.remove('hidden');

    // Collect persons
    const letters = getFilteredLetters();
    const personsToEnrich = new Map();

    letters.forEach(letter => {
        [letter.sender, letter.recipient].forEach(person => {
            if (!person) return;
            const authority = person.authority || (person.viaf ? 'viaf' : (person.gnd ? 'gnd' : null));
            const authorityId = person.viaf || person.gnd || person.id;
            if (authority && authorityId && !personsToEnrich.has(authorityId)) {
                personsToEnrich.set(authorityId, { name: person.name, authority, authorityId });
            }
        });
    });

    const personsArray = Array.from(personsToEnrich.values());
    const total = personsArray.length;

    document.getElementById('enrichment-total').textContent = total;

    let enrichedCount = 0;
    let notFoundCount = 0;
    const enrichmentStats = {
        withPortrait: 0,
        withBirthDate: 0,
        withDeathDate: 0,
        withProfession: 0,
        withWikipedia: 0
    };
    const liveLog = document.getElementById('enrichment-live-log');
    liveLog.innerHTML = '';

    for (let i = 0; i < personsArray.length; i++) {
        if (chronikEnrichmentCancelled) break;

        const person = personsArray[i];

        // Update progress
        document.getElementById('enrichment-current').textContent = i + 1;
        document.getElementById('enrichment-current-person').textContent = person.name || '';
        document.getElementById('enrichment-progress-bar').style.width = `${((i + 1) / total) * 100}%`;

        try {
            const enriched = await enrichPerson(person.authority, person.authorityId);
            if (enriched) {
                chronikEnrichmentData.set(person.authorityId, enriched);
                if (person.name) chronikEnrichmentData.set(person.name, enriched);
                enrichedCount++;

                // Track what was found
                if (enriched.image) enrichmentStats.withPortrait++;
                if (enriched.birthDate) enrichmentStats.withBirthDate++;
                if (enriched.deathDate) enrichmentStats.withDeathDate++;
                if (enriched.professions?.length > 0) enrichmentStats.withProfession++;
                if (enriched.wikipediaUrl) enrichmentStats.withWikipedia++;

                // Live log entry - show what was found
                const found = [];
                if (enriched.image) found.push('<i class="fas fa-portrait" title="Portrait"></i>');
                if (enriched.birthDate) found.push('<i class="fas fa-baby" title="Geburtsdatum"></i>');
                if (enriched.deathDate) found.push('<i class="fas fa-cross" title="Sterbedatum"></i>');
                if (enriched.professions?.length > 0) found.push('<i class="fas fa-briefcase" title="Beruf"></i>');
                if (enriched.wikipediaUrl) found.push('<i class="fas fa-wikipedia-w" title="Wikipedia"></i>');

                const logEntry = document.createElement('div');
                logEntry.className = 'enrichment-log-entry enrichment-log-success';
                logEntry.innerHTML = `<span class="log-name">${escapeHtml(person.name || 'Unbekannt')}</span> <span class="log-icons">${found.join(' ')}</span>`;
                liveLog.insertBefore(logEntry, liveLog.firstChild);
            } else {
                notFoundCount++;
                const logEntry = document.createElement('div');
                logEntry.className = 'enrichment-log-entry enrichment-log-empty';
                logEntry.innerHTML = `<span class="log-name">${escapeHtml(person.name || 'Unbekannt')}</span> <span class="log-status">keine Daten</span>`;
                liveLog.insertBefore(logEntry, liveLog.firstChild);
            }

            // Keep only last 8 entries visible
            while (liveLog.children.length > 8) {
                liveLog.removeChild(liveLog.lastChild);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(`Failed to enrich ${person.name}:`, error.message);
            notFoundCount++;
        }
    }

    // Done
    chronikEnriched = true;
    renderChronik();
    document.querySelector('.chronik-container')?.classList.add('enriched');
    updateChronikEnrichmentUI();

    // Show done state with summary
    document.getElementById('enrichment-progress').classList.add('hidden');
    document.getElementById('enrichment-done').classList.remove('hidden');
    document.getElementById('enrichment-success-count').textContent = enrichedCount;

    // Build summary
    const summaryEl = document.getElementById('enrichment-summary');
    summaryEl.innerHTML = `
        <div class="enrichment-summary-grid">
            <div class="summary-item"><i class="fas fa-portrait"></i> ${enrichmentStats.withPortrait} Portraits</div>
            <div class="summary-item"><i class="fas fa-baby"></i> ${enrichmentStats.withBirthDate} Geburtsdaten</div>
            <div class="summary-item"><i class="fas fa-cross"></i> ${enrichmentStats.withDeathDate} Sterbedaten</div>
            <div class="summary-item"><i class="fas fa-briefcase"></i> ${enrichmentStats.withProfession} Berufe</div>
            <div class="summary-item"><i class="fas fa-wikipedia-w"></i> ${enrichmentStats.withWikipedia} Wikipedia</div>
            <div class="summary-item summary-empty"><i class="fas fa-times-circle"></i> ${notFoundCount} ohne Daten</div>
        </div>
    `;

    document.getElementById('enrichment-cancel-btn').classList.add('hidden');
    document.getElementById('enrichment-close-btn').classList.remove('hidden');
}

/**
 * Check if chronik is enriched
 */
export function isChronikEnriched() {
    return chronikEnriched;
}

/**
 * Reset chronik state (call when data changes)
 */
export function resetChronikState() {
    chronikRenderedCount = 0;
    chronikSortedLetters = [];
    chronikCorrespondenceIndex = null;
}
