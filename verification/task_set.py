# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""The fixed task set of CorrespExplorer, its answers computed from the bundled data.

Every story of knowledge/specification.md has a task at the bundled Hugo Schuchardt Archive with a
counting rule; knowledge/testing.md (section "Feste Aufgaben") keeps the dated answers. This script
computes each answer from docs/data/hsa-letters.json (and docs/data/hsa.xml for US-01 and US-02)
without loading code of the tool: the rules below restate personKey, placeKey, the placeholder
places and the valid year of the specification in Python. Each task names the view and the URL
where a reader finds the answer.

Usage, from the repository root:

    uv run verification/task_set.py              # list of tasks with computed answers
    uv run verification/task_set.py --json       # the same as JSON
    uv run verification/task_set.py --browser    # also read each answer in the rendered view

--browser opens every task with a probe in headless Chrome through Playwright against a running
server on docs/ (default http://localhost:8137/) and reports per task whether the view shows the
computed answer: yes, no, or manual where no robust selector exists. A "no" is a finding to be
assigned to a story, the design or the data, not a failure of this script; the exit code is 1 only
when the script itself cannot run a probe. The mode is deliberately not part of the smoke test.

The twelve tasks of the operation test of the space-time view (2026-11-14) are not recorded in the
repository (testing.md, "Bedienprüfung der Raum-Zeit-Ansicht"). Their subjects are reconstructed from
the scripts of the testing session; they test operation, not figures, and stay manual. Where a task
names places, a reference figure is computed.

Design decisions: single-file script with inline dependencies (house style, script regime, like
tests/browser/smoke.py); Playwright is imported only in the browser mode. Probes compare tokens of
the computed answer with the text a view renders, after removing German thousands separators, so a
changed wording around a number does not break them.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
from collections import Counter
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data" / "hsa-letters.json"
XML = ROOT / "docs" / "data" / "hsa.xml"
BASE = "http://localhost:8137/"
JSON_PARAM = "data/hsa-letters.json"

SCHUCHARDT = "261931943"
SPITZER = "71397982"
LACOMBE = "34446283"
GRAZ = "2778067"
PARIS = "2988507"
LEIPZIG = "2879139"
PUBLIKATIONSVERSAND = "https://gams.uni-graz.at/o:hsa.subjects#S.948"
LANGUAGE_CATEGORIES = frozenset({"lexvo", "hsa_language"})
UNKNOWN_PLACE = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (r"^Unbekannt$", r"^Unknown$", r"^ohne Ort$", r"^\[?\?\]?$")
)


# Counting rules of the specification, section "Epics und User Stories"


def person_key(person: dict | None) -> str | None:
    if not person:
        return None
    return person.get("id") or person.get("localRef") or person.get("name") or None


def place_key(place: dict | None) -> str | None:
    if not place:
        return None
    return place.get("geonames_id") or place.get("name") or None


def known_place(place: dict | None) -> bool:
    if not place:
        return False
    if place.get("geonames_id"):
        return True
    name = (place.get("name") or "").strip()
    return bool(name) and not any(p.match(name) for p in UNKNOWN_PLACE)


def recipients(letter: dict) -> list[dict]:
    return letter.get("recipients") or (
        [letter["recipient"]] if letter.get("recipient") else []
    )


def parties(letter: dict) -> set[str]:
    keys = {person_key(letter.get("sender"))} | {
        person_key(r) for r in recipients(letter)
    }
    keys.discard(None)
    return keys


def valid_year(letter: dict) -> int | None:
    """The year on the axis: between 1400 and 2100 and not a span over several years."""
    year = letter.get("year")
    if not isinstance(year, int) or not 1400 <= year <= 2100:
        return None
    if (
        letter.get("datePrecision") == "range"
        and letter.get("dateTo")
        and int(str(letter["dateTo"])[:4]) > year
    ):
        return None
    return year


def subject_key(subject: dict) -> str | None:
    return subject.get("uri") or subject.get("id") or subject.get("label")


def language(letter: dict) -> str | None:
    return (letter.get("language") or {}).get("code")


def undated(letter: dict) -> bool:
    return not letter.get("date") and not letter.get("dateText")


def ego_partners(letters: list[dict], centre: str) -> Counter[str]:
    """Letters per counterpart of a centre: the sender, or with the centre as sender every other recipient."""
    partners: Counter[str] = Counter()
    for letter in letters:
        if centre not in parties(letter):
            continue
        sender = person_key(letter.get("sender"))
        if sender == centre:
            others = {
                k
                for k in (person_key(r) for r in recipients(letter))
                if k and k != centre
            }
        else:
            others = {sender} if sender else set()
        partners.update(others)
    return partners


def counterparts(letters: list[dict], key: str) -> set[str]:
    return {
        k for letter in letters if key in parties(letter) for k in parties(letter)
    } - {key}


def peak(counts: Counter[int]) -> tuple[int, int]:
    """Year with the most letters; a tie goes to the earlier year."""
    return max(counts.items(), key=lambda kv: (kv[1], -kv[0]))


