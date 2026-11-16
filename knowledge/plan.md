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
updated: 2026-11-16
authors: [Christopher Pollin]
template:
  name: Vorlage Plan
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/plan
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-plan
related: [specification, testing, journal]
---

# Plan

Der Plan führt, was an CorrespExplorer offen ist: angenommene Vorhaben, die noch nicht gebaut sind, offene Befunde und Fragen, die der Operator entscheidet. Er wird fortgeschrieben und nicht angesammelt, Erledigtes geht ins [Journal](journal.md), Entscheidungen gehen als ADR in die [Specification](specification.md#entscheidungen). Was die nächste Session zuerst tut, steht im Abschnitt `## Open` des Journals. Die Abnahme jedes Schritts misst sich an den Kriterien und festen Aufgaben der Stories.

Herkunft der Punkte: Operator, unabhängige Prüfung (Agent ohne Kenntnis der Bauenden), Bauende (die Session oder der Agent, die gebaut haben), Durchsicht (Prüfung durch Agenten nach dem Bau). „Wartet auf den Operator“ heißt, dass ohne seine Entscheidung nicht weitergearbeitet wird.

## Richtung

Der Operator hat am 2026-11-14 entschieden, dass CorrespExplorer das Sichtwerkzeug für das gemeinsame Briefmodell des Projekts GOSSIP wird, mit wenigen großen Ansichten über einer gemeinsamen Auswahl ([design.md](design.md#rückmeldungen-des-operators)). Seine Urteile vom Abend sind als [gemeinsame Regeln aller Ansichten](design.md#gemeinsame-regeln-aller-ansichten) zusammengefasst. Gebaut sind Startseite, Startansicht, Briefliste, Zeit als eine Ansicht, Themen als Raster und Anteile, die geteilten Teile der Auswahl und seit `7e04269` der Durchgang über alle Ansichten nach diesen Regeln. Die Promptotyping-Folge, die er am 2026-11-14 für alle Projekte verlangt hat, ist mit der Übergabe in `ce4dcf4` gelaufen. Am 2026-11-15 hat er über die koordinierende Session verlangt, alle Projekte auf eine fertige, stabile Version zu bringen. Für CorrespExplorer ist das `v0.9.0` ([Veröffentlichung](#veröffentlichung)).

## Durchgang nach den gemeinsamen Regeln

Beauftragt vom Operator („Können wir das jetzt auch noch mal vereinheitlichen mit dem anderen Feedback, das wir haben?“), gebaut in `7e04269` und `65ea4b8` ([Journal](journal.md)), von ihm nicht gesehen. Drei Fragen daraus liegen bei ihm ([Journal](journal.md#open)). Offen geblieben, Regelnummern in Klammern, Herkunft: Bauende, koordinierende Session:

- Start: Kreis und Karte ohne sichtbare Erklärung von Lage und Größe (5, 8). Die Themenfarbe ist seit der Abschlussrunde vereinheitlicht. Ob die vorhandene Legende für Forschende genügt, bleibt eine Frage der fachlichen Nutzung.
- Außerhalb der Startansicht steht neben der Sprachlegende weiter das Zeichen „Sprache“ der Schiene mit der vollen Sprachliste (`syncRail()` in `explore.js` blendet es nur auf der Startansicht aus), die Marke „Übrige Sprachen“ öffnet dieselbe Liste. Ob das die zweite Sprachliste ist, die Regel 2 ausschließt, ist nicht beurteilt (kuratierende Session, am Code).
- Ein Bild des Operators zeigte das Zeitdiagramm der Startansicht mit Balken in voller Höhe und einer Farbe. Der Zustand ließ sich nicht nachstellen, ein Codepfad, der ihn erzeugen konnte, ist behoben und hat eine Smoke-Prüfung ([testing.md](testing.md#browser-smoke-test)). Ob das Bild damit erklärt ist, ist offen.

Regel 9 sieht vor, dass ein Bestand, dem etwas fehlt, das einmal als ruhigen Satz sagt. Auf der Startseite hat der Operator diesen Satz entfernen lassen, er steht dort nur in der Textalternative. Herkunft: distillierende Session.

## Register aus Briefen, Personen und Orten

Briefe, Personen und Orte als ein Register mit Facetten, zurückgestellt, bis der Operator die Ansichten abgenommen hat, dann als benannte Fassung am Hugo Schuchardt Archiv neben den bestehenden Ansichten, auf die Frage des Operators („Können wir Briefe, Personen und Orte sinnvoll in eine Ansicht zusammenführen …?“). Nichts Bestehendes entfällt vor seinem Vergleich. Derselbe Schritt führt Liste und Vergleich zusammen. Vorgeschlagen als [US-47](specification.md#us-47-briefe-personen-und-orte-in-einem-register). Herkunft: Operator, Zurückstellung koordinierende Session. Nicht begonnen.

## Kopf und Fuß für den Explorer

Kopf und Fuß der Startseite hat seit `8464b92` auch `about.html`. Für `explore.html` ist der Schritt zurückgestellt, weil seine Kopfzeile die Navigation des Explorers mit den Gegenständen ist. Der Operator hat danach nicht ausdrücklich verlangt. Herkunft: Bauende, koordinierende Session.

## Aufgabensatz und Prüfungen

- Die als „von Hand“ markierten Aufgaben bleiben offen. Der automatisierte Browserlauf vom 2026-11-16 ist in [testing.md](testing.md) dokumentiert. US-40 ist seit der Entscheidung des Operators vom 2026-11-16 gebaut und im Browserlauf bestanden.
- Die zwölf Aufgaben der Bedienprüfung der Raum-Zeit-Ansicht sind im Repository nicht festgehalten. `task_set.py` führt ihre Gegenstände als ST-a bis ST-l, aus den Skripten der Prüfung rekonstruiert. Herkunft: Bauende.
- Die unabhängige Durchsicht der Abschlussrunde ist erfolgt. Ein neuer axe-core-Lauf über alle Ansichten bleibt offen.
- Die weitere fachliche Prüfung des Korrespondenzkreises bleibt offen. Enter, Escape und Fokus wurden unabhängig geprüft.
- Screenreader und eine vollständige Prüfung aller Ansichten bei 200 Prozent Zoom bleiben offen.

## Aufräumen

Das Refactoring vom 2026-11-15 hat Tutorial und Tour, die Tagesansicht mit ihren Knöpfen und Regeln, die Maschinerie der Forschungspfade, tote Regeln, ungenutzte Exporte und Getter und `renderFilterNotice()` entfernt und gemeinsame Helfer zusammengeführt ([Journal](journal.md)). Was danach ungenutzt bleibt, führt [architecture.md](architecture.md#ungenutzt). Herkunft: Operator (Folge der Schritte), Bauende, kuratierende Session.

- Dateien ohne Verweis einer Seite: `docs/data/hsa.xml`, `docs/data/schoenbach.xml`, `docs/favicon.svg`. Ob sie gelöscht werden, entscheidet der Operator ([Warten auf den Operator](#warten-auf-den-operator)). `hsa.xml` liest `verification/task_set.py` für die Antwort zu US-01 und US-02, ohne die Datei meldet es dort „hsa.xml fehlt“.
- Irreführende Modulnamen: `knowledge-path.js` enthält nur noch den Korb, `research-paths.js` nur noch die Zählung. Ein Umbenennen ändert Importe, Tests und die Context Maps.
- Mehrfach gebaute Helfer: Hinweisfelder in Startansicht, Zeit, Raum-Zeit und Themen, Trefferprüfung auf Zeichenflächen, die zentrale Person in Briefliste (`rowCentre()`), Zeit und Netzwerk.
- Tokens in `tokens.css`, die weder ein Stylesheet noch ein Skript liest, darunter `--color-scale-1` bis `--color-scale-4`, `--border-card`, `--border-focus`, `--radius-xl`, `--space-4xl`, `--line-height-loose`, `--z-modal-backdrop` und die Breakpoints, die als Custom Properties in Media Queries ohnehin nicht greifen.
- `getPersonInitials()` ohne Aufruf in `persons-view.js` importiert.
- Ausgeblendete Kacheln der Seitenleiste und verborgene Moduswahl des Vergleichs stehen im Markup und werden befüllt. Herkunft: Durchsicht.
- `style.display` in `mentions-view.js` und `places-view.js` gegen die Regel `.hidden`. `wissenskorb.css` und `test-runner.js` setzen einzelne Werte ohne Token. Herkunft: Durchsicht.
- `explore.js` hält die Filtereingaben neben dem state-manager und gleicht beide ab ([ADR-003](specification.md#adr-003-ein-zentraler-filterzustand)). Ein Besitzer des Filterzustands würde den Abgleich ersparen, der Umbau ändert Verhalten. Herkunft: Bauende.

## Warten auf den Operator

- Die Abnahme aller Ansichten am Bildschirm, die er seit ihrem Umbau nicht gesehen hat.
- Die verbleibenden Fragen aus dem Durchgang über die Ansichten, im Wortlaut im [Journal](journal.md#open).
- Herkunft und Rechteinhaber des Logos des Werkzeugs ([data.md](data.md#rechte-und-lizenzen)).
- Die Form des Netzwerks, fünf Fragen in [network-figures.md](network-figures.md).
- Ob die Dateien ohne Verweis einer Seite gelöscht werden: `docs/data/hsa.xml`, `docs/data/schoenbach.xml`, `docs/favicon.svg` ([Aufräumen](#aufräumen)). Die Datei des Tutorials ist keine Frage mehr, sie dient als Testdatei.
- Ob der Dialog „Datensatz konfigurieren“ nach dem Laden eigener Daten entfällt. Er fragt vor dem ersten Blick nach der Anreicherung, setzt sie als Vorgabe, und sein Schließen-Kreuz verwirft den Bestand.
- Ob der Fuß der Startseite unter dem ersten Bildschirm bleibt.
- Ob das Raster eine fünfte Tönungsstufe bekommt und die Restfläche der Treemap so groß bleibt, und ob die Anteile, wie gebaut, hinter einem Schalter stehen dürfen, wo er „daneben“ sagte.
- Was von der Chronik endgültig entfällt, und ob der Zeitraum feiner als ein Jahr wählbar wird.
- Die Signatur in der Briefzeile.
- Die Story-Vorschläge US-40 bis US-48 und die Streichung von US-17, US-32 und US-33 ([specification.md](specification.md#funktionsumfang)) und die Darstellung „Erwähnungen“ ohne Story. Offen ist nach der Entscheidung zu US-40, ob auch erwähnte Orte und Themen auf der Startseite Briefe zählen sollen.
- Die älteren Fragen in den Abschnitten unten, je mit dem Vermerk.

## Daten und Parser

- Die Rückmeldung der Datenbefunde an Stefan Zweig Digital (Normdatennummern anderer Personen, wechselnde Namensformen, Jahr im falschen Jahrhundert, Sprachcodes gegen Sprachnamen). Herkunft: unabhängige Prüfung. Wartet auf den Operator.
- Ob die Daten von Stefan Zweig Digital mit dem Werkzeug ausgeliefert werden dürfen. Bis dahin erscheinen sie nur lokal. Herkunft: Operator. Wartet auf den Operator.
- Ob der weitergereichte Brief ein Brief mit weiterer Station bleibt oder mit der Weiterleitung ein zweiter Brief entsteht. Die Entscheidung greift in `buildIndices()`, in den Kanten von `network-view.js` und in `extractFurtherActions()`. Herkunft: Bauende. Wartet auf den Operator, zugleich offen im Modell von GOSSIP.
- Datierungen nur als Text und Daten im Titel eines Eintrags stehen nicht auf der Zeitachse, ein Jahr daraus zu lesen wäre eine Deutung. Herkunft: Durchsicht. Wartet auf den Operator.
- Für Briefsätze fehlt ein Link vom Brief in die Edition, die PID ergibt nur mit Wissen über das Repositorium eine URL. Herkunft: Durchsicht.
- Personen ohne Kennung fallen über den Namen zusammen, Platzhalter wie „Unbekannt“ zählen als eine Person. Registerkennungen aus Fragmenten können über Editionen hinweg zusammenfallen. Herkunft: Bauende.
- `cert` an Person und Ort, Empfangsort und Empfangsdatum, Notizen zu weiteren Beteiligten liest der Parser nicht ([data.md](data.md#was-der-parser-liest)). Herkunft: Bauende.
- Die Briefe der HSA-Datei haben bei Personen und Orten kein Feld `precision`, die Marken für unbekannte Personen und Orte bleiben dort leer, auch bei den Briefen aus „Unbekannt“ ([uncertainty-specification.md](uncertainty-specification.md#hsa-dataset-analysis)). Behebbar in `build_hsa_data.py`. Herkunft: Bauende.
- Wien steht im HSA unter zwei GeoNames-IDs und erscheint als zwei Orte. Ob die Quelle das so meint, ist ungeprüft. Herkunft: unabhängige Prüfung.
- Vorschläge aus der Datensatzanalyse vom November 2025, Stand ungeprüft: `evidence="conjecture"` erkennen, französische und deutsche Datumsnotationen, Leerzustände für kleine Datensätze, asymmetrische Beziehungen im Netzwerk. Herkunft: Bauende.

## Startfigur

- Ein Link auf einen lokal eingebundenen Bestand führt in einem neuen Tab auf die Startseite mit einer Begründung, die nicht zutrifft. Herkunft: Durchsicht.

## Netzwerk

- Ob die Zahlzeile („24 von 282 im Briefwechsel“) mit dem Stufenschalter integriert ist, wie der Operator es verlangte. Herkunft: Operator.
- Am früheren ganzen Netzwerk gemessen und am Kreis nicht nachgeprüft: fünf Schichten vor dem Graphen, Satz zur zentralen Person und Streifen „Sichtbar“ mit denselben Zahlen, die Art wird mit einer Auswahlliste gewählt. Herkunft: Durchsicht.

## Orte und Raum-Zeit

- Ein Klick ins Leere der Raum-Zeit-Figur löste die Wahl im Nachspiel nicht. Nicht gesichert. Herkunft: Bauende.
- Die Kontraste der stärkeren Abblendung sind nicht nachgemessen. Herkunft: Bauende.
- Karte für Bestände ohne Koordinaten: entweder ergänzt die Quelle Ortskennungen, oder der Bestand bekommt eine geprüfte Ortstabelle. Herkunft: Operator. Wartet auf den Operator.
- Erwähnte Orte als zweite Schicht in Karte und Raum-Zeit, am HSA baubar. Herkunft: Bauende, Vorschlag.

## Zeit

- Ob die Zeitansicht ein geklicktes Jahr wie die Raum-Zeit-Ansicht als gewähltes Jahr neben dem Zeitraum behandelt statt als Zeitraum eines Jahres. Herkunft: Bauende. Wartet auf den Operator.
- Das Zeitband der Seitenleiste mit den Briefen je Jahr nach dem freigegebenen Entwurf. Außerhalb der Startansicht ist der Zeitraum weiter ein Regler. Herkunft: Operator (Entwurf).
- Der Balken ohne Jahr und das Merkmal „Ohne Datum“ sind zwei Filter für fast dieselbe Menge, „Ohne Datum“ und „ohne Jahr“ zählen Verschiedenes. Herkunft: Durchsicht.
- Bei 360px zeigt das Profil nur die ersten Jahrzehnte und scrollt. Die Sprachsegmente eines Jahrs sind per Tastatur nur über die Legende erreichbar. Am früheren Zeitstrahl festgestellt, an der neuen Ansicht nicht nachgeprüft. Herkunft: Durchsicht.

## Auswahl und Briefe

- Die Standardhöhe des offenen Briefauszugs. Herkunft: Bauende. Wartet auf den Operator.
- Ob die Kopfzeile auf dem Telefon ohne den Reiter „Briefe“ auskommt, weil der Briefauszug unter jeder Ansicht steht. Herkunft: Bauende. Wartet auf den Operator.
- Die Seitenleiste bietet als Kategorie nur die Sprache an, und nur sie färbt. Naheliegend ist, Kategorien aus den Daten abzuleiten: jedes Merkmal mit wenigen Ausprägungen wird ein Filter, eines färbt die Grafiken. Herkunft: Operator. Wartet auf den Operator.
- Suche und Sortierung der Briefliste stehen nicht in der URL. Browser-Zurück aus der Briefliste und nach einem Klick auf ein Jahr behält den Filter. Die Briefsuche findet keine Jahre. Herkunft: Durchsicht.
- Ein Direktlink auf eine Darstellung, die der Bestand nicht füllt, landet ohne Satz in einer anderen. Herkunft: Durchsicht.
- Der Fokus fällt nach mehreren Handlungen auf das Dokument, etwa nach einem Klick auf einen Netzknoten. Herkunft: Durchsicht.
- Für Tagesgenauigkeit, Normdaten, Körperschaften stehen je mehrere Wörter in der Oberfläche. „Experimentell“, „Mit Wikidata anreichern“ und „Koordinaten nachladen“ benennen Technik. Die Ortsliste führt eine Zeile mehr, als ihr Titel zählt. Herkunft: Durchsicht.

## Listen und Vergleich

- Listen und Vergleich zusammenlegen, im Schritt des [Registers](#register-aus-briefen-personen-und-orten). Herkunft: Operator.
- Der Vergleich hat keinen adressierbaren Zustand, rechnet unter einem Filter der Seitenleiste und nennt das nur im Hinweis, schreibt „1 Briefe“. Herkunft: Durchsicht.
- Listenzeilen haben zwei, bei 360px drei bis vier Textzeilen. Die Dichtemessung meldet für die Listenansichten mehr Elemente, als das Arbeitsprofil erlaubt. Herkunft: Durchsicht.
- „Person zum Korb“ im Personen-Dialog zieht den Stern der Zeile nicht nach. „Zum Wissenskorb“ legt ohne Hinweis die ganze Auswahl in den Korb. Die Korbseite zeigt unter „Jahre aktiv“ ein Jahr statt einer Anzahl und einen Reiter „Karte“ für Bestände ohne Koordinaten. Herkunft: Durchsicht.

## Barrierefreiheit und Telefon

- Bei 360px zeigen die Kopfknöpfe und die nicht aktiven Reiter nur Symbole. Mehrere Ziele sind niedriger als 24px. Herkunft: Durchsicht.
- Mehrere Sprachfarben erreichen den Kontrast für Grafikteile nicht, das Werkzeug stützt sich auf die Tabellen. Herkunft: Durchsicht.
- Die Dialoge sind `div role="dialog"` mit eigener Fokusfalle statt `<dialog>`. Herkunft: Durchsicht.
- Nicht geprüft: Wissenskorb mit Einträgen, dunkle Grundkarte und Exportdialog im neuen Farbschema. Herkunft: Bauende.

## Veröffentlichung

- Version `v0.9.0` ist als [GitHub Pre-release](https://github.com/DigitalHumanitiesCraft/CorrespExplorer/releases/tag/v0.9.0) veröffentlicht. Tag und Release wurden am 2026-11-16 auf ausdrücklichen Auftrag des Operators am geprüften Commit `16eb8d5c4897b56c9595d29f950d4365d65a7fb5` angelegt. Prüfstand bleibt `reviewed`.
- Auf einer Folie für den 2026-11-16 steht ein Bildschirmfoto der Kartenansicht der öffentlichen Demo. Herkunft: Operator.
- Das Aufräumen der Branches neben main. Wartet auf den Operator.
- Der Abschnitt des Aufsatzes zur Promptotyping-Methode, der das Werkzeug als Explorer für CMIF beschreibt, ändert mit der Richtung seinen Gegenstand. Der Aufsatz ist bis zur Wiederaufnahme der Schreibarbeit nicht angefasst. Herkunft: Bauende.

## Gemeinsames Briefmodell

Was das Werkzeug vom gekürzten Modell liest, steht in [data.md](data.md#gemeinsames-brief--und-aussagemodell). Offen ist:

- Die Lieferform. CMIF enthält weder Stimme und Stand einer Aussage noch die Funktion einer Stelle. Naheliegend ist, dass das Werkzeug das JSON von GOSSIP neben CMIF und TEI liest. Zu entscheiden im Projekt GOSSIP. Herkunft: Bauende. Wartet auf den Operator.
- Der kleinste Schritt im Parser: Ziel und Familie eines `ref` erhalten, statt die Stelle als Kennung einer Person zu deuten und den Subtyp zu verwerfen. Heute zählt jede Stelle als eigene erwähnte Person. Herkunft: Bauende, distillierende Session.
- Welche Figuren die Aussagen zeigen ([US-45](specification.md#us-45-aussagen-über-dritte-mit-ihrem-prüfstand-sehen)). Der Operator hat die textlastigen Ansichten von GOSSIP am 2026-11-14 abgelehnt, ein Visualisierungskonzept steht dort aus. Naheliegend sind die Aussagen als weitere Stufe des Korrespondenzkreises und der Beleg mit Zitat und Prüfstand im Briefauszug. Herkunft: Operator. Wartet auf den Operator.
- Die Unterscheidung von Brieftext und Kommentar an jeder Erwähnung, der Schalter zwischen dem, was der Nachweis nennt, und dem, was erwähnt wird, in jeder Ansicht, der Bestand als Filter und Farbe bei mehreren Dateien. Herkunft: Bauende, Vorschlag.
- Die Gleichsetzung zweier Nachweise als ein Brief ([ADR-011](specification.md#adr-011-übereinstimmung-über-bestände-benennen-nicht-zusammenführen)). Herkunft: Bauende. Wartet auf den Operator.

## Abweichungen

Neu priorisiert wird nach Absprache mit dem Operator, die Abweichung steht im Journal. Unabhängig von der Reihenfolge läuft vor jedem Commit der Test-Runner ohne Fehlschlag.
