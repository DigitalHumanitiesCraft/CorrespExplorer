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
updated: 2026-11-14
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

Kein Stylesheet importiert `tokens.css` oder `components.css` erneut, `style.css` importiert nur die Schriften. `components.css` ist die einzige Quelle für `.btn`, `.btn-primary`, `.btn-secondary`, die Dialoggrundform (`.modal`, `.modal-content`, `.modal-header`, `.modal-body`, siehe [5.4](#54-modals)) und den Kopfbereich der Ansichten (`.view-header`, siehe [5.5](#55-kopfbereich-der-ansichten)).

Ebenen stehen als Skala in `tokens.css` (`--z-base`, `--z-raised` für Ebenen innerhalb einer Komponente, dann `--z-dropdown`, `--z-sticky`, `--z-fixed`, `--z-modal`, `--z-tooltip`, `--z-tour`, `--z-toast`, `--z-skip-link`), kein Stylesheet setzt einen z-index als Zahl. Übergänge nennen ihre Eigenschaften über `--transition-properties` statt `transition: all` und ihre Dauer über `--transition-fast`, `--transition-base` oder `--transition-slow`, keine Dauer steht als Zahl. Sichtbarkeit schaltet allein die Klasse `.hidden` aus `base.css`, nie das Attribut `hidden` oder `style.display`. Wo zwei Gründe eine Fläche ausblenden, hält ein Datenattribut den einen fest, so `data-available` an der Themenliste der Sidebar, die in der Themenansicht und ohne Themen verborgen ist. Eine Komponente mit eigenen Breakpoints (Ansichtsleiste in `style.css`, Netzwerksteuerung in `explore.css`) führt diese direkt hinter ihren Grundregeln, weil eine spätere Grundregel gleicher Spezifität eine frühere Media Query überschreibt. So hatten bis 2026-11-05 die Grundregeln der Ansichtsleiste die Telefonregeln aufgehoben.

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
| Border Light | `--color-border-light` | `#D4D0C0` | Subtile Trennlinien, nie Rand eines Bedienelements |
| Border Control | `--color-border-control` | `#7F7A69` | Rand von Eingaben und Knöpfen ohne eigene Füllung |

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
| Map Land | `--color-map-land` (`#E8E4D4`) | Landmassen |
| Map Water | `--color-map-water` (`#B8D4E8`) | Wasser/Ozeane |
| Map Points | `#A64B3F` | Brieforte (Cluster) - --color-primary |
| Netzwerk Personen | `--color-role-sender` | Knoten in den Modi Briefwechsel und Zeitgenossen |
| Netzwerk Themen | `--color-warning` | Knoten im Modus Themen |
| Netzwerk Kanten | `--color-text-light`, hervorgehoben `--color-text` | Linien, Knotenrand `--color-bg` |
| Erwähnungsfluss | `--color-role-sender`, `--color-primary`, `--color-role-mentioned` | Absender links, Mitte, erwähnte Personen rechts |
| Timeline Bar | `#A64B3F` | Balken - --color-primary |
| Timeline Inactive | `#D4D0C0` | Hintergrund-Balken |
| Aktivitäts-Heatmap | `--color-bg-light`, `--color-scale-1` bis `--color-scale-4` | Sequentielle Skala von leer bis `--color-primary` |

#### Aktivitäts-Heatmap

Die Heatmap nutzt eine sequentielle Skala aus der Primärfarbe statt der früheren GitHub-Grüntöne, die außerhalb der Palette lagen. Stufe 0 (kein Brief) ist `--color-bg-light`, die Stufen 1 bis 3 mischen `--color-primary` zu 25, 50 und 75 % auf `--color-bg`, Stufe 4 ist `--color-primary`. Die Tokens liegen in `tokens.css`, die Klassen `.activity-level-0` bis `.activity-level-4` in `explore.css`.

Die Zellen bleiben 12 x 12px und unterschreiten damit die Zielgröße von 24 x 24px nach WCAG 2.2 SC 2.5.8. Das Werkzeug beruft sich auf die Ausnahme „wesentliche Darstellung“: Ein Tageskalender über Jahrzehnte ist nur als dichtes Raster lesbar, bei 24px würde der Kalender des HSA viermal so groß und müsste in beide Richtungen scrollen. Jede Zelle bleibt per Tastatur (Roving Tabindex, Pfeiltasten) und Tooltip erreichbar. Die Ausnahme ist eine Auslegung der Norm, keine Messung (Entscheidung E6 vom 2026-11-05).

Das Jahr der Heatmap wählt eine Auswahlliste mit Knöpfen für das vorige und das nächste Jahr, jede Option nennt die tagesgenauen Briefe des Jahrs. Bis 2026-11-05 stand ein Knopf je Jahr über der Heatmap, beim HSA mehrere Dutzend.

### Unsicherheits-Indikatoren

Konsistente visuelle Sprache fuer Datenqualitaet ueber alle Views hinweg.

| Typ | Farbe | Icon | CSS-Klasse | Verwendung |
|-----|-------|------|------------|------------|
| Exaktes Datum | -- | -- | -- | Keine Markierung noetig |
| Nur Jahr/Monat | `--color-warning` (Dunkelgold) | `fa-calendar-alt` | `.date-precision-icon` | Briefliste, Tooltip |
| Zeitraum | `--color-secondary` (Blau) | `fa-arrows-alt-h` | `.date-range-icon` | Briefliste: "1.1. – 31.12.1900" |
| Unsichere Datierung | `--color-error` (Dunkelrot) | `fa-question-circle` | `.date-uncertain-icon` | cert="low" Attribut |
| Datum unbekannt | `--color-text-light` (Grau) | `fa-question` | `.date-unknown` | Kein Datum vorhanden |
| Timeline-Schraffur | Diagonale Streifen | -- | `.timeline-uncertainty-overlay` | Anteil unscharfer Daten im Jahr, als Höhe des schraffierten Bereichs im Balken |

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

Keine Schrift unterschreitet `--font-size-xs`, auch nicht in Zählern, Badges und Icons kleiner Kreise. Bis 2026-11-05 zogen einige Regeln 1 bis 4px davon ab (Achsenbeschriftung der Timeline, Korbzähler, Legenden), sie stehen jetzt auf dem Token.

Überschriften folgen der Dokumentgliederung: `h1` (visuell versteckt) für die Seite, `h2` für den Kopf jeder Ansicht des Explorers, darunter `h3` und `h4` in den Detailbereichen. Größe und Abstand der `h2` setzt die gemeinsame Komponente `.view-header` ([5.5](#55-kopfbereich-der-ansichten)), nicht die Ebene.
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

Alle Seiten nutzen eine Dialogform aus `components.css`: `.modal` ist der Hintergrund (`--color-backdrop`, `--z-modal`), `.modal-content` der Kasten mit höchstens 480px, `.modal-lg` weitet ihn für Listen auf 640px. Der Kasten bleibt in der Bildschirmhöhe (`100dvh`), es scrollt nur `.modal-body`. Dynamisch erzeugte Dialoge (gemeinsame Briefe im Vergleich, Briefe einer Erwähnung) nutzen dieselben Klassen und `openModal()`. Bis 2026-11-05 gab es drei Grundformen in `components.css`, `explore.css` und `upload.css` und zwei Klassensysteme (`.modal`, `.modal-overlay`).

```css
.modal { position: fixed; inset: 0; z-index: var(--z-modal); background: var(--color-backdrop); }
.modal-content { max-width: 480px; max-height: calc(100dvh - 2 * var(--space-md)); border: var(--border-modal); }
```

Dicke Border (3px) für die Kontur, dazu der Schatten aus `shadows.css`, weil der Dialog über der Seite schwebt.

Escape schließt den obersten offenen Dialog über seinen Schließen-Knopf. Beim Öffnen springt der Fokus auf diesen Knopf, beim Schließen zurück auf das auslösende Element. Die Dialoge tragen `role="dialog"` und `aria-modal`. Umgesetzt für alle Seiten mit `enableModalKeyboard()` in `utils.js`. Die Demo-Tour verhält sich ebenso: Der Fokus liegt auf dem Hauptknopf des aktiven Schritts, Tab bleibt im Schritt, Escape beendet die Tour. Die mobile Sidebar schließt mit Escape und gibt den Fokus an ihren Schalter zurück.

Toasts liegen über den Dialogen, damit eine Meldung aus einem Dialog sichtbar und schließbar bleibt. Die Demo-Tour hebt ihr Zielelement mit Rahmen und abdunkelndem Schatten hervor, das Element bleibt dabei unter dem Tour-Dialog und nimmt keine Klicks an, damit „Weiter“ immer erreichbar ist. Ein Ziel außerhalb des Bildschirms wird nicht hervorgehoben.

Karten-Popups lassen rechts im Kopf Platz für den Schließen-Knopf von MapLibre (`padding-right` an `.popup-header`), damit der Stern zum Korb klickbar bleibt.

### 5.5 Kopfbereich der Ansichten

Alle zwölf Ansichten des Explorers beginnen mit derselben Komponente `.view-header` aus `components.css`. Sie ersetzt die früheren Kopfregeln je Ansicht, die Überschriften zwischen 16px und 32px groß, teils zentriert und mit eigenen Abständen setzten. Karte, Korrespondenten und Briefe hatten zuvor keine Überschrift.

```css
.view-header              /* Grid, linksbündig, margin-bottom: var(--space-lg) */
.view-header__title       /* h2, var(--font-size-xl) */
.view-header__description /* optional, var(--font-size-sm), var(--color-text-light) */
.view-header__actions     /* optional: Hinweise, Zähler, Moduswahl */
.view-header--inset       /* eigener Innenabstand und untere Linie */
```

- Titel und Beschreibung stehen links. Weitere Kinder wie die Kennzahlen und die Quellenzeile der Übersicht reihen sich darunter ein.
- Die Aktionen stehen ab 768px rechts neben Titel und Beschreibung und nehmen höchstens die halbe Breite ein, darunter brechen sie unter die Beschreibung um. Die Spalte darf schrumpfen, ihre Elemente umbrechen dann innerhalb der Spalte.
- Einen Aktionsbereich haben Aktivität (Hinweis „Experimentell“), Netzwerk (Zahl der Knoten und Verbindungen), Erwähnungsfluss (Personensuche), Chronik (Layoutwahl und Wikidata-Anreicherung) und Vergleich (Moduswahl Personen, Zeiträume, Orte). Die übrigen Ansichten haben nur Titel und Beschreibung, die Übersicht nur Titel und Kennzahlen.
- `--inset` gilt für Ansichten ohne gepolsterten Container (Karte, Korrespondenten, Briefe, Erwähnungsfluss). Der Kopf trägt dort selbst den Innenabstand `--space-lg` und schließt mit einer Linie in `--color-border-light` statt mit Außenabstand ab.
- Die Überschriften tragen keine Icons, damit alle Köpfe gleich beginnen. Der Zusatz „(angereichert)“ der Chronik hängt per `::after` am Titel.
- Auf der Karte liegen Steuerung und Legende auf `.map-stage`, die ab 768px den Platz unter dem Kopf füllt. Auf Telefonen behalten Karte und Listen ihre feste Höhe, die Seite scrollt um die Höhe des Kopfes.

---

## 6. Datenvisualisierung

### 6.1 Karte

- Grundkarte: Standard ist der helle Stil von OpenFreeMap (Positron), umgefärbt mit `--color-map-land` für Land, Parks und Wald und `--color-map-water` für Wasser (`applyPaperBasemap()` in `explore.js`). Die Farben ändern nur die Darstellung des geladenen Stils, es wird keine weitere Ressource geladen. Fehlt eine Ebene in einer späteren Fassung von Positron, bleibt ihre Originalfarbe. Der dunkle Stil bleibt über den Ebenen-Knopf erreichbar. Bis 2026-11-05 startete die Karte dunkel, danach kurz grau
- Landmassen: Dezentes Beige (`#E8E4D4`), keine Texturen
- Kuesten: 1px Linie, nicht zu dominant
- Orte: Kreise mit `--color-accent`, Groesse nach Briefanzahl skaliert
- Cluster: Konzentrisches Design, Zahl innen
- Tastatur: Die Marker sind Teil der MapLibre-Fläche und nicht einzeln fokussierbar. Der Kopf der Karte nennt die Ortsansicht als Tastaturweg und öffnet sie über einen Link-Knopf (`.view-header__link`, `data-switch-view`). Die Ortsliste bietet dieselben Orte mit Briefzahl und Filter (Entscheidung E7 vom 2026-11-05)

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
| 768px bis 899px | wie unten | Navigationslinks nur mit Icon (Text für Screenreader erhalten) |
| >= 768px | 380px (var(--sidebar-width)), 240px bis 1024px | Flex Fill |

Ab 768px hat die Kopfzeile der Arbeitsansicht zwei Zeilen, oben Datensatztitel und Verweise, unten die Ansichtsleiste (`grid-template-areas` in `style.css`). Die Höhe steht in `--navbar-height` und gilt über `html:has(.view-switcher)` nur für die Seite mit Ansichtsleiste, alle Abstände, die sich auf die Kopfzeile beziehen, lesen diese Eigenschaft. Der Datensatztitel hat damit die Breite der oberen Zeile neben den Verweisen und wird erst dort mit Auslassungspunkten gekürzt (vollständig im Tooltip). Bis 2026-11-10 teilten sich Titel, Ansichtsleiste und Verweise eine Zeile, der Titel war auf 20rem begrenzt und wurde regelmäßig gekürzt. Der Wissenskorb stapelt Liste und Auswertung bis 1024px, die Liste nimmt dann die volle Breite. Breite Darstellungen (Timeline, Aktivitäts-Heatmap, Erwähnungsfluss) scrollen in ihrem eigenen Container, die Seite selbst bleibt ohne horizontalen Überlauf (geprüft 2026-10-29 bei 390px, am 2026-11-05 für alle zwölf Ansichten bei 1440, 1024, 768 und 390px mit Playwright).

Die Ansichtsleiste scrollt waagerecht, wenn die zwölf Ansichten nicht passen, das ist unter 768px und mit Namen unter etwa 1100px der Fall. Ihre dünne Scrollleiste bleibt sichtbar und der angeschnittene Knopf am Rand zeigt, dass weitere Ansichten folgen. Bis 2026-11-05 war die Scrollleiste ausgeblendet. Der Fokusrahmen der Knöpfe liegt innen (`outline-offset: -3px`), damit der Überlauf der Leiste ihn nicht abschneidet.

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

Reduzierte Bewegung (WCAG 2.3.3): Bei `prefers-reduced-motion: reduce` setzt `base.css` Übergänge und Animationen auf ihren Endzustand. In D3 liefert `motionMs()` dann 0ms für Übergänge und Zoom, `settleWithoutMotion()` berechnet das Kräftelayout von Netzwerk und Wissenskorb vorab und zeichnet es einmal. Die Demo-Tour scrollt ohne Glättung. Ein gezogener Knoten bewegt sich weiter mit, weil diese Bewegung der Hand folgt. Alle drei Helfer stehen in `utils.js`.

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
| Border Control auf BG Main / BG Card | 3.9:1 / 3.4:1 | Pass (1.4.11), Rand von Eingaben und Knöpfen |
| Border Light auf BG Main | 1.4:1 | nur für Trennlinien, bis 2026-11-05 auch Rand von Suchfeldern und Schrittknöpfen |
| BG Card auf Text (Hinweis im dunklen Tooltip) | 12.5:1 | Pass (AAA), vorher Text Light mit Deckkraft 0.8, etwa 1.8:1 |

Werte berechnet nach der WCAG-Formel für relative Leuchtdichte am 2026-10-29, die Zeilen zu Border Control, Border Light und Tooltip-Hinweis am 2026-11-05. Links im Fließtext des Dokumenten-Viewers sind unterstrichen, weil `--color-secondary` sich vom Fließtext nur mit 2:1 abhebt.

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

Implementiert in base.css. Der vorherige Fokus der Eingaben (Schatten mit 10 % Deckkraft) erreichte nur 1.15:1 und wurde am 2026-10-29 ersetzt. Ergänzend: versteckte Checkboxen zeichnen den Fokus auf ihrem sichtbaren Kästchen (`.config-checkbox input:focus-visible ~ .checkmark`), die Kartenfläche zeigt ihn innen (`.maplibregl-canvas:focus-visible`), SVG-Knoten in Netzwerk und Erwähnungsfluss als Kontur (`stroke`), die Tooltips der Ansichtsknöpfe erscheinen auch bei Tastaturfokus. `base.css` stellt `.visually-hidden` für Statusmeldungen und unsichtbare Überschriften und `.skip-link` für den Sprunglink bereit. Interaktive Elemente sind mindestens 24 x 24px groß und schrumpfen in Flex-Zeilen nicht (`flex-shrink: 0`). Ausnahme sind die Zellen der Aktivitäts-Heatmap mit 12 x 12px, begründet unter [Aktivitäts-Heatmap](#aktivitäts-heatmap).

Seitenstruktur von `explore.html`: Die Seitenüberschrift `h1` steht vor der Sidebar, deren Abschnitte sind `h2`, ihre Filtergruppen `h3`, die Ansichtstitel `h2`. Bis 2026-11-05 standen `h4` und `h5` der Sidebar vor dem `h1`. Die Navigation ist das einzige Navigations-Landmark, die Ansichtsleiste darin eine Gruppe (`role="group"`). Die Dialoge tragen `role="dialog"`, `aria-modal` und `aria-labelledby` auf ihre Überschrift.

Textalternativen der Grafiken: Unter Timeline, Netzwerk, Erwähnungsfluss und Aktivitäts-Heatmap steht eine aufklappbare Tabelle „Daten als Tabelle“ mit den dargestellten Werten (`renderDataTable()` in `views/view-support.js`, Klasse `.chart-table` in `components.css`): Briefe je Jahr mit Sprachen, die Verbindungen des Netzwerks mit ihrer Stärke, alle Erwähnungspaare um die gewählte Person, auch jenseits der 15 Knoten je Seite, und die tagesgenauen Briefe je Monat. Die Tabelle ist eingeklappt, damit die Grafik oben bleibt, ihr Scrollbereich ist fokussierbar und benannt. Die Karte braucht keine, weil die Ortsansicht dieselben Orte als Liste führt.

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

Das Netzwerk startet im Modus Briefwechsel: Eine Kante verbindet zwei Personen, die einander schrieben, ihre Breite folgt der Zahl der Briefe in beide Richtungen, der Tooltip nennt beide Richtungen (Entscheidung E8 vom 2026-11-05). Beim HSA entsteht ein Stern um den Nachlassgeber, „Ego ausblenden“ zeigt die Verbindungen der übrigen Personen. Die Standardschwelle für eine Kante (Briefe `minLetters`, gemeinsame Jahre `minYears`, bei Themen gemeinsame Briefe `minCooccurrence`) ist der höchste Wert bis zum Vorgabewert in `NETWORK_DEFAULTS`, bei dem der Datensatz noch eine Kante zeigt. Große Datensätze behalten so eine lesbare Schwelle, kleine wie der Tutorial-Datensatz zeigen ein Netz statt einer leeren Fläche. Die frühere Regel nach der Zeitspanne ließ den Tutorial-Datensatz (über 20 Jahre, wenige Briefe je Absender) leer. Alternativ färbt eine sequentielle Skala (D3 `interpolateYlGnBu`) jeden Korrespondenten nach dem Jahr seines ersten Briefs, eine Gradient-Legende zeigt den Jahresbereich. So werden frühe und späte Teilnehmer und die Entwicklung des Netzwerks sichtbar.

## Interaktionsmuster

### Transparente Datenlage

Fehlende Daten werden ausdrücklich als „unbekannt“ markiert, Tooltips erklären die Symbole. Forschende brauchen diese Transparenz, um die Reichweite ihrer Schlüsse einzuschätzen.

### Progressive Disclosure

Die Oberfläche zeigt zuerst den Überblick und Details auf Klick, vollständige Metadaten in Dialog oder Panel. Bei großen Datensätzen würde die gleichzeitige Anzeige aller Details überfordern.

### Startansicht und Navigation

Die Kennzahlen der Sidebar (Briefe, Personen, Orte) zeigen bei aktivem Filter die gefilterte Zahl groß und darunter klein „von“ und die Gesamtzahl, ohne Filter nur die Gesamtzahl. So bleibt kein Filter unbemerkt, auch wenn sein Bedienelement eingeklappt ist. Die Kennzahlen und die Datenlage (Symbole an den Sidebar-Zahlen, Chips der Startansicht) entstehen aus einer Zusammenfassung beim Laden (`summarizeCorpus()`, `datasetQuality()`). Bis 2026-11-05 lasen die Sidebar-Symbole `meta.uncertainty` der Vorverarbeitung und zählten damit anders als die Chips. In der Themenansicht tritt die kurze Themenliste der Sidebar zurück, weil die Ansicht alle Themen mit eigener Suche zeigt. Die Navigation zeigt die zwölf Ansichten ab 768px mit Icon und sichtbarem Namen in der zweiten Zeile der Kopfzeile, darunter als Icon-Knöpfe. Die Kurzbeschreibung steht im Tooltip und über `aria-describedby` auch für Screenreader. Bis 2026-11-10 stand der Name erst ab 1600px sichtbar unter dem Icon, weil die eine Zeile neben Datensatztitel und Navigationslinks nicht reichte. Der Operator hat die Icons ohne Namen und die abgeschnittene Kopfzeile am 2026-11-10 beanstandet. Die Sprachliste der Sidebar zeigt die acht häufigsten Sprachen des Datensatzes und fasst die übrigen in der aufklappbaren Gruppe weitere Sprachen zusammen. Eine Sprache, der die übrigen Filter keinen Brief lassen, verlässt die Liste, bis ein Filter sie wieder trifft. Das Hinweisfeld der Startseite nennt das Werkzeug ein Experiment, sagt, was es zeigt, dass es kein fertiges oder betreutes Produkt ist und wohin Rückmeldungen gehören, ohne Tooltip. Die Startansicht fasst Kennzahlen, Quelle mit Lizenz und Änderungsvermerk, drei Chips zur Datenlage (datiert, identifiziert, georeferenziert), Einstiegspunkte und bis zu vier Forschungspfade auf einer Bildschirmhöhe zusammen. Die Chips stehen in der neutralen Chip-Gestaltung (Rahmen `--color-border-light`, Text `--color-text-light`) ohne Färbung nach dem Anteil. Eine Ampel bewertete die Daten der Partner und widersprach damit [ADR-005](specification.md#adr-005-nicht-wertende-sprache-für-partnerdaten). Der Operator hat sie am 2026-10-29 verworfen.

### Wissenspfade

Ein gestarteter Forschungspfad erscheint als eine Leiste unter der Navigation mit Frage, nummerierten Schritten, Zurück, Weiter (im letzten Schritt Abschließen) und Beenden. Den Korb zählen Navigation und Sidebar, die Leiste wiederholt ihn nicht. Bis 2026-11-05 gab es zusätzlich eine zweite Pfadnavigation unter der Ansicht und einen Zähler „Items“ in der Leiste.

### Forschungspfade

Jeder Schritt eines Pfads zeigt seine Aktion unter der Bezeichnung statt im Tooltip, weil Tooltips Hover verlangen und wesentliche Information verstecken. Die Pfadnummern stehen auf `var(--color-accent)`, nachdem weiße Ziffern auf hellem Grund unsichtbar waren. Texte über Lücken in Partnerdaten folgen [ADR-005](specification.md#adr-005-nicht-wertende-sprache-für-partnerdaten). Fragen, die der Datensatz nicht beantworten kann, stehen deshalb nicht als gesperrte Karten zwischen den Pfaden, sondern im aufklappbaren Abschnitt „Anreicherungspotential“ (`details.questions-enrichment`) mit der fehlenden Angabe und dem CMIF-Element, das sie ergänzen würde.

## Briefsätze und Überlieferung (Iteration November 2026)

Anforderungen des Operators, wörtlich, vom 2026-11-13 und 2026-11-14:

- „Wir können den CorrespExplorer in dieser Phase jetzt nochmal extra optimieren und genau anpassen und customizen, sodass er mit diesen Zweigdaten auch wirklich sehr gut umgehen kann. Das heißt: wirklich die Views nochmal durchdenken, anpassen, implementieren und umsetzen“
- „Ich möchte das, was wir haben, auch am Design und dem User Interface verbessern und optimieren und auch refactorn an dieser Stelle. Wir sollten uns dann wirklich überlegen: Wie können wir das evolvieren?“
- „Ich möchte bei den Zweigbriefen, die wir hier alle verarbeiten möchten, das in allen Views durchgehen. Das heißt, du sollst Software und Subagents da hinschicken, die wirklich den Browser mit konkreten Aufgaben bedienen. Die sollten uns dann immer wieder Feedback geben, ob das jetzt wirklich besser geworden ist.“
- Festgehaltene Vorlieben aus dem Auftrag: wenige Ebenen, nichts hinter Aufklappern, was man braucht, ist sichtbar oder über einen Filter erreichbar.

Was daraus gilt. Die Regeln werden von Eigenschaften der Daten ausgelöst und gelten für jeden Datensatz, der sie trägt.

- Der Normalfall bleibt unmarkiert. Ein Ort ohne GeoNames-ID trägt weder „(Region)“ noch Kursivschrift. Fehlen allen Orten die Koordinaten, sagt die Ortsansicht das in einem Satz, statt jeden Ort mit „?“ zu markieren. Nur in gemischten Datensätzen trägt der einzelne Ort die Marke.
- Erschlossenes steht in eckigen Klammern, in Liste, Dialog, Chronik und Korb gleich, mit einer Legendenzeile über der Briefliste. Ein Tooltip ist nie der einzige Ort einer Erklärung.
- Poststempel, Anschrift und Signatur stehen als benannte Angaben in der Briefzeile, mit kleinem Versal-Label, und brechen auf schmalen Bildschirmen um.
- Die Briefliste nennt ihre Zahl über der Liste, auch für eine Suche und für null Treffer, und wächst auf Wunsch in Schritten, statt still abzubrechen. Ein Klick auf einen Brief öffnet den Dialog mit allen Angaben. Die frühere aufgeklappte Zeile entfällt, weil sie nur Absender und Empfänger wiederholte.
- Jedes Merkmal der Überlieferung ist ein Filter der Seitenleiste mit Zahl (Gruppe „Überlieferung“). Ein Qualitätsfilter, der alle oder keine Briefe behielte, wird nicht gezeigt. Ein aktiver Überlieferungsfilter erscheint als Filtermarke wie Person und Ort.
- Die Übersicht nennt Dateien, Einträge und Briefe neben der Quelle, die Kennzeichen der Datenlage heißen nach dem, was sie zählen („auf den Tag datiert“, „mit Normdatensatz“, „mit Koordinaten“), und die Merkmale der Überlieferung stehen daneben als Knöpfe in die Briefliste. Kein Einstieg führt in eine Ansicht, die der Datensatz nicht füllt. Die Überschrift „Was möchten Sie erkunden?“ entfällt.
- Korrespondenten: „Körperschaft“ und „ohne Normdatensatz“ stehen als Wort in der Zeile, die Auswahl „Anzeigen“ bietet nur Arten, die der Datensatz enthält. Der Personendialog zeigt für jede Person zuerst, was der Datensatz sagt (Briefe, Zeitraum, häufigste Gegenüber, Absendeorte, Nachweis), externe Dienste folgen danach.
- Netzwerk: Beschriftungen stehen nach Knotengröße ohne Überlappung im Bild, das Layout ist vor dem Zeichnen berechnet. Ist eine Person an mindestens der Hälfte der Briefe beteiligt, sagt ein Satz das und nennt die Zahl der Verbindungen ohne sie, der Schalter „Ego ausblenden“ steht daneben. Die Farbwahl unterscheidet Person und Organisation, wo der Datensatz Organisationen hat.
- Zeitleiste: Erschlossene Datierungen teilen die Schraffur der unscharfen, die Legende nennt nur vorhandene Gründe. Der Balken ohne Jahr nennt seine Gruppen (ohne Datum, nur als Text datiert, unplausibles Jahr), jede Zahl führt zu genau diesen Briefen. Ohne Sprachdaten spricht die Ansicht nicht von Sprachen.
- Aktivität: Ein Satz nennt das dichteste Jahr, den dichtesten Monat und Tag, die Heatmap trägt Monatsnamen. Die Jahreszahlen zählen wie die Zeitleiste.
- Chronik: Die Ansicht zeigt den Verlauf der Briefwechsel. Jeder Eintrag nennt seine Stelle im Briefwechsel der beiden Personen und Lücken ab zwei Jahren. Die Marke des ersten Briefs ist eine Fahne, der Stern gehört dem Korb.
- Ansichten ohne Seitenleiste (Aktivität, Chronik, Vergleich) nennen einen aktiven Filter in einem Satz mit dem Knopf „Filter aufheben“. Derselbe Satz steht im Exportdialog.

Der Plan wurde dem Operator am 2026-11-13 als Text vorgelegt (acht Punkte von Laden bis Kennzeichnung) und am 2026-11-14 mit der Erweiterung auf alle Ansichten beauftragt. Seine Beurteilung am laufenden Explorer steht aus. Die Messung der Dichte im ersten Bildschirm liegt in mehreren Ansichten weiter über den Grenzwerten des Maßstabs, vor allem wegen der Seitenleiste, siehe [plan.md](plan.md#e11-entlastung-der-oberfläche).
