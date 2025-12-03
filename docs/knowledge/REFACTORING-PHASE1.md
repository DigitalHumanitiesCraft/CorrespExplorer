# Refactoring Phase 1: Foundation

Durchgeführt: 2025-12-03

## Übersicht

Phase 1 des Refactorings fokussiert sich auf die Grundlagen: State-Management, DOM-Caching und CSS-Variablen-Konsolidierung.

## 1. State-Manager (state-manager.js)

Neues Modul zur zentralen Verwaltung des Anwendungszustands.

### Datei
[docs/js/state-manager.js](../js/state-manager.js) (360 Zeilen)

### Features
- Zentrale State-Verwaltung mit `AppState` Klasse
- Observer-Pattern (subscribe/notify)
- Gekapselte Filter-Logik (getFilteredLetters mit Caching)
- URL-State-Synchronisation (toURLParams/fromURLParams)
- Strukturierter State in 3 Bereichen: data, filters, ui

### Struktur
```javascript
state = {
    data: { letters, indices, meta, placeAggregation },
    filters: { temporal, languages, person, subject, place, quality },
    ui: { currentView, selected items, search terms, sort orders }
}
```

### Verwendung
```javascript
import { state } from './state-manager.js';

// Daten setzen
state.setData({ letters, indices, meta });

// Filter aktualisieren
state.updateFilters({ languages: ['de', 'fr'] });

// Gefilterte Briefe abrufen (gecacht)
const filtered = state.getFilteredLetters();

// Auf Änderungen reagieren
state.subscribe('filters', (newFilters) => {
    renderView();
});
```

### Migration
Globale Variablen in [docs/js/explore.js](../js/explore.js) wurden kommentiert mit Hinweisen auf state-Manager-Äquivalente:
- `allLetters` → `state.getAllLetters()`
- `filteredLetters` → `state.getFilteredLetters()`
- `dataIndices` → `state.getIndices()`
- `temporalFilter` → `state.filters.temporal`
- UI-State-Variablen → `state.ui.*`

## 2. DOM-Cache (dom-cache.js)

Modul zur Performance-Optimierung durch Caching von DOM-Referenzen.

### Datei
[docs/js/dom-cache.js](../js/dom-cache.js) (270 Zeilen)

### Features
- Lazy-loading DOM-Element-Cache
- Vordefinierte Accessors für häufig genutzte Elemente
- Getter-basiert (nur bei Bedarf gecacht)
- Cache-Management (clear, remove)
- 100+ vordefinierte Element-Referenzen

### Verwendung
```javascript
import { elements, initDOMCache } from './dom-cache.js';

// Initialisierung
initDOMCache();  // Pre-lädt kritische Elemente

// Elemente abrufen
elements.mapContainer.style.display = 'block';
elements.sidebar.classList.add('active');
elements.viewButtons.forEach(btn => { ... });

// Custom-Elemente
elements.getById('custom-element-id');
elements.getBySelector('.custom-selector');
```

### Vorteile
- 185 DOM-Queries in explore.js (vorher wiederholt)
- Null-Checks an zentraler Stelle
- Performance-Verbesserung bei wiederholten Zugriffen

## 3. CSS-Variablen-Konsolidierung

Systematischer Ersatz hardcodierter CSS-Werte durch Design-Tokens aus [docs/css/tokens.css](../css/tokens.css).

### Script
[preprocessing/consolidate_css_variables.py](../../preprocessing/consolidate_css_variables.py) (206 Zeilen)

### Ergebnisse

| Datei | Replacements |
|-------|--------------|
| explore.css | 45 |
| style.css | 82 |
| components.css | 3 |
| upload.css | 13 |
| about.css | 7 |
| compare.css | 12 |
| wissenskorb.css | 47 |
| **Total** | **209** |

### Ersetzungen

Spacing (padding/margin):
```css
/* Vorher */
padding: 2px 8px;

/* Nachher */
padding: calc(var(--space-xs) / 2) var(--space-sm);
```

Font-Sizes:
```css
/* Vorher */
font-size: 12px;

/* Nachher */
font-size: var(--font-size-xs);
```

Colors:
```css
/* Vorher */
color: #222222;

/* Nachher */
color: var(--color-text);
```

### Backups
Alle geänderten CSS-Dateien haben .backup-Versionen:
```bash
docs/css/explore.css.backup
docs/css/style.css.backup
# ... etc
```

## Integration in explore.js

[docs/js/explore.js](../js/explore.js) wurde erweitert:

### Imports
```javascript
import { state } from './state-manager.js';
import { elements, initDOMCache } from './dom-cache.js';
```

### Init-Funktion
```javascript
async function init() {
    // DOM Cache initialisieren
    initDOMCache();

    // Daten laden
    const data = await loadData();

    // State Manager initialisieren
    state.setData({ letters, indices, meta });
    state.updateUI({ dateRange: { min, max } });

    // Rest der Initialisierung...
}
```

### Backward Compatibility
Globale Variablen bleiben temporär erhalten mit Kommentaren:
```javascript
// DEPRECATED: Moved to state-manager.js
let allLetters = [];  // Use: state.getAllLetters()
```

## Testing

Manuelle Tests:
1. Server starten: `python -m http.server 8000 --directory docs`
2. Browser: http://localhost:8000
3. HSA-Datensatz laden
4. Alle 8 Views testen
5. Filter testen (Zeit, Sprache, Person, Thema, Ort)
6. Export testen (CSV/JSON)

## Nächste Schritte (Phase 2)

1. Vollständige Migration zu state-Manager (globale Variablen entfernen)
2. DOM-Cache in allen Render-Funktionen verwenden
3. explore.js in View-Module aufteilen
4. View-Interface Pattern implementieren
5. Event-Handler-System zentralisieren

## Technische Schuld

- Globale Variablen noch nicht vollständig entfernt (backward compatibility)
- Nicht alle DOM-Queries nutzen elements-Cache
- `map` Variable noch global (sollte in state.mapInstance)
- Subscriber-Pattern noch nicht genutzt

## Impact

Performance:
- DOM-Queries: Reduziert durch Caching
- Filter-Performance: Verbessert durch Caching von filtered

Letters
- CSS-Größe: Unverändert (nur semantisch verbessert)

Wartbarkeit:
- State-Logic zentralisiert
- CSS-Tokens konsequent genutzt
- Dokumentierte Migrationshinweise

Code-Qualität:
- +630 Zeilen neue Module (state-manager, dom-cache)
- +209 CSS-Verbesserungen
- ~50 Zeilen Integration in explore.js
- Keine Breaking Changes
