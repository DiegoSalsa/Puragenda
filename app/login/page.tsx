import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getCurrentSessionUser } from "@/backend/auth/user-session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-900/25 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-950 via-purple-900 to-violet-700 shadow-lg shadow-purple-900/40">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">AgendaPro</span>
        </Link>

        <LoginForm />
      </div>
    </main>
  );
}
