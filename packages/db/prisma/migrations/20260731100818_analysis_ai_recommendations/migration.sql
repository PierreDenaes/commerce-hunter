-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "ai_recommendations" JSONB,
ADD COLUMN     "ai_recommendations_at" TIMESTAMP(3);
