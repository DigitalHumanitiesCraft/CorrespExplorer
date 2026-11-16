---
title: Project
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2026-10-28
updated: 2026-11-16
authors: [Christopher Pollin]
template:
  name: Vorlage Projekt-Wissensdokument
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/project
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-project
knowledge-sources:
  institutions:
    correspSearch: https://correspsearch.net
    Hugo Schuchardt Archiv: https://gams.uni-graz.at/context:hsa
  standards:
    CMIF: https://github.com/TEI-Correspondence-SIG/CMIF
    TEI P5: https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-correspDesc.html
related: [data, specification, architecture, design, plan]
---

# Project

CorrespExplorer ist ein Werkzeug im Browser, das Briefmetadaten als wenige große Figuren über einer gemeinsamen Auswahl zeigt: wer wem schrieb, wann, von wo und worüber, und welche Briefe hinter jedem Muster stehen. Am 2026-11-14 hat der Operator entschieden, dass es das Sichtwerkzeug für das gemeinsame Briefmodell wird, das das Projekt GOSSIP für die Briefe von fünf Grazer Editionen entwickelt. Die Anwendung ist unter https://dhcraft.org/CorrespExplorer erreichbar, GitHub Pages liefert den gepushten Stand von `main` aus ([plan.md](plan.md#veröffentlichung)).

## Worum es geht

Briefeditionen erschließen ihre Bestände über Metadaten zu Absendern, Empfängern, Orten, Daten und Themen, und Projekte wie GOSSIP fragen darüber hinaus, was die Briefe über dritte Personen sagen. CorrespExplorer soll beides lesbar machen. Seine Oberfläche besteht aus vier großen Ansichten über einer Auswahl, Netzwerk als Korrespondenzkreis einer Person, Karte, Raum-Zeit und Themen, dazu den Briefen der Auswahl unter jeder Ansicht. Die Startseite ist eine Figur aus den kleinen Darstellungen des Explorers in der Ordnung des Datenmodells, zusammengesetzt aus dem, was der gewählte Bestand enthält. Das Werkzeug macht die Datenlage sichtbar, also fehlende Koordinaten, unscharfe Datierungen, Personen ohne Normdaten und erschlossene Angaben. Was es für Forschende leisten soll, steht in [specification.md](specification.md).

## Verhältnis zu GOSSIP und correspSearch

