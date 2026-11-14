# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Summary of the Hugo Schuchardt Archiv for the figure on the start page.

Reads docs/data/hsa-letters.json (built by build_hsa_data.py) and writes docs/data/examples.json
with one entry keyed "data/hsa-letters.json": which statements of the data model the letters
carry, the small aggregates the figure draws (correspondence circle with its outer ring of
mentioned persons, located sending and mentioned places, letters per year and language, the
profiles of the most frequent subjects, the hosts of the edition links) and the example letter
with its place in each aggregate.

Usage, from the repository root, after hsa-letters.json changed:

    uv run preprocessing/build_examples.py

Design decisions: the summary is defined once, in docs/js/start-summary.js, and this script ports
it rule by rule, because the archive's JSON is too large to summarise on every visit of the start
page. The tutorial and a local edition are summarised in the browser from the explorer's own
parser output, so no second XML reading exists. tests/browser/smoke.py runs the JavaScript
summary over the same JSON in the browser and compares it with this file. Single-file script
with the standard library only (script regime); the file carries no generation date, so an
unchanged source gives an unchanged file.
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

DATA = Path(__file__).resolve().parents[1] / "docs" / "data"
SOURCE = "data/hsa-letters.json"
NO_LANGUAGE = "_none"
TOP_MENTIONS = 3
OUTER_LIMIT = 300
EXAMPLES = 12
# isUnknownPlaceName() in docs/js/utils.js
UNKNOWN_PLACE = [
    re.compile(p, re.IGNORECASE)
    for p in (r"^Unbekannt$", r"^Unknown$", r"^ohne Ort$", r"^\[?\?\]?$")
]
DATE = re.compile(r"^(\d{1,4})-(\d{2})(?:-(\d{2}))?")
STATEMENTS = (
    "persons",
    "place",
    "date",
    "link",
    "language",
    "mentionsPerson",
    "mentionsPlace",
    "mentionsSubject",
    "postmark",
    "address",
    "signature",
    "records",
    "inferred",
)


def _person_key(person: dict | None) -> str | None:
    if not person:
        return None
    return person.get("id") or person.get("localRef") or person.get("name") or None


def _place_key(place: dict | None) -> str | None:
    if not place:
        return None
    return place.get("geonames_id") or place.get("name") or None


def _known_place(place: dict | None) -> bool:
    if not place:
        return False
    if place.get("geonames_id"):
        return True
    name = (place.get("name") or "").strip()
    return bool(name) and not any(p.search(name) for p in UNKNOWN_PLACE)


def _located(place: dict | None) -> bool:
    return bool(place) and all(
        isinstance(place.get(k), (int, float)) and not isinstance(place.get(k), bool)
        for k in ("lat", "lon")
    )


def _recipients(letter: dict) -> list[dict]:
    return letter.get("recipients") or (
        [letter["recipient"]] if letter.get("recipient") else []
    )


def _parties(letter: dict) -> dict[str, dict]:
    parties: dict[str, dict] = {}
    for person in [letter.get("sender"), *_recipients(letter)]:
        key = _person_key(person)
        if key and key not in parties:
            parties[key] = person
    return parties


def _round(value: float, digits: int) -> float:
    """Math.round(value * 10 ** digits) / 10 ** digits, which rounds halves up."""
    return math.floor(value * 10**digits + 0.5) / 10**digits


def _letter_time(letter: dict) -> float | None:
    """letterTime() in views/network-view.js."""
    year = letter.get("year")
    if not year or letter.get("dateImplausible"):
        return None
    m = DATE.match(letter.get("date") or "")
    if not m or int(m.group(1)) != year:
        return year
    return year + (int(m.group(2)) - 1) / 12 + (int(m.group(3) or 1) - 1) / 366


def _carries(letter: dict) -> dict[str, bool]:
    """The statement tests of STATEMENTS in start-summary.js."""
    mentions = letter.get("mentions") or {}
    place = letter.get("place_sent") or {}
    return {
        "persons": bool(_person_key(letter.get("sender")))
        or any(_person_key(p) for p in _recipients(letter)),
        "place": _known_place(letter.get("place_sent")),
        "date": bool(letter.get("year")),
        "link": bool(letter.get("url")),
        "language": bool((letter.get("language") or {}).get("code")),
        "mentionsPerson": len(mentions.get("persons") or []) > 0,
        "mentionsPlace": len(mentions.get("places") or []) > 0,
        "mentionsSubject": len(mentions.get("subjects") or []) > 0,
        "postmark": bool(letter.get("postmark")),
        "address": bool(letter.get("address")),
        "signature": bool(letter.get("signature")),
        "records": len(letter.get("records") or []) > 1,
        "inferred": bool(letter.get("dateInferred") or place.get("inferred")),
    }


