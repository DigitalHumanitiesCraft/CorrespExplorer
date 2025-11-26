"""
HSA-CMIF Strukturanalyse

Analysiert die Datenstruktur der Hugo Schuchardt Archiv CMIF-Datei.
Fokus auf Kategorien, Typen und Strukturen für Visualisierungen.

Ausgabe: Strukturelle Erkenntnisse für CMIF-Data.md
"""

from lxml import etree
from pathlib import Path
from collections import defaultdict
import json
import re

# Namespaces
NS = {'tei': 'http://www.tei-c.org/ns/1.0'}

def extract_id_from_uri(uri: str) -> tuple[str, str]:
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

    # Lexvo (ISO 639-3)
    if 'lexvo.org' in uri:
        match = re.search(r'iso639-3/(\w+)', uri)
        return (match.group(1), 'lexvo') if match else (None, 'lexvo')

    # HSA internal person
    if 'schuchardt.uni-graz.at/id/person' in uri:
        match = re.search(r'person/(\d+)', uri)
        return (match.group(1), 'hsa_person') if match else (None, 'hsa_person')

    # GND (for comparison)
    if 'd-nb.info/gnd' in uri:
        match = re.search(r'gnd/(\d+X?)', uri)
        return (match.group(1), 'gnd') if match else (None, 'gnd')

    return uri, 'unknown'


def get_metadata_type(type_attr: str) -> str:
    """Extrahiert den Metadaten-Typ aus dem type-Attribut."""
    if not type_attr:
        return None

    # LOD Academy vocabulary
    if 'mentionsSubject' in type_attr:
        return 'mentionsSubject'
    if 'mentionsPlace' in type_attr:
        return 'mentionsPlace'
    if 'mentionsPerson' in type_attr:
        return 'mentionsPerson'
    if 'hasLanguage' in type_attr:
        return 'hasLanguage'
    if 'isPublishedWith' in type_attr:
        return 'isPublishedWith'
    if 'isAvailableAsTEIfile' in type_attr:
        return 'isAvailableAsTEIfile'

    # CMIF prefix style (PROPYLAEN)
    if type_attr.startswith('cmif:'):
        return type_attr.replace('cmif:', '')

    return type_attr


