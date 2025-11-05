# Wissenskorb - Test Checkliste

Stand: 05.11.2025

Diese Checkliste dokumentiert alle notwendigen Tests für den Wissenskorb.

## 1. Basis-Funktionalität

### 1.1 Add/Remove in allen Ansichten

#### Map View (docs/index.html)
- [ ] Single-person popup: Basket-Button sichtbar
- [ ] Single-person popup: Click Add fügt Person hinzu
- [ ] Single-person popup: Button wechselt zu "Im Wissenskorb"
- [ ] Single-person popup: Click Remove entfernt Person
- [ ] Multi-person popup: Mini-Buttons bei allen Personen
- [ ] Multi-person popup: Click Add funktioniert
- [ ] Multi-person popup: Click Remove funktioniert
- [ ] Multi-person popup: Expand-Liste zeigt auch Buttons
- [ ] Toast-Notification erscheint bei Add/Remove
- [ ] Badge in Navbar aktualisiert sich

#### Synthesis View (docs/synthesis/index.html)
- [ ] Star-Button funktioniert für Add
- [ ] Star-Button funktioniert für Remove
- [ ] Tab "Wissenskorb" zeigt Personen
- [ ] Timeline-Visualisierung funktioniert
- [ ] Beziehungs-Visualisierung funktioniert
- [ ] Export CSV funktioniert
- [ ] Export JSON funktioniert
- [ ] Toast-Notification erscheint
- [ ] Badge aktualisiert sich

#### Brief-Explorer (docs/stats.html)
- [ ] "Zum Wissenskorb" Button sichtbar
- [ ] Button zeigt korrekte Anzahl gefilterter Personen
- [ ] Batch-Add funktioniert
- [ ] Bereits vorhandene Personen werden übersprungen
- [ ] Toast zeigt "X Personen hinzugefügt (Y bereits im Korb)"
- [ ] Badge aktualisiert sich

#### Person Details (docs/person.html)
- [ ] Toggle-Button im Header sichtbar
- [ ] Button zeigt korrekten State (in/not in basket)
- [ ] Click Add fügt Person hinzu
- [ ] Click Remove entfernt Person
- [ ] Button-Text wechselt zwischen "Zum Wissenskorb" / "Im Wissenskorb"
- [ ] Button-Farbe wechselt (blau/rot)
- [ ] Toast erscheint
- [ ] Badge aktualisiert sich

#### Wissenskorb Page (docs/wissenskorb.html)
- [ ] Alle Personen werden angezeigt
- [ ] Personenliste sortiert nach Hinzufüge-Datum
- [ ] Remove-Button bei jeder Person
- [ ] Remove funktioniert
- [ ] "Alle entfernen" Button funktioniert
- [ ] Bestätigungs-Dialog bei "Alle entfernen"
- [ ] Netzwerk-Graph wird gerendert
- [ ] Graph zeigt Beziehungen zwischen Personen
- [ ] Export CSV funktioniert
- [ ] Export JSON funktioniert
- [ ] Help-Sektion ist lesbar

### 1.2 Persistierung

- [ ] Wissenskorb bleibt nach Browser-Refresh erhalten
- [ ] Wissenskorb bleibt nach Navigation zwischen Seiten erhalten
- [ ] Local Storage enthält korrektes JSON-Format
- [ ] Version "1.0" ist gespeichert
- [ ] Updated-Timestamp ist aktuell

### 1.3 Badge-Counter

- [ ] Badge in Navbar zeigt korrekte Anzahl
- [ ] Badge ist versteckt bei 0 Personen
- [ ] Badge erscheint bei erster hinzugefügter Person
- [ ] Badge aktualisiert sich bei Add
- [ ] Badge aktualisiert sich bei Remove
- [ ] Badge aktualisiert sich bei "Alle entfernen"

### 1.4 Export-Funktionen

#### CSV Export
- [ ] Download startet
- [ ] Dateiname ist "wissenskorb.csv"
- [ ] CSV enthält Header-Zeile
- [ ] Alle Personen sind enthalten
- [ ] Felder: ID, Name, Birth, Death, Role, GND
- [ ] Encoding ist korrekt (Umlaute funktionieren)

#### JSON Export
- [ ] Download startet
- [ ] Dateiname ist "wissenskorb.json"
- [ ] JSON ist gültiges Format
- [ ] Alle Person-Felder sind enthalten
- [ ] Beziehungen sind enthalten
- [ ] Occupations sind enthalten

## 2. Edge Cases

### 2.1 Leerer Korb
- [ ] Wissenskorb-Seite zeigt "Leer"-Message
- [ ] Export-Buttons zeigen Warning
- [ ] Netzwerk-Graph zeigt "Keine Personen"
- [ ] "Alle entfernen" Button ist disabled
- [ ] Badge ist versteckt

### 2.2 Viele Personen
- [ ] 50 Personen hinzufügen funktioniert
- [ ] 100 Personen hinzufügen funktioniert
- [ ] Personenliste bleibt scrollbar
- [ ] Performance ist akzeptabel (<2s für Rendering)
- [ ] Netzwerk-Graph rendert (auch wenn langsam)
- [ ] Export funktioniert mit vielen Personen

