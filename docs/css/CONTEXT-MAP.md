# CSS Context Map

Border-basiertes Design mit Design-Tokens. Werte und Begründungen stehen in [design.md](../knowledge/design.md), `tokens.css` ist für Farben, Abstände und Schrift maßgeblich.

## Ladereihenfolge

Die Seiten laden zuerst die Bibliotheks-Stylesheets aus `../vendor/` (Font Awesome, auf `explore.html` und `wissenskorb.html` auch MapLibre, auf `explore.html` noUiSlider), dann:

1. tokens.css - Design-Tokens (`--color-*`, `--space-*`, `--font-*`, `--radius-*`, Layoutmaße, Übergänge)
2. base.css - Reset, globale Elemente, `:focus-visible`
3. components.css - wiederverwendbare Komponenten (Buttons, Karten, Dialoge, Toast aller Seiten, Sidebar-Abschnitte, Zoom-Steuerung des Sankey)
4. shadows.css - Schatten nur für schwebende Elemente
5. style.css - Navigation, Sidebar, Layout, Responsive-Regeln, importiert `../vendor/fonts/fonts.css`
6. Seiten-CSS: explore.css, upload.css, about.css, vault.css, wissenskorb.css, test.css

Alle sechs Seiten laden diese Reihenfolge vollständig (geprüft am 2026-10-29).

## Seiten-CSS

- explore.css - alle Ansichten des Explorers, Startansicht, Wissenspfad-Leiste, Wissenskorb in der Sidebar, Kartensteuerung, Demo-Tour
- upload.css - Startseite, Upload-Zone, Datensatzkarten, Konfigurationsdialog
- wissenskorb.css - Analyseseite des Wissenskorbs
- vault.css - Dokumenten-Viewer
- about.css - Projektseite
- test.css - Test-Runner

## Muster

- Reguläre Elemente (Karten, Buttons, Eingaben) tragen Rahmen. Schatten bleiben Dialogen, Dropdowns, Tooltips, Karten-Popups, Kartensteuerung und Toasts vorbehalten. Einzelne Schatten in style.css, explore.css, upload.css und wissenskorb.css sind gegen diese Regel noch nicht geprüft.
- Unter 768px liegt die Sidebar außerhalb des Bildschirms (`.sidebar.open` blendet sie ein), der Ansichtswechsel wird zur scrollbaren Icon-Leiste.
- `.hidden` in base.css blendet mit `!important` aus und überstimmt Anzeigeregeln der Seiten-CSS. Dialoge öffnen und schließen deshalb nur über diese Klasse (`openModal`, `closeModal` in utils.js), nie über `style.display`.
