// Topics View - Extracted from explore.js
// Subject/Topic browsing and filtering

import { escapeHtml, debounce } from '../utils.js';
import { elements } from '../dom-cache.js';

// Module state
let subjectIndex = {};
let selectedSubjectId = null;
let topicsSearchTerm = '';
let topicsSortOrder = 'count-desc';

// Injected dependencies
let getFilteredLetters = null;
let getAllLetters = null;
let applySubjectFilter = null;
let log = null;

/**
 * Initialize topics view with dependencies
 */
export function initTopicsView(deps) {
    getFilteredLetters = deps.getFilteredLetters;
    getAllLetters = deps.getAllLetters;
    applySubjectFilter = deps.applySubjectFilter;
    log = deps.log || { init: () => {}, event: () => {} };

    // Build subject index from letters
    buildSubjectIndex();

    // Setup search and sort
    const searchInput = elements.getById('topic-search');
    const sortSelect = elements.getById('topic-sort');

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            topicsSearchTerm = e.target.value.toLowerCase();
            renderTopicsList();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            topicsSortOrder = e.target.value;
            renderTopicsList();
        });
    }

    // Setup filter button
    const filterBtn = elements.getById('topic-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (selectedSubjectId && applySubjectFilter) {
                applySubjectFilter(selectedSubjectId);
            }
        });
    }
}

/**
 * Build inverted index for subjects from all letters
 */
function buildSubjectIndex() {
    subjectIndex = {};
    const allLetters = getAllLetters();

    allLetters.forEach(letter => {
        if (!letter.mentions?.subjects) return;

        const letterSubjects = letter.mentions.subjects;
        const senderName = letter.sender?.name || 'Unbekannt';
        const senderId = letter.sender?.id || letter.sender?.name;
        const year = letter.year;

        letterSubjects.forEach(subject => {
            // Use uri as primary identifier, fallback to id, then label
            const subjectId = subject.uri || subject.id || subject.label;
            const subjectLabel = subject.label;

            if (!subjectIndex[subjectId]) {
                subjectIndex[subjectId] = {
                    id: subjectId,
                    label: subjectLabel,
                    count: 0,
                    letterIds: [],
                    persons: {},
                    years: {},
                    cooccurrence: {}
                };
            }

            subjectIndex[subjectId].count++;
            subjectIndex[subjectId].letterIds.push(letter.id);

            // Track persons
            if (senderId) {
                if (!subjectIndex[subjectId].persons[senderId]) {
                    subjectIndex[subjectId].persons[senderId] = { name: senderName, count: 0 };
                }
                subjectIndex[subjectId].persons[senderId].count++;
            }

            // Track years
            if (year) {
                subjectIndex[subjectId].years[year] = (subjectIndex[subjectId].years[year] || 0) + 1;
            }

            // Track co-occurrence with other subjects in same letter
            letterSubjects.forEach(otherSubject => {
                const otherId = otherSubject.uri || otherSubject.id || otherSubject.label;
                if (otherId !== subjectId) {
                    subjectIndex[subjectId].cooccurrence[otherId] =
                        (subjectIndex[subjectId].cooccurrence[otherId] || 0) + 1;
                }
            });
        });
    });

    log.init(`Subject index built: ${Object.keys(subjectIndex).length} subjects`);
}

/**
 * Render the topics list
 */
