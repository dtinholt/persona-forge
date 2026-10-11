# Persona Forge

Public source: https://github.com/dtinholt/persona-forge (Apache-2.0, first public release 11 October 2026).

Part of the lab's published work: https://dinand.com/research/

You answer the Three Questions of delegation (the outcome, the authority, the measurement) and the page writes the paperwork an AI Persona needs before it ships. It checks that paperwork against itself while you type.

What comes out is a delegation package: the 19-section AI Persona definition in markdown, an SOP skeleton in YAML, a 5-tier measurement blueprint, the delegation-package checklist with each of its eight items marked done, open or not applicable, and a vanilla-agent dry-run pack. A readiness view shows how many required sections each tier still lacks and what blocks sign-off. If you model a handoff to a second persona, you also get the Cross-Domain SOP Register entry and a stub package for the second persona.

## Why it exists

An AI Persona that acts for a business is a formally delegated responsibility. It needs the same paperwork as a human role: who owns the outcome, what it may decide and spend, when it must hand a case to a person, and how anyone will know it did the job. The AI-First Business Service Architecture methodology spells that paperwork out in templates. Filling them by hand is slow, and the sections drift apart. A $200K decision bound on a Tier 1 persona, or a measure with no type, can sit unnoticed in a finished document.

Persona Forge fills the templates from your answers and finds the places where sections disagree. It quotes the rule behind each finding and names the source file.

## Run it

Open `index.html` in a browser, or use the hosted copy at https://dinand.com/experiments/persona-forge/. There is no server and no build step. The page makes no network calls except for web fonts.

To try it, pick one of the three invented examples (Tier 1, 2 or 3) and change anything. Drafts stay in your browser. The page never calls a model.

URL shortcuts: `#example` (or `#example=supplier|ap|report`) loads a worked example. Add `&step=1..9` and `&tab=package|sop|blueprint|checklist|dryrun|readiness|handoff|roundtrip` to land on a view, and `&print` for the print view. `#selftest` runs the full self-check including the live-page checks. An unknown example id gives a blank draft with a notice. When a draft is saved in this browser, `#example` asks before replacing it and does not save over it until you edit.

## The steps

1. Three Questions, in the template's wording, with short forms (outcome, authority, measurement) as subtitles
2. Tier: the four risk dimensions, the $50K per-decision and cross-domain qualifiers, the decision tree trace, an optional raise
3. Authority style: LIST, PRINCIPLE, EXAMPLE or PROHIBITION, each with a template sentence you fill and edit
4. Escalation: the three Chapter 7 tiers with their SLAs, triggers and kill switch, plus editable suggestions for incident mappings (14.3), emergency changes (12.4) and the violation response (13.3), labelled "suggested; the template leaves this open" when left in place
5. Data contract: 6.1 to 6.3 and the Section 16 supply chain
6. SOP and measures, including "further measures" rows that each name one of the twelve measure types
7. Team, risk, lifecycle
8. Handoff: a second persona and the shared SOP between them
9. Sections and sign-off: all 19 sections pre-filled and editable, version and status, package evidence

An edited section stops following your answers until you press "Reset to generated".

## Features

**Completeness meter.** For each tier, how many required sections are complete, with the assigned tier marked. Below it, each open section with the missing items and the matching line from the template's Tiered Completion Checklist. A one-line meter sits above the steps at all times.

**What blocks sign-off.** Open required sections (Section 18 itself aside), every blocking consistency finding, the signatures still outstanding, and the vanilla-agent result per model tier as the release gate that follows sign-off. A sign-off counts only when it has at least two words of letters and no placeholder such as pending, tbd, n/a, awaiting, x or -.

**Consistency checker.** Each finding is a plain sentence, marked "blocks sign-off", "warning" or "note", with the rule quoted and its source file named. The rules:

