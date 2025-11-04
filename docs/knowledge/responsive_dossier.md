```yaml
title: HerData – Responsive Dossier
version: 1.2
stand: 04.11.2025
owner: HerData
scope: Mobile & Small Screens
status: in_progress
```

# Executive Summary

Die Anwendung ist responsiv nutzbar, weist jedoch einige Lücken in Navigation, Touch-Interaktion und kleinen Gerätegrößen auf. Mit wenigen, klar priorisierten Änderungen wird die mobile Erfahrung robust, zugänglich und konsistent. Dieses Dossier ist die einzige „Source of Truth“: Befunde sind direkt mit Zielverhalten und Abnahmekriterien verknüpft.

---

# 1) Diagnose (kompakt)

**Layout & Breakpoints**

* Mobile Darstellung funktioniert grundsätzlich; sehr kleine Viewports und Querformat sind nicht verlässlich abgedeckt.
* Desktop-first-Muster führt zu Sonderfällen auf kleinen Screens statt zu einem durchgehenden Fluss.

**Navigation**

* Seitliche Navigation ist mobil vorbereitet (Overlay-Verhalten), es fehlt jedoch ein eindeutig erkennbares Steuerelement zum Öffnen/Schließen mit klarem Zustandswechsel.

**Touch-Interaktion**

* Karten-Informationsfenster sind auf kleinen Displays nicht durchgängig lesbar und schließen nicht überall treffsicher.
* Zeitstrahl/Netzwerk sind in der Breite adaptiv, Touch-Gesten und Fokusführung sind nicht durchgehend gestaltet.

**Zugänglichkeit**

* Zoom ist erlaubt, Kontraste sind gut.
* Fokusindikatoren, Rollen/Labels für interaktive Elemente und Bewegungsreduktion sind nicht systematisch umgesetzt.

**Testing & Dokumentation**

* Gerätematrix und Abnahmeprotokolle fehlen.
* Kein dokumentierter Querformat-Test.

**Impact (aus Nutzersicht)**

* Primäre Funktionen sind erreichbar, aber nicht „mühelos“.
* Einzelne Interaktionen sind fehleranfällig (Verfehlen von Zielen, verdeckte Inhalte, unklare Zustände).

---

# 2) Zielbild & Definition of Done (DoD)

**Navigation (mobil)**

* Ein klar sichtbares Steuerelement öffnet und schließt die seitliche Navigation.
* Bei geöffnetem Zustand ist der Seiteninhalt visuell abgesetzt; Schließen ist über Steuerelement, Tippen außerhalb und die übliche Abbrechen-Taste möglich.
* Der Zustand ist visuell und für Assistive Technologien erkennbar.

**Bedienziele & Reihenfolge**

* Primäre Bedienelemente sind fingerfreundlich dimensioniert und ausreichend voneinander getrennt.
* Die Reihenfolge beim Durchlaufen mit der Tastatur entspricht der visuellen Struktur; Fokus ist jederzeit sichtbar.

**Informationsfenster (Karte)**

* Inhalte sind auf kleinen Displays ohne manuelles Zoomen lesbar.
* Mehrere Einträge sind als einzeln antippbare Zeilen gestaltet; Schließen ist prominent und eindeutig.

**Orientierung & Layout**

* Hoch- und Querformat funktionieren ohne horizontales Scrollen; Text bleibt ohne Workarounds lesbar.
* Kleine Viewports sind explizit unterstützt; große Bildschirme zeigen ein stabiles, ruhiges Layout.

**Zugänglichkeit**

* Interaktive Elemente verfügen über passende Rollen/Labels und klaren Fokuszustand.
* Bewegungen/Übergänge respektieren Systemeinstellungen zur Bewegungsreduktion.

**Abnahme – beobachtbares Verhalten**

* Steuerelement ist sichtbar, reagiert unmittelbar und zeigt den aktuellen Zustand.
* Öffnen/Schließen beeinflusst nur die Navigation, ohne Inhalts-Sprünge; Außenklick und Abbrechen-Taste schließen sicher.
* Antippen/Bedienen gelingt zuverlässig, ohne Fehltreffer; Tastaturnavigation deckt alle Primäraktionen ab.
* Kartenfenster passen sich der Breite an, Zeilen sind einzeln treffsicher, Schließen ist jederzeit möglich.
* Querformat auf kleinen Geräten funktioniert ohne horizontales Scrollen.
* Fokusindikatoren sind konsistent erkennbar; Bewegungen sind reduziert, wenn das System es wünscht.

---

# 3) Maßnahmen-Backlog (Verknüpfungsmatrix)

