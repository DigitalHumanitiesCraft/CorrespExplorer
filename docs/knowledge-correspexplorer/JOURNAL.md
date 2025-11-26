# Journal: CorrespExplorer

Entwicklungsprotokoll für die Generalisierung von HerData zum CorrespExplorer.

## 2025-11-26

### Projektstart und Datenanalyse

Beginn der Generalisierung des HerData-Projekts. Ziel: Ein Tool, das beliebige CMIF-Daten verarbeiten kann.

**Erste Datenquelle:** Hugo Schuchardt Archiv (HSA)
- CMIF-Datei: data/hsa/CMIF.xml
- 11.576 Briefe
- Zeitraum: 1866-1925

### Strukturelle Erkenntnisse HSA vs. PROPYLÄEN

**Unterschied 1: Netzwerkstruktur**

PROPYLÄEN ist ein ein-zentriertes Netzwerk (alle Briefe an Goethe). HSA ist ein ego-zentriertes Netzwerk (Briefe an und von Schuchardt). Das bedeutet:
- HSA hat 113 verschiedene Empfänger
- Bidirektionale Korrespondenz visualisierbar
- Korrespondenz-Beziehungen sind symmetrischer

**Unterschied 2: Erweiterte Metadaten**

HSA verwendet das LOD Academy CMIF Vocabulary mit:
- `mentionsSubject`: 1.622 eindeutige Themen (23.020 Vorkommen)
- `mentionsPlace`: 336 erwähnte Orte (5.955 Vorkommen)
- `mentionsPerson`: 2.081 erwähnte Personen (17.413 Vorkommen)

Diese Metadaten existieren in PROPYLÄEN nicht und eröffnen neue Visualisierungsmöglichkeiten.

**Unterschied 3: Authority-Systeme**

- PROPYLÄEN: GND (Deutsche Nationalbibliothek)
- HSA: VIAF (96% Coverage), HSA-interne IDs (4%)

Das Tool muss verschiedene Authority-Systeme unterstützen.

### Entscheidungen

**E1: Zwei Knowledge-Ordner**

Aufteilung der Dokumentation:
- `knowledge-herdata/`: HerData-spezifische Dokumentation (bestehendes Projekt)
- `knowledge-correspexplorer/`: Generalisierungs-Dokumentation (neues Projekt)

Begründung: Klare Trennung zwischen projektspezifischem und generischem Wissen.

**E2: Fokus auf Datenstruktur statt Statistik**

Die Analyse konzentriert sich auf:
- Welche Entitäten existieren
- Welche Beziehungen zwischen Entitäten
- Welche Kategorien für Visualisierungen nutzbar

Nicht auf: Häufigkeitsstatistiken, Prozentanteile, etc.

### Visualisierungskonzepte

Basierend auf der Datenanalyse:

**Konzept 1: Zwei-Ebenen-Netzwerk**
- Ebene 1: Korrespondenz (Sender-Empfänger)
- Ebene 2: Erwähnungen (mentionsPerson)

**Konzept 2: Zwei-Layer-Karte**
- Layer 1: Absende-Orte (woher geschrieben wird)
- Layer 2: Erwähnte Orte (worüber geschrieben wird)

**Konzept 3: Themen-Explorer**
- Treemap der Subjects
- Kategorisierung: Sprachen, Institutionen, Konzepte, Persönliches
- Zeitlicher Verlauf pro Thema

**Konzept 4: Sprache als Dimension**
- Briefsprache (hasLanguage) als Filter
- Sprache als Thema (mentionsSubject mit Lexvo) als Inhalt
- 18 Briefsprachen im HSA

### Offene Fragen

1. Wie mit HSA-internen Subject-URIs umgehen? (gams.uni-graz.at)
2. Soll GeoNames-API für Koordinaten der erwähnten Orte genutzt werden?
3. Wie VIAF mit GND mappen für Cross-Corpus-Analyse?

### Nächste Schritte

1. JSON-Schema für generalisierte Datenstruktur definieren
2. Pipeline-Architektur für verschiedene CMIF-Quellen
3. Frontend-Komponenten für neue Metadaten-Typen

---

## 2025-11-26 (Fortsetzung)

### Daten-Pipeline implementiert

