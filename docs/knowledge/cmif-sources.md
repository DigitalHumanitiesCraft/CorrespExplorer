# Externe CMIF-Quellen

Bekannte Repositories und Quellen fuer CMIF-Dateien, die mit CorrespExplorer geladen werden koennen.

---

## GitHub Repositories

### arthur-schnitzler/schnitzler-cmif

Repository: https://github.com/arthur-schnitzler/schnitzler-cmif

Getestet und funktioniert:
- `1971_Schnitzler_Reinhardt.xml` - 104 Briefe (1902-1921)

Raw-URL Format:
```
https://raw.githubusercontent.com/arthur-schnitzler/schnitzler-cmif/main/{dateiname}.xml
```

Eigenschaften:
- CORS: Erlaubt (GitHub Raw)
- GND-URIs fuer Personen
- Keine GeoNames-URIs (Orte ohne Koordinaten)

---

## correspSearch Aggregator

URL: https://correspsearch.net

Die correspSearch API aggregiert CMIF-Daten aus vielen Quellen.

API-Zugriff:
- Direkte Suche ueber das Suchformular auf index.html
- TEI-JSON Format: `/api/v2.0/tei-json.xql`

Parameter:
| Parameter | Beschreibung | Beispiel |
|-----------|--------------|----------|
| correspondent | Person (GND/VIAF) | `http://d-nb.info/gnd/118540238` |
| placeSender | Absende-Ort | `http://sws.geonames.org/2761369` |
| startdate | Fruehestes Datum | `1800-01-01` |
| enddate | Spaetestes Datum | `1850-12-31` |

Limits:
- Max. 5000 Briefe pro Anfrage (sessionStorage-Limit)
- 10 Briefe pro Seite (automatische Paginierung)

---

## Weitere bekannte Quellen

### Universitaet Graz - Hugo Schuchardt Archiv (HSA)

URL: https://gams.uni-graz.at/context:hsa

- Integriert als vorprozessierter Beispiel-Datensatz
- 11.576 Briefe mit umfangreichen Metadaten
- Subjects, Languages, Mentions vorhanden

### Briefportal Leibniz

URL: https://leibniz-briefportal.de

- CMIF-Export verfuegbar
- GND-URIs fuer Personen

### Weber Gesamtausgabe

URL: https://weber-gesamtausgabe.de

- CMIF-Export verfuegbar
- Korrespondenz von Carl Maria von Weber
- Ca. 9.000+ Briefe

CMIF-URLs:
```
https://weber-gesamtausgabe.de/cmif_v1.xml    (aktuell/empfohlen)
https://weber-gesamtausgabe.de/cmif_v2.xml    (experimentell, CMIF v2 Draft)
```

Eigenschaften:
- GND-IDs fuer Personen vorhanden
- Eines der ersten und umfangreichsten CMIF-Projekte
- CC BY 4.0 Lizenz

---

## Grosse Test-Datensaetze

Diese Datensaetze eignen sich zum Testen mit grossen Datenmengen.

### Edvard Munch Korrespondenz (NorKorr)

Beschreibung: 8.527 Briefe zu und von dem norwegischen Maler Edvard Munch (1863-1944)

CMIF-URL:
```
https://dataverse.no/api/access/datafile/191809
```

Quelle: [Dataverse.no](https://dataverse.no/dataset.xhtml?persistentId=doi:10.18710/TAFUSV)

Eigenschaften:
- Umfangreiche Datumsangaben
- GeoNames-IDs fuer Orte
- Aus dem NorKorr-Projekt (Norwegian Correspondences)
- Basiert auf der digitalen Edition eMunch.no

### correspSearch Storage Repository

Repository: https://github.com/correspSearch/csStorage

Enthält 85+ CMIF-Dateien, die nicht anderswo gehostet werden koennen.

Sammlungen nach Personen:
- avhumboldt (Alexander von Humboldt)
- wvhumboldt (Wilhelm von Humboldt)
- forster (Georg Forster)
- hofmannsthal (Hugo von Hofmannsthal)
- droste-huelshoff (Annette von Droste-Huelshoff)
- lasker-schueler (Else Lasker-Schueler)
- rilke (Rainer Maria Rilke)
- wieland (Christoph Martin Wieland)
- feuerbach (Ludwig Feuerbach)
- helmholtz (Hermann von Helmholtz)

Raw-URL Format:
```
https://raw.githubusercontent.com/correspSearch/csStorage/dev/{ordner}/{datei}.xml
https://raw.githubusercontent.com/correspSearch/csStorage/dev/{datei}.xml
```

Beispiele:
```
https://raw.githubusercontent.com/correspSearch/csStorage/dev/avhumboldt/Spiker.xml
https://raw.githubusercontent.com/correspSearch/csStorage/dev/rilke-kappus.xml
```

---

## Tipps fuer das Laden externer CMIFs

1. GitHub Raw-URLs verwenden:
   - Format: `https://raw.githubusercontent.com/{user}/{repo}/{branch}/{pfad}.xml`
   - CORS ist erlaubt

2. Bei CORS-Fehlern:
   - Datei manuell herunterladen
   - Ueber Drag-and-Drop Upload laden

3. Grosse Dateien (> 5MB):
   - Koennen sessionStorage-Limit ueberschreiten
   - Fehlermeldung zeigt an, wenn Limit erreicht

4. Fehlende Koordinaten:
   - Orte werden trotzdem in Places-View angezeigt
   - Karte zeigt nur Orte mit Koordinaten
   - Link "ohne Geodaten" zeigt Liste der fehlenden

---

## CMIF-Format Referenz

Details zum CMIF-Standard siehe cmif-standard.md.

Spezifikation: https://correspsearch.net/index.xql?id=participate_cmi-format
