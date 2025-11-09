# Wissenskorb Dokumentations-Konsolidierungsplan

## Aktueller Stand

8 separate Wissenskorb-Dateien in docs/knowledge/:

1. **wissenskorb.md** (Hauptdatei)
2. **wissenskorb-backlog.md** (offene Aufgaben)
3. **wissenskorb-code-review.md** (Code-Qualitätsanalyse)
4. **wissenskorb-implementation.md** (technische Details)
5. **wissenskorb-manual-testing-guide.md** (Testanleitung)
6. **wissenskorb-status.md** (Statusübersicht)
7. **wissenskorb-test-checklist.md** (Testfälle)
8. **wissenskorb-validation-report.md** (Validierungsbericht)

## Zielstruktur

Eine konsolidierte Datei: **wissenskorb.md**

### Neue Struktur

```markdown
# Wissenskorb

## 1. Überblick
- Was ist der Wissenskorb
- Features im Überblick
- Aktueller Status

## 2. Funktionalität
- Personen-Management (Hinzufügen/Entfernen)
- Netzwerk-Visualisierung (3 Modi: AGRELON/Places/Occupations)
- Timeline-Visualisierung
- Export-Funktionen
- Navigation Controls (Zoom/Fit/Help)

## 3. Technische Implementierung
- Architektur (localStorage + Cytoscape.js)
- Wichtige Funktionen (aus wissenskorb-implementation.md)
- Datenfluss
- Performance-Optimierungen

## 4. Testing
- Testfälle (aus test-checklist)
- Manuelle Tests (aus manual-testing-guide)
- Bekannte Issues

## 5. Backlog
- Offene Features (aus backlog)
- Nice-to-Haves
- Priorisierung
```

## Migrations-Schritte

### Phase 1: Inhalte zusammenführen

1. **wissenskorb.md** als Basis behalten
2. Hinzufügen aus **wissenskorb-status.md**:
   - Aktuelle Statistiken (Zeilen 1-30)
   - Feature-Status-Liste
3. Hinzufügen aus **wissenskorb-implementation.md**:
   - Edge-Tooltips Implementierung
   - Layout-Parameter
   - Code-Snippets (wichtigste)
4. Hinzufügen aus **wissenskorb-test-checklist.md**:
   - Testfälle als Untersektion
5. Hinzufügen aus **wissenskorb-backlog.md**:
   - Offene Features als Sektion 5

### Phase 2: Archive erstellen

Verschiebe nicht-essentielle Inhalte nach `archive/wissenskorb/`:

- **wissenskorb-code-review.md** → `archive/wissenskorb/code-review-2025-11-05.md`
- **wissenskorb-manual-testing-guide.md** → `archive/wissenskorb/manual-testing-guide.md`
- **wissenskorb-validation-report.md** → `archive/wissenskorb/validation-report-2025-11-05.md`

### Phase 3: Löschen

Nach erfolgreicher Konsolidierung löschen:
- wissenskorb-status.md (Inhalt in Hauptdatei)
- wissenskorb-implementation.md (Kernaussagen in Hauptdatei)
- wissenskorb-test-checklist.md (Tests in Hauptdatei)
- wissenskorb-backlog.md (Backlog in Hauptdatei)

## Entscheidungsmatrix

| Datei | Aktion | Begründung |
|-------|--------|------------|
| wissenskorb.md | BEHALTEN + ERWEITERN | Hauptdatei |
| -status.md | MERGE → Sektion 1 | Aktuelle Übersicht |
| -implementation.md | MERGE → Sektion 3 | Wichtigste Code-Details |
| -test-checklist.md | MERGE → Sektion 4 | Essenzielle Testfälle |
| -backlog.md | MERGE → Sektion 5 | Offene Features |
| -code-review.md | ARCHIVIEREN | Zeitpunkt-spezifisch, nicht laufend relevant |
| -manual-testing-guide.md | ARCHIVIEREN | Zu detailliert, nur bei Bedarf |
| -validation-report.md | ARCHIVIEREN | Historischer Snapshot |

## Vorteile

- ✅ Eine zentrale Anlaufstelle für Wissenskorb-Dokumentation
- ✅ Reduziert Redundanz (aktuell 4x "Feature-Listen")
- ✅ Einfacher zu pflegen (1 statt 8 Dateien)
- ✅ Bessere Übersicht für neue Entwickler
- ✅ Historische Details bleiben in archive/ erhalten

## Nächste Schritte

1. Backup erstellen: `git commit` vor Konsolidierung
2. Archive-Ordner anlegen: `mkdir -p archive/wissenskorb`
3. Wissenskorb.md erweitern mit Inhalten aus 4 Dateien
4. Historische Dateien nach archive/ verschieben
5. Redundante Dateien löschen
6. Commit: "Consolidate wissenskorb documentation into single file"
7. INDEX.md aktualisieren (Verweis auf neue Struktur)
