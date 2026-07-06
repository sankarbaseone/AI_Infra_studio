# Deloitte AI Infra Studio

Internal Deloitte AI Infrastructure COE asset. Browser-based sizing, tiered Bill of
Materials, and TCO tool for on-premises AI infrastructure — LLM training and inference.

**Classification:** Internal — Deloitte AI Infrastructure COE asset.
**Data:** runs entirely client-side. No engagement inputs leave the browser.

## What's in v2.0 (this build)

- **Phase 0 — Foundation.** Codebase restructured into a modular layer: reference data
  (`src/data`), calculation engine (`src/lib`), shared UI (`src/components`), and per-tab
  components (`src/tabs`). Git-ready, reproducible, portable across machines.
- **Phase 1 — Tiered Multi-Layer BOM.** The BOM & TCO tab is now a Foundation / Standard /
  Enterprise comparison matrix across seven layers (Training, Inference, Token Processing,
  Storage, Control Nodes, Network Fabric, Concurrent Users), computed live from the same
  sizing engine as the other tabs — not static reference numbers.
- **Vendor toggle** (NVIDIA / AMD) recomputes the entire matrix — a functional neutrality
  guarantee, not just a cosmetic label.
- **Financing comparison**: On-Premises vs Public Cloud vs GPU-as-a-Service vs Colocation,
  3-year total, cheapest option flagged.
- **Unit economics**: cost per 1,000 tokens and cost per inference, tier-by-tier.
- **Workload-type framework** (RAG, fine-tuning, agentic, multi-modal, digital twin, GenAI):
  qualitative planning notes only. Per the roadmap's honesty principle, numeric sizing
  multipliers for these workload types are NOT yet calibrated — that requires real COE
  delivery data and is a named Phase 2 roadmap item. Do not present the current notes as
  quantitative fact in front of a client.
- **Tiered PDF export** on the BOM tab, branded to match.

See `DELOITTE_AI_INFRA_STUDIO_PROJECT_STATE.md` (companion doc) for full project history,
and `AI_Infra_Studio_Roadmap.docx` for the phased plan this build implements.

## Setup

Requires Node.js (version pinned in `.nvmrc`). If you use `nvm`: `nvm use`.

```bash
npm install
```

## Run

```bash
npm run dev        # local dev server, hot reload — http://localhost:5173
npm run build       # production build → dist/
npm run preview     # serve the production build — http://localhost:4173
```

**For demos, always use `npm run preview` (the production build), not `npm run dev`.**

## Project layout

```
src/
├── theme.js               Deloitte brand colors + inlined logo (single source)
├── data/
│   └── reference.js        Hardware, pricing, fabric, storage, tiers — versioned,
│                            each category carries lastReviewed + source
├── lib/
│   ├── calc.js              Pure sizing math: tokens, training, inference, KV-cache
│   ├── tco.js                BOM cost build, financing comparison, unit economics
│   └── format.js             Number/currency formatting helpers
├── components/
│   └── ui.jsx                 Shared presentational primitives (Field, Stat, Chip, etc.)
├── tabs/
│   ├── TokenTab.jsx
│   ├── TrainingTab.jsx
│   ├── InferenceTab.jsx
│   └── TieredBomTab.jsx        The flagship tiered BOM & TCO feature
├── exportBomPdf.js            Tiered BOM PDF export (browser print, no dependencies)
├── App.jsx                    Shell: header, tab nav, footer
└── main.jsx                   Vite entry point
```

## Governance (see companion Roadmap doc, Section 9, for full detail)

- **Reference data** (`src/data/reference.js`) carries a `lastReviewed` date per category
  in `DATA_META`. Review pricing-sensitive categories ahead of any major proposal.
- **Workload multipliers** are Deloitte IP, not vendor fact — they need explicit COE
  ownership and sign-off before being presented as calibrated to a client.
- **Vendor neutrality is a fixed constraint.** Any change that breaks NVIDIA/AMD parity in
  the sizing or BOM logic should be declined or redesigned, not shipped.
- **Every new feature must keep the four tabs working end-to-end.** Before any partner or
  client-facing demo: run `npm run build` clean, then `npm run preview`, and walk all four
  tabs.

## Roadmap

Full phased plan (Phase 0 foundation → Phase 1 quick wins → Phase 2 strategic bets:
AI Data Center Digital Twin, Workload-Aware Sizing Engine, Decision-Grade Financial
Cockpit → Phase 3 future/optional) is documented in the companion Word document
`AI_Infra_Studio_Roadmap.docx`. This build implements Phase 0 in full and the tiered-BOM
slice of Phase 1. Remaining Phase 1 items (scenario save/compare, sensitivity sliders,
CapEx/OpEx table — now partially covered by the financing comparison — carbon accounting)
and all of Phase 2 remain open.

## Migration note (personal → Deloitte laptop)

This project is git-ready: `package.json` + `package-lock.json` are committed, and
`.nvmrc` pins the Node version, so `git clone` + `npm install` should reproduce the build
identically on a new machine. Before migrating, confirm the Deloitte-issued laptop allows
`npm install` against the public npm registry (corporate proxies sometimes block this) —
raise with IT in advance if unsure.
