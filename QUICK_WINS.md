# Quick Wins - Einfach zu implementierende Features

Konkrete Feature-Empfehlungen basierend auf REQUIREMENTS_VALIDATION.md und TECHNICAL_ANALYSIS.md, sortiert nach Aufwand.

Stand: 2025-11-02

## 1. CSV-Export (SEHR EINFACH)

Aufwand: 2-4 Stunden
Schwierigkeit: 1/10

### Was

US-1.5: Exportiere gefilterte Personen-Daten als CSV

### Warum einfach

1. Daten bereits in persons.json vorhanden
2. Nur clientseitiger JavaScript-Code nötig
3. Keine Backend-Änderungen
4. Keine Pipeline-Änderungen
5. Browser-API bereits verfügbar (Blob, URL.createObjectURL)

### Implementierung

Datei: docs/js/app.js

```javascript
// Add export button to sidebar
function addExportButton() {
    const sidebar = document.querySelector('.sidebar');
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Als CSV exportieren';
    exportBtn.id = 'export-csv';
    exportBtn.onclick = exportToCSV;
    sidebar.appendChild(exportBtn);
}

// Export filtered persons to CSV
function exportToCSV() {
    const headers = ['ID', 'Name', 'GND', 'Geburt', 'Tod', 'Rolle', 'Orte', 'Berufe'];

    const rows = filteredPersons.map(p => [
        p.id,
        p.name,
        p.gnd || '',
        p.dates?.birth || '',
        p.dates?.death || '',
        p.role,
        p.places?.map(pl => pl.name).join('; ') || '',
        p.occupations?.map(occ => occ.name).join('; ') || ''
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `herdata_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
```

HTML-Update (docs/index.html):
```html
<aside class="sidebar">
    <!-- Existing filters -->
    <button id="reset-filters">Alle zurücksetzen</button>
    <button id="export-csv">Als CSV exportieren</button> <!-- NEU -->
</aside>
```

### Testen

1. Filter setzen (z.B. nur Schriftstellerinnen)
2. CSV-Export klicken
3. Datei herdata_export_2025-11-02.csv downloaded
4. In Excel/LibreOffice öffnen
5. Validieren: Nur gefilterte Personen enthalten

### Nutzen

- Forscher können Daten in Excel/R weiterverarbeiten
- Zitationen einfacher
- Offline-Analysen möglich
- Erfüllt US-1.5 komplett

---

## 2. Vollständigkeits-Badges (SEHR EINFACH)

Aufwand: 3-5 Stunden
Schwierigkeit: 2/10

### Was

US-5.1: Zeige Vollständigkeitsindikatoren für jede Person

### Warum einfach

1. Alle Daten bereits in persons.json
2. Nur Berechnung + CSS
3. Keine neuen Datenquellen nötig
4. Kann auf Person-Detailseite hinzugefügt werden

### Implementierung

Datei: docs/js/person.js

```javascript
function calculateCompleteness(person) {
    const fields = {
        'id': 1,
        'name': 1,
        'gnd': person.gnd ? 1 : 0,
        'dates.birth': person.dates?.birth ? 1 : 0,
        'dates.death': person.dates?.death ? 1 : 0,
        'biography': person.biography ? 1 : 0,
        'places': person.places?.length > 0 ? 1 : 0,
        'occupations': person.occupations?.length > 0 ? 1 : 0
    };

    const total = Object.keys(fields).length;
    const filled = Object.values(fields).reduce((sum, val) => sum + val, 0);
    const percentage = Math.round((filled / total) * 100);

    return { percentage, filled, total, fields };
}

function renderCompletenessBadge(person) {
    const { percentage, filled, total } = calculateCompleteness(person);

    let color = '#dc3545'; // red
    if (percentage >= 75) color = '#28a745'; // green
    else if (percentage >= 50) color = '#ffc107'; // yellow

    const badge = `
        <div class="completeness-badge" style="background: ${color};">
            <strong>${percentage}%</strong> vollständig
            <small>${filled}/${total} Felder</small>
        </div>
    `;

    return badge;
}
```

CSS (docs/css/style.css):
```css
.completeness-badge {
    display: inline-block;
    padding: 8px 12px;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    margin: 10px 0;
}

.completeness-badge strong {
    display: block;
    font-size: 18px;
}

.completeness-badge small {
    font-size: 11px;
    opacity: 0.9;
}
```

Integration in person.html:
```html
<div class="person-header">
    <h1 id="person-name"></h1>
    <div id="completeness-badge"></div> <!-- NEU -->
</div>

<script>
    const badge = renderCompletenessBadge(person);
    document.getElementById('completeness-badge').innerHTML = badge;
