"""
HerData JSON Schema Validation Tests

Validates that persons.json conforms to the defined JSON schema.
This ensures the contract between Python pipeline and JavaScript frontend.

Run with: pytest tests/test_json_schema.py -v
"""

import json
import pytest
from pathlib import Path

try:
    import jsonschema
    from jsonschema import validate, ValidationError
except ImportError:
    pytest.skip("jsonschema package not installed (pip install jsonschema)", allow_module_level=True)


@pytest.fixture(scope="module")
def schema():
    """Load JSON schema"""
    schema_path = Path(__file__).parent / 'persons.schema.json'

    if not schema_path.exists():
        pytest.fail(f"Schema file not found at {schema_path}")

    with open(schema_path, 'r', encoding='utf-8') as f:
        return json.load(f)


@pytest.fixture(scope="module")
def persons_data():
    """Load persons.json"""
    json_path = Path(__file__).parent.parent / 'docs' / 'data' / 'persons.json'

    if not json_path.exists():
        pytest.skip(f"persons.json not found at {json_path}")

    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def test_persons_json_valid_schema(persons_data, schema):
    """persons.json must conform to JSON schema"""
    try:
        validate(instance=persons_data, schema=schema)
    except ValidationError as e:
        # Format error message with context
        error_path = " -> ".join(str(p) for p in e.path)
        pytest.fail(
            f"Schema validation failed:\n"
            f"Path: {error_path or 'root'}\n"
            f"Error: {e.message}\n"
            f"Schema rule: {e.schema}"
        )


def test_meta_structure(persons_data, schema):
    """Meta object must have required fields"""
    meta = persons_data['meta']

    required_fields = schema['properties']['meta']['required']

    for field in required_fields:
        assert field in meta, f"Missing required meta field: {field}"


def test_persons_array_not_empty(persons_data):
    """Persons array must contain at least one person"""
    persons = persons_data['persons']

    assert isinstance(persons, list), "persons must be an array"
    assert len(persons) > 0, "persons array is empty"


def test_all_person_ids_are_strings(persons_data):
    """Person IDs must be strings (as per schema)"""
    persons = persons_data['persons']

    for person in persons:
        person_id = person.get('id')
        assert isinstance(person_id, str), \
            f"Person ID must be string, got {type(person_id).__name__} for {person.get('name')}"


def test_all_coordinates_are_numbers(persons_data):
    """Coordinates must be numbers (not strings)"""
    persons = persons_data['persons']
    errors = []

    for person in persons:
        for place in person.get('places', []):
            lat = place.get('lat')
            lon = place.get('lon')

            if lat is not None and not isinstance(lat, (int, float)):
                errors.append(
                    f"Person {person['name']}: lat is {type(lat).__name__}, expected number"
                )

            if lon is not None and not isinstance(lon, (int, float)):
                errors.append(
                    f"Person {person['name']}: lon is {type(lon).__name__}, expected number"
                )

    assert not errors, "\n".join(errors[:10])


def test_role_values_match_schema(persons_data, schema):
    """Role values must be from allowed enum"""
    persons = persons_data['persons']
    allowed_roles = set(schema['properties']['persons']['items']['properties']['role']['enum'])

    invalid = []
    for person in persons:
        role = person.get('role')
        if role not in allowed_roles:
            invalid.append(f"{person['name']}: '{role}'")

    assert not invalid, f"Invalid roles found: {', '.join(invalid)}"


def test_normierung_values_match_schema(persons_data, schema):
    """Normierung values must be from allowed enum"""
    persons = persons_data['persons']
    allowed_normierung = set(schema['properties']['persons']['items']['properties']['normierung']['enum'])

    invalid = []
    for person in persons:
        normierung = person.get('normierung')
        if normierung not in allowed_normierung:
            invalid.append(f"{person['name']}: '{normierung}'")

    assert not invalid, f"Invalid normierung values found: {', '.join(invalid)}"


def test_timeline_years_in_range(persons_data):
    """Timeline years must be within corpus range (1760-1824)"""
    timeline = persons_data['meta'].get('timeline', [])
    errors = []

    for entry in timeline:
        year = entry.get('year')
        if year is not None and not (1760 <= year <= 1824):
            errors.append(f"Timeline year {year} outside range 1760-1824")

    assert not errors, "\n".join(errors)


def test_letter_years_in_range(persons_data):
    """Letter years must be within corpus range (1760-1824)"""
    persons = persons_data['persons']
    errors = []

    for person in persons:
        for year in person.get('letter_years', []):
            if not (1760 <= year <= 1824):
                errors.append(
                    f"Person {person['name']}: letter_year {year} outside range 1760-1824"
                )

    assert not errors, "\n".join(errors[:10])


def test_birth_death_format(persons_data):
    """Birth/death dates must be 4-digit strings"""
    persons = persons_data['persons']
    errors = []

    for person in persons:
        dates = person.get('dates', {})

        if 'birth' in dates:
            birth = dates['birth']
            if not isinstance(birth, str) or len(birth) != 4 or not birth.isdigit():
                errors.append(
                    f"Person {person['name']}: birth '{birth}' not 4-digit string"
                )

        if 'death' in dates:
            death = dates['death']
            if not isinstance(death, str) or len(death) != 4 or not death.isdigit():
                errors.append(
                    f"Person {person['name']}: death '{death}' not 4-digit string"
                )

    assert not errors, "\n".join(errors[:10])


def test_correspondence_type_values(persons_data):
    """Correspondence type must be 'sent' or 'mentioned'"""
    persons = persons_data['persons']
    allowed_types = {'sent', 'mentioned'}
    errors = []

    for person in persons:
        for corr in person.get('correspondence', []):
            corr_type = corr.get('type')
            if corr_type not in allowed_types:
                errors.append(
                    f"Person {person['name']}: Invalid correspondence type '{corr_type}'"
                )

    assert not errors, "\n".join(errors[:10])


def test_schema_itself_is_valid():
    """The schema file itself must be valid JSON Schema"""
    schema_path = Path(__file__).parent / 'persons.schema.json'

    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = json.load(f)

    # Check it has required top-level fields
    assert '$schema' in schema, "Schema missing $schema field"
    assert 'type' in schema, "Schema missing type field"
    assert 'properties' in schema, "Schema missing properties field"

    # Verify it's draft-07
    assert 'draft-07' in schema['$schema'], "Schema should use JSON Schema draft-07"
