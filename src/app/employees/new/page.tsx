import { EmployeeForm } from "../employee-form";

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add employee</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create a new employee directory record for this site.
        </p>
      </div>
      <EmployeeForm
        initial={{
          badge_id: "",
          raw_badge_data: "",
          name: "",
          job_title: "",
        }}
      />
    </div>
  );
}
