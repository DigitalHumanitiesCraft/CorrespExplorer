# Wissenskorb - Implementation Status

Aktueller Stand der Wissenskorb-Implementierung im HerData-Projekt.

Stand: 05.11.2025

## Was ist implementiert

### Kern-Infrastruktur (FERTIG)

1. **BasketManager (docs/js/basket-manager.js)**
   - Singleton-Pattern für globale Verfügbarkeit
   - Local Storage Persistierung
   - Event-System (add, remove, clear, change, sync)
   - Kein Limit (MAX_ITEMS = null)
   - CSV/JSON Export-Funktionen
   - Multi-Tab-Synchronisation via Storage Events

2. **Navigation-Integration (FERTIG)**
   - Wissenskorb-Link in allen 5 Navbar-Varianten
   - Badge mit Counter (versteckt bei 0)
   - Automatische Updates über BasketManager-Events
   - navbar-loader.js: initBasket() und updateBasketBadge()

3. **Dedizierte Seite (FERTIG)**
   - docs/wissenskorb.html
   - Zwei-Spalten-Layout (Filter-Panel links, Detail-Panel rechts)
   - Personentabelle mit Filter und Sortierung
   - Beziehungsnetzwerk-Visualisierung (Cytoscape.js)
   - Drei Netzwerk-Modi: AGRELON Beziehungen, gemeinsame Orte, gemeinsame Berufe
   - Edge-Tooltips zeigen Beziehungstypen und Kardinalität
   - Edge-Grouping für mehrfache Verbindungen
   - Export-Buttons (CSV/JSON)
   - Responsive Design

4. **Synthesis-Integration (FERTIG)**
   - state.basket entfernt
   - Alle Funktionen auf BasketManager umgestellt
   - Star-Buttons funktionieren weiterhin
   - Timeline und Beziehungs-Visualisierungen im Tab
   - Export-Funktionen nutzen BasketManager

5. **Brief-Explorer-Integration (FERTIG)**
   - "Add filtered to Basket" Button in active-filters Sektion
   - Batch-Add: Fügt alle gefilterten Personen hinzu
   - Überspringt bereits vorhandene Personen
   - Toast-Benachrichtigungen mit Feedback
   - Count-Update synchron mit Filter-Änderungen

6. **Person-Detailseite-Integration (FERTIG)**
   - Toggle-Button im Header neben Name
   - Visueller State-Wechsel (rot/blau, Text ändert sich)
   - Toast-Benachrichtigungen
   - Button-State wird beim Laden aktualisiert

### Styling (FERTIG)

1. **docs/css/basket.css**
   - Komplettes Styling für Wissenskorb-Seite
   - Toast-Notifications
   - Role-basierte Farben im Netzwerk
   - Responsive Layout

2. **docs/css/style.css**
   - nav-badge Styles
   - nav-link-basket positioning

3. **docs/css/stats.css**
   - filter-actions Layout
   - btn-add-filtered Styles

4. **docs/css/person-cards.css**
   - person-header-top Layout
   - btn-basket-toggle Styles mit States

## Was NICHT implementiert ist

### Nicht umgesetzte Features

1. **Karten-Integration**
   - Keine Add-to-Basket Buttons in Marker-Popups
   - Müsste in docs/js/app.js (Karte) integriert werden

2. **Erweiterte Visualisierungen auf Wissenskorb-Seite**
   - Keine Timeline-Visualisierung
   - Keine geografische Verteilung (bewusst verworfen, siehe decisions.md)
   - Keine Berufsverteilung
   - Beziehungsnetzwerk mit 3 Modi implementiert (AGRELON, Orte, Berufe)

3. **Sharing-Funktionalität**
   - Keine URL-basierte Sharing-Funktion
   - Keine Import/Export von Sammlungen zwischen Geräten

4. **Notiz-Funktion**
   - Nutzer können keine Notizen zu Personen hinzufügen

5. **Mehrere Sammlungen**
   - Nur eine globale Sammlung
   - Keine benannten Sammlungen oder Wechsel zwischen Sammlungen

## Funktionsweise

### Datenfluss

```
Nutzer klickt Add-Button
    ↓
BasketManager.add(person)
    ↓
Validierung (person.id vorhanden?)
    ↓
Speichern in Local Storage
    ↓
Events feuern: 'add', 'change'
    ↓
Alle Listener werden benachrichtigt
    ↓
UI-Updates:
  - Badge-Counter in Navbar
  - Button-State (gefüllt/ungefüllt)
  - Toast-Notification
  - Wissenskorb-Seite (falls offen)
    ↓
Bei Multi-Tab: Storage-Event synchronisiert andere Tabs
```

### Local Storage Schema

