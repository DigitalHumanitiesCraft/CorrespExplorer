# Hover-Netzwerk Implementierungsplan

Stand: 2025-10-29

Implementierung einer Hover-basierten Netzwerk-Visualisierung auf der MapLibre-Karte, die bei Hover über Cluster/Marker Beziehungslinien zu anderen Orten anzeigt.

## Ziel

User Stories erfüllen:
- US-2.2: Ego-Netzwerk (100%)
- US-3.4: Zentren-Gravitation (90%)
- US-3.6: Netzwerkdichte (80%)
- US-2.1: Stammbaum-Navigation (60%)

Erfüllungsquote: 52% → 67% (+4 User Stories)

## Phase 1: Basis-Implementation (3-4h)

### 1.1 Daten-Analyse und Vorbereitung (30 min)

**Aufgabe:** Verstehen der vorhandenen Datenstruktur

**Datenquellen in persons.json:**
```javascript
{
    "id": "Q123456",
    "name": "Anna Amalia",
    "places": [
        { "name": "Weimar", "lat": 50.9795, "lon": 11.3235 }
    ],
    "berufe_beziehungen": [
        {
            "type": "Tochter",
            "related_person": "Anna Louisa Karsch"
        }
    ],
    "briefe": {
        "gesamt": 5,
        "als_absenderin": 3,
        "erwähnt": 2
    }
}
```

**Zu implementieren:**
- Funktion: `getPersonById(name)` - Findet Person nach Name
- Funktion: `getPersonConnections(person)` - Berechnet alle Verbindungen
- Datenstruktur für Connections:
  ```javascript
  {
      type: 'agrelon' | 'correspondence',
      subtype: 'Tochter' | 'Mutter' | ...,
      person: personObject,
      from: { lat, lon, name },
      to: { lat, lon, name },
      strength: 1-10 // Für Liniendicke
  }
  ```

**Deliverable:**
- Datei: `docs/js/network-utils.js`
- Funktionen: `getPersonConnections()`, `getPersonByName()`

---

### 1.2 MapLibre Hover-Events (1h)

**Aufgabe:** Hover-Detection auf Marker und Cluster

**Implementation in app.js:**
```javascript
// Hover auf einzelne Marker
map.on('mouseenter', 'persons', (e) => {
    const personId = e.features[0].properties.id;
    const person = allPersons.find(p => p.id === personId);

    if (!person) return;

    // Berechne Verbindungen
    const connections = getPersonConnections(person);

    // Zeichne Linien
    drawConnectionLines(connections);

    // Cursor ändern
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'persons', () => {
    removeConnectionLines();
    map.getCanvas().style.cursor = '';
});

// Hover auf Cluster
map.on('mouseenter', 'persons-clusters', (e) => {
    const clusterId = e.features[0].properties.cluster_id;
    const source = map.getSource('persons');

    // Hole alle Personen im Cluster
    source.getClusterLeaves(clusterId, 100, 0, (err, leaves) => {
        if (err) return;

        // Aggregiere Verbindungen aller Personen
        const allConnections = [];
        leaves.forEach(leaf => {
            const person = allPersons.find(p => p.id === leaf.properties.id);
            if (person) {
                allConnections.push(...getPersonConnections(person));
            }
        });

        // Dedupliziere und zeichne Top 20 Verbindungen
        const topConnections = deduplicateAndRank(allConnections, 20);
        drawConnectionLines(topConnections);
    });
});
```

**Deliverable:**
- Hover-Events für Marker und Cluster
- Cursor-Feedback

---

### 1.3 Linien-Rendering (1.5h)

**Aufgabe:** GeoJSON-Linien als MapLibre-Layer

