# Datenmodell

Datenarchitektur, Strukturen und Verknüpfungen für HerData.

Stand: 2025-10-30 (aktualisiert mit Multi-Source Biographies)

Siehe [INDEX.md](INDEX.md) für Navigation im Knowledge Vault.

## Kern-Statistiken (NEUE DATENQUELLE)

### Aktuelle Implementierung (Export 2025-10-27)

HerData verwendet seit 28.10.2025 einen kuratierten Export von 448 Frauen mit deutlich besserer Datenqualität.

### Frauen
- 448 Frauen im kuratierten Export (12,4% der vollständigen SNDB)
- 230 Frauen mit CMIF-Briefverbindung (51,3%)
- 227 Frauen mit Geodaten (50,7%)
- 207 Frauen mit Berufsangaben (46,2%)
- 270 Frauen mit GND-ID (60,3% - fast doppelt so gut wie alte SNDB)
- 421 Frauen mit Lebensdaten (94,0%)
- 187 Frauen mit zusätzlichen Biografien (41,7% - Multi-Source Feature seit 30.10.2025)
  - 303 biografische Texte aus 3 SNDB-Projekten
  - goebriefe: 150 Frauen, bug: 133 Frauen, tagebuch: 20 Frauen

### Briefe
- 15.312 Briefe in CMIF (1762-1824)
- 2.525 eindeutige Absender
- 633 eindeutige Orte
- 14.425 erwähnte Personen (67.665 Erwähnungen)

### Datenquellen (Hybrid-Ansatz)
- CMIF: ra-cmif.xml (24 MB, Zenodo 14998880, März 2025)
- SNDB Neu: 8 XML-Dateien (800 KB, Export 27.10.2025) - Personendaten
- SNDB Alt: 3 XML-Dateien (3,6 MB) - Geodaten (geo_main.xml, geo_indiv.xml, geo_links.xml)

### Datenqualität: Neu vs. Alt

| Metrik | Alte SNDB (3.617) | Neue Export (448) | Verbesserung |
|--------|-------------------|-------------------|--------------|
| GND-Abdeckung | 34,1% | 60,3% | +76,8% |
| Datum-Abdeckung | 83,9% | 94,0% | +12,0% |
| CMIF-Match (relativ) | 22,3% | 51,3% | +130% |
| Geodaten (relativ) | 28,8% | 50,7% | +76,0% |

Vollständige Vergleichsanalyse siehe [../preprocessing/compare_output.txt](../preprocessing/compare_output.txt).

## Architektur

### Verknüpfungsprinzip

Drei Datenquellen mit Hybrid-Ansatz (seit 28.10.2025):
- CMIF: Korrespondenzmetadaten (TEI-XML)
- SNDB Neu: Kuratierter Export (8 XML-Dateien, ra_ndb_*)
- SNDB Alt: Geodaten (3 XML-Dateien, geo_*)

Primäre Verknüpfung über GND-ID als gemeinsamer Identifikator.

### Verknüpfungsmatrix (NEUE STRUKTUR)

```
CMIF Brief
  ├── persName@ref ←→ SNDB GND ←→ ra_ndb_main ID
  ├── placeName@ref ←→ GeoNames ←→ geo_links (alt)
  └── mentionsPerson@target ←→ SNDB GND oder ID

SNDB Person (ID als Schlüssel) - HYBRID-ANSATZ
  ├── ra_ndb_indiv (SEXUS, GND) [NEU]
  ├── ra_ndb_datierungen (Geburts-/Sterbedaten) [NEU]
  ├── ra_ndb_berufe (Berufsangaben) [NEU]
  ├── ra_ndb_orte (SNDB_ID-Referenzen) [NEU]
  │   └── SNDB_ID ←→ geo_main (Ortsnamen) [ALT]
  │       └── ID ←→ geo_indiv (Koordinaten) [ALT]
  ├── ra_ndb_beziehungen (AGRELON-Netzwerk) [NEU]
  └── projekt_regestausgabe.xml (Biografische Texte) [NEU]
```

### Warum Hybrid-Ansatz?

Der neue Export (2025-10-27) enthält keine Geodateien (geo_main.xml, geo_indiv.xml, geo_links.xml). Stattdessen:

