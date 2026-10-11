/* Persona Forge: three worked examples, one per tier path. All three are invented for demonstration.
   Names, IDs, targets and cases are illustrations, not measurements; sign-offs read "pending" and dry-run
   records, scorecards and funding references stay empty, since filling them would claim work nobody did.
   - supplier: supplier onboarding, Tier 3 through the cross-domain qualifier (decision tree step 3), with a handoff
   - ap: an accounts payable exception persona, Tier 2 through MEDIUM scores (step 4), $5,000 bound below the $50K qualifier
   - report: a read-only weekly report drafter, Tier 1 (step 5), Invoker Authority */
(function () {
  "use strict";
  var NS = window.PersonaForge;
  var LABELS = { supplier: "Supplier onboarding (Tier 3)", ap: "AP invoice exceptions (Tier 2)", report: "Weekly operations report (Tier 1)" };
  function dates() { var today = new Date(); return { today: NS.isoDate(today), review: NS.isoDate(NS.addMonths(today, 6)) }; }

  function supplier() {
    var d = dates(), s = NS.blankState();
    NS.merge(s, {
      id: { name: "Supplier Onboarding Verifier & Coordinator",
        description: "Checks new-supplier submissions for completeness, validates tax and bank details against registered sources, screens the supplier and its beneficial owners against sanctions lists, and routes decision-ready files to a Procurement approver. Creates vendor records in draft only.",
        version: "1.0", status: "Draft", effectiveDate: d.today, reviewDate: d.review,
        l0: "Procurement Service", l1: "Supplier Management", ln: "Supplier Onboarding",
        businessOwner: "Head of Procurement Operations", businessOwnerContact: "procurement-ops role mailbox", ownerGoal: "New suppliers ready to transact without added supplier risk",
        sopOwner: "Supplier Management Process Lead", airmLiaison: "AI RM Steward, Procurement portfolio", airmContact: "AI RM steward rota" },
      q: { delegation: "Delegate the verification and assembly of new-supplier onboarding files to the AI Persona, while Procurement keeps the approval decision and Finance keeps vendor activation.",
        intentName: "Decision-ready supplier files",
        outcome: "Every new-supplier request reaches a decision-ready onboarding file within 2 business days, with completeness, tax, bank and sanctions checks done and evidenced.",
        objective: "Shorten time to first order for new suppliers while keeping supplier risk controlled",
        successCriteria: "Approvers can decide from the file alone, with no rework requests to the supplier",
        inScope: "Check onboarding submissions for completeness\nValidate tax ID against the tax registry lookup\nVerify bank account ownership through the bank validation service\nScreen supplier and beneficial owners against the sanctions list\nRequest missing documents through portal template messages\nCreate a draft vendor record\nRoute complete files to the Procurement approver queue",
        outOfScope: "Approving or rejecting a supplier\nActivating a vendor record for payment\nSetting or changing payment terms\nClearing a sanctions hit or near-match\nOnboarding suppliers in restricted categories",
        rationale: "High volume of repetitive checks with clear rules and registered sources. Approvers spend their time chasing missing documents instead of judging supplier risk.",
        secondary: "Supplier status updates | Keep suppliers informed of what is missing | Medium | Supplier queries per onboarding",
        authorityType: "Owner Authority", authorityWhy: "The persona runs on every new submission without a human starting it, under standing authority from the Business Owner.",
        delegatedBy: "Head of Procurement Operations", invokers: "Not applicable (Owner Authority)", reviewCycle: "Monthly boundary audit",
        actions: "Read onboarding submission | Submission ID | Submission record and documents | No\nValidate tax ID | Tax ID, legal name | Registry match result | No\nValidate bank account ownership | Bank details, legal name | Ownership match result | No\nRun sanctions screen | Legal name, beneficial owners | Screen result with match scores | No\nSend missing-document request | Gap list, supplier contact | Portal template message | No\nCreate draft vendor record | Verified file | Draft vendor ID | No\nRoute file to approver queue | Complete file | Queue item | No",
        prohibited: "Approve, reject or activate a supplier\nEdit payment terms or bank details\nClear or suppress a sanctions match\nSend free-text messages to suppliers outside the approved templates\nRead employee personal data",
        tools: "Supplier portal | Read/Write | Read submissions; send template messages | Approved templates only\nTax registry lookup | Read-Only | Query by tax ID | Tax ID and legal name only\nBank validation service | Read-Only | Ownership check | No storage of full account numbers in logs\nSanctions screening service | Read-Only | Screen names | Results go to the file and the audit log\nERP vendor master | Write (draft) | Create draft vendor record | Draft status only; no activation",
        finLimit: "0", legal: "The organisation, through the Head of Procurement Operations",
        kpi: "% of new-supplier requests with a decision-ready file within 2 business days", kpiTarget: "90%", kpiCadence: "Weekly",
        cadPerf: "Weekly", cadBoundary: "Monthly", cadStrategic: "Quarterly", cadGov: "Annually",
        monitoring: "The Head of Procurement Operations reads the weekly KPI and override report; AI RM watches drift and escalation counts daily.",
        testAuthority: true, testHorizon: true, testCausality: true },
      tier: { industry: "MEDIUM", data: "MEDIUM", impact: "MEDIUM", geo: "MEDIUM", crossDomain: true, override: "" },
      auth: { style: "LIST", sentence: "" },
      esc: { t1Contact: "Supplier Management Process Lead", t2Contact: "AI RM Steward, Procurement portfolio", t3Contact: "AI RM on-call and the Head of Procurement Operations",
        triggers: "Any sanctions hit or near-match\nTax ID and legal name disagree\nBank account owner does not match the supplier\nSupplier in a restricted category\nConfidence below threshold on a document read",
        confidence: "0.85 on document extraction", overrideRoles: "Procurement approvers; Supplier Management Process Lead",
        killSwitch: "AI RM steward disables the persona's MCP credentials; open files return to the manual onboarding queue.",
        exceptions: "Data quality: incomplete submission → send missing-document request, no further checks\nSystem unavailability: registry or bank service down → mark check pending, retry, escalate Tier 1 after 4 hours\nAnomalies: duplicate supplier detected → route to approver with the duplicate flagged" },
      data: { sources: "Onboarding submissions | Supplier portal | Read-Only | Source of the request and documents\nTax registration | Tax registry lookup | Read-Only | Validate tax ID\nBank ownership | Bank validation service | Read-Only | Confirm account ownership\nSanctions lists | Sanctions screening service | Read-Only | Screen supplier and owners\nVendor master | ERP vendor master | Write (draft) | Create draft record and check duplicates",
        fields: "Supplier legal name\nTrading name\nTax ID\nRegistered address\nBeneficial owner names\nBank account ownership result (not the account number)\nSupplier category\nPrimary contact name and role mailbox\nDocument list and upload dates",
        timeWindow: "Current submission plus vendor master duplicates check", volume: "One submission per run", geoRestr: "US suppliers only in this release", anonymization: "Bank account numbers masked in logs",
        prohibitedData: "Full bank account numbers in logs or messages\nEmployee personal data\nSupplier pricing and contract terms\nData from suppliers in restricted categories",
        dqCompleteness: "All mandatory form fields populated", dqAge: "Registry and sanctions results from the same run", dqValidation: "Tax ID format check before registry lookup",
        downstream: "Procurement approver queue | Human | Decision-ready file | Per submission | Approve or reject\nERP vendor master | System | Draft vendor record | Per submission | Finance activation after approval\nAudit log | System | Step evidence | Per step | Audit and analytics",
        upContract: "Portal emits a submission event within 5 minutes of upload", downContract: "Complete files reach the approver queue within 2 business days of submission" },
      sop: { id: "SOP-PROC-SUP-001", title: "Supplier Onboarding Verification", version: "0.1", mcpEndpoint: "mcp://procurement/supplier-onboarding", environment: "test",
        trigger: "Supplier portal event supplier.submission.created, payload submission_id",
        inputs: "submission_id | Supplier portal | string | From the trigger payload\nonboarding form | Supplier portal | JSON | Mandatory fields per form version\ndocuments | Supplier portal | PDF | Tax form, bank letter, insurance certificate",
        steps: "Read the submission and list missing mandatory fields and documents | Gap list | Persona\nIf anything is missing, send the missing-document template and stop until resubmission | Message ID | Persona\nValidate tax ID and legal name against the tax registry | Registry result | Persona\nValidate bank account ownership | Ownership result | Persona\nScreen supplier and beneficial owners against sanctions lists | Screen result with scores | Persona\nIf any sanctions hit or near-match, route to Compliance review and stop | Escalation ID | Persona\nCreate a draft vendor record | Draft vendor ID | Persona\nRoute the complete file to the Procurement approver queue | Queue item ID | Persona",
        controlPoints: "Any sanctions hit or near-match goes to Compliance review; the persona never clears it\nTax or bank mismatch goes to the approver with the mismatch flagged\nVendor record stays in draft until a Procurement approver decides",
        compliance: "Sanctions screening evidence retained with the vendor record. Masked bank data in all logs.",
        payloadRequest: "submission_id\nsop_id\npersona_id\ncorrelation_id", payloadResponse: "status\nstep_results\nevidence_refs\nescalation_id", traceability: "Every step logs sop_id, step, MCP interaction ID and correlation_id to the audit log" },
      meas: { financial: "Procurement operating cost per supplier onboarded", costImpact: "Approver time per onboarding file", keyResult: "Median onboarding cycle time from 12 to 5 business days", krPeriod: "Quarterly", valueContribution: "Approver hours released from document chasing",
        sla: "Completeness check within 1 hour of submission", xla: "Procurement approvers rate files 4 of 5 or higher for decision readiness",
        leading: "% of submissions complete on first pass", lever: "Reminder cadence for missing documents", leverSetting: "Every 2 business days", leverAuthority: "Supplier Management Process Lead",
        risk: "Sanctions false negative: MEDIUM; every hit and near-match goes to Compliance", dq: "Tax registry unavailable over 4 hours: tax checks pause and files show pending",
        telemetry: "onboarding_step_completed, onboarding_escalated, file_routed", dashboards: "Weekly onboarding KPI board; escalation alerts to the AI RM channel",
        volume: "Submissions per day", volumeBand: "Within the approver team's weekly capacity", volumeTrigger: "Queue older than 2 business days pauses new reminders and alerts the SOP Owner",
        contributors: "AI Persona: completeness, tax, bank and sanctions checks; file assembly\nProcurement approvers: decision speed\nSuppliers: response time to document requests",
        attribution: "Experimental (A/B Testing)", experiment: "Staggered roll-out by supplier category; compare cycle time against categories still on the manual process.",
        dataReadiness: "Baseline cycle time from the manual process before go-live", sunset: "Re-scope when onboarding moves to a new portal or the KPI holds above target for two quarters" },
      team: { integration: "Specialist", integrationWhy: "It owns a narrow verification responsibility end to end and hands decisions to people.",
        who: "Procurement approver | Receives decision-ready files | Daily | Approve or reject\nSupplier Management Process Lead | Reviews escalations and the SOP | Weekly | Keep the SOP current\nCompliance analyst | Reviews sanctions matches | As raised | Clear or confirm matches",
        training: "Approvers learn to read the file's evidence section", channels: "Approver queue, escalation alerts, weekly KPI board", culture: "Approvers keep every decision; the persona removes chasing work. Run a two-week shadow period before go-live.",
        schedule: "Event-driven on each submission, business hours", onDemand: "Process Lead can re-run a file", blackout: "Quarter-end vendor master freeze",
        fairness: "Same checks for every supplier regardless of size or location within the US", transparency: "Every file shows which checks ran and their results\nReason codes on every escalation",
        dignity: "Suppliers can always reach a person through the portal", systemRules: "Never edits records owned by Finance\nRespects portal message frequency limits",
        consumes: "Tax registry lookup | Validate tax ID | Per submission | Tax ID, legal name | Registry availability\nBank validation service | Ownership check | Per submission | Bank details | Service availability\nSanctions screening service | Screen names | Per submission | Names | Service availability\nERP vendor master (Finance) | Draft record and duplicate check | Per submission | Vendor fields | ERP availability",
        provides: "Procurement approval | Decision-ready file | Per submission | File with evidence | Approval decision\nFinance accounts payable | Draft vendor record | Per approval | Vendor fields | Activation after approval",
        regulations: "Sanctions compliance obligations\nState privacy laws for supplier contact data", euAiAct: "Not in scope: US suppliers only in this release", dataClass: "Confidential",
        pia: "Scheduled before production", auditFreq: "Quarterly, internal audit", retention: "Decision logs and change history kept with the vendor record",
        rights: "Suppliers can ask for a person to review any request; approvers see every check's evidence",
        risks: "Accuracy | Sanctions near-match missed | L | H | All near-matches routed to Compliance\nOperational | Registry service outage | M | M | Pending status and Tier 1 escalation\nSecurity | Bank data exposed in logs | L | H | Masking and log review\nReputational | Supplier messages sound robotic or wrong | M | L | Approved templates only",
        deployment: "Pilot", rollout: "Shadow mode two weeks, then one supplier category, then all categories", modelType: "General-purpose language model behind the MCP server", retraining: "Re-run the vanilla-agent dry runs on every SOP or model change",
        scenario: "A fastener supplier submits a complete onboarding form with tax form, bank letter and insurance certificate. Registry and bank checks match. The sanctions screen returns no hit.",
        outcome17: "File reaches the approver queue the same day with all evidence attached.",
        caseA: "Submission SUB-1001 from Northfield Fasteners LLC (invented). All mandatory fields present. Documents: tax form, bank letter, insurance certificate. Tax registry: legal name and tax ID match. Bank validation: owner matches the legal name. Sanctions screen: no hits for the company or its two beneficial owners. Supplier category: industrial parts (not restricted).",
        caseB: "Submission SUB-1002 from Brightwater Components Ltd (invented). Insurance certificate missing. After resubmission the insurance certificate is present. Tax registry: match. Bank validation: owner matches. Sanctions screen: near-match, score 0.86, on beneficial owner name 'R. Castellano'. Supplier category: electronic components (not restricted).",
        related: "Purchase Request Triage persona (planned)", replaces: "Manual onboarding checklist run by approvers",
        references: "Procurement Level 1 service map\nSupplier onboarding BPMN (to be drawn)\nModel card from AI RM" },
      pkg: { signBO: "Head of Procurement Operations, pending", signAIRM: "AI RM Steward, pending", signCO: "Compliance Officer, pending",
        mcpRollback: "Disable the persona's MCP credentials; files return to the manual queue",
        scorecard: "", backlog: "PROC-201 persona, PROC-202 SOP, PROC-203 ERP integration", funding: "", vanillaLogId: "" }
    });
    s.id.effectiveDate = d.today; s.id.reviewDate = d.review;
    NS.merge(s, {
      meas: { extra: "Duplicate vendor records created | DATA_QUALITY_ISSUE_IMPACT | 0 per quarter | Quarterly\nApprover rework requests per file | KPI_OUTCOME | Below 0.2 per file | Monthly" },
      p2: { name: "Vendor Master Steward", description: "Keeps Finance's vendor master clean: checks draft vendor records against Finance rules and activates them after a Procurement approver decides.",
        l0: "Finance Service", l1: "Accounts Payable", ln: "Vendor Master", businessOwner: "Vendor Master Data Manager", sopOwner: "Vendor Master Process Lead", airmLiaison: "AI RM Steward, Finance portfolio" },
      handoff: { enabled: true, direction: NS.DIR_OUT, sopOwner: NS.OWN_OTHER, sopId: "SOP-FIN-VM-002", sopTitle: "Draft vendor record intake",
        mcpServer: "mcp://finance/vendor-master", depId: "DEP-PROC-FIN-01",
        purpose: "Create a draft vendor record from a verified onboarding file, held in draft until a Procurement approver decides",
        trigger: "Step 7 of SOP-PROC-SUP-001: verified file ready, payload submission_id plus the draft vendor fields",
        payload: "submission_id\nlegal_name\ntax_id\nregistered_address\nbank_ownership_result\ncorrelation_id",
        archetype: "Collaborator", vanilla: "", cacDate: "", cacAttendees: "", notes: "Borrower creates drafts only; activation stays with Finance." },
      pkg: { registerRow: "" }
    });
    s.example = true; s.exampleId = "supplier";
    return s;
  }

  function ap() {
    var d = dates(), s = NS.blankState();
    NS.merge(s, {
      id: { name: "AP Invoice Exception Resolver",
        description: "Works the accounts payable exception queue. Compares invoices that failed the three-way match with the purchase order and goods receipt lines on the match record, closes price and quantity differences inside a set tolerance, and routes the rest to an AP specialist with the evidence assembled.",
        version: "1.0", status: "Draft", effectiveDate: d.today, reviewDate: d.review,
        l0: "Finance Service", l1: "Accounts Payable", ln: "Invoice Exceptions",
        businessOwner: "Accounts Payable Manager", businessOwnerContact: "ap-ops role mailbox", ownerGoal: "Exceptions cleared before the payment run without paying more than agreed",
        sopOwner: "AP Process Lead", airmLiaison: "AI RM Steward, Finance portfolio", airmContact: "AI RM steward rota" },
      q: { delegation: "Delegate first-line resolution of invoice match exceptions to the AI Persona inside a price and quantity tolerance, while AP specialists keep every exception above tolerance and every supplier dispute.",
        intentName: "Exceptions resolved before the payment run",
        outcome: "Every invoice exception inside tolerance is closed or routed with evidence within 1 business day of entering the queue.",
        objective: "Pay suppliers on time without paying more than the agreed price",
        successCriteria: "AP specialists receive only above-tolerance exceptions, each with its evidence attached",
        inScope: "Read exceptions from the AP queue\nCompare invoice lines with PO and goods receipt lines on the match record\nClose price or quantity variances inside tolerance with a reason code\nRequest a corrected invoice through portal templates\nRoute above-tolerance exceptions to an AP specialist",
        outOfScope: "Releasing or rescheduling payments\nChanging supplier bank details\nAccepting any variance above tolerance\nSettling supplier disputes\nCreating or editing purchase orders",
        rationale: "Most exceptions are small, rule-bound differences. Specialists spend their day on them instead of the disputes that need judgement.",
        authorityType: "Owner Authority", authorityWhy: "The persona picks up each new exception without a person starting it, under standing authority from the Accounts Payable Manager.",
        delegatedBy: "Accounts Payable Manager", reviewCycle: "Monthly boundary audit",
        actions: "Read exception record | Exception ID | Invoice, PO and receipt lines | No\nCompare invoice with PO and goods receipt | Match record lines | Variance by line | No\nClose a variance inside tolerance | Variance, tolerance table | Exception closed with reason code | No\nRequest a corrected invoice | Variance, supplier contact | Portal template message | No\nRoute an exception to an AP specialist | Variance, evidence | Queue item | No",
        prohibited: "Release a payment or change a payment date\nChange supplier bank details\nClose a variance above tolerance\nCreate or edit purchase orders\nWrite free-text messages to suppliers outside the approved templates",
        tools: "ERP accounts payable | Read/Write | Read exceptions; close inside tolerance | Closure reason codes only\nERP three-way match record | Read-Only | Read invoice, PO and receipt lines | No edits\nSupplier portal | Write (templates) | Send template messages | Approved templates only",
        finLimit: "5000", legal: "The organisation, through the Accounts Payable Manager",
        kpi: "% of in-tolerance exceptions closed or routed within 1 business day", kpiTarget: "95%", kpiCadence: "Weekly",
        monitoring: "The Accounts Payable Manager reads the weekly KPI and override report; AI RM watches drift and escalation counts daily.",
        cadPerf: "Weekly", cadBoundary: "Monthly", cadStrategic: "Quarterly", cadGov: "Annually",
        testAuthority: true, testHorizon: true, testCausality: true },
      tier: { industry: "LOW", data: "MEDIUM", impact: "MEDIUM", geo: "LOW", crossDomain: false, override: "" },
      auth: { style: "PRINCIPLE", sentence: "" },
      esc: { t1Contact: "AP Process Lead", t2Contact: "AI RM Steward, Finance portfolio", t3Contact: "AI RM on-call and the Accounts Payable Manager",
        triggers: "Variance above $5,000 on any invoice\nSame invoice number twice from one supplier\nSupplier disputes the variance\nConfidence below threshold on a line match",
        confidence: "0.90 on line matching", overrideRoles: "AP specialists; AP Process Lead",
        killSwitch: "AI RM steward disables the persona's MCP credentials; the exception queue returns to AP specialists.",
        exceptions: "Data quality: goods receipt missing → mark pending, recheck next business day\nSystem unavailability: ERP down → stop and escalate Tier 1 after 4 hours\nAnomalies: duplicate invoice number → route to an AP specialist with the duplicate flagged" },
      data: { sources: "Exception queue | ERP accounts payable | Read/Write | Source of the work\nThree-way match record | ERP accounts payable | Read-Only | Invoice, PO and receipt lines\nTolerance table | AP policy table | Read-Only | Current tolerances\nSupplier contacts | Supplier portal | Read-Only | Template messages",
        fields: "Exception ID\nInvoice number and date\nInvoice line amounts and quantities\nPO number and line prices\nGoods receipt quantities\nSupplier ID and contact role mailbox\nTolerance by variance type",
        timeWindow: "Open exceptions, plus 12 months of invoices from the same supplier for the duplicate check", volume: "One exception per run",
        geoRestr: "Domestic entities only", anonymization: "Bank details never read",
        prohibitedData: "Supplier bank details\nEmployee personal data\nPayroll records",
        dqCompleteness: "Invoice, PO and receipt lines all present on the match record", dqAge: "Match record refreshed within the hour", dqValidation: "Invoice total equals the sum of its lines" },
      sop: { id: "SOP-FIN-AP-014", title: "Invoice Match Exception Handling", version: "0.1", mcpEndpoint: "mcp://finance/ap-exceptions", environment: "test",
        trigger: "ERP event ap.exception.created, payload exception_id",
        inputs: "exception_id | ERP accounts payable | string | From the trigger payload\nmatch record | ERP accounts payable | JSON | Invoice, PO and receipt lines\ntolerance table | AP policy table | JSON | Price and quantity tolerances",
        steps: "Read the exception and its match record | Match record snapshot | Persona\nIf the invoice number already exists for this supplier, route to an AP specialist and stop | Queue item ID | Persona\nCompute the variance for each line | Variance table | Persona\nIf any variance is above tolerance or above $5,000, route to an AP specialist and stop | Queue item ID | Persona\nIf a goods receipt is missing, mark pending and stop | Pending flag | Persona\nClose the exception with a reason code | Closure record | Persona",
        controlPoints: "Any variance above tolerance or above $5,000 goes to an AP specialist\nDuplicate invoice numbers always go to an AP specialist\nThe persona never changes payment dates or bank details",
        compliance: "Closure reason codes kept with the invoice for audit sampling.",
        payloadRequest: "exception_id\nsop_id\npersona_id\ncorrelation_id", payloadResponse: "status\nvariance_table\nclosure_code\nqueue_item_id", traceability: "Every step logs sop_id, step, MCP interaction ID and correlation_id" },
      meas: { financial: "Cost per invoice processed", costImpact: "Overpayments recovered after payment", keyResult: "Exceptions still open at the payment run from 18% to 5% of invoices", krPeriod: "Quarterly",
        valueContribution: "Specialist hours released from in-tolerance exceptions",
        sla: "Exception picked up within 30 minutes of creation", xla: "AP specialists rate routed exceptions 4 of 5 or higher for completeness",
        leading: "% of exceptions arriving with a complete match record", lever: "Tolerance per variance type", leverSetting: "Price 2%, quantity 1 unit", leverAuthority: "Accounts Payable Manager",
        risk: "Duplicate payment: MEDIUM; duplicate invoice numbers always routed", dq: "Goods receipt posted late: exceptions wait as pending",
        telemetry: "exception_closed, exception_routed, template_sent", dashboards: "Weekly AP exceptions board; escalation alerts to the AI RM channel",
        volume: "Exceptions per day", volumeBand: "Within the specialist team's daily capacity", volumeTrigger: "Queue older than 1 business day alerts the AP Process Lead",
        attribution: "Direct Attribution", dataReadiness: "Baseline from the manual queue before go-live", sunset: "Re-scope when the ERP match rules change",
        extra: "Overpayment value recovered | COST_IMPACT | Below $2,000 per quarter | Quarterly" },
      team: { integration: "Collaborator", integrationWhy: "It shares the exception queue with AP specialists and hands them every case that needs judgement.",
        who: "AP specialist | Receives routed exceptions | Daily | Resolve above-tolerance cases\nAP Process Lead | Reviews escalations and the SOP | Weekly | Keep the SOP current",
        training: "Specialists learn to read the variance table and reason codes", channels: "Exception queue, escalation alerts, weekly board",
        culture: "Specialists keep every judgement call; the persona clears the small differences first.",
        schedule: "Event-driven during business hours", onDemand: "AP Process Lead can re-run an exception", blackout: "The hour before the payment run cut-off",
        fairness: "Same tolerance for every supplier in a category", transparency: "Every closure carries a reason code\nRouted exceptions show the variance table",
        dignity: "Suppliers can reach an AP specialist through the portal", systemRules: "Never edits purchasing records\nRespects portal message limits",
        consumes: "ERP accounts payable | Exception queue and match record | Per exception | Invoice, PO and receipt lines | ERP availability\nAP policy table | Tolerances | Per exception | Tolerance rows | Table availability",
        provides: "AP specialists | Routed exceptions with evidence | Per exception | Variance table | Resolve above-tolerance cases",
        regulations: "Internal controls over financial reporting\nRecord retention rules for invoices", euAiAct: "Not in scope: domestic entities only", dataClass: "Confidential",
        pia: "Not required: no personal data beyond role mailboxes", auditFreq: "Quarterly, internal audit sample", retention: "Closure records kept with the invoice",
        rights: "Suppliers can ask a person to review any closure; specialists see the variance table",
        risks: "Accuracy | Wrong variance closed | L | M | Tolerance cap and weekly sample review\nOperational | ERP outage | M | M | Stop and Tier 1 escalation\nFinancial | Duplicate payment | L | H | Duplicate invoice numbers always routed",
        deployment: "Phased Rollout", rollout: "Shadow mode two weeks, then price variances only, then all variance types",
        modelType: "General-purpose language model behind the MCP server", retraining: "Re-run the vanilla-agent dry runs on every SOP or model change",
        caseA: "Exception EXC-2001 (invented). Invoice INV-77 from Harbor Office Supply, line 1: 10 units at $42.00. PO line: 10 units at $41.50. Goods receipt: 10 units. Tolerance: price 2%, quantity 1 unit. Invoice number not seen before.",
        caseB: "Exception EXC-2002 (invented). Invoice INV-91 from Northgate Industrial, line 1: 200 units at $61.00. PO line: 200 units at $35.00. Goods receipt: 200 units. Variance $5,200. Invoice number not seen before.",
        references: "Accounts Payable Level 1 service map\nAP tolerance policy" },
      pkg: { signBO: "Accounts Payable Manager, pending", signAIRM: "AI RM Steward, pending", mcpRollback: "Disable the persona's MCP credentials; the queue returns to AP specialists",
        backlog: "AP-310 persona, AP-311 SOP" }
    });
    s.example = true; s.exampleId = "ap";
    return s;
  }

  function report() {
    var d = dates(), s = NS.blankState();
    NS.merge(s, {
      id: { name: "Weekly Operations Report Drafter",
        description: "Drafts the weekly operations summary from the operations data mart for the Operations Manager, who edits and sends it. Reads aggregates only and takes no action of its own.",
        version: "1.0", status: "Draft", effectiveDate: d.today, reviewDate: d.review,
        l0: "Operations Service", l1: "Operations Reporting", ln: "Weekly Summary",
        businessOwner: "Operations Manager", businessOwnerContact: "ops-manager role mailbox", ownerGoal: "A weekly summary the team trusts, written in less time",
        sopOwner: "Operations Analyst", airmLiaison: "AI RM Steward, Operations portfolio", airmContact: "AI RM steward rota" },
      q: { delegation: "Delegate the first draft of the weekly operations summary to the AI Persona, while the Operations Manager keeps every edit and the decision to send.",
        intentName: "Weekly summary drafted",
        outcome: "A draft weekly operations summary, built only from data mart aggregates, is ready for the Operations Manager each Monday morning.",
        objective: "Keep the operations team informed with less manual reporting time",
        successCriteria: "The Operations Manager sends the draft with edits to wording only, no factual corrections",
        inScope: "Query weekly aggregates from the operations data mart\nCompare them with the previous four weeks\nDraft the summary in last week's format\nReturn the draft to the person who asked",
        outOfScope: "Sending the report to anyone\nReading record-level or personal data\nChanging data in any system\nRecommending staffing or spending changes",
        rationale: "The report follows the same structure every week and draws only on aggregates already in the data mart.",
        authorityType: "Invoker Authority", authorityWhy: "The persona runs only when the Operations Manager or a deputy asks for this week's draft.",
        delegatedBy: "Operations Manager (invoker)", invokers: "Operations Manager; Deputy Operations Manager", reviewCycle: "Quarterly",
        actions: "Query weekly aggregates | Week number | Aggregate table | No\nCompare with the previous four weeks | Aggregate tables | Change table | No\nDraft the weekly summary | Change table, last week's report | Draft text | No",
        prohibited: "Send or publish the report\nQuery record-level data\nWrite to any system\nAdd figures that are not in the data mart",
        tools: "Operations data mart | Read-Only | Query weekly aggregate views | Aggregate views only\nReport archive | Read-Only | Read last week's report for format | None",
        finLimit: "0", legal: "The Operations Manager, who sends the report",
        kpi: "% of weekly drafts sent with no factual corrections", kpiTarget: "90%", kpiCadence: "Monthly",
        testAuthority: true, testHorizon: true, testCausality: true },
      tier: { industry: "LOW", data: "LOW", impact: "LOW", geo: "LOW", crossDomain: false, override: "" },
      auth: { style: "LIST", sentence: "" },
      esc: { t1Contact: "Operations Analyst", triggers: "An aggregate view is missing or stale\nA weekly figure moves more than three times its usual range" },
      data: { sources: "Weekly aggregates | Operations data mart | Read-Only | Source of every figure\nLast week's report | Report archive | Read-Only | Format reference",
        timeWindow: "The last five weeks of aggregates", volume: "One week per run", geoRestr: "Single site", anonymization: "Aggregates only; no record-level data",
        prohibitedData: "Record-level operational data\nEmployee names or IDs\nCustomer data" },
      sop: { id: "SOP-OPS-RPT-003", title: "Weekly Operations Summary Draft", version: "0.1", mcpEndpoint: "mcp://operations/reporting", environment: "dev",
        trigger: "The Operations Manager asks for this week's draft, payload week_number",
        inputs: "week_number | Request | integer | From the invoker\nweekly aggregates | Operations data mart | table | Five weeks of aggregate views",
        steps: "Query the aggregate views for the requested week and the four before it | Query log | Persona\nIf any view is missing or older than the week end, stop and tell the invoker which one | Message to invoker | Persona\nBuild the change table against the four-week average | Change table | Persona\nDraft the summary in last week's format, using only figures from the change table | Draft text | Persona\nReturn the draft to the invoker | Draft returned | Persona",
        controlPoints: "Missing or stale views stop the run\nEvery figure in the draft must appear in the change table",
        payloadRequest: "week_number\nsop_id\ninvoker_id", payloadResponse: "status\ndraft_text\nchange_table", traceability: "Every step logs sop_id, step and MCP interaction ID" },
      team: { integration: "Assistant", integrationWhy: "It drafts; the Operations Manager edits and decides.",
        who: "Operations Manager | Asks for and edits the draft | Weekly | Send the summary",
        training: "None beyond reading the change table", channels: "Direct request and reply",
        caseA: "Week 41 (invented). All five aggregate views present and refreshed on Sunday. On-time shipments 94% against a four-week average of 92%. Open tickets 37 against an average of 41.",
        caseB: "Week 42 (invented). The on-time shipments view was last refreshed two weeks ago; the other views are current." },
      pkg: { signBO: "Operations Manager, pending", signAIRM: "AI RM Steward, pending" }
    });
    s.example = true; s.exampleId = "report";
    return s;
  }

  var MAKERS = { supplier: supplier, ap: ap, report: report };
  NS.examples = {
    ids: ["supplier", "ap", "report"],
    has: function (id) { return typeof id === "string" && Object.hasOwn(MAKERS, id); },
    label: function (id) { return typeof id === "string" && Object.hasOwn(LABELS, id) ? LABELS[id] : "unknown example"; },
    // An unknown or prototype-named id (e.g. "constructor") gives a blank draft, never a lookup on Object.prototype.
    get: function (id) { return NS.examples.has(id) ? MAKERS[id]() : NS.blankState(); }
  };
})();
