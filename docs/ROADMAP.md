# Roadmap — Deloitte AI Infra Studio

**Authoritative source:** `AI_Infra_Studio_Roadmap.docx` (Version 1.0, July 2026, Deloitte AI
Infrastructure Centre of Excellence — Internal, Living Document). This file is a
git-trackable text mirror of that document's substance, condensed for day-to-day engineering
reference. If the two ever disagree, the `.docx` is authoritative until this mirror is
re-synced — note the discrepancy in `PROJECT_STATE.md` when found.

**Companion:** [PROJECT_STATE.md](./PROJECT_STATE.md) tracks execution against this plan
session-by-session; [PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md) is the engineering-level
breakdown of the same work.

---

## 1. Executive summary

AI Infra Studio began as a sizing calculator: tokens, training time, inference capacity, a
costed BOM. The roadmap's thesis, from field research: it can become Deloitte's signature AI
infrastructure advisory asset — the thing a partner opens in the first client meeting, and
the reason a discovery conversation becomes a signed engagement. Three findings shape the
plan:

1. **Enterprises are sizing on guesswork.** GPU utilization in the 5-15% range and
   unpredictable inference bills are recurring, named CIO pain points — a credible, fast,
   independent sizing conversation is genuinely rare in the market.
2. **Vendor tools aren't neutral; rival consultancies haven't productized this.** NVIDIA,
   AMD, Dell, and cloud calculators all size toward their own hardware. No equivalent live,
   interactive, vendor-neutral instrument exists from Accenture, EY, or others.
3. **Visual and financial layers turn a calculator into a boardroom tool.** A data-center
   digital twin and a decision-grade financial cockpit are what separate a
   spreadsheet-replacement from a partner-level demo asset.

**What's genuinely new versus the v1 build:** tiered multi-layer BOM; a visual AI data
center digital twin; workload-aware sizing calibrated by COE delivery experience (not
invented formulas); a financial cockpit (scenario comparison, cost-per-token, carbon
accounting, financing comparison); a codebase/governance model built to sustain continuous
development.

## 2. Vision & positioning

**What the tool is for:** a demand-generation and credibility accelerator for the AI
Infrastructure COE — used live, in front of a client, to convert a vague infrastructure
question into a rigorous, defensible answer within minutes. Not sold as software; not a
substitute for the paid engagement's detailed low-level design.

