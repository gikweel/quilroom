import type { FastifyInstance } from 'fastify';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { getDocument, saveYdoc } from '../db.js';

const docs = new Map<string, Y.Doc>();
const awarenesses = new Map<string, awarenessProtocol.Awareness>();
const connections = new Map<string, Set<WebSocket>>();

const persistenceTimers = new Map<string, NodeJS.Timeout>();

function getOrCreateDoc(docId: string): Y.Doc {
  let doc = docs.get(docId);
  if (doc) return doc;

  doc = new Y.Doc();
  const row = getDocument(docId);
  if (row?.ydoc) {
    Y.applyUpdate(doc, new Uint8Array(row.ydoc));
  }

  doc.on('update', (update: Uint8Array, origin: unknown) => {
    // Broadcast to other clients in this room
    const conns = connections.get(docId);
    if (conns) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // sync message
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      for (const ws of conns) {
        if (ws !== origin && ws.readyState === 1) {
          ws.send(message);
        }
      }
    }

    // Debounced persist
    const existing = persistenceTimers.get(docId);
    if (existing) clearTimeout(existing);
    persistenceTimers.set(
      docId,
      setTimeout(() => {
        const state = Y.encodeStateAsUpdate(doc!);
        saveYdoc(docId, Buffer.from(state));
        persistenceTimers.delete(docId);
      }, 1500)
    );
  });

  docs.set(docId, doc);
  return doc;
}

function getOrCreateAwareness(docId: string, doc: Y.Doc) {
  let awareness = awarenesses.get(docId);
  if (awareness) return awareness;
  awareness = new awarenessProtocol.Awareness(doc);
  awarenesses.set(docId, awareness);

  awareness.on('update', ({ added, updated, removed }: any, conn: unknown) => {
    const changed = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 1); // awareness message
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness!, changed)
    );
    const message = encoding.toUint8Array(encoder);
    const conns = connections.get(docId);
    if (conns) {
      for (const ws of conns) {
        if (ws !== conn && ws.readyState === 1) {
          ws.send(message);
        }
      }
    }
  });

  return awareness;
}

function send(ws: WebSocket, encoder: encoding.Encoder) {
  if (ws.readyState === 1) {
    ws.send(encoding.toUint8Array(encoder));
  }
}

export function setupYjs(app: FastifyInstance) {
  app.get('/ws/:docId', { websocket: true }, (socket, req) => {
    const docId = (req.params as { docId: string }).docId;
    const doc = getOrCreateDoc(docId);
    const awareness = getOrCreateAwareness(docId, doc);

    if (!connections.has(docId)) connections.set(docId, new Set());
    connections.get(docId)!.add(socket);

    // Send sync step 1
    {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      syncProtocol.writeSyncStep1(encoder, doc);
      send(socket, encoder);
    }

    // Send current awareness
    {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 1);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awareness.getStates().keys())
        )
      );
      send(socket, encoder);
    }

    socket.on('message', (data: Buffer) => {
      try {
        const decoder = decoding.createDecoder(new Uint8Array(data));
        const messageType = decoding.readVarUint(decoder);

        if (messageType === 0) {
          // sync
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0);
          const syncMessageType = syncProtocol.readSyncMessage(
            decoder,
            encoder,
            doc,
            socket
          );
          if (encoding.length(encoder) > 1) {
            send(socket, encoder);
          }
        } else if (messageType === 1) {
          // awareness
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            socket
          );
        }
      } catch (err) {
        app.log.error({ err, docId }, 'Yjs message error');
      }
    });

    socket.on('close', () => {
      connections.get(docId)?.delete(socket);
      // Remove awareness states for this connection after a short delay
      // (y-protocols handles client-side; server cleans empty rooms later)
      if (connections.get(docId)?.size === 0) {
        // Optional: destroy doc after idle — keep in memory for now
      }
    });
  });

  // Active user counts helper for list (optional)
  app.get('/api/presence', async () => {
    const result: Record<string, number> = {};
    for (const [docId, set] of connections) {
      result[docId] = set.size;
    }
    return result;
  });
}

// Minimal WebSocket type for TypeScript without DOM lib conflicts
type WebSocket = {
  readyState: number;
  send: (data: Uint8Array) => void;
  on: (event: string, cb: (...args: any[]) => void) => void;
};
