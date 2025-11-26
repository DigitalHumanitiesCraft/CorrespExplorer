# CMIF-Standard und Datenmodell

## Correspondence Metadata Interchange Format

CMIF ist ein TEI-basierter Standard der TEI Correspondence SIG fuer den Austausch von Korrespondenz-Metadaten.

Dokumentation: https://github.com/TEI-Correspondence-SIG/CMIF

## Kernstruktur

```xml
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Titel des Briefverzeichnisses</title>
        <editor>Ansprechpartner</editor>
      </titleStmt>
      <publicationStmt>
        <publisher>Herausgeber</publisher>
        <availability>
          <licence target="https://creativecommons.org/licenses/by/4.0/">
            CC-BY 4.0
          </licence>
        </availability>
        <date when="2024-01-01"/>
        <idno type="URL">https://example.org/cmif.xml</idno>
      </publicationStmt>
      <sourceDesc>
        <bibl xml:id="uuid" type="online">Bibliographische Angabe</bibl>
      </sourceDesc>
    </fileDesc>
    <profileDesc>
      <!-- correspDesc-Elemente hier -->
    </profileDesc>
  </teiHeader>
</TEI>
```

## Brief-Element (correspDesc)

```xml
<correspDesc ref="https://example.org/letter/123" source="#uuid" key="123">
  <correspAction type="sent">
    <persName ref="https://viaf.org/viaf/12345">Max Mustermann</persName>
    <placeName ref="http://sws.geonames.org/2988507">Paris</placeName>
    <date when="1900-01-15"/>
  </correspAction>
  <correspAction type="received">
    <persName ref="https://viaf.org/viaf/67890">Erika Musterfrau</persName>
  </correspAction>
  <note>
    <ref type="hasLanguage" target="de"/>
    <ref type="mentionsSubject" target="https://example.org/subject/123">Thema</ref>
    <ref type="mentionsPerson" target="https://viaf.org/viaf/11111">Person</ref>
    <ref type="mentionsPlace" target="http://sws.geonames.org/2950159">Berlin</ref>
  </note>
</correspDesc>
```

## Attribute

### correspDesc

| Attribut | Beschreibung | Beispiel |
|----------|--------------|----------|
| @ref | URL des Briefs | https://gams.uni-graz.at/o:hsa.letter.654 |
| @key | Brief-Nummer in der Edition | 654 |
| @source | Verweis auf bibl/@xml:id | #uuid |

### correspAction

| Attribut | Werte | Beschreibung |
|----------|-------|--------------|
| @type | sent, received | Sende- oder Empfangsaktion |

### persName / placeName

| Attribut | Beschreibung | Beispiel |
|----------|--------------|----------|
| @ref | Authority-URL | https://viaf.org/viaf/12345 |

### date

| Attribut | Beschreibung | Format |
|----------|--------------|--------|
| @when | Exaktes Datum | YYYY-MM-DD, YYYY-MM, YYYY |
| @from | Beginn Zeitraum | YYYY-MM-DD |
| @to | Ende Zeitraum | YYYY-MM-DD |
| @notBefore | Fruehestens | YYYY-MM-DD |
| @notAfter | Spaetestens | YYYY-MM-DD |

## Authority-Systeme

### Personen

| System | URL-Muster | Beispiel |
|--------|------------|----------|
| VIAF | viaf.org/viaf/{id} | https://viaf.org/viaf/261931943 |
| GND | d-nb.info/gnd/{id} | https://d-nb.info/gnd/118540238 |
| LC | id.loc.gov/authorities/names/{id} | n79021164 |
| BNF | data.bnf.fr/ark:/12148/{id} | cb11905726z |

### Orte

| System | URL-Muster | Beispiel |
|--------|------------|----------|
| GeoNames | sws.geonames.org/{id} | http://sws.geonames.org/2988507 |

### Sprachen

| System | URL-Muster | Beispiel |
|--------|------------|----------|
| ISO 639-1 | de, fr, en | de |
| Lexvo | lexvo.org/id/iso639-3/{code} | http://lexvo.org/id/iso639-3/eus |

## Erweiterte Metadaten (note)

Einige CMIF-Dateien enthalten erweiterte Metadaten im note-Element:

### hasLanguage

