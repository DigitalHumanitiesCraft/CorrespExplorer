# HerData Development Journal

Chronologische Dokumentation wichtiger Entwicklungsschritte und Entscheidungen.

## 2025-10-29: Netzwerk-Visualisierung implementiert

### Problem: Cluster Hover zeigt keine Verbindungen

Symptom: Beim Hovern über Cluster wurden keine Netzwerk-Verbindungen angezeigt, obwohl die Infrastruktur implementiert war.

Root Cause: MapLibre GL JS hat von Callback-basierter API zu Promise-basierter API gewechselt. Die Callbacks von `getClusterLeaves()` und `getClusterExpansionZoom()` wurden nie ausgeführt.

Debug-Prozess (8 Versuche):
1. setTimeout-Verzögerung (fehlgeschlagen)
2. Integrierter Tooltip-Ansatz (fehlgeschlagen)
3. DOM-Element-Selektion mit querySelector (fehlgeschlagen)
4. API-Existenz-Prüfung (Funktion existiert)
5. Alternative Cluster-API getClusterExpansionZoom (auch kein Callback)
6. Koordinaten-basierte Filterung (zu ungenau)
7. queryRenderedFeatures (Cluster verdeckt Punkte)
8. Web-Recherche: Promise-API entdeckt

Lösung:
```javascript
// Alt (funktioniert nicht)
source.getClusterLeaves(clusterId, pointCount, 0, (error, leaves) => {
    // Callback wird nie aufgerufen
});

// Neu (korrekt)
source.getClusterLeaves(clusterId, pointCount)
    .then(leaves => {
        // Promise wird aufgelöst
    })
    .catch(error => {
        // Fehlerbehandlung
    });
```

### Visualisierungs-Verbesserungen

Hochkontrast-Farben:
- Familie: #ff0066 (Pink/Magenta)
- Beruflich: #00ccff (Cyan/Hellblau)
- Sozial: #ffcc00 (Gelb/Gold)

Linien-Styling:
- Breite: 4-12px (abhängig von Anzahl)
- Glow-Effekt: 8-14px weißer Halo mit blur 4
- Opacity: 0.9 für maximale Sichtbarkeit

Tooltip-Verbesserungen:
- Weißer Text auf dunklem Hintergrund
- Farbige Kategorie-Labels (fett)
- Sofortige Anzeige mit "Verbindungen werden geladen..."
- Update mit kategorisierten Zahlen

### Cluster-Popup: Relation-Indikatoren

Personen mit Relationen werden hervorgehoben:
- Pink linke Border (3px)
- Leicht pink eingefärbter Hintergrund (rgba(255, 0, 102, 0.05))
- Badge mit Verbindungsanzahl (🔗 X)
- CSS-Klasse "has-relations"

### Person-Detail-Seite: Netzwerk-Karte

Neue "Netzwerk-Verbindungen" Sektion:
- Gruppierung nach Kategorie (Familie/Beruflich/Sozial)
- Farbcodierte Überschriften
- Relationstyp (z.B. "HAT NICHTE/NEFFE")
- Klickbare Links zu verwandten Personen
- Lebensdaten der Zielpersonen
- Hover-Effekte mit Border und Slide-Animation
- Wird ausgeblendet wenn keine Relationen vorhanden

### Erkenntnisse: Warum nur Familie-Verbindungen?

Von 6580 SNDB-Relationen sind nur 84 zwischen Frauen:
- HerData zeigt nur Frauen (448 Personen)
- Meiste Relationen verbinden zu Männern (ausgefiltert)
- 6496 Relationen nicht in HerData

Sichtbare Verbindungen nach Kategorie:
- Familie: 50 (beide Personen haben Geodaten)
- Beruflich: 0 (Zielpersonen ohne Koordinaten)
- Sozial: 0 (Zielpersonen ohne Koordinaten)

Historischer Kontext: Im 18./19. Jahrhundert waren familiäre Netzwerke zwischen Frauen häufiger als berufliche oder soziale (die meist über Männer liefen).

### Dokumentation

Neue Dateien:
- `docs/CLUSTER_HOVER_DEBUG.md`: Vollständige Debug-Timeline mit 8 Lösungsversuchen
- `knowledge/network-relations.md`: Umfassende Dokumentation über AGRELON-Relationen, Daten-Pipeline, Statistiken und technische Details

### Technische Entscheidungen

MapLibre Promise API:
- Beide Handler (hover + click) auf Promise umgestellt
- Konsistente Error-Handling mit .catch()
- Keine Race Conditions mehr

Color System:
- Maximal unterschiedliche Farben gewählt
- WCAG-konforme Kontraste
- Einheitlich über Map, Tooltip und Detail-Seite

CSS-Architektur:
- Tokens.css für konsistente Werte
- Modulare Styles in person-cards.css
- Wiederverwendbare Badge-Klassen

### Files Modified

- `docs/index.html`: Legende mit neuen Farben
- `docs/person.html`: Relations-Card hinzugefügt
- `docs/js/app.js`: Promise API für Cluster-Handler
- `docs/js/person.js`: renderRelations() Funktion
- `docs/js/network-utils.js`: Neue Verbindungsfarben
- `docs/css/style.css`: Badge und Highlighting-Styles
- `docs/css/person-cards.css`: Relations-List Styling

### Commits

- `20edaa4`: Fix cluster hover network visualization with MapLibre Promise API
- `0941716`: Add relation indicators and detail view for network connections

### Nächste Schritte

Mögliche Erweiterungen:
1. Brief-Korrespondenz als Relation (Phase 2)
2. Geteilte Orte als implizite Verbindung
3. Zeitliche Überlappungen visualisieren
4. Geodaten für fehlende Personen ergänzen (Julie Kleefeld, Luise von Hessen-Darmstadt)

---

## Ältere Einträge

(Hier können frühere Sessions dokumentiert werden)
