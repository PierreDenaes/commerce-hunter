-- AlterTable
ALTER TABLE "analyses" ALTER COLUMN "analyzed_url" SET DATA TYPE TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "meta_description" SET DATA TYPE TEXT,
ALTER COLUMN "h1" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE INDEX "invitations_organization_id_email_idx" ON "invitations"("organization_id", "email");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE INDEX "scan_businesses_business_id_idx" ON "scan_businesses"("business_id");

-- CreateIndex
CREATE INDEX "scans_organization_id_idx" ON "scans"("organization_id");

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
