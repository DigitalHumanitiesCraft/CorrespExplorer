# HSA Subject-Taxonomie

## Übersicht

1.622 eindeutige Subjects in drei Hauptkategorien:

| Kategorie | Anzahl | URI-Typ |
|-----------|--------|---------|
| HSA-Subjects | 1.272 | gams.uni-graz.at/o:hsa.subjects |
| HSA-Languages | 200 | gams.uni-graz.at/o:hsa.languages |
| Lexvo | 148 | lexvo.org/id/iso639-3 |

## Sprachen als Subjects

### Lexvo (ISO 639-3)

Sprachen, die im Brief thematisiert werden (nicht Briefsprache):

| Sprache | Vorkommen |
|---------|-----------|
| Baskisch (eus) | 698 |
| Französisch (fra) | 401 |
| Spanisch (spa) | 346 |
| Deutsch (deu) | 319 |
| Italienisch (ita) | 240 |
| Portugiesisch (por) | 182 |
| Englisch (eng) | 169 |
| Rumänisch (ron) | 167 |

Wichtige Unterscheidung:
- `hasLanguage`: In welcher Sprache ist der Brief geschrieben?
- `mentionsSubject` (Lexvo): Welche Sprache wird im Brief diskutiert?

### HSA-Languages

HSA-interne Sprachcodes für Sprachen ohne ISO 639-3 oder mit spezieller Bedeutung im Kontext der Schuchardt-Forschung.

Beispiele:
- Latein (L.208)
- Kreolsprachen (diverse)
- Historische Sprachstufen

## HSA-Subjects nach Themenbereich

### Wissenschaftskommunikation

| Subject | Vorkommen |
|---------|-----------|
| Publikationsversand | 627 |
| Dankschreiben | 515 |
| Publikationsvorhaben | 280 |
| Rezension | 163 |
| Sonderabdruck | häufig |
| Literaturhinweise | häufig |

Diese Subjects dokumentieren die akademische Praxis des 19./20. Jahrhunderts.

### Forschungsthemen

| Subject | Vorkommen |
|---------|-----------|
| Etymologie | 218 |
| Sprachkontakt | häufig |
| Kreolsprachen | diverse |
| Sprachverwandtschaft | häufig |
| Phonetik | häufig |

### Institutionen

**Zeitschriften:**
- Revue internationale des études basques (298)
- Zeitschrift für romanische Philologie (248)
- Romania
- Literaturblatt für germanische und romanische Philologie

**Akademien:**
- Universität Graz (208)
- Kaiserliche Akademie der Wissenschaften (Wien)
- Königlich-Preußische Akademie (Berlin)
- Real Academia Española

### Persönliches

| Subject | Vorkommen |
|---------|-----------|
| Biographisches | 315 |
| Reisen | 172 |
| Gesundheit | 164 |

## Visualisierungspotential

### Für Treemap

Natürliche Hierarchie:
```
Root
├── Sprachen
│   ├── Lexvo (ISO 639-3)
│   └── HSA-Languages
└── HSA-Subjects
    ├── Wissenschaftskommunikation
    ├── Forschungsthemen
    ├── Institutionen
    └── Persönliches
```

Problem: Die Unterkategorien von HSA-Subjects sind nicht in den Daten kodiert. Eine Kategorisierung müsste manuell oder durch Textanalyse erfolgen.

### Für Filter

Direkt nutzbare Kategorien:
- `lexvo` - ISO 639-3 Sprachen
- `hsa_language` - HSA-interne Sprachen
- `hsa_subject` - Alle anderen Subjects

### Für Timeline

Subjects mit zeitlicher Entwicklung:
- Wann tauchen bestimmte Themen auf?
- Korrelation mit Lebensphasen Schuchardts
- Entwicklung der Baskologie-Forschung

## Top 20 Subjects

| Subject | Vorkommen | Kategorie |
|---------|-----------|-----------|
| Baskisch | 698 | lexvo |
| Publikationsversand | 627 | hsa_subject |
| Dankschreiben | 515 | hsa_subject |
| Französisch | 401 | lexvo |
| Spanisch | 346 | lexvo |
| Deutsch | 319 | lexvo |
| Biographisches | 315 | hsa_subject |
| Revue int. des études basques | 298 | hsa_subject |
| Publikationsvorhaben | 280 | hsa_subject |
| Zeitschrift f. rom. Philologie | 248 | hsa_subject |
| Italienisch | 240 | lexvo |
| Etymologie | 218 | hsa_subject |
| Universität Graz | 208 | hsa_subject |
| Latein | 208 | hsa_language |
| Portugiesisch | 182 | lexvo |
| Reisen | 172 | hsa_subject |
| Englisch | 169 | lexvo |
| Rumänisch | 167 | lexvo |
| Gesundheit | 164 | hsa_subject |
| Rezension | 163 | hsa_subject |

## URI-Beispiele

```
# Lexvo
http://lexvo.org/id/iso639-3/eus → Baskisch

# HSA-Subject
https://gams.uni-graz.at/o:hsa.subjects#S.4567 → Cercle d'Études Euskariennes

# HSA-Language
https://gams.uni-graz.at/o:hsa.languages#L.208 → Latein
```
