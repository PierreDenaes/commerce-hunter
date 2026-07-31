# API Contracts: CommerceHunter Platform

**Branch**: `001-commerce-hunter-platform` | **Date**: 2026-02-25

All endpoints are served by the Fastify API (`apps/api`). Base path: `/api/v1`.

Authentication: JWT bearer token in httpOnly cookie. All endpoints except auth require authentication.

## Auth

### POST /api/v1/auth/register

Create a new account (creates organization + admin user).

**Request**:
```json
{
  "organizationName": "Mon Agence Web",
  "name": "Jean Dupont",
  "email": "jean@agence.fr",
  "password": "securePassword123"
}
```

**Response 201**:
```json
{
  "user": {
    "id": "uuid",
    "email": "jean@agence.fr",
    "name": "Jean Dupont",
    "role": "ADMIN",
    "organizationId": "uuid"
  }
}
```
Sets httpOnly cookies: `access_token`, `refresh_token`.

**Errors**: 409 email already exists, 422 validation error.

### POST /api/v1/auth/login

**Request**:
```json
{
  "email": "jean@agence.fr",
  "password": "securePassword123"
}
```

**Response 200**: Same as register response. Sets httpOnly cookies.

**Errors**: 401 invalid credentials.

### POST /api/v1/auth/logout

**Response 204**: Clears httpOnly cookies.

### POST /api/v1/auth/refresh

Refresh access token using refresh token cookie.

**Response 200**: Sets new httpOnly cookies.

**Errors**: 401 invalid/expired refresh token.

## Scans

### POST /api/v1/scans

Create and launch a new scan.

**Request**:
```json
{
  "name": "La Ciotat Commerce Q1",
  "postalCode": "13600",
  "radiusKm": null,
  "entityType": "BOTH",
  "minEmployees": null,
  "apeCategories": ["47", "56", "45"]
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "name": "La Ciotat Commerce Q1",
  "postalCode": "13600",
  "radiusKm": null,
  "entityType": "BOTH",
  "minEmployees": null,
  "apeCategories": ["47", "56", "45"],
  "status": "PENDING",
  "totalBusinesses": 0,
  "createdAt": "2026-02-25T10:00:00Z"
}
```

**Errors**: 403 city limit exceeded (Starter plan), 403 quota exceeded, 422 validation error.

### GET /api/v1/scans

List scans for the current organization.

**Query params**: `page` (default 1), `limit` (default 20), `status` (optional filter).

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "La Ciotat Commerce Q1",
      "postalCode": "13600",
      "entityType": "BOTH",
      "status": "COMPLETED",
      "totalBusinesses": 342,
      "createdAt": "2026-02-25T10:00:00Z",
      "completedAt": "2026-02-25T10:03:45Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

### GET /api/v1/scans/:id

Get scan details with summary statistics.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "La Ciotat Commerce Q1",
  "postalCode": "13600",
  "radiusKm": null,
  "entityType": "BOTH",
  "minEmployees": null,
  "apeCategories": ["47", "56", "45"],
  "status": "COMPLETED",
  "totalBusinesses": 342,
  "stats": {
    "commerceCount": 215,
    "pmeCount": 127,
    "withWebsite": 189,
    "withoutWebsite": 153,
    "averageDigitalScore": 47.3,
    "highPriorityCount": 98
  },
  "createdAt": "2026-02-25T10:00:00Z",
  "completedAt": "2026-02-25T10:03:45Z"
}
```

## Businesses

### GET /api/v1/businesses

List businesses with filtering, sorting, and pagination.

**Query params**:
- `scanId` (required) — Filter by scan
- `page` (default 1), `limit` (default 20)
- `entityType` — COMMERCE, PME
- `priority` — HIGH, MEDIUM, LOW
- `hasWebsite` — true, false
- `city` — city name filter
- `apeCode` — APE code prefix filter
- `minScore`, `maxScore` — digital score range
- `search` — free text search (name, address)
- `sortBy` — digital_score, seo_score, name, city (default: digital_score)
- `sortOrder` — asc, desc (default: desc)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Boulangerie Martin",
      "siret": "12345678901234",
      "siren": "123456789",
      "entityType": "COMMERCE",
      "apeCode": "47.24Z",
      "legalForm": "SARL",
      "employeesRange": "3-5",
      "address": "12 Rue de la République",
      "city": "La Ciotat",
      "postalCode": "13600",
      "phone": "+33 4 42 XX XX XX",
      "website": "https://boulangerie-martin.fr",
      "seoScore": 35,
      "digitalScore": 72,
      "priority": "MEDIUM"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 342
  }
}
```

### GET /api/v1/businesses/:id