### 2.3 Duplikate
- [ ] Versuch Person zweimal hinzuzufügen wird verhindert
- [ ] Toast zeigt "Bereits im Wissenskorb" (optional)
- [ ] Keine doppelten Einträge in Liste
- [ ] Badge-Counter bleibt korrekt

### 2.4 Ungültige Daten
- [ ] Person ohne ID wird nicht hinzugefügt
- [ ] Person ohne Name wird nicht hinzugefügt
- [ ] Console.error bei ungültigen Daten
- [ ] Keine App-Crashes

## 3. Multi-Tab-Synchronisation

- [ ] Wissenskorb in Tab 1 öffnen
- [ ] Tab 2 öffnen, Person hinzufügen
- [ ] Tab 1: Badge aktualisiert sich automatisch
- [ ] Tab 1: Wissenskorb-Seite refresh zeigt neue Person
- [ ] Tab 2: Person entfernen
- [ ] Tab 1: Badge aktualisiert sich automatisch

## 4. Browser-Kompatibilität

### Chrome/Edge
- [ ] Alle Features funktionieren
- [ ] Local Storage funktioniert
- [ ] Toast-Notifications erscheinen
- [ ] CSS rendering korrekt
- [ ] Keine Console-Errors

### Firefox
- [ ] Alle Features funktionieren
- [ ] Local Storage funktioniert
- [ ] Toast-Notifications erscheinen
- [ ] CSS rendering korrekt
- [ ] Keine Console-Errors

### Safari (wenn verfügbar)
- [ ] Alle Features funktionieren
- [ ] Local Storage funktioniert
- [ ] Toast-Notifications erscheinen
- [ ] CSS rendering korrekt
- [ ] Keine Console-Errors

## 5. Responsive Design

### Desktop (1920x1080)
- [ ] Alle Layouts funktionieren
- [ ] Buttons sind klickbar
- [ ] Popups sind lesbar
- [ ] Wissenskorb-Seite nutzt Platz gut

### Tablet (768x1024)
- [ ] Navigation funktioniert
- [ ] Popups sind lesbar
- [ ] Buttons sind groß genug zum Tippen
- [ ] Wissenskorb-Seite ist nutzbar
- [ ] Netzwerk-Graph passt sich an

### Mobile (375x667)
- [ ] Navigation funktioniert
- [ ] Popups sind lesbar (ggf. kleiner Font ok)
- [ ] Buttons sind groß genug
- [ ] Wissenskorb-Seite scrollbar
- [ ] Listen sind lesbar

## 6. Performance-Tests

### Test-Setup
1. Öffne Chrome DevTools
2. Gehe zu Performance Tab
3. Starte Recording
4. Führe Aktion aus
5. Stoppe Recording
6. Analysiere Timeline

### 6.1 Einzelne Person hinzufügen
- [ ] Duration: < 100ms
- [ ] Keine Lags
- [ ] Smooth animation

### 6.2 Batch-Add (50 Personen)
- [ ] Duration: < 2 Sekunden
- [ ] UI bleibt responsiv
- [ ] Progress ist sichtbar (Toast am Ende)

### 6.3 Wissenskorb-Seite laden (50 Personen)
- [ ] Initial Load: < 1 Sekunde
- [ ] Personenliste rendert schnell
- [ ] Netzwerk-Graph: < 3 Sekunden

### 6.4 Netzwerk-Graph (100 Personen)
- [ ] Rendering: < 5 Sekunden
- [ ] Keine Browser-Freezes
- [ ] Graph ist nutzbar

### 6.5 Local Storage Größe
- [ ] 50 Personen: < 50 KB
- [ ] 100 Personen: < 100 KB
- [ ] 200 Personen: < 200 KB
- [ ] Kein Quota-Error

## 7. Accessibility

### Keyboard Navigation
- [ ] Tab-Navigation funktioniert
- [ ] Enter/Space aktiviert Buttons
- [ ] Focus-Styles sind sichtbar

### Screen Reader (optional)
- [ ] Buttons haben aria-labels
- [ ] Roles sind definiert
- [ ] Inhalte werden vorgelesen

## 8. Fehlerbehandlung

### Local Storage nicht verfügbar
- [ ] Graceful degradation
- [ ] Warnung an Nutzer
- [ ] Features deaktiviert aber keine Crashes

### Network-Fehler
- [ ] data.json nicht geladen: Error-Message
- [ ] App bleibt funktional

### JavaScript-Errors
- [ ] Console öffnen
- [ ] Alle Seiten durchklicken
- [ ] Keine unhandled errors

## Test-Zusammenfassung

Datum: _______________________
Tester: _______________________
Browser: _______________________
OS: _______________________

### Kritische Bugs (Blocker)
- [ ] Keine kritischen Bugs gefunden

### Wichtige Bugs
- [ ] Keine wichtigen Bugs gefunden

### Kleinere Bugs
- [ ] Keine kleineren Bugs gefunden

### Performance-Probleme
- [ ] Keine Performance-Probleme

### Bewertung
- [ ] Bereit für Produktion
- [ ] Bugs müssen behoben werden
- [ ] Größere Überarbeitung notwendig

## Notizen

```
[Platz für zusätzliche Beobachtungen, Screenshots von Bugs, etc.]
```
