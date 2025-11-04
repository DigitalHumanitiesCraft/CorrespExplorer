# Responsive Design Assessment

Vollständige Analyse des responsiven Designs der HerData Web-Anwendung.

Stand: 2025-11-02

## Executive Summary

**Status: JA, die Website ist responsive, aber mit Lücken.**

Bewertung: 7/10 (gut, aber verbesserungswürdig)

Stärken:
- Viewport Meta-Tags korrekt
- 3 Breakpoints implementiert (1024px, 768px, 640px)
- Flexbox und CSS Grid für Layout
- Sidebar wird auf Mobile zum Overlay
- Grid-Layouts passen sich an

Schwächen:
- Kein Hamburger-Menu für Sidebar-Toggle
- Touch-Events nicht explizit behandelt
- MapLibre GL Popups nicht für Touch optimiert
- Fehlende Breakpoints (480px für kleine Phones)
- Keine Tests auf echten Geräten dokumentiert

## Viewport Konfiguration

### HTML Meta-Tags

Alle 3 HTML-Seiten haben korrektes Viewport Meta-Tag:

```html
<!-- index.html, person.html, network.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Status: ✅ KORREKT

Bedeutung:
- `width=device-width` - Nutzt Gerätebreite
- `initial-scale=1.0` - Keine Zoom beim Laden
- Erlaubt User-Zoom (gut für Accessibility)

## CSS Media Queries

### Breakpoint-Struktur

3 Breakpoints implementiert:

```css
/* Tablet (≤1024px) */
@media (max-width: 1024px) { }

/* Mobile (≤640px) */
@media (max-width: 640px) { }

/* Person Page Tablet (≤768px) */
@media (max-width: 768px) { }
```

Total: 3 Media Queries in style.css (1.028 Zeilen)

### Breakpoint-Analyse

#### 1. Desktop (>1024px) - Standard

Layout:
```css
.container {
    display: flex;
    height: calc(100vh - var(--navbar-height));
}

.sidebar {
    width: 280px;  /* Feste Breite */
}

.nav-stats {
    display: flex;  /* Statistiken sichtbar */
}
```

Features:
- 3-Spalten-Layout (Sidebar + Main + Stats)
- Alle Elemente sichtbar
- Volle Navigation

#### 2. Tablet (≤1024px)

Änderungen:
```css
@media (max-width: 1024px) {
    .sidebar {
        width: 240px;  /* Schmalere Sidebar */
    }

    .nav-stats {
        display: none;  /* Statistiken ausgeblendet */
    }
}
```

Impact:
- Sidebar 40px schmaler (280px → 240px)
- Navigation-Stats versteckt (mehr Platz)
- Sonst identisch zu Desktop

Bewertung: ✅ SINNVOLL

#### 3. Mobile (≤640px)

Änderungen:
```css
@media (max-width: 640px) {
    /* Navigation kompakter */
    .nav-brand {
        font-size: var(--font-size-lg);  /* Kleiner */
    }

    .nav-links a {
        display: none;  /* Alle Links versteckt */
    }

    .nav-links a.active {
        display: block;  /* Nur aktiver Link */
    }

    /* Sidebar als Overlay */
    .sidebar {
        position: fixed;
        left: -280px;  /* Außerhalb sichtbar */
        top: var(--navbar-height);
        height: calc(100vh - var(--navbar-height));
        z-index: 999;
        transition: left 0.3s;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    }

    .sidebar.open {
        left: 0;  /* Sichtbar bei .open */
    }

    .main-content {
        width: 100%;  /* Volle Breite */
    }

    /* Tabs kompakter */
    .tabs {
        padding: 0 var(--space-lg);
    }

    .tab {
        padding: var(--space-md) var(--space-lg);
        font-size: var(--font-size-sm);
    }
}
```

Impact:
- Sidebar wird Slide-Out-Menu
- Navigation minimal (nur aktiver Link)
- Main-Content nutzt volle Breite
- Tabs kleiner und kompakter

Bewertung: ✅ GUT, aber fehlender Toggle-Button

#### 4. Person Page Tablet (≤768px)

Änderungen:
```css
@media (max-width: 768px) {
    .person-page {
        padding: var(--space-md);  /* Weniger Padding */
    }

    .person-header h1 {
        font-size: var(--font-size-2xl);  /* Kleinere Überschrift */
    }

    /* Grid-Anpassungen */
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);  /* 4 Spalten → 2 Spalten */
    }

    .places-grid {
        grid-template-columns: 1fr;  /* 1 Spalte statt 2 */
    }

    /* Karte kleiner */
    .mini-map {
        height: 300px;  /* Statt 400px */
    }

    /* Legende kompakter */
    .map-legend {
        bottom: var(--space-md);
        right: var(--space-md);
        padding: var(--space-sm);
        font-size: var(--font-size-xs);
    }

    .legend-color {
        width: 16px;  /* Statt 20px */
        height: 16px;
    }
}
```

Impact:
- Stats-Grid: 4 Spalten → 2 Spalten
- Places-Grid: 2 Spalten → 1 Spalte
- Karte 100px niedriger
- Schrift kleiner, Padding reduziert

Bewertung: ✅ GUT

## Layout-Systeme

### Flexbox

Verwendet für:
- Container (Sidebar + Main)
- Navigation (Navbar)
- Filter-Gruppen

```css
.container {
    display: flex;  /* Flexbox */
}

