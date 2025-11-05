# Quick Wins – Umsetzungsreifes Synthese-Dokument

*Stand: 04.11.2025*

## Zweck

Kompakte, neutrale Leitlinie zur Umsetzung sofort wirksamer Frontend-Features für die HerData-Site. Fokus: sichtbarer Nutzen, geringes Risiko, keine Server-Abhängigkeiten (einzige optionale Ausnahme: Pipeline-Erweiterung für Namensvarianten).

Dieses Dokument spezifiziert WIE Features umgesetzt werden. Für fachliche Anforderungen (WAS das System leisten soll) siehe [requirements.md](requirements.md).

## Rahmen & Annahmen

* **Datenquelle:** `persons.json` (Personen, Orte, Berufe, Basisbiografien, Rollen).
* **Plattform:** Statische Website, clientseitige Funktionen.
* **Nicht-Ziele:** TypeScript-Migration, automatisierte Tests, vollständige Integration von Beziehungen/Briefen.

---

## Begriffe & Datenfelder (fixiert)

* **Name:** Anzeigename einer Person.
* **GND:** Normdaten-Identifier; kann fehlen.
* **Geburt / Tod:** Jahresspezifische Angaben; können fehlen.
* **Biografie:** Kurztext; kann fehlen.
* **Orte:** Liste benannter Orte (Anzeige-String).
* **Berufe:** Liste benannter Berufe (Anzeige-String).
* **Rolle:** Briefbezug (z. B. *sender*, *mentioned*, *both*, *indirect*).
* **Namensvarianten (optional):** Zusätzliche Schreibweisen; Quelle: `ra_ndb_main.xml`.

**Konventionen:** Keine künstliche Ableitung fehlender Werte; leere Felder werden als „nicht vorhanden“ behandelt.

---

## Cross-Cutting Regeln

* **Format/I18N:**

  * Datumsdarstellung in UI und Dateinamen: `JJJJ-MM-TT`.
  * CSV: UTF-8, Feldtrennzeichen Komma, Zellen bei Bedarf gequotet, Zeilentrenner `\n`.
  * Zahlenformate wie in Datenquelle vorliegend; keine Umformatierung.
* **Zugänglichkeit (leichtgewichtig):** Alle interaktiven Elemente sind per Tastatur erreichbar, haben sprechende Labels/Aria-Attribute und sichtbaren Fokus.
* **Fallbacks:** Fehlt ein Feld, wird kein Platzhalter erfunden; UI zeigt den nächst sinnvolleren Kontext (z. B. „Keine Berufsangabe“).
* **Fehlerdarstellung:** Kurze, nicht-technische Meldungen im Kontext der Aktion; kein technischer Stacktrace in der UI.
* **Lizenz/Quellenhinweise:** Bei Exporten (CSV) kurzer Herkunfts- und Lizenzhinweis in Metadaten.
* **Änderungsmanagement:** Jede Änderung erhält eine einzeilige Notiz im Changelog (siehe unten) und kann ohne Seiteneffekte zurückgerollt werden.

---

## Feature-Übersicht & Priorisierung

1. **CSV-Export gefilterter Personen**
2. **Statistik-Dashboard (Aggregat-Sichten)**
3. **Namensvarianten in JSON integrieren (optional, Pipeline)**
4. **Volltextsuche (fuzzy) über Name/Biografie/Berufe/Orte**

> **Hinweis zu Abhängigkeiten:** Volltextsuche profitiert stark von **Namensvarianten**. Wenn Varianten früh vorliegen, ist eine Vorziehung der Suche sinnvoll.

---

## Feature-Karten (umsetzungsreif, ohne Code)

### 1) CSV-Export gefilterter Personen

* **Ziel:** Aktuelle Filterergebnisse als CSV herunterladen.
* **UX-Platzierung:** Button in der Filter-Sidebar unterhalb der Reset-Funktion.
* **Definition of Ready:**

  * Filterzustand ist über eine zentrale Quelle abrufbar.
  * Feldreihenfolge und Spaltennamen sind festgelegt und dokumentiert.
* **Definition of Done:**

  * Export enthält ausschließlich die aktuell gefilterten Personen.
  * UTF-8-CSV, korrekt gequotet; Dateiname mit heutigem Datum.
  * Leere Felder werden leer exportiert (keine Platzhaltertexte).
* **Fallbacks:** Bei leerem Ergebnis wird ein leerer CSV-Header angeboten und eine kurze UI-Info angezeigt.
* **Manueller Test (Prosa):** Filter setzen → Export auslösen → Datei öffnen → Stichprobe mit UI-Liste abgleichen → Feldreihenfolge prüfen.

---

### 2) Statistik-Dashboard (Aggregat-Sichten)

* **Ziel:** Überblick über Muster (Top-Berufe, Ortskonzentrationen, Geburts-Dekaden, Rollen).
* **UX-Platzierung:** Registerreiter „Statistik“ neben Karte/Zeit/Netz.
* **Definition of Ready:**

  * Aggregationsregeln sind beschrieben (z. B. „Berufe werden nach Anzeigename aggregiert“).
  * Top-N-Darstellungen sind textlich begründet (Platz, Lesbarkeit).