**Implementation:**
```javascript
function drawConnectionLines(connections) {
    // Konvertiere zu GeoJSON
    const lineFeatures = connections.map(conn => ({
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [conn.from.lon, conn.from.lat],
                [conn.to.lon, conn.to.lat]
            ]
        },
        properties: {
            type: conn.type,
            subtype: conn.subtype || '',
            personName: conn.person.name,
            strength: conn.strength || 1
        }
    }));

    const geojson = {
        type: 'FeatureCollection',
        features: lineFeatures
    };

    // Update oder erstelle Source
    if (map.getSource('connection-lines')) {
        map.getSource('connection-lines').setData(geojson);
    } else {
        map.addSource('connection-lines', {
            type: 'geojson',
            data: geojson
        });

        // Layer: Basis-Linien
        map.addLayer({
            id: 'connection-lines-bg',
            type: 'line',
            source: 'connection-lines',
            paint: {
                'line-color': '#2c5f8d',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['get', 'strength'],
                    1, 1,
                    10, 4
                ],
                'line-opacity': 0.6
            }
        }, 'persons'); // Unter den Markern
    }
}

function removeConnectionLines() {
    if (map.getSource('connection-lines')) {
        map.getSource('connection-lines').setData({
            type: 'FeatureCollection',
            features: []
        });
    }
}
```

**Deliverable:**
- Funktionierende Linien bei Hover
- Liniendicke basierend auf Stärke
- Performance-Test mit 100+ Linien

---

### 1.4 Basis-Legende (30 min)

**Aufgabe:** Legende für Netzwerk-Verbindungen

**HTML (index.html):**
```html
<div class="map-legend">
    <h4>Cluster-Farben</h4>
    <!-- Bestehende Cluster-Legende -->

    <h4 style="margin-top: var(--space-lg);">Netzwerk (Hover)</h4>
    <div class="legend-item">
        <span class="legend-line" style="background: #2c5f8d;"></span>
        <span>Alle Verbindungen</span>
    </div>
    <p class="legend-hint">Bewegen Sie die Maus über Marker um Netzwerk zu sehen</p>
</div>
```

**CSS (style.css):**
```css
.legend-line {
    width: 30px;
    height: 3px;
    border-radius: 2px;
}

.legend-line.dashed {
    background: repeating-linear-gradient(
        to right,
        currentColor 0,
        currentColor 4px,
        transparent 4px,
        transparent 8px
    );
}

.legend-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-light);
    font-style: italic;
    margin-top: var(--space-xs);
}
```

**Deliverable:**
- Erweiterte Legende mit Netzwerk-Hinweis
- Styled Legend-Line

---

### Phase 1 Deliverables

**Dateien erstellt/geändert:**
- `docs/js/network-utils.js` (NEU, ~100 Zeilen)
- `docs/js/app.js` (+150 Zeilen)
- `docs/index.html` (+10 Zeilen)
- `docs/css/style.css` (+30 Zeilen)

**Funktionalität:**
- Hover über Marker → Zeigt AGRELON-Beziehungen
- Linien in Blau (alle Typen gleich)
- Basis-Legende

**Test:**
- Hover über Anna Amalia → Zeigt 3-5 Linien
- Hover über Weimar-Cluster → Zeigt Top 20 Verbindungen
- Performance: <100ms Rendering

---

## Phase 2: Mehrere Beziehungstypen (2-3h)

### 2.1 AGRELON-Typen-Parser (1h)

**Aufgabe:** Kategorisiere AGRELON-Beziehungen

**Kategorien:**
```javascript
const AGRELON_CATEGORIES = {
    'Familie': [
        'Tochter', 'Sohn', 'Mutter', 'Vater',
        'Schwester', 'Bruder', 'Großmutter', 'Großvater',
        'Enkelin', 'Enkel', 'Ehefrau', 'Ehemann',
        'Nichte', 'Neffe', 'Tante', 'Onkel'
    ],
    'Beruflich': [
        'Schülerin', 'Schüler', 'Lehrerin', 'Lehrer',
        'Kollegin', 'Kollege', 'Mitarbeiterin', 'Mitarbeiter'
    ],
    'Sozial': [
        'Freundin', 'Freund', 'Bekannte', 'Bekannter',
        'Gönnerin', 'Gönner', 'Patronin', 'Patron'
    ]
};

function categorizeAGRELON(type) {
    for (const [category, types] of Object.entries(AGRELON_CATEGORIES)) {
        if (types.includes(type)) return category;
    }
    return 'Andere';
}
```

