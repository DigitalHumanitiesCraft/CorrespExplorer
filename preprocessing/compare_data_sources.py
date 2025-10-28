"""
Compare old SNDB data (data/SNDB/) with new export (new-data/Datenexport 2025-10-27/)

Analyzes:
1. Which women are in new vs old export
2. Data quality differences (GND coverage, completeness)
3. What data is missing in new export (geo files)
4. Recommendations for hybrid approach

Usage:
    python preprocessing/compare_data_sources.py
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

class DataSourceComparison:
    """Compare old and new SNDB data sources"""

    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.old_sndb_dir = self.project_root / 'data' / 'SNDB'
        self.new_export_dir = self.project_root / 'new-data' / 'Datenexport 2025-10-27'

        # Data containers
        self.old_women = {}
        self.new_women = {}

    def load_old_sndb_women(self):
        """Load women from old SNDB (pers_koerp_*)"""
        print("\n" + "="*60)
        print("Loading OLD SNDB data (data/SNDB/)")
        print("="*60)

        # Load main names
        main_tree = ET.parse(self.old_sndb_dir / 'pers_koerp_main.xml')
        main_root = main_tree.getroot()

        id_to_name = {}
        for item in main_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            lfdnr = item.find('LFDNR').text if item.find('LFDNR') is not None else '0'

            if lfdnr == '0':
                nachname = item.find('NACHNAME').text if item.find('NACHNAME') is not None else ''
                vornamen = item.find('VORNAMEN').text if item.find('VORNAMEN') is not None else ''
                name = f"{vornamen} {nachname}".strip()
                id_to_name[person_id] = name

        print(f"  Loaded {len(id_to_name)} person names")

        # Load individual data and filter women
        indiv_tree = ET.parse(self.old_sndb_dir / 'pers_koerp_indiv.xml')
        indiv_root = indiv_tree.getroot()

        for item in indiv_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            sexus = item.find('SEXUS').text if item.find('SEXUS') is not None else None

            if sexus == 'w':
                gnd = item.find('GND').text if item.find('GND') is not None else None
                self.old_women[person_id] = {
                    'id': person_id,
                    'name': id_to_name.get(person_id, f"Person {person_id}"),
                    'gnd': gnd,
                    'source': 'old_sndb'
                }

        print(f"  Found {len(self.old_women)} women (SEXUS='w')")

        # Count GND coverage
        with_gnd = sum(1 for w in self.old_women.values() if w['gnd'])
        print(f"  GND coverage: {with_gnd}/{len(self.old_women)} ({with_gnd/len(self.old_women)*100:.1f}%)")

        return self.old_women

    def load_new_export_women(self):
        """Load women from new export (ra_ndb_*)"""
        print("\n" + "="*60)
        print("Loading NEW EXPORT data (new-data/Datenexport 2025-10-27/)")
        print("="*60)

        # Load main names
        main_tree = ET.parse(self.new_export_dir / 'ra_ndb_main.xml')
        main_root = main_tree.getroot()

        id_to_name = {}
        for item in main_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            lfdnr = item.find('LFDNR').text if item.find('LFDNR') is not None else '0'

            if lfdnr == '0':
                nachname = item.find('NACHNAME').text if item.find('NACHNAME') is not None else ''
                vornamen = item.find('VORNAMEN').text if item.find('VORNAMEN') is not None else ''
                name = f"{vornamen} {nachname}".strip()
                id_to_name[person_id] = name

        print(f"  Loaded {len(id_to_name)} person names")

        # Load individual data (all should be women)
        indiv_tree = ET.parse(self.new_export_dir / 'ra_ndb_indiv.xml')
        indiv_root = indiv_tree.getroot()

        for item in indiv_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            sexus = item.find('SEXUS').text if item.find('SEXUS') is not None else None
            gnd = item.find('GND').text if item.find('GND') is not None else None

            self.new_women[person_id] = {
                'id': person_id,
                'name': id_to_name.get(person_id, f"Person {person_id}"),
                'gnd': gnd,
                'sexus': sexus,
                'source': 'new_export'
            }

        print(f"  Found {len(self.new_women)} women")

        # Verify all are women
        all_women = all(w.get('sexus') == 'w' for w in self.new_women.values())
        print(f"  All SEXUS='w': {all_women}")

        # Count GND coverage
        with_gnd = sum(1 for w in self.new_women.values() if w['gnd'])
        print(f"  GND coverage: {with_gnd}/{len(self.new_women)} ({with_gnd/len(self.new_women)*100:.1f}%)")

        return self.new_women

    def compare_datasets(self):
        """Compare old vs new datasets"""
        print("\n" + "="*60)
        print("COMPARISON ANALYSIS")
        print("="*60)

        old_ids = set(self.old_women.keys())
        new_ids = set(self.new_women.keys())

        # Set operations
        only_in_old = old_ids - new_ids
        only_in_new = new_ids - old_ids
        in_both = old_ids & new_ids

        print(f"\nDataset overlap:")
        print(f"  Total in OLD SNDB:     {len(old_ids):>4} women")
        print(f"  Total in NEW export:   {len(new_ids):>4} women")
        print(f"  In BOTH datasets:      {len(in_both):>4} women ({len(in_both)/len(old_ids)*100:.1f}% of old)")
        print(f"  ONLY in old SNDB:      {len(only_in_old):>4} women ({len(only_in_old)/len(old_ids)*100:.1f}% of old)")
        print(f"  ONLY in new export:    {len(only_in_new):>4} women")

        # GND comparison for common IDs
        print(f"\nGND coverage for {len(in_both)} common women:")

        old_gnd_count = sum(1 for pid in in_both if self.old_women[pid]['gnd'])
        new_gnd_count = sum(1 for pid in in_both if self.new_women[pid]['gnd'])

        print(f"  OLD SNDB: {old_gnd_count}/{len(in_both)} ({old_gnd_count/len(in_both)*100:.1f}%)")
        print(f"  NEW export: {new_gnd_count}/{len(in_both)} ({new_gnd_count/len(in_both)*100:.1f}%)")

        # Check for GND differences
        gnd_added = 0
        gnd_removed = 0
        gnd_changed = 0

        for pid in in_both:
            old_gnd = self.old_women[pid]['gnd']
            new_gnd = self.new_women[pid]['gnd']

            if old_gnd is None and new_gnd is not None:
                gnd_added += 1
            elif old_gnd is not None and new_gnd is None:
                gnd_removed += 1
            elif old_gnd != new_gnd and old_gnd is not None and new_gnd is not None:
                gnd_changed += 1

        print(f"\nGND changes in common women:")
        print(f"  GND added (was None):   {gnd_added:>4}")
        print(f"  GND removed (now None): {gnd_removed:>4}")
        print(f"  GND changed:            {gnd_changed:>4}")

        return {
            'old_count': len(old_ids),
            'new_count': len(new_ids),
            'both': len(in_both),
            'only_old': len(only_in_old),
            'only_new': len(only_in_new),
            'gnd_added': gnd_added,
            'gnd_removed': gnd_removed,
            'gnd_changed': gnd_changed
        }

    def analyze_new_export_completeness(self):
        """Check what data is available in new export"""
        print("\n" + "="*60)
        print("NEW EXPORT DATA COMPLETENESS")
        print("="*60)

        files = {
            'ra_ndb_main.xml': 'Person names',
            'ra_ndb_indiv.xml': 'Gender & GND',
            'ra_ndb_datierungen.xml': 'Life dates',
            'ra_ndb_berufe.xml': 'Occupations',
            'ra_ndb_orte.xml': 'Place links (SNDB_ID)',
            'ra_ndb_beziehungen.xml': 'AGRELON relationships',
            'projekt_regestausgabe.xml': 'Biographical texts',
            'nsl_agrelon.xml': 'AGRELON types'
        }

        for filename, description in files.items():
            filepath = self.new_export_dir / filename
            if filepath.exists():
                tree = ET.parse(filepath)
                root = tree.getroot()
                count = len(root.findall('.//ITEM'))
                print(f"  [OK] {filename:30s} {count:>4} items - {description}")
            else:
                print(f"  [  ] {filename:30s} MISSING - {description}")

        # Check for geo files
        print(f"\nGeographic data files:")
        geo_files = ['geo_main.xml', 'geo_indiv.xml', 'geo_links.xml']
        for filename in geo_files:
            filepath = self.new_export_dir / filename
            if filepath.exists():
                print(f"  [OK] {filename}")
            else:
                print(f"  [  ] {filename} - NOT in new export (need old SNDB)")

    def check_geo_coverage(self):
        """Check how many women have geodata in new export"""
        print("\n" + "="*60)
        print("GEODATA ANALYSIS")
        print("="*60)

        # Load ra_ndb_orte.xml from new export
        orte_tree = ET.parse(self.new_export_dir / 'ra_ndb_orte.xml')
        orte_root = orte_tree.getroot()

        women_with_places = set()
        place_references = []

        for item in orte_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            sndb_id = item.find('SNDB_ID').text if item.find('SNDB_ID') is not None else None

            if person_id in self.new_women:
                women_with_places.add(person_id)
                if sndb_id:
                    place_references.append(sndb_id)

        print(f"New export place links:")
        print(f"  Women with place data: {len(women_with_places)}/{len(self.new_women)} ({len(women_with_places)/len(self.new_women)*100:.1f}%)")
        print(f"  Total place entries:   {len(orte_root.findall('.//ITEM'))}")
        print(f"  Unique SNDB_IDs:       {len(set(place_references))}")

        # Check if geo files exist in old SNDB
        geo_main_path = self.old_sndb_dir / 'geo_main.xml'
        geo_indiv_path = self.old_sndb_dir / 'geo_indiv.xml'

        if geo_main_path.exists():
            geo_tree = ET.parse(geo_main_path)
            geo_root = geo_tree.getroot()
            geo_count = len([item for item in geo_root.findall('.//ITEM')
                           if item.find('LFDNR').text == '0'])
            print(f"\nOld SNDB geo_main.xml:")
            print(f"  Available places: {geo_count}")
            print(f"  --> Can resolve {len(set(place_references))} SNDB_IDs from new export")

        if geo_indiv_path.exists():
            print(f"\nOld SNDB geo_indiv.xml:")
            print(f"  [OK] Coordinates available for place resolution")

    def show_sample_women(self):
        """Show sample women from each category"""
        print("\n" + "="*60)
        print("SAMPLE WOMEN")
        print("="*60)

        old_ids = set(self.old_women.keys())
        new_ids = set(self.new_women.keys())

        in_both = old_ids & new_ids
        only_in_old = old_ids - new_ids
        only_in_new = new_ids - old_ids

        print(f"\nWomen in BOTH datasets (sample of 5):")
        for pid in list(in_both)[:5]:
            old = self.old_women[pid]
            new = self.new_women[pid]
            gnd_status = "GND: " + (new['gnd'] or 'None')
            print(f"  ID {pid:>5} | {new['name'][:40]:40s} | {gnd_status}")

        if only_in_old:
            print(f"\nWomen ONLY in old SNDB (sample of 5):")
            for pid in list(only_in_old)[:5]:
                old = self.old_women[pid]
                gnd_status = "GND: " + (old['gnd'] or 'None')
                print(f"  ID {pid:>5} | {old['name'][:40]:40s} | {gnd_status}")

        if only_in_new:
            print(f"\nWomen ONLY in new export (sample of all {len(only_in_new)}):")
            for pid in only_in_new:
                new = self.new_women[pid]
                gnd_status = "GND: " + (new['gnd'] or 'None')
                print(f"  ID {pid:>5} | {new['name'][:40]:40s} | {gnd_status}")

    def generate_recommendations(self):
        """Generate recommendations for using new export"""
        print("\n" + "="*60)
        print("RECOMMENDATIONS")
        print("="*60)

        old_count = len(self.old_women)
        new_count = len(self.new_women)
        coverage = (new_count / old_count) * 100

        print(f"\n1. DATA COVERAGE:")
        print(f"   New export has {new_count} of {old_count} women ({coverage:.1f}%)")

        if coverage < 100:
            print(f"   [!] Missing {old_count - new_count} women from old SNDB")
            print(f"   --> Decision needed: Use only 448 women OR supplement with old data")

        print(f"\n2. GEODATA STRATEGY:")
        print(f"   [OK] New export has ra_ndb_orte.xml with SNDB_ID references")
        print(f"   [  ] New export lacks geo_main.xml and geo_indiv.xml")
        print(f"   --> MUST use old SNDB geo files to resolve coordinates")

        print(f"\n3. RECOMMENDED APPROACH:")
        print(f"   Option A: Use ONLY new export (448 women)")
        print(f"     Pros: Curated dataset, latest data, smaller size")
        print(f"     Cons: Only 12.4% of all women, missing 3,169 women")
        print(f"     Use case: Focus on high-quality, regest-relevant women")

        print(f"\n   Option B: Hybrid approach (new + old)")
        print(f"     Pros: Complete dataset (3,617 women), newer data for 448")
        print(f"     Cons: More complex pipeline, potential conflicts")
        print(f"     Use case: Comprehensive visualization")

        print(f"\n4. PIPELINE CHANGES NEEDED:")
        print(f"   - Change XML root element: PERS_KOERP_* --> RA_NDB_*")
        print(f"   - Keep geo file loading from old SNDB (geo_main.xml, geo_indiv.xml)")
        print(f"   - Use projekt_regestausgabe.xml for biographies (448 entries)")

        print(f"\n5. DATA QUALITY:")
        old_ids = set(self.old_women.keys())
        new_ids = set(self.new_women.keys())
        in_both = old_ids & new_ids

        old_gnd = sum(1 for pid in in_both if self.old_women[pid]['gnd'])
        new_gnd = sum(1 for pid in in_both if self.new_women[pid]['gnd'])

        if new_gnd > old_gnd:
            print(f"   [OK] New export has MORE GND IDs for common women (+{new_gnd - old_gnd})")
        elif new_gnd < old_gnd:
            print(f"   [!]  New export has FEWER GND IDs for common women (-{old_gnd - new_gnd})")
        else:
            print(f"   --> GND coverage unchanged for common women")

    def run(self):
        """Run complete comparison analysis"""
        print("\n" + "="*60)
        print("DATA SOURCE COMPARISON TOOL")
        print("HerData Project - SNDB Analysis")
        print("="*60)

        # Load data
        self.load_old_sndb_women()
        self.load_new_export_women()

        # Run analyses
        self.compare_datasets()
        self.analyze_new_export_completeness()
        self.check_geo_coverage()
        self.show_sample_women()
        self.generate_recommendations()

        print("\n" + "="*60)
        print("ANALYSIS COMPLETE")
        print("="*60 + "\n")


def main():
    """Run comparison"""
    comparison = DataSourceComparison()
    comparison.run()


if __name__ == '__main__':
    main()
