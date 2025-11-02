"""
Add biographical texts from SNDB project files to persons.json

This script loads biographical texts from:
- pers_koerp_projekt_goebriefe.xml (Goethe letters index)
- pers_koerp_projekt_bug.xml (Briefnetzwerk um Goethe)
- pers_koerp_projekt_tagebuch.xml (Goethe diary)

And adds them to the persons in persons.json as a 'biographies' field.
"""

import xml.etree.ElementTree as ET
import json
from pathlib import Path

def add_biographies():
    """Load biographical texts and add them to persons.json"""

    project_root = Path(__file__).parent.parent
    sndb_dir = project_root / 'data' / 'sndb'
    persons_file = project_root / 'docs' / 'data' / 'persons.json'

    print("Loading persons.json...")
    with open(persons_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    sources = {
        'goebriefe': 'pers_koerp_projekt_goebriefe.xml',
        'bug': 'pers_koerp_projekt_bug.xml',
        'tagebuch': 'pers_koerp_projekt_tagebuch.xml'
    }

    # Create person ID lookup
    person_lookup = {p['id']: i for i, p in enumerate(data['persons'])}

    total_biographies = 0
    women_with_biographies = set()

    for source_name, filename in sources.items():
        filepath = sndb_dir / filename
        if not filepath.exists():
            print(f"  Warning: {filename} not found, skipping")
            continue

        print(f"Loading {filename}...")
        tree = ET.parse(filepath)
        root = tree.getroot()

        source_count = 0
        for item in root.findall('.//ITEM'):
            sndb_id = item.find('ID').text if item.find('ID') is not None else None
            text_elem = item.find('REGISTEREINTRAG')
            text = text_elem.text if text_elem is not None else None

            if sndb_id and text and sndb_id in person_lookup:
                person_idx = person_lookup[sndb_id]

                if 'biographies' not in data['persons'][person_idx]:
                    data['persons'][person_idx]['biographies'] = []

                data['persons'][person_idx]['biographies'].append({
                    'source': source_name,
                    'text': text
                })

                women_with_biographies.add(sndb_id)
                source_count += 1
                total_biographies += 1

        print(f"  Added {source_count} biographical texts from {source_name}")

    print(f"\nTotal: {len(women_with_biographies)} women with {total_biographies} biographical texts")

    # Update metadata
    data['meta']['with_biographies'] = len(women_with_biographies)
    data['meta']['biographies_coverage_pct'] = round(len(women_with_biographies) / len(data['persons']) * 100, 1)

    # Save updated JSON
    print(f"\nWriting updated persons.json...")
    with open(persons_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Done! Updated: {persons_file}")

    return {
        'women_with_biographies': len(women_with_biographies),
        'total_biographies': total_biographies,
        'coverage_pct': round(len(women_with_biographies) / len(data['persons']) * 100, 1)
    }

if __name__ == '__main__':
    stats = add_biographies()
    print("\nStatistics:")
    print(f"  Women with biographies: {stats['women_with_biographies']}")
    print(f"  Total biography texts: {stats['total_biographies']}")
    print(f"  Coverage: {stats['coverage_pct']}%")