**Erweitere getPersonConnections():**
```javascript
function getPersonConnections(person) {
    const connections = [];

    // 1. AGRELON-Beziehungen
    person.berufe_beziehungen?.forEach(rel => {
        const relatedPerson = allPersons.find(p => p.name === rel.related_person);
        if (relatedPerson?.places?.length > 0) {
            connections.push({
                type: 'agrelon',
                category: categorizeAGRELON(rel.type),
                subtype: rel.type,
                person: relatedPerson,
                from: person.places[0],
                to: relatedPerson.places[0],
                strength: 8 // Familie = stark
            });
        }
    });

    // 2. Brief-Verbindungen (gleiches Jahr/Dekade)
    // TODO: Würde temporale Daten erfordern

    // 3. Gleicher Ort (schwache Verbindung)
    const sameCity = allPersons.filter(p =>
        p.places?.[0]?.name === person.places?.[0]?.name &&
        p.id !== person.id &&
        p.briefe?.gesamt > 0
    ).slice(0, 5); // Max 5 pro Person

    sameCity.forEach(p => {
        connections.push({
            type: 'same-city',
            category: 'Ort',
            person: p,
            from: person.places[0],
            to: p.places[0],
            strength: 2 // Schwache Verbindung
        });
    });

    return connections;
}
```

**Deliverable:**
- Kategorisierung von AGRELON-Typen
- Stärke-Berechnung (Familie=8, Ort=2)

---

### 2.2 Farb-Schema Implementation (1h)

**Aufgabe:** Verschiedene Farben für Beziehungstypen

**Farb-Definitionen (tokens.css oder app.js):**
```javascript
const CONNECTION_COLORS = {
    'Familie': '#e63946',        // Rot
    'Beruflich': '#06a77d',      // Grün
    'Sozial': '#f77f00',         // Orange
    'Ort': '#6c757d',            // Grau
    'Andere': '#457b9d'          // Blau
};
```

**MapLibre Layer mit Farben:**
```javascript
map.addLayer({
    id: 'connection-lines-colored',
    type: 'line',
    source: 'connection-lines',
    paint: {
        'line-color': [
            'match',
            ['get', 'category'],
            'Familie', CONNECTION_COLORS.Familie,
            'Beruflich', CONNECTION_COLORS.Beruflich,
            'Sozial', CONNECTION_COLORS.Sozial,
            'Ort', CONNECTION_COLORS.Ort,
            CONNECTION_COLORS.Andere
        ],
        'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'strength'],
            1, 1,
            10, 5
        ],
        'line-opacity': 0.7
    }
}, 'persons');
```

**Deliverable:**
- Farbcodierte Linien
- Legende mit Farben

---

### 2.3 Filter-Checkboxen (1h)

**Aufgabe:** Filter für Beziehungstypen

**HTML (index.html):**
```html
<div class="filter-group" role="group" aria-labelledby="filter-network-heading">
    <h4 id="filter-network-heading">Netzwerk (Hover)</h4>
    <label><input type="checkbox" name="network" value="Familie" checked> Familie</label>
    <label><input type="checkbox" name="network" value="Beruflich" checked> Beruflich</label>
    <label><input type="checkbox" name="network" value="Sozial" checked> Sozial</label>
    <label><input type="checkbox" name="network" value="Ort"> Gleicher Ort</label>
</div>
```

**JavaScript (app.js):**
```javascript
let activeNetworkFilters = ['Familie', 'Beruflich', 'Sozial'];

function initNetworkFilters() {
    const checkboxes = document.querySelectorAll('input[name="network"]');

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            activeNetworkFilters = Array.from(
                document.querySelectorAll('input[name="network"]:checked')
            ).map(cb => cb.value);

            console.log('Network filters:', activeNetworkFilters);
        });
    });
}

// In getPersonConnections()
function getPersonConnections(person) {
    const connections = [];

    // ... sammle alle Verbindungen ...

    // Filtere nach aktiven Kategorien
    return connections.filter(conn =>
        activeNetworkFilters.includes(conn.category)
    );
}
```

**Deliverable:**
- 4 Checkboxen für Netzwerk-Filter
- Live-Filterung bei Hover

---

### 2.4 Erweiterte Legende (30 min)

