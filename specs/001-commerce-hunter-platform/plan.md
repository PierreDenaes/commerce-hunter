# Implementation Plan: CommerceHunter Platform

**Branch**: `001-commerce-hunter-platform` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-commerce-hunter-platform/spec.md`

## Summary

CommerceHunter is a SaaS B2B platform that automates the identification and digital analysis of local businesses (commerces) and SMEs (PME) in France to help freelancers and web agencies find prospecting opportunities. The platform scans the INSEE SIRENE public registry, enriches data via Google Places, performs automated SEO/technical website audits, scores digital maturity, and presents prioritized opportunities through a filterable dashboard with CSV/PDF export.

**Technical approach**: pnpm monorepo with Next.js 15 (App Router) frontend and Fastify API backend, PostgreSQL via Prisma ORM, JWT httpOnly cookie auth, background workers for scan/analysis jobs, PageSpeed Insights API for mobile scoring (no headless browser), @react-pdf/renderer for audit reports, Stripe for billing. Frontend uses TailwindCSS v4 with CSS-first design tokens (OKLCH), shadcn/ui components customized with dark GEN Z theme (glassmorphism, neon gradients), Framer Motion for animations, and Recharts for data visualization (see `002-design-system-genz-theme`).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js >= 20 LTS
**Primary Dependencies**: Next.js 15 (frontend), Fastify (API), Prisma (ORM), cheerio (HTML parsing), @react-pdf/renderer (PDF), Zod (validation), Turborepo (monorepo build), TailwindCSS v4 (CSS framework + design tokens), shadcn/ui (UI components), motion/Framer Motion (animations), Recharts (charts), next/font (Space Grotesk + Inter typography)
**Storage**: PostgreSQL 16
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Linux server (Docker containers), web browsers (desktop + mobile)
**Project Type**: Web service (SaaS B2B platform)
**Performance Goals**: Scan 500 businesses in < 5 minutes, 50 concurrent users, dashboard filters in < 30 seconds
**Constraints**: SIRENE API rate limit 30 RPM, Google Places free tier limits, containerized deployment
**Scale/Scope**: Initial target 1 city (13600), scalable nationwide. ~10 screens (auth, dashboard, scan config, business list, business detail, export, settings, billing, org management, invite accept).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file found (`.specify/memory/constitution.md` does not exist). Proceeding without constitution gates. All design decisions follow standard practices and the user's explicit technology choices.

**Post-Phase 1 re-check**: Design adheres to the user's stated architecture (monorepo, Next.js 15, Fastify, Prisma, Docker). No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/001-commerce-hunter-platform/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technology research and decisions
├── data-model.md        # Phase 1: Entity definitions and relationships
├── quickstart.md        # Phase 1: Setup and development guide
├── contracts/
│   └── api.md           # Phase 1: REST API endpoint contracts
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
CommerceHunter/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                    # Root scripts, shared devDependencies
├── .npmrc
├── .env.example
├── docker-compose.yml              # Dev: postgres
├── docker-compose.prod.yml         # Prod: postgres + api + web + nginx
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── nginx.conf
├── apps/
│   ├── web/                        # Next.js 15 (App Router)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── components.json                    # shadcn/ui config (cssVariables: true)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── globals.css                # Design tokens (OKLCH colors, gradients, glass, keyframes)
│   │       │   ├── layout.tsx                 # Fonts (Space Grotesk + Inter), dark class, MotionConfig
│   │       │   ├── template.tsx               # Page entrance animation (fade + translate)
│   │       │   ├── page.tsx                   # Landing / redirect
│   │       │   ├── (auth)/
│   │       │   │   ├── login/page.tsx
│   │       │   │   ├── register/page.tsx
│   │       │   │   └── invite/[token]/page.tsx
│   │       │   └── (dashboard)/
│   │       │       ├── layout.tsx             # Authenticated layout
│   │       │       ├── dashboard/page.tsx     # Overview KPIs
│   │       │       ├── scans/
│   │       │       │   ├── page.tsx           # Scan list
│   │       │       │   ├── new/page.tsx       # Create scan
│   │       │       │   └── [id]/page.tsx      # Scan results
│   │       │       ├── businesses/
│   │       │       │   └── [id]/page.tsx      # Business detail / audit
│   │       │       └── settings/
│   │       │           ├── page.tsx           # Organization settings
│   │       │           ├── team/page.tsx      # Team management
│   │       │           └── billing/page.tsx   # Subscription & billing
│   │       ├── components/
│   │       │   ├── ui/                        # Design system components (002-design-system-genz-theme)
│   │       │   │   ├── glass-card.tsx         # Glassmorphism card (3 variants)
│   │       │   │   ├── gradient-button.tsx    # Neon gradient CTA button
│   │       │   │   ├── priority-badge.tsx     # HIGH/MEDIUM/LOW colored badge
│   │       │   │   ├── animated-counter.tsx   # KPI count-up animation
│   │       │   │   ├── stagger.tsx            # StaggerContainer + StaggerItem
│   │       │   │   ├── skeleton-loader.tsx    # Shimmer loading placeholders
│   │       │   │   ├── score-gauge.tsx        # SVG circular animated score gauge
│   │       │   │   ├── seo-radar-chart.tsx    # Recharts radar/spider chart
│   │       │   │   ├── scan-radar.tsx         # Animated radar pulse for scans
│   │       │   │   ├── gradient-progress-bar.tsx # Gradient-filled progress bar
│   │       │   │   ├── split-layout.tsx       # Two-column audit layout
│   │       │   │   ├── drawer-panel.tsx       # Animated side panel
│   │       │   │   └── ...                    # shadcn/ui base components (button, input, dialog, etc.)
│   │       │   ├── dashboard/                 # Dashboard-specific components
│   │       │   ├── scans/                     # Scan-related components
│   │       │   └── businesses/                # Business-related components
│   │       └── lib/
│   │           ├── api-client.ts              # Typed API client
│   │           ├── layout-transition.tsx       # FrozenRouter + LayoutTransition for exit animations
│   │           └── utils.ts
│   └── api/                        # Fastify backend
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── app.ts                          # Fastify app factory
│           ├── server.ts                       # Entry point
│           ├── routes/
│           │   ├── auth.ts
│           │   ├── scans.ts
│           │   ├── businesses.ts
│           │   ├── dashboard.ts
│           │   ├── export.ts
│           │   ├── organization.ts
│           │   └── billing.ts
│           ├── services/
│           │   ├── sirene.service.ts            # INSEE SIRENE API client
│           │   ├── google-places.service.ts     # Google Places enrichment
│           │   ├── seo-analyzer.service.ts      # Website SEO analysis
│           │   ├── scoring.service.ts           # Score calculation
│           │   ├── scan.service.ts              # Scan orchestration
│           │   └── quota.service.ts             # Quota tracking/enforcement
│           ├── plugins/
│           │   ├── auth.ts                      # JWT auth plugin
│           │   ├── db.ts                        # Prisma plugin
│           │   └── rate-limit.ts                # Rate limiting plugin
│           └── workers/
│               ├── scan.worker.ts               # Background scan processor
│               └── analysis.worker.ts           # Background SEO analysis processor
├── packages/
│   ├── shared/                     # @commercehunter/shared
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── business.ts
│   │       │   ├── scan.ts
│   │       │   ├── analysis.ts
│   │       │   ├── user.ts
│   │       │   └── subscription.ts
│   │       ├── constants/
│   │       │   ├── ape-codes.ts                # APE → entity type mapping
│   │       │   ├── scoring-weights.ts          # Score calculation weights
│   │       │   └── plans.ts                    # Subscription plan definitions
│   │       └── schemas/
│   │           ├── scan.schema.ts              # Zod validation schemas
│   │           ├── auth.schema.ts
│   │           └── business.schema.ts
│   ├── db/                         # @commercehunter/db
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts                         # Seed subscription plans
│   │   └── src/
│   │       └── index.ts                        # Re-export Prisma client
│   ├── pdf/                        # @commercehunter/pdf
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── audit-report.tsx                # Main PDF report component
│   │       ├── components/                     # PDF sub-components
│   │       └── generate.ts                     # PDF generation entry point
│   ├── eslint-config/              # @commercehunter/eslint-config
│   │   └── package.json
│   └── tsconfig/                   # @commercehunter/tsconfig
│       ├── base.json
│       ├── nextjs.json
│       ├── node.json
│       └── package.json
└── specs/                          # Feature specifications (existing)
```