1. ra_ndb_orte.xml verweist auf SNDB_ID (z.B. 79627 für Weimar)
2. geo_main.xml (alte SNDB) löst SNDB_ID → Ortsname auf
3. geo_indiv.xml (alte SNDB) löst SNDB_ID → Koordinaten auf

Ohne die alten geo_*.xml Dateien gäbe es keine Kartenvisualisierung.

Siehe [decisions.md ADR-008](decisions.md#adr-008) für vollständige Begründung.

## CMIF-Struktur

### TEI-Hierarchie

```xml
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <profileDesc>
      <correspDesc @ref @source>  <!-- 15.312 Briefe -->
        <correspAction type="sent">
          <persName @ref/>        <!-- GND oder lokal -->
          <placeName @ref/>       <!-- GeoNames -->
          <date @when/>           <!-- ISO 8601 -->
        </correspAction>
        <correspAction type="received">
          <persName @ref="http://d-nb.info/gnd/118540238"/> <!-- Goethe -->
        </correspAction>
        <note>
          <ref type="cmif:mentionsPerson" @target/>
          <ref type="cmif:mentionsBibl" @target/>
          <ref type="cmif:hasLanguage" @target/>  <!-- ISO 639 -->
          <ref type="cmif:hasTextBase" @target/>  <!-- Manuscript/Print/... -->
        </note>
      </correspDesc>
    </profileDesc>
  </teiHeader>
</TEI>
```

### ID-Schema

Brief-IDs: `RA[Volume]_[Number]_[ID]`
- Volume: 01-10 (Bandnummer)
- Number: Fortlaufende Nummer
- ID: Eindeutiger Identifier

Beispiel: `RA01_0962_01000` → https://goethe-biographica.de/id/RA01_0962_01000

### Kardinalitäten

| Relation | Verhältnis | Unique | Durchschnitt | Verteilung |
|----------|-----------|--------|--------------|------------|
| Brief → Absender | n:1 | 2.525 | 5,9 Briefe/Absender | Power-Law (58,9% mit 1 Brief) |
| Brief → Ort | n:1 | 633 | 24,2 Briefe/Ort | Weimar 34,2% (5.236 Briefe) |
| Brief → Erwähnung | n:m | 14.425 | 5,2 Personen/Brief | 85,3% Briefe mit Erwähnungen |

### Kontrollierte Vokabulare

Textbasis (cmif:hasTextBase):
- Manuscript: 97,0%
- Print: 1,3%
- Copy: 1,2%
- Draft: 0,4%

Publikationsstatus (cmif:isPublishedWith):
- Abstract: 92,9%
- Transcription: 17,3%

Sprachen (cmif:hasLanguage, ISO 639):
- de (Deutsch): 96,9%
- fr (Französisch): 2,7%
- en (Englisch): 0,3%
- Andere: <0,2%

## SNDB-Struktur

### Aktuell verwendete Dateien (Export 2025-10-27)

HerData verwendet seit 28.10.2025 einen fokussierten Export mit 8 Dateien:

| Kategorie | Datei | Größe | Einträge | Zweck |
|-----------|-------|-------|----------|-------|
| Personen (5) |
| Basis | ra_ndb_main.xml | 193 KB | 797 (448 unique IDs) | Namen, IDs |
| Geschlecht | ra_ndb_indiv.xml | 41 KB | 448 | SEXUS (w), GND |
| Daten | ra_ndb_datierungen.xml | 132 KB | 869 | Geburts-/Sterbedaten |
| Berufe | ra_ndb_berufe.xml | 32 KB | 296 | Berufsangaben |
| Orte | ra_ndb_orte.xml | 84 KB | 552 | SNDB_ID-Referenzen |
| Netzwerk (1) |
| Beziehungen | ra_ndb_beziehungen.xml | 137 KB | 939 | AGRELON-Netzwerk |
| Projekt (1) |
| Regest | projekt_regestausgabe.xml | 158 KB | 448 | Biografische Texte |
| Ontologie (1) |
| AGRELON | nsl_agrelon.xml | 9 KB | 38 | Beziehungstypen |

### Geodaten (von alter SNDB, unverzichtbar)

| Datei | Größe | Einträge | Zweck |
|-------|-------|----------|-------|
| geo_main.xml | 739 KB | 4.007 (3.210 LFDNR=0) | Ortsnamen |
| geo_indiv.xml | 936 KB | 22.571 | Koordinaten |
| geo_links.xml | 1.880 KB | 63.766 | GeoNames-Verknüpfungen |

### Vollständige SNDB (Referenz, nicht verwendet)

Zum Vergleich: Die vollständige SNDB mit allen 23.571 Personen umfasst 14 Dateien (32 MB).

Details siehe Archiv-Dokumentation in diesem Dokument weiter unten.

| Kategorie | Datei | Größe | Einträge | Zweck |
|-----------|-------|-------|----------|-------|
| Personen (6) |
| Basis | pers_koerp_main.xml | 6.051 KB | 27.835 (23.571 unique IDs) | Namen, IDs |
| Geschlecht | pers_koerp_indiv.xml | 2.191 KB | 23.571 | SEXUS (m/w), GND |
| Beziehungen | pers_koerp_beziehungen.xml | 1.028 KB | 6.580 | AGRELON-Netzwerk |
| Daten | pers_koerp_datierungen.xml | 6.071 KB | 263.069 | Geburts-/Sterbedaten |
| Berufe | pers_koerp_berufe.xml | 3.383 KB | 29.375 | Berufsangaben |
| Orte | pers_koerp_orte.xml | 3.417 KB | 21.058 | Wirkungsorte |
| Geografie (3) |
| Basis | geo_main.xml | 739 KB | 4.007 | Ortsnamen |
| Links | geo_links.xml | 1.880 KB | 63.766 | GeoNames-Verknüpfungen |
| Details | geo_indiv.xml | 936 KB | 22.571 | Koordinaten, Varianten |
| Ontologie (1) |
| AGRELON | nsl_agrelon.xml | 11 KB | 44 | Beziehungstypen |
| Projekt (4) |
| Briefe | projekt_goebriefe.xml | 1.507 KB | 6.790 | Brief-Edition Register |
| Regest | projekt_regestausgabe.xml | 4.875 KB | 20.128 | Ausführliche Beschreibungen |
| Tagebuch | projekt_tagebuch.xml | 195 KB | 1.004 | Tagebucherwähnungen |
| BUG | projekt_bug.xml | 289 KB | 2.254 | Biographica Universalis Goetheana |

### Identifikationssystem

SNDB-ID (numerisch):
- URL: `https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:[ID]`
- Beispiel: ID 43779 → Christiane Vulpius

GND-ID:
- URL: `https://d-nb.info/gnd/[ID]`
- Abdeckung SNDB gesamt: 53,4% (12.596 von 23.571)
- Abdeckung CMIF-Absender: 93,8%
- Abdeckung erwähnte Personen: 82,5%
- Abdeckung Frauen: ~34% (ähnlich Gesamtschnitt)

LFDNR (Laufende Nummer):
- LFDNR=0: Haupteintrag (Hauptname)
- LFDNR>0: Namens-Varianten, Aliase
- Gleiche ID kann mehrere LFDNR haben (z.B. ID 1492: LFDNR=0 "Hauptname", LFDNR=705 "d'Arbes")
- Bei Joins: LFDNR=0 bevorzugen für konsistente Hauptnamen

### Geschlechterverteilung

| Geschlecht | Anzahl | Prozent |
|------------|--------|---------|
| Männer (m) | 16.572 | 70,3% |
| Frauen (w) | 3.617 | 15,3% |
| Unbekannt | 3.382 | 14,3% |
| Gesamt | 23.571 | 100% |

---

## DTD-Schemas (Feldstrukturen)

### Personendateien

pers_koerp_main.xml
```xml
<row>
  <ID>...</ID>              <!-- Numerische SNDB-ID -->
  <LFDNR>...</LFDNR>        <!-- 0=Haupteintrag, >0=Variante -->
  <NACHNAME>...</NACHNAME>
  <VORNAMEN>...</VORNAMEN>
  <RUFNAME>...</RUFNAME>    <!-- Gebräuchlicher Name -->
  <GEBURTSNAME>...</GEBURTSNAME>  <!-- Name vor Heirat -->
  <TITEL>...</TITEL>        <!-- Akademische/adlige Titel -->
  <NAMENSFORM>...</NAMENSFORM>    <!-- Standardisierte Form -->
  <ZUSATZ>...</ZUSATZ>      <!-- Weitere Namenszusätze -->
  <VON_DATUM_*>...</VON_DATUM_*>  <!-- Datierungsfelder (unklar) -->
  <BIS_DATUM_*>...</BIS_DATUM_*>  <!-- Siehe datierungen.xml -->
</row>
```

pers_koerp_indiv.xml
```xml
<row>
  <ID>...</ID>
  <SEXUS>...</SEXUS>        <!-- m/w -->
  <GND>...</GND>            <!-- GND-Nummer -->
  <LITERATUR>...</LITERATUR> <!-- Literaturverweise (Format unklar) -->
</row>
```

pers_koerp_beziehungen.xml
```xml
<row>
  <ID1>...</ID1>            <!-- Person A -->
  <ID2>...</ID2>            <!-- Person B -->
  <AGRELON_ID1>...</AGRELON_ID1>  <!-- Beziehungstyp A→B (siehe AGRELON) -->
  <AGRELON_ID2>...</AGRELON_ID2>  <!-- Gegenrichtung B→A -->
</row>
```
Beispiel: ID1=Vulpius, ID2=Goethe, AGRELON_ID1=4120 (hat Ehepartner), AGRELON_ID2=4110 (ist verheiratet mit)

pers_koerp_datierungen.xml
```xml
<!-- Struktur unvollständig dokumentiert -->
<!-- Größte Personendatei: 263.069 Zeilen (6 MB) -->
<!-- Vermutlich: ID, ART (Geburtsdatum/Sterbedatum), JAHR, MONAT, TAG -->
<!-- TODO: DTD analysieren -->
```

pers_koerp_berufe.xml
```xml
<row>
  <ID>...</ID>
  <LFDNR>...</LFDNR>        <!-- Nummerierung bei mehreren Berufen -->
  <BERUF>...</BERUF>        <!-- Berufsbezeichnung -->
  <BERUF2>...</BERUF2>      <!-- Alternative Bezeichnung oder zweiter Beruf -->
</row>
```

pers_koerp_orte.xml
```xml
<row>
  <ID>...</ID>
  <LFDNR>...</LFDNR>
  <ORT>...</ORT>            <!-- Ortsname -->
  <ART>...</ART>            <!-- Geburtsort, Sterbeort, Wirkungsort -->
  <SNDB_ID>...</SNDB_ID>    <!-- Verknüpfung zu geo_main.xml -->
</row>
```

### Geografische Dateien

geo_main.xml
```xml
<row>
  <ID>...</ID>
  <LFDNR>...</LFDNR>        <!-- 0=Hauptname, >0=Variante -->
  <BEZEICHNUNG>...</BEZEICHNUNG>  <!-- Ortsname -->
  <INDEXNAME>...</INDEXNAME>      <!-- Normalisiert ohne Umlaute -->
  <VON_DATUM_*>...</VON_DATUM_*>  <!-- Gültigkeit? -->
  <BIS_DATUM_*>...</BIS_DATUM_*>  <!-- Namensänderungen? -->
</row>
```

geo_links.xml
```xml
<!-- Struktur unvollständig dokumentiert -->
<!-- 63.766 Zeilen (1,9 MB) -->
<!-- Vermutlich: ID, GEONAMES_ID, TYPE -->
<!-- TODO: DTD analysieren -->
```

geo_indiv.xml
```xml
<!-- Struktur unvollständig dokumentiert -->
<!-- 22.571 Zeilen (936 KB) -->
<!-- Vermutlich: ID, LATITUDE, LONGITUDE, ALT_NAMES -->
<!-- TODO: DTD analysieren -->
```

### Projekt-spezifische Biogramme

projekt_goebriefe.xml
```xml
<row>
  <ID>...</ID>
  <REGISTEREINTRAG>...</REGISTEREINTRAG>
</row>
```
- Zweck: Biografische Kurzinfos für Brief-Edition
- Format: Text mit Markup (#k#...#/k# = Kursiv?, #r#...#/r# = Referenz?)
- Abdeckung: 6.790 von 23.571 Personen (28,8%)

projekt_regestausgabe.xml
```xml
<!-- Struktur ähnlich goebriefe, aber ausführlicher -->
<!-- Größte Projekt-Datei: 20.128 Einträge (85,3% Abdeckung) -->
<!-- TODO: Markup-Format und Unterschiede zu goebriefe analysieren -->
```

projekt_bug.xml
```xml
<!-- Struktur undokumentiert -->
<!-- BUG = "Biographica Universalis Goetheana" -->
<!-- 2.254 Einträge (9,6% Abdeckung) -->
<!-- TODO: Projektkontext und Feldstruktur klären -->
```

projekt_tagebuch.xml
```xml
<!-- Struktur undokumentiert -->
<!-- Vermutlich: ID, DATUM, ERWÄHNUNG -->
<!-- 1.004 Einträge (4,3% Abdeckung) -->
<!-- TODO: Verknüpfung zu Tagebuch-Edition analysieren -->
```

---

## AGRELON-Ontologie

Agent Relationship Ontology (44 Beziehungstypen aus nsl_agrelon.xml)

### Struktur

```xml
<row>
  <IDENT>...</IDENT>        <!-- Numerische ID (z.B. 4120) -->
  <KATEGORIE>...</KATEGORIE>  <!-- Beziehungskategorie -->
  <BEZIEHUNG>...</BEZIEHUNG>  <!-- Textbeschreibung (deutsch) -->
  <URI>...</URI>            <!-- AGRELON-URI -->
  <CORRIDENT>...</CORRIDENT>  <!-- ID der Gegenrichtung -->
</row>
```

### Kategorien (Auswahl)

Verwandtschaft:
- 4010: hat Vater / 4011: ist Vater von
- 4020: hat Elternteil / 4021: ist Elternteil von
- 4030: hat Kind / 4040: hat Kind (Variante?)
- 4110: ist verheiratet mit / 4120: hat Ehepartner
- 4130: hat Geschwister

Vitaler/letaler Kontakt:
- 5010: hat getötet
- 5020: wurde getötet von
- 5030: hat Mordopfer
- 5040: hat Mörder

Gruppenbeteiligung:
- 2010: ist Mitglied von
- 2020: hat Mitglied
- 2050: hat Besitzer
- 2060: ist Besitzer von

Weitere Kategorien:
- Professionell: Lehrer/Schüler, Patron/Klient
- Literarisch: Autor/Werk, Widmung
- Geografisch: geboren in, gestorben in

Vollständige Liste siehe nsl_agrelon.xml (44 Typen).

---

## Datenfluss (Frauenidentifikation)

### Pipeline (4 Phasen)

Phase 1: Identifizierung
1. Lade pers_koerp_main.xml (27.835 Einträge, 23.571 unique IDs)
2. Filtere pers_koerp_indiv.xml nach SEXUS=w
3. Ergebnis: 3.617 Frauen (15,3%)

Phase 2: CMIF-Matching
1. Absenderinnen: persName@ref ←→ SNDB GND (primär) oder Name (sekundär)
2. Erwähnungen: mentionsPerson@target ←→ SNDB GND oder ID
3. Ergebnis: 808 Frauen mit Briefverbindung (36 Absenderinnen, 616 erwähnt, 156 beides)

Phase 3: Anreicherung
1. Geodaten: pers_koerp_orte.xml + geo_main.xml + geo_indiv.xml
2. Temporale Daten: pers_koerp_datierungen.xml
3. Berufe: pers_koerp_berufe.xml
4. Beziehungen: pers_koerp_beziehungen.xml + nsl_agrelon.xml
5. Ergebnis: 1.042 Frauen mit Geodaten, 979 mit Berufen

Phase 4: Narrativierung
1. Biografische Texte: projekt_goebriefe.xml (6.790), projekt_regestausgabe.xml (20.128)
2. Tagebucherwähnungen: projekt_tagebuch.xml (1.004)
3. Ausgabe: docs/data/persons.json (1,49 MB)

Details siehe [../preprocessing/README.md](../preprocessing/README.md).

---

## API-Zugriffe

### CMIF Brief-Volltext API

Endpunkt:
```
https://api.goethe-biographica.de/exist/apps/api/v1.0/tei/get-records.xql
```

Parameter:
- `edition=ra` (Regestausgabe)
- `record-id=RA01_0962_01000` (Brief-ID)
- `metadata` (optional, erweiterte Metadaten)

Status: Nicht live getestet
TODO: Authentifizierung?, Rate Limits?, Response-Format (TEI-XML? JSON?), Error-Handling

### SNDB Online-Datenbank

URL-Pattern:
```
https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:[ID]
```

Beispiel: ID 43779 → https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:43779

Status: Funktioniert
TODO: Programmatischer Zugriff möglich? API oder Scraping?

## Aggregationsmöglichkeiten

### Netzwerkprojektionen

- Person-zu-Person: Ko-Erwähnung in Briefen
- Ort-zu-Ort: Korrespondenzwege
- Zeit-Thema: Temporale thematische Cluster

### Multidimensionale Analysen

- Bewegungsprofile: Räumliche Mobilität über Zeit
- Themenverläufe: Inhaltliche Entwicklungen
- Soziale Dynamiken: Beziehungsnetzwerke im Zeitverlauf

Details siehe [requirements.md](requirements.md) und [design.md](design.md).

---

## Data Pipeline Implementation

### Architektur

4-Phasen-Pipeline zur Datenextraktion und Anreicherung:

1. Phase 1: Frauen-Identifikation aus SNDB (SEXUS='w')
2. Phase 2: CMIF-Brief-Matching via GND-ID
3. Phase 3: Geodaten und Berufe anreichern
4. Phase 4: JSON-Generierung für Frontend

Code: [preprocessing/build_herdata.py](../preprocessing/build_herdata.py) (615 Zeilen)

### Phase 1: Frauen-Identifikation

Drei XML-Dateien zusammenführen:

```python
# 1. pers_koerp_main.xml: Namen laden
id_to_name = {}
for item in main_root.findall('.//ITEM'):
    person_id = item.find('ID').text
    lfdnr = item.find('LFDNR').text

    # Nur Haupteinträge (LFDNR=0)
    if lfdnr == '0':
        nachname = item.find('NACHNAME').text
        vornamen = item.find('VORNAMEN').text
        id_to_name[person_id] = build_name(vornamen, nachname)

# 2. pers_koerp_indiv.xml: Frauen filtern
for item in indiv_root.findall('.//ITEM'):
    person_id = item.find('ID').text
    sexus = item.find('SEXUS').text
    gnd = item.find('GND').text

    if sexus == 'w':
        women[person_id] = {
            'id': person_id,
            'name': id_to_name.get(person_id),
            'gnd': gnd,
            'dates': {},
            'occupations': [],
            'places': []
        }

# 3. pers_koerp_datierungen.xml: Lebensdaten
for item in dates_root.findall('.//ITEM'):
    art = item.find('ART').text  # "Geburtsdatum" / "Sterbedatum"
    jahr = item.find('JAHR').text
    if art == 'Geburtsdatum':
        women[person_id]['dates']['birth'] = jahr
    elif art == 'Sterbedatum':
        women[person_id]['dates']['death'] = jahr
```

Validierung:

```python
assert 3500 <= len(women) <= 3700  # Erwartete Range
assert 0.25 <= gnd_coverage <= 0.50  # 25-50% GND bei Frauen
```

### Phase 2: CMIF-Brief-Matching

GND-basiertes Matching mit Fallback:

```python
# Index aufbauen für schnelles Lookup
gnd_to_woman = {}
for woman_id, woman in women.items():
    if woman.get('gnd'):
        gnd_to_woman[woman['gnd']] = woman_id

# CMIF durchsuchen
for corresp in cmif_root.findall('.//tei:correspDesc', NS):
    # Absender
    sent_action = corresp.find('.//tei:correspAction[@type="sent"]', NS)
    sender_ref = sent_action.find('.//tei:persName', NS).get('ref')
    sender_gnd = extract_gnd_id(sender_ref)  # "http://d-nb.info/gnd/118627856" → "118627856"

    if sender_gnd in gnd_to_woman:
        woman_id = gnd_to_woman[sender_gnd]
        women[woman_id]['letter_count'] += 1
        if 'sender' not in women[woman_id]['roles']:
            women[woman_id]['roles'].append('sender')

    # Erwähnungen
    for mention in corresp.findall('.//tei:ref[@type="cmif:mentionsPerson"]', NS):
        mention_ref = mention.get('target')
        mention_gnd = extract_gnd_id(mention_ref)

        if mention_gnd in gnd_to_woman:
            woman_id = gnd_to_woman[mention_gnd]
            women[woman_id]['mention_count'] += 1
            if 'mentioned' not in women[woman_id]['roles']:
                women[woman_id]['roles'].append('mentioned')
```

Rollen-Logik:

- sender: Hat mindestens 1 Brief geschrieben
- mentioned: Wurde mindestens 1x erwähnt
- both: Sowohl sender als auch mentioned
- indirect: Nur SNDB-Eintrag, keine Briefverbindung

### Phase 3: Geodaten-Anreicherung

Primary Place Selection Algorithm:

```python
# Priorisierung: Wirkungsort > Geburtsort > Sterbeort
priority = {
    'Wirkungsort': 1,
    'Geburtsort': 2,
    'Sterbeort': 3
}

# pers_koerp_orte.xml laden
for item in orte_root.findall('.//ITEM'):
    person_id = item.find('ID').text
    ort_id = item.find('ORT').text
    art = item.find('ART').text  # Wirkungsort, Geburtsort, Sterbeort

    # geo_main.xml laden für Koordinaten
    place_data = geo_main.get(ort_id)  # {name, lat, lon}

    if person_id in women:
        women[person_id]['places'].append({
            'type': art,
            'name': place_data['name'],
            'lat': place_data['lat'],
            'lon': place_data['lon'],
            'priority': priority.get(art, 99)
        })

# Sortieren und ersten Ort verwenden
for woman in women.values():
    woman['places'].sort(key=lambda p: p['priority'])
```

Berufe anreichern:

```python
# pers_koerp_berufe.xml
for item in berufe_root.findall('.//ITEM'):
    person_id = item.find('ID').text
    beruf = item.find('BERUF').text

    if person_id in women:
        women[person_id]['occupations'].append({
            'name': beruf
        })
```

### Phase 4: JSON-Generierung

Optimierungen:

```python
def clean_person(person):
    """Remove null fields to reduce file size"""
    return {k: v for k, v in person.items() if v is not None and v != []}

output = {
    'meta': {
        'generated': datetime.now().isoformat(),
        'total_women': len(women),
        'with_geodata': sum(1 for w in women.values() if w['places']),
        'with_cmif_data': sum(1 for w in women.values() if w['letter_count'] > 0 or w['mention_count'] > 0)
    },
    'persons': [clean_person(w) for w in women.values()]
}

with open('docs/data/persons.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
```

Ergebnis: 1.49 MB (optimiert durch null-Feld-Entfernung).

### Edge Cases

Antike Figuren:

```python
# Penelope (ID 35267): birth -1184, death -1145
# Negative Jahreszahlen für BCE-Daten
if jahr and jahr.startswith('-'):
    # Als String belassen, keine Date-Konvertierung
    dates['birth'] = jahr
```

LFDNR-Varianten:

```python
# ID 1001, LFDNR 0: "Goethe, Johann Wolfgang von"
# ID 1001, LFDNR 1: "von Goethe, Johann Wolfgang"
# ID 1001, LFDNR 2: "Göthe, Johann Wolfgang"

# Lösung: Nur LFDNR=0 verwenden (Haupteintrag)
if lfdnr == '0':
    id_to_name[person_id] = name
```

GND-Fallback-Matching:

```python
# Wenn keine GND-Übereinstimmung, versuche Namensvergleich
if sender_gnd not in gnd_to_woman:
    sender_name = sent_action.find('.//tei:persName', NS).text
    if sender_name:
        # Fuzzy Match über Name (nur für Evaluation, nicht produktiv)
        name_matches = [w_id for w_id, w in women.items()
                        if w['name'].lower() == sender_name.lower()]
        if len(name_matches) == 1:
            woman_id = name_matches[0]
            # ... matching wie oben
```

Hinweis: Name-Matching aktuell nicht implementiert (zu fehleranfällig ohne Fuzzy-Logik).

### Testing

48 Tests in 10 Kategorien:

```python
# build_herdata_test.py (550 Zeilen)
class TestHerDataPipeline(unittest.TestCase):
    def test_phase1_women_count(self):
        assert 3500 <= len(pipeline.women) <= 3700

    def test_phase1_gnd_coverage(self):
        assert 0.25 <= gnd_coverage <= 0.50

    def test_phase2_cmif_matching(self):
        assert with_letters > 0
        assert senders > 0

    def test_phase3_geodata(self):
        assert 0.20 <= geodata_pct <= 0.80

    def test_known_persons(self):
        # Christiane Vulpius (ID 43779)
        vulpius = pipeline.women['43779']
        assert vulpius['name'] == 'Johanna Christiana Sophia Vulpius'
        assert vulpius['gnd'] == '118627856'
        assert vulpius['letter_count'] == 215
```

### Performance

Benchmark (Intel i5, 16 GB RAM):

- Phase 1: 0.25s (3.617 Frauen identifiziert)
- Phase 2: 0.68s (15.312 Briefe geparst)
- Phase 3: 0.32s (Geodaten und Berufe)
- Phase 4: 0.14s (JSON-Generierung)
- Total: 1.39s

Optimierungen:

- GND-Index statt linearer Suche (O(1) statt O(n))
- ElementTree statt lxml (Standard Library)
- Keine Zwischendateien (alles in-memory)

### Datenqualitäts-Checks

Inline-Validierungen:

```python
# Koordinaten-Range
assert -90 <= lat <= 90
assert -180 <= lon <= 180

# Datums-Konsistenz
if birth and death:
    assert int(birth) <= int(death)

# Keine Duplikate
assert len(set(women.keys())) == len(women)
```

Siehe [technical-architecture.md](technical-architecture.md) für Frontend-Implementierung.

---

## Datenqualität

### CMIF
- GND-Abdeckung Absender: 93,8%
- GeoNames-Verknüpfung Orte: 91,6%
- Exakte Datierungen: 87,6%
- TEI-Volltext-Verfügbarkeit: 15,7%
- Stand: Zenodo 14998880 (März 2025)

### SNDB
- Stand: Oktober 2025 (~2 Jahre alt)
- GND-Abdeckung gesamt: 53,4% (12.596 von 23.571)
- GND-Abdeckung Frauen: ~34% (1.235 von 3.617)
- Struktur: Stabil

### Deduplizierung
- 27.835 Einträge für 23.571 IDs
- Ursache: LFDNR-Varianten (Mehrfacheinträge für Namensformen)
- Lösung: LFDNR=0 für Haupteintrag bevorzugen

## Beispiel-Datensätze

### Christiane Vulpius (ID 43779)

pers_koerp_main.xml:
- ID: 43779
- NACHNAME: Vulpius
- VORNAMEN: Johanna Christiana Sophia
- LFDNR: 0 (Haupteintrag)

pers_koerp_indiv.xml:
- SEXUS: w
- GND: 118627856

pers_koerp_beziehungen.xml:
- ID1: 43779, ID2: 2475 (Goethe)
- AGRELON_ID1: 4120 (hat Ehepartner)
- AGRELON_ID2: 4110 (ist verheiratet mit)

CMIF-Vorkommen:
- Als Absenderin: 215 Briefe (Rang 12 von 2.525)
- Erwähnt: 659 Mal (Rang 6 von 14.425)

pers_koerp_orte.xml:
- Wirkungsort: Weimar (SNDB_ID verknüpft mit geo_main.xml)

projekt_goebriefe.xml:
- REGISTEREINTRAG: "Christiane Vulpius, geb. 1765 in Weimar, gest. 1816 ebd. Goethes Lebensgefährtin und spätere Ehefrau..."

### Weitere Beispiele

TODO: 2 weitere Beispielpersonen dokumentieren:
1. Unbekannte Frau mit wenig Daten (typischer Fall ohne GND)
2. Mann mit komplexem Netzwerk (z.B. Christian Gottlob Voigt, 760 Briefe)

## Verweise

- [project.md](project.md) - Projektübersicht
- [research-context.md](research-context.md) - Wissenschaftlicher Kontext
- [design.md](design.md) - Visualisierungsstrategie
- [../data/analysis-report.md](../data/analysis-report.md) - Vollständige Statistiken
- [../preprocessing/README.md](../preprocessing/README.md) - Pipeline-Dokumentation
