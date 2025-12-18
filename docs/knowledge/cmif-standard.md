# CMIF-Standard und Datenmodell

## Correspondence Metadata Interchange Format

CMIF ist ein TEI-basierter Standard der TEI Correspondence SIG fuer den Austausch von Korrespondenz-Metadaten. Die aktuelle Version ist CMIF v1.1.0, eingefuehrt 2015 zusammen mit dem TEI-Element correspDesc (TEI P5 Version 2.8).

Offizielle Dokumentation:
- Spezifikation: https://github.com/TEI-Correspondence-SIG/CMIF
- correspSearch Dokumentation: https://correspsearch.net/en/documentation.html
- Encoding Correspondence: https://encoding-correspondence.bbaw.de/v1/CMIF.html

CMIF v2 (Draft): Erweitert v1 um zusaetzliche Metadaten in correspDesc/note/ref. Rueckwaertskompatibel mit v1.x. CorrespExplorer unterstuetzt bereits CMIF v2 Features.

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

Der teiHeader enthält Metadaten über das Briefverzeichnis selbst. Das profileDesc-Element enthält alle correspDesc-Elemente, die die einzelnen Briefe beschreiben.

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

Jedes correspDesc-Element beschreibt einen Brief mit zwei correspAction-Elementen für Absender und Empfänger. Das optionale note-Element enthält erweiterte Metadaten.

## Attribute

### correspDesc

| Attribut | Beschreibung | Beispiel |
|----------|--------------|----------|
| @ref | URL des Briefs | https://gams.uni-graz.at/o:hsa.letter.654 |
| @key | Brief-Nummer in der Edition | 654 |
| @source | Verweis auf bibl/@xml:id | #uuid |

Das ref-Attribut verlinkt zur Briefedition, key ist eine interne Kennung, source verweist auf die bibliographische Quelle im teiHeader.

### correspAction

| Attribut | Werte | Beschreibung |
|----------|-------|--------------|
| @type | sent, received | Sende- oder Empfangsaktion |

Jeder Brief benötigt mindestens zwei correspAction-Elemente: eines mit type="sent" für den Absender und eines mit type="received" für den Empfänger.

### persName / placeName

| Attribut | Beschreibung | Beispiel |
|----------|--------------|----------|
| @ref | Authority-URL | https://viaf.org/viaf/12345 |

Das ref-Attribut verlinkt zu normierten Identifikatoren in Authority-Systemen wie VIAF oder GND für Personen und GeoNames für Orte.

### date

| Attribut | Beschreibung | Format |
|----------|--------------|--------|
| @when | Exaktes Datum | YYYY-MM-DD, YYYY-MM, YYYY |
| @from | Beginn Zeitraum | YYYY-MM-DD |
| @to | Ende Zeitraum | YYYY-MM-DD |
| @notBefore | Frühestens | YYYY-MM-DD |
| @notAfter | Spätestens | YYYY-MM-DD |

Datumsangaben können präzise (when) oder unsicher sein (from/to für Zeiträume, notBefore/notAfter für ungefähre Datierungen). Die Formate erlauben Präzision auf Tag, Monat oder Jahr.

## Authority-Systeme

### Personen

| System | URL-Muster | Beispiel |
|--------|------------|----------|
| VIAF | viaf.org/viaf/{id} | https://viaf.org/viaf/261931943 |
| GND | d-nb.info/gnd/{id} | https://d-nb.info/gnd/118540238 |
| LC | id.loc.gov/authorities/names/{id} | n79021164 |
| BNF | data.bnf.fr/ark:/12148/{id} | cb11905726z |

VIAF ist der internationale Personen-Identifier, GND wird von der Deutschen Nationalbibliothek gepflegt, LC von der Library of Congress, BNF von der Bibliothèque nationale de France.

### Orte

| System | URL-Muster | Beispiel |
|--------|------------|----------|
| GeoNames | sws.geonames.org/{id} | http://sws.geonames.org/2988507 |

GeoNames ist das primäre System für geografische Identifikation und liefert Koordinaten für die Kartendarstellung.

### Sprachen

| System | URL-Muster | Beispiel |
|--------|------------|----------|
| ISO 639-1 | de, fr, en | de |
| Lexvo | lexvo.org/id/iso639-3/{code} | http://lexvo.org/id/iso639-3/eus |

ISO 639-1 verwendet Zwei-Buchstaben-Codes, Lexvo bietet URIs für alle ISO-639-3-Sprachcodes inklusive historischer und kleiner Sprachen.

## Erweiterte Metadaten (CMIF v2)

