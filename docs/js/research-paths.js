// Research paths of the overview (US-33, ADR-004): which questions the loaded letters can answer,
// with a preview, a multi-step path through the views and, for questions the data cannot answer
// yet, the CMIF element whose enrichment would make them answerable (ADR-005).
//
// All figures are counted from the letters via personKey and placeKey (ADR-001), because the
// index shapes differ between the CMIF parser (letter_count, {label, letter_count}) and the
// preprocessed HSA JSON (letters_sent/letters_received, language strings, subjects with count).

import { personKey, placeKey, escapeHtml, isKnownPlace } from './utils.js';
import { languageLabel } from './constants.js';

const PREVIEW_SIZE = 3;

function topEntries(map, n = PREVIEW_SIZE) {
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, n);
}

function bump(map, key, init) {
    if (!map.has(key)) map.set(key, { ...init, count: 0 });
    const entry = map.get(key);
    entry.count++;
    return entry;
}

/**
 * Persons, places, subjects, languages, dates and mentions of a letter list.
 * A place counts as located when its letter or its index entry carries coordinates.
 * @param {Array} letters
 * @param {Object} [indices] - data indices, only read for place coordinates
 * @returns {Object} Maps keyed by personKey, placeKey, subject URI or label and language code
 */
export function summarizeCorpus(letters, indices = {}) {
    const persons = new Map();
    const places = new Map();
    const subjects = new Map();
    const languages = new Map();
    const mentioned = new Map();
    const yearCounts = new Map();
    let datedLetters = 0;
    let lettersWithMentions = 0;
    let personMentions = 0;

    for (const letter of letters) {
        // A person seen once with and once without authority id stays two keys (ADR-001)
        for (const person of [letter.sender, letter.recipient]) {
            const key = personKey(person);
            if (!key) continue;
            bump(persons, key, { key, name: person.name || key, identified: Boolean(person.id) });
        }

        // A placeholder for an unknown place is no place, as in the sidebar and comparison counts
        const placeId = isKnownPlace(letter.place_sent) ? placeKey(letter.place_sent) : null;
        if (placeId) {
            const entry = bump(places, placeId, { key: placeId, name: letter.place_sent.name || placeId, located: false });
            const indexed = indices.places?.[placeId];
            if ((letter.place_sent.lat && letter.place_sent.lon) || (indexed?.lat && indexed?.lon)) {
                entry.located = true;
            }
        }

        for (const subject of letter.mentions?.subjects || []) {
            const key = subject.uri || subject.id || subject.label;
            if (key) bump(subjects, key, { key, name: subject.label || key });
        }

        const code = letter.language?.code;
        if (code) bump(languages, code, { key: code, name: languageLabel(code) });

        if (letter.year !== null && letter.year !== undefined) {
            datedLetters++;
            bump(yearCounts, letter.year, { key: letter.year, name: String(letter.year) });
        }

        const mentionedPersons = letter.mentions?.persons || [];
        if (mentionedPersons.length > 0) {
            lettersWithMentions++;
            personMentions += mentionedPersons.length;
            for (const person of mentionedPersons) {
                const key = personKey(person);
                if (key) bump(mentioned, key, { key, name: person.name || key });
            }
        }
    }

    return { total: letters.length, persons, places, subjects, languages, mentioned, yearCounts, datedLetters, lettersWithMentions, personMentions };
}

const preview = (entries, suffix = '') => entries.map(e => `${e.name} (${e.count}${suffix})`);

/**
 * Research questions for a letter list, grouped by epistemic category (ADR-004):
 * descriptive, analytical, interpretive, and unavailable for questions the data cannot answer yet.
 * @param {Array} letters
 * @param {Object} [indices]
 * @returns {Array<{id, category, icon, question, description, preview?, path?, missingData?, suggestion?}>}
 */