**HTML:**
```html
<div class="map-legend">
    <h4>Cluster-Farben</h4>
    <!-- ... -->

    <h4 style="margin-top: var(--space-lg);">Netzwerk-Verbindungen (Hover)</h4>
    <div class="legend-item">
        <span class="legend-line" style="background: #e63946;"></span>
        <span>Familie (Tochter, Mutter, ...)</span>
    </div>
    <div class="legend-item">
        <span class="legend-line" style="background: #06a77d;"></span>
        <span>Beruflich (Schülerin, Lehrerin)</span>
    </div>
    <div class="legend-item">
        <span class="legend-line" style="background: #f77f00;"></span>
        <span>Sozial (Freundin, Gönnerin)</span>
    </div>
    <div class="legend-item">
        <span class="legend-line" style="background: #6c757d;"></span>
        <span>Gleicher Ort</span>
    </div>
    <p class="legend-hint">Filter in Sidebar verfügbar</p>
</div>
```

**Deliverable:**
- Vollständige Legende mit allen Kategorien
- Farben matchen Linien

---

### Phase 2 Deliverables

**Funktionalität:**
- 4 Beziehungskategorien (Familie, Beruflich, Sozial, Ort)
- Farbcodierte Linien
- Filter-Checkboxen in Sidebar
- Vollständige Legende

**Test:**
- Hover über Anna Amalia → Rote Linien zu Familie
- Deaktiviere "Familie" → Nur grüne/orange Linien
- Hover über Cluster → Mix aus Farben

---

## Phase 3: Performance & Polish (2h)

### 3.1 Cluster-Aggregation (1h)

**Aufgabe:** Bei großen Clustern nur Top-Verbindungen zeigen

**Problem:** Weimar-Cluster (83 Personen) könnte 800+ Linien erzeugen

**Lösung:**
```javascript
function deduplicateAndRank(connections, limit = 20) {
    // Gruppiere nach Ziel-Ort
    const byDestination = {};

    connections.forEach(conn => {
        const key = conn.to.name;
        if (!byDestination[key]) {
            byDestination[key] = {
                to: conn.to,
                from: conn.from,
                connections: [],
                totalStrength: 0
            };
        }
        byDestination[key].connections.push(conn);
        byDestination[key].totalStrength += conn.strength;
    });

    // Sortiere nach Stärke, nimm Top N
    const ranked = Object.values(byDestination)
        .sort((a, b) => b.totalStrength - a.totalStrength)
        .slice(0, limit);

    // Erstelle aggregierte Linien
    return ranked.map(dest => ({
        type: 'aggregated',
        category: getMostCommonCategory(dest.connections),
        from: dest.from,
        to: dest.to,
        strength: Math.min(dest.totalStrength, 10),
        count: dest.connections.length
    }));
}

function getMostCommonCategory(connections) {
    const counts = {};
    connections.forEach(c => {
        counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
```

**Deliverable:**
- Max 20 Linien pro Hover
- Aggregierung nach Ziel-Ort
- Performance: <50ms

---

### 3.2 Tooltip bei Hover auf Linien (30 min)

**Aufgabe:** Zeige Details beim Hover auf Linie

**Implementation:**
```javascript
map.on('mouseenter', 'connection-lines-colored', (e) => {
    const props = e.features[0].properties;

    const tooltip = document.createElement('div');
    tooltip.className = 'network-tooltip';
    tooltip.innerHTML = `
        <strong>${props.personName}</strong><br>
        ${props.subtype || props.category}<br>
        ${props.count > 1 ? `(${props.count} Verbindungen)` : ''}
    `;

    // Position berechnen
    const coords = e.lngLat;
    tooltip.style.left = e.point.x + 'px';
    tooltip.style.top = e.point.y + 'px';

    document.body.appendChild(tooltip);
});

map.on('mouseleave', 'connection-lines-colored', () => {
    document.querySelectorAll('.network-tooltip').forEach(t => t.remove());
});
```

**CSS:**
```css
.network-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: var(--space-sm) var(--space-md);
    border-radius: 4px;
    font-size: var(--font-size-sm);
    pointer-events: none;
    z-index: 10000;
    white-space: nowrap;
}
```

**Deliverable:**
- Tooltip bei Linien-Hover
- Zeigt Person + Beziehungstyp

---

### 3.3 Animation & Transitions (30 min)

**Aufgabe:** Smooth Fade-In/Out der Linien

**MapLibre Transitions:**
```javascript
map.addLayer({
    id: 'connection-lines-colored',
    type: 'line',
    source: 'connection-lines',
    paint: {
        'line-color': [...],
        'line-width': [...],
        'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 0.3,
            10, 0.7
        ]
    },
    layout: {
        'line-cap': 'round',
        'line-join': 'round'
    }
}, 'persons');

// Transitions in MapLibre
map.setPaintProperty('connection-lines-colored', 'line-opacity', 0.7, {
    duration: 300
});
```

