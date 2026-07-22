-- AlterTable
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "preset" TEXT NOT NULL DEFAULT 'checkout';