**Structure Decision**: Monorepo with pnpm workspaces + Turborepo. Two apps (`web` for Next.js frontend, `api` for Fastify backend) communicating via REST API. Shared packages for types (`shared`), database (`db`), PDF generation (`pdf`), and config (`eslint-config`, `tsconfig`). Design system components live in `apps/web/src/components/ui/` co-located with shadcn/ui — defined by `002-design-system-genz-theme`. This matches the user's specified architecture and enables independent deployment of frontend and backend.

## Implementation Phases

### Phase 0 — Architecture & Setup (Foundations)

**Goal**: Working monorepo with Docker, database, and both apps serving basic health checks.

**Tasks**:
1. Initialize pnpm workspace with `pnpm-workspace.yaml` and `turbo.json`
2. Create `packages/tsconfig` with base, nextjs, and node configs
3. Create `packages/eslint-config` with shared ESLint + Prettier setup
4. Create `packages/shared` with initial type definitions and Zod schemas
5. Create `packages/db` with Prisma schema (all entities from data-model.md), initial migration, seed script
6. Create `apps/api` — Fastify app with health check route, Prisma plugin, env config
7. Create `apps/web` — Next.js 15 App Router with health check page, env config
8. Initialize TailwindCSS v4 in `apps/web` with `globals.css` — define all OKLCH color tokens, surface elevation tokens, gradient utilities, glass utilities, animation keyframes (per `002-design-system-genz-theme` design tokens)
9. Initialize shadcn/ui in `apps/web` — `cssVariables: true`, dark-only theme, customize `components.json`
10. Configure `next/font/google` in `layout.tsx` — Space Grotesk (`--font-heading`) + Inter (`--font-body`), register font variables in `@theme inline`
11. Install frontend dependencies: `motion`, `recharts` in `apps/web`
12. Set up dark-only mode: `class="dark"` on `<html>`, `@custom-variant dark` in globals.css, `<MotionConfig reducedMotion="user">` wrapper in layout
13. Create `docker-compose.yml` (dev: PostgreSQL), `docker/Dockerfile.api`, `docker/Dockerfile.web`
14. Create `.env.example` with all required environment variables
15. Verify: `docker-compose up -d postgres && pnpm dev` → API health check OK, Web accessible with dark theme and correct fonts

