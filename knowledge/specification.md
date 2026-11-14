---
title: Specification
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2025-11-26
updated: 2026-11-14
authors: [Christopher Pollin]
template:
  name: Vorlage Specification
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/specification
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-specification
related: [project, data, architecture, design, uncertainty-specification, plan]
---

# Specification

Die Specification hält fest, was CorrespExplorer leisten soll und warum. Die Anforderungen und Stories ändern sich mit dem Funktionsumfang, die Entscheidungen wachsen monoton und werden bei Revision durch einen neuen Eintrag abgelöst. Die Behandlung unsicherer Daten ist in [uncertainty-specification.md](uncertainty-specification.md) spezialisiert.

## Anforderungen

### Funktionale Anforderungen

Die funktionalen Anforderungen stehen als Akzeptanzkriterien bei den Stories im nächsten Abschnitt.

### Nicht-funktionale Anforderungen

- NFR-01: Die Anwendung läuft vollständig im Browser ohne Backend. Hochgeladene Dateien verlassen den Rechner nicht, URL-Importe laden direkt von der angegebenen Quelle. Maßstab: keine Serverkomponente im Repository, Auslieferung als statische Seite über GitHub Pages.
- NFR-02: Kein Build-Schritt. Maßstab: `docs/` ist ohne Werkzeugkette lauffähig ([architecture.md](architecture.md#entwurfsmuster)).
- NFR-03: Daten aus CMIF und Wikidata werden vor jeder Ausgabe in HTML escaped, Links nur mit `http` und `https` gesetzt. Maßstab: Suite `test-security.js` gegen `test-hostile.xml`.
- NFR-04: Unsicherheit in den Daten bleibt sichtbar und wird nicht durch falsche Präzision überdeckt. Maßstab: [uncertainty-specification.md](uncertainty-specification.md).
- NFR-05: Alle interaktiven Elemente sind per Tastatur bedienbar und haben einen sichtbaren Fokus. Maßstab: [design.md](design.md#barrierefreiheit).

## Epics und User Stories

Die Stories adressieren Forschende in den Digital Humanities, der Geschichts- und Literaturwissenschaft, Archive und Bibliotheken, Editionsprojekte und eine interessierte Öffentlichkeit. Sie sind aus der Entwicklungspraxis abgeleitet und nicht mit Nutzenden validiert. Am 2026-10-29 wurden die Stories US-05, US-11, US-17, US-20 bis US-22, US-27, US-28, US-33, US-35 und US-36 gegen den Code abgeglichen. Wo der Code bewusst anders arbeitet, beschreibt die Story das umgesetzte Verhalten. Die vier Lücken dieses Abgleichs hat der Operator am 2026-11-05 entschieden ([ADR-007](#adr-007-umfang-der-stories-nach-dem-abgleich-mit-dem-code)): US-11 und US-22 sind umgesetzt, die offenen Kriterien von US-05 und US-27 gestrichen. Die übrigen Stories sind nicht systematisch geprüft.

### Datenimport

#### US-01 CMIF-Datei hochladen

Als Forschende möchte ich eine lokale CMIF-XML-Datei hochladen, um meine eigenen Korrespondenzdaten zu visualisieren.

- Drag-and-Drop oder Dateidialog
- Validierung des XML-Formats
- Fehlermeldung bei ungültigem Format

#### US-02 CMIF von URL laden

Als Forschende möchte ich eine CMIF-Datei von einer URL laden, um Daten aus Online-Repositorien zu nutzen.

- URL-Eingabefeld
- CORS-Fehlerbehandlung mit Hinweis
- URLs der correspSearch-API v2.0 laden alle Trefferseiten bis zu einer Obergrenze, eine URL mit Parameter `x` genau eine Seite
- Eine Abfrage ohne Treffer meldet das auf der Startseite und öffnet keinen leeren Explorer. Herausgeber und Lizenz kommen aus dem teiHeader der Antwort
- Meldungen unterscheiden eine nicht erreichbare Adresse und HTTP-Fehler mit deutschem Grund

#### US-03 Beispieldatensatz erkunden

Als neue Nutzerin möchte ich einen Beispieldatensatz laden, um die Funktionen des Werkzeugs kennenzulernen.

- Vorprozessierter HSA-Datensatz verfügbar
- Laden mit einem Klick
- Links auf den Tutorial-Datensatz (`explore.html?view=…&demo=true`) öffnen ihn auch in einem neuen Tab oder bei anderen Personen, die Tour erscheint einmal je Browser und entfällt mit `tour=0`

### Überblick und Statistik

#### US-04 Datensatz-Statistiken sehen

Als Forschende möchte ich auf einen Blick sehen, wie viele Briefe, Personen und Orte der Datensatz enthält.

- Statistik-Cards mit Kernzahlen
- Zeitraum (minimales und maximales Jahr)
- Anzahl der Orte mit und ohne Koordinaten

#### US-05 Zeitliche Verteilung verstehen

Als Forschende möchte ich die zeitliche Verteilung der Korrespondenz sehen, um Hochphasen und Lücken zu erkennen.

- Timeline als Balkendiagramm je Jahr, gestapelt nach Sprache, undatierte Briefe in einem eigenen Balken, Briefe mit einer Datierung über mehrere Jahre (etwa 1822 bis 1922) in einem Balken „Spanne“. Diese zählen nicht zum Zeitraum des Datensatzes (Entscheidung E5 vom 2026-11-05)
- Zeitfilter per Klick oder Enter auf einen Jahresbalken
- Unter der Zeitleiste steht eine aufklappbare Tabelle mit Briefen, ungenau datierten Briefen und Sprachen je Jahr als Textalternative
- Eine Gruppierung nach Dekade ist gestrichen, weil die Zeitleiste auch 70 Jahre lesbar zeigt und der Jahresregler eingrenzt ([ADR-007](#adr-007-umfang-der-stories-nach-dem-abgleich-mit-dem-code))

#### US-27 Datensatz-Übersicht als Einstieg

Als Forschende möchte ich beim Laden eines Datensatzes eine Übersicht sehen, um Datenqualität und Struktur sofort einschätzen zu können.

- Übersicht als Standardansicht beim Laden
- Kennzahlen für Briefe, Zeitraum, Personen und Orte, Personen und Orte aus den Briefen gezählt (`personKey`, `placeKey`)
- Drei neutrale Chips mit den Anteilen datierter Briefe, identifizierter Personen und georeferenzierter Orte, ohne Ampelfarben ([ADR-005](#adr-005-nicht-wertende-sprache-für-partnerdaten))
- Quellen-Metadaten aus dem teiHeader (Publisher, Lizenz mit Änderungsvermerk, Link zur CMIF-Datei)
- Einstiegspunkte zu Karte, Netzwerk, Timeline, Briefen, Chronik und Aktivität
- Bis zu vier Forschungspfade ([US-33](#us-33-methodisch-geleitete-exploration))
- Sidebar ausgeblendet für volle Breite
- Die fünf aktivsten Korrespondenten, die Sprachverteilung und Ansichtsempfehlungen auf Basis der Datenlage sind gestrichen. Die Forschungspfade zeigen die aktivsten Korrespondenten als Vorschau, die Sprachverteilung steht in der Zeitleiste ([ADR-007](#adr-007-umfang-der-stories-nach-dem-abgleich-mit-dem-code))

### Räumliche Exploration

#### US-06 Korrespondenz auf der Karte sehen

Als Forschende möchte ich die Absendeorte auf einer Karte sehen, um die räumliche Verteilung zu verstehen.

- Interaktive Karte mit Zoom und Pan
- Clustering bei vielen Punkten
- Kreisgröße proportional zur Briefanzahl

#### US-07 Orts-Details abrufen

Als Forschende möchte ich auf einen Ort klicken, um zu sehen, wie viele Briefe von dort gesendet wurden und von wem.

- Popup mit Ortsname
- Anzahl der Briefe
- Die fünf häufigsten Absender

#### US-08 Fehlende Koordinaten erkennen

Als Forschende möchte ich wissen, welche Orte keine Koordinaten haben, um die Datenqualität einschätzen zu können.

- Anzeige der Orte ohne Geodaten
- Liste dieser Orte abrufbar

### Personen

#### US-09 Korrespondenten durchsuchen

Als Forschende möchte ich alle Korrespondenten durchsuchen und sortieren, um wichtige Kontakte zu identifizieren.

- Durchsuchbare Liste aller Personen
- Sortierung nach Briefanzahl und Name
- Anzeige gesendet und empfangen

#### US-10 Briefe einer Person filtern

Als Forschende möchte ich alle Briefe einer bestimmten Person sehen, um deren Korrespondenz zu analysieren.

- Klick auf eine Person filtert die Briefe
- Filter-Badge zeigt den aktiven Filter
- Filter lässt sich entfernen

#### US-11 Korrespondenznetzwerk visualisieren

Als Forschende möchte ich sehen, wer mit wem korrespondiert hat, um Netzwerke und Cluster zu erkennen.

- Force-Directed Graph mit D3.js, Zoom und Drag
- Modus Zeitgenossen: Knoten sind Absender, Größe nach Briefanzahl, eine Kante verbindet zwei Absender, die in mindestens so vielen gleichen Jahren Briefe schrieben, wie der Regler vorgibt ([design.md](design.md#netzwerk)), dazu eine Obergrenze der Knoten. Die Standardschwelle zeigt Verbindungen, sobald der Datensatz welche enthält
- Modus Themen: Themen als Knoten, Kanten nach gemeinsamen Briefen
- Klick oder Enter auf einen Knoten filtert die Briefe
- Modus Briefwechsel als Standard: Knoten sind Absender und Empfänger, eine Kante verbindet zwei Personen, die einander schrieben, ihre Stärke folgt der Zahl der Briefe in beide Richtungen, der Regler setzt die Mindestzahl der Briefe (`buildCorrespondenceNetwork()` in `network-view.js`, Entscheidung E8 vom 2026-11-05). Die Kanten der Zeitgenossen zeigen dagegen gleichzeitige Aktivität
- Unter dem Netzwerk steht eine aufklappbare Tabelle der gezeigten Verbindungen mit ihrer Stärke als Textalternative

### Briefe

#### US-12 Briefe durchsuchen

Als Forschende möchte ich alle Briefe durchsuchen und sortieren, um bestimmte Korrespondenzen zu finden.

- Durchsuchbare Liste
- Sortierung nach Datum und Absender
- Anzeige von Absender, Empfänger, Datum und Ort

#### US-13 Brief-Details ansehen

Als Forschende möchte ich alle Metadaten eines Briefs sehen, einschließlich erwähnter Personen, Orte und Themen.

- Dialog oder Detailansicht
- Vollständige Metadaten
- Links zu Normdaten (VIAF, GND)
- Erwähnte Entitäten

#### US-14 Zur Quelle navigieren

Als Forschende möchte ich von einem Brief zur Edition navigieren, um den Volltext zu lesen.

- Link zur Quell-URL, sofern vorhanden
- Öffnet in neuem Tab

### Filterung

#### US-15 Nach Zeitraum filtern

Als Forschende möchte ich die Korrespondenz auf einen Zeitraum einschränken, um Phasen zu analysieren.

- Slider für Start- und Endjahr
- Alle Ansichten aktualisieren sich

#### US-16 Nach Sprache filtern

Als Forschende möchte ich nach Briefsprache filtern, um etwa nur französische Briefe zu sehen.

- Checkboxen für die vorhandenen Sprachen
- Mehrfachauswahl
- Briefanzahl je Sprache

#### US-17 Nach Thema filtern in der Sidebar

Als Forschende möchte ich nach Themen filtern, um thematisch verwandte Briefe zu finden.

- Themen auswählbar
- Nur bei Datensätzen mit `mentionsSubject`
- Schnellfilter in der Sidebar mit den häufigsten Themen und Suchfeld

#### US-18 Filter kombinieren

Als Forschende möchte ich mehrere Filter kombinieren, um komplexe Anfragen zu stellen.

- Alle Filter gleichzeitig anwendbar
- UND-Verknüpfung

#### US-19 Filter zurücksetzen

Als Forschende möchte ich alle Filter mit einem Klick zurücksetzen, um zur Gesamtansicht zurückzukehren.

- Reset-Button setzt alle Filter auf ihre Standardwerte

### Teilen und Export

#### US-20 Gefilterte Ansicht teilen

Als Forschende möchte ich einen Link zu meiner gefilterten Ansicht teilen, um Kolleg:innen eine bestimmte Auswahl zu zeigen.

- Ansicht und alle Filter (Zeitraum oder undatiert, Sprachen, Person, Ort, Thema, Qualität) stehen in der URL, ein fehlender Parameter bedeutet keinen Filter
- Bei vorprozessierten Datensätzen (`?json=`) sehen Empfänger dieselbe Ansicht mit denselben Briefen
- Bei hochgeladenen Dateien trägt der Link nur Ansicht und Filter, der Datensatz liegt im Tab der Absenderin. Empfänger ohne diesen Datensatz landen auf der Startseite mit einem Hinweis darauf. Links auf den Tutorial-Datensatz laden ihn selbst
- Ein Ansichtswechsel legt einen Eintrag in der Browser-Historie an, Zurück führt zur vorigen Ansicht. Filteränderungen ersetzen den Eintrag (`replaceState`), weil ein Zug am Jahresregler sonst viele Einträge erzeugte (Entscheidung E1 vom 2026-11-05)
- Bei correspSearch-Abfragen trägt der Link die Abfrage als `cs=`, Empfänger laden sie neu. `cs=` nimmt nur Adressen der correspSearch-API an (Entscheidung E3 vom 2026-11-05)

#### US-21 Als CSV exportieren

Als Forschende möchte ich die gefilterten Briefe als CSV exportieren, um sie in Tabellenkalkulation oder anderen Werkzeugen zu analysieren.

- Export der aktuell gefilterten Briefe, die Exportoptionen sind bei null Briefen deaktiviert
- Spalten `id`, `date`, `date_to`, `year`, `date_precision`, `date_certainty`, `sender_name`, `sender_id`, `sender_authority`, `sender_precision`, `recipient_name`, `recipient_id`, `recipient_authority`, `recipient_precision`, `place_name`, `place_geonames`, `place_precision`, `language`, `url` (`LETTER_EXPORT_COLUMNS` in `export.js`). Die Spalten `*_authority` nennen die Normdatei (`gnd`, `viaf`) zur Nummer in `*_id`
- Die Datei beginnt mit einem UTF-8-BOM, damit Excel Umlaute richtig liest. Ob das in Excel wirkt, ist nicht geprüft (Entscheidung E4 vom 2026-11-05)

#### US-22 Als JSON exportieren

Als Entwicklerin möchte ich die Daten als JSON exportieren, um sie programmatisch weiterzuverarbeiten.

- Export der gefilterten Briefe als JSON mit der vollständigen Datenstruktur: die Briefe, wie der Explorer sie hält, mit Erwähnungen, Präzision und Sicherheit, dazu Indizes der Personen, Orte und Themen mit Briefzahl und Normdaten- oder Koordinatenstatus, gezählt wie die Listen, und die Metadaten des Datensatzes mit seiner Quelle (`datasetToJson()` in `export.js`, Entscheidung E8 vom 2026-11-05)
- Der CSV-Export behält die flachen Zeilen für Tabellenkalkulationen

#### US-23 Mit correspSearch verknüpfen

Als Forschende möchte ich von einer Person zu ihrer Suche bei correspSearch navigieren, um weitere Korrespondenzen zu finden.

- Link zur correspSearch-Personensuche über die Normdaten-ID (GND, VIAF)

### Themen

#### US-24 Themen durchsuchen

Als Forschende möchte ich alle Themen des Datensatzes durchsuchen, um relevante Diskurse zu finden.

- Liste der häufigsten Themen mit Suchfeld
- Briefanzahl je Thema

#### US-25 Thema im Detail ansehen

Als Forschende möchte ich zu einem Thema sehen, wer darüber geschrieben hat und wann.

- Korrespondenten mit Erwähnung des Themas
- Zeitliche Verteilung der Erwähnungen
- Verwandte Themen über Kookkurrenz

#### US-26 Nach Thema filtern in allen Ansichten

Als Forschende möchte ich alle Briefe filtern, die ein bestimmtes Thema erwähnen.

- Klick auf ein Thema aktiviert den Filter
- Filter-Badge in der Sidebar
- Alle Ansichten zeigen nur die gefilterten Briefe

### Chronik

#### US-28 Chronologische Briefansicht

Als Forschende möchte ich alle Briefe auf einem vertikalen Zeitstrahl sehen, um den Verlauf der Korrespondenz nachzuvollziehen.

- Zeitstrahl von den ältesten zu den jüngsten Briefen, undatierte Briefe am Ende unter der Marke „Datum unbekannt“
- Gruppierung nach Jahren mit Jahresmarken
- Jeder Brief zeigt Datum, Absender, Empfänger und Ort
- Klick öffnet den Brief-Dialog
- Nachladen in Blöcken von 100 Briefen, sobald das Ende der Liste sichtbar wird

#### US-29 Biografische Anreicherung

Als Forschende möchte ich biografische Informationen zu den Korrespondenten sehen, um den historischen Kontext besser zu verstehen.

- Button „Mit Wikidata anreichern“ in der Chronik
- Dialog mit Fortschrittsanzeige und Abbruchmöglichkeit
- Porträts von Wikimedia Commons, Lebensdaten und Berufe
- Anreicherung nur für Personen mit Normdaten (VIAF, GND)

#### US-30 Alter in der Chronik

Als Forschende möchte ich das Alter der Korrespondenten zum Zeitpunkt des Briefs sehen, um ihre Lebensphasen einzuordnen.

- Alter neben dem Namen, berechnet aus Geburts- und Briefjahr
- Quellen sind die Wikidata-Anreicherung oder Lebensdaten im CMIF
- Ohne Geburtsdatum entfällt die Angabe

#### US-31 Beziehungskontext in der Chronik

Als Forschende möchte ich den Kontext einer Korrespondenzbeziehung sehen, um Briefwechsel einordnen zu können.

- Badge „Erster Brief“ beim ersten Kontakt zweier Personen
- Anzeige „Brief X von Y“ bei etablierten Beziehungen
- Richtungsabhängiger Korrespondenzindex

#### US-32 Chronik-Layout umschalten

Als Forschende möchte ich zwischen Chronik-Layouts wechseln, um je nach Forschungsfrage die passende Darstellung zu wählen.

- Karten mit Porträts, Lebensleisten und vollständigen Namen
- Kompakt mit einer Zeile je Brief
- Timeline mit Absender links, Datum und Ort in der Mitte, Empfänger rechts
- Wechsel ohne Neuladen der Daten

### Forschungspfade und Aktivität

#### US-33 Methodisch geleitete Exploration

Als Forschende möchte ich sehen, welche Forschungsfragen mit dem aktuellen Datensatz beantwortbar sind, um meine Analyse methodisch zu strukturieren.

- Vier epistemische Kategorien (deskriptiv, analytisch, interpretativ, nicht beantwortbar)
- Jede beantwortbare Frage zeigt eine Beschreibung, eine Vorschau mit schnellen Antworten aus den Briefen und einen mehrstufigen Pfad. Jeder Schritt ist ein Knopf mit Bezeichnung und Aktion, der zur Ansicht führt
- Die Übersicht zeigt bis zu vier Pfade, die übrigen auf Klick
- Nicht beantwortbare Fragen stehen im aufklappbaren Abschnitt „Anreicherungspotential“ und nennen die fehlenden Daten und das CMIF-Element, das sie beantwortbar machte ([ADR-005](#adr-005-nicht-wertende-sprache-für-partnerdaten))

#### US-34 Korrespondenzaktivität visualisieren

Als Forschende möchte ich die Korrespondenz als Kalender-Heatmap sehen, um Aktivitätsphasen und Muster zu erkennen.

- Heatmap mit Wochentagen und Wochen, Farbintensität nach Briefen je Tag
- Jahresauswahl
- Klick auf einen Tag zeigt dessen Briefe
- Reagiert auf aktive Filter
- Der aktivste Tag wird nur aus taggenauen Daten berechnet

### Wissenspfade und Datenkorb

#### US-35 Geführte Exploration mit Wissenskorb

Als Forschende möchte ich von einer Forschungsfrage geleitet durch die Ansichten gehen und dabei Briefe, Personen und Orte sammeln, um eine Exploration methodisch zu strukturieren.

- Ein Klick auf einen Forschungspfad der Übersicht startet einen Wissenspfad
- Eine Leiste zeigt Frage, Schritte und aktuelle Position, mit Zurück, Weiter und Beenden
- Der Wissenskorb in der Sidebar sammelt die Auswahl der aktuellen Ansicht, Personen und Orte über `personKey` und `placeKey` auch ohne Normdaten-ID
- Der Korb gilt je Datensatz, bleibt in localStorage über Browser-Neustarts erhalten und synchronisiert sich zwischen Tabs
- Die Navigation zeigt die Zahl der gesammelten Einträge und führt zur Analyseseite `wissenskorb.html`
- Die Analyseseite erzeugt einen Link zum Teilen des Korbs mit Datensatzschlüssel. Beim Öffnen wird der geteilte Korb mit dem vorhandenen zusammengeführt, die Korbgrenzen gelten. Ein Korb eines anderen Datensatzes wird nicht übernommen, ein Hinweis nennt den Datensatz. Gehört er zu einem vorprozessierten Datensatz, lädt die Analyseseite dessen Datei selbst

#### US-36 Kontextuelle Korb-Aktionen

Als Forschende möchte ich aus jeder Detailansicht Einträge in den Korb legen, um ohne Seitenwechsel zu sammeln.

- Brief-Dialog, Briefliste und Kartenpopup mit Umschalter für den einzelnen Brief
- Personen-Dialog und Personenliste legen die Person, das Orts-Detail den Ort als eigenen Eintrag in den Korb, die Analyseseite wertet alle ihre Briefe aus (Entscheidung E2 vom 2026-11-05). Der Jahresbalken der Timeline legt die Briefe des Jahrs in den Korb, ein Jahr ist kein Eintrag
- Eine Rückmeldung nennt die Zahl der hinzugefügten Einträge und, bei vollem Korb, die abgewiesenen. Ein Umschalter wird nur markiert, wenn der Korb den Eintrag aufgenommen hat, bereits gesammelte Einträge sind markiert, im Brief-Dialog über die Beschriftung „Im Korb“, sonst mit `aria-pressed`

### Vergleich

#### US-37 Elemente vergleichen

Als Forschende möchte ich zwei Personen, Zeiträume oder Orte nebeneinander vergleichen, um Unterschiede und Gemeinsamkeiten der Korrespondenz zu erkennen.

- Drei Modi für Personen, Zeiträume und Orte
- Zwei Spalten mit Briefanzahl, Zeitraum, häufigsten Orten, Themen und Sprachen
- Überschneidungen bei gemeinsamen Briefen, Korrespondenten, Themen und Zeiträumen
- Schnellauswahl häufiger Einträge und Suche mit Autovervollständigung
- Die gemeinsamen Briefe öffnen sich als Liste und von dort im Brief-Dialog

#### US-38 Edition aus vielen Dateien laden

Als Forschende möchte ich eine Edition laden, die je Korrespondenz eine TEI-Datei veröffentlicht, um den ganzen Bestand als einen Datensatz zu erkunden.

- Mehrere Dateien im Dateidialog oder per Drag-and-Drop, oder eine Dateiliste über `?files=`
- Briefsätze mit `correspDesc` in `biblFull` werden ohne Umwandlung gelesen, die ID kommt vom Datensatz
- Dateien ohne Briefe werden übersprungen und gezählt, die Übersicht nennt Dateien, Einträge und Briefe
- Einträge gleicher Signatur werden zu einem Brief zusammengeführt ([ADR-009](#adr-009-einträge-gleicher-signatur-sind-ein-brief))

#### US-39 Überlieferung eines Briefs sehen und filtern

Als Forschende möchte ich sehen, was die Edition erschlossen hat und was der Brief selbst trägt, um Datierung und Ort eines Briefs einschätzen zu können.

- Erschlossene Daten und Orte stehen in eckigen Klammern, mit einer Legende über der Liste
- Poststempel, Anschrift und Signatur stehen benannt in der Briefzeile und im Briefdialog, nie als Absendeort
- Alle Empfänger eines Briefs werden genannt und gezählt
- Die Seitenleiste bietet je vorhandenem Merkmal einen Filter mit Zahl (Gruppe „Überlieferung“), der Zustand steht in der URL
- Ein Klick auf einen Brief öffnet den Dialog mit allen Angaben und allen Einträgen der Quelle

## Funktionsumfang

Die Ansichten von `explore.html` und ihre Umsetzung beschreibt [architecture.md](architecture.md#ansichten). Die Zuordnung zu den Stories:

| Ansicht | Stories |
|---|---|
| Übersicht mit Forschungspfaden | US-04, US-27, US-33 |
| Karte | US-06, US-07, US-08 |
| Korrespondenten | US-09, US-10, US-23 |
| Briefe und Brief-Dialog | US-12, US-13, US-14, US-39 |
| Timeline | US-05 |
| Themen | US-17, US-24, US-25, US-26 |
| Orte | US-07, US-08 |
| Netzwerk | US-11 |
| Chronik | US-28 bis US-32 |
| Aktivität | US-34 |
| Vergleich | US-37 |
| Wissenspfade und Datenkorb (`wissenskorb.html`) | US-35, US-36 |
| Sidebar und Navigation | US-15 bis US-22 |
| Startseite | US-01 bis US-03, US-38 |

## Entscheidungen

Die Gründungsentscheidungen E1 bis E4 und E9 bis E12 (CMIF als Austauschformat, Normdaten-Agnostik, Wikidata für Koordinaten, briefzentrierte Struktur, Parsing im Browser, hybrides Speichermodell, URL-State, Themen-Explorer) stehen mit Kontext im [Journal](journal.md). Die folgenden Einträge halten übergreifende Entscheidungen fest, die mehrere Dokumente betreffen.

### ADR-001 Normdaten-URIs als primärer Schlüssel

Kontext. CMIF trägt zu Personen und Orten eine Normdaten-URI (`@ref`) und einen Anzeigenamen. Editionen schreiben denselben Namen verschieden.

Wahl. Abgleich und Aggregation laufen über die URI, der Name dient nur der Anzeige. Fehlt die URI, wird auf den Namen zurückgegriffen.

Begründung. VIAF-, GND- und GeoNames-URIs sind eindeutig und erlauben korrekte Aggregation über Schreibvarianten hinweg.

Effekt. Die Unterstützung mehrerer Normdatensysteme beschreibt [data.md](data.md#normdaten-und-anschlüsse). Filter, Personen- und Ortsindex und Datenkorb verwenden dieselben Schlüssel `personKey` und `placeKey` aus `utils.js`, also die ID und ohne ID den Namen.

### ADR-002 Unsicherheit sichtbar machen

Kontext. Historische Korrespondenzdaten sind lückenhaft und unscharf datiert. Forschende ziehen aus einer Visualisierung Schlüsse über Zeit und Raum.

Wahl. Unsicherheit wird erkannt, markiert und erklärt, nie korrigiert oder versteckt. Gute Daten bleiben ohne Markierung.

Begründung. Verschwiegene Unsicherheit führt zu Fehlinterpretationen. Markierungen nur an unsicheren Werten halten das Bild ruhig.

Effekt. Kategorien und Tests in [uncertainty-specification.md](uncertainty-specification.md), visuelle Umsetzung in [design.md](design.md#visualisierungslogik).

### ADR-003 Ein zentraler Filterzustand

Kontext. Alle Ansichten zeigen dieselbe gefilterte Briefmenge.

Wahl. Der Filterzustand liegt zentral in `state-manager.js`, Indizes werden einmal berechnet und wiederverwendet, keine Ansicht hält eine eigene Kopie.

Begründung. Doppelte Zustände führen zu Synchronisationsfehlern zwischen Ansichten.

Effekt. Person-, Orts-, Themen-, Sprach-, Zeit- und Qualitätsfilter laufen über den state-manager. `explore.js` hält die geladenen Daten und die gefilterte Menge zusätzlich als Arbeitskopie für seine Ansichten und gleicht sie in `applyFilters()` ab ([architecture.md](architecture.md#entwurfsmuster)). Die ausgelagerten Ansichten lesen über injizierte Funktionen und halten nur ihren Darstellungszustand.

### ADR-004 Epistemische Kategorien für Forschungsfragen

Kontext. Die Übersicht schlägt Forschungspfade als Fragen an den Datensatz vor.

Wahl. Fragen werden nach der Art der nötigen Erkenntnis eingeteilt in deskriptiv (direkt ablesbar), analytisch (Berechnung oder Aggregation), interpretativ (Kontext nötig) und nicht beantwortbar (Daten fehlen). `analyzeResearchQuestions()` ordnet nach Datenverfügbarkeit zu. Jede Frage führt einen Pfad aus Schritten mit Zielansicht, Bezeichnung und konkreter Aktion.

Begründung. Die Kategorie macht den epistemischen Status einer Antwort sichtbar, bevor man sie sucht. Pfade zeigen, dass Fragen oft mehrere Ansichten brauchen.

Effekt. Darstellung der Pfade in [design.md](design.md#interaktionsmuster).

### ADR-005 Nicht wertende Sprache für Partnerdaten

Kontext. CMIF-Daten stammen von Editionen und Forschungspartnern.

Wahl. Die Oberfläche spricht von „Anreicherungspotential“ statt von „Datenqualität“ oder „Datenabdeckung“.

Begründung. „Qualität“ bewertet die Arbeit der Partner, „Anreicherungspotential“ richtet den Blick auf Möglichkeiten.

Effekt. Gilt für alle Texte, die Lücken in fremden Daten benennen, und für ihre Gestaltung. Die Qualitäts-Chips der Startansicht zeigen Anteile ohne Ampelfarben (Entscheidung des Operators vom 2026-10-29, [design.md](design.md#startansicht-und-navigation)).

### ADR-006 Externe Dienste nur auf ausdrückliche Aktion

Kontext. Wikidata-Anfragen übermitteln die Normdaten-ID einer historischen Person an einen fremden Dienst. Chronik und Upload fragten erst auf Klick, der Personen-Dialog beim Öffnen.

Wahl. Jede Anfrage an Wikidata oder GeoNames startet erst auf eine ausdrückliche Aktion der Nutzenden. Der Personen-Dialog zeigt vorhandene Anreicherung aus dem Upload und sonst eine Schaltfläche „Lebensdaten von Wikidata laden“ (Entscheidung des Operators vom 2026-10-29).

Begründung. Nutzende sollen sehen und bestimmen, wann Daten das Werkzeug verlassen. Eine einheitliche Regel ist leichter zu prüfen als Ausnahmen je Ansicht.

Effekt. Gilt für Personen-Dialog, Chronik, Orte und Upload. Eine Antwort für eine zuvor geöffnete Person wird verworfen, wenn inzwischen eine andere im Dialog steht (`personDetailRequest` in `explore.js`).

Ergänzung vom 2026-11-05. Die Regel betrifft Anreicherung mit Personenbezug. Das Laden des Datensatzes selbst fällt nicht darunter: Ein geteilter Link mit `cs=` lädt die genannte correspSearch-Abfrage beim Öffnen ohne weitere Aktion, so wie ein Link mit `json=` die gebündelte Datei lädt (Entscheidung E3). `cs=` nimmt nur Adressen an, die `isCorrespSearchUrl()` zulässt.

### ADR-007 Umfang der Stories nach dem Abgleich mit dem Code

Kontext. Der Abgleich der Stories mit dem Code vom 2026-10-29 ließ vier Kriterien offen: Kanten aus dem Briefwechsel im Netzwerk (US-11), ein JSON-Export der vollständigen Datenstruktur (US-22), eine Gruppierung der Zeitleiste nach Dekade (US-05) und Top-5-Korrespondenten, Sprachverteilung und Ansichtsempfehlungen in der Übersicht (US-27).

Wahl. US-11 und US-22 werden umgesetzt, die offenen Kriterien von US-05 und US-27 gestrichen (Entscheidung E8 des Operators vom 2026-11-05 nach der Empfehlung in [plan.md](plan.md)).

Begründung. „Wer schrieb wem“ ist die Grundfrage eines Korrespondenznetzes, das Zeitgenossen-Netz wurde in den Prüfungen vom 2026-11-05 als solches gelesen. Der JSON-Export ist eine Serialisierung vorhandener Daten. Die Zeitleiste bleibt über Jahrzehnte lesbar, und die Übersicht zeigt aktivste Korrespondenten schon in den Forschungspfaden, die Sprachverteilung in der Zeitleiste.

Effekt. Das Netzwerk startet im Modus Briefwechsel, Zeitgenossen und Themen bleiben wählbar. Der JSON-Export ersetzt die flache Zeilenliste. Weitere Lücken in den Stories sind nicht offen.

### ADR-008 Wissensbasis nicht auf der Website

Kontext. GitHub Pages liefert alles unter `docs/` aus. Die Wissensbasis lag in `docs/knowledge/` und war über `vault.html` und als einzelne Seiten öffentlich abrufbar.

Wahl. Die Wissensbasis liegt in `knowledge/` im Repository-Root, die Website enthält keinen Viewer für sie und verlinkt `knowledge/INDEX.md` auf GitHub (Veröffentlichungsregel des Operators, umgesetzt am 2026-11-10).

Begründung. Eine Pages-Seite liefert nur für Lesende bestimmte Inhalte aus. Wissensdokumente, interne Notizen, Arbeitsstände und Entwürfe gehören nicht dazu, auch wenn das Repository öffentlich ist.

Effekt. Vor einem Push, der die Seite ändert, wird der ausgelieferte Baum `docs/` auf solches Material geprüft.

### ADR-009 Einträge gleicher Signatur sind ein Brief

Kontext. Eine Edition kann denselben Brief mehrfach verzeichnen, etwa in der Datei jedes beteiligten Konvoluts. Bei Stefan Zweig Digital tragen 2.135 Einträge 1.633 verschiedene Signaturen ([data.md](data.md#stefan-zweig-digital-tei-auf-briefebene-kein-cmif)). Jede Zählung nach Einträgen überschätzt Briefe, Personenhäufigkeiten und Jahresbalken.

Wahl. Einträge mit gleicher Signatur werden ein Brief, außer ihre maschinenlesbaren Datierungen widersprechen sich, weil eine Signatur auch ein Bündel bezeichnen kann. Der erste Eintrag mit Datum führt, die anderen füllen nur, was ihm fehlt. Der Brief behält alle Einträge (`records`) und den Vermerk, ob sie sich in Absender, Empfängern oder Ort unterscheiden (`recordsDiffer`).

Begründung. Das Werkzeug entscheidet nicht zwischen abweichenden Einträgen, es zeigt sie. Zusammengeführt wird nur über ein Merkmal, das die Quelle selbst vergibt.

Effekt. Die Übersicht nennt Einträge und Briefe, die Seitenleiste filtert „Mehrfach verzeichnet“ und „Einträge weichen ab“, der Briefdialog listet die Einträge. Entstanden in der Iteration vom November 2026, Befund eines Browser-Prüfers, an den Quelldateien bestätigt ([Journal](journal.md)).

### ADR-010 Unplausible Jahre kennzeichnen, nicht korrigieren

Kontext. Das Projekt korrigiert keine Daten ([project.md](project.md)). Eine Quelle kann ein zweistelliges Jahr ins falsche Jahrhundert auflösen. Wenige solche Briefe dehnen jede Zeitachse, den Zeitraum der Übersicht und jede Sortierung.

Wahl. Trennt eine Lücke von mindestens 40 Jahren weniger als ein Zwanzigstel der datierten Briefe vom Rest, gelten diese Briefe als unplausibel datiert. Sie behalten ihr Datum, wie die Quelle es gibt, verlieren aber ihr Jahr, stehen also bei den Briefen ohne Platz auf der Zeitachse, und tragen das Wort „unplausibel“.

Begründung. Eine stille Korrektur wäre eine Aussage über die Quelle, die dem Werkzeug nicht zusteht. Eine ungekennzeichnete Anzeige stellt den Fehler als gesichertes Datum dar.

Effekt. Die Regel ist eine Heuristik und kann einen echten Nachzügler treffen, etwa einen einzelnen späten Brief eines Nachlasses. Der Filter „Datum unplausibel“ listet alle Betroffenen zur Prüfung an der Quelle.
