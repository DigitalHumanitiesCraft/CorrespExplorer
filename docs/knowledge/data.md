---
title: Daten
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2025-11-26
updated: 2026-10-29
authors: [Christopher Pollin]
template:
  name: Vorlage Datengrundlage
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/data
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-data
knowledge-sources:
  standards:
    CMIF: https://github.com/TEI-Correspondence-SIG/CMIF
    TEI correspDesc: https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html
  institutions:
    correspSearch: https://correspsearch.net
    Hugo Schuchardt Archiv: https://gams.uni-graz.at/context:hsa
  vocabularies:
    VIAF: https://viaf.org
    GND: https://d-nb.info/gnd
    GeoNames: https://www.geonames.org
    Lexvo: http://lexvo.org
related: [project, architecture, specification, uncertainty-specification]
---

# Daten

CorrespExplorer verarbeitet Korrespondenz-Metadaten im Correspondence Metadata Interchange Format (CMIF), die Nutzende als Datei oder URL einbringen. Das Repository bündelt dazu einen vorprozessierten Beispieldatensatz aus dem Hugo Schuchardt Archiv, einen synthetischen Tutorial-Datensatz und kleine Testdateien.

## Gegenstand

Das Material beschreibt Briefe über ihre Metadaten, also Absender, Empfänger, Absendeort, Datum und in erweiterten Datensätzen erwähnte Personen, Orte, Themen und die Briefsprache. Brieftexte enthält es nicht, jeder Brief verweist auf seine Edition.

## Quellen

### CMIF als Austauschformat

