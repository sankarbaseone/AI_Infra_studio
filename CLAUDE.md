# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Deloitte AI Infra Studio — an internal Deloitte AI Infrastructure COE tool (not a
commercial product) that sizes on-prem AI infrastructure for LLM training and inference,
producing a tiered Bill of Materials (BOM), Total Cost of Ownership (TCO), and financing
comparison. Browser-only Vite + React 18 SPA: no backend, no database, no network calls —
"client data never leaves the browser" is part of the trust pitch, not an implementation
detail.

## Commands

```bash
npm install
npm run dev          # dev server → http://localhost:5173
npm run build        # production build → dist/
npm run preview      # serve production build → http://localhost:4173 — ALWAYS use this for demos, not dev
npm test             # full Vitest suite (vitest run)
npm test -- src/lib/tco.test.js   # single test file
npm run test:watch   # watch mode
```

Node version is pinned in `.nvmrc` (Node 20).

## Repo locations — read before running npm or git

Two copies of this project exist (see `docs/DECISIONS.md` D9):

- **`~/workspace/nydux`** — the canonical **git-tracked** repo (remote:
  `github.com/sankarbaseone/AI_Infra_studio`). All git operations, `npm install`, builds,
  and tests run here.
- **`/mnt/c/Personal/.../Deloitte_AI_Infra_Studio_v2/infra-studio-v2`** — Windows-mounted
  (DrvFS) working copy for Windows-side editors. **`npm install` and all git writes fail
  there** (DrvFS without `metadata` rejects every `chmod`; npm and git's lockfiles both
  need it). Sync plain files back with `cp --no-preserve=mode,ownership,timestamps`
  (ignore its "setting permissions" error); never copy `node_modules` that way.

Pushing needs Sankar's GitHub PAT, which is not in this environment — he runs `git push`
himself from a WSL terminal.

## Architecture

Strict one-way layering — **data → lib → components → tabs → App**:

- `src/data/reference.js` — ALL constants (GPU specs, node configs, fabrics, storage,
  tiers, cloud rates, tariffs). Zero logic. Every category has a `DATA_META` entry with
  `lastReviewed` + `source`; any new reference-data category must include one (D8,
  non-optional).
- `src/lib/` — pure, framework-free calculation engine, no React imports. `calc.js`
  (FLOPs, memory, KV-cache, `sizeInference` — memory-bound vs throughput-bound, max
  wins), `tco.js` (`buildBom`, 4-way `financingComparison`, `unitEconomics`,
  `controlNodeSpec`), `format.js`, `sharedSchema.js` (JSDoc typedef + readiness check for
  cross-tab state). This layer is fully covered by Vitest; UI is not.
- `src/components/ui.jsx` — shared presentational primitives (Field, Stat, Chip, Sel, NumIn).
- `src/tabs/` — the only layer holding state and wiring calc → UI. New features (Digital
  Twin, Financial Cockpit) go in as new tab files consuming `lib`/`data` — never grow
  calculation logic inside a tab (D6).
- `src/exportBomPdf.js` — dependency-free PDF export (hand-built HTML string +
  `window.print()`). It is a second render implementation of the BOM matrix and can drift
  from the on-screen table — check it whenever the matrix changes.

**Cross-tab data flow ("carry-forward" pattern):** `App.jsx` owns `shared`, written via
`useEffect` in tabs and read by later tabs. State flows forward only: TokenTab →
`shared.effTokensT` → TrainingTab (seeds on mount, not reactive); InferenceTab →
`shared.{inferGpu, inferGpus, aggregateTokPerSec, inferFabricKey, inferStorageTB, ...}`
(shape documented in `src/lib/sharedSchema.js`) → TieredBomTab's "Your Configuration"
column. Tabs are conditionally mounted, so local tab state resets on tab switch — only
`shared` persists.

**TieredBomTab (the flagship):** one shared engine call, `computeTierFromInput()`
(`buildBom` → `financingComparison` → `unitEconomics`), feeds all 4 columns; only the
input adapter differs — `tierToSizingInput()` for the 3 fixed tiers (re-runs
`sizeInference` with tier `usersMid`), `liveToSizingInput()` for the live column (takes
InferenceTab's already-computed sizing from `shared`, deliberately does NOT re-run
`sizeInference` so the two paths can't drift). The live column is gated by
`isLiveConfigReady(shared)` and shows a placeholder until InferenceTab is configured.

## Fixed constraints (docs/DECISIONS.md — read before "fixing" anything)

- **D1 — Vendor neutrality is non-negotiable.** NVIDIA and AMD get equal analytical
  weight; the vendor toggle recomputes the entire matrix. Decline or redesign any change
  that breaks parity. (Known, deliberate exception per D10: the live column's GPU stays
  pinned to the InferenceTab pick on vendor toggle; its numbers still recompute.)
- **D2 — No backend.** Persistence features (e.g. scenario save/compare) default to
  browser-local storage.
- **D3 — Fixed tiers** (Foundation/Standard/Enterprise user bands) match an internal
  Deloitte template; don't make them flexible.
- **D4 — Workload-type multipliers are qualitative only** until a COE owner supplies
  calibrated delivery data. Don't build the numeric version speculatively.
- **D5 — No dependencies beyond React** (`react`, `react-dom`; Vite/Vitest as dev deps).
  Adding any library is a deliberate decision, not an incidental `npm install`.

## Development workflow

Before writing code: read `docs/PROJECT_STATE.md` (session-by-session source of truth,
including current priorities and known gaps) and `docs/PRODUCT_BACKLOG.md`.

For every feature: implementation plan → wait for approval → implement → `npm run build`
clean → update documentation. Whenever architecture changes, update
`docs/PROJECT_STATE.md`, `docs/ARCHITECTURE.md`, and README.md; whenever calculations
change, update docs and examples. Never skip documentation updates — `PROJECT_STATE.md`
gets a session note and a "Last updated" bump at the end of each working session.

## Git workflow

When a feature is finished, in order:

1. `npm run build` — fix any errors
2. `npm test` — full suite
3. Show `git diff` (or a summary if large)
4. Generate a professional commit message
5. Commit — no separate approval needed (the feature was approved before implementation)
6. **Ask for approval, then push.** Push always needs a fresh explicit yes, even though
   committing doesn't. Never skip steps 1–3 before committing.

All git steps run in `~/workspace/nydux` (see Repo locations above).

## Current status

v2.0 shipped: 4 tabs (Token Estimation, Training Sizing, Inference Sizing, BOM & TCO),
live "Your Configuration" BOM column, colocation-TCO `annualSupport` fix — do not re-flag
those as open. Open residuals and next priorities (scenario save/compare is Priority 1)
live in `docs/PROJECT_STATE.md` §8 and `docs/PRODUCT_BACKLOG.md`.
