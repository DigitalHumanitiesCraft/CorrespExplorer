# Konzept: Umgang mit Unsicherheiten

Forschungsdaten enthalten haeufig Unsicherheiten. Ein gutes Visualisierungstool muss diese transparent kommunizieren, ohne die Nutzbarkeit zu beeintraechtigen.

Stand: 2025-11-27

---

## 1. Taxonomie der Unsicherheiten

Unsicherheiten in Korrespondenz-Metadaten lassen sich in mehrere Kategorien einteilen:

### 1.1 Temporale Unsicherheit (Datierung)

| Typ | Beschreibung | CMIF-Attribut | Haeufigkeit |
|-----|--------------|---------------|-------------|
| Exakt | Datum bekannt | `when="1913-06-13"` | Hoch |
| Zeitspanne | Nur Zeitraum bekannt | `notBefore/notAfter` | Mittel |
| Unsicher | Datum vermutet | `cert="low"` | Niedrig |
| Konjektur | Aus Kontext erschlossen | `evidence="conjecture"` | Niedrig |
| Unbekannt | Kein Datum | Fehlendes Element | Selten |

Beispiele aus CMIF:
```xml
<!-- Exakt -->
<date when="1913-06-13"/>

<!-- Zeitspanne -->
<date notBefore="1913-06" notAfter="1913-08"/>

<!-- Unsicher -->
<date when="1913-06-13" cert="low"/>

<!-- Konjektur -->
<date when="1913" evidence="conjecture"/>

<!-- Nur Jahr -->
<date when="1913"/>
```

### 1.2 Personale Unsicherheit

| Typ | Beschreibung | Beispiel |
|-----|--------------|----------|
| Unbekannt | Person nicht identifiziert | `[NN]`, `Unbekannt` |
| Teilweise bekannt | Nur Nachname | `Rozario, [NN] de` |
| Unsichere Identifikation | Person vermutet | `cert="low"` auf persName |
| Verwechslungsgefahr | Mehrere Personen gleichen Namens | Ohne Authority-ID |
| Sekretaer vs. Autor | Schreiber ungleich Absender | Nicht in CMIF |

### 1.3 Raeumliche Unsicherheit

| Typ | Beschreibung | Beispiel |
|-----|--------------|----------|
| Unbekannt | Ort nicht angegeben | `unknown`, leer |
| Ohne Koordinaten | Ort bekannt, nicht lokalisiert | Ohne GeoNames-ID |
| Schreibort vs. Absendeort | Unterschiedliche Orte | Semantisch unklar |
| Unsichere Lokalisierung | Ort vermutet | `cert="low"` |
| Historischer Ortsname | Name geaendert | Erfordert Mapping |

### 1.4 Referenzielle Unsicherheit (Authority)

| Typ | Beschreibung | Auswirkung |
|-----|--------------|------------|
| Keine Authority-ID | Person/Ort ohne GND/VIAF | Keine Vernetzung moeglich |
| Falsche Authority-ID | Fehlerhafte Zuordnung | Falsche Anreicherung |
| Mehrdeutige Referenz | Mehrere moegliche Entitaeten | Unsichere Zuordnung |
| Veraltete ID | Authority-System geaendert | Link funktioniert nicht |

### 1.5 Ueberlieferungsunsicherheit

| Typ | Beschreibung | CMIF-Attribut |
|-----|--------------|---------------|
| Original | Originalbrief vorhanden | Standard |
| Kopie | Nur Abschrift erhalten | `type="copy"` |
| Entwurf | Konzept, nicht abgesandt | `type="draft"` |
| Verloren | Brief nur erwaehnt | `type="lost"` |
| Fragment | Unvollstaendig | `type="fragment"` |

### 1.6 Inhaltliche Unsicherheit

| Typ | Beschreibung | Relevanz |
|-----|--------------|----------|
| Sprachangabe | Sprache nicht sicher | Selten |
| Thematische Zuordnung | Subjektive Kategorisierung | Bei subjects |
| Erwaehnte Entitaeten | Interpretation erforderlich | Bei mentions |

### 1.7 Strukturelle Unsicherheit

