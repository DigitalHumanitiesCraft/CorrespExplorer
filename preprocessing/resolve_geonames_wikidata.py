"""
GeoNames zu Koordinaten via Wikidata SPARQL

Löst GeoNames-IDs zu Koordinaten auf, indem Wikidata als Vermittler genutzt wird.
Wikidata enthält:
- P1566: GeoNames ID
- P625: Koordinaten
- P227: GND ID (für Personen/Orte)
- P214: VIAF ID

Output: data/geonames_coordinates.json
"""

import json
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError


WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"

# User-Agent für Wikidata (erforderlich)
USER_AGENT = "CorrespExplorer/1.0 (https://github.com/chpollin/CorrespExplorer)"


def sparql_query(query: str) -> dict:
    """Führt eine SPARQL-Abfrage gegen Wikidata aus."""
    params = urlencode({'query': query, 'format': 'json'})
    url = f"{WIKIDATA_SPARQL_ENDPOINT}?{params}"

    request = Request(url)
    request.add_header('User-Agent', USER_AGENT)
    request.add_header('Accept', 'application/sparql-results+json')

    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        return None
    except URLError as e:
        print(f"URL Error: {e.reason}")
        return None


def batch_resolve_geonames(geonames_ids: list, batch_size: int = 50) -> dict:
    """
    Löst eine Liste von GeoNames-IDs zu Koordinaten auf.
    Verwendet Batching, um Wikidata-Limits zu respektieren.
    """
    results = {}
    total = len(geonames_ids)

    for i in range(0, total, batch_size):
        batch = geonames_ids[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"Batch {batch_num}/{total_batches}: Resolving {len(batch)} GeoNames IDs...")

        # SPARQL Query für Batch
        values = " ".join(f'"{gid}"' for gid in batch if gid)
        query = f"""
        SELECT ?geonamesId ?lat ?lon ?label ?labelDe WHERE {{
          VALUES ?geonamesId {{ {values} }}
          ?place wdt:P1566 ?geonamesId .
          ?place p:P625 ?coordStatement .
          ?coordStatement psv:P625 ?coordNode .
          ?coordNode wikibase:geoLatitude ?lat .
          ?coordNode wikibase:geoLongitude ?lon .
          OPTIONAL {{ ?place rdfs:label ?label . FILTER(LANG(?label) = "en") }}
          OPTIONAL {{ ?place rdfs:label ?labelDe . FILTER(LANG(?labelDe) = "de") }}
        }}
        """

        response = sparql_query(query)

        if response and 'results' in response:
            for binding in response['results']['bindings']:
                gid = binding['geonamesId']['value']
                results[gid] = {
                    'lat': float(binding['lat']['value']),
                    'lon': float(binding['lon']['value']),
                    'label_en': binding.get('label', {}).get('value'),
                    'label_de': binding.get('labelDe', {}).get('value')
                }

        # Rate limiting: Wikidata empfiehlt max 1 Request/Sekunde
        if i + batch_size < total:
            time.sleep(1.5)

    return results


def load_hsa_places(hsa_json_path: Path) -> list:
    """Lädt die GeoNames-IDs aus der HSA-JSON-Datei."""
    with open(hsa_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    geonames_ids = set()

    # Aus dem Places-Index
    for place_id, place_data in data.get('indices', {}).get('places', {}).items():
        if place_data.get('geonames_id'):
            geonames_ids.add(place_data['geonames_id'])

    # Aus den Briefen (mentionsPlace)
    for letter in data.get('letters', []):
        for place in letter.get('mentions', {}).get('places', []):
            if place.get('geonames_id'):
                geonames_ids.add(place['geonames_id'])

    return list(geonames_ids)


def main():
    base_dir = Path(__file__).parent.parent
    hsa_json = base_dir / 'docs' / 'data' / 'hsa-letters.json'
    output_file = base_dir / 'data' / 'geonames_coordinates.json'

    # 1. GeoNames-IDs aus HSA-Daten laden
    print("Loading GeoNames IDs from HSA data...")
    if not hsa_json.exists():
        print(f"HSA-JSON nicht gefunden: {hsa_json}")
        print("Bitte zuerst build_hsa_data.py ausführen.")
        return

    geonames_ids = load_hsa_places(hsa_json)
    print(f"Found {len(geonames_ids)} unique GeoNames IDs")

    # 2. Koordinaten via Wikidata auflösen
    print("\nResolving coordinates via Wikidata SPARQL...")
    coordinates = batch_resolve_geonames(geonames_ids)

    # 3. Statistik
    resolved = len(coordinates)
    missing = len(geonames_ids) - resolved
    print(f"\nResolved: {resolved}/{len(geonames_ids)} ({resolved/len(geonames_ids)*100:.1f}%)")
    print(f"Missing: {missing}")

    # 4. Speichern
    output = {
        'meta': {
            'source': 'Wikidata SPARQL',
            'total_requested': len(geonames_ids),
            'total_resolved': resolved,
            'coverage_pct': round(resolved / len(geonames_ids) * 100, 1)
        },
        'coordinates': coordinates
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nOutput: {output_file}")

    # 5. Fehlende IDs ausgeben (für manuelle Prüfung)
    missing_ids = [gid for gid in geonames_ids if gid not in coordinates]
    if missing_ids:
        missing_file = base_dir / 'data' / 'geonames_missing.json'
        with open(missing_file, 'w', encoding='utf-8') as f:
            json.dump(missing_ids, f, indent=2)
        print(f"Missing IDs saved to: {missing_file}")


if __name__ == '__main__':
    main()