def analyze_cmif(file_path: Path) -> dict:
    """Analysiert die CMIF-Datei und extrahiert strukturelle Informationen."""

    print(f"Parsing {file_path}...")
    tree = etree.parse(str(file_path))
    root = tree.getroot()

    # Strukturen für Analyse
    structure = {
        'letters': {
            'total': 0,
            'with_date': 0,
            'with_place_sent': 0,
            'date_formats': set(),
        },
        'persons': {
            'senders': {},      # {name: {authority_type, authority_id, count}}
            'recipients': {},
            'mentioned': {},
            'authority_types': defaultdict(int),
        },
        'places': {
            'sent_from': {},    # {name: {geonames_id, count}}
            'mentioned': {},
        },
        'languages': {
            'codes': {},        # {code: {label, count}}
        },
        'subjects': {
            'items': {},        # {uri: {label, type, count}}
            'categories': defaultdict(list),  # Gruppierung nach Typ
        },
        'metadata_types': defaultdict(int),
    }

    # Alle correspDesc durchgehen
    for corresp in root.findall('.//tei:correspDesc', NS):
        structure['letters']['total'] += 1
        letter_id = corresp.get('ref', '')

        # Sender analysieren
        sent_action = corresp.find('.//tei:correspAction[@type="sent"]', NS)
        if sent_action is not None:
            # Person
            sender = sent_action.find('tei:persName', NS)
            if sender is not None:
                name = sender.text or ''
                ref = sender.get('ref', '')
                auth_id, auth_type = extract_id_from_uri(ref)

                if name not in structure['persons']['senders']:
                    structure['persons']['senders'][name] = {
                        'authority_type': auth_type,
                        'authority_id': auth_id,
                        'count': 0
                    }
                structure['persons']['senders'][name]['count'] += 1
                structure['persons']['authority_types'][auth_type] += 1

            # Ort
            place = sent_action.find('tei:placeName', NS)
            if place is not None:
                structure['letters']['with_place_sent'] += 1
                place_name = place.text or ''
                ref = place.get('ref', '')
                geo_id, _ = extract_id_from_uri(ref)

                if place_name not in structure['places']['sent_from']:
                    structure['places']['sent_from'][place_name] = {
                        'geonames_id': geo_id,
                        'count': 0
                    }
                structure['places']['sent_from'][place_name]['count'] += 1

            # Datum
            date_elem = sent_action.find('tei:date', NS)
            if date_elem is not None:
                structure['letters']['with_date'] += 1
                # Datumsformat-Varianten sammeln
                for attr in ['when', 'notBefore', 'notAfter', 'from', 'to']:
                    if date_elem.get(attr):
                        structure['letters']['date_formats'].add(attr)

        # Empfänger analysieren
        recv_action = corresp.find('.//tei:correspAction[@type="received"]', NS)
        if recv_action is not None:
            recipient = recv_action.find('tei:persName', NS)
            if recipient is not None:
                name = recipient.text or ''
                ref = recipient.get('ref', '')
                auth_id, auth_type = extract_id_from_uri(ref)

                if name not in structure['persons']['recipients']:
                    structure['persons']['recipients'][name] = {
                        'authority_type': auth_type,
                        'authority_id': auth_id,
                        'count': 0
                    }
                structure['persons']['recipients'][name]['count'] += 1

        # Note-Metadaten analysieren
        note = corresp.find('tei:note', NS)
        if note is not None:
            for ref_elem in note.findall('tei:ref', NS):
                type_attr = ref_elem.get('type', '')
                target = ref_elem.get('target', '')
                label = ref_elem.text or ''

                meta_type = get_metadata_type(type_attr)
                structure['metadata_types'][meta_type] += 1

                if meta_type == 'hasLanguage':
                    code = target
                    if code not in structure['languages']['codes']:
                        structure['languages']['codes'][code] = {
                            'label': label,
                            'count': 0
                        }
                    structure['languages']['codes'][code]['count'] += 1

                elif meta_type == 'mentionsSubject':
                    if target not in structure['subjects']['items']:
                        # Kategorisierung nach URI-Typ
                        _, uri_type = extract_id_from_uri(target)
                        structure['subjects']['items'][target] = {
                            'label': label,
                            'uri_type': uri_type,
                            'count': 0
                        }
                        structure['subjects']['categories'][uri_type].append(target)
                    structure['subjects']['items'][target]['count'] += 1

                elif meta_type == 'mentionsPlace':
                    geo_id, _ = extract_id_from_uri(target)
                    if label not in structure['places']['mentioned']:
                        structure['places']['mentioned'][label] = {
                            'geonames_id': geo_id,
                            'count': 0
                        }
                    structure['places']['mentioned'][label]['count'] += 1

                elif meta_type == 'mentionsPerson':
                    auth_id, auth_type = extract_id_from_uri(target)
                    if label not in structure['persons']['mentioned']:
                        structure['persons']['mentioned'][label] = {
                            'authority_type': auth_type,
                            'authority_id': auth_id,
                            'count': 0
                        }
                    structure['persons']['mentioned'][label]['count'] += 1

    # Sets zu Listen konvertieren für JSON
    structure['letters']['date_formats'] = list(structure['letters']['date_formats'])
    structure['metadata_types'] = dict(structure['metadata_types'])
    structure['persons']['authority_types'] = dict(structure['persons']['authority_types'])
    structure['subjects']['categories'] = {k: len(v) for k, v in structure['subjects']['categories'].items()}

    return structure


