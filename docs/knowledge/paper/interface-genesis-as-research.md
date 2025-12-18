# Interface-Genese als Forschungsmethode

Promptotyping als epistemische Praxis in den Digital Humanities

---

## These

Promptotyping - das iterative Context-Engineering mit Frontier-LLMs - ist eine eigenstaendige Form der Datenexploration. Das entstehende Interface dokumentiert implizite Erkenntnisse ueber den Moeglichkeitsraum der Daten. Der Akt des Tool-Bauens wird zur Forschung.

## Hintergrund: Klassische Trennung von Tool und Forschung

Klassischer Forschungsprozess: Daten -> Analyse -> Erkenntnis

Die Entwicklung von Analysewerkzeugen gilt dabei als Vorbereitung, nicht als Forschung selbst. Werkzeuge werden spezifiziert, gebaut, dann genutzt. Die Grenze ist klar.

Promptotyping veraendert dieses Verhaeltnis grundlegend. Im iterativen Dialog mit einem LLM entstehen Interface-Entscheidungen direkt aus der Auseinandersetzung mit den Daten. Das LLM agiert als "epistemischer Partner" - nicht als Werkzeug, sondern als Gespraechspartner im Erkenntnisprozess.

## Theoretischer Rahmen: Promptotyping

Promptotyping ist iteratives Context-Engineering mit Frontier-LLMs. Es unterscheidet sich fundamental von klassischer Softwareentwicklung durch drei Kernprinzipien:

### Context Compression

Information wird maximiert bei minimiertem Token-Verbrauch. Dokumentation wird zur Single Source of Truth, Code zum regenerierbaren Artefakt. Dies fuehrt zum Konzept des "Disposable Code" - Code der jederzeit aus der Dokumentation neu generiert werden kann.

### Critical Expert in the Loop

Im Gegensatz zu "Human in the Loop" behaelt der Forschende die epistemische Autoritaet. Das LLM liefert Optionen und Implementierungen, aber Designentscheidungen entstehen aus fachlicher Reflexion. Der Forschende muss aktiv gegen Sycophancy (unkritische Zustimmung des LLMs) arbeiten.

### Disposable Code

Code ist Artefakt, nicht Source of Truth. Die Dokumentation (JOURNAL.md, architecture.md) enthaelt die eigentlichen Entscheidungen. Code kann jederzeit neu generiert werden, solange die Dokumentation korrekt ist.

## Das Vier-Phasen-Modell

Promptotyping folgt einem charakteristischen Muster:

### Phase 1: Preparation

Domainwissen verdichten, Kontext aufbauen. Im Fall von CorrespExplorer: CMIF-Standard verstehen, HSA-Datensatz analysieren, Forschungsfragen zur Korrespondenzforschung formulieren.

### Phase 2: Exploration und Mapping

Moeglichkeitsraeume erkunden, Optionen generieren. Hier entstehen die ersten Views als "materialisierte Hypothesen": Welche Visualisierungen sind sinnvoll? Welche Fragen lassen sich mit den Daten beantworten?

### Phase 3: Distillation

Erkenntnisse verdichten, Patterns extrahieren. User Stories emergieren aus dem Entwicklungsprozess. Das Interface kristallisiert sich heraus.

### Phase 4: Implementation

Finalisieren und stabilisieren. CSS-Architektur, Test-Coverage, Dokumentation. Der Code wird robust, aber bleibt regenerierbar.

## Fallstudie: CorrespExplorer

CorrespExplorer ist ein Visualisierungstool fuer Korrespondenz-Metadaten im CMIF-Format. Es wurde mit Claude (Opus 4.5) nach der Promptotyping-Methodik entwickelt.

Kerndaten:
- Hugo Schuchardt Archiv: 11.576 Briefe
- Zehn Visualisierungs-Views
- User Stories emergent entstanden, nicht vorab definiert
- Vollstaendig dokumentierter Entwicklungsprozess (JOURNAL.md)

Repository: https://github.com/chpollin/CorrespExplorer

### Phasen-Rekonstruktion aus JOURNAL.md

Das JOURNAL.md dokumentiert den Entwicklungsprozess in Phasen. Diese lassen sich dem Vier-Phasen-Modell zuordnen:

Preparation (Phasen 1-6):
- HSA-Implementation und Daten-Pipeline
- CMIF-Parser Entwicklung
- Grundlegende Visualisierungen

Exploration (Phasen 7-21):
- Neue Views entstehen: Topics, Network, Timeline, Mentions Flow
- User Stories emergieren: "Was koennte man mit diesen Daten noch machen?"
- Experimentelle Features: Wissenskorb, Demo-Tour

Distillation (Phasen 22-32):
- Mobile Responsiveness als Feedback-Integration
- Entity Component Refactoring als Pattern-Extraktion
- CSS-Architektur-Konsolidierung

Implementation (Phasen 33-37):
- teiHeader Metadaten vollstaendig integriert
- Chronik-View als finaler View
- Dokumentations-Konsolidierung

## Beobachtungen

### Views als materialisierte Hypothesen

Die zehn Views sind keine neutralen Fenster auf die Daten. Jeder View impliziert eine Annahme darueber, was an Korrespondenz forschungsrelevant ist:

