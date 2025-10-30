# Projekt

Projektziel, Datenquellen und Implementierungsstatus.

Stand: 2025-10-19

Siehe [INDEX.md](INDEX.md) für Navigation im Knowledge Vault.

## Ziel

Semantische Aufbereitung und Visualisierung von Frauen aus Goethes Briefkorrespondenz (1762-1824) für literatur- und kulturinteressierte Laien und Wissenschaftler.

Integration zweier komplementärer Datenquellen zur mehrdimensionalen Analyse historischer Frauenbiografien.

## Datenquellen

Details siehe [data.md](data.md) für vollständige Statistiken und Strukturen.

### CMIF (Correspondence Metadata Interchange Format)

- Datei: ra-cmif.xml (24 MB)
- Inhalt: 15.312 Briefe an Goethe (1762-1824)
- Quelle: PROPYLÄEN-Projekt, Klassik Stiftung Weimar
- Lizenz: CC BY 4.0
- Zugang: Zenodo 14998880 (März 2025)

### SNDB (Strukturierte Normdaten Bibliothek)

- Dateien: 14 XML-Dateien (32 MB)
- Inhalt: 23.571 Personen, darunter 3.617 Frauen
- Quelle: Klassik Stiftung Weimar
- Stand: Oktober 2025 (~2 Jahre alt, strukturell stabil)

## Verarbeitungspipeline

4 Phasen zur Frauenidentifikation und Datenanreicherung.

Details siehe [data.md](data.md#datenfluss-frauenidentifikation).

### Phase 1: Identifizierung
- Filterung nach SEXUS=w in SNDB
- Ergebnis: 3.617 Frauen (15,3% von 23.571 Personen)

### Phase 2: CMIF-Matching
- Verknüpfung über GND-ID (primär) oder Name (sekundär)
- Ergebnis: 808 Frauen mit Briefverbindung (22,3%)

### Phase 3: Anreicherung
- Geodaten (1.042 Frauen, 28,8%)
- Berufe (979 Frauen, 27,1%)
- Temporale Daten (Lebensdaten)
- Beziehungsnetzwerke (AGRELON)

### Phase 4: Narrativierung
- Biografische Texte aus projekt_*.xml
- Ausgabe: docs/data/persons.json (1,49 MB)

Pipeline-Code: [../preprocessing/build_herdata.py](../preprocessing/build_herdata.py)

## Implementierungsstatus

Siehe [../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) für detaillierten Fortschritt.

### MVP Phase 1 (Abgeschlossen)

Kern-Features:
- Daten-Pipeline (4 Phasen, 48 Tests)
- Interactive Map (MapLibre GL JS)
- Filtering (Briefaktivität, Berufsgruppen)
- Person Detail Pages (6 Tabs, alle 3.617 Frauen)
- Multi-Person Popups (ADR-002)
- Cluster Color Encoding (ADR-003)
- GitHub Pages Deployment

Live Demo: https://chpollin.github.io/HerData/

Technologie:
- Frontend: MapLibre GL JS 4.7.1, Vanilla JavaScript
- Backend: Python 3.x (Daten-Pipeline)
- Deployment: GitHub Pages

### Phase 2 (Geplant)

- [ ] Timeline View (D3.js)
- [ ] Network Graph (AGRELON-basiert)
- [ ] Full Letter Details
- [ ] Biographical Text Extraction
- [ ] Unified Search
- [ ] Story Curation

## PROPYLÄEN-Kontext

Gesamtprojekt:
- Laufzeit bis 2039
- 20.000+ Briefe geplant
- 3.800 Personen (ca.)
- Integration in PROPYLÄEN-Plattform geplant

Aktueller Bearbeitungsstand:
- 1762-Aug 1786: Vollständig ediert
- Sept 1786-1824: Metadaten vorhanden
- Suche: Bis 1822 möglich
- TEI-Volltext: 15,7% verfügbar via API

Details siehe [research-context.md](research-context.md).

## Analysemöglichkeiten

### Direkte Verbindungen
- Frauen als Briefautorinnen (GND-Match)
- Erwähnte Frauen in Briefen (Personenerwähnungen)

### Indirekte Verbindungen
- Frauen mit Goethe-Bezug (SNDB-Beziehungsnetzwerk)
- AGRELON-Ontologie (44 Beziehungstypen)

### Mehrdimensionale Analysen
- Biografisch: Lebensdaten, Berufe
- Geografisch: Wirkungsorte, Brieforte
- Temporal: Korrespondenzverläufe
- Sozial: Beziehungsnetzwerke

Details siehe [design.md](design.md) und [requirements.md](requirements.md).

## Datenherkunft und Wartung

### Export-Prozess

Aktuell unklar:
- Ursprungsdatenbank (Oracle? MySQL? FileMaker?)
- Export-Tool/Script
- Transformation: DB → XML
- Validierung nach Export

TODO: Dokumentation des Export-Prozesses etablieren

### Update-Strategie

Aktueller Stand:
- SNDB: Oktober 2025 (~2 Jahre alt)
- CMIF: Zenodo 14998880 (März 2025)

TODO:
- Update-Frequenz definieren
- Änderungsverfolgung (Git? Change-Log?)
- Breaking Changes in XML-Struktur?

Details siehe [data.md](data.md#datenherkunft-und-wartung).

## Repository-Struktur

```
HerData/
├── data/               # CMIF + SNDB XML-Dateien
├── docs/               # Frontend (GitHub Pages)
│   ├── index.html
│   ├── person.html
│   ├── js/app.js
│   ├── css/style.css
│   └── data/persons.json
├── preprocessing/      # Python Daten-Pipeline
│   ├── build_herdata.py
│   └── build_herdata_test.py
├── knowledge/          # Dokumentation (dieser Vault)
└── documentation/      # JOURNAL.md (Session Logs)
```

## Verweise

- [data.md](data.md) - Datenmodell und Statistiken
- [research-context.md](research-context.md) - Wissenschaftlicher Kontext
- [design.md](design.md) - UI/UX-Design
- [requirements.md](requirements.md) - User Stories und Anforderungen
- [decisions.md](decisions.md) - Architecture Decision Records
- [../README.md](../README.md) - Haupt-README
- [../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) - Detaillierter Fortschritt
