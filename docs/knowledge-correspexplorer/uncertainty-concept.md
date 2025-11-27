# Konzept: Umgang mit Unsicherheiten

Forschungsdaten enthalten haeufig Unsicherheiten. Ein gutes Visualisierungstool muss diese transparent kommunizieren, ohne die Nutzbarkeit zu beeintraechtigen.

Stand: 2025-11-27

---

## 1. Typen von Unsicherheiten in CMIF

### 1.1 Datierungsunsicherheit

CMIF unterstuetzt verschiedene Attribute zur Kennzeichnung unsicherer Datierungen:

```xml
<!-- Exaktes Datum -->
<date when="1913-06-13"/>

<!-- Zeitspanne -->
<date notBefore="1913-06" notAfter="1913-08"/>

<!-- Unsicheres Datum -->
<date when="1913-06-13" cert="low"/>

<!-- Vermutetes Datum -->
<date when="1913" evidence="conjecture"/>
```

Aktueller Status: Parser liest `notBefore/notAfter`, ignoriert aber `cert` und `evidence`.

### 1.2 Unbekannte Personen

```xml
<persName>[NN]</persName>
<persName>Unbekannt</persName>
<persName>Rozario, [NN] de</persName>
```

Im HSA-Datensatz: 50+ Briefe mit "Unbekannt" als Absender/Empfaenger.

### 1.3 Unbekannte Orte

```xml
<placeName>unknown</placeName>
<!-- Oder Orte ohne GeoNames-ID -->
```

Im Hebel-Datensatz: 60% der Briefe ohne Absende-Ort.

### 1.4 Unbekannte Authority-IDs

Personen/Orte ohne VIAF, GND oder GeoNames-Referenz.

---

## 2. Vorgeschlagene Visualisierung

### 2.1 Datierungsunsicherheit

| Szenario | Anzeige | Visuelle Kennzeichnung |
|----------|---------|------------------------|
| Exaktes Datum | "13.06.1913" | Normal |
| Zeitspanne | "Juni-August 1913" | Kursiv |
| Unsicher (cert=low) | "13.06.1913?" | Fragezeichen |
| Vermutet | "ca. 1913" | "ca." Praefix |

CSS-Klassen:
```css
.date-uncertain {
    font-style: italic;
    color: var(--color-text-muted);
}

.date-uncertain::after {
    content: "?";
    color: var(--color-warning);
    margin-left: 2px;
}

.date-range {
    font-style: italic;
}
```

### 2.2 Timeline mit Unsicherheiten

Option A: Transparente Balken
- Unsichere Datierungen werden mit reduzierter Opacity (0.5) dargestellt
- Tooltip zeigt "Unsichere Datierung" an

Option B: Separate Farbe
- Unsichere Datierungen in einer separaten Farbe (z.B. gestrichelt)
- Legende erklaert die Unterscheidung

Option C: Fehlerbalken
- Bei Zeitspannen (notBefore/notAfter): Horizontaler Balken zeigt den moeglichen Zeitraum

Empfehlung: Option A (einfach, nicht stoerend)

### 2.3 Unbekannte Personen

| Person | Anzeige | Sortierung |
|--------|---------|------------|
| "Hugo Schuchardt" | Normal | Alphabetisch |
| "[NN]" | "[Unbekannt]" mit Icon | Am Ende |
| "Rozario, [NN] de" | "Rozario, [?] de" | Alphabetisch unter R |

Visuelle Kennzeichnung:
```css
.person-unknown {
    color: var(--color-text-muted);
    font-style: italic;
}

.person-unknown .person-avatar {
    background: var(--color-border-light);
}

.person-unknown .person-avatar::before {
    content: "?";
}
```

### 2.4 Unbekannte Orte

Kartenansicht:
- Orte ohne Koordinaten werden in einer separaten Liste angezeigt (bereits implementiert)
- Optionale Anzeige: "Ort nicht lokalisierbar" Badge

Orte-Liste:
- Unbekannte Orte am Ende der Liste
- Eigene Kategorie "Nicht lokalisiert"

### 2.5 Sidebar-Statistik

Erweiterung der Stats-Cards um Unsicherheits-Indikatoren:

```
Briefe: 11.576
  davon unsicher datiert: 234 (2%)

Orte: 774
  davon ohne Koordinaten: 45 (6%)

Personen: 846
  davon unbekannt: 12 (1%)
```

---

## 3. Datenmodell-Erweiterung

