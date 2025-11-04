# Navigations-Architektur

## Übersicht

Das HerData-Projekt verwendet ein komponentenbasiertes Navigationssystem mit varianten-spezifischen Navbars für verschiedene Ansichten (Karte, Synthese, Stats, etc.).

## Komponenten

### 1. Navbar-Komponenten

**Location**: `docs/components/`

Vier Navbar-Varianten:
- `navbar.html`: Standard (für Hauptseiten)
- `navbar-map.html`: Karten-Ansicht spezifisch
- `navbar-synthesis.html`: Synthese-Ansicht spezifisch
- `navbar-simple.html`: Vereinfachte Version

### 2. Navbar-Loader

**Location**: `docs/js/navbar-loader.js`

**Funktion**: `loadNavbar(variant = 'full')`

**Logik**:
```javascript
let navbarFile;
if (variant === 'simple') {
    navbarFile = 'components/navbar-simple.html';
} else if (variant === 'map') {
    navbarFile = 'components/navbar-map.html';
} else if (variant === 'synthesis') {
    navbarFile = '../components/navbar-synthesis.html';
} else {
    navbarFile = 'components/navbar.html';
}
```

**Wichtig**: Synthesis-Variante verwendet `../` da sie in `docs/synthesis/` liegt.

### 3. View-Switcher

**Zweck**: Navigation zwischen Haupt-Ansichten (Karte ↔ Synthese)

**Integration**: In globaler Navbar statt separate map-header

**Struktur**:
```html
<div class="view-switcher" role="navigation" aria-label="Ansichtswechsel">
    <a href="index.html" class="view-btn view-btn-active">Karte</a>
    <a href="synthesis/index.html" class="view-btn">Synthese</a>
</div>
```

**Varianten**:
- navbar.html: Beide Buttons inaktiv
- navbar-map.html: Karte-Button aktiv
- navbar-synthesis.html: Synthese-Button aktiv, Pfad zu Karte: `../index.html`

## Navbar-Varianten Details

### navbar.html (Standard)
**Verwendung**: index.html, stats.html, vault.html, people.html, places.html

**Features**:
- View-Switcher (beide inaktiv)
- Globale Suche
- Navigation-Links (Statistik, Vault, Index-Dropdown, Download)
- Dropdown für Index (Personen, Orte)

### navbar-map.html
**Verwendung**: index.html (Karten-Ansicht)

**Features**:
- View-Switcher (Karte aktiv)
- Globale Suche
- Navigation-Links
- Dropdown für Index

**Unterschied zu Standard**:
```html
<a href="index.html" class="view-btn view-btn-active" role="button" aria-pressed="true">Karte</a>
```

### navbar-synthesis.html
**Verwendung**: synthesis/index.html

**Features**:
- View-Switcher (Synthese aktiv)
- **KEINE** globale Suche (vermeidet Duplikat mit lokaler Filter-Suche)
- Navigation-Links
- Dropdown für Index

**Besonderheiten**:
- Pfade mit `../` Prefix (z.B. `href="../stats.html"`)
- View-Switcher Pfade:
  - Karte: `href="../index.html"`
  - Synthese: `href="index.html"`

### navbar-simple.html
**Verwendung**: Spezielle Seiten ohne volle Navigation

**Features**: Nur Brand-Logo, minimale Navigation

## Pfad-Handling

### Root-Level Seiten (docs/)
- Navbar-Loader: `loadNavbar('map')` oder `loadNavbar()`
- Navbar-File-Pfad: `components/navbar-map.html`
- Interne Links: Relativ ohne Prefix (z.B. `stats.html`)

### Subdirectory Seiten (docs/synthesis/)
- Navbar-Loader: `loadNavbar('synthesis')`
- Navbar-File-Pfad: `../components/navbar-synthesis.html`
- Interne Links: Mit `../` Prefix (z.B. `../stats.html`)
- View-Switcher zu Karte: `../index.html`
- View-Switcher zu Synthese: `index.html` (bleibt in synthesis/)

## Dropdown-Funktionalität

