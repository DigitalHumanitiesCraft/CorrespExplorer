# Mentions Network View - Implementierungsplan

Detaillierter Plan zur Implementierung des Mentions Network Views.

Stand: 2025-12-02

---

## Executive Summary

Der Mentions Network View nutzt die bisher ungenutzten `mentions.persons` Daten und visualisiert die Frage: "Wer wird in wessen Briefen erwähnt?" Dies schließt die größte Datenlücke in CorrespExplorer und bietet einen neuartigen Einblick in historische Netzwerke.

### Warum dieser View?

**Problem**: mentions.persons werden extrahiert (11.576 Briefe enthalten Mentions-Daten), aber nur als statische Tags in Brief-Modals angezeigt.

**Lösung**: 3-Ebenen-Netzwerk zeigt Korrespondenten, erwähnte Personen und ihre Beziehungen.

**Impact**:
- Identifikation von "Hidden Influencers" (zentral, aber nie selbst korrespondierend)
- Erkennung von Gatekeepern (verbinden isolierte Gruppen)
- Analyse indirekter Netzwerke (wer spricht über wen)

---

## 1. Datengrundlage

### 1.1 Verfügbare Daten

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

### 1.2 Datenanalyse erforderlich

Vor Implementierung analysieren:
```python
# preprocessing/analyze_mentions.py
- Wie viele Briefe haben mentions.persons?
- Wie viele unique erwähnte Personen?
- Überlappung: Wer ist Korrespondent UND erwähnt?
- Durchschnittliche Mentions pro Brief
- Top 20 meist-erwähnte Personen
```

---

## 2. Netzwerk-Design

### 2.1 Node-Typen

**Typ 1: Correspondence-Only Nodes**
- Personen die korrespondieren, aber nie erwähnt werden
- Darstellung: Großer Kreis
- Farbe: Steel Blue (--color-role-sender)
- Größe: Basierend auf Brief-Count

