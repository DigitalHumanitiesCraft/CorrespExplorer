# CSS Architecture

Kompakte Definition aller CSS-Dateien und Design-Tokens.

## Files

### tokens.css (158 lines)
Canonical design system - Single source of truth.

**Colors (21 tokens)**
```css
--color-primary: #1e3a5f        /* Navy Blue - Headers, primary actions */
--color-secondary: #2c5f8d      /* Steel Blue - Links, accents */
--color-accent: #2d6a4f         /* Forest Green - Success states */
--color-text: #2d3748           /* Dark Gray - Body text */
--color-text-light: #6c757d     /* Medium Gray - Secondary text */
--color-bg: #ffffff             /* White - Card backgrounds */
--color-bg-light: #f8f9fa       /* Light Gray - Subtle backgrounds */
--color-border: #dee2e6         /* Border Gray - Dividers */
```

**Role Colors (4 tokens)** - Map visualization
```css
--color-role-sender: #2c5f8d     /* Steel Blue - Hat geschrieben */
--color-role-mentioned: #6c757d  /* Medium Gray - Wurde erwähnt */
--color-role-both: #2d6a4f       /* Forest Green - Beide Rollen */
--color-role-indirect: #adb5bd   /* Light Gray - Nur SNDB */
```

**Badge Colors (4 tokens)** - Data quality indicators
```css
--color-badge-gnd: #2d6a4f           /* Green - GND vorhanden */
--color-badge-gnd-bg: #d8f3dc        /* Light green background */
--color-badge-sndb: #9b6b00          /* Dark Gold - Nur SNDB */
--color-badge-sndb-bg: #fff3cd       /* Light yellow background */
```

**Functional Colors (4 tokens)**
```css
--color-success: #2d6a4f        /* Green - Success messages */
--color-info: #0077b6           /* Blue - Info messages */
--color-warning: #9b6b00        /* Gold - Warnings */
--color-error: #9b2226          /* Red - Errors */
```

**Typography (11 tokens)**
```css
--font-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
--font-size-xs: 12px            /* Small labels */
--font-size-sm: 14px            /* Secondary text */
--font-size-base: 14px          /* Body text (maps) */
--font-size-md: 16px            /* Body text (cards) */
--font-size-lg: 18px            /* Subheadings */
--font-size-xl: 24px            /* Card titles */
--font-size-2xl: 32px           /* Page titles */
--font-size-3xl: 48px           /* Hero titles */
--line-height-tight: 1.4        /* Headers */
--line-height-normal: 1.6       /* Body */
--line-height-relaxed: 1.8      /* Long-form text */
```

**Spacing (8 tokens)** - 4px base unit
```css
--space-xs: 4px                 /* Micro spacing */
--space-sm: 8px                 /* Small gaps */
--space-md: 12px                /* Default spacing */
--space-lg: 16px                /* Medium spacing */
--space-xl: 24px                /* Large spacing */
--space-2xl: 32px               /* XL spacing */
--space-3xl: 48px               /* Section spacing */
--space-4xl: 64px               /* Page spacing */
```

**Layout (2 tokens)**
```css
--sidebar-width: 280px          /* Sidebar width */
--navbar-height: 60px           /* Navbar height */
```

**Breakpoints (5 tokens)** - Mobile-first
```css
--breakpoint-sm: 480px          /* Small phones */
--breakpoint-md: 768px          /* Tablets */
--breakpoint-lg: 1024px         /* Small laptops */
--breakpoint-xl: 1200px         /* Desktops */
--breakpoint-2xl: 1400px        /* Large screens */
```

**Design Elements (11 tokens)**
```css
--radius-sm: 3px                /* Subtle rounding */
--radius-md: 4px                /* Default rounding */
--radius-lg: 8px                /* Card rounding */

--shadow-sm: 0 1px 3px rgba(0,0,0,0.1)      /* Subtle elevation */
--shadow-md: 0 4px 8px rgba(0,0,0,0.12)     /* Card hover */
--shadow-lg: 0 8px 16px rgba(0,0,0,0.15)    /* Modal/dropdown */

--transition-fast: 0.1s ease    /* Micro interactions */
--transition-base: 0.2s ease    /* Hover states */
--transition-slow: 0.3s ease    /* Animations */

--z-loading: 1000               /* Loading overlay */
--z-dropdown: 1001              /* Search results */
--z-modal: 1050                 /* Modals */
--z-tooltip: 1060               /* Tooltips */
```

---

### style.css (1028 lines)
Map view styles and global responsive layout.

**Global Reset**
- CSS Reset (normalize)
- Box-sizing: border-box

**Navbar** (.navbar)
- Fixed top, height: --navbar-height
- Background: --color-primary
- Flexbox layout: brand | search | links | stats

**Sidebar** (.sidebar)
- Width: --sidebar-width
- Fixed left position
- Filter sections with collapsible groups

