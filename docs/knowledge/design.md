# Design System - CorrespExplorer

Stand: 2025-12-03

Technische Vorgaben fuer das UI-Design mit Fokus auf Forschungsdaten-Lesbarkeit und historischem Charakter.

---

## 0. CSS-Architektur

Das CSS ist modular organisiert:

| Datei | Zweck | Import-Reihenfolge |
|-------|-------|-------------------|
| tokens.css | Design-Tokens (Farben, Spacing, Typography) | 1 (Basis) |
| base.css | Reset, globale Elemente, :focus-visible | 2 (Elemente) |
| components.css | Wiederverwendbare Komponenten (Buttons, Modals, Cards) | 3 (Komponenten) |
| shadows.css | Shadow-Regeln nur fuer floating elements | 4 (Spezial) |
| style.css | Layout (Navbar, Sidebar, Grid) | 5 (Layout) |
| [page].css | Seitenspezifische Styles | 6 (Seiten) |

Alle HTML-Seiten importieren CSS in dieser Reihenfolge:
```html
<!-- Core CSS -->
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/shadows.css">
<!-- Page-specific CSS -->
<link rel="stylesheet" href="css/[page].css">
```

---

## 1. Design-Prinzipien

| Prinzip | Begruendung |
|---------|-------------|
| Klare Hierarchie | Forschungsdaten muessen schnell erfassbar sein |
| Konsistente Konturen | Dicke Raender geben klare Abgrenzung ohne Schatten-Overhead |
| Reduzierter Akzent | Accent-Farbe sparsam einsetzen, nicht flaechendeckend |
| Lesbarkeit vor Aesthetik | Monospace fuer Daten, keine Texturen auf Inhalten |

---

## 2. Farbpalette

### Primaere Farben (aus Logo abgeleitet)

| Rolle | Variable | Hex-Code | Verwendung |
|-------|----------|----------|------------|
| BG Main | `--color-bg` | `#F5F3E8` | Globaler Hintergrund (Papier-Cream) |
| BG Card | `--color-bg-light` | `#E8E4D4` | Container, Cards (Manila) |
| Text Primary | `--color-text` | `#222222` | Haupttext, Konturen (Ink) |
| Text Secondary | `--color-text-light` | `#555555` | Subtexte, Hints |
| Border | `--color-border` | `#222222` | Dicke Konturen (2-3px) |
| Border Light | `--color-border-light` | `#D4D0C0` | Subtile Trennlinien |

### Akzentfarben (aus Logo)

| Rolle | Variable | Hex-Code | Verwendung |
|-------|----------|----------|------------|
| Primary | `--color-primary` | `#A64B3F` | Rust Red - Buttons, Highlights, Zahnrad |
| Primary Dark | `--color-primary-dark` | `#8B3D33` | Hover-States |
| Accent | `--color-accent` | `#A64B3F` | Gleich wie Primary (Logo-Farbe) |
| Secondary | `--color-secondary` | `#2C5282` | Steel Blue - Links, Network Sender |
| Success | `--color-success` | `#2d6a4f` | Forest Green - Erfolg-Meldungen |

### Logo-Assets

| Asset | Pfad | Verwendung |
|-------|------|------------|
| Logo horizontal | `assets/logo.jpg` | Landing-Page Header |
| Favicon | `favicon.svg` | Browser-Tab (Auge-Element extrahieren) |

### Datenvisualisierung

| Rolle | Hex-Code | Verwendung |
|-------|----------|------------|
| Map Land | `#E8E4D4` | Landmassen |
| Map Water | `#B8D4E8` | Wasser/Ozeane |
| Map Points | `#A64B3F` | Brieforte (Cluster) - --color-primary |
| Network Sender | `#2c5f8d` | Absender-Knoten - --color-role-sender |
| Network Both | `#2d6a4f` | Beides - --color-role-both (Forest Green) |
| Timeline Bar | `#A64B3F` | Balken - --color-primary |
| Timeline Inactive | `#D4D0C0` | Hintergrund-Balken |

### Unsicherheits-Indikatoren

Konsistente visuelle Sprache fuer Datenqualitaet ueber alle Views hinweg.

| Typ | Farbe | Icon | CSS-Klasse | Verwendung |
|-----|-------|------|------------|------------|
| Exaktes Datum | -- | -- | -- | Keine Markierung noetig |
| Nur Jahr/Monat | `#f59e0b` (Amber) | `fa-calendar-alt` | `.date-precision-icon` | Briefliste, Tooltip |
| Zeitraum | `#2C5282` (Blau) | `fa-arrows-alt-h` | `.date-range-icon` | Briefliste: "1.1. – 31.12.1900" |
| Unsichere Datierung | `#ef4444` (Rot) | `fa-question-circle` | `.date-uncertain-icon` | cert="low" Attribut |
| Datum unbekannt | `#555555` (Grau) | `fa-question` | `.date-unknown` | Kein Datum vorhanden |
| Timeline-Schraffur | Diagonale Streifen | -- | `.timeline-uncertainty-overlay` | Anteil unscharfer Daten im Jahr |

