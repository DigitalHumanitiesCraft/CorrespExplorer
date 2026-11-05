// Test Suite: correspSearch
// Transformation of real API answers saved on 2026-11-05: data/test-correspsearch.json (d=1890-01-01,
// page 1) and data/test-correspsearch-empty.json (d=1066-01-01, no hits), CC BY 4.0 per their
// teiHeader. The suite sends no request to the service.

import { datasetFromPages, correspSearchShareUrl } from '../correspsearch-api.js';
import { assert } from './test-runner.js';

const FIXTURE = 'data/test-correspsearch.json';
const EMPTY_FIXTURE = 'data/test-correspsearch-empty.json';

async function loadPage(path = FIXTURE) {
    const response = await fetch(path);
    assert(response.ok, `${path} nicht ladbar (HTTP ${response.status})`);
    return response.json();
}

export const CorrespSearchTests = {
    name: 'correspSearch',

    tests: [
        {
            name: 'correspSearchShareUrl: Nur API-Abfragen von correspsearch.net gehen in den Link (E3)',
            async run() {
                const page = await loadPage();
                // The query this fixture answers, as the API names it in publicationStmt/idno
                const query = page.teiHeader.fileDesc.publicationStmt.idno.replace(/&amp;/g, '&');
                assert(correspSearchShareUrl({ type: 'correspsearch', source: query }) === query, `Abfrage nicht übernommen: ${query}`);
                assert(correspSearchShareUrl({ type: 'file', source: 'test-uncertainty.xml' }) === null, 'Upload trägt keine Abfrage');
                assert(correspSearchShareUrl({ type: 'url', source: 'data/demo-showcase.xml' }) === null, 'Gebündelte Datei ist keine Abfrage');
                assert(correspSearchShareUrl({ type: 'url', source: 'https://correspsearch.net.example.org/api/x' }) === null, 'Fremder Host darf nicht durch');
                assert(correspSearchShareUrl(null) === null, 'Ohne Quelle keine Abfrage');
            }
        },
        {
            name: 'datasetFromPages: Briefe, Herausgeber und Lizenz aus der API-Seite',
            async run() {
                const page = await loadPage();
                const data = datasetFromPages([page]);
                const raw = page.teiHeader.profileDesc.correspDesc.length;
                assert(data.letters.length === raw, `${data.letters.length} von ${raw} Briefen übernommen`);
                assert(data.meta.publishers.some(p => p.name.includes('Berlin-Brandenburg')), `Herausgeber: ${JSON.stringify(data.meta.publishers)}`);
                assert(data.meta.licence?.url === 'https://creativecommons.org/licenses/by/4.0/', `Lizenz: ${JSON.stringify(data.meta.licence)}`);
                assert(data.letters.every(l => l.datePrecision === 'range'), 'Die Seite trägt nur Zeitspannen (from/to, notBefore/notAfter)');
            }
        },
        {
            name: 'datasetFromPages: Abfrage ohne Treffer ist kein Datensatz',
            async run() {
                // Real answer of the API to d=1066-01-01, a date without letters in correspSearch
                const empty = await loadPage(EMPTY_FIXTURE);
                let message = '';
                try {
                    datasetFromPages([empty]);
                } catch (error) {
                    message = error.message;
                }
                assert(message.includes('liefert keine Briefe'), `Erwartet eine Fehlermeldung, erhalten: ${message || 'Datensatz'}`);
            }
        }
    ]
};