CMIF ist ein TEI-basiertes Format der TEI Correspondence SIG für den Austausch von Korrespondenz-Metadaten (Spezifikation https://github.com/TEI-Correspondence-SIG/CMIF, Beschreibung bei correspSearch https://correspsearch.net/index.xql?id=participate_cmi-format). Der Webservice correspSearch der Berlin-Brandenburgischen Akademie der Wissenschaften aggregiert CMIF-Dateien vieler Editionen. Das Werkzeug liest jede gültige CMIF-Datei, die Datenqualität hängt von der jeweiligen Edition ab.

### Datensätze im Repository

| Datei | Inhalt | Rolle |
|---|---|---|
| `docs/data/demo-showcase.xml` | Synthetisches Gelehrtennetzwerk 1880–1920 | Tutorial-Datensatz der Startseite mit Onboarding-Tour |
| `docs/data/hsa.xml` | CMIF-Export des Hugo Schuchardt Archivs | Quelle der Vorprozessierung |
| `docs/data/hsa-letters.json` | Vorprozessierter HSA-Datensatz mit Indizes und teiHeader-Metadaten | Erweiterter Beispieldatensatz der Startseite |
| `docs/data/geonames_coordinates.json` | Koordinaten zu GeoNames-IDs | Ergänzung von Orten ohne Koordinaten |
| `docs/data/test-uncertainty.xml` | Synthetische Unsicherheitsfälle | Testdatei, siehe [Testdatensätze](#testdatensätze) |
| `docs/data/test-hostile.xml` | Feindliche Eingaben (Markup, Skript-URLs) | Testdatei der Sicherheits-Suite |
| `docs/data/schoenbach.xml` | Lokale Kopie der Schönbach-Briefe | Kleiner Realdatensatz |

### Hugo Schuchardt Archiv

Das Hugo Schuchardt Archiv (HSA) der Universität Graz (https://gams.uni-graz.at/context:hsa) ist ein ego-zentriertes Netzwerk um den Sprachwissenschaftler Hugo Schuchardt mit Briefen an ihn und von ihm. Es nutzt das LOD Academy CMIF Vocabulary für die erweiterten Metadatentypen und VIAF als vorherrschendes Normdatensystem für Personen. Eigene kontrollierte Vokabulare für Themen und Sprachen ergänzen Lexvo-URIs. Die CMIF-Datei steht unter CC BY 4.0, siehe [Rechte und Lizenzen](#rechte-und-lizenzen).

Kennzahlen der gebündelten Datei, Stand der Vorprozessierung im Dezember 2025:

| Metrik | Wert |
|---|---|
| Briefe | 11.576 |
| Absender | 846 |
| Empfänger | 112 |
| Absendeorte | 774 |
| Subjects | 1.622 |
| Sprachen | 18 |
| Zeitraum | 1859–1927 |

| Subject-Kategorie | Anzahl | URI-Muster |
|---|---|---|
| HSA-Subjects | 1.272 | `gams.uni-graz.at/o:hsa.subjects#S.{id}` |
| HSA-Languages | 200 | `gams.uni-graz.at/o:hsa.languages#L.{id}` |
| Lexvo | 148 | `lexvo.org/id/iso639-3/{code}` |

Die häufigsten Korrespondenten sind Leo Spitzer (447 Briefe, VIAF 46804188), Julio de Urquijo Ybarra (243, VIAF 18030027), Georges Lacombe (235, VIAF 34446283), Theodor Gartner (222, VIAF 59114592) und Edward Spencer Dodgson (181, VIAF 27433725). Die häufigsten Absendeorte sind Graz (2.371, GeoNames 2778067), Wien (855, 2761369), Paris (781, 2988507), Leipzig (247, 2879139) und Berlin (237, 2950159). Graz als Schuchardts Wirkungsort stellt rund ein Fünftel aller Briefe.

### Externe CMIF-Quellen

Diese Quellen wurden beim Aufbau des Werkzeugs als ladbar erfasst. Ob eine URL weiterhin antwortet, ist beim Laden zu prüfen.

| Quelle | URL | Eigenschaften |
|---|---|---|
| Schnitzler-CMIF (GitHub) | https://github.com/arthur-schnitzler/schnitzler-cmif, Raw-Muster `https://raw.githubusercontent.com/arthur-schnitzler/schnitzler-cmif/main/{dateiname}.xml` | Getestet mit `1971_Schnitzler_Reinhardt.xml` (104 Briefe, 1902–1921), GND für Personen, Orte ohne GeoNames |
| correspSearch Storage (GitHub) | https://github.com/correspSearch/csStorage, Raw-Muster `https://raw.githubusercontent.com/correspSearch/csStorage/dev/{ordner}/{datei}.xml` | CMIF-Dateien ohne eigenes Hosting, etwa avhumboldt, wvhumboldt, forster, hofmannsthal, droste-huelshoff, lasker-schueler, rilke, wieland, feuerbach, helmholtz. Beispiele `.../dev/avhumboldt/Spiker.xml`, `.../dev/rilke-kappus.xml` |
| correspSearch API v2.0 | https://correspsearch.net/api/v2.0/tei-json.xql | Parameter `correspondent` (GND/VIAF-URI), `placeSender` (GeoNames-URI), `startdate`, `enddate`. Der Ladepfad im Werkzeug ist defekt, siehe [plan.md](plan.md#offene-befunde) |
| Leibniz-Briefportal | https://leibniz-briefportal.de | CMIF-Export, GND für Personen |
| Carl-Maria-von-Weber-Gesamtausgabe | https://weber-gesamtausgabe.de/cmif_v1.xml (empfohlen), `cmif_v2.xml` (CMIF-v2-Entwurf) | Umfangreicher Bestand, GND für Personen, CC BY 4.0 |
| Edvard-Munch-Korrespondenz (NorKorr) | https://dataverse.no/api/access/datafile/191809, Datensatz https://dataverse.no/dataset.xhtml?persistentId=doi:10.18710/TAFUSV | Großer Datensatz aus der Edition eMunch.no, GeoNames für Orte, geeignet für Lasttests |

## Rechte und Lizenzen

Code steht unter MIT (`LICENSE`), Dokumentation und Wissensdokumente unter CC BY 4.0 (`README.md`). Forschungsdaten Dritter sind davon ausgenommen und behalten die Lizenz, die ihre Herausgeber angeben. Maßgeblich ist die Angabe in `publicationStmt/availability/licence` der jeweiligen CMIF-Datei. Stand der Prüfung 2026-10-29.

| Datei | Herkunft | Lizenzangabe | Beleg |
|---|---|---|---|
| `docs/data/hsa.xml`, identisch `data/hsa/CMIF.xml` | CMIF-Export des Hugo Schuchardt Archivs, Publisher Zentrum für Informationsmodellierung der Universität Graz, Stand 2025-01-28 | CC BY 4.0 | `licence target="https://creativecommons.org/licenses/by/4.0/"` im teiHeader, Quelle https://gams.uni-graz.at/context:hsa/CMIF |
| `docs/data/hsa-letters.json` | Mit `build_hsa_data.py` aus `data/hsa/CMIF.xml` abgeleitet | CC BY 4.0 der Quelle | `meta.teiHeader` übernimmt Publisher, Herausgabe, Lizenztext, Lizenz-URL und Bibliographie, die Übersicht zeigt den Lizenzlink |
| `docs/data/schoenbach.xml` | Lokale Kopie des CMIF der Edition „Fünf Briefe aus dem Nachlass von Anton Emanuel Schönbach“ am ACDH-OEAW | CC0 | `licence target="https://creativecommons.org/publicdomain/zero/1.0/"` im teiHeader |
| `docs/data/demo-showcase.xml`, `docs/data/test-uncertainty.xml` | Synthetisch, im Projekt erstellt | CC BY 4.0 | teiHeader der Dateien |
| `docs/data/test-hostile.xml` | Synthetisch, im Projekt erstellt | keine gültige Angabe, das `licence`-Element ist absichtlich feindliche Eingabe | teiHeader |
| `data/geonames_coordinates.json` | Ausgabe von `resolve_geonames_wikidata.py`, Koordinaten (P625) aus Wikidata, per SPARQL über die GeoNames-ID (P1566) abgefragt | Wikidata-Daten stehen unter CC0 | `meta.source` der Datei |
| `docs/data/geonames_coordinates.json` | Kleinere, abweichende Koordinatentabelle, von `upload.js` geladen | keine | Herkunft nicht dokumentiert, eingeführt mit Commit `e1a13cf` |

Externe Quellen, die Nutzende zur Laufzeit laden, sind nicht im Repository gebündelt. Ihre Lizenz steht im teiHeader der geladenen Datei, die Übersicht zeigt sie an. Die correspSearch-API gibt ihre Ergebnisse laut API-Dokumentation (https://correspsearch.net/en/api.html, abgerufen 2026-10-29) unter CC BY 4.0 aus, die zu nennenden Datengeber stehen in `teiHeader//respStmt`.

Offen sind drei Punkte.

- CC BY 4.0 verlangt neben der Namensnennung einen Hinweis auf Änderungen. `hsa-letters.json` trägt mit `meta.generated` und `meta.source_file` nur implizit die Information, dass es sich um eine vorprozessierte Ableitung handelt, ein ausdrücklicher Änderungshinweis fehlt in Datei und Oberfläche. Ob die bisherige Anzeige genügt, entscheidet der Operator als Lizenznehmer, das datengebende Archiv muss dafür nicht gefragt werden.
- Herkunft und damit Rechtsgrundlage von `docs/data/geonames_coordinates.json` sind nicht belegt. Die Klärung liegt beim Operator, weil die Datei im Projekt entstanden ist.
- `test-hostile.xml` trägt als Eigenproduktion keine gültige Lizenzangabe. Ob für synthetische Testdateien die Dokumentationslizenz CC BY 4.0 gilt, legt der Operator fest.

## Modell

### CMIF-Struktur

Der `teiHeader` beschreibt das Briefverzeichnis selbst (`titleStmt` mit Titel und Editor, `publicationStmt` mit Publisher, Lizenz, Datum und `idno type="URL"`, `sourceDesc/bibl` mit bibliographischer Angabe). `profileDesc` enthält je Brief ein `correspDesc`.

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

| Element und Attribut | Bedeutung |
|---|---|
| `correspDesc/@ref` | URL des Briefs in der Edition, etwa `https://gams.uni-graz.at/o:hsa.letter.654` |
| `correspDesc/@key` | Briefnummer in der Edition |
| `correspDesc/@source` | Verweis auf `bibl/@xml:id` im teiHeader |
| `correspAction/@type` | `sent` oder `received`, ein Brief führt mindestens je eine Aktion |
| `persName/@ref`, `placeName/@ref` | Normdaten-URI der Person oder des Orts |
| `date/@when` | Datum mit Tag-, Monats- oder Jahrespräzision (`YYYY-MM-DD`, `YYYY-MM`, `YYYY`) |
| `date/@from`, `date/@to` | Zeitraum |
| `date/@notBefore`, `date/@notAfter` | Terminus post und ante quem |
| `note/ref[@type="hasLanguage"]` | Briefsprache als ISO-Code oder Lexvo-URI |
| `note/ref[@type="mentionsSubject"]` | Thema, `@target` verweist auf ein kontrolliertes Vokabular, der Textinhalt ist die Bezeichnung |
| `note/ref[@type="mentionsPerson"]` | Erwähnte Person außerhalb von Absender und Empfänger |
| `note/ref[@type="mentionsPlace"]` | Erwähnter Ort außerhalb der Absende- und Empfangsorte |

Unsicherheitsangaben (`cert`, `[NN]`, Regionen statt Orte) beschreibt [uncertainty-specification.md](uncertainty-specification.md).

### Internes Datenmodell

Der Parser erzeugt Briefe als Hauptentitäten und Indizes für Personen, Orte, Sprachen und Themen, beschrieben in [architecture.md](architecture.md#datenmodell). Drei Eigenheiten der Parser-Ausgabe führten bei der Implementierung der Forschungspfade zu falschen Annahmen und sind deshalb festgehalten.

- Personen tragen `letter_count` als Summe aus `as_sender` und `as_recipient`. Ein Feld `letters_sent` gibt es nicht.
- Themen tragen ihre Bezeichnung in `label`. Code, der `name` erwartet, greift auf `s.label || s.name` zurück.
- CMIF speichert Sprachen oft als URI (`http://lexvo.org/id/iso639-3/deu`). `LANGUAGE_LABELS` in `constants.js` bildet sie auf lesbare Bezeichnungen ab.

## Normdaten und Anschlüsse

Normdaten-URIs sind der primäre Schlüssel für Abgleich und Aggregation, Anzeigenamen dienen nur der Darstellung, weil Editionen denselben Namen verschieden schreiben (Entscheidung in [specification.md](specification.md#adr-001-normdaten-uris-als-primärer-schlüssel)).

| Entität | System | URL-Muster |
|---|---|---|
| Person | VIAF | `viaf.org/viaf/{id}` |
| Person | GND der Deutschen Nationalbibliothek | `d-nb.info/gnd/{id}` |
| Person | Library of Congress | `id.loc.gov/authorities/names/{id}` |
| Person | Bibliothèque nationale de France | `data.bnf.fr/ark:/12148/{id}` |
| Ort | GeoNames | `sws.geonames.org/{id}` |
| Sprache | ISO 639-1 | `de`, `fr`, `en` |
| Sprache | Lexvo | `lexvo.org/id/iso639-3/{code}` |

GeoNames liefert die Koordinaten für die Karte. Fehlen sie, löst `resolve_geonames_wikidata.py` in der Vorprozessierung und die Wikidata-Anreicherung im Browser Koordinaten auf. Für Personen mit VIAF- oder GND-URI holt die Wikidata-Anreicherung Porträts, Lebensdaten und Berufe.

## Verzerrungen

- Normdatenabdeckung: Personen und Orte ohne URI lassen sich nur über den Namen zusammenführen. Varianten derselben Person erscheinen dann getrennt.
- Ego-zentrierte Bestände: Ein Nachlass wie das HSA zeigt das Netzwerk aus der Perspektive einer Person. Beziehungen zwischen anderen Korrespondenten fehlen strukturell.
- Datierung: Unvollständige Daten werden einem Jahr zugeordnet, undatierte Briefe stehen außerhalb der Zeitachse (siehe [design.md](design.md#visualisierungslogik)).

## Workflow

### Parsing im Browser

`cmif-parser.js` parst hochgeladene oder per URL geladene Dateien mit `DOMParser`. Alle Elemente werden über den TEI-Namespace `http://www.tei-c.org/ns/1.0` mit `getElementsByTagNameNS` abgefragt, sonst bleiben sie unsichtbar. Für das Jahr prüft der Parser `when`, dann `from`, dann `notBefore` und nimmt die ersten vier Zeichen, ohne Datum ergibt sich `null`. `parseAuthorityRef()` erkennt VIAF, GND, LC, BNF, GeoNames und Lexvo per regulärem Ausdruck mit Capturing Group und gibt unbekannte URLs vollständig mit Typ `unknown` zurück. Jahre unter 1400 oder über 2100 werden in der Ansicht verworfen, weil Erfassungs- oder Parsingfehler wie 0 oder 20250 die Zeitachse sonst sprengen (`explore.js`).

### Vorprozessierung erweiterter Datensätze

Erweiterte Datensätze wie das HSA werden in Python vorprozessiert (`preprocessing/build_hsa_data.py`), weil Größe und Quelle das Laden im Browser ausschließen. Der Ablauf steht in [architecture.md](architecture.md#datenfluss).

### Laden externer CMIF-Dateien

- GitHub-Raw-URLs (`https://raw.githubusercontent.com/{user}/{repo}/{branch}/{pfad}.xml`) erlauben CORS.
- Bei einem CORS-Fehler die Datei herunterladen und per Drag-and-Drop hochladen.
- Dateien über etwa 5 MB können das sessionStorage-Limit überschreiten, die Fehlermeldung nennt dann die Größe.
- Orte ohne Koordinaten erscheinen in der Ortsansicht, aber nicht auf der Karte. Der Link „ohne Geodaten“ listet sie.

## Testdatensätze

Die Tests laden ausschließlich die lokalen Dateien `test-uncertainty.xml` und `test-hostile.xml` über `parseCMIF` ([testing.md](testing.md)). Die übrigen Datensätze dienten der manuellen Prüfung beim Aufbau.

| ID | Name | Briefe | Zeitraum | Quelle |
|---|---|---|---|---|
| uncertainty | Uncertainty Test | 22 | 1900 | CorrespExplorer, `docs/data/test-uncertainty.xml` |
| hebel | Hebel-Briefe | 25 | 1791–1826 | TU Darmstadt, https://tueditions.ulb.tu-darmstadt.de/g/pa000018-0077 |
| rollett | Rollett-Korrespondenz | 328 | 1877–1897 | Universität Graz, https://gams.uni-graz.at/context:rollett/CMI |
| humboldt-spiker | Humboldt-Spiker | 156 | 1827–1846 | correspSearch, https://correspsearch.net/storage/avhumboldt/Spiker.xml |
| humboldt-duvinage | Humboldt-Duvinage | 67 | 1835–1857 | correspSearch, https://correspsearch.net/storage/avhumboldt/Duvinage.xml |
| schoenbach | Schönbach-Briefe | 5 | 1888–1911 | ACDH-OEAW, https://raw.githubusercontent.com/acdh-oeaw/schoenbach/main/cmif_schoenbach.xml |

### Datenabdeckung

| Merkmal | Uncertainty | Hebel | Rollett | H-Spiker | H-Duvinage | Schönbach |
|---|---|---|---|---|---|---|
| GND-IDs | teils | ja | ja | ja | ja | ja |
| GeoNames | teils | ja | ja | ja | ja | ja |
| Sprache | teils | ja | nein | nein | nein | nein |
| Themen | nein | nein | nein | nein | nein | nein |
| Exakte Daten | teils | teils | ja | teils | teils | ja |
| Alle Orte bekannt | nein | nein | ja | ja | ja | ja |
| Alle Personen bekannt | nein | ja | nein | ja | ja | ja |

### Eigenheiten je Datensatz

- Uncertainty Test: synthetisch, 22 Fälle in vier Sektionen (Datum 001–007, Person 008–013, Ort 014–018, Sonderfälle 019–022), darunter `cert="low"`, `[NN]`, Teilnamen, Personen ohne Normdaten und mit GND statt VIAF, Regionen, Organisation als Absender, kombinierte Unsicherheiten, Sprach- und Themenfelder. Die Fallliste führt [uncertainty-specification.md](uncertainty-specification.md#test-cases).
- Hebel: ein großer Teil der Briefe ohne Absendeort, `cert="low"` und Zeitbereiche wie „Sommer 1799?“, einziger externer Datensatz mit Sprachangabe.
- Rollett: größter der externen Testdatensätze, internationale Wissenschaftlerkorrespondenz, `[NN]` für unbekannte Absender, Konzentration auf 1896–1897.
- Humboldt-Spiker: wechselnde Absendeorte, asymmetrische Korrespondenz, `cert="low"` mit `evidence="conjecture"`.
- Humboldt-Duvinage: französische Datumsnotation, nur Berlin und Potsdam als Orte, Duplikat bei `key="4"`, viele Briefe ohne präzises Datum.
- Schönbach: minimal, gute Verlinkung zu HTML-Editionen, Orte in Böhmen und der Steiermark.

### Prüfreihenfolge

1. Uncertainty, alle Unsicherheitsfälle systematisch
2. Schönbach, minimal und schnell, alle Ansichten mit wenig Daten
3. Hebel, Sprachfilter und viele fehlende Orte
4. Humboldt-Spiker, mittlere Größe und Datierungsunsicherheit
5. Humboldt-Duvinage, wenige Orte und fehlende Daten
6. Rollett, Netzwerk mit vielen Knoten und `[NN]`-Behandlung