Briefsprache (in welcher Sprache der Brief geschrieben ist):
```xml
<ref type="hasLanguage" target="de"/>
```

### mentionsSubject

Themen, die im Brief behandelt werden:
```xml
<ref type="mentionsSubject" target="https://gams.uni-graz.at/o:hsa.subjects#S.4567">
  Cercle d'Etudes Euskariennes
</ref>
```

### mentionsPerson

Personen, die im Brief erwaehnt werden:
```xml
<ref type="mentionsPerson" target="https://viaf.org/viaf/34446283">
  Lacombe, Georges
</ref>
```

### mentionsPlace

Orte, die im Brief erwaehnt werden (nicht Absende-/Empfangsort):
```xml
<ref type="mentionsPlace" target="http://sws.geonames.org/2988507">
  Paris
</ref>
```

## HSA-Beispiel (Hugo Schuchardt Archiv)

### Statistik

| Metrik | Wert |
|--------|------|
| Briefe | 11.576 |
| Sender | 846 |
| Empfaenger | 112 |
| Absende-Orte | 774 |
| Subjects | 1.622 |
| Zeitraum | 1859-1927 |

### Besonderheiten

1. Ego-zentriertes Netzwerk um Hugo Schuchardt
2. Bidirektionale Korrespondenz (Briefe an und von Schuchardt)
3. LOD Academy CMIF Vocabulary fuer Metadaten-Typen
4. VIAF als primaeres Authority-System (96%)
5. 18 verschiedene Briefsprachen

### Subject-Kategorien

| Kategorie | Anzahl | URI-Muster |
|-----------|--------|------------|
| HSA-Subjects | 1.272 | gams.uni-graz.at/o:hsa.subjects#S.{id} |
| HSA-Languages | 200 | gams.uni-graz.at/o:hsa.languages#L.{id} |
| Lexvo | 148 | lexvo.org/id/iso639-3/{code} |

### Top-Korrespondenten

| Person | Briefe | VIAF |
|--------|--------|------|
| Leo Spitzer | 447 | 46804188 |
| Julio de Urquijo Ybarra | 243 | 18030027 |
| Georges Lacombe | 235 | 34446283 |
| Theodor Gartner | 222 | 59114592 |
| Edward Spencer Dodgson | 181 | 27433725 |

### Top-Absende-Orte

| Ort | Briefe | GeoNames |
|-----|--------|----------|
| Graz | 2.371 | 2778067 |
| Wien | 855 | 2761369 |
| Paris | 781 | 2988507 |
| Leipzig | 247 | 2879139 |
| Berlin | 237 | 2950159 |

## Parsing-Hinweise

### Namespace

TEI-Namespace beachten:
```javascript
const TEI_NS = 'http://www.tei-c.org/ns/1.0';
doc.getElementsByTagNameNS(TEI_NS, 'correspDesc');
```

### Datums-Normalisierung

Verschiedene Datumsformate zu Jahr extrahieren:
```javascript
function extractYear(dateElement) {
  const when = dateElement.getAttribute('when');
  const from = dateElement.getAttribute('from');
  const notBefore = dateElement.getAttribute('notBefore');

  const dateStr = when || from || notBefore;
  if (dateStr) return parseInt(dateStr.substring(0, 4));
  return null;
}
```

### Authority-ID Extraktion

```javascript
function extractAuthorityId(url) {
  if (!url) return null;

  // VIAF: https://viaf.org/viaf/12345
  const viafMatch = url.match(/viaf\.org\/viaf\/(\d+)/);
  if (viafMatch) return { type: 'viaf', id: viafMatch[1] };

  // GND: https://d-nb.info/gnd/118540238
  const gndMatch = url.match(/d-nb\.info\/gnd\/(\d+)/);
  if (gndMatch) return { type: 'gnd', id: gndMatch[1] };

  // GeoNames: http://sws.geonames.org/2988507
  const geoMatch = url.match(/geonames\.org\/(\d+)/);
  if (geoMatch) return { type: 'geonames', id: geoMatch[1] };

  return { type: 'unknown', id: url };
}
```

## Ressourcen

- CMIF Spezifikation: https://github.com/TEI-Correspondence-SIG/CMIF
- correspSearch API: https://correspsearch.net/api
- TEI Guidelines correspDesc: https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html
