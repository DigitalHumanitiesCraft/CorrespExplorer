# Implementierungsplan Quick Wins

Stand: 05.11.2025
Basis: implementation-quick-wins.md, requirements.md

## Übersicht

4 Features in priorisierter Reihenfolge mit klaren Schritten und kompakten Tests.

---

## Feature 1: Namensvarianten integrieren

**Ziel:** Zusätzliche Schreibweisen aus ra_ndb_main.xml in persons.json aufnehmen.

**Datenquelle:**
- Datei: data/herdata/ra_ndb_main.xml
- Struktur: ITEM mit ID, LFDNR, NACHNAME, VORNAMEN, GEBURTSNAME
- LFDNR=0: Haupteintrag
- LFDNR>0: Namensvarianten (z.B. ID 35217 hat LFDNR 0 "d'Aguilar" und LFDNR 8110 "Lawrence")
- Erwartung: 797 Einträge für 448 IDs = ca. 349 Varianten

### Implementierung

Datei: preprocessing/build_herdata_new.py

```python
def load_name_variants(self):
    """Phase 1b: Load name variants from ra_ndb_main.xml"""
    variants = defaultdict(list)

    tree = ET.parse(self.herdata_dir / 'ra_ndb_main.xml')
    root = tree.getroot()

    for item in root.findall('ITEM'):
        person_id = item.findtext('ID')
        lfdnr = item.findtext('LFDNR', '0')

        # Skip main entries (LFDNR=0)
        if lfdnr == '0':
            continue

        # Build variant name
        nachname = item.findtext('NACHNAME', '').strip()
        vornamen = item.findtext('VORNAMEN', '').strip()
        titel = item.findtext('TITEL', '').strip()

        if not nachname and not vornamen:
            continue

        # Format: "Titel Vornamen Nachname"
        parts = [p for p in [titel, vornamen, nachname] if p]
        variant = ' '.join(parts)

        if variant and person_id in self.women:
            variants[person_id].append(variant)

            self.add_provenance(person_id, f'name_variant_{lfdnr}', {
                'file': 'ra_ndb_main.xml',
                'xpath': f'//ITEM[ID="{person_id}"][LFDNR="{lfdnr}"]',
                'raw_value': variant,
                'transformation': 'concat(TITEL, VORNAMEN, NACHNAME)'
            })

    # Add to women dict
    for person_id, variant_list in variants.items():
        # Deduplicate
        unique_variants = list(dict.fromkeys(variant_list))
        self.women[person_id]['name_variants'] = unique_variants

    self.log(f"Loaded {sum(len(v) for v in variants.values())} name variants for {len(variants)} women")
    return variants
```

Änderungen in run() Methode:

```python
def run(self):
    # Phase 1: Load women from NEW export
    self.load_women_from_new_export()
    self.load_name_variants()  # NEU: direkt nach Phase 1
    assert self.test_phase1()

    # ... rest bleibt gleich
```

### Test

**Automatischer Test** (in build_herdata_new.py):

```python
def test_name_variants(self):
    """Validate name variants integration"""
    with_variants = sum(1 for w in self.women.values() if w.get('name_variants'))
    total_variants = sum(len(w.get('name_variants', [])) for w in self.women.values())

    # Expected: ~300-350 variants for ~200-250 women
    assert 250 <= total_variants <= 400, f"Expected 250-400 variants, got {total_variants}"
    assert 150 <= with_variants <= 300, f"Expected 150-300 women with variants, got {with_variants}"

    self.log(f"[OK] Name variants: {total_variants} variants for {with_variants} women")
    return True
```

**Manueller Test** (5 Minuten):

