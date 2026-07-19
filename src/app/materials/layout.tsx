import { RestrictedAdminGate } from "@/components/RestrictedAdminGate";

export default function MaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RestrictedAdminGate>{children}</RestrictedAdminGate>;
}
