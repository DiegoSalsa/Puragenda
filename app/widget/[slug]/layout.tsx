import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserva Online",
  description: "Agenda tu cita en línea.",
};

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "transparent",
        minHeight: "100vh",
      }}
    >
      <style>{`
        html, body { background-color: transparent !important; }
      `}</style>
      {children}
    </div>
  );
}
