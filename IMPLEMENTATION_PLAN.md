# Implementierungsplan Quick Wins

Stand: 05.11.2025
Basis: implementation-quick-wins.md, requirements.md

## Übersicht

3 Features in priorisierter Reihenfolge mit klaren Schritten und kompakten Tests.

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

Datei: preprocessing/build_herdata.py

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

**Automatischer Test** (in build_herdata.py):

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
python build_herdata.py

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

## Feature 2: CSV-Export gefilterte Personen

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

## Feature 3: Dualer Zeitfilter (Korrespondenz vs. Lebensdaten)

**Ziel:** Zeitfilter mit zwei Modi für unterschiedliche Forschungsperspektiven: Korrespondenz (Briefjahre) und Lebensdaten (Geburt/Tod).

**Anforderung:** Nutzer möchten entweder nach aktiver Briefperiode oder nach biografischem Zeitraum filtern können. Personen ohne Daten sollen nicht fälschlicherweise ausgefiltert werden.

### Implementierung

**Dateien:** docs/index.html, docs/synthesis/index.html (identische Lösung auf beiden Seiten)

Struktur:
- Tab-basierte Umschaltung zwischen "Korrespondenz" (1762-1824) und "Lebensdaten" (1700-1850)
- noUiSlider 15.7.1 für Dual-Handle-Range-Slider
- Kompakte Buttons: padding 4px 8px, font-size 11px

HTML (docs/index.html):

```html
<div class="filter-group" role="group" aria-labelledby="filter-time-heading">
    <h4 id="filter-time-heading">Zeitfilter</h4>
    <div class="time-filter-tabs">
        <button class="time-filter-tab active" data-mode="correspondence">Korrespondenz</button>
        <button class="time-filter-tab" data-mode="lifespan">Lebensdaten</button>
    </div>
    <div id="year-range-slider" aria-label="Jahr-Bereich wählen"></div>
    <div class="year-range-display">
        <span id="year-range-text" aria-live="polite">1762 – 1824</span>
    </div>
</div>
```

CSS (docs/css/style.css):

```css
.time-filter-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: var(--space-md);
}

.time-filter-tab {
    flex: 1;
    padding: 4px 8px;
    background: var(--color-bg-light);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
    color: var(--color-text);
    font-weight: 500;
}

.time-filter-tab.active {
    background: var(--color-secondary);
    color: white;
    border-color: var(--color-secondary);
}
```

JavaScript (docs/js/app.js):

```javascript
// State
let timeFilterMode = 'correspondence';  // 'correspondence' oder 'lifespan'
let temporalFilter = null;  // { start: year, end: year, mode: string }

// Tab switching
const timeFilterTabs = document.querySelectorAll('.time-filter-tab');
timeFilterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        timeFilterMode = mode;

        // Update active tab
        timeFilterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update slider range
        if (mode === 'correspondence') {
            yearRangeSlider.noUiSlider.updateOptions({
                range: { 'min': 1762, 'max': 1824 }
            });
            yearRangeSlider.noUiSlider.set([1762, 1824]);
        } else if (mode === 'lifespan') {
            yearRangeSlider.noUiSlider.updateOptions({
                range: { 'min': 1700, 'max': 1850 }
            });
            yearRangeSlider.noUiSlider.set([1700, 1850]);
        }
    });
});

// Filter logic in applyFilters()
if (temporalFilter) {
    if (temporalFilter.mode === 'correspondence') {
        // Filter by letter years
        if (person.letter_years && person.letter_years.length > 0) {
            temporalMatch = person.letter_years.some(year =>
                year >= temporalFilter.start && year <= temporalFilter.end
            );
        }
        // If no letter_years, person passes filter (indirect/SNDB entries)
    } else if (temporalFilter.mode === 'lifespan') {
        // Filter by birth/death years
        const birthYear = person.dates?.birth ? parseInt(person.dates.birth) : null;
        const deathYear = person.dates?.death ? parseInt(person.dates.death) : null;

        if (birthYear || deathYear) {
            // Check if lifespan overlaps with filter range
            const personStart = birthYear || temporalFilter.start;
            const personEnd = deathYear || temporalFilter.end;
            temporalMatch = !(personEnd < temporalFilter.start || personStart > temporalFilter.end);
        }
        // If no dates, person passes filter
    }
}
```

**Identische Implementierung in docs/synthesis/index.html und docs/synthesis/js/app.js** mit angepassten IDs (synthesis-year-range-slider, synthesis-year-range-text).

### Test

**Manueller Test** (5 Minuten):

```bash
# 1. Hauptseite öffnen
start http://localhost:8080/

# 2. Korrespondenz-Modus (Standard):
# - Zeitraum 1800-1810 einstellen
# - Prüfen: Nur Personen mit letter_years in diesem Bereich sichtbar
# - Personen ohne letter_years (indirect/SNDB) bleiben sichtbar

# 3. Lebensdaten-Modus aktivieren:
# - Tab "Lebensdaten" klicken
# - Slider sollte auf 1700-1850 erweitern
# - Zeitraum 1750-1800 einstellen
# - Prüfen: Personen mit Geburts-/Todesjahr in diesem Bereich sichtbar
# - Personen ohne Lebensdaten bleiben sichtbar

# 4. Synthesis-Seite öffnen
start http://localhost:8080/synthesis/

# 5. Prüfen:
# - Zeitfilter sieht identisch aus (gleiche Button-Größe, Farben)
# - Tabs funktionieren identisch
# - Filter-Logik funktioniert identisch

# 6. Grenzfälle:
# - Person nur mit Geburtsjahr: Wird bis 1850 als lebend angenommen
# - Person nur mit Todesjahr: Wird ab 1700 als geboren angenommen
# - Person ohne Daten: Immer sichtbar
```

**Erwartetes Verhalten:**
- Korrespondenz-Modus: 1762-1824 (Briefaktivität)
- Lebensdaten-Modus: 1700-1850 (biografischer Zeitraum)
- Keine ungewollte Exklusion von Personen ohne Daten
- Identisches UI auf beiden Seiten

---

## Zusammenfassung

**Reihenfolge:**
1. Namensvarianten (Backend, 30 Min) → Verbessert Datenqualität
2. CSV-Export (Frontend, 30 Min) → Wichtig für Forschende
3. Dualer Zeitfilter (Frontend, 45 Min) → Klarere Forschungsperspektiven

**Gesamtaufwand:** ca. 1 Stunde 45 Min reine Implementierung + 15 Min Tests

**Abhängigkeiten:**
- Alle Features sind voneinander unabhängig
- Können parallel implementiert werden

**Testing-Strategie:**
- Automatische Tests in Pipeline (Feature 1)
- Manuelle Browser-Tests (Feature 2, 3)
- Stichproben mit echten Daten
- Grenzfälle prüfen (leere Felder, keine Treffer, Personen ohne Daten)

**Rollback:**
- Jedes Feature in separatem Commit
- CSS-Änderungen isoliert in eigenen Dateien
- Neue Funktionen haben keine Seiteneffekte
- Bei Problemen: git revert COMMIT_HASH