| View | Implizite Hypothese |
|------|---------------------|
| Chronik | Zeitlicher Verlauf und biografischer Kontext sind relevant |
| Netzwerk | Beziehungsstrukturen zwischen Korrespondenten sind analysierbar |
| Mentions Flow | Wer ueber wen schreibt, konstituiert ein sekundaeres Netzwerk |
| Karte | Raeumliche Verteilung hat Erklaerungskraft |
| Timeline | Korrespondenzfrequenz korreliert mit historischen Ereignissen |

Diese Hypothesen entstanden nicht aus einem Forschungsdesign, sondern aus dem iterativen Dialog mit den Daten - in der Exploration-Phase des Promptotyping.

### User Stories als emergente Requirements

Die User Stories wurden nicht vorab definiert. Sie entstanden waehrend der Entwicklung als Antworten auf Fragen wie: "Was koennte man mit diesen Daten noch machen?"

Beispiel: US-30 (Altersanzeige in Chronik) entstand, weil die Daten Lebensdaten enthalten und im Dialog die Frage aufkam, ob das Alter zum Briefzeitpunkt forschungsrelevant sein koennte. Das LLM schlug die Visualisierung vor, der Forschende evaluierte die Relevanz.

### Risiken und Gegenstrategien

Promptotyping birgt spezifische Risiken:

Sycophancy: Das LLM stimmt unkritisch zu. Gegenstrategie: Explizite Aufforderung zu Kritik, alternatives Prompting.

Context Rot: Akkumulierte Fehlentscheidungen im langen Kontext. Gegenstrategie: Regelmaessige Context-Bereinigung, JOURNAL.md als externes Gedaechtnis.

Vibe Research: Intuition statt Methodik, "feels right" als Entscheidungsgrundlage. Gegenstrategie: Dokumentation aller Entscheidungen mit Begruendung.

Im CorrespExplorer-Projekt wurde Context Rot durch die Dokumentationsstruktur (CONTEXT-MAP.md in jedem Verzeichnis) aktiv bekaempft.

## Theoretische Einordnung

Interface-Genese als Forschung laesst sich einordnen als:

1. Explorative Datenanalyse (Tukey): Aber mit dem Interface als Output statt Statistiken
2. Grounded Theory: Kategorien (Views) entstehen aus den Daten, nicht aus Vorannahmen
3. Design Research: Das Artefakt selbst ist Erkenntnistraeger
4. Hermeneutischer Zirkel: Jede Interface-Entscheidung veraendert das Verstaendnis der Daten

Das LLM fungiert dabei als "epistemischer Partner" - es bringt Optionen ein, der Forschende trifft Entscheidungen. Die Asymmetrie bleibt erhalten: Der Mensch hat die fachliche Autoritaet, das LLM die Implementierungskapazitaet.

## Implikationen fuer die Digital Humanities

Wenn Interface-Genese Forschung ist, dann:

1. Muss der Entwicklungsprozess dokumentiert werden (nicht nur das Ergebnis). JOURNAL.md wird zum Forschungsoutput.

2. Sind Interface-Entscheidungen zitierbar und kritisierbar. "Warum diese Views und nicht andere?" wird zur legitimen Frage.

3. Ist das Tool selbst ein Forschungsartefakt, nicht nur ein Hilfsmittel. Das Interface dokumentiert implizite Erkenntnisse.

4. Koennen verschiedene generierte Interfaces verschiedene Lesarten desselben Datensatzes repraesentieren. Reproduzierbarkeit bedeutet dann nicht identische Ergebnisse, sondern nachvollziehbare Prozesse.

## Methodische Konsequenzen

Fuer die Digital Humanities bedeutet das:

Dokumentationspflicht: JOURNAL.md als Teil der Forschungsoutputs. Der Prompt-Dialog gehoert zum Forschungsprozess.

Transparenz: Welche Entscheidungen hat das LLM vorgeschlagen? Welche hat der Forschende verworfen? Welche Alternativen wurden nicht verfolgt?

Kritische Reflexion: Wo hat Sycophancy die Entwicklung beeinflusst? Wo hat Context Rot zu suboptimalen Entscheidungen gefuehrt?

Reproduzierbarkeit: Koennte ein anderer LLM-Dialog zu anderen Views fuehren? Ja - und das ist methodisch relevant.

## Ausblick

CorrespExplorer ist ein Einzelfall. Offene Fragen:

- Lassen sich die impliziten Erkenntnisse der Interface-Genese explizit machen?
- Wie verhaelt sich LLM-gestuetzte Interface-Genese zu menschlicher Intuition im Design-Prozess?
- Koennte man verschiedene LLMs denselben Datensatz "explorieren" lassen und die resultierenden Interfaces vergleichen?
- Welche Qualitaetskriterien gelten fuer "gutes" Promptotyping in der Forschung?

Die These bleibt: Das Interface ist nicht neutral. Es dokumentiert Entscheidungen, die aus der Auseinandersetzung mit den Daten entstanden sind. Promptotyping macht diesen Prozess explizit - und damit kritisierbar.

---

Kontakt: Christopher Pollin, Digital Humanities Craft OG
https://dhcraft.org
