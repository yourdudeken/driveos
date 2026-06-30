# Architecture

## Overview

DriveOS is a single-page application (SPA) with no backend server. All user data is stored in the user's Google Drive. The application runs entirely in the browser.

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
- Properties and appProperties serve as lightweight metadata indexes
- Drive API permissions resources enable collaborative shared board folder access

**Folder Structure:**
```
DRIVEOS/
├── tasks/           # Personal task JSON files
├── boards/          # Collaborative board folders
│   └── <boardId>/   # Task JSON files belonging to a specific board
└── attachments/     # Per-task attachment folders
    └── <taskId>/
```

### Offline-First

Three-tier storage:
1. **Zustand** (in-memory) — UI state (tasks, active views, boards listing, conflicts queue), instant reactivity.
2. **IndexedDB** (`driveos` database version 2) — persistent cache containing five object stores (`tasks`, `sync`, `queue`, `blobs`, `boards`). Tasks are indexed on `boardId` for separation of spaces.
3. **Google Drive** — source of truth, cross-device sync.

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
                    │ (With Parent │◀────│ Drive API  │
                    │  Filtering)  │     └────────────┘
                    └──────────────┘
```

## Module Boundaries

| Directory | Responsibility |
|-----------|---------------|
| `src/lib/` | Utilities, API clients, retry, logging, permission helpers |
| `src/sync/` | Sync engine, cache store, queue, LWW & pending conflict resolution |
| `src/store/` | Zustand state management (tasks, boards, conflicts) |
| `src/hooks/` | React hooks (auth, AI, sync engine activation) |
| `src/components/` | Reusable UI components (Task modals, Conflict UI, Share board modal) |
| `src/pages/` | Route-level page components (Dashboard, Login, Landing, JoinBoard) |
| `src/types/` | TypeScript type definitions |

## Security

- CSP enforced via meta tag and nginx headers.
- OAuth token held in-memory during session, with incremental consent flows requesting elevated scope only when accessing shared board folders.
- IndexedDB scoped to origin.
- OpenAI API key exposed client-side (required by architecture; restrict key domain in OpenAI dashboard).