```bash
# 1. Pipeline ausführen
cd preprocessing
python build_herdata_new.py

# 2. Stichprobe: ID 35217 (Rose d'Aguilar / Rose Lawrence)
node -e "
const data = require('../docs/data/persons.json');
const person = data.persons.find(p => p.id === '35217');
console.log('Name:', person.name);
console.log('Variants:', person.name_variants);
"

# Erwartetes Ergebnis:
# Name: Rose d'Aguilar
# Variants: [ 'Rose Lawrence', 'geb. d\'Aguilar' ]

# 3. Statistik
node -e "
const data = require('../docs/data/persons.json');
const withVariants = data.persons.filter(p => p.name_variants && p.name_variants.length > 0);
const totalVariants = data.persons.reduce((sum, p) => sum + (p.name_variants?.length || 0), 0);
console.log('Frauen mit Varianten:', withVariants.length, '/', data.persons.length);
console.log('Varianten gesamt:', totalVariants);
"

# Erwartetes Ergebnis: ~200-250 Frauen, ~300-350 Varianten
```

---

## Feature 2: Vollständigkeits-Badge

**Ziel:** Badge im Header der Personenseite zeigt "6 von 8 Feldern (75% vollständig)".

**Felder:** id, name, gnd, birth, death, biography, places (≥1), occupations (≥1)

### Implementierung

Datei: docs/js/person.js

```javascript
function renderCompletenessIndicator(person) {
    const fields = [
        { name: 'id', present: !!person.id },
        { name: 'name', present: !!person.name },
        { name: 'gnd', present: !!person.gnd },
        { name: 'birth', present: !!person.dates?.birth },
        { name: 'death', present: !!person.dates?.death },
        { name: 'biography', present: !!person.biography },
        { name: 'places', present: person.places?.length > 0 },
        { name: 'occupations', present: person.occupations?.length > 0 }
    ];

    const present = fields.filter(f => f.present).length;
    const total = fields.length;
    const percentage = Math.round((present / total) * 100);

    // Color coding
    let colorClass = 'low';
    if (percentage >= 75) colorClass = 'high';
    else if (percentage >= 50) colorClass = 'medium';

    return `
        <div class="completeness-badge completeness-${colorClass}">
            <span class="completeness-text">${present} von ${total} Feldern</span>
            <span class="completeness-percent">${percentage}% vollständig</span>
        </div>
    `;
}

// In renderPersonHeader():
const completenessHtml = renderCompletenessIndicator(person);
// ... add to header after name
```

Datei: docs/css/person-cards.css

```css
.completeness-badge {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    line-height: 1.3;
}

.completeness-text {
    font-weight: 600;
}

.completeness-percent {
    font-size: 0.75rem;
    opacity: 0.8;
}

.completeness-high {
    background: var(--color-success-bg, #e8f5e9);
    color: var(--color-success-text, #2e7d32);
}

.completeness-medium {
    background: var(--color-warning-bg, #fff3e0);
    color: var(--color-warning-text, #f57c00);
}

.completeness-low {
    background: var(--color-error-bg, #ffebee);
    color: var(--color-error-text, #c62828);
}
```

### Test

**Manueller Test** (3 Minuten):

```bash
# 1. Browser öffnen
start http://localhost:8080/person.html?id=1906

# 2. Visuell prüfen:
# - Badge erscheint im Header rechts neben Name
# - Zeigt "X von 8 Feldern"
# - Zeigt "Y% vollständig"
# - Farbe entspricht Prozentsatz (grün/gelb/rot)

# 3. Mehrere Personen testen:
# - Vollständig: ID mit GND, Daten, Bio, Orten, Berufen
# - Teilweise: ID ohne einige Felder
# - Minimal: ID mit nur Name

# 4. Konsole prüfen (keine Fehler)
```

**Automatischer Test** (optional, in person.js):

```javascript
// Während der Entwicklung in Konsole ausführen
const testPerson = {
    id: '1906',
    name: 'Test Person',
    gnd: '12345',
    dates: { birth: '1800', death: '1850' },
    biography: 'Test bio',
    places: [{ name: 'Weimar' }],
    occupations: [{ name: 'Schriftstellerin' }]
};
console.log(renderCompletenessIndicator(testPerson));
// Erwartung: "8 von 8 Feldern (100% vollständig)" mit grüner Farbe
```

