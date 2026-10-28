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
updated: 2026-10-28
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
