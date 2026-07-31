FROM node:20-alpine AS base
RUN corepack enable

# ─── Build ────────────────────────────────────────────────
# Single stage: hoisted node_modules (flat, like npm) avoids
# pnpm symlink issues with Docker COPY between stages.
FROM base AS build
WORKDIR /app

# Force flat node_modules layout for Docker compatibility
RUN echo "node-linker=hoisted" > .npmrc && \
    echo "auto-install-peers=true" >> .npmrc

# Copy manifests first (Docker layer cache for pnpm install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/pdf/package.json packages/pdf/
RUN pnpm install --frozen-lockfile --prod=false

# Copy source and build
COPY . .
RUN pnpm --filter @commercehunter/db exec prisma generate
RUN pnpm --filter @commercehunter/api... build

# ─── Production ───────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install prisma CLI for runtime migrations
RUN npm install -g prisma@6 --ignore-scripts

# API compiled output
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./

# Flat node_modules with all deps (hoisted = no symlink chains)
COPY --from=build /app/node_modules ./node_modules

# Built workspace packages
COPY --from=build /app/packages ./packages

# Link workspace packages into node_modules so Node.js can resolve them
# (pnpm hoisted mode hoists third-party deps but not workspace packages)
RUN mkdir -p node_modules/@commercehunter && \
    ln -s /app/packages/db node_modules/@commercehunter/db && \
    ln -s /app/packages/shared node_modules/@commercehunter/shared && \
    ln -s /app/packages/pdf node_modules/@commercehunter/pdf

# Prisma: schema for migrations + generated client
COPY --from=build /app/packages/db/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/server.js"]
