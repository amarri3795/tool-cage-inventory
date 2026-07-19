import { MaterialForm } from "../material-form";

export default function NewMaterialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add material</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create a new material inventory record.
        </p>
      </div>
      <MaterialForm
        mode="create"
        initial={{
          material_id: "",
          name: "",
          category: "",
          unit: "",
          location: "",
          current_qty: "0",
          min_qty: "0",
          status: "OK",
          notes: "",
        }}
      />
    </div>
  );
}
