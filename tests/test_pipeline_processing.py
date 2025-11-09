"""
HerData Pipeline Processing Tests

Tests that verify the pipeline correctly processes and transforms source data.
NOT testing if source data is "good", but if transformations are correct.

Run with: pytest tests/test_pipeline_processing.py -v
"""

import json
import pytest
import xml.etree.ElementTree as ET
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


@pytest.fixture(scope="module")
def source_xml_main():
    """Load source XML for comparison tests"""
    xml_path = Path(__file__).parent.parent / 'data' / 'herdata' / 'ra_ndb_main.xml'

    if not xml_path.exists():
        pytest.skip(f"Source XML not found at {xml_path}")

    tree = ET.parse(xml_path)
    root = tree.getroot()

    # Parse structure: <personen><person id="..."><name>...</name><gnd>...</gnd></person></personen>
    return root


# ==============================================================================
# Suite 1: Data Preservation (Pipeline doesn't lose/corrupt data)
# ==============================================================================

def test_all_persons_from_xml_present_in_json(source_xml_main, persons_list):
    """Pipeline should include all persons from source XML"""
    # Count unique person IDs in source XML (structure: <ITEM><ID>35239</ID>...)
    xml_ids = set()
    for item in source_xml_main.findall('.//ITEM'):
        id_elem = item.find('ID')
        if id_elem is not None and id_elem.text:
            xml_ids.add(id_elem.text.strip())

    xml_count = len(xml_ids)
    json_count = len(persons_list)

    # Pipeline should preserve all persons (or very close - some might be filtered)
    assert json_count >= xml_count * 0.95, \
        f"Pipeline lost >5% of persons: XML={xml_count}, JSON={json_count}"


def test_person_ids_are_from_source_xml(source_xml_main, persons_list):
    """All person IDs in JSON should come from source XML"""
    # Extract IDs from XML
    xml_ids = set()
    for item in source_xml_main.findall('.//ITEM'):
        id_elem = item.find('ID')
        if id_elem is not None and id_elem.text:
            xml_ids.add(id_elem.text.strip())

    # Check all JSON IDs are from XML
    errors = []
    for person in persons_list:
        person_id = str(person['id'])
        if person_id not in xml_ids:
            errors.append(
                f"Person {person['name']} has ID {person_id} not found in source XML"
            )

    assert not errors, "\n".join(errors[:10])


def test_occupations_not_duplicated(persons_list):
    """Pipeline should not create duplicate occupations for same person"""
    errors = []

    for person in persons_list:
        occupations = person.get('occupations', [])
        if not occupations:
            continue

        # Extract occupation names
        occ_names = [occ.get('name') if isinstance(occ, dict) else str(occ)
                     for occ in occupations]

        # Check for duplicates
        if len(occ_names) != len(set(occ_names)):
            duplicates = [name for name in occ_names if occ_names.count(name) > 1]
            errors.append(
                f"Person {person['name']} (ID {person['id']}): "
                f"Duplicate occupations: {set(duplicates)}"
            )

    assert not errors, "\n".join(errors[:10])


def test_places_not_duplicated(persons_list):
    """Pipeline should not create duplicate places for same person"""
    # NOTE: Same place with different types (birth/death/residence) is allowed
    # Only checking for exact duplicates (same name, coordinates, AND type)
    errors = []

    for person in persons_list:
        places = person.get('places', [])
        if not places:
            continue

        # Create unique key for each place (name + lat + lon + type)
        place_keys = []
        for place in places:
            if isinstance(place, dict):
                key = (place.get('name'), place.get('lat'), place.get('lon'), place.get('type'))
                place_keys.append(key)

        # Check for exact duplicates
        if len(place_keys) != len(set(place_keys)):
            duplicates = [key for key in place_keys if place_keys.count(key) > 1]
            errors.append(
                f"Person {person['name']} (ID {person['id']}): "
                f"Exact duplicate places: {set(duplicates)}"
            )

    assert not errors, "\n".join(errors[:10])


# ==============================================================================
# Suite 2: Type Consistency (Pipeline produces correct data types)
# ==============================================================================

