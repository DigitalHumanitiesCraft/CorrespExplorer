# Wissenskorb - Manuelle Test-Anleitung

Stand: 05.11.2025

Diese Anleitung hilft dir, den Wissenskorb manuell zu testen.

## Schnelltest (15 Minuten)

Dieser Test deckt die wichtigsten Funktionen ab.

### Setup
1. Öffne Chrome oder Firefox
2. Öffne DevTools (F12)
3. Gehe zur Console-Tab
4. Navigiere zu http://localhost:PORT/docs/ (oder deine URL)

### Test-Schritte

#### 1. Karte: Single Person (2 Minuten)
1. Klicke auf einen einzelnen Marker (z.B. Anna Amalia in Weimar)
2. Popup öffnet sich
3. Klicke auf Basket-Button (Bookmark-Icon)
4. Erwarte:
   - Toast-Notification "X zum Wissenskorb hinzugefügt"
   - Badge in Navbar zeigt "1"
   - Button wechselt zu "Im Wissenskorb" (gefüllt)
5. Klicke Button erneut
6. Erwarte:
   - Toast "X aus Wissenskorb entfernt"
   - Badge zeigt "0" (versteckt)
   - Button zurück zu "Zum Wissenskorb"

Result: [ ] PASS [ ] FAIL

#### 2. Karte: Multiple Persons (3 Minuten)
1. Klicke auf Cluster oder mehrere Personen am gleichen Ort
2. Multi-Person-Popup öffnet sich
3. Klicke Mini-Bookmark-Button bei 3 verschiedenen Personen
4. Erwarte:
   - 3x Toast-Notification
   - Badge zeigt "3"
   - Buttons wechseln zu gefüllt
5. Klicke "Zeige alle X Frauen" (falls vorhanden)
6. Erwarte:
   - Liste expandiert
   - Alle Buttons sind da
   - Gefüllte Buttons für bereits hinzugefügte Personen

Result: [ ] PASS [ ] FAIL

#### 3. Wissenskorb-Seite (3 Minuten)
1. Klicke in Navbar auf "Wissenskorb"
2. Erwarte:
   - 3 Personen in Liste
   - Netzwerk-Graph sichtbar
   - Beziehungslinien (falls Verbindungen existieren)
3. Klicke "Export CSV"
4. Erwarte:
   - Download startet
   - Datei wissenskorb.csv
   - Öffne in Excel/Editor: 3 Zeilen + Header
5. Klicke Remove bei einer Person
6. Erwarte:
   - Person verschwindet
   - Badge zeigt "2"
   - Graph aktualisiert sich

Result: [ ] PASS [ ] FAIL

#### 4. Brief-Explorer Batch-Add (2 Minuten)
1. Navigiere zu Brief-Explorer (stats.html)
2. Setze Filter: z.B. "Beruf: Schauspielerin"
3. Erwarte:
   - Button "X zum Wissenskorb" zeigt Anzahl
4. Klicke Button
5. Erwarte:
   - Toast "X Personen hinzugefügt (Y bereits im Korb)"
   - Badge aktualisiert sich
   - Console: keine Errors

Result: [ ] PASS [ ] FAIL

#### 5. Person Details Toggle (2 Minuten)
1. Klicke auf beliebige Person (z.B. von Karte)
2. Person-Detailseite öffnet sich
3. Erwarte:
   - Toggle-Button im Header sichtbar
   - Button zeigt korrekten State (gefüllt wenn im Korb)
4. Klicke Toggle
5. Erwarte:
   - Button wechselt State
   - Toast erscheint
   - Badge aktualisiert sich
6. Refresh Seite (F5)
7. Erwarte:
   - Button zeigt immer noch korrekten State
   - Badge korrekt

Result: [ ] PASS [ ] FAIL

#### 6. Persistierung (1 Minute)
1. Füge 5 Personen zum Korb hinzu
2. Badge zeigt "X"
3. Drücke F5 (Refresh)
4. Erwarte:
   - Badge zeigt immer noch "X"
   - Wissenskorb-Seite zeigt alle Personen
5. Schließe Browser komplett
6. Öffne wieder, navigiere zu HerData
7. Erwarte:
   - Badge zeigt immer noch "X"

Result: [ ] PASS [ ] FAIL

#### 7. Multi-Tab Sync (2 Minuten)
1. Öffne Wissenskorb-Seite in Tab 1
2. Öffne neuen Tab 2, navigiere zu Karte
3. Füge in Tab 2 Person hinzu
4. Wechsle zu Tab 1
5. Erwarte:
   - Badge aktualisiert sich automatisch (innerhalb 1-2 Sekunden)
6. Refresh Tab 1
7. Erwarte:
   - Neue Person in Liste

