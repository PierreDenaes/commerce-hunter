# Feature Specification: CommerceHunter Platform

**Feature Branch**: `001-commerce-hunter-platform`
**Created**: 2026-02-25
**Status**: Draft
**Input**: Plateforme d'identification et d'analyse automatisée des commerces et PME locales afin de détecter les opportunités de création, refonte ou optimisation de site web.

## Vision

CommerceHunter is an automated identification and analysis platform for local businesses (commerces) and SMEs (PME). It detects opportunities for website creation, redesign, or optimization by scanning public business registries, analyzing existing web presence, and scoring digital maturity.

Initial target: postal code 13600 (La Ciotat / Ceyreste). Architecture must be scalable nationwide from v1.

## Problem Statement

Freelancers, web agencies, and SEO consultants waste significant time on manual prospecting:

- Identifying businesses without a website
- Evaluating the digital quality of existing SME websites
- Prioritizing high-potential prospects
- Structuring outreach and follow-up

CommerceHunter automates collection, analysis, and prioritization of business prospects.

## Target Users

- **Freelance web developer**: Needs a steady pipeline of local businesses requiring web services
- **Web agency**: Needs to scale prospecting across multiple cities with team collaboration
- **SEO consultant**: Needs to identify businesses with poor digital presence and quantify improvement potential
- **B2B sales representative**: Needs qualified leads with digital maturity data to pitch services
- **Platform administrator**: Needs to manage users, monitor system health, and configure subscription plans

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan Local Businesses (Priority: P1)

As a freelance web developer, I want to scan all businesses in a given postal code area so that I can discover which local businesses exist and whether they have a web presence.

**Why this priority**: This is the core value proposition. Without scanning, there is no data to analyze or prioritize. This story delivers immediate value by revealing the local business landscape.

**Independent Test**: Can be fully tested by entering a postal code and receiving a list of businesses with basic information (name, address, activity code, website if any). Delivers a complete inventory of local businesses.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the Starter plan, **When** they create a new scan with postal code "13600" and entity type "BOTH", **Then** the system retrieves businesses from public registries and displays a list with name, address, APE code, entity type (Commerce/PME), and website URL (if found).
2. **Given** a user configuring a scan, **When** they select entity type "COMMERCE" and specify APE categories (e.g., 47xxx, 56xxx), **Then** only businesses matching those activity codes appear in results.
3. **Given** a user configuring a scan, **When** they select entity type "PME" with minimum employees of 10, **Then** only SMEs meeting the employee threshold appear in results.
4. **Given** a user on the Starter plan (limited to 1 city), **When** they attempt to scan a second postal code, **Then** the system informs them of their plan limit and suggests upgrading.

---

### User Story 2 - Analyze Website SEO & Technical Quality (Priority: P1)

As a freelance web developer, I want each discovered business website to be automatically analyzed for technical and SEO quality so that I can identify which businesses have poor web presence and need my services.

**Why this priority**: Analysis transforms raw business data into actionable intelligence. Without scoring, the user cannot prioritize prospects. This is equally critical as scanning because scanning without analysis provides little value.

**Independent Test**: Can be tested by providing a known business URL and verifying that the system returns a complete technical and SEO audit (HTTPS status, response time, title tag, meta description, mobile readiness, local SEO signals). Delivers a quantified assessment of web quality.

**Acceptance Scenarios**:

1. **Given** a completed scan with businesses that have websites, **When** the analysis runs, **Then** each website receives a technical audit (HTTPS, status code, response time, robots.txt, sitemap.xml presence).
2. **Given** a business website under analysis, **When** SEO on-page checks run, **Then** the system extracts and evaluates title (with length), meta description, H1, canonical tag, and favicon.
3. **Given** a business website under analysis, **When** mobile readiness checks run, **Then** the system checks meta viewport and evaluates mobile performance.
4. **Given** a business website for a local business, **When** local SEO checks run, **Then** the system checks for city name in title/H1/description, Schema LocalBusiness markup, and Google Maps embed.
5. **Given** a business with no website, **When** scoring is calculated, **Then** the business receives the lowest possible SEO score and a high opportunity priority.