| Finding (Diagnose)                        | Maßnahme                                                                                                                   | Priorität | Status | Abnahmekriterium                                             | Referenz    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------: | ------ | ------------------------------------------------------------ | ----------- |
| Navigation ohne eindeutiges Steuerelement | Sichtbares, klar beschriftetes Steuerelement mit Zustandsanzeige; Schließen über drei Wege (Button, Außenklick, Abbrechen) |      Hoch | Offen  | Zustand sichtbar; drei Schließwege funktionieren zuverlässig | Navigation  |
| Overlay-Zustand unklar                    | Visuelle Trennung Inhalt/Navigation mit eindeutiger Tiefenwirkung                                                          |      Hoch | Offen  | Inhalt bleibt erkennbar, keine Layout-Sprünge                | Navigation  |
| Kleine Viewports/Querformat lückenhaft    | Gestaltung für sehr kleine Breiten und Querformat konsistent definieren                                                    |      Hoch | Offen  | Kein horizontales Scrollen; stabile Typografie               | Layout      |
| Karten-Popups schwer bedienbar            | Lesbare Popups mit deutlich erkennbarer Schließen-Aktion; Einträge als antippbare Zeilen                                   |      Hoch | Offen  | Lesbar ohne Zoom; treffsicheres Schließen                    | Karte       |
| Touch-Gesten und Ziele inkonsistent       | Einheitliche Ziel- und Abstandsrichtlinien; klares Tap-Feedback                                                            |    Mittel | Offen  | Keine Fehltreffer in üblichen Szenarien                      | Interaktion |
| Fokus & Labels unvollständig              | Fokusstil, Rollen/Labels, Zustandsansagen konsistent ergänzen                                                              |    Mittel | Offen  | Tastaturnutzung vollständig; Infos werden vorgelesen         | A11y        |
| Bewegungen nicht reduziert                | Bewegungsarme Variante gemäß Systemeinstellung                                                                             |    Mittel | Offen  | Reduzierte Übergänge bei aktivierter Reduktion               | A11y        |
| Testing fehlt                             | Gerätematrix, Abnahmeprotokoll, kurzer Testleitfaden                                                                       |      Hoch | Offen  | Protokolle vollständig, datiert, nachvollziehbar             | Qualität    |

*Hinweis:* „Referenz“ verweist auf die betroffene Oberfläche/Komponente im Projekt (keine Code-Dateien).

---

# 4) Testleitfaden (kurz)

**Gerätematrix**

* Kleines iOS-Telefon
* Aktuelles iOS-Telefon
* Aktuelles Android-Telefon
* Tablet im Hoch- und Querformat
* Desktop-Standardbreite

**Was wird geprüft**

* Navigation: Sichtbarkeit, Zustandswechsel, drei zuverlässige Schließwege.
* Interaktion: Treffsicherheit primärer Ziele, klares Feedback, sinnvolle Reihenfolge beim Durchlaufen.
* Karte: Lesbarkeit der Inhalte, eindeutiges Schließen, antippbare Zeilen.
* Layout: Keine horizontale Scrollen; Text ohne manuelles Zoomen gut lesbar.
* Zugänglichkeit: Fokus sichtbar, Rollen/Labels korrekt, Bewegungsreduktion wirksam.

**Dokumentation**

* Für jedes Gerät: Datum, Prüfer:in, Ergebnis je Prüffall (bestanden/nicht bestanden), kurze Notiz bei Abweichungen.

---

# 5) Checkliste (kompakt)

* [ ] Steuerelement Navigation sichtbar, states eindeutig
* [ ] Drei Schließwege funktionieren konsistent
* [ ] Keine horizontale Scrollen in Hoch-/Querformat
* [ ] Kartenfenster lesbar, Zeilen einzeln antippbar, Schließen jederzeit
* [ ] Primäre Ziele treffsicher, sinnvolle Abstände
* [ ] Tastaturnavigation vollständig, Fokus immer sichtbar
* [ ] Rollen/Labels gesetzt, Zustände werden angekündigt
* [ ] Bewegungen respektieren Systemeinstellung zur Reduktion
* [ ] Gerätematrix getestet und protokolliert

---

## Pflege & Governance

* **Single-Point-Update:** Änderungen stets hier einpflegen; daraus Tickets ableiten.
* **Changelog im Dossier:** Kurz notieren, was sich je Version geändert hat.
* **Verweise:** Hintergrunddetails und technische Tiefe bleiben in den bestehenden Wissensdokumenten; dieses Dossier bleibt konzeptuell und beobachtungsnah.