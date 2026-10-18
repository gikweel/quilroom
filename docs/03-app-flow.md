# Quilroom — App Flow

**Version:** 0.1  
**Date:** 2026-10-17  

---

## 1. High-Level User Journeys

### Journey A — First-time host
1. Runs `docker compose up`
2. Sees console output with local URL (e.g. `http://192.168.1.42:3000`)
3. Opens the URL on their computer
4. Lands on **Document List** (empty)
5. Clicks **New Document**
6. Enters a title (optional) → document is created and opened
7. Starts typing; document auto-saves
8. Clicks **Share** → sees URL + QR code
9. Other people scan QR or open the URL

### Journey B — Collaborator joins
1. Opens shared link (or scans QR)
2. If document has a password → prompted to enter it
3. Optionally sets a display name (can stay anonymous)
4. Lands in the editor
5. Sees other users’ presence and live cursors (named or “Anonymous”)
6. Edits freely; changes appear on all connected devices

### Journey C — Returning user
1. Opens the LAN URL
2. Sees list of existing documents with last-modified times
3. Clicks a document → opens editor (password if required)
4. Can rename or delete from the list or from inside the document

---

## 2. Screen Map

```
┌─────────────────────┐
│  Document List      │  ← Home (/)
│  - New Document     │
│  - List of docs     │
│  - Rename / Delete  │
└──────────┬──────────┘
           │ open / create
           ▼
┌─────────────────────┐
│  Editor             │  ← /d/:docId
│  - Toolbar          │
│  - Quill surface    │
│  - Presence bar     │
│  - Share panel      │
│  - Title (editable) │
└─────────────────────┘
```

Secondary modals / panels:
- Display name (optional — can set/change anytime)
- Password prompt (when required)
- Share sheet (URL + QR + copy button)
- Delete confirmation
- Rename inline or modal
- Soft concurrent-user warning (when > 8 people in the document)

---

## 3. Detailed Flows

### 3.1 App Load (any page)
```
Load app
  → Check localStorage for displayName (optional)
  → Connect to server (REST + prepare WebSocket)
  → Route based on URL
  → Name can be set later from presence / settings (never required)
```

### 3.2 Document List
```
GET /api/docs
  → Render cards / rows:
      Title | Updated | Active users (if known)
  → Actions: Open, Rename, Delete
  → Primary CTA: “New Document”
```

### 3.3 Create Document
```
User clicks “New Document”
  → POST /api/docs { title?: string }
  → Server creates row + empty Yjs doc
  → Redirect / navigate to /d/:newId
  → Editor loads and joins WebSocket room
```

### 3.4 Open Existing Document
```
User clicks document or lands on /d/:id
  → GET /api/docs/:id (metadata)
  → If passwordHash exists:
        Show password modal
        On success → store short-lived token or session flag
  → Initialize Yjs doc + WebSocket provider for that room
  → Bind Quill
  → Set awareness (name, color)
  → Render presence
```

### 3.5 Editing
```
User types / formats
  → Quill → Yjs (via y-quill)
  → Yjs updates broadcast over WebSocket
  → Other clients receive updates and apply
  → Awareness updates (cursor, selection) sent periodically
  → Server persists Yjs state (debounced or on update)
```

### 3.6 Share
```
User opens Share panel
  → Show current full URL (window.location.href)
  → Generate QR code of that URL
  → Copy-to-clipboard button
  → Optional: “Require password” toggle → updates metadata
```

### 3.7 Rename
```
From list or from editor title
  → PATCH /api/docs/:id { title }
  → Update local state + broadcast if needed
```

### 3.8 Delete
```
User chooses Delete
  → Confirmation modal
  → DELETE /api/docs/:id
  → Server removes metadata + Yjs data
  → Redirect to list if currently open
```

### 3.9 Disconnect / Reconnect
```
WebSocket drops
  → Show “Reconnecting…” indicator
  → y-websocket attempts reconnect
  → On success → state is re-synced via Yjs
```

---

## 4. State Overview (Client)

| State | Storage | Notes |
|-------|---------|-------|
| displayName | localStorage | Required for presence |
| color | localStorage or derived | Consistent per user |
| currentDocId | URL | |
| connectionStatus | in-memory | connected / connecting / offline |
| docs list | in-memory + periodic refresh | |
| password session | sessionStorage or memory | Per document |

---

## 5. Error & Edge Cases

| Situation | Behavior |
|-----------|----------|
| Document not found | 404 page with link back to list |
| Wrong password | Clear error, allow retry |
| Server unreachable | Full-page or banner “Cannot reach Quilroom server” |
| WebSocket fails but REST works | Show editing disabled / read-only fallback if possible |
| Empty document list | Friendly empty state + big “Create your first document” |
| Very long document | Quill + Yjs should handle; monitor performance |
| User closes tab | Awareness removes them after timeout |

---

## 6. URL Structure

| Path | Purpose |
|------|---------|
| `/` | Document list |
| `/d/:docId` | Editor for that document |
| `/api/*` | REST endpoints |
| WebSocket | `/ws` or path handled by y-websocket |

---

*This flow is the reference for UI implementation and routing.*