### 3.1 Brief-Objekt

```javascript
{
  "id": "o:hsa.letter.654",
  "date": "1913-06-13",
  "year": 1913,
  "dateUncertainty": {
    "type": "exact" | "range" | "uncertain" | "conjecture",
    "cert": "high" | "medium" | "low",
    "notBefore": "1913-06",
    "notAfter": "1913-08"
  },
  "sender": {
    "name": "Urquijo Ybarra, Julio de",
    "isUnknown": false
  }
}
```

### 3.2 Parser-Erweiterung

```javascript
function extractDate(action) {
    // ... existing code ...

    const cert = dateEl.getAttribute('cert');
    const evidence = dateEl.getAttribute('evidence');

    let uncertaintyType = 'exact';
    if (notBefore && notAfter && !when) {
        uncertaintyType = 'range';
    } else if (cert === 'low') {
        uncertaintyType = 'uncertain';
    } else if (evidence === 'conjecture') {
        uncertaintyType = 'conjecture';
    }

    return {
        date: dateStr,
        year: isNaN(year) ? null : year,
        dateUncertainty: {
            type: uncertaintyType,
            cert: cert || 'high',
            notBefore,
            notAfter
        }
    };
}
```

### 3.3 Personen-Erkennung

```javascript
function isUnknownPerson(name) {
    if (!name) return true;
    const patterns = ['[NN]', 'Unbekannt', 'Unknown', 'N.N.', '???'];
    return patterns.some(p => name.includes(p));
}
```

---

## 4. UI-Elemente

### 4.1 Filter fuer Unsicherheiten

Neuer Filter-Abschnitt in der Sidebar:

```
Datenqualitaet
[x] Alle anzeigen
[ ] Nur sichere Datierungen
[ ] Nur bekannte Personen
[ ] Nur lokalisierte Orte
```

### 4.2 Tooltip-Erweiterung

Brief-Karten zeigen Unsicherheiten im Tooltip:

```
Brief von Hugo Schuchardt an [Unbekannt]
Datum: ca. 1913 (unsichere Datierung)
Ort: Graz
```

### 4.3 Export mit Unsicherheiten

CSV-Export enthaelt zusaetzliche Spalten:

| ID | Datum | Datum_Unsicher | Sender | Sender_Unbekannt |
|----|-------|----------------|--------|------------------|
| 654 | 1913-06-13 | false | Urquijo | false |
| 655 | 1913 | true | [NN] | true |

---

## 5. Implementierungsplan

### Phase 1: Datenerfassung (gering)
1. Parser erweitern um `cert`, `evidence` Attribute
2. `isUnknown` Flag fuer Personen berechnen
3. Datenmodell um `dateUncertainty` erweitern

### Phase 2: Visuelle Kennzeichnung (mittel)
1. CSS-Klassen fuer unsichere Elemente
2. Brief-Liste mit Unsicherheits-Markern
3. Personen-Liste mit [NN]-Kennzeichnung

### Phase 3: Statistik-Integration (gering)
1. Unsicherheits-Zaehler in Stats-Cards
2. Tooltip-Erweiterung

### Phase 4: Filter-Optionen (mittel)
1. Datenqualitaets-Filter in Sidebar
2. URL-State fuer Filter

### Phase 5: Export-Erweiterung (gering)
1. Zusaetzliche Spalten in CSV
2. Unsicherheits-Felder in JSON

---

## 6. Forschungsperspektive

Fuer Forschende ist die Transparenz ueber Unsicherheiten essentiell:

1. Quellenkritik: Unsichere Datierungen muessen erkennbar sein
2. Reproduzierbarkeit: Export muss Unsicherheiten enthalten
3. Interpretation: Visualisierungen duerfen nicht ueber-praezise wirken

Grundsatz: Unsicherheiten nicht verstecken, aber auch nicht aufdringlich darstellen.

---

## 7. Abhaengigkeiten

- cmif-parser.js: Erweiterung der Extraktion
- explore.js: Rendering mit Unsicherheits-Klassen
- explore.css: Neue Styles
- constants.js: Unsicherheits-Typen
- utils.js: Helper-Funktionen

---

## 8. Nicht-Ziele

- Automatische Korrektur von Unsicherheiten
- KI-basierte Datumsschaetzung
- Validierung gegen externe Quellen

Das Tool zeigt Unsicherheiten an, bewertet oder korrigiert sie aber nicht.
