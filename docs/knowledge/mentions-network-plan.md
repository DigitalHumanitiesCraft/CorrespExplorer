# Mentions Flow View - Implementierungsplan

Detaillierter Plan zur Implementierung des Mentions Flow Views mit Sankey-Diagramm und optionalem Netzwerk-Modus.

Stand: 2025-12-02

---

## Executive Summary

Der Mentions Flow View nutzt die bisher ungenutzten `mentions.persons` Daten und visualisiert die Frage: "Wer wird in wessen Briefen erwähnt?" Dies schließt die größte Datenlücke in CorrespExplorer und bietet einen neuartigen Einblick in historische Netzwerke.

### Warum dieser View?

**Problem**: mentions.persons werden extrahiert (11.576 Briefe enthalten Mentions-Daten), aber nur als statische Tags in Brief-Modals angezeigt.

**Lösung**: Sankey-Diagramm zeigt quantitative Erwähnungs-Flüsse zwischen Korrespondenten und erwähnten Personen. Optional: Netzwerk-Modus für explorative Analyse.

**Impact**:
- Identifikation von "Hidden Influencers" (zentral, aber nie selbst korrespondierend)
- Quantitative Messung von Diskurs-Intensität
- Klare, übersichtliche Darstellung ohne Cognitive Overload
- Optional: Explorative Netzwerk-Ansicht für Detail-Analyse

**Cognitive Overload Mitigation**:
- Drei-stufige Filterung reduziert visuelle Komplexität:
  1. Top-N Filter (20 statt 50 meist-erwähnte Personen)
  2. Sender-Threshold (nur Korrespondenten mit ≥5 Mentions)
  3. Flow-Threshold (nur Verbindungen mit ≥2 Erwähnungen)
- Alle Filter sind über Sidebar-Slider dynamisch anpassbar
- User hat volle Kontrolle über Detailgrad vs. Übersichtlichkeit

---

## 1. Visualisierungs-Strategie

### 1.1 Warum Sankey als Primary View?

Nach kritischer Evaluation verschiedener Visualisierungs-Ansätze ergab sich folgende Bewertung:

**Sankey-Diagramm** (PRIMARY - EMPFOHLEN):
- Quantitativ präzise: Fluss-Breiten zeigen Erwähnungs-Intensität
- Kognitive Klarheit: Links-Rechts-Leserichtung, keine Überlappungen
- Skalierbar: Funktioniert mit 10-500+ Knoten
- Forschungswert: "Wer redet wie viel über wen?"
- Thematische Gruppierung: Korrespondenten links, Erwähnte rechts
- Implementierung: Mittlerer Aufwand mit d3-sankey

**Probleme von reinen Netzwerk-Visualisierungen**:
- Cognitive Overload bei 500+ Knoten (HSA: 846 Korrespondenten + ~200-400 Erwähnte)
- Performance-Probleme bei Force-Simulation mit 1000+ Knoten
- Visuelle Unordnung: Überlappende Kanten, schwer lesbare Labels
- Redundanz: Bestehendes Network View zeigt bereits Korrespondenz-Netzwerk
- Limitierte quantitative Präzision: Edge-Breiten schwer vergleichbar

### 1.2 Hybrid-Ansatz

**Primär-Modus: Sankey Diagram ("Mentions Flow")**
- Standard-Ansicht beim Öffnen des Views
- Fokus: Top 50-100 meist-erwähnte Personen
- Klare Darstellung von Diskurs-Intensität

**Sekundär-Modus: Bipartite Network ("Mentions Explorer")**
- Optional aktivierbar via Toggle
- Für explorative Analyse
- Fixierte 2-Spalten-Layout (Korrespondenten links, Erwähnte rechts)
- Keine Force-Simulation, sondern statisches Layout

**Toggle-UI**:
```
┌─────────────────────────────────┐
│ Ansicht:                        │
│ ● Fluss-Diagramm (Sankey)      │
│ ○ Netzwerk (Explorativ)         │
└─────────────────────────────────┘
```

### 1.3 Vergleich alternativer Ansätze

Andere evaluierte, aber nicht priorisierte Optionen:

**Heatmap Matrix** (2. Platz):
- Vorteil: Maximal kompakt, alle Beziehungen sichtbar
- Nachteil: Skaliert schlecht bei 800x400 Matrix (320.000 Zellen)
- Verwendung: Ggf. als 3. Modus für Spezialisten

**Chord Diagram**:
- Vorteil: Elegant, symmetrisch
- Nachteil: Nur für symmetrische Beziehungen, Mentions sind gerichtet
- Verwendung: Nicht geeignet für diesen Use Case

**Force-Directed Network**:
- Vorteil: Bekannt, zeigt Cluster
- Nachteil: Skalierungsprobleme, visuelles Chaos, Redundanz
- Verwendung: Nur als optionaler Sekundär-Modus

---

## 2. Datengrundlage

### 2.1 Verfügbare Daten

