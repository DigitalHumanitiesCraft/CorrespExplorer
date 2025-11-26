# Network View Konzept

Konzeptdokument fuer eine neue Netzwerk-Ansicht im CorrespExplorer, die alle verfuegbaren Datenfelder integriert.

---

## Motivation

### Ungenutzte Daten

Die Analyse des HSA-Datensatzes zeigt, dass wesentliche Datenfelder nicht visualisiert werden:

| Datenfeld | Umfang | Aktueller Status |
|-----------|--------|------------------|
| subjects (Themen) | 1.622 Eintraege | Komplett ungenutzt |
| mentionsSubject | 23.020 Vorkommen | Nur im Brief-Detail |
| mentionsPerson | 17.413 Vorkommen | Nur im Brief-Detail |
| mentionsPlace | 5.955 Vorkommen | Nur im Brief-Detail |
| persons.letters_sent/received | Vorberechnet | Wird neu berechnet |

### Forschungsfragen

Eine Netzwerk-Ansicht soll typische Forschungsfragen der Romanistik adressieren:

1. Thematische Netzwerke: Welche Themen verbinden verschiedene Korrespondenten?
2. Wissenstransfer: Wie verbreiten sich Themen ueber Zeit und Raum?
3. Soziale Netzwerke: Wer sind die zentralen Vermittler im Briefnetzwerk?
4. Mehrsprachigkeit: In welchen Sprachen werden welche Themen diskutiert?

Beispiel-Forschungsfrage: "Ueber was haben Romanisten geschrieben?"
- Top-Themen identifizieren (Baskisch, Kreolsprachen, Phonetik)
- Welche Korrespondenten diskutieren diese Themen?
- Zeitliche Entwicklung der Diskurse

---

## Visualisierungs-Optionen

### Option A: Force-Directed Graph (Netzwerk)

Klassische Netzwerkdarstellung mit Knoten und Kanten.

Varianten:
- Person-zu-Person: Knoten = Korrespondenten, Kanten = Briefwechsel
- Person-zu-Thema: Bipartiter Graph mit Personen und Subjects
- Thema-zu-Thema: Kanten = Gemeinsame Briefe/Personen

Vorteile:
- Intuitive Darstellung von Beziehungen
- Cluster werden sichtbar
- Interaktiv (Zoom, Drag, Highlight)

Nachteile:
- Bei vielen Knoten unuebersichtlich (HSA: 846 Personen)
- Performance bei grossen Graphen
- Subjektive Layout-Interpretation

Technologie: D3.js force simulation oder vis.js

### Option B: Sankey-Diagramm

Fluss-Darstellung von Beziehungen zwischen Kategorien.

Aufbau:
- Links: Absender-Kategorien (z.B. nach Ort/Institution)
- Mitte: Themen/Sprachen
- Rechts: Empfaenger oder Zeitraeume

Vorteile:
- Zeigt Proportionen klar
- Gut fuer Aggregationen
- Weniger Clutter als Netzwerk

Nachteile:
- Verliert individuelle Verbindungen
- Begrenzte Interaktivitaet

Technologie: D3.js sankey

### Option C: Matrix-Heatmap

Zweidimensionale Darstellung von Beziehungs-Intensitaet.

Achsen:
- X: Personen (sortiert nach Briefanzahl)
- Y: Themen (sortiert nach Haeufigkeit)
- Farbe: Anzahl Erwaehungen

Vorteile:
- Kompakte Darstellung vieler Beziehungen
- Muster gut erkennbar
- Keine Layout-Probleme

Nachteile:
- Abstrakt, weniger intuitiv
- Skaliert schlecht bei vielen Eintraegen

Technologie: D3.js oder Canvas-basiert

### Option D: Chord-Diagramm

Kreisfoermige Darstellung von Flussbeziehungen.

Aufbau:
- Segmente = Personen oder Themen
- Baender = Verbindungen mit Staerke

Vorteile:
- Aesthetisch ansprechend
- Zeigt bidirektionale Beziehungen

Nachteile:
- Begrenzt auf ca. 50 Elemente
- Schwer lesbar bei vielen Verbindungen

### Option E: Dashboard (Kombiniert)

Mehrere kleine Visualisierungen auf einer Seite.

Komponenten:
- Mini-Netzwerk: Top 20 Korrespondenten
- Top-Themen-Liste: Klickbar zum Filtern
- Themen-Timeline: Wann wurde worüber geschrieben
- Sprach-Verteilung: Pie/Bar Chart

Vorteile:
- Flexibel, zeigt verschiedene Aspekte
- Keine Ueberladung einzelner Visualisierungen
- Progressive Exploration

