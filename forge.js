/* Persona Forge. Static guided builder for an AI Persona delegation package.
   Sources (binding, section names mirrored): AI-Persona-Definition-Template.md, AI-Persona-Tier-Selection-Guide.md,
   sop-schema.md, Measurement-Blueprint-Template.md, delegation-package-checklist.md, vanilla-agent-log.md,
   cliff notes Chapter 6, 7, 9, 11. No network calls. State lives in memory, localStorage (best effort) and JSON export. */
(function () {
  "use strict";

  var STORE_KEY = "persona-forge:v1";
  var SCHEMA_VERSION = 2;
  var TABS = ["package", "sop", "blueprint", "checklist", "dryrun", "readiness", "handoff", "roundtrip"];
  var NS = window.PersonaForge = window.PersonaForge || {};
  function blankRun() {
    return { date: "", facilitator: "", trigger: "", c1: false, c2: false, c3: false, c4: false, c5: false, c6: false,
             trace: "", decisionOwner: "", followUp: "", nextDate: "", evidence: "", notes: "" };
  }

  /* ---------- default state ---------- */
  function blankState() {
    return {
      schema: SCHEMA_VERSION,
      step: 0,
      tab: "package",
      id: { name: "", description: "", version: "1.0", status: "Draft", effectiveDate: "", reviewDate: "",
            l0: "", l1: "", ln: "", businessOwner: "", businessOwnerContact: "", ownerGoal: "",
            sopOwner: "", airmLiaison: "", airmContact: "" },
      q: { delegation: "", intentName: "", outcome: "", objective: "", successCriteria: "", inScope: "", outOfScope: "",
           rationale: "", secondary: "",
           authorityType: "Owner Authority", authorityWhy: "", delegatedBy: "", invokers: "", reviewCycle: "",
           actions: "", prohibited: "", tools: "", finLimit: "", legal: "",
           kpi: "", kpiTarget: "", kpiCadence: "", monitoring: "", cadPerf: "", cadBoundary: "", cadStrategic: "", cadGov: "",
           testAuthority: false, testHorizon: false, testCausality: false },
      tier: { industry: "", data: "", impact: "", geo: "", crossDomain: false, override: "" },
      auth: { style: "", sentence: "" },
      esc: { t1Contact: "", t2Contact: "", t3Contact: "", triggers: "", confidence: "", killSwitch: "",
             overrideRoles: "", exceptions: "", incPerf: "", incSec: "", incBoundary: "", incEthics: "", emergency: "", violations: "" },
      data: { sources: "", fields: "", timeWindow: "", volume: "", geoRestr: "", anonymization: "", prohibitedData: "",
              dqCompleteness: "", dqAge: "", dqValidation: "", downstream: "", upContract: "", downContract: "" },
      sop: { id: "", title: "", version: "", mcpEndpoint: "", environment: "dev", trigger: "", inputs: "", steps: "",
             controlPoints: "", compliance: "", payloadRequest: "", payloadResponse: "", traceability: "" },
      meas: { financial: "", costImpact: "", keyResult: "", krPeriod: "", valueContribution: "", xla: "", sla: "", leading: "", lever: "",
              leverSetting: "", leverAuthority: "", risk: "", dq: "", telemetry: "", dashboards: "",
              volume: "", volumeBand: "", volumeTrigger: "", contributors: "", attribution: "", experiment: "",
              dataReadiness: "", sunset: "", extra: "" },
      team: { integration: "", integrationWhy: "", who: "", training: "", channels: "", culture: "",
              schedule: "", onDemand: "", blackout: "", fairness: "", transparency: "", dignity: "", systemRules: "",
              consumes: "", provides: "", regulations: "", euAiAct: "", dataClass: "", pia: "", auditFreq: "",
              retention: "", rights: "", risks: "", deployment: "", rollout: "", modelType: "", retraining: "",
              scenario: "", outcome17: "", caseA: "", caseB: "", related: "", replaces: "", references: "" },
      pkg: { signBO: "", signAIRM: "", signCO: "", registerRow: "", mcpRollback: "", scorecard: "", backlog: "",
             funding: "", vanillaLogId: "" },
      scoring: { frontier: blankRun(), mid: blankRun(), small: blankRun() },
      p2: { name: "", description: "", l0: "", l1: "", ln: "", businessOwner: "", sopOwner: "", airmLiaison: "" },
      handoff: { enabled: false, direction: "This persona hands off to the second", sopOwner: "The second persona's domain",
                 sopId: "", sopTitle: "", mcpServer: "", depId: "", purpose: "", trigger: "", payload: "", archetype: "",
                 vanilla: "", cacDate: "", cacAttendees: "", notes: "" },
      example: false,
      exampleId: "",
      overrides: {}
    };
  }

  var state = blankState();

  /* ---------- small utilities ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getPath(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function setPath(obj, path, v) {
    var ks = path.split("."), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== "object") o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  /* Type-checked merge. Only keys the blank state owns are copied; each value is coerced to the type of the
     blank value (string, boolean, nested object). Inherited and prototype keys are never touched.
     notes collects what was dropped or coerced, so an import can say so instead of failing silently. */
  var BAD_KEYS = { "__proto__": 1, "constructor": 1, "prototype": 1 };
  function own(o, k) { return o != null && Object.hasOwn(o, k); }
  function isPlain(o) { return o != null && typeof o === "object" && !Array.isArray(o); }
  function merge(base, extra, notes, path) {
    if (!isPlain(extra)) return base;
    path = path || "";
    Object.keys(extra).forEach(function (k) {
      if (own(BAD_KEYS, k)) { if (notes) notes.push("ignored key " + path + k); return; }
      if (!own(base, k)) { if (notes && path === "" && k !== "schema") notes.push("ignored unknown key " + k); return; }
      var b = base[k], v = extra[k], where = path + k;
      if (k === "overrides" && path === "") { base.overrides = cleanOverrides(v, notes); return; }
      if (isPlain(b)) { if (isPlain(v)) merge(b, v, notes, where + "."); else if (v != null && notes) notes.push(where + " was not an object; kept blank"); return; }
      if (typeof b === "boolean") { if (typeof v !== "boolean" && notes && v != null) notes.push(where + " read as " + (v === true)); base[k] = v === true; return; }
      if (typeof b === "number") { var n = Number(v); base[k] = isFinite(n) ? n : b; return; }
      if (v == null) { base[k] = ""; return; }
      if (typeof v === "object") { if (notes) notes.push(where + " was not text; kept blank"); base[k] = ""; return; }
      base[k] = String(v);
    });
    return base;
  }
  function cleanOverrides(v, notes) {
    var out = {};
    if (!isPlain(v)) { if (v != null && notes) notes.push("overrides were not an object; dropped"); return out; }
    Object.keys(v).forEach(function (k) {
      if (!/^(?:[1-9]|1[0-9])$/.test(k) || typeof v[k] !== "string") { if (notes) notes.push("refused override key " + JSON.stringify(k).slice(0, 24) + " (sections are 1 to 19)"); return; }
      if (t(v[k])) out[k] = v[k];
    });
    return out;
  }
  // Older drafts (schema 1) kept one date and facilitator for all three runs.
  function migrate(raw) {
    if (!isPlain(raw)) return raw;
    var sc = raw.scoring;
    if (isPlain(sc) && (sc.date != null || sc.facilitator != null)) {
      ["frontier", "mid", "small"].forEach(function (k) {
        if (sc[k] == null) sc[k] = {};
        if (isPlain(sc[k])) { if (sc[k].date == null) sc[k].date = sc.date || ""; if (sc[k].facilitator == null) sc[k].facilitator = sc.facilitator || ""; }
      });
    }
    return raw;
  }
  // Allowed values for every radio, select and enum field; anything else falls back to the blank value.
  function enumFields() {
    var map = {};
    STEPS.forEach(function (st) { (st.groups || []).forEach(function (g) { (typeof g[1] === "string" ? g[2] : g[1]).forEach(function (f) { if (f.opts) map[f.path] = f.opts; }); }); });
    ["industry", "data", "impact", "geo"].forEach(function (d) { map["tier." + d] = ["", "LOW", "MEDIUM", "HIGH"]; });
    map["tier.override"] = ["", "1", "2", "3"];
    map["auth.style"] = [""].concat(STYLES.map(function (x) { return x[0]; }));
    map["id.status"] = ["Draft", "In Review", "Approved", "In Production", "Deprecated"];
    map.exampleId = ["", "supplier", "ap", "report"];
    return map;
  }
  function sanitize(raw, notes) {
    var s = merge(blankState(), migrate(raw), notes);
    var blank = blankState(), en = enumFields();
    Object.keys(en).forEach(function (p) {
      var v = getPath(s, p);
      if (en[p].indexOf(v) < 0) { if (notes && t(v)) notes.push(p + " value not allowed; reset"); setPath(s, p, getPath(blank, p)); }
    });
    var st = Number(s.step); s.step = st >= 0 && st < STEPS.length && Math.floor(st) === st ? st : 0;
    if (TABS.indexOf(s.tab) < 0) s.tab = "package";
    s.schema = SCHEMA_VERSION;
    return s;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function t(v) { return String(v == null ? "" : v).trim(); }
  function ph(v, label) { return t(v) || "`[" + label + "]`"; }
  function lines(v) { return t(v).split(/\r\n|\r|\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function rows(v, n) {
    return lines(v).map(function (ln) {
      var cells = ln.split("|").map(function (c) { return c.trim(); });
      while (cells.length < n) cells.push("");
      if (cells.length > n) cells = cells.slice(0, n - 1).concat([cells.slice(n - 1).join(" / ")]);
      return cells;
    });
  }
  function bullets(v, label) {
    var ls = lines(v);
    return ls.length ? ls.map(function (x) { return "- " + x; }).join("\n") : "- `[" + label + "]`";
  }
  // "<!--" in user text would open an HTML comment in any markdown viewer and hide the rest of the file.
  function escComments(text) { return String(text).replace(/<!--/g, "<!-\u200B-"); }
  function cell(s) { return String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\r\n|\r|\n/g, " "); }
  function table(headers, body, emptyLabel) {
    var out = "| " + headers.join(" | ") + " |\n|" + headers.map(function () { return "---"; }).join("|") + "|\n";
    if (!body.length) body = [headers.map(function (_, i) { return i === 0 ? "`[" + (emptyLabel || "to be completed") + "]`" : ""; })];
    return out + body.map(function (r) { return "| " + r.map(function (c) { return cell(c) || " "; }).join(" | ") + " |"; }).join("\n");
  }
  function isoDate(d) { var p = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  function fname(base, suffix) { return t(base) ? slug(base) + "-" + suffix : suffix; }
  function slug(s) { return (t(s) || "persona").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "persona"; }
  function usd(v) { var n = Number(v); if (t(v) === "" || !isFinite(n)) return ""; return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US"); }
  function finNum(s) { var n = Number(t(s.q.finLimit)); return t(s.q.finLimit) !== "" && isFinite(n) ? n : null; }
  // Add months without the month-end roll-over (Aug 31 + 6 months is Feb 28, not March 3).
  function addMonths(d, m) { var r = new Date(d.getFullYear(), d.getMonth() + m, 1); var last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(d.getDate(), last)); return r; }
  function validISO(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t(v)); if (!m) return null; var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null; }
  function domainKey(v) { return t(v).toLowerCase().replace(/\s+/g, " "); }
  function handoffCrosses(s) { return !!(s.handoff.enabled && t(s.p2.l0) && t(s.id.l0) && domainKey(s.p2.l0) !== domainKey(s.id.l0)); }
  // A sign-off counts only with at least two words of letters and no placeholder token.
  var SIGN_PLACEHOLDERS = { pending: 1, tbd: 1, "n/a": 1, na: 1, awaiting: 1, x: 1, "-": 1 };
  function signed(v) {
    var s = t(v); if (!s || /`\[|\[[^\]]*\]/.test(s)) return false;
    var toks = s.toLowerCase().split(/[\s,;:()]+/).filter(Boolean);
    if (toks.some(function (k) { return own(SIGN_PLACEHOLDERS, k) || own(SIGN_PLACEHOLDERS, k.replace(/[.!?]+$/, "")); })) return false;
    return (s.match(/\p{L}+/gu) || []).length >= 2;
  }

  /* ---------- methodology constants (each with its source) ---------- */
  var SECTIONS = [
    [1, "AI Persona Identification", "**[TIER 1 REQUIRED]**"],
    [2, "Governance and Ownership", "**[TIER 1 REQUIRED]**"],
    [3, "Three-Question Discovery Results", "**[TIER 1 REQUIRED]**"],
    [4, "Intent and Mandate", "**[TIER 1 REQUIRED]**"],
    [5, "Capabilities (Permitted Actions & Tools)", "**[TIER 1 REQUIRED]**"],
    [6, "Data Contract (Information Access Scope)", "**[TIER 1 PARTIAL -- Complete 6.1 and 6.3 only; TIER 2 FULL]**"],
    [7, "Scope & Ways of Working (Operational & Ethical Guardrails)", "**[TIER 2 REQUIRED]**"],
    [8, "Authority Model (Context of Action)", "**[TIER 1 REQUIRED]**"],
    [9, "Interacting Services and Actors", "**[TIER 2 REQUIRED]**"],
    [10, "Performance Measurement (5-Tier Framework)", "**[TIER 2 REQUIRED]**"],
    [11, "Multi-Contributor KPI Attribution", "**[TIER 3 REQUIRED]**"],
    [12, "Lifecycle Management", "**[TIER 3 REQUIRED]**"],
    [13, "Regulatory and Compliance", "**[TIER 2 REQUIRED]**"],
    [14, "Risk Management", "**[TIER 2 REQUIRED]**"],
    [15, "Trusted AI (Scope) Framework Integration", "**[TIER 3 REQUIRED]**"],
    [16, "Collaborative Data Supply Chain Integration", "**[TIER 3 REQUIRED]**"],
    [17, "Worked Example", "**[TIER 3 REQUIRED]**"],
    [18, "Approval and Sign-Off", "**[TIER 1 REQUIRED -- Lightweight sign-off only]**"],
    [19, "Supporting Documentation", "**[TIER 3 REQUIRED]**"]
  ];
  var SRC = {
    template: "AI-Persona-Definition-Template.md",
    tierGuide: "AI-Persona-Tier-Selection-Guide.md",
    sop: "sop-schema.md",
    blueprint: "Measurement-Blueprint-Template.md",
    checklist: "delegation-package-checklist.md",
    vlog: "vanilla-agent-log.md",
    ch6: "Chapter-06 notes", ch7: "Chapter-07 notes", ch8: "Chapter-08 notes", ch9: "Chapter-09 notes", ch11: "Chapter-11 notes",
    register: "cross-domain-sop-register.md"
  };
  // Tier reference table, AI-Persona-Definition-Template.md
  var TIER_SECTIONS = { 1: [1, 2, 3, 4, 5, 6, 8, 18], 2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 18], 3: SECTIONS.map(function (s) { return s[0]; }) };
  // Counts as the template and guide state them: Tier 2 counts Section 6 twice (partial at Tier 1, full at Tier 2).
  var TIER_COUNT = { 1: "8 sections", 2: "14 sections (13 distinct; Section 6 completes in full)", 3: "all 19 sections" };
  var TIER_READOUT = { 1: "8 sections required; typical effort 2 to 4 hours.", 2: "14 sections required (13 distinct; Section 6 completes in full); typical effort 1 to 2 days.", 3: "All 19 sections required; typical effort 3 to 5 days." };
  var TIER_LABEL = { 1: "Discovery / Low Risk", 2: "Governance-Ready / Medium Risk", 3: "Full Specification / High Risk" };
  var TIER_TIME = { 1: "2--4 hours", 2: "1--2 days", 3: "3--5 days of effort; 2--3 weeks elapsed" };
  // Scoring matrix, AI-Persona-Tier-Selection-Guide.md
  var DIMS = [
    ["industry", "Industry Sector", [
      "Unregulated or lightly regulated (e.g., internal operations, general retail)",
      "Moderately regulated (e.g., manufacturing with safety standards, food supply chain)",
      "Heavily regulated (e.g., financial services, healthcare, defence, pharmaceuticals)"]],
    ["data", "Data Sensitivity", [
      "Internal operational data only; no PII, no customer data",
      "Customer data with PII; commercially sensitive data",
      "Regulated data (PHI, financial records, biometric); data subject to cross-border restrictions"]],
    ["impact", "Decision Impact", [
      "Recommendations only; no autonomous action; fully reversible",
      "Autonomous actions within defined limits; reversible with cost",
      "Irreversible decisions; safety-critical outcomes; direct customer-facing actions without human review"]],
    ["geo", "Geography", [
      "Single jurisdiction; no cross-border data flows",
      "Multiple jurisdictions within one regulatory regime (e.g., US multi-state with CCPA); no cross-regime data transfers",
      "Cross-regime operation (e.g., US + EU, US + APAC); jurisdictions with AI-specific legislation (EU AI Act); cross-border data transfers requiring SCCs or BCRs"]]
  ];
  var FIN_THRESHOLD = 50000; // AI-Persona-Tier-Selection-Guide.md, decision tree step 2
  // Escalation tiers, Chapter 7 notes
  var ESC_TIERS = [
    ["t1Contact", "Tier 1 (Routine Variance)", "4-hour SLA", "Persona meets an edge case the SOP does not cover but the mandate does.", "Service Owner reviews and updates the SOP"],
    ["t2Contact", "Tier 2 (Boundary Breach)", "1-hour SLA", "Persona attempts an action outside its defined scope.", "AI RM steward pauses the persona and investigates root cause"],
    ["t3Contact", "Tier 3 (Systemic Risk)", "15-minute SLA", "Sustained drift, jailbreak attempt or compliance violation.", "Persona suspended immediately; AI RM on-call engages the executive sponsor"]
  ];
  // Authority styles: builder convention for phrasing Section 8.2 delegation scope (not named in the templates)
  var STYLES = [
    ["LIST", "Name every permitted action. Anything unlisted is refused.",
     "The persona may perform only these actions: {permitted actions}. Any action not on this list is not permitted."],
    ["PRINCIPLE", "State the outcome and the bounds. The persona chooses actions inside them.",
     "The persona may take any action that advances {outcome}, provided the action can be reversed, stays inside the Section 6 data contract and commits no spend above {financial limit}."],
    ["EXAMPLE", "Anchor authority on a reference case. Material differences go up the escalation path.",
     "The persona may act on cases that resemble this one: {reference case}. A case that differs from it in a material way goes to {Tier 1 contact}."],
    ["PROHIBITION", "Grant the domain and fence it with named prohibitions.",
     "The persona may act freely within {controlling domain}, except that it must never: {prohibited actions}."]
  ];
  // Pass criteria, Chapter 9 notes (vanilla-agent validation)
  var CRITERIA = [
    ["c1", "Case A (happy path): every SOP step executed, in order"],
    ["c2", "Case B (edge case): every SOP step executed and the right control point or escalation fired"],
    ["c3", "No hallucinated steps: nothing the SOP does not contain"],
    ["c4", "No guardrail violations: no prohibited action, no data outside the contract"],
    ["c5", "No clarification requests: the agent did not need to ask"],
    ["c6", "Log follows the vanilla-agent-log format, all five sections present"]
  ];
  // Suggestions offered where the template leaves the mapping open. Shown as editable placeholders and labelled in the output.
  var SUGGEST_LABEL = " _(suggested; the template leaves this open)_";
  var SUGGEST = {
    incPerf: "Tier 1 (Routine Variance), 4-hour SLA",
    incSec: "Tier 3 (Systemic Risk), 15-minute SLA",
    incBoundary: "Tier 2 (Boundary Breach), 1-hour SLA",
    incEthics: "Tier 3 (Systemic Risk), 15-minute SLA",
    emergency: "AI RM steward pauses the persona (Tier 2 escalation) and the change follows within the Tier 2 SLA",
    violations: "Tier 3 (Systemic Risk) escalation; persona suspended, 15-minute SLA"
  };
  function sug(s, k) { return t(s.esc[k]) || (Object.hasOwn(SUGGEST, k) ? SUGGEST[k] + SUGGEST_LABEL : ""); }
  // Tiered Completion Checklist, AI-Persona-Definition-Template.md (wording copied)
  var TIER_CHECKLIST = {
    "1@1": "Persona name, description, version, and status recorded",
    "2@1": "Business Owner and AI RM liaison identified; controlling domain specified",
    "3@1": "Three-Question Discovery results documented with in-scope and out-of-scope boundaries",
    "4@1": "Primary intent and mandate statement defined with business objective alignment",
    "5@1": "Capabilities list is exhaustive (if not listed, not permitted); prohibited actions stated",
    "6@1": "Permitted data sources (6.1) and data restrictions (6.3) specified",
    "8@1": "Authority model selected (Owner or Invoker) with delegation framework",
    "18@1": "Business Owner sign-off obtained; AI RM acknowledgement recorded",
    "6@2": "Permitted data types and fields (6.2) completed with exact field names",
    "7@2": "Operational rules, ethical guardrails, and business rules documented",
    "9@2": "Consuming and providing service interactions mapped with SLA dependencies",
    "10@2": "Performance measures defined across all 5 tiers with targets",
    "13@2": "Applicable regulations identified; compliance monitoring metrics set",
    "14@2": "Risk assessment completed with preventive, detective, and corrective controls",
    "11@3": "Multi-contributor KPI attribution methodology defined with shared responsibility model",
    "12@3": "Lifecycle management plan covering development, deployment, monitoring, change, and decommissioning",
    "15@3": "Trusted AI (Scope) boundary visualised with scope clarity checklist completed",
    "16@3": "Data supply chain mapped with upstream and downstream node contracts",
    "17@3": "Worked example scenario documented showing end-to-end persona operation",
    "18@3": "Compliance Officer sign-off obtained in addition to Business Owner and AI RM",
    "19@3": "All supporting documentation referenced and linked"
  };
  var CHECK_ADDS = { 1: [1, 2, 3, 4, 5, 6, 8, 18], 2: [6, 7, 9, 10, 13, 14], 3: [11, 12, 15, 16, 17, 18, 19] };
  function checklistLine(n, tier) { return TIER_CHECKLIST[n + "@" + tier]; }
  // The twelve measure types and their tiers, Chapter 11 notes
  var MEASURE_TYPES = { OBJECTIVE: 1, FINANCIAL_METRIC: 1, KEY_RESULT: 2, KPI_OUTCOME: 2, VALUE_CONTRIBUTION: 2, COST_IMPACT: 2,
    XLA: 3, SLA: 3, LEADING_INDICATOR: 4, VALUE_LEVER: 4, RISK_LEVEL: 5, DATA_QUALITY_ISSUE_IMPACT: 5 };
  // Chapter 9 notes, Vanilla-Agent Validation (quoted)
  var CH9_RULE = "If a generic Foundation Model -- given only the SOP text and no domain knowledge -- can execute the procedure correctly, then the SOP is procedurally complete and unambiguous.";
  var CH9_FAIL = "A \"fail\" verdict means the agent hallucinated steps, violated guardrails, or asked for clarification -- signaling implicit knowledge that must be made explicit.";
  var EXAMPLE_LINE = "Worked example; values are illustrations";
  var MODEL_TIERS = [["frontier", "Frontier"], ["mid", "Mid"], ["small", "Small"]];

  /* ---------- tier logic (decision tree, AI-Persona-Tier-Selection-Guide.md) ---------- */
  function computeTier(s) {
    var vals = DIMS.map(function (d) { return s.tier[d[0]]; });
    var unscored = DIMS.filter(function (d) { return !s.tier[d[0]]; }).map(function (d) { return d[1]; });
    var anyHigh = vals.indexOf("HIGH") >= 0, anyMed = vals.indexOf("MEDIUM") >= 0;
    var fin = (finNum(s) || 0) > FIN_THRESHOLD;
    var viaHandoff = handoffCrosses(s);
    var cross = !!s.tier.crossDomain || viaHandoff;
    var trace = [
      ["Does ANY of the four risk dimensions score HIGH?", anyHigh, 3],
      ["Does the persona have financial authority > $50K per autonomous decision?", fin, 3],
      ["Does the persona consume or produce data across domain boundaries?", cross, 3],
      ["Does ANY of the four risk dimensions score MEDIUM?", anyMed, 2],
      ["All dimensions LOW and single-domain operation?", true, 1]
    ];
    var computed = 1, hitAt = 4;
    for (var i = 0; i < trace.length; i++) { if (trace[i][1]) { computed = trace[i][2]; hitAt = i; break; } }
    if (unscored.length) { computed = 3; hitAt = -1; }
    var ov = Number(s.tier.override) || 0;
    if (!(ov >= 0 && ov <= 3)) ov = 0;
    return { computed: computed, effective: Math.max(computed, ov), raised: ov > computed, trace: trace, hitAt: hitAt, unscored: unscored, fin: fin, cross: cross, viaHandoff: viaHandoff };
  }
  function required(n, T) { return TIER_SECTIONS[T].indexOf(n) >= 0; }

  /* ---------- derived pieces ---------- */
  function actionRows(s) { return rows(s.q.actions, 4); }
  function escContact(s, k) {
    var row = ESC_TIERS.filter(function (e) { return e[0] === k; })[0];
    return t(s.esc[k]) || row[4];
  }
  function styleSentence(s, style) {
    var row = STYLES.filter(function (x) { return x[0] === style; })[0];
    if (!row) return "";
    var acts = actionRows(s).map(function (r) { return r[0]; }).filter(Boolean);
    var map = {
      "{permitted actions}": acts.length ? acts.join("; ") : "[permitted actions]",
      "{outcome}": t(s.q.outcome) || "[outcome]",
      "{financial limit}": usd(s.q.finLimit) || "[financial limit]",
      "{reference case}": t(s.team.caseA) || "[reference case]",
      "{Tier 1 contact}": escContact(s, "t1Contact"),
      "{controlling domain}": t(s.id.ln) || t(s.id.l1) || t(s.id.l0) || "[controlling domain]",
      "{prohibited actions}": lines(s.q.prohibited).join("; ") || "[prohibited actions]"
    };
    return row[2].replace(/\{[^}]+\}/g, function (m) { return map[m] || m; });
  }
  function authSentence(s) { return t(s.auth.sentence) || (s.auth.style ? styleSentence(s, s.auth.style) : ""); }

  /* ---------- section completeness (feeds the checklist and the badges) ---------- */
  var SECTION_NEEDS = {
    1: [["id.name", "persona name"], ["id.description", "description"], ["id.version", "version"], ["id.status", "status"]],
    2: [["id.businessOwner", "business owner"], ["id.airmLiaison", "AI RM liaison"], ["id.l0", "Level 0 service"]],
    3: [["q.delegation", "delegation statement"], ["q.inScope", "in scope"], ["q.outOfScope", "out of scope"], ["team.integration", "integration model"]],
    4: [["q.outcome", "mandate statement"], ["q.objective", "business objective"]],
    5: [["q.actions", "permitted actions"], ["q.prohibited", "prohibited actions"]],
    6: [["data.sources", "permitted data sources"], ["data.prohibitedData", "prohibited data"]],
    7: [["team.schedule", "operating schedule"], ["esc.triggers", "escalation triggers"], ["team.fairness", "fairness constraints"]],
    8: [["q.authorityType", "authority type"], ["auth.style", "authority style"], ["q.delegatedBy", "delegated by"]],
    9: [["team.consumes", "services consumed"], ["team.who", "human actors"]],
    10: [["q.objective", "Tier 1 objective"], ["q.kpi", "primary KPI"], ["q.kpiTarget", "KPI target"], ["meas.sla|meas.xla", "Tier 3 SLA or XLA"],
         ["meas.leading|meas.lever", "Tier 4 leading indicator or value lever"], ["meas.risk|meas.dq", "Tier 5 risk level or data quality measure"]],
    11: [["meas.contributors", "contributors"], ["meas.attribution", "attribution approach"]],
    12: [["team.deployment", "deployment approach"], ["team.retraining", "retraining schedule"]],
    13: [["team.regulations", "applicable regulations"], ["team.auditFreq", "audit frequency"]],
    14: [["team.risks", "risk assessment"], ["meas.telemetry|esc.triggers", "detective controls (telemetry or escalation triggers)"], ["esc.killSwitch", "corrective control (kill switch)"]],
    15: [["q.actions", "permitted actions"], ["data.prohibitedData", "prohibited data"]],
    16: [["data.sources", "upstream nodes"], ["data.downstream", "downstream nodes"]],
    17: [["team.scenario", "scenario"], ["sop.steps", "procedure steps"]],
    18: [["pkg.signBO", "Business Owner sign-off"], ["pkg.signAIRM", "AI RM acknowledgement"]],
    19: [["team.references", "references"]]
  };
  function sectionMissing(s, n, T) {
    if (t(s.overrides[n])) return [];
    var needs = SECTION_NEEDS[n].slice();
    if (n === 6 && T >= 2) needs.push(["data.fields", "data types and fields (6.2)"]);
    if (n === 18 && T >= 3) needs.push(["pkg.signCO", "Compliance Officer sign-off"]);
    return needs.filter(function (nd) {
      return !nd[0].split("|").some(function (p) {
        var v = getPath(s, p);
        if (typeof v === "boolean") return v;
        return n === 18 ? signed(v) : !!t(v);
      });
    }).map(function (nd) { return nd[1] + (n === 18 && t(getPath(s, nd[0])) ? " (not a signature yet)" : ""); });
  }

  /* ---------- the 19 sections ---------- */
  function genSection(n, s, T) {
    var acts = actionRows(s);
    var approvalActs = acts.filter(function (r) { return /^y/i.test(r[3]); }).map(function (r) { return r[0]; });
    var style = s.auth.style;
    var srcRows = rows(s.data.sources, 4);
    switch (n) {
      case 1: return [
        "### 1.1 AI Persona Name", "**Name:** " + ph(s.id.name, "persona name"), "",
        "### 1.2 Description", "**Description:** " + ph(s.id.description, "description"), "",
        "### 1.3 Version and Status",
        "**Version:** " + ph(s.id.version, "version"), "",
        "**Status:** " + ph(s.id.status, "Draft | In Review | Approved | In Production | Deprecated"), "",
        "**Effective Date:** " + ph(s.id.effectiveDate, "effective date"), "",
        "**Review Date:** " + ph(s.id.reviewDate, "next scheduled review")].join("\n");
      case 2: return [
        "### 2.1 Business Owner(s)", "",
        table(["Name/Role", "Responsibilities", "Contact", "Priority/Goal"], [[ph(s.id.businessOwner, "business owner"),
          "Accountable for AI Persona performance, risk management, and boundary adherence. Approves changes to AI rules and manages associated risks.",
          ph(s.id.businessOwnerContact, "contact"), ph(s.id.ownerGoal, "priority or goal")]]), "",
        "**Tripartite accountability (Chapter 7):** Service Owner: " + ph(s.id.businessOwner, "service owner") + ". SOP Owner: " + ph(s.id.sopOwner, "SOP owner") + ". AI RM: " + ph(s.id.airmLiaison, "AI RM liaison") + ".", "",
        "### 2.2 AI Resource Management Liaison", "",
        "**Responsible Person/Team:** " + ph(s.id.airmLiaison, "AI RM liaison"), "",
        "**Contact:** " + ph(s.id.airmContact, "contact"), "",
        "**Responsibilities:**", "- Technical health monitoring", "- Model performance tracking", "- Infrastructure management",
        "- Security and compliance (technical aspects)", "- Escalation handling", "- Lifecycle management (updates, retraining, decommissioning)", "",
        "### 2.3 Controlling Domain", "",
        "**Service Domain:** " + ph(t(s.id.l1) ? t(s.id.l0) + " → " + t(s.id.l1) : s.id.l0, "service domain"), "",
        "**Location in Service Hierarchy:**", "- Level 0: " + ph(s.id.l0, "parent service"), "- Level 1: " + ph(s.id.l1, "service at this level"),
        "- Level N: " + ph(s.id.ln || s.id.name, "this AI Persona's position")].join("\n");
      case 3: return [
        "### 3.1 Question 1: What Do You Want to Delegate to AI?", "",
        "**Delegation Statement:** " + ph(s.q.delegation, "delegation statement"), "",
        "**In Scope (What IS delegated):**", bullets(s.q.inScope, "specific activity"), "",
        "**Out of Scope (What is NOT delegated):**", bullets(s.q.outOfScope, "specific exclusion"), "",
        "**Rationale for Delegation:**", ph(s.q.rationale, "why this function suits AI delegation"), "",
        "### 3.2 Question 2: How Will You Manage That AI?", "",
        "**Management Approach:** " + ph(s.q.authorityType, "authority type") + " delegated by " + ph(s.q.delegatedBy || s.id.businessOwner, "delegator") +
          (style ? ", authority written in the " + style + " style (Section 8.2)." : ".") + (t(s.q.monitoring) ? " " + t(s.q.monitoring) : ""), "",
        "**Performance Measures:** (See Section 10 for details)",
        "- Primary KPI: " + ph(s.q.kpi, "primary KPI") + (t(s.q.kpiTarget) ? " (target: " + t(s.q.kpiTarget) + ")" : ""),
        "- Success Metrics: " + [s.meas.sla, s.meas.xla, s.meas.leading].map(t).filter(Boolean).join("; ").replace(/^$/, "`[2-3 key metrics]`"), "",
        "**Monitoring Mechanisms:**",
        "- **Frequency:** " + ph(s.q.kpiCadence, "monitoring frequency"),
        "- **Alerts:** " + (lines(s.esc.triggers).join("; ") || "`[what triggers escalation to Business Owner]`"),
        "- **Dashboards:** " + ph(s.meas.dashboards, "dashboards"), "",
        "**Control Mechanisms:**",
        "- **Approval Workflows:** " + (approvalActs.join("; ") || "`[what requires human approval]`"),
        "- **Override Capabilities:** " + ph(s.esc.overrideRoles, "how humans can intervene"),
        "- **Kill Switch:** " + ph(s.esc.killSwitch, "emergency shutdown procedure"), "",
        "**Review Cadence:**",
        "- Performance Review: " + ph(s.q.cadPerf, "e.g., Weekly"),
        "- Boundary Audit: " + ph(s.q.cadBoundary, "e.g., Monthly"),
        "- Strategic Alignment: " + ph(s.q.cadStrategic, "e.g., Quarterly"),
        "- Full Governance Review: " + ph(s.q.cadGov, "e.g., Annually"), "",
        "### 3.3 Question 3: How Will You Include It in Your Team?", "",
        "**Integration Model:** " + ph(s.team.integration, "Assistant | Collaborator | Specialist"), "",
        "**Selected Model:** " + ph(s.team.integration, "model") + (t(s.team.integrationWhy) ? ". " + t(s.team.integrationWhy) : ""), "",
        "**Team Integration:**",
        "- **Who Interacts:** " + (rows(s.team.who, 4).map(function (r) { return r[0]; }).join(", ") || "`[roles]`"),
        "- **How They Interact:** " + (rows(s.team.who, 4).map(function (r) { return r[0] + ": " + r[1]; }).join("; ") || "`[workflow description]`"),
        "- **Training Required:** " + ph(s.team.training, "training"),
        "- **Communication Channels:** " + ph(s.team.channels, "channels"), "",
        "**Cultural Considerations:**", ph(s.team.culture, "change management")].join("\n");
      case 4: return [
        "### 4.1 Primary Intent", "",
        "**Intent Name:** " + ph(s.q.intentName, "intent name"), "",
        "**Mandate Statement:** " + ph(s.q.outcome, "business goal the persona is delegated to achieve"), "",
        "**Business Objective Alignment:**", ph(s.q.objective, "business objective"), "",
        "**Success Criteria:**", ph(s.q.successCriteria || (t(s.q.kpi) ? s.q.kpi + " at " + s.q.kpiTarget : ""), "success criteria"), "",
        "### 4.2 Secondary Intents (if applicable)", "",
        table(["Intent Name", "Mandate", "Priority", "Success Measure"], rows(s.q.secondary, 4), "none recorded")].join("\n");
      case 5: return [
        "### 5.1 Permitted Actions", "",
        table(["Capability ID", "Action Description", "Inputs Required", "Outputs Produced", "Approval Required?"],
          acts.map(function (r, i) { return ["CAP-" + String(i + 1).padStart(3, "0"), r[0], r[1], r[2], r[3] || "No"]; }), "permitted action"), "",
        "**Additional Capabilities:**", "- None. If it is not listed, it is not permitted.", "",
        "### 5.2 Prohibited Actions", "", bullets(s.q.prohibited, "prohibited action"), "",
        "### 5.3 Tools and Systems Access", "",
        table(["System/Tool", "Access Level", "Permitted Operations", "Restrictions"], rows(s.q.tools, 4), "system or tool")].join("\n");
      case 6: return [
        "### 6.1 Permitted Data Sources", "",
        table(["Data Source", "System Name", "Access Type", "Justification"], srcRows, "data source"), "",
        "### 6.2 Permitted Data Types and Fields", "",
        (T < 2 ? "_Not required at Tier 1._\n\n" : "") + bullets(s.data.fields, "permitted field"), "",
        "### 6.3 Data Restrictions and Constraints", "",
        "**Access Constraints:**",
        "- **Time Window:** " + ph(s.data.timeWindow, "time window"),
        "- **Volume Constraints:** " + ph(s.data.volume, "volume"),
        "- **Geographic Restrictions:** " + ph(s.data.geoRestr, "geography"),
        "- **Anonymization Requirements:** " + ph(s.data.anonymization, "anonymization"), "",
        "**Prohibited Data:**", bullets(s.data.prohibitedData, "prohibited data"), "",
        "**Data Quality Requirements:**",
        "- Minimum data completeness: " + ph(s.data.dqCompleteness, "completeness"),
        "- Maximum data age: " + ph(s.data.dqAge, "age"),
        "- Data validation: " + ph(s.data.dqValidation, "validation")].join("\n");
      case 7: return [
        "### 7.1 Operational Rules", "",
        "**Operating Schedule:**",
        "- **Frequency:** " + ph(s.team.schedule, "schedule"),
        "- **On-Demand:** " + ph(s.team.onDemand, "manual trigger and by whom"),
        "- **Blackout Periods:** " + ph(s.team.blackout, "blackout periods"), "",
        "**Processing Rules:**",
        "- **Confidence Thresholds:**",
        "  - Minimum confidence for action: " + ph(s.esc.confidence, "threshold"),
        "  - Escalation threshold: " + (t(s.esc.confidence) ? "Below " + t(s.esc.confidence) + " → Manual Review Queue" : "`[threshold → Manual Review Queue]`"),
        "- **Action Catalog:** " + (acts.length ? "Only CAP-001 to CAP-" + String(acts.length).padStart(3, "0") + " in Section 5.1" : "`[approved action catalogue]`"), "",
        "**Escalation Rules:**", "- **Automatic Escalation Triggers:**",
        lines(s.esc.triggers).map(function (x) { return "  - " + x; }).join("\n") || "  - `[trigger]`", "",
        "**Exception Handling:**", bullets(s.esc.exceptions, "data quality, system unavailability, anomalies"), "",
        "### 7.2 Ethical Guardrails", "",
        "**Fairness Constraints:**", bullets(s.team.fairness, "fairness constraint"), "",
        "**Transparency Requirements:**", bullets(s.team.transparency, "transparency requirement"), "",
        "**Human Dignity:**", bullets(s.team.dignity, "human dignity rule"), "",
        "**Compliance Alignment:**", bullets(s.team.regulations, "regulation"), "",
        "### 7.3 Business Rules", "",
        "**Approval Workflows:**", "- Actions requiring human approval:",
        (approvalActs.map(function (x) { return "  - " + x; }).join("\n") || "  - `[action]`"), "",
        "**Override Capabilities:**",
        "- Who can override AI recommendations: " + ph(s.esc.overrideRoles, "roles"),
        "- Process for override: recorded in the persona's decision log with a reason",
        "- Override tracking: override rate reported with the Tier 3 measures (Section 10.3)", "",
        "**Interaction with Other Systems:**", bullets(s.team.systemRules, "system interaction rule")].join("\n");
      case 8:
        var owner = s.q.authorityType !== "Invoker Authority";
        return [
          "### 8.1 Authority Type", "",
          "- [" + (owner ? "x" : " ") + "] **Owner Authority**: AI acts autonomously based on its defined mandate and rules, on behalf of the controlling domain/owner. The owner delegates standing authority.", "",
          "- [" + (owner ? " " : "x") + "] **Invoker Authority**: AI acts as an assistant or tool for the specific human/system invoking it, operating under their immediate context. The invoker delegates temporary authority for a specific task.", "",
          "**Selected:** " + ph(s.q.authorityType, "Owner Authority | Invoker Authority"), "",
          "**Justification:** " + ph(s.q.authorityWhy, "why this authority model fits"), "",
          "### 8.2 Delegation Framework", "",
          owner ? ["**For Owner Authority:**",
            "- Authority delegated by: " + ph(s.q.delegatedBy || s.id.businessOwner, "business owner"),
            "- Delegation scope (" + (style || "style not chosen") + "): " + ph(authSentence(s), "delegation scope"),
            "- Delegation constraints: prohibited actions in Section 5.2; escalation per Section 14.3" + (usd(s.q.finLimit) ? "; financial authority per autonomous decision " + usd(s.q.finLimit) : ""),
            "- Authority review cycle: " + ph(s.q.reviewCycle, "review cycle")].join("\n")
            : ["**For Invoker Authority:**",
            "- Who can invoke: " + ph(s.q.invokers, "roles"),
            "- Invocation context: " + ph(s.sop.trigger, "circumstances"),
            "- Invoker's responsibility: reviews and owns the output before acting on it",
            "- Result ownership: the invoking role",
            "- Delegation scope (" + (style || "style not chosen") + "): " + ph(authSentence(s), "delegation scope")].join("\n"), "",
          "### 8.3 Accountability", "",
          "**When AI Acts:**",
          "- Immediate accountability: " + (owner ? ph(s.q.delegatedBy || s.id.businessOwner, "delegator") : "the invoking role"),
          "- Ultimate accountability: " + ph(s.id.businessOwner, "business owner"),
          "- Legal accountability: " + ph(s.q.legal, "legal accountability"), "",
          "**Traceability:**",
          "- All actions logged: Yes",
          "- Action attribution: every SOP step logs the SOP ID, step number, MCP interaction ID and persona identity (Identity, Authority, Rationale and Outcome pillars, Chapter 7)",
          "- Human review capability: Yes, from the decision log"].join("\n");
      case 9: return [
        "### 9.1 Service Interactions", "",
        "**Services This AI Persona Consumes From:**", "",
        table(["Service Name", "Capability Used", "Frequency", "Data Exchanged", "SLA Dependency"], rows(s.team.consumes, 5), "service"), "",
        "**Services This AI Persona Provides To:**", "",
        table(["Service Name", "Capability Provided", "Frequency", "Data Provided", "Purpose"], rows(s.team.provides, 5), "service"), "",
        "### 9.2 Actor Interactions", "",
        "**Human Actors:**", "",
        table(["Actor Role", "Interaction Type", "Frequency", "Purpose"], rows(s.team.who, 4), "actor role"), "",
        "**System Actors:**", "",
        table(["System Name", "Interaction Type", "Frequency", "Purpose"], rows(s.q.tools, 4).map(function (r) { return [r[0], r[1] + ": " + r[2], "Per SOP run", r[3]]; }), "system")].join("\n") +
        (s.handoff.enabled ? "\n\n" + handoffClause(s, "a") : "");
      case 10: return [
        "### 10.1 Strategic Measures (Tier 1)", "", "**Objective:**", ph(s.q.objective, "business objective"), "",
        "### 10.2 Performance & Outcome Measures (Tier 2)", "",
        "**Key Result:**", "- Metric: " + ph(s.meas.keyResult, "key result"), "- Measurement Period: " + ph(s.meas.krPeriod, "period"), "- Target: stated in the metric", "",
        "**KPI Outcome (AI-Specific):**", "- Primary KPI: " + ph(s.q.kpi, "primary KPI"), "- Target: " + ph(s.q.kpiTarget, "target"), "",
        "**Direct measure tests (Chapter 11):** Authority " + (s.q.testAuthority ? "pass" : "open") + "; Horizon " + (s.q.testHorizon ? "pass" : "open") + "; Causality " + (s.q.testCausality ? "pass" : "open") + ".", "",
        "**Value Contribution:**", "- Financial Impact: " + ph(s.meas.valueContribution, "value contribution"),
        "- Calculation Method: " + ph(t(s.meas.attribution) ? s.meas.attribution + (t(s.meas.experiment) ? ". " + t(s.meas.experiment) : "") : "", "calculation method"), "",
        "### 10.3 Experiential & Operational Measures (Tier 3)", "",
        "**XLA (Experience Level Agreement):**", "- Measure: " + ph(s.meas.xla, "XLA"), "",
        "**SLA (Service Level Agreement):**", "- " + ph(s.meas.sla, "SLA"), "",
        "### 10.4 Actionable Inputs & Levers (Tier 4)", "",
        "**Leading Indicators:**", "- Indicator: " + ph(s.meas.leading, "leading indicator"), "",
        "**Value Levers:**", "- Lever: " + ph(s.meas.lever, "lever"), "- Current Setting: " + ph(s.meas.leverSetting, "setting"), "- Adjustment Authority: " + ph(s.meas.leverAuthority, "who can change it"), "",
        "### 10.5 Contextual Factors (Tier 5)", "",
        "**Risk Level:**", "- " + ph(s.meas.risk, "risk category, level and mitigation"), "",
        "**Data Quality Issues:**", "- " + ph(s.meas.dq, "critical dependencies and impact if degraded")].join("\n");
      case 11: return [
        "### 11.1 Shared Responsibility", "", "**KPI:** " + ph(s.q.kpi, "KPI"), "",
        "**Contributors to This KPI:**", bullets(s.meas.contributors, "contributor and contribution"), "",
        "### 11.2 Attribution Methodology", "",
        "**Approach:** " + ph(s.meas.attribution, "Direct Attribution | Proportional Attribution | Experimental (A/B Testing) | Statistical Modeling"), "",
        "**Description:**", ph(s.meas.experiment, "how this persona's contribution is separated")].join("\n");
      case 12:
        var dep = ["Pilot (limited scope)", "Phased Rollout", "Full Deployment", "A/B Testing (alongside existing process)"];
        return [
          "### 12.1 Development and Training", "",
          "**Initial Training:**",
          "- Training Data: no task-specific training; the persona executes the SOP against the data contract in Section 6",
          "- Validation Approach: vanilla-agent dry runs against the SOP (Chapter 9), logged in the vanilla-agent-log format",
          "- Initial Accuracy: " + ph(s.pkg.vanillaLogId ? "see vanilla-agent log " + s.pkg.vanillaLogId : "", "baseline after the first dry run"), "",
          "**Model Details:**", "- Model Type: " + ph(s.team.modelType, "model type"), "- Model Version: " + ph(s.id.version, "version"), "",
          "### 12.2 Deployment", "",
          dep.map(function (d) { return "- [" + (d.indexOf(t(s.team.deployment)) === 0 && t(s.team.deployment) ? "x" : " ") + "] " + d; }).join("\n"), "",
          "**Rollout Plan:** " + ph(s.team.rollout, "rollout stages"), "",
          "### 12.3 Monitoring and Evolution", "",
          "**Performance Monitoring:**", "- Frequency: " + ph(s.q.kpiCadence, "frequency"),
          "- Metrics Tracked: " + ([s.q.kpi, s.meas.sla, s.meas.xla, s.meas.leading].map(t).filter(Boolean).join("; ") || "`[metrics]`"),
          "- Alert Thresholds: " + (lines(s.esc.triggers).join("; ") || "`[thresholds]`"), "",
          "**Drift Detection:**",
          "- Data Drift Monitoring: AI RM statistical drift detection (Chapter 7)",
          "- Concept Drift Monitoring: AI RM behavioural anomaly and business outcome monitoring (Chapter 7)",
          "- Response Protocol: Tier 3 (Systemic Risk) escalation for sustained drift, 15-minute SLA", "",
          "**Retraining Schedule:**", "- " + ph(s.team.retraining, "retraining schedule"), "",
          "### 12.4 Change Management", "",
          "**Change Control Process:**",
          "- Minor Changes (e.g., threshold adjustments): approval required from " + ph(s.id.sopOwner, "SOP owner"),
          "- Major Changes (e.g., new capabilities): approval required from " + ph(s.id.sopOwner, "SOP owner") + " + Business Owner",
          "- Emergency Changes: " + sug(s, "emergency"), "",
          "**Version Control:**", "- Current Version: " + ph(s.id.version, "version"), "- Rollback Capability: " + ph(s.pkg.mcpRollback, "rollback plan"), "",
          "### 12.5 Decommissioning", "",
          "**Decommissioning Triggers:**", "- Business function no longer needed", "- Replaced by superior solution",
          "- Consistently fails to meet performance targets", "- Regulatory changes make approach non-compliant", "",
          "**Decommissioning Process:**", "1. Business Owner approval", "2. Stakeholder notification", "3. Data/log archival",
          "4. System access revocation", "5. Documentation archival", "6. Post-decommission review"].join("\n");
      case 13: return [
        "### 13.1 Applicable Regulations", "", "**Industry Regulations:**", bullets(s.team.regulations, "regulation"), "",
        "**AI-Specific Regulations:**", "- " + ph(s.team.euAiAct, "EU AI Act classification or local AI rules"), "",
        "**Data Privacy:**", "- Data Classification: " + ph(s.team.dataClass, "Public | Internal | Confidential | Restricted"),
        "- Privacy Impact Assessment: " + ph(s.team.pia, "completed? date? link?"), "",
        "### 13.2 Compliance Requirements", "",
        "**Audit Requirements:**", "- Audit Frequency: " + ph(s.team.auditFreq, "frequency"), "",
        "**Documentation Requirements:**", "- Decision Logs, Model Documentation, Change History: " + ph(s.team.retention, "retention"), "",
        "**Right to Explanation and Right to Human Review:**", "- " + ph(s.team.rights, "how explanation and human review are provided"), "",
        "### 13.3 Compliance Monitoring", "",
        "**Compliance Metrics:**", "- % of decisions with complete audit trail: Target 100%", "- % of data access requests within permitted scope: Target 100%", "",
        "**Violations:**", "- Reporting Process: escalation to " + escContact(s, "t3Contact"),
        "- Response Protocol: " + sug(s, "violations")].join("\n");
      case 14: return [
        "### 14.1 Risk Assessment", "",
        table(["Risk Category", "Specific Risk", "Likelihood", "Impact", "Mitigation"], rows(s.team.risks, 5), "risk"), "",
        "### 14.2 Risk Mitigation", "",
        "**Preventive Controls:**", "- Closed capability list (Section 5.1) and prohibited actions (Section 5.2)", "- Data contract limits (Section 6)", "",
        "**Detective Controls:**", "- " + ph(s.meas.telemetry, "telemetry events"), "- Escalation triggers in Section 7.1", "",
        "**Corrective Controls:**", "- Kill switch: " + ph(s.esc.killSwitch, "kill switch"), "- Rollback: " + ph(s.pkg.mcpRollback, "rollback plan"), "",
        "### 14.3 Incident Response", "",
        "**Incident Types:**",
        "- Performance Degradation: " + sug(s, "incPerf"),
        "- Security Breach: " + sug(s, "incSec"),
        "- Boundary Violation: " + sug(s, "incBoundary"),
        "- Ethical Concern: " + sug(s, "incEthics"), "",
        "**Escalation Path:**",
        "1. " + escContact(s, "t1Contact") + " (Tier 1, Routine Variance, 4-hour SLA)",
        "2. " + escContact(s, "t2Contact") + " (Tier 2, Boundary Breach, 1-hour SLA)",
        "3. " + escContact(s, "t3Contact") + " (Tier 3, Systemic Risk, 15-minute SLA)"].join("\n");
      case 15:
        var chk = [
          [acts.length > 0, "Permitted actions are explicitly enumerated"],
          [lines(s.q.prohibited).length > 0, "Prohibited actions are explicitly stated"],
          [srcRows.length > 0 && lines(s.data.prohibitedData).length > 0, "Data access boundaries are clearly defined"],
          [!!t(s.q.authorityType) && !!t(authSentence(s)), "Authority model is unambiguous"],
          [true, "Escalation paths are defined"],
          [!!t(s.esc.overrideRoles) && !!t(s.esc.killSwitch), "Human oversight mechanisms are in place"],
          [!!t(s.meas.telemetry) || lines(s.esc.triggers).length > 0, "Boundary adherence is monitored"]
        ];
        return [
          "### 15.1 Scope Boundary Visualization", "",
          "Scope boundary diagram: render from the canonical model with the service-architecture-renderer skill.", "",
          "**Inside Scope:**",
          "- Systems/data: " + (srcRows.map(function (r) { return r[1] || r[0]; }).join(", ") || "`[systems]`"),
          "- Actions: " + (acts.map(function (r) { return r[0]; }).join("; ") || "`[actions]`"),
          "- Decisions: " + ph(authSentence(s), "decisions"), "",
          "**Outside Scope (Explicit Exclusions):**",
          "- Systems/data: " + (lines(s.data.prohibitedData).join("; ") || "`[excluded data]`"),
          "- Actions: " + (lines(s.q.prohibited).join("; ") || "`[excluded actions]`"),
          "- Decisions: " + (lines(s.q.outOfScope).join("; ") || "`[excluded decisions]`"), "",
          "### 15.2 Scope Clarity Checklist", "",
          chk.map(function (c) { return "- [" + (c[0] ? "x" : " ") + "] " + c[1]; }).join("\n")].join("\n");
      case 16: return [
        "### 16.1 Data Flow Mapping", "",
        "**Upstream Nodes (Data Providers to AI Persona):**", "",
        table(["Node Name", "Node Type", "Data Provided", "Frequency", "Quality SLA"],
          srcRows.map(function (r) { return [r[1] || r[0], "System", r[0], "Per SOP run", t(s.data.dqCompleteness) ? s.data.dqCompleteness + " completeness" : ""]; }), "upstream node"), "",
        "**Downstream Nodes (Data Consumers from AI Persona):**", "",
        table(["Node Name", "Node Type", "Data Consumed", "Frequency", "Usage Purpose"], rows(s.data.downstream, 5), "downstream node"), "",
        "### 16.2 Data Contracts", "",
        "**With Upstream Nodes:**", "- Contract: " + ph(s.data.upContract, "upstream contract"),
        "- Breach Protocol: Tier 1 (Routine Variance) escalation; the SOP pauses affected checks", "",
        "**With Downstream Nodes:**", "- Contract: " + ph(s.data.downContract, "downstream contract"),
        "- Breach Protocol: Tier 1 (Routine Variance) escalation to " + escContact(s, "t1Contact")].join("\n");
      case 17:
        var st = rows(s.sop.steps, 3);
        return [
          "### 17.1 Scenario", "", ph(s.team.scenario, "example scenario"), "",
          "### 17.2 AI Persona Processing", "", "Step-by-step walkthrough:",
          (st.map(function (r, i) { return (i + 1) + ". " + r[0] + (r[2] ? " (" + r[2] + ")" : ""); }).join("\n") || "1. `[step]`"), "",
          "### 17.3 Outcome", "", ph(s.team.outcome17, "what happened and what was learned")].join("\n");
      case 18:
        var hist = [];
        if (signed(s.pkg.signBO)) hist.push([s.id.version || "1.0", s.id.effectiveDate, s.pkg.signBO, "Business Owner", "Initial approval"]);
        if (signed(s.pkg.signAIRM)) hist.push([s.id.version || "1.0", s.id.effectiveDate, s.pkg.signAIRM, "AI Resource Mgmt", "Technical validation"]);
        if (signed(s.pkg.signCO)) hist.push([s.id.version || "1.0", s.id.effectiveDate, s.pkg.signCO, "Compliance Officer", "Compliance review"]);
        return [
          "### 18.1 Approval History", "", table(["Version", "Date", "Approved By", "Role", "Notes"], hist, "no approvals yet"), "",
          "### 18.2 Current Status", "", "**Status:** " + ph(s.id.status, "status"), "",
          "**Approved By:**",
          "- Business Owner: " + ph(s.pkg.signBO, "name, date, signature"),
          "- AI Resource Management: " + ph(s.pkg.signAIRM, "name, date, signature"),
          "- Compliance Officer: " + ph(s.pkg.signCO, "name, date, signature") + (T < 3 ? " (if required)" : ""), "",
          "**Next Review Date:** " + ph(s.id.reviewDate, "date")].join("\n");
      case 19: return [
        "### 19.1 References", "",
        "- SOP: " + ph(s.sop.id, "SOP ID") + " (YAML generated alongside this package)",
        "- Measure Hierarchy: measurement blueprint generated alongside this package",
        bullets(s.team.references, "service architecture diagram, BPMN, model card, DPIA"), "",
        "### 19.2 Related AI Personas", "",
        "**Collaborating AI Personas:**", bullets(lines(s.team.related).concat(s.handoff.enabled && t(s.p2.name) ? [t(s.p2.name) + " (cross-domain handoff, Section 9; register entry " + (t(s.handoff.sopId) || "SOP ID open") + ")"] : []).join("\n"), "collaborating persona"), "",
        "**Predecessor/Successor:**", "- Replaces: " + ph(s.team.replaces, "previous approach"), "",
        "### 19.3 Change Log", "",
        table(["Version", "Date", "Changed By", "Change Description"], [[s.id.version || "1.0", s.id.effectiveDate || "", s.id.sopOwner || "", "Initial creation (Persona Forge draft)"]])].join("\n");
    }
    return "";
  }

  function genPackage(s) {
    var tr = computeTier(s), T = tr.effective;
    var out = ["# AI Persona Definition: " + (t(s.id.name) || "[persona name]"), "",
      (s.example ? "> " + EXAMPLE_LINE + ".\n\n" : "") + "> Built with Persona Forge from the AI Persona Definition Template (19 sections). Assigned tier: **Tier " + T + " -- " + TIER_LABEL[T] + "** (" + TIER_TIME[T] + "). Required sections at this tier: " + TIER_SECTIONS[T].join(", ") + ". Other sections keep their template marker and may be deferred.", "",
      "---", ""];
    SECTIONS.forEach(function (sec) {
      var n = sec[0];
      out.push("## " + n + ". " + sec[1] + " " + sec[2], "");
      out.push(t(s.overrides[n]) ? t(s.overrides[n]) : genSection(n, s, T), "", "---", "");
    });
    out.push("**End of AI Persona Definition**", "", "---", "", "## Tiered Completion Checklist", "",
      "Use the checklist matching the tier assigned to this AI Persona. Each tier includes all items from lower tiers.", "");
    [1, 2, 3].forEach(function (tier) {
      out.push("### Tier " + tier + " Checklist -- " + TIER_LABEL[tier], "");
      if (tier > 1) out.push((tier === 2 ? "All Tier 1 items, plus:" : "All Tier 1 and Tier 2 items, plus:"), "");
      CHECK_ADDS[tier].forEach(function (n) {
        var miss = sectionMissing(s, n, tier);
        var qual = n === 6 && tier === 1 ? " (partial)" : n === 6 && tier === 2 ? " (full)" : n === 18 && tier === 1 ? " (lightweight)" : n === 18 && tier === 3 ? " (full)" : "";
        out.push("- [" + (miss.length ? " " : "x") + "] **Section " + n + qual + ":** " + checklistLine(n, tier) + (miss.length ? " _(open: " + miss.join(", ") + ")_" : ""));
      });
      out.push("");
    });
    return escComments(out.join("\n"));
  }

  /* ---------- cross-domain handoff (cross-domain-sop-register.md; Chapter 8 notes) ---------- */
  var DIR_OUT = "This persona hands off to the second", DIR_IN = "The second persona hands off to this one";
  var OWN_ME = "This persona's domain", OWN_OTHER = "The second persona's domain";
  function domainOf(o) { return t(o.l0) ? (t(o.l1) ? t(o.l0) + " / " + t(o.l1) : t(o.l0)) : ""; }
  function runSummary(s) {
    var dated = MODEL_TIERS.map(function (m) { return [m, s.scoring[m[0]]]; }).filter(function (x) { return verdict(s, x[0][0]) !== "not yet run"; });
    if (!dated.length) return "not yet run";
    var last = dated.map(function (x) { return t(x[1].date); }).filter(Boolean).sort().pop() || "date not recorded";
    var vs = dated.map(function (x) { return verdict(s, x[0][0]); });
    return last + " – " + (vs.indexOf("pass") >= 0 ? "Pass" : vs.indexOf("hold") >= 0 ? "Hold" : "Incomplete record");
  }
  function registerRow(s) {
    var h = s.handoff, me = t(s.id.name) || "[this persona]", other = t(s.p2.name) || "[second persona]";
    var ownerIsMe = h.sopOwner === OWN_ME;
    var ownSop = ownerIsMe && t(h.sopId) && t(h.sopId) === t(s.sop.id);
    return [
      ["SOP ID", t(h.sopId)],
      ["Owning service / domain", ownerIsMe ? domainOf(s.id) : domainOf(s.p2)],
      ["Borrowing service / persona", ownerIsMe ? (domainOf(s.p2) ? domainOf(s.p2) + " / " : "") + other : (domainOf(s.id) ? domainOf(s.id) + " / " : "") + me],
      ["Dependency ID", t(h.depId)],
      ["MCP server", t(h.mcpServer) || (ownSop ? t(s.sop.mcpEndpoint) : "")],
      ["Invocation purpose", t(h.purpose)],
      ["Vanilla-Agent status", ownSop ? runSummary(s) : (t(h.vanilla) || "not yet run")],
      ["Change Advisory Circle date", [t(h.cacDate), t(h.cacAttendees)].filter(Boolean).join(" – ")],
      ["Notes", t(h.notes)]
    ];
  }
  function handoffClause(s) {
    var h = s.handoff, me = t(s.id.name) || "[this persona]", other = t(s.p2.name) || "[second persona]";
    var ownerIsMe = h.sopOwner === OWN_ME;
    var owner = ownerIsMe ? domainOf(s.id) : domainOf(s.p2);
    return ["**Cross-domain handoff (Cross-Domain SOP Register entry " + ph(h.sopId, "SOP ID") + "):**",
      "- Handoff: " + (h.direction === DIR_IN ? other + " hands off to " + me : me + " hands off to " + other) + " when " + ph(h.trigger, "handoff trigger"),
      "- Shared SOP: " + ph(h.sopId, "SOP ID") + (t(h.sopTitle) ? " (" + t(h.sopTitle) + ")" : "") + ", owned by " + ph(owner, "owning domain") + " on " + ph(h.mcpServer, "MCP server") +
        ". Borrower: " + (ownerIsMe ? other : me) + ". Only the owning domain approves changes to this SOP (One Server, One Owner).",
      "- Dependency ID: " + ph(h.depId, "DEP-XXX"),
      "- Invocation purpose: " + ph(h.purpose, "outcome or value exchange"),
      "- Payload fields: " + (lines(h.payload).join(", ") || "`[payload fields]`"),
      "- Collaboration archetype (Chapter 8): " + ph(h.archetype, "Observer | Collaborator | Co-owner"),
      "- Rejected or failed handoff: Tier 1 (Routine Variance) escalation to the SOP owner of the owning domain, 4-hour SLA" + SUGGEST_LABEL].join("\n");
  }
  // The second persona's view of the same handoff: identity swapped, direction and ownership mirrored.
  function mirrorState(s) {
    var b = blankState();
    b.example = s.example; b.exampleId = s.exampleId;
    ["name", "description", "l0", "l1", "ln", "businessOwner", "sopOwner", "airmLiaison"].forEach(function (k) { b.id[k] = s.p2[k]; b.p2[k] = s.id[k]; });
    b.handoff = clone(s.handoff);
    b.handoff.direction = s.handoff.direction === DIR_IN ? DIR_OUT : DIR_IN;
    b.handoff.sopOwner = s.handoff.sopOwner === OWN_ME ? OWN_OTHER : OWN_ME;
    if (b.handoff.sopOwner === OWN_ME) { b.sop.id = s.handoff.sopId; b.sop.title = s.handoff.sopTitle; b.sop.mcpEndpoint = s.handoff.mcpServer; }
    if (s.handoff.sopOwner === OWN_ME && t(s.handoff.sopId) === t(s.sop.id)) b.handoff.vanilla = registerRow(s)[6][1];
    b.tier.crossDomain = handoffCrosses(s);
    return b;
  }
  function genHandoff(s) {
    var head = (s.example ? "> " + EXAMPLE_LINE + ".\n\n" : "");
    if (!s.handoff.enabled) return "# Cross-Domain Handoff\n\n" + head + "No second persona modelled. Turn on the handoff in step 8 to write the register entry and the second package.\n";
    var b = mirrorState(s);
    return escComments(["# Cross-Domain SOP Register: " + ph(s.handoff.sopId, "SOP ID"), "",
      head + "> Register entry for one handoff, per cross-domain-sop-register.md. Update it after dependency workshops (Chapter 8) and whenever an SOP release changes the shared procedure (Chapter 9).", "",
      table(["Field", "Value"], registerRow(s).map(function (r) { return ["**" + r[0] + "**", r[1] || "`[" + r[0].toLowerCase() + "]`"]; })), "",
      "## Handoff clause, as written into both packages", "", handoffClause(s), "",
      "---", "",
      "> Stub package for the second persona. Only identity and the handoff clause come from this draft; every other section keeps its placeholder until the second persona gets its own Persona Forge draft (the zip carries a starter state file for it).", "",
      genPackage(b)].join("\n"));
  }

  /* ---------- SOP object and YAML ---------- */
  function vanillaSummary(s) {
    var scored = MODEL_TIERS.map(function (m) { return [m[1], verdict(s, m[0])]; }).filter(function (x) { return x[1] !== "not yet run"; });
    var pass = scored.filter(function (x) { return x[1] === "pass"; });
    var lastDate = MODEL_TIERS.map(function (m) { return verdict(s, m[0]) !== "not yet run" ? t(s.scoring[m[0]].date) : ""; }).filter(Boolean).sort().pop();
    return {
      last_run: lastDate || (scored.length ? "date not recorded" : "not yet run"),
      result: scored.length ? (pass.length ? "pass" : scored.some(function (x) { return x[1] === "hold"; }) ? "hold" : "incomplete record") : "not yet run",
      issues_noted: scored.length ? scored.map(function (x) { return x[0] + ": " + x[1]; }).join("; ") : "none recorded",
      remediation_owner: t(s.id.sopOwner) || ""
    };
  }
  function sopObject(s) {
    return {
      sop: {
        title: t(s.sop.title),
        metadata: {
          sop_id: t(s.sop.id), version: t(s.sop.version), persona_alignment: t(s.id.name),
          domain_owner: t(s.id.ln) || t(s.id.l1) || t(s.id.l0), accountable_role: t(s.id.sopOwner),
          mcp_server_endpoint: t(s.sop.mcpEndpoint), environment: t(s.sop.environment)
        },
        purpose_delegated_outcome: t(s.q.outcome),
        trigger: t(s.sop.trigger),
        inputs: rows(s.sop.inputs, 4).map(function (r) { return { input_name: r[0], system_of_record: r[1], format: r[2], notes: r[3] }; }),
        procedure: rows(s.sop.steps, 3).map(function (r, i) { return { step: i + 1, action: r[0], evidence_required: r[1], owner: r[2] }; }),
        control_points: lines(s.sop.controlPoints),
        vanilla_agent_test_summary: vanillaSummary(s),
        compliance_notes: t(s.sop.compliance),
        mcp_payload_contract: {
          request_fields: lines(s.sop.payloadRequest),
          response_fields: lines(s.sop.payloadResponse),
          traceability: t(s.sop.traceability)
        }
      }
    };
  }
  function yScalar(v) {
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (v == null) return "null";
    return JSON.stringify(String(v)); // a JSON string is a valid YAML double-quoted scalar
  }
  function toYAML(v, ind) {
    ind = ind || 0;
    var pad = new Array(ind + 1).join(" "), out = [];
    if (Array.isArray(v)) {
      v.forEach(function (item) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          var sub = toYAML(item, ind + 2).split("\n");
          out.push(pad + "- " + sub[0].slice(ind + 2));
          for (var i = 1; i < sub.length; i++) out.push(sub[i]);
        } else out.push(pad + "- " + yScalar(item));
      });
      return out.join("\n");
    }
    Object.keys(v).forEach(function (k) {
      var val = v[k];
      if (Array.isArray(val)) { if (!val.length) out.push(pad + k + ": []"); else { out.push(pad + k + ":"); out.push(toYAML(val, ind + 2)); } }
      else if (val && typeof val === "object") { if (!Object.keys(val).length) out.push(pad + k + ": {}"); else { out.push(pad + k + ":"); out.push(toYAML(val, ind + 2)); } }
      else out.push(pad + k + ": " + yScalar(val));
    });
    return out.join("\n");
  }
  function genSOP(s) {
    return (s.example ? "# " + EXAMPLE_LINE + ".\n" : "") + "# SOP skeleton. Field names follow templates/sop-schema.md section by section.\n" +
      "# Register on exactly one MCP server owned by the named domain (One Server, One Owner, Chapter 9).\n" +
      toYAML(sopObject(s)) + "\n";
  }
  /* A small YAML reader for the subset the emitter writes: block maps, block lists, double-quoted strings,
     numbers, booleans, null, [] and {}. Anything else throws, so the check is strict. */
  function parseYAML(text) {
    var toks = text.split(/\r?\n/).map(function (raw, i) {
      if (/^\s*(#|$)/.test(raw)) return null;
      if (/\t/.test(raw.match(/^\s*/)[0])) throw new Error("tab indentation on line " + (i + 1));
      return { ind: raw.match(/^ */)[0].length, text: raw.trim(), line: i + 1 };
    }).filter(Boolean);
    var pos = 0;
    function scalar(str, line) {
      if (str[0] === '"') { try { return JSON.parse(str); } catch (e) { throw new Error("bad quoted string on line " + line); } }
      if (str === "[]") return []; if (str === "{}") return {};
      if (str === "true") return true; if (str === "false") return false; if (str === "null") return null;
      if (/^-?\d+(\.\d+)?$/.test(str)) return Number(str);
      throw new Error("unquoted scalar on line " + line + ": " + str);
    }
    function block(ind) {
      var first = toks[pos];
      if (!first || first.ind !== ind) throw new Error("indentation error near line " + (first ? first.line : "end"));
      return first.text.indexOf("- ") === 0 || first.text === "-" ? list(ind) : map(ind);
    }
    function map(ind) {
      var obj = {};
      while (pos < toks.length && toks[pos].ind === ind && toks[pos].text.indexOf("- ") !== 0) {
        var tk = toks[pos], m = tk.text.match(/^([A-Za-z_][A-Za-z0-9_]*):(?: (.*))?$/);
        if (!m) throw new Error("expected key on line " + tk.line);
        if (Object.prototype.hasOwnProperty.call(obj, m[1])) throw new Error("duplicate key " + m[1] + " on line " + tk.line);
        pos++;
        if (m[2] !== undefined && m[2] !== "") obj[m[1]] = scalar(m[2], tk.line);
        else if (pos < toks.length && toks[pos].ind > ind) obj[m[1]] = block(toks[pos].ind);
        else obj[m[1]] = null;
      }
      if (pos < toks.length && toks[pos].ind > ind) throw new Error("unexpected indent on line " + toks[pos].line);
      return obj;
    }
    function list(ind) {
      var arr = [];
      while (pos < toks.length && toks[pos].ind === ind && toks[pos].text.indexOf("- ") === 0) {
        var tk = toks[pos], rest = tk.text.slice(2);
        if (/^[A-Za-z_][A-Za-z0-9_]*:( |$)/.test(rest)) { toks[pos] = { ind: ind + 2, text: rest, line: tk.line }; arr.push(map(ind + 2)); }
        else { pos++; arr.push(scalar(rest, tk.line)); }
      }
      return arr;
    }
    if (!toks.length) return null;
    var result = block(toks[0].ind);
    if (pos !== toks.length) throw new Error("trailing content on line " + toks[pos].line);
    return result;
  }
  function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function yamlCheck(s) {
    try { var obj = sopObject(s); var back = parseYAML(genSOP(s)); return { ok: deepEqual(obj, back), error: deepEqual(obj, back) ? "" : "round trip differs" }; }
    catch (e) { return { ok: false, error: e.message }; }
  }

  /* ---------- measurement blueprint ---------- */
  function genBlueprint(s) {
    var acc = t(s.id.businessOwner) || "[Accountable owner]";
    var lineage = [
      ["T1 Objective", "OBJECTIVE: " + ph(s.q.objective, "objective") + "; FINANCIAL_METRIC: " + ph(s.meas.financial, "financial metric"), "Strategic direction inherited from the business; the persona never carries sole accountability for the financial metric", "Qualitative", "Strategy and finance reporting", acc, "Quarterly (Portfolio Council)"],
      ["T2 KR / KPI", "KPI_OUTCOME: " + ph(s.q.kpi, "primary KPI") + "; KEY_RESULT: " + ph(s.meas.keyResult, "key result") + "; VALUE_CONTRIBUTION: " + ph(s.meas.valueContribution, "value contribution") + "; COST_IMPACT: " + ph(s.meas.costImpact, "cost impact"), "The KPI is the primary direct measure (Section 3)", ph(s.q.kpiTarget, "target"), (rows(s.data.sources, 4)[0] || [])[1] || "", acc, ph(s.q.kpiCadence, "cadence") + " (KPI Council monthly)"],
      ["T3 XLA / SLA", "SLA: " + ph(s.meas.sla, "SLA") + "; XLA: " + ph(s.meas.xla, "XLA"), "", "Stated in the measure", "Persona telemetry; approver survey", t(s.id.airmLiaison) || "", "Bi-weekly (service review)"],
      ["T4 Leading Indicator / Value Lever", "LEADING_INDICATOR: " + ph(s.meas.leading, "leading indicator") + "; VALUE_LEVER: " + ph(s.meas.lever, "lever"), "", t(s.meas.leverSetting) || "", "Persona telemetry", t(s.meas.leverAuthority) || t(s.id.sopOwner) || "", "Weekly (operations stand-up)"],
      ["T5 Context Metric", "RISK_LEVEL: " + ph(s.meas.risk, "risk") + "; DATA_QUALITY_ISSUE_IMPACT: " + ph(s.meas.dq, "data quality"), "", "Stated in the measure", "AI RM monitoring", t(s.id.airmLiaison) || "", "Daily (risk sync)"]
    ];
    var tests = [["Authority", s.q.testAuthority], ["Horizon", s.q.testHorizon], ["Causality", s.q.testCausality]];
    var allDirect = tests.every(function (x) { return x[1]; });
    return escComments([
      "# Measurement Blueprint: " + (t(s.id.name) || "[persona name]"), "",
      (s.example ? "> " + EXAMPLE_LINE + ".\n\n" : "") + "> Built with Persona Forge from the Measurement Blueprint Template. Measure types follow the 12 types of the 5-tier framework (Chapter 11).", "",
      "## 1. Mandate Recap",
      "- **Service / Persona Name:** " + ph(s.id.name, "name"),
      "- **Intent Statement (Tier 1 Objective reference):** " + ph(s.q.outcome, "intent") + " (Objective: " + ph(s.q.objective, "objective") + ")",
      "- **Decision Rights & Boundaries:** " + ph(authSentence(s), "decision rights") + (lines(s.q.prohibited).length ? " Never: " + lines(s.q.prohibited).join("; ") + "." : ""),
      "- **Authoritative Owner (RACI \"Accountable\"):** " + acc, "",
      "## 2. Tier Lineage Snapshot",
      table(["Tier", "Measure Name", "Definition & Formula", "Target / Range", "Data Source", "Owner", "Review Cadence"], lineage), "",
      "## 3. Primary Direct Measure Detail",
      "- **Metric Type (KPI, XLA, SLA, Leading Indicator):** KPI (KPI_OUTCOME)",
      "- **Units & Formula:** " + ph(s.q.kpi, "units and formula"),
      "- **Latency & Sampling Interval:** " + ph(s.q.kpiCadence, "interval"),
      "- **Telemetry Schema / Event Names:** " + ph(s.meas.telemetry, "event names"),
      "- **Control Authority (people, AI, automation levers):** " + ph(t(s.meas.lever) ? s.meas.lever + " (" + (t(s.meas.leverAuthority) || "owner not set") + ")" : "", "control authority"),
      "- **Dashboards / Alert Channels:** " + ph(s.meas.dashboards, "dashboards"),
      "- **Definition of Done (what success looks like during review):** " + ph(s.q.kpiTarget ? s.q.kpi + " at " + s.q.kpiTarget : "", "definition of done"),
      "- **Direct measure tests (Chapter 11):** " + tests.map(function (x) { return x[0] + " " + (x[1] ? "pass" : "open"); }).join("; ") + (allDirect ? ". The KPI qualifies as direct." : ". Until all three pass, treat the KPI as indirect and attribute it (Section 7)."), "",
      "## 4. Supporting Measures & Adoption",
      table(["Measure", "Tier", "Purpose", "Thresholds / Escalation", "Instrumentation Owner"], [
        [ph(s.meas.sla, "SLA"), "T3 SLA", "Operational contract", "Breach escalates to the bi-weekly service review", t(s.id.airmLiaison)],
        [ph(s.meas.xla, "XLA"), "T3 XLA", "Human experience of the persona's output", "Breach escalates to the bi-weekly service review", t(s.id.businessOwner)],
        [ph(s.meas.leading, "leading indicator"), "T4 Leading Indicator", "Early steering signal", "Trend reviewed at the weekly operations stand-up", t(s.id.sopOwner)]
      ]), "",
      "- **Adoption Scorecard Inputs:** usage %, approver satisfaction (XLA), override rate from the decision log.",
      "- **Relationship Metrics:** " + (rows(s.team.who, 4).map(function (r) { return r[0]; }).join(", ") || "`[counterparty]`") + "; health signal is the XLA; remediation forum is the bi-weekly service review.", "",
      "## 5. Volume, Capacity, and Load Shedding",
      table(["Metric", "Definition", "Target Band", "Automation / Scaling Trigger", "Runbook Link"], [[ph(s.meas.volume, "volume metric"), "Count per period", ph(s.meas.volumeBand, "band"), ph(s.meas.volumeTrigger, "trigger"), ph(s.pkg.mcpRollback ? "MCP deployment runbook" : "", "runbook")]]), "",
      "## 6. Context, Risk, and Safeguards",
      table(["Risk / DQ Issue", "Acceptable Range", "Detection Method", "Owner", "Automated Guardrail", "Kill-Switch / Fallback"], [
        [ph(s.meas.risk, "risk"), "Stated in the measure", "Escalation triggers (persona Section 7.1)", t(s.id.airmLiaison), "Route to human review", ph(s.esc.killSwitch, "kill switch")],
        [ph(s.meas.dq, "data quality issue"), ph(s.data.dqCompleteness, "range"), "Data quality checks at SOP input", t(s.id.sopOwner), "Pause affected checks", ph(s.esc.killSwitch, "kill switch")]
      ]), "",
      "## 7. Attribution & Experiments",
      "- **Contributors & Weights:** " + (lines(s.meas.contributors).join("; ") || "`[contributors]`"),
      "- **Experiment Design:** " + ph(t(s.meas.attribution) ? s.meas.attribution + ". " + t(s.meas.experiment) : "", "A/B, multivariate or counterfactual"),
      "- **Data Readiness:** " + ph(s.meas.dataReadiness, "sample size, confidence, gaps"), "",
      "## 8. Governance & Escalation",
      table(["Forum / Ritual", "Participants", "Cadence", "Decisions Made", "Inputs (reports, dashboards)"], [
        ["Risk sync", "AI RM steward, SOP Owner", "Daily", "Tier 5 issues", "Risk and data quality metrics"],
        ["Operations stand-up", "SOP Owner, operators", "Weekly", "Tier 4 trends, lever settings", "Leading indicators"],
        ["Service review", "Service Owner, AI RM", "Bi-weekly", "Tier 3 SLA/XLA breaches", "SLA and XLA reports"],
        ["KPI Council", "Service Owner, contributors", "Monthly", "Tier 2 variance above 5 points", "KPI and attribution"],
        ["Portfolio Council", "Executive sponsor", "Quarterly", "Tier 1 objective drift above 10%", "Objective tracking"]
      ]), "",
      "- **Escalation Workflow:** Detect, Diagnose, Decide, Document (Chapter 11). Single-tier problems stay with the Ops Lead; cross-tier issues go to the KPI Council within 24 hours; critical risks invoke the kill switch with executive sponsor notification (" + escContact(s, "t3Contact") + ").",
      "- **Sunset / Evolution Criteria:** " + ph(s.meas.sunset, "when the measure or persona is retired or re-scoped")
    ].join("\n") + "\n");
  }

  /* ---------- delegation package checklist ---------- */
  // A run counts as recorded once it has a date, a trace, notes, follow-ups, evidence or any ticked criterion.
  function runRecorded(r) {
    return !!r && (CRITERIA.some(function (c) { return r[c[0]] === true; }) || ["date", "trace", "notes", "followUp", "decisionOwner", "evidence"].some(function (k) { return !!t(r[k]); }));
  }
  // Pass needs all six criteria plus a date, a trace reference and at least one evidence line.
  function runGaps(r) { return [["date", "date"], ["trace", "trace"], ["evidence", "evidence"]].filter(function (g) { return !lines(r[g[0]]).length; }).map(function (g) { return g[1]; }); }
  function verdict(s, k) {
    var r = s.scoring[k];
    if (!runRecorded(r)) return "not yet run";
    if (!CRITERIA.every(function (c) { return r[c[0]] === true; })) return "hold";
    return runGaps(r).length ? "incomplete record" : "pass";
  }
  function checklistItems(s) {
    var T = computeTier(s).effective;
    var missingSecs = TIER_SECTIONS[T].filter(function (n) { return sectionMissing(s, n, T).length; });
    var yc = yamlCheck(s);
    var sopReady = t(s.sop.id) && t(s.sop.trigger) && rows(s.sop.steps, 3).length && yc.ok;
    var passed = MODEL_TIERS.filter(function (m) { return verdict(s, m[0]) === "pass"; }).map(function (m) { return m[1]; });
    var cross = computeTier(s).cross;
    var hoRow = s.handoff.enabled && t(s.handoff.sopId) && t(s.handoff.depId) ? s.handoff.sopId + " / " + s.handoff.depId + " (handoff register entry)" : "";
    var approved = ["Approved", "In Production"].indexOf(t(s.id.status)) >= 0;
    function item(name, desc, owner, state, evidence) { return { name: name, desc: desc, owner: owner, state: state, evidence: evidence }; }
    return [
      item("Persona template", "Final template with approvals and telemetry fields.", "Service owner",
        !missingSecs.length && t(s.meas.telemetry) && approved ? "done" : "open",
        missingSecs.length ? "Open sections: " + missingSecs.join(", ") : !t(s.meas.telemetry) ? "Telemetry events not named" :
          !approved ? "Sections complete; status is " + (t(s.id.status) || "unset") + ", approvals outstanding" : "Tier " + T + " sections complete and " + t(s.id.status).toLowerCase() + "; telemetry: " + t(s.meas.telemetry)),
      item("SOP summary + YAML", "Table + YAML snippet stored per Appendix G.", "SOP owner",
        sopReady ? "done" : "open", sopReady ? (t(s.sop.id) + " (YAML parses)") : (!yc.ok ? "YAML check failed: " + yc.error : "Needs SOP ID, trigger and at least one procedure step")),
      item("Cross-domain register row", "Borrowers + dependency IDs logged.", "AI RM steward",
        !cross ? "n/a" : (t(s.pkg.registerRow) || hoRow ? "done" : "open"), !cross ? "Single-domain persona" : ([t(s.pkg.registerRow), hoRow].filter(Boolean).join("; ") || "Cross-domain flow flagged; register entry missing")),
      item("Vanilla-Agent log", "Latest dry run recorded with pass/fail + issues.", "AI RM lab lead",
        passed.length && t(s.pkg.vanillaLogId) ? "done" : "open",
        passed.length ? (t(s.pkg.vanillaLogId) ? s.pkg.vanillaLogId + " (pass: " + passed.join(", ") + ")" : "Passing run scored; log ID missing") : "No passing dry run scored yet"),
      item("MCP deployment plan", "Endpoint, version, rollback plan documented.", "Platform ops",
        t(s.sop.mcpEndpoint) && t(s.sop.version) && t(s.pkg.mcpRollback) ? "done" : "open",
        [t(s.sop.mcpEndpoint) ? "" : "endpoint", t(s.sop.version) ? "" : "version", t(s.pkg.mcpRollback) ? "" : "rollback plan"].filter(Boolean).join(", ").replace(/^(.+)$/, "Missing: $1") || (t(s.sop.mcpEndpoint) + " v" + t(s.sop.version))),
      item("Readiness scorecard", "All checkpoints green; Change Advisory Circle minutes attached.", "Facilitator",
        t(s.pkg.scorecard) ? "done" : "open", t(s.pkg.scorecard) || "Scorecard reference missing"),
      item("Backlog linkage", "Work item IDs for persona, SOP, and integration tasks.", "Delivery manager",
        t(s.pkg.backlog) ? "done" : "open", t(s.pkg.backlog) || "Work item IDs missing"),
      item("Funding confirmation", "Opex/capex approvals for persona + SOP operations.", "Finance partner",
        t(s.pkg.funding) ? "done" : "open", t(s.pkg.funding) || "Approval reference missing")
    ];
  }
  function genChecklist(s) {
    var items = checklistItems(s);
    var mark = { done: "[x] Done", open: "[ ] Open", "n/a": "N/A" };
    var done = items.filter(function (i) { return i.state !== "open"; }).length;
    return escComments(["# Delegation Package Checklist: " + (t(s.id.name) || "[persona name]"), "",
      (s.example ? "> " + EXAMPLE_LINE + ".\n\n" : "") + "> Cover sheet for the delegation package folder (Chapters 6, 8 and 9). " + done + " of " + items.length + " items closed or not applicable.", "",
      table(["Item", "Description", "Owner", "Status", "Evidence"], items.map(function (i) { return [i.name, i.desc, i.owner, mark[i.state], i.evidence]; }))
    ].join("\n") + "\n");
  }

  /* ---------- vanilla-agent dry-run pack ---------- */
  // The completed log for one run, in the vanilla-agent-log.md format, filled from the run record and the ticked criteria.
  function genLog(s, k) {
    var r = s.scoring[k], v = verdict(s, k), tierName = (MODEL_TIERS.filter(function (m) { return m[0] === k; })[0] || [k, k])[1];
    var steps = rows(s.sop.steps, 3), cps = lines(s.sop.controlPoints);
    var trace = rows(r.trace, 4);
    if (!trace.length) trace = (steps.length ? steps : [[""]]).map(function (_, i) { return [String(i + 1), "", "", ""]; });
    var unmet = CRITERIA.filter(function (c) { return r[c[0]] !== true; });
    var outcome = v === "pass" ? "pass" : v === "hold" ? "hold (criteria not met: " + unmet.map(function (c) { return c[0].toUpperCase(); }).join(", ") + ")" : v === "incomplete record" ? "incomplete record (all six criteria ticked; missing " + runGaps(r).join(", ") + ")" : "not yet run";
    return escComments(["# Vanilla-Agent Test Log – " + (t(s.sop.id) || "[SOP ID]"), "",
      (s.example ? "> " + EXAMPLE_LINE + ".\n\n" : ""),
      "## Scenario Overview",
      "- **Date:** " + t(r.date), "- **Facilitator:** " + t(r.facilitator), "- **Persona:** " + t(s.id.name), "- **SOP Version:** " + t(s.sop.version),
      "- **Trigger Condition:** " + (t(r.trigger) || t(s.sop.trigger)), "",
      "## Expected Behavior",
      "Run on a " + tierName.toLowerCase() + "-tier model with the " + k + " prompt from the dry-run pack. The agent completes " +
        (steps.length ? "SOP steps 1 to " + steps.length + " in order: " + steps.map(function (st, i) { return (i + 1) + ". " + st[0]; }).join("; ") : "the SOP steps (none written yet)") +
        (cps.length ? ". Control points it must apply: " + cps.join("; ") : "") +
        ". KPI it must protect: " + (t(s.q.kpi) ? t(s.q.kpi) + (t(s.q.kpiTarget) ? " (target " + t(s.q.kpiTarget) + ")" : "") : "not set") + ".", "",
      "## Actual Behavior & MCP Trace",
      "| Step | MCP Interaction ID | Observations | Issues |", "| --- | --- | --- | --- |",
      trace.map(function (row) { return "| " + row.map(function (c) { return cell(c) || " "; }).join(" | ") + " |"; }).join("\n"), "",
      "## Result",
      "- **Outcome:** " + outcome,
      CRITERIA.map(function (c) { return "  - [" + (r[c[0]] === true ? "x" : " ") + "] " + c[0].toUpperCase() + ". " + c[1]; }).join("\n"),
      "- **Decision Owner:** " + t(r.decisionOwner), "- **Follow-up Actions:** " + t(r.followUp), "- **Next Test Date:** " + t(r.nextDate), "",
      "> Rule (Chapter 9 notes): " + CH9_RULE + " " + CH9_FAIL, "",
      "## Evidence Attachments",
      lines(r.evidence).map(function (x) { return "- " + x; }).join("\n")].join("\n").replace(/\n{3,}/g, "\n\n") + "\n");
  }
  function logSkeleton(s) {
    return ["# Vanilla-Agent Test Log – " + (t(s.sop.id) || "[SOP ID]"), "",
      "## Scenario Overview", "- **Date:** ", "- **Facilitator:** ", "- **Persona:** " + (t(s.id.name) || ""), "- **SOP Version:** " + (t(s.sop.version) || ""), "- **Trigger Condition:** ", "",
      "## Expected Behavior", "", "## Actual Behavior & MCP Trace", "| Step | MCP Interaction ID | Observations | Issues |", "| --- | --- | --- | --- |", "| 1 |  |  |  |", "",
      "## Result", "- **Outcome:** (pass / hold)", "- **Decision Owner:** ", "- **Follow-up Actions:** ", "- **Next Test Date:** ", "",
      "## Evidence Attachments"].join("\n");
  }
  function genPrompt(s, tier) {
    var sop = genSOP(s);
    var caseA = t(s.team.caseA) || "[Case A: a happy-path case. Fill it in on step 7 before running.]";
    var caseB = t(s.team.caseB) || "[Case B: an edge case. Fill it in on step 7 before running.]";
    var common = [
      "You are a generic agent. You know nothing about this organisation beyond the standard operating procedure (SOP) below.",
      "Execute the SOP against each case. Use only the SOP text and the case text. Do not use outside knowledge. Do not invent systems, thresholds or steps.",
      "There is no live MCP server. Where the SOP calls a system, write the call you would make and use only the facts given in the case as its result. Number MCP interaction IDs SIM-A1, SIM-A2 for Case A and SIM-B1, SIM-B2 for Case B.",
      "If a step cannot be executed from the SOP and the case alone, write CLARIFICATION NEEDED in the Issues column with what is missing, then stop that case."
    ];
    var body;
    if (tier === "frontier") {
      body = common.concat(["Write one log per case in the format shown under LOG FORMAT. Fill Expected Behavior from the SOP before you execute. Set Outcome to pass only if every step ran without a clarification, an invented step or a guardrail breach; otherwise hold."]);
    } else if (tier === "mid") {
      body = common.concat(["Rules:",
        "1. Read the whole SOP first.",
        "2. For each case, write Expected Behavior as the list of SOP steps you must complete.",
        "3. Then execute the steps in order. One table row per step. Do not merge or skip steps.",
        "4. Apply every control point listed in the SOP. If a control point says to escalate, record the escalation as the step's observation.",
        "5. Outcome is pass only when every step ran with no clarification, no invented step and no guardrail breach. Otherwise write hold.",
        "Write one log per case, using LOG FORMAT exactly."]);
    } else {
      body = common.concat(["Follow these steps exactly.",
        "Step 1. Copy LOG FORMAT once for Case A and once for Case B.",
        "Step 2. In Expected Behavior, list each procedure step from the SOP by its number.",
        "Step 3. In the table, write one row for each procedure step, in order. Step column: the step number. MCP Interaction ID: SIM-A1, SIM-A2 and so on. Observations: what you did and what the case says. Issues: write none, or the problem.",
        "Step 4. Check each control point in the SOP. If the case triggers one, write that in the row.",
        "Step 5. Outcome: write pass if no row has an issue. Write hold if any row has an issue.",
        "Do not add steps. Do not use facts that are not in the SOP or the case."]);
    }
    return [(s.example ? EXAMPLE_LINE + ".\n\n" : "") + body.join("\n"), "", "=== SOP (YAML) ===", sop.trim(), "", "=== CASE A (happy path) ===", caseA, "", "=== CASE B (edge case) ===", caseB, "", "=== LOG FORMAT ===", logSkeleton(s)].join("\n");
  }
  function genScoringMd(s) {
    var head = ["Criterion"].concat(MODEL_TIERS.map(function (m) { return m[1]; }));
    var body = [["Run date"].concat(MODEL_TIERS.map(function (m) { return t(s.scoring[m[0]].date); })),
      ["Facilitator"].concat(MODEL_TIERS.map(function (m) { return t(s.scoring[m[0]].facilitator); }))];
    body = body.concat(CRITERIA.map(function (c) { return [c[0].toUpperCase() + ". " + c[1]].concat(MODEL_TIERS.map(function (m) { return s.scoring[m[0]][c[0]] === true ? "[x]" : "[ ]"; })); }));
    body.push(["Result (pass only when all six hold)"].concat(MODEL_TIERS.map(function (m) { return verdict(s, m[0]); })));
    body.push(["Notes"].concat(MODEL_TIERS.map(function (m) { return t(s.scoring[m[0]].notes); })));
    return ["## Scoring sheet", "", "- **SOP:** " + (t(s.sop.id) || "") + " v" + (t(s.sop.version) || ""), "",
      table(head, body), "",
      "> Rule (Chapter 9 notes): " + CH9_RULE + " " + CH9_FAIL, "",
      "A hold points at implicit knowledge in the SOP. Common causes (Chapter 9): ambiguous triggers, missing system references, implicit business logic, circular escalation paths. Fix the SOP and run again."].join("\n");
  }
  function genDryRunMd(s) {
    var out = ["# Vanilla-Agent Dry-Run Pack: " + (t(s.sop.id) || "[SOP ID]"), "",
      (s.example ? "> " + EXAMPLE_LINE + ".\n\n" : "") + "> Run these prompts on your own models; Persona Forge calls none. Paste each into a model of the matching tier and tick the sheet below against the log it returns.", ""];
    MODEL_TIERS.forEach(function (m) { out.push("## Prompt: " + m[0], "", "````text", genPrompt(s, m[0]), "````", ""); });
    out.push(genScoringMd(s), "", "## Vanilla-agent logs, one per run", "");
    MODEL_TIERS.forEach(function (m) { out.push(genLog(s, m[0]).replace(/^> Worked example.*\n\n/m, "").replace(/^(#+) /gm, "##$1 "), ""); });
    return escComments(out.join("\n") + "\n");
  }

  /* ---------- the stepper ---------- */
  // field spec: [path, label, type, hint, options]
  function F(path, label, type, hint, opts, placeholder) { return { path: path, label: label, type: type || "text", hint: hint || "", opts: opts || null, placeholder: placeholder || "" }; }
  var STEPS = [
    { title: "Three Questions", intro: "The methodology's Three Questions of delegation, in its own wording. Every later section starts from these answers.",
      note: "Each question carries the toolkit's short form as a subtitle. Question 1 (outcome) fills 3.1 and Section 4. Question 2 (authority and measurement) fills 3.2, Section 8 and Section 10. Question 3 fills 3.3. Source: " + SRC.template + ", " + SRC.ch6 + ", TOOLKIT-REFERENCE.",
      groups: [
        ["Name the persona", [F("id.name", "AI Persona Name", "text", "Business function language, not technical jargon."),
          F("id.description", "Description", "textarea", "Primary function, key activities, value delivered."),
          F("id.l0", "Level 0 service", "text"), F("id.l1", "Level 1 service"), F("id.ln", "Level N (this persona's position)")]],
        ["Question 1: What Do You Want to Delegate to AI?", "Short form: outcome", [
          F("q.delegation", "Delegation Statement", "textarea", "Outcomes, not tools."),
          F("q.intentName", "Intent Name"), F("q.outcome", "Mandate Statement", "textarea", "The business goal the persona is delegated to achieve."),
          F("q.objective", "Business Objective Alignment", "text", "Becomes the Tier 1 OBJECTIVE in the blueprint."),
          F("q.successCriteria", "Success Criteria", "text"),
          F("q.inScope", "In Scope (What IS delegated)", "textarea", "One activity per line."),
          F("q.outOfScope", "Out of Scope (What is NOT delegated)", "textarea", "One exclusion per line."),
          F("q.rationale", "Rationale for Delegation", "textarea"),
          F("q.secondary", "Secondary Intents", "code", "One per line: name | mandate | priority | success measure")]],
        ["Question 2: How Will You Manage That AI?", "Short form: authority", [
          F("id.businessOwner", "Business Owner (Service Owner)"), F("id.businessOwnerContact", "Business Owner contact"), F("id.ownerGoal", "Owner priority or goal"),
          F("id.sopOwner", "SOP Owner"), F("id.airmLiaison", "AI RM liaison"), F("id.airmContact", "AI RM contact"),
          F("q.authorityType", "Authority Type", "seg", "Owner: standing authority. Invoker: temporary authority for one task.", ["Owner Authority", "Invoker Authority"]),
          F("q.authorityWhy", "Justification", "textarea"),
          F("q.delegatedBy", "Authority delegated by"), F("q.invokers", "Who can invoke (Invoker Authority only)"),
          F("q.reviewCycle", "Authority review cycle"),
          F("q.actions", "Permitted Actions", "code", "One per line: action | inputs required | outputs produced | approval required (Yes/No). If it is not listed, it is not permitted."),
          F("q.prohibited", "Prohibited Actions", "textarea", "One per line."),
          F("q.tools", "Tools and Systems Access", "code", "One per line: system | access level | permitted operations | restrictions"),
          F("q.finLimit", "Financial authority per autonomous decision (USD)", "number", "Tier qualifier: above $50K per decision triggers Tier 3. Source: " + SRC.tierGuide + "."),
          F("q.legal", "Legal accountability")]],
        ["Question 2, continued: Performance Measures and Review Cadence", "Short form: measurement", [
          F("q.kpi", "Primary KPI (KPI_OUTCOME)", "text", "The measure the persona can move inside its own authority."),
          F("q.kpiTarget", "KPI target"), F("q.kpiCadence", "Measurement cadence"),
          F("q.monitoring", "Management approach", "textarea", "Oversight cadence and who reads the telemetry."),
          F("q.testAuthority", "Authority test: the persona can change this measure within its delegated scope", "check"),
          F("q.testHorizon", "Horizon test: the measure responds in the same time frame as the persona's decisions", "check"),
          F("q.testCausality", "Causality test: we can describe the causal mechanism", "check"),
          F("q.cadPerf", "Performance Review cadence", "text", "Template placeholder: e.g., Weekly"),
          F("q.cadBoundary", "Boundary Audit cadence", "text", "Template placeholder: e.g., Monthly"),
          F("q.cadStrategic", "Strategic Alignment cadence", "text", "Template placeholder: e.g., Quarterly"),
          F("q.cadGov", "Full Governance Review cadence", "text", "Template placeholder: e.g., Annually")]],
        ["Question 3: How Will You Include It in Your Team?", "Short form: team", [
          F("team.integration", "Integration Model", "seg", "Assistant supports and needs supervision; Collaborator works peer to peer; Specialist holds a narrow expert responsibility.", ["Assistant", "Collaborator", "Specialist"]),
          F("team.integrationWhy", "Why this model"),
          F("team.who", "Who interacts", "code", "One per line: actor role | interaction type | frequency | purpose"),
          F("team.training", "Training Required"), F("team.channels", "Communication Channels"), F("team.culture", "Cultural Considerations", "textarea")]]
      ] },
    { title: "Tier", intro: "Score the four risk dimensions. The single highest factor sets the minimum tier.", custom: "tier" },
    { title: "Authority style", intro: "Pick how Section 8.2 states the delegation scope, then edit the sentence.", custom: "style" },
    { title: "Escalation", intro: "Three escalation tiers with fixed SLAs. Name who picks up each one.", custom: "esc" },
    { title: "Data contract", intro: "What the persona may read and write, and what it may never touch.",
      groups: [
        ["6.1 Permitted Data Sources", [F("data.sources", "Data sources", "code", "One per line: data source | system name | access type | justification")]],
        ["6.2 Permitted Data Types and Fields", [F("data.fields", "Fields", "textarea", "One field per line. Required from Tier 2.")]],
        ["6.3 Data Restrictions and Constraints", [
          F("data.timeWindow", "Time Window"), F("data.volume", "Volume Constraints"), F("data.geoRestr", "Geographic Restrictions"), F("data.anonymization", "Anonymization Requirements"),
          F("data.prohibitedData", "Prohibited Data", "textarea", "One per line."),
          F("data.dqCompleteness", "Minimum data completeness"), F("data.dqAge", "Maximum data age"), F("data.dqValidation", "Data validation")]],
        ["Section 16: data supply chain", [
          F("data.downstream", "Downstream nodes", "code", "One per line: node | node type | data consumed | frequency | usage purpose"),
          F("data.upContract", "Contract with upstream nodes"), F("data.downContract", "Contract with downstream nodes")]]
      ] },
    { title: "SOP and measures", intro: "The HOW. The SOP follows sop-schema.md; the measures fill the 5-tier blueprint.",
      groups: [
        ["SOP metadata", [F("sop.id", "SOP ID"), F("sop.title", "SOP title"), F("sop.version", "Version"),
          F("sop.mcpEndpoint", "MCP Server Endpoint", "text", "One server, one owner (Chapter 9)."),
          F("sop.environment", "Environment", "seg", "", ["dev", "test", "prod"])]],
        ["Trigger, inputs, procedure", [
          F("sop.trigger", "Trigger", "textarea", "Event, cadence or upstream signal, with system names and payload references."),
          F("sop.inputs", "Inputs", "code", "One per line: input name | system of record | format | notes"),
          F("sop.steps", "Procedure", "code", "One step per line: action | evidence required | owner"),
          F("sop.controlPoints", "Control Points", "textarea", "Approvals, thresholds or compliance reviews that gate execution. One per line."),
          F("sop.compliance", "Compliance Notes", "textarea"),
          F("sop.payloadRequest", "MCP Payload Contract: request fields", "textarea", "One field per line."),
          F("sop.payloadResponse", "MCP Payload Contract: response fields", "textarea", "One field per line."),
          F("sop.traceability", "Traceability expectations")]],
        ["Measures by tier", [
          F("meas.financial", "T1 FINANCIAL_METRIC", "text", "Owned by business leaders; the persona inherits it and never carries it alone."), F("meas.keyResult", "T2 KEY_RESULT"), F("meas.krPeriod", "Key result measurement period"), F("meas.valueContribution", "T2 VALUE_CONTRIBUTION"), F("meas.costImpact", "T2 COST_IMPACT"),
          F("meas.sla", "T3 SLA"), F("meas.xla", "T3 XLA"),
          F("meas.leading", "T4 LEADING_INDICATOR"), F("meas.lever", "T4 VALUE_LEVER"), F("meas.leverSetting", "Lever current setting"), F("meas.leverAuthority", "Lever adjustment authority"),
          F("meas.risk", "T5 RISK_LEVEL"), F("meas.dq", "T5 DATA_QUALITY_ISSUE_IMPACT"),
          F("meas.telemetry", "Telemetry schema / event names"), F("meas.dashboards", "Dashboards / alert channels"),
          F("meas.volume", "Volume metric"), F("meas.volumeBand", "Volume target band"), F("meas.volumeTrigger", "Scaling or load-shedding trigger"),
          F("meas.extra", "Further measures", "code", "One per line: measure name | measure type | target | review cadence. Types: " + Object.keys(MEASURE_TYPES).join(", ") + ".")]],
        ["Attribution", [
          F("meas.contributors", "Contributors to the KPI", "textarea", "One per line: contributor and what it contributes."),
          F("meas.attribution", "Attribution approach", "select", "", ["", "Direct Attribution", "Proportional Attribution", "Experimental (A/B Testing)", "Statistical Modeling"]),
          F("meas.experiment", "Attribution description / experiment design", "textarea"),
          F("meas.dataReadiness", "Data readiness"), F("meas.sunset", "Sunset / evolution criteria")]]
      ] },
    { title: "Team, risk, lifecycle", intro: "Team detail beyond Question 3, and the sections Tier 2 and Tier 3 add.",
      groups: [
        ["7. Scope and ways of working", [
          F("team.schedule", "Operating schedule"), F("team.onDemand", "On-demand runs"), F("team.blackout", "Blackout periods"),
          F("team.fairness", "Fairness Constraints", "textarea", "One per line."), F("team.transparency", "Transparency Requirements", "textarea", "One per line."),
          F("team.dignity", "Human Dignity", "textarea", "One per line."), F("team.systemRules", "Interaction with Other Systems", "textarea", "One per line.")]],
        ["9. Interacting services", [
          F("team.consumes", "Services consumed", "code", "One per line: service | capability used | frequency | data exchanged | SLA dependency"),
          F("team.provides", "Services provided", "code", "One per line: service | capability provided | frequency | data provided | purpose")]],
        ["13. Regulatory and compliance", [
          F("team.regulations", "Industry Regulations", "textarea", "One per line."), F("team.euAiAct", "AI-specific regulations"),
          F("team.dataClass", "Data Classification", "select", "", ["", "Public", "Internal", "Confidential", "Restricted"]),
          F("team.pia", "Privacy Impact Assessment"), F("team.auditFreq", "Audit frequency"), F("team.retention", "Documentation retention"),
          F("team.rights", "Right to explanation and human review")]],
        ["14. Risk management", [F("team.risks", "Risk assessment", "code", "One per line: category | specific risk | likelihood (H/M/L) | impact (H/M/L) | mitigation")]],
        ["12. Lifecycle", [
          F("team.deployment", "Deployment approach", "select", "", ["", "Pilot", "Phased Rollout", "Full Deployment", "A/B Testing"]),
          F("team.rollout", "Rollout plan"), F("team.modelType", "Model type"), F("team.retraining", "Retraining / re-validation schedule")]],
        ["17. Worked example and dry-run cases", [
          F("team.scenario", "Scenario", "textarea"), F("team.outcome17", "Outcome", "textarea"),
          F("team.caseA", "Dry-run Case A (happy path)", "textarea", "Goes into the vanilla-agent prompts with the SOP."),
          F("team.caseB", "Dry-run Case B (edge case)", "textarea", "Should exercise a control point or an escalation.")]],
        ["19. Supporting documentation", [
          F("team.references", "References", "textarea", "One per line."), F("team.related", "Collaborating AI Personas", "textarea", "One per line."),
          F("team.replaces", "Replaces")]]
      ] },
    { title: "Handoff", intro: "Model a cross-domain handoff to a second persona. The page writes the Cross-Domain SOP Register entry and puts the same handoff clause into both packages.",
      note: "Register fields: cross-domain-sop-register.md. Collaboration archetypes and the dependency register: " + SRC.ch8 + ". A handoff to a persona in another Level 0 domain counts as a cross-domain data flow in the tier decision tree (step 3, " + SRC.tierGuide + ").",
      groups: [
        ["Turn it on", [F("handoff.enabled", "Model a cross-domain handoff to a second persona", "check")]],
        ["Second persona", [F("p2.name", "AI Persona Name"), F("p2.description", "Description", "textarea"),
          F("p2.l0", "Level 0 service (its domain)"), F("p2.l1", "Level 1 service"), F("p2.ln", "Level N"),
          F("p2.businessOwner", "Business Owner"), F("p2.sopOwner", "SOP Owner"), F("p2.airmLiaison", "AI RM liaison")]],
        ["The handoff", [
          F("handoff.direction", "Direction", "seg", "", [DIR_OUT, DIR_IN]),
          F("handoff.sopOwner", "Which domain owns the shared SOP", "seg", "One Server, One Owner: only the owning domain approves changes.", [OWN_ME, OWN_OTHER]),
          F("handoff.sopId", "SOP ID", "text", "Stable identifier of the shared SOP."), F("handoff.sopTitle", "SOP title"),
          F("handoff.mcpServer", "MCP server", "text", "Endpoint hosting the SOP."), F("handoff.depId", "Dependency ID", "text", "Link to the dependency register entry (DEP-XXX)."),
          F("handoff.purpose", "Invocation purpose", "text", "Outcome or value exchange being satisfied."),
          F("handoff.trigger", "Handoff trigger", "textarea", "When the handoff happens, with the event or payload reference."),
          F("handoff.payload", "Payload fields", "textarea", "One field per line."),
          F("handoff.archetype", "Collaboration archetype", "seg", "Observer only consumes; Collaborator shares decisions in one RACI; Co-owner is jointly funded with a dual-governance board.", ["Observer", "Collaborator", "Co-owner"]),
          F("handoff.vanilla", "Vanilla-Agent status of the shared SOP", "text", "Date and pass or hold from its latest dry run. When the shared SOP is this persona's own SOP, the page reads it from the dry-run tab instead."),
          F("handoff.cacDate", "Change Advisory Circle date", "date"), F("handoff.cacAttendees", "Change Advisory Circle attendees"),
          F("handoff.notes", "Notes", "textarea", "Constraints, escalation paths or blockers.")]]
      ] },
    { title: "Sections and sign-off", intro: "All 19 sections, pre-filled from your answers. Edit any section; an edited section stops following the answers until you reset it.", custom: "review" }
  ];

  function fieldHTML(f) {
    var v = getPath(state, f.path), id = "f-" + f.path.replace(/\./g, "-");
    var hint = f.hint ? '<span class="h">' + esc(f.hint) + "</span>" : "";
    if (f.type === "check") return '<label class="chk"><input type="checkbox" data-k="' + f.path + '" id="' + id + '"' + (v ? " checked" : "") + "><span>" + esc(f.label) + "</span></label>";
    if (f.type === "seg") {
      return '<div class="f" role="radiogroup" aria-labelledby="' + id + '-l"><span class="l" id="' + id + '-l">' + esc(f.label) + "</span>" + hint + '<div class="seg">' +
        f.opts.map(function (o) { return '<label><input type="radio" name="' + id + '" data-k="' + f.path + '" value="' + esc(o) + '"' + (v === o ? " checked" : "") + "><span>" + esc(o) + "</span></label>"; }).join("") + "</div></div>";
    }
    var ctl;
    var phAttr = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "";
    if (f.type === "textarea" || f.type === "code") ctl = '<textarea id="' + id + '" data-k="' + f.path + '"' + phAttr + (f.type === "code" ? ' class="code" spellcheck="false"' : "") + ">" + esc(v) + "</textarea>";
    else if (f.type === "select") ctl = '<select id="' + id + '" data-k="' + f.path + '">' + f.opts.map(function (o) { return '<option value="' + esc(o) + '"' + (v === o ? " selected" : "") + ">" + (o ? esc(o) : "Choose") + "</option>"; }).join("") + "</select>";
    else ctl = '<input type="' + (f.type === "number" ? "number" : f.type === "date" ? "date" : "text") + '" id="' + id + '" data-k="' + f.path + '" value="' + esc(v) + '"' + (f.type === "number" ? ' min="0" step="1000" inputmode="numeric"' : "") + phAttr + ">";
    return '<label class="f" for="' + id + '"><span class="l">' + esc(f.label) + "</span>" + hint + ctl + "</label>";
  }
  function groupsHTML(groups) {
    return groups.map(function (g) { var sub = typeof g[1] === "string" ? g[1] : "", fs = sub ? g[2] : g[1];
      return "<fieldset><legend>" + esc(g[0]) + "</legend>" + (sub ? '<p class="tw">' + esc(sub) + "</p>" : "") + fs.map(fieldHTML).join("") + "</fieldset>"; }).join("");
  }

  function tierReadoutHTML() {
    var tr = computeTier(state);
    var trace = tr.trace.map(function (st, i) {
      return '<li class="' + (i === tr.hitAt ? "hit" : "") + '">' + esc(st[0]) + " " + (i === 4 ? "" : (st[1] ? "YES" : "NO")) + (i === tr.hitAt ? " → Tier " + st[2] : "") + "</li>";
    }).join("");
    return '<p class="mono">Minimum tier</p><p class="big">Tier ' + tr.effective + "</p>" +
      "<p>" + esc(TIER_LABEL[tr.effective]) + ". " + TIER_READOUT[tr.effective] + "</p>" +
      (tr.unscored.length ? '<p class="notice">Unscored: ' + esc(tr.unscored.join(", ")) + '. Treated as Tier 3 until scored, following the guide\'s "When in doubt, select the higher tier."</p>' : "") +
      (tr.raised ? "<p>Raised by you from the computed Tier " + tr.computed + ".</p>" : "") +
      (tr.viaHandoff ? "<p>Cross-domain: the step 8 handoff goes to " + esc(t(state.p2.name) || "the second persona") + " in another Level 0 domain (" + esc(t(state.p2.l0)) + ").</p>" : "") +
      '<ol class="trace">' + trace + "</ol>" +
      '<span class="src">Decision tree, scoring matrix, $50K per-decision qualifier, section counts: ' + SRC.tierGuide + "; " + SRC.template + "</span>";
  }

  function stepHTML(i) {
    var st = STEPS[i], h = '<div class="step"><h2 id="step-heading" tabindex="-1"><span class="n">' + String(i + 1).padStart(2, "0") + "</span>" + esc(st.title) + '</h2><p class="intro">' + esc(st.intro) + "</p>";
    if (st.note) h += '<p class="src">' + esc(st.note) + "</p>";
    if (st.groups) h += groupsHTML(st.groups);
    if (st.custom === "tier") {
      h += DIMS.map(function (d) {
        return '<div class="dim" role="radiogroup" aria-label="' + esc(d[1]) + '"><h3>' + esc(d[1]) + '</h3><div class="opts">' +
          ["LOW", "MEDIUM", "HIGH"].map(function (lv, j) {
            return '<label class="opt"><input type="radio" name="dim-' + d[0] + '" data-k="tier.' + d[0] + '" value="' + lv + '"' + (state.tier[d[0]] === lv ? " checked" : "") + "><b>" + lv + " (Tier " + (j + 1) + ")</b>" + esc(d[2][j]) + "</label>";
          }).join("") + "</div></div>";
      }).join("");
      h += "<fieldset><legend>Additional qualifiers</legend>" +
        '<p>Financial authority per autonomous decision: <span class="mono" id="fin-readout">' + esc(usd(state.q.finLimit) || "not set (step 1)") + "</span>. Above $50K triggers Tier 3.</p>" +
        fieldHTML(F("tier.crossDomain", "The persona consumes or produces data across domain boundaries", "check")) +
        fieldHTML(F("tier.override", "Raise the tier (optional)", "select", "You can raise the tier, never lower it below the computed minimum.", ["", "1", "2", "3"])) + "</fieldset>";
      h += '<div class="readout" id="tier-readout" aria-live="polite">' + tierReadoutHTML() + "</div>";
    }
    if (st.custom === "style") {
      h += '<p class="notice">Four wording styles under test in a registered lab study; the builder offers them as options, none is recommended yet.</p>';
      h += '<div class="cards" role="radiogroup" aria-label="Authority style">' + STYLES.map(function (sv) {
        return '<label class="card"><input type="radio" name="authstyle" data-k="auth.style" value="' + sv[0] + '"' + (state.auth.style === sv[0] ? " checked" : "") + "><b>" + sv[0] + "</b><span>" + esc(sv[1]) + "</span><em>" + esc(sv[2]) + "</em></label>";
      }).join("") + "</div>";
      h += '<div class="toolbar"><button type="button" id="btn-fill-style">Fill the sentence from the template</button></div>';
      h += fieldHTML(F("auth.sentence", "Delegation scope sentence (Section 8.2)", "textarea", "Empty means the filled template sentence is used."));
      h += '<p class="src">Builder convention. The four styles are phrasing options for the Section 8.2 delegation scope; the methodology templates do not name them. The LIST rule "if it is not listed, it is not permitted" comes from ' + SRC.template + " Section 5.1.</p>";
    }
    if (st.custom === "esc") {
      h += '<div class="esc">' + ESC_TIERS.map(function (e) {
        return '<div><span class="t">' + esc(e[1]) + '</span> <span class="sla">' + esc(e[2]) + "</span><p>" + esc(e[3]) + " Default owner: " + esc(e[4]) + ".</p>" + fieldHTML(F("esc." + e[0], "Who picks this up", "text")) + "</div>";
      }).join("") + "</div>";
      h += '<p class="src">Escalation tiers and SLAs: ' + SRC.ch7 + ".</p>";
      h += groupsHTML([["Triggers and controls", [
        F("esc.triggers", "Automatic Escalation Triggers", "textarea", "One per line."),
        F("esc.confidence", "Minimum confidence for action"),
        F("esc.overrideRoles", "Who can override"),
        F("esc.killSwitch", "Kill Switch", "textarea", "Emergency shutdown procedure."),
        F("esc.exceptions", "Exception Handling", "textarea", "One per line: data quality issues, system unavailability, anomalies.")]],
        ["Incident types and emergency changes", "Suggested; the template leaves this open. Empty fields use the greyed suggestion, labelled as such in the package.", [
          F("esc.incPerf", "Performance Degradation (14.3)", "text", "", null, SUGGEST.incPerf),
          F("esc.incSec", "Security Breach (14.3)", "text", "", null, SUGGEST.incSec),
          F("esc.incBoundary", "Boundary Violation (14.3)", "text", "", null, SUGGEST.incBoundary),
          F("esc.incEthics", "Ethical Concern (14.3)", "text", "", null, SUGGEST.incEthics),
          F("esc.emergency", "Emergency Changes (12.4)", "text", "", null, SUGGEST.emergency),
          F("esc.violations", "Compliance violation response (13.3)", "text", "", null, SUGGEST.violations)]]]);
    }
    if (st.custom === "review") {
      var T = computeTier(state).effective;
      h += '<p class="mono">Tier ' + T + ": required sections " + TIER_SECTIONS[T].join(", ") + "</p>";
      h += SECTIONS.map(function (sec) {
        var n = sec[0], req = required(n, T), miss = sectionMissing(state, n, T), edited = !!t(state.overrides[n]);
        var body = edited ? state.overrides[n] : genSection(n, state, T);
        return '<details class="sec" data-sec="' + n + '"><summary><span class="no">' + n + '</span><span class="st">' + esc(sec[1]) + '</span><span class="bd">' +
          '<span class="badge">' + (req ? "required" : "deferrable") + "</span>" +
          (edited ? '<span class="badge edited">edited</span>' : "") +
          (req ? (miss.length ? '<span class="badge miss">open</span>' : '<span class="badge ok">complete</span>') : "") + "</span></summary>" +
          (miss.length ? '<p class="missing">Open: ' + esc(miss.join(", ")) + "</p>" : "") +
          '<textarea data-sec="' + n + '" aria-label="Section ' + n + ' markdown" spellcheck="false">' + esc(body) + "</textarea>" +
          '<div class="toolbar"><button type="button" data-reset="' + n + '"' + (edited ? "" : " disabled") + ">Reset to generated</button></div></details>";
      }).join("");
      h += groupsHTML([
        ["1.3 Version and Status", [F("id.version", "Version"), F("id.status", "Status", "select", "", ["Draft", "In Review", "Approved", "In Production", "Deprecated"]),
          F("id.effectiveDate", "Effective Date", "date"), F("id.reviewDate", "Review Date", "date")]],
        ["18. Approval and Sign-Off", [F("pkg.signBO", "Business Owner (name, date)"), F("pkg.signAIRM", "AI Resource Management (name, date)"), F("pkg.signCO", "Compliance Officer (name, date; required at Tier 3)")]],
        ["Delegation package evidence", [
          F("pkg.registerRow", "Cross-domain register row"), F("pkg.mcpRollback", "MCP rollback plan"), F("pkg.scorecard", "Readiness scorecard reference"),
          F("pkg.backlog", "Backlog work item IDs"), F("pkg.funding", "Funding approval reference"),
          F("pkg.vanillaLogId", "Vanilla-agent log ID", "text", "Enter after you run the dry-run prompts and score a pass.")]]
      ]);
    }
    h += '<div class="stepfoot"><button type="button" data-go="' + (i - 1) + '"' + (i === 0 ? " disabled" : "") + ">Back</button>" +
      '<button type="button" class="primary" data-go="' + (i + 1) + '"' + (i === STEPS.length - 1 ? " disabled" : "") + ">Next: " + esc(STEPS[i + 1] ? STEPS[i + 1].title : "done") + "</button></div></div>";
    return h;
  }

  var $ = function (id) { return document.getElementById(id); };
  function renderNav() {
    $("steps-nav").innerHTML = STEPS.map(function (st, i) {
      return '<li><button type="button" data-go="' + i + '"' + (i === state.step ? ' aria-current="step"' : "") + '><span class="n">' + String(i + 1).padStart(2, "0") + "</span>" + esc(st.title) + "</button></li>";
    }).join("");
  }
  function renderStep() {
    renderNav();
    $("step-body").innerHTML = stepHTML(state.step);
  }

  /* ---------- outputs ---------- */
  var MAX_SHOW = 300000; // characters shown in an output pane; Download and Copy always carry the full text
  function shown(text) {
    if (text.length <= MAX_SHOW) return text;
    return text.slice(0, MAX_SHOW) + "\n\n[Display shortened at " + MAX_SHOW.toLocaleString("en-US") + " of " + text.length.toLocaleString("en-US") + " characters. Download or Copy carry the full text.]";
  }
  var lastImport = null, rtText = "";
  function currentOutput() {
    switch (state.tab) {
      case "sop": return { text: genSOP(state), file: fname(state.sop.id || state.id.name, "sop.yaml"), type: "text/yaml", label: "SOP YAML" };
      case "blueprint": return { text: genBlueprint(state), file: fname(state.id.name, "measurement-blueprint.md"), type: "text/markdown", label: "blueprint" };
      case "checklist": return { text: genChecklist(state), file: fname(state.id.name, "delegation-checklist.md"), type: "text/markdown", label: "checklist" };
      case "dryrun": return { html: dryPanelHTML, text: genDryRunMd(state), file: fname(state.sop.id || state.id.name, "vanilla-dry-run-pack.md"), type: "text/markdown", label: "dry-run pack" };
      case "readiness": return { html: function () { return NS.check.panelHTML(state); }, text: NS.check.readinessMd(state), file: fname(state.id.name, "readiness-report.md"), type: "text/markdown", label: "readiness report" };
      case "handoff": return { text: genHandoff(state), file: fname(state.handoff.sopId || state.id.name, "handoff-register.md"), type: "text/markdown", label: "handoff" };
      case "roundtrip": return { html: roundtripHTML, text: lastImport ? lastImport.reportMd : "No import yet.\n", file: fname(state.id.name, "import-diff.md"), type: "text/markdown", label: "import diff" };
      default: return { text: genPackage(state), download: function () { return NS.io.packageWithState(state); }, file: fname(state.id.name, "persona-definition.md"), type: "text/markdown", label: "package" };
    }
  }
  function runFields(k) {
    var p = "scoring." + k + ".";
    return '<div class="two">' + fieldHTML(F(p + "date", "Run date", "date")) + fieldHTML(F(p + "facilitator", "Facilitator")) + "</div>" +
      fieldHTML(F(p + "trigger", "Trigger condition", "text", "Empty uses the SOP trigger.")) +
      '<fieldset><legend>Criteria (Chapter 9)</legend>' + CRITERIA.map(function (c) { return fieldHTML(F(p + c[0], c[0].toUpperCase() + ". " + c[1], "check")); }).join("") + "</fieldset>" +
      fieldHTML(F(p + "trace", "Actual Behavior & MCP Trace", "code", "One row per line: step | MCP interaction ID | observations | issues")) +
      '<div class="two">' + fieldHTML(F(p + "decisionOwner", "Decision Owner")) + fieldHTML(F(p + "nextDate", "Next Test Date", "date")) + "</div>" +
      fieldHTML(F(p + "followUp", "Follow-up Actions", "textarea")) +
      fieldHTML(F(p + "evidence", "Evidence Attachments", "textarea", "One link or file path per line.")) +
      fieldHTML(F(p + "notes", "Notes: issues seen, steps where it stalled", "textarea"));
  }
  function dryPanelHTML() {
    var h = '<p class="notice">Run these prompts on your own models; this page calls none. Paste each into a model of the matching tier, then record the run below. Each run fills a vanilla-agent log in the template format.</p>' +
      '<blockquote class="rule"><p>' + esc(CH9_RULE) + "</p><p>" + esc(CH9_FAIL) + '</p><span class="src">Quoted from ' + SRC.ch9 + ", Vanilla-Agent Validation. Log format: " + SRC.vlog + ".</span></blockquote>";
    h += '<table class="score"><caption class="sr">Result per model tier</caption><thead><tr><th>Model tier</th><th>Run date</th><th>Result</th></tr></thead><tbody>' +
      MODEL_TIERS.map(function (m) { return "<tr><td>" + m[1] + '</td><td class="mono" id="rundate-' + m[0] + '">' + esc(t(state.scoring[m[0]].date) || "none") + '</td><td id="verdict-' + m[0] + '">' + verdictHTML(m[0]) + "</td></tr>"; }).join("") + "</tbody></table>";
    MODEL_TIERS.forEach(function (m) {
      h += '<section class="run" aria-labelledby="run-h-' + m[0] + '"><div class="prompt-h"><h3 id="run-h-' + m[0] + '">' + m[1] + ' tier run</h3><span id="verdict2-' + m[0] + '">' + verdictHTML(m[0]) + "</span></div>" +
        '<details><summary>Prompt for the ' + m[0] + ' tier</summary><div class="toolbar"><button type="button" data-copyprompt="' + m[0] + '">Copy prompt</button></div><pre class="out" tabindex="0" aria-label="' + m[1] + ' tier prompt">' + esc(shown(genPrompt(state, m[0]))) + "</pre></details>" +
        runFields(m[0]) +
        '<details><summary>Vanilla-agent log for this run</summary><div class="toolbar"><button type="button" data-copylog="' + m[0] + '">Copy log</button><button type="button" data-dllog="' + m[0] + '">Download log</button></div><pre class="out" tabindex="0" id="log-' + m[0] + '" aria-label="' + m[1] + ' tier vanilla-agent log">' + esc(shown(genLog(state, m[0]))) + "</pre></details></section>";
    });
    return h;
  }
  function verdictHTML(k) { var v = verdict(state, k), cls = { pass: "pass", hold: "hold", "incomplete record": "none" }[v] || "none"; return '<span class="verdict ' + cls + '">' + v + "</span>"; }
  function refreshRun(k) {
    var a = $("verdict-" + k), b = $("verdict2-" + k), d = $("rundate-" + k), l = $("log-" + k);
    if (a) a.innerHTML = verdictHTML(k); if (b) b.innerHTML = verdictHTML(k);
    if (d) d.textContent = t(state.scoring[k].date) || "none";
    if (l) l.textContent = shown(genLog(state, k));
  }
  function roundtripHTML() {
    var h = '<p>Paste a 19-section package in markdown, or load a file. A package downloaded from this page carries its form state in a hidden comment at the end, so it comes back exactly; a section edited after download comes back as an edited section. A package from elsewhere fills the fields the page can read and keeps every section as written, marked edited.</p>' +
      '<label class="f" for="rt-input"><span class="l">Package markdown</span><textarea id="rt-input" class="code" spellcheck="false"></textarea></label>' +
      '<div class="toolbar"><button type="button" class="primary" id="btn-rt-import">Import into the form</button>' +
      '<label class="filebtn">Load .md file<input type="file" id="rt-file" accept=".md,.markdown,.txt,text/markdown,text/plain"></label>' +
      '<button type="button" id="btn-rt-current">Paste the current package</button></div>' +
      '<p class="notice">Importing replaces the current draft. Export JSON first if you want to keep it.</p>' +
      '<div id="rt-report">' + (lastImport ? NS.io.reportHTML(lastImport) : '<p class="mono">No import yet.</p>') + "</div>";
    return h;
  }

  function renderOutputs(full) {
    var o = currentOutput();
    Array.prototype.forEach.call(document.querySelectorAll("#tabs [role=tab]"), function (b) {
      var on = b.dataset.tab === state.tab;
      b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1;
      if (on) $("outpanel").setAttribute("aria-labelledby", b.id);
    });
    $("out-text").setAttribute("aria-label", "Generated " + o.label);
    $("btn-download").textContent = "Download " + o.label; $("btn-copy").textContent = "Copy " + o.label;
    var isHtml = !!o.html;
    $("out-text").hidden = isHtml; $("out-html").hidden = !isHtml;
    if (isHtml) {
      if (full !== false || $("out-html").getAttribute("data-tab") !== state.tab) {
        $("out-html").innerHTML = o.html(); $("out-html").setAttribute("data-tab", state.tab);
        if (state.tab === "roundtrip") { var ta = $("rt-input"); if (ta) ta.value = rtText; }
      }
    } else { $("out-text").textContent = shown(o.text); $("out-html").setAttribute("data-tab", ""); }
    var meta = "";
    if (state.tab === "package") meta = (o.text.match(/^## \d+\. /gm) || []).length + " sections · Tier " + computeTier(state).effective;
    if (state.tab === "sop") { var yc = yamlCheck(state); meta = yc.ok ? "YAML check: parses" : "YAML check failed: " + yc.error; }
    if (state.tab === "checklist") { var it = checklistItems(state); meta = it.filter(function (i) { return i.state !== "open"; }).length + " of " + it.length + " closed"; }
    if (state.tab === "dryrun") meta = MODEL_TIERS.map(function (m) { return m[0] + ": " + verdict(state, m[0]); }).join(" · ");
    if (state.tab === "readiness") { var f = NS.check.consistency(state); var nb = f.filter(function (x) { return x.severity === "block"; }).length, nw = f.filter(function (x) { return x.severity === "warn"; }).length; var ni = f.length - nb - nw; meta = nb + " blocking · " + nw + (nw === 1 ? " warning" : " warnings") + (ni ? " · " + ni + (ni === 1 ? " note" : " notes") : ""); }
    if (state.tab === "handoff") meta = state.handoff.enabled ? "register entry + two packages" : "no handoff modelled";
    if (state.tab === "roundtrip") meta = lastImport ? lastImport.summary : "nothing imported";
    $("outmeta").textContent = meta;
    renderMeter();
  }
  // Compact completeness line above the steps, always visible.
  function renderMeter() {
    var sel = $("sel-example"); if (sel && state.exampleId && sel.value !== state.exampleId) sel.value = state.exampleId;
    var el = $("meter"); if (!el) return;
    var c = NS.check.completeness(state), T = c.assigned, row = c.tiers[T - 1];
    var f = NS.check.consistency(state), blocks = f.filter(function (x) { return x.severity === "block"; }).length;
    el.innerHTML = '<span class="mono">Tier ' + T + " · " + row.complete.length + " of " + row.required.length + ' required sections complete</span>' +
      '<span class="bar" aria-hidden="true"><span style="width:' + Math.round(100 * row.complete.length / row.required.length) + '%"></span></span>' +
      '<span class="mono">' + (blocks ? blocks + " consistency " + (blocks === 1 ? "problem blocks" : "problems block") + " sign-off" : "no blocking consistency problems") + "</span>" +
      ' <button type="button" class="linkish" data-tabgo="readiness">Open readiness</button>';
  }

  /* ---------- persistence ---------- */
  var saveTimer = null, outTimer = null, storageNote = "";
  function sayStorage(msg) { storageNote = msg; var el = $("savestate"); if (el) el.textContent = msg; }
  // Writes the draft now; returns the message shown to the user.
  function saveNow() {
    var json = "";
    try { json = JSON.stringify(state); } catch (e) { sayStorage("Draft could not be serialised: " + e.message); return storageNote; }
    try { localStorage.setItem(STORE_KEY, json); var d = new Date(); sayStorage("Draft saved in this browser " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); }
    catch (e) {
      var quota = e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014);
      sayStorage(quota ? "Draft too large for browser storage (" + (json.length / 1048576).toFixed(1) + " MB). Export JSON to keep it." : "Browser storage unavailable. Export JSON to keep your work.");
    }
    return storageNote;
  }
  var holdSave = false;
  function save() { if (holdSave) return; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); }
    catch (e) { sayStorage("Browser storage unavailable. Export JSON to keep your work."); return false; }
    if (!raw) return false;
    try { var notes = []; state = sanitize(JSON.parse(raw), notes); if (notes.length) sayStorage("Saved draft loaded; " + notes.length + " value(s) reset: " + notes.slice(0, 3).join("; ")); return true; }
    catch (e) { sayStorage("The saved draft could not be read (" + e.message + "); starting blank. Nothing was overwritten yet."); return false; }
  }
  function stateSize() { try { return JSON.stringify(state).length; } catch (e) { return 0; } }
  // Large drafts re-render less eagerly so typing stays responsive.
  function changed(full) {
    save();
    clearTimeout(outTimer);
    var big = stateSize() > 1000000;
    if (big) $("outmeta").textContent = "Updating…";
    outTimer = setTimeout(function () { renderOutputs(full); }, big ? 600 : 120);
  }
  function download(data, file, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: (type || "text/plain") + (typeof data === "string" ? ";charset=utf-8" : "") });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function copy(text, btn, what) {
    function done(ok) {
      var old = btn.getAttribute("data-label") || btn.textContent; btn.setAttribute("data-label", old);
      btn.textContent = ok ? "Copied" : "Copy failed"; setTimeout(function () { btn.textContent = old; btn.removeAttribute("data-label"); }, 1400);
      var live = $("announce"); if (live) { live.textContent = ""; setTimeout(function () { live.textContent = ok ? "Copied " + (what || "text") + " to the clipboard" : "Copy failed; select the text and copy it by hand"; }, 50); }
    }
    function fallback() {
      try { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove(); return ok; }
      catch (e) { return false; }
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback()); });
    else done(fallback());
  }
  function announce(msg) { var live = $("announce"); if (live) { live.textContent = ""; setTimeout(function () { live.textContent = msg; }, 50); } }

  /* ---------- whole-state changes ---------- */
  function replaceState(next, msg) {
    holdSave = false; rtText = "";
    var keep = { step: state.step, tab: state.tab };
    state = next; state.step = keep.step; state.tab = keep.tab;
    renderStep(); renderOutputs(); save();
    if (msg) { sayStorage(msg); announce(msg); }
  }
  function isBlank(s) { var a = clone(s), b = blankState(); a.step = b.step; a.tab = b.tab; return JSON.stringify(a) === JSON.stringify(b); }
  var importToken = 0;
  function readFile(f, cb) {
    var my = ++importToken, r = new FileReader();
    r.onload = function () { if (my !== importToken) return; cb(null, String(r.result)); };
    r.onerror = function () { if (my !== importToken) return; cb(r.error || new Error("could not read the file")); };
    r.readAsText(f);
  }
  function importJSONText(txt, name) {
    if (!t(txt)) throw new Error("the file is empty");
    var data = JSON.parse(txt);
    if (!isPlain(data) || !isPlain(data.id) || !isPlain(data.q)) throw new Error("not a Persona Forge export (needs id and q objects)");
    var notes = [], next = sanitize(data, notes);
    return { state: next, notes: notes, name: name || "" };
  }
  function importPackageText(txt) {
    var res = NS.io.importPackage(txt, state);
    lastImport = res.report; rtText = txt.length > 2000000 ? "" : txt;
    var keepTab = "roundtrip"; state = res.state; state.tab = keepTab;
    renderStep(); renderOutputs(); save();
    announce("Imported package: " + res.report.summary);
    return res;
  }

  /* ---------- print ---------- */
  function preparePrint() { var el = $("print-doc"); if (el) el.innerHTML = NS.io.printHTML(state); }

  /* ---------- events ---------- */
  function onField(e) {
    holdSave = false;
    var el = e.target, k = el.getAttribute("data-k");
    if (k) {
      var v = el.type === "checkbox" ? el.checked : el.value;
      setPath(state, k, v);
      if (k.indexOf("tier.") === 0 || k === "q.finLimit" || k.indexOf("handoff.") === 0 || k === "p2.l0" || k === "id.l0") { var tr = $("tier-readout"); if (tr) tr.innerHTML = tierReadoutHTML(); var fr = $("fin-readout"); if (fr) fr.textContent = usd(state.q.finLimit) || "not set (step 1)"; }
      if (k.indexOf("scoring.") === 0) { refreshRun(k.split(".")[1]); changed(false); return; }
      changed();
      return;
    }
    var sec = el.getAttribute("data-sec");
    if (sec && el.tagName === "TEXTAREA") {
      var T = computeTier(state).effective;
      if (!el.value.trim() || el.value.trim() === genSection(Number(sec), state, T).trim()) delete state.overrides[sec]; else state.overrides[sec] = el.value;
      var rb = document.querySelector('[data-reset="' + sec + '"]'); if (rb) rb.disabled = !state.overrides[sec];
      changed();
    }
  }
  function go(i) {
    if (i < 0 || i >= STEPS.length) return;
    state.step = i; renderStep(); save();
    var hd = $("step-heading"); if (hd) { hd.focus({ preventScroll: true }); if (hd.getBoundingClientRect().top < 0) hd.scrollIntoView({ block: "start" }); }
  }
  function setTab(tab, focusTab) {
    if (TABS.indexOf(tab) < 0) return;
    state.tab = tab; renderOutputs(); save();
    if (focusTab) { var b = $("tab-" + tab); if (b) b.focus(); }
  }
  function onClick(e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-go")) { go(Number(b.getAttribute("data-go"))); return; }
    if (b.hasAttribute("data-tabgo")) { setTab(b.getAttribute("data-tabgo"), true); return; }
    if (b.hasAttribute("data-reset")) {
      var n = b.getAttribute("data-reset"); delete state.overrides[n]; renderStep();
      var d = document.querySelector('details[data-sec="' + n + '"]'); if (d) { d.open = true; var ta = d.querySelector("textarea"); if (ta) ta.focus(); }
      changed(); announce("Section " + n + " follows your answers again"); return;
    }
    if (b.id === "btn-fill-style") {
      if (!state.auth.style) { b.textContent = "Pick a style first"; setTimeout(function () { b.textContent = "Fill the sentence from the template"; }, 1400); return; }
      state.auth.sentence = styleSentence(state, state.auth.style); var sta = $("f-auth-sentence"); if (sta) sta.value = state.auth.sentence; changed(); return;
    }
    if (b.hasAttribute("data-copyprompt")) { copy(genPrompt(state, b.getAttribute("data-copyprompt")), b, b.getAttribute("data-copyprompt") + " tier prompt"); return; }
    if (b.hasAttribute("data-copylog")) { copy(genLog(state, b.getAttribute("data-copylog")), b, "vanilla-agent log"); return; }
    if (b.hasAttribute("data-dllog")) { var k = b.getAttribute("data-dllog"); download(genLog(state, k), fname(state.sop.id || state.id.name, "vanilla-agent-log-" + k + ".md"), "text/markdown"); return; }
    if (b.id === "btn-rt-current") { rtText = NS.io.packageWithState(state); var ri = $("rt-input"); if (ri) { ri.value = rtText; ri.focus(); } return; }
    if (b.id === "btn-rt-import") {
      var input = $("rt-input"), txt = input ? input.value : rtText;
      if (!t(txt)) { announce("Paste a package first"); if (input) input.focus(); return; }
      if (!isBlank(state) && !window.confirm("Replace the current draft with the imported package? Export JSON first if you want to keep it.")) return;
      try { importPackageText(txt); var rep = $("rt-report"); if (rep) { rep.setAttribute("tabindex", "-1"); rep.focus(); } }
      catch (err) { var rr = $("rt-report"); if (rr) rr.innerHTML = '<p class="missing" role="alert">Import failed: ' + esc(err.message) + "</p>"; }
      return;
    }
  }
  function onFileChange(e) {
    var el = e.target; if (!el || el.type !== "file") return;
    var f = el.files && el.files[0]; if (!f) return;
    if (el.id === "file-import") {
      readFile(f, function (err, txt) {
        el.value = "";
        if (err) { sayStorage("Import failed: " + err.message); return; }
        try {
          var res = importJSONText(txt, f.name);
          if (!isBlank(state) && !window.confirm("Replace the current draft with " + f.name + "? Export JSON first if you want to keep it.")) return;
          lastImport = null; replaceState(res.state, "Imported " + f.name + (res.notes.length ? "; " + res.notes.length + " value(s) reset: " + res.notes.slice(0, 3).join("; ") : ""));
        } catch (er) { sayStorage("Import failed: " + er.message); announce("Import failed: " + er.message); }
      });
    }
    if (el.id === "rt-file" || el.id === "file-import-md") {
      readFile(f, function (err, txt) {
        el.value = "";
        if (err) { sayStorage("Import failed: " + err.message); return; }
        rtText = txt;
        if (el.id === "file-import-md") { state.tab = "roundtrip"; renderOutputs(); }
        var ri = $("rt-input"); if (ri) ri.value = txt;
        announce("Loaded " + f.name + "; press Import into the form");
        var btn = $("btn-rt-import"); if (btn) btn.focus();
      });
    }
  }

  function parseHash() {
    var hp = Object.create(null);
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) {
      var p = kv.split("="); if (!p[0]) return;
      try { hp[p[0]] = p[1] == null ? true : decodeURIComponent(p[1]); } catch (e) { hp[p[0]] = true; }
    });
    return hp;
  }
  // #example=<id>: unknown ids fall back to blank (or keep a saved draft) with a notice; a saved draft is
  // replaced only after confirmation, and is not overwritten until the user edits something.
  function hashExample(raw, hadDraft, confirmFn) {
    var exId = raw === true ? "supplier" : String(raw), keepTab = state.tab;
    if (!NS.examples.has(exId)) {
      if (!hadDraft) { state = blankState(); state.tab = keepTab; }
      sayStorage("No worked example called \"" + exId.slice(0, 30) + "\"; " + (hadDraft ? "kept your saved draft." : "started blank."));
      return "unknown";
    }
    if (hadDraft && !confirmFn("This link loads the worked example " + NS.examples.label(exId) + ". Replace the draft saved in this browser? Choose Cancel to keep it.")) {
      sayStorage("Kept your saved draft; the worked example was not loaded.");
      return "kept";
    }
    state = NS.examples.get(exId); state.tab = keepTab;
    if (hadDraft) { holdSave = true; sayStorage("Showing the worked example. Your saved draft stays in this browser until you edit."); }
    return "loaded";
  }
  function init() {
    var hadDraft = load() && !isBlank(state);
    // URL hash shortcuts: #example or #example=supplier|ap|report loads a worked example; step=N (1-9) and tab=<tab> pick the view; print prepares the print view.
    var hp = parseHash();
    if (hp.example) hashExample(hp.example, hadDraft, function (msg) { return window.confirm(msg); });
    if (hp.step && Number(hp.step) >= 1 && Number(hp.step) <= STEPS.length) state.step = Math.floor(Number(hp.step)) - 1;
    if (hp.tab && TABS.indexOf(hp.tab) >= 0) state.tab = hp.tab;
    renderStep(); renderOutputs();
    $("step-body").addEventListener("input", onField);
    $("step-body").addEventListener("change", onField);
    $("out-html").addEventListener("input", function (e) { if (e.target.id === "rt-input") { rtText = e.target.value; return; } onField(e); });
    $("out-html").addEventListener("change", function (e) { if (e.target.type === "file") return; if (e.target.id === "rt-input") return; onField(e); });
    document.addEventListener("change", onFileChange);
    document.addEventListener("click", onClick);
    $("tabs").addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (!b) return; setTab(b.dataset.tab); });
    $("tabs").addEventListener("keydown", function (e) {
      var tabs = Array.prototype.slice.call(document.querySelectorAll("#tabs [role=tab]")), i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var n = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
      if (n < 0) return;
      e.preventDefault(); setTab(tabs[n].dataset.tab, true);
    });
    $("btn-download").addEventListener("click", function () { var o = currentOutput(); download(o.download ? o.download() : o.text, o.file, o.type); });
    $("btn-copy").addEventListener("click", function (e) { var o = currentOutput(); copy(o.text, e.currentTarget, o.label); });
    $("btn-zip").addEventListener("click", function () {
      try { var z = NS.io.buildZip(state); download(new Blob([z.bytes], { type: "application/zip" }), z.name); announce("Zip with " + z.files.length + " files downloaded"); }
      catch (err) { sayStorage("Zip failed: " + err.message); }
    });
    $("btn-print").addEventListener("click", function () { preparePrint(); window.print(); });
    window.addEventListener("beforeprint", preparePrint);
    $("btn-example").addEventListener("click", function () {
      var id = $("sel-example").value;
      if (!isBlank(state) && !window.confirm("Replace the current draft with the worked example? Export first if you want to keep it.")) return;
      lastImport = null; replaceState(NS.examples.get(id), "Loaded worked example: " + NS.examples.label(id));
    });
    $("btn-clear").addEventListener("click", function () {
      if (!window.confirm("Clear every field and start blank? Export first if you want to keep this draft.")) return;
      lastImport = null; rtText = ""; holdSave = false;
      if (location.hash && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      state = blankState(); renderStep(); renderOutputs(); save(); announce("Started a blank draft");
    });
    $("btn-export").addEventListener("click", function () { download(JSON.stringify(state, null, 2) + "\n", t(state.id.name) ? "persona-forge-" + slug(state.id.name) + ".json" : "persona-forge-state.json", "application/json"); });
    if (hp.print) preparePrint();
    if (storageNote) sayStorage(storageNote);
    if (NS.runSelfCheck) NS.runSelfCheck(!!hp.selftest);
    // The stress harness loads only over http and only when the file is there (a HEAD request), never from the hash alone.
    if (hp.stress && /^https?:$/.test(location.protocol) && window.fetch) {
      fetch("tests/stress.js", { method: "HEAD", cache: "no-store" }).then(function (r) {
        if (!r.ok) return; var sc = document.createElement("script"); sc.src = "tests/stress.js"; document.body.appendChild(sc);
      }, function () { /* no harness on this host */ });
    }
  }

  /* ---------- namespace shared with forge-check.js, forge-io.js, forge-examples.js, forge-selfcheck.js ---------- */
  var api = {
    // constants
    SECTIONS: SECTIONS, TIER_SECTIONS: TIER_SECTIONS, TIER_LABEL: TIER_LABEL, CHECK_ADDS: CHECK_ADDS, CRITERIA: CRITERIA, MODEL_TIERS: MODEL_TIERS,
    MEASURE_TYPES: MEASURE_TYPES, CH9_RULE: CH9_RULE, CH9_FAIL: CH9_FAIL, EXAMPLE_LINE: EXAMPLE_LINE, FIN_THRESHOLD: FIN_THRESHOLD, DIMS: DIMS,
    STEPS: STEPS, TABS: TABS, SRC: SRC, STYLES: STYLES, OWN_ME: OWN_ME, OWN_OTHER: OWN_OTHER, DIR_IN: DIR_IN, DIR_OUT: DIR_OUT, SCHEMA_VERSION: SCHEMA_VERSION,
    // helpers
    t: t, ph: ph, esc: esc, lines: lines, rows: rows, table: table, clone: clone, getPath: getPath, setPath: setPath, merge: merge, sanitize: sanitize,
    isoDate: isoDate, addMonths: addMonths, validISO: validISO, slug: slug, fname: fname, usd: usd, finNum: finNum, signed: signed, isPlain: isPlain,
    checklistLine: checklistLine, required: required, sectionMissing: sectionMissing, authSentence: authSentence, handoffCrosses: handoffCrosses, domainKey: domainKey,
    // generators
    blankState: blankState, blankRun: blankRun, computeTier: computeTier, genSection: genSection, genPackage: genPackage, genSOP: genSOP, sopObject: sopObject,
    parseYAML: parseYAML, toYAML: toYAML, yamlCheck: yamlCheck, deepEqual: deepEqual, genBlueprint: genBlueprint, genChecklist: genChecklist, checklistItems: checklistItems,
    genDryRunMd: genDryRunMd, genPrompt: genPrompt, genLog: genLog, genScoringMd: genScoringMd, verdict: verdict, runRecorded: runRecorded, vanillaSummary: vanillaSummary,
    genHandoff: genHandoff, handoffClause: handoffClause, registerRow: registerRow, mirrorState: mirrorState, stepHTML: stepHTML, dryPanelHTML: dryPanelHTML,
    // live page
    getState: function () { return clone(state); },
    setState: function (s) { state = sanitize(s); },
    importJSONText: function (txt) { state = importJSONText(txt).state; },
    importJSON: importJSONText,
    importPackageText: importPackageText,
    renderStep: function () { renderStep(); }, renderOutputs: function () { renderOutputs(); }, preparePrint: preparePrint, saveNow: saveNow,
    loadExample: function (id) { lastImport = null; replaceState(NS.examples.get(id), "Loaded worked example: " + NS.examples.label(id)); },
    applyJSONImport: function (res) { lastImport = null; replaceState(res.state, "Imported " + (res.name || "JSON")); },
    rtTextLength: function () { return rtText.length; }, holdingSave: function () { return holdSave; },
    tierReadout: function (T) { return TIER_READOUT[T]; }, hashExample: hashExample, releaseHold: function () { holdSave = false; }, escComments: escComments, runGaps: runGaps,
    flushTimers: function () { clearTimeout(saveTimer); clearTimeout(outTimer); },
    setView: function (step, tab) { if (step != null) state.step = step; if (tab) state.tab = tab; },
    exampleState: function (id) { return NS.examples.get(id || "supplier"); }
  };
  Object.keys(api).forEach(function (k) { NS[k] = api[k]; });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})();
