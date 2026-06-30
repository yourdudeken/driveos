# DriveOS — Google Drive-Based Task Management

## Overview

DriveOS is a privacy-first, production-grade task management application that uses your personal Google Drive as the sole backend. Zero third-party databases, zero servers, zero tracking — your data lives in your Drive and nowhere else.

---

## Key Features

### Offline-First Sync Engine
- **Incremental Sync**: Drive Changes API detects only what changed — ~90% fewer API calls vs. full re-fetch every cycle.
- **IndexedDB Cache**: Unlimited structured offline storage (4 object stores: tasks, sync, queue, blobs).
- **Offline Mutation Queue**: Create, update, and delete tasks while offline. Changes replay automatically when connectivity returns.
- **Conflict Resolution**: Last-Write-Wins with per-task metadata tracking and conflict event logging.
- **60-Second Polling**: Background sync keeps local state fresh without quota exhaustion.

### User-Owned Storage
- **Decentralized Storage**: Tasks stored as JSON files in your own Google Drive.
- **Native Attachments**: Images, videos, documents in per-task folders under `DRIVEOS/attachments/`.
- **Zero-Server Footprint**: Data moves directly between browser and Google's infrastructure — no intermediate backend.

### AI-Powered Suggestions
- **Smart Completions**: OpenAI `gpt-4o-mini` suggestions for task titles, descriptions, categories, and search (500ms debounced).

### Premium UI/UX
- **Dark-Mode Interface**: Glassmorphism, smooth transitions, vibrant accents.
- **Multi-View**: Grid View and Kanban Board with category filtering.
- **Code-Split**: 23 lazy-loaded chunks — Dashboard loads on demand (93 KB gzip: 27 KB).

### Production Infrastructure
- **Observability**: Structured logger (4 levels, session IDs), error boundaries, toast notifications.
- **Resilience**: Exponential backoff retry wrapper for all Drive API calls (max 3 attempts).
- **Security**: CSP headers, nginx security headers, token expiry tracking with auto re-auth.
- **Containerized**: Docker multi-stage build (Node → nginx), docker-compose, CI/CD pipeline.

---

## Architecture

### Drive Folder Structure
```
User's Google Drive
└── DRIVEOS/
    ├── tasks/                    # JSON task files
    └── attachments/              # Per-task binary folders
```

### Sync Architecture
```
src/sync/
├── syncEngine.ts         # Orchestrator: change detection → pull → merge → persist
├── changeTracker.ts      # Drive Changes API wrapper (incremental, pageToken persisted)
├── conflictResolver.ts   # LWW conflict detection with event logging
├── syncQueue.ts          # Offline mutation queue (IndexedDB-backed)
├── cacheStore.ts         # IndexedDB layer (4 object stores, shared DB connection)
└── searchIndex.ts        # In-memory full-text search (multi-term, case-insensitive)
```

### Data Flow
1. **Auth**: Google OAuth 2.0 (GIS) — token expiry tracked, re-auth triggered automatically.
2. **Local Write**: Optimistic UI update → IndexedDB cache → offline queue (if offline).
3. **Sync**: Drive Changes API detects changes → only reads modified files → resolves conflicts → writes to IndexedDB + Zustand.
4. **Hydration**: On load, reads IndexedDB first (instant), then syncs with Drive (background).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 (TypeScript), `verbatimModuleSyntax` |
| Build | Vite 7, TypeScript project references (`tsc -b`) |
| State | Zustand with `persist` middleware |
| Styling | Tailwind CSS v4 (CSS-based config, `@theme` block) |
| Icons | Lucide React |
| Networking | Axios (Google Drive API v3, OpenAI API) |
| AI | OpenAI `gpt-4o-mini` |
| Auth | Google Identity Services (GIS) OAuth 2.0, `drive.file` scope |
| Sync | Drive Changes API, IndexedDB, offline queue |
| Testing | Vitest + jsdom (15 tests, 3 suites) |
| CI/CD | GitHub Actions, Docker, Docker Compose |
| Serving | nginx (SPA routing, CSP, security headers, gzip) |
| Observability | Structured logger (`DEBUG`/`INFO`/`WARN`/`ERROR` levels) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- Google Cloud Project with Drive API enabled
- OpenAI API key

### 1. Configure Google Cloud
1. Enable Google Drive API in the Google Cloud Console.
2. Create OAuth 2.0 Web Client credentials.
3. Add `http://localhost:5173` to Authorized JavaScript origins.

### 2. Local Setup
```bash
git clone https://github.com/yourdudeken/driveos.git
cd driveos
npm install
cp .env.example .env
# Edit .env with your VITE_GOOGLE_CLIENT_ID and OPENAI_API_KEY
```

### 3. Development
```bash
npm run dev
```

### 4. Production Build
```bash
npm run build
npm run preview        # Serve locally via Vite
# or
docker compose up      # Full production stack via nginx
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at `localhost:5173` |
| `npm run build` | `tsc -b` then `vite build` (23 chunks) |
| `npm run lint` | ESLint flat config on all `**/*.{ts,tsx}` |
| `npm run preview` | Serve production build locally |
| `npm test` | Run Vitest (15 tests, 3 suites) |
| `docker compose up` | Production Docker build via nginx |

---

## Privacy & Security

- **Data Sovereignty**: No backend, no tracking, no analytics — your data stays in your Google Drive.
- **Scoped Access**: Only `drive.file` scope — DriveOS cannot read your private Drive documents.
- **CSP Enforced**: Content-Security-Policy meta tag + nginx headers restrict script sources and inline execution.
- **Token Security**: OAuth token expiry tracked; re-auth triggered 60s before expiry.
- **Input Safety**: All user content rendered safely; no XSS vectors via CSP.

---

## Documentation

| File | Content |
|------|---------|
| `docs/architecture.md` | Module boundaries, data flow, storage layers |
| `docs/sync-engine.md` | Sync engine components, polling, offline behavior, retry policy |
| `docs/security.md` | CSP, token security, hardening checklist |
| `docs/deployment.md` | Vercel, Docker, CI/CD instructions |
| `AGENTS.md` | Onboarding guide for AI coding agents |
| `plan.md` | Full architecture review and implementation roadmap |

---

## License

MIT
