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

Der Plan führt, was an CorrespExplorer offen ist: angenommene Vorhaben, die noch nicht begonnen sind, offene Befunde und Fragen, die der Operator entscheidet. Er wird fortgeschrieben und nicht angesammelt, Erledigtes geht ins [Journal](journal.md), Entscheidungen gehen als ADR in die [Specification](specification.md#entscheidungen). Die Abnahme jedes Schritts misst sich an den Kriterien und festen Aufgaben der Stories.

## Richtung

Der Operator hat am 2026-11-14 entschieden, dass CorrespExplorer das Sichtwerkzeug für das gemeinsame Briefmodell des Projekts GOSSIP wird und seine Oberfläche aus vier großen Ansichten über einer gemeinsamen Auswahl besteht, Netzwerk, Karte, Raum-Zeit und Themen ([design.md](design.md#rückmeldungen-des-operators)). Vorbild sind Entscheidungen am Werkzeug von GOSSIP nach dessen Bildschirmdurchsichten: Die Figur, die eine Einsicht zeigt, ist zugleich der Schalter, das Netzwerk zeigt eine Person mit ihren Nachbarn statt eines Knäuels, die Raumansicht trägt die Zeit als Höhe mit drei festen Blickrichtungen, eine Auswahl öffnet ihre Briefe und ein Brief führt zurück.

Zielbild der laufenden Stufe: Die vier Ansichten tragen ihre Stories, Zeitleiste, Tage, Chronik und Listen sind nach dem Urteil des Operators über jede einzelne in ihnen aufgegangen oder bleiben begründet, die Reste der Forschungspfade sind entfernt, und jede Runde schließt mit dem festen Aufgabensatz, einem unabhängigen Leser und dem Urteil des Operators am Bildschirm.

Bauabschnitte des freigegebenen Entwurfs:

| Abschnitt | Stand |
|---|---|
| 1. Raum-Zeit unter Orte | gebaut, nach unabhängiger Bedienprüfung umgebaut, nicht abgenommen |
| 2. Netzwerk als Umfeld einer Person mit Stufenschalter | gebaut, nicht unabhängig geprüft, nicht abgenommen |
| 3. Zeitband in der Seitenleiste und Briefauszug unter jeder Ansicht | Briefauszug gebaut. Das Zeitband ist weiter ein Regler ohne die Briefe je Jahr |
| 4. Themen als Verläufe | gebaut (`34fedd9`), nicht unabhängig geprüft, nicht abgenommen |
| 5. Zusammenlegen von Zeitleiste, Tagen, Chronik und Listen | Zeit in Arbeit, Briefansicht in Arbeit, Listen und Vergleich nicht begonnen, braucht das Urteil des Operators je Darstellung |
| 6. Aufräumen | nicht begonnen ([Aufräumen](#aufräumen)) |

Herkunft der Punkte unten: Operator, unabhängige Prüfung (Agent ohne Kenntnis der Bauenden), Bauende (die Session, die gebaut hat), Durchsicht (Prüfung durch Agenten nach dem Bau). „Wartet auf den Operator“ heißt, dass ohne seine Entscheidung nicht weitergearbeitet wird.

## Daten und Parser

- Die Rückmeldung der Datenbefunde an Stefan Zweig Digital (Normdatennummern anderer Personen, wechselnde Namensformen, Jahr im falschen Jahrhundert, Sprachcodes gegen Sprachnamen). Herkunft: unabhängige Prüfung. Wartet auf den Operator.
- Ob die Daten von Stefan Zweig Digital mit dem Werkzeug ausgeliefert werden dürfen. Bis dahin erscheinen sie nur lokal. Herkunft: Operator. Wartet auf den Operator.
- Ob der weitergereichte Brief ein Brief mit weiterer Station bleibt oder mit der Weiterleitung ein zweiter Brief entsteht. Die Entscheidung greift in `buildIndices()`, in den Kanten von `network-view.js` und in `extractFurtherActions()`. Herkunft: Bauende. Wartet auf den Operator, zugleich offen im Modell von GOSSIP.
- Datierungen nur als Text und Daten im Titel eines Eintrags stehen nicht auf der Zeitachse, ein Jahr daraus zu lesen wäre eine Deutung. Herkunft: Durchsicht. Wartet auf den Operator.
- Für Briefsätze fehlt ein Link vom Brief in die Edition, die PID ergibt nur mit Wissen über das Repositorium eine URL. Herkunft: Durchsicht.
- Personen ohne Kennung fallen über den Namen zusammen, Platzhalter wie „Unbekannt“ zählen als eine Person. Registerkennungen aus Fragmenten können über Editionen hinweg zusammenfallen. Herkunft: Bauende.
- `cert` an Person und Ort, Empfangsort und Empfangsdatum, Notizen zu weiteren Beteiligten liest der Parser nicht ([data.md](data.md#was-der-parser-liest)). Herkunft: Bauende.
- Die Briefe der HSA-Datei tragen bei Personen und Orten kein Feld `precision`, die Marken für unbekannte Personen und Orte bleiben dort leer, auch bei den 576 Briefen aus „Unbekannt“ ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis)). Behebbar in `build_hsa_data.py`. Herkunft: Bauende.
- Wien steht im HSA unter zwei GeoNames-IDs und erscheint als zwei Orte. Ob die Quelle das so meint, ist ungeprüft. Herkunft: unabhängige Prüfung.
- Vorschläge aus der Datensatzanalyse vom November 2025, Stand ungeprüft: `evidence="conjecture"` erkennen, französische und deutsche Datumsnotationen, Leerzustände für kleine Datensätze, asymmetrische Beziehungen im Netzwerk. Herkunft: Bauende.

## Startfigur

- Den Namen des mittleren Bands („Erweiterungen im CMIF“) und das Dichteprofil der Startseite. Herkunft: Bauende. Wartet auf den Operator.
- Das Tutorial ist neu auszuarbeiten, seine Tour zeigt noch auf die Zeit der zwölf Ansichten und öffnet bei 360px die Seitenleiste nicht. Herkunft: Operator.
- Ob der Dialog „Datensatz konfigurieren“ nach dem Laden eigener Daten entfallen darf. Er fragt vor dem ersten Blick nach der Anreicherung, setzt sie als Vorgabe, und sein Schließen-Kreuz verwirft den Bestand. Herkunft: Durchsicht, Bauende. Wartet auf den Operator.
- Ein Link auf einen lokal eingebundenen Bestand führt in einem neuen Tab auf die Startseite mit einer Begründung, die nicht zutrifft. Herkunft: Durchsicht.

## Netzwerk

- Der Operator bezweifelt die Form des Korrespondenzkreises und fragt, was darin überhaupt in Beziehung gestellt wird ([design.md](design.md#rückmeldungen-des-operators)). Ein recherchierender Agent untersucht, welche Netzwerkvisualisierungen zu Briefdaten passen, Ergebnis ausstehend. Herkunft: Operator. Wartet auf den Operator.
- Breite Linien im Korrespondenzkreis überdecken einander. Herkunft: unabhängige Prüfung.
- Eine unabhängige Prüfung des Korrespondenzkreises mit Zeiger und Tastatur und am Aufgabensatz steht aus. Herkunft: Bauende.
- Ob die Zahlzeile („24 von 282 im Briefwechsel“) mit dem Stufenschalter integriert ist, wie der Operator es verlangte. Herkunft: Operator.
- Am früheren ganzen Netzwerk gemessen und am Kreis nicht nachgeprüft: fünf Schichten vor dem Graphen, Satz zur zentralen Person und Streifen „Sichtbar“ mit denselben Zahlen, die Art wird mit einer Auswahlliste gewählt, Chronik und Vergleich mit Schaltflächen. Herkunft: Durchsicht.

## Orte und Raum-Zeit

- Die Grundkarte von OpenFreeMap wird beim Öffnen jeder Ansicht angefragt, auch für einen Bestand ohne Koordinaten, und ihr Fehlen wird auf jeder Ansicht gemeldet. Herkunft: unabhängige Prüfung.
- Ein Klick ins Leere der Raum-Zeit-Figur löste die Wahl im Nachspiel nicht. Nicht gesichert. Herkunft: Bauende.
- Die Kontraste der stärkeren Abblendung sind nicht nachgemessen. Herkunft: Bauende.
- Karte für Bestände ohne Koordinaten: entweder trägt die Quelle Ortskennungen nach, oder der Bestand bekommt eine geprüfte Ortstabelle. Herkunft: Operator. Wartet auf den Operator.
- Erwähnte Orte als zweite Schicht in Karte und Raum-Zeit, am HSA baubar. Herkunft: Bauende, Vorschlag.
- Die Startansicht zeigt Orte als Rangfolge, eine kleine Karte fehlt ihr. In Arbeit ist eine Startansicht als Übersicht aus kleinen echten Ansichten mit einem knappen Block zum Bestand, Ergebnis ausstehend. Herkunft: Bauende.

## Zeit

- Ob die Zeitleiste ein geklicktes Jahr wie die Raum-Zeit-Ansicht als gewähltes Jahr neben dem Zeitraum behandelt statt als Zeitraum eines Jahres. Herkunft: Bauende. Wartet auf den Operator.
- In Arbeit: Jahre, Tage und Chronik als eine Ansicht ohne Untermenü, Ergebnis ausstehend. Herkunft: Operator (Entwurf, Abschnitt 5).
- Die Chronik ist zu überarbeiten, und ob sie als feinste Stufe bleibt. Was früher besser war, ist noch nicht benannt, jeder Stand liegt in der Versionsgeschichte. Herkunft: Operator. Wartet auf den Operator.
- Das Zeitband der Seitenleiste mit den Briefen je Jahr nach dem Entwurf. Herkunft: Operator (Entwurf).
- Der Balken ohne Jahr und das Merkmal „Ohne Datum“ sind zwei Filter für fast dieselbe Menge, „Ohne Datum“ und „ohne Jahr“ zählen Verschiedenes. Herkunft: Durchsicht.
- Die Monate der Heatmap sind nicht anklickbar, für ein Jahr nennt die Jahresauswahl einen tagesgenauen Brief mehr, als die Heatmap zeichnet (Ursache nicht untersucht), in „Tage“ mit allen Jahren öffnet das Detail weit unter dem Bildschirm. Herkunft: Durchsicht.
- Bei 360px zeigt die Zeitleiste nur die ersten Jahrzehnte und scrollt. Die Sprachsegmente eines Jahrs sind per Tastatur nur über die Legende erreichbar. Herkunft: Durchsicht.

## Themen

- Die Themenansicht ist auf Wunsch des Operators neu gebaut (`34fedd9`). Offen: unabhängige Prüfung, Aufgaben US-24 bis US-26 und US-44, Urteil des Operators. Herkunft: Operator.

## Auswahl und Briefe

- In Arbeit: eine Briefansicht mit Zeilen relativ zur zentralen Person, Gruppen nach Jahren und einem schmalen Verlauf als Navigation, Ergebnis ausstehend. Herkunft: Bauende.
- Gebaut und nicht eingecheckt: ein aktiver Filter zeigt sich an Titel, oberer Linie und dem Block „Gefiltert nach …“ der Seitenleiste, die Blickrichtungen der Raum-Zeit-Figur stehen in der Figur. Herkunft: Bauende.
- Die Standardhöhe des offenen Briefauszugs. Herkunft: Bauende. Wartet auf den Operator.
- Ob die Kopfzeile auf dem Telefon ohne den Reiter „Briefe“ auskommt, weil der Briefauszug unter jeder Ansicht steht. Herkunft: Bauende. Wartet auf den Operator.
- Die Seitenleiste bietet als Kategorie nur die Sprache an, und nur sie färbt. Naheliegend ist, Kategorien aus den Daten abzuleiten: jedes Merkmal mit wenigen Ausprägungen wird ein Filter, eines färbt die Grafiken. Herkunft: Operator. Wartet auf den Operator.
- Suche und Sortierung der Briefliste stehen nicht in der URL. Browser-Zurück aus der Briefliste und nach einem Klick auf ein Jahr behält den Filter. Die Briefsuche findet keine Jahre. Herkunft: Durchsicht.
- Ein Direktlink auf eine Darstellung, die der Bestand nicht füllt, landet ohne Satz in einer anderen. Herkunft: Durchsicht.
- Der Fokus fällt nach mehreren Handlungen auf das Dokument, etwa nach einem Klick auf einen Netzknoten. Herkunft: Durchsicht.
- Für Tagesgenauigkeit, Normdaten, Körperschaften stehen je mehrere Wörter in der Oberfläche. „Experimentell“, „Mit Wikidata anreichern“ und „Koordinaten nachladen“ benennen Technik. Die Ortsliste führt eine Zeile mehr, als ihr Titel zählt. Herkunft: Durchsicht.

## Listen und Vergleich

- Listen und Vergleich zusammenlegen. Herkunft: Operator. Wartet auf seine Freigabe eines Entwurfs.
- Der Vergleich hat keinen adressierbaren Zustand, rechnet unter einem Filter der Seitenleiste und nennt das nur im Hinweis, schreibt „1 Briefe“. Herkunft: Durchsicht.
- Listenzeilen haben zwei, bei 360px drei bis vier Textzeilen. Die Dichtemessung meldet für die Listenansichten mehr Elemente, als das Arbeitsprofil erlaubt. Herkunft: Durchsicht.
- „Person zum Korb“ im Personen-Dialog zieht den Stern der Zeile nicht nach. „Zum Wissenskorb“ legt ohne Hinweis die ganze Auswahl in den Korb. Die Korbseite zeigt unter „Jahre aktiv“ ein Jahr statt einer Anzahl und einen Reiter „Karte“ für Bestände ohne Koordinaten. Herkunft: Durchsicht.

## Barrierefreiheit und Telefon

- Raum-Zeit unter axe-core und im Smoke-Test. Herkunft: distillierende Session ([testing.md](testing.md#browser-smoke-test)).
- Bei 360px zeigen die Kopfknöpfe und die nicht aktiven Reiter nur Symbole. Mehrere Ziele sind niedriger als 24px. Herkunft: Durchsicht.
- Mehrere Sprachfarben und die unteren Stufen der Heatmap erreichen den Kontrast für Grafikteile nicht, das Werkzeug stützt sich auf die Tabellen. Herkunft: Durchsicht.
- Die Dialoge sind `div role="dialog"` mit eigener Fokusfalle statt `<dialog>`. Herkunft: Durchsicht.
- Nicht geprüft: 200 Prozent Zoom, Wissenskorb mit Einträgen, dunkle Grundkarte, Exportdialog und Tour im neuen Farbschema. Herkunft: Bauende.

## Aufräumen

- Leiste und Maschinerie der Forschungspfade (`research-paths.js` außer den Zählungen, `knowledge-path.js` außer dem Korb, `#knowledge-path-bar`, Prüfung „one path bar“ im Smoke-Test) entfernen, nach der Streichung von US-33 durch den Operator. Herkunft: Operator (Entscheidung vom 2026-11-14), Bauende. Wartet auf die Streichung der Story.
- Die Darstellung „Erwähnungen“ trägt keine Story ([specification.md](specification.md#funktionsumfang)). Herkunft: distillierende Session. Wartet auf den Operator.
- Ausgeblendete Kacheln der Seitenleiste und verborgene Moduswahl des Vergleichs stehen im Markup und werden befüllt. Herkunft: Durchsicht.
- `style.display` in `mentions-view.js`, `network-view.js` und `places-view.js` gegen die Regel `.hidden`. `wissenskorb.css` und `test-runner.js` setzen einzelne Werte ohne Token. Ohne Sprachdaten zeigt die Legende der Zeitleiste „Keine Sprachdaten im Korpus“. Herkunft: Durchsicht.
- `explore.js` hält die Filtereingaben neben dem state-manager und gleicht beide ab ([ADR-003](specification.md#adr-003-ein-zentraler-filterzustand)). Ein Besitzer des Filterzustands würde den Abgleich ersparen, der Umbau ändert Verhalten. Herkunft: Bauende.
- Ob `docs/assets/logo.jpg` und `docs/favicon.svg` bleiben, die keine Seite einbindet. Herkunft: Durchsicht. Wartet auf den Operator.
- Das Skript des festen Aufgabensatzes und die zwölf Aufgaben der Bedienprüfung der Raum-Zeit-Ansicht ins Repository (`verification/`), damit sie in jeder Runde laufen. `VIEWS` im Smoke-Test um `spacetime` ergänzen. Herkunft: distillierende Session.
- Die Kopfzeilen von Startseite, Projektseite und Explorer sind verschieden gestaltet, die Projektseite beschreibt den alten Aufbau. Herkunft: Durchsicht.

## Veröffentlichung

- Die Abnahme aller Stufen vom 2026-11-14 durch den Operator am Bildschirm: Iteration an den Briefsätzen, Refactoring, Farbrollen und Listen, Gliederung nach Gegenstand, Arbeitsfläche, Parser an den Grazer Fällen, Raum-Zeit, Korrespondenzkreis, Startfigur, Briefauszug. Wartet auf den Operator.
- Push. Das Journal verzeichnet am 2026-11-14 eine Freigabe des Pushs durch den Operator. `origin/main` steht auf `2f78951`, der letzte veröffentlichte Stand von `docs/` ist `1c99a8b` (Refactoring vom 2026-11-14), main ist dreißig Commits voraus. Vor einem Push wird `docs/` nach [ADR-008](specification.md#adr-008-wissensbasis-nicht-auf-der-website) geprüft, und der Operator sieht die Auslegung zur Testdatei unter CC BY-NC 4.0 ([data.md](data.md#rechte-und-lizenzen)). Herkunft: Operator.
- Das Aufräumen der Branches neben main. Wartet auf den Operator.
- Der Abschnitt des Aufsatzes zur Promptotyping-Methode, der das Werkzeug als Explorer für CMIF beschreibt, ändert mit der Richtung seinen Gegenstand. Der Aufsatz ist bis zur Wiederaufnahme der Schreibarbeit nicht angefasst. Herkunft: Bauende.

## Gemeinsames Briefmodell

Was das Werkzeug vom gekürzten Modell trägt, steht in [data.md](data.md#gemeinsames-brief--und-aussagemodell). Offen ist:

- Die Lieferform. CMIF trägt weder Stimme und Stand einer Aussage noch die Funktion einer Stelle. Naheliegend ist, dass das Werkzeug das JSON von GOSSIP neben CMIF und TEI liest. Zu entscheiden im Projekt GOSSIP. Herkunft: Bauende. Wartet auf den Operator.
- Der kleinste Schritt im Parser: Ziel und Familie eines `ref` erhalten, statt die Stelle als Kennung einer Person zu deuten und den Subtyp zu verwerfen. Heute zählt jede Stelle als eigene erwähnte Person. Herkunft: Bauende, distillierende Session.
- Welche Figuren die Aussagen zeigen ([US-45](specification.md#us-45-aussagen-über-dritte-mit-ihrem-prüfstand-sehen)). Der Operator hat die textlastigen Ansichten von GOSSIP am 2026-11-14 abgelehnt, ein Visualisierungskonzept steht dort aus. Naheliegend sind die Aussagen als weitere Stufe des Korrespondenzkreises und der Beleg mit Zitat und Prüfstand im Briefauszug. Herkunft: Operator. Wartet auf den Operator.
- Die Unterscheidung von Brieftext und Kommentar an jeder Erwähnung, der Schalter zwischen dem, was der Nachweis nennt, und dem, was erwähnt wird, in jeder Ansicht, der Bestand als Filter und Farbe bei mehreren Dateien. Herkunft: Bauende, Vorschlag.
- Die Gleichsetzung zweier Nachweise als ein Brief ([ADR-011](specification.md#adr-011-übereinstimmung-über-bestände-benennen-nicht-zusammenführen)). Herkunft: Bauende. Wartet auf den Operator.

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung steht im Journal. Unabhängig von der Reihenfolge läuft vor jedem Commit der Test-Runner ohne Fehlschlag.