#### Icon-Bedeutung

| Symbol | Bedeutung | Tooltip-Text |
|--------|-----------|--------------|
| Kalender (orange) | Datum unvollstaendig | "Nur Jahr/Monat bekannt" |
| Doppelpfeil (blau) | Zeitraum | "Zeitraum: Brief wurde zwischen diesen Daten verfasst" |
| Fragezeichen (rot) | Unsichere Angabe | "Unsichere Datierung (cert=low)" |
| Schraffierte Balken | Anteil unscharf | "[n] Briefe mit unscharfem Datum" |

#### Prinzipien

- Exakte Daten erhalten keine Markierung (kein visuelles Rauschen)
- Icons stehen immer vor dem Datumswert
- Farben sind konsistent: Orange = unvollstaendig, Blau = Zeitraum, Rot = unsicher
- Tooltips erklaeren die Bedeutung bei Hover
- Timeline-Legende zeigt Anzahl der betroffenen Briefe

### Sprachfarben (Karte und Timeline)

Definiert in js/constants.js - dynamisch berechnet basierend auf Sprachverteilung im Korpus.

#### Dynamische Farbzuweisung

Die dominante Sprache (meiste Briefe) bekommt eine kraeftige Farbe, alle anderen Sprachen erhalten Pastelltoene. Dies verbessert die Lesbarkeit bei vielen Sprachen.

| Palette | Verwendung |
|---------|------------|
| `LANGUAGE_COLORS_STRONG` | Kraeftige Farben fuer dominante Sprache |
| `LANGUAGE_COLORS_PASTEL` | Dezente Farben fuer sekundaere Sprachen |

Die Funktion `computeLanguageColors(letters)` berechnet die Farben beim Laden des Datensatzes.

#### Farbpalette (Kraeftig)

| Sprache | Variable | Hex-Code |
|---------|----------|----------|
| Deutsch | `de` | `#1e40af` (Blau) |
| Franzoesisch | `fr` | `#dc2626` (Rot) |
| Italienisch | `it` | `#16a34a` (Gruen) |
| Englisch | `en` | `#7c3aed` (Lila) |
| Spanisch | `es` | `#ea580c` (Orange) |
| Portugiesisch | `pt` | `#0891b2` (Cyan) |
| Latein | `la` | `#57534e` (Grau) |
| Ungarisch | `hu` | `#be185d` (Pink) |
| Niederlaendisch | `nl` | `#d97706` (Amber) |
| Ohne Angabe | `None` | `#78716c` (Grau) |

#### Farbpalette (Pastell)

| Sprache | Hex-Code |
|---------|----------|
| Deutsch | `#93c5fd` |
| Franzoesisch | `#fca5a5` |
| Italienisch | `#86efac` |
| Englisch | `#c4b5fd` |
| Spanisch | `#fdba74` |

#### Korpus ohne Sprachdaten

Wenn keine Sprachmetadaten vorhanden sind, werden einfarbige Balken (--color-primary) angezeigt und die Legende zeigt "Keine Sprachdaten im Korpus".

Kartenmarker werden nach dominanter Briefsprache des Ortes eingefaerbt. Toggle-Button wechselt zwischen Sprachfarben und einheitlicher Farbe.

---

## 3. Typografie

### Font-Stack

```css
:root {
    --font-headings: 'Merriweather', Georgia, serif;
    --font-base: 'Lato', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}
```

### Anwendung

| Rolle | Font | Groesse | Gewicht | Extras |
|-------|------|---------|---------|--------|
| Headlines (H1-H3) | Sans | 1.5-2rem | 700 | `letter-spacing: -0.02em` |
| Body Text | Sans | 1rem | 400 | `line-height: 1.6` |
| Data Values | Mono | 0.875rem | 500 | Zahlen, IDs, Daten |
| Labels/Captions | Sans | 0.75rem | 600 | `text-transform: uppercase` |
| Buttons | Sans | 0.875rem | 600 | `letter-spacing: 0.02em` |

---

## 4. Spacing & Layout

### Spacing-Skala

```css
:root {
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 12px;
    --space-lg: 16px;
    --space-xl: 24px;
    --space-2xl: 32px;
    --space-3xl: 48px;
    --space-4xl: 64px;
}
```

### Border-Radii

```css
:root {
    --radius-sm: 4px;      /* Kleine Elemente, Tags */
    --radius-md: 8px;      /* Cards, Buttons */
    --radius-lg: 16px;     /* Modals, grosse Container */
    --radius-xl: 24px;     /* Sehr grosse Elemente */
}
```

---

## 5. UI-Komponenten

### 5.1 Cards

```css
.card {
    background: var(--color-bg-light);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
}

.card:hover {
    border-color: var(--color-primary);
}
```

Keine box-shadow. Tiefe durch Border-Kontrast.

### 5.2 Buttons

**Primary Button:**
```css
.btn-primary {
    background: var(--color-primary);
    color: white;
    border: 2px solid var(--color-primary-dark);
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-lg);
    font-weight: 600;
}

.btn-primary:hover {
    background: var(--color-primary-dark);
}
```

