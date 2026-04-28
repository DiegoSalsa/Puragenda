export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout minimalista sin el layout global del dashboard
  return <>{children}</>;
}
