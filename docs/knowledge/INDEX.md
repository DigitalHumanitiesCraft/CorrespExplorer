# HerData Knowledge Vault - Map of Content

Zentrale Einstiegsdatei für das HerData-Wissenssystem.

Stand: 2025-11-04

## Projekt

[project.md](project.md) - Projektziel, Datenquellen, Implementierungsstatus
[research-context.md](research-context.md) - Wissenschaftlicher Kontext, DH-Standards, Gender Studies

## Daten

[data.md](data.md) - Datenmodell, Strukturen, Verknüpfungen, CMIF + SNDB
Enthält: AGRELON-Ontologie, DTD-Schemas, LFDNR-Semantik, Projekt-XMLs, Geodaten

[debug-system.md](debug-system.md) - Data Provenance System
Dokumentiert vollständige Datenherkunft, Transformationen und Qualitätsindikatoren

## Design

[design.md](design.md) - UI/UX-System, Informationsarchitektur, Visualisierungsstrategie

[responsive-design.md](responsive-design.md) - Mobile Responsive Design Analyse
Bewertung der mobilen Nutzbarkeit und Optimierungsempfehlungen

## Requirements

[requirements.md](requirements.md) - User Stories, funktionale und nicht-funktionale Anforderungen

[requirements-validation.md](requirements-validation.md) - Validierung aller Requirements gegen tatsächliche Daten
- Datenabdeckungs-Analyse für alle 5 Epics
- Implementation Gaps identifiziert
- Empfehlungen für Datenintegration

## Technische Architektur

[technical-architecture.md](technical-architecture.md) - Frontend-Implementierung Details
MapLibre, State Management, Event Handler, Performance

[technical-analysis.md](technical-analysis.md) - Umfassende technische Analyse
- Python Pipeline (734 Zeilen, 4-Phasen-Architektur)
- JavaScript Frontend (1.693 Zeilen, 4 Module)
- Code-Qualität Assessment
- Performance-Metriken
- Verbesserungspotentiale

## Entscheidungen

[decisions.md](decisions.md) - Architecture Decision Records (ADRs)
- ADR-001: MapLibre GL JS (Accepted)
- ADR-002: Multi-Person Popups (Accepted)
- ADR-003: Cluster Color Encoding (Accepted)
- ADR-004: Network Visualization Library (Proposed)
- ADR-005: Timeline Implementation (Accepted)
- ADR-006: State Management Strategy (Deferred)
- ADR-007: Search Implementation (Proposed)
- ADR-008: Curated Dataset Selection (Accepted)

## Netzwerk

[network-relations.md](network-relations.md) - AGRELON-Beziehungen und Netzwerk-Visualisierung

## Implementierung

[implementation-quick-wins.md](implementation-quick-wins.md) - 6 Quick Win Features mit Code-Beispielen
Einfach zu implementierende Features mit hohem Nutzen

[implementation-mobile.md](implementation-mobile.md) - Mobile Responsive Implementation Plan
4-Stunden-Plan für kritische Responsive-Fixes

## Dokumentation

[documentation-assessment.md](documentation-assessment.md) - Review aller Markdown-Dateien
Qualitätsbewertung, Konsistenz-Analyse, Lücken-Identifikation

## Externe Verweise

- Live Demo: https://chpollin.github.io/HerData/
- Repository: https://github.com/chpollin/HerData
- Hauptdokumentation: [../../README.md](../../README.md)
- Entwicklungsjournal: [../../JOURNAL.md](../../JOURNAL.md)