---

### User Story 3 - View Dashboard & Prioritize Prospects (Priority: P2)

As a web agency, I want a dashboard that shows aggregated statistics and lets me filter businesses by type, score, location, and sector so that I can quickly identify the best opportunities.

**Why this priority**: The dashboard turns analyzed data into a usable prospecting workflow. It depends on scanning and analysis being in place, but is essential for the user to act on the data efficiently.

**Independent Test**: Can be tested by viewing the dashboard after a scan completes and verifying that statistics are displayed (total entities, Commerce/PME split, % without website, average score, HIGH priority count) and that filters produce correct subsets.

**Acceptance Scenarios**:

1. **Given** a completed scan with analyzed businesses, **When** the user opens the dashboard, **Then** they see: total entities count, Commerce vs PME breakdown, percentage without a website, average digital score, and count of HIGH priority opportunities.
2. **Given** the dashboard is loaded, **When** the user filters by entity type "COMMERCE" and priority "HIGH", **Then** only high-priority commerce businesses are displayed.
3. **Given** the dashboard is loaded, **When** the user clicks on a business, **Then** they see a detailed business card with legal data, full SEO analysis breakdown, and estimated commercial potential.

---

### User Story 4 - Export Prospect Data (Priority: P2)

As a B2B sales representative, I want to export business data as CSV and individual business audits as PDF so that I can share prospect lists with my team and present audit reports to potential clients.

**Why this priority**: Export enables the user to act on data outside the platform. It converts analysis into sales material. This is a key differentiator for paid plans.

**Independent Test**: Can be tested by selecting businesses from the dashboard and exporting to CSV (verifying all columns are present) or generating a PDF audit report for a single business (verifying it contains the full analysis).

**Acceptance Scenarios**:

1. **Given** a filtered list of businesses on the dashboard, **When** the user clicks "Export CSV", **Then** a CSV file downloads containing all visible businesses with columns: name, entity type, APE, address, city, postal code, phone, website, SEO score, digital score, priority.
2. **Given** a business detail view, **When** the user clicks "Export PDF Audit", **Then** a PDF generates containing the business legal data, full SEO audit details, scoring breakdown, and commercial potential assessment.
3. **Given** a user on the Starter plan, **When** they attempt to export a PDF audit, **Then** the system informs them that PDF export requires the Pro plan or higher.

---

### User Story 5 - Manage Subscription & Quotas (Priority: P3)

As a platform administrator, I want users to be subscribed to tiered plans with usage quotas so that the platform can sustain itself financially and users get features appropriate to their investment.

**Why this priority**: Monetization is necessary for sustainability but is not required for the core scanning/analysis value to work. Can be implemented after core features are stable.

**Independent Test**: Can be tested by creating users on different plans and verifying that quota limits are enforced (scan limits, city limits, feature access) and that usage counters track correctly.

**Acceptance Scenarios**:

1. **Given** a user on the Starter plan (500 analyses/month, 1 city), **When** they have used 500 analyses, **Then** further analysis requests are blocked with a clear message and upgrade suggestion.
2. **Given** a user on the Pro plan (2000 analyses/month, multi-city), **When** they create scans for multiple postal codes, **Then** all scans execute successfully within their quota.
3. **Given** a user on the Agency plan, **When** they access the platform, **Then** they have unlimited analyses, white-label options, and programmatic access.

---

### User Story 6 - Multi-User Access (Priority: P3)

As a web agency owner, I want multiple team members to access the platform under my organization's account so that my team can collaborate on prospecting.

**Why this priority**: Multi-user is important for agency adoption but is not required for individual freelancers. It builds on top of the subscription system.

