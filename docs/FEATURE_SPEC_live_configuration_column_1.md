# Feature Spec — "Your Configuration" Live Column (resolves Backlog #2 / DECISIONS.md D10)

**Author:** Sr Solution Architect review, Deloitte AI Infra Studio
**Date:** 2026-07-05
**Status:** Approved direction — ready for implementation
**Hand-off target:** Claude Code (execute against `infra-studio-v2/`)
**Companion docs in repo:** `ARCHITECTURE.md`, `DECISIONS.md` (D3, D10), `PRODUCT_BACKLOG.md` (#2, #8),
`ROADMAP.md` (§4, §5)

---

## 0. Read this first (Claude Code instructions)

This repo has a `CLAUDE.md` governing workflow. Follow it exactly:

1. Read `docs/PROJECT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` before writing
   any code.
2. **Do not start on this feature until Backlog #1 (git init) and #3 (test suite for
   `calc.js`/`tco.js`) are done.** This feature touches the sizing pipeline shared by both
   files — there is currently no safety net to confirm zero regression. If #1/#3 aren't done
   yet, do those first and stop for approval before continuing here.
3. Produce an implementation plan from this spec, wait for Sankar's approval, then implement,
   build, fix errors, update documentation, update `PROJECT_STATE.md`. Do not skip the
   documentation step.
4. Never commit automatically. Explain changes, list affected files, propose a commit
   message, wait for approval.

---

## 1. Decision record (drop-in resolution for `DECISIONS.md` D10)

```
## D10 — Fixed-tier sizing overrides live inference config in the BOM tab (byproduct of D3)
[... existing Context/Decision from D3 unchanged ...]

**Status:** RESOLVED 2026-07-05 — Hybrid approach adopted.
- The three fixed tiers (Foundation/Standard/Enterprise) are UNCHANGED and remain governed
  by D3. They continue to use tier-fixed `usersMid` values and are NOT wired to `shared`.
- A new 4th column, "Your Configuration," is added to TieredBomTab. It IS wired to `shared`
  and reflects whatever the consultant configured in InferenceTab, live.
- InferenceTab's copy is corrected to say it feeds the "Your Configuration" column
  specifically — not "the BOM & TCO tab" generically, which was the actual defect.

**Consequences:** D3's fixed-tier template is fully preserved (no risk to the Deloitte
PRODUCTION BOM template match). The credibility gap (InferenceTab claiming a carry-forward
that didn't exist) is closed by making the claim true for a clearly-labeled 4th column,
rather than by either overriding the fixed tiers or quietly weakening the UI promise.
```

---

## 2. Requirements

### 2.1 Functional
- `TieredBomTab` renders a 4th column, **"Your Configuration"**, alongside Foundation /
  Standard / Enterprise, using the *same* 7-layer matrix rendering (Training, Inference,
  Token Processing, Storage, Control Nodes, Network Fabric, Concurrent Users).
- The Your Configuration column sources its sizing inputs from `shared`
  (`inferGpu`, `inferGpus`, `aggregateTokPerSec`, plus token/model context needed — see §3.2)
  rather than a fixed `usersMid`.
