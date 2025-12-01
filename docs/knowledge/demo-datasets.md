# Demo-Datensaetze fuer CorrespExplorer

Dokumentation der analysierten CMIF-Datensaetze zur Verwendung als Beispiele und Testdaten.

---

## Uebersicht

| ID | Name | Briefe | Zeitraum | Quelle |
|----|------|--------|----------|--------|
| uncertainty | Uncertainty Test | 22 | 1900 | CorrespExplorer |
| hebel | Hebel-Briefe | 25 | 1791-1826 | TU Darmstadt |
| rollett | Rollett-Korrespondenz | 328 | 1877-1897 | Uni Graz |
| humboldt-spiker | Humboldt-Spiker | 156 | 1827-1846 | correspSearch |
| humboldt-duvinage | Humboldt-Duvinage | 67 | 1835-1857 | correspSearch |
| schoenbach | Schoenbach-Briefe | 5 | 1888-1911 | ACDH-OEAW |

---

## Detailanalyse

### 0. Uncertainty Test (CorrespExplorer)

URL: `data/test-uncertainty.xml` (lokal)

Datenfelder:
- persName: ja (teils mit VIAF, teils ohne)
- placeName: ja (teils mit GeoNames, teils ohne)
- date: ja (alle Varianten)
- language: teils (2 Briefe mit de, 1 mit fr)
- subjects: ja (1 Brief mit Themen)

Besonderheiten:
- Synthetischer Testdatensatz fuer alle Unsicherheitsfaelle
- 22 Testfaelle fuer systematische Validierung in 4 Sektionen
- Alle Datums-Varianten: exakt, Monat, Jahr, Bereich, notBefore/notAfter, cert="low", fehlend
- Alle Personen-Varianten: identifiziert, [NN], Unbekannt, partial name, ohne Authority, GND statt VIAF
- Alle Orts-Varianten: mit GeoNames, ohne GeoNames, Region, Land, Unbekannt, fehlend
- Organisation als Absender (orgName)
- Kombinierte Unsicherheiten (Case 020)
- Sprach- und Themenfelder (Cases 021-022)

Testfaelle im Detail (4 Sektionen):

Section A - Date Uncertainty (001-007):
1. Vollstaendige Daten (Baseline)
2. Datum nur Jahr-Monat (1900-06)
3. Datum nur Jahr (1900)
4. Datumsbereich from/to
5. Datumsbereich notBefore/notAfter
6. Datum mit cert="low"
7. Kein Datum

Section B - Person Uncertainty (008-013):
8. Unbekannter Absender [NN]
9. Unbekannter Absender "Unbekannt"
10. Teilname "Rozario, [NN] de"
11. Unbekannter Empfaenger "Unknown"
12. Person ohne Authority-Referenz
13. Person mit GND (statt VIAF)

Section C - Place Uncertainty (014-018):
14. Unbekannter Ort "Unbekannt"
15. Region ohne GeoNames (Steiermark)
16. Nur Land (Deutschland)
17. Kein Ort
18. Ort mit GeoNames (Wien)

Section D - Special Cases (019-022):
19. Organisation als Absender
20. Mehrfache Unsicherheiten kombiniert
21. Brief mit Sprachfeld (fr)
22. Brief mit Themenfeldern

Verwendung:
- Validierung der Unsicherheits-Erkennung im Parser
- UI-Tests fuer visuelle Indikatoren
- Dokumentation siehe: uncertainty-concept.md

### 1. Hebel-Briefe (TU Darmstadt)

URL: `https://tueditions.ulb.tu-darmstadt.de/g/pa000018-0077`

Datenfelder:
- persName: ja (mit GND)
- placeName: ja (mit GeoNames)
- date: ja (teils unsicher)
- language: ja (de)
- subjects: nein

Besonderheiten:
- 60% der Briefe ohne Absende-Ort (unknown)
- Datierungsunsicherheit mit `cert="low"`
- Zeitbereiche wie "Sommer 1799?", "Fruehjahr 1811"
- Haeufige Empfaenger: Gustave Fecht (7), Sophie Haufe (8)
- Einziger Datensatz mit Sprachangabe

Testfaelle:
- Sprachfilter sollte sichtbar sein
- Viele Orte ohne Koordinaten
- Timeline mit Luecken

### 2. Rollett-Korrespondenz (Uni Graz)

URL: `https://gams.uni-graz.at/context:rollett/CMI`

Datenfelder:
- persName: ja (mit GND)
- placeName: ja (mit GeoNames)
- date: ja (meist Monat-genau)
- language: nein
- subjects: nein

Besonderheiten:
- Groesster Datensatz (328 Briefe)
- Internationale Wissenschaftler (Waldeyer, Virchow, Sherrington)
- `[NN]` fuer unbekannte Absender
- Familienkorrespondenz (Alexander/Emil Rollett)
- Zeitliche Konzentration 1896-1897

Testfaelle:
- Grosser Datensatz - Performance
- Netzwerk-Visualisierung mit vielen Knoten
- Behandlung von [NN]

### 3. Humboldt-Spiker (correspSearch)

URL: `https://correspsearch.net/storage/avhumboldt/Spiker.xml`

Datenfelder:
- persName: ja (mit GND)
- placeName: ja (mit GeoNames)
- date: ja (teils unsicher)
- language: nein
- subjects: nein

Besonderheiten:
- Wechselnde Absende-Orte (Berlin, Warschau, Paris, Potsdam, Sanssouci)
- Asymmetrische Korrespondenz (meist Humboldt an Spiker)
- Datierungsunsicherheit mit `cert="low"` und `evidence="conjecture"`
- Nur wenige Briefe von Spiker an Humboldt (key 38, 40, 52)

