"""
Migration Script: Replace document.getElementById/querySelector with elements cache

Automatisches Ersetzen von DOM-Queries durch elements.* aus dom-cache.js
"""

import re
from pathlib import Path

# Mapping von IDs zu elements-Properties
ELEMENT_MAPPINGS = {
    # Navigation
    'dataset-title': 'datasetTitle',

    # Stats
    'total-letters-count': 'totalLettersCount',
    'total-senders-count': 'totalSendersCount',
    'total-places-count': 'totalPlacesCount',
    'source-info': 'sourceInfo',
    'data-coverage-details': 'dataCoverageDetails',

    # Quality icons
    'letters-quality-icon': 'lettersQualityIcon',
    'senders-quality-icon': 'sendersQualityIcon',
    'places-quality-icon': 'placesQualityIcon',

    # Filter controls
    'reset-filters': 'resetFiltersBtn',
    'active-filters': 'activeFilters',
    'year-range-slider': 'yearRangeSlider',
    'year-range-text': 'yearRangeText',

    # Quality filters (bereits ersetzt in vorherigem Step)
    'filter-precise-dates': 'filterPreciseDates',
    'filter-known-persons': 'filterKnownPersons',
    'filter-located-places': 'filterLocatedPlaces',

    # Language filter
    'language-filter-group': 'languageFilterGroup',
    'language-checkboxes': 'languageCheckboxes',

    # Topics filter
    'topics-filter-group': 'topicsFilterGroup',
    'topics-quick-search': 'topicsQuickSearch',
    'topics-quick-filter': 'topicsQuickFilter',
    'show-all-topics': 'showAllTopics',

    # View containers
    'map-container': 'mapContainer',
    'map': 'mapElement',
    'map-legend': 'mapLegend',
    'map-color-toggle': 'mapColorToggle',

    'persons-container': 'personsContainer',
    'person-search': 'personSearch',
    'person-sort': 'personSort',
    'persons-list': 'personsList',

    'letters-container': 'lettersContainer',
    'letter-search': 'letterSearch',
    'letter-sort': 'letterSort',
    'letters-list': 'lettersList',

    'timeline-container': 'timelineContainer',
    'timeline-chart': 'timelineChart',

    'topics-container': 'topicsContainer',
    'topics-search': 'topicsSearch',
    'topics-sort': 'topicsSort',
    'topics-list': 'topicsList',
    'topic-detail': 'topicDetail',

    'places-container': 'placesContainer',
    'places-search': 'placesSearch',
    'places-sort': 'placesSort',
    'places-list': 'placesList',
    'place-detail': 'placeDetail',

    'network-container': 'networkContainer',
    'network-svg': 'networkSvg',
    'network-mode': 'networkModeSelect',
    'network-reset-zoom': 'networkResetZoom',

    'mentions-flow-container': 'mentionsFlowContainer',
    'mentions-flow-svg': 'mentionsFlowSvg',
    'mentions-flow-placeholder': 'mentionsFlowPlaceholder',

    # Modals
    'export-modal': 'exportModal',
    'export-btn': 'exportBtn',
    'export-csv': 'exportCsv',
    'export-json': 'exportJson',
    'export-close': 'exportClose',

    # Loading
    'loading-overlay': 'loadingOverlay',
}


def migrate_get_element_by_id(file_path: Path) -> int:
    """Ersetzt document.getElementById('id') durch elements.property"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    replacements = 0

    # Pattern: document.getElementById('id')
    pattern = r"document\.getElementById\(['\"]([^'\"]+)['\"]\)"

    def replace_match(match):
        nonlocal replacements
        element_id = match.group(1)

        if element_id in ELEMENT_MAPPINGS:
            replacements += 1
            return f"elements.{ELEMENT_MAPPINGS[element_id]}"
        else:
            # Nicht in Mapping, behalte Original oder nutze generic
            return f"elements.getById('{element_id}')"

    content = re.sub(pattern, replace_match, content)

    if replacements > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return replacements


def migrate_query_selector(file_path: Path) -> int:
    """Ersetzt document.querySelector für bekannte Selektoren"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    replacements = 0

    # Bekannte Selector-Patterns
    selector_mappings = {
        r"document\.querySelector\(['\"]\.navbar['\"]\)": "elements.navbar",
        r"document\.querySelector\(['\"]\.sidebar['\"]\)": "elements.sidebar",
        r"document\.querySelector\(['\"]\.view-switcher['\"]\)": "elements.viewSwitcher",
    }

    for pattern, replacement in selector_mappings.items():
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            replacements += re.sub(pattern, '', content).count(replacement)
            content = new_content

    if replacements > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return replacements


def main():
    base_dir = Path(__file__).parent.parent
    target_file = base_dir / 'docs' / 'js' / 'explore.js'

    if not target_file.exists():
        print(f"ERROR: {target_file} not found")
        return

    print("="*60)
    print("DOM CACHE MIGRATION")
    print("="*60)
    print()
    print(f"Migrating: {target_file.name}")
    print()

    # Create backup
    backup_file = target_file.with_suffix('.js.backup-domcache')
    with open(target_file, 'r', encoding='utf-8') as f:
        with open(backup_file, 'w', encoding='utf-8') as b:
            b.write(f.read())

    print(f"Backup created: {backup_file.name}")
    print()

    # Run migrations
    get_by_id_count = migrate_get_element_by_id(target_file)
    query_selector_count = migrate_query_selector(target_file)

    total_replacements = get_by_id_count + query_selector_count

    print(f"getElementById replacements: {get_by_id_count}")
    print(f"querySelector replacements:  {query_selector_count}")
    print(f"Total replacements:          {total_replacements}")
    print()

    if total_replacements > 0:
        print("="*60)
        print("MIGRATION SUCCESSFUL")
        print("="*60)
        print()
        print("Review changes with: git diff docs/js/explore.js")
        print()
        print("If changes look good:")
        print(f"  rm {backup_file}")
        print()
        print("If you want to revert:")
        print(f"  mv {backup_file} {target_file}")
    else:
        print("No changes made (all patterns already migrated)")
        backup_file.unlink()  # Remove backup if no changes


if __name__ == '__main__':
    main()
