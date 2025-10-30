"""
HerData Pipeline: Extract and enrich women from SNDB + CMIF datasets
Generates JSON output for web visualization

Testing strategy:
- Each phase validates its output before proceeding
- Compact assertions check expected ranges
- Summary statistics printed for manual verification
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict, Counter
import json
from datetime import datetime

# TEI namespace for CMIF
NS = {'tei': 'http://www.tei-c.org/ns/1.0'}

class HerDataPipeline:
    """4-phase pipeline to extract and enrich women from SNDB + CMIF"""

    def __init__(self, data_dir, output_file, verbose=True):
        self.data_dir = Path(data_dir)
        self.output_file = Path(output_file)
        self.verbose = verbose

        # Data containers
        self.women = {}  # {sndb_id: {name, gnd, dates, ...}}
        self.cmif_letters = []
        self.stats = {
            'phase1': {},
            'phase2': {},
            'phase3': {},
            'phase4': {}
        }

    def log(self, message):
        """Print log message if verbose mode enabled"""
        if self.verbose:
            print(message)

    def test_phase1(self):
        """Validate Phase 1 output: women extraction"""
        total = len(self.women)
        with_gnd = sum(1 for w in self.women.values() if w.get('gnd'))
        with_dates = sum(1 for w in self.women.values() if w.get('dates', {}).get('birth') or w.get('dates', {}).get('death'))

        # Expected ranges based on documentation
        assert 3500 <= total <= 3700, f"Expected ~3,617 women, got {total}"
        # Women have lower GND coverage than overall SNDB (34% vs 53%)
        assert 0.25 <= with_gnd/total <= 0.50, f"Expected 25-50% GND coverage for women, got {with_gnd/total*100:.1f}%"

        self.stats['phase1'] = {
            'total_women': total,
            'with_gnd': with_gnd,
            'gnd_coverage': f"{with_gnd/total*100:.1f}%",
            'with_dates': with_dates,
            'date_coverage': f"{with_dates/total*100:.1f}%"
        }

        self.log(f"[OK] Phase 1 validation passed: {total} women, {with_gnd/total*100:.1f}% GND")
        return True

    def test_phase2(self):
        """Validate Phase 2 output: CMIF letter matching"""
        with_letters = sum(1 for w in self.women.values() if w.get('letter_count', 0) > 0 or w.get('mention_count', 0) > 0)
        senders = sum(1 for w in self.women.values() if 'sender' in w.get('roles', []))
        mentioned = sum(1 for w in self.women.values() if 'mentioned' in w.get('roles', []))

        # At least some women should match CMIF data
        assert with_letters > 0, "No women matched to CMIF letters"
        assert senders > 0, "No women identified as senders"

        self.stats['phase2'] = {
            'women_with_cmif_data': with_letters,
            'cmif_coverage': f"{with_letters/len(self.women)*100:.1f}%",
            'as_sender': senders,
            'as_mentioned': mentioned
        }

        self.log(f"[OK] Phase 2 validation passed: {with_letters} women matched to CMIF ({senders} senders, {mentioned} mentioned)")
        return True

    def test_phase3(self):
        """Validate Phase 3 output: geodata enrichment"""
        with_geodata = sum(1 for w in self.women.values() if w.get('places') and len(w['places']) > 0)
        with_occupations = sum(1 for w in self.women.values() if w.get('occupations') and len(w['occupations']) > 0)

        # Expected ~30-60% geodata coverage for women (may be lower than overall SNDB)
        if len(self.women) > 0:
            geodata_pct = with_geodata / len(self.women)
            assert 0.20 <= geodata_pct <= 0.80, f"Expected 20-80% geodata coverage, got {geodata_pct*100:.1f}%"

        self.stats['phase3'] = {
            'with_geodata': with_geodata,
            'geodata_coverage': f"{with_geodata/len(self.women)*100:.1f}%",
            'with_occupations': with_occupations
        }

        self.log(f"[OK] Phase 3 validation passed: {with_geodata} women with geodata ({with_geodata/len(self.women)*100:.1f}%)")
        return True

    def test_phase4(self, output_data):
        """Validate Phase 4 output: JSON generation"""
        assert 'meta' in output_data, "Missing 'meta' field in output"
        assert 'persons' in output_data, "Missing 'persons' field in output"
        assert len(output_data['persons']) == len(self.women), "Person count mismatch"

        # Check sample person has required fields
        if output_data['persons']:
            sample = output_data['persons'][0]
            required_fields = ['id', 'name', 'role', 'normierung']
            for field in required_fields:
                assert field in sample, f"Missing required field: {field}"

        self.stats['phase4'] = {
            'total_persons': len(output_data['persons']),
            'output_file_size': 'pending'
        }

        self.log(f"[OK] Phase 4 validation passed: {len(output_data['persons'])} persons in output")
        return True

    # ============================================================
    # PHASE 1: Identify Women from SNDB
    # ============================================================

    def phase1_identify_women(self):
        """Extract all women (SEXUS='w') from SNDB with biographical data"""
        self.log("\n" + "="*60)
        self.log("PHASE 1: Identifying women from SNDB")
        self.log("="*60)

        sndb_dir = self.data_dir / 'SNDB'

        # Step 1: Load main person data (names)
        self.log("Loading pers_koerp_main.xml...")
        main_tree = ET.parse(sndb_dir / 'pers_koerp_main.xml')
        main_root = main_tree.getroot()

        id_to_name = {}
        for item in main_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            lfdnr = item.find('LFDNR').text if item.find('LFDNR') is not None else '0'

            # Only keep main entries (LFDNR=0)
            if lfdnr == '0':
                nachname = item.find('NACHNAME').text if item.find('NACHNAME') is not None else ''
                vornamen = item.find('VORNAMEN').text if item.find('VORNAMEN') is not None else ''
                titel = item.find('TITEL').text if item.find('TITEL') is not None else ''

                # Build display name
                name_parts = []
                if vornamen:
                    name_parts.append(vornamen)
                if nachname:
                    name_parts.append(nachname)
                if titel:
                    name_parts.append(titel)

                display_name = ' '.join(name_parts) if name_parts else f"Person {person_id}"

                id_to_name[person_id] = {
                    'name': display_name,
                    'nachname': nachname,
                    'vornamen': vornamen,
                    'titel': titel
                }

        self.log(f"  Found {len(id_to_name)} main person entries")

        # Step 2: Load individual data (SEXUS, GND)
        self.log("Loading pers_koerp_indiv.xml...")
        indiv_tree = ET.parse(sndb_dir / 'pers_koerp_indiv.xml')
        indiv_root = indiv_tree.getroot()

        women_count = 0
        for item in indiv_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            sexus = item.find('SEXUS').text if item.find('SEXUS') is not None else None

            # Filter for women (SEXUS='w')
            if sexus == 'w':
                women_count += 1
                gnd = item.find('GND').text if item.find('GND') is not None else None

                # Get name from main data
                name_data = id_to_name.get(person_id, {'name': f"Person {person_id}"})

                self.women[person_id] = {
                    'id': person_id,
                    'name': name_data['name'],
                    'gnd': gnd,
                    'sndb_url': f"https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:{person_id}",
                    'dates': {},
                    'occupations': [],
                    'places': [],
                    'relationships': [],
                    'roles': [],
                    'letter_count': 0,
                    'mention_count': 0
                }

        self.log(f"  Found {women_count} women (SEXUS='w')")

        # Step 3: Add life dates
        self.log("Loading pers_koerp_datierungen.xml...")
        dates_tree = ET.parse(sndb_dir / 'pers_koerp_datierungen.xml')
        dates_root = dates_tree.getroot()

        # Collect birth/death dates (structure: ART=Geburtsdatum/Sterbedatum, JAHR field)
        person_dates = defaultdict(dict)
        for item in dates_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            if person_id in self.women:
                art = item.find('ART').text if item.find('ART') is not None else None
                jahr = item.find('JAHR').text if item.find('JAHR') is not None else None

                if jahr and art:
                    if art == 'Geburtsdatum':
                        person_dates[person_id]['birth'] = jahr
                    elif art == 'Sterbedatum':
                        person_dates[person_id]['death'] = jahr

        # Add dates to women
        dates_added = 0
        for person_id, dates in person_dates.items():
            if dates:
                self.women[person_id]['dates'] = dates
                dates_added += 1

        self.log(f"  Added dates for {dates_added} women")

        # Validate Phase 1
        self.test_phase1()

        return self.women

    # ============================================================
    # PHASE 2: Match CMIF Letters
    # ============================================================

    def extract_gnd_id(self, url):
        """Extract GND ID from URL"""
        if url and 'gnd/' in url:
            return url.split('gnd/')[-1]
        return None

    def phase2_match_letters(self):
        """Match CMIF letters to women via GND-ID or name"""
        self.log("\n" + "="*60)
        self.log("PHASE 2: Matching CMIF letters")
        self.log("="*60)

        cmif_file = self.data_dir / 'ra-cmif.xml'
        self.log(f"Loading {cmif_file}...")

        cmif_tree = ET.parse(cmif_file)
        cmif_root = cmif_tree.getroot()
        correspondences = cmif_root.findall('.//tei:correspDesc', NS)

        self.log(f"  Found {len(correspondences)} letters")

        # Build GND lookup for fast matching
        gnd_to_woman = {}
        name_to_woman = {}
        for woman_id, woman_data in self.women.items():
            if woman_data.get('gnd'):
                gnd_to_woman[woman_data['gnd']] = woman_id
            # Also index by name for fallback
            name_to_woman[woman_data['name'].lower()] = woman_id

        self.log(f"  Built GND index: {len(gnd_to_woman)} women with GND")

        # Match letters and extract years
        matched_senders = set()
        matched_mentioned = set()

        for corresp in correspondences:
            # Extract letter year
            letter_year = None
            sent_action = corresp.find('.//tei:correspAction[@type="sent"]', NS)
            if sent_action:
                date_elem = sent_action.find('.//tei:date', NS)
                if date_elem is not None and date_elem.get('when'):
                    try:
                        letter_year = int(date_elem.get('when')[:4])
                    except:
                        pass

            # Check senders
            if sent_action:
                sender = sent_action.find('.//tei:persName', NS)
                if sender is not None:
                    sender_ref = sender.get('ref', '')
                    sender_gnd = self.extract_gnd_id(sender_ref)

                    # Match by GND (primary)
                    if sender_gnd and sender_gnd in gnd_to_woman:
                        woman_id = gnd_to_woman[sender_gnd]
                        self.women[woman_id]['letter_count'] += 1
                        if 'sender' not in self.women[woman_id]['roles']:
                            self.women[woman_id]['roles'].append('sender')
                        # Add letter year if available
                        if letter_year:
                            if 'letter_years' not in self.women[woman_id]:
                                self.women[woman_id]['letter_years'] = []
                            self.women[woman_id]['letter_years'].append(letter_year)
                        matched_senders.add(woman_id)
                    # Fallback: match by name
                    elif sender.text:
                        sender_name_lower = sender.text.lower()
                        if sender_name_lower in name_to_woman:
                            woman_id = name_to_woman[sender_name_lower]
                            self.women[woman_id]['letter_count'] += 1
                            if 'sender' not in self.women[woman_id]['roles']:
                                self.women[woman_id]['roles'].append('sender')
                            # Add letter year if available
                            if letter_year:
                                if 'letter_years' not in self.women[woman_id]:
                                    self.women[woman_id]['letter_years'] = []
                                self.women[woman_id]['letter_years'].append(letter_year)
                            matched_senders.add(woman_id)

            # Check mentioned persons
            note = corresp.find('.//tei:note', NS)
            if note:
                for ref in note.findall('.//tei:ref[@type="cmif:mentionsPerson"]', NS):
                    person_ref = ref.get('target', '')
                    person_gnd = self.extract_gnd_id(person_ref)

                    # Match by GND
                    if person_gnd and person_gnd in gnd_to_woman:
                        woman_id = gnd_to_woman[person_gnd]
                        self.women[woman_id]['mention_count'] += 1
                        if 'mentioned' not in self.women[woman_id]['roles']:
                            self.women[woman_id]['roles'].append('mentioned')
                        # Add letter year if available
                        if letter_year:
                            if 'letter_years' not in self.women[woman_id]:
                                self.women[woman_id]['letter_years'] = []
                            self.women[woman_id]['letter_years'].append(letter_year)
                        matched_mentioned.add(woman_id)
                    # Fallback: match by name
                    elif ref.text:
                        person_name_lower = ref.text.lower()
                        if person_name_lower in name_to_woman:
                            woman_id = name_to_woman[person_name_lower]
                            self.women[woman_id]['mention_count'] += 1
                            if 'mentioned' not in self.women[woman_id]['roles']:
                                self.women[woman_id]['roles'].append('mentioned')
                            # Add letter year if available
                            if letter_year:
                                if 'letter_years' not in self.women[woman_id]:
                                    self.women[woman_id]['letter_years'] = []
                                self.women[woman_id]['letter_years'].append(letter_year)
                            matched_mentioned.add(woman_id)

        # Assign combined roles
        for woman_id, woman_data in self.women.items():
            roles = woman_data['roles']
            if len(roles) == 0:
                woman_data['role'] = 'indirect'  # SNDB-only, no CMIF match
            elif len(roles) == 2:
                woman_data['role'] = 'both'
            elif 'sender' in roles:
                woman_data['role'] = 'sender'
            elif 'mentioned' in roles:
                woman_data['role'] = 'mentioned'

        self.log(f"  Matched {len(matched_senders)} women as senders")
        self.log(f"  Matched {len(matched_mentioned)} women as mentioned")

        # Validate Phase 2
        self.test_phase2()

        return self.women

    # ============================================================
    # PHASE 3: Enrich with Geodata and Biographical Info
    # ============================================================

    def phase3_enrich_data(self):
        """Add geodata, occupations, relationships from SNDB"""
        self.log("\n" + "="*60)
        self.log("PHASE 3: Enriching with geodata and biographical info")
        self.log("="*60)

        sndb_dir = self.data_dir / 'SNDB'

        # Step 1: Load place linkage (person → place ID)
        self.log("Loading pers_koerp_orte.xml...")
        orte_tree = ET.parse(sndb_dir / 'pers_koerp_orte.xml')
        orte_root = orte_tree.getroot()

        person_to_places = defaultdict(list)
        for item in orte_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            sndb_id = item.find('SNDB_ID').text if item.find('SNDB_ID') is not None else None
            art = item.find('ART').text if item.find('ART') is not None else 'Ort'

            if person_id in self.women and sndb_id:
                person_to_places[person_id].append({
                    'sndb_id': sndb_id,
                    'type': art
                })

        self.log(f"  Found place links for {len(person_to_places)} women")

        # Step 2: Load place names
        self.log("Loading geo_main.xml...")
        geo_main_tree = ET.parse(sndb_dir / 'geo_main.xml')
        geo_main_root = geo_main_tree.getroot()

        place_id_to_name = {}
        for item in geo_main_root.findall('.//ITEM'):
            place_id = item.find('ID').text
            lfdnr = item.find('LFDNR').text if item.find('LFDNR') is not None else '0'
            bezeichnung = item.find('BEZEICHNUNG').text if item.find('BEZEICHNUNG') is not None else None

            # Only use main form (LFDNR=0)
            if lfdnr == '0' and bezeichnung:
                place_id_to_name[place_id] = bezeichnung

        self.log(f"  Loaded {len(place_id_to_name)} place names")

        # Step 3: Load coordinates
        self.log("Loading geo_indiv.xml...")
        geo_indiv_tree = ET.parse(sndb_dir / 'geo_indiv.xml')
        geo_indiv_root = geo_indiv_tree.getroot()

        place_id_to_coords = {}
        for item in geo_indiv_root.findall('.//ITEM'):
            place_id = item.find('ID').text
            lat = item.find('LATITUDE').text if item.find('LATITUDE') is not None else None
            lon = item.find('LONGITUDE').text if item.find('LONGITUDE') is not None else None

            if lat and lon:
                try:
                    place_id_to_coords[place_id] = {
                        'lat': float(lat),
                        'lon': float(lon)
                    }
                except ValueError:
                    pass  # Skip invalid coordinates

        self.log(f"  Loaded coordinates for {len(place_id_to_coords)} places")

        # Step 4: Merge geodata into women
        for person_id, places_list in person_to_places.items():
            for place_info in places_list:
                place_id = place_info['sndb_id']
                place_name = place_id_to_name.get(place_id)
                coords = place_id_to_coords.get(place_id)

                if place_name and coords:
                    self.women[person_id]['places'].append({
                        'name': place_name,
                        'lat': coords['lat'],
                        'lon': coords['lon'],
                        'type': place_info['type']
                    })

        # Step 5: Load occupations
        self.log("Loading pers_koerp_berufe.xml...")
        berufe_tree = ET.parse(sndb_dir / 'pers_koerp_berufe.xml')
        berufe_root = berufe_tree.getroot()

        occupations_added = 0
        for item in berufe_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            if person_id in self.women:
                beruf = item.find('BERUF').text if item.find('BERUF') is not None else None
                if beruf:
                    self.women[person_id]['occupations'].append({
                        'name': beruf,
                        'type': 'Beruf'
                    })
                    occupations_added += 1

        self.log(f"  Added {occupations_added} occupation entries")

        # Validate Phase 3
        self.test_phase3()

        return self.women

    # ============================================================
    # PHASE 4: Generate JSON Output
    # ============================================================

    def phase4_generate_json(self):
        """Generate final JSON output with metadata"""
        self.log("\n" + "="*60)
        self.log("PHASE 4: Generating JSON output")
        self.log("="*60)

        # Calculate metadata statistics
        total_women = len(self.women)
        with_letters = sum(1 for w in self.women.values() if w.get('letter_count', 0) > 0 or w.get('mention_count', 0) > 0)
        with_geodata = sum(1 for w in self.women.values() if w.get('places') and len(w['places']) > 0)
        with_gnd = sum(1 for w in self.women.values() if w.get('gnd'))

        # Build aggregated timeline data
        from collections import Counter
        all_years = []
        for woman in self.women.values():
            if woman.get('letter_years'):
                all_years.extend(woman['letter_years'])

        year_counts = Counter(all_years)
        timeline_data = [{'year': year, 'count': count} for year, count in sorted(year_counts.items())]

        # Build output structure
        output_data = {
            'meta': {
                'generated': datetime.now().isoformat(),
                'total_women': total_women,
                'with_cmif_data': with_letters,
                'with_geodata': with_geodata,
                'with_gnd': with_gnd,
                'gnd_coverage_pct': round(with_gnd / total_women * 100, 1) if total_women > 0 else 0,
                'geodata_coverage_pct': round(with_geodata / total_women * 100, 1) if total_women > 0 else 0,
                'data_sources': {
                    'cmif': 'ra-cmif.xml (2025-03 snapshot)',
                    'sndb': 'SNDB export 2025-10'
                },
                'timeline': timeline_data
            },
            'persons': []
        }

        self.log(f"  Timeline: {len(timeline_data)} years with letter data")

        # Add persons
        for woman_id, woman_data in self.women.items():
            # Determine normierung status
            if woman_data.get('gnd'):
                normierung = 'gnd'
            else:
                normierung = 'sndb'

            # Build person entry (remove empty fields to save space)
            person = {
                'id': woman_data['id'],
                'name': woman_data['name'],
                'role': woman_data.get('role', 'indirect'),
                'normierung': normierung,
                'sndb_url': woman_data['sndb_url']
            }

            # Add optional fields only if present
            if woman_data.get('gnd'):
                person['gnd'] = woman_data['gnd']

            if woman_data.get('roles'):
                person['roles'] = woman_data['roles']

            if woman_data.get('letter_count', 0) > 0:
                person['letter_count'] = woman_data['letter_count']

            if woman_data.get('letter_years'):
                # Store unique years, sorted
                person['letter_years'] = sorted(list(set(woman_data['letter_years'])))

            if woman_data.get('mention_count', 0) > 0:
                person['mention_count'] = woman_data['mention_count']

            if woman_data.get('dates', {}).get('birth') or woman_data.get('dates', {}).get('death'):
                person['dates'] = woman_data['dates']

            if woman_data.get('places'):
                person['places'] = woman_data['places']

            if woman_data.get('occupations'):
                person['occupations'] = woman_data['occupations']

            output_data['persons'].append(person)

        # Validate Phase 4
        self.test_phase4(output_data)

        # Write to file
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        file_size_mb = self.output_file.stat().st_size / (1024 * 1024)
        self.stats['phase4']['output_file_size'] = f"{file_size_mb:.2f} MB"

        self.log(f"\n[OK] JSON written to {self.output_file}")
        self.log(f"  File size: {file_size_mb:.2f} MB")

        return output_data

    # ============================================================
    # Run Complete Pipeline
    # ============================================================

    def run(self):
        """Execute complete 4-phase pipeline"""
        self.log("\n" + "="*60)
        self.log("HERDATA PIPELINE - Building visualization dataset")
        self.log("="*60)

        start_time = datetime.now()

        # Run all phases
        self.phase1_identify_women()
        self.phase2_match_letters()
        self.phase3_enrich_data()
        output_data = self.phase4_generate_json()

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # Print summary
        self.print_summary(duration)

        return output_data

    def print_summary(self, duration):
        """Print compact summary of all phases"""
        self.log("\n" + "="*60)
        self.log("PIPELINE SUMMARY")
        self.log("="*60)

        self.log(f"\nPhase 1 - Women Identification:")
        for key, value in self.stats['phase1'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nPhase 2 - CMIF Letter Matching:")
        for key, value in self.stats['phase2'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nPhase 3 - Data Enrichment:")
        for key, value in self.stats['phase3'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nPhase 4 - JSON Generation:")
        for key, value in self.stats['phase4'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nExecution time: {duration:.2f} seconds")
        self.log("\n" + "="*60)
        self.log("[SUCCESS] PIPELINE COMPLETE")
        self.log("="*60 + "\n")


def main():
    """Run HerData pipeline with default paths"""
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'
    output_file = script_dir.parent / 'docs' / 'data' / 'persons.json'

    pipeline = HerDataPipeline(data_dir, output_file, verbose=True)
    pipeline.run()


if __name__ == '__main__':
    main()