Result: [ ] PASS [ ] FAIL

### Schnelltest Result

Gesamt: ___ / 7 Tests bestanden

Kritische Bugs: _______________________________________________

Nächste Schritte:
- [ ] Alle Tests bestanden → Weiter zu Volltest
- [ ] Bugs gefunden → Bugs dokumentieren und fixen

## Volltest (45 Minuten)

Folge der vollständigen Test-Checkliste in:
`docs/knowledge/wissenskorb-test-checklist.md`

## Performance-Test

### Test 1: 50 Personen (5 Minuten)
1. Gehe zu Brief-Explorer
2. Entferne alle Filter (alle 448 Personen sichtbar)
3. Klicke "Alle zum Wissenskorb" (falls vorhanden) ODER:
   - Setze Filter so dass ca. 50 Personen übrig sind
   - Klicke Batch-Add Button
4. Öffne DevTools → Performance Tab
5. Klicke "Record"
6. Navigiere zu Wissenskorb-Seite
7. Warte bis Graph gerendert ist
8. Stoppe Recording
9. Analysiere:
   - Initial Page Load: < 1 Sekunde
   - Graph Rendering: < 3 Sekunden
   - Keine Freezes

Result:
- Load Time: _______ Sekunden
- Graph Time: _______ Sekunden
- [ ] PASS (< 4s gesamt) [ ] FAIL

### Test 2: 100 Personen (5 Minuten)
Wiederhole Test 1 mit ~100 Personen

Result:
- Load Time: _______ Sekunden
- Graph Time: _______ Sekunden
- [ ] PASS (< 6s gesamt) [ ] WARN [ ] FAIL

### Test 3: Local Storage Size (2 Minuten)
1. Öffne DevTools → Application Tab
2. Gehe zu Local Storage → deine Domain
3. Finde "herdata_basket" Key
4. Rechtsklick → Copy value
5. Füge in Text-Editor ein
6. Zähle Characters (oder check File Size)

Result:
- 50 Personen: _______ KB
- 100 Personen: _______ KB
- [ ] < 100 KB (OK)
- [ ] 100-500 KB (Grenzwertig)
- [ ] > 500 KB (Problematisch)

## Browser-Kompatibilität Test

### Chrome/Edge
- [ ] Alle Features funktionieren
- [ ] Keine Console-Errors
- [ ] CSS rendering korrekt

### Firefox
- [ ] Alle Features funktionieren
- [ ] Keine Console-Errors
- [ ] CSS rendering korrekt

### Safari (optional)
- [ ] Alle Features funktionieren
- [ ] Keine Console-Errors
- [ ] CSS rendering korrekt

## Mobile/Responsive Test

Öffne Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)

### iPhone SE (375x667)
1. Teste Karte + Popups
   - [ ] Buttons groß genug
   - [ ] Text lesbar
2. Teste Wissenskorb-Seite
   - [ ] Liste scrollbar
   - [ ] Graph sichtbar
   - [ ] Export-Buttons funktionieren

### iPad (768x1024)
1. Teste alle Ansichten
   - [ ] Layout sieht gut aus
   - [ ] Touch funktioniert

## Bug-Report Template

Falls du Bugs findest, dokumentiere sie so:

```markdown
### Bug #1: [Kurze Beschreibung]

Severity: [ ] BLOCKER [ ] HIGH [ ] MEDIUM [ ] LOW

Schritte zum Reproduzieren:
1. ...
2. ...
3. ...

Erwartetes Verhalten:
...

Tatsächliches Verhalten:
...

Browser: Chrome 120 / Firefox 121 / Safari 17
OS: Windows 11 / macOS 14 / Linux
Device: Desktop / Mobile

Screenshot/Console Error:
...
```

## Test-Zusammenfassung

Datum: _______________________
Tester: _______________________
Dauer: _______________________

### Ergebnis
- [ ] PRODUCTION READY - Keine kritischen Bugs
- [ ] NEEDS FIXES - Bugs müssen behoben werden
- [ ] NEEDS REWORK - Größere Probleme

### Kritische Bugs
Count: _______
Details: siehe Bug-Reports

### Performance
- [ ] EXCELLENT (< 3s für 50 Personen)
- [ ] GOOD (3-5s für 50 Personen)
- [ ] ACCEPTABLE (5-10s für 50 Personen)
- [ ] POOR (> 10s für 50 Personen)

### Browser-Kompatibilität
- [ ] PASS - Alle getesteten Browser funktionieren
- [ ] PARTIAL - Kleinere Issues in manchen Browsern
- [ ] FAIL - Größere Probleme

### Empfehlung
[ ] Deploy to Production
[ ] Fix Bugs first
[ ] Further Development needed

### Notizen
```
...
```
