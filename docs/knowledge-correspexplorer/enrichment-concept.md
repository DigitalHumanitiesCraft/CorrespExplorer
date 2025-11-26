# Datenanreicherung (Enrichment) Konzept

Konzept fuer die Anreicherung von CMIF-Daten mit externen Quellen (GND via lobid.org, Wikidata).

---

## Uebersicht

CMIF-Dateien enthalten oft nur minimale Personendaten:
- Name
- GND-ID (z.B. `http://d-nb.info/gnd/118540238`)

Durch Enrichment koennen wir hinzufuegen:
- Lebensdaten (Geburt, Tod)
- Berufe/Taetigkeiten
- Geburts-/Sterbeort
- Bild (Wikipedia/Wikimedia)
- Verwandtschaftsbeziehungen
- Wikidata-ID

---

## Datenquellen

### 1. lobid.org GND API

URL-Schema: `https://lobid.org/gnd/{GND-ID}.json`

Beispiel: `https://lobid.org/gnd/118540238.json` (Goethe)

Verfuegbare Felder:
```json
{
  "preferredName": "Goethe, Johann Wolfgang von",
  "dateOfBirth": "1749-08-28",
  "dateOfDeath": "1832-03-22",
  "placeOfBirth": [{"label": "Frankfurt am Main"}],
  "placeOfDeath": [{"label": "Weimar"}],
  "professionOrOccupation": [{"label": "Schriftsteller"}, ...],
  "gender": {"label": "männlich"},
  "depiction": [{"thumbnail": "https://..."}],
  "sameAs": [
    {"id": "http://www.wikidata.org/entity/Q5879"},
    {"id": "https://de.wikipedia.org/wiki/..."}
  ]
}
```

Vorteile:
- CORS-freundlich
- Schnelle Antwortzeiten
- CC0 Lizenz
- Direkte Wikidata-Links

### 2. Wikidata API (optional)

URL-Schema: `https://www.wikidata.org/wiki/Special:EntityData/{QID}.json`

Zusaetzliche Daten:
- Mehrsprachige Labels
- Detaillierte Beziehungen
- Bilder in hoher Aufloesung
- Koordinaten von Geburts-/Sterbeorten

---

## Implementierungskonzept

### Option A: On-Demand Enrichment (empfohlen)

Anreicherung beim Klick auf eine Person.

```javascript
async function enrichPerson(gndId) {
    const cacheKey = `gnd-${gndId}`;

    // Check cache first
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    // Fetch from lobid.org
    const url = `https://lobid.org/gnd/${gndId}.json`;
    const response = await fetch(url);
    const data = await response.json();

    const enriched = {
        name: data.preferredName,
        birthDate: data.dateOfBirth,
        deathDate: data.dateOfDeath,
        birthPlace: data.placeOfBirth?.[0]?.label,
        deathPlace: data.placeOfDeath?.[0]?.label,
        professions: data.professionOrOccupation?.map(p => p.label),
        gender: data.gender?.label,
        thumbnail: data.depiction?.[0]?.thumbnail,
        wikidataId: extractWikidataId(data.sameAs),
        wikipediaUrl: data.wikipedia?.[0]?.id
    };

    // Cache result
    sessionStorage.setItem(cacheKey, JSON.stringify(enriched));
    return enriched;
}
```

Vorteile:
- Keine Wartezeit beim Laden
- Nur relevante Daten werden geladen
- Cache reduziert API-Aufrufe

Nachteile:
- Verzoegerung beim ersten Klick
- Offline nicht verfuegbar

### Option B: Batch Enrichment beim Ingest

Alle GND-IDs beim Laden anreichern.

```javascript
async function enrichAllPersons(persons) {
    const gndIds = persons
        .filter(p => p.authority === 'gnd')
        .map(p => p.authorityId);

    // Batch-Anfragen mit Rate-Limiting
    const enriched = {};
    for (const gndId of gndIds) {
        enriched[gndId] = await enrichPerson(gndId);
        await delay(100); // Rate limiting
    }

    return enriched;
}
```

Vorteile:
- Alle Daten sofort verfuegbar
- Bessere UX nach dem Laden

Nachteile:
- Lange Ladezeit bei vielen Personen
- Viele API-Aufrufe
- Rate-Limiting erforderlich

### Option C: Konfigurierbares Enrichment

Nutzer waehlt beim Laden:

```
[ ] Personendaten anreichern (GND/Wikidata)
    - Kann die Ladezeit verlaengern
    - Laedt Lebensdaten, Berufe, Bilder