| Typ | Beschreibung | Beispiel |
|-----|--------------|----------|
| Brieffolge | Reihenfolge unklar | Bei Briefwechseln |
| Zugehoerigkeit | Brief zu Korrespondenz? | Bei Sammlungen |
| Vollstaendigkeit | Fehlende Briefe | Luecken in Serie |

---

## 2. Relevanz fuer CorrespExplorer

Nicht alle Unsicherheiten sind fuer die Visualisierung gleich relevant:

### 2.1 Hohe Relevanz (sollte visualisiert werden)

| Unsicherheit | Begruendung | Visualisierung |
|--------------|-------------|----------------|
| Datierungsunsicherheit | Beeinflusst Timeline direkt | ?, ca., kursiv |
| Unbekannte Personen | Beeinflusst Netzwerk-Analyse | Spezielles Styling |
| Unbekannte Orte | Beeinflusst Karten-Ansicht | Separate Liste |
| Fehlende Authority-IDs | Keine Wikidata-Anreicherung | Info-Badge |

### 2.2 Mittlere Relevanz (optional)

| Unsicherheit | Begruendung | Umsetzung |
|--------------|-------------|-----------|
| Ueberlieferungstyp | Forschungsrelevant | Tooltip/Export |
| Zeitspannen | Praezision der Timeline | Fehlerbalken |
| Teilweise bekannte Namen | Kontextuell wichtig | Anzeige beibehalten |

### 2.3 Niedrige Relevanz (nicht umsetzen)

| Unsicherheit | Begruendung |
|--------------|-------------|
| Sekretaer vs. Autor | Nicht in CMIF-Standard |
| Brieffolge | Komplexe Logik erforderlich |
| Vollstaendigkeit | Metadaten nicht verfuegbar |

---

## 3. Aktueller Status im Code

### 3.1 Was bereits funktioniert

| Feature | Datei | Status |
|---------|-------|--------|
| notBefore/notAfter lesen | cmif-parser.js:180-181 | Implementiert |
| Unbekannte Personen anzeigen | explore.js | "Unbekannt" wird gezeigt |
| Orte ohne Koordinaten | explore.js | Separate Liste |
| Fallback bei fehlenden Daten | diverse | "Unbekannt" Strings |

### 3.2 Was fehlt

| Feature | Datei | Aufwand |
|---------|-------|---------|
| cert/evidence auswerten | cmif-parser.js | Gering |
| Unsicherheits-Styling | explore.css | Gering |
| Statistik-Erweiterung | explore.js | Mittel |
| Filter fuer Datenqualitaet | explore.js | Mittel |
| Export mit Unsicherheiten | explore.js | Gering |

---

## 4. Vorgeschlagene Visualisierung

### 4.1 Datierungsunsicherheit

| Szenario | Anzeige | CSS-Klasse |
|----------|---------|------------|
| Exaktes Datum | "13.06.1913" | - |
| Zeitspanne | "Juni-August 1913" | `.date-range` |
| Unsicher (cert=low) | "13.06.1913?" | `.date-uncertain` |
| Vermutet | "ca. 1913" | `.date-conjecture` |
| Nur Jahr | "1913" | `.date-year-only` |

```css
.date-range {
    font-style: italic;
}

.date-uncertain::after {
    content: "?";
    color: var(--color-warning);
    margin-left: 2px;
}

.date-conjecture::before {
    content: "ca. ";
    color: var(--color-text-muted);
}

.date-year-only {
    color: var(--color-text-muted);
}
```

### 4.2 Unbekannte Personen

| Fall | Erkennung | Anzeige |
|------|-----------|---------|
| `[NN]` | Pattern-Match | "[Unbekannt]" |
| `Unbekannt` | Exakter Match | "[Unbekannt]" |
| `N.N.` | Pattern-Match | "[Unbekannt]" |
| `Rozario, [NN] de` | Teilmatch | "Rozario, [?] de" |

```css
.person-unknown {
    color: var(--color-text-muted);
    font-style: italic;
}

.person-unknown .person-avatar {
    background: var(--color-border-light);
    color: var(--color-text-muted);
}
```

