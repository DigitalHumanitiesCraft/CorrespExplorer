# CSS Architecture - Context Map

Stand: 2025-12-03

Modular organisierte CSS-Architektur mit Border-based Design und Hybrid Shadow Approach.

## File Structure and Import Order

```
1. tokens.css      - Design tokens (colors, spacing, typography)
2. base.css        - Reset, global elements, :focus-visible
3. components.css  - Reusable components (buttons, modals, cards)
4. shadows.css     - Shadow rules only for floating elements
5. style.css       - Layout (navbar, sidebar, grid)
6. [page].css      - Page-specific styles
```

All HTML pages import CSS in this exact order to ensure proper cascading.

## Core CSS Files

### tokens.css (9463 bytes)
Design token definitions following --color-* naming convention.

Token categories:
- Colors: --color-primary, --color-bg, --color-text, --color-border
- Spacing: --space-xs through --space-3xl (4px to 48px)
- Typography: --font-base, --font-headings, --font-size-xs through --font-size-3xl
- Layout: --navbar-height, --sidebar-width, --content-max-width
- Borders: --radius-sm through --radius-full, --border-card
- Transitions: --transition-fast, --transition-base, --transition-slow

All legacy token aliases removed (no --primary-color, --bg-body, etc.).

### base.css (2261 bytes)
Global resets and element styles.

Key features:
- CSS reset for consistent cross-browser rendering
- :focus-visible implementation for WCAG 2.1 AA compliance
- Global focus states (3px outline with 2px offset)
- Special focus states for buttons (1px offset) and inputs (border + shadow)

### components.css (7464 bytes)
Reusable UI components following design.md specifications.

Components:
- Sidebar info sections (filter groups, year range display)
- Buttons (primary, secondary, reset, export) - border-based design, no shadows
- Stat cards (KPI boxes) - border hover, no shadows
- Modals (overlay, content, header, footer) - 3px borders + shadow (floating element)

All buttons use 2px solid borders, modals use 3px borders.

### shadows.css (1740 bytes)
Documents and implements Hybrid Shadow Approach (Option B).

Allowed shadows (floating/overlay elements only):
- Modals: 0 8px 24px rgba(0, 0, 0, 0.2)
- Dropdowns: 0 4px 12px rgba(0, 0, 0, 0.15)
- Map popups: 0 2px 8px rgba(0, 0, 0, 0.15)
- Tooltips: 0 4px 12px rgba(0, 0, 0, 0.2)
- Map controls: 0 2px 6px rgba(0, 0, 0, 0.2)
- Toast notifications: 0 4px 12px rgba(0, 0, 0, 0.3)

Forbidden: Cards, buttons, inputs use border-based design instead.

Scientific reasoning: Shadows improve Z-axis perception by 34% (Nielsen Norman Group) but increase cognitive load by 23%. Use sparingly for floating elements only.

### style.css (47658 bytes)
Main layout file with navbar, sidebar, grid systems.

Major sections:
- Navbar (lines 78-208): Fixed top bar, flexbox layout, 2px borders
- Navigation links (lines 203-239): Border-based design, 8px radius, right-aligned meta buttons
- View switcher (lines 1668-1750): Button group for view modes
- Sidebar (lines 653-840): Fixed 320px width, scrollable filters
- Content area: Grid layouts for different views
- Data source switcher: Dropdown for selecting datasets
- Responsive breakpoints: 1200px, 900px, 768px, 600px

Key patterns:
- .nav-links uses margin-left: auto for right alignment
- .view-switcher has margin-left: var(--space-xl) for spacing
- Border-based design throughout (2px solid borders)

Note: Contains many box-shadows that need review for compliance with hybrid approach.

## Page-Specific CSS Files

### explore.css (72114 bytes)
Styles for main exploration interface.

Major components:
- Map view: MapLibre GL JS integration, controls, popups
- Timeline view: D3.js charts, interaction states
- List views: Persons, letters, places with filters
- Network view: Force-directed graph with D3.js
- Topics view: Tag cloud and topic exploration
- Mentions flow: Sankey diagrams

Note: Large file size due to multiple visualization types. Contains box-shadows that need review.

### wissenskorb.css (9309 bytes)
Wissenskorb (Knowledge Basket) page for collecting and analyzing selected persons.

Layout:
- Person list panel (left sidebar, 320px)
- Visualization panel (main area) with tabs
- Summary stats (KPI cards at top)
- Export section (bottom)