def num(n: int) -> str:
    return f"{n:,}".replace(",", ".")


# Tasks


@dataclass(frozen=True)
class Probe:
    """How the browser mode reads an answer: a function of the page and the tokens it must contain."""

    read: Callable[..., str]
    tokens: tuple[str, ...]


@dataclass
class Task:
    id: str
    question: str
    answer: str
    view: str | None = None
    params: dict[str, str] = field(default_factory=dict)
    probe: Probe | None = None
    manual: str = ""
    page: str = "explore.html"

    def url(self, base: str = BASE) -> str | None:
        if self.page != "explore.html":
            return base + self.page
        if not self.view:
            return None
        query = {"json": JSON_PARAM, "view": self.view, "tour": "0", **self.params}
        return base + "explore.html?" + urlencode(query, safe="/:,")

    def to_dict(self, base: str) -> dict:
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "view": self.view,
            "url": self.url(base),
            "check": "browser" if self.probe else "manual",
            "manual": self.manual,
        }


# Probes. Each reads text the view renders; the comparison happens in _compare


def _drawer(page) -> str:
    return page.inner_text("#letters-drawer-count")


def _table_rows(page, host: str) -> list[list[str]]:
    # renderDataTable writes every row into the DOM, the switch only hides the body
    return page.evaluate(
        "host => [...document.querySelectorAll(`#${host} tbody tr`)]"
        ".map(tr => [...tr.children].map(c => c.textContent.trim()))",
        host,
    )


def _as_int(text: str) -> int:
    digits = re.sub(r"\D", "", text)
    return int(digits) if digits else -1


def _max_row(
    host: str, column: int, keep: Callable[[list[str]], bool] = lambda row: True
) -> Callable:
    def read(page) -> str:
        rows = [r for r in _table_rows(page, host) if len(r) > column and keep(r)]
        if not rows:
            return "keine Zeile"
        best = max(rows, key=lambda r: _as_int(r[column]))
        return " | ".join(best)

    return read


def _row_containing(host: str, needle: str) -> Callable:
    def read(page) -> str:
        rows = [r for r in _table_rows(page, host) if any(needle in c for c in r)]
        return " | ".join(rows[0]) if rows else f"keine Zeile mit {needle}"

    return read


def _place_senders(page) -> str:
    page.click(f'.entity-card[data-place-id="{GRAZ}"]')
    page.wait_for_selector("#place-top-senders .entity-stat-row")
    rows = page.locator("#place-top-senders .entity-stat-row").all_inner_texts()
    return next((r for r in rows if "Schuchardt" in r), " / ".join(rows)).replace(
        "\n", " "
    )


def _first_entity(selector: str, index: int = 0) -> Callable:
    return lambda page: (
        page.locator(selector).nth(index).inner_text().replace("\n", " ")
    )


def _year_choice_max(page) -> str:
    options = page.locator("#spacetime-year option").all_inner_texts()
    counted = [o for o in options if ":" in o]
    return (
        max(counted, key=lambda o: _as_int(o.split(":", 1)[1]))
        if counted
        else "keine Jahresauswahl"
    )


def _spacetime_place(name: str) -> Callable:
    def read(page) -> str:
        rows = page.locator("#spacetime-places .st-place").all_inner_texts()
        return next(
            (r.replace("\n", " ") for r in rows if r.startswith(name)),
            f"{name} fehlt in der Liste",
        )

    return read


def _topics_rows(page) -> list[list[str]]:
    page.click("#topics-table .chart-table__switch")
    page.wait_for_timeout(300)
    return _table_rows(page, "topics-table")


def _topics_top(page) -> str:
    rows = [r for r in _topics_rows(page) if len(r) > 2 and r[1] != "Sprache"]
    best = max(rows, key=lambda r: _as_int(r[2]))
    return " | ".join(best)


def _topics_peak(page) -> str:
    row = next(
        (r for r in _topics_rows(page) if r and r[0] == "Publikationsversand"), None
    )
    return f"Meiste Briefe {row[4]}" if row else "keine Zeile Publikationsversand"


def _topics_person(page) -> str:
    mark = page.locator("#topics-choice [data-person]").first
    return mark.get_attribute("title") or mark.inner_text()


def _oldest_letter(page) -> str:
    page.select_option("#letter-sort", "date-asc")
    page.wait_for_timeout(500)
    card = page.locator("#letters-list .letter-card").first
    return f"{card.get_attribute('data-id')} {card.inner_text()}".replace("\n", " ")


def _busiest_day(page) -> str:
    days = Counter(r[0] for r in _table_rows(page, "tv-table") if r)
    if not days:
        return "keine Zeile"
    day, n = days.most_common(1)[0]
    return f"{day}: {n}"


def _export(page, fmt: str) -> bytes:
    page.click("#export-btn")
    with page.expect_download() as info:
        page.click(f'#export-modal .export-option[data-format="{fmt}"]')
    return Path(info.value.path()).read_bytes()


def _csv_rows(page) -> str:
    text = _export(page, "csv").decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text)))
    return f"{len(rows) - 1} Zeilen"


