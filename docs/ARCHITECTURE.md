# Architecture — Deloitte AI Infra Studio

**Status:** current as of v2.0 (2026-07-05)
**Companion docs:** [PROJECT_STATE.md](./PROJECT_STATE.md) · [ROADMAP.md](./ROADMAP.md) · [DECISIONS.md](./DECISIONS.md) · [PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md)

A browser-only Vite + React SPA (no backend, no server calls) that sizes on-prem GPU
infrastructure and produces a costed, tiered Bill of Materials (BOM) and Total Cost of
Ownership (TCO). Total footprint is small — roughly 900 lines across 14 source files.

## Folder structure

```
infra-studio-v2/
├── index.html, vite.config.js, package.json   — Vite/React scaffold
├── docs/                                       — this documentation set
└── src/
    ├── main.jsx / App.jsx      Entry point + shell (header, tab nav, footer)
    ├── theme.js                Brand colors (C.*) + inlined base64 Deloitte logo
    ├── data/reference.js       ALL constants: GPU specs, node configs, fabric, storage,
    │                           tiers, pricing, cloud rates — each category tagged with
    │                           lastReviewed + source (DATA_META)
    ├── lib/
    │   ├── calc.js              Pure math: FLOPs, cluster peak, memory, KV-cache, throughput
    │   ├── tco.js                BOM cost build, 4-way financing comparison, unit economics
    │   └── format.js             Number/currency formatters
    ├── components/ui.jsx       Shared presentational primitives (Field, Stat, Chip, Sel, NumIn)
    ├── tabs/
    │   ├── TokenTab.jsx          Step 1: corpus → tokens
    │   ├── TrainingTab.jsx       Steps 2-4: training time/feasibility
    │   ├── InferenceTab.jsx      Serving sizing
    │   └── TieredBomTab.jsx      Flagship: Foundation/Standard/Enterprise BOM matrix
    └── exportBomPdf.js         Dependency-free PDF export via browser print
```

