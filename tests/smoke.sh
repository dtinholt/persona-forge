#!/bin/sh
# Headless smoke test for Persona Forge.
# Loads index.html#selftest in headless Chrome, asserts the in-page self-check passed (including the live-page
# checks), asserts no uncaught errors reached the console, then unzips the page-built zip with python3 -m zipfile.
# Exits non-zero on any failure.  Usage: sh tests/smoke.sh
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd)
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
fail=0

"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$WORK/profile" \
  --enable-logging=stderr --v=0 --virtual-time-budget=20000 --timeout=120000 \
  --dump-dom "file://$HERE/index.html#selftest" > "$WORK/dom.html" 2> "$WORK/console.log"

python3 - "$WORK" <<'PY' || fail=1
import sys, re, html, json, base64, os, subprocess
work = sys.argv[1]
dom = open(os.path.join(work, "dom.html"), encoding="utf-8").read()
log = open(os.path.join(work, "console.log"), encoding="utf-8", errors="replace").read()
ok = True
m = re.search(r'<p id="selfcheck"([^>]*)>(.*?)</p>', dom, re.S)
if not m:
    print("FAIL no self-check footer in the page"); sys.exit(1)
attrs, text = m.group(1), html.unescape(m.group(2))
status = re.search(r'data-selfcheck="(\w+)"', attrs)
count = re.search(r'data-count="(\d+)"', attrs)
passed = re.search(r'data-passed="(\d+)"', attrs)
print("self-check:", text.strip())
if not status or status.group(1) != "pass" or "live-page" not in text:
    ok = False
    f = re.search(r'<pre id="selfcheck-fail"[^>]*>(.*?)</pre>', dom, re.S)
    if f:
        for item in json.loads(html.unescape(f.group(1))):
            print("  FAIL", item["group"], "|", item["check"], "|", item.get("detail", ""))
    print("FAIL self-check did not pass")
else:
    print("ok   self-check passed %s of %s" % (passed.group(1), count.group(1)))
errs = [l for l in log.splitlines() if "CONSOLE" in l and re.search(r"Uncaught|TypeError|ReferenceError|SyntaxError", l)]
if errs:
    ok = False
    print("FAIL uncaught errors in the console:"); [print("  ", e[:300]) for e in errs[:10]]
else:
    print("ok   no uncaught errors in the console")
z = re.search(r'<pre id="zip-b64"[^>]*>(.*?)</pre>', dom, re.S)
if not z:
    ok = False; print("FAIL page did not emit the zip")
else:
    path = os.path.join(work, "package.zip")
    open(path, "wb").write(base64.b64decode(html.unescape(z.group(1)).strip()))
    t = subprocess.run([sys.executable, "-m", "zipfile", "-t", path], capture_output=True, text=True)
    l = subprocess.run([sys.executable, "-m", "zipfile", "-l", path], capture_output=True, text=True)
    out = os.path.join(work, "unzipped")
    e = subprocess.run([sys.executable, "-m", "zipfile", "-e", path, out], capture_output=True, text=True)
    names = sorted(os.path.relpath(os.path.join(r, f), out) for r, _, fs in os.walk(out) for f in fs)
    need = ["persona-definition.md", "sop.yaml", "measurement-blueprint.md", "delegation-checklist.md", "vanilla-dry-run-pack.md",
            "vanilla-agent-log-frontier.md", "vanilla-agent-log-mid.md", "vanilla-agent-log-small.md", "readiness-report.md",
            "handoff-register.md", "second-persona-state.json", "persona-forge-state.json"]
    base = [os.path.basename(n) for n in names]
    missing = [n for n in need if n not in base]
    if t.returncode != 0 or e.returncode != 0 or missing:
        ok = False; print("FAIL python3 -m zipfile:", t.stdout, t.stderr, e.stderr, "missing:", missing)
    else:
        print("ok   python3 -m zipfile -t passed; %d files extracted" % len(names))
        state = json.load(open(os.path.join(out, [n for n in names if n.endswith("persona-forge-state.json")][0]), encoding="utf-8"))
        pkg = open(os.path.join(out, [n for n in names if n.endswith("persona-definition.md")][0]), encoding="utf-8").read()
        heads = re.findall(r"^## (\d+)\. ", pkg, re.M)
        if state.get("exampleId") != "supplier" or [int(h) for h in heads] != list(range(1, 20)):
            ok = False; print("FAIL unzipped content: state or package headings wrong")
        else:
            print("ok   unzipped state is the supplier example; package has sections 1 to 19")
        try:
            import yaml  # optional
            yaml.safe_load(open(os.path.join(out, [n for n in names if n.endswith("sop.yaml")][0]), encoding="utf-8"))
            print("ok   sop.yaml loads with PyYAML")
        except ImportError:
            print("skip PyYAML not installed")
        except Exception as ex:
            ok = False; print("FAIL sop.yaml did not load with PyYAML:", ex)
sys.exit(0 if ok else 1)
PY
# #example=constructor must load the page (blank draft, a notice) with the self-check passing.
"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$WORK/profile2" --virtual-time-budget=5000 \
  --dump-dom "file://$HERE/index.html#example=constructor" > "$WORK/ctor.html" 2>/dev/null
if grep -q 'data-selfcheck="pass"' "$WORK/ctor.html" && grep -q 'No worked example called' "$WORK/ctor.html"; then
  echo "ok   #example=constructor loads a blank page with a notice"
else echo "FAIL #example=constructor"; fail=1; fi

# #stress over file:// must not load the harness.
"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$WORK/profile3" --virtual-time-budget=5000 \
  --dump-dom "file://$HERE/index.html#stress" > "$WORK/stress.html" 2>/dev/null
if grep -q 'stress-out' "$WORK/stress.html"; then echo "FAIL the stress harness loaded from a file:// hash"; fail=1
else echo "ok   #stress over file:// does not load the harness"; fi

# Optional: rule quotes in forge-check.js appear verbatim in the reference set (set REF_DIR to the references folder).
if [ -n "${REF_DIR:-}" ] && [ -d "$REF_DIR" ]; then
  python3 - "$HERE/forge-check.js" "$REF_DIR" <<'PY2' || fail=1
import sys, re, glob, os
src = open(sys.argv[1], encoding="utf-8").read()
ref = ""
for f in glob.glob(os.path.join(sys.argv[2], "**", "*.md"), recursive=True):
    ref += open(f, encoding="utf-8").read() + "\n"
def norm(x): return re.sub(r"\s+", " ", re.sub(r"[`*]", "", x)).strip()
R = norm(ref); bad = 0; n = 0
for m in re.finditer(r'(\w+): \{ src: "[^"]*",( para: true,)? quote: "((?:[^"\\]|\\.)*)" \}', src):
    if m.group(2): continue
    n += 1; q = norm(m.group(3).replace('\\"', '"'))
    if q not in R: bad += 1; print("FAIL rule quote not verbatim:", m.group(1), "|", q[:90])
print(("ok   %d rule quotes found verbatim in the reference set" % n) if not bad else "FAIL %d rule quotes" % bad)
sys.exit(1 if bad else 0)
PY2
else echo "skip REF_DIR not set; rule quotes not compared with the reference set"; fi

if [ "$fail" -ne 0 ]; then echo "SMOKE FAILED"; exit 1; fi
echo "SMOKE PASSED"