* **Definition of Done:**

  * Vier kompakte Kacheln (Berufe, Orte, Zeit, Rollen) mit klaren Achsenbeschriftungen.
  * Leere/fehlende Daten werden ignoriert, ohne die Charts zu verzerren.
* **Fallbacks:** Bei zu wenigen Daten erscheint ein kurzer Hinweis statt leerer Grafik.
* **Manueller Test:** Stichproben aus `persons.json` per Hand mitzählen → mit Chart-Werten vergleichen → Beschriftungen/Legende prüfen.

---

### 3) Namensvarianten in JSON integrieren (Pipeline, optional)

* **Ziel:** Such-/Findability-Verbesserung durch zusätzliche Schreibweisen.
* **Ablauf (inhaltlich):** Varianten aus `ra_ndb_main.xml` pro Person extrahieren, normalisieren, Duplikate/Leereinträge entfernen, in `persons.json` ablegen.
* **Definition of Ready:**

  * Mapping von Personen-ID ↔ Varianten ist geklärt.
  * Regeln zur Normalisierung (Trim, Dedupe) sind dokumentiert.
* **Definition of Done:**

  * Varianten sind pro Person als Liste verfügbar.
  * Keine Duplikate, keine leeren Strings, Quelle ist nachvollziehbar.
* **Fallbacks:** Fehlen Varianten, bleibt das Feld aus; keine Platzhalter.
* **Manueller Test:** Stichprobe in Quelle vs. JSON; Grenzfälle wie alternative Reihenfolge von Vor-/Nachname prüfen.

---

### 4) Volltextsuche (fuzzy)

* **Ziel:** Tippfehler-robuste Suche über Name, Biografie, Berufe, Orte.
* **UX-Platzierung:** Suchfeld prominent in der Sidebar, Auto-Vorschläge unter dem Feld.
* **Definition of Ready:**

  * Zu durchsuchende Felder und ihre Priorität sind fixiert.
  * Verhalten bei kürzeren Eingaben ist definiert (z. B. erst ab zwei Zeichen).
* **Definition of Done:**

  * Relevante Treffer erscheinen zügig; Auswahl springt zur Person/markiert sie.
  * Leere Eingabe setzt auf die Gesamtheit zurück.
* **Fallbacks:** Bei keiner Übereinstimmung kurzer Hinweis statt leerer Liste.
* **Manueller Test:** Absichtlich falsch geschriebene Namen, Berufs- und Ortsbegriffe testen; Trefferqualität stichprobenartig beurteilen.

---

## Abhängigkeiten & Reihenfolge (narrativ)

* **Sofort:** CSV-Export (direkter Nutzen, keine Vorarbeiten).
* **Danach:** Statistik-Dashboard (nutzt gefestigte Felddefinitionen).
* **Optional/ergänzend:** Namensvarianten (verbessern direkt die spätere Suche).
* **Zum Schluss:** Volltextsuche (profitiert maximal von Namensvarianten und stabilem Feldschema).

---

## Governance, Changelog & Rückrollplan

* **Quellen/Lizenzen:** In Exporten und im Dashboard wird die Datenquelle benannt; Lizenz-Textbaustein einmalig definieren und wiederverwenden.
* **Kontakt/Verantwortung:** Eine sichtbare Kontaktzeile für Datenfehler/Anmerkungen.
* **Changelog (Template, pro Änderung eine Zeile):**

  * *[Datum]* – *Komponente* – *Kurzbeschreibung der Änderung* – *Impact auf Daten/UI* – *Fallback/Rollback-Hinweis*.
* **Rollback:** Jede Änderung ist kapselbar (separate Datei/Commit) und kann isoliert rückgängig gemacht werden, ohne andere Features zu beeinträchtigen.

---

## Leichtgewichtiges Testvorgehen (ohne Zahlen, ohne Tools)

* **Plausibilitäts-Checks:** Vergleich einzelner UI-Ausschnitte mit den Rohdaten (Stichproben).
* **Konsistenz-Checks:** CSV-Export vs. Statistik-Sichten vs. Listen/Marker zeigen dieselben Mengen.
* **Zugänglichkeits-Checks:** Tastatur-Navigation durch alle neuen Buttons; Screenreader liest Labels verständlich.
* **Robustheit-Checks:** Verhalten bei leeren Filtern, fehlenden Feldern, sehr langen Namen/Listen.

---

## Daten-Drift & Aktualisierung (Namensvarianten)

* **Regelmäßigkeit:** Varianten werden bei neuen Datenständen gemeinsam mit `persons.json` regeneriert.
* **Qualitätssicherung:** Nach jedem Lauf kurzer Bericht: Anzahl berücksichtigter Personen, Anzahl entfernter Duplikate, Beispiel-Diffs (internes Protokoll).
* **Stabilität:** Keine semantische Uminterpretation; nur Ergänzung/Normalisierung.

---

## Ergebnis

Dieses Dokument liefert eine sofort umsetzbare, team-klare Spezifikation ohne Code und ohne Metriken. Es fixiert Begriffe, UI-Platzierung, Ready/Done, Fallbacks, Abhängigkeiten, Export-/Lizenz-Hinweise sowie einen einfachen Test- und Rollback-Rahmen. Damit können die Quick Wins ohne Rückfragen implementiert und iterativ erweitert werden.
