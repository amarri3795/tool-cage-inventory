-- Multi-site support

CREATE TABLE "sites" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sites_name_key" ON "sites"("name");

-- Placeholder site for existing rows (password replaced by seed/app)
INSERT INTO "sites" ("name", "password_hash", "contact_email", "created_at", "updated_at")
VALUES ('BowlingGreenKY', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.placeholder12', 'admin@bowlinggreen.local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Drop FKs that reference old unique tool_id / material_id
ALTER TABLE "tool_transactions" DROP CONSTRAINT IF EXISTS "tool_transactions_tool_id_fkey";
ALTER TABLE "tool_transactions" DROP CONSTRAINT IF EXISTS "tool_transactions_employee_id_fkey";
ALTER TABLE "material_transactions" DROP CONSTRAINT IF EXISTS "material_transactions_material_id_fkey";
ALTER TABLE "material_transactions" DROP CONSTRAINT IF EXISTS "material_transactions_employee_id_fkey";

-- Add site_id columns (nullable first)
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;
ALTER TABLE "tool_transactions" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;
ALTER TABLE "material_transactions" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;
ALTER TABLE "update_logs" ADD COLUMN IF NOT EXISTS "site_id" INTEGER;

UPDATE "employees" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;
UPDATE "tools" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;
UPDATE "materials" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;
UPDATE "tool_transactions" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;
UPDATE "material_transactions" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;
UPDATE "audit_logs" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;
UPDATE "settings" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;
UPDATE "update_logs" SET "site_id" = (SELECT id FROM "sites" WHERE name = 'BowlingGreenKY') WHERE "site_id" IS NULL;

ALTER TABLE "employees" ALTER COLUMN "site_id" SET NOT NULL;
ALTER TABLE "tools" ALTER COLUMN "site_id" SET NOT NULL;
ALTER TABLE "materials" ALTER COLUMN "site_id" SET NOT NULL;
ALTER TABLE "tool_transactions" ALTER COLUMN "site_id" SET NOT NULL;
ALTER TABLE "material_transactions" ALTER COLUMN "site_id" SET NOT NULL;

-- Drop old unique indexes
DROP INDEX IF EXISTS "employees_badge_id_key";
DROP INDEX IF EXISTS "tools_tool_id_key";
DROP INDEX IF EXISTS "materials_material_id_key";
DROP INDEX IF EXISTS "tool_transactions_transaction_id_key";
DROP INDEX IF EXISTS "material_transactions_transaction_id_key";
DROP INDEX IF EXISTS "settings_key_key";

-- New unique / indexes
CREATE UNIQUE INDEX "employees_site_id_badge_id_key" ON "employees"("site_id", "badge_id");
CREATE INDEX "employees_site_id_idx" ON "employees"("site_id");

CREATE UNIQUE INDEX "tools_site_id_tool_id_key" ON "tools"("site_id", "tool_id");
CREATE INDEX "tools_site_id_idx" ON "tools"("site_id");

CREATE UNIQUE INDEX "materials_site_id_material_id_key" ON "materials"("site_id", "material_id");
CREATE INDEX "materials_site_id_idx" ON "materials"("site_id");

CREATE UNIQUE INDEX "tool_transactions_site_id_transaction_id_key" ON "tool_transactions"("site_id", "transaction_id");
CREATE INDEX "tool_transactions_site_id_idx" ON "tool_transactions"("site_id");

CREATE UNIQUE INDEX "material_transactions_site_id_transaction_id_key" ON "material_transactions"("site_id", "transaction_id");
CREATE INDEX "material_transactions_site_id_idx" ON "material_transactions"("site_id");

CREATE UNIQUE INDEX "settings_site_id_key_key" ON "settings"("site_id", "key");
CREATE INDEX "settings_site_id_idx" ON "settings"("site_id");

CREATE INDEX "audit_logs_site_id_idx" ON "audit_logs"("site_id");
CREATE INDEX "update_logs_site_id_idx" ON "update_logs"("site_id");

-- Foreign keys
ALTER TABLE "employees" ADD CONSTRAINT "employees_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tools" ADD CONSTRAINT "tools_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "materials" ADD CONSTRAINT "materials_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tool_transactions" ADD CONSTRAINT "tool_transactions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "update_logs" ADD CONSTRAINT "update_logs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tool_transactions" ADD CONSTRAINT "tool_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_transactions" ADD CONSTRAINT "tool_transactions_site_id_tool_id_fkey" FOREIGN KEY ("site_id", "tool_id") REFERENCES "tools"("site_id", "tool_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_site_id_material_id_fkey" FOREIGN KEY ("site_id", "material_id") REFERENCES "materials"("site_id", "material_id") ON DELETE RESTRICT ON UPDATE CASCADE;
