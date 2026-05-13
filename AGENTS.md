# CloudTodo — Agent Guide

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server at `http://localhost:5173` |
| `npm run build` | Run `tsc -b` (project references) then `vite build` |
| `npm run lint` | ESLint flat config on all `**/*.{ts,tsx}` (skips `dist`) |
| `npm run preview` | Serve production build locally |

No test framework is configured. There is no `typecheck`-only script.

## Setup

1. Enable Google Drive API in a Google Cloud project and create OAuth 2.0 Web Client credentials.
2. Add `http://localhost:5173` to Authorized JavaScript origins in the Google Cloud Console.
3. Copy `.env.example` to `.env` and set both `VITE_GOOGLE_CLIENT_ID` and `VITE_OPENAI_API_KEY`.

## Architecture

- **Entry**: `src/main.tsx` → `App.tsx`. React Router serves routes:
  - Public: `/` (Landing), `/login`, `/privacy`, `/terms`, `/features`, `/how-it-works`, `/product`, `/company`, `/desktop`
  - Protected: `/dashboard` (wrapped by `ProtectedRoute` — redirects to `/login` if unauthenticated)
- **State**: Zustand stores with `persist` middleware (localStorage keys: `auth-storage`, `tasks-storage`)
  - `authStore` — user session, logout
  - `tasksStore` — CRUD, view mode, category filter; polls Google Drive every 30s for sync
- **Backend**: Google Drive API v3 via Axios (no app server). Folder structure: `CLOUDTODO/tasks/` (JSON files) and `CLOUDTODO/attachments/`. All tasks are personal (no collaboration).
- **Auth**: Google Identity Services (GIS) OAuth 2.0 loaded from `https://accounts.google.com/gsi/client` in `index.html`. Scope is `drive.file` + profile + email.
- **AI Suggestions**: OpenAI `gpt-4o-mini` via `src/lib/openai.ts`. Hook `useAISuggestions` (debounced 500ms) and `AISuggestions` dropdown component integrated into task title, description, categories, and search inputs.

## Conventions & Quirks

- **`@/` path alias**: `vite.config.ts` maps `@` to `src/`; tsconfig paths also configured. All local imports use this (`import { X } from '@/foo'`).
- **`verbatimModuleSyntax`**: true — use `import type` for type-only imports, or the compiler errors.
- **`erasableSyntaxOnly`**: true in tsconfig — no legacy emit-only decorator syntax.
- **Tailwind CSS v4**: uses `@import "tailwindcss"` in CSS (not `@tailwind` directives). Custom tokens (`@theme` block) in `src/index.css`. No `tailwind.config.js` — config is CSS-based.
- **`cn()` utility** (`src/lib/utils.ts`): wraps `clsx` + `tailwind-merge`. Use for all conditional class merging.
- **UI primitives** in `src/components/ui/` (Radix + CVA variants). Button, Dialog, Input, Label. Pages in `src/pages/`.
- **Build**: `tsc -b` uses TypeScript project references (`tsconfig.app.json` + `tsconfig.node.json`). Errors halt the build before Vite runs.
- **Vercel deployment**: `vercel.json` rewrites all paths to `/index.html` (SPA). Set `VITE_GOOGLE_CLIENT_ID` and `VITE_OPENAI_API_KEY` in Vercel env vars and update OAuth redirect URIs for production domain.
