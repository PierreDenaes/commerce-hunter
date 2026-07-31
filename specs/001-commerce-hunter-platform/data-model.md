# Data Model: CommerceHunter Platform

**Branch**: `001-commerce-hunter-platform` | **Date**: 2026-02-25

## Entity Relationship Diagram (textual)

```
Organization 1──N User
Organization 1──1 SubscriptionPlan
Organization 1──N Scan
Scan 1──N ScanBusiness (join)
ScanBusiness N──1 Business
Business 1──0..1 Analysis
User 1──N Scan (creator)
```

## Entities

### Organization

Represents a subscribing entity (individual freelancer or agency team).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(200) | NOT NULL | Organization display name |
| plan_id | UUID | FK → SubscriptionPlan | Current subscription plan |
| monthly_analyses_used | integer | NOT NULL, DEFAULT 0 | Analyses consumed this billing period |
| billing_period_start | datetime | NOT NULL | Start of current billing period |
| stripe_customer_id | string(100) | UNIQUE, NULLABLE | Stripe customer reference |
| stripe_subscription_id | string(100) | UNIQUE, NULLABLE | Stripe subscription reference |
| created_at | datetime | NOT NULL | Creation timestamp |
| updated_at | datetime | NOT NULL | Last update timestamp |

### User

Represents an individual platform user.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organization_id | UUID | FK → Organization, NOT NULL | Parent organization |
| email | string(255) | UNIQUE, NOT NULL | Login email |
| password_hash | string(255) | NOT NULL | bcrypt hashed password |
| name | string(200) | NOT NULL | Display name |
| role | enum(ADMIN, USER) | NOT NULL, DEFAULT USER | Role within organization |
| last_login_at | datetime | NULLABLE | Last successful login |
| created_at | datetime | NOT NULL | Creation timestamp |
| updated_at | datetime | NOT NULL | Last update timestamp |

**Validation rules**:
- Email must be valid format and unique across all organizations
- Password must be minimum 8 characters before hashing
- First user in an organization is automatically ADMIN

### SubscriptionPlan

Represents a tier of service.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(50) | UNIQUE, NOT NULL | Plan name (Starter, Pro, Agency) |
| price_cents | integer | NOT NULL | Monthly price in euro cents |
| city_limit | integer | NOT NULL | Max cities (0 = unlimited) |
| monthly_analysis_limit | integer | NOT NULL | Max analyses/month (0 = unlimited) |
| has_pdf_export | boolean | NOT NULL, DEFAULT false | PDF audit export enabled |
| has_white_label | boolean | NOT NULL, DEFAULT false | White-label branding |
| has_api_access | boolean | NOT NULL, DEFAULT false | Programmatic API access |
| created_at | datetime | NOT NULL | Creation timestamp |

**Seed data**:

| Name | Price | City Limit | Analysis Limit | PDF | White-label | API |
|------|-------|-----------|---------------|-----|------------|-----|
| Starter | 4900 | 1 | 500 | false | false | false |
| Pro | 9900 | 0 | 2000 | true | false | false |
| Agency | 19900 | 0 | 0 | true | true | true |

### Scan

Represents a prospecting scan request.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organization_id | UUID | FK → Organization, NOT NULL | Owning organization |
| created_by_id | UUID | FK → User, NOT NULL | User who initiated the scan |
| name | string(200) | NOT NULL | User-given scan name |
| postal_code | string(10) | NOT NULL | Target postal code |
| radius_km | integer | NULLABLE | Radius in km (null = exact postal code) |
| entity_type | enum(COMMERCE, PME, BOTH) | NOT NULL | Target entity type filter |
| min_employees | integer | NULLABLE | Minimum employee threshold |
| ape_categories | string[] | NULLABLE | List of APE code prefixes to filter |
| status | enum(PENDING, RUNNING, COMPLETED, FAILED) | NOT NULL, DEFAULT PENDING | Scan execution status |
| total_businesses | integer | NOT NULL, DEFAULT 0 | Count of businesses found |
| error_message | string | NULLABLE | Error details if FAILED |
| started_at | datetime | NULLABLE | When scan execution began |
| completed_at | datetime | NULLABLE | When scan execution finished |
| created_at | datetime | NOT NULL | Creation timestamp |

**State transitions**:
```
PENDING → RUNNING → COMPLETED
PENDING → RUNNING → FAILED
```

**Validation rules**:
- postal_code must be a valid French postal code (5 digits)
- radius_km, if provided, must be between 1 and 50
- ape_categories entries must match format: 2-5 digit prefix (e.g., "47", "56.10")

### Business

Represents a single business establishment discovered by a scan.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| siret | string(14) | UNIQUE, NOT NULL | 14-digit SIRET number |
| siren | string(9) | NOT NULL, INDEXED | 9-digit SIREN number |
| name | string(300) | NOT NULL | Business name (denominationUniteLegale) |
| entity_type | enum(COMMERCE, PME) | NOT NULL | Classification based on APE |
| ape_code | string(10) | NOT NULL | APE/NAF activity code |
| legal_form | string(100) | NULLABLE | Legal form description |
| legal_form_code | string(10) | NULLABLE | Legal form code (categorieJuridique) |
| employees_range | string(20) | NULLABLE | Employee bracket (e.g., "10-19", "20-49") |
| employees_range_code | string(5) | NULLABLE | INSEE tranche code |
| address | string(500) | NULLABLE | Full street address |
| city | string(200) | NOT NULL | City name |
| postal_code | string(10) | NOT NULL, INDEXED | Postal code |
| phone | string(30) | NULLABLE | Phone number (from Google Places) |
| website | string(500) | NULLABLE, INDEXED | Website URL |
| latitude | decimal(10,7) | NULLABLE | GPS latitude |
| longitude | decimal(10,7) | NULLABLE | GPS longitude |
| google_place_id | string(300) | NULLABLE | Google Places reference |
| is_headquarters | boolean | NOT NULL, DEFAULT false | Is this the siège social |
| sirene_last_updated | datetime | NULLABLE | Last SIRENE data refresh |
| created_at | datetime | NOT NULL | Creation timestamp |
| updated_at | datetime | NOT NULL | Last update timestamp |