**The non-negotiable test:** every feature is filtered through — *does it preserve the
tool's vendor-neutral, independent-advisor positioning?* Multi-vendor parity (NVIDIA/AMD
today, extensible) is a design constraint, not a feature. See
[DECISIONS.md — D1](./DECISIONS.md#d1).

**The three pillars this roadmap builds toward:**

| Pillar | What it is | Primarily serves |
|---|---|---|
| AI Data Center Digital Twin | Interactive visual of the proposed data center — rack layout, cluster topology, power/cooling flow, live what-if | Demo impact |
| Workload-Aware Sizing Engine | Sizing that adapts to RAG, fine-tuning, RLHF, agentic, multi-modal, reasoning workloads via COE-calibrated multipliers | Analytical rigor |
| Decision-Grade Financial Cockpit | Scenario comparison, sensitivity analysis, cost-per-token/inference, carbon accounting, CapEx/OpEx/GPU-aaS/colocation modeling | Rigor + board-level credibility |

## 3. Customer pain points this roadmap targets

| Pain point | Who feels it | Feature(s) that address it |
|---|---|---|
| Low GPU utilization / stranded capacity | Infra & platform teams | Digital twin cluster view; MFU-aware training sizing (existing); utilization what-if |
| Unpredictable inference/cloud bills | CIO/CFO, FinOps | Cost-per-token/inference model; scenario comparison; cloud-vs-on-prem sensitivity (existing) |
| Difficulty justifying AI infra capex to the board | CIO/CTO | ROI/payback modeling; CapEx vs OpEx vs GPU-aaS vs colocation; exportable business case |
| Power/cooling constraints, liquid-cooling uncertainty | Facilities, DC engineering | Rack/power/cooling layer in the digital twin; kW-per-rack, PUE-aware sizing |
| Data residency/sovereignty (BFSI, insurance, gov, Gulf/GCC) | CISO, compliance, legal | Sovereignty/placement flagging; on-prem vs sovereign-cloud framing |
| Sizing ignoring actual workload type | AI/ML engineering leads | Workload-aware sizing engine (Pillar B) |
| No independent second opinion | Procurement, CIO | Vendor-neutral multi-hardware sizing/BOM (existing, reinforced) |
| ESG/sustainability reporting pressure | Sustainability office, CFO | Carbon accounting layer |

## 4. Competitive positioning

Vendor calculators are technically deep but not neutral. Cloud pricing calculators are
strong on cloud cost but silent on on-prem/hybrid and workload-level sizing. Rival
consultancy accelerators have advisory narrative but no equivalent live, interactive,
sizing-to-BOM-to-TCO instrument.

**The defensible gap:** no market tool combines (1) genuine hardware neutrality, (2) live
interactivity in a client meeting, (3) workload-level sizing rigor, and (4) a costed,
exportable, branded deliverable the client keeps. **Guardrail:** sequence features that
strengthen this combination ahead of features that only deepen one dimension.

## 5. Guiding principles for continuous development

Treated as fixed constraints for every future feature, not suggestions (full detail and
rationale in [DECISIONS.md](./DECISIONS.md)):

- **Vendor neutrality by design** ([D1](./DECISIONS.md#d1))
- **Client data never leaves the browser** ([D2](./DECISIONS.md#d2))
- **Deterministic, sourced, versioned reference data** ([D8](./DECISIONS.md#d8)) — no feature
  ships with invented numbers presented as fact
- **Progressive enhancement** — new features extend the tool without breaking the four
  existing tabs, in every phase
- **Reversible, git-based development** ([D9](./DECISIONS.md#d9)) — currently **not yet
  executed**, see `PRODUCT_BACKLOG.md` item 1
- **Brand and quality consistency** — every new screen matches Deloitte visual identity, no
  exceptions for "quick" features
- **Honesty about precision** — every estimate says it's an estimate, including in
  impressive new visual/financial features

## 6. Phased implementation plan

Sequential, not parallel — the plan assumes single-developer capacity today, and each phase
assumes the previous phase's foundation is in place.

### Phase 0 — Foundation Hardening (blocking prerequisite)

| Workstream | Delivers |
|---|---|
| Version control | Git repo with clean commit history |
| Reproducible builds | `package-lock.json` committed; `.nvmrc` pinned; documented commands |
| Modular architecture | data/logic/component separation — required before Digital Twin / Financial Cockpit |
| Reference-data governance | Versioned constants module with `lastReviewed` per category |
| README & onboarding | Setup/contribution guide surviving a machine or developer change |

**Status: architecture, reproducible builds, reference-data governance, and README are
complete (shipped in v2.0). Git version control is the one Phase 0 item still not done** —
confirmed via direct filesystem check, no `.git` directory exists. See
`PRODUCT_BACKLOG.md` item 1.

### Phase 1 — Quick Wins (high impact, low-to-medium effort, builds on existing 4 tabs)

| Feature | Pain point solved | Demo vs rigor | Effort | Status |
|---|---|---|---|---|
| Tiered multi-layer BOM (Foundation/Standard/Enterprise) | Customers want options at their scale | Both | Medium | **Shipped v2.0** |
| Workload-type presets as input tags | Sizing ignoring workload type | Rigor | Low-Medium | **Shipped v2.0** (qualitative only, per [D4](./DECISIONS.md#d4)) |
| Cost-per-token / cost-per-inference metrics | Unpredictable inference bills | Both | Low | **Shipped v2.0** |
| Scenario comparison (2-3 configs side by side) | "Build on-prem or hybrid or cloud" on gut feel | Both | Medium | Open — `PRODUCT_BACKLOG.md` item 11 |
| CapEx vs OpEx vs GPU-aaS vs colocation table | Difficulty justifying capex to the board | Rigor | Medium | **Shipped v2.0** (as financing comparison) |
| Branded PDF export, tiered-BOM template | Client needs a deliverable to keep | Demo | Low | **Shipped v2.0** |
| Sensitivity sliders (MFU, users, precision) | Executives want live "what if" | Demo | Low-Medium | Open — `PRODUCT_BACKLOG.md` item 12 |

**Phase 1 exit criteria:** all four tabs still function; a live demo can pick a tier, compare
2-3 scenarios, see cost-per-token change live, export a branded tiered BOM; no feature
requires a backend. **Currently met except:** scenario comparison and sensitivity sliders are
still open.

### Phase 2 — Strategic Bets (high impact, high effort — the two flagship pillars)

**2A — AI Data Center Digital Twin (visual pillar).** A lightweight, browser-native
interactive diagram — not a full 3D engineering twin — of rack layout (GPU/CPU/storage
placement), cluster network topology, and power/cooling flow (kW-per-rack, PUE, live). A
what-if control (add nodes / change tier) updates layout, power draw, and cost together.
Scoped explicitly as *illustrative*, not a thermal/electrical simulation, to preserve the
honesty principle. Achievable without a backend via SVG/Canvas.

**2B — Workload-Aware Sizing Engine (rigor pillar).** Selecting a workload type changes
recommended infrastructure beyond GPU count — storage (vector DB for RAG), fabric needs
(agentic multi-step calls), concurrency headroom. **Critical caveat carried into this repo as
[D4](./DECISIONS.md#d4):** the sizing deltas are not standardized formulas; this phase builds
the framework only — the COE must supply and periodically validate real multipliers before
anything ships as client-facing fact.

**2C — Decision-Grade Financial Cockpit (rigor + board-level credibility).** Builds on
Phase 1's financing table: full sensitivity analysis (tornado-style view of which input
moves TCO most), carbon accounting (tCO2e from power draw, PUE-optimization suggestion), and
a board-pack-formatted business case export.

**Phase 2 exit criteria:** digital twin renders correctly for every tier and updates live;
workload multipliers are clearly labeled as COE-calibrated with a review date, never
presented as universal fact; financial cockpit outputs carry the same indicative-estimate
disclaimer used elsewhere.

### Phase 3 — Future & Optional (kept warm; revisit only on a real trigger)

| Candidate | Trigger to revisit |
|---|---|
| Reasoning/test-time-compute sizing module | When engagements start explicitly costing inference-time reasoning at material volume |
| Agentic AI infrastructure modeling | When agentic deployments move from pilot to production scale in the pipeline |
| Sovereign/multi-region placement engine | When a specific sovereignty-driven pursuit (Gulf/GCC, EU) needs it |
| Natural-language workload input | After Phase 2B is stable; NL input should map onto that structure, not precede it |
| Scenario save/versioning across engagements | Once re-entering inputs each time becomes real friction across concurrent pursuits |
| Optional backend for persistence | Only if scenario-save or multi-user collaboration becomes a hard requirement — a deliberate architecture change, see [D2](./DECISIONS.md#d2) |

These are deliberately unscheduled. Pulling one forward should be a conscious decision tied
to a real trigger, not roadmap drift.

## 7. Architecture evolution

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the current implementation detail. The
Roadmap's intended layer responsibilities:

| Layer | Responsibility | Grows to include |
|---|---|---|
| Reference data | Versioned constants: hardware, pricing, fabric/storage, tariffs | Workload multipliers, carbon factors, tier definitions |
| Calculation engine | Pure functions: token, training, inference, cost — no UI dependency | Workload-aware adjustments, sensitivity/tornado calc, carbon math |
| Visualization components | Presentational only: stat cards, tables, charts | Digital twin rendering, comparison dashboards |
| Tab/page components | Compose data + calculation + visualization per tab | New tabs for digital twin, financial cockpit |
| Shared design system | Colors, type, spacing, Deloitte branding primitives | Unchanged in principle — every new component consumes it |

## 8. Data, privacy & persistence stance

Client-side-only architecture is a deliberate trust feature, preserved through Phase 2 in
full — every feature, including the digital twin and financial cockpit, runs entirely in the
browser with no external transmission or storage. Scenario save/versioning (Phase 3) is the
only candidate that would require rethinking this — see [D2](./DECISIONS.md#d2) for the
preference order if that's ever pursued. This should be a named architecture decision when
Phase 3 is actually triggered, not an implicit side effect of a feature request.

## 9. Governance for continuous development

- **9.1 Release discipline:** every phase ends in a working, demoable state; simple semantic
  versioning (v1.0, v1.1, v2.0...); pre-demo checklist (production build, current reference
  data, disclaimers present, rehearsed walkthrough).
- **9.2 Reference-data review cadence:** every category carries a `lastReviewed` date;
  pricing-sensitive categories reviewed ahead of any major proposal and on a standing cycle.
- **9.3 Workload-multiplier ownership:** unlike vendor-sourced hardware specs, workload
  multipliers are Deloitte's own IP from delivery experience — need an explicit COE owner
  responsible for calibration, distinct from a routine data refresh.
- **9.4 Change-log discipline:** `PROJECT_STATE.md` updated at the end of every session; this
  roadmap updated at the end of every phase (features move planned → shipped; Phase 3
  candidates added as they surface).

## 10. Success metrics

Measured on business outcome, not feature count: number of discovery conversations the tool
was used in; conversion rate from tool-assisted discovery to signed engagement; time from
client question to first sizing answer in-meeting; partner/client qualitative feedback;
frequency of reference-data staleness caught before vs. during a client meeting.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Digital twin mistaken for engineering-grade simulation | Explicit "illustrative, not a thermal/electrical simulation" labeling |
| Workload multipliers ship as invented fact | Framework-first delivery (2B); COE ownership/sign-off required before client-facing |
| Feature growth erodes vendor-neutral positioning | §5 principle restated as a fixed constraint; decline/redesign requests that break parity |
| Single-developer bottleneck | Phase 0 git/README/reproducible-build work exists specifically to de-risk this |
| Reference data goes stale, caught by a client not by Deloitte | §9.2 review cadence; visible `lastReviewed` dates |
| Scope creep — Phase 3 pulled forward without a trigger | Phase 3 items require a named trigger before scheduling |

## 12. Closing note

Foundation before flagship features, framework before invented precision, honesty before
spectacle — every phase should make the tool more impressive and more trustworthy at the
same time, never one at the expense of the other.
