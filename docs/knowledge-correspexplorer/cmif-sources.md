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

Spezifikation: https://correspsearch.net/index.xql?id=participate_cmi-format

Minimale Struktur eines CMIF:
```xml
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <profileDesc>
      <correspDesc ref="https://example.org/letter/1">
        <correspAction type="sent">
          <persName ref="http://d-nb.info/gnd/123456789">Name</persName>
          <placeName ref="http://sws.geonames.org/123456">Ort</placeName>
          <date when="1850-01-15"/>
        </correspAction>
        <correspAction type="received">
          <persName ref="http://d-nb.info/gnd/987654321">Name</persName>
        </correspAction>
      </correspDesc>
    </profileDesc>
  </teiHeader>
</TEI>
```

Unterstuetzte Authority-URIs:
- GND: `http://d-nb.info/gnd/{id}`
- VIAF: `http://viaf.org/viaf/{id}`
- GeoNames: `http://sws.geonames.org/{id}`
- Lexvo: `http://lexvo.org/id/iso639-3/{code}`
