# HerData V2 - Unified Visualization Interface

Konzept-Analyse und Umsetzbarkeitsplanung

Stand: 2025-10-28

## Vision: Unified Interface

Ein integriertes Interface mit drei überlagerbaren Visualisierungsebenen (Karte, Netzwerk, Timeline) und kontextsensitivem Detail-Panel.

## Umsetzbarkeits-Analyse

### 1. Hauptvisualisierung mit Layer-System

#### Layer A: Geografische Karte ✅ MÖGLICH

**Status:** Bereits implementiert (MapLibre GL JS)

**Vorhandene Basis:**
- MapLibre GL JS 4.7.1 funktioniert
- 227 Personen mit Geodaten (50.7%)
- Clustering implementiert
- Farbcodierung nach Rolle vorhanden

**Erweiterungen notwendig:**
- Layer-Switching Mechanismus
- Opacity-Control für Überblendungen
- Farbcodierung nach Berufsgruppen (statt Rolle)
- Canvas-basiertes Rendering für Performance

**Technische Umsetzung:**
```javascript
// MapLibre Layer mit variabler Opacity
map.setPaintProperty('persons-layer', 'circle-opacity', opacity);
```

**Aufwand:** 2-3 Stunden (Layer-Control + Farbschema-Wechsel)

**Risiko:** NIEDRIG

---

#### Layer B: Netzwerk-Graph ✅ MÖGLICH

**Status:** Nicht implementiert, Daten vorhanden

**Verfügbare Daten:**
- 939 AGRELON-Beziehungen (ra_ndb_beziehungen.xml)
- 38 Beziehungstypen (nsl_agrelon.xml)
- Bereits in persons.json extrahierbar

**Bibliotheks-Optionen:**

**Option 1: force-graph (vasturiano) - EMPFOHLEN**
- Pros: WebGL-Performance, 448 Nodes möglich, geografische Init-Position
- Cons: 200 KB Bundle
- Demo: https://github.com/vasturiano/force-graph
- Performance: Getestet bis 10.000 Nodes

**Option 2: D3.js Force Layout**
- Pros: Bereits verwendet (Timeline), keine neue Dependency
- Cons: Canvas-basiert, komplexere Implementierung, schlechtere Performance

**Option 3: Cytoscape.js**
- Pros: Sehr flexibel, gute Layouts
- Cons: 500 KB Bundle, Overkill für unseren Use Case

**Technische Herausforderung: Geografische Initialisierung**
```javascript
// Nodes mit geografischen Koordinaten starten
nodes.forEach(node => {
  if (node.places) {
    node.fx = longitudeToX(node.places[0].lon);
    node.fy = latitudeToY(node.places[0].lat);
  }
});
```

**Daten-Pipeline-Erweiterung notwendig:**
```python
# In build_herdata_new.py Phase 3: Beziehungen laden
beziehungen_tree = ET.parse(self.new_export_dir / 'ra_ndb_beziehungen.xml')
# Füge "relationships" Array zu person hinzu
```

**Aufwand:** 8-12 Stunden (Daten-Extraktion + Visualisierung + Interaktion)

**Risiko:** MITTEL (neue Bibliothek, Koordinaten-Transformation komplex)

---

#### Layer C: Zeitstrahl ✅ TEILWEISE MÖGLICH

**Status:** Timeline vorhanden, aber nicht als Layer

**Vorhandene Basis:**
- D3.js Timeline implementiert (Session 10)
- 53 Jahre mit Briefdaten (1762-1824)
- Brush-Selektion entfernt (Session 10 Architektur-Revision)

**Konzept-Änderung notwendig:**
Statt Briefzahlen → **Lebenslinien der 448 Frauen**

**Visualisierung:**
```
1760 ────────────────────────────────── 1830
      ████████████████ Charlotte Kestner
           ███████████████████ Karoline Berg
                ████████████ Anna Altmutter
```

**Technische Umsetzung:**
- D3.js Gantt-Chart Stil
- Jede Frau = horizontale Linie (birth → death)
- Farbcodierung nach Berufsgruppe
- Hover: Name + Lebensdaten
- Brush für Zeitfilter

**Daten vorhanden:**
- 421 von 448 haben Lebensdaten (94%)
- letter_years für Aktivitätsmarkierungen

