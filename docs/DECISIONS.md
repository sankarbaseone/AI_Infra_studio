# Decisions Log — Deloitte AI Infra Studio

Lightweight ADR-style log of decisions that constrain how this tool is built and extended.
Unlike [CHANGELOG.md](./CHANGELOG.md) (what shipped) or [ROADMAP.md](./ROADMAP.md) (what's
planned), this file exists so a future contributor — including a future session of the
current one — knows *why* a constraint exists before "fixing" it away.

Each entry: **Context → Decision → Status → Consequences**.

---

## D1 — Vendor neutrality is a fixed, non-negotiable constraint
**Context:** The tool's entire market credibility rests on being a genuinely independent
sizing instrument. Vendor calculators (NVIDIA, AMD, Dell, cloud) all size toward their own
hardware; that's the exact gap this tool fills (Roadmap §4.2).
**Decision:** Every hardware-comparison feature must render NVIDIA and AMD (and future
vendors) with equal visual and analytical weight. Any change that breaks this parity is
declined or redesigned, not shipped — regardless of who requests it (Roadmap §5, §11).
**Status:** Active, enforced today via `VENDOR_TIER_DEFAULT` recomputing the entire BOM
matrix on toggle — no hardcoded single-vendor path exists in `TieredBomTab.jsx`.
**Consequences:** Any future feature request to visually emphasize one vendor (e.g. a
partner asking to "feature" a preferred vendor) must be declined or reframed. This is called
out explicitly as a named risk in the Roadmap (§11).

---

