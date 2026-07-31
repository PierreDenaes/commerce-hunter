FROM node:20-alpine AS base
RUN corepack enable

# ─── Dependencies ─────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig/package.json packages/tsconfig/
RUN pnpm install --frozen-lockfile --prod=false

# ─── Build ────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# "false" = instance sans billing : pricing et page abonnement masqués (lu au build Next)
ARG NEXT_PUBLIC_BILLING_ENABLED=true
ENV NEXT_PUBLIC_BILLING_ENABLED=$NEXT_PUBLIC_BILLING_ENABLED
# "false" = inscriptions fermées : CTA masqués, /register affiche un message (lu au build Next)
ARG NEXT_PUBLIC_REGISTRATION_ENABLED=true
ENV NEXT_PUBLIC_REGISTRATION_ENABLED=$NEXT_PUBLIC_REGISTRATION_ENABLED
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY . .
RUN pnpm --filter @commercehunter/shared build && \
    pnpm --filter @commercehunter/web build

# ─── Production ───────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