**Brief-Struktur (aus cmif-parser.js)**:
```javascript
{
  id: "letter-123",
  sender: {
    name: "Hugo Schuchardt",
    id: "118540238",
    authority: "gnd"
  },
  recipient: {
    name: "Friedrich Schürr",
    id: "117214817",
    authority: "gnd"
  },
  mentions: {
    persons: [
      {
        name: "Wilhelm Meyer-Lübke",
        id: "118783424",
        authority: "gnd"
      },
      {
        name: "Gustav Gröber",
        id: "116868082",
        authority: "gnd"
      }
    ]
  }
}
```

**HSA-Datensatz**:
- 11.576 Briefe total
- Erwartete Mentions: ~30-50% der Briefe (basierend auf CMIF-Standard)
- 846 Korrespondenten
- Geschätzt: 200-400 erwähnte Personen

### 2.2 Datenanalyse erforderlich

Vor Implementierung analysieren:
```python
# preprocessing/analyze_mentions.py
- Wie viele Briefe haben mentions.persons?
- Wie viele unique erwähnte Personen?
- Überlappung: Wer ist Korrespondent UND erwähnt?
- Durchschnittliche Mentions pro Brief
- Top 50 meist-erwähnte Personen (für Sankey)
```

---

## 3. Sankey-Diagramm Design (Primary View)

### 3.1 Struktur

**Zwei-Spalten-Layout**:
```
Korrespondenten          Erwähnte Personen
(Wer erwähnt)            (Wer wird erwähnt)
     │                          │
     │                          │
[Hugo Schuchardt] ═════════════> [Wilhelm Meyer-Lübke]
     │            ─────────────> [Gustav Gröber]
     │                          │
[Friedrich Schürr] ────────────> [Wilhelm Meyer-Lübke]
     │                          │
[Leo Spitzer]    ══════════════> [Karl Vossler]
                                │
```

**Flow-Breiten**:
- Breite = Anzahl Erwähnungen
- Normalisierung: 1-50px Breite
- Farbe: Gradient von Korrespondenten-Farbe zu Erwähnten-Farbe

### 3.2 Node-Design

**Linke Spalte (Korrespondenten)**:
- Rechtecke mit abgerundeten Ecken
- Farbe: Steel Blue (--color-role-sender)
- Höhe: Proportional zur Summe ausgehender Erwähnungen
- Label: Name (rechts vom Rechteck)

