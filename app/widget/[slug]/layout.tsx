import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserva Online",
  description: "Agenda tu cita en línea.",
};

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen" style={{ background: "#000000" }}>
      <style>{`
        html, body {
          background-color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      {children}
    </div>
  );
}
