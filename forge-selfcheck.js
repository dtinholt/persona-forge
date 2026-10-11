/* Persona Forge self-check. Runs on every load against the three worked examples and crafted states.
   PersonaForge.selfCheck() reruns the synchronous checks; #selftest in the URL adds the live-DOM checks
   (hostile text rendered into every step, tab and the print view, then a wait to confirm nothing executed)
   and writes the zip as base64 into <pre id="zip-b64"> for tests/smoke.sh to unzip with python3 -m zipfile. */
(function () {
  "use strict";
  var NS = window.PersonaForge;
  var PAY = "<script>window.__pfPwned=1<\/script><img src=x onerror=\"window.__pfPwned=2\"><svg onload=\"window.__pfPwned=3\"></svg>";

  function hostileState() {
    var s = NS.exampleState("supplier");
    (function walk(o) {
      Object.keys(o).forEach(function (k) {
        if (k === "overrides" || k === "exampleId") return;
        if (o[k] && typeof o[k] === "object") walk(o[k]);
        else if (typeof o[k] === "string" && ["finLimit", "authorityType", "style", "environment", "integration", "attribution", "dataClass", "deployment", "status", "industry", "data", "impact", "geo", "override", "direction", "sopOwner", "archetype"].indexOf(k) < 0)
          o[k] = PAY + " Zoë 李 ‮\r\n" + o[k];
      });
    })(s);
    s.overrides = { 4: "Edited section with " + PAY + "\r\nand a second line" };
    return NS.sanitize(s);
  }
  function unsafeNodes(html) {
    var doc = new DOMParser().parseFromString("<!doctype html><body>" + html, "text/html");
    var bad = doc.querySelectorAll("script, img, svg, iframe, object, embed").length;
    Array.prototype.forEach.call(doc.querySelectorAll("*"), function (el) { Array.prototype.forEach.call(el.attributes, function (a) { if (/^on/i.test(a.name)) bad++; }); });
    return bad;
  }
  function parseHTML(html) { return new DOMParser().parseFromString("<!doctype html><body>" + html, "text/html"); }
  function ids(fs) { return fs.map(function (f) { return f.id; }); }
  function has(fs, prefix) { return fs.some(function (f) { return f.id.indexOf(prefix) === 0; }); }

  function selfCheck() {
    var results = [], t0 = performance.now();
    function ok(group, name, pass, detail) { results.push({ group: group, check: name, pass: !!pass, detail: detail || "" }); }
    function tryOk(group, name, fn) { try { var r = fn(); ok(group, name, r === true || (r && r.pass), r && r.detail); } catch (e) { ok(group, name, false, "threw: " + e.message); } }
    var ex = NS.exampleState("supplier"), ap = NS.exampleState("ap"), rp = NS.exampleState("report");
    var EX = { supplier: ex, ap: ap, report: rp };

    /* A. package, SOP, blueprint, prompts (supplier example) */
    var pkg = NS.genPackage(ex), heads = pkg.match(/^## (\d+)\. /gm) || [], nums = heads.map(function (h) { return Number(h.match(/\d+/)[0]); });
    ok("package", "package has 19 numbered sections", heads.length === 19, heads.length + " found");
    ok("package", "sections numbered 1 to 19 in order", nums.every(function (n, i) { return n === i + 1; }));
    ok("package", "section titles match the template", NS.SECTIONS.every(function (s) { return pkg.indexOf("## " + s[0] + ". " + s[1] + " ") >= 0; }));
    ok("package", "tiered checklist uses the template wording", pkg.indexOf("- [ ] **Section 18 (full):** Compliance Officer sign-off obtained in addition to Business Owner and AI RM") >= 0 && pkg.indexOf("**Section 6 (partial):** Permitted data sources (6.1) and data restrictions (6.3) specified") >= 0);
    var y = NS.genSOP(ex), parsed = null, err = "";
    try { parsed = NS.parseYAML(y); } catch (e) { err = e.message; }
    ok("sop", "SOP YAML parses", parsed !== null, err);
    ok("sop", "SOP YAML round-trips to the same object", parsed && NS.deepEqual(parsed, NS.sopObject(ex)));
    ok("sop", "SOP carries every sop-schema section", parsed && ["metadata", "purpose_delegated_outcome", "trigger", "inputs", "procedure", "control_points", "vanilla_agent_test_summary", "compliance_notes", "mcp_payload_contract"].every(function (k) { return k in parsed.sop; }));
    ok("sop", "supplier procedure has 8 steps", parsed && parsed.sop.procedure.length === 8);
    var bad = false; try { NS.parseYAML("a: plain words"); } catch (e) { bad = true; }
    ok("sop", "YAML check rejects unquoted text", bad);
    ok("sop", "every example's SOP YAML parses and round-trips", ["supplier", "ap", "report"].every(function (k) { return NS.yamlCheck(EX[k]).ok; }));
    ok("sop", "hostile text still yields parseable YAML", NS.yamlCheck(hostileState()).ok, NS.yamlCheck(hostileState()).error);
    ok("checklist", "delegation checklist has 8 items", NS.checklistItems(ex).length === 8);
    var bp = NS.genBlueprint(ex);
    ok("blueprint", "blueprint has the template's 8 sections", (bp.match(/^## \d\. /gm) || []).length === 8);
    ok("blueprint", "blueprint names all twelve measure types", Object.keys(NS.MEASURE_TYPES).every(function (x) { return new RegExp("\\b" + x + ":").test(bp); }));
    var dry = NS.genDryRunMd(ex), promptHeads = (dry.match(/^## Prompt: .+$/gm) || []).map(function (h) { return h.slice(11); });
    ok("dryrun", "prompt labels are exactly frontier / mid / small", promptHeads.join(",") === "frontier,mid,small");

    /* B. three examples, one per tier path */
    var PATH = { supplier: [3, 2], ap: [2, 3], report: [1, 4] };
    ["supplier", "ap", "report"].forEach(function (k) {
      var s = EX[k], tr = NS.computeTier(s), T = tr.effective;
      ok("examples", k + ": Tier " + PATH[k][0] + " by decision tree step " + (PATH[k][1] + 1), tr.computed === PATH[k][0] && tr.hitAt === PATH[k][1], "Tier " + tr.computed + ", step " + (tr.hitAt + 1));
      var open = NS.TIER_SECTIONS[T].filter(function (n) { return NS.sectionMissing(s, n, T).length; });
      ok("examples", k + ": only Section 18 open (sign-offs pending on purpose)", open.join(",") === "18", "open: " + open.join(","));
      ok("examples", k + ": no blocking consistency finding", !NS.check.consistency(s).some(function (f) { return f.severity === "block"; }), ids(NS.check.consistency(s).filter(function (f) { return f.severity === "block"; })).join(","));
      var outs = [NS.genPackage(s), NS.genSOP(s), NS.genBlueprint(s), NS.genChecklist(s), NS.genHandoff(s), NS.check.readinessMd(s)].concat(NS.MODEL_TIERS.map(function (m) { return NS.genPrompt(s, m[0]); })).concat(NS.MODEL_TIERS.map(function (m) { return NS.genLog(s, m[0]); }));
      ok("examples", k + ": every output carries the worked-example line", outs.every(function (o) { return o.indexOf(NS.EXAMPLE_LINE) >= 0; }));
    });
    ok("examples", "a blank draft carries no worked-example line", [NS.genPackage(NS.blankState()), NS.genLog(NS.blankState(), "mid"), NS.check.readinessMd(NS.blankState())].every(function (o) { return o.indexOf(NS.EXAMPLE_LINE) < 0; }));
    ok("examples", "Tier 1 example leaves Tier 2 and 3 sections deferrable and unfilled", NS.sectionMissing(rp, 7, 2).length > 0 && NS.sectionMissing(rp, 11, 3).length > 0);

    /* C. completeness meter and sign-off blockers */
    var cb = NS.check.completeness(NS.blankState());
    ok("meter", "required counts per tier are 8, 13 and 19", cb.tiers.map(function (r) { return r.required.length; }).join(",") === "8,13,19");
    ok("meter", "blank draft: nothing complete at any tier", cb.tiers.every(function (r) { return r.complete.length === 0; }));
    var cs = NS.check.completeness(ex);
    ok("meter", "supplier: assigned Tier 3, 18 of 19 complete", cs.assigned === 3 && cs.tiers[2].complete.length === 18);
    ok("meter", "open Section 18 at Tier 3 quotes both checklist lines", cs.tiers[2].open[0] && cs.tiers[2].open[0].checklist.length === 2 && cs.tiers[2].open[0].checklist[1].indexOf("Compliance Officer sign-off") === 0);
    var bb = NS.check.blockers(NS.blankState());
    ok("meter", "blank draft: open sections block sign-off", bb.before.filter(function (b) { return b.kind === "section"; }).length === 18, bb.before.length + " blockers");
    var bs = NS.check.blockers(ex);
    ok("meter", "supplier: nothing blocks sign-off but three signatures", bs.before.length === 0 && bs.signatures.length === 3, bs.signatures.join("; "));
    ok("meter", "AP example (Tier 2): two signatures, no Compliance Officer", NS.check.blockers(ap).signatures.length === 2);
    ok("meter", "a signature needs two words of letters and no placeholder", !NS.signed("Head of Procurement, pending") && NS.signed("J. Rivera, 2026-10-09") && !NS.signed("Ann") && !NS.signed("TBD Smith") && !NS.signed("x") && !NS.signed("-") && !NS.signed("n/a") && !NS.signed("Awaiting Compliance") && !NS.signed("`[Name, Date, Signature]`") && !NS.signed("2026-10-09"));
    ok("meter", "release gate lists all three model tiers", /Frontier: not yet run; Mid: not yet run; Small: not yet run/.test(bs.gate));

    /* D. consistency rules, each fired by a crafted state and traced to its rule */
    function lowTier1() { var s = NS.exampleState("report"); return s; }
    tryOk("consistency", "Tier 1 persona with a $200K bound in its authority text blocks, citing the $50K qualifier", function () {
      var s = lowTier1(); s.auth.sentence = "The persona may approve refunds up to $200,000 per case."; s.q.finLimit = "";
      var f = NS.check.consistency(s).filter(function (x) { return x.id === "bound-tier"; })[0];
      return { pass: NS.computeTier(s).effective === 1 && f && f.severity === "block" && /decision tree step 2/.test(f.source) && /\$50K/.test(f.rule), detail: f ? f.text : "no finding" };
    });
    tryOk("consistency", "entering the $200K bound in the field moves the persona to Tier 3", function () { var s = lowTier1(); s.auth.sentence = "up to $200,000"; s.q.finLimit = "200000"; return NS.computeTier(s).effective === 3 && !has(NS.check.consistency(s), "bound-tier"); });
    tryOk("consistency", "a further measure with no measure type blocks", function () { var s = NS.exampleState("ap"); s.meas.extra = "Approver satisfaction |  | 4 of 5 | Weekly"; var f = NS.check.consistency(s).filter(function (x) { return x.id === "type-missing-0"; })[0]; return f && f.severity === "block" && /12 standardized types/.test(f.rule); });
    tryOk("consistency", "a measure typed KPI is pointed at KPI_OUTCOME", function () { var s = NS.exampleState("ap"); s.meas.extra = "Approval rate | KPI | 90% | Monthly"; var f = NS.check.consistency(s).filter(function (x) { return x.id === "type-unknown-0"; })[0]; return f && /KPI_OUTCOME/.test(f.text); });
    tryOk("consistency", "escalation threshold above the decision bound blocks (gap)", function () { var s = NS.exampleState("ap"); s.esc.triggers = "Variance above $25,000"; s.sop.controlPoints = ""; s.esc.exceptions = ""; var f = NS.check.consistency(s).filter(function (x) { return x.id === "esc-gap"; })[0]; return f && f.severity === "block" && /Chapter-07/.test(f.source); });
    tryOk("consistency", "a bound with no escalation amount warns", function () { var s = NS.exampleState("ap"); s.esc.triggers = "Supplier disputes"; s.sop.controlPoints = ""; s.esc.exceptions = ""; return has(NS.check.consistency(s), "esc-no-amount"); });
    tryOk("consistency", "a trigger below the bound is fine", function () { var s = NS.exampleState("ap"); s.esc.triggers = "Variance above $4,000"; return !has(NS.check.consistency(s), "esc-gap") && !has(NS.check.consistency(s), "esc-no-amount"); });
    tryOk("consistency", "LOW decision impact with spend authority warns", function () { var s = lowTier1(); s.q.finLimit = "1000"; return has(NS.check.consistency(s), "impact-spend"); });
    tryOk("consistency", "LOW decision impact with write access warns", function () { var s = lowTier1(); s.q.tools += "\nTicketing | Write | Create tickets | None"; return has(NS.check.consistency(s), "impact-write"); });
    tryOk("consistency", "an action both permitted and prohibited blocks", function () { var s = NS.exampleState("ap"); s.q.prohibited += "\nRead exception record"; var f = NS.check.consistency(s).filter(function (x) { return x.id.indexOf("act-prohibited") === 0; })[0]; return f && f.severity === "block"; });
    tryOk("consistency", "a duplicated action warns", function () { var s = NS.exampleState("ap"); s.q.actions += "\nRead exception record | x | y | No"; return has(NS.check.consistency(s), "act-dup"); });
    tryOk("consistency", "an incident mapped to Tier 3 with a 4-hour SLA warns", function () { var s = NS.exampleState("ap"); s.esc.incSec = "Tier 3 (Systemic Risk), 4-hour SLA"; return has(NS.check.consistency(s), "sla-incSec"); });
    tryOk("consistency", "confidence 185% warns; 0.85 and 85 do not", function () { var s = NS.exampleState("ap"); s.esc.confidence = "185%"; var a = has(NS.check.consistency(s), "confidence"); s.esc.confidence = "0.85"; var b = has(NS.check.consistency(s), "confidence"); s.esc.confidence = "85"; var c = has(NS.check.consistency(s), "confidence"); return a && !b && !c; });
    tryOk("consistency", "a KPI target without a number warns", function () { var s = NS.exampleState("ap"); s.q.kpiTarget = "high"; return has(NS.check.consistency(s), "kpi-target"); });
    tryOk("consistency", "an indirect KPI without attribution warns; claiming Direct Attribution blocks", function () { var s = NS.exampleState("ap"); s.q.testCausality = false; s.meas.attribution = ""; var a = has(NS.check.consistency(s), "kpi-indirect"); s.meas.attribution = "Direct Attribution"; var f = NS.check.consistency(s).filter(function (x) { return x.id === "kpi-direct-claim"; })[0]; return a && f && f.severity === "block"; });
    tryOk("consistency", "review date before effective date warns; impossible dates warn", function () { var s = NS.exampleState("ap"); s.id.effectiveDate = "2026-12-31"; s.id.reviewDate = "2026-03-08"; var a = has(NS.check.consistency(s), "date-order"); s.id.effectiveDate = "2026-02-30"; return a && has(NS.check.consistency(s), "date-eff"); });
    tryOk("consistency", "dates across the year end in order raise nothing", function () { var s = NS.exampleState("ap"); s.id.effectiveDate = "2026-12-31"; s.id.reviewDate = "2027-01-01"; return !has(NS.check.consistency(s), "date-"); });
    tryOk("consistency", "Tier 3 with Full Deployment warns, citing Chapter 9", function () { var s = NS.exampleState("supplier"); s.team.deployment = "Full Deployment"; var f = NS.check.consistency(s).filter(function (x) { return x.id === "t3-rollout"; })[0]; return f && /Chapter-09/.test(f.source); });
    tryOk("consistency", "Tier 3 test-scenario finding is an info note, never a blocker", function () { var f = NS.check.consistency(NS.exampleState("supplier")).filter(function (x) { return x.id === "t3-scenarios"; })[0]; return f && f.severity === "info"; });
    tryOk("consistency", "status Approved with open sections blocks", function () { var s = NS.blankState(); s.id.status = "Approved"; return has(NS.check.consistency(s), "status-open"); });
    tryOk("consistency", "negative or NaN financial authority blocks", function () { var s = NS.exampleState("ap"); s.q.finLimit = "-5"; var a = has(NS.check.consistency(s), "fin-invalid"); s.q.finLimit = "NaN"; return a && has(NS.check.consistency(s), "fin-invalid"); });
    tryOk("consistency", "Invoker Authority with nobody named to invoke warns", function () { var s = lowTier1(); s.q.invokers = ""; return has(NS.check.consistency(s), "invoker"); });
    tryOk("consistency", "every finding carries a rule quote and a reference-set source", function () {
      var all = []; [NS.blankState(), hostileState(), ex, ap, rp].forEach(function (s) { all = all.concat(NS.check.consistency(s)); });
      var s2 = NS.exampleState("ap"); s2.q.finLimit = "-1"; s2.esc.incSec = "Tier 1, 15-minute"; s2.meas.extra = "x | | |"; all = all.concat(NS.check.consistency(s2));
      return all.length > 0 && all.every(function (f) { return f.rule && /\.md|notes/.test(f.source) && f.text && (f.severity === "block" || f.severity === "warn" || f.severity === "info"); });
    });
    tryOk("consistency", "dollar parser reads $200,000, $200K, $1.5M and USD 50000", function () { return NS.check.amounts("a $200,000 b $200K c $1.5M d USD 50000").join(",") === "200000,200000,1500000,50000"; });

    /* E. round trip: import(export(state)) deep-equals state */
    function rt(s) { var back = NS.io.importPackage(NS.io.packageWithState(s), null); return NS.deepEqual(back.state, s) && back.report.embedded; }
    ["supplier", "ap", "report"].forEach(function (k) { tryOk("roundtrip", k + ": import(export(state)) deep-equals state", function () { return rt(EX[k]); }); });
    tryOk("roundtrip", "blank draft round-trips", function () { return rt(NS.blankState()); });
    tryOk("roundtrip", "hostile text, unicode, CR line endings and an edited section round-trip", function () { return rt(hostileState()); });
    tryOk("roundtrip", "JSON export and import round-trip", function () { var s = hostileState(); return NS.deepEqual(NS.importJSON(JSON.stringify(s)).state, s); });
    tryOk("roundtrip", "a section edited after export comes back as an edited section", function () {
      var txt = NS.io.packageWithState(ex).replace("### 4.1 Primary Intent", "### 4.1 Primary Intent\n\nAdded by hand after export.");
      var r = NS.io.importPackage(txt, null), st = r.report.sections;
      return st.filter(function (x) { return x.status === "edited"; }).map(function (x) { return x.n; }).join(",") === "4" && /Added by hand/.test(r.state.overrides[4]) && st.filter(function (x) { return x.status === "same"; }).length === 18;
    });
    tryOk("roundtrip", "a package without the state comment: fields read, every section reproduced", function () {
      var txt = NS.genPackage(ex), r = NS.io.importPackage(txt, null), again = NS.io.parseSections(NS.genPackage(r.state)).sections, orig = NS.io.parseSections(txt).sections;
      var same = NS.SECTIONS.every(function (sc) { return NS.io.normSec(again[sc[0]]) === NS.io.normSec(orig[sc[0]]); });
      return { pass: !r.report.embedded && r.state.id.name === ex.id.name && r.state.q.outcome === ex.q.outcome && r.state.sop.id === "" && same && r.report.extracted.length >= 15, detail: r.report.extracted.length + " fields read" };
    });
    tryOk("roundtrip", "the diff marks a changed line", function () { return NS.io.diff("a\nb\nc", "a\nx\nc").map(function (o) { return o[0] + o[1]; }).join("|") === " a|-b|+x| c"; });
    tryOk("roundtrip", "a stray section heading inside another section stays text", function () { var p = NS.io.parseSections("## 5. Capabilities\nx\n## 3. Not a heading here\ny\n## 6. Data Contract\nz"); return /Not a heading/.test(p.sections[5]) && !p.sections[3] && p.notes.length === 1; });
    tryOk("roundtrip", "empty text and text without sections are refused", function () { var a = false, b = false; try { NS.io.importPackage("", null); } catch (e) { a = true; } try { NS.io.importPackage("just words", null); } catch (e) { b = true; } return a && b; });
    tryOk("roundtrip", "a corrupted state comment falls back to reading the text", function () { var txt = NS.io.packageWithState(ap).replace(/(persona-forge-state v2\n[^\n]*\n)[A-Za-z0-9+/]{8}/, "$1!!!!!!!!"); var r = NS.io.importPackage(txt, null); return !r.report.embedded && r.state.id.name === ap.id.name; });
    tryOk("roundtrip", "the import report renders no markup from the file", function () { var r = NS.io.importPackage(NS.genPackage(hostileState()), null); return unsafeNodes(NS.io.reportHTML(r.report)) === 0; });

    /* F. zip */
    ok("zip", "CRC-32 of \"123456789\" is CBF43926", NS.io.crc32(NS.io.utf8("123456789")) === 0xCBF43926);
    ok("zip", "CRC-32 of empty input is 0", NS.io.crc32(new Uint8Array(0)) === 0);
    var zipNow = new Date(2026, 9, 10, 9, 30, 0), z = null, back = null;
    tryOk("zip", "supplier zip unzips with every CRC intact", function () { z = NS.io.buildZip(ex, zipNow); back = NS.io.unzip(z.bytes); return back.length === z.files.length; });
    tryOk("zip", "zip carries package, SOP, blueprint, checklist, dry-run pack, three logs, readiness, handoff and state", function () {
      var names = back.map(function (f) { return f.name.split("/").pop(); }).join(",");
      return ["persona-definition.md", "sop.yaml", "measurement-blueprint.md", "delegation-checklist.md", "vanilla-dry-run-pack.md", "vanilla-agent-log-frontier.md", "vanilla-agent-log-mid.md", "vanilla-agent-log-small.md", "readiness-report.md", "handoff-register.md", "second-persona-state.json", "persona-forge-state.json"].every(function (n) { return names.indexOf(n) >= 0; });
    });
    tryOk("zip", "every zip entry matches the generated file byte for byte", function () { return back.every(function (f, i) { return f.name === z.files[i].name && f.text === z.files[i].data; }); });
    tryOk("zip", "the state file in the zip restores the draft", function () { var st = back.filter(function (f) { return /persona-forge-state\.json$/.test(f.name); })[0]; return NS.deepEqual(NS.importJSON(st.text).state, ex); });
    tryOk("zip", "the package in the zip round-trips", function () { var p = back.filter(function (f) { return /persona-definition\.md$/.test(f.name); })[0]; return NS.deepEqual(NS.io.importPackage(p.text, null).state, ex); });
    tryOk("zip", "no handoff files when no handoff is modelled", function () { return !NS.io.buildZip(ap, zipNow).files.some(function (f) { return /handoff|second-persona/.test(f.name); }); });
    tryOk("zip", "UTF-8 names and text survive", function () { var u = NS.io.unzip(NS.io.zip([{ name: "tëst/ü 李.md", data: "Zoë 🚚" }])); return u[0].name === "tëst/ü 李.md" && u[0].text === "Zoë 🚚"; });
    tryOk("zip", "duplicate file names are refused", function () { try { NS.io.zip([{ name: "a", data: "1" }, { name: "a", data: "2" }]); return false; } catch (e) { return true; } });
    tryOk("zip", "a damaged byte is caught by the CRC", function () { var b = NS.io.zip([{ name: "a.txt", data: "hello world" }]); b[35] ^= 1; try { NS.io.unzip(b); return false; } catch (e) { return /CRC/.test(e.message); } });

    /* G. dry runs: three stored runs and their logs */
    var dr = NS.blankState(); dr.sop.id = "SOP-T-1"; dr.sop.steps = "Do one | e | o\nDo two | e | o";
    ok("dryrun", "blank: all three runs read not yet run", NS.MODEL_TIERS.every(function (m) { return NS.verdict(dr, m[0]) === "not yet run"; }) && NS.vanillaSummary(dr).result === "not yet run");
    NS.CRITERIA.forEach(function (c) { dr.scoring.frontier[c[0]] = true; dr.scoring.small[c[0]] = true; }); dr.scoring.frontier.date = "2026-10-08";
    ok("dryrun", "six ticks without date, trace and evidence is an incomplete record", NS.verdict(dr, "small") === "incomplete record" && /incomplete record \(all six criteria ticked; missing date, trace, evidence\)/.test(NS.genLog(dr, "small")));
    NS.CRITERIA.forEach(function (c) { dr.scoring.small[c[0]] = false; });
    ok("dryrun", "six ticks and a date but no trace or evidence is still incomplete", NS.verdict(dr, "frontier") === "incomplete record");
    dr.scoring.frontier.trace = "1 | SIM-A1 | ran step 1 | none"; dr.scoring.frontier.evidence = "logs/frontier-run.md";
    dr.scoring.mid.c1 = true; dr.scoring.mid.date = "2026-10-09"; dr.scoring.mid.trace = "1 | SIM-A1 | read the case | none\n2 | SIM-A2 | asked a question | CLARIFICATION NEEDED";
    ok("dryrun", "all six ticked is pass; one ticked is hold; untouched stays not yet run", NS.verdict(dr, "frontier") === "pass" && NS.verdict(dr, "mid") === "hold" && NS.verdict(dr, "small") === "not yet run");
    ok("dryrun", "runs keep their own dates", dr.scoring.frontier.date !== dr.scoring.mid.date && NS.genLog(dr, "mid").indexOf("- **Date:** 2026-10-09") >= 0);
    var lg = NS.genLog(dr, "mid"), order = ["# Vanilla-Agent Test Log – SOP-T-1", "## Scenario Overview", "- **Date:**", "- **Facilitator:**", "- **Persona:**", "- **SOP Version:**", "- **Trigger Condition:**", "## Expected Behavior", "## Actual Behavior & MCP Trace", "| Step | MCP Interaction ID | Observations | Issues |", "| --- | --- | --- | --- |", "## Result", "- **Outcome:**", "- **Decision Owner:**", "- **Follow-up Actions:**", "- **Next Test Date:**", "## Evidence Attachments"];
    var pos = order.map(function (x) { return lg.indexOf(x); });
    ok("dryrun", "log follows the vanilla-agent-log template, headings and fields in order", pos.every(function (p, i) { return p >= 0 && (i === 0 || p > pos[i - 1]); }), pos.join(","));
    ok("dryrun", "log outcome per run: pass / hold with unmet criteria / not yet run", /\*\*Outcome:\*\* pass\n/.test(NS.genLog(dr, "frontier")) && /\*\*Outcome:\*\* hold \(criteria not met: C2, C3, C4, C5, C6\)/.test(lg) && /\*\*Outcome:\*\* not yet run/.test(NS.genLog(dr, "small")));
    ok("dryrun", "trace rows become table rows", lg.indexOf("| 2 | SIM-A2 | asked a question | CLARIFICATION NEEDED |") >= 0);
    ok("dryrun", "an unrecorded trace leaves one blank row per SOP step", /\| 1 \| +\| +\| +\|\n\| 2 \| +\|/.test(NS.genLog(dr, "small")));
    ok("dryrun", "Chapter 9 rule quoted in each log, the scoring sheet and the pack", lg.indexOf(NS.CH9_RULE) >= 0 && NS.genScoringMd(dr).indexOf(NS.CH9_RULE) >= 0 && NS.genDryRunMd(dr).indexOf(NS.CH9_FAIL) >= 0);
    ok("dryrun", "SOP summary: pass once any run passes, last run is the latest date", NS.vanillaSummary(dr).result === "pass" && NS.vanillaSummary(dr).last_run === "2026-10-09");
    ok("dryrun", "schema 1 drafts move their shared date into each run", (function () { var s = NS.sanitize({ id: {}, q: {}, scoring: { date: "2026-01-02", facilitator: "Ann", mid: { c1: true } } }); return s.scoring.frontier.date === "2026-01-02" && s.scoring.small.facilitator === "Ann" && s.scoring.mid.c1 === true; })());
    ok("dryrun", "pack carries the three logs", (NS.genDryRunMd(dr).match(/^### Vanilla-Agent Test Log – /gm) || []).length === 3);

    /* H. print view */
    var ph = parseHTML(NS.io.printHTML(ex)), h2 = Array.prototype.map.call(ph.querySelectorAll("h2"), function (h) { return h.textContent; });
    ok("print", "print view has the 19 sections in order", h2.filter(function (x) { return /^\d+\. /.test(x); }).map(function (x) { return parseInt(x, 10); }).join(",") === "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19");
    var sigRows = Array.prototype.map.call(ph.querySelectorAll(".signoff tbody tr"), function (r) { return r.cells[0].textContent; });
    ok("print", "sign-off block lists Business Owner, AI RM and Compliance Officer", h2[h2.length - 1] === "Sign-off" && sigRows.length === 3 && /Business Owner/.test(sigRows[0]) && /Compliance Officer/.test(sigRows[2]) && !/if required/.test(sigRows[2]));
    ok("print", "below Tier 3 the Compliance Officer line reads if required", /if required/.test(parseHTML(NS.io.printHTML(rp)).querySelectorAll(".signoff tbody tr")[2].textContent));
    ok("print", "pending sign-offs print as blank name lines", Array.prototype.every.call(ph.querySelectorAll(".signoff tbody tr"), function (r) { return !/pending/.test(r.cells[1].textContent); }));
    ok("print", "tables, lists and bold render as HTML", ph.querySelectorAll("table").length > 10 && ph.querySelectorAll("li").length > 50 && ph.querySelectorAll("strong").length > 50);
    ok("print", "hostile text prints as text", unsafeNodes(NS.io.printHTML(hostileState())) === 0);
    ok("print", "print stylesheet shows only the print document", (function () {
      try { return Array.prototype.some.call(document.styleSheets, function (sh) { var r; try { r = sh.cssRules; } catch (e) { return false; } return Array.prototype.some.call(r, function (rule) { return rule.media && /print/.test(rule.media.mediaText) && /#print-doc/.test(rule.cssText); }); }); } catch (e) { return false; }
    })());

    /* I. escaping: hostile text in every rendered view parses to no live markup */
    var saved = NS.getState();
    try {
      NS.setState(hostileState());
      var allSteps = 0;
      for (var i = 0; i < NS.STEPS.length; i++) allSteps += unsafeNodes(NS.stepHTML(i));
      ok("escaping", "every step renders hostile text as text", allSteps === 0, allSteps + " live nodes");
      ok("escaping", "dry-run panel renders hostile text as text", unsafeNodes(NS.dryPanelHTML()) === 0);
      ok("escaping", "readiness panel renders hostile text as text", unsafeNodes(NS.check.panelHTML(NS.getState())) === 0);
    } finally { NS.setState(saved); }

    /* J. sanitising, line endings, dates, numbers */
    tryOk("sanitize", "hostile JSON: prototype keys ignored, enums and types reset, step and tab bounded", function () {
      var r = NS.importJSON('{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted2":1}},"id":{"name":{"a":1},"__proto__":{"x":1}},"q":{"finLimit":7},"tier":{"override":"7","industry":"EXTREME","crossDomain":"false"},"step":99,"tab":"nope","overrides":"abc","scoring":null}');
      var s = r.state;
      return ({}).polluted === undefined && ({}).polluted2 === undefined && s.tier.override === "" && s.tier.industry === "" && s.tier.crossDomain === false && s.step === 0 && s.tab === "package" &&
        NS.deepEqual(s.overrides, {}) && s.id.name === "" && s.q.finLimit === "7" && s.scoring.mid.c1 === false && r.notes.length >= 5;
    });
    tryOk("sanitize", "override keys must be plain integers 1 to 19; others refused with a note", function () { var n = []; var s = NS.sanitize({ id: {}, q: {}, overrides: { 0: "x", 4: "keep", 20: "x", "4.5": "x", "04": "x", "4.0": "x", "0x4": "x", " 4": "x", "4e0": "x", 7: 12, 9: "" } }, n); return Object.keys(s.overrides).join(",") === "4" && n.filter(function (x) { return /refused override key/.test(x); }).length === 9; });
    tryOk("sanitize", "an out-of-range tier override cannot crash the tier logic", function () { var s = NS.blankState(); s.tier.override = "7"; var tr = NS.computeTier(s); return tr.effective >= 1 && tr.effective <= 3; });
    ok("sanitize", "lines split on CR, CRLF and LF", NS.lines("a\rb\r\nc\nd").length === 4);
    ok("sanitize", "month arithmetic clamps at month end (Aug 31 + 6 months)", NS.isoDate(NS.addMonths(new Date(2026, 7, 31), 6)) === "2027-02-28");
    ok("sanitize", "dates on DST changes and the year end format correctly", NS.isoDate(new Date(2026, 2, 8)) === "2026-03-08" && NS.isoDate(new Date(2026, 10, 1)) === "2026-11-01" && NS.isoDate(NS.addMonths(new Date(2026, 11, 31), 1)) === "2027-01-31");
    ok("sanitize", "calendar validation rejects Feb 30 and accepts Feb 29 2028", NS.validISO("2026-02-30") === null && NS.validISO("2028-02-29") !== null && NS.validISO("2026-1-1") === null);
    ok("sanitize", "money formatting handles negatives, NaN and huge values", NS.usd("-5") === "-$5" && NS.usd("NaN") === "" && NS.usd("Infinity") === "" && NS.usd("1e21").length > 10);
    ok("sanitize", "financial authority of 1e308 still reads above $50K", NS.computeTier(NS.sanitize({ id: {}, q: { finLimit: "1e308" }, tier: { industry: "LOW", data: "LOW", impact: "LOW", geo: "LOW" } })).effective === 3);

    /* K. cross-domain handoff */
    var rr = NS.registerRow(ex);
    ok("handoff", "register entry has the template's nine fields in order", rr.map(function (r) { return r[0]; }).join("|") === "SOP ID|Owning service / domain|Borrowing service / persona|Dependency ID|MCP server|Invocation purpose|Vanilla-Agent status|Change Advisory Circle date|Notes");
    ok("handoff", "supplier: Finance owns the shared SOP and Procurement borrows it", /^Finance Service/.test(rr[1][1]) && /Procurement Service/.test(rr[2][1]) && /Supplier Onboarding/.test(rr[2][1]));
    var bState = NS.mirrorState(ex), pa = NS.genPackage(ex), pb = NS.genPackage(bState), clauseHead = "**Cross-domain handoff (Cross-Domain SOP Register entry SOP-FIN-VM-002):**";
    ok("handoff", "the handoff clause appears in both packages with the same SOP and dependency IDs", pa.indexOf(clauseHead) >= 0 && pb.indexOf(clauseHead) >= 0 && pa.indexOf("DEP-PROC-FIN-01") >= 0 && pb.indexOf("DEP-PROC-FIN-01") >= 0);
    ok("handoff", "the second package reads the handoff from its own side", /Supplier Onboarding Verifier & Coordinator hands off to Vendor Master Steward/.test(pb) && bState.handoff.direction === NS.DIR_IN && bState.handoff.sopOwner === NS.OWN_ME && bState.sop.id === "SOP-FIN-VM-002");
    ok("handoff", "each package lists the other persona in Section 19.2", pa.indexOf("Vendor Master Steward (cross-domain handoff") >= 0 && pb.indexOf("Supplier Onboarding Verifier & Coordinator (cross-domain handoff") >= 0);
    tryOk("handoff", "a handoff into another Level 0 domain sets the cross-domain qualifier", function () {
      var s = NS.exampleState("report"); s.handoff.enabled = true; s.p2.name = "X"; s.p2.l0 = "Finance Service";
      var a = NS.computeTier(s); s.p2.l0 = "Operations Service"; var b = NS.computeTier(s);
      return a.effective === 3 && a.viaHandoff && a.hitAt === 2 && b.effective === 1 && !b.viaHandoff;
    });
    ok("handoff", "delegation checklist closes the register row from the handoff", NS.checklistItems(ex)[2].state === "done" && /DEP-PROC-FIN-01/.test(NS.checklistItems(ex)[2].evidence));
    tryOk("handoff", "when the shared SOP is this persona's own, its status comes from the dry runs", function () { var s = NS.exampleState("ap"); s.handoff.enabled = true; s.handoff.sopOwner = NS.OWN_ME; s.handoff.sopId = s.sop.id; NS.CRITERIA.forEach(function (c) { s.scoring.small[c[0]] = true; }); s.scoring.small.date = "2026-10-01"; s.scoring.small.trace = "1 | SIM-A1 | ok | none"; s.scoring.small.evidence = "run log"; return NS.registerRow(s)[6][1] === "2026-10-01 – Pass"; });
    tryOk("handoff", "missing register fields warn", function () { var s = NS.exampleState("ap"); s.handoff.enabled = true; return has(NS.check.consistency(s), "handoff-gaps"); });

    /* M. second independent check: ids, state comment, comment escaping, readout, rule quotes */
    ok("ids", "example ids use own-property lookup; prototype names give a blank draft", !NS.examples.has("constructor") && !NS.examples.has("__proto__") && !NS.examples.has("toString") && NS.deepEqual(NS.examples.get("constructor"), NS.blankState()) && NS.deepEqual(NS.examples.get("__proto__"), NS.blankState()) && NS.examples.label("constructor") === "unknown example");
    ok("ids", "known example ids still load", NS.examples.ids.every(function (id) { return NS.examples.has(id) && NS.examples.get(id).exampleId === id; }));
    function stateComment(st) { var pw = NS.io.packageWithState(st); return pw.slice(pw.lastIndexOf("<!-- persona-forge-state")); }
    tryOk("statecomment", "a forged state comment before the real one is ignored; the last one wins", function () {
      var forged = NS.exampleState("report"), real = NS.exampleState("ap");
      var txt = stateComment(forged) + "\n" + NS.io.packageWithState(real);
      var r = NS.io.importPackage(txt, null); return r.report.embedded && NS.deepEqual(r.state, real);
    });
    tryOk("statecomment", "a state comment inside a section's text is read as text", function () {
      var real = NS.exampleState("ap"), txt = NS.genPackage(real).replace("### 4.1 Primary Intent", "### 4.1 Primary Intent\n" + stateComment(NS.exampleState("report")));
      var r = NS.io.importPackage(txt, null); return !r.report.embedded && r.state.id.name === real.id.name;
    });
    tryOk("statecomment", "another comment after the state comment makes it text", function () { var r = NS.io.importPackage(NS.io.packageWithState(ap) + "<!-- later -->\n", null); return !r.report.embedded; });
    tryOk("statecomment", "an unknown state version is refused", function () { var r = NS.io.importPackage(NS.io.packageWithState(ap).replace("persona-forge-state v2", "persona-forge-state v9"), null); return !r.report.embedded && r.report.notes.some(function (n) { return /version 9/.test(n); }); });
    tryOk("statecomment", "an embedded state whose name differs from Section 1 is refused", function () {
      var txt = NS.io.packageWithState(ap).replace("**Name:** AP Invoice Exception Resolver", "**Name:** Someone Else Entirely");
      var r = NS.io.importPackage(txt, null); return !r.report.embedded && r.state.id.name === "Someone Else Entirely" && r.report.notes.some(function (n) { return /does not match the name in Section 1/.test(n); });
    });
    var openC = NS.exampleState("supplier"); openC.overrides = { 4: "Edited text with an unclosed <!-- comment opener\nand more", 9: "<!-- starts a line" }; openC.id.name = "Name <!-- with opener";
    tryOk("comments", "exported text escapes every user <!-- ; only the state comment remains", function () { var pw = NS.io.packageWithState(openC); return (pw.match(/<!--/g) || []).length === 1 && NS.genPackage(openC).indexOf("<!--") < 0 && NS.genBlueprint(openC).indexOf("<!--") < 0 && NS.genHandoff(openC).indexOf("<!--") < 0; });
    tryOk("comments", "a state with unclosed comment openers round-trips", function () { return rt(openC); });
    tryOk("comments", "print view keeps all 19 sections and the sign-off block after a hostile override", function () {
      var d = parseHTML(NS.io.printHTML(openC)), hs = Array.prototype.map.call(d.querySelectorAll("h2"), function (h) { return h.textContent; });
      return hs.filter(function (x) { return /^\d+\. /.test(x); }).length === 19 && hs[hs.length - 1] === "Sign-off" && d.querySelectorAll(".signoff tbody tr").length === 3;
    });
    ok("comments", "the print renderer shows an unmatched comment opener as text", /unclosed/.test(NS.io.mdToHTML("<!-- unclosed\n## 2. Next")) && /<h2>/.test(NS.io.mdToHTML("<!-- unclosed\n## 2. Next")));
    ok("readout", "Tier 3 readout reads: All 19 sections required; typical effort 3 to 5 days.", NS.tierReadout(3) === "All 19 sections required; typical effort 3 to 5 days.");
    ok("rules", "rule quotes carry no ellipsis; paraphrases say so", Object.keys(NS.check.RULES).every(function (k) { var r = NS.check.RULES[k]; return r.para ? /^Paraphrase of the rule: /.test(NS.check.ruleText({ para: true, rule: r.quote })) : r.quote.indexOf("...") < 0; }));
    ok("stress-hook", "the stress harness never loads from a file:// hash", !(location.protocol === "file:" && document.querySelector('script[src="tests/stress.js"]')));

    /* L. live page */
    var meter = document.getElementById("meter");
    ok("page", "completeness meter is on the page", meter && /required sections complete/.test(meter.textContent));
    ok("page", "output tabs cover every view", NS.TABS.every(function (k) { return document.getElementById("tab-" + k); }));
    ok("page", "example picker offers the three examples", (function () { var sel = document.getElementById("sel-example"); return sel && NS.examples.ids.every(function (id) { return sel.querySelector('option[value="' + id + '"]'); }); })());

    var ms = Math.round(performance.now() - t0);
    return { pass: results.every(function (r) { return r.pass; }), results: results, ms: ms };
  }

  /* Live-DOM checks, run with #selftest: hostile text rendered into the real page, then a wait for any execution. */
  function domChecks(done) {
    var res = [], saved = NS.getState();
    function ok(name, pass, detail) { res.push({ group: "live-dom", check: name, pass: !!pass, detail: detail || "" }); }
    try {
      NS.setState(hostileState());
      for (var i = 0; i < NS.STEPS.length; i++) { NS.setView(i, null); NS.renderStep(); }
      NS.TABS.forEach(function (tb) { NS.setView(null, tb); NS.renderOutputs(); });
      NS.importPackageText(NS.io.packageWithState(hostileState()));
      NS.preparePrint();
      var live = document.querySelectorAll("main script, main img, main svg, main iframe, #print-doc script, #print-doc img, #print-doc svg").length;
      ok("rendered pages hold no injected elements", live === 0, live + " found");
    } catch (e) { ok("rendering hostile text into the page", false, "threw: " + e.message); }
    // rtText clears on example load and on JSON import
    try {
      NS.importPackageText(NS.io.packageWithState(NS.exampleState("ap"))); var had = NS.rtTextLength() > 0;
      NS.loadExample("report"); var a = NS.rtTextLength() === 0;
      NS.importPackageText(NS.io.packageWithState(NS.exampleState("ap"))); NS.applyJSONImport(NS.importJSON(JSON.stringify(NS.exampleState("supplier")))); var b = NS.rtTextLength() === 0;
      ok("pasted package text clears on example load and JSON import", had && a && b);
    } catch (e) { ok("pasted package text clears on example load and JSON import", false, "threw: " + e.message); }
    // #example over a saved draft: confirm first, and hold autosave until an edit
    try {
      NS.setState(NS.exampleState("ap")); NS.releaseHold();
      var kept = NS.hashExample("supplier", true, function () { return false; }), keptName = NS.getState().id.name;
      var loaded = NS.hashExample("supplier", true, function () { return true; }), holding = NS.holdingSave();
      var unknown = NS.hashExample("constructor", false, function () { return true; }), blankAfter = NS.getState().id.name === "";
      NS.releaseHold();
      ok("#example over a saved draft asks first and holds autosave until an edit", kept === "kept" && keptName === "AP Invoice Exception Resolver" && loaded === "loaded" && holding === true && unknown === "unknown" && blankAfter, [kept, loaded, holding, unknown].join(","));
    } catch (e) { ok("#example over a saved draft asks first and holds autosave until an edit", false, "threw: " + e.message); }
    // quota handling: make storage refuse the write and read the message the user would see
    try {
      var proto = Object.getPrototypeOf(window.localStorage), orig = proto.setItem;
      proto.setItem = function () { throw new DOMException("full", "QuotaExceededError"); };
      var msg = NS.saveNow(); proto.setItem = orig;
      ok("a full browser storage says the draft is too large", /too large for browser storage/.test(msg), msg);
    } catch (e) { ok("a full browser storage says the draft is too large", false, "threw: " + e.message); }
    setTimeout(function () {
      ok("no script, onerror or onload handler ran", window.__pfPwned === undefined, String(window.__pfPwned));
      NS.flushTimers(); NS.setState(saved); NS.renderStep(); NS.renderOutputs(); NS.saveNow();
      var el = document.getElementById("print-doc"); if (el) el.innerHTML = "";
      done(res);
    }, 400);
  }

  function report(r, extra) {
    var all = r.results.concat(extra || []), pass = all.every(function (x) { return x.pass; }), n = all.filter(function (x) { return x.pass; }).length;
    var el = document.getElementById("selfcheck");
    if (el) {
      el.textContent = "Self-check " + (pass ? "passed" : "FAILED") + ": " + n + " of " + all.length + " checks" + (extra ? " including the live-page checks" : "") + " (details in the browser console).";
      el.setAttribute("data-selfcheck", pass ? "pass" : "fail"); el.setAttribute("data-count", String(all.length)); el.setAttribute("data-passed", String(n));
    }
    if (window.console) { console.log("[Persona Forge self-check] " + (pass ? "PASS" : "FAIL") + " " + n + "/" + all.length + " in " + r.ms + " ms"); if (console.table) console.table(all); }
    return { pass: pass, results: all };
  }
  NS.selfCheck = function () { return report(selfCheck()); };
  NS.runSelfCheck = function (full) {
    var r = selfCheck();
    if (!full) { report(r); return; }
    report(r);
    domChecks(function (extra) {
      var out = report(r, extra);
      var fails = out.results.filter(function (x) { return !x.pass; });
      var pre = document.createElement("pre"); pre.id = "selfcheck-fail"; pre.hidden = true; pre.textContent = JSON.stringify(fails); document.body.appendChild(pre);
      try {
        var z = NS.io.buildZip(NS.exampleState("supplier"), new Date(2026, 9, 10, 9, 30, 0)), bin = "", CH = 0x8000;
        for (var i = 0; i < z.bytes.length; i += CH) bin += String.fromCharCode.apply(null, z.bytes.subarray(i, i + CH));
        var zp = document.createElement("pre"); zp.id = "zip-b64"; zp.hidden = true; zp.textContent = btoa(bin); document.body.appendChild(zp);
      } catch (e) { /* the zip checks above already report a failure */ }
      document.body.setAttribute("data-selftest-done", "1");
    });
  };
})();