</script>
```

### Nutzen

- Forscher sehen auf Blick Datenqualität
- Transparenz über Datenlücken
- Erfüllt US-5.1
- Hilft bei Quellenpriorisierung

---

## 3. Statistik-Dashboard (EINFACH)

Aufwand: 1-2 Tage
Schwierigkeit: 3/10

### Was

US-1.4: Dashboard mit Aggregat-Statistiken

### Warum einfach

1. Alle Daten bereits in persons.json vorhanden
2. Aggregation clientseitig mit JavaScript
3. Einfache Chart.js oder D3.js Visualisierungen
4. Keine Backend-Logik

### Implementierung

Neuer Tab in index.html:
```html
<div class="tabs">
    <button class="tab" data-tab="map">Karte</button>
    <button class="tab" data-tab="timeline">Zeit</button>
    <button class="tab" data-tab="network">Netz</button>
    <button class="tab" data-tab="stats">Statistik</button> <!-- NEU -->
</div>

<div id="stats-view" class="tab-content">
    <div class="stats-grid">
        <div class="stat-card">
            <h3>Berufsverteilung</h3>
            <canvas id="occupation-chart"></canvas>
        </div>
        <div class="stat-card">
            <h3>Ortskonzentrationen</h3>
            <canvas id="places-chart"></canvas>
        </div>
        <div class="stat-card">
            <h3>Zeitliche Verteilung</h3>
            <canvas id="birth-decade-chart"></canvas>
        </div>
        <div class="stat-card">
            <h3>Briefrollen</h3>
            <canvas id="role-chart"></canvas>
        </div>
    </div>
</div>
```

JavaScript (docs/js/stats.js - NEU):
```javascript
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm';

