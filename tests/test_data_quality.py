"""
HerData Data Quality Tests

Validates semantic correctness and consistency of generated persons.json
Tests for referential integrity, plausibility, and completeness.

Run with: pytest tests/test_data_quality.py -v
"""

import json
import pytest
from pathlib import Path


@pytest.fixture(scope="module")
def persons_data():
    """Load persons.json once for all tests"""
    json_path = Path(__file__).parent.parent / 'docs' / 'data' / 'persons.json'

    if not json_path.exists():
        pytest.skip(f"persons.json not found at {json_path}")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return data


@pytest.fixture(scope="module")
def persons_list(persons_data):
    """Extract persons list for convenience"""
    return persons_data['persons']


# ==============================================================================
# Suite 1: Referential Integrity
# ==============================================================================

def test_no_duplicate_ids(persons_list):
    """Each person must have unique ID"""
    ids = [p['id'] for p in persons_list]
    duplicates = [id for id in set(ids) if ids.count(id) > 1]

    assert len(ids) == len(set(ids)), \
        f"Duplicate IDs found: {duplicates}"


def test_no_duplicate_gnd_ids(persons_list):
    """No two persons should share same GND ID"""
    gnds = [p['gnd'] for p in persons_list if 'gnd' in p and p['gnd']]
    duplicates = [gnd for gnd in set(gnds) if gnds.count(gnd) > 1]

    assert len(gnds) == len(set(gnds)), \
        f"Duplicate GND IDs found: {duplicates}"


def test_relationships_target_exists(persons_list):
    """All relationship.target_id must reference existing persons"""
    person_ids = {p['id'] for p in persons_list}

    errors = []
    for person in persons_list:
        if 'relationships' not in person:
            continue

        for rel in person['relationships']:
            target = rel['target_id']
            if target not in person_ids:
                errors.append(
                    f"Person {person['id']} ({person['name']}) has relationship "
                    f"to non-existent target {target}"
                )

    assert not errors, "\n".join(errors)


def test_correspondence_recipients_exist_if_gnd(persons_list):
    """Correspondence recipients with GND should exist in dataset (if they are women)"""
    person_gnds = {p.get('gnd') for p in persons_list if 'gnd' in p}

    warnings = []
    for person in persons_list:
        if 'correspondence' not in person:
            continue

        for corr in person['correspondence']:
            if 'recipient_gnd' in corr:
                recipient_gnd = corr['recipient_gnd']
                # Note: Recipient might be Goethe (male), so not an error if missing
                # This is just a data quality check
                if recipient_gnd not in person_gnds:
                    warnings.append(
                        f"Person {person['name']} has correspondence with "
                        f"recipient GND {recipient_gnd} not in dataset"
                    )

    # This is informational, not a hard failure
    if warnings and len(warnings) > 10:
        print(f"\nInfo: {len(warnings)} correspondence recipients not in dataset (likely male or outside scope)")


# ==============================================================================
# Suite 2: Geodata Plausibility
# ==============================================================================

def test_coordinates_are_valid(persons_list):
    """Coordinates must be valid lat/lon values"""
    errors = []

    for person in persons_list:
        if 'places' not in person:
            continue

        for place in person['places']:
            lat = place.get('lat')
            lon = place.get('lon')

            if lat is None or lon is None:
                errors.append(
                    f"Person {person['name']}: Place '{place.get('name', 'unknown')}' "
                    f"missing coordinates"
                )
                continue

            # Valid lat/lon ranges (global, not Europe-specific)
            if not (-90 <= lat <= 90):
                errors.append(
                    f"Person {person['name']}: Place '{place['name']}' "
                    f"has invalid latitude {lat} (must be -90 to 90)"
                )

            if not (-180 <= lon <= 180):
                errors.append(
                    f"Person {person['name']}: Place '{place['name']}' "
                    f"has invalid longitude {lon} (must be -180 to 180)"
                )

    assert not errors, "\n".join(errors[:10])


def test_places_have_required_fields(persons_list):
    """Places must have name, lat, lon"""
    errors = []

    for person in persons_list:
        if 'places' not in person:
            continue

        for i, place in enumerate(person['places']):
            if 'name' not in place:
                errors.append(
                    f"Person {person['name']}: Place #{i} missing 'name'"
                )
            if 'lat' not in place:
                errors.append(
                    f"Person {person['name']}: Place '{place.get('name', 'unknown')}' missing 'lat'"
                )
            if 'lon' not in place:
                errors.append(
                    f"Person {person['name']}: Place '{place.get('name', 'unknown')}' missing 'lon'"
                )

    assert not errors, "\n".join(errors[:10])