**Location**: `docs/js/navbar-loader.js` (initDropdown, Zeile 48-84)

**Features**:
- Toggle bei Click
- Close bei Click außerhalb
- Close bei Escape-Taste
- ARIA-Attribute für Accessibility

**Implementation**:
```javascript
toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isActive = dropdown.classList.toggle('active');
    toggle.setAttribute('aria-expanded', isActive);
});
```

## Integration in Seiten

### Standard-Integration
```html
<div id="navbar-placeholder"></div>

<script type="module">
    import { loadNavbar } from './js/navbar-loader.js';
    loadNavbar('map');
</script>
```

### Synthesis-Integration
```html
<div id="navbar-placeholder"></div>

<script type="module" src="js/app.js"></script>
```

App.js enthält:
```javascript
import { loadNavbar } from '../../js/navbar-loader.js';

async function init() {
    await loadNavbar('synthesis');
    // ... rest of init
}
```

## Suche-Funktionalität

### Globale Suche
**Location**: navbar.html, navbar-map.html

**Element**: `<input id="global-search" ...>`

**Zweck**: Personensuche über gesamte Anwendung

**JavaScript-Handler**: Definiert in jeweiliger Seiten-App.js

### Lokale Suche (Synthese)
**Location**: synthesis/index.html (Filter-Panel)

**Element**: `<input id="search-input" ...>`

**Zweck**: Filtert Personen-Tabelle in Synthese-Ansicht

**Warum keine globale Suche in Synthesis**: Vermeidung von Duplikation und Verwirrung

## Styling

**Location**: `docs/css/style.css`

**Hauptklassen**:
- `.navbar`: Container
- `.nav-brand`: Logo/Brand-Link
- `.view-switcher`: View-Toggle-Buttons
- `.view-btn`: Einzelner Button
- `.view-btn-active`: Aktiver Button
- `.nav-search`: Globale Suche
- `.nav-links`: Rechte Navigation
- `.nav-dropdown`: Dropdown-Container
- `.nav-dropdown-menu`: Dropdown-Inhalt

**CSS-Variablen** (verwendet):
- `--color-primary`
- `--color-bg`
- `--color-border`
- etc.

## Accessibility

**ARIA-Attribute**:
- `role="navigation"`: Auf navbar und view-switcher
- `aria-label`: Beschreibende Labels
- `aria-pressed`: State für View-Buttons
- `aria-haspopup="true"`: Auf Dropdown-Toggle
- `aria-expanded`: State für Dropdown
- `role="menu"` und `role="menuitem"`: Dropdown-Items

**Keyboard-Support**:
- Escape schließt Dropdown
- Tab-Navigation funktioniert
- Enter/Space auf Dropdown-Toggle

## Fehlerbehandlung

**Navbar-Loader**:
```javascript
try {
    const response = await fetch(navbarFile);
    if (!response.ok) throw new Error('Failed to load navbar');
    // ...
} catch (error) {
    console.error('❌ Failed to load navbar:', error);
    // Fallback: Minimale Navbar
    navbarPlaceholder.innerHTML = `
        <nav class="navbar">
            <div class="nav-brand">
                <a href="index.html">HerData</a>
            </div>
        </nav>
    `;
}
```

## Best Practices

1. **Konsistente Pfade**: Immer relativ zur aktuellen Datei
2. **Varianten verwenden**: Nicht alle Features in alle Navbars
3. **Accessibility**: ARIA-Attribute nicht vergessen
4. **Lazy-Loading**: Navbar wird asynchron geladen
5. **Error-Handling**: Fallback bei Lade-Fehler
6. **Event-Cleanup**: Event-Listener bei Bedarf entfernen

## Zukünftige Erweiterungen

1. **Breadcrumb-Navigation**: Für tiefere Hierarchien
2. **User-Preferences**: Speicherung der bevorzugten Ansicht
3. **Mobile-Optimierung**: Hamburger-Menu für kleine Bildschirme
4. **Active-State-Detection**: Automatische Erkennung der aktiven Seite
5. **Search-Autocomplete**: Suggestions bei globaler Suche
