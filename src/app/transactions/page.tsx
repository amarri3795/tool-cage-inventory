import { prisma } from "@/lib/prisma";
import { requireSiteAdminSession } from "@/lib/site-context";
import { getSiteLabels } from "@/lib/site-labels";
import { TransactionsTable, type TransactionRow } from "./transactions-table";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { siteId } = await requireSiteAdminSession();
  const [toolTxns, materialTxns, labels] = await Promise.all([
    prisma.toolTransaction.findMany({
      where: { site_id: siteId },
      orderBy: { occurred_at: "desc" },
      take: 500,
    }),
    prisma.materialTransaction.findMany({
      where: { site_id: siteId },
      orderBy: { occurred_at: "desc" },
      take: 500,
    }),
    getSiteLabels(siteId),
  ]);

  const rows: TransactionRow[] = [
    ...toolTxns.map((txn) => ({
      key: `tool-${txn.id}`,
      kind: "tool" as const,
      type: labels.toolSingular,
      transaction_id: txn.transaction_id,
      occurred_at: txn.occurred_at.toISOString(),
      badge_id: txn.badge_id,
      employee_name: txn.employee_name,
      item_id: txn.tool_id,
      item_name: txn.tool_name,
      detail: [txn.action, txn.purpose].filter(Boolean).join(" — "),
      qty: null,
    })),
    ...materialTxns.map((txn) => ({
      key: `material-${txn.id}`,
      kind: "material" as const,
      type: labels.materialSingular,
      transaction_id: txn.transaction_id,
      occurred_at: txn.occurred_at.toISOString(),
      badge_id: txn.badge_id,
      employee_name: txn.employee_name,
      item_id: txn.material_id,
      item_name: txn.material_name,
      detail: txn.unit ? `Taken (${txn.unit})` : "Taken",
      qty: txn.qty_taken,
    })),
  ].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {labels.transactions}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Recent {labels.toolSingular.toLowerCase()} check-outs/ins and{" "}
          {labels.materialSingular.toLowerCase()} takes (up to 500 of each).
        </p>
      </div>
      <TransactionsTable
        rows={rows}
        toolLabel={labels.tools}
        materialLabel={labels.materials}
      />
    </div>
  );
}
