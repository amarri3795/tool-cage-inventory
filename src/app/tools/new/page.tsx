import { ToolForm } from "../tool-form";

export default function NewToolPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add tool</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create a new tool inventory record.
        </p>
      </div>
      <ToolForm
        mode="create"
        initial={{
          tool_id: "",
          name: "",
          category: "",
          location: "",
          status: "Available",
          condition: "Good",
          notes: "",
        }}
      />
    </div>
  );
}