def _json_persons(page) -> str:
    export = json.loads(_export(page, "json").decode("utf-8"))
    return f"{len(export['indices']['persons'])} Personen im Index"


def _postmark_figures(page) -> str:
    return f"{page.locator('.stmt--postmark').count()} Figuren zu Poststempeln"


def _text_contains(needle: str) -> Callable:
    def read(page) -> str:
        found = page.evaluate("n => document.body.textContent.includes(n)", needle)
        return f"{needle} im Text" if found else f"{needle} nicht im Text"

    return read


def build_tasks(data: dict, xml_text: str | None) -> list[Task]:
    letters = data["letters"]
    total = len(letters)
    names: dict[str, str] = {}
    persons: Counter[str] = Counter()
    for letter in letters:
        persons.update(parties(letter))
        for p in [letter.get("sender"), *recipients(letter)]:
            if person_key(p):
                names[person_key(p)] = p.get("name") or person_key(p)
    with_id = {
        person_key(p)
        for letter in letters
        for p in [letter.get("sender"), *recipients(letter)]
        if p and p.get("id")
    }

    places = Counter(
        place_key(lt["place_sent"])
        for lt in letters
        if known_place(lt.get("place_sent"))
    )
    place_names = {
        place_key(lt["place_sent"]): lt["place_sent"].get("name")
        for lt in letters
        if lt.get("place_sent")
    }
    top_place, top_place_n = places.most_common(1)[0]
    no_coords = {
        lt["place_sent"]["geonames_id"]
        for lt in letters
        if (lt.get("place_sent") or {}).get("geonames_id")
        and lt["place_sent"].get("lat") is None
    }
    years = Counter(y for y in map(valid_year, letters) if y is not None)
    busiest_year, busiest_year_n = peak(years)
    n_undated = sum(1 for lt in letters if undated(lt))

    def count(test: Callable[[dict], bool]) -> int:
        return sum(1 for lt in letters if test(lt))

    def year_between(lo: int, hi: int) -> Callable[[dict], bool]:
        return lambda lt: (y := valid_year(lt)) is not None and lo <= y <= hi

    dated = sorted(
        (lt for lt in letters if lt.get("date")), key=lambda lt: (lt["date"], lt["id"])
    )
    first = dated[0]
    first_ties = sum(1 for lt in dated if lt["date"] == first["date"])

    days = Counter(lt["date"] for lt in letters if lt.get("datePrecision") == "day")
    busiest_day, busiest_day_n = min(days.items(), key=lambda kv: (-kv[1], kv[0]))

    centre_partners = ego_partners(letters, SCHUCHARDT)
    nearest, nearest_n = min(
        centre_partners.items(), key=lambda kv: (-kv[1], names.get(kv[0], ""))
    )

    subject_counts: Counter[str] = Counter()
    subject_labels: dict[str, str] = {}
    for letter in letters:
        keys = set()
        for s in letter["mentions"]["subjects"]:
            if s.get("category") in LANGUAGE_CATEGORIES:
                continue
            keys.add(subject_key(s))
            subject_labels[subject_key(s)] = s.get("label") or subject_key(s)
        subject_counts.update(keys)
    top_subject, top_subject_n = subject_counts.most_common(1)[0]
    pv = [
        lt
        for lt in letters
        if any(
            subject_key(s) == PUBLIKATIONSVERSAND for s in lt["mentions"]["subjects"]
        )
    ]
    pv_persons = Counter(k for lt in pv for k in parties(lt) if k != SCHUCHARDT)
    pv_person, pv_person_n = pv_persons.most_common(1)[0]
    pv_year, pv_year_n = peak(Counter(y for y in map(valid_year, pv) if y is not None))

    spitzer = [lt for lt in letters if SPITZER in parties(lt)]
    between = sorted(
        (lt for lt in spitzer if SCHUCHARDT in parties(lt)),
        key=lambda lt: (lt.get("date") or "9999", lt["id"]),
    )
    paris = [lt for lt in letters if place_key(lt.get("place_sent")) == PARIS]
    paris_year, paris_year_n = peak(
        Counter(y for y in map(valid_year, paris) if y is not None)
    )
    l654 = next(lt for lt in letters if lt["id"] == "o:hsa.letter.654")
    spitzer_ids = sorted(
        {
            lt["sender"]["id"]
            for lt in spitzer
            if person_key(lt.get("sender")) == SPITZER
            and lt["sender"].get("authority") == "viaf"
        }
    )
    shared = sorted(
        names.get(k, k)
        for k in counterparts(letters, SPITZER) & counterparts(letters, LACOMBE)
    )
    second_key, second_n = persons.most_common(2)[1]
    graz_by_schuchardt = count(
        lambda lt: (
            place_key(lt.get("place_sent")) == GRAZ
            and person_key(lt.get("sender")) == SCHUCHARDT
        )
    )
    correspdesc = xml_text.count("<correspDesc") if xml_text is not None else None
    postmarks = count(lambda lt: bool(lt.get("postmark")))

    def place_years(key: str) -> tuple[int, int, Counter[int]]:
        own = [lt for lt in letters if place_key(lt.get("place_sent")) == key]
        return (
            len(own),
            sum(
                1
                for lt in own
                if valid_year(lt) and lt["place_sent"].get("lat") is not None
            ),
            Counter(y for y in map(valid_year, own) if y),
        )

    rabat = next((k for k, n in place_names.items() if n == "Rabat"), None)
    places_1900 = {
        place_key(lt["place_sent"])
        for lt in letters
        if valid_year(lt) == 1900
        and known_place(lt.get("place_sent"))
        and lt["place_sent"].get("lat") is not None
    }

    def drawer(tokens: Iterable[str]) -> Probe:
        return Probe(_drawer, tuple(tokens))

    t: list[Task] = []
    add = t.append

    # Startfigur und Überblick
    add(
        Task(
            "US-03",
            "Öffnen Sie das Archiv von der Startseite. Wie viele Briefe nennt der Explorer?",
            f"{num(total)} Briefe",
            "overview",
            probe=drawer([str(total)]),
        )
    )
    add(
        Task(
            "US-04",
            "Wie viele Personen und wie viele Orte nennt die Startansicht?",
            f"{num(len(persons))} Personen ({num(len(with_id))} mit Normdaten-ID), {num(len(places))} Orte",
            "overview",
            probe=Probe(
                lambda p: (
                    f"{p.inner_text('#dash-persons-count')} / {p.inner_text('#dash-places-count')}"
                ),
                (str(len(persons)), str(len(places))),
            ),
        )
    )
    add(
        Task(
            "US-27",
            "Wie viele Briefe sind auf den Tag datiert?",
            f"{num(days.total())} Briefe",
            "overview",
            probe=Probe(
                _text_contains(num(days.total())), (f"{num(days.total())} im Text",)
            ),
            manual="Die Zahl steht in der Beschreibung des Bestands hinter dem Info-Zeichen der Schiene; die Probe sucht sie nur im Text der Seite.",
        )
    )
    add(
        Task(
            "US-40",
            "Wie viele Briefe des Archivs nennen erwähnte Personen?",
            f"{num(count(lambda lt: bool(lt['mentions']['persons'])))} Briefe",
            page="index.html",
            probe=Probe(
                _text_contains(num(count(lambda lt: bool(lt["mentions"]["persons"])))),
                (f"{num(count(lambda lt: bool(lt['mentions']['persons'])))} im Text",),
            ),
            manual="Startseite; die Probe sucht die Zahl nur im Text der Seite.",
        )
    )
    add(
        Task(
            "US-46",
            "Zeigt die Startseite des Archivs eine Figur zu Poststempeln?",
            "nein" if postmarks == 0 else f"ja, {num(postmarks)} Briefe haben postmark",
            page="index.html",
            probe=Probe(
                _postmark_figures, ("0 Figuren",) if postmarks == 0 else ("1 Figuren",)
            ),
        )
    )

    # Die vier großen Ansichten
    add(
        Task(
            "US-11",
            "Welche Person steht im Kreis um Hugo Schuchardt der Mitte am nächsten, mit wie vielen Briefen?",
            f"{names[nearest]}, {num(nearest_n)} Briefe",
            "network",
            {"person": SCHUCHARDT},
            Probe(
                _max_row("network-table", 1),
                (names[nearest].split(",")[0], str(nearest_n)),
            ),
        )
    )
    add(
        Task(
            "US-42",
            "Wie viele Korrespondenten hat Schuchardt im Kreis?",
            f"{num(len(centre_partners))} Korrespondenten",
            "network",
            {"person": SCHUCHARDT},
            Probe(
                lambda p: p.inner_text("#network-table caption"),
                (f"({len(centre_partners)})",),
            ),
        )
    )
    add(
        Task(
            "US-06",
            "Von welchem Ort kommen die meisten Briefe, wie viele?",
            f"{place_names[top_place]} ({top_place}), {num(top_place_n)} Briefe",
            "places",
            probe=Probe(
                _first_entity("#places-list .entity-card"),
                (place_names[top_place], str(top_place_n)),
            ),
        )
    )
    add(
        Task(
            "US-07",
            "Wie viele Briefe schrieb Schuchardt aus Graz?",
            f"{num(graz_by_schuchardt)} Briefe",
            "places",
            probe=Probe(_place_senders, ("Schuchardt", str(graz_by_schuchardt))),
        )
    )
    add(
        Task(
            "US-08",
            "Wie viele Orte mit GeoNames-ID haben keine Koordinaten?",
            f"{num(len(no_coords))} Orte",
            "places",
            probe=Probe(
                lambda p: p.locator("#places-missing-count").text_content() or "",
                (str(len(no_coords)),),
            ),
        )
    )
    add(
        Task(
            "US-41",
            "In welchem Jahr kamen die meisten Briefe aus Paris, wie viele?",
            f"{paris_year} mit {num(paris_year_n)} Briefen",
            "spacetime",
            {"place": PARIS},
            Probe(_year_choice_max, (str(paris_year), str(paris_year_n))),
        )
    )
    add(
        Task(
            "US-24",
            "Welches Thema, das keine Sprache ist, nennen die meisten Briefe?",
            f"„{subject_labels[top_subject]}“, {num(top_subject_n)} Briefe",
            "topics",
            probe=Probe(_topics_top, (subject_labels[top_subject], str(top_subject_n))),
        )
    )
    add(
        Task(
            "US-25",
            "Wer schreibt außer Schuchardt die meisten Briefe zum Thema „Publikationsversand“?",
            f"{names[pv_person]}, {num(pv_person_n)} Briefe",
            "topics",
            {"subject": PUBLIKATIONSVERSAND},
            Probe(_topics_person, (names[pv_person].split(",")[0], str(pv_person_n))),
        )
    )
    add(
        Task(
            "US-26",
            "Wie viele Briefe hält die Auswahl „Publikationsversand“?",
            f"{num(len(pv))} Briefe",
            "topics",
            {"subject": PUBLIKATIONSVERSAND},
            drawer([str(len(pv))]),
        )
    )
    add(
        Task(
            "US-44",
            "In welchem Jahr erreicht „Publikationsversand“ seinen Höhepunkt?",
            f"{pv_year} mit {num(pv_year_n)} Briefen",
            "topics",
            probe=Probe(_topics_peak, (str(pv_year),)),
        )
    )

    # Die Auswahl und ihre Briefe
    add(
        Task(
            "US-43",
            "Wählen Sie in der Zeitansicht das Jahr 1900. Wie viele Briefe nennt die Zeile?",
            f"{num(count(year_between(1900, 1900)))} Briefe",
            "timeline",
            {"yearMin": "1900", "yearMax": "1900"},
            drawer([str(count(year_between(1900, 1900)))]),
        )
    )
    add(
        Task(
            "US-10",
            "Wie viele Briefe hält die Auswahl Leo Spitzer?",
            f"{num(len(spitzer))} Briefe",
            "persons",
            {"person": SPITZER},
            drawer([str(len(spitzer))]),
        )
    )
    add(
        Task(
            "US-09",
            "Wer steht nach Briefanzahl an zweiter Stelle?",
            f"{names[second_key]}, {num(second_n)} Briefe",
            "persons",
            probe=Probe(
                _first_entity("#persons-list .person-card", 1),
                (names[second_key].split(",")[0], str(second_n)),
            ),
        )
    )
    add(
        Task(
            "US-12",
            "Welcher Brief steht nach „Datum (älteste)“ zuerst?",
            f"{first['id']}, {first['date']}"
            + (
                f" (mit {first_ties - 1} weiteren am selben Tag)"
                if first_ties > 1
                else ""
            ),
            "letters",
            probe=Probe(_oldest_letter, (first["id"],)),
        )
    )
    add(
        Task(
            "US-13",
            "Wie viele erwähnte Personen, Orte und Themen nennt der Dialog von o:hsa.letter.654?",
            ", ".join(
                f"{len(l654['mentions'][k])} {label}"
                for k, label in (
                    ("persons", "Personen"),
                    ("places", "Orte"),
                    ("subjects", "Themen"),
                )
            ),
            "letters",
            manual="Dialog eines Briefs, erreichbar nur über Suche und Klick; kein adressierbarer Zustand.",
        )
    )
    add(
        Task(
            "US-14",
            "Wohin führt der Link von o:hsa.letter.654?",
            l654["url"],
            "letters",
            manual="Dialog eines Briefs, erreichbar nur über Suche und Klick.",
        )
    )
    add(
        Task(
            "US-16",
            "Wie viele Briefe sind französisch?",
            f"{num(count(lambda lt: language(lt) == 'fr'))} Briefe",
            "overview",
            {"langs": "fr"},
            drawer([str(count(lambda lt: language(lt) == "fr"))]),
        )
    )
    fr_paris = count(
        lambda lt: (
            place_key(lt.get("place_sent")) == PARIS
            and language(lt) == "fr"
            and year_between(1880, 1900)(lt)
        )
    )
    add(
        Task(
            "US-18",
            "Wie viele französische Briefe kamen zwischen 1880 und 1900 aus Paris?",
            f"{num(fr_paris)} Briefe",
            "places",
            {"yearMin": "1880", "yearMax": "1900", "langs": "fr", "place": PARIS},
            drawer([str(fr_paris)]),
        )
    )
    add(
        Task(
            "US-19",
            "Nach dem Aufheben aller Filter, wie viele Briefe nennt die Zeile unter der Ansicht?",
            f"{num(total)} Briefe",
            "timeline",
            probe=drawer([str(total)]),
        )
    )
    add(
        Task(
            "US-23",
            "Welche Kennung enthält der Link für Leo Spitzer?",
            "VIAF " + ", ".join(spitzer_ids),
            "persons",
            {"person": SPITZER},
            manual="Personen-Dialog, erreichbar nur über einen Klick; der Link führt zu correspSearch.",
        )
    )
    add(
        Task(
            "US-37",
            "Welche Korrespondenten teilen Leo Spitzer und Georges Lacombe?",
            "; ".join(shared) or "keine",
            "comparison",
            manual="Der Vergleich hat keinen adressierbaren Zustand (specification.md, US-37).",
        )
    )

    # Zeit
    add(
        Task(
            "US-05",
            "Welches Jahr hat die meisten Briefe, wie viele, und wie viele Briefe stehen ohne Datum?",
            f"{busiest_year} mit {num(busiest_year_n)} Briefen, {num(n_undated)} ohne Datum",
            "timeline",
            probe=Probe(
                lambda p: (
                    _max_row("timeline-table", 1, lambda r: r[0].isdigit())(p)
                    + " / "
                    + _row_containing("timeline-table", "ohne Datum")(p)
                ),
                (f"{busiest_year} | {busiest_year_n}", f"ohne Datum | {n_undated}"),
            ),
        )
    )
    add(
        Task(
            "US-15",
            "Wie viele Briefe liegen zwischen 1900 und 1910?",
            f"{num(count(year_between(1900, 1910)))} Briefe",
            "timeline",
            {"yearMin": "1900", "yearMax": "1910"},
            drawer([str(count(year_between(1900, 1910)))]),
        )
    )
    year_of_first = first["date"][:4]
    add(
        Task(
            "US-28",
            "Welcher Brief steht zuerst, von wem, an welchem Tag?",
            f"{first['id']}, {first['date']}, {first['sender']['name']} an {first['recipient']['name']}",
            "timeline",
            {"yearMin": year_of_first, "yearMax": year_of_first},
            Probe(
                lambda p: " | ".join(_table_rows(p, "tv-table")[0]),
                (first["sender"]["name"].split(",")[0], year_of_first),
            ),
        )
    )
    add(
        Task(
            "US-29",
            "Biografische Anreicherung",
            "keine aus hsa-letters.json berechenbare Antwort",
            "timeline",
            manual="Die Antwort kommt von Wikidata; prüfbar ist nur, dass ohne Klick keine Anfrage an Wikidata geht.",
        )
    )
    add(
        Task(
            "US-30",
            "Alter in der Chronik",
            "keine aus hsa-letters.json berechenbare Antwort",
            "timeline",
            manual="Das HSA enthält keine Lebensdaten.",
        )
    )
    first_between = between[0]
    add(
        Task(
            "US-31",
            "Wann beginnt der Briefwechsel zwischen Schuchardt und Spitzer, und wie viele Briefe umfasst er?",
            f"{first_between['id']} am {first_between['date']}, {num(len(between))} Briefe",
            "timeline",
            {
                "yearMin": first_between["date"][:4],
                "yearMax": first_between["date"][:4],
                "person": SPITZER,
            },
            Probe(
                _row_containing("tv-table", "Erster von"),
                (f"Erster von {len(between)}",),
            ),
        )
    )
    add(
        Task(
            "US-34",
            "Welcher Tag hat die meisten tagesgenau datierten Briefe, wie viele?",
            f"{busiest_day} mit {num(busiest_day_n)} Briefen",
            "timeline",
            {"yearMin": busiest_day[:4], "yearMax": busiest_day[:4]},
            Probe(_busiest_day, (f": {busiest_day_n}",)),
            manual="Kein Element nennt den briefreichsten Tag; die Probe zählt die Zeilen der Tabelle der unteren Zeitfigur je Datum, die nur 500 Zeilen zeigt.",
        )
    )

    # Daten laden
    xml_answer = (
        f"{num(correspdesc)} correspDesc"
        if correspdesc is not None
        else "hsa.xml fehlt"
    )
    add(
        Task(
            "US-01",
            "Laden Sie docs/data/hsa.xml als eigene Datei. Wie viele Briefe nennt der Explorer oder die Meldung?",
            xml_answer,
            page="index.html",
            manual="Datei-Upload über die Startseite.",
        )
    )
    add(
        Task(
            "US-02",
            "Laden Sie bei lokalem Server die Adresse der Datei hsa.xml. Wie viele Briefe?",
            xml_answer,
            page="index.html",
            manual="Adressfeld der Startseite; die Aufgabe nennt Port 8000, der Server dieser Prüfung läuft auf 8137.",
        )
    )
    add(
        Task(
            "US-38",
            "Edition aus vielen Dateien laden",
            "keine am HSA",
            manual="Geprüft mit verification/check-corpus.mjs.",
        )
    )

    # Export und Wissenskorb
    spitzer_1910s = count(
        lambda lt: SPITZER in parties(lt) and year_between(1910, 1920)(lt)
    )
    add(
        Task(
            "US-20",
            "Wählen Sie Leo Spitzer und den Zeitraum 1910 bis 1920 und öffnen Sie den Link. Wie viele Briefe nennt er?",
            f"{num(spitzer_1910s)} Briefe",
            "letters",
            {"yearMin": "1910", "yearMax": "1920", "person": SPITZER},
            drawer([str(spitzer_1910s)]),
        )
    )
    italian = count(lambda lt: language(lt) == "it")
    add(
        Task(
            "US-21",
            "Wie viele Zeilen hat der CSV-Export unter dem Sprachfilter Italienisch?",
            f"{num(italian)} Zeilen",
            "letters",
            {"langs": "it"},
            Probe(_csv_rows, (f"{italian} Zeilen",)),
        )
    )
    add(
        Task(
            "US-22",
            "Wie viele Personen führt der Index des ungefilterten Exports?",
            f"{num(len(persons))} Personen",
            "letters",
            probe=Probe(_json_persons, (f"{len(persons)} Personen",)),
        )
    )
    add(
        Task(
            "US-35",
            "Legen Sie Graz in den Korb. Wie viele Briefe wertet die Analyseseite aus?",
            f"{num(places[GRAZ])} Briefe",
            "places",
            manual="Korb und Analyseseite wissenskorb.html, über Klicks.",
        )
    )
    add(
        Task(
            "US-36",
            "Setzen Sie den Stern bei Leo Spitzer. Wie viele Briefe wertet die Analyseseite aus?",
            f"{num(len(spitzer))} Briefe",
            "persons",
            manual="Korb und Analyseseite wissenskorb.html, über Klicks.",
        )
    )

    # Unsicherheit und Überlieferung
    add(
        Task(
            "US-39",
            "Wie viele Briefe nennt das Merkmal „Ohne Datum“?",
            f"{num(n_undated)} Briefe, alle übrigen Merkmale null",
            "letters",
            {"feat": "undated"},
            drawer([str(n_undated)]),
        )
    )
    add(
        Task(
            "US-45",
            "Aussagen über Dritte mit ihrem Prüfstand",
            "keine am HSA",
            manual="Das CMIF des HSA enthält keine Aussagen.",
        )
    )

    # Gemeinsame Teile der Ansichten
    add(
        Task(
            "US-47",
            "Wie viele Briefe nennt das Register für Graz als Absendeort?",
            f"{num(places[GRAZ])} Briefe",
            manual="Das Register ist nicht gebaut.",
        )
    )
    add(
        Task(
            "US-48",
            "Wählen Sie in der Startansicht die Sprache Französisch. Welche Zahl nennt die Auswahlzeile?",
            f"{num(count(lambda lt: language(lt) == 'fr'))} Briefe",
            "overview",
            {"langs": "fr"},
            drawer([str(count(lambda lt: language(lt) == "fr"))]),
        )
    )

    # Operation test of the space-time view, 2026-11-14; subjects reconstructed, see the module docstring
    _, paris_drawn, paris_years = place_years(PARIS)
    _, graz_drawn, _ = place_years(GRAZ)
    _, leipzig_drawn, _ = place_years(LEIPZIG)
    space_time = [
        (
            "a",
            "Briefe um 1900 in der schrägen Sicht und von vorn: welche Orte, Jahr an der Achse abgelesen",
            f"Bezug: {num(len(places_1900))} Orte mit Koordinaten haben Briefe im Jahr 1900",
            None,
        ),
        (
            "b",
            "Paris finden, seine Säule wählen und ein Jahr wählen",
            f"Bezug: Paris {num(paris_drawn)} Briefe mit Jahr und Koordinaten in {len(paris_years)} Jahren, meiste {paris_year} ({paris_year_n})",
            Probe(_spacetime_place("Paris"), ("Paris", str(paris_drawn))),
        ),
        (
            "c",
            "Rabat finden, in der Figur und in der Ortsliste, und wählen",
            f"Bezug: Rabat {num(place_years(rabat)[1])} Briefe mit Jahr und Koordinaten"
            if rabat
            else "Rabat nicht in den Daten",
            Probe(_spacetime_place("Rabat"), ("Rabat", str(place_years(rabat)[1])))
            if rabat
            else None,
        ),
        (
            "d",
            "Graz wählen und mit Leipzig vergleichen, auch von vorn",
            f"Bezug: Graz {num(graz_drawn)}, Leipzig {num(leipzig_drawn)} Briefe mit Jahr und Koordinaten",
            Probe(_spacetime_place("Graz"), ("Graz", str(graz_drawn))),
        ),
        ("e", "Sprachen umschalten und die Farben der Säulen lesen", "", None),
        (
            "f",
            "Marken im dichten Mitteleuropa treffen: Ort und Jahr unter dem Zeiger",
            "",
            None,
        ),
        (
            "g",
            "Sich verirren und zurückfinden: Blickrichtungen und Zurücksetzen",
            "",
            None,
        ),
        ("h", "Ort und Jahr per Klick wählen und die Wahl wieder lösen", "", None),
        (
            "i",
            "Den Zeitraum mit den Reglern der Seitenleiste einengen, auch auf ein Jahr",
            "",
            None,
        ),
        ("j", "Die Aufgaben b, c und h nur mit der Tastatur", "", None),
        (
            "k",
            "Die Ansicht bei 360 x 740 Pixeln: Graz antippen, Rabat in der Liste erreichen",
            "",
            None,
        ),
        ("l", "Reduzierte Bewegung und 200 Prozent Zoom", "", None),
    ]
    for letter_id, question, answer, probe in space_time:
        add(
            Task(
                f"ST-{letter_id}",
                question,
                answer or "keine berechenbare Antwort, Bedienaufgabe",
                "spacetime",
                probe=probe,
                manual="Bedienaufgabe der Prüfung vom 2026-11-14, im Repository nicht festgehalten; "
                + (
                    "die Probe liest nur die Bezugszahl der Ortsliste."
                    if probe
                    else "von Hand mit Zeiger und Tastatur."
                ),
            )
        )
    return t


