---
title: Journal
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: active
language: de
created: 2025-11-26
updated: 2026-11-14
authors: [Christopher Pollin]
template:
  name: Vorlage Journal
  version: 0.6
  url: https://dhcraft.org/Promptotyping/promptotyping-document/journal
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-journal
related: [project, specification, plan]
---

# Journal: CorrespExplorer

## Open

- Offene Befunde, Vorhaben und Entscheidungen führt [plan.md](plan.md). Übergabepunkte von außen sind derzeit keine offen.
- Aus dem Refactoring vom 2026-11-14 vom Agenten gemeldet und nicht behoben: `style.display` in `mentions-view.js`, `network-view.js` und `places-view.js` gegen die Regel, Sichtbarkeit nur über `.hidden` zu schalten. Die Legende der Zeitleiste zeigt ohne Sprachdaten weiter „Keine Sprachdaten im Korpus“. `wissenskorb.css` und `test-runner.js` setzen einzelne Werte ohne Token.
- Der Operator entscheidet, ob `docs/assets/logo.jpg` und `docs/favicon.svg` bleiben, die keine Seite einbindet (Eintrag vom 2026-11-14).
- Die Abnahme des Refactorings und der Iteration an den Briefen von Stefan Zweig Digital durch den Operator steht aus (Einträge vom 2026-11-14).

## Einträge

### 2026-11-14 handoff.md im Journal aufgelöst

- Anlass: Entscheidung des Operators vom 2026-11-14, dass ein Promptotyping-Repository kein `knowledge/handoff.md` mehr führt und das Journal mit dem Offenen beginnt.
- Befund: `knowledge/handoff.md` führte keinen offenen Punkt. Das Offene stand in [plan.md](plan.md) und im Feld „Offen“ des Refactoring-Eintrags vom selben Tag.
- Geändert: `knowledge/handoff.md` entfernt. Das Journal beginnt mit `## Open`, das auf [plan.md](plan.md) verweist und die offenen Punkte des Refactoring-Eintrags samt ausstehender Abnahme aufnimmt. `CLAUDE.md` und [INDEX.md](INDEX.md) lesen beim Sessionstart den Anfang des Journals, die Zeile des Handoffs in Register und Ablagezonen und der Eintrag in `related:` von [plan.md](plan.md) sind entfernt. Nichts wurde fallen gelassen.
- Belege: der Commit dieses Eintrags.

### 2026-11-14 Refactoring und Kuration nach der Iteration an Briefsätzen