### 4.3 Timeline mit Unsicherheiten

Option A - Transparenz (empfohlen):
- Unsichere Datierungen: opacity 0.5
- Tooltip erklaert "Unsichere Datierung"

Option B - Muster:
- Unsichere Datierungen: gestrichelter Balken
- Legende erforderlich

Option C - Fehlerbalken:
- Bei Zeitspannen: horizontale Linie zeigt Bereich
- Komplexer zu implementieren

### 4.4 Sidebar-Statistik

```
Briefe: 11.576
  └ davon unsicher datiert: 234 (2%)

Personen: 846
  └ davon unbekannt: 12 (1%)

Orte: 774
  └ davon ohne Koordinaten: 45 (6%)
```

---

## 5. Datenmodell-Erweiterung

### 5.1 Brief-Objekt

```javascript
{
  "id": "o:hsa.letter.654",
  "date": "1913-06-13",
  "year": 1913,
  "uncertainty": {
    "date": {
      "type": "exact" | "range" | "uncertain" | "conjecture" | "year-only",
      "cert": "high" | "medium" | "low",
      "notBefore": "1913-06",
      "notAfter": "1913-08"
    },
    "sender": {
      "isUnknown": false,
      "isPartial": false
    },
    "recipient": {
      "isUnknown": true,
      "isPartial": false
    },
    "place": {
      "isUnknown": false,
      "hasCoordinates": true
    }
  }
}
```

### 5.2 Parser-Erweiterung

```javascript
function extractDateWithUncertainty(action) {
    const dateEl = action.getElementsByTagNameNS(TEI_NS, 'date')[0];
    if (!dateEl) return { date: null, year: null, uncertainty: { type: 'unknown' } };

    const when = dateEl.getAttribute('when');
    const from = dateEl.getAttribute('from');
    const to = dateEl.getAttribute('to');
    const notBefore = dateEl.getAttribute('notBefore');
    const notAfter = dateEl.getAttribute('notAfter');
    const cert = dateEl.getAttribute('cert');
    const evidence = dateEl.getAttribute('evidence');

    const dateStr = when || from || notBefore || notAfter;
    const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : null;

    let type = 'exact';
    if (!dateStr) {
        type = 'unknown';
    } else if (notBefore && notAfter && !when) {
        type = 'range';
    } else if (cert === 'low' || cert === 'medium') {
        type = 'uncertain';
    } else if (evidence === 'conjecture') {
        type = 'conjecture';
    } else if (dateStr.length === 4) {
        type = 'year-only';
    }

    return {
        date: dateStr,
        year: isNaN(year) ? null : year,
        uncertainty: {
            type,
            cert: cert || 'high',
            evidence,
            notBefore,
            notAfter
        }
    };
}
```

### 5.3 Personen-Erkennung

```javascript
const UNKNOWN_PATTERNS = [
    /^\[NN\]$/i,
    /^\[N\.N\.\]$/i,
    /^Unbekannt$/i,
    /^Unknown$/i,
    /^N\.N\.$/i,
    /^\?\?\?$/,
    /^ohne Angabe$/i
];

const PARTIAL_PATTERN = /\[NN\]|\[N\.N\.\]|\[\?\]/;

function analyzePersonUncertainty(name) {
    if (!name) return { isUnknown: true, isPartial: false };

    const isUnknown = UNKNOWN_PATTERNS.some(p => p.test(name.trim()));
    const isPartial = !isUnknown && PARTIAL_PATTERN.test(name);

    return { isUnknown, isPartial };
}
```

---

## 6. UI-Erweiterungen

### 6.1 Filter fuer Datenqualitaet

Neuer Abschnitt in der Sidebar:

```html
<div class="filter-group">
    <h4>Datenqualitaet</h4>
    <label class="checkbox-label">
        <input type="checkbox" id="filter-certain-dates" />
        Nur sichere Datierungen
    </label>
    <label class="checkbox-label">
        <input type="checkbox" id="filter-known-persons" />
        Nur bekannte Personen
    </label>
    <label class="checkbox-label">
        <input type="checkbox" id="filter-located-places" />
        Nur lokalisierte Orte
    </label>
</div>
```

