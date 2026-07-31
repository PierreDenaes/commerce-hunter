# CommerceHunter — Quickstart

## Prerequisites

- **Node.js** >= 20 LTS
- **pnpm** >= 9 (`corepack enable`)
- **PostgreSQL** 16+ (local or Docker)
- **Git**

## 1. Clone & Install

```bash
git clone <repo-url> && cd CommerceHunter
pnpm install
```

## 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (default port **5433**) |
| `JWT_SECRET` | Min 32 chars, generate with `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Same as above, different value |
| `SIRENE_API_TOKEN` | INSEE API key ([api.insee.fr](https://api.insee.fr)) |
| `STRIPE_SECRET_KEY` | Stripe test key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret (`whsec_...`) |

Optional: `GOOGLE_PLACES_API_KEY`, `PAGESPEED_API_KEY`

## 3. Database

```bash
# Start PostgreSQL (if using Docker)
docker run -d --name ch-postgres \
  -e POSTGRES_USER=commercehunter \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=commercehunter \
  -p 5433:5432 \
  postgres:16-alpine

# Run migrations & seed
pnpm --filter @commercehunter/db exec prisma migrate deploy
pnpm --filter @commercehunter/db exec prisma db seed
```

## 4. Build packages

```bash
pnpm build
```

## 5. Start development

```bash
# Terminal 1 — API (port 3001)
pnpm --filter @commercehunter/api dev

# Terminal 2 — Web (port 3000)
pnpm --filter @commercehunter/web dev
```

Open [http://localhost:3000](http://localhost:3000)

## 6. Production (Docker)

```bash
cp .env.production .env
# Edit .env with real secrets

docker compose -f docker-compose.prod.yml up -d --build
```

Services: PostgreSQL, API, Web, Nginx (ports 80/443)

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm lint` | Run linter |
| `pnpm test` | Run tests |
| `pnpm --filter @commercehunter/db exec prisma studio` | Open Prisma Studio |
| `pnpm --filter @commercehunter/db exec prisma migrate dev` | Create migration |

## Project Structure

```
apps/
  api/          Fastify API (port 3001)
  web/          Next.js 15 frontend (port 3000)
packages/
  db/           Prisma schema & client
  shared/       Types, schemas, constants
  pdf/          PDF report generation
```