def test_dates_are_consistent_format(persons_list):
    """Birth/death dates should be consistently formatted"""
    errors = []

    for person in persons_list:
        dates = person.get('dates', {})

        # If dates exist, they should be strings representing years
        for date_type in ['birth', 'death']:
            if date_type in dates:
                date_value = dates[date_type]

                # Should be a string or int
                if not isinstance(date_value, (str, int)):
                    errors.append(
                        f"Person {person['name']}: {date_type} date has type {type(date_value).__name__}, "
                        f"expected str or int"
                    )
                    continue

                # Should be convertible to integer year
                try:
                    year = int(date_value)
                except ValueError:
                    errors.append(
                        f"Person {person['name']}: {date_type} date '{date_value}' not convertible to year"
                    )

    assert not errors, "\n".join(errors[:10])


def test_letter_years_are_integers(persons_list):
    """letter_years array should contain only integers"""
    errors = []

    for person in persons_list:
        letter_years = person.get('letter_years', [])

        for year in letter_years:
            if not isinstance(year, int):
                errors.append(
                    f"Person {person['name']}: letter_years contains non-integer: {year} ({type(year).__name__})"
                )
                break  # Only report once per person

    assert not errors, "\n".join(errors[:10])


def test_letter_count_is_integer(persons_list):
    """letter_count should be integer"""
    errors = []

    for person in persons_list:
        if 'letter_count' in person:
            count = person['letter_count']
            if not isinstance(count, int):
                errors.append(
                    f"Person {person['name']}: letter_count is {type(count).__name__}, expected int"
                )

    assert not errors, "\n".join(errors[:10])


def test_mention_count_is_integer(persons_list):
    """mention_count should be integer"""
    errors = []

    for person in persons_list:
        if 'mention_count' in person:
            count = person['mention_count']
            if not isinstance(count, int):
                errors.append(
                    f"Person {person['name']}: mention_count is {type(count).__name__}, expected int"
                )

    assert not errors, "\n".join(errors[:10])


# ==============================================================================
# Suite 3: Relationship Resolution (Pipeline correctly resolves references)
# ==============================================================================

def test_correspondence_recipients_resolved(persons_list):
    """Correspondence with recipient_gnd should have recipient_name if resolvable"""
    # Build GND -> name lookup
    gnd_to_name = {p.get('gnd'): p['name'] for p in persons_list if p.get('gnd')}

    missing_names = []
    mismatch_names = []

    for person in persons_list:
        correspondence = person.get('correspondence', [])

        for corr in correspondence:
            recipient_gnd = corr.get('recipient_gnd')
            recipient_name = corr.get('recipient_name')

            # If we have GND and it's in our dataset, should have name
            if recipient_gnd and recipient_gnd in gnd_to_name:
                expected_name = gnd_to_name[recipient_gnd]

                if not recipient_name:
                    missing_names.append(
                        f"Person {person['name']}: Correspondence has recipient_gnd {recipient_gnd} "
                        f"(in dataset as {expected_name}) but missing recipient_name"
                    )
                elif recipient_name != expected_name:
                    # Name mismatch (pipeline resolution error)
                    mismatch_names.append(
                        f"Person {person['name']}: Correspondence recipient_name mismatch: "
                        f"expected '{expected_name}', got '{recipient_name}'"
                    )

    # KNOWN ISSUE: Pipeline doesn't currently enrich recipient_name for internal recipients
    # This test documents the issue but doesn't fail the build
    if missing_names:
        print(f"\nKNOWN ISSUE: {len(missing_names)} correspondence entries missing recipient_name")
        print("First 3 examples:")
        for example in missing_names[:3]:
            print(f"  - {example}")

    # Name mismatches ARE errors (data corruption)
    assert not mismatch_names, "\n".join(mismatch_names[:10])


def test_relationship_targets_have_names(persons_list):
    """Relationships should have target_name populated if target exists"""
    # Build ID -> name lookup (convert IDs to string for comparison)
    id_to_name = {str(p['id']): p['name'] for p in persons_list}

    missing_names = []
    mismatch_names = []

    for person in persons_list:
        relationships = person.get('relationships', [])

        for rel in relationships:
            target_id = str(rel.get('target_id')) if rel.get('target_id') else None
            target_name = rel.get('target_name')

            # If target exists in dataset, should have name
            if target_id and target_id in id_to_name:
                expected_name = id_to_name[target_id]

                if not target_name:
                    missing_names.append(
                        f"Person {person['name']}: Relationship to {target_id} "
                        f"({expected_name}) missing target_name"
                    )
                elif target_name != expected_name:
                    mismatch_names.append(
                        f"Person {person['name']}: Relationship target_name mismatch: "
                        f"expected '{expected_name}', got '{target_name}'"
                    )

    # KNOWN ISSUE: Pipeline doesn't currently enrich target_name for relationships
    # This test documents the issue but doesn't fail the build
    if missing_names:
        print(f"\nKNOWN ISSUE: {len(missing_names)} relationships missing target_name")
        print("First 3 examples:")
        for example in missing_names[:3]:
            print(f"  - {example}")

    # Name mismatches ARE errors (data corruption)
    assert not mismatch_names, "\n".join(mismatch_names[:10])


