export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="preview-root min-h-screen">{children}</div>;
}