- If `shared` does not yet have the fields this column needs (consultant hasn't visited
  Inference tab this session), the column renders a placeholder state:
  *"Configure the Inference tab to populate this column"* — not zeroes, not `NaN`, not a
  crash. This is a guardrail requirement, not optional polish (ties to Backlog #5).
- The vendor toggle (NVIDIA/AMD) recomputes the Your Configuration column exactly as it does
  the three fixed tiers — vendor neutrality (D1) applies to all 4 columns equally. No
  exceptions.
- Financing comparison (4-way), unit economics, and PDF export all include the 4th column
  when populated. When placeholder (unpopulated), the 4th column is either omitted from the
  PDF export or clearly marked "not configured" — do not export a blank/misleading column.
- `InferenceTab.jsx` copy updated: replace the current "flows into the BOM & TCO tab" claim
  with accurate wording, e.g. *"This configuration populates the 'Your Configuration' column
  on the BOM & TCO tab."*

### 2.2 Non-functional / guardrails (production-grade bar)
- No behavior change whatsoever to the three existing fixed tiers — same inputs must produce
  bit-identical outputs before/after this change. This is the regression test to write first.
- No new runtime dependency (D5 still applies).
- No network calls introduced (D2 still applies) — this is a pure client-side state-read
  feature.
- `shared` schema must be explicit (see §3.1) — this is also Backlog #8, and should be done
  as part of this feature rather than deferred again, since this feature is exactly the kind
  of cross-tab dependency #8 was written to protect against.

---

## 3. Technical design

### 3.1 `shared` schema (resolves Backlog #8, scoped to what this feature needs)

Add a documented shape (JSDoc typedef is sufficient — do not trigger a full TypeScript
migration for this; that's a separate, larger decision per Backlog #8's own risk note).

```js
// src/lib/sharedSchema.js  (new file)

/**
 * @typedef {Object} SharedState
 * @property {number} [effTokensT]        - from TokenTab
 * @property {string} [inferGpu]          - GPU model chosen in InferenceTab
 * @property {number} [inferGpus]         - GPU count computed by InferenceTab
 * @property {number} [aggregateTokPerSec]- peak output tok/s InferenceTab sized against
 * @property {string} [model]             - model name/id used in InferenceTab
 * @property {string} [precision]         - precision used in InferenceTab
 * @property {number} [contextWindow]     - ctx window used in InferenceTab
 * @property {number} [users]             - concurrent users configured in InferenceTab
 * @property {number} [reqPerUserHr]      - requests/user/hr configured in InferenceTab
 * @property {number} [peakFactor]        - peak-to-average factor configured in InferenceTab
 * @property {number} [utilization]       - avg utilization configured in InferenceTab
 */

/** Fields required to render the "Your Configuration" BOM column. */
export const LIVE_CONFIG_REQUIRED_KEYS = [
  "inferGpu", "inferGpus", "aggregateTokPerSec", "model", "precision", "users",
];

/** @param {SharedState} shared */
export function isLiveConfigReady(shared) {
  return LIVE_CONFIG_REQUIRED_KEYS.every((k) => shared?.[k] != null);
}
```

`InferenceTab.jsx` must be audited to confirm it actually writes all of
`LIVE_CONFIG_REQUIRED_KEYS` into `shared` — if any are missing today, add them there (do not
invent substitute values in `TieredBomTab`).

### 3.2 Refactor `computeTier` to accept a generic sizing input

Current (per `ARCHITECTURE.md`): `TieredBomTab` loops fixed `TIERS` and calls something like
`computeTier(tier, vendor)` internally, which pulls `tier.usersMid` etc.

Target shape — decouple "where the sizing input comes from" from "how a tier is computed":

```js
// src/tabs/TieredBomTab.jsx (conceptual, not literal diff)

function computeTierFromInput(sizingInput, vendor) {
  // sizingInput: { users, reqPerUserHr, peakFactor, outTok, model, precision, gpuOverride? }
  // identical body to today's computeTier — just no longer reaches into `tier.*` directly
}

function tierToSizingInput(tier) {
  // adapter for the 3 fixed tiers — preserves exact current behavior
  return { users: tier.usersMid, reqPerUserHr: tier.reqPerUserHr, /* ...unchanged... */ };
}

function sharedToSizingInput(shared) {
  // adapter for the live column
  return {
    users: shared.users,
    reqPerUserHr: shared.reqPerUserHr,
    peakFactor: shared.peakFactor,
    model: shared.model,
    precision: shared.precision,
    // gpu count/throughput can be taken directly from shared.inferGpus /
    // shared.aggregateTokPerSec rather than re-derived, since InferenceTab already computed
    // them — avoid recomputing the same math twice with two code paths that could drift.
  };
}

const results = [
  ...TIERS.map((t) => computeTierFromInput(tierToSizingInput(t), vendor)),
  isLiveConfigReady(shared)
    ? { key: "live", label: "Your Configuration", ...computeTierFromInput(sharedToSizingInput(shared), vendor) }
    : { key: "live", label: "Your Configuration", placeholder: true },
];
```

This is a **refactor, not new business logic** — `computeTierFromInput`'s internals should be
identical to today's `computeTier`, just parameterized. This is exactly why Backlog #3 (test
suite) must land first: write tests against current `computeTier` output for the 3 fixed
tiers, refactor, confirm identical output, then add the 4th column.

### 3.3 Rendering

