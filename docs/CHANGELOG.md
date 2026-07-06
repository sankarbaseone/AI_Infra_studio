# Changelog — Deloitte AI Infra Studio

Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versioning follows
the simple semantic versioning the Roadmap's governance section calls for (§9.1: "Version
the tool itself... so 'which version was in that demo' is always answerable"). Reconstructed
from the README, the project-state handoff doc, and direct source inspection — this is the
first time version history has been consolidated into one place; going forward it should be
updated at the end of every working session per Roadmap §9.4.

## [Unreleased]
- `docs/` documentation set added (this file, ARCHITECTURE.md, DECISIONS.md,
  PRODUCT_BACKLOG.md, PROJECT_STATE.md, ROADMAP.md) — consolidates prior ad-hoc project-state
  files into the repo itself.
- Engineering backlog produced covering correctness fixes, governance gaps, and the Phase
  1/2 roadmap remainder — see `PRODUCT_BACKLOG.md`.
- `CLAUDE.md` added, governing workflow (plan → approval → implement → build → docs update;
  never auto-commit).
- Git repository initialized — in `~/workspace/nydux` (native Linux mirror), not the
  Windows-mounted path, since git cannot write to that location from WSL at all (DrvFS mount
  blocks `chmod`, which git's lockfile mechanism needs for every write). First commit
  `fd03284`. Remote added: `https://github.com/sankarbaseone/AI_Infra_studio`. Push pending
  Sankar's GitHub credentials. See `DECISIONS.md` D9 for the full record.
- Test suite added for the sizing engine: `src/lib/calc.test.js` (16 tests) and
  `src/lib/tco.test.js` (12 tests), 28 tests total, via Vitest (`npm test`). Zero production
  code changes — characterizes existing behavior, including the validated ~154-day training
  anchor. `npm run build` reconfirmed clean afterward.

## [2.0.0] — v2.0 build (packaged 2026-07-05)

**Phase 0 — Foundation (complete).** Codebase restructured from the v1 single-file component
into a modular layer: reference data (`src/data`), calculation engine (`src/lib`), shared UI
(`src/components`), and per-tab components (`src/tabs`). Added `.gitignore`, `.nvmrc` (Node
20), real `package.json` + `package-lock.json`, and a setup/governance README.

**Phase 1 (partial) — Tiered Multi-Layer BOM.**
- BOM & TCO tab replaced with a Foundation / Standard / Enterprise comparison matrix across
  seven layers (Training, Inference, Token Processing, Storage, Control Nodes, Network
  Fabric, Concurrent Users), computed live from the same sizing engine as the other tabs.
- Vendor toggle (NVIDIA / AMD) recomputes the entire matrix — verified functionally neutral,
  not cosmetic.
- Financing comparison added: On-Premises vs Public Cloud vs GPU-as-a-Service vs Colocation,
  3-year total, cheapest option flagged.
- Unit economics added: cost per 1,000 tokens and cost per inference, tier-by-tier.
- Workload-type framework added (RAG, fine-tuning, agentic, multi-modal, digital twin,
  GenAI) as qualitative planning notes only — explicitly not calibrated numeric multipliers
  (see `DECISIONS.md` D4).
- Tiered PDF export added on the BOM tab, branded to match.

**Verification performed before handoff (all passed, per project-state doc):**
- esbuild bundle of all modules — zero import/syntax errors
- Full render of all four tabs in headless Chromium — zero console errors
- Vendor toggle and tier switching confirmed to recompute live (functional, not cosmetic)
- Text-content scan for `NaN` / `undefined` / `Infinity` artifacts — none found
- Real `npm run build` (Vite v5.4.21) — 41 modules, clean, 187.94 kB / 67.40 kB gzipped
- Fresh unzip of the deliverable package in a clean folder, `npm install` + `npm run build`
  from scratch — passed

**Known gaps at this version (not yet fixed):**
- `git init` has not been run — no version-control history exists yet for this codebase.
- `TieredBomTab` does not consume the cross-tab `shared` state that Token/Training/Inference
  tabs populate — see `DECISIONS.md` D10 and `PRODUCT_BACKLOG.md` item 2.
- No automated test suite.

## [1.1] — in-progress patch, superseded by 2.0.0

Work applied directly to the single-file `GPU_Sizing_Studio.jsx` in the local project:
favicon/title update (done), in-app rename (in progress), PDF wiring via `patch.cjs`
(in progress). **Superseded in full by v2.0** — v2.0 already includes the renamed header,
favicon/title, and a better (tiered) PDF export built on the modular architecture instead.
`patch.cjs` should not be run against the old file; the known cosmetic mis-encoding
(`â€"` in a code comment) present in v1.1 does not exist in the v2.0 codebase.

## [1.0] — original single-file build

The original `GPU_Sizing_Studio.jsx` artifact (kept for reference/history only, per the
project-state doc §9). Four tabs — Token Estimation, Training Sizing, Inference Sizing, and
a flat single-configuration BOM & TCO tab — with cross-tab carry-forward, dual currency
(INR/USD), and India power tariffs. This is the "GPU Sizing BOM tool" pre-existing Deloitte
COE asset (previously used for Digital Gujarat 2.0) that this Studio operationalizes and
extends.