| Finding | Severity | Rule from |
| --- | --- | --- |
| Authority text names a bound above $50K while the tier stays below 3 | blocks | Tier guide, decision tree step 2 |
| Authority text names a bound that differs from the financial authority field | warning | Tier guide, step 2 |
| Financial authority negative or not a number | blocks | Tier guide, step 2 |
| Decision Impact LOW with spend authority or write access | warning | Tier guide, scoring matrix |
| Lowest escalation amount sits above the decision bound | blocks | Chapter 7, Tier 2 Boundary Breach |
| A decision bound with no amount in any trigger or control point | warning | Chapter 7 |
| Incident mapped to an escalation tier with the wrong SLA | warning | Chapter 7 |
| Confidence threshold missing (Tier 2 and up) or out of range | warning | Template 7.1 |
| KPI target or SLA without a number | warning | Chapter 11; Tier 2 checklist |
| KPI fails a direct-measure test with no attribution set | warning (blocks at Tier 3) | Chapter 11 |
| Direct Attribution claimed for a KPI that fails a test | blocks | Chapter 11 |
| Further measure with no type, or a type outside the twelve | blocks | Chapter 11 |
| Further outcome measure with no numeric target | warning | Tier 2 checklist |
| Action both permitted and prohibited | blocks | Template 5.1 and 5.2 |
| Action listed twice | warning | Template 5.1 |
| Invoker Authority with nobody named to invoke | warning | Template 8.2 |
| Dates invalid, or review date on or before effective date | warning | Template 1.3 |
| Tier 3 with Full Deployment | warning | Chapter 9 risk classification |
| Tier 3: two dry-run cases (by design) against Chapter 9's 12 test scenarios | note | Chapter 9 |
| Handoff register entry missing fields | warning | cross-domain-sop-register.md |
| Status Approved or In Production with open sections | blocks | Template Section 18 and checklist |

**Dry runs.** Three prompts, labelled frontier, mid and small, hand a generic agent only the SOP and two cases. You run them on your own models and record each run: date, facilitator, trigger condition, the six criteria, MCP trace rows, decision owner, follow-up actions, next test date, evidence and notes. Each run renders a vanilla-agent log in the template format with the outcome pass, hold (naming the unmet criteria), incomplete record or not yet run, and the Chapter 9 rule quoted. A run passes only when all six criteria are ticked and the record has a date, a trace reference and at least one evidence line. Six ticks without those read "incomplete record". A run with no date, trace, notes, follow-ups, evidence or ticks reads "not yet run".

**Second persona and handoff.** Step 8 models one handoff: direction, which domain owns the shared SOP, SOP ID, MCP server, dependency ID, purpose, trigger, payload, collaboration archetype (Chapter 8), Vanilla-Agent status and Change Advisory Circle date. The Handoff tab writes the register entry in the template's nine fields, the handoff clause, and a stub package for the second persona with the same clause in its Section 9 and each persona in the other's Section 19.2. When the shared SOP is this persona's own, its Vanilla-Agent status is read from the dry runs. A handoff to a persona in another Level 0 domain sets the cross-domain qualifier, so the tier goes to 3.

**Download all (.zip).** One zip per draft: package (with state), SOP YAML, blueprint, checklist, dry-run pack, three vanilla-agent logs, readiness report, handoff register and second-persona starter state when modelled, and the state JSON. The writer is inline (about 60 lines): stored entries, no compression, CRC-32, UTF-8 names.

