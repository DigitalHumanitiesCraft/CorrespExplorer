# Netzwerk-Visualisierung: Analyse und Verbesserungspotenziale

Stand: 09.11.2025
Basis: Screenshot der Kartenansicht mit AGRELON-Beziehungen

## Ist-Zustand

### Was der Screenshot zeigt

Visualisierte Elemente:
- 37 Frauen in einem Cluster-Popup
- 8 AGRELON-Verbindungen (rosa Linien = Familie)
- 33 Absenderinnen, 35 erwähnte Frauen
- Geografische Positionen (Hamburg, Potsdam, Nürnberg, weitere Orte)
- Cluster-Größenindikatoren (2, 7, 23 Personen)

Technische Umsetzung:
- MapLibre GL JS Kartenvisualisierung
- Hover-basierte Anzeige von Beziehungslinien
- Farbcodierung: Familie #ff0066 (Pink), Beruflich #00ccff (Cyan), Sozial #ffcc00 (Gelb)
- Linienbreite 4-12px mit Glow-Effekt
- Bidirektionale Beziehungen

### Aktuelle Datenbasis

AGRELON-Beziehungen in persons.json:
- 86 Beziehungseinträge total (67 betroffene Personen, 15%)
- Nur Frau-Frau-Beziehungen zwischen den 448 kuratierten Frauen
- Kategorien: Familie 80 (95,2%), Beruflich 2 (2,4%), Sozial 2 (2,4%)
- Auf Karte sichtbar: 50 Beziehungen (beide Personen mit Geodaten)

Korrespondenz-Daten in persons.json:
- 1.793 Briefe mit Frauenbezug (191 Absenderinnen)
- 230 Frauen mit correspondence-Arrays (51,3%)
- Felder: letter_years[], letter_count, mention_count
- Detaillierte correspondence[]: type (sent/mentioned), date, year, place, recipient, recipient_gnd

Temporale Daten:
- letter_years: Array von Jahren (1762-1824)
- dates.birth / dates.death: Lebensdaten (421 Frauen, 94%)
- correspondence[].year: Briefjahr pro Eintrag

Geodaten:
- places[]: 227 Frauen (50,7%) mit Koordinaten
- Mehrere Orte pro Person: Geburtsort, Wirkungsort, Sterbeort, Wohnort

## Ungenutzte Potenziale

### 1. Korrespondenz-Netzwerk

Aktuelle Limitation: Nur AGRELON-Beziehungen visualisiert (86 Einträge, hauptsächlich Familie)

Verfügbare Daten:
- correspondence[]: 8.039 Einträge mit type=sent/mentioned
- recipient_gnd: Empfänger-IDs (hauptsächlich Goethe)
- Absender-Empfänger-Paare für Brief-Netzwerk

Mögliche Visualisierung:
- Briefwechsel-Linien zwischen Frauen (falls vorhanden)
- Intensität nach Briefanzahl (Liniendicke)
- Temporale Animation (Briefe über Zeit)
- Filter: Nur gegenseitiger Briefwechsel vs. einseitiger Kontakt

Technische Herausforderung:
- Aktuell recipient_gnd hauptsächlich Goethe (118540238)
- Frau-zu-Frau-Korrespondenz muss aus Daten extrahiert werden
- Matching via GND zwischen sender und recipient

### 2. Temporale Dimension

Aktuell:
- Statische Darstellung ohne Zeitkontext
- Zeitfilter vorhanden, aber keine Animation

Verfügbare Daten:
- letter_years[] pro Person
- correspondence[].year pro Brief
- dates.birth/death für Lebensspanne

Verbesserungsmöglichkeiten:
- Timeline-Slider mit Animation (Jahr für Jahr durchspielen)
- Fade-in/out von Verbindungen basierend auf Briefdatum
- Lebensspannen-Visualisierung (wer lebte wann)
- Dekaden-Ansicht (1760er, 1770er, etc.)
- Kumulatives Netzwerk (Beziehungen aufbauen über Zeit)

### 3. Intensität und Frequenz

Aktuell:
- Binäre Darstellung (Beziehung ja/nein)
- Keine Gewichtung nach Briefanzahl

Verfügbare Daten:
- letter_count: Anzahl gesendeter Briefe pro Person
- mention_count: Anzahl Erwähnungen
- correspondence[].length: Anzahl Kontakte

