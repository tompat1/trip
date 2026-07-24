# TRIP

Travel Planner Deluxe for `trip.rynell.org`.

## Enrichment Migration

The location-agnostic enrichment layer now exposes normalized contracts for
place profiles, facts, images, sources, provider status and editorial content in
`src/enrichment/schemas.js`.

The UI should use `src/enrichment/enrichmentService.js` as its boundary instead
of importing individual provider modules directly. This keeps the current
frontend working while preparing the same contract for the future Cloudflare
Worker API.

Backend direction: Cloudflare Workers + D1/KV/R2. See
`docs/cloudflare-backend-path.md`.

## Cloudflare Deployment

Preferred Cloudflare Pages settings for the current Vite MVP:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

If deploying through Wrangler/Workers static assets instead, use:

```bash
npm run deploy
```

The repository includes `wrangler.jsonc` with `assets.directory` set to
`./dist` and SPA fallback enabled.

---

# Agentic Workspace Boilerplate

This repository serves as a template for setting up a structured pair-programming workspace optimized for agentic coding models (like Claude, Gemini, etc.) using the **3-Layer Architecture** and a **Multi-Model Routing Strategy**.

## 🏗️ Structure Overview

```
.
├── .agents/
│   └── AGENTS.md           # Core agent instructions & persona triggers
├── directives/
│   └── README.md           # Layer 1: Standard Operating Procedures (SOPs)
├── execution/
│   └── README.md           # Layer 3: Deterministic execution scripts (Python)
├── .tmp/
│   └── .gitkeep            # Untracked workspace directory for intermediate files
├── .env.example            # Environment variables baseline
└── .gitignore              # Preconfigured Git ignore patterns
```

## 🚀 How to Use This Template

1. Click **"Use this template"** on GitHub to create your new repository.
2. Clone your new repository locally.
3. Configure your local `.env` by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Define your project goals in `directives/` and write automation scripts in `execution/`.
5. Start pair programming! The agent will automatically read `.agents/AGENTS.md` (or standard model configuration files) to follow the multi-model routing strategy and operating principles.