def _ranked(entries: dict[str, dict]) -> list[dict]:
    return sorted(entries.values(), key=lambda e: (-e["count"], e["key"]))


def _count_mentions(table: dict, items: list | None, key_of, name_of) -> None:
    seen = set()
    for item in items or []:
        key = key_of(item)
        if not key or key in seen:
            continue
        seen.add(key)
        entry = table.setdefault(
            key, {"key": key, "name": name_of(item) or key, "count": 0}
        )
        entry["count"] += 1


def _subject_key(subject: dict) -> str | None:
    return subject.get("uri") or subject.get("label")


def _ego(letters: list[dict], persons: dict[str, dict]) -> dict:
    """egoModel() in start-summary.js."""
    centre = None
    for p in persons.values():
        if (
            centre is None
            or len(p["partners"]) > len(centre["partners"])
            or (
                len(p["partners"]) == len(centre["partners"])
                and (
                    p["count"] > centre["count"]
                    or (p["count"] == centre["count"] and p["name"] < centre["name"])
                )
            )
        ):
            centre = p
    if centre is None:
        return {"model": None, "inner": {}, "outer": {}, "centre": None}
    centre_id = centre["key"]
    partners: dict[str, dict] = {}
    mentioned: dict[str, dict] = {}
    for letter in letters:
        if centre_id not in _parties(letter):
            continue
        sender = _person_key(letter.get("sender"))
        recipient_keys = [_person_key(p) for p in _recipients(letter)]
        if sender == centre_id:
            others = [k for k in recipient_keys if k and k != centre_id]
            partner = next((k for k in recipient_keys if k and k != centre_id), None)
        else:
            others = [sender] if sender and sender != centre_id else []
            partner = sender
        time = _letter_time(letter)
        for key in dict.fromkeys(others):
            p = partners.setdefault(key, {"key": key, "letters": 0, "first": None})
            p["letters"] += 1
            if time is not None and (p["first"] is None or time < p["first"]):
                p["first"] = time
        seen = set()
        for person in (letter.get("mentions") or {}).get("persons") or []:
            key = _person_key(person)
            if not key or key == centre_id or key in seen:
                continue
            seen.add(key)
            m = mentioned.setdefault(
                key,
                {
                    "key": key,
                    "name": person.get("name") or key,
                    "mentions": 0,
                    "partners": {},
                },
            )
            m["mentions"] += 1
            if partner:
                m["partners"][partner] = m["partners"].get(partner, 0) + 1

    def name_of(key: str) -> str:
        return persons[key]["name"] if key in persons else key

    inner = sorted(
        partners.values(), key=lambda p: (-p["letters"], name_of(p["key"]), p["key"])
    )
    inner_index = {p["key"]: i for i, p in enumerate(inner)}
    outer = sorted(
        (m for m in mentioned.values() if m["key"] not in partners),
        key=lambda m: (-m["mentions"], m["name"], m["key"]),
    )[:OUTER_LIMIT]
    outer_index = {m["key"]: i for i, m in enumerate(outer)}
    chords: dict[tuple[int, int], int] = {}
    for letter in letters:
        sender = _person_key(letter.get("sender"))
        if sender not in inner_index:
            continue
        for to in dict.fromkeys(_person_key(p) for p in _recipients(letter)):
            if not to or to == sender or to not in inner_index:
                continue
            pair = tuple(sorted((inner_index[sender], inner_index[to])))
            chords[pair] = chords.get(pair, 0) + 1
    model = {
        "centre": centre["name"],
        "correspondents": len(partners),
        "inner": [
            [
                name_of(p["key"]),
                p["letters"],
                None if p["first"] is None else _round(p["first"], 4),
            ]
            for p in inner
        ],
        "outer": [
            [
                m["name"],
                m["mentions"],
                1 if m["key"] in persons else 0,
                [
                    [inner_index[key], n]
                    for key, n in sorted(
                        ((k, n) for k, n in m["partners"].items() if k in inner_index),
                        key=lambda item: (-item[1], item[0]),
                    )[:3]
                ],
            ]
            for m in outer
        ],
        "chords": [[a, b, n] for (a, b), n in sorted(chords.items())],
    }
    return {
        "model": model,
        "inner": inner_index,
        "outer": outer_index,
        "centre": centre_id,
    }