export function renderTopicsList() {
    const container = elements.topicsList;
    if (!container) return;

    const filteredLetters = getFilteredLetters();

    // Build dynamic topic counts based on filtered letters
    const filteredTopicCounts = {};
    filteredLetters.forEach(letter => {
        if (!letter.mentions?.subjects) return;
        letter.mentions.subjects.forEach(subject => {
            const subjectId = subject.uri || subject.id || subject.label;
            if (!filteredTopicCounts[subjectId]) {
                filteredTopicCounts[subjectId] = 0;
            }
            filteredTopicCounts[subjectId]++;
        });
    });

    // Create topics array with filtered counts
    let topics = Object.values(subjectIndex)
        .map(topic => ({
            ...topic,
            filteredCount: filteredTopicCounts[topic.id] || 0
        }))
        .filter(t => t.filteredCount > 0); // Only show topics with matches in filtered letters

    // Filter by search
    if (topicsSearchTerm) {
        topics = topics.filter(t =>
            t.label.toLowerCase().includes(topicsSearchTerm)
        );
    }

    // Sort (use filteredCount instead of count)
    topics.sort((a, b) => {
        switch (topicsSortOrder) {
            case 'count-desc': return b.filteredCount - a.filteredCount;
            case 'count-asc': return a.filteredCount - b.filteredCount;
            case 'name-asc': return a.label.localeCompare(b.label);
            default: return 0;
        }
    });

    // Find max count for bar scaling (use filteredCount)
    const maxCount = topics.length > 0 ? Math.max(...topics.map(t => t.filteredCount)) : 1;

    if (topics.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <p>Keine Themen gefunden</p>
            </div>
        `;
        return;
    }

    container.innerHTML = topics.map(topic => {
        const barWidth = (topic.filteredCount / maxCount) * 100;
        const isActive = selectedSubjectId === topic.id;

        return `
            <div class="entity-card ${isActive ? 'active' : ''}" data-id="${escapeHtml(topic.id)}">
                <div class="entity-card-info">
                    <div class="entity-card-name" title="${escapeHtml(topic.label)}">${escapeHtml(topic.label)}</div>
                    <div class="entity-card-bar">
                        <div class="entity-card-bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                </div>
                <div class="entity-card-count">${topic.filteredCount}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.entity-card').forEach(card => {
        card.addEventListener('click', () => {
            const topicId = card.dataset.id;
            selectTopic(topicId);

            // Update active state
            container.querySelectorAll('.entity-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
}

/**
 * Select a topic and show its details
 */
function selectTopic(topicId) {
    selectedSubjectId = topicId;
    const topic = subjectIndex[topicId];
    if (!topic) return;

    const filteredLetters = getFilteredLetters();

    // Calculate filtered data for this topic
    const filteredTopicLetters = filteredLetters.filter(letter => {
        const subjects = letter.mentions?.subjects || [];
        return subjects.some(s => (s.uri || s.id || s.label) === topicId);
    });

    const filteredCount = filteredTopicLetters.length;

    // Build filtered correspondents
    const filteredPersons = {};
    filteredTopicLetters.forEach(letter => {
        const senderId = letter.sender?.id || letter.sender?.name;
        const senderName = letter.sender?.name || 'Unbekannt';
        if (senderId) {
            if (!filteredPersons[senderId]) {
                filteredPersons[senderId] = { name: senderName, count: 0 };
            }
            filteredPersons[senderId].count++;
        }
    });

    // Build filtered years
    const filteredYears = {};
    filteredTopicLetters.forEach(letter => {
        if (letter.year) {
            filteredYears[letter.year] = (filteredYears[letter.year] || 0) + 1;
        }
    });

    // Build filtered cooccurrence
    const filteredCooccurrence = {};
    filteredTopicLetters.forEach(letter => {
        const subjects = letter.mentions?.subjects || [];
        subjects.forEach(s => {
            const otherId = s.uri || s.id || s.label;
            if (otherId !== topicId) {
                filteredCooccurrence[otherId] = (filteredCooccurrence[otherId] || 0) + 1;
            }
        });
    });

    const emptyState = elements.getById('topic-detail-empty');
    const content = elements.getById('topic-detail-content');
    const title = elements.getById('topic-detail-title');
    const count = elements.getById('topic-detail-count');
    const correspondents = elements.getById('topic-correspondents');
    const timeline = elements.getById('topic-timeline');
    const related = elements.getById('topic-related');
    const filterBtn = elements.getById('topic-filter-btn');

    if (emptyState) emptyState.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    // Title and count (show filtered count)
    if (title) title.textContent = topic.label;
    if (count) count.textContent = `${filteredCount} Briefe`;

    // Update filter button text
    if (filterBtn) {
        filterBtn.innerHTML = `<i class="fas fa-filter"></i> ${filteredCount} Briefe filtern`;
    }

    // Correspondents (top 10, from filtered data)
    if (correspondents) {
        const persons = Object.entries(filteredPersons)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const maxPersonCount = persons.length > 0 ? persons[0].count : 1;

        correspondents.innerHTML = persons.map(person => {
            const barWidth = (person.count / maxPersonCount) * 100;
            return `
                <div class="entity-stat-row">
                    <span class="entity-stat-name">${escapeHtml(person.name)}</span>
                    <span class="entity-stat-count">${person.count}</span>
                    <div class="entity-stat-bar">
                        <div class="entity-stat-bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        if (persons.length === 0) {
            correspondents.innerHTML = '<p style="color: var(--color-text-light); font-size: var(--font-size-sm);">Keine Korrespondenten</p>';
        }
    }

    // Mini timeline (from filtered data)
    if (timeline) {
        const years = Object.entries(filteredYears)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => a.year - b.year);

        if (years.length > 0) {
            const minYear = years[0].year;
            const maxYear = years[years.length - 1].year;

            // Fill gaps
            const allYears = [];
            for (let y = minYear; y <= maxYear; y++) {
                const found = years.find(yr => yr.year === y);
                allYears.push({ year: y, count: found ? found.count : 0 });
            }

            // Limit to ~30 bars max
            let displayYears = allYears;
            if (allYears.length > 30) {
                // Group by 5-year periods
                const grouped = {};
                allYears.forEach(y => {
                    const period = Math.floor(y.year / 5) * 5;
                    grouped[period] = (grouped[period] || 0) + y.count;
                });
                displayYears = Object.entries(grouped)
                    .map(([year, count]) => ({ year: parseInt(year), count }))
                    .sort((a, b) => a.year - b.year);
            }

            const displayMax = Math.max(...displayYears.map(y => y.count));

            timeline.innerHTML = displayYears.map(y => {
                const height = y.count > 0 ? Math.max(4, (y.count / displayMax) * 100) : 0;
                return `<div class="entity-mini-timeline-bar" style="height: ${height}%" title="${y.year}: ${y.count}"></div>`;
            }).join('');
        } else {
            timeline.innerHTML = '<p style="color: var(--color-text-light); font-size: var(--font-size-sm);">Keine Jahresdaten</p>';
        }
    }

    // Related topics (co-occurrence from filtered data)
    if (related) {
        const relatedTopics = Object.entries(filteredCooccurrence)
            .map(([id, count]) => {
                const relatedTopic = subjectIndex[id];
                return {
                    id,
                    label: relatedTopic?.label || id,
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        related.innerHTML = relatedTopics.map(rt => `
            <span class="entity-tag" data-id="${escapeHtml(rt.id)}">
                ${escapeHtml(rt.label)} (${rt.count})
            </span>
        `).join('');

        // Add click handlers to related tags
        related.querySelectorAll('.entity-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const relatedId = tag.dataset.id;
                selectTopic(relatedId);
                // Update list selection
                const container = elements.topicsList;
                container?.querySelectorAll('.entity-card').forEach(c => {
                    c.classList.toggle('active', c.dataset.id === relatedId);
                });
            });
        });

        if (relatedTopics.length === 0) {
            related.innerHTML = '<p style="color: var(--color-text-light); font-size: var(--font-size-sm);">Keine verwandten Themen</p>';
        }
    }
}

/**
 * Get the subject index
 */
export function getSubjectIndex() {
    return subjectIndex;
}

/**
 * Get the currently selected subject ID
 */
export function getSelectedSubjectId() {
    return selectedSubjectId;
}

/**
 * Set the selected subject ID (for external control)
 */
export function setSelectedSubjectId(id) {
    selectedSubjectId = id;
}

/**
 * Rebuild the subject index (call after data changes)
 */
export function rebuildSubjectIndex() {
    buildSubjectIndex();
}

/**
 * Reset topics view state
 */
export function resetTopicsState() {
    selectedSubjectId = null;
    topicsSearchTerm = '';
    topicsSortOrder = 'count-desc';

    const emptyState = elements.getById('topic-detail-empty');
    const content = elements.getById('topic-detail-content');
    if (emptyState) emptyState.classList.remove('hidden');
    if (content) content.classList.add('hidden');
}
