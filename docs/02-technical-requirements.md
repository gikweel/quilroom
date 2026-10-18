# Quilroom — Technical Requirements

**Version:** 0.1  
**Date:** 2026-10-17  
**Status:** Draft  

---

## 1. Stack Overview

| Layer | Choice | Reason |
|-------|--------|--------|
| Editor | Quill + Yjs (`y-quill`) | Mature, good mobile support, solid CRDT binding |
| Real-time | Yjs + y-websocket | Industry standard for collaborative editing |
| Backend | Node.js (Express or Fastify) | Simple, good WebSocket support |
| Persistence | SQLite (via better-sqlite3) + Yjs persistence | Zero config, single file, reliable |
| Frontend | React + Vite | Fast DX, component model, easy responsive UI |
| Styling | Tailwind CSS | Rapid, consistent, mobile-first |
| Deployment | Docker + docker-compose | One command, persistent volume, LAN-friendly |
| QR | `qrcode` (server or client) | Generate share QR easily |

**Hard constraints met:**
- Yjs + Quill (as requested)
- Docker deployment
- Works for 2–5 concurrent editors, designed to scale beyond that

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (phone / tablet / desktop)                     │
│  React + Quill + y-quill + y-websocket client           │
└───────────────────────┬─────────────────────────────────┘
                        │ WebSocket (Yjs) + REST (docs list)
┌───────────────────────▼─────────────────────────────────┐
│  Node.js Server                                         │
│  - Express/Fastify REST API                             │
│  - y-websocket server                                   │
│  - Document metadata + password hashing                 │
│  - SQLite (better-sqlite3)                              │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│  Persistent Volume                                      │
│  - SQLite database                                      │
│  - Yjs binary documents (or stored in SQLite)           │
└─────────────────────────────────────────────────────────┘
```

### Key design decisions

1. **Yjs documents are the source of truth for content.**  
   Metadata (title, password hash, created/updated) lives in SQLite.

2. **One WebSocket room per document** (`docId`).

3. **No authentication server.**  
   Display name is client-side. Optional password is a simple shared secret per document.

4. **Server is authoritative for document list and access control**, but content sync is peer-aware via Yjs.

---

## 3. Functional Technical Requirements

### 3.1 Real-time Editing
- Use Yjs CRDT with Quill binding (`y-quill`)
- WebSocket provider: `y-websocket`
- Awareness protocol for cursors, selections, and user presence
- Target latency on LAN: < 300 ms for most keystrokes

### 3.2 Document Persistence
- Every document has a stable `id` (nanoid or UUID)
- Yjs document state persisted to disk (SQLite BLOB or file-per-doc)
- Auto-save on change (Yjs persistence plugin or periodic flush)
- Survive container restarts via Docker volume

### 3.3 Document List API
- `GET /api/docs` → list of documents (id, title, updatedAt, activeUsers?)
- `POST /api/docs` → create
- `PATCH /api/docs/:id` → rename / update metadata
- `DELETE /api/docs/:id` → delete (and remove Yjs data)

### 3.4 Access Control
- Optional password per document (bcrypt or argon2 hash stored in SQLite)
- On open: if password set, client must send password (or token) before joining WebSocket room
- No per-user permissions in v1

### 3.5 Presence
- Yjs Awareness: name, color, cursor position
- Server can optionally track connected clients per room for the document list

### 3.6 Sharing
- Document URL: `/d/:docId`
- QR code generated client-side or server-side containing the full LAN URL
- Server should expose its own LAN IP detection helper if possible (or document how to find it)

### 3.7 Frontend
- Responsive (mobile-first)
- Quill toolbar optimized for touch
- Clean empty state and document list
- Loading / connection status indicator

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Support 5 concurrent editors comfortably; degrade gracefully beyond that |
| Reliability | Document content must not be lost on normal disconnect or container restart |
| Security | Password hashes only; no plaintext secrets; bind to LAN only by default |
| Portability | Runs on Linux / macOS / Windows via Docker |
| Offline | v1 does not require offline editing; network to the LAN server is assumed |
| Browser support | Modern Chrome, Firefox, Safari, Edge (last 2 versions) |

---

## 5. Data & Storage

- **SQLite** single file for metadata
- Yjs updates either:
  - Stored as binary in SQLite, or
  - Written to files under `/data/docs/:id.ydoc`
- Preference: keep everything in SQLite for simpler backup (one volume)

---

## 6. Deployment Requirements

- `docker-compose.yml` with:
  - One service
  - Volume for `/data`
  - Port mapping `3000:3000` (or configurable)
  - Environment variables for port, etc.
- On start, print helpful message with LAN URL if possible
- Healthcheck endpoint (`/api/health`)

---

## 7. Development Requirements

- TypeScript preferred for both frontend and backend
- Vite for frontend
- Clear monorepo or simple `apps/web` + `apps/server` structure
- `npm run dev` (or equivalent) for local development without Docker
- Linting + basic formatting (ESLint + Prettier)

---

## 8. Security Notes (v1)

- No public internet exposure intended
- Passwords: one-way hash only
- CORS limited to same origin or LAN
- Rate limiting not critical on trusted LAN but good hygiene for document creation
- Sanitize any HTML that Quill might produce if we ever render outside the editor

---

## 9. Open Technical Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Yjs persistence | SQLite BLOB vs filesystem | SQLite BLOB (simpler backup) |
| Web framework | Express vs Fastify | Fastify (slightly faster, good TS) |
| ID generation | nanoid vs uuid | nanoid (shorter, nicer URLs) |
| Password hashing | bcrypt vs argon2 | argon2id if available, else bcrypt |
| Frontend state | Zustand / Jotai / React context | Start with React context + hooks |

---

*This document defines the technical constraints and choices for implementation.*