**Rechte Spalte (Erwähnte)**:
- Rechtecke mit abgerundeten Ecken
- Farbe: Amber (#f59e0b) für rein erwähnte
- Farbe: Forest Green (--color-role-both) für Hybrid (Korrespondent + Erwähnt)
- Höhe: Proportional zur Summe eingehender Erwähnungen
- Label: Name (links vom Rechteck)

**Hybrid-Nodes** (erscheinen in BEIDEN Spalten):
- Links: Als Korrespondent (Steel Blue)
- Rechts: Als Erwähnter (Forest Green)
- Spezielle Markierung: Icon oder Border

### 3.3 Link-Design

**Sankey-Links**:
- Bezier-Kurven von links nach rechts
- Farbe: Gradient von Sender-Farbe zu Ziel-Farbe
- Opacity: 0.5 (Standard), 1.0 (Hover)
- Breite: Linear skaliert nach Mention-Count

**Hover-Verhalten**:
- Highlight: Link + Source + Target
- Tooltip: "Hugo Schuchardt → Wilhelm Meyer-Lübke: 23 Erwähnungen"
- Dimming: Alle anderen Links auf 0.2 Opacity

### 3.4 Layout-Algorithmus

**D3-Sankey Plugin**:
```javascript
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

const sankeyGenerator = sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([[1, 1], [width - 1, height - 5]]);

const { nodes, links } = sankeyGenerator({
    nodes: [
        { name: "Hugo Schuchardt", column: 0 },  // Linke Spalte
        { name: "Wilhelm Meyer-Lübke", column: 1 }  // Rechte Spalte
    ],
    links: [
        { source: 0, target: 1, value: 23 }  // value = Mention-Count
    ]
});
```

**Sortierung**:
- Linke Spalte: Nach Anzahl Erwähnungen (absteigend)
- Rechte Spalte: Nach Anzahl eingehender Erwähnungen (absteigend)
- Alternative: Alphabetisch (via Toggle)

---

## 4. Bipartite Network Design (Secondary View)

### 4.1 Aktivierung

**Toggle in Controls**:
- Umschalter: "Sankey" ↔ "Netzwerk"
- Standard: Sankey
- Persistent: Wahl wird in sessionStorage gespeichert

### 4.2 Layout

**Fixierte 2-Spalten-Anordnung**:
- KEINE Force-Simulation
- Linke Spalte: Korrespondenten (vertikal sortiert)
- Rechte Spalte: Erwähnte (vertikal sortiert)
- Statische Positionen berechnet via Grid

```javascript
// Berechnung statischer Positionen
const leftColumn = correspondents.map((person, i) => ({
    ...person,
    x: 100,  // Fixiert
    y: (i * height) / correspondents.length
}));

const rightColumn = mentioned.map((person, i) => ({
    ...person,
    x: width - 100,  // Fixiert
    y: (i * height) / mentioned.length
}));
```

### 4.3 Node-Design

Identisch zu Sankey, aber:
- Kreise statt Rechtecke
- Größe: Proportional zu Mention/Letter-Count
- Farben: Gleiche Farbcodierung

### 4.4 Edge-Design

**Gerade oder gebogene Linien**:
- Farbe: Amber (#f59e0b) mit niedriger Opacity (0.3)
- Breite: Proportional zu Mention-Count
- Hover: Highlight + Opacity 1.0

**Vorteil gegenüber Force-Simulation**:
- Keine Performance-Probleme
- Lesbare Labels (keine Überlappungen)
- Vorhersagbare Positionen

---

## 5. UI/UX Design

### 5.1 View-Integration

**Navigation**:
- Neuer View-Button: "Mentions Flow"
- Icon: `fa-diagram-project` (Fluss-Symbol)
- Position: Nach Network View, vor Sidebar-Ende

**Aktivierung**:
- Nur wenn Mentions-Daten vorhanden
- Fallback-Message: "Dieser Datensatz enthält keine Mentions-Daten"

### 5.2 Controls Sidebar

**Integration in bestehende Sidebar-Struktur**:

Die Mentions Flow Filter werden als neue Filter-Gruppe in SECTION 2: FILTER der Sidebar integriert. Die Filter-Gruppe ist nur sichtbar wenn `currentView === 'mentions-flow'`.

Position: Nach Topics Filter, vor Legende

**HTML-Struktur**:
```html
<!-- Mentions Flow Filter (view-specific, after topics-filter-group) -->
<div class="filter-group" role="group" aria-labelledby="filter-mentions-heading"
     id="mentions-filter-group" style="display: none;">
    <h5 id="filter-mentions-heading">Mentions Flow</h5>

    <!-- Top N Slider -->
    <div class="filter-slider-group">
        <label for="mentions-topn-slider">
            Top N Personen: <span id="mentions-topn-value">20</span>
        </label>
        <input type="range" id="mentions-topn-slider"
               min="5" max="50" value="20" step="5"
               aria-label="Anzahl meist-erwähnter Personen">
    </div>

    <!-- Min Sender Mentions Slider -->
    <div class="filter-slider-group">
        <label for="mentions-minsender-slider">
            Min. Sender-Mentions: <span id="mentions-minsender-value">5</span>
        </label>
        <input type="range" id="mentions-minsender-slider"
               min="1" max="20" value="5" step="1"
               aria-label="Minimum Erwähnungen pro Korrespondent">
        <small class="filter-help">Nur Korrespondenten mit ≥N Mentions</small>
    </div>

    <!-- Min Flow Strength Slider -->
    <div class="filter-slider-group">
        <label for="mentions-minflow-slider">
            Min. Flow-Stärke: <span id="mentions-minflow-value">2</span>
        </label>
        <input type="range" id="mentions-minflow-slider"
               min="1" max="10" value="2" step="1"
               aria-label="Minimum Erwähnungen pro Verbindung">
        <small class="filter-help">Nur Verbindungen mit ≥N Erwähnungen</small>
    </div>
</div>
```

**Visualisierungs-Modus** (Optional für Phase 5):
```
┌─────────────────────────────────┐
│ Ansicht                         │
├─────────────────────────────────┤
│ ● Fluss-Diagramm (Sankey)      │
│ ○ Netzwerk (Bipartite)         │
└─────────────────────────────────┘
```

**Filter-Optionen Visualisierung**:
```
┌─────────────────────────────────┐
│ Filter                          │
├─────────────────────────────────┤
│ Top N Personen: [20] ────○      │
│   Range: 5-50                   │
│                                 │
│ Min. Sender-Mentions: [5] ──○   │
│   Range: 1-20                   │
│   Info: Nur Korrespondenten     │
│   mit ≥N Mentions               │
│                                 │
│ Min. Flow-Stärke: [2] ─────○    │
│   Range: 1-10                   │
│   Info: Nur Verbindungen        │
│   mit ≥N Erwähnungen            │
│                                 │
│ Sortierung:                     │
│ ● Nach Häufigkeit               │
│ ○ Alphabetisch                  │
│                                 │
│ Nur anzeigen:                   │
│ ☐ Nur Hybrid-Nodes             │
│ ☐ Nur direkte Mentions         │
└─────────────────────────────────┘
```

**Filter-Implementierung**:

Alle drei Schwellwerte sind über die Sidebar dynamisch anpassbar:

1. **Top N Personen** (`mentionsTopN`):
   - Standard: 20 (reduziert von 50)
   - Range: 5-50
   - Kontrolliert Anzahl der meist-erwähnten Personen auf der rechten Seite

2. **Min. Sender-Mentions** (`mentionsMinSenderMentions`):
   - Standard: 5
   - Range: 1-20
   - Filtert "Gelegenheits-Erwähner" heraus
   - Zeigt nur "aktive Diskurs-Teilnehmer"

3. **Min. Flow-Stärke** (`mentionsMinCount`):
   - Standard: 2
   - Range: 1-10
   - Entfernt schwache Verbindungen
   - Fokus auf signifikante Erwähnungs-Beziehungen

**Real-time Updates**:
- Änderung eines Sliders triggert sofortiges Neu-Rendering
- Alle drei Filter wirken kumulativ
- Filter-Status wird in URL-Params gespeichert für Sharing

**Legende** (Sankey-Modus):
```
Flüsse:
Links:  Korrespondenten (wer erwähnt)
Rechts: Erwähnte Personen (wer wird erwähnt)
Breite: Anzahl Erwähnungen

Farben:
■ Steel Blue = Korrespondent
■ Amber      = Nur erwähnt
■ Green      = Beides (Hybrid)
```

**Legende** (Netzwerk-Modus):
```
Knoten:
● Links:  Korrespondenten
● Rechts: Erwähnte Personen

Verbindungen:
─── Erwähnung (Breite = Häufigkeit)
```

### 5.3 Interaktivität

**Node Hover**:
- Tooltip zeigt:
  - Name
  - Typ (Korrespondent/Erwähnt/Beides)
  - Mention-Count (Anzahl Erwähnungen)
  - Enrichment-Daten (Lebensdaten, Portrait wenn vorhanden)

**Node Click**:
- Detail-Panel öffnet (rechts)
- Zeigt:
  - Vollständige Metadaten
  - "Erwähnt in Briefen von": Liste der Absender mit Counts
  - "Erwähnt folgende Personen": Liste (wenn Korrespondent)
  - Mini-Timeline: Wann wurde Person erwähnt
  - Button: "Briefe anzeigen" (filtert Letters View)

**Link Hover** (Sankey):
- Highlight: Link + Source + Target Nodes
- Tooltip: "Hugo Schuchardt → Wilhelm Meyer-Lübke: 23 Erwähnungen"
- Dimming: Alle anderen Links

**Link Click**:
- Filter Letters View: Zeige nur Briefe wo Source Person Target Person erwähnt
- Optional: Öffne Letter-Liste in Modal

**Zoom/Pan**:
- Scroll: Zoom in/out
- Drag (auf leerem Bereich): Pan
- Doppelklick: Reset View

---

## 6. Technische Implementierung

### 6.1 Abhängigkeiten

**D3-Sankey Plugin**:
```html
<!-- In explore.html -->
<script src="https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/dist/d3-sankey.min.js"></script>
```

Alternative: Als ES6 Module:
```javascript
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
```

### 6.2 Datenvorbereitung

**Neuer Index: mentionedPersons**

```javascript
// In explore.js nach parseData()
function buildMentionedPersonsIndex(letters) {
    const mentioned = new Map();

    for (const letter of letters) {
        if (!letter.mentions?.persons) continue;

        for (const person of letter.mentions.persons) {
            const key = person.id || person.name;

            if (!mentioned.has(key)) {
                mentioned.set(key, {
                    id: key,
                    name: person.name,
                    authority: person.authority,
                    mentionCount: 0,
                    mentionedBy: new Set(),
                    mentionedInLetters: []
                });
            }

            const entry = mentioned.get(key);
            entry.mentionCount++;
            entry.mentionedBy.add(letter.sender.id);
            entry.mentionedInLetters.push(letter.id);
        }
    }

    return mentioned;
}
```

**Hybrid-Erkennung**:
```javascript
function classifyPerson(personId, correspondents, mentioned) {
    const isCorrespondent = correspondents.has(personId);
    const isMentioned = mentioned.has(personId);

    if (isCorrespondent && isMentioned) return 'both';
    if (isCorrespondent) return 'correspondent';
    if (isMentioned) return 'mentioned';
    return null;
}
```

### 6.3 Sankey-Datenstruktur

**Sankey benötigt spezifisches Format**:
```javascript
function buildSankeyData(letters, mentionedPersons, topN = 50) {
    // 1. Aggregiere Mention-Flows
    const flows = new Map(); // key: "senderId→mentionedId", value: count

    for (const letter of letters) {
        if (!letter.mentions?.persons) continue;

        for (const person of letter.mentions.persons) {
            const key = `${letter.sender.id}→${person.id || person.name}`;
            flows.set(key, (flows.get(key) || 0) + 1);
        }
    }

    // 2. Finde Top N meist-erwähnte Personen
    const mentionCounts = new Map();
    for (const [flow, count] of flows) {
        const [_, targetId] = flow.split('→');
        mentionCounts.set(targetId, (mentionCounts.get(targetId) || 0) + count);
    }

    const topMentioned = Array.from(mentionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([id]) => id);

    // 3. Baue Nodes (eindeutige Namen)
    const nodeSet = new Set();
    const nodes = [];

    for (const [flow, count] of flows) {
        const [sourceId, targetId] = flow.split('→');

        if (!topMentioned.includes(targetId)) continue;

        if (!nodeSet.has(sourceId)) {
            nodeSet.add(sourceId);
            nodes.push({
                name: sourceId,
                column: 0  // Linke Spalte
            });
        }

        if (!nodeSet.has(targetId)) {
            nodeSet.add(targetId);
            nodes.push({
                name: targetId,
                column: 1  // Rechte Spalte
            });
        }
    }

    // 4. Baue Links
    const links = [];
    for (const [flow, count] of flows) {
        const [sourceId, targetId] = flow.split('→');

        if (!topMentioned.includes(targetId)) continue;

        const sourceIndex = nodes.findIndex(n => n.name === sourceId);
        const targetIndex = nodes.findIndex(n => n.name === targetId);

        links.push({
            source: sourceIndex,
            target: targetIndex,
            value: count
        });
    }

    return { nodes, links };
}
```

### 6.4 Sankey Rendering

**SVG Setup mit Zoom**:
```javascript
const svg = d3.select('#mentions-flow-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

const g = svg.append('g');

// Zoom
const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => {
        g.attr('transform', event.transform);
    });

svg.call(zoom);
```

**Sankey Layout berechnen**:
```javascript
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

const sankeyGenerator = sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([[100, 50], [width - 100, height - 50]]);

const { nodes, links } = sankeyGenerator(buildSankeyData(letters, mentionedPersons, 50));
```

**Links Rendering**:
```javascript
const link = g.append('g')
    .attr('class', 'links')
    .selectAll('path')
    .data(links)
    .join('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', d => {
        // Gradient von Source zu Target
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', `gradient-${d.index}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', d.source.x1)
            .attr('x2', d.target.x0);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'var(--color-role-sender)');

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#f59e0b');

        return `url(#gradient-${d.index})`;
    })
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('fill', 'none')
    .attr('opacity', 0.5)
    .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1.0);
        // Tooltip anzeigen
    })
    .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.5);
    });