**Aufwand:** 6-8 Stunden (Neuimplementierung als Gantt-Chart)

**Risiko:** MITTEL (448 Linien = Performance-Challenge, Overplotting)

---

#### Innovation: Semi-transparente Überlagerung ⚠️ SCHWIERIG

**Konzept:**
```
Karte (Opacity 70%)
  + Netzwerk (Opacity 50%)
  = Geografische Beziehungen sichtbar
```

**Technische Herausforderungen:**

1. **Canvas-Layering:**
   - MapLibre = WebGL Canvas
   - force-graph = Canvas 2D oder WebGL
   - Timeline = SVG (D3.js)
   - **Problem:** Verschiedene Rendering-Technologien

2. **Z-Index Management:**
   - SVG über Canvas → möglich
   - Canvas über Canvas → schwierig (nur per CSS)
   - WebGL über WebGL → sehr schwierig

3. **Performance:**
   - 3 simultane Visualisierungen = 3× Render-Last
   - WebGL-Kontexte: Max 8-16 pro Browser
   - Jede Layer braucht eigenen Kontext

**Alternative Lösung: TAB-BASED SWITCHING**
```
[Karte] [Netzwerk] [Timeline] [Karte+Netz] [Alle]

Tab "Alle":
┌─────────────────┐
│ Karte (50%)     │
├─────────────────┤
│ Netzwerk (25%)  │
├─────────────────┤
│ Timeline (25%)  │
└─────────────────┘
```

**Aufwand Semi-transparent:** 40-60 Stunden (R&D intensiv, fragliche UX)

**Aufwand Tab-based:** 8-12 Stunden (bewährtes Pattern)

**Risiko Semi-transparent:** HOCH (technisch fragwürdig, Performance-Probleme)

**Risiko Tab-based:** NIEDRIG

**EMPFEHLUNG:** Tab-based Switching statt Overlay

---

### 2. Detail-Panel (40% Breite) ✅ MÖGLICH

**Status:** Konzept ähnlich zu aktueller Personenseite

**Aktuell:**
- person.html mit 6 Tabs
- Vollbild-Seite

**V2 Konzept:**
- Sidebar-Panel
- Akkordeon-Stil (kollapsible Sektionen)
- In-Context statt separate Seite

**Technische Umsetzung:**
```html
<div class="main-container">
  <div class="visualization-panel"><!-- 60% --></div>
  <div class="detail-panel"><!-- 40% --></div>
</div>
```

**Akkordeon-Component:**
```javascript
class AccordionPanel {
  sections: ['Namen', 'Berufe', 'Orte', 'Beziehungen', 'Briefe']
  toggle(section) { /* collapse/expand */ }
  loadContent(personId) { /* fetch data */ }
}
```

**Vorteile:**
- Kein Context-Switch (gleiche Seite)
- Progressive Disclosure
- Besser für Vergleiche

**Aufwand:** 4-6 Stunden (HTML/CSS + State Management)

**Risiko:** NIEDRIG (Standard-Pattern)

---

### 3. Kontext-Timeline (100% Breite, 15% Höhe) ✅ MÖGLICH

**Status:** Neue Komponente

**Konzept:**
- Immer sichtbar am unteren Rand
- Mini-Übersicht ALLER 448 Frauen
- Brushing für Filter

**Visualisierung:**
```
1760 ─────────────────────────────────────────── 1830
     │││││││││││││││││││││││││││││││││││││││││││
     ↑ 448 dünne Linien

     ████████████████ ← aktuell selektierte hervorgehoben
```

**Technische Umsetzung:**
- D3.js mit aggregiertem Rendering
- Canvas statt SVG (448 Linien = Performance)
- Brushing für Zeitfilter

**Ähnlich zu:** D3 Horizon Charts / Context+Focus Pattern

**Aufwand:** 6-8 Stunden (Canvas-Rendering + Brushing)

**Risiko:** MITTEL (448 Linien = Overplotting, braucht Aggregation)

---

### 4. Unified Selection Model ✅ MÖGLICH

**Konzept:** Eine Selektion wirkt auf alle Views

**Technische Umsetzung: Event-Bus Pattern**