Nachteile:
- Mehr Entwicklungsaufwand
- Zusammenhang weniger direkt sichtbar

---

## Empfehlung: Themen-Explorer (Dashboard-Ansatz)

Fuer den HSA-Datensatz wird ein Dashboard mit Themen-Fokus empfohlen:

### Aufbau

```
+------------------------------------------+
|  Themen-Explorer                          |
+------------------------------------------+
|  [Themen-Wolke / Top 20 Subjects]        |
|                                           |
|  Klick waehlt Thema                       |
+------------------------------------------+
|  Ausgewaehltes Thema: "Baskisch"         |
+------------------+------------------------+
|  Korrespondenten |  Zeitverlauf           |
|  - Spitzer (45)  |  [Balkendiagramm]      |
|  - Vossler (32)  |                        |
|  - Meyer (28)    |                        |
+------------------+------------------------+
|  Verwandte Themen | Briefe mit Thema      |
|  - Kreolisch     |  [Liste, max 10]       |
|  - Phonetik      |                        |
+------------------+------------------------+
```

### Interaktion

1. Nutzer sieht Top-Themen als klickbare Tags
2. Klick auf Thema zeigt:
   - Welche Korrespondenten erwaehnen es
   - Zeitliche Verteilung
   - Verwandte Themen (Co-Occurrence)
   - Beispiel-Briefe
3. Klick auf Korrespondent aktiviert Person-Filter
4. Filter aus anderen Views werden uebernommen

### Datenaufbereitung

Neue Indizes berechnen:

```javascript
// Subject-zu-Person Index
subjectPersons = {
  "subject_id": {
    label: "Baskisch",
    persons: [
      { id: "person_1", name: "Spitzer", count: 45 },
      { id: "person_2", name: "Vossler", count: 32 }
    ],
    years: { 1900: 5, 1901: 12, ... },
    letter_count: 698
  }
}

// Co-Occurrence Index
subjectCooccurrence = {
  "subject_id": {
    related: [
      { id: "other_subject", label: "Kreolisch", count: 45 },
      ...
    ]
  }
}
```

---

## Technische Umsetzung

### Phase 1: Themen-Filter (Sidebar)

Erweiterung der bestehenden Sidebar um Subject-Filter:
- Top 10 Themen als Checkboxen
- Filter wirkt auf alle Views

### Phase 2: Themen-Explorer View

Neuer View neben Karte/Personen/Briefe/Timeline:
- Themen-Wolke oder Top-Liste
- Detail-Panel bei Auswahl
- Integration mit bestehendem Filter-System

### Phase 3: Netzwerk-Graph (Optional)

Force-Directed Graph fuer Person-zu-Thema-Beziehungen:
- Begrenzt auf aktuell gefilterte Daten
- Interaktive Exploration

---

## User Stories

### US-25: Themen durchsuchen
Als Forschende moechte ich alle Themen des Datensatzes durchsuchen, um relevante Diskurse zu finden.

Akzeptanzkriterien:
- Liste oder Wolke der Top-Themen
- Suchfeld fuer Themen
- Anzeige der Briefanzahl pro Thema
- Status: OFFEN

### US-26: Thema-Detail ansehen
Als Forschende moechte ich zu einem Thema sehen, wer darueber geschrieben hat und wann.

Akzeptanzkriterien:
- Liste der Korrespondenten mit Themen-Erwaehnung
- Zeitliche Verteilung der Erwaehungen
- Verwandte Themen
- Status: OFFEN

### US-27: Nach Thema filtern
Als Forschende moechte ich alle Briefe filtern, die ein bestimmtes Thema erwaehnen.

Akzeptanzkriterien:
- Klick auf Thema aktiviert Filter
- Filter-Badge in Sidebar
- Alle Views zeigen nur gefilterte Briefe
- Status: OFFEN (entspricht US-17)

---

## Abhaengigkeiten

- Subjects-Index muss im Frontend verfuegbar sein (bereits in hsa-letters.json)
- mentions.subjects muss in Brief-Objekten vorhanden sein (bereits implementiert)
- Performance-Test mit 1.622 Themen erforderlich

---

## Offene Fragen

1. Sollen alle 1.622 Themen angezeigt werden oder nur Top N?
2. Wie mit HSA-spezifischen Subject-Kategorien umgehen (HSA-Subjects vs. Lexvo)?
3. Soll der Themen-Explorer ein eigener View sein oder Teil der Sidebar?
4. Prioritaet gegenueber Netzwerk-Graph?

---

## Naechste Schritte

1. Entscheidung: Themen-Filter in Sidebar vs. eigener View
2. UI-Mockup erstellen
3. Datenstruktur fuer Subject-Indizes definieren
4. Implementation beginnen