export function analyzeResearchQuestions(letters, indices = {}) {
    if (!Array.isArray(letters) || letters.length === 0) return [];

    const s = summarizeCorpus(letters, indices);
    const personCount = s.persons.size;
    const identifiedCount = [...s.persons.values()].filter(p => p.identified).length;
    const placeCount = s.places.size;
    const locatedCount = [...s.places.values()].filter(p => p.located).length;
    const questions = [];

    // Descriptive: what is in the corpus
    if (personCount > 0) {
        questions.push({
            category: 'descriptive',
            icon: 'fa-users',
            question: 'Wer sind die aktivsten Korrespondenten?',
            description: `${personCount.toLocaleString('de-DE')} Personen als Absender oder Empfänger`,
            preview: preview(topEntries(s.persons)),
            path: [{ view: 'persons', label: 'Korrespondenten', action: 'nach Briefanzahl sortieren' }]
        });
    }

    if (placeCount > 0) {
        questions.push({
            category: 'descriptive',
            icon: 'fa-map-marker-alt',
            question: 'Von welchen Orten wurde korrespondiert?',
            description: `${placeCount.toLocaleString('de-DE')} Absendeorte, ${locatedCount.toLocaleString('de-DE')} mit Koordinaten`,
            preview: preview(topEntries(s.places)),
            path: [
                { view: 'places', label: 'Orte', action: 'Liste durchsuchen' },
                ...(locatedCount > 0 ? [{ view: 'map', label: 'Karte', action: 'geografische Verteilung' }] : [])
            ]
        });
    }

    if (s.subjects.size > 0) {
        questions.push({
            category: 'descriptive',
            icon: 'fa-tags',
            question: 'Welche Themen dominieren die Korrespondenz?',
            description: `${s.subjects.size.toLocaleString('de-DE')} verschiedene Themen`,
            preview: preview(topEntries(s.subjects)),
            path: [{ view: 'topics', label: 'Themen', action: 'Thema auswählen und zum Korb' }]
        });
    }

    if (s.languages.size > 1) {
        questions.push({
            category: 'descriptive',
            icon: 'fa-language',
            question: 'In welchen Sprachen wurde korrespondiert?',
            description: `${s.languages.size} Sprachen im Korpus`,
            preview: preview(topEntries(s.languages)),
            path: [{ view: 'timeline', label: 'Timeline', action: 'Sprachen in der Farblegende' }]
        });
    }

    // Analytical: patterns that need aggregation
    if (s.datedLetters > 0) {
        const years = [...s.yearCounts.keys()];
        questions.push({
            category: 'analytical',
            icon: 'fa-chart-line',
            question: 'Wie entwickelt sich die Korrespondenzfrequenz über die Zeit?',
            description: `Zeitraum ${Math.min(...years)}–${Math.max(...years)}, ${s.datedLetters.toLocaleString('de-DE')} datierte Briefe`,
            preview: preview(topEntries(s.yearCounts)),
            path: [
                { view: 'activity', label: 'Aktivität', action: 'Heatmap auf Muster prüfen' },
                { view: 'timeline', label: 'Timeline', action: 'jährliche Verteilung' }
            ]
        });
    }

    if (personCount >= 5) {
        const ranked = topEntries(s.persons, personCount);
        // One person in more than 60 % of the letters makes the corpus an ego network
        const isEgoNetwork = (ranked[0]?.count || 0) > s.total * 0.6;
        questions.push({
            category: 'analytical',
            icon: 'fa-project-diagram',
            question: isEgoNetwork
                ? 'Wie ist das Ego-Netzwerk um die zentrale Person strukturiert?'
                : 'Welche Cluster und Vermittler gibt es im Korrespondenznetzwerk?',
            description: isEgoNetwork
                ? `${ranked[0].name} ist an ${ranked[0].count.toLocaleString('de-DE')} von ${s.total.toLocaleString('de-DE')} Briefen beteiligt`
                : `${personCount.toLocaleString('de-DE')} Personen in Beziehung`,
            preview: preview(ranked.slice(0, PREVIEW_SIZE)),
            path: [
                { view: 'network', label: 'Netzwerk', action: 'Struktur erkunden' },
                { view: 'persons', label: 'Korrespondenten', action: 'Person auswählen' },
                { view: 'chronik', label: 'Chronik', action: 'Beziehungsverlauf' }
            ]
        });
    }

    if (locatedCount >= 3) {
        questions.push({
            category: 'analytical',
            icon: 'fa-map',
            question: 'Gibt es geografische Cluster in der Korrespondenz?',
            description: `${locatedCount.toLocaleString('de-DE')} Orte mit Koordinaten`,
            path: [
                { view: 'map', label: 'Karte', action: 'Cluster identifizieren' },
                { view: 'places', label: 'Orte', action: 'Ort auswählen und zum Korb' }
            ]
        });
    }

    if (s.lettersWithMentions > 0) {
        questions.push({
            category: 'analytical',
            icon: 'fa-stream',
            question: 'Wer wird in wessen Briefen erwähnt?',
            description: `${s.personMentions.toLocaleString('de-DE')} Personenerwähnungen in ${s.lettersWithMentions.toLocaleString('de-DE')} Briefen`,
            preview: preview(topEntries(s.mentioned), '×'),
            path: [
                { view: 'mentions-flow', label: 'Mentions Flow', action: 'Erwähnungsmuster' },
                { view: 'persons', label: 'Korrespondenten', action: 'Person filtern' }
            ]
        });
    }

    // Interpretive: answers need context beyond the metadata
    if (s.datedLetters > 0 && identifiedCount > 0) {
        questions.push({
            category: 'interpretive',
            icon: 'fa-scroll',
            question: 'Wie verändert sich die Korrespondenz im Lebensverlauf?',
            description: `Lebensdaten von Wikidata für ${identifiedCount.toLocaleString('de-DE')} Personen mit Normdaten-ID abrufbar`,
            path: [{ view: 'chronik', label: 'Chronik', action: 'Mit Wikidata anreichern' }]
        });
    }

    if (s.subjects.size > 0 && s.datedLetters > 0) {
        questions.push({
            category: 'interpretive',
            icon: 'fa-stream',
            question: 'Welche Themen dominieren in bestimmten Zeiträumen?',
            description: 'Zeitfilter und Themenansicht kombinieren',
            path: [{ view: 'topics', label: 'Themen', action: 'Thema wählen, dann Zeitraum setzen' }]
        });
    }

    if (personCount >= 2 && s.datedLetters > 0) {
        questions.push({
            category: 'interpretive',
            icon: 'fa-handshake',
            question: 'Wie entwickeln sich einzelne Briefbeziehungen?',
            description: 'Erster Brief, Frequenz und Dauer einer Korrespondenz',
            path: [
                { view: 'persons', label: 'Korrespondenten', action: 'Person wählen und filtern' },
                { view: 'activity', label: 'Aktivität', action: 'Aktivitätsmuster der Person' }
            ]
        });
    }

    // Unavailable: the element whose enrichment would open the question (ADR-005)
    if (placeCount > 0 && locatedCount === 0) {
        questions.push({
            category: 'unavailable',
            icon: 'fa-map-marked-alt',
            question: 'Wo wurde korrespondiert? (Karte)',
            description: `${placeCount.toLocaleString('de-DE')} Absendeorte, Koordinaten würden die Karte ermöglichen`,
            missingData: 'Koordinaten der Absendeorte',
            suggestion: 'GeoNames-URI in placeName/@ref der correspAction ergänzen, die Koordinaten liefert dann die Wikidata-Tabelle oder die Anreicherung beim Upload'
        });
    }

    if (s.datedLetters === 0) {
        questions.push({
            category: 'unavailable',
            icon: 'fa-calendar-times',
            question: 'Wie entwickelt sich die Korrespondenz zeitlich?',
            description: 'Datierungen würden Timeline und Aktivität ermöglichen',
            missingData: 'Datumsangaben',
            suggestion: 'correspAction/date mit @when, @from und @to oder @notBefore und @notAfter erfassen'
        });
    }

    if (personCount > 0 && identifiedCount === 0) {
        questions.push({
            category: 'unavailable',
            icon: 'fa-user-slash',
            question: 'Welche Lebensdaten haben die Korrespondenten?',
            description: `${personCount.toLocaleString('de-DE')} Personen, Normdaten-IDs würden die Wikidata-Anreicherung ermöglichen`,
            missingData: 'GND- oder VIAF-IDs',
            suggestion: 'GND- oder VIAF-URI in persName/@ref der correspAction ergänzen'
        });
    }

    if (s.lettersWithMentions === 0 && s.total > 10) {
        questions.push({
            category: 'unavailable',
            icon: 'fa-comment-slash',
            question: 'Wer wird in den Briefen erwähnt?',
            description: 'Erfasste Erwähnungen würden den Erwähnungsfluss ermöglichen',
            missingData: 'Erwähnte Personen',
            suggestion: 'note/ref[@type="mentionsPerson"] mit Normdaten-URI in @target in correspDesc erfassen'
        });
    }

    if (s.subjects.size === 0 && s.total > 10) {
        questions.push({
            category: 'unavailable',
            icon: 'fa-tags',
            question: 'Welche Themen werden behandelt?',
            description: 'Verschlagwortung würde die Themenansicht ermöglichen',
            missingData: 'Themen',
            suggestion: 'note/ref[@type="mentionsSubject"] mit Vokabular-URI in @target und Bezeichnung als Text in correspDesc erfassen'
        });
    }

    if (s.languages.size <= 1 && s.total > 10) {
        const [only] = s.languages.values();
        questions.push({
            category: 'unavailable',
            icon: 'fa-language',
            question: 'In welchen Sprachen wurde korrespondiert?',
            description: only
                ? `Eine Sprache erfasst (${only.name}), weitere Sprachangaben würden den Vergleich ermöglichen`
                : 'Sprachangaben würden Sprachfilter und Sprachfarben ermöglichen',
            missingData: 'Briefsprache',
            suggestion: 'note/ref[@type="hasLanguage"] mit ISO-639-Code oder Lexvo-URI in @target in correspDesc erfassen'
        });
    }

    questions.forEach((q, i) => { q.id = `q-${q.category}-${i}`; });
    return questions;
}

