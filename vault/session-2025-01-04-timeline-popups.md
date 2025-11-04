# Session 2025-01-04: Timeline-Popups mit Beziehungsinformationen

Datum: 2025-01-04

## Kontext

User bemerkte bei Henriette Ottilie Ulrike Pogwisch, dass die Spalte "Beziehungen" die Zahl "3" zeigt und fragte, ob nicht alle 3 Beziehungen/Biografien angezeigt werden sollten. Zudem schlug der User vor, in der Timeline-Visualisierung im Wissenskorb beim Anklicken der Timeline-Balken zusätzliche Informationen anzuzeigen, insbesondere Beziehungen.

## Implementierte Lösung

### 1. Klärung der Beziehungsanzeige

Untersuchung ergab: Alle 3 Beziehungen von Henriette Pogwisch werden korrekt angezeigt, da das Limit bei 5 liegt. Die Beziehungen sind:
- hat Kind: Ottilie Wilhelmine Ernestine Henriette Goethe von (ID: 43782)
- hat Elternteil: Eleonore Maximiliane Ottilie Luise Henckel von Donnersmarck Gräfin von (ID: 43961)
- hat Kind: Ulrike Henriette Adele Elmire (Eleonore) Pogwisch von (ID: 44816)

### 2. Clickbare Timeline-Balken mit Popup

Implementierung einer interaktiven Popup-Funktion für Timeline-Balken im Wissenskorb.

## Technische Details

### JavaScript (docs/synthesis/js/app.js)

#### Timeline-Balken erhalten Click-Handler (Zeile 713-720)
```javascript
const person = state.basket.find(p => p.name === y.name);
return `
    <div class="timeline-row" style="top: ${top}px;">
        <div class="timeline-bar" style="left: ${left}%; width: ${width}%;"
             title="${y.name} (${y.birth}-${y.death})"
             data-person-id="${person.id}"
             data-tooltip="Klicke für Details">
            <span class="timeline-label">${y.name}</span>
        </div>
    </div>
`;
```

#### Event-Handler für Timeline-Balken (Zeile 785-792)
```javascript
container.querySelectorAll('.timeline-bar').forEach(bar => {
    bar.addEventListener('click', (e) => {
        e.stopPropagation();
        const personId = bar.dataset.personId;
        showTimelinePersonPopup(personId, e.currentTarget);
    });
});
```

#### Neue Popup-Funktion (Zeile 571-701)
Funktion `showTimelinePersonPopup(personId, anchorElement)` erstellt dynamisches Popup mit:
- Header mit Name und Close-Button
- Lebensdaten und Rolle
- Berufe (falls vorhanden)
- **Beziehungen als klickbare Links** (falls vorhanden)
  - Zeigt alle Beziehungen der Person
  - Markiert Personen im Wissenskorb mit ★
  - Links zu anderen Personen mit Navigation
- Korrespondenz-Zusammenfassung

#### Intelligente Positionierung
- Popup erscheint rechts vom Timeline-Balken, wenn Platz vorhanden
- Sonst links vom Balken
- Vertikale Zentrierung relativ zum Balken
- Viewport-Awareness (bleibt innerhalb des sichtbaren Bereichs)

#### Schließ-Mechanismen
- X-Button im Header
- Klick außerhalb des Popups
- Escape-Taste (via bestehende globale Handler)

#### Navigation aus Popup
- Klick auf Beziehungs-Link:
  - Schließt Popup
  - Wechselt zu Person-Tab
  - Selektiert Zielperson in Tabelle

### CSS (docs/synthesis/css/styles.css)

#### Popup-Container (Zeile 782-803)
```css
.timeline-popup {
    position: fixed;
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2000;
    min-width: 280px;
    max-width: 350px;
    animation: popupFadeIn 0.2s ease;
}
```

#### Animation
Smooth fade-in mit leichtem scale-Effekt für bessere UX.

#### Styling-Details
- Header mit grauem Hintergrund und Border
- Close-Button mit Hover-Effekt
- Beziehungs-Links mit Hover-Unterline
- In-Basket-Marker (★) für Personen im Wissenskorb

#### Timeline-Balken Hover (Zeile 890-897)
```css
.timeline-bar {
    cursor: pointer;
    transition: filter 0.2s ease;
}

.timeline-bar:hover {
    filter: brightness(1.1);
}
```

## Datenstruktur

### Relationships in persons.json
```json
{
  "relationships": [
    {
      "target_id": "43782",
      "type": "hat Kind",
      "type_id": "4030",
      "reciprocal_type": "hat Elternteil"
    }
  ]
}
```

- `target_id`: Verweist auf andere Person in persons.json
- `type`: Beschreibung der Beziehung
- Alle Ziel-IDs werden validiert beim Laden

## User Experience Verbesserungen

1. **Kontextuelle Information**: Beziehungen werden direkt in der Timeline-Visualisierung verfügbar
2. **Wissenskorb-Integration**: Markierung zeigt, welche Beziehungspersonen bereits im Korb sind
3. **Nahtlose Navigation**: Klick auf Beziehung führt direkt zur Person
4. **Visuelle Hinweise**: Hover-Effekte und Tooltips leiten zur Interaktion an
5. **Responsive Positionierung**: Popup bleibt immer sichtbar im Viewport

## Offene Punkte / Potenzielle Erweiterungen

1. Erweiterung der Beziehungs-Visualisierung:
   - Grafische Darstellung von Beziehungsnetzwerken
   - Farbcodierung nach Beziehungstypen
   - Bidirektionale Beziehungen hervorheben

2. Timeline-Enhancements:
   - Zoom-Funktion für Timeline
   - Zeiträume hervorheben bei Überlappungen
   - Korrespondenz-Aktivität in Timeline einblenden

3. Beziehungs-Filter:
   - Filterung nach Beziehungstypen
   - "Zeige alle verwandten Personen" Funktion

## Dateien geändert

- `docs/synthesis/js/app.js` (Zeilen 571-730, 785-792)
- `docs/synthesis/css/styles.css` (Zeilen 782-897)

## Commit

Die Änderungen sollten committed werden mit:
```
Add clickable timeline popups with relationship information

- Timeline bars in Wissenskorb are now clickable
- Popup shows person details including all relationships
- Relationships are clickable links with navigation
- Visual marker for persons already in basket
- Intelligent popup positioning with viewport awareness
- CSS animations for smooth UX

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```