# Browser mode


def _normalise(text: str) -> str:
    """Drop German thousands separators and collapse whitespace, so tokens compare as plain numbers."""
    return re.sub(r"\s+", " ", re.sub(r"(?<=\d)\.(?=\d{3}\b)", "", text))


def _wait_loaded(page, task: Task) -> None:
    if task.page == "index.html":
        page.wait_for_selector("#model .stmt", timeout=60_000)
        page.wait_for_function(
            "document.getElementById('model').dataset.dataset === 'hsa'", timeout=60_000
        )
    else:
        page.wait_for_selector(
            "#loading-overlay.hidden", state="attached", timeout=60_000
        )
    page.wait_for_timeout(800)


def run_browser(
    tasks: list[Task], base: str, channel: str
) -> tuple[dict[str, tuple[str, str]], list[str]]:
    """Read every probed task in the rendered view. Returns verdict and text per task, and probe errors."""
    from playwright.sync_api import sync_playwright  # only this mode needs Playwright

    results: dict[str, tuple[str, str]] = {}
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=channel, headless=True)
        for task in tasks:
            if not task.probe:
                results[task.id] = ("manual", "")
                continue
            ctx = browser.new_context(
                viewport={"width": 1366, "height": 900}, accept_downloads=True
            )
            # No request leaves the local server except the basemap tiles; Wikidata and
            # correspSearch stay unasked. The pattern names hosts, because the tool has a module
            # js/correspsearch.js of its own that must load
            ctx.route(
                re.compile(r"^https?://[^/]*(wikidata\.org|correspsearch\.net)"),
                lambda route: route.abort(),
            )
            page = ctx.new_page()
            try:
                page.goto(task.url(base))
                _wait_loaded(page, task)
                seen = _normalise(task.probe.read(page))
                found = all(_normalise(token) in seen for token in task.probe.tokens)
                results[task.id] = ("yes" if found else "no", seen)
            except Exception as error:  # one failing probe must not hide the others
                message = (
                    str(error).splitlines()[0] if str(error) else type(error).__name__
                )
                results[task.id] = ("error", message)
                errors.append(f"{task.id}: {message}")
            finally:
                ctx.close()
        browser.close()
    return results, errors


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--json", action="store_true", help="print the tasks as JSON")
    parser.add_argument(
        "--browser", action="store_true", help="read each answer in the rendered view"
    )
    parser.add_argument("--base", default=BASE, help="URL of a running server on docs/")
    parser.add_argument(
        "--channel", default="chrome", help="Playwright browser channel"
    )
    parser.add_argument("--only", help="comma-separated task ids for the browser mode")
    args = parser.parse_args()

    if not DATA.is_file():
        print(
            f"FEHLER  {DATA} fehlt; die Daten liegen im Repository unter docs/data",
            file=sys.stderr,
        )
        return 1
    data = json.loads(DATA.read_text(encoding="utf-8"))
    xml_text = XML.read_text(encoding="utf-8") if XML.is_file() else None
    tasks = build_tasks(data, xml_text)
    base = args.base if args.base.endswith("/") else args.base + "/"

    results: dict[str, tuple[str, str]] = {}
    errors: list[str] = []
    if args.browser:
        chosen = set(args.only.split(",")) if args.only else None
        results, errors = run_browser(
            [t for t in tasks if not chosen or t.id in chosen], base, args.channel
        )

    if args.json:
        out = []
        for task in tasks:
            entry = task.to_dict(base)
            if task.id in results:
                entry["browser"], entry["seen"] = results[task.id]
            out.append(entry)
        print(
            json.dumps(
                {
                    "generated_from": str(DATA.relative_to(ROOT)),
                    "meta": data.get("meta", {}).get("generated"),
                    "tasks": out,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        for task in tasks:
            print(f"{task.id}  {task.question}")
            print(f"       Antwort: {task.answer}")
            if task.url(base):
                print(f"       {task.url(base)}")
            if task.id in results:
                verdict, seen = results[task.id]
                print(f"       im Browser: {verdict}" + (f"  [{seen}]" if seen else ""))
            elif not task.probe or task.manual:
                print(f"       von Hand: {task.manual or 'keine Probe'}")
        if results:
            tally = Counter(v for v, _ in results.values())
            print(
                f"\nim Browser: {tally['yes']} ja, {tally['no']} nein, {tally['manual']} von Hand, {tally['error']} Fehler"
            )
    for message in errors:
        print(f"FEHLER  {message}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
