# Research: CommerceHunter Platform

**Branch**: `001-commerce-hunter-platform` | **Date**: 2026-02-25

## 1. SIRENE API (api.insee.fr)

### Decision
Use the **INSEE SIRENE API v3** as the primary business data source.

### Rationale
- Only API with full Lucene-style query syntax for APE code, postal code, and employee range filtering
- Returns comprehensive legal unit + establishment data (SIREN, SIRET, APE, address, legal form, employee range)
- Free access with OAuth2 consumer credentials

### Key Technical Details

**Authentication**: OAuth2 Client Credentials flow via `https://api.insee.fr/token`. Tokens valid 24h.

**Endpoints**:
- `GET /entreprises/sirene/V3/siret` — Search establishments (primary for postal code scans)
- `GET /entreprises/sirene/V3/siren` — Search legal units

**Query syntax** (Lucene-style `q` parameter):
```
q=codePostalEtablissement:13600 AND activitePrincipaleEtablissement:47.* AND etatAdministratifEtablissement:A
q=codePostalEtablissement:13600 AND trancheEffectifsEtablissement:[11 TO *]
```

**Rate limits**: 30 requests/minute. Implement application-level throttling at 25 RPM.

**Pagination**: Cursor-based (`curseur` parameter) for large result sets. Max 1000 results per page.

**Key fields**: `siren`, `siret`, `denominationUniteLegale`, `activitePrincipaleEtablissement`, `trancheEffectifsEtablissement`, `categorieJuridiqueUniteLegale`, `codePostalEtablissement`, `libelleCommuneEtablissement`, full address components.

### Alternatives Considered
- **API Recherche d'Entreprises** (`recherche-entreprises.api.gouv.fr`): No auth required but limited filtering — insufficient for APE/employee range queries.

---

## 2. Google Places API — Data Enrichment

### Decision
Use **Google Places API with tiered enrichment** to supplement SIRENE data with phone, website, and coordinates.

### Rationale
- SIRENE does not reliably provide phone numbers or website URLs
- Google Places has strong French business coverage
- Tiered approach controls costs: free for coordinates, Enterprise SKU only when needed

### Strategy
1. **Nominatim** (free, OpenStreetMap) for basic geocoding (address → coordinates)
2. **Google Places Text Search (Pro SKU)** to match SIRENE businesses to Google Place IDs — free for first 5,000/month
3. **Google Places Details (Enterprise SKU)** for phone + website — only for high-priority prospects or on-demand — free for first 1,000/month

### Cost Projection
- 1 city (~500 businesses): within free tier = $0/month
- 10 cities (~5,000 businesses): ~$80/month
- 100 cities (~50,000 businesses): ~$1,000/month

### Alternatives Considered
- **PagesJaunes scraping**: Rich data but legally risky (database sui generis rights, CNIL guidance)
- **HERE Places API**: 250K free/month but less comprehensive French coverage

---

## 3. SEO Analysis Stack

### Decision
Use **native fetch (undici)** + **cheerio** + **PageSpeed Insights API**.

### Rationale
- No headless browser needed — keeps container image ~50MB vs ~500MB with Puppeteer
- undici is 2-4x faster than axios, zero extra dependencies (Node.js core)
- cheerio is 70% faster than jsdom, sufficient for all static HTML checks
- PageSpeed Insights API provides real Lighthouse scores for free (25,000/day)

### Implementation Details

| Check | Method |
|-------|--------|
| HTTPS, status code, response time | native fetch |
| robots.txt, sitemap.xml | native fetch (GET /robots.txt, /sitemap.xml) |
| Title, meta description, H1, canonical, favicon, viewport | cheerio HTML parsing |
| Schema LocalBusiness | cheerio JSON-LD parsing |
| Google Maps embed | cheerio iframe src matching |
| City name in content | string matching |
| Mobile performance score | PageSpeed Insights API (strategy=mobile) |

### Mobile Scoring Approach
- **Quick check** (all plans): viewport meta tag + page weight via Content-Length — cheerio-based, instant
- **Deep check** (Pro/Agency): Full Lighthouse score via PageSpeed Insights API — async, queued

