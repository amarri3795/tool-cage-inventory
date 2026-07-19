import { RestrictedAdminGate } from "@/components/RestrictedAdminGate";

export default function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RestrictedAdminGate>{children}</RestrictedAdminGate>;
}
