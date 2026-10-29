---
title: Design
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2025-11-26
updated: 2026-10-29
authors: [Christopher Pollin]
template:
  name: Vorlage Design
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/design
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-design
related: [specification, architecture, uncertainty-specification]
---

# Design

Technische Vorgaben fuer das UI-Design mit Fokus auf Forschungsdaten-Lesbarkeit und historischem Charakter. Die kanonischen Werte liegen in `docs/css/tokens.css`, die daraus abgeleiteten Handlungsregeln für Agenten in `CLAUDE.md`.

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

Alle HTML-Seiten binden CSS in dieser Reihenfolge ein:
```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/shadows.css">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/[page].css">
```

Kein Stylesheet importiert `tokens.css` oder `components.css` erneut, `style.css` importiert nur die Schriften. `components.css` ist die einzige Quelle für `.btn`, `.btn-primary`, `.btn-secondary` und die Dialoggrundform (`.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-body`).

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
| Warning | `--color-warning` | `#7a5400` | Dunkelgold - Hinweise, Korb-Stern, unvollständiges Datum |
| Info | `--color-info` | `#005a87` | Akademisches Blau - Hinweisleisten |
| Error | `--color-error` | `#9b2226` | Dunkelrot - Fehler, unsichere Datierung |

Warning und Info wurden am 2026-10-29 abgedunkelt (vorher `#9b6b00` mit 4.2:1 und `#0077b6` mit 4.37:1 auf `--color-bg`), damit sie als Text auf `--color-bg` und `--color-bg-light` AA erreichen.

Helle Tönungen für Hover und Statusflächen werden mit `color-mix()` aus den Grundfarben gemischt (12 % Farbe auf `--color-bg`): `--color-primary-light`, `--color-success-light`, `--color-info-light`, `--color-warning-light`, `--color-error-light`. Hintergründe hinter Dialogen und dem mobilen Menü nutzen `--color-backdrop` (Schwarz 50 %), hinter der Demo-Tour `--color-overlay` (Schwarz 70 %).

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
| Netzwerk Personen | `--color-role-sender` | Knoten im Modus Zeitgenossen |
| Netzwerk Themen | `--color-warning` | Knoten im Modus Themen |
| Netzwerk Kanten | `--color-text-light`, hervorgehoben `--color-text` | Linien, Knotenrand `--color-bg` |
| Erwähnungsfluss | `--color-role-sender`, `--color-primary`, `--color-role-mentioned` | Absender links, Mitte, erwähnte Personen rechts |
| Timeline Bar | `#A64B3F` | Balken - --color-primary |
| Timeline Inactive | `#D4D0C0` | Hintergrund-Balken |
| Aktivitäts-Heatmap | `--color-bg-light`, `--color-scale-1` bis `--color-scale-4` | Sequentielle Skala von leer bis `--color-primary` |

#### Aktivitäts-Heatmap

Die Heatmap nutzt eine sequentielle Skala aus der Primärfarbe statt der früheren GitHub-Grüntöne, die außerhalb der Palette lagen. Stufe 0 (kein Brief) ist `--color-bg-light`, die Stufen 1 bis 3 mischen `--color-primary` zu 25, 50 und 75 % auf `--color-bg`, Stufe 4 ist `--color-primary`. Die Tokens liegen in `tokens.css`, die Klassen `.activity-level-0` bis `.activity-level-4` in `explore.css`.

### Unsicherheits-Indikatoren

Konsistente visuelle Sprache fuer Datenqualitaet ueber alle Views hinweg.