.navbar {
    display: flex;
    align-items: center;
}
```

Vorteile:
- Flexible Breiten
- Einfaches Alignment
- Gut für 1D-Layouts

### CSS Grid

Verwendet für:
- Stats-Grid (Person-Seite)
- Places-Grid
- Occupation-Badges

```css
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-lg);
}
```

Vorteile:
- `auto-fit` macht Grid automatisch responsive
- `minmax()` verhindert zu kleine Spalten
- 2D-Layouts

Bewertung: ✅ MODERNE STANDARDS

## Responsive Komponenten

### 1. MapLibre GL JS Map

Code (docs/js/app.js):
```javascript
map = new maplibregl.Map({
    container: 'map',
    // ... config
});

// Resize auf Window-Resize
map.on('load', () => {
    window.addEventListener('resize', () => {
        map.resize();
    });
});
```

Status: ✅ FUNKTIONIERT

Aber:
- Keine explizite Touch-Event-Behandlung
- Popups könnten zu groß auf Mobile sein
- Cluster-Tap nicht optimiert

### 2. Timeline (D3.js)

Code (docs/js/timeline.js):
```javascript
const width = container.clientWidth - margin.left - margin.right;
```

Status: ✅ RESPONSIVE

Timeline passt sich Container-Breite an.

Aber:
- Touch-Events nicht explizit behandelt
- Brush könnte schwierig auf Touch sein

### 3. Network Graph

Status: ⚠️ UNBEKANNT

Nicht analysiert in dieser Session.

### 4. Person Detail Page

Tabs:
```css
.tabs {
    display: flex;
    border-bottom: 2px solid var(--color-border);
}

@media (max-width: 640px) {
    .tabs {
        padding: 0 var(--space-lg);
    }

    .tab {
        padding: var(--space-md) var(--space-lg);
        font-size: var(--font-size-sm);
    }
}
```

Status: ✅ RESPONSIVE

Tabs bleiben horizontal, werden aber kleiner.

## Fehlende Features

### 1. KRITISCH: Kein Sidebar-Toggle-Button

Problem:
```css
.sidebar {
    left: -280px;  /* Versteckt */
}

.sidebar.open {
    left: 0;  /* Sichtbar */
}
```

Aber: Kein Button zum Togglen!

Lösung erforderlich:
```html
<button id="sidebar-toggle" class="mobile-only">☰ Filter</button>
```

```javascript
document.getElementById('sidebar-toggle').onclick = () => {
    document.querySelector('.sidebar').classList.toggle('open');
};
```

### 2. Touch-Events nicht optimiert

Problem:
- MapLibre Popups für Maus optimiert
- D3.js Brush schwierig auf Touch
- Keine Swipe-Gesten

Empfohlen:
```javascript
// Größere Touch-Targets
map.on('touchstart', (e) => {
    // Custom Touch-Handling
});

