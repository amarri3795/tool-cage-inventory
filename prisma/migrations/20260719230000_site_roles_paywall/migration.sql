-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "site_admin_password_hash" TEXT,
ADD COLUMN     "is_disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paywall_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paywall_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "free_trial_days" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "free_trial_preset" TEXT,
ADD COLUMN     "paywall_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trial_started_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_site_id_idx" ON "password_reset_tokens"("site_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
