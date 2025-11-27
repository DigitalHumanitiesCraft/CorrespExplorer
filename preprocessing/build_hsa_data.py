"""
HSA-CMIF zu JSON Pipeline

Konvertiert die Hugo Schuchardt Archiv CMIF-Datei in ein JSON-Format
für das CorrespExplorer-Frontend.

Output: docs/data/hsa-letters.json
"""

from lxml import etree
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import json
import re


NS = {'tei': 'http://www.tei-c.org/ns/1.0'}


def extract_id_from_uri(uri: str) -> tuple:
    """Extrahiert ID und Typ aus einer URI."""
    if not uri:
        return None, None

    # VIAF
    if 'viaf.org' in uri:
        match = re.search(r'viaf/(\d+)', uri)
        return (match.group(1), 'viaf') if match else (None, 'viaf')

    # GeoNames
    if 'geonames.org' in uri:
        match = re.search(r'geonames\.org/(\d+)', uri)
        return (match.group(1), 'geonames') if match else (None, 'geonames')

    # HSA Subjects
    if 'hsa.subjects' in uri:
        match = re.search(r'#S\.(\d+)', uri)
        return (match.group(1), 'hsa_subject') if match else (None, 'hsa_subject')

    # HSA Languages
    if 'hsa.languages' in uri:
        match = re.search(r'#L\.(\d+)', uri)
        return (match.group(1), 'hsa_language') if match else (None, 'hsa_language')

    # Lexvo
    if 'lexvo.org' in uri:
        match = re.search(r'iso639-3/(\w+)', uri)
        return (match.group(1), 'lexvo') if match else (None, 'lexvo')

    # HSA internal person
    if 'schuchardt.uni-graz.at/id/person' in uri:
        match = re.search(r'person/(\d+)', uri)
        return (match.group(1), 'hsa_person') if match else (None, 'hsa_person')

    return uri, 'unknown'


def get_metadata_type(type_attr: str) -> str:
    """Extrahiert den Metadaten-Typ aus dem type-Attribut."""
    if not type_attr:
        return None

    if 'mentionsSubject' in type_attr:
        return 'mentionsSubject'
    if 'mentionsPlace' in type_attr:
        return 'mentionsPlace'
    if 'mentionsPerson' in type_attr:
        return 'mentionsPerson'
    if 'hasLanguage' in type_attr:
        return 'hasLanguage'

    return None


def extract_date_info(date_elem) -> dict:
    """Extrahiert Datumsinformationen mit Praezision und Sicherheit.

    Unterstuetzte CMIF-Attribute:
    - when: Exaktes oder unvollstaendiges Datum (YYYY, YYYY-MM, YYYY-MM-DD)
    - from/to: Zeitraum
    - notBefore/notAfter: Terminus post/ante quem
    - cert: Sicherheitsgrad (high/medium/low)
    """
    if date_elem is None:
        return {
            'date': None,
            'dateTo': None,
            'year': None,
            'datePrecision': 'unknown',
            'dateCertainty': 'high'
        }

    when = date_elem.get('when', '')
    from_date = date_elem.get('from', '')
    to_date = date_elem.get('to', '')
    not_before = date_elem.get('notBefore', '')
    not_after = date_elem.get('notAfter', '')
    cert = date_elem.get('cert', 'high')

    # Primaeres Datum bestimmen
    date_str = when or from_date or not_before
    date_to = to_date or not_after or None

    # Jahr extrahieren
    year = None
    if date_str:
        try:
            year = int(date_str[:4])
        except (ValueError, IndexError):
            pass

    # Praezision bestimmen
    precision = 'unknown'
    if from_date and to_date:
        precision = 'range'
    elif not_before or not_after:
        precision = 'range'
    elif when:
        if len(when) == 10:  # YYYY-MM-DD
            precision = 'day'
        elif len(when) == 7:  # YYYY-MM
            precision = 'month'
        elif len(when) == 4:  # YYYY
            precision = 'year'

    return {
        'date': date_str if date_str else None,
        'dateTo': date_to,
        'year': year,
        'datePrecision': precision,
        'dateCertainty': cert
    }


