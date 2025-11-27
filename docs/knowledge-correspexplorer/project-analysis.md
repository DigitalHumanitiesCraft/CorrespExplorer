# Projektanalyse: CorrespExplorer

Konstruktive Analyse des CorrespExplorer-Projekts mit Bewertung von Architektur, Code-Qualitaet, Dokumentation und Erweiterungspotenzial.

Stand: 2025-11-27

---

## 1. Projektuebersicht

CorrespExplorer ist ein browserbasiertes Visualisierungstool fuer Korrespondenz-Metadaten im CMIF-Format (Correspondence Metadata Interchange Format). Das Projekt richtet sich an Forschende der Digital Humanities, insbesondere der Geschichts- und Literaturwissenschaft.

### Kerndaten

| Aspekt | Wert |
|--------|------|
| Codeumfang | 8.319 Zeilen JavaScript, 942 Zeilen Python |
| Stylesheets | 140 KB ueber 8 CSS-Dateien |
| Seiten | 4 HTML-Hauptseiten |
| User Stories | 27 implementiert, 0 offen |
| Referenzdatensatz | 11.576 Briefe, 846 Korrespondenten (HSA) |

### Hauptfunktionen

- Import von CMIF-XML via Drag-and-Drop, URL oder correspSearch API
- 7 interaktive Visualisierungsansichten (Karte, Personen, Briefe, Timeline, Themen, Orte, Netzwerk)
- Mehrdimensionale Filterung (Zeit, Sprache, Person, Thema, Ort)
- Wikidata-Anreicherung fuer biografische Daten
- Export als CSV oder JSON
- Wissenskorb zur Sammlung relevanter Elemente
- Datensatz-Vergleich

---

## 2. Staerken des Projekts

### 2.1 Architektur-Entscheidungen

Die Architektur folgt einem klaren, wartbaren Ansatz:

1. Zero-Build-Prozess: Das Projekt laeuft direkt im Browser ohne Webpack, Babel oder andere Build-Tools. Dies senkt die Einstiegshuerde fuer Beitragende und vereinfacht das Deployment als statische GitHub-Pages-Seite.

2. Modulare ES6-Struktur: Die 12 JavaScript-Module haben klar definierte Verantwortlichkeiten:
   - `cmif-parser.js`: XML-Parsing und Datenextraktion
   - `explore.js`: Visualisierungslogik
   - `correspsearch-api.js`: API-Integration
   - `wikidata-enrichment.js`: SPARQL-Abfragen

3. Index-basierte Datenstruktur: Die Vorab-Indexierung ermoeglicht O(1)-Lookups fuer Personen, Orte und Themen. Dies ist entscheidend bei 11.576 Briefen.

4. Hybrides Speichermodell: Grosse vorprozessierte Datensaetze werden via URL-Parameter referenziert, kleinere Upload-Daten nutzen sessionStorage. Diese Loesung umgeht elegant das 5MB-Browser-Limit.

### 2.2 Benutzerorientiertes Design

Das UI-Design zeigt durchdachte Entscheidungen:

