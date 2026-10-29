---
title: Handoff
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: active
language: de
created: 2026-10-28
updated: 2026-10-29
---

# Handoff

Diese Process Inbox führt ausschließlich offene Übergabepunkte. Prüfe vor der Nutzung die Quelle und das aktuelle Ziel. Integriere dauerhaften Inhalt in das zuständige Declarative oder Action Document, dokumentiere den Übergang knapp in einem Eintrag oben in `docs/knowledge/journal.md` und entferne den bearbeiteten Punkt anschließend vollständig.

## Offene Handoff-Punkte

### Unverschmolzener Branch feature/research-dashboards

- Received: 2026-10-28
- Source: Branch `feature/research-dashboards` im Repository, abgezweigt von main bei `e7adb9b`, Commits ab Dezember 2025 bis 2026-10-28
- Target: [plan.md](plan.md), [architecture.md](architecture.md), [specification.md](specification.md), [journal.md](journal.md)
- Context: Der Branch setzt den Explorer mit weiteren Ansichten (Wissenspfade, Datenkorb) und einer Refaktorierung fort und dokumentiert das als Phasen 40 bis 46. Die Nummern überschneiden sich mit Phase 40 auf main. GitHub Pages liefert main aus. Die Wissensbasis auf main folgt seit 2026-10-28 den Promptotyping-Vorlagen, der Branch noch der früheren Struktur.
- Sichtung 2026-10-29: Der Branch trägt 26 Commits, von denen keiner patchgleich auf main liegt (`git cherry`), main trägt seit der Abzweigung eigene Commits, darunter die Sicherheitsfixes `6204990` und `c65c7af`, die Lizenzvereinheitlichung und die neue Wissensbasis. Inhalt des Branchs: Wissenspfade mit Datenkorb, Icon-Navigation, kompakte Startansicht, CMIF-v2-Felder im Demo-Datensatz, Vergleichsansicht, Auslagerung von acht Ansichten nach `docs/js/views/`, Migration auf `state.getMeta()` und das Löschen alter Module, Tests, Skripte und der Datei `docs/data/schoenbach.xml`. Der lokale Branch steht einen Commit (`8157f0a`) vor `origin/feature/research-dashboards`. Ein Probe-Merge mit `git merge-tree` ergibt Inhaltskonflikte in `README.md`, `docs/index.html`, `docs/js/explore.js`, `docs/js/vault.js`, `docs/js/tests/CONTEXT-MAP.md`, `docs/knowledge/architecture.md` sowie Konflikte zwischen den auf main umbenannten und auf dem Branch geänderten Wissensdokumenten. Die auf main am 2026-10-29 behobenen Fehler der Datumsqualität und des aktivsten Tags bestehen auf dem Branch fort (`explore.js`, `views/activity-view.js`), die Personenquote rechnet er bereits über `authority`.
- Next action: Branch gegen main sichten und die Integrationsform festlegen (Merge mit Angleichung der Phasennummern und der Wissensbasis, selektive Übernahme oder Verwerfen).
- Operator point: Ob und wie der Branch in main eingeht, entscheidet der Operator.
