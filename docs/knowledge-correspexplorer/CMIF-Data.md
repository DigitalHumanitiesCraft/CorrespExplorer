# CMIF-Datenmodell und Struktur

Dokumentation der CMIF-Datenquellen für den CorrespExplorer.

## Datenquellen im Vergleich

| Aspekt | PROPYLÄEN (HerData) | HSA |
|--------|---------------------|-----|
| Datei | data/ra-cmif.xml | data/hsa/CMIF.xml |
| Briefe | ~15.312 | 11.576 |
| Authority-System | GND | VIAF |
| Eindeutige Sender | ~2.500 | 1.026 |
| Eindeutige Empfänger | 1 (Goethe) | 113 |
| Zeitraum | 1762-1824 | 1866-1925 |

## HSA-Datenmodell

### Kernentitäten

```
Brief (correspDesc)
├── Sender (persName + VIAF)
├── Empfänger (persName + VIAF)
├── Absende-Ort (placeName + GeoNames)
├── Datum (date)
└── Metadaten (note)
    ├── hasLanguage (Briefsprache)
    ├── mentionsSubject (Themen)
    ├── mentionsPerson (erwähnte Personen)
    └── mentionsPlace (erwähnte Orte)
```

### Authority-Systeme

| System | Basis-URL | Verwendung |
|--------|-----------|------------|
| VIAF | viaf.org/viaf/{id} | Personen (96% Coverage) |
| GeoNames | sws.geonames.org/{id} | Orte |
| HSA-Subjects | gams.uni-graz.at/o:hsa.subjects#S.{id} | Themen |
| HSA-Languages | gams.uni-graz.at/o:hsa.languages#L.{id} | Sprachen (intern) |
| Lexvo | lexvo.org/id/iso639-3/{code} | Sprachen (ISO 639-3) |

### Datumsformate

Das HSA-CMIF verwendet ausschliesslich das `when`-Attribut im Format `YYYY-MM-DD`.
(PROPYLÄEN verwendet zusätzlich `notBefore`, `notAfter`, `from`, `to` für unsichere Datierungen.)

## Personen-Struktur

### Korrespondenz-Netzwerk

Das HSA ist ein ego-zentriertes Netzwerk um Hugo Schuchardt:
- 9.130 Briefe an Schuchardt (79% aller Briefe)
- 2.446 Briefe von Schuchardt (21%)

Top-Korrespondenten:
- Leo Spitzer (447 Briefe)
- Julio de Urquijo Ybarra (243 Briefe)
- Georges Lacombe (235 Briefe)
- Theodor Gartner (222 Briefe)
- Edward Spencer Dodgson (181 Briefe)

### Erwähnungsnetzwerk (mentionsPerson)

2.081 eindeutige erwähnte Personen - ein separates Netzwerk der diskutierten Gelehrten und historischen Figuren.

Visualisierungspotential:
- Zwei-Ebenen-Netzwerk: Korrespondenz vs. Erwähnung
- Personenprofile mit beiden Beziehungstypen
- Thematische Cluster über gemeinsam erwähnte Personen

## Geographische Struktur

### Absende-Orte (781 eindeutige)

Zentren der Korrespondenz:
- Graz: 2.371 Briefe (Schuchardts Wohnort)
- Wien: 855 Briefe
- Paris: 781 Briefe
- Leipzig: 247 Briefe
- Berlin: 237 Briefe
- Budapest: 234 Briefe

Besonderheit: 576 Briefe mit "Unbekannt" als Ort.

### Erwähnte Orte (336 eindeutige)

Orte, die im Briefinhalt thematisiert werden:
- Graz: 621 Erwähnungen
- Wien: 389 Erwähnungen
- Leipzig: 243 Erwähnungen
- Paris: 233 Erwähnungen
- Italien: 175 Erwähnungen (Land)
- Spanien: 155 Erwähnungen (Land)
- Baskenland: 144 Erwähnungen (Region)

Visualisierungspotential:
- Zwei Karten-Layer: Absende-Orte vs. inhaltliche Erwähnungen
- Regionen und Länder als eigene Kategorie
- Heatmap der thematischen Geographie

## Sprachen-Struktur

### Briefsprachen (hasLanguage)

18 verschiedene Sprachen, 7.896 Briefe auf Deutsch (68%):

| Sprache | Code | Briefe | Anteil |
|---------|------|--------|--------|
| Deutsch | de | 7.896 | 68,2% |
| Französisch | fr | 1.393 | 12,0% |
| Italienisch | it | 980 | 8,5% |
| Spanisch | es | 708 | 6,1% |
| Englisch | en | 309 | 2,7% |
| Portugiesisch | pt | 186 | 1,6% |
| Ungarisch | hu | 37 | 0,3% |
| Baskisch | eu | 22 | 0,2% |
| Weitere | - | 45 | 0,4% |

Weitere Sprachen: Latein, Niederländisch, Kymrisch, Katalanisch, Dänisch, Rumänisch, Ladinisch, Esperanto, Okzitanisch, Papiamentu.

