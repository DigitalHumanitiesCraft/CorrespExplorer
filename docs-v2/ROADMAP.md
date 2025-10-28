# HerData V2 - Schrittweise Umsetzung

Iterative Entwicklung mit ständig funktionsfähigem Produkt

Stand: 2025-10-28

## Philosophie

Jeder Schritt:
- Ist eigenständig funktionsfähig
- Bringt Mehrwert für Nutzer
- Kann getestet und deployed werden
- Baut auf vorherigen Schritten auf

## Implementierungs-Schritte

### Schritt 1: Netzwerk-View (Isoliert) ✅ COMPLETED

**Ziel:** Neue Seite network.html mit AGRELON-Beziehungen

**Was gebaut wurde:**
```
docs/network.html (neue Seite)
docs/js/network.js (neue Datei)
docs/css/network.css (neue Datei)
preprocessing/build_herdata_new.py (erweitert)
```

**Implementierte Funktionalität:**
- Visualisierung aller 448 Frauen als Nodes
- 43 AGRELON-Beziehungen als Edges (43 unique pairs, deduplicated from 86 entries)
- force-graph v1.43.5 für Layout
- Interaktiv: Click → Person-Details, Hover → Tooltip
- Filter nach Beziehungstyp (38 Typen)
- Name-Suche mit Highlighting
- Reset-Funktion mit Zoom-to-Fit

**Daten-Pipeline Erweiterung:**
- Relationships aus ra_ndb_beziehungen.xml extrahiert
- 38 AGRELON-Typen aus nsl_agrelon.xml geladen
- Bidirektionale Beziehungen mit reciprocal_type (86 entries = 43 pairs × 2)
- relationships Array in persons.json hinzugefügt
- Frontend dedupliziert zu 43 unique links

**Status:** Abgeschlossen (2 Sessions)

**Erreichte Ziele:**
- Exploration von Beziehungsnetzwerken möglich
- 67 Frauen mit Beziehungen prominiert sichtbar
- 381 isolierte Frauen als Kontext (grau)
- Forschungsfrage: "Wer ist zentral?" beantwortbar

**Integration in docs/:**
- Navigation erweitert: "Karte" + "Netzwerk" Links
- Eigenständige Seite, konsistentes Layout
- Bereit für spätere Integration in Unified Interface

**Commits:**
- 199e3f2: Add AGRELON relationship extraction to pipeline
- e204647: Implement network view with AGRELON relationship visualization

---

### Schritt 2: Kontext-Timeline (Footer) 🔲 PENDING

**Ziel:** Persistent Timeline am unteren Rand ALLER Seiten

**Was wird gebaut:**
```
docs/js/context-timeline.js (neue Datei)
docs/css/context-timeline.css (neue Datei)
Änderung: docs/index.html, person.html, network.html (Footer hinzufügen)
```

**Funktionalität:**
- Mini-Übersicht aller 448 Frauen als Lebenslinien
- Brushing für Zeitfilter (1762-1824)
- Hervorhebung der aktuell sichtbaren Personen
- Synchronisation mit aktiver Seite

**Technische Umsetzung:**
- D3.js Canvas-Rendering (Performance)
- Event-Bus für Cross-Page Communication
- localStorage für persistenten Zeitfilter

**Nutzen:**
- Zeitlicher Kontext immer sichtbar
- Schnelle Zeitfilter-Anpassung
- Overview+Detail Pattern

**Integration:**
- Footer-Komponente in alle Seiten
- CSS: position: sticky bottom
- Kollapsible Minimierung möglich

---

### Schritt 3: Unified Selection (State Management) 🔲 PENDING

**Ziel:** Selektion funktioniert über alle Seiten hinweg

**Was wird gebaut:**
```
docs/js/state-manager.js (neue Datei)
Änderung: docs/js/app.js, person.js, network.js (State integrieren)
```

**Funktionalität:**
- Zentrale SelectionManager Klasse
- localStorage für Session-Persistenz
- Event-Bus für View-Synchronisation
- API: selectPerson(), selectPlace(), setTimeRange()

**Beispiel-Flow:**
```
1. User klickt auf Karte → Person ausgewählt
2. SelectionManager speichert ID
3. Netzwerk-Seite liest Selection aus localStorage
4. Netzwerk zeigt Person zentriert + Edges hervorgehoben
```

