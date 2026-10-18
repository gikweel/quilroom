# Build client
FROM node:22-bookworm AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build server
FROM node:22-bookworm AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npm run build

# Runtime
FROM node:22-bookworm-slim
WORKDIR /app

# better-sqlite3 native deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package.json ./
RUN npm install --omit=dev

COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", "dist/index.js"]
