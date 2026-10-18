# Quilroom — Implementation Plan

**Version:** 0.1  
**Date:** 2026-10-17  
**Status:** Ready for review  

---

## 1. Project Structure (proposed)

```
quilroom/
├── apps/
│   ├── server/                 # Node.js + Fastify + y-websocket + SQLite
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── db.ts
│   │   │   ├── routes/
│   │   │   ├── yjs/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── Dockerfile (or shared)
│   └── web/                    # React + Vite + Quill + y-quill
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       ├── package.json
│       └── index.html
├── docs/                       # These planning documents
├── docker-compose.yml
├── Dockerfile                  # Multi-stage or single for simplicity
├── package.json                # Optional workspace root
└── README.md
```

Alternative simpler layout (acceptable for v1):
```
quilroom/
├── server/
├── client/
├── docs/
├── docker-compose.yml
└── README.md
```

We will start with the simpler layout unless monorepo tooling becomes useful.

---

## 2. Phased Implementation

### Phase 0 — Foundation (½–1 day)
- [ ] Create folder structure
- [ ] Initialize server (Fastify + TypeScript)
- [ ] Initialize client (Vite + React + TypeScript + Tailwind)
- [ ] Basic Docker + docker-compose with volume
- [ ] Health endpoint
- [ ] README with how to run

**Exit criteria:** `docker compose up` serves a “Hello Quilroom” page.

### Phase 1 — Document CRUD + List UI
- [ ] SQLite schema + db helper
- [ ] REST endpoints: list / create / get / rename / delete
- [ ] Document list page (React)
- [ ] Create document flow
- [ ] Basic navigation to `/d/:id` (placeholder editor)

**Exit criteria:** Can create, list, rename, delete documents. Data survives restart.

### Phase 2 — Real-time Editor (core)
- [ ] y-websocket server integration
- [ ] Yjs document load / persist from SQLite
- [ ] Quill + y-quill binding on the client
- [ ] Basic toolbar (bold, italic, headings, lists)
- [ ] Auto-save / persistence of Yjs state
- [ ] Connection status indicator

**Exit criteria:** Two browser windows can edit the same document live.

### Phase 3 — Presence & Awareness
- [ ] Yjs Awareness setup
- [ ] Display name prompt + localStorage
- [ ] Color assignment
- [ ] Presence avatars / list in editor
- [ ] Remote cursors (y-quill supports this)

**Exit criteria:** Users see who else is in the document and where they are.

### Phase 4 — Sharing & Password
- [ ] Share panel with URL + QR code
- [ ] Optional password set / clear
- [ ] Password gate on document open
- [ ] Password verification before joining WebSocket room

**Exit criteria:** Can share via QR; password-protected docs work.

### Phase 5 — Polish & Hardening
- [ ] Responsive mobile layout
- [ ] Empty states, loading states, error states
- [ ] Delete confirmation
- [ ] Relative timestamps
- [ ] Basic rate limiting / input validation
- [ ] Helpful Docker startup message (LAN IP if detectable)
- [ ] Final README with screenshots / usage

**Exit criteria:** Feels usable for a small group on a real LAN.

### Phase 6 — Verification
- [ ] Manual test: 3 devices (or 3 browsers) on same network
- [ ] Restart container → documents still present
- [ ] Password flow
- [ ] Mobile browser smoke test
- [ ] Update product requirements acceptance criteria checklist

---

## 3. Recommended Order of Work (Concrete)

1. Scaffold server + client + Docker
2. Database + document CRUD API
3. Document list UI
4. Yjs server + persistence
5. Quill editor + binding
6. Awareness / presence
7. Share + QR + password
8. Polish + docs

---

## 4. Key Technical Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Yjs + Quill binding quirks | Follow official y-quill examples closely; test early with two clients |
| Mobile Quill toolbar UX | Keep toolbar minimal; test on real phone early |
| SQLite + concurrent writes | better-sqlite3 is synchronous and fast; debounce persistence |
| Finding LAN IP in Docker | Document `hostname -I` / system settings; optional helper endpoint |
| WebSocket behind some routers | Stay on same LAN; avoid complex proxy for v1 |

---

## 5. Definition of Done (v1)

- All items in Product Requirements acceptance criteria are checked
- `docker compose up` is the only required start command
- Two or more people can co-edit reliably on a local network
- Code is typed, readable, and has a clear README
- Planning documents remain accurate

---

## 6. Out of Scope for This Plan

- User accounts
- Cloud sync
- Offline-first Service Worker
- Version history UI
- Comments
- File uploads / images (can be added later)
- Native mobile apps

---

## 7. Next Action After Approval

Once you confirm these documents (or request changes), we start **Phase 0**: scaffolding the project, Docker, and basic “it runs” proof.

---

*This plan is the execution roadmap. We update the checkboxes as we complete each item.*