export function renderStatsDashboard(persons) {
    // Occupation distribution
    const occupations = {};
    persons.forEach(p => {
        p.occupations?.forEach(occ => {
            occupations[occ.name] = (occupations[occ.name] || 0) + 1;
        });
    });

    const topOccupations = Object.entries(occupations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    new Chart(document.getElementById('occupation-chart'), {
        type: 'bar',
        data: {
            labels: topOccupations.map(([name]) => name),
            datasets: [{
                label: 'Anzahl Personen',
                data: topOccupations.map(([, count]) => count),
                backgroundColor: '#2c5f8d'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true
        }
    });

    // Similar for places, birth decades, roles...
}
```

### Datengrundlage

Bereits verfügbar aus persons.json:
- 73 verschiedene Berufe
- 121 verschiedene Orte
- 407 Geburtsdaten (Dekaden berechenbar)
- 4 Briefrollen (sender, mentioned, both, indirect)

### Nutzen

- Schneller Überblick über Daten
- Erkennen von Mustern
- Hilft bei Filter-Entscheidungen
- Erfüllt US-1.4

---

## 4. Namensvarianten integrieren (EINFACH)

Aufwand: 0.5-1 Tag
Schwierigkeit: 4/10

### Was

Integriere 797 Namensformen aus ra_ndb_main.xml in persons.json

### Warum einfach

1. Daten bereits in XML vorhanden
2. Nur Pipeline erweitern (build_herdata_new.py)
3. Keine Frontend-Änderungen initial
4. Klare Datenstruktur (ra_ndb_main.xml)

### Implementierung

Pipeline-Erweiterung (preprocessing/build_herdata_new.py):

```python
def phase1_identify_women(self):
    # ... existing code ...

    # Step 1: Load main person data (names) - ERWEITERT
    main_tree = ET.parse(self.new_export_dir / 'ra_ndb_main.xml')
    main_root = main_tree.getroot()

    id_to_names = {}  # NEU: Nicht nur Hauptname, sondern alle Varianten
    for item in main_root.findall('.//ITEM'):
        person_id = item.find('ID').text
        name = item.find('NAME').text if item.find('NAME') is not None else None

        if person_id not in id_to_names:
            id_to_names[person_id] = {
                'main': name,
                'variants': []
            }
        else:
            # Weitere Namensform
            id_to_names[person_id]['variants'].append(name)

    # In self.women speichern
    for person_id, woman_data in self.women.items():
        if person_id in id_to_names:
            woman_data['name_variants'] = id_to_names[person_id]['variants']

    self.log(f"  Added {sum(len(names['variants']) for names in id_to_names.values())} name variants")
```

JSON-Output:
```json
{
  "id": "1906",
  "name": "Angelica Bellonata Facius",
  "name_variants": [
    "Facius, Angelica Bellonata",
    "Facius, Angelika Bellonata",
    "Angelika Facius"
  ],
  "..."
}
```

### Nutzen

- Verbessertes US-1.1 (Namenssuche)
- Historische Namensvarianten sichtbar
- Bessere Findability
- Basis für verbesserte Suche

### Aufwand-Breakdown

- Pipeline anpassen: 2h
- Testen: 1h
- JSON regenerieren: 5min
- Frontend-Update (optional): 2h

---

## 5. Volltextsuche mit Fuse.js (MITTEL)

Aufwand: 1-2 Tage
Schwierigkeit: 5/10

### Was

US-1.6 (teilweise): Fuzzy-Suche über Namen, Biografien, Berufe

### Warum relativ einfach

1. Library vorhanden (Fuse.js, 12 KB)
2. Daten bereits in persons.json
3. Nur Frontend-Code
4. Keine Backend-Änderungen

### Implementierung

HTML (docs/index.html):
```html
<aside class="sidebar">
    <div class="search-box">
        <input type="text" id="search-input" placeholder="Name, Beruf oder Ort suchen...">
        <div id="search-results"></div>
    </div>
    <!-- Existing filters -->
</aside>
```

JavaScript (docs/js/app.js):
```javascript
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/+esm';

let fuse = null;

function initSearch() {
    const options = {
        keys: [
            { name: 'name', weight: 2 },
            { name: 'biography', weight: 1 },
            { name: 'occupations.name', weight: 1.5 },
            { name: 'places.name', weight: 1 }
        ],
        threshold: 0.3,
        includeScore: true,
        minMatchCharLength: 2
    };

    fuse = new Fuse(allPersons, options);
}

document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value;

    if (query.length < 2) {
        filteredPersons = allPersons;
        renderMarkers();
        return;
    }

    const results = fuse.search(query);
    filteredPersons = results.map(r => r.item);
    renderMarkers();

    // Show autocomplete
    showSearchResults(results.slice(0, 10));
});

function showSearchResults(results) {
    const container = document.getElementById('search-results');
    container.innerHTML = results.map(r => `
        <div class="search-result" onclick="selectPerson('${r.item.id}')">
            <strong>${r.item.name}</strong>
            <small>${r.item.occupations?.[0]?.name || 'Keine Berufsangabe'}</small>
        </div>
    `).join('');
}
```

### Nutzen

- Schnelles Finden von Personen
- Typo-tolerant (Fuzzy)
- Erfüllt US-1.6 zu 70%
- Bessere UX

---

## 6. PNG-Export von Visualisierungen (EINFACH)

Aufwand: 3-4 Stunden
Schwierigkeit: 3/10

### Was

US-1.5: Exportiere aktuelle Karten-/Timeline-Ansicht als PNG

### Warum einfach

1. Browser-API vorhanden (canvas.toBlob)
2. MapLibre kann zu Canvas rendern
3. D3.js SVG zu Canvas konvertierbar
4. Keine Backend-Logik

### Implementierung

```javascript
function exportMapAsPNG() {
    const canvas = map.getCanvas();
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `herdata_map_${new Date().toISOString().split('T')[0]}.png`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

// Add button to UI
const exportBtn = document.createElement('button');
exportBtn.textContent = 'Karte als PNG speichern';
exportBtn.onclick = exportMapAsPNG;
document.querySelector('.main-content').appendChild(exportBtn);
```

### Nutzen

- Screenshots für Präsentationen
- Publikationen
- Social Media
- Erfüllt US-1.5

---

## Empfohlene Priorität

### Diese Woche (Quick Wins)

1. CSV-Export (2-4h) - Sofortiger Nutzen für Forscher
2. Vollständigkeits-Badges (3-5h) - Transparenz
3. PNG-Export (3-4h) - Publikationen

Gesamt: ~1 Tag Arbeit, 3 Features komplett

### Nächste Woche

4. Statistik-Dashboard (1-2 Tage) - Überblick
5. Namensvarianten (0.5-1 Tag) - Datenqualität
6. Volltextsuche (1-2 Tage) - UX-Verbesserung

Gesamt: ~4 Tage Arbeit, 6 Features komplett

## Begründung der Priorisierung

### Warum diese Features zuerst?

1. Kein Backend nötig - Nur Frontend-Code
2. Daten bereits vorhanden - Keine Pipeline-Änderungen (außer Namensvarianten)
3. Hoher Nutzen - Forscher profitieren sofort
4. Geringes Risiko - Keine breaking changes
5. Schnelle Erfolge - Motivation für größere Features

### Was ist NICHT einfach?

Schwierige Features (nicht empfohlen für Quick Wins):
- Beziehungsdaten integrieren (922 Beziehungen) - 1-2 Wochen
- Briefdaten vollständig integrieren (15.312 Briefe) - 1-2 Wochen
- TypeScript Migration - 1-2 Wochen
- Automatisierte Tests - 1-2 Wochen

Diese sollten in separaten Sprints angegangen werden.

## Zusammenfassung

Die empfohlenen Quick Wins:

Feature                   | Aufwand | Schwierigkeit | Nutzen | Priorität
--------------------------|---------|---------------|--------|----------
CSV-Export                | 2-4h    | 1/10          | Hoch   | 1
Vollständigkeits-Badges   | 3-5h    | 2/10          | Mittel | 2
PNG-Export                | 3-4h    | 3/10          | Mittel | 3
Statistik-Dashboard       | 1-2d    | 3/10          | Hoch   | 4
Namensvarianten           | 0.5-1d  | 4/10          | Mittel | 5
Volltextsuche (Fuse.js)   | 1-2d    | 5/10          | Hoch   | 6

Mit ~1 Woche Arbeit (5 Tage) können alle 6 Features implementiert werden.

Das würde folgende User Stories erfüllen:
- US-1.4: Statistik-Dashboard
- US-1.5: Datenexport (CSV + PNG)
- US-1.6: Volltextsuche (teilweise)
- US-5.1: Vollständigkeitsindikator

4 von 21 User Stories komplett, 2 weitere teilweise.