```javascript
// Central State Manager
class SelectionManager {
  selectedPersons = [];
  selectedPlaces = [];
  selectedTimeRange = [1762, 1824];

  selectPerson(id) {
    this.selectedPersons = [id];
    this.emit('selection:person', id);
  }

  on(event, callback) { /* subscribe */ }
  emit(event, data) { /* publish */ }
}

// Views subscribieren
selectionManager.on('selection:person', (id) => {
  mapView.highlightPerson(id);
  networkView.highlightPerson(id);
  timelineView.highlightPerson(id);
  detailPanel.loadPerson(id);
});
```

**Alternative: Redux-Style Store**
```javascript
const store = {
  state: { selected: [], filtered: [], timeRange: [] },
  subscribe(listener) {},
  dispatch(action) {}
};
```

**Aufwand:** 8-12 Stunden (State Management + View-Synchronisation)

**Risiko:** MITTEL (Synchronisation kompliziert, Race Conditions möglich)

---

### 5. Filter-Hierarchie ⚠️ KOMPLEX

**Konzept:**
```
Global → View-spezifisch → Temporär (Hover)
```

**Problem: Filter-Kombination**

Beispiel:
- Global: "Nur Künstlerinnen"
- Karte: "Nur Berlin"
- Timeline: "1800-1820"
- Hover: "Anna Altmutter"

**Welche Personen werden angezeigt?**
- Karte: Künstlerinnen in Berlin (1800-1820)
- Netzwerk: Künstlerinnen in Berlin (1800-1820) + Beziehungen
- Timeline: Künstlerinnen in Berlin (Gesamt-Lebenszeit oder nur 1800-1820?)

**Technische Herausforderung: Filter-Logik**

```javascript
function getVisiblePersons(view) {
  let persons = allPersons;

  // Global Filters (AND)
  persons = persons.filter(p => matchesGlobalFilters(p));

  // View Filters (AND)
  if (view === 'map') {
    persons = persons.filter(p => matchesMapFilters(p));
  }

  // Temporal Filter (AND)
  persons = persons.filter(p => overlapsWith(p.dates, timeRange));

  // Hover (OR - additive highlight)
  return persons;
}
```

**Edge Cases:**
- Person in Timeline-Range, aber keine Geodaten → auf Karte unsichtbar
- Person im Zeitraum geboren, aber außerhalb gestorben → ganz zeigen oder nur Overlap?
- Beziehungen: Beide Personen gefiltert oder reicht eine?

**Aufwand:** 12-16 Stunden (Filter-Engine + Unit Tests + Edge Cases)

**Risiko:** HOCH (viele Edge Cases, UX-Entscheidungen notwendig)

---

### 6. Einheitliches Farbschema ✅ MÖGLICH

**Konzept: Berufsgruppen als primäre Kodierung**

**Aktuell:**
- 7 Berufsgruppen definiert (Session 9)
- Farbcodierung nach Briefaktivität (blau/grau/grün)

**V2 Farbschema:**
```javascript
const OCCUPATION_COLORS = {
  'Künstlerisch': '#2c5f8d',      // Steel Blue (aktuelle Hauptfarbe)
  'Literarisch': '#e63946',       // Red
  'Musikalisch': '#f77f00',       // Orange
  'Hof/Adel': '#9b59b6',         // Purple
  'Bildung': '#52b788',          // Green
  'Sonstiges': '#6c757d',        // Gray
  'Keine': '#adb5bd'             // Light Gray
};
```

**Opacity = Datenqualität:**
```javascript
function getOpacity(person) {
  let score = 0;
  if (person.gnd) score += 0.4;
  if (person.dates?.birth && person.dates?.death) score += 0.3;
  if (person.places?.length > 0) score += 0.2;
  if (person.biography) score += 0.1;
  return 0.4 + (score * 0.6); // Range: 0.4 - 1.0
}
```

**Aufwand:** 4-6 Stunden (Farbschema definieren + anwenden)

**Risiko:** NIEDRIG

---

### 7. Responsive Adaption ✅ MÖGLICH

**Desktop (>1400px):** 3-Spalten wie vorgesehen

**Tablet (768-1400px):** Drawer-Pattern
```css
.detail-panel {
  position: fixed;
  right: -400px;
  transition: right 0.3s;
}
.detail-panel.open {
  right: 0;
}
```

**Mobile (<768px):** Stack-Layout
```css
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }
}
```

**Aufwand:** 6-8 Stunden (CSS + JS für Drawer)