---

## Feature 3: CSV-Export gefilterte Personen

**Ziel:** Button in Filter-Sidebar exportiert aktuell sichtbare Personen als CSV.

**Felder:** id, name, gnd, birth, death, places, occupations, letter_count, role

### Implementierung

Datei: docs/index.html

```html
<!-- In filter sidebar, nach Reset-Button -->
<div class="filter-actions">
    <button id="reset-filters" class="btn-secondary">Filter zurücksetzen</button>
    <button id="export-csv" class="btn-secondary">
        <span>Als CSV exportieren</span>
    </button>
</div>
```

Datei: docs/js/app.js

```javascript
function initCSVExport() {
    const exportBtn = document.getElementById('export-csv');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        exportFilteredPersonsAsCSV();
    });
}

function exportFilteredPersonsAsCSV() {
    // Get currently filtered persons from map
    const visiblePersons = getFilteredPersons(); // bereits vorhanden in app.js

    if (visiblePersons.length === 0) {
        alert('Keine Personen zum Exportieren. Filter anpassen.');
        return;
    }

    // CSV Header
    const headers = ['ID', 'Name', 'GND', 'Geburt', 'Tod', 'Orte', 'Berufe', 'Briefe', 'Rolle'];
    const rows = [headers];

    // CSV Rows
    visiblePersons.forEach(person => {
        const row = [
            person.id || '',
            person.name || '',
            person.gnd || '',
            person.dates?.birth || '',
            person.dates?.death || '',
            person.places?.map(p => p.name).join('; ') || '',
            person.occupations?.map(o => o.name).join('; ') || '',
            person.letter_count || 0,
            person.roles?.join(', ') || ''
        ];

        // Quote fields containing comma, semicolon, or newline
        const quotedRow = row.map(field => {
            const str = String(field);
            if (str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('"')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        });

        rows.push(quotedRow);
    });

    // Generate CSV string
    const csv = rows.map(row => row.join(',')).join('\n');

    // Create download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `herdata-export-${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    console.log(`CSV export: ${visiblePersons.length} Personen exportiert`);
}

// In init():
initCSVExport();
```

Datei: docs/css/style.css

```css
.filter-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border, #e0e0e0);
}

#export-csv {
    width: 100%;
}
```

### Test

**Manueller Test** (3 Minuten):

```bash
# 1. Seite öffnen
start http://localhost:8080/

# 2. Filter setzen:
# - Zeitraum: 1800-1820
# - Aktivität: "Hat geschrieben"
# - Berufsgruppe: "Literarisch"

# 3. Export-Button klicken
# - Datei wird heruntergeladen: herdata-export-2025-11-05.csv

# 4. CSV öffnen (Excel/LibreOffice):
# - UTF-8 korrekt (Umlaute lesbar)
# - Header vorhanden
# - Nur gefilterte Personen enthalten
# - Felder mit Kommas korrekt gequotet
# - Mehrfachwerte (Orte, Berufe) mit Semikolon getrennt

# 5. Leerer Filter:
# - Alle Filter entfernen
# - Export → sollte alle 448 Personen enthalten

# 6. Keine Treffer:
# - Unmöglichen Filter setzen (z.B. Zeitraum 1500-1600)
# - Export → Alert "Keine Personen zum Exportieren"
```

---

## Feature 4: PNG-Export Karte

**Ziel:** Button exportiert aktuelle Kartenansicht als PNG mit Legende.

### Implementierung

Datei: docs/index.html

```html
<!-- Bei map controls, nach zoom buttons -->
<div class="map-controls">
    <button id="zoom-in" class="map-control-btn">+</button>
    <button id="zoom-out" class="map-control-btn">-</button>
    <button id="export-map" class="map-control-btn" title="Karte als Bild exportieren">
        <span>📷</span>
    </button>
