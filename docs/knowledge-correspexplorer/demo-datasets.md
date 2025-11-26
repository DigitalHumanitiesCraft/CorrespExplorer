# Demo-Datensaetze fuer CorrespExplorer

Dokumentation der analysierten CMIF-Datensaetze zur Verwendung als Beispiele und Testdaten.

---

## Uebersicht

| ID | Name | Briefe | Zeitraum | Quelle |
|----|------|--------|----------|--------|
| hebel | Hebel-Briefe | 25 | 1791-1826 | TU Darmstadt |
| rollett | Rollett-Korrespondenz | 328 | 1877-1897 | Uni Graz |
| humboldt-spiker | Humboldt-Spiker | 156 | 1827-1846 | correspSearch |
| humboldt-duvinage | Humboldt-Duvinage | 67 | 1835-1857 | correspSearch |
| schoenbach | Schoenbach-Briefe | 5 | 1888-1911 | ACDH-OEAW |

---

## Detailanalyse

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

| Feature | Hebel | Rollett | H-Spiker | H-Duvinage | Schoenbach |
|---------|-------|---------|----------|------------|------------|
| GND-IDs | ja | ja | ja | ja | ja |
| GeoNames | ja | ja | ja | ja | ja |
| Sprache | ja | nein | nein | nein | nein |
| Themen | nein | nein | nein | nein | nein |
| Exakte Daten | teils | ja | teils | teils | ja |
| Alle Orte bekannt | nein | ja | ja | ja | ja |
| Alle Personen bekannt | ja | nein | ja | ja | ja |

---

## Empfohlene Test-Reihenfolge

1. Schoenbach - Minimal, schnell, alle Features pruefbar
2. Hebel - Einziger mit Sprache, viele fehlende Orte
3. Humboldt-Spiker - Mittlere Groesse, Datierungsunsicherheit
4. Humboldt-Duvinage - Wenige Orte, fehlende Daten
5. Rollett - Gross, Performance-Test, [NN]-Behandlung

---

## Integration in CorrespExplorer

Vorgeschlagene Presets fuer index.html:

```javascript
const DEMO_DATASETS = [
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
