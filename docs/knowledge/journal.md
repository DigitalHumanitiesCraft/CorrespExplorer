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
updated: 2026-10-30
authors: [Christopher Pollin]
template:
  name: Vorlage Journal
  version: 0.6
  url: https://dhcraft.org/Promptotyping/promptotyping-document/journal
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-journal
related: [project, specification, plan, handoff]
---

# Journal: CorrespExplorer

## Einträge

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
- Korrigiert: Mehrere Stories in [specification.md](specification.md) beschrieben Funktionen, die es nicht gibt (US-05, US-11, US-22, US-27), die Lücken stehen jetzt in [plan.md](plan.md#lücken-der-stories). [uncertainty-specification.md](uncertainty-specification.md) nannte veraltete HSA-Kennzahlen, Anzeigeformate und Exportspalten. [testing.md](testing.md) führte Netzwerk-Aggregation und `aggregateLettersByPlace` als getestet. `about.html` beschrieb den Erwähnungsfluss als Themendiagramm und die Kacheln als OpenStreetMap, [project.md](project.md) nannte CDNs statt `docs/vendor/`.
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
- Geändert: [data.md](data.md#rechte-und-lizenzen) mit Lizenztabelle und drei offenen Rechtsfragen, [plan.md](plan.md#8-correspsearch-api-urls-liefern-keine-briefe), [architecture.md](architecture.md), `docs/js/tests/CONTEXT-MAP.md`.
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