**Deliverable:**
- Smooth Fade-In (300ms)
- Opacity passt sich Zoom-Level an

---

### Phase 3 Deliverables

**Funktionalität:**
- Aggregierung bei großen Clustern (max 20 Linien)
- Tooltips bei Linien-Hover
- Smooth Animationen

**Performance:**
- Cluster mit 83 Personen: <50ms
- Keine Lags beim Hover
- Smooth Transitions

---

## Testing & Debugging

### Test-Szenarien

**Test 1: Einzelne Person**
- Hover über "Anna Louisa Karsch"
- Erwartung: 2-3 rote Linien (Familie)
- Tooltip zeigt: "Tochter: Caroline Luise von Klenke"

**Test 2: Cluster (klein)**
- Hover über Hamburg-Cluster (5 Personen)
- Erwartung: 8-12 Linien (verschiedene Farben)
- Mix aus Familie/Beruflich/Sozial

**Test 3: Cluster (groß)**
- Hover über Weimar-Cluster (83 Personen)
- Erwartung: Exakt 20 Linien (aggregiert)
- Dicke Linien nach Berlin/Frankfurt (viele Verbindungen)

**Test 4: Filter**
- Deaktiviere "Familie"
- Hover über Anna Amalia
- Erwartung: Nur grüne/orange Linien (keine roten)

**Test 5: Performance**
- Chrome DevTools Performance-Tab
- Hover 10x schnell hintereinander
- Erwartung: Keine Lags, <100ms pro Hover

---

## Dokumentation

### Code-Kommentare

Alle neuen Funktionen mit JSDoc:
```javascript
/**
 * Berechnet alle Netzwerk-Verbindungen für eine Person
 * @param {Object} person - Person-Objekt aus persons.json
 * @returns {Array<Connection>} Array von Verbindungen
 */
function getPersonConnections(person) { ... }
```

### docs/js/README.md Update

Neuer Abschnitt:
```markdown
## network-utils.js (Network Visualization)

Hover-basierte Netzwerk-Visualisierung auf der Karte.

### getPersonConnections(person)
Berechnet alle Verbindungen einer Person:
- AGRELON-Beziehungen (Familie, Beruflich, Sozial)
- Gleicher Ort (optional)

Returns: Array von Connection-Objekten

### categorizeAGRELON(type)
Kategorisiert AGRELON-Beziehungstypen in Familie/Beruflich/Sozial.

### deduplicateAndRank(connections, limit)
Aggregiert Verbindungen nach Ziel-Ort, rankt nach Stärke.
```

---

## Deployment

### Commit-Strategie

**Commit 1: Phase 1 - Basis**
```
feat: Add hover-based network visualization (Phase 1)

- Hover on markers/clusters shows connection lines
- Basic AGRELON relationship visualization
- Single color (blue) for all connections
- Map legend updated

Files:
- docs/js/network-utils.js (NEW)
- docs/js/app.js (+150 lines)
- docs/index.html (+10 lines)
- docs/css/style.css (+30 lines)

User Stories:
- US-2.2: Ego-Netzwerk (partial)
- US-3.4: Zentren-Gravitation (partial)
```

**Commit 2: Phase 2 - Typen & Filter**
```
feat: Add connection types and filters (Phase 2)

- 4 connection categories: Familie, Beruflich, Sozial, Ort
- Color-coded lines by category
- Filter checkboxes in sidebar
- Extended legend

User Stories:
- US-2.2: Ego-Netzwerk (complete)
- US-3.4: Zentren-Gravitation (complete)
- US-3.6: Netzwerkdichte (complete)
```

**Commit 3: Phase 3 - Polish**
```
feat: Performance optimization and polish (Phase 3)

- Cluster aggregation (max 20 lines)
- Line hover tooltips
- Smooth animations

Performance: <50ms rendering
```

### JOURNAL.md Update

