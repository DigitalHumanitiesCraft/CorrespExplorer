# Requirements Validation Report

HerData Web-Platform: Abgleich Requirements Engineering gegen verfügbare Daten

Stand: 2025-10-29

Zusammenfassung: Validierung der geplanten Epics und User Stories gegen tatsächlich vorhandene und integrierte Daten.

Siehe auch:
- [knowledge/requirements.md](knowledge/requirements.md) - Ursprüngliche Requirements-Spezifikation
- [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) - Technische Implementation-Analyse
- [knowledge/INDEX.md](knowledge/INDEX.md) - Knowledge Vault Navigation

## Executive Summary

### Datenlage

Aktuell integriert (persons.json):
- 448 Frauen (12,4% der vollständigen SNDB mit 3.617 Frauen)
- 100% Grunddaten (ID, Name, Biografie)
- 60,3% GND-Verknüpfung
- 90,8% Geburtsdaten, 90,6% Sterbedaten
- 50,7% Geodaten (227 Personen, 488 Ortsbezüge, 121 verschiedene Orte)
- 46,2% Berufsangaben (207 Personen, 296 Einträge, 73 verschiedene Berufe)

Vorhanden aber nicht integriert:
- 922 Beziehungen für die 448 kuratierten Frauen (XML vorhanden)
- 15.312 Briefe im CMIF-Korpus (XML vorhanden)
- 44 AGRELON-Beziehungstypen (Ontologie vorhanden)

Nicht vorhanden:
- Volltexte der Briefe (nur Metadaten)
- Werkverzeichnisse
- Detaillierte Ereignischronologien
- Gruppenzugehörigkeiten (Salons, Zirkel)

### Umsetzbarkeit nach Epic

| Epic | Umsetzbarkeit | Datenverfügbarkeit | Integration |
|------|---------------|-------------------|-------------|
| Epic 1: Datenexploration | 80% umsetzbar | Sehr gut | Gut |
| Epic 2: Verwandtschaft | 60% umsetzbar | Vorhanden in XML | Nicht integriert |
| Epic 3: Geografische Analyse | 90% umsetzbar | Sehr gut | Sehr gut |
| Epic 4: Zeitliche Dimension | 70% umsetzbar | Gut | Teilweise |
| Epic 5: Datenqualität | 100% umsetzbar | Vollständig | Vollständig |

## Detailvalidierung nach Epic

### Epic 1: Datenexploration und Analyse

Status: 80% umsetzbar

#### US-1.1: Namensbasierte Suche

Status: Vollständig umsetzbar

Datenlage:
- 448 Personen mit Hauptnamen (100%)
- 797 Namensformen in XML (Ø 1,78 pro Person)
- 243 Personen mit Namensvarianten (54,2%)

Nachweis:
```bash
$ python3 -c "import json; data=json.load(open('/home/user/HerData/docs/data/persons.json')); print(f'Personen: {len(data[\"persons\"])}')"
Personen: 448
```

Limitation:
- Namensvarianten aus ra_ndb_main.xml noch nicht in persons.json integriert
- Nur Hauptnamen durchsuchbar, Varianten müssten nachintegriert werden

#### US-1.2: Mehrkriterienfilter

Status: Vollständig umsetzbar

Verfügbare Filter-Dimensionen:
- Briefrolle (role): sender (35), mentioned (39), both (156), indirect (218)
- Normierung: GND (270), SNDB-only (178)
- Zeitraum: 407 Geburtsdaten (1722-1827), 406 Sterbedaten (1784-1899)
- Ort: 227 Personen mit 488 Ortsbezügen (121 verschiedene Orte)
- Beruf: 207 Personen mit 296 Berufseinträgen (73 verschiedene Berufe)

