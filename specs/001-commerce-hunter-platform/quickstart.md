# Quickstart: CommerceHunter Platform

**Branch**: `001-commerce-hunter-platform` | **Date**: 2026-02-25

## Prerequisites

- **Node.js** >= 20 LTS
- **pnpm** >= 9
- **Docker** + Docker Compose
- **API keys**: INSEE SIRENE (OAuth2 consumer key/secret), Google Places API key, Stripe API keys, Google PageSpeed Insights API key

## Initial Setup

```bash
# Clone and install
git clone <repo-url> CommerceHunter
cd CommerceHunter
pnpm install

# Copy environment files
cp .env.example .env
# Edit .env with your API keys (see Environment Variables below)
```

## Development

```bash
# Start all services (Postgres, API, Web)
docker-compose up -d postgres
pnpm db:migrate
pnpm dev
```

This starts:
- **API** (Fastify): http://localhost:3001
- **Web** (Next.js): http://localhost:3000
- **PostgreSQL**: localhost:5432

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://commercehunter:password@localhost:5432/commercehunter

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# INSEE SIRENE API
SIRENE_CONSUMER_KEY=your-consumer-key
SIRENE_CONSUMER_SECRET=your-consumer-secret

# Google APIs
GOOGLE_PLACES_API_KEY=your-google-api-key
PAGESPEED_API_KEY=your-pagespeed-api-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_AGENCY_PRICE_ID=price_xxx

# App
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
NODE_ENV=development
```

## Project Scripts

```bash
pnpm dev              # Start all apps in dev mode (Turborepo)
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm db:migrate       # Run Prisma migrations
pnpm db:generate      # Regenerate Prisma client
pnpm db:seed          # Seed subscription plans
```

## Docker (Production)

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Services:
- `web` — Next.js standalone (port 3000)
- `api` — Fastify (port 3001)
- `postgres` — PostgreSQL 16 (port 5432)
- `nginx` — Reverse proxy with HTTPS (ports 80, 443)

## Project Structure

```
CommerceHunter/
├── apps/
│   ├── web/                 # Next.js 15 (App Router) frontend
│   │   └── src/
│   │       ├── app/         # Pages and layouts
│   │       ├── components/  # React components
│   │       └── lib/         # Client utilities, API client
│   └── api/                 # Fastify backend
│       └── src/
│           ├── routes/      # API route handlers
│           ├── services/    # Business logic
│           ├── plugins/     # Fastify plugins (auth, db, etc.)
│           └── workers/     # Background job processors
├── packages/
│   ├── shared/              # Types, constants, utilities
│   ├── db/                  # Prisma schema + client
│   ├── pdf/                 # PDF report generation
│   ├── ui/                  # Shared React components
│   ├── eslint-config/       # Shared ESLint config
│   └── tsconfig/            # Shared TS configs
├── docker/                  # Dockerfiles
├── docker-compose.yml       # Dev services
└── specs/                   # Feature specifications
```

## Key Workflows

### Running a scan (manual test)

1. Register at http://localhost:3000/register
2. Create a scan: postal code "13600", entity type "BOTH"
3. Wait for scan to complete (status updates in dashboard)
4. View results in dashboard, filter by Commerce/PME
5. Click a business to see full SEO analysis
6. Export CSV or generate PDF audit

### Running tests

```bash
pnpm test                          # All tests
pnpm --filter @commercehunter/api test   # API tests only
pnpm --filter @commercehunter/web test   # Web tests only
```
