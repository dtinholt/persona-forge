#!/bin/sh
# Runs the stress harness (tests/stress.js) in headless Chrome and prints its JSON report.
# The page loads the harness only over http and only after a HEAD check finds the file, so this script
# serves the build folder on a local port for the run.  Usage: sh tests/stress.sh
set -eu
HERE=$(cd "$(dirname "$0")/.." && pwd)
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE=$(mktemp -d)
PORT=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$HERE" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$PROFILE"' EXIT
sleep 1
"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
  --virtual-time-budget=600000 --timeout=600000 --dump-dom "http://127.0.0.1:$PORT/index.html#stress" 2>/dev/null \
  | python3 -c '
import sys, html, re, json
dom = sys.stdin.read()
m = re.search(r"<pre id=\"stress-out\">(.*?)</pre>", dom, re.S)
if not m:
    print("no stress report in the page"); sys.exit(1)
rep = json.loads(html.unescape(m.group(1)))
bad = 0
for c in rep["cases"]:
    flag = "ok " if c.get("ok") and not c.get("scriptRan") and not c.get("injectedNodes") and not c.get("protoPolluted") else "BAD"
    if flag == "BAD": bad += 1
    extra = {k: v for k, v in c.items() if k not in ("name", "ok")}
    print(flag, c["name"].ljust(34), json.dumps(extra))
sys.exit(1 if bad else 0)
'
