# Netzwerk-Visualisierung: Umsetzungsplan

Stand: 09.11.2025
Basis: Datenanalyse und Screenshot-Auswertung

## Datengrundlage (Analysiert)

### 1. Frau-zu-Frau Korrespondenz

Gefunden: 22 Briefe zwischen Frauen im Datensatz

Beispiele:
- Katharina Elisabeth Goethe -> Johanna Christiane Sophie Goethe von (1803, 1804)
- Fanny Fiala -> Katharina Elisabeth Goethe (1794, 1795)
- Elisabeth (Bettina) Arnim von -> Johanna Christiane Sophie Goethe von (1808)

Datenstruktur:
```json
{
  "correspondence": [
    {
      "type": "sent",
      "recipient": "Name",
      "recipient_gnd": "118540238",
      "year": 1795,
      "date": "1795-01-03",
      "place": "Weimar"
    }
  ]
}
```

Matching-Logik:
- Prüfe ob recipient_gnd in der GND-Liste der 448 Frauen
- Baue bidirektionale Verbindung (sender -> recipient)
- Aggregiere Briefanzahl pro Paar

### 2. Zeitfilter (bereits vorhanden)

Aktueller Stand:
- Zeitfilter filtert Nodes (Personen), nicht Edges (Verbindungen)
- temporalFilter: { start: year, end: year, mode: 'correspondence'|'lifespan' }
- letter_years[] pro Person vorhanden

Keine zusätzliche Animation nötig:
- Zeitfilter zeigt bereits Personen in Zeitraum
- AGRELON-Beziehungen sind zeitlos (keine Jahreszuordnung)
- Korrespondenz hat year-Feld → kann gefiltert werden

Klarstellung:
- Zeitfilter für Nodes = sinnvoll (wer lebte/korrespondierte wann)
- Animation über Zeit = nicht prioritär (da AGRELON-Daten keine Zeitdimension haben)
- Korrespondenz-Edges können nach Jahr gefiltert werden

### 3. AGRELON-Relationstypen

Vorhanden: 38 detaillierte Typen in relationships[].type

Beispiele:
- "hat Nichte/Neffe" (type_id: 4110, Kategorie: Familie)
- "hat Einfluss auf" (type_id: 3020, Kategorie: Beruflich)
- "hat Kind" (type_id: 4030, Kategorie: Familie)

Aktuell: Nur Kategorie-Farbe (Familie/Beruflich/Sozial)
Ziel: Label mit exaktem Typ auf Linie anzeigen

## Umsetzungsplan

### Feature 1: Frau-zu-Frau Korrespondenz-Netzwerk

Aufwand: Mittel (2-3 Stunden)
Priorität: Hoch

#### 1.1 Datenextraktion (network-utils.js)

Neue Funktion: `extractCorrespondenceConnections(allPersons)`

```javascript
/**
 * Extract woman-to-woman correspondence connections
 * @param {Array} allPersons - All persons from persons.json
 * @returns {Array<Object>} Array of correspondence connections
 */
export function extractCorrespondenceConnections(allPersons) {
    const connections = [];
    const womenByGnd = new Map();

    // Build GND lookup
    allPersons.forEach(p => {
        if (p.gnd) womenByGnd.set(p.gnd, p);
    });

    // Find woman-to-woman correspondence
    allPersons.forEach(sender => {
        if (!sender.correspondence) return;

        sender.correspondence.forEach(corr => {
            const recipientGnd = corr.recipient_gnd;
            if (!recipientGnd) return;

            const recipient = womenByGnd.get(recipientGnd);
            if (!recipient) return; // Not a woman in our dataset

            // Both must have places for map visualization
            if (!sender.places?.length || !recipient.places?.length) return;

            connections.push({
                type: 'correspondence',
                subtype: 'letter',
                category: 'Korrespondenz',
                sender: sender,
                recipient: recipient,
                from: {
                    lat: sender.places[0].lat,
                    lon: sender.places[0].lon,
                    name: sender.places[0].name
                },
                to: {
                    lat: recipient.places[0].lat,
                    lon: recipient.places[0].lon,
                    name: recipient.places[0].name
                },
                year: corr.year,
                date: corr.date,
                strength: 1 // Will be aggregated
            });
        });
    });

    // Aggregate: Count letters per pair
    const aggregated = new Map();
    connections.forEach(conn => {
        const key = `${conn.sender.id}-${conn.recipient.id}`;
        if (aggregated.has(key)) {
            aggregated.get(key).strength++;
            aggregated.get(key).years.push(conn.year);
        } else {
            aggregated.set(key, {
                ...conn,
                years: [conn.year]
            });
        }
    });

    return Array.from(aggregated.values());
}
```

#### 1.2 Integration in getPersonConnections