def test_coordinates_are_numbers(persons_list):
    """Coordinates must be float/int, not strings"""
    errors = []

    for person in persons_list:
        for place in person.get('places', []):
            lat = place.get('lat')
            lon = place.get('lon')

            if lat is not None and not isinstance(lat, (int, float)):
                errors.append(
                    f"Person {person['name']}: Place '{place['name']}' "
                    f"has non-numeric latitude: {type(lat).__name__}"
                )

            if lon is not None and not isinstance(lon, (int, float)):
                errors.append(
                    f"Person {person['name']}: Place '{place['name']}' "
                    f"has non-numeric longitude: {type(lon).__name__}"
                )

    assert not errors, "\n".join(errors[:10])


# ==============================================================================
# Suite 3: Temporal Plausibility
# ==============================================================================

def test_birth_before_death(persons_list):
    """Birth year must be before death year"""
    errors = []

    for person in persons_list:
        dates = person.get('dates', {})
        if 'birth' not in dates or 'death' not in dates:
            continue

        try:
            birth = int(dates['birth'])
            death = int(dates['death'])

            if birth >= death:
                errors.append(
                    f"Person {person['name']} (ID {person['id']}): "
                    f"birth year {birth} >= death year {death}"
                )
        except ValueError as e:
            errors.append(
                f"Person {person['name']}: Invalid date format - {e}"
            )

    assert not errors, "\n".join(errors)


def test_dates_in_plausible_range(persons_list):
    """Birth/death dates should be roughly 1600-1900"""
    errors = []

    for person in persons_list:
        dates = person.get('dates', {})

        if 'birth' in dates:
            try:
                birth = int(dates['birth'])
                if not (1600 <= birth <= 1900):
                    errors.append(
                        f"Person {person['name']}: Implausible birth year {birth}"
                    )
            except ValueError:
                errors.append(
                    f"Person {person['name']}: Invalid birth year '{dates['birth']}'"
                )

        if 'death' in dates:
            try:
                death = int(dates['death'])
                if not (1600 <= death <= 1900):
                    errors.append(
                        f"Person {person['name']}: Implausible death year {death}"
                    )
            except ValueError:
                errors.append(
                    f"Person {person['name']}: Invalid death year '{dates['death']}'"
                )

    assert not errors, "\n".join(errors[:10])


def test_correspondence_years_in_corpus_range(persons_list):
    """Correspondence years must be within CMIF corpus range (1760-1824)"""
    errors = []

    for person in persons_list:
        if 'correspondence' not in person:
            continue

        for corr in person['correspondence']:
            if 'year' not in corr:
                continue

            year = corr['year']
            if not isinstance(year, int):
                errors.append(
                    f"Person {person['name']}: Correspondence year '{year}' is not integer"
                )
                continue

            if not (1760 <= year <= 1824):
                errors.append(
                    f"Person {person['name']}: Correspondence year {year} "
                    f"outside corpus range (1760-1824)"
                )

    assert not errors, "\n".join(errors[:10])


def test_letter_years_populated_when_year_available(persons_list):
    """If correspondence has year data, letter_years should be populated"""
    errors = []

    for person in persons_list:
        correspondence = person.get('correspondence', [])
        letter_years = person.get('letter_years', [])

        # Check if any correspondence entry has a year
        years_in_correspondence = [c.get('year') for c in correspondence if c.get('year')]

        # If correspondence has years, letter_years should be populated
        if years_in_correspondence and not letter_years:
            errors.append(
                f"Person {person['name']}: Has {len(years_in_correspondence)} "
                f"correspondence entries with years, but letter_years is empty"
            )

        # If letter_years exists, should have correspondence
        if letter_years and not correspondence:
            errors.append(
                f"Person {person['name']}: Has letter_years but no correspondence data"
            )

    assert not errors, "\n".join(errors[:10])


# ==============================================================================
# Suite 4: Completeness and Required Fields
# ==============================================================================

def test_all_persons_have_required_fields(persons_list):
    """All persons must have id, name, role, normierung, sndb_url"""
    required_fields = ['id', 'name', 'role', 'normierung', 'sndb_url']
    errors = []

    for i, person in enumerate(persons_list):
        for field in required_fields:
            if field not in person:
                errors.append(
                    f"Person #{i} (ID {person.get('id', 'unknown')}): "
                    f"Missing required field '{field}'"
                )

    assert not errors, "\n".join(errors[:20])


def test_role_values_valid(persons_list):
    """Role must be one of: sender, mentioned, both, indirect"""
    valid_roles = {'sender', 'mentioned', 'both', 'indirect'}
    errors = []

    for person in persons_list:
        role = person.get('role')
        if role not in valid_roles:
            errors.append(
                f"Person {person['name']}: Invalid role '{role}' "
                f"(must be one of {valid_roles})"
            )

    assert not errors, "\n".join(errors)


