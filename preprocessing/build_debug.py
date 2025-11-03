"""
Build HerData with Debug/Provenance Tracking

Generates persons_debug.json with full data provenance for review.
Usage: python build_debug.py
"""

import sys
from pathlib import Path
from build_herdata_new import HerDataPipelineNew

def main():
    print("=" * 70)
    print("HerData Debug Build - Provenance Tracking Enabled")
    print("=" * 70)

    # Paths
    base_dir = Path(__file__).parent.parent
    herdata_dir = base_dir / 'data' / 'herdata'
    sndb_dir = base_dir / 'data' / 'sndb'
    cmif_file = base_dir / 'data' / 'ra-cmif.xml'
    output_file = base_dir / 'docs' / 'data' / 'persons_debug.json'

    # Check data directories exist
    if not herdata_dir.exists():
        print(f"ERROR: herdata directory not found: {herdata_dir}")
        return 1

    if not sndb_dir.exists():
        print(f"ERROR: SNDB directory not found: {sndb_dir}")
        return 1

    if not cmif_file.exists():
        print(f"ERROR: CMIF file not found: {cmif_file}")
        return 1

    # Initialize pipeline with provenance tracking
    print(f"\nInput:")
    print(f"  HerData: {herdata_dir}")
    print(f"  SNDB: {sndb_dir}")
    print(f"  CMIF: {cmif_file}")
    print(f"\nOutput:")
    print(f"  {output_file}")
    print(f"\nProvenance Tracking: ENABLED")
    print()

    pipeline = HerDataPipelineNew(
        herdata_dir=herdata_dir,
        sndb_dir=sndb_dir,
        cmif_file=cmif_file,
        output_file=output_file,
        verbose=True,
        track_provenance=True  # Enable provenance tracking
    )

    try:
        # Run full pipeline
        pipeline.run()

        print("\n" + "=" * 70)
        print("Debug Build Complete")
        print("=" * 70)
        print(f"\nGenerated: {output_file}")
        print(f"File size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
        print("\nProvenance data included for:")
        print("  - Name fields")
        print("  - Dates (birth/death)")
        print("  - Places and coordinates")
        print("  - Occupations")
        print("  - Letter counts")
        print("  - Relations")
        print("\nTo use in frontend:")
        print("  1. Open person.html?id=<ID>&debug=true")
        print("  2. Or load persons_debug.json instead of persons.json")

        return 0

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
