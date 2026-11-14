# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Browser smoke test of CorrespExplorer: the researcher's path through the real pages.

The browser test runner (docs/test.html) checks the modules; this script checks what only a
browser shows, meaning loading, views, tour, links, Back, basket and export. It serves docs/ on a
free local port, drives Chrome headless through Playwright and prints one line per check, then a
summary. The exit code is 0 only when every check passed.

Usage, from the repository root:

    uv run tests/browser/smoke.py
    uv run tests/browser/smoke.py --online --axe path/to/axe.min.js

--online adds the checks against the live correspSearch API; without it the script sends no
request outside the local server except the OpenFreeMap basemap tiles of the map view. --axe runs
axe-core over the pages when a copy of axe.min.js is given; axe-core is not vendored, because the
pages do not need it.

Design decisions: single-file script with inline dependencies (house style, script regime), the
stdlib HTTP server instead of an extra dependency, and expected figures read from the bundled data
files rather than written into the script (CLAUDE.md, nothing invented). The load-time limit is
deliberately generous (decision E10 of 2026-11-05): it catches a regression by an order of
magnitude, not machine noise. Introduced with decision E9 of 2026-11-05.
"""

from __future__ import annotations

import argparse
import functools
import json
import sys
import tempfile
import threading
import time
from collections.abc import Callable
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

DOCS = Path(__file__).resolve().parents[2] / "docs"
VIEWS = (
    "overview",
    "map",
    "persons",
    "letters",
    "timeline",
    "topics",
    "places",
    "network",
    "mentions-flow",
    "chronik",
    "activity",
    "comparison",
)
HSA = "json=data/hsa-letters.json"
CS_QUERY = "https://correspsearch.net/api/v2.0/tei-json.xql?d=1890-01-01"


class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(
        self, format: str, *args: object
    ) -> None:  # signature of the base class
        pass


def _serve() -> tuple[ThreadingHTTPServer, str]:
    handler = functools.partial(_QuietHandler, directory=str(DOCS))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}/"



# The header offers subjects; a view is reached through its subject and, where the subject has
# several representations, through the switch in the view header
GROUP_OF = {"overview": "overview", "letters": "letters", "persons": "persons", "network": "persons",
            "mentions-flow": "persons", "comparison": "persons", "map": "places", "places": "places",
            "timeline": "time", "activity": "time", "chronik": "time", "topics": "topics"}


def _open_view(page, view: str) -> None:
    page.click(f'.view-group-btn[data-group="{GROUP_OF[view]}"]')
    variant = page.locator(f'.view-btn[data-view="{view}"]')
    if variant.is_visible():
        variant.click()


def _loaded(page: Page) -> None:
    page.wait_for_selector("#loading-overlay.hidden", state="attached", timeout=30_000)


def _hsa_letters_between(first: int, last: int) -> int:
    data = json.loads((DOCS / "data" / "hsa-letters.json").read_text(encoding="utf-8"))
    return sum(
        1
        for letter in data["letters"]
        if letter.get("year") and first <= letter["year"] <= last
    )


class Smoke:
    """Holds the browser and the base URL that every check needs."""

    def __init__(self, browser: Browser, base: str, load_limit: float) -> None:
        self.browser = browser
        self.base = base
        self.load_limit = load_limit

    def context(self) -> BrowserContext:
        return self.browser.new_context(
            viewport={"width": 1366, "height": 900}, accept_downloads=True
        )

    def test_runner(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(self.base + "test.html?test=true")
        page.wait_for_selector("#test-summary.visible", timeout=120_000)
        summary = page.inner_text("#test-summary")
        passed, total = summary.split(" ")[0].split("/")
        ctx.close()
        assert passed == total, summary

    def views_without_errors(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on(
            "console", lambda m: errors.append(m.text) if m.type == "error" else None
        )
        start = time.monotonic()
        page.goto(f"{self.base}explore.html?view=overview&{HSA}")
        _loaded(page)
        seconds = time.monotonic() - start
        assert seconds < self.load_limit, (
            f"HSA loaded in {seconds:.1f} s, limit {self.load_limit} s"
        )
        for view in VIEWS:
            page.goto(f"{self.base}explore.html?view={view}&{HSA}")
            _loaded(page)
            page.wait_for_timeout(500)
        ctx.close()
        assert not errors, f"{len(errors)} errors, first: {errors[0]}"

    def demo_link_and_network(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(self.base + "explore.html?view=network&demo=true&tour=0")
        _loaded(page)
        page.wait_for_timeout(1500)
        nodes = page.locator("#network-graph g.node").count()
        url = page.url
        ctx.close()
        assert "explore.html" in url, f"demo link left the explorer: {url}"
        assert nodes > 0, "demo network is empty with its default threshold"

    def tour_once_per_browser(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(self.base + "explore.html?view=overview&demo=true")
        _loaded(page)
        page.wait_for_selector("#demo-tour:not(.hidden)", timeout=5000)
        page.keyboard.press("Escape")
        focused = page.evaluate("document.activeElement.classList.contains('view-group-btn')")
        second = ctx.new_page()
        second.goto(self.base + "explore.html?view=letters&demo=true")
        _loaded(second)
        second.wait_for_timeout(2500)
        shown_again = second.locator("#demo-tour").is_visible()
        ctx.close()
        assert focused, "focus did not return to a view button after Escape"
        assert not shown_again, "tour opened again in a new tab"

    def missing_dataset_notice(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(self.base + "explore.html?view=letters")
        page.wait_for_url("**/index.html?notice=dataset-missing", timeout=15_000)
        visible = page.locator("#error-message").is_visible()
        ctx.close()
        assert visible, "start page shows no notice"

    def back_returns_to_previous_view(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(f"{self.base}explore.html?view=overview&{HSA}")
        _loaded(page)
        _open_view(page, "letters")
        _open_view(page, "map")
        page.go_back()
        page.wait_for_timeout(800)
        url = page.url
        active = page.get_attribute(".view-btn[aria-pressed='true']", "data-view")
        ctx.close()
        assert "view=letters" in url and active == "letters", (
            f"Back led to {url}, active view {active}"
        )

    def shared_filter_link(self) -> None:
        expected = _hsa_letters_between(1890, 1891)
        ctx = self.context()
        page = ctx.new_page()
        page.goto(
            f"{self.base}explore.html?view=letters&{HSA}&yearMin=1890&yearMax=1891"
        )
        _loaded(page)
        shown = page.inner_text("#letters-result").split(" ")[0].replace(".", "")
        ctx.close()
        assert shown == str(expected), (
            f"letter list shows {shown}, data hold {expected} letters 1890-1891"
        )

    def csv_export(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(
            f"{self.base}explore.html?view=letters&{HSA}&yearMin=1890&yearMax=1890"
        )
        _loaded(page)
        page.click("#export-btn")
        with page.expect_download() as info:
            page.click('#export-modal .export-option[data-format="csv"]')
        raw = Path(info.value.path()).read_bytes()
        ctx.close()
        assert raw.startswith(b"\xef\xbb\xbf"), "CSV has no UTF-8 byte order mark"
        header = raw[3:].split(b"\n")[0].decode("utf-8").split(",")
        for column in ("sender_id", "sender_authority", "recipient_authority"):
            assert column in header, f"column {column} missing"

    def decision_e8_and_tables(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(f"{self.base}explore.html?view=network&{HSA}")
        _loaded(page)
        page.wait_for_selector("#network-graph g.node")
        network_type = page.input_value("#network-type")
        network_rows = page.locator("#network-table tbody tr").count()
        _open_view(page, "timeline")
        timeline_rows = page.locator("#timeline-table tbody tr").count()
        _open_view(page, "activity")
        activity_rows = page.locator("#activity-table tbody tr").count()
        page.click("#export-btn")
        with page.expect_download() as info:
            page.click('#export-modal .export-option[data-format="json"]')
        export = json.loads(Path(info.value.path()).read_text(encoding="utf-8"))
        ctx.close()
        assert network_type == "correspondence", f"network starts as {network_type}"
        assert network_rows > 0, "network has no table of its connections"
        assert timeline_rows > 0 and activity_rows > 0, (
            f"tables: timeline {timeline_rows}, activity {activity_rows}"
        )
        assert export["letterCount"] == len(export["letters"]) > 0, "JSON letters"
        assert export["indices"]["persons"] and export["indices"]["places"], (
            "JSON export without indices"
        )

    def basket_takes_person(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(f"{self.base}explore.html?view=persons&{HSA}")
        _loaded(page)
        page.locator(".btn-person-basket").first.click()
        basket = page.evaluate(
            "() => Object.keys(localStorage).filter(k => k.startsWith('correspexplorer-basket:'))"
            ".map(k => JSON.parse(localStorage.getItem(k)))[0]"
        )
        ctx.close()
        assert basket and len(basket["persons"]) == 1 and not basket["letters"], (
            f"basket after star: {basket}"
        )

    def span_bin_and_map_hint(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(self.base + "index.html")
        page.set_input_files("#file-input", str(DOCS / "data" / "test-uncertainty.xml"))
        page.click("#config-skip-btn")
        page.wait_for_url("**/explore.html*")
        _loaded(page)
        _open_view(page, "timeline")
        page.wait_for_timeout(500)
        span_visible = page.locator("#timeline-span-bin").is_visible()
        _open_view(page, "map")
        _open_view(page, "places")
        url = page.url
        ctx.close()
        assert span_visible, "timeline shows no bin for multi-year spans (case 025)"
        assert "view=places" in url, f"map hint did not open the place list: {url}"

    def drawer_keeps_the_view(self) -> None:
        # A year bar of the timeline opens the letters of that year in the drawer below the view,
        # instead of switching to the letter list; the count comes from the data file
        expected = _hsa_letters_between(1900, 1900)
        ctx = self.context()
        page = ctx.new_page()
        page.goto(f"{self.base}explore.html?view=timeline&{HSA}")
        _loaded(page)
        page.click('.timeline-bar-wrapper[data-year="1900"]', position={"x": 4, "y": 4})
        page.wait_for_selector("#letters-drawer-panel:not(.hidden)")
        count = page.inner_text("#letters-drawer-count").split(" ")[0].replace(".", "")
        url = page.url
        in_list = page.evaluate("() => !!document.activeElement.closest('#letters-drawer-list')")
        ctx.close()
        assert "view=timeline" in url and "drawer=1" in url, f"left the view or lost the drawer: {url}"
        assert count == str(expected), f"drawer shows {count}, data hold {expected} letters of 1900"
        assert in_list, "focus did not move into the list of letters"

    def page_structure(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        styles: list[str] = []
        page.on(
            "request",
            lambda r: (
                styles.append(r.url) if "openfreemap.org/styles/" in r.url else None
            ),
        )
        # Letters view: the sidebar is shown, so its headings count. Every heading in DOM order
        # outside the load error, hidden views included, so no level is skipped anywhere
        page.goto(f"{self.base}explore.html?view=letters&{HSA}")
        _loaded(page)
        heading_problem = page.evaluate(
            "() => { const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]"
            ".filter(h => !h.closest('#load-error')).map(h => Number(h.tagName[1]));"
            " if (hs[0] !== 1) return 'first heading is h' + hs[0];"
            " const i = hs.findIndex((l, k) => k > 0 && l > hs[k - 1] + 1);"
            " return i < 0 ? '' : `h${hs[i - 1]} followed by h${hs[i]} at heading ${i}`; }"
        )
        page.goto(f"{self.base}explore.html?view=overview&{HSA}")
        _loaded(page)
        undescribed = page.evaluate(
            "() => [...document.querySelectorAll('.view-btn')].filter(b =>"
            " document.getElementById(b.getAttribute('aria-describedby'))?.textContent"
            " !== b.dataset.tooltipDesc).map(b => b.dataset.view)"
        )
        _open_view(page, "letters")
        _open_view(page, "topics")
        _open_view(page, "activity")
        years = page.locator("#activity-year-select option").count()
        _open_view(page, "map")
        page.wait_for_timeout(1000)
        ctx.close()
        assert not heading_problem, heading_problem
        assert not undescribed, f"view buttons without description: {undescribed}"
        assert years > 2, f"activity year select has {years} options"
        assert styles and "positron" in styles[0], f"map starts with {styles[:1]}"

    def reduced_motion_network(self) -> None:
        ctx = self.browser.new_context(
            viewport={"width": 1366, "height": 900}, reduced_motion="reduce"
        )
        page = ctx.new_page()
        page.goto(f"{self.base}explore.html?view=network&{HSA}")
        _loaded(page)
        read = (
            "() => [...document.querySelectorAll('#network-graph g.node')]"
            ".slice(0, 20).map(n => n.getAttribute('transform'))"
        )
        page.wait_for_selector("#network-graph g.node")
        first = page.evaluate(read)
        page.wait_for_timeout(700)
        second = page.evaluate(read)
        ctx.close()
        assert first and first == second, "network still moves under reduced motion"
        assert len(set(first)) > 1, "nodes were not laid out"

    def correspsearch_share_link(self) -> None:
        ctx = self.context()
        page = ctx.new_page()
        page.goto(self.base + "index.html")
        page.click(".own-data summary")
        page.fill("#url-input", CS_QUERY)
        page.click("#url-submit")
        page.click("#config-skip-btn", timeout=60_000)
        page.wait_for_url("**/explore.html*")
        _loaded(page)
        link = page.url
        letters = page.inner_text("#total-letters-count")
        ctx.close()
        assert "cs=" in link, f"shared link carries no query: {link}"
        fresh = self.context()
        receiver = fresh.new_page()
        receiver.goto(link)
        _loaded(receiver)
        received = receiver.inner_text("#total-letters-count")
        fresh.close()
        assert received == letters, f"receiver sees {received}, sender {letters}"

    def start_figure(self) -> None:
        # The archive's summary is generated in Python (preprocessing/build_examples.py) and
        # defined in JavaScript (start-summary.js); both must give the same figure
        ctx = self.context()
        page = ctx.new_page()
        page.goto(self.base + "index.html")
        page.wait_for_selector("#model .stmt")
        differs = page.evaluate(
            "async () => { const { summarizeLetters } = await import('./js/start-summary.js');"
            " const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x)"
            " ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x);"
            " const letters = (await (await fetch('data/hsa-letters.json')).json()).letters;"
            " const file = (await (await fetch('data/examples.json')).json()).datasets['data/hsa-letters.json'];"
            " const mine = summarizeLetters(letters);"
            " return Object.keys(mine).filter(k => canon(mine[k]) !== canon(file[k])); }"
        )
        page.click('[data-choice="hsa"]')
        page.wait_for_function("document.getElementById('model').dataset.dataset === 'hsa'")
        network = page.get_attribute(".stmt--persons a.stmt-label", "href")
        absent = page.locator(".stmt--postmark.is-absent").count()
        # "anderer Brief" steps to the next prepared letter and writes it into the address
        first = page.inner_text(".record-sender")
        page.click(".record-other")
        page.wait_for_url("**letter=*")
        stepped = page.inner_text(".record-sender")
        linked = page.url
        # The address restores dataset and letter; an unknown letter falls back to the first
        page.goto(linked)
        page.wait_for_function("document.getElementById('model').dataset.dataset === 'hsa'")
        restored = page.inner_text(".record-sender")
        page.goto(self.base + "index.html?dataset=hsa&letter=unknown")
        page.wait_for_function("document.getElementById('model').dataset.dataset === 'hsa'")
        fallback = page.inner_text(".record-sender")
        ctx.close()
        assert not differs, f"examples.json differs from start-summary.js in {differs}"
        assert network == "explore.html?json=data/hsa-letters.json&view=network", network
        assert absent == 1, "the archive shows a postmark statement it does not carry"
        assert stepped != first and restored == stepped, f"letter {first} -> {stepped} -> {restored}"
        assert fallback == first, f"unknown letter shows {fallback}"

    def axe(self, script: str) -> None:
        ctx = self.context()
        page = ctx.new_page()
        violations: list[str] = []
        for url in [
            "index.html",
            "about.html",
            *(f"explore.html?view={v}&{HSA}" for v in VIEWS),
        ]:
            page.goto(self.base + url)
            if "explore" in url:
                _loaded(page)
            page.wait_for_timeout(800)
            page.add_script_tag(content=script)
            found = page.evaluate(
                "async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}))"
                ".violations.map(v => v.id)"
            )
            violations += [f"{url}: {v}" for v in found]
        ctx.close()
        # The start view on a phone
        phone = self.browser.new_context(viewport={"width": 390, "height": 844})
        page = phone.new_page()
        page.goto(f"{self.base}explore.html?view=overview&{HSA}")
        _loaded(page)
        page.add_script_tag(content=script)
        found = page.evaluate(
            "async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}))"
            ".violations.map(v => v.id)"
        )
        overflow = page.evaluate(
            "() => document.documentElement.scrollWidth > document.documentElement.clientWidth"
        )
        page.screenshot(path=str(Path(tempfile.gettempdir()) / "ce-path-390.png"))
        phone.close()
        violations += [f"active path at 390px: {v}" for v in found]
        assert not overflow, "active path bar overflows at 390px"
        assert not violations, "; ".join(violations)


def _checks(
    smoke: Smoke, args: argparse.Namespace
) -> list[tuple[str, Callable[[], None]]]:
    checks = [
        ("test runner without failure", smoke.test_runner),
        (
            f"all views without errors, HSA under {args.load_limit} s",
            smoke.views_without_errors,
        ),
        (
            "demo link loads the tutorial dataset, network not empty",
            smoke.demo_link_and_network,
        ),
        (
            "tour once per browser, focus back on the view bar",
            smoke.tour_once_per_browser,
        ),
        (
            "link without its dataset reaches the start page with a notice",
            smoke.missing_dataset_notice,
        ),
        ("Back returns to the previous view", smoke.back_returns_to_previous_view),
        ("shared HSA filter link shows the filtered letters", smoke.shared_filter_link),
        ("CSV export with BOM and authority columns", smoke.csv_export),
        ("person star puts the person into the basket", smoke.basket_takes_person),
        (
            "span bin on the timeline, map hint opens the place list",
            smoke.span_bin_and_map_hint,
        ),
        (
            "a year bar opens its letters in the drawer, the timeline stays",
            smoke.drawer_keeps_the_view,
        ),
        (
            "page structure: h1 first, described views, one path bar, light map",
            smoke.page_structure,
        ),
        ("network does not move under reduced motion", smoke.reduced_motion_network),
        (
            "E8: correspondence network, JSON with indices, chart tables",
            smoke.decision_e8_and_tables,
        ),
        (
            "start figure: archive summary equals start-summary.js, links and absences",
            smoke.start_figure,
        ),
    ]
    if args.online:
        checks.append(
            (
                "shared correspSearch link reloads the query",
                smoke.correspsearch_share_link,
            )
        )
    if args.axe:
        script = Path(args.axe).read_text(encoding="utf-8")
        checks.append(
            ("axe-core without violations", functools.partial(smoke.axe, script))
        )
    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--online",
        action="store_true",
        help="include checks against the live correspSearch API",
    )
    parser.add_argument(
        "--axe", help="path to axe.min.js; runs axe-core over the pages"
    )
    parser.add_argument(
        "--load-limit",
        type=float,
        default=5.0,
        help="seconds the HSA dataset may take to load",
    )
    parser.add_argument(
        "--channel", default="chrome", help="Playwright browser channel"
    )
    args = parser.parse_args()
    if args.axe and not Path(args.axe).is_file():
        parser.error(f"--axe: no file at {args.axe}")

    server, base = _serve()
    errors: list[tuple[str, str]] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=args.channel, headless=True)
        smoke = Smoke(browser, base, args.load_limit)
        checks = _checks(smoke, args)
        for name, check in checks:
            # Each check runs on its own, a failure is recorded and the next one still runs
            try:
                check()
                print(f"ok    {name}")
            except Exception as error:  # collect every failure for the report
                errors.append(
                    (
                        name,
                        str(error).splitlines()[0]
                        if str(error)
                        else type(error).__name__,
                    )
                )
                print(f"FAIL  {name}: {errors[-1][1]}")
        browser.close()
    server.shutdown()
    print(f"\n{len(checks) - len(errors)} of {len(checks)} checks passed")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
