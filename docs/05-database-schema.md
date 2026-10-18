# Quilroom — Database Schema

**Version:** 0.1  
**Date:** 2026-10-17  
**Engine:** SQLite  

---

## 1. Overview

We use a single SQLite database for all durable data.

- Document **metadata** lives in relational tables.
- Document **content** (Yjs CRDT state) is stored as a binary blob.
- No user accounts table — identity is client-side only.

---

## 2. Tables

### 2.1 `documents`

Primary table for document metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Public document ID (nanoid, ~12–16 chars) |
| `title` | TEXT | NOT NULL DEFAULT 'Untitled' | Display title |
| `password_hash` | TEXT | NULL | argon2/bcrypt hash; NULL = no password |
| `ydoc` | BLOB | NULL | Current Yjs document state |
| `created_at` | TEXT | NOT NULL | ISO-8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO-8601 timestamp |
| `last_edited_by` | TEXT | NULL | Last known display name (optional) |

**Indexes:**
- `idx_documents_updated_at` on `updated_at` (for sorting the list)

### 2.2 Optional future tables (not in v1)

- `document_versions` — if we add explicit history later
- `sessions` — if we move password tokens server-side

---

## 3. Schema SQL (v1)

```sql
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT 'Untitled',
  password_hash TEXT,
  ydoc          BLOB,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  last_edited_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at
  ON documents (updated_at DESC);
```

---

## 4. Data Rules

| Rule | Detail |
|------|--------|
| ID generation | `nanoid(12)` or similar — URL-safe, short |
| Title | Trimmed; empty becomes `"Untitled"` |
| Password | Only the hash is stored. Never plaintext. |
| `ydoc` | Binary Yjs update state. Can be NULL until first edit. |
| Timestamps | Always UTC ISO-8601 strings |
| Deletion | Hard delete (row + blob removed). No soft-delete in v1. |

---

## 5. Access Patterns

| Operation | Query pattern |
|-----------|---------------|
| List documents | `SELECT id, title, updated_at, last_edited_by FROM documents ORDER BY updated_at DESC` |
| Get one | `SELECT * FROM documents WHERE id = ?` |
| Create | `INSERT INTO documents (...)` |
| Rename | `UPDATE documents SET title = ?, updated_at = ? WHERE id = ?` |
| Set / clear password | `UPDATE documents SET password_hash = ? WHERE id = ?` |
| Save Yjs state | `UPDATE documents SET ydoc = ?, updated_at = ?, last_edited_by = ? WHERE id = ?` |
| Delete | `DELETE FROM documents WHERE id = ?` |

---

## 6. Yjs Persistence Strategy

1. On first load of a document: if `ydoc` is present, apply it to a new `Y.Doc`.
2. On updates: use a debounced writer (e.g. 1–2 seconds after last change) or Yjs persistence provider that writes the full state (or incremental updates) back to the `ydoc` column.
3. On server restart: documents are restored from the BLOB.

**Alternative considered:** store Yjs updates as files on disk.  
**Chosen:** SQLite BLOB for single-volume simplicity and atomic backup.

---

## 7. Migration Approach

- v1: create table if not exists (no formal migration runner yet)
- Later versions: simple numbered migration files if schema changes

---

## 8. Backup

- Entire database is one file (`/data/quilroom.db` or similar)
- Docker volume makes backup = copy the volume or the file

---

*This schema is intentionally minimal. Complexity is added only when a concrete feature requires it.*