Verbesserungsmöglichkeiten:
- Liniendicke nach Briefanzahl skalieren
- Opazität nach Häufigkeit (mehr Briefe = intensivere Farbe)
- Kategorisierung: Sporadisch (<5), Regelmäßig (5-20), Intensiv (>20)
- Node-Größe nach Gesamtaktivität (total letters + mentions)

### 4. Geografische Zentren

Aktuell:
- Einzelne Orte ohne Zusammenhang
- Keine Visualisierung von Bewegungen

Verfügbare Daten:
- places[].type: Wirkungsort, Geburtsort, Sterbeort, Wohnort
- correspondence[].place: Absenderort pro Brief

Verbesserungsmöglichkeiten:
- Mehrfach-Orte pro Person zeigen (Lebenslauf-Pfade)
- Brief-Absenderorte visualisieren (woher geschrieben)
- Migrations-Muster (Geburtsort → Wirkungsort → Sterbeort)
- Regionale Cluster hervorheben (Weimar-Zentrum vs. Berlin-Kreis)
- Orte als Hub-Nodes (Größe = Anzahl Frauen an diesem Ort)

### 5. Beziehungstypen detailliert

Aktuell:
- 3 Kategorien: Familie, Beruflich, Sozial
- Generische Labels

Verfügbare Daten:
- relationships[].type: 38 AGRELON-Typen (Tochter, Mutter, Schwester, etc.)
- relationships[].reciprocal_type: Bidirektionale Bezeichnung

Verbesserungsmöglichkeiten:
- Tooltip mit exaktem Beziehungstyp (nicht nur "Familie")
- Filter nach spezifischem Typ (nur Mutter-Tochter, nur Schwestern)
- Generationen-Visualisierung (Eltern → Kinder → Enkel)
- Familienstammbäume als Subgraphen
- Berufs-Netzwerke separat (Kollaboratoren, Mäzene, Lehrer-Schüler)

### 6. Rollen-Differenzierung

Aktuell:
- role: sender/mentioned/both/indirect
- Farbcodierung der Nodes

Ungenutzt:
- Sender-Mention-Asymmetrie (A schreibt über B, aber B nie über A)
- Reziprozität visualisieren
- Zentrale vs. periphere Akteurinnen

Verbesserungsmöglichkeiten:
- Pfeilspitzen für gerichtete Beziehungen (A → B)
- Doppelpfeil für gegenseitige Korrespondenz (A ↔ B)
- Node-Form: Kreis=Absenderin, Quadrat=nur erwähnt, Diamant=beides
- Zentralitäts-Metriken (wer ist am stärksten vernetzt)

### 7. Mehrdimensionale Filter

Aktuell:
- Filter nach Aktivität, Berufsgruppe, Zeit, Ortstyp
- Keine kombinierte Netzwerk-Ansicht

Verbesserungsmöglichkeiten:
- Netzwerk-Filter: Nur Familie / Nur Beruflich / Nur Sozial
- Zeige nur Personen mit min. X Verbindungen
- Kombinationsfilter: "Absenderinnen aus Weimar mit Familienbeziehungen"
- Ego-Netzwerk: Wähle Person, zeige nur deren direktes Umfeld

## Ästhetische Verbesserungen

### Visuelle Hierarchie

Problem: Alle Linien gleich prominent

Lösungen:
- Z-Index: Familie vorne, Beruflich mittig, Sozial hinten
- Opazität: Primäre Beziehungen 100%, sekundäre 40%
- Gestrichelte Linien für indirekte/unsichere Beziehungen
- Animierte Linien für aktive Korrespondenz

### Lesbarkeit bei Überlappung

Problem: Viele Linien überlappen (siehe Screenshot)

Lösungen:
- Curve-Interpolation statt geraden Linien (Bezier-Kurven)
- Edge-Bundling für parallele Verbindungen
- Hierarchisches Layout (wichtige Nodes zentral)
- Transparenz-Gradient (Mitte der Linie transparenter)

### Interaktionsfeedback

Aktuell: Hover zeigt Linien

Erweiterungen:
- Highlight-Effekt beim Hover (Linie dicker + leuchtend)
- Dimming anderer Linien (nur gehoberte Beziehung voll sichtbar)
- Tooltip an Linienmitte (nicht nur an Nodes)
- Click-to-lock (Beziehung fixieren, weitere Nodes erkunden)

### Farbpalette

Aktuell: Pink, Cyan, Gelb