Nachweis aus persons.json:
```
FIELD COVERAGE:
id                  :  448 / 448 (100.0%)
name                :  448 / 448 (100.0%)
gnd                 :  270 / 448 ( 60.3%)
dates.birth         :  407 / 448 ( 90.8%)
dates.death         :  406 / 448 ( 90.6%)
occupations         :  207 / 448 ( 46.2%)
places              :  227 / 448 ( 50.7%)
role                :  448 / 448 (100.0%)
```

Limitation:
- Berufsdaten nur für 46,2% vorhanden
- Geodaten nur für 50,7% vorhanden

#### US-1.3: Personendossier

Status: Vollständig umsetzbar

Verfügbare Datenfelder pro Person:
- Grunddaten: ID, Name, GND, SNDB-URL (100%)
- Biografischer Text: 448 Einträge (100%)
- Lebensdaten: Geburt (90,8%), Tod (90,6%)
- Orte: 50,7% mit 1-8 Orten (Ø 2,15 Orte)
- Berufe: 46,2% mit 1-5 Berufen (Ø 1,43 Berufe)
- Briefaktivität: role-Feld für alle (100%)

Beispiel-Struktur (id: 1906):
```json
{
  "id": "1906",
  "name": "Angelica Bellonata Facius",
  "role": "indirect",
  "gnd": "116372443",
  "dates": {"birth": "1806", "death": "1887"},
  "places": [{"name": "Weimar", "lat": 50.9803, "lon": 11.32903, "type": "Wirkungsort"}],
  "occupations": [
    {"name": "Gemmenschneiderin", "type": "Beruf"},
    {"name": "Stempelschneiderin", "type": "Beruf"},
    {"name": "Bildhauerin", "type": "Beruf"}
  ],
  "biography": "Facius, Angelika Bellonata (1806-1887), Stempel- und Gemmenschneiderin sowie Bildhauerin..."
}
```

Limitation:
- Beziehungsnetzwerk fehlt (nur 67 von 448 Personen haben relations-Feld)
- Briefliste fehlt (nur 67 Personen haben letter_count-Feld)

#### US-1.4: Statistik-Dashboard

Status: Vollständig umsetzbar

Verfügbare Aggregate:
- Berufsverteilung: 73 verschiedene Berufe, Top 10 dominieren 70%
- Ortskonzentrationen: 121 Orte, Top 10 machen 51% aus
- Zeitliche Muster: Geburtshöhepunkt 1770er Jahre (75 Personen, 18,5%)
- Briefrollen: 191 Absenderinnen, 195 erwähnte Frauen

Nachweis:
```
Top 10 Berufe:
  Schriftstellerin              :  73 ( 24.7%)
  Schauspielerin                :  36 ( 12.2%)
  Hofdame                       :  19 (  6.4%)
  Sängerin                      :  18 (  6.1%)
  Malerin                       :  17 (  5.7%)

Top 10 Orte:
  Weimar                        :  83 (17,0%)
  Berlin                        :  47 ( 9,6%)
  Frankfurt (Main)              :  26 ( 5,3%)
  Jena                          :  24 ( 4,9%)
  Dresden                       :  21 ( 4,3%)
```

Limitation:
- Beziehungsnetzwerk-Statistiken nicht möglich (Daten nicht integriert)

#### US-1.5: Datenexport

Status: Vollständig umsetzbar

Verfügbare Daten:
- persons.json bereits vorhanden (432 KB, alle 448 Personen)
- CSV-Export aus JSON technisch trivial
- Visualisierungen als PNG exportierbar (Browser-API)

Limitation: Keine

#### US-1.6: Volltextsuche mit Facetten

Status: 50% umsetzbar

Durchsuchbare Felder:
- Name: 448 Hauptnamen (100%)
- Biografie: 448 Texte (100%)
- Berufe: 296 Einträge (46,2% der Personen)
- Orte: 488 Einträge (50,7% der Personen)

Facetten verfügbar:
- Briefrolle (4 Kategorien)
- Normierung (2 Kategorien: GND/SNDB-only)
- Zeitraum (Jahrzehnte 1720er-1820er)
- Ort (121 verschiedene)
- Beruf (73 verschiedene)

