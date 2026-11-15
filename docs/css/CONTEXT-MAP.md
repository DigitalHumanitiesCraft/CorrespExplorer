# CSS Context Map

Border-basiertes Design mit Design-Tokens. Werte und Begründungen stehen in [design.md](../../knowledge/design.md), `tokens.css` ist für Farben, Abstände und Schrift maßgeblich.

## Ladereihenfolge

Die Seiten laden zuerst die Bibliotheks-Stylesheets aus `../vendor/` (Font Awesome, auf `explore.html` und `wissenskorb.html` auch MapLibre, auf `explore.html` noUiSlider), `index.html` danach die geteilten Bausteine der DHCraft-Projektseiten `assets/dhcraft/dhcraft-tokens.css` und `assets/dhcraft/dhcraft-components.css`, dann alle Seiten:

1. tokens.css - Design-Tokens (`--color-*` mit Tönungen, Zählskala und Backdrops, `--space-*`, `--font-*`, `--radius-*`, `--shadow-*`, Layoutmaße, Übergänge)
2. base.css - Reset, globale Elemente, `:focus-visible`, `.hidden`, `.visually-hidden`, `.skip-link`, Farbklassen der Präzisionssymbole
3. components.css - wiederverwendbare Komponenten, einzige Quelle für `.btn`, `.btn-primary`, `.btn-secondary`, die Dialoggrundform und den Ansichtskopf `.view-header`, dazu Karten, Toast aller Seiten, Sidebar-Abschnitte, Textalternative `.chart-table`, Zoom-Steuerung des Sankey
4. shadows.css - alle Schatten, nur für schwebende Elemente
5. style.css - Navigation, Sidebar, Layout, Responsive-Regeln, importiert nur `../vendor/fonts/fonts.css`
6. Seiten-CSS, je Seite in dieser Reihenfolge:
   - `explore.html`: explore.css, dashboard.css, network.css, spacetime.css, topics.css, drawer.css, letters.css, rail.css, time.css
   - `index.html`: upload.css, site-frame.css
   - `about.html`: about.css
   - `wissenskorb.html`: wissenskorb.css
   - `test.html`: test.css

Alle fünf Seiten laden die Schritte 1 bis 5 vollständig über `<link>`. Kein Stylesheet importiert `tokens.css` oder `components.css` erneut, sonst würden Komponentenregeln nach `shadows.css` wiederholt und dessen Regeln überschreiben.

## Seiten-CSS

- explore.css - Grundregeln aller Ansichten des Explorers, Kartenfläche `.map-stage`, Wissenskorb in der Sidebar, Kartensteuerung, die Art „Gesamt“ des Netzwerks
- dashboard.css - Startansicht: Block des Datensatzes in der Sidebar und das Dashboard kleiner Ansichten über der Briefleiste, auf dem Telefon untereinander
- network.css - Korrespondenzkreis der Netzwerkansicht, nach explore.css geladen, damit er bei gleicher Spezifität gewinnt
- spacetime.css - Raum-Zeit-Figur mit ihrer Steuerung
- topics.css - Themenansicht: Raster der Themen nach Jahren und Treemap der Anteile
- drawer.css - Briefleiste am unteren Rand des Hauptbereichs und der Auswahlsatz der Sidebar
- letters.css - Briefliste und die Liste der Briefleiste mit denselben Gruppen und Zeilen
- rail.css - Teile aller Ansichten: die Sidebar als schmale Leiste aus Zeichen mit Panels daneben, die Auswahlzeile am unteren Rand und die Sprachlegende, die der Sprachfilter ist. Auf dem Telefon bleibt die Sidebar das ausfahrende Panel mit vollen Beschriftungen
- time.css - Zeitansicht: Jahresprofil und der gewählte Zeitraum in seiner feinsten lesbaren Auflösung
- upload.css - Startseite, Upload-Zone, Datensatzkarten, Konfigurationsdialog
- site-frame.css - Kopf und Fuß in der gemeinsamen Form der DHCraft-Projektseiten. Deren Bausteine liegen in der Kaskadenebene `dh`, die ungeschichteten Regeln von base.css gewinnen über sie, deshalb setzt diese Datei Abstände und Farben von Kopf und Fuß neu. Gedacht für alle Seiten, geladen von `index.html`
- wissenskorb.css - Analyseseite des Wissenskorbs
- about.css - Projektseite
- test.css - Test-Runner

