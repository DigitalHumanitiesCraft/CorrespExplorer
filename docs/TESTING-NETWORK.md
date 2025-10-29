# Hover-Network Testing Guide

Phase 1 Implementation abgeschlossen. Dieses Dokument beschreibt, wie du die neuen Features testen kannst.

## Was wurde implementiert

Phase 1: Basis-Funktionalität
- Hover-Events auf Markern und Clustern
- Verbindungslinien zeichnen
- Farb-codierte Kategorien (Familie/Beruflich/Sozial)
- Legende in der Karte

## Test-Dateien

### 1. test-network.html
Testet die Module und Datenstrukturen:
- Lädt persons.json
- Testet getPersonConnections()
- Zeigt Farbzuordnung

Öffnen: http://127.0.0.1:8088/test-network.html

### 2. test-network-visual.html
Visueller Test mit synthetischen Daten:
- 3 Test-Personen (Köln, Berlin, München)
- Hover über Marker zeigt Verbindungen
- Farb-codierte Linien

Öffnen: http://127.0.0.1:8088/test-network-visual.html

## Hauptanwendung testen

Öffne: http://127.0.0.1:8088/

### Aktueller Status

WICHTIG: persons.json enthält noch keine AGRELON-Relations-Daten.

Das bedeutet:
- Hover-Events funktionieren
- Keine Verbindungslinien werden angezeigt (keine Daten)
- Infrastruktur ist bereit für Phase 2

### Was funktioniert bereits

1. Module laden korrekt
   - network-utils.js exportiert Funktionen
   - app.js importiert korrekt

2. Hover-Events sind aktiv
   - mouseenter/mouseleave auf persons-layer
   - mouseenter/mouseleave auf persons-clusters
   - Console-Logs zeigen "Showing 0 connections"

3. Legende wird angezeigt
   - Cluster-Farben (existierend)
   - Netzwerk-Verbindungen (neu)

## Erwartetes Verhalten

### Mit test-network-visual.html (Testdaten)

1. Karte lädt mit 3 Markern
2. Hover über Marker in Köln:
   - 2 Linien erscheinen (rot + grün)
   - Status zeigt "Showing 2 connections for Anna Schmidt"

3. Hover über Marker in Berlin:
   - 2 Linien erscheinen (rot + orange)
   - Status zeigt "Showing 2 connections for Maria Müller"

4. Hover weg:
   - Linien verschwinden
   - Status zeigt "Hover over markers"

### Mit Hauptanwendung (noch keine Daten)

1. Karte lädt normal
2. Hover über Marker:
   - Console Log: "🟡 EVENT: Showing 0 connections for [Name]"
   - Keine Linien (erwartetes Verhalten)

3. Hover über Cluster:
   - Console Log: "🟡 EVENT: Showing 0 connections for cluster..."
   - Keine Linien (erwartetes Verhalten)

## Browser Console prüfen

Öffne DevTools (F12) und Console:

Erwartete Logs bei Hover:
```
🟡 EVENT: Showing 0 connections for Anna Amalia von Sachsen-Weimar-Eisenach
```

KEINE Fehler erwarten:
- ✓ Module laden ohne Fehler
- ✓ Keine "undefined function" Fehler
- ✓ Keine "cannot read property" Fehler

## Phase 2 Vorbereitung

Um Verbindungen zu sehen, benötigen wir:

1. AGRELON-Relations in persons.json:
```json
{
  "id": "person_001",
  "name": "...",
  "relations": [
    {
      "target": "person_002",
      "type": "Tochter"
    }
  ]
}
```

2. Beide Personen müssen places haben:
```json
"places": [
  { "name": "Weimar", "lat": 50.9787, "lon": 11.3289 }
]
```

## Nächste Schritte

Phase 2 (geplant):
- AGRELON-Daten aus CMIF/TEI extrahieren
- persons.json mit relations erweitern
- Kategorisierung implementieren (Familie/Beruflich/Sozial)
- Filter-Checkboxen hinzufügen

## Server stoppen

Nach dem Testen:
```bash
pkill -f "python -m http.server 8088"
```

## Zusammenfassung

Phase 1 Status: Implementiert und getestet

Funktioniert:
- Modul-Struktur
- Hover-Events
- Line-Drawing-Mechanik
- Farbzuordnung
- Legende

Wartet auf:
- Relations-Daten in persons.json (Phase 2)
