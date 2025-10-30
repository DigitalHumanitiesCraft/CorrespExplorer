# HerData Development Journal

Chronologische Dokumentation wichtiger Entwicklungsschritte und Entscheidungen.

## 2025-10-29: Netzwerk-Visualisierung implementiert

### Problem: Cluster Hover zeigt keine Verbindungen

Symptom: Beim Hovern über Cluster wurden keine Netzwerk-Verbindungen angezeigt, obwohl die Infrastruktur implementiert war.

Root Cause: MapLibre GL JS hat von Callback-basierter API zu Promise-basierter API gewechselt. Die Callbacks von `getClusterLeaves()` und `getClusterExpansionZoom()` wurden nie ausgeführt.

Debug-Prozess (8 Versuche):
1. setTimeout-Verzögerung (fehlgeschlagen)
2. Integrierter Tooltip-Ansatz (fehlgeschlagen)
3. DOM-Element-Selektion mit querySelector (fehlgeschlagen)
4. API-Existenz-Prüfung (Funktion existiert)
5. Alternative Cluster-API getClusterExpansionZoom (auch kein Callback)
6. Koordinaten-basierte Filterung (zu ungenau)
7. queryRenderedFeatures (Cluster verdeckt Punkte)
8. Web-Recherche: Promise-API entdeckt

Lösung:
```javascript
// Alt (funktioniert nicht)
source.getClusterLeaves(clusterId, pointCount, 0, (error, leaves) => {
    // Callback wird nie aufgerufen
});

// Neu (korrekt)
source.getClusterLeaves(clusterId, pointCount)
    .then(leaves => {
        // Promise wird aufgelöst
    })
    .catch(error => {
        // Fehlerbehandlung
    });
```

### Visualisierungs-Verbesserungen

Hochkontrast-Farben:
- Familie: #ff0066 (Pink/Magenta)
- Beruflich: #00ccff (Cyan/Hellblau)
- Sozial: #ffcc00 (Gelb/Gold)

Linien-Styling:
- Breite: 4-12px (abhängig von Anzahl)
- Glow-Effekt: 8-14px weißer Halo mit blur 4
- Opacity: 0.9 für maximale Sichtbarkeit

Tooltip-Verbesserungen:
- Weißer Text auf dunklem Hintergrund
- Farbige Kategorie-Labels (fett)
- Sofortige Anzeige mit "Verbindungen werden geladen..."
- Update mit kategorisierten Zahlen

### Cluster-Popup: Relation-Indikatoren

Personen mit Relationen werden hervorgehoben:
- Pink linke Border (3px)
- Leicht pink eingefärbter Hintergrund (rgba(255, 0, 102, 0.05))
- Badge mit Verbindungsanzahl (🔗 X)
- CSS-Klasse "has-relations"

### Person-Detail-Seite: Netzwerk-Karte

Neue "Netzwerk-Verbindungen" Sektion:
- Gruppierung nach Kategorie (Familie/Beruflich/Sozial)
- Farbcodierte Überschriften
- Relationstyp (z.B. "HAT NICHTE/NEFFE")
- Klickbare Links zu verwandten Personen
- Lebensdaten der Zielpersonen
- Hover-Effekte mit Border und Slide-Animation
- Wird ausgeblendet wenn keine Relationen vorhanden

### Erkenntnisse: Warum nur Familie-Verbindungen?

Von 6580 SNDB-Relationen sind nur 84 zwischen Frauen:
- HerData zeigt nur Frauen (448 Personen)
- Meiste Relationen verbinden zu Männern (ausgefiltert)
- 6496 Relationen nicht in HerData

Sichtbare Verbindungen nach Kategorie:
- Familie: 50 (beide Personen haben Geodaten)
- Beruflich: 0 (Zielpersonen ohne Koordinaten)
- Sozial: 0 (Zielpersonen ohne Koordinaten)

Historischer Kontext: Im 18./19. Jahrhundert waren familiäre Netzwerke zwischen Frauen häufiger als berufliche oder soziale (die meist über Männer liefen).

