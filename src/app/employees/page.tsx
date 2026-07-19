import { prisma } from "@/lib/prisma";
import { EmployeesTable } from "./employees-table";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
  });

  const rows = employees.map((employee) => ({
    id: employee.id,
    badge_id: employee.badge_id,
    name: employee.name,
    job_title: employee.job_title,
    raw_badge_data: employee.raw_badge_data,
    created_at: employee.created_at.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Badge directory used for tool and material scans.
        </p>
      </div>
      <EmployeesTable rows={rows} />
    </div>
  );
}
