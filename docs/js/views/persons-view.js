// Correspondents view: the persons of the filtered letters as a list with search, order and kind,
// and the person dialog with the facts of the dataset and Wikidata on request (ADR-006).

import { addEntityToBasket } from '../basket.js';
import { enrichPerson, formatLifeDates, formatPlaces, buildExternalLinks } from '../wikidata-enrichment.js';
import { debounce, escapeHtml, safeUrl, openModal, closeModal, showToast, personKey, personAuthority, letterRecipients } from '../utils.js';
import { getPersonPrecisionClass, getPersonInitials } from '../formatters.js';
import { elements } from '../dom-cache.js';
import { authorityUrl, buildCorrespSearchUrl, detailRow } from './view-support.js';

let deps = {};
let personsSortOrder = 'letters-desc';
let personsSearchTerm = '';
let personsKind = 'all';

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getFilteredLetters
 * @param {Function} dependencies.getAllLetters
 * @param {Function} dependencies.getDataIndices
 * @param {Function} dependencies.showLettersOfPerson - sets the person filter and opens the letter list
 */
export function initPersonsView(dependencies) {
    deps = dependencies;
    const searchInput = elements.personSearch;
    const sortSelect = elements.personSort;

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            personsSearchTerm = e.target.value.toLowerCase();
            renderPersonsList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            personsSortOrder = e.target.value;
            renderPersonsList();
        });
    }

    const kindSelect = document.getElementById('person-kind');
    if (kindSelect) {
        kindSelect.addEventListener('change', (e) => {
            personsKind = e.target.value;
            renderPersonsList();
        });
    }
}