def parse_cmif(file_path: Path) -> dict:
    """Parst die CMIF-Datei und erzeugt Frontend-taugliche Datenstruktur."""

    print(f"Parsing {file_path}...")
    tree = etree.parse(str(file_path))
    root = tree.getroot()

    # Datenstrukturen
    letters = []
    persons_index = {}  # {viaf_id: {name, letters_sent, letters_received}}
    places_index = {}   # {geonames_id: {name, lat, lon}}
    subjects_index = {} # {uri: {label, category}}
    languages_index = {} # {code: label}

    # Alle correspDesc durchgehen
    for corresp in root.findall('.//tei:correspDesc', NS):
        letter_url = corresp.get('ref', '')
        letter_id = letter_url.split('/')[-1] if letter_url else ''

        letter = {
            'id': letter_id,
            'url': letter_url,
            'sender': None,
            'recipient': None,
            'date': None,
            'dateTo': None,
            'year': None,
            'datePrecision': 'unknown',
            'dateCertainty': 'high',
            'place_sent': None,
            'language': None,
            'mentions': {
                'subjects': [],
                'persons': [],
                'places': []
            }
        }

        # Sender
        sent_action = corresp.find('.//tei:correspAction[@type="sent"]', NS)
        if sent_action is not None:
            sender_elem = sent_action.find('tei:persName', NS)
            if sender_elem is not None:
                name = sender_elem.text or ''
                ref = sender_elem.get('ref', '')
                auth_id, auth_type = extract_id_from_uri(ref)

                letter['sender'] = {
                    'name': name,
                    'id': auth_id,
                    'authority': auth_type
                }

                # Person zum Index hinzufügen
                if auth_id and auth_type == 'viaf':
                    if auth_id not in persons_index:
                        persons_index[auth_id] = {
                            'name': name,
                            'viaf': auth_id,
                            'letters_sent': 0,
                            'letters_received': 0
                        }
                    persons_index[auth_id]['letters_sent'] += 1

            # Absende-Ort
            place_elem = sent_action.find('tei:placeName', NS)
            if place_elem is not None:
                place_name = place_elem.text or ''
                ref = place_elem.get('ref', '')
                geo_id, _ = extract_id_from_uri(ref)

                letter['place_sent'] = {
                    'name': place_name,
                    'geonames_id': geo_id
                }

                # Ort zum Index hinzufügen
                if geo_id:
                    if geo_id not in places_index:
                        places_index[geo_id] = {
                            'name': place_name,
                            'geonames_id': geo_id,
                            'letter_count': 0
                        }
                    places_index[geo_id]['letter_count'] += 1

            # Datum mit Praezision
            date_elem = sent_action.find('tei:date', NS)
            date_info = extract_date_info(date_elem)
            letter['date'] = date_info['date']
            letter['dateTo'] = date_info['dateTo']
            letter['year'] = date_info['year']
            letter['datePrecision'] = date_info['datePrecision']
            letter['dateCertainty'] = date_info['dateCertainty']

        # Empfänger
        recv_action = corresp.find('.//tei:correspAction[@type="received"]', NS)
        if recv_action is not None:
            recipient_elem = recv_action.find('tei:persName', NS)
            if recipient_elem is not None:
                name = recipient_elem.text or ''
                ref = recipient_elem.get('ref', '')
                auth_id, auth_type = extract_id_from_uri(ref)

                letter['recipient'] = {
                    'name': name,
                    'id': auth_id,
                    'authority': auth_type
                }

                # Person zum Index hinzufügen
                if auth_id and auth_type == 'viaf':
                    if auth_id not in persons_index:
                        persons_index[auth_id] = {
                            'name': name,
                            'viaf': auth_id,
                            'letters_sent': 0,
                            'letters_received': 0
                        }
                    persons_index[auth_id]['letters_received'] += 1

        # Metadaten aus note
        note = corresp.find('tei:note', NS)
        if note is not None:
            for ref_elem in note.findall('tei:ref', NS):
                type_attr = ref_elem.get('type', '')
                target = ref_elem.get('target', '')
                label = ref_elem.text or ''

                meta_type = get_metadata_type(type_attr)

                if meta_type == 'hasLanguage':
                    letter['language'] = {
                        'code': target,
                        'label': label
                    }
                    if target not in languages_index:
                        languages_index[target] = label

                elif meta_type == 'mentionsSubject':
                    subj_id, subj_type = extract_id_from_uri(target)
                    letter['mentions']['subjects'].append({
                        'uri': target,
                        'label': label,
                        'category': subj_type
                    })
                    if target not in subjects_index:
                        subjects_index[target] = {
                            'label': label,
                            'category': subj_type,
                            'count': 0
                        }
                    subjects_index[target]['count'] += 1

                elif meta_type == 'mentionsPlace':
                    geo_id, _ = extract_id_from_uri(target)
                    letter['mentions']['places'].append({
                        'name': label,
                        'geonames_id': geo_id
                    })

                elif meta_type == 'mentionsPerson':
                    pers_id, pers_type = extract_id_from_uri(target)
                    letter['mentions']['persons'].append({
                        'name': label,
                        'id': pers_id,
                        'authority': pers_type
                    })

        letters.append(letter)

    # Timeline berechnen
    year_counts = defaultdict(int)
    for letter in letters:
        if letter['year']:
            year_counts[letter['year']] += 1

    timeline = [{'year': y, 'count': c} for y, c in sorted(year_counts.items())]

    # Sprachverteilung
    lang_counts = defaultdict(int)
    for letter in letters:
        if letter['language']:
            lang_counts[letter['language']['code']] += 1

    # Unsicherheits-Statistiken
    precision_counts = defaultdict(int)
    certainty_counts = defaultdict(int)
    for letter in letters:
        precision_counts[letter['datePrecision']] += 1
        certainty_counts[letter['dateCertainty']] += 1

    imprecise_dates = (
        precision_counts['year'] +
        precision_counts['month'] +
        precision_counts['range'] +
        precision_counts['unknown']
    )

    # Output-Struktur
    output = {
        'meta': {
            'generated': datetime.now().isoformat(),
            'source': 'Hugo Schuchardt Archiv CMIF',
            'source_file': 'data/hsa/CMIF.xml',
            'total_letters': len(letters),
            'unique_senders': len([p for p in persons_index.values() if p['letters_sent'] > 0]),
            'unique_recipients': len([p for p in persons_index.values() if p['letters_received'] > 0]),
            'unique_places': len(places_index),
            'unique_subjects': len(subjects_index),
            'languages': len(languages_index),
            'date_range': {
                'min': min((l['year'] for l in letters if l['year']), default=None),
                'max': max((l['year'] for l in letters if l['year']), default=None)
            },
            'timeline': timeline,
            'uncertainty': {
                'date_precision': {
                    'day': precision_counts['day'],
                    'month': precision_counts['month'],
                    'year': precision_counts['year'],
                    'range': precision_counts['range'],
                    'unknown': precision_counts['unknown']
                },
                'date_certainty': {
                    'high': certainty_counts['high'],
                    'medium': certainty_counts['medium'],
                    'low': certainty_counts['low']
                },
                'imprecise_dates_total': imprecise_dates,
                'imprecise_dates_pct': round(imprecise_dates / len(letters) * 100, 1) if letters else 0
            }
        },
        'letters': letters,
        'indices': {
            'persons': persons_index,
            'places': places_index,
            'subjects': subjects_index,
            'languages': languages_index
        }
    }

    return output


