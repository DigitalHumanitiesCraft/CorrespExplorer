"""Serve docs/ locally and mount a corpus folder from outside the repository at data/local/.

Research data that may not be bundled (see knowledge/data.md, Stefan Zweig Digital) stay where
they are. The server answers data/local/files.json with the list of XML files in the folder,
so http://localhost:<port>/index.html?files=data/local/files.json loads the whole corpus.

Usage: python verification/serve_local_corpus.py <corpus dir> [--port 8000]
"""

import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / "docs"
MOUNT = "/data/local/"


class Handler(SimpleHTTPRequestHandler):
    """Static handler for docs/ with one read-only mount."""

    corpus: Path

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if not path.startswith(MOUNT):
            super().do_GET()
            return
        name = path[len(MOUNT):]
        if name == "files.json":
            names = sorted(p.name for p in self.corpus.glob("*.xml"))
            self._send(json.dumps({"files": names}).encode("utf-8"), "application/json")
            return
        # Only plain file names of the corpus folder, never a path
        target = self.corpus / name
        if "/" in name or "\\" in name or not target.is_file() or target.suffix != ".xml":
            self.send_error(404)
            return
        self._send(target.read_bytes(), "application/xml")

    def _send(self, body: bytes, content_type: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self) -> None:
        # Development server: the browser must not keep stale modules across edits
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    if not args.corpus.is_dir():
        parser.error(f"not a folder: {args.corpus}")
    Handler.corpus = args.corpus.resolve()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(DOCS)))
    print(f"http://localhost:{args.port}/index.html?files=data/local/files.json")
    server.serve_forever()


if __name__ == "__main__":
    main()
