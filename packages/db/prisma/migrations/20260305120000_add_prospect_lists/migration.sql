-- CreateTable
CREATE TABLE "prospect_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospect_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospect_list_businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prospect_list_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_list_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospect_lists_organization_id_idx" ON "prospect_lists"("organization_id");

-- CreateIndex
CREATE INDEX "prospect_list_businesses_business_id_idx" ON "prospect_list_businesses"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "prospect_list_businesses_prospect_list_id_business_id_key" ON "prospect_list_businesses"("prospect_list_id", "business_id");

-- AddForeignKey
ALTER TABLE "prospect_lists" ADD CONSTRAINT "prospect_lists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_lists" ADD CONSTRAINT "prospect_lists_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_list_businesses" ADD CONSTRAINT "prospect_list_businesses_prospect_list_id_fkey" FOREIGN KEY ("prospect_list_id") REFERENCES "prospect_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_list_businesses" ADD CONSTRAINT "prospect_list_businesses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