**Build-Skripte:**
- `preprocessing/build_hsa_data.py` - CMIF zu JSON Konvertierung
- `preprocessing/resolve_geonames_wikidata.py` - Koordinaten-Auflösung via Wikidata

**Output:**
- `docs/data/hsa-letters.json` (15.73 MB)
- 11.576 Briefe mit allen Metadaten
- 82% der Orte mit Koordinaten angereichert

### Wikidata als Vermittler für Geo-Koordinaten

**Entscheidung E3: Wikidata statt GeoNames-API**

Wikidata SPARQL-Endpoint für Koordinaten-Auflösung gewählt, weil:
- Keine API-Keys erforderlich
- Batch-Abfragen möglich (50 IDs pro Request)
- Zusätzliche Daten verfügbar (Labels in mehreren Sprachen)
- Gleicher Ansatz funktioniert für GND, VIAF, etc.

Ergebnis: 791 von 949 GeoNames-IDs aufgelöst (83.4%)

Fehlende IDs: Meist historische Orte oder sehr kleine Gemeinden, die in Wikidata nicht mit GeoNames verknüpft sind.

### Architektur-Überlegung: Brief-zentriert vs. Personen-zentriert

**Entscheidung E4: Beide Perspektiven unterstützen**

CorrespExplorer soll beide Sichten ermöglichen:

1. **Brief-zentriert** (primär für HSA-Daten)
   - Einstieg: Liste/Karte der Briefe
   - Filter: Zeit, Ort, Sprache, Thema
   - Detail: Einzelbrief mit allen Metadaten

2. **Personen-zentriert** (primär für HerData-Daten)
   - Einstieg: Liste/Karte der Personen
   - Filter: Beruf, Zeitraum, Beziehungen
   - Detail: Personenprofil mit Briefen

**Technische Umsetzung:**
- Gemeinsames Datenformat mit unterschiedlichen "Views"
- Indizes ermöglichen beide Zugänge
- `indices.persons` aggregiert Briefe pro Person
- `letters` enthält die Primärdaten

### Subject-Hierarchie für Treemap

**Analyse der Subject-Kategorien:**

Die 1.622 Subjects im HSA lassen sich kategorisieren:

```
Subjects (1.622)
├── Sprachen (348)
│   ├── lexvo (148) - ISO 639-3 Codes
│   └── hsa_language (200) - HSA-interne Sprach-IDs
├── HSA-Subjects (1.272)
│   ├── Wissenschaftskommunikation
│   │   ├── Publikationsversand (627)
│   │   ├── Dankschreiben (515)
│   │   ├── Publikationsvorhaben (280)
│   │   └── Rezension (163)
│   ├── Institutionen
│   │   ├── Zeitschriften (Romania, ZrP, RIEV, etc.)
│   │   ├── Akademien (Wien, Berlin, etc.)
│   │   └── Universitäten
│   ├── Forschungsthemen
│   │   ├── Etymologie (218)
│   │   ├── Sprachkontakt
│   │   └── Kreolsprachen
│   └── Persönliches
│       ├── Biographisches (315)
│       ├── Reisen (172)
│       └── Gesundheit (164)
└── Andere (2)
```

**Entscheidung E5: Einfache Liste zuerst, Treemap später**

Für den Anfang eine filterbare Liste der Subjects:
- Sortierbar nach Häufigkeit
- Filterbar nach Kategorie (lexvo, hsa_subject, hsa_language)
- Klick filtert Briefe

Treemap-Hierarchie erfordert manuelle Kategorisierung der 1.272 HSA-Subjects - das ist Aufwand, der später sinnvoll ist, wenn die Grundfunktionen stehen.

### Offene Fragen (aktualisiert)

1. ~~Soll GeoNames-API für Koordinaten genutzt werden?~~ Gelöst: Wikidata
2. Wie die 158 fehlenden Koordinaten behandeln? (Fallback auf Länder-Zentroide?)
3. Soll die Subject-Kategorisierung manuell oder automatisch erfolgen?
4. Wie die beiden Perspektiven (Brief/Person) im UI umschalten?

### Nächste Schritte (aktualisiert)

1. Test-Seite erweitern: Karte mit Koordinaten anzeigen
2. Einfache Subject-Liste im Frontend
3. Architektur-Dokument für Dual-View erstellen