Get full business details with analysis.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Boulangerie Martin",
  "siret": "12345678901234",
  "siren": "123456789",
  "entityType": "COMMERCE",
  "apeCode": "47.24Z",
  "legalForm": "SARL",
  "legalFormCode": "5710",
  "employeesRange": "3-5",
  "address": "12 Rue de la République",
  "city": "La Ciotat",
  "postalCode": "13600",
  "phone": "+33 4 42 XX XX XX",
  "website": "https://boulangerie-martin.fr",
  "isHeadquarters": true,
  "analysis": {
    "status": "COMPLETED",
    "analyzedUrl": "https://boulangerie-martin.fr",
    "technical": {
      "isHttps": true,
      "httpStatusCode": 200,
      "responseTimeMs": 1250,
      "hasRobotsTxt": false,
      "hasSitemapXml": false
    },
    "seoOnPage": {
      "title": "Boulangerie Martin",
      "titleLength": 19,
      "metaDescription": null,
      "metaDescriptionLength": 0,
      "h1": "Bienvenue",
      "hasCanonical": false,
      "hasFavicon": true
    },
    "mobile": {
      "hasViewport": true,
      "mobileScore": 45
    },
    "localSeo": {
      "cityInTitle": false,
      "cityInH1": false,
      "cityInDescription": false,
      "hasSchemaLocalBusiness": false,
      "hasGoogleMapsEmbed": false
    },
    "scores": {
      "seoScore": 35,
      "digitalScore": 72,
      "priority": "MEDIUM"
    },
    "analyzedAt": "2026-02-25T10:04:12Z"
  }
}
```

### POST /api/v1/businesses/:id/reanalyze

Trigger a re-analysis of a business website.

**Response 202**:
```json
{
  "message": "Analysis queued",
  "businessId": "uuid",
  "status": "PENDING"
}
```

## Dashboard

### GET /api/v1/dashboard/stats

Get aggregated statistics for the current organization.

**Query params**: `scanId` (optional — filter to specific scan).

**Response 200**:
```json
{
  "totalEntities": 342,
  "commerceCount": 215,
  "pmeCount": 127,
  "withoutWebsite": 153,
  "withoutWebsitePercent": 44.7,
  "averageDigitalScore": 47.3,
  "highPriorityCount": 98,
  "mediumPriorityCount": 124,
  "lowPriorityCount": 120,
  "topSectors": [
    { "apeCode": "47", "label": "Commerce de détail", "count": 89 },
    { "apeCode": "56", "label": "Restauration", "count": 76 }
  ]
}
```

## Export

### GET /api/v1/export/csv

Export filtered businesses as CSV.

**Query params**: Same filters as GET /api/v1/businesses.

**Response 200**: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="commercehunter-export-2026-02-25.csv"`.

### GET /api/v1/export/pdf/:businessId

Generate PDF audit report for a single business.

**Response 200**: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="audit-boulangerie-martin.pdf"`.

**Errors**: 403 PDF export not available on Starter plan.

## Organization & Users

### GET /api/v1/organization

Get current organization details with subscription info.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Mon Agence Web",
  "plan": {
    "name": "Pro",
    "priceCents": 9900,
    "cityLimit": 0,
    "monthlyAnalysisLimit": 2000,
    "hasPdfExport": true,
    "hasWhiteLabel": false,
    "hasApiAccess": false
  },
  "usage": {
    "monthlyAnalysesUsed": 342,
    "monthlyAnalysisLimit": 2000,
    "billingPeriodStart": "2026-02-01T00:00:00Z"
  },
  "members": [
    { "id": "uuid", "name": "Jean Dupont", "email": "jean@agence.fr", "role": "ADMIN" }
  ]
}
```

### POST /api/v1/organization/invite

Invite a team member.

**Request**:
```json
{
  "email": "marie@agence.fr"
}
```

**Response 201**:
```json
{
  "message": "Invitation sent",
  "email": "marie@agence.fr",
  "expiresAt": "2026-03-04T10:00:00Z"
}
```

**Errors**: 403 not ADMIN, 409 user already in organization.

### POST /api/v1/organization/invite/:token/accept

Accept an invitation and create user account.

**Request**:
```json
{
  "name": "Marie Martin",
  "password": "securePassword456"
}
```

**Response 201**: Same as register response.

## Billing

### POST /api/v1/billing/checkout

Create a Stripe checkout session for plan upgrade/change.

**Request**:
```json
{
  "planId": "uuid"
}
```

**Response 200**:
```json
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### POST /api/v1/billing/webhook

Stripe webhook endpoint (no auth — verified by Stripe signature).

Handles events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

### GET /api/v1/billing/portal

Get Stripe billing portal URL for managing subscription.

**Response 200**:
```json
{
  "portalUrl": "https://billing.stripe.com/..."
}
```
