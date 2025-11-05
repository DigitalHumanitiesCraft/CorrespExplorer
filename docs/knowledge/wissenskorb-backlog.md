# Wissenskorb - Offene Punkte und Implementierungsplan

Stand: 05.11.2025

## Status-Übersicht

### Implementiert (Phasen 1-4)

- BasketManager mit Local Storage Persistierung
- Navigation mit Badge in allen 5 Navbar-Varianten
- Dedizierte Wissenskorb-Seite mit Personenliste
- Netzwerk-Visualisierung (SVG, circular layout)
- CSV/JSON Export-Funktionen
- Integration in Synthesis-Ansicht
- Integration in Brief-Explorer (batch-add filtered persons)
- Integration in Person-Detailseite (toggle button)
- Toast-Notifications zentralisiert in utils.js
- Multi-Tab-Synchronisation via Storage Events
- Kein Limit für Personenanzahl

### Nicht implementiert

1. Karten-Integration (4 von 5 Ansichten integriert, Karte fehlt)
2. Erweiterte Visualisierungen auf Wissenskorb-Seite
3. Sharing-Funktionalität
4. Notiz-Funktion
5. Mehrere Sammlungen
6. Code-Dokumentation (JSDoc)
7. Testing
8. Performance-Optimierungen

## Offene Punkte - Kategorisiert und Evaluiert

### Kategorie A: Code-Qualität (Pragmatisch)

#### A1: JSDoc-Dokumentation

Status: OFFEN
Priorität: MITTEL
Aufwand: 1-2 Stunden

Details:
- BasketManager.js hat keine JSDoc-Kommentare
- Keine Type-Definitionen für Person-Objekte
- Fehlende Dokumentation für öffentliche API

Begründung:
- Verbessert IDE-Unterstützung
- Reduziert Fehler bei zukünftigen Änderungen
- Hilft anderen Entwicklern beim Verständnis

Empfehlung: DURCHFÜHREN (später)

#### A2: Konstanten extrahieren

Status: TEILWEISE (TOAST_CONFIG existiert)
Priorität: NIEDRIG
Aufwand: 30 Minuten

Details:
- SVG-Graph hat magic numbers (24, 28 für Radius)
- Timeouts und Delays im Code verstreut
- CSS-Werte direkt im JavaScript

Begründung:
- Geringe Priorität, da Code funktioniert
- Nur relevant wenn Werte oft geändert werden

Empfehlung: OPTIONAL

#### A3: Error-Handling verbessern

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 2 Stunden

Details:
- Storage Quota-Fehler nur mit console.error
- Keine graceful degradation bei fehlendem Storage
- Keine strukturierte Error-Klasse

Begründung:
- Fehler treten in der Praxis selten auf
- Aktuelle Lösung ist ausreichend
- Nur relevant bei sehr vielen Personen (>200)

Empfehlung: OPTIONAL

### Kategorie B: Features (Nicht implementiert)

#### B1: Karten-Integration

Status: OFFEN
Priorität: MITTEL
Aufwand: 1 Stunde

Details:
- Add-to-Basket Button in Marker-Popups fehlt
- Datei: docs/js/app.js (Karte)
- 4 von 5 Ansichten integriert, nur Karte fehlt

Begründung:
- Vervollständigt die Integration
- Nutzer erwarten konsistente Funktionalität
- Relativ einfach umzusetzen

Empfehlung: DURCHFÜHREN

#### B2: Timeline-Visualisierung auf Wissenskorb-Seite

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 2-3 Stunden

Details:
- Wissenskorb hat nur Netzwerk-Visualisierung
- Timeline existiert bereits in Synthesis-Ansicht
- Code könnte wiederverwendet werden

Begründung:
- Synthesis-Tab hat bereits Timeline
- Doppelte Funktionalität
- Nutzer können Synthesis-Ansicht nutzen

Empfehlung: SKIP (nicht notwendig)

#### B3: Geografische Verteilung auf Wissenskorb-Seite

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 3-4 Stunden

Details:
- Mini-Karte mit MapLibre
- Zeigt Geburtsorte/Sterbeorte der Personen im Korb
- Cluster-Darstellung

Begründung:
- Hauptkarte existiert bereits
- Aufwand hoch für begrenzten Mehrwert
- Nicht in ursprünglichem Plan

Empfehlung: SKIP (nicht notwendig)

#### B4: Berufsverteilung auf Wissenskorb-Seite

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 2 Stunden

Details:
- Chart/Treemap für Berufe im Korb
- Zeigt Häufigkeit der Occupations
- Interaktiv mit Filterung