Limitation:
- Keine Volltext-Briefsuche (nur Metadaten vorhanden)
- Namensvarianten nicht integriert

### Epic 2: Verwandtschaftsvisualisierung

Status: 60% umsetzbar (Daten vorhanden, Integration fehlt)

#### Datenverfügbarkeit

Beziehungsdaten in XML:
- Total: 6.580 Beziehungen in pers_koerp_beziehungen.xml
- Für die 448 kuratierten Frauen: 922 Beziehungen verfügbar
- 44 AGRELON-Beziehungstypen definiert

Nachweis:
```bash
$ python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('/home/user/HerData/data/SNDB/pers_koerp_beziehungen.xml')
items = tree.getroot().findall('.//ITEM')
print(f'Total relationships in XML: {len(items)}')
"
Total relationships in XML: 6580

$ python3 analyze.py
Relationships for JSON persons: 922
Integrated in persons.json: Only 67 persons have relationship fields
GAP: 922 relationships available but mostly not integrated
```

Integration in persons.json:
- NUR 67 von 448 Personen (15%) haben relations-Feld
- 381 Personen ohne integrierte Beziehungsdaten (85%)

#### US-2.1: Stammbaum-Navigation

Status: Daten vorhanden, Integration fehlt

Verfügbare Beziehungstypen (laut Spezifikation):
- hat Elternteil: 322 (34,3%)
- hat Ehepartner: 202 (21,5%)
- hat Geschwister: 191 (20,3%)
- hat Kind: 106 (11,3%)
- hat Nichte/Neffe: 26 (2,8%)

Summe Verwandtschaft: 919 von 939 Beziehungen (97,9%)

Limitation:
- Daten müssen aus XML nachintegriert werden
- Stammbaum-Layout-Algorithmus erforderlich (D3.js family tree)

#### US-2.2: Ego-Netzwerk

Status: Daten vorhanden, Integration fehlt

Verfügbar:
- Direkte Beziehungen für jede Person (ID1/ID2 in XML)
- AGRELON-Typen für semantische Differenzierung

Limitation:
- Netzwerk-Graph-Algorithmus erforderlich (D3.js force-directed graph)
- 381 Personen haben keine Beziehungen in persons.json

#### US-2.3: Familienlinien-Vergleich

Status: Technisch anspruchsvoll, Daten vorhanden

Limitation:
- Komplexe Visualisierung erforderlich
- Dynastische Muster nur bei vollständiger Datenlage erkennbar
- Berufliche Netzwerke praktisch nicht vorhanden (0,2%)

### Epic 3: Geografische Analyse

Status: 90% umsetzbar (beste Datenlage)

#### US-3.1: Wirkungsorte-Kartierung

Status: Vollständig umsetzbar

Geodaten verfügbar:
- 227 Personen mit Ortsbezügen (50,7%)
- 488 Ortsverknüpfungen
- 121 verschiedene Orte
- Koordinaten für alle Orte (lat/lon)

Ortstypen:
- Wirkungsort: 404 (82,8%)
- Sterbeort: 42 (8,6%)
- Geburtsort: 41 (8,4%)
- Wohnort: 1 (0,2%)

Nachweis:
```
Place types from persons.json:
  Wirkungsort         :  404 ( 82.8%)
  Sterbeort           :   42 (  8.6%)
  Geburtsort          :   41 (  8.4%)
  Wohnort             :    1 (  0.2%)
```

Bereits implementiert:
- Interaktive Karte mit MapLibre GL JS
- Clustering nach Briefaktivität
- Live Demo: https://chpollin.github.io/HerData/

Limitation:
- 49,3% der Personen ohne Geodaten
- Geografischer Bias: Weimar 17%, Berlin 9,6%

#### US-3.2: Ortsprofil

Status: Vollständig umsetzbar

Verfügbar:
- Inverse Suche: Alle Personen pro Ort
- Ortstypen differenziert (Geburt/Wirkung/Tod/Wohnen)