**Nutzen:**
- Nahtlose Navigation zwischen Views
- Context bleibt erhalten
- Multi-View Vergleiche möglich

**Integration:**
- Alle bestehenden Seiten bleiben funktionsfähig
- SelectionManager ist optional (progressive enhancement)
- Fallback: Funktioniert auch ohne JS-State

---

### Schritt 4: Detail-Panel (Sidebar) 🔲 PENDING

**Ziel:** Einheitliches Detail-Panel für alle Seiten

**Was wird gebaut:**
```
docs/js/detail-panel.js (neue Datei)
docs/css/detail-panel.css (neue Datei)
Änderung: docs/index.html, network.html (Layout: 60/40 Split)
```

**Funktionalität:**
- Akkordeon-Stil mit Sektionen
- Kontextsensitiv zur Selektion
- Responsive: Desktop=Sidebar, Mobile=Drawer
- Progressive Disclosure

**Sektionen:**
```
▼ Überblick (Stats, Badges)
▼ Biografie (Text)
▼ Korrespondenz (2 Briefe, 19 Erwähnungen)
▼ Orte (1: Berlin)
▼ Berufe (1: Hofdame)
▼ Netzwerk (Preview: 27 Beziehungen)
```

**Nutzen:**
- Konsistente UX über alle Views
- In-Context Details (kein Seitenwechsel)
- Platzsparend (Akkordeon)

**Migration:**
- person.html Tabs → Akkordeon-Sektionen
- Inhalte wiederverwendbar
- Beide Versionen parallel nutzbar (person.html = Vollbild, Panel = Sidebar)

---

### Schritt 5: Farbschema Berufsgruppen 🔲 PENDING

**Ziel:** Einheitliche Farbkodierung über alle Views

**Was wird geändert:**
```
docs/css/style.css (Farbvariablen erweitern)
docs/js/app.js (Karte: Cluster-Farben nach Beruf)
docs/js/network.js (Nodes nach Beruf einfärben)
docs/js/context-timeline.js (Linien nach Beruf)
```

**Farbschema:**
```javascript
{
  'Künstlerisch': '#2c5f8d',    // Steel Blue
  'Literarisch': '#e63946',     // Red
  'Musikalisch': '#f77f00',     // Orange
  'Hof/Adel': '#9b59b6',       // Purple
  'Bildung': '#52b788',        // Green
  'Sonstiges': '#6c757d',      // Gray
  'Keine': '#adb5bd'           // Light Gray
}
```

**Opacity = Datenqualität:**
- 100%: GND + Vollständige Daten
- 70%: Basisdaten
- 40%: Lückenhaft

**Nutzen:**
- Visuelle Konsistenz
- Bessere Vergleichbarkeit
- Forschungsfrage: "Berufsverteilung räumlich/zeitlich"

---

### Schritt 6: Split-View Modus 🔲 PENDING

**Ziel:** Zwei Views nebeneinander vergleichen

**Was wird gebaut:**
```
docs/compare.html (neue Seite)
docs/js/split-view.js (neue Datei)
```

**Layout:**
```
┌──────────────────────────────────────────────┐
│ [View 1: Karte ▼] | [View 2: Netzwerk ▼]   │
├──────────────────────┬───────────────────────┤
│                      │                       │
│   Karte (50%)       │   Netzwerk (50%)     │
│   Synchronisiert    │   Synchronisiert     │
│                      │                       │
└──────────────────────┴───────────────────────┘
```

**Funktionalität:**
- Dropdown: Wähle View 1 (Karte/Netzwerk/Timeline)
- Dropdown: Wähle View 2 (Karte/Netzwerk/Timeline)
- Unified Selection: Click in View 1 → View 2 reagiert
- Sync-Toggle: Zeitfilter synchronisiert Ja/Nein

**Nutzen:**
- Direkte Vergleiche möglich
- Räumliche + soziale Muster gleichzeitig
- Exploration komplexer Zusammenhänge

---

### Schritt 7: Timeline als Gantt-Chart 🔲 PENDING

**Ziel:** Lebenslinien-Visualisierung statt Briefzahlen

**Was wird geändert:**
```
docs/js/timeline.js (komplette Überarbeitung)
docs/css/timeline.css (neue Styles)
```

