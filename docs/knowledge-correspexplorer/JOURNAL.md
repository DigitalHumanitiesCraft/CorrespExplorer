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

1. ~~Test-Seite erweitern: Karte mit Koordinaten anzeigen~~ Erledigt
2. Einfache Subject-Liste im Frontend
3. Architektur-Dokument für Dual-View erstellen

---

## 2025-11-26 (Karten-Visualisierung)

### MapLibre Integration

Die Test-Seite `docs/hsa-test.html` wurde um eine interaktive Karte erweitert:

**Technologie:** MapLibre GL JS 4.1.2 mit CartoDB Positron Basemap

**Features:**
- Heatmap-Layer zeigt Briefdichte bei niedrigem Zoom
- Punkt-Layer zeigt einzelne Orte bei höherem Zoom
- Kreisgröße skaliert mit Briefanzahl
- Klick auf Punkt zeigt Popup mit Ortsnamen und Briefanzahl
- Legende zeigt Anzahl der Orte mit/ohne Koordinaten

**Ergebnis:**
- 616 Orte mit Koordinaten auf der Karte
- 158 Orte ohne Koordinaten (nicht dargestellt)
- Klare Konzentration auf Graz, Wien, Paris sichtbar

### Subject-Liste implementiert

Die Test-Seite enthält nun eine filterbare Subject-Liste:

**Features:**
- Tabelle mit Subject-Name, Kategorie und Vorkommen
- Filter-Buttons für Kategorien (Alle, Lexvo, HSA-Subjects, HSA-Languages)
- Farbkodierte Kategorie-Tags
- Scrollbare Liste (max. 100 Einträge angezeigt)
- Statistik-Anzeige unter Filter-Buttons

**Subject-Verteilung im HSA:**
- Lexvo (ISO 639-3): Sprachen, die im Brief diskutiert werden
- HSA-Subjects: Themen, Institutionen, Konzepte
- HSA-Languages: HSA-interne Sprachcodes

### Nächste Schritte

1. ~~Architektur-Dokument für Dual-View erstellen~~ Erledigt (config.js)
2. Timeline-Komponente für zeitliche Verteilung
3. Integration der Test-Komponenten in Hauptanwendung

---

## 2025-11-26 (Multi-Source Architektur)

### Konfigurationssystem implementiert

Neue Dateien erstellt:

**docs/js/config.js**
- Definiert DATA_SOURCES mit Konfiguration pro Datenquelle
- HerData (persons-centric) und HSA (letters-centric)
- Feature-Flags pro Quelle (hasSubjects, hasMentionsPlace, etc.)
- UI-Konfiguration (Farben, Labels)
- Funktionen: getCurrentSource(), setCurrentSource(), hasFeature()
- URL-Parameter-Erkennung: ?source=hsa

**docs/js/data.js (erweitert)**
- Multi-Source Cache statt globaler Variable
- loadData() als generische Ladefunktion
- loadPersons() und loadLetters() für Abwärtskompatibilität
- Neue Hilfsfunktionen: getLetterById(), getPersonFromIndex(), getPlaceFromIndex()

### Architektur-Entscheidung E6: URL-basierte Quellenauswahl

Datenquelle wird via URL-Parameter gesteuert:
- `index.html` -> HerData (Standard)
- `index.html?source=hsa` -> HSA

Vorteile:
- Keine Code-Duplizierung
- Einfaches Umschalten
- Verlinkbar/Bookmarkable
- Bestehende Views bleiben funktional

### Nächste Schritte

1. Views anpassen für bedingte Darstellung basierend auf hasFeature()
2. ~~Datenquellen-Switcher in der Navbar~~ Erledigt
3. Timeline-Komponente für HSA-Daten

---

## 2025-11-26 (Navbar Source Switcher)

### Datenquellen-Switcher implementiert

Der Benutzer kann nun zwischen den Datenquellen umschalten:

**docs/components/navbar.html**
- Desktop: Select-Element neben dem Brand-Logo
- Mobile: Select-Element im Mobile-Menu (oberster Eintrag)
- Optionen: HerData (Goethe) und HSA (Schuchardt)

**docs/css/style.css**
- `.data-source-switcher` Styles für Desktop (transparenter Hintergrund, weisse Schrift)
- `.nav-mobile-source-switcher` Styles für Mobile
- Responsives Verhalten: Desktop-Switcher versteckt auf Mobile

