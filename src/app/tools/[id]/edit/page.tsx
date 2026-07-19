import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ToolForm } from "../../tool-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditToolPage({ params }: PageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const tool = await prisma.tool.findUnique({ where: { id } });
  if (!tool) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit tool</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Update inventory details for {tool.tool_id}.
        </p>
      </div>
      <ToolForm
        mode="edit"
        initial={{
          id: tool.id,
          tool_id: tool.tool_id,
          name: tool.name,
          category: tool.category ?? "",
          location: tool.location ?? "",
          status: tool.status,
          condition: tool.condition ?? "Good",
          notes: tool.notes ?? "",
        }}
      />
    </div>
  );
}