function renderPathSteps(path) {
    return path.map((step, i) => `
        <button type="button" class="path-step" data-view="${escapeHtml(step.view)}" data-step="${i}">
            <span class="path-step-header">
                <span class="path-step-num">${i + 1}</span>
                <span class="path-step-label">${escapeHtml(step.label)}</span>
            </span>
            <span class="path-step-action">${escapeHtml(step.action)}</span>
        </button>
        ${i < path.length - 1 ? '<span class="path-arrow" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>' : ''}
    `).join('');
}

function renderQuestionCard(q) {
    const previewHtml = q.preview?.length
        ? `<div class="question-preview"><span class="preview-label">Vorschau:</span> ${q.preview.map(p => `<span class="preview-item">${escapeHtml(p)}</span>`).join(' ')}</div>`
        : '';
    // The card is no button itself: path steps and the start button are its controls (no nesting)
    return `
        <div class="question-card question-${escapeHtml(q.category)}" data-question-id="${escapeHtml(q.id)}">
            <div class="question-icon" aria-hidden="true"><i class="fas ${escapeHtml(q.icon || 'fa-question')}"></i></div>
            <div class="question-content">
                <div class="question-text">${escapeHtml(q.question)}</div>
                <div class="question-description">${escapeHtml(q.description)}</div>
                ${previewHtml}
                <div class="question-path">${renderPathSteps(q.path)}</div>
            </div>
            <button type="button" class="question-start-btn" aria-label="Wissenspfad starten: ${escapeHtml(q.question)}" title="Wissenspfad starten">
                <i class="fas fa-play" aria-hidden="true"></i>
            </button>
        </div>
    `;
}

