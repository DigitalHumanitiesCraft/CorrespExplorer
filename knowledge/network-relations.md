# Netzwerk-Relationen in HerData

Dokumentation über AGRELON-Relationen und warum hauptsächlich Familie-Verbindungen sichtbar sind.

## Datenquelle

Relationen stammen aus der SNDB (Systematische Namensdatei Briefeschreiber) und verwenden die AGRELON-Ontologie (Agent Relations Ontology).

## AGRELON-Kategorien

Die 84 Relationstypen in AGRELON werden in 4 Hauptkategorien eingeteilt:

### Familie (4xxx)
- 4010: hat Elternteil
- 4020: hat Großelternteil
- 4030: hat Kind
- 4040: hat Enkel
- 4050: hat Tante/Onkel
- 4060: hat Cousin
- 4070: hat Patenkind
- 4080: hat Pate
- 4090: hat Schwager/Schwägerin
- 4100: hat Ehepartner
- 4110: hat Nichte/Neffe
- 4120: hat Geschwister
- 4130: hat Urenkel
- 4140: hat Urgroßelternteil

### Beruflich (3xxx)
- 3010: hat Kollaborator
- 3020: hat Einfluss auf
- 3030: ist beeinflusst durch
- 3040: hat Muse
- 3050: ist Muse von
- 3060: hat Mäzen
- 3070: ist Mäzen von
- 3080: hat Schüler
- 3090: hat Lehrer
- 3100: hat Vorgänger
- 3110: hat Nachfolger

### Sozial (1xxx + 2xxx)
- 1010: hat Freund
- 2010: hat Gründer
- 2020: ist Gründer von
- 2030: hat Mitglied
- 2040: ist Mitglied von
- 2050: hat Besitzer
- 2060: ist Besitzer von

### Andere (ausgefiltert)
- 5xxx: Vitaler/letaler Kontakt (Arzt, Mordopfer)
- 7xxx: Geografikum (keine Personenrelationen)
- 8xxx: Werk (Übersetzungen, Rezensionen)

## Daten-Pipeline

### 1. SNDB XML-Dateien

Quelle: `data/SNDB/pers_koerp_beziehungen.xml`

Struktur:
```xml
<ITEM num="1">
  <ID1>239</ID1>
  <ID2>43000</ID2>
  <AGRELON_ID1>4020</AGRELON_ID1>
  <AGRELON_ID2>4040</AGRELON_ID2>
</ITEM>
```

Statistik:
- 6580 Beziehungen gesamt
- 6253 Personen mit Relationen

### 2. Integration in persons.json

Script: `preprocessing/integrate_relations.py`

Logik:
```python
# Nur Relationen zwischen Personen die BEIDE im Dataset sind
if target_id not in persons_by_id:
    continue  # Skip
```

Ergebnis:
- 67 von 448 Frauen haben Relationen
- 84 Relationen integriert (von 6580)
- 6496 Relationen gefiltert (verbinden zu Männern oder anderen Personen)

### 3. Visualisierung auf der Karte

Code: `docs/js/network-utils.js`

Anforderungen:
- Beide Personen müssen in persons.json sein
- Beide Personen müssen Geodaten (places) haben
- Target-Person muss Koordinaten haben

Ergebnis:
- 50 von 84 Relationen sind sichtbar
- 34 Relationen nicht sichtbar (Zielperson ohne Geodaten)

## Statistik nach Kategorie

### In SNDB XML (gesamt)
- Familie (4xxx): ca. 5470 Relationen
- Beruflich (3xxx): ca. 107 Relationen
- Sozial (1xxx + 2xxx): ca. 138 Relationen

### In persons.json (integriert)
- Familie: 80 Relationen
- Beruflich: 2 Relationen
- Sozial: 2 Relationen

### Auf Karte sichtbar (beide Personen haben Geodaten)
- Familie: 50 Relationen
- Beruflich: 0 Relationen (Zielpersonen ohne Koordinaten)
- Sozial: 0 Relationen (Zielpersonen ohne Koordinaten)

## Warum so wenige nicht-familiäre Relationen?

### Hauptgrund: HerData zeigt nur Frauen