| Typ | Farbe | Icon | CSS-Klasse | Verwendung |
|-----|-------|------|------------|------------|
| Exaktes Datum | -- | -- | -- | Keine Markierung noetig |
| Nur Jahr/Monat | `--color-warning` (Dunkelgold) | `fa-calendar-alt` | `.date-precision-icon` | Briefliste, Tooltip |
| Zeitraum | `--color-secondary` (Blau) | `fa-arrows-alt-h` | `.date-range-icon` | Briefliste: "1.1. – 31.12.1900" |
| Unsichere Datierung | `--color-error` (Dunkelrot) | `fa-question-circle` | `.date-uncertain-icon` | cert="low" Attribut |
| Datum unbekannt | `--color-text-light` (Grau) | `fa-question` | `.date-unknown` | Kein Datum vorhanden |
| Timeline-Schraffur | Diagonale Streifen | -- | `.timeline-uncertainty-overlay` | Anteil unscharfer Daten im Jahr. Die Klasse steht in `explore.css`, die Zeitleiste rendert sie zurzeit nicht ([plan.md](plan.md#vorhaben)) |

#### Icon-Bedeutung

| Symbol | Bedeutung | Tooltip-Text |
|--------|-----------|--------------|
| Kalender (dunkelgold) | Datum unvollstaendig | "Nur Jahr/Monat bekannt" |
| Doppelpfeil (blau) | Zeitraum | "Zeitraum: Brief wurde zwischen diesen Daten verfasst" |
| Fragezeichen (rot) | Unsichere Angabe | "Unsichere Datierung (cert=low)" |
| Schraffierte Balken | Anteil unscharf | "[n] Briefe mit unscharfem Datum" |

#### Prinzipien

- Exakte Daten erhalten keine Markierung (kein visuelles Rauschen)
- Icons stehen immer vor dem Datumswert
- Farben sind konsistent: Dunkelgold = unvollstaendig, Blau = Zeitraum, Rot = unsicher. Die früheren Werte Amber `#f59e0b` (1.9:1 auf `--color-bg`) und Rot `#ef4444` erreichten den für Symbole nötigen Kontrast von 3:1 nicht. Die Legende auf `about.html` nutzt dieselben Tokens über `.color-warning`, `.color-info`, `.color-error`, `.color-muted` in `base.css`
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
| Ohne Angabe | `_none` (`NO_LANGUAGE`) | `#78716c` (Grau) |

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

Keine Schrift unterschreitet `--font-size-xs`, auch nicht in Zählern, Badges und Icons kleiner Kreise.

Überschriften folgen der Dokumentgliederung: `h1` (visuell versteckt) für die Seite, `h2` für den Kopf jeder Ansicht des Explorers, darunter `h3` und `h4` in den Detailbereichen. Größe und Abstand setzen die Regeln der jeweiligen Kopfbereiche, nicht die Ebene.
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
    --radius-full: 9999px; /* Pills, Chips, runde Badges */
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

Primary Button:
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

Secondary Button:
```css
.btn-secondary {
    background: transparent;
    color: var(--color-primary-dark);
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

input:focus-visible {
    border-color: var(--color-primary);
    outline: 3px solid var(--color-primary);
    outline-offset: 1px;
}
```

Der Text des Secondary Buttons steht in `--color-primary-dark`, weil `--color-primary` auf `--color-bg-light` (Steuerleisten, Kartenflächen) nur 4.45:1 erreicht. Eingaben behalten den sichtbaren Fokusrahmen, kein Seiten-CSS setzt `outline: none` auf `:focus`.

### 5.4 Modals

```css
.modal-overlay {
    background: var(--color-backdrop);
}

.modal-content {
    background: var(--color-bg);
    border: 3px solid var(--color-text);
    border-radius: var(--radius-lg);
    max-width: 600px;
}
```

Dicke Border (3px) für die Kontur, dazu der Schatten aus `shadows.css`, weil der Dialog über der Seite schwebt.

Escape schließt den obersten offenen Dialog über seinen Schließen-Knopf. Beim Öffnen springt der Fokus auf diesen Knopf, beim Schließen zurück auf das auslösende Element. Die Dialoge tragen `role="dialog"` und `aria-modal`. Umgesetzt für alle Seiten mit `enableModalKeyboard()` in `utils.js`. Die Demo-Tour verhält sich ebenso: Der Fokus liegt auf dem Hauptknopf des aktiven Schritts, Tab bleibt im Schritt, Escape beendet die Tour. Die mobile Sidebar schließt mit Escape und gibt den Fokus an ihren Schalter zurück.

Toasts liegen über den Dialogen, damit eine Meldung aus einem Dialog sichtbar und schließbar bleibt. Die Demo-Tour hebt ihr Zielelement mit Rahmen und abdunkelndem Schatten hervor, das Element bleibt dabei unter dem Tour-Dialog und nimmt keine Klicks an, damit „Weiter“ immer erreichbar ist. Ein Ziel außerhalb des Bildschirms wird nicht hervorgehoben.

Karten-Popups lassen rechts im Kopf Platz für den Schließen-Knopf von MapLibre (`padding-right` an `.popup-header`), damit der Stern zum Korb klickbar bleibt.

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

Media Queries können keine Custom Properties auswerten, sie wiederholen daher die Werte. Abfragen für Telefone lauten `max-width: 767px`, damit genau 768px das Tablet-Layout erhält, die Tablet-Abfrage lautet `max-width: 1024px`, der Dokumenten-Viewer stapelt bis `max-width: 1023px`. Eine Ausnahme ist `max-width: 1600px` in `components.css` für das zweispaltige Entitäten-Layout, das sich nach der verbleibenden Inhaltsbreite neben der Sidebar richtet.

```css
/* Werte in tokens.css */
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
| < 768px | Außerhalb des Bildschirms, höchstens 85 % der Bildschirmbreite, ein Filter-Schalter in der Navigation öffnet sie (`#sidebar-toggle`, `aria-expanded`) | volle Breite, Ansichtswechsel als scrollbare Icon-Leiste, Datensatztitel ausgeblendet |
| 768px bis 1199px | wie unten | Navigationslinks nur mit Icon (Text für Screenreader erhalten), Datensatztitel höchstens 12rem mit Auslassungspunkten |
| >= 768px | 380px (var(--sidebar-width)), 240px bis 1024px | Flex Fill |

Ein langer Datensatztitel in der Navigation wird mit Auslassungspunkten gekürzt (höchstens 20rem, vollständig im Tooltip) und gibt zuerst Platz ab, damit der Ansichtswechsel bedienbar bleibt. Der Wissenskorb stapelt Liste und Auswertung bis 1024px, die Liste nimmt dann die volle Breite. Breite Darstellungen (Timeline, Aktivitäts-Heatmap, Erwähnungsfluss) scrollen in ihrem eigenen Container, die Seite selbst bleibt auf 390px ohne horizontalen Überlauf (geprüft 2026-10-29 mit Playwright).

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
| Text auf BG Main | 14.3:1 | Pass (AAA) |
| Primary auf BG Main | 5.1:1 | Pass (AA) |
| Primary auf BG Card | 4.45:1 | Fail, dort `--color-primary-dark` (5.86:1), etwa Links in `.info-box`, `.link-list` und `.feature-item` der About-Seite |
| Primary auf Warning-Light | 4.3:1 | Fail, dort `--color-primary-dark` (5.65:1), etwa Hinweisfeld und Tooltip-Auslöser der Startseite |
| Secondary auf BG Main | 7.2:1 | Pass (AAA) |
| Warning auf BG Main / BG Card | 6.1:1 / 5.3:1 | Pass (AA) |
| Info auf BG Main / BG Card | 6.7:1 / 5.9:1 | Pass (AA) |

Werte berechnet nach der WCAG-Formel für relative Leuchtdichte am 2026-10-29. Links im Fließtext des Dokumenten-Viewers sind unterstrichen, weil `--color-secondary` sich vom Fließtext nur mit 2:1 abhebt.

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

/* Inputs keep the outline and additionally mark their border */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 1px;
    border-color: var(--color-primary);
}
```

Implementiert in base.css. Der vorherige Fokus der Eingaben (Schatten mit 10 % Deckkraft) erreichte nur 1.15:1 und wurde am 2026-10-29 ersetzt. Ergänzend: versteckte Checkboxen zeichnen den Fokus auf ihrem sichtbaren Kästchen (`.config-checkbox input:focus-visible ~ .checkmark`), die Kartenfläche zeigt ihn innen (`.maplibregl-canvas:focus-visible`), SVG-Knoten in Netzwerk und Erwähnungsfluss als Kontur (`stroke`), die Tooltips der Ansichtsknöpfe erscheinen auch bei Tastaturfokus. `base.css` stellt `.visually-hidden` für Statusmeldungen und unsichtbare Überschriften und `.skip-link` für den Sprunglink bereit. Interaktive Elemente sind mindestens 24 x 24px groß und schrumpfen in Flex-Zeilen nicht (`flex-shrink: 0`). Ausnahme sind bisher die Zellen der Aktivitäts-Heatmap mit 12 x 12px ([plan.md](plan.md#vorhaben)).

---

## 10. Design-Entscheidungen

### Erlaubt mit Einschraenkungen

| Element | Regel | Begruendung |
|---------|-------|-------------|
| Box-Shadow | Nur fuer schwebende Elemente (Dialoge, Demo-Tour, Toasts, Dropdowns, Tooltips, Map-Popups und Kartensteuerung, mobile Sidebar), gesetzt ausschließlich in `shadows.css` mit `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Shadows zeigen an, dass ein Element ueber der Seite liegt. Auf regulaeren Elementen erzeugen sie visuelles Rauschen ohne Ebeneninformation. Andere Stylesheets setzen höchstens `box-shadow: none` |
| Gradient-Fuellungen | Nur funktional (z.B. gemischte Rollen in Legende), nicht dekorativ | Gradients als visuelle Sprache, nicht als Dekoration |

### Verboten

| Element | Grund |
|---------|-------|
| Box-Shadow auf Cards/Buttons | Fuegt visuelles Gewicht ohne Informationsgehalt hinzu, nutze Border-based Design |
| Halftone-Texturen auf Daten | Erschwert Lesbarkeit |
| Dekorative Gradients | Zu modern fuer den Stil |
| Icon-Fonts fuer Daten-Nodes | Unlesbar bei vielen Datenpunkten |
| Rust Red als Hintergrund | Zu aggressiv fuer Arbeitsumgebung |
| Animierte Daten-Updates | Ablenkend bei Analyse |

---

## Visualisierungslogik

### Undatierte Briefe als abgesetzter Balken

Briefe ohne Datum stehen in einem eigenen Balken rechts der Timeline und werden keinem Platzhalterjahr zugeordnet, das die Zeitachse verzerren würde. Die Trennung macht die Datenlage sichtbar. Ein Klick oder Enter auf den Balken (`role="button"`) filtert auf die undatierten Briefe, unter dem Jahresregler steht dann „Nur Briefe ohne Datum“. Sind alle Briefe datiert, zeigt ein gestrichelter Platzhalter mit Häkchen diesen Zustand an. Die Timeline gruppiert dazu nach `datePrecision`.

### Markierung nur an unsicheren Werten

Exakte Daten bleiben ohne Markierung, damit gute Daten kein visuelles Rauschen erzeugen. Nur Unsicherheiten erhalten Farbe und Icon nach der Tabelle unter [Unsicherheits-Indikatoren](#unsicherheits-indikatoren). `formatters.js` liefert die CSS-Klassen aus `datePrecision`. Die Entscheidung steht in [specification.md](specification.md#adr-002-unsicherheit-sichtbar-machen).

### Sprachfarben

Bei Korpora mit vielen Sprachen werden gestapelte Balken mit lauter kräftigen Farben unlesbar. Deshalb erhält nur die dominante Sprache eine kräftige Farbe, die übrigen Pastelltöne (`computeLanguageColors()` sortiert nach Häufigkeit). Fehlen Sprachdaten ganz (`hasLanguageData` prüft, ob ein Brief `language.code` trägt), wären gestapelte Balken mit einer einzigen Kategorie irreführend. Die Balken bleiben dann einfarbig und die Legende nennt das Fehlen.

### Netzwerk

Die Mindestzahl gemeinsamer Jahre (`minYears`) für eine Kante richtet sich nach der Zeitspanne des Datensatzes, 1 bis zu fünf Jahren, 2 bis zu zwanzig Jahren, sonst 3. Kurze Zeiträume haben wenige Beziehungen und brauchen eine niedrige Schwelle, lange Zeiträume eine höhere, damit das Netzwerk lesbar bleibt. Alternativ färbt eine sequentielle Skala (D3 `interpolateYlGnBu`) jeden Korrespondenten nach dem Jahr seines ersten Briefs, eine Gradient-Legende zeigt den Jahresbereich. So werden frühe und späte Teilnehmer und die Entwicklung des Netzwerks sichtbar.

## Interaktionsmuster

### Transparente Datenlage

Fehlende Daten werden ausdrücklich als „unbekannt“ markiert, Tooltips erklären die Symbole. Forschende brauchen diese Transparenz, um die Reichweite ihrer Schlüsse einzuschätzen.

### Progressive Disclosure

Die Oberfläche zeigt zuerst den Überblick und Details auf Klick, vollständige Metadaten in Dialog oder Panel. Bei großen Datensätzen würde die gleichzeitige Anzeige aller Details überfordern.

### Startansicht und Navigation

Die Navigation zeigt die zwölf Ansichten als Icon-Knöpfe, Bezeichnung und Kurzbeschreibung stehen im Tooltip und im zugänglichen Namen. Die Startansicht fasst Kennzahlen, Quelle mit Lizenz und Änderungsvermerk, drei Chips zur Datenlage (datiert, identifiziert, georeferenziert), Einstiegspunkte und bis zu vier Forschungspfade auf einer Bildschirmhöhe zusammen. Die Chips stehen in der neutralen Chip-Gestaltung (Rahmen `--color-border-light`, Text `--color-text-light`) ohne Färbung nach dem Anteil. Eine Ampel bewertete die Daten der Partner und widersprach damit [ADR-005](specification.md#adr-005-nicht-wertende-sprache-für-partnerdaten). Der Operator hat sie am 2026-10-29 verworfen.

### Wissenspfade

Ein gestarteter Forschungspfad erscheint als Leiste unter der Navigation mit Frage, nummerierten Schritten, Zurück, Weiter, Beenden und der Zahl der Einträge im Korb. Der Korb steht zusätzlich als Abschnitt in der Sidebar.

### Forschungspfade

Jeder Schritt eines Pfads zeigt seine Aktion unter der Bezeichnung statt im Tooltip, weil Tooltips Hover verlangen und wesentliche Information verstecken. Die Pfadnummern stehen auf `var(--color-accent)`, nachdem weiße Ziffern auf hellem Grund unsichtbar waren. Texte über Lücken in Partnerdaten folgen [ADR-005](specification.md#adr-005-nicht-wertende-sprache-für-partnerdaten). Fragen, die der Datensatz nicht beantworten kann, stehen deshalb nicht als gesperrte Karten zwischen den Pfaden, sondern im aufklappbaren Abschnitt „Anreicherungspotential“ (`details.questions-enrichment`) mit der fehlenden Angabe und dem CMIF-Element, das sie ergänzen würde.