**docs/js/navbar-loader.js**
- Import von config.js Funktionen
- `initSourceSwitcher()` initialisiert beide Select-Elemente
- `switchDataSource()` wechselt die Quelle via URL-Parameter
- `updateBrandText()` aktualisiert den Brand-Text basierend auf der Quelle
- Synchronisation zwischen Desktop und Mobile Selects

### Funktionsweise

1. Beim Laden erkennt `detectSourceFromUrl()` die aktuelle Quelle
2. Select-Elemente werden auf den korrekten Wert gesetzt
3. Brand-Text wird auf den Quellennamen aktualisiert
4. Bei Wechsel wird die Seite mit neuem URL-Parameter neu geladen
5. HerData ist Standard (kein URL-Parameter), HSA verwendet ?source=hsa

### Nächste Schritte

1. app.js anpassen: `loadData()` statt `loadPersons()` verwenden
2. Feature-basierte Darstellung mit `hasFeature()` implementieren
3. Sidebar-Filter für HSA-spezifische Features (Subjects, Languages)

---

## 2025-11-26 (Merge mit aktualisiertem HerData-Interface)

### Situation

Die HerData-UI wurde parallel weiterentwickelt mit neuen Features:
- Logo-Bild statt Text-Brand
- Neue Views: narrative.html, synthesis.html (nicht mehr in Subfolder)
- Neue JS-Module: narrative.js, synthesis.js, howto.js, mobile-filter.js
- Neue CSS: components.css, synthesis.css
- Entfernt: Tests-Link, synthesis/-Subfolder

Diese Änderungen hatten die Multi-Source-Architektur überschrieben.

### Re-Integration der Multi-Source-Funktionalität

Die folgenden Änderungen wurden wieder eingefügt:

**docs/js/data.js**
- Import von config.js wiederhergestellt
- `loadData()` als generische Funktion für beide Quellen
- Multi-Source Cache (herdata, hsa)
- Helper-Funktionen für Letters und Indices

**docs/js/navbar-loader.js**
- Import von config.js hinzugefügt
- `initSourceSwitcher()` Funktion wiederhergestellt
- `switchDataSource()` für URL-basierte Quellenauswahl

**docs/components/navbar.html**
- Desktop: `data-source-switcher` mit Select-Element
- Mobile: `nav-mobile-source-switcher` im Mobile-Menu

**docs/css/style.css**
- `.data-source-switcher` Styles für Desktop
- `.nav-mobile-source-switcher` Styles für Mobile
- Responsives Verhalten (Desktop-Switcher auf Mobile versteckt)

### Ergebnis

Die Multi-Source-Architektur ist nun mit dem aktualisierten HerData-Interface kompatibel:
- Alle neuen UI-Features (Logo, neue Views) bleiben erhalten
- Datenquellen-Switcher ermöglicht Wechsel zwischen HerData und HSA
- URL-Parameter `?source=hsa` funktioniert wieder

### Nächste Schritte

1. ~~app.js testen mit beiden Datenquellen~~ Erledigt
2. Views für HSA-spezifische Features anpassen (Subjects, mentionsPlace)
3. Error-Handling wenn HSA-Quelle gewählt aber person-centric View geladen wird

---

## 2025-11-26 (HSA-Kartenansicht implementiert)

### app.js für Multi-Source-Rendering erweitert

Die Hauptanwendung (app.js) unterstützt nun beide Datentypen direkt:

**Neue Datenstrukturen:**
- `currentDataType`: 'persons' oder 'letters'
- `allLetters`, `filteredLetters`: Brief-Arrays für HSA
- `placeAggregation`: Aggregierte Orte mit Briefzahlen

**Neue Funktionen:**

1. `aggregateLettersByPlace(letters, placesIndex)` - Aggregiert Briefe pro Absendeort
   - Sammelt letter_count, years, senders, languages pro Ort
   - Nutzt Koordinaten aus place_sent oder indices.places als Fallback

2. `placesToGeoJSON(places)` - Konvertiert Ortsaggregation zu GeoJSON
   - Properties: id, name, letter_count, sender_count, year_min/max, etc.

