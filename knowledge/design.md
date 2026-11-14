---
title: Design
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
  name: Vorlage Design
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/design
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-design
related: [specification, architecture, uncertainty-specification]
---

# Design

CorrespExplorer ist ein Forschungswerkzeug, dessen Oberfläche aus wenigen großen Figuren über einer gemeinsamen Auswahl besteht, mit ruhigem, papiernahem Charakter aus dem Logo. Dieses Dokument beschreibt den Aufbau, wie er am 2026-11-14 im Code steht, die Gestaltungsregeln und ihre Gründe und die Rückmeldungen des Operators, aus denen er entstanden ist. Die Werte (Farben, Abstände, Schriftgrößen, Radien, Schatten, Ebenen, Breakpoints) stehen allein in `docs/css/tokens.css`, Ladereihenfolge und Zuständigkeit der Stylesheets in `docs/css/CONTEXT-MAP.md`. Nichts vom Stand des 2026-11-14 ist vom Operator abgenommen.

## Haltung

- Die Oberfläche lässt die Daten sprechen. Eine Figur nimmt den größten Teil des Bildschirms ein, Kopf und Seitenleiste beschriften nicht, was ihre Bedienelemente selbst sagen.
- Die Gliederung folgt den Gegenständen einer Korrespondenz, nicht der Darstellungstechnik.
- Überblick zuerst, Belege auf Anforderung (Shneiderman, 1996, im Hauswissen als Mantra ausgeführt). Die Briefe einer Auswahl sind von jeder Figur aus einen Klick entfernt.
- Nur unsichere Werte werden markiert, Lücken stehen als Lücken da und heißen Anreicherungspotential.
- Lesbarkeit geht vor Ästhetik. Auf Daten liegen keine Texturen oder dekorativen Verläufe, Daten ändern sich ohne Animation.

## Aufbau

### Gegenstände, Darstellungen und Auswahl

Die Kopfzeile des Explorers nennt den Bestand und die Gegenstände Start, Briefe, Personen, Orte, Zeit und Themen. Ein Gegenstand, für den der Datensatz nichts enthält, erscheint nicht. Jeder Gegenstand mit mehreren Darstellungen listet sie in einem Menü unter seinem Reiter, und der Reiter öffnet die zuletzt benutzte.

| Gegenstand | Darstellungen |
|---|---|
| Start | Arbeitsfläche |
| Briefe | Briefliste |
| Personen | Liste, Netzwerk, Erwähnungen, Vergleichen |
| Orte | Karte, Raum-Zeit, Liste, Vergleichen |
| Zeit | Jahre, Tage, Chronik, Vergleichen |
| Themen | Themen |

Der Schalter zwischen den Darstellungen steht im Kopf der Ansicht neben dem Titel. Der Titel sagt, was gerade zu sehen ist, unter einem Filter als Anteil. „Vergleichen“ ist eine Handlung des Gegenstands und vergleicht, was er listet. Die zwölf älteren Adressen (`view=`) und `spacetime` bleiben gültig.

Die Seitenleiste steht neben Karte, Raum-Zeit, Listen, Briefen, Jahren, Themen, Netzwerk und Erwähnungen. Oben steht als ein Satz aus entfernbaren Marken, was ausgewählt ist, darunter der Zeitraum als Regler, die Qualitätsfilter, die Merkmale der Überlieferung mit Zahl und die Sprachen mit ihrer Farbe. Die Gruppen tragen keine sichtbaren Überschriften, sie nennen sich durch ihre Bedienelemente. Auf der Startansicht steht über den Filtern, was den Bestand beschreibt. Der Wissenskorb erscheint erst mit dem ersten Eintrag. Chronik, Tage und Vergleich stehen ohne Seitenleiste in voller Breite und nennen einen aktiven Filter in einem Satz. Unter 768px liegt die Seitenleiste außerhalb des Bildschirms und öffnet über den Filterknopf der Kopfzeile.

Gebaut und noch nicht eingecheckt: Ein aktiver Filter zeigt sich am Titel der Ansicht in der Farbe der Auswahl, an einer Linie am oberen Rand des Hauptbereichs und an einem getönten Block „Gefiltert nach …“ in der Seitenleiste.

Unter jeder Ansicht außer der Briefliste liegt der Briefauszug, eine Zeile mit der Zahl der Auswahl („312 von 11.576 Briefen“). Sie öffnet die Briefe der Auswahl über der Ansicht, die ihren Zustand behält, mit einem Griff für die Höhe, Escape zum Schließen und „Alle in der Liste“ als Weg in die volle Briefliste. Die Zeilen und der Dialog sind die der Briefliste. Die Wahl, den Auszug über die Ansicht zu legen statt neben sie, traf die bauende Session nach dem Entwurf, den der Operator freigab.

### Startfigur

Die Startseite `index.html` ist eine Figur: ein Brief des gewählten Bestands, aufgefaltet in das Datenmodell, das der Explorer liest. Drei Bänder tragen die Angaben, oben der Kern des CMIF (Absender und Empfänger, Absendeort, Datum, Link zur Edition), in der Mitte die Erweiterungen im CMIF (erwähnte Personen und Orte, Themen, Sprache), unten die TEI-Briefsätze (Poststempel, Anschrift, Signatur, Mehrfacheinträge, erschlossene Angaben). Jede Angabe ist eine kleine echte Figur des Bestands im Idiom ihrer Ansicht, mit einer Zeile, die die Ansicht öffnet: der Korrespondenzkreis, der Ring der Erwähnten, die Orte auf Länderumrissen, die Jahre in den Sprachfarben, die Sprachen als Balken, die Themen als kleine Verläufe, Anteile als Balken. Der Beispielbrief steht in der Mitte als drei Blätter eines Umschlags, seine Marken stehen rostrot in jeder Figur. Ein Klick auf eine Marke macht einen ihrer Briefe zum Beispiel, „anderer Brief“ geht zum nächsten. Eine Angabe, die der Bestand nicht trägt, bleibt leer und benannt an ihrem Platz.

Über der Figur stehen die Wahl des Bestands (Tutorial, Hugo Schuchardt Archiv und, wo lokal eingebunden, Stefan Zweig Digital), „Im Explorer öffnen“ und „Eigene Daten laden“. Eigene Daten füllen zuerst die Figur. Der Hinweis auf das Experiment steht als Schlusszeile. Gebaut von der bauenden Session nach der Rückmeldung des Operators zur Startseite, die Bänder und ihre Namen sind ihre Wahl.

### Startansicht des Explorers

Die Startansicht ist eine Arbeitsfläche aus Grafiken, die einander filtern: die Briefe pro Jahr über die volle Breite, gestapelt nach Sprache mit der häufigsten unten, darunter Personen, Orte, Themen, Sprachen und Überlieferung als Rangfolgen in neutralem Grau. Eine Zeile setzt ihren Filter und hebt ihn wieder auf, Ziehen über Jahre setzt den Zeitraum. Der Bestand bleibt in der Zeitleiste als blasser Balken hinter der Auswahl sichtbar. Die Titel Zeit, Personen, Orte und Themen öffnen ihren Gegenstand. Daneben steht die Beschreibung des Bestands mit Kennzahlen, Quelle, Lizenz, Änderungsvermerk und drei neutralen Angaben zur Datenlage.

In Arbeit, Ergebnis noch nicht vorliegend: eine Startansicht als Übersicht aus kleinen echten Ansichten mit einem knappen Block zum Bestand.

### Briefe

