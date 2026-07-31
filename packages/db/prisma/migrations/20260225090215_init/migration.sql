-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('COMMERCE', 'PME');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'NO_WEBSITE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "plan_id" UUID NOT NULL,
    "monthly_analyses_used" INTEGER NOT NULL DEFAULT 0,
    "billing_period_start" TIMESTAMP(3) NOT NULL,
    "stripe_customer_id" VARCHAR(100),
    "stripe_subscription_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "city_limit" INTEGER NOT NULL,
    "monthly_analysis_limit" INTEGER NOT NULL,
    "has_pdf_export" BOOLEAN NOT NULL DEFAULT false,
    "has_white_label" BOOLEAN NOT NULL DEFAULT false,
    "has_api_access" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "postal_code" VARCHAR(10) NOT NULL,
    "radius_km" INTEGER,
    "entity_type" "EntityType" NOT NULL,
    "min_employees" INTEGER,
    "ape_categories" TEXT[],
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "total_businesses" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "siret" VARCHAR(14) NOT NULL,
    "siren" VARCHAR(9) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "ape_code" VARCHAR(10) NOT NULL,
    "legal_form" VARCHAR(100),
    "legal_form_code" VARCHAR(10),
    "employees_range" VARCHAR(20),
    "employees_range_code" VARCHAR(5),
    "address" VARCHAR(500),
    "city" VARCHAR(200) NOT NULL,
    "postal_code" VARCHAR(10) NOT NULL,
    "phone" VARCHAR(30),
    "website" VARCHAR(500),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "google_place_id" VARCHAR(300),
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "sirene_last_updated" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_businesses" (
    "id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "status" "AnalysisStatus" NOT NULL,
    "analyzed_url" VARCHAR(500),
    "is_https" BOOLEAN,
    "http_status_code" INTEGER,
    "response_time_ms" INTEGER,
    "has_robots_txt" BOOLEAN,
    "has_sitemap_xml" BOOLEAN,
    "title" VARCHAR(500),
    "title_length" INTEGER,
    "meta_description" VARCHAR(1000),
    "meta_description_length" INTEGER,
    "h1" VARCHAR(500),
    "has_canonical" BOOLEAN,
    "has_favicon" BOOLEAN,
    "has_viewport" BOOLEAN,
    "mobile_score" INTEGER,
    "city_in_title" BOOLEAN,
    "city_in_h1" BOOLEAN,
    "city_in_description" BOOLEAN,
    "has_schema_local_business" BOOLEAN,
    "has_google_maps_embed" BOOLEAN,
    "seo_score" INTEGER,
    "digital_score" INTEGER,
    "priority" "Priority",
    "raw_analysis_json" JSONB,
    "error_message" TEXT,
    "analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_subscription_id_key" ON "organizations"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_siret_key" ON "businesses"("siret");

-- CreateIndex
CREATE INDEX "businesses_siren_idx" ON "businesses"("siren");

-- CreateIndex
CREATE INDEX "businesses_postal_code_idx" ON "businesses"("postal_code");

-- CreateIndex
CREATE INDEX "businesses_entity_type_idx" ON "businesses"("entity_type");

-- CreateIndex
CREATE INDEX "businesses_ape_code_idx" ON "businesses"("ape_code");

-- CreateIndex
CREATE INDEX "businesses_website_idx" ON "businesses"("website");

-- CreateIndex
CREATE UNIQUE INDEX "scan_businesses_scan_id_business_id_key" ON "scan_businesses"("scan_id", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_business_id_key" ON "analyses"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_businesses" ADD CONSTRAINT "scan_businesses_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_businesses" ADD CONSTRAINT "scan_businesses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