**Risiko:** NIEDRIG

---

## Gesamtbewertung

### Was ist MÖGLICH und SINNVOLL:

✅ **1. Layer-Switching (statt Overlay):**
- [Karte] [Netzwerk] [Timeline] Tabs
- Jeweils Vollbild-Darstellung
- State bleibt erhalten beim Wechsel

✅ **2. Detail-Panel (Sidebar):**
- 40% Breite, Akkordeon-Stil
- Kontextsensitiv zur Selektion
- Kollapsible Sektionen

✅ **3. Kontext-Timeline (Footer):**
- Persistent am unteren Rand
- Mini-Übersicht aller 448 Frauen
- Brushing für Zeitfilter

✅ **4. Unified Selection:**
- Event-Bus für View-Synchronisation
- Eine Selektion → alle Views reagieren

✅ **5. Farbschema Berufsgruppen:**
- 7 Farben + Opacity für Datenqualität
- Konsistent über alle Views

✅ **6. Responsive Design:**
- Desktop: 3-Spalten
- Tablet: Drawer
- Mobile: Stack

### Was ist SCHWIERIG / NICHT EMPFOHLEN:

❌ **Semi-transparente Layer-Überlagerung:**
- Technisch sehr komplex (WebGL + Canvas + SVG)
- Performance-Probleme wahrscheinlich
- UX-Mehrwert fraglich
- **Alternative:** Tab-Switching + Split-Views

⚠️ **Filter-Hierarchie (Global/View/Temporal):**
- Viele Edge Cases
- Komplexe Logik
- Braucht umfangreiche Tests
- **Empfehlung:** Vereinfachtes Modell (nur Global + Temporal)

---

## Implementierungsplan

### Phase 1: Foundation (1 Woche)
- [ ] docs-v2 Struktur aufsetzen
- [ ] State Management (SelectionManager)
- [ ] Layout-Grid (60/40 Split)
- [ ] Tab-Switching Mechanismus
- [ ] Farbschema definieren

### Phase 2: Views (2 Wochen)
- [ ] Karte-View portieren + Farbschema
- [ ] Netzwerk-View implementieren (force-graph)
- [ ] Timeline-View als Gantt-Chart
- [ ] Kontext-Timeline (Footer)

### Phase 3: Integration (1 Woche)
- [ ] Unified Selection implementieren
- [ ] Detail-Panel (Akkordeon)
- [ ] View-Synchronisation testen
- [ ] Filter-System (vereinfacht)

### Phase 4: Polish (1 Woche)
- [ ] Responsive Design
- [ ] Performance-Optimierung
- [ ] Accessibility
- [ ] Dokumentation

**Gesamt-Aufwand:** 5 Wochen (bei Vollzeit-Entwicklung)

**Realistisch mit Claude:** 10-15 Sessions à 2-3 Stunden

---

## Technologie-Stack V2

**Bestehend (behalten):**
- MapLibre GL JS 4.7.1 (Karte)
- D3.js v7 (Timeline, Achsen, Brushing)
- Vanilla JavaScript ES6+

**Neu hinzufügen:**
- **force-graph** (vasturiano) für Netzwerk
- **Optional:** Zustand (State Management, 1 KB)
- **Optional:** d3-scale-chromatic (Farbpaletten)

**Gesamt-Bundle:**
- Aktuell: ~600 KB (MapLibre + D3 + CSS)
- V2: ~850 KB (+ force-graph 200 KB + Zustand 1 KB)
- Akzeptabel für Forschungstool

---

## Empfehlung

**JA, umsetzbar!**

Aber mit **Anpassungen am Konzept:**

1. ✅ **Layer-Switching** statt semi-transparente Überlagerung
2. ✅ **Vereinfachte Filter** (Global + Temporal, keine View-spezifisch)
3. ✅ **Detail-Panel** wie beschrieben
4. ✅ **Kontext-Timeline** wie beschrieben
5. ✅ **Unified Selection** wie beschrieben

**Zusätzliche Split-View Option:**
```
┌──────────────┬──────────────┐
│ Karte (50%)  │ Netzwerk (50%)│
└──────────────┴──────────────┘
```

Statt Overlay: Nebeneinander, synchronisiert.

**Nächster Schritt:**
Soll ich mit dem Prototyp in docs-v2 beginnen?