**Print.** "Print package" (or the browser's print) prints a document with a header, the 19 sections, the tiered checklist and a sign-off block on its own page: Business Owner, AI Resource Management and Compliance Officer, the last marked "if required" below Tier 3. A sign-off that does not count prints as a blank line.

## The round trip

"Download package" writes the markdown with the form state in a closing HTML comment. It is always the last comment in the file, after the "End of AI Persona Definition" line. Any `<!--` in your own text is written with a zero-width space so it cannot open a comment.

"Import package (.md)", or the Import tab, reads a package back. The page takes only the last comment, only after that line, only with a known version, and only when its persona name matches the name in Section 1. Otherwise it reads the fields from the text. When the comment is accepted, the state is restored exactly. A section edited by hand after download comes back as an edited section, and each section shows whether it matches the form, was kept as edited, or is missing. Edited sections get a line diff against what the form would write.

A package from elsewhere fills the fields the page can read (about 30, from Sections 1 to 6, 8 and 18) and keeps every section's text as written. Tier scores are not part of the package text, so score them again.

Export JSON and Import JSON move the full state between browsers. The state saves to `localStorage`, with every read and write wrapped in try/catch. A full or blocked storage says so, with the draft size when it is a quota error. Drafts from the first version (schema 1) load, with their shared run date copied into each run.

## The self-check

Every load runs 144 checks in about 65 ms and shows the result in the footer and as a table in the console. `PersonaForge.selfCheck()` reruns it. The groups: package, SOP, blueprint, checklist, dry runs, the three examples, the completeness meter and blockers, each consistency rule fired by a crafted state, the round trip (import(export(state)) deep-equals state for all three examples, a blank draft and a hostile draft), the zip (CRC-32 test vector, unzip and byte comparison, UTF-8 names, damaged-byte detection), the print view, escaping of hostile text in every rendered view, sanitising, dates, handoff, example ids (prototype names), the state comment (forged, misplaced, unknown version, name mismatch), comment escaping and the tier readout copy.

Opening the page with `#selftest` adds 5 live-page checks, 149 in all. Hostile text is rendered into every step, every tab, the import report and the print view of the real page, then the check waits to confirm that no script or handler ran. The others cover the quota message, pasted package text clearing on example load and JSON import, and `#example` over a saved draft.

## Run the tests

You need headless Chrome and `python3`. Point `CHROME` at the browser binary. On macOS the default is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

```sh
CHROME=/path/to/chrome sh tests/smoke.sh
CHROME=/path/to/chrome sh tests/stress.sh
```

`tests/smoke.sh` loads `index.html#selftest` in headless Chrome. It requires all 149 checks to pass and no uncaught console errors. Then it unzips the page-built zip with `python3 -m zipfile -t` and `-e`, checks the twelve file names, the state and the 19 headings, and loads the SOP with PyYAML when that is installed. It also loads `#example=constructor` (which must give a blank page with a notice) and confirms that `#stress` over `file://` does not load the harness. When `REF_DIR` points at a folder holding the methodology reference files, it checks that every rule quote in `forge-check.js` appears there verbatim. The script exits non-zero on any failure.

`tests/stress.sh` runs `tests/stress.js` inside headless Chrome. `stress.js` is browser code that needs the page, so it does not run under node on its own. The script serves the folder on a local port, because the page loads the harness only over http after a HEAD check finds the file, and it prints one line per case with timings. The cases are hostile and extreme drafts pushed through the import path, with every step and tab rendered: empty, 10x and 100x the supplier example, unicode, mixed line endings, HTML and script in every field, duplicate IDs, out-of-range and NaN values, wrong types, dates across DST and the year end, a 5 MB paste, malformed, prototype-polluting and deeply nested JSON, and seven hostile markdown packages, including a forged state comment placed first and one placed inside a section.

Both scripts run on every push and pull request through `.github/workflows/ci.yml`.

Timings from the last stress run (headless Chrome on the build laptop, layout forced inside the timer):

| Input | Main render | Slowest step | Slowest tab | Zip | Print view | Round trip |
| --- | --- | --- | --- | --- | --- | --- |
| Supplier example | 5 ms | 2 ms | 2 ms | 1 ms | 1 ms | 1 ms |
| 100x the example (1.4 MB) | 115 ms | 31 ms | 332 ms | 166 ms (9.5 MB zip) | 40 ms | 71 ms |
| 5 MB paste in one field | 44 ms | 455 ms | 842 ms | 1.33 s (111 MB zip) | 119 ms | 279 ms |

## Deliberate deviations from the templates

- Section 3.2 says "Performance Measures: (See Section 10 for details)". The template says "See Section 7", but its measures live in Section 10, so the builder points there.
- The SOP's `vanilla_agent_test_summary.result` and the log's Outcome can read "not yet run" or "incomplete record" as well as pass or hold, so a run that never happened, or one recorded without date, trace and evidence, claims no verdict.
- The log's Expected Behavior opens with the model tier the run used, since the template's Scenario Overview has no field for it. The six criteria appear as sub-items under Outcome.
- The review-cadence lines in 3.2 keep the template's placeholders (for example Weekly) until you fill them.
- The handoff clause and the "Rejected or failed handoff" escalation are builder additions inside Sections 9 and 19.2. The escalation line is labelled as a suggestion.

## Worked examples

There are three, one per tier path. All are invented and labelled "Worked example; values are illustrations" on every output.

- Supplier onboarding: Tier 3 through the cross-domain qualifier (decision tree step 3), with a handoff to a Finance vendor-master persona
- AP invoice exceptions: Tier 2 through MEDIUM scores (step 4), with a $5,000 bound per decision, below the $50K qualifier
- Weekly operations report drafter: Tier 1 (step 5), read-only, Invoker Authority

Their targets, IDs, cases and amounts are illustrations, and none of them is a measurement. Sign-offs read "pending", and dry-run records, scorecards and funding references stay empty on purpose, since filling them would claim work nobody did. Each example therefore shows Section 18 open and three runs "not yet run".

## Limits

- It never calls a model. You run the dry-run prompts on your own models and record the runs.
- The YAML reader covers only the subset the page writes.
- Import of a package from elsewhere reads about 30 fields. Everything else comes in as section text.
- The second persona gets a stub package only. Give it its own draft (the zip carries a starter state file) to fill its other sections.
- The zip does not compress. A 5 MB paste yields a zip above 100 MB, since the SOP text repeats across the package, the prompts and the logs.
- It does not write to a canonical model JSON or render diagrams.
- Chapter 9's own risk classification uses five factors. The tier here follows the Tier Selection Guide's four dimensions and two qualifiers, and Chapter 9 is quoted only for its Tier 3 release requirements.
- The four authority styles are wording styles under test in a registered lab study (October 2026, results not yet public). The builder offers them and recommends none, and the methodology templates do not name them.

## Sources

The AI-First Business Service Architecture reference set (templates and chapter notes): `AI-Persona-Definition-Template.md` (sections, tier markers, Tiered Completion Checklist), `AI-Persona-Tier-Selection-Guide.md` (scoring matrix, decision tree, $50K qualifier, tier times), `sop-schema.md`, `Measurement-Blueprint-Template.md`, `delegation-package-checklist.md`, `vanilla-agent-log.md`, `cross-domain-sop-register.md`, and the Chapter 6, 7, 8, 9 and 11 notes. The reference set is not part of this repository.

Numbers taken from the methodology: $50K per autonomous decision (tier guide); 4-hour, 1-hour and 15-minute escalation SLAs (Chapter 7); 8, 14 and 19 sections per tier (template); 12 test scenarios and a 10% to 50% to 100% staged rollout at Tier 3 (Chapter 9). All other numbers on the page belong to the invented examples.

More from the lab: https://dinand.com/research/

## Files

| path | what it is |
|---|---|
| `index.html` | the page, with the print stylesheet inline so the self-check can read it under `file://` |
| `forge.js` | state, generators, YAML writer and reader, stepper, outputs, events |
| `forge-check.js` | completeness meter, sign-off blockers, consistency rules |
| `forge-io.js` | zip writer and reader, package import and diff, print renderer |
| `forge-examples.js` | the three worked examples |
| `forge-selfcheck.js` | the self-check |
| `forge.css` | the styles, light and dark |
| `tests/` | `smoke.sh`, `stress.sh`, `stress.js` |
| `CHANGELOG.md` | what each round found and changed |

## Licence

Apache-2.0. See `LICENSE`.