Visualisierungspotential:
- Sprachverteilung pro Korrespondent
- Zeitliche Entwicklung der Sprachverwendung
- Korrelation Sprache-Absende-Ort

## Themen-Struktur (mentionsSubject)

### Kategorien

1.622 eindeutige Subjects in vier Kategorien:

| Kategorie | Anzahl | Beispiele |
|-----------|--------|-----------|
| HSA-Subjects | 1.272 | Publikationsversand, Etymologie, Universität |
| HSA-Languages | 200 | Interne Sprachcodes |
| Lexvo | 148 | ISO 639-3 Sprachcodes |
| Andere | 2 | - |

### Thematische Cluster

**Wissenschaftskommunikation:**
- Publikationsversand (627)
- Dankschreiben (515)
- Publikationsvorhaben (280)
- Rezension (163)
- Sonderabdruck (häufig)

**Sprachwissenschaft:**
- Baskisch (698) - Hauptforschungsgebiet Schuchardts
- Etymologie (218)
- Romanische Sprachen (Französisch, Spanisch, Italienisch, Portugiesisch)
- Kreolsprachen (diverse)

**Institutionen:**
- Universität Graz (208)
- Zeitschrift für romanische Philologie (248)
- Revue internationale des études basques (298)
- Kaiserliche Akademie Wien (häufig)

**Persönliches:**
- Biographisches (315)
- Reisen (172)
- Gesundheit (164)

### Sprachen als Thema vs. Briefsprache

Wichtige Unterscheidung:
- `hasLanguage`: In welcher Sprache ist der Brief geschrieben?
- `mentionsSubject` (Lexvo/HSA-Language): Welche Sprache wird im Brief diskutiert?

Beispiel: Ein Brief auf Deutsch (`hasLanguage=de`) kann über Baskisch handeln (`mentionsSubject=Baskisch`).

Visualisierungspotential:
- Treemap der Themen nach Häufigkeit
- Themen-Timeline (welche Themen wann diskutiert)
- Korrespondenten-Themen-Matrix
- Thematische Netzwerke (Personen, die über gleiche Themen schreiben)

## Metadaten-Verfügbarkeit

| Metadaten-Typ | Vorkommen | Pro Brief |
|---------------|-----------|-----------|
| hasLanguage | 11.576 | 100% |
| isPublishedWith | 11.576 | 100% |
| isAvailableAsTEIfile | 11.576 | 100% |
| mentionsSubject | 23.020 | ~2,0 |
| mentionsPerson | 17.413 | ~1,5 |
| mentionsPlace | 5.955 | ~0,5 |

## Visualisierungskonzepte

### Netzwerke

1. **Korrespondenz-Netzwerk**: Sender-Empfänger-Beziehungen
2. **Erwähnungs-Netzwerk**: Wer erwähnt wen in Briefen
3. **Thematisches Netzwerk**: Personen verbunden durch gemeinsame Themen

### Karten

1. **Absende-Orte**: Woher werden Briefe geschrieben
2. **Erwähnte Orte**: Worüber wird geschrieben (inhaltliche Geographie)
3. **Overlay**: Beide Layer kombiniert

### Zeitverläufe

1. **Korrespondenz-Timeline**: Brieffrequenz über Zeit
2. **Themen-Timeline**: Aufkommen und Verschwinden von Themen
3. **Sprach-Timeline**: Wechsel der Korrespondenzsprachen

### Filter-Dimensionen

- Zeitraum
- Korrespondenten (Sender/Empfänger)
- Briefsprache
- Themen (Subjects)
- Erwähnte Personen
- Erwähnte Orte

## XML-Extraktion

### XPath-Ausdrücke

```xpath
# Alle Briefe
//tei:correspDesc

# Brief-ID
@ref

# Sender
.//tei:correspAction[@type='sent']/tei:persName

# Sender VIAF-ID
.//tei:correspAction[@type='sent']/tei:persName/@ref

# Absende-Ort
.//tei:correspAction[@type='sent']/tei:placeName

# Datum
.//tei:correspAction[@type='sent']/tei:date/@when

# Empfänger
.//tei:correspAction[@type='received']/tei:persName

# Briefsprache
.//tei:note/tei:ref[contains(@type, 'hasLanguage')]/@target

# Erwähnte Themen
.//tei:note/tei:ref[contains(@type, 'mentionsSubject')]

# Erwähnte Personen
.//tei:note/tei:ref[contains(@type, 'mentionsPerson')]

# Erwähnte Orte
.//tei:note/tei:ref[contains(@type, 'mentionsPlace')]
```

## Unterschiede zu PROPYLÄEN-CMIF

| Aspekt | PROPYLÄEN | HSA |
|--------|-----------|-----|
| Struktur | Briefe an eine Person | Bidirektionale Korrespondenz |
| mentionsSubject | nicht vorhanden | 23.020 Einträge |
| mentionsPlace | nicht vorhanden | 5.955 Einträge |
| Namespace | cmif: prefix | LOD Academy URIs |
| Datumsformat | when, notBefore, notAfter, from, to | nur when |
| GeoNames-URL | geonames.org | sws.geonames.org |