Von 6580 SNDB-Relationen verbinden die meisten Frauen mit Männern:
- Ehemann (4100)
- Vater (4010)
- Bruder (4120)
- Sohn (4030)
- Berufliche Kollegen (3xxx)

Diese Relationen werden ausgefiltert, weil die Zielpersonen nicht in HerData sind.

### Beispiel: Nicht-sichtbare Relationen

**Sozial (1010 - hat Freund): 2 Relationen in persons.json**
- Adele Schopenhauer (45215, Weimar) → Julie Kleefeld (51022, keine Koordinaten)
- Julie Kleefeld (51022) → Adele Schopenhauer (45215)

Problem: Julie Kleefeld hat keine Places-Daten, daher 0 sichtbare Freundschafts-Verbindungen.

**Beruflich (3020/3030 - Einfluss): 2 Relationen in persons.json**
- Charlotte Bode (35842, Oppenheim) → Luise von Hessen-Darmstadt (44010, keine Koordinaten)
- Luise von Hessen-Darmstadt (44010) → Charlotte Bode (35842)

Problem: Luise von Hessen-Darmstadt hat keine Places-Daten, daher 0 sichtbare berufliche Verbindungen.

## Historischer Kontext

Im 18./19. Jahrhundert waren:
- Familiäre Netzwerke zwischen Frauen häufig (Mutter, Schwester, Tochter)
- Berufliche Netzwerke hauptsächlich zu Männern (Verleger, Mentoren, Kollegen)
- Soziale Netzwerke gemischt, aber oft durch Männer vermittelt

Daher ist es historisch korrekt, dass Familie-Relationen zwischen Frauen dominieren.

## Technische Umsetzung

### Farben
- Familie: #ff0066 (Pink/Magenta)
- Beruflich: #00ccff (Cyan/Hellblau)
- Sozial: #ffcc00 (Gelb/Gold)

Diese Farben sind maximal unterschiedlich und leicht unterscheidbar.

### Visualisierung
- Linien: 4-12px breit (abhängig von Anzahl)
- Glow-Effekt: 8-14px weißer Halo mit blur 4
- Opacity: 0.9 für maximale Sichtbarkeit

### Hover-Verhalten
- Einzelner Marker: Zeigt Verbindungen dieser Person
- Cluster: Zeigt aggregierte Verbindungen aller Personen im Cluster
- Tooltip: Zeigt Anzahl nach Kategorie ("8 Verbindungen: 6 Familie • 1 Beruflich • 1 Sozial")

## MapLibre Promise API

### Problem (entdeckt 2025-10-29)

MapLibre GL JS wechselte von Callback- zu Promise-basierter API. Alter Code mit Callbacks funktionierte nicht mehr:

```javascript
// Alt (funktioniert nicht mehr)
source.getClusterLeaves(clusterId, pointCount, 0, (error, leaves) => {
    // Callback wird nie ausgeführt
});
```

### Lösung

Promise-basierte API verwenden:

```javascript
// Neu (korrekt)
source.getClusterLeaves(clusterId, pointCount)
    .then(leaves => {
        // Promise wird korrekt aufgelöst
    })
    .catch(error => {
        // Fehlerbehandlung
    });
```

Siehe: `docs/CLUSTER_HOVER_DEBUG.md` für vollständige Debug-Geschichte.

## Zukünftige Erweiterungen

Möglichkeiten zur Erweiterung des Netzwerks:

1. Brief-Korrespondenz als Relation (Brief-Partner-Netzwerk)
2. Geteilte Orte als implizite Verbindung (räumliches Netzwerk)
3. Zeitliche Überlappungen (temporales Netzwerk)
4. Männliche Personen als Knoten einbeziehen (vollständiges Netzwerk)

Aktuell: Phase 1 (AGRELON-Relationen) ist implementiert.

## Referenzen

- AGRELON Ontologie: http://d-nb.info/standards/elementset/agrelon
- SNDB: Systematische Namensdatei Briefeschreiber (Goethe- und Schiller-Archiv)
- MapLibre GL JS: https://maplibre.org/
- Preprocessing Script: `preprocessing/integrate_relations.py`
- Frontend Code: `docs/js/network-utils.js`, `docs/js/app.js`