CMIF v2 erweitert v1 um zusaetzliche Metadaten im note-Element. Alle Erweiterungen nutzen ref-Elemente mit @type aus dem CMIF v2 Vocabulary (https://lod.academy/cmif/vocab/terms/).

In der Praxis werden die kurzen Typen (ohne cmif: Praefix) verwendet und von den meisten Parsern akzeptiert.

### Entitaeten-Erwaehnungen

hasLanguage - Sprache des Briefs:
```xml
<ref type="hasLanguage" target="de"/>
```
Kann ISO 639-1 Code oder Lexvo-URI sein.

mentionsSubject - Themen im Brief:
```xml
<ref type="mentionsSubject" target="https://example.org/subject/123">Thema</ref>
```
Verweist auf kontrolliertes Vokabular oder Thesaurus.

mentionsPerson - Erwaehnte Personen:
```xml
<ref type="mentionsPerson" target="https://viaf.org/viaf/34446283">Lacombe, Georges</ref>
```
Personen die erwaehnt werden (nicht Sender/Empfaenger). Nutzt Authority-IDs.

mentionsPlace - Erwaehnte Orte:
```xml
<ref type="mentionsPlace" target="http://sws.geonames.org/2988507">Paris</ref>
```
Orte die erwaehnt werden (nicht Absende-/Empfangsort). Nutzt GeoNames-URIs.

mentionsOrg - Erwaehnte Organisationen:
```xml
<ref type="mentionsOrg" target="https://viaf.org/viaf/123456">Akademie der Wissenschaften</ref>
```

mentionsBibl - Erwaehnte Werke:
```xml
<ref type="mentionsBibl" target="https://example.org/work/123">Titel des Werks</ref>
```

### Weitere CMIF v2 Typen (nicht in CorrespExplorer implementiert)

hasTextBase - Textgrundlage (Entwurf, Kopie, etc.):
```xml
<ref type="hasTextBase" target="cmif:Draft"/>
```

isPublishedWith - Publikationstyp:
```xml
<ref type="isPublishedWith" target="cmif:transcription"/>
```

isEditionOf - Verweis auf Archivdokument:
```xml
<ref type="isEditionOf" target="https://archive.org/..."/>
```

## Parsing-Logik

### TEI-Namespace

TEI-XML nutzt den Namespace http://www.tei-c.org/ns/1.0. Beim Parsing müssen alle Elemente mit diesem Namespace abgefragt werden, sonst werden sie nicht gefunden. Die Funktion getElementsByTagNameNS akzeptiert Namespace und Element-Name.

### Datums-Normalisierung

CMIF erlaubt verschiedene Datumsformate. Die Parsing-Logik prüft in dieser Reihenfolge: when für exakte Daten, from für Zeitraum-Beginn, notBefore für frühestmögliches Datum. Aus dem gefundenen Attribut wird das Jahr extrahiert durch substring der ersten vier Zeichen. Falls kein Datum vorhanden, wird null zurückgegeben.

### Authority-ID Extraktion

URLs in ref-Attributen müssen geparst werden, um Typ und ID zu extrahieren. VIAF-URLs enthalten "viaf.org/viaf/" gefolgt von Ziffern. GND-URLs enthalten "d-nb.info/gnd/" gefolgt von Ziffern. GeoNames-URLs enthalten "geonames.org/" gefolgt von Ziffern. Die Extraktion nutzt reguläre Ausdrücke mit Capturing Groups. Falls kein bekanntes Muster gefunden wird, wird die komplette URL als ID mit Typ "unknown" zurückgegeben.

## HSA-Referenz-Beispiel

Das Hugo Schuchardt Archiv zeigt die praktische Anwendung des CMIF-Standards mit umfangreichen Metadaten.

### Statistik

| Metrik | Wert |
|--------|------|
| Briefe | 11.576 |
| Sender | 846 |
| Empfänger | 112 |
| Absende-Orte | 774 |
| Subjects | 1.622 |
| Zeitraum | 1859-1927 |

### Besonderheiten

Das HSA ist ein ego-zentriertes Netzwerk um Hugo Schuchardt mit bidirektionaler Korrespondenz. Briefe wurden sowohl an Schuchardt geschickt als auch von ihm versendet. Das Archiv nutzt das LOD Academy CMIF Vocabulary für Metadaten-Typen. VIAF ist das primäre Authority-System für 96 Prozent der Personen. Die Briefe wurden in 18 verschiedenen Sprachen verfasst.

### Subject-Kategorien

| Kategorie | Anzahl | URI-Muster |
|-----------|--------|------------|
| HSA-Subjects | 1.272 | gams.uni-graz.at/o:hsa.subjects#S.{id} |
| HSA-Languages | 200 | gams.uni-graz.at/o:hsa.languages#L.{id} |
| Lexvo | 148 | lexvo.org/id/iso639-3/{code} |

Das HSA nutzt ein eigenes kontrolliertes Vokabular für Themen und Sprachen. 1.272 Subjects verwenden HSA-eigene URIs. 200 Sprach-Referenzen nutzen HSA-eigene URIs, zusätzlich 148 Referenzen auf Lexvo für standardisierte ISO-Codes.

### Top-Korrespondenten

| Person | Briefe | VIAF |
|--------|--------|------|
| Leo Spitzer | 447 | 46804188 |
| Julio de Urquijo Ybarra | 243 | 18030027 |
| Georges Lacombe | 235 | 34446283 |
| Theodor Gartner | 222 | 59114592 |
| Edward Spencer Dodgson | 181 | 27433725 |

Diese fünf Personen machen 1.328 Briefe aus, was 11,5 Prozent des gesamten Korpus entspricht.

### Top-Absende-Orte

| Ort | Briefe | GeoNames |
|-----|--------|----------|
| Graz | 2.371 | 2778067 |
| Wien | 855 | 2761369 |
| Paris | 781 | 2988507 |
| Leipzig | 247 | 2879139 |
| Berlin | 237 | 2950159 |

Diese fünf Orte machen 4.491 Briefe aus, was 38,8 Prozent des gesamten Korpus entspricht. Graz als Schuchardts Wirkungsort ist mit 20,5 Prozent der mit Abstand häufigste Absende-Ort.

## Ressourcen

- CMIF Spezifikation: https://github.com/TEI-Correspondence-SIG/CMIF
- correspSearch API: https://correspsearch.net/api
- TEI Guidelines correspDesc: https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html
