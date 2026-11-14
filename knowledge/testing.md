---
title: Testing
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2025-12-03
updated: 2026-11-14
authors: [Christopher Pollin]
template:
  name: Vorlage Testing
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-testing
related: [architecture, data, uncertainty-specification, plan]
---

# Testing

Die Prüfung hat vier Ebenen. Der Browser-Test-Runner (`docs/test.html`) prüft Produktionscode ohne externe Abhängigkeiten an kleinen CMIF-Fixture-Dateien. Der Browser-Smoke-Test prüft, was nur ein Browser zeigt. `verification/check-corpus.mjs` prüft den Parser an Beständen, die nicht im Repository liegen dürfen. Agenten mit Browserzugang prüfen die Oberfläche an Forschungsaufgaben. Eine automatisierte E2E-Suite und eine CI gibt es nicht, geplante Erweiterungen stehen in [plan.md](plan.md).

## Grundsätze

Der Test-Runner prüft die CMIF-Verarbeitung mit Unsicherheitserkennung, die Indizes des Parsers und Zählungen aus den Briefen, die Formatierung mit Unsicherheitsanzeige, Filter und URL-State, Forschungspfade, Korb, Export, Sicherheit und Caching. Er prüft nicht das visuelle Rendering (D3, MapLibre), nicht exportierte Aggregationen in `explore.js` wie `aggregateLettersByPlace()` und keine externen Dienste (Wikidata, correspSearch). Vom Netzwerk prüft die Suite Demo die Standardschwelle und die Kanten des Briefwechsels über die exportierten Builder. Was der Runner nicht abdeckt, prüfen der [Browser-Smoke-Test](#browser-smoke-test) und die Prüfungen im Browser. Grüne Tests schließen Fehler der Oberfläche nicht aus, das zeigten die Prüfungen vom 2026-10-29.

Tests verwenden keine Mock-Daten.

- Tests laden echte CMIF-XML-Dateien aus `docs/data/` über die Produktionsfunktion `parseCMIF`. Die Fixtures sind `test-uncertainty.xml` für Unsicherheitsfälle, `test-hostile.xml` für feindliche Eingaben, `test-letter-records.xml` und `test-letter-records-b.xml` für TEI mit einem Eintrag je Brief und `demo-showcase.xml` für Erwähnungen und das Netzwerk. Die Suite correspSearch liest zwei unverändert gespeicherte Antworten der API (`test-correspsearch.json`, `test-correspsearch-empty.json`).
- Ein neuer Fall wird als Brief in eine solche Fixture-Datei aufgenommen. Inline-Arrays mit Brief-Objekten umgehen den Parser und sind ausgeschlossen.
- Wo ein Test die Indexform der Vorprozessierung braucht, lädt er die gebündelte Datei `docs/data/hsa-letters.json` unverändert, derzeit in den Suites Research Paths und Aggregation. Nachgebaute Kopien bleiben ausgeschlossen (Entscheidung des Operators vom 2026-10-30, Regel in `CLAUDE.md`). Die CMIF-Datei `hsa.xml` wird nicht geparst.
- Tests importieren die echten Funktionen aus den Produktionsmodulen und duplizieren keine Helfer. Schlägt ein Test fehl, liegt es an echtem Code mit echten Daten.

## Test-Runner und Suites

Die in `docs/js/tests/run-all-tests.js` registrierten Suites sind die Quelle der Wahrheit, `docs/js/tests/CONTEXT-MAP.md` beschreibt, was jede prüft, und das Format einer Suite. Anzahl und Ergebnis zeigt `test.html` beim Lauf. Eine Coverage-Messung ist nicht eingerichtet.

Bei laufendem `python -m http.server 8000 --directory docs` startet `http://localhost:8000/test.html` den Lauf mit der Schaltfläche „Run“, `test.html?test=true` betätigt sie beim Laden einmal. `test.html` besitzt den einzigen Auslöser, `run-all-tests.js` startet keinen eigenen Lauf, weil zwei gleichzeitige Läufe sich den state-manager teilten. Alle Suites müssen vor jedem Commit grün sein.

- Eine neue Suite ist eine Datei `docs/js/tests/test-<modul>.js`, die ein Suite-Objekt exportiert. Sie wird in `run-all-tests.js` importiert und in die Liste `suites` aufgenommen.
- Alle Suites prüfen mit `assert(condition, message)` aus `test-runner.js`, definieren keine eigene Fassung und geben eine Meldung mit, die den erwarteten und den gefundenen Wert nennt.
- `teardown()` läuft auch nach einem fehlgeschlagenen Test (`finally` in `test-runner.js`), damit eine Suite keinen Zustand an die nächste oder an den Browser-Speicher der Testenden weitergibt. Eine Suite, die in localStorage schreibt, sichert den vorigen Wert im Setup und schreibt ihn im Teardown zurück (Suite Basket).

## Browser-Smoke-Test

`tests/browser/smoke.py` prüft im Browser, was der Test-Runner nicht sieht (Entscheidung E9 vom 2026-11-05). Das Skript startet einen lokalen Server auf `docs/`, steuert Chrome headless über Playwright und meldet je Prüfung eine Zeile, der Exit-Code ist nur bei vollständigem Erfolg 0. Erwartete Zahlen liest es aus den gebündelten Daten. Die Liste der Prüfungen steht in `_checks()`. Sie umfasst den Test-Runner, alle Ansichten mit dem HSA ohne Konsolen- und Seitenfehler, den Demo-Link mit nicht leerem Netzwerk, die Tour, den Hinweis bei fehlendem Datensatz, Zurück zur vorigen Ansicht, einen geteilten Filterlink, CSV- und JSON-Export, die Person im Korb, den Balken „Spanne“ und den Link der Karte zur Ortsliste, die Seitenstruktur, das ruhende Netzwerk unter reduzierter Bewegung und Entscheidung E8.

```bash
uv run tests/browser/smoke.py --online --axe path/to/axe.min.js
```

`--online` prüft zusätzlich einen geteilten correspSearch-Link gegen die API, `--axe <Pfad zu axe.min.js>` führt axe-core über die Seiten und über einen aktiven Wissenspfad bei 390px. Die Ladezeitgrenze des HSA liegt bei 5 Sekunden (`--load-limit`). Sie fängt einen Rückschritt um eine Größenordnung und bleibt bewusst unempfindlich gegen das Rauschen des Rechners. Eigene Performance-Tests mit festen Grenzen gibt es deshalb nicht (Entscheidung E10 vom 2026-11-05).

## Prüfung an einem Bestand außerhalb des Repositorys

`verification/check-corpus.mjs` lässt den Parser über einen Ordner mit TEI- oder CMIF-Dateien laufen und vergleicht jeden Eintrag mit seiner Quelldatei. Jeder `correspDesc` wird ein Eintrag, IDs sind eindeutig und keine Positions-IDs, kein Poststempel und keine Anschrift steht als Absendeort, jede als ergänzt ausgezeichnete Angabe ist als erschlossen markiert, jeder Empfänger und jede Adresszeile bleibt erhalten, kein interner Verweis gilt als identifiziert. Danach prüft es den zusammengeführten Bestand. Jeder Eintrag gehört zu genau einem Brief, zusammengeführte Einträge teilen eine Signatur ohne widersprechende Datierung, kein unplausibles Jahr steht auf der Zeitachse, der Personenindex zählt jeden Empfänger. Am Ende gibt es die Kennzahlen des Laufs als Momentaufnahme aus.

```bash
node verification/check-corpus.mjs <Pfad zu jsdom> <Ordner mit XML-Dateien>
```

Das Skript braucht `jsdom` aus einer vorhandenen Installation, weil das Repository keine Node-Abhängigkeiten führt. Es ist der Beleg für Bestände, deren Daten nicht gebündelt werden dürfen ([data.md](data.md#stefan-zweig-digital-tei-auf-briefebene-kein-cmif)). Die Fälle selbst stehen als synthetische Briefe in `test-letter-records.xml` und `test-letter-records-b.xml` und laufen im Test-Runner.

## Aufgabenprüfung durch Browser-Agenten

In der Iteration vom November 2026 prüften Agenten mit Browserzugang die Oberfläche an Forschungsaufgaben, getrennt von den Agenten, die bauten. Jeder Prüfer erhielt Ansichten, konkrete Aufgaben mit prüfbarer Antwort (etwa die Briefe zwischen zwei Korrespondenten, alle Briefe mit erschlossenem Ort, der dichteste Monat), den Maßstab aus `UI-Praxis für agentisch erzeugte Frontends` mit seiner Strukturmessung und keinen Hinweis auf die Einschätzung der Bauenden. Die erste Runde maß den Ausgangszustand, die zweite urteilte Befund für Befund, ob er behoben ist. Die koordinierende Session prüfte Datenbefunde der Prüfer an den Quelldateien, bevor sie darauf baute. Ein Prüferbericht ist eine Beobachtung. Die Beurteilung am Bildschirm und die Abnahme liegen beim Operator.

## Browser-Prüfung der Ansichten

Vor dem Smoke-Test prüften Durchläufe mit Python-Playwright außerhalb des Repositorys die Ansichten. Die Protokolle vom 2026-10-29 sind Momentaufnahmen, Befunde und Behebungen stehen im [Journal](journal.md).

Der erste Durchlauf deckte ab:

- Laden von `explore.html?json=data/hsa-letters.json` und Upload von `demo-showcase.xml`, `test-uncertainty.xml` und `test-hostile.xml` über die Startseite
- jede der zwölf Ansichten mit Prüfung auf Konsolen- und Seitenfehler
- Bedienelemente der Karte, Personen-Dialog mit Escape und Fokusrückgabe, Aufklappen eines Briefs per Enter, Ortsfilter für einen Ort ohne GeoNames-ID, aktivster Tag der Heatmap
- Wissenspfad starten, alle Forschungspfade anzeigen, Briefe in den Korb legen und auf `wissenskorb.html` wiederfinden
- Breite 390px je Ansicht (kein horizontaler Seitenüberlauf, breite Grafiken scrollen im eigenen Container) und der Filter-Schalter der Sidebar
- alle Seiten ohne Zugriff auf externe Hosts außer der Grundkarte, dazu die Karte ohne Grundkarte
- die damalige Viewer-Seite `vault.html` mit Links zwischen den Wissensdokumenten
- Laden einer correspSearch-API-URL gegen den Live-Dienst mit einer Datumsabfrage

Externe Dienste mit Personenbezug (Wikidata) wurden im Durchlauf blockiert.

Ein zweiter Durchlauf am selben Tag prüfte die Behebung der Befunde 9 bis 11 mit denselben Mitteln:

- Tutorial-Datensatz über die Startseite, Genf (2660646) liegt bei 46,20 N 6,15 O
- Personen-Dialog ohne Anfrage an Wikidata beim Öffnen, mit der Schaltfläche „Lebensdaten von Wikidata laden“. Eine verzögerte Antwort für eine zuvor geöffnete Person erscheint nicht im Dialog der nächsten, der Fokus bleibt im Dialog, Escape schließt
- Zeitleiste des HSA mit sichtbarem, per Enter bedienbarem Balken der undatierten Briefe, der zu den undatierten Briefen mit `undated=1` in der URL führt und ein Neuladen übersteht. Ein `_total`-Segment lässt die Sprachauswahl stehen
- alle Sprachen abgewählt ergibt „Keine Briefe gefunden“ und `langs=` in der URL, `yearMin`, `yearMax` und `langs` aus der URL stehen nach dem Laden in Regler und Checkboxen
- Korb und Wissenspfad nach Wechsel zum Tutorial-Datensatz leer, nach Rückkehr zum HSA wieder da, Toast mit Hinweis auf die Korbgrenze
- Korbseite mit nur Briefen, nur einem Ort und nur einer Person, deren Kennzahlen, Zeitleiste, Karte und Netzwerk die Briefmenge des Korbs zeigen (alle drei Fälle durch einen Subagenten, der Korb aus Briefen und der Korb mit Graz zusätzlich im Hauptlauf, Graz mit 2.371 Briefen wie in data.md)
- alle zwölf Ansichten mit HSA und Tutorial-Datensatz ohne Seitenfehler, „Ladinisch“ in Sprachfilter und Legende der Zeitleiste, neutrale Qualitäts-Chips, Startansicht bei 390px ohne horizontalen Überlauf

Ein dritter Durchgang am selben Tag war eine Prüfung in drei Schritten. Fünf Subagenten prüften getrennt nach Gebieten, vier weitere behoben die Befunde, eine unabhängige Durchsicht prüfte die Änderungen. Die verbliebenen offenen Punkte stehen in [plan.md](plan.md#vorhaben).

- Funktion des Explorers mit Playwright-Skripten gegen HSA und Tutorial-Datensatz für Filter, URL-State, Dialoge, Ansichten, Wissenspfad und Export
- Seiten, Korb, Toasts und Sicherheit mit Startseite und ihren Upload- und URL-Wegen, Korbseite, Teilen per Link, Synchronisation zwischen Tabs, `vault.html`, `about.html`, `test.html`, feindlichen Eingaben und `?json=`-Pfaden. correspsearch.net und OpenFreeMap waren aus der Prüfumgebung nicht erreichbar
- Barrierefreiheit nach WCAG 2.2 AA mit axe-core 4.14.0 auf allen Seiten, dazu Tastaturbedienung, Fokus, Kontraste, Zielgrößen und Umbruch bei 320px von Hand
- Gestaltung und Responsivität mit Screenshots der Seiten bei mehreren Breiten, undefinierten Tokens, Schatten, Breakpoints und ungenutztem CSS
- Code und Dokumentation mit ESLint und ruff, ungenutzten Exporten, doppelter Logik und Widersprüchen zwischen Code und Wissensdokumenten