def print_structure_report(structure: dict):
    """Gibt einen strukturierten Bericht aus."""

    print("\n" + "="*60)
    print("HSA-CMIF STRUKTURANALYSE")
    print("="*60)

    # Briefe
    print(f"\n## Briefe")
    print(f"- Gesamt: {structure['letters']['total']}")
    print(f"- Mit Datum: {structure['letters']['with_date']}")
    print(f"- Mit Absende-Ort: {structure['letters']['with_place_sent']}")
    print(f"- Datumsformate: {', '.join(structure['letters']['date_formats'])}")

    # Personen
    print(f"\n## Personen")
    print(f"- Eindeutige Sender: {len(structure['persons']['senders'])}")
    print(f"- Eindeutige Empfänger: {len(structure['persons']['recipients'])}")
    print(f"- Erwähnte Personen: {len(structure['persons']['mentioned'])}")
    print(f"- Authority-Typen: {structure['persons']['authority_types']}")

    # Top Sender
    print(f"\n### Top 10 Sender")
    top_senders = sorted(structure['persons']['senders'].items(),
                         key=lambda x: x[1]['count'], reverse=True)[:10]
    for name, data in top_senders:
        print(f"  - {name}: {data['count']} Briefe ({data['authority_type']})")

    # Top Empfänger
    print(f"\n### Top 10 Empfänger")
    top_recipients = sorted(structure['persons']['recipients'].items(),
                            key=lambda x: x[1]['count'], reverse=True)[:10]
    for name, data in top_recipients:
        print(f"  - {name}: {data['count']} Briefe ({data['authority_type']})")

    # Orte
    print(f"\n## Orte")
    print(f"- Absende-Orte (eindeutig): {len(structure['places']['sent_from'])}")
    print(f"- Erwähnte Orte (eindeutig): {len(structure['places']['mentioned'])}")

    print(f"\n### Top 10 Absende-Orte")
    top_places = sorted(structure['places']['sent_from'].items(),
                        key=lambda x: x[1]['count'], reverse=True)[:10]
    for name, data in top_places:
        print(f"  - {name}: {data['count']} (GeoNames: {data['geonames_id']})")

    print(f"\n### Top 10 erwähnte Orte")
    top_mentioned = sorted(structure['places']['mentioned'].items(),
                           key=lambda x: x[1]['count'], reverse=True)[:10]
    for name, data in top_mentioned:
        print(f"  - {name}: {data['count']} Erwähnungen")

    # Sprachen
    print(f"\n## Sprachen (hasLanguage)")
    print(f"- Eindeutige Sprachen: {len(structure['languages']['codes'])}")
    for code, data in sorted(structure['languages']['codes'].items(),
                             key=lambda x: x[1]['count'], reverse=True):
        print(f"  - {code} ({data['label']}): {data['count']}")

    # Subjects
    print(f"\n## Subjects (mentionsSubject)")
    print(f"- Eindeutige Subjects: {len(structure['subjects']['items'])}")
    print(f"- Nach Kategorie:")
    for cat, count in sorted(structure['subjects']['categories'].items(),
                             key=lambda x: x[1], reverse=True):
        print(f"  - {cat}: {count} verschiedene")

    print(f"\n### Top 20 Subjects")
    top_subjects = sorted(structure['subjects']['items'].items(),
                          key=lambda x: x[1]['count'], reverse=True)[:20]
    for uri, data in top_subjects:
        print(f"  - {data['label']}: {data['count']} ({data['uri_type']})")

    # Metadaten-Typen
    print(f"\n## Metadaten-Typen im note-Element")
    for meta_type, count in sorted(structure['metadata_types'].items(),
                                   key=lambda x: x[1], reverse=True):
        print(f"  - {meta_type}: {count}")


def export_for_documentation(structure: dict, output_path: Path):
    """Exportiert die Struktur als JSON für die Dokumentation."""

    # Kompakte Version für Dokumentation
    doc_structure = {
        'overview': {
            'total_letters': structure['letters']['total'],
            'unique_senders': len(structure['persons']['senders']),
            'unique_recipients': len(structure['persons']['recipients']),
            'unique_places_sent': len(structure['places']['sent_from']),
            'unique_places_mentioned': len(structure['places']['mentioned']),
            'unique_subjects': len(structure['subjects']['items']),
            'unique_persons_mentioned': len(structure['persons']['mentioned']),
            'languages': len(structure['languages']['codes']),
        },
        'authority_systems': structure['persons']['authority_types'],
        'date_formats': structure['letters']['date_formats'],
        'metadata_types': structure['metadata_types'],
        'subject_categories': structure['subjects']['categories'],
        'languages': structure['languages']['codes'],
        'top_senders': {k: v for k, v in sorted(
            structure['persons']['senders'].items(),
            key=lambda x: x[1]['count'], reverse=True)[:20]},
        'top_recipients': {k: v for k, v in sorted(
            structure['persons']['recipients'].items(),
            key=lambda x: x[1]['count'], reverse=True)[:10]},
        'top_places_sent': {k: v for k, v in sorted(
            structure['places']['sent_from'].items(),
            key=lambda x: x[1]['count'], reverse=True)[:20]},
        'top_places_mentioned': {k: v for k, v in sorted(
            structure['places']['mentioned'].items(),
            key=lambda x: x[1]['count'], reverse=True)[:20]},
        'top_subjects': {k: v for k, v in sorted(
            structure['subjects']['items'].items(),
            key=lambda x: x[1]['count'], reverse=True)[:30]},
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(doc_structure, f, indent=2, ensure_ascii=False)

    print(f"\nStruktur exportiert nach: {output_path}")


if __name__ == '__main__':
    # Pfade
    base_dir = Path(__file__).parent.parent
    cmif_file = base_dir / 'data' / 'hsa' / 'CMIF.xml'
    output_file = base_dir / 'docs' / 'knowledge-correspexplorer' / 'hsa-structure.json'

    if not cmif_file.exists():
        print(f"Datei nicht gefunden: {cmif_file}")
        exit(1)

    # Analyse durchführen
    structure = analyze_cmif(cmif_file)

    # Bericht ausgeben
    print_structure_report(structure)

    # JSON exportieren
    export_for_documentation(structure, output_file)