// Popup-Größe anpassen
if ('ontouchstart' in window) {
    popup.setMaxWidth('90vw');
}
```

### 3. Fehlende Breakpoints

Aktuell: 1024px, 768px, 640px

Fehlt:
- 480px (kleine Phones)
- 360px (sehr kleine Phones)
- 1440px (Large Desktops)

Empfohlen:
```css
/* Small Mobile (≤480px) */
@media (max-width: 480px) {
    .filter-group label {
        font-size: var(--font-size-sm);
    }

    .tab {
        padding: var(--space-sm) var(--space-md);
    }
}
```

### 4. Landscape-Orientierung nicht berücksichtigt

Problem:
- Nur max-width Queries
- Keine orientation: landscape

Empfohlen:
```css
@media (max-height: 600px) and (orientation: landscape) {
    .sidebar {
        height: 100vh;
        overflow-y: auto;
    }
}
```

### 5. No-JS-Fallback fehlt

Problem:
- Sidebar-Toggle benötigt JavaScript
- Ohne JS ist Sidebar nicht erreichbar auf Mobile

Empfohlen:
```html
<noscript>
    <style>
        .sidebar { left: 0 !important; }
    </style>
</noscript>
```

## Accessibility (A11y) auf Mobile

### Vorhanden

✅ User kann zoomen (kein `user-scalable=no`)
✅ Relative Font-Größen (rem/em teilweise)
✅ Gute Farb-Kontraste

### Fehlend

❌ Keine ARIA-Labels für Toggle-Buttons
❌ Focus-Indikatoren für Touch-Navigation
❌ Screen-Reader-Test nicht dokumentiert
❌ Keine `prefers-reduced-motion` Media Query

## Performance auf Mobile

### Map Performance

MapLibre GL JS:
- WebGL-Rendering (gut)
- Cluster bis Zoom 10 (reduziert DOM-Elemente)
- GeoJSON: 432 KB (akzeptabel)

Aber:
- 227 Marker gleichzeitig (könnte laggen auf alten Phones)
- Keine progressive Loading

### JavaScript Bundle

```
app.js: 28 KB (ungzipped)
timeline.js: 5.6 KB
person.js: 14 KB
network.js: 8.6 KB
Total: 56 KB (+ MapLibre 220 KB + D3 76 KB)
```

Gesamt: ~350 KB JavaScript

Bewertung: ⚠️ AKZEPTABEL, aber kein Code-Splitting

## Testing-Status

### Dokumentiert

❌ Keine Mobile-Tests dokumentiert
❌ Keine Device-Tests (iOS/Android)
❌ Keine Browser-Tests (Safari Mobile, Chrome Mobile)

### Empfohlen

Testen auf:
1. iPhone SE (375x667) - Kleinstes iOS-Device
2. iPhone 14 (390x844) - Aktuell
3. Samsung Galaxy S22 (360x800) - Android
4. iPad (768x1024) - Tablet
5. Desktop 1920x1080 - Standard

Tools:
- Chrome DevTools (Device Mode)
- BrowserStack (echte Geräte)
- Safari Responsive Design Mode

## Empfohlene Verbesserungen

### Sofort (Critical)

1. **Hamburger-Menu für Sidebar** (2 Stunden)
```html
<button id="menu-toggle" class="hamburger">
    <span></span>
    <span></span>
    <span></span>
</button>
```

```javascript
document.getElementById('menu-toggle').onclick = () => {
    document.querySelector('.sidebar').classList.toggle('open');
};
```

2. **Touch-optimierte Popups** (1 Stunde)
```javascript
if ('ontouchstart' in window) {
    popup.setMaxWidth('90vw');
    popup.addClassName('touch-optimized');
}
```

### Kurzfristig (1-2 Tage)

3. **Zusätzliche Breakpoints** (3 Stunden)
   - 480px für kleine Phones
   - Landscape-Modus

4. **Touch-Events explizit behandeln** (4 Stunden)
   - Swipe für Sidebar
   - Touch-Feedback
   - Larger Touch-Targets (48x48px minimum)

5. **Mobile-Testing durchführen** (1 Tag)
   - iOS Safari
   - Chrome Android
   - Dokumentation

### Mittelfristig (1 Woche)

6. **Progressive Web App Features**
   - Service Worker
   - Offline-Modus
   - Add-to-Homescreen

7. **Performance-Optimierung**
   - Code-Splitting (Timeline/Network lazy load)
   - Image-Optimization
   - Font-Subsetting

8. **Accessibility verbessern**
   - ARIA-Labels
   - Keyboard-Navigation
   - Screen-Reader-Testing

## Vergleich mit Best Practices

### Mobile-First Ansatz

Status: ❌ NICHT VERWENDET

Aktuell:
- Desktop-first mit max-width Media Queries
- Mobile als Sonderfall behandelt

Best Practice:
```css
/* Mobile-first */
.sidebar {
    position: fixed;
    left: -280px;
}

