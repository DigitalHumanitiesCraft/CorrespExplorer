#!/usr/bin/env python3
"""
Analyze persons.json data coverage for HerData requirements validation.
"""
import json
from collections import Counter, defaultdict

def analyze_persons_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    persons = data['persons']
    total = len(persons)

    print(f"=== DATA COVERAGE ANALYSIS ===\n")
    print(f"Total persons: {total}\n")

    # Basic field coverage
    print("=== FIELD COVERAGE ===")
    fields_with_data = {
        'id': 0,
        'name': 0,
        'gnd': 0,
        'biography': 0,
        'dates.birth': 0,
        'dates.death': 0,
        'occupations': 0,
        'places': 0,
        'normierung': 0,
        'role': 0
    }

    for p in persons:
        if p.get('id'):
            fields_with_data['id'] += 1
        if p.get('name'):
            fields_with_data['name'] += 1
        if p.get('gnd'):
            fields_with_data['gnd'] += 1
        if p.get('biography'):
            fields_with_data['biography'] += 1
        if p.get('dates', {}).get('birth'):
            fields_with_data['dates.birth'] += 1
        if p.get('dates', {}).get('death'):
            fields_with_data['dates.death'] += 1
        if p.get('occupations') and len(p['occupations']) > 0:
            fields_with_data['occupations'] += 1
        if p.get('places') and len(p['places']) > 0:
            fields_with_data['places'] += 1
        if p.get('normierung'):
            fields_with_data['normierung'] += 1
        if p.get('role'):
            fields_with_data['role'] += 1

    for field, count in fields_with_data.items():
        pct = (count / total) * 100
        print(f"{field:20s}: {count:4d} / {total} ({pct:5.1f}%)")

    # Analyze what additional data is in persons
    print("\n=== SAMPLE PERSON STRUCTURE ===")
    sample = persons[0]
    print(json.dumps(sample, indent=2, ensure_ascii=False)[:1000])

    # Occupation analysis
    print("\n=== OCCUPATION ANALYSIS ===")
    all_occupation_names = []
    persons_with_multi = 0
    for p in persons:
        occs = p.get('occupations', [])
        if len(occs) > 1:
            persons_with_multi += 1
        for occ in occs:
            if isinstance(occ, dict):
                all_occupation_names.append(occ.get('name', 'Unknown'))
            else:
                all_occupation_names.append(str(occ))

    print(f"Total occupation entries: {len(all_occupation_names)}")
    print(f"Unique occupations: {len(set(all_occupation_names))}")
    print(f"Persons with multiple occupations: {persons_with_multi} ({persons_with_multi/total*100:.1f}%)")
    print(f"\nTop 10 occupations:")
    for occ, count in Counter(all_occupation_names).most_common(10):
        print(f"  {occ:30s}: {count:3d} ({count/len(all_occupation_names)*100:5.1f}%)")

    # Place analysis
    print("\n=== PLACE ANALYSIS ===")
    all_places = []
    place_types = Counter()
    for p in persons:
        for place in p.get('places', []):
            if isinstance(place, dict):
                place_name = place.get('name', 'Unknown')
                place_type = place.get('type', 'Unknown')
                all_places.append(place_name)
                place_types[place_type] += 1

    print(f"Total place entries: {len(all_places)}")
    print(f"Unique places: {len(set(all_places))}")
    print(f"\nPlace types:")
    for ptype, count in place_types.most_common():
        print(f"  {ptype:20s}: {count:4d} ({count/len(all_places)*100:5.1f}%)")
    print(f"\nTop 10 places:")
    for place, count in Counter(all_places).most_common(10):
        print(f"  {place:30s}: {count:3d}")

    # Role analysis
    print("\n=== ROLE ANALYSIS (BRIEFKORPUS) ===")
    roles = Counter([p.get('role', 'unknown') for p in persons])
    for role, count in roles.most_common():
        print(f"  {role:20s}: {count:4d} ({count/total*100:5.1f}%)")

    # Check for relationship data
    print("\n=== RELATIONSHIP DATA CHECK ===")
    has_relations = 0
    sample_with_relations = None
    for p in persons:
        if 'relations' in p or 'relationships' in p or 'network' in p:
            has_relations += 1
            if not sample_with_relations:
                sample_with_relations = p

    print(f"Persons with relationship data in JSON: {has_relations}")
    if sample_with_relations:
        print("Sample:", json.dumps(sample_with_relations, indent=2, ensure_ascii=False)[:500])
    else:
        print("NOTE: No relationship data found in persons.json")
        print("Relationships might be in separate file or not yet integrated")

    # Check for letters data
    print("\n=== LETTER DATA CHECK ===")
    has_letters = 0
    for p in persons:
        if 'letters' in p or 'correspondence' in p:
            has_letters += 1
    print(f"Persons with letter data in JSON: {has_letters}")
    if has_letters == 0:
        print("NOTE: No letter data found in persons.json")
        print("CMIF letter data might need separate integration")

if __name__ == '__main__':
    analyze_persons_json('/home/user/HerData/docs/data/persons.json')
