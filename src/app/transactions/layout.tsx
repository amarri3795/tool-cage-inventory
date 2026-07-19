import { RestrictedAdminGate } from "@/components/RestrictedAdminGate";

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RestrictedAdminGate>{children}</RestrictedAdminGate>;
}
