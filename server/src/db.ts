import Database, { type Database as SQLiteDatabase } from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "..", "data");
const DB_PATH = path.join(DATA_DIR, "quilroom.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db: SQLiteDatabase = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id             TEXT PRIMARY KEY,
    title          TEXT NOT NULL DEFAULT 'Untitled',
    password_hash  TEXT,
    ydoc           BLOB,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    last_edited_by TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_documents_updated_at
    ON documents (updated_at DESC);
`);

export interface DocumentRow {
  id: string;
  title: string;
  password_hash: string | null;
  ydoc: Buffer | null;
  created_at: string;
  updated_at: string;
  last_edited_by: string | null;
}

export function listDocuments(): Omit<DocumentRow, "ydoc" | "password_hash">[] {
  return db
    .prepare(
      `SELECT id, title, created_at, updated_at, last_edited_by
       FROM documents
       ORDER BY updated_at DESC`,
    )
    .all() as Omit<DocumentRow, "ydoc" | "password_hash">[];
}

export function getDocument(id: string): DocumentRow | undefined {
  return db.prepare(`SELECT * FROM documents WHERE id = ?`).get(id) as
    | DocumentRow
    | undefined;
}

export function createDocument(id: string, title: string): DocumentRow {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO documents (id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
  ).run(id, title || "Untitled", now, now);
  return getDocument(id)!;
}

export function updateDocumentTitle(id: string, title: string): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE documents SET title = ?, updated_at = ? WHERE id = ?`).run(
    title || "Untitled",
    now,
    id,
  );
}

export function updatePasswordHash(id: string, hash: string | null): void {
  db.prepare(`UPDATE documents SET password_hash = ? WHERE id = ?`).run(
    hash,
    id,
  );
}

export function saveYdoc(
  id: string,
  ydoc: Buffer,
  lastEditedBy?: string | null,
): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE documents
     SET ydoc = ?, updated_at = ?, last_edited_by = COALESCE(?, last_edited_by)
     WHERE id = ?`,
  ).run(ydoc, now, lastEditedBy ?? null, id);
}

export function deleteDocument(id: string): boolean {
  const result = db.prepare(`DELETE FROM documents WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function getDbPath(): string {
  return DB_PATH;
}

export default db;
