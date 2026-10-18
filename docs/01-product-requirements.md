# Quilroom — Product Requirements Document (PRD)

**Version:** 0.1  
**Date:** 2026-10-17  
**Status:** Draft for review  

---

## 1. Vision

A lightweight, self-hosted collaborative document editor that feels like a simplified Google Docs, designed to run entirely on a local network. Multiple people on the same Wi-Fi can open the same document, edit in real time, and see each other’s presence — without any cloud accounts, internet dependency, or external services.

**Tagline:** Real-time documents for your home, office, or classroom network.

---

## 2. Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| Real-time collaboration | Multiple users edit the same document simultaneously with low latency | Changes appear on other devices within ~100–300 ms on a healthy LAN |
| Zero cloud dependency | Runs fully offline once the Docker container is up | Works with no internet access |
| Easy sharing | Anyone on the network can open a document via IP or QR code | Share link + QR visible on every document |
| Simple for non-technical users | Clean UI, minimal setup | New user can create and share a doc in < 60 seconds |
| Cross-device | Works on phones, tablets, and desktops | Responsive layout + touch-friendly controls |

---

## 3. Target Users

- Families sharing shopping lists, trip plans, or notes
- Small teams / offices on the same LAN
- Classrooms / study groups
- Homes / makerspaces that prefer local tools over Google/Microsoft accounts

**Assumed technical level:** One person can run Docker; everyone else just opens a browser.

---

## 4. Must-Have Features (v1)

### 4.1 Document Management
- Create new documents
- List all documents (title, last modified, number of active users)
- Rename documents
- Delete documents (with confirmation)
- Open document by ID or direct URL

### 4.2 Real-time Collaborative Editing
- Multiple users (target 2–5; soft warning when > 8) editing the same document at once
- Conflict-free concurrent editing (CRDT via Yjs)
- Auto-save (no manual “Save” button needed)
- Soft concurrent-user warning when more than 8 people join the same document
- Basic rich text:
  - Bold, italic, underline, strikethrough
  - Headings (H1–H3)
  - Bullet and numbered lists
  - Blockquote
  - Simple links
  - Clear formatting

### 4.3 Presence & Awareness
- Show who is currently in the document (name + color)
- Live cursors / selection awareness (where other people are typing)
- “X is typing…” or similar lightweight indicator

### 4.4 Sharing
- Document accessible via local network IP (e.g. `http://192.168.1.42:3000/d/abc123`)
- QR code on the document page for quick phone access
- Optional password protection per document

### 4.5 User Identity
- Display name is **optional** — users can stay anonymous
- If set, stored in localStorage and used for presence
- Color avatar assigned automatically for presence
- No accounts, no email, no login required

### 4.6 Deployment
- Single Docker container (or docker-compose) that starts everything
- Server binds to `0.0.0.0` so it is reachable on the LAN
- Clear instructions for finding the local IP and opening on other devices

---

## 5. Nice-to-Have (Post-v1)

- Offline support (Service Worker + Yjs persistence)
- Export to Markdown / PDF / plain text
- Document templates
- Soft delete / trash
- Dark mode
- Keyboard shortcuts help overlay
- Multiple rooms / workspaces
- Basic comments / annotations
- Image paste / upload (local only)

---

## 6. Explicit Non-Goals (v1)

- User accounts / authentication servers
- Internet / cloud sync
- Mobile native apps
- Advanced formatting (tables, columns, embedded media beyond simple images later)
- Version history UI (Yjs has history under the hood, but no UI yet)
- Public internet exposure (LAN only by design)
- Fine-grained permissions (view-only vs edit) beyond optional password

---

## 7. User Stories

1. **As a host**, I can start the Docker container and see a clear local URL + QR code so others can join.
2. **As a user**, I can create a new document, give it a title, and start typing immediately.
3. **As a collaborator**, I open a shared link on my phone and see the document updating live as others type.
4. **As a user**, I can see colored cursors and names of people currently editing.
5. **As a user**, I can rename or delete documents from the home list.
6. **As a user**, I can protect a sensitive document with a simple password.
7. **As a user**, I never have to press “Save” — everything persists automatically.

---

## 8. Acceptance Criteria (v1)

- [ ] `docker compose up` starts the app and prints the LAN URL
- [ ] Creating a document works and appears in the list
- [ ] Two browsers on the same network can edit the same document simultaneously without conflicts
- [ ] Presence indicators (name + color) appear for connected users
- [ ] QR code is generated and scannable
- [ ] Password-protected documents require the password to open
- [ ] App is usable on mobile browsers (responsive)
- [ ] Documents survive container restart (persistent volume)

---

## 9. Success Metrics (Qualitative for v1)

- Two people can co-edit a shopping list or meeting notes without friction
- Setup time from “I have Docker” to “someone else is editing” < 5 minutes
- No external network calls in normal operation

---

## 10. Decisions (locked 2026-10-17)

| Question | Decision |
|----------|----------|
| Product name | **Quilroom** |
| Display name | Optional — collaborators can stay anonymous or set a name if they want to be identified |
| Soft concurrent-user limit | Yes — show a note when more than 8 people are in the same document |

---

*This document is the source of truth for what we are building in v1. Changes to scope should update this file first.*
