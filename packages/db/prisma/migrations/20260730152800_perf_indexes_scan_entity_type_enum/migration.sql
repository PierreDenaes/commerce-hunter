-- CreateEnum
CREATE TYPE "ScanEntityType" AS ENUM ('COMMERCE', 'PME', 'BOTH');

-- DropIndex
DROP INDEX "businesses_website_idx";

-- DropIndex
DROP INDEX "scans_organization_id_idx";

-- AlterTable
ALTER TABLE "prospect_list_businesses" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prospect_lists" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable — cast en place (les valeurs existantes sont déjà 'COMMERCE'|'PME'|'BOTH')
ALTER TABLE "scans" ALTER COLUMN "entity_type" TYPE "ScanEntityType" USING ("entity_type"::"ScanEntityType");

-- CreateIndex
CREATE INDEX "analyses_digital_score_idx" ON "analyses"("digital_score");

-- CreateIndex
CREATE INDEX "analyses_priority_idx" ON "analyses"("priority");

-- CreateIndex
CREATE INDEX "scans_organization_id_created_at_idx" ON "scans"("organization_id", "created_at");