**Deliverable**: `docker-compose up` functional, API ping OK, frontend accessible with dark theme foundation (colors, fonts, glass utilities).

---

### Phase 1 — Auth & Multi-User

**Goal**: Secure authentication system with organization-scoped multi-user support.

**Tasks**:
1. Implement auth routes: register (creates org + admin user), login, logout, refresh
2. JWT httpOnly cookie middleware (access + refresh tokens)
3. Password hashing with bcrypt (cost factor 12)
4. Role-based middleware (ADMIN vs USER)
5. Organization invitation flow: invite endpoint, accept endpoint
6. Frontend: login page, register page, invite accept page
7. Frontend: auth context provider, protected route layout
8. Frontend: session check on app load

**Acceptance**: Account creation, login/logout, protected dashboard route, team invitation.

---

### Phase 2 — Data Collection (SIRENE + Places)

**Goal**: Scan a postal code and retrieve a deduplicated list of businesses.

**Tasks**:
1. SIRENE service: OAuth2 token manager (auto-refresh), rate-limited HTTP client (25 RPM)
2. SIRENE service: query builder (postal code, APE filter, employee filter, pagination with cursor)
3. APE code classification: map APE → COMMERCE or PME based on configurable mapping in `packages/shared`
4. Business upsert logic: deduplicate by SIRET, update on re-scan
5. Scan orchestration service: create scan, dispatch to background worker, track status
6. Background scan worker: process scan jobs, call SIRENE, store businesses, update scan status
7. Google Places enrichment service: Text Search to match business by name+city, Place Details for phone/website (on-demand)
8. Scan API routes: create scan, list scans, get scan details
9. Frontend: scan creation form (postal code, entity type, APE categories, min employees)
10. Frontend: scan list page, scan status display
11. Quota enforcement: check organization quota before creating scan

