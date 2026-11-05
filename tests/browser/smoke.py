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
        focused = page.evaluate("document.activeElement.classList.contains('view-btn')")
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
        page.click('.view-btn[data-view="letters"]')
        page.click('.view-btn[data-view="map"]')
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
        shown = page.inner_text("#total-letters-count").split("\n")[0].replace(".", "")
        ctx.close()
        assert shown == str(expected), (
            f"sidebar shows {shown}, data hold {expected} letters 1890-1891"
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
        page.click('.view-btn[data-view="timeline"]')
        timeline_rows = page.locator("#timeline-table tbody tr").count()
        page.click('.view-btn[data-view="activity"]')
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
        page.click('.view-btn[data-view="timeline"]')
        page.wait_for_timeout(500)
        span_visible = page.locator("#timeline-span-bin").is_visible()
        page.click('.view-btn[data-view="map"]')
        page.click('[data-switch-view="places"]')
        url = page.url
        ctx.close()
        assert span_visible, "timeline shows no bin for multi-year spans (case 025)"
        assert "view=places" in url, f"map hint did not open the place list: {url}"

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
        page.goto(f"{self.base}explore.html?view=overview&{HSA}")
        _loaded(page)
        first_heading = page.evaluate(
            "() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]"
            ".find(h => !h.closest('.hidden'))?.tagName"
        )
        undescribed = page.evaluate(
            "() => [...document.querySelectorAll('.view-btn')].filter(b =>"
            " document.getElementById(b.getAttribute('aria-describedby'))?.textContent"
            " !== b.dataset.tooltipDesc).map(b => b.dataset.view)"
        )
        page.click(".overview-research-paths .question-start-btn >> nth=0")
        path_controls = page.evaluate(
            "() => { const bar = document.getElementById('knowledge-path-bar');"
            " return !bar.classList.contains('hidden') && bar.contains(document.getElementById('path-nav-next'))"
            " && bar.contains(document.getElementById('path-nav-back'))"
            " && document.querySelectorAll('[id^=path-nav]').length === 2; }"
        )
        page.click("#path-bar-close")
        page.click('.view-btn[data-view="letters"]')
        topics_in_letters = page.locator("#topics-filter-group").is_visible()
        page.click('.view-btn[data-view="topics"]')
        topics_in_topics = page.locator("#topics-filter-group").is_visible()
        page.click('.view-btn[data-view="activity"]')
        years = page.locator("#activity-year-select option").count()
        page.click('.view-btn[data-view="map"]')
        page.wait_for_timeout(1000)
        ctx.close()
        assert first_heading == "H1", f"first heading is {first_heading}"
        assert not undescribed, f"view buttons without description: {undescribed}"
        assert path_controls, "knowledge path controls are not one bar"
        assert topics_in_letters and not topics_in_topics, (
            "sidebar topic list should step aside only in the topics view"
        )
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
            "page structure: h1 first, described views, one path bar, light map",
            smoke.page_structure,
        ),
        ("network does not move under reduced motion", smoke.reduced_motion_network),
        (
            "E8: correspondence network, JSON with indices, chart tables",
            smoke.decision_e8_and_tables,
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