Erweitere [network-utils.js:10-54](docs/js/network-utils.js#L10-L54):

```javascript
export function getPersonConnections(person, allPersons) {
    const connections = [];

    if (!person.places || person.places.length === 0) {
        return connections;
    }

    // 1. AGRELON relationships (existing)
    if (person.relationships && Array.isArray(person.relationships)) {
        // ... existing code ...
    }

    // 2. NEW: Correspondence connections
    const corrConnections = extractCorrespondenceConnections(allPersons);
    corrConnections.forEach(conn => {
        if (conn.sender.id === person.id || conn.recipient.id === person.id) {
            connections.push(conn);
        }
    });

    return connections;
}
```

#### 1.3 Farbe für Korrespondenz

Erweitere [network-utils.js:141-151](docs/js/network-utils.js#L141-L151):

```javascript
export function getConnectionColor(category) {
    const colors = {
        'Familie': '#ff0066',        // Bright Magenta
        'Beruflich': '#00ccff',      // Bright Cyan
        'Sozial': '#ffcc00',         // Bright Yellow
        'Korrespondenz': '#9d4edd',  // Purple (neu)
        'Ort': '#6c757d',
        'Unbekannt': '#adb5bd'
    };

    return colors[category] || colors['Unbekannt'];
}
```

#### 1.4 Legende aktualisieren

Erweitere [index.html:110-141](docs/index.html#L110-L141):

```html
<div class="map-legend">
    <h4>Cluster-Farben</h4>
    <!-- ... existing ... -->

    <h4 style="margin-top: 16px;">Netzwerk-Verbindungen</h4>
    <div class="legend-item">
        <span class="legend-line" style="background: #ff0066;"></span>
        <span><strong>Familie</strong></span>
    </div>
    <div class="legend-item">
        <span class="legend-line" style="background: #00ccff;"></span>
        <span><strong>Beruflich</strong></span>
    </div>
    <div class="legend-item">
        <span class="legend-line" style="background: #ffcc00;"></span>
        <span><strong>Sozial</strong></span>
    </div>
    <!-- NEW -->
    <div class="legend-item">
        <span class="legend-line" style="background: #9d4edd;"></span>
        <span><strong>Korrespondenz</strong> (22 Briefe)</span>
    </div>
</div>
```

### Feature 2: Relation-Labels auf Linien

Aufwand: Mittel (1-2 Stunden)
Priorität: Hoch

#### 2.1 Label-Layer hinzufügen (app.js)

Erweitere drawConnectionLines() in [app.js](docs/js/app.js):

```javascript
function drawConnectionLines(connections) {
    if (connections.length === 0) return;

    clearConnectionLines();
    currentConnections = connections;

    // ... existing GeoJSON generation ...

    // NEW: Generate label features
    const labelFeatures = connections.map(conn => {
        const midLat = (conn.from.lat + conn.to.lat) / 2;
        const midLon = (conn.from.lon + conn.to.lon) / 2;

        // Label text: Use detailed type or category
        let labelText = conn.subtype || conn.category;

        // For AGRELON: Show exact type
        if (conn.type === 'agrelon' && conn.subtype) {
            labelText = conn.subtype; // "hat Tochter", "hat Schwester", etc.
        }

        // For correspondence: Show count if > 1
        if (conn.type === 'correspondence' && conn.strength > 1) {
            labelText = `${conn.strength}× Brief`;
        }

        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [midLon, midLat]
            },
            properties: {
                label: labelText,
                category: conn.category
            }
        };
    });

    const labelGeoJSON = {
        type: 'FeatureCollection',
        features: labelFeatures
    };

    // Add label source and layer
    map.addSource('connection-labels', {
        type: 'geojson',
        data: labelGeoJSON
    });

    map.addLayer({
        id: 'connection-labels-text',
        type: 'symbol',
        source: 'connection-labels',
        layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-anchor': 'center',
            'text-offset': [0, 0],
            'text-allow-overlap': false, // Avoid cluttering
            'text-ignore-placement': false
        },
        paint: {
            'text-color': '#2c3e50',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
            'text-halo-blur': 1
        }
    });
}
```

#### 2.2 Label-Layer entfernen

Erweitere clearConnectionLines() in [app.js:500-515](docs/js/app.js#L500-L515):

```javascript
function clearConnectionLines() {
    // Remove labels
    if (map.getLayer('connection-labels-text')) {
        map.removeLayer('connection-labels-text');
    }
    if (map.getSource('connection-labels')) {
        map.removeSource('connection-labels');
    }

    // ... existing line removal ...
}
```

#### 2.3 CSS für Labels

Füge zu [style.css](docs/css/style.css) hinzu:

```css
/* Connection labels styling */
.maplibregl-canvas {
    /* Ensure labels render with good contrast */
}

/* Optional: Hover effect for labels */
.connection-label-hover {
    font-weight: 600;
    text-shadow: 0 0 8px rgba(255, 255, 255, 1);
}
```

### Feature 3: Liniendicke nach Briefanzahl

Aufwand: Gering (30 Min)
Priorität: Mittel

#### 3.1 Strength-basierte Linienbreite

Erweitere drawConnectionLines() in app.js:

```javascript
map.addLayer({
    id: 'connection-lines',
    type: 'line',
    source: 'connections',
    paint: {
        'line-color': ['get', 'color'],
        'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'strength'],
            1, 3,   // 1 Brief -> 3px
            5, 6,   // 5 Briefe -> 6px
            10, 10  // 10+ Briefe -> 10px
        ],
        'line-opacity': 0.8
    }
});

map.addLayer({
    id: 'connection-lines-glow',
    type: 'line',
    source: 'connections',
    paint: {
        'line-color': ['get', 'color'],
        'line-width': [
            'interpolate',
            ['linear'],
            ['get', 'strength'],
            1, 6,   // 1 Brief -> 6px glow
            5, 10,  // 5 Briefe -> 10px glow
            10, 16  // 10+ Briefe -> 16px glow
        ],
        'line-opacity': 0.3,
        'line-blur': 4
    }
});
```

#### 3.2 Strength in GeoJSON Properties

Stelle sicher, dass strength im GeoJSON ist:

```javascript
const lineFeatures = connections.map(conn => ({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [[conn.from.lon, conn.from.lat], [conn.to.lon, conn.to.lat]]
    },
    properties: {
        category: conn.category,
        color: getConnectionColor(conn.category),
        strength: conn.strength || 1  // Default 1 for AGRELON
    }
}));
```

### Feature 4: Filter für Korrespondenz

Aufwand: Gering (30 Min)
Priorität: Mittel

#### 4.1 Filter-Toggle in Sidebar

Erweitere index.html Legende:

```html
<h4 style="margin-top: 16px;">Netzwerk-Verbindungen</h4>
<div class="filter-group">
    <label>
        <input type="checkbox" name="network-type" value="Familie" checked>
        <span class="legend-line" style="background: #ff0066;"></span>
        Familie
    </label>
    <label>
        <input type="checkbox" name="network-type" value="Beruflich" checked>
        <span class="legend-line" style="background: #00ccff;"></span>
        Beruflich
    </label>
    <label>
        <input type="checkbox" name="network-type" value="Sozial" checked>
        <span class="legend-line" style="background: #ffcc00;"></span>
        Sozial
    </label>
    <label>
        <input type="checkbox" name="network-type" value="Korrespondenz" checked>
        <span class="legend-line" style="background: #9d4edd;"></span>
        Korrespondenz
    </label>
</div>
```

#### 4.2 Filter-Logik in app.js

```javascript
// Track enabled network types
let enabledNetworkTypes = {
    'Familie': true,
    'Beruflich': true,
    'Sozial': true,
    'Korrespondenz': true
};

// Listen to network filter changes
document.querySelectorAll('input[name="network-type"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        enabledNetworkTypes[e.target.value] = e.target.checked;

        // Re-filter connections on hover
        const hoveredPerson = /* get current hovered person */;
        if (hoveredPerson) {
            let connections = getPersonConnections(hoveredPerson, allPersons);
            connections = connections.filter(c => enabledNetworkTypes[c.category]);
            drawConnectionLines(connections);
        }
    });
});
```

## Zeitplan

### Phase 1: Korrespondenz-Netzwerk (2-3h)
- [ ] extractCorrespondenceConnections() implementieren
- [ ] Integration in getPersonConnections()
- [ ] Farbe definieren und Legende aktualisieren
- [ ] Testen mit 22 bekannten Briefen

### Phase 2: Relation-Labels (1-2h)
- [ ] Label-Layer in drawConnectionLines()
- [ ] Midpoint-Berechnung für Label-Position
- [ ] Text-Styling (Halo, Größe, Font)
- [ ] clearConnectionLines() erweitern

### Phase 3: Liniendicke (30min)
- [ ] Interpolation basierend auf strength
- [ ] Glow-Layer anpassen
- [ ] Testen mit unterschiedlichen Werten

### Phase 4: Filter (30min)
- [ ] Checkboxes in Legende
- [ ] Event-Listener
- [ ] Filter-Logik

Gesamt: 4-6 Stunden

## Testing-Checkliste

- [ ] 22 Korrespondenz-Linien erscheinen (lila)
- [ ] AGRELON-Labels zeigen exakte Typen ("hat Tochter" statt "Familie")
- [ ] Liniendicke skaliert mit Briefanzahl
- [ ] Filter togglen Kategorien on/off
- [ ] Performance: Keine Verzögerung bei Hover
- [ ] Labels überlappen nicht zu stark
- [ ] Mobile: Labels lesbar auf kleinen Screens

## Offene Fragen

1. Sollen Korrespondenz-Linien gerichtet sein (Pfeil)? → Ja, sinnvoll für sent vs. received
2. Sollen mehrfache Briefe aggregiert werden? → Ja, bereits im Plan
3. Label bei allen Linien oder nur bei Hover? → Bei allen (mit text-allow-overlap: false)
4. Zeitfilter auf Korrespondenz-Jahr anwenden? → Ja, correspondence[].year filtern

## Dokumentation

Nach Umsetzung aktualisieren:
- [design.md](docs/knowledge/design.md): Netzwerk-Visualisierung Sektion
- [data-model.md](docs/knowledge/data-model.md): Korrespondenz-Matching Logik
- [JOURNAL.md](docs/knowledge/JOURNAL.md): Session-Eintrag
- [README.md](README.md): Feature-Liste Update
