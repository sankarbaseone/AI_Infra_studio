# Deloitte AI Infra Studio — Project State & Handoff

**Purpose of this file:** single source of truth for the project so work can resume in any
new session without losing context. Update it at the end of each working session (Roadmap
§9.4). This file now lives inside the repo at `docs/PROJECT_STATE.md` — see the note in
§10 about the older duplicate copies it consolidates.

**Last updated:** 2026-07-06
**Owner:** Sankar — AI Infrastructure Advisory & Technical Delivery, Deloitte (COE)
**Classification:** Internal — Deloitte AI Infrastructure COE asset
**Status:** v2.0 built, verified working, and launched locally; `docs/` documentation set and
`CLAUDE.md` added; calc/tco/format test suite built out (52 tests passing) — surfaced a real
financing-model discrepancy along the way, see `PRODUCT_BACKLOG.md` item 3; git repo live in
`~/workspace/nydux` (native Linux mirror — see environment note below), 5 commits made,
**pushed to `https://github.com/sankarbaseone/AI_Infra_studio` and confirmed in sync**
(`b26fece`, latest, pushed 2026-07-06).
**"Your Configuration" live BOM column implemented and shipped** (resolves Backlog #2 / D10)
— see below for the scope amendment made during planning (fabric/storage became real
InferenceTab inputs; control-node sizing became a node-count formula applied to all 4
columns).

**⚠️ Environment note (discovered 2026-07-05, extended 2026-07-06):** this repo lives on a
Windows-mounted DrvFS path (`/mnt/c/...` from WSL). DrvFS mounts here do not support `chmod`
(`mount` shows `9p ... drvfs`, no `metadata` option) — every file shows as `rwxrwxrwx`
regardless. **Any `npm install` run from WSL directly against this path will fail** with an
`EPERM: operation not permitted, chmod` error partway through, because npm's install process
tries to set executable bits on installed `bin/` scripts. This also means Rollup's
platform-detection can install the wrong native binary if `node_modules` was created on one
OS and later read from another (`Cannot find module @rollup/rollup-linux-x64-gnu` is the
symptom). **Workaround used for build/test:** copy the source (excluding
`node_modules`/`dist`) to a native Linux path — `~/workspace/nydux` (the `nydux` bash alias
target) — run `npm install` / `npm run build` / `npm run preview` / `npm test` there, and
only copy plain data files (e.g. `package.json`, `package-lock.json`, `dist/`, `*.test.js`)
back to the Windows-mounted repo using `cp --no-preserve=mode,ownership,timestamps` (a bare
`cp` will throw a "setting permissions" error on the destination but the file content still
copies correctly — the error is only about the chmod step, safe to ignore for plain files).
Do **not** attempt to copy `node_modules` back this way — reinstall it fresh from Windows-side
npm/PowerShell instead if it's ever needed directly in the master folder.

**This same limitation extends to git, and is worse than originally scoped:** `git init`
(and `git add`/`git commit`) also fail on this mount from WSL — git's lockfile mechanism
(`.git/config.lock`, `.git/index.lock`, etc.) calls `chmod` on every write, not just at init
time. `git init` cannot even complete cleanly here (confirmed 2026-07-06 — it leaves a
half-written `.git/` directory and errors on `core.filemode`).

**Resolution actually adopted (2026-07-06):** rather than Sankar running git on Windows
(the initial plan), Sankar asked Claude Code to do the commit directly. Since WSL can't
write git objects to `/mnt/c/...` at all, **the git repository now lives in
`~/workspace/nydux` (the native Linux mirror) — that is the canonical, git-tracked copy of
this project going forward.** First commit: `fd03284`. Remote:
`https://github.com/sankarbaseone/AI_Infra_studio`. The Windows-mounted
`/mnt/c/.../infra-studio-v2` folder has no `.git` and cannot get one from WSL; it's kept in
sync via the same `cp --no-preserve=mode,ownership,timestamps` pattern used for
build artifacts, so it stays useful for Windows-side editors/IDEs, but it is **not** where
git history lives. Pushing to GitHub requires a Personal Access Token that isn't present in
this WSL environment — Sankar runs `git push` himself from a WSL terminal. See
`DECISIONS.md` D9 for the full record, including the alternatives considered (fixing the
WSL mount's `metadata` option; Sankar running all git ops on Windows) and why this dual-
location model was adopted instead.

---

## 1. What this application is

An internal, browser-based tool (built and owned by the Deloitte AI Infrastructure COE) that
sizes on-premises AI infrastructure and produces a costed, tiered Bill of Materials (BOM) and
Total Cost of Ownership (TCO) for LLM training and inference engagements.

**Business framing:** not a product Deloitte licenses/sells — a demand-generation and
credibility accelerator used live in discovery workshops to turn a sizing conversation into a
signed engagement (AI DC Readiness Assessment / AI Factory Design). Outputs are indicative
planning estimates for discovery/proposal stage, validated against live vendor quotes before
client commitment. See [ROADMAP.md §2](./ROADMAP.md#2-vision--positioning) for the full
positioning statement.

**In-app name:** "AI Infra Studio". Browser tab title: "Deloitte AI Infra Studio" (favicon:
green rounded square, white "D").

**Governing plan:** `AI_Infra_Studio_Roadmap.docx` — mirrored in
[ROADMAP.md](./ROADMAP.md) for git-trackability. This file tracks execution against that
plan session-by-session.

---

## 2. Current state — v2.0 built and packaged; documentation set added this session

**Delivered as:** a complete, modular Vite + React project at
`infra-studio-v2/` (this repo). Confirmed via direct filesystem inspection this session:
`dist/` exists (a production build has been run), `node_modules/` and `package-lock.json`
are present, `.nvmrc` pins Node 20.

### Verification performed before v2.0 handoff (all passed, per prior session notes)
- esbuild bundle of all modules — zero import/syntax errors
- Full render of all four tabs in headless Chromium — zero console errors
- Interactive test: vendor toggle (NVIDIA→AMD) and tier switching recompute live, confirmed
  functionally (not just cosmetically) neutral
- Text-content scan for `NaN` / `undefined` / `Infinity` artifacts — none found
- Real `npm run build` (Vite v5.4.21) — 41 modules, clean, 187.94 kB / 67.40 kB gzipped
- Fresh unzip of the exact deliverable zip in a clean folder, `npm install` + `npm run build`
  from scratch — passed

### This session's work (2026-07-05)
- Full codebase read and architecture documented (see [ARCHITECTURE.md](./ARCHITECTURE.md))
- Full roadmap `.docx` extracted to text and mirrored into [ROADMAP.md](./ROADMAP.md) —
  extraction method: `unzip` the `.docx` (it's a zip of XML) and strip tags with a small
  Python regex script, since neither `pandoc` nor `python-docx` is installed in this
  environment. Worth installing one of those for future doc-extraction work if it recurs.
- Prioritized engineering backlog produced — 16 items, see
  [PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md)
- Decisions log created — 10 entries, see [DECISIONS.md](./DECISIONS.md)
- Changelog consolidated — see [CHANGELOG.md](./CHANGELOG.md)
- **Confirmed via direct filesystem check:** no `.git` directory exists in
  `infra-studio-v2/`; no test config (`vitest`/`jest`) or TypeScript config anywhere in the
  repo. Both were suspected from prior session notes and are now independently verified.

### Phase 0 — Foundation
**Complete except confirming git is live.** Codebase structure (`src/data`, `src/lib`,
`src/components`, `src/tabs`), `.gitignore`, `.nvmrc`, `package.json`/`package-lock.json`,
README, and now a calc/tco test suite are all in place and verified present on disk. Git
init/first-commit instructions were handed to Sankar to run on Windows (2026-07-06) — see the
environment note above for why WSL can't do this — with a remote already pointed at
`https://github.com/sankarbaseone/AI_Infra_studio`. **Not yet confirmed that the push actually
landed** — verify at the start of the next session (e.g. check the GitHub repo directly, or
ask).

### Tab 01 — Token Estimation
Converts raw corpus (TB) → defensible token count using tokenizer density + epochs. Carries
the effective-token figure forward to Training via `shared.effTokensT`.

### Tab 02 — Training Sizing
Training FLOPs = 6 × params × tokens; time = FLOPs ÷ (cluster peak × MFU). Deadline check,
memory feasibility. Validated anchor: 70B/2T/128×H100/50% MFU → ~154 days.

### Tab 03 — Inference Sizing
Concurrent users → req/sec → output tok/sec, sized against throughput AND KV-cache/weight
memory; larger constraint wins. GQA-aware. Pushes a documented field set into `shared` (see
`src/lib/sharedSchema.js`) — GPU/GPU-count/throughput, model/precision/context, and (new,
2026-07-06) **Network fabric** and **Storage capacity (TB)**, which this tab didn't collect
before. Now genuinely feeds the BOM tab's "Your Configuration" column (see Tab 04).

### Tab 04 — BOM & TCO (Tiered Multi-Layer BOM, v2 flagship)
Foundation/Standard/Enterprise matrix across seven layers (Training, Inference, Token
Processing, Storage, Control Nodes, Network Fabric, Concurrent Users), computed live from the
sizing engine per tier, **plus a 4th "Your Configuration" column** (added 2026-07-06) wired
live to `shared`, with a placeholder state until Inference tab is configured. Vendor toggle
(NVIDIA/AMD) recomputes the 3 fixed tiers' entire matrix — verified functionally neutral; the
live column's numbers also recompute but its GPU choice stays pinned to whatever was picked
in InferenceTab (deliberate exception, see `DECISIONS.md` D10). 4-way financing comparison
(On-Prem/Cloud/GPU-aaS/Colocation) — see the flagged discrepancy in `PRODUCT_BACKLOG.md` item
3 (`onPrem`/`cloud` structurally never win). Unit economics (cost/1K tokens, cost/inference).
Control-node vCPU/RAM now a live formula (`controlNodeSpec()`) instead of static per-tier
constants. Workload-type chips (qualitative only, explicit disclaimer). Tiered PDF export,
which omits the live column entirely (not a placeholder) when unpopulated.

**Resolved this session:** `TieredBomTab.jsx` previously didn't read `shared` at all — see
[DECISIONS.md D10](./DECISIONS.md#d10) for the full resolution and
[PRODUCT_BACKLOG.md item 2](./PRODUCT_BACKLOG.md#2-fix-tieredbomtab--shared-state-disconnect)
for status.

---

## 3. Known gaps (consolidated, current as of this session)

- **Git repo is live** in `~/workspace/nydux`, 4 local commits, pushed and confirmed in sync
  with `github.com/sankarbaseone/AI_Infra_studio` (no longer a gap).
- **Automated tests**: `src/lib/calc.test.js`, `src/lib/tco.test.js`, `src/lib/format.test.js`
  — 52 tests total, all passing via Vitest (`npm test`). No longer a gap for the calc/tco
  engine; still no tests for UI components/tabs (no React component-test harness exists yet).
- **No TypeScript** — confirmed, no `tsconfig.json`, `.jsx` throughout. `shared` now has a
  documented (JSDoc, not runtime-enforced) shape via `src/lib/sharedSchema.js`.
- ~~TieredBomTab/shared disconnect~~ — **Fixed 2026-07-06.** See
  [DECISIONS.md D10](./DECISIONS.md#d10).
- **Magic numbers in `calc.js`/`tco.js`** not lifted into `reference.js` (18, 0.85, 1.2,
  12000 — see [ARCHITECTURE.md](./ARCHITECTURE.md#calculation-engine-libcalcjs-libtcojs))
- **Hardcoded `USD_INR = 83.5`**, no active staleness enforcement beyond a passive caption
- **PDF export duplicates on-screen table logic** — two representations of the same matrix
  (partially unified for the 4th column via a shared `columns`/`results` shape, but still two
  separate render implementations overall)
- **NEW: financing-model discrepancy** (found while writing the Backlog #3 test suite) —
  `cheapestKey` never resolves to `onPrem`/`cloud` under current constants. Not fixed;
  flagged for a decision. See `PRODUCT_BACKLOG.md` item 3.
- **NEW: no live in-browser verification for the "Your Configuration" feature** — headless
  Chromium couldn't be installed in this sandboxed WSL environment (missing system shared
  libraries, `sudo` unavailable non-interactively). Verified instead via: `npm test` (52/52),
  `npm run build` (clean), and a Node script exercising the real computation path with
  realistic default inputs for both the 3 fixed tiers and the live column (zero NaN/Infinity,
  confirmed live `aggregateTokPerSec` matches `shared` exactly). **Recommend a manual
  click-through in an actual browser before the next client demo.**

Full detail, priority, effort, and sequencing for all of the above is in
[PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md).

---

## 4. Scope decisions — resolved and open

See [DECISIONS.md](./DECISIONS.md) for the full log with rationale. Quick reference of what
was resolved for v2:

1. Use cases in scope → tiered sizing, full 7-layer stack, vendor-neutral hardware
   recommendation (computed, not static), financing comparison, unit economics, qualitative
   workload framework. **Not built:** a distinct "vital DC input intake" discovery panel —
   inputs remain spread across the BOM tab's grid. Open — see
   [PRODUCT_BACKLOG.md item 7](./PRODUCT_BACKLOG.md#7-resolve-the-vital-dc-input-discovery-panel-decision).
2. Fixed tiers vs. flexible tiers → **Fixed tiers**, matching the internal template
   ([DECISIONS.md D3](./DECISIONS.md#d3)). Flexible tiers logged as Phase 3 candidate.
3. DC input set → client name, vendor, model, precision, context window, output
   tokens/request, requests/user/hr, peak-to-average factor, avg. utilization, storage tier +
   per-tier TB, region/tariff. Latency target (TTFT) discussed but not added as an explicit
   input.

---

## 5. Workspace & deployment strategy

### Done
- [x] README.md — setup, build, deploy, governance, migration notes
- [x] .gitignore — excludes `node_modules/`, `dist/`
- [x] package.json + package-lock.json — verified to reproduce an identical build
- [x] .nvmrc — pins Node 20
- [x] `docs/` documentation set (this session)

### Not yet done
- [ ] **Confirm the git init + first commit + push actually landed** — handed off to Sankar
      to run on Windows (2026-07-06); not yet verified. A second commit (test suite addition)
      is also queued and pending the same Windows-side execution — see the proposed commands
      at the end of this session's work.

### Resolved this session
- [x] Which local folder is the live working copy — confirmed by Sankar (2026-07-05):
      `GPU_Sizing_application` (referenced in earlier session notes as still on a v1.1
      structure) is the **older version** and is intentionally left as-is, not migrated or
      reconciled. `infra-studio-v2/` (this repo) is the sole active working copy going
      forward. No further action needed on `GPU_Sizing_application`.

### Deployment target (unchanged)
Static build (`npm run build` → `dist/`), runs on any laptop with no server — no backend, per
[DECISIONS.md D2](./DECISIONS.md#d2).

### Migration caution (still unconfirmed)
Whether the eventual Deloitte-issued laptop allows `npm install` against the public npm
registry has not yet been confirmed.

---

## 6. Project layout

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full, current breakdown with responsibilities
per file. Top level:

```
infra-studio-v2/
├── index.html, package.json, package-lock.json, vite.config.js, .gitignore, .nvmrc, README.md
├── docs/                  <- this documentation set
├── public/favicon.svg
└── src/
    ├── theme.js, main.jsx, App.jsx
    ├── data/reference.js
    ├── lib/{calc,tco,format}.js
    ├── components/ui.jsx
    ├── tabs/{TokenTab,TrainingTab,InferenceTab,TieredBomTab}.jsx
    └── exportBomPdf.js
```

Toolchain: Node + npm · Vite v5.4.21 · React 18. Local commands (no model quota needed):
`npm install` · `npm run build` · `npm run dev` (5173) · `npm run preview` (4173/4174).

---

## 7. How to run / demo

- Dev: `npm run dev` → http://localhost:5173
- Production preview (use this for demos): `npm run build` then `npm run preview`
- Demo artifact = the `dist/` folder: runs in any browser, no server
- Pre-flight: Training tab 70B/2T/128×H100/50% → ~154 days (credibility anchor); BOM tab —
  type a real client name, toggle vendor once live in front of the client to demonstrate
  neutrality, walk all three tiers; F11 full-screen

---

## 8. Immediate next actions (pick up here)

0. **Do a manual browser click-through of the "Your Configuration" feature** before the next
   client demo — this session verified it via `npm test`/`npm run build`/a Node-script
   sanity pass, but not an actual browser (headless Chromium couldn't be installed in this
   sandboxed environment). Walk: fresh load → BOM tab shows placeholder 4th column → visit
   Inference tab, configure GPU/fabric/storage → return to BOM tab → 4th column populates →
   toggle vendor NVIDIA↔AMD → confirm 3 tiers' GPUs change, live column's doesn't (by design)
   but its cost numbers still update → export PDF in both populated/unpopulated states.
1. **Decide on the financing-model discrepancy** (surfaced 2026-07-06, not fixed —
   see `PRODUCT_BACKLOG.md` item 3): `cheapestKey` never resolves to `onPrem` or `cloud`
   under current constants — `colo` structurally beats `onPrem` for every GPU/region
   combination, and `gaas` always undercuts `cloud`. Is `SUPPORT_PCT`/`COLO_PER_KW_MONTH`
   miscalibrated, or is this an accurate (if counter-intuitive) reflection of real pricing?
2. Confirm Deloitte-laptop Node/npm registry access — still outstanding.
3. Decide whether to build the dedicated "vital DC input" discovery panel, or keep inputs
   inline on the BOM tab (§4, item 1).
4. Next feature slice per the Roadmap: remainder of Phase 1 (scenario save/compare,
   sensitivity sliders) or move to Phase 2A (Digital Twin) — Sankar's call on sequencing,
   informed by the backlog's recommended ordering.
5. Workload-type numeric multipliers: identify a COE owner to supply calibrated deltas from
   real delivery data before those move from qualitative notes to client-facing numbers
   ([DECISIONS.md D4](./DECISIONS.md#d4)).

---

## 9. Related assets & context

- **`AI_Infra_Studio_Roadmap.docx`** (in the sibling `Deloitte_AI_Infra_Studio/` folder) —
  the governing phased roadmap; mirrored in [ROADMAP.md](./ROADMAP.md) this session.
- **`GPU_Sizing_Studio.jsx`** — the original v1 single-file artifact (superseded; kept for
  reference/history only).
- **`LLM_Routing_Hybrid_Architecture_Deloitte.pptx`** — 3-slide deck (cover + routing +
  hybrid/sovereign reference architecture) for the Global AI Infra COE thread.
- **`GPU_Sizing_Studio_HLD.docx`** — 10-page Deloitte-branded HLD for the v1 app. Consider
  whether this needs a v2.0 addendum reflecting the tiered BOM.
- **GPU Sizing BOM tool** — pre-existing reusable Deloitte COE asset (used for Digital
  Gujarat 2.0); this Studio operationalizes that IP.
- Global AI Infra COE: Anjani Kumar (lead), Narayanan Raman, Raghavendra Nagarajan (Sankar's
  manager/Director Cloud Eng); introduced via Vivek Mathur.

---

## 10. Note on duplicate/superseded project-state files

Two byte-identical copies of an earlier version of this file exist outside this repo, at
`Deloitte_AI_Infra_Studio_v2/DELOITTE_AI_INFRA_STUDIO_PROJECT_STATE_1.md` and `_2.md` (one
directory up from `infra-studio-v2/`, i.e. outside version control). This file
(`docs/PROJECT_STATE.md`, inside the repo) supersedes both as of 2026-07-05 and should be the
one kept up to date going forward. The two external duplicates were **not modified or deleted**
this session — that's a decision for Sankar to make once this location is confirmed as the
new source of truth (e.g. as part of backlog item 1's git-init work).

---

*Update cadence: append what changed at the end of each session and bump "Last updated." Keep
decisions and open questions current so any session can resume cleanly.*