def _examples(letters: list[dict], scores: list[int]) -> list[dict]:
    """pickExamples() in start-summary.js."""
    order = sorted(range(len(letters)), key=lambda i: (-scores[i], i))
    seen: set[str] = set()
    picked = []
    for i in order:
        letter = letters[i]
        year = letter.get("year")
        kind = "|".join(
            (
                (letter.get("language") or {}).get("code") or NO_LANGUAGE,
                str(year // 10) if year else "-",
                _place_key(letter.get("place_sent")) or "-",
            )
        )
        if kind in seen:
            continue
        seen.add(kind)
        picked.append(letter)
        if len(picked) == EXAMPLES:
            break
    return picked


def _record(letter: dict, ego: dict, subjects: list[str]) -> dict:
    """describeRecord() in start-summary.js."""
    first_subject = ((letter.get("mentions") or {}).get("subjects") or [None])[0]
    subject_key = _subject_key(first_subject) if first_subject else None
    subject_index = subjects.index(subject_key) if subject_key in subjects else -1
    mentions = letter.get("mentions") or {}
    place = letter.get("place_sent")
    recipients = _recipients(letter)
    sender = _person_key(letter.get("sender"))
    if sender == ego["centre"]:
        partner = next(
            (
                k
                for k in (_person_key(p) for p in recipients)
                if k and k != ego["centre"]
            ),
            None,
        )
    else:
        partner = sender

    def first(items: list | None) -> dict:
        return items[0] if items else {}

    person = first(mentions.get("persons"))
    person_key = _person_key(person) if person else None
    mentioned_place = first(mentions.get("places"))
    return {
        "id": letter.get("id") or None,
        "sender": (letter.get("sender") or {}).get("name"),
        "recipient": recipients[0].get("name") if recipients else None,
        "place": place.get("name") if _known_place(place) else None,
        "placeInferred": bool((place or {}).get("inferred")),
        "lat": _round(place["lat"], 3) if _located(place) else None,
        "lon": _round(place["lon"], 3) if _located(place) else None,
        "date": letter.get("date"),
        "dateText": letter.get("dateText"),
        "dateInferred": bool(letter.get("dateInferred")),
        "year": letter.get("year") or None,
        "language": (letter.get("language") or {}).get("code"),
        "languageLabel": (letter.get("language") or {}).get("label"),
        "url": letter.get("url"),
        "partner": ego["inner"].get(partner),
        "mentionsPerson": person.get("name"),
        "mentionedInner": ego["inner"].get(person_key),
        "mentionedOuter": ego["outer"].get(person_key),
        "mentionsPlace": mentioned_place.get("name"),
        "mentionedLat": _round(mentioned_place["lat"], 3)
        if _located(mentioned_place)
        else None,
        "mentionedLon": _round(mentioned_place["lon"], 3)
        if _located(mentioned_place)
        else None,
        "mentionsSubject": first(mentions.get("subjects")).get("label"),
        "subject": subject_index if subject_index >= 0 else None,
        "postmark": letter.get("postmark"),
        "address": letter.get("address"),
        "signature": letter.get("signature"),
        "records": len(letter.get("records") or []) or 1,
    }


def summarize(letters: list[dict]) -> dict:
    """Port of summarizeLetters() in docs/js/start-summary.js."""
    coverage = dict.fromkeys(STATEMENTS, 0)
    persons: dict[str, dict] = {}
    located: dict[str, dict] = {}
    known_places: set[str] = set()
    languages: dict[str, int] = {}
    per_year: dict[int, dict[str, int]] = {}
    mentioned = {"persons": {}, "places": {}, "subjects": {}}
    mentioned_places: dict[str, dict] = {}
    subject_years: dict[str, dict[int, int]] = {}
    hosts: dict[str, int] = {}
    sending_places: dict[str, dict] = {}
    postmark_years: dict[int, int] = {}
    record_counts: dict[int, int] = {}
    records_differ = 0
    scores: list[int] = []

    for letter in letters:
        carried = _carries(letter)
        scores.append(sum(carried.values()))
        for key, value in carried.items():
            coverage[key] += value

        for key, person in _parties(letter).items():
            entry = persons.setdefault(
                key,
                {
                    "key": key,
                    "name": person.get("name") or key,
                    "count": 0,
                    "partners": set(),
                },
            )
            entry["count"] += 1
        sender = _person_key(letter.get("sender"))
        if sender:
            for recipient in _recipients(letter):
                to = _person_key(recipient)
                if not to or to == sender:
                    continue
                persons[sender]["partners"].add(to)
                persons[to]["partners"].add(sender)

        place = letter.get("place_sent") or {}
        if _known_place(letter.get("place_sent")):
            key = _place_key(place)
            known_places.add(key)
            entry = sending_places.setdefault(
                key, {"key": key, "name": place.get("name") or key, "count": 0}
            )
            entry["count"] += 1
        if letter.get("postmark") and letter.get("year"):
            postmark_years[letter["year"]] = postmark_years.get(letter["year"], 0) + 1
        records = len(letter.get("records") or []) or 1
        record_counts[records] = record_counts.get(records, 0) + 1
        if letter.get("recordsDiffer"):
            records_differ += 1
        if _located(place):
            key = _place_key(place)
            entry = located.setdefault(
                key,
                {
                    "key": key,
                    "lat": _round(place["lat"], 3),
                    "lon": _round(place["lon"], 3),
                    "count": 0,
                },
            )
            entry["count"] += 1

        code = (letter.get("language") or {}).get("code") or NO_LANGUAGE
        languages[code] = languages.get(code, 0) + 1
        if letter.get("year"):
            counts = per_year.setdefault(letter["year"], {})
            counts[code] = counts.get(code, 0) + 1

        if letter.get("url"):
            host = urlsplit(letter["url"]).netloc.lower()
            if host:
                hosts[host] = hosts.get(host, 0) + 1

        mentions = letter.get("mentions") or {}
        _count_mentions(
            mentioned["persons"],
            mentions.get("persons"),
            _person_key,
            lambda p: p.get("name"),
        )
        _count_mentions(
            mentioned["places"],
            mentions.get("places"),
            _place_key,
            lambda p: p.get("name"),
        )
        _count_mentions(
            mentioned["subjects"],
            mentions.get("subjects"),
            _subject_key,
            lambda s: s.get("label"),
        )
        seen_places = set()
        for p in mentions.get("places") or []:
            key = _place_key(p)
            if not key or key in seen_places or not _located(p):
                continue
            seen_places.add(key)
            entry = mentioned_places.setdefault(
                key,
                {
                    "key": key,
                    "lat": _round(p["lat"], 3),
                    "lon": _round(p["lon"], 3),
                    "count": 0,
                },
            )
            entry["count"] += 1
        if letter.get("year"):
            for key in dict.fromkeys(
                k
                for k in (_subject_key(s) for s in mentions.get("subjects") or [])
                if k
            ):
                years = subject_years.setdefault(key, {})
                years[letter["year"]] = years.get(letter["year"], 0) + 1

    years = sorted(per_year)
    ego = _ego(letters, persons)
    examples = _examples(letters, scores)
    record = examples[0] if examples else None
    top_subjects = _ranked(mentioned["subjects"])
    record_subject = ((record or {}).get("mentions") or {}).get("subjects") or []
    record_subject_key = _subject_key(record_subject[0]) if record_subject else None
    shown = [s["key"] for s in top_subjects[:TOP_MENTIONS]]
    if (
        record_subject_key
        and record_subject_key in subject_years
        and record_subject_key not in shown
    ):
        shown[TOP_MENTIONS - 1 : TOP_MENTIONS] = [record_subject_key]
    return {
        "letters": len(letters),
        "dated": sum(sum(per_year[y].values()) for y in years),
        "first": years[0] if years else None,
        "last": years[-1] if years else None,
        "coverage": coverage,
        "persons": len(persons),
        "ego": ego["model"],
        "places": len(known_places),
        "located": [[p["lat"], p["lon"], p["count"]] for p in _ranked(located)],
        "languages": dict(
            sorted(languages.items(), key=lambda item: (-item[1], item[0]))
        ),
        "perYear": [[year, per_year[year]] for year in years],
        "placesTop": [[p["name"], p["count"]] for p in _ranked(sending_places)[:5]],
        "postmarkYears": [[y, n] for y, n in sorted(postmark_years.items())],
        "recordCounts": [[n, c] for n, c in sorted(record_counts.items())],
        "recordsDiffer": records_differ,
        "hosts": [
            [h, n]
            for h, n in sorted(hosts.items(), key=lambda item: (-item[1], item[0]))[:3]
        ],
        "mentioned": {
            kind: {
                "distinct": len(table),
                "top": [[m["name"], m["count"]] for m in _ranked(table)[:TOP_MENTIONS]],
            }
            for kind, table in mentioned.items()
        },
        "mentionedLocated": [
            [p["lat"], p["lon"], p["count"]] for p in _ranked(mentioned_places)
        ],
        "subjects": [
            [
                mentioned["subjects"][key]["name"],
                [[y, n] for y, n in sorted(subject_years.get(key, {}).items())],
            ]
            for key in shown
        ],
        "examples": [_record(letter, ego, shown) for letter in examples],
    }


def main() -> int:
    path = DATA / SOURCE.removeprefix("data/")
    if not path.is_file():
        print(f"missing source {path}; run build_hsa_data.py first", file=sys.stderr)
        return 1
    letters = json.loads(path.read_text(encoding="utf-8"))["letters"]
    summary = summarize(letters)
    out = DATA / "examples.json"
    out.write_text(
        json.dumps(
            {"datasets": {SOURCE: summary}}, ensure_ascii=False, separators=(",", ":")
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"{SOURCE}: {summary['letters']} letters, wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
