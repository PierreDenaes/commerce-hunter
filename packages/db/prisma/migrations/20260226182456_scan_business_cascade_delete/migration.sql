-- DropForeignKey
ALTER TABLE "scan_businesses" DROP CONSTRAINT "scan_businesses_scan_id_fkey";

-- AddForeignKey
ALTER TABLE "scan_businesses" ADD CONSTRAINT "scan_businesses_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
