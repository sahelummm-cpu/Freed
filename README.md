# Freed

A mobile-first quit-smoking companion app. Track every smoke-free minute, the
money you save, the health milestones your body reaches, and ride out cravings
with a guided breathing tool.

## Features

- **Home** — live smoke-free timer, money saved, units avoided, life reclaimed
- **Money** — spending projections and custom savings goals
- **Health** — recovery milestones that unlock automatically over time
- **Breathe** — 4-7-8 guided breathing to ride out a craving
- **You** — streak history, personal bests, and relapse-friendly resets

Supports cigarettes, vape/e-cig, and heated tobacco.

## Tech stack

- [React 18](https://react.dev)
- [Vite](https://vitejs.dev) + TypeScript

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build to ./dist
npm run preview  # preview the production build
```

## Deployment

This is a static Vite single-page app. Vercel auto-detects the framework:

- **Build command:** `vite build`
- **Output directory:** `dist`

No environment variables or backend are required — all state lives in the
browser session.
