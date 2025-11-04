"""
HerData Pipeline NEW VERSION: Uses focused export from 2025-10-27
Processes 448 curated women with hybrid geodata approach

Key changes from old pipeline:
- Uses ra_ndb_* files (new export) instead of pers_koerp_* (old SNDB)
- Loads geodata from OLD SNDB (geo_*.xml) as fallback
- Focus on 448 regest-relevant women with better GND coverage (60.3% vs 34.1%)

Data sources:
- NEW: data/herdata/ (448 women)
- OLD: data/sndb/geo_*.xml (geodata resolution)

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

class HerDataPipelineNew:
    """4-phase pipeline using NEW export (2025-10-27) with OLD geodata"""

    def __init__(self, herdata_dir, sndb_dir, cmif_file, output_file, verbose=True, track_provenance=True):
        self.herdata_dir = Path(herdata_dir)
        self.sndb_dir = Path(sndb_dir)
        self.cmif_file = Path(cmif_file)
        self.output_file = Path(output_file)
        self.verbose = verbose
        self.track_provenance = track_provenance  # NOW DEFAULT: True

        # Data containers
        self.women = {}  # {sndb_id: {name, gnd, dates, ...}}
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

    def add_provenance(self, person_id, field, source_info):
        """Track data provenance for debugging and review"""
        if not self.track_provenance:
            return

        if person_id not in self.women:
            return

        if '_provenance' not in self.women[person_id]:
            self.women[person_id]['_provenance'] = {}

        self.women[person_id]['_provenance'][field] = {
            'source': source_info.get('file', ''),
            'xpath': source_info.get('xpath', ''),
            'raw_value': source_info.get('raw_value', ''),
            'transformation': source_info.get('transformation', ''),
            'extracted_at': datetime.now().isoformat()
        }

    def test_phase1(self):
        """Validate Phase 1 output: women extraction from NEW export"""
        total = len(self.women)
        with_gnd = sum(1 for w in self.women.values() if w.get('gnd'))
        with_dates = sum(1 for w in self.women.values() if w.get('dates', {}).get('birth') or w.get('dates', {}).get('death'))

        # Expected: ~448 women (new export size)
        assert 400 <= total <= 500, f"Expected ~448 women in new export, got {total}"
        # Expected: ~60% GND coverage (new export quality)
        assert 0.50 <= with_gnd/total <= 0.70, f"Expected 50-70% GND coverage for new export, got {with_gnd/total*100:.1f}%"

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
        """Validate Phase 3 output: geodata enrichment via hybrid approach"""
        with_geodata = sum(1 for w in self.women.values() if w.get('places') and len(w['places']) > 0)
        with_occupations = sum(1 for w in self.women.values() if w.get('occupations') and len(w['occupations']) > 0)

        # Expected: ~54% geodata coverage based on new export analysis
        if len(self.women) > 0:
            geodata_pct = with_geodata / len(self.women)
            assert 0.40 <= geodata_pct <= 0.70, f"Expected 40-70% geodata coverage, got {geodata_pct*100:.1f}%"

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
    # PHASE 1: Identify Women from NEW Export
    # ============================================================

    def phase1_identify_women(self):
        """Extract all women from NEW export (ra_ndb_*)"""
        self.log("\n" + "="*60)
        self.log("PHASE 1: Identifying women from NEW export (2025-10-27)")
        self.log("="*60)

        # Step 1: Load main person data (names) from NEW export
        self.log("Loading ra_ndb_main.xml...")
        main_tree = ET.parse(self.herdata_dir / 'ra_ndb_main.xml')
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

        # Step 2: Load individual data (SEXUS, GND) from NEW export
        self.log("Loading ra_ndb_indiv.xml...")
        indiv_tree = ET.parse(self.herdata_dir / 'ra_ndb_indiv.xml')
        indiv_root = indiv_tree.getroot()

        women_count = 0
        for item in indiv_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            sexus = item.find('SEXUS').text if item.find('SEXUS') is not None else None

            # All should be women in new export, but verify
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

                # Track provenance for ID
                self.add_provenance(person_id, 'id', {
                    'file': 'ra_ndb_main.xml',
                    'xpath': f"//ITEM[ID='{person_id}']",
                    'raw_value': person_id,
                    'transformation': 'direct extraction'
                })

                # Track provenance for name
                self.add_provenance(person_id, 'name', {
                    'file': 'ra_ndb_main.xml',
                    'xpath': f"//ITEM[ID='{person_id}' and LFDNR='0']/VORNAMEN, NACHNAME, TITEL",
                    'raw_value': {
                        'vornamen': name_data.get('vornamen'),
                        'nachname': name_data.get('nachname'),
                        'titel': name_data.get('titel')
                    },
                    'transformation': f"concatenation with space: '{name_data['name']}'"
                })

                # Track provenance for GND
                if gnd:
                    self.add_provenance(person_id, 'gnd', {
                        'file': 'ra_ndb_indiv.xml',
                        'xpath': f"//ITEM[ID='{person_id}']/GND",
                        'raw_value': gnd,
                        'transformation': 'direct extraction'
                    })

        self.log(f"  Found {women_count} women (all SEXUS='w' in new export)")

        # Step 3: Add life dates from NEW export
        self.log("Loading ra_ndb_datierungen.xml...")
        dates_tree = ET.parse(self.herdata_dir / 'ra_ndb_datierungen.xml')
        dates_root = dates_tree.getroot()

        # Collect birth/death dates
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

                # Track provenance for birth date
                if 'birth' in dates:
                    self.add_provenance(person_id, 'dates.birth', {
                        'file': 'ra_ndb_datierungen.xml',
                        'xpath': f"//ITEM[ID='{person_id}' and ART='Geburtsdatum']/JAHR",
                        'raw_value': dates['birth'],
                        'transformation': 'extract year as string'
                    })

                # Track provenance for death date
                if 'death' in dates:
                    self.add_provenance(person_id, 'dates.death', {
                        'file': 'ra_ndb_datierungen.xml',
                        'xpath': f"//ITEM[ID='{person_id}' and ART='Sterbedatum']/JAHR",
                        'raw_value': dates['death'],
                        'transformation': 'extract year as string'
                    })

        self.log(f"  Added dates for {dates_added} women")

        # Validate Phase 1
        self.test_phase1()

        return self.women

    # ============================================================
    # PHASE 2: Match CMIF Letters (unchanged)
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

        self.log(f"Loading {self.cmif_file}...")

        cmif_tree = ET.parse(self.cmif_file)
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
            # Extract letter metadata
            letter_year = None
            letter_date = None
            letter_place = None
            letter_id = corresp.get('ref', '')

            sent_action = corresp.find('.//tei:correspAction[@type="sent"]', NS)
            received_action = corresp.find('.//tei:correspAction[@type="received"]', NS)

            if sent_action:
                date_elem = sent_action.find('.//tei:date', NS)
                if date_elem is not None:
                    if date_elem.get('when'):
                        letter_date = date_elem.get('when')
                        try:
                            letter_year = int(letter_date[:4])
                        except:
                            pass
                    elif date_elem.get('notBefore'):
                        letter_date = date_elem.get('notBefore') + '/' + date_elem.get('notAfter', '')
                        try:
                            letter_year = int(date_elem.get('notBefore')[:4])
                        except:
                            pass

                place_elem = sent_action.find('.//tei:placeName', NS)
                if place_elem is not None:
                    letter_place = place_elem.text

            # Check senders
            if sent_action:
                sender = sent_action.find('.//tei:persName', NS)
                receiver = None
                if received_action:
                    receiver = received_action.find('.//tei:persName', NS)

                if sender is not None:
                    sender_ref = sender.get('ref', '')
                    sender_gnd = self.extract_gnd_id(sender_ref)

                    receiver_name = None
                    receiver_gnd = None
                    if receiver is not None:
                        receiver_name = receiver.text
                        receiver_gnd = self.extract_gnd_id(receiver.get('ref', ''))

                    # Match by GND (primary)
                    if sender_gnd and sender_gnd in gnd_to_woman:
                        woman_id = gnd_to_woman[sender_gnd]
                        is_first_letter = self.women[woman_id]['letter_count'] == 0
                        self.women[woman_id]['letter_count'] += 1
                        if 'sender' not in self.women[woman_id]['roles']:
                            self.women[woman_id]['roles'].append('sender')
                        # Add letter year
                        if letter_year:
                            if 'letter_years' not in self.women[woman_id]:
                                self.women[woman_id]['letter_years'] = []
                            self.women[woman_id]['letter_years'].append(letter_year)

                        # Add detailed correspondence data
                        if 'correspondence' not in self.women[woman_id]:
                            self.women[woman_id]['correspondence'] = []

                        corresp_entry = {
                            'type': 'sent',
                            'letter_id': letter_id,
                            'recipient': receiver_name if receiver_name else 'Unknown'
                        }
                        if letter_date:
                            corresp_entry['date'] = letter_date
                        if letter_year:
                            corresp_entry['year'] = letter_year
                        if letter_place:
                            corresp_entry['place'] = letter_place
                        if receiver_gnd:
                            corresp_entry['recipient_gnd'] = receiver_gnd

                        self.women[woman_id]['correspondence'].append(corresp_entry)
                        matched_senders.add(woman_id)

                        # Track provenance for first letter match
                        if is_first_letter:
                            self.add_provenance(woman_id, 'letter_count', {
                                'file': 'ra-cmif.xml',
                                'xpath': f"//correspDesc[@ref and .//persName[@ref='http://d-nb.info/gnd/{sender_gnd}']]",
                                'raw_value': f"GND match: {sender_gnd}",
                                'transformation': f"count of letters as sender via GND matching"
                            })

            # Check mentioned persons
            note = corresp.find('.//tei:note', NS)
            if note:
                for ref in note.findall('.//tei:ref[@type="cmif:mentionsPerson"]', NS):
                    person_ref = ref.get('target', '')
                    person_gnd = self.extract_gnd_id(person_ref)

                    # Match by GND
                    if person_gnd and person_gnd in gnd_to_woman:
                        woman_id = gnd_to_woman[person_gnd]
                        is_first_mention = self.women[woman_id]['mention_count'] == 0
                        self.women[woman_id]['mention_count'] += 1
                        if 'mentioned' not in self.women[woman_id]['roles']:
                            self.women[woman_id]['roles'].append('mentioned')
                        # Add letter year
                        if letter_year:
                            if 'letter_years' not in self.women[woman_id]:
                                self.women[woman_id]['letter_years'] = []
                            self.women[woman_id]['letter_years'].append(letter_year)

                        # Add detailed mention data
                        if 'correspondence' not in self.women[woman_id]:
                            self.women[woman_id]['correspondence'] = []

                        mention_entry = {
                            'type': 'mentioned',
                            'letter_id': letter_id
                        }
                        if letter_date:
                            mention_entry['date'] = letter_date
                        if letter_year:
                            mention_entry['year'] = letter_year
                        if letter_place:
                            mention_entry['place'] = letter_place

                        self.women[woman_id]['correspondence'].append(mention_entry)
                        matched_mentioned.add(woman_id)

                        # Track provenance for first mention
                        if is_first_mention:
                            self.add_provenance(woman_id, 'mention_count', {
                                'file': 'ra-cmif.xml',
                                'xpath': f"//ref[@type='cmif:mentionsPerson' and @target='http://d-nb.info/gnd/{person_gnd}']",
                                'raw_value': f"GND match: {person_gnd}",
                                'transformation': f"count of mentions via GND matching"
                            })

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

            # Track provenance for role assignment
            self.add_provenance(woman_id, 'role', {
                'file': 'calculated',
                'xpath': 'derived from letter_count and mention_count',
                'raw_value': {'roles_array': roles, 'letter_count': woman_data['letter_count'], 'mention_count': woman_data['mention_count']},
                'transformation': f"calculated: {woman_data['role']}"
            })

        self.log(f"  Matched {len(matched_senders)} women as senders")
        self.log(f"  Matched {len(matched_mentioned)} women as mentioned")

        # Validate Phase 2
        self.test_phase2()

        return self.women

    # ============================================================
    # PHASE 3: Enrich with Geodata (HYBRID: new places + old geo)
    # ============================================================

    def phase3_enrich_data(self):
        """Add geodata (hybrid), occupations, relationships"""
        self.log("\n" + "="*60)
        self.log("PHASE 3: Enriching with geodata (HYBRID) and biographical info")
        self.log("="*60)

        # Step 1: Load place linkage from NEW export (person → SNDB_ID)
        self.log("Loading ra_ndb_orte.xml (NEW export)...")
        orte_tree = ET.parse(self.herdata_dir / 'ra_ndb_orte.xml')
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

        # Step 2: Load place names from OLD SNDB (geo_main.xml)
        self.log("Loading geo_main.xml (OLD SNDB for resolution)...")
        geo_main_tree = ET.parse(self.sndb_dir / 'geo_main.xml')
        geo_main_root = geo_main_tree.getroot()

        place_id_to_name = {}
        for item in geo_main_root.findall('.//ITEM'):
            place_id = item.find('ID').text
            lfdnr = item.find('LFDNR').text if item.find('LFDNR') is not None else '0'
            bezeichnung = item.find('BEZEICHNUNG').text if item.find('BEZEICHNUNG') is not None else None

            # Only use main form (LFDNR=0)
            if lfdnr == '0' and bezeichnung:
                place_id_to_name[place_id] = bezeichnung

        self.log(f"  Loaded {len(place_id_to_name)} place names from OLD SNDB")

        # Step 3: Load coordinates from OLD SNDB (geo_indiv.xml)
        self.log("Loading geo_indiv.xml (OLD SNDB for coordinates)...")
        geo_indiv_tree = ET.parse(self.sndb_dir / 'geo_indiv.xml')
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

        self.log(f"  Loaded coordinates for {len(place_id_to_coords)} places from OLD SNDB")

        # Step 4: Merge geodata into women (HYBRID approach)
        for person_id, places_list in person_to_places.items():
            for place_info in places_list:
                place_id = place_info['sndb_id']
                place_name = place_id_to_name.get(place_id)
                coords = place_id_to_coords.get(place_id)

                if place_name and coords:
                    place_data = {
                        'name': place_name,
                        'lat': coords['lat'],
                        'lon': coords['lon'],
                        'type': place_info['type']
                    }
                    self.women[person_id]['places'].append(place_data)

                    # Track provenance for places (first place only to avoid huge provenance)
                    if len(self.women[person_id]['places']) == 1:
                        self.add_provenance(person_id, 'places', {
                            'file': 'ra_ndb_orte.xml (NEW) + geo_main.xml + geo_indiv.xml (OLD)',
                            'xpath': f"//ITEM[ID='{person_id}']/SNDB_ID -> //ITEM[ID='{place_id}']",
                            'raw_value': {
                                'sndb_id': place_id,
                                'place_name': place_name,
                                'coordinates': coords,
                                'type': place_info['type']
                            },
                            'transformation': f"HYBRID: place link from NEW export, resolved via OLD SNDB geodata"
                        })

        self.log(f"  Merged geodata via HYBRID approach (NEW place links + OLD coordinates)")

        # Step 5: Load occupations from NEW export
        self.log("Loading ra_ndb_berufe.xml (NEW export)...")
        berufe_tree = ET.parse(self.herdata_dir / 'ra_ndb_berufe.xml')
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

                    # Track provenance for occupations (first one only)
                    if len(self.women[person_id]['occupations']) == 1:
                        self.add_provenance(person_id, 'occupations', {
                            'file': 'ra_ndb_berufe.xml',
                            'xpath': f"//ITEM[ID='{person_id}']/BERUF",
                            'raw_value': beruf,
                            'transformation': 'direct extraction, multiple occupations possible'
                        })

        self.log(f"  Added {occupations_added} occupation entries from NEW export")

        # Step 6: Load biographical texts from NEW export
        self.log("Loading projekt_regestausgabe.xml (NEW export)...")
        projekt_tree = ET.parse(self.herdata_dir / 'projekt_regestausgabe.xml')
        projekt_root = projekt_tree.getroot()

        biografien_added = 0
        for item in projekt_root.findall('.//ITEM'):
            person_id = item.find('ID').text
            if person_id in self.women:
                registereintrag = item.find('REGISTEREINTRAG').text if item.find('REGISTEREINTRAG') is not None else None
                if registereintrag:
                    # Store biography text
                    self.women[person_id]['biography'] = registereintrag
                    biografien_added += 1

                    # Track provenance for biography
                    self.add_provenance(person_id, 'biography', {
                        'file': 'projekt_regestausgabe.xml',
                        'xpath': f"//ITEM[ID='{person_id}']/REGISTEREINTRAG",
                        'raw_value': registereintrag[:100] + '...' if len(registereintrag) > 100 else registereintrag,
                        'transformation': 'direct extraction of biographical text'
                    })

        self.log(f"  Added {biografien_added} biographical texts from NEW export")

        # Step 7: Load AGRELON relationships from NEW export
        self.log("Loading ra_ndb_beziehungen.xml (NEW export)...")
        beziehungen_tree = ET.parse(self.herdata_dir / 'ra_ndb_beziehungen.xml')
        beziehungen_root = beziehungen_tree.getroot()

        # Load AGRELON type definitions
        agrelon_tree = ET.parse(self.herdata_dir / 'nsl_agrelon.xml')
        agrelon_root = agrelon_tree.getroot()

        # Build AGRELON ID to label mapping
        agrelon_types = {}
        for item in agrelon_root.findall('.//ITEM'):
            agrelon_id = item.find('IDENT').text if item.find('IDENT') is not None else None
            beziehung = item.find('BEZIEHUNG').text if item.find('BEZIEHUNG') is not None else None
            if agrelon_id and beziehung:
                agrelon_types[agrelon_id] = beziehung

        self.log(f"  Loaded {len(agrelon_types)} AGRELON relationship types")

        # Process relationships
        relationships_added = 0
        for item in beziehungen_root.findall('.//ITEM'):
            id1 = item.find('ID1').text if item.find('ID1') is not None else None
            id2 = item.find('ID2').text if item.find('ID2') is not None else None
            agrelon_id1 = item.find('AGRELON_ID1').text if item.find('AGRELON_ID1') is not None else None
            agrelon_id2 = item.find('AGRELON_ID2').text if item.find('AGRELON_ID2') is not None else None

            # Only process if both persons are in our women dataset
            if id1 in self.women and id2 in self.women:
                # Get relationship type labels
                type1 = agrelon_types.get(agrelon_id1, 'Unbekannte Beziehung')
                type2 = agrelon_types.get(agrelon_id2, 'Unbekannte Beziehung')

                # Add relationship to person 1
                if 'relationships' not in self.women[id1]:
                    self.women[id1]['relationships'] = []

                self.women[id1]['relationships'].append({
                    'target_id': id2,
                    'type': type1,
                    'type_id': agrelon_id1,
                    'reciprocal_type': type2
                })

                # Add reciprocal relationship to person 2
                if 'relationships' not in self.women[id2]:
                    self.women[id2]['relationships'] = []

                self.women[id2]['relationships'].append({
                    'target_id': id1,
                    'type': type2,
                    'type_id': agrelon_id2,
                    'reciprocal_type': type1
                })

                relationships_added += 2  # Count both directions

        self.log(f"  Added {relationships_added} relationship entries (bidirectional)")

        # Validate Phase 3
        self.test_phase3()

        return self.women

    # ============================================================
    # PHASE 4: Generate JSON Output (unchanged)
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
                'data_source': 'NEW export 2025-10-27 (curated 448 women)',
                'total_women': total_women,
                'with_cmif_data': with_letters,
                'with_geodata': with_geodata,
                'with_gnd': with_gnd,
                'gnd_coverage_pct': round(with_gnd / total_women * 100, 1) if total_women > 0 else 0,
                'geodata_coverage_pct': round(with_geodata / total_women * 100, 1) if total_women > 0 else 0,
                'data_sources': {
                    'persons': 'data/herdata/ (ra_ndb_*)',
                    'geodata': 'data/sndb/ (geo_main.xml, geo_indiv.xml)',
                    'cmif': 'data/ra-cmif.xml (2025-03 snapshot)'
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

            if woman_data.get('biography'):
                person['biography'] = woman_data['biography']

            if woman_data.get('relationships'):
                person['relationships'] = woman_data['relationships']

            if woman_data.get('correspondence'):
                person['correspondence'] = woman_data['correspondence']

            output_data['persons'].append(person)

        # Validate Phase 4
        self.test_phase4(output_data)

        # Write PRODUCTION file (clean, no provenance)
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        file_size_mb = self.output_file.stat().st_size / (1024 * 1024)
        self.stats['phase4']['output_file_size'] = f"{file_size_mb:.2f} MB"

        self.log(f"\n[OK] PRODUCTION JSON written to {self.output_file}")
        self.log(f"  File size: {file_size_mb:.2f} MB")

        # Write DEBUG file (with provenance data) if tracking enabled
        if self.track_provenance:
            debug_output_data = {
                'meta': output_data['meta'].copy(),
                'persons': []
            }

            # Add flag to meta
            debug_output_data['meta']['provenance_enabled'] = True

            # Add persons WITH provenance
            for woman_id, woman_data in self.women.items():
                # Determine normierung status
                if woman_data.get('gnd'):
                    normierung = 'gnd'
                else:
                    normierung = 'sndb'

                # Build person entry WITH provenance
                person_debug = {
                    'id': woman_data['id'],
                    'name': woman_data['name'],
                    'role': woman_data.get('role', 'indirect'),
                    'normierung': normierung,
                    'sndb_url': woman_data['sndb_url']
                }

                # Add optional fields only if present
                if woman_data.get('gnd'):
                    person_debug['gnd'] = woman_data['gnd']

                if woman_data.get('roles'):
                    person_debug['roles'] = woman_data['roles']

                if woman_data.get('letter_count', 0) > 0:
                    person_debug['letter_count'] = woman_data['letter_count']

                if woman_data.get('letter_years'):
                    person_debug['letter_years'] = sorted(list(set(woman_data['letter_years'])))

                if woman_data.get('mention_count', 0) > 0:
                    person_debug['mention_count'] = woman_data['mention_count']

                if woman_data.get('dates', {}).get('birth') or woman_data.get('dates', {}).get('death'):
                    person_debug['dates'] = woman_data['dates']

                if woman_data.get('places'):
                    person_debug['places'] = woman_data['places']

                if woman_data.get('occupations'):
                    person_debug['occupations'] = woman_data['occupations']

                if woman_data.get('biography'):
                    person_debug['biography'] = woman_data['biography']

                if woman_data.get('relationships'):
                    person_debug['relationships'] = woman_data['relationships']

                if woman_data.get('correspondence'):
                    person_debug['correspondence'] = woman_data['correspondence']

                # ADD PROVENANCE DATA
                if woman_data.get('_provenance'):
                    person_debug['_provenance'] = woman_data['_provenance']

                debug_output_data['persons'].append(person_debug)

            # Write debug file
            debug_file = self.output_file.parent / 'persons_debug.json'
            with open(debug_file, 'w', encoding='utf-8') as f:
                json.dump(debug_output_data, f, ensure_ascii=False, indent=2)

            debug_file_size_mb = debug_file.stat().st_size / (1024 * 1024)
            self.stats['phase4']['debug_file_size'] = f"{debug_file_size_mb:.2f} MB"

            self.log(f"\n[OK] DEBUG JSON written to {debug_file}")
            self.log(f"  File size: {debug_file_size_mb:.2f} MB")
            self.log(f"  Size increase: {debug_file_size_mb - file_size_mb:.2f} MB ({((debug_file_size_mb / file_size_mb - 1) * 100):.1f}% larger)")

        return output_data

    # ============================================================
    # Run Complete Pipeline
    # ============================================================

    def run(self):
        """Execute complete 4-phase pipeline with NEW data"""
        self.log("\n" + "="*60)
        self.log("HERDATA PIPELINE NEW - Using curated export 2025-10-27")
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
        self.log("PIPELINE SUMMARY (NEW DATA)")
        self.log("="*60)

        self.log(f"\nPhase 1 - Women Identification (NEW export):")
        for key, value in self.stats['phase1'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nPhase 2 - CMIF Letter Matching:")
        for key, value in self.stats['phase2'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nPhase 3 - Data Enrichment (HYBRID geodata):")
        for key, value in self.stats['phase3'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nPhase 4 - JSON Generation:")
        for key, value in self.stats['phase4'].items():
            self.log(f"  {key}: {value}")

        self.log(f"\nExecution time: {duration:.2f} seconds")
        self.log("\n" + "="*60)
        self.log("[SUCCESS] PIPELINE COMPLETE (NEW DATA)")
        self.log("="*60 + "\n")


def main():
    """Run HerData pipeline with NEW export and HYBRID geodata"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    herdata_dir = project_root / 'data' / 'herdata'
    sndb_dir = project_root / 'data' / 'sndb'
    cmif_file = project_root / 'data' / 'ra-cmif.xml'
    output_file = project_root / 'docs' / 'data' / 'persons.json'

    pipeline = HerDataPipelineNew(
        herdata_dir=herdata_dir,
        sndb_dir=sndb_dir,
        cmif_file=cmif_file,
        output_file=output_file,
        verbose=True
    )
    pipeline.run()


if __name__ == '__main__':
    main()
