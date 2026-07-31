/*
  Warnings:

  - Changed the type of `entity_type` on the `scans` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "scans" DROP COLUMN "entity_type",
ADD COLUMN     "entity_type" VARCHAR(10) NOT NULL;