**Acceptance**: Scan 13600 returns >= 200 entities, no strict duplicates, COMMERCE/PME classified.

---

### Phase 3 — SEO & Technical Analysis

**Goal**: Automated SEO audit for every discovered website.

**Tasks**:
1. SEO analyzer service: fetch URL with native fetch, parse HTML with cheerio
2. Technical checks: HTTPS, status code, response time, robots.txt, sitemap.xml
3. SEO on-page checks: title (with length), meta description, H1, canonical, favicon
4. Mobile checks: viewport meta tag, page weight assessment (quick check)
5. Local SEO checks: city name in title/H1/description, Schema LocalBusiness JSON-LD, Google Maps iframe
6. PageSpeed Insights integration: async mobile score retrieval for Pro/Agency plans
7. Analysis background worker: process analysis jobs with concurrency limit (5 workers max)
8. Analysis status tracking: PENDING → RUNNING → COMPLETED/FAILED/NO_WEBSITE
9. Re-analysis endpoint: trigger fresh analysis for a business
10. Store full raw analysis JSON alongside structured fields

**Acceptance**: Complete analysis for each valid website, raw audit JSON stored.

---

### Phase 4 — Scoring Engine

**Goal**: Calculate scores and assign priority to every business.

**Tasks**:
1. SEO score calculation: weight individual checks into /100 score
2. Digital score calculation: weighted formula (SEO 40%, presence 25%, mobile 15%, data completeness 10%, business size 10%)
3. Priority assignment: HIGH >= 80, MEDIUM 60-79, LOW < 60
4. Score recalculation on re-analysis
5. Unit tests for scoring with known inputs/outputs

**Acceptance**: Every business has seo_score, digital_score, and priority after analysis.

---

### Phase 5 — Dashboard

**Goal**: Exploitable interface for viewing and filtering business opportunities, using design system components from `002-design-system-genz-theme`.

**Tasks**:
1. Dashboard stats API: aggregate KPIs (total, Commerce/PME split, % without website, avg score, HIGH count)
2. Business list API: filtering (entity type, priority, website, city, APE, score range, search), sorting, pagination
3. Build design system components (per `002-design-system-genz-theme` contracts): `GlassCard`, `GradientButton`, `PriorityBadge`, `AnimatedCounter`, `StaggerContainer`/`StaggerItem`, `SkeletonLoader`
4. Build data visualization components: `ScoreGauge` (SVG circular gauge with gradient stroke + motion.circle), `SEORadarChart` (Recharts RadarChart via shadcn ChartContainer), `GradientProgressBar`
5. Build `ScanRadar` pulse animation component for active scan visualization
6. Build `DrawerPanel` animated side panel for filters
7. Create `template.tsx` with page entrance animation (fade + translate up)
8. Create `lib/layout-transition.tsx` (FrozenRouter + LayoutTransition for exit animations)
9. Frontend dashboard overview: `GlassCard` KPI cards with `StaggerContainer` entrance, `AnimatedCounter` for metrics, Recharts distribution chart with dark theme styling
10. Frontend business table: themed table with `PriorityBadge` badges, row hover highlight, `SkeletonLoader` for loading states, `DrawerPanel` for filters
11. Frontend business detail/audit page: `SplitLayout` (visualizations left, details right), `ScoreGauge` for digital score, `SEORadarChart` for SEO dimensions, grouped recommendations
12. Frontend scan status page: `ScanRadar` pulse animation during scan, `GradientProgressBar` for progress
13. Responsive design for all dashboard views
14. Verify: all CTAs use `GradientButton` (gradient styling), no default shadcn styling left uncustomized, WCAG AA contrast on all text