## D2 — Client data never leaves the browser (no backend by default)
**Context:** The tool is used live in client discovery meetings; the "no data leaves the
browser" claim is itself part of the trust pitch, not an implementation detail.
**Decision:** The app remains client-side only. No feature ships with server persistence
unless it is a deliberate, named architecture decision — never a default side effect of
adding a feature (Roadmap §5, §8).
**Status:** Active. Confirmed in code — no network calls, no backend, `package.json` has
zero server-side dependencies.
**Consequences:** Scenario save/compare ([PRODUCT_BACKLOG.md item 11](./PRODUCT_BACKLOG.md#11-scenario-savecompare-phase-1-remainder))
must default to browser-local storage, not a server, unless a separate decision reopens D2.
Preference order if persistence is ever needed, per Roadmap §8: (1) browser-local storage
scoped per machine, (2) an approved internal Deloitte storage service — requires IT/security
review, (3) a purpose-built backend — highest effort, last resort.

---

## D3 — Fixed tiers (Foundation / Standard / Enterprise) over flexible tiers
**Context:** v1 left "fixed vs flexible tiers" as an open question. The tiered BOM needed to
match a pre-existing internal "PRODUCTION BOM" template exactly for v2.0 delivery.
**Decision:** Ship fixed tiers (Foundation 200-300 / Standard 300-500 / Enterprise 500-800
users) matching the template. Flexible/custom-band tiers logged as a Phase 3 candidate, not
built now (Project State §4).
**Status:** Active — implemented in `data/reference.js` (`TIERS` constant).
**Consequences:** The BOM tab's sizing is intentionally decoupled from a user's specific
concurrency inputs elsewhere in the app (each tier uses its own fixed `usersMid`) — this is
partly *why* the InferenceTab/TieredBomTab disconnect in
[PRODUCT_BACKLOG.md item 2](./PRODUCT_BACKLOG.md#2-fix-tieredbomtab--shared-state-disconnect)
exists, and any fix to that item must preserve the fixed-tier decision rather than silently
reverting to flexible sizing.

---

## D4 — Workload-type multipliers are qualitative only until COE-calibrated
**Context:** Sizing deltas for RAG, fine-tuning, agentic AI, multi-modal, etc. are not
standardized industry formulas. Deloitte's own delivery experience is the only credible
source for real multipliers, and that data does not exist yet in a calibrated form
(Roadmap §6, Phase 2B).
**Decision:** Ship the workload-type framework as qualitative planning notes only, with an
explicit, visible disclaimer (`WORKLOAD_FRAMEWORK_DISCLAIMER`). Do not present these as
calibrated numeric fact to a client under any circumstance until a named COE owner supplies
and signs off on real delivery-data-derived multipliers.
**Status:** Active — enforced in `data/reference.js` (`WORKLOAD_TYPES`) and surfaced with an
amber warning in `TieredBomTab.jsx`.
**Consequences:** [PRODUCT_BACKLOG.md item 14](./PRODUCT_BACKLOG.md#14-workload-type-numeric-multiplier-calibration-phase-2b)
is explicitly gated on an organizational dependency (a COE data owner), not an engineering
one — do not build the numeric version speculatively even if it looks like a quick win.

---

## D5 — No dependencies beyond React
**Context:** Simplicity, portability across machines (including an eventual Deloitte-issued
laptop with possible npm-registry proxy restrictions), and auditability were prioritized
over feature velocity.
**Decision:** `package.json` carries only `react`, `react-dom` as runtime dependencies, and
`vite`/`@vitejs/plugin-react` as dev dependencies. PDF export uses the browser's native print
dialog instead of a PDF library. No charting, state-management, or UI-kit library is used.
**Status:** Active as of v2.0.
**Consequences:** Any proposal to add a dependency (e.g. a charting library for the Digital
Twin, Roadmap Phase 2A) should be a deliberate, explicit decision — not an incidental `npm
install`. This decision should be revisited (not silently overridden) when Phase 2A
scoping happens, since SVG/Canvas rendering may still keep it dependency-free per the
Roadmap's own approach note (§6, Phase 2A).

---

## D6 — Modular architecture adopted ahead of Digital Twin / Financial Cockpit
**Context:** The v1 implementation was a single well-organized file — the right shape for a
four-tab calculator, not for a tool growing a visual pillar and a financial-modeling pillar.
**Decision:** Phase 0 refactored into the `data / lib / components / tabs` layering described
in [ARCHITECTURE.md](./ARCHITECTURE.md), specifically so Phase 2 features have a structure to
grow into rather than requiring a second refactor later (Roadmap §7 — "pay down complexity
early").
**Status:** Complete as of v2.0.
**Consequences:** New tabs (Digital Twin, Financial Cockpit) should be added as new files
under `src/tabs/`, consuming `src/lib/*` and `src/data/*` — not by growing the existing tab
files or duplicating calculation logic locally.

---

## D7 — PDF export via browser print, no PDF-generation library
**Context:** Consistent with D5 (no dependencies). A client-facing branded export was needed
without adding a rendering dependency.
**Decision:** Build the export as a hand-constructed HTML string opened in a new window via
`window.open` + `window.print()`, styled inline to match the Deloitte brand.
**Status:** Active — `src/exportBomPdf.js`.
**Consequences:** The HTML-string table and the on-screen JSX table are two independent
representations of the same data and can drift — tracked as
[PRODUCT_BACKLOG.md item 9](./PRODUCT_BACKLOG.md#9-refactor-pdf-export-to-share-rendering-logic-with-the-on-screen-matrix).
Revisiting D7 (e.g. adopting a PDF library) would need to weigh that drift risk against D5's
dependency-avoidance preference.

---

## D8 — Reference data is versioned with `lastReviewed` + `source` per category
**Context:** Hardware specs, pricing, and cloud rates move quickly; stale data caught by a
client mid-meeting is a named credibility risk (Roadmap §9.2, §11).
**Decision:** Every category in `data/reference.js` carries a `DATA_META` entry with
`lastReviewed` and `source`. This is a governance hook, not just documentation — reviewed
ahead of any major proposal use.
**Status:** Active, but currently passive — the app displays the date via
`DataFreshnessNote` but does not actively warn when data exceeds a staleness threshold. See
[PRODUCT_BACKLOG.md item 6](./PRODUCT_BACKLOG.md#6-configurable-currency-rate--live-data-staleness-enforcement).
**Consequences:** Any new reference-data category added (e.g. carbon-intensity factors for
[PRODUCT_BACKLOG.md item 13](./PRODUCT_BACKLOG.md#13-carbon-accounting-phase-1-remainder))
must include a `DATA_META` entry from day one — this is not optional per Roadmap §5
("Deterministic, sourced, versioned reference data").

---

## D9 — Reversible, git-based development (declared, not yet executed)
**Context:** The tool is developed by a single person across sessions and machines; Roadmap
§5 names git-based development as a fixed principle specifically to de-risk that bottleneck
(Roadmap §11).
**Decision:** Every change should be committed with a clear message; the tool should be
reproducible via clone + install, not manual file copying.
**Status:** RESOLVED 2026-07-06. Discovered that the repo's canonical location — a
Windows-mounted DrvFS path (`/mnt/c/...`) — cannot support git writes from WSL at all: git's
lockfile mechanism calls `chmod` on `.git/*.lock` files for every write operation (`init`,
`add`, `commit`), and DrvFS mounted without the `metadata` option rejects every `chmod` call
categorically. This is not fixable by choosing a different git command.

**Resolution actually adopted (superseding the initial plan):** Sankar asked Claude Code to
perform the commit directly rather than doing it himself on Windows. Since WSL can't write
git objects to the `/mnt/c/...` path at all, **the git repository was initialized in the
native Linux mirror, `~/workspace/nydux`, instead** — first commit `fd03284`, remote
`https://github.com/sankarbaseone/AI_Infra_studio` added. This means:
- **`~/workspace/nydux` is now the actual git-tracked, canonical repo.** The Windows-mounted
  `/mnt/c/.../infra-studio-v2` folder has no `.git` and cannot get one from WSL — it must be
  kept in sync via plain-file copy (the existing `cp --no-preserve=mode,...` pattern) after
  each commit, or accepted as a non-canonical working copy for Windows-side editors.
- Pushing requires GitHub credentials (a Personal Access Token), which are not present in
  this environment — Sankar runs `git push` himself from a WSL terminal for now.
- Future features: Claude Code edits source in the Windows-mounted path (for Windows-editor
  visibility) *and* keeps `~/workspace/nydux` in sync, running git commits from the mirror
  after approval — per `CLAUDE.md`'s Git Workflow, still proposing the message and waiting
  for approval before committing, just executing the actual commit itself now (from the
  mirror) rather than handing every commit to Sankar.

**Consequences:** Any doc or workflow note written before 2026-07-06 that says "Sankar runs
git on Windows" is superseded by this. The dual-location sync (Windows path for editing/
Windows tools, Linux mirror for git/build/test) is now the standing model — see
`PROJECT_STATE.md`'s environment note for the operational detail.

---

## D10 — Fixed-tier sizing overrides live inference config in the BOM tab (byproduct of D3)
**Context:** Documented here separately from D3 because it reads, on first encounter, like a
bug rather than a decision — worth being explicit that it is a consequence of D3, not an
oversight, even though the InferenceTab's own UI copy ("flows into the BOM & TCO tab")
currently overstates what actually happens.
**Decision:** Until a product decision resolves
[PRODUCT_BACKLOG.md item 2](./PRODUCT_BACKLOG.md#2-fix-tieredbomtab--shared-state-disconnect),
treat the BOM tab's independence from `shared` state as intentional (per D3), and treat the
InferenceTab copy as the actual defect to fix — not the BOM tab's fixed-tier math.
**Status:** Open — flagged for a deliberate decision, not a silent patch either way.
**Consequences:** Whoever picks up backlog item 2 should re-read D3 first so the fix doesn't
inadvertently revert the fixed-tier decision.