Die Briefliste nennt ihre Zahl über der Liste und hat keinen sichtbaren Titel. Ein Brief steht ab 1024px in einer Zeile mit Korrespondenten, den Angaben der Quelle und dem Datum. Eine Zeile hat ein Ziel, den Dialog, und den Stern zum Korb. Poststempel, Anschrift und Signatur stehen als benannte Angaben in der Zeile, Erschlossenes in eckigen Klammern mit einer Legendenzeile darüber. Der Dialog zeigt alles, was die Quelle zu dem Brief verzeichnet, auch was die Zeile schon sagt (Entscheidung des Operators vom 2026-11-14), mit Link zur Quelle und Weg zu correspSearch.

In Arbeit, Ergebnis noch nicht vorliegend: eine Briefansicht mit Zeilen relativ zur zentralen Person, Gruppen nach Jahren und einem schmalen Verlauf als Navigation.

### Personen und der Korrespondenzkreis

Das Netzwerk öffnet als Korrespondenzkreis um eine Person, um die gewählte Person oder ohne Wahl um die Person mit den meisten Korrespondenten. Jeder Korrespondent steht in einem Abstand zur Mitte nach der Zahl der Briefe und in einem Winkel nach seinem ersten datierten Brief, Jahresmarken am Rand machen den Winkel lesbar. Linien verbinden nur Korrespondenten, die einander schreiben, ihre Breite folgt der Zahl der Briefe. Ein Schalter neben dem Titel wählt die Stufe, Korrespondenz oder Erwähnte, jede mit ihrer Zahl, und als dritten Wert „Gesamt“, das ganze Netzwerk als Kräftelayout mit den Arten Briefwechsel, Zeitgenossen und Themen. In der Stufe Erwähnte stehen die Personen, die in den Briefen genannt werden, ohne Korrespondenten der Mitte zu sein, auf einem äußeren Ring, hohl, wer im Bestand nie einen Brief schreibt. Ein Klick auf einen Korrespondenten wählt die Briefe zwischen ihm und der Mitte.