Begründung:
- Brief-Explorer hat bereits Berufsvisualisierung
- Doppelte Funktionalität
- Geringer Mehrwert

Empfehlung: SKIP (nicht notwendig)

#### B5: Sharing-Funktionalität

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 2-3 Stunden

Details:
- URL-basiertes Teilen: wissenskorb.html?ids=123,456,789
- Ermöglicht Teilen von Sammlungen
- Import/Export zwischen Geräten

Begründung:
- Nützlich, aber nicht kritisch
- JSON-Export existiert bereits als Workaround
- Komplexität durch URL-Längen-Limits

Empfehlung: OPTIONAL (nice-to-have)

#### B6: Notiz-Funktion

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 3-4 Stunden

Details:
- Nutzer können Notizen zu Personen hinzufügen
- Speicherung in Local Storage
- Bearbeiten/Löschen von Notizen

Begründung:
- Nicht in ursprünglichem Konzept
- Scope Creep
- Aufwand hoch für unsicheren Nutzen

Empfehlung: SKIP (out of scope)

#### B7: Mehrere Sammlungen

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 4-6 Stunden

Details:
- Benannte Sammlungen
- Wechseln zwischen Sammlungen
- Verwaltungs-UI

Begründung:
- Erhöht Komplexität erheblich
- Use Case unklar
- Eine Sammlung ist ausreichend

Empfehlung: SKIP (out of scope)

### Kategorie C: Testing und QA

#### C1: Manuelle Tests

Status: OFFEN
Priorität: HOCH
Aufwand: 2-3 Stunden

Details:
- Basis-Funktionalität testen (Add, Remove, Export)
- Edge Cases (leerer Korb, viele Personen, Duplikate)
- Browser-Kompatibilität (Chrome, Firefox, Safari)
- Responsive Design (Desktop, Tablet, Mobile)

Begründung:
- Kritisch für Produktionsreife
- Verhindert Bugs in Produktion
- Schnell durchführbar

Empfehlung: DURCHFÜHREN (Priorität 1)

#### C2: Performance-Tests

Status: OFFEN
Priorität: MITTEL
Aufwand: 1 Stunde

Details:
- Test mit 50, 100, 200 Personen
- Netzwerk-Visualisierung Performance
- Local Storage Größe messen
- Batch-Add Performance

Begründung:
- Wichtig für UX bei vielen Personen
- Identifiziert potenzielle Bottlenecks
- Validiert "kein Limit" Design-Entscheidung

Empfehlung: DURCHFÜHREN (nach manuellen Tests)

#### C3: Automatisierte Tests

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 6-8 Stunden

Details:
- Unit Tests für BasketManager
- Integration Tests
- E2E Tests mit Playwright/Cypress

Begründung:
- Hoher Aufwand
- Keine CI/CD Pipeline vorhanden
- Für kleines Projekt übertrieben

Empfehlung: SKIP (nicht verhältnismäßig)

### Kategorie D: Performance-Optimierungen

#### D1: Debounced Save

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 30 Minuten

Details:
- Local Storage wird bei jedem Add/Remove gespeichert
- Könnte mit 300ms Debounce optimiert werden
- Reduziert I/O bei Batch-Operationen

Begründung:
- Aktuell keine Performance-Probleme
- Premature Optimization
- Nur relevant bei extrem schnellen Batch-Adds

Empfehlung: SKIP (nicht notwendig)

#### D2: Network-Graph Performance

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 4-6 Stunden

Details:
- Force-directed Layout statt circular
- Zoom/Pan Funktionalität
- WebGL-Rendering für viele Nodes

Begründung:
- Circular Layout ist für <50 Personen ausreichend
- Hoher Aufwand
- Use Case unklar (wie viele Personen sammeln Nutzer wirklich?)

Empfehlung: OPTIONAL (nur bei nachgewiesenem Bedarf)

#### D3: Batch-Add mit Progress-Indicator

Status: OFFEN
Priorität: NIEDRIG
Aufwand: 1 Stunde

Details:
- Loading-Spinner bei >20 Personen
- Progress-Bar zeigt Fortschritt
- Verhindert mehrfaches Klicken

Begründung:
- UX-Verbesserung
- Nur relevant bei sehr großen Batches
- Einfach zu implementieren

Empfehlung: OPTIONAL (nice-to-have)

## Implementierungsplan - Priorisiert

### Phase 5a: Testing und Stabilisierung (EMPFOHLEN)

Priorität: HOCH
Gesamtaufwand: 3-4 Stunden