### Dokumentation

Neue Dateien:
- `docs/CLUSTER_HOVER_DEBUG.md`: Vollständige Debug-Timeline mit 8 Lösungsversuchen
- `knowledge/network-relations.md`: Umfassende Dokumentation über AGRELON-Relationen, Daten-Pipeline, Statistiken und technische Details

### Technische Entscheidungen

MapLibre Promise API:
- Beide Handler (hover + click) auf Promise umgestellt
- Konsistente Error-Handling mit .catch()
- Keine Race Conditions mehr

Color System:
- Maximal unterschiedliche Farben gewählt
- WCAG-konforme Kontraste
- Einheitlich über Map, Tooltip und Detail-Seite

CSS-Architektur:
- Tokens.css für konsistente Werte
- Modulare Styles in person-cards.css
- Wiederverwendbare Badge-Klassen

### Files Modified

- `docs/index.html`: Legende mit neuen Farben
- `docs/person.html`: Relations-Card hinzugefügt
- `docs/js/app.js`: Promise API für Cluster-Handler
- `docs/js/person.js`: renderRelations() Funktion
- `docs/js/network-utils.js`: Neue Verbindungsfarben
- `docs/css/style.css`: Badge und Highlighting-Styles
- `docs/css/person-cards.css`: Relations-List Styling

### Commits

- `20edaa4`: Fix cluster hover network visualization with MapLibre Promise API
- `0941716`: Add relation indicators and detail view for network connections

### Nächste Schritte

Mögliche Erweiterungen:
1. Brief-Korrespondenz als Relation (Phase 2)
2. Geteilte Orte als implizite Verbindung
3. Zeitliche Überlappungen visualisieren
4. Geodaten für fehlende Personen ergänzen (Julie Kleefeld, Luise von Hessen-Darmstadt)

---

## 2025-10-30: Datenrestrukturierung und Repository-Cleanup

### Datenverzeichnisse umstrukturiert

Problem: Unklare Trennung zwischen neuen und alten Daten, Verzeichnisnamen nicht aussagekräftig.

Lösung:
- `new-data/Datenexport 2025-10-27/` → `data/herdata/` (448 kuratierte Frauen)
- `data/SNDB/` → `data/sndb/` (SNDB-Gesamtdatenbank für Geodaten)

Rationale:
- Klarere Trennung zwischen HerData-Export und SNDB-Referenzdaten
- Lowercase für Konsistenz
- Aussagekräftige Namen ohne "new/old"

### Pipeline-Skripte aktualisiert

Alle betroffenen Skripte angepasst:
- `preprocessing/build_herdata_new.py`: Pfade zu data/herdata/ und data/sndb/
- `preprocessing/integrate_relations.py`: Pfad zu data/sndb/
- `preprocessing/compare_data_sources.py`: Pfad zu data/herdata/
- `preprocessing/list_agrelon_types.py`: Pfad zu data/sndb/
- `README.md`: Dokumentation der neuen Struktur

Pipeline getestet und funktionsfähig.

### SNDB-Zusatzdaten identifiziert

Analyse der SNDB-Projektdateien ergab zusätzliche biografische Quellen:
- `pers_koerp_projekt_goebriefe.xml`: 6790 Registereinträge (150 Frauen aus HerData)
- `pers_koerp_projekt_bug.xml`: 133 Frauen (Briefnetzwerk um Goethe)
- `pers_koerp_projekt_tagebuch.xml`: 21 Frauen (Goethe Tagebuch)
- `pers_koerp_projekt_regestausgabe.xml`: Hauptquelle (bereits integriert)

Diese Daten wurden im Verzeichnis `data/sndb/` behalten für zukünftige Multi-Source Biographies Feature.

### Repository-Cleanup

Entfernte Dateien (7 Dateien, 45 KB):
- `docs/test-network.html`
- `docs/test-network-visual.html`
- `docs/test-relations-data.html`
- `docs/TESTING-NETWORK.md`
- `preprocessing/build_herdata_test.py`
- `preprocessing/compare_output.txt`
- `server.log`