3. `renderPlaceMarkers(places)` - Rendert Ortsmarker auf der Karte
   - Clustering mit total_letters als Aggregat
   - HSA-Farbe (#1e40af) statt Rollen-Farben

4. `addPlaceMapLayers()` - MapLibre-Layer für Orte
   - Kreisgröße skaliert mit Briefanzahl (1-500+ Briefe)
   - Cluster zeigen Anzahl der Orte

5. `setupPlaceEventHandlers()` - Event-Handler für Orte
   - Klick auf Ort zeigt Popup mit Statistiken
   - Klick auf Cluster zoomt rein

6. `showPlacePopup(lngLat, props)` - Popup für einen Ort
   - Zeigt Briefanzahl, Absenderanzahl, Zeitraum
   - Liste der Top-5-Absender und Sprachen

**Entscheidung E7: Keine Redirect-Lösung**

Die initiale Idee, bei HSA-Auswahl auf hsa-test.html zu redirecten, wurde verworfen.
Stattdessen wird app.js selbst angepasst, um beide Datentypen zu rendern.

Begründung:
- Einheitliches Interface für alle Datenquellen
- Kein Bruch in der User Experience
- Wiederverwendung der bestehenden Komponenten (Navbar, Map, etc.)

### Kartenlayer-Anpassung

Die `setMapStyle`-Funktion wurde angepasst, um den richtigen Layer-Namen zu verwenden:
- Bei persons: 'persons-clusters'
- Bei letters: 'places-clusters'

### Nächste Schritte

1. ~~Filter-Panel für HSA anpassen~~ Erledigt
2. ~~Timeline-Slider für HSA-Zeitraum (1859-1927)~~ Erledigt
3. Brief-Liste im Popup (klickbar zur Brief-Detailseite)

---

## 2025-11-26 (HSA-Only Fokus)

### Entscheidung E8: HerData komplett entfernen

Auf Wunsch des Nutzers wurde die Multi-Source-Architektur zugunsten eines HSA-only Fokus aufgegeben.

Begründung:
- Einfachere Codebasis ohne Conditionals
- Schnellere Entwicklung der HSA-spezifischen Features
- HerData kann bei Bedarf als separates Projekt bestehen

### Durchgeführte Änderungen

**config.js (komplett neu)**
- Nur noch HSA-Konfiguration
- `CONFIG` statt `DATA_SOURCES`
- Einfachere Funktionen: `getConfig()`, `hasFeature()`
- Fester Zeitraum: 1859-1927

**data.js (vereinfacht)**
- Nur noch HSA-Datenladung
- Kein Multi-Source-Cache mehr
- Neue Helper: `getSubjectFromIndex()`

**navbar.html (HSA-spezifisch)**
- Brand: "Hugo Schuchardt Archiv"
- Views: Karte, Korrespondenten, Brief-Explorer, Themen, Orte
- Source-Switcher entfernt
- Wissenskorb/Vault entfernt (HerData-spezifisch)

**navbar-loader.js (vereinfacht)**
- Keine Source-Switcher-Logik mehr
- Angepasste View-Labels

**app.js (komplett neu für HSA)**
- Nur noch Brief-zentrierte Logik
- Aggregation nach Absendeorten
- Filter: Zeitraum (1859-1927), Briefsprache
- Kartenzentrum: Graz (15.44, 47.07)
- HSA-Farbe: #1e40af

**index.html (HSA-Layout)**
- Titel: "HSA CorrespExplorer"
- Stats: Briefe, Korrespondenten, Orte
- Filter: Zeitraum, Sprache (de, fr, it, es, en, pt, nl, eu)
- Legende für HSA-Farbe
- Links zu HSA-Website und correspSearch

### Entfernte Dateien/Features

- HerData-spezifische Filter (Rollen, Berufe, Ortstypen, Netzwerk)
- Onboarding-Modal (HerData-spezifisch)
- Wissenskorb-Feature
- Mobile-Filter-Bar (HerData-spezifisch)
- Source-Switcher in Navbar

### Verfügbare Sprachen im HSA

Die 8 häufigsten Briefsprachen:
- Deutsch (de)
- Französisch (fr)
- Italienisch (it)
- Spanisch (es)
- Englisch (en)
- Portugiesisch (pt)
- Niederländisch (nl)
- Baskisch (eu)

### Nächste Schritte

1. Korrespondenten-Seite (persons.html) erstellen
2. Themen-Seite (subjects.html) erstellen
3. Brief-Explorer (stats.html) für HSA anpassen
4. Suche für Briefe und Personen implementieren
