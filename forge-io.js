/* Persona Forge: files in and out.
   - a small zip writer (stored entries, no compression, CRC-32) and a reader used by the self-check
   - package markdown with the form state embedded in a closing HTML comment, and its importer (round trip)
   - a line diff for the import view
   - a markdown-to-HTML renderer for the print view (all text escaped; only the renderer's own tags are emitted) */
(function () {
  "use strict";
  var NS = window.PersonaForge;
  var IO = NS.io = {};

  /* ---------- bytes ---------- */
  function utf8(str) { return new TextEncoder().encode(str); }
  function fromUtf8(bytes) { return new TextDecoder("utf-8").decode(bytes); }
  var CRC_TABLE = (function () {
    var tbl = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tbl[n] = c >>> 0; }
    return tbl;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  IO.crc32 = crc32; IO.utf8 = utf8;
  function b64encode(str) {
    var bytes = utf8(str), bin = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(b64.replace(/\s+/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return fromUtf8(bytes);
  }

  /* ---------- zip writer: stored entries, UTF-8 names (general purpose flag bit 11) ---------- */
  function dosTime(d) { return ((d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)) & 0xFFFF; }
  function dosDate(d) { return (((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF; }
  IO.zip = function (files, when) {
    when = when || new Date();
    var time = dosTime(when), date = dosDate(when), parts = [], central = [], offset = 0, seen = {};
    files.forEach(function (f) {
      if (seen[f.name]) throw new Error("duplicate file name in zip: " + f.name);
      seen[f.name] = 1;
      var name = utf8(f.name), data = typeof f.data === "string" ? utf8(f.data) : f.data, crc = crc32(data);
      if (data.length > 0xFFFFFFFE || offset > 0xFFFFFFFE) throw new Error("zip too large for the stored format (4 GB limit)");
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    if (files.length > 0xFFFF) throw new Error("too many files for one zip");
    var cdSize = central.reduce(function (n, p) { return n + p.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
    var all = parts.concat(central, [new Uint8Array(end.buffer)]);
    var total = all.reduce(function (n, p) { return n + p.length; }, 0), out = new Uint8Array(total), pos = 0;
    all.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  };
  // Reader for stored entries, used by the self-check to prove the writer's output.
  IO.unzip = function (bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), e = -1;
    for (var i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65535; i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("no end of central directory record");
    var count = dv.getUint16(e + 10, true), cdOff = dv.getUint32(e + 16, true), p = cdOff, out = [];
    for (var k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("bad central directory entry " + k);
      var method = dv.getUint16(p + 10, true), crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true);
      var xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      var name = fromUtf8(bytes.subarray(p + 46, p + 46 + nlen));
      if (dv.getUint32(lho, true) !== 0x04034b50) throw new Error("bad local header for " + name);
      if (method !== 0) throw new Error("entry " + name + " is compressed");
      var start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true), data = bytes.subarray(start, start + size);
      if (crc32(data) !== crc) throw new Error("CRC mismatch in " + name);
      out.push({ name: name, text: fromUtf8(data) });
      p += 46 + nlen + xlen + clen;
    }
    return out;
  };

  /* ---------- package with embedded state ---------- */
  var MARK = "persona-forge-state v";
  IO.packageWithState = function (s) {
    var b64 = b64encode(JSON.stringify(s)).replace(/(.{76})/g, "$1\n");
    return NS.genPackage(s) + "\n<!-- " + MARK + NS.SCHEMA_VERSION + "\nThe form state for Persona Forge's Import package. Leave this comment in place to bring the draft back exactly.\n" + b64 + "\n-->\n";
  };
  function nl(s) { return String(s).replace(/\r\n|\r/g, "\n"); }
  function normSec(s) { return nl(s).split("\n").map(function (x) { return x.replace(/\s+$/, ""); }).join("\n").trim(); }
  IO.normSec = normSec;
  // The state comment counts only if it is the last HTML comment in the file, sits after the "End of AI Persona
  // Definition" line (so never inside a section), and carries a known version. Anything else is plain text.
  var KNOWN_VERSIONS = ["2"];
  IO.findStateComment = function (raw) {
    var re = /<!-- persona-forge-state v(\d+)[^\n]*\n(?:[^\n]*\n)?([A-Za-z0-9+/=\s]+?)-->/g, mm, last = null;
    while ((mm = re.exec(raw))) last = mm;
    if (!last) return { match: null };
    var after = raw.slice(last.index + last[0].length), endMark = raw.lastIndexOf("**End of AI Persona Definition**", last.index);
    if (after.indexOf("<!--") >= 0) return { match: null, note: "A state comment was found but another comment follows it; it was read as text" };
    if (endMark < 0) return { match: null, note: "A state comment was found outside the end of the package; it was read as text" };
    if (KNOWN_VERSIONS.indexOf(last[1]) < 0) return { match: null, note: "State comment version " + last[1] + " is not one this page knows; the fields were read from the text instead" };
    return { match: last };
  };
  // Split a package into its numbered sections. A heading counts only if its number is higher than the last one,
  // so a "## 3." line written inside Section 5 stays body text.
  IO.parseSections = function (text) {
    var ls = nl(text).split("\n"), secs = {}, titles = {}, notes = [], cur = null, last = 0, buf = [];
    function flush() { if (cur != null) { while (buf.length && /^\s*(---)?\s*$/.test(buf[buf.length - 1])) buf.pop(); while (buf.length && !buf[0].trim()) buf.shift(); secs[cur] = buf.join("\n"); } buf = []; }
    ls.forEach(function (ln) {
      var m = /^## (\d{1,2})\. (.*)$/.exec(ln);
      if (m && Number(m[1]) >= 1 && Number(m[1]) <= 19) {
        var n = Number(m[1]);
        if (n > last) { flush(); cur = n; last = n; titles[n] = m[2].replace(/\s*\*\*\[TIER[^\]]*\]\*\*\s*$/, "").trim(); return; }
        notes.push("A second Section " + n + " heading inside Section " + cur + " was kept as text");
      }
      if (cur != null && (/^\*\*End of AI Persona Definition\*\*/.test(ln) || /^## Tiered Completion Checklist/.test(ln) || /^<!-- persona-forge-state/.test(ln))) { flush(); cur = null; return; }
      if (cur != null) buf.push(ln);
    });
    flush();
    return { sections: secs, titles: titles, notes: notes };
  };

  /* ---------- field extraction for packages without embedded state ---------- */
  function isPlaceholder(v) { return !v || /`\[/.test(v) || /^\[.*\]$/.test(v.trim()); }
  function label(sec, name) { var m = new RegExp("\\*\\*" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":\\*\\*[ \\t]*(.*)").exec(sec || ""); return m && !isPlaceholder(m[1]) ? m[1].trim() : ""; }
  function after(sec, heading) {
    var ls = nl(sec || "").split("\n"), i = ls.findIndex(function (x) { return x.indexOf(heading) === 0; });
    if (i < 0) return [];
    var out = [];
    for (var j = i + 1; j < ls.length; j++) { var x = ls[j]; if (/^\s*$/.test(x) && out.length) break; if (/^\s*$/.test(x)) continue; if (/^\*\*|^###/.test(x)) break; out.push(x); }
    return out;
  }
  function bulletsAfter(sec, heading) { return after(sec, heading).filter(function (x) { return /^\s*- /.test(x); }).map(function (x) { return x.replace(/^\s*- /, "").trim(); }).filter(function (x) { return !isPlaceholder(x); }); }
  function tableAfter(sec, heading) {
    var ls = nl(sec || "").split("\n"), i = ls.findIndex(function (x) { return x.indexOf(heading) === 0; }), rowsOut = [];
    if (i < 0) return rowsOut;
    var j = i + 1; while (j < ls.length && !/^\|/.test(ls[j])) { if (/^###/.test(ls[j])) return rowsOut; j++; }
    j += 2; // header and separator
    for (; j < ls.length && /^\|/.test(ls[j]); j++) {
      var cells = ls[j].replace(/^\||\|\s*$/g, "").split(/(?<!\\)\|/).map(function (c) { return c.replace(/\\\|/g, "|").trim(); });
      if (cells.some(function (c) { return isPlaceholder(c); }) && cells.filter(Boolean).length <= 1) continue;
      rowsOut.push(cells);
    }
    return rowsOut;
  }
  function extract(secs, s, notes) {
    var got = [];
    function put(path, v) { if (v && !isPlaceholder(v)) { NS.setPath(s, path, v); got.push(path); } }
    var s1 = secs[1], s2 = secs[2], s3 = secs[3], s4 = secs[4], s5 = secs[5], s6 = secs[6], s8 = secs[8], s18 = secs[18];
    put("id.name", label(s1, "Name")); put("id.description", label(s1, "Description")); put("id.version", label(s1, "Version"));
    var st = label(s1, "Status"); if (st) { if (["Draft", "In Review", "Approved", "In Production", "Deprecated"].indexOf(st) >= 0) put("id.status", st); else notes.push("Status \"" + st.slice(0, 30) + "\" is not one of the template values; kept Draft"); }
    ["Effective Date", "Review Date"].forEach(function (lab, i) { var v = label(s1, lab); if (v) { if (NS.validISO(v)) put(i ? "id.reviewDate" : "id.effectiveDate", v); else notes.push(lab + " \"" + v.slice(0, 20) + "\" is not YYYY-MM-DD; left empty"); } });
    var bo = tableAfter(s2, "### 2.1"); if (bo[0]) { put("id.businessOwner", bo[0][0]); put("id.businessOwnerContact", bo[0][2]); put("id.ownerGoal", bo[0][3]); }
    put("id.airmLiaison", label(s2, "Responsible Person/Team"));
    var lv = function (k) { var m = new RegExp("^- " + k + ": (.*)$", "m").exec(s2 || ""); return m && !isPlaceholder(m[1]) ? m[1].trim() : ""; };
    put("id.l0", lv("Level 0")); put("id.l1", lv("Level 1")); put("id.ln", lv("Level N"));
    put("q.delegation", label(s3, "Delegation Statement"));
    put("q.inScope", bulletsAfter(s3, "**In Scope").join("\n")); put("q.outOfScope", bulletsAfter(s3, "**Out of Scope").join("\n"));
    var im = label(s3, "Integration Model"); if (["Assistant", "Collaborator", "Specialist"].indexOf(im) >= 0) put("team.integration", im);
    put("q.intentName", label(s4, "Intent Name")); put("q.outcome", label(s4, "Mandate Statement"));
    put("q.objective", after(s4, "**Business Objective Alignment:**").join(" ")); put("q.successCriteria", after(s4, "**Success Criteria:**").join(" "));
    put("q.actions", tableAfter(s5, "### 5.1").map(function (r) { return [r[1], r[2], r[3], r[4]].map(function (c) { return c || ""; }).join(" | "); }).filter(function (x) { return x.replace(/[|\s]/g, ""); }).join("\n"));
    put("q.prohibited", bulletsAfter(s5, "### 5.2").join("\n"));
    put("q.tools", tableAfter(s5, "### 5.3").map(function (r) { return r.join(" | "); }).join("\n"));
    put("data.sources", tableAfter(s6, "### 6.1").map(function (r) { return r.join(" | "); }).join("\n"));
    put("data.prohibitedData", bulletsAfter(s6, "**Prohibited Data:**").join("\n"));
    var sel = label(s8, "Selected"); if (sel === "Owner Authority" || sel === "Invoker Authority") put("q.authorityType", sel);
    put("q.authorityWhy", label(s8, "Justification"));
    var sig = function (k) { var m = new RegExp("^- " + k + ": (.*?)( \\(if required\\))?$", "m").exec(s18 || ""); return m && !isPlaceholder(m[1]) ? m[1].trim() : ""; };
    put("pkg.signBO", sig("Business Owner")); put("pkg.signAIRM", sig("AI Resource Management")); put("pkg.signCO", sig("Compliance Officer"));
    return got;
  }

  /* ---------- line diff (LCS) with a size guard ---------- */
  IO.diff = function (a, b) {
    var A = nl(a).split("\n"), B = nl(b).split("\n"), pre = 0, suf = 0;
    while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
    while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
    var a2 = A.slice(pre, A.length - suf), b2 = B.slice(pre, B.length - suf), ops = [];
    A.slice(0, pre).forEach(function (x) { ops.push([" ", x]); });
    if (a2.length * b2.length > 2500000) {
      a2.forEach(function (x) { ops.push(["-", x]); }); b2.forEach(function (x) { ops.push(["+", x]); });
      ops.coarse = true;
    } else {
      var n = a2.length, m = b2.length, L = [];
      for (var i = 0; i <= n; i++) L.push(new Uint32Array(m + 1));
      for (var x = n - 1; x >= 0; x--) for (var y = m - 1; y >= 0; y--) L[x][y] = a2[x] === b2[y] ? L[x + 1][y + 1] + 1 : Math.max(L[x + 1][y], L[x][y + 1]);
      var p = 0, q = 0;
      while (p < n && q < m) { if (a2[p] === b2[q]) { ops.push([" ", a2[p]]); p++; q++; } else if (L[p + 1][q] >= L[p][q + 1]) { ops.push(["-", a2[p]]); p++; } else { ops.push(["+", b2[q]]); q++; } }
      while (p < n) ops.push(["-", a2[p++]]); while (q < m) ops.push(["+", b2[q++]]);
    }
    A.slice(A.length - suf).forEach(function (x) { ops.push([" ", x]); });
    return ops;
  };

  /* ---------- import ---------- */
  var STATUS = { same: "matches the form", edited: "kept as an edited section", missing: "not in the file" };
  IO.importPackage = function (text, current) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) throw new Error("the package is empty");
    var notes = [], embedded = false, s = null;
    var found0 = IO.findStateComment(raw), m = found0.match;
    if (found0.note) notes.push(found0.note);
    var body = m ? raw.slice(0, m.index) + raw.slice(m.index + m[0].length) : raw;
    var parsed = IO.parseSections(body);
    if (m) {
      try {
        var sn = [], cand = NS.sanitize(JSON.parse(b64decode(m[2])), sn);
        var fileSec1 = parsed.sections[1] === undefined ? null : normSec(parsed.sections[1]);
        var nameLine = normSec(NS.escComments("**Name:** " + NS.ph(cand.id.name, "persona name")));
        var candSec1 = normSec(NS.escComments(NS.t(cand.overrides[1]) ? cand.overrides[1] : NS.genSection(1, cand, NS.computeTier(cand).effective)));
        if (fileSec1 === null || (fileSec1.indexOf(nameLine) < 0 && fileSec1 !== candSec1))
          throw new Error("its persona name does not match the name in Section 1");
        s = cand; embedded = true;
        if (sn.length) notes.push("Embedded state: " + sn.length + " value(s) reset (" + sn.slice(0, 3).join("; ") + ")");
      }
      catch (e) { notes.push("The embedded state comment was refused (" + e.message + "); the fields were read from the text instead"); s = null; }
    }
    notes = notes.concat(parsed.notes);
    var found = Object.keys(parsed.sections).length;
    if (!found) throw new Error("no numbered sections found (expected headings like \"## 1. AI Persona Identification\")");
    var extracted = [];
    if (!s) { s = NS.blankState(); extracted = extract(parsed.sections, s, notes); notes.push("Tier scores are not part of the package text; score the four dimensions in step 2"); }
    if (!embedded) { s.step = current ? current.step : 0; s.tab = "roundtrip"; }
    var T = NS.computeTier(s).effective, report = [];
    NS.SECTIONS.forEach(function (sec) {
      var n = sec[0], imp = parsed.sections[n];
      var fromFields = NS.genSection(n, (function () { var c = NS.clone(s); c.overrides = {}; return c; })(), T);
      if (imp === undefined) { report.push({ n: n, title: sec[1], status: "missing" }); return; }
      if (parsed.titles[n] && parsed.titles[n] !== sec[1]) notes.push("Section " + n + " is titled \"" + parsed.titles[n].slice(0, 60) + "\" in the file; the template calls it \"" + sec[1] + "\"");
      var cur = NS.escComments(NS.t(s.overrides[n]) ? s.overrides[n] : fromFields);
      if (normSec(imp) === normSec(cur)) { report.push({ n: n, title: sec[1], status: "same", diff: NS.t(s.overrides[n]) ? IO.diff(fromFields, imp) : null }); return; }
      s.overrides[n] = normSec(imp);
      if (!NS.t(s.overrides[n])) delete s.overrides[n];
      report.push({ n: n, title: sec[1], status: "edited", diff: IO.diff(fromFields, imp) });
    });
    var edited = report.filter(function (r) { return r.status === "edited"; }).length, missing = report.filter(function (r) { return r.status === "missing"; }).length;
    var summary = found + " of 19 sections read · " + edited + " kept as edited" + (missing ? " · " + missing + " not in the file" : "") + (embedded ? " · state restored from the embedded comment" : " · " + extracted.length + " fields read from the text");
    var rep = { embedded: embedded, summary: summary, notes: notes, sections: report, extracted: extracted };
    rep.reportMd = IO.reportMd(rep, s);
    return { state: s, report: rep };
  };
  IO.reportMd = function (rep, s) {
    var out = ["# Import Diff: " + (NS.t(s.id.name) || "[persona name]"), ""];
    if (s.example) out.push("> " + NS.EXAMPLE_LINE + ".", "");
    out.push("> " + rep.summary + ". Diffs compare the section as the form would write it (-) with the section in the file (+).", "");
    if (rep.notes.length) { out.push("## Notes", ""); rep.notes.forEach(function (n) { out.push("- " + n); }); out.push(""); }
    out.push("## Sections", "", NS.table(["Section", "Status"], rep.sections.map(function (r) { return [r.n + ". " + r.title, STATUS[r.status]]; })), "");
    rep.sections.filter(function (r) { return r.diff; }).forEach(function (r) {
      out.push("### Section " + r.n + ". " + r.title, "", "````diff", r.diff.filter(function (o) { return o[0] !== " "; }).slice(0, 400).map(function (o) { return o[0] + " " + o[1]; }).join("\n"), "````", "");
    });
    return out.join("\n") + "\n";
  };
  IO.reportHTML = function (rep) {
    var esc = NS.esc;
    var h = '<p class="mono" role="status">' + esc(rep.summary) + "</p>";
    if (rep.notes.length) h += '<ul class="findings">' + rep.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    h += '<table class="score"><caption class="sr">Sections in the imported package</caption><thead><tr><th scope="col">Section</th><th scope="col">Status</th></tr></thead><tbody>' +
      rep.sections.map(function (r) { return "<tr><td>" + r.n + ". " + esc(r.title) + '</td><td><span class="badge ' + (r.status === "same" ? "ok" : r.status === "edited" ? "edited" : "miss") + '">' + STATUS[r.status] + "</span></td></tr>"; }).join("") + "</tbody></table>";
    var withDiff = rep.sections.filter(function (r) { return r.diff; });
    if (withDiff.length) h += '<p class="src">Each diff compares the section as the form would write it from your answers (lines marked "-") with the section in the file (lines marked "+").</p>';
    withDiff.forEach(function (r) {
      var shownOps = r.diff.length > 1500 ? r.diff.slice(0, 1500) : r.diff;
      h += '<details class="sec"><summary><span class="no">' + r.n + '</span><span class="st">' + esc(r.title) + '</span></summary><pre class="out diff" tabindex="0" aria-label="Diff for section ' + r.n + '">' +
        shownOps.map(function (o) { return '<span class="' + (o[0] === "+" ? "add" : o[0] === "-" ? "del" : "ctx") + '">' + (o[0] === " " ? "  " : o[0] + " ") + esc(o[1]) + "</span>"; }).join("\n") +
        (r.diff.length > shownOps.length ? "\n[" + (r.diff.length - shownOps.length) + " more lines; download the import diff for the rest]" : "") + (r.diff.coarse ? "\n[Section too large for a line-by-line match; shown as removed then added]" : "") + "</pre></details>";
    });
    return h;
  };

  /* ---------- markdown to HTML (print view) ---------- */
  function inline(s) {
    return String(s).split(/(`[^`]*`)/).map(function (part) {
      if (/^`[^`]*`$/.test(part)) return "<code>" + NS.esc(part.slice(1, -1)) + "</code>";
      return NS.esc(part).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,;:])/g, "$1<em>$2</em>");
    }).join("");
  }
  function splitRow(ln) { return ln.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map(function (c) { return c.replace(/\\\|/g, "|").trim(); }); }
  IO.mdToHTML = function (md) {
    var ls = nl(md).split("\n"), out = [], i = 0;
    function para(buf) { if (buf.length) out.push("<p>" + buf.map(inline).join(" ") + "</p>"); }
    while (i < ls.length) {
      var ln = ls[i];
      if (/^<!--/.test(ln)) {
        var close = -1; for (var c2 = i; c2 < ls.length; c2++) if (ls[c2].indexOf("-->") >= 0) { close = c2; break; }
        if (close >= 0) { i = close + 1; continue; }
        out.push("<p>" + inline(ln) + "</p>"); i++; continue; // an unmatched comment opener prints as text
      }
      var fence = /^(`{3,})/.exec(ln);
      if (fence) { var code = []; i++; while (i < ls.length && ls[i].indexOf(fence[1]) !== 0) code.push(ls[i++]); i++; out.push("<pre>" + NS.esc(code.join("\n")) + "</pre>"); continue; }
      var hm = /^(#{1,4}) (.*)$/.exec(ln);
      if (hm) { var lvl = hm[1].length; out.push("<h" + lvl + ">" + inline(hm[2]) + "</h" + lvl + ">"); i++; continue; }
      if (/^---\s*$/.test(ln)) { out.push("<hr>"); i++; continue; }
      if (/^>/.test(ln)) { var q = []; while (i < ls.length && /^>/.test(ls[i])) q.push(ls[i++].replace(/^>\s?/, "")); out.push("<blockquote><p>" + q.filter(Boolean).map(inline).join(" ") + "</p></blockquote>"); continue; }
      if (/^\|/.test(ln) && i + 1 < ls.length && /^\|[\s:|-]+\|?\s*$/.test(ls[i + 1])) {
        var head = splitRow(ln), body = []; i += 2;
        while (i < ls.length && /^\|/.test(ls[i])) body.push(splitRow(ls[i++]));
        out.push("<table><thead><tr>" + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          body.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>");
        continue;
      }
      if (/^\s*(- |\d+\. )/.test(ln)) {
        var ordered = /^\s*\d+\. /.test(ln), items = [];
        while (i < ls.length && /^\s*(- |\d+\. )/.test(ls[i])) {
          var depth = /^(\s*)/.exec(ls[i])[1].length >= 2 ? 1 : 0, txt = ls[i].replace(/^\s*(- |\d+\. )/, "");
          var box = /^\[( |x)\] /.exec(txt), mark = box ? (box[1] === "x" ? "&#9746; " : "&#9744; ") : "";
          items.push('<li class="d' + depth + '">' + mark + inline(box ? txt.slice(4) : txt) + "</li>"); i++;
        }
        out.push((ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>"));
        continue;
      }
      if (!ln.trim()) { i++; continue; }
      var buf = [];
      while (i < ls.length && ls[i].trim() && !/^(#{1,4} |---\s*$|>|\||\s*- |\s*\d+\. |`{3,}|<!--)/.test(ls[i])) buf.push(ls[i++]);
      if (!buf.length) { buf.push(ls[i++]); }
      para(buf);
    }
    return out.join("\n");
  };
  IO.printHTML = function (s) {
    var t = NS.t, esc = NS.esc, T = NS.computeTier(s).effective;
    var md = NS.genPackage(s).replace(/^# .*\n/, "");
    var rowsSig = [["Business Owner", s.pkg.signBO, true], ["AI Resource Management", s.pkg.signAIRM, true], ["Compliance Officer", s.pkg.signCO, T >= 3]];
    var sign = '<section class="signoff"><h2>Sign-off</h2><p>Tier ' + T + " (" + esc(NS.TIER_LABEL[T]) + "). " +
      (T >= 3 ? "Business Owner, AI Resource Management and Compliance Officer sign." : "Business Owner signs and AI Resource Management acknowledges; Compliance Officer if required.") + "</p>" +
      '<table class="sig"><thead><tr><th>Role</th><th>Name</th><th>Signature</th><th>Date</th></tr></thead><tbody>' +
      rowsSig.map(function (r) { return "<tr><td>" + esc(r[0]) + (r[2] ? "" : " <em>(if required)</em>") + "</td><td>" + (NS.signed(r[1]) ? esc(t(r[1])) : "&nbsp;") + "</td><td class=\"line\">&nbsp;</td><td class=\"line\">&nbsp;</td></tr>"; }).join("") +
      "</tbody></table><p class=\"mono\">Section 18 of the AI Persona Definition Template. Version " + esc(t(s.id.version) || "[version]") + ", status " + esc(t(s.id.status) || "[status]") + ".</p></section>";
    return '<header class="print-head"><p class="mono">Dinand Tinholt · Research · Persona Forge</p><h1>AI Persona Definition: ' + esc(t(s.id.name) || "[persona name]") + "</h1>" +
      '<p class="mono">Version ' + esc(t(s.id.version) || "[version]") + " · " + esc(t(s.id.status) || "[status]") + " · Tier " + T + " · Effective " + esc(t(s.id.effectiveDate) || "[date]") + " · Printed " + NS.isoDate(new Date()) + "</p></header>" +
      IO.mdToHTML(md) + sign;
  };

  /* ---------- the whole set as a zip ---------- */
  IO.buildFiles = function (s) {
    var base = NS.slug(s.id.name), files = [
      { name: base + "/persona-definition.md", data: IO.packageWithState(s) },
      { name: base + "/sop.yaml", data: NS.genSOP(s) },
      { name: base + "/measurement-blueprint.md", data: NS.genBlueprint(s) },
      { name: base + "/delegation-checklist.md", data: NS.genChecklist(s) },
      { name: base + "/vanilla-dry-run-pack.md", data: NS.genDryRunMd(s) }
    ];
    NS.MODEL_TIERS.forEach(function (m) { files.push({ name: base + "/vanilla-agent-log-" + m[0] + ".md", data: NS.genLog(s, m[0]) }); });
    files.push({ name: base + "/readiness-report.md", data: NS.check.readinessMd(s) });
    if (s.handoff.enabled) {
      files.push({ name: base + "/handoff-register.md", data: NS.genHandoff(s) });
      files.push({ name: base + "/second-persona-state.json", data: JSON.stringify(NS.mirrorState(s), null, 2) + "\n" });
    }
    files.push({ name: base + "/persona-forge-state.json", data: JSON.stringify(s, null, 2) + "\n" });
    return files;
  };
  IO.buildZip = function (s, when) {
    var files = IO.buildFiles(s);
    return { bytes: IO.zip(files, when), name: NS.slug(s.id.name) + "-delegation-package.zip", files: files };
  };
})();