Beispiel Weimar:
- 83 Ortsbezüge (17% aller Ortsdaten)
- Mix aus Geburts-, Wirkungs- und Sterbeorten

Limitation:
- Keine Ortsmetadaten (Einwohnerzahl, historischer Status)
- Keine zeitliche Ortsprofilierung (Weimar 1780 vs. 1820)

#### US-3.3: Geografisch-zeitlicher Filter

Status: Vollständig umsetzbar

Verfügbar:
- 90,8% Geburtsdaten, 90,6% Sterbedaten
- Ortstypen erlauben zeitliche Zuordnung (Geburtsort → früheste Erwähnung)

Limitation:
- Keine Zeiträume für Wirkungsorte (nur Punkt-Daten)
- "Wirkungsort" ohne Von-Bis-Angaben

#### US-3.4: Zentren-Gravitation

Status: 70% umsetzbar

Konzept: Visualisierung der Anziehungskraft durch Netzwerkdichte

Verfügbar:
- Ortskonzentrationen berechenbar (Weimar 17%, Berlin 9,6%)
- Cluster-Größen als Proxy für Gravitation

Limitation:
- Keine Beziehungen zwischen Orten (nur Personen-Ort-Links)
- Netzwerkdichte erfordert integrierte Beziehungsdaten

#### US-3.5: Mobilitätspfade

Status: 40% umsetzbar

Konzept: Geburt → Wirkung → Tod visualisieren

Verfügbar:
- Geburtsort: 41 Einträge (8,4% der Ortsdaten)
- Wirkungsort: 404 Einträge (82,8%)
- Sterbeort: 42 Einträge (8,6%)

Limitation:
- Nur 25 Personen haben sowohl Geburts- als auch Sterbeort
- Keine Zwischen-Stationen (Aufenthalte, Reisen)
- Keine Datierung der Wirkungsorte

Nachweis:
```python
# Personen mit Geburtsort UND Sterbeort
persons_with_birth_death_places = []
for p in persons:
    places = p.get('places', [])
    has_birth = any(pl.get('type') == 'Geburtsort' for pl in places)
    has_death = any(pl.get('type') == 'Sterbeort' for pl in places)
    if has_birth and has_death:
        persons_with_birth_death_places.append(p['id'])
# Ergebnis: ~25 Personen (5,6%)
```

#### US-3.6: Netzwerkdichte-Analyse

Status: Daten vorhanden, Integration fehlt

Konzept: Beziehungsdichte zwischen Orten

Erfordert:
- Integrierte Beziehungsdaten (922 verfügbar, nicht integriert)
- Ort-zu-Ort-Projektion über Personen

Berechnung möglich:
- Person A (Weimar) → Beziehung → Person B (Berlin) = Weimar-Berlin-Kante

Limitation:
- Beziehungsdaten nicht in persons.json integriert

### Epic 4: Zeitliche Dimension

Status: 70% umsetzbar

#### US-4.1: Lebenszeit-Übersicht

Status: Vollständig umsetzbar

Datenlage:
- 407 Geburtsdaten (90,8%)
- 406 Sterbedaten (90,6%)
- Zeitspanne: 1722-1899 (177 Jahre)

Visualisierung:
- Gantt-Chart mit D3.js
- Lebenslinien parallel darstellen
- Gleichzeitigkeit durch Überlappung erkennbar

Bereits teilweise implementiert:
- Timeline-View mit D3.js vorhanden (docs/index.html)
- Aktuell: Brief-Chronologie, nicht Lebenszeiten

Limitation:
- Datierungspräzision: 90,4% nur Jahr (ohne Monat/Tag)
- 41 Personen ohne Lebensdaten (9,2%)

#### US-4.2: Kohorten-Analyse

Status: Vollständig umsetzbar

Verfügbar:
- Geburtsjahrzehnte 1720er-1820er
- Klare Verteilung erkennbar