Überlegungen:
- Historisch angemessene Palette (Sepia-Töne für Familie)
- Accessibility: Farbenblind-sichere Palette testen
- Gradient für Intensität (hell → dunkel = wenig → viel Kontakt)
- Farbcodierung nach Dekade (1760er = blau, 1820er = rot)

### Cluster-Darstellung

Problem: Cluster verdeckt Einzelpersonen

Lösungen:
- Cluster-Expansion als Kreis (Personen um Zentrum anordnen)
- Cluster-Teaser: Zeige 3 wichtigste Personen im Cluster
- Sankey-Diagram für Cluster-zu-Cluster-Beziehungen
- Heatmap-Overlay (Dichte der Beziehungen)

## Technische Umsetzbarkeit

### Einfach (Quick Wins)

- Tooltip mit exaktem AGRELON-Typ (Daten vorhanden, nur UI-Änderung)
- Liniendicke nach Briefanzahl (letter_count bereits vorhanden)
- Filter: Nur Familie / Beruflich / Sozial (Kategorien vorhanden)
- Node-Größe nach Aktivität (letter_count + mention_count)

### Mittel (Moderate Komplexität)

- Temporale Animation (Timeline-Slider + Filter nach letter_years)
- Pfeilspitzen für gerichtete Beziehungen (MapLibre Symbol-Layer)
- Curve-Interpolation (Custom Line-Renderer)
- Mehrfach-Orte pro Person (places[] Loop)

### Komplex (Forschungsaufwand)

- Frau-zu-Frau-Korrespondenz extrahieren (Datenanalyse erforderlich)
- Generationen-Visualisierung (AGRELON-Graph-Analyse)
- Edge-Bundling (D3.js oder spezielle Library)
- Zentralitäts-Metriken (Graph-Algorithmen)

## Empfehlungen

### Phase 1: Datenverbesserung

1. Analysiere correspondence[] nach Frau-zu-Frau-Verbindungen
   - Matching: sender.gnd in persons[] ↔ recipient_gnd
   - Neue Relation: letter_exchange mit count

2. Erweitere relationships[] um Intensität
   - Zähle Briefe zwischen verbundenen Personen
   - Feld: connection_strength (1-100)

3. Extrahiere Migrations-Pfade
   - Sortiere places[] nach type (Geburt → Wohnort → Sterbeort)
   - Zeitstempel falls vorhanden

### Phase 2: Quick Win Visualisierungen

1. Detaillierte Tooltips
   - Zeige AGRELON-Typ statt nur Kategorie
   - Briefanzahl falls vorhanden
   - Zeitspanne der Beziehung

2. Liniengewichtung
   - Dicke = Anzahl Briefe
   - Opazität = Intensität

3. Netzwerk-Filter
   - Toggle: Familie / Beruflich / Sozial
   - Min. Verbindungen-Slider

### Phase 3: Temporale Dimension

1. Timeline-Slider
   - Jahr-für-Jahr-Animation
   - Fade-in/out von Beziehungen
   - Kumulativ vs. Snapshot-Modus

2. Dekaden-Ansicht
   - Aggregation nach 10-Jahres-Perioden
   - Vergleich 1760er vs. 1820er

### Phase 4: Advanced Features

1. Ego-Netzwerk-Ansicht
   - Klick auf Person → isoliertes Subnetzwerk
   - 1st/2nd/3rd degree connections

2. Geografische Bewegungen
   - Lebenslauf-Pfade als animierte Linien
   - Brief-Absenderorte als Heatmap

3. Alternative Layouts
   - Force-directed Graph (nicht nur geografisch)
   - Hierarchisch (Generationen vertikal)
   - Chord-Diagram (alle Verbindungen auf einen Blick)

## Zusammenfassung

### Größtes ungenutztes Potenzial

1. Korrespondenz-Netzwerk (Briefe zwischen Frauen)
2. Temporale Animation (Beziehungen über Zeit)
3. Intensitäts-Gewichtung (Häufigkeit visualisieren)

### Wichtigste ästhetische Verbesserungen

1. Curve-Interpolation gegen Überlappung
2. Detaillierte Tooltips (AGRELON-Typen)
3. Interaktionsfeedback (Hover-Highlight)

### Nächste Schritte

1. Datenanalyse: Frau-zu-Frau-Korrespondenz identifizieren
2. Prototyp: Timeline-Slider für temporale Ansicht
3. UI-Verbesserung: Tooltips mit exakten Beziehungstypen
