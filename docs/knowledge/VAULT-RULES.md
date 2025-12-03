# Vault Rules - Knowledge Directory Documentation Standards

Regeln für alle Markdown-Dateien im knowledge/ Verzeichnis.

## Verbotene Elemente

- Keine Bold-Formatierung
- Keine Emojis
- Keine Exclamation Marks für Emphasis
- Keine "Estimated Time" Sektionen
- Keine Line Counts oder Code Size Metrics
- Keine Box Drawings oder ASCII Art Diagramme
- Keine Code Snippets (außer minimal notwendige API-Signaturen)

## Präferierte Formatierung

- Klare Headings mit # Markdown Syntax
- Plain Text für Emphasis
- Bullet Points für Listen
- Kompakte, präzise natürliche Sprache
- Neutraler, objektiver Ton
- Keine Superlatives

## Dokumentationsansatz

- Fokus auf Relationships und Data Flow statt Metrics
- "Was macht der Code" statt "Wie groß ist der Code"
- Beschreibender Text statt Diagramme
- Absolute Zahlen mit Prozenten bei Statistiken
- Fakten mit Quellen belegen
- Relative Links zu anderen Docs

## Diagramme und Visualisierungen

Statt ASCII Art oder Box Drawings:
- Beschreibende Listen mit Hierarchie
- Natürliche Sprache für Datenflüsse
- "A führt zu B, B erzeugt C" statt Pfeile
- Indentierung für Struktur

Beispiel statt Diagramm:

Browser-Architektur:
- index.html (Landing Page)
  - Upload (Drag Drop)
  - URL Input (Remote Fetch)
  - Beide führen zu cmif-parser.js
    - Parser nutzt DOMParser
    - Speichert in sessionStorage
- explore.html (Hauptvisualisierung)
  - Lädt aus sessionStorage
  - Acht Views rendern Daten

## Code-Referenzen

Minimal wenn absolut notwendig:
- API-Signaturen: parseCMIF(source) returns Promise
- Wichtige Konstanten: MAX_LETTERS = 500
- Kritische Patterns: Subscriber-Pattern für State-Updates

Keine vollständigen Code Snippets mit Implementierungsdetails.

## Sprache

- Deutsch oder Englisch je nach Kontext
- Technische Begriffe in Originalform (GND, VIAF, TEI, CMIF)
- Konsistente Terminologie innerhalb eines Dokuments

## Datei-Updates

- Update bei Architektur-Änderungen
- Nicht bei Minor Edits
- Snapshot-Datum notieren wenn relevant
- Transparenz bei Data Quality Issues

## Zielgruppe

Dokumente dienen:
- Entwicklern zum schnellen Verständnis der Architektur
- Claude für Kontext bei Code-Änderungen
- Dokumentation von Design-Entscheidungen
- Onboarding neuer Contributors

Kein Tutorial-Charakter, sondern technische Referenz.