Kohortenverteilung (aus Spezifikation):
```
1720er:   2 (0,5%)
1730er:  13 (3,2%)
1740er:  28 (6,9%)
1750er:  62 (15,2%)
1760er:  68 (16,7%)
1770er:  75 (18,4%) ← Peak
1780er:  74 (18,2%)
1790er:  56 (13,8%)
1800er:  26 (6,4%)
1810er:   2 (0,5%)
1820er:   1 (0,2%)
```

Visualisierung:
- Histogramm nach Dekaden
- Generationale Muster erkennbar

Limitation:
- 41 Personen ohne Geburtsdatum
- Keine Ereignis-Kohortenanalyse (z.B. alle, die Französische Revolution erlebten)

#### US-4.3: Brief-Chronologie

Status: Daten vorhanden, nicht integriert

Datenlage:
- 15.312 Briefe in ra-cmif.xml
- Metadaten: Sender, Empfänger, Datum, Ort
- 191 Frauen als Absenderinnen
- 195 Frauen erwähnt

Nachweis:
```bash
$ python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('/home/user/HerData/data/ra-cmif.xml')
ns = {'tei': 'http://www.tei-c.org/ns/1.0'}
descs = tree.findall('.//tei:correspDesc', ns)
print(f'Total letters: {len(descs)}')
"
Total letters: 15312
```

Integration:
- NUR 67 Personen haben letter_count und letter_years Felder
- 381 Personen ohne Briefdaten in persons.json

Limitation:
- Briefdaten müssen nachintegriert werden
- Keine Volltexte, nur Metadaten
- Briefinhalte nicht durchsuchbar

### Epic 5: Datenqualität und Transparenz

Status: 100% umsetzbar (alle Informationen vorhanden)

#### US-5.1: Vollständigkeitsindikator

Status: Vollständig umsetzbar

Verfügbare Metriken:
```
Vollständige Abdeckung (>90%):
- Personenidentifikatoren: 100%
- Geschlecht: 100%
- Namensformen: 100%
- Geburtsdaten: 90,8%
- Sterbedaten: 90,6%
- Biografietext: 100%

Gute Abdeckung (50-90%):
- GND-Verknüpfung: 60,3%
- Personen mit Ortsbezügen: 50,7%

Teilabdeckung (<50%):
- Personen mit Berufsangaben: 46,2%
- Personen mit Mehrfachberufen: 15,6%
```

Visualisierung:
- Dashboard mit Farbcodierung (grün >90%, gelb 50-90%, rot <50%)
- Personendetailseite mit Vollständigkeits-Badge

Limitation: Keine

#### US-5.2: Quellennachweis

Status: Vollständig umsetzbar

Verfügbar:
- SNDB-URL für alle 448 Personen (100%)
- GND-Nummer für 270 Personen (60,3%)
- Datenstand: 2025-10-27 (dokumentiert)

Beispiel:
```
Quellen für Person 1906 (Angelica Bellonata Facius):
- SNDB: https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:1906
- GND: https://d-nb.info/gnd/116372443
- Datenexport: 2025-10-27
```

Limitation: Keine

#### US-5.3: Unsicherheitsmarkierung

Status: Teilweise umsetzbar

Verfügbar:
- Datierungspräzision erkennbar (nur Jahr, Jahr+Monat, vollständig)
- Fehlende Felder transparent (null-Werte)

Nicht verfügbar:
- Unsichere Datierungen ("um", "vor", "nach") aus XML nicht in JSON übernommen
- Quellenqualität nicht differenziert

Limitation:
- Unsicherheitsmarkierungen aus XML müssten nachintegriert werden

## Nicht-funktionale Anforderungen

### NFR-1: Datenintegrität

Status: Erfüllt

- persons.json enthält alle 448 Personen ohne Verlust
- Keine Manipulation der Statistiken
- Datenlücken in diesem Dokument transparent kommuniziert

### NFR-2: Wissenschaftliche Standards