**Indexes**:
- UNIQUE on `siret`
- INDEX on `siren` (group establishments by legal entity)
- INDEX on `postal_code`
- INDEX on `entity_type`
- INDEX on `ape_code`
- INDEX on `website` (for dedup and analysis lookup)

**Validation rules**:
- SIRET must be exactly 14 digits
- SIREN must be exactly 9 digits
- SIREN must equal first 9 digits of SIRET
- postal_code must be 5 digits

### ScanBusiness (Join Table)

Links Scans to discovered Businesses (many-to-many, since the same business can appear in multiple scans).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| scan_id | UUID | FK → Scan, NOT NULL | Parent scan |
| business_id | UUID | FK → Business, NOT NULL | Discovered business |
| created_at | datetime | NOT NULL | When business was associated to scan |

**Constraints**:
- UNIQUE on (scan_id, business_id) — a business appears once per scan

### Analysis

Represents the technical and SEO audit of a business website.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| business_id | UUID | FK → Business, UNIQUE, NOT NULL | Audited business |
| status | enum(PENDING, RUNNING, COMPLETED, FAILED, NO_WEBSITE) | NOT NULL | Analysis status |
| analyzed_url | string(500) | NULLABLE | Final URL after redirects |
| **Technical checks** | | | |
| is_https | boolean | NULLABLE | Uses HTTPS |
| http_status_code | integer | NULLABLE | HTTP response status |
| response_time_ms | integer | NULLABLE | Response time in milliseconds |
| has_robots_txt | boolean | NULLABLE | robots.txt present |
| has_sitemap_xml | boolean | NULLABLE | sitemap.xml present |
| **SEO on-page checks** | | | |
| title | string(500) | NULLABLE | Page title text |
| title_length | integer | NULLABLE | Title character count |
| meta_description | string(1000) | NULLABLE | Meta description text |
| meta_description_length | integer | NULLABLE | Meta description character count |
| h1 | string(500) | NULLABLE | First H1 text |
| has_canonical | boolean | NULLABLE | Canonical link present |
| has_favicon | boolean | NULLABLE | Favicon present |
| **Mobile checks** | | | |
| has_viewport | boolean | NULLABLE | Meta viewport present |
| mobile_score | integer | NULLABLE | Lighthouse mobile score (0-100) |
| **Local SEO checks** | | | |
| city_in_title | boolean | NULLABLE | City name in title |
| city_in_h1 | boolean | NULLABLE | City name in H1 |
| city_in_description | boolean | NULLABLE | City name in meta description |
| has_schema_local_business | boolean | NULLABLE | Schema.org LocalBusiness detected |
| has_google_maps_embed | boolean | NULLABLE | Google Maps iframe detected |
| **Scores** | | | |
| seo_score | integer | NULLABLE | SEO score (0-100) |
| digital_score | integer | NULLABLE | Weighted digital score (0-100) |
| priority | enum(HIGH, MEDIUM, LOW) | NULLABLE | Priority classification |
| **Metadata** | | | |
| raw_analysis_json | jsonb | NULLABLE | Full raw analysis data |
| error_message | string | NULLABLE | Error details if FAILED |
| analyzed_at | datetime | NULLABLE | When analysis completed |
| created_at | datetime | NOT NULL | Creation timestamp |
| updated_at | datetime | NOT NULL | Last update timestamp |

**State transitions**:
```
PENDING → RUNNING → COMPLETED
PENDING → RUNNING → FAILED
(created as) NO_WEBSITE (when business has no website URL)
```

**Scoring rules** (from spec FR-009, FR-010, FR-011):

SEO Score /100 = sum of individual check scores (technical + on-page + mobile + local)

Digital Score = (seo_score × 0.40) + (has_website × 25) + (mobile_performance × 0.15) + (data_completeness × 0.10) + (business_size_potential × 0.10)

Priority:
- digital_score >= 80 → HIGH
- digital_score >= 60 → MEDIUM
- digital_score < 60 → LOW

### Invitation

Represents a pending team member invitation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organization_id | UUID | FK → Organization, NOT NULL | Inviting organization |
| invited_by_id | UUID | FK → User, NOT NULL | User who sent invitation |
| email | string(255) | NOT NULL | Invitee email |
| token | string(255) | UNIQUE, NOT NULL | Invitation token |
| status | enum(PENDING, ACCEPTED, EXPIRED) | NOT NULL, DEFAULT PENDING | Invitation status |
| expires_at | datetime | NOT NULL | Expiration timestamp |
| created_at | datetime | NOT NULL | Creation timestamp |

**Validation rules**:
- Cannot invite an email already registered in the same organization
- Token expires after 7 days
- ADMIN role required to send invitations
