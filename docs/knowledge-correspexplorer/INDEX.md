# Knowledge Base: CorrespExplorer

Dokumentation für die Generalisierung des HerData-Projekts zum CorrespExplorer.

## Ziel

Entwicklung eines generischen Tools zur Exploration von CMIF-Korrespondenzdaten, das verschiedene Datenquellen verarbeiten kann.

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [PLAN.md](PLAN.md) | Implementierungsplan und Architekturkonzept |
| [CMIF-Data.md](CMIF-Data.md) | Datenmodell und Struktur der CMIF-Quellen |
| [JOURNAL.md](JOURNAL.md) | Entwicklungsprotokoll und Entscheidungen |
| [hsa-structure.json](hsa-structure.json) | Extrahierte Datenstruktur (maschinell) |

## Verwandte Dokumentation

Die HerData-spezifische Dokumentation befindet sich in:
- [knowledge-herdata/](../knowledge-herdata/) - Projekt-, Daten- und Designdokumentation

## Datenquellen

### Aktiv
- **HSA-CMIF**: Hugo Schuchardt Archiv (data/hsa/CMIF.xml)

### Referenz
- **PROPYLÄEN-CMIF**: Goethe-Korrespondenz (data/ra-cmif.xml)

## Entwicklungsstatus

- Phase 1: Datenanalyse (abgeschlossen)
- Phase 2: Generalisierte Architektur (geplant)
- Phase 3: Frontend-Integration (geplant)
- Phase 4: Multi-Source-Support (geplant)

## Analyse-Tools

- `preprocessing/analyze_hsa_cmif.py` - Strukturanalyse der HSA-CMIF-Datei