- Logo-konsistente Farbpalette (Rust-Red #A64B3F) schafft visuelle Identitaet
- Border-basiertes Design ohne Schatten fuer einen klaren, professionellen Look
- Mobile-first responsive Ansatz fuer verschiedene Geraete
- BEM-Namenskonvention sorgt fuer wartbare CSS-Klassen
- Tooltips fuer abgeschnittene Namen verbessern die Benutzerfreundlichkeit

### 2.3 Technische Qualitaet

1. Performance-Optimierungen sind systematisch implementiert:
   - Lazy Rendering (Views werden erst bei Aktivierung gerendert)
   - Debouncing von Filter-Updates (300ms)
   - MapLibre-Clustering fuer grosse Punktmengen
   - Brief-Liste auf 500 Eintraege begrenzt

2. API-Integrationen sind robust umgesetzt:
   - correspSearch API v2.0 mit automatischer Paginierung
   - Wikidata SPARQL mit Session-Cache (7 Tage Gueltigkeit)
   - Authority-ID-Erkennung fuer VIAF, GND, GeoNames

3. Fehlerbehandlung ist nutzerfreundlich:
   - CORS-Fehler werden mit Hinweisen erklaert
   - sessionStorage-Quota-Ueberschreitung zeigt klare Meldung
   - Fehlende Koordinaten werden transparent angezeigt

### 2.4 Dokumentation

Die Dokumentation ist ueberdurchschnittlich umfangreich:

- architecture.md: Systemuebersicht mit ASCII-Diagrammen, API-Signaturen, Datenmodell
- user-stories.md: 27 User Stories mit Akzeptanzkriterien im Format "Als Nutzer moechte ich..."
- design.md: Farbpalette, Typografie, Designprinzipien
- JOURNAL.md: 15 Entwicklungsphasen chronologisch dokumentiert
- CMIF-Data.md: Technische CMIF-Spezifikation

Die Code-Kommentare folgen dem Prinzip "Erklaere warum, nicht was".

---

## 3. Verbesserungspotenzial

### 3.1 Test-Infrastruktur

Aktueller Stand: Tests existieren in `explore-tests.js`, sind aber manuell ueber `?test=true` ausfuehrbar.

Empfehlungen:
- Integration eines Test-Frameworks (Vitest oder Jest mit jsdom)
- Automatische Tests via GitHub Actions
- Coverage-Report zur Identifikation untesteter Codepfade
- End-to-End-Tests mit Playwright fuer kritische User Flows

Prioritaet: Mittel. Die aktuelle Test-Loesung funktioniert, skaliert aber nicht.

### 3.2 Accessibility

Das Projekt hat grundlegende ARIA-Labels, aber Verbesserungen sind moeglich:

- Keyboard-Navigation in allen Views (aktuell teilweise)
- Screen-Reader-Unterstuetzung fuer Karten-Interaktionen
- Farbkontrast-Pruefung (WCAG 2.1 AA)
- Skip-Links zur Navigation
- Focus-Management bei Modal-Dialogen

Prioritaet: Hoch fuer oeffentliche Forschungstools.

### 3.3 Internationalisierung

Aktuell ist die UI-Sprache fix Deutsch. Fuer breitere Nutzung waere hilfreich:

- Sprachdateien (i18n) fuer UI-Texte
- Dynamische Sprachwahl (Deutsch, Englisch als Minimum)
- Datumsformatierung nach Locale

Prioritaet: Mittel bis Hoch, abhaengig von der Zielgruppe.

### 3.4 Offline-Faehigkeit

Als browserbasiertes Tool waere Offline-Unterstuetzung wertvoll:

- Service Worker fuer Asset-Caching
- IndexedDB statt sessionStorage fuer groessere Datensaetze
- Progressive Web App (PWA) Manifest

Prioritaet: Niedrig. Die meisten Nutzer haben Internetzugang.

### 3.5 Code-Organisation

Einige Module sind umfangreich geworden:

| Modul | Zeilen | Empfehlung |
|-------|--------|------------|
| explore.js | 3.555 | Aufteilen in view-spezifische Module |
| cmif-parser.js | 520 | Akzeptable Groesse |
| upload.js | 565 | Akzeptable Groesse |

Die Aufteilung von `explore.js` in `map-view.js`, `persons-view.js`, `letters-view.js` etc. wuerde die Wartbarkeit verbessern.

Prioritaet: Niedrig bis Mittel. Funktioniert aktuell, wird aber bei Erweiterungen komplexer.

---

## 4. Feature-Empfehlungen

### 4.1 Kurzfristig umsetzbar

1. Datierungsunsicherheit visualisieren
   - CMIF unterstuetzt `cert="low"` und `notBefore/notAfter`
   - Visuelle Markierung (z.B. "ca." oder Fragezeichen) wuerde Forschenden helfen
   - Aufwand: Gering (Parser-Erweiterung und CSS)

2. Batch-Export erweitern
   - Aktuell: CSV mit Grunddaten
   - Erweiterung: Vollstaendige Metadaten inkl. mentions
   - TEI-XML-Export fuer Weiterverarbeitung
   - Aufwand: Gering

3. URL-Sharing fuer Wissenskorb
   - Basket-Items als URL-Parameter kodieren
   - Ermoeglicht Teilen von kuratierten Sammlungen
   - Aufwand: Gering (teilweise implementiert)

### 4.2 Mittelfristig sinnvoll

1. Vergleichsansicht erweitern
   - Zeitliche Ueberlappung zweier Datensaetze visualisieren
   - Gemeinsame Korrespondenten in Netzwerk-Graph zeigen
   - Aufwand: Mittel

2. Statistik-Dashboard
   - Aggregierte Metriken: Briefe pro Jahr, aktivste Korrespondenten
   - Export-faehige Tabellen und Charts
   - Aufwand: Mittel

3. Annotations-System
   - Nutzer koennen Notizen zu Briefen speichern
   - localStorage-basiert oder optionaler Backend-Sync
   - Aufwand: Mittel bis Hoch

### 4.3 Langfristige Vision

1. Mehrsprachige correspSearch-Integration
   - Direkte Suche nach Personen statt GND-URI-Eingabe
   - Autocomplete fuer Korrespondenten
   - Aufwand: Hoch (API-Abhaengigkeit)

2. Kollaborative Features
   - Geteilte Wissenskoerbe zwischen Nutzern
   - Kommentar-Funktion
   - Aufwand: Hoch (erfordert Backend)

---

## 5. Technische Schulden

Identifizierte technische Schulden sind minimal:

1. Leere Koordinaten-Cache-Datei
   - `geonames_coordinates.json` ist leer, existiert nur zur 404-Vermeidung
   - Keine funktionale Auswirkung

2. Legacy-Code in `components.css`
   - Nach Cleanup in Phase 10 noch 163 Zeilen
   - Weitere Bereinigung moeglich, aber niedriger Aufwand

3. D3.js nicht als externe Abhaengigkeit
   - Wird fuer Netzwerk-View verwendet, aber in `wissenskorb.js` manuell eingebunden
   - Konsolidierung zu CDN-Import empfohlen

Gesamtbewertung: Das Projekt hat sehr wenig technische Schulden.

---

## 6. Fazit

CorrespExplorer ist ein ausgereiftes, gut strukturiertes Projekt, das seinen Zweck als CMIF-Visualisierungstool erfuellt. Die Entwicklung ueber 15 Phasen zeigt systematisches Vorgehen und klare Priorisierung.

### Besondere Staerken

- Vollstaendig browserbasiert ohne Build-Prozess
- Umfassende Dokumentation auf Architektur- und Nutzerebene
- Alle 27 User Stories implementiert
- Performante Handhabung grosser Datensaetze (11.576 Briefe)
- Integration externer APIs (Wikidata, correspSearch)

### Empfohlene naechste Schritte

1. Test-Automatisierung einfuehren (CI/CD Pipeline)
2. Accessibility-Audit durchfuehren und beheben
3. explore.js in kleinere Module aufteilen
4. Datierungsunsicherheit visualisieren (Quick Win)
5. Internationalisierung planen (wenn breitere Zielgruppe)

Das Projekt demonstriert erfolgreich, wie ein Forschungstool mit modernen Web-Technologien ohne Backend-Komplexitaet realisiert werden kann. Die Promptotyping-Methodik hat zu einer gut dokumentierten, wartbaren Codebasis gefuehrt.

---

## 7. Identifizierte Widersprueche

### 7.1 Farbdefinitionen

| Widerspruch | Quelle 1 | Quelle 2 |
|-------------|----------|----------|
| Primary Color | `explore.js:53` definiert `PRIMARY_COLOR = '#C65D3B'` | `tokens.css:14` definiert `--color-primary: #A64B3F` |
| Success Color | `design.md` definiert `#38A169` | `tokens.css:29` definiert `#2d6a4f` |
| Network Both | `design.md` definiert `#805AD5` (lila) | `tokens.css:37` definiert `--color-role-both: #2d6a4f` (gruen) |

Belege:
- explore.js Zeile 53: `const PRIMARY_COLOR = '#C65D3B';`
- tokens.css Zeile 14: `--color-primary: #A64B3F;`
- design.md Section 2: `Network Both: #805AD5`
- tokens.css Zeile 37: `--color-role-both: #2d6a4f;`

### 7.2 Spacing-Skala

| Variable | design.md | tokens.css |
|----------|-----------|------------|
| --space-md | 1rem (16px) | 12px |

Belege:
- design.md Section 4: `--space-md: 1rem; /* 16px */`
- tokens.css Zeile 100: `--space-md: 12px;`

### 7.3 Font-Stack

| Aspekt | design.md | tokens.css |
|--------|-----------|------------|
| Sans Font | `'Inter', -apple-system...` | `'Lato', 'Inter'...` |
| Headings Font | nicht spezifiziert | `'Merriweather', Georgia, serif` |
| Mono Font | `'JetBrains Mono', 'Fira Code'...` | nicht definiert |

Belege:
- design.md Section 3: `--font-sans: 'Inter'...` und `--font-mono: 'JetBrains Mono'...`
- tokens.css Zeile 68-69: definiert `--font-headings` und `--font-base`, aber kein `--font-mono`

### 7.4 Sidebar-Breite

| Quelle | Wert |
|--------|------|
| tokens.css | 380px |
| design.md (>= 768px) | 280px |
| design.md (>= 1280px) | 320px |
| wissenskorb.css | 280px (hardcoded) |
| style.css Zeile 577 | 280px (hardcoded) |

Belege:
- tokens.css Zeile 112: `--sidebar-width: 380px;`
- design.md Section 7: "280px Fixed" / "320px Fixed"
- wissenskorb.css Zeile 49: `width: 280px;`
- style.css Zeile 577, 713: hardcodierte 280px Werte

### 7.5 Breakpoints

| Breakpoint | design.md | tokens.css |
|------------|-----------|------------|
| sm | 640px | 480px |

Belege:
- design.md Section 7: `@media (min-width: 640px) { /* sm */ }`
- tokens.css Zeile 122: `--breakpoint-sm: 480px;`

### 7.6 Views-Konstante

constants.js definiert 6 Views:
```javascript
export const VIEWS = {
    MAP: 'map',
    PERSONS: 'persons',
    LETTERS: 'letters',
    TIMELINE: 'timeline',
    TOPICS: 'topics',
    PLACES: 'places'
};
```

Fehlt: NETWORK (obwohl in explore.html, explore.js und architecture.md als 7. View dokumentiert)

Belege:
- constants.js Zeile 72-79: nur 6 Views
- architecture.md Zeile 62-69: listet 7 Views inkl. "Netzwerk"
- explore.html Zeile 59: `<button class="view-btn" data-view="network">`

### 7.7 Veraltete Dokumentation

README.md listet in der Dateistruktur:
```
docs/knowledge-correspexplorer/
  refactoring-plan.md - Code improvement plan
```

Diese Datei existiert nicht mehr (wurde in Phase 14 geloescht).

Beleg:
- JOURNAL.md Phase 14: "Geloescht: refactoring-plan.md (veraltet, nie umgesetzt)"
- Glob-Suche `**/refactoring-plan.md`: "No files found"

### 7.8 Bewertung der Widersprueche

| Kategorie | Schweregrad | Auswirkung |
|-----------|-------------|------------|
| Farb-Inkonsistenz | Mittel | Visuelle Abweichungen zwischen Komponenten |
| Spacing-Unterschied | Niedrig | 4px Differenz meist nicht sichtbar |
| Font-Stack | Niedrig | Fallback-Fonts greifen |
| Sidebar-Breite | Mittel | Inkonsistentes Layout auf verschiedenen Seiten |
| Fehlende NETWORK-Konstante | Niedrig | Code funktioniert, String-Literal verwendet |
| Veraltete README | Niedrig | Irreführend fuer Entwickler |

Empfohlene Priorisierung:
1. PRIMARY_COLOR in explore.js an tokens.css angleichen
2. Sidebar-Breite konsolidieren (CSS-Variable konsistent nutzen)
3. VIEWS-Konstante um NETWORK ergaenzen
4. README.md Dateistruktur aktualisieren
5. design.md mit tokens.css synchronisieren

---

## Anhang: Projektmetriken

### Codeverteilung

```
JavaScript Module:
  explore.js          3.555 Zeilen (42.7%)
  cmif-parser.js        520 Zeilen (6.3%)
  upload.js             565 Zeilen (6.8%)
  correspsearch-api.js  561 Zeilen (6.7%)
  wissenskorb.js        496 Zeilen (6.0%)
  basket-ui.js          476 Zeilen (5.7%)
  wikidata-enrichment.js 372 Zeilen (4.5%)
  basket.js             365 Zeilen (4.4%)
  compare.js            566 Zeilen (6.8%)
  enrichment.js         286 Zeilen (3.4%)
  utils.js              183 Zeilen (2.2%)
  constants.js           79 Zeilen (0.9%)
  explore-tests.js      496 Zeilen (6.0%)
  ---
  Gesamt              8.520 Zeilen
```

### Abhaengigkeiten (CDN)

- MapLibre GL JS 4.7.1: Kartenvisualisierung
- noUiSlider 15.7.1: Zeitraum-Slider
- Font Awesome 6.4.0: Icons

### Browser-Kompatibilitaet

- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+