Session 16 Entry:
```markdown
## Session 16: Hover-Netzwerk Visualisierung

Datum: 2025-10-29
Ziel: Implementierung Hover-basierter Netzwerk-Visualisierung auf Karte

Implementierung:
- Phase 1: Basis-Hover und Linien-Rendering
- Phase 2: Beziehungstypen und Filter
- Phase 3: Performance-Optimierung

User Stories erfüllt:
- US-2.2: Ego-Netzwerk (100%)
- US-3.4: Zentren-Gravitation (90%)
- US-3.6: Netzwerkdichte (80%)
- US-2.1: Stammbaum-Navigation (60%)

Erfüllungsquote: 52% → 67% (+15%)

Commits:
- xxx: Phase 1 - Basis-Visualisierung
- xxx: Phase 2 - Typen und Filter
- xxx: Phase 3 - Performance und Polish

Total: 7-9h Implementierung, 4 User Stories erfüllt
```

---

## Risiken & Mitigations

### Risiko 1: Performance bei vielen Linien
**Problem:** 83-Personen-Cluster könnte 800+ Linien erzeugen
**Mitigation:** Aggregierung auf max 20 Linien (Phase 3.1)
**Fallback:** Deaktiviere Netzwerk bei Clustern >50 Personen

### Risiko 2: AGRELON-Daten unvollständig
**Problem:** Nur 86 AGRELON-Beziehungen (vs 939 in Doku)
**Mitigation:** Zeige auch "Gleicher Ort" Verbindungen
**Fallback:** Hinweis in Legende "Nur AGRELON-Daten"

### Risiko 3: Namen-Matching fehlschlägt
**Problem:** `related_person` ist Name (String), nicht ID
**Mitigation:** Fuzzy-Matching mit Levenshtein-Distanz
**Fallback:** Zeige "X Verbindungen nicht gefunden" in Console

### Risiko 4: MapLibre Layer-Limit
**Problem:** MapLibre hat Performance-Limit bei vielen Layern
**Mitigation:** Ein Layer mit Farb-Expression (nicht 4 separate Layer)
**Test:** Performance-Test mit 1000+ Linien

---

## Erfolgskriterien

### Must-Have (Phase 1+2)
- ✅ Hover über Marker zeigt Linien
- ✅ Linien farbcodiert nach Typ
- ✅ Filter funktionieren
- ✅ Legende vollständig
- ✅ Performance <100ms

### Nice-to-Have (Phase 3)
- ✅ Cluster-Aggregierung
- ✅ Linien-Tooltips
- ✅ Smooth Animationen

### User-Feedback
- "Wow, jetzt sehe ich die Verbindungen!"
- "Weimar ist wirklich das Zentrum"
- "Interessant, wie viele Schülerinnen nach Berlin gingen"

---

## Timeline

**Tag 1 (4h):**
- Phase 1 komplett (Basis-Visualisierung)
- Test & Debug
- Commit 1

**Tag 2 (3h):**
- Phase 2 komplett (Typen & Filter)
- Test & Debug
- Commit 2

**Tag 3 (2h):**
- Phase 3 komplett (Performance & Polish)
- Final Testing
- Commit 3
- Dokumentation Update

**Total: 9h über 3 Tage**

---

## Next Steps nach Implementierung

**Mögliche Erweiterungen:**
1. **Temporale Filter:** Zeige nur Verbindungen in bestimmter Zeitspanne
2. **Gerichtete Pfeile:** Zeige Richtung (Lehrerin → Schülerin)
3. **Linien-Dicke animiert:** Pulsieren bei wichtigen Verbindungen
4. **Click → Fokus:** Click auf Linie fokussiert beide Personen
5. **Export:** "Netzwerk als PNG exportieren" Button

**Alternative Visualisierungen:**
- Force-Directed Graph (2D) als separate Ansicht
- Sankey-Diagram für Migrationsflüsse
- Chord-Diagram für Ort-zu-Ort Verbindungen

---

## Ressourcen

**MapLibre Docs:**
- https://maplibre.org/maplibre-gl-js/docs/API/
- Line Layer: https://maplibre.org/maplibre-style-spec/layers/#line

**GeoJSON Spec:**
- https://geojson.org/
- LineString: https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.4

**Inspiration:**
- Palladio (Stanford): https://hdlab.stanford.edu/palladio/
- Gephi Geo Layout: https://gephi.org/

**Testing Tools:**
- Chrome DevTools Performance
- MapLibre Debug: `map.showCollisionBoxes = true`