## Muster

- Reguläre Elemente (Karten, Buttons, Eingaben, Leisten) haben Rahmen. Schatten stehen nur in shadows.css und nur für Dialoge, Toasts, Dropdowns, Tooltips, Karten-Popups, Kartensteuerung und die mobile Sidebar. Die übrigen Stylesheets setzen `box-shadow` nur als `none` oder als eingesetzte Markierungslinie gewählter Einträge (`inset 3px 0 0 var(--color-primary)`).
- Farben, Abstände und Schrift verweisen ohne Ersatzwert auf Tokens aus tokens.css. Farben stehen als Token, Ausnahmen sind halbtransparentes Weiß auf farbigen Flächen und die Schraffurmuster der Timeline. Eigene Custom Properties haben nur Maße und Werte, die ein Stylesheet für seine Ansicht festlegt oder ein Skript am Element setzt (`--lv-*`, `--tp-*`, `--rows`, `--drawer-height`, `--language`, `--ego-language`), site-frame.css verwendet die Tokens `--dh-*` der DHCraft-Bausteine.
- z-index nur über die Skala `--z-*` aus tokens.css, Übergänge mit `--transition-properties` statt `all` und Dauern nur über `--transition-fast`, `--transition-base`, `--transition-slow`, Ränder von Bedienelementen mit `--color-border-control` (Werte und Gründe in [design.md](../../knowledge/design.md#css-architektur)).
- Textalternativen der Grafiken stehen als `.chart-table` in components.css: ein unauffälliger Schalter `.chart-table__switch` blendet die Tabelle ohne umgebenden Kasten ein, der Scrollbereich `.chart-table__scroll` ist fokussierbar.
- Dialoge haben eine Form in components.css: `.modal` als Hintergrund, `.modal-content` als Kasten, `.modal-lg` für Listen.
- Eine Komponente mit eigenen Breakpoints führt sie direkt hinter ihren Grundregeln (Umschaltung der Darstellungen in style.css, Netzwerksteuerung in explore.css), sonst überschreibt eine spätere Grundregel die Media Query.
- `prefers-reduced-motion` behandelt base.css für alle Seiten.
- Media Queries für Telefone lauten `max-width: 767px`, so erhält genau 768px das Tablet-Layout. Unter 768px liegt die Sidebar außerhalb des Bildschirms (`.sidebar.open` blendet sie ein, Breite höchstens 85vw), die Gegenstände der Ansichten stehen in einer zweiten Zeile unter Titel und Aktionen, und die Umschaltung der Darstellungen bricht um.
- Jede Ansicht von `explore.html` beginnt mit `.view-header` (BEM: `__title` als `h2`, `__description`, `__actions`, Modifikator `--inset` für Ansichten ohne gepolsterten Container). Die Seiten-CSS ändern Ansichtsköpfe nur, wo eine Ansicht es braucht: explore.css blendet den Titel von Briefliste, Netzwerk, Erwähnungsfluss und Startansicht visuell aus, für Screenreader bleibt er, time.css und network.css passen Abstand und Aktionen an. Dazu kommen Regeln für die Elemente in den Aktionen (`.mentions-autocomplete`, `.comparison-mode-btn`). Werte und Verhalten in [design.md](../../knowledge/design.md#kopfbereich-der-ansichten).
- Knöpfe, die als Text erscheinen (Namen in Listen, Themen in der Sidebar), setzen Rahmen und Hintergrund zurück und übernehmen Schrift und Farbe (`font: inherit`, `color: inherit`).
- `.hidden` in base.css blendet mit `!important` aus und überstimmt Anzeigeregeln der Seiten-CSS. Sie ist der einzige Sichtbarkeitsschalter, das Attribut `hidden` wird nicht verwendet. Dialoge öffnen und schließen deshalb nur über diese Klasse (`openModal`, `closeModal` in utils.js), nie über `style.display`.
