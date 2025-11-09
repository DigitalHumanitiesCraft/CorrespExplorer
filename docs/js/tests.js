// HerData Test Dashboard
// Loads and visualizes test results from pytest-json-report

import { loadNavbar } from "./navbar-loader.js";
import { loadPersons } from "./data.js";

let testResults = null;
let personsData = null;

async function init() {
    await loadNavbar('tests');
    await loadTestResults();
    await loadCoverageData();
}

async function loadTestResults() {
    const loading = document.getElementById('loading');

    try {
        const response = await fetch('data/tests/latest.json');
        if (!response.ok) {
            throw new Error('Test results not found');
        }

        testResults = await response.json();

        loading.style.display = 'none';
        renderTestSummary();
        renderTestDetails();

    } catch (error) {
        console.error('Error loading test results:', error);
        loading.innerHTML = `
            <div style="color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                Test-Ergebnisse konnten nicht geladen werden.
                <br><br>
                <small>Führe zuerst Tests aus: <code>pytest tests/ --json-report --json-report-file=docs/data/tests/latest.json</code></small>
            </div>
        `;
    }
}

async function loadCoverageData() {
    try {
        const data = await loadPersons();
        personsData = data;

        document.getElementById('coverage-stats').style.display = 'block';
        renderCoverageStats();

    } catch (error) {
        console.error('Error loading coverage data:', error);
    }
}

function renderTestSummary() {
    const summary = testResults.summary;

    // Update summary cards
    document.getElementById('tests-passed').textContent = summary.passed;
    document.getElementById('tests-failed').textContent = summary.failed;
    document.getElementById('tests-total').textContent = summary.total;
    document.getElementById('tests-duration').textContent = formatDuration(testResults.duration);

    // Calculate success rate
    const successRate = (summary.passed / summary.total * 100).toFixed(1);
    document.getElementById('success-percentage').textContent = `${successRate}%`;

    // Update success rate bar
    const successFill = document.getElementById('success-rate-fill');
    successFill.style.width = `${successRate}%`;

    // Show summary
    document.getElementById('test-summary').style.display = 'block';
}

function renderTestDetails() {
    const tests = testResults.tests || [];

    const passedTests = tests.filter(t => t.outcome === 'passed');
    const failedTests = tests.filter(t => t.outcome === 'failed');

    // Render failed tests
    if (failedTests.length > 0) {
        const failedContainer = document.getElementById('failed-tests-container');
        const failedList = document.getElementById('failed-tests-list');

        failedList.innerHTML = failedTests.map(test => renderTestItem(test, 'failed')).join('');
        failedContainer.style.display = 'block';
    }

    // Render passed tests
    if (passedTests.length > 0) {
        const passedContainer = document.getElementById('passed-tests-container');
        const passedList = document.getElementById('passed-tests-list');

        passedList.innerHTML = passedTests.map(test => renderTestItem(test, 'passed')).join('');
        passedContainer.style.display = 'block';

        // Toggle button for passed tests
        const toggleButton = document.getElementById('toggle-passed-tests');
        toggleButton.addEventListener('click', () => {
            passedList.classList.toggle('collapsed');
            toggleButton.classList.toggle('rotated');
        });
    }

    document.getElementById('test-details').style.display = 'block';
}

function renderTestItem(test, outcome) {
    const icon = outcome === 'passed'
        ? '<i class="fas fa-check-circle"></i>'
        : '<i class="fas fa-times-circle"></i>';

    const testName = extractTestName(test.nodeid);
    const testPath = test.nodeid;

    let errorHtml = '';
    if (outcome === 'failed' && test.call?.longrepr) {
        const errorText = extractErrorMessage(test.call.longrepr);
        errorHtml = `<div class="test-error">${escapeHtml(errorText)}</div>`;
    }

    return `
        <div class="test-item ${outcome}">
            <div class="test-icon">${icon}</div>
            <div class="test-info">
                <div class="test-name">${testName}</div>
                <div class="test-path">${testPath}</div>
                ${errorHtml}
            </div>
        </div>
    `;
}

function renderCoverageStats() {
    if (!personsData) return;

    const meta = personsData.meta;
    const persons = personsData.persons;
    const total = persons.length;

    // Total persons
    document.getElementById('coverage-total').textContent = total;

    // GND coverage
    const withGnd = persons.filter(p => p.gnd).length;
    setCoverageValue('gnd', withGnd, total);

    // Dates coverage
    const withDates = persons.filter(p => p.dates).length;
    setCoverageValue('dates', withDates, total);

    // Geodata coverage
    const withGeodata = persons.filter(p => p.places && p.places.length > 0).length;
    setCoverageValue('geodata', withGeodata, total);

    // Occupations coverage
    const withOccupations = persons.filter(p => p.occupations && p.occupations.length > 0).length;
    setCoverageValue('occupations', withOccupations, total);

    // Relationships coverage
    const withRelationships = persons.filter(p => p.relationships && p.relationships.length > 0).length;
    setCoverageValue('relationships', withRelationships, total);

    // Biography coverage
    const withBiography = persons.filter(p => p.biography).length;
    setCoverageValue('biography', withBiography, total);

    // Correspondence coverage
    const withCorrespondence = persons.filter(p => p.correspondence && p.correspondence.length > 0).length;
    setCoverageValue('correspondence', withCorrespondence, total);
}

function setCoverageValue(key, count, total) {
    const percentage = (count / total * 100).toFixed(1);

    document.getElementById(`coverage-${key}`).textContent = `${count} (${percentage}%)`;

    const bar = document.getElementById(`coverage-${key}-bar`);
    if (bar) {
        bar.style.width = `${percentage}%`;
    }
}

function extractTestName(nodeid) {
    // Extract test function name from nodeid
    // Example: "tests/test_data_quality.py::test_no_duplicate_ids" -> "test_no_duplicate_ids"
    const parts = nodeid.split('::');
    return parts[parts.length - 1] || nodeid;
}

function extractErrorMessage(longrepr) {
    // longrepr can be a string or object
    if (typeof longrepr === 'string') {
        // Extract assertion error message
        const lines = longrepr.split('\n');
        const assertionIndex = lines.findIndex(line => line.includes('AssertionError:'));

        if (assertionIndex !== -1) {
            // Return assertion message and a few context lines
            return lines.slice(assertionIndex, assertionIndex + 10).join('\n');
        }

        // Return last 10 lines if no assertion found
        return lines.slice(-10).join('\n');
    }

    return 'Error details not available';
}

function formatDuration(seconds) {
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)}ms`;
    } else if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    } else {
        const minutes = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(0);
        return `${minutes}m ${secs}s`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
