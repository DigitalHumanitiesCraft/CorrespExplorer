# Interface-Genese als Forschungsmethode

Wenn Forschungsinterfaces aus Forschungsdaten abgeleitet werden koennen, ist dann der Akt des Tool-Bauens selbst bereits eine Form der Forschung?

---

## These

Die generative Entwicklung von Forschungsinterfaces mit LLMs ist eine eigenstaendige Form der Datenexploration. Das entstehende Interface dokumentiert implizite Erkenntnisse ueber den Moeglichkeitsraum der Daten.

## Hintergrund

Klassischer Forschungsprozess: Daten → Analyse → Erkenntnis

Die Entwicklung von Analysewerkzeugen gilt dabei als Vorbereitung, nicht als Forschung selbst. Werkzeuge werden spezifiziert, gebaut, dann genutzt.

Promptotyping veraendert dieses Verhaeltnis: Im iterativen Dialog mit einem LLM entstehen Interface-Entscheidungen direkt aus der Auseinandersetzung mit den Daten. Die Grenze zwischen Tool-Bau und Datenexploration verschwimmt.

## Forschungsfrage

Welche impliziten Erkenntnisse entstehen, wenn Forschende ihre Analysewerkzeuge mit LLMs aus den Daten selbst ableiten?

Unterfragen:
- Welche Forschungsfragen werden durch Interface-Entscheidungen implizit beantwortet?
- Was dokumentiert ein generativ entstandenes Interface ueber seinen Gegenstand?
- Wie unterscheidet sich Interface-Genese von klassischer explorativer Datenanalyse?

## Fallstudie: CorrespExplorer

CorrespExplorer ist ein Visualisierungstool fuer Korrespondenz-Metadaten im CMIF-Format. Es wurde in 37 dokumentierten Entwicklungsphasen mit Claude (Opus 4.5) nach der Promptotyping-Methodik entwickelt.

Kerndaten:
- 11.576 Briefe (Hugo Schuchardt Archiv)
- 10 Visualisierungs-Views
- 32 User Stories (emergent, nicht vorab definiert)
- 26 JavaScript-Module
- Vollstaendig dokumentierter Entwicklungsprozess (JOURNAL.md)

Repository: https://github.com/chpollin/CorrespExplorer

## Beobachtungen

### Views als materialisierte Hypothesen

Die 10 Views sind keine neutralen Fenster auf die Daten. Jeder View impliziert eine Annahme darueber, was an Korrespondenz forschungsrelevant ist:

| View | Implizite Hypothese |
|------|---------------------|
| Chronik | Zeitlicher Verlauf und biografischer Kontext sind relevant |
| Netzwerk | Beziehungsstrukturen zwischen Korrespondenten sind analysierbar |
| Mentions Flow | Wer ueber wen schreibt, konstituiert ein sekundaeres Netzwerk |
| Karte | Raeumliche Verteilung hat Erklaerungskraft |
| Timeline | Korrespondenzfrequenz korreliert mit historischen Ereignissen |

Diese Hypothesen entstanden nicht aus einem Forschungsdesign, sondern aus dem iterativen Dialog mit den Daten.

### User Stories als emergente Requirements

Die 32 User Stories wurden nicht vorab definiert. Sie entstanden waehrend der Entwicklung als Antworten auf Fragen wie: "Was koennte man mit diesen Daten noch machen?"

Beispiel: US-30 (Altersanzeige in Chronik) entstand, weil die Daten Lebensdaten enthalten und die Frage aufkam, ob das Alter zum Briefzeitpunkt forschungsrelevant sein koennte.

### JOURNAL.md als Erkenntnisprotokoll

Das Entwicklungsjournal dokumentiert nicht nur technische Entscheidungen, sondern auch den Erkenntnisprozess:

- Phase 35: "Ein neuer View zur chronologischen Darstellung" - Die Entscheidung, Briefe vertikal statt horizontal anzuordnen, impliziert eine Lesart.
- Phase 36: "Biografischer Kontext und Beziehungsanalyse" - Die Integration von Lebensleisten zeigt, dass Alter als Kontextfaktor erkannt wurde.

## Theoretische Einordnung

Interface-Genese als Forschung laesst sich einordnen als:

1. Explorative Datenanalyse (Tukey): Aber mit dem Interface als Output statt Statistiken
2. Grounded Theory: Kategorien (Views) entstehen aus den Daten, nicht aus Vorannahmen
3. Design Research: Das Artefakt selbst ist Erkenntnistraeger
4. Hermeneutischer Zirkel: Jede Interface-Entscheidung veraendert das Verstaendnis der Daten

## Implikationen

Wenn Interface-Genese Forschung ist, dann:

1. Muss der Entwicklungsprozess dokumentiert werden (nicht nur das Ergebnis)
2. Sind Interface-Entscheidungen zitierbar und kritisierbar
3. Ist das Tool selbst ein Forschungsartefakt, nicht nur ein Hilfsmittel
4. Koennen verschiedene generierte Interfaces verschiedene Lesarten desselben Datensatzes repraesentieren

## Methodische Konsequenzen

Fuer die Digital Humanities bedeutet das:

- Dokumentationspflicht: JOURNAL.md als Teil der Forschungsoutputs
- Transparenz: Warum diese Views und nicht andere?
- Reproduzierbarkeit: Koennte ein anderer LLM-Dialog zu anderen Views fuehren?
- Kritik: Welche Perspektiven wurden durch die Interface-Entscheidungen ausgeschlossen?

## Ausblick

CorrespExplorer ist ein Einzelfall. Offene Fragen:

- Lassen sich die impliziten Erkenntnisse der Interface-Genese explizit machen?
- Wie verhaelt sich LLM-gestuetzte Interface-Genese zu menschlicher Intuition?
- Koennte man verschiedene LLMs denselben Datensatz "explorieren" lassen und die resultierenden Interfaces vergleichen?

---

Kontakt: Christopher Pollin, Digital Humanities Craft OG
https://dhcraft.org
