# CloudTodo — Production-Grade Architecture Plan

## 1. Executive Summary

### Current Architecture
Single-page React application using Google Drive API v3 as the sole backend. Zustand with `persist` middleware for state. No app server, no database, no WebSocket infrastructure.

### Critical Weaknesses

| Area | Issue | Severity |
|------|-------|----------|
| **Sync** | Poll-based (30s interval); no incremental sync; re-fetches ALL tasks every cycle | High |
| **Offline** | No offline support; localStorage is the only cache (limited to 5-10MB) | Critical |
| **Auth** | OAuth token stored in localStorage without refresh mechanism; token expiry breaks Drive calls silently | High |
| **Error Handling** | Bare `console.error` calls; no retry logic; no error boundaries | High |
| **Observability** | Zero structured logging; no metrics; no error tracking | High |
| **API Quota** | No Drive API quota management; `listTasks` reads every file individually (N+1) | Critical |
| **Security** | No CSP headers; OpenAI API key exposed client-side; no input sanitization | High |
| **Performance** | Virtual scrolling absent; entire task list re-renders on every change | Medium |
| **Testing** | Zero tests | Critical |
| **Collaboration** | Removed in prior pass; no sharing infrastructure remains | N/A |

### Production Blockers
1. Sync degrades to O(n) Drive API calls where n = number of tasks (one read per file in `listTasks`)
2. localStorage caps at ~5MB — impossible for attachments or large task sets
3. Token expires after 1 hour with no refresh → silent failures
4. No offline access → app is unusable without connectivity
5. OpenAI key in client bundle — trivial to extract

---

## 2. Implementation Roadmap

### Phase 1: Foundations (This Session)
- [x] Remove stale files (`tailwind.config.js`, `guide.md`)
- [x] Remove collaboration code (comments, permissions, taskType)
- [x] Add AI suggestions (OpenAI integration)
- [ ] Drive sync engine rewrite (batch reads, change tracking, quota management)
- [ ] IndexedDB offline cache layer
- [ ] Token refresh pipeline
- [ ] Structured logging + error boundaries
- [ ] Retry with exponential backoff
- [ ] CI/CD (GitHub Actions + Docker)

### Phase 2: Production Hardening (Next)
- [ ] E2E encryption for task content
- [ ] Real-time sync via Drive webhook polling (changes.changes API)
- [ ] Conflict resolution UI
- [ ] Bundle optimization + code splitting
- [ ] Automated testing suite
- [ ] Mobile-responsive audit
- [ ] Accessibility audit

### Phase 3: Scale (Future)
- [ ] Optional lightweight backend (Edge functions for webhook handling)
- [ ] Multi-workspace support
- [ ] Team collaboration (re-add with proper architecture)
- [ ] Public API layer
- [ ] Desktop app wrapper (Tauri)

---

## 3. Architecture Decisions

### 3.1 Sync Engine
**Problem**: `listTasks` calls the Drive search API, gets file IDs, then calls `readFile` N times (N+1 pattern). At 100 tasks, that's 101 Drive API calls per poll cycle.

**Solution**: Replace with Drive Changes API for incremental sync + cache local task metadata.

**Implementation**:
```
src/sync/
├── syncEngine.ts        # Orchestrator: change detection → pull → merge → persist
├── changeTracker.ts     # Drive Changes API wrapper, stores pageToken
├── conflictResolver.ts  # Last-write-wins with local timestamp tracking
├── syncQueue.ts         # Queued mutations for offline -> online replay
└── cacheStore.ts        # IndexedDB wrapper for task + metadata storage
```

**Quota Optimization**:
- Use `files.list` with `fields=files(id, modifiedTime, name)` for change detection (cheap)
- Only read full content for files whose `modifiedTime` changed
- Use `appProperties` for metadata indexing to avoid reading all files

### 3.2 Offline-First
**Problem**: localStorage persist (5MB cap) + no offline write queue.

**Solution**: IndexedDB via `idb-keyval` wrapper for structured data.

**Storage Strategy**:
```
IndexedDB Database: cloudtodo
├── tasks       → Task[]           (key: task.id)
├── metadata    → SyncMetadata     (key: 'sync')
├── queue       → SyncMutation[]   (key: auto-increment)
└── cache       → CacheEntry[]     (key: url path)
```

### 3.3 Token Security
**Problem**: `accessToken` stored in Zustand persist (localStorage). No refresh mechanism.

