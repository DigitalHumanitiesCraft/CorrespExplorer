# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Summary of the Hugo Schuchardt Archiv for the figure on the start page.

Reads docs/data/hsa-letters.json (built by build_hsa_data.py) and writes docs/data/examples.json
with one entry keyed "data/hsa-letters.json": which statements of the data model the letters
carry, and the small aggregates the figure draws (correspondence circle, located sending places,
letters per year and language, most mentioned persons, places and subjects, the example record).

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

DATA = Path(__file__).resolve().parents[1] / "docs" / "data"
SOURCE = "data/hsa-letters.json"
NO_LANGUAGE = "_none"
EGO_SHARE = 0.5
TOP_PERSONS = 24
TOP_MENTIONS = 3
# isUnknownPlaceName() in docs/js/utils.js
UNKNOWN_PLACE = [
    re.compile(p, re.IGNORECASE)
    for p in (r"^Unbekannt$", r"^Unknown$", r"^ohne Ort$", r"^\[?\?\]?$")
]
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


def _recipients(letter: dict) -> list[dict]:
    return letter.get("recipients") or (
        [letter["recipient"]] if letter.get("recipient") else []
    )


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


def _js_round(value: float) -> float:
    """Math.round(value * 1000) / 1000, which rounds halves up, unlike round()."""
    return math.floor(value * 1000 + 0.5) / 1000


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


def _record(letter: dict) -> dict:
    mentions = letter.get("mentions") or {}
    place = letter.get("place_sent")
    recipients = _recipients(letter)

    def first(items: list | None) -> dict:
        return items[0] if items else {}

    return {
        "sender": (letter.get("sender") or {}).get("name"),
        "recipient": recipients[0].get("name") if recipients else None,
        "place": place.get("name") if _known_place(place) else None,
        "placeInferred": bool((place or {}).get("inferred")),
        "date": letter.get("date"),
        "dateText": letter.get("dateText"),
        "dateInferred": bool(letter.get("dateInferred")),
        "language": (letter.get("language") or {}).get("code"),
        "languageLabel": (letter.get("language") or {}).get("label"),
        "url": letter.get("url"),
        "mentionsPerson": first(mentions.get("persons")).get("name"),
        "mentionsPlace": first(mentions.get("places")).get("name"),
        "mentionsSubject": first(mentions.get("subjects")).get("label"),
        "postmark": letter.get("postmark"),
        "address": letter.get("address"),
        "signature": letter.get("signature"),
        "records": len(letter.get("records") or []) or 1,
    }


def summarize(letters: list[dict]) -> dict:
    """Port of summarizeLetters() in docs/js/start-summary.js."""
    coverage = dict.fromkeys(STATEMENTS, 0)
    persons: dict[str, dict] = {}
    pairs: dict[tuple[str, str], int] = {}
    located: dict[str, dict] = {}
    known_places: set[str] = set()
    languages: dict[str, int] = {}
    per_year: dict[int, dict[str, int]] = {}
    mentioned = {"persons": {}, "places": {}, "subjects": {}}
    record, record_score = None, -1

    for letter in letters:
        carried = _carries(letter)
        score = sum(carried.values())
        for key, value in carried.items():
            coverage[key] += value
        if score > record_score:
            record, record_score = letter, score

        seen: dict[str, str] = {}
        for person in [letter.get("sender"), *_recipients(letter)]:
            key = _person_key(person)
            if key and key not in seen:
                seen[key] = person.get("name") or key
        for key, name in seen.items():
            persons.setdefault(key, {"key": key, "name": name, "count": 0})[
                "count"
            ] += 1
        sender_key = _person_key(letter.get("sender"))
        if sender_key:
            for recipient_key in {
                k
                for k in (_person_key(p) for p in _recipients(letter))
                if k and k != sender_key
            }:
                pair = tuple(sorted((sender_key, recipient_key)))
                pairs[pair] = pairs.get(pair, 0) + 1

        place = letter.get("place_sent") or {}
        if _known_place(letter.get("place_sent")):
            known_places.add(_place_key(place))
        lat, lon = place.get("lat"), place.get("lon")
        if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
            key = _place_key(place)
            entry = located.setdefault(
                key,
                {"key": key, "lat": _js_round(lat), "lon": _js_round(lon), "count": 0},
            )
            entry["count"] += 1

        code = (letter.get("language") or {}).get("code") or NO_LANGUAGE
        languages[code] = languages.get(code, 0) + 1
        if letter.get("year"):
            counts = per_year.setdefault(letter["year"], {})
            counts[code] = counts.get(code, 0) + 1

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
            lambda s: s.get("uri") or s.get("label"),
            lambda s: s.get("label"),
        )

    ranked = _ranked(persons)
    ego = ranked and ranked[0]["count"] >= len(letters) * EGO_SHARE
    circle = ranked[:TOP_PERSONS]
    index = {p["key"]: i for i, p in enumerate(circle)}
    edges = sorted(
        [min(index[a], index[b]), max(index[a], index[b]), count]
        for (a, b), count in pairs.items()
        if a in index and b in index
    )
    years = sorted(per_year)
    return {
        "letters": len(letters),
        "first": years[0] if years else None,
        "last": years[-1] if years else None,
        "coverage": coverage,
        "persons": len(persons),
        "ego": 0 if ego else None,
        "circle": [[p["name"], p["count"]] for p in circle],
        "edges": edges,
        "places": len(known_places),
        "located": [[p["lat"], p["lon"], p["count"]] for p in _ranked(located)],
        "languages": dict(
            sorted(languages.items(), key=lambda item: (-item[1], item[0]))
        ),
        "perYear": [[year, per_year[year]] for year in years],
        "mentioned": {
            kind: {
                "distinct": len(table),
                "top": [[m["name"], m["count"]] for m in _ranked(table)[:TOP_MENTIONS]],
            }
            for kind, table in mentioned.items()
        },
        "record": _record(record) if record else None,
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
