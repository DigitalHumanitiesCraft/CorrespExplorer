#!/usr/bin/env python3
"""
Integrate AGRELON relations from SNDB into persons.json

Reads:
- data/SNDB/pers_koerp_beziehungen.xml (person relations)
- data/SNDB/nsl_agrelon.xml (AGRELON taxonomy)
- docs/data/persons.json (current person data)

Writes:
- docs/data/persons.json (with relations field added)

Usage:
    python preprocessing/integrate_relations.py
"""

import json
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict


# AGRELON ID to category mapping
# Based on nsl_agrelon.xml categories
AGRELON_CATEGORIES = {
    # Verwandtschaft (Familie)
    '4010': 'Familie',  # hat Elternteil
    '4012': 'Familie',  # hat Pflegeelternteil
    '4020': 'Familie',  # hat Großelternteil
    '4030': 'Familie',  # hat Kind
    '4032': 'Familie',  # hat Pflegekind
    '4040': 'Familie',  # hat Enkel
    '4050': 'Familie',  # hat Tante/Onkel
    '4060': 'Familie',  # hat Cousin
    '4070': 'Familie',  # hat Patenkind
    '4080': 'Familie',  # hat Pate
    '4090': 'Familie',  # hat Schwager/Schwägerin
    '4100': 'Familie',  # hat Ehepartner
    '4110': 'Familie',  # hat Nichte/Neffe
    '4120': 'Familie',  # hat Geschwister
    '4130': 'Familie',  # hat Urenkel
    '4140': 'Familie',  # hat Urgroßelternteil

    # Beruflicher Kontakt
    '3010': 'Beruflich',  # hat Kollaborator
    '3020': 'Beruflich',  # hat Einfluss auf
    '3030': 'Beruflich',  # ist beeinflusst durch
    '3040': 'Beruflich',  # hat Muse
    '3050': 'Beruflich',  # ist Muse von
    '3060': 'Beruflich',  # hat Mäzen
    '3070': 'Beruflich',  # ist Mäzen von
    '3080': 'Beruflich',  # hat Schüler
    '3090': 'Beruflich',  # hat Lehrer
    '3100': 'Beruflich',  # hat Vorgänger
    '3110': 'Beruflich',  # hat Nachfolger

    # Private Bekanntschaft (Sozial)
    '1010': 'Sozial',  # hat Freund

    # Gruppenbeteiligung (Sozial)
    '2010': 'Sozial',  # hat Gründer
    '2020': 'Sozial',  # ist Gründer von
    '2030': 'Sozial',  # hat Mitglied
    '2040': 'Sozial',  # ist Mitglied von
    '2050': 'Sozial',  # hat Besitzer
    '2060': 'Sozial',  # ist Besitzer von

    # Vitaler/letaler Kontakt (filtered out)
    # '5010': 'Medizinisch',  # hat Arzt
    # '5020': 'Medizinisch',  # ist Arzt von
    # '5030': 'Unbekannt',    # hat Mordopfer
    # '5040': 'Unbekannt',    # hat Mörder

    # Geografikum (filtered out - not person relations)
    # '7010': 'Unbekannt',  # ist übergeordnet
    # '7020': 'Unbekannt',  # ist untergeordnet

    # Werk (filtered out - not person relations)
    # '8010': 'Unbekannt',  # ist Übersetzung von
    # '8020': 'Unbekannt',  # hat Übersetzung
    # '8030': 'Unbekannt',  # ist Rezension von
    # '8040': 'Unbekannt',  # hat Rezension
}


def parse_agrelon_taxonomy(xml_path):
    """Parse nsl_agrelon.xml to get AGRELON type names"""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    agrelon_types = {}
    for item in root.findall('ITEM'):
        ident = item.find('IDENT').text
        beziehung = item.find('BEZIEHUNG')
        kategorie = item.find('KATEGORIE')

        agrelon_types[ident] = {
            'type': beziehung.text if beziehung is not None else 'Unbekannt',
            'category': kategorie.text if kategorie is not None else 'Unbekannt'
        }

    return agrelon_types


def parse_relations(xml_path):
    """Parse pers_koerp_beziehungen.xml to get person relations"""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    relations = defaultdict(list)

    for item in root.findall('ITEM'):
        id1 = item.find('ID1').text
        id2 = item.find('ID2').text
        agrelon_id1 = item.find('AGRELON_ID1').text
        agrelon_id2 = item.find('AGRELON_ID2').text

        # Add relation from person ID1 to ID2
        relations[id1].append({
            'target': id2,
            'agrelon_id': agrelon_id1
        })

        # Add reverse relation from ID2 to ID1
        relations[id2].append({
            'target': id1,
            'agrelon_id': agrelon_id2
        })

    return relations


def integrate_relations(persons_json_path, relations, agrelon_types):
    """Add relations to persons.json"""

    # Load persons.json
    with open(persons_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    persons_by_id = {p['id']: p for p in data['persons']}

    stats = {
        'total_persons': len(data['persons']),
        'persons_with_relations': 0,
        'total_relations': 0,
        'by_category': defaultdict(int)
    }

    # Add relations to each person
    for person in data['persons']:
        person_id = person['id']

        if person_id in relations:
            person_relations = []

            for rel in relations[person_id]:
                target_id = rel['target']
                agrelon_id = rel['agrelon_id']

                # Skip if target person not in our dataset
                if target_id not in persons_by_id:
                    continue

                # Get category
                category = AGRELON_CATEGORIES.get(agrelon_id, 'Unbekannt')

                # Skip Unbekannt categories
                if category == 'Unbekannt':
                    continue

                # Get type name
                agrelon_info = agrelon_types.get(agrelon_id, {})
                type_name = agrelon_info.get('type', 'Unbekannt')

                person_relations.append({
                    'target': target_id,
                    'type': type_name,
                    'agrelon_id': agrelon_id
                })

                stats['total_relations'] += 1
                stats['by_category'][category] += 1

            if person_relations:
                person['relations'] = person_relations
                stats['persons_with_relations'] += 1

    # Write updated persons.json
    with open(persons_json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return stats


def main():
    base_path = Path(__file__).parent.parent

    sndb_path = base_path / 'data' / 'SNDB'
    persons_json_path = base_path / 'docs' / 'data' / 'persons.json'

    print('Parsing AGRELON taxonomy...')
    agrelon_types = parse_agrelon_taxonomy(sndb_path / 'nsl_agrelon.xml')
    print(f'   Found {len(agrelon_types)} AGRELON types')

    print('\nParsing person relations...')
    relations = parse_relations(sndb_path / 'pers_koerp_beziehungen.xml')
    print(f'   Found relations for {len(relations)} persons')

    print('\nIntegrating relations into persons.json...')
    stats = integrate_relations(persons_json_path, relations, agrelon_types)

    print('\nDone!')
    print(f'\nStatistics:')
    print(f'  Total persons: {stats["total_persons"]}')
    print(f'  Persons with relations: {stats["persons_with_relations"]}')
    print(f'  Total relations added: {stats["total_relations"]}')
    print(f'\n  By category:')
    for category, count in sorted(stats['by_category'].items()):
        print(f'    {category}: {count}')

    print(f'\nUpdated: {persons_json_path}')


if __name__ == '__main__':
    main()