**Alte Timeline:**
- Histogram: Briefzahlen pro Jahr
- 62 Bars (1762-1824)

**Neue Timeline:**
- Gantt-Chart: 448 horizontale Linien
- Jede Linie = Lebenszeit (birth → death)
- Farbkodierung nach Berufsgruppe
- Aktivitätsmarkierungen (letter_years)

**Herausforderung: Overplotting (448 Linien)**

Lösung 1: Aggregation
```
Berufsgruppe: Künstlerisch (222 Frauen)
  ████████████████████████████████ (Band statt einzelne Linien)
```

Lösung 2: Zooming
```
Zoom-Level 1: Aggregiert (Bands)
Zoom-Level 2: Einzellinien sichtbar
```

Lösung 3: Filtering
```
Nur gefilterte Frauen als Einzellinien (z.B. 50 statt 448)
```

**Nutzen:**
- Biografischer Kontext sichtbar
- Generationen-Übersicht
- Lebenszeit-Overlaps erkennbar

---

### Schritt 8: Responsive Optimierung 🔲 PENDING

**Ziel:** Optimale UX auf allen Geräten

**Was wird geändert:**
```
docs/css/*.css (Media Queries erweitern)
docs/js/*.js (Touch-Events, Drawer-Pattern)
```

**Desktop (>1400px):**
- 60/40 Split (View + Detail-Panel)
- Kontext-Timeline persistent
- Alle Features verfügbar

**Tablet (768-1400px):**
- Drawer für Detail-Panel (overlay)
- Kontext-Timeline reduziert
- Touch-optimierte Controls

**Mobile (<768px):**
- Stack-Layout (View → Details)
- Kontext-Timeline optional (toggle)
- Vereinfachte Filter

**Nutzen:**
- Mobile-first DH Research
- Tablet für Teaching/Präsentationen
- Desktop für tiefe Analysen

---

### Schritt 9: Performance & Accessibility 🔲 PENDING

**Ziel:** Production-Ready Quality

**Was wird optimiert:**
- Lazy Loading für Views
- Code Splitting (separate JS per View)
- WebGL Optimierung (MapLibre + force-graph)
- ARIA Labels für Screen Reader
- Keyboard Navigation
- Focus Management

**Tools:**
- Lighthouse Audit
- axe DevTools (Accessibility)
- Chrome Performance Profiler

**Targets:**
- Time to Interactive: <2s
- Lighthouse Score: >90
- WCAG AA Compliance

**Nutzen:**
- Barrierefreiheit für alle Nutzer
- Schnelle Ladezeiten
- Professional Quality

---

### Schritt 10: Dokumentation & Testing 🔲 PENDING

**Ziel:** Vollständige Dokumentation

**Was wird erstellt:**
```
docs/USAGE.md (User Guide)
docs/DEVELOPMENT.md (Developer Guide)
docs/API.md (State Manager API)
tests/ (Unit Tests für State Manager)
```

**Inhalte:**
- User Guide: Screenshots, Workflows
- Developer Guide: Architektur, Komponenten
- API Docs: SelectionManager, DetailPanel, etc.
- Tests: Jest für State Logic

**Nutzen:**
- Nachhaltigkeit
- Onboarding neuer Entwickler
- Wartbarkeit

---

## Fortschritt

| Schritt | Status |
|---------|--------|
| 1. Netzwerk-View | ✅ Completed |
| 2. Kontext-Timeline | 🔲 Pending |
| 3. Unified Selection | 🔲 Pending |
| 4. Detail-Panel | 🔲 Pending |
| 5. Farbschema | 🔲 Pending |
| 6. Split-View | 🔲 Pending |
| 7. Timeline Gantt | 🔲 Pending |
| 8. Responsive | 🔲 Pending |
| 9. Performance | 🔲 Pending |
| 10. Dokumentation | 🔲 Pending |

## Entscheidungspunkte

Nach jedem Schritt:
- ✓ Funktioniert das Feature?
- ✓ Bringt es Mehrwert?
- ✓ Soll es weiterentwickelt werden?

**Stop-Kriterien:**
- Feature zu komplex
- Performance-Probleme
- Nutzer-Feedback negativ

## Nächster Schritt

Schritt 2: Kontext-Timeline (Footer)