**Typ 2: Mentioned-Only Nodes**
- Personen die nur erwähnt werden, nie korrespondieren
- Darstellung: Quadrat (zur Unterscheidung)
- Farbe: Amber (#f59e0b)
- Größe: Basierend auf Mention-Count

**Typ 3: Both (Hybrid) Nodes**
- Personen die korrespondieren UND erwähnt werden
- Darstellung: Raute/Diamant
- Farbe: Forest Green (--color-role-both)
- Größe: Kombiniert Brief + Mention Count

### 2.2 Edge-Typen

**Direct Correspondence (durchgezogene Linie)**
- Quelle: Sender
- Ziel: Recipient
- Farbe: --color-primary (#A64B3F)
- Breite: Anzahl Briefe
- Opacity: 0.8

**Mention (gestrichelte Linie)**
- Quelle: Brief-Absender (wer erwähnt)
- Ziel: Erwähnte Person
- Farbe: Amber (#f59e0b)
- Breite: Anzahl Erwähnungen
- Opacity: 0.6
- Stil: 5px dash, 3px gap

### 2.3 Layout-Algorithmus

**D3 Force Simulation**:
```javascript
const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges)
        .id(d => d.id)
        .distance(d => d.type === 'correspondence' ? 80 : 120)
    )
    .force("charge", d3.forceManyBody()
        .strength(d => d.nodeType === 'both' ? -400 : -200)
    )
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide()
        .radius(d => d.radius + 5)
    );
```

**Clustering-Strategie**:
- Correspondence-Edges stärker gewichtet (kürzere Distanz)
- Both-Nodes als "Brücken" mit höherer Abstoßung
- Mentioned-Only Nodes an Peripherie

---

## 3. UI/UX Design

### 3.1 View-Integration

**Navigation**:
- Neuer View-Button: "Mentions Network"
- Icon: `fa-diagram-project` (verbundene Knoten)
- Position: Nach Network View, vor Sidebar-Ende

**Aktivierung**:
- Nur wenn Mentions-Daten vorhanden
- Fallback-Message: "Dieser Datensatz enthält keine Mentions-Daten"

### 3.2 Controls Sidebar

**Filter-Optionen**:
```
┌─────────────────────────────────┐
│ Netzwerk-Konfiguration          │
├─────────────────────────────────┤
│ ☑ Zeige Korrespondenz          │
│ ☑ Zeige Erwähnungen             │
│                                 │
│ Node-Typen:                     │
│ ☑ Nur Korrespondenten          │
│ ☑ Nur Erwähnte                  │
│ ☑ Beide                         │
│                                 │
│ Min. Mentions: [2] ──────○      │
│ Max. Nodes:    [100] ────○      │
│                                 │
│ Layout:                         │
│ ○ Force-Directed                │
│ ○ Hierarchisch                  │
│ ○ Radial (Ego-Netzwerk)         │
│                                 │
│ [Netzwerk zurücksetzen]         │
└─────────────────────────────────┘
```

**Legende**:
```
Knoten:
● Kreis     = Korrespondent
■ Quadrat   = Erwähnt
◆ Raute     = Beides

Verbindungen:
─── Korrespondenz
╌╌╌ Erwähnung
```

### 3.3 Interaktivität

**Node Hover**:
- Tooltip zeigt:
  - Name
  - Typ (Korrespondent/Erwähnt/Beides)
  - Brief-Count (wenn zutreffend)
  - Mention-Count (wenn zutreffend)
  - Enrichment-Daten (Lebensdaten, Portrait)

**Node Click**:
- Detail-Panel öffnet (rechts)
- Zeigt:
  - Vollständige Metadaten
  - "Erwähnt in Briefen von": Liste der Absender
  - "Erwähnt folgende Personen": Liste (wenn Korrespondent)
  - Mini-Timeline: Wann wurde Person erwähnt
  - Button: "Briefe anzeigen" (filtert Letters View)

**Edge Hover**:
- Highlight Source + Target Nodes
- Tooltip: "5 Briefe" oder "8 Erwähnungen"

**Drag**:
- Nodes dragbar zur Positionierung
- Optional: Pin-Funktion (Node fixieren)

### 3.4 Ego-Network Mode

**Aktivierung**: Click auf Node + "Ego-Modus"

**Verhalten**:
- Fokus-Node in Zentrum (fixiert)
- Zeige nur direkte Nachbarn (1. Grad)
- Radiales Layout
- Distanz = Relationship-Strength
- Highlight "Bridging Nodes" (verbinden sonst isolierte Cluster)

---

## 4. Technische Implementierung

### 4.1 Datenvorbereitung

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

### 4.2 Netzwerk-Konstruktion

**Nodes Array**:
```javascript
const nodes = [];

// Korrespondenten
for (const [id, person] of allPersons) {
    const type = classifyPerson(id, allPersons, mentionedPersons);
    nodes.push({
        id: id,
        name: person.name,
        type: type,
        letterCount: person.letter_count,
        mentionCount: mentionedPersons.get(id)?.mentionCount || 0
    });
}

// Nur-erwähnte Personen
for (const [id, person] of mentionedPersons) {
    if (!allPersons.has(id)) {
        nodes.push({
            id: id,
            name: person.name,
            type: 'mentioned',
            letterCount: 0,
            mentionCount: person.mentionCount
        });
    }
}
```

**Edges Array**:
```javascript
const edges = [];

// Correspondence Edges
for (const letter of letters) {
    const existingEdge = edges.find(e =>
        e.source === letter.sender.id &&
        e.target === letter.recipient.id &&
        e.type === 'correspondence'
    );

    if (existingEdge) {
        existingEdge.weight++;
    } else {
        edges.push({
            source: letter.sender.id,
            target: letter.recipient.id,
            type: 'correspondence',
            weight: 1
        });
    }
}

// Mention Edges
for (const letter of letters) {
    if (!letter.mentions?.persons) continue;

    for (const person of letter.mentions.persons) {
        const key = person.id || person.name;
        const existingEdge = edges.find(e =>
            e.source === letter.sender.id &&
            e.target === key &&
            e.type === 'mention'
        );

        if (existingEdge) {
            existingEdge.weight++;
        } else {
            edges.push({
                source: letter.sender.id,
                target: key,
                type: 'mention',
                weight: 1
            });
        }
    }
}
```

### 4.3 D3.js Rendering

**SVG Setup**:
```javascript
const svg = d3.select('#mentions-network-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

const g = svg.append('g');

// Zoom
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
        g.attr('transform', event.transform);
    });

svg.call(zoom);
```

**Edge Rendering**:
```javascript
const link = g.append('g')
    .selectAll('line')
    .data(edges)
    .join('line')
    .attr('class', d => `edge edge-${d.type}`)
    .attr('stroke', d => d.type === 'correspondence' ?
        'var(--color-primary)' : '#f59e0b')
    .attr('stroke-width', d => Math.sqrt(d.weight) * 2)
    .attr('stroke-opacity', d => d.type === 'correspondence' ? 0.8 : 0.6)
    .attr('stroke-dasharray', d => d.type === 'mention' ? '5,3' : 'none');
```

**Node Rendering**:
```javascript
const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .call(drag(simulation));

// Node Shape basierend auf Typ
node.each(function(d) {
    const g = d3.select(this);

    if (d.type === 'correspondent') {
        g.append('circle')
            .attr('r', Math.sqrt(d.letterCount) * 3)
            .attr('fill', 'var(--color-role-sender)');
    } else if (d.type === 'mentioned') {
        const size = Math.sqrt(d.mentionCount) * 3;
        g.append('rect')
            .attr('width', size * 2)
            .attr('height', size * 2)
            .attr('x', -size)
            .attr('y', -size)
            .attr('fill', '#f59e0b');
    } else if (d.type === 'both') {
        const size = Math.sqrt(d.letterCount + d.mentionCount) * 3;
        g.append('path')
            .attr('d', d3.symbol().type(d3.symbolDiamond).size(size * 40))
            .attr('fill', 'var(--color-role-both)');
    }
});

// Labels
node.append('text')
    .attr('dy', d => Math.sqrt(d.letterCount || d.mentionCount) * 3 + 12)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text(d => d.name);
```

**Simulation Update**:
```javascript
simulation.on('tick', () => {
    link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    node
        .attr('transform', d => `translate(${d.x},${d.y})`);
});
```

### 4.4 Performance-Optimierung

**Problem**: 800+ Nodes + 5000+ Edges = Lag

**Lösungen**:

1. **Intelligentes Filtern**:
```javascript
// Nur Top N meist-verbundene Nodes
const topNodes = nodes
    .sort((a, b) => (b.letterCount + b.mentionCount) -
                     (a.letterCount + a.mentionCount))
    .slice(0, maxNodes);
```

2. **Edge-Bundling**:
```javascript
// Mehrfach-Erwähnungen zu einer Kante zusammenfassen
// Bereits in Edge-Konstruktion implementiert (weight++)
```

3. **Canvas statt SVG** (für >500 Nodes):
```javascript
// Optional: Wechsel zu Canvas-Rendering
const canvas = d3.select('#mentions-network-container')
    .append('canvas');
const context = canvas.node().getContext('2d');
// D3 Force mit Canvas-Rendering kombinieren
```

4. **Virtualisierung**:
```javascript
// Nur sichtbare Nodes rendern
const visibleNodes = nodes.filter(d =>
    d.x > -margin && d.x < width + margin &&
    d.y > -margin && d.y < height + margin
);
```

---

## 5. Filter-Integration

### 5.1 Bidirektionales Filtern

**Von anderem View → Mentions Network**:
```javascript
// Person in Persons View geklickt
function handlePersonFilter(personId) {
    selectedPersonId = personId;

    // Mentions Network: Ego-Modus aktivieren
    if (currentView === 'mentions-network') {
        activateEgoNetwork(personId);
    }
}
```

**Von Mentions Network → andere Views**:
```javascript
// Node geklickt
function onNodeClick(node) {
    // Filter Letters View
    applyPersonFilter(node.id);

    // Update URL
    updateUrlParams({ person: node.id });

    // Optional: Wechsel zu Letters View
    switchView('letters');
}
```

### 5.2 Zeitliche Filterung

Mentions Network reagiert auf Timeline-Filter:

```javascript
function applyTemporalFilterToMentions(yearMin, yearMax) {
    // Nur Briefe im Zeitraum
    const filteredLetters = allLetters.filter(l =>
        l.year >= yearMin && l.year <= yearMax
    );

    // Netzwerk neu berechnen
    rebuildMentionsNetwork(filteredLetters);
}
```

---

## 6. Testing-Strategie

### 6.1 Daten-Tests

```javascript
// test-mentions-network.js

function testMentionsIndexing() {
    const letters = [
        { id: 1, sender: {id: 'A'}, mentions: { persons: [{id: 'C'}] }},
        { id: 2, sender: {id: 'A'}, mentions: { persons: [{id: 'C'}] }},
        { id: 3, sender: {id: 'B'}, mentions: { persons: [{id: 'C'}] }}
    ];

    const index = buildMentionedPersonsIndex(letters);

    assert(index.get('C').mentionCount === 3);
    assert(index.get('C').mentionedBy.size === 2); // A und B
}

function testHybridDetection() {
    const correspondents = new Map([['X', {...}]]);
    const mentioned = new Map([['X', {...}]]);

    assert(classifyPerson('X', correspondents, mentioned) === 'both');
}
```

### 6.2 UI-Tests

**Manuelle Checkliste**:
- [ ] Nodes werden korrekt nach Typ gerendert (Kreis/Quadrat/Raute)
- [ ] Edges haben korrekte Styles (durchgezogen/gestrichelt)
- [ ] Hover zeigt Tooltips
- [ ] Click öffnet Detail-Panel
- [ ] Drag funktioniert
- [ ] Zoom/Pan funktioniert
- [ ] Filter ändern Netzwerk
- [ ] Ego-Modus aktivierbar
- [ ] Performance bei 500+ Nodes akzeptabel (<2s Render)

### 6.3 Browser-Kompatibilität

Testen auf:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

SVG-Features die überall funktionieren müssen:
- stroke-dasharray
- transform
- d3.symbol (Diamond shape)

---

## 7. Implementierungs-Phasen

### Phase 1: Datenanalyse & Vorbereitung (2-3h)

**Aufgaben**:
1. Python-Script: `preprocessing/analyze_mentions.py`
   - Statistiken über Mentions im HSA-Datensatz
   - Identifikation Top-erwähnter Personen

2. `explore.js`: `buildMentionedPersonsIndex()`
   - Index-Funktion implementieren
   - Mit Console-Logs testen

3. `explore.js`: `classifyPerson()`
   - Hybrid-Erkennung implementieren

**Deliverable**: Funktionierende Index-Struktur, bestätigt via Console

### Phase 2: Basic Network Rendering (4-5h)

**Aufgaben**:
1. HTML: View-Container in `explore.html`
   ```html
   <div id="mentions-network-view" class="view-content" style="display: none;">
       <div id="mentions-network-container"></div>
   </div>
   ```

2. `explore.js`: `renderMentionsNetwork()`
   - D3 Force Simulation Setup
   - Nodes als Kreise (erstmal alle gleich)
   - Edges als Linien
   - Basic Zoom/Pan

3. View-Button in Navbar
   - Icon, Label, Click-Handler

**Deliverable**: Funktionierendes Force-Directed Network (ohne Styling)

### Phase 3: Visual Encoding (3-4h)

**Aufgaben**:
1. Node-Shapes implementieren
   - Circle für Korrespondenten
   - Rect für Erwähnte
   - Diamond für Both

2. Edge-Styles implementieren
   - Durchgezogen vs. gestrichelt
   - Farben nach Typ
   - Breite nach Weight

3. `explore.css`: Styles für Netzwerk
   - Node-Hover-Effekte
   - Edge-Hover-Effekte
   - Legende-Styles

**Deliverable**: Visuell unterscheidbare Node/Edge-Typen

### Phase 4: Interaktivität (4-5h)

**Aufgaben**:
1. Hover-Tooltips
   - Node-Info
   - Edge-Info

2. Click-Handler
   - Node-Click: Detail-Panel
   - Filter-Integration

3. Drag-Funktionalität
   - Node dragging
   - Optional: Pinning

**Deliverable**: Voll-interaktives Netzwerk

### Phase 5: Controls & Filter (3-4h)

**Aufgaben**:
1. Controls Sidebar
   - Min Mentions Slider
   - Max Nodes Slider
   - Node-Type Checkboxes
   - Layout-Toggles

2. Filter-Logik
   - Dynamisches Neu-Rendering bei Filter-Änderung
   - Temporal Filter Integration
   - Person Filter Integration

**Deliverable**: Konfigurierbares Netzwerk mit allen Controls

### Phase 6: Ego-Network Mode (2-3h)

**Aufgaben**:
1. Ego-Modus-Toggle
2. Radiales Layout für Ego
3. 1st-Degree-Neighbors Filtering

**Deliverable**: Funktionierender Ego-Network-Modus

### Phase 7: Polish & Testing (2-3h)

**Aufgaben**:
1. Performance-Optimierungen
2. Responsive Design (Mobile)
3. Accessibility (Keyboard-Navigation)
4. Browser-Tests
5. Bug-Fixes

**Deliverable**: Production-Ready Feature

**Geschätzte Gesamtzeit**: 20-27 Stunden

---

## 8. Dokumentation

### 8.1 User-Dokumentation

**about.html erweitern**:

```markdown
### Mentions Network View

Visualisiert, wer in wessen Briefen erwähnt wird.

**Knoten-Typen**:
- Kreis: Person korrespondiert
- Quadrat: Person wird nur erwähnt
- Raute: Beides

**Verbindungen**:
- Durchgezogene Linie: Direkte Korrespondenz
- Gestrichelte Linie: Erwähnung

**Verwendung**:
- Hover: Details anzeigen
- Click: Briefe filtern
- Drag: Knoten verschieben
- Scroll: Zoom
```

### 8.2 Technische Dokumentation

**architecture.md erweitern**:

Neuer View-Abschnitt mit:
- Datenfluss-Diagramm
- Index-Struktur
- D3-Implementierung
- Performance-Überlegungen

### 8.3 JOURNAL.md Update

Nach Fertigstellung:

```markdown
## 2025-12-0X (Phase 27: Mentions Network View)

### Neue Visualisierung: Mentions Network

Implementierung des Mentions Network Views zur Visualisierung von
Erwähnungs-Netzwerken in Briefkorrespondenzen.

**Features**:
- 3-Ebenen-Netzwerk (Korrespondenten, Erwähnte, Hybrid)
- Unterschiedliche Node-Shapes nach Typ
- Durchgezogene vs. gestrichelte Edges
- Ego-Network-Modus
- Bidirektionale Filter-Integration

**Technische Details**:
- D3 Force Simulation
- Mentions-Index mit O(1) Lookups
- Performance-optimiert für 500+ Nodes

**Neue Dateien**:
- docs/knowledge/mentions-network-plan.md
- Erweiterungen in explore.js, explore.css

**Datennutzung**:
- mentions.persons nun vollständig visualisiert
- Schließt größte Datenlücke im Tool
```

---

## 9. Erfolgsmetriken

### 9.1 Funktionale Metriken

- [ ] Alle Node-Typen korrekt visualisiert
- [ ] Alle Edge-Typen korrekt visualisiert
- [ ] Filter funktionieren bidirektional
- [ ] Ego-Modus funktioniert
- [ ] Performance < 3s für 500 Nodes

### 9.2 Forschungsmetriken

Nach Veröffentlichung messen:
- Nutzung: Wie oft wird View aktiviert?
- Verweildauer: Länger als andere Views?
- Filter-Nutzung: Welche Filter werden verwendet?
- Feedback: Was sagen Forschende?

### 9.3 Code-Qualität

- [ ] Keine Duplikation mit Network View
- [ ] Shared Utilities ausgelagert
- [ ] Tests vorhanden
- [ ] Dokumentation vollständig

---

## 10. Risiken & Mitigation

### 10.1 Datenqualität

**Risiko**: Mentions-Daten sind spärlich oder inkonsistent

**Mitigation**:
- Datenanalyse in Phase 1 zeigt Qualität
- Fallback: "Keine Mentions-Daten" Message
- Optional: Parser erweitern für mehr Quellen

### 10.2 Performance

**Risiko**: Zu viele Nodes = Lag

**Mitigation**:
- Max-Nodes-Limit (Default: 100)
- Canvas-Rendering für >500 Nodes
- Smart Filtering (Top N)

### 10.3 UX Complexity

**Risiko**: Zu komplex für Nutzer

**Mitigation**:
- Interaktive Demo-Tour erweitern
- Klare Legende
- Hover-Tooltips erklären Symbolik
- Video-Tutorial erstellen

### 10.4 Browser-Kompatibilität

**Risiko**: SVG-Features funktionieren nicht überall

**Mitigation**:
- Polyfills für ältere Browser
- Graceful Degradation
- Ausführliche Browser-Tests

---

## 11. Nächste Schritte

### Sofort

1. Datenanalyse durchführen (analyze_mentions.py)
2. Ergebnisse evaluieren
3. Go/No-Go Entscheidung basierend auf Daten

### Bei Go

4. Phase 1 starten (Index-Implementierung)
5. Prototyp in 2-3 Tagen
6. User-Testing mit Demo-Datensatz

### Nach MVP

7. Feedback sammeln
8. Iterieren basierend auf Nutzung
9. Weitere Views prüfen (Geographic Discourse Map, Topic Evolution)

---

## Referenzen

- D3 Force Documentation: https://d3js.org/d3-force
- Network Visualization Best Practices: https://www.visualcinnamon.com/resources/learning-data-visualization/
- Existing Network View Code: docs/js/explore.js (renderNetwork function)
- CMIF Mentions Spec: docs/knowledge/CMIF-Data.md
