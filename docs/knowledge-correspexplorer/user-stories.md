# User Stories: CMIF Explorer

Systematische Sammlung von Anwendungsfaellen fuer ein Tool zur Visualisierung von Korrespondenz-Metadaten im CMIF-Format.

## Zielgruppen

1. Forschende (Digital Humanities, Geschichtswissenschaft, Literaturwissenschaft)
2. Archivar:innen und Bibliothekar:innen
3. Editions-Projekte
4. Interessierte Oeffentlichkeit

---

## Daten-Import

### US-01: CMIF-Datei hochladen
Als Forschende moechte ich eine lokale CMIF-XML-Datei hochladen, um meine eigenen Korrespondenz-Daten zu visualisieren.

Akzeptanzkriterien:
- Drag-and-Drop oder Datei-Dialog
- Validierung des XML-Formats
- Fehlermeldung bei ungueltigem Format
- Status: IMPLEMENTIERT

### US-02: CMIF von URL laden
Als Forschende moechte ich eine CMIF-Datei von einer URL laden, um Daten aus Online-Repositorien zu nutzen.

Akzeptanzkriterien:
- URL-Eingabefeld
- CORS-Fehlerbehandlung mit Hinweis
- Unterstuetzung von correspSearch-API
- Status: IMPLEMENTIERT

### US-03: Beispiel-Datensatz erkunden
Als neue Nutzerin moechte ich einen Beispiel-Datensatz laden, um die Funktionen des Tools kennenzulernen.

Akzeptanzkriterien:
- Vorprozessierter HSA-Datensatz verfuegbar
- Ein-Klick-Laden
- Status: IMPLEMENTIERT

---

## Ueberblick und Statistik

### US-04: Datensatz-Statistiken sehen
Als Forschende moechte ich auf einen Blick sehen, wie viele Briefe, Personen und Orte im Datensatz enthalten sind.

Akzeptanzkriterien:
- Statistik-Cards mit Kernzahlen
- Zeitraum-Angabe (min-max Jahr)
- Anzahl Orte mit/ohne Koordinaten
- Status: IMPLEMENTIERT

### US-05: Zeitliche Verteilung verstehen
Als Forschende moechte ich die zeitliche Verteilung der Korrespondenz visualisiert sehen, um Hochphasen und Luecken zu erkennen.

Akzeptanzkriterien:
- Timeline-Balkendiagramm
- Gruppierung nach Jahr oder Dekade
- Interaktiver Zeitfilter durch Klick
- Status: IMPLEMENTIERT

---

## Raeumliche Exploration

### US-06: Korrespondenz auf Karte sehen
Als Forschende moechte ich die Absendeorte auf einer Karte sehen, um die raeumliche Verteilung zu verstehen.

Akzeptanzkriterien:
- Interaktive Karte mit Zoom/Pan
- Clustering bei vielen Punkten
- Kreisgroesse proportional zur Briefanzahl
- Status: IMPLEMENTIERT

### US-07: Orts-Details abrufen
Als Forschende moechte ich auf einen Ort klicken, um zu sehen, wie viele Briefe von dort gesendet wurden und von wem.

Akzeptanzkriterien:
- Popup mit Ortsname
- Anzahl Briefe
- Liste der Absender (Top 5)
- Status: TEILWEISE (Popup zeigt nur Anzahl)

### US-08: Fehlende Koordinaten erkennen
Als Forschende moechte ich wissen, welche Orte keine Koordinaten haben, um die Datenqualitaet einschaetzen zu koennen.

Akzeptanzkriterien:
- Anzeige "X Orte ohne Geodaten"
- Liste der Orte ohne Koordinaten abrufbar
- Status: TEILWEISE (Anzahl wird gezeigt, keine Liste)

---

## Personen-Exploration

### US-09: Korrespondenten durchsuchen
Als Forschende moechte ich alle Korrespondenten durchsuchen und sortieren, um wichtige Kontakte zu identifizieren.