Archivierte Dokumentation:
- `docs/CLUSTER_HOVER_DEBUG.md` → `archive/debug/`
- `knowledge/hover-network-plan.md` → `archive/planning/`

Umbenennung:
- `preprocessing/build_herdata.py` → `preprocessing/build_herdata_legacy.py`

.gitignore erweitert:
```
# Generated files
preprocessing/compare_output.txt
data/analysis-report.md

# Test files
docs/test-*.html
```

### Bug-Fix: Netzwerk-Relationen verschwunden

Problem: Nach Datenrestrukturierung zeigten die Netzwerk-Verbindungen auf der Karte keine Relationen mehr an.

Root Cause: `build_herdata_new.py` generiert persons.json ohne Relationen. Diese werden durch separaten Script `integrate_relations.py` hinzugefügt, der nach der Umstrukturierung nicht neu ausgeführt wurde.

Lösung:
```bash
python preprocessing/integrate_relations.py
```

Ergebnis:
- 67 Personen mit 84 Relationen wiederhergestellt
- 80 Familie, 2 Beruflich, 2 Sozial
- Netzwerk-Visualisierung funktioniert wieder

### Multi-Source Biographies Feature implementiert

Zusätzliche biografische Texte aus SNDB-Projekten integriert.

Implementierung:
- Neues Script `preprocessing/add_biographies.py` erstellt
- Lädt biografische Texte aus 3 SNDB-Projektdateien
- Fügt `biographies` Array zu persons.json hinzu

Datenquellen:
- goebriefe: 150 Frauen (Goethe-Briefe Registereinträge)
- bug: 133 Frauen (Briefnetzwerk um Goethe)
- tagebuch: 20 Frauen (Goethe Tagebuch)

Ergebnis:
- 187 von 448 Frauen haben zusätzliche Biografien (41.7%)
- 303 biografische Texte insgesamt
- Manche Frauen haben mehrere Quellen

Datenstruktur in persons.json:
```json
{
  "id": "1906",
  "name": "Angelica Bellonata Facius",
  "biographies": [
    {
      "source": "goebriefe",
      "text": "Faciius, Angelika Bellonate (1806–1887)..."
    }
  ]
}
```

Metadaten erweitert:
- `with_biographies`: 187
- `biographies_coverage_pct`: 41.7

### Frontend-Integration implementiert

Biografien jetzt im Interface sichtbar.

Änderungen:
- person.html: Neue Sektion "Zusätzliche biografische Quellen"
- person.js: renderAdditionalBiographies() mit Markup-Parsing
- person-cards.css: Styling für Biografien

