import { RestrictedAdminGate } from "@/components/RestrictedAdminGate";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RestrictedAdminGate>{children}</RestrictedAdminGate>;
}