### Alternatives Considered
- **Puppeteer/headless Chrome**: Full Lighthouse locally — rejected due to 150-400MB Chromium binary, high CPU/memory
- **jsdom**: Full DOM with JS execution — rejected, unnecessary overhead for static checks

---

## 4. PDF Generation

### Decision
Use **@react-pdf/renderer** for audit report generation.

### Rationale
- React ecosystem alignment (frontend is Next.js/React — same component model)
- No Chromium dependency (unlike Puppeteer) — critical for container size (FR-021)
- Server-side rendering in Node.js/Fastify
- Automatic pagination, flexbox layout, headers/footers
- Active maintenance (v4.3.2+, 15,900+ GitHub stars)

### Limitations to Plan Around
- SVG chart rendering limited — use geometric primitives (rectangles for bars, circles for gauges)
- CSS subset only (flexbox) — design templates with this constraint

### Alternatives Considered
- **Puppeteer HTML-to-PDF**: Pixel-perfect but adds 150-400MB to container
- **pdfmake**: Good auto-layout but JSON-based syntax less maintainable for complex reports
- **PDFKit**: Too low-level for multi-page audit reports

---

## 5. Monorepo Structure

### Decision
Use **pnpm workspaces + Turborepo** with the structure defined in the plan.

### Rationale
- Proven with Next.js 15 + Fastify in production (fastify-trpc-next starter)
- Turborepo provides dependency-aware parallel builds and caching
- pnpm's strict dependency resolution prevents phantom dependencies
- Clean separation: `apps/web`, `apps/api`, `packages/*`

### Key Configuration
- `output: 'standalone'` + `outputFileTracingRoot` for Next.js Docker builds
- Fastify app/server separation for testability
- Shared packages: `@commercehunter/shared` (types), `@commercehunter/db` (Prisma), `@commercehunter/pdf` (reports)

---

## 6. Database ORM

### Decision
Use **Prisma ORM** with PostgreSQL.

### Rationale
- Strong TypeScript type generation from schema
- Mature migration system
- Excellent Next.js + Fastify compatibility
- Large ecosystem and community
- User specified Prisma as an option in their plan input

### Alternatives Considered
- **Drizzle ORM**: Lighter weight, SQL-first approach — viable but Prisma's migration system and type generation are more mature for a project of this scope

---

## 7. Authentication

### Decision
Use **JWT in httpOnly cookies** with bcrypt password hashing.

### Rationale
- User explicitly specified JWT httpOnly cookies in their plan input
- Secure by default (httpOnly prevents XSS token theft)
- Stateless — scales horizontally without session store
- Standard approach for SPA + API architecture

### Implementation
- Access token (short-lived, 15min) in httpOnly cookie
- Refresh token (long-lived, 7 days) in httpOnly cookie
- bcrypt for password hashing (cost factor 12)
- Fastify auth middleware validates JWT on protected routes

---

## 8. Payment Processing

### Decision
Use **Stripe** for subscription billing.

### Rationale
- User explicitly specified Stripe in their plan input
- Industry standard for SaaS billing
- Supports tiered plans, usage tracking, and webhooks
- Strong European/French support (PSD2, SEPA)

---

## Summary of All Decisions

| Area | Decision | Key Rationale |
|------|----------|--------------|
| Business data | INSEE SIRENE API v3 | Full query filtering, free, comprehensive |
| Data enrichment | Google Places API (tiered) | Phone/website for high-priority only |
| Geocoding | Nominatim (free) | Avoid Google costs for coordinates |
| HTTP client | native fetch (undici) | 2-4x faster, zero dependencies |
| HTML parsing | cheerio | 70% faster than jsdom, sufficient |
| Mobile scoring | PageSpeed Insights API | Free, no Chromium, real Lighthouse |
| PDF generation | @react-pdf/renderer | React alignment, no Chromium, server-side |
| ORM | Prisma + PostgreSQL | Strong types, mature migrations |
| Auth | JWT httpOnly cookies + bcrypt | Secure, stateless, user-specified |
| Payments | Stripe | User-specified, SaaS standard |
| Monorepo | pnpm + Turborepo | Proven with Next.js 15 + Fastify |
| Validation | Zod | Shared schemas between frontend/backend |
