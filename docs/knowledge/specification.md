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
updated: 2026-10-29
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
- NFR-05: Alle interaktiven Elemente sind per Tastatur bedienbar und haben einen sichtbaren Fokus. Maßstab: [design.md](design.md#9-accessibility).

## Epics und User Stories

Die Stories adressieren Forschende in den Digital Humanities, der Geschichts- und Literaturwissenschaft, Archive und Bibliotheken, Editionsprojekte und eine interessierte Öffentlichkeit. Sie sind aus der Entwicklungspraxis abgeleitet und nicht mit Nutzenden validiert. Ihr Umsetzungsstand ist nicht systematisch gegen den Code geprüft. Bekannte Abweichungen führt [plan.md](plan.md#offene-befunde).

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

#### US-03 Beispieldatensatz erkunden

Als neue Nutzerin möchte ich einen Beispieldatensatz laden, um die Funktionen des Werkzeugs kennenzulernen.

- Vorprozessierter HSA-Datensatz verfügbar
- Laden mit einem Klick

### Überblick und Statistik

#### US-04 Datensatz-Statistiken sehen

Als Forschende möchte ich auf einen Blick sehen, wie viele Briefe, Personen und Orte der Datensatz enthält.

- Statistik-Cards mit Kernzahlen
- Zeitraum (minimales und maximales Jahr)
- Anzahl der Orte mit und ohne Koordinaten

#### US-05 Zeitliche Verteilung verstehen

Als Forschende möchte ich die zeitliche Verteilung der Korrespondenz sehen, um Hochphasen und Lücken zu erkennen.

- Timeline als Balkendiagramm
- Gruppierung nach Jahr oder Dekade
- Zeitfilter per Klick

#### US-27 Datensatz-Übersicht als Einstieg

Als Forschende möchte ich beim Laden eines Datensatzes eine Übersicht sehen, um Datenqualität und Struktur sofort einschätzen zu können.

- Übersicht als Standardansicht beim Laden
- Statistik-Cards für Briefe, Korrespondenten, Orte und Zeitraum
- Balken für exakte Datierungen, identifizierte Personen und georeferenzierte Orte
- Quellen-Metadaten aus dem teiHeader (Editor, Publisher, Lizenz)
- Die fünf aktivsten Korrespondenten mit Briefanzahl
- Sprachverteilung bei mehrsprachigen Datensätzen
- Ansichtsempfehlungen auf Basis der Datenqualität
- Schnellzugriff auf die anderen Ansichten
- Sidebar ausgeblendet für volle Breite

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

- Force-Directed Graph mit D3.js
- Knoten sind Personen, Größe nach Briefanzahl
- Kanten sind Briefwechsel, Stärke nach Briefanzahl
- Zoom und Drag
- Filter nach Mindestzahl der Briefe
- Klick auf eine Person filtert die Briefe

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
- Schnellfilter in der Sidebar mit den fünf häufigsten Themen

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

- Filterzustand in der URL codiert
- Empfänger sehen dieselbe Ansicht

#### US-21 Als CSV exportieren

Als Forschende möchte ich die gefilterten Briefe als CSV exportieren, um sie in Tabellenkalkulation oder anderen Werkzeugen zu analysieren.

- Export der aktuell gefilterten Briefe
- Spalten ID, Datum, Absender, Empfänger, Ort, Sprache

#### US-22 Als JSON exportieren

Als Entwicklerin möchte ich die Daten als JSON exportieren, um sie programmatisch weiterzuverarbeiten.

- Vollständige Datenstruktur mit Indizes

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

- Zeitstrahl von den ältesten zu den jüngsten Briefen
- Gruppierung nach Jahren mit Jahresmarken
- Jeder Brief zeigt Datum, Absender, Empfänger und Ort
- Klick öffnet den Brief-Dialog
- Nachladen in Blöcken bei großen Datensätzen

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
- Jede Frage zeigt einen mehrstufigen Pfad durch die Ansichten, die Schritte navigieren zur Ansicht
- Vorschauen mit schnellen Antworten
- Nicht beantwortbare Fragen nennen die fehlenden Daten und Anreicherungsmöglichkeiten

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
- Der Wissenskorb in der Sidebar sammelt die Auswahl der aktuellen Ansicht
- Der Korb bleibt in localStorage über Browser-Neustarts erhalten und synchronisiert sich zwischen Tabs
- Die Navigation zeigt die Zahl der gesammelten Einträge und führt zur Analyseseite `wissenskorb.html`

#### US-36 Kontextuelle Korb-Aktionen

Als Forschende möchte ich aus jeder Detailansicht Einträge in den Korb legen, um ohne Seitenwechsel zu sammeln.

- Brief-Dialog mit Umschalter für den einzelnen Brief
- Personen-Dialog und Orts-Detail legen alle Briefe der Person oder des Orts in den Korb
- Eine Rückmeldung nennt die Zahl der hinzugefügten Einträge, bereits gesammelte Einträge sind markiert

### Vergleich

#### US-37 Elemente vergleichen

Als Forschende möchte ich zwei Personen, Zeiträume oder Orte nebeneinander vergleichen, um Unterschiede und Gemeinsamkeiten der Korrespondenz zu erkennen.

- Drei Modi für Personen, Zeiträume und Orte
- Zwei Spalten mit Briefanzahl, Zeitraum, häufigsten Orten, Themen und Sprachen
- Überschneidungen bei gemeinsamen Briefen, Korrespondenten, Themen und Zeiträumen
- Schnellauswahl häufiger Einträge und Suche mit Autovervollständigung
- Die gemeinsamen Briefe öffnen sich als Liste und von dort im Brief-Dialog

## Funktionsumfang

Die Ansichten von `explore.html` und ihre Umsetzung beschreibt [architecture.md](architecture.md#ansichten). Die Zuordnung zu den Stories:

| Ansicht | Stories |
|---|---|
| Übersicht mit Forschungspfaden | US-04, US-27, US-33 |
| Karte | US-06, US-07, US-08 |
| Korrespondenten | US-09, US-10, US-23 |
| Briefe und Brief-Dialog | US-12, US-13, US-14 |
| Timeline | US-05 |
| Themen | US-17, US-24, US-25, US-26 |
| Orte | US-07, US-08 |
| Netzwerk | US-11 |
| Chronik | US-28 bis US-32 |
| Aktivität | US-34 |
| Vergleich | US-37 |
| Wissenspfade und Datenkorb (`wissenskorb.html`) | US-35, US-36 |
| Sidebar und Navigation | US-15 bis US-22 |
| Startseite | US-01 bis US-03 |

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
