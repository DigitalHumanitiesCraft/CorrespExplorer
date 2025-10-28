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

### Schritt 1: Netzwerk-View (Isoliert) ⏳ IN PROGRESS

**Ziel:** Neue Seite network.html mit AGRELON-Beziehungen

**Was wird gebaut:**
```
docs/network.html (neue Seite)
docs/js/network.js (neue Datei)
docs/css/network.css (neue Datei)
```

**Funktionalität:**
- Visualisierung aller 448 Frauen als Nodes
- 939 AGRELON-Beziehungen als Edges
- force-graph (vasturiano) für Layout
- Interaktiv: Click → Details, Hover → Tooltip
- Filter nach Beziehungstyp

**Daten-Pipeline Erweiterung:**
- Extrahiere relationships aus ra_ndb_beziehungen.xml
- Füge zu persons.json hinzu
- Lade nsl_agrelon.xml für Typ-Labels

**Aufwand:** 8-12 Stunden

**Nutzen:**
- Exploration von Beziehungsnetzwerken
- Identifikation von Hubs/Clustern
- Neue Forschungsfrage: "Wer ist zentral?"

**Integration in docs/:**
- Navigation erweitern: "Netzwerk" Link
- Eigenständige Seite, kein Layout-Umbau
- Später: Integration in Unified Interface

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

**Aufwand:** 6-8 Stunden

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

**Aufwand:** 8-12 Stunden

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

**Aufwand:** 6-8 Stunden

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

**Aufwand:** 4-6 Stunden

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

**Aufwand:** 8-12 Stunden

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

**Aufwand:** 10-14 Stunden (komplex wegen Overplotting)

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

**Aufwand:** 8-12 Stunden

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

**Aufwand:** 10-14 Stunden

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

**Aufwand:** 6-8 Stunden

**Nutzen:**
- Nachhaltigkeit
- Onboarding neuer Entwickler
- Wartbarkeit

---

## Zeitplan

**Realistisch mit Claude (2-3h Sessions):**

| Schritt | Aufwand | Sessions | Zeitraum |
|---------|---------|----------|----------|
| 1. Netzwerk-View | 8-12h | 4-5 | Woche 1 |
| 2. Kontext-Timeline | 6-8h | 3-4 | Woche 2 |
| 3. Unified Selection | 8-12h | 4-5 | Woche 3 |
| 4. Detail-Panel | 6-8h | 3-4 | Woche 4 |
| 5. Farbschema | 4-6h | 2-3 | Woche 4 |
| 6. Split-View | 8-12h | 4-5 | Woche 5 |
| 7. Timeline Gantt | 10-14h | 5-6 | Woche 6 |
| 8. Responsive | 8-12h | 4-5 | Woche 7 |
| 9. Performance | 10-14h | 5-6 | Woche 8 |
| 10. Dokumentation | 6-8h | 3-4 | Woche 8 |

**Gesamt:** ~105h = 40-50 Sessions = **8-10 Wochen**

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

**JETZT:** Schritt 1 - Netzwerk-View

**Phase A: Daten extrahieren** (30 Min)
- Pipeline erweitern: relationships Array
- AGRELON-Typen laden
- persons.json neu generieren

**Phase B: HTML/CSS Setup** (30 Min)
- network.html erstellen
- Navigation erweitern
- Basis-Layout

**Phase C: force-graph Integration** (2h)
- CDN einbinden
- Nodes + Edges aus persons.json
- Basis-Visualisierung

**Phase D: Interaktionen** (2h)
- Click → Detail-Panel (vorerst Alert)
- Hover → Tooltip
- Filter nach Beziehungstyp

**Phase E: Polish** (1h)
- Styling
- Performance-Test
- Commit + Deploy

**Session-Zeit:** 2-3 Stunden für vollständigen Schritt 1

Bereit für Schritt 1?
