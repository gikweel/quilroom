import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocumentTitle,
  updatePasswordHash,
  deleteDocument,
} from '../db.js';

// Simple password hashing for v1 (crypto scrypt — no extra dep)
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const test = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, test);
}

export async function docsRoutes(app: FastifyInstance) {
  // List
  app.get('/docs', async () => {
    return listDocuments();
  });

  // Get metadata (no ydoc blob)
  app.get<{ Params: { id: string } }>('/docs/:id', async (req, reply) => {
    const doc = getDocument(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'Document not found' });
    return {
      id: doc.id,
      title: doc.title,
      hasPassword: Boolean(doc.password_hash),
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      last_edited_by: doc.last_edited_by,
    };
  });

  // Create
  app.post<{ Body: { title?: string } }>('/docs', async (req) => {
    const id = nanoid(12);
    const title = (req.body?.title || '').trim() || 'Untitled';
    const doc = createDocument(id, title);
    return {
      id: doc.id,
      title: doc.title,
      hasPassword: false,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  });

  // Rename
  app.patch<{
    Params: { id: string };
    Body: { title?: string; password?: string | null };
  }>('/docs/:id', async (req, reply) => {
    const doc = getDocument(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'Document not found' });

    if (typeof req.body?.title === 'string') {
      updateDocumentTitle(req.params.id, req.body.title.trim());
    }

    if (req.body && 'password' in req.body) {
      if (req.body.password === null || req.body.password === '') {
        updatePasswordHash(req.params.id, null);
      } else if (typeof req.body.password === 'string') {
        updatePasswordHash(req.params.id, hashPassword(req.body.password));
      }
    }

    const updated = getDocument(req.params.id)!;
    return {
      id: updated.id,
      title: updated.title,
      hasPassword: Boolean(updated.password_hash),
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  });

  // Verify password
  app.post<{
    Params: { id: string };
    Body: { password?: string };
  }>('/docs/:id/unlock', async (req, reply) => {
    const doc = getDocument(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'Document not found' });
    if (!doc.password_hash) return { ok: true };
    const password = req.body?.password || '';
    if (!verifyPassword(password, doc.password_hash)) {
      return reply.code(401).send({ error: 'Wrong password' });
    }
    return { ok: true };
  });

  // Delete
  app.delete<{ Params: { id: string } }>('/docs/:id', async (req, reply) => {
    const ok = deleteDocument(req.params.id);
    if (!ok) return reply.code(404).send({ error: 'Document not found' });
    return { ok: true };
  });
}
