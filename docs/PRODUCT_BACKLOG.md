# Engineering Backlog — Deloitte AI Infra Studio

Sorted in recommended implementation order. Cross-references
[ARCHITECTURE.md](./ARCHITECTURE.md) for where each item lives in the codebase,
[DECISIONS.md](./DECISIONS.md) for constraints that shape *how* an item should be built, and
[ROADMAP.md](./ROADMAP.md) for the business-level phase each item belongs to.

---

### 1. Initialize git repository + first commit
- **Status:** Done (instructions handed off 2026-07-05/06 — see below) — Sankar runs git
  directly on Windows, since git's lockfile mechanism calls `chmod` on every write
  (`init`/`add`/`commit`, not just `init`), which fails categorically on the `/mnt/c` DrvFS
  mount from WSL. This is a bigger constraint than originally scoped here (originally assumed
  only `npm install` was affected). Remote: `https://github.com/sankarbaseone/AI_Infra_studio`.
- **Priority:** Critical
- **Business value:** Every other change below is currently unversioned — one bad edit or
  accidental overwrite loses work permanently. Highest-leverage, lowest-cost action
  available. Also the one still-open item from Roadmap Phase 0 (see
  [ROADMAP.md §6](./ROADMAP.md#phase-0--foundation-hardening-blocking-prerequisite)) and
  [DECISIONS.md D9](./DECISIONS.md#d9).
- **Technical complexity:** Trivial
- **Estimated effort:** <30 min
- **Files affected:** Whole repo (`git init`, initial commit); `.gitignore` already exists
  and is correct
- **Risks:** None — purely additive. Confirmed no `.git` directory exists yet.
- **Dependencies:** None — do this before touching anything else

---

### 2. Fix TieredBomTab / `shared` state disconnect
- **Priority:** Critical
- **Business value:** InferenceTab's UI explicitly tells the user "flows into the BOM & TCO
  tab," but `TieredBomTab.jsx` never reads `shared` — it recomputes its own sizing from
  tier-fixed `usersMid` and its own local model/precision inputs. In a live client discovery
  workshop (the app's actual use case), a consultant who configures Inference carefully and
  expects it to inform the BOM tab is showing numbers that quietly ignore that work. Direct
  client-credibility exposure. **Read [DECISIONS.md D3 and D10](./DECISIONS.md#d3) before
  touching this** — the BOM tab's independence from live inference config may be intentional
  (fixed-tier decision), in which case the actual defect is the InferenceTab's copy, not the
  BOM tab's math.
- **Technical complexity:** Low–Medium — requires a product decision on intended behavior
  before implementation.
- **Estimated effort:** 0.5–2 days depending on which fix is chosen
- **Files affected:** `src/tabs/TieredBomTab.jsx`, `src/tabs/InferenceTab.jsx`, possibly
  `src/App.jsx` (shared shape)
- **Risks:** If fixed by wiring InferenceTab values into the tiered matrix, it may conflict
  with the fixed-tier design decision (D3) — needs a decision, not just a patch.
- **Dependencies:** None blocking, but should land before any further BOM-tab feature work
  (items 7, 11, 12) to avoid building on top of a known-wrong data path

---

### 3. Add automated test suite for the calculation engine
- **Status:** Done (2026-07-06) — `src/lib/calc.test.js` (16 tests) and `src/lib/tco.test.js`
  (12 tests), 28 tests total, all passing, via Vitest. Includes the validated ~154-day
  training-time anchor regression from `PROJECT_STATE.md`. Zero changes to `calc.js`/`tco.js`
  themselves — this was pure test-writing against existing behavior. `npm run build` reconfirmed
  clean (41 modules, same output size) after the change.
- **Priority:** Critical
- **Business value:** `lib/calc.js` and `lib/tco.js` are pure functions with zero test
  coverage, yet they are the actual IP the tool sells on. Correctness currently rests
  entirely on manual spot-checks (the "70B/2T/128×H100/50% → ~154 days" anchor and a
  NaN/undefined text scan noted in `PROJECT_STATE.md`) — neither catches a regression in
  KV-cache math, MFU-band stacking, or memory-vs-throughput constraint selection.
- **Technical complexity:** Low — functions are already pure and framework-free, ideal for
  unit testing; no mocking needed.
- **Estimated effort:** 2–3 days for meaningful coverage of `calc.js`/`tco.js` (Vitest is the
  natural fit given Vite is already the build tool)
- **Files affected:** New `src/lib/*.test.js` files, `package.json` (add `vitest`
  devDependency + `test` script), possibly `vite.config.js`
- **Risks:** Low risk to add; the risk is in *not* having it once items 4, 6, 14 below start
  changing the same formulas
- **Dependencies:** None; ideally lands before item 4 so the magic-number extraction can be
  verified against known-good outputs

---

### 4. Extract magic numbers into `data/reference.js` as named, versioned constants
- **Priority:** High
- **Business value:** `calc.js`/`tco.js` currently hardcode `18` (Adam bytes/param and
  continuous-batching multiplier — two *different* uses of the same literal, easy to
  confuse), `0.85` (usable HBM fraction), `1.2` (inference memory overhead), `12000` (rack
  cost/node). Every other pricing-sensitive number lives in `reference.js` with a
  `lastReviewed`/`source` tag (per [DECISIONS.md D8](./DECISIONS.md#d8)); these don't, so
  they're invisible to the governance process the README describes and can't be tuned
  without a code change.
- **Technical complexity:** Low — mechanical extraction, no logic change
- **Estimated effort:** 1 day
- **Files affected:** `src/data/reference.js`, `src/lib/calc.js`, `src/lib/tco.js`
- **Risks:** Purely refactoring — the test suite from item 3 should run before/after to
  confirm zero behavior change
- **Dependencies:** Item 3 (tests) strongly recommended first, to catch any accidental value
  drift during extraction

---

### 5. Input validation / guardrails on numeric fields
- **Priority:** High
- **Business value:** `NumIn` (in `components/ui.jsx`) passes raw `Number(e.target.value)`
  straight into calculations with no floor/ceiling/NaN guard. A zero or negative entry in
  fields like GPU count, tokens, or context window can silently produce
  `Infinity`/`NaN`/divide-by-zero results — exactly the failure mode most damaging in front
  of a live client, since the whole pitch is "rigorous answer in minutes."
- **Technical complexity:** Low — clamp/validate at the `NumIn` component level and/or at
  calc-function boundaries
- **Estimated effort:** 1–2 days
- **Files affected:** `src/components/ui.jsx` (`NumIn`), possibly `src/lib/calc.js`/`tco.js`
  guard clauses
- **Risks:** Over-aggressive clamping could mask legitimate edge-case inputs a consultant
  wants to explore (e.g., testing a 0-user scenario) — needs sensible min bounds, not just
  "reject bad input"
- **Dependencies:** None

---

### 6. Configurable currency rate + live data-staleness enforcement
- **Priority:** High
- **Business value:** `USD_INR = 83.5` is hardcoded in `reference.js`; `DATA_META.lastReviewed`
  dates exist but nothing in the app actively warns when a category is stale beyond a
  passive footnote (see [DECISIONS.md D8](./DECISIONS.md#d8)). Roadmap §9.2 calls for a
  review cadence — the tool should actively flag staleness, not rely on a human remembering
  to read a caption.
- **Technical complexity:** Medium — currency: simple input field; staleness: needs a
  date-diff check against current date, surfaced as a visible warning (not just the current
  passive `DataFreshnessNote`)
- **Estimated effort:** 2 days
- **Files affected:** `src/data/reference.js`, `src/components/ui.jsx`
  (`DataFreshnessNote`), `src/tabs/TieredBomTab.jsx`
- **Risks:** Low
- **Dependencies:** None

---

### 7. Resolve the "vital DC input" discovery-panel decision
- **Priority:** Medium
- **Business value:** Flagged as an explicitly open decision in `PROJECT_STATE.md` §4 —
  whether discovery inputs should be a dedicated guided intake step versus staying spread
  across the BOM tab's input grid. Shapes the live-workshop UX the tool is built for; worth
  resolving deliberately rather than accreting more fields onto the existing grid
  indefinitely.
- **Technical complexity:** Medium — likely a new intake component/step, possibly a
  routing/step-state change in `App.jsx`
- **Estimated effort:** 3–5 days once direction is chosen
- **Files affected:** `src/App.jsx`, `src/tabs/TieredBomTab.jsx`, new component under
  `src/components/` or `src/tabs/`
- **Risks:** Scope creep — could balloon into a larger redesign; recommend timeboxing the
  decision itself before estimating build effort
- **Dependencies:** Item 2 (fix the data-flow bug first, so a new intake panel isn't built on
  top of a known-broken carry-forward path)

---

### 8. Add a lightweight schema for `shared` cross-tab state
- **Priority:** Medium
- **Business value:** `shared` is a flat, untyped object mutated via spread across three
  tabs with no schema — nothing prevents a future tab from silently depending on a key
  another tab doesn't always set. This is exactly the class of bug item 2 exposed; a schema
  (or minimal TypeScript adoption) would have caught it at build time instead of requiring
  manual reading.
- **Technical complexity:** Medium — either introduce PropTypes/runtime checks (lower effort)
  or migrate to TypeScript (higher effort, higher long-term payoff)
- **Estimated effort:** 1 day (PropTypes) to 1–2 weeks (full TS migration for a codebase this
  size)
- **Files affected:** `src/App.jsx`, all `src/tabs/*.jsx`, potentially every file if full TS
  migration is chosen
- **Risks:** Full TS migration is a large-surface change for a ~900-line app — proportionality
  matters; a lighter runtime-validation approach is likely better ROI given current size
- **Dependencies:** None strictly, but doing this after item 2 means the schema reflects
  corrected behavior, not the current bug

---

### 9. Refactor PDF export to share rendering logic with the on-screen matrix
- **Priority:** Medium
- **Business value:** `exportBomPdf.js` hand-builds an HTML string that duplicates the same
  7-layer matrix `TieredBomTab.jsx` renders in JSX (see
  [DECISIONS.md D7](./DECISIONS.md#d7)). Any future change to a layer's content requires
  manually updating two separate representations — a guaranteed drift risk given the two are
  already slightly different in structure.
- **Technical complexity:** Medium — extract a shared "layer definitions" data structure that
  both the JSX table and the PDF string consume
- **Estimated effort:** 2–3 days
- **Files affected:** `src/tabs/TieredBomTab.jsx`, `src/exportBomPdf.js`
- **Risks:** Must preserve the exact current PDF branding/layout — this is a client-facing
  deliverable, so visual regression should be manually checked, not assumed
- **Dependencies:** None, but cheaper to do after item 2/7 land so it isn't done twice

---

### 10. Improve PDF export reliability (remove magic-number print timeout)
- **Priority:** Low
- **Business value:** The current `setTimeout(() => w.print(), 400)` is a race against the
  new window's render, not a confirmed-ready signal — on a slow machine or large table, print
  could fire before layout completes, producing a broken export mid-client-demo.
- **Technical complexity:** Low — swap for an `onload` handler on the written document, or a
  `requestAnimationFrame` chain
- **Estimated effort:** 0.5 day
- **Files affected:** `src/exportBomPdf.js`
- **Risks:** Minimal
- **Dependencies:** Best bundled with item 9 since both touch the same file

---

### 11. Scenario save/compare (Roadmap Phase 1 remainder)
- **Priority:** Medium
- **Business value:** Named directly in [ROADMAP.md Phase 1](./ROADMAP.md#phase-1--quick-wins-high-impact-low-to-medium-effort-builds-on-existing-4-tabs)
  as still open. Lets a consultant save multiple client scenarios and compare them side by
  side — directly useful in the discovery-workshop use case.
- **Technical complexity:** Medium — needs a persistence layer and a comparison UI
- **Estimated effort:** 1 week
- **Files affected:** New `src/lib/scenarios.js` (or similar), `src/tabs/TieredBomTab.jsx`,
  possibly `src/App.jsx`
- **Risks:** Must respect [DECISIONS.md D2](./DECISIONS.md#d2) — "client data never leaves
  the browser." `localStorage` fits that; any temptation to add cloud sync later would break
  D2 and needs explicit sign-off (Roadmap §8 preference order).
- **Dependencies:** Item 8 (a state schema) makes this meaningfully safer to build

---

### 12. Sensitivity sliders (Roadmap Phase 1 remainder)
- **Priority:** Medium
- **Business value:** Also named as open in Roadmap Phase 1 — lets a consultant show live
  "what if MFU/utilization/context window changes" without re-typing numbers, using the
  already-fast, already-pure calc engine.
- **Technical complexity:** Low-Medium — mostly a UI affordance (`<input type="range">`)
  wired to existing state; the calc engine underneath needs no changes since it's already
  reactive
- **Estimated effort:** 3–4 days
- **Files affected:** `src/components/ui.jsx` (new `Slider` primitive),
  `src/tabs/TrainingTab.jsx`, `src/tabs/InferenceTab.jsx`, `src/tabs/TieredBomTab.jsx`
- **Risks:** Low
- **Dependencies:** None, but natural to pair with item 11

---

### 13. Carbon accounting (Roadmap Phase 1 remainder / feeds Phase 2C)
- **Priority:** Low
- **Business value:** Third named Phase 1 remainder item; increasingly relevant for client
  ESG conversations, and a direct input to the Phase 2C Financial Cockpit's carbon-accounting
  view.
- **Technical complexity:** Medium — needs a new reference-data category (grid carbon
  intensity by region) and a new derived metric alongside power/cost
- **Estimated effort:** 3–5 days
- **Files affected:** `src/data/reference.js` (new category + `DATA_META` entry per
  [DECISIONS.md D8](./DECISIONS.md#d8)), `src/lib/tco.js`, `src/tabs/TieredBomTab.jsx`
- **Risks:** Carbon-intensity figures are region/time-sensitive and easy to get stale or
  wrong — needs the same "indicative, validate before client use" disclaimer discipline
  already applied elsewhere
- **Dependencies:** Item 6 (staleness enforcement) should land first so this new data
  category isn't immediately another silent-staleness risk

---

### 14. Workload-type numeric multiplier calibration (Roadmap Phase 2B)
- **Priority:** Low (from an engineering standpoint — it's externally blocked, not
  technically hard)
- **Business value:** Turning the 6 qualitative workload chips into real multipliers would
  materially increase sizing accuracy for non-baseline workloads — but per
  [DECISIONS.md D4](./DECISIONS.md#d4), this requires COE-owned delivery data that doesn't
  exist yet.
- **Technical complexity:** Low once data exists (just new multiplier constants + a
  calc-engine hook); the hard part is entirely non-engineering
- **Estimated effort:** 1–2 days of engineering work once calibrated data is supplied;
  indeterminate lead time to obtain that data
- **Files affected:** `src/data/reference.js` (`WORKLOAD_TYPES`), `src/lib/calc.js` or
  `tco.js` (apply multiplier)
- **Risks:** The named risk in Roadmap §11 itself — shipping this before real calibration
  data would mean presenting Deloitte IP guesses as vendor-grade fact to a client. **Do not
  build the numeric version speculatively.**
- **Dependencies:** Blocked on a COE data-owner being identified and delivery data being
  supplied (Roadmap §9.3) — an organizational dependency, not a technical one

---

### 15. AI Data Center Digital Twin (Roadmap Phase 2A strategic bet)
- **Priority:** Low (strategic, not urgent relative to items above)
- **Business value:** The largest named remaining strategic bet — an interactive visual
  layer over the sizing engine. High potential differentiation value ("the single feature
  most likely to make a partner say 'I haven't seen anything like this'" per the Roadmap)
  but large scope.
- **Technical complexity:** High — a substantial new visualization subsystem; the Roadmap
  suggests SVG/Canvas to stay dependency-free (consistent with
  [DECISIONS.md D5](./DECISIONS.md#d5))
- **Estimated effort:** Multi-week; needs its own design/scoping pass before estimation is
  meaningful
- **Files affected:** Likely a new `src/tabs/DigitalTwinTab.jsx` plus supporting lib/data
  modules; a dependency addition would require revisiting D5 explicitly
- **Risks:** Must stay "illustrative, not a thermal/electrical simulation" (Roadmap §11) to
  avoid overstating certainty. Biggest scope item on this list; should not be started until
  Critical/High items above are settled.
- **Dependencies:** Should follow all Critical/High items above; likely also benefits from
  item 11 (scenario save) existing first

---

### 16. Decision-Grade Financial Cockpit (Roadmap Phase 2C strategic bet)
- **Priority:** Low (strategic)
- **Business value:** Moves the tool from "technical sizing aid" to "board-presentation
  input" — sensitivity/tornado analysis, carbon accounting, board-pack business case export.
- **Technical complexity:** Medium-High, depends heavily on scoping — needs a definition pass
  before real estimation
- **Estimated effort:** Multi-week, pending scoping
- **Files affected:** `src/lib/tco.js`, `src/tabs/TieredBomTab.jsx`, likely new components
- **Risks:** [DECISIONS.md D1 and D5](./DECISIONS.md#d1) apply — any modeling library
  considered must not skew NVIDIA/AMD parity
- **Dependencies:** Items 11 and 12 (scenario/sensitivity) are natural building blocks;
  should follow them; item 13 (carbon accounting) feeds directly into this

---

## Summary of recommended sequencing logic

1. **Items 1–5** first: cheap, protect against active correctness/reliability risk, and every
   later item is safer to build once they're done (git safety net, a known-good data-flow, a
   test harness, no more magic numbers, no more NaN-in-front-of-a-client risk).
2. **Items 6–10** next: governance and structural cleanup that reduce ongoing risk as the app
   grows, before adding more surface area.
3. **Items 11–13** are the named Roadmap Phase 1 remainder — straightforward additive
   features once the foundation is solid.
4. **Items 14–16** are Roadmap Phase 2 strategic bets — correctly gated by either an external
   data dependency (14) or by needing the Phase 0/1 foundation to be stable first (15, 16).
