# Timeline-Popup System Architektur

## Übersicht

Das Timeline-Popup System ermöglicht es Nutzern, durch Klicken auf Timeline-Balken im Wissenskorb detaillierte Informationen zu Personen zu sehen, insbesondere deren Beziehungen zu anderen Personen.

## Komponenten

### 1. Timeline-Balken (Timeline Bars)

**Location**: `docs/synthesis/js/app.js` (renderBasketVisualizations, Zeile 817-842)

**Funktionalität**:
- Visuelle Repräsentation von Lebenszeiten im Swimlane-Layout
- Trägt `data-person-id` Attribut für Identifikation
- Trägt `data-tooltip` für Hover-Hinweis

**Struktur**:
```html
<div class="timeline-bar"
     data-person-id="${person.id}"
     data-tooltip="Klicke für Details"
     title="${name} (${birth}-${death})">
    <span class="timeline-label">${name}</span>
</div>
```

### 2. Popup-Generierung

**Function**: `showTimelinePersonPopup(personId, anchorElement)`
**Location**: `docs/synthesis/js/app.js` (Zeile 571-701)

**Ablauf**:
1. Person-Daten aus `state.allPersons` laden
2. Bestehendes Popup entfernen (nur ein Popup gleichzeitig)
3. HTML-Content dynamisch generieren
4. Popup-Element erstellen und zum DOM hinzufügen
5. Position berechnen relativ zu anchorElement
6. Event-Listener registrieren

**Content-Sections**:
```javascript
// Header (immer)
- Name
- Close-Button

// Body (konditional)
- Lebensdaten (immer)
- Rolle (immer)
- Berufe (falls person.occupations vorhanden)
- Beziehungen (falls person.relationships vorhanden)
  - Liste aller Beziehungen
  - Mit klickbaren Links
  - Mit In-Basket-Marker
- Korrespondenz (falls person.correspondence vorhanden)
```

### 3. Positionierungs-Logik

**Horizontale Positionierung**:
```javascript
let left = rect.right + 10;  // Rechts vom Balken
if (left + popupRect.width > window.innerWidth) {
    left = rect.left - popupRect.width - 10;  // Links vom Balken
}
```

**Vertikale Positionierung**:
```javascript
let top = rect.top + (rect.height / 2) - (popupRect.height / 2);  // Zentriert
if (top < 10) top = 10;  // Mindestabstand oben
if (top + popupRect.height > window.innerHeight - 10) {
    top = window.innerHeight - popupRect.height - 10;  // Maximalabstand unten
}
```

### 4. Event-Handler

#### Popup öffnen
**Location**: `docs/synthesis/js/app.js` (updateBasketView, Zeile 785-792)
```javascript
container.querySelectorAll('.timeline-bar').forEach(bar => {
    bar.addEventListener('click', (e) => {
        e.stopPropagation();
        const personId = bar.dataset.personId;
        showTimelinePersonPopup(personId, e.currentTarget);
    });
});
```

#### Popup schließen
Drei Mechanismen:
1. **Close-Button**: Direktes remove() auf Popup-Element
2. **Click außerhalb**: Event-Listener mit Timeout für DOM-Update
3. **Escape-Taste**: Via globale Keyboard-Handler (nicht popup-spezifisch)

#### Beziehungs-Navigation
```javascript
popup.querySelectorAll('.person-link-popup').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.dataset.id;
        popup.remove();

        // Tab-Switch
        document.querySelector('[data-tab="person"]').click();

        // Person selektieren
        selectPerson(targetId);
    });
});
```

### 5. CSS-Styling

**Location**: `docs/synthesis/css/styles.css` (Zeile 782-897)

**Haupt-Klassen**:
- `.timeline-popup`: Container (fixed position, z-index 2000)
- `.timeline-popup-header`: Header mit Flexbox für Titel und Close-Button
- `.timeline-popup-body`: Content-Bereich mit Padding
- `.timeline-popup-section`: Gruppierung für Beziehungen
- `.timeline-popup-relations`: Unstyled Liste für Beziehungen
- `.person-link-popup`: Styling für klickbare Person-Links
- `.in-basket-marker`: Stern-Symbol für Personen im Korb

**Animation**:
```css
@keyframes popupFadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
```

## Datenfluss

```
User Click auf Timeline-Bar
    ↓
Event-Handler liest data-person-id
    ↓
showTimelinePersonPopup(personId, anchorElement)
    ↓
Person-Daten aus state.allPersons laden
    ↓
HTML-Content generieren
    ↓
Beziehungen durchlaufen
    ↓
Für jede Beziehung: target_id nachschlagen in state.allPersons
    ↓
Check ob target in state.basket (für ★-Marker)
    ↓
Popup im DOM erstellen
    ↓
Position berechnen basierend auf anchorElement
    ↓
Event-Listener registrieren
    ↓
Popup anzeigen mit Animation
```

## Integration mit bestehendem System

### State-Management
Popup nutzt bestehendes `state` Objekt:
- `state.allPersons`: Für Person-Lookups
- `state.basket`: Für In-Basket-Checks

### Navigation
Popup integriert mit bestehendem Navigation-System:
- `switchTab()`: Indirekt via Tab-Button-Click
- `selectPerson()`: Direkt aufgerufen für Person-Selektion

### Styling
Popup nutzt CSS-Custom-Properties aus globalem Theme:
- `--color-primary`
- `--color-border`
- `--color-bg-alt`
- `--color-text-muted`
- `--spacing-*`

## Performance-Überlegungen

1. **Single Popup**: Nur ein Popup gleichzeitig aktiv verhindert DOM-Bloat
2. **Event-Delegation**: Könnte optimiert werden (aktuell individuelle Listener)
3. **Animation**: CSS-Animation (GPU-beschleunigt) statt JavaScript
4. **Lazy Evaluation**: Popup wird erst bei Bedarf generiert

## Erweiterungspunkte

1. **Popup-Typen**: System könnte generalisiert werden für verschiedene Popup-Typen
2. **Caching**: Popup-Content könnte gecacht werden für häufig angezeigte Personen
3. **Keyboard-Navigation**: Tab-Navigation innerhalb des Popups
4. **Touch-Support**: Optimierung für Touch-Devices (z.B. größere Touch-Targets)

## Abhängigkeiten

### JavaScript
- `state.allPersons`: Globales State-Objekt
- `state.basket`: Globales State-Objekt
- `getRoleLabel()`: Helper-Funktion für Rollen-Labels
- `selectPerson()`: Funktion für Person-Selektion

### CSS
- CSS Custom Properties aus `styles.css`
- Globale CSS-Reset und Base-Styles

### HTML
- `#basket-content`: Container für Wissenskorb-Content
- Timeline-Struktur muss vorhanden sein

## Testing-Überlegungen

### Manuelle Tests
1. Klick auf Timeline-Balken öffnet Popup
2. Popup erscheint an korrekter Position
3. Popup bleibt im Viewport bei kleinem Fenster
4. Close-Button schließt Popup
5. Klick außerhalb schließt Popup
6. Beziehungs-Links funktionieren
7. In-Basket-Marker erscheint für Korb-Personen
8. Navigation führt zur korrekten Person

### Edge Cases
1. Person ohne Beziehungen
2. Person ohne Berufe
3. Person ohne Korrespondenz
4. Beziehungs-Ziel nicht in allPersons
5. Sehr lange Personennamen
6. Viele Beziehungen (>10)
7. Popup an Bildschirmrand
