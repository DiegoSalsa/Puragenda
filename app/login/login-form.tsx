"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";

type LoginResponse = {
  error?: string;
  details?: string[];
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as LoginResponse;
        const message = data.error || "No se pudo iniciar sesion";
        const details = data.details?.length ? `: ${data.details.join(", ")}` : "";
        setError(`${message}${details}`);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/60 bg-card/70 shadow-2xl shadow-purple-950/35">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Iniciar sesion</CardTitle>
        <p className="text-sm text-muted-foreground">
          Accede a tu panel para gestionar servicios y citas.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full gap-2 bg-gradient-to-r from-violet-900 to-purple-700 text-white hover:from-violet-800 hover:to-purple-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Entrar al dashboard
              </>
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Aun no tienes cuenta?{" "}
          <Link href="/register" className="text-white underline-offset-4 hover:underline">
            Crear cuenta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
