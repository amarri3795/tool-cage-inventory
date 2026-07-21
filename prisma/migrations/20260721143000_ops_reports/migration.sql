-- Inventory report digests (daily / weekly)

CREATE TABLE "ops_reports" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ops_reports_site_id_idx" ON "ops_reports"("site_id");
CREATE INDEX "ops_reports_site_id_created_at_idx" ON "ops_reports"("site_id", "created_at");
CREATE INDEX "ops_reports_site_id_type_idx" ON "ops_reports"("site_id", "type");

ALTER TABLE "ops_reports" ADD CONSTRAINT "ops_reports_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