export function renderPersonsList() {
    const container = elements.personsList;
    if (!container) return;

    // Persons of the filtered letters, keyed with personKey (ADR-001)
    const personsMap = {};
    const count = (person, role) => {
        const key = personKey(person);
        if (!key) return;
        personsMap[key] ??= {
            key,
            // The source gives an authority id without a name
            name: person.name || `Ohne Namen (${key})`,
            id: person.id,
            authority: person.authority,
            precision: person.precision,
            isOrganization: Boolean(person.isOrganization),
            sent: 0,
            received: 0,
            letters: 0
        };
        personsMap[key][role]++;
        // The large figure counts letters, so a letter that names the person in both roles counts once
        if (!seenInLetter.has(key)) personsMap[key].letters++;
        seenInLetter.add(key);
    };
    let seenInLetter = new Set();
    deps.getFilteredLetters().forEach(letter => {
        seenInLetter = new Set();
        count(letter.sender, 'sent');
        letterRecipients(letter).forEach(recipient => count(recipient, 'received'));
    });

    let persons = Object.values(personsMap);

    // The kind filter offers only kinds the list holds, each with its count
    const kinds = {
        all: { label: 'Alle', test: () => true },
        identified: { label: 'Mit Normdatensatz', test: p => Boolean(p.id) },
        named: { label: 'Ohne Normdatensatz', test: p => !p.id },
        organizations: { label: 'Körperschaften', test: p => p.isOrganization }
    };
    const kindSelect = document.getElementById('person-kind');
    if (kindSelect) {
        const options = Object.entries(kinds)
            .map(([key, kind]) => [key, kind.label, persons.filter(kind.test).length])
            .filter(([key, , count]) => key === 'all' || (count > 0 && count < persons.length));
        if (!options.some(([key]) => key === personsKind)) personsKind = 'all';
        kindSelect.innerHTML = options.map(([key, label, count]) =>
            `<option value="${key}" ${key === personsKind ? 'selected' : ''}>${label} (${count.toLocaleString('de-DE')})</option>`).join('');
        kindSelect.closest('.list-sort')?.classList.toggle('hidden', options.length < 2);
    }
    persons = persons.filter(kinds[personsKind].test);

    if (personsSearchTerm) {
        persons = persons.filter(p => p.name.toLowerCase().includes(personsSearchTerm));
    }

    persons.sort((a, b) => {
        const totalA = a.letters;
        const totalB = b.letters;

        switch (personsSortOrder) {
            case 'letters-desc': return totalB - totalA;
            case 'letters-asc': return totalA - totalB;
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'name-desc': return b.name.localeCompare(a.name);
            default: return 0;
        }
    });

    if (persons.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" aria-hidden="true"></i>
                <p>Keine Korrespondenten gefunden</p>
            </div>
        `;
        return;
    }

    let enrichmentData = {};
    try {
        enrichmentData = JSON.parse(sessionStorage.getItem('person-enrichment') || '{}') || {};
    } catch {
        // Unreadable enrichment cache: the list shows no Wikidata markers
    }

    // The card is no button: filtering, basket, details and correspSearch are separate controls
    container.innerHTML = persons.map(person => {
        const initials = getPersonInitials(person.name, person.precision);
        const total = person.letters;
        const correspSearchUrl = buildCorrespSearchUrl(person);
        const precisionClass = getPersonPrecisionClass(person.precision);
        const hasWikidataEnrichment = enrichmentData[person.key]?.source === 'wikidata';
        const name = escapeHtml(person.name);

        const wikidataIndicator = hasWikidataEnrichment ? `
            <span class="wikidata-indicator" title="Wikidata-Anreicherung" role="img" aria-label="Wikidata-Anreicherung">
                <svg viewBox="0 0 30 20" width="14" height="10" aria-hidden="true">
                    <rect fill="#990000" width="6" height="20"/>
                    <rect fill="#339966" x="8" width="6" height="20"/>
                    <rect fill="#006699" x="16" width="6" height="20"/>
                </svg>
            </span>
        ` : '';

        return `
            <div class="person-card ${precisionClass}" data-id="${escapeHtml(person.key)}" data-name="${name}">
                <div class="person-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
                <div class="person-info">
                    <div class="person-name" title="${name}"><button type="button" class="person-filter-btn" data-id="${escapeHtml(person.key)}" title="Briefe von ${name} anzeigen">${name}</button>${wikidataIndicator}</div>
                    <div class="person-stats">
                        <span><i class="fas fa-paper-plane" aria-hidden="true"></i> ${person.sent} gesendet</span>
                        <span><i class="fas fa-inbox" aria-hidden="true"></i> ${person.received} empfangen</span>
                        ${person.isOrganization ? '<span class="person-kind">Körperschaft</span>' : ''}
                        ${!person.id && person.precision !== 'unknown' ? '<span class="person-kind">ohne Normdatensatz</span>' : ''}
                    </div>
                </div>
                <div class="person-actions">
                    <button type="button" class="btn-person-basket" data-person-id="${escapeHtml(person.key)}"
                            title="Person zum Korb hinzufügen" aria-label="${name} zum Korb hinzufügen">
                        <i class="fas fa-star" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="btn-person-info" data-person-id="${escapeHtml(person.key)}"
                            title="Details anzeigen" aria-label="Details zu ${name}">
                        <i class="fas fa-info-circle" aria-hidden="true"></i>
                    </button>
                    ${correspSearchUrl ? `
                        <a href="${escapeHtml(correspSearchUrl)}" target="_blank" rel="noopener noreferrer" class="btn-correspsearch"
                           title="Weitere Briefe bei correspSearch suchen" aria-label="${name} bei correspSearch suchen">
                            <i class="fas fa-search" aria-hidden="true"></i>
                        </a>
                    ` : ''}
                    <div class="person-count" title="${total.toLocaleString('de-DE')} ${total === 1 ? 'Brief' : 'Briefe'}">${total.toLocaleString('de-DE')}</div>
                </div>
            </div>
        `;
    }).join('');

    const filterTo = (personId) => {
        if (personId) deps.showLettersOfPerson(personId);
    };

    // The name button is the keyboard control; a click on the card surface does the same
    container.querySelectorAll('.person-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            filterTo(card.dataset.id);
        });
    });
    container.querySelectorAll('.person-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterTo(btn.dataset.id));
    });

    container.querySelectorAll('.btn-person-info').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.dataset.personId) showPersonDetail(btn.dataset.personId);
        });
    });

    container.querySelectorAll('.btn-person-basket').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = btn.dataset.personId;
            if (!personId) return;
            showToast(addEntityToBasket('persons', personId));
        });
    });
}

/**
 * What the loaded letters say about one correspondent: counts, period, counterparts and sending
 * places, from all letters regardless of the active filter.
 */
function personFacts(key) {
    const counterparts = new Map();
    const places = new Map();
    const years = [];
    let sent = 0;
    let received = 0;
    let withoutYear = 0;
    const bump = (map, name) => { if (name) map.set(name, (map.get(name) || 0) + 1); };
    for (const letter of deps.getAllLetters()) {
        const recipients = letterRecipients(letter);
        const isSender = personKey(letter.sender) === key;
        const isRecipient = recipients.some(r => personKey(r) === key);
        if (!isSender && !isRecipient) continue;
        if (letter.year) years.push(letter.year); else withoutYear++;
        if (isSender) {
            sent++;
            recipients.forEach(r => bump(counterparts, r.name));
            bump(places, letter.place_sent?.name);
        }
        if (isRecipient) {
            received++;
            if (!isSender) bump(counterparts, letter.sender?.name);
        }
    }
    const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    return {
        sent, received, withoutYear,
        period: years.length ? [Math.min(...years), Math.max(...years)] : null,
        counterparts: top(counterparts, 5),
        places: top(places, 5)
    };
}

// Counts opened person dialogs, so a Wikidata answer for an earlier person is dropped
let personDetailRequest = 0;

// Show person detail modal. Wikidata is queried only on an explicit click (ADR-006),
// enrichment already consented to during upload is read from sessionStorage.
function showPersonDetail(personId) {
    // Parser indices are keyed with personKey, the HSA index with the VIAF id
    const persons = deps.getDataIndices().persons || {};
    let person = persons[personId];
    if (!person) {
        person = Object.values(persons).find(p =>
            p.viaf === personId || p.id === personId || p.name === personId
        );
    }
    if (!person) return;

    const modal = elements.getById('person-modal');
    const title = elements.getById('person-modal-title');
    const body = elements.getById('person-modal-body');
    if (!modal || !body) return;

    const ref = personAuthority(person);
    const authority = ref?.authority || null;
    const authorityId = ref?.id || null;
    const canEnrich = Boolean(ref && ['gnd', 'viaf'].includes(authority));

    let cached = null;
    if (canEnrich) {
        try {
            cached = JSON.parse(sessionStorage.getItem('person-enrichment') || '{}')[authorityId] || null;
        } catch {
            // Unreadable cache: the dialog offers the explicit Wikidata request instead
        }
    }

    const request = ++personDetailRequest;
    const detail = { person, personId, authority, authorityId, canEnrich, modal, body, request };
    title.textContent = person.name;
    renderPersonDetail(detail, cached);
    openModal(modal);
}

async function loadPersonEnrichment(detail, button) {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lade Daten von Wikidata...';
    let enriched = null;
    let failed = false;
    try {
        enriched = await enrichPerson(detail.authority, detail.authorityId);
    } catch (error) {
        // enrichPerson throws only when the request fails; null means Wikidata has no entry
        failed = true;
        console.warn('Wikidata request failed:', error);
    }
    if (detail.request !== personDetailRequest) return;
    if (enriched) {
        renderPersonDetail(detail, enriched);
    } else {
        const status = failed
            ? 'Wikidata nicht erreichbar. Bitte später erneut versuchen.'
            : 'Kein Wikidata-Eintrag gefunden.';
        button.outerHTML = `<p class="person-enrich-status" tabindex="-1">${status}</p>`;
    }
    // The clicked button is gone after re-rendering; keep keyboard focus inside the dialog
    (detail.body.querySelector('.person-enrich-status') || detail.modal.querySelector('.modal-close'))?.focus();
}

function renderPersonDetail(detail, enriched) {
    const { person, personId, authority, authorityId, canEnrich, modal, body } = detail;

    let html = '<div class="person-detail">';

    html += '<div class="person-detail-header">';
    if (enriched?.thumbnail && safeUrl(enriched.thumbnail)) {
        html += `<img class="person-detail-image" src="${escapeHtml(safeUrl(enriched.thumbnail))}" alt="${escapeHtml(person.name)}">`;
    } else {
        html += `<div class="person-detail-avatar" aria-hidden="true">${escapeHtml(getPersonInitials(person.name, person.precision))}</div>`;
    }
    html += '<div class="person-detail-info">';
    // The dialog title carries the name; a second heading repeats it only for a differing Wikidata name
    if (enriched?.name && enriched.name !== person.name) html += `<h3>${escapeHtml(enriched.name)}</h3>`;

    if (enriched) {
        html += `<div class="wikidata-badge" title="Daten angereichert via Wikidata">
            <svg class="wikidata-logo" viewBox="0 0 30 20" width="16" height="11" aria-hidden="true">
                <rect fill="#990000" width="6" height="20"/>
                <rect fill="#339966" x="8" width="6" height="20"/>
                <rect fill="#006699" x="16" width="6" height="20"/>
            </svg>
            <span>Wikidata</span>
        </div>`;
        if (enriched.description) {
            html += `<div class="person-description">${escapeHtml(enriched.description)}</div>`;
        }
        const lifeDates = formatLifeDates(enriched);
        const places = formatPlaces(enriched);
        if (lifeDates) {
            html += `<div class="person-life-dates"><i class="fas fa-calendar" aria-hidden="true"></i> ${escapeHtml(lifeDates)}</div>`;
        }
        if (places) {
            html += `<div class="person-places"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${escapeHtml(places)}</div>`;
        }
        if (enriched.professions?.length > 0) {
            html += `<div class="person-professions"><i class="fas fa-briefcase" aria-hidden="true"></i> ${escapeHtml(enriched.professions.slice(0, 3).join(', '))}</div>`;
        }
    } else if (canEnrich) {
        html += `<button type="button" class="btn btn-secondary person-enrich-btn">
            <i class="fas fa-cloud-download-alt" aria-hidden="true"></i> Lebensdaten von Wikidata laden
        </button>`;
    }
    html += '</div></div>';

    // Facts from the loaded letters come first; they need no external service
    const facts = personFacts(personId);
    const listed = entries => entries.map(([name, count]) => `${escapeHtml(name)} (${count.toLocaleString('de-DE')})`).join(', ');
    html += '<div class="person-detail-section">';
    html += '<h4>Im Datensatz</h4>';
    html += detailRow('Briefe', `${facts.sent.toLocaleString('de-DE')} gesendet, ${facts.received.toLocaleString('de-DE')} empfangen`);
    if (facts.period) {
        const span = facts.period[0] === facts.period[1] ? String(facts.period[0]) : `${facts.period[0]} bis ${facts.period[1]}`;
        html += detailRow('Zeitraum', facts.withoutYear ? `${span}, dazu ${facts.withoutYear.toLocaleString('de-DE')} ohne Jahr auf der Zeitachse` : span);
    }
    if (facts.counterparts.length) html += detailRow('Häufigste Gegenüber', listed(facts.counterparts));
    if (facts.places.length) html += detailRow('Absendeorte', listed(facts.places));
    html += detailRow('Nachweis', person.isOrganization
        ? (authorityId ? 'Körperschaft mit Normdatensatz' : 'Körperschaft ohne Normdatensatz')
        : (authorityId ? 'Person mit Normdatensatz' : 'ohne Normdatensatz, nur mit Namen verzeichnet'));
    html += '</div>';

    const authorityHref = authorityUrl(authority, authorityId);
    if (enriched) {
        const externalLinks = buildExternalLinks(enriched);
        if (externalLinks) {
            html += '<div class="person-detail-section">';
            html += '<h4>Externe Links</h4>';
            html += `<div class="person-detail-links">${externalLinks}</div>`;
            html += '</div>';
        }
    } else if (authorityHref) {
        html += '<div class="person-detail-section">';
        html += '<h4>Externe Links</h4>';
        html += `<div class="person-detail-links"><a href="${escapeHtml(authorityHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(authority.toUpperCase())}</a></div>`;
        html += '</div>';
    }

    html += '<div class="person-detail-actions">';

    const correspSearchUrl = buildCorrespSearchUrl(person);
    if (correspSearchUrl) {
        html += `<a href="${escapeHtml(correspSearchUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            <i class="fas fa-search" aria-hidden="true"></i> Bei correspSearch suchen
        </a>`;
    }

    html += `<button type="button" class="btn btn-basket person-add-basket-btn">
        <i class="fas fa-star" aria-hidden="true"></i> Person zum Korb
    </button>`;

    html += `<button type="button" class="btn btn-secondary btn-filter-person" data-person-id="${escapeHtml(personId)}">
        <i class="fas fa-filter" aria-hidden="true"></i> Briefe filtern
    </button>`;

    html += '</div></div>';

    body.innerHTML = html;
    body.querySelector('.person-enrich-btn')?.addEventListener('click', (e) => {
        loadPersonEnrichment(detail, e.currentTarget);
    });
    body.querySelector('.btn-filter-person').addEventListener('click', (e) => {
        closeModal(modal);
        deps.showLettersOfPerson(e.currentTarget.dataset.personId);
    });
    body.querySelector('.person-add-basket-btn').addEventListener('click', () => {
        showToast(addEntityToBasket('persons', personId));
    });
}