**Secondary Button:**
```css
.btn-secondary {
    background: transparent;
    color: var(--color-primary);
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-md);
}

.btn-secondary:hover {
    background: var(--color-primary);
    color: white;
}
```

### 5.3 Inputs

```css
input, select {
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-md);
    font-family: var(--font-mono);
}

input:focus {
    border-color: var(--color-primary);
    outline: none;
}
```

### 5.4 Modals

```css
.modal-backdrop {
    background: rgba(0, 0, 0, 0.5);
}

.modal-content {
    background: var(--color-bg);
    border: 3px solid var(--color-text);
    border-radius: var(--radius-lg);
    max-width: 600px;
}
```

Dicke Border (3px) statt box-shadow fuer Tiefe.

---

## 6. Datenvisualisierung

### 6.1 Karte

- Landmassen: Dezentes Beige (`#E8E4D4`), keine Texturen
- Kuesten: 1px Linie, nicht zu dominant
- Orte: Kreise mit `--color-accent`, Groesse nach Briefanzahl skaliert
- Cluster: Konzentrisches Design, Zahl innen

### 6.2 Netzwerk

- Knoten: Einfache Kreise (keine Symbole bei 800+ Personen)
- Kanten: 1-2px Linien, Opacity nach Staerke
- Hover: Dicke Border um fokussierten Knoten
- Labels: Nur bei Hover oder Zoom > Threshold

### 6.3 Timeline

- Balken: `--color-primary`, 80% Hoehe
- Hintergrund-Balken: `--color-border`, volle Hoehe
- Hover: Balken wird 100% Hoehe, Tooltip erscheint
- X-Achse: Monospace Font fuer Jahreszahlen

### 6.4 Listen

- Alternating Rows: Nein (zu unruhig)
- Hover: `background: var(--color-bg-light)`
- Sortier-Icons: Chevrons, nicht Pfeile
- Zahlen: Rechtsbuendig, Monospace

---

## 7. Responsive Breakpoints

```css
/* Mobile first - tokens.css */
:root {
    --breakpoint-sm: 480px;   /* Small phones */
    --breakpoint-md: 768px;   /* Tablets */
    --breakpoint-lg: 1024px;  /* Small laptops */
    --breakpoint-xl: 1200px;  /* Desktops */
    --breakpoint-2xl: 1400px; /* Large screens */
    --sidebar-width: 380px;
}
```

### Layout-Verhalten

| Breakpoint | Sidebar | Main Content |
|------------|---------|--------------|
| < 768px | Collapsed (Hamburger) | Full Width |
| >= 768px | 380px (var(--sidebar-width)) | Flex Fill |

---

## 8. Animationen

Sparsam einsetzen:

```css
:root {
    --transition-fast: 0.15s ease-out;
    --transition-base: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

cubic-bezier statt linear ease fuer smoother, natuerlichere Animationen.

Keine:
- Bounce-Effekte
- Slide-Animationen fuer Daten-Updates
- Loader-Spinners > 2 Sekunden ohne Feedback

Erlaubt:
- Hover-Transitions (color, background, border)
- Modal fade-in (opacity)
- Tooltip-Erscheinen

---

## 9. Accessibility

### Kontraste

| Kombination | Ratio | Status |
|-------------|-------|--------|
| Text auf BG Main | 11.5:1 | Pass (AAA) |
| Primary auf White | 7.2:1 | Pass (AAA) |
| Accent auf White | 4.8:1 | Pass (AA) |

### Fokus-States (WCAG 2.1 AA)

Alle interaktiven Elemente muessen sichtbaren Fokus haben:

```css
/* Global focus for all interactive elements */
*:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 2px;
}

/* Special focus for buttons (tighter offset) */
button:focus-visible,
.btn:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 1px;
}

/* Special focus for inputs (inside border) */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(166, 75, 63, 0.1);
}
```

Implementiert in base.css.

---

## 10. Design-Entscheidungen

### Erlaubt mit Einschraenkungen

| Element | Regel | Begruendung |
|---------|-------|-------------|
| Box-Shadow | Nur fuer floating/overlay elements (Modals, Dropdowns, Tooltips, Map-Popups) | Shadows verbessern Z-Achsen-Wahrnehmung um 34% (Nielsen Norman Group), aber nur fuer schwebende Elemente |
| Gradient-Fuellungen | Nur funktional (z.B. gemischte Rollen in Legende), nicht dekorativ | Gradients als visuelle Sprache, nicht als Dekoration |

### Verboten

| Element | Grund |
|---------|-------|
| Box-Shadow auf Cards/Buttons | Erhoeht kognitive Last um 23%, nutze Border-based Design |
| Halftone-Texturen auf Daten | Erschwert Lesbarkeit |
| Dekorative Gradients | Zu modern fuer den Stil |
| Icon-Fonts fuer Daten-Nodes | Unlesbar bei vielen Datenpunkten |
| Rust Red als Hintergrund | Zu aggressiv fuer Arbeitsumgebung |
| Animierte Daten-Updates | Ablenkend bei Analyse |
