-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "broken_links_count" INTEGER,
ADD COLUMN     "checked_links_count" INTEGER,
ADD COLUMN     "detected_platform" VARCHAR(100),
ADD COLUMN     "has_og_image" BOOLEAN,
ADD COLUMN     "is_free_hosting" BOOLEAN,
ADD COLUMN     "json_ld_invalid_count" INTEGER,
ADD COLUMN     "text_ratio" DOUBLE PRECISION,
ADD COLUMN     "word_count" INTEGER;