Features:
- Gruppierung nach Quelle mit Überschriften
- Markup-Parsing für SNDB-Formatierung (#k#, #r#, #s+)
- Sektion wird nur bei vorhandenen Biografien angezeigt
- Farbige linke Border für visuelle Trennung

### Commits

- `a1ffad0`: Restructure data directories for clarity and future extensibility
- `62a0a00`: Clean up repository: remove test files and archive obsolete documentation
- `d89babc`: Restore network relations data to persons.json
- `8fcdb77`: Update JOURNAL.md with Session 2025-10-30
- `febca78`: Implement Multi-Source Biographies feature
- `272b09c`: Add additional biographies display to person detail page
- `7bd019c`: Fix syntax errors in person.js biography rendering

---

## 2025-10-30 (Session 2): Dedizierte Listen-Seiten für Personen und Orte

### UI-Verbesserungen

Navbar-Konsistenz:
- Alle Unterseiten verwenden jetzt einheitlich die vollständige Navbar (components/navbar.html)
- Entfernung der 'simple' Navbar-Variante
- Konsistenter Import von search.css auf allen Seiten

Statistik-Karten:
- Statistiken aus Navbar entfernt (15.312 Briefe, 448 Frauen, 227 Orte)
- Neue Stats-Karten über den Filtern in der Sidebar
- 3-spaltige Grid-Layout mit hover-Effekten
- Klickbare Karten für Frauen und Orte

### Neue Features: Listen-Seiten

people.html - Alle Frauen:
- Liste aller 448 Frauen mit vollständigen Informationen
- Suchfunktion nach Namen
- Sortierung nach Name (A-Z), Briefanzahl (absteigend), Geburtsjahr
- Grid-Layout mit responsiven Karten
- Anzeige von Lebensdaten, Beruf, Ort und Briefanzahl
- Direktlinks zu Personendetails

places.html - Alle Orte:
- Liste aller 227 Orte mit Geodaten
- Suchfunktion nach Ortsnamen
- Sortierung nach Name (A-Z) oder Personenanzahl (absteigend)
- Anzeige von Koordinaten und Personenanzahl
- Ausklappbare Details-Sektion zeigt alle Personen pro Ort
- Direktlinks zu Personendetails

Gemeinsame Implementierung:
- Shared CSS in list.css für beide Seiten
- Konsistentes Design mit hover-Effekten
- Responsive Grid-Layout (auto-fill, minmax(350px, 1fr))
- JavaScript-basierte Filterung und Sortierung
- Verwendung der zentralen loadPersons() API

### Download-Seite

Neue Seite download.html:
- JSON-Export (vollständiger Datensatz)
- CSV-Export (flaches Tabellenformat, 15 Spalten)
- Excel-Vorbereitung (geplant)
- Vault ZIP-Download (alle knowledge/*.md Dateien)
- Client-seitige ZIP-Generierung mit JSZip

CSV-Struktur:
```
id, name, gnd, birth_year, death_year, letter_count, mention_count,
roles, primary_place, place_lat, place_lon, primary_occupation,
sndb_url, has_biography, has_relations
```

### Technische Refactorings

Modal-System entfernt:
- Ursprünglicher Ansatz mit Modals für Listen verworfen
- Dedizierte Seiten bevorzugt (bessere UX)
- Modal-CSS und JavaScript komplett entfernt
- stats-cards.js gelöscht

Datenstruktur-Fix:
- loadPersons() gibt {meta, persons} zurück, nicht nur Array
- people.js und places.js korrigiert um data.persons zu extrahieren
- Verhindert TypeError: "forEach is not a function"

CSS-Verbesserungen:
- Neue list.css für gemeinsame Listen-Styles
- Entfernung ungenutzter Modal-Styles aus style.css
- Stats-Karten Hover-Effekte mit transform und box-shadow
- Konsistente Farbpalette mit CSS-Variablen

### Dateien

Neu:
- docs/people.html - Frauen-Liste Seite
- docs/places.html - Orte-Liste Seite
- docs/download.html - Export/Download Seite
- docs/js/people.js - Frauen-Liste JavaScript
- docs/js/places.js - Orte-Liste JavaScript
- docs/js/download.js - Vault ZIP Generierung
- docs/css/list.css - Shared List-Styles
- docs/css/download.css - Download-Seite Styles
- docs/data/persons.csv - CSV-Export (generiert)

Geändert:
- docs/index.html - Stats-Karten zu Links geändert, Modal entfernt
- docs/css/style.css - Modal-CSS entfernt, Stats-Karten Styles
- docs/js/app.js - stats-cards.js Import entfernt, updateStats() leer
- docs/vault.html - Navbar-Konsistenz, Download-Button
- docs/person.js - Navbar-Konsistenz

Gelöscht:
- docs/js/stats-cards.js - Nicht mehr benötigt

### Design-Prinzipien

Aus dieser Session gelernt:
- Dedizierte Seiten sind besser als Modals für Listen
- Template-Konsistenz ist kritisch (navbar.html für alle Seiten)
- Verwandte Änderungen können zu einem Commit gebatcht werden
- Klare Trennung: Seiten für Inhalte, Modals nur für transiente UI

### Commits

- `fb26f70`: Add dedicated list pages for people and places
- `0f8f071`: Fix data loading in people.js and places.js

---

## Ältere Einträge

(Hier können frühere Sessions dokumentiert werden)