```

**Nodes Rendering**:
```javascript
const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g');

// Rechtecke
node.append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => d.y1 - d.y0)
    .attr('width', sankeyGenerator.nodeWidth())
    .attr('fill', d => {
        // Farbe basierend auf Spalte und Typ
        if (d.column === 0) return 'var(--color-role-sender)';
        // Prüfe ob Hybrid
        const isHybrid = correspondents.has(d.name);
        return isHybrid ? 'var(--color-role-both)' : '#f59e0b';
    })
    .attr('rx', 3)
    .on('click', (event, d) => {
        // Detail-Panel öffnen
        showPersonDetails(d);
    });

// Labels
node.append('text')
    .attr('x', d => d.column === 0 ? d.x1 + 6 : d.x0 - 6)
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.column === 0 ? 'start' : 'end')
    .text(d => d.name)
    .style('font-size', '11px')
    .style('fill', 'var(--color-text-primary)');
```

### 6.5 Performance-Optimierung

**Sankey ist performanter als Force-Networks**:
- Keine Animation (einmaliges Layout)
- Statische Positionen (kein Tick-Update)
- Top-N Filterung reduziert Komplexität

**Optimierungen**:

1. **Top-N Filterung**:
```javascript
// Standard: Top 50, Maximum: Top 200
const topN = Math.min(config.maxNodes, 200);
const sankeyData = buildSankeyData(letters, mentionedPersons, topN);
```

2. **Link-Aggregation**:
```javascript
// Bereits in buildSankeyData: Mehrfach-Erwähnungen aggregiert
// key: "senderId→mentionedId", value: count
```

3. **Lazy Rendering bei Toggle**:
```javascript
// Nur aktiver Modus wird gerendert
if (viewMode === 'sankey') {
    renderSankey();
} else {
    renderBipartiteNetwork();
}
```

4. **Gradient-Caching**:
```javascript
// Gradients nur einmal definieren, dann wiederverwenden
const defs = svg.append('defs');
// Vordefinierte Gradients statt dynamische Erstellung pro Link
```

---

## 7. Filter-Integration

### 7.1 Bidirektionales Filtern

**Von anderem View → Mentions Flow**:
```javascript
// Person in Persons View geklickt
function handlePersonFilter(personId) {
    selectedPersonId = personId;

    // Mentions Flow: Highlight Person in Sankey
    if (currentView === 'mentions-flow') {
        highlightPersonInSankey(personId);
    }
}
```

**Von Mentions Flow → andere Views**:
```javascript
// Node geklickt
function onNodeClick(node) {
    // Filter Letters View
    applyPersonFilter(node.name);

    // Update URL
    updateUrlParams({ person: node.name });

    // Optional: Wechsel zu Letters View
    switchView('letters');
}
```

**Link geklickt** (Sankey-spezifisch):
```javascript
// Link zeigt "Wer erwähnt wen"
function onLinkClick(link) {
    // Filter: Zeige Briefe wo Source Person Target Person erwähnt
    const filteredLetters = allLetters.filter(letter =>
        letter.sender.id === link.source.name &&
        letter.mentions?.persons?.some(p =>
            (p.id || p.name) === link.target.name
        )
    );

    // Zeige gefilterte Briefe
    displayFilteredLetters(filteredLetters);
}
```

### 7.2 Zeitliche Filterung

Mentions Flow reagiert auf Timeline-Filter:

```javascript
function applyTemporalFilterToMentions(yearMin, yearMax) {
    // Nur Briefe im Zeitraum
    const filteredLetters = allLetters.filter(l =>
        l.year >= yearMin && l.year <= yearMax
    );

    // Sankey neu berechnen und rendern
    const sankeyData = buildSankeyData(filteredLetters, mentionedPersons, topN);
    renderSankey(sankeyData);
}
```

---

## 8. Testing-Strategie

### 8.1 Daten-Tests

```javascript
// test-mentions-flow.js