def test_normierung_values_valid(persons_list):
    """Normierung must be 'gnd' or 'sndb'"""
    valid_normierung = {'gnd', 'sndb'}
    errors = []

    for person in persons_list:
        normierung = person.get('normierung')
        if normierung not in valid_normierung:
            errors.append(
                f"Person {person['name']}: Invalid normierung '{normierung}' "
                f"(must be 'gnd' or 'sndb')"
            )

    assert not errors, "\n".join(errors)


def test_gnd_normierung_has_gnd_field(persons_list):
    """Persons with normierung='gnd' must have gnd field"""
    errors = []

    for person in persons_list:
        if person.get('normierung') == 'gnd':
            if 'gnd' not in person or not person['gnd']:
                errors.append(
                    f"Person {person['name']} (ID {person['id']}): "
                    f"Marked as normierung='gnd' but missing/empty gnd field"
                )

    assert not errors, "\n".join(errors)


def test_sndb_urls_valid_format(persons_list):
    """SNDB URLs should have correct format"""
    expected_base = "https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:"
    errors = []

    for person in persons_list:
        url = person.get('sndb_url', '')
        if not url.startswith(expected_base):
            errors.append(
                f"Person {person['name']}: Invalid SNDB URL format: {url}"
            )

    assert not errors, "\n".join(errors[:10])


# ==============================================================================
# Suite 5: Metadata Consistency
# ==============================================================================

def test_meta_counts_match_actual(persons_data):
    """Metadata counts should match actual data"""
    meta = persons_data['meta']
    persons = persons_data['persons']

    # Total women
    actual_total = len(persons)
    assert meta['total_women'] == actual_total, \
        f"meta.total_women ({meta['total_women']}) != actual count ({actual_total})"

    # With CMIF data (letter_count > 0 or mention_count > 0)
    actual_with_cmif = sum(1 for p in persons
                           if p.get('letter_count', 0) > 0 or p.get('mention_count', 0) > 0)
    assert meta['with_cmif_data'] == actual_with_cmif, \
        f"meta.with_cmif_data ({meta['with_cmif_data']}) != actual ({actual_with_cmif})"

    # With geodata
    actual_with_geodata = sum(1 for p in persons
                              if p.get('places') and len(p['places']) > 0)
    assert meta['with_geodata'] == actual_with_geodata, \
        f"meta.with_geodata ({meta['with_geodata']}) != actual ({actual_with_geodata})"

    # With GND
    actual_with_gnd = sum(1 for p in persons if p.get('gnd'))
    assert meta['with_gnd'] == actual_with_gnd, \
        f"meta.with_gnd ({meta['with_gnd']}) != actual ({actual_with_gnd})"


def test_timeline_data_consistent(persons_data):
    """Timeline data should match correspondence years"""
    timeline = persons_data['meta'].get('timeline', [])
    persons = persons_data['persons']

    # Aggregate all correspondence years from persons
    year_counts = {}
    for person in persons:
        for corr in person.get('correspondence', []):
            year = corr.get('year')
            if year:
                year_counts[year] = year_counts.get(year, 0) + 1

    # Compare with timeline
    timeline_years = {entry['year']: entry['count'] for entry in timeline}

    errors = []
    for year, count in year_counts.items():
        if year not in timeline_years:
            errors.append(f"Year {year} in correspondence but not in timeline")
        elif timeline_years[year] != count:
            errors.append(
                f"Year {year}: timeline count ({timeline_years[year]}) "
                f"!= actual count ({count})"
            )

    assert not errors, "\n".join(errors[:10])


# ==============================================================================
# Suite 6: Data Quality Statistics (Informational)
# ==============================================================================

def test_coverage_statistics(persons_list, capsys):
    """Print coverage statistics for review (always passes)"""
    total = len(persons_list)

    with_gnd = sum(1 for p in persons_list if p.get('gnd'))
    with_dates = sum(1 for p in persons_list if p.get('dates'))
    with_birth = sum(1 for p in persons_list if p.get('dates', {}).get('birth'))
    with_death = sum(1 for p in persons_list if p.get('dates', {}).get('death'))
    with_places = sum(1 for p in persons_list if p.get('places'))
    with_occupations = sum(1 for p in persons_list if p.get('occupations'))
    with_relationships = sum(1 for p in persons_list if p.get('relationships'))
    with_biography = sum(1 for p in persons_list if p.get('biography'))
    with_correspondence = sum(1 for p in persons_list if p.get('correspondence'))

    print("\n" + "="*60)
    print("DATA COVERAGE STATISTICS")
    print("="*60)
    print(f"Total persons:        {total}")
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

    # Always pass - this is just informational
    assert True
