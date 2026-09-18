# syntax=docker/dockerfile:1

# ─── Dependențe complete (inclusiv dev) ───────────────────────────────────────
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Compilare TypeScript ─────────────────────────────────────────────────────
FROM deps AS build
# `prisma generate` încarcă prisma.config.ts, care așteaptă o valoare aici.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
WORKDIR /app
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY src ./src
RUN npx prisma generate && npm run build

# ─── Development: `nest start --watch` cu sursele montate din compose ────────
FROM deps AS dev
WORKDIR /app
ENV NODE_ENV=development \
  DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY src/modules/prisma ./src/modules/prisma
RUN npx prisma generate
EXPOSE 5000
# Fără USER node: bind-mount-ul din compose e scris de userul gazdei.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.APP_PORT||5000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npx prisma generate && exec npm run start:dev"]

# ─── Doar dependențele de runtime, cu clientul Prisma generat ─────────────────
FROM node:24-bookworm-slim AS runtime-deps
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY src/modules/prisma ./src/modules/prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

# ─── Imaginea finală ──────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*

COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Schema și migrările rămân în imagine pentru `prisma migrate deploy`.
COPY package.json prisma.config.ts ./
COPY src/modules/prisma ./src/modules/prisma

# Procesul rulează fără privilegii de root.
USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.APP_PORT||5000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `dumb-init` face PID 1 să propage corect semnalele, ca shutdown-ul să fie curat.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
