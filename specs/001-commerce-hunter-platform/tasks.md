# Tasks: CommerceHunter Platform

**Input**: Design documents from `/specs/001-commerce-hunter-platform/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: Not explicitly requested — tests are omitted. Unit tests for scoring engine are included per plan.md Phase 4 task 5.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Design system component tasks (from `002-design-system-genz-theme`) are embedded in US3 (Dashboard) since that is where they are first consumed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `apps/web/` (Next.js 15), `apps/api/` (Fastify), `packages/shared/`, `packages/db/`, `packages/pdf/`, `packages/eslint-config/`, `packages/tsconfig/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Working monorepo with Docker, database, both apps serving health checks, and dark theme foundation.

- [x] T001 Initialize pnpm workspace: create `pnpm-workspace.yaml` (packages: `apps/*`, `packages/*`) and root `package.json` with shared devDependencies (typescript, prettier)
- [x] T002 Create `turbo.json` with build/dev/lint pipelines and package task dependencies
- [x] T003 [P] Create `packages/tsconfig/` — `base.json`, `nextjs.json`, `node.json`, `package.json`
- [x] T004 [P] Create `packages/eslint-config/` — shared ESLint + Prettier config, `package.json`
- [x] T005 Create `apps/api/` — Fastify app skeleton: `package.json` (@commercehunter/shared, @commercehunter/db, fastify, @fastify/cookie, @fastify/cors, zod), `tsconfig.json`, `src/app.ts` (Fastify factory with CORS + cookie), `src/server.ts` (entry point), health check route `GET /api/v1/health`
- [x] T006 Create `apps/web/` — Next.js 15 App Router skeleton: `package.json` (@commercehunter/shared, next, react, react-dom), `tsconfig.json`, `next.config.ts`, `src/app/page.tsx` (health check page)
- [x] T007 [P] Initialize TailwindCSS v4 in `apps/web/src/app/globals.css` — define all OKLCH color tokens (`:root` block), `@theme inline` bridge to Tailwind utilities, `@custom-variant dark` for always-on dark mode, gradient utilities (`.gradient-neon-primary`, `.gradient-neon-accent`, `.gradient-neon-full`, `.text-gradient-neon`), glass utilities (`.glass`, `.glass-elevated`, `.glass-subtle`, `.glass-glow-hover`), keyframes (`shimmer`, `glow-pulse`)
- [x] T008 [P] Initialize shadcn/ui in `apps/web/` — create `components.json` with `cssVariables: true`, dark-only theme, install base shadcn/ui dependencies
- [x] T009 Configure `next/font/google` in `apps/web/src/app/layout.tsx` — Space Grotesk (`--font-heading`) + Inter (`--font-body`), register font CSS variables in `@theme inline`, set `class="dark"` on `<html>`, `<body className="font-body bg-background text-foreground antialiased">`, wrap body in `<MotionConfig reducedMotion="user">`
- [x] T010 [P] Install frontend animation/chart dependencies: `pnpm --filter @commercehunter/web add motion recharts`
- [x] T011 Create `docker-compose.yml` (dev: PostgreSQL 16 on port 5432 with volume), `.env.example` with all required env vars (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, SIRENE_CONSUMER_KEY, SIRENE_CONSUMER_SECRET, GOOGLE_PLACES_API_KEY, PAGESPEED_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_AGENCY)
- [x] T012 [P] Create `docker/Dockerfile.api` (multi-stage build, Node.js 20, pnpm install, prune for api), `docker/Dockerfile.web` (multi-stage, standalone Next.js output), `docker/nginx.conf` (reverse proxy)
- [x] T013 Create `.npmrc` with `auto-install-peers=true`, root scripts in `package.json` (`dev`, `build`, `lint`, `db:migrate`, `db:seed`)
- [x] T014 Verify: `docker-compose up -d postgres && pnpm dev` → API health check OK at `localhost:3001/api/v1/health`, Web accessible at `localhost:3000` with dark background (#0F0F14), correct fonts

**Checkpoint**: Monorepo functional, both apps running, dark theme foundation visible, Docker PostgreSQL ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared types/validation, auth system, and API infrastructure that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database & Shared Packages

- [x] T015 Create `packages/db/` — `package.json` (@prisma/client, prisma), `tsconfig.json`, `prisma/schema.prisma` with all 8 entities (Organization, User, SubscriptionPlan, Scan, Business, ScanBusiness, Analysis, Invitation) per data-model.md, all enums (EntityType, ScanStatus, AnalysisStatus, Priority, UserRole, InvitationStatus), all indexes and constraints
- [x] T016 Create Prisma seed script in `packages/db/prisma/seed.ts` — seed 3 SubscriptionPlan rows (Starter: 4900/1 city/500 analyses, Pro: 9900/unlimited/2000, Agency: 19900/unlimited/unlimited with PDF+white-label+API)
- [x] T017 Run initial migration: `pnpm --filter @commercehunter/db exec prisma migrate dev --name init`
- [x] T018 Create `packages/db/src/index.ts` — export PrismaClient singleton and all generated types
- [x] T019 [P] Create `packages/shared/src/types/business.ts` — Business, EntityType, BusinessListItem types matching API contract
- [x] T020 [P] Create `packages/shared/src/types/scan.ts` — Scan, ScanStatus, CreateScanInput types matching API contract
- [x] T021 [P] Create `packages/shared/src/types/analysis.ts` — Analysis, AnalysisStatus, TechnicalChecks, SeoOnPageChecks, MobileChecks, LocalSeoChecks, Scores types
- [x] T022 [P] Create `packages/shared/src/types/user.ts` — User, UserRole, Organization, SubscriptionPlan types
- [x] T023 [P] Create `packages/shared/src/types/subscription.ts` — SubscriptionPlan, PlanName, PlanFeatures types
- [x] T024 [P] Create `packages/shared/src/constants/ape-codes.ts` — APE code → EntityType mapping (Commerce: 47xxx, 56xxx, 45xxx; PME: 41-43xxx, 62xxx, 70xxx), `classifyByApe(code: string): EntityType` function
- [x] T025 [P] Create `packages/shared/src/constants/scoring-weights.ts` — scoring weight constants (SEO: 0.40, presence: 0.25, mobile: 0.15, data: 0.10, size: 0.10), priority thresholds (HIGH >= 80, MEDIUM >= 60)
- [x] T026 [P] Create `packages/shared/src/constants/plans.ts` — plan definitions as constant objects matching seed data
- [x] T027 [P] Create `packages/shared/src/schemas/auth.schema.ts` — Zod schemas: RegisterSchema, LoginSchema, InviteSchema, AcceptInviteSchema
- [x] T028 [P] Create `packages/shared/src/schemas/scan.schema.ts` — Zod schemas: CreateScanSchema (postal code 5 digits, entity type enum, ape categories array, radius 1-50)
- [x] T029 [P] Create `packages/shared/src/schemas/business.schema.ts` — Zod schemas: BusinessQuerySchema (scanId required, pagination, filters, sort)
- [x] T030 Create `packages/shared/package.json` and `packages/shared/src/index.ts` — barrel export all types, constants, schemas

### API Infrastructure

- [x] T031 Create Prisma plugin in `apps/api/src/plugins/db.ts` — register PrismaClient as Fastify decorator, graceful disconnect on close
- [x] T032 Create auth plugin in `apps/api/src/plugins/auth.ts` — JWT verification from httpOnly cookie (`access_token`), decode user ID + org ID + role, attach to `request.user`
- [x] T033 Implement auth routes in `apps/api/src/routes/auth.ts`:
  - `POST /api/v1/auth/register` — create Organization (with default Starter plan) + User (ADMIN role), hash password (bcrypt cost 12), set httpOnly cookies (access_token 15min, refresh_token 7d)
  - `POST /api/v1/auth/login` — verify email+password, set cookies
  - `POST /api/v1/auth/logout` — clear cookies
  - `POST /api/v1/auth/refresh` — verify refresh token, issue new access+refresh tokens
- [x] T034 Create rate limit plugin in `apps/api/src/plugins/rate-limit.ts` — @fastify/rate-limit with per-user limits

### Frontend Auth Infrastructure

- [x] T035 [P] Create `apps/web/src/lib/api-client.ts` — typed fetch wrapper with base URL, cookie credentials, JSON parsing, error handling (401 → redirect to login)
- [x] T036 [P] Create `apps/web/src/app/(auth)/login/page.tsx` — login form (email, password), glass card styling, gradient submit button, error display, redirect to dashboard on success
- [x] T037 [P] Create `apps/web/src/app/(auth)/register/page.tsx` — registration form (org name, user name, email, password), glass card, gradient submit, redirect to dashboard
- [x] T038 Create `apps/web/src/app/(dashboard)/layout.tsx` — authenticated layout: check session on load (call `/api/v1/auth/refresh`), redirect to login if unauthenticated, render sidebar/nav + children

**Checkpoint**: Foundation ready — database migrated with seed data, auth working (register, login, logout, refresh), protected dashboard route, shared types and schemas available. User story implementation can now begin.

---

## Phase 3: User Story 1 — Scan Local Businesses (Priority: P1) 🎯 MVP

**Goal**: A user enters a postal code and receives a list of businesses with name, address, APE code, entity type, and website URL.

**Independent Test**: Enter postal code "13600" with entity type "BOTH" → system returns a list of businesses from SIRENE with Commerce/PME classification.

### Backend — SIRENE Integration & Scan Processing

- [x] T039 Create SIRENE service in `apps/api/src/services/sirene.service.ts`:
  - OAuth2 token manager (consumer key/secret → bearer token, auto-refresh on expiry)
  - Rate-limited HTTP client (25 RPM with queue)
  - Query builder: Lucene query from postal code + entity type + APE filters + employee filter
  - Cursor-based pagination (batch 1000 establishments per request)
  - Response mapper: SIRENE JSON → Business fields (SIRET, SIREN, name from denominationUniteLegale, APE from activitePrincipaleEtablissement, address, city, postal code, legal form, employee range)
- [x] T040 Create Google Places enrichment service in `apps/api/src/services/google-places.service.ts`:
  - Text Search by business name + city → match by proximity
  - Place Details → extract phone, website URL, latitude, longitude, place_id
  - Caching: 30-day TTL on enrichment results
  - Graceful degradation: if API key missing or quota exceeded, skip enrichment
- [x] T041 Create scan orchestration service in `apps/api/src/services/scan.service.ts`:
  - `createScan()`: validate inputs, check org quota (city limit), create Scan record (PENDING), dispatch to background worker
  - `getScan()`: get scan with summary stats (commerce/pme counts, with/without website, avg score, high priority count)
  - `listScans()`: paginated list for organization
- [x] T042 Create background scan worker in `apps/api/src/workers/scan.worker.ts`:
  - Process scan job: update status → RUNNING, call SIRENE service with scan params
  - For each business: upsert by SIRET (create or update), classify APE → COMMERCE/PME via shared constant
  - Create ScanBusiness join records
  - After SIRENE: enrich via Google Places (phone, website) for businesses without website URL
  - Update scan: status → COMPLETED, total_businesses count
  - Error handling: status → FAILED with error_message on unrecoverable errors
- [x] T043 Create scan API routes in `apps/api/src/routes/scans.ts`:
  - `POST /api/v1/scans` — validate with CreateScanSchema, check quota, call scan.service.createScan, return 201
  - `GET /api/v1/scans` — list scans for org, paginated, optional status filter
  - `GET /api/v1/scans/:id` — get scan details with stats, verify org ownership

### Frontend — Scan Pages

- [x] T044 [P] Create scan list page in `apps/web/src/app/(dashboard)/scans/page.tsx` — list user's scans with name, postal code, entity type, status badge, total businesses, created date; link to scan detail; "New Scan" CTA (GradientButton)
- [x] T045 [P] Create scan creation form in `apps/web/src/app/(dashboard)/scans/new/page.tsx` — form fields: name, postal code (5-digit validation), entity type select (COMMERCE/PME/BOTH), APE category multi-select, min employees input; glass card container; gradient submit button; redirect to scan detail on success
- [x] T046 Create scan results page in `apps/web/src/app/(dashboard)/scans/[id]/page.tsx` — show scan status, poll for completion if RUNNING, display business count, entity type split, % without website; link to business list filtered by scanId

**Checkpoint**: User can create a scan for postal code "13600", system retrieves businesses from SIRENE, classifies Commerce/PME, enriches via Google Places, displays results. US1 independently testable.

---

## Phase 4: User Story 2 — Analyze Website SEO & Technical Quality (Priority: P1) 🎯 MVP

**Goal**: Every discovered business website is automatically analyzed for technical/SEO quality and scored.

**Independent Test**: After a scan completes, each business with a website has a complete analysis (HTTPS, response time, title, meta description, mobile viewport, local SEO signals, scores, priority).

### Backend — SEO Analysis Engine

- [x] T047 Create SEO analyzer service in `apps/api/src/services/seo-analyzer.service.ts`:
  - Fetch URL with native fetch (undici): follow redirects (max 5), 10s timeout, record final URL
  - Technical checks: HTTPS from protocol, HTTP status code, response time (Date.now diff), check `/robots.txt` exists (HEAD request), check `/sitemap.xml` exists (HEAD request)
  - SEO on-page checks (cheerio parse): extract `<title>` text + length, `<meta name="description">` content + length, first `<h1>` text, `<link rel="canonical">` presence, favicon detection (`<link rel="icon">` or `/favicon.ico` HEAD)
  - Mobile checks: `<meta name="viewport">` presence, basic page weight assessment (HTML size < 2MB)
  - Local SEO checks (city name from Business record): city name in title (case-insensitive), city in H1, city in meta description, detect `<script type="application/ld+json">` with `@type: "LocalBusiness"`, detect `<iframe>` with `maps.google.com` or `google.com/maps`
  - Store all results in Analysis record + raw_analysis_json field
  - Error handling: catch network errors, timeouts, parse errors → mark FAILED with error_message
- [x] T048 Create scoring service in `apps/api/src/services/scoring.service.ts`:
  - `calculateSeoScore(analysis)`: weight individual checks into /100 score per FR-009 (technical: HTTPS 10pts, status 200 10pts, response < 3s 10pts, robots.txt 5pts, sitemap 5pts; on-page: title 10pts, description 10pts, H1 5pts, canonical 5pts, favicon 5pts; mobile: viewport 10pts, page weight 5pts; local: city in title 3pts, city in H1 2pts, city in desc 2pts, schema 5pts, maps 3pts = total weights to 100)
  - `calculateDigitalScore(analysis, business)`: weighted formula — SEO 40%, presence 25% (has website = 25, no website = 0), mobile 15% (mobile_score or viewport-based), data completeness 10% (phone + email + legal form + employee data), size potential 10% (employee range bracket)
  - `assignPriority(digitalScore)`: HIGH >= 80, MEDIUM >= 60, LOW < 60
  - `scoreAnalysis(analysis, business)`: orchestrate all scoring, update Analysis record
- [x] T049 Create analysis background worker in `apps/api/src/workers/analysis.worker.ts`:
  - After scan completes: create Analysis records (PENDING) for all businesses in scan
  - For businesses without website: set status → NO_WEBSITE, assign lowest SEO score (0), calculate digital score (presence=0), assign HIGH priority
  - For businesses with website: process concurrently (max 5 parallel), call seo-analyzer, then scoring service
  - Update analysis status: RUNNING → COMPLETED or FAILED
  - Increment organization `monthly_analyses_used` counter for each analysis
- [x] T050 Add re-analysis endpoint in `apps/api/src/routes/businesses.ts`:
  - `POST /api/v1/businesses/:id/reanalyze` — reset analysis to PENDING, dispatch to worker, return 202
- [x] T051 Create unit tests for scoring service in `apps/api/src/services/__tests__/scoring.service.test.ts` — test with known inputs: perfect score (all checks pass → 100), zero score (no website → 0 SEO), partial scores, edge cases (missing fields), priority thresholds (79 → MEDIUM, 80 → HIGH)

**Checkpoint**: After scan completes, every business has an Analysis record with scores and priority. US2 independently testable — verify analysis output for known URLs.

---

## Phase 5: User Story 3 — View Dashboard & Prioritize Prospects (Priority: P2)

**Goal**: Exploitable dashboard with aggregated KPIs, filterable business list, detailed audit view — fully styled with dark GEN Z design system.

**Independent Test**: Open dashboard after a completed scan → see total entities, Commerce/PME split, % without website, avg score, HIGH count. Filter by entity type + priority → correct subset. Click business → see full audit detail.

### Backend — Dashboard & Business APIs

- [x] T052 Create dashboard stats API in `apps/api/src/routes/dashboard.ts`:
  - `GET /api/v1/dashboard/stats` — aggregate: totalEntities, commerceCount, pmeCount, withoutWebsite, withoutWebsitePercent, averageDigitalScore, highPriorityCount, mediumPriorityCount, lowPriorityCount, topSectors (group by APE prefix, top 5)
  - Optional `scanId` query param to filter to a specific scan
- [x] T053 Create business list API in `apps/api/src/routes/businesses.ts`:
  - `GET /api/v1/businesses` — validate with BusinessQuerySchema, require scanId, apply filters (entityType, priority, hasWebsite, city, apeCode, minScore, maxScore, search), sorting (digital_score, seo_score, name, city), pagination
  - `GET /api/v1/businesses/:id` — full business detail with nested analysis object (technical, seoOnPage, mobile, localSeo, scores) per API contract

### Frontend — Design System Components (from 002-design-system-genz-theme)

- [x] T054 [P] Build `apps/web/src/components/ui/glass-card.tsx` — 3 variants (default, elevated, subtle), `hoverable` prop with glow-on-hover, per component contract
- [x] T055 [P] Build `apps/web/src/components/ui/gradient-button.tsx` — 3 gradient variants (primary: purple→cyan, accent: purple→pink, full: pink→purple→cyan), sm/md/lg sizes, loading spinner, disabled state, reduced motion support
- [x] T056 [P] Build `apps/web/src/components/ui/priority-badge.tsx` — HIGH (green #00FF9F), MEDIUM (amber #FF9F1C), LOW (pink #FF2E88), pill shape, sm/md sizes
- [x] T057 [P] Build `apps/web/src/components/ui/animated-counter.tsx` — count-up from 0 to value on mount, configurable duration (default 1500ms), prefix/suffix, decimals support, cubic-bezier(0.16, 1, 0.3, 1) easing, reduced motion: instant display
- [x] T058 [P] Build `apps/web/src/components/ui/stagger.tsx` — `StaggerContainer` (delay, staggerDelay props) + `StaggerItem`, fade + translate up entrance, 400ms per item, reduced motion: immediate appear
- [x] T059 [P] Build `apps/web/src/components/ui/skeleton-loader.tsx` — variants: text (configurable lines), card, table-row, chart, gauge; dark shimmer animation (2s infinite), reduced motion: static block
- [x] T060 [P] Build `apps/web/src/components/ui/score-gauge.tsx` — SVG 270-degree arc, gradient stroke (purple→cyan→green), `motion.circle` animated fill (1.5s ease-out), `React.useId()` for unique gradient IDs, score 0-100 clamped, center label, reduced motion: instant state
- [x] T061 [P] Build `apps/web/src/components/ui/seo-radar-chart.tsx` — Recharts RadarChart via shadcn ChartContainer, 4 dimensions (Technical, On-Page, Mobile, Local SEO), dark grid (border/50), muted axis labels, gradient fill 25% opacity, entrance animation 1.2s, reduced motion: no animation
- [x] T062 [P] Build `apps/web/src/components/ui/scan-radar.tsx` — concentric circles with gradient glow, 2s infinite pulse when `active`, progress bar below, reduced motion: static circles
- [x] T063 [P] Build `apps/web/src/components/ui/gradient-progress-bar.tsx` — gradient-neon-primary fill, 300ms ease-out transition, sm/md/lg sizes, optional percentage label, reduced motion: instant width
- [x] T064 [P] Build `apps/web/src/components/ui/split-layout.tsx` — two-column on desktop (>=1024px), stacked on mobile, `ratio` prop (equal, left-heavy, right-heavy)
- [x] T065 [P] Build `apps/web/src/components/ui/drawer-panel.tsx` — slide from left/right (300ms ease-out), backdrop fade, open/onClose props, reduced motion: fade only
- [x] T066 Create `apps/web/src/app/template.tsx` — page entrance animation: fade in (opacity 0→1) + translate up (y: 20→0), 400ms, cubic-bezier(0.16, 1, 0.3, 1), reduced motion: instant
- [x] T067 [P] Create `apps/web/src/lib/layout-transition.tsx` — FrozenRouter + LayoutTransition utility for exit animations

### Frontend — Dashboard Pages

- [x] T068 Create dashboard overview page in `apps/web/src/app/(dashboard)/dashboard/page.tsx`:
  - Fetch stats from `/api/v1/dashboard/stats`
  - KPI cards: total entities, Commerce count, PME count, % without website, avg digital score, HIGH priority count — each in `GlassCard` with `AnimatedCounter`, wrapped in `StaggerContainer`
  - `SkeletonLoader variant="card"` while loading
  - Scan selector dropdown to filter by scan
- [x] T069 Create business list component in `apps/web/src/components/businesses/business-table.tsx`:
  - Fetch from `/api/v1/businesses` with filters + pagination
  - Themed table with columns: name, entity type, APE, city, website (link), SEO score, digital score, priority (`PriorityBadge`)
  - Row hover highlight, click → navigate to business detail
  - `SkeletonLoader variant="table-row"` while loading
- [x] T070 Create filter panel component in `apps/web/src/components/businesses/filter-panel.tsx`:
  - Filters: entity type select, priority multi-select, hasWebsite toggle, city input, APE code input, score range slider, search text input
  - `DrawerPanel` on mobile, inline sidebar on desktop
  - Apply filters → update business list query params
- [x] T071 Create business detail/audit page in `apps/web/src/app/(dashboard)/businesses/[id]/page.tsx`:
  - Fetch from `/api/v1/businesses/:id`
  - `SplitLayout`: left column — `ScoreGauge` (digital score), `SEORadarChart` (4 dimensions); right column — business legal data card (name, SIRET, APE, address, phone, website), full SEO analysis breakdown (technical, on-page, mobile, local grouped in `GlassCard` sections), recommendations
  - Re-analyze button (gradient, calls `/api/v1/businesses/:id/reanalyze`)
  - `SkeletonLoader variant="gauge"` + `variant="chart"` while loading
- [x] T072 Update scan results page `apps/web/src/app/(dashboard)/scans/[id]/page.tsx` — add `ScanRadar` pulse animation while scan is RUNNING, `GradientProgressBar` for progress, link to business list filtered by this scan
- [x] T073 Customize all shadcn/ui base components in `apps/web/src/components/ui/` (button, input, select, dialog, sheet, table, tabs, tooltip, dropdown-menu) to match dark theme — no default light styling remaining
- [x] T074 Verify: all CTAs use `GradientButton`, WCAG AA contrast on all text/background combos, responsive on mobile, `prefers-reduced-motion` respected

**Checkpoint**: Dashboard shows aggregated KPIs with animated counters, business list filterable by type/priority/score/city, detail page shows score gauge + radar chart + full audit. US3 independently testable.

---

## Phase 6: User Story 4 — Export Prospect Data (Priority: P2)

**Goal**: CSV export of filtered business lists and PDF audit reports for individual businesses.

**Independent Test**: Export CSV from filtered dashboard → verify all columns present. Generate PDF for a business → verify it contains legal data, full analysis, scores, recommendations.

### Backend — Export Services

- [x] T075 Create CSV export endpoint in `apps/api/src/routes/export.ts`:
  - `GET /api/v1/export/csv` — accept same filters as business list, stream CSV with headers: name, entityType, apeCode, address, city, postalCode, phone, website, seoScore, digitalScore, priority
  - Set `Content-Type: text/csv`, `Content-Disposition: attachment; filename="commercehunter-export-{date}.csv"`
- [x] T076 Create `packages/pdf/` — `package.json` (@react-pdf/renderer, react), `tsconfig.json`, `src/generate.ts` (renderToBuffer entry point)
- [x] T077 Build PDF audit report template in `packages/pdf/src/audit-report.tsx`:
  - @react-pdf/renderer components: header with business name + date, business identity section (SIRET, APE, address, phone, website), technical audit section (HTTPS, status, response time, robots, sitemap), SEO audit section (title, description, H1, canonical, favicon), mobile section (viewport, performance), local SEO section (city presence, schema, maps), scoring section (SEO score bar, digital score bar, priority badge), commercial potential assessment (text based on priority/score)
  - Professional styling: dark background, accent colors matching design system
- [x] T078 Create PDF export endpoint in `apps/api/src/routes/export.ts`:
  - `GET /api/v1/export/pdf/:businessId` — fetch business + analysis, generate PDF via @commercehunter/pdf, stream response
  - Check plan: if Starter plan → return 403 "PDF export requires Pro plan or higher"
  - Set `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="audit-{business-slug}.pdf"`

### Frontend — Export Buttons

- [x] T079 [P] Add "Export CSV" GradientButton to business list (`apps/web/src/app/(dashboard)/businesses/page.tsx`) — trigger download from `/api/v1/export/csv` with current filters
- [x] T080 [P] Add "Export PDF Audit" GradientButton to business detail page (`apps/web/src/app/(dashboard)/businesses/[id]/page.tsx`) — trigger download from `/api/v1/export/pdf/:id`, show plan gate message for Starter users

**Checkpoint**: CSV downloads with all columns, PDF generates professional audit report. Starter users see upgrade prompt for PDF. US4 independently testable.

---

## Phase 7: User Story 5 — Manage Subscription & Quotas (Priority: P3)

**Goal**: Stripe-powered billing with plan limits enforced on scans, analyses, and feature access.

**Independent Test**: Create users on different plans → verify Starter blocked at 500 analyses, Starter blocked at 2nd city, Pro allows multi-city, PDF gated to Pro+.

### Backend — Billing & Quota Enforcement

- [x] T081 Create quota service in `apps/api/src/services/quota.service.ts`:
  - `checkCityLimit(orgId, newPostalCode)`: count distinct postal codes in org scans, compare to plan.city_limit (0 = unlimited)
  - `checkAnalysisQuota(orgId, count)`: compare monthly_analyses_used + count to plan.monthly_analysis_limit (0 = unlimited)
  - `incrementAnalysisUsage(orgId, count)`: atomically increment counter
  - `checkFeatureAccess(orgId, feature)`: check plan boolean flags (has_pdf_export, has_white_label, has_api_access)
- [x] T082 Integrate quota checks into existing routes:
  - `POST /api/v1/scans`: call `checkCityLimit` + `checkAnalysisQuota` before creating scan → return 403 with upgrade message
  - Analysis worker: call `checkAnalysisQuota` before processing → skip if exceeded
  - `GET /api/v1/export/pdf/:id`: call `checkFeatureAccess("has_pdf_export")` → return 403
- [x] T083 Create Stripe integration in `apps/api/src/routes/billing.ts`:
  - `POST /api/v1/billing/checkout` — create Stripe checkout session for plan change, redirect URL
  - `GET /api/v1/billing/portal` — create Stripe billing portal session
  - `POST /api/v1/billing/webhook` — verify Stripe signature, handle events: `checkout.session.completed` (update org plan + stripe IDs), `invoice.paid` (reset monthly counter, update billing_period_start), `invoice.payment_failed` (flag org), `customer.subscription.updated` (update plan), `customer.subscription.deleted` (downgrade to Starter)

### Frontend — Billing Pages

- [x] T084 Create billing page in `apps/web/src/app/(dashboard)/settings/billing/page.tsx`:
  - Fetch org details from `/api/v1/organization`
  - Display: current plan name, price, usage (analyses used / limit), feature access flags
  - "Upgrade Plan" GradientButton → call `/api/v1/billing/checkout`, redirect to Stripe
  - "Manage Billing" button → call `/api/v1/billing/portal`, redirect to Stripe portal
  - Usage progress bar (`GradientProgressBar`) showing analyses consumed
- [x] T085 Add quota exceeded UI handling across the app:
  - Scan creation: show glass card with quota message + upgrade CTA when 403 returned
  - PDF export: show plan gate modal when 403 returned
  - Analysis: show banner when monthly limit approached (>90% used)

**Checkpoint**: Billing works end-to-end, quota enforcement accurate (SC-008). US5 independently testable.

---

## Phase 8: User Story 6 — Multi-User Access (Priority: P3)

**Goal**: Organization with multiple team members sharing scans, data, and quotas.

**Independent Test**: Create org with 2+ users → both see same scans, usage tracked at org level.

### Backend — Team Management

- [x] T086 Create organization routes in `apps/api/src/routes/organization.ts`:
  - `GET /api/v1/organization` — return org details, plan info, usage stats, member list per API contract
  - `POST /api/v1/organization/invite` — ADMIN only, validate email not in org, create Invitation record (token via crypto.randomUUID, expires 7 days), return invitation details (email sending is out of scope for v1 — return token URL for manual sharing)
  - `POST /api/v1/organization/invite/:token/accept` — validate token not expired/used, create User in organization with USER role, mark invitation ACCEPTED, set auth cookies
- [x] T087 Verify org-scoped data access: all scan/business/dashboard queries filter by `organization_id` from auth context — users only see their org's data

### Frontend — Team Management Pages

- [x] T088 Create team management page in `apps/web/src/app/(dashboard)/settings/team/page.tsx`:
  - Fetch org members from `/api/v1/organization`
  - Display member list: name, email, role badge (ADMIN/USER)
  - Invite form: email input + GradientButton "Invite" → call `/api/v1/organization/invite`, display invitation link
  - ADMIN-only: invite form only visible to ADMIN role users
- [x] T089 Create invite accept page in `apps/web/src/app/(auth)/invite/[token]/page.tsx`:
  - Validate token (show error if expired/invalid)
  - Form: name, password
  - On submit: call `/api/v1/organization/invite/:token/accept`, redirect to dashboard

**Checkpoint**: Multi-user org works, shared scans, org-level quotas. US6 independently testable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, performance optimization, and deployment readiness.

- [ ] T090 [P] Implement API rate limiting in `apps/api/src/plugins/rate-limit.ts` — per-user (100 req/min), per-IP for auth routes (10 req/min)
- [ ] T091 [P] Add retry with exponential backoff for external APIs in SIRENE service, Google Places service, and PageSpeed integration — max 3 retries, jitter
- [ ] T092 [P] Configure structured logging with pino (Fastify default) — log levels per env, request ID correlation, redact sensitive fields (password, tokens)
- [ ] T093 [P] Add security headers in `apps/api/src/app.ts` — Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security
- [ ] T094 [P] Add CSRF protection — SameSite=Lax on cookies, origin header check on mutation endpoints
- [ ] T095 Verify Zod validation on ALL API routes — no unvalidated user input reaches services or database
- [ ] T096 [P] Add database indexes per data-model.md — verify all indexes exist in Prisma schema (siret unique, siren, postal_code, entity_type, ape_code, website on Business; scan_id+business_id unique on ScanBusiness)
- [ ] T097 Optimize dashboard aggregation query — single SQL query with GROUP BY for stats, avoid N+1 on business list
- [ ] T098 [P] Create `docker-compose.prod.yml` — postgres + api + web + nginx, production env vars, health checks
- [ ] T099 [P] Create CI pipeline configuration (GitHub Actions or GitLab CI) — lint, typecheck, test, build for all packages
- [ ] T100 [P] Configure environment-specific settings — dev/staging/prod env files, CORS origins, cookie domains
- [ ] T101 Run `quickstart.md` validation — verify all setup steps from quickstart.md work on a fresh clone

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 Scan (Phase 3)**: Depends on Phase 2 completion
- **US2 Analysis (Phase 4)**: Depends on Phase 3 (needs businesses to analyze)
- **US3 Dashboard (Phase 5)**: Depends on Phase 4 (needs scores/analyses to display), but design system components (T054-T067) can start after Phase 2
- **US4 Export (Phase 6)**: Depends on Phase 4 (needs analysis data), Phase 5 (needs business detail page for PDF button)
- **US5 Billing (Phase 7)**: Can start after Phase 2, but integrates with US1 (scan quota) and US4 (PDF feature gate)
- **US6 Multi-User (Phase 8)**: Can start after Phase 2 (auth foundation)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1) Scan**: Depends on Foundational (Phase 2) only — no other story dependency
- **US2 (P1) Analysis**: Depends on US1 (needs scanned businesses with website URLs)
- **US3 (P2) Dashboard**: Depends on US2 (needs scored/analyzed businesses). Design system components can be built in parallel after Phase 2.
- **US4 (P2) Export**: Depends on US2 (analysis data for CSV/PDF content) + US3 (business detail page for PDF button placement)
- **US5 (P3) Billing**: Partially independent — quota service can be built after Phase 2, but integration with scan/export routes depends on those being built
- **US6 (P3) Multi-User**: Mostly independent — can be built after Phase 2, but org data scoping verification (T087) benefits from scan routes existing

### Within Each User Story

- Backend services before API routes
- API routes before frontend pages
- Data models/types before services
- Core implementation before integration

### Parallel Opportunities

Within Phase 1 (Setup):
- T003, T004 (tsconfig + eslint) can run in parallel
- T007, T008 (Tailwind + shadcn) can run in parallel after T006
- T010, T012 (deps + Docker) can run in parallel

Within Phase 2 (Foundational):
- T019-T030 (all shared types, constants, schemas) can all run in parallel
- T035-T037 (api client, login page, register page) can all run in parallel

Within Phase 5 (Dashboard):
- T054-T067 (all design system components) can all run in parallel
- T069-T071 (business table, filter panel, business detail) depend on T054-T067 but can run in parallel with each other

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup → monorepo + dark theme foundation
2. Complete Phase 2: Foundational → database + auth + shared types
3. Complete Phase 3: US1 → scan postal code, retrieve businesses
4. Complete Phase 4: US2 → analyze websites, score, prioritize
5. **STOP and VALIDATE**: Scan 13600 → verify businesses returned with scores and priorities
6. Minimal frontend to view results (basic table without full design system)

### Full Product (+ US3-US6)

7. Complete Phase 5: US3 → full dashboard with design system
8. Complete Phase 6: US4 → CSV + PDF export
9. Complete Phase 7: US5 → Stripe billing + quotas
10. Complete Phase 8: US6 → multi-user organizations
11. Complete Phase 9: Polish → security, performance, deployment

### Parallel Team Strategy

With 2 developers after Phase 2 is complete:
- **Dev A**: US1 → US2 → US4 (backend-focused: SIRENE, analysis, export)
- **Dev B**: Design system components (T054-T067) → US3 frontend → US6 (frontend-focused: dashboard, team)
- After US1+US2 complete: Dev B integrates dashboard with real data
- US5 (billing) assigned to whichever dev finishes first

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- US2 depends on US1 because analysis requires scanned businesses — these cannot run fully in parallel
- Design system components (T054-T067) are from `002-design-system-genz-theme` spec — they follow the component contracts defined in `specs/002-design-system-genz-theme/contracts/ui-components.md`
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