- The existing 7-layer × 3-column matrix becomes 7-layer × 4-column. Reuse the same row/cell
  components — do not fork rendering logic for the 4th column (ties into Backlog #9, PDF/
  screen drift — don't create a third representation while fixing the second).
- Placeholder state for the unpopulated live column: render the column header + a single
  centered message across the matrix body, not 7 rows of dashes. Include a short CTA:
  "Go to Inference tab to configure."
- Visually distinguish "Your Configuration" from the 3 template tiers (e.g. a subtle accent
  border) so a client can immediately tell it's the bespoke column vs. the standard tiers —
  this is a demo-credibility detail, not decoration.

### 3.4 PDF export (`exportBomPdf.js`)

- If live config is populated: include as a 4th column, same as on-screen.
- If not populated: omit the column entirely from the export rather than printing a
  placeholder — a client-facing PDF should not show "not configured" copy.

---

## 4. Files affected

| File | Change |
|---|---|
| `src/lib/sharedSchema.js` | **New.** Schema + readiness check (§3.1) |
| `src/tabs/InferenceTab.jsx` | Ensure all `LIVE_CONFIG_REQUIRED_KEYS` are written to `shared`; fix the "flows into BOM & TCO tab" copy |
| `src/tabs/TieredBomTab.jsx` | Refactor `computeTier` → `computeTierFromInput` + adapters; add 4th column; placeholder state; vendor-toggle parity for live column |
| `src/exportBomPdf.js` | Conditionally include/omit 4th column |
| `src/lib/calc.js`, `src/lib/tco.js` | **No changes expected** — reused as-is via the new adapter layer |
| `docs/DECISIONS.md` | Update D10 per §1 above |
| `docs/PRODUCT_BACKLOG.md` | Mark item #2 resolved; note item #8 partially resolved (scoped schema, not full TS) |
| `docs/PROJECT_STATE.md` | Update per session-end convention |
| `docs/CHANGELOG.md` | Add entry under `[Unreleased]` |

---

## 5. Acceptance criteria / test plan

1. **Regression (must pass before anything else):** with `shared` empty/default, the 3 fixed
   tiers produce byte-identical output to pre-refactor behavior, for at least 3 distinct
   test scenarios (small/mid/large model+context combos).
2. Populate `shared` via InferenceTab with a known input set → "Your Configuration" column
   shows correct GPU count, BOM, TCO, financing comparison, unit economics matching a
   hand-computed expected value.
3. With `shared` unpopulated (fresh load, InferenceTab never visited): BOM tab loads with
   3 tiers + placeholder 4th column, zero console errors, no `NaN`/`undefined`/`Infinity`
   text anywhere (repeat the same scan method used for v2.0 handoff).
4. Vendor toggle (NVIDIA↔AMD) recomputes all 4 columns, confirmed functionally (not just
   cosmetically) — same verification method as v2.0 handoff.
5. PDF export: populated case includes 4 columns; unpopulated case includes 3, no broken
   layout.
6. Full `npm run build` clean, per existing verification convention in `CHANGELOG.md`.

---

## 6. Explicitly out of scope for this feature

- Full TypeScript migration (Backlog #8's larger option) — only the scoped JSDoc schema in
  §3.1 is in scope here.
- Any change to the 3 fixed tiers' `usersMid` values or template shape (D3 stays untouched).
- Backend/persistence of any kind (D2 unaffected — this is pure in-session `shared` state,
  already in memory, no new storage).
- Scenario save/compare (Backlog #11) — related but separate; do not conflate the two even
  though both touch `TieredBomTab`.

---

## 7. Suggested commit message (after implementation + your approval)

```
feat(bom): add live "Your Configuration" column sourced from shared state

Resolves Backlog #2 / DECISIONS.md D10. Fixed tiers (Foundation/Standard/
Enterprise) are unchanged and remain governed by D3. Adds a 4th column
that reflects live InferenceTab config via `shared`, with a placeholder
state when unpopulated. Corrects InferenceTab copy to accurately describe
what it feeds. Refactors computeTier -> computeTierFromInput with adapters
for both fixed-tier and live-config inputs; calc.js/tco.js unchanged.

Depends on: git init (Backlog #1), calc engine test suite (Backlog #3) —
both should land first with regression tests confirming zero behavior
change to the existing 3 tiers before this diff is reviewed.
```
