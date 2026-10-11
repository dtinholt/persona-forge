/* Persona Forge stress harness. Loaded only when the page URL carries #stress.
   Feeds hostile and extreme state through the import path, renders every step and every output tab,
   times the main render, and writes a JSON report into <pre id="stress-out">. Run it with tests/stress.sh. */
(function () {
  "use strict";
  var PF = window.PersonaForge;
  var PAYLOAD = "<script>window.__pfPwned=1<\/script><img src=x onerror=\"window.__pfPwned=2\"><svg onload=\"window.__pfPwned=3\"></svg>\"'&amp;";
  var UNI = "Zoë Ångström 李小龍 مرحبا שלום 🚚 é ​‮ reversed‬ ﷽ 𝔸";
  var ex = PF.exampleState();

  function walk(o, fn) {
    Object.keys(o).forEach(function (k) {
      if (k === "overrides") return;
      var v = o[k];
      if (v && typeof v === "object") walk(v, fn);
      else if (typeof v === "string") o[k] = fn(v, k);
    });
    return o;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function scale(n) {
    return walk(clone(ex), function (v) {
      if (!v) return v;
      var out = [];
      if (v.indexOf("\n") >= 0) { for (var i = 0; i < n; i++) out.push(v); return out.join("\n"); }
      for (var j = 0; j < n; j++) out.push(v); return out.join(" ");
    });
  }
  function fillAll(str) { return walk(clone(ex), function (v, k) { return k === "finLimit" ? v : str + " " + v; }); }
  function mixedEndings() {
    var n = 0;
    return walk(clone(ex), function (v) { n++; return v.replace(/\n/g, n % 3 === 0 ? "\r" : n % 3 === 1 ? "\r\n" : "\n"); });
  }
  function bigPaste() { var s = clone(ex), line = "Paste line with some text | evidence | owner\n", buf = []; var len = 0; while (len < 5 * 1024 * 1024) { buf.push(line); len += line.length; } s.sop.steps = buf.join(""); return s; }

  var cases = [
    ["empty state", function () { return PF.blankState(); }],
    ["worked example", function () { return clone(ex); }],
    ["10x sample", function () { return scale(10); }],
    ["100x sample", function () { return scale(100); }],
    ["unicode in every field", function () { return fillAll(UNI); }],
    ["mixed line endings", mixedEndings],
    ["HTML and script in every field", function () { var s = fillAll(PAYLOAD); s.overrides = { 3: PAYLOAD, 18: PAYLOAD }; return s; }],
    ["duplicate ids", function () { var s = clone(ex); s.q.actions = s.q.actions + "\n" + s.q.actions; s.sop.steps = s.sop.steps + "\n" + s.sop.steps; s.pkg.registerRow = s.sop.id; return s; }],
    ["values out of range", function () { var s = clone(ex); s.q.finLimit = "-50000"; s.tier.override = "7"; s.tier.industry = "EXTREME"; s.step = 99; s.tab = "nope"; return s; }],
    ["NaN and huge numbers", function () { var s = clone(ex); s.q.finLimit = "NaN"; s.esc.confidence = "1e308"; return s; }],
    ["huge financial bound", function () { var s = clone(ex); s.q.finLimit = "1e308"; return s; }],
    ["wrong types", function () { var s = clone(ex); s.id.name = { a: 1 }; s.q.actions = ["x", "y"]; s.tier.crossDomain = "false"; s.overrides = "abc"; s.scoring = null; s.q.kpi = 42; return s; }],
    ["dates across DST and year end", function () { var s = clone(ex); s.id.effectiveDate = "2026-12-31"; s.id.reviewDate = "2026-03-08"; return s; }],
    ["invalid dates", function () { var s = clone(ex); s.id.effectiveDate = "2026-02-30"; s.id.reviewDate = "not a date"; return s; }],
    ["5 MB paste in one field", bigPaste]
  ];
  var rawCases = [
    ["malformed JSON", "{\"id\": {\"name\": \"x\"}, \"q\": "],
    ["prototype pollution JSON", "{\"id\":{\"name\":\"p\"},\"q\":{},\"__proto__\":{\"polluted\":\"yes\"},\"tier\":{\"__proto__\":{\"polluted2\":\"yes\"}},\"constructor\":{\"prototype\":{\"polluted3\":\"yes\"}}}"],
    ["deep nesting JSON", "{\"id\":{},\"q\":{\"actions\":" + new Array(3001).join("[") + new Array(3001).join("]") + "}}"],
    ["not an object", "[1,2,3]"],
    ["empty file", ""]
  ];

  var TABS = (PF.TABS || ["package", "sop", "blueprint", "checklist", "dryrun"]);
  function renderAll() {
    // main render: step 1 plus the package tab, with layout forced so the time includes it
    var t0 = performance.now(); PF.setView(0, "package"); PF.renderStep(); PF.renderOutputs(); void document.body.offsetHeight; var main = performance.now() - t0;
    var worstStep = 0, worstTab = 0;
    for (var i = 0; i < PF.STEPS.length; i++) { var a = performance.now(); PF.setView(i, null); PF.renderStep(); void document.body.offsetHeight; worstStep = Math.max(worstStep, performance.now() - a); }
    TABS.forEach(function (tb) { var b = performance.now(); PF.setView(null, tb); PF.renderOutputs(); void document.body.offsetHeight; worstTab = Math.max(worstTab, performance.now() - b); });
    var z0 = performance.now(); var zip = PF.io.buildZip(PF.getState()); var zipMs = performance.now() - z0;
    var p0 = performance.now(); PF.preparePrint(); void document.body.offsetHeight; var printMs = performance.now() - p0; document.getElementById("print-doc").innerHTML = "";
    var r0 = performance.now(); var rt = PF.io.importPackage(PF.io.packageWithState(PF.getState()), null); var rtMs = performance.now() - r0;
    return { mainMs: Math.round(main), worstStepMs: Math.round(worstStep), worstTabMs: Math.round(worstTab), zipMs: Math.round(zipMs), zipBytes: zip.bytes.length, printMs: Math.round(printMs), roundTripMs: Math.round(rtMs), roundTripEqual: PF.deepEqual(rt.state, PF.getState()), findings: PF.check.consistency(PF.getState()).length };
  }
  function injected() {
    return document.querySelectorAll("main img[src='x'], main svg[onload], main script, footer img, #print-doc img, #print-doc script").length;
  }

  var report = { started: new Date().toISOString(), cases: [] };
  cases.forEach(function (c) {
    var r = { name: c[0] };
    try {
      var s = c[1]();
      var txt = JSON.stringify(s); r.inputBytes = txt.length;
      PF.importJSONText(txt);
      var tm = renderAll();
      Object.keys(tm).forEach(function (k) { r[k] = tm[k]; });
      r.ok = true;
    } catch (e) { r.ok = false; r.error = String(e && e.message || e); }
    r.scriptRan = window.__pfPwned || 0; r.injectedNodes = injected();
    report.cases.push(r);
  });
  rawCases.forEach(function (c) {
    var r = { name: c[0], raw: true };
    try { PF.importJSONText(c[1]); r.accepted = true; renderAll(); r.ok = true; }
    catch (e) { r.accepted = false; r.ok = /import|JSON|export|object|Unexpected|token|end of|depth|nest|empty/i.test(String(e.message)); r.error = String(e.message).slice(0, 160); }
    r.protoPolluted = ({}).polluted || ({}).polluted2 || ({}).polluted3 || null;
    report.cases.push(r);
  });
  // markdown import: hostile, huge and malformed packages through the round-trip importer
  [["markdown: 100x package without state", function () { return PF.genPackage(JSON.parse(JSON.stringify(scale(100)))); }],
   ["markdown: 5 MB of noise", function () { var b = []; for (var i = 0; i < 230000; i++) b.push("## " + (i % 25) + ". noise line " + i); return b.join("\n"); }],
   ["markdown: sections out of order and duplicated", function () { return "## 5. Capabilities\nA\n## 2. Governance\nB\n## 5. Again\nC\n## 19. Docs\n" + PAYLOAD; }],
   ["markdown: forged state comment first, real one last", function () { var f = PF.io.packageWithState(PF.exampleState("report")); return f.slice(f.lastIndexOf("<!-- persona-forge-state")) + "\n" + PF.io.packageWithState(PF.exampleState("ap")); }, "AP Invoice Exception Resolver"],
   ["markdown: forged state comment inside a section", function () { var f = PF.io.packageWithState(PF.exampleState("report")); return PF.genPackage(PF.exampleState("ap")).replace("### 4.1 Primary Intent", "### 4.1 Primary Intent\n" + f.slice(f.lastIndexOf("<!-- persona-forge-state"))); }, "AP Invoice Exception Resolver"],
   ["markdown: unclosed comment opener in a section", function () { var st = PF.exampleState("ap"); st.overrides = { 4: "text <!-- never closed" }; return PF.io.packageWithState(st); }, "AP Invoice Exception Resolver"],
   ["markdown: mixed line endings", function () { return PF.io.packageWithState(PF.exampleState("ap")).replace(/\n/g, function () { return Math.random() < 0.5 ? "\r\n" : "\r"; }); }]
  ].forEach(function (c) {
    var r = { name: c[0], raw: true };
    try { var txt = c[1](); r.inputBytes = txt.length; var t0 = performance.now(); PF.importPackageText(txt); r.importMs = Math.round(performance.now() - t0); r.summary = PF.getState().id.name.slice(0, 40); r.ok = !c[2] || PF.getState().id.name === c[2]; if (c[2]) r.expectName = c[2]; }
    catch (e) { r.ok = /section|empty/i.test(e.message); r.error = String(e.message).slice(0, 160); }
    r.scriptRan = window.__pfPwned || 0; r.injectedNodes = injected();
    report.cases.push(r);
  });
  report.finished = new Date().toISOString();
  var pre = document.createElement("pre"); pre.id = "stress-out"; pre.textContent = JSON.stringify(report, null, 1);
  document.body.appendChild(pre);
  try { console.log("[stress] " + JSON.stringify(report)); } catch (e) { /* console unavailable */ }
})();