function renderEnrichmentCard(q) {
    return `
        <div class="question-card question-unavailable">
            <div class="question-icon" aria-hidden="true"><i class="fas ${escapeHtml(q.icon || 'fa-question')}"></i></div>
            <div class="question-content">
                <div class="question-text">${escapeHtml(q.question)}</div>
                <div class="question-description">${escapeHtml(q.description)}</div>
                <div class="question-fix"><i class="fas fa-plus-circle" aria-hidden="true"></i> ${escapeHtml(q.missingData)}: ${escapeHtml(q.suggestion)}</div>
            </div>
        </div>
    `;
}

/**
 * Render answerable questions as cards and the unavailable ones in a collapsed
 * "Anreicherungspotential" section.
 * @param {HTMLElement} container
 * @param {Array} paths - answerable questions to show
 * @param {Array} unavailable - questions the data cannot answer yet
 * @param {{onStartPath: Function, onStepClick: Function}} deps
 */
export function renderResearchPathCards(container, paths, unavailable, { onStartPath, onStepClick }) {
    const enrichment = unavailable.length > 0 ? `
        <details class="questions-enrichment">
            <summary>Anreicherungspotential (${unavailable.length})</summary>
            ${unavailable.map(renderEnrichmentCard).join('')}
        </details>
    ` : '';
    container.innerHTML = paths.map(renderQuestionCard).join('') + enrichment;

    container.querySelectorAll('.path-step').forEach(step => {
        step.addEventListener('click', (e) => {
            e.stopPropagation();
            if (step.dataset.view) onStepClick(step.dataset.view);
        });
    });

    const start = (card) => {
        const question = paths.find(q => q.id === card?.dataset.questionId);
        if (question) onStartPath(question);
    };
    container.querySelectorAll('.question-start-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            start(btn.closest('.question-card'));
        });
    });
    // A click on the card surface starts the path too; keyboard users use the start button
    container.querySelectorAll('.question-card[data-question-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button, a, summary')) return;
            start(card);
        });
    });
}

