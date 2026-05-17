# Sync Engine

## Overview

The sync engine manages bidirectional synchronization between the local IndexedDB cache and Google Drive. It runs on a configurable poll interval and processes offline mutations on startup.

## Components

### `syncEngine.ts`

Orchestrator. Lifecycle:
1. `start()` — process offline queue, initial sync, begin polling
2. `sync()` — fetch remote changes, merge with local, update cache
3. `stop()` — clear poll timer

### `cacheStore.ts`

IndexedDB wrapper with typed methods:
- `getTasks()` / `getTask(id)` — read cached tasks
- `putTask(task)` / `putTasks(tasks)` — write to cache
- `deleteTask(id)` — remove from cache
- `getSyncMeta(key)` / `setSyncMeta(key, value)` — persist sync state

Database: `cloudtodo`
- `tasks` — object store keyed by `id`, indexes on `status`, `updatedDate`
- `sync` — key-value store for `pageToken` etc.
- `queue` — pending mutations, auto-increment keyed, index on `status`
- `blobs` — cached file data (future)

### `syncQueue.ts`

Offline mutation queue:
- `enqueue()` — add a pending write
- `dequeue()` — claim the next pending item
- `complete(id)` / `fail(id)` — mark result
- `processQueue(handler)` — drain queue with a user-provided handler

### Conflict Resolution

Current strategy: **Last-Write-Wins (LWW)**

The `updatedDate` field is compared. The version with the later timestamp wins. This is stored both in the JSON content and in Drive's `modifiedTime`.

## Polling

| Mode | Interval | Method |
|------|----------|--------|
| Active (app open) | 60s | `files.list` with `q` filter |
| Background | N/A | Not supported (SPA limitation) |

## Offline Behavior

When offline:
1. All mutations are written to IndexedDB immediately (optimistic)
2. Mutations are enqueued in `queue` store
3. On reconnect, `syncEngine.processQueue()` replays mutations
4. Failed mutations remain in queue for retry

## Retry Policy

- 429 (rate limit): retry with exponential backoff (1s, 2s, 4s, max 10s)
- 5xx: retry with exponential backoff
- 4xx (other): fail immediately
- Max 3 attempts per operation