GOSSIP modelliert Brief, Stelle, Person und Aussage und gibt Aussagen über Dritte mit Verweis, Familie, Stimme und Prüfstand aus. Das Modell ist der Vorschlag eines KI-Agenten, auf Entscheidung des Operators gekürzt und von keiner Fachwissenschaftlerin und keinem Fachwissenschaftler geprüft ([data.md](data.md#gemeinsames-brief--und-aussagemodell)). CorrespExplorer liest heute die Briefe dieses Modells und noch keine Aussagen. Welche Lieferform es liest und welche Figuren die Aussagen zeigen, ist offen ([plan.md](plan.md#gemeinsames-briefmodell)).

correspSearch der Berlin-Brandenburgischen Akademie der Wissenschaften aggregiert CMIF-Dateien vieler Editionen. CorrespExplorer liest dieses Format und Adressen der correspSearch-API und verlinkt Personen in deren Suche. Die Startfigur legt die Angaben im Kern von CMIF, in seinen Erweiterungen und in TEI-Briefsätzen nebeneinander. CorrespExplorer bleibt ein Werkzeug zum Ansehen eines Bestands neben correspSearch.

## Datengrundlage

Das Werkzeug wird am Briefbestand des Hugo Schuchardt Archivs der Universität Graz entwickelt, der als vorprozessierte Datei mitkommt und als einziger gebündelter Realdatensatz Themen, Erwähnungen, Sprachen und Koordinaten zugleich enthält. Der synthetische Datensatz des früheren Tutorials liegt nur noch als Testdatei bei, Tutorial und Tour sind entfernt. Die Briefsätze von Stefan Zweig Digital dienen als Bestand aus vielen TEI-Dateien und werden nur lokal geladen. Je ein Eintrag zweier Grazer Editionen aus dem Kreis von GOSSIP liegt als Testdatei bei, die Fälle einer dritten bildet eine Testdatei mit erfundenen Einträgen nach. Nutzende laden eigene CMIF- und TEI-Dateien oder Adressen. Quellen, Modell, Lizenzen und Grenzen beschreibt [data.md](data.md).

## Abgrenzungen

- Das Werkzeug zeigt keine Brieftexte, es verlinkt auf die Edition.
- Es ediert nicht und korrigiert keine Daten, auch keine Datierungen. Unplausible Jahre kennzeichnet es nur ([ADR-010](specification.md#adr-010-unplausible-jahre-kennzeichnen-nicht-korrigieren)).
- Es geokodiert keine Regionen, identifiziert keine unbekannten Personen und führt Briefe verschiedener Bestände nicht zusammen ([ADR-011](specification.md#adr-011-übereinstimmung-über-bestände-benennen-nicht-zusammenführen)).
- Es bewertet nicht die Datenqualität einer Edition ([ADR-005](specification.md#adr-005-nicht-wertende-sprache-für-partnerdaten)).
- Es erfasst und bestätigt keine Aussagen. Das geschieht in GOSSIP.
- Es speichert hochgeladene Daten auf keinem Server.

## Standards

- Datenformat: CMIF der TEI Correspondence SIG und TEI mit `correspDesc` in Briefsätzen
- Personen: VIAF, GND, Library of Congress und Bibliothèque nationale de France als Normdaten-URIs, sonst die Registerkennung der Edition
- Orte: GeoNames, Koordinaten aus Wikidata
- Sprachen: ISO 639 und Lexvo-URIs
- Anreicherung auf ausdrückliche Aktion: Wikidata für Lebensdaten, Berufe, Porträts und Koordinaten

## Technische Umsetzung

Die Anwendung ist eine statische Seite ohne Backend und ohne Build-Schritt, ausgeliefert über GitHub Pages aus `docs/` auf main. Daten werden im Browser geparst, große Datensätze in Python vorprozessiert. Bibliotheken und Schriften liegen versioniert in `docs/vendor/`, die Grundkarte von OpenFreeMap lädt erst beim Öffnen der Kartenansicht. Weitere externe Zugriffe entstehen durch Quellen-URLs, correspSearch und ausdrücklich angeforderte Anreicherungen. Christopher Pollin entwickelt das Werkzeug mit Promptotyping in Claude Code, die Commit-Trailer nennen die beteiligten LLMs. Aufbau und Datenfluss beschreibt [architecture.md](architecture.md), Gestaltung und Rückmeldungen des Operators [design.md](design.md).

## Herkunft

CorrespExplorer begann im Oktober 2025 als HerData, ein Prototyp zu Frauen in Goethes Korrespondenz, und wurde am 2025-11-26 zu einem generischen Explorer für CMIF-Dateien mit zuletzt zwölf Ansichten umgebaut (`9a01c32`). Im November 2026 lernte es TEI-Briefsätze von Stefan Zweig Digital lesen, wurde nach Gegenständen statt nach Darstellungstechnik gegliedert und erhielt Raum-Zeit, Korrespondenzkreis, Briefauszug und Startfigur. Das Repository dient als Fallstudie im Aufsatz über die Promptotyping-Methode, dessen Abschnitt über das Werkzeug mit der neuen Richtung seinen Gegenstand ändert. Es gehört zur Werkzeugfamilie ResearchTools von Digital Humanities Craft. Der Verlauf steht im [Journal](journal.md).

## Was das Projekt gelernt hat

- Eine Ansicht, deren Zahlen plausibel aussehen, kann Lesefehler des Werkzeugs verbergen, die erst eine Nachzählung an der Quelle ohne den Code des Werkzeugs aufdeckt. Am Bestand von Stefan Zweig Digital zählte ein LLM-Agent die Quelldateien mit einem eigenen Skript ohne den Parser nach und fand unter anderem Empfänger, die als Absender erschienen, eine fremde Empfängerliste nach dem Zusammenführen und Adresswortlaute als Absendeorte ([Journal 2026-11-14, Datenprüfung](journal.md#2026-11-14-datenprüfung-am-bestand-von-stefan-zweig-digital-parserkorrekturen-und-arbeitsfläche), ähnlich die Prüfer im Browser im [Eintrag zu den Briefsätzen](journal.md#2026-11-14-briefsätze-mehrere-dateien-und-überlieferung-eine-iteration-an-den-briefen-von-stefan-zweig-digital)), und schon im Oktober 2026 zeigte die Übersicht eine Datumsqualität von stets 100 Prozent, weil sie ein Feld las, das weder Parser noch Vorprozessierung schreiben ([Journal 2026-10-29](journal.md#2026-10-29-qualitätsanzeige-datenrechte-und-correspsearch-api)). Festgestellt haben das LLM-Agenten und Gegenrechnungen mit eigenen Skripten aus den Dateien, die bauende Session hat die Datenbefunde der Browserprüfer an den Quelldateien nachgesehen, und eine Person hat keinen der Befunde bestätigt.
- Ein Bestand um eine Person ergibt kein vollständiges Netz, weil Beziehungen zwischen den übrigen Korrespondenten in ihm strukturell fehlen. Für das Hugo Schuchardt Archiv hält [data.md](data.md#grenzen) diese Grenze fest, und der Operator erklärte am 2026-11-14 die Form des Netzwerks zur Forschungsfrage, nachdem der Korrespondenzkreis gebaut war ([Journal 2026-11-14, Übergabe](journal.md#2026-11-14-übergabe-startfigur-briefe-der-auswahl-bedienprüfung-themen-netzwerk-als-forschungsfrage)). Den Bezug zur Forschungsliteratur enthält nur der Bericht eines Recherche-Agenten in [network-figures.md](network-figures.md), dessen Quellenzuschreibungen die bauende Session nicht nachgeprüft hat.
- Ein Test belegt nur etwas über das Werkzeug, wenn er dessen Code an echten Daten ausführt. Bei der Kuration vom 2026-10-28, deren Urheber der Journaleintrag nicht nennt, zeigte sich, dass `explore-tests.js` kein Produktionsmodul importierte und die geprüfte Logik auf erfundenen Arrays nachbaute ([Journal 2026-10-28](journal.md#2026-10-28-kuration-fuer-die-promptotyping-fallstudie)), und am 2026-11-14 deckte die Korpusprüfung des Projekts keinen der Lesefehler ab, die die unabhängige Nachzählung fand. Seit dieser Kuration verlangt die Testregel in [testing.md](testing.md), dass Tests echte Dateien über die Produktionsfunktion laden und die echten Funktionen importieren.

### Geteilt mit Schwesterprojekten

Zwei Schwesterprojekte haben dieselbe Kernlehre unabhängig gezogen. Ein Ergebnis, das stimmig aussieht, kann falsch sein, und das zeigt erst eine unabhängige Prüfung an der Quelle oder durch eine Person. In Klawiter-Rescue (`chpollin/klawiter-rescue`) stand ein Wert in seiner Quelle und stammte doch aus der falschen Passage, ohne dass Einzeltests es bemerkten, und Urteile von Agenten gelten dort seither nur als Vorschläge. Im Editor für Stefan Zweig Digital (`DigitalHumanitiesCraft/szd-teiCrafter`) belegte die Übereinstimmung mehrerer Agenten desselben LLM nur, dass ihr Ergebnis stabil war, über seine Richtigkeit sagte sie nichts. Die Angaben zu beiden Projekten stammen aus einer Lektüre ihrer Wissensordner vom 2026-11-16 und sind hier nicht nachgeprüft.

## Begriffe

Die projektzentralen Begriffe definiert [INDEX.md](INDEX.md#begriffe).

## Lizenz

Der Code steht unter der MIT-Lizenz (`LICENSE`), Dokumentation und Wissensdokumente unter Creative Commons Attribution 4.0 International. Forschungsdaten Dritter behalten die Lizenz ihrer Herausgeber, die gebündelten Dateien und ihre Lizenzen stehen in [data.md](data.md#rechte-und-lizenzen). Zitierangaben stehen in `CITATION.cff` und `codemeta.json`.