**Map Container** (#map)
- Full viewport minus navbar
- MapLibre GL JS canvas

**Filter Components**
- .filter-section: Filter group container
- .filter-group: Individual filter (role, occupation, temporal)
- Checkboxes: Custom styled with :checked state

**Loading Overlay** (#loading)
- Position: fixed, z-index: --z-loading
- Background: rgba overlay
- Centered spinner

**Responsive Breakpoints**
```css
@media (max-width: 480px)  /* Mobile */
@media (max-width: 768px)  /* Tablet */
@media (min-width: 1024px) /* Desktop */
```

**MapLibre Overrides**
- .maplibregl-popup: Custom popup styles
- .maplibregl-ctrl: Control positioning

---

### person-cards.css (383 lines)
Person detail page card layout.

**Page Container** (.person-page-cards)
- Max-width: 1200px
- Centered layout
- Padding: --space-xl

**Header** (.person-header)
- Text-align: center
- H1: --font-size-3xl, --color-primary
- .person-dates: --font-size-lg, --color-text-light
- .person-badges: Flex row, gap: --space-sm

**Stats Cards** (.stats-cards)
- Grid: auto-fit, minmax(200px, 1fr)
- Gap: --space-lg
- .stat-card: Background --color-bg, border --color-border
  - Hover: Shadow lift, translateY(-2px)
  - .stat-value: --font-size-3xl, --color-secondary
  - .stat-label: --font-size-sm, uppercase

**Content Cards** (.content-card)
- Background: --color-bg
- Border: 1px solid --color-border
- Padding: --space-2xl
- Border-radius: 8px
- Shadow: --shadow-sm
- Hover: --shadow-md

**Card Sections**
- #biography-card: Biography text (--font-size-md)
- #letters-content: Letter items with left border (--color-secondary)
- .places-list: Place items with type badges
- #places-map: Mini-map (height: 300px)
- #occupations-content: Occupation items with left border (--color-accent)

**Normdaten Links** (.normdaten-link)
- Color: --color-secondary
- Underline on hover

**Data Quality** (.data-quality-list)
- .quality-icon: 20px circle badges
  - .available: Green (#28a745)
  - .unavailable: Red (#dc3545)
  - .info: Blue (#17a2b8)

**Citation Box** (.citation-box)
- Background: --color-bg-light
- Monospace font (Courier New)
- .copy-button: Absolute positioned, --color-secondary background

**Responsive**
```css
@media (max-width: 768px)  /* 2-column stats grid, reduced padding */
@media (max-width: 480px)  /* 1-column stats grid, minimal padding */
```

---

### stats.css (236 lines)
Statistics dashboard grid layout.

**Page Container** (.stats-page)
- Padding: --space-xl

**Header** (.stats-header)
- Text-align: center
- H1: --font-size-2xl
- .stats-subtitle: --color-text-light

**Grid Layout** (.stats-grid)
- Max-width: 1400px
- Grid: 2 columns
- Gap: --space-xl

**Stat Card** (.stat-card)
- Background: --color-bg
- Border: --color-border
- Border-radius: --radius-lg
- Shadow: --shadow-sm
- .large: Grid-column: span 2 (full width)

**Card Header** (.stat-card-header)
- Flex: space-between
- H2: --font-size-lg, --color-primary
- .stat-card-actions: Export buttons container

**Export Buttons** (.btn-export)
- Padding: --space-sm --space-md
- Background: --color-secondary
- Color: white
- Border-radius: --radius-md
- Transition: --transition-base
- Hover: --color-primary background

**Chart Container** (.chart-container)
- Height: 400px (default)
- .large: Height 500px

**Responsive**
```css
@media (max-width: 1200px) /* 1-column grid */
@media (max-width: 768px)  /* Reduced padding, smaller charts */
```

---

### search.css (96 lines)
Global search typeahead dropdown.

**Search Container** (.nav-search)
- Flex: 1, max-width: 500px
- Position: relative
- Margin: 0 --space-xl

**Input** (input[type="search"])
- Width: 100%
- Padding: --space-sm --space-lg
- Border-radius: --radius-md
- Background: rgba(255,255,255,0.9)
- Focus: Outline --color-accent

**Results Dropdown** (.search-results)
- Position: absolute, top: calc(100% + --space-sm)
- Background: white
- Border: --color-border
- Max-height: 400px, overflow-y: auto
- Shadow: --shadow-md
- Z-index: --z-dropdown
- Hidden by default, .active: display block

**Result Items** (.search-result-item)
- Padding: --space-md --space-lg
- Border-bottom: --color-bg-light
- Cursor: pointer
- Hover/Focus: Background --color-bg-light, outline --color-accent
- .search-result-name: --color-primary, font-weight 500
- .search-result-meta: --font-size-sm, --color-text-light

**No Results** (.search-no-results)
- Padding: --space-xl
- Text-align: center
- Color: --color-text-light

---

### network.css (161 lines)
Network view (archived, not imported).

Status: Not used in current application. Network visualization deferred to future iteration.

Contains styles for 3D force graph layout with sidebar filters. Not documented as it's not active.

---

## Import Strategy

All active CSS files import tokens.css:

```css
@import url('tokens.css');
```

Import order:
1. tokens.css (canonical values)
2. Component-specific styles

## Usage Guidelines

**Spacing:** Use --space-* tokens, never hardcoded px values.

**Colors:** Use --color-* tokens, never hex codes directly.

**Typography:** Use --font-size-* tokens for consistency.

**Breakpoints:** Use --breakpoint-* tokens in media queries.

**Shadows:** Use --shadow-* tokens for elevation consistency.

**Transitions:** Use --transition-* tokens for uniform animations.

## Adding New Styles

1. Check if token exists in tokens.css
2. If not, add to tokens.css first
3. Use token in component CSS
4. Document in this README

## Color Accessibility

All color combinations meet WCAG AA contrast ratio (4.5:1 minimum):
- --color-text on --color-bg: 12.6:1
- --color-text-light on --color-bg: 4.5:1
- --color-primary on white: 10.4:1
- --color-secondary on white: 6.8:1
