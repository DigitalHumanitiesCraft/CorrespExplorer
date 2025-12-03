"""
CSS Variables Consolidation Script

Ersetzt hardcodierte CSS-Werte durch Token-Variablen aus tokens.css
Fokussiert auf: padding, margin, font-size, color
"""

import re
from pathlib import Path

# Mapping von hardcodierten Werten zu CSS-Variablen
SPACING_MAP = {
    '0': '0',  # 0 bleibt 0
    '2px': 'calc(var(--space-xs) / 2)',  # 2px
    '4px': 'var(--space-xs)',             # 4px
    '6px': 'calc(var(--space-xs) + var(--space-xs) / 2)',  # 6px
    '8px': 'var(--space-sm)',             # 8px
    '10px': 'calc(var(--space-sm) + var(--space-xs) / 2)', # 10px
    '12px': 'var(--space-md)',            # 12px
    '16px': 'var(--space-lg)',            # 16px
    '24px': 'var(--space-xl)',            # 24px
    '32px': 'var(--space-2xl)',           # 32px
    '48px': 'var(--space-3xl)',           # 48px
    '64px': 'var(--space-4xl)',           # 64px
}

FONT_SIZE_MAP = {
    '8px': 'calc(var(--font-size-xs) - 4px)',  # 8px (sehr klein)
    '9px': 'calc(var(--font-size-xs) - 3px)',  # 9px
    '10px': 'calc(var(--font-size-xs) - 2px)', # 10px
    '11px': 'calc(var(--font-size-xs) - 1px)', # 11px
    '12px': 'var(--font-size-xs)',             # 12px
    '13px': 'calc(var(--font-size-sm) - 1px)', # 13px
    '14px': 'var(--font-size-sm)',             # 14px
    '16px': 'var(--font-size-md)',             # 16px
    '18px': 'var(--font-size-lg)',             # 18px
    '20px': 'calc(var(--font-size-lg) + 2px)', # 20px
    '24px': 'var(--font-size-xl)',             # 24px
    '32px': 'var(--font-size-2xl)',            # 32px
    '48px': 'var(--font-size-3xl)',            # 48px
    '1.5rem': 'var(--font-size-xl)',           # ~24px
    '2rem': 'var(--font-size-2xl)',            # ~32px
    '3rem': 'var(--font-size-3xl)',            # ~48px
}

COLOR_MAP = {
    '#222222': 'var(--color-text)',
    '#555555': 'var(--color-text-light)',
    '#78716c': 'var(--color-text-light)',  # Grau -> text-light
    '#A64B3F': 'var(--color-primary)',
    '#C65D3B': 'var(--color-primary)',
    '#2C5282': 'var(--color-secondary)',
    '#5b9bd5': 'var(--color-info)',        # Blau
    '#495057': 'var(--color-text-light)',
    'white': 'white',  # white bleibt white
    'inherit': 'inherit',
}


def replace_spacing_value(match):
    """Ersetzt Spacing-Werte (padding, margin)"""
    property_name = match.group(1)
    values = match.group(2).strip()

    # Wenn bereits var(--...) verwendet wird, nicht ändern
    if 'var(--' in values:
        return match.group(0)

    # Multi-Value (z.B. "2px 8px" oder "4px 8px 4px 8px")
    parts = values.split()
    replaced_parts = []

    for part in parts:
        if part in SPACING_MAP:
            replaced_parts.append(SPACING_MAP[part])
        else:
            # Unbekannter Wert, nicht ersetzen
            return match.group(0)

    if replaced_parts:
        new_value = ' '.join(replaced_parts)
        return f"{property_name}: {new_value};"

    return match.group(0)


def replace_font_size(match):
    """Ersetzt font-size Werte"""
    value = match.group(1).strip()

    # Wenn bereits var(--...) verwendet wird, nicht ändern
    if 'var(--' in value:
        return match.group(0)

    if value in FONT_SIZE_MAP:
        return f"font-size: {FONT_SIZE_MAP[value]};"

    return match.group(0)


def replace_color(match):
    """Ersetzt color Werte"""
    property_name = match.group(1)
    value = match.group(2).strip()

    # Wenn bereits var(--...) verwendet wird, nicht ändern
    if 'var(--' in value:
        return match.group(0)

    if value in COLOR_MAP:
        return f"{property_name}: {COLOR_MAP[value]};"

    return match.group(0)


def consolidate_css_file(file_path: Path) -> dict:
    """Konsolidiert CSS-Variablen in einer Datei"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    replacements = 0

    # Ersetze padding/margin (einfache Fälle)
    pattern = r'(padding|margin):\s*([0-9px\s]+);'
    content, count = re.subn(pattern, replace_spacing_value, content)
    replacements += count

    # Ersetze font-size
    pattern = r'font-size:\s*([0-9.]+(?:px|rem));'
    content, count = re.subn(pattern, replace_font_size, content)
    replacements += count

    # Ersetze color (nur einfache Fälle, nicht in komplexen Ausdrücken)
    pattern = r'(color|background-color|border-color):\s*(#[0-9a-fA-F]{6}|white|inherit);'
    content, count = re.subn(pattern, replace_color, content)
    replacements += count

    if replacements > 0:
        # Backup erstellen
        backup_path = file_path.with_suffix('.css.backup')
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(original_content)

        # Neue Datei schreiben
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return {
        'file': file_path.name,
        'replacements': replacements,
        'backed_up': replacements > 0
    }


def main():
    base_dir = Path(__file__).parent.parent
    css_dir = base_dir / 'docs' / 'css'

    files_to_process = [
        css_dir / 'explore.css',
        css_dir / 'style.css',
        css_dir / 'components.css',
        css_dir / 'upload.css',
        css_dir / 'about.css',
        css_dir / 'compare.css',
        css_dir / 'wissenskorb.css'
    ]

    print("="*60)
    print("CSS VARIABLES CONSOLIDATION")
    print("="*60)
    print()

    results = []
    for file_path in files_to_process:
        if file_path.exists():
            result = consolidate_css_file(file_path)
            results.append(result)

            status = "+" if result['replacements'] > 0 else "-"
            print(f"{status} {result['file']:25} {result['replacements']:3} replacements")
        else:
            print(f"X {file_path.name:25} NOT FOUND")

    print()
    print("="*60)
    total_replacements = sum(r['replacements'] for r in results)
    print(f"Total replacements: {total_replacements}")
    print()

    if total_replacements > 0:
        print("Backups created with .backup extension")
        print("Review changes with: git diff docs/css/")
        print()
        print("If changes look good:")
        print("  rm docs/css/*.backup")
        print()
        print("If you want to revert:")
        print("  for f in docs/css/*.backup; do mv \"$f\" \"${f%.backup}\"; done")
    else:
        print("No changes needed - CSS already using tokens!")


if __name__ == '__main__':
    main()