function testSankeyDataBuilding() {
    const letters = [
        { id: 1, sender: {id: 'A'}, mentions: { persons: [{id: 'C'}] }},
        { id: 2, sender: {id: 'A'}, mentions: { persons: [{id: 'C'}] }},
        { id: 3, sender: {id: 'B'}, mentions: { persons: [{id: 'C'}] }}
    ];

    const sankeyData = buildSankeyData(letters, new Map(), 10);

    assert(sankeyData.nodes.length === 3); // A, B, C
    assert(sankeyData.links.length === 2); // A→C, B→C
    assert(sankeyData.links.find(l => l.source === 0 && l.target === 2).value === 2);
}

function testHybridDetection() {
    const correspondents = new Map([['X', {...}]]);
    const mentioned = new Map([['X', {...}]]);

    assert(classifyPerson('X', correspondents, mentioned) === 'both');
}

function testTopNFiltering() {
    // Test dass nur Top N erwähnte Personen im Sankey erscheinen
    const sankeyData = buildSankeyData(allLetters, mentionedPersons, 10);
    assert(sankeyData.nodes.filter(n => n.column === 1).length <= 10);
}
```

### 8.2 UI-Tests

**Manuelle Checkliste (Sankey-Modus)**:
- [ ] Nodes in zwei Spalten angeordnet
- [ ] Links als Bezier-Kurven gerendert
- [ ] Link-Breiten proportional zu Mention-Count
- [ ] Hover zeigt Tooltips mit Count
- [ ] Click öffnet Detail-Panel
- [ ] Zoom/Pan funktioniert
- [ ] Filter ändern Sankey
- [ ] Toggle zu Netzwerk funktioniert
- [ ] Performance bei 200+ Nodes akzeptabel (<1s Render)

**Manuelle Checkliste (Netzwerk-Modus)**:
- [ ] Nodes in zwei Spalten fixiert
- [ ] Keine Force-Simulation (statisch)
- [ ] Labels lesbar ohne Überlappungen
- [ ] Hover/Click funktioniert identisch
- [ ] Performance gut bei 500+ Nodes

### 8.3 Browser-Kompatibilität

Testen auf:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

D3-Sankey-Features die überall funktionieren müssen:
- SVG path (Bezier-Kurven)
- Linear Gradients
- Transform/Zoom

---

## 9. Implementierungs-Phasen

### Implementierungs-Status (Stand: 2025-12-02)

**Abgeschlossen:**
- Phase 1: Datenanalyse & Vorbereitung - COMPLETE
- Phase 2: Sankey Grundfunktion - COMPLETE
- Phase 3: Sankey Styling & Interaktivitat - COMPLETE
- Phase 4: Controls & Filter - COMPLETE

**Ausstehend:**
- Phase 5: Bipartite Network - OPTIONAL (nicht priorisiert)
- Phase 6: Polish & Testing - IN PROGRESS (Basis-Testing durchgefuhrt)

**Commits:**
- 9a03db5: Phase 1-2 Grundfunktion
- 1d8a48c: Cognitive Overload Reduktion
- 809fdd3: Phase 3 Styling und Tooltips
- 94590f8: Phase 4 Filter-Controls
- 1bfa0b1: Dynamischer Filter-Info-Text

---

### Phase 1: Datenanalyse & Vorbereitung (2-3h) - COMPLETE

**Aufgaben**:
1. Python-Script: `preprocessing/analyze_mentions.py`
   - Statistiken über Mentions im HSA-Datensatz
   - Identifikation Top-50 erwähnter Personen
   - Hybrid-Analyse: Wer ist Korrespondent UND erwähnt?

2. `explore.js`: `buildMentionedPersonsIndex()`
   - Index-Funktion implementieren
   - Mit Console-Logs testen

3. `explore.js`: `classifyPerson()`
   - Hybrid-Erkennung implementieren

**Deliverable**: Funktionierende Index-Struktur, bestätigt via Console

### Phase 2: Sankey Grundfunktion (4-5h) - COMPLETE

**Aufgaben**:
1. D3-Sankey Dependency hinzufügen
   - CDN-Link in explore.html
   - Oder als ES6 Module

2. HTML: View-Container in `explore.html`
   ```html
   <div id="mentions-flow-view" class="view-content" style="display: none;">
       <div id="mentions-flow-container"></div>
   </div>
   ```

3. `explore.js`: `buildSankeyData()`
   - Flow-Aggregation
   - Top-N Filterung
   - Nodes/Links Format

4. `explore.js`: `renderSankey()`
   - Sankey Layout berechnen
   - SVG Setup mit Zoom
   - Basic Rendering (ohne Styles)

5. View-Button in Navbar
   - Icon: fa-diagram-project
   - Label: "Mentions Flow"
   - Click-Handler

**Deliverable**: Funktionierendes Sankey-Diagramm (ohne visuelle Polish)

### Phase 3: Sankey Styling & Interaktivität (3-4h) - COMPLETE

**Aufgaben**:
1. Link-Gradients implementieren
   - Farbe von Source zu Target
   - Opacity-Handling

2. Node-Farben nach Typ
   - Steel Blue für Korrespondenten
   - Amber für Erwähnte
   - Green für Hybrid

3. Hover/Click-Interaktivität
   - Tooltips für Nodes und Links
   - Highlight-Effekte
   - Detail-Panel

4. `explore.css`: Styles für Sankey
   - Link-Hover-Effekte
   - Node-Hover-Effekte
   - Legende-Styles

**Deliverable**: Visuell ansprechender, interaktiver Sankey

### Phase 4: Controls & Filter (2-3h) - COMPLETE

**Aufgaben**:
1. Controls Sidebar HTML/CSS
   - Top N Personen Slider (Range: 5-50, Default: 20)
   - Min. Sender-Mentions Slider (Range: 1-20, Default: 5)
   - Min. Flow-Stärke Slider (Range: 1-10, Default: 2)
   - Sortierungs-Toggle (Häufigkeit/Alphabetisch)
   - Modus-Toggle (Sankey/Netzwerk) - Optional für Phase 5

2. Filter-State Management
   ```javascript
   // State-Variablen (bereits implementiert)
   let mentionsTopN = 20;
   let mentionsMinSenderMentions = 5;
   let mentionsMinCount = 2;
   ```

3. Filter-Event-Handler
   ```javascript
   // Slider onChange Handler
   function onMentionsFilterChange(filterType, newValue) {
       if (filterType === 'topN') mentionsTopN = newValue;
       if (filterType === 'minSender') mentionsMinSenderMentions = newValue;
       if (filterType === 'minFlow') mentionsMinCount = newValue;

       // Re-render Sankey
       renderMentionsFlow();

       // Update URL params
       updateUrlParams({
           mentionsTopN,
           mentionsMinSender: mentionsMinSenderMentions,
           mentionsMinFlow: mentionsMinCount
       });
   }
   ```

4. Integration mit bestehenden Filtern
   - Temporal Filter Integration (Timeline reagiert auf Sankey)
   - Person Filter Integration (Persons View ↔ Mentions Flow)
   - Language Filter Integration

5. URL-Parameter-Persistenz
   - Filter-Werte in URL speichern
   - Filter-Werte aus URL beim Laden wiederherstellen
   - Share-Button für gefilterte Ansicht

**Deliverable**: Konfigurierbares Sankey mit dynamischen Filter-Controls

### Phase 5: Bipartite Network (Optional, 3-4h)

**Aufgaben**:
1. `renderBipartiteNetwork()`
   - Statisches 2-Spalten-Layout
   - Nodes als Kreise
   - Edges als Linien

2. Toggle-Logik
   - Umschalten zwischen Sankey und Netzwerk
   - sessionStorage für Persistenz

3. Shared Interaktivität
   - Hover/Click identisch zu Sankey

**Deliverable**: Funktionierendes Bipartite Network als Alternative

### Phase 6: Polish & Testing (2-3h)

**Aufgaben**:
1. Performance-Optimierungen
   - Gradient-Caching
   - Lazy Rendering
2. Responsive Design (Mobile)
3. Accessibility (Keyboard-Navigation)
4. Browser-Tests
5. Bug-Fixes

**Deliverable**: Production-Ready Feature

**Geschätzte Gesamtzeit**: 16-22 Stunden (statt 20-27h)
**Zeitersparnis**: 4-5h durch Sankey statt Force-Simulation

---

## 10. Dokumentation

### 10.1 User-Dokumentation

**about.html erweitern**:

```markdown
### Mentions Flow View

