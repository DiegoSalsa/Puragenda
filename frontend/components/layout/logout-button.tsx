"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start gap-2 border-border/50"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Cerrar sesion
    </Button>
  );
}
