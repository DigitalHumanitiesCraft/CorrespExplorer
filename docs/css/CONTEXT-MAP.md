# CSS Context Map

Border-basiertes Design mit Design-Tokens. Werte und Begründungen stehen in [design.md](../knowledge/design.md), `tokens.css` ist für Farben, Abstände und Schrift maßgeblich.

## Ladereihenfolge

Die Seiten laden zuerst die Bibliotheks-Stylesheets aus `../vendor/` (Font Awesome, auf `explore.html` und `wissenskorb.html` auch MapLibre, auf `explore.html` noUiSlider), dann:

1. tokens.css - Design-Tokens (`--color-*` mit Tönungen, Heatmap-Skala und Backdrops, `--space-*`, `--font-*`, `--radius-*`, `--shadow-*`, Layoutmaße, Übergänge)
2. base.css - Reset, globale Elemente, `:focus-visible`, `.hidden`, `.visually-hidden`, `.skip-link`, Farbklassen der Präzisionssymbole
3. components.css - wiederverwendbare Komponenten, einzige Quelle für `.btn`, `.btn-primary`, `.btn-secondary` und die Dialoggrundform, dazu Karten, Toast aller Seiten, Sidebar-Abschnitte, Zoom-Steuerung des Sankey
4. shadows.css - alle Schatten, nur für schwebende Elemente
5. style.css - Navigation, Sidebar, Layout, Responsive-Regeln, importiert nur `../vendor/fonts/fonts.css`
6. Seiten-CSS: explore.css, upload.css, about.css, vault.css, wissenskorb.css, test.css

Alle sechs Seiten laden diese Reihenfolge vollständig über `<link>` (geprüft am 2026-10-29). Kein Stylesheet importiert `tokens.css` oder `components.css` erneut, sonst würden Komponentenregeln nach `shadows.css` wiederholt und dessen Regeln überschreiben.

## Seiten-CSS

- explore.css - alle Ansichten des Explorers, Startansicht, Wissenspfad-Leiste, Wissenskorb in der Sidebar, Kartensteuerung, Demo-Tour
- upload.css - Startseite, Upload-Zone, Datensatzkarten, Konfigurationsdialog
- wissenskorb.css - Analyseseite des Wissenskorbs
- vault.css - Dokumenten-Viewer
- about.css - Projektseite
- test.css - Test-Runner

## Muster

- Reguläre Elemente (Karten, Buttons, Eingaben, Leisten) tragen Rahmen. Schatten stehen nur in shadows.css und nur für Dialoge, Demo-Tour, Toasts, Dropdowns, Tooltips, Karten-Popups, Kartensteuerung und die mobile Sidebar. Die übrigen Stylesheets setzen höchstens `box-shadow: none` (geprüft am 2026-10-29 per Suche nach `box-shadow`).
- Jede `var(--…)`-Referenz verweist auf ein in tokens.css definiertes Token, ohne Ersatzwert (geprüft am 2026-10-29 per Skript). Farben stehen als Token, Ausnahmen sind halbtransparentes Weiß auf farbigen Flächen und die Schraffurmuster der Timeline.
- Media Queries für Telefone lauten `max-width: 767px`, so erhält genau 768px das Tablet-Layout. Unter 768px liegt die Sidebar außerhalb des Bildschirms (`.sidebar.open` blendet sie ein, Breite höchstens 85vw), der Ansichtswechsel wird zur scrollbaren Icon-Leiste.
- Knöpfe, die als Text erscheinen (Namen in Listen, Pfadschritte, Themen in der Sidebar), setzen Rahmen und Hintergrund zurück und übernehmen Schrift und Farbe (`font: inherit`, `color: inherit`).
- `.hidden` in base.css blendet mit `!important` aus und überstimmt Anzeigeregeln der Seiten-CSS. Dialoge öffnen und schließen deshalb nur über diese Klasse (`openModal`, `closeModal` in utils.js), nie über `style.display`.