Schritte:

1. Manuelle Tests durchführen (2 Stunden)
   - Checkliste erstellen
   - Alle Ansichten testen
   - Edge Cases validieren
   - Browser-Kompatibilität prüfen
   - Mobile/Responsive testen

2. Performance-Tests (1 Stunde)
   - 50, 100, 200 Personen testen
   - Netzwerk-Graph Performance messen
   - Batch-Add Performance validieren
   - Local Storage Größe checken

3. Bug-Fixes basierend auf Tests (1 Stunde)
   - Gefundene Probleme beheben
   - Regression-Tests
   - Dokumentation aktualisieren

Validierung:
- Alle Tests bestanden
- Keine kritischen Bugs
- Performance akzeptabel
- Mobile funktioniert

Ergebnis: Produktionsreife Wissenskorb-Implementierung

### Phase 5b: Karten-Integration (EMPFOHLEN)

Priorität: MITTEL
Gesamtaufwand: 1 Stunde

Schritte:

1. Popup-Template erweitern (20 Minuten)
   - Add-to-Basket Button in Marker-Popup
   - Icon und Styling
   - Datei: docs/js/app.js

2. Event-Handler implementieren (20 Minuten)
   - BasketManager.add() aufrufen
   - Button-State aktualisieren
   - Toast-Notification zeigen

3. Testen (20 Minuten)
   - Add/Remove aus Popup
   - Badge-Update validieren
   - Multi-Marker testen

Validierung:
- Button funktioniert in allen Popups
- State synchronisiert sich
- Toast erscheint

Ergebnis: 5 von 5 Ansichten integriert

### Phase 5c: Dokumentation (OPTIONAL)

Priorität: MITTEL
Gesamtaufwand: 2-3 Stunden

Schritte:

1. JSDoc für BasketManager (1 Stunde)
   - Alle öffentlichen Funktionen
   - Type-Definitionen für Person
   - Beispiele für API-Nutzung

2. Nutzer-Dokumentation (1 Stunde)
   - README-Sektion für Wissenskorb
   - Screenshots/GIFs
   - Nutzungsszenarien

3. Code-Kommentare vervollständigen (30 Minuten)
   - Komplexe Logik erklären
   - Warum-Kommentare hinzufügen

Validierung:
- IDE zeigt Tooltips
- Dokumentation verständlich
- Code selbsterklärend

Ergebnis: Vollständig dokumentierte Implementierung

### Phase 5d: Nice-to-have Features (SKIP)

Priorität: NIEDRIG
Gesamtaufwand: 8-10 Stunden

Features:
- Sharing via URL (2-3 Stunden)
- Batch-Add Progress-Indicator (1 Stunde)
- Timeline auf Wissenskorb-Seite (2-3 Stunden)
- Geografische Verteilung (3-4 Stunden)

Empfehlung: SKIP (nicht notwendig für MVP)

Begründung:
- Hoher Aufwand
- Geringer Mehrwert
- Bestehende Funktionen ausreichend
- Besser: User Feedback abwarten

## Konkrete Empfehlung

### Minimale Fertigstellung

Durchführen:
1. Phase 5a: Testing und Stabilisierung (3-4 Stunden)
2. Phase 5b: Karten-Integration (1 Stunde)

Gesamt: 4-5 Stunden

Ergebnis:
- Vollständig getestete, stabile Implementierung
- Alle 5 Ansichten integriert
- Produktionsreif

### Erweiterte Fertigstellung

Zusätzlich durchführen:
3. Phase 5c: Dokumentation (2-3 Stunden)

Gesamt: 6-8 Stunden

Ergebnis:
- Wie oben, plus vollständige Dokumentation
- Wartbar für zukünftige Entwickler
- Professional-Grade Code

### Maximale Fertigstellung

Zusätzlich durchführen:
4. Sharing via URL (2-3 Stunden)
5. Batch-Add Progress (1 Stunde)

Gesamt: 9-12 Stunden

Ergebnis:
- Alle sinnvollen Features implementiert
- Optimale UX
- Keine weiteren Wünsche offen

## Nächster Schritt

Entscheidung erforderlich: Welche Phase durchführen?

Empfehlung: Minimale Fertigstellung (Phasen 5a + 5b)

Begründung:
- Testing ist kritisch für Produktionsreife
- Karten-Integration vervollständigt die Vision
- Zeitaufwand vertretbar (4-5 Stunden)
- Weitere Features können später hinzugefügt werden

Dokumentation kann später nachgeholt werden, wenn Bedarf besteht.
