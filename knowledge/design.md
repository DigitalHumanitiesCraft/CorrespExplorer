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

Die Oberfläche soll Forschungsdaten schnell lesbar machen und dabei einen ruhigen, papiernahen Charakter tragen, der aus dem Logo abgeleitet ist. Dieses Dokument hält fest, welche Gestaltungsregeln gelten und warum. Die Werte selbst (Farben, Abstände, Schriftgrößen, Radien, Schatten, Übergänge, Ebenen, Breakpoints) stehen allein in `docs/css/tokens.css`, Ladereihenfolge und Zuständigkeit der Stylesheets in `docs/css/CONTEXT-MAP.md`, die daraus abgeleiteten Handlungsregeln für Agenten in `CLAUDE.md`.

## Prinzipien

- Klare Hierarchie, damit Forschungsdaten schnell erfassbar sind.
- Rahmen geben Tiefe und Abgrenzung. Reguläre Elemente (Karten, Knöpfe, Eingaben, Leisten) tragen einen Rahmen und keinen Schatten.
- Die Akzentfarbe wird sparsam eingesetzt, für Aktionen, Auswahl und Hervorhebung. Als Flächenfarbe großer Bereiche ist Rostrot zu aggressiv für eine Arbeitsumgebung.
- Lesbarkeit geht vor Ästhetik. Auf Daten liegen keine Texturen, Halbtonraster oder dekorativen Verläufe.
- Nur unsichere Werte werden markiert, exakte bleiben ohne Zeichen ([Markierung nur an unsicheren Werten](#markierung-nur-an-unsicheren-werten)).
- Daten ändern sich ohne Animation, weil Bewegung bei der Analyse ablenkt.

Schatten erhalten nur schwebende Elemente (Dialoge, Demo-Tour, Toasts, Dropdowns, Tooltips, Karten-Popups und Kartensteuerung, mobile Sidebar), weil ein Schatten anzeigt, dass ein Element über der Seite liegt. Auf regulären Elementen erzeugt er Gewicht ohne Ebeneninformation. Gesetzt werden Schatten ausschließlich in `shadows.css` mit den Tokens `--shadow-*`, andere Stylesheets setzen höchstens `box-shadow: none`. Verläufe sind nur funktional erlaubt, etwa für gemischte Rollen in einer Legende oder die Jahresskala des Netzwerks.

## CSS-Architektur

Ladereihenfolge und Inhalt der Stylesheets beschreibt `docs/css/CONTEXT-MAP.md`. Für die Gestaltung gelten zusätzlich diese Regeln.

- `components.css` ist die einzige Quelle für `.btn`, `.btn-primary`, `.btn-secondary`, die Dialoggrundform ([Dialoge](#dialoge)) und den Kopfbereich der Ansichten ([Kopfbereich der Ansichten](#kopfbereich-der-ansichten)). Kein Stylesheet importiert `tokens.css` oder `components.css` erneut.
- Ebenen stehen nur als Skala `--z-*` aus `tokens.css`, `--z-raised` für Ebenen innerhalb einer Komponente. Kein Stylesheet setzt einen z-index als Zahl.
- Übergänge nennen ihre Eigenschaften über `--transition-properties` statt `transition: all` und ihre Dauer über `--transition-fast`, `--transition-base` oder `--transition-slow`.
- Sichtbarkeit schaltet die Klasse `.hidden` aus `base.css`, nie das Attribut `hidden`. Wo zwei Gründe eine Fläche ausblenden, hält ein Datenattribut den einen fest, so `data-available` an der Themenliste der Sidebar, die in der Themenansicht und ohne Themen verborgen ist. Erwähnungsfluss (`mentions-view.js`), Netzwerk (`network-view.js`) und Ortsansicht (`places-view.js`) schalten einzelne Elemente noch über `style.display`.
- Eine Komponente mit eigenen Breakpoints (Ansichtsleiste in `style.css`, Netzwerksteuerung in `explore.css`) führt diese direkt hinter ihren Grundregeln, weil eine spätere Grundregel gleicher Spezifität eine frühere Media Query überschreibt. So hatten bis 2026-11-05 die Grundregeln der Ansichtsleiste die Telefonregeln aufgehoben.

## Gliederung nach Gegenstand (Stufe vom 2026-11-14)

Der Operator hat den Stand nach dem Farbumbau am Bildschirm durchgesehen und die Gliederung beanstandet. Seine Sätze stehen hier wörtlich, damit sie jeden weiteren Umbau überleben. Sie stammen aus einer diktierten Eingabe, „Fuse“ lese ich als „Views“.

Zur Startansicht und zum Kopf:

> Warum sind hier zwei Ebenen, und es sind ein bisschen viele Strukturen, oder? Auch hier haben wir das Problem, dass wir zu viele Ebenen haben. Warum wird so viel Fläche nicht verwendet? Sind es nicht ein bisschen zu viele Fuse? Es sind sehr viele Fenster. Das heißt: Was würde man sinnvoll zusammenführen können, und wo kann man jetzt etwas lernen?

Zur Karte und zur Seitenleiste:

> Also hier fallen mir auch wieder zu viele Ebenen ein. Also, ich finde, wir haben zu viele Strukturen, auch in der Sidebar, und auch zu viele Ebenen. Die Cards oben (Datensatz, Briefe, Personenorte) sind ein bisschen sehr mächtig. Brauchen wir hier wirklich Untertitel, also Datensatz, Filter, Zeitraum? Wir wollen das User-Interface mehr sprechen lassen.

Daraus folgt der Aufbau dieser Stufe.

- Die Kopfzeile nennt die Gegenstände einer Korrespondenz, Start, Briefe, Personen, Orte, Zeit und Themen. Bis dahin standen dort zwölf Ansichten, benannt nach ihrer Darstellungstechnik, in einer zweiten Zeile unter Titel und Aktionen. Ein Gegenstand, für den der Datensatz nichts enthält, erscheint nicht.
- Die Darstellungen eines Gegenstands wählt eine Umschaltung in der Kopfzeile der Ansicht. Personen haben Liste, Netzwerk und Erwähnungen, Orte haben Karte und Liste, die Zeit hat Jahre, Chronik und Tage. „Vergleichen“ steht bei Personen und Orten als Handlung neben der Umschaltung und öffnet den Vergleich für das, was der Gegenstand listet. Der Reiter eines Gegenstands öffnet die zuletzt benutzte Darstellung.
- Die Kopfzeile einer Ansicht sagt, was gerade zu sehen ist, etwa die Zahl der Orte oder unter einem Filter den Anteil. Den Namen des Gegenstands trägt der Reiter. Die Briefliste nennt ihre Zahl in der Zeile über der Liste und führt deshalb keinen sichtbaren Titel, die Startansicht beginnt mit den Kennzahlen des Datensatzes, dessen Namen die Kopfzeile trägt. Titel, eigene Bedienelemente einer Ansicht und die Umschaltung teilen sich ab 768px eine Zeile und brechen um, wo sie nicht passen.
- Erklärende Zeilen unter dem Titel sind nicht mehr sichtbar und bleiben für Screenreader im Dokument. Was eine Grafik kodiert, steht an der Grafik, die Kreisgröße der Karte in ihrer Legende.
- Die Seitenleiste zeigt keine Überschriften. Ein Regler mit Jahreszahlen, Häkchen mit ihren Aussagen und eine Liste von Sprachen nennen sich selbst. Die Gruppennamen bleiben für Screenreader erhalten. Die drei Kennzahlen stehen als eine Zeile Text ohne Kacheln, der Knopf „Filter aufheben“ erscheint nur unter einem Filter.
- Die Sprachen der Seitenleiste tragen das Farbfeld, das sie in Zeitleiste und Karte haben. Die Liste ist damit zugleich deren Legende.
- Die kurze Themenliste der Seitenleiste entfällt. Ein Thema wählt man in der Themenansicht, es erscheint dann als Filtermarke. Der Abschnitt des Wissenskorbs erscheint in der Seitenleiste erst mit dem ersten Eintrag.
- Korb, Export und About stehen ohne Rahmen neben den Reitern.
- Die Startansicht nutzt die Breite. Unter Titel, Kennzahlen und Datenlage stehen links die Briefe pro Jahr als Hauptgrafik, die in die Ansicht Zeit führt, und rechts die Forschungspfade. Die Quelle mit Lizenz schließt die Seite ab.
- About bleibt in der Kopfzeile, der Verweis auf die Wissensbasis steht auf der Projektseite.

Die Gliederung nach Darstellungstechnik ist derselbe Fehler, den das Hauswissen für Arbeitsoberflächen beschreibt, Ansichten nach technischen Kategorien statt nach dem, womit die Zielgruppe arbeitet. Die Zählung von Überschriften, Rahmen und Textstilen hatte ihn nicht gezeigt, weil sie bis zu dieser Stufe nur den Inhaltsbereich der aktiven Ansicht erfasste und Kopf und Seitenleiste ausließ. Sie zählt seither den ganzen ersten Bildschirm.

Die Adressen der zwölf Darstellungen (`view=`) bleiben gültig, geteilte Links führen weiter an ihr Ziel.

## Farben

Die Palette ist aus dem Logo abgeleitet, die Werte stehen in `tokens.css`. Der Operator hat sie am 2026-11-14 als Erscheinung des Projekts bestätigt. Hier steht, welche Farbe wofür gilt.

- `--color-bg` (Papier) ist der globale Hintergrund, `--color-bg-light` (Manila) der Grund von Steuerleisten, Feldern und der Zeile unter dem Mauszeiger.
- `--color-text` ist Haupttext und Kontur, `--color-text-light` Nebentext und Hinweise.
- `--color-border` zieht die kräftigen Konturen. `--color-border-light` dient nur für Trennlinien und ist für Bedienelemente zu blass. `--color-border-control` ist der Rand von Eingaben und Knöpfen ohne eigene Füllung und erreicht den nach WCAG 1.4.11 nötigen Kontrast.
- `--color-primary` (Rostrot) ist die Interaktionsfarbe. Sie steht an dem, was sich anklicken lässt oder ausgewählt ist, also an gefüllten Knöpfen, Links, dem aktiven Reiter, der Auswahl und dem Fokusrahmen. Daten, Kennzahlen, Überschriften und Symbole ohne eigene Funktion tragen sie seit 2026-11-14 nicht mehr, weil ein Ziel umso schwerer zu finden ist, je mehr andere Elemente seine Farbe teilen (Wolfe & Horowitz, 2017). Die Anwendung dieses Befunds aus der Suchforschung auf eine Oberfläche ist eine eigene Übertragung. `--color-primary-dark` ist Hover und als `--color-link` die Farbe der Links, weil `--color-primary` auf `--color-bg-light` den Kontrast für Text verfehlt.
- `--color-data` (Tintenblau) ist die Farbe einzelner Datenreihen, also der Balken, der Skala der Heatmap, der Kartenpunkte und der Personen im Netzwerk. `--color-secondary` hat denselben Wert und bleibt die zweite Farbe der Startseite. Die Trennung von Interaktionsfarbe und Datenfarbe folgt dem Muster Functional Color Semantics des Hauswissens.
- `--color-success`, `--color-warning`, `--color-info` und `--color-error` sind Statusfarben. Warning und Info wurden am 2026-10-29 abgedunkelt, damit sie als Text auf `--color-bg` und `--color-bg-light` AA erreichen.
- Helle Tönungen für Hover und Statusflächen (`--color-*-light`) mischt `color-mix()` aus den Grundfarben. Hinter Dialogen und dem mobilen Menü liegt `--color-backdrop`, hinter der Demo-Tour `--color-overlay`.

Die Landing-Page zeigt `assets/logo-no-background.png`, das Seitensymbol aller Seiten ist `assets/logo-no-background-no-text.png`.

### Datenvisualisierung

Grafiken nehmen ihre Farben aus Tokens. D3-Attribute, die `var()` nicht auflösen, lesen die Werte über `readTokens()` aus `views/view-support.js`.

- Die Karte färbt Land, Parks und Wald in `--color-map-land` und Wasser in `--color-map-water`. Cluster stehen in `--color-data`, einzelne Orte in der Farbe ihrer häufigsten Briefsprache oder, nach Umschalten, einheitlich in `--color-data`. Die Legende führt die Sprachen mit eigener Farbe und einen Eintrag für alle weiteren.
- Im Netzwerk stehen Personen in `--color-role-sender`, das denselben Wert wie `--color-data` hat, Themen in `--color-warning` und Organisationen im Farbmodus nach Art in `--color-primary`. Kanten sind `--color-text-light`, hervorgehoben `--color-text`, der Knotenrand `--color-bg`. Der Farbmodus nach Eintrittsjahr nutzt die sequentielle D3-Skala `interpolateYlGnBu` mit einer Verlaufslegende.
- Der Erwähnungsfluss zeigt Absender links in `--color-role-sender`, die gewählte Person in der Mitte in `--color-primary`, weil sie die Auswahl ist, und erwähnte Personen rechts im warmen Grau `--color-role-mentioned`.
- Die Timeline stapelt ihre Balken nach Sprache in den [Sprachfarben](#sprachfarben), ohne Sprachdaten bleiben sie einfarbig in `--color-data`. Zwischen zwei Segmenten liegt eine Linie in `--color-bg`. Der Balken „Spanne“ steht in `--color-text-light`.

#### Aktivitäts-Heatmap

Die Heatmap nutzt eine sequentielle Skala zur Datenfarbe. Stufe 0 (kein Brief) ist `--color-bg-light`, die Stufen 1 bis 4 sind `--color-scale-1` bis `--color-scale-4` und reichen bis `--color-data`. Die unterste Stufe ist so kräftig gemischt, dass sie sich von der leeren Zelle abhebt. Bis 2026-11-14 lief die Skala zur Primärfarbe und davor über Grüntöne außerhalb der Palette. Die Klassen `.activity-level-0` bis `.activity-level-4` stehen in `explore.css`.

Die Zellen bleiben 12 x 12px und unterschreiten damit die Zielgröße von 24 x 24px nach WCAG 2.2 SC 2.5.8. Das Werkzeug beruft sich auf die Ausnahme „wesentliche Darstellung“, weil ein Tageskalender über Jahrzehnte nur als dichtes Raster lesbar ist. Bei 24px würde der Kalender des HSA viermal so groß und müsste in beide Richtungen scrollen. Jede Zelle bleibt per Tastatur (Roving Tabindex, Pfeiltasten) und Tooltip erreichbar. Die Ausnahme ist eine Auslegung der Norm und keine Messung (Entscheidung E6 vom 2026-11-05).

Das Jahr der Heatmap wählt eine Auswahlliste mit Knöpfen für das vorige und das nächste Jahr, jede Option nennt die tagesgenauen Briefe des Jahrs. Bis 2026-11-05 stand ein Knopf je Jahr über der Heatmap, beim HSA mehrere Dutzend.

### Sprachfarben

Der Farbton allein trägt nur wenige Kategorien. In einer Suchaufgabe unter kontrollierten Bedingungen waren sieben Farben die Grenze für schnelles Erkennen (Healey, 1996), und Fehler nehmen mit der Größe der Palette zu (Gramazio et al., 2017). Die häufigsten Sprachen eines Datensatzes erhalten deshalb je eine Farbe aus `LANGUAGE_PALETTE` in `docs/js/constants.js`, in der Reihenfolge ihrer Briefzahl. Alle übrigen teilen das warme Grau von „Weitere Sprachen“, Briefe ohne Sprache ein helleres. `computeLanguageColors()` setzt die Zuordnung beim Laden, `isRestLanguage()` sagt, ob eine Sprache zum Rest gehört. Die Sprachfarben sind die einzigen Datenfarben außerhalb von `tokens.css`.

Die Palette besteht aus sechs Farben der Okabe-Ito-Reihe (Okabe & Ito, 2008), die für Lesende mit Farbfehlsichtigkeit entworfen ist. Ihr Gelb fehlt, weil es auf dem Papierton verschwindet, ihr Schwarz, weil Tinte die Textfarbe ist. Nachbarn in der Reihenfolge unterscheiden sich in der Helligkeit, die häufiger erkannt wird als ein Unterschied im Farbton (Szafir, 2018). Eine aus der Logofarbe abgeleitete, gedämpfte Reihe wurde am 2026-11-14 erwogen und verworfen, weil Farben einer Tonfamilie und entsättigte Farben schwerer zu benennen und zu trennen sind (Heer & Stone, 2012). Ebenso verworfen ist die frühere Lösung mit einer kräftigen Farbe für die häufigste Sprache und Pastelltönen für alle anderen. Für das Zusammenfassen unter „Weitere Sprachen“ liegt keine Studie vor, die Grenze bei sechs Farben ist eine eigene Setzung. Einzeln bleiben diese Sprachen im Filter der Seitenleiste, im Tooltip und in der Tabelle. Ein Klick auf das graue Segment setzt den Sprachfilter auf alle Sprachen des Rests. Jede Sprache der Legende ist ein Schalter, der denselben Filter für die ganze Zeitleiste setzt und beim zweiten Druck aufhebt. Er ist der Tastaturweg zu dem, was ein Segment mit dem Zeiger bietet.

Mehrere der Farben erreichen auf `--color-bg` den Kontrast von 3:1 für Grafikteile nicht. Das Werkzeug stützt sich hier auf die Tabelle „Daten als Tabelle“, die dieselben Werte in Textform führt, nach dem Understanding-Dokument zu WCAG 1.4.11 genügt das. Die Quellenangaben stehen unter [Quellen der Farbentscheidungen](#quellen-der-farbentscheidungen).

Fehlen Sprachdaten ganz (`hasLanguageData` prüft, ob ein Brief `language.code` trägt), wären gestapelte Balken mit einer einzigen Kategorie irreführend. Die Balken bleiben dann einfarbig, Tooltip und Tabelle der Timeline nennen keine Sprachen, und die Legende sagt in einer Zeile „Keine Sprachdaten im Korpus“.

### Unsicherheits-Indikatoren

Unsicherheit spricht in allen Ansichten dieselbe visuelle Sprache. Symbole, Tooltip-Texte und CSS-Klassen je Präzisionsstufe stehen in [uncertainty-specification.md](uncertainty-specification.md#ui-display), hier steht die Farbcodierung.

- Unvollständiges Datum (nur Jahr oder Monat) in `--color-warning`.
- Zeitraum in `--color-text-light` mit seinem Symbol.
- Unsichere Datierung (`cert="low"`) in `--color-error`.
- Unbekanntes Datum in `--color-text-light`, kursiv.
- Erschlossene Werte in eckigen Klammern und gedämpft (`.date-inferred`, `.place-inferred`), ein nur als Text überliefertes Datum kursiv (`.date-text`), ein unplausibles Jahr mit dem Wort „unplausibel“ (`.date-implausible`).
- In der Timeline zeigt eine diagonale Schraffur (`.timeline-uncertainty-overlay`) den Anteil unscharf oder erschlossen datierter Briefe eines Jahrs als Höhe des schraffierten Bereichs.

Symbole stehen vor dem Datumswert, Tooltips erklären sie bei Hover, die Legende der Timeline nennt die Zahl der betroffenen Briefe. Die früheren Werte Amber (1.9:1 auf `--color-bg`) und ein helles Rot erreichten den für Symbole nötigen Kontrast von 3:1 nicht. Die Legende auf `about.html` nutzt dieselben Tokens über `.color-warning`, `.color-info` (auf `--color-secondary`), `.color-error` und `.color-muted` in `base.css`.

## Typografie

Die Schriftfamilien und die Größenskala stehen als `--font-*` und `--font-size-*` in `tokens.css`.

- Überschriften stehen in `--font-headings` (Merriweather) und `--color-text`. Der Name des Werkzeugs in der Kopfzeile ist ein Link zur Startseite und steht in `--color-primary`.
- Fließtext steht in `--font-base` auf `--font-size-base` mit Zeilenhöhe 1.6.
- Kleine Bezeichnungen über Kennzahlen und Gruppen stehen in Versalien mit leichtem Zeichenabstand.
- Zahlen in Kennzahlen und Tabellen nutzen gleich breite Ziffern (`font-variant-numeric: tabular-nums`). `--font-mono` bleibt Code und Kennungen vorbehalten, etwa den Einträgen eines Briefs in der Quelle (`.letter-records__id`).
- Keine Schrift unterschreitet `--font-size-xs`, auch nicht in Zählern, Badges und Icons kleiner Kreise. Bis 2026-11-05 zogen einige Regeln 1 bis 4px davon ab (Achsenbeschriftung der Timeline, Korbzähler, Legenden).

Überschriften folgen der Dokumentgliederung, `h1` (visuell versteckt) für die Seite, `h2` für den Kopf jeder Ansicht des Explorers, darunter `h3` und `h4` in den Detailbereichen. Größe und Abstand der `h2` setzt die Komponente `.view-header`, nicht die Ebene.

## Abstände und Radien

Abstände nutzen ausschließlich die Skala `--space-*`, Rundungen `--radius-*`. Kleine Elemente und Tags erhalten `--radius-sm`, Karten und Knöpfe `--radius-md`, Dialoge `--radius-lg`, Pillen, Chips und runde Badges `--radius-full`.

## Animationen

Bewegung bleibt sparsam. Erlaubt sind Hover-Übergänge von Farbe, Hintergrund und Rand, das Einblenden von Dialogen und das Erscheinen von Tooltips. Ausgeschlossen sind Bounce-Effekte, gleitende Animationen bei Datenänderungen und Ladeanzeigen, die länger als zwei Sekunden ohne Rückmeldung laufen.

Reduzierte Bewegung (WCAG 2.3.3) wird respektiert. Bei `prefers-reduced-motion: reduce` setzt `base.css` Übergänge und Animationen auf ihren Endzustand. In D3 liefert `motionMs()` dann 0ms für Übergänge und Zoom, `settleWithoutMotion()` berechnet das Kräftelayout des Wissenskorbs vorab und zeichnet es einmal. Das Netzwerk des Explorers berechnet sein Layout immer vor dem Zeichnen. Die Demo-Tour scrollt ohne Glättung. Ein gezogener Knoten bewegt sich weiter mit, weil diese Bewegung der Hand folgt. Die Helfer stehen in `utils.js`.

## Komponenten

### Kacheln, Zeilen, Knöpfe und Eingaben

- Kacheln (`.stat-card`, `.dataset-card`) tragen einen Rahmen, `--radius-md` und keinen Schatten. Sie stehen für wenige, eigenständige Objekte.
- Einträge einer Liste (`.letter-card`, `.person-card`, `.entity-card`, die Forschungspfade) sind Zeilen auf dem Papierton, getrennt durch eine Haarlinie in `--color-border-light`. Unter dem Mauszeiger liegt `--color-bg-light`, eine gewählte Zeile trägt `--color-primary-light` und einen rostroten Streifen am linken Rand. Bis 2026-11-14 war jeder Eintrag eine gefüllte Kachel mit 2px-Rahmen. Bei gleichartigen Einträgen in großer Zahl kostet das Platz und erschwert den Vergleich, die Praxisliteratur empfiehlt dafür Listen (Laubheimer, 2016), eine Messung der Suchzeit liegt dazu nicht vor. Die Klassennamen sind aus der Zeit der Kacheln geblieben.
- `.btn-primary` ist rostrot gefüllt mit weißer Schrift und bleibt der Haupthandlung vorbehalten. `.btn-secondary` hat Text in `--color-text` und einen Rand in `--color-border-control`, erst unter dem Mauszeiger wird er rostrot.
- Eingaben und Knöpfe ohne eigene Füllung tragen ihren Rand in `--color-border-control`. Eingaben behalten den sichtbaren Fokusrahmen, kein Seiten-CSS setzt `outline: none` auf `:focus`.
- Knöpfe, die als Text erscheinen (Namen in Listen, Pfadschritte, Themen in der Sidebar), setzen Rahmen und Hintergrund zurück und übernehmen Schrift und Farbe.

### Dialoge

Alle Seiten nutzen eine Dialogform aus `components.css`. `.modal` ist der Hintergrund, `.modal-content` der Kasten, `.modal-lg` weitet ihn für Listen. Der Kasten bleibt in der Bildschirmhöhe, es scrollt nur `.modal-body`. Er trägt die dicke Kontur `--border-modal` und dazu den Schatten aus `shadows.css`, weil er über der Seite schwebt. Dynamisch erzeugte Dialoge (gemeinsame Briefe im Vergleich, Briefe einer Erwähnung) nutzen dieselben Klassen und `openModal()`. Bis 2026-11-05 gab es drei Grundformen in `components.css`, `explore.css` und `upload.css` und zwei Klassensysteme (`.modal`, `.modal-overlay`).

`enableModalKeyboard()` in `utils.js` regelt die Tastatur für alle Seiten. Escape schließt den obersten offenen Dialog über seinen Schließen-Knopf, beim Öffnen springt der Fokus auf diesen Knopf, Tab bleibt im Dialog, beim Schließen kehrt der Fokus auf das auslösende Element zurück. Die Dialoge tragen `role="dialog"`, `aria-modal` und `aria-labelledby` auf ihre Überschrift. Die Demo-Tour verhält sich ebenso, der Fokus liegt auf dem Hauptknopf des aktiven Schritts, Tab bleibt im Schritt, Escape beendet die Tour. Die mobile Sidebar schließt mit Escape und gibt den Fokus an ihren Schalter zurück.

Toasts liegen über den Dialogen, damit eine Meldung aus einem Dialog sichtbar und schließbar bleibt. Die Demo-Tour hebt ihr Zielelement mit Rahmen und abdunkelndem Schatten hervor. Das Element bleibt dabei unter dem Tour-Dialog und nimmt keine Klicks an, damit „Weiter“ immer erreichbar ist. Ein Ziel außerhalb des Bildschirms wird nicht hervorgehoben.

Karten-Popups lassen rechts im Kopf Platz für den Schließen-Knopf von MapLibre (`padding-right` an `.popup-header`), damit der Stern zum Korb klickbar bleibt.

Der Dialog eines Briefs wiederholt Datum, Absender, Empfänger, Ort und Sprache der Zeile. Er zeigt alles, was die Quelle zu dem Brief verzeichnet, und bleibt deshalb vollständig (Entscheidung des Operators vom 2026-11-14).

### Kopfbereich der Ansichten

Alle Darstellungen des Explorers beginnen mit derselben Komponente `.view-header` aus `components.css`. Seit der [Stufe vom 2026-11-14](#gliederung-nach-gegenstand-stufe-vom-2026-11-14) ist ihr sichtbarer Teil eine Zeile aus Titel und Umschaltung der Darstellung.

- `.view-header__title` ist die `h2` und nennt, was die Ansicht gerade zeigt (`updateViewTitle()` in `explore.js`). `.view-header__description` bleibt als Beschreibung für Screenreader im Dokument und ist nicht sichtbar. `.view-header__actions` ist ein optionaler Bereich für Hinweise, Suche und Moduswahl. Die Umschaltung `#view-variants` hängt `explore.js` in den Kopf der aktiven Ansicht.
- Titel und Beschreibung stehen links. Weitere Kinder wie die Kennzahlen und die Quellenzeile der Übersicht reihen sich darunter ein.
- Die Aktionen stehen ab 768px rechts neben Titel und Beschreibung und nehmen höchstens die halbe Breite ein, darunter brechen sie unter die Beschreibung um. Die Spalte darf schrumpfen, ihre Elemente umbrechen dann innerhalb der Spalte.
- Einen Aktionsbereich haben Aktivität (Hinweis „Experimentell“), Erwähnungsfluss (Personensuche) und Chronik (Layoutwahl und Wikidata-Anreicherung). Was der Vergleich vergleicht, folgt aus dem Gegenstand, von dem aus er geöffnet wurde, seine frühere Moduswahl ist nicht mehr sichtbar.
- `.view-header--inset` gilt für Ansichten ohne gepolsterten Container (Karte, Korrespondenten, Briefe, Erwähnungsfluss). Der Kopf trägt dort selbst den Innenabstand und schließt mit einer Linie in `--color-border-light` statt mit Außenabstand ab.
- Die Überschriften tragen keine Icons, damit alle Köpfe gleich beginnen. Der Zusatz „(angereichert)“ der Chronik hängt per `::after` am Titel.
- Auf der Karte liegen Steuerung und Legende auf `.map-stage`, die ab 768px den Platz unter dem Kopf füllt. Auf Telefonen behalten Karte und Listen ihre feste Höhe, die Seite scrollt um die Höhe des Kopfes.

## Layout und Breakpoints

Die Breakpoints stehen als `--breakpoint-*` in `tokens.css`, die Sidebarbreite als `--sidebar-width`. Media Queries können keine Custom Properties auswerten und wiederholen daher die Werte. Abfragen für Telefone lauten `max-width: 767px`, damit genau 768px das Tablet-Layout erhält, die Tablet-Abfrage lautet `max-width: 1024px`. Ausnahmen richten sich nach der verbleibenden Inhaltsbreite neben der Sidebar, so `max-width: 1600px` für das zweispaltige Entitäten-Layout in `components.css`.

- Unter 768px liegt die Sidebar außerhalb des Bildschirms, höchstens 85 % der Bildschirmbreite breit, und ein Filter-Schalter in der Navigation öffnet sie (`#sidebar-toggle`, `aria-expanded`). Der Inhalt nimmt die volle Breite, der Ansichtswechsel wird zur scrollbaren Icon-Leiste, vom Datensatztitel bleibt nur der Pfeil zurück.
- Von 768px bis 899px zeigen die Navigationslinks nur ihr Icon, der Text bleibt für Screenreader erhalten.
- Ab 768px hat die Sidebar `--sidebar-width`, bis 1024px eine schmalere feste Breite, der Inhalt füllt den Rest.

Ab 768px hat die Kopfzeile der Arbeitsansicht eine Zeile mit Datensatztitel, den Gegenständen und den Aktionen, darunter zwei Zeilen mit den Gegenständen in der zweiten (`grid-template-areas` in `style.css`). Die Höhe steht in `--navbar-height`.

Die Umschaltung der Darstellung bricht unter 768px um, statt ihre letzten Einträge zu verbergen. Die geschlossene Seitenleiste ist dort nicht sichtbar und nicht in der Tab-Folge.

Der Wissenskorb stapelt Liste und Auswertung bis 1024px, die Liste nimmt dann die volle Breite. Breite Darstellungen (Timeline, Aktivitäts-Heatmap, Erwähnungsfluss) scrollen in ihrem eigenen Container, die Seite selbst bleibt ohne horizontalen Überlauf (geprüft 2026-10-29 bei 390px, am 2026-11-05 für alle zwölf Ansichten bei 1440, 1024, 768 und 390px mit Playwright).

## Visualisierungslogik

### Markierung nur an unsicheren Werten

Exakte Daten bleiben ohne Markierung, damit gute Daten kein visuelles Rauschen erzeugen. Nur Unsicherheiten erhalten Farbe und Symbol nach [Unsicherheits-Indikatoren](#unsicherheits-indikatoren). `formatters.js` liefert die Klassen aus `datePrecision`. Die Entscheidung steht in [specification.md](specification.md#adr-002-unsicherheit-sichtbar-machen), die Regeln für Datensätze, deren Normalfall ein unmarkierter Wert ist, unter [Briefsätze und Überlieferung](#briefsätze-und-überlieferung-iteration-november-2026).

### Undatierte Briefe als abgesetzter Balken

Briefe ohne Jahr stehen in einem eigenen Balken rechts der Timeline und werden keinem Platzhalterjahr zugeordnet, das die Zeitachse verzerren würde. Die Trennung macht die Datenlage sichtbar. Ein Klick oder Enter auf den Balken (`role="button"`) filtert auf diese Briefe, unter dem Jahresregler steht dann „Nur Briefe ohne Datum“. Sind alle Briefe datiert, zeigt ein gestrichelter Platzhalter mit Häkchen diesen Zustand an. Briefe, die über mehrere Jahre datiert sind, stehen in keinem Jahresbalken, sondern im Balken „Spanne“ daneben, der nur informiert und nicht filtert, weil der Jahresfilter nach dem Anfangsjahr wählt (Entscheidung E5).

### Karte

- Grundkarte ist der helle Stil von OpenFreeMap (Positron), umgefärbt mit `--color-map-land` für Land, Parks und Wald und `--color-map-water` für Wasser (`applyPaperBasemap()` in `explore.js`). Die Farben ändern nur die Darstellung des geladenen Stils, es wird keine weitere Ressource geladen. Fehlt eine Ebene in einer späteren Fassung von Positron, bleibt ihre Originalfarbe. Der dunkle Stil bleibt über den Ebenen-Knopf erreichbar. Bis 2026-11-05 startete die Karte dunkel, danach kurz grau.
- Ist die Grundkarte nicht erreichbar, zeigt die Karte die Orte auf einer einfarbigen Fläche in `--color-bg-light` und meldet das in einem Toast.
- Orte sind Kreise, deren Größe der Briefzahl folgt, Cluster tragen ihre Zahl innen.
- Die Marker sind Teil der MapLibre-Fläche und nicht einzeln fokussierbar. Der Tastaturweg zu denselben Orten ist die Darstellung „Liste“ in der Umschaltung der Ansicht Orte.

### Netzwerk

Das Netzwerk startet im Modus Briefwechsel. Eine Kante verbindet zwei Personen, die einander schrieben, ihre Breite folgt der Zahl der Briefe in beide Richtungen, der Tooltip nennt beide Richtungen (Entscheidung E8 vom 2026-11-05). Beim HSA entsteht ein Stern um den Nachlassgeber, „Ego ausblenden“ zeigt die Verbindungen der übrigen Personen.

Die Standardschwelle für eine Kante (Briefe `minLetters`, gemeinsame Jahre `minYears`, bei Themen gemeinsame Briefe `minCooccurrence`) ist der höchste Wert bis zum Vorgabewert in `NETWORK_DEFAULTS`, bei dem der Datensatz noch eine Kante zeigt. Große Datensätze behalten so eine lesbare Schwelle, kleine wie der Tutorial-Datensatz zeigen ein Netz statt einer leeren Fläche. Die frühere Regel nach der Zeitspanne ließ den Tutorial-Datensatz (über 20 Jahre, wenige Briefe je Absender) leer.

Knoten sind einfache Kreise, deren Größe der Briefzahl folgt, weil Symbole bei vielen Personen unlesbar werden. Die Deckkraft der Kanten sinkt mit ihrer Zahl. Der Farbmodus nach Eintrittsjahr färbt jeden Korrespondenten nach dem Jahr seines ersten Briefs und macht frühe und späte Teilnehmer und die Entwicklung des Netzwerks sichtbar. Beschriftung, Ego-Hinweis und Farbwahl nach Art regelt [Briefsätze und Überlieferung](#briefsätze-und-überlieferung-iteration-november-2026).

### Timeline

Die Balken sind nach Sprache gestapelt ([Sprachfarben](#sprachfarben)), die Schraffur zeigt den Anteil unscharfer und erschlossener Datierungen ([Unsicherheits-Indikatoren](#unsicherheits-indikatoren)). Beim Hover hellt sich der Balken auf, ein Tooltip nennt Zahl und Gründe. Die Jahreszahlen der Achse stehen schräg in `--font-size-xs`.

### Listen

Listen verzichten auf wechselnd gefärbte Zeilen, weil sie unruhig wirken. Zahlen stehen rechtsbündig. Ein Brief steht ab 1024px in einer Zeile mit Korrespondenten, den Angaben der Quelle und dem Datum, darunter in zwei bis drei Zeilen. Die Korrespondentenliste führt keine Kreise mit Initialen mehr, weil sie keine Angabe trugen, die der Name nicht trägt. Eine Zeile hat ein Ziel und den Stern zum Korb, die Korrespondentenzeile zusätzlich den Knopf zu den Details. Der Link zur Quelle und der Weg zu correspSearch stehen im Dialog. Der Stern ist ein Umriss, bis der Eintrag im Korb liegt, der Zustand hängt damit nicht an der Farbe allein. Bei eingeklappter Seitenleiste nennt ein Hinweis unter dem Kopf jeder Ansicht den aktiven Filter (`renderFilterNotice()`).

## Interaktionsmuster

### Transparente Datenlage

Fehlende Daten werden ausdrücklich als „unbekannt“ markiert, Tooltips erklären die Symbole. Forschende brauchen diese Transparenz, um die Reichweite ihrer Schlüsse einzuschätzen. Texte über Lücken in Partnerdaten folgen [ADR-005](specification.md#adr-005-nicht-wertende-sprache-für-partnerdaten) und beschreiben sie als Anreicherungspotential.

### Progressive Disclosure

Die Oberfläche zeigt zuerst den Überblick und Details auf Klick, vollständige Metadaten in Dialog oder Panel. Bei großen Datensätzen würde die gleichzeitige Anzeige aller Details überfordern. Was man für die Arbeit braucht, bleibt dabei sichtbar oder über einen Filter erreichbar ([Briefsätze und Überlieferung](#briefsätze-und-überlieferung-iteration-november-2026)).

### Startansicht und Navigation

Die Zahl dessen, was eine Ansicht zeigt, steht in ihrer Titelzeile, unter einem Filter als Anteil („95 von 774 Orten“). Die Karte nennt die Orte, die sie zeichnet, der Vergleich nennt, was er vergleicht. Die Seitenleiste wiederholt diese Zahlen seit 2026-11-14 nicht mehr, ihr Abschnitt mit den drei Kennzahlen ist ausgeblendet. Kennzahlen und Datenlage entstehen aus einer Zusammenfassung beim Laden (`summarizeCorpus()`, `datasetQuality()`).

Die Sprachliste der Sidebar zeigt die acht häufigsten Sprachen des Datensatzes mit ihrem Farbfeld und fasst die übrigen in der aufklappbaren Gruppe „weitere Sprachen“ zusammen. Eine Sprache, der die übrigen Filter keinen Brief lassen, verlässt die Liste, bis ein Filter sie wieder trifft. Die kurze Themenliste der Sidebar ist seit 2026-11-14 nicht mehr sichtbar.

Die Navigation zeigt die Gegenstände der Korrespondenz mit ihrem Namen, ab 768px in einer Zeile mit Datensatztitel und Aktionen, darunter in einer zweiten Zeile. Auch bei 360px sind alle Reiter beschriftet. Bis 2026-11-14 standen dort zwölf Ansichten, bis 2026-11-10 unter 1600px nur als Icons, was der Operator beanstandet hatte.

Das Hinweisfeld der Startseite nennt das Werkzeug ein Experiment, sagt, was es zeigt, dass es kein fertiges oder betreutes Produkt ist und wohin Rückmeldungen gehören, ohne Tooltip.

Die Startansicht fasst Kennzahlen, Quelle mit Lizenz und Änderungsvermerk, drei Chips zur Datenlage und bis zu vier Forschungspfade auf einer Bildschirmhöhe zusammen. Die sechs Einstiegskacheln zu einzelnen Ansichten hat der Operator am 2026-11-14 gestrichen, weil die Ansichtsleiste direkt darüber in dieselben Ansichten führt. Die Chips heißen nach dem, was sie zählen („auf den Tag datiert“, „mit Normdatensatz“, „mit Koordinaten“), und stehen in der neutralen Chip-Gestaltung (Rahmen `--color-border-light`, Text `--color-text-light`) ohne Färbung nach dem Anteil. Eine Ampel bewertete die Daten der Partner und widersprach damit [ADR-005](specification.md#adr-005-nicht-wertende-sprache-für-partnerdaten). Der Operator hat sie am 2026-10-29 verworfen. Was die Übersicht für Briefsätze zusätzlich zeigt, steht unter [Briefsätze und Überlieferung](#briefsätze-und-überlieferung-iteration-november-2026).

### Wissenspfade

Ein gestarteter Forschungspfad erscheint als eine Leiste unter der Navigation mit Frage, nummerierten Schritten, Zurück, Weiter (im letzten Schritt Abschließen) und Beenden. Den Korb zählen Navigation und Sidebar, die Leiste wiederholt ihn nicht. Bis 2026-11-05 gab es zusätzlich eine zweite Pfadnavigation unter der Ansicht und einen Zähler „Items“ in der Leiste.

### Forschungspfade

In der Übersicht ist ein Forschungspfad eine Zeile mit Frage, einem Satz zu dem, was der Datensatz dazu enthält, und dem Startknopf. Die Schritte erscheinen erst in der Leiste des gestarteten Pfads, mit ihrer Aktion als sichtbarem Text, weil Tooltips Hover verlangen und wesentliche Information verstecken. Bis 2026-11-14 zeigte jede Zeile zusätzlich eine Vorschau der häufigsten Einträge und die Schritte als Knöpfe und hatte damit mehr Ebenen, als der Maßstab des Hauswissens je Eintrag erlaubt. Der Operator hat die Kürzung an diesem Tag entschieden. Fragen, die der Datensatz nicht beantworten kann, stehen nicht als gesperrte Zeilen zwischen den Pfaden. Sie stehen im aufklappbaren Abschnitt „Anreicherungspotential“ (`details.questions-enrichment`) mit der fehlenden Angabe und dem CMIF-Element, das sie ergänzen würde.

## Barrierefreiheit

### Kontraste

| Kombination | Verhältnis | Ergebnis |
|---|---|---|
| Text auf BG | 14.3:1 | AAA |
| Primary auf BG | 5.1:1 | AA |
| Primary auf BG Light | 4.45:1 | verfehlt AA, dort `--color-primary-dark` (5.86:1), etwa Links in `.info-box`, `.link-list` und `.feature-item` der About-Seite |
| Primary auf Warning Light | 4.3:1 | verfehlt AA, dort `--color-primary-dark` (5.65:1), etwa Hinweisfeld und Tooltip-Auslöser der Startseite |
| Data auf BG | 7.2:1 | AAA |
| Link (Primary Dark) auf BG und BG Light | 6.7:1 und 5.9:1 | AA |
| Link gegen umgebenden Text | 2.1:1 | unter 3:1, Links im Fließtext sind deshalb unterstrichen (WCAG 1.4.1, Technik G183) |
| Text Light auf BG und BG Light | 7.0:1 und 6.1:1 | AA |
| Role Mentioned auf BG | 4.9:1 | AA, das frühere kühle Grau erreichte 4.2:1 |
| Warning auf BG und BG Light | 6.1:1 und 5.3:1 | AA |
| Info auf BG und BG Light | 6.7:1 und 5.9:1 | AA |
| Border Control auf BG und BG Light | 3.9:1 und 3.4:1 | erfüllt 1.4.11, Rand von Eingaben und Knöpfen |
| Border Light auf BG | 1.4:1 | nur für Trennlinien, bis 2026-11-05 auch Rand von Suchfeldern und Schrittknöpfen |
| BG Light auf Text (Hinweis im dunklen Tooltip) | 12.5:1 | AAA, vorher Text Light mit Deckkraft 0.8, etwa 1.8:1 |

Die Werte sind nach der WCAG-Formel für relative Leuchtdichte am 2026-10-29 berechnet, die Zeilen zu Border Control, Border Light und Tooltip-Hinweis am 2026-11-05, die Zeilen zu Data, Link, Text Light und Role Mentioned am 2026-11-14.

### Quellen der Farbentscheidungen

Die Befunde hat ein lesender Agent am 2026-11-14 aus den Volltexten zusammengetragen, die bauende Session hat sie übernommen und die Kontrastwerte nachgerechnet. Alle genannten Farbstudien schließen Menschen mit Farbfehlsichtigkeit aus, für sie sprechen hier nur Okabe und Ito und die Begründung der WCAG.

- Gramazio, C. C., Laidlaw, D. H., & Schloss, K. B. (2017). Colorgorical: Creating discriminable and preferable color palettes for information visualization. *IEEE Transactions on Visualization and Computer Graphics*, 23(1), 521–530. https://doi.org/10.1109/TVCG.2016.2598918
- Healey, C. G. (1996). Choosing Effective Colours for Data Visualization. *Proceedings IEEE Visualization '96*, 263–270. https://doi.org/10.1109/VISUAL.1996.568118
- Heer, J., & Stone, M. (2012). Color Naming Models for Color Selection, Image Editing and Palette Design. *CHI '12*. Modellmetriken ohne Nutzertest der Paletten.
- Laubheimer, P. (2016). Cards: UI-Component Definition. Nielsen Norman Group. https://www.nngroup.com/articles/cards-component/. Praxisempfehlung ohne berichtete Messung.
- Okabe, M., & Ito, K. (2008). Color Universal Design (CUD). How to make figures and presentations that are friendly to Colorblind people. https://jfly.uni-koeln.de/color/. Praxisrichtlinie, die Farbwerte der Palette sind die verbreitet veröffentlichten und nicht aus dem Text der Quelle gelesen.
- Szafir, D. A. (2018). Modeling Color Difference for Visualization Design. *IEEE Transactions on Visualization and Computer Graphics*, 24(1), 392–401. https://doi.org/10.1109/TVCG.2017.2744359
- Wolfe, J. M., & Horowitz, T. S. (2017). Five factors that guide attention in visual search. *Nature Human Behaviour*, 1, 0058. https://doi.org/10.1038/s41562-017-0058. Review der Laborforschung mit einfachen Displays.
- W3C. Understanding SC 1.4.1 Use of Color, Technique G183 und Understanding SC 1.4.11 Non-text Contrast, WCAG 2.2.

### Fokus

Alle interaktiven Elemente haben einen sichtbaren Fokus. `base.css` setzt ihn global als 3px-Umriss in `--color-primary`, bei Knöpfen und Eingaben enger anliegend, Eingaben färben zusätzlich ihren Rand. Der vorherige Fokus der Eingaben (Schatten mit 10 % Deckkraft) erreichte nur 1.15:1 und wurde am 2026-10-29 ersetzt.

- Versteckte Checkboxen zeichnen den Fokus auf ihrem sichtbaren Kästchen (`.config-checkbox input:focus-visible ~ .checkmark`).
- Die Kartenfläche zeigt den Fokus innen (`.maplibregl-canvas:focus-visible`), SVG-Knoten in Netzwerk und Erwähnungsfluss als Kontur (`stroke`).
- Die Tooltips der Ansichtsknöpfe erscheinen auch bei Tastaturfokus.
- `base.css` stellt `.visually-hidden` für Statusmeldungen und unsichtbare Überschriften und `.skip-link` für den Sprunglink bereit.
- Interaktive Elemente sind mindestens 24 x 24px groß und schrumpfen in Flex-Zeilen nicht (`flex-shrink: 0`). Ausnahme sind die Zellen der [Aktivitäts-Heatmap](#aktivitäts-heatmap).

### Struktur und Textalternativen

Auf `explore.html` steht die Seitenüberschrift `h1` vor der Sidebar, deren Abschnitte sind `h2`, ihre Filtergruppen `h3`, die Ansichtstitel `h2`. Bis 2026-11-05 standen `h4` und `h5` der Sidebar vor dem `h1`. Die Navigation ist das einzige Navigations-Landmark, die Ansichtsleiste darin eine Gruppe (`role="group"`).

Unter Timeline, Netzwerk, Erwähnungsfluss und Aktivitäts-Heatmap steht eine aufklappbare Tabelle „Daten als Tabelle“ mit den dargestellten Werten (`renderDataTable()` in `views/view-support.js`, Klasse `.chart-table` in `components.css`). Sie enthält die Briefe je Jahr mit Sprachen, die Verbindungen des Netzwerks mit ihrer Stärke, alle Erwähnungspaare um die gewählte Person, auch jenseits der sichtbaren Knoten, und die tagesgenauen Briefe je Monat. Die Tabelle ist eingeklappt, damit die Grafik oben bleibt, ihr Scrollbereich ist fokussierbar und benannt. Die Karte braucht keine, weil die Ortsansicht dieselben Orte als Liste führt.

## Briefsätze und Überlieferung (Iteration November 2026)

Anforderungen des Operators, wörtlich, vom 2026-11-13 und 2026-11-14:

- „Wir können den CorrespExplorer in dieser Phase jetzt nochmal extra optimieren und genau anpassen und customizen, sodass er mit diesen Zweigdaten auch wirklich sehr gut umgehen kann. Das heißt: wirklich die Views nochmal durchdenken, anpassen, implementieren und umsetzen“
- „Ich möchte das, was wir haben, auch am Design und dem User Interface verbessern und optimieren und auch refactorn an dieser Stelle. Wir sollten uns dann wirklich überlegen: Wie können wir das evolvieren?“
- „Ich möchte bei den Zweigbriefen, die wir hier alle verarbeiten möchten, das in allen Views durchgehen. Das heißt, du sollst Software und Subagents da hinschicken, die wirklich den Browser mit konkreten Aufgaben bedienen. Die sollten uns dann immer wieder Feedback geben, ob das jetzt wirklich besser geworden ist.“
- Festgehaltene Vorlieben aus dem Auftrag: wenige Ebenen, nichts hinter Aufklappern, was man braucht, ist sichtbar oder über einen Filter erreichbar.

Daraus gelten die folgenden Regeln. Sie werden von Eigenschaften der Daten ausgelöst und gelten für jeden Datensatz, der sie trägt.

- Der Normalfall bleibt unmarkiert. Ein Ort ohne GeoNames-ID trägt weder „(Region)“ noch Kursivschrift. Fehlen allen Orten die Koordinaten, sagt die Ortsansicht das in einem Satz, statt jeden Ort mit „?“ zu markieren. Nur in gemischten Datensätzen trägt der einzelne Ort die Marke.
- Erschlossenes steht in eckigen Klammern, in Liste, Dialog, Chronik und Korb gleich, mit einer Legendenzeile über der Briefliste. Ein Tooltip ist nie der einzige Ort einer Erklärung.
- Poststempel, Anschrift und Signatur stehen als benannte Angaben in der Briefzeile, mit kleinem Versal-Label, und brechen auf schmalen Bildschirmen um.
- Die Briefliste nennt ihre Zahl über der Liste, auch für eine Suche und für null Treffer, und wächst auf Wunsch in Schritten, statt still abzubrechen. Ein Klick auf einen Brief öffnet den Dialog mit allen Angaben. Die frühere aufgeklappte Zeile entfällt, weil sie nur Absender und Empfänger wiederholte.
- Jedes Merkmal der Überlieferung ist ein Filter der Seitenleiste mit Zahl (Gruppe „Überlieferung“). Ein Qualitätsfilter, der alle oder keine Briefe behielte, wird nicht gezeigt. Ein aktiver Überlieferungsfilter erscheint als Filtermarke wie Person und Ort.
- Die Übersicht nennt Dateien, Einträge und Briefe neben der Quelle, und die Merkmale der Überlieferung stehen neben den Chips der Datenlage als Knöpfe in die Briefliste. Kein Einstieg führt in eine Ansicht, die der Datensatz nicht füllt. Die Überschrift „Was möchten Sie erkunden?“ entfällt.
- In der Korrespondentenliste stehen „Körperschaft“ und „ohne Normdatensatz“ als Wort in der Zeile, die Auswahl „Anzeigen“ bietet nur Arten, die der Datensatz enthält. Der Personendialog zeigt für jede Person zuerst, was der Datensatz sagt (Briefe, Zeitraum, häufigste Gegenüber, Absendeorte, Nachweis), externe Dienste folgen danach.
- Im Netzwerk stehen Beschriftungen nach Knotengröße ohne Überlappung im Bild, das Layout ist vor dem Zeichnen berechnet. Ist eine Person an mindestens der Hälfte der Briefe beteiligt, sagt ein Satz das und nennt die Zahl der Verbindungen ohne sie, der Schalter „Ego ausblenden“ steht daneben. Die Farbwahl unterscheidet Person und Organisation, wo der Datensatz Organisationen hat.
- In der Zeitleiste teilen erschlossene Datierungen die Schraffur der unscharfen, die Legende nennt nur vorhandene Gründe. Der Balken ohne Jahr nennt seine Gruppen (ohne Datum, nur als Text datiert, unplausibles Jahr), wo der Datensatz mehr als fehlende Daten kennt, und jede Zahl führt zu genau diesen Briefen.
- In der Aktivität nennt ein Satz das dichteste Jahr, den dichtesten Monat und Tag, die Heatmap trägt Monatsnamen. Die Jahreszahlen zählen wie die Zeitleiste.
- Die Chronik zeigt den Verlauf der Briefwechsel. Jeder Eintrag nennt seine Stelle im Briefwechsel der beiden Personen und Lücken ab zwei Jahren. Die Marke des ersten Briefs ist eine Fahne, der Stern gehört dem Korb.
- Ansichten ohne Seitenleiste (Aktivität, Chronik, Vergleich) nennen einen aktiven Filter in einem Satz mit dem Knopf „Filter aufheben“. Derselbe Satz steht im Exportdialog.

Der Plan wurde dem Operator am 2026-11-13 als Text vorgelegt (acht Punkte von Laden bis Kennzeichnung) und am 2026-11-14 mit der Erweiterung auf alle Ansichten beauftragt. Seine Beurteilung am laufenden Explorer steht aus. Die Messung der Dichte im ersten Bildschirm liegt in mehreren Ansichten weiter über den Grenzwerten des Maßstabs, vor allem wegen der Seitenleiste, siehe [plan.md](plan.md#e11-entlastung-der-oberfläche).
