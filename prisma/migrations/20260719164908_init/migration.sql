-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "badge_id" TEXT NOT NULL,
    "raw_badge_data" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "job_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" SERIAL NOT NULL,
    "tool_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "last_checked_out_by" TEXT,
    "condition" TEXT DEFAULT 'Good',
    "notes" TEXT,
    "checkout_time" TIMESTAMP(3),
    "auto_status" TEXT,
    "overdue_since" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_transactions" (
    "id" SERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "badge_id" TEXT NOT NULL,
    "employee_id" INTEGER,
    "employee_name" TEXT,
    "tool_id" TEXT NOT NULL,
    "tool_name" TEXT,
    "action" TEXT NOT NULL,
    "purpose" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "material_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "location" TEXT,
    "current_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "last_taken_by" TEXT,
    "notes" TEXT,
    "low_stock_email_sent" BOOLEAN NOT NULL DEFAULT false,
    "low_stock_email_date" TIMESTAMP(3),
    "low_stock_email_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_transactions" (
    "id" SERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "badge_id" TEXT NOT NULL,
    "employee_id" INTEGER,
    "employee_name" TEXT,
    "material_id" TEXT NOT NULL,
    "material_name" TEXT,
    "qty_taken" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "remaining_qty" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "audit_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "changed_by" TEXT,
    "tool_id" TEXT,
    "change_type" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "update_logs" (
    "id" SERIAL NOT NULL,
    "update_number" INTEGER NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "update_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_badge_id_key" ON "employees"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "tools_tool_id_key" ON "tools"("tool_id");

-- CreateIndex
CREATE UNIQUE INDEX "tool_transactions_transaction_id_key" ON "tool_transactions"("transaction_id");

-- CreateIndex
CREATE INDEX "tool_transactions_badge_id_idx" ON "tool_transactions"("badge_id");

-- CreateIndex
CREATE INDEX "tool_transactions_tool_id_idx" ON "tool_transactions"("tool_id");

-- CreateIndex
CREATE UNIQUE INDEX "materials_material_id_key" ON "materials"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_transactions_transaction_id_key" ON "material_transactions"("transaction_id");

-- CreateIndex
CREATE INDEX "material_transactions_badge_id_idx" ON "material_transactions"("badge_id");

-- CreateIndex
CREATE INDEX "material_transactions_material_id_idx" ON "material_transactions"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_audit_id_key" ON "audit_logs"("audit_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "tool_transactions" ADD CONSTRAINT "tool_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_transactions" ADD CONSTRAINT "tool_transactions_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("tool_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_transactions" ADD CONSTRAINT "material_transactions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("material_id") ON DELETE RESTRICT ON UPDATE CASCADE;
