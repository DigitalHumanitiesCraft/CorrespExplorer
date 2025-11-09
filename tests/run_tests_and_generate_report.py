#!/usr/bin/env python3
"""
Run tests and generate JSON report for web dashboard

This script:
1. Runs all pytest tests
2. Generates JSON report for web dashboard
3. Prints summary to console

Usage:
    python tests/run_tests_and_generate_report.py
"""

import subprocess
import sys
from pathlib import Path

def main():
    """Run tests and generate report"""
    project_root = Path(__file__).parent.parent
    output_file = project_root / 'docs' / 'data' / 'tests' / 'latest.json'

    print("="*60)
    print("Running HerData Tests")
    print("="*60)
    print()

    # Ensure output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Run pytest with JSON report
    cmd = [
        sys.executable,
        '-m',
        'pytest',
        'tests/',
        '-v',
        '--json-report',
        f'--json-report-file={output_file}',
        '--json-report-indent=2'
    ]

    print(f"Command: {' '.join(cmd)}")
    print()

    try:
        result = subprocess.run(cmd, cwd=project_root)

        print()
        print("="*60)
        print("Test Report Generated")
        print("="*60)
        print(f"Report saved to: {output_file.relative_to(project_root)}")
        print(f"View dashboard: docs/tests.html")
        print()

        # Exit with same code as pytest
        sys.exit(result.returncode)

    except FileNotFoundError:
        print("ERROR: pytest not found. Install with: pip install pytest pytest-json-report")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
