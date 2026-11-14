// Chronik View
// Timeline display of letters with Wikidata enrichment support

import { escapeHtml, safeUrl, openModal, closeModal, personKey, letterRecipients } from '../utils.js';
import { formatDateWithPrecision, getPersonInitials } from '../formatters.js';
import { enrichPerson, formatLifeDates } from '../wikidata-enrichment.js';
import { elements } from '../dom-cache.js';
import { state } from '../state-manager.js';
import { renderFilterNotice } from './view-support.js';

// Module state
let chronikEnriched = false;
let chronikEnrichmentData = new Map();
let chronikSortedLetters = [];
let chronikRenderedCount = 0;
let chronikLastYear;            // year of the last rendered entry, for the year markers across batches
let chronikOffAxisLabel = 'Datum unbekannt';  // marker of the letters without a year
let chronikObserver = null;     // loads the next batch when the sentinel at the end becomes visible
let chronikCorrespondenceIndex = null;
let chronikIndexSource = null;  // letter array the correspondence index was built from
let chronikLayout = 'cards'; // 'cards' | 'compact' | 'timeline'
let chronikEnrichmentCancelled = false;
const CHRONIK_BATCH_SIZE = 100;

// External dependencies - injected via init
let getFilteredLetters = null;
let getAllLetters = null;
let showLetterDetail = null;

/**
 * Initialize chronik view with external dependencies
 * @param {Object} deps - External dependencies from explore.js
 */
export function initChronikView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    // The position in a correspondence ("Erster Brief", "3. von 12") is a property of the whole
    // dataset, not of the current filter
    getAllLetters = deps.getAllLetters || (() => state.getAllLetters());
    showLetterDetail = deps.showLetterDetail;

    setupChronikEventHandlers();
}

/**
 * Setup event handlers for chronik view
 */