/**
 * Overview block: up to `limit` answerable paths, a button for the rest, enrichment potential.
 * @param {HTMLElement} container
 * @param {HTMLElement|null} showAllBtn
 * @param {Array} questions - result of analyzeResearchQuestions
 * @param {{onStartPath: Function, onStepClick: Function}} deps
 * @param {number} [limit]
 */
export function renderOverviewResearchPaths(container, showAllBtn, questions, deps, limit = 4) {
    const answerable = questions.filter(q => q.category !== 'unavailable' && q.path?.length);
    const unavailable = questions.filter(q => q.category === 'unavailable');

    if (answerable.length === 0 && unavailable.length === 0) {
        container.innerHTML = '<div class="questions-empty"><i class="fas fa-question-circle" aria-hidden="true"></i><p>Keine Forschungspfade verfügbar.</p></div>';
        showAllBtn?.classList.add('hidden');
        return;
    }

    renderResearchPathCards(container, answerable.slice(0, limit), unavailable, deps);

    if (!showAllBtn) return;
    if (answerable.length > limit) {
        showAllBtn.classList.remove('hidden');
        showAllBtn.innerHTML = `<i class="fas fa-list" aria-hidden="true"></i> Alle ${answerable.length} Pfade anzeigen`;
        showAllBtn.onclick = () => {
            renderResearchPathCards(container, answerable, unavailable, deps);
            showAllBtn.classList.add('hidden');
        };
    } else {
        showAllBtn.classList.add('hidden');
    }
}
