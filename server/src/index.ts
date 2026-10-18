import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { docsRoutes } from './routes/docs.js';
import { setupYjs } from './yjs/server.js';
import { getDbPath } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = Fastify({
  logger: true,
  // Avoid 400 on DELETE/empty bodies with Content-Type: application/json
  bodyLimit: 1048576,
});

// Allow empty JSON bodies (fixes Bad Request on DELETE from some clients)
app.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (req, body, done) => {
    try {
      const json = body === '' || body == null ? {} : JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

await app.register(cors, { origin: true });
await app.register(websocket);

// REST API
await app.register(docsRoutes, { prefix: '/api' });

// Health
app.get('/api/health', async () => ({
  ok: true,
  service: 'quilroom',
  time: new Date().toISOString(),
}));

// Yjs WebSocket rooms
setupYjs(app);

// Serve client build in production
// Docker: /app/client/dist  |  local built: ../client/dist relative to server/
const clientDistCandidates = [
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(__dirname, '..', '..', 'client', 'dist'),
  path.join(process.cwd(), 'client', 'dist'),
];
let clientDist: string | null = null;
for (const p of clientDistCandidates) {
  try {
    const { accessSync, constants } = await import('node:fs');
    accessSync(path.join(p, 'index.html'), constants.R_OK);
    clientDist = p;
    break;
  } catch {
    /* try next */
  }
}
if (clientDist) {
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
  app.log.info(`Serving client from ${clientDist}`);
} else {
  app.log.warn('Client dist not found — API-only mode (dev)');
}

function getLanIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const list of Object.values(interfaces)) {
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

try {
  await app.listen({ port: PORT, host: HOST });
  const ips = getLanIps();
  console.log('\n========================================');
  console.log('  Quilroom is running');
  console.log('========================================');
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`  LAN:     http://${ip}:${PORT}`);
  }
  console.log(`  Database: ${getDbPath()}`);
  console.log('========================================\n');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