**Independent Test**: Can be tested by creating an organization with multiple user accounts and verifying that each user can access shared scan results and that usage is tracked at the organization level.

**Acceptance Scenarios**:

1. **Given** an agency account owner, **When** they invite a team member by email, **Then** the team member receives an invitation and can access the organization's scans and data.
2. **Given** multiple users in the same organization, **When** one user creates a scan, **Then** all other organization members can view the scan results.
3. **Given** an organization with multiple users, **When** usage quota is checked, **Then** quota is tracked at the organization level, not per individual user.

---

### Edge Cases

- What happens when a business has multiple locations (same SIREN, different SIRET)? Each establishment is treated as a separate entry linked by SIREN.
- What happens when a website is temporarily down during analysis? The system records the status code and response error, marks analysis as incomplete, and allows re-analysis later.
- What happens when the public registry returns no results for a postal code? The system displays a clear "No businesses found" message with suggestions (check postal code, expand radius).
- What happens when a business website redirects to a different domain? The system follows redirects (up to 5 hops) and analyzes the final destination URL.
- What happens when a user's subscription expires? Access becomes read-only for existing data; new scans and analyses are blocked until renewal.
- What happens when the external data source (SIRENE) is temporarily unavailable? The system queues the scan request and retries automatically, notifying the user of the delay.
- What happens when two users scan the same postal code? Results are cached and shared to avoid redundant external queries, with each user getting their own view of the data.

## Requirements *(mandatory)*

### Functional Requirements

**Scanning**

- **FR-001**: System MUST allow users to create a named scan by specifying a postal code, optional radius, entity type (COMMERCE, PME, or BOTH), optional minimum employee count, and optional APE category filters.
- **FR-002**: System MUST retrieve business data from France's public business registry (SIRENE) based on scan parameters.
- **FR-003**: System MUST classify each business as COMMERCE or PME based on APE code mappings (retail 47xxx, food service 56xxx, automotive 45xxx for Commerce; construction 41-43xxx, business services 62xxx/70xxx for PME).
- **FR-004**: System MUST extract and store for each business: name, SIREN, SIRET, APE code, address, city, postal code, phone, website URL (if available), legal form, and employee range (if available).

**Analysis**

- **FR-005**: System MUST perform technical analysis on every discovered website: HTTPS verification, HTTP status code, response time, robots.txt presence, sitemap.xml presence.
- **FR-006**: System MUST perform SEO on-page analysis: title tag (with character length), meta description, H1 tag, canonical URL, favicon.
- **FR-007**: System MUST perform mobile readiness analysis: meta viewport presence and mobile performance assessment.
- **FR-008**: System MUST perform local SEO analysis: city name presence in title/H1/description, Schema LocalBusiness markup detection, Google Maps embed detection.

**Scoring**

- **FR-009**: System MUST calculate an SEO Score out of 100 based on the technical, on-page, mobile, and local SEO analysis results.
- **FR-010**: System MUST calculate a Digital Score using weighted components: SEO (40%), website presence (25%), mobile performance (15%), data completeness (10%), business size potential (10%).
- **FR-011**: System MUST assign a priority level: HIGH (score >= 80), MEDIUM (score 60-79), LOW (score < 60).

**Dashboard**

- **FR-012**: System MUST display a global view showing: total entities, Commerce/PME breakdown, percentage without a website, average digital score, and HIGH priority opportunity count.
- **FR-013**: System MUST provide filters for: entity type, score range, city, business size, and business sector.
- **FR-014**: System MUST display a detailed business card view showing: legal data, full SEO analysis, scoring breakdown, and estimated commercial potential.

**Export**

- **FR-015**: System MUST support CSV export of filtered business lists with all key data fields.
- **FR-016**: System MUST support PDF export of individual business audit reports containing legal data, SEO analysis, scoring, and commercial potential.

**Users & Subscriptions**

