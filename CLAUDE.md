# Claude Code Guidelines

This document defines coding and documentation style rules for the CorrespExplorer project when working with Claude.

## Documentation Style

### Forbidden Elements
- Never use bold text formatting (saves tokens, improves readability)
- Never use emojis in any documentation
- Never include "Estimated Time" sections
- Never use exclamation marks for emphasis
- Never include line counts or code size metrics (code changes constantly, creates inconsistencies)
- Never include box drawings or ASCII art in documentation (use simple lists instead)

### Preferred Style
- Use clear headings with # markdown syntax
- Use plain text for emphasis when needed
- Use bullet points for lists (not boxes or tables when lists suffice)
- Use code blocks for technical content
- Keep language neutral and factual
- Prioritize compact, precise information (every word counts)
- Focus on relationships and data flow, not metrics

## Code Style

### Python
- Use docstrings for functions
- Follow PEP 8 conventions
- Include type hints where appropriate
- Keep functions focused and single-purpose

### JavaScript
- Use ES6+ syntax
- Prefer const/let over var
- Use async/await for asynchronous operations
- Keep functions pure when possible

### HTML/CSS
- Semantic HTML5 elements
- BEM naming convention for CSS classes
- Mobile-first responsive design
- Accessibility attributes (ARIA when needed)

## Commit Messages

Format:
```
Short descriptive title

- Bullet point list of changes
- Focus on what and why, not how
- Reference issues/PRs when relevant

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Documentation Files

### README.md
- Project overview
- Installation instructions
- Usage examples
- License and attribution

### JOURNAL.md
- Date-based entries
- Aggregated session summaries
- Key decisions with rationale
- No timestamps, only dates

### CONTEXT-MAP.md
- Essential for managing complexity when many files exist
- Provides overview without opening individual files
- Must be read before working on code to understand architecture
- Located in key directories (e.g., js/CONTEXT-MAP.md, js/tests/CONTEXT-MAP.md)
- Content focus:
  - Module categories and purposes
  - Data flow and relationships between modules
  - Critical program flows (not every detail)
  - Dependencies and interaction patterns
- Update when architecture changes, not for minor edits

### Requirements
- User stories format: "Als Nutzer*in möchte ich... um zu..."
- Acceptance criteria clearly defined
- Functional requirements (FR-XX)
- Non-functional requirements (NFR-XX)

## Development Workflow

1. Read CONTEXT-MAP.md in relevant directory first (essential for understanding)
2. Read existing documentation before starting
3. Update JOURNAL.md at session end
4. Update CONTEXT-MAP.md when architecture changes
5. Create feature branches for major changes
6. Test before committing
7. Write clear commit messages

## Testing Rules

CRITICAL: Never use mock data or test data in tests
- Always use real CMIF-XML files from data/ directory
- Always import real functions from production modules
- Never duplicate helper functions in test files
- Never create stub objects or mock responses
- Tests must validate real code with real data

## File Naming

- Lowercase with underscores: `build_pipeline.py`
- Descriptive names: `build_hsa_data.py` not `script.py`
- Markdown files in UPPERCASE: `README.md`, `JOURNAL.md`, `CONTEXT-MAP.md`
- JavaScript: `kebab-case.js` for modules, `test-*.js` for tests

## Comments

### In Code
- Explain why, not what
- Keep comments up-to-date
- Remove commented-out code before committing

### In Documentation
- Neutral, objective tone
- Avoid superlatives
- State facts with sources
- Use references to other docs

## Data Documentation

- Always include absolute numbers with percentages
- Cite data sources
- Note data snapshot dates
- Document data quality issues transparently
- Reference other documentation files with relative links
- Never include code metrics (line counts, file sizes) - they change constantly
- Focus on what the code does, not how big it is

## Language

- Documentation can be in German or English as appropriate
- User stories in German: "Als Nutzer*in möchte ich..."
- Technical terms use original forms (GND, VIAF, TEI, CMIF)
- Code comments in English

## This File

This file should be updated when new style conventions are established. Always follow these guidelines unless explicitly asked otherwise.