@media (min-width: 641px) {
    .sidebar {
        position: static;
        left: 0;
    }
}
```

### Touch-Target-Größe

Status: ⚠️ TEILWEISE ERFÜLLT

Empfohlen: 48x48px (Apple HIG), 44x44px (Material Design)

Aktuell:
- Buttons: ~40x32px (zu klein)
- Checkboxes: Standard (zu klein)
- Map-Marker: ~20px (schwierig zu tippen)

### Typography auf Mobile

Status: ✅ GUT

```css
--font-size-base: 14px;  /* Lesbar auf Mobile */
line-height: 1.6;        /* Gut für Lesbarkeit */
```

Aber: Könnte bei ≤480px auf 16px erhöht werden (iOS-Safari zoom-prevention).

## Checkliste: Responsive Design

### HTML ✅
- [x] Viewport Meta-Tag
- [x] Semantisches HTML5
- [ ] No-JS-Fallback

### CSS ✅
- [x] Media Queries vorhanden
- [x] Flexbox verwendet
- [x] CSS Grid verwendet
- [ ] Mobile-First (nicht implementiert)
- [ ] Touch-Target-Größe (teilweise)
- [ ] Landscape-Mode

### JavaScript ⚠️
- [ ] Touch-Events behandelt
- [x] Map resize on window resize
- [ ] Sidebar-Toggle implementiert
- [ ] Swipe-Gesten

### Testing ❌
- [ ] iOS Safari getestet
- [ ] Chrome Android getestet
- [ ] Tablet getestet
- [ ] Dokumentiert

### Performance ⚠️
- [x] Bundle-Größe akzeptabel (<500KB)
- [ ] Code-Splitting
- [ ] Lazy Loading
- [x] WebGL-Rendering (MapLibre)

### Accessibility ⚠️
- [x] User kann zoomen
- [x] Gute Kontraste
- [ ] ARIA-Labels
- [ ] Keyboard-Navigation
- [ ] Screen-Reader-Test

## Fazit

### Gesamtbewertung: 7/10

**Gut, aber verbesserungswürdig**

Stärken (70%):
- ✅ Viewport korrekt konfiguriert
- ✅ 3 Breakpoints implementiert
- ✅ Moderne CSS (Flexbox + Grid)
- ✅ Responsive Layouts (Grid mit auto-fit)
- ✅ Map reagiert auf Resize

Schwächen (30%):
- ❌ Kein Hamburger-Menu (kritisch!)
- ❌ Touch-Events nicht optimiert
- ❌ Fehlende Breakpoints (480px)
- ❌ Keine Mobile-Tests dokumentiert
- ❌ Accessibility-Lücken

### Ist es nutzbar auf Mobile?

**JA, aber mit Einschränkungen:**

Funktioniert:
- Karte sichtbar und bedienbar
- Filter-Sidebar technisch responsive
- Person-Detailseiten funktional
- Timeline funktioniert

Probleme:
- Sidebar nicht erreichbar ohne Toggle-Button
- Touch-Interaktionen suboptimal
- Kleine Tap-Targets
- Popups können zu groß sein

### Empfehlung

**Priorität 1 (Diese Woche):**
1. Hamburger-Menu für Sidebar implementieren (2h)
2. Touch-Targets vergrößern (1h)
3. Popups für Mobile optimieren (1h)

→ 4 Stunden, macht Mobile-Version vollständig nutzbar

**Priorität 2 (Nächste Woche):**
4. Mobile-Testing durchführen (1 Tag)
5. Zusätzliche Breakpoints (480px, Landscape)
6. Touch-Events explizit behandeln

→ 2 Tage, verbessert UX erheblich

Mit diesen Updates: 9/10 (exzellent)

---

**Siehe auch:**
- [QUICK_WINS.md](QUICK_WINS.md) - Einfache Verbesserungen
- [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) - Frontend-Architektur
- [knowledge/design.md](knowledge/design.md) - Design-System