Der Operator bezweifelt die Form des Kreises ([Rückmeldungen](#rückmeldungen-des-operators)). Ein recherchierender Agent untersucht, welche Netzwerkvisualisierungen zu Briefdaten passen, sein Ergebnis liegt noch nicht vor.

Entschieden von der bauenden Session, vom Operator nicht bestätigt: Nicht alle Punkte tragen einen Namen, damit alle Korrespondenten im Bild stehen. Eine Liste unter dem Kreis führt alle mit Namen.

Die Liste der Korrespondenten führt Zeilen mit Name, Zahl, Stern und Knopf zu den Details, „Körperschaft“ und „ohne Normdatensatz“ als Wort. Der Personen-Dialog zeigt zuerst, was der Datensatz sagt, Wikidata nur auf Klick. Die Darstellung „Erwähnungen“ ist ein Sankey-Fluss von Absendern über die gewählte Person zu den Erwähnten.

### Orte: Karte und Raum-Zeit

Die Karte zeigt die Absendeorte auf der hellen Grundkarte von OpenFreeMap, umgefärbt in die Papiertöne. Kreisgröße und Zahl folgen den Briefen, auch in Clustern. Ein Ort trägt die Farbe seiner häufigsten Sprache oder einheitlich die Datenfarbe. Ist die Grundkarte nicht erreichbar, stehen die Orte auf einfarbiger Fläche. Die Marker sind nicht einzeln fokussierbar, der Tastaturweg ist die Ortsliste.

Die Raum-Zeit-Ansicht stellt die Absendeorte nach ihren Koordinaten auf eine Grundfläche mit Länderumrissen und die Jahre als Höhe darüber. Jeder Ort ist eine Säule, jedes Jahr ein Profil, dessen Breite die Zahl der Briefe und dessen Farbe die häufigste Sprache des Jahrs zeigt. Von oben liest sich die Figur als Karte, von vorn als Zeitleiste je Ort. Drei feste Blickrichtungen (Schräg, Zeit von vorn, Karte von oben) setzen auch Zoom und Verschiebung zurück, Ziehen und Pfeiltasten drehen frei, Umschalt mit Pfeiltasten verschiebt, Plus und Minus zoomen. Der erste Klick wählt den Ort, der zweite ein Jahr dieses Orts, das an der Achse steht. Escape löst erst das Jahr, dann den Ort. Unter einem Mauszeiger mit mehreren Marken gewinnt die Marke, deren Mitte im Verhältnis zu ihrer Größe am nächsten liegt. Eine Breitenskala gilt für alle Filter. Eine Liste der Orte mit Suche steht unter der Figur, jede Zeile bietet ihre Jahre als Auswahl. Unter 760px Breite und bei einem Zeitraum von einem Jahr zeigt die Figur nur die Sicht von oben.

Entschieden von der bauenden Session, vom Operator nicht bestätigt: Der Ausschnitt der Grundfläche folgt den Orten, die den Großteil der Briefe halten, Orte außerhalb stehen hohl am Rand. Nur die belebtesten Orte tragen die Linie vom Grund zu ihrem ersten Jahr.

Die Bedienung wurde am 2026-11-14 nach einer unabhängigen Bedienprüfung umgebaut ([testing.md](testing.md#bedienprüfung-der-raum-zeit-ansicht)). Gebaut und noch nicht eingecheckt: Die drei Knöpfe der Blickrichtungen stehen in der Figur oben links statt im Kopf der Ansicht.

### Zeit

Die Jahre sind ein Balkendiagramm, gestapelt nach Sprache. Eine Schraffur zeigt den Anteil unscharf oder erschlossen datierter Briefe eines Jahrs. Ein Balken ohne Jahr steht abgesetzt rechts und nennt seine Gruppen (ohne Datum, nur als Text datiert, unplausibles Jahr), der Balken „Spanne“ daneben die Briefe mit Zeiträumen über mehrere Jahre und filtert nicht (Entscheidung E5). Jede Sprache der Legende ist ein Schalter. Ein Klick auf ein Jahr setzt den Zeitraum auf dieses Jahr und öffnet den Briefauszug, die Zeitleiste bleibt.

Die Tage sind eine Kalender-Heatmap je Jahr mit Monatsnamen und einem Satz zum dichtesten Jahr, Monat und Tag. Die Zellen bleiben 12 x 12px und berufen sich auf die Ausnahme „wesentliche Darstellung“ von WCAG 2.2 SC 2.5.8 (Entscheidung E6 vom 2026-11-05, eine Auslegung und keine Messung). Jede Zelle ist per Tastatur erreichbar.

Die Chronik zeigt den Verlauf der Briefwechsel als Zeitstrahl mit Stelle im Briefwechsel und Lücken ab zwei Jahren, in drei Layouts. Sie ist vom Operator beanstandet und nicht überarbeitet.

In Arbeit, Ergebnis noch nicht vorliegend: Jahre, Tage und Chronik zu einer Ansicht ohne Untermenü zusammengelegt.

### Themen

Neu gebaut am 2026-11-14 (Commit `34fedd9`), nicht abgenommen. Die Themen sind eine Figur über die Zeit: Jedes Thema ist eine Zeile, deren Kamm seine Briefe je Jahr auf einer gemeinsamen Zeitachse zeigt. Die Zeilen, die auf den Bildschirm passen, sind die häufigsten Themen, geordnet nach dem Jahr ihres Höhepunkts, Scrollen führt zum nächsten Block, die Suche erreicht jedes Thema, Sprachen stehen getrennt von den übrigen Themen. Eine Zeile zu wählen setzt den Themenfilter. Das gewählte Thema steht rostrot, die anderen Themen zeigen die Briefe, die sie mit ihm teilen, und alle Zeilen bleiben stehen. Ein Streifen unter der Figur nennt Korrespondenten, Orte und benachbarte Themen der Wahl, jede ein eigener Filter. Die Kämme liegen auf einer Zeichenfläche, die Namen sind Knöpfe darüber, mit Pfeiltasten und Enter bedienbar.

## Gemeinsame Regeln aller Ansichten

Diese Regeln fassen die Urteile des Operators vom 2026-11-14 zusammen, auf seinen Auftrag, sein Feedback über alle Ansichten zu vereinheitlichen ([Rückmeldungen](#rückmeldungen-des-operators)). Die Zusammenfassung stammt von der koordinierenden und der bauenden Session, er hat sie nicht einzeln bestätigt. Wo eine Regel etwas entfernen würde, das er gesehen und gutgeheißen hat, wird es benannt und ihm vorgelegt.

1. Der Filterzustand und die Zahl der Briefe der Auswahl stehen an einem Ort, in jeder Ansicht demselben. Von dort öffnen sich die Briefe. Titel, Regler und Fußzeile wiederholen ihn nicht.
2. Die Legende ist der Sprachfilter, überall. Eine zweite Sprachliste gibt es nicht.
3. Die Seitenleiste ist eine schmale Schiene aus Zeichen mit Hinweis am Zeiger und zugänglichem Namen. Sie lässt sich zu vollen Beschriftungen öffnen, dort trägt jede Gruppe ihren Namen. Was den Bestand beschreibt, steht hinter einem Info-Zeichen.
4. Keine Untermenüs und keine Aufklapper. Was nachrangig ist, bekommt einen Link oder einen Schalter. Die Tabelle als Alternative zu einer Figur ist ein ruhiger Link an derselben Stelle jeder Ansicht.
5. Farbe bedeutet in jeder Figur dasselbe, die Sprache. Was wie eine Sprache heißt, trägt deren Farbe oder steht erkennbar außerhalb dieser Kodierung. Rostrot bleibt dem Gewählten und dem Anklickbaren vorbehalten.
6. Die Auswahl steht in voller Farbe vor dem blassen Ganzen, in jeder Figur.
7. Zählangaben haben eine Form, „x von y“ mit der Sache dahinter, und jede Sache wird auf der ganzen Seite gleich gezählt.
8. Auswählen ist auf den ersten Blick erkennbar und geht in jeder Figur gleich: Zeiger und Fokus zeigen, was sich wählen lässt, ein Klick wählt, derselbe Klick oder Escape gibt frei.
9. Eine Ansicht zeigt nur, was der Bestand trägt. Was ihm fehlt, bekommt keinen Platz und steht einmal als ruhiger Satz.
10. Eine Kopfzeile je Ansicht: der Titel und der Schalter der Darstellungen. Bedienelemente einer Figur stehen in der Figur.
11. Die Reihenfolge der Sprachen ist überall dieselbe, nach Häufigkeit im ganzen Bestand.

## Farben

Die Palette aus Papier, Tinte und Rostrot ist aus dem Logo abgeleitet und vom Operator am 2026-11-14 als Erscheinung des Projekts bestätigt. Die Werte stehen in `tokens.css`.

- `--color-bg` (Papier) ist der Hintergrund, `--color-bg-light` (Manila) der Grund von Steuerleisten, Feldern und der Zeile unter dem Mauszeiger.
- `--color-text` ist Haupttext und Kontur, `--color-text-light` Nebentext.
- `--color-border-light` dient nur für Trennlinien, `--color-border-control` ist der Rand von Eingaben und Knöpfen und erreicht den Kontrast nach WCAG 1.4.11.
- `--color-primary` (Rostrot) ist die Interaktionsfarbe: gefüllte Knöpfe, aktiver Reiter, Auswahl, Fokusrahmen und die Marken des Beispielbriefs der Startfigur. Daten, Kennzahlen, Überschriften und Symbole ohne Funktion tragen sie nicht, weil ein Ziel umso schwerer zu finden ist, je mehr andere Elemente seine Farbe teilen (Wolfe & Horowitz, 2017). Die Anwendung dieses Befunds aus der Suchforschung auf eine Oberfläche ist eine eigene Übertragung. `--color-link` ist die dunklere Stufe, weil Rostrot auf Manila den Kontrast für Text verfehlt.
- `--color-data` (Tintenblau) ist die Farbe einzelner Datenreihen ohne Sprache: Kartenpunkte im einheitlichen Modus, Personen im Netzwerk, Stufen der Heatmap (`--color-scale-1` bis `--color-scale-4`). Die Trennung von Interaktions- und Datenfarbe folgt dem Muster Functional Color Semantics des Hauswissens.
- Rangfolgen der Startansicht stehen in neutralem Grau, Farbe bleibt den Sprachen vorbehalten.
- `--color-success`, `--color-warning`, `--color-info`, `--color-error` sind Statusfarben und die Farben der Unsicherheit.

Grafiken nehmen ihre Farben aus Tokens. D3-Attribute und Zeichenflächen, die `var()` nicht auflösen, lesen die Werte über `readTokens()` aus `views/view-support.js` oder beim Zeichnen aus dem berechneten Stil.

### Sprachfarben

Der Farbton allein trägt nur wenige Kategorien. In einer Suchaufgabe unter kontrollierten Bedingungen waren sieben Farben die Grenze für schnelles Erkennen (Healey, 1996), und Fehler nehmen mit der Größe der Palette zu (Gramazio et al., 2017). Die häufigsten Sprachen eines Datensatzes erhalten deshalb je eine Farbe aus `LANGUAGE_PALETTE` in `docs/js/constants.js`, in der Reihenfolge ihrer Briefzahl, alle übrigen ein gemeinsames warmes Grau, Briefe ohne Sprache ein helleres. Dieselbe Zuordnung gilt in Zeitleiste, Karte, Raum-Zeit, Startansicht, Startfigur und Seitenleiste, deren Sprachliste damit zugleich die Legende ist. Sie klappt dort, wo die Farben enden, die übrigen Sprachen liegen unter „Übrige Sprachen“.

Die Palette besteht aus sechs Farben der Okabe-Ito-Reihe (Okabe & Ito, 2008), die für Lesende mit Farbfehlsichtigkeit entworfen ist. Ihr Gelb fehlt, weil es auf dem Papierton verschwindet, ihr Schwarz, weil Tinte die Textfarbe ist. Nachbarn in der Reihenfolge unterscheiden sich in der Helligkeit (Szafir, 2018). Eine aus der Logofarbe abgeleitete Reihe wurde am 2026-11-14 verworfen, weil Farben einer Tonfamilie schwerer zu benennen und zu trennen sind (Heer & Stone, 2012). Die Grenze bei sechs Farben ist eine eigene Setzung, für das Zusammenfassen des Rests liegt keine Studie vor. Mehrere Farben erreichen auf dem Papierton den Kontrast von 3:1 für Grafikteile nicht, das Werkzeug stützt sich auf die Tabellen unter den Grafiken, nach dem Understanding-Dokument zu WCAG 1.4.11 genügt das.

Fehlen Sprachdaten ganz, bleiben die Balken einfarbig in der Datenfarbe, und die Legende sagt „Keine Sprachdaten im Korpus“.

### Unsicherheit

Unsicherheit spricht in allen Ansichten dieselbe visuelle Sprache. Symbole, Tooltip-Texte und Klassen je Stufe stehen in [uncertainty-specification.md](uncertainty-specification.md#ui-display).

- Unvollständiges Datum in `--color-warning`, Zeitraum in `--color-text-light` mit Symbol, unsichere Datierung (`cert="low"`) in `--color-error`, unbekanntes Datum kursiv.
- Erschlossenes in eckigen Klammern und gedämpft, ein Datum nur als Text kursiv, ein unplausibles Jahr mit dem Wort „unplausibel“, eine einzelne Grenze als „nicht nach 1848“.
- Exakte Daten und der Normalfall eines Datensatzes bleiben unmarkiert. Ein Ort ohne GeoNames-ID trägt keine Marke, fehlen allen Orten die Koordinaten, sagt die Ansicht das in einem Satz.

## Zeichenflächen für große Szenen

Raum-Zeit und Themen zeichnen ihre Daten auf eine Zeichenfläche (`canvas`), weil der Neuaufbau einiger tausend SVG-Elemente je Bild Drehen und Scrollen langsam machte. Gemessen an der Raum-Zeit-Figur vom 2026-11-14: siebzehn gegen sechzig Bilder je Sekunde beim Drehen. Für solche Szenen gilt dasselbe Muster.

- Die Daten liegen auf der Zeichenfläche, Beschriftungen, Achsen und Bedienelemente stehen als SVG-Text oder HTML-Knöpfe darüber, damit Fokus, Tastatur und zugängliche Namen erhalten bleiben.
- Der Zeiger wird über die Geometrie der letzten Zeichnung den Marken zugeordnet, nicht über Elemente.
- Während Ziehen oder Kamerafahrt entfallen Trefferflächen und Beschriftungen, gezeichnet wird höchstens einmal je Bild.
- Farben kommen aus den Tokens, gelesen beim Zeichnen.
- Unter reduzierter Bewegung springt die Kamera ohne Übergang.
- Jede Szene hat eine Liste oder Tabelle als Tastaturweg zu denselben Daten.

## Typografie, Abstände, Bewegung

Schriftfamilien und Größenskala stehen als `--font-*` und `--font-size-*` in `tokens.css`. Überschriften stehen in Merriweather, Fließtext in der Grundschrift mit Zeilenhöhe 1.6, Zahlen in Kennzahlen und Tabellen mit gleich breiten Ziffern und Tausenderpunkt. Keine Schrift unterschreitet `--font-size-xs`. Abstände nutzen die Skala `--space-*`, Rundungen `--radius-*`.

Rahmen geben Abgrenzung, Schatten erhalten nur schwebende Elemente (Dialoge, Tour, Toasts, Menüs, Tooltips, Kartenpopups, mobile Seitenleiste), gesetzt allein in `shadows.css`. Listen sind Zeilen mit Haarlinie statt Kacheln, weil Kacheln bei gleichartigen Einträgen in großer Zahl Platz kosten und den Vergleich erschweren (Laubheimer, 2016, eine Praxisempfehlung ohne Messung). Bewegung beschränkt sich auf Hover-Übergänge, das Einblenden von Dialogen und kurze Kamerafahrten. Bei `prefers-reduced-motion: reduce` setzt `base.css` Übergänge auf ihren Endzustand, `motionMs()` liefert 0ms, das Netzwerk berechnet sein Layout vor dem Zeichnen.

Regeln für Stylesheets: `components.css` ist die einzige Quelle für Knöpfe, Dialoggrundform und Ansichtskopf. Ebenen nur als `--z-*`, Übergänge über `--transition-*`. Sichtbarkeit schaltet die Klasse `.hidden`, Erwähnungsfluss, Netzwerk und Ortsliste schalten einzelne Elemente noch über `style.display` ([plan.md](plan.md#aufräumen)).

## Barrierefreiheit

### Kontraste

| Kombination | Verhältnis | Ergebnis |
|---|---|---|
| Text auf BG | 14.3:1 | AAA |
| Primary auf BG | 5.1:1 | AA |
| Primary auf BG Light | 4.45:1 | verfehlt AA, dort `--color-primary-dark` (5.86:1) |
| Data auf BG | 7.2:1 | AAA |
| Link (Primary Dark) auf BG und BG Light | 6.7:1 und 5.9:1 | AA |
| Link gegen umgebenden Text | 2.1:1 | unter 3:1, Links im Fließtext sind deshalb unterstrichen (WCAG 1.4.1, Technik G183) |
| Text Light auf BG und BG Light | 7.0:1 und 6.1:1 | AA |
| Warning und Info auf BG | 6.1:1 und 6.7:1 | AA |
| Border Control auf BG und BG Light | 3.9:1 und 3.4:1 | erfüllt 1.4.11 |
| Border Light auf BG | 1.4:1 | nur für Trennlinien |

Berechnet nach der WCAG-Formel am 2026-10-29, 2026-11-05 und 2026-11-14. Die verblassten Säulen der Raum-Zeit-Figur erreichten vor dem Umbau vom 2026-11-14 nur 1.1 bis 1.4 zu 1, die stärkere Abblendung danach ist nicht nachgemessen.

### Fokus, Tastatur, Struktur

- Alle interaktiven Elemente haben einen sichtbaren Fokus, global ein 3px-Umriss in `--color-primary`. Ziele sind mindestens 24 x 24px, Ausnahme sind die Zellen der Heatmap.
- Jede Figur hat einen Tastaturweg zu denselben Daten: die Ortsliste für Karte und Raum-Zeit, die Liste unter dem Korrespondenzkreis, die Namen als Knöpfe in Themen, die Legende der Zeitleiste für die Sprachsegmente, die Tabelle „Daten als Tabelle“ unter Zeitleiste, Netzwerk, Erwähnungsfluss und Heatmap.
- Dialoge, Tour, mobile Seitenleiste und Briefauszug schließen mit Escape und geben den Fokus zurück. Dialoge tragen `role="dialog"`, `aria-modal` und `aria-labelledby` und halten den Fokus.
- `explore.html` hat ein `h1` vor der Seitenleiste, die Ansichtstitel sind `h2`. Erklärende Zeilen unter den Titeln sind unsichtbar und bleiben für Screenreader im Dokument.
- Unter 768px sind alle Reiter beschriftet, der Schalter der Darstellungen bricht um, die geschlossene Seitenleiste verlässt die Tab-Folge. Kein Dokument scrollt seitlich, breite Grafiken scrollen in ihrem eigenen Bereich.

### Quellen der Farbentscheidungen

Die Befunde hat ein lesender Agent am 2026-11-14 aus den Volltexten zusammengetragen, die bauende Session hat sie übernommen. Alle genannten Farbstudien schließen Menschen mit Farbfehlsichtigkeit aus, für sie sprechen hier nur Okabe und Ito und die Begründung der WCAG.

- Gramazio, C. C., Laidlaw, D. H., & Schloss, K. B. (2017). Colorgorical: Creating discriminable and preferable color palettes for information visualization. *IEEE Transactions on Visualization and Computer Graphics*, 23(1), 521–530. https://doi.org/10.1109/TVCG.2016.2598918
- Healey, C. G. (1996). Choosing Effective Colours for Data Visualization. *Proceedings IEEE Visualization '96*, 263–270. https://doi.org/10.1109/VISUAL.1996.568118
- Heer, J., & Stone, M. (2012). Color Naming Models for Color Selection, Image Editing and Palette Design. *CHI '12*. Modellmetriken ohne Nutzertest der Paletten.
- Laubheimer, P. (2016). Cards: UI-Component Definition. Nielsen Norman Group. https://www.nngroup.com/articles/cards-component/. Praxisempfehlung ohne berichtete Messung.
- Okabe, M., & Ito, K. (2008). Color Universal Design (CUD). https://jfly.uni-koeln.de/color/. Praxisrichtlinie, die Farbwerte der Palette sind die verbreitet veröffentlichten und nicht aus dem Text der Quelle gelesen.
- Szafir, D. A. (2018). Modeling Color Difference for Visualization Design. *IEEE Transactions on Visualization and Computer Graphics*, 24(1), 392–401. https://doi.org/10.1109/TVCG.2017.2744359
- Wolfe, J. M., & Horowitz, T. S. (2017). Five factors that guide attention in visual search. *Nature Human Behaviour*, 1, 0058. https://doi.org/10.1038/s41562-017-0058. Review der Laborforschung mit einfachen Displays.
- W3C. Understanding SC 1.4.1 Use of Color, Technique G183 und Understanding SC 1.4.11 Non-text Contrast, WCAG 2.2.

## Rückmeldungen des Operators

Die Sätze des Operators stehen hier wörtlich und vollständig, in der Folge, in der er sie gab, damit sie jeden Umbau überleben. Die Sätze vom 2026-11-14 stammen aus diktierten Eingaben, „Fuse“ ist als „Views“ zu lesen, „Staat“ als „Start“, Namen in eckigen Klammern sind ergänzt. Jeder Satz trägt eine Zeile dazu, was daraus folgte und ob es am Bildschirm steht. „Am Bildschirm“ heißt im Code vom 2026-11-14 vorhanden, abgenommen hat der Operator nichts davon.

### 2026-11-13 und 2026-11-14, Iteration an den Briefen von Stefan Zweig Digital

> Wir können den CorrespExplorer in dieser Phase jetzt nochmal extra optimieren und genau anpassen und customizen, sodass er mit diesen Zweigdaten auch wirklich sehr gut umgehen kann. Das heißt: wirklich die Views nochmal durchdenken, anpassen, implementieren und umsetzen

Folge: Parser für Briefsätze, Zusammenführung nach Signatur, Merkmale der Überlieferung in allen Ansichten. Am Bildschirm.

> Ich möchte das, was wir haben, auch am Design und dem User Interface verbessern und optimieren und auch refactorn an dieser Stelle. Wir sollten uns dann wirklich überlegen: Wie können wir das evolvieren?

Folge: Refactoring in Ansichtsmodule, Umbau von Farbrollen und Listen. Am Bildschirm.

> Ich möchte bei den Zweigbriefen, die wir hier alle verarbeiten möchten, das in allen Views durchgehen. Das heißt, du sollst Software und Subagents da hinschicken, die wirklich den Browser mit konkreten Aufgaben bedienen. Die sollten uns dann immer wieder Feedback geben, ob das jetzt wirklich besser geworden ist.

Folge: zwei Runden Aufgabenprüfung durch Browser-Agenten, seit 2026-11-14 der feste Aufgabensatz ([testing.md](testing.md#feste-aufgaben)). Arbeitsweise, kein Bildschirmelement.

Festgehaltene Vorlieben aus dem Auftrag: wenige Ebenen, nichts hinter Aufklappern, was man braucht, ist sichtbar oder über einen Filter erreichbar. Folge: Regeln für Briefsätze (Normalfall unmarkiert, Merkmale als Filter). Am Bildschirm.

### 2026-11-14, Gliederung, Startseite, Datenprüfung und Arbeitsfläche

> Warum sind hier zwei Ebenen, und es sind ein bisschen viele Strukturen, oder? Auch hier haben wir das Problem, dass wir zu viele Ebenen haben. Warum wird so viel Fläche nicht verwendet? Sind es nicht ein bisschen zu viele Fuse? Es sind sehr viele Fenster. Das heißt: Was würde man sinnvoll zusammenführen können, und wo kann man jetzt etwas lernen?

Folge: Kopfzeile nach Gegenständen statt zwölf Ansichten nach Technik, Schalter im Kopf der Ansicht. Am Bildschirm.

> Also hier fallen mir auch wieder zu viele Ebenen ein. Also, ich finde, wir haben zu viele Strukturen, auch in der Sidebar, und auch zu viele Ebenen. Die Cards oben (Datensatz, Briefe, Personenorte) sind ein bisschen sehr mächtig. Brauchen wir hier wirklich Untertitel, also Datensatz, Filter, Zeitraum? Wir wollen das User-Interface mehr sprechen lassen.

Folge: Seitenleiste ohne sichtbare Überschriften, Kacheln ausgeblendet, die Zahl steht im Titel der Ansicht. Am Bildschirm.

> Ich glaube, wir können die Startseite insgesamt ein bisschen innovativer machen und so, dass alles auf einer Seite sichtbar ist, oder?

Folge: Startseite auf einem Bildschirm, später durch die Startfigur ersetzt. Am Bildschirm als Startfigur.

> Ich würde den Feature-Demosatz weggeben und da eben den Stefan-Zweig-Datensatz nehmen, damit wir den quasi nochmal ausarbeiten, statt dem Tutorial oder zusätzlich zum Tutorial. […] Also, wir arbeiten das Tutorial nochmal sauber aus, und wir fügen quasi Stefan Zweig als Beispiel hinzu.

Folge: Stefan Zweig Digital als drittes Beispiel, nur wo lokal eingebunden, weil die Daten keine Lizenz nennen (Entscheidung der bauenden Session). Das Tutorial ist nicht neu ausgearbeitet. Teilweise am Bildschirm.

> Warum ist 3 + 3 > 7? Was kann man hier noch optimieren und klarer machen? Ist es klar, nach welchen Kriterien ich sortieren kann? Sind das alles Sprachen? Wird das Aufklappen der weiteren Sprachen wirklich sehr gut umgesetzt? Warum haben manche dann nur Grau? Wie kann man das lösen, grundsätzlich, weil wir unterschiedliche Daten hier reinbekommen? Ein bisschen generalisierter: Warum nur die Kategorien, warum nicht andere?

Folge: Cluster der Karte zählen Briefe, die Sprachliste klappt, wo die Farben enden. Kategorien aus den Daten abzuleiten ist nicht gebaut ([plan.md](plan.md#auswahl-und-briefe)). Teilweise am Bildschirm.

> Ich bin der Meinung, dass hier viel mehr von der Seite genutzt werden kann. Ich könnte mir vorstellen, alles an Informationen in eine seitliche Sidebar zu legen, schon wie wir das gehabt hatten. Der Staat erschlägt einen ja ein bisschen. Wieso kann im Staat nicht auch eine Übersicht über die Fuse sein, quasi kleine Bereiche? Wir haben jetzt Briefe, Personenorte und Zeit als Bereiche. Diese vier Bereiche sollten quasi vier Quadranten sein, wo ich auch schon sehe: Das sind die Visualisierungen. Dort kann ich dann tiefer hineingehen, und ich sehe schon mal eine Art aggregierte Form des Wissens von dort. […] Wo gibt es einen Bereich, wo alle Metadaten zu dem Datenbestand genannt sind […]? Quasi die aggregierten Metadaten.

Folge: Startansicht als Arbeitsfläche aus Grafiken, die einander filtern, die Metadaten des Bestands in einer Spalte. Am Bildschirm.

> Also, ich hatte schon erwartet, dass wir viel mehr mit Informationsvisualisierungen arbeiten, die die Daten aggregieren und dann sozusagen in die Teilansichten kommen. Hier erscheinen mir Briefe und Personen so klassische Katalogansichten. […] Ich komme zu den Daten und den Metadaten, und dann möchte ich aber eigentlich eher mit Informationsvisualisierungen arbeiten, die wirklich einen großen Teil dieses Tools einnehmen.

Folge: Arbeitsfläche, später die vier großen Ansichten mit dem Briefauszug. Briefe und Personenliste stehen weiter als Darstellungen. Teilweise am Bildschirm.

> Es ist sehr viel blau. Können wir hier nicht einen Stacked Bar Chart machen? Was kann man im User Interface noch verbessern? Ich würde eher erwarten, dass ich hier auf der Sidebar diese Ansicht filtern kann. Die Forschungspfade finde ich eigentlich gar keine gute Idee. Das schaut mir, das versteht keiner. Warum nicht gleich direkt in die Daten gehen? Und alle Forschungspfade waren quasi nur der Gedanke, dass wir alle Forschungs-User-Stories entwickeln. Alle diese wollen wir mit diesen Views, die wir haben, umsetzen. Vielleicht müssen wir alle Views nochmal evoluieren und deutlich ausbauen und vielleicht noch einen weiteren View hinzusetzen, damit alle Forschungspfade mit diesen Views bearbeitbar sind.

Folge: Zeitleiste der Startansicht nach Sprache gestapelt, Seitenleiste auf der Startansicht, Forschungspfade aus der Oberfläche genommen, ein Feld Themen. Die Zuordnung jeder Story zu einer Ansicht steht seit 2026-11-14 in [specification.md](specification.md). Die Maschinerie der Pfade steht noch im Code. Am Bildschirm.

> Und wo ist die Kartenansicht? Die war eigentlich eine Kernkomponente des ganzen Projektes.

Folge: Die Karte steht unter Orte, für Bestände mit Koordinaten. Für Stefan Zweig Digital fehlt sie, weil die Quelle keine Ortskennungen trägt ([plan.md](plan.md#orte-und-raum-zeit)). Am Bildschirm für das HSA.

> Auch die Chronik […] Das gefällt mir jetzt noch nicht. Da müssen wir noch einiges überarbeiten und verbessern. Einige Dinge waren früher besser. Also, ich glaube, wir haben das ein bisschen sehr krass eingedampft. Und diese Unterviews, Zeit, Chronik oder so, das ist ein bisschen schwer zu finden. Das muss irgendwie oben schon ein Dropdown sein, damit ich das wirklich gleich da sehe, also dass ich das immer sehen muss.

Folge: Menü unter jedem Reiter mit Darstellungen. Die Chronik ist nicht überarbeitet, was früher besser war, ist nicht benannt. Teilweise am Bildschirm.

> Wir wollen wirklich ein innovatives, sehr spannendes User-Interface haben, das wirklich alle Dimensionen abbildet. Wir wollen das wirklich professionell umsetzen.

Folge: Entwurf der vier großen Ansichten über einer Auswahl. Am Bildschirm, nicht abgenommen.

### 2026-11-14, nach der Arbeit am Parser

> aber können wir das nicht professionalisieren. wir haben doch beim gossip schon viel gelernt. also was waren die guten views. Wir brauchen auf jeden Fall etwas mit Netzwerk, mit Karte, Space-Time, die Themen. Irgendwie kommt mir vor, dass wir den [CorrespExplorer] vielleicht noch besser denken können. Ich glaube, dass wir den innovativer denken können.

Folge: die vier großen Ansichten Netzwerk, Karte, Raum-Zeit und Themen ([plan.md](plan.md#richtung)). Alle vier am Bildschirm, nicht abgenommen. Die Form des Netzwerks bezweifelt der Operator.

Auf den Vorschlag, den Entwurf auf vier große Ansichten umzuschreiben und die Raum-Zeit-Ansicht zuerst zu bauen: „ja. oder besser mit subagents!“

Folge: Bau von Raum-Zeit und Korrespondenzkreis durch je einen Subagenten. Arbeitsweise.

> Das finde ich jetzt wirklich sehr gut, aber vielleicht können wir das noch optimieren und verbessern. Und vielleicht könntet ihr es auch noch irgendwie performanter machen.

Folge: Raum-Zeit auf einer Zeichenfläche. Am Bildschirm.

> hier wäre es gut, wenn ich die Karte darunter sehe, und es sind ein bisschen viele Kugeln, die sich überschneiden.

Folge: Länderumrisse auf der Grundfläche, Profile je Jahr statt Kugeln. Am Bildschirm.

> Bei den Orten: Das ist eigentlich ganz cool, aber es sollte klar sein, dass man vielleicht einen Button braucht, damit man gleich die Ansicht von oben auf die Karte wieder hat. Man sollte irgendwie genau wissen, dass die Visualisierung dann sagt, dass man sie dann auch drehen kann. Es muss auch irgendwie klar sein, was diese Achse dann ausdrückt. Und können wir mit Farben auch noch arbeiten? Jetzt ist einfach alles nur immer blau.

Folge: Knopf „Karte von oben“ unter drei festen Blickrichtungen, Drehhinweis, Achsentitel, Sprachfarben. Am Bildschirm.

Auf die ausgezählten Möglichkeiten: „ja, färbe die Säulen nach der Sprache“.

Folge: Profile in der Farbe der häufigsten Sprache je Jahr. Am Bildschirm.

> Ja, diese Netzwerke, die schauen immer so aus. Ich bin mir nicht sicher, ob das wirklich die beste Netzwerkvisualisierung ist. Das können wir hier noch optimieren und verbessern. Und diese Auswahl zwischen Liste, Netzwerk und Vergleichen sollte irgendwie präsenter sein. Ich glaube, dass wir hier wieder zu viele Ebenen auch haben. Also im Bild 24 von 282 im Briefwechsel: Das sollte noch besser irgendwie integriert werden.

Folge: Korrespondenzkreis statt zweier Bögen, der Schalter der Darstellungen neben dem Titel, die Zahlen der Stufen im Stufenschalter. Am Bildschirm, ob die Zahlzeile damit integriert ist, hat niemand geprüft.

> Vielleicht könnten wir hier mit einer sehr innovativen, kreativen und ästhetisch anspruchenden Visualisierung die Funktion oder eine besondere Funktion des [CorrespExplorer] darstellen. Wir überlegen uns, was das Coolste wäre: dass wir alles, was wir hier im Screenshot haben, zusammenführen in eine ästhetisch anspruchende Informationsvisualisierung. Die vermittelt, was der [CorrespExplorer] alles kann und welche Art von Daten man damit darstellen kann. Sie berücksichtigt wirklich das Datenmodell von [correspSearch] auch gleich direkt und die dementsprechenden Erweiterungen, weil Hugo [Schuchardt] ja einen weiteren Datenbestand hat.

Folge: die Startfigur in drei Bändern ([Startfigur](#startfigur)). Am Bildschirm. Der Name des mittleren Bands und das Dichteprofil sind offen ([plan.md](plan.md#startfigur)).

Auf die Frage, ob CorrespExplorer das Sichtwerkzeug für das gemeinsame Briefmodell von GOSSIP werden soll: „ja das sollten wir auch gleich zusammen denken! da wollte ich hin“.

Folge: neue Ausrichtung des Projekts ([project.md](project.md)). Das Werkzeug liest noch keine Aussagen, nichts davon steht am Bildschirm.

### 2026-11-14, zum Korrespondenzkreis

Der Satz ist so überliefert, wie die koordinierende Session ihn weitergab, mit ihren Auslassungen:

> Ich glaube, die Form von Netzwerk passt noch nicht ganz … was hier überhaupt in Beziehung gestellt wird

Folge: Ein recherchierender Agent untersucht, welche Netzwerkvisualisierungen zu Briefdaten passen. Ergebnis ausstehend, am Bildschirm unverändert der Korrespondenzkreis.

### 2026-11-14, spät: Raum-Zeit, Filter, Zeit, Briefliste, Startseite

Der vollständige Satz zum Korrespondenzkreis, wie der Operator ihn gab:

> Ich glaube, die Form von Netzwerk passt noch nicht ganz. Also, wir müssen uns noch mal überlegen, was hier überhaupt in Beziehung gestellt wird. Wir haben ja dann auch dieses GOSSIP-Projekt. Dort gibt es sicher irgendwelche Netzwerkinformationen. Also, wir müssen da noch mal genauer verstehen, welche Arten von Netzwerk-Visualisierungen für die Art von Daten wirklich Sinn machen und was man dafür für Daten braucht. Mache auch Web-Suchen dazu. Ich glaube, das ist eine Forschungsfrage, sozusagen, damit wir wirklich sinnvolle Netzwerk-Visualisierungen erzeugen können.

Folge: die Recherche in [network-figures.md](network-figures.md). Am Bildschirm unverändert der Korrespondenzkreis, die Entscheidung liegt bei ihm.

> Ich glaube, die Visualisierung müssen wir noch ordentlich durchtesten: diese Space-Cube-Visualisierung, auch mit Tipps, und uns sozusagen in ihrer Bedienung evaluieren. Die Idee ist sehr gut, aber es ist ein bisschen schwierig zu bedienen

Folge: unabhängige Bedienprüfung an zwölf Aufgaben und die Korrekturen daraus. Am Bildschirm, der Aufgabensatz lief danach nicht erneut.

> Ich glaube, diese Buttons sollen irgendwie besser positioniert werden. Das ist irgendwie wichtig.

Folge: die drei Blickrichtungen der Raum-Zeit-Figur stehen in der Figur oben links. Am Bildschirm.

> Das mit den Filtern ist eh gut, aber es ist sehr streng, und man vergisst das ab und zu. Also, das muss auch irgendwie noch klarer sein, damit man weiß, dass in der Visualisierung etwas eben eingefiltert ist.

Folge: Titel in der Auswahlfarbe, Linie am oberen Rand der Hauptfläche, getönter Block „Gefiltert nach“ in der Seitenleiste. Am Bildschirm.

> Und können Liste und Vergleich nicht irgendwie zusammengeführt werden? Das ist ein bisschen zu viel Funktionalität.

Folge: nicht begonnen ([plan.md](plan.md)).

Zur Themenansicht: „braucht man das? Kann man das nicht irgendwie besser visualisieren? Das ist ein sehr behäbiges Interface.“

Folge: die Themen als eine Figur über die Zeit. Am Bildschirm.

Zum Block des Bestands, zur Arbeitsfläche und zur Briefliste, je auf einem Bildschirmfoto: „das kann man optimieren oder?“, „das kann man auch optimieren oder?“, „und das?“

Folge: knapper Block, Startansicht als Dashboard kleiner echter Ansichten, Briefliste mit Jahresgruppen und Jahresprofil. Am Bildschirm.

> Es gibt ja viele Untermenüs, also muss man ja ein bisschen durchklicken. Das finde ich fast ein bisschen zu aufwendig. Und die Chronik kann sicher auch noch optimiert werden. Da gibt es sicher noch, dass man das irgendwie übersichtlicher macht und damit Datenbestände besser abbilden kann. Und wieder haben wir zu viele Ebenen drin, oder?

Folge: Zeit als eine Ansicht ohne Untermenü. Am Bildschirm. Was aus der Chronik entfiel, hat er nicht bestätigt.

Zur Startseite als Figur, erste Fassung: „Also, da sind keine Bilder, das sind schon die echten Visualisierungen. Das ist eine sehr gute Idee. Da haben wir quasi so eine Art Dashboard der Visualisierungen.“

Zur Startseite nach der Schärfung, über die koordinierende Session weitergegeben, „Übersichtszeiten“ ist als „Übersichtsseiten“ zu lesen:

> Das ist schon gut, das ist wirklich kreativ, aber ich glaube, wir können es nach wie vor verbessern. Zum Beispiel: Die Linien müssen noch irgendwie klarer sein, das Bar-Chart könnte irgendwie interessanter ausschauen. Es ist ein bisschen sehr dicht, und es ist wirklich sehr voll, das Ganze. Es ist nicht ganz klar, dass ich bei Hugo [Schuchardt] da was auswählen kann. Das sind so meine Wahrnehmungen gerade. Bei Hugo [Schuchardt] haben wir schon interessante Visualisierungen, aber auch das ist ein bisschen zu überladen. Es gefällt mir schon ganz gut. Wenn wir das, was wir hier haben, noch optimieren können, wäre es super. Und vielleicht sollten wir auch diese Übersichtszeiten an die jeweiligen Daten anpassen, denn wenn ein bestimmter Aspekt der Daten nicht vorhanden ist, funktionieren bestimmte Visualisierungen nicht. Das heißt, sie sollten von ihrem Wissen auch dynamisch sein. Weißt du, was ich damit meine?

Folge: in Arbeit. Die Startfigur wird aus dem zusammengesetzt, was ein Bestand trägt, statt ein festes Raster zu füllen.

Zur Startansicht des Explorers als Dashboard, über die koordinierende Session weitergegeben, „BASC, Geschrieben“ steht für die Themenzeilen Baskisch und eine weitere:

> Also, das geht auf jeden Fall in die richtige Richtung. Auch jetzt ist es noch ein bisschen zu voll. Wo können wir das, was wir hier haben, noch mal optimieren und verbessern? In User Interfaces, im Design. Ich könnte mir vorstellen, dass die Sidebar noch kompakter ist, mit mehr Icons und Tooltips arbeitet und damit ein bisschen schmäler wird. Dann haben die Visualisierungen ein bisschen mehr Platz. Den mittleren Teil mit den Legenden können wir vielleicht besser zusammenführen. Vielleicht kann sie eine bestimmte Funktion beim Filtern von der Zeit übernehmen. Dieses Selektieren ist natürlich wirklich sehr gut. Das muss ja bei den Userinnen und Usern gleich beim Start klar sein, dass sie das tun können. Bei BASC, Geschrieben, Spanisch, Französisch, Biografisch usw.: Warum ist sonst immer alles nur blau? Kann man bei der Grafik, beim Netzwerk und bei den Themen das noch verbessern? Dann kann man die Anzahlen, also die Briefpartner, die Orte (286 von 774), noch irgendwie besser machen. Nochmal schauen, wo es vielleicht Redundanzen gibt. Zum Beispiel die Briefe links unten, die Anzahl: Vielleicht kann man das dort, wo die Filter sind, irgendwie zusammenführen, sodass man bei den Filterinformationen das noch besser hat, damit das noch besser zusammenspricht. Aber das geht auf jeden Fall in die richtige Richtung. So ist das wirklich cool.

Folge: in Arbeit. Legende als Sprachfilter, schmalere Seitenleiste, Farbe in Kreis, Karte und Themen, einheitliche Zählangaben, ein Ort für Filterzustand und Briefzahl.

Zur Startansicht des Explorers nach dem Straffen (schmale Schiene links, Zeitdiagramm mit Griffen an beiden Enden, der Sprachbalken mit seinen Namen als Legende, die Zahlen von Personen, Orten und Themen als Überschriften, Kreis und Karte nach Sprache gefärbt), über die koordinierende Session weitergegeben: „Ja, das finde ich gut.“

Folge: Zustimmung zu diesem Stand der Startansicht, festgehalten mit dem Commit, der auf diesen Eintrag folgt. Sie gilt dem, was das Bild zeigte, am Hugo Schuchardt Archiv bei rund 1840 Pixel Breite. Sie gilt keiner anderen Ansicht und ist keine Freigabe zum Push. Schmale Schiene, Legende als Sprachbalken, Farbe nach Sprache in Kreis, Karte und Themen und die Zahlen als Überschriften entfallen von hier an nur auf sein Wort. Offen aus demselben Bild, als Befund der koordinierenden Session: Die Themenzeilen tragen drei Farbfamilien, und nichts sagt, was Grau und Violett bedeuten. Die Zahl der Briefe steht allein in der Fußzeile, die drei anderen Zahlen als Überschriften.

Zur Zeitansicht, gefiltert auf einen Ort und einen Zeitraum, über die koordinierende Session weitergegeben:

> Auch das geht definitiv in die richtige Richtung, aber auch hier sind gerade viel zu viele Ebenen. Es ist zu viel Struktur, und Sachen mit Ausklappen sind irgendwie unpraktisch. Können wir das jetzt auch noch mal vereinheitlichen mit dem anderen Feedback, das wir haben?

Folge: die [gemeinsamen Regeln aller Ansichten](#gemeinsame-regeln-aller-ansichten) und ein Durchgang über Start, Briefe, Zeit, Themen, Personen und Orte. In Arbeit.

Zur Themenansicht, gefiltert auf einen Ort und einen Zeitraum, über die koordinierende Session weitergegeben, „Verhandeltliche“ ist ein Diktatfehler, vermutlich für „Vorhandene“:

> Auch die Themenseite geht in die richtige Richtung, aber es scheint mir auch hier noch ein bisschen zu viele Strukturen zu geben. Wie können wir das Verhandeltliche verbessern? Und wäre es nicht sinnvoll, wenn diese Bereiche, diese Polygone, die hier gefunden werden, in Relation zu allen sind? Vielleicht ist hier eine Tree Map oder so etwas besser?

Zur Startseite nach dem Zusammensetzen aus dem Bestand, Tutorial gewählt, über die koordinierende Session weitergegeben. Der erste Satz ist die erste ausdrückliche Zustimmung zu dieser Seite, der Rest sind Aufträge:

> Das finde ich ehrlich gesagt jetzt schon sehr gut. Was jetzt aber ist, ist, dass der Tutorial-Bestand irrsinnig langweilig ist im Vergleich zum Hugo-[Schuchardt]-Archiv. Ich würde sagen, das Hugo-[Schuchardt]-Archiv ist der Default-Eintrag, und das Tutorial wird komplett entfernt.
> weg:
> * Dieser Bestand trägt keine Angaben aus TEI-Briefsätzen wie Poststempel, Anschrift und Signatur. .. diese zeile
> * "Kern des CMIF"
> * Kern des CMIF --> das muss anders gelöst werden und und die beiden Beispiele Hugo [Schuchardt] und Stefan Zweig werden zusammengeführt, quasi in ein Element mit eigenen Daten geladen. Irgendwie muss das besser noch integriert werden mit dem Bestand.
> * Wer schrieb wem, wann und von wo: CorrespExplorer zeigt die Metadaten einer Korrespondenz als Liste, Karte, Zeitleiste und Netzwerk. --> Diesen Text vielleicht noch optimieren und verbessern? So haben wir mit dem Icon jetzt zweimal CorrespExplorer oben. Das ist also Redundanz, das heißt, wir können das besser machen.
> Experiment: ein Forschungsprototyp, mit Coding-Agenten nach Promptotyping entwickelt, kein betreutes Produkt. Ergebnisse vor der Weiterverwendung prüfen, Rückmeldungen in die Issues. --> Das kommt in einen sauberen Header und in einen sauberen Footer, einen, der sozusagen meinen Projekten entspricht. Damit das wirklich tip top passt

Folge: in Arbeit. Das Hugo Schuchardt Archiv als erster Bestand, das Tutorial aus der Startseite, die Bandnamen und die Zeile über Fehlendes entfallen, die Wahl des Bestands und das Laden eigener Daten in einem Element, der Satz ohne den Namen, Kopf und Fuß nach der Form seiner Projektseiten. Die Datei des Tutorials und die Tour im Explorer bleiben, bis er das Löschen der Datei ausdrücklich freigibt und der Durchgang über die Ansichten die Tour erreicht.

Zum Aufbau des Explorers, über die koordinierende Session weitergegeben, eine Frage mit klarer Neigung und noch kein Auftrag zum Umbau:

> Ich finde, beim CorrespExplorer könnten Briefe und Personen viel mehr aufgebaut sein. Ähnlich also, ich finde, so wie das bei Briefen oben die Top-Navigation ist, soll es ja auch bei Personen und Orten einheitlicher sein. Jetzt finde ich, dass wir diese Indexinformationen vielleicht irgendwie zusammenführen können. Können wir Briefe, Personen und Orte sinnvoll in eine Ansicht zusammenführen, weil wir sozusagen nach Personen und Orten dort gleich filtern könnten oder so, damit wir keine Redundanzen haben?

Folge: Antwort im Chat und eine kleine echte Fassung am Hugo Schuchardt Archiv neben den bestehenden Ansichten, im selben Durchgang wie die gemeinsamen Regeln. Nichts Bestehendes entfällt vor seinem Vergleich. Derselbe Schritt löst seinen früheren Wunsch, Liste und Vergleich zusammenzuführen.

An alle laufenden Projekte, über die koordinierende Session weitergegeben: „wir wollen nun überall dafür sorgen dass die promptotyping skills durchgeführt werden. überall: kuratieren, destillieren, refactoren, handoff“.

Folge: am nächsten stabilen Stand in dieser Folge, jeder Schritt mit eigenem Commit: distillieren, kuratieren, refactoren, übergeben.

Zu den drei Fassungen der Themenansicht, nach dem Vergleich am Bildschirm: „Raster als Hauptfigur, Treemap als Anteile daneben“.

Folge: Entscheidung des Operators. Das Raster aus Themen und Jahren ist die Themenansicht, die Treemap steht als „Anteile“ daneben, der Verlauf als Kammlinie entfällt. In Arbeit.

Folge zur Themenansicht davor: Zwei kleine echte Fassungen am selben gefilterten Bestand, eine Treemap und ein Raster aus Themen und Jahren auf gemeinsamer Skala, zur Wahl nebeneinander. Die bestehende Ansicht bleibt bis zu seiner Entscheidung.

### Entscheidungen des Operators ohne wörtlichen Satz

Diese Entscheidungen stehen im Journal mit ihrem Tag und sind hier nur mit ihrer Wirkung genannt: die Palette aus dem Logo bleibt (2026-11-14), die Einstiegskacheln der Übersicht entfallen (2026-11-14), der Brief-Dialog bleibt vollständig (2026-11-14), die Forschungspfade verlassen die Oberfläche, die Startansicht wird über die Seitenleiste gefiltert, die Unteransichten sind oben zu finden (2026-11-14), keine Ampel für die Datenlage (2026-10-29), die Ausnahme für die Zellen der Heatmap (E6, 2026-11-05).