**Solution**: GIS implicit flow already provides one-hour tokens. Add:
- Token expiry tracking using `expires_in` from the token response
- Auto-refresh via `google.accounts.oauth2.revoke` + re-init
- Store only `id_token` + `expires_at` in localStorage; hold `access_token` in memory

### 3.4 Observability
**Problem**: No logging infrastructure beyond `console.log`.

**Solution**: Structured logger with levels + runtime filtering + remote sink.

```
src/lib/logger.ts
  Levels: DEBUG | INFO | WARN | ERROR
  Sinks: console (dev), remote (production optional)
  Context: automatic correlation IDs per session
```

### 3.5 Error Handling
**Problem**: No error boundaries, no retry, inconsistent error states.

**Solution**:
- ErrorBoundary component wrapping each route
- Unified error state in stores with typed error codes
- Exponential backoff retry wrapper for all Drive API calls
- User-facing toast system for transient errors

---

## 4. Data Flow (Post-Rewrite)

```
User Action
    │
    ▼
Optimistic UI Update (Zustand)
    │
    ├──► IndexedDB Cache Write
    │
    ▼
Sync Queue (if offline)
    │
    ▼ (online)
Sync Engine
    │
    ├──► Drive API (batched)
    │
    ▼
Conflict Resolution
    │
    ▼
IndexedDB + Zustand Update
```

---

## 5. Security Hardening

| Issue | Fix |
|-------|-----|
| OpenAI key in bundle | Proxy through edge function or use client-side key with restricted domain |
| XSS via task content | DOMPurify on render; Content-Security-Policy header |
| Token in localStorage | In-memory access token; refresh via GIS re-auth |
| Drive API quota abuse | Throttle by user; circuit breaker on 403 |
| No CSP | Add strict CSP meta tag to index.html |
| File upload without validation | Validate MIME type + size limits client-side |

---

## 6. File Structure (Post-Rewrite)

```
src/
├── lib/
│   ├── logger.ts            # Structured logging
│   ├── openai.ts            # OpenAI API client
│   ├── utils.ts             # cn(), date helpers
│   └── retry.ts             # Exponential backoff wrapper
├── sync/
│   ├── syncEngine.ts        # Sync orchestrator
│   ├── changeTracker.ts     # Drive Changes API
│   ├── conflictResolver.ts  # LWW conflict resolution
│   ├── syncQueue.ts         # Offline mutation queue
│   └── cacheStore.ts        # IndexedDB layer
├── hooks/
│   ├── useGoogleAuth.ts     # OAuth flow
│   ├── useAISuggestions.ts  # AI debounced suggestions
│   └── useSyncEngine.ts     # React binding for sync engine
├── store/
│   ├── authStore.ts         # Auth state (Zustand + persist)
│   └── tasksStore.ts        # Task state (Zustand + persist)
├── components/
│   ├── ErrorBoundary.tsx    # Error boundary wrapper
│   ├── Toast.tsx            # Toast notification system
│   ├── SyncStatus.tsx       # Sync status indicator
│   ├── AISuggestions.tsx    # AI suggestion dropdown
│   └── ...
└── pages/
    └── ...
```

---

## 7. API Quota Budget

Google Drive API: 10 queries per second per user; 1,000,000,000 queries per day per project.

**Budget for 10,000 users**:

| Operation | Calls/user/day | Total/day | Cost |
|-----------|---------------|-----------|------|
| Sync poll (metadata-only) | 1,440 (every 60s) | 14.4M | $0 (free tier: 1B/day) |
| Full file read (on change) | 20 | 200K | Negligible |
| Create/Update/Delete | 30 | 300K | Negligible |
| Upload (attachments) | 5 | 50K | Negligible |

**Optimization**:
- Changes API instead of full list — saves ~90% of metadata calls
- Batch reads where possible
- Exponential backoff on 429/403
- Local cache avoids re-reads of unchanged files

---

## 8. Immediate Actions

The following actions are implemented in this session:

1. **Sync engine** — batch-aware sync with Drive Changes API, incremental fetch, quota-friendly polling
2. **Offline cache** — IndexedDB layer for task data and pending mutations
3. **Token management** — expiry tracking with refresh trigger
4. **Observability** — structured logger with levels and correlation IDs
5. **Error infrastructure** — ErrorBoundary, retry wrapper, toast system
6. **Security** — CSP meta tag, input validation, error boundaries
7. **CI/CD** — GitHub Actions workflow, Dockerfile
8. **Documentation** — architecture docs, sync-engine docs