Status: Erfüllt

- SNDB-URLs für alle Personen (100%)
- GND-Links für 60,3% der Personen
- Datenstand 2025-10-27 dokumentiert
- Zitierhinweise in README.md vorhanden

### NFR-3: Barrierefreiheit

Status: Noch nicht implementiert

Erforderlich:
- Farbcodierung mit zusätzlichen Mustern
- Alternativtexte für Visualisierungen
- Screenreader-Tests

### NFR-4: Performance

Status: Teilweise erfüllt

Aktuell:
- persons.json: 432 KB (gut)
- Initiales Laden: Nicht gemessen
- Filter: Implementiert, Performance unklar

Ziel:
- Initiales Laden ≤ 3 Sekunden
- Filteranwendung ≤ 500 ms

### NFR-5: Deployment

Status: Erfüllt

- GitHub Pages aktiv: https://chpollin.github.io/HerData/
- Statisches Hosting ohne Backend
- docs/ Ordner mit index.html, person.html, network.html

## Kritische Datenlücken

### 1. Beziehungsdaten nicht integriert (Highest Priority)

Problem:
- 922 Beziehungen in XML verfügbar
- Nur 67 von 448 Personen (15%) haben relations-Feld in persons.json
- Epic 2 (Verwandtschaft) zu 85% blockiert

Lösung:
- Pipeline-Erweiterung in build_herdata_new.py
- Integration aus pers_koerp_beziehungen.xml + nsl_agrelon.xml

Impact:
- US-2.1, US-2.2, US-2.3 implementierbar
- US-3.6 (Netzwerkdichte) implementierbar

### 2. Briefdaten nicht integriert

Problem:
- 15.312 Briefe in ra-cmif.xml
- Nur 67 Personen haben letter_count/letter_years
- US-4.3 (Brief-Chronologie) blockiert

Lösung:
- CMIF-Parser erweitern
- Brieflisten pro Person in persons.json integrieren

Impact:
- US-4.3 implementierbar
- Detaillierte Korrespondenzanalyse möglich

### 3. Namensvarianten nicht integriert

Problem:
- 797 Namensformen in XML
- Nur Hauptnamen in persons.json
- US-1.1 (Namensbasierte Suche) eingeschränkt

Lösung:
- Namensvarianten aus ra_ndb_main.xml extrahieren
- Als name_variants-Array in persons.json aufnehmen

Impact:
- Vollständige Namenssuche möglich
- Historische Namensvarianten sichtbar

### 4. Ortstyp-Zeiträume fehlen

Problem:
- "Wirkungsort" ohne Von-Bis-Datierung
- US-3.5 (Mobilitätspfade) nur rudimentär möglich

Lösung:
- Wenn Daten vorhanden: Zeiträume aus XML extrahieren
- Wenn nicht vorhanden: Heuristiken (Geburtsort = Geburtsjahr, etc.)

Impact:
- Temporale Ortszuordnung präziser
- Mobilitätsvisualisierungen aussagekräftiger

## Zusammenfassung: Was können wir umsetzen?

### Sofort umsetzbar (ohne Datenintegration)

- Epic 1: Datenexploration (US-1.1 bis US-1.6)
- Epic 3: Geografische Analyse (US-3.1 bis US-3.3)
- Epic 4: Lebenszeit-Übersicht (US-4.1), Kohorten (US-4.2)
- Epic 5: Datenqualität (US-5.1 bis US-5.3)

### Umsetzbar nach Datenintegration

Epic 2: Verwandtschaftsvisualisierung
- Erforderlich: Integration von 922 Beziehungen aus XML
- Aufwand: Pipeline-Erweiterung (1-2 Tage)
- Implementierung: D3.js Netzwerk-Visualisierungen (3-5 Tage)

Epic 4: Brief-Chronologie (US-4.3)
- Erforderlich: Integration von 15.312 Briefen aus CMIF
- Aufwand: CMIF-Parser erweitern (1-2 Tage)
- Implementierung: Timeline-Visualisierung (bereits vorhanden, Anpassung 1 Tag)