### 6.2 Legende fuer Unsicherheiten

```html
<div class="uncertainty-legend">
    <div class="legend-item">
        <span class="date-uncertain">Datum?</span>
        <span>Unsichere Datierung</span>
    </div>
    <div class="legend-item">
        <span class="date-range">Juni-Aug</span>
        <span>Zeitspanne</span>
    </div>
    <div class="legend-item">
        <span class="person-unknown">[Unbekannt]</span>
        <span>Person nicht identifiziert</span>
    </div>
</div>
```

### 6.3 Export mit Unsicherheiten

CSV-Spalten:
```
ID,Datum,Datum_Typ,Datum_Cert,Sender,Sender_Unbekannt,Empfaenger,Empfaenger_Unbekannt,Ort,Ort_Koordinaten
654,1913-06-13,exact,high,Urquijo,false,Schuchardt,false,Graz,true
655,1913,year-only,low,[NN],true,Schuchardt,false,unknown,false
```

---

## 7. Forschungsperspektive

### 7.1 Warum Unsicherheiten zeigen?

1. Quellenkritik: Forschende muessen Datenqualitaet einschaetzen koennen
2. Reproduzierbarkeit: Analyse-Ergebnisse haengen von Datenqualitaet ab
3. Ehrlichkeit: Visualisierung darf nicht praeziser wirken als die Daten
4. Filterbarkeit: Manche Analysen erfordern nur sichere Daten

### 7.2 Grundsaetze

- Unsicherheiten nicht verstecken, aber auch nicht aufdringlich
- Dezente visuelle Marker (Kursiv, Fragezeichen, Opacity)
- Tooltips fuer Details
- Export muss Unsicherheiten enthalten
- Filter ermoeglichen gezielte Analyse

---

## 8. Implementierungsplan

### Phase 1: Parser-Erweiterung (1-2 Stunden)
1. `extractDateWithUncertainty()` implementieren
2. `analyzePersonUncertainty()` implementieren
3. Datenmodell um uncertainty-Objekt erweitern
4. Rueckwaertskompatibilitaet sicherstellen

### Phase 2: Visuelle Kennzeichnung (2-3 Stunden)
1. CSS-Klassen fuer Unsicherheiten
2. Brief-Liste mit Unsicherheits-Markern
3. Personen-Liste mit [NN]-Kennzeichnung
4. Tooltip-Erweiterung

### Phase 3: Statistik und Legende (1 Stunde)
1. Unsicherheits-Zaehler berechnen
2. Stats-Cards erweitern
3. Legende hinzufuegen

### Phase 4: Filter (2 Stunden)
1. Filter-UI in Sidebar
2. Filter-Logik implementieren
3. URL-State fuer Filter

### Phase 5: Export (1 Stunde)
1. CSV-Spalten erweitern
2. JSON-Export mit uncertainty-Objekt

---

## 9. Nicht-Ziele

- Automatische Korrektur von Unsicherheiten
- KI-basierte Datumsschaetzung
- Validierung gegen externe Quellen
- Bewertung der Datenqualitaet
- Warnung vor "schlechten" Daten

Das Tool zeigt Unsicherheiten an, bewertet oder korrigiert sie aber nicht.

---

## 10. Offene Fragen

1. Sollen Unsicherheiten in der Timeline aggregiert werden?
   - Option A: Unsichere Briefe zaehlen normal
   - Option B: Unsichere Briefe werden separat gezaehlt

2. Wie mit Zeitspannen in der Timeline umgehen?
   - Option A: Zum fruehesten Jahr zaehlen
   - Option B: Zum spaetesten Jahr zaehlen
   - Option C: Anteilig auf alle Jahre verteilen

3. Sollen unbekannte Personen im Netzwerk erscheinen?
   - Option A: Ja, als einzelner "[Unbekannt]" Knoten
   - Option B: Nein, ausschliessen
   - Option C: Ja, aber ausgegraut

4. Filter-Defaults?
   - Option A: Alle Daten (inkl. unsichere)
   - Option B: Nur sichere Daten
