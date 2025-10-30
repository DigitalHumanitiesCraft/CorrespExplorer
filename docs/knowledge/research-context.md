# Wissenschaftlicher Kontext

DH-Standards, Gender Studies-Perspektive und Forschungsfragen.

Stand: 2025-10-19

Siehe [INDEX.md](INDEX.md) für Navigation im Knowledge Vault.

## PROPYLÄEN-Projekt

Langzeitedition der Briefe an Goethe (bis 2039)

- 20.000+ Briefe von 3.800 Personen/Körperschaften
- Chronologische Darstellung, Erschließung von Zusammenhängen
- über 90% der Briefe im Goethe- und Schiller-Archiv
- Bisher nur 8.000 Briefe in über 600 Ausgaben gedruckt

Bearbeitungsstand:
- 1762-Aug 1786: Vollständig online (Regesten, Transkriptionen, Digitalisate)
- Sept 1786-1797: XML/TEI-Dateien verfügbar (10,8 MB ZIP)
- Sept 1786-1824: Metadaten online (Absender, Orte, Datierungen)
- Bis 1822: Regesten und durchsuchbare Brieftexte
- TEI-Volltext: 15,7% via API verfügbar

Letzter Druckband:
- Band 10: 1823-1824 (2023, J.B. Metzler Weimar)
- Bearb.: Hain, Bischof, Häfner, Koltes, Schäfer

Platform: https://goethe-biographica.de

Details siehe [project.md](project.md#propyläen-kontext).

## Digitale Geisteswissenschaften (DH)

### Standards

TEI (Text Encoding Initiative):
- Standard für digitale Editionen
- Schema: https://raw.githubusercontent.com/TEI-Correspondence-SIG/CMIF/master/schema/cmi-customization.rng
- Namespace: http://www.tei-c.org/ns/1.0

CMIF (Correspondence Metadata Interchange Format):
- Austausch von Briefmetadaten
- 15.312 Briefe im ra-cmif.xml
- Zenodo 14998880 (CC BY 4.0)

Linked Open Data (LOD):
- GND: Personenidentifikation (93,8% Absender, 82,5% erwähnte Personen)
- GeoNames: Geografische Verortung (91,6% Orte)
- SNDB: Lokale Normdaten (URL: https://ores.klassik-stiftung.de/ords/f?p=900:2:::::P2_ID:[ID])

AGRELON:
- Agent Relationship Ontology
- 44 Beziehungstypen in nsl_agrelon.xml
- Kategorien: Verwandtschaft, Vitaler/letaler Kontakt, Gruppenbeteiligung

Details siehe [data.md](data.md#agrelon-ontologie).

### Nutzungsrechte

- Webseitentexte: CC BY-NC 4.0
- XML/TEI-Daten: CC BY 4.0
- Digitalisate: Nach Bedingungen der bestandshaltenden Einrichtung
- CMIF: Zenodo 14998880 (CC BY 4.0)

## Gender Studies-Perspektive

### Zielsetzung

Sichtbarmachung marginalisierter Akteurinnen:
- 3.617 Frauen in SNDB (15,3% von 23.571 Personen)
- 808 Frauen mit Briefverbindung (22,3%)
- 192 Briefabsenderinnen (vs 2.333 männliche Absender)

Geschlechterverhältnisse um 1800:
- Analyse von Kommunikationsmustern
- Soziale Rollen und Handlungsräume
- Thematische Schwerpunkte in Frauenbriefen

Rekonstruktion weiblicher Netzwerke:
- AGRELON-Beziehungsdaten
- Geografische Verortung (1.042 Frauen mit Geodaten)
- Temporale Muster (Korrespondenzverläufe)

Details siehe [requirements.md](requirements.md) für User Stories.

## Forschungsfragen

### Primär

1. Welche Frauen korrespondierten mit Goethe?
2. Welche Frauen werden in Briefen erwähnt?
3. Wie sind diese Frauen untereinander vernetzt?

### Sekundär

4. Geografische Verteilung weiblicher Korrespondenz
5. Temporale Muster (Höhepunkte, Entwicklungen)
6. Thematische Schwerpunkte in Frauenbriefen
7. Soziale Rollen und Berufsfelder

Methodische Umsetzung siehe [design.md](design.md).

## Methodische Ansätze

### Datenextraktion

- XML-Parsing (Python xml.etree.ElementTree)
- Pattern-Matching (SEXUS=w in pers_koerp_indiv.xml)
- ID-Verknüpfung (GND primär, Name sekundär)

Pipeline siehe [data.md](data.md#datenfluss-frauenidentifikation).

### Visualisierung

- Geografisch: MapLibre GL JS (WebGL-Rendering)
- Netzwerk: D3.js (geplant Phase 2)
- Temporal: Timeline (geplant Phase 2)
- Narrativ: Biografische Texte aus projekt_*.xml

Implementierung siehe [project.md](project.md#implementierungsstatus).

## Quellenkritik und Limitationen

Zahlen siehe [data.md](data.md#kern-statistiken) und [../data/analysis-report.md](../data/analysis-report.md).

### Datenqualität

Stärken:
- Hohe Normdaten-Abdeckung (>90% bei Absendern)
- 87,6% exakte Datierungen
- Strukturelle Stabilität (SNDB)

Limitationen:
- Work in Progress (kontinuierliche Änderungen)
- TEI-Volltext nur 15,7% verfügbar
- SNDB ~2 Jahre alt (Oktober 2025)

### Strukturelle Verzerrungen

Geografisch:
- Weimar: 34,2% (5.236 Briefe)
- Jena: 15,3% (2.338 Briefe)
- Berlin: 6,7% (1.019 Briefe)
- Zentraldeutschland-Fokus

Sprachlich:
- Deutsch: 96,9% (14.835 Briefe)
- Französisch: 2,7% (408 Briefe)
- Andere: <0,5%

Sozial:
- Bildungsbürgerliches Milieu
- Gender-Bias historischer Quellen (Überlieferung)
- Namenskonventionen (deutsche historische Schreibweisen, Titel ohne Normalisierung)

Temporal:
- 47% aller Briefe aus 1810-1824
- Spätphase überrepräsentiert
- Vor 1790: nur 2,7% (421 Briefe)
- Peak: 1817 (730 Briefe)

### Konsequenzen für Interpretation

- Ergebnisse nicht generalisierbar auf gesamtes 18./19. Jahrhundert
- Regionale und soziale Perspektive spezifisch
- Quantitative Aussagen im historischen Kontext zu interpretieren
- Manuelle Deduplizierung bei Namensanalysen erforderlich

## Thematische Vielfalt

Briefe spiegeln primär Lebenswelt der Schreibenden:

Inhalte:
- Literarisch, naturwissenschaftlich, philosophisch
- Politisch, historisch, ästhetisch
- Alltagsprobleme

Wichtige Korrespondenten:
- Friedrich Schiller, Alexander/Wilhelm von Humboldt
- Karl Friedrich Zelter, Charlotte von Stein
- Karl Friedrich Reinhard, Marianne von Eybenberg

## Verweise

- [project.md](project.md) - Projektübersicht
- [data.md](data.md) - Datenmodell und Statistiken
- [design.md](design.md) - Visualisierungsstrategie
- [requirements.md](requirements.md) - Forschungsfragen als User Stories
- [../data/analysis-report.md](../data/analysis-report.md) - Vollständige CMIF-Analyse
- PROPYLÄEN: https://goethe-biographica.de
- Zenodo: https://zenodo.org/records/14998880