Akzeptanzkriterien:
- Suchbare Liste aller Personen
- Sortierung nach Briefanzahl, Name
- Anzeige: gesendet/empfangen
- Status: IMPLEMENTIERT

### US-10: Briefe einer Person filtern
Als Forschende moechte ich alle Briefe einer bestimmten Person sehen, um deren Korrespondenz zu analysieren.

Akzeptanzkriterien:
- Klick auf Person filtert Briefe
- Filter-Badge zeigt aktiven Filter
- Filter kann entfernt werden
- Status: IMPLEMENTIERT

### US-11: Korrespondenz-Netzwerk visualisieren
Als Forschende moechte ich sehen, wer mit wem korrespondiert hat, um Netzwerke und Cluster zu erkennen.

Akzeptanzkriterien:
- Force-Directed Graph
- Knoten = Personen
- Kanten = Briefwechsel
- Kantenstaerke = Anzahl Briefe
- Status: OFFEN

---

## Brief-Exploration

### US-12: Briefe durchsuchen
Als Forschende moechte ich alle Briefe durchsuchen und sortieren, um spezifische Korrespondenzen zu finden.

Akzeptanzkriterien:
- Suchbare Liste
- Sortierung nach Datum, Absender
- Anzeige: Sender, Empfaenger, Datum, Ort
- Status: IMPLEMENTIERT

### US-13: Brief-Details ansehen
Als Forschende moechte ich alle Metadaten eines Briefs sehen, einschliesslich erwaehnter Personen, Orte und Themen.

Akzeptanzkriterien:
- Modal oder Detail-Ansicht
- Vollstaendige Metadaten
- Links zu Authority-Dateien (VIAF, GND)
- Erwaehnte Entitaeten (mentions)
- Status: IMPLEMENTIERT

### US-14: Zur Quelle navigieren
Als Forschende moechte ich von einem Brief zur Original-Edition navigieren, um den Volltext zu lesen.

Akzeptanzkriterien:
- Link zur Quell-URL (wenn vorhanden)
- Oeffnet in neuem Tab
- Status: IMPLEMENTIERT

---

## Filterung und Analyse

### US-15: Nach Zeitraum filtern
Als Forschende moechte ich die Korrespondenz auf einen bestimmten Zeitraum einschraenken, um Phasen zu analysieren.

Akzeptanzkriterien:
- Slider fuer Start- und Endjahr
- Dynamische Aktualisierung aller Ansichten
- Status: IMPLEMENTIERT

### US-16: Nach Sprache filtern
Als Forschende moechte ich nach Briefsprache filtern, um z.B. nur franzoesische Briefe zu sehen.

Akzeptanzkriterien:
- Checkboxen fuer verfuegbare Sprachen
- Mehrfachauswahl moeglich
- Anzahl Briefe pro Sprache angezeigt
- Status: IMPLEMENTIERT

### US-17: Nach Thema filtern (HSA-spezifisch)
Als Forschende moechte ich nach Themen filtern, um thematisch verwandte Briefe zu finden.

Akzeptanzkriterien:
- Subject-Tags auswaehlbar
- Nur bei Datensaetzen mit mentionsSubject
- Status: OFFEN

### US-18: Filter kombinieren
Als Forschende moechte ich mehrere Filter kombinieren, um komplexe Anfragen zu stellen.

Akzeptanzkriterien:
- Alle Filter gleichzeitig anwendbar
- UND-Verknuepfung
- Status: IMPLEMENTIERT

### US-19: Filter zuruecksetzen
Als Forschende moechte ich alle Filter mit einem Klick zuruecksetzen, um zur Gesamtansicht zurueckzukehren.

Akzeptanzkriterien:
- Reset-Button
- Setzt alle Filter auf Standardwerte
- Status: IMPLEMENTIERT

---

## Teilen und Export

### US-20: Gefilterte Ansicht teilen
Als Forschende moechte ich einen Link zu meiner gefilterten Ansicht teilen, um Kolleg:innen eine spezifische Auswahl zu zeigen.