Visualizations:
- Timeline chart (correspondence over time)
- Network chart (relationships between collected persons)
- Map (geographic distribution)
- Details list (tabular view of letters)

Note: Uses box-shadows on cards (needs review for hybrid approach compliance).

### about.css (4666 bytes)
About page with project information.

Sections:
- Header with back link
- Content sections with h2 borders
- Info boxes (background + border)
- Link lists (button-like links)
- Feature grid (card layout)
- Legend table (data quality indicators)

Clean implementation, consistent token usage.

### compare.css (9966 bytes)
Dataset comparison interface.

Components:
- Dataset slots (2-column grid for upload areas)
- Upload/URL input controls
- Loading states with spinners
- Results section with tabs
- Summary cards (statistics)
- Result items (person/place comparison)
- Count badges (dataset A vs B indicators)

Uses consistent token system, border-based design.

### vault.css (6723 bytes)
Promptotyping Vault documentation viewer.

Layout:
- Sidebar (260px) with document navigation
- Content area (markdown rendering)
- Sticky sidebar positioning

Markdown styles:
- Typography hierarchy (h1-h3)
- Code blocks (inline and block)
- Tables with borders
- Blockquotes with left border
- Links with hover states

Clean implementation, follows design system.

### upload.css (14350 bytes)
Landing page and upload interface.

Components:
- Landing container (centered flexbox)
- Upload zone (dashed border, drag-drop)
- URL input section
- Example datasets grid
- Configuration modal
- Progress indicators
- Loading/error states

Special features:
- Featured dataset card (gradient background)
- Dataset badges
- Config checkboxes with custom styling
- Modal overlay system

Note: Contains some box-shadows (config modal, featured card) that may need review.

## Key Design Patterns

### Border-based Design
All regular UI elements (cards, buttons, inputs) use 2px solid borders instead of box-shadows:
```css
border: 2px solid var(--color-border);
border-radius: var(--radius-md);
```

Hover states change border-color, not shadow:
```css
:hover {
    border-color: var(--color-primary);
}
```

### Hybrid Shadow Approach
Only floating/overlay elements use box-shadow:
- Modals (z-index: 10000)
- Dropdowns (z-index: 1000)
- Map popups (z-index: varies)
- Tooltips (z-index: highest)
- Toast notifications (z-index: 1000)

### Token Consistency
All color tokens follow --color-* naming:
- --color-primary (rust red #A64B3F)
- --color-bg (cream #FAF7F0)
- --color-text (charcoal #2C3E50)
- --color-border (taupe #D4C5B9)

Legacy tokens removed:
- ~~--primary-color~~
- ~~--bg-body~~
- ~~--text-main~~
- ~~--accent-color~~

### Accessibility
All interactive elements have :focus-visible states:
- 3px outline with 2px offset (global)
- 1px offset for buttons (tighter)
- Border + shadow for inputs (inside focus)

## Current Issues

### Box-shadow Review Needed
Several files contain box-shadows that need compliance review:
- style.css: 16 instances (navigation dropdowns, sidebars, cards)
- explore.css: 10+ instances (map controls, popups, modals)
- wissenskorb.css: 6 instances (panels, cards, toast)
- upload.css: 2 instances (modal, featured card)

Need to verify each instance is a floating/overlay element per hybrid approach.

### Token Migration Status
Completed:
- tokens.css: Legacy aliases removed
- base.css: Created new with :focus-visible
- components.css: All components use new tokens
- wissenskorb.css: All tokens migrated
- style.css: Navbar and main layout updated

Not yet reviewed:
- about.css: Uses tokens, needs verification
- compare.css: Uses tokens, needs verification
- vault.css: Uses tokens, needs verification
- upload.css: Uses tokens, needs verification
- explore.css: Large file, token audit needed

## Data Flow

Import cascade:
1. tokens.css defines all variables
2. base.css uses tokens for global styles
3. components.css uses tokens for reusable components
4. shadows.css references component classes
5. style.css uses tokens + components for layout
6. Page-specific CSS uses tokens + components + layout

CSS specificity managed through proper import order prevents override issues.

## Related Documentation

- docs/knowledge/design.md: Complete design system specification
- docs/JOURNAL.md: Development history and decisions
- docs/knowledge/CONTEXT-MAP.md: Overall project architecture
