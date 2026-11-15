---
title: Netzwerkfiguren für Briefdaten
project:
  name: CorrespExplorer
  repository: https://github.com/DigitalHumanitiesCraft/CorrespExplorer
method:
  name: Promptotyping
  url: https://dhcraft.org/Promptotyping/
status: draft
language: de
created: 2026-11-14
updated: 2026-11-15
authors: [Christopher Pollin]
related: [data, design, plan, specification]
---

# Netzwerkfiguren für Briefdaten

Dieses Dokument hält fest, was sich bei Briefdaten als Netz in Beziehung setzen lässt, welche Daten jede Art braucht und was daraus für das Werkzeug folgt. Es ist der Bericht eines Recherche-Agenten vom 2026-11-14, im Auftrag des Operators, der die Form des Korrespondenzkreises bezweifelte ([design.md](design.md)). Der Agent hat die unten genannten Quellen nach eigener Angabe im Volltext gelesen. Die bauende Session hat die Zuschreibungen nicht an den Quellen nachgeprüft, die Empfehlungen sind Vorschläge eines Agenten und vom Operator nicht entschieden.

## Befund

Briefmetadaten belegen eine Beziehung sicher, den Brief von A an B mit Datum, Richtung und Zahl. Zu einem Netz wird sie erst, wenn es Kanten zwischen den Korrespondenten der zentralen Person gibt. Ein Bestand um eine Person ist ein Ego-Netz, in dem diese Kanten fehlen, und daraus lassen sich nur Grad und Briefzahl je Kante ablesen, wofür es keine Netzanalyse braucht (Ahnert & Ahnert, 2019). Mehrere solche Bestände zusammen ergeben Struktur dort, wo sich ihre Korrespondenten überschneiden (Ryan et al., 2020). Erwähnungen ergeben eine zweite, gerichtete Beziehung: Schreibende nennen Dritte. Netze aus gemeinsamer Nennung im selben Brief bleiben untypisiert, Freund und Feind sehen darin gleich aus, und auch statistisch bereinigt trafen sie bei der Prüfung durch Fachleute nur teilweise zu (Warren et al., 2016).

Als Übertragung des Agenten auf das Werkzeug: In einem Netz sollten nur belegte Handlungen in Beziehung stehen, also der Brief zwischen zwei Personen, die Nennung einer dritten Person durch eine bestimmte Stimme und bei mehreren Beständen die gemeinsamen Korrespondenten. Gemeinsame Nennung, gemeinsame aktive Jahre und gemeinsame Themen zeigen Nähe in der Überlieferung und sollten nicht als Netz von Personen erscheinen.

## Arten von Beziehungen

| Beziehung | Was die Kante bedeutet | Was sie braucht und wo sie kippt |
|---|---|---|
| Briefwechsel, gerichtet, gewichtet, datiert | A schrieb an B, n Briefe, in einem Zeitraum | Identifizierte Beteiligte, Datum, Richtung, Normdaten über Bestände. Zentralität spiegelt die Sammlungspraxis, fehlende Daten sind systematisch (Weingart, 2011; Ryan et al., 2020) |
| Ego-Netz einer Person | Ego und Korrespondent, dazu Kanten zwischen Korrespondenten, wo überliefert | Ohne Kanten zwischen den Korrespondenten bleiben Zählungen. Geschichtete Knoten-Kanten-Figuren schnitten in einem Versuch besser ab als Matrizen (Ehlers et al., 2024) |
| Vereinigung mehrerer Ego-Bestände | wie Briefwechsel, neu sind die gemeinsamen Korrespondenten | Abgeglichene Identitäten und Erkennung doppelt verzeichneter Briefe. Schwache Normdatenabdeckung verdeckt Überschneidungen, Abgleich über Namen erfindet sie (Ryan et al., 2020) |
| Schreibende nennen Dritte | Briefschreiber A nennt X | Erwähnung je Brief mit Identität und der Angabe, ob Brieftext oder Kommentar nennt. CMIF enthält diese Unterscheidung nicht |
| Gemeinsame Nennung im selben Brief | X und Y kommen im selben Brief vor | Wirft Absender, Empfänger und Rolle weg, die eine Nennung im Brief hat (Warren et al., 2016, als Grenze des eigenen Ansatzes) |
| Zwei-Modus-Netze und Projektionen | Person und Brief, Ort oder Thema | Zentralität misst dort etwas anderes. Projektionen zeigen Gleichzeitigkeit, keine Beziehung zwischen Personen (Weingart, 2011; van Vugt, 2017) |
| Typisierte Aussagen | Sprecher über dritte Person, mit Rolle, Stimme, Prüfstand und Stelle | Eine Visualisierung genau dieser Struktur fand der Agent in keiner gelesenen Quelle |
| Zeit | Reihenfolge der Kanten | Netzmaße setzen meist statische Netze voraus. Eine Linie je Person über der Zeitachse, das Ego gerade, die Richtung über und unter der Linie (Kuo et al., 2024) |
| Geographie | Absende- und Empfangsort, erwähnte Orte, Wege | Linien zwischen Orten brauchen einen Empfangsort, den kein geprüfter Bestand enthält |

## Was daraus für die drei Datenlagen folgt (Vorschlag, Agent, 2026-11-14)

Hugo Schuchardt Archiv, ein Ego ohne Kanten zwischen Korrespondenten, reich an Erwähnungen:

