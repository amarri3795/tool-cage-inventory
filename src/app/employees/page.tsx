import { prisma } from "@/lib/prisma";
import { requireSiteAdminSession } from "@/lib/site-context";
import { getSiteLabels } from "@/lib/site-labels";
import { EmployeesTable, type EmployeeRow } from "./employees-table";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const { siteId } = await requireSiteAdminSession();
  const [employees, labels] = await Promise.all([
    prisma.employee.findMany({
      where: { site_id: siteId },
      orderBy: { name: "asc" },
    }),
    getSiteLabels(siteId),
  ]);

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    badge_id: e.badge_id,
    name: e.name,
    job_title: e.job_title,
    raw_badge_data: e.raw_badge_data,
    created_at: e.created_at.toISOString(),
  }));

  return <EmployeesTable rows={rows} labels={labels} />;
}
