<div align="center">

<img src="apps/web/public/logo.png" alt="CommerceHunter Logo" width="120" />

# CommerceHunter

**Plateforme d'identification et d'analyse de la maturite numerique des commerces et PME en France**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue)](LICENSE)
[![CI](https://github.com/PierreDenaes/commerce-hunter/actions/workflows/ci.yml/badge.svg)](https://github.com/PierreDenaes/commerce-hunter/actions/workflows/ci.yml)

<br />

<img src="apps/web/public/screenshots/fiche-entreprise.png" alt="Fiche entreprise CommerceHunter : score digital, radar SEO et recommandations IA" width="800" />

<br />

[Demo en ligne](https://commercehunter.dnada.cloud) · [Installation](#-installation) · [Stack technique](#-stack-technique) · [Fonctionnalites](#-fonctionnalites)

</div>

---

## Presentation

CommerceHunter detecte automatiquement les **opportunites de creation, refonte ou optimisation de sites web** pour les commerces et PME francais. La plateforme interroge le registre SIRENE (INSEE), enrichit les donnees via Google Places, analyse la presence web existante et attribue un **score de maturite numerique** pour prioriser les prospects.

### Cas d'usage

- **Agences web** : identifier les commerces sans site ou avec un site obsolete dans une zone geographique
- **Freelances** : constituer un portefeuille de prospects qualifies avec audit SEO pre-rempli
- **Consultants digitaux** : fournir des rapports PDF d'audit a leurs clients

---

## La plateforme en images

> Donnees de demonstration — entreprises fictives.

**Un scan, une liste de prospects qualifies** — scores SEO et digital, priorites, filtres, colonnes personnalisables :

<img src="apps/web/public/screenshots/entreprises.png" alt="Tableau des entreprises analysees avec scores et priorites" width="800" />

**Recommandations IA** — synthese commerciale, actions priorisees par impact et brouillon d'email de prospection generes a la demande :

<img src="apps/web/public/screenshots/recommandations-ia.png" alt="Recommandations IA : actions priorisees et brouillon d'email" width="800" />

**Rapport PDF d'audit** — le livrable a remettre au prospect :

<img src="apps/web/public/screenshots/rapport-pdf.png" alt="Rapport PDF d'audit digital" width="500" />

**Dashboard** — vue d'ensemble par scan : secteurs, scores moyens, priorites :

<img src="apps/web/public/screenshots/dashboard.png" alt="Dashboard CommerceHunter" width="800" />

---

## Comment ça marche

```mermaid
flowchart LR
    A["📮 Code postal<br/>+ filtres APE"] --> B["🏛️ SIRENE<br/>(INSEE)"]
    B --> C["📍 Google Places<br/>tél · site · GPS"]
    C --> D{"Site web ?"}
    D -- "Non" --> E["🔥 Priorité HIGH<br/>classement immédiat"]
    D -- "Oui" --> F["🔍 Audit SEO<br/>60+ vérifications"]
    F --> G["⚡ PageSpeed<br/>LCP · CLS · TTFB"]
    G --> H["🧮 Scores 0-100<br/>SEO + digital"]
    H --> I["🏷️ Priorité<br/>HIGH / MEDIUM / LOW"]
    E --> J["📊 Dashboard<br/>CSV · PDF · IA"]
    I --> J
```

Les analyses tournent en **jobs asynchrones par lots de 50** (pg-boss) : un scan de 800 entreprises survit aux redéploiements et reprend là où il s'était arrêté. Les priorités reflètent l'**opportunité commerciale** : pas de site ou présence faible → `HIGH`, site déjà excellent → `LOW`.

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router), TailwindCSS v4, shadcn/ui, Radix UI, motion, Recharts, Lucide Icons |
| **Backend** | Fastify 5, Zod, JWT (access + refresh tokens), cheerio, Stripe SDK |
| **Base de donnees** | PostgreSQL 16, Prisma 6 (ORM + migrations) |
| **PDF** | @react-pdf/renderer |
| **APIs externes** | INSEE SIRENE 3.11, Google Places, Google PageSpeed Insights |
| **Monorepo** | Turborepo, pnpm workspaces |
| **Deploiement** | Docker, Caddy (reverse proxy HTTPS) |

---

## Fonctionnalites

### Scan de commerces (US1)
- Recherche par **code postal + rayon** geographique
- Filtrage par type d'entite (Commerce / PME / Les deux)
- Filtrage par **codes APE** (activite principale) et tranche d'effectifs
- Integration SIRENE (INSEE) avec pagination cursor
- Enrichissement Google Places (coordonnees, telephone, site web) avec cache 30 jours
- Traitement asynchrone via une file de jobs durable (pg-boss) : analyses **par lots de 50**, reprise automatique apres redemarrage

### Analyse de presence web (US2)
- Detection automatique de site web
- **Audit SEO technique** : HTTPS, robots.txt, sitemap, balises meta, canonical, favicon
- **SEO on-page** : title, meta description (avec longueurs optimales), hierarchie H1-H6, images alt
- **SEO local** : ville dans title/H1, Schema.org, Google Maps
- **Qualite du contenu** : mots visibles, dependance JavaScript, liens internes casses, JSON-LD invalide
- **Plateforme** : CMS detecte (WordPress, Wix, Shopify…), hebergement gratuit / page plateforme
- **Performance** : LCP, CLS, TTFB, FCP via PageSpeed Insights API
- **Securite** : HSTS, CSP, X-Frame-Options
- **Social** : Open Graph, Twitter Card, image de partage og:image, donnees structurees
- Extraction des **emails de contact** (crawl de quelques pages)
- Score SEO (0-100) + Score digital (0-100) + **Priorite = opportunite commerciale** : `HIGH` si pas de site ou presence faible, `LOW` si le site est deja excellent

### Recommandations IA (optionnel)
- Generees **a la demande** depuis la fiche entreprise (Claude, cle API requise)
- Synthese commerciale personnalisee au metier et a la ville, en langage non technique
- Actions priorisees par impact business, quick wins, **brouillon d'email de prospection**
- Integrees au rapport PDF (sans l'email, reserve au prestataire)
- Stockees en base : une seule generation par entreprise (~2-4 centimes)

### Dashboard et priorisation (US3)
- Statistiques agregees (total commerces, repartition Commerce/PME, % sans site, scores moyens)
- Liste filtrable par type d'entite, priorite, code APE, ville
- Filtres post-scan (avec/sans site web, tranches de score SEO)
- Vue detail avec analyse complete et indicateurs colores
- Auto-polling pendant l'analyse en cours

### Export (US4)
- **CSV** : export de toute la liste filtree
- **PDF** : rapport d'audit individuel par commerce (plan Pro requis)

### Facturation et quotas (US5 — dormant par defaut)
- Sans cle Stripe, toutes les organisations sont sur un plan **Self-hosted illimite** : rien a configurer
- Integration **Stripe** disponible (abonnements + webhooks) pour qui veut operer l'outil en SaaS
- Quotas d'analyses mensuels avec reservation atomique (seules les entreprises **avec site** en consomment)

### Multi-utilisateurs (US6)
- Invitations par email avec token et expiration
- Gestion des roles (ADMIN / USER)
- Isolation des donnees par organisation

---

## Architecture

```
CommerceHunter/
├── apps/
│   ├── api/                    # API REST Fastify (port 3001)
│   │   ├── src/
│   │   │   ├── routes/         # Endpoints (auth, scans, businesses, billing...)
│   │   │   ├── services/       # Logique metier (SIRENE, SEO, scoring...)
│   │   │   ├── workers/        # Jobs asynchrones (scan, analyse)
│   │   │   ├── plugins/        # Plugins Fastify (auth, erreurs)
│   │   │   ├── app.ts          # Factory Fastify
│   │   │   └── server.ts       # Point d'entree
│   │   └── Dockerfile
│   │
│   └── web/                    # Frontend Next.js 15 (port 3000)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/     # Routes auth (login, register, invite)
│       │   │   ├── (dashboard)/ # Routes dashboard (scans, businesses, settings)
│       │   │   └── globals.css # TailwindCSS v4 (@theme inline)
│       │   ├── components/     # Composants React
│       │   ├── contexts/       # Contexts (AuthContext)
│       │   └── lib/            # Utilitaires client (API client, auth)
│       ├── public/             # Assets statiques (logo, favicons, captures d'ecran)
│       └── Dockerfile
│
├── packages/
│   ├── db/                     # Prisma schema, client, migrations, seed
│   ├── shared/                 # Types, schemas Zod, constantes (codes APE, plans)
│   ├── pdf/                    # Generation PDF (@react-pdf/renderer)
│   ├── tsconfig/               # Configurations TypeScript partagees
│   └── eslint-config/          # Configuration ESLint partagee
│
├── docker-compose.yml          # Dev local (PostgreSQL uniquement)
├── docker-compose.deploy.yml   # Production VPS (PostgreSQL + API + Web, derriere Caddy)
├── deploy.sh                   # Script de deploiement automatise
├── turbo.json                  # Configuration Turborepo
└── pnpm-workspace.yaml         # Configuration pnpm workspaces
```

---

## Modele de donnees

```mermaid
erDiagram
    Organization ||--o{ User : "membres (ADMIN / USER)"
    Organization ||--o{ Scan : "scans"
    Organization ||--o{ Invitation : "invitations"
    Organization ||--o{ ProspectList : "listes de prospects"
    Organization }o--|| SubscriptionPlan : "plan"
    User ||--o{ ProspectList : "creees par"
    Scan ||--o{ ScanBusiness : ""
    Business ||--o{ ScanBusiness : ""
    ProspectList ||--o{ ProspectListBusiness : ""
    Business ||--o{ ProspectListBusiness : ""
    Business ||--o| Analysis : "audit"

    Scan {
        string postalCode
        string entityType
        string[] apeCategories
        string status
    }
    Business {
        string siret
        string name
        string website
        string phone
    }
    Analysis {
        int seoScore
        int digitalScore
        enum priority "HIGH MEDIUM LOW"
        json aiRecommendations
    }
```

> Tables techniques omises pour la lisibilite : `RefreshToken`, `PasswordResetToken` (auth).

---

## Installation

### Pre-requis

- **Node.js** >= 20 LTS
- **pnpm** >= 9.15 (`corepack enable`)
- **Docker** & Docker Compose (pour PostgreSQL)
- Cles API : [INSEE SIRENE](https://api.insee.fr/), [Google Cloud](https://console.cloud.google.com/) (Places + PageSpeed)

### Demarrage rapide

```bash
# 1. Cloner le depot
git clone https://github.com/PierreDenaes/commerce-hunter.git
cd commerce-hunter

# 2. Installer les dependances
corepack enable
pnpm install

# 3. Configurer l'environnement
cp .env.example .env
# Editer .env avec vos cles API et secrets (voir ci-dessous)

# 4. Demarrer PostgreSQL
docker compose up -d

# 5. Migrations et seed
pnpm db:migrate
pnpm db:seed

# 6. Build des packages partages
pnpm build

# 7. Lancer en mode dev
pnpm dev
```

L'application est accessible sur **http://localhost:3000** (web) et **http://localhost:3001** (API).

### Variables d'environnement

```bash
# Base de donnees
DATABASE_URL=postgresql://commercehunter:password@localhost:5433/commercehunter
POSTGRES_USER=commercehunter
POSTGRES_PASSWORD=password
POSTGRES_DB=commercehunter
POSTGRES_PORT=5433

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# INSEE SIRENE API
SIRENE_API_TOKEN=your-sirene-api-token

# Google APIs
GOOGLE_PLACES_API_KEY=your-google-api-key
PAGESPEED_API_KEY=your-pagespeed-api-key

# Recommandations IA (optionnel — sans cle, la fonctionnalite est masquee)
ANTHROPIC_API_KEY=sk-ant-xxx
AI_MODEL=claude-opus-4-8

# Stripe (optionnel — sans cle, billing dormant : plan Self-hosted illimite)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
# BILLING_ENABLED=false / NEXT_PUBLIC_BILLING_ENABLED=false pour forcer l'extinction

# Inscriptions publiques (instance vitrine : fermez-les pour proteger vos cles API)
# REGISTRATION_ENABLED=false / NEXT_PUBLIC_REGISTRATION_ENABLED=false

# Compte admin seede (optionnel — sinon passez par /register)
# ADMIN_EMAIL=admin@example.com
# ADMIN_PASSWORD=change-me

# App
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

> La liste complete (dont les variables `LEGAL_*` des mentions legales) est dans [`.env.example`](.env.example).

> **Note** : PostgreSQL tourne sur le port **5433** (et non 5432) pour eviter les conflits avec une installation locale.

### Services externes : lesquels sont obligatoires ?

| Service | Obligatoire ? | Sans clé | Coût |
|---|---|---|---|
| **SIRENE (INSEE)** | ✅ Oui | Aucun scan possible | Gratuit — [créer un compte INSEE](https://portail-api.insee.fr/) |
| Google Places | Non | Pas d'enrichissement téléphone/site/coordonnées | Payant au-delà du crédit mensuel gratuit |
| Google PageSpeed | Non | Pas de métriques de performance | Gratuit avec clé |
| SMTP | Non | Reset de mot de passe et invitations d'équipe inopérants | Gratuit (ex. Gmail App Password) |
| Claude (Anthropic) | Non | Pas de recommandations IA (bouton masqué) — le reste de l'audit fonctionne | Payant à l'usage (~2-4 ct par génération, à la demande) |
| Stripe | Non | **Billing dormant** : tout le monde est sur le plan « Self-hosted » illimité, la page abonnement et les tarifs sont masqués | N/A |

**Mode self-hosted (recommandé)** : ne renseignez pas `STRIPE_SECRET_KEY` et buildez le web avec `NEXT_PUBLIC_BILLING_ENABLED=false`. Toutes les fonctionnalités sont alors incluses sans limite. Renseignez les variables `LEGAL_*` (voir `.env.example`) pour vos pages mentions légales / confidentialité.

### ⚖️ Responsabilités de l'auto-hébergeur (RGPD)

CommerceHunter collecte des données du registre public SIRENE. Les **entrepreneurs individuels y sont des personnes physiques** : en auto-hébergeant cet outil, **vous devenez responsable de traitement** au sens du RGPD pour les données que votre instance collecte (registre des traitements, information des personnes, durées de conservation, réponse aux demandes d'exercice de droits). L'INSEE gère par ailleurs un statut de diffusion permettant aux indépendants de s'opposer à la réutilisation de leurs données — respectez-le.

À noter également : les conditions d'utilisation de Google Places restreignent le stockage durable des données obtenues via l'API (seuls les place IDs sont librement cachables) ; le crawler s'identifie honnêtement via son User-Agent et ne récupère que des pages publiques.

---

## Commandes

| Commande | Description |
|---|---|
| `pnpm dev` | Demarre tous les services en mode dev (Turborepo) |
| `pnpm build` | Build tous les packages et applications |
| `pnpm lint` | Lint de l'ensemble du monorepo |
| `pnpm test` | Execute les tests |
| `pnpm db:migrate` | Applique les migrations Prisma |
| `pnpm db:generate` | Regenere le client Prisma |
| `pnpm db:seed` | Seed la base de donnees |
| `pnpm --filter @commercehunter/api dev` | API uniquement |
| `pnpm --filter @commercehunter/web dev` | Frontend uniquement |

---

## Deploiement

### Docker (production)

```bash
# Build et lancement de tous les services
docker compose -f docker-compose.deploy.yml up -d --build
```

### VPS avec Caddy

Le projet inclut une configuration pour deploiement sur VPS avec Caddy comme reverse proxy HTTPS.

```bash
# Deploiement automatise
./deploy.sh
```

Services Docker :
- **ch-postgres** : PostgreSQL 16
- **ch-api** : API Fastify (port 3001)
- **ch-web** : Frontend Next.js (port 3000)
- **Caddy** : Reverse proxy avec HTTPS automatique (externe)

---

## Endpoints API

**Base URL** : `/api/v1`

| Methode | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | Inscription |
| `POST` | `/auth/login` | Connexion |
| `POST` | `/auth/logout` | Deconnexion |
| `POST` | `/auth/refresh` | Rafraichir le token |
| `POST` | `/scans` | Creer un scan |
| `GET` | `/scans` | Lister les scans |
| `GET` | `/scans/:id` | Detail d'un scan |
| `POST` | `/scans/:id/reanalyze` | Relancer toutes les analyses d'un scan (par lots) |
| `GET` | `/businesses` | Lister les commerces (avec filtres) |
| `GET` | `/businesses/:id` | Detail d'un commerce + analyse |
| `POST` | `/businesses/:id/reanalyze` | Relancer l'analyse d'un commerce |
| `POST` | `/businesses/:id/ai-recommendations` | Generer les recommandations IA |
| `GET` | `/dashboard/stats` | Statistiques agregees |
| `GET` | `/export/csv?scanId=...&columns=...` | Export CSV (colonnes selectionnables) |
| `GET` | `/export/prospect-list-csv/:id` | Export CSV d'une liste de prospects |
| `GET` | `/export/pdf/:businessId` | Export PDF (rapport d'audit) |
| `GET/POST` | `/prospect-lists` | Listes de prospects |
| `POST` | `/billing/create-checkout` | Creer une session Stripe Checkout |
| `GET` | `/billing/portal` | Portail client Stripe |
| `POST` | `/billing/webhook` | Webhook Stripe |
| `GET` | `/organization/users` | Lister les membres |
| `POST` | `/organization/invitations` | Inviter un membre |
| `GET` | `/health` | Etat de sante du service |

---

## Routes frontend

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Connexion |
| `/register` | Inscription |
| `/dashboard` | Tableau de bord principal |
| `/scans` | Liste et creation de scans |
| `/scans/[id]` | Detail d'un scan |
| `/businesses` | Liste des commerces |
| `/businesses/[id]` | Fiche detail d'un commerce |
| `/settings/billing` | Gestion abonnement |
| `/settings/team` | Gestion de l'equipe |
| `/invite/[token]` | Accepter une invitation |

---

## Licence

Distribué sous licence **AGPL-3.0** — voir [LICENSE](LICENSE).

Vous pouvez utiliser, modifier et auto-héberger CommerceHunter librement. Si vous proposez une version modifiée en tant que service accessible sur le réseau, vous devez publier vos modifications sous la même licence.

---

<div align="center">

Concu et developpe par **DNADA** | [commercehunter.dnada.cloud](https://commercehunter.dnada.cloud)

</div>
