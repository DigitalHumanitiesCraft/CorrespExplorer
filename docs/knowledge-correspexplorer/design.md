# Design System - CorrespExplorer

Stand: 2025-11-26

Technische Vorgaben fuer das UI-Design mit Fokus auf Forschungsdaten-Lesbarkeit und historischem Charakter.

---

## 0. Aktueller Zustand und Verbesserungsbedarf

### Analyse Landing-Page (Screenshot 2025-11-26)

| Problem | Beschreibung | Loesung |
|---------|--------------|---------|
| Kein Branding | Kein Logo, keine visuelle Identitaet | Logo im Header, Favicon |
| Flacher Hintergrund | `#f5f5f5` grau, generisch | Cream `#F5F3E8` mit subtiler Papier-Textur |
| Cards ohne Tiefe | Kaum Kontrast zum Hintergrund | 2px Border, leicht dunklerer BG |
| Buttons generisch | Standard-blau ohne Charakter | Accent-Farbe, dickere Borders |
| Keine Hierarchie | Alle Elemente gleichwertig | Upload-Zone prominenter, Cards sekundaer |

### Konkrete CSS-Aenderungen

```css
/* VORHER */
body { background: #f5f5f5; }
.card { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* NACHHER */
body { background: var(--color-bg); } /* #F5F3E8 */
.card {
    background: var(--color-bg-light); /* #EDEADB */
    border: 2px solid var(--color-border);
    box-shadow: none;
}
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
| Network Sender | `#2C5282` | Absender-Knoten |
| Network Receiver | `#2d6a4f` | Empfaenger-Knoten - Forest Green |
| Network Both | `#2d6a4f` | Beides - --color-role-both |
| Timeline Bar | `#2C5282` | Balken |
| Timeline Inactive | `#D4D0C0` | Hintergrund-Balken |

### Sprachfarben (Karte und Timeline)

Definiert in js/constants.js - verwendet fuer Kartenmarker nach dominanter Sprache und Timeline-Balken:

| Sprache | Variable | Hex-Code |
|---------|----------|----------|
| Deutsch | `de` | `#1e40af` (Blau) |
| Franzoesisch | `fr` | `#dc2626` (Rot) |
| Italienisch | `it` | `#16a34a` (Gruen) |
| Englisch | `en` | `#9333ea` (Lila) |
| Spanisch | `es` | `#ea580c` (Orange) |
| Portugiesisch | `pt` | `#0891b2` (Cyan) |
| Latein | `la` | `#78716c` (Grau) |
| Ungarisch | `hu` | `#be185d` (Pink) |
| Niederlaendisch | `nl` | `#f59e0b` (Amber) |
| Andere/Unbekannt | `other` | `#A64B3F` (Rust-Red) |

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

Hinweis: --font-mono ist in tokens.css noch nicht definiert, wird aber fuer Datenwerte benoetigt.

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
| >= 768px | var(--sidebar-width) 380px | Flex Fill |

---

## 8. Animationen

Sparsam einsetzen:

```css
:root {
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
}
```

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

### Fokus-States

Alle interaktiven Elemente muessen sichtbaren Fokus haben:

```css
:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 2px;
}
```

---

## 10. Nicht verwenden

| Element | Grund |
|---------|-------|
| Halftone-Texturen auf Daten | Erschwert Lesbarkeit |
| Box-Shadow fuer Tiefe | Inkonsistent, Border-Ansatz besser |
| Gradient-Fuellungen | Zu modern fuer den Stil |
| Icon-Fonts fuer Daten-Nodes | Unlesbar bei vielen Datenpunkten |
| Rust Red als Hintergrund | Zu aggressiv fuer Arbeitsumgebung |
| Animierte Daten-Updates | Ablenkend bei Analyse |
