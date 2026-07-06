# CLAUDE.md

# Deloitte AI Infra Studio

## Mission

This application is an internal Deloitte AI Infrastructure COE engineering tool.

It helps architects size AI infrastructure for:

- LLM Training
- LLM Inference
- AI Factory
- AI Data Centers

It produces:

- Infrastructure sizing
- Bill of Materials (BOM)
- Total Cost of Ownership (TCO)
- Deployment recommendations

This is NOT a commercial software product.

---

# Technology Stack

Frontend

- React 18
- Vite
- JavaScript

Architecture

- Browser-only SPA
- No backend
- No database

Project Structure

- src/data
- src/lib
- src/components
- src/tabs

---

# Engineering Principles

Always

- preserve modular architecture
- write production-quality code
- avoid duplicated logic
- prefer reusable components
- keep calculation logic pure
- never hardcode business rules
- keep vendor neutrality

---

# Development Workflow

Before writing code

1. Read docs/PROJECT_STATE.md
2. Read README.md
3. Understand current sprint

For every feature

1. Create implementation plan
2. Wait for approval
3. Implement
4. Build project
5. Fix errors
6. Update documentation
7. Update docs/PROJECT_STATE.md

Never skip documentation updates.

When a feature is finished, follow the Git Workflow section below — it governs from
build/test through commit and push.

---

# Coding Standards

- Small reusable functions
- No magic numbers
- Meaningful names
- Comments only when necessary
- Keep UI separate from calculations

---

# Testing

Every feature must

- build successfully
- preserve existing functionality
- avoid regressions

---

# Recently Completed

- "Your Configuration" live BOM column (PRODUCT_BACKLOG.md #2 / DECISIONS.md D10) —
  shipped 2026-07-06
- Colocation TCO formula fix — missing `annualSupport` cost (PRODUCT_BACKLOG.md #3) —
  shipped 2026-07-06

Do not re-flag these as open. See `docs/PROJECT_STATE.md` and `docs/CHANGELOG.md` for
detail, including residuals noted as separate open items (e.g. `COLO_PER_KW_MONTH`
recalibration).

---

# Current Priorities

Priority 1

- Scenario Save & Compare

Priority 2

- Sensitivity Analysis

Priority 3

- Digital Twin

Priority 4

- Architecture Recommendation Engine

---

# Files that require synchronization

Whenever architecture changes

Update

- docs/PROJECT_STATE.md
- README.md

Whenever calculations change

Update

- Documentation
- Examples

---

# Git Workflow

When a feature is finished, in order:

1. Run `npm run build`
2. Fix any build errors
3. Run the full test suite
4. Show `git diff` (or a summary of it if large)
5. Generate a professional commit message
6. Commit the changes — committing locally does not require a separate approval step; the
   feature was already approved before implementation started (see Development Workflow)
7. Ask for approval
8. Push to GitHub only after that approval

Never push without explicit approval — push is the step that always needs a fresh yes, even
if committing locally didn't. Never skip steps 1-4 (build/fix/test/diff) before committing,
even if step 6 itself doesn't need a separate approval gate.

Note (2026-07-06): this repo's git history lives in `~/workspace/nydux` (a native Linux
mirror), not the Windows-mounted project path — see `docs/DECISIONS.md` D9 for why. Steps
1-6 run there; step 4's diff and step 6's commit both happen against that location.

---

# Communication Style

Explain

- why
- risks
- alternatives

before major changes.
