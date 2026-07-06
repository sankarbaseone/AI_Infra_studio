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

1. Read PROJECT_STATE.md
2. Read README.md
3. Understand current sprint

For every feature

1. Create implementation plan
2. Wait for approval
3. Implement
4. Build project
5. Fix errors
6. Update documentation
7. Update PROJECT_STATE.md

Never skip documentation updates.

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

- PROJECT_STATE.md
- README.md

Whenever calculations change

Update

- Documentation
- Examples

---

# Git Workflow

Never commit automatically.

Always

- explain changes
- summarize affected files
- suggest commit message

Wait for approval before committing.

---

# Communication Style

Explain

- why
- risks
- alternatives

before major changes.