</div>
```

Datei: docs/js/app.js

```javascript
function initMapExport() {
    const exportBtn = document.getElementById('export-map');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        exportMapAsPNG();
    });
}

async function exportMapAsPNG() {
    try {
        // Wait for map to be idle
        await new Promise(resolve => {
            if (map.loaded()) {
                resolve();
            } else {
                map.once('idle', resolve);
            }
        });

        // Get map canvas
        const canvas = map.getCanvas();

        // Create new canvas with extra space for legend
        const exportCanvas = document.createElement('canvas');
        const legendHeight = 120;
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height + legendHeight;

        const ctx = exportCanvas.getContext('2d');

        // Draw map
        ctx.drawImage(canvas, 0, 0);

        // Draw legend background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(0, canvas.height, canvas.width, legendHeight);

        // Draw legend content
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText('HerData - Frauen im Goethe-Briefnetzwerk', 20, canvas.height + 25);

        ctx.font = '12px Arial';
        ctx.fillText('Quelle: Klassik Stiftung Weimar / PROPYLÄEN', 20, canvas.height + 50);
        ctx.fillText(`Lizenz: CC BY 4.0 | Export: ${new Date().toLocaleDateString('de-DE')}`, 20, canvas.height + 70);
        ctx.fillText(`Sichtbare Personen: ${getFilteredPersons().length}`, 20, canvas.height + 90);

        // Convert to blob and download
        exportCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const today = new Date().toISOString().split('T')[0];
            link.href = url;
            link.download = `herdata-karte-${today}.png`;
            link.click();
            URL.revokeObjectURL(url);

            console.log('Map exported as PNG');
        });

    } catch (error) {
        console.error('Map export failed:', error);
        alert('Kartenexport fehlgeschlagen. Bitte Screenshot verwenden.');
    }
}

// In init():
initMapExport();
```

### Test

**Manueller Test** (2 Minuten):

```bash
# 1. Seite öffnen
start http://localhost:8080/

# 2. Karte einstellen:
# - Nach Weimar zoomen
# - Filter setzen
# - Warten bis Karte vollständig geladen

# 3. Export-Button (Kamera-Symbol) klicken
# - Datei wird heruntergeladen: herdata-karte-2025-11-05.png

# 4. PNG öffnen:
# - Karte wie angezeigt sichtbar
# - Legende am unteren Rand lesbar
# - Quellenangabe vorhanden
# - Datum korrekt
# - Anzahl sichtbare Personen korrekt
# - Keine UI-Elemente (Buttons, Sidebar) im Export

# 5. Verschiedene Zoomstufen testen:
# - Weit herausgezoomt (ganz Europa)
# - Nah herangezoomt (einzelne Stadt)
# - Beide Exports sollten funktionieren
```

---

## Zusammenfassung

**Reihenfolge:**
1. Namensvarianten (Backend, 30 Min) → Verbessert Datenqualität
2. Vollständigkeits-Badge (Frontend, 20 Min) → Schneller Nutzen
3. CSV-Export (Frontend, 30 Min) → Wichtig für Forschende
4. PNG-Export (Frontend, 25 Min) → Nice-to-have

**Gesamtaufwand:** ca. 2 Stunden reine Implementierung + 15 Min Tests

**Abhängigkeiten:**
- Features 2-4 sind unabhängig voneinander
- Feature 1 läuft zuerst (Backend), dann Features 2-4 parallel möglich

**Testing-Strategie:**
- Automatische Tests in Pipeline (Feature 1)
- Manuelle Browser-Tests (Features 2-4)
- Stichproben mit echten Daten
- Grenzfälle prüfen (leere Felder, keine Treffer)

**Rollback:**
- Jedes Feature in separatem Commit
- CSS-Änderungen isoliert in eigenen Dateien
- Neue Funktionen haben keine Seiteneffekte
- Bei Problemen: git revert COMMIT_HASH