Visualisiert, wer in wessen Briefen erwähnt wird. Zeigt quantitative Erwähnungs-Flüsse zwischen Korrespondenten und erwähnten Personen.

**Ansichten**:
- Fluss-Diagramm (Sankey): Quantitative Darstellung mit Fluss-Breiten
- Netzwerk (Bipartite): Explorative Ansicht mit zwei Spalten

**Farben**:
- Steel Blue: Korrespondenten
- Amber: Nur erwähnte Personen
- Green: Hybrid (Korrespondent und erwähnt)

**Verwendung**:
- Hover: Details und Erwähnungs-Counts anzeigen
- Click auf Node: Briefe filtern
- Click auf Link: Briefe mit spezifischer Erwähnung anzeigen
- Scroll: Zoom
- Filter: Top N Personen, Min. Mentions

**Forschungsfragen**:
- Wer sind die "Hidden Influencers" (oft erwähnt, aber nie korrespondierend)?
- Wie intensiv wird über bestimmte Personen gesprochen?
- Welche Personen sind zentral im Diskurs?
```

### 10.2 Technische Dokumentation

**architecture.md erweitern**:

Neuer View-Abschnitt mit:
- Datenfluss-Diagramm (buildSankeyData)
- Mentions-Index-Struktur
- D3-Sankey-Implementierung
- Hybrid-Modus-Logik
- Performance-Überlegungen

### 10.3 JOURNAL.md Update

Nach Fertigstellung:

```markdown
## 2025-12-0X (Phase 27: Mentions Flow View)

