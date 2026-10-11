/* Persona Forge: completeness meter, sign-off blockers and the cross-section consistency checker.
   Every finding names the rule it applies and where the rule comes from. Pure functions over a state object. */
(function () {
  "use strict";
  var NS = window.PersonaForge;
  var C = NS.check = {};

  /* ---------- rules: quoted from the reference set ---------- */
  var RULES = {
    finTree: { src: "AI-Persona-Tier-Selection-Guide.md, decision tree step 2", quote: "Does the persona have financial authority > $50K per autonomous decision? (Per-decision = single autonomous action, not annual aggregate.) YES --> Tier 3 (Full Specification)" },
    impactLow: { src: "AI-Persona-Tier-Selection-Guide.md, scoring matrix, Decision Impact, Low (Tier 1)", quote: "Recommendations only; no autonomous action; fully reversible" },
    boundary: { src: "Chapter-07 notes, escalation tiers", quote: "Tier 2 (Boundary Breach, 1-hour SLA): persona attempts action outside defined scope -- AI RM steward pauses persona and investigates root cause." },
    escTiers: { src: "Chapter-07 notes, escalation tiers", para: true, quote: "the three escalation tiers carry fixed SLAs: Tier 1 (Routine Variance) 4 hours, Tier 2 (Boundary Breach) 1 hour, Tier 3 (Systemic Risk) 15 minutes" },
    confidence: { src: "AI-Persona-Definition-Template.md, Section 7.1, Confidence Thresholds", quote: "Escalation threshold: [e.g., Confidence <70% → Manual Review Queue]" },
    verifiable: { src: "Chapter-11 notes, 5-tier hierarchy", quote: "Tier 2 -- Performance & Outcome holds KEY_RESULT, KPI_OUTCOME, VALUE_CONTRIBUTION, and COST_IMPACT types that quantify success with verifiable targets." },
    direct: { src: "Chapter-11 notes, direct measure selection", quote: "If any test fails, the metric is indirect and requires attribution analysis." },
    types: { src: "Chapter-11 notes, practitioner checklist", quote: "Place any metric into its correct tier (1-5) and identify its measure type from the 12 standardized types" },
    withTargets: { src: "AI-Persona-Definition-Template.md, Tier 2 checklist", quote: "Section 10: Performance measures defined across all 5 tiers with targets" },
    exhaustive: { src: "AI-Persona-Definition-Template.md, Tier 1 checklist, Section 5", quote: "Capabilities list is exhaustive (if not listed, not permitted); prohibited actions stated" },
    invoker: { src: "AI-Persona-Definition-Template.md, Section 8.2, For Invoker Authority", quote: "Who can invoke: [Specific roles/individuals]" },
    dates: { src: "AI-Persona-Definition-Template.md, Section 1.3", quote: "Review Date: [Next scheduled review]" },
    ch9Tier3: { src: "Chapter-09 notes, risk classification matrix", quote: "Tier 3 personas require dual sign-off, 12 test scenarios, staged rollout (10% to 50% to 100%), and quarterly external audits." },
    register: { src: "cross-domain-sop-register.md", quote: "Use this register whenever an SOP owned by one domain is invoked by another service or persona." },
    status: { src: "AI-Persona-Definition-Template.md, Section 18 and Tiered Completion Checklist", quote: "Use the checklist matching the tier assigned to this AI Persona. Each tier includes all items from lower tiers." }
  };
  C.RULES = RULES;

  /* ---------- small parsers ---------- */
  // Dollar amounts written as $200,000, $200K, $1.5M, USD 50000.
  function amounts(text) {
    var out = [], re = /(?:\$|\bUSD\s?)\s?(\d[\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?\b/gi, m;
    var s = String(text == null ? "" : text);
    while ((m = re.exec(s))) {
      var n = Number(m[1].replace(/,/g, "")), u = (m[2] || "").toLowerCase();
      if (u === "k" || u === "thousand") n *= 1000; else if (u === "m" || u === "million") n *= 1000000;
      if (isFinite(n)) out.push(n);
    }
    return out;
  }
  C.amounts = amounts;
  function norm(x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function money(n) { return NS.usd(String(n)); }
  function listJoin(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

  /* ---------- completeness per tier ---------- */
  C.completeness = function (s) {
    var tr = NS.computeTier(s), tiers = [];
    [1, 2, 3].forEach(function (tier) {
      var req = NS.TIER_SECTIONS[tier], open = [], done = [];
      req.forEach(function (n) {
        var miss = NS.sectionMissing(s, n, tier);
        var lines = [1, 2, 3].filter(function (k) { return k <= tier && NS.checklistLine(n, k); }).map(function (k) { return NS.checklistLine(n, k); });
        if (miss.length) open.push({ n: n, title: NS.SECTIONS[n - 1][1], missing: miss, checklist: lines }); else done.push(n);
      });
      tiers.push({ tier: tier, required: req, complete: done, open: open });
    });
    return { assigned: tr.effective, tiers: tiers };
  };

  /* ---------- consistency ---------- */
  C.consistency = function (s) {
    var t = NS.t, lines = NS.lines, rows = NS.rows, out = [];
    var tr = NS.computeTier(s), T = tr.effective, fin = NS.finNum(s);
    function add(id, severity, text, rule, where) { out.push({ id: id, severity: severity, text: text, rule: RULES[rule].quote, para: !!RULES[rule].para, source: RULES[rule].src, where: where || "" }); }

    // Financial authority field
    var rawFin = t(s.q.finLimit);
    if (rawFin !== "" && (fin === null || fin < 0)) add("fin-invalid", "block", "Financial authority per decision reads \"" + rawFin.slice(0, 40) + "\". Give zero or a positive dollar amount; the tier decision tree cannot read anything else.", "finTree", "Step 1, Question 2");

    // Decision bound written in the authority text but not in the field
    var authText = [NS.authSentence(s), s.overrides[8] || "", s.q.actions, s.q.tools].join("\n");
    var named = amounts(authText), maxNamed = named.length ? Math.max.apply(null, named) : 0;
    if (maxNamed > (fin || 0)) {
      if (maxNamed > NS.FIN_THRESHOLD && T < 3)
        add("bound-tier", "block", "The authority text names a " + money(maxNamed) + " decision bound, but the financial authority field reads " + (rawFin === "" ? "nothing" : money(fin)) + ", so the persona sits at Tier " + T + ". Any bound above $50K per autonomous decision puts it at Tier 3. Enter the bound in step 1 and the tier follows.", "finTree", "Steps 1 and 3");
      else
        add("bound-field", "warn", "The authority text names " + money(maxNamed) + " but the financial authority field reads " + (rawFin === "" ? "nothing" : money(fin)) + ". The tier is computed from the field, so make the two agree.", "finTree", "Steps 1 and 3");
    }

    // LOW decision impact with autonomous spend or write access
    if (s.tier.impact === "LOW") {
      var writes = rows(s.q.tools, 4).filter(function (r) { return /write|update|create|delete/i.test(r[1] + " " + r[2]); }).map(function (r) { return r[0]; })
        .concat(rows(s.data.sources, 4).filter(function (r) { return /write/i.test(r[2]); }).map(function (r) { return r[1] || r[0]; }));
      if ((fin || 0) > 0) add("impact-spend", "warn", "Decision Impact is scored LOW, which means recommendations only, yet the persona holds a " + money(fin) + " bound per autonomous decision. Score Decision Impact MEDIUM or set the bound to zero.", "impactLow", "Step 2");
      if (writes.length) add("impact-write", "warn", "Decision Impact is scored LOW, which means no autonomous action, yet the persona has write access to " + listJoin(writes.slice(0, 3)) + ". Either score it MEDIUM or make that access read-only.", "impactLow", "Steps 1, 2 and 5");
    }

    // Authority bound against escalation thresholds
    if ((fin || 0) > 0) {
      var escText = [s.esc.triggers, s.sop.controlPoints, s.esc.exceptions].join("\n"), escAmts = amounts(escText);
      if (!escAmts.length) add("esc-no-amount", "warn", "The persona may commit up to " + money(fin) + " per decision, but no escalation trigger or control point names an amount. Write down what happens to a case above " + money(fin) + ".", "boundary", "Steps 4 and 6");
      else {
        var above = escAmts.filter(function (a) { return a > fin; });
        if (above.length && Math.min.apply(null, escAmts) > fin) add("esc-gap", "block", "The lowest escalation amount is " + money(Math.min.apply(null, escAmts)) + ", above the " + money(fin) + " decision bound. Cases between the two sit outside the persona's authority with no trigger to catch them.", "boundary", "Steps 1 and 4");
      }
    }

    // Escalation tier and SLA pairs written into the incident mappings
    var EXPECT = { 1: [4, "hour"], 2: [1, "hour"], 3: [15, "minute"] };
    [["incPerf", "Performance Degradation"], ["incSec", "Security Breach"], ["incBoundary", "Boundary Violation"], ["incEthics", "Ethical Concern"], ["emergency", "Emergency Changes"], ["violations", "Compliance violation response"]].forEach(function (f) {
      var v = t(s.esc[f[0]]); if (!v) return;
      var tm = /tier\s*([123])/i.exec(v), sm = /(\d+)\s*[- ]?\s*(hour|minute|min|hr)s?/i.exec(v);
      if (!tm || !sm) return;
      var e = EXPECT[tm[1]], unit = /^h/i.test(sm[2]) ? "hour" : "minute";
      if (Number(sm[1]) !== e[0] || unit !== e[1]) add("sla-" + f[0], "warn", f[1] + " maps to Tier " + tm[1] + " with a " + sm[1] + "-" + unit + " SLA. Chapter 7 fixes Tier " + tm[1] + " at " + e[0] + "-" + e[1] + ".", "escTiers", "Step 4");
    });

    // Confidence threshold
    var conf = t(s.esc.confidence);
    if (conf) {
      var cm = /(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*(%)?/i.exec(conf), val = cm ? Number(cm[1]) / (cm[2] ? 100 : 1) : NaN;
      if (cm && !cm[2] && val > 1 && val <= 100) val = val / 100;
      if (!(val >= 0 && val <= 1)) add("confidence", "warn", "Minimum confidence reads \"" + conf.slice(0, 40) + "\". Give a value from 0 to 1 or a percentage so the Manual Review Queue threshold can be set.", "confidence", "Step 4");
    } else if (T >= 2) add("confidence-missing", "warn", "No minimum confidence for action. Section 7.1 sends anything below it to the Manual Review Queue; without it that rule has no threshold.", "confidence", "Step 4");

    // Measurement targets
    if (t(s.q.kpi) && t(s.q.kpiTarget) && !/\d/.test(s.q.kpiTarget)) add("kpi-target", "warn", "The KPI target \"" + t(s.q.kpiTarget).slice(0, 40) + "\" has no number in it, so nobody can verify it.", "verifiable", "Step 1, Question 2");
    if (t(s.meas.sla) && !/\d/.test(s.meas.sla)) add("sla-target", "warn", "The SLA \"" + t(s.meas.sla).slice(0, 40) + "\" names no threshold.", "withTargets", "Step 6");
    var failed = [["Authority", s.q.testAuthority], ["Horizon", s.q.testHorizon], ["Causality", s.q.testCausality]].filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; });
    if (t(s.q.kpi) && failed.length && !t(s.meas.attribution)) add("kpi-indirect", T >= 3 ? "block" : "warn", "The primary KPI has not passed the " + listJoin(failed) + " test" + (failed.length > 1 ? "s" : "") + ", so it counts as indirect, and no attribution approach is set.", "direct", "Steps 1 and 6");
    if (s.meas.attribution === "Direct Attribution" && failed.length) add("kpi-direct-claim", "block", "Direct Attribution is chosen, but the KPI has not passed the " + listJoin(failed) + " test" + (failed.length > 1 ? "s" : "") + ".", "direct", "Step 6");

    // Further measures: each needs one of the twelve types, and outcome measures need a target
    NS.rows(s.meas.extra, 4).forEach(function (r, i) {
      var name = r[0] || "Row " + (i + 1), type = t(r[1]).toUpperCase().replace(/[\s-]+/g, "_");
      if (!type) add("type-missing-" + i, "block", "\"" + name.slice(0, 60) + "\" has no measure type, so it cannot be placed in the 5-tier hierarchy.", "types", "Step 6, further measures");
      else if (!Object.prototype.hasOwnProperty.call(NS.MEASURE_TYPES, type)) add("type-unknown-" + i, "block", "\"" + name.slice(0, 60) + "\" has the type \"" + t(r[1]).slice(0, 30) + "\", which is not one of the twelve measure types" + (/^KPI$/i.test(t(r[1])) ? "; a KPI is KPI_OUTCOME" : "") + ".", "types", "Step 6, further measures");
      else if (NS.MEASURE_TYPES[type] <= 3 && !/\d/.test(r[2])) add("type-target-" + i, "warn", "\"" + name.slice(0, 60) + "\" (" + type + ") has no numeric target.", "withTargets", "Step 6, further measures");
    });

    // Capabilities against prohibitions
    var acts = NS.rows(s.q.actions, 4).map(function (r) { return r[0]; }).filter(Boolean);
    var proh = lines(s.q.prohibited).map(norm);
    acts.forEach(function (a, i) {
      var na = norm(a); if (!na) return;
      if (proh.indexOf(na) >= 0) add("act-prohibited-" + i, "block", "\"" + a.slice(0, 60) + "\" is both a permitted action (CAP-" + String(i + 1).padStart(3, "0") + ") and a prohibited action.", "exhaustive", "Step 1, Question 2");
      var first = acts.map(norm).indexOf(na);
      if (first < i) add("act-dup-" + i, "warn", "\"" + a.slice(0, 60) + "\" is listed twice, as CAP-" + String(first + 1).padStart(3, "0") + " and CAP-" + String(i + 1).padStart(3, "0") + ".", "exhaustive", "Step 1, Question 2");
    });

    // Authority type against invokers
    if (s.q.authorityType === "Invoker Authority" && (!t(s.q.invokers) || /not applicable|^n\/?a$/i.test(t(s.q.invokers)))) add("invoker", "warn", "Invoker Authority is selected but nobody is named who can invoke the persona.", "invoker", "Step 1, Question 2");

    // Dates
    var eff = NS.validISO(s.id.effectiveDate), rev = NS.validISO(s.id.reviewDate);
    if (t(s.id.effectiveDate) && !eff) add("date-eff", "warn", "Effective Date \"" + t(s.id.effectiveDate).slice(0, 20) + "\" is not a calendar date (YYYY-MM-DD).", "dates", "Step 9");
    if (t(s.id.reviewDate) && !rev) add("date-rev", "warn", "Review Date \"" + t(s.id.reviewDate).slice(0, 20) + "\" is not a calendar date (YYYY-MM-DD).", "dates", "Step 9");
    if (eff && rev && rev <= eff) add("date-order", "warn", "Review Date " + NS.isoDate(rev) + " falls on or before the Effective Date " + NS.isoDate(eff) + ".", "dates", "Step 9");

    // Tier 3 against the release plan (Chapter 9)
    if (T === 3 && s.team.deployment === "Full Deployment") add("t3-rollout", "warn", "A Tier 3 persona is set for Full Deployment. Chapter 9 asks for a staged rollout at Tier 3.", "ch9Tier3", "Step 7");
    if (T === 3) add("t3-scenarios", "info", "The dry-run pack carries two cases by design. Chapter 9 asks for 12 test scenarios at Tier 3, so plan the remaining cases for release testing.", "ch9Tier3", "Dry runs tab");

    // Handoff register entry
    if (s.handoff.enabled) {
      var gaps = [["sopId", "SOP ID"], ["depId", "dependency ID"], ["mcpServer", "MCP server"], ["purpose", "invocation purpose"]].filter(function (g) { return !t(s.handoff[g[0]]); }).map(function (g) { return g[1]; });
      if (!t(s.p2.name)) gaps.unshift("second persona name");
      if (!t(s.p2.l0)) gaps.push("second persona's Level 0 domain");
      if (gaps.length) add("handoff-gaps", "warn", "The handoff register entry is missing " + listJoin(gaps) + ".", "register", "Step 8");
    }

    // Status claims approval while the tier's checklist is open
    if (["Approved", "In Production"].indexOf(t(s.id.status)) >= 0) {
      var openNow = NS.TIER_SECTIONS[T].filter(function (n) { return NS.sectionMissing(s, n, T).length; });
      if (openNow.length) add("status-open", "block", "Status reads " + t(s.id.status) + " while Tier " + T + " sections " + listJoin(openNow.map(String)) + " are open.", "status", "Step 9");
    }
    return out;
  };

  /* ---------- what blocks sign-off ---------- */
  C.blockers = function (s) {
    var t = NS.t, T = NS.computeTier(s).effective, comp = C.completeness(s), row = comp.tiers[T - 1];
    var before = row.open.filter(function (o) { return o.n !== 18; }).map(function (o) { return { kind: "section", text: "Section " + o.n + " (" + o.title + ") is open: " + o.missing.join(", ") + ".", checklist: o.checklist }; });
    C.consistency(s).filter(function (f) { return f.severity === "block"; }).forEach(function (f) { before.push({ kind: "consistency", text: f.text, rule: f.rule, para: f.para, source: f.source }); });
    var sigs = [["signBO", "Business Owner"], ["signAIRM", "AI Resource Management"]].concat(T >= 3 ? [["signCO", "Compliance Officer"]] : []);
    var waiting = sigs.filter(function (g) { return !NS.signed(s.pkg[g[0]]); }).map(function (g) { return g[1] + (t(s.pkg[g[0]]) ? " (not a signature yet)" : ""); });
    var gate = NS.MODEL_TIERS.map(function (m) { return m[1] + ": " + NS.verdict(s, m[0]); }).join("; ");
    return { tier: T, before: before, signatures: waiting, gate: gate, gatePassed: NS.MODEL_TIERS.some(function (m) { return NS.verdict(s, m[0]) === "pass"; }) };
  };

  /* ---------- views ---------- */
  function ruleText(x) { return x.para ? "Paraphrase of the rule: " + x.rule : "Rule: \"" + x.rule + "\""; }
  C.ruleText = ruleText;
  function bar(done, total, label) {
    var pct = total ? Math.round(100 * done / total) : 0;
    return '<span class="bar" role="img" aria-label="' + NS.esc(label) + '"><span style="width:' + pct + '%"></span></span>';
  }
  C.panelHTML = function (s) {
    var esc = NS.esc, comp = C.completeness(s), T = comp.assigned, b = C.blockers(s), f = C.consistency(s);
    var h = (s.example ? '<p class="mono">' + esc(NS.EXAMPLE_LINE) + ".</p>" : "") + "<h3>Completeness by tier</h3>";
    h += '<table class="meter"><caption class="sr">Required sections complete, per tier</caption><thead><tr><th scope="col">Tier</th><th scope="col">Progress</th><th scope="col">Complete</th></tr></thead><tbody>';
    comp.tiers.forEach(function (row) {
      var lab = "Tier " + row.tier + ": " + row.complete.length + " of " + row.required.length + " required sections complete";
      h += "<tr" + (row.tier === T ? ' class="assigned"' : "") + '><th scope="row">Tier ' + row.tier + (row.tier === T ? ' <span class="badge ok">assigned</span>' : "") + "</th><td>" + bar(row.complete.length, row.required.length, lab) +
        '</td><td class="mono">' + row.complete.length + " of " + row.required.length + "</td></tr>";
    });
    h += "</tbody></table>";
    var cur = comp.tiers[T - 1];
    h += "<h3>Still open for Tier " + T + "</h3>";
    h += cur.open.length ? "<ul class=\"findings\">" + cur.open.map(function (o) {
      return "<li><b>Section " + o.n + ". " + esc(o.title) + "</b><br>Open: " + esc(o.missing.join(", ")) + o.checklist.map(function (c) { return '<span class="src">Checklist: ' + esc(c) + "</span>"; }).join("") + "</li>";
    }).join("") + "</ul>" : "<p>Every required section is complete.</p>";
    h += '<span class="src">Tier reference table and Tiered Completion Checklist: AI-Persona-Definition-Template.md</span>';
    h += "<h3>What blocks sign-off</h3>";
    if (b.before.length) h += '<ol class="findings">' + b.before.map(function (x) { return "<li>" + esc(x.text) + (x.rule ? '<span class="src">' + esc(ruleText(x)) + " (" + esc(x.source) + ")</span>" : "") + (x.checklist ? x.checklist.map(function (c) { return '<span class="src">Checklist: ' + esc(c) + "</span>"; }).join("") : "") + "</li>"; }).join("") + "</ol>";
    else h += "<p>Nothing in the form blocks sign-off.</p>";
    h += "<p><b>Signatures outstanding:</b> " + (b.signatures.length ? esc(b.signatures.join(", ")) : "none") + ".</p>";
    h += "<p><b>Release gate after sign-off</b> (vanilla-agent validation, Chapter 9): " + esc(b.gate) + ".</p>";
    h += "<h3>Consistency checks</h3>";
    if (!f.length) h += "<p>No conflicts found between authority, escalation, measures and tier.</p>";
    else h += (f.length > 200 ? '<p class="mono">Showing the first 200 of ' + f.length + " findings; the readiness report download lists them all.</p>" : "") + '<ul class="findings">' + f.slice(0, 200).map(function (x) {
      return '<li><span class="badge ' + (x.severity === "block" ? "miss" : "") + '">' + (x.severity === "block" ? "blocks sign-off" : x.severity === "info" ? "note" : "warning") + "</span> " + esc(x.text) +
        (x.where ? ' <span class="mono">(' + esc(x.where) + ")</span>" : "") + '<span class="src">' + esc(ruleText(x)) + " (" + esc(x.source) + ")</span></li>";
    }).join("") + "</ul>";
    return h;
  };
  C.readinessMd = function (s) {
    var t = NS.t, comp = C.completeness(s), T = comp.assigned, b = C.blockers(s), f = C.consistency(s);
    var out = ["# Readiness Report: " + (t(s.id.name) || "[persona name]"), ""];
    if (s.example) out.push("> " + NS.EXAMPLE_LINE + ".", "");
    out.push("> Built with Persona Forge. Assigned tier: Tier " + T + ". Checklist wording from AI-Persona-Definition-Template.md.", "", "## Completeness by tier", "",
      NS.table(["Tier", "Required sections complete", "Open sections"], comp.tiers.map(function (r) { return ["Tier " + r.tier + (r.tier === T ? " (assigned)" : ""), r.complete.length + " of " + r.required.length, r.open.map(function (o) { return o.n; }).join(", ") || "none"]; })), "",
      "## Still open for Tier " + T, "");
    comp.tiers[T - 1].open.forEach(function (o) { out.push("- **Section " + o.n + ". " + o.title + "**: open: " + o.missing.join(", ")); o.checklist.forEach(function (c) { out.push("  - Checklist: " + c); }); });
    if (!comp.tiers[T - 1].open.length) out.push("- none");
    out.push("", "## What blocks sign-off", "");
    b.before.forEach(function (x, i) { out.push((i + 1) + ". " + x.text + (x.rule ? " " + ruleText(x) + " (" + x.source + ")" : "")); });
    if (!b.before.length) out.push("Nothing in the form blocks sign-off.");
    out.push("", "- **Signatures outstanding:** " + (b.signatures.join(", ") || "none"), "- **Release gate after sign-off (vanilla-agent validation, Chapter 9):** " + b.gate, "", "## Consistency checks", "");
    f.forEach(function (x) { out.push("- **" + (x.severity === "block" ? "Blocks sign-off" : x.severity === "info" ? "Note" : "Warning") + ":** " + x.text + " " + ruleText(x) + " (" + x.source + ")"); });
    if (!f.length) out.push("- none");
    return out.join("\n") + "\n";
  };
})();