- Anlass: Auftrag des Operators nach der Iteration vom selben Tag, „alles refactoren und kuratieren“.
- Befund: `explore.js` trug neben Laden, Filtern und URL-Zustand noch vier Ansichten und beide Dialoge. `explore.css` enthielt Regeln der aufgeklappten Briefzeile, die der Dialog ersetzt hat. Die Ansichtsmodule riefen einen Logger auf, dessen Methoden nichts taten. [design.md](design.md) bestand aus einer nummerierten älteren und einer neueren Schicht, die sich widersprachen und Werte aus `tokens.css` wiederholten, [testing.md](testing.md) zur Hälfte aus allgemeinen Abschnitten ohne Projektbezug. Im Brief-Dialog schloss die Zeile der Sprache den Rahmen des Dialogs für jeden Brief mit nur einem Eintrag zu früh.
- Entschieden: Jede Ansicht liegt in einem eigenen Modul unter `docs/js/views/`, `explore.js` orchestriert. Geteilte Bausteine der Dialoge und der Stern des Korbs stehen in `view-support.js`. Der doppelt geführte Filterzustand in `explore.js` und state-manager bleibt und steht als offener Punkt in [plan.md](plan.md#offen-aus-der-iteration-vom-november-2026), weil sein Umbau Verhalten ändern würde.
- Korrigiert: Die Sprache steht im Brief-Dialog unter den Grunddaten, der Rahmen schließt richtig. Die Zeitleiste setzt den Überlieferungsfilter über `showLettersWithFeature()` statt über die Checkboxen der Seitenleiste. Die Karte übernimmt eine Filteränderung auch, während Kacheln laden. Die zweite Story mit der Nummer US-37 heißt US-38, die folgende US-39. [design.md](design.md) nennt nach Abgleich mit dem Code unter anderem die Schrift der Überschriften, die Standardfarbe der Kartenpunkte und die Beschriftung im Netzwerk richtig.
- Geändert: Neue Module `overview-view.js`, `map-view.js`, `persons-view.js`, `letters-view.js`, erweitertes `view-support.js`, gekürztes `explore.js`. Entfernt: tote CSS-Regeln, vier doppelte Selektoren, der Logger, Exporte, die nur das eigene Modul nutzt. [design.md](design.md) und [testing.md](testing.md) neu gegliedert und gekürzt, [plan.md](plan.md) auf Offenes reduziert und nach Daten, Bedienung und Code geordnet, [architecture.md](architecture.md) und die CONTEXT-MAPs nachgezogen, die Abschnitte „November 2026“ der CONTEXT-MAPs in die Modulbeschreibungen eingearbeitet.
- Belege: Commit `1c99a8b` und der Commit dieses Eintrags. Vergleich des gerenderten Zustands vor und nach dem Umbau über Playwright: Text, Geometrie und berechnete Stile jedes Elements in den zwölf Ansichten des HSA, neun Ansichten und vier Zuständen der Briefe von Stefan Zweig Digital, beiden Dialogen, Start-, Projekt- und Korbseite, je bei 1280 und 360 Pixel. Zwei Läufe des alten Stands stimmten überein, der neue Stand weicht allein im Brief-Dialog des HSA ab, wie beabsichtigt. `test.html?test=true` ohne Fehlschlag, `tests/browser/smoke.py` mit allen dreizehn Prüfungen, `verification/check-corpus.mjs` über den Bestand von Stefan Zweig Digital (Commit `74e08d03`) bestanden. Der Vergleich erfasst keine Zustände unter Mauszeiger oder Fokus und keine Karten- und Canvas-Inhalte. Die Vergleichsskripte lagen im Arbeitsordner der Session und sind nicht Teil des Repositorys.
- Wer was tat: Diese Session (Claude Fable 5.2 in Claude Code) baute Code, CSS, Plan, Architektur und CONTEXT-MAPs um. Ein Agent (Claude Opus 5.5) kuratierte [design.md](design.md) und [testing.md](testing.md) gegen den Code, die Session prüfte den Erhalt der wörtlichen Anforderungen des Operators und zog die geänderten Anker nach. Der Operator gab den Auftrag, eine Abnahme steht aus.
- Offen: Vom Agenten gemeldet und nicht behoben: `style.display` in `mentions-view.js`, `network-view.js` und `places-view.js` gegen die Regel, Sichtbarkeit nur über `.hidden` zu schalten. Die Legende der Zeitleiste zeigt ohne Sprachdaten weiter „Keine Sprachdaten im Korpus“. `wissenskorb.css` und `test-runner.js` setzen einzelne Werte ohne Token. `docs/assets/logo.jpg` und `docs/favicon.svg` bindet keine Seite ein, ob sie bleiben, entscheidet der Operator.

### 2026-11-14 Briefsätze, mehrere Dateien und Überlieferung: eine Iteration an den Briefen von Stefan Zweig Digital

- Anlass: Für die Fertigstellung des Aufsatzes zur Promptotyping-Methode sollte CorrespExplorer die Briefmetadaten von Stefan Zweig Digital gut laden und zeigen. Der Operator beauftragte am 2026-11-13 eine begrenzte Iteration und erweiterte sie am 2026-11-14 auf die Überarbeitung aller Ansichten, geprüft durch Agenten, die den Browser mit konkreten Aufgaben bedienen ([design.md](design.md#briefsätze-und-überlieferung-iteration-november-2026)). Ein erster Ladeversuch der schreibenden Session mit dem unveränderten Parser lag vor (Repository `promptotyping-paper`, Commit `ec8b860`).
- Befund: Die Edition veröffentlicht kein CMIF, sondern TEI je Konvolut mit einem `biblFull` je Brief. Der alte Parser nahm Poststempel als Absendeort, zeigte erschlossene Angaben als gesichert, verlor weitere Empfänger und Anschriften und vergab kollidierende IDs. Die Prüfer der ersten Runde fanden dazu, was der Ladeversuch nicht zeigte: Derselbe Brief ist in mehreren Dateien verzeichnet (2.135 Einträge, 1.633 Signaturen), 35 Briefe tragen ein Jahr im falschen Jahrhundert, und in jeder Ansicht standen Markierungen am Normalfall und fehlten am Besonderen. GAMS liefert die Dateien ohne CORS-Freigabe, der Browser lädt sie also nicht von dort. Alles in [data.md](data.md#stefan-zweig-digital-tei-auf-briefebene-kein-cmif).
- Entschieden: Einträge gleicher Signatur sind ein Brief ([ADR-009](specification.md#adr-009-einträge-gleicher-signatur-sind-ein-brief)). Unplausible Jahre werden gekennzeichnet und nicht korrigiert ([ADR-010](specification.md#adr-010-unplausible-jahre-kennzeichnen-nicht-korrigieren)). Ein Ort ohne GeoNames-ID ist kein unsicherer Ort und bleibt unmarkiert. Die Daten der Edition werden nicht gebündelt, weil die Dateien keine Lizenz nennen, sie werden lokal oder über eine Dateiliste geladen. Jede Regel hängt an Eigenschaften der Daten, der Code nennt keine Edition.
- Korrigiert: `letter_count` und die große Zahl der Korrespondentenliste zählen Briefe und nicht Rollen, sodass Übersicht, Liste und Netzwerk für dieselbe Person dieselbe Zahl nennen. Der Anteil „auf den Tag datiert“ lässt unplausible Jahre aus. Eine Suche der Briefliste wirkt nach einem Sprung aus einer anderen Ansicht nicht mehr unsichtbar weiter. Die Monatszeile der Heatmap und das Ortsdetail neben einer langen Liste standen nach dem ersten Umbau falsch und sind nach der zweiten Prüfrunde berichtigt.
- Geändert: `cmif-parser.js` (Briefsätze, `parseCMIFFiles()`, `mergeRecords()`, `flagImplausibleYears()`), `utils.js`, `constants.js` (`LETTER_FEATURES`), `state-manager.js`, `formatters.js`, `upload.js`, `explore.js`, `export.js`, `research-paths.js`, alle Ansichtsmodule außer Themen und Erwähnungen, `wissenskorb.js`, `explore.html`, `index.html`, `about.html`, die Stylesheets, Testdateien `test-letter-records.xml` und `test-letter-records-b.xml`, Tests in vier Suites, `verification/check-corpus.mjs` und `verification/serve_local_corpus.py`. Wissensbasis: [data.md](data.md), [specification.md](specification.md), [uncertainty-specification.md](uncertainty-specification.md), [architecture.md](architecture.md), [design.md](design.md), [testing.md](testing.md), [plan.md](plan.md), [INDEX.md](INDEX.md), die CONTEXT-MAPs, README.
- Belege: Commits `bf0a9e2`, `58b44a9` und der Commit dieses Eintrags. `verification/check-corpus.mjs` über die 303 Dateien des SZD-Repositorys (Commit `74e08d03`): alle Prüfungen bestanden, 2.135 Einträge, 1.637 Briefe, Zeitraum 1901 bis 1947. `test.html?test=true` ohne Fehlschlag, `tests/browser/smoke.py` mit allen dreizehn Prüfungen bestanden. Zwei Runden Aufgabenprüfung durch Browser-Agenten ([testing.md](testing.md#aufgabenprüfung-durch-browser-agenten)): Die zweite Runde nannte die Befunde zu Datierung, Zusammenführung, Trefferzahl, Karte, Markierung der Orte, Lesbarkeit des Netzwerks und Export behoben oder teilweise behoben. Nicht behoben und offen in [plan.md](plan.md#offen-aus-der-iteration-vom-november-2026). Die Dichtemessung des ersten Bildschirms liegt bei 1280 Pixel in jeder gemessenen Ansicht weiter über mindestens einem Grenzwert. Nicht geprüft: 200 Prozent Zoom, axe-core auf dem neuen Stand, die Ansichten Themen und Erwähnungen mit Briefsätzen.
- Wer was tat: Den Ladeversuch und die Zählungen davor erzeugte die schreibende Session des Aufsatzes. Diese Session prüfte sie an den Dateien, schrieb Parser, Datenmodell, Briefliste, Übersicht und Korrespondenten und die Wissensbasis, mit Claude Opus 5.5 für Prüfung und Plan und Claude Fable 5.2 für die Umsetzung, beide in Claude Code. Zwei Agenten (Claude Opus 5.5) bauten die übrigen Ansichten, fünf weitere prüften im Browser. Die Session prüfte die Datenbefunde der Prüfer an den Quelldateien nach. Bestätigt hat der Operator den Plan und die Erweiterung. Seine Beurteilung am laufenden Explorer und jede fachliche Abnahme stehen aus.
- Offen: Kein Push, die öffentliche Seite ist unverändert. Die Rückmeldung an die Edition zu den Datenbefunden liegt beim Operator.

### 2026-11-10 Kopfzeile in zwei Zeilen, Achse der Startseite, Sprachliste und Hinweis als Experiment

- Anlass: Der Operator legte drei Bildschirmfotos vor und nannte die Oberfläche nicht in Ordnung. Die Upload-Fläche der Startseite saß links neben der Achse von Logo und Einleitung, die Kopfzeile war abgeschnitten, und die Seitenleiste listete rund zwanzig Sprachen, viele ohne Treffer. Er verlangte außerdem einen eindeutigen Hinweis, dass das Werkzeug ein Experiment ist.
- Befund: `main.landing-main` hatte keine Regel und nahm die Breite seines breitesten Kinds, die schmaleren Teile standen an seinem linken Rand. Die Ansichtsleiste zeigte ihre Namen erst ab 1600 Pixel und teilte sich die eine Zeile mit Datensatztitel und vier Verweisen, sodass der Titel gekürzt wurde und bei 1920 Pixel der letzte Name aus der Leiste lief. Die Sprachliste zeigte jede Sprache des Datensatzes, auch wenn die übrigen Filter ihr keinen Brief ließen. Der Hinweis der Startseite nannte Promptotyping eine Context-Engineering-Arbeitstechnik und trug die Erklärung in einem Tooltip, der nur bei Hover erschien.
- Korrigiert: Die Kopfzeile der Arbeitsansicht hat ab 768 Pixel zwei Zeilen, oben Datensatztitel und Verweise, unten die zwölf Ansichten mit Icon und Namen. `--navbar-height` trägt die Höhe nur auf der Seite mit Ansichtsleiste, über `html:has(.view-switcher)`. Unter 1280 Pixel stehen die Namen enger, darunter scrollt die Leiste wie bisher. Die Teile der Startseite stehen auf einer Achse. Eine Sprache ohne Brief unter den übrigen Filtern verlässt die Liste, und nach den acht häufigsten Sprachen folgt die aufklappbare Gruppe weitere Sprachen, die ihre Zahl nennt. Der Verweis Vault heißt Wissensbasis.
- Geändert: `docs/css/style.css`, `docs/css/upload.css`, `docs/css/components.css`, `docs/css/shadows.css`, `docs/explore.html`, `docs/index.html`, `docs/js/explore.js`, `README.md`. Das Hinweisfeld der Startseite und der erste Absatz des README nennen das Werkzeug ein Experiment, sagen, was es zeigt, dass es kein fertiges oder betreutes Produkt ist, und verweisen auf die Issues. Die Regeln des entfallenen Tooltips sind entfernt.
- Belege: `test.html?test=true` meldete alle Tests bestanden. Bildschirmfotos von Startseite, Übersicht und Briefen mit dem Datensatz des Hugo Schuchardt Archivs bei 1280, 1440, 1920 und 360 Pixel zeigten kein seitliches Scrollen des Dokuments und keine abgeschnittene Kopfzeile. Bei eingegrenztem Zeitraum 1925 bis 1927 standen keine Sprachen mit null Treffern in der Liste. Nicht geprüft sind die übrigen neun Ansichten am Bildschirm, die Tour mit der höheren Kopfzeile und ein Lauf mit axe.
- Offen: Der Oberflächenplan zur Entlastung liegt dem Operator zur Entscheidung vor, siehe [plan](plan.md).
### 2026-11-10 Wissensbasis aus der ausgelieferten Seite genommen

- Anlass: Nach der Veröffentlichungsregel des Operators liefert eine Pages-Seite nur für Lesende bestimmte Inhalte aus, nie den Ordner `knowledge/`. Die öffentliche Seite lieferte die Wissensdokumente unter `/knowledge/` als von Jekyll gerenderte HTML-Seiten aus, dazu die Viewer-Seite `vault.html`.
- Entschieden: Die Wissensbasis liegt nach der Konvention unter `knowledge/` im Repository-Root, `vault.html` entfällt, die Navigation verlinkt `knowledge/INDEX.md` auf GitHub ([ADR-008](specification.md#adr-008-wissensbasis-nicht-auf-der-website)).
- Geändert: `docs/knowledge/` mit `git mv` nach `knowledge/`, `vault.html`, `js/vault.js`, `css/vault.css` und `vendor/marked/` gelöscht, Vault-Links in `index.html`, `about.html`, `explore.html`, `wissenskorb.html` und `test.html` auf GitHub umgestellt. `CLAUDE.md`, README, [INDEX.md](INDEX.md), [architecture.md](architecture.md), [project.md](project.md), [handoff.md](handoff.md), [uncertainty-specification.md](uncertainty-specification.md) und die CONTEXT-MAPs nachgezogen.
- Belege: Commit dieses Eintrags. Browser-Test-Runner und `tests/browser/smoke.py` auf dem neuen Stand, lokaler Abruf von `/knowledge/INDEX.md` und `/vault.html` mit 404.

### 2026-11-05 Nachprüfung des UI-Umbaus: Überschriftentest, eine Zählung, Kleinpunkte

- Anlass: Ein unabhängiger Prüfer bewertete die Commits `acd448b` und `6304e5a` mit „gut“ und nannte Befunde, die die koordinierende Session in diese Runde gab.
- Befund: Die Prüfung der Überschriftenfolge im Smoke-Test filterte auf `.hidden`. In der Startansicht ist die ganze Sidebar verborgen, die Prüfung bestand deshalb auch gegen den alten Stand. `analyzeResearchQuestions()` bildete die Zusammenfassung des Datensatzes bei jeder Übersicht ein zweites Mal. Dazu kamen literale Dauern in Übergängen, eine Pfadleiste, deren Schritte bei 390px nicht sicher umbrachen, Schritt-Chips unter 24px Höhe, tote Reste (`components/navbar.html`, `.filter-group h4`, `config-modal-content`), Attribut `hidden` neben der Klasse `.hidden` und eine Jahresauswahl, deren Zahl „Briefe“ hieß, obwohl sie nur tagesgenaue zählt.
- Entschieden: Die Überschriftenprüfung läuft in der Briefansicht mit sichtbarer Sidebar über alle Überschriften in DOM-Reihenfolge außerhalb von `#load-error`: zuerst `h1`, keine Ebene übersprungen. Sichtbarkeit schaltet nur `.hidden` ([design.md](design.md#css-architektur)). `--color-border-control` bleibt, das ist entschieden (D9).
- Korrigiert: `analyzeResearchQuestions(letters, indices, summary)` nimmt die beim Laden gebildete Zusammenfassung, die Anteile kommen aus `datasetQuality()`. Alle Übergangsdauern stehen als Token. Die Schritte der Pfadleiste brechen bei 390px in eine eigene Zeile (`flex-basis: 100%`), die Chips sind mindestens 24px hoch. Die Jahresauswahl nennt „(N tagesgenau)“.
- Geändert: `research-paths.js`, `explore.js`, `activity-view.js`, `index.html`, `components.css`, `explore.css` und die übrigen Stylesheets mit Übergängen, `components/navbar.html` gelöscht, Test in `test-research-paths.js`, Überschriften- und Pfadprüfung in `tests/browser/smoke.py`. [architecture.md](architecture.md), [design.md](design.md), `css/CONTEXT-MAP.md`.
- Belege: Commit dieses Eintrags. `tests/browser/smoke.py --axe` mit allen vierzehn Prüfungen bestanden, darin axe-core mit aktivem Wissenspfad bei 390px ohne Verstoß und ohne Seitenüberlauf. Die neue Überschriftenprüfung meldet gegen `acd448b` „first heading is h4“ und besteht auf dem neuen Stand. Durchsicht der zwölf Ansichten bei 1440, 768 und 390px ohne Befund.

### 2026-11-05 Entscheidung E8 umgesetzt, Kartenfarben nach design.md, Tabellen als Textalternative

- Anlass: Der Operator gab das Entscheidungsbündel „Werkzeuge“ frei. Für CorrespExplorer folgt E8 der Empfehlung, mit freigegeben sind die zwei offenen Punkte des UI-Umbaus, ein heller Kartenstil nach [design.md](design.md#karte) ohne neue externe Ressource und tabellarische Textalternativen der Grafiken.
- Befund: Der Abgleich der Stories hatte vier Kriterien offen gelassen (US-05, US-11, US-22, US-27). Positron zeigt Land und Wasser grau. Die Tabellen unter den Grafiken lösten bei geöffnetem Zustand den axe-Befund `scrollable-region-focusable` aus, weil ihr Scrollbereich nicht fokussierbar war. Die Code-Übersicht der Ansichten (`js/views/CONTEXT-MAP.md`) war in der vorigen Runde nicht nachgezogen worden.
- Entschieden: US-11 und US-22 umgesetzt, die offenen Kriterien von US-05 und US-27 gestrichen ([ADR-007](specification.md#adr-007-umfang-der-stories-nach-dem-abgleich-mit-dem-code)). Das Netzwerk startet im Modus Briefwechsel. Der JSON-Export liefert die vollständige Datenstruktur statt der flachen Zeilen. Die Kartenfarben kommen als Tokens `--color-map-land` und `--color-map-water` auf die geladenen Positron-Ebenen. Die Tabellen sind eingeklappt und stehen unter Timeline, Netzwerk, Erwähnungsfluss und Heatmap, die Karte verweist auf die Ortsliste.
- Korrigiert: Scrollbereich der Tabellen fokussierbar und benannt. `js/views/CONTEXT-MAP.md` nennt jetzt auch Jahresauswahl, reduzierte Bewegung und den Dialog des Erwähnungsflusses aus der vorigen Runde.
- Geändert: `network-view.js` mit `buildCorrespondenceNetwork()` und `NETWORK_BUILDERS`, `constants.js` (`minLetters`), `export.js` mit `datasetToJson()` statt `lettersToJson()`, `explore.js` (JSON-Export, `applyPaperBasemap()`), `view-support.js` mit `renderDataTable()`, `timeline-view.js`, `mentions-view.js`, `activity-view.js`, `explore.html`, `components.css`, `tokens.css`, Tests in `test-demo.js` und `test-research-paths.js`, eine Prüfung in `tests/browser/smoke.py`. [specification.md](specification.md), [plan.md](plan.md), [design.md](design.md), [architecture.md](architecture.md), [testing.md](testing.md) und die CONTEXT-MAPs.
- Belege: Commits dieses Eintrags. `tests/browser/smoke.py --axe` mit allen vierzehn Prüfungen bestanden, darin der Test-Runner ohne Fehlschlag. axe-core mit geöffneten Tabellen in Timeline, Netzwerk, Heatmap und Erwähnungsfluss bei 1440, 768 und 390px ohne Verstoß. Durchsicht der zwölf Ansichten bei 1440, 768 und 390px ohne Seitenüberlauf, Konsolenfehler oder Text unter 12px, Sichtprüfung der Karte mit beigem Land und hellblauem Wasser.

### 2026-11-05 UI-Refactoring: Kaskade, eine Dialogform, eine Pfadleiste, Barrierefreiheit

- Anlass: Der Operator fragte, wo die Oberfläche zu viele Strukturen hat, und gab den Auftrag, CSS, Responsive und Barrierefreiheit gemeinsam zu bereinigen und das Ergebnis zu bewerten. Grundlage war ein Lese-Audit über `docs/` vom selben Tag und eine Durchsicht der zwölf Ansichten mit dem HSA.
- Befund: Die Grundregeln der Ansichtsleiste standen in `style.css` hinter den Telefonregeln und hoben sie auf, mobile Regeln für Timeline und Netzwerk verloren gegen spätere Grundregeln oder zielten auf ein fehlendes Element. Rund zweihundert Zeilen CSS waren tot (Burger-Menü, `.tabs`, `.card`, `.badge` u. a.), Reset, `body` und Überschriften standen doppelt. Es gab drei Dialoggrundformen, literale z-index-Werte neben der Token-Skala, `transition: all`, Ränder von Bedienelementen mit 1.4:1 und Schriften unter 12px. Strukturell gab es zwei Pfadnavigationen, drei Korbzähler, zwei Themenlisten in der Themenansicht und zwei Rechenwege für die Datenlage. Die Seite begann mit `h4` vor dem `h1`, ein Navigations-Landmark steckte im anderen, die Beschreibungen der Ansichtsknöpfe erreichten Screenreader nicht, und nichts beachtete reduzierte Bewegung. Die Karte startete dunkel, die Heatmap zeigte einen Knopf je Jahr.
- Entschieden: Komponenten mit eigenen Breakpoints führen diese hinter ihren Grundregeln. Eine Dialogform `.modal` für alle Seiten. Neue Tokens `--color-border-control`, `--transition-properties` und eine vollständige `--z-*`-Skala. Die Schriftuntergrenze bleibt `--font-size-xs`, ein kleineres Token wurde verworfen, weil design.md sie festlegt. Die Pfadleiste oben ist die einzige Pfadsteuerung, ohne eigenen Korbzähler. Die Datenlage kommt aus `datasetQuality()` über dieselbe Zusammenfassung wie die Zähler. Die Themenliste der Sidebar tritt in der Themenansicht zurück. Die Heatmap wählt das Jahr über eine Auswahlliste mit Vor und Zurück. Die Karte startet hell (Positron), ein eigener Stil nach design.md ist ein Vorhaben.
- Korrigiert: Die Datenlage-Symbole der Sidebar lasen `meta.uncertainty` und zählten Absender, die Chips der Übersicht zählten alle Personen. Beide zählen jetzt Personen und Orte wie die Listen. Die Zahl der Sidebar-Karten überdeckte bei 1440px das Datenlage-Symbol. [uncertainty-specification.md](uncertainty-specification.md#statistics-display) beschrieb den alten Rechenweg.
- Geändert: alle Stylesheets außer `test.css`, `explore.html` (Pfadleiste, Überschriften, Landmarks, Dialog-Rollen, Jahresauswahl), `explore.js` (Kennzahlen, Beschreibungen der Ansichtsknöpfe, Themenliste, Kartenstil), `knowledge-path.js`, `research-paths.js` mit `datasetQuality()`, `utils.js` mit `prefersReducedMotion()`, `motionMs()`, `settleWithoutMotion()` statt `countIdentifiedPersons()`, `activity-view.js`, `comparison-view.js`, `mentions-view.js`, `network-view.js`, `wissenskorb.js`, `demo-tour.js`, Test in `test-aggregation.js`, zwei Prüfungen in `tests/browser/smoke.py`. [design.md](design.md), [architecture.md](architecture.md), [testing.md](testing.md), [plan.md](plan.md), [uncertainty-specification.md](uncertainty-specification.md) und die CONTEXT-MAPs.
- Belege: Commit `acd448b` (CSS) und der Commit dieses Eintrags. `tests/browser/smoke.py --axe` mit allen dreizehn Prüfungen bestanden, darin der Test-Runner ohne Fehlschlag und axe-core ohne Verstoß. Die zwei neuen Prüfungen scheitern gegen `acd448b`, die übrigen bestehen dort. Durchsicht der zwölf Ansichten bei 1440, 1024, 768 und 390px ohne horizontalen Überlauf, ohne Konsolenfehler und ohne Text unter 12px. Ruff ohne Befund für `smoke.py`.

### 2026-11-05 Dritte Runde: Entscheidungen E1 bis E7, E9 und E10 umgesetzt

- Anlass: Der Operator übertrug die technischen und umkehrbaren Entscheidungen aus [plan.md](plan.md) der koordinierenden Session, mit dem Auftrag, Rückmeldung so einzuholen, dass er geführt wird. Sie entschied E1 bis E7, E9 und E10 nach der Empfehlung und ließ E8 als inhaltliche Frage beim Operator.
- Befund: Beim Bau des Smoke-Tests zeigte sich, dass die Startseite correspSearch-Abfragen als Quelltyp `correspsearch` speichert, nicht `url`. Mit dem neuen Brief von 1850 in `test-uncertainty.xml` scheiterte der Test des Qualitätsfilters, weil `state.setData` die Filter behält und der vorige Test seinen Zeitraum stehen ließ.
- Entschieden: Ansichtswechsel bekommen einen Historieneintrag, Filteränderungen nicht (E1). Stern und Detail-Knöpfe legen Person oder Ort ab, das Banner „In Arbeit“ entfällt (E2). Geteilte Links auf correspSearch-Abfragen tragen `cs=`, ADR-006 ist um das Laden des Datensatzes ergänzt (E3). Der CSV-Export hat die Spalten `sender_authority` und `recipient_authority` und ein BOM, die Wirkung in Excel ist ungeprüft (E4). Spannen über mehrere Jahre stehen im Balken „Spanne“ und zählen nicht zum Zeitraum, der Balken filtert nicht, weil der Jahresfilter nach dem Anfangsjahr wählt (E5). Die Heatmap-Zellen bleiben 12px mit begründeter Ausnahme (E6). Die Karte nennt die Ortsliste als Tastaturweg (E7). `tests/browser/smoke.py` prüft den Weg im Browser, die Ladezeit mit großzügiger Grenze (E9, E10). E8 wartet auf den Operator.
- Korrigiert: [architecture.md](architecture.md) und US-20 beschrieben `replaceState` für alle Änderungen, US-36 Briefe statt Personen und Orte. Der Test des Qualitätsfilters setzt die Filter jetzt selbst zurück.
- Geändert: `explore.js` (Historie, `cs=`, Korb-Knöpfe, Zeitraum, Link der Karte), `utils.js` mit `sameFilterParams()`, `isMultiYearSpan()` und `datedYearRange()`, `basket.js` mit `addEntityToBasket()`, `correspsearch-api.js` mit `correspSearchShareUrl()`, `cmif-parser.js` mit `loadUrlDataset()`, `export.js`, `timeline-view.js` mit `renderSpanBin()`, `places-view.js`, `explore.html`, `wissenskorb.html`, `components.css`, `wissenskorb.css`. Fall 025 in `test-uncertainty.xml`, neue Tests in State Manager, Basket, Aggregation, Research Paths und correspSearch, `tests/browser/smoke.py`. [plan.md](plan.md), [specification.md](specification.md), [architecture.md](architecture.md), [design.md](design.md), [testing.md](testing.md), [uncertainty-specification.md](uncertainty-specification.md), README und die CONTEXT-MAPs.
- Belege: Commit dieses Eintrags. Browser-Test-Runner headless ohne Fehlschlag. `tests/browser/smoke.py --online --axe` mit allen zwölf Prüfungen bestanden, derselbe Lauf gegen `29c39a2` mit fünf Fehlschlägen, genau den Prüfungen zu E1, E2, E3, E4 und E5 mit E7. Ruff ohne Befund für `smoke.py`.

### 2026-11-05 Zweite Runde: technische Befunde behoben, Entscheidungsfragen vorbereitet

- Anlass: Der Operator ließ die offenen Punkte in selbst entscheidbare technische Fixes und Fragen an ihn trennen. Die Fixes waren umzusetzen, die Fragen so vorzubereiten, dass er mit Ja oder Nein entscheiden kann.
- Befund: Der Konfigurationsdialog zählte Orte und Personen mit eigenen Kopien der Zählung und den Platzhalter „Unbekannt“ als Ort. `analyzeCoordinateNeeds` gab Ortsnamen als GeoNames-IDs an die Wikidata-Auflösung. correspSearch-Abfragen ohne Treffer öffneten einen leeren Explorer, Herausgeber und Lizenz der API-Antwort gingen verloren, obwohl der teiHeader sie trägt. `fetch` meldet unbekannte Hosts, fehlendes Netz und CORS gleich, die Meldung nannte nur CORS, und unter HTTP/2 fehlt der Statustext. Die Kennzahlen der Sidebar blieben bei jedem Filter auf dem Gesamtwert, `#active-filters` wurde nie gefüllt. Die Aktivitätsansicht verschwieg undatierte Briefe, die Zeitleiste renderte die Schraffur nicht, die ihre Legende ankündigt. Rund 250 Oberflächentexte schrieben Umlaute als ae, oe, ue.
- Entschieden: Der Dialog zählt mit `summarizeCorpus` wie der Explorer. Die Kennzahlen zeigen bei Filter den gefilterten Wert mit „von“ und Gesamtzahl, Filter-Chips für Zeitraum und Sprache kamen nicht hinzu, weil deren Bedienelemente den Zustand schon zeigen. Testfixtures für correspSearch sind unverändert gespeicherte API-Antworten, auch für den leeren Fall, damit keine nachgebauten Daten in die Tests kommen. Die Umlaute ersetzt eine Liste ausdrücklich deutscher Wörter, damit englische Bezeichner wie `value` oder `queue` unberührt bleiben. Zehn Fragen stehen als E1 bis E10 mit Optionen und Empfehlung in [plan.md](plan.md#offene-entscheidungen-und-abhängigkeiten).
- Korrigiert: [design.md](design.md#unsicherheits-indikatoren) führte die Schraffur als nicht gerendert, [plan.md](plan.md) die Befunde 12 bis 14, 16 und 17 und die Vorhaben zu Formelschutz, correspSearch-Transformation und Erwähnungen als offen.
- Geändert: `upload.js`, `geonames-enrichment.js`, `correspsearch-api.js` mit `datasetFromPages()`, `utils.js` mit `httpErrorMessage()` und `ignoreMissingStyleImages()`, `cmif-parser.js`, `explore.js` mit `updateStatCounts()`, `formatters.js` mit `formatCountOf()`, `components.css`, `activity-view.js`, `timeline-view.js`, `wissenskorb.js`, Umlaute in den Seiten und Modulen. Fall „Tabellenformeln“ in `test-hostile.xml`, die Fixtures `test-correspsearch.json` und `test-correspsearch-empty.json`, die Suite correspSearch und neue Tests in Parser, Aggregation, Formatters und Basket. [plan.md](plan.md), [architecture.md](architecture.md), [data.md](data.md), [design.md](design.md), [specification.md](specification.md), [testing.md](testing.md) und die CONTEXT-MAPs.
- Belege: Commit dieses Eintrags. Browser-Test-Runner headless ohne Fehlschlag, ohne die Änderungen lädt die Testseite nicht, weil die neuen Exporte fehlen. Playwright-Prüfung desselben Ablaufs gegen `e9d9c0a` und gegen den neuen Stand: Ortszahl im Dialog 7 gegen 6 vorher, 6 und 6 nachher, Sidebar „24“ gegen „22 von 24“, leere correspSearch-Abfrage öffnet den Dialog gegen Meldung, Quellzeile leer gegen Herausgeber und Lizenz, eine Warnung `circle-11` gegen keine, 0 gegen 57 Schraffuren im HSA. axe-core ohne Verstöße auf allen Seiten und den zwölf Ansichten.

### 2026-11-05 Prüfung des Forschungswegs vor dem Workshop und Behebung der schweren Befunde

- Anlass: Der CorrespExplorer wird im Workshop am 9. und 10.11.2026 gezeigt und steht als Beispiel auf der Seite „fancy (research) tools!“ von Digital Humanities Craft. Beim Aufnehmen von Screenshots brachen Tour und Ansichtsleiste das Aufnahme-Skript der Website. Der Operator ließ das Werkzeug zuerst prüfen und dann die schweren Befunde beheben.
- Befund: Zwei unabhängige Subagenten gingen live und lokal den Weg einer Forscherin durch (Demo, Upload, correspSearch-URL, alle Ansichten, Filter, Korb, Export, Teilen, Zurück), dazu liefen axe-core und eigene Messungen. Die Tour öffnete in jedem neuen Tab erneut, weil ihr Zustand in sessionStorage lag, und ließ den Fokus nach Escape auf `body`. Links mit `demo=true` ohne vorherigen Upload leiteten still zur Startseite. Das Netzwerk des Tutorial-Datensatzes war mit der Standardschwelle leer, weil die Schwelle nur nach der Zeitspanne gewählt wurde. correspSearch schreibt genaue Daten als `from` gleich `to`, `classifyDate` stufte sie als Zeitspanne ein, bei der Abfrage für 1890 galten 54 von 87 Briefen als ungenau datiert. Das Aufnahme-Skript suchte die Ansicht über ihren sichtbaren Text, der in der Leiste immer ausgeblendet war. Die zugänglichen Namen der Ansichtsknöpfe waren vorhanden, axe-core fand auf keiner Seite einen Verstoß.
- Entschieden: Demo-Links laden den Tutorial-Datensatz selbst, mit demselben Korbschlüssel wie der Weg über die Startseite und ohne Wikidata (ADR-006). Links ohne ihren Datensatz führen zur Startseite mit einem Hinweis. Die Tour merkt sich ihr Ende in localStorage, `tour=0` unterdrückt sie. Die Standardschwelle des Netzwerks ist der höchste Wert bis zum Vorgabewert, der noch eine Kante zeigt. Die Ansichtsleiste zeigt ab 1600px die Bezeichnungen, „Mentions Flow“ heißt in der Oberfläche „Erwähnungen“. Die übrigen Befunde stehen als 12 bis 17 und als offene Entscheidungen in [plan.md](plan.md).
- Korrigiert: [design.md](design.md#netzwerk) begründete die Schwelle nach der Zeitspanne als lesbar für alle Datensätze, für den Tutorial-Datensatz traf das nicht zu. [specification.md](specification.md#us-20-gefilterte-ansicht-teilen) nannte nur Uploads als Links ohne Datensatz, correspSearch-Abfragen gehören dazu.
- Geändert: `classifyDate` in `utils.js`, `demo-tour.js` mit `shouldStartDemoTour()`, `loadDemoDataset()` und `addTableCoordinates()` in `cmif-parser.js` (der Upload nutzt dieselbe Koordinatenfunktion), `explore.js` mit Demo-Laden und Hinweisweiterleitung, Hinweis in `upload.js`, `defaultNetworkThreshold()` in `network-view.js` statt der Zeitspannenregel, Beschriftung der Ansichtsleiste in `style.css`, Bezeichnungen in `explore.html`, `about.html`, `index.html` und `research-paths.js`. Fall 024 in `test-uncertainty.xml`, neue Suite Demo. [architecture.md](architecture.md), [specification.md](specification.md), [design.md](design.md), [testing.md](testing.md), [uncertainty-specification.md](uncertainty-specification.md), [plan.md](plan.md), README und die CONTEXT-MAPs.
- Belege: Commit `4a4b9b0`. Browser-Test-Runner headless ohne Fehlschlag. Gegenprobe ohne die Änderungen: Die Suite Demo lädt nicht, ohne die Änderung an `classifyDate` scheitern Fall 024 und der Qualitätsfilter des state-managers. Playwright gegen den lokalen Server: Demo-Links aller zwölf Ansichten bleiben im Explorer, Netzwerk des Tutorial-Datensatzes mit Knoten bei Schwelle 1, Tour einmal je Browser und Fokus auf dem aktiven Ansichtsknopf, Hinweis auf der Startseite, Weg über die Demo-Karte unverändert, Ansichtsleiste ohne Überlauf bei 1366, 1599, 1600 und 1920px. axe-core ohne Verstöße auf allen Seiten, den zwölf Ansichten mit `hsa-letters.json` und dem Demo-Netzwerk.

### 2026-10-30 Entscheidungen des Operators zu Testregel, Ansichtskopf und Paper-Entwurf

- Anlass: Nach der Gesamtprüfung vom 2026-10-29 lagen drei Fragen beim Operator. Er entschied, die Testregel zu erweitern, die Kopfbereiche der Ansichten zu vereinheitlichen und im Paper-Entwurf nur die Fakten zu korrigieren.
- Befund: Die Kopfbereiche der zwölf Ansichten hatten Überschriften zwischen 16 und 32px, zentriert oder linksbündig, Karte, Personen und Briefe hatten keine Überschrift. Ein axe-Lauf bei 390px fand zwei ältere Verstöße, die die Läufe bei Desktop-Breite nicht zeigten: Der Rücklink der Navigation hatte keinen Namen, sobald der Datensatztitel ausgeblendet ist, und gekürzte Beschriftungen im Erwähnungsfluss fehlten im zugänglichen Namen der Knoten. Der Paper-Entwurf und der Review-Prompt in `research-artefacts/` nannten zehn statt zwölf Ansichten, das Repository unter `chpollin/` und eine CONTEXT-MAP in jedem Verzeichnis.
- Entschieden: Tests dürfen gebündelte vorprozessierte Datensätze unter `docs/data/*.json` unverändert laden, wenn sie die Indexform der Vorprozessierung brauchen, nachgebaute Kopien bleiben ausgeschlossen. Alle Ansichten beginnen mit der Komponente `.view-header` ([design.md](design.md)). Modellangaben und die Rahmung der Dokumentation als „Single Source of Truth“ im Paper-Entwurf bleiben Sache des Operators.
- Korrigiert: Die Aussage des Journaleintrags vom 2026-10-29, die Suite Research Paths weiche von der Testregel ab, gilt mit der erweiterten Regel nicht mehr.
- Geändert: `CLAUDE.md` und [testing.md](testing.md) mit der erweiterten Testregel. `.view-header` mit Titel, Beschreibung und Aktionsbereich in `components.css`, neue Überschriften für Karte, Personen und Briefe, alte Kopfregeln in `explore.css` entfernt, `.map-stage`. Rücklink mit verstecktem Text „Zur Startseite“, Sankey-Knoten mit der sichtbaren Kurzform am Anfang ihres Namens. In `research-artefacts/` Anzahl der Ansichten, Repository-URL, die vier Verzeichnisse mit CONTEXT-MAP und die Chronik als letzte Ansicht ihrer Phase. [design.md](design.md), `docs/css/CONTEXT-MAP.md`, [plan.md](plan.md).
- Belege: Commit dieses Eintrags. Browser-Test-Runner headless ohne Fehlschlag. axe-core bei 320, 390, 768 und 1440px auf allen Seiten und den zwölf Ansichten mit `hsa-letters.json`, dazu Prüfung auf horizontalen Überlauf und Seitenfehler. Screenshots vorher und nachher der Ansichtsköpfe bei 390, 768 und 1440px.

### 2026-10-29 Gesamtprüfung durch Subagenten und Konsolidierung für das Paper

- Anlass: Auftrag des Operators, das ganze Werkzeug tief zu prüfen und zu verbessern, damit das Promptotyping-Paper auf einen sauberen, geprüften Stand verweisen kann. Geprüft werden sollten Funktion aller Ansichten und Filter, Datenkorb, Benachrichtigungen, Barrierefreiheit, Design, Responsivität, Refactoring-Bedarf und die Übereinstimmung von README und Wissensdokumenten mit dem Code. Dieser Eintrag markiert den Stand, den das Paper als vorläufigen Endstand zitieren kann.
- Befund: Fünf lesende Subagenten prüften parallel je einen Bereich (Klickdurchlauf von explore.html, übrige Seiten mit Korb und Toasts, WCAG 2.2 AA mit axe-core, Design und Responsivität bei fünf Breiten, Code und Dokumentation). Wesentlich waren: Sprach- und Themenfilter der Sidebar nie sichtbar, weil `style.display` gegen die Klasse `hidden` mit `!important` verlor (dasselbe Muster beim leeren Wissenskorb und beim Zeithinweis des Uploads). Ortsfilter und Qualitätsfilter überstanden das Neuladen nicht, das Betrachten eines Themas setzte stillschweigend einen Themenfilter. Chronik lud nie mehr als 100 Briefe, die Heatmap legte Monats-, Jahres- und Zeitraumdaten auf Tage, der Brief-Dialog zeigte unscharfe Daten als Tagesdatum. Für hochgeladene Dateien fehlten im Personen-Dialog Normdaten- und correspSearch-Links, weil `buildIndices` die ID nicht speicherte. Die Forschungspfade lasen die Indexform des HSA falsch und erkannten das Ego-Netzwerk nie. Export und Detail-Tab der Korbseite übergingen Briefe und Orte des Korbs, geteilte Korb-Links trugen keinen Datensatz und überschrieben den Korb. Rund 40 CSS-Tokens waren nicht definiert, wodurch Hintergründe und alle Dialog-Schatten ausfielen, während nicht schwebende Elemente Schatten trugen. Mehrere Bedienelemente waren nur mit der Maus erreichbar, Eingabefelder hatten keinen sichtbaren Fokus, Dialoge hielten den Fokus nicht. `build_hsa_data.py` erkannte die Kurzform `viaf.org/{id}` nicht, die die HSA-Quelle für Erwähnungen schreibt, 11.653 von 17.413 Erwähnungsverweisen trugen deshalb keine ID. Die Testsuite lief auf `test.html?test=true` zweimal gleichzeitig.
- Entschieden: Vier schreibende Subagenten behoben die Befunde mit getrennten Dateizuständigkeiten (CSS, explore.js mit utils.js, Ansichtsmodule mit state-manager, übrige Seiten), danach prüfte ein unabhängiger Subagent den gesamten Änderungssatz gegen den alten Stand und ein letzter behob dessen Befunde. `state.fromURLParams` ist der einzige URL-Parser. Personen und Orte werden in Übersicht, Sidebar und Forschungspfaden einheitlich aus den Briefen über `personKey` und `placeKey` gezählt, der Platzhalter „Unbekannt“ zählt nicht als Ort. Nicht beantwortbare Forschungsfragen erscheinen als „Anreicherungspotential“ (ADR-005). `components.css` ist die einzige Quelle für Knöpfe und Dialoge, `shadows.css` die einzige für Schatten, Umbrüche liegen bei 767px. Geteilte Korb-Links tragen den Datensatz (`basket_dataset`) und werden zusammengeführt. Die Suite Research Paths lädt zusätzlich `data/hsa-letters.json`, weil der Fehler an der Indexform des HSA nur dort sichtbar wird, das weicht von der Regel ab, nur CMIF-Fixtures über `parseCMIF` zu laden, und liegt dem Operator zur Entscheidung vor.
- Korrigiert: Mehrere Stories in [specification.md](specification.md) beschrieben Funktionen, die es nicht gibt (US-05, US-11, US-22, US-27), die Lücken stehen jetzt in [plan.md](plan.md). [uncertainty-specification.md](uncertainty-specification.md) nannte veraltete HSA-Kennzahlen, Anzeigeformate und Exportspalten. [testing.md](testing.md) führte Netzwerk-Aggregation und `aggregateLettersByPlace` als getestet. `about.html` beschrieb den Erwähnungsfluss als Themendiagramm und die Kacheln als OpenStreetMap, [project.md](project.md) nannte CDNs statt `docs/vendor/`.
- Geändert: Neue Module `research-paths.js`, `knowledge-path.js`, `export.js` und `views/view-support.js`, aus explore.js herausgelöst oder neu als gemeinsame Helfer. Neue Suites Basket und Research Paths, Tests für den URL-Rundweg aller Filter und für alte Ortslinks. `hsa-letters.json` neu erzeugt, die Indizes blieben gleich, nur die Erwähnungen tragen jetzt ihre VIAF-ID. `preprocessing/requirements.txt`. Tastaturwege für Zeitleiste, Heatmap, Netzwerk, Erwähnungsfluss, Vergleichssuche, Forschungspfade und Demo-Tour, Fokusfalle in allen Dialogen, sichtbarer Fokus, Kontraste über `--color-primary-dark`, dunklere Werte für `--color-warning` und `--color-info`. Rund 400 tote CSS-Regeln entfernt. Alle Wissensdokumente, README, codemeta.json und die vier CONTEXT-MAPs nachgezogen. Offene Punkte (Heatmap-Zellen unter 24px, Sprachsegmente und Flussverbindungen ohne Tastaturweg, Schraffur der Zeitleiste, einheitlicher Ansichtskopf, Story-Lücken) stehen in [plan.md](plan.md#vorhaben).
- Belege: Commit dieses Eintrags. Browser-Test-Runner headless ohne Fehlschlag. Playwright-Durchläufe aller Seiten und der zwölf Ansichten mit `hsa-letters.json` und den drei hochgeladenen Fixtures ohne Seitenfehler, ohne horizontalen Überlauf bei 320, 390, 768 und 1440px, axe-core ohne Verstöße. ESLint ohne Fehler. HSA-Kennzahlen mit Python aus `docs/data/hsa-letters.json` gegengerechnet. Protokoll in [testing.md](testing.md#browser-prüfung-der-ansichten).

### 2026-10-29 Befunde 9 bis 11 nach Entscheidung des Operators behoben

- Anlass: Der Operator entschied die offenen Fragen aus [plan.md](plan.md). Die Koordinatentabelle des Uploads wird durch die Wikidata-Tabelle der Vorprozessierung ersetzt (Befund 9), der Personen-Dialog fragt Wikidata erst auf Klick (Befund 10), die Qualitäts-Chips verlieren die Ampelfarben. Die übrigen Punkte aus Befund 11 waren abzuarbeiten.
- Befund: Wikidata verknüpft Genf mit der GeoNames-ID 7285902, nicht mit 2660646 aus dem Tutorial-Datensatz, die reine Wikidata-Tabelle hätte Genf deshalb ohne Koordinaten gelassen. Der Balken der undatierten Briefe war nie sichtbar, weil die Klasse `hidden` mit `!important` das gesetzte `style.display` überstimmte. noUiSlider löst `update` schon beim Binden aus, das setzte den Zeitfilter aus der URL beim Laden zurück, und `initialLanguageFilter` wurde gelesen, aber nie angewandt. `updateFilterCounts` wiederholte die Filterlogik des state-managers und zählte Briefe ohne Sprache nie. Der Toast nach „Briefe zum Korb“ meldete auch Briefe, die der Korb wegen seiner Obergrenze abwies. Die Korbseite rief den Toast über ein statisches Element mit `hidden` auf, das nie erschien. Die Quelle des HSA schreibt für Ladinisch selbst `target="None"`. Das Zeitgenossen-Netzwerk brauchte auf dem HSA unter 100 ms, die Bitmasken-Fassung liefert identische Knoten, Kanten und Kennzahlen in einem Bruchteil davon.
- Entschieden: Fehlende IDs der gebündelten CMIF-Dateien löst das Skript über Wikidata und, wo Wikidata die ID nicht trägt, über den GeoNames-RDF-Dienst auf. Der Code für Briefe ohne Sprache heißt intern `_none` (`NO_LANGUAGE`), damit der Quellwert `None` eine Sprache bleibt. Der Korb wird je Datensatz gespeichert, der Wissenspfad nur zum Datensatz geladen, auf dem er begann. Ein Korb unter dem früheren Schlüssel `correspexplorer-basket` wird nicht mehr gelesen. Die Korbseite wertet Briefe, Personen und Orte des Korbs gemeinsam aus, Orte erzeugen dabei keine Netzwerkknoten. Parser und correspSearch-Lader teilen `buildIndices` mit `personKey` und `placeKey` wie in ADR-001, hochgeladene Datensätze führen dadurch auch Personen und Orte ohne Normdaten-ID im Index, und die Quote „Georeferenziert“ zählt Orte ohne GeoNames-ID mit. Neu ist [ADR-006](specification.md#adr-006-externe-dienste-nur-auf-ausdrückliche-aktion).
- Korrigiert: [architecture.md](architecture.md) nannte die Wikidata-Abfrage beim Öffnen der Personendetails als Ausnahme, [data.md](data.md#hugo-schuchardt-archiv) führte die Doppeldeutigkeit von `None` auf die Vorprozessierung zurück, sie stammt aus der CMIF-Datei.
- Geändert: `docs/data/geonames_coordinates.json` neu aus `resolve_geonames_wikidata.py --served`, `upload.js` liest das Format `{meta, coordinates}`. Personen-Dialog mit Schaltfläche und Verwerfen veralteter Antworten. Zeitfilter `{ undated: true }`, Sprachfilter `null` für keinen Filter, `filterLetters()` im state-manager, URL-Filter beim Laden, Ansichtswechsel schreibt die URL. Gemeinsame Helfer `openModal`, `closeModal`, `showToast`, `buildIndices`, `cleanId`, `languageLabel`, `addLettersToBasket` und `assert` des Test-Runners statt der Kopien. Fall 023 in `test-uncertainty.xml`, Regressionstests für leere Sprachauswahl, undatierte Briefe, URL-Rundweg, `filterLetters` und den Code `None`. Ungenutztes CSS der Qualitätsbalken entfernt. [plan.md](plan.md) ohne offene Befunde, dazu [data.md](data.md), [design.md](design.md), [specification.md](specification.md), [testing.md](testing.md), [uncertainty-specification.md](uncertainty-specification.md) und die CONTEXT-MAPs.
- Belege: `6ec84a5`, `53de6ef`, `442c5ee`, `f2ff136` und der Commit dieses Eintrags. Browser-Test-Runner headless ohne Fehlschlag, die neuen Tests schlagen gegen den alten state-manager fehl. Koordinatentabelle Eintrag für Eintrag gegen `sws.geonames.org` abgeglichen. Netzwerk alt gegen neu auf `hsa-letters.json` für fünf Einstellungen verglichen. Browser-Durchlauf in [testing.md](testing.md#browser-prüfung-der-ansichten).

### 2026-10-29 Merge von feature/research-dashboards, Browser-Prüfung und Bereinigung

- Anlass: Auftrag des Operators, den Branch `feature/research-dashboards` in main zu führen, das Werkzeug im Browser zu prüfen, aufzuräumen und zu verbessern. Der Branch trug seit Dezember 2025 die Wissenspfade mit Datenkorb (US-35, US-36), Icon-Navigation, kompakte Startansicht, CMIF-v2-Erwähnungen im Tutorial-Datensatz, die Vergleichsansicht (US-37), die Auslagerung von acht Ansichten nach `docs/js/views/` und das Löschen alter Module. Sein Journal führte das als Phasen 40 bis 46.
- Befund: Konflikte in `README.md`, `docs/index.html`, `explore.js`, `vault.js`, `tests/CONTEXT-MAP.md`, `architecture.md`, `testing.md` und den auf main umbenannten Wissensdokumenten. Auf Windows überschrieb das `JOURNAL.md` des Branchs beim Merge `journal.md`. Die verschobenen Ansichten trugen die Sicherheitsfixes von main nicht, der aktivste Tag verglich weiter mit `'exact'`, und neuer Code des Branchs setzte Lizenz- und CMIF-Links ungeprüft in HTML. Die Browser-Prüfung mit Playwright und zwei unabhängige Prüfungen durch Sonnet-Subagenten (Oberfläche, Code) fanden Laufzeitfehler: Karten-Popups und die Koordinatenauflösung warfen `ReferenceError`, der Datenkorb erhielt nie Daten (`state.getDataIndices` existiert nicht), „Alle Pfade anzeigen“ scheiterte an `'unanswerable'` statt `'unavailable'`. Dazu kamen verdeckte Kartenknöpfe (Befund 7), ein Personenfilter ohne Normdaten-ID ohne Treffer (Befund 6), ein Sprachfilter, der beim HSA Briefe in den Sprachen jenseits der zehn häufigsten ausschloss, eine Heatmap mit um einen Tag verschobenen Zellen östlich von UTC, eine URL ohne `?json=` nach dem ersten Filter, Escape ohne Wirkung in Dialogen, eine unbedienbare Sidebar unter 768px und interne Links im Vault mit 404. Alle Bibliotheken und Schriften kamen zur Laufzeit von CDNs, marked und D3 ohne feste Version. Die Koordinatentabelle `docs/data/geonames_coordinates.json` ordnet 13 von 58 GeoNames-IDs einer anderen Stadt zu (Befund 9).
- Entschieden: Die Sicherheitsfixes, die Wissensbasis-Struktur und die Qualitätsfixes von main gehen vor, Funktionen und Modularisierung des Branchs werden übernommen. Die Phasennummern 40 bis 46 des Branchs bleiben in dessen Git-Historie und werden nicht als Journalüberschriften übernommen, weil sie mit Phase 40 auf main kollidieren. `docs/data/schoenbach.xml` bleibt erhalten, weil keine Entscheidung zum Entfernen vorlag, die Löschungen von `enrichment.js`, `test-uncertainty.js`, zwei Migrationsskripten und der erzeugten Liste `data/geonames_missing.json` gelten. Befund 8 wird behoben, der Ladepfad bleibt. Bibliotheken werden in `docs/vendor/` eingebunden, marked auf 12.0.2 festgelegt. `hsa-letters.json` erhält einen Änderungsvermerk, `test-hostile.xml` die Lizenz CC BY 4.0 der übrigen synthetischen Dateien ([data.md](data.md#rechte-und-lizenzen)). Die Koordinatentabelle bleibt als Datenbestand unverändert, ihre Bereinigung ist Operatorentscheidung.
- Korrigiert: `project.md` und README schrieben die Rechte am HSA dem Archiv zu, maßgeblich ist die Lizenz CC BY 4.0 im teiHeader. `about.html` nannte für das ganze Werkzeug „CC-BY“, es gelten MIT für Code und CC BY 4.0 für Dokumentation.
- Geändert: Merge mit Nachziehen der Fixes in den Ansichtsmodulen, gemeinsame Helfer `externalLink`, `classifyDate`, `personKey`, `placeKey`, `csvCell` und `enableModalKeyboard` in `utils.js`, Ortsfilter über den state-manager, Kartenfallback ohne Grundkarte, Filter-Schalter für schmale Bildschirme, zugängliche Namen der Ansichtsknöpfe, CSV-Zellen gegen Formeln geschützt, Normdaten-IDs vor SPARQL geprüft, correspSearch-URLs am Host erkannt. Entfernt wurden tote Funktionen und Importe, die unerreichbaren Dialoge, 51 ungenutzte DOM-Getter, `basket-ui.js` und veraltete Kommentare. [architecture.md](architecture.md) ist neu gefasst, [plan.md](plan.md) schließt die Befunde 6 bis 8 und führt 9 bis 11, [specification.md](specification.md) hat US-35 bis US-37, dazu [data.md](data.md), [design.md](design.md), [testing.md](testing.md), [handoff.md](handoff.md) ohne offene Punkte und die vier CONTEXT-MAPs.
- Belege: `14b2d17`, `b80eff0`, `22f7102`, `6fa1fe3`, `6d5a7f6`, `b7a29c9`, `6a6f392`, `1a091f1`, `b32c420` und der Commit dieses Eintrags. Browser-Test-Runner headless ohne Fehlschlag, die zwei neuen Filtertests schlagen mit dem alten state-manager fehl. correspSearch-API mit `d=1890-01-01` geladen (87 Briefe, 9 Seiten). Playwright-Durchlauf aller Ansichten mit `hsa-letters.json` und drei hochgeladenen Fixtures ohne Seitenfehler, Protokoll in [testing.md](testing.md#browser-prüfung-der-ansichten). Koordinatentabelle gegen `sws.geonames.org` abgeglichen.

### 2026-10-29 Qualitätsanzeige, Datenrechte und correspSearch-API

- Anlass: Die Übersicht zeigte für das HSA 0 % identifizierte Personen. Dazu Sichtung des Branchs `feature/research-dashboards`, des Skripts `test-quick.js`, der Rechte an den gebündelten Datensätzen und des offenen Befunds 8.
- Befund: `renderOverview` erkannte identifizierte Personen an einer ID mit Präfix `http`. Parser und Vorprozessierung speichern die Normdaten-ID ohne URL (`18030027`) und das System in `authority`, gezählt wurden nur Personen mit unbekanntem Normdatensystem. Die Datumsqualität las `meta.uncertainty.imprecise_dates`, das weder Parser noch Vorprozessierung schreiben, und zeigte immer 100 %. Der aktivste Tag der Aktivitätsansicht verglich `datePrecision` mit `'exact'`, das nie vorkommt, und blieb leer. `test-quick.js` bricht unter Node ab, weil `fetch` keinen relativen Pfad lädt, und deckt nur Prüfungen der Parser-Suite ab. Die CMIF-Datei des HSA steht laut teiHeader unter CC BY 4.0, die Schönbach-Datei unter CC0. Die correspSearch-API liefert beobachtet 10 Briefe je Seite, ihre Dokumentation nennt 100.
- Entschieden: Die Personenquote zählt über die neue Funktion `countIdentifiedPersons` in `utils.js`, die Datumsqualität über `datePrecision === 'day'` der geladenen Briefe wie die Qualitäts-Icons im Kopf. `test-quick.js` entfällt, der Testort bleibt `docs/js/tests/` mit `run-all-tests.js`. Befund 8 bleibt Operatorentscheidung und ist um die geprüfte API-Lage ergänzt. Der Branch bleibt unverschmolzen, die Sichtung steht in [handoff.md](handoff.md).
- Korrigiert: Die Aussage, die Rechte an den HSA-Daten lägen beim Archiv, in `data.md` und README durch die Lizenzangabe der Datei ersetzt.
- Geändert: [data.md](data.md#rechte-und-lizenzen) mit Lizenztabelle und drei offenen Rechtsfragen, [plan.md](plan.md), [architecture.md](architecture.md), `docs/js/tests/CONTEXT-MAP.md`.
- Belege: `9324b24`, `764cabc`, `e7cf201`. Browser-Test-Runner in headless Chrome ohne Fehlschlag, der neue Regressionstest schlägt mit der alten Bedingung fehl. Übersicht mit `hsa-letters.json`: Personen 83 % (852/1031), Datum 95 % (10991/11576), gegengerechnet in Python aus der Datei. Aktivster Tag 1912-02-04 mit 23 Briefen, gegengerechnet ebenso.

### 2026-10-28 verdichtet Journal

- Vorgängerstand: `2ecd575`
- Bereich: alle Einträge von den Gründungsphasen im November 2025 bis zur Vereinheitlichung vom 2026-10-28, dazu der Kopf mit Phasenübersicht und die Abschnitte „Architektur-Entscheidungen“, „HSA-Datenstruktur“ und „Mögliche Erweiterungen“ am Dateiende.
- Ergebnis: Die Einträge folgen den Feldern der Vorlage Journal 0.6 und stehen neueste zuerst. Überschriften und Phasennummern bleiben unverändert, weil das Paper zur Fallstudie die Phasen als Abschluss je eines Journaleintrags zitiert. Behalten sind Entscheidungen mit Grund, die benannten Entscheidungen E1 bis E4 und E9 bis E12, Rückbaugründe, Korrekturen und alle Commit-Hashes. Die Phasenübersicht entfällt, weil die Überschriften sie tragen. Die HSA-Kennzahlen stehen in [data.md](data.md#hugo-schuchardt-archiv). Die „Möglichen Erweiterungen“ entfallen, weil Netzwerk (Phase 8), Koordinaten-Auflösung (Phase 30), Themenfilter (Phase 7) und Brief-Detail (Phase 6) umgesetzt sind. Funktionsnamen, CSS-Klassen, Datei- und Löschlisten, Code-Blöcke und Zeilenzahlen sind ausschließlich über Git bewahrt. Die Belege der Einträge bis Oktober 2026 sind nach Datum und Commit-Betreff zugeordnet, wo der Eintrag selbst keinen Hash nannte.
- Belege: `2ecd575`

### 2026-10-28 Vereinheitlichung nach Promptotyping-Vorlagen

- Anlass: Angleichung der Wissensbasis in `docs/knowledge/` an die Konvention für Promptotyping Documents und ihre Vorlagen. Der Stand davor ist `29dfc15`, den das Paper zur Fallstudie zitiert. Die Belegcommits der Fallstudie bleiben gültig, `91d965a` (Einführung der Context Map) und `39b86d4` (Entfernung ihrer Selbstbescheinigung) für die Episode der Context Map, `85da32f` für die entfernten unbelegten NN/g-Zahlen.
- Befund: Aus dem früheren Archiv bekannter Probleme fehlten im Journal einige Behebungen. PRIMARY_COLOR in `explore.js` von `#C65D3B` auf `#A64B3F` und der README-Verweis auf die gelöschte `refactoring-plan.md` stehen in `dbda53f` (2025-11-27). Sidebar-Breite über `var(--sidebar-width)` (`7657cd1`) und die fehlende VIEWS-Konstante MENTIONS_FLOW (`c528d8c`) wurden am 2025-12-09 als Phase 31 verzeichnet, die im Journal sonst fehlt. Die Synchronisation von design.md mit tokens.css war am 2025-12-18 (Phase 33) als behoben vermerkt.
- Entschieden: Die Aussage „Alle 34 User Stories sind implementiert“ und die Status-Zeilen je Story gingen nicht in `specification.md` über, weil der Umsetzungsstand nie gegen den Code geprüft war und die Befunde 6 und 8 ihm widersprechen. Die unbelegte Angabe „unter 200 ms Renderzeit“ entfiel.
- Geändert: `CONTEXT-MAP.md` heißt `INDEX.md`, `JOURNAL.md` heißt `journal.md`, `uncertainty-concept.md` heißt `uncertainty-specification.md`, und die Paper-Dateien liegen in `research-artefacts/`. `user-stories.md` wurde zu [specification.md](specification.md) mit Anforderungen, Stories, Funktionsumfang und ADR-001 bis ADR-005. CMIF-Standard, Demo-Datensätze und Quellen gingen in [data.md](data.md) auf, `learnings.md` wurde auf [data.md](data.md), [architecture.md](architecture.md), [design.md](design.md) und die ADRs verteilt, die offenen Befunde 6 bis 8 stehen in [plan.md](plan.md). Neu sind `project.md`, `plan.md` und `handoff.md` mit dem offenen Punkt zum Branch `feature/research-dashboards`. `docs/js/vault.js` entfernt YAML-Frontmatter vor dem Rendern und leitet alte Anker weiter.
- Belege: `5953383`, `af1f9b2`, `a4cbba0`, `a001765`, `8da6176`. Geprüft mit dem Browser-Test-Runner und `vault.html` für jeden Dokumentanker in headless Chrome.

### 2026-10-28 (Kuration fuer die Promptotyping-Fallstudie)

- Anlass: Das Repository dient als Fallstudie in einem Paper über Promptotyping. Die Kuration korrigiert Sachfehler und macht die Entstehung für externe Leser nachvollziehbar, die historische Form der Wissensbasis bleibt erhalten. Keine Phasennummer, weil der unverschmolzene Branch `feature/research-dashboards` die Nummern 40 bis 46 bereits vergibt.
- Befund: Die Angaben „34 %“ und „23 %“ zu Schatten, der Nielsen Norman Group zugeschrieben, ließen sich in keiner NN/g-Quelle finden. `explore-tests.js` importierte kein Produktionsmodul, wurde von keiner Seite geladen und implementierte die geprüften Logiken inline auf Mock-Arrays nach. Die Context Map bescheinigte sich selbst „12/12 compliant, keine Redundanz“. Der correspSearch-API-Pfad paginiert fehlerhaft.
- Entschieden: Die NN/g-Zahlen werden aus `shadows.css`, `design.md` und `css/CONTEXT-MAP.md` entfernt, der Eintrag zu Phase 28 bleibt als Historie stehen. `explore-tests.js` wird gelöscht, und `testing.md` löst den Widerspruch zwischen Real-Data-Regel und Inline-Testdaten zugunsten kleiner CMIF-Fixture-Dateien auf. Ungemessene Coverage- und Laufzeitwerte entfallen.
- Korrigiert: Das Behebungsdatum der Probleme 1 und 4 ist `dbda53f` (2025-11-27).
- Geändert: Das README führt die correspSearch-API nicht mehr als Feature und hat den Abschnitt „How this was built“. Die defekte Paginierung ist Befund 8 in [plan.md](plan.md).
- Belege: `85da32f`, `86ef43c`, `2f60cbf`, `39b86d4`, `0b2e9c9`, `77fb766`, `4cb2a32`. Geprüft mit dem Browser-Test-Runner (`test.html?test=true`) in headless Chrome vor und nach der Löschung.

### 2026-10-02 (Phase 40: Sicherheits-, Stabilitaets- und Tastatur-Fixes)

- Anlass: Befunde eines Code-Reviews auf main, jeweils im Code verifiziert.
- Befund: Die DOM-Variante von `escapeHtml` ließ Anführungszeichen in Attributen stehen. Personen- und Themenfilter brachen `applyFilters` ab, weil `.stats-cards` kein direktes Kind von `.sidebar` ist. Chronik-, Aktivitäts- und Erwähnungs-Klicks riefen undefinierte Funktionen auf. CARTO liefert nur noch einen API-Key-Platzhalter.
- Entschieden: Escaping per String-Replace, `safeUrl()` lässt nur http und https zu, und alle innerHTML-Senken escapen CMIF-, JSON- und Wikidata-Werte. `?json=` lädt nur relative Pfade unter `data/` mit Endung `.json`. Inline-onclick mit Datenwerten weicht data-Attributen und Listenern. Beide Karten nutzen OpenFreeMap. `parseCMIF` prüft seine Eingabe explizit und vergibt eine deterministische Fallback-ID. Datei-Input, Datensatzkarten und Listeneinträge sind per Tastatur bedienbar.
- Geändert: neue Testsuite `test-security.js` mit `data/test-hostile.xml` und Parser-Tests. Personenfilter ohne Normdaten-ID und verdeckte Kartenbedienelemente blieben offen, heute Befunde 6 und 7 in [plan.md](plan.md).
- Belege: `6204990`, `c65c7af`, `d35643f`, `24ba8f9`, `5cea2bf`, `6536181`, `a0de0b8`, `cedf6b8`

### 2025-12-18 (Phase 39: Activity Heatmap View)

- Entschieden: Ein zwölfter View zeigt als Kalender-Heatmap, wann Briefe geschrieben wurden, ohne Annahmen über Antworten oder Latenz, sodass er auch mit der Hub-Struktur des HSA funktioniert. Der aktivste Tag wird nur aus exakten Daten (`datePrecision === 'exact'`) berechnet, weil Platzhalter wie 1798-01-01 die Statistik verfälschten. Entwickelt auf einem Feature-Branch, nach Tests nach main gemergt.
- Geändert: US-34 in [specification.md](specification.md).
- Belege: `aa73072`, `c1cb9cc`, `70db9d4`, `e7adb9b`

### 2025-12-18 (Phase 38: Forschungspfade View)

- Entschieden: Ein elfter View zeigt, welche Fragen mit den Daten beantwortbar sind, in vier epistemischen Kategorien (deskriptiv, analytisch, interpretativ, nicht beantwortbar), jede Frage mit einem mehrstufigen Pfad durch die Views. Nicht beantwortbare Fragen nennen Anreicherungsvorschläge. „Anreicherungspotential“ ersetzt „Datenqualität“, weil die UI-Sprache gegenüber Partnerdaten nicht wertend sein soll.
- Befund: Der CMIF-Parser verwendet `letter_count` statt `letters_sent`, Subject-Objekte haben `label` statt `name`, Sprach-URLs müssen über `LANGUAGE_LABELS` gemappt werden.
- Geändert: US-33 in [specification.md](specification.md), ADR-004 und ADR-005.
- Belege: `2534ef8`

### 2025-12-18 (Phase 37: Anreicherungs-Feedback und UI-Fixes)

- Geändert: Die Wikidata-Anreicherung zeigt ein Live-Log je Person und eine Zusammenfassung der gefundenen Daten. Die Kreise der Timeline sitzen exakt auf der Linie.
- Belege: `6774c80`

### 2025-12-18 (Phase 36: Chronik als Forschungswerkzeug)

- Entschieden: Die Chronik wird zum kontextualisierten Lesewerkzeug mit Alter der Korrespondenten zum Briefzeitpunkt, Lebensleiste, Beziehungskontext („Erster Brief“, „Brief X von Y“) und drei Layouts (Karten, Kompakt, Timeline mit Kommunikationsrichtung). Lebensdaten kommen aus der Wikidata-Anreicherung oder aus dem CMIF.
- Geändert: US-30 bis US-32 in [specification.md](specification.md).
- Belege: `f728c72`

### 2025-12-18 (Phase 35: Chronik-View implementiert)

- Entschieden: Ein vertikaler Zeitstrahl gruppiert alle Briefe nach Jahren, die Wikidata-Anreicherung für Porträts und Lebensdaten läuft nur auf Abruf und nutzt das bestehende Anreicherungsmodul.
- Belege: `7959a5c`, `ffde902`

### 2025-12-18 (Phase 34: Compare-Feature entfernt)

- Entschieden: Die Vergleichsseite `compare.html` mit Skript und Stylesheet wird vollständig entfernt, weil sie selten genutzt wurde, der Fokus auf der Kernfunktionalität liegt und die Wartungslast sinkt. Die Story US-23 (Datensatz-Vergleich) entfällt, die Stories wurden neu nummeriert.
- Belege: `7959a5c`

### 2025-12-18 (Phase 33: teiHeader Metadaten und Landing Page Optimierung)

- Befund: `gams.uni-graz.at` erlaubt keine CORS-Anfragen, und die correspSearch-API liefert nur einen kleinen Ausschnitt des HSA statt des vollständigen Archivs. Das HSA trägt erweiterte Annotationen (`mentionsSubject`, `mentionsPerson`, `mentionsPlace`).
- Entschieden: Zwei Datensatztypen, Standard-CMIF mit Live-Parsing von XML und erweiterte Datensätze als vorprozessiertes JSON mit zusätzlichen Annotationen. Die Startseite führt nur noch die Feature-Demo und das HSA. Der Hinweis „Vibe-Coding Demo“ heißt jetzt „Promptotyping Demo“. Die teiHeader-Metadaten werden vollständig extrahiert und nur im Overview angezeigt, weil Sidebar und Overview sie sonst doppelt führen und die Sidebar Filtern und Statistik dient.
- Belege: `a40f14c`, `84a058b`, `ddc47b6`, `3717704`

### 2025-12-09 (Phase 32: Vollstaendiges Entity Component Refactoring)

- Befund: Topics- und Places-View hatten identische Struktur mit getrennten CSS-Klassen, und das Detail-Panel der Topics wurde wegen eines Selektors auf eine alte Klasse nicht angezeigt.
- Entschieden: Eine gemeinsame Entity-Komponente in `components.css` trägt Layout, Detail-Inhalte und Karten beider Views, die alten Klassen entfallen.
- Belege: `b00037b`, `abfb369`

### 2025-12-03 (Phase 30: Koordinaten-Anreicherung mit Wikidata SPARQL)

- Befund: CMIF-Daten enthalten oft nur GeoNames-IDs, und der statische Koordinaten-Cache war unvollständig, sodass die Karte für manche Datensätze nicht nutzbar war.
- Entschieden: Das Interface passt sich den Daten an, der Map-View verschwindet ohne Koordinaten. Nutzer können Koordinaten über Wikidata SPARQL (GeoNames-ID P1566 zu Koordinaten P625) nachladen, gebündelt, mit Pause zwischen Anfragen und lokalem Cache, vor der Personen-Anreicherung.
- Belege: `5a9c1fc`

### 2025-12-03 (Phase 29: HTML-Refactoring - Inline-Styles entfernt)

- Entschieden: Alle Inline-Styles der HTML-Dateien weichen CSS-Klassen, die Testseite erhält ein eigenes Stylesheet, damit Inhalt und Darstellung getrennt sind.
- Belege: `5be9f76`, `96692bb`

### 2025-12-03 (Phase 28: CSS-Refactoring Abschluss)

- Befund: Doppelte `.btn-primary`-Definition und Pill-Formen in der Navigation, offen blieb ein Review der übrigen Box-Shadows.
- Entschieden: Modulare CSS-Architektur mit fester Importfolge (tokens, base, components, shadows, style, Seite), die Spezifitätsprobleme verhindert. Konsistente `--color-*`-Tokens ohne Legacy-Aliase. Border-based Design mit 2px- und 3px-Rahmen für reguläre Elemente. Hybrid Shadow Approach (Option B), Schatten nur für schwebende Elemente. `:focus-visible` statt `:focus` für WCAG-2.1-AA-konforme Fokuszustände. Der Eintrag begründete die Schatten-Regel damals mit „Shadows verbessern Z-Achsen-Wahrnehmung um 34% (Nielsen Norman Group) aber erhoehen kognitive Last um 23%“.
- Korrigiert: Die NN/g-Zahlen ließen sich in keiner Quelle finden und wurden am 2026-10-28 aus Code und Dokumentation entfernt. Der Satz bleibt hier als Historie (Eintrag zur Kuration).
- Belege: `3a406c8`

### 2025-12-02 (Phase 27: Mentions Flow View)

- Entschieden: Ein Sankey-Diagramm zeigt, welche Personen in wessen Briefen erwähnt werden, bipartit von Korrespondenten zu Erwähnten, Personen in beiden Rollen als Hybrid-Knoten. Gegen kognitive Überlastung stehen die Schwellen als Bedienelemente in der Sidebar (Top N, Mindest-Erwähnungen je Sender, Mindest-Flussstärke), mit URL-Persistenz. Die Nutzer steuern damit selbst den Kompromiss zwischen Detail und Klarheit, statt fest kodierter Grenzen. Ein bipartites Netzwerk als Alternative blieb ungebaut.
- Belege: `9a03db5`, `1d8a48c`, `809fdd3`, `94590f8`, `1bfa0b1`, `141e682`

### 2025-12-01 (Phase 26: Uncertainty Documentation und HSA Update)

- Geändert: Das Unsicherheitskonzept, heute [uncertainty-specification.md](uncertainty-specification.md), ist nach Datum, Person, Ort und Sonderfällen gegliedert, mit systematischen Testfällen in `data/test-uncertainty.xml`. Die vorprozessierten HSA-Daten wurden aktualisiert.
- Belege: `f9758dd`

### 2025-12-01 (Phase 25: Wikidata Enrichment Visual Indicators)

- Geändert: Angereicherte Personen tragen ein Badge mit Tooltip zur Datenquelle, die Anreicherung zeigt Fortschritt und Fehler mit Retry.
- Belege: `541afe5`

### 2025-12-01 (Phase 24: correspSearch Form Cleanup)

- Entschieden: Das correspSearch-Suchformular auf der Startseite entfällt, weil es nicht vollständig funktionierte und direkte API-Anfragen an CORS scheiterten. URLs lassen sich weiter direkt eingeben, die Verknüpfung im Personen-Detail bleibt.
- Geändert: Korrekturen am Wissenskorb (Synchronisation zwischen Tabs, Speicherquote, leerer Zustand).
- Belege: `6a2d26c`

### 2025-12-01 (Phase 23: Wissenskorb WIP-Status)

- Entschieden: Der Wissenskorb wird als „in Arbeit“ gekennzeichnet und seine Buttons im Explorer vorläufig entfernt, weil die Grundfunktion steht, die Visualisierungen aber unvollständig sind und Erwartungen klar kommuniziert werden sollen.
- Belege: `0b23da7`, `8afe41e`

### 2025-12-01 (Phase 22: Mobile Responsiveness)

- Geändert: Hamburger-Menü unter 768px, Touch-Ziele von mindestens 44px und angepasste Views und Sidebar für kleine Bildschirme.
- Belege: `0f158df`, `4f8d359`

### 2025-11-27 (Phase 21: Demo Dataset und Onboarding Tour)

- Entschieden: Ein synthetischer Demo-Datensatz mit fiktiven Briefen, erzeugt mit Claude Opus 4.5, demonstriert alle Funktionen einschließlich der Unsicherheitsfälle. Die Beschreibung weist auf die KI-Erzeugung hin. Eine mehrstufige Tour startet über `?demo=true`.
- Belege: `e473e8e`

### 2025-11-27 (Phase 20: Network View Improvements)

- Befund: Platzhalterjahre wie 9999 verzerrten die Zeitachse, und ein fester Mindestwert für gemeinsame Jahre funktionierte bei kleinen Korpora nicht.
- Entschieden: Jahre außerhalb 1400–2100 werden gefiltert. Der Mindestwert passt sich der Zeitspanne an. Die Legende folgt dem gewählten Netzwerktyp. Knoten lassen sich nach Eintrittsjahr färben, um die Entwicklung des Netzwerks zu zeigen.
- Belege: `739c914`, `2fef680`

### 2025-11-27 (Phase 19: Timeline Improvements)

- Entschieden: Undatierte Briefe stehen in einem abgesetzten Balken rechts der Timeline. Die dominante Sprache erhält eine kräftige Farbe, alle anderen Pastelltöne. Ohne Sprachdaten zeichnet die Timeline einfarbige Balken und sagt das in der Legende.
- Belege: `1acde42`

### 2025-11-27 (Phase 18: Quick Wins Refactoring)

- Geändert: Duplizierte Hilfsfunktionen liegen zentral in `utils.js`, Magic Numbers als Konstantengruppen in `constants.js`.
- Belege: `a2bb732`

### 2025-11-27 (Phase 17: Themen-Filter Bugfix und Verbesserung)

- Befund: Der Themenfilter grenzte nicht ein, weil CMIF-Subjects `uri` statt `id` tragen.
- Geändert: Alle Stellen lesen `s.uri || s.id || s.label`, und die Sidebar zeigt eine durchsuchbare Themenliste.
- Belege: `f1f116d`

### 2025-11-27 (Phase 16: Sprachfarben fuer Kartenmarker)

- Entschieden: Kartenmarker zeigen die dominante Briefsprache eines Ortes, Cluster bleiben einfarbig, ein Schalter wechselt zur einheitlichen Farbe.
- Belege: `f1f116d`, `c038af3`

### 2025-11-26 (Phase 15: Datensatz-Vergleich und Bug-Fixes)

- Entschieden: Eine eigene Seite vergleicht zwei CMIF-Datensätze nach gemeinsamen Personen und Orten über Normdaten-IDs (US-23, entfernt in Phase 34).
- Korrigiert: Orte werden über `geonames_id` statt `id` verglichen.
- Belege: `b791e52`, `93c446c`

### 2025-11-26 (Phase 14: Design-Ueberarbeitung)

- Entschieden: Das Design-System leitet seine Farben aus dem Logo ab, mit Rost-Rot als Primärfarbe, Creme und Manila als Flächen und Tinte als Rahmen, und arbeitet mit Rahmen statt Schatten. Veraltete und redundante Dokumente (`refactoring-plan.md`, `enrichment-concept.md`) wurden gelöscht.
- Korrigiert: Der Eintrag nannte `#C65D3B` als PRIMARY_COLOR in `explore.js`. Die Angleichung an `#A64B3F` steht in `dbda53f` (Eintrag zur Vereinheitlichung).
- Belege: `b79a95e`

### 2025-11-26 (Phase 13: Wikidata-Enrichment mit Konfigurationsdialog)

- Entschieden: Die Personen-Anreicherung läuft über Wikidata SPARQL statt lobid.org, weil Wikidata GND und VIAF unterstützt, eine einheitliche Quelle für alle Personen ist und Bilder direkt von Wikimedia Commons liefert. Ein Konfigurationsdialog beim Laden bietet die Anreicherung vor der Visualisierung an und warnt bei großen Datensätzen.
- Belege: `10364fe`

### 2025-11-26 (Phase 12: GND-Enrichment - deprecated)

- Korrigiert: Die GND-Anreicherung über lobid.org wurde durch Phase 13 ersetzt.
- Belege: `bf4b5ca`

### 2025-11-26 (Phase 11: Demo-Datensaetze und Dokumentation)

- Befund: Die Analyse externer CMIF-Dateien zeigte unsichere Datierungen (`cert="low"`, Zeitbereiche), `[NN]` für unbekannte Personen und `unknown` für unbekannte Orte, seltene Sprachangaben, keine Themen und durchgängig GND und GeoNames.
- Entschieden: Externe Datensätze werden als klickbare Presets angeboten. Die Verbesserungsvorschläge der Analyse stehen in [plan.md](plan.md), die Presets als historischer Stand in [architecture.md](architecture.md).
- Belege: `2554df2`

### 2025-11-26 (Phase 10: Code-Refactoring)

- Geändert: Gemeinsame Hilfsfunktionen liegen in `utils.js`, und HerData-Altklassen wurden aus `components.css` entfernt.
- Belege: `d707f1e`

### 2025-11-26 (Phase 9: Wissenskorb Erweiterung)

- Entschieden: Der Wissenskorb wird vom Modal zur eigenen Analyseseite mit Timeline, Netzwerk, Karte und Briefliste, mit Kapazitätsgrenzen, Export und Teilen per URL.
- Belege: `d707f1e`

### 2025-11-26 (Phase 8: Integration und Netzwerk)

- Befund: GitHub-Raw-URLs lassen sich wegen erlaubtem CORS direkt laden, getestet mit einer externen CMIF-Datei ohne Koordinaten.
- Entschieden: Alle HerData-Dateien werden entfernt, der Fokus liegt ausschließlich auf CorrespExplorer. Die correspSearch-API v2.0 wird als Datenquelle integriert. Das Netzwerk erkennt Ego-Netzwerke und legt sie radial an.
- Geändert: Netzwerk-Visualisierung (US-11), correspSearch-Verknüpfung (US-24) und Liste der Orte ohne Koordinaten (US-08).
- Belege: `9a01c32`, `215f701`, `61a11e6`, `d235bcd`, `e963d13`

### 2025-11-26 (Phase 7: Themen-Explorer Implementation)

- Entschieden: Eine Frequenzliste statt Tag-Cloud, weil sie Themen vergleichbar macht. Ein expliziter Filter-Button trennt Erkunden und Filtern. Co-Occurrence beruht auf gemeinsamen Briefen.
- Geändert: Topics-View mit Detail-Panel und Integration ins globale Filtersystem (US-25 bis US-27).
- Belege: `c666fe3`, `d3a01cb`

### 2025-11-26 (Phase 7: Netzwerk-View Konzeption)

- Befund: Der Subjects-Index und die Erwähnungen wurden kaum genutzt.
- Entschieden: Entscheidung E12, ein Dashboard mit Themen-Fokus. Geprüft wurden Force-Directed Graph (unübersichtlich bei vielen Personen), Sankey (verliert Details), Matrix-Heatmap (abstrakt), Chord-Diagramm (begrenzt auf rund 50 Elemente) und Dashboard. Gewählt wurde das Dashboard, weil es den ungenutzten Subjects-Index erschließt, die Frage „Worüber wurde geschrieben“ beantwortet, sich ins Filtersystem fügt und keine Performanceprobleme großer Graphen hat.
- Belege: `c666fe3`

### 2025-11-26 (Phase 6: Brief-Details und Timeline-Verbesserung)

- Geändert: Brief-Detail-Modal mit Erwähnungen und Normdaten-Links (US-13), eine Timeline, die gefilterte gegen ungefilterte Briefe zeigt, und ein erstes Dokument der User Stories.
- Belege: `e376860`

### 2025-11-26 (Phase 5: Erweiterte Features)

- Entschieden: Entscheidung E11, der Filterzustand steht in der URL, damit gefilterte Ansichten sich bookmarken und teilen lassen und die Zurück-Funktion arbeitet. `history.replaceState` statt `pushState`, damit die Browser-History nicht überläuft.
- Geändert: Personenfilter und Timeline mit Gruppierung nach Dekaden bei langen Zeitspannen.
- Belege: `6337d95`

### 2025-11-26 (Feature-Komplett)

- Entschieden: Entscheidung E10, ein hybrides Speichermodell. Große Datensätze wie das HSA laden per URL-Parameter als vorprozessiertes JSON, weil sessionStorage bei etwa 5 MB endet. Kleinere Uploads nutzen sessionStorage und melden eine Quotenüberschreitung.
- Geändert: Phasen 1 bis 4 mit CMIF-Parser, Upload, Karte, Listen, Timeline, Filtern und Export.
- Belege: `6a52268`, `31d4c86`

### 2025-11-26 (Projektvision)

- Entschieden: CorrespExplorer wird ein generischer Explorer für beliebige CMIF-Dateien. Entscheidung E9, CMIF wird im Browser geparst statt serverseitig vorverarbeitet, weil kein Backend nötig ist, Nutzer die Kontrolle über ihre Daten behalten, die Visualisierung sofort folgt und DOMParser für typische CMIF-Größen reicht. Für sehr große Dateien bleibt die Python-Pipeline.
- Belege: `6a52268`, `7a87099`

### 2025-11-26 (HSA-Implementation)

- Entschieden: Das Hugo Schuchardt Archiv dient als Referenzimplementierung. Eine Python-Vorverarbeitung erzeugt das Briefe-JSON und löst GeoNames-IDs über Wikidata SPARQL zu Koordinaten auf. Die Karte clustert Orte mit MapLibre GL JS.
- Geändert: Kennzahlen und Vokabulare des HSA in [data.md](data.md#hugo-schuchardt-archiv).
- Belege: `25037b4`, `593e972`, `1d51c1d`

### 2025-11-26 (Architektur-Entscheidungen E1 bis E4)

- Entschieden: E1, CMIF ist Austauschformat, weil es ein TEI-basierter Standard ist, correspSearch es nutzt, viele Editionsprojekte es liefern und es Sender, Empfänger, Datum und Ort klar strukturiert. E2, das Tool ist normdaten-agnostisch und parst und normalisiert VIAF-, GND-, GeoNames- und Lexvo-URIs. E3, Koordinaten werden über Wikidata SPARQL statt über die GeoNames-API aufgelöst, weil keine API-Keys nötig und Batch-Abfragen möglich sind. E4, das Datenmodell ist briefzentriert, Indizes für Personen, Orte und Themen erlauben sekundäre Sichten.
- Belege: `593e972`, `7a87099`