**Acceptance**: Dark immersive UI, glassmorphism cards, animated KPIs, Commerce/PME filtering works, fast search, all components match design system spec.

---

### Phase 6 — Export & PDF Audit

**Goal**: CSV and PDF export for sales material.

**Tasks**:
1. CSV export endpoint: stream filtered businesses as CSV with all key fields
2. PDF audit report template: @react-pdf/renderer components (business identity, SEO audit, scores, recommendations)
3. PDF generation endpoint: generate and stream PDF for a single business
4. Frontend: export CSV button on business list, export PDF button on business detail
5. Plan-based feature gating: PDF export restricted to Pro/Agency

**Acceptance**: Professional PDF audit presentable to client, complete CSV export.

---

### Phase 7 — Billing & Quotas

**Goal**: Monetization via Stripe subscription billing.

**Tasks**:
1. Stripe integration: checkout session creation, webhook handler, billing portal
2. Subscription plan enforcement middleware: check plan limits on scan creation, analysis, and export
3. Usage tracking: monthly analysis counter, reset on billing period
4. Frontend: billing page (current plan, usage stats, upgrade/manage buttons)
5. Stripe webhook handling: checkout.session.completed, invoice.paid/failed, subscription updated/deleted

**Acceptance**: Payment works, quota exceeded blocks further usage.

---

### Phase 8 — Performance & Security Hardening

**Tasks**:
1. API rate limiting (per user, per IP)
2. Intelligent retry with exponential backoff for external APIs (SIRENE, Google, PageSpeed)
3. Structured logging (pino via Fastify)
4. XSS protection (Content-Security-Policy headers)
5. CSRF protection (SameSite cookies + origin check)
6. Input validation with Zod on all API routes
7. Database indexes on frequently queried columns (see data-model.md)
8. Query optimization for dashboard aggregation

---

### Phase 9 — Production Deployment

**Tasks**:
1. Production Docker images (multi-stage builds, standalone Next.js)
2. Nginx reverse proxy configuration
3. HTTPS via Let's Encrypt (certbot)
4. CI/CD pipeline (GitLab CI or GitHub Actions)
5. PostgreSQL backup strategy (pg_dump cron)
6. Health check endpoints for container orchestration
7. Environment-specific configuration (dev/staging/prod)

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lighthouse/PageSpeed too slow for batch analysis | Delays in analysis completion | Use quick cheerio-based checks for all plans; PageSpeed only for Pro/Agency, async |
| Google Places API cost escalation | Budget overrun | Tiered enrichment (Enterprise SKU only for high-priority), aggressive caching (30-day TTL) |
| SIRENE API rate limit (30 RPM) | Slow scans for large cities | Queue-based scan processing, cursor pagination, batch by 1000 |
| Malformed HTML on target websites | Analysis crashes | try/catch around cheerio parsing, store partial results, mark as FAILED with error |
| NAF 2025 nomenclature change (Jan 2027) | APE code mappings break | Configurable APE mapping in packages/shared, documented in constants |
| backdrop-filter performance on low-end devices | Janky scrolling on dashboard | Cap blur at 24px, limit simultaneous blurred elements to 10-15, degrade via @supports |
| Recharts bundle size (~150KB gzipped) | Increases initial page load | Dynamic import chart components only on pages that use them (dashboard, audit detail) |

## Complexity Tracking

| Item | Justification | Simpler Alternative Rejected Because |
|------|--------------|-------------------------------------|
| 6 packages in monorepo | Types, DB, PDF, UI, ESLint, TSConfig need isolation for independent development and Docker builds | Fewer packages would mix concerns (e.g., PDF generation in API source, Prisma schema in shared) |
| Background workers for scan/analysis | SIRENE rate limits and PageSpeed API latency make synchronous processing impossible within user-facing request timeouts | Synchronous processing would timeout or block the event loop |
| Google Places enrichment (2nd API) | SIRENE does not provide phone numbers or website URLs, which are essential for the core value proposition (contacting prospects, analyzing their websites) | SIRENE-only would miss ~40% of website URLs and all phone numbers |
