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
updated: 2026-11-15
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

CorrespExplorer liest Briefmetadaten im Correspondence Metadata Interchange Format (CMIF) und in TEI-Briefsätzen mit `correspDesc`, als Datei, als Dateiliste oder über eine Adresse. Dieses Dokument beschreibt, was das Werkzeug liest und was es dabei verwirft, was die Datensätze enthalten, mit denen es entwickelt wird, und wie sich das gemeinsame Brief- und Aussagemodell des Projekts GOSSIP dazu verhält. Was die Ansichten aus den Daten machen, steht in [specification.md](specification.md), die Behandlung unsicherer Angaben in [uncertainty-specification.md](uncertainty-specification.md).

## Gegenstand

Das Material beschreibt Briefe über ihre Metadaten, also Absender, Empfänger, Absendeort, Datum und in erweiterten Datensätzen erwähnte Personen, Orte, Themen und die Briefsprache. TEI-Briefsätze nennen dazu Poststempel, Anschrift, Signatur und erschlossene Angaben. Brieftexte enthält das Material nicht, jeder Brief verweist, wo die Quelle es angibt, auf seine Edition.

## Quellen

### CMIF als Austauschformat

CMIF ist ein TEI-basiertes Format der TEI Correspondence SIG für den Austausch von Korrespondenz-Metadaten (Spezifikation https://github.com/TEI-Correspondence-SIG/CMIF, Beschreibung bei correspSearch https://correspsearch.net/index.xql?id=participate_cmi-format). Der Webservice correspSearch der Berlin-Brandenburgischen Akademie der Wissenschaften aggregiert CMIF-Dateien vieler Editionen. Das Werkzeug liest jede gültige CMIF-Datei, die Datenqualität hängt von der jeweiligen Edition ab.

### Datensätze im Repository

| Datei | Inhalt | Rolle |
|---|---|---|
| `docs/data/demo-showcase.xml` | Synthetisches Gelehrtennetzwerk 1880–1920 mit allen Erwähnungstypen des CMIF-v2-Entwurfs (Themen, Personen, Orte, Organisationen, Werke) und Sprachangaben | Testdatei. Sie war der Datensatz des Tutorials, das die Startseite seit `d38b4c8` nicht mehr anbietet und das Refactoring vom 2026-11-15 mit der Tour ganz entfernt hat. Keine Seite lädt sie mehr, sie dient der Suite Demo und der Smoke-Prüfung des Datei-Uploads |
| `docs/data/hsa.xml` | CMIF-Export des Hugo Schuchardt Archivs, byte-gleich mit `data/hsa/CMIF.xml` (geprüft mit `cmp` am 2026-10-29) | Ausgelieferte Kopie der CMIF-Datei. Keine Seite und kein Test lädt sie. `verification/task_set.py` zählt in ihr die Antwort der Aufgaben zu US-01 und US-02, `resolve_geonames_wikidata.py` überspringt sie beim Namen. Die Vorprozessierung liest `data/hsa/CMIF.xml` |
| `docs/data/hsa-letters.json` | Vorprozessierter HSA-Datensatz mit Indizes, teiHeader-Metadaten und Änderungsvermerk `meta.modifications` | Referenzdatensatz der Entwicklung und der festen Aufgaben ([specification.md](specification.md)) |
| `docs/data/examples.json` | Zusammenfassung des HSA für die Startfigur, erzeugt aus `hsa-letters.json` ([Erzeugte Daten](#erzeugte-daten)) | Startseite für das Archiv |
| `docs/data/geonames_coordinates.json` | Koordinaten zu GeoNames-IDs aus Wikidata, für Genf aus GeoNames ([Herkunft](#herkunft-von-docsdatageonames_coordinatesjson)) | Ergänzung von Orten ohne Koordinaten beim Laden |
| `docs/data/schoenbach.xml` | Lokale Kopie der Schönbach-Briefe | Kleiner Realdatensatz, auf den keine Seite und kein Test verweist ([plan.md](plan.md#aufräumen)) |
| `docs/data/test-uncertainty.xml` | Synthetische Unsicherheitsfälle | Testdatei, Fallliste in [uncertainty-specification.md](uncertainty-specification.md#test-cases) |
| `docs/data/test-hostile.xml` | Feindliche Eingaben (Markup, Skript-URLs, Tabellenformeln) | Testdatei der Suites Security und Basket |
| `docs/data/test-correspsearch.json`, `docs/data/test-correspsearch-empty.json` | Antworten der correspSearch-API v2.0 vom 2026-11-05 auf `d=1890-01-01&x=1` und `d=1066-01-01&x=1`, unverändert gespeichert | Testdateien der Suite correspSearch |
| `docs/data/test-letter-records.xml`, `-b.xml`, `-c.xml` | Synthetische Briefsätze in TEI (`biblFull` je Brief): Poststempel, erschlossener Ort und erschlossenes Datum, Datum nur als Text, mehrere Empfänger, interner Personenverweis, Anschrift und Signatur, eine zweite Datei derselben erfundenen Edition und die Fälle der Datenprüfung vom 2026-11-14 (Person und Körperschaft als Absender, Ortswortlaut, gelesenes neben ergänztem Datum, Sprache aus `textLang`) | Testdateien der Suite CMIF Parser, im Projekt erstellt |
| `docs/data/test-parser-cases.xml` | Synthetische Fälle der Parserprüfung vom 2026-11-15: ergänzter Datumswortlaut neben gelesenem Datum, eine Signatur mit einer Jahrhundertverschiebung, Werte, die beim Zusammenführen ergänzt werden, zwei Absendeorte, Ort und Datum in einer Anschrift, mehrere Anschriften, Verweise ohne Normdatum, Notiz in einer Handlung, Platzhalter und Uhrzeit | Testdateien der Suite CMIF Parser, im Projekt erstellt |
| `docs/data/test-graz-cases.xml`, `test-parallel-a.xml`, `test-parallel-b.xml` | Vier Fälle aus Grazer Editionen. `test-graz-cases.xml` bildet sie mit erfundenen Einträgen nach (Weiterleitung als dritte Handlung, Person mit Registerkennung ohne Normdatum, Datum nur als obere Grenze, „ohne Ort“). Die beiden anderen Dateien enthalten denselben Brief von Boltzmann an Brentano, unverändert aus dem CMIF beider Bestände | Testdateien der Suite CMIF Parser, Herkunft und Lizenz im Kopf jeder Datei und unter [Rechte und Lizenzen](#rechte-und-lizenzen) |

### Hugo Schuchardt Archiv

Das Hugo Schuchardt Archiv (HSA) der Universität Graz (https://gams.uni-graz.at/context:hsa) ist ein ego-zentriertes Netzwerk um den Sprachwissenschaftler Hugo Schuchardt mit Briefen an ihn und von ihm. Es nutzt das LOD Academy CMIF Vocabulary für die erweiterten Metadatentypen und VIAF als vorherrschendes Normdatensystem für Personen. Eigene kontrollierte Vokabulare für Themen und Sprachen ergänzen Lexvo-URIs. Die CMIF-Datei steht unter CC BY 4.0. Es ist der Datensatz, an dem das Werkzeug entwickelt und geprüft wird, weil er als einziger gebündelter Realdatensatz Themen, Erwähnungen, Sprachen und Koordinaten zugleich enthält.

Kennzahlen der gebündelten Datei aus `meta` von `hsa-letters.json`, Stand der Vorprozessierung vom 2026-10-29 (`meta.generated`):

| Metrik | Wert |
|---|---|
| Briefe | 11.576 |
| Absender mit Normdaten-ID (`unique_senders`) | 846 |
| Empfänger mit Normdaten-ID (`unique_recipients`) | 112 |
| Absendeorte mit GeoNames-ID (`unique_places`) | 774 |
| Subjects | 1.622 |
| Sprachen | 18 |
| Zeitraum | 1859–1927 |

| Subject-Kategorie | Anzahl | URI-Muster |
|---|---|---|
| HSA-Subjects | 1.272 | `gams.uni-graz.at/o:hsa.subjects#S.{id}` |
| HSA-Languages | 200 | `gams.uni-graz.at/o:hsa.languages#L.{id}` |
| Lexvo | 148 | `lexvo.org/id/iso639-3/{code}` |

Die Zählungen in `meta` und `indices` erfassen nur Personen mit Normdaten-ID und Orte mit GeoNames-ID. Die Oberfläche zählt aus den Briefen (`summarizeCorpus()` in `research-paths.js`): Personen über `personKey` als Absender oder Empfänger, Orte über `placeKey` ohne Platzhalter für unbekannte Orte (`isKnownPlace()` in `utils.js`). Für das HSA ergibt das 1.031 Personen (852 mit Normdaten-ID, 179 nur mit Namen) und 774 Absendeorte. Der Platzhalter „Unbekannt“ ohne GeoNames-ID bei 576 Briefen zählt nicht als Ort. Gezählt aus `docs/data/hsa-letters.json` am 2026-10-29 und am 2026-11-14 mit einem eigenen Skript nachgezählt ([testing.md](testing.md#feste-aufgaben)).

Die häufigsten Absender nach `letters_sent` des Personenindex sind Leo Spitzer (447 Briefe, VIAF 71397982), Julio de Urquijo Ybarra (243, VIAF 18030027), Georges Lacombe (235, VIAF 34446283), Theodor Gartner (222, VIAF 59114592) und Edward Spencer Dodgson (181, VIAF 27433725). Nach Briefen in beiden Richtungen, wie der Korrespondenzkreis um Schuchardt zählt, stehen Lacombe (524), Urquijo Ybarra (521) und Spitzer (447) vorn. Bis 2026-11-14 nannte dieses Dokument für Spitzer die VIAF-Nummer 46804188, die in keiner der beiden HSA-Dateien vorkommt. Die häufigsten Absendeorte sind Graz (2.371, GeoNames 2778067), Paris (781, 2988507), Wien, Leipzig (247, 2879139) und Berlin (237, 2950159). Graz als Schuchardts Wirkungsort stellt rund ein Fünftel aller Briefe.

Wien steht in den Daten unter zwei GeoNames-IDs, 2761368 bei 761 Briefen und 2761369 bei 94 Briefen, mit leicht verschiedenen Koordinaten. Das Werkzeug zählt sie als zwei Orte, Karte und Raum-Zeit zeigen zwei Punkte. Bis 2026-11-14 nannte dieses Dokument Wien mit 855 Briefen unter 2761369. Ob die Edition hier zwei Orte meint, etwa Stadt und Gemeinde, ist an der Quelle nicht geprüft.

Die CMIF-Datei des HSA schreibt VIAF-URIs in zwei Formen. Absender und Empfänger (`persName/@ref`) stehen als `https://viaf.org/viaf/{id}`, erwähnte Personen (`ref[@type="…#mentionsPerson"]/@target`) als Kurzform `https://viaf.org/{id}`. Gezählt in `data/hsa/CMIF.xml` am 2026-10-29: Von 17.413 Erwähnungen von Personen haben 11.652 die Kurzform (280 davon mit Leerzeichen am Ende), 29 die doppelte Form `https://viaf.org/https://viaf.org/viaf/{id}/`, eine den Namen statt der ID (`https://viaf.org/Luigi Pigorini`) und 5.731 eine HSA-interne Personen-URI (`http://schuchardt.uni-graz.at/id/person/{id}`). `build_hsa_data.py` und `parseAuthorityRef()` erkennen beide Formen, nach der Neuerzeugung vom 2026-10-29 bleibt allein die Erwähnung von Luigi Pigorini ohne ID.

Die CMIF-Datei des HSA schreibt für Ladinisch `target="None"` mit dem Text „Ladinisch“ (zwei Briefe), die Vorprozessierung übernimmt den Code unverändert. Briefe ohne Sprache erhalten im Werkzeug den internen Code `NO_LANGUAGE` (`_none`, `constants.js`), `languageLabel()` zeigt für `None` die Bezeichnung aus den Daten.

Der HSA enthält keine Merkmale von Briefsätzen (Poststempel, Anschrift, Signatur, Mehrfacheinträge) und keine Zeiträume oder Datumsgrenzen. Er markiert keine Angabe als erschlossen, kein Datum hat `@cert` oder `@evidence` (geprüft in `docs/data/hsa.xml` am 2026-11-15). Ob einzelne Werte von der Edition erschlossen sind, sagt die Datei nicht, das Werkzeug zeigt sie deshalb als gelesen ([Erschlossene Angaben](#erschlossene-angaben)). Was die Unsicherheitsbehandlung an ihm zählt, steht in [uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis).

### Externe CMIF-Quellen

Diese Quellen wurden beim Aufbau des Werkzeugs als ladbar erfasst. Ob eine URL weiterhin antwortet, ist beim Laden zu prüfen.

| Quelle | URL | Eigenschaften |
|---|---|---|
| Schnitzler-CMIF (GitHub) | https://github.com/arthur-schnitzler/schnitzler-cmif, Raw-Muster `https://raw.githubusercontent.com/arthur-schnitzler/schnitzler-cmif/main/{dateiname}.xml` | Getestet mit `1971_Schnitzler_Reinhardt.xml` (104 Briefe, 1902–1921), GND für Personen, Orte ohne GeoNames |
| correspSearch Storage (GitHub) | https://github.com/correspSearch/csStorage, Raw-Muster `https://raw.githubusercontent.com/correspSearch/csStorage/dev/{ordner}/{datei}.xml` | CMIF-Dateien ohne eigenes Hosting, etwa avhumboldt, wvhumboldt, forster, hofmannsthal, rilke, wieland |
| correspSearch API v2.0 | https://correspsearch.net/api/v2.0/tei-json.xql | Parameter laut Dokumentation (https://correspsearch.net/en/api.html, abgerufen 2026-10-29) `s`, `p`, `d`, `o`, `e`, `c`, `a` und `x` (Seite ab 1). Die Antworten liefern je Seite 10 Briefe, die Dokumentation nennt 100 |
| Leibniz-Briefportal | https://leibniz-briefportal.de | CMIF-Export, GND für Personen |
| Carl-Maria-von-Weber-Gesamtausgabe | https://weber-gesamtausgabe.de/cmif_v1.xml (empfohlen), `cmif_v2.xml` (CMIF-v2-Entwurf) | GND für Personen, CC BY 4.0 |
| Edvard-Munch-Korrespondenz (NorKorr) | https://dataverse.no/api/access/datafile/191809 | Großer Datensatz, GeoNames für Orte, geeignet für Lasttests |

### Grazer Editionen im Projekt GOSSIP

Das Projekt GOSSIP arbeitet mit den CMIF-Dateien von fünf Grazer Editionen (Hammer-Purgstall, Schuchardt, Rollett, Boltzmann, Brentano). Ihre Eigenheiten beschreibt `knowledge/data.md` im Repository `gossip`. Das Werkzeug wurde am 2026-11-14 an Einträgen von dreien davon geprüft ([Testdateien](#datensätze-im-repository)). Was dabei als Lücke des Parsers galt und behoben ist, steht unter [Was der Parser liest](#was-der-parser-liest), was weiter fehlt, in [plan.md](plan.md#daten-und-parser).

### Stefan Zweig Digital (TEI auf Briefebene, kein CMIF)

Stefan Zweig Digital (Literaturarchiv Salzburg, Hosting GAMS der Universität Graz) veröffentlicht kein CMIF. Die Briefmetadaten liegen als TEI je Konvolut im öffentlichen Repository https://github.com/chpollin/SZD unter `data/Correspondence/konvolute/`, Branch `master`, geprüft an Commit `74e08d03` (2026-09-30). Jeder Brief ist ein `biblFull` mit eigenem `profileDesc/correspDesc`, Signatur (`idno type="signature"`) und GAMS-PID (`idno type="PID"`). Das Werkzeug bündelt diese Daten nicht, weil die Dateien kein `licence`-Element haben und die Rechte beim Literaturarchiv Salzburg liegen. Sie werden lokal geladen ([Mehrere Dateien als ein Bestand](#mehrere-dateien-als-ein-bestand)).

Ladewege, geprüft am 2026-11-13 mit `curl`: GAMS antwortet ohne `Access-Control-Allow-Origin`, ein Browser kann die GAMS-URL nicht laden. Raw-URLs des GitHub-Repositorys erlauben CORS und laden ein Konvolut.

Was der Bestand enthält, gezählt mit `verification/check-corpus.mjs` am genannten Commit:

- 303 Dateien, 2.135 `correspDesc` in 301 Dateien. Die 2.135 Einträge haben 1.633 verschiedene Signaturen, weil die Edition denselben Brief in der Datei jedes beteiligten Konvoluts verzeichnet. Der Parser führt Einträge gleicher Signatur und gleicher Datierung zusammen ([ADR-009](specification.md#adr-009-einträge-gleicher-signatur-sind-ein-brief)), das ergibt 1.636 Briefe (Stand des Parsers vom 2026-11-15). Zwei Signaturen haben Einträge mit verschiedenen Daten. Unter SZ-SAM/B18 stehen drei Briefe verschiedener Jahre, unter SZ-LAS/B1.3 zwei Einträge vom 1919-02-20 und einer vom 2019-02-20, dessen Jahr ins falsche Jahrhundert aufgelöst ist.
- Kein Ort hat eine GeoNames-ID oder Koordinaten. Personen und Körperschaften haben GND-URIs, teils ohne Schema, teils projektinterne Verweise wie `#SZDPER.2137`.
- Ein `correspAction type="sent"` enthält bis zu drei `placeName`: `@type="postmark"` für einen Poststempel, `@type="original"` für den Wortlaut der Vorlage, `@ana="deduced"` für einen erschlossenen Ort. 39 Einträge nennen zwei ungetypte Absendeorte verschiedenen Namens, etwa SZDKOR.fuchs-emil.2 Salzburg und London, beide `ana="deduced"`. 671 `address/addrLine` geben die Postanschrift des Empfängers wieder.
- Datumsangaben stehen doppelt (`xml:lang` de und en). `date/@type="supplied"` und `@ana="supplied/verified"` kennzeichnen ergänzte Datierungen. 71 Einträge geben ihr Datum nur als Text, von den 3.950 Datumselementen im Versand haben 409 kein maschinenlesbares Attribut (gezählt am 2026-11-15). In 35 Einträgen steht ein ungekennzeichnetes `@when` neben einem ergänzten Wortlaut ohne `@when`, etwa der Eintrag SZDKOR.reichner-herbert.B.5 in `szd.korrespondenzen.masereel-frans.xml` (im Werkzeug `SZDKOR.reichner-herbert.B.5~2`, weil die Kennung in drei Dateien vorkommt) mit `when="1919-03-01"` zu „1. 3. 19“ und dem ergänzten „März 1919“.
- 35 Briefe haben ein Jahr zwischen 2008 und 2030, etwa `when="2030-08-12"` zum Text „12. 8. 30“. Das zweistellige Jahr ist in der Quelle ins falsche Jahrhundert aufgelöst ([ADR-010](specification.md#adr-010-unplausible-jahre-kennzeichnen-nicht-korrigieren)). Der Zeitraum der übrigen Briefe ist 1901 bis 1947.
- Bei einigen Personen sind `surname` und `forename` vertauscht ausgezeichnet, einige Körperschaften sind als `persName` zerlegt. Mehrere Personen haben die Normdatennummer einer anderen Person und zählen deshalb unter deren Namen. Der Parser gibt die Auszeichnung wieder, wie sie steht.

Die Rückmeldung dieser Befunde an die Edition liegt beim Operator ([plan.md](plan.md#daten-und-parser)).

## Modell

### CMIF-Struktur

Der `teiHeader` beschreibt das Briefverzeichnis selbst (`titleStmt` mit Titel und Editor, `publicationStmt` mit Publisher, Lizenz, Datum und `idno type="URL"`, `sourceDesc/bibl`). `profileDesc` enthält je Brief ein `correspDesc`.

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

### Was der Parser liest

`docs/js/cmif-parser.js` mit den Helfern aus `docs/js/utils.js` ist die maßgebliche Beschreibung. Die Tabelle gibt den Stand des Codes vom 2026-11-15 wieder. Ort, Datum und Notizen einer Handlung liest der Parser nur aus ihren eigenen Kindelementen, ein `placeName` oder `date` innerhalb einer `address` gehört zur Anschrift.

| Quelle | Was das Werkzeug daraus macht | Ort im Code |
|---|---|---|
| ID des Briefs | `correspDesc/@ref`, sonst `@key`, sonst `xml:id` des `correspDesc` oder des umgebenden Briefsatzes, zuletzt die Position | `extractLetter()` |
| `correspAction type="sent"` | alle Personen und Körperschaften als `senders`, der erste als `sender`. Wer zugleich Empfänger ist, steht hinter den übrigen Absendern zurück | `extractSenders()` |
| `correspAction type="received"` | alle Empfänger aller empfangenden Handlungen als `recipients`, der erste als `recipient` | `extractLetter()` |
| weitere `correspAction` (etwa `forwarded`) | `furtherActions` mit Typ, Personen und Ort oder Datum nur, wo die Handlung eigene nennt. Ihre Personen sind keine Korrespondenten | `extractFurtherActions()` |
| `persName/@ref` | Normdatum, wenn VIAF, GND (auch ohne `gnd/` im Pfad), Library of Congress oder BnF mit Nummer erkannt wird. Eine andere URL gilt als Verweis ohne Normdatum, auch Wikidata und eine VIAF-Adresse ohne Nummer wie `https://viaf.org/viaf/` | `parseAuthorityRef()`, `personFromElement()` |
| `persName/@corresp`, `@ref` ohne Normdatum | `localRef`, Schlüssel der Person, Präzision `named` | `personFromElement()`, `personKey()` |
| `placeName` im Versand | Absendeort ist das erste ungetypte `placeName`, sonst das erste, das weder Poststempel noch Wortlaut der Vorlage ist. Weitere Absendeorte anderen Namens bleiben als `placeAlternatives` (Name, GeoNames-ID, Markierung als erschlossen), die Wahl des Absendeorts ändern sie nicht. Steht nur ein `placeName type="original"`, bleibt sein Wortlaut als `placeText` und ergibt keinen Ort. Eckige Klammern um den ganzen Namen sind Markierung und nicht Teil des Namens | `extractPlace()` |
| Poststempel | `placeName` oder `note` mit `@type` postmark, postalStamp oder Poststempel werden `postmark`, nie Absendeort | `extractPlace()` |
| `address` | jede Anschrift des Briefs, in Versand und Empfang. Ihre Teile (`addrLine`, `street`, `postCode`, `settlement` und andere) stehen mit Komma verbunden in einem Text. `address` ist die erste, `addresses` nennt alle, wo es mehrere gibt. Eine Anschrift und was in ihr steht, ist nie Absendeort oder Briefdatum | `extractAddresses()` |
| `date` | Das erste Datumselement mit maschinenlesbarem Attribut zählt. `@when` ergibt Tag, Monat oder Jahr, eine Uhrzeit (`1900-06-15T10:00`) den Tag. `@from` und `@to` am selben Tag gelten als ein Tag. `@from`/`@to` oder beide Grenzen ergeben einen Zeitraum mit dem Jahr des Anfangs. Eine einzelne Grenze (`@notBefore` oder `@notAfter` allein) ergibt `dateBound`, das Datum bleibt erhalten, das Jahr leer. Ein Datum nur als Text bleibt als `dateText`. „ohne Datum“, „o. D.“, „s.d.“, „[o. D.]“, „[Date Unknown]“ und ähnliche Platzhalter gelten als undatiert und nicht als erschlossen | `extractDate()`, `isNoDate()`, `classifyDate()` |
| ergänztes Datum neben dem gelesenen | Den Wortlaut eines als ergänzt markierten Datumselements ohne eigenen Wert behält `dateSupplied`. Das gelesene Datum bleibt unmarkiert und behält seine Präzision | `extractDate()` |
| `@cert` am Datum | `dateCertainty`, Vorgabe `high` | `classifyDate()` |
| `@evidence`, `@type`/`@ana` mit supplied, deduced, inferred, conjecture oder erschlossen, eckige Klammern um den ganzen Wert | `dateInferred`, `place_sent.inferred` ([Erschlossene Angaben](#erschlossene-angaben)) | `isInferred()` |
| `note/ref` hasLanguage | Sprache als Code und Bezeichnung aus den Notizen, die direkte Kinder von `correspDesc` sind, sonst die erste Sprache aus `msContents/textLang` des Briefsatzes | `extractLanguage()`, `extractTextLanguage()` |
| `note/ref` mentionsPerson, mentionsPlace, mentionsSubject, mentionsOrg, mentionsBibl | aus denselben Notizen erwähnte Personen (Name aus dem Text, `@target` über `parseAuthorityRef()`), Orte (GeoNames-ID), Themen (URI, Bezeichnung, Kategorie), Organisationen und Werke | `extractMentions()` |
| Signatur, Mehrfacheinträge | `signature` aus `idno type="signature"`. Einträge gleicher Signatur und gleicher Datierung werden ein Brief mit `records` und `recordsDiffer`, Einträge ohne Datum schließen sich an, wenn alle datierten Einträge der Signatur übereinstimmen. Weichen die Daten ab, wird jede Datierung ein eigener Brief, Einträge ohne Datum bleiben einzeln, und jeder dieser Briefe nennt die anderen in `sharedSignature`. Der erste Eintrag mit Datum führt. Die anderen füllen Ort mit seiner Markierung und seinen Alternativen, Ortswortlaut, Poststempel, Anschrift, Link, Sprache, ergänzten Datumswortlaut und Empfänger nur, wo er sie nicht hat. `dateInferred` gilt, wenn der Eintrag, aus dem das gezeigte Datum stammt, es markiert | `extractSignature()`, `mergeRecords()` |
| mehrere Dateien | `file` je Brief, `parallels` für Briefe verschiedener Dateien mit gleichem identifiziertem Absender, gleichen identifizierten Empfängern und gleichem Tag | `markParallels()` |
| unplausible Jahre | `dateImplausible`, das Jahr wird leer, das Datum bleibt | `flagImplausibleYears()` |

Was der Parser nicht liest:

- `cert` an Person und Ort, nur am Datum.
- Ort und Datum des Empfangs. Keiner der geprüften Bestände enthält sie.
- `@subtype` an `note/ref`, also auch nicht die Familie einer Aussage im CMIF von GOSSIP ([Gemeinsames Brief- und Aussagemodell](#gemeinsames-brief--und-aussagemodell)).
- Ob eine Erwähnung im Brieftext oder im Kommentar der Edition steht. CMIF drückt das nicht aus.
- Eine ausdrückliche Gleichsetzung zweier Einträge als ein Brief, weil kein Austauschprofil sie festlegt.
- Ein Datum, das nur im Titel eines Eintrags oder an anderer Stelle der Briefdatei steht. Ein Datum nur als Text wird nicht normalisiert.
- `@when-iso` und andere Datumsattribute außerhalb von `@when`, `@from`, `@to`, `@notBefore` und `@notAfter`.
- Eckige Klammern um einen Teil des Datums oder Namens, etwa „2. 1. [19]20“. Nur Klammern um den ganzen Wert gelten als Markierung.
- Werte von `@cert` außer `low` zeigt die Anzeige nicht an, sie stehen nur in `dateCertainty`.
- Von mehreren Sprachen in `textLang` nur die erste.
- `correspDesc/@type`.
- Notizen zu weiteren Beteiligten und ungetypte Notizen in der Versandhandlung.

### Erschlossene Angaben

Ein Wert gilt nur dann als erschlossen, wenn die Quelle ihn markiert, durch `@evidence`, durch `@type` oder `@ana` mit supplied, deduced, inferred, conjecture oder erschlossen oder durch eckige Klammern um den ganzen Wert. Ein unmarkierter Wert wird so übernommen, wie die Edition ihn gibt, mit der Präzision seines Attributs. Das Werkzeug fügt keinen eigenen Zweifel hinzu. Im HSA steht etwa bei o:hsa.letter.10232 `when="1887-04"` ohne `@cert` und ohne `@evidence`, das Werkzeug zeigt April 1887 mit Monatspräzision und nicht als erschlossen, auch wenn die Edition den Monat erschlossen haben mag. Dasselbe gilt für ein gelesenes Datum neben einem ergänzten Wortlaut im Bestand von Stefan Zweig Digital. Ob der gelesene Wert selbst eine Ergänzung ist, beurteilt die Edition, der ergänzte Wortlaut bleibt daneben in `dateSupplied` erhalten.

Jahre unter 1400 und über 2100 und Zeiträume über mehrere Jahre stehen auf keiner Zeitachse (`datedYearRange()` und `isMultiYearSpan()` in `utils.js`, dieselbe Regel in Raum-Zeit und Themen), weil Erfassungsfehler wie 0 oder 20250 die Achse sonst sprengen. Bis 2026-11-14 schrieb dieses Dokument die Regel `explore.js` zu.

### Internes Datenmodell

Der Parser erzeugt Briefe als Hauptentitäten und Indizes für Personen, Orte, Sprachen und Themen. Felder und Indexformen beschreibt [architecture.md](architecture.md#datenmodell). Drei Eigenheiten führten bei der Implementierung zu falschen Annahmen und sind deshalb festgehalten.

- Personen des Parsers haben `letter_count` als Zahl der Briefe, an denen sie beteiligt sind, dazu `as_sender` und `as_recipient`. Die HSA-Datei führt stattdessen `letters_sent` und `letters_received` und nur Personen mit Normdaten-ID. Code, der Zählungen braucht, rechnet sie deshalb aus den Briefen.
- Themen haben ihre Bezeichnung in `label`.
- CMIF speichert Sprachen oft als URI (`http://lexvo.org/id/iso639-3/deu`). `LANGUAGE_LABELS` in `constants.js` ist die einzige Bezeichnungstabelle für Parser und Ansichten.

## Gemeinsames Brief- und Aussagemodell

CorrespExplorer soll das Sichtwerkzeug für das gemeinsame Briefmodell werden, das das Projekt GOSSIP für die Briefe der fünf Grazer Editionen entwickelt (Entscheidung des Operators vom 2026-11-14, [project.md](project.md)). Das Modell steht in `knowledge/data.md` des Repositorys `gossip`, Abschnitt „Letter and statement model“. Es ist der Vorschlag eines KI-Agenten, am 2026-11-14 auf Entscheidung des Operators gekürzt und von keiner Fachwissenschaftlerin und keinem Fachwissenschaftler geprüft. Die Benennungen und Erfassungen sind ungeprüft.

Das Modell kennt vier Dinge.

| Ding | Was es ist |
|---|---|
| Brief | der Eintrag der Edition mit Adresse, Absender, Empfänger, Ort und Datum, wie `correspDesc` sie gibt. Zeugen, Faksimiles und Textvarianten bleiben bei der Edition |
| Stelle | eine zitierbare Passage des Brieftexts oder des Kommentars, in der eine dritte Person genannt wird, in TEI ein `rs` mit Kennung |
| Person | wen eine Stelle meint. Die Identifizierung ist eine eigene Aussage und darf fehlen |
| Aussage | was eine Stelle mit einer dritten Person tut, in TEI eine `annotation` in `standOff`, die auf die Stelle zeigt |

Jede Aussage hat vier Pflichtfelder.

| Feld | Werte |
|---|---|
| Verweis | die Stelle und ihre Art: `name`, `titel`, `verwandtschaft`, `gruppe`, `pronomen` |
| Familie | wie die dritte Person in die Mitteilung eingeht: `ueber`, `durch`, `an`, `fuer`, `mit`. Ein Gruß erhält stattdessen `gruss` und zählt nicht als Aussage |
| Stimme | wer spricht: `absender`, `wiedergegeben`, `edition` |
| Stand | `ungeprueft`, `bestaetigt`, `abgelehnt`, mit der Quelle der Aussage |

GOSSIP gibt die Aussagen in zwei Formen aus, als JSON und als CMIF-Datei. Im CMIF ist jede Aussage ein `ref` in `correspDesc/note` mit dem Typ, den der Entwurf von CMIF 2 für erwähnte Personen nutzt, der Stelle als `@target` und der Familie als `@subtype`. Ziel und Subtyp sind Erweiterungen, die GOSSIP vorschlägt. Das Modell erfasst noch nicht die Identität einer Person über Briefe hinweg, die Beziehung zwischen Absender und Empfänger und die Zählung weitergeleiteter Briefe.

Was das Werkzeug davon heute liest, nach dem Code und nicht an einer Ausgabe von GOSSIP geprüft:

- Brief: vollständig, soweit `correspDesc` ihn beschreibt.
- Person: als Beteiligte und als Erwähnte, mit Normdatum oder Registerkennung.
- Stelle: nichts. Das Werkzeug kennt keine Textstelle.
- Aussage: Das CMIF von GOSSIP liest es als erwähnte Personen. Der Name kommt aus dem Text des `ref`, `@target` geht durch `parseAuthorityRef()`. Eine Stellenkennung ist kein Normdatum und wird deshalb als Kennung vom Typ `unknown` gehalten. Daraus folgt nach dem Code, dass jede Stelle als eigene erwähnte Person zählt, dieselbe Person an zwei Stellen also als zwei. `@subtype`, also die Familie, verwirft der Parser. Stimme und Stand enthält das CMIF nicht, das JSON liest das Werkzeug nicht.

Das Werkzeug zeigt deshalb keinen Prüfstand von Aussagen, weder bestätigt noch vorgeschlagen. Welche Lieferform es lesen soll und welche Figuren die Aussagen zeigen, ist offen ([plan.md](plan.md#gemeinsames-briefmodell)).

## Erzeugte Daten

### docs/data/examples.json

`preprocessing/build_examples.py` liest `docs/data/hsa-letters.json` und schreibt `docs/data/examples.json` mit einem Eintrag `datasets["data/hsa-letters.json"]`. Die Regeln sind einmal in `docs/js/start-summary.js` (`summarizeLetters()`) definiert, das Skript überträgt sie Regel für Regel, weil die Datei des Archivs zu groß ist, um sie bei jedem Aufruf der Startseite im Browser zusammenzufassen. Lokal eingebundene Bestände und eigene Daten fasst der Browser selbst nach denselben Regeln zusammen. Welche Figuren aus der Zusammenfassung werden, entscheidet danach `composeFigure()` in `start-compose.js` ([design.md](design.md#startseite)).

| Schlüssel | Inhalt |
|---|---|
| `letters`, `dated`, `first`, `last` | Zahl der Briefe, der Briefe mit Jahr, erstes und letztes Jahr |
| `coverage` | je Angabe des Datenmodells (`STATEMENTS`) die Zahl der Briefe, die sie enthalten. `composeFigure()` gibt einer Angabe nur bei einer Zahl über null eine Figur |
| `persons`, `places`, `languages` | Zahl der Personen und bekannten Absendeorte, Briefe je Sprache |
| `ego` | der Korrespondenzkreis um die zentrale Person mit dem äußeren Ring der Erwähnten |
| `located`, `mentionedLocated` | Absendeorte und erwähnte Orte mit Koordinaten und Briefzahl |
| `perYear` | Briefe je Jahr und Sprache |
| `mentioned`, `subjects` | Zahl und häufigste erwähnte Personen, Orte und Themen, die Jahresverläufe der gezeigten Themen |
| `hosts` | die häufigsten Hosts der Links zur Edition |
| `placesTop` | die fünf häufigsten Absendeorte mit Namen, für die Rangfolge ohne Koordinaten (seit `b189cb5`) |
| `postmarkYears`, `recordCounts`, `recordsDiffer` | Poststempel je Jahr, Zahl der Briefe je Zahl ihrer Einträge, Briefe mit abweichenden Einträgen, für die Figuren der Briefsätze (seit `b189cb5`) |
| `examples` | zwölf Beispielbriefe mit ihren Angaben und ihrer Stelle in jedem Aggregat |

Für das Archiv sind `postmarkYears` leer und `recordsDiffer` null, weil es keine Briefsätze enthält. Die Datei enthält kein Erzeugungsdatum, ein unveränderter Quellstand ergibt eine unveränderte Datei. Dass die Datei mit der Definition in JavaScript übereinstimmt, prüft der Smoke-Test ([testing.md](testing.md#browser-smoke-test)). Nach jeder Neuerzeugung von `hsa-letters.json` ist `uv run preprocessing/build_examples.py` zu wiederholen.

### Länderumrisse

`docs/vendor/natural-earth/countries-110m.geo.json` sind Länderumrisse im Maßstab 1:110 Millionen von Natural Earth (gemeinfrei), eine GeoJSON-Umwandlung aus dem npm-Paket world-atlas, Version 2. Herkunft und Weg in `docs/vendor/natural-earth/PROVENANCE.md`. Raum-Zeit-Ansicht, Startseite und die kleine Karte der Startansicht (`loadLand()` in `mini-figures.js`) zeichnen daraus nur die äußeren Ringe und lesen keine Namen.

### Gemeinsame Bausteine der Projektseiten

`docs/assets/dhcraft/` enthält Kopf und Fuß der Projektseiten von Digital Humanities Craft, am 2026-11-14 unverändert kopiert aus dem Repository `DigitalHumanitiesCraft/brand-assets`, Ordner `web/`, bei Commit `b0641cc` (`PROVENANCE.md` im Ordner): `dhcraft-tokens.css`, `dhcraft-components.css`, `dhcraft-mark-watercolor-128.png`, `LICENSE.md` und vier WOFF2-Schriften (Sora, Instrument Sans) mit ihren OFL-Texten unter `fonts/`. Nach `LICENSE.md` stehen die Stylesheets unter MIT, die Schriften unter der SIL Open Font License 1.1, das DHCraft-Zeichen bleibt geschützt und darf auf DHCraft-Seiten gezeigt werden, die den Ordner kopieren. Eine neuere Fassung wird durch erneutes Kopieren übernommen, das Werkzeug passt die Bausteine nur in `docs/css/site-frame.css` an. Eingebunden sind sie in `index.html` und seit `8464b92` in `about.html`.

## Grenzen

- Normdatenabdeckung: Personen und Orte ohne URI lassen sich nur über Name oder Registerkennung zusammenführen. Varianten derselben Person erscheinen dann getrennt, alle Einträge „Unbekannt“ eines Bestands bilden eine Person.
- Eine Registerkennung, die nur aus einem Fragment besteht (`#P.7`), ist in ihrer Edition eindeutig. Werden zwei Editionen mit solchen Kennungen zusammen geladen, können zwei Personen zusammenfallen.
- Ego-zentrierte Bestände: Ein Nachlass wie das HSA zeigt das Netzwerk aus der Perspektive einer Person. Beziehungen zwischen anderen Korrespondenten fehlen strukturell.
- Kein geprüfter Bestand nennt Empfangsorte. Karte und Raum-Zeit zeigen, woher geschrieben wird, und keine Wege.
- Themen und Erwähnungen enthält unter den geprüften Beständen nur das HSA. Dem Bestand von Stefan Zweig Digital fehlen für Karte und Raum-Zeit die Ortskennungen.
- Unvollständige Daten werden ihrem Jahr zugeordnet, undatierte Briefe und Briefe mit einer einzelnen Datumsgrenze stehen neben der Zeitachse.

## Normdaten und Anschlüsse

Normdaten-URIs sind der primäre Schlüssel für Abgleich und Aggregation, Anzeigenamen dienen nur der Darstellung ([ADR-001](specification.md#adr-001-normdaten-uris-als-primärer-schlüssel)).

| Entität | System | URL-Muster | Erkannt in |
|---|---|---|---|
| Person | VIAF | `viaf.org/viaf/{id}`, Kurzform `viaf.org/{id}` | `parseAuthorityRef()` |
| Person | GND | `d-nb.info/gnd/{id}`, auch `d-nb.info/{id}` | `parseAuthorityRef()` |
| Person | Library of Congress | `id.loc.gov/authorities/names/{id}` | `parseAuthorityRef()` |
| Person | Bibliothèque nationale de France | `data.bnf.fr/ark:/12148/{id}` | `parseAuthorityRef()` |
| Ort | GeoNames | `sws.geonames.org/{id}` | `parseGeoNamesRef()` |
| Sprache | ISO 639-1 und Lexvo | `de`, `lexvo.org/id/iso639-3/{code}` | `extractLanguageCode()` |

GeoNames liefert keine Koordinaten im CMIF. Sie kommen aus `docs/data/geonames_coordinates.json` und auf ausdrückliche Aktion aus Wikidata ([ADR-006](specification.md#adr-006-externe-dienste-nur-auf-ausdrückliche-aktion)). Für Personen mit VIAF- oder GND-URI holt die Wikidata-Anreicherung auf Klick Porträts, Lebensdaten und Berufe.

## Workflow

### Laden im Browser

`cmif-parser.js` parst hochgeladene oder per URL geladene Dateien mit `DOMParser`. Alle Elemente werden über den TEI-Namespace `http://www.tei-c.org/ns/1.0` abgefragt. URLs der correspSearch-API v2.0 lädt `correspsearch-api.js` seitenweise bis zu einer Obergrenze.

- GitHub-Raw-URLs erlauben CORS. Bei einem CORS-Fehler lässt sich die Datei herunterladen und als Datei laden.
- Dateien über etwa 5 MB können das sessionStorage-Limit überschreiten. Die Fehlermeldung nennt dann die Zahl der Briefe und verweist auf das vorprozessierte HSA (`upload.js`).
- Orte ohne Koordinaten erscheinen in der Ortsliste, aber nicht auf Karte und Raum-Zeit.

### Mehrere Dateien als ein Bestand

Editionen, die je Korrespondenz eine Datei veröffentlichen, lädt `parseCMIFFiles()` als einen Bestand: mehrere Dateien im Dateidialog oder per Drag-and-Drop, oder eine Dateiliste `index.html?files=data/….json` mit `{"files": ["a.xml", …]}`, deren Dateinamen den Ordner der Liste nicht verlassen. Eine Datei ohne Briefe oder ohne gültiges XML wird übersprungen und in `meta.files.skipped` genannt. Der Kopf des Bestands nennt nur, was alle Dateien teilen.

Für Bestände, die nicht ins Repository gehören, bindet `python verification/serve_local_corpus.py <Ordner>` einen Ordner außerhalb des Repositorys unter `data/local/` ein und erzeugt die Dateiliste. Startseite und Explorer bieten den Bestand dann als weiteren Eintrag neben dem Archiv an. Die Startseite fragt die Dateiliste nur auf einem lokalen Host ab (`localhost`, `127.0.0.1`, `[::1]`), damit die öffentliche Seite keine fehlschlagende Anfrage stellt.

### Vorprozessierung

Das HSA wird in Python vorprozessiert (`preprocessing/build_hsa_data.py`, Eingabe `data/hsa/CMIF.xml`, Ausgabe `docs/data/hsa-letters.json`), weil seine Größe das Laden im Browser über sessionStorage ausschließt. `build_hsa_data.py` und `analyze_hsa_cmif.py` brauchen `lxml` (`preprocessing/requirements.txt`), `resolve_geonames_wikidata.py` und `build_examples.py` nur die Standardbibliothek. Die Vorprozessierung kennt die Regeln für Briefsätze nicht, das HSA braucht sie nicht.

## Rechte und Lizenzen

Code steht unter MIT (`LICENSE`), Dokumentation und Wissensdokumente unter CC BY 4.0 (`README.md`). Forschungsdaten Dritter behalten die Lizenz, die ihre Herausgeber angeben, maßgeblich ist `publicationStmt/availability/licence` der jeweiligen Datei.

| Datei | Herkunft | Lizenzangabe | Beleg |
|---|---|---|---|
| `docs/data/hsa.xml`, identisch `data/hsa/CMIF.xml` | CMIF-Export des Hugo Schuchardt Archivs, Publisher Zentrum für Informationsmodellierung der Universität Graz, Stand 2025-01-28 | CC BY 4.0 | `licence` im teiHeader. Am 2026-11-14 an der Quelle https://gams.uni-graz.at/context:hsa/CMIF nachgelesen: Publisher und Lizenz stimmen überein |
| `docs/data/hsa-letters.json`, `docs/data/examples.json` | Mit `build_hsa_data.py` und `build_examples.py` aus der CMIF-Datei abgeleitet und dabei geändert | CC BY 4.0 der Quelle | `meta.modifications` nennt die Änderungen, die Übersicht zeigt ihn neben dem Lizenzlink |
| `docs/data/schoenbach.xml` | CMIF der Edition „Fünf Briefe aus dem Nachlass von Anton Emanuel Schönbach“ am ACDH-OEAW | CC0 | `licence` im teiHeader |
| `docs/data/test-graz-cases.xml` | Synthetisch, im Projekt erstellt, seit 2026-11-15. Bis dahin zitierte die Datei drei `correspDesc` der Edition „Joseph von Hammer-Purgstall. Korrespondenz“ auf GAMS unter CC BY-NC 4.0. Dieser Auszug steht gekennzeichnet in den Commits vom 2026-11-14 | CC BY 4.0 | Kommentar im Kopf der Datei |
| `docs/data/test-parallel-a.xml`, `test-parallel-b.xml` | Je ein Eintrag aus dem CMIF von „Ludwig Boltzmann. Leben und Briefe“ und des Franz Brentano Archivs Graz | CC BY 4.0 | `licence` der beiden CMIF-Dateien |
| `docs/data/demo-showcase.xml`, `test-uncertainty.xml`, `test-letter-records*.xml`, `test-parser-cases.xml` | Synthetisch, im Projekt erstellt | CC BY 4.0 | teiHeader oder diese Tabelle |
| `docs/data/test-hostile.xml` | Synthetisch, im Projekt erstellt | CC BY 4.0 | Diese Tabelle. Das `licence`-Element der Datei bleibt absichtlich feindliche Eingabe |
| `docs/data/test-correspsearch.json`, `test-correspsearch-empty.json` | Antworten der correspSearch-API v2.0 vom 2026-11-05, Publisher Berlin-Brandenburgische Akademie der Wissenschaften, unverändert gespeichert. Die erste Datei verzeichnet Briefe aus mehreren Editionen, die ihre `sourceDesc/bibl` nennt, die zweite ist ein leeres Ergebnis | CC BY 4.0 | `publicationStmt/availability/licence` im Kopf jeder Datei |
| `data/geonames_coordinates.json`, `docs/data/geonames_coordinates.json` | Ausgabe von `resolve_geonames_wikidata.py`, Koordinaten (P625) aus Wikidata über die GeoNames-ID (P1566) | Wikidata CC0, der Eintrag für Genf (2660646), nur in der ausgelieferten Datei, aus GeoNames unter CC BY 4.0 | `meta.source` der ausgelieferten Datei nennt beide Quellen, das Feld `source: "geonames"` den Eintrag aus GeoNames. Ein Lizenzfeld hat `meta` nicht, die Lizenzangabe steht nur in dieser Tabelle |
| `docs/vendor/natural-earth/countries-110m.geo.json` | Natural Earth über world-atlas | gemeinfrei, Build-Skripte ISC | `PROVENANCE.md` daneben |
| `docs/assets/dhcraft/` | Bausteine der Projektseiten aus `brand-assets` bei `b0641cc` | Stylesheets MIT, Schriften OFL 1.1, DHCraft-Zeichen geschützt | `LICENSE.md` und `PROVENANCE.md` daneben, Lizenzzeile im Fuß der Startseite |
| `docs/assets/logo.jpg`, `logo-no-background.png`, `logo-no-background-no-text.png` | Das Logo des Werkzeugs (Umschlag mit Zahnrad und Auge, in zwei Dateien mit dem Schriftzug „CorrespExplorer“), eingeführt in `b79a95e` am 2025-11-26 ohne Herkunftsangabe. Es ist nicht das DHCraft-Zeichen und liegt nicht im Repository `brand-assets` (Abgleich der Prüfsummen am 2026-11-15 ohne Treffer) | Nicht festgelegt | Keine. Die Lizenzhinweise von `brand-assets` gelten für die Logos jenes Repositorys und erfassen diese Dateien nicht. Herkunft und Rechteinhaber klärt der Operator |

Externe Quellen, die Nutzende zur Laufzeit laden, sind nicht gebündelt, ihre Lizenz steht im teiHeader der geladenen Datei und in der Übersicht. Die correspSearch-API gibt ihre Ergebnisse laut Dokumentation unter CC BY 4.0 aus.

### Herkunft von docs/data/geonames_coordinates.json

Bis zum 2026-10-29 lag hier eine Handtabelle mit 58 Städten ohne Quellenangabe, von denen 13 einer GeoNames-ID Namen und Koordinaten einer anderen Stadt zuordneten (Genf mit den Werten von Bern). Auf Entscheidung des Operators ersetzt die Wikidata-Tabelle der Vorprozessierung die Handtabelle. `python preprocessing/resolve_geonames_wikidata.py --served` übernimmt alle Einträge von `data/geonames_coordinates.json`, löst die IDs der übrigen gebündelten CMIF-Dateien über Wikidata auf und liest für IDs, die Wikidata einer anderen GeoNames-ID zuordnet (Genf), Koordinaten und Namen aus dem GeoNames-RDF-Dienst. Am 2026-10-29 wurde jeder Eintrag mit dem GeoNames-RDF-Datensatz seiner ID verglichen. Siedlungen liegen bis auf Lagos (42 km, das Wikidata-Objekt meint den Bundesstaat) unter 10 km von der GeoNames-Koordinate.

## Testdatensätze

Welche Dateien welche Suite lädt, steht in [testing.md](testing.md). Die folgenden externen Datensätze dienten der manuellen Prüfung beim Aufbau im November 2025.

| ID | Name | Briefe | Zeitraum | Quelle |
|---|---|---|---|---|
| hebel | Hebel-Briefe | 25 | 1791–1826 | TU Darmstadt, https://tueditions.ulb.tu-darmstadt.de/g/pa000018-0077 |
| rollett | Rollett-Korrespondenz | 328 | 1877–1897 | Universität Graz, https://gams.uni-graz.at/context:rollett/CMI |
| humboldt-spiker | Humboldt-Spiker | 156 | 1827–1846 | correspSearch, https://correspsearch.net/storage/avhumboldt/Spiker.xml |
| humboldt-duvinage | Humboldt-Duvinage | 67 | 1835–1857 | correspSearch, https://correspsearch.net/storage/avhumboldt/Duvinage.xml |
| schoenbach | Schönbach-Briefe | 5 | 1888–1911 | ACDH-OEAW, https://raw.githubusercontent.com/acdh-oeaw/schoenbach/main/cmif_schoenbach.xml |

Eigenheiten: Hebel hat viele Briefe ohne Absendeort, `cert="low"` und Zeitbereiche. Rollett nutzt `[NN]` für unbekannte Absender. Humboldt-Spiker nutzt `cert="low"` mit `evidence="conjecture"`. Humboldt-Duvinage hat französische Datumsnotation und ein Duplikat bei `key="4"`. Schönbach ist minimal und gut zu HTML-Editionen verlinkt.
