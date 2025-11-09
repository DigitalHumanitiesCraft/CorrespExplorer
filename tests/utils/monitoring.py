"""
Data Coverage Monitoring Script

This is NOT a test - it's a monitoring/reporting tool.
Shows data coverage statistics for informational purposes.

Usage:
    python tests/utils/monitoring.py
"""

import json
from pathlib import Path


def analyze_coverage(persons_json_path):
    """Analyze and print coverage statistics"""

    with open(persons_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    persons = data['persons']
    total = len(persons)

    print("="*60)
    print("DATA COVERAGE STATISTICS")
    print("="*60)
    print(f"Total persons:        {total}")

    # Calculate coverage
    with_gnd = sum(1 for p in persons if p.get('gnd'))
    with_dates = sum(1 for p in persons if p.get('dates'))
    with_birth = sum(1 for p in persons if p.get('dates', {}).get('birth'))
    with_death = sum(1 for p in persons if p.get('dates', {}).get('death'))
    with_places = sum(1 for p in persons if p.get('places'))
    with_occupations = sum(1 for p in persons if p.get('occupations'))
    with_relationships = sum(1 for p in persons if p.get('relationships'))
    with_biography = sum(1 for p in persons if p.get('biography'))
    with_correspondence = sum(1 for p in persons if p.get('correspondence'))

    # Print statistics
    print(f"With GND:             {with_gnd:4d} ({with_gnd/total*100:5.1f}%)")
    print(f"With dates:           {with_dates:4d} ({with_dates/total*100:5.1f}%)")
    print(f"  - Birth date:       {with_birth:4d} ({with_birth/total*100:5.1f}%)")
    print(f"  - Death date:       {with_death:4d} ({with_death/total*100:5.1f}%)")
    print(f"With places:          {with_places:4d} ({with_places/total*100:5.1f}%)")
    print(f"With occupations:     {with_occupations:4d} ({with_occupations/total*100:5.1f}%)")
    print(f"With relationships:   {with_relationships:4d} ({with_relationships/total*100:5.1f}%)")
    print(f"With biography:       {with_biography:4d} ({with_biography/total*100:5.1f}%)")
    print(f"With correspondence:  {with_correspondence:4d} ({with_correspondence/total*100:5.1f}%)")
    print("="*60)

    return {
        'total': total,
        'gnd_coverage': with_gnd / total,
        'dates_coverage': with_dates / total,
        'geodata_coverage': with_places / total,
        'occupations_coverage': with_occupations / total,
        'relationships_coverage': with_relationships / total,
        'biography_coverage': with_biography / total,
        'correspondence_coverage': with_correspondence / total
    }


if __name__ == '__main__':
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    persons_json = project_root / 'docs' / 'data' / 'persons.json'

    analyze_coverage(persons_json)
