# HerData Tests

Automatisierte Tests für Datenqualität, Schema-Validierung und Pipeline-Integrität.

## Test-Dashboard

Visuelles Dashboard zur Überwachung der Testresultate: [docs/tests.html](https://chpollin.github.io/HerData/tests.html)

Features:
- Echtzeit-Übersicht über Test-Status (Passed/Failed)
- Datenabdeckungs-Statistiken (GND, Geodaten, Berufe, etc.)
- Detaillierte Fehlerberichte
- Links zur vollständigen Dokumentation

## Übersicht

Das HerData-Projekt verwendet pytest für Python-Tests und (geplant) Vitest für Frontend-Tests.

Aktuelle Test-Suites:
- [test_data_quality.py](test_data_quality.py): 20+ Tests für semantische Datenqualität
- [test_json_schema.py](test_json_schema.py): JSON-Schema-Validierung
- persons.schema.json: Schema-Definition für persons.json

## Voraussetzungen

Python-Dependencies installieren:
```bash
pip install pytest jsonschema pytest-json-report
```

## Tests ausführen

Schnellstart - Tests mit Dashboard-Report:
```bash
python tests/run_tests_and_generate_report.py
```
Dann öffne [docs/tests.html](../docs/tests.html) im Browser.

Alle Tests (Konsole):
```bash
pytest
```

Spezifische Test-Datei:
```bash
pytest tests/test_data_quality.py
pytest tests/test_json_schema.py
```

Verbose-Modus mit Details:
```bash
pytest -v
```

Nur fehlgeschlagene Tests anzeigen:
```bash
pytest --tb=short
```

JSON-Report für Dashboard generieren:
```bash
pytest tests/ --json-report --json-report-file=docs/data/tests/latest.json
```

Mit Coverage-Report:
```bash
pip install pytest-cov
pytest --cov=preprocessing --cov-report=html
```

## Test-Kategorien

### 1. Datenqualitäts-Tests (test_data_quality.py)

Suite 1: Referenzielle Integrität
- test_no_duplicate_ids: Keine doppelten SNDB-IDs
- test_no_duplicate_gnd_ids: Keine doppelten GND-IDs
- test_relationships_target_exists: Beziehungen referenzieren existierende Personen
- test_correspondence_recipients_exist_if_gnd: Empfänger mit GND sollten im Dataset sein

Suite 2: Geodaten-Plausibilität
- test_coordinates_within_europe: Koordinaten in Europa (35-71°N, 25°W-40°E)
- test_places_have_required_fields: Places haben name, lat, lon
- test_coordinates_are_numbers: Koordinaten sind Zahlen, nicht Strings

Suite 3: Temporal-Plausibilität
- test_birth_before_death: Geburtsjahr < Sterbejahr
- test_dates_in_plausible_range: Lebensdaten 1600-1900
- test_correspondence_years_in_corpus_range: Briefjahre 1760-1824
- test_letter_years_match_letter_count: letter_count und letter_years konsistent

Suite 4: Vollständigkeit
- test_all_persons_have_required_fields: Pflichtfelder vorhanden
- test_role_values_valid: Role ist sender/mentioned/both/indirect
- test_normierung_values_valid: Normierung ist gnd/sndb
- test_gnd_normierung_has_gnd_field: GND-normierte Personen haben GND-ID
- test_sndb_urls_valid_format: SNDB-URLs haben korrektes Format

Suite 5: Metadaten-Konsistenz
- test_meta_counts_match_actual: Meta-Zähler entsprechen Daten
- test_timeline_data_consistent: Timeline entspricht Korrespondenz-Jahren

Suite 6: Statistiken (informational)
- test_coverage_statistics: Zeigt Coverage-Statistiken (immer Pass)

### 2. JSON-Schema-Tests (test_json_schema.py)

- test_persons_json_valid_schema: Vollständige Schema-Validierung
- test_meta_structure: Meta-Objekt hat Pflichtfelder
- test_persons_array_not_empty: Persons-Array nicht leer
- test_all_person_ids_are_strings: IDs sind Strings
- test_all_coordinates_are_numbers: Koordinaten sind Zahlen
- test_role_values_match_schema: Roles entsprechen Enum
- test_normierung_values_match_schema: Normierung entspricht Enum
- test_timeline_years_in_range: Timeline-Jahre in Range
- test_letter_years_in_range: Brief-Jahre in Range
- test_birth_death_format: Geburt/Tod sind 4-stellige Strings
- test_correspondence_type_values: Korrespondenz-Typ sent/mentioned
- test_schema_itself_is_valid: Schema-Datei ist valides JSON Schema

## Erwartete Test-Ergebnisse

Bei korrekten Daten:
```
========================= test session starts =========================
collected 32 items

tests/test_data_quality.py::test_no_duplicate_ids PASSED         [  3%]
tests/test_data_quality.py::test_no_duplicate_gnd_ids PASSED     [  6%]
...
tests/test_json_schema.py::test_persons_json_valid_schema PASSED [ 97%]
tests/test_json_schema.py::test_schema_itself_is_valid PASSED    [100%]

========================== 32 passed in 2.45s ==========================
```

## Fehlerbehandlung

Wenn Tests fehlschlagen:

1. Lese die Fehlermeldung genau - sie enthält Kontext
2. Prüfe welche Personen betroffen sind (Name/ID werden angezeigt)
3. Validiere die Quelldaten (XML-Dateien)
4. Prüfe ob Pipeline-Logik korrekt ist

Beispiel-Fehler:
```
FAILED tests/test_data_quality.py::test_birth_before_death
AssertionError: Person Anna Müller (ID 12345): birth year 1800 >= death year 1750
```

Behebung:
- Prüfe ra_ndb_datierungen.xml für Person 12345
- Korrigiere Daten in Quelle
- Pipeline neu ausführen

## Integration in Pipeline

Tests können direkt nach build_herdata.py ausgeführt werden:

```bash
cd preprocessing
python build_herdata.py
cd ..
pytest
```

Oder automatisiert in Script:
```python
import subprocess
import sys

def run_with_tests():
    # Run pipeline
    subprocess.run([sys.executable, 'preprocessing/build_herdata.py'], check=True)

    # Run tests
    result = subprocess.run(['pytest', 'tests/'], capture_output=True)

    if result.returncode != 0:
        print("Tests failed! Review output above.")
        sys.exit(1)

    print("All tests passed!")
```

## CI/CD Integration (geplant)

GitHub Actions Workflow (.github/workflows/test.yml):
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install pytest jsonschema
      - run: pytest -v
```

## Neue Tests hinzufügen

1. Datei in tests/ erstellen (Präfix test_)
2. Fixture für Daten definieren:
```python
import pytest

@pytest.fixture
def persons_data():
    # ... load data
    return data
```

3. Test-Funktionen schreiben (Präfix test_):
```python
def test_something(persons_data):
    assert some_condition, "Error message"
```

4. Test ausführen:
```bash
pytest tests/test_myfile.py -v
```

## Weitere Informationen

Vollständige Test-Strategie und Roadmap: [docs/knowledge/tests.md](../docs/knowledge/tests.md)

Geplante Erweiterungen:
- Frontend-Tests mit Vitest (Filter-Logik, Suche)
- E2E-Tests mit Playwright (Visual Regression)
- Performance-Benchmarks
- Accessibility-Tests