- Eine Zeitfigur der Beziehungen statt des Kreises: eine Zeile je Korrespondent, die Zeit waagrecht, ein Zeichen je Brief, Briefe an die zentrale Person über der Grundlinie und Briefe von ihr darunter. Briefzahl, Beginn, Dauer, Lücken und Richtung gehen damit von Winkel und Abstand auf Position über.
- Das Erwähnungsnetz als gerichtete Figur in zwei Ebenen: Korrespondenten führen zu den von ihnen genannten Personen. Solange Brieftext und Kommentar nicht getrennt sind, sagt die Figur, dass die Edition die Verknüpfung setzt.
- Nicht ablesbar sind Zentralität, Brücken und Gruppen unter den Korrespondenten. Dass die zentrale Person zentral ist, folgt aus dem Zuschnitt des Bestands.

Stefan Zweig Digital, ein Ego mit einigen Briefen zwischen anderen:

- Dieselbe Zeitfigur.
- Die wenigen Kanten zwischen Korrespondenten als kleine geschichtete Figur. Zu prüfen ist, ob sie Briefe zwischen Dritten zeigen, die nur über diesen Nachlass überliefert sind.

Fünf Grazer Editionen zusammen:

- Eine Figur der gemeinsamen Korrespondenten: die zentralen Personen als feste Knoten, dazwischen nur, wer mit mindestens zweien korrespondiert, dazu die direkten Briefe zwischen ihnen und die doppelt verzeichneten.
- Die Zeitfigur je zentraler Person als kleine Vielfache, damit sichtbar wird, ob sich die Bestände zeitlich berühren.
- Ein Gesamtnetz wäre vermutlich ein Bild weitgehend getrennter Sterne.

Zum gebauten Korrespondenzkreis: Er kodiert sachlich richtig, was ein Bestand um eine Person hergibt, Briefzahl und Beginn je Korrespondent, setzt es aber in eine Form, die Netzstruktur verspricht. Im Modus „Gesamt“ sind „Zeitgenossen“ und „Themen-Netzwerk“ Projektionen und keine belegten Beziehungen.

Was die Aussagen des gemeinsamen Briefmodells hinzufügen: eine dreistellige, typisierte und belegte Beziehung, wer spricht, über wen, gegenüber wem und in welcher Rolle. Im Werkzeug könnten sie zuerst als gefilterte Arten von Kanten im Erwähnungsnetz erscheinen. Ein Netz der Dritten über Briefe hinweg setzt voraus, dass die Identität einer Person über Briefe modelliert ist.

## Was der Operator entscheidet

- Ob das Netz nur belegte Handlungen zeigt und „Zeitgenossen“ und das Themen-Netzwerk entfallen oder umgebaut werden.
- Ob eine Nennung, die nur der Kommentar der Edition identifiziert, als Nennung der Schreibenden erscheinen darf.
- Ob die Zeitfigur den Korrespondenzkreis ersetzt oder neben ihm steht.
- Ob ein Empfangsort erschlossen werden darf, etwa der Wohnort der zentralen Person.
- Ob die Vereinigung der fünf Editionen ein eigener Forschungsbestand mit Konkordanz der Personen wird.

## Quellen

Vom Recherche-Agenten nach eigener Angabe im Volltext gelesen, Zugriff 2026-11-14, soweit nicht anders vermerkt.

- Ahnert, R., & Ahnert, S. E. (2019). Networking the Republic of Letters. In H. Hotson & T. Wallnig (Hrsg.), *Reassembling the Republic of Letters in the Digital Age*, 399–416. https://doi.org/10.17875/gup2019-1146
- Ehlers, H., Pahr, D., Filipov, V., Wu, H.-Y., & Raidou, R. G. (2024). Me! Me! Me! Me! A study and comparison of ego network representations. *Computers & Graphics*, 125, 104123. https://doi.org/10.1016/j.cag.2024.104123. Ohne die Abschnitte zu Hypothesen und Auswertungsmethodik gelesen.
- Kuo, Y.-H., Liu, D., & Ma, K.-L. (2024). SpreadLine: Visualizing Egocentric Dynamic Influence. https://arxiv.org/html/2408.08992v3
- Ryan, Y., Ahnert, S., & Ahnert, R. (2020). Networking Archives: Quantitative History and the Contingent Archive. CEUR-WS 2723, 385–396. https://ceur-ws.org/Vol-2723/short21.pdf
- van Vugt, I. (2017). Using Multi-Layered Networks to Disclose Books in the Republic of Letters. *Journal of Historical Network Research*, 1, 25–51. https://doi.org/10.25517/jhnr.v1i1.7
- Warren, C. N., Shore, D., Otis, J., Wang, L., Finegold, M., & Shalizi, C. (2016). Six Degrees of Francis Bacon. *Digital Humanities Quarterly*, 10(3). https://www.digitalhumanities.org/dhq/vol/10/3/000244/000244.html. Haupttext gelesen, der technische Anhang nicht.
- Weingart, S. B. (2011). Demystifying Networks, Parts I & II. *Journal of Digital Humanities*, 1(1). https://journalofdigitalhumanities.org/1-1/demystifying-networks-by-scott-weingart/

Nicht geöffnet und deshalb nicht zitiert, nach Angabe des Agenten: weitere Arbeiten zu den Tudor-Netzwerken und zu Mapping the Republic of Letters, das Kapitel zum ePistolarium, eine Übersicht zu dynamischen Graphen. Die Oberflächen von correspSearch, Kalliope und Early Modern Letters Online sind nicht geprüft. Die Lesart der Grazer Daten stammt aus den Dokumenten des Projekts GOSSIP und ist nicht an den Dateien nachgezählt.