### Neue Visualisierung: Mentions Flow mit Sankey-Diagramm

Implementierung des Mentions Flow Views zur Visualisierung von
Erwähnungs-Netzwerken in Briefkorrespondenzen.

**Visualisierungs-Ansatz**:
- Primary: Sankey-Diagramm für quantitative Klarheit
- Secondary: Bipartite Network für explorative Analyse
- Entscheidung nach kritischer Evaluation: Sankey bietet bessere Skalierung, Lesbarkeit und quantitative Präzision als Force-Directed Networks

**Features**:
- Zwei-Spalten-Layout (Korrespondenten links, Erwähnte rechts)
- Fluss-Breiten zeigen Erwähnungs-Intensität
- Farbcodierung: Steel Blue, Amber, Green für Hybrid
- Toggle zwischen Sankey und Bipartite Network
- Bidirektionale Filter-Integration
- Link-Click: Spezifische Erwähnungs-Briefe anzeigen

**Technische Details**:
- D3-Sankey Plugin
- Mentions-Index mit O(1) Lookups
- Top-N Filterung für Performance
- Statisches Layout (kein Tick-Update)
- 16-22h Implementierung (4-5h schneller als Force-Network)

**Neue Dateien**:
- docs/knowledge/mentions-network-plan.md (aktualisiert mit Hybrid-Ansatz)
- Erweiterungen in explore.js, explore.css