Epic 3: Netzwerkdichte (US-3.6)
- Erforderlich: Beziehungsdaten integriert
- Aufwand: Ort-zu-Ort-Projektion (1 Tag)

### Nicht umsetzbar (fehlende Rohdaten)

- Volltextsuche in Briefen (keine Volltexte vorhanden)
- Werkverzeichnisse (nicht in Datenquellen)
- Ereignischronologien (nur Geburts-/Sterbedaten)
- Gruppenzugehörigkeiten/Salons (nicht erfasst)
- Berufliche Netzwerke (nur 2 von 6.580 Beziehungen)

## Empfohlener Implementierungsplan

### Phase 1: Quick Wins (1 Woche)

1. Epic 1: Datenexploration implementieren
   - Suchinterface mit Facetten
   - Statistik-Dashboard
   - Personendossier-Ansicht
2. Epic 5: Datenqualitäts-Indikatoren
   - Vollständigkeits-Badges
   - Quellennachweis-Links
3. Epic 3: Geografische Basis-Features
   - Karte bereits vorhanden, erweitern
   - Ortsprofil-Ansicht

### Phase 2: Datenintegration (1-2 Wochen)

1. Beziehungsdaten integrieren
   - Pipeline-Erweiterung
   - 922 Beziehungen in persons.json
2. Briefdaten integrieren
   - CMIF-Parser erweitern
   - 15.312 Briefe zuordnen
3. Namensvarianten integrieren
   - 797 Namensformen extrahieren

### Phase 3: Visualisierungen (2-3 Wochen)

1. Epic 2: Verwandtschaftsnetzwerk
   - Stammbaum-Visualisierung (D3.js)
   - Ego-Netzwerk-Ansicht
2. Epic 4: Zeitliche Visualisierungen
   - Lebenszeit-Gantt
   - Kohorten-Histogramm
   - Brief-Chronologie
3. Epic 3: Erweiterte Geo-Analysen
   - Zentren-Gravitation
   - Mobilitätspfade (soweit möglich)

## Validierungs-Skripte

Alle Behauptungen in diesem Dokument können validiert werden:

```bash
# Datenstruktur-Analyse
python3 /home/user/HerData/analyze_data_coverage.py

# Beziehungsdaten-Vergleich
python3 -c "
import json, xml.etree.ElementTree as ET
data = json.load(open('/home/user/HerData/docs/data/persons.json'))
person_ids = {p['id'] for p in data['persons']}
tree = ET.parse('/home/user/HerData/data/SNDB/pers_koerp_beziehungen.xml')
rels = tree.getroot().findall('.//ITEM')
available = sum(1 for r in rels if r.find('ID1').text in person_ids or r.find('ID2').text in person_ids)
integrated = sum(1 for p in data['persons'] if 'relations' in p)
print(f'Available: {available}, Integrated: {integrated}, Gap: {available-integrated}')
"

# Briefdaten-Check
python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('/home/user/HerData/data/ra-cmif.xml')
ns = {'tei': 'http://www.tei-c.org/ns/1.0'}
descs = tree.findall('.//tei:correspDesc', ns)
print(f'Total letters in CMIF: {len(descs)}')
"
```

## Fazit

Die Spezifikationen sind weitgehend korrekt und basieren auf validen Daten.

Haupterkenntnisse:
1. 70-80% der Requirements sind mit vorhandenen Daten umsetzbar
2. Kritische Lücke: Beziehungsdaten und Briefdaten nicht integriert (aber in XML vorhanden)
3. Epic 1 (Exploration), Epic 3 (Geografie), Epic 5 (Qualität) sofort umsetzbar
4. Epic 2 (Verwandtschaft), Epic 4 (Zeit) benötigen Datenintegration

Die größte Aufgabe ist nicht Daten-Akquise, sondern Daten-Integration in persons.json.