```

UI in index.html:
```html
<div class="enrichment-options">
    <label>
        <input type="checkbox" id="enrich-persons">
        Personendaten anreichern (GND)
    </label>
    <p class="hint">Laedt Lebensdaten, Berufe und Bilder</p>
</div>
```

---

## Angereicherte Daten nutzen

### 1. Personen-Detail erweitern

```
┌─────────────────────────────────────┐
│ Johann Wolfgang von Goethe          │
│ 1749-1832                           │
│ Frankfurt am Main - Weimar          │
│ ┌─────┐                             │
│ │ Bild│  Schriftsteller, Jurist     │
│ └─────┘                             │
│                                     │
│ [GND] [Wikidata] [Wikipedia]        │
│ [correspSearch] [+ Wissenskorb]     │
└─────────────────────────────────────┘
```

### 2. Timeline mit Lebensdaten

Zeige Lebensspanne der Korrespondenten:
- Graue Linie: Lebenszeit
- Farbige Punkte: Briefe

### 3. Netzwerk mit Berufen

Knoten nach Beruf einfaerben:
- Blau: Schriftsteller
- Gruen: Wissenschaftler
- Orange: Politiker
- Grau: Unbekannt

### 4. Filter nach Beruf

Neuer Filter in Sidebar:
```
BERUF
[ ] Schriftsteller (12)
[ ] Wissenschaftler (8)
[ ] Politiker (3)
```

---

## Technische Umsetzung

### Neues Modul: enrichment.js

```javascript
// enrichment.js

const LOBID_BASE = 'https://lobid.org/gnd/';
const CACHE_PREFIX = 'ce-enriched-';

export async function enrichFromGND(gndId) {
    // Implementation
}

export async function enrichAllPersons(persons, options = {}) {
    // Batch implementation with progress callback
}

export function clearEnrichmentCache() {
    // Clear sessionStorage
}
```

### Integration in cmif-parser.js

```javascript
// Nach dem Parsen
if (options.enrichPersons) {
    showProgress('Reichere Personendaten an...');
    await enrichAllPersons(data.indices.persons, {
        onProgress: (current, total) => {
            updateProgress(current / total);
        }
    });
}
```

### Speicherung

Angereicherte Daten in sessionStorage:
```javascript
{
    "ce-enriched-118540238": {
        "name": "Goethe, Johann Wolfgang von",
        "birthDate": "1749-08-28",
        "deathDate": "1832-03-22",
        ...
    }
}
```

---

## Rate-Limiting und Caching

### lobid.org Limits

- Keine offiziellen Limits dokumentiert
- Empfehlung: Max 10 Requests/Sekunde
- Batch-Requests nicht unterstuetzt

### Caching-Strategie

1. sessionStorage fuer aktuelle Session
2. Optional: IndexedDB fuer persistenten Cache
3. Cache-Invalidierung: Nach 7 Tagen

### Fehlerbehandlung

```javascript
try {
    const data = await enrichFromGND(gndId);
} catch (error) {
    if (error.status === 404) {
        // GND-ID nicht gefunden
        markAsNotFound(gndId);
    } else if (error.status === 429) {
        // Rate limit - warten und wiederholen
        await delay(1000);
        return enrichFromGND(gndId);
    }
}
```

---

## Priorisierung

### Phase 1: On-Demand (minimal)
- Enrichment beim Klick auf Person
- Anzeige in Person-Detail-Modal
- Caching in sessionStorage

### Phase 2: Batch mit Option
- Checkbox beim Laden
- Progress-Anzeige
- Alle Personen anreichern

### Phase 3: Erweiterte Nutzung
- Berufs-Filter
- Lebensdaten in Timeline
- Netzwerk-Faerbung

---

## Offene Fragen

1. Sollen Orte auch angereichert werden (GeoNames -> Wikidata)?
2. Wie mit fehlenden GND-IDs umgehen?
3. VIAF-IDs auch unterstuetzen?
4. Persistenter Cache in IndexedDB?
