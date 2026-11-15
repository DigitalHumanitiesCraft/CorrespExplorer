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
updated: 2026-11-15
authors: [Christopher Pollin]
template:
  name: Vorlage Specification
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/specification
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-specification
related: [project, data, architecture, design, testing, uncertainty-specification, plan]
---

# Specification

Die Specification hält fest, was CorrespExplorer für Forschende leisten soll und warum es so gebaut ist. Die Anforderungen ändern sich selten, die Stories nennen ihren Stand im Werkzeug, die Entscheidungen wachsen monoton und werden bei Revision durch einen neuen Eintrag abgelöst. Die Behandlung unsicherer Daten spezialisiert [uncertainty-specification.md](uncertainty-specification.md), was offen ist, führt [plan.md](plan.md).

## Anforderungen

Die funktionalen Anforderungen stehen als Kriterien bei den Stories.

- NFR-01: Die Anwendung läuft vollständig im Browser ohne Backend. Hochgeladene Dateien verlassen den Rechner nicht, URL-Importe laden direkt von der angegebenen Quelle. Maßstab: keine Serverkomponente im Repository, Auslieferung als statische Seite über GitHub Pages.
- NFR-02: Kein Build-Schritt. Maßstab: `docs/` ist ohne Werkzeugkette lauffähig ([architecture.md](architecture.md#entwurfsmuster)).
- NFR-03: Werte aus den Daten und aus Wikidata werden vor jeder Ausgabe in HTML escaped, Links nur mit `http` und `https` gesetzt. Maßstab: Suite Security gegen `test-hostile.xml`.
- NFR-04: Unsicherheit und Lücken in den Daten bleiben sichtbar und werden nicht durch falsche Präzision überdeckt. Maßstab: [uncertainty-specification.md](uncertainty-specification.md) und der Abschnitt [Lücken, Unsicherheit und Prüfstand](#lücken-unsicherheit-und-prüfstand).
- NFR-05: Alle interaktiven Elemente sind per Tastatur bedienbar und haben einen sichtbaren Fokus. Jede Figur hat einen Tastaturweg zu denselben Daten. Maßstab: [design.md](design.md#barrierefreiheit).

## Epics und User Stories

Die Stories adressieren Forschende in den Digital Humanities, der Geschichts- und Literaturwissenschaft, Archive, Bibliotheken und Editionsprojekte. Sie sind aus der Entwicklungspraxis abgeleitet und nicht mit Forschenden validiert. Die Stories US-01 bis US-39 hat der Operator über die Entwicklung hinweg angenommen oder entschieden (zuletzt [ADR-007](#adr-007-umfang-der-stories-nach-dem-abgleich-mit-dem-code)). Die Stories US-40 bis US-45 sind Vorschläge der distillierenden Session vom 2026-11-14, US-46 bis US-48 der distillierenden Session vom 2026-11-15, für Funktionen, die der Operator verlangt hat und die bis dahin keine Story abdeckte. Sie bleiben Vorschläge, bis der Operator sie annimmt.

Jede Story nennt ihren Stand im Werkzeug, festgestellt am Code vom 2026-11-15 nach dem Refactoring, das auf die Distillation in `db2befc` folgte. Vom Operator gesehen ist davon nur, was bei der Story so genannt ist.

- bedient: Das Werkzeug erfüllt die Kriterien, an der genannten Stelle.
- geändert: Das Werkzeug dient der Story auf anderem Weg als ihre Kriterien beschreiben. Die Abweichung ist genannt.
- nicht mehr bedient: Die Oberfläche bietet die Story nicht mehr an.
- nicht bedient: Die Story ist ein Vorhaben.

Jede Story hat eine feste Aufgabe am gebündelten Hugo Schuchardt Archiv (`explore.html?json=data/hsa-letters.json`), deren Antwort ein Skript aus `docs/data/hsa-letters.json` unabhängig von der Oberfläche berechnet. Die Aufgabe nennt die Rechenregel, die berechneten Antworten mit Datum stehen in [testing.md](testing.md#feste-aufgaben). Die Regeln zählen wie das Werkzeug: eine Person über `personKey` (Normdaten-ID, sonst Registerkennung, sonst Name) als Absender oder Empfänger, ein Ort über `placeKey` (GeoNames-ID, sonst Name) ohne Platzhalter wie „Unbekannt“, ein Jahr nur, wenn es zwischen 1400 und 2100 liegt und kein Zeitraum über mehrere Jahre ist. Wo die Antwort nicht aus der Datei folgt, sagt die Aufgabe das.

### Startfigur und Überblick

#### US-03 Beispieldatensatz erkunden

Als neue Nutzerin möchte ich einen Beispieldatensatz laden, um die Funktionen des Werkzeugs kennenzulernen.

- Tutorial und Hugo Schuchardt Archiv sind mit einem Klick zu öffnen.
- Links auf den Tutorial-Datensatz (`explore.html?…&demo=true`) öffnen ihn auch in einem neuen Tab, die Tour erscheint einmal je Browser und entfällt mit `tour=0`.

Stand: geändert. Die Startseite bietet das Hugo Schuchardt Archiv als Vorgabe und „Im Explorer öffnen“, das Tutorial hat sie auf Auftrag des Operators verlassen (`d38b4c8`, „das Tutorial wird komplett entfernt“). Das Refactoring vom 2026-11-15 hat Tutorial und Tour auch aus Explorer und `about.html` entfernt. Ältere Links mit `demo=true` oder `tour=0` öffnen ohne Fehler, ohne Datensatz auf der Startseite mit dem Archiv. Das zweite Kriterium bedient das Werkzeug damit nicht mehr. `docs/data/demo-showcase.xml` bleibt als Testdatei ([data.md](data.md#datensätze-im-repository)).

Aufgabe: Öffnen Sie das Archiv von der Startseite. Wie viele Briefe nennt der Explorer? Antwort: Zahl der Einträge in `letters`.

#### US-04 Datensatz-Statistiken sehen

Als Forschende möchte ich auf einen Blick sehen, wie viele Briefe, Personen und Orte der Datensatz enthält.

- Kernzahlen für Briefe, Personen und Orte, der Zeitraum.

Stand: geändert. Auf der Startansicht stehen die Zahlen der Personen, Orte und Themen als Überschriften ihrer kleinen Darstellungen, die Zahl der Briefe in der Auswahlzeile, die Beschreibung des Bestands hinter dem Info-Zeichen der Schiene. Dazu die Titelzeilen der Ansichten und die Titel der Startfigur. Die Kacheln der Seitenleiste sind ausgeblendet.

Aufgabe: Wie viele Personen und wie viele Orte nennt die Startansicht? Antwort: Zahl der verschiedenen `personKey` über Absender und Empfänger aller Briefe, Zahl der verschiedenen `placeKey` der bekannten Absendeorte.

#### US-27 Datensatz-Übersicht als Einstieg

Als Forschende möchte ich beim Laden eines Datensatzes eine Übersicht sehen, um Datenlage und Struktur sofort einschätzen zu können.

- Übersicht als Standardansicht beim Laden, Kennzahlen aus den Briefen gezählt.
- Drei neutrale Angaben zu den Anteilen datierter Briefe, identifizierter Personen und georeferenzierter Orte, ohne Ampelfarben ([ADR-005](#adr-005-nicht-wertende-sprache-für-partnerdaten)).
- Quelle aus dem teiHeader mit Publisher, Lizenz und Änderungsvermerk.
- Grafiken, die einander filtern, statt Einstiegskacheln (Entscheidung des Operators vom 2026-11-14).

Stand: bedient. Explorer, Reiter „Start“: Dashboard aus Zeit mit Sprachlegende, Personen, Orten, Themen und Überlieferung ([design.md](design.md#startansicht-des-explorers)), die Beschreibung des Bestands mit den drei Angaben zur Datenlage hinter dem Info-Zeichen der Schiene. Im Stand von `b189cb5` vom Operator gesehen und gutgeheißen, der spätere Stand nicht.

Aufgabe: Wie viele Briefe sind auf den Tag datiert? Antwort: Zahl der Briefe mit `datePrecision` „day“.

#### US-40 Datenmodell eines Bestands auf einen Blick

Vorschlag, Agent, 2026-11-14. Grundlage ist die Rückmeldung des Operators zur Startseite ([design.md](design.md#rückmeldungen-des-operators)).

Als Forschende möchte ich auf der Startseite sehen, welche Angaben des Datenmodells ein Bestand enthält und wie viele seiner Briefe sie nennen, um vor dem Öffnen zu wissen, welche Fragen er beantworten kann.

- Jede Angabe des Modells steht an ihrem Platz, gefüllt mit einer kleinen echten Figur des Bestands, oder leer und benannt, wo er sie nicht enthält.
- Jede Angabe führt in die Ansicht, die sie zeigt.
- Ein Beispielbrief ist in jeder Figur markiert, eigene Daten füllen die Figur ebenso.

Stand: geändert. Startseite, `start-figures.js`. Seit `d38b4c8` erhält eine Angabe, die der Bestand nicht enthält, keinen Platz, und die Teile des Modells stehen ohne sichtbaren Namen ([US-46](#us-46-startseite-aus-dem-zusammengesetzt-was-ein-bestand-enthält)). Was fehlt, nennt ein Satz nur in der Textalternative. Damit erfüllt das Werkzeug das Kriterium „leer und benannt“ nicht mehr, auf Auftrag des Operators. Die Startseite als Figur hat er gutgeheißen, den gebauten Stand nicht gesehen.

Aufgabe: Wie viele Briefe des Archivs nennen erwähnte Personen? Antwort: Zahl der Briefe mit mindestens einem Eintrag in `mentions.persons`.

#### US-46 Startseite aus dem zusammengesetzt, was ein Bestand enthält

Vorschlag, Agent, 2026-11-15. Grundlage sind die Rückmeldung des Operators zur Startseite nach der Schärfung („sie sollten von ihrem Wissen auch dynamisch sein“) und seine Aufträge zur zusammengesetzten Fassung ([design.md](design.md#rückmeldungen-des-operators)).

Als Forschende möchte ich auf der Startseite nur die Figuren sehen, die mein Bestand füllen kann, und Beispielbestände und eigene Daten an einer Stelle wählen, um ohne leere oder falsche Figuren zu erfahren, was der Bestand enthält.

- Eine Figur erscheint nur für eine Angabe, die mindestens ein Brief enthält. Eine Figur, die etwas Fehlendes braucht, weicht einer, die mit dem Vorhandenen auskommt, etwa die Rangfolge der Ortsnamen statt der Karte.
- Das Hugo Schuchardt Archiv ist die Vorgabe. Beispielbestände und eigene Daten stehen in einem Element, eigene Daten werden nach denselben Regeln zusammengesetzt.
- Jede Zeile des Beispielbriefs und ihre Marke in einer Figur zeigen dieselbe Nummer.

Stand: bedient, nicht abgenommen. Startseite, `start-compose.js` mit `composeFigure()`, `start-figures.js`, gebaut in `d38b4c8`, vom Operator nicht gesehen.

Aufgabe: Zeigt die Startseite des Archivs eine Figur zu Poststempeln? Antwort: nein, wenn kein Brief in `hsa-letters.json` ein Feld `postmark` hat.

### Die vier großen Ansichten

Netzwerk, Karte, Raum-Zeit und Themen sind die vier großen Ansichten über einer gemeinsamen Auswahl (Entscheidung des Operators vom 2026-11-14, [plan.md](plan.md#richtung)).

#### US-11 Korrespondenznetzwerk visualisieren

Als Forschende möchte ich sehen, wer mit wem korrespondiert hat, um Netzwerke und Cluster zu erkennen.

- Ein Klick oder Enter auf eine Person setzt den Filter.
- Das ganze Netzwerk mit den Arten Briefwechsel, Zeitgenossen und Themen bleibt erreichbar. Eine Kante des Briefwechsels verbindet zwei Personen, die einander schrieben, ihre Stärke folgt der Zahl der Briefe in beide Richtungen.
- Unter dem Netzwerk steht eine Tabelle der gezeigten Verbindungen hinter einem Schalter.

Stand: geändert. Personen, Darstellung „Netzwerk“: Die Ansicht öffnet als Korrespondenzkreis um eine Person ([US-42](#us-42-umfeld-einer-person-mit-korrespondenz-und-erwähnten)), das ganze Netzwerk ist die Stufe „Gesamt“ des Schalters.

Aufgabe: Welche Person steht im Kreis um Hugo Schuchardt der Mitte am nächsten, mit wie vielen Briefen? Antwort: Für jeden Brief, an dem Schuchardt (VIAF 261931943) beteiligt ist, zählt die Gegenseite (der Absender, oder bei Schuchardt als Absender jeder andere Empfänger). Die Person mit der größten Zahl.

#### US-42 Umfeld einer Person mit Korrespondenz und Erwähnten

Vorschlag, Agent, 2026-11-14. Grundlage ist der vom Operator freigegebene Entwurf der vier Ansichten.

Als Forschende möchte ich eine Person mit ihren Korrespondenten und den Personen sehen, die in diesen Briefen erwähnt werden, um ihr Umfeld Name für Name zu lesen und Dritte zu finden, die weder schreiben noch Post bekommen.

- Abstand zur Mitte nach Zahl der Briefe, Winkel nach Beginn des Briefwechsels, Linien nur zwischen Korrespondenten, die einander schreiben.
- Ein Schalter zwischen den Stufen Korrespondenz und Erwähnte nennt die Zahl jeder Stufe.
- Ein Klick auf einen Korrespondenten wählt die Briefe zwischen beiden.

Stand: bedient, nicht abgenommen. Personen, Darstellung „Netzwerk“, `network-view.js`.

Aufgabe: Wie viele Korrespondenten hat Schuchardt im Kreis? Antwort: Zahl der verschiedenen Gegenseiten nach der Regel von US-11.

#### US-06 Korrespondenz auf der Karte sehen

Als Forschende möchte ich die Absendeorte auf einer Karte sehen, um die räumliche Verteilung zu verstehen.

- Zoom und Pan, Clustering bei vielen Punkten, Kreisgröße und Zahl nach Briefen.

Stand: bedient. Orte, Darstellung „Karte“.

Aufgabe: Von welchem Ort kommen die meisten Briefe, wie viele? Antwort: der `placeKey` mit den meisten Briefen unter den bekannten Absendeorten.

#### US-07 Orts-Details abrufen

Als Forschende möchte ich auf einen Ort klicken, um zu sehen, wie viele Briefe von dort gesendet wurden und von wem.

- Anzahl der Briefe und die fünf häufigsten Absender.

Stand: bedient. Popup der Karte und Detail der Ortsliste.

Aufgabe: Wie viele Briefe schrieb Schuchardt aus Graz? Antwort: Briefe mit `place_sent.geonames_id` 2778067 und Absender Schuchardt.

#### US-08 Fehlende Koordinaten erkennen

Als Forschende möchte ich wissen, welche Orte keine Koordinaten haben, um die Datenlage einschätzen zu können.

- Die Orte ohne Koordinaten sind genannt und als Liste abrufbar.

Stand: bedient. Orte, Darstellung „Liste“, Kennzeichnung „ohne Koordinaten“. Raum-Zeit nennt die Briefe ohne Koordinaten in ihrer Notiz.

Aufgabe: Wie viele Orte mit GeoNames-ID haben keine Koordinaten? Antwort: verschiedene GeoNames-IDs der Absendeorte mit leerem `lat`.

#### US-41 Orte über die Zeit lesen

Vorschlag, Agent, 2026-11-14. Grundlage ist die Rückmeldung des Operators zur Raum-Zeit-Ansicht.

Als Forschende möchte ich die Absendeorte und die Jahre in einer Figur sehen, um zu erkennen, wann von wo geschrieben wurde und wie sich der Raum einer Korrespondenz verschiebt.

- Von oben liest sich die Figur als Karte, von vorn als Zeitleiste je Ort. Ein Knopf führt in jede der drei Blickrichtungen zurück.
- Erster Klick wählt einen Ort, zweiter Klick ein Jahr dieses Orts, Escape löst die Wahl schrittweise.
- Ein Ort ist über eine Suche über der Ortsliste zu finden, jede Ortszeile bietet ihre Jahre als Auswahl.

Stand: bedient, nicht abgenommen. Orte, Darstellung „Raum-Zeit“, `spacetime-view.js`.

Aufgabe: In welchem Jahr kamen die meisten Briefe aus Paris, wie viele? Antwort: Briefe mit GeoNames-ID 2988507 je gültigem Jahr, das Jahr mit der größten Zahl.

#### US-24 Themen durchsuchen

Als Forschende möchte ich alle Themen des Datensatzes durchsuchen, um relevante Diskurse zu finden.

- Suchfeld über alle Themen, Briefanzahl je Thema.

Stand: bedient, nicht abgenommen. Themen, Suche über dem Raster, die jedes Thema erreicht, und die Zahl der Briefe am Ende jeder Zeile. Gebaut in `7cbe3c3` ([US-44](#us-44-themen-als-verläufe-über-die-zeit)).

Aufgabe: Welches Thema, das keine Sprache ist, nennen die meisten Briefe? Antwort: Briefe je `mentions.subjects[].uri`, ohne die Kategorien `lexvo` und `hsa_language`.

#### US-25 Thema im Detail ansehen

Als Forschende möchte ich zu einem Thema sehen, wer darüber geschrieben hat und wann.

- Korrespondenten, zeitliche Verteilung und verwandte Themen über gemeinsame Briefe.

Stand: bedient, nicht abgenommen. Ein Streifen unter Raster und Anteile nennt Korrespondenten, Orte und benachbarte Themen der Wahl, je als eigener Filter. Die zeitliche Verteilung zeigt die Zeile des Themas im Raster, in den Anteilen steht sie unter der Karte.

Aufgabe: Wer schreibt außer Schuchardt die meisten Briefe zum Thema „Publikationsversand“ (`https://gams.uni-graz.at/o:hsa.subjects#S.948`)? Antwort: Personen nach `personKey` in den Briefen mit diesem Thema, ohne Schuchardt, nach Briefzahl.

#### US-26 Nach Thema filtern in allen Ansichten

Als Forschende möchte ich alle Briefe filtern, die ein bestimmtes Thema erwähnen.

- Ein Thema zu wählen setzt den Filter, er erscheint als entfernbare Marke im Satz der Auswahl, alle Ansichten zeigen nur seine Briefe.

Stand: bedient. Themenansicht, Startansicht, Auswahlzeile.

Aufgabe: Wie viele Briefe hält die Auswahl „Publikationsversand“? Antwort: Briefe mit dieser URI in `mentions.subjects`.

#### US-17 Nach Thema filtern in der Seitenleiste

Als Forschende möchte ich in der Seitenleiste nach Themen filtern.

Stand: nicht mehr bedient. Die Themenliste der Seitenleiste ist seit 2026-11-14 entfernt, ein Thema wählt man in der Themenansicht oder in der Startansicht. Die Story geht in US-24 und US-26 auf und ist ein Kandidat zur Streichung.

Aufgabe: entfällt mit der Story.

#### US-44 Themen als Verläufe über die Zeit

Vorschlag, Agent, 2026-11-14. Grundlage sind die Rückmeldung des Operators („die Themen“ unter den guten Ansichten) und der freigegebene Entwurf.

Als Forschende möchte ich sehen, wann Themen in der Korrespondenz aufkommen und mit wem sie verbunden sind, um Diskurse über die Zeit zu verfolgen.

- Jedes Thema ist eine Zeile mit seinen Briefen je Jahr auf gemeinsamer Achse, die häufigsten oben, geordnet nach ihrem Höhepunkt.
- Sprachen als Themen stehen getrennt von den übrigen Themen.

Stand: geändert, nicht abgenommen. Themen, Darstellung „Raster“, `topics-view.js`, gebaut in `7cbe3c3` nach der Wahl des Operators („Raster als Hauptfigur, Treemap als Anteile daneben“). Die Zeile ist eine Folge von Zellen je Jahr auf einer festen Skala statt eines Kamms, die Ordnung lässt sich auf Umfang und erstes Auftreten umstellen. Die Treemap „Anteile“ gruppiert nach der Art des Themas, Sprachen eingeschlossen. Das Raster führt Sprachen nicht getrennt, sie stehen zwischen den übrigen Themen im selben Datenton, nur die Spalte „Art“ der Tabelle unterscheidet sie (am 2026-11-15 von der kuratierenden Session im Browser am HSA gesehen). Das zweite Kriterium erfüllt das Raster damit nicht. Den Endstand hat der Operator nicht gesehen.

Aufgabe: In welchem Jahr erreicht „Publikationsversand“ seinen Höhepunkt? Antwort: Briefe des Themas je gültigem Jahr, das Jahr mit der größten Zahl.

### Die Auswahl und ihre Briefe

#### US-43 Briefe der Auswahl unter jeder Ansicht

Vorschlag, Agent, 2026-11-14. Grundlage ist der vom Operator freigegebene Entwurf („Die Briefe der Auswahl stehen in jeder Ansicht als ausklappbare Liste bereit“).

Als Forschende möchte ich unter jeder Figur die Briefe meiner Auswahl öffnen, ohne die Figur zu verlassen, um vom Muster zum Beleg und zurück zu gehen.

- Eine Zeile nennt die Zahl der Auswahl und öffnet die Liste über der Ansicht, die Ansicht behält ihren Zustand.
- Der offene Zustand steht in der URL.

Stand: bedient, nicht abgenommen. In der Auswahlzeile unter jeder Ansicht außer der Briefliste, `letters-drawer.js`.

Aufgabe: Wählen Sie in der Zeitansicht das Jahr 1900. Wie viele Briefe nennt die Zeile? Antwort: Briefe mit gültigem Jahr 1900.

#### US-10 Briefe einer Person filtern

Als Forschende möchte ich alle Briefe einer bestimmten Person sehen, um deren Korrespondenz zu analysieren.

- Ein Klick auf eine Person filtert, eine Marke im Satz der Auswahl zeigt den Filter und hebt ihn auf.
- Eine zweite Person beschränkt auf die Briefe zwischen beiden.

Stand: bedient. Personenliste, Korrespondenzkreis, Startansicht, Marke in der Auswahlzeile.

Aufgabe: Wie viele Briefe hält die Auswahl Leo Spitzer? Antwort: Briefe, an denen VIAF 71397982 als Absender oder Empfänger beteiligt ist.

#### US-09 Korrespondenten durchsuchen

Als Forschende möchte ich alle Korrespondenten durchsuchen und sortieren, um wichtige Kontakte zu identifizieren.

- Durchsuchbare Liste, Sortierung nach Briefanzahl und Name, gesendet und empfangen.

Stand: bedient. Personen, Darstellung „Liste“. Der Entwurf der vier Ansichten sieht die Listen als Ergebnis einer Auswahl, der Operator will Listen und Vergleich zusammenlegen ([plan.md](plan.md#listen-und-vergleich)).

Aufgabe: Wer steht nach Briefanzahl an zweiter Stelle? Antwort: Briefe je `personKey` über Absender und Empfänger, Rang 2.

#### US-12 Briefe durchsuchen

Als Forschende möchte ich alle Briefe durchsuchen und sortieren, um bestimmte Korrespondenzen zu finden.

- Suche, Sortierung nach Datum und Absender, Zahl der Treffer über der Liste.

Stand: bedient. Reiter „Briefe“. Sortiert wird nach Datum (neueste oder älteste zuerst), Person und Ort, nach Person bei einer zentralen Person nach der Gegenseite. Zeilen nennen die Gegenseite der zentralen Person mit „von“ und „an“, Gruppen nach Jahr oder Anfangsbuchstabe, ein Jahresprofil über der Liste springt zu den Gruppen ([design.md](design.md#briefe)). Gebaut in `c6185bc`, vom Operator nicht gesehen.

Aufgabe: Welcher Brief steht nach „Datum (älteste)“ zuerst? Antwort: der Brief mit dem kleinsten `date`.

#### US-13 Brief-Details ansehen

Als Forschende möchte ich alle Metadaten eines Briefs sehen, einschließlich erwähnter Personen, Orte und Themen.

- Dialog mit allen Angaben der Quelle, Links zu Normdaten, erwähnte Entitäten.

Stand: bedient. Dialog aus jeder Briefzeile, der Briefliste wie dem Auszug unter den Ansichten.

Aufgabe: Wie viele erwähnte Personen, Orte und Themen nennt der Dialog von `o:hsa.letter.654`? Antwort: Längen von `mentions.persons`, `mentions.places`, `mentions.subjects` dieses Briefs.

#### US-14 Zur Quelle navigieren

Als Forschende möchte ich von einem Brief zur Edition navigieren, um den Volltext zu lesen.

- Link zur Quell-URL in neuem Tab, sofern vorhanden.

Stand: bedient im Dialog. Für Briefsätze ohne `correspDesc/@ref` fehlt ein Link ([plan.md](plan.md#daten-und-parser)).

Aufgabe: Wohin führt der Link von `o:hsa.letter.654`? Antwort: sein Feld `url`.

#### US-16 Nach Sprache filtern

Als Forschende möchte ich nach Briefsprache filtern, um etwa nur französische Briefe zu sehen.

- Sprachen mit ihrer Farbe und Briefanzahl, Mehrfachauswahl.

Stand: bedient. Feld „Sprache“ der Schiene, die Sprachlegende der Startansicht und jede Sprache der Legende der Zeitansicht.

Aufgabe: Wie viele Briefe sind französisch? Antwort: Briefe mit `language.code` „fr“.

#### US-18 Filter kombinieren

Als Forschende möchte ich mehrere Filter kombinieren, um komplexe Anfragen zu stellen.

- Alle Filter gleichzeitig, UND-Verknüpfung.

Stand: bedient.

Aufgabe: Wie viele französische Briefe kamen zwischen 1880 und 1900 aus Paris? Antwort: Briefe mit GeoNames-ID 2988507, `language.code` „fr“ und gültigem Jahr von 1880 bis 1900.

#### US-19 Filter zurücksetzen

Als Forschende möchte ich alle Filter mit einem Klick zurücksetzen, um zur Gesamtansicht zurückzukehren.

Stand: bedient. „Filter aufheben“ in der Auswahlzeile, jede ihrer Marken einzeln.

Aufgabe: Nach dem Aufheben aller Filter, wie viele Briefe nennt die Zeile unter der Ansicht? Antwort: Zahl aller Briefe.

#### US-23 Mit correspSearch verknüpfen

Als Forschende möchte ich von einer Person zu ihrer Suche bei correspSearch navigieren, um weitere Korrespondenzen zu finden.

Stand: bedient im Personen-Dialog.

Aufgabe: Welche Kennung enthält der Link für Leo Spitzer? Antwort: `sender.id` der Briefe von Spitzer mit `authority` „viaf“.

#### US-37 Elemente vergleichen

Als Forschende möchte ich zwei Personen, Zeiträume oder Orte nebeneinander vergleichen, um Unterschiede und Gemeinsamkeiten der Korrespondenz zu erkennen.

- Zwei Spalten mit Briefanzahl, Zeitraum, Orten, Themen und Sprachen, Überschneidungen, gemeinsame Briefe im Dialog.

Stand: geändert. „Vergleichen“ ist eine Handlung bei Personen, Orten und Zeit, der Gegenstand bestimmt, was verglichen wird. Der Vergleich hat keinen adressierbaren Zustand.

Aufgabe: Welche Korrespondenten teilen Leo Spitzer und Georges Lacombe? Antwort: Schnittmenge der Personen, die mit VIAF 71397982 und mit VIAF 34446283 je einen Brief teilen.

### Zeit

#### US-05 Zeitliche Verteilung verstehen

Als Forschende möchte ich die zeitliche Verteilung der Korrespondenz sehen, um Hochphasen und Lücken zu erkennen.

- Balken je Jahr, gestapelt nach Sprache, undatierte Briefe in einem eigenen Balken, Zeiträume über mehrere Jahre im Balken „Spanne“ (Entscheidung E5 vom 2026-11-05).
- Aufklappbare Tabelle als Textalternative.

Stand: bedient. Zeit, oberes Profil, verkleinert in der Startansicht und in der Startfigur. Die Tabelle steht hinter einem ruhigen Schalter statt in einem Aufklapper (Regel 4 in [design.md](design.md#gemeinsame-regeln-aller-ansichten)).

Aufgabe: Welches Jahr hat die meisten Briefe, wie viele, und wie viele Briefe stehen ohne Datum? Antwort: Briefe je gültigem Jahr, Maximum, und Briefe ohne `date` und ohne `dateText`.

#### US-15 Nach Zeitraum filtern

Als Forschende möchte ich die Korrespondenz auf einen Zeitraum einschränken, um Phasen zu analysieren.

- Regler für Start- und Endjahr in der Seitenleiste, alle Ansichten folgen.

Stand: bedient. Regler im Feld „Zeitraum“ der Schiene, Ziehen im Profil der Zeitansicht und im Zeitdiagramm der Startansicht, dort mit Griffen an beiden Enden. Alle drei setzen denselben Zeitraum. Ein Klick auf ein Jahr der Zeitansicht setzt den Zeitraum auf dieses Jahr, die Raum-Zeit-Ansicht setzt stattdessen ein gewähltes Jahr neben dem Zeitraum ([plan.md](plan.md#zeit)).

Aufgabe: Wie viele Briefe liegen zwischen 1900 und 1910? Antwort: Briefe mit gültigem Jahr von 1900 bis 1910.

#### US-28 Chronologische Briefansicht

Als Forschende möchte ich alle Briefe auf einem Zeitstrahl sehen, um den Verlauf der Korrespondenz nachzuvollziehen.

- Älteste zuerst, undatierte am Ende, Gruppierung nach Jahren, Nachladen in Blöcken.

Stand: geändert. Die Chronik ist in die Zeitansicht aufgegangen, deren untere Figur zeigt einen Zeitraum mit wenigen Briefen als einzelne Briefe auf einer echten Zeitachse. Älteste zuerst, undatierte am Ende und Gruppen nach Jahren bietet die Briefliste in der Ordnung „Datum (älteste)“. Was aus der Chronik entfällt, haben die Bau-Agenten entschieden, der Operator hat es nicht bestätigt ([plan.md](plan.md#warten-auf-den-operator)). Die Antwort der Aufgabe ist in der Zeitansicht ablesbar: Mit dem Zeitraum 1859 nennt die Tabelle der unteren Figur den Brief vom 12.1.1859 von Felix von Brusselle an Schuchardt (am 2026-11-15 von der kuratierenden Session im Browser abgelesen).

Aufgabe: Welcher Brief steht zuerst, von wem, an welchem Tag? Antwort: der Brief mit dem kleinsten `date`.

#### US-29 Biografische Anreicherung

Als Forschende möchte ich biografische Informationen zu den Korrespondenten sehen, um den historischen Kontext zu verstehen.

- Anreicherung über Wikidata auf ausdrückliche Aktion, nur für Personen mit Normdaten ([ADR-006](#adr-006-externe-dienste-nur-auf-ausdrückliche-aktion)).

Stand: bedient. Zeitansicht (Knopf „Lebensdaten der Personen aus Wikidata laden“), Personen-Dialog, Dialog nach dem Laden eigener Daten.

Aufgabe: keine aus `hsa-letters.json` berechenbare, die Antwort kommt von Wikidata. Prüfbar ist, dass ohne Klick keine Anfrage an Wikidata geht.

#### US-30 Alter in der Chronik

Als Forschende möchte ich das Alter der Korrespondenten zum Zeitpunkt des Briefs sehen, um ihre Lebensphasen einzuordnen.

Stand: bedient, nur nach Anreicherung, in den Angaben eines Briefs der Zeitansicht.

Aufgabe: keine aus `hsa-letters.json` berechenbare, das HSA enthält keine Lebensdaten.

#### US-31 Beziehungskontext in der Chronik

Als Forschende möchte ich den Kontext einer Korrespondenzbeziehung sehen, um Briefwechsel einordnen zu können.

- Marke des ersten Briefs zweier Personen, „Brief X von Y“, Lücken ab zwei Jahren.

Stand: geändert. In der Zeitansicht nennt jeder Brief seine Stelle im Briefwechsel („Erster von …“, „493. von 521 Briefen zwischen beiden“, „nach einer Lücke seit …“, `contextText()` in `chronik-view.js`). Eine eigene Marke in der Figur hat der erste Brief nicht mehr. Mit Leo Spitzer und dem Zeitraum 1912 nennt die Tabelle der unteren Figur den Brief vom 3.2.1912 als „Erster von 447 Briefen zwischen beiden“, die berechnete Antwort (am 2026-11-15 von der kuratierenden Session im Browser abgelesen).

Aufgabe: Wann beginnt der Briefwechsel zwischen Schuchardt und Spitzer, und wie viele Briefe umfasst er? Antwort: Briefe mit beiden als Beteiligten, der früheste `date` und die Zahl.

#### US-32 Chronik-Layout umschalten

Als Forschende möchte ich zwischen Chronik-Layouts wechseln, um je nach Frage die passende Darstellung zu wählen.

Stand: nicht mehr bedient. Die drei Layouts der Chronik sind mit ihr in die Zeitansicht aufgegangen und entfallen (`c6185bc`, Entscheidung der Bau-Agenten, vom Operator nicht bestätigt). Kandidat zur Streichung.

Aufgabe: entfällt mit der Story.

#### US-34 Korrespondenzaktivität visualisieren

Als Forschende möchte ich die Korrespondenz als Kalender sehen, um Aktivitätsphasen und Muster zu erkennen.

- Heatmap je Tag, Jahresauswahl, Klick auf einen Tag zeigt seine Briefe, der aktivste Tag nur aus tagesgenauen Daten.

Stand: geändert. Die Kalender-Heatmap ist mit der Darstellung „Tage“ entfallen, `activity-view.js` hat das Refactoring vom 2026-11-15 gelöscht. Die untere Figur der Zeitansicht zählt einen langen Zeitraum in Monaten und zeigt einen kurzen, auch jedes einzelne Jahr, Brief für Brief auf der Zeitachse. Den Satz zum briefreichsten Tag gibt es nicht mehr. Die Aufgabe ist nur mittelbar ablesbar: Mit dem Zeitraum 1912 listet die Tabelle der unteren Figur 23 Briefe vom 4.2.1912, die berechnete Zahl, aber kein Element nennt den briefreichsten Tag, und die Tabelle zeigt nur die ersten 500 der 510 Briefe des Jahrs (am 2026-11-15 von der kuratierenden Session im Browser abgelesen).

Aufgabe: Welcher Tag hat die meisten tagesgenau datierten Briefe, wie viele? Antwort: Briefe mit `datePrecision` „day“ je `date`, Maximum.

### Daten laden

#### US-01 CMIF-Datei hochladen

Als Forschende möchte ich eine lokale CMIF-XML-Datei laden, um meine eigenen Korrespondenzdaten zu visualisieren.

- Dateidialog oder Ziehen auf die Seite, Meldung bei ungültigem Format.

Stand: bedient. Startseite, Eintrag „Eigene Daten“ im Element der Bestände, Dateiwahl oder Ziehen auf die Seite. Eigene Daten füllen zuerst die Startfigur.

Aufgabe: Laden Sie `docs/data/hsa.xml` als eigene Datei. Erwartet ist entweder der Explorer mit der Zahl aller Briefe oder eine Meldung, die diese Zahl nennt, weil die Datei das Kontingent von sessionStorage überschreiten kann. Antwort: Zahl der `correspDesc` in `hsa.xml`, gleich der Zahl der Briefe in `hsa-letters.json`.

#### US-02 CMIF von URL laden

Als Forschende möchte ich eine CMIF-Datei von einer URL laden, um Daten aus Online-Repositorien zu nutzen.

- URL-Feld mit Hinweis bei CORS-Fehlern. URLs der correspSearch-API v2.0 laden alle Trefferseiten bis zu einer Obergrenze, eine Abfrage ohne Treffer öffnet keinen leeren Explorer.

Stand: bedient. Startseite, Eintrag „Eigene Daten“, Adressfeld.

Aufgabe: Laden Sie bei lokalem Server die Adresse `http://localhost:8000/data/hsa.xml`. Antwort wie US-01.

#### US-38 Edition aus vielen Dateien laden

Als Forschende möchte ich eine Edition laden, die je Korrespondenz eine TEI-Datei veröffentlicht, um den ganzen Bestand als einen Datensatz zu erkunden.

- Mehrere Dateien oder eine Dateiliste `?files=`, Briefsätze ohne Umwandlung, übersprungene Dateien gezählt, Einträge gleicher Signatur zusammengeführt ([ADR-009](#adr-009-einträge-gleicher-signatur-sind-ein-brief)).

Stand: bedient. Startseite.

Aufgabe: keine am HSA, das eine Datei ist. Geprüft wird die Story mit `verification/check-corpus.mjs` am Bestand von Stefan Zweig Digital und mit den Testdateien `test-letter-records*.xml`.

### Export und Wissenskorb

#### US-20 Gefilterte Ansicht teilen

Als Forschende möchte ich einen Link zu meiner Auswahl teilen, um Kolleg:innen eine bestimmte Auswahl zu zeigen.

- Ansicht, alle Filter (Zeitraum oder undatiert, Jahr, Sprachen, Person und Gegenüber, Ort, Thema, Qualität, Merkmale) und der offene Briefauszug stehen in der URL, ein fehlender Parameter bedeutet keinen Filter.
- Bei `?json=` sehen Empfänger dieselben Briefe. Bei hochgeladenen Dateien landen sie auf der Startseite mit einem Hinweis.
- Ein Ansichtswechsel legt einen Eintrag in der Browser-Historie an, Filteränderungen ersetzen ihn (Entscheidung E1 vom 2026-11-05). `cs=` enthält eine correspSearch-Abfrage (Entscheidung E3).

Stand: bedient.

Aufgabe: Wählen Sie Leo Spitzer und den Zeitraum 1910 bis 1920 und öffnen Sie den Link in einem neuen Tab. Wie viele Briefe nennt er? Antwort: Briefe mit Spitzer und gültigem Jahr von 1910 bis 1920.

#### US-21 Als CSV exportieren

Als Forschende möchte ich die gefilterten Briefe als CSV exportieren, um sie in anderen Werkzeugen zu analysieren.

- Export der Auswahl, deaktiviert bei null Briefen. Spalten nach `LETTER_EXPORT_COLUMNS` in `export.js`, darunter Präzision, Normdatei, Merkmale der Überlieferung, Datumsgrenze, Registerkennungen, weitere Handlungen, Datei und Entsprechungen. UTF-8-BOM für Excel (Entscheidung E4, in Excel nicht geprüft).

Stand: bedient. Kopfzeile, „Export“.

Aufgabe: Wie viele Zeilen hat der CSV-Export unter dem Sprachfilter Italienisch? Antwort: Briefe mit `language.code` „it“, ohne Kopfzeile.

#### US-22 Als JSON exportieren

Als Entwicklerin möchte ich die Daten als JSON exportieren, um sie programmatisch weiterzuverarbeiten.

- Briefe mit allen Feldern, Indizes der Personen, Orte und Themen, gezählt wie die Listen, Metadaten mit Quelle (`datasetToJson()`, Entscheidung E8).

Stand: bedient.

Aufgabe: Wie viele Personen führt der Index des ungefilterten Exports? Antwort: wie US-04.

#### US-35 Geführte Exploration mit Wissenskorb

Als Forschende möchte ich von einer Forschungsfrage geleitet durch die Ansichten gehen und dabei Briefe, Personen und Orte sammeln, um eine Exploration methodisch zu strukturieren.

- Der Wissenskorb sammelt je Datensatz in localStorage, synchronisiert zwischen Tabs und führt zur Analyseseite `wissenskorb.html`, die ihn per Link teilen kann.

Stand: geändert. Der Korb ist bedient. Die Leitung durch eine Forschungsfrage ist nicht mehr bedient, weil die Forschungspfade seit 2026-11-14 keinen Einstieg haben (Entscheidung des Operators). Leiste und Maschinerie hat das Refactoring vom 2026-11-15 aus dem Code entfernt.

Aufgabe: Legen Sie Graz in den Korb. Wie viele Briefe wertet die Analyseseite aus? Antwort: Briefe mit GeoNames-ID 2778067.

#### US-36 Kontextuelle Korb-Aktionen

Als Forschende möchte ich aus jeder Detailansicht Einträge in den Korb legen, um ohne Seitenwechsel zu sammeln.

- Brief-Dialog, Briefzeile, Kartenpopup, Personen-Dialog und Personenliste, Orts-Detail und Jahresbalken (Entscheidung E2 vom 2026-11-05). Rückmeldung mit Zahl, bei vollem Korb mit den abgewiesenen.

Stand: bedient.

Aufgabe: Setzen Sie den Stern bei Leo Spitzer. Wie viele Briefe wertet die Analyseseite aus? Antwort: wie US-10.

#### US-33 Methodisch geleitete Exploration

Als Forschende möchte ich sehen, welche Forschungsfragen mit dem aktuellen Datensatz beantwortbar sind, um meine Analyse methodisch zu strukturieren.

Stand: nicht mehr bedient. Der Operator hat die Forschungspfade am 2026-11-14 aus der Oberfläche genommen, ihre Fragen sollen in den Ansichten selbst bearbeitbar sein. `analyzeResearchQuestions()` und die Pfadleiste hat das Refactoring vom 2026-11-15 entfernt. Kandidat zur Streichung, mit [ADR-004](#adr-004-epistemische-kategorien-für-forschungsfragen).

Aufgabe: entfällt mit der Story.

### Unsicherheit und Überlieferung

#### US-39 Überlieferung eines Briefs sehen und filtern

Als Forschende möchte ich sehen, was die Edition erschlossen hat und was auf dem Brief selbst steht, um Datierung und Ort eines Briefs einschätzen zu können.

- Erschlossene Daten und Orte in eckigen Klammern mit Legende. Poststempel, Anschrift und Signatur benannt, nie als Absendeort. Alle Empfänger genannt und gezählt.
- Die Seitenleiste bietet je vorhandenem Merkmal einen Filter mit Zahl, der Zustand steht in der URL.

Stand: bedient. Gruppe „Überlieferung“ der Schiene, Briefzeile und Dialog, Feld „Überlieferung“ der Startansicht, die Figuren der Briefsätze auf der Startseite, wo der Bestand sie enthält.

Aufgabe: Wie viele Briefe nennt das Merkmal „Ohne Datum“? Antwort: Briefe ohne `date` und ohne `dateText`. Die übrigen Merkmale enthält das HSA nicht, ihre Zahl ist null.

#### US-45 Aussagen über Dritte mit ihrem Prüfstand sehen

Vorschlag, Agent, 2026-11-14. Grundlage ist die Entscheidung des Operators, dass das Werkzeug das Sichtwerkzeug für das gemeinsame Briefmodell wird.

Als Forschende möchte ich sehen, was die Briefe über dritte Personen aussagen, mit der Stelle und mit dem Stand ihrer Prüfung, um maschinelle Vorschläge von bestätigten Aussagen zu unterscheiden.

- Jede Aussage zeigt Stelle, Familie, Stimme und Stand mit ihrer Quelle ([data.md](data.md#gemeinsames-brief--und-aussagemodell)).
- Bestätigte Aussagen nennen, wer sie bestätigt hat.

Stand: nicht bedient. Das Werkzeug liest keine Aussagen. Welche Figuren sie zeigen, ist offen und beim Operator ([plan.md](plan.md#gemeinsames-briefmodell)).

Aufgabe: keine am HSA, dessen CMIF keine Aussagen enthält.

### Gemeinsame Teile der Ansichten

#### US-47 Briefe, Personen und Orte in einem Register

Vorschlag, Agent, 2026-11-15. Grundlage ist die Frage des Operators, ob sich Briefe, Personen und Orte sinnvoll in eine Ansicht zusammenführen lassen, und sein früherer Wunsch, Liste und Vergleich zusammenzuführen ([design.md](design.md#rückmeldungen-des-operators)). Die Frage hatte eine klare Neigung und war noch kein Auftrag zum Umbau.

Als Forschende möchte ich Briefe, Personen und Orte in einer Ansicht durchsuchen und dort gleich nach Person und Ort filtern, um ohne doppelte Listen vom Register zu den Briefen zu kommen.

- Eine Ansicht führt Briefe, Personen und Orte mit Facetten, eine Wahl in einer Facette filtert die anderen.
- Sie steht zuerst als kleine echte Fassung am Hugo Schuchardt Archiv neben den bestehenden Ansichten, nichts Bestehendes entfällt vor dem Vergleich durch den Operator.

Stand: nicht bedient.

Aufgabe: Wie viele Briefe nennt das Register für Graz als Absendeort? Antwort: wie US-06.

#### US-48 Die Auswahl an einem Ort

Vorschlag, Agent, 2026-11-15. Grundlage sind der Satz des Operators zur Startansicht („Vielleicht kann man das dort, wo die Filter sind, irgendwie zusammenführen“) und Regel 1 der [gemeinsamen Regeln](design.md#gemeinsame-regeln-aller-ansichten), die er nicht einzeln bestätigt hat.

Als Forschende möchte ich in jeder Ansicht an derselben Stelle sehen, wie viele Briefe meine Auswahl enthält und welche Filter sie bilden, um nie zu vergessen, dass eine Figur gefiltert ist.

- Eine Zeile am unteren Rand jeder Ansicht nennt die Zahl in der Form „x von y Briefen“, die Filter als entfernbare Marken und „Filter aufheben“, und öffnet die Briefe.
- Titel, Regler und andere Zeilen wiederholen Zahl und Filter nicht.

Stand: bedient, nicht abgenommen. Auswahlzeile in `explore.html` und `letters-drawer.js`, gebaut in der Nacht zum 2026-11-15, vom Operator nicht gesehen. In der Briefliste wiederholt die Zeile über der Liste die Zahl ([plan.md](plan.md#durchgang-nach-den-gemeinsamen-regeln)).

Aufgabe: Wählen Sie in der Startansicht die Sprache Französisch. Welche Zahl nennt die Auswahlzeile? Antwort: wie US-16.

## Lücken, Unsicherheit und Prüfstand

- Unsichere Werte haben Farbe und Symbol, exakte bleiben unmarkiert ([ADR-002](#adr-002-unsicherheit-sichtbar-machen), [uncertainty-specification.md](uncertainty-specification.md)).
- Briefe ohne Jahr, mit einer einzelnen Datumsgrenze, mit unplausiblem Jahr oder einem Zeitraum über mehrere Jahre stehen neben der Zeitachse in eigenen Balken und werden in jeder Figur gezählt, die sie nicht zeichnet. Raum-Zeit nennt die Briefe ohne Jahr und ohne Koordinaten in einer Notiz.
- Eine Angabe des Datenmodells, die ein Bestand nicht enthält, erhält auf der Startseite keinen Platz. Ein Satz in der Textalternative nennt, was fehlt. Den sichtbaren Satz hat der Operator am 2026-11-14 entfernen lassen, Regel 9 der gemeinsamen Regeln sieht ihn einmal als ruhigen Satz vor.
- Lücken in fremden Daten heißen Anreicherungspotential ([ADR-005](#adr-005-nicht-wertende-sprache-für-partnerdaten)).
- Einen Prüfstand von Aussagen zeigt das Werkzeug nicht, weil es keine Aussagen liest. Alles, was es zeigt, ist die Angabe der Edition, wie die Quelle sie gibt. Eine Unterscheidung von bestätigten und vorgeschlagenen Aussagen kommt erst mit [US-45](#us-45-aussagen-über-dritte-mit-ihrem-prüfstand-sehen).

## Funktionsumfang

Ansichten und Funktionen von `explore.html` und `index.html` mit den Stories, denen sie dienen. Aufbau und Gestaltung beschreiben [architecture.md](architecture.md#module) und [design.md](design.md).

| Ort | Ansicht oder Funktion | Stories |
|---|---|---|
| Startseite | Startfigur aus dem Bestand, Element der Bestände mit eigenen Daten | US-01, US-02, US-03, US-38, US-40, US-46 |
| Start | Dashboard, Sprachlegende | US-04, US-16, US-27 |
| Briefe | Briefliste und Brief-Dialog | US-12, US-13, US-14, US-28, US-39 |
| Personen | Liste, Netzwerk (Kreis und Gesamt), Erwähnungen, Vergleich | US-09, US-10, US-11, US-23, US-37, US-42 |
| Orte | Karte, Raum-Zeit, Liste, Vergleich | US-06, US-07, US-08, US-37, US-41 |
| Zeit | Zeit, Vergleich | US-05, US-15, US-28 bis US-31, US-34, US-37 |
| Themen | Raster und Anteile | US-24, US-25, US-26, US-44 |
| unter jeder Ansicht | Auswahlzeile mit Briefauszug | US-10, US-19, US-43, US-48 |
| Schiene | Bestand, Zeitraum, Sprache, Datenlage, Merkmale, Korb | US-15, US-16, US-18, US-27, US-39 |
| nicht gebaut | Register aus Briefen, Personen und Orten | US-47 |
| Kopfzeile | Export, Korb | US-21, US-22, US-35, US-36 |
| `wissenskorb.html` | Analyseseite des Korbs | US-35, US-36 |

Ohne Story und damit Kandidaten zur Streichung, die der Operator entscheidet:

- Die Darstellung „Erwähnungen“ (Erwähnungsfluss, `mentions-view.js`). Keine Story verlangt sie, die Stufe „Erwähnte“ des Korrespondenzkreises zeigt dieselben Personen.
- Der Dialog „Datensatz konfigurieren“ nach dem Laden eigener Daten dient mit der Personenanreicherung US-29, mit der Georeferenzierung keiner Story. Ob er bleibt, fragt [plan.md](plan.md#startfigur).
- Ausgeblendete Reste im Markup, die weiter befüllt werden: die Kacheln der Seitenleiste und die verborgene Moduswahl des Vergleichs.
Forschungspfade, Tour des Tutorials, Kalender-Heatmap und die Knöpfe „Chronik“ und „Tage“ standen hier als Kandidaten, das Refactoring vom 2026-11-15 hat sie entfernt ([architecture.md](architecture.md#ungenutzt)).

Funktionen, die der Operator verlangt hat und die noch keine angenommene Story haben, sind US-40 bis US-48.

## Entscheidungen

Die Gründungsentscheidungen E1 bis E4 und E9 bis E12 (CMIF als Austauschformat, Normdaten-Agnostik, Wikidata für Koordinaten, briefzentrierte Struktur, Parsing im Browser, hybrides Speichermodell, URL-State, Themen-Explorer) stehen mit Kontext im [Journal](journal.md). Die Entscheidungen E1 bis E10 vom 2026-11-05 stehen dort im Eintrag des Tages und sind in den Stories genannt. Die folgenden Einträge halten übergreifende Entscheidungen fest.

### ADR-001 Normdaten-URIs als primärer Schlüssel

Kontext. CMIF enthält zu Personen und Orten eine Normdaten-URI (`@ref`) und einen Anzeigenamen. Editionen schreiben denselben Namen verschieden.

Wahl. Abgleich und Aggregation laufen über die URI, der Name dient nur der Anzeige. Fehlt die URI, gilt die Kennung im Register der Edition, sonst der Name.

Begründung. VIAF-, GND- und GeoNames-URIs sind eindeutig und erlauben korrekte Aggregation über Schreibvarianten hinweg.

Effekt. Filter, Indizes und Korb verwenden dieselben Schlüssel `personKey` und `placeKey` aus `utils.js`. Die Registerkennung kam am 2026-11-14 hinzu ([data.md](data.md#was-der-parser-liest)).

### ADR-002 Unsicherheit sichtbar machen

Kontext. Historische Korrespondenzdaten sind lückenhaft und unscharf datiert. Forschende ziehen aus einer Visualisierung Schlüsse über Zeit und Raum.

Wahl. Unsicherheit wird erkannt, markiert und erklärt, nie korrigiert oder versteckt. Gute Daten bleiben ohne Markierung.

Begründung. Verschwiegene Unsicherheit führt zu Fehlinterpretationen. Markierungen nur an unsicheren Werten halten das Bild ruhig.

Effekt. Kategorien und Tests in [uncertainty-specification.md](uncertainty-specification.md), visuelle Umsetzung in [design.md](design.md#unsicherheit).

### ADR-003 Ein zentraler Filterzustand

Kontext. Alle Ansichten zeigen dieselbe gefilterte Briefmenge.

Wahl. Der Filterzustand liegt zentral in `state-manager.js`, keine Ansicht hält eine eigene Kopie der Filter.

Begründung. Doppelte Zustände führen zu Synchronisationsfehlern zwischen Ansichten.

Effekt. Zeitraum, gewähltes Jahr, Sprachen, Person und Gegenüber, Ort, Thema, Qualität und Merkmale laufen über den state-manager. `explore.js` hält die Filtereingaben der Seitenleiste und die gefilterte Menge zusätzlich als Arbeitskopie und gleicht sie in `applyFilters()` ab ([architecture.md](architecture.md#entwurfsmuster)). Raum-Zeit, Themen, Netzwerk, das Profil der Zeitansicht und jede kleine Darstellung der Startansicht zeichnen die Briefe aller Filter außer dem, der in ihnen selbst gewählt ist, damit eine Wahl unter den übrigen hervortritt.

### ADR-004 Epistemische Kategorien für Forschungsfragen

Kontext. Die Übersicht schlug Forschungspfade als Fragen an den Datensatz vor.

Wahl. Fragen werden nach der Art der nötigen Erkenntnis eingeteilt in deskriptiv, analytisch, interpretativ und nicht beantwortbar. `analyzeResearchQuestions()` ordnet nach Datenverfügbarkeit zu.

Begründung. Die Kategorie macht den epistemischen Status einer Antwort sichtbar, bevor man sie sucht.

Effekt. Seit 2026-11-14 hat die Funktion keinen Einstieg in der Oberfläche (Entscheidung des Operators, [US-33](#us-33-methodisch-geleitete-exploration)). Das Refactoring vom 2026-11-15 hat sie mit ihren Tests aus dem Code entfernt, die Entscheidung gilt damit für keinen Teil des Werkzeugs mehr.

### ADR-005 Nicht wertende Sprache für Partnerdaten

Kontext. Die Daten stammen von Editionen und Forschungspartnern.

Wahl. Die Oberfläche spricht von „Anreicherungspotential“ statt von „Datenqualität“ oder „Datenabdeckung“.

Begründung. „Qualität“ bewertet die Arbeit der Partner, „Anreicherungspotential“ richtet den Blick auf Möglichkeiten.

Effekt. Gilt für alle Texte, die Lücken in fremden Daten benennen. Die Angaben zur Datenlage der Startansicht zeigen Anteile ohne Ampelfarben (Entscheidung des Operators vom 2026-10-29).

### ADR-006 Externe Dienste nur auf ausdrückliche Aktion

Kontext. Wikidata-Anfragen übermitteln die Normdaten-ID einer historischen Person an einen fremden Dienst.

Wahl. Jede Anfrage an Wikidata oder GeoNames startet erst auf eine ausdrückliche Aktion der Nutzenden (Entscheidung des Operators vom 2026-10-29).

Begründung. Nutzende sollen sehen und bestimmen, wann Daten das Werkzeug verlassen.

Effekt. Gilt für Personen-Dialog, Zeitansicht, Orte und den Dialog nach dem Laden. Das Laden des Datensatzes selbst fällt nicht darunter: Ein Link mit `cs=` lädt die genannte correspSearch-Abfrage beim Öffnen (Entscheidung E3 vom 2026-11-05). Die Grundkarte von OpenFreeMap ist kein Dienst mit Personenbezug. Seit 2026-11-15 wird sie erst angefragt, wenn die Kartenansicht zum ersten Mal erscheint, vorher bei jedem Öffnen des Explorers. Die kleine Karte der Startansicht und die Raum-Zeit-Ansicht zeichnen mitgelieferte Länderumrisse und fragen nichts an.

### ADR-007 Umfang der Stories nach dem Abgleich mit dem Code

Kontext. Der Abgleich der Stories mit dem Code vom 2026-10-29 ließ vier Kriterien offen: Kanten aus dem Briefwechsel im Netzwerk (US-11), ein JSON-Export der vollständigen Datenstruktur (US-22), eine Gruppierung der Zeitleiste nach Dekade (US-05) und Top-5-Korrespondenten, Sprachverteilung und Ansichtsempfehlungen in der Übersicht (US-27).

Wahl. US-11 und US-22 werden umgesetzt, die offenen Kriterien von US-05 und US-27 gestrichen (Entscheidung E8 des Operators vom 2026-11-05).

Begründung. „Wer schrieb wem“ ist die Grundfrage eines Korrespondenznetzes. Der JSON-Export ist eine Serialisierung vorhandener Daten. Die Zeitleiste bleibt über Jahrzehnte lesbar.

Effekt. Das ganze Netzwerk startet in der Art Briefwechsel. Seit 2026-11-14 öffnet die Netzwerkansicht als Korrespondenzkreis um eine Person, das ganze Netzwerk ist eine zweite Betriebsart.

### ADR-008 Wissensbasis nicht auf der Website

Kontext. GitHub Pages liefert alles unter `docs/` aus. Die Wissensbasis lag in `docs/knowledge/`.

Wahl. Die Wissensbasis liegt in `knowledge/` im Repository-Root, die Website verlinkt `knowledge/INDEX.md` auf GitHub (Veröffentlichungsregel des Operators, umgesetzt am 2026-11-10).

Begründung. Eine Pages-Seite liefert nur für Lesende bestimmte Inhalte aus.

Effekt. Vor einem Push, der die Seite ändert, wird der Baum `docs/` auf solches Material geprüft.

### ADR-009 Einträge gleicher Signatur sind ein Brief

Kontext. Eine Edition kann denselben Brief mehrfach verzeichnen, etwa in der Datei jedes beteiligten Konvoluts ([data.md](data.md#stefan-zweig-digital-tei-auf-briefebene-kein-cmif)). Jede Zählung nach Einträgen überschätzt Briefe.

Wahl. Einträge mit gleicher Signatur und gleicher maschinenlesbarer Datierung werden ein Brief. Nennt eine Signatur verschiedene Datierungen, entsteht je Datierung ein Brief, und jeder nennt die anderen in `sharedSignature`. Einträge ohne Datum schließen sich nur an, wenn alle datierten Einträge der Signatur übereinstimmen, weil das Werkzeug sonst nicht weiß, zu welchem Brief sie gehören. Der erste Eintrag mit Datum führt, die anderen füllen nur, was ihm fehlt, Empfänger nur, wo der führende Eintrag keinen nennt. Die Markierung als erschlossen folgt dem Eintrag, aus dem der gezeigte Wert stammt. Der Brief behält alle Einträge (`records`) und den Vermerk, ob sie sich unterscheiden (`recordsDiffer`).

Begründung. Das Werkzeug entscheidet nicht zwischen abweichenden Einträgen, es zeigt sie. Zusammengeführt wird nur über ein Merkmal, das die Quelle selbst vergibt.

Effekt. Die Übersicht nennt Einträge und Briefe, die Seitenleiste filtert „Mehrfach verzeichnet“ und „Einträge weichen ab“, der Dialog listet die Einträge. Dass Empfänger nicht über Einträge gemischt werden, kam mit der Parserkorrektur vom 2026-11-14 hinzu. Bis 2026-11-15 blieb eine Signatur mit widersprechenden Datierungen ganz ungeteilt, auch ihre übereinstimmenden Einträge, so dass ein Brief des Bestands von Stefan Zweig Digital mit einer Jahrhundertverschiebung in einem Eintrag dreimal erschien. Die Zusammenführung je Datierung kam mit der Parserprüfung dieses Tages hinzu, entschieden von der bauenden Session ([Journal](journal.md)).

### ADR-010 Unplausible Jahre kennzeichnen, nicht korrigieren

Kontext. Das Projekt korrigiert keine Daten ([project.md](project.md)). Eine Quelle kann ein zweistelliges Jahr ins falsche Jahrhundert auflösen.

Wahl. Trennt eine Lücke von mindestens 40 Jahren weniger als ein Zwanzigstel der datierten Briefe vom Rest, gelten diese Briefe als unplausibel datiert. Sie behalten ihr Datum, verlieren ihr Jahr und erhalten das Wort „unplausibel“.

Begründung. Eine stille Korrektur wäre eine Aussage über die Quelle, die dem Werkzeug nicht zusteht.

Effekt. Die Regel ist eine Heuristik und kann einen echten Nachzügler treffen. Der Filter „Datum unplausibel“ listet alle Betroffenen.

### ADR-011 Übereinstimmung über Bestände benennen, nicht zusammenführen

Kontext. Derselbe Brief kann in zwei Beständen verzeichnet sein, mit verschiedenen Kennungen und ohne gemeinsame Signatur. Dieselbe Übereinstimmung von Absender, Empfängern und Tag kommt auch innerhalb eines Bestands vor und steht dort für zwei Briefe eines Tages, für Brief und Beilage oder für einen doppelten Eintrag.

Wahl. Stimmen Briefe aus verschiedenen Dateien in identifiziertem Absender, identifizierten Empfängern und Tag überein, nennt jeder die anderen als mögliche Entsprechung. Nichts wird zusammengeführt. Innerhalb einer Datei entsteht kein Verweis.

Begründung. Ob zwei Einträge einen Brief meinen, ist eine Aussage über die Überlieferung, die Fachkenntnis der Editionen braucht.

Effekt. Zählungen über mehrere Bestände enthalten solche Briefe doppelt, der Filter „Auch in anderer Datei“ listet sie. Die Wahl traf die bauende Session am 2026-11-14, der Operator hat sie nicht bestätigt.