- **FR-017**: System MUST support user registration and authentication.
- **FR-018**: System MUST enforce subscription plan limits: Starter (1 city, 500 analyses/month, basic SEO), Pro (multi-city, 2000 analyses/month, PDF export), Agency (unlimited, white-label, programmatic access).
- **FR-019**: System MUST track usage per organization and enforce quota limits.
- **FR-020**: System MUST support multi-user organizations where team members share scan data and quotas.

**Deployment**

- **FR-021**: System MUST be deployable via containerized packaging.

### Key Entities

- **Business**: Represents a single business establishment. Key attributes: name, SIREN/SIRET identifiers, APE activity code, entity type (Commerce/PME), address, contact information, website URL, legal form, employee range. Relationships: belongs to a Scan, has one Analysis.
- **Scan**: Represents a prospecting scan request. Key attributes: name, postal code, radius, entity type filter, APE category filters, minimum employee threshold, status, creation date. Relationships: created by a User, contains multiple Businesses.
- **Analysis**: Represents the technical and SEO audit of a business website. Key attributes: technical checks (HTTPS, status code, response time, robots.txt, sitemap), SEO on-page checks (title, meta description, H1, canonical, favicon), mobile checks (viewport, performance score), local SEO checks (city in content, Schema markup, Maps embed), SEO score, digital score, priority level. Relationships: belongs to a Business.
- **User**: Represents a platform user. Key attributes: name, email, role, organization membership. Relationships: belongs to an Organization, creates Scans.
- **Organization**: Represents a subscribing entity (individual or team). Key attributes: name, subscription plan, usage counters, billing information. Relationships: has many Users, has a Subscription Plan.
- **Subscription Plan**: Represents a tier of service. Key attributes: name (Starter/Pro/Agency), price, city limit, monthly analysis quota, feature flags (PDF export, white-label, API access). Relationships: assigned to an Organization.

## Assumptions

- APE code mappings for Commerce vs PME classification follow the standard NAF Rev.2 nomenclature. The initial set covers: retail (47xxx), food service (56xxx), automotive (45xxx) for Commerce; construction (41-43xxx), IT services (62xxx), management consulting (70xxx) for PME. This mapping is configurable.
- Employee range data from SIRENE may not always be available; when missing, the system assumes the business is a micro-enterprise (< 10 employees) and adjusts the "business size potential" scoring component accordingly.
- The platform uses JWT tokens stored in httpOnly cookies with email/password authentication for v1.
- Lighthouse mobile scoring will use a headless approach; for v1, a simplified mobile check (viewport tag + basic page weight analysis) is acceptable if full Lighthouse integration adds excessive complexity.
- Turnover data is rarely available in public registries; the system stores it when found but does not depend on it for scoring.
- "Radius" filtering uses postal code adjacency rather than true geographic distance, since SIRENE data is postal-code-based.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from entering a postal code to viewing a prioritized list of business opportunities in under 5 minutes (for a city with up to 500 businesses).
- **SC-002**: 95% of discovered business websites receive a complete analysis (all technical, SEO, mobile, and local checks) without manual intervention.
- **SC-003**: The digital scoring accurately differentiates businesses: at least 70% of businesses manually evaluated as "high opportunity" by a prospecting professional are scored HIGH by the system.
- **SC-004**: Users can filter and find relevant prospects (by type, score, sector, location) in under 30 seconds from the dashboard.
- **SC-005**: CSV exports contain 100% of the data fields visible in the dashboard with no data loss or formatting errors.
- **SC-006**: PDF audit reports are professional enough to be presented directly to a prospect as a sales tool (containing business identity, full analysis breakdown, and visual scoring).
- **SC-007**: The platform supports at least 50 concurrent users performing scans and viewing dashboards without noticeable performance degradation.
- **SC-008**: Subscription quota enforcement is 100% accurate: no user can exceed their plan's analysis limit or city restriction.
