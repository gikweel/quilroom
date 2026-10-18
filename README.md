# Quilroom

A stripped-down, self-hosted collaborative document editor for your local network.

Real-time multi-user editing · Quill + Yjs · Docker · No cloud accounts

---

## Quick start (Docker)

```bash
cd quilroom
docker compose up --build
```

Then open the **LAN** URL printed in the console (e.g. `http://192.168.1.42:3000`) on any device on the same Wi-Fi.

Documents are stored in a Docker volume and survive restarts.

---

## Local development

**Terminal 1 — server**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 — client**
```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` and `/ws` to the server).

---

## Features (v1)

- Real-time collaborative editing (Yjs + Quill)
- Document list, create, rename, delete
- Auto-save
- Presence (optional display name + colors + cursors)
- Share via local URL + QR code
- Optional password per document
- Soft warning when more than 8 people join a document
- Works on phones, tablets, and desktops

---

## Planning docs

See [`docs/`](docs/) for product requirements, technical design, app flow, design brief, schema, and implementation plan.

---

## Project layout

```
quilroom/
├── server/          # Fastify + Yjs WebSocket + SQLite
├── client/          # React + Vite + Quill
├── docs/            # Planning documents
├── data/            # Local SQLite (dev)
├── docker-compose.yml
└── Dockerfile
```