def load_coordinates(coords_file: Path) -> dict:
    """Lädt die GeoNames-Koordinaten aus der Wikidata-Auflösung."""
    if not coords_file.exists():
        print(f"Koordinaten-Datei nicht gefunden: {coords_file}")
        print("Bitte zuerst resolve_geonames_wikidata.py ausführen.")
        return {}

    with open(coords_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return data.get('coordinates', {})


def enrich_with_coordinates(data: dict, coordinates: dict) -> dict:
    """Reichert die Daten mit Koordinaten an."""
    places_with_coords = 0
    places_without_coords = 0

    # Places-Index anreichern
    for geo_id, place_data in data['indices']['places'].items():
        if geo_id in coordinates:
            place_data['lat'] = coordinates[geo_id]['lat']
            place_data['lon'] = coordinates[geo_id]['lon']
            places_with_coords += 1
        else:
            places_without_coords += 1

    # Briefe anreichern (place_sent)
    for letter in data['letters']:
        if letter.get('place_sent') and letter['place_sent'].get('geonames_id'):
            geo_id = letter['place_sent']['geonames_id']
            if geo_id in coordinates:
                letter['place_sent']['lat'] = coordinates[geo_id]['lat']
                letter['place_sent']['lon'] = coordinates[geo_id]['lon']

        # mentions.places anreichern
        for place in letter.get('mentions', {}).get('places', []):
            geo_id = place.get('geonames_id')
            if geo_id and geo_id in coordinates:
                place['lat'] = coordinates[geo_id]['lat']
                place['lon'] = coordinates[geo_id]['lon']

    # Meta-Statistik aktualisieren
    data['meta']['places_with_coordinates'] = places_with_coords
    data['meta']['places_without_coordinates'] = places_without_coords
    data['meta']['coordinate_coverage_pct'] = round(
        places_with_coords / (places_with_coords + places_without_coords) * 100, 1
    ) if (places_with_coords + places_without_coords) > 0 else 0

    return data


def main():
    base_dir = Path(__file__).parent.parent
    cmif_file = base_dir / 'data' / 'hsa' / 'CMIF.xml'
    coords_file = base_dir / 'data' / 'geonames_coordinates.json'
    output_file = base_dir / 'docs' / 'data' / 'hsa-letters.json'

    if not cmif_file.exists():
        print(f"Datei nicht gefunden: {cmif_file}")
        return

    # Parsen und konvertieren
    data = parse_cmif(cmif_file)

    # Koordinaten laden und anreichern
    print("Loading coordinates...")
    coordinates = load_coordinates(coords_file)
    if coordinates:
        print(f"Found {len(coordinates)} coordinate entries")
        data = enrich_with_coordinates(data, coordinates)
        print(f"Coordinate coverage: {data['meta']['coordinate_coverage_pct']}%")

    # JSON schreiben
    print(f"Writing {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Zusammenfassung
    print("\n" + "="*50)
    print("HSA-CMIF EXPORT ZUSAMMENFASSUNG")
    print("="*50)
    print(f"Briefe: {data['meta']['total_letters']}")
    print(f"Sender: {data['meta']['unique_senders']}")
    print(f"Empfaenger: {data['meta']['unique_recipients']}")
    print(f"Orte: {data['meta']['unique_places']}")
    print(f"Subjects: {data['meta']['unique_subjects']}")
    print(f"Sprachen: {data['meta']['languages']}")
    print(f"Zeitraum: {data['meta']['date_range']['min']}-{data['meta']['date_range']['max']}")

    # Unsicherheits-Statistiken
    unc = data['meta']['uncertainty']
    print("\nDatumspraezision:")
    print(f"  - Exakt (Tag): {unc['date_precision']['day']}")
    print(f"  - Monat: {unc['date_precision']['month']}")
    print(f"  - Jahr: {unc['date_precision']['year']}")
    print(f"  - Zeitraum: {unc['date_precision']['range']}")
    print(f"  - Unbekannt: {unc['date_precision']['unknown']}")
    print(f"  => Unscharf gesamt: {unc['imprecise_dates_total']} ({unc['imprecise_dates_pct']}%)")

    print(f"\nOutput: {output_file}")
    print(f"Dateigroesse: {output_file.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == '__main__':
    main()
