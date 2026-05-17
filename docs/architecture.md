# Architecture

## Overview

CloudTodo is a single-page application (SPA) with no backend server. All user data is stored in the user's Google Drive. The application runs entirely in the browser.

## Key Design Decisions

### No Backend Server

All Drive API calls are made directly from the browser using OAuth 2.0 tokens. This means:
- Zero server costs
- No user data on third-party infrastructure
- No database to manage
- Full data portability

### Drive as Storage Layer

- Google Drive folders replace database collections
- JSON files replace database documents
- Properties and appProperties serve as lightweight indexes
- Drive API permissions enable sharing (future)

**Folder Structure:**
```
CLOUDTODO/
├── tasks/           # Task JSON files
└── attachments/     # Per-task attachment folders
    └── <taskId>/
```

### Offline-First

Three-tier storage:
1. **Zustand** (in-memory) — UI state, instant reactivity
2. **IndexedDB** (`cloudtodo` database) — persistent cache, offline queue
3. **Google Drive** — source of truth, cross-device sync

### Sync Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  User Action │────▶│ Optimistic   │────▶│ IndexedDB  │
│  (UI)        │     │ Update       │     │ Cache      │
└─────────────┘     └──────────────┘     └────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Sync Queue   │ (offline path)
                    └──────────────┘
                           │ (online)
                           ▼
                    ┌──────────────┐     ┌────────────┐
                    │ Sync Engine  │────▶│ Google     │
                    │              │◀────│ Drive API  │
                    └──────────────┘     └────────────┘
```

## Module Boundaries

| Directory | Responsibility |
|-----------|---------------|
| `src/lib/` | Utilities, API clients, retry, logging |
| `src/sync/` | Sync engine, cache store, queue, conflict resolution |
| `src/store/` | Zustand state management |
| `src/hooks/` | React hooks (auth, AI, sync) |
| `src/components/` | Reusable UI components |
| `src/pages/` | Route-level page components |
| `src/types/` | TypeScript type definitions |

## Security

- CSP enforced via meta tag and nginx headers
- OAuth token held in-memory during session
- IndexedDB scoped to origin
- OpenAI API key exposed client-side (required by architecture; restrict key domain in OpenAI dashboard)