```json
{
  "herdata_basket": {
    "version": "1.0",
    "updated": "2025-11-05T12:00:00Z",
    "items": [
      {
        "id": "person-123",
        "name": "Anna Amalia",
        "addedAt": "2025-11-05T11:30:00Z",
        "dates": { "birth": "1739", "death": "1807" },
        "role": "sender",
        "gnd": "118502662",
        "occupations": [...],
        "relationships": [...],
        ...
      }
    ]
  }
}
```

## Code-Organisation

### Datei-Struktur

```
docs/
├── js/
│   ├── basket-manager.js       (319 Zeilen, Kern-Bibliothek)
│   ├── wissenskorb.js          (478 Zeilen, Dedizierte Seite)
│   ├── navbar-loader.js        (120 Zeilen, inkl. Badge-Update)
│   ├── stats.js                (1078 Zeilen, +70 für Basket)
│   └── person.js               (714 Zeilen, +85 für Basket)
├── css/
│   ├── basket.css              (398 Zeilen, vollständig)
│   ├── style.css               (+20 Zeilen für Badge)
│   ├── stats.css               (+67 Zeilen für Button)
│   └── person-cards.css        (+52 Zeilen für Button)
├── wissenskorb.html            (107 Zeilen)
├── stats.html                  (+1 Script-Tag, +9 HTML)
├── person.html                 (+1 Script-Tag, +6 HTML)
└── synthesis/
    ├── index.html              (+1 Script-Tag)
    └── js/app.js               (~30 Zeilen geändert)
```

### Code-Metriken

- Neuer Code: ~900 Zeilen
- Geänderter Code: ~50 Zeilen
- Neue Dateien: 4
- Geänderte Dateien: 12

## Bekannte Einschränkungen

### Technische Limitierungen

1. **Local Storage Quota**
   - Browser-Limit ca. 5-10 MB
   - Bei 448 Personen mit allen Daten: ~200 KB
   - Kein Problem in der Praxis

2. **Performance Netzwerk-Visualisierung**
   - Ab ~50 Personen könnte es langsam werden
   - Aktuell einfaches Circular Layout
   - Force-directed Layout wäre performanter

3. **Keine Server-seitige Persistierung**
   - Daten nur im Browser
   - Nicht synchronisiert zwischen Geräten
   - Verloren bei Browser-Cache-Löschung

### UX-Verbesserungspotenzial

1. **Batch-Add Feedback**
   - Bei vielen Personen (>50) könnte es lange dauern
   - Kein Progress-Indicator

2. **Netzwerk-Graph Usability**
   - Bei vielen Personen überladen
   - Cytoscape.js bietet Zoom/Pan (minZoom: 0.5, maxZoom: 2)
   - Filter für "Nur Personen mit Verbindungen" vorhanden
   - Weitere Filter für Beziehungstypen möglich

3. **Export-Format**
   - CSV ist sehr einfach (nur Stammdaten)
   - Keine vollständigen relationalen Daten

## Testing

### Manuelle Tests erforderlich

1. **Basis-Funktionalität**
   - [ ] Add/Remove in allen Ansichten
   - [ ] Badge-Counter aktualisiert sich
   - [ ] Persistierung über Refresh
   - [ ] Multi-Tab-Synchronisation

2. **Edge Cases**
   - [ ] Leerer Korb
   - [ ] Viele Personen (100+)
   - [ ] Duplikate verhindern
   - [ ] Storage-Quota-Überschreitung

3. **Browser-Kompatibilität**
   - [ ] Chrome/Edge
   - [ ] Firefox
   - [ ] Safari
   - [ ] Mobile Browser

4. **Responsive Design**
   - [ ] Desktop
   - [ ] Tablet
   - [ ] Mobile

## Nächste Schritte

### Priorität 1: Testing und Bug-Fixes

1. Manuelle Tests durchführen
2. Bug-Fixes basierend auf Tests
3. Performance-Tests mit vielen Personen

### Priorität 2: Dokumentation

1. Diese Status-Datei in wissenskorb.md integrieren
2. User-Documentation erstellen
3. Code-Kommentare vervollständigen

### Priorität 3: UX-Verbesserungen

1. Progress-Indicator für Batch-Add
2. Netzwerk-Graph Zoom/Pan
3. Erweiterte Export-Optionen

### Optional: Erweiterte Features

1. Karten-Integration
2. Timeline-Visualisierung auf Wissenskorb-Seite
3. Notiz-Funktion
4. Multiple Sammlungen
5. Sharing via URL

## Zusammenfassung

Der Wissenskorb ist **vollständig funktional** und in 4 von 5 Ansichten integriert (fehlt nur Karte). Die Kern-Features (Persistierung, Badge, dedizierte Seite, Export) sind implementiert. Code-Qualität ist gut, aber Dokumentation und Testing fehlen noch.

Empfehlung: **Testing und Bugfixes** vor weiteren Features.
