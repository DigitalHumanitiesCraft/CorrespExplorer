# HerData - Gemini Context

## Project Overview
**HerData** is a digital humanities project that visualizes women in Johann Wolfgang von Goethe's correspondence network (1762-1824). It integrates CMIF letter metadata with SNDB biographical authority files to create an interactive web application.

- **Goal:** Identify, contextualize, and visualize women correspondents.
- **Status:** Active development (Phase 2 complete - Visualization & Filtering).
- **Tech Stack:**
    - **Data Processing:** Python 3.x (Standard Library + `xml.etree`).
    - **Frontend:** Vanilla JavaScript (ES6 modules), HTML5, CSS3.
    - **Libraries:** MapLibre GL JS (Maps), Apache ECharts (Stats), noUiSlider.
    - **Deployment:** GitHub Pages (static site).

## Architecture
The project follows a static-site architecture where data is pre-processed into JSON and consumed by the frontend.

1.  **Data Source Layer (`data/` - *Note: XML files not in repo*)**:
    -   `ra-cmif.xml`: Letter metadata.
    -   `SNDB/`: Biographical XML files.
2.  **Processing Layer (`preprocessing/`)**:
    -   `build_herdata.py`: Main pipeline. Extracts women, matches letters, matches geodata, generates `docs/data/persons.json`.
3.  **Presentation Layer (`docs/`)**:
    -   Single Page Application (SPA) feel using multiple HTML pages.
    -   `index.html`: Map explorer.
    -   `person.html`: Detail profiles.
    -   `stats.html`: Data visualization.

## Development Workflow

### 1. Python Environment (Data Pipeline)
Scripts are located in `preprocessing/`. No external dependencies are required for the main pipeline (standard library only). `pytest` is required for testing.

**Key Commands:**
*   **Build Data:**
    ```bash
    cd preprocessing
    python build_herdata.py
    ```
    *Generates `docs/data/persons.json`.*

*   **Analyze CMIF Data:**
    ```bash
    cd preprocessing
    python analyze_goethe_letters.py
    ```
    *Generates `data/analysis-report.md`.*

### 2. Frontend Development
The frontend lives in `docs/`. It requires no build step (no Webpack/Vite), utilizing native ES modules.

*   **Local Server:**
    ```bash
    cd docs
    python -m http.server 8000
    # OR
    npx http-server -p 8000
    ```
    *Access at `http://localhost:8000`.*

### 3. Testing
Tests are located in `tests/`.

*   **Run All Tests:**
    ```bash
    pytest
    ```
*   **Generate Report:**
    ```bash
    python tests/run_tests_and_generate_report.py
    ```

## Conventions & Style

### Documentation (Markdown)
*   **No Emojis:** Keep documentation professional and text-based.
*   **Structure:** Use clear H1-H3 headings.
*   **Language:** English for code/technical docs, German allowed for user stories.
*   **Journaling:** Update `JOURNAL.md` with date-based entries for significant changes.

### Python Code
*   **Style:** PEP 8.
*   **Typing:** Use type hints.
*   **Docstrings:** Required for all functions.
*   **Paths:** Use relative paths safely.

### JavaScript Code
*   **Modules:** Use ES6 modules (`import`/`export`).
*   **Style:** `const`/`let`, async/await.
*   **Comments:** Explain "why", not "what".

## Directory Structure
*   `docs/`: The web application (GitHub Pages root).
*   `preprocessing/`: Python scripts for data transformation.
*   `tests/`: Pytest suite.
*   `knowledge/`: Detailed project documentation (Data model, Design, Research).
*   `data/`: Local storage for raw XML inputs (often git-ignored).

## Critical Files
*   `preprocessing/build_herdata.py`: The source of truth for data logic.
*   `docs/js/app.js`: Main map logic.
*   `docs/css/style.css`: Core styling.
*   `docs/data/persons.json`: The artifact driving the frontend.