This is a strict **data → lib → components → tabs → App** layering: `reference.js` has zero
logic, `lib/*.js` is pure functions with no React/UI imports, `tabs/*.jsx` is the only layer
that holds state and wires calc → UI together. This shape was deliberately introduced in
Phase 0 (see [ROADMAP.md](./ROADMAP.md#phase-0) and [DECISIONS.md](./DECISIONS.md#d6)) ahead
of the Phase 2 Digital Twin and Financial Cockpit work, on the "pay down complexity early"
principle — retrofitting this structure after those features exist directly in a monolith
would cost far more than doing it now.

## Component hierarchy

```
main.jsx
 └─ App.jsx                     owns `tab` (active tab) and `shared` (cross-tab state)
     ├─ TokenTab                writes shared.effTokensT
     ├─ TrainingTab             reads shared.effTokensT (seeds tokensT), owns rest locally
     ├─ InferenceTab            writes shared.{inferGpu, inferGpus, aggregateTokPerSec, ...}
     └─ TieredBomTab            reads `shared` for the "Your Configuration" 4th column; 3 fixed tiers stay independent
```

All four tabs are mounted conditionally (`{tab === "x" && <Tab/>}`), so switching tabs
unmounts the others — state inside a tab (e.g. TrainingTab's local `gpu`/`count`) resets if
you leave and come back, except for whatever was pushed into `shared`.

## Data flow

The "carry-forward" pattern is the whole app's data-flow design:

1. **TokenTab**: `TB × tokens/MB × epochs` → effective tokens → pushed to
   `shared.effTokensT` via `useEffect`.
2. **TrainingTab**: seeds its local `tokensT` from `shared.effTokensT || 2` (only on mount —
   not reactive afterward), runs the training-time model independently.
3. **InferenceTab**: computes GPU sizing from concurrency inputs, pushes a documented set of
   fields into `shared` (see `src/lib/sharedSchema.js`'s `SharedState` typedef) — GPU
   choice/count, aggregate throughput, model/precision/context, and (since the "Your
   Configuration" feature) fabric and storage-capacity inputs InferenceTab collects itself.
4. **TieredBomTab**: the 3 fixed tiers (Foundation/Standard/Enterprise) still compute
   independently, in `computeTierFromInput()` fed by `tierToSizingInput()`, using tier-fixed
   user counts (`usersMid`) — unchanged, per `DECISIONS.md` D3. A 4th column, **"Your
   Configuration,"** is fed by `liveToSizingInput(shared, ...)` and reflects InferenceTab's
   config live, gated by `isLiveConfigReady(shared)` (placeholder shown until ready). See
   [DECISIONS.md — D10](./DECISIONS.md#d10) for the full resolution.

State only flows forward (Token → Training → Inference → BOM's live column), never backward.
`shared` has a documented (but not runtime-enforced) shape via `src/lib/sharedSchema.js` —
see [PRODUCT_BACKLOG.md — item 8](./PRODUCT_BACKLOG.md#8-add-a-lightweight-schema-for-shared-cross-tab-state)
for what's still open there (full validation / TypeScript).

## State management

No external state library — everything is local `useState` in `App.jsx` and each tab, lifted
only as far as needed (`shared` in `App`). Cross-tab communication is done by `useEffect`
side effects writing into `shared`, which is then read by sibling tabs on next mount. This is
fine for 4 tabs but is a manual, ad-hoc version of what a `useReducer`/context would give
more safely as the tab count grows (Digital Twin and Financial Cockpit tabs are both on the
Phase 2 roadmap).

## Calculation engine (`lib/calc.js`, `lib/tco.js`)

Pure, framework-free functions — the actual "engine":

- **Training**: `trainingFlops = 6 × params × tokens` (standard decoder-only scaling law) →
  `time = FLOPs ÷ (cluster peak × effective MFU)`, where effective MFU = user-selected band
  (poor/good/Megatron/SOTA) adjusted by a fabric-specific bonus/penalty
  (`FABRICS[key].mfuBonus`).
- **Memory**: training memory ≈ 18 bytes/param (Adam mixed-precision rule of thumb);
  inference memory = weights (×1.2 overhead) + KV-cache.
- **KV-cache**: `2 × layers × kvHeads × headDim × bytesPerElem × ctx × batch` — correctly
  GQA-aware (uses `kvHeads`, not `heads`).
- **Inference sizing** (`sizeInference`): computes GPUs needed two ways — memory-bound
  (weights+KV vs 85%-usable HBM) and throughput-bound (peak tokens/sec ÷ per-GPU decode
  throughput, itself derived from HBM bandwidth ÷ bytes-per-param × 18 fudge factor for
  continuous batching) — and takes the max, tagging which constraint bound the result.
- **BOM build** (`buildBom`): nodes = `ceil(GPUs/8)`, capex = node price + fabric cost +
  storage cost + a flat $12k/node rack cost. Also returns `ctrlVcpu`/`ctrlRam` via
  `controlNodeSpec(nodes)` — HA control-plane sizing derived live from compute-node count
  (floor 8 vCPU/64GB at 1 node, +4 vCPU/+32GB per additional node, capped at 64/1024),
  replacing what used to be static per-tier constants in `reference.js`.
- **Financing comparison**: 4-way — On-Prem (capex + 3yr power+support), Public Cloud
  (on-demand $/GPU-hr × 8760 × 3), GPU-as-a-Service (0.75× cloud rate), Colocation
  (capex + $/kW/month × 36) — cheapest flagged.
- **Unit economics**: cost/token and cost/inference from 3-yr TCO ÷ (aggregate tok/s ×
  utilization × seconds-in-3-years).

All of this is testable pure-function math with zero React coupling — the strongest part of
the codebase, and currently the highest-value target for automated test coverage (see
[PRODUCT_BACKLOG.md — item 3](./PRODUCT_BACKLOG.md#3-add-automated-test-suite-for-the-calculation-engine)).

## BOM generation flow (`TieredBomTab.jsx`)

`computeTierFromInput({ gpuKey, sized, fabricKey, storageTB, storageKey, region,
utilizationPct, outTok })` is the shared engine call (`buildBom()` →
`financingComparison()` → `unitEconomics()`) for **all 4 columns** — only how `sized`/
`gpuKey`/`fabricKey`/`storageTB` are sourced differs, via two adapters:

- **`tierToSizingInput(tier, vendor, ...)`** — for each of the 3 fixed tiers (`TIERS` in
  `reference.js` — Foundation 200-300 / Standard 300-500 / Enterprise 500-800 users): picks
  the vendor-specific default GPU (`VENDOR_TIER_DEFAULT[vendor][tier.key]`), computes peak
  output tokens/sec from `tier.usersMid × reqPerUserHr/3600 × peakFactor × outTok`, and calls
  `sizeInference()` fresh.
- **`liveToSizingInput(shared, ...)`** — for the "Your Configuration" 4th column: takes
  `gpuKey`/GPU count/throughput directly from `shared` (already computed by InferenceTab) —
  does **not** re-run `sizeInference()`, specifically to avoid two code paths that could
  drift from the same underlying numbers.

Render as a 7-layer matrix (Training, Inference, Token Processing, Storage, Control Nodes,
Network Fabric, Concurrent Users) × 4 columns, with per-column financial detail (CapEx, 3yr
TCO, cost/1K tokens, cost/inference, 4-way financing table) below. The live column renders a
placeholder (via an HTML `rowSpan`) until `isLiveConfigReady(shared)` is true.

Switching the vendor toggle (NVIDIA↔AMD) re-runs the 3 fixed tiers' computation entirely, so
every cell recomputes — this is the "functional neutrality" the README claims, and it holds
up in the code (no hardcoded NVIDIA-only path). The live column's *numbers* also recompute on
toggle (its financing call still runs), but its `gpuKey` stays pinned to whatever GPU was
picked in InferenceTab — a deliberate, documented exception (see
[DECISIONS.md — D10](./DECISIONS.md#d10)). Vendor neutrality is otherwise a fixed,
non-negotiable design constraint — see [DECISIONS.md — D1](./DECISIONS.md#d1).

## Cost calculation

Centralized in `lib/tco.js` (see engine section above) — capex from hardware+fabric+storage+
rack, opex from power (region-specific kWh rate × PUE 1.4) + 10% annual support, rolled into
a 3-year on-prem TCO, then compared against 3 alternative financing models. Currency: raw
math in USD, with an INR conversion (`USD_INR = 83.5`, hardcoded) applied only at display
time for the India region.

## PDF export

`exportBomPdf.js` builds a complete HTML string by hand (no template engine, no PDF library)
— inlines the Deloitte logo, constructs a `<table>` from the same `results` array the
on-screen matrix uses, opens a blank browser window (`window.open`), writes the HTML, and
calls `window.print()` after a 400ms `setTimeout`. This is genuinely dependency-free
("browser print, no dependencies") but is HTML string concatenation rather than
JSX/templating, and the 400ms timeout is a magic-number race against the new window's render
rather than a confirmed-ready signal.

## Areas of technical debt

See [PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md) for the full, prioritized list. Summary:

1. ~~TieredBomTab doesn't consume `shared` state~~ — **Fixed 2026-07-06.** See
   [DECISIONS.md — D10](./DECISIONS.md#d10).
2. ~~No automated tests~~ — **Fixed 2026-07-06** for the calc/tco engine (52 tests via
   Vitest). UI components (`tabs/*.jsx`) remain untested — no React component-test harness
   exists in this project yet.
3. **Workload-type multipliers are qualitative placeholders** shown next to fully-computed
   cost numbers — a real risk of being misread as calibrated fact (see
   [DECISIONS.md — D4](./DECISIONS.md#d4)).
4. **Inline styles everywhere**, magic numbers embedded in `calc.js`/`tco.js` instead of
   named reference-data constants.
5. **`shared` has a documented shape now** (`src/lib/sharedSchema.js`, JSDoc typedef) but
   still no runtime enforcement and no TypeScript anywhere in the project — see
   [PRODUCT_BACKLOG.md — item 8](./PRODUCT_BACKLOG.md#8-add-a-lightweight-schema-for-shared-cross-tab-state).
6. ~~Git repo doesn't exist yet~~ — **Fixed.** Repo is git-tracked (history currently lives
   in a native-Linux working copy, `~/workspace/nydux`, not the Windows-mounted project
   path — see `PROJECT_STATE.md`'s environment note and [DECISIONS.md — D9](./DECISIONS.md#d9)).
7. **Hardcoded USD↔INR rate** and no active staleness enforcement beyond a passive caption.
8. **PDF export duplicates rendering logic** with the on-screen table — a drift risk on any
   future layer change. Partially mitigated for the 4th-column addition (both now iterate
   the same `columns`/`results` shape), but still two separate render implementations.
9. **A genuine financing-model discrepancy was found while writing the calc/tco test
   suite:** `financingComparison`'s `cheapestKey` never resolves to `onPrem` or `cloud`
   under current constants — see [PRODUCT_BACKLOG.md — item 3](./PRODUCT_BACKLOG.md#3-add-automated-test-suite-for-the-calculation-engine)
   for the full finding. Not fixed; flagged for Sankar's decision.

No code was modified in producing this document — it is a description of the codebase as it
stands.