**Datennutzung**:
- mentions.persons nun vollständig visualisiert
- Schließt größte Datenlücke im Tool
- Ermöglicht quantitative Diskurs-Analyse
```

---

## 11. Erfolgsmetriken

### 11.1 Funktionale Metriken

**Sankey-Modus**:
- [ ] Nodes in zwei Spalten korrekt angeordnet
- [ ] Link-Breiten proportional zu Mention-Count
- [ ] Farben korrekt (Steel Blue, Amber, Green)
- [ ] Filter funktionieren bidirektional
- [ ] Performance < 1s für 200 Nodes

**Netzwerk-Modus** (optional):
- [ ] Statisches Layout funktioniert
- [ ] Toggle zwischen Modi funktioniert
- [ ] Performance gut bei 500+ Nodes

**Allgemein**:
- [ ] Hover-Tooltips zeigen korrekte Daten
- [ ] Click öffnet Detail-Panel
- [ ] Link-Click filtert spezifische Briefe
- [ ] Zoom/Pan funktioniert

### 11.2 Forschungsmetriken

Nach Veröffentlichung messen:
- Nutzung: Wie oft wird View aktiviert?
- Verweildauer: Länger als andere Views?
- Filter-Nutzung: Welche Filter werden verwendet?
- Modus-Präferenz: Sankey vs. Netzwerk?
- Feedback: Was sagen Forschende?

### 11.3 Code-Qualität

- [ ] Keine Duplikation mit Network View
- [ ] Shared Utilities ausgelagert (buildMentionedPersonsIndex)
- [ ] Tests vorhanden (buildSankeyData, filtering)
- [ ] Dokumentation vollständig

---

## 12. Risiken & Mitigation

### 12.1 Datenqualität

**Risiko**: Mentions-Daten sind spärlich oder inkonsistent

**Mitigation**:
- Datenanalyse in Phase 1 zeigt Qualität
- Fallback: "Keine Mentions-Daten" Message
- Top-N Filterung stellt sicher, dass nur qualitativ hochwertige Daten gezeigt werden

### 12.2 Performance

**Risiko**: Zu viele Nodes = Lag

**Mitigation**:
- Sankey ist performanter als Force-Networks (statisch)
- Top-N-Limit (Standard: 50, Max: 200)
- Lazy Rendering bei Modus-Wechsel
- Gradient-Caching

**Vorteil Sankey**:
- Keine Tick-Updates
- Keine Force-Berechnung
- Einmaliges Layout

### 12.3 UX Complexity

**Risiko**: Nutzer verstehen Sankey nicht

**Mitigation**:
- Klare Legende mit visuellen Beispielen
- Hover-Tooltips erklären Fluss-Breiten
- Link-zu-Rechts-Leserichtung ist intuitiv
- Optional: Interaktive Demo-Tour erweitern
- Fallback: Netzwerk-Modus für Nutzer die Sankey nicht mögen

### 12.4 D3-Sankey-Kompatibilität

**Risiko**: D3-Sankey Plugin funktioniert nicht überall

**Mitigation**:
- Weit verbreitetes, stabiles Plugin (v0.12.3)
- Browser-Tests auf allen Major Browsers
- Graceful Degradation bei Fehler
- CDN-Fallback bei Import-Problemen

---

## 13. Nächste Schritte

### Sofort

1. Datenanalyse durchführen (analyze_mentions.py)
2. Ergebnisse evaluieren
3. Go/No-Go Entscheidung basierend auf Daten

### Bei Go

4. Phase 1 starten (Index-Implementierung)
5. Phase 2: Sankey-Prototyp (2-3 Tage)
6. User-Testing mit Demo-Datensatz
7. Feedback zu Sankey vs. Netzwerk einholen

### Nach MVP

8. Feedback sammeln
9. Entscheidung: Bipartite Network implementieren?
10. Iterieren basierend auf Nutzung
11. Weitere Views evaluieren (Geographic Discourse Map, Topic Evolution Timeline)

---

## 14. Referenzen

- D3-Sankey Documentation: https://github.com/d3/d3-sankey
- D3-Sankey Examples: https://observablehq.com/@d3/sankey
- Sankey Best Practices: https://www.visualcinnamon.com/2019/04/sankey-diagram-best-practices
- Existing Network View Code: [docs/js/explore.js](../js/explore.js) (renderNetwork function)
- CMIF Mentions Spec: [CMIF-Data.md](CMIF-Data.md)