Akzeptanzkriterien:
- Filter-State in URL codiert
- Link kann kopiert und geteilt werden
- Empfaenger sieht gleiche Ansicht
- Status: IMPLEMENTIERT

### US-21: Daten als CSV exportieren
Als Forschende moechte ich die (gefilterten) Briefe als CSV exportieren, um sie in Excel oder anderen Tools zu analysieren.

Akzeptanzkriterien:
- Export der aktuell gefilterten Briefe
- Spalten: ID, Datum, Sender, Empfaenger, Ort, Sprache
- Status: IMPLEMENTIERT

### US-22: Daten als JSON exportieren
Als Entwicklerin moechte ich die Daten als JSON exportieren, um sie programmatisch weiterzuverarbeiten.

Akzeptanzkriterien:
- Vollstaendige Datenstruktur
- Indizes enthalten
- Status: IMPLEMENTIERT

---

## Vergleich und Integration

### US-23: Mehrere Datensaetze vergleichen
Als Forschende moechte ich zwei CMIF-Datensaetze vergleichen, um Ueberschneidungen oder Unterschiede zu finden.

Akzeptanzkriterien:
- Zwei Datensaetze laden
- Gemeinsame Personen/Orte markieren
- Status: OFFEN (Erweiterung)

### US-24: Mit correspSearch verknuepfen
Als Forschende moechte ich von einer Person zu deren Profil bei correspSearch navigieren, um weitere Korrespondenzen zu finden.

Akzeptanzkriterien:
- Link zu correspSearch-Personensuche
- Nutzt Authority-ID (GND, VIAF)
- Status: OFFEN

---

## Themen-Exploration (Neu)

### US-25: Themen durchsuchen
Als Forschende moechte ich alle Themen des Datensatzes durchsuchen, um relevante Diskurse zu finden.

Akzeptanzkriterien:
- Liste oder Wolke der Top-Themen
- Suchfeld fuer Themen
- Anzeige der Briefanzahl pro Thema
- Status: IMPLEMENTIERT

### US-26: Thema-Detail ansehen
Als Forschende moechte ich zu einem Thema sehen, wer darueber geschrieben hat und wann.

Akzeptanzkriterien:
- Liste der Korrespondenten mit Themen-Erwaehnung
- Zeitliche Verteilung der Erwaehungen
- Verwandte Themen (Co-Occurrence)
- Status: IMPLEMENTIERT

### US-27: Nach Thema filtern
Als Forschende moechte ich alle Briefe filtern, die ein bestimmtes Thema erwaehnen.

Akzeptanzkriterien:
- Klick auf Thema aktiviert Filter
- Filter-Badge in Sidebar
- Alle Views zeigen nur gefilterte Briefe
- Status: IMPLEMENTIERT

---

## Zusammenfassung: Implementierungs-Status

| Kategorie | Implementiert | Teilweise | Offen |
|-----------|---------------|-----------|-------|
| Daten-Import | 3 | 0 | 0 |
| Ueberblick | 2 | 0 | 0 |
| Raeumlich | 1 | 2 | 0 |
| Personen | 2 | 0 | 1 |
| Briefe | 3 | 0 | 0 |
| Filter | 5 | 0 | 1 |
| Teilen/Export | 3 | 0 | 0 |
| Vergleich | 0 | 0 | 2 |
| Themen | 3 | 0 | 0 |
| **Gesamt** | **22** | **2** | **4** |

---

## Priorisierung der offenen Features

### Hohe Prioritaet (neue Analyse-Moeglichkeiten)
1. US-11: Netzwerk-Visualisierung - Wer schreibt wem
2. US-07: Orts-Details erweitern - Absender im Popup

### Niedrige Prioritaet (Erweiterungen)
3. US-24: correspSearch-Integration
4. US-23: Datensatz-Vergleich
5. US-08: Liste der Orte ohne Koordinaten
6. US-17: Themen-Filter (Sidebar) - Schnellfilter fuer Top-Themen (optional, Topics View existiert)

