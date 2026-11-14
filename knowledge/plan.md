---
title: Plan
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: active
language: de
created: 2026-10-28
updated: 2026-11-14
authors: [Christopher Pollin]
template:
  name: Vorlage Plan
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/plan
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-plan
related: [specification, testing, journal]
---

# Plan

Der Plan führt die offenen Befunde und angenommenen Vorhaben auf main. Erledigtes wandert ins [Journal](journal.md), Entscheidungen in die [Specification](specification.md#entscheidungen).

## Zielbild

Ein Zielbild für eine nächste Ausbaustufe ist nicht festgelegt. Als Fixpunkt gilt, dass main der über GitHub Pages ausgelieferte Stand bleibt, die offenen Befunde behoben oder begründet verworfen werden und der Browser-Test-Runner ohne Fehlschlag läuft.

## Offene Befunde

Nummerierte Befunde sind zurzeit keine offen. Die Befunde 1 bis 17 sind behoben oder entschieden und stehen im [Journal](journal.md), ein neuer Befund erhält die nächste Nummer.

### Offen aus der Iteration vom November 2026

Die Iteration an Briefsätzen ([Journal vom 2026-11-14](journal.md)) und ihre zwei Prüfrunden durch Browser-Agenten ([testing.md](testing.md#aufgabenprüfung-durch-browser-agenten)) ließen offen:

Daten und Parser

- Ein Link vom Brief in die Edition fehlt für Briefsätze. Die Quelle trägt je Brief eine PID (`idno type="PID"`), aus der sich nur mit Wissen über das Repositorium eine URL bilden lässt. Eine allgemeine Regel dafür gibt es nicht.
- Datierungen nur als Text („12. V. 1938“) stehen nicht auf der Zeitachse, weil das Werkzeug Datumsnotationen nicht normalisiert. Ein Jahr aus solchem Text zu lesen wäre eine Deutung und braucht eine Entscheidung.
- `textLang` der Briefsätze wird nicht als Briefsprache gelesen.

Bedienung

- Der Forschungspfad zum Ego-Netzwerk lässt „Weiter“ ohne Personenwahl zu und zeigt dann die ungefilterte Chronik.
- Der Vergleich rechnet unter einem aktiven Filter der Seitenleiste und nennt das nur im Hinweissatz.
- Browser-Zurück aus der Briefliste behält den gesetzten Filter.
- Suche und Sortierung der Briefliste und die Auswahl „Anzeigen“ der Korrespondenten stehen nicht in der URL.
- Tooltips der Ansichtsleiste bleiben nach einem Klick stehen.
- Die Monate der Heatmap sind nicht anklickbar.
- Für ein Jahr nennt die Jahresauswahl der Aktivität einen tagesgenauen Brief mehr, als die Heatmap zeichnet. Die Ursache ist nicht untersucht.
- Bei 360 Pixel zeigt die Zeitleiste nur die ersten Jahrzehnte und scrollt in ihrem Bereich.

Code

- Die Dialoge sind `div role="dialog"` mit eigener Fokusfalle statt `<dialog>` mit `showModal()`.
- `explore.js` hält die Filtereingaben als Modulvariablen neben dem state-manager und gleicht beide in `applyFilters()` ab ([architecture.md](architecture.md#entwurfsmuster)). Ein Besitzer des Filterzustands würde den Abgleich ersparen.

Nicht geprüft sind axe-core auf dem neuen Stand und die Ansichten Themen und Erwähnungen mit Briefsätzen.

### Offen nach der Datenprüfung und der Arbeitsfläche

Aus der Datenprüfung am Bestand von Stefan Zweig Digital ([Journal vom 2026-11-14](journal.md)):

- An der Quelle zu klären, das Werkzeug kann es nur sichtbar machen: Personen mit der Normdatennummer einer anderen Person, wechselnde Namensformen derselben Person, ein Eintrag mit Jahr im falschen Jahrhundert, Sprachcodes, die ihrem Sprachnamen widersprechen.
- Bei Einträgen ohne maschinenlesbares Datum steht oft ein Datum im Titel des Eintrags. Es zu lesen wäre eine Deutung und braucht eine Entscheidung.
- Notizen zu weiteren Beteiligten eines Briefs und ungetypte Notizen am Absender liest das Werkzeug nicht.
- Platzhalter wie „Unbekannt“ zählen als Personen.
- Jeder Aufruf des Explorers fragt die Grundkarte an, auch für einen Bestand ohne Koordinaten, und meldet ihr Fehlen auf jeder Ansicht.

Aus der Gestaltungsprüfung, die den Stand vor der Arbeitsfläche maß:

- Der Dialog „Datensatz konfigurieren“ fragt vor dem ersten Blick auf die Daten nach der Anreicherung, setzt sie als Vorgabe und zeigt seine Dauerangabe wie einen Fehler.
- Die Ansichten ohne Seitenleiste haben je eine andere linke Kante und Breite.
- Eingabefelder stehen in einer anderen Schrift als der Rest, einzelne Knöpfe in einer Größe zwischen den Tokens. Zeiträume stehen teils mit Bindestrich, Datumsangaben teils mit führender Null.
- Mehrere Ziele sind niedriger als 24 Pixel.
- Der Wissenskorb mit Einträgen zeigt Kacheln, zwei Reitersysteme und eine Grafik in fremden Farben. Die Projektseite beschreibt noch den alten Aufbau.

Aus der Prüfung von Führung und Funktion am selben Bestand:

- Der Lade-Dialog sagt nicht, was die Anreicherung bringt und wo ihr Ergebnis erscheint. Sein Schließen-Kreuz verwirft den geladenen Bestand.
- Ein Link auf einen lokal eingebundenen Bestand führt in einem neuen Tab auf die Startseite, mit einer Begründung, die nicht zutrifft.
- Ein Direktlink auf eine Darstellung, die der Bestand nicht füllt, landet ohne Satz in der Briefliste.
- Browser-Zurück nach einem Klick auf ein Jahr lässt den Jahresfilter stehen.
- In „Tage“ mit allen Jahren öffnet das Detail eines Tages weit unter dem Bildschirm, ebenso stehen Legende und Hinweis erst nach allen Jahresblöcken.
- Der Fokus fällt nach mehreren Handlungen auf das Dokument, etwa nach einem Klick auf einen Netzknoten, nach „Briefe filtern“ eines Orts und nach dem Ende eines Wissenspfads.
- „Person zum Korb“ im Personen-Dialog zieht den Stern der Zeile nicht nach.
- „Zum Wissenskorb“ in der Seitenleiste legt ohne Hinweis die ganze gefilterte Menge in den Korb.
- Die Korbseite zeigt unter „Jahre aktiv“ ein Jahr statt einer Anzahl, eine Achse mit halben Briefen und einen Reiter „Karte“ für Bestände ohne Koordinaten.
- Die Briefsuche findet keine Jahre und nennt den Suchbegriff in gefalteter Form.
- Für die Briefe dieses Bestands gibt es keinen Weg zur Quelle, der Dialog bietet stattdessen correspSearch an.
- Die Chronik hat keine Sprungmarke zu einem Jahr.
- Für Tagesgenauigkeit, Normdaten, Körperschaften und Pfade stehen je mehrere Wörter in der Oberfläche. „Ohne Datum“ und „ohne Jahr“ zählen Verschiedenes.
- Der Vergleich schreibt „1 Briefe“. Der Reiter eines Gegenstands kehrt nach „Vergleichen“ nicht zum Vergleich zurück.
- design.md widerspricht sich an einzelnen Stellen selbst, etwa zur Kennzahlzeile der Seitenleiste und zur Zahl offener Sprachen.

Richtung nach dem Durchklicken des Operators am 2026-11-14:

- Der Operator will eine innovative, professionelle Oberfläche, die alle Dimensionen abbildet, und nennt den Stand zu stark eingedampft. Welche Dinge früher besser waren, ist zu klären, bevor weiter umgebaut wird. Dafür liegt ein Oberflächenplan für das ganze Werkzeug nahe, den er freigibt.
- Die Chronik gefällt ihm nicht und ist zu überarbeiten.
- Karte für Bestände ohne Koordinaten: entweder trägt die Quelle Ortskennungen nach, oder der Bestand bekommt eine geprüfte Ortstabelle.
- `research-paths.js` und `knowledge-path.js` führen noch die Maschinerie der Forschungspfade, die keinen Einstieg mehr hat. Der Korb der Seitenleiste hängt an demselben Modul.

Zur Arbeitsfläche:

- Orte erscheinen als Rangfolge, eine kleine Karte fehlt.
- Die Zeitleiste der Arbeitsfläche ist mit dem Zeiger bedienbar, die Tastatur setzt den Zeitraum über den Regler der Seitenleiste in den anderen Ansichten.
- Die Katalogansichten Briefe und Personen stehen weiter als Reiter neben der Arbeitsfläche.

### Offen nach der Stufe vom 2026-11-14

Die Stufe „Gliederung nach Gegenstand“ wartet auf das Urteil des Operators am Bildschirm. Zwei unabhängige Durchsichten des fertigen Stands ([Journal vom 2026-11-14](journal.md)) ließen nach den Korrekturen desselben Tages offen:

Richtung, braucht den Operator

- Die Seitenleiste bietet als Kategorie nur die Sprache an, und nur sie färbt Karte und Zeitleiste. Für Bestände mit anderen Feldern liegt nahe, die Kategorien aus den Daten abzuleiten: jedes Merkmal mit wenigen Ausprägungen wird ein Filter, und eines davon färbt die Grafiken. Für den Bestand von Stefan Zweig Digital wären das etwa die Merkmale der Überlieferung.
- Ob die Daten von Stefan Zweig Digital mit dem Werkzeug ausgeliefert werden dürfen. Bis dahin erscheint das Beispiel nur lokal.
- Das Tutorial ist neu auszuarbeiten, seine Tour stammt aus der Zeit der zwölf Ansichten.

Dieselbe Tatsache mehrfach

- Die Forschungspfade der Startansicht wiederholen in ihrer Beschreibung die Kennzahlen darüber.
- Die Sprachzahlen stehen in der Seitenleiste und in der Legende der Zeitleiste, die Zahl ohne Datum dort dreimal.
- Im Netzwerk nennen der Satz zur zentralen Person und der Streifen „Sichtbar“ dieselben Gesamtzahlen.
- Zeile und Detailkopf eines gewählten Orts oder Themas zeigen dieselbe Briefzahl.

Ebenen und Flächen

- Vor dem Graphen des Netzwerks stehen fünf Schichten, darunter Legende und Hinweiszeile.
- Ein gestarteter Forschungspfad legt zwei Streifen unter die Kopfzeile.
- Details von Orten und Themen und beide Dialoge führen drei Überschriftenebenen, Label-Value-Raster und gerahmte Tags.
- Start, Vergleich und Tage lassen unter oder neben dem Inhalt Fläche frei, die Chronik kürzt in der kompakten Form Namen bei freier Breite.
- Die Inhaltskante der Ansichten ohne Seitenleiste liegt je Ansicht woanders, die Seitenleiste erscheint innerhalb eines Gegenstands je nach Darstellung.
- Die Umschaltung steht in der Chronik etwas tiefer als bei Jahren und Tagen.
- Listenzeilen von Personen und Orten haben zwei Textzeilen, bei 360 Pixel drei bis vier.
- Der Dichtecheck des Hauses meldet für die Listenansichten mehr Textelemente und Bedienelemente im ersten Bildschirm, als sein Arbeitsprofil erlaubt.

Bedienung

- Der Vergleich hat keinen adressierbaren Zustand. Nach einem Neuladen und nach Browser-Zurück öffnet er den Personenvergleich ohne Auswahl.
- Die Jahre der Startgrafik sind nur mit dem Zeiger wählbar, die Tastatur erreicht sie über die Ansicht Zeit.
- Die Tab-Folge führt bei breitem Bildschirm durch die Seitenleiste, bevor sie die Umschaltung erreicht.
- „Zum Wissenskorb“ legt die aktuelle Auswahl in den Korb, liest sich wie ein Ziel und ist erst nach dem ersten Stern erreichbar.
- Ein Direktlink auf eine Darstellung, die der Datensatz nicht füllen kann, landet ohne Begründung in einer anderen.
- Die Filtermarke an den Darstellungen ist ein Punkt, dessen Bedeutung nur im Tooltip steht.
- Bei 360 Pixel öffnet die Demo-Tour die Seitenleiste nicht, auf die drei ihrer Schritte zeigen.

Benennung

- Derselbe Zustand heißt „Ohne Datum“ und bei gemischten Gründen „ohne Jahr“.
- Die Marke „Experimentell“, „Mit Wikidata anreichern“ und „Koordinaten nachladen“ benennen Technik und Prozess.
- Die Ortsliste führt eine Zeile mehr, als ihr Titel zählt. Die Ursache ist nicht geklärt.

Code

- Der ausgeblendete Abschnitt mit den Kennzahlen der Seitenleiste und die verborgene Moduswahl des Vergleichs stehen noch im Markup und werden weiter befüllt.

### Offen aus den Durchsichten vom 2026-11-14

Zwei unabhängige Durchsichten des Umbaus von Farbrollen und Listen ließen Befunde offen, von denen die meisten am selben Tag behoben wurden ([Journal vom 2026-11-14](journal.md)). Es bleiben:

Bedienung

- Bei 360 Pixel zeigen die Kopfknöpfe und die nicht aktiven Reiter nur Symbole. Der aktive Reiter nennt seinen Namen.
- Eine Briefzeile braucht bei 360 Pixel drei Textzeilen, mit langen Namen bei 1280 Pixel zwei. Die Personenzeile trägt neben dem Namen zwei Aktionen, Stern und Details.
- Die Sprachsegmente eines einzelnen Jahres sind per Tastatur nur in zwei Schritten erreichbar, über die Sprache in der Legende und das Jahr am Balken.
- Der Balken ohne Jahr und das Merkmal „Ohne Datum“ der Seitenleiste bleiben zwei Filter für fast dieselbe Menge. Beide zeigen jetzt eine Filtermarke.

Gestaltung und Kodierung

- Die Art des Netzwerks wählt eine Auswahlliste, Chronik und Vergleich nutzen dafür Schaltflächen.
- Die Kennzahlen der Seitenleiste und die Tags in den Details von Orten und Themen tragen weiter einen Rahmen.
- Mehrere Sprachfarben und die unteren Stufen der Heatmap erreichen auf dem Papierton den Kontrast für Grafikteile nicht. Das Werkzeug stützt sich auf die Tabellen unter den Grafiken ([design.md](design.md#sprachfarben)).
- Die Kopfzeilen von Startseite, Projektseite und Explorer sind verschieden gestaltet.

Nicht geprüft sind der Wissenskorb mit Einträgen, die dunkle Grundkarte, der Exportdialog und die Demo-Tour im neuen Farbschema sowie das Schließen des Kartenpopups mit Escape, das nur im Code geprüft ist.

## Vorhaben

### Entwurf: Arbeitsfläche über alle Dimensionen

Dieser Entwurf ist eine Variante neben dem gebauten Stand und noch nicht entschieden. Er antwortet auf die Rückmeldung des Operators vom 2026-11-14, die Oberfläche sei zu stark eingedampft und solle innovativ und professionell alle Dimensionen abbilden ([design.md](design.md#gliederung-nach-gegenstand-stufe-vom-2026-11-14)). Gebaut wird nach seiner Freigabe, in Abschnitten, die er einzeln am Bildschirm beurteilt.

Leitgedanke

Eine Korrespondenz hat sechs Dimensionen, Zeit, Personen, Orte, Sprache, Themen und Überlieferung. Jede ist zugleich eine Ansicht und ein Filter. Der Brief ist die Einheit, die alle verbindet, und erscheint als Detail der jeweiligen Auswahl. Der Überblick steht zuerst, Auswahl und Vergrößerung folgen, die Briefe kommen auf Abruf.

Aufbau des Bildschirms

- Kopfzeile: Name des Bestands, die Dimensionen als Reiter mit ihren Menüs, Korb und Export.
- Seitenleiste: was den Bestand beschreibt, darunter die aktive Auswahl als ein Satz mit entfernbaren Marken, darunter die Filter.
- Bühne: eine Grafik in voller Größe, die Darstellung der gewählten Dimension. Sie nimmt den größten Teil des Bildschirms ein.
- Kontextstreifen: neben oder unter der Bühne stehen die übrigen Dimensionen als kleine Grafiken derselben Auswahl. Ein Klick auf einen Streifen tauscht ihn mit der Bühne. So bleiben alle Dimensionen sichtbar, während eine groß bearbeitet wird.
- Briefe der Auswahl: am unteren Rand eine Zeile mit der Zahl der Briefe, die sich zur Liste öffnet, ohne die Ansicht zu verlassen. Ein Brief öffnet seinen Dialog.

Die Dimensionen auf der Bühne

- Zeit: gestapelte Jahre mit aufziehbarem Zeitraum. Das Vergrößern eines Zeitraums führt von Jahren über Monate zu Tagen und zuletzt zur Abfolge der einzelnen Briefe. Jahre, Tage und Chronik werden damit Stufen einer Ansicht statt drei Darstellungen.
- Personen: das Netzwerk als Bühne, daneben die Rangfolge. Eine Person zu wählen zeigt ihr Umfeld. Wo ein Bestand erwähnte Personen auszeichnet, bilden sie eine zuschaltbare Schicht, in der die Dritten sichtbar werden, die weder schreiben noch Post bekommen.
- Orte: die Karte als Bühne. Für Bestände ohne Koordinaten steht die Rangfolge der Orte und ein Satz, warum die Karte fehlt.
- Sprache, Themen und Überlieferung: jede als Verlauf über die Zeit in kleinen, gleich skalierten Grafiken je Ausprägung, die sich vergleichen lassen.
- Vergleich: kein eigener Ort. Eine Auswahl lässt sich festhalten, eine zweite daneben stellen, und jede Grafik zeigt beide.

Was der Entwurf vom gebauten Stand übernimmt

- Die Arbeitsfläche der Startansicht mit Grafiken, die einander filtern, die gestapelte Zeitleiste, die Farbrollen und die Sprachpalette, die Menüs unter den Reitern, die Parserkorrekturen.

Was offen ist und der Operator entscheidet

- Welche Dinge im früheren Stand besser waren und zurückkommen sollen. Jeder Stand liegt in der Versionsgeschichte.
- Ob die Chronik als feinste Stufe der Zeit aufgeht oder eine eigene Darstellung bleibt, und was ihr fehlt.
- Ob die Katalogansichten Briefe und Personen als Reiter bleiben oder nur noch als Liste der Auswahl erscheinen.
- Ob der Bestand von Stefan Zweig Digital eine geprüfte Ortstabelle für die Karte bekommt.

Bauabschnitte, jeder mit Datenprüfung, Messung des ganzen ersten Bildschirms, einem unabhängigen Leser und dem Urteil des Operators

1. Bühne, Kontextstreifen und Briefe der Auswahl, zuerst mit der Zeit auf der Bühne.
2. Zeit mit ihren Stufen bis zum einzelnen Brief.
3. Personen mit Netzwerk und der Schicht der Erwähnten.
4. Orte mit Karte, dazu die Entscheidung über die Ortstabelle.
5. Sprache, Themen und Überlieferung als Verläufe, Vergleich als festgehaltene Auswahl.
6. Aufräumen: die Maschinerie der Forschungspfade, verborgene Reste, Startseite und Lade-Dialog.

Die Punkte sind technisch und umkehrbar und brauchen keine Entscheidung des Operators.

- Live-Prüfung von „Lebensdaten von Wikidata laden“ im Personen-Dialog. correspSearch-API und OpenFreeMap-Grundkarte sind am 2026-11-05 live geprüft
- Prüfung des CSV-Exports in Excel: Der Export trägt seit Entscheidung E4 ein UTF-8-BOM, ob Excel die Umlaute damit beim Doppelklick richtig zeigt, ist ungeprüft, weil kein Excel zur Verfügung stand
- GitHub-Actions-Lauf für `test.html?test=true` und `tests/browser/smoke.py` (zweiter Schritt von Entscheidung E9)
- Gleichnamige Komponentenklassen in Seiten-CSS, die nie zusammen geladen werden (`.empty-state` in explore.css und wissenskorb.css, `.progress-bar` und `.progress-text` in explore.css und upload.css, `.error-message` in style.css und upload.css), auf je eine Komponente in components.css zurückführen
- Tastaturweg für die Sprachsegmente der Zeitleiste und die Verbindungen im Erwähnungsfluss. Jahresbalken, Netzwerkknoten und die Seitenknoten des Erwähnungsflusses haben einen
- `build_hsa_data.py` soll die Präzision von Absender, Empfänger und Absendeort wie der Parser klassifizieren. Den Briefen von `hsa-letters.json` fehlt das Feld `precision`, Personen- und Ortsmarkierungen bleiben beim HSA deshalb leer ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis))

### Vorschläge aus der Datensatzanalyse

Die Analyse externer CMIF-Dateien vom November 2025 ([data.md](data.md#testdatensätze)) ergab die folgenden Vorschläge. Ein Teil davon ist mit der Unsicherheitsbehandlung umgesetzt (`cert="low"`, `[NN]`, markierte unsichere Daten, siehe [uncertainty-specification.md](uncertainty-specification.md)), das Nachladen langer Listen mit der Briefliste vom November 2026. Der Stand der übrigen ist nicht geprüft.

- Parser: `evidence="conjecture"` erkennen, Datumsnotationen in Französisch und Deutsch normalisieren, `unknown` als Ort ohne Koordinaten führen
- Oberfläche: „Unbekannt“-Orte in eigener Kategorie, Leerzustände für kleine Datensätze
- Ansichten: Karte mit Fallback bei ein oder zwei Orten, Lücken in der Timeline sichtbar machen, asymmetrische Beziehungen im Netzwerk zeigen, `[NN]` in der Personenliste ans Ende sortieren

## Offene Entscheidungen und Abhängigkeiten

### E11 Entlastung der Oberfläche

Der Operator hat die Oberfläche am 2026-11-10 als überladen beanstandet. Die Defekte sind behoben ([Journal](journal.md)). Zur Entscheidung liegt ein Oberflächenplan vor, außerhalb des Repositorys im Berichtsordner der koordinierenden Session. Er fragt, ob vier selten gebrauchte Ansichten (Erwähnungen, Chronik, Aktivität, Vergleich) unter einem Punkt Mehr stehen, ob die Startansicht auf Kennzahlen und Einstiege gekürzt wird und die Forschungspfade eine eigene Ansicht erhalten, ob die Sprachfarben einer Palette mit höchstens sechs unterscheidbaren Farben und einem zweiten Merkmal weichen, ob die Grundschrift auf 16px steigt und ob das Netzwerk beim Referenzdatensatz mit benannten Knoten öffnet. Eine Rechnung der Sprachfarben unter simulierter Farbsehschwäche (Matrizen nach Machado, Oliveira und Fernandes 2009, Abstand in CIELAB) fand in beiden Paletten mehrere Paare unter der Unterscheidbarkeit, in der Pastellpalette der Karte etwa Deutsch und Englisch bei Grünschwäche. Die Rechnung ersetzt keine Prüfung mit Betroffenen.

Zu E11 gehören seit der Iteration vom November 2026 zwei weitere Punkte. Die Dichtemessung des ersten Bildschirms liegt bei 1280 Pixel in jeder gemessenen Ansicht über mindestens einem Grenzwert, vor allem durch die Seitenleiste mit ihren Überschriften und Kästen. Die zweite Prüfrunde nannte die Chronik für Bestände ohne Anreicherung eine Briefliste in anderer Form, ob sie in der oberen Navigation bleibt, entscheidet der Operator.

### Beurteilung der Iteration vom November 2026

Die Beurteilung am laufenden Explorer und die fachliche Abnahme durch den Operator stehen aus, ebenso der Push, der die öffentliche Seite ändert. Die Rückmeldung an die Edition zu den Datenbefunden ([data.md](data.md#stefan-zweig-digital-tei-auf-briefebene-kein-cmif)) liegt beim Operator.

### Branches

Das Aufräumen der Branches neben main liegt beim Operator.

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung wird im Journal festgehalten. Unabhängig von der Reihenfolge läuft vor jedem Commit der Browser-Test-Runner ohne Fehlschlag.