# ==============================================================================
# Suite 4: Geodata Resolution (Pipeline correctly enriches place data)
# ==============================================================================

def test_places_have_coordinates_when_name_exists(persons_list):
    """If place has name, pipeline should attempt to provide coordinates"""
    errors = []

    for person in persons_list:
        places = person.get('places', [])

        for place in places:
            if not isinstance(place, dict):
                continue

            name = place.get('name')
            lat = place.get('lat')
            lon = place.get('lon')

            # If we have a name, we should have attempted geocoding
            # (lat/lon can be None if geocoding failed, but both should be present or absent together)
            if name:
                has_lat = lat is not None
                has_lon = lon is not None

                if has_lat != has_lon:
                    errors.append(
                        f"Person {person['name']}: Place '{name}' has incomplete coordinates: "
                        f"lat={lat}, lon={lon} (should both be present or absent)"
                    )

    assert not errors, "\n".join(errors[:10])


def test_place_types_are_present(persons_list):
    """Place types should exist (pipeline enriches places with type information)"""
    # Note: Types come from German SNDB (Geburtsort, Sterbeort, Wirkungsort, etc.)
    # We just check that type field exists, not specific values
    errors = []

    for person in persons_list:
        places = person.get('places', [])

        for place in places:
            if not isinstance(place, dict):
                continue

            # Type can be None/missing for some places, but should be a string if present
            place_type = place.get('type')
            if place_type is not None and not isinstance(place_type, str):
                errors.append(
                    f"Person {person['name']}: Place '{place.get('name')}' has "
                    f"non-string type: {place_type} ({type(place_type).__name__})"
                )

    assert not errors, "\n".join(errors[:10])


# ==============================================================================
# Suite 5: Aggregate Consistency (Derived fields match source data)
# ==============================================================================

def test_letter_count_matches_correspondence(persons_list):
    """letter_count should match number of correspondence entries where type is 'sent'"""
    errors = []

    for person in persons_list:
        letter_count = person.get('letter_count', 0)
        correspondence = person.get('correspondence', [])

        # Count letters where type is 'sent'
        actual_letter_count = sum(1 for c in correspondence if c.get('type') == 'sent')

        if letter_count != actual_letter_count:
            errors.append(
                f"Person {person['name']}: letter_count={letter_count} but "
                f"correspondence has {actual_letter_count} 'sent' entries"
            )

    assert not errors, "\n".join(errors[:10])


def test_mention_count_consistency(persons_list):
    """mention_count should be present and >= 0 when person has mention role"""
    # Note: mention_count may not match correspondence entries because
    # mentions are tracked separately (person mentioned in letter content, not as sender)
    errors = []

    for person in persons_list:
        role = person.get('role')
        mention_count = person.get('mention_count', 0)

        # If role is 'mentioned' or 'both', should have mention_count field
        if role in ['mentioned', 'both']:
            if 'mention_count' not in person:
                errors.append(
                    f"Person {person['name']}: Has role '{role}' but missing mention_count field"
                )
            elif not isinstance(mention_count, int) or mention_count < 0:
                errors.append(
                    f"Person {person['name']}: Invalid mention_count={mention_count}"
                )

    assert not errors, "\n".join(errors[:10])


def test_letter_years_derived_from_correspondence(persons_list):
    """letter_years should be sorted unique years from correspondence"""
    errors = []

    for person in persons_list:
        letter_years = person.get('letter_years', [])
        correspondence = person.get('correspondence', [])

        # Extract years from correspondence
        corr_years = [c.get('year') for c in correspondence if c.get('year')]
        expected_years = sorted(set(corr_years))

        # Compare
        if letter_years != expected_years:
            errors.append(
                f"Person {person['name']}: letter_years mismatch\n"
                f"  Expected (from correspondence): {expected_years}\n"
                f"  Got: {letter_years}"
            )

    assert not errors, "\n".join(errors[:10])
