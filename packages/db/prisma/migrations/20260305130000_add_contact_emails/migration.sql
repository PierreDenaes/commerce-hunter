-- AlterTable
ALTER TABLE "analyses" ADD COLUMN "contact_emails" TEXT[] DEFAULT ARRAY[]::TEXT[];
