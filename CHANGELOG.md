# Changelog

## 0.1.0, 11 October 2026: first public release

The builder as it stood after the second independent check, published under Apache-2.0 with the smoke and stress tests and a CI workflow. No code changes from the lab build.

## Second independent check (10 Oct 2026)

1. Example ids and other id lookups use `Object.hasOwn`. An unknown or prototype-named id such as `#example=constructor` gives a blank draft with a notice instead of a broken page.
2. The state comment counts only as the last HTML comment, after the "End of AI Persona Definition" line, with a known version and a persona name that matches Section 1. A forged comment placed first or inside a section is read as text.
3. `<!--` in user text is escaped with a zero-width space in every markdown output. The print renderer prints an unmatched comment opener as text instead of skipping the rest of the document.
4. `#example` with a saved draft asks before replacing it. After a yes, autosave stays off until the user edits, so the saved draft survives a look at the example.
5. A dry run passes only with all six criteria plus a date, a trace reference and an evidence line; six ticks without them read "incomplete record".
6. A sign-off counts only with at least two words of letters and no placeholder token (pending, tbd, n/a, awaiting, x, -).
7. Pasted package text clears on example load and JSON import.
8. Override keys must be the plain integers 1 to 19; "04", "4.0", "0x4" and the like are refused with a note.
9. The stress harness loads only over http after a HEAD request finds the file, never from a hash alone. `tests/stress.sh` now serves the folder locally.
10. Tier readout reads "All 19 sections required; typical effort 3 to 5 days." (Tier 1 and 2 follow the same pattern.)
11. Rule quotes in forge-check.js are verbatim template or notes text (smoke compares them with the reference set when `REF_DIR` is set); the escalation SLA rule is marked "Paraphrase of the rule". EXPERIMENT-PAGE no longer uses three-item lists.

Checks: 144 on every load plus 5 live-page checks, 149 in all (was 131). Stress adds three markdown cases: forged comment first, forged comment inside a section, unclosed comment opener.

## Stress, review and elevate round (10 Oct 2026)

### What broke under stress (tests/stress.sh, before the fixes)

- **Crash on out-of-range values.** A stored or imported draft with `tier.override: "7"` threw `Cannot read properties of undefined (reading 'join')` and the page stopped rendering. A `step` of 99 would have done the same in the stepper. Fixed with a sanitiser that bounds `step` and `tab` and resets every radio, select and tier value that is not on its list.
- **Type confusion on import.** `"false"` as a string turned the cross-domain qualifier on. `overrides: "abc"` made sections render as single letters (`"abc"[1]`). Fixed: every imported value is coerced to the type of the blank value, overrides keep only sections 1 to 19 with text, and the import message lists what was reset.
- **Inherited keys in the merge.** The merge tested keys with `in`, so `constructor` and `__proto__` qualified. No global pollution got through in the test, but `constructor` became an own property of the draft. Fixed: own keys only, and `__proto__`, `constructor` and `prototype` are skipped.
- **Lone CR line endings.** Text pasted with classic Mac line endings collapsed into one line in every list and table. Fixed in `lines()` and table cells.
- **5 MB paste.** The dry-run tab took about 740 ms to render. Prompts now sit in collapsed blocks, any pane longer than 300,000 characters shows a shortened view with a note (Download and Copy keep the full text), and a draft over 1 MB re-renders after 600 ms with an "Updating…" note. Measured after the change: 842 ms for the slowest tab, under the 2 s line, so no chunking was added.
- **Empty file import** reported the raw parser message "Unexpected end of JSON input". It now says the file is empty.
- HTML and script payloads in every field rendered as text before and after; nothing executed.

### What the hostile review found

- Browser storage quota errors were reported as "storage unavailable". The message now names the draft size. A saved draft that cannot be parsed says so instead of starting blank without a word.
- "Start blank" left `#example` in the address, so a reload brought the example back, and the last import report stayed on screen. Both are cleared now.
- "Reset to generated" re-rendered the step and dropped keyboard focus to the page body. Focus now returns to the section's text area and a screen reader hears that the section follows the answers again.
- The worked example's review date used `setMonth(+6)`, which turns 31 August into 3 March. Month arithmetic now clamps at month end.
- Two file imports started in quick succession could finish in either order, and the slower one won. Only the most recent read is applied now.
- The "replace your draft?" confirmation only fired when the name or outcome had text. It now fires whenever any field differs from blank.
- Clearing a section's text area stored an empty override that did not survive a round trip. An empty edit now means "follow the answers".
- A sign-off that read "Name, pending" counted as signed in Section 18 and in the approval history. It no longer does.
- A double click on a Copy button could store "Copied" as the button's label. The original label is kept aside now.
- Download links were revoked after 500 ms, which can cut off a large zip on a slow disk. Now 1.5 s.
- The vanilla-agent log title used a colon where the template has an en dash. It follows the template now, and that deviation is gone from the README.
- Checked and found clean: no uncaught console errors on load (asserted in tests/smoke.sh), no keyboard traps, arrow keys and Home/End move between output tabs, verdicts and badges carry words as well as colour, diff lines carry `+` and `-` prefixes as well as colour, every form control has a label.

### Added

- Completeness meter per tier with the template's Tiered Completion Checklist applied live, and a "what blocks sign-off" list (Readiness tab, plus a one-line meter above the steps).
- Consistency checker across authority bound, escalation thresholds, measurement targets and tier, 21 rules, each finding quoting its rule and naming the reference file it comes from.
- Package import with round trip: a downloaded package carries its form state in a closing HTML comment; import restores it exactly, keeps hand edits as edited sections and shows a per-section diff against what the form would write.
- Second persona and cross-domain handoff (step 8): Cross-Domain SOP Register entry in the template's nine fields, the same handoff clause in both packages, a stub package and a starter state file for the second persona. A handoff into another Level 0 domain sets the cross-domain qualifier in the tier decision tree.
- "Download all (.zip)": package, SOP, blueprint, checklist, dry-run pack, three vanilla-agent logs, readiness report, handoff files when modelled, and the state JSON, written by an inline stored-entry zip writer with CRC-32.
- Three stored dry runs (frontier, mid, small), each with its own date, facilitator, trigger, six criteria, MCP trace, decision owner, follow-ups, next test date and evidence, each rendering a vanilla-agent log in the template format with pass / hold / not yet run and the Chapter 9 rule quoted.
- Print stylesheet and print view: the 19 sections, the tiered checklist and a sign-off block (Compliance Officer marked "if required" below Tier 3).
- Steps renumbered: Handoff is step 8, "Sections and sign-off" moved from 8 to 9; old `#step=8` links land on Handoff.
- The Tier 3 "12 test scenarios" finding is an info note (the pack has two cases by design), never a blocker.
- Two more worked examples: AP invoice exceptions (Tier 2) and a read-only weekly report drafter (Tier 1, Invoker Authority).
- `tests/smoke.sh` and `tests/stress.sh`.

### Checks

- Before: 18 console self-checks.
- After: 128 self-checks on every load (47 ms), plus 3 live-page checks under `#selftest` (hostile text rendered into every step, tab and the print view with nothing executed; quota message), 131 in all. `tests/smoke.sh` asserts all 131, no console errors, and unzips the page-built zip with `python3 -m zipfile`.