Testfaelle:
- Geografische Verteilung auf Karte
- Datierungsunsicherheit anzeigen
- Asymmetrische Beziehung im Netzwerk

### 4. Humboldt-Duvinage (correspSearch)

URL: `https://correspsearch.net/storage/avhumboldt/Duvinage.xml`

Datenfelder:
- persName: ja (mit GND)
- placeName: ja (mit GeoNames)
- date: teilweise
- language: nein
- subjects: nein

Besonderheiten:
- Franzoesische Datumsnotation ("ce 14 Fevr. 1835", "vendredi")
- Nur Berlin und Potsdam als Orte
- Viele Briefe ohne praezises Datum
- Duplikat bei key="4"

Testfaelle:
- Wenige Orte - Karte mit nur 2 Punkten
- Fehlende Datumsangaben
- Einseitige Korrespondenz (nur Humboldt)

### 5. Schoenbach-Briefe (ACDH-OEAW)

URL: `https://raw.githubusercontent.com/acdh-oeaw/schoenbach/main/cmif_schoenbach.xml`

Datenfelder:
- persName: ja (mit GND)
- placeName: ja (mit GeoNames)
- date: ja (praezise)
- language: nein
- subjects: nein

Besonderheiten:
- Kleinster Datensatz (nur 5 Briefe)
- Gute Verlinkung zu HTML-Editionen
- Sender: Ferdinand von Saar, Marie von Ebner-Eschenbach
- Orte in Boehmen und Steiermark

Testfaelle:
- Minimaler Datensatz
- Alle Views mit wenig Daten
- Externe Links pruefen

---

## Datenabdeckung Matrix

| Feature | Uncertainty | Hebel | Rollett | H-Spiker | H-Duvinage | Schoenbach |
|---------|-------------|-------|---------|----------|------------|------------|
| GND-IDs | teils | ja | ja | ja | ja | ja |
| GeoNames | teils | ja | ja | ja | ja | ja |
| Sprache | teils | ja | nein | nein | nein | nein |
| Themen | nein | nein | nein | nein | nein | nein |
| Exakte Daten | teils | teils | ja | teils | teils | ja |
| Alle Orte bekannt | nein | nein | ja | ja | ja | ja |
| Alle Personen bekannt | nein | ja | nein | ja | ja | ja |

---

## Empfohlene Test-Reihenfolge

1. Uncertainty - Alle Unsicherheitsfaelle, systematische Validierung
2. Schoenbach - Minimal, schnell, alle Features pruefbar
3. Hebel - Einziger mit Sprache, viele fehlende Orte
4. Humboldt-Spiker - Mittlere Groesse, Datierungsunsicherheit
5. Humboldt-Duvinage - Wenige Orte, fehlende Daten
6. Rollett - Gross, Performance-Test, [NN]-Behandlung

---

## Integration in CorrespExplorer

Vorgeschlagene Presets fuer index.html:

```javascript
const DEMO_DATASETS = [
    {
        id: 'uncertainty',
        name: 'Uncertainty Test (1900)',
        url: 'data/test-uncertainty.xml',
        description: '18 Testfaelle fuer Unsicherheits-Visualisierung'
    },
    {
        id: 'hebel',
        name: 'Hebel-Briefe (1791-1826)',
        url: 'https://tueditions.ulb.tu-darmstadt.de/g/pa000018-0077',
        description: '25 Briefe von Johann Peter Hebel'
    },
    {
        id: 'rollett',
        name: 'Rollett-Korrespondenz (1877-1897)',
        url: 'https://gams.uni-graz.at/context:rollett/CMI',
        description: '328 Briefe, internationale Wissenschaftler'
    },
    {
        id: 'humboldt-spiker',
        name: 'Humboldt-Spiker (1827-1846)',
        url: 'https://correspsearch.net/storage/avhumboldt/Spiker.xml',
        description: '156 Briefe von Alexander von Humboldt'
    },
    {
        id: 'humboldt-duvinage',
        name: 'Humboldt-Duvinage (1835-1857)',
        url: 'https://correspsearch.net/storage/avhumboldt/Duvinage.xml',
        description: '67 Briefe an Charles Duvinage'
    },
    {
        id: 'schoenbach',
        name: 'Schoenbach-Briefe (1888-1911)',
        url: 'https://raw.githubusercontent.com/acdh-oeaw/schoenbach/main/cmif_schoenbach.xml',
        description: '5 Briefe, Literaturkorrespondenz'
    }
];
```

---

## Erkenntnisse fuer Entwicklung

### Parser-Verbesserungen

1. `cert="low"` Attribut auswerten und speichern
2. `evidence="conjecture"` erkennen
3. `[NN]` als spezielle Person behandeln
4. `unknown` als Ort ohne Koordinaten markieren
5. Datumsnotationen normalisieren (franzoesisch, deutsch)

### UI-Verbesserungen

1. Unsichere Daten visuell markieren (?, ca., ~)
2. [NN] in Personen-Liste speziell formatieren
3. "Unbekannt" Orte in eigener Kategorie
4. Kleine Datensaetze: Leere-Zustands-Design
5. Grosse Datensaetze: Lazy Loading, Pagination

### Views-Anpassungen

1. Karte: Fallback wenn nur 1-2 Orte
2. Timeline: Luecken visualisieren
3. Netzwerk: Asymmetrische Beziehungen zeigen
4. Personen: [NN] am Ende sortieren
