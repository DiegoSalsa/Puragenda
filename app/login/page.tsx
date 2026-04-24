import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#0085CB]/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0085CB] shadow-lg shadow-[#0085CB]/25">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Pura<span className="text-[#0085CB]">genda</span>
          </span>
        </Link>

        <LoginForm />
      </div>
    </main>
  );
}