function setupChronikEventHandlers() {
    // Layout toggle buttons: icon-only, so the title becomes the accessible name
    document.querySelectorAll('.chronik-layout-btn').forEach(btn => {
        if (!btn.getAttribute('aria-label') && btn.title) btn.setAttribute('aria-label', btn.title);
        btn.querySelectorAll('i').forEach(i => i.setAttribute('aria-hidden', 'true'));
        btn.setAttribute('aria-pressed', String(btn.dataset.layout === chronikLayout));
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
}

// A date that can stand on the time axis; an implausible year is a slip of the source and would
// put the letter decades away from its neighbours, so it sorts with the undated letters
function axisDate(letter) {
    return letter.dateImplausible ? null : letter.date || null;
}

function compareByAxisDate(a, b) {
    return (axisDate(a) || '9999').localeCompare(axisDate(b) || '9999');
}

// A correspondence is the exchange between two persons in both directions
function pairKey(a, b) {
    return [a, b].sort().join('<->');
}

// Key of a person who can stand in a correspondence. An unknown person ("Unbekannt") is not one
// correspondent: all unknown writers would share a key and form one false correspondence.
function correspondentKey(person) {
    return person && person.precision !== 'unknown' ? personKey(person) : null;
}

/**
 * Index of every correspondence: the letters between two persons, in either direction, in
 * date order. A letter to several recipients belongs to the correspondence with each of them.
 * @param {Array} letters - Array of letter objects
 * @returns {Map} pair key -> {letters: [{id, year}], dated: number}
 */
function buildCorrespondenceIndex(letters) {
    const index = new Map();

    for (const letter of letters) {
        const senderId = correspondentKey(letter.sender);
        if (!senderId) continue;
        for (const recipient of letterRecipients(letter)) {
            const recipientId = correspondentKey(recipient);
            if (!recipientId || recipientId === senderId) continue;
            const key = pairKey(senderId, recipientId);
            if (!index.has(key)) index.set(key, { letters: [] });
            index.get(key).letters.push(letter);
        }
    }

    for (const entry of index.values()) {
        entry.letters.sort(compareByAxisDate);
        entry.dated = entry.letters.filter(l => axisDate(l) && l.year).length;
        entry.letters = entry.letters.map(l => ({ id: l.id, year: axisDate(l) ? l.year : null }));
    }

    return index;
}

/**
 * Place of a letter in the correspondence with its first recipient: its number among the
 * dated letters, the total, and the year of the previous letter when two or more years lie
 * between them. This course over time is what the chronicle adds to the letter list.
 * @param {Object} letter - Letter object
 * @returns {Object|null} {number, total, dated, isFirst, isLast, previousYear}; number is null
 *   for a letter without a place on the time axis
 */
function getCorrespondenceContext(letter) {
    if (!chronikCorrespondenceIndex) return null;

    const senderId = correspondentKey(letter.sender);
    const recipientId = correspondentKey(letterRecipients(letter)[0]);
    if (!senderId || !recipientId || senderId === recipientId) return null;

    const entry = chronikCorrespondenceIndex.get(pairKey(senderId, recipientId));
    if (!entry) return null;

    const position = entry.letters.findIndex(l => l.id === letter.id);
    const total = entry.letters.length;
    const own = entry.letters[position];
    if (!own?.year) return { number: null, total, dated: entry.dated };

    const previous = position > 0 ? entry.letters[position - 1] : null;
    return {
        number: position + 1,
        total,
        dated: entry.dated,
        isFirst: position === 0,
        isLast: position === entry.dated - 1,
        previousYear: previous?.year && own.year - previous.year >= 2 ? previous.year : null
    };
}

/**
 * The context in words, for the cards layout. "zwischen beiden" refers to the two names in the
 * line above, so every phrase reads without a label.
 */
function contextText(context) {
    if (!context) return '';
    if (context.total === 1) return 'Einziger Brief zwischen beiden';
    if (context.number === null) return `Ohne Stelle in der Folge der ${context.total} Briefe zwischen beiden`;
    if (context.isFirst) return `Erster von ${context.total} Briefen zwischen beiden`;
    const base = context.isLast && context.dated === context.total
        ? `Letzter von ${context.total} Briefen zwischen beiden`
        : `${context.number}. von ${context.total} Briefen zwischen beiden`;
    return context.previousYear ? `${base}, nach einer Lücke seit ${context.previousYear}` : base;
}

// Short form for the compact and two-column layouts: "1/48", "12/48"; a flag marks the beginning
function contextBadgeShort(context, className) {
    if (!context || context.total < 2 || context.number === null) return '';
    const title = escapeHtml(contextText(context));
    const flag = context.isFirst ? '<i class="fas fa-flag" aria-hidden="true"></i> ' : '';
    return `<span class="${className}${context.isFirst ? ' first' : ''}" title="${title}">${flag}${context.number}/${context.total}<span class="visually-hidden">, ${title}</span></span>`;
}

// Recipients as one text: most letters have one, a source may name several
function recipientNames(letter) {
    const names = letterRecipients(letter).map(r => r.name).filter(Boolean);
    return names.length ? names.join(', ') : 'Unbekannt';
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
        return `<img src="${escapeHtml(safeUrl(enriched.thumbnail))}" alt="${escapeHtml(name)}" class="chronik-portrait" loading="lazy">`;
    }

    if (chronikEnriched) {
        // Show placeholder if enrichment was done but no image found
        const initials = getPersonInitials(name, 'identified');
        return `<div class="chronik-portrait-placeholder">${escapeHtml(initials)}</div>`;
    }

    // Before enrichment, show nothing
    return '';
}

/**
 * Build small portrait HTML (for timeline layout)
 */
function buildPortraitHtmlSmall(enriched, name) {
    if (enriched?.thumbnail) {
        return `<img src="${escapeHtml(safeUrl(enriched.thumbnail))}" alt="${escapeHtml(name)}" class="chronik-portrait-small" loading="lazy">`;
    }
    if (chronikEnriched) {
        const initials = getPersonInitials(name, 'identified');
        return `<div class="chronik-portrait-small-placeholder">${escapeHtml(initials)}</div>`;
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
            ${lifeDates ? `<div class="chronik-bio-dates"><i class="fas fa-birthday-cake"></i> ${escapeHtml(lifeDates)}</div>` : ''}
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
    chronikObserver?.disconnect();
    renderFilterNotice('chronik-view');

    if (!letters || letters.length === 0) {
        container.innerHTML = '<div class="chronik-empty">Der Filter lässt keinen Brief übrig.</div>';
        chronikRenderedCount = 0;
        chronikSortedLetters = [];
        return;
    }

    // Built from all letters once per dataset, so a filter does not make a later letter the "first"
    const allLetters = getAllLetters();
    if (chronikIndexSource !== allLetters) {
        chronikCorrespondenceIndex = buildCorrespondenceIndex(allLetters);
        chronikIndexSource = allLetters;
    }

    // Sort letters by date (oldest first), letters without a place on the axis at the end
    chronikSortedLetters = [...letters].sort(compareByAxisDate);
    // Their marker says "Datum unbekannt" only when no date in words or implausible year is among them
    chronikOffAxisLabel = chronikSortedLetters.some(l => !l.year && (l.dateText || l.dateImplausible))
        ? 'Nicht auf der Zeitachse'
        : 'Datum unbekannt';

    container.innerHTML = '';
    chronikRenderedCount = 0;
    chronikLastYear = undefined;

    // The sentinel follows the last entry. An IntersectionObserver works whichever ancestor
    // scrolls (#chronik-view scrolls, not #chronik-timeline)
    const sentinel = document.createElement('div');
    sentinel.className = 'chronik-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    container.appendChild(sentinel);

    renderChronikBatch(container, sentinel);

    chronikObserver = new IntersectionObserver((entries) => {
        if (!entries.some(e => e.isIntersecting)) return;
        renderChronikBatch(container, sentinel);
        // Observe anew, so a sentinel that stays visible after a short batch fires again
        chronikObserver.unobserve(sentinel);
        if (chronikRenderedCount < chronikSortedLetters.length) chronikObserver.observe(sentinel);
    });
    chronikObserver.observe(sentinel);

    updateChronikEnrichmentUI();
}

/**
 * Year marker between entries (US-28). Letters without a year get one marker "Datum unbekannt".
 */
function renderYearMarker(year) {
    const marker = document.createElement('div');
    marker.className = 'chronik-year-marker';
    // The view header is h2, so the year markers form the next level
    marker.setAttribute('role', 'heading');
    marker.setAttribute('aria-level', '3');
    const label = document.createElement('span');
    label.className = 'chronik-year-label';
    label.textContent = year ? String(year) : chronikOffAxisLabel;
    marker.appendChild(label);
    return marker;
}

/**
 * Render the next batch of letters before the sentinel
 */
function renderChronikBatch(container, sentinel) {
    const endIndex = Math.min(chronikRenderedCount + CHRONIK_BATCH_SIZE, chronikSortedLetters.length);

    if (chronikRenderedCount >= chronikSortedLetters.length) return;

    const fragment = document.createDocumentFragment();

    for (let i = chronikRenderedCount; i < endIndex; i++) {
        const letter = chronikSortedLetters[i];
        const year = letter.year || null;
        if (year !== chronikLastYear) {
            fragment.appendChild(renderYearMarker(year));
            chronikLastYear = year;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderChronikEntry(letter);
        const entry = wrapper.firstElementChild;

        if (entry) {
            entry.addEventListener('click', () => {
                showLetterDetail(letter.id);
            });
            fragment.appendChild(entry);
        }
    }

    container.insertBefore(fragment, sentinel);
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
    const recipientName = recipientNames(letter);

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
    const course = contextText(context);

    // Two lines without enrichment: date with writer and addressee, then place and the letter's
    // place in the correspondence. The persons block appears only when Wikidata added portraits,
    // life dates or professions, which the line above cannot hold.
    const enrichedPersons = chronikEnriched ? `
            <div class="chronik-persons">
                <div class="chronik-person chronik-sender">
                    ${senderPortrait}
                    <div class="chronik-person-info">
                        <span class="chronik-person-name">${escapeHtml(senderName)}</span>
                        ${senderBio}
                        ${senderLifespan}
                    </div>
                </div>
                <div class="chronik-person chronik-recipient">
                    ${recipientPortrait}
                    <div class="chronik-person-info">
                        <span class="chronik-person-name">${escapeHtml(recipientName)}</span>
                        ${recipientBio}
                        ${recipientLifespan}
                    </div>
                </div>
            </div>` : '';

    return `
        <div class="chronik-entry chronik-entry-cards" role="button" tabindex="0" data-letter-id="${escapeHtml(letter.id)}">
            <div class="chronik-header">
                <span class="chronik-date">${dateDisplay}</span>
                <span class="chronik-pair">${escapeHtml(senderName)} an ${escapeHtml(recipientName)}</span>
            </div>
            ${place || course ? `<div class="chronik-course">
                ${place ? `<span class="chronik-place">${escapeHtml(place)}</span>` : ''}
                ${course ? `<span class="chronik-context${context?.isFirst || context?.total === 1 ? ' first' : ''}">${context?.isFirst || context?.total === 1 ? '<i class="fas fa-flag" aria-hidden="true"></i> ' : ''}${escapeHtml(course)}</span>` : ''}
            </div>` : ''}
            ${enrichedPersons}
        </div>
    `;
}

/**
 * Render letter entry in compact layout (minimal info, more letters visible)
 */
function renderChronikEntryCompact(letter) {
    const senderName = letter.sender?.name || 'Unbekannt';
    const recipientName = recipientNames(letter);

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

    const contextBadge = contextBadgeShort(context, 'chronik-badge');

    return `
        <div class="chronik-entry chronik-entry-compact" role="button" tabindex="0" data-letter-id="${escapeHtml(letter.id)}">
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
    const recipientName = recipientNames(letter);

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

    const contextBadge = contextBadgeShort(context, 'chronik-tl-badge');

    return `
        <div class="chronik-entry chronik-entry-timeline" role="button" tabindex="0" data-letter-id="${escapeHtml(letter.id)}">
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

    document.querySelectorAll('.chronik-layout-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === layout);
        btn.setAttribute('aria-pressed', String(btn.dataset.layout === layout));
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

    openModal(modal);
}

/**
 * Close the enrichment modal
 */
function closeEnrichmentModal() {
    const modal = document.getElementById('enrichment-modal');
    if (modal) closeModal(modal);
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
